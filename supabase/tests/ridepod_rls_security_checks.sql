-- RidePod SQL-2T RLS security QA checks.
-- These checks are intentionally read-only unless a statement is commented out.
-- Run catalog checks in Supabase SQL Editor after migrations.
--
-- Role-behavior checks must be run through a Supabase client session for each
-- test user. Running as database owner or service role bypasses RLS and will not
-- prove denial behavior.
--
-- Seed users from supabase/seed.sql:
-- Host Tony:   tony.host@example.com
-- Guests:      amy.guest@example.com, bella.guest@example.com, chris.guest@example.com
-- Admin:       admin@example.com with JWT app_metadata.role = admin
-- Unrelated:   create a normal authenticated user that is not a pod member.

-- 1. RLS enabled check.
-- Expected: every listed table has rls_enabled = true.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles',
    'pods',
    'pod_members',
    'ride_instances',
    'proofs',
    'settlements',
    'settlement_items',
    'admin_review_cases',
    'pod_events'
  )
order by c.relname;

-- 2. Policy inventory.
-- Expected: no normal-user broad policies on proofs, admin_review_cases, settlements,
-- settlement_items, pod_events, or storage.objects.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where (schemaname = 'public' and tablename in (
    'profiles',
    'pods',
    'pod_members',
    'ride_instances',
    'proofs',
    'settlements',
    'settlement_items',
    'admin_review_cases',
    'pod_events'
  ))
  or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 3. Dangerous policy pattern scan.
-- Expected: zero rows, except known safe admin-only policies after manual review.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where (
    coalesce(qual, '') ~* '(^|[^a-z_])true([^a-z_]|$)'
    or coalesce(with_check, '') ~* '(^|[^a-z_])true([^a-z_]|$)'
    or (
      roles::text ilike '%authenticated%'
      and tablename in ('proofs', 'admin_review_cases', 'settlements', 'settlement_items')
      and cmd in ('UPDATE', 'DELETE', 'ALL')
    )
    or (
      schemaname = 'storage'
      and tablename = 'objects'
      and roles::text ilike '%authenticated%'
      and coalesce(qual, with_check, '') not ilike '%ridepod-proofs%'
    )
  )
order by schemaname, tablename, policyname;

-- 4. Private proof bucket check.
-- Expected: one row, public = false, file_size_limit = 10485760.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'ridepod-proofs';

-- 5. Proof storage policy check.
-- Expected:
-- - host INSERT policy scoped to ridepod-proofs and hosted ride instance path.
-- - host SELECT policy scoped to ridepod-proofs and hosted ride instance path.
-- - admin SELECT policy scoped to ridepod-proofs and is_admin().
-- - no guest/member raw proof file SELECT policy in this MVP.
select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (qual ilike '%ridepod-proofs%' or with_check ilike '%ridepod-proofs%')
order by policyname;

-- 6. Storage helper path validation.
-- Expected: first row returns a UUID, invalid paths return null or false.
select public.ridepod_proof_object_ride_instance_id(
  'ride-instances/30000000-0000-4000-8000-000000000001/FINAL_RECEIPT/2026-05-19-receipt.pdf'
) as parsed_ride_instance_id;

select public.ridepod_is_valid_proof_storage_path('receipt.pdf') as root_path_allowed;

select public.ridepod_is_valid_proof_storage_path(
  'ride-instances/30000000-0000-4000-8000-000000000001/OTHER/receipt.pdf'
) as invalid_proof_type_allowed;

select public.ridepod_is_valid_proof_storage_path(
  'ride-instances/not-a-uuid/FINAL_RECEIPT/receipt.pdf'
) as invalid_uuid_allowed;

-- 7. Admin review isolation.
-- Expected for normal host/guest client sessions: zero rows.
-- Expected for admin client session with app_metadata.role = admin: open cases are visible.
select
  id,
  case_type,
  review_state,
  title
from admin_review_cases
order by created_at desc;

-- 8. Host access manual checks.
-- Run as Tony Host through a normal authenticated Supabase client.
-- Expected: hosted pods and hosted ride instances return rows.
select id, pod_type, ride_option, route_label
from pods
where host_user_id = auth.uid();

select
  ri.id as ride_instance_id,
  ri.instance_status,
  ri.route_label
from ride_instances ri
join pods p on p.id = ri.pod_id
where p.host_user_id = auth.uid()
order by ri.departure_at;

-- Host proof insert expectation:
-- As Tony Host, inserting proof metadata for a hosted ride instance should succeed.
-- As an unrelated user, the same insert should fail RLS.
-- insert into proofs (
--   ride_instance_id,
--   uploaded_by_user_id,
--   proof_type,
--   proof_status,
--   amount_cents,
--   file_url,
--   provider_name,
--   certification_accepted,
--   certification_text_version
-- )
-- values (
--   '<hosted_ride_instance_id>',
--   auth.uid(),
--   'QUOTE_SCREENSHOT',
--   'SUBMITTED',
--   9500,
--   'mock://manual-security-qa/quote.png',
--   'Ride app demo',
--   true,
--   'manual-security-qa-v1'
-- );

-- 9. Guest access manual checks.
-- Run as Amy/Bella/Chris through a normal authenticated Supabase client.
-- Expected: joined pods and ride instances return rows.
-- Expected: unrelated pods return zero rows.
select
  pm.user_id,
  pm.pod_id,
  pm.member_state,
  p.route_label
from pod_members pm
join pods p on p.id = pm.pod_id
where pm.user_id = auth.uid()
  and pm.member_state in ('LOCKED', 'CONFIRMED', 'AUTHORIZED');

select
  ri.id as ride_instance_id,
  ri.instance_status,
  ri.route_label
from ride_instances ri
where public.can_access_ride_instance(ri.id)
order by ri.departure_at;

-- Guest mutation expectations:
-- As a guest, these statements should affect zero rows or fail RLS.
-- update pod_members
-- set role = 'HOST'
-- where user_id <> auth.uid();
--
-- update ride_instances
-- set instance_status = 'READY_TO_BOOK'
-- where public.can_access_ride_instance(id);
--
-- update proofs
-- set proof_status = 'VERIFIED'
-- where ride_instance_id in (
--   select id from ride_instances where public.can_access_ride_instance(id)
-- );

-- 10. Settlement access manual checks.
-- Run as host and guest through normal authenticated clients.
-- Host expected: can read settlements for hosted ride instances.
-- Guest expected: can read settlement records for joined ride instances and only own
-- settlement_items unless product later allows broader item visibility.
select
  s.id as settlement_id,
  s.ride_instance_id,
  s.settlement_state,
  s.verified_fare_cents,
  s.host_reimbursement_cents
from settlements s
where public.can_access_ride_instance(s.ride_instance_id);

select
  si.id as settlement_item_id,
  si.settlement_id,
  si.user_id,
  si.item_type,
  si.amount_cents,
  si.direction
from settlement_items si
where si.user_id = auth.uid();

-- Normal users should not be able to mark settlements paid/finalized.
-- update settlements
-- set settlement_state = 'PAID', finalized_at = now()
-- where id = '<settlement_id>';

-- 11. Proof metadata access manual checks.
-- Host expected: can read proofs for hosted ride instances.
-- Guest expected: can read allowed proof metadata for joined ride instances.
-- Unrelated user expected: zero rows.
select
  p.id as proof_id,
  p.ride_instance_id,
  p.proof_type,
  p.proof_status,
  p.amount_cents,
  p.submitted_at
from proofs p
where public.can_access_ride_instance(p.ride_instance_id)
order by p.submitted_at desc;

-- 12. Pod event / audit access manual checks.
-- Expected: host/member can read relevant events only; normal users cannot insert
-- arbitrary audit events.
select
  pe.id,
  pe.pod_id,
  pe.ride_instance_id,
  pe.event_type,
  pe.created_at
from pod_events pe
where (pe.pod_id is not null and (public.is_pod_host(pe.pod_id) or public.is_pod_member(pe.pod_id)))
   or (pe.ride_instance_id is not null and public.can_access_ride_instance(pe.ride_instance_id))
order by pe.created_at desc;

-- insert into pod_events (pod_id, ride_instance_id, user_id, event_type, event_payload)
-- values ('<pod_id>', '<ride_instance_id>', auth.uid(), 'NORMAL_USER_FORGED_AUDIT', '{}'::jsonb);

-- 13. Raw proof file access manual checks.
-- Run through Supabase Storage API as each user.
-- Expected:
-- - host can upload/read objects only under ride-instances/{hostedRideInstanceId}/...
-- - unrelated host/user cannot upload/read another ride instance path.
-- - guests cannot preview raw proof files in this MVP.
-- - admin can read proof files if app_metadata.role = admin.
--
-- Example hosted path:
-- ride-instances/<hosted_ride_instance_id>/QUOTE_SCREENSHOT/manual-security-qa.png
--
-- Example unrelated path:
-- ride-instances/<unrelated_ride_instance_id>/QUOTE_SCREENSHOT/manual-security-qa.png

-- 14. Service role safety checklist.
-- Code search expectation:
-- - SUPABASE_SERVICE_ROLE_KEY appears only in env/admin server helpers, .env.example,
--   and tests/docs.
-- - getSupabaseAdminClient modules import "server-only".
-- - client/browser helpers do not import getSupabaseAdminClient.
-- - no NEXT_PUBLIC service-role variable exists.
