"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Clock3, MessageCircle, Trash2 } from "lucide-react";
import { cn } from "@/components/ui";
import {
  clearAllNotifications,
  clearNotification,
  createUserNotificationOnce,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/ridepod-notifications";
import type { RidePodLiveUpdateRow, RidePodUserNotificationRow } from "@/lib/supabase/types";
import { listUserPodActivity } from "@/lib/updates/ridepod-live-updates";
import { useAuth } from "@/providers/AuthProvider";
import { createdHomeRideViewerIdentityFromAuth, useCreatedHomeRides } from "@/lib/created-home-rides";
import { getRideAppHostFareEstimate } from "@/lib/ride-app-fare-estimate";
import type { HomeRide } from "@/lib/home-ride-mock";

type UpdatesTab = "notifications" | "activity";

const clearedNotificationStorageKey = "ridepod:cleared-notifications";

function timeAgo(value: string | null) {
  if (!value) return "now";
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return "now";
  const minutes = Math.max(1, Math.round((Date.now() - created.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function readClearedNotificationKeys() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const keys = JSON.parse(window.localStorage.getItem(clearedNotificationStorageKey) ?? "[]");
    return new Set(Array.isArray(keys) ? keys.filter((key): key is string => typeof key === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeClearedNotificationKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(clearedNotificationStorageKey, JSON.stringify(Array.from(keys)));
}

function getNotificationDedupeKey(notification: RidePodUserNotificationRow) {
  const metadata = notification.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const dedupeKey = (metadata as Record<string, unknown>).dedupeKey;
  return typeof dedupeKey === "string" ? dedupeKey : null;
}

function getNotificationClearKeys(notification: RidePodUserNotificationRow, userId: string) {
  return [`${userId}:id:${notification.id}`, getNotificationDedupeKey(notification)].filter((key): key is string => Boolean(key));
}

function getDemoEstimateDedupeKey(userId: string, rideId: string) {
  return [userId, userId, rideId, "demo_ride_app_estimate_needed"].join(":");
}

function isNotificationCleared(notification: RidePodUserNotificationRow, userId: string, clearedKeys: Set<string>) {
  return getNotificationClearKeys(notification, userId).some((key) => clearedKeys.has(key));
}

function rememberClearedNotifications(notifications: RidePodUserNotificationRow[], userId: string) {
  const clearedKeys = readClearedNotificationKeys();
  notifications.forEach((notification) => {
    getNotificationClearKeys(notification, userId).forEach((key) => clearedKeys.add(key));
  });
  writeClearedNotificationKeys(clearedKeys);
}

export default function UpdatesPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const viewerIdentity = useMemo(() => createdHomeRideViewerIdentityFromAuth({ profile, user }), [profile, user]);
  const createdHomeRides = useCreatedHomeRides(user?.id ?? null, true, viewerIdentity);
  const [activeTab, setActiveTab] = useState<UpdatesTab>("notifications");
  const [notifications, setNotifications] = useState<RidePodUserNotificationRow[]>([]);
  const [activity, setActivity] = useState<RidePodLiveUpdateRow[]>([]);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );

  async function refresh() {
    if (!user) return;
    const clearedKeys = readClearedNotificationKeys();

    await Promise.all(
      createdHomeRides
        .filter(
          (ride) =>
            ride.currentUserRole === "host" &&
            ride.rideCategory === "ride_app_self_settle" &&
            !getRideAppHostFareEstimate(ride) &&
            !clearedKeys.has(getDemoEstimateDedupeKey(user.id, ride.id)),
        )
        .map((ride) =>
          createUserNotificationOnce({
            recipientUserId: user.id,
            actorUserId: user.id,
            type: "demo_ride_app_estimate_needed",
            title: "Update your ride app estimate",
            body: null,
            relatedPodId: ride.id,
            relatedUrl: `/pods/${ride.id}`,
            metadata: {
              action: "update_ride_app_estimate",
              route: formatRideRoute(ride),
              rideTime: formatRideTime(ride),
              screenshotOptional: true,
            },
          }),
        ),
    );
    const [notificationResult, activityResult] = await Promise.all([
      listUserNotifications(user.id),
      listUserPodActivity(user.id),
    ]);
    setNotifications(notificationResult.notifications.filter((notification) => !isNotificationCleared(notification, user.id, clearedKeys)));
    setActivity(activityResult.updates);
    setFallbackNote(notificationResult.fallbackNote ?? activityResult.fallbackNote);
  }

  useEffect(() => {
    function onRefreshRequested() {
      void refresh();
    }

    const initialRefresh = window.setTimeout(onRefreshRequested, 0);
    window.addEventListener("focus", onRefreshRequested);
    window.addEventListener("ridepod:updates-changed", onRefreshRequested);
    const interval = window.setInterval(onRefreshRequested, 45_000);

    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("focus", onRefreshRequested);
      window.removeEventListener("ridepod:updates-changed", onRefreshRequested);
      window.clearInterval(interval);
    };
    // refresh is intentionally closed over the latest user state through this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, createdHomeRides]);

  async function openNotification(notification: RidePodUserNotificationRow) {
    await markNotificationRead(notification.id);
    await refresh();
    if (notification.related_url) router.push(notification.related_url);
  }

  async function markAllRead() {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    await refresh();
  }

  async function clearOneNotification(notificationId: string) {
    const notification = notifications.find((item) => item.id === notificationId);
    if (user && notification) rememberClearedNotifications([notification], user.id);
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
    await clearNotification(notificationId);
  }

  async function clearAllVisibleNotifications() {
    if (!user) return;
    rememberClearedNotifications(notifications, user.id);
    setNotifications([]);
    await clearAllNotifications(user.id);
  }

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-[720px] gap-4">
        <UpdatesHeader />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto grid w-full max-w-[520px] gap-4">
        <UpdatesHeader />
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-center shadow-[var(--rp-shadow-soft)]">
          <Bell className="mx-auto h-8 w-8 text-[var(--rp-primary)]" />
          <h2 className="mt-3 text-2xl font-black text-[var(--rp-text)]">Log in to view updates.</h2>
          <Link
            href="/login?next=/updates"
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--rp-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
          >
            Log in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[760px] gap-4 pb-4">
      <UpdatesHeader />

      {fallbackNote ? (
        <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          {fallbackNote}
        </p>
      ) : null}

      <div className="grid grid-cols-2 rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-1">
        <TabButton active={activeTab === "notifications"} onClick={() => setActiveTab("notifications")}>
          Notifications
          {unreadCount ? <span className="rounded-full bg-[var(--rp-primary)] px-2 py-0.5 text-[10px] text-[var(--rp-primary-text)]">{unreadCount}</span> : null}
        </TabButton>
        <TabButton active={activeTab === "activity"} onClick={() => setActiveTab("activity")}>
          Pod activity
        </TabButton>
      </div>

      {activeTab === "notifications" ? (
        <section className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">Notifications</h2>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={clearAllVisibleNotifications}
                disabled={!notifications.length}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-muted-strong)] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                All Clear
              </button>
              <button
                type="button"
                onClick={markAllRead}
                disabled={!unreadCount}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-primary)] disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            </div>
          </div>
          {notifications.length ? (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                relatedRide={createdHomeRides.find((ride) => ride.id === notification.related_pod_id) ?? null}
                onOpen={() => openNotification(notification)}
                onClear={() => clearOneNotification(notification.id)}
              />
            ))
          ) : (
            <EmptyState icon={Bell} title="No notifications yet." />
          )}
        </section>
      ) : (
        <section className="grid gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">Pod activity</h2>
          {activity.length ? (
            activity.map((update) => <ActivityCard key={update.id} update={update} />)
          ) : (
            <EmptyState icon={MessageCircle} title="No pod activity yet." />
          )}
        </section>
      )}
    </div>
  );
}

function UpdatesHeader() {
  return (
    <header>
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">RidePod</p>
        <h1 className="mt-1 text-3xl font-black text-[var(--rp-text)]">Updates</h1>
      </div>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] text-sm font-black transition",
        active ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)]" : "text-[var(--rp-muted-strong)]",
      )}
    >
      {children}
    </button>
  );
}

function formatRideRoute(ride: HomeRide) {
  return `${ride.fromLabel} -> ${ride.toLabel}`;
}

function formatRideTime(ride: HomeRide) {
  return `${ride.dateLabel} - ${ride.timeLabel}`;
}

function NotificationCard({
  notification,
  relatedRide,
  onOpen,
  onClear,
}: {
  notification: RidePodUserNotificationRow;
  relatedRide?: HomeRide | null;
  onOpen: () => void;
  onClear: () => void;
}) {
  const unread = !notification.read_at;
  const displayBody = notification.type === "demo_ride_app_estimate_needed" ? null : notification.body;
  const viewStatusLabel = unread ? "Not viewed" : "Viewed";

  return (
    <article
      className={cn(
        "grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 rounded-[20px] border bg-[var(--rp-card)] p-4 text-left shadow-[var(--rp-shadow-soft)]",
        unread ? "border-[var(--rp-border-strong)]" : "border-[var(--rp-border)] opacity-80",
      )}
    >
      <span className="mt-1 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
        <Bell className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <span className="block text-base font-black text-[var(--rp-text)]">{notification.title}</span>
        </button>
        {displayBody ? (
          <span className="mt-1 block text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{displayBody}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <span className="whitespace-nowrap text-xs font-bold text-[var(--rp-muted)]">{timeAgo(notification.created_at)}</span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]",
            unread
              ? "border-[var(--rp-primary)]/45 bg-[var(--rp-primary)]/15 text-[var(--rp-primary)]"
              : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
          )}
        >
          {viewStatusLabel}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </span>
      {relatedRide ? (
        <button type="button" onClick={onOpen} className="col-span-3 text-left">
          <NotificationRouteGraphic ride={relatedRide} />
        </button>
      ) : notification.related_pod_id ? (
        <button type="button" onClick={onOpen} className="col-span-3 text-left text-xs font-black text-[var(--rp-primary)]">
          Pod {notification.related_pod_id}
        </button>
      ) : null}
    </article>
  );
}

function NotificationRouteGraphic({ ride }: { ride: HomeRide }) {
  return (
    <span className="block rounded-[18px] border border-[var(--rp-primary)]/25 bg-[var(--rp-card-soft)] px-4 py-3">
      <span className="block truncate text-base font-black leading-5 text-[var(--rp-text)]">
        {ride.fromLabel} {"->"} {ride.toLabel}
      </span>
      <span className="mt-2 block border-t border-white/10 pt-2 text-xs font-bold text-[var(--rp-muted-strong)]">
        {formatRideTime(ride)}
      </span>
    </span>
  );
}

function ActivityCard({ update }: { update: RidePodLiveUpdateRow }) {
  return (
    <Link
      href={`/pods/${encodeURIComponent(update.pod_id)}/chat`}
      className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]"
    >
      <span className="mt-1 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
        <MessageCircle className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black text-[var(--rp-text)]">{update.message ?? update.update_type}</span>
        <span className="mt-1 block text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">
          {update.update_type.replaceAll("_", " ")}
        </span>
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-[var(--rp-muted)]">
        <Clock3 className="h-3.5 w-3.5" />
        {timeAgo(update.created_at)}
      </span>
    </Link>
  );
}

function EmptyState({ icon: Icon, title }: { icon: typeof Bell; title: string }) {
  return (
    <div className="flex min-h-[108px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-6 text-center">
      <Icon className="mx-auto h-7 w-7 text-[var(--rp-primary)]" />
      <p className="mt-3 w-full text-center text-sm font-black text-[var(--rp-text)]">{title}</p>
    </div>
  );
}
