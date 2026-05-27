"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { HomeRide } from "@/lib/home-ride-mock";
import {
  podDetailQuoteCopy,
  QuoteReadySummary,
  StickyPodDetailCta,
  usePodDetailJoinState,
  type PodDetailJoinView,
} from "@/components/pod-detail-join-state";

function rideKindLabel(ride: HomeRide) {
  if (ride.rideKind === "recurring") return "Recurring";
  if (ride.rideKind === "airport") return "Airport";
  return "One-off";
}

function airportLabel(ride: HomeRide) {
  if (ride.airportDirection === "to_airport") return "To Airport";
  if (ride.airportDirection === "from_airport") return "From Airport";
  return null;
}

function DetailCard({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_92%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Badge({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "cyan" | "soft" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black",
        tone === "gold" &&
          "border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-primary)]",
        tone === "cyan" && "border-cyan-300/15 bg-cyan-400/12 text-cyan-300",
        tone === "soft" && "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]",
      )}
    >
      {children}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--rp-border)] py-3 last:border-b-0">
      <span className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-black text-[var(--rp-text)]">{value}</span>
    </div>
  );
}

function SeatDot({ filled, you }: { filled?: boolean; you?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full border text-xs font-black",
        filled
          ? "border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]"
          : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
      )}
    >
      {you ? "You" : filled ? <UserRound className="h-4 w-4" /> : ""}
    </span>
  );
}

function QuoteStatusCard({
  ride,
  status,
  acceptedGuestCount,
  requiredGuestCount,
}: {
  ride: HomeRide;
  status: PodDetailJoinView;
  acceptedGuestCount: number;
  requiredGuestCount: number;
}) {
  const copy = podDetailQuoteCopy[status];

  return (
    <DetailCard className="scroll-mt-28" id="quote-status">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-primary)]">
          <WalletCards className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">{copy.title}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{copy.text}</p>
          <QuoteReadySummary
            ride={ride}
            joinView={status}
            acceptedGuestCount={acceptedGuestCount}
            requiredGuestCount={requiredGuestCount}
          />
        </div>
      </div>
    </DetailCard>
  );
}

export function HomePodDetailPage({ ride }: { ride: HomeRide }) {
  const { seatsUsed, joinView, acceptedGuestCount, requiredGuestCount, lockSeat, acceptQuote, declineQuote } =
    usePodDetailJoinState(ride);
  const openSeats = Math.max(ride.seatsTotal - seatsUsed, 0);
  const isRecurring = ride.rideKind === "recurring";
  const airportBadge = airportLabel(ride);

  return (
    <div className="relative -mx-1 min-h-[calc(100vh-7rem)] pb-48">
      <div className="pointer-events-none absolute inset-x-[-40%] top-[-120px] h-72 bg-[radial-gradient(circle,rgba(242,193,91,0.16),transparent_58%)]" />

      <div className="relative grid gap-4">
        <Link
          href="/home"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2 text-sm font-black text-[var(--rp-muted-strong)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <section className="rounded-[28px] border border-[var(--rp-border-strong)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--rp-card)_94%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
                Shared taxi pod
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[var(--rp-text)]">
                {ride.fromLabel} {"\u2192"} {ride.toLabel}
              </h1>
            </div>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
              {ride.rideKind === "airport" ? <Plane className="h-7 w-7" /> : isRecurring ? <RefreshCcw className="h-7 w-7" /> : <CarFront className="h-7 w-7" />}
            </span>
          </div>

          <div className="mt-5 grid gap-3 text-sm font-bold text-[var(--rp-muted-strong)] sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[var(--rp-primary)]" />
              {ride.dateLabel} <span aria-hidden="true">{"\u00b7"}</span> {ride.timeLabel}
            </p>
            <p className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-[var(--rp-primary)]" />
              {seatsUsed} / {ride.seatsTotal} seats
            </p>
          </div>

          <div className="mt-5 rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">
              Estimated share
            </p>
            <p className="mt-1 text-4xl font-black text-[var(--rp-primary)]">HK${ride.pricePerPerson}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">per person</p>
          </div>

          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Final share is confirmed after the taxi partner quote.
          </p>
        </section>

        <section className="flex flex-wrap gap-2">
          <Badge>
            <CarFront className="h-3.5 w-3.5" />
            Taxi
          </Badge>
          <Badge tone={isRecurring ? "gold" : "soft"}>
            {isRecurring ? <RefreshCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {rideKindLabel(ride)}
          </Badge>
          {airportBadge ? (
            <Badge tone="cyan">
              <Plane className="h-3.5 w-3.5" />
              {airportBadge}
            </Badge>
          ) : null}
          <Badge tone="soft">
            <ShieldCheck className="h-3.5 w-3.5" />
            {ride.podType}
          </Badge>
        </section>

        <DetailCard>
          <h2 className="text-lg font-black text-[var(--rp-text)]">How it works</h2>
          <div className="mt-4 grid gap-3">
            {["Join the pod", "Taxi partner sends a quote", "Guests accept the quote", "Ride proceeds"].map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--rp-primary)] text-sm font-black text-[var(--rp-primary-text)]">
                  {index + 1}
                </span>
                <span className="text-sm font-black text-[var(--rp-text)]">{step}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            No payment is needed yet. Guests accept quote details only after the taxi partner quote is ready.
          </p>
        </DetailCard>

        <DetailCard>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Trip details</h2>
          <div className="mt-2">
            <DetailRow label="Pickup" value={ride.fromLabel} />
            <DetailRow label="Dropoff" value={ride.toLabel} />
            <DetailRow label="Taxi type" value={ride.taxiType} />
            <DetailRow label="Luggage" value={ride.luggage} />
            <DetailRow label="Accessibility" value={ride.accessibility} />
            <DetailRow label="Pod type" value={ride.podType} />
            {isRecurring && ride.repeatsPattern ? <DetailRow label="Repeats" value={ride.repeatsPattern} /> : null}
            {isRecurring && ride.nextRideLabel ? <DetailRow label="Next ride" value={ride.nextRideLabel} /> : null}
          </div>
        </DetailCard>

        {isRecurring && ride.upcomingRides?.length ? (
          <DetailCard>
            <h2 className="text-lg font-black text-[var(--rp-text)]">Upcoming rides</h2>
            <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
              {ride.upcomingRides.map((item) => (
                <div
                  key={`${item.date}-${item.time}`}
                  className="min-w-[150px] rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3"
                >
                  <p className="text-sm font-black text-[var(--rp-text)]">{item.date}</p>
                  <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">{item.time}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{item.label}</p>
                </div>
              ))}
            </div>
          </DetailCard>
        ) : null}

        <DetailCard>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-black text-[var(--rp-text)]">Seats / participants</h2>
            <span className="text-sm font-black text-[var(--rp-primary)]">{openSeats} open</span>
          </div>

          <div className="mt-4 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">Host</p>
            <p className="mt-1 text-base font-black text-[var(--rp-text)]">{ride.hostName}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: ride.seatsTotal }).map((_, index) => (
              <SeatDot
                key={index}
                filled={index < seatsUsed}
                you={joinView === "joined" && index === Math.max(seatsUsed - 1, 0)}
              />
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-[var(--rp-muted-strong)]">
            {ride.joinedRiders.length ? `Joined riders: ${ride.joinedRiders.join(", ")}` : "No joined riders yet."}
          </p>
        </DetailCard>

        <QuoteStatusCard
          ride={ride}
          status={joinView}
          acceptedGuestCount={acceptedGuestCount}
          requiredGuestCount={requiredGuestCount}
        />
      </div>

      <StickyPodDetailCta
        ride={ride}
        seatsUsed={seatsUsed}
        joinView={joinView}
        acceptedGuestCount={acceptedGuestCount}
        requiredGuestCount={requiredGuestCount}
        onLockSeat={lockSeat}
        onAcceptQuote={acceptQuote}
        onDeclineQuote={declineQuote}
      />
    </div>
  );
}
