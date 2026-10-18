alter table public.profiles
  add column allow_image_loading boolean default null;

comment on column public.profiles.allow_image_loading is
  'External image consent: NULL = undecided, false = declined, true = allowed.';

grant update (allow_image_loading) on public.profiles to authenticated;
