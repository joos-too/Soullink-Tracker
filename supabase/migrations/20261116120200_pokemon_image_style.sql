create type public.pokemon_image_style as enum ('artwork', 'mixed', 'sprites');

alter table public.profiles
  add column pokemon_image_style public.pokemon_image_style not null default 'mixed';

update public.profiles
set pokemon_image_style = 'sprites'
where use_sprites_in_team_table;

alter table public.profiles
  drop column use_sprites_in_team_table;

grant update (pokemon_image_style) on public.profiles to authenticated;
