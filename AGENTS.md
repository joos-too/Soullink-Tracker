# Agent Handbook

Reference for coding agents working on the Pokemon Soullink Tracker.
Update the Handbook for any major changes.

## Project Overview

- React 19 + TypeScript single-page app built with Vite.
- Main entry points are `index.tsx` and `src/App.tsx`.
- The app uses Supabase Authentication and PostgreSQL.
- Core product flow:
  - users sign in
  - users create or open trackers
  - trackers manage team, box, graveyard, rules, level caps, rival caps, fossils, and run stats
  - owners can invite members or guests and optionally expose trackers publicly in read-only mode

## Key Directories

- `src/App.tsx`: routing, auth/bootstrap, tracker lifecycle, modal orchestration, and most application state wiring
- `src/components/`: UI components and modal flows
- `src/services/backend/`: Supabase client and authentication abstraction
- `src/services/repos/`: profile and tracker repositories, realtime subscriptions, RPC calls, and row-to-domain mapping
- `src/services/`: tracker/ruleset operations, search helpers, sprite resolution, and state initialization
- `src/data/`: static and generated data such as game versions, rulesets, Pokemon names, type data, and evolutions
- `src/locales/`: translation dictionaries for German and English
- `src/types/database.ts`: generated Supabase database types
- `supabase/migrations/`: PostgreSQL schema, functions, triggers, RLS policies, grants, and realtime configuration
- `supabase/seed.sql`: deterministic local development data
- `public/`: static images, fonts, sprite assets, and the service worker
- `types.ts`: shared domain types for trackers, rulesets, Pokemon links, stats, and user settings

## Runtime and Commands

- Install dependencies: `npm install`
- Start the app: `npm run dev`
- Start local Supabase: `npm run supabase:start`
- Stop local Supabase: `npm run supabase:stop`
- Reset and reseed local Supabase: `npm run supabase:reset`
- Run database tests: `npm run supabase:test`
- Regenerate database types: `npm run supabase:types`
- Create a database migration: `npm run supabase:migration:new -- <name>`
- Create a production build: `npm run build`
- Preview the build: `npm run preview`
- Format the repo: `npm run prettier`
- Check formatting: `npm run prettier:check`
- Regenerate Pokemon datasets from PokeAPI: `npm run generate-pokemon`

## Environment Notes

- Local development is expected to use the local Supabase stack.
- Copy `.env.example` to `.env` for local work.
- Production builds require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Only the Supabase URL and publishable/anon key belong in the Vite client environment. Never expose the service-role key or database password.
- The browser client is created lazily in `src/services/backend/supabase.ts`.

## Data Model

- `auth.users`: Supabase Auth identities and sessions.
- `public.profiles`: application profile and user preferences, keyed by the Auth user UUID.
- `public.trackers`: tracker metadata such as title, players, game version, ruleset, and public visibility.
- `public.tracker_members`: owner/editor/guest membership and per-user tracker settings.
- `public.tracker_states`: JSONB tracker state plus schema version, optimistic-lock revision, and computed summary.
- `public.rulesets`: user-owned custom rulesets, keyed by `(owner_id, id)`.
- Tracker creation, invitations, member removal, and revision-aware state updates use PostgreSQL RPC functions.
- Supabase Realtime subscriptions keep tracker metadata, membership, state, and rulesets synchronized.
- Row Level Security and grants are the authorization boundary. Public trackers are selectable anonymously; guests remain read-only.

When changing tracker shape, add a database migration, update state schema/version handling, regenerate `src/types/database.ts`, and update default-state helpers. The main normalization logic currently lives in `src/services/init.ts` and `src/App.tsx`.
Runtime sanitization should only be used as a last resort. Prefer an idempotent SQL/data migration for existing rows.

## Localization Rules

- The UI supports German and English.
- Prefer translation keys over inline user-facing strings.
- When adding or changing UI copy, update both `src/locales/de.ts` and `src/locales/en.ts`.
- Keep labels, button text, and validation messages aligned across both locales.

## Coding Conventions

- Prefer functional React components and typed props.
- Extend `types.ts` or local interfaces instead of introducing `any`.
- Use the `@/` alias for imports from the project root.
- Keep data-fetching and Supabase mutation logic in `src/services/` rather than inside UI components.
- Use the generated database types and repository mappers rather than passing Supabase rows directly into UI state.
- Preserve optimistic concurrency through the `tracker_states.revision` flow.
- Reuse existing helpers for sanitizing player names, rules, tags, and state shape.
- Preserve read-only behavior for public trackers and guest users.

## Product-Specific Guardrails

- Game version data in `src/data/game-versions.ts` drives badges, level caps, rival caps, and generation limits.
- Rulesets can be presets or user-owned custom entries; do not treat presets as editable.
- Tracker creation and membership management are implemented in `src/services/trackers.ts`.
- Ruleset persistence is implemented in `src/services/rulesets.ts`.
- Tracker persistence and realtime subscriptions are implemented in `src/services/repos/supabaseTrackerRepository.ts`.
- Profile persistence is implemented in `src/services/repos/profileRepository.ts`.
- Local demo data is maintained in `supabase/seed.sql`; keep it deterministic and compatible with the latest migrations.
- Do not bypass RLS with client-side assumptions or add service-role credentials to frontend code.
- Generated Pokemon datasets in `src/data/` should be regenerated by script when possible instead of edited manually.

## Validation Checklist

- Run `npm run build` after meaningful code changes.
- Run `npm run prettier:check` if formatting might be affected.
- Run `npm run supabase:test` after changing migrations, RLS policies, grants, triggers, or RPC functions.
- Run `npm run supabase:types` after changing the database schema and commit the generated type changes.
