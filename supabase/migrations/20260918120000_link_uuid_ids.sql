create or replace function private.deterministic_link_uuid(
  p_tracker_id uuid,
  p_collection text,
  p_ordinal bigint
)
returns uuid
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  hash text := encode(
    extensions.digest(
      p_tracker_id::text || ':' || p_collection || ':' || p_ordinal::text,
      'sha1'
    ),
    'hex'
  );
begin
  return (
    substr(hash, 1, 8) || '-' ||
    substr(hash, 9, 4) || '-' ||
    '5' || substr(hash, 14, 3) || '-' ||
    '8' || substr(hash, 18, 3) || '-' ||
    substr(hash, 21, 12)
  )::uuid;
end;
$$;

create or replace function private.migrate_tracker_link_ids(
  p_tracker_id uuid,
  p_state jsonb
)
returns jsonb
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  result jsonb := p_state;
  collection text;
  migrated_links jsonb;
begin
  foreach collection in array array['team', 'box', 'graveyard']
  loop
    if jsonb_typeof(p_state -> collection) = 'array' then
      select coalesce(
        jsonb_agg(
          case
            when jsonb_typeof(link.value) = 'object' then
              (link.value - 'id') || jsonb_build_object(
                'id',
                private.deterministic_link_uuid(
                  p_tracker_id,
                  collection,
                  link.ordinality
                )::text
              )
            else link.value
          end
          order by link.ordinality
        ),
        '[]'::jsonb
      )
      into migrated_links
      from jsonb_array_elements(p_state -> collection)
        with ordinality as link(value, ordinality);

      result := jsonb_set(result, array[collection], migrated_links, true);
    end if;
  end loop;

  return result;
end;
$$;

create or replace function private.tracker_link_ids_are_valid(p_state jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  collection text;
  link jsonb;
  link_id text;
  seen_ids text[] := '{}';
begin
  foreach collection in array array['team', 'box', 'graveyard']
  loop
    if not p_state ? collection then
      continue;
    end if;
    if jsonb_typeof(p_state -> collection) <> 'array' then
      return false;
    end if;

    for link in select value from jsonb_array_elements(p_state -> collection)
    loop
      if jsonb_typeof(link) <> 'object' then
        return false;
      end if;
      link_id := link ->> 'id';
      if link_id is null
        or link_id <> lower(link_id)
        or link_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or link_id = any(seen_ids)
      then
        return false;
      end if;
      seen_ids := array_append(seen_ids, link_id);
    end loop;
  end loop;

  return true;
end;
$$;

update public.tracker_states
set state = private.migrate_tracker_link_ids(tracker_id, state),
    schema_version = 2,
    revision = revision + 1,
    updated_at = now()
where schema_version < 2;

alter table public.tracker_states
  alter column schema_version set default 2;

alter table public.tracker_states
  add constraint tracker_state_link_ids_are_valid
  check (private.tracker_link_ids_are_valid(state));

create or replace function public.update_tracker_state(
  p_tracker_id uuid,
  p_expected_revision bigint,
  p_state jsonb
)
returns public.tracker_states
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  updated_state public.tracker_states;
begin
  if not private.is_tracker_writer(p_tracker_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'tracker_write_access_required';
  end if;
  if jsonb_typeof(p_state) <> 'object'
    or p_state ?| array['playerNames', 'rulesetId']
    or not private.tracker_link_ids_are_valid(p_state)
  then
    raise exception using errcode = '22023', message = 'invalid_tracker_state';
  end if;

  update public.tracker_states
  set state = p_state,
      schema_version = 2,
      revision = revision + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where tracker_id = p_tracker_id
    and revision = p_expected_revision
  returning * into updated_state;

  if updated_state is null then
    raise exception using errcode = '40001', message = 'state_revision_conflict';
  end if;
  return updated_state;
end;
$$;
