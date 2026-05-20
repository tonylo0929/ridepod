-- RidePod profile trust and safety fields.
-- These fields support pod eligibility and user-facing trust/status display.
-- No ID document, selfie, OCR, or automated identity verification is added here.

alter table profiles
  add column if not exists phone text,
  add column if not exists gender_identity text default 'UNKNOWN',
  add column if not exists gender_verified_at timestamptz,
  add column if not exists verification_status text default 'UNVERIFIED',
  add column if not exists community_id text,
  add column if not exists community_verified_at timestamptz,
  add column if not exists safety_note text,
  add column if not exists trust_score int default 0,
  add column if not exists no_show_count int default 0,
  add column if not exists late_cancel_count int default 0,
  add column if not exists risk_status text default 'NORMAL',
  add column if not exists updated_at timestamptz default now();

comment on column profiles.gender_identity is 'Private profile field for safety eligibility, such as Women-only pods. Do not show publicly.';
comment on column profiles.gender_verified_at is 'Reserved for later manual/vendor review. No ID upload is implemented in AUTH-2.';
comment on column profiles.safety_note is 'Private optional note for RidePod safety review. Not shown publicly.';
comment on column profiles.risk_status is 'Internal trust/safety status. Do not expose raw risk labels publicly.';
