"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useId, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ListChecks,
  ReceiptText,
  Repeat2,
  Share2,
  ShieldCheck,
  Smartphone,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { HomeRide } from "@/lib/home-ride-mock";
import {
  formatGroupLuggageLabel,
  formatUserLuggageLabel,
  getBaseHasLargeLuggage,
  getBaseLuggageCount,
  getTaxiMaxBags,
  isRideAppSelfSettlePod,
  type LuggageContribution,
  PickupReadyCards,
  RoutePlanCard,
  StickyPodDetailCta,
  usePodDetailJoinState,
} from "@/components/pod-detail-join-state";
import { formatRideAppEstimatedFareTotal } from "@/lib/ride-app-fare-estimate";

function RecurringCard({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--rp-border)] py-3 last:border-b-0">
      <dt className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</dt>
      <dd className="max-w-[62%] text-right text-sm font-black leading-5 text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

function tripPatternLabel(ride: HomeRide) {
  return ride.tripPattern === "back_and_forth" ? "Back-and-forth" : "One-way";
}

function scheduleLabel(ride: HomeRide) {
  return ride.scheduleLabel ?? `${ride.repeatsPattern ?? ride.dateLabel} \u00b7 ${ride.timeLabel}`;
}

function whoCanJoinLabel(ride: HomeRide) {
  return ride.podType === "Women-only" ? "Women-only pod" : ride.podType;
}

type DetailTab = "trip" | "pod";

const detailTabs: Array<{ id: DetailTab; label: string }> = [
  { id: "trip", label: "Trip" },
  { id: "pod", label: "Pod" },
];

type HowItWorksStepId = 1 | 2 | 3 | 4;
type HowItWorksRideMode = "taxi" | "ride_app";
type HowItWorksStep = {
  id: HowItWorksStepId;
  label: string;
  title: string;
  body: string;
  icon: typeof UserRound;
};

const taxiHowItWorksSteps: HowItWorksStep[] = [
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
    body: "RidePod gets or shows the taxi partner quote for the shared pod.",
    icon: ReceiptText,
  },
  {
    id: 3,
    label: "Guests accept",
    title: "Guests accept",
    body: "Guests accept the quote before the protected taxi ride proceeds.",
    icon: CheckCircle2,
  },
  {
    id: 4,
    label: "Ride proceeds",
    title: "Ride proceeds",
    body: "The taxi ride proceeds after the group accepts the quote.",
    icon: CarFront,
  },
];

const rideAppHowItWorksSteps: HowItWorksStep[] = [
  {
    id: 1,
    label: "Join pod",
    title: "Join pod",
    body: "Guests join the self-settle pod and lock a seat. HK$5 platform fee may apply when joining.",
    icon: UserPlus,
  },
  {
    id: 2,
    label: "Confirm details",
    title: "Confirm details",
    body: "The group confirms pickup point, ride app, estimated fare, fare split, and payment method in chat.",
    icon: ListChecks,
  },
  {
    id: 3,
    label: "Book ride app",
    title: "Book ride app",
    body: "The host or agreed booker requests the ride app outside RidePod after enough riders confirm.",
    icon: Smartphone,
  },
  {
    id: 4,
    label: "Pay after ride",
    title: "Pay after ride",
    body: "Final ride fare paid directly to booker after the ride. RidePod does not collect or protect the ride fare.",
    icon: ReceiptText,
  },
];

function getHowItWorksSteps(rideMode: HowItWorksRideMode = "taxi") {
  return rideMode === "ride_app" ? rideAppHowItWorksSteps : taxiHowItWorksSteps;
}

function getDefaultHowItWorksStep(
  ride: HomeRide,
  joinView: string,
  rideMode: HowItWorksRideMode = "taxi",
): HowItWorksStepId {
  const joinStatus = joinView.toLowerCase();
  const statusValues = [ride.status, ride.quoteStatus, ride.pickupStatus, ride.driverAssignmentStatus]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (rideMode === "ride_app") {
    if (["completed", "ride_completed"].includes(joinStatus) || statusValues.some((status) => ["completed", "ride_completed"].includes(status))) {
      return 4;
    }

    if (ride.bookingDetailsShared === true || ride.rideAppBookingDetailsConfirmed === true) {
      return 3;
    }

    if (["joined", "seat_lock"].includes(joinStatus) || ride.currentUserJoined === true) {
      return 2;
    }

    return 1;
  }

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
  rideMode = "taxi",
}: {
  step: HowItWorksStep;
  active: boolean;
  completed: boolean;
  onSelect: () => void;
  rideMode?: HowItWorksRideMode;
}) {
  const Icon = step.icon;
  const accentActive =
    rideMode === "ride_app"
      ? "border-cyan-300 bg-cyan-300/12 shadow-[0_0_24px_rgba(103,232,249,0.18)]"
      : "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_13%,transparent)] shadow-[0_0_24px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)]";
  const iconActive =
    rideMode === "ride_app"
      ? "border-cyan-300 bg-cyan-300/14 text-cyan-200"
      : "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]";
  const textActive = rideMode === "ride_app" ? "text-cyan-200" : "text-[var(--rp-primary)]";
  const ringColor = rideMode === "ride_app" ? "focus-visible:ring-cyan-300" : "focus-visible:ring-[var(--rp-primary)]";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group grid min-w-0 flex-1 justify-items-center gap-2 rounded-[16px] border p-2 text-center transition focus-visible:outline-none focus-visible:ring-2",
        ringColor,
        active
          ? accentActive
          : "border-transparent hover:border-[var(--rp-border)] hover:bg-[var(--rp-card-soft)]",
      )}
    >
      <span
        className={cn(
          "relative grid h-11 w-11 place-items-center rounded-full border text-sm font-black transition",
          active
            ? iconActive
            : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] group-hover:text-[var(--rp-text)]",
        )}
      >
        <Icon className="h-5 w-5" />
        {completed ? (
          <CheckCircle2 className={cn("absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[var(--rp-shell)]", textActive)} />
        ) : null}
      </span>
      <span
        className={cn(
          "text-[11px] font-black leading-4 transition min-[390px]:text-xs",
          active ? textActive : "text-[var(--rp-muted-strong)] group-hover:text-[var(--rp-text)]",
        )}
      >
        {step.label}
      </span>
    </button>
  );
}

function DetailSwitch({
  value,
  onChange,
}: {
  value: DetailTab;
  onChange: (value: DetailTab) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-1">
      {detailTabs.map((tab) => {
        const active = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "min-h-11 rounded-[14px] px-4 text-sm font-black transition",
              active
                ? "bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] text-[#07111a] shadow-[0_10px_22px_color-mix(in_srgb,var(--rp-primary)_22%,transparent)]"
                : "text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-soft)] hover:text-[var(--rp-text)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[18px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card-muted)_82%,transparent),color-mix(in_srgb,var(--rp-card-soft)_94%,transparent))] p-3.5 shadow-[var(--rp-shadow-soft)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--rp-primary)_45%,transparent),transparent)]" />
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-[color-mix(in_srgb,var(--rp-primary)_42%,var(--rp-border))] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)] shadow-[0_10px_22px_color-mix(in_srgb,var(--rp-primary)_10%,transparent)]">
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">{label}</p>
          <p className="mt-1 text-[17px] font-black leading-5 text-[var(--rp-text)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailTag({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-sm font-black",
        tone === "green"
          ? "border-emerald-200 bg-emerald-300/15 text-emerald-100"
          : tone === "blue"
            ? "border-sky-200 bg-sky-300/15 text-sky-100"
            : "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]",
      )}
    >
      {children}
    </span>
  );
}

function getTaxiTypeVisual(taxiType: string) {
  const normalized = taxiType.toLowerCase();

  if (normalized.includes("compact")) {
    return {
      title: "Compact 4-seat taxi",
      description: "Good for lighter luggage.",
      imageSrc: "/images/ridepod/taxis/compact-4-seat.png",
      riders: 4,
      bags: 2,
    };
  }

  if (normalized.includes("large") || normalized.includes("luggage")) {
    return {
      title: "Large-luggage 4-seat taxi",
      description: "Best for airport trips.",
      imageSrc: "/images/ridepod/taxis/large-luggage-4-seat.png",
      riders: 4,
      bags: 4,
    };
  }

  if (normalized.includes("6-seat") || normalized.includes("6 seater") || normalized.includes("6-seater")) {
    return {
      title: "6-seat taxi",
      description: "Best for bigger groups.",
      imageSrc: "/images/ridepod/taxis/taxi-6-seat.png",
      riders: 6,
      bags: 2,
    };
  }

  return {
    title: "Standard 4-seat taxi",
    description: "Everyday shared taxi.",
    imageSrc: "/images/ridepod/taxis/standard-4-seat.png",
    riders: 4,
    bags: 3,
  };
}

function TaxiTypeVisualCard({ taxiType }: { taxiType: string }) {
  const visual = getTaxiTypeVisual(taxiType);

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card-muted)_88%,transparent),var(--rp-card-soft))]">
      <div className="relative h-32 border-b border-[var(--rp-border)] bg-[#07111a]">
        <Image
          src={visual.imageSrc}
          alt={visual.title}
          fill
          sizes="(min-width: 640px) 420px, calc(100vw - 72px)"
          className="object-contain p-3"
        />
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Taxi requested</p>
          <h3 className="mt-1 text-xl font-black leading-tight text-[var(--rp-text)]">{visual.title}</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">{visual.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] pt-3">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-[var(--rp-muted-strong)]" />
            <div>
              <p className="text-lg font-black text-[var(--rp-text)]">x{visual.riders}</p>
              <p className="text-xs font-semibold text-[var(--rp-muted-strong)]">Up to {visual.riders} riders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5 text-[var(--rp-muted-strong)]" />
            <div>
              <p className="text-lg font-black text-[var(--rp-text)]">x{visual.bags}</p>
              <p className="text-xs font-semibold text-[var(--rp-muted-strong)]">Up to {visual.bags} bags</p>
            </div>
          </div>
        </div>
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

function getRecurringHeroQuoteStatus(joined: boolean, joinView: string, selfSettle: boolean) {
  if (joined && joinView === "joined") return "Seat locked";
  if (selfSettle && joinView === "quote_pending") return "Waiting for ride details";
  if (joinView === "quote_pending") return "Waiting for quote";
  if (selfSettle && (joinView === "quote_ready" || joinView === "quote_accepted" || joinView === "all_accepted")) return "Details ready";
  if (joinView === "quote_ready" || joinView === "quote_accepted" || joinView === "all_accepted") return "Ready";
  if (joinView === "ready_for_pickup") return "Ready for pickup";

  return selfSettle ? "Waiting for ride details" : "Waiting for quote";
}

function LockRecurringSeatModal({
  ride,
  seatsUsed,
  checked,
  luggage,
  onCheckedChange,
  onLuggageChange,
  onCancel,
  onConfirm,
}: {
  ride: HomeRide;
  seatsUsed: number;
  checked: boolean;
  luggage: LuggageContribution;
  onCheckedChange: (checked: boolean) => void;
  onLuggageChange: (luggage: LuggageContribution) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const baseLuggageCount = getBaseLuggageCount(ride.luggage);
  const baseHasLargeLuggage = getBaseHasLargeLuggage(ride.luggage);
  const totalLuggageCount = baseLuggageCount + luggage.bagsCount;
  const totalHasLargeLuggage = baseHasLargeLuggage || luggage.hasLargeLuggage;
  const exceedsCapacity = totalLuggageCount > getTaxiMaxBags(ride.taxiType);
  const selfSettlePod = isRideAppSelfSettlePod(ride);
  const rideAppTotalEstimate = formatRideAppEstimatedFareTotal(ride);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">
          Lock recurring seat?
        </h2>
        <div className="mt-3 grid gap-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          <p>You&apos;ll join this recurring shared taxi pod and reserve one seat.</p>
          <p>Each ride gets its own taxi partner quote before guests accept.</p>
          <p>No live payment is charged now.</p>
        </div>

        <dl className="mt-5 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <DetailRow label="Route" value={`${ride.fromLabel} \u2192 ${ride.toLabel}`} />
          <DetailRow label="Schedule" value={scheduleLabel(ride)} />
          <DetailRow
            label={selfSettlePod ? "Total estimate" : "Est. share"}
            value={selfSettlePod ? rideAppTotalEstimate ?? "Ride app estimate pending" : `HK$${ride.pricePerPerson} per person`}
          />
          <DetailRow label="Seats" value={`${seatsUsed} / ${ride.seatsTotal} seats filled`} />
        </dl>

        <section className="mt-5 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <p className="text-sm font-black text-[var(--rp-text)]">Your luggage</p>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            Your luggage is added to each recurring ride unless changed later.
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
            <span className="text-sm font-black text-[var(--rp-text)]">Bags</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={luggage.bagsCount <= 0}
                onClick={() => {
                  const nextBagsCount = Math.max(0, luggage.bagsCount - 1);
                  onLuggageChange({
                    bagsCount: nextBagsCount,
                    hasLargeLuggage: nextBagsCount > 0 && luggage.hasLargeLuggage,
                  });
                }}
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--rp-border-strong)] text-lg font-black text-[var(--rp-primary)] disabled:opacity-40"
              >
                -
              </button>
              <span className="grid h-9 min-w-10 place-items-center rounded-full bg-[var(--rp-shell)] px-3 text-base font-black">
                {luggage.bagsCount}
              </span>
              <button
                type="button"
                disabled={luggage.bagsCount >= 6}
                onClick={() => onLuggageChange({ ...luggage, bagsCount: Math.min(6, luggage.bagsCount + 1) })}
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--rp-border-strong)] text-lg font-black text-[var(--rp-primary)] disabled:opacity-40"
              >
                +
              </button>
            </span>
          </div>
          <label className="mt-3 flex items-center justify-between gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
            <span>
              <span className="block text-sm font-black text-[var(--rp-text)]">Large luggage</span>
              <span className="block text-xs font-semibold text-[var(--rp-muted-strong)]">Suitcase or bulky item.</span>
            </span>
            <input
              type="checkbox"
              disabled={luggage.bagsCount <= 0}
              checked={luggage.bagsCount > 0 && luggage.hasLargeLuggage}
              onChange={(event) => onLuggageChange({ ...luggage, hasLargeLuggage: event.target.checked })}
              className="h-5 w-5 accent-[var(--rp-primary)] disabled:opacity-40"
            />
          </label>
          <p className="mt-3 text-xs font-black text-[var(--rp-primary)]">
            Group luggage: {formatGroupLuggageLabel(totalLuggageCount, totalHasLargeLuggage)}
          </p>
          {exceedsCapacity ? (
            <p className="mt-2 rounded-[12px] border border-amber-300/25 bg-amber-400/10 p-2 text-xs font-bold leading-5 text-amber-100">
              This taxi may not fit the group luggage. Taxi type and luggage capacity depend on taxi partner availability.
            </p>
          ) : null}
        </section>

        <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
          />
          <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
            I understand each ride has its own quote before it proceeds.
          </span>
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!checked}
            onClick={onConfirm}
            className={cn(
              "min-h-12 rounded-2xl border text-sm font-black transition",
              checked
                ? "border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] hover:brightness-105"
                : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
            )}
          >
            Lock recurring seat
          </button>
        </div>
      </section>
    </div>
  );
}

function RecurringStickyCta({
  ride,
  seatsUsed,
  joined,
  onOpenLock,
}: {
  ride: HomeRide;
  seatsUsed: number;
  joined: boolean;
  onOpenLock: () => void;
}) {
  const full = !joined && seatsUsed >= ride.seatsTotal;
  const quoteReady = ride.quoteStatus === "quote_ready";
  const accepted = ride.currentUserQuoteAccepted === true;
  const selfSettle = isRideAppSelfSettlePod(ride);

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-3 lg:bottom-0 lg:left-72">
      <div className="mx-auto max-w-[520px] rounded-[24px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_94%,transparent)] p-3 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl">
        {full ? (
          <button type="button" className="flex min-h-14 w-full items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)]">
            Join waitlist
          </button>
        ) : quoteReady && accepted ? (
          <button type="button" disabled className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-base font-black text-[var(--rp-muted-strong)]">
            <CheckCircle2 className="h-5 w-5" />
            Quote accepted
          </button>
        ) : quoteReady ? (
          <a href="#quote-status" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)]">
            <CheckCircle2 className="h-5 w-5" />
            Review quote
          </a>
        ) : joined ? (
          <div className="grid gap-2">
            <button type="button" disabled className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-base font-black text-[var(--rp-muted-strong)]">
              <CheckCircle2 className="h-5 w-5" />
              You joined this recurring pod
            </button>
            <a href="#quote-status" className="flex min-h-12 w-full items-center justify-center rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-primary)]">
              View updates
            </a>
          </div>
        ) : (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={onOpenLock}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)]"
            >
              <Repeat2 className="h-5 w-5" />
              Lock recurring seat
            </button>
            <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              {selfSettle
                ? "Ride details apply to the selected ride instance. Ride fare is handled outside RidePod."
                : "Final share appears after each taxi partner quote."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function RecurringPodDetailPage({ ride }: { ride: HomeRide }) {
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("trip");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [joined, setJoined] = useState(ride.currentUserJoined === true || ride.quoteStatus === "joined");
  const [seatsUsed, setSeatsUsed] = useState(ride.seatsUsed);
  const [showLockSeatModal, setShowLockSeatModal] = useState(false);
  const [lockSeatUnderstood, setLockSeatUnderstood] = useState(false);
  const [lockSeatLuggage, setLockSeatLuggage] = useState<LuggageContribution>({
    bagsCount: 0,
    hasLargeLuggage: false,
  });
  const [currentUserLuggage, setCurrentUserLuggage] = useState<LuggageContribution>({
    bagsCount: 0,
    hasLargeLuggage: false,
  });
  const quoteState = usePodDetailJoinState(ride);
  const baseLuggageCount = getBaseLuggageCount(ride.luggage);
  const baseHasLargeLuggage = getBaseHasLargeLuggage(ride.luggage);
  const recurringGroupLuggageCount = baseLuggageCount + (joined ? currentUserLuggage.bagsCount : 0);
  const recurringGroupHasLargeLuggage = baseHasLargeLuggage || (joined && currentUserLuggage.hasLargeLuggage);
  const recurringLuggageWarning = recurringGroupLuggageCount > getTaxiMaxBags(ride.taxiType);
  const progress = Math.min((seatsUsed / ride.seatsTotal) * 100, 100);
  const recurringQuoteView = [
    "quote_ready",
    "quote_accepted",
    "all_accepted",
    "quote_declined",
    "ready_for_pickup",
    "partner_arrived",
    "at_pickup",
    "ride_started",
  ].includes(
    quoteState.joinView,
  );
  const recurringFull = !joined && seatsUsed >= ride.seatsTotal;
  const howItWorksRideMode: HowItWorksRideMode = isRideAppSelfSettlePod(ride) ? "ride_app" : "taxi";
  const recurringHeroQuoteStatus = getRecurringHeroQuoteStatus(joined, quoteState.joinView, howItWorksRideMode === "ride_app");
  const rideAppTotalEstimate = formatRideAppEstimatedFareTotal(ride);
  const howItWorksSteps = getHowItWorksSteps(howItWorksRideMode);
  const defaultHowItWorksStep = getDefaultHowItWorksStep(ride, quoteState.joinView, howItWorksRideMode);
  const [selectedHowItWorksStep, setSelectedHowItWorksStep] = useState<HowItWorksStepId | null>(null);
  const activeHowItWorksStep = selectedHowItWorksStep ?? defaultHowItWorksStep;
  const activeHowItWorksItem =
    howItWorksSteps.find((step) => step.id === activeHowItWorksStep) ?? howItWorksSteps[0];

  function closeLockSeatModal() {
    setShowLockSeatModal(false);
    setLockSeatUnderstood(false);
    setLockSeatLuggage({ bagsCount: 0, hasLargeLuggage: false });
  }

  function confirmLockSeat() {
    if (!lockSeatUnderstood) return;
    setCurrentUserLuggage(lockSeatLuggage);
    setJoined(true);
    setSeatsUsed((currentSeats) => Math.min(currentSeats + 1, ride.seatsTotal));
    closeLockSeatModal();
  }

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden pb-48 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <div className="mx-auto w-full max-w-[520px] lg:pt-4">
        <header className="relative z-20 flex h-12 items-center justify-between px-4">
          <Link href="/home" aria-label="Back to Home" className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-lg font-semibold text-[var(--rp-primary)]">Pod Details</h1>
          <button type="button" aria-label="Share pod" className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]">
            <Share2 className="h-5 w-5" />
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
                  {scheduleLabel(ride)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] px-3 py-1 text-sm font-black text-[var(--rp-primary)]">
                    <Repeat2 className="h-3.5 w-3.5" />
                    Recurring
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-full border border-white/16 bg-black/26 px-3 py-1 text-sm font-black text-[var(--rp-muted-strong)] backdrop-blur-md">
                    {ride.taxiType}
                  </span>
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
                      <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/14">
                        <div
                          className="h-full rounded-full bg-[var(--rp-primary)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="min-w-[144px] border-l border-white/14 pl-4 text-right">
                      <p className="text-base font-semibold text-[var(--rp-muted-strong)]">
                        {howItWorksRideMode === "ride_app" ? "Total estimate" : "Est. share"}
                      </p>
                      <p className="mt-1 text-3xl font-black leading-none text-white">
                        {howItWorksRideMode === "ride_app" ? rideAppTotalEstimate ?? "Pending" : `HK$${ride.pricePerPerson}`}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">
                        {howItWorksRideMode === "ride_app"
                          ? rideAppTotalEstimate
                            ? "Ride app estimate"
                            : "Ride app estimate pending"
                          : "per person"}
                      </p>
                    </div>
                  </div>
                  <div id="quote-status" className="mt-4 grid grid-cols-[1fr_150px] items-center gap-3">
                    <div className="rounded-[14px] border border-white/14 bg-black/24 px-3 py-2 text-left backdrop-blur-md">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
                        {howItWorksRideMode === "ride_app" ? "Ride detail status" : "Quote status"}
                      </p>
                      <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">{recurringHeroQuoteStatus}</p>
                    </div>
                    {recurringFull ? (
                      <button
                        type="button"
                        className="flex min-h-12 w-full items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-3 text-sm font-black text-[var(--rp-primary-text)]"
                      >
                        Join waitlist
                      </button>
                    ) : joined ? (
                      <button
                        type="button"
                        disabled
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-white/14 bg-black/24 px-3 text-sm font-black text-[var(--rp-muted-strong)]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Seat locked
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowLockSeatModal(true)}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--rp-gradient-primary)] px-3 text-sm font-black text-[var(--rp-primary-text)]"
                      >
                        <Repeat2 className="h-4 w-4" />
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <RecurringCard className="mt-1 p-4">
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
                <ChevronDown className={cn("h-5 w-5 transition-transform", showHowItWorks ? "rotate-180" : "rotate-0")} />
              </span>
            </button>

            {showHowItWorks ? (
              <>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-1 min-[390px]:gap-2">
                  {howItWorksSteps.map((step, index) => (
                    <Fragment key={step.id}>
                      <FlowStep
                        step={step}
                        active={activeHowItWorksStep === step.id}
                        completed={step.id < defaultHowItWorksStep}
                        onSelect={() => setSelectedHowItWorksStep(step.id)}
                        rideMode={howItWorksRideMode}
                      />
                      {index < howItWorksSteps.length - 1 ? (
                        <ArrowRight
                          className={cn(
                            "mt-5 h-4 w-4 shrink-0 min-[390px]:h-5 min-[390px]:w-5",
                            step.id < defaultHowItWorksStep
                              ? howItWorksRideMode === "ride_app"
                                ? "text-cyan-200"
                                : "text-[var(--rp-primary)]"
                              : "text-[var(--rp-muted)]",
                          )}
                        />
                      ) : null}
                    </Fragment>
                  ))}
                </div>
                <div className="mt-4 rounded-[18px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_58%,var(--rp-card-soft))] p-4">
                  <p
                    className={cn(
                      "text-xs font-black uppercase tracking-[0.12em]",
                      howItWorksRideMode === "ride_app" ? "text-cyan-200" : "text-[var(--rp-primary)]",
                    )}
                  >
                    {activeHowItWorksItem.title}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                    {activeHowItWorksItem.body}
                  </p>
                </div>
              </>
            ) : null}
          </RecurringCard>

          <RecurringCard>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[var(--rp-text)]">
                {activeDetailTab === "trip" ? "Trip details" : "Pod details"}
              </h2>
            </div>
            <div className="mt-4">
              <DetailSwitch value={activeDetailTab} onChange={setActiveDetailTab} />
            </div>

            {activeDetailTab === "trip" ? (
              <div className="mt-4 grid gap-4">
                <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
                  <DetailItem icon={<CalendarDays className="h-5 w-5" />} label="Schedule" value={scheduleLabel(ride)} />
                </div>
                <div className="grid gap-3 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
                  <DetailRow label="Repeats" value={ride.repeatsPattern ?? ride.dateLabel} />
                  <DetailRow label="Trip pattern" value={tripPatternLabel(ride)} />
                  <DetailRow label="Starts" value={ride.startLabel ?? "May 27, 2026"} />
                  <DetailRow label="Ends" value={ride.endLabel ?? "After 8 rides"} />
                  {ride.tripPattern === "back_and_forth" ? (
                    <>
                      <DetailRow label="Outbound" value={ride.outboundLabel ?? `${ride.timeLabel} \u00b7 ${ride.fromLabel} \u2192 ${ride.toLabel}`} />
                      <DetailRow label="Return" value={ride.returnLabel ?? `6:00 PM \u00b7 ${ride.toLabel} \u2192 ${ride.fromLabel}`} />
                    </>
                  ) : null}
                </div>
                <div className="grid gap-4 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
                  <RoutePlanCard ride={ride} joinView={quoteState.joinView} />
                </div>
                {ride.upcomingRides?.length ? (
                  <div className="grid gap-3 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Upcoming rides</p>
                    {ride.upcomingRides.slice(0, 3).map((item) => (
                      <div key={`${item.date}-${item.time}-${item.label}`} className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
                        <p className="text-sm font-black text-[var(--rp-text)]">{item.date}</p>
                        <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">{item.time}</p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="flex flex-wrap gap-2">
                  <DetailTag tone={ride.podType === "Women-only" ? "green" : "gold"}>{whoCanJoinLabel(ride)}</DetailTag>
                  <DetailTag tone="blue">Recurring route</DetailTag>
                </div>
                <div className="grid gap-3 border-t border-[var(--rp-border)] pt-4">
                  <TaxiTypeVisualCard taxiType={ride.taxiType} />
                  <DetailItem
                    icon={ride.podType === "Open pod" ? <UserRound className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                    label="Who can join"
                    value={whoCanJoinLabel(ride)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={<BriefcaseBusiness className="h-6 w-6" />} label="Group luggage" value={formatGroupLuggageLabel(recurringGroupLuggageCount, recurringGroupHasLargeLuggage)} />
                    <DetailItem icon={<CarFront className="h-6 w-6" />} label="Seats" value={`${ride.seatsTotal} seats total`} />
                  </div>
                  {joined ? (
                    <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-2 text-xs font-black text-[var(--rp-primary)]">
                      {formatUserLuggageLabel(currentUserLuggage, true)}
                    </p>
                  ) : null}
                  {recurringLuggageWarning ? (
                    <p className="rounded-[14px] border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">
                      This taxi may not fit the group luggage. Taxi type and luggage capacity depend on taxi partner availability.
                    </p>
                  ) : null}
                  <DetailItem icon={<ShieldCheck className="h-6 w-6" />} label="Access" value={ride.accessibility} />
                </div>
              </div>
            )}
          </RecurringCard>

          <PickupReadyCards
            ride={ride}
            joinView={quoteState.joinView}
            acceptedGuestCount={quoteState.acceptedGuestCount}
            requiredGuestCount={quoteState.requiredGuestCount}
          />
        </main>
      </div>

      {recurringQuoteView ? (
        <StickyPodDetailCta
          ride={ride}
          seatsUsed={quoteState.seatsUsed}
          joinView={quoteState.joinView}
          acceptedGuestCount={quoteState.acceptedGuestCount}
          requiredGuestCount={quoteState.requiredGuestCount}
          onLockSeat={quoteState.lockSeat}
          onAcceptQuote={quoteState.acceptQuote}
          onDeclineQuote={quoteState.declineQuote}
          onCancelSeat={quoteState.cancelSeat}
          onCancelQuoteAcceptance={quoteState.cancelQuoteAcceptance}
          onRequestCancellation={quoteState.requestCancellation}
          onMarkAtPickup={quoteState.markAtPickup}
          onCancelAttendance={quoteState.cancelAttendance}
          attendanceMessage={quoteState.attendanceMessage}
          attendanceError={quoteState.attendanceError}
          canLockSeatAfterCancel={quoteState.canLockSeatAfterCancel}
          isCancellingAttendance={quoteState.isCancellingAttendance}
        />
      ) : (
        <RecurringStickyCta
          ride={ride}
          seatsUsed={seatsUsed}
          joined={joined}
          onOpenLock={() => setShowLockSeatModal(true)}
        />
      )}
      {showLockSeatModal ? (
        <LockRecurringSeatModal
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
