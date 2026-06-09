-- RidePod auth, notifications, live updates, and pod chat foundation.
-- RidePod remains taxi-first: no live payment, no real payout, no taxi dispatch.

create extension if not exists pgcrypto;

alter table profiles
  add column if not exists avatar_url text,
  add column if not exists preferred_name text,
  add column if not exists home_district text,
  add column if not exists public_bio text,
  add column if not exists trust_review_status text default 'not_requested',
  add column if not exists updated_at timestamptz default now();

do $$ begin
  alter table profiles
    add constraint profiles_id_auth_users_fk
    foreign key (id) references auth.users(id) on delete cascade not valid;
exception
  when duplicate_object then null;
end $$;

create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  related_pod_id text,
  related_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists user_notifications_recipient_user_id_idx on user_notifications(recipient_user_id);
create index if not exists user_notifications_read_at_idx on user_notifications(read_at);
create index if not exists user_notifications_created_at_idx on user_notifications(created_at desc);
create index if not exists user_notifications_related_pod_id_idx on user_notifications(related_pod_id);
create index if not exists user_notifications_type_idx on user_notifications(type);

create table if not exists pod_live_updates (
  id uuid primary key default gen_random_uuid(),
  pod_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  update_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists pod_live_updates_pod_id_idx on pod_live_updates(pod_id);
create index if not exists pod_live_updates_user_id_idx on pod_live_updates(user_id);
create index if not exists pod_live_updates_update_type_idx on pod_live_updates(update_type);
create index if not exists pod_live_updates_created_at_idx on pod_live_updates(created_at desc);

create table if not exists pod_member_status (
  id uuid primary key default gen_random_uuid(),
  pod_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  message text,
  updated_at timestamptz default now(),
  unique(pod_id, user_id)
);

create index if not exists pod_member_status_pod_id_idx on pod_member_status(pod_id);
create index if not exists pod_member_status_user_id_idx on pod_member_status(user_id);
create index if not exists pod_member_status_status_idx on pod_member_status(status);

create or replace function public.is_text_pod_host(p_pod_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from pods
    where pods.id::text = p_pod_id
      and pods.host_user_id = auth.uid()
  );
$$;

create or replace function public.is_text_pod_member(p_pod_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from pod_members
    where pod_members.pod_id::text = p_pod_id
      and pod_members.user_id = auth.uid()
      and coalesce(pod_members.member_state::text, 'REQUESTED') <> 'CANCELED'
  );
$$;

create or replace function public.can_access_text_pod(p_pod_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.is_text_pod_host(p_pod_id)
    or public.is_text_pod_member(p_pod_id);
$$;

alter table profiles enable row level security;
alter table user_notifications enable row level security;
alter table pod_live_updates enable row level security;
alter table pod_member_status enable row level security;
alter table pod_members enable row level security;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
on profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own_auth_foundation" on profiles;
create policy "profiles_insert_own_auth_foundation"
on profiles
for insert
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_auth_foundation" on profiles;
create policy "profiles_update_own_auth_foundation"
on profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "user_notifications_select_own" on user_notifications;
create policy "user_notifications_select_own"
on user_notifications
for select
using (recipient_user_id = auth.uid() or public.is_admin());

drop policy if exists "user_notifications_update_own_read_state" on user_notifications;
create policy "user_notifications_update_own_read_state"
on user_notifications
for update
using (recipient_user_id = auth.uid() or public.is_admin())
with check (recipient_user_id = auth.uid() or public.is_admin());

drop policy if exists "user_notifications_delete_own" on user_notifications;
create policy "user_notifications_delete_own"
on user_notifications
for delete
using (recipient_user_id = auth.uid() or public.is_admin());

drop policy if exists "user_notifications_insert_admin_or_self_system" on user_notifications;
create policy "user_notifications_insert_admin_or_self_system"
on user_notifications
for insert
with check (
  public.is_admin()
  or (
    recipient_user_id = auth.uid()
    and actor_user_id = auth.uid()
    and type like 'demo_%'
  )
);

drop policy if exists "pod_live_updates_select_members" on pod_live_updates;
create policy "pod_live_updates_select_members"
on pod_live_updates
for select
using (public.can_access_text_pod(pod_id));

drop policy if exists "pod_live_updates_insert_members" on pod_live_updates;
create policy "pod_live_updates_insert_members"
on pod_live_updates
for insert
with check (
  public.can_access_text_pod(pod_id)
  and (user_id = auth.uid() or user_id is null or public.is_admin())
);

drop policy if exists "pod_member_status_select_members" on pod_member_status;
create policy "pod_member_status_select_members"
on pod_member_status
for select
using (public.can_access_text_pod(pod_id));

drop policy if exists "pod_member_status_upsert_own" on pod_member_status;
create policy "pod_member_status_upsert_own"
on pod_member_status
for insert
with check (user_id = auth.uid() and public.can_access_text_pod(pod_id));

drop policy if exists "pod_member_status_update_own" on pod_member_status;
create policy "pod_member_status_update_own"
on pod_member_status
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

comment on table user_notifications is 'Durable private inbox updates for RidePod users.';
comment on table pod_live_updates is 'Historical pod activity and coordination notes. No private payment/card/safety report details.';
comment on table pod_member_status is 'Latest visible coordination status per pod member. No GPS/location permissions.';
comment on policy "profiles_select_own_or_admin" on profiles is
  'Conservative because profiles stores private eligibility fields. Public basics should be exposed later through a safe view/RPC.';
