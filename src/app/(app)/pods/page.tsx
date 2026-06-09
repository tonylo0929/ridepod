"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CarFront,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { cn } from "@/components/ui";
import { useCreatedCalendarRides } from "@/lib/created-home-rides";
import { useAuth } from "@/providers/AuthProvider";
import {
  buildMonthDays,
  dateKey,
  fullDateLabel,
  getMyRideCalendarItems,
  getMyRideCalendarRole,
  getMyRideCalendarStatus,
  isActionNeeded,
  monthLabel,
  timeLabel,
  weekdays,
  type CalendarRide,
  type MyRideCalendarColorKey,
} from "@/lib/my-ride-calendar-mock";

function statusColorClass(colorKey: MyRideCalendarColorKey) {
  const classes: Record<MyRideCalendarColorKey, string> = {
    blue: "bg-blue-300",
    cyan: "bg-cyan-300",
    gold: "bg-[var(--rp-primary)]",
    green: "bg-emerald-300",
    orange: "bg-orange-300",
    red: "bg-rose-300",
    gray: "bg-slate-400",
    purple: "bg-violet-300",
  };

  return classes[colorKey];
}

function statusBadgeClass(colorKey: MyRideCalendarColorKey) {
  const classes: Record<MyRideCalendarColorKey, string> = {
    blue: "border-blue-300/40 bg-blue-400/10 text-blue-100",
    cyan: "border-cyan-300/45 bg-cyan-300/10 text-cyan-100",
    gold: "border-[color-mix(in_srgb,var(--rp-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]",
    green: "border-emerald-300/45 bg-emerald-300/10 text-emerald-100",
    orange: "border-orange-300/45 bg-orange-400/10 text-orange-100",
    red: "border-rose-300/45 bg-rose-400/10 text-rose-100",
    gray: "border-slate-300/30 bg-slate-400/10 text-slate-200",
    purple: "border-violet-300/45 bg-violet-400/10 text-violet-100",
  };

  return classes[colorKey];
}

function ridesByDateMap(rides: CalendarRide[]) {
  return rides.reduce<Record<string, CalendarRide[]>>((groups, ride) => {
    groups[ride.date] = [...(groups[ride.date] ?? []), ride].sort((first, second) =>
      first.time.localeCompare(second.time),
    );
    return groups;
  }, {});
}

function CalendarDayCell({
  day,
  rides,
  today,
  selected,
  currentUserId,
}: {
  day: Date | null;
  rides: CalendarRide[];
  today: boolean;
  selected: boolean;
  currentUserId?: string | null;
}) {
  if (!day) return <div className="min-h-[58px]" />;

  const href = `/pods/date/${dateKey(day)}`;
  const visibleDots = rides.slice(0, 3);
  const extraCount = Math.max(rides.length - visibleDots.length, 0);
  const actionNeeded = rides.some((ride) => isActionNeeded(ride, currentUserId));

  return (
    <Link
      href={href}
      className={cn(
        "grid min-h-[58px] w-full content-start justify-items-center rounded-[16px] border px-1.5 py-2 text-center transition",
        actionNeeded && "ring-1 ring-[var(--rp-primary)] ring-offset-1 ring-offset-[var(--rp-card)]",
        selected
          ? "border-cyan-300/70 bg-cyan-300/12 text-[var(--rp-text)]"
          : today
          ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] text-[var(--rp-text)]"
          : "border-transparent text-[var(--rp-muted-strong)] hover:border-[var(--rp-border)] hover:bg-[var(--rp-card-muted)]",
      )}
      aria-current={selected ? "date" : undefined}
      aria-label={`Open rides for ${fullDateLabel(day)}${rides.length ? `, ${rides.length} rides` : ", no rides"}`}
    >
      <span className="text-sm font-black">{day.getDate()}</span>
      {rides.length ? (
        <span className="mt-2 flex h-3 items-center justify-center gap-1">
          {visibleDots.map((ride) => (
            <span
              key={`${ride.id}-${ride.date}`}
              className={cn("h-1.5 w-1.5 rounded-full", statusColorClass(getMyRideCalendarStatus({ pod: ride, currentUserId }).colorKey))}
            />
          ))}
          {extraCount ? (
            <span className="text-[9px] font-black text-[var(--rp-primary)]">
              +{extraCount}
            </span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}

function MyRideDayPodCard({ ride, currentUserId }: { ride: CalendarRide; currentUserId?: string | null }) {
  const role = getMyRideCalendarRole(ride, currentUserId);
  const status = getMyRideCalendarStatus({ pod: ride, currentUserId, role });
  const rideModeLabel = ride.rideMode === "ride_app" ? "Ride app" : "Taxi";
  const chatHref = `/pods/${ride.id}/chat`;

  return (
    <article className="rounded-[20px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,var(--rp-card),var(--rp-card-soft))] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-[var(--rp-text)]">{ride.route}</h3>
          <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">{timeLabel(ride.time)}</p>
        </div>
        <span className={cn("h-3 w-3 shrink-0 rounded-full", statusColorClass(status.colorKey))} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-2.5 text-[11px] font-black text-[var(--rp-muted-strong)]">
          {ride.rideMode === "ride_app" ? <Smartphone className="h-3.5 w-3.5" /> : <CarFront className="h-3.5 w-3.5" />}
          {rideModeLabel}
        </span>
        {ride.rideMode === "ride_app" ? (
          <span className="inline-flex min-h-7 items-center rounded-full border border-violet-300/35 bg-violet-400/10 px-2.5 text-[11px] font-black text-violet-100">
            Self-settle
          </span>
        ) : null}
        {ride.rideMode === "ride_app" && status.statusKey === "settlement_pending" ? (
          <span className="inline-flex min-h-7 items-center rounded-full border border-sky-300/35 bg-sky-400/10 px-2.5 text-[11px] font-black text-sky-100">
            Rating pending
          </span>
        ) : null}
        <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-2.5 text-[11px] font-black text-[var(--rp-text)]">
          {role === "host" ? "Host" : "Rider"}
        </span>
        <span className={cn("inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-black", statusBadgeClass(status.colorKey))}>
          {status.label}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{status.helperText}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/pods/${ride.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-3 text-sm font-black text-[var(--rp-primary-text)]"
        >
          Open pod
        </Link>
        <Link
          href={chatHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-black text-[var(--rp-muted-strong)]"
        >
          <MessageCircle className="h-4 w-4" />
          {status.ctaLabel === "Open pod" ? "Open chat" : status.ctaLabel}
        </Link>
      </div>
    </article>
  );
}

export default function MyRidePage() {
  const { user, isLoading } = useAuth();
  const createdCalendarRides = useCreatedCalendarRides();
  const today = new Date();
  const todayKey = dateKey(today);
  const selectedDate = todayKey;
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const myRideItems = useMemo(
    () => [
      ...createdCalendarRides,
      ...getMyRideCalendarItems(user?.id).filter(
        (ride) => !createdCalendarRides.some((createdRide) => createdRide.id === ride.id),
      ),
    ],
    [createdCalendarRides, user?.id],
  );
  const monthDays = useMemo(() => buildMonthDays(currentMonth), [currentMonth]);
  const ridesByDate = useMemo(() => ridesByDateMap(myRideItems), [myRideItems]);
  const selectedRides = ridesByDate[selectedDate] ?? [];

  function changeMonth(delta: number) {
    setCurrentMonth((month) => {
      const nextMonth = new Date(month.getFullYear(), month.getMonth() + delta, 1);
      return nextMonth;
    });
  }

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-[var(--rp-text)]">My Ride</h1>
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
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
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
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
          <section className="rounded-[26px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,var(--rp-card),var(--rp-card-soft))] p-4 shadow-[var(--rp-shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-text)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-black text-[var(--rp-text)]">{monthLabel(currentMonth)}</h2>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-text)]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {weekdays.map((weekday) => (
                <div key={weekday} className="py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
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
                    selected={day ? dateKey(day) === selectedDate : false}
                    currentUserId={user.id}
                  />
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 border-t border-[var(--rp-border)] pt-4">
              <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--rp-primary)]" />
                Taxi
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                Airport
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-blue-300" />
                Ride app
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Recurring
              </span>
              </div>
              <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-blue-300" />
                Open / Upcoming
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--rp-primary)]" />
                Action needed
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Ready / Completed
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-orange-300" />
                Settlement pending
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-rose-300" />
                Cancelled
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Expired
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted)]">
                <span className="h-2 w-2 rounded-full bg-violet-300" />
                Issue / review
              </span>
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <div>
              <h2 className="text-xl font-black text-[var(--rp-text)]">{fullDateLabel(new Date(`${selectedDate}T00:00:00`))}</h2>
              <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">
                {selectedRides.length ? `${selectedRides.length} pod${selectedRides.length === 1 ? "" : "s"} in My Ride` : "No pods for this date"}
              </p>
            </div>
            {selectedRides.length ? (
              selectedRides.map((ride) => <MyRideDayPodCard key={ride.id} ride={ride} currentUserId={user.id} />)
            ) : (
              <div className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-sm font-semibold text-[var(--rp-muted-strong)]">
                Created and joined pods will appear here automatically.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
