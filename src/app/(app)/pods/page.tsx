"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogIn,
  Plane,
  RefreshCcw,
  Send,
  SlidersHorizontal,
  Smartphone,
  Star,
  Bookmark,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui";
import { CountdownTimer } from "@/components/ride-groups/ride-groups-flow";
import { createdHomeRideViewerIdentityFromAuth, useCreatedCalendarRides } from "@/lib/created-home-rides";
import { useAuth } from "@/providers/AuthProvider";
import {
  buildMonthDays,
  dateFromKey,
  dateKey,
  getMyRideCalendarItems,
  getMyRideCalendarRole,
  getMyRideCalendarStatus,
  monthLabel,
  timeLabel,
  weekdays,
  type CalendarRide,
  type MyRideCalendarStatus,
} from "@/lib/my-ride-calendar-mock";
import {
  getDraftPodInvitationCards,
  getRideCallInterests,
  getViewerInterest,
  rideTypeLabel as rideCallRideTypeLabel,
  useRideGroupsState,
  type RideCall,
} from "@/lib/ride-groups";

type StatusTone = "action" | "upcoming" | "completed" | "cancelled";
type RideTypeTone = "taxi" | "ride_app" | "airport" | "recurring";
type ActivityItemKind = "request" | "ride";
type MyActivityView = "all" | "requests" | "rides" | "bookmarked" | "joined" | "interested" | "tracked";
type MyActivityTone = RideTypeTone | "request";
type MyQuickAccessView = "created" | "requests" | "bookmarked";
type MyActivityItem = {
  key: string;
  id: string;
  kind: ActivityItemKind;
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  relationship: string;
  href: string;
  tone: MyActivityTone;
  bookmarked: boolean;
  isMine: boolean;
  isJoined: boolean;
  isInterested: boolean;
};

const myActivityBookmarkStorageKey = "ridepod-my-activity-bookmarks-v1";
const myActivityBookmarkUpdateEventName = "ridepod-my-activity-bookmarks-updated";

function ridesByDateMap(rides: CalendarRide[]) {
  return rides.reduce<Record<string, CalendarRide[]>>((groups, ride) => {
    groups[ride.date] = [...(groups[ride.date] ?? []), ride].sort((first, second) =>
      first.time.localeCompare(second.time),
    );
    return groups;
  }, {});
}

function readMyActivityBookmarks() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(myActivityBookmarkStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeMyActivityBookmarks(keys: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(myActivityBookmarkStorageKey, JSON.stringify(keys));
  window.dispatchEvent(new Event(myActivityBookmarkUpdateEventName));
}

function bookmarkSnapshotFromKeys(keys: string[]) {
  return keys.join("\n");
}

function readMyActivityBookmarkSnapshot() {
  return bookmarkSnapshotFromKeys(readMyActivityBookmarks());
}

function subscribeToMyActivityBookmarks(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === myActivityBookmarkStorageKey) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(myActivityBookmarkUpdateEventName, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(myActivityBookmarkUpdateEventName, onStoreChange);
  };
}

function emptyMyActivityBookmarkSnapshot() {
  return "";
}

function parseMyActivityBookmarkSnapshot(snapshot: string) {
  return snapshot ? snapshot.split("\n").filter(Boolean) : [];
}

function selectedDateLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateFromKey(date));
}

function GuestMyRideIntro() {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-10.5rem)] flex-col overflow-hidden rounded-[36px] border border-[color-mix(in_srgb,var(--rp-primary)_58%,transparent)] bg-[radial-gradient(circle_at_88%_5%,rgba(245,188,73,0.22),transparent_30%),radial-gradient(circle_at_18%_82%,rgba(48,197,190,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018)),#06101a] px-6 pb-7 pt-8 shadow-[0_34px_92px_rgba(0,0,0,0.48)] min-[390px]:px-8 min-[390px]:pb-8 min-[390px]:pt-10">
      <div className="pointer-events-none absolute inset-0 rounded-[36px] border border-white/[0.035]" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--rp-primary)_20%,transparent)] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(1,10,17,0.42)_58%,rgba(1,10,17,0.84))]" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="grid gap-7">
          <span className="grid h-20 w-20 place-items-center rounded-[24px] border border-[color-mix(in_srgb,var(--rp-primary)_58%,transparent)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] text-[var(--rp-primary)] shadow-[0_20px_46px_rgba(245,188,73,0.20)] min-[390px]:h-24 min-[390px]:w-24 min-[390px]:rounded-[28px]">
            <CarFront className="h-9 w-9 min-[390px]:h-11 min-[390px]:w-11" />
          </span>

          <div>
            <h1 className="max-w-full text-[38px] font-black leading-[1.02] tracking-normal text-[var(--rp-text)] min-[390px]:text-[42px] min-[720px]:text-[58px]">
              Share the ride.
              <span className="mt-2 inline-flex max-w-full rounded-full bg-[linear-gradient(135deg,#f8d876,#f2bd42_54%,#f8d876)] px-3 pb-1.5 pt-0.5 text-[0.82em] leading-none text-[#06101a] shadow-[0_16px_34px_rgba(245,188,73,0.28)] min-[390px]:px-4">
                Split the cost.
              </span>
            </h1>
            <p className="mt-5 max-w-[29ch] text-left text-base font-semibold leading-7 text-[color-mix(in_srgb,var(--rp-text)_78%,transparent)] min-[390px]:text-lg min-[390px]:leading-8">
              Create or join RidePods, share your journey, and split the ride cost with other passengers.
            </p>
          </div>
        </div>

        <div className="relative -mx-6 mt-4 h-[clamp(250px,58vw,360px)] min-[390px]:-mx-8 min-[390px]:mt-5">
          <Image
            src="/images/ridepod/my-ride-guest-car-city.png"
            alt="RidePod city car illustration"
            fill
            priority
            sizes="(max-width: 768px) 92vw, 560px"
            className="object-contain object-top opacity-95"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,#06101a,rgba(6,16,26,0))]" />
        </div>

        <div className="relative z-10 grid gap-5">
          <Link
            href="/register?next=/pods"
            className="inline-flex min-h-16 items-center justify-center gap-3 rounded-full bg-[#fbf6eb] px-6 text-base font-black text-[#07111a] shadow-[0_18px_42px_rgba(0,0,0,0.34)] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rp-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06101a] min-[390px]:text-lg"
          >
            <UserPlus className="h-6 w-6" />
            Create an Account
          </Link>

          <p className="text-center text-base font-semibold text-[color-mix(in_srgb,var(--rp-text)_72%,transparent)] min-[390px]:text-lg">
            Already have an account?{" "}
            <Link href="/login?next=/pods" className="inline-flex items-center gap-2 font-black text-[var(--rp-primary)] underline decoration-[var(--rp-primary)] underline-offset-4 transition hover:text-[var(--rp-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rp-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06101a]">
              Login
              <LogIn className="h-5 w-5" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function isHistoryRide(ride: CalendarRide, todayKey: string) {
  return ride.date < todayKey || ride.status === "cancelled" || ride.status === "cancelled_by_host" || ride.status === "cancelled_by_system";
}

function statusTone(status: MyRideCalendarStatus): StatusTone {
  if (status.isActionNeeded || status.colorKey === "gold") return "action";
  if (status.statusKey === "completed") return "completed";
  if (status.statusKey === "cancelled" || status.statusKey === "cancelled_by_host" || status.statusKey === "expired") return "cancelled";
  return "upcoming";
}

function dayMarkerTone(rides: CalendarRide[], currentUserId?: string | null): StatusTone | null {
  if (!rides.length) return null;

  const tones = rides.map((ride) =>
    statusTone(getMyRideCalendarStatus({ pod: ride, currentUserId, role: getMyRideCalendarRole(ride, currentUserId) })),
  );

  if (tones.includes("action")) return "action";
  if (tones.includes("upcoming")) return "upcoming";
  if (tones.includes("completed")) return "completed";
  return "cancelled";
}

function markerDotClass(tone: StatusTone) {
  const classes: Record<StatusTone, string> = {
    action: "bg-[var(--rp-primary)] shadow-[0_0_14px_rgba(242,193,91,0.55)]",
    upcoming: "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)]",
    completed: "bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.35)]",
    cancelled: "bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.32)]",
  };

  return classes[tone];
}

function markerBadgeClass(tone: StatusTone) {
  const classes: Record<StatusTone, string> = {
    action: "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[#07111a] shadow-[0_0_18px_rgba(242,193,91,0.38)]",
    upcoming: "border-cyan-300 bg-cyan-300 text-[#06212a] shadow-[0_0_18px_rgba(34,211,238,0.34)]",
    completed: "border-emerald-300 bg-emerald-300 text-[#052e1a]",
    cancelled: "border-rose-300 bg-rose-300 text-[#320610]",
  };

  return classes[tone];
}

function statusChipClass(tone: StatusTone) {
  const classes: Record<StatusTone, string> = {
    action: "border-[color-mix(in_srgb,var(--rp-primary)_62%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_15%,transparent)] text-[var(--rp-primary)]",
    upcoming: "border-cyan-300/45 bg-cyan-300/10 text-cyan-100",
    completed: "border-emerald-300/45 bg-emerald-300/10 text-emerald-100",
    cancelled: "border-rose-300/40 bg-rose-400/10 text-rose-100",
  };

  return classes[tone];
}

function rideTypeClass(tone: RideTypeTone) {
  const classes: Record<RideTypeTone, string> = {
    taxi: "border-[color-mix(in_srgb,var(--rp-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_13%,transparent)] text-[var(--rp-primary)]",
    ride_app: "border-cyan-300/50 bg-cyan-300/10 text-cyan-100",
    airport: "border-blue-300/45 bg-blue-400/10 text-blue-100",
    recurring: "border-emerald-300/45 bg-emerald-300/10 text-emerald-100",
  };

  return classes[tone];
}

function getRideTypeTone(ride: CalendarRide): RideTypeTone {
  if (ride.rideMode === "ride_app") return "ride_app";
  return "taxi";
}

function getRouteStops(route: string) {
  const parts = route.split(/\s*(?:->|→|\bto\b)\s*/i).filter(Boolean);
  if (parts.length >= 2) {
    return {
      pickup: parts[0].trim(),
      dropoff: parts.slice(1).join(" to ").trim(),
    };
  }

  return {
    pickup: route,
    dropoff: "Destination details",
  };
}

function getRequestStatusLabel(rideCall: RideCall, interestCount: number) {
  if (rideCall.status === "ready_to_convert" || interestCount >= rideCall.targetPeopleCount) return "Ready";
  if (rideCall.status === "converted") return "Converted";
  if (rideCall.status === "cancelled") return "Cancelled";
  if (rideCall.status === "expired") return "Expired";
  return "Open";
}

function ActivityBookmarkButton({
  bookmarked,
  label,
  onClick,
}: {
  bookmarked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={bookmarked ? `Remove ${label} bookmark` : `Bookmark ${label}`}
      aria-pressed={bookmarked}
      onClick={onClick}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full border bg-[#07121c]/92 text-[var(--rp-muted-strong)] shadow-[0_12px_26px_rgba(0,0,0,0.26)] transition hover:border-[var(--rp-primary)] hover:text-[var(--rp-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rp-primary)]",
        bookmarked &&
          "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,#07121c)] text-[var(--rp-primary)]",
      )}
    >
      <Star className={cn("h-5 w-5", bookmarked && "fill-current")} />
    </button>
  );
}

function MyRideQuickAccess({
  items,
  counts,
  activeView,
  onSelect,
}: {
  items: MyActivityItem[];
  counts: Record<MyActivityView, number>;
  activeView: MyQuickAccessView | null;
  onSelect: (view: MyQuickAccessView) => void;
}) {
  const entries: Array<{
    label: string;
    view: MyQuickAccessView;
    icon: LucideIcon;
    count: number;
    tone: "purple" | "orange" | "rose";
  }> = [
    {
      label: "My Created Ride",
      view: "created",
      icon: CarFront,
      count: items.filter((item) => item.kind === "ride" && item.isMine).length,
      tone: "purple",
    },
    {
      label: "My Request",
      view: "requests",
      icon: Send,
      count: items.filter((item) => item.kind === "request" && item.isMine).length,
      tone: "orange",
    },
    {
      label: "Bookmark",
      view: "bookmarked",
      icon: Bookmark,
      count: counts.bookmarked,
      tone: "rose",
    },
  ];

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-[var(--rp-text)]">Quick Access</h2>
        <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--rp-muted-strong)]">
          Calendar first
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {entries.map((entry) => {
          const Icon = entry.icon;
          const buttonToneClass =
            entry.tone === "purple"
              ? "border-violet-300 bg-violet-500 text-white hover:bg-violet-400"
              : entry.tone === "orange"
                ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[#07111a] hover:bg-[#ffd86b]"
                : "border-rose-300 bg-rose-500 text-white hover:bg-rose-400";
          const iconToneClass =
            entry.tone === "orange"
              ? "border-[#07111a]/18 bg-[#07111a]/12 text-[#07111a]"
              : "border-white/28 bg-white/18 text-white";

          return (
            <button
              key={entry.label}
              type="button"
              aria-pressed={activeView === entry.view}
              onClick={() => onSelect(entry.view)}
              className={cn(
                "group grid min-h-[86px] justify-items-center rounded-[18px] border px-2.5 py-3 text-center shadow-[0_14px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.22)] transition",
                buttonToneClass,
                activeView === entry.view
                  ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#07111a]"
                  : "ring-0",
              )}
            >
              <span className={cn("relative grid h-10 w-10 place-items-center rounded-full border", iconToneClass)}>
                <Icon className="h-5 w-5" />
                {entry.count ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#07111a] px-1 text-[10px] font-black text-[var(--rp-primary)]">
                    {entry.count}
                  </span>
                ) : null}
              </span>
              <span className="mt-2 line-clamp-2 text-[11px] font-black leading-4">
                {entry.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function QuickAccessActivityCard({ item }: { item: MyActivityItem }) {
  const Icon = item.kind === "request" ? Send : item.tone === "ride_app" ? Smartphone : CarFront;
  const toneClass =
    item.kind === "request"
      ? "border-orange-300/30 bg-orange-300/10 text-orange-200"
      : item.tone === "ride_app"
        ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200"
        : "border-[color-mix(in_srgb,var(--rp-primary)_34%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]";

  return (
    <Link
      href={item.href}
      className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--rp-border)] bg-[#101a25]/78 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition hover:border-cyan-300/28 hover:bg-[#142231]"
    >
      <span className={cn("grid h-11 w-11 place-items-center rounded-[15px] border", toneClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-black text-[var(--rp-text)]">{item.title}</span>
          {item.bookmarked ? <Star className="h-3.5 w-3.5 shrink-0 fill-[var(--rp-primary)] text-[var(--rp-primary)]" /> : null}
        </span>
        <span className="mt-1 block truncate text-xs font-bold text-[var(--rp-muted-strong)]">{item.subtitle}</span>
        <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/7 px-2 py-1 text-[10px] font-black uppercase text-[var(--rp-muted-strong)]">
            {item.relationship}
          </span>
          <span className="rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] px-2 py-1 text-[10px] font-black text-[var(--rp-primary)]">
            {item.badge}
          </span>
        </span>
      </span>
      <ChevronRight className="h-5 w-5 text-[var(--rp-muted)]" />
    </Link>
  );
}

function MyRideQuickAccessItems({
  view,
  items,
}: {
  view: MyQuickAccessView;
  items: MyActivityItem[];
}) {
  const labels: Record<MyQuickAccessView, { title: string; empty: string }> = {
    created: {
      title: "My Created Ride",
      empty: "No created rides yet.",
    },
    requests: {
      title: "My Request",
      empty: "No active requests yet.",
    },
    bookmarked: {
      title: "Bookmark",
      empty: "No bookmarked items yet.",
    },
  };

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[var(--rp-text)]">{labels[view].title}</h2>
        <span className="rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] px-2.5 py-1 text-[11px] font-black text-[var(--rp-primary)]">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 grid gap-2.5">
        {items.length ? (
          items.map((item) => <QuickAccessActivityCard key={item.key} item={item} />)
        ) : (
          <div className="rounded-[18px] border border-white/10 bg-[#101a25]/78 p-4 text-sm font-bold text-[var(--rp-muted-strong)]">
            {labels[view].empty}
          </div>
        )}
      </div>
    </section>
  );
}

function CalendarDayCell({
  day,
  rides,
  today,
  selected,
  currentUserId,
  onSelect,
}: {
  day: Date | null;
  rides: CalendarRide[];
  today: boolean;
  selected: boolean;
  currentUserId?: string | null;
  onSelect: (date: string) => void;
}) {
  if (!day) return <div className="min-h-[52px] min-[390px]:min-h-[58px]" />;

  const key = dateKey(day);
  const marker = dayMarkerTone(rides, currentUserId);
  const showBadge = Boolean(marker && (selected || marker === "action" || rides.length > 1));

  return (
    <button
      type="button"
      onClick={() => onSelect(key)}
      className={cn(
        "grid min-h-[52px] w-full content-start justify-items-center rounded-[16px] border px-1 py-1.5 text-center transition min-[390px]:min-h-[58px] min-[390px]:rounded-[18px] min-[390px]:px-1.5 min-[390px]:py-2",
        selected &&
          "border-cyan-300/80 bg-cyan-300/12 text-[var(--rp-text)] shadow-[0_0_26px_rgba(34,211,238,0.22)]",
        !selected && marker === "action" && "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_8%,transparent)] text-[var(--rp-text)]",
        !selected && !marker && today && "border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]",
        !selected && !marker && !today && "border-transparent text-[var(--rp-muted)] hover:border-[var(--rp-border)] hover:bg-[var(--rp-card-muted)]",
        !selected && marker && marker !== "action" && "border-transparent text-[var(--rp-muted-strong)] hover:border-[var(--rp-border)] hover:bg-[var(--rp-card-muted)]",
      )}
      aria-current={selected ? "date" : undefined}
      aria-label={`${selectedDateLabel(key)}${rides.length ? `, ${rides.length} ride${rides.length === 1 ? "" : "s"}` : ", no rides"}`}
    >
      <span className="text-base font-black leading-6 min-[390px]:text-lg">{day.getDate()}</span>
      {marker ? (
        showBadge ? (
          <span className={cn("mt-0.5 grid h-6 min-w-6 place-items-center rounded-full border px-1 text-xs font-black min-[390px]:mt-1", markerBadgeClass(marker))}>
            {rides.length}
          </span>
        ) : (
          <span className={cn("mt-2 h-2.5 w-2.5 rounded-full", markerDotClass(marker))} />
        )
      ) : null}
    </button>
  );
}

function RideKindBadge({ ride }: { ride: CalendarRide }) {
  if (ride.rideKind === "airport") {
    return (
      <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black", rideTypeClass("airport"))}>
        <Plane className="h-3.5 w-3.5" />
        Airport
      </span>
    );
  }

  if (ride.rideKind === "recurring") {
    return (
      <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black", rideTypeClass("recurring"))}>
        <RefreshCcw className="h-3.5 w-3.5" />
        Recurring
      </span>
    );
  }

  return null;
}

function StatusBadge({ status }: { status: MyRideCalendarStatus }) {
  const tone = statusTone(status);
  const Icon = tone === "action" ? AlertCircle : tone === "completed" ? CheckCircle2 : tone === "cancelled" ? XCircle : Clock3;

  return (
    <span className={cn("inline-flex min-h-8 max-w-full shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black", statusChipClass(tone))}>
      <Icon className="h-3.5 w-3.5" />
      <span className="min-w-0 truncate">{status.label}</span>
    </span>
  );
}

function MyRideDayPodCard({
  ride,
  currentUserId,
  bookmarked,
  onToggleBookmark,
}: {
  ride: CalendarRide;
  currentUserId?: string | null;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const role = getMyRideCalendarRole(ride, currentUserId);
  const status = getMyRideCalendarStatus({ pod: ride, currentUserId, role });
  const routeStops = getRouteStops(ride.route);
  const rideTypeTone = getRideTypeTone(ride);
  const Icon = rideTypeTone === "ride_app" ? Smartphone : CarFront;
  const cancelledByHost = status.statusKey === "cancelled_by_host";
  const createSimilarHref = `/create?similarRideId=${encodeURIComponent(ride.id)}&pickup=${encodeURIComponent(routeStops.pickup)}&destination=${encodeURIComponent(routeStops.dropoff)}&rideType=${encodeURIComponent(ride.rideKind)}&seats=${encodeURIComponent(String(ride.seatsTotal))}`;

  return (
    <article
      className={cn(
        "relative min-w-0 overflow-hidden rounded-[22px] border bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))] p-3 shadow-[var(--rp-shadow-soft)] min-[390px]:p-4",
        cancelledByHost ? "border-rose-300/45 shadow-[0_18px_42px_rgba(244,63,94,0.12)]" : "border-[var(--rp-border)]",
      )}
    >
      <div className="absolute right-3 top-3 z-10">
        <ActivityBookmarkButton bookmarked={bookmarked} label="ride" onClick={onToggleBookmark} />
      </div>
      <div className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)] gap-3 min-[390px]:grid-cols-[68px_minmax(0,1fr)]">
        <div
          className={cn(
            "grid h-14 w-14 place-items-center rounded-[18px] border min-[390px]:h-[68px] min-[390px]:w-[68px]",
            rideTypeTone === "ride_app"
              ? "border-cyan-300/28 bg-cyan-300/10 text-cyan-200"
              : "border-[color-mix(in_srgb,var(--rp-primary)_34%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]",
          )}
        >
          <Icon className="h-7 w-7" />
        </div>

        <div className="min-w-0 overflow-hidden pr-11">
          <div className="ridepod-my-ride-card-heading grid min-w-0 gap-2">
            <p className="shrink-0 whitespace-nowrap text-left text-xl font-black leading-6 text-[var(--rp-text)]">{timeLabel(ride.time)}</p>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <StatusBadge status={status} />
              <RideKindBadge ride={ride} />
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
            <div className="grid grid-cols-[12px_minmax(0,1fr)] gap-2">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="min-w-0 break-words text-left">{routeStops.pickup}</span>
            </div>
            <div className="grid grid-cols-[12px_minmax(0,1fr)] gap-2">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-rose-300" />
              <span className="min-w-0 break-words text-left">{routeStops.dropoff}</span>
            </div>
          </div>

          {cancelledByHost ? (
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_112px] gap-2">
              <Link
                href={createSimilarHref}
                className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,#FFD968_0%,#F5B934_100%)] px-3 text-sm font-black text-[#07131C] shadow-[0_8px_20px_rgba(255,193,55,0.2)] transition hover:brightness-105"
              >
                Create Similar Ride
              </Link>
              <Link
                href={`/pods/${ride.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-white/12 bg-white/8 px-3 text-xs font-black text-white transition hover:bg-white/12"
              >
                View Details
              </Link>
            </div>
          ) : (
            <Link
              href={`/pods/${ride.id}`}
              className={cn(
                "mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border px-4 text-sm font-black transition",
                statusTone(status) === "action"
                  ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] text-[var(--rp-primary)] hover:bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)]"
                  : "border-cyan-300/45 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15",
              )}
            >
              View details
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function DraftRidePodInvitationCard({
  invitation,
}: {
  invitation: ReturnType<typeof getDraftPodInvitationCards>[number];
}) {
  const locked = invitation.rider.status === "locked";
  const waitingFor = Math.max(0, invitation.pod.targetSeats - invitation.lockedCount);
  const actionLabel = locked ? "View RidePod" : "Confirm your seat";
  const href = locked ? `/pods/${invitation.pod.id}` : invitation.href;

  return (
    <Link
      href={href}
      className="grid gap-3 rounded-[20px] border border-[color-mix(in_srgb,var(--rp-primary)_42%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rp-primary)_14%,transparent),rgba(255,255,255,0.045))] p-4 shadow-[var(--rp-shadow-soft)] transition hover:border-[var(--rp-primary)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--rp-primary)]">Action needed</p>
          <h2 className="mt-1 truncate text-lg font-black text-[var(--rp-text)]">{actionLabel}</h2>
          <p className="mt-1 text-left text-xs font-bold text-[var(--rp-muted-strong)]">
            {`${invitation.group?.name ?? "Draft RidePod"} -> ${invitation.pod.toLabel}`}
          </p>
        </div>
        <AlertCircle className="h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
      </div>
      <div className="grid gap-1.5 text-xs font-bold text-[var(--rp-muted-strong)]">
        <p className="text-left">
          Invite expires in <CountdownTimer deadlineAt={invitation.rider.confirmationExpiresAt} />
        </p>
        <p className="text-left">
          {locked ? `Waiting for ${waitingFor} more locked riders` : "Payment needed before seat locks"}
        </p>
      </div>
    </Link>
  );
}

export default function MyRidePage() {
  const { user, profile, isLoading } = useAuth();
  const currentUserId = user?.id ?? null;
  const viewerIdentity = useMemo(() => createdHomeRideViewerIdentityFromAuth({ profile, user }), [profile, user]);
  const createdCalendarRides = useCreatedCalendarRides(currentUserId, viewerIdentity);
  const { state: rideGroupsState } = useRideGroupsState();
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const bookmarkSnapshot = useSyncExternalStore(
    subscribeToMyActivityBookmarks,
    readMyActivityBookmarkSnapshot,
    emptyMyActivityBookmarkSnapshot,
  );
  const bookmarkedActivityKeys = useMemo(() => parseMyActivityBookmarkSnapshot(bookmarkSnapshot), [bookmarkSnapshot]);
  const bookmarkedActivityKeySet = useMemo(() => new Set(bookmarkedActivityKeys), [bookmarkedActivityKeys]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sortAscending, setSortAscending] = useState(true);
  const [quickAccessView, setQuickAccessView] = useState<MyQuickAccessView | null>(null);

  const myRideItems = useMemo(
    () => [
      ...createdCalendarRides,
      ...getMyRideCalendarItems(currentUserId).filter(
        (ride) => !createdCalendarRides.some((createdRide) => createdRide.id === ride.id),
      ),
    ],
    [createdCalendarRides, currentUserId],
  );
  const activeRideItems = useMemo(
    () => myRideItems.filter((ride) => !isHistoryRide(ride, todayKey)),
    [myRideItems, todayKey],
  );
  const filteredItems = activeRideItems;
  const monthDays = useMemo(() => buildMonthDays(currentMonth), [currentMonth]);
  const ridesByDate = useMemo(() => ridesByDateMap(filteredItems), [filteredItems]);
  const defaultSelectedDate = useMemo(() => {
    const actionRide = filteredItems.find((ride) =>
      getMyRideCalendarStatus({ pod: ride, currentUserId }).isActionNeeded,
    );
    return actionRide?.date ?? filteredItems[0]?.date ?? todayKey;
  }, [currentUserId, filteredItems, todayKey]);
  const effectiveSelectedDate = selectedDate ?? defaultSelectedDate;
  const selectedRides = useMemo(() => {
    const rides = ridesByDate[effectiveSelectedDate] ?? [];
    return [...rides].sort((first, second) =>
      sortAscending ? first.time.localeCompare(second.time) : second.time.localeCompare(first.time),
    );
  }, [effectiveSelectedDate, ridesByDate, sortAscending]);
  const draftInvitations = useMemo(
    () => getDraftPodInvitationCards(rideGroupsState, currentUserId),
    [currentUserId, rideGroupsState],
  );
  const rideActivityItems = useMemo<MyActivityItem[]>(
    () =>
      activeRideItems.map((ride) => {
        const role = getMyRideCalendarRole(ride, currentUserId);
        const status = getMyRideCalendarStatus({ pod: ride, currentUserId, role });
        const key = `ride:${ride.id}`;
        const tone = getRideTypeTone(ride);

        return {
          key,
          id: ride.id,
          kind: "ride" as const,
          title: ride.route,
          subtitle: `${selectedDateLabel(ride.date)} at ${timeLabel(ride.time)}`,
          meta: `${tone === "ride_app" ? "Ride app" : "Taxi"} / ${status.label}`,
          badge: `${ride.seatsFilled}/${ride.seatsTotal} seats`,
          relationship: role === "host" ? "My ride" : "Joined ride",
          href: `/pods/${ride.id}`,
          tone,
          bookmarked: bookmarkedActivityKeySet.has(key),
          isMine: role === "host",
          isJoined: role !== "host",
          isInterested: false,
        };
      }),
    [activeRideItems, bookmarkedActivityKeySet, currentUserId],
  );
  const requestActivityItems = useMemo<MyActivityItem[]>(
    () =>
      rideGroupsState.rideCalls
        .map((rideCall) => {
          const key = `request:${rideCall.id}`;
          const interests = getRideCallInterests(rideGroupsState, rideCall.id);
          const viewerInterest = getViewerInterest(rideGroupsState, rideCall.id, currentUserId);
          const isMine = Boolean(currentUserId && rideCall.createdBy === currentUserId);
          const isInterested = Boolean(viewerInterest);
          const bookmarked = bookmarkedActivityKeySet.has(key);
          const statusLabel = getRequestStatusLabel(rideCall, interests.length);

          return {
            key,
            id: rideCall.id,
            kind: "request" as const,
            title: `${rideCall.fromLabel} -> ${rideCall.toLabel}`,
            subtitle: rideCall.approximateTimeLabel,
            meta: `${rideCall.creatorName} / ${rideCallRideTypeLabel(rideCall.rideType)} / ${statusLabel}`,
            badge: `${interests.length}/${rideCall.targetPeopleCount} interested`,
            relationship: isMine ? "My request" : isInterested ? "Interested" : "Bookmarked request",
            href: `/ride-calls/${rideCall.id}`,
            tone: "request" as const,
            bookmarked,
            isMine,
            isJoined: viewerInterest?.status === "converted",
            isInterested,
          };
        })
        .filter((item) => item.isMine || item.isInterested || item.bookmarked),
    [bookmarkedActivityKeySet, currentUserId, rideGroupsState],
  );
  const activityItems = useMemo(() => [...requestActivityItems, ...rideActivityItems], [requestActivityItems, rideActivityItems]);
  const activityCounts = useMemo<Record<MyActivityView, number>>(
    () => ({
      all: activityItems.length,
      requests: activityItems.filter((item) => item.kind === "request").length,
      rides: activityItems.filter((item) => item.kind === "ride").length,
      bookmarked: activityItems.filter((item) => item.bookmarked).length,
      joined: activityItems.filter((item) => item.isJoined).length,
      interested: activityItems.filter((item) => item.isInterested).length,
      tracked: activityItems.filter((item) => item.bookmarked || item.isJoined || item.isInterested).length,
    }),
    [activityItems],
  );
  const quickAccessItems = useMemo(() => {
    if (quickAccessView === "created") {
      return activityItems.filter((item) => item.kind === "ride" && item.isMine);
    }

    if (quickAccessView === "requests") {
      return activityItems.filter((item) => item.kind === "request" && item.isMine);
    }

    if (quickAccessView === "bookmarked") {
      return activityItems.filter((item) => item.bookmarked);
    }

    return [];
  }, [activityItems, quickAccessView]);

  function changeMonth(delta: number) {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  function toggleActivityBookmark(key: string) {
    const next = bookmarkedActivityKeys.includes(key)
      ? bookmarkedActivityKeys.filter((item) => item !== key)
      : [...bookmarkedActivityKeys, key];
    writeMyActivityBookmarks(next);
  }

  return (
    <div className="grid min-w-0 gap-4 overflow-hidden pb-3">
      {user || isLoading ? (
        <header className="pt-1">
          <h1 className="text-3xl font-black tracking-tight text-[var(--rp-text)] min-[390px]:text-[34px]">My Ride</h1>
          <p className="mt-2 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            See your upcoming taxi and Ride app pods.
          </p>
        </header>
      ) : null}

      {isLoading ? (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-sm font-bold text-[var(--rp-muted)]">
          Loading your ride calendar...
        </section>
      ) : !user ? (
        <GuestMyRideIntro />
      ) : (
        <>
          {draftInvitations.length ? (
            <section className="grid gap-3 rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4 shadow-[var(--rp-shadow-soft)]">
              <div>
                <h2 className="text-xl font-black text-[var(--rp-text)]">Action needed</h2>
                <p className="mt-1 text-left text-xs font-semibold text-[var(--rp-muted-strong)]">
                  Draft RidePods need confirmation before a seat is locked.
                </p>
              </div>
              <div className="grid gap-3">
                {draftInvitations.map((invitation) => (
                  <DraftRidePodInvitationCard key={invitation.rider.id} invitation={invitation} />
                ))}
              </div>
            </section>
          ) : null}

          <MyRideQuickAccess
            items={activityItems}
            counts={activityCounts}
            activeView={quickAccessView}
            onSelect={setQuickAccessView}
          />

          {quickAccessView ? (
            <MyRideQuickAccessItems view={quickAccessView} items={quickAccessItems} />
          ) : null}

          <section className="min-w-0 overflow-hidden rounded-[26px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_34%),linear-gradient(180deg,var(--rp-card),rgba(11,22,32,0.72))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),var(--rp-shadow-soft)] min-[390px]:p-4">
            <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 min-[390px]:grid-cols-[52px_minmax(0,1fr)_52px] min-[390px]:gap-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-soft)] min-[390px]:h-12 min-[390px]:w-12"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-0 text-center text-[22px] font-black text-[var(--rp-text)] min-[390px]:text-2xl">{monthLabel(currentMonth)}</h2>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-soft)] min-[390px]:h-12 min-[390px]:w-12"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-7 gap-0.5 text-center min-[390px]:mt-5 min-[390px]:gap-1">
              {weekdays.map((weekday) => (
                <div key={weekday} className="py-2 text-[9px] font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)] min-[390px]:text-[10px] min-[390px]:tracking-[0.16em]">
                  {weekday}
                </div>
              ))}
              {monthDays.map((day, index) => {
                const key = day ? dateKey(day) : `blank-${index}`;
                return (
                  <CalendarDayCell
                    key={key}
                    day={day}
                    rides={day ? ridesByDate[dateKey(day)] ?? [] : []}
                    today={day ? dateKey(day) === todayKey : false}
                    selected={day ? dateKey(day) === effectiveSelectedDate : false}
                    currentUserId={currentUserId}
                    onSelect={setSelectedDate}
                  />
                );
              })}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-3 shadow-[var(--rp-shadow-soft)] min-[390px]:p-4">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 min-[390px]:gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="min-w-0 truncate text-xl font-black text-[var(--rp-text)]">{selectedDateLabel(effectiveSelectedDate)}</h2>
                  {selectedRides.length ? (
                    <span className="grid h-7 min-w-7 place-items-center rounded-full border border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] px-2 text-xs font-black text-[var(--rp-primary)]">
                      {selectedRides.length}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSortAscending((value) => !value)}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-xs font-black text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]"
              >
                Sort
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {selectedRides.length ? (
                selectedRides.map((ride) => {
                  const activityKey = `ride:${ride.id}`;
                  return (
                    <MyRideDayPodCard
                      key={ride.id}
                      ride={ride}
                      currentUserId={currentUserId}
                      bookmarked={bookmarkedActivityKeySet.has(activityKey)}
                      onToggleBookmark={() => toggleActivityBookmark(activityKey)}
                    />
                  );
                })
              ) : (
                <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-5 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  No pods for this date.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
