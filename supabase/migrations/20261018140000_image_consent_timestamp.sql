alter table public.profiles
  add column image_consent_updated_at timestamptz;

comment on column public.profiles.image_consent_updated_at is
  'Server time of the latest explicit external image decision, including decline or withdrawal. No decision history or text version is stored.';

-- Do not invent consent times for any existing choices.
create function private.stamp_image_consent()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.image_consent_updated_at := case
    when new.allow_image_loading is null then null
    else statement_timestamp()
  end;
  return new;
end;
$$;

revoke all on function private.stamp_image_consent() from public, anon, authenticated;

create trigger profiles_stamp_image_consent
before insert or update of allow_image_loading on public.profiles
for each row execute function private.stamp_image_consent();

-- The existing column-level grants allow changing the choice, not its timestamp.
alter table public.profiles
  add constraint profiles_undecided_image_consent_has_no_timestamp
  check (allow_image_loading is not null or image_consent_updated_at is null);
