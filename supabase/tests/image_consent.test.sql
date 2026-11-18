begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(20);

select col_type_is('public', 'profiles', 'allow_image_loading', 'boolean', 'image consent is a boolean');
select col_is_null('public', 'profiles', 'allow_image_loading', 'image consent allows an undecided state');
select ok(not has_column_privilege('anon', 'public.profiles', 'allow_image_loading', 'UPDATE'), 'anonymous users cannot update account consent');
select ok(has_column_privilege('authenticated', 'public.profiles', 'allow_image_loading', 'UPDATE'), 'authenticated users can update consent');
select col_type_is('public', 'profiles', 'image_consent_updated_at', 'timestamp with time zone', 'consent time has a time zone');
select col_is_null('public', 'profiles', 'image_consent_updated_at', 'consent time allows an unknown state');
select ok(not has_column_privilege('anon', 'public.profiles', 'image_consent_updated_at', 'UPDATE'), 'anonymous users cannot change consent time');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'image_consent_updated_at', 'UPDATE'), 'accounts cannot supply a consent time');

insert into auth.users (id, email, raw_user_meta_data)
values ('10000000-0000-4000-8000-000000000090', 'image-consent@example.com', '{"display_name":"Consent Test"}');
select is((select allow_image_loading from public.profiles where id = '10000000-0000-4000-8000-000000000090'), null::boolean, 'new profiles have no consent by default');
select is((select image_consent_updated_at from public.profiles where id = '10000000-0000-4000-8000-000000000090'), null::timestamptz, 'new profiles have no invented consent time');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000090', true);
set local role authenticated;
with changed as (
  update public.profiles set allow_image_loading = false where id = '10000000-0000-4000-8000-000000000090' returning image_consent_updated_at
)
select is((select image_consent_updated_at from changed), statement_timestamp(), 'decline records the database statement time');
select is((select allow_image_loading from public.profiles where id = '10000000-0000-4000-8000-000000000090'), false, 'owners can decline images');
with changed as (
  update public.profiles set allow_image_loading = true where id = '10000000-0000-4000-8000-000000000090' returning image_consent_updated_at
)
select is((select image_consent_updated_at from changed), statement_timestamp(), 'allow records the database statement time');
select is((select allow_image_loading from public.profiles where id = '10000000-0000-4000-8000-000000000090'), true, 'owners can allow images');
select throws_ok(
  $$update public.profiles set image_consent_updated_at = '2000-01-01' where id = '10000000-0000-4000-8000-000000000090'$$,
  '42501', 'permission denied for table profiles', 'accounts cannot forge the timestamp'
);
with changed as (
  update public.profiles set allow_image_loading = true
  where id <> '10000000-0000-4000-8000-000000000090' returning id
)
select is((select count(*) from changed), 0::bigint, 'RLS prevents changing another account consent');
reset role;

-- A distinguishable timestamp makes preservation observable within a transaction.
update public.profiles set image_consent_updated_at = '2000-01-01 00:00:00+00'
where id = '10000000-0000-4000-8000-000000000090';
set local role authenticated;
update public.profiles set display_name = 'Renamed', last_login_at = now()
where id = '10000000-0000-4000-8000-000000000090';
select is((select image_consent_updated_at from public.profiles where id = '10000000-0000-4000-8000-000000000090'), '2000-01-01 00:00:00+00'::timestamptz, 'other profile edits preserve consent time');
with changed as (
  update public.profiles set allow_image_loading = true
  where id = '10000000-0000-4000-8000-000000000090' returning image_consent_updated_at
)
select is((select image_consent_updated_at from changed), statement_timestamp(), 'an explicit repeated choice renews the timestamp');
with changed as (
  update public.profiles set allow_image_loading = false
  where id = '10000000-0000-4000-8000-000000000090' returning image_consent_updated_at
)
select is((select image_consent_updated_at from changed), statement_timestamp(), 'withdrawal replaces the latest decision time');
update public.profiles set allow_image_loading = null
where id = '10000000-0000-4000-8000-000000000090';
select is((select image_consent_updated_at from public.profiles where id = '10000000-0000-4000-8000-000000000090'), null::timestamptz, 'undecided consent has no timestamp');
reset role;

select * from finish();
rollback;
