import { fileURLToPath } from "node:url";
import path from "node:path";

import pg from "pg";

import { validateMigrationDatabaseUrl } from "./verify-supabase-migrations.mjs";

const { Client } = pg;

const EXPECTED_COUNTS = {
  users: 4,
  identities: 4,
  profiles: 4,
  trackers: 4,
  memberships: 6,
  states: 4,
  rulesets: 1,
};

const EXPECTED_EMAILS = [
  "editor@example.com",
  "guest@example.com",
  "test@example.com",
  "unrelated@example.com",
];

export function verifySeedState({ environment, counts, emails }) {
  if (environment !== "staging") {
    throw new Error(
      `Database environment marker mismatch: expected "staging", received "${environment ?? "missing"}".`,
    );
  }

  for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[table] !== expected) {
      throw new Error(
        `Seed verification failed for ${table}: expected ${expected}, received ${counts[table]}.`,
      );
    }
  }

  if (
    emails.length !== EXPECTED_EMAILS.length ||
    emails.some((email, index) => email !== EXPECTED_EMAILS[index])
  ) {
    throw new Error(
      `Seed verification found unexpected Auth users: ${JSON.stringify(emails)}.`,
    );
  }
}

export async function verifyStagingSeed(databaseUrl) {
  validateMigrationDatabaseUrl(databaseUrl);

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();

  try {
    const result = await client.query(`
      select
        current_setting('app.environment', true) as environment,
        (select count(*)::integer from auth.users) as users,
        (select count(*)::integer from auth.identities) as identities,
        (select count(*)::integer from public.profiles) as profiles,
        (select count(*)::integer from public.trackers) as trackers,
        (select count(*)::integer from public.tracker_members) as memberships,
        (select count(*)::integer from public.tracker_states) as states,
        (select count(*)::integer from public.rulesets) as rulesets,
        (
          select coalesce(json_agg(email order by email), '[]'::json)
          from auth.users
        ) as emails
    `);
    const { environment, emails, ...counts } = result.rows[0];
    verifySeedState({ environment, counts, emails });
    return counts;
  } finally {
    await client.end();
  }
}

async function main() {
  const databaseUrl = process.env.SUPABASE_MIGRATION_DB_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Missing SUPABASE_MIGRATION_DB_URL.");
  }

  const counts = await verifyStagingSeed(databaseUrl);
  console.log(`Staging seed verified: ${JSON.stringify(counts)}`);
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
