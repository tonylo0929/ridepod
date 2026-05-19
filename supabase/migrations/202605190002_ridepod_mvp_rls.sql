-- RidePod MVP Row Level Security foundation.
-- Assumptions:
-- - auth.uid() maps to profiles.id.
-- - Host can manage pods where pods.host_user_id = auth.uid().
-- - Members can view pods and ride instances they belong to.
-- - Quote proof controls booking permission.
-- - Receipt or meter proof controls settlement.
-- - Admin review is admin/service-role only.
-- TODO: Wire a durable admin role model before production admin access.
-- TODO: Add Supabase Storage bucket policies before storing real proof files.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.is_pod_host(p_pod_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from pods
    where pods.id = p_pod_id
      and pods.host_user_id = auth.uid()
  );
$$;

create or replace function public.is_pod_member(p_pod_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from pod_members
    where pod_members.pod_id = p_pod_id
      and pod_members.user_id = auth.uid()
      and pod_members.member_state <> 'CANCELED'
  );
$$;

create or replace function public.can_access_ride_instance(p_ride_instance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from ride_instances
    where ride_instances.id = p_ride_instance_id
      and (
        public.is_pod_host(ride_instances.pod_id)
        or public.is_pod_member(ride_instances.pod_id)
        or public.is_admin()
      )
  );
$$;

alter table profiles enable row level security;
alter table pods enable row level security;
alter table pod_members enable row level security;
alter table ride_instances enable row level security;
alter table proofs enable row level security;
alter table settlements enable row level security;
alter table settlement_items enable row level security;
alter table admin_review_cases enable row level security;
alter table pod_events enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
on profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
on profiles
for insert
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
on profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "pods_select_host_or_member" on pods;
create policy "pods_select_host_or_member"
on pods
for select
using (
  host_user_id = auth.uid()
  or public.is_pod_member(id)
  or public.is_admin()
);

drop policy if exists "pods_insert_own_host" on pods;
create policy "pods_insert_own_host"
on pods
for insert
with check (host_user_id = auth.uid() or public.is_admin());

drop policy if exists "pods_update_own_host" on pods;
create policy "pods_update_own_host"
on pods
for update
using (host_user_id = auth.uid() or public.is_admin())
with check (host_user_id = auth.uid() or public.is_admin());

drop policy if exists "pod_members_select_self_or_host" on pod_members;
create policy "pod_members_select_self_or_host"
on pod_members
for select
using (
  user_id = auth.uid()
  or public.is_pod_host(pod_id)
  or public.is_admin()
);

drop policy if exists "pod_members_insert_self_or_host" on pod_members;
create policy "pod_members_insert_self_or_host"
on pod_members
for insert
with check (
  user_id = auth.uid()
  or public.is_pod_host(pod_id)
  or public.is_admin()
);

drop policy if exists "pod_members_update_host_only" on pod_members;
create policy "pod_members_update_host_only"
on pod_members
for update
using (public.is_pod_host(pod_id) or public.is_admin())
with check (public.is_pod_host(pod_id) or public.is_admin());

drop policy if exists "ride_instances_select_host_or_member" on ride_instances;
create policy "ride_instances_select_host_or_member"
on ride_instances
for select
using (
  public.is_pod_host(pod_id)
  or public.is_pod_member(pod_id)
  or public.is_admin()
);

drop policy if exists "ride_instances_insert_host_only" on ride_instances;
create policy "ride_instances_insert_host_only"
on ride_instances
for insert
with check (public.is_pod_host(pod_id) or public.is_admin());

drop policy if exists "ride_instances_update_host_only" on ride_instances;
create policy "ride_instances_update_host_only"
on ride_instances
for update
using (public.is_pod_host(pod_id) or public.is_admin())
with check (public.is_pod_host(pod_id) or public.is_admin());

-- Proof file URLs may be sensitive. Keep storage bucket policies and signed URL rules
-- in a later storage-specific slice before using real uploaded proof files.
drop policy if exists "proofs_select_host_or_member" on proofs;
create policy "proofs_select_host_or_member"
on proofs
for select
using (
  uploaded_by_user_id = auth.uid()
  or public.can_access_ride_instance(ride_instance_id)
  or public.is_admin()
);

drop policy if exists "proofs_insert_host_for_own_ride_instance" on proofs;
create policy "proofs_insert_host_for_own_ride_instance"
on proofs
for insert
with check (
  uploaded_by_user_id = auth.uid()
  and exists (
    select 1
    from ride_instances
    where ride_instances.id = proofs.ride_instance_id
      and public.is_pod_host(ride_instances.pod_id)
  )
  or public.is_admin()
);

drop policy if exists "proofs_update_admin_only" on proofs;
create policy "proofs_update_admin_only"
on proofs
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "settlements_select_host_or_member" on settlements;
create policy "settlements_select_host_or_member"
on settlements
for select
using (
  public.can_access_ride_instance(ride_instance_id)
  or public.is_admin()
);

drop policy if exists "settlements_write_admin_only" on settlements;
create policy "settlements_write_admin_only"
on settlements
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "settlement_items_select_self_or_host" on settlement_items;
create policy "settlement_items_select_self_or_host"
on settlement_items
for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from settlements
    join ride_instances on ride_instances.id = settlements.ride_instance_id
    where settlements.id = settlement_items.settlement_id
      and public.is_pod_host(ride_instances.pod_id)
  )
);

drop policy if exists "settlement_items_write_admin_only" on settlement_items;
create policy "settlement_items_write_admin_only"
on settlement_items
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_review_cases_admin_only" on admin_review_cases;
create policy "admin_review_cases_admin_only"
on admin_review_cases
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pod_events_select_host_or_member" on pod_events;
create policy "pod_events_select_host_or_member"
on pod_events
for select
using (
  public.is_admin()
  or (pod_id is not null and (public.is_pod_host(pod_id) or public.is_pod_member(pod_id)))
  or (ride_instance_id is not null and public.can_access_ride_instance(ride_instance_id))
);

drop policy if exists "pod_events_insert_admin_only" on pod_events;
create policy "pod_events_insert_admin_only"
on pod_events
for insert
with check (public.is_admin());
