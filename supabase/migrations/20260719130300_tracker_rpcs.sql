create or replace function public.create_tracker(
  p_title text,
  p_player_names text[],
  p_game_version_id text,
  p_all_pokemon_and_items boolean,
  p_ruleset_id text,
  p_initial_state jsonb,
  p_invites jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  new_tracker_id uuid;
  invite jsonb;
  invite_email text;
  invite_role public.tracker_role;
  invite_user_id uuid;
  seen_emails text[] := '{}';
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if nullif(btrim(p_title), '') is null
    or cardinality(p_player_names) not between 1 and 3
    or exists (select 1 from unnest(p_player_names) as name where nullif(btrim(name), '') is null)
    or nullif(btrim(p_game_version_id), '') is null
    or jsonb_typeof(p_initial_state) <> 'object'
    or p_initial_state ?| array['playerNames', 'rulesetId']
    or jsonb_typeof(p_invites) <> 'array'
  then
    raise exception using errcode = '22023', message = 'invalid_tracker_input';
  end if;

  insert into public.trackers (
    title, player_names, created_by, game_version_id,
    all_pokemon_and_items, ruleset_id
  )
  values (
    btrim(p_title),
    array(select btrim(name) from unnest(p_player_names) as name),
    caller_id,
    btrim(p_game_version_id),
    coalesce(p_all_pokemon_and_items, false),
    nullif(btrim(p_ruleset_id), '')
  )
  returning id into new_tracker_id;

  insert into public.tracker_members (tracker_id, user_id, role)
  values (new_tracker_id, caller_id, 'owner');

  for invite in select value from jsonb_array_elements(p_invites)
  loop
    invite_email := lower(btrim(invite ->> 'email'));
    if invite_email = '' or invite_email = any(seen_emails) then
      raise exception using errcode = '22023', message = 'invalid_or_duplicate_invite';
    end if;
    seen_emails := array_append(seen_emails, invite_email);

    begin
      invite_role := (invite ->> 'role')::public.tracker_role;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'invalid_invite_role';
    end;
    if invite_role not in ('editor', 'guest') then
      raise exception using errcode = '22023', message = 'invalid_invite_role';
    end if;

    select app_user.id into invite_user_id
    from auth.users as app_user
    where lower(app_user.email) = invite_email
    limit 1;
    if invite_user_id is null then
      raise exception using errcode = 'P0001', message = 'invite_user_not_found';
    end if;
    if invite_user_id = caller_id then
      raise exception using errcode = '22023', message = 'owner_cannot_be_invited';
    end if;

    insert into public.tracker_members (tracker_id, user_id, role)
    values (new_tracker_id, invite_user_id, invite_role);
  end loop;

  insert into public.tracker_states (tracker_id, state, updated_by)
  values (new_tracker_id, p_initial_state, caller_id);

  return new_tracker_id;
end;
$$;

create or replace function public.invite_tracker_member(
  p_tracker_id uuid,
  p_email text,
  p_role public.tracker_role
)
returns public.tracker_members
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_user_id uuid;
  inserted_member public.tracker_members;
begin
  if not private.is_tracker_owner(p_tracker_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'tracker_owner_required';
  end if;
  if p_role not in ('editor', 'guest') then
    raise exception using errcode = '22023', message = 'invalid_invite_role';
  end if;

  select app_user.id into target_user_id
  from auth.users as app_user
  where lower(app_user.email) = lower(btrim(p_email))
  limit 1;
  if target_user_id is null then
    raise exception using errcode = 'P0001', message = 'invite_user_not_found';
  end if;

  insert into public.tracker_members (tracker_id, user_id, role)
  values (p_tracker_id, target_user_id, p_role)
  on conflict (tracker_id, user_id) do nothing
  returning * into inserted_member;
  if inserted_member is null then
    raise exception using errcode = '23505', message = 'tracker_member_exists';
  end if;
  return inserted_member;
end;
$$;

create or replace function public.remove_tracker_member(
  p_tracker_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  target_role public.tracker_role;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if caller_id <> p_user_id
    and not private.is_tracker_owner(p_tracker_id, caller_id)
  then
    raise exception using errcode = '42501', message = 'tracker_owner_required';
  end if;

  select role into target_role
  from public.tracker_members
  where tracker_id = p_tracker_id and user_id = p_user_id;

  if target_role is null then
    raise exception using errcode = 'P0002', message = 'tracker_member_not_found';
  end if;

  if target_role = 'owner' then
    raise exception using errcode = '22023', message = 'tracker_owner_cannot_be_removed';
  end if;

  delete from public.tracker_members
  where tracker_id = p_tracker_id and user_id = p_user_id;
end;
$$;

create or replace function public.delete_tracker(p_tracker_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not private.is_tracker_owner(p_tracker_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'tracker_owner_required';
  end if;
  delete from public.trackers where id = p_tracker_id;
end;
$$;

create or replace function public.set_tracker_visibility(
  p_tracker_id uuid,
  p_is_public boolean
)
returns public.trackers
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  updated_tracker public.trackers;
begin
  if not private.is_tracker_owner(p_tracker_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'tracker_owner_required';
  end if;
  update public.trackers
  set is_public = coalesce(p_is_public, false)
  where id = p_tracker_id
  returning * into updated_tracker;
  return updated_tracker;
end;
$$;

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
  then
    raise exception using errcode = '22023', message = 'invalid_tracker_state';
  end if;

  update public.tracker_states
  set state = p_state,
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

create or replace function public.list_tracker_members(p_tracker_id uuid)
returns table (
  user_id uuid,
  display_name text,
  email text,
  role public.tracker_role,
  added_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_owner boolean;
begin
  if not private.is_tracker_reader(p_tracker_id, caller_id) then
    raise exception using errcode = '42501', message = 'tracker_read_access_required';
  end if;

  caller_is_owner := private.is_tracker_owner(p_tracker_id, caller_id);

  return query
  select
    member.user_id,
    profile.display_name,
    case when caller_is_owner then auth_user.email::text else null end,
    member.role,
    member.added_at
  from public.tracker_members as member
  join public.profiles as profile on profile.id = member.user_id
  join auth.users as auth_user on auth_user.id = member.user_id
  where member.tracker_id = p_tracker_id
  order by member.added_at;
end;
$$;

revoke all on function public.create_tracker(text, text[], text, boolean, text, jsonb, jsonb) from public;
revoke all on function public.invite_tracker_member(uuid, text, public.tracker_role) from public;
revoke all on function public.remove_tracker_member(uuid, uuid) from public;
revoke all on function public.delete_tracker(uuid) from public;
revoke all on function public.set_tracker_visibility(uuid, boolean) from public;
revoke all on function public.update_tracker_state(uuid, bigint, jsonb) from public;
revoke all on function public.list_tracker_members(uuid) from public;

grant execute on function public.create_tracker(text, text[], text, boolean, text, jsonb, jsonb) to authenticated;
grant execute on function public.invite_tracker_member(uuid, text, public.tracker_role) to authenticated;
grant execute on function public.remove_tracker_member(uuid, uuid) to authenticated;
grant execute on function public.delete_tracker(uuid) to authenticated;
grant execute on function public.set_tracker_visibility(uuid, boolean) to authenticated;
grant execute on function public.update_tracker_state(uuid, bigint, jsonb) to authenticated;
grant execute on function public.list_tracker_members(uuid) to authenticated;
