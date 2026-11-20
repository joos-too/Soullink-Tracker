import { fileURLToPath } from "node:url";
import path from "node:path";

import pg from "pg";

import { validateMigrationDatabaseUrl } from "./verify-supabase-migrations.mjs";

const { Client } = pg;

export async function prepareStagingSeedReset(databaseUrl) {
  validateMigrationDatabaseUrl(databaseUrl);

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15_000,
  });

  await client.connect();
  try {
    await client.query("begin");
    const marker = await client.query(
      "select current_setting('app.environment', true) as environment",
    );
    if (marker.rows[0]?.environment !== "staging") {
      throw new Error(
        `Refusing to clear Auth users: expected database environment marker "staging", received "${marker.rows[0]?.environment ?? "missing"}".`,
      );
    }

    // Remote Supabase resets preserve managed schemas, including auth. Clear
    // Auth users first so seed.sql recreates the complete deterministic fixture
    // set instead of leaving hosted staging users behind.
    await client.query("truncate table auth.users cascade");
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const databaseUrl = process.env.SUPABASE_MIGRATION_DB_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Missing SUPABASE_MIGRATION_DB_URL.");
  }

  await prepareStagingSeedReset(databaseUrl);
  console.log("Staging Auth users cleared. The database is ready for reset.");
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
