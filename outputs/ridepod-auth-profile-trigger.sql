-- Run this in Supabase SQL Editor.
-- It creates/repairs public.profiles rows from auth.users without the client fighting RLS.

alter table public.profiles
  add column if not exists account_name text;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  next_account_name text;
  next_display_name text;
begin
  next_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'account_name'), ''),
    split_part(new.email, '@', 1),
    'RidePod user'
  );

  next_account_name := lower(regexp_replace(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'account_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1),
    'rider'
  ), '[^a-z0-9._]+', '_', 'g'));

  insert into public.profiles (
    id,
    account_name,
    display_name,
    email,
    updated_at
  )
  values (
    new.id,
    next_account_name,
    next_display_name,
    new.email,
    now()
  )
  on conflict (id) do update
  set
    account_name = coalesce(public.profiles.account_name, excluded.account_name),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_profile_from_auth_user_on_insert on auth.users;
create trigger sync_profile_from_auth_user_on_insert
after insert or update of email, raw_user_meta_data
on auth.users
for each row
execute function public.sync_profile_from_auth_user();

insert into public.profiles (id, account_name, display_name, email, updated_at)
select
  u.id,
  lower(regexp_replace(coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'account_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    split_part(u.email, '@', 1),
    'rider'
  ), '[^a-z0-9._]+', '_', 'g')) as account_name,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'account_name'), ''),
    split_part(u.email, '@', 1),
    'RidePod user'
  ) as display_name,
  u.email,
  now()
from auth.users u
on conflict (id) do update
set
  account_name = coalesce(public.profiles.account_name, excluded.account_name),
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  email = excluded.email,
  updated_at = now();
