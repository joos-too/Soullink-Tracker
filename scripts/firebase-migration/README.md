# Firebase JSON migration tool

These server-side tools first migrate Firebase Auth and then transform a Firebase Realtime Database root export into the relational Supabase schema.

## 1. Import Firebase Auth and create the UID mapping

The Auth importer uses Supabase Auth's Admin API. It preserves Firebase Scrypt
passwords, assigns new UUIDv4 user IDs, and writes the mapping consumed by the
database importer. The configured Supabase Auth version must support
`password_hash` and the `$fbscrypt$` format (the project's local `v2.192.0`
version does).

Put the Firebase Auth export in `database-exports/`. Set secrets only in the
current PowerShell process; do not add them to `.env` or Git:

```powershell
$env:FIREBASE_SCRYPT_SIGNER_KEY = "<base64_signer_key>"
$env:FIREBASE_SCRYPT_SALT_SEPARATOR = "<base64_salt_separator>"
$env:FIREBASE_SCRYPT_ROUNDS = "<rounds>"
$env:FIREBASE_SCRYPT_MEM_COST = "<mem_cost>"
```

First create and inspect the mapping without contacting Supabase:

```powershell
npm run firebase:auth:migrate -- `
  --input "database-exports\firebase-auth-export.json" `
  --output "database-exports\firebase-to-supabase-users.json" `
  --target staging `
  --dry-run
```

Keep that generated mapping file. The real import deliberately reuses its UUIDs
and is resumable if it stops partway through. Configure the target and import:

```powershell
$env:SUPABASE_MIGRATION_STAGING_URL = "https://staging-supabase.example.com"
$env:SUPABASE_MIGRATION_STAGING_SERVICE_ROLE_KEY = "<server-only service role key>"

npm run firebase:auth:migrate -- `
  --input "database-exports\firebase-auth-export.json" `
  --output "database-exports\firebase-to-supabase-users.json" `
  --target staging
```

For a local rehearsal, use the API URL and service-role key shown by
`npm run supabase:status` as the two staging environment values. Migrated users
are confirmed in Supabase so accounts that Firebase allowed to sign in are not
locked out; the original `emailVerified` value is retained in server-controlled
Auth app metadata. Disabled Firebase users are imported as banned.

After the import, test at least one known password and one recovery flow. Then
clear all secrets from the shell:

```powershell
Remove-Item Env:FIREBASE_SCRYPT_SIGNER_KEY
Remove-Item Env:FIREBASE_SCRYPT_SALT_SEPARATOR
Remove-Item Env:FIREBASE_SCRYPT_ROUNDS
Remove-Item Env:FIREBASE_SCRYPT_MEM_COST
Remove-Item Env:SUPABASE_MIGRATION_STAGING_URL
Remove-Item Env:SUPABASE_MIGRATION_STAGING_SERVICE_ROLE_KEY
```

The Admin API cannot retain Firebase `createdAt` and `lastSignedInAt` in
`auth.users`. The database migration applies those timestamps to `profiles`,
where the application uses them.

## Private inputs

Keep all inputs and generated reports outside Git. The repository already ignores `database-exports/`, which can be used locally for this purpose.

The generated Auth mapping contains the Supabase UUID assigned during the Auth import and the matching normalized email:

```json
{
  "users": [
    {
      "firebaseUid": "firebase-user-id",
      "supabaseUserId": "00000000-0000-4000-8000-000000000000",
      "email": "user@example.com"
    }
  ]
}
```

The Firebase Auth export is not the Auth mapping. Do not pass an Auth export containing `passwordHash` and `salt` to `--auth-map`.

## Dry run

Always start with a dry run:

```powershell
npm run firebase:migrate -- `
  --input "database-exports\firebase-rtdb-export.json" `
  --auth-map "database-exports\firebase-to-supabase-users.json" `
  --target staging `
  --report "database-exports\migration-report-staging.json" `
  --dry-run
```

The command exits with code `2` when quarantined records require action. Warnings do not block an import. Review source/transformed counts, tracker and user mappings, warnings, exclusions, and state hashes without publishing the report.

## Transactional import

Auth users from the mapping must already exist in the target `auth.users` table. Supply the database URL only through the process environment:

```powershell
$env:SUPABASE_MIGRATION_STAGING_DB_URL = "postgresql://..."

npm run firebase:migrate -- `
  --input "database-exports\firebase-rtdb-export.json" `
  --auth-map "database-exports\firebase-to-supabase-users.json" `
  --target staging `
  --report "database-exports\migration-report-staging-import.json"

Remove-Item Env:SUPABASE_MIGRATION_STAGING_DB_URL
```

The import uses one serializable transaction, defers owner constraints until commit, verifies all mapped Auth users, and validates target counts and canonical state hashes. A rerun accepts identical deterministic trackers but refuses to overwrite a tracker whose metadata, membership, or state differs.

A production import requires all of the following:

- An approved production dry-run report with zero quarantines.
- `SUPABASE_MIGRATION_PRODUCTION_DB_URL` in the process environment.
- The explicit `--confirm-production` flag.
- Firebase writes already blocked by the maintenance build.

Never include a database URL on the command line because shells and process listings may retain it.

## Validation commands

```powershell
npm run test:migration
npm run typecheck:migration
```
