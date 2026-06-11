"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CarFront,
  CheckCircle2,
  ChevronDown,
  Forward,
  Plane,
  ReceiptText,
  UserPlus,
  UserRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { HomeRide } from "@/lib/home-ride-mock";
import {
  formatHkdCents,
  LockSeatConfirmationModal,
  type LuggageContribution,
  PodDetailSetupBadges,
  PodHeroJoinButton,
  PickupReadyCards,
  RoutePlanCard,
  StickyPodDetailCta,
  isRideAppSelfSettlePod,
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

type HowItWorksStepId = 1 | 2 | 3 | 4;

const howItWorksSteps: Array<{
  id: HowItWorksStepId;
  label: string;
  title: string;
  body: string;
  icon: typeof UserRound;
}> = [
  {
    id: 1,
    label: "Join pod",
    title: "Join pod",
    body: "Guests join the pod and lock a seat first. No fare is charged at this stage.",
    icon: UserPlus,
  },
  {
    id: 2,
    label: "Taxi partner quote",
    title: "Taxi partner quote",
    body: "A licensed taxi partner reviews the airport route, taxi type, and luggage needs, then sends one shared quote.",
    icon: ReceiptText,
  },
  {
    id: 3,
    label: "Guests accept",
    title: "Guests accept",
    body: "Locked guests review the quote and accept it before the airport ride proceeds.",
    icon: CheckCircle2,
  },
  {
    id: 4,
    label: "Ride proceeds",
    title: "Ride proceeds",
    body: "After guests accept the quote, pickup details are confirmed and the ride proceeds.",
    icon: CarFront,
  },
];

const rideAppHowItWorksSteps: typeof howItWorksSteps = [
  {
    id: 1,
    label: "Join pod",
    title: "Join as interest",
    body: "Riders join first as interest / seat hold. The RidePod fee is not demo-confirmed at initial join.",
    icon: UserPlus,
  },
  {
    id: 2,
    label: "Host details",
    title: "Host shares ride details",
    body: "The host shares airport pickup/dropoff, luggage needs, ride app, fare estimate, split method, and confirm-by deadline.",
    icon: ReceiptText,
  },
  {
    id: 3,
    label: "Confirm details",
    title: "Riders confirm details",
    body: "Riders confirm current details before the deadline. Ride fare is handled outside RidePod.",
    icon: CheckCircle2,
  },
  {
    id: 4,
    label: "Gather",
    title: "Ready to gather",
    body: "Chat opens only after required riders confirm current details and the RidePod fee is demo-confirmed or waived.",
    icon: CarFront,
  },
];

function getDefaultHowItWorksStep(ride: HomeRide, joinView: string): HowItWorksStepId {
  const joinStatus = joinView.toLowerCase();
  const statusValues = [ride.status, ride.quoteStatus, ride.pickupStatus, ride.driverAssignmentStatus]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (
    ["ready_for_pickup", "ride_in_progress", "ride_started", "completed", "partner_arrived"].includes(joinStatus) ||
    statusValues.some((status) => ["ready_for_pickup", "ride_in_progress", "ride_started", "completed", "partner_arrived"].includes(status))
  ) {
    return 4;
  }

  if (
    ["quote_ready", "pending_acceptance", "quote_accepted", "all_accepted"].includes(joinStatus) ||
    statusValues.some((status) => ["quote_ready", "pending_acceptance", "quote_accepted", "all_accepted"].includes(status))
  ) {
    return 3;
  }

  if (
    ["forming", "seat_lock", "joined"].includes(joinStatus) ||
    statusValues.some((status) => ["forming", "seat_lock", "joined"].includes(status))
  ) {
    return 1;
  }

  if (joinStatus === "quote_pending" || statusValues.some((status) => ["waiting_quote", "quote_pending"].includes(status))) {
    return 2;
  }

  return 1;
}

function FlowStep({
  step,
  active,
  completed,
  onSelect,
}: {
  step: (typeof howItWorksSteps)[number];
  active: boolean;
  completed: boolean;
  onSelect: () => void;
}) {
  const Icon = step.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group grid min-w-0 flex-1 justify-items-center gap-2 rounded-[16px] border p-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rp-primary)]",
        active
          ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_13%,transparent)] shadow-[0_0_24px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)]"
          : "border-transparent hover:border-[var(--rp-border)] hover:bg-[var(--rp-card-soft)]",
      )}
    >
      <span
        className={cn(
          "relative grid h-11 w-11 place-items-center rounded-full border text-sm font-black transition",
          active
            ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]"
            : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] group-hover:text-[var(--rp-text)]",
        )}
      >
        <Icon className="h-5 w-5" />
        {completed ? (
          <CheckCircle2 className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[var(--rp-shell)] text-[var(--rp-primary)]" />
        ) : null}
      </span>
      <span
        className={cn(
          "text-[11px] font-black leading-4 transition min-[390px]:text-xs",
          active ? "text-[var(--rp-primary)]" : "text-[var(--rp-muted-strong)] group-hover:text-[var(--rp-text)]",
        )}
      >
        {step.label}
      </span>
    </button>
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

function getEstimatedShareRange(pricePerPerson: number) {
  const low = Math.max(1, Math.floor(pricePerPerson * 0.9));
  const high = Math.ceil(pricePerPerson * 1.1);

  return `HK$${low}-${high}`;
}

function getHeroQuoteStatus(ride: HomeRide, joinView: string) {
  if (isRideAppSelfSettlePod(ride) && (joinView === "quote_pending" || joinView === "joined")) return "Waiting for ride details";
  if (isRideAppSelfSettlePod(ride) && (joinView === "quote_ready" || joinView === "quote_accepted" || joinView === "all_accepted")) return "Details ready";
  if (joinView === "quote_pending" || joinView === "joined") return "Waiting for quote";
  if (typeof ride.quoteAmountCents === "number") return formatHkdCents(ride.quoteAmountCents);
  if (joinView === "quote_ready" || joinView === "quote_accepted" || joinView === "all_accepted") return "Ready";
  if (joinView === "ready_for_pickup") return "Ready for pickup";

  return "Waiting for quote";
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
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [selectedHowItWorksStep, setSelectedHowItWorksStep] = useState<HowItWorksStepId | null>(null);
  const [showLockSeatModal, setShowLockSeatModal] = useState(false);
  const [lockSeatUnderstood, setLockSeatUnderstood] = useState(false);
  const [lockSeatLuggage, setLockSeatLuggage] = useState<LuggageContribution>({
    bagsCount: 0,
    hasLargeLuggage: false,
  });
  const {
    seatsUsed,
    joinView,
    acceptedGuestCount,
    requiredGuestCount,
    attendanceMessage,
    attendanceError,
    isCancellingAttendance,
    canLockSeatAfterCancel,
    groupLuggageLabel,
    userLuggageLabel,
    luggageCapacityWarning,
    lockSeat,
    acceptQuote,
    declineQuote,
    cancelSeat,
    cancelQuoteAcceptance,
    requestCancellation,
    markAtPickup,
    cancelAttendance,
  } = usePodDetailJoinState(ride);
  const defaultHowItWorksStep = getDefaultHowItWorksStep(ride, joinView);
  const activeHowItWorksStep = selectedHowItWorksStep ?? defaultHowItWorksStep;
  const selfSettlePod = isRideAppSelfSettlePod(ride);
  const airportHowItWorksSteps = selfSettlePod ? rideAppHowItWorksSteps : howItWorksSteps;
  const activeHowItWorksItem =
    airportHowItWorksSteps.find((step) => step.id === activeHowItWorksStep) ?? airportHowItWorksSteps[0];
  const progress = Math.min((seatsUsed / ride.seatsTotal) * 100, 100);
  const estimatedShareRange = getEstimatedShareRange(ride.pricePerPerson);
  const quoteStatus = getHeroQuoteStatus(ride, joinView);
  const isFromAirport = ride.airportDirection === "from_airport";
  const airportHelper = selfSettlePod
    ? "Airport pickup/dropoff and luggage needs should be checked in the ride app before riders confirm current details."
    : isFromAirport
      ? "Airport pickup and luggage space are included in the quote."
      : "Airport dropoff and luggage space are included in the quote.";

  function closeLockSeatModal() {
    setShowLockSeatModal(false);
    setLockSeatUnderstood(false);
    setLockSeatLuggage({ bagsCount: 0, hasLargeLuggage: false });
  }

  function confirmLockSeat() {
    if (!lockSeatUnderstood) return;
    lockSeat(lockSeatLuggage);
    closeLockSeatModal();
  }

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
          <span className="h-10 w-10" aria-hidden="true" />
          <button
            type="button"
            aria-label="Share pod"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--rp-primary)]/70 bg-[rgba(20,27,34,0.94)] px-3 pl-4 text-sm font-black text-[var(--rp-primary)] shadow-[0_10px_26px_rgba(0,0,0,0.28),0_0_22px_rgba(245,197,91,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[rgba(33,39,45,0.98)]"
          >
            <span>Share</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(180deg,#ffd86b,#f0ae32)] text-[#061019] shadow-[0_5px_16px_rgba(245,197,91,0.28),inset_0_1px_0_rgba(255,255,255,0.35)]">
              <Forward className="h-4 w-4 fill-current stroke-[2.4]" />
            </span>
          </button>
        </header>

        <main className="relative z-10 grid gap-3 px-4">
          <section className="relative -mx-4 -mt-12 overflow-hidden rounded-b-[28px] border-b border-[var(--rp-border)] bg-[var(--rp-shell)] shadow-[var(--rp-shadow-soft)]">
            <div className="relative min-h-[488px] pt-12">
              <Image
                src="/images/ridepod/home-dark-mode-background.png"
                alt="Hong Kong skyline illustration at night"
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/12 px-3 py-1 text-sm font-black text-cyan-100">
                    <Plane className="h-3.5 w-3.5" />
                    {airportDirectionLabel(ride)}
                  </span>
                  <PodDetailSetupBadges ride={ride} />
                </div>
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/14 bg-black/26 px-3 py-2 text-xs font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-md">
                  <UserRound className="h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
                  <span className="uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">Created by</span>
                  <span className="truncate text-[var(--rp-text)]">{ride.hostName || "RidePod host"}</span>
                </div>

                <div className="mt-4 border-t border-white/14 pt-4">
                  <div className="grid grid-cols-[1fr_auto] items-end gap-4">
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
                    <div className="min-w-[144px] border-l border-white/14 pl-4 text-right">
                      <p className="text-base font-semibold text-[var(--rp-muted-strong)]">Est. share</p>
                      <p className="mt-1 text-3xl font-black leading-none text-white">{estimatedShareRange}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">per person</p>
                    </div>
                  </div>
                  <div id="quote-status" className="mt-4 grid grid-cols-[1fr_140px] items-center gap-3">
                    <div className="rounded-[14px] border border-white/14 bg-black/24 px-3 py-2 text-left backdrop-blur-md">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
                        {selfSettlePod ? "Ride detail status" : "Quote status"}
                      </p>
                      <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">{quoteStatus}</p>
                    </div>
                    <div className="[&>button]:mt-0">
                      <PodHeroJoinButton ride={ride} joinView={joinView} onJoin={() => setShowLockSeatModal(true)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <AirportCard className="mt-1 p-4">
            <button
              type="button"
              onClick={() => setShowHowItWorks((current) => !current)}
              aria-expanded={showHowItWorks}
              className="flex min-h-10 w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
                How it works
              </span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]">
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform",
                    showHowItWorks ? "rotate-180" : "rotate-0",
                  )}
                />
              </span>
            </button>

            {showHowItWorks ? (
              <>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-1 min-[390px]:gap-2">
                  {airportHowItWorksSteps.map((step, index) => (
                    <Fragment key={step.id}>
                      <FlowStep
                        step={step}
                        active={activeHowItWorksStep === step.id}
                        completed={step.id < defaultHowItWorksStep}
                        onSelect={() => setSelectedHowItWorksStep(step.id)}
                      />
                      {index < airportHowItWorksSteps.length - 1 ? (
                        <ArrowRight
                          className={cn(
                            "mt-5 h-4 w-4 shrink-0 min-[390px]:h-5 min-[390px]:w-5",
                            step.id < defaultHowItWorksStep ? "text-[var(--rp-primary)]" : "text-[var(--rp-muted)]",
                          )}
                        />
                      ) : null}
                    </Fragment>
                  ))}
                </div>
                <div className="mt-4 rounded-[18px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_58%,var(--rp-card-soft))] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
                    {activeHowItWorksItem.title}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                    {activeHowItWorksItem.body}
                  </p>
                </div>
              </>
            ) : null}
          </AirportCard>

          <AirportCard>
            <h2 className="text-xl font-black text-[var(--rp-text)]">Airport details</h2>
            <div className="mt-5 grid gap-4">
              <RoutePlanCard ride={ride} joinView={joinView} />
              <AirportDetailItem icon={<BriefcaseBusiness className="h-7 w-7" />} label="Group luggage" value={groupLuggageLabel} />
              <AirportDetailItem icon={<CarFront className="h-7 w-7" />} label={selfSettlePod ? "Ride app" : "Taxi type"} value={ride.taxiType} />
            </div>
            {userLuggageLabel ? (
              <p className="mt-4 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-2 text-xs font-black text-[var(--rp-primary)]">
                {userLuggageLabel}
              </p>
            ) : null}
            {luggageCapacityWarning ? (
              <p className="mt-3 rounded-[14px] border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">
                {selfSettlePod
                  ? "Check luggage capacity in the selected ride app before confirming current details."
                  : "This taxi may not fit the group luggage. Taxi type and luggage capacity depend on taxi partner availability."}
              </p>
            ) : null}
            <p className="mt-4 rounded-[16px] border border-blue-300/15 bg-blue-400/10 p-3 text-sm font-semibold leading-6 text-blue-100">
              {airportHelper}
            </p>
          </AirportCard>

          <PickupReadyCards
            ride={ride}
            joinView={joinView}
            acceptedGuestCount={acceptedGuestCount}
            requiredGuestCount={requiredGuestCount}
          />
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
        onCancelSeat={cancelSeat}
        onCancelQuoteAcceptance={cancelQuoteAcceptance}
        onRequestCancellation={requestCancellation}
        onMarkAtPickup={markAtPickup}
        onCancelAttendance={cancelAttendance}
        attendanceMessage={attendanceMessage}
        attendanceError={attendanceError}
        canLockSeatAfterCancel={canLockSeatAfterCancel}
        isCancellingAttendance={isCancellingAttendance}
      />
      {showLockSeatModal ? (
        <LockSeatConfirmationModal
          ride={ride}
          seatsUsed={seatsUsed}
          checked={lockSeatUnderstood}
          luggage={lockSeatLuggage}
          onCheckedChange={setLockSeatUnderstood}
          onLuggageChange={setLockSeatLuggage}
          onCancel={closeLockSeatModal}
          onConfirm={confirmLockSeat}
        />
      ) : null}
    </div>
  );
}
