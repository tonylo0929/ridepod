-- Ride app self-settle ratings and trust events.
-- This creates the intended backend model for RIDEAPP-16. The current app
-- still uses mock/local helpers until server actions/RPC wiring is added.

create table if not exists ride_app_ratings (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pods(id) on delete cascade,
  reviewer_user_id uuid not null references profiles(id) on delete cascade,
  reviewed_user_id uuid not null references profiles(id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('host', 'rider')),
  reviewed_role text not null check (reviewed_role in ('host', 'rider')),
  rating integer not null check (rating between 1 and 5),
  did_show_up boolean,
  was_on_time boolean,
  payment_smooth boolean,
  booking_clear boolean,
  fare_split_clear boolean,
  payment_fair boolean,
  would_ride_again boolean,
  optional_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ride_app_ratings_no_self_rating check (reviewer_user_id <> reviewed_user_id),
  constraint ride_app_ratings_once_per_pod_pair unique (pod_id, reviewer_user_id, reviewed_user_id)
);

create table if not exists ride_app_trust_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pod_id uuid references pods(id) on delete set null,
  event_type text not null check (
    event_type in (
      'ride_app_completed',
      'ride_app_checklist_completed',
      'ride_app_acknowledged',
      'ride_app_host_cancelled_before_confirm',
      'ride_app_host_cancelled_after_confirm',
      'ride_app_host_no_show',
      'ride_app_rider_left_early',
      'ride_app_rider_left_late',
      'ride_app_rider_no_show',
      'ride_app_positive_rating',
      'ride_app_low_rating',
      'ride_app_report_submitted',
      'ride_app_report_confirmed',
      'ride_app_report_dismissed',
      'ride_app_payment_issue_confirmed',
      'ride_app_safety_issue_confirmed'
    )
  ),
  impact_score integer not null default 0,
  reason text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists ride_app_ratings_pod_id_idx on ride_app_ratings(pod_id);
create index if not exists ride_app_ratings_reviewed_user_id_idx on ride_app_ratings(reviewed_user_id);
create index if not exists ride_app_trust_events_user_id_created_at_idx on ride_app_trust_events(user_id, created_at desc);
create index if not exists ride_app_trust_events_pod_id_idx on ride_app_trust_events(pod_id);

alter table ride_app_ratings enable row level security;
alter table ride_app_trust_events enable row level security;

drop policy if exists "ride_app_ratings_select_pod_members" on ride_app_ratings;
create policy "ride_app_ratings_select_pod_members"
on ride_app_ratings
for select
using (
  public.is_admin()
  or reviewer_user_id = auth.uid()
  or reviewed_user_id = auth.uid()
  or public.is_pod_member(pod_id)
  or public.is_pod_host(pod_id)
);

drop policy if exists "ride_app_ratings_insert_member_rating" on ride_app_ratings;
create policy "ride_app_ratings_insert_member_rating"
on ride_app_ratings
for insert
with check (
  reviewer_user_id = auth.uid()
  and reviewer_user_id <> reviewed_user_id
  and public.is_pod_member(pod_id)
);

drop policy if exists "ride_app_trust_events_select_summary_safe" on ride_app_trust_events;
create policy "ride_app_trust_events_select_summary_safe"
on ride_app_trust_events
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or created_by = auth.uid()
);

drop policy if exists "ride_app_trust_events_insert_own_neutral_events" on ride_app_trust_events;
create policy "ride_app_trust_events_insert_own_neutral_events"
on ride_app_trust_events
for insert
with check (
  public.is_admin()
  or (
    created_by = auth.uid()
    and impact_score >= 0
  )
);

comment on table ride_app_ratings is 'Ride app self-settle host/rider ratings. Optional comments are private by default.';
comment on table ride_app_trust_events is 'Ride app self-settle trust score events. Serious report penalties should be inserted only by admin-confirmed decisions.';
