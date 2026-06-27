"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useId, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
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
import { RidePodAvatar } from "@/components/animal-avatar";
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
  if (ride.podType === "Women-only") return "Women-only pod";
  return ride.podType === "Open pod" ? "Anyone" : ride.podType;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getViewProfileHref(name: string, role: "host" | "rider" = "host") {
  const params = new URLSearchParams({ name, role });
  return `/profile/view?${params.toString()}`;
}

function getHostProfileImageUrl(ride: HomeRide) {
  const hostMedia = ride as HomeRide & {
    hostAvatarUrl?: string | null;
    hostImageUrl?: string | null;
    hostPhotoUrl?: string | null;
    hostProfileImageUrl?: string | null;
  };
  const candidates = [
    hostMedia.hostProfileImageUrl,
    hostMedia.hostAvatarUrl,
    hostMedia.hostPhotoUrl,
    hostMedia.hostImageUrl,
  ];
  const match = candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return match?.trim() ?? null;
}

function getCompactRecurringScheduleLabel(ride: HomeRide) {
  return ride.repeatsPattern ?? ride.recurrence_label ?? ride.dateLabel;
}

function getRecurringVehicleLabel(ride: HomeRide, selfSettle: boolean) {
  if (selfSettle) return ride.rideAppProviderName?.trim() || "Ride app";
  return ride.taxiType;
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

function RecurringPodSummaryHero({
  ride,
  seatsUsed,
  progress,
  joined,
  recurringFull,
  recurringHeroQuoteStatus,
  rideAppTotalEstimate,
  selfSettle,
  onOpenLock,
}: {
  ride: HomeRide;
  seatsUsed: number;
  progress: number;
  joined: boolean;
  recurringFull: boolean;
  recurringHeroQuoteStatus: string;
  rideAppTotalEstimate: string | null;
  selfSettle: boolean;
  onOpenLock: () => void;
}) {
  const hostAvatarPreference = ride.hostAvatarPreference ?? null;
  const hostProfileImageUrl = getHostProfileImageUrl(ride);
  const hostAvatarDisplayName = ride.hostDisplayName?.trim() || ride.hostName || "RidePod host";
  const hostAvatarLabel = getInitials(hostAvatarDisplayName) || "H";
  const estimateLabel = selfSettle ? "Total estimate" : "Est. share";
  const estimateValue = selfSettle ? rideAppTotalEstimate ?? "Pending" : `HK$${ride.pricePerPerson}`;
  const estimateHelper = selfSettle
    ? rideAppTotalEstimate
      ? "Ride app estimate"
      : "Ride app estimate pending"
    : "per recurring ride";
  const vehicleLabel = getRecurringVehicleLabel(ride, selfSettle);
  const scheduleCompact = getCompactRecurringScheduleLabel(ride);

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-cyan-100/20 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.1),transparent_34%),linear-gradient(145deg,rgba(13,24,39,0.96),rgba(3,10,18,0.98))] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_38%)]" />
      <div className="relative grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3">
        <span
          className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-[var(--rp-primary)]/55 bg-[var(--rp-primary)]/8 bg-cover bg-center text-xl font-black text-[var(--rp-primary)] shadow-[0_14px_32px_rgba(0,0,0,0.28)]"
          style={!hostAvatarPreference && hostProfileImageUrl ? { backgroundImage: `url(${hostProfileImageUrl})` } : undefined}
          aria-label={`${hostAvatarDisplayName} profile`}
        >
          {hostAvatarPreference ? (
            <RidePodAvatar
              avatarUrl={hostProfileImageUrl}
              avatarPreference={hostAvatarPreference}
              initials={hostAvatarLabel}
              displayName={hostAvatarDisplayName}
              className="h-full w-full rounded-full text-xl"
            />
          ) : hostProfileImageUrl ? null : (
            hostAvatarLabel
          )}
        </span>

        <div className="min-w-0 self-center">
          <h2 className="text-xl font-black leading-tight text-white min-[390px]:text-[21px]">
            {ride.fromLabel} {"\u2192"} {ride.toLabel}
          </h2>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">
            Created by {hostAvatarDisplayName}
          </p>
          <Link
            href={getViewProfileHref(hostAvatarDisplayName, "host")}
            className="mt-2 inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/10 px-3 text-[11px] font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-primary)]/16"
          >
            View Profile
          </Link>
        </div>

        <button
          type="button"
          aria-label="Share recurring pod"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-200/35 bg-cyan-300/8 text-cyan-100 shadow-[0_8px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-300/14"
        >
          <Share2 className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--rp-primary)]/70 bg-[var(--rp-primary)]/12 px-3 py-1 text-sm font-black text-[var(--rp-primary)]">
          <Repeat2 className="h-3.5 w-3.5" />
          Recurring
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full border border-cyan-200/20 bg-cyan-300/8 px-3 py-1 text-sm font-black text-cyan-100">
          {vehicleLabel}
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full border border-white/12 bg-white/[0.055] px-3 py-1 text-sm font-black text-[var(--rp-muted-strong)]">
          {scheduleCompact}
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-[1.18fr_1.05fr_0.85fr] overflow-hidden rounded-[16px] border border-cyan-100/14 bg-white/[0.035] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] min-[390px]:grid-cols-3">
        <div className="grid min-w-0 content-center justify-items-center gap-1 border-r border-white/10 px-2 py-3 text-center min-[390px]:px-3">
          <CalendarDays className="h-[18px] w-[18px] shrink-0 text-[var(--rp-muted-strong)] min-[390px]:h-5 min-[390px]:w-5" />
          <span className="block max-w-full" title={`${ride.dateLabel} ${ride.timeLabel}`}>
            <span className="block truncate whitespace-nowrap text-[11px] font-black leading-[13px] text-cyan-200 min-[390px]:text-[12px] min-[390px]:leading-4">
              {ride.timeLabel}
            </span>
            <span className="block truncate whitespace-nowrap text-[10px] font-black leading-[13px] text-white min-[390px]:text-[11px] min-[390px]:leading-4">
              {scheduleCompact}
            </span>
          </span>
        </div>

        <div className="min-w-0 border-r border-white/10 px-2.5 py-3">
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="h-5 w-5 shrink-0 text-[var(--rp-muted-strong)]" />
            <span className="block whitespace-nowrap text-lg font-black leading-5 text-cyan-100">
              {seatsUsed} / {ride.seatsTotal}
            </span>
          </span>
          <span className="mt-0.5 block whitespace-nowrap text-[9px] font-black leading-4 text-[var(--rp-primary)] min-[390px]:text-[10px]">
            seats filled
          </span>
          <span className="mt-1.5 block h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-white/14">
            <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${progress}%` }} />
          </span>
        </div>

        <div className="grid min-w-0 grid-cols-[22px_minmax(0,1fr)] items-center gap-2 px-3 py-3">
          {selfSettle ? (
            <Smartphone className="h-5 w-5 shrink-0 text-[var(--rp-muted-strong)]" />
          ) : (
            <CarFront className="h-5 w-5 shrink-0 text-[var(--rp-muted-strong)]" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-base font-black leading-5 text-white">{vehicleLabel}</span>
            <span className="block text-[11px] font-semibold leading-4 text-[var(--rp-muted-strong)]">Ride type</span>
          </span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-3 max-[360px]:grid-cols-1">
        <div className="grid min-h-[124px] justify-items-center rounded-[16px] border border-cyan-300/24 bg-cyan-300/8 px-3 py-4 text-center">
          <p className="w-full whitespace-nowrap text-center text-[12px] font-semibold text-[var(--rp-muted-strong)]">{estimateLabel}</p>
          <p className={cn("mt-1 w-full whitespace-nowrap text-center font-black leading-tight text-[var(--rp-primary)]", estimateValue === "Pending" ? "text-xl" : "text-2xl")}>
            {estimateValue}
          </p>
          <p className="mt-2 text-center text-[11px] font-semibold leading-4 text-[var(--rp-muted-strong)]">{estimateHelper}</p>
        </div>

        <div id="quote-status" className="grid gap-3">
          {recurringFull ? (
            <button
              type="button"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] bg-[var(--rp-gradient-primary)] px-3 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_10px_24px_rgba(242,193,91,0.1)]"
            >
              <UsersRound className="h-4 w-4" />
              Join waitlist
            </button>
          ) : joined ? (
            <button
              type="button"
              disabled
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/8 px-3 text-sm font-black text-[var(--rp-muted-strong)]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Seat locked
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLock}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] border border-[var(--rp-primary)]/55 bg-[var(--rp-primary)]/10 px-3 text-sm font-black text-[var(--rp-primary)] shadow-[0_10px_24px_rgba(242,193,91,0.1)] transition hover:bg-[var(--rp-primary)]/15"
            >
              <Repeat2 className="h-4 w-4" />
              Join recurring ride
            </button>
          )}
          <Link
            href={`/pods/${ride.id}/status`}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/8 px-3 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-white/12 hover:text-white"
          >
            <BarChart3 className="h-4 w-4" />
            View status
          </Link>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.045] px-3 py-2 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
              {selfSettle ? "Ride detail status" : "Quote status"}
            </p>
            <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">{recurringHeroQuoteStatus}</p>
          </div>
        </div>
      </div>
    </section>
  );
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

export function RecurringPodDetailPage({ ride, backHref = "/home" }: { ride: HomeRide; backHref?: string }) {
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
        <header className="relative z-20 flex h-12 items-center px-4">
          <Link
            href={backHref}
            aria-label="Back to Home"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-[var(--rp-text)] shadow-[0_8px_22px_rgba(0,0,0,0.24)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </header>

        <main className="relative z-10 grid gap-3 px-4">
          <RecurringPodSummaryHero
            ride={ride}
            seatsUsed={seatsUsed}
            progress={progress}
            joined={joined}
            recurringFull={recurringFull}
            recurringHeroQuoteStatus={recurringHeroQuoteStatus}
            rideAppTotalEstimate={rideAppTotalEstimate}
            selfSettle={howItWorksRideMode === "ride_app"}
            onOpenLock={() => setShowLockSeatModal(true)}
          />

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
