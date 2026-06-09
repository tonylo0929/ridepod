-- RidePod membership join / cancel attendance foundation.
-- Reuses the existing pod_members table instead of creating a duplicate
-- membership concept. No payment, refund, payout, dispatch, or notification
-- behavior is added in this slice.

alter table pod_members
  add column if not exists status text not null default 'joined',
  add column if not exists cancelled_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update pod_members
set status = case
    when member_state::text = 'CANCELED' then 'cancelled'
    else 'joined'
  end,
  cancelled_at = case
    when member_state::text = 'CANCELED' then coalesce(cancelled_at, updated_at, now())
    else cancelled_at
  end,
  updated_at = coalesce(updated_at, joined_at, now())
where member_state::text = 'CANCELED'
  or status is null
  or status not in ('joined', 'cancelled', 'waitlisted', 'left');

do $$ begin
  alter table pod_members
    add constraint pod_members_status_check
    check (status in ('joined', 'cancelled', 'waitlisted', 'left'));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table pod_members
    add constraint pod_members_role_check
    check (lower(role) in ('host', 'guest', 'admin', 'backup_host', 'member'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists pod_members_pod_id_user_id_key on pod_members(pod_id, user_id);
create index if not exists pod_members_status_idx on pod_members(status);
create index if not exists pod_members_created_at_idx on pod_members(created_at desc);

alter table pod_members enable row level security;

drop policy if exists "pod_members_select_same_pod_members" on pod_members;
create policy "pod_members_select_same_pod_members"
on pod_members
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.is_pod_host(pod_id)
  or public.is_pod_member(pod_id)
);

drop policy if exists "pod_members_update_own_attendance" on pod_members;
create policy "pod_members_update_own_attendance"
on pod_members
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and lower(role) in ('host', 'guest', 'admin', 'backup_host', 'member')
);

-- The base MVP policy still allows host/admin management. This policy only
-- adds self-service joined/cancelled attendance transitions for the rider.
-- TODO: move self-service attendance changes behind an RPC before production
-- if stricter column-level role protection is needed.
comment on column pod_members.status is 'Lightweight attendance status used by join pod and cancel attendance helpers.';
comment on column pod_members.cancelled_at is 'Audit timestamp for cancel attendance. Rows are not deleted.';
