begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(48);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'trackers', 'trackers table exists');
select has_table('public', 'tracker_members', 'tracker_members table exists');
select has_table('public', 'tracker_states', 'tracker_states table exists');
select has_table('public', 'rulesets', 'rulesets table exists');

select col_type_is(
  'public',
  'profiles',
  'multi_locale_search',
  'boolean',
  'multi-locale search is a typed profile preference'
);
select col_type_is(
  'public',
  'profiles',
  'display_name',
  'text',
  'display names are typed profile data'
);
select col_type_is(
  'public',
  'profiles',
  'display_name_requires_update',
  'boolean',
  'display-name onboarding state is explicit profile data'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000010',
    'authenticated', 'authenticated', 'chosen@example.com', '',
    '{}'::jsonb, '{"display_name":"Chosen Trainer"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000011',
    'authenticated', 'authenticated', 'fallback@example.com', '',
    '{}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

select is(
  (select display_name from public.profiles where id = '10000000-0000-4000-8000-000000000010'),
  'Chosen Trainer',
  'Auth signup metadata becomes the profile display name'
);
select is(
  (select display_name_requires_update from public.profiles where id = '10000000-0000-4000-8000-000000000010'),
  false,
  'a chosen signup display name does not require onboarding'
);
select is(
  (select display_name from public.profiles where id = '10000000-0000-4000-8000-000000000011'),
  'fallback',
  'missing signup metadata falls back to the email prefix'
);
select is(
  (select display_name_requires_update from public.profiles where id = '10000000-0000-4000-8000-000000000011'),
  true,
  'an automatically generated display name requires onboarding'
);
select col_type_is('public', 'trackers', 'id', 'uuid', 'tracker IDs are UUIDs');
select has_index(
  'public',
  'tracker_members',
  'tracker_one_owner',
  'trackers have a unique partial owner index'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.trackers'::regclass),
  'trackers has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tracker_members'::regclass),
  'tracker_members has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tracker_states'::regclass),
  'tracker_states has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.rulesets'::regclass),
  'rulesets has RLS enabled'
);

select is(
  private.compute_tracker_summary('{"team":[{}],"stats":{"runs":2,"deaths":[1,2]},"levelCaps":[],"rivalCaps":[]}'::jsonb) ->> 'teamCount',
  '1',
  'tracker summary counts team entries'
);
select is(
  (
    select state ->> 'nicknamesEnabled'
    from public.tracker_states
    where tracker_id = '30000000-0000-0000-0000-000000000001'
  ),
  'true',
  'seed data mirrors the emulator nickname default'
);
select is(
  (
    select multi_locale_search
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000001'
  ),
  true,
  'seed data covers enabled multi-locale search'
);
select is(
  (
    select display_name
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000001'
  ),
  'Test Trainer',
  'seed data includes a display name'
);
select ok(
  (
    select bool_and(owner_count = 1)
    from (
      select tracker.id, count(member.user_id) as owner_count
      from public.trackers as tracker
      left join public.tracker_members as member
        on member.tracker_id = tracker.id and member.role = 'owner'
      group by tracker.id
    ) as owner_counts
  ),
  'every seeded tracker has exactly one owner'
);

set local role anon;
select is(
  (select count(*) from public.trackers),
  1::bigint,
  'anonymous users see public trackers only'
);
select is(
  (
    select count(*)
    from public.tracker_states
    where tracker_id = '30000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'anonymous users cannot see private tracker state'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*) from public.trackers),
  1::bigint,
  'an unrelated user sees only the public tracker'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is(
  (
    select count(*)
    from public.trackers
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'an editor can read their tracker'
);
select is(
  (
    select display_name
    from public.list_tracker_members('30000000-0000-0000-0000-000000000001')
    where user_id = '10000000-0000-0000-0000-000000000001'
  ),
  'Test Trainer',
  'a tracker member can read participant display names through the RPC'
);
select is(
  (
    select email
    from public.list_tracker_members('30000000-0000-0000-0000-000000000001')
    where user_id = '10000000-0000-0000-0000-000000000001'
  ),
  null::text,
  'an editor cannot read participant email addresses'
);
select lives_ok(
  $$select public.update_tracker_state(
    '30000000-0000-0000-0000-000000000001',
    8,
    (select state || '{"hardcoreModeEnabled":true}'::jsonb
     from public.tracker_states
     where tracker_id = '30000000-0000-0000-0000-000000000001')
  )$$,
  'an editor can update tracker state through the RPC'
);
select is(
  (
    select revision
    from public.tracker_states
    where tracker_id = '30000000-0000-0000-0000-000000000001'
  ),
  9::bigint,
  'state RPC increments the revision'
);
select throws_ok(
  $$select public.update_tracker_state(
    '30000000-0000-0000-0000-000000000001',
    8,
    (select state from public.tracker_states
     where tracker_id = '30000000-0000-0000-0000-000000000001')
  )$$,
  '40001',
  'state_revision_conflict',
  'a stale revision is rejected'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is(
  (
    select count(*)
    from public.tracker_states
    where tracker_id = '30000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'a guest can read tracker state'
);
select throws_ok(
  $$select public.update_tracker_state(
    '30000000-0000-0000-0000-000000000001',
    9,
    (select state from public.tracker_states
     where tracker_id = '30000000-0000-0000-0000-000000000001')
  )$$,
  '42501',
  'tracker_write_access_required',
  'a guest cannot update tracker state'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(
  (
    select email
    from public.list_tracker_members('30000000-0000-0000-0000-000000000001')
    where user_id = '10000000-0000-0000-0000-000000000002'
  ),
  'editor@example.com',
  'the owner can read participant email addresses'
);
select lives_ok(
  $$select public.set_tracker_visibility(
    '30000000-0000-0000-0000-000000000001',
    false
  )$$,
  'an owner can change public visibility'
);
select is(
  (
    select is_public
    from public.trackers
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  false,
  'visibility RPC persists the owner choice'
);
select throws_ok(
  $$select public.remove_tracker_member(
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  )$$,
  '22023',
  'tracker_owner_cannot_be_removed',
  'the owner cannot remove themselves'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.remove_tracker_member(
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003'
  )$$,
  '42501',
  'tracker_owner_required',
  'an editor cannot remove another member'
);
select lives_ok(
  $$select public.remove_tracker_member(
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  )$$,
  'an editor can leave a tracker'
);
select is(
  (
    select count(*)
    from public.tracker_members
    where tracker_id = '30000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'leaving removes the editor membership'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select public.remove_tracker_member(
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003'
  )$$,
  'a guest can leave a tracker'
);
select is(
  (
    select count(*)
    from public.tracker_members
    where tracker_id = '30000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000003'
  ),
  0::bigint,
  'leaving removes the guest membership'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.rulesets),
  1::bigint,
  'a user sees their own custom rulesets'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*) from public.rulesets),
  0::bigint,
  'an unrelated user cannot see another user rulesets'
);
select is(
  has_column_privilege(
    'authenticated',
    'public.trackers',
    'is_public',
    'update'
  ),
  false,
  'clients have no direct update grant for public visibility'
);
select ok(
  has_column_privilege(
    'authenticated',
    'public.profiles',
    'display_name',
    'update'
  ),
  'users can update their own display name'
);

reset role;
select * from finish();
rollback;
