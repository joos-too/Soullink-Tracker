begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

select col_type_is('public', 'profiles', 'allow_image_loading', 'boolean', 'image consent is a boolean');
select col_is_null('public', 'profiles', 'allow_image_loading', 'image consent allows an undecided state');
select ok(not has_column_privilege('anon', 'public.profiles', 'allow_image_loading', 'UPDATE'), 'anonymous users cannot update account consent');
select ok(has_column_privilege('authenticated', 'public.profiles', 'allow_image_loading', 'UPDATE'), 'authenticated users can update consent');

insert into auth.users (id, email, raw_user_meta_data)
values ('10000000-0000-4000-8000-000000000090', 'image-consent@example.com', '{"display_name":"Consent Test"}');
select is((select allow_image_loading from public.profiles where id = '10000000-0000-4000-8000-000000000090'), null::boolean, 'new profiles have no consent by default');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000090', true);
set local role authenticated;
update public.profiles set allow_image_loading = false where id = '10000000-0000-4000-8000-000000000090';
select is((select allow_image_loading from public.profiles where id = '10000000-0000-4000-8000-000000000090'), false, 'owners can decline images');
update public.profiles set allow_image_loading = true where id = '10000000-0000-4000-8000-000000000090';
select is((select allow_image_loading from public.profiles where id = '10000000-0000-4000-8000-000000000090'), true, 'owners can allow images');
with changed as (
  update public.profiles set allow_image_loading = true
  where id <> '10000000-0000-4000-8000-000000000090' returning id
)
select is((select count(*) from changed), 0::bigint, 'RLS prevents changing another account consent');
reset role;

select * from finish();
rollback;
