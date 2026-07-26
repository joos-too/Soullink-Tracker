import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const expectEmpty = process.argv.includes("--expect-empty");
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};

const apiUrl = new URL(required("SUPABASE_MIGRATION_STAGING_URL"));
const appUrl = new URL(required("SUPABASE_MIGRATION_STAGING_APP_URL"));
const serviceRoleKey = required("SUPABASE_MIGRATION_STAGING_SERVICE_ROLE_KEY");
const databaseUrl = required("SUPABASE_MIGRATION_STAGING_DB_URL");

if (apiUrl.protocol !== "https:" || appUrl.protocol !== "https:") {
  throw new Error("Hosted staging API and application URLs must use HTTPS.");
}
if (apiUrl.origin === appUrl.origin) {
  throw new Error(
    "Staging Supabase and application URLs must use separate origins.",
  );
}
if (
  apiUrl.hostname === "supabase.janlieder.de" ||
  appUrl.hostname === "soullink-tracker.janlieder.de"
) {
  throw new Error("A staging URL points at the documented production host.");
}

const decodeJwtPayload = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("The service-role key is not a JWT.");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
};
if (decodeJwtPayload(serviceRoleKey).role !== "service_role") {
  throw new Error("The staging API key does not contain role=service_role.");
}

const request = async (pathname, headers = {}) => {
  const response = await fetch(new URL(pathname, apiUrl), { headers });
  if (!response.ok) {
    const authenticationChallenge = response.headers.get("www-authenticate");
    throw new Error(
      `${pathname} returned ${response.status} from ${apiUrl.origin}.` +
        (authenticationChallenge
          ? ` WWW-Authenticate: ${authenticationChallenge}.`
          : ""),
    );
  }
  return response;
};

await request("/auth/v1/health", {
  apikey: serviceRoleKey,
});
await request("/rest/v1/", {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
});

const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 15_000,
});
await client.connect();
let counts;
try {
  const marker = await client.query(
    "select current_setting('app.environment', true) as environment",
  );
  if (marker.rows[0]?.environment !== "staging") {
    throw new Error(
      "Database safety marker is missing. Run ALTER DATABASE postgres SET app.environment = 'staging' on the separate staging database, reconnect, and retry.",
    );
  }

  const schema = await client.query(`
    select
      to_regclass('public.profiles') is not null as profiles,
      to_regclass('public.trackers') is not null as trackers,
      to_regclass('public.tracker_members') is not null as memberships,
      to_regclass('public.tracker_states') is not null as states,
      to_regclass('public.rulesets') is not null as rulesets
  `);
  const schemaApplied = Object.values(schema.rows[0]).every(Boolean);
  if (schemaApplied) {
    const result = await client.query(`
      select
        (select count(*)::integer from auth.users) as users,
        (select count(*)::integer from public.profiles) as profiles,
        (select count(*)::integer from public.trackers) as trackers,
        (select count(*)::integer from public.tracker_members) as memberships,
        (select count(*)::integer from public.tracker_states) as states,
        (select count(*)::integer from public.rulesets) as rulesets
    `);
    counts = result.rows[0];
  }
  if (expectEmpty && !schemaApplied) {
    throw new Error(
      "The application schema has not been applied; --expect-empty cannot validate it.",
    );
  }
  if (
    expectEmpty &&
    counts &&
    Object.values(counts).some((count) => count !== 0)
  ) {
    throw new Error(
      `Staging is not empty: ${JSON.stringify(counts)}. Do not continue until the isolated staging reset has been verified.`,
    );
  }
} finally {
  await client.end();
}

const scanDirectoryForSecret = async (directory) => {
  try {
    await access(directory);
  } catch {
    return false;
  }
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (await scanDirectoryForSecret(filename)) return true;
    } else if ((await readFile(filename)).includes(serviceRoleKey)) {
      return true;
    }
  }
  return false;
};

if (await scanDirectoryForSecret(path.resolve("dist"))) {
  throw new Error("The staging service-role key was found in dist/.");
}

console.log(`Staging API: ${apiUrl.origin}`);
console.log(`Staging app: ${appUrl.origin}`);
console.log(`Database marker: staging`);
console.log(
  counts
    ? `Current counts: ${JSON.stringify(counts)}`
    : "Application schema: not applied yet",
);
console.log("Staging preflight passed. No data was changed.");
