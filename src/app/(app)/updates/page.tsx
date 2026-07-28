"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Info,
  MapPin,
  MessageCircle,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui";
import {
  clearNotification,
  createUserNotificationOnce,
  isNotificationCleared,
  listUserNotifications,
  markNotificationRead,
  rememberClearedNotifications,
  type RidePodNotificationType,
} from "@/lib/notifications/ridepod-notifications";
import type { RidePodLiveUpdateRow, RidePodUserNotificationRow } from "@/lib/supabase/types";
import { listUserPodActivity, type PodLiveUpdateType } from "@/lib/updates/ridepod-live-updates";
import { useAuth } from "@/providers/AuthProvider";
import { createdHomeRideViewerIdentityFromAuth, useCreatedHomeRides } from "@/lib/created-home-rides";
import { getRideAppHostFareEstimate } from "@/lib/ride-app-fare-estimate";
import type { HomeRide } from "@/lib/home-ride-mock";

type UpdatesTab = "notifications" | "activity";

const clearedNotificationStorageKey = "ridepod:cleared-notifications";
const activityNotificationTypes = new Set<RidePodNotificationType>([
  "pod_join_requested",
  "ride_app_action_required",
  "ride_app_rejoin_requested",
  "taxi_quote_ready",
  "all_guests_accepted",
  "ready_for_pickup",
  "proof_uploaded",
  "dispute_opened",
  "settlement_ready",
  "demo_ride_app_estimate_needed",
]);
const actionablePodUpdateTypes = new Set<PodLiveUpdateType>([
  "taxi_quote_ready",
  "all_guests_accepted",
  "ready_for_pickup",
  "issue_reported",
  "settlement_ready",
]);

type PodActivityItem =
  | { kind: "notification"; notification: RidePodUserNotificationRow; createdAt: string | null }
  | { kind: "update"; update: RidePodLiveUpdateRow; createdAt: string | null };

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

function getDemoEstimateDedupeKey(userId: string, rideId: string) {
  return [userId, userId, rideId, "demo_ride_app_estimate_needed"].join(":");
}

function isPodActivityNotification(notification: RidePodUserNotificationRow) {
  return activityNotificationTypes.has(notification.type as RidePodNotificationType);
}

function isActionablePodUpdate(update: RidePodLiveUpdateRow) {
  return actionablePodUpdateTypes.has(update.update_type as PodLiveUpdateType);
}

function sortActivityItemsByNewest(a: PodActivityItem, b: PodActivityItem) {
  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
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

  const passiveNotifications = useMemo(
    () => notifications.filter((notification) => !isPodActivityNotification(notification)),
    [notifications],
  );
  const activityNotifications = useMemo(
    () => notifications.filter(isPodActivityNotification),
    [notifications],
  );
  const podActivityItems = useMemo(
    () =>
      [
        ...activityNotifications.map((notification) => ({
          kind: "notification" as const,
          notification,
          createdAt: notification.created_at,
        })),
        ...activity.filter(isActionablePodUpdate).map((update) => ({
          kind: "update" as const,
          update,
          createdAt: update.created_at,
        })),
      ].sort(sortActivityItemsByNewest),
    [activity, activityNotifications],
  );
  const unreadCount = useMemo(
    () => passiveNotifications.filter((notification) => !notification.read_at).length,
    [passiveNotifications],
  );
  const activityUnreadCount = useMemo(
    () => activityNotifications.filter((notification) => !notification.read_at).length,
    [activityNotifications],
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
    setNotifications(notificationResult.notifications.filter((notification) => !isNotificationCleared(notification, user.id)));
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
    const interval = window.setInterval(onRefreshRequested, 10_000);

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

  async function markVisibleNotificationsRead() {
    await Promise.all(
      passiveNotifications
        .filter((notification) => !notification.read_at)
        .map((notification) => markNotificationRead(notification.id)),
    );
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
    rememberClearedNotifications(passiveNotifications, user.id);
    setNotifications((current) => current.filter(isPodActivityNotification));
    await Promise.all(passiveNotifications.map((notification) => clearNotification(notification.id)));
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
          {activityUnreadCount ? <span className="rounded-full bg-[var(--rp-primary)] px-2 py-0.5 text-[10px] text-[var(--rp-primary-text)]">{activityUnreadCount}</span> : null}
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
                disabled={!passiveNotifications.length}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-muted-strong)] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                All Clear
              </button>
              <button
                type="button"
                onClick={markVisibleNotificationsRead}
                disabled={!unreadCount}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-primary)] disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            </div>
          </div>
          {passiveNotifications.length ? (
            passiveNotifications.map((notification) => (
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
          {podActivityItems.length ? (
            podActivityItems.map((item) =>
              item.kind === "notification" ? (
                <PodActionCard
                  key={item.notification.id}
                  notification={item.notification}
                  relatedRide={createdHomeRides.find((ride) => ride.id === item.notification.related_pod_id) ?? null}
                  onOpen={() => openNotification(item.notification)}
                  onClear={() => clearOneNotification(item.notification.id)}
                />
              ) : (
                <ActivityCard key={item.update.id} update={item.update} />
              ),
            )
          ) : (
            <EmptyState icon={MessageCircle} title="No pod activity needs action." />
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

type NotificationVisualTone = "success" | "danger" | "warning" | "info";

type NotificationPresentation = {
  actionLabel: string;
  stateLabel: string;
  summary: string;
  tone: NotificationVisualTone;
  Icon: LucideIcon;
};

function getNotificationPresentation(notification: RidePodUserNotificationRow): NotificationPresentation {
  const title = notification.title.toLowerCase();

  if (notification.type === "attendance_cancelled" || title.includes("cancelled") || title.includes("canceled")) {
    return {
      actionLabel: "Ride cancelled",
      stateLabel: "Not going",
      summary: "This ride is no longer active for you.",
      tone: "danger",
      Icon: XCircle,
    };
  }

  if (notification.type === "pod_joined" || title.includes("joined")) {
    return {
      actionLabel: "Joined",
      stateLabel: "In your rides",
      summary: "You are now part of this ride.",
      tone: "success",
      Icon: CheckCircle2,
    };
  }

  if (notification.type === "pod_join_approved") {
    return {
      actionLabel: "Approved",
      stateLabel: "Ready to ride",
      summary: "Your request was approved.",
      tone: "success",
      Icon: CheckCircle2,
    };
  }

  if (notification.type === "pod_join_declined") {
    return {
      actionLabel: "Request declined",
      stateLabel: "Not joined",
      summary: "This ride did not accept your request.",
      tone: "danger",
      Icon: XCircle,
    };
  }

  if (notification.type === "attendance_changed" || title.includes("changed") || title.includes("updated")) {
    return {
      actionLabel: "Ride changed",
      stateLabel: "Review details",
      summary: "Something important changed for this ride.",
      tone: "warning",
      Icon: CircleAlert,
    };
  }

  return {
    actionLabel: "Ride update",
    stateLabel: "New info",
    summary: "Open this update to review the ride details.",
    tone: "info",
    Icon: Info,
  };
}

function getToneClasses(tone: NotificationVisualTone) {
  switch (tone) {
    case "success":
      return {
        card: "border-emerald-300/38 bg-[linear-gradient(145deg,rgba(8,24,22,0.98),rgba(5,15,24,0.98))]",
        icon: "border-emerald-300/24 bg-emerald-300/12 text-emerald-200",
        badge: "border-emerald-300/34 bg-emerald-300/14 text-emerald-100",
        rail: "bg-emerald-300",
      };
    case "danger":
      return {
        card: "border-rose-300/34 bg-[linear-gradient(145deg,rgba(29,12,17,0.96),rgba(5,15,24,0.98))]",
        icon: "border-rose-300/24 bg-rose-300/12 text-rose-100",
        badge: "border-rose-300/34 bg-rose-300/14 text-rose-100",
        rail: "bg-rose-300",
      };
    case "warning":
      return {
        card: "border-[var(--rp-primary)]/38 bg-[linear-gradient(145deg,rgba(35,25,7,0.88),rgba(5,15,24,0.98))]",
        icon: "border-[var(--rp-primary)]/30 bg-[var(--rp-primary)]/14 text-[var(--rp-primary)]",
        badge: "border-[var(--rp-primary)]/42 bg-[var(--rp-primary)]/16 text-[var(--rp-primary)]",
        rail: "bg-[var(--rp-primary)]",
      };
    default:
      return {
        card: "border-sky-300/30 bg-[linear-gradient(145deg,rgba(7,22,32,0.96),rgba(5,15,24,0.98))]",
        icon: "border-sky-300/22 bg-sky-300/12 text-sky-100",
        badge: "border-sky-300/30 bg-sky-300/14 text-sky-100",
        rail: "bg-sky-300",
      };
  }
}

function notificationMetadataRecord(notification: RidePodUserNotificationRow) {
  const metadata = notification.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as Record<string, unknown>;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNotificationRideSummary(notification: RidePodUserNotificationRow, relatedRide?: HomeRide | null) {
  if (relatedRide) {
    return {
      route: formatRideRoute(relatedRide),
      time: formatRideTime(relatedRide),
    };
  }

  const metadata = notificationMetadataRecord(notification);
  const route = metadataString(metadata, "route");
  const time = metadataString(metadata, "rideTime") ?? metadataString(metadata, "time");

  if (!route && !time) return null;

  return {
    route: route ?? "Ride route",
    time: time ?? "Time not set",
  };
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
  const presentation = getNotificationPresentation(notification);
  const toneClasses = getToneClasses(presentation.tone);
  const rideSummary = getNotificationRideSummary(notification, relatedRide);
  const Icon = presentation.Icon;

  return (
    <article
      className={cn(
        "relative grid w-full grid-cols-[auto_1fr] gap-3 overflow-hidden rounded-[22px] border p-4 text-left shadow-[var(--rp-shadow-soft)] min-[560px]:grid-cols-[auto_1fr_auto]",
        toneClasses.card,
        !unread && "opacity-80",
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full", toneClasses.rail)} />
      <span className={cn("mt-1 grid h-12 w-12 place-items-center rounded-[18px] border", toneClasses.icon)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]", toneClasses.badge)}>
              {presentation.actionLabel}
            </span>
            <span className="text-xs font-black text-[var(--rp-muted)]">{timeAgo(notification.created_at)}</span>
          </span>
          <span className="mt-2 block text-lg font-black leading-tight text-[var(--rp-text)]">{notification.title}</span>
        </button>
        {displayBody ? (
          <span className="mt-1 block text-sm font-black leading-5 text-[var(--rp-text)]">{displayBody}</span>
        ) : null}
        <span className="mt-2 block text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
          {presentation.summary}
        </span>
      </span>
      <span className="col-span-2 flex flex-wrap items-center gap-2 min-[560px]:col-span-1 min-[560px]:flex-col min-[560px]:items-end">
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
        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]", toneClasses.badge)}>
          {presentation.stateLabel}
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
      {rideSummary ? (
        <button type="button" onClick={onOpen} className="col-span-2 text-left min-[560px]:col-span-3">
          <NotificationRouteGraphic route={rideSummary.route} time={rideSummary.time} />
        </button>
      ) : notification.related_pod_id ? (
        <button type="button" onClick={onOpen} className="col-span-2 text-left text-xs font-black text-[var(--rp-primary)] min-[560px]:col-span-3">
          Pod {notification.related_pod_id}
        </button>
      ) : null}
    </article>
  );
}

function PodActionCard({
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
  const titleClassName =
    notification.type === "demo_ride_app_estimate_needed" ? "text-[var(--rp-primary)]" : "text-[var(--rp-text)]";
  const rideSummary = getNotificationRideSummary(notification, relatedRide);

  return (
    <article
      className={cn(
        "grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 rounded-[20px] border bg-[var(--rp-card)] p-4 text-left shadow-[var(--rp-shadow-soft)]",
        unread ? "border-[var(--rp-primary)]/50" : "border-[var(--rp-border)] opacity-80",
      )}
    >
      <span className="mt-1 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--rp-primary)]/15 text-[var(--rp-primary)]">
        <CircleAlert className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <span className={cn("block text-base font-black", titleClassName)}>{notification.title}</span>
        </button>
        {displayBody ? (
          <span className="mt-1 block text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{displayBody}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <span className="whitespace-nowrap text-xs font-bold text-[var(--rp-muted)]">{timeAgo(notification.created_at)}</span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </span>
      {rideSummary ? (
        <button type="button" onClick={onOpen} className="col-span-3 text-left">
          <NotificationRouteGraphic route={rideSummary.route} time={rideSummary.time} />
        </button>
      ) : notification.related_pod_id ? (
        <button type="button" onClick={onOpen} className="col-span-3 text-left text-xs font-black text-[var(--rp-primary)]">
          Pod {notification.related_pod_id}
        </button>
      ) : null}
    </article>
  );
}

function NotificationRouteGraphic({ route, time }: { route: string; time: string }) {
  return (
    <span className="grid gap-2 rounded-[18px] border border-white/12 bg-[#13202a]/88 px-4 py-3 min-[520px]:grid-cols-[minmax(0,1.35fr)_minmax(150px,0.65fr)]">
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-muted)]">
          <MapPin className="h-3.5 w-3.5" />
          Route
        </span>
        <span className="mt-1 block truncate text-base font-black leading-5 text-[var(--rp-text)]">
          {route}
        </span>
      </span>
      <span className="min-w-0 border-t border-white/10 pt-2 min-[520px]:border-l min-[520px]:border-t-0 min-[520px]:pl-3 min-[520px]:pt-0">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-muted)]">
          <CalendarDays className="h-3.5 w-3.5" />
          When
        </span>
        <span className="mt-1 block truncate text-sm font-black leading-5 text-[var(--rp-text)]">
          {time}
        </span>
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
