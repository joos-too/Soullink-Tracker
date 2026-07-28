# Hosted staging rehearsal

This runbook prepares a full Firebase-to-Supabase rehearsal on an isolated,
self-hosted staging stack. Staging must have its own Compose project, secrets,
PostgreSQL volume, Storage volume, domain names, SMTP test configuration, and
frontend deployment. Sharing only the physical server is acceptable; sharing
production containers, networks with published database ports, or volumes is
not.

## 1. Values that require an operator decision

Record these before provisioning:

- Staging Supabase hostname (for example `staging-supabase.example.com`).
- Staging frontend hostname (for example `staging-soullink.example.com`).
- Separate server directory and Docker Compose project name.
- Non-conflicting loopback ports for Kong and PostgreSQL/Supavisor.
- SMTP sink/test account and the people allowed to receive staging mail.
- Exact, tested command used to destroy and recreate only the staging volumes.

Do not point either hostname at the production Supabase or application virtual
host. Use new JWT, anon, service-role, database, dashboard, encryption, and SMTP
secrets; copying production secrets defeats isolation.

## 2. Provision the separate stack

Install a second self-hosted Supabase stack using the same pinned release as
production. Give it a distinct Compose project name and directory. Bind Kong
and the database/pooler only to unused loopback ports; Nginx provides public
HTTPS. Apply the same Nginx WebSocket settings documented in
[`Supabase_Setup.md`](Supabase_Setup.md).

Configure the staging stack with its own values:

```dotenv
SUPABASE_PUBLIC_URL=https://staging-supabase.example.com
API_EXTERNAL_URL=https://staging-supabase.example.com/auth/v1
SITE_URL=https://staging-soullink.example.com
GOTRUE_PASSWORD_MIN_LENGTH=8
```

Add the exact staging reset URL to the Auth redirect allowlist. Configure SMTP
so staging cannot mail arbitrary production users during early rehearsals (use
a sink or provider sandbox first). Enable Logs & Analytics if the production
stack will use them, because the rehearsal should include their resource cost.
For the repository's Mailpit setup, follow
[`Supabase_Setup.md`](Supabase_Setup.md#staging-smtp-sink). Verify that the
inbox UI is loopback-only, the SMTP port is not published, and the sink has no
external relay configured. If operators access it through Nginx, require HTTPS
and Basic Auth at server scope so the inbox, API, and WebSocket endpoint are
all protected. Use a unique password and do not expose Docker ports `8025` or
`1025` on a public interface.

Create the persistent safety marker from the staging Supabase Compose
directory. Use the internal administrative role: the regular `postgres` role
can be denied permission to set a database-level custom parameter.

```bash
docker compose exec db psql \
  -U supabase_admin \
  -d postgres \
  -v ON_ERROR_STOP=1 \
  -c "alter database postgres set app.environment = 'staging';"

docker compose exec db psql \
  -U postgres \
  -d postgres \
  -tAc "select current_setting('app.environment', true);"
```

The verification command must print exactly `staging`. It opens a new
connection because `alter database ... set` applies its default to new
sessions. The committed preflight refuses to run without this marker or when
either URL matches the documented production host.

## 3. Connect without publishing PostgreSQL

Keep the staging database bound to localhost on the server. From the migration
workstation, create an SSH tunnel (adjust ports and user):

```powershell
ssh -N `
  -o ExitOnForwardFailure=yes `
  -o ServerAliveInterval=30 `
  -L 127.0.0.1:55432:127.0.0.1:5432 `
  your-user@your-server
```

Verify with:

```powershell
Test-NetConnection 127.0.0.1 -Port 55432
```

In a second PowerShell window, set the variables listed in
[`staging.env.example`](staging.env.example). Never save real values in the
repository or shell history. When the SSH target is Supavisor, the database URL
username must remain `postgres`, and the password must be URL-encoded. Add
`&options=reference%3D<TENANT>` using the exact `POOLER_TENANT_ID` from the
staging stack; appending the tenant to the username can fail with
`(EAUTHQUERY) user not found in the database` in this self-hosted configuration.
The server-local Supavisor listener does not provide TLS, so the URL must also
include `?sslmode=disable`. This is acceptable only because the database traffic
is inside the encrypted SSH tunnel; never disable TLS for a direct remote
database connection. The complete URL is:

```text
postgresql://postgres:<ENCODED_PASSWORD>@127.0.0.1:55432/postgres?sslmode=disable&options=reference%3D<TENANT>
```

Then run the read-only checks:

```powershell
npm run supabase:staging:preflight
```

This checks HTTPS Auth and REST through Nginx, validates the service-role claim,
connects through PostgreSQL, verifies the database marker, reports row counts,
and scans an existing `dist/` for the exact service-role secret.

## 4. Apply schema without seeds

Run the dry run and inspect every statement before applying migrations. The
database URL is supplied from the current shell variable:

```powershell
npx supabase db push --db-url $env:SUPABASE_MIGRATION_STAGING_DB_URL --dry-run --debug
npx supabase db push --db-url $env:SUPABASE_MIGRATION_STAGING_DB_URL --debug
```

The repository's pinned Supabase CLI `2.109.1` currently has a regression where
the normal command path can ignore `sslmode=disable` and fail with `server
refused TLS connection`. The `--debug` path honors it. Remove this workaround
after upgrading to a release that fixes the regression.

Never add `--include-seed` to this migration/import procedure:
`supabase/seed.sql` contains deterministic development accounts and trackers.
The seed is allowed on hosted staging only through the deployment
workflow. Run the pgTAP suite locally against the identical migrations; do not
run data-mutating fixture tests against hosted staging.

After the schema has been applied and before importing any data, require empty
application tables:

```powershell
npm run supabase:staging:preflight -- --expect-empty
```

## 5. Rehearse the imports

Copy a recent immutable Firebase Auth export, RTDB export, and the generated UID
mapping into ignored `database-exports/`. Record their SHA-256 checksums. Follow
[`../scripts/firebase-migration/README.md`](../scripts/firebase-migration/README.md)
in this order:

1. Run the Auth dry run and inspect the UID map.
2. Import Auth into staging.
3. Verify at least one known password and one recovery email through Nginx.
4. Run the RTDB dry run and require zero quarantine issues.
5. Review counts, warnings, owner resolution, tracker mappings, and hashes.
6. Run the transactional RTDB import.
7. Run `npm run supabase:staging:preflight` again and archive its counts.
8. Repeat the identical RTDB import; it must complete without duplicates.

Do not use real user recovery or invitation emails until the SMTP routing has
been manually verified.

For the initial sink rehearsal, deliberately request recovery for a controlled
staging account whose address resembles a real external address. Confirm that
the message appears only in Mailpit and that no relay or outbound-delivery
attempt is logged:

```bash
docker compose logs --since 10m mailpit auth
```

## 6. Deploy and test the staging frontend

Build with only the three browser-safe values shown in
`staging.env.example`. Deploy to the separate frontend hostname, then verify:

- Migrated-password login, logout, session restoration, and recovery.
- Tracker list, metadata, state persistence, deletion/leave redirects, and old
  Firebase URL not-found behavior.
- Owner/editor/guest/unrelated/anonymous permissions and owner-only emails.
- Public tracker access and owner-only public visibility changes.
- Custom rulesets and user preferences, including `multiLocaleSearch`.
- `nicknamesEnabled` for both explicit and legacy/defaulted trackers.
- Realtime propagation between two devices and after reconnect.
- Revision-conflict UI without silent overwrite.
- Nginx WebSocket upgrades, Auth/REST logs, disk growth, and backup success.

Run `npm run build`, unit tests, database tests, migrated-data integration tests,
and Playwright locally for the exact commit deployed to staging.

## 7. Reproducibility and evidence

Record start/end times, export/import/validation duration, source and target
counts, state hashes, warnings, disk usage before/after, commit SHA, Supabase
release, commands, manual fixes, and screenshots/log references. Keep reports
outside Git because they contain identifiers.

After the first successful rehearsal, manually run the `Deploy staging` GitHub
Actions workflow and select the branch containing the application, migrations,
and seed to rehearse. The workflow verifies the staging database marker, clears
the managed Auth data that a remote Supabase CLI reset preserves, reapplies all
migrations and `seed.sql`, verifies the deterministic fixture counts, and
deploys the frontend. Production cutover is not approved until both runs match
and the rollback boundary in
[`Supabase_Migration.md`](Supabase_Migration.md) is explicitly accepted.

## 8. Secret cleanup

Remove every migration secret from the operator shell after the rehearsal:

```powershell
Remove-Item Env:SUPABASE_MIGRATION_STAGING_URL
Remove-Item Env:SUPABASE_MIGRATION_STAGING_APP_URL
Remove-Item Env:SUPABASE_MIGRATION_STAGING_SERVICE_ROLE_KEY
Remove-Item Env:SUPABASE_MIGRATION_STAGING_DB_URL
Remove-Item Env:FIREBASE_SCRYPT_SIGNER_KEY
Remove-Item Env:FIREBASE_SCRYPT_SALT_SEPARATOR
Remove-Item Env:FIREBASE_SCRYPT_ROUNDS
Remove-Item Env:FIREBASE_SCRYPT_MEM_COST
```
