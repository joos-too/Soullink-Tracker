# Firebase-to-Supabase Migration Runbook

## 1. Purpose and fixed decisions

This document describes the complete migration of the Soullink Tracker from Firebase Authentication and Firebase Realtime Database to the self-hosted Supabase installation described in [Supabase_Setup.md](Supabase_Setup.md).

The migration uses the following fixed decisions:

- Use Supabase Auth, PostgreSQL, Row Level Security (RLS), database functions, and Supabase Realtime.
- Use a hybrid schema: authorization and metadata are relational, while the cohesive gameplay state remains a versioned `jsonb` document.
- Give every imported tracker a new UUID. Existing Firebase tracker IDs and URLs do not need to remain valid.
- Preserve existing email/password accounts and Firebase Scrypt password hashes. Existing sessions are not preserved; every user signs in again after cutover.
- Use the Supabase CLI stack for reproducible local development and a separate self-hosted staging stack for integration and migration rehearsals.
- Use a scheduled maintenance outage for the final migration. Do not implement dual writes.
- Refactor backend access out of `../src/App.tsx`, but do not normalize every Pokemon link, cap, fossil, item, rule, or statistic during this migration.

The migration is complete only when the application contains no runtime Firebase dependency, production data has been validated in Supabase, and Firebase has remained read-only through the agreed observation period.

## 2. Firebase functionality and its Supabase replacement

| Current Firebase functionality               | Supabase replacement                                               | Implementation choice                                              |
| -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Firebase Web SDK initialization              | `createClient` from `@supabase/supabase-js`                        | One client in `src/supabaseClient.ts`                              |
| `onAuthStateChanged`                         | `supabase.auth.onAuthStateChange`                                  | Exposed through an Auth service/hook                               |
| `signInWithEmailAndPassword`                 | `supabase.auth.signInWithPassword`                                 | Preserve current email/password UI                                 |
| `createUserWithEmailAndPassword`             | `supabase.auth.signUp`                                             | Preserve current signup behavior initially                         |
| `signOut`                                    | `supabase.auth.signOut`                                            | Clear application state after success/failure handling             |
| Firebase password-reset actions              | `resetPasswordForEmail`, recovery Auth event, and `updateUser`     | Replace Firebase `oobCode` routing                                 |
| Realtime Database `get`, `set`, and `update` | PostgREST queries and PostgreSQL RPC calls                         | RPC for multi-table or permission-sensitive changes                |
| Realtime Database `onValue`                  | Supabase Realtime Postgres Changes                                 | Subscribe only to list membership, active state, and user rulesets |
| Root multi-location update                   | PostgreSQL transaction inside an RPC                               | Tracker creation, invitation, member removal, and deletion         |
| `../database.rules.json`                     | PostgreSQL grants, constraints, RLS policies, and helper functions | Deny access by default                                             |
| `userTrackers/{uid}`                         | Indexed rows in `tracker_members`                                  | No duplicated lookup tree                                          |
| `userEmails/{emailKey}`                      | Exact-email lookup inside an owner-only RPC                        | Do not expose a user/email directory to clients                    |
| Auth/Database emulators                      | Supabase CLI Docker stack                                          | Migrations and server-side seed data                               |
| Firebase data shapes                         | Generated Supabase `Database` types plus domain types              | Do not use generated row types directly as UI state                |

Supabase Storage and Edge Functions are not required for current feature parity. Database functions are the correct replacement for trusted, atomic operations. Postgres Changes is sufficient for the current subscription shape. If subscription volume later becomes a bottleneck, move database notifications to trigger-based Broadcast, which Supabase recommends for greater scalability: [Subscribing to database changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes).

## 3. Target database schema

All schema changes must be timestamped SQL migrations under `migrations`. Do not make untracked schema changes in local, staging, or production Studio.

### 3.1 Extensions and private helpers

Enable only the required extensions:

- `pgcrypto` for `gen_random_uuid()`.
- `citext` for normalized, case-insensitive email work where needed by migration staging.
- `pgtap` in local/test environments.

Create a non-exposed `private` schema for authorization helpers. Functions in this schema must have a fixed `search_path`, must not accept authorization facts from the caller, and must not be executable by `anon` or `authenticated` unless explicitly required by an exposed wrapper.

Suggested helpers:

- `private.is_tracker_reader(tracker_id uuid, user_id uuid)`
- `private.is_tracker_writer(tracker_id uuid, user_id uuid)`
- `private.is_tracker_owner(tracker_id uuid, user_id uuid)`
- `private.compute_tracker_summary(state jsonb)`

### 3.2 `profiles`

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  firebase_uid text unique,
  display_name text not null check (length(btrim(display_name)) > 0 and char_length(display_name) <= 50),
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  use_generation_sprites boolean not null default false,
  use_sprites_in_team_table boolean not null default false,
  wiki_id text,
  multi_locale_search boolean not null default false
);
```

New Auth users receive a profile through an `auth.users` insert trigger. The trigger derives a non-unique initial `display_name` from the email prefix; migrated profiles use the Firebase display name when valid and otherwise the same fallback. Users may change it later without being prompted. Only the user may select or update their profile. The client must not write `firebase_uid`, `created_at`, or another user's profile.

### 3.3 `trackers`

```sql
create table public.trackers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  player_names text[] not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  game_version_id text not null,
  is_public boolean not null default false,
  all_pokemon_and_items boolean not null default false,
  ruleset_id text,
  constraint trackers_title_not_blank check (length(btrim(title)) > 0),
  constraint trackers_player_count check (cardinality(player_names) between 1 and 3)
);
```

`ruleset_id` is deliberately not a foreign key because preset IDs exist only in source code. The tracker state retains the current rules as a snapshot, so deleting a custom ruleset does not break an existing tracker.

### 3.4 `tracker_members`

```sql
create type public.tracker_role as enum ('owner', 'editor', 'guest');

create table public.tracker_members (
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.tracker_role not null,
  added_at timestamptz not null default now(),
  settings jsonb not null default '{}'::jsonb,
  primary key (tracker_id, user_id),
  constraint tracker_member_settings_object
    check (jsonb_typeof(settings) = 'object')
);

create unique index tracker_one_owner
  on public.tracker_members (tracker_id)
  where role = 'owner';

create index tracker_members_by_user
  on public.tracker_members (user_id, tracker_id);
```

`settings` initially stores `rivalPreferences`. Direct client insert, role update, and delete privileges on this table must be revoked. Controlled RPCs preserve the invariant that every tracker has exactly one owner. Ownership transfer is out of scope unless it is added as a separate, tested RPC.

Firebase `members` and `guests` become one table. `guest` remains read-only; `editor` replaces writable non-owner membership.

### 3.5 `tracker_states`

```sql
create table public.tracker_states (
  tracker_id uuid primary key references public.trackers(id) on delete cascade,
  state jsonb not null,
  schema_version integer not null default 1,
  revision bigint not null default 1,
  summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint tracker_state_object check (jsonb_typeof(state) = 'object'),
  constraint tracker_summary_object check (jsonb_typeof(summary) = 'object'),
  constraint tracker_revision_positive check (revision > 0)
);
```

The JSON state contains the gameplay fields currently represented by `AppState`, except:

- `playerNames` moves to `trackers.player_names`.
- `rulesetId` moves to `trackers.ruleset_id`.

The tracker-specific `rules` array remains in `state`, because it is a snapshot that can diverge from a saved ruleset. `nicknamesEnabled` also remains in `state` because it is a shared tracker-level feature setting; missing legacy values normalize to `true` to match the current application default.

`summary` contains `teamCount`, `boxCount`, `graveyardCount`, `deathCount`, `runs`, `championDone`, `doneCapsCount`, and `progressPct`. A before-insert/update trigger computes it from `state`; the client cannot supply a trusted summary. Tracker-list queries select `trackers`, the current user's membership role, and `tracker_states.summary`, not full state documents for every tracker.

### 3.6 `rulesets`

```sql
create table public.rulesets (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  rules text[] not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  constraint ruleset_name_not_blank check (length(btrim(name)) > 0)
);
```

Only custom rulesets are stored here. Presets stay in `../src/data/rulesets.ts` and cannot be edited or deleted.

### 3.7 Realtime publication

Add `trackers`, `tracker_members`, `tracker_states`, and `rulesets` to `supabase_realtime`. Realtime does not replace the initial query: every screen first fetches its authorized snapshot, then subscribes for changes. On reconnect or subscription error, refetch before accepting further edits.

## 4. Security model and database functions

Follow the Supabase RLS guidance for `auth.uid()`, `USING`, `WITH CHECK`, and security-definer helpers: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 4.1 Access matrix

| Operation                         | Anonymous | Unrelated user | Guest | Editor | Owner |
| --------------------------------- | --------: | -------------: | ----: | -----: | ----: |
| Read private tracker/state        |        No |             No |   Yes |    Yes |   Yes |
| Read public tracker/state         |       Yes |            Yes |   Yes |    Yes |   Yes |
| Update gameplay state             |        No |             No |    No |    Yes |   Yes |
| Update title/player names/options |        No |             No |    No |    Yes |   Yes |
| Change public visibility          |        No |             No |    No |     No |   Yes |
| View membership list              |        No |             No |   Yes |    Yes |   Yes |
| Invite/remove members             |        No |             No |    No |     No |   Yes |
| Delete tracker                    |        No |             No |    No |     No |   Yes |
| Read/update custom ruleset        |        No |     Owner only |   N/A |    N/A |   N/A |

Public reads return tracker metadata and state only. They must never expose membership email addresses, private member settings, profile data, or Auth records.

### 4.2 Required RPCs

Implement these functions transactionally:

1. `create_tracker(title, player_names, game_version_id, all_pokemon_and_items, ruleset_id, initial_state, invites jsonb)`
   - Derive the owner from `auth.uid()`.
   - Validate title, player count, state shape, invite roles, and unique normalized emails.
   - Insert tracker, owner membership, invited memberships, and initial state in one transaction.
   - Resolve invite emails inside the function; return a typed missing-email error without revealing unrelated users.
   - Return the new tracker UUID.

2. `invite_tracker_member(tracker_id, email, role)`
   - Require the caller to be owner.
   - Accept only `editor` or `guest`.
   - Perform an exact, normalized lookup in `auth.users` inside the function.
   - Reject unknown users and existing members.

3. `remove_tracker_member(tracker_id, user_id)`
   - Require the caller to be owner.
   - Reject owner removal.
   - Delete the membership atomically; cascade is not used for the user or tracker.

4. `delete_tracker(tracker_id)`
   - Require the caller to be owner.
   - Delete the tracker; foreign-key cascades delete state and memberships.

5. `update_tracker_state(tracker_id, expected_revision, state)`
   - Require owner/editor membership.
   - Validate that `state` is an object and does not contain migrated metadata keys.
   - Update only where `revision = expected_revision`.
   - Increment the revision, recompute summary, and record `auth.uid()` and `now()`.
   - Return the updated row. If zero rows update, raise a stable `state_revision_conflict` error.

6. `set_tracker_visibility(tracker_id, is_public)`
   - Require the caller to be owner.
   - Change only `is_public` and return the updated tracker.
   - Do not grant clients direct update access to the `is_public` column. Editors receive column-level update grants only for editable metadata such as title, player names, game version, tracker options, and ruleset reference.

All exposed functions revoke execution from `public` and grant it only to the needed Supabase roles. Security-definer functions set an explicit safe `search_path` and schema-qualify referenced objects.

## 5. Development and deployment workflow

### 5.1 Local Supabase

Install and initialize the CLI:

```bash
npm install --save-dev supabase
npx supabase init
npx supabase start
```

Commit:

- `config.toml`
- `migrations`
- `seed.sql` or ordered files under `supabase/seeds/`
- `tests`

Do not commit `.temp`, local database volumes, generated secrets, service-role keys, database URLs, exports, or migration reports containing email addresses.

Add package scripts equivalent to:

```json
{
  "supabase:start": "supabase start",
  "supabase:stop": "supabase stop",
  "supabase:reset": "supabase db reset",
  "supabase:test": "supabase test db",
  "supabase:types": "supabase gen types typescript --local > src/types/database.ts"
}
```

Because shell redirection is platform-specific, the final type-generation script may call a small cross-platform Node wrapper. Generated database types are committed and regenerated whenever migrations change.

Supabase applies seeds after migrations on start/reset: [Seeding your database](https://supabase.com/docs/guides/local-development/seeding-your-database).

### 5.2 Seed data

Move the sample data from `../src/services/emulatorSeed.ts` to server-side seed files. Seed:

- `test@example.com` with password `testpassword123` in local/staging only.
- Its Auth identity and profile.
- The Gen 1, Gen 4, Gen 5, and Gen 6 sample trackers.
- Owner memberships and corresponding state rows.
- Any custom rulesets needed by UI tests.
- Explicit profile variants with `multi_locale_search` enabled and disabled.
- At least one tracker with `nicknamesEnabled: true` and one with `nicknamesEnabled: false`.

Use fixed UUIDs in seed data so screenshots and tests remain deterministic. `supabase db reset` must be idempotent and produce the same logical dataset. The browser must never seed data or receive a service-role key.

### 5.3 Staging

Run staging as an independent self-hosted stack with:

- A separate hostname, database, Docker project name, volumes, JWT secret, anon key, service-role key, SMTP configuration, and backups.
- Production-like Nginx routing and WebSocket configuration.
- No connection to the production database.
- Test email delivery or a safe SMTP sink.

Apply migrations to a self-hosted database using an encoded connection string:

```bash
npx supabase db push --db-url "$STAGING_DB_URL" --dry-run
npx supabase db push --db-url "$STAGING_DB_URL"
```

The CLI supports `--db-url` for self-hosted databases: [Supabase CLI `db push`](https://supabase.com/docs/reference/cli/supabase-db-push). Never use `--include-seed` against production.

## 6. Supabase Auth configuration and migration

### 6.1 Configuration

Frontend variables:

```dotenv
VITE_SUPABASE_URL=https://supabase.janlieder.de
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Only the public URL and publishable/anon key may enter the Vite bundle. Keep the service-role key, database password, Firebase service account, Auth exports, and Scrypt parameters outside the repository and frontend environment.

For both staging and production configure:

- Site URL and allowed redirect URLs.
- External email/password signup.
- Current auto-confirm behavior for functional parity.
- JWT expiration.
- SMTP host, port, sender, username, and password.
- Recovery email subject and template.
- Production and localhost recovery destinations.

Self-hosted Auth configuration is managed in Docker/environment configuration rather than Studio: [Auth self-hosting configuration](https://supabase.com/docs/guides/self-hosting/auth/config).

Generate a real recovery email in staging and verify its URL through Nginx. Correct `API_EXTERNAL_URL`, `SITE_URL`, and the redirect allowlist if the generated link contains a duplicated or missing `/auth/v1` path. Do not rely only on `curl -I /auth/v1/`.

### 6.2 Preserve Firebase passwords

Before any production cutover:

1. Export Firebase Auth users with the Firebase Admin tooling.
2. Save `base64_signer_key`, `base64_salt_separator`, `rounds`, and `mem_cost` from Firebase's password hash parameters.
3. Pin a reviewed commit of the Supabase community Firebase Auth migration tooling.
4. Verify that its Auth schema assumptions match the exact self-hosted Supabase Auth version.
5. Import into an empty staging Auth schema first.
6. Generate a new Supabase UUID for each user and record `firebase_uid -> supabase_user_id` in a protected migration mapping file.
7. Populate `profiles.firebase_uid` from the same mapping.
8. Test real passwords for representative migrated accounts, disabled-account behavior, and password recovery.

Supabase documents the Firebase Scrypt import workflow here: [Migrate from Firebase Auth](https://supabase.com/docs/guides/platform/migrating-to-supabase/firebase-auth).

Acceptance checks:

- Source and target user counts match, excluding explicitly quarantined records.
- Every tracker owner/member Firebase UID maps to exactly one Supabase UUID.
- Normalized emails are unique or resolved before cutover.
- Disabled users remain unable to sign in.
- Existing passwords work for the tested accounts.
- All users must create a new Supabase session after cutover; Firebase refresh tokens are not migrated.

## 7. Realtime Database JSON migration

### 7.1 Export

Take an immutable Firebase root JSON export using an authenticated Admin/REST request or Firebase backup. The REST endpoint is the database URL with `/.json`: [Firebase Realtime Database REST API](https://firebase.google.com/docs/reference/rest/database).

Store exports outside Git with restricted permissions and a timestamped checksum. Keep the matching Auth export and UID mapping with the same migration run.

### 7.2 Migration tool interface

Create an idempotent server-side TypeScript tool, for example `../scripts/migrate-firebase-to-supabase.ts`, with this interface:

```text
--input <firebase-export.json>
--auth-map <firebase-to-supabase-users.json>
--target <staging|production>
--report <report.json>
--dry-run
```

Database credentials come from target-specific server environment variables, never command-line output or the input JSON. `--dry-run` parses, normalizes, validates, hashes, and reports without changing the target. A real import first writes protected staging tables or uses one database transaction; any error rolls back the complete import.

The implemented CLI is `npm run firebase:migrate -- ...`. Its exact Auth-map format, environment variables, dry-run workflow, production confirmation gate, and validation commands are documented in [`../scripts/firebase-migration/README.md`](../scripts/firebase-migration/README.md). The tool uses a serializable transaction and refuses to overwrite an existing deterministic tracker when its target data differs from the migration output.

### 7.3 Deterministic new tracker UUIDs

Use UUIDv5 so staging rehearsals and reruns generate the same new tracker UUIDs without keeping the Firebase ID in production tables.

Use the DNS UUID namespace and this fixed namespace name:

```text
soullink-tracker.janlieder.de/firebase-tracker
```

Algorithm:

```text
trackerNamespace = uuidv5(
  "soullink-tracker.janlieder.de/firebase-tracker",
  DNS_NAMESPACE
)
supabaseTrackerId = uuidv5(firebaseTrackerId, trackerNamespace)
```

The report stores `firebaseTrackerId -> supabaseTrackerId`. The final `trackers` table stores only the UUID.

### 7.4 Transformations

Transform these roots:

| Firebase path                        | Supabase destination                                   |
| ------------------------------------ | ------------------------------------------------------ |
| `users/{firebaseUid}`                | `profiles` using the Auth UUID mapping                 |
| `rulesets/{firebaseUid}/{rulesetId}` | `rulesets`                                             |
| `trackers/{firebaseTrackerId}/meta`  | `trackers` and `tracker_members`                       |
| `trackers/{firebaseTrackerId}/state` | `tracker_states`                                       |
| `userTrackers`                       | Do not import; validate against `tracker_members`      |
| `userEmails`                         | Do not import; use only to validate Auth email mapping |

Rules:

- Convert epoch milliseconds to UTC `timestamptz`.
- Map `users/{uid}/multiLocaleSearch` to `profiles.multi_locale_search`; use `false` when the Firebase field is absent or not a boolean.
- Map `users/{uid}/displayName` to `profiles.display_name` after trimming and enforcing the 50-character limit. If it is missing or invalid, derive the non-unique fallback from the mapped Auth email prefix.
- Use `meta.playerNames` as authoritative when present and valid; otherwise use sanitized `state.playerNames`. Record disagreements as warnings.
- Remove `playerNames` and `rulesetId` from imported state JSON after moving them to `trackers`.
- Preserve the tracker-specific rules snapshot.
- Convert deprecated `rivalCensorEnabled` to `rivalCensorMode` when the new field is absent: `false -> off`, `true -> on`, missing -> `on`.
- Preserve a boolean `nicknamesEnabled` in tracker state; use `true` when the Firebase field is absent or invalid so pre-feature trackers retain their existing nickname behavior.
- Normalize optional arrays and statistics using a migration-only version of the current `createInitialState`/coercion rules.
- Convert `members` and `guests` to `tracker_members`; reject invalid roles and resolve every Firebase UID through the Auth map.
- Move `meta.userSettings/{uid}` to the matching membership `settings`.
- Set state `schema_version` to `1`, `revision` to `1`, and calculate its summary and canonical hash.
- Keep ruleset IDs as strings because preset IDs are source-controlled strings.

Quarantine rather than silently repair:

- Missing or unmapped owner.
- More than one owner or no owner.
- Duplicate normalized Auth email.
- Member UID absent from the Auth map.
- Tracker without a valid game version.
- State that cannot be normalized into an object.
- Invalid membership role.
- Duplicate target primary keys with unequal data.

The operator must resolve every quarantined owner/tracker before production import. Optional corrupt records may be explicitly excluded only if recorded and approved in the report.

### 7.5 Migration report and validation

The JSON report must contain:

- Input filename and SHA-256 checksum.
- Tool version/commit and execution timestamp.
- Target environment and dry-run flag, without secrets.
- Source and target counts for users, profiles, trackers, memberships, states, and rulesets.
- Old-to-new tracker ID mapping.
- Firebase-to-Supabase user mapping by UID; redact emails from general logs.
- Warnings, quarantined records, and explicit exclusions.
- Canonical SHA-256 hash for every normalized state.
- Referential-integrity and duplicate checks.
- Total duration.

Canonical state hashing must recursively sort object keys while preserving array order. Run the same normalization and hashing code before and after insert.

## 8. Frontend refactor

### 8.1 Boundaries

Add:

- `src/supabaseClient.ts`: client creation and public environment validation.
- Auth service: session, login, signup, logout, recovery, and profile bootstrap.
- Tracker repository: list, load, create, metadata updates, membership RPCs, state CAS updates, and subscriptions.
- Ruleset repository: owner-scoped CRUD and subscription.
- Mapping functions between generated database rows and domain/view types.
- Hooks/controllers such as `useAuthSession`, `useTrackerList`, `useActiveTracker`, and `useRulesets`.

No React component or `App.tsx` code should import Supabase query primitives directly. Components receive domain objects and callbacks.

During development, a repository-level `VITE_BACKEND=firebase|supabase` switch may select one implementation. Never write to both backends. Delete the Firebase implementation and switch after the observation period.

### 8.2 Type changes

- Generate `Database` types from the local schema into a dedicated generated file.
- Keep UI/domain types in `../types.ts`.
- Introduce a persisted `TrackerState` type that excludes `playerNames` and `rulesetId` from `AppState`.
- Keep `nicknamesEnabled` on `TrackerState`, not tracker metadata or the user profile.
- Add `multiLocaleSearch` to the application profile/preferences type and map it to `profiles.multi_locale_search`.
- Add a non-unique `displayName` to the application profile type. Tracker participant lists must show this name, never Auth email addresses; email remains an invitation-only input.
- Keep `TrackerMeta` as a UI view model assembled from `trackers` and `tracker_members`.
- Change tracker IDs and route parameters to UUID strings semantically, while runtime-validating them before queries.
- Represent state reads as `{ state, revision, schemaVersion }`.
- Map Supabase/PostgREST errors into stable application error codes instead of checking vendor error messages in components.

### 8.3 Auth changes

- Replace Firebase `User` usage with a small application user/session type.
- Update login and registration to Supabase Auth methods.
- Bootstrap/update `profiles.last_login_at` through a service or safe RPC.
- Load and update `profiles.display_name` through the profile service. Read participant display names only through a reader-authorized `list_tracker_members(tracker_id)` RPC, not through a broadly readable profile or Auth-user query.
- Load and update `multi_locale_search` through the profile service, preserving the current default of `false`; search services and `MultiLocaleSearchProvider` remain frontend-only consumers of this preference.
- Replace the current reset page's Firebase verification-code flow with the Supabase `PASSWORD_RECOVERY` session event and `updateUser({ password })`.
- Configure and pass an allowed `redirectTo` for reset requests.
- Clear tracker/application state after logout and on session expiry.
- Add localized handling for invalid credentials, duplicate email, weak password, rate limiting, expired recovery, and general failures.

### 8.4 Tracker loading and Realtime

Replace the current listener fan-out with:

1. One initial tracker-list query joined through `tracker_members`, including metadata and summary.
2. One subscription that invalidates/refetches the authenticated user's tracker list when relevant membership/tracker rows change.
3. One initial active-tracker state query plus one subscription filtered by active tracker UUID.
4. One owner-filtered custom-ruleset query/subscription.
5. One direct public tracker query/subscription for an anonymous public route.

Always remove channels during effect cleanup, logout, tracker changes, and component unmount. Refetch after reconnect rather than assuming no events were missed.

### 8.5 State writes and conflicts

- Debounce autosaves so keystrokes do not issue one request each.
- Serialize writes per active tracker.
- Call `update_tracker_state` with the revision returned by the last read/write.
- On success, store the returned revision.
- On `state_revision_conflict`, stop pending saves, fetch the latest state, and display a localized conflict dialog.
- The conflict dialog offers reload/accept-server-state; it must not automatically overwrite or attempt an unsafe whole-document merge.
- Revert optimistic metadata changes when their RPC/query fails.
- Flush or explicitly cancel pending writes before switching trackers or logging out.

This prevents the current unconditional whole-state last-write-wins behavior from silently losing another editor's update. Fully granular collaborative commands can be designed later if frequent conflicts make them necessary.

### Optional post-migration optimization: split gameplay state

Do not change the initial migration's single versioned `tracker_states.state` document solely for anticipated performance. Revisit this only when production metrics show that whole-document saves, Realtime payloads, or revision conflicts are a practical problem.

The first optimization should retain flexible JSONB but split independently edited areas into separately versioned sections rather than fully normalizing every gameplay entity. For example, use a `tracker_state_sections` table with `(tracker_id, section)` as its key, a `state jsonb` document, `revision`, `updated_at`, and `updated_by`. Candidate sections are `team`, `box`, `graveyard`, `rules`, `progress` (badges/caps/champion state), and `run_stats`. The exact boundaries must follow real edit patterns and preserve data that must change together.

- Replace a complete section document on save; do not introduce arbitrary JSON-path patches initially.
- Give each section its own compare-and-swap revision and Realtime subscription, so an edit to rules does not conflict with a concurrent box edit.
- Provide a transactional RPC for mutations that span sections, such as moving a linked Pokemon between team, box, and graveyard. It must validate every expected section revision and update all affected sections atomically.
- Adapt the frontend repository to load and assemble sections into the existing `AppState` view model. The UI may keep its cohesive in-memory state while persistence tracks dirty sections.
- Backfill sections from existing `tracker_states.state` with a tested, idempotent migration; retain the old document until validation and rollback gates pass.
- Add RLS, RPC atomicity, section-conflict, reconnect, and cross-section move tests before enabling the new path.

This is a targeted performance and collaboration optimization. It is substantially smaller than a full relational redesign, but it remains post-migration work because it introduces new state boundaries, migration logic, and cross-section consistency requirements.

### 8.6 New tracker IDs and routes

On the first Supabase release:

- Clear `LAST_TRACKER_STORAGE_KEY` once using a versioned local migration marker such as `backend-migration-version=1`.
- Reject non-UUID tracker route parameters without querying the database.
- Show the normal not-found state and a link to the tracker list for obsolete Firebase URLs.
- Do not attempt client-side old-ID redirects because the production application has no legacy tracker mapping.

### 8.7 Final Firebase removal

After the observation period:

- Remove `firebase` from `../package.json`.
- Delete `../src/firebaseConfig.ts` and `../src/services/emulatorSeed.ts`.
- Remove all Firebase imports and the temporary Firebase repositories.
- Remove Firebase environment variables and emulator scripts/configuration.
- Remove `../database.rules.json` and `../firebase.json` after retaining them in the migration archive/history.
- Update project documentation and `../AGENTS.md` to describe Supabase paths and commands.

## 9. Testing requirements

### 9.1 Database tests

Use pgTAP through `supabase test db`: [Supabase database testing](https://supabase.com/docs/guides/local-development/testing/overview).

Test:

- Tables, constraints, foreign keys, indexes, RLS enabled state, and grants.
- Anonymous public/private reads.
- Unrelated authenticated-user denial.
- Guest read-only access.
- Editor state/metadata writes and denial of owner operations.
- Owner invitation, removal, visibility, and deletion.
- Prevention of owner removal and second-owner insertion.
- Ruleset owner isolation.
- Exact-email invitation without user-directory enumeration.
- Tracker creation rollback when any invite is invalid.
- State revision increment and stale-revision rejection.
- Summary computation from representative states.

### 9.2 Migration tests

Create small fixture exports for:

- Current valid data.
- Missing optional state arrays.
- Deprecated rival censor fields.
- Missing, enabled, disabled, and invalid `nicknamesEnabled` values.
- Missing, enabled, disabled, and invalid user `multiLocaleSearch` values.
- Differing meta/state player names.
- Duplicate emails.
- Orphan owner/member UIDs.
- Unknown game version.
- Invalid role and malformed state.
- Repeat execution against the same target.
- Stable UUIDv5 tracker mapping.
- Canonical hash equality after round trip.

### 9.3 Frontend/integration tests

Cover:

- Migrated-password login and required new session.
- Signup, logout, session restoration, reset request, recovery completion, and expired link.
- Tracker list and summary.
- Creating, opening, editing, resetting, and deleting a tracker.
- Owner/editor/guest UI and server-side enforcement.
- Invitations and removals.
- Public tracker access without authentication.
- Custom ruleset CRUD and preset immutability.
- User and tracker preferences.
- Persistence of `multiLocaleSearch` across sessions and its use by Pokemon, item, and location searches.
- Persistence of `nicknamesEnabled`, its default for migrated trackers, reset preservation, and nickname-disabled add/edit/display behavior.
- Realtime update propagation and channel cleanup.
- Revision-conflict dialog without silent overwrite.
- Obsolete Firebase URL fallback and local-storage migration.

Every meaningful migration change must pass database tests, migration fixtures, frontend tests, `npm run build`, and `npm run prettier:check`.

## 10. Staging rehearsal

The executable preparation and operator checklist for the separate hosted
stack are maintained in [`Staging_Rehearsal.md`](Staging_Rehearsal.md). Its
preflight requires an explicit `app.environment=staging` database marker and
rejects the documented production hostnames before making any connection-driven
rehearsal decision.

Run at least one full rehearsal with a recent production export:

1. Reset the isolated staging database.
2. Apply all migrations.
3. Import Auth users and verify representative passwords.
4. Run the JSON migration in dry-run mode and resolve every quarantine.
5. Perform the real import.
6. Compare counts, ownership, mappings, state hashes, and foreign keys.
7. Deploy the Supabase frontend configured for staging.
8. Exercise the complete Auth, tracker, membership, public-read, ruleset, recovery-email, and Realtime flows.
9. Record export/import duration, validation duration, disk usage, errors, manual actions, and total required outage time.
10. Destroy and repeat the rehearsal from the same inputs to prove reproducibility.

Do not approve production cutover unless:

- Every tracker has exactly one resolved owner.
- All included members resolve to Auth users.
- Counts match the approved report.
- All normalized state hashes match.
- RLS negative tests pass.
- Existing-password tests pass.
- No service-role key is present in frontend source or build output.
- Recovery links work through the public Nginx endpoint.

## 11. Production cutover

### 11.1 Preparation

- Announce the maintenance window and expected forced sign-in.
- Confirm staging rehearsal results and estimated duration.
- Freeze application/schema changes unrelated to the migration.
- Prepare the maintenance frontend, Supabase frontend, Firebase rollback frontend, commands, environment files, and checklist before the outage.
- Back up the empty/pre-migration Supabase database and verify restore instructions.
- Verify free disk space, monitoring, logs, and SMTP.

### 11.2 Outage procedure

1. Deploy the maintenance build, blocking all Firebase writes and signups.
2. Verify from multiple sessions that mutations are unavailable.
3. Export final Firebase Auth users and password parameters.
4. Export final Realtime Database JSON and `../database.rules.json`.
5. Record checksums and store all exports securely.
6. Run `supabase db push --db-url "$PRODUCTION_DB_URL" --dry-run`.
7. Apply pending production migrations without seeds.
8. Import Auth users and produce the final UID mapping.
9. Run the JSON migration with `--dry-run`; stop on any unresolved quarantine or count regression.
10. Run the transactional production import.
11. Execute database/RLS tests that are safe for the production schema.
12. Validate counts, owners, memberships, mappings, hashes, and foreign keys.
13. Test representative migrated logins, password recovery, tracker roles, a public tracker, a state update, rulesets, and Realtime.
14. Deploy the Supabase frontend.
15. Confirm old tracker URLs fail safely and the tracker list uses new UUIDs.
16. Reopen the application only after all acceptance gates pass.

### 11.3 Rollback boundary

Before reopening writes, rollback is:

1. Redeploy the Firebase frontend or maintenance build.
2. Leave Supabase closed to users.
3. Investigate using the immutable exports and reports.

After Supabase accepts production writes, do not switch back to Firebase without a separately designed and rehearsed reverse migration. Firebase will no longer contain new Supabase changes. This boundary must be explicitly acknowledged in the cutover checklist.

## 12. Observation and decommissioning

During the observation period:

- Keep Firebase read-only.
- Retain encrypted exports, UID/tracker mappings, reports, and checksums.
- Monitor Auth failures, recovery email delivery, PostgREST errors, RLS denials, Realtime disconnects, state conflicts, database growth, and backup success.
- Compare daily tracker/user counts and investigate unexpected differences.

After the observation period and explicit approval:

- Take a final archival Firebase backup.
- Revoke Firebase service credentials and client configuration.
- Remove Firebase runtime code and dependencies.
- Remove temporary backend switching code.
- Restrict and eventually delete migration-only mapping data according to the backup/retention policy.
- Update operational documentation and disaster-recovery procedures for the self-hosted Supabase database, Auth, SMTP, Realtime, and backups.

## 13. Final acceptance checklist

- [ ] Local `supabase db reset` recreates schema and sample data.
- [ ] Staging can be recreated solely from committed migrations and approved seed files.
- [ ] All pgTAP/RLS tests pass.
- [ ] Firebase Auth password hashes work in Supabase for representative users.
- [ ] Every imported tracker has a new deterministic UUID and exactly one owner.
- [ ] Migrated trackers preserve `nicknamesEnabled`, defaulting legacy records to `true`.
- [ ] Migrated profiles preserve `multiLocaleSearch`, defaulting missing legacy records to `false`.
- [ ] Migrated profiles have a non-empty, non-unique display name; absent legacy names use the mapped email prefix.
- [ ] Source/target counts and state hashes match the approved report.
- [ ] Owner, editor, guest, unrelated user, and anonymous behavior match the access matrix.
- [ ] Password recovery works through Nginx and SMTP.
- [ ] Realtime state and list updates work after reconnect.
- [ ] Revision conflicts never silently overwrite state.
- [ ] Old tracker URLs and stored Firebase IDs fail safely.
- [ ] No service-role key, database password, Firebase service account, Auth export, or data export is committed or bundled.
- [ ] `npm run build` and `npm run prettier:check` pass.
- [ ] Rollback boundary and observation-period owner are recorded in the cutover checklist.
- [ ] Firebase runtime dependencies are removed after stabilization.

## 14. Assumptions and out-of-scope work

- Existing production accounts primarily use Firebase email/password. If the export reveals OAuth, anonymous, phone, MFA, or linked identities, add and rehearse a provider-specific migration before cutover.
- Existing tracker IDs, bookmarks, and public links may be invalidated.
- Production may remain unavailable for the entire final export, import, validation, and deployment window.
- Firebase Storage, Cloud Functions, Messaging, and Hosting are not used by the application paths inspected for this plan.
- The production Supabase public URL remains `https://supabase.janlieder.de`.
- Staging uses independent infrastructure and secrets.
- Fully normalizing gameplay entities, automatic conflict merging, ownership transfer, and zero-downtime dual writes are explicitly out of scope.
