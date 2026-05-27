"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CarFront,
  Clock3,
  MapPin,
  Plane,
  Share2,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { HomeRide } from "@/lib/home-ride-mock";
import {
  podDetailQuoteCopy,
  QuoteReadySummary,
  StickyPodDetailCta,
  usePodDetailJoinState,
} from "@/components/pod-detail-join-state";

function AirportCard({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_90%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function AirportDetailItem({
  icon,
  label,
  value,
  large,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr] gap-3 border-b border-[var(--rp-border)] py-4 first:pt-0 last:border-b-0 last:pb-0">
      <span className="mt-1 text-[var(--rp-muted-strong)]">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-[var(--rp-muted-strong)]">{label}</p>
        <p className={cn("mt-1 whitespace-pre-line font-black leading-6 text-[var(--rp-text)]", large ? "text-lg" : "text-base")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function airportDirectionLabel(ride: HomeRide) {
  if (ride.airportDirection === "to_airport") return "To Airport";
  if (ride.airportDirection === "from_airport") return "From Airport";
  return "Airport";
}

const avatarStyles = [
  "bg-[#f7d8bc] text-[#5b341f]",
  "bg-[#cfe7dc] text-[#173f34]",
  "bg-[#e7c7b5] text-[#5c2f22]",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RiderStack({ ride }: { ride: HomeRide }) {
  const names = [ride.hostName, ...ride.joinedRiders].slice(0, 3);

  return (
    <div className="flex shrink-0 -space-x-2">
      {names.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full border-2 border-[#07111a] text-xs font-black shadow-[0_6px_14px_rgba(0,0,0,0.24)]",
            avatarStyles[index % avatarStyles.length],
          )}
        >
          {getInitials(name)}
        </span>
      ))}
    </div>
  );
}

export function AirportPodDetailPage({ ride }: { ride: HomeRide }) {
  const { seatsUsed, joinView, acceptedGuestCount, requiredGuestCount, lockSeat, acceptQuote, declineQuote } =
    usePodDetailJoinState(ride);
  const progress = Math.min((seatsUsed / ride.seatsTotal) * 100, 100);
  const currentStatus = podDetailQuoteCopy[joinView];
  const pickup = ride.pickupLabel ?? ride.fromLabel;
  const dropoff = ride.dropoffLabel ?? ride.toLabel;
  const isFromAirport = ride.airportDirection === "from_airport";
  const airportHelper = isFromAirport
    ? "Airport pickup and luggage space are included in the quote."
    : "Airport dropoff and luggage space are included in the quote.";

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden pb-48 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <div className="mx-auto w-full max-w-[520px] lg:pt-4">
        <header className="relative z-20 flex h-12 items-center justify-between px-4">
          <Link
            href="/home"
            aria-label="Back to Home"
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-lg font-semibold text-[var(--rp-text)]">Pod details</h1>
          <button
            type="button"
            aria-label="Share pod"
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </header>

        <main className="relative z-10 grid gap-3 px-4">
          <section className="relative -mx-4 -mt-12 overflow-hidden rounded-b-[28px] border-b border-[var(--rp-border)] bg-[var(--rp-shell)] shadow-[var(--rp-shadow-soft)]">
            <div className="relative min-h-[430px] pt-12">
              <Image
                src="/images/ridepod/airport-runway-night.png"
                alt="Airport runway with airplane at night"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover object-[54%_center]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,18,0.08)_0%,rgba(5,11,18,0.28)_42%,rgba(5,11,18,0.86)_78%,rgba(5,11,18,0.98)_100%)]" />

              <div className="relative z-10 flex justify-end px-5 pt-14">
                <span className="inline-flex items-center gap-2 rounded-[18px] border border-blue-300/35 bg-blue-500/18 px-5 py-2 text-lg font-black text-blue-100">
                  <Plane className="h-5 w-5" />
                  {airportDirectionLabel(ride)}
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5">
                <h2 className="max-w-full whitespace-nowrap text-[30px] font-black leading-none tracking-tight text-white min-[390px]:text-[34px]">
                  {ride.fromLabel} {"\u2192"} {ride.toLabel}
                </h2>

                <p className="mt-5 text-xl font-semibold text-[var(--rp-muted-strong)]">
                  {ride.dateLabel} <span className="px-2 text-[var(--rp-primary)]" aria-hidden="true">{"\u00b7"}</span> {ride.timeLabel}
                </p>

                <div className="mt-4 border-t border-white/14 pt-4">
                  <div className="grid grid-cols-[1fr_auto] gap-4">
                    <div className="min-w-0 pr-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <RiderStack ride={ride} />
                        <p className="min-w-0 text-lg font-black text-[var(--rp-text)]">
                          {seatsUsed} / {ride.seatsTotal} seats filled
                        </p>
                      </div>
                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/14">
                        <div className="h-full rounded-full bg-[var(--rp-primary)]" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <div className="min-w-[132px] border-l border-white/14 pl-4 text-right">
                      <p className="text-base font-semibold text-[var(--rp-muted-strong)]">Est. share</p>
                      <p className="mt-1 text-3xl font-black leading-none text-white">HK${ride.pricePerPerson}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">per person</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <AirportCard>
            <h2 className="text-xl font-black text-[var(--rp-text)]">Airport details</h2>
            <div className="mt-5">
              <AirportDetailItem icon={<Plane className="h-7 w-7" />} label="Pickup" value={pickup} large />
              <AirportDetailItem icon={<MapPin className="h-7 w-7" />} label="Dropoff" value={dropoff} large />
              <AirportDetailItem icon={<BriefcaseBusiness className="h-7 w-7" />} label="Luggage" value={ride.luggage} />
              <AirportDetailItem icon={<CarFront className="h-7 w-7" />} label="Taxi type" value={ride.taxiType} />
            </div>
            <p className="mt-4 rounded-[16px] border border-blue-300/15 bg-blue-400/10 p-3 text-sm font-semibold leading-6 text-blue-100">
              {airportHelper}
            </p>
          </AirportCard>

          <AirportCard
            id="quote-status"
            className="scroll-mt-28 border-[var(--rp-border-strong)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rp-primary)_9%,transparent),var(--rp-card-soft))]"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] text-[var(--rp-primary)]">
                <Clock3 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-base font-black text-[var(--rp-text)]">Quote status</p>
                <h2 className="mt-3 text-xl font-black text-[var(--rp-text)]">{currentStatus.title}</h2>
                <p className="mt-2 text-base font-semibold leading-7 text-[var(--rp-muted-strong)]">
                  {currentStatus.text}
                </p>
                <QuoteReadySummary
                  ride={ride}
                  joinView={joinView}
                  acceptedGuestCount={acceptedGuestCount}
                  requiredGuestCount={requiredGuestCount}
                />
              </div>
            </div>
          </AirportCard>
        </main>
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
