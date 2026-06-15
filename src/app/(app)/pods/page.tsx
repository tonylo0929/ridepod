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
import { useCreatedCalendarRides } from "@/lib/created-home-rides";
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

type MyRideFilter = "all" | "taxi" | "ride_app" | "airport" | "recurring" | "action" | "upcoming" | "completed" | "cancelled";
type StatusTone = "action" | "upcoming" | "completed" | "cancelled";
type RideTypeTone = "taxi" | "ride_app" | "airport" | "recurring";

const primaryFilters: Array<{ id: MyRideFilter; label: string; icon: LucideIcon; tone: RideTypeTone | "all" }> = [
  { id: "all", label: "All", icon: Grid2X2, tone: "all" },
  { id: "taxi", label: "Taxi", icon: CarFront, tone: "taxi" },
  { id: "ride_app", label: "Ride app", icon: Smartphone, tone: "ride_app" },
  { id: "airport", label: "Airport", icon: Plane, tone: "airport" },
  { id: "recurring", label: "Recurring", icon: RefreshCcw, tone: "recurring" },
];

const statusFilters: Array<{ id: MyRideFilter; label: string; icon: LucideIcon; tone: StatusTone }> = [
  { id: "action", label: "Action", icon: AlertCircle, tone: "action" },
  { id: "upcoming", label: "Upcoming", icon: Clock3, tone: "upcoming" },
  { id: "completed", label: "Completed", icon: CheckCircle2, tone: "completed" },
  { id: "cancelled", label: "Cancelled", icon: XCircle, tone: "cancelled" },
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

function getRideTypeLabel(ride: CalendarRide) {
  return ride.rideMode === "ride_app" ? "Ride app" : "Taxi";
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

function matchesFilter(ride: CalendarRide, filter: MyRideFilter, currentUserId?: string | null) {
  const status = getMyRideCalendarStatus({ pod: ride, currentUserId, role: getMyRideCalendarRole(ride, currentUserId) });
  const tone = statusTone(status);

  if (filter === "all") return true;
  if (filter === "taxi") return ride.rideMode !== "ride_app";
  if (filter === "ride_app") return ride.rideMode === "ride_app";
  if (filter === "airport") return ride.rideKind === "airport";
  if (filter === "recurring") return ride.rideKind === "recurring";
  if (filter === "action") return tone === "action";
  if (filter === "upcoming") return tone === "upcoming";
  if (filter === "completed") return tone === "completed";
  return tone === "cancelled";
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
        "inline-flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-1 rounded-[15px] border px-1 text-center text-[10px] font-black leading-none transition min-[390px]:text-[11px]",
        filterChipClass(active, tone),
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 leading-[1.05]">{label}</span>
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
  if (!day) return <div className="min-h-[58px]" />;

  const key = dateKey(day);
  const marker = dayMarkerTone(rides, currentUserId);
  const showBadge = Boolean(marker && (selected || marker === "action" || rides.length > 1));

  return (
    <button
      type="button"
      onClick={() => onSelect(key)}
      className={cn(
        "grid min-h-[58px] w-full content-start justify-items-center rounded-[18px] border px-1.5 py-2 text-center transition",
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
      <span className="text-lg font-black leading-6">{day.getDate()}</span>
      {marker ? (
        showBadge ? (
          <span className={cn("mt-1 grid h-6 min-w-6 place-items-center rounded-full border px-1 text-xs font-black", markerBadgeClass(marker))}>
            {rides.length}
          </span>
        ) : (
          <span className={cn("mt-2 h-2.5 w-2.5 rounded-full", markerDotClass(marker))} />
        )
      ) : null}
    </button>
  );
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

function MyRideDayPodCard({ ride, currentUserId }: { ride: CalendarRide; currentUserId?: string | null }) {
  const role = getMyRideCalendarRole(ride, currentUserId);
  const status = getMyRideCalendarStatus({ pod: ride, currentUserId, role });
  const routeStops = getRouteStops(ride.route);
  const rideTypeTone = getRideTypeTone(ride);
  const Icon = rideTypeTone === "ride_app" ? Smartphone : CarFront;

  return (
    <article className="rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-3 min-[390px]:grid-cols-[68px_minmax(0,1fr)]">
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

        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-left text-xl font-black leading-6 text-[var(--rp-text)]">{timeLabel(ride.time)}</p>
              <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                <RideTypeBadge ride={ride} />
                <RideKindBadge ride={ride} />
              </div>
            </div>
            <StatusBadge status={status} />
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

function HistoryRideCard({ ride, currentUserId }: { ride: CalendarRide; currentUserId?: string | null }) {
  const role = getMyRideCalendarRole(ride, currentUserId);
  const status = getHistoryStatus(getMyRideCalendarStatus({ pod: ride, currentUserId, role }));

  return (
    <article className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
              {role === "host" ? "Created" : "Joined"}
            </span>
            <StatusBadge status={status} />
          </div>
          <h3 className="mt-3 break-words text-left text-lg font-black leading-6 text-[var(--rp-text)]">{ride.route}</h3>
          <p className="mt-1 text-left text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
            {historyDateLabel(ride.date)} · {timeLabel(ride.time)}
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

export default function MyRidePage() {
  const { user, isLoading } = useAuth();
  const createdCalendarRides = useCreatedCalendarRides(user?.id ?? null);
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
  const historyRideItems = useMemo(
    () => sortHistoryRides(myRideItems.filter((ride) => isHistoryRide(ride, todayKey))),
    [myRideItems, todayKey],
  );
  const createdHistoryRides = useMemo(
    () => historyRideItems.filter((ride) => getMyRideCalendarRole(ride, user?.id) === "host"),
    [historyRideItems, user?.id],
  );
  const joinedHistoryRides = useMemo(
    () => historyRideItems.filter((ride) => getMyRideCalendarRole(ride, user?.id) !== "host"),
    [historyRideItems, user?.id],
  );

  const filteredItems = useMemo(
    () => activeRideItems.filter((ride) => matchesFilter(ride, activeFilter, user?.id)),
    [activeFilter, activeRideItems, user?.id],
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

  function changeMonth(delta: number) {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  function handleFilterChange(filter: MyRideFilter) {
    setActiveFilter(filter);
    setSelectedDate(null);
  }

  return (
    <div className="grid gap-4 pb-3">
      <header className="pt-1">
        <h1 className="text-3xl font-black tracking-tight text-[var(--rp-text)] min-[390px]:text-[34px]">My Ride</h1>
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
          <section className="rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),var(--rp-shadow-soft)]">
            <div className="grid grid-cols-5 gap-2">
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
            <div className="mt-2 grid grid-cols-4 gap-2">
              {statusFilters.map((filter) => (
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
          </section>

          <section className="rounded-[26px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_34%),linear-gradient(180deg,var(--rp-card),rgba(11,22,32,0.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),var(--rp-shadow-soft)]">
            <div className="grid grid-cols-[52px_1fr_52px] items-center gap-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="grid h-12 w-12 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-soft)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-center text-2xl font-black text-[var(--rp-text)]">{monthLabel(currentMonth)}</h2>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="grid h-12 w-12 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-soft)]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1 text-center">
              {weekdays.map((weekday) => (
                <div key={weekday} className="py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--rp-muted-strong)]">
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

          <section className="rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4 shadow-[var(--rp-shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
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

          <section className="rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4 shadow-[var(--rp-shadow-soft)]">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-emerald-300/35 bg-emerald-300/10 text-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-left text-xl font-black text-[var(--rp-text)]">Ride history</h2>
                <p className="mt-1 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Finished-date pods move here after their ride date passes.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4">
              <HistoryGroup
                title="Created"
                rides={createdHistoryRides}
                emptyText="No created ride history yet."
                currentUserId={user.id}
              />
              <HistoryGroup
                title="Joined"
                rides={joinedHistoryRides}
                emptyText="No joined ride history yet."
                currentUserId={user.id}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
