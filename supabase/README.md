# Supabase development

This directory is the version-controlled source of truth for the Supabase database. Do not make schema changes directly in Studio.

## Prerequisites

- [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) or another Docker-compatible runtime is installed and running.
- Node.js dependencies have been installed with `npm install`.

### Docker Desktop on Windows

1. Download and install [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).
2. Start Docker Desktop and wait until the Docker engine is running.
3. To enable local Supabase Logs & Analytics, open **Docker Desktop → Settings → General** and enable **Expose daemon on `tcp://localhost:2375` without TLS**.
4. Apply the settings and restart Docker Desktop.
5. Verify Docker and the analytics endpoint from PowerShell:

```powershell
docker version
Test-NetConnection localhost -Port 2375
Invoke-RestMethod http://localhost:2375/version
```

Supabase local analytics uses this endpoint on Windows so its Vector container can collect Docker logs. See the [Supabase Windows setup guidance](https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=windows#running-supabase-locally).

Port 2375 exposes an unauthenticated Docker API with control over Docker and potentially the host. Enable it only on a trusted development machine, keep it blocked from external networks with Windows Firewall, and never expose it through a router, VPN, or public interface. Disable the setting when local analytics is not needed. See the [Docker Desktop security warning](https://docs.docker.com/desktop/settings-and-maintenance/settings/).

## Local workflow

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:test
npm run supabase:types
```

`supabase:reset` applies every migration and then `seed.sql`. Supabase Studio is available at `http://127.0.0.1:54323`, and local Auth email is available through Mailpit at `http://127.0.0.1:54324`.

### Connect the frontend to local Supabase

After `npm run supabase:start`, retrieve the local frontend values with:

```bash
npm run supabase:status
```

Copy `API_URL` and `ANON_KEY` into the repository-root `.env` file:

```dotenv
VITE_BACKEND=supabase
VITE_SUPABASE_URL=<API_URL>
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

For the default local stack, `API_URL` is normally `http://127.0.0.1:54321`.
The anon key is the browser-safe key. Never copy `SERVICE_ROLE_KEY`, `DB_URL`, or any database password into `.env` or the frontend bundle. Restart Vite after changing `.env`.

### Initial migration layout

The initial database is split into ordered migrations with explicit dependencies:

| Migration                                 | Responsibility                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `20260719130000_core_schema.sql`          | Extensions, schemas, enum, tables, constraints, and indexes                     |
| `20260719130100_helpers_and_triggers.sql` | Auth profile creation, authorization helpers, summaries, and invariant triggers |
| `20260719130200_rls_and_grants.sql`       | Row Level Security policies and client privileges                               |
| `20260719130300_tracker_rpcs.sql`         | Transactional tracker and membership functions                                  |
| `20260719130400_realtime.sql`             | Realtime publication registration                                               |

Do not reorder these files: each migration assumes the preceding migrations have completed.

The local seed accounts all use password `testpassword123`:

| Account                 | Intended role                      |
| ----------------------- | ---------------------------------- |
| `test@example.com`      | Tracker owner                      |
| `editor@example.com`    | Editor on the public Gen 1 tracker |
| `guest@example.com`     | Guest on the public Gen 1 tracker  |
| `unrelated@example.com` | No memberships                     |

The four tracker IDs and all user IDs are fixed UUIDs so database and frontend tests remain deterministic. Seeds are local fixtures only and must never be included in a staging or production database push.

## Automated tests

Run isolated frontend unit tests with:

```bash
npm run test:unit
```

Run the Supabase-backed browser integration tests with:

```bash
npm run test:e2e
```

Run the real Firebase-fixture import against a freshly reset local database with:

```bash
npm run test:migration:integration
```

This local-only test creates the mapped Auth prerequisite, runs the database
migration CLI twice, checks counts, deterministic tracker IDs, relational rows,
legacy defaults, and canonical state hashes, and restores the normal seed. It
rejects every non-loopback database URL before resetting or importing.

`test:e2e` deliberately runs `supabase db reset` before Playwright and again afterward so the browser mutations cannot leave dirty fixtures behind. Each reset destroys and recreates all data in the local Supabase stack, applies every migration, and loads `seed.sql`; never point this workflow at staging or production. The runner also restarts the local Kong gateway and waits for Auth health because Docker Desktop can otherwise retain the replaced Auth container's old address after a reset. Start the local stack first and ensure the repository-root `.env` contains the local `VITE_SUPABASE_ANON_KEY` shown by `npm run supabase:status`.

Use `npm run test:e2e:run` only when you intentionally want to rerun Playwright without resetting the fixtures. Install the browser once per machine with `npx playwright install chromium`.

## Creating and deploying migrations

Create a migration with a descriptive name:

```bash
npm run supabase:migration:new -- add_feature_name
```

For a self-hosted database, pass its encoded connection URL at invocation time. Always inspect a dry run first:

```bash
npm run supabase:db:push:dry-run -- --db-url "<database-url>"
npm run supabase:db:push -- --db-url "<database-url>"
```

Never put database URLs, service-role keys, Firebase exports, or migration reports containing user data in this repository. Do not add `--include-seed` when pushing to staging or production.

### Automated hosted deployments

Hosted releases use two independent branch workflows:

| Branch    | Workflow                | Image tag | Target environment |
| --------- | ----------------------- | --------- | ------------------ |
| `staging` | `deploy-staging.yml`    | `staging` | staging            |
| `master`  | `deploy-production.yml` | `latest`  | production         |

Both workflows run on a push to their branch and through `workflow_dispatch`.
A manual run fails when the selected ref is not the workflow's matching branch.
Each release builds the frontend and runs the complete Supabase E2E workflow,
then applies pending database migrations, and only then deploys the frontend.
Migration and frontend deployment run in one environment-bound release job.
The production release job uses the protected `production` GitHub environment
as its approval gate and records the complete release in GitHub's deployment
history.

Configure both GitHub environments, `staging` and `production`, with:

- Secret `SSH_HOST`
- Secret `SSH_USERNAME`
- Secret `SSH_PRIVATE_KEY`
- Secret `SSH_KNOWN_HOSTS`, containing a host-key entry verified out of band
- Secret `SUPABASE_MIGRATION_DB_URL`, using an RFC 3986-encoded password. For
  Supavisor session mode use
  `postgresql://postgres.<POOLER_TENANT_ID>:<password>@127.0.0.1:55432/postgres?sslmode=disable&options=reference%3D<POOLER_TENANT_ID>`.
  Disabling database TLS is allowed here only because the workflow carries the
  connection through its encrypted SSH tunnel.
- Variable `SUPABASE_DB_REMOTE_PORT`, containing that stack's server-local
  Supavisor session port
- Variable `DEPLOY_PATH`, containing the environment's separate frontend
  deployment directory
- Variable `APP_URL`, containing the public frontend URL shown in GitHub's
  deployment history
- In the `staging` environment, variables `STAGING_VITE_SUPABASE_URL` and
  `STAGING_VITE_SUPABASE_ANON_KEY`, containing the public frontend build
  configuration
- In the `production` environment, variables `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`, containing the public frontend build configuration

The runner opens an SSH tunnel to the configured remote port. PostgreSQL must
remain bound to the server's loopback interface; port `55432` exists only on
the ephemeral GitHub runner. Keeping SSH and database credentials on the
GitHub Environments prevents the release job from accessing them before its
protection rules have passed. Remove repository-level copies after both
environments have been configured.

Both deployment workflows read their frontend variables through an
environment-bound configuration job before invoking the reusable build
workflow. Repository-level copies are not required.

The environment-bound release job uses the local
`deploy-docker-compose` action rather than an external reusable deployment
workflow. This keeps migration, registry access, Compose deployment, approval,
environment URL, and deployment status inside one GitHub Environment
deployment. The action verifies the SSH host key and preserves the server-side
`.env` file beside the copied Compose file. It refuses to deploy if that file
is missing or its Compose project, image tag, or application port differs from
the environment's expected values.

Before the first deployment, mark each database through an administrative
connection:

```sql
alter database postgres set app.environment = 'staging';
alter database postgres set app.environment = 'production';
```

Run only the matching statement against each database, then reconnect. The
pipeline refuses to migrate a database whose marker does not match its target.
It also rejects migration-history divergence and verifies exact history after
`supabase db push`. Seeds are never applied to hosted environments.

Promote releases through a `staging` to `master` pull request. Once a migration
has been applied to either hosted database, do not edit, rename, reorder, or
delete its SQL file; add a new forward migration instead. A production
environment approval confirms that a recent restorable backup exists.

The separate hosted environment, safety marker, SSH tunnel, preflight, import
order, and evidence checklist are documented in
[`Staging_Rehearsal.md`](Staging_Rehearsal.md). Run its read-only preflight with
`npm run supabase:staging:preflight` before any hosted rehearsal step.
