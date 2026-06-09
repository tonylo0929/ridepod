-- Run this in the Supabase SQL Editor for RidePod account-name login.

alter table profiles
  add column if not exists account_name text;

update profiles
set account_name = lower(regexp_replace(coalesce(account_name, split_part(email, '@', 1), 'rider'), '[^a-z0-9._]+', '_', 'g'))
where account_name is null;

create unique index if not exists profiles_account_name_unique_idx
  on profiles (lower(account_name))
  where account_name is not null;

create or replace function public.resolve_account_login(account_name_input text)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  normalized_account_name text := lower(trim(account_name_input));
  resolved_email text;
begin
  select p.email
  into resolved_email
  from public.profiles p
  where lower(p.account_name) = normalized_account_name
     or lower(p.display_name) = normalized_account_name
  limit 1;

  if resolved_email is not null then
    return resolved_email;
  end if;

  select u.email
  into resolved_email
  from auth.users u
  where lower(u.raw_user_meta_data ->> 'account_name') = normalized_account_name
     or lower(u.raw_user_meta_data ->> 'display_name') = normalized_account_name
  limit 1;

  return resolved_email;
end;
$$;

grant execute on function public.resolve_account_login(text) to anon, authenticated;

comment on column profiles.account_name is 'RidePod account name used for username-style login.';
comment on function public.resolve_account_login(text) is 'Resolves a RidePod account name to the auth email used by Supabase login.';
