import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const MIGRATION_FILENAME = /^(\d{14})_[^.]+\.sql$/;
const VALID_ENVIRONMENTS = new Set(["staging", "production"]);
const VALID_PHASES = new Set(["before", "after"]);

export function parseMigrationArguments(argumentsToParse) {
  const values = new Map();

  for (let index = 0; index < argumentsToParse.length; index += 2) {
    const flag = argumentsToParse[index];
    const value = argumentsToParse[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(
        "Usage: verify-supabase-migrations.mjs --environment <staging|production> --phase <before|after>",
      );
    }
    values.set(flag, value);
  }

  const environment = values.get("--environment");
  const phase = values.get("--phase");
  if (!VALID_ENVIRONMENTS.has(environment)) {
    throw new Error("Environment must be either staging or production.");
  }
  if (!VALID_PHASES.has(phase)) {
    throw new Error("Phase must be either before or after.");
  }

  return { environment, phase };
}

export function validateMigrationDatabaseUrl(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("SUPABASE_MIGRATION_DB_URL is not a valid URL.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Migration database URL must use PostgreSQL.");
  }
  if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55432") {
    throw new Error(
      "Migration database URL must use the SSH tunnel at 127.0.0.1:55432.",
    );
  }
  if (parsed.pathname !== "/postgres") {
    throw new Error(
      "Migration database URL must target the postgres database.",
    );
  }
  if (!parsed.username || !parsed.password) {
    throw new Error(
      "Migration database URL must include an encoded username and password.",
    );
  }

  return parsed;
}

export function extractLocalMigrationVersions(filenames) {
  const versions = filenames
    .filter((filename) => filename.endsWith(".sql"))
    .map((filename) => {
      const match = MIGRATION_FILENAME.exec(filename);
      if (!match) {
        throw new Error(
          `Invalid migration filename "${filename}"; expected <14-digit timestamp>_<name>.sql.`,
        );
      }
      return match[1];
    })
    .sort();

  if (new Set(versions).size !== versions.length) {
    throw new Error("Local migration versions must be unique.");
  }

  return versions;
}

export function verifyMigrationVersions(localVersions, remoteVersions, phase) {
  const remotePrefix = localVersions.slice(0, remoteVersions.length);
  const isPrefix =
    remoteVersions.length <= localVersions.length &&
    remoteVersions.every((version, index) => version === remotePrefix[index]);

  if (!isPrefix) {
    throw new Error(
      `Remote migration history diverges from the local ordered history. Local: [${localVersions.join(", ")}]. Remote: [${remoteVersions.join(", ")}].`,
    );
  }

  if (phase === "after" && remoteVersions.length !== localVersions.length) {
    throw new Error(
      `Remote migration history is incomplete after deployment. Local: [${localVersions.join(", ")}]. Remote: [${remoteVersions.join(", ")}].`,
    );
  }
}

export function verifyEnvironmentMarker(
  actualEnvironment,
  expectedEnvironment,
) {
  if (actualEnvironment !== expectedEnvironment) {
    throw new Error(
      `Database environment marker mismatch: expected "${expectedEnvironment}", received "${actualEnvironment ?? "missing"}".`,
    );
  }
}

async function loadLocalMigrationVersions() {
  const migrationsDirectory = path.resolve("supabase", "migrations");
  return extractLocalMigrationVersions(await readdir(migrationsDirectory));
}

async function loadRemoteState(client) {
  const markerResult = await client.query(
    "select current_setting('app.environment', true) as environment",
  );
  const tableResult = await client.query(
    "select to_regclass('supabase_migrations.schema_migrations') as migration_table",
  );

  let versions = [];
  if (tableResult.rows[0]?.migration_table) {
    const migrationResult = await client.query(
      "select version::text from supabase_migrations.schema_migrations order by version",
    );
    versions = migrationResult.rows.map((row) => row.version);
  }

  return {
    environment: markerResult.rows[0]?.environment ?? null,
    versions,
  };
}

export async function verifyHostedMigrations({
  databaseUrl,
  environment,
  phase,
}) {
  validateMigrationDatabaseUrl(databaseUrl);
  const localVersions = await loadLocalMigrationVersions();
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15_000,
  });

  await client.connect();
  try {
    const remote = await loadRemoteState(client);
    verifyEnvironmentMarker(remote.environment, environment);
    verifyMigrationVersions(localVersions, remote.versions, phase);

    return {
      environment,
      localVersions,
      remoteVersions: remote.versions,
      pendingCount: localVersions.length - remote.versions.length,
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const { environment, phase } = parseMigrationArguments(process.argv.slice(2));
  const databaseUrl = process.env.SUPABASE_MIGRATION_DB_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Missing SUPABASE_MIGRATION_DB_URL.");
  }

  const result = await verifyHostedMigrations({
    databaseUrl,
    environment,
    phase,
  });
  console.log(`Database marker: ${result.environment}`);
  console.log(`Local migrations: ${result.localVersions.length}`);
  console.log(`Remote migrations: ${result.remoteVersions.length}`);
  console.log(`Pending migrations: ${result.pendingCount}`);
  console.log(`Migration ${phase}-check passed.`);
}

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
