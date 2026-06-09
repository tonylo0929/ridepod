# RidePod Auth, Notifications, And Chat Foundation

## Architecture Summary

RidePod uses Supabase Auth for login identity and the `profiles` table for product account fields. The client `AuthProvider` exposes `user`, `profile`, `session`, `isLoading`, `register`, `login`, `logout`, `updateProfile`, and `refreshProfile`.

When Supabase public env vars are missing, the provider falls back to local demo account behavior. This keeps browse, login, register, updates, and pod chat demos usable without pretending that live payment, payout, or taxi dispatch exists.

## Tables

- `profiles`: product profile fields such as display name, avatar, preferred name, phone, home district, public bio, and trust review status.
- `user_notifications`: durable private inbox updates for each user.
- `pod_live_updates`: historical pod activity and coordination notes.
- `pod_member_status`: latest visible status per pod member.
- `pod_members`: existing membership table is reused.

## AuthProvider Behavior

- Loads the current Supabase session on app start.
- Subscribes to Supabase auth state changes.
- Loads or creates a minimal `profiles` row for logged-in Supabase users.
- Supports local mock login/register when Supabase is not configured.
- Clears user, profile, and session on logout.

## Notification Behavior

`src/lib/notifications/ridepod-notifications.ts` provides:

- `createUserNotification`
- `listUserNotifications`
- `markNotificationRead`
- `markAllNotificationsRead`
- `getUnreadNotificationCount`

Notification writes are best-effort. Failures log warnings and do not block the user action. Metadata is sanitized to avoid client secrets, card data, private safety report text, and admin private notes.

## Pod Live Updates

`src/lib/updates/ridepod-live-updates.ts` provides:

- `createPodLiveUpdate`
- `listPodLiveUpdates`
- `listUserPodActivity`
- `canUserAccessPodUpdates`
- `createStatusAndUpdate`

Messages stay short and avoid private contact, card, payment, or safety report data.

## Pod Member Status

`src/lib/updates/ridepod-member-status.ts` provides:

- `upsertPodMemberStatus`
- `listPodMemberStatuses`
- `createPodStatusUpdate`

Quick statuses are:

- On my way
- Arrived
- Running late
- Can’t find pickup
- Not coming

No GPS or location permission is used.

## Updates Page

`/updates` shows:

- Notifications tab for durable inbox items.
- Pod activity tab for pod live updates.
- Mark all read.
- Read styling and click-to-open behavior.
- Logged-out prompt: “Log in to view updates.”

`/notifications` redirects to `/updates` for compatibility.

## Pod Chat

`/pods/[podId]/chat` shows:

- Pod route and date/time summary.
- Pod activity timeline.
- Quick status buttons.
- Coordination note input.
- Read-only copy for completed or cancelled pods.

Logged-out users see a login prompt. Non-members cannot send when membership can be checked. In local demo fallback, a logged-in mock user can send demo coordination notes.

## Access Rules

RLS is enabled for `profiles`, `user_notifications`, `pod_live_updates`, `pod_member_status`, and existing `pod_members`.

- Notifications are readable and markable only by the recipient or admin.
- Live updates and member statuses are readable by pod members, host, or admin.
- Members can insert pod live updates for pods they belong to.
- Members can upsert their own pod member status.
- `profiles` remains conservative because it contains private eligibility fields. Public profile basics should be exposed later through a safe view or RPC.

## Navigation Badges

Unread notification badges refresh on:

- Initial load.
- Browser focus.
- Local `ridepod:updates-changed` event.
- Polling fallback every 45 seconds.

Realtime can be added later when channel and membership subscriptions are production-reviewed.

## Existing Action Hooks

Current pod detail actions now emit best-effort activity:

- Lock seat: “Guest joined the pod.”
- Accept quote: “Guest accepted the quote.”
- All guests accepted: “All guests accepted the selected quote.”
- Ready for pickup status: “Guest is ready for pickup.”

Logged-out users are sent to `/login?next=...` before these actions.

## No-Live-Payment Note

This foundation does not add payments, Stripe behavior, live fare capture, payout, real taxi dispatch, taxi APIs, GPS, maps API, OCR, or AI detection. Taxi partners remain external licensed providers.

## Limitations / TODOs

- No push notifications.
- No email or SMS.
- No production payment events.
- No real taxi dispatch.
- Realtime currently uses local events, focus refresh, and polling fallback.
- Public profile basics need a safe view/RPC before broader profile reads.
- Admin/host policies should be reviewed before production.
