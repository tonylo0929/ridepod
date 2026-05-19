# RidePod Supabase Storage Plan

RidePod proof files are private ride-instance evidence. The app still uses the mock upload adapter by default; frontend Supabase Storage upload wiring comes later.

## Bucket

- Bucket: `ridepod-proofs`
- Public access: disabled
- Max file size: 10MB
- Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `application/pdf`

## Path Convention

Use one object path per ride instance proof:

`ride-instances/{rideInstanceId}/{proofType}/{proofId-or-timestamp}-{safeFileName}`

Examples:

- `ride-instances/{rideInstanceId}/QUOTE_SCREENSHOT/2026-05-19-quote.png`
- `ride-instances/{rideInstanceId}/FINAL_RECEIPT/2026-05-19-receipt.pdf`
- `ride-instances/{rideInstanceId}/METER_PROOF/2026-05-19-meter.jpg`

Do not store proof files at the bucket root.

## Access Policy

- Hosts can upload proof files for ride instances belonging to pods they host.
- Hosts can read proof files for ride instances belonging to pods they host.
- Admins can read proof files for manual review.
- Guests can read proof metadata/status through app data, but not raw proof files in this MVP storage slice.
- Users cannot delete, overwrite, or update proof files after submission. Replacement proof should create a new object/version later.

Guest raw proof preview is delayed intentionally because receipts may contain sensitive provider, timing, and trip details. A later slice should add signed read URLs if product policy allows guest previews during dispute review.

## Proof Metadata Alignment

The current `proofs` table has `file_url`. Store the storage object path there when real upload wiring is added. TODO: add `storage_path` and `provider` columns in a later schema cleanup if `file_url` becomes ambiguous.

## Future Requirements

- Signed upload and read URL flow.
- Virus or malware scanning in a later safety slice.
- OCR may be added later, but it must not control settlement by itself.
- AI image detection must not be trusted as the sole source of truth.
- Admin manual review remains the fallback for suspicious, above-cap, or disputed proof.

## Manual Setup Notes

If a Supabase environment cannot apply bucket creation through SQL, create the bucket manually in the Supabase dashboard:

1. Create private bucket `ridepod-proofs`.
2. Set max file size to 10MB.
3. Allow `image/png`, `image/jpeg`, `image/jpg`, and `application/pdf`.
4. Apply the `storage.objects` policies from `supabase/migrations/202605190003_ridepod_proof_storage.sql`.

These Storage RLS policies keep proof files scoped to hosted ride instances and admin review.
