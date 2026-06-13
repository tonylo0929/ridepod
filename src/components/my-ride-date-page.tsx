"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  ChevronRight,
  Clock3,
  Luggage,
  Plane,
  PlusCircle,
  RefreshCcw,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import { useCreatedCalendarRides } from "@/lib/created-home-rides";
import {
  dateFromKey,
  fullDateLabel,
  getMyRideCalendarRole,
  rideFilters,
  ridesForDate,
  ridesForFilter,
  rideStatusLabel,
  rideTypeLabel,
  timeLabel,
  type CalendarRide,
  type RideFilter,
} from "@/lib/my-ride-calendar-mock";
import {
  getRideAppLifecycleHref,
  getRideAppPodLifecycleStatus,
  isRideAppLifecyclePod,
  type RideAppLifecycleTone,
} from "@/lib/ride-app-lifecycle";
import { formatRideAppEstimatedFarePerPerson } from "@/lib/ride-app-fare-estimate";
import { useAuth } from "@/providers/AuthProvider";

function isValidDateKey(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(dateFromKey(date).getTime());
}

function RideKindIcon({ ride }: { ride: CalendarRide }) {
  if (ride.rideMode === "ride_app") return <CarFront className="h-5 w-5" />;
  if (ride.rideKind === "airport") return <Plane className="h-5 w-5" />;
  if (ride.rideKind === "recurring") return <RefreshCcw className="h-5 w-5" />;
  return <CarFront className="h-5 w-5" />;
}

function RideBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "gold" | "cyan" | "green" | "purple" | "red" | "gray";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-black",
        tone === "gold" && "border-[color-mix(in_srgb,var(--rp-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]",
        tone === "cyan" && "border-cyan-300/45 bg-cyan-300/10 text-cyan-100",
        tone === "green" && "border-emerald-300/45 bg-emerald-300/10 text-emerald-100",
        tone === "purple" && "border-violet-300/45 bg-violet-400/10 text-violet-100",
        tone === "red" && "border-rose-300/45 bg-rose-400/10 text-rose-100",
        tone === "gray" && "border-slate-300/30 bg-slate-400/10 text-slate-200",
        tone === "default" && "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]",
      )}
    >
      {children}
    </span>
  );
}

function badgeToneForRide(ride: CalendarRide): "gold" | "cyan" | "green" {
  if (ride.rideMode === "ride_app") return "cyan";
  if (ride.rideKind === "airport") return "cyan";
  if (ride.rideKind === "recurring") return "green";
  return "gold";
}

function statusBadgeTone(ride: CalendarRide): "default" | "gold" {
  if (ride.rideMode === "ride_app" && ride.status === "ride_started") return "gold";
  return ["quote_ready", "quote_deadline_soon", "late_confirmation", "ready_for_pickup", "seat_locked"].includes(
    ride.status,
  )
    ? "gold"
    : "default";
}

function lifecycleTone(tone: RideAppLifecycleTone): "gold" | "green" | "purple" | "red" | "gray" | "cyan" {
  if (tone === "blue") return "cyan";
  return tone;
}

function RideMetaItem({ icon: Icon, children }: { icon: typeof Clock3; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-[14px] bg-[color-mix(in_srgb,var(--rp-shell)_38%,transparent)] px-3 text-xs font-black text-[var(--rp-muted-strong)]">
      <Icon className="h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

function RideEstimatePanel({
  isRideApp,
  rideAppEstimate,
  quoteTotal,
  price,
}: {
  isRideApp: boolean;
  rideAppEstimate: string | null;
  quoteTotal?: number;
  price?: number;
}) {
  if (isRideApp) {
    return (
      <span className="grid rounded-[18px] border border-blue-300/20 bg-blue-400/10 px-4 py-3">
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-200/80">
          Total estimate fee
        </span>
        {rideAppEstimate ? (
          <>
            <span className="mt-1 text-3xl font-black leading-none text-blue-100">{rideAppEstimate}</span>
            <span className="mt-1 text-xs font-black text-blue-200/85">Ride app estimate</span>
          </>
        ) : (
          <>
            <span className="mt-1 text-lg font-black leading-tight text-blue-100">Estimate pending</span>
            <span className="mt-1 text-xs font-bold leading-5 text-blue-200/80">Ride app estimate pending</span>
          </>
        )}
      </span>
    );
  }

  if (!price) return null;

  return (
    <span className="grid rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-4 py-3">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">
        {quoteTotal ? "Quote" : "Estimate"}
      </span>
      <span className="mt-1 text-3xl font-black leading-none text-[var(--rp-text)]">HK${price}</span>
    </span>
  );
}

function RideLifecyclePanel({ lifecycle }: { lifecycle: NonNullable<ReturnType<typeof getRideAppPodLifecycleStatus>> }) {
  return (
    <span className="grid gap-3 rounded-[18px] border border-blue-300/15 bg-blue-400/10 p-3 text-blue-100 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <span className="grid gap-1">
        <span className="text-sm font-black leading-5">{lifecycle.subcopy}</span>
        <span className="text-[11px] font-black uppercase tracking-[0.1em] text-blue-200/85">
          Next: {lifecycle.nextAction}
        </span>
      </span>
      <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-blue-300/25 bg-blue-300/10 px-4 text-xs font-black text-blue-100">
        {lifecycle.ctaLabel}
      </span>
    </span>
  );
}

function RideCard({ ride, currentUserId }: { ride: CalendarRide; currentUserId?: string | null }) {
  const price = ride.quoteTotal ?? ride.estimatedShare;
  const role = getMyRideCalendarRole(ride, currentUserId);
  const currentUserIsHost = role === "host";
  const isRideApp = isRideAppLifecyclePod(ride);
  const rideAppEstimate = isRideApp ? formatRideAppEstimatedFarePerPerson(ride) : null;
  const rideAppLifecycle = isRideApp
    ? getRideAppPodLifecycleStatus({
        pod: ride,
        currentUserId,
        isHost: currentUserIsHost,
      })
    : null;
  const href = rideAppLifecycle ? getRideAppLifecycleHref(ride.id, rideAppLifecycle) : `/pods/${ride.id}`;

  return (
    <Link
      href={href}
      className={cn(
        "group grid gap-4 rounded-[22px] border bg-[linear-gradient(135deg,var(--rp-card),var(--rp-card-soft))] p-4 shadow-[var(--rp-shadow-soft)] transition hover:border-[color-mix(in_srgb,var(--rp-primary)_55%,var(--rp-border))]",
        isRideApp ? "border-blue-300/25" : "border-[var(--rp-border)]",
      )}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-[17px] border bg-[var(--rp-card-muted)]",
            isRideApp ? "border-blue-300/25 text-blue-100" : "border-[var(--rp-border)] text-[var(--rp-primary)]",
          )}
        >
          <RideKindIcon ride={ride} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block break-words text-lg font-black leading-tight text-[var(--rp-text)]">
            {ride.route}
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <RideBadge tone={badgeToneForRide(ride)}>{rideTypeLabel(ride)}</RideBadge>
            {isRideApp ? <RideBadge tone="purple">Self-settle</RideBadge> : null}
            {ride.airportDirection ? (
              <RideBadge tone="cyan">{ride.airportDirection === "from_airport" ? "From airport" : "To airport"}</RideBadge>
            ) : null}
            {ride.direction ? <RideBadge tone="green">{ride.direction}</RideBadge> : null}
            {rideAppLifecycle ? (
              <RideBadge tone={lifecycleTone(rideAppLifecycle.tone)}>{rideAppLifecycle.label}</RideBadge>
            ) : (
              <RideBadge tone={statusBadgeTone(ride)}>{rideStatusLabel(ride.status)}</RideBadge>
            )}
            {currentUserIsHost ? <RideBadge tone="gold">Host controls</RideBadge> : null}
          </span>
        </span>

        <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-[var(--rp-primary)] transition group-hover:translate-x-1" />
      </span>

      <span className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-stretch">
        <span className="grid grid-cols-2 gap-2">
          <RideMetaItem icon={Clock3}>{timeLabel(ride.time)}</RideMetaItem>
          <RideMetaItem icon={UsersRound}>
            {ride.seatsFilled} / {ride.seatsTotal} seats
          </RideMetaItem>
          {ride.luggage ? <RideMetaItem icon={Luggage}>{ride.luggage}</RideMetaItem> : null}
          {ride.schedule ? (
            <RideMetaItem icon={CalendarDays}>
              <span className="text-[var(--rp-primary)]">{ride.schedule}</span>
            </RideMetaItem>
          ) : null}
        </span>

        <RideEstimatePanel
          isRideApp={isRideApp}
          rideAppEstimate={rideAppEstimate}
          quoteTotal={ride.quoteTotal}
          price={price}
        />
      </span>

      {rideAppLifecycle ? <RideLifecyclePanel lifecycle={rideAppLifecycle} /> : null}
    </Link>
  );
}

export function MyRideDatePage({ date }: { date: string }) {
  const { user, isLoading } = useAuth();
  const createdCalendarRides = useCreatedCalendarRides(user?.id ?? null);
  const [filter, setFilter] = useState<RideFilter>("all");
  const validDate = isValidDateKey(date);
  const dateObject = validDate ? dateFromKey(date) : new Date();
  const allRides = useMemo(
    () =>
      validDate
        ? [
            ...createdCalendarRides.filter((ride) => ride.date === date),
            ...ridesForDate(date).filter(
              (ride) => !createdCalendarRides.some((createdRide) => createdRide.id === ride.id),
            ),
          ].sort((first, second) => first.time.localeCompare(second.time))
        : [],
    [createdCalendarRides, date, validDate],
  );
  const visibleRides = useMemo(() => ridesForFilter(allRides, filter), [allRides, filter]);
  const title = validDate ? `Rides on ${fullDateLabel(dateObject)}` : "Rides on this date";

  return (
    <div className="grid gap-5">
      <header className="grid gap-2">
        <Link
          href="/pods"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-[16px] border border-[color-mix(in_srgb,var(--rp-primary)_42%,var(--rp-border))] bg-[color-mix(in_srgb,var(--rp-card-muted)_88%,transparent)] px-4 text-sm font-black text-[var(--rp-primary)] shadow-[0_10px_22px_rgba(0,0,0,0.18)] transition hover:bg-[var(--rp-card-soft)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calendar
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--rp-text)]">{title}</h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Tap a ride to view details.
          </p>
        </div>
      </header>

      {isLoading ? (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-sm font-bold text-[var(--rp-muted)]">
          Loading rides...
        </section>
      ) : !user ? (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
          <CalendarDays className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Log in to view your rides.</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Your shared taxi pods appear here after you log in.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/pods/date/${date}`)}`}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
          >
            Log in
          </Link>
        </section>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {rideFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-4 text-sm font-black transition",
                  filter === item.id
                    ? "border-transparent bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {visibleRides.length ? (
            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[var(--rp-muted-strong)]">
                  {visibleRides.length} {visibleRides.length === 1 ? "ride" : "rides"}
                </p>
              </div>
              {visibleRides.map((ride) => (
                <RideCard key={ride.id} ride={ride} currentUserId={user.id} />
              ))}
            </section>
          ) : (
            <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
              <h2 className="text-xl font-black text-[var(--rp-text)]">No rides on this date.</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Choose another date or create a taxi pod.
              </p>
              <Link
                href="/create"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
              >
                <PlusCircle className="h-4 w-4" />
                Create taxi pod
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
