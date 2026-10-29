-- Version 3 adds optional deathPlayerIndex to dead links. Existing links keep
-- an absent attribution: historical counters cannot identify who caused a death.
-- The restore flow asks for that player instead of guessing from aggregate stats.
update public.tracker_states
set schema_version = 3,
    revision = revision + 1,
    updated_at = now()
where schema_version < 3;

alter table public.tracker_states
  alter column schema_version set default 3;

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
      schema_version = 3,
      revision = revision + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where tracker_id = p_tracker_id
    and revision = p_expected_revision
  returning * into updated_state;

  if updated_state is null then
    raise sqlstate 'PT409' using message = 'state_revision_conflict';
  end if;
  return updated_state;
end;
$$;
