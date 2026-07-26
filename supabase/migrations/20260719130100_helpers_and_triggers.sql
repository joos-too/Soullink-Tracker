create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trackers_touch_updated_at
before update on public.trackers
for each row execute function private.touch_updated_at();

create trigger rulesets_touch_updated_at
before update on public.rulesets
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  requested_display_name text;
  resolved_display_name text;
begin
  requested_display_name := nullif(
    btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')),
    ''
  );
  resolved_display_name := left(
    coalesce(
      requested_display_name,
      nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'Trainer'
    ),
    50
  );

  insert into public.profiles (
    id,
    display_name,
    display_name_requires_update,
    created_at,
    last_login_at
  )
  values (
    new.id,
    resolved_display_name,
    requested_display_name is null,
    coalesce(new.created_at, now()),
    coalesce(new.last_sign_in_at, new.created_at, now())
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created_create_profile
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.is_tracker_reader(
  p_tracker_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.tracker_members as member
    where member.tracker_id = p_tracker_id
      and member.user_id = p_user_id
  );
$$;

create or replace function private.is_tracker_writer(
  p_tracker_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.tracker_members as member
    where member.tracker_id = p_tracker_id
      and member.user_id = p_user_id
      and member.role in ('owner', 'editor')
  );
$$;

create or replace function private.is_tracker_owner(
  p_tracker_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.tracker_members as member
    where member.tracker_id = p_tracker_id
      and member.user_id = p_user_id
      and member.role = 'owner'
  );
$$;

create or replace function private.compute_tracker_summary(p_state jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  with normalized as (
    select
      case when jsonb_typeof(p_state -> 'team') = 'array'
        then p_state -> 'team' else '[]'::jsonb end as team,
      case when jsonb_typeof(p_state -> 'box') = 'array'
        then p_state -> 'box' else '[]'::jsonb end as box,
      case when jsonb_typeof(p_state -> 'graveyard') = 'array'
        then p_state -> 'graveyard' else '[]'::jsonb end as graveyard,
      case when jsonb_typeof(p_state -> 'levelCaps') = 'array'
        then p_state -> 'levelCaps' else '[]'::jsonb end as level_caps,
      case when jsonb_typeof(p_state -> 'rivalCaps') = 'array'
        then p_state -> 'rivalCaps' else '[]'::jsonb end as rival_caps,
      case when jsonb_typeof(p_state #> '{stats,deaths}') = 'array'
        then p_state #> '{stats,deaths}' else '[]'::jsonb end as deaths,
      case when (p_state #>> '{stats,runs}') ~ '^-?[0-9]+$'
        then greatest((p_state #>> '{stats,runs}')::integer, 0) else 0 end as runs
  ), milestones as (
    select
      n.*,
      (
        select count(*)
        from jsonb_array_elements(n.level_caps) as cap
        where cap ->> 'done' = 'true'
      ) as done_caps,
      (
        select coalesce(sum(
          case when (cap ->> 'id') ~ '^[0-9]+$' and (cap ->> 'id')::integer >= 9
            then 0.6 else 1.5 end
        ), 0)
        from jsonb_array_elements(n.level_caps) as cap
      ) + 0.75 * jsonb_array_length(n.rival_caps) as total_weight,
      (
        select coalesce(sum(
          case when (cap ->> 'id') ~ '^[0-9]+$' and (cap ->> 'id')::integer >= 9
            then 0.6 else 1.5 end
        ) filter (where cap ->> 'done' = 'true'), 0)
        from jsonb_array_elements(n.level_caps) as cap
      ) + 0.75 * (
        select count(*)
        from jsonb_array_elements(n.rival_caps) as rival
        where rival ->> 'done' = 'true'
      ) as completed_weight
    from normalized as n
  )
  select jsonb_build_object(
    'teamCount', jsonb_array_length(team),
    'boxCount', jsonb_array_length(box),
    'graveyardCount', jsonb_array_length(graveyard),
    'deathCount', (
      select coalesce(sum(
        case when jsonb_typeof(value) = 'number' then (value #>> '{}')::numeric else 0 end
      ), 0)
      from jsonb_array_elements(deaths)
    ),
    'runs', runs,
    'championDone', done_caps > 12,
    'doneCapsCount', done_caps,
    'progressPct', case
      when jsonb_array_length(level_caps) > 0 and done_caps = jsonb_array_length(level_caps)
        then 100
      when total_weight > 0 then round(completed_weight / total_weight * 100)
      else 0
    end
  )
  from milestones;
$$;

create or replace function private.set_tracker_state_derived_fields()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.summary = private.compute_tracker_summary(new.state);
  return new;
end;
$$;

create trigger tracker_states_compute_summary
before insert or update of state on public.tracker_states
for each row execute function private.set_tracker_state_derived_fields();

create or replace function private.enforce_tracker_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_tracker_id uuid;
  tracker_creator uuid;
  owner_count integer;
  owner_user_id uuid;
begin
  if tg_table_name = 'trackers' then
    target_tracker_id := coalesce(new.id, old.id);
  else
    target_tracker_id := coalesce(new.tracker_id, old.tracker_id);
  end if;

  select tracker.created_by
  into tracker_creator
  from public.trackers as tracker
  where tracker.id = target_tracker_id;

  if not found then
    return null;
  end if;

  select count(*), min(member.user_id::text)::uuid
  into owner_count, owner_user_id
  from public.tracker_members as member
  where member.tracker_id = target_tracker_id
    and member.role = 'owner';

  if owner_count <> 1 or owner_user_id is distinct from tracker_creator then
    raise exception using
      errcode = '23514',
      message = 'tracker_owner_invariant';
  end if;

  return null;
end;
$$;

create constraint trigger trackers_enforce_owner
after insert or update of created_by on public.trackers
deferrable initially deferred
for each row execute function private.enforce_tracker_owner();

create constraint trigger tracker_members_enforce_owner
after insert or update or delete on public.tracker_members
deferrable initially deferred
for each row execute function private.enforce_tracker_owner();
