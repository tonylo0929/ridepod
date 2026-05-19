-- RidePod MVP RLS sanity checks.
-- These are manual SQL notes for Supabase SQL editor / psql because the project
-- does not yet include a Supabase local test runner.
--
-- To test with real JWT-backed users, run the select/insert/update statements
-- through the Supabase client as each user. In psql, service-role bypasses RLS,
-- so direct execution as the database owner will not prove these policies.

-- Seed users:
-- Host:  00000000-0000-4000-8000-000000000001
-- Guest: 00000000-0000-4000-8000-000000000002
-- Other: create a non-member auth user for negative checks.

-- 1. Host can see own pod.
-- As host, this should return rows.
select id, route_label, host_user_id
from pods
where host_user_id = auth.uid();

-- 2. Guest member can see joined pod.
-- As guest 00000000-0000-4000-8000-000000000002, this should return the recurring pod.
select pods.id, pods.route_label
from pods
where exists (
  select 1
  from pod_members
  where pod_members.pod_id = pods.id
    and pod_members.user_id = auth.uid()
);

-- 3. Unrelated user cannot see private pod.
-- As a non-member user, this should return zero rows for the seed recurring pod.
select id, route_label
from pods
where id = '10000000-0000-4000-8000-000000000003';

-- 4. Host can see ride instances for own pod.
-- As host, this should return seed recurring ride instances.
select ride_instances.id, ride_instances.instance_status, ride_instances.route_label
from ride_instances
join pods on pods.id = ride_instances.pod_id
where pods.host_user_id = auth.uid();

-- 5. Guest can see ride instance for joined pod.
-- As a locked guest on the recurring pod, this should return recurring ride instances.
select ride_instances.id, ride_instances.instance_status, ride_instances.route_label
from ride_instances
where public.can_access_ride_instance(ride_instances.id);

-- 6. Guest cannot update proof.
-- As guest, this update should affect zero rows or be rejected by RLS.
update proofs
set admin_notes = 'guest should not be able to update proof'
where id = '40000000-0000-4000-8000-000000000002';

-- 7. Host can insert proof for own ride instance.
-- As host, this insert should succeed for a hosted ride instance.
insert into proofs (
  ride_instance_id,
  uploaded_by_user_id,
  proof_type,
  proof_status,
  amount_cents,
  file_url,
  provider_name,
  certification_accepted,
  certification_text_version
)
values (
  '30000000-0000-4000-8000-000000000003',
  auth.uid(),
  'QUOTE_SCREENSHOT',
  'SUBMITTED',
  29800,
  'mock://manual-rls-test/quote.png',
  'Ride app demo',
  true,
  'quote-cert-v1'
);

-- 8. Normal user cannot read admin review cases.
-- As host or guest without admin app_metadata.role = admin, this should return zero rows.
select id, title, review_state
from admin_review_cases;

-- 9. Admin access placeholder.
-- Admin access currently checks auth.jwt()->app_metadata.role = 'admin'.
-- TODO: Replace or formalize this with the app's chosen admin role model.
select public.is_admin() as current_user_is_admin;
