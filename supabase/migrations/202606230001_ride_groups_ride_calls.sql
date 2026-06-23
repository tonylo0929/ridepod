-- Ride Groups -> Ride Call -> Draft RidePod foundation.
-- Product rules:
-- - Ride Calls are public interest posts, not locked seats.
-- - Interested users become invited riders only after conversion.
-- - A pod member/rider is locked only after confirmation and payment authorization.

do $$ begin
  create type ride_group_type as enum ('event', 'route', 'place');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type ride_call_ride_type as enum ('ride_app', 'taxi', 'either');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type ride_call_status as enum ('open', 'ready_to_convert', 'converted', 'cancelled', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type ride_call_interest_status as enum ('interested', 'invited_to_pod', 'declined', 'expired', 'converted');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type draft_pod_lifecycle_status as enum (
    'draft',
    'collecting_confirmations',
    'confirmed',
    'booked',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type draft_pod_rider_status as enum (
    'invited',
    'pending_confirmation',
    'pending_payment',
    'locked',
    'expired',
    'declined',
    'cancelled',
    'completed',
    'no_show'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type draft_pod_payment_status as enum ('pending', 'authorized', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists ride_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  type ride_group_type not null default 'route',
  icon_url text,
  cover_image_url text,
  is_public boolean not null default true,
  is_verified boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ride_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references ride_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'joined',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists ride_calls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references ride_groups(id) on delete cascade,
  created_by uuid not null references profiles(id),
  title text not null,
  from_label text,
  to_label text not null,
  approximate_time_label text not null,
  target_people_count int not null check (target_people_count > 0),
  note text,
  ride_type ride_call_ride_type not null default 'either',
  status ride_call_status not null default 'open',
  converted_pod_id uuid references pods(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists ride_call_interests (
  id uuid primary key default gen_random_uuid(),
  ride_call_id uuid not null references ride_calls(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status ride_call_interest_status not null default 'interested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ride_call_id, user_id)
);

alter table pods
  add column if not exists ride_group_id uuid references ride_groups(id),
  add column if not exists source_ride_call_id uuid references ride_calls(id),
  add column if not exists ride_type text,
  add column if not exists lifecycle_status draft_pod_lifecycle_status,
  add column if not exists target_seats int,
  add column if not exists minimum_locked_riders int,
  add column if not exists confirmation_deadline timestamptz;

alter table pod_members
  add column if not exists status draft_pod_rider_status,
  add column if not exists payment_status draft_pod_payment_status not null default 'pending',
  add column if not exists invited_from_ride_call_interest_id uuid references ride_call_interests(id),
  add column if not exists confirmation_expires_at timestamptz,
  add column if not exists locked_at timestamptz;

alter table pod_members
  drop constraint if exists pod_members_status_check;

alter table pod_members
  add constraint pod_members_status_check
  check (
    status in (
      'joined',
      'cancelled',
      'waitlisted',
      'left',
      'invited',
      'pending_confirmation',
      'pending_payment',
      'locked',
      'expired',
      'declined',
      'completed',
      'no_show'
    )
  );

create index if not exists ride_groups_slug_idx on ride_groups(slug);
create index if not exists ride_groups_public_idx on ride_groups(is_public);
create index if not exists ride_group_members_group_id_idx on ride_group_members(group_id);
create index if not exists ride_group_members_user_id_idx on ride_group_members(user_id);
create index if not exists ride_calls_group_id_idx on ride_calls(group_id);
create index if not exists ride_calls_status_idx on ride_calls(status);
create index if not exists ride_calls_created_by_idx on ride_calls(created_by);
create index if not exists ride_call_interests_ride_call_id_idx on ride_call_interests(ride_call_id);
create index if not exists ride_call_interests_user_id_idx on ride_call_interests(user_id);
create index if not exists pods_source_ride_call_id_idx on pods(source_ride_call_id);
create index if not exists pod_members_invited_from_ride_call_interest_id_idx on pod_members(invited_from_ride_call_interest_id);

create or replace function public.is_ride_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from ride_group_members
    where ride_group_members.group_id = p_group_id
      and ride_group_members.user_id = auth.uid()
      and ride_group_members.status = 'joined'
  );
$$;

create or replace function public.can_read_ride_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from ride_groups
    where ride_groups.id = p_group_id
      and (
        ride_groups.is_public
        or ride_groups.created_by = auth.uid()
        or public.is_ride_group_member(ride_groups.id)
        or public.is_admin()
      )
  );
$$;

create or replace function public.is_ride_call_creator(p_ride_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from ride_calls
    where ride_calls.id = p_ride_call_id
      and ride_calls.created_by = auth.uid()
  );
$$;

alter table ride_groups enable row level security;
alter table ride_group_members enable row level security;
alter table ride_calls enable row level security;
alter table ride_call_interests enable row level security;

drop policy if exists "ride_groups_select_public_or_member" on ride_groups;
create policy "ride_groups_select_public_or_member"
on ride_groups
for select
using (
  is_public
  or created_by = auth.uid()
  or public.is_ride_group_member(id)
  or public.is_admin()
);

drop policy if exists "ride_groups_insert_authenticated" on ride_groups;
create policy "ride_groups_insert_authenticated"
on ride_groups
for insert
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "ride_groups_update_creator_or_admin" on ride_groups;
create policy "ride_groups_update_creator_or_admin"
on ride_groups
for update
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "ride_group_members_select_self_or_group_creator" on ride_group_members;
create policy "ride_group_members_select_self_or_group_creator"
on ride_group_members
for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from ride_groups
    where ride_groups.id = ride_group_members.group_id
      and ride_groups.created_by = auth.uid()
  )
);

drop policy if exists "ride_group_members_insert_self_or_admin" on ride_group_members;
create policy "ride_group_members_insert_self_or_admin"
on ride_group_members
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "ride_group_members_update_self_or_group_creator" on ride_group_members;
create policy "ride_group_members_update_self_or_group_creator"
on ride_group_members
for update
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from ride_groups
    where ride_groups.id = ride_group_members.group_id
      and ride_groups.created_by = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from ride_groups
    where ride_groups.id = ride_group_members.group_id
      and ride_groups.created_by = auth.uid()
  )
);

drop policy if exists "ride_calls_select_readable_group" on ride_calls;
create policy "ride_calls_select_readable_group"
on ride_calls
for select
using (public.can_read_ride_group(group_id));

drop policy if exists "ride_calls_insert_authenticated" on ride_calls;
create policy "ride_calls_insert_authenticated"
on ride_calls
for insert
with check (
  created_by = auth.uid()
  and public.can_read_ride_group(group_id)
);

drop policy if exists "ride_calls_update_creator_or_admin" on ride_calls;
create policy "ride_calls_update_creator_or_admin"
on ride_calls
for update
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "ride_call_interests_select_readable_call" on ride_call_interests;
create policy "ride_call_interests_select_readable_call"
on ride_call_interests
for select
using (
  exists (
    select 1
    from ride_calls
    where ride_calls.id = ride_call_interests.ride_call_id
      and public.can_read_ride_group(ride_calls.group_id)
  )
);

drop policy if exists "ride_call_interests_insert_own" on ride_call_interests;
create policy "ride_call_interests_insert_own"
on ride_call_interests
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from ride_calls
    where ride_calls.id = ride_call_interests.ride_call_id
      and ride_calls.status in ('open', 'ready_to_convert')
      and public.can_read_ride_group(ride_calls.group_id)
  )
);

drop policy if exists "ride_call_interests_update_own_or_creator" on ride_call_interests;
create policy "ride_call_interests_update_own_or_creator"
on ride_call_interests
for update
using (
  user_id = auth.uid()
  or public.is_admin()
  or public.is_ride_call_creator(ride_call_id)
)
with check (
  user_id = auth.uid()
  or public.is_admin()
  or public.is_ride_call_creator(ride_call_id)
);

drop policy if exists "ride_call_interests_delete_own_open_call" on ride_call_interests;
create policy "ride_call_interests_delete_own_open_call"
on ride_call_interests
for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from ride_calls
    where ride_calls.id = ride_call_interests.ride_call_id
      and ride_calls.status in ('open', 'ready_to_convert')
  )
);

drop policy if exists "pod_members_update_own_draft_invite_confirmation" on pod_members;
create policy "pod_members_update_own_draft_invite_confirmation"
on pod_members
for update
using (
  user_id = auth.uid()
  and status in ('invited', 'pending_confirmation', 'pending_payment', 'locked')
)
with check (
  user_id = auth.uid()
  and status in ('invited', 'pending_confirmation', 'pending_payment', 'locked')
);

comment on table ride_groups is 'Public or private places/routes/events where people can gather around shared ride intent.';
comment on table ride_calls is 'Soft interest posts. A Ride Call never locks a seat or starts payment by itself.';
comment on table ride_call_interests is 'One interest row per user per Ride Call. Interested is not joined, paid, or locked.';
comment on column ride_calls.converted_pod_id is 'Draft RidePod created from this Ride Call after enough interest exists.';
comment on column pod_members.status is 'Draft RidePod rider lifecycle. locked is the first state that counts toward confirmed seats.';
comment on column pod_members.payment_status is 'Placeholder-compatible payment authorization state: pending, authorized, or failed.';
