"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Grid2X2,
  Plane,
  RefreshCcw,
  SlidersHorizontal,
  Smartphone,
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
import { getDraftPodInvitationCards, useRideGroupsState } from "@/lib/ride-groups";

type StatusTone = "action" | "upcoming" | "completed" | "cancelled";
type RideTypeTone = "taxi" | "ride_app" | "airport" | "recurring";
type MyRideFilter = "all" | RideTypeTone;

const primaryFilters: Array<{ id: MyRideFilter; label: string; icon: LucideIcon; tone: RideTypeTone | "all" }> = [
  { id: "all", label: "All", icon: Grid2X2, tone: "all" },
  { id: "taxi", label: "Taxi", icon: CarFront, tone: "taxi" },
  { id: "ride_app", label: "Ride app", icon: Smartphone, tone: "ride_app" },
  { id: "airport", label: "Airport", icon: Plane, tone: "airport" },
  { id: "recurring", label: "Recurring", icon: RefreshCcw, tone: "recurring" },
];

const statusLegendItems: Array<{ id: StatusTone; label: string; tone: StatusTone }> = [
  { id: "action", label: "Action", tone: "action" },
  { id: "upcoming", label: "Upcoming", tone: "upcoming" },
  { id: "completed", label: "Completed", tone: "completed" },
  { id: "cancelled", label: "Cancelled", tone: "cancelled" },
];

function ridesByDateMap(rides: CalendarRide[]) {
  return rides.reduce<Record<string, CalendarRide[]>>((groups, ride) => {
    groups[ride.date] = [...(groups[ride.date] ?? []), ride].sort((first, second) =>
      first.time.localeCompare(second.time),
    );
    return groups;
  }, {});
}

function selectedDateLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateFromKey(date));
}

function isHistoryRide(ride: CalendarRide, todayKey: string) {
  return ride.date < todayKey;
}

function statusTone(status: MyRideCalendarStatus): StatusTone {
  if (status.isActionNeeded || status.colorKey === "gold") return "action";
  if (status.statusKey === "completed") return "completed";
  if (status.statusKey === "cancelled" || status.statusKey === "expired") return "cancelled";
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

function filterChipClass(active: boolean, tone: RideTypeTone | StatusTone | "all") {
  if (!active) {
    return "border-[var(--rp-border)] bg-[rgba(255,255,255,0.045)] text-[var(--rp-muted-strong)] hover:border-[var(--rp-border-strong)] hover:bg-[var(--rp-card-muted)]";
  }

  if (tone === "action" || tone === "taxi") {
    return "border-[color-mix(in_srgb,var(--rp-primary)_70%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)] shadow-[0_0_22px_rgba(242,193,91,0.18)]";
  }

  if (tone === "completed" || tone === "recurring") {
    return "border-emerald-300/55 bg-emerald-300/12 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.12)]";
  }

  if (tone === "cancelled") {
    return "border-rose-300/45 bg-rose-400/10 text-rose-100";
  }

  return "border-cyan-300/70 bg-cyan-300/16 text-cyan-50 shadow-[0_0_26px_rgba(34,211,238,0.22)]";
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

function matchesFilter(ride: CalendarRide, filter: MyRideFilter) {
  if (filter === "all") return true;
  if (filter === "taxi") return ride.rideMode !== "ride_app";
  if (filter === "ride_app") return ride.rideMode === "ride_app";
  if (filter === "airport") return ride.rideKind === "airport";
  if (filter === "recurring") return ride.rideKind === "recurring";
  return true;
}

function FilterChip({
  id,
  label,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  id: MyRideFilter;
  label: string;
  icon: LucideIcon;
  tone: RideTypeTone | StatusTone | "all";
  active: boolean;
  onClick: (filter: MyRideFilter) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onClick(id)}
      className={cn(
        "inline-flex min-h-[54px] min-w-0 overflow-hidden flex-col items-center justify-center gap-1 rounded-[15px] border px-1 text-center text-[10px] font-black leading-none transition min-[390px]:text-[11px]",
        filterChipClass(active, tone),
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 max-w-full whitespace-nowrap leading-[1.05]">{label}</span>
    </button>
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

function MyRideDayPodCard({ ride, currentUserId }: { ride: CalendarRide; currentUserId?: string | null }) {
  const role = getMyRideCalendarRole(ride, currentUserId);
  const status = getMyRideCalendarStatus({ pod: ride, currentUserId, role });
  const routeStops = getRouteStops(ride.route);
  const rideTypeTone = getRideTypeTone(ride);
  const Icon = rideTypeTone === "ride_app" ? Smartphone : CarFront;

  return (
    <article className="min-w-0 overflow-hidden rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))] p-3 shadow-[var(--rp-shadow-soft)] min-[390px]:p-4">
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

        <div className="min-w-0 overflow-hidden">
          <div className="grid min-w-0 gap-2 min-[390px]:grid-cols-[minmax(96px,1fr)_auto] min-[390px]:items-start">
            <div className="min-w-0">
              <p className="whitespace-nowrap text-left text-xl font-black leading-6 text-[var(--rp-text)]">{timeLabel(ride.time)}</p>
              <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                <RideKindBadge ride={ride} />
              </div>
            </div>
            <div className="min-w-0 justify-self-start min-[390px]:justify-self-end">
              <StatusBadge status={status} />
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
  const viewerIdentity = useMemo(() => createdHomeRideViewerIdentityFromAuth({ profile, user }), [profile, user]);
  const createdCalendarRides = useCreatedCalendarRides(user?.id ?? null, viewerIdentity);
  const { state: rideGroupsState } = useRideGroupsState();
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const [activeFilter, setActiveFilter] = useState<MyRideFilter>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sortAscending, setSortAscending] = useState(true);

  const myRideItems = useMemo(
    () => [
      ...createdCalendarRides,
      ...getMyRideCalendarItems(user?.id).filter(
        (ride) => !createdCalendarRides.some((createdRide) => createdRide.id === ride.id),
      ),
    ],
    [createdCalendarRides, user?.id],
  );
  const activeRideItems = useMemo(
    () => myRideItems.filter((ride) => !isHistoryRide(ride, todayKey)),
    [myRideItems, todayKey],
  );
  const filteredItems = useMemo(
    () => activeRideItems.filter((ride) => matchesFilter(ride, activeFilter)),
    [activeFilter, activeRideItems],
  );
  const monthDays = useMemo(() => buildMonthDays(currentMonth), [currentMonth]);
  const ridesByDate = useMemo(() => ridesByDateMap(filteredItems), [filteredItems]);
  const defaultSelectedDate = useMemo(() => {
    const actionRide = filteredItems.find((ride) =>
      getMyRideCalendarStatus({ pod: ride, currentUserId: user?.id }).isActionNeeded,
    );
    return actionRide?.date ?? filteredItems[0]?.date ?? todayKey;
  }, [filteredItems, todayKey, user?.id]);
  const effectiveSelectedDate = selectedDate ?? defaultSelectedDate;
  const selectedRides = useMemo(() => {
    const rides = ridesByDate[effectiveSelectedDate] ?? [];
    return [...rides].sort((first, second) =>
      sortAscending ? first.time.localeCompare(second.time) : second.time.localeCompare(first.time),
    );
  }, [effectiveSelectedDate, ridesByDate, sortAscending]);
  const draftInvitations = useMemo(
    () => getDraftPodInvitationCards(rideGroupsState, user?.id),
    [rideGroupsState, user?.id],
  );

  function changeMonth(delta: number) {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  function handleFilterChange(filter: MyRideFilter) {
    setActiveFilter(filter);
    setSelectedDate(null);
  }

  return (
    <div className="grid min-w-0 gap-4 overflow-hidden pb-3">
      <header className="pt-1">
        <h1 className="text-3xl font-black tracking-tight text-[var(--rp-primary)] min-[390px]:text-[34px]">My Ride</h1>
        <p className="mt-2 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          See your upcoming taxi and Ride app pods.
        </p>
      </header>

      {isLoading ? (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-sm font-bold text-[var(--rp-muted)]">
          Loading your ride calendar...
        </section>
      ) : !user ? (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
          <CalendarDays className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Log in to view your ride calendar.</h2>
          <p className="mt-2 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Your shared taxi and Ride app pods appear here after you log in.
          </p>
          <Link
            href="/login?next=/pods"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
          >
            Log in
          </Link>
        </section>
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

          <section className="min-w-0 overflow-hidden rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),var(--rp-shadow-soft)] min-[390px]:p-3">
            <div className="grid min-w-0 grid-cols-5 gap-1.5 min-[390px]:gap-2">
              {primaryFilters.map((filter) => (
                <FilterChip
                  key={filter.id}
                  id={filter.id}
                  label={filter.label}
                  icon={filter.icon}
                  tone={filter.tone}
                  active={activeFilter === filter.id}
                  onClick={handleFilterChange}
                />
              ))}
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-1 min-[390px]:gap-x-4">
              {statusLegendItems.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase leading-none tracking-[0.06em] text-[var(--rp-muted-strong)]"
                >
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", markerDotClass(item.tone))} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </span>
              ))}
            </div>
          </section>

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
                    currentUserId={user.id}
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
                selectedRides.map((ride) => <MyRideDayPodCard key={ride.id} ride={ride} currentUserId={user.id} />)
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
