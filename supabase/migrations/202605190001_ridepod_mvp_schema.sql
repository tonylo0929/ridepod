-- RidePod MVP schema foundation.
-- Product rules:
-- - RidePod does not provide drivers; hosts book or take external rides.
-- - Quote proof controls booking permission for ride app / fixed quote rides.
-- - Verified receipt or meter proof controls final settlement.
-- - Each recurring ride instance settles separately.
-- - Off-app payments are not protected.

create extension if not exists pgcrypto;

do $$ begin
  create type pod_type as enum ('SCHEDULED', 'RECURRING');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type ride_option as enum ('RIDE_APP_FIXED_QUOTE', 'TAXI_METER');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type pod_lifecycle_state as enum (
    'DRAFT',
    'FORMING',
    'PAYMENT_LOCKING',
    'LOCKED',
    'HOST_CAN_BOOK',
    'RIDE_BOOKED',
    'COMPLETED',
    'RECEIPT_PENDING',
    'SETTLEMENT_PENDING',
    'SETTLED',
    'CLOSED',
    'HOST_REPLACEMENT_NEEDED',
    'ADMIN_REVIEW',
    'DISPUTE_HOLD',
    'CANCELED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type ride_instance_status as enum (
    'WAITING_FOR_GUESTS',
    'QUOTE_NEEDED',
    'QUOTE_UNDER_REVIEW',
    'READY_TO_BOOK',
    'RIDE_BOOKED',
    'READY_FOR_TAXI_METER',
    'RECEIPT_NEEDED',
    'METER_PROOF_NEEDED',
    'PROOF_UNDER_REVIEW',
    'SETTLEMENT_READY',
    'DISPUTE_REVIEW',
    'SETTLEMENT_FINAL',
    'CLOSED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type proof_type as enum ('QUOTE_SCREENSHOT', 'FINAL_RECEIPT', 'METER_PROOF');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type proof_status as enum (
    'NEEDED',
    'SUBMITTED',
    'UNDER_REVIEW',
    'VERIFIED',
    'NEEDS_MORE_INFO',
    'REJECTED',
    'FRAUD_SUSPECTED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type settlement_state as enum (
    'NOT_READY',
    'DRAFT',
    'RIDER_NOTICE_SENT',
    'DISPUTE_WINDOW',
    'FINALIZED',
    'PAYOUT_PENDING',
    'PAID',
    'CLOSED',
    'ADMIN_REVIEW',
    'DISPUTE_HOLD'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type admin_review_state as enum (
    'OPEN',
    'UNDER_REVIEW',
    'NEEDS_MORE_INFO',
    'APPROVED',
    'REJECTED',
    'RESOLVED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type member_state as enum (
    'REQUESTED',
    'PAYMENT_REQUIRED',
    'AUTHORIZED',
    'CONFIRMED',
    'LOCKED',
    'CANCELED',
    'COMPLETED',
    'NO_SHOW'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key,
  account_name text,
  display_name text,
  email text,
  created_at timestamptz default now()
);

create table if not exists pods (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid references profiles(id),
  pod_type pod_type not null,
  lifecycle_state pod_lifecycle_state not null default 'FORMING',
  ride_option ride_option not null,
  route_label text not null,
  pickup_point text,
  dropoff_point text,
  ideal_pod_size int not null,
  minimum_locked_guests int not null,
  booking_fare_cap_cents int not null,
  current_estimate_cents int,
  platform_fee_rate_bps int default 1000,
  minimum_platform_fee_cents int default 600,
  currency text default 'HKD',
  departure_at timestamptz,
  recurring_days text[],
  recurring_pattern text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pod_members (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid references pods(id) on delete cascade,
  user_id uuid references profiles(id),
  role text not null default 'GUEST',
  member_state member_state not null default 'REQUESTED',
  max_charge_cents int,
  final_charge_cents int,
  joined_at timestamptz default now(),
  locked_at timestamptz
);

create table if not exists ride_instances (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid references pods(id) on delete cascade,
  instance_status ride_instance_status not null default 'WAITING_FOR_GUESTS',
  leg_type text,
  route_label text not null,
  departure_at timestamptz not null,
  guests_locked_count int default 0,
  required_guests_count int not null,
  booking_fare_cap_cents int not null,
  quote_proof_id uuid,
  receipt_proof_id uuid,
  settlement_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists proofs (
  id uuid primary key default gen_random_uuid(),
  ride_instance_id uuid references ride_instances(id) on delete cascade,
  uploaded_by_user_id uuid references profiles(id),
  proof_type proof_type not null,
  proof_status proof_status not null default 'SUBMITTED',
  amount_cents int,
  file_url text,
  provider_name text,
  certification_accepted boolean default false,
  certification_text_version text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  admin_notes text
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  ride_instance_id uuid references ride_instances(id) on delete cascade,
  settlement_state settlement_state not null default 'NOT_READY',
  verified_fare_cents int,
  booking_fare_cap_cents int,
  billable_guest_count int,
  fare_share_cents int,
  platform_fee_cents int,
  host_reimbursement_cents int,
  dispute_deadline_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid references settlements(id) on delete cascade,
  user_id uuid references profiles(id),
  item_type text not null,
  amount_cents int not null,
  direction text not null,
  reason text,
  created_at timestamptz default now()
);

create table if not exists admin_review_cases (
  id uuid primary key default gen_random_uuid(),
  ride_instance_id uuid references ride_instances(id),
  proof_id uuid references proofs(id),
  settlement_id uuid references settlements(id),
  review_state admin_review_state not null default 'OPEN',
  case_type text not null,
  severity text not null default 'MEDIUM',
  title text not null,
  description text,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  admin_notes text
);

create table if not exists pod_events (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid references pods(id),
  ride_instance_id uuid references ride_instances(id),
  user_id uuid references profiles(id),
  event_type text not null,
  event_payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

do $$ begin
  alter table ride_instances
    add constraint ride_instances_quote_proof_id_fkey
    foreign key (quote_proof_id) references proofs(id);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table ride_instances
    add constraint ride_instances_receipt_proof_id_fkey
    foreign key (receipt_proof_id) references proofs(id);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table ride_instances
    add constraint ride_instances_settlement_id_fkey
    foreign key (settlement_id) references settlements(id);
exception
  when duplicate_object then null;
end $$;

create index if not exists pods_host_user_id_idx on pods(host_user_id);
create index if not exists pod_members_pod_id_idx on pod_members(pod_id);
create index if not exists pod_members_user_id_idx on pod_members(user_id);
create index if not exists ride_instances_pod_id_idx on ride_instances(pod_id);
create index if not exists ride_instances_instance_status_idx on ride_instances(instance_status);
create index if not exists proofs_ride_instance_id_idx on proofs(ride_instance_id);
create index if not exists proofs_proof_status_idx on proofs(proof_status);
create index if not exists settlements_ride_instance_id_idx on settlements(ride_instance_id);
create index if not exists settlements_settlement_state_idx on settlements(settlement_state);
create index if not exists admin_review_cases_review_state_idx on admin_review_cases(review_state);
create index if not exists admin_review_cases_case_type_idx on admin_review_cases(case_type);
create index if not exists pod_events_pod_id_idx on pod_events(pod_id);
create index if not exists pod_events_ride_instance_id_idx on pod_events(ride_instance_id);

comment on table pods is 'RidePod pod templates. Scheduled pods are one-time rides; recurring pods are weekly templates.';
comment on table ride_instances is 'Per-ride instances. Each recurring ride instance has separate guest lock, proof, receipt, settlement, and dispute state.';
comment on table proofs is 'Quote, receipt, and meter proof uploads. Quote proof controls booking permission; receipt or meter proof controls settlement.';
comment on table settlements is 'Per-ride settlement records based on verified receipt or meter proof.';
comment on table admin_review_cases is 'Manual review queue for suspicious proof, above-cap fares, disputes, and payout holds.';
comment on table pod_events is 'Audit-style event log for pod and ride instance lifecycle changes.';
comment on column pods.ride_option is 'Ride app / fixed quote requires fresh quote proof before booking. Taxi meter requires meter proof or receipt after ride.';
comment on column pods.booking_fare_cap_cents is 'Guests cannot be charged above their max unless they approve more.';
comment on column pod_events.event_payload is 'Off-app payments are not protected and should be tracked as manual review context only when reported.';
