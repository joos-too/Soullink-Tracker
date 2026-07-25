alter table public.profiles enable row level security;
alter table public.trackers enable row level security;
alter table public.tracker_members enable row level security;
alter table public.tracker_states enable row level security;
alter table public.rulesets enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy trackers_select_authorized
on public.trackers for select
to anon, authenticated
using (
  is_public
  or private.is_tracker_reader(id, (select auth.uid()))
);

create policy trackers_update_writers
on public.trackers for update
to authenticated
using (private.is_tracker_writer(id, (select auth.uid())))
with check (private.is_tracker_writer(id, (select auth.uid())));

create policy tracker_members_select_readers
on public.tracker_members for select
to authenticated
using (private.is_tracker_reader(tracker_id, (select auth.uid())));

create policy tracker_members_update_own_settings
on public.tracker_members for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy tracker_states_select_authorized
on public.tracker_states for select
to anon, authenticated
using (
  exists (
    select 1
    from public.trackers as tracker
    where tracker.id = tracker_id
      and (
        tracker.is_public
        or private.is_tracker_reader(tracker.id, (select auth.uid()))
      )
  )
);

create policy rulesets_select_own
on public.rulesets for select
to authenticated
using (owner_id = (select auth.uid()));

create policy rulesets_insert_own
on public.rulesets for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy rulesets_update_own
on public.rulesets for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy rulesets_delete_own
on public.rulesets for delete
to authenticated
using (owner_id = (select auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.trackers, public.tracker_states to anon;
grant select on public.profiles, public.trackers, public.tracker_members,
  public.tracker_states, public.rulesets to authenticated;
grant update (
  last_login_at,
  display_name,
  display_name_requires_update,
  use_generation_sprites,
  use_sprites_in_team_table,
  wiki_id,
  multi_locale_search
) on public.profiles to authenticated;
grant update (title, player_names, game_version_id, all_pokemon_and_items, ruleset_id)
  on public.trackers to authenticated;
grant update (settings) on public.tracker_members to authenticated;
grant insert, update, delete on public.rulesets to authenticated;

grant usage on schema private to anon, authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.is_tracker_reader(uuid, uuid) to anon, authenticated;
grant execute on function private.is_tracker_writer(uuid, uuid) to authenticated;
grant execute on function private.is_tracker_owner(uuid, uuid) to authenticated;
