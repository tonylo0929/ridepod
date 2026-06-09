# RidePod Join And Cancel Attendance Logic

## Membership Table

RidePod already had a `pod_members` table in the MVP Supabase schema, so this slice reuses it instead of adding a duplicate membership concept.

The migration `202605280002_ridepod_membership_join_cancel.sql` adds lightweight attendance fields:

- `status text default 'joined'`
- `cancelled_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

It also adds:

- unique index on `(pod_id, user_id)`
- indexes for `status` and `created_at`
- status check for `joined`, `cancelled`, `waitlisted`, `left`
- role check compatible with existing values such as `HOST`, `GUEST`, `backup_host`, and `member`

The existing `member_state` enum is preserved for older RidePod flows.

## joinPod Helper

Helper path:

`src/lib/pods/ridepod-membership.ts`

`joinPod(input)`:

- requires `userId`
- validates `podId`
- checks joinability when backend or mock pod data supports it
- rejects full pods with `Pod full`
- rejects completed, cancelled, settled, or closed pods with `This pod is no longer joinable.`
- returns an existing joined membership without creating duplicates
- restores a cancelled row back to `joined`
- inserts a new `guest` membership when no row exists
- does not send notifications
- does not create pod live updates
- does not add payment or taxi dispatch behavior

For the existing Supabase table, inserted rows keep `member_state = 'REQUESTED'` and use the new `status = 'joined'` field for this slice.

## cancelPodAttendance Helper

`cancelPodAttendance(input)`:

- requires `userId`
- finds the `pod_members` row for `podId + userId`
- requires current `status = 'joined'`
- blocks cancellation for terminal pods when state is available
- updates the row instead of deleting it
- sets `status = 'cancelled'`
- sets `member_state = 'CANCELED'`
- sets `cancelled_at` and `updated_at`

This keeps an audit trail and deliberately avoids refund or payment wording.

## listMyPods Helper

`listMyPods({ userId, includeCancelled })` returns:

- `hosted`
- `joined`
- `cancelled`
- `saved`

`saved` is returned as an empty array because this product slice does not add saved pods.

When Supabase is available and UUID ids are used, it loads hosted pods from `pods.host_user_id` and joined/cancelled pods through `pod_members`.

When the app is in mock mode or uses non-UUID demo pod ids, it merges existing mock pod data with local mock membership state.

## RLS Notes

RLS is enabled on `pod_members`.

Policies allow:

- users to read their own membership rows
- pod hosts to read rows for pods they host
- joined pod members to read rows for the same pod
- users to insert their own membership row through the existing MVP policy
- users to update their own row for attendance transitions
- host/admin management through existing MVP policies

The policy remains conservative and does not make the table public.

TODO before production:

- move self-service attendance changes behind an RPC if stricter column-level role protection is needed
- review host/admin policy shape against the production admin model

## Edge Cases

- Already joined: returns the existing membership.
- Cancelled then rejoin: updates the same row back to `joined`.
- Pod full: returns `Pod full`.
- Completed/cancelled/settled pod: returns `This pod is no longer joinable.`
- Missing Supabase env: uses local mock membership and returns a warning.

## No Payment Or Dispatch

This slice does not add payments, Stripe, refunds, reimbursement, payout logic, real taxi dispatch, taxi APIs, GPS, notifications, or chat UI.

Notifications and live updates are handled later in CORE-2C.
