"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Plane,
  RefreshCcw,
  Smartphone,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui";
import { createdHomeRideViewerIdentityFromAuth, useCreatedCalendarRides } from "@/lib/created-home-rides";
import {
  dateFromKey,
  dateKey,
  getMyRideCalendarItems,
  getMyRideCalendarRole,
  getMyRideCalendarStatus,
  timeLabel,
  type CalendarRide,
  type MyRideCalendarStatus,
} from "@/lib/my-ride-calendar-mock";
import { useAuth } from "@/providers/AuthProvider";

type StatusTone = "action" | "upcoming" | "completed" | "cancelled";
type RideTypeTone = "taxi" | "ride_app" | "airport" | "recurring";
type HistoryTab = "taxi" | "uber" | "ride_board";

const historyTabs: Array<{ id: HistoryTab; label: string; icon: LucideIcon }> = [
  { id: "taxi", label: "Taxi", icon: CarFront },
  { id: "uber", label: "Uber", icon: Smartphone },
  { id: "ride_board", label: "Ride Board", icon: UsersRound },
];

function historyDateLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateFromKey(date));
}

function isHistoryRide(ride: CalendarRide, todayKey: string) {
  return ride.date < todayKey;
}

function sortHistoryRides(rides: CalendarRide[]) {
  return [...rides].sort((first, second) => `${second.date}T${second.time}`.localeCompare(`${first.date}T${first.time}`));
}

function statusTone(status: MyRideCalendarStatus): StatusTone {
  if (status.isActionNeeded || status.colorKey === "gold") return "action";
  if (status.statusKey === "completed") return "completed";
  if (status.statusKey === "cancelled" || status.statusKey === "expired") return "cancelled";
  return "upcoming";
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

function getRideTypeLabel(ride: CalendarRide) {
  return ride.rideMode === "ride_app" ? "Ride app" : "Taxi";
}

function getHistoryTabForRide(ride: CalendarRide): HistoryTab {
  return ride.rideMode === "ride_app" ? "uber" : "taxi";
}

function RideTypeBadge({ ride }: { ride: CalendarRide }) {
  const tone = getRideTypeTone(ride);
  const Icon = tone === "ride_app" ? Smartphone : CarFront;

  return (
    <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black", rideTypeClass(tone))}>
      <Icon className="h-3.5 w-3.5" />
      {getRideTypeLabel(ride)}
    </span>
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
    <span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black", statusChipClass(tone))}>
      <Icon className="h-3.5 w-3.5" />
      {status.label}
    </span>
  );
}

function getHistoryStatus(status: MyRideCalendarStatus): MyRideCalendarStatus {
  if (status.statusKey === "cancelled" || status.statusKey === "expired") return status;

  return {
    ...status,
    statusKey: "completed",
    label: "Finished",
    colorKey: "green",
    helperText: "Ride moved to history",
    isActionNeeded: false,
  };
}

function HistoryRideCard({ ride, currentUserId }: { ride: CalendarRide; currentUserId?: string | null }) {
  const role = getMyRideCalendarRole(ride, currentUserId);
  const status = getHistoryStatus(getMyRideCalendarStatus({ pod: ride, currentUserId, role }));

  return (
    <article className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
              {role === "host" ? "Created" : "Joined"}
            </span>
            <StatusBadge status={status} />
          </div>
          <h3 className="mt-2 break-words text-left text-[15px] font-black leading-5 text-[var(--rp-text)] min-[390px]:text-base">{ride.route}</h3>
          <p className="mt-1 text-left text-xs font-bold leading-4 text-[var(--rp-muted-strong)]">
            {historyDateLabel(ride.date)} - {timeLabel(ride.time)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <RideTypeBadge ride={ride} />
            <RideKindBadge ride={ride} />
          </div>
        </div>
        <Link
          href={`/pods/${ride.id}`}
          aria-label={`View ${ride.route} history details`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-300/45 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300/15"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function HistoryGroup({
  title,
  rides,
  emptyText,
  currentUserId,
}: {
  title: string;
  rides: CalendarRide[];
  emptyText: string;
  currentUserId?: string | null;
}) {
  return (
    <div className="border-t border-[var(--rp-border)] pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-left text-base font-black text-[var(--rp-text)]">{title}</h3>
        <span className="grid h-7 min-w-7 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-2 text-xs font-black text-[var(--rp-muted-strong)]">
          {rides.length}
        </span>
      </div>
      <div className="mt-3 grid gap-3">
        {rides.length ? (
          rides.map((ride) => <HistoryRideCard key={ride.id} ride={ride} currentUserId={currentUserId} />)
        ) : (
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[rgba(255,255,255,0.035)] p-4 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

export function RideHistorySection() {
  const { user, profile, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<HistoryTab>("taxi");
  const viewerIdentity = useMemo(() => createdHomeRideViewerIdentityFromAuth({ profile, user }), [profile, user]);
  const createdCalendarRides = useCreatedCalendarRides(user?.id ?? null, viewerIdentity);
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const myRideItems = useMemo(
    () => [
      ...createdCalendarRides,
      ...getMyRideCalendarItems(user?.id).filter(
        (ride) => !createdCalendarRides.some((createdRide) => createdRide.id === ride.id),
      ),
    ],
    [createdCalendarRides, user?.id],
  );

  const historyRideItems = useMemo(
    () => sortHistoryRides(myRideItems.filter((ride) => isHistoryRide(ride, todayKey))),
    [myRideItems, todayKey],
  );
  const historyTabCounts = useMemo(() => {
    const counts: Record<HistoryTab, number> = { taxi: 0, uber: 0, ride_board: 0 };

    for (const ride of historyRideItems) {
      counts[getHistoryTabForRide(ride)] += 1;
    }

    return counts;
  }, [historyRideItems]);
  const activeTabHistoryRides = useMemo(
    () => historyRideItems.filter((ride) => getHistoryTabForRide(ride) === activeTab),
    [activeTab, historyRideItems],
  );
  const createdHistoryRides = useMemo(
    () => activeTabHistoryRides.filter((ride) => getMyRideCalendarRole(ride, user?.id) === "host"),
    [activeTabHistoryRides, user?.id],
  );
  const joinedHistoryRides = useMemo(
    () => activeTabHistoryRides.filter((ride) => getMyRideCalendarRole(ride, user?.id) !== "host"),
    [activeTabHistoryRides, user?.id],
  );
  const activeTabLabel = historyTabs.find((tab) => tab.id === activeTab)?.label ?? "ride";

  return (
    <div className="grid gap-4 pb-3">
      <header className="pt-1">
        <h1 className="text-3xl font-black tracking-tight text-[var(--rp-primary)] min-[390px]:text-[34px]">Ride history</h1>
      </header>

      {isLoading ? (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-sm font-bold text-[var(--rp-muted)]">
          Loading your ride history...
        </section>
      ) : !user ? (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
          <CalendarDays className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Log in to view ride history.</h2>
          <p className="mt-2 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Created and joined rides appear here after their ride date passes.
          </p>
          <Link
            href="/login?next=/history"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
          >
            Log in
          </Link>
        </section>
      ) : (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4 shadow-[var(--rp-shadow-soft)]">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-emerald-300/35 bg-emerald-300/10 text-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-left text-xl font-black text-[var(--rp-text)]">Finished rides</h2>
              <p className="mt-1 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Past pods no longer show in Search Ride.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-3 gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[#06111d]/72 p-1.5">
              {historyTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "grid min-h-[66px] content-center justify-items-center rounded-[14px] border px-1.5 text-center transition",
                      active
                        ? "border-[var(--rp-primary)] bg-[rgba(242,193,91,0.14)] text-[var(--rp-primary)] shadow-[0_0_24px_rgba(242,193,91,0.16)]"
                        : "border-transparent bg-transparent text-[var(--rp-muted-strong)] hover:bg-white/[0.05]",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="mt-1 text-[11px] font-black leading-tight">{tab.label}</span>
                    <span className="mt-1 rounded-full border border-white/10 bg-white/[0.055] px-2 py-0.5 text-[10px] font-black">
                      {historyTabCounts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <HistoryGroup
              title="Created"
              rides={createdHistoryRides}
              emptyText={`No created ${activeTabLabel} history yet.`}
              currentUserId={user.id}
            />
            <HistoryGroup
              title="Joined"
              rides={joinedHistoryRides}
              emptyText={`No joined ${activeTabLabel} history yet.`}
              currentUserId={user.id}
            />
          </div>
        </section>
      )}
    </div>
  );
}
