# Firebase-to-Supabase data migration

This is the operator runbook for hosted staging rehearsals and the final
production cutover. The committed files in [`migrations/`](migrations/) are the
source of truth for the target schema and authorization model. Acceptance gates
are defined below; exact migration-tool options live in
[`../scripts/firebase-migration/README.md`](../scripts/firebase-migration/README.md).

## 1. Safety rules

- Rehearse twice on isolated staging before production.
- Staging must have separate containers, volumes, secrets, hostnames, SMTP, and
  frontend deployment. Sharing only the physical server is acceptable.
- Keep PostgreSQL bound to server loopback and connect through SSH. Never expose
  it publicly.
- Never use `--include-seed` during a hosted migration. `seed.sql` contains
  development data and is used on staging only by the deployment workflow.
- Keep exports, UID maps, reports, database URLs, and secrets outside Git.
- Production requires a maintenance outage. Freeze Firebase writes and signups
  before taking final exports.
- Before Supabase accepts user writes, rollback means restoring the Firebase
  frontend or maintenance page. After writes reopen, returning to Firebase
  requires a separately rehearsed reverse migration.

## 2. Prepare the target

Use the same pinned Supabase release in staging and production. Configure the
public API URL, frontend `SITE_URL`, Auth redirect allowlist, SMTP, Nginx
WebSocket proxying, backups, monitoring, and free disk space as described in
[`Supabase_Setup.md`](Supabase_Setup.md).

Staging email must use a sink or provider sandbox. Follow
[`Supabase_Setup.md`](Supabase_Setup.md#staging-smtp-sink); do not publish
Mailpit ports or configure an external relay.

Create the staging safety marker from its Compose directory:

```bash
docker compose exec db psql -U supabase_admin -d postgres \
  -v ON_ERROR_STOP=1 \
  -c "alter database postgres set app.environment = 'staging';"
docker compose exec db psql -U postgres -d postgres \
  -tAc "select current_setting('app.environment', true);"
```

The second command must print exactly `staging`.

## 3. Connect through SSH

Open a dedicated PowerShell window, adjusting the server-side database or
Supavisor port:

```powershell
ssh -N `
  -o ExitOnForwardFailure=yes `
  -o ServerAliveInterval=30 `
  -L 127.0.0.1:55432:127.0.0.1:5432 `
  <user>@<server>
```

Verify it from another window:

```powershell
Test-NetConnection 127.0.0.1 -Port 55432
```

Set secrets only in that operator shell. For Supavisor, keep the username
`postgres`, URL-encode the password, and use the exact target
`POOLER_TENANT_ID`:

```text
postgresql://postgres:<ENCODED_PASSWORD>@127.0.0.1:55432/postgres?sslmode=disable&options=reference%3D<TENANT>
```

Disabling TLS is acceptable only inside the encrypted SSH tunnel.

For staging, set the variables from [`staging.env.example`](staging.env.example)
and run:

```powershell
npm run supabase:staging:preflight
```

This preflight is staging-only: it requires the safety marker and deliberately
rejects production hostnames. For production, manually verify the tunnel,
hostname, backup, Auth/REST health, and current database counts before changing
anything.

## 4. Apply schema without seeds

Set either `SUPABASE_MIGRATION_STAGING_DB_URL` or
`SUPABASE_MIGRATION_PRODUCTION_DB_URL`, then select the matching value:

```powershell
$databaseUrl = $env:SUPABASE_MIGRATION_STAGING_DB_URL
# Production instead:
# $databaseUrl = $env:SUPABASE_MIGRATION_PRODUCTION_DB_URL

npx supabase db push --db-url $databaseUrl --dry-run --debug
npx supabase db push --db-url $databaseUrl --debug
npx supabase db push --db-url $databaseUrl --dry-run --debug
```

Inspect the first dry run before applying. The final dry run must show no
pending migrations. `--debug` is required while the pinned CLI `2.109.1`
regression can otherwise ignore `sslmode=disable`.

For a fresh staging target, require empty application tables before importing:

```powershell
npm run supabase:staging:preflight -- --expect-empty
```

Before production, take a restorable database backup and record its location.
Run pgTAP and data-mutating fixture tests locally against the identical
migrations, never against hosted production data.

## 5. Freeze and capture source data

For staging, use a recent immutable Firebase Auth export and RTDB export. For
production:

1. Deploy the maintenance build and verify writes and signups are blocked from
   multiple sessions.
2. Export final Firebase Auth users, password parameters, RTDB JSON, and the
   final Realtime Database rules to
   `database-exports/firebase-database.rules.json`.
3. Record SHA-256 checksums and store the files securely.
4. Confirm the Auth export, UID mapping, and RTDB export describe the same
   frozen population. If Auth was imported earlier, import any users created
   since that export before continuing.

Example:

```powershell
Get-FileHash `
  database-exports\firebase-auth-export.json, `
  database-exports\firebase-rtdb-export.json, `
  database-exports\firebase-database.rules.json `
  -Algorithm SHA256
```

## 6. Import Auth and application data

Follow the Auth commands and Scrypt environment variables in the
[migration tool README](../scripts/firebase-migration/README.md). Always create
and inspect the UID map with `--dry-run`, reuse that exact map for the real Auth
and RTDB imports, and use `--confirm-production` for production Auth. Verify a
migrated password and recovery flow before continuing.

Run the RTDB dry run:

```powershell
npm run firebase:migrate -- `
  --input "database-exports\firebase-rtdb-export.json" `
  --auth-map "database-exports\firebase-to-supabase-users.json" `
  --target <staging-or-production> `
  --report "database-exports\migration-report-<target>-dry-run.json" `
  --dry-run
```

Require zero quarantines. Review source and transformed counts, warnings,
excluded records, owner/member resolution, tracker mappings, referential
integrity, and state hashes.

For production, set the tunneled database URL only through the environment:

```powershell
$env:SUPABASE_MIGRATION_PRODUCTION_DB_URL = "<tunneled-database-url>"
```

Then perform the transactional import:

```powershell
npm run firebase:migrate -- `
  --input "database-exports\firebase-rtdb-export.json" `
  --auth-map "database-exports\firebase-to-supabase-users.json" `
  --target production `
  --report "database-exports\migration-report-production-import.json" `
  --confirm-production
```

For staging, use `--target staging`, omit `--confirm-production`, and set
`SUPABASE_MIGRATION_STAGING_DB_URL`. Repeat the identical RTDB import once; it
must finish without duplicates or differences.

## 7. Validate and deploy

Require matching source/transformed/target counts and hashes, exactly one owner
per tracker, resolved members, valid foreign keys, and no unexpected
exclusions. Test controlled accounts and trackers for:

- Migrated login, logout, session restoration, and recovery.
- Owner/editor/guest/unrelated/anonymous access and public visibility.
- Tracker metadata/state, rulesets, preferences, `multiLocaleSearch`, and
  legacy/defaulted `nicknamesEnabled`.
- Realtime updates, reconnect behavior, and revision conflicts.
- Old Firebase URLs failing safely and new tracker UUIDs appearing in lists.

Run locally for the exact deployment commit:

```powershell
npm run supabase:test
npm run test:migration
npm run typecheck:migration
npm run test:unit
npm run test:migration:integration
npm run test:e2e
npm run build
npm run prettier:check
```

Build the hosted frontend with only:

```dotenv
VITE_SUPABASE_URL=<public-supabase-url>
VITE_SUPABASE_ANON_KEY=<browser-safe-anon-key>
```

Scan `dist/` for secrets, deploy it, and verify Auth, REST, Realtime WebSockets,
SMTP, logs, and backups. Production may reopen only after every acceptance gate
passes. Keep Firebase read-only throughout the observation period.

## 8. Rehearsal evidence and cleanup

Record timestamps, durations, checksums, commit SHA, Supabase release, commands,
counts, hashes, warnings, disk usage, backup reference, manual decisions, and
test evidence outside Git.

After a successful staging import, manually run the `Deploy staging` GitHub
Actions workflow with the rehearsed branch. It verifies the staging marker,
clears managed Auth data left by a remote CLI reset, reapplies migrations and
`seed.sql`, verifies fixture counts, and deploys the frontend. Repeat the
migration from the same inputs; both rehearsals must match.

Close the SSH tunnel and remove migration secrets from the operator shell:

```powershell
Get-ChildItem Env: |
  Where-Object Name -Match '^(SUPABASE_MIGRATION_|FIREBASE_SCRYPT_)' |
  ForEach-Object { Remove-Item "Env:$($_.Name)" }
```
