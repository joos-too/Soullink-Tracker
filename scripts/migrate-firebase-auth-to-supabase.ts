import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  createAuthMap,
  firebasePasswordHash,
  parseFirebaseAuthExport,
  parseScryptConfig,
  validateAuthMap,
} from "./firebase-migration/auth.ts";
import type {
  AuthMapEntry,
  MigrationTarget,
} from "./firebase-migration/types.ts";

interface Options {
  input: string;
  output: string;
  target: MigrationTarget;
  dryRun: boolean;
  confirmProduction: boolean;
}

const usage = `
Firebase Auth to Supabase Auth migration

Usage:
  npm run firebase:auth:migrate -- \\
    --input <firebase-auth-export.json> \\
    --output <firebase-to-supabase-users.json> \\
    --target <staging|production> \\
    --dry-run

The first run creates the mapping file. Reuse that exact file for the real Auth
import and as --auth-map for the Realtime Database migration.
`;

const parseArguments = (argv: string[]): Options => {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run" || argument === "--confirm-production") {
      flags.add(argument);
      continue;
    }
    const value = argv[index + 1];
    if (!argument.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`Invalid or incomplete argument: ${argument}`);
    }
    values.set(argument, value);
    index += 1;
  }
  const input = values.get("--input");
  const output = values.get("--output");
  const target = values.get("--target");
  if (!input || !output || (target !== "staging" && target !== "production")) {
    throw new Error("Missing or invalid required arguments.");
  }
  return {
    input: path.resolve(input),
    output: path.resolve(output),
    target,
    dryRun: flags.has("--dry-run"),
    confirmProduction: flags.has("--confirm-production"),
  };
};

const readJson = async (filename: string): Promise<unknown> =>
  JSON.parse(await readFile(filename, "utf8")) as unknown;

const readOrCreateMap = async (
  filename: string,
  users: ReturnType<typeof parseFirebaseAuthExport>,
): Promise<AuthMapEntry[]> => {
  try {
    return validateAuthMap(users, await readJson(filename));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
  const entries = createAuthMap(users);
  await writeFile(
    filename,
    `${JSON.stringify({ users: entries }, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  return entries;
};

const main = async () => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage);
    return;
  }
  const options = parseArguments(process.argv.slice(2));
  if (
    options.target === "production" &&
    !options.dryRun &&
    !options.confirmProduction
  ) {
    throw new Error("Production import requires --confirm-production.");
  }

  const users = parseFirebaseAuthExport(await readJson(options.input));
  const scrypt = parseScryptConfig(process.env);
  const mapping = await readOrCreateMap(options.output, users);
  console.log(
    `${options.dryRun ? "Validated" : "Importing"} ${users.length} Firebase Auth users for ${options.target}.`,
  );
  console.log(`UID mapping: ${options.output}`);
  if (options.dryRun) return;

  const prefix = `SUPABASE_MIGRATION_${options.target.toUpperCase()}`;
  const url = process.env[`${prefix}_URL`];
  const serviceRoleKey = process.env[`${prefix}_SERVICE_ROLE_KEY`];
  if (!url || !serviceRoleKey) {
    throw new Error(`Set ${prefix}_URL and ${prefix}_SERVICE_ROLE_KEY.`);
  }
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const mapByUid = new Map(mapping.map((entry) => [entry.firebaseUid, entry]));
  let created = 0;
  let existing = 0;
  for (const user of users) {
    const mapped = mapByUid.get(user.localId)!;
    const current = await supabase.auth.admin.getUserById(
      mapped.supabaseUserId,
    );
    if (current.data.user) {
      if (current.data.user.email?.toLowerCase() !== mapped.email) {
        throw new Error(
          `Mapped UUID ${mapped.supabaseUserId} already belongs to another email.`,
        );
      }
      existing += 1;
      continue;
    }
    if (current.error && current.error.status !== 404) throw current.error;

    const result = await supabase.auth.admin.createUser({
      id: mapped.supabaseUserId,
      email: mapped.email,
      // Firebase allowed these existing accounts to sign in regardless of the
      // verification flag. Confirm them in Supabase to preserve that behavior.
      email_confirm: true,
      password_hash: firebasePasswordHash(user, scrypt),
      ban_duration: user.disabled ? "876000h" : undefined,
      app_metadata: {
        firebase_uid: user.localId,
        firebase_email_verified: user.emailVerified,
      },
    });
    if (result.error) {
      throw new Error(
        `Could not import ${mapped.email}: ${result.error.message}`,
      );
    }
    created += 1;
  }
  console.log(
    `Auth import complete: ${created} created, ${existing} already present.`,
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
