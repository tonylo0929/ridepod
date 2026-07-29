alter table pods
  add column if not exists confirmation_offset_minutes int;

alter table ride_instances
  add column if not exists confirmation_deadline_at timestamptz;

comment on column pods.confirmation_offset_minutes is
  'Recurring pods use this relative offset to calculate each ride instance confirmation deadline.';

comment on column ride_instances.confirmation_deadline_at is
  'Per-occurrence rider confirmation deadline calculated from departure_at and the recurring pod offset.';
