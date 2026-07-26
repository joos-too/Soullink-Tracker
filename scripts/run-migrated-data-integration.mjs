import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const fixtureDirectory = path.resolve("scripts/firebase-migration/fixtures");
const input = path.join(fixtureDirectory, "valid-export.json");
const authMap = path.join(fixtureDirectory, "auth-map.json");
const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "soullink-migrated-data-"),
);
const firstReport = path.join(temporaryDirectory, "first-import.json");
const rerunReport = path.join(temporaryDirectory, "rerun-import.json");

const databaseUrl =
  process.env.SUPABASE_MIGRATION_TEST_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
  !["127.0.0.1", "localhost", "::1"].includes(parsedDatabaseUrl.hostname)
) {
  throw new Error(
    "Migrated-data integration tests may only target a loopback PostgreSQL URL.",
  );
}

const runProcess = (command, args, environment = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });

const runNpmScript = (script) =>
  runProcess(
    npmCommand,
    isWindows ? ["/d", "/s", "/c", `npm run ${script}`] : ["run", script],
  );

const resetDatabase = async () => {
  const status = await runNpmScript("supabase:reset");
  if (status !== 0) throw new Error("Local Supabase database reset failed.");
};

const createMappedAuthFixture = async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query({
      text: `
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, confirmation_token, email_change,
          email_change_token_new, recovery_token
        ) values (
          '00000000-0000-0000-0000-000000000000', $1, 'authenticated',
          'authenticated', $2, extensions.crypt($3, extensions.gen_salt('bf')),
          now(), '{"provider":"email","providers":["email"]}'::jsonb,
          '{}'::jsonb, now(), now(), '', '', '', ''
        )
      `,
      values: [
        "10000000-0000-4000-8000-000000000001",
        "owner@example.com",
        "migration-test-password",
      ],
    });
  } finally {
    await client.end();
  }
};

const runMigration = (report) =>
  runProcess(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/migrate-firebase-to-supabase.ts",
      "--input",
      input,
      "--auth-map",
      authMap,
      "--target",
      "staging",
      "--report",
      report,
    ],
    {
      ...process.env,
      SUPABASE_MIGRATION_STAGING_DB_URL: databaseUrl,
    },
  );

let testStatus = 1;
let cleanupStatus = 1;
try {
  console.log(
    "Resetting local Supabase for migrated-data integration tests...",
  );
  await resetDatabase();
  await createMappedAuthFixture();

  console.log("Importing the Firebase fixture through the migration CLI...");
  if ((await runMigration(firstReport)) !== 0) {
    throw new Error("First Firebase fixture import failed.");
  }

  console.log("Repeating the identical import to verify idempotency...");
  if ((await runMigration(rerunReport)) !== 0) {
    throw new Error("Repeated Firebase fixture import failed.");
  }

  testStatus = await runProcess(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "vitest.migration-integration.config.ts",
    ],
    {
      ...process.env,
      SUPABASE_MIGRATION_TEST_DB_URL: databaseUrl,
      SUPABASE_MIGRATION_TEST_FIRST_REPORT: firstReport,
      SUPABASE_MIGRATION_TEST_RERUN_REPORT: rerunReport,
    },
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  console.log("Restoring the standard local Supabase seed...");
  cleanupStatus = await runNpmScript("supabase:reset");
  await rm(temporaryDirectory, { recursive: true, force: true });
}

process.exit(testStatus !== 0 ? testStatus : cleanupStatus);
