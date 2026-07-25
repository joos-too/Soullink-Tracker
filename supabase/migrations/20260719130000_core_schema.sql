create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create type public.tracker_role as enum ('owner', 'editor', 'guest');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  firebase_uid text unique,
  display_name text not null,
  display_name_requires_update boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  use_generation_sprites boolean not null default false,
  use_sprites_in_team_table boolean not null default false,
  wiki_id text,
  multi_locale_search boolean not null default false,
  constraint profiles_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint profiles_display_name_length check (char_length(display_name) <= 50)
);

create table public.trackers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  player_names text[] not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  game_version_id text not null,
  is_public boolean not null default false,
  all_pokemon_and_items boolean not null default false,
  ruleset_id text,
  constraint trackers_title_not_blank check (length(btrim(title)) > 0),
  constraint trackers_player_count check (cardinality(player_names) between 1 and 3),
  constraint trackers_player_names_not_blank check (
    array_position(player_names, '') is null
    and array_position(player_names, null) is null
  ),
  constraint trackers_game_version_not_blank check (
    length(btrim(game_version_id)) > 0
  )
);

create index trackers_by_creator on public.trackers (created_by, created_at desc);

create table public.tracker_members (
  tracker_id uuid not null references public.trackers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.tracker_role not null,
  added_at timestamptz not null default now(),
  settings jsonb not null default '{}'::jsonb,
  primary key (tracker_id, user_id),
  constraint tracker_member_settings_object check (
    jsonb_typeof(settings) = 'object'
  )
);

create unique index tracker_one_owner
  on public.tracker_members (tracker_id)
  where role = 'owner';

create index tracker_members_by_user
  on public.tracker_members (user_id, tracker_id);

create table public.tracker_states (
  tracker_id uuid primary key references public.trackers (id) on delete cascade,
  state jsonb not null,
  schema_version integer not null default 1,
  revision bigint not null default 1,
  summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint tracker_state_object check (jsonb_typeof(state) = 'object'),
  constraint tracker_state_has_no_relational_metadata check (
    not state ?| array['playerNames', 'rulesetId']
  ),
  constraint tracker_state_schema_version_positive check (schema_version > 0),
  constraint tracker_state_revision_positive check (revision > 0),
  constraint tracker_summary_object check (jsonb_typeof(summary) = 'object')
);

create table public.rulesets (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  rules text[] not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  constraint ruleset_id_not_blank check (length(btrim(id)) > 0),
  constraint ruleset_name_not_blank check (length(btrim(name)) > 0)
);
