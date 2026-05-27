"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CarFront,
  Clock3,
  MapPin,
  Share2,
  UserRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { HomeRide } from "@/lib/home-ride-mock";
import {
  podDetailQuoteCopy,
  QuoteReadySummary,
  StickyPodDetailCta,
  usePodDetailJoinState,
} from "@/components/pod-detail-join-state";

function DetailShell({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_90%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function FlowStep({ index, label, icon }: { index: number; label: string; icon?: ReactNode }) {
  return (
    <div className="grid min-w-0 flex-1 justify-items-center gap-2 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-sm font-black text-[var(--rp-text)]">
        {icon ?? index}
      </span>
      <span className="text-xs font-black leading-4 text-[var(--rp-primary)]">{label}</span>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3", className)}>
      <span className="mt-1 text-[var(--rp-primary)]">{icon}</span>
      <div>
        <p className="text-sm font-black text-[var(--rp-primary)]">{label}</p>
        <p className="mt-0.5 text-base font-black leading-5 text-[var(--rp-text)]">{value}</p>
      </div>
    </div>
  );
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

export function NormalPodDetailPage({ ride }: { ride: HomeRide }) {
  const { seatsUsed, joinView, acceptedGuestCount, requiredGuestCount, lockSeat, acceptQuote, declineQuote } =
    usePodDetailJoinState(ride);
  const progress = Math.min((seatsUsed / ride.seatsTotal) * 100, 100);
  const currentStatus = podDetailQuoteCopy[joinView];
  const pickup = ride.pickupLabel ?? ride.fromLabel;
  const dropoff = ride.dropoffLabel ?? ride.toLabel;

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
            <div className="relative min-h-[462px] pt-12">
              <Image
                src="/images/ridepod/pod-detail-hong-kong-skyline.png"
                alt="Hong Kong skyline at night"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,18,0.04)_0%,rgba(5,11,18,0.08)_34%,rgba(5,11,18,0.74)_76%,rgba(5,11,18,0.96)_100%)]" />

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
                        <div
                          className="h-full rounded-full bg-[var(--rp-primary)]"
                          style={{ width: `${progress}%` }}
                        />
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

          <DetailShell className="mt-1 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">How it works</p>
            <div className="mt-4 flex items-start gap-2">
              <FlowStep index={1} label="Join pod" icon={<UserRound className="h-5 w-5" />} />
              <ArrowRight className="mt-3 h-5 w-5 shrink-0 text-[var(--rp-muted)]" />
              <FlowStep index={2} label="Taxi partner quote" />
              <ArrowRight className="mt-3 h-5 w-5 shrink-0 text-[var(--rp-muted)]" />
              <FlowStep index={3} label="Guests accept" />
              <ArrowRight className="mt-3 h-5 w-5 shrink-0 text-[var(--rp-muted)]" />
              <FlowStep index={4} label="Ride proceeds" />
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Final share is confirmed after the taxi partner quote. No live payment is charged at this step.
            </p>
          </DetailShell>

          <DetailShell>
            <h2 className="text-xl font-black text-[var(--rp-text)]">Trip details</h2>
            <div className="mt-4 grid gap-4">
              <DetailItem icon={<MapPin className="h-5 w-5" />} label="Pickup" value={pickup} />
              <DetailItem icon={<MapPin className="h-5 w-5" />} label="Dropoff" value={dropoff} />
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--rp-border)] pt-4">
                <DetailItem icon={<CarFront className="h-6 w-6" />} label="Taxi type" value={ride.taxiType} />
                <DetailItem icon={<BriefcaseBusiness className="h-6 w-6" />} label="Luggage" value={ride.luggage} />
              </div>
            </div>
          </DetailShell>

          <DetailShell
            id="quote-status"
            className="scroll-mt-28 border-[var(--rp-border-strong)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rp-primary)_9%,transparent),var(--rp-card-soft))]"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/18 text-[var(--rp-text)]">
                <Clock3 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-base font-black text-[var(--rp-text)]">Quote status</p>
                <h2 className="mt-1 text-xl font-black text-[var(--rp-text)]">{currentStatus.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
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
          </DetailShell>
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
