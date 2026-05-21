create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  ride_instance_id uuid references ride_instances(id),
  pod_id uuid references pods(id),
  user_id uuid references profiles(id),
  actor_role text,
  event_type text not null,
  payment_provider text not null default 'STRIPE_TEST',
  stripe_payment_intent_id text,
  amount_cents int,
  currency text default 'HKD',
  previous_status text,
  new_status text,
  event_payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists payment_events_ride_instance_id_idx on payment_events(ride_instance_id);
create index if not exists payment_events_pod_id_idx on payment_events(pod_id);
create index if not exists payment_events_user_id_idx on payment_events(user_id);
create index if not exists payment_events_event_type_idx on payment_events(event_type);
create index if not exists payment_events_stripe_payment_intent_id_idx on payment_events(stripe_payment_intent_id);
create index if not exists payment_events_created_at_idx on payment_events(created_at);

alter table payment_events enable row level security;

drop policy if exists "payment_events_select_scoped" on payment_events;
create policy "payment_events_select_scoped"
on payment_events
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or (pod_id is not null and public.is_pod_host(pod_id))
  or (ride_instance_id is not null and exists (
    select 1
    from ride_instances
    where ride_instances.id = payment_events.ride_instance_id
      and public.is_pod_host(ride_instances.pod_id)
  ))
);

drop policy if exists "payment_events_insert_admin_only" on payment_events;
create policy "payment_events_insert_admin_only"
on payment_events
for insert
with check (public.is_admin());

drop policy if exists "payment_events_update_admin_only" on payment_events;
create policy "payment_events_update_admin_only"
on payment_events
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "payment_events_delete_admin_only" on payment_events;
create policy "payment_events_delete_admin_only"
on payment_events
for delete
using (public.is_admin());

comment on table payment_events is 'Test/demo payment event audit trail. Not a production ledger, wallet, or payout table.';
comment on column payment_events.event_payload is 'Sanitized payment event metadata only. Do not store client secrets, secret keys, card numbers, CVC, or raw Stripe objects.';
