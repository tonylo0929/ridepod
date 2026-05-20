-- RidePod ID verification placeholder / manual review.
-- This does not collect identity documents, selfies, OCR data, or vendor verification data.

alter table profiles
  add column if not exists id_verification_status text default 'NOT_REQUESTED',
  add column if not exists id_verified_at timestamptz,
  add column if not exists manual_verification_requested_at timestamptz,
  add column if not exists manually_verified_by uuid references profiles(id);

alter table admin_review_cases
  add column if not exists subject_user_id uuid references profiles(id);

create index if not exists admin_review_cases_subject_user_id_idx on admin_review_cases(subject_user_id);
create index if not exists admin_review_cases_id_verification_request_idx
  on admin_review_cases(subject_user_id, case_type, review_state)
  where case_type = 'ID_VERIFICATION_REQUEST';

comment on column profiles.id_verification_status is 'Manual RidePod trust review status. No identity document is collected in AUTH-4.';
comment on column profiles.id_verified_at is 'Timestamp for manual RidePod ID verification approval. This is not official government ID verification.';
comment on column profiles.manual_verification_requested_at is 'Timestamp when the user requested manual review for future higher-trust features.';
comment on column profiles.manually_verified_by is 'Admin profile id that marked manual verification approved, if available.';
comment on column admin_review_cases.subject_user_id is 'Account/profile subject for account-level review cases such as ID_VERIFICATION_REQUEST.';

drop policy if exists "admin_review_cases_insert_own_id_verification_request" on admin_review_cases;
create policy "admin_review_cases_insert_own_id_verification_request"
on admin_review_cases
for insert
with check (
  subject_user_id = auth.uid()
  and case_type = 'ID_VERIFICATION_REQUEST'
  and review_state = 'OPEN'
  and severity = 'LOW'
  and ride_instance_id is null
  and proof_id is null
  and settlement_id is null
);
