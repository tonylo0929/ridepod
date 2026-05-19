-- RidePod proof Storage policy sanity notes.
-- Run these manually in a Supabase project after applying migrations.
-- These are intentionally comments/queries, not an automated pgTAP suite.

-- 1. Bucket exists and is private.
select
  id,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'ridepod-proofs';

-- 2. Valid object path parses to a ride instance id.
select public.ridepod_proof_object_ride_instance_id(
  'ride-instances/00000000-0000-4000-8000-000000000001/FINAL_RECEIPT/2026-05-19-receipt.pdf'
) as parsed_ride_instance_id;

-- 3. Invalid/root object paths should not be accepted.
select public.ridepod_is_valid_proof_storage_path('receipt.pdf') as root_path_allowed;
select public.ridepod_is_valid_proof_storage_path(
  'ride-instances/not-a-uuid/FINAL_RECEIPT/receipt.pdf'
) as invalid_uuid_allowed;
select public.ridepod_is_valid_proof_storage_path(
  'ride-instances/00000000-0000-4000-8000-000000000001/OTHER/receipt.pdf'
) as invalid_proof_type_allowed;

-- 4. Host insert/read expectations.
-- As the host user for a ride instance:
-- insert into storage.objects (bucket_id, name, owner, metadata)
-- values (
--   'ridepod-proofs',
--   'ride-instances/{hostedRideInstanceId}/QUOTE_SCREENSHOT/2026-05-19-quote.png',
--   auth.uid(),
--   '{}'::jsonb
-- );
-- Expected: allowed.

-- 5. Unrelated user expectations.
-- As a user who is not the host of {hostedRideInstanceId}, the same insert should fail RLS.

-- 6. Guest raw proof file access is intentionally disabled.
-- As a locked guest, proof metadata can be read through public.proofs policies,
-- but select from storage.objects for bucket_id = 'ridepod-proofs' should not reveal raw objects.

-- 7. Admin expectations.
-- As a user whose JWT app_metadata.role is admin, select from storage.objects
-- where bucket_id = 'ridepod-proofs' should be allowed.
