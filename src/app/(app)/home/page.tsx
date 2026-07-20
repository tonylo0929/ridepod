"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Bell,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  Gift,
  Plane,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import { Suspense, type CSSProperties, type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RidePodAvatar, useRidePodAvatarPreference, type RidePodAvatarPreference } from "@/components/animal-avatar";
import { cn } from "@/components/ui";
import {
  districtOptions,
  homeRides,
  matchesDistrict,
  rideMatchesTab,
  type HomeRide,
  type HomeTab,
} from "@/lib/home-ride-mock";
import { getRideAppHostFareEstimate, getRideAppHostFareEstimateDisplay } from "@/lib/ride-app-fare-estimate";
import { ridePodJoinFeeWaiverCopy } from "@/lib/ridepod-membership";
import { claimRideAppWaiver, useRideAppWaiverState } from "@/lib/ride-app-waiver";
import { getRideAppTrustSummary, type RideAppTrustSummary } from "@/lib/ride-app-trust";
import {
  createdHomeRideViewerIdentityFromAuth,
  updateCreatedHomeRideHostAvatar,
  useCreatedHomeRides,
} from "@/lib/created-home-rides";
import { applyRideAppDemoPersona } from "@/lib/ride-app-demo-persona";
import { useAuth } from "@/providers/AuthProvider";

type AirportDirectionFilter = "all" | "to_airport" | "from_airport";
type PodPreferenceFilter = "all" | "open" | "women_only" | "verified_only" | "invite_only";
type TaxiDriverFilter = "all" | "accepted" | "waiting";
type TaxiTypeFilter = "all" | string;
type RideModeFilter = "all" | "taxi" | "ride_app";
type SettlementFilter = "all" | "protected" | "self_settle";
type FareEstimateFilter = "any" | "estimate_available" | "estimate_pending";
type DeadlineFilter = "any" | "joining_now" | "expiring_soon" | "minimum_reached";
type SeatFilter = "any" | "one_left" | "two_plus_available" | "minimum_not_reached" | "minimum_reached";
type OwnershipFilter = "all" | "mine" | "joined";
type ScheduleRideQuickFilter = "recommended" | "today" | "tomorrow" | "this_week";
type SelectedCategory = "schedule";
type CategoryTransitionPhase = "idle" | "entering" | "open" | "exiting";

type CurrentUserAvatar = {
  avatarPreference: RidePodAvatarPreference;
  avatarUrl?: string | null;
  displayName: string;
  initials: string;
};

type HomeCategoryCardId = Extract<HomeTab, "one_off" | "recurring" | "airport" | "all">;

const categoryCards: Array<{ id: HomeCategoryCardId; imageSrc: string; imageAlt: string; href?: string }> = [
  { id: "one_off", imageSrc: "/ride-cards/schedule-ride.png", imageAlt: "Schedule a one-off ride" },
  { id: "recurring", imageSrc: "/ride-cards/ride-regularly.png", imageAlt: "Create a recurring ride" },
  { id: "airport", imageSrc: "/ride-cards/flight-ride.png", imageAlt: "Create an airport ride" },
  { id: "all", imageSrc: "/ride-cards/all-public.png", imageAlt: "View all public rides" },
];

const scheduleRideQuickFilters: Array<{ id: ScheduleRideQuickFilter; label: string }> = [
  { id: "recommended", label: "Recommended" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_week", label: "This week" },
];

const airportDirectionFilters: Array<{ id: AirportDirectionFilter; label: string }> = [
  { id: "all", label: "All airport" },
  { id: "to_airport", label: "To airport" },
  { id: "from_airport", label: "From airport" },
];

const tabLabels: Record<HomeTab, string> = {
  all: "All rides",
  airport: "Airport",
  one_off: "One-off",
  recurring: "Recurring",
  quote_ready: "Quote ready",
};

const categoryRecommendationLabels: Record<HomeCategoryCardId, string> = {
  all: "All Public",
  airport: "Flight Ride",
  one_off: "Schedule Ride",
  recurring: "Ride Regularly",
};

function getHomeTabFromSearchParam(value: string | null): HomeTab {
  if (value === "airport" || value === "one_off" || value === "recurring" || value === "quote_ready" || value === "all") {
    return value;
  }

  return "all";
}

const podPreferenceFilters: Array<{ id: PodPreferenceFilter; label: string }> = [
  { id: "all", label: "Any pod" },
  { id: "open", label: "Open" },
  { id: "women_only", label: "Women-only" },
  { id: "verified_only", label: "Verified-only" },
  { id: "invite_only", label: "Invite-only" },
];

const taxiDriverFilters: Array<{ id: TaxiDriverFilter; label: string }> = [
  { id: "all", label: "Any driver status" },
  { id: "accepted", label: "Taxi driver accepted" },
  { id: "waiting", label: "Waiting for driver" },
];

const rideModeFilters: Array<{ id: RideModeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "taxi", label: "Taxi" },
  { id: "ride_app", label: "Ride app" },
];

const settlementFilters: Array<{ id: SettlementFilter; label: string }> = [
  { id: "all", label: "All settlement" },
  { id: "protected", label: "Protected quote" },
  { id: "self_settle", label: "Self-settle" },
];

const fareEstimateFilters: Array<{ id: FareEstimateFilter; label: string }> = [
  { id: "any", label: "Any estimate" },
  { id: "estimate_available", label: "Estimate available" },
  { id: "estimate_pending", label: "Estimate pending" },
];

const deadlineFilters: Array<{ id: DeadlineFilter; label: string }> = [
  { id: "any", label: "Any deadline" },
  { id: "joining_now", label: "Joining now" },
  { id: "expiring_soon", label: "Expiring soon" },
  { id: "minimum_reached", label: "Minimum reached" },
];

const seatFilters: Array<{ id: SeatFilter; label: string }> = [
  { id: "any", label: "Any seats" },
  { id: "one_left", label: "1 seat left" },
  { id: "two_plus_available", label: "2+ seats" },
  { id: "minimum_not_reached", label: "Minimum not reached" },
  { id: "minimum_reached", label: "Minimum reached" },
];

const ownershipFilters: Array<{ id: OwnershipFilter; label: string }> = [
  { id: "all", label: "All pods" },
  { id: "mine", label: "My pods" },
  { id: "joined", label: "Joined" },
];

const heroBackgroundModes = ["taxi", "ride_app"] as const;
const homeHeroBackgrounds: Record<
  (typeof heroBackgroundModes)[number],
  {
    image: string;
    mobilePosition: string;
    mobileSize: string;
    mobileBackdropPosition: string;
    mobileBackdropSize: string;
    mobileBackdropOpacity: number;
    desktopPosition: string;
    desktopSize: string;
    overlay: string;
  }
> = {
  ride_app: {
    image: "/images/ridepod/home-ride-app-warm-pickup.jpg",
    mobilePosition: "center center",
    mobileSize: "115% auto",
    mobileBackdropPosition: "center center",
    mobileBackdropSize: "115% auto",
    mobileBackdropOpacity: 0,
    desktopPosition: "center center",
    desktopSize: "115% auto",
    overlay:
      "linear-gradient(180deg,rgba(5,11,18,0) 0%,rgba(5,11,18,0) 56%,rgba(5,11,18,0.24) 82%,var(--rp-bg) 100%)",
  },
  taxi: {
    image: "/images/ridepod/home-taxi-harbor-night.png",
    mobilePosition: "center center",
    mobileSize: "cover",
    mobileBackdropPosition: "center center",
    mobileBackdropSize: "cover",
    mobileBackdropOpacity: 0,
    desktopPosition: "center center",
    desktopSize: "cover",
    overlay:
      "linear-gradient(180deg,rgba(5,11,18,0) 0%,rgba(5,11,18,0) 56%,rgba(5,11,18,0.24) 82%,var(--rp-bg) 100%)",
  },
};

function getEmptyTitle(tab: HomeTab, rideModeFilter: RideModeFilter) {
  if (tab === "airport") return "No airport rides found.";
  if (tab === "one_off") return "No one-off rides found.";
  if (tab === "recurring") return "No recurring rides found.";
  if (tab === "quote_ready") return "No quotes ready to confirm.";
  if (rideModeFilter === "taxi") return "No taxi pods found";
  if (rideModeFilter === "ride_app") return "No ride app pods found";
  return "No rides found.";
}

function getEmptyCopy(rideModeFilter: RideModeFilter, hasAnyRides: boolean) {
  if (!hasAnyRides) return "Remove some filters to see more rides.";
  if (rideModeFilter === "taxi") return "Try changing your route, time, or safety filters.";
  if (rideModeFilter === "ride_app") return "Try widening your time range or create a self-settle pod.";
  return "Try changing your From / To district filters.";
}

const rideDateMonths: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseRideDateLabel(dateLabel: string, referenceDate: Date) {
  const dayMonthMatch = dateLabel.match(/(\d{1,2})\s+([A-Za-z]+)/);
  const monthDayMatch = dateLabel.match(/([A-Za-z]+)\s+(\d{1,2})/);
  if (!dayMonthMatch && !monthDayMatch) return null;

  const day = Number(dayMonthMatch?.[1] ?? monthDayMatch?.[2]);
  const monthName = dayMonthMatch?.[2] ?? monthDayMatch?.[1] ?? "";
  const month = rideDateMonths[monthName.toLowerCase()];
  if (!Number.isFinite(day) || month === undefined) return null;

  return new Date(referenceDate.getFullYear(), month, day);
}

function isRideStillVisible(ride: HomeRide, referenceDate: Date) {
  const rideDate = parseRideDateLabel(ride.dateLabel, referenceDate);
  if (!rideDate) return true;

  return startOfLocalDay(rideDate).getTime() >= startOfLocalDay(referenceDate).getTime();
}

function getOpenSeatCount(ride: HomeRide) {
  return Math.max(ride.seats_open ?? ride.seatsTotal - ride.seatsUsed, 0);
}

function rideMatchesScheduleRideQuickFilter(ride: HomeRide, filter: ScheduleRideQuickFilter, referenceDate: Date) {
  if (filter === "recommended") return true;

  const rideDate = parseRideDateLabel(ride.dateLabel, referenceDate);
  if (!rideDate) return false;

  const rideDay = startOfLocalDay(rideDate).getTime();
  const today = startOfLocalDay(referenceDate);
  const todayTime = today.getTime();

  if (filter === "today") return rideDay === todayTime;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (filter === "tomorrow") return rideDay === tomorrow.getTime();

  const endOfWeekWindow = new Date(today);
  endOfWeekWindow.setDate(today.getDate() + 6);
  return rideDay >= todayTime && rideDay <= endOfWeekWindow.getTime();
}

function FilterSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative block min-w-0">
      <span className="block text-sm font-black text-[var(--rp-text)]">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "mt-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-[16px] border bg-[var(--rp-card-soft)] px-4 text-left text-base font-black text-[var(--rp-text)] outline-none transition",
          open ? "border-[var(--rp-primary)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)]" : "border-[var(--rp-border-strong)]",
        )}
      >
        <span className="min-w-0 truncate">{value}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-[var(--rp-muted-strong)] transition", open && "rotate-180 text-[var(--rp-primary)]")} />
      </button>
      {open ? (
        <div role="listbox" className="mt-2 max-h-44 overflow-y-auto rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.32)]">
          {districtOptions.map((district) => {
            const selected = district === value;

            return (
              <button
                key={district}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(district);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-11 w-full items-center rounded-[12px] px-3 text-left text-sm font-black transition",
                  selected
                    ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                    : "text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)] hover:text-[var(--rp-text)]",
                )}
              >
                {district}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FilterSummary({
  rideType,
  fromDistrict,
  toDistrict,
  podPreference,
  taxiDriver,
  taxiType,
  airportDirection,
  rideMode,
  settlement,
  fareEstimate,
  deadline,
  seats,
  onOpen,
}: {
  rideType: string;
  fromDistrict: string;
  toDistrict: string;
  podPreference: string;
  taxiDriver: string;
  taxiType: string;
  airportDirection: string;
  rideMode: string;
  settlement: string;
  fareEstimate: string;
  deadline: string;
  seats: string;
  onOpen: () => void;
}) {
  const summaryItems = [
    rideMode,
    settlement,
    fareEstimate,
    deadline,
    seats,
    rideType,
    `${fromDistrict} -> ${toDistrict}`,
    podPreference,
    taxiDriver,
    taxiType,
    airportDirection,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-4 flex w-full items-center justify-between gap-3 rounded-[18px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_72%,transparent)] p-3 text-left shadow-[var(--rp-shadow-soft)] backdrop-blur-md transition hover:border-[var(--rp-border-strong)]"
    >
      <span className="min-w-0">
        <span className="block text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
          Selected filters
        </span>
        <span className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs font-black text-[var(--rp-text)]">
          {summaryItems.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-2.5 py-1"
            >
              {item}
            </span>
          ))}
        </span>
      </span>
      <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-primary)]">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </span>
    </button>
  );
}

function DistrictFilterSheet({
  open,
  activeTab,
  fromDistrict,
  toDistrict,
  ownership,
  onFromChange,
  onToChange,
  onOwnershipChange,
  onSwap,
  onReset,
  onClose,
}: {
  open: boolean;
  activeTab: HomeTab;
  fromDistrict: string;
  toDistrict: string;
  ownership: OwnershipFilter;
  onFromChange: (district: string) => void;
  onToChange: (district: string) => void;
  onOwnershipChange: (value: OwnershipFilter) => void;
  onSwap: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/62 px-3 pb-0 pt-10 backdrop-blur-sm">
      <button type="button" aria-label="Close filters" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[86dvh] min-h-0 w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] border border-[var(--rp-border)] bg-[var(--rp-shell)] shadow-[0_-28px_80px_rgba(0,0,0,0.42)]">
        <div className="mx-auto mt-3 h-1.5 w-16 shrink-0 rounded-full bg-[var(--rp-border-strong)]" />
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--rp-border)] px-5 pb-4 pt-5">
          <div>
            <h2 className="text-2xl font-black text-[var(--rp-text)]">Filters</h2>
            <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">{tabLabels[activeTab]}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="min-h-11 rounded-full border border-[var(--rp-border-strong)] px-4 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
            >
              Reset
            </button>
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border-strong)] text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)] hover:text-[var(--rp-text)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 touch-pan-y gap-5 overflow-y-auto overscroll-contain px-5 py-5">
          <FilterSection title="Show">
            <SegmentedFilter
              value={ownership}
              options={ownershipFilters}
              tone={ownership === "joined" ? "ride_app" : "taxi"}
              onChange={(value) => onOwnershipChange(value as OwnershipFilter)}
            />
          </FilterSection>

          <FilterSection title="Route">
            <FilterSelect label="From district" value={fromDistrict} onChange={onFromChange} />
            <div className="flex justify-center">
              <button
                type="button"
                aria-label="Swap districts"
                onClick={onSwap}
                className="grid h-12 w-12 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-soft)]"
              >
                <ArrowRightLeft className="h-5 w-5" />
              </button>
            </div>
            <FilterSelect label="To district" value={toDistrict} onChange={onToChange} />
          </FilterSection>
        </div>

        <div className="shrink-0 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] p-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full rounded-[16px] bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] px-5 text-sm font-black text-[#07111a] shadow-[0_12px_28px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)]"
          >
            Show rides
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-black text-[var(--rp-text)]">{title}</h3>
      {children}
    </section>
  );
}

function SegmentedFilter({
  value,
  options,
  tone = "taxi",
  onChange,
}: {
  value: string;
  options: Array<{ id: string; label: string }>;
  tone?: "taxi" | "ride_app";
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
      {options.map((option) => {
        const active = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 rounded-[14px] border px-3 text-sm font-black transition",
              active
                ? tone === "ride_app"
                  ? "border-sky-300/45 bg-sky-400/18 text-sky-100"
                  : "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function CategoryCard({
  id,
  imageSrc,
  imageAlt,
  href,
  rideCount,
  selected,
  onClick,
  className,
  style,
}: {
  id: HomeCategoryCardId;
  imageSrc: string;
  imageAlt: string;
  href?: string;
  rideCount?: number;
  selected: boolean;
  onClick: (tab: HomeCategoryCardId) => void;
  className: string;
  style?: CSSProperties;
}) {
  const cardClassName = cn(
    "group block overflow-hidden text-left shadow-[0_22px_46px_rgba(0,0,0,0.26)] outline-none transition active:scale-[0.99] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[rgba(255,200,60,0.95)]",
    selected ? "ring-1 ring-white/20" : "",
    className,
  );
  const rideCountLabel = typeof rideCount === "number" ? `${rideCount} ${rideCount === 1 ? "ride" : "rides"}` : "";
  const cardLabel = rideCountLabel
    ? `Show ${categoryRecommendationLabels[id]} recommendations, ${rideCountLabel}`
    : `Show ${categoryRecommendationLabels[id]} recommendations`;
  const content = (
    <>
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        priority
        sizes="(max-width: 720px) 55vw, 320px"
        className="pointer-events-none object-cover object-center transition-transform duration-200 ease-out group-active:scale-[0.985]"
      />
      {typeof rideCount === "number" ? (
        <span className="pointer-events-none absolute right-[clamp(10px,2.3vw,16px)] top-[clamp(10px,2.3vw,16px)] z-20 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[rgba(3,9,15,0.68)] px-[clamp(8px,1.7vw,11px)] py-[clamp(4px,1vw,6px)] text-white shadow-[0_10px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md">
          <span className="text-[clamp(13px,2.9vw,17px)] font-black leading-none text-[var(--rp-primary)]">{rideCount}</span>
          <span className="text-[clamp(8px,1.8vw,10px)] font-black uppercase leading-none tracking-[0.08em] text-white/82">
            {rideCount === 1 ? "ride" : "rides"}
          </span>
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName} style={style} aria-label={cardLabel} aria-current={selected ? "page" : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onClick(id)} className={cardClassName} style={style} aria-label={cardLabel} aria-pressed={selected}>
      {content}
    </button>
  );
}

function RideModeSwitch({
  value,
  onChange,
}: {
  value: Extract<RideModeFilter, "taxi" | "ride_app">;
  onChange: (value: Extract<RideModeFilter, "taxi" | "ride_app">) => void;
}) {
  const options: Array<{
    id: Extract<RideModeFilter, "taxi" | "ride_app">;
    label: string;
    icon: typeof CarFront;
  }> = [
    { id: "taxi", label: "Taxi", icon: CarFront },
    { id: "ride_app", label: "Ride app", icon: Smartphone },
  ];

  return (
    <div className="grid justify-items-center">
      <div className="w-full max-w-[560px]">
        <div className="relative grid grid-cols-2 gap-1.5 overflow-hidden rounded-[22px] bg-black/10 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {options.map((option) => {
          const selected = value === option.id;
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] px-4 text-base font-black transition min-[420px]:text-lg",
                selected
                  ? option.id === "ride_app"
                    ? "bg-[linear-gradient(180deg,#1d7de4_0%,#0d56ab_100%)] text-white shadow-[0_14px_28px_rgba(14,79,158,0.34)]"
                    : "bg-[linear-gradient(180deg,#ffdc72_0%,#ffc844_100%)] text-[#07111a] shadow-[0_14px_28px_rgba(255,197,66,0.28)]"
                  : option.id === "ride_app"
                    ? "text-blue-100/72 hover:bg-white/5 hover:text-white"
                    : "text-amber-100/74 hover:bg-white/5 hover:text-amber-50",
              )}
            >
              <Icon className="h-5 w-5" />
              {option.label}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-[#07111a]/95 text-xs font-black tracking-[0.12em] shadow-[0_8px_18px_rgba(0,0,0,0.28)]",
            value === "ride_app" ? "border-blue-300/40 text-blue-200" : "border-amber-300/45 text-amber-200",
          )}
        >
          <ArrowRightLeft className="h-4 w-4" />
        </span>
        </div>
      </div>
    </div>
  );
}

function getProfileInitial(name: string | null | undefined) {
  return name?.trim().charAt(0).toUpperCase() || "B";
}

function getProfileInitials(name: string | null | undefined) {
  const initials = name
    ?.split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || getProfileInitial(name);
}

function isRideAppSelfSettle(ride: HomeRide) {
  return ride.rideCategory === "ride_app_self_settle" || ride.rideService === "ride_app" || ride.taxiType.toLowerCase().includes("ride app");
}

function getHomeRideHostTrustUserId(ride: HomeRide) {
  if (ride.rideAppEstimatedFareUpdatedBy?.trim()) return ride.rideAppEstimatedFareUpdatedBy.trim();
  const normalizedHost = ride.hostName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalizedHost ? `mock-host-${normalizedHost}` : "mock-host";
}

function isTaxiPod(ride: HomeRide) {
  return !isRideAppSelfSettle(ride);
}

function availableSeats(ride: HomeRide) {
  return Math.max(ride.seatsTotal - ride.seatsUsed, 0);
}

function getRideAppMinimumRidersToGo(ride: HomeRide) {
  if (!isRideAppSelfSettle(ride)) return null;

  const maxJoinedRiders = Math.max(1, ride.seatsTotal - 1);
  const fallbackMinimum = Math.min(2, maxJoinedRiders);
  const minimum = ride.rideAppMinimumConfirmedRiders ?? ride.rideAppRequiredConfirmations ?? fallbackMinimum;

  return Math.max(1, Math.min(maxJoinedRiders, minimum));
}

function minimumRidersRequired(ride: HomeRide) {
  return getRideAppMinimumRidersToGo(ride) ?? ride.requiredGuestCount ?? 1;
}

function minimumReached(ride: HomeRide) {
  return ride.seatsUsed >= minimumRidersRequired(ride);
}

function isExpiringSoon(ride: HomeRide) {
  if (typeof ride.quoteExpiresInMinutes !== "number") return false;
  return ride.quoteExpiresInMinutes > 0 && ride.quoteExpiresInMinutes <= 180;
}

function hasRideAppEstimate(ride: HomeRide) {
  return Boolean(getRideAppHostFareEstimate(ride));
}

function getRideAppTotalEstimateDisplay(ride: HomeRide) {
  return getRideAppHostFareEstimateDisplay(ride);
}

function getRideAppProviderLabel(ride: HomeRide) {
  if (ride.rideAppProviderName?.trim()) return ride.rideAppProviderName.trim();
  if (ride.taxiType?.trim() && !ride.taxiType.toLowerCase().includes("ride app")) return ride.taxiType.trim();
  return null;
}

function matchesRideModeFilter(ride: HomeRide, filter: RideModeFilter) {
  if (filter === "taxi") return isTaxiPod(ride);
  if (filter === "ride_app") return isRideAppSelfSettle(ride);
  return true;
}

function matchesSettlementFilter(ride: HomeRide, filter: SettlementFilter) {
  if (filter === "protected") return isTaxiPod(ride);
  if (filter === "self_settle") return isRideAppSelfSettle(ride);
  return true;
}

function matchesFareEstimateFilter(ride: HomeRide, filter: FareEstimateFilter) {
  if (filter === "any") return true;
  if (!isRideAppSelfSettle(ride)) return false;
  if (filter === "estimate_available") return hasRideAppEstimate(ride);
  return !hasRideAppEstimate(ride);
}

function matchesDeadlineFilter(ride: HomeRide, filter: DeadlineFilter) {
  if (filter === "any") return true;
  if (filter === "joining_now") return availableSeats(ride) > 0 && ride.quoteStatus !== "full";
  if (filter === "expiring_soon") return isExpiringSoon(ride);
  return minimumReached(ride);
}

function matchesSeatFilter(ride: HomeRide, filter: SeatFilter) {
  const seatsLeft = availableSeats(ride);
  if (filter === "one_left") return seatsLeft === 1;
  if (filter === "two_plus_available") return seatsLeft >= 2;
  if (filter === "minimum_reached") return minimumReached(ride);
  if (filter === "minimum_not_reached") return !minimumReached(ride);
  return true;
}

function matchesOwnershipFilter(ride: HomeRide, filter: OwnershipFilter) {
  if (filter === "mine") return ride.currentUserRole === "host";
  if (filter === "joined") return ride.currentUserJoined === true || ride.currentUserRole === "joined_rider";
  return true;
}

function getCurrentUserRideRelationship(ride: HomeRide) {
  if (ride.currentUserRole === "host") {
    return {
      tone: "host" as const,
      label: "Created by you",
    };
  }

  if (ride.currentUserJoined || ride.currentUserRole === "joined_rider") {
    return {
      tone: "joined" as const,
      label: "Joined by you",
    };
  }

  return null;
}

function withoutCurrentUserRelationship(ride: HomeRide): HomeRide {
  return {
    ...ride,
    currentUserRole: undefined,
    currentUserName: undefined,
    currentUserJoined: false,
    currentUserBookingDetailsConfirmed: false,
    currentUserConfirmedBookingDetailsVersion: null,
    currentUserRideAppDetailVersionConfirmed: undefined,
    currentUserQuoteAccepted: false,
    currentUserJoinIntentStatus: "not_joined",
    currentUserConfirmationExpired: false,
    selfSettleConfirmationStatus: undefined,
    riderConfirmations: ride.riderConfirmations?.map((rider) => ({
      ...rider,
      isCurrentUser: false,
    })),
  };
}

function getHomeRideTrustBadge(summary: RideAppTrustSummary) {
  const rating = summary.hostStats.hostRatingAverage;
  if (rating !== null && summary.hostStats.hostRatingCount > 0) {
    return {
      tone: "rating" as const,
      label: `Host ${rating.toFixed(1)}`,
    };
  }

  if (summary.trustLevel === "New") return null;

  if (summary.trustLevel === "Recent issues") {
    return {
      tone: "warning" as const,
      label: "Host issues",
    };
  }

  if (summary.trustLevel === "Limited access") {
    return {
      tone: "warning" as const,
      label: "Host limited",
    };
  }

  return {
    tone: "level" as const,
    label: `${summary.trustLevel} host`,
  };
}

function formatRecurringWeekdays(ride: HomeRide) {
  if (ride.recurrence_label?.trim()) return ride.recurrence_label.trim().toUpperCase();
  const weekdays = ride.weekdays?.map((day) => day.trim().slice(0, 3).toUpperCase()).filter(Boolean) ?? [];
  const weekdayKey = weekdays.join(",");
  if (weekdayKey === "MON,TUE,WED,THU,FRI") return "MON-FRI";
  if (weekdays.length === 1) return `EVERY ${weekdays[0]}`;
  if (weekdays.length > 1) return weekdays.join("/");
  if (ride.scheduleLabel?.trim()) return ride.scheduleLabel.trim().toUpperCase();
  return "RECURRING";
}

function formatRecurringWeekdaysForCard(ride: HomeRide) {
  const weekdays = ride.weekdays?.map((day) => day.trim()).filter(Boolean) ?? [];
  if (weekdays.length > 0) {
    return weekdays
      .map((day) => {
        const normalized = day.toLowerCase();
        if (normalized.startsWith("tue")) return "Tues";
        if (normalized.startsWith("thu")) return "Thurs";
        return `${day.slice(0, 1).toUpperCase()}${day.slice(1, 3).toLowerCase()}`;
      })
      .join(", ");
  }

  if (ride.repeatsPattern?.trim()) return ride.repeatsPattern.trim();
  if (ride.scheduleLabel?.trim()) return ride.scheduleLabel.trim();
  return formatRecurringWeekdays(ride);
}

function formatRecurringStartLabel(ride: HomeRide) {
  const startLabel = ride.startLabel?.trim();
  if (startLabel) return startLabel.replace(/^Starts\s+/i, "");
  return formatNextOccurrence(ride);
}

function getRecurringPeriodLabel(timeLabel: string) {
  const match = timeLabel.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
  if (!match) return "Scheduled";
  let hour = Number(match[1]);
  const meridiem = match[2].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function formatNextOccurrence(ride: HomeRide) {
  if (ride.next_occurrence_label?.trim()) return ride.next_occurrence_label.trim();
  const nextRide = ride.nextRideLabel?.replace(/^Next(?: ride)?:?\s*/i, "").replace(/\s+at\s+.+$/i, "").trim();
  return nextRide || ride.dateLabel;
}

function formatRecurringEstimate(ride: HomeRide) {
  const estimate = ride.estimated_share ?? ride.rideAppEstimatedFarePerPerson ?? ride.pricePerPerson;
  if (typeof estimate === "number") return `HK$${Math.round(estimate)}`;
  const cleaned = estimate.trim();
  if (!cleaned) return `HK$${ride.pricePerPerson}`;
  return /^HK\$/i.test(cleaned) ? cleaned : `HK$${cleaned}`;
}

function getRecurringRideResultData(ride: HomeRide) {
  const time = ride.ride_time?.trim() || ride.timeLabel;
  const regularCount = ride.regular_count ?? ride.seatsUsed;
  const maxRegulars = ride.max_regulars ?? ride.seatsTotal;
  const seatsOpen = ride.seats_open ?? Math.max(maxRegulars - regularCount, 0);

  return {
    recurrenceLabel: formatRecurringWeekdays(ride),
    weekdaysLabel: formatRecurringWeekdaysForCard(ride),
    startLabel: formatRecurringStartLabel(ride),
    time,
    periodLabel: ride.period_label?.trim() || getRecurringPeriodLabel(time),
    nextOccurrenceLabel: formatNextOccurrence(ride),
    regularCount,
    maxRegulars,
    seatsOpen,
    estimate: formatRecurringEstimate(ride),
    rating: ride.host_rating ? String(ride.host_rating) : "4.9",
  };
}

function RideResultMetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-[10px] font-black leading-4 text-[var(--rp-muted-strong)] min-[390px]:text-[11px]">
      <span className="shrink-0 text-[var(--rp-primary)]">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function getKnownRideHostDisplayName(ride: HomeRide) {
  const displayName = ride.hostDisplayName?.trim();
  if (displayName && displayName.toLowerCase() !== "new host") return displayName;

  const hostName = ride.hostName?.trim();
  if (hostName && hostName.toLowerCase() !== "new host") return hostName;

  return null;
}

function getRideHostDisplayName(ride: HomeRide) {
  return getKnownRideHostDisplayName(ride) ?? "Host";
}

function RideProfileAvatar({ ride, currentUserAvatar }: { ride: HomeRide; currentUserAvatar?: CurrentUserAvatar | null }) {
  const isRideApp = isRideAppSelfSettle(ride);
  const isRecurring = ride.rideKind === "recurring" || ride.is_recurring === true;
  const showRecurringIcon = isRecurring && !isRideApp;
  const showCurrentUserAvatar = !showRecurringIcon && ride.currentUserRole === "host" && Boolean(currentUserAvatar);
  const showHostAvatar = !showRecurringIcon && !showCurrentUserAvatar && Boolean(ride.hostAvatarPreference);
  const hostDisplayName = getRideHostDisplayName(ride);
  const Icon = isRideApp
    ? Smartphone
    : rideMatchesTab("quote_ready", ride)
    ? CircleDollarSign
    : ride.rideKind === "airport"
      ? Plane
      : isRecurring
        ? RefreshCcw
        : CarFront;

  return (
    <div
      aria-label={showRecurringIcon ? "Recurring ride" : `${hostDisplayName} profile`}
      className={cn(
        "relative grid h-11 w-11 shrink-0 place-items-center overflow-visible rounded-full border text-xl font-black shadow-[0_14px_30px_rgba(0,0,0,0.28)] min-[560px]:h-12 min-[560px]:w-12 min-[560px]:text-2xl",
        isRideApp
          ? "border-sky-300/50 bg-[radial-gradient(circle_at_35%_28%,rgba(56,189,248,0.2),var(--rp-card-muted)_74%)] text-sky-300"
          : showRecurringIcon
            ? "border-emerald-200/55 bg-[radial-gradient(circle_at_35%_28%,rgba(110,231,183,0.24),var(--rp-card-muted)_74%)] text-emerald-200"
          : "border-[color-mix(in_srgb,var(--rp-primary)_46%,var(--rp-border))] bg-[radial-gradient(circle_at_35%_28%,color-mix(in_srgb,var(--rp-primary)_20%,transparent),var(--rp-card-muted)_74%)] text-[var(--rp-primary)]",
      )}
    >
      {showRecurringIcon ? (
        <Icon className="h-6 w-6 stroke-[2.3] min-[560px]:h-7 min-[560px]:w-7" />
      ) : showCurrentUserAvatar && currentUserAvatar ? (
        <RidePodAvatar
          avatarUrl={currentUserAvatar.avatarUrl}
          avatarPreference={currentUserAvatar.avatarPreference}
          initials={currentUserAvatar.initials}
          displayName={currentUserAvatar.displayName}
          className="h-full w-full rounded-full text-lg min-[560px]:text-xl"
        />
      ) : showHostAvatar && ride.hostAvatarPreference ? (
        <RidePodAvatar
          avatarUrl={ride.hostAvatarUrl}
          avatarPreference={ride.hostAvatarPreference}
          initials={getProfileInitials(hostDisplayName)}
          displayName={hostDisplayName}
          className="h-full w-full rounded-full text-lg min-[560px]:text-xl"
        />
      ) : (
        getProfileInitial(hostDisplayName)
      )}
      <span
        className={cn(
          "absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border bg-[var(--rp-shell)] shadow-[0_8px_16px_rgba(0,0,0,0.24)] min-[560px]:h-6 min-[560px]:w-6",
          isRideApp
            ? "border-sky-300/40 text-sky-300"
            : showRecurringIcon
              ? "border-emerald-200/35 text-emerald-200"
              : "border-[var(--rp-border-strong)] text-[var(--rp-primary)]",
        )}
      >
        <Icon className="h-3 w-3 min-[560px]:h-3.5 min-[560px]:w-3.5" />
      </span>
    </div>
  );
}

function getRideDetailSourceTab(ride: HomeRide, sourceTab: HomeTab): HomeTab {
  if (sourceTab === "quote_ready") return sourceTab;
  if (ride.rideKind === "recurring" || ride.is_recurring || ride.repeatsPattern || ride.scheduleLabel) return "recurring";
  if (ride.rideKind === "airport" || ride.airportDirection) return "airport";
  if (ride.rideKind === "one_off") return "one_off";

  return sourceTab;
}

function RecurringRideResultCard({
  ride,
  currentUserAvatar,
  isAuthenticated,
  sourceTab,
}: {
  ride: HomeRide;
  currentUserAvatar: CurrentUserAvatar;
  isAuthenticated: boolean;
  sourceTab: HomeTab;
}) {
  const podHref = `/pods/${ride.id}?fromTab=${encodeURIComponent(getRideDetailSourceTab(ride, sourceTab))}`;
  const cardHref = isAuthenticated ? podHref : `/login?next=${encodeURIComponent(podHref)}`;
  const data = getRecurringRideResultData(ride);
  const currentUserRelationship = isAuthenticated ? getCurrentUserRideRelationship(ride) : null;
  const compactStatusLabel = currentUserRelationship
    ? currentUserRelationship.tone === "host"
      ? "Created"
      : "Joined"
    : null;
  const hostDisplayName = getRideHostDisplayName(ride);
  const showCurrentUserAvatar = ride.currentUserRole === "host" && Boolean(currentUserAvatar);
  const avatarPreference = showCurrentUserAvatar ? currentUserAvatar.avatarPreference : ride.hostAvatarPreference;
  const avatarUrl = showCurrentUserAvatar ? currentUserAvatar.avatarUrl : ride.host_avatar_url ?? ride.hostAvatarUrl;
  const initials = showCurrentUserAvatar ? currentUserAvatar.initials : getProfileInitials(hostDisplayName);
  const seatsLabel = `${data.seatsOpen} seat${data.seatsOpen === 1 ? "" : "s"} open`;

  return (
    <Link
      href={cardHref}
      className="block overflow-hidden rounded-[10px] border border-[color-mix(in_srgb,var(--rp-primary)_48%,var(--rp-border))] bg-[linear-gradient(135deg,#071018_0%,#0b1824_58%,#07111a_100%)] shadow-[0_16px_34px_rgba(0,0,0,0.3)] transition hover:border-[var(--rp-primary)] hover:shadow-[0_0_30px_color-mix(in_srgb,var(--rp-primary)_15%,transparent)]"
    >
      <div className="grid min-h-[106px] grid-cols-[78px_minmax(0,1fr)_70px] min-[390px]:grid-cols-[92px_minmax(0,1fr)_80px]">
        <div className="grid min-w-0 content-center gap-1 px-2.5 py-3 min-[390px]:px-3">
          <p className="flex min-w-0 items-center gap-1 text-[8px] font-black uppercase leading-none tracking-[0.06em] text-emerald-300 min-[390px]:text-[9px]">
            <RefreshCcw className="h-3 w-3 shrink-0" />
            <span>Starts</span>
          </p>
          <p className="text-sm font-black leading-tight text-[var(--rp-text)] min-[390px]:text-base">
            {data.startLabel}
          </p>
          <p className="text-[11px] font-black leading-4 text-[var(--rp-muted-strong)] min-[390px]:text-xs">
            {data.time}
          </p>
        </div>

        <div className="grid min-w-0 content-center gap-1 border-x border-slate-500/20 px-3 py-3 min-[390px]:px-4">
          <h2 className="line-clamp-2 text-[13px] font-black leading-[1.15] text-[var(--rp-text)] min-[390px]:text-sm">
            {ride.fromLabel} {"\u2192"} {ride.toLabel}
          </h2>
          <p className="truncate text-[11px] font-black leading-4 text-[var(--rp-muted-strong)] min-[390px]:text-xs">
            Host: {hostDisplayName}
          </p>
          <div className="grid min-w-0 gap-0.5">
            <p className="flex min-w-0 items-center gap-1 text-[10px] font-black leading-4 text-emerald-300 min-[390px]:text-[11px]">
              <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{data.weekdaysLabel}</span>
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <RideResultMetaItem icon={<UsersRound className="h-3.5 w-3.5" />}>
                {data.regularCount}/{data.maxRegulars} regulars
              </RideResultMetaItem>
              <RideResultMetaItem icon={<ArmchairIcon />}>{seatsLabel}</RideResultMetaItem>
            </div>
            <p className="truncate text-[11px] font-black leading-4 text-[var(--rp-muted-strong)] min-[390px]:text-xs">
              Total Est. <span className="text-sky-300">{data.estimate}</span>
            </p>
          </div>
        </div>

        <div className="grid min-w-0 content-center justify-items-center gap-1.5 px-2 py-3 min-[390px]:px-3">
          {avatarPreference ? (
            <RidePodAvatar
              avatarUrl={avatarUrl}
              avatarPreference={avatarPreference}
              initials={initials}
              displayName={hostDisplayName}
              className="h-10 w-10 rounded-full text-base"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-base font-black text-[var(--rp-primary)]">
              {initials}
            </div>
          )}
          <div className="flex max-w-full items-center gap-1 text-[11px] font-black leading-none text-[var(--rp-text)]">
            <Star className="h-3.5 w-3.5 shrink-0 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
            <span>{data.rating}</span>
          </div>
          {compactStatusLabel ? (
            <span
              className={cn(
                "inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border px-2 text-[10px] font-black leading-none min-[390px]:px-2.5 min-[390px]:text-[11px]",
                currentUserRelationship?.tone === "joined"
                  ? "border-cyan-300/40 bg-cyan-400/12 text-cyan-100"
                  : "border-[color-mix(in_srgb,var(--rp-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-primary)]",
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{compactStatusLabel}</span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function HomeRideCard({
  ride,
  currentUserAvatar,
  isAuthenticated,
  sourceTab,
}: {
  ride: HomeRide;
  currentUserAvatar: CurrentUserAvatar;
  isAuthenticated: boolean;
  sourceTab: HomeTab;
}) {
  const isRideApp = isRideAppSelfSettle(ride);
  const currentUserRelationship = isAuthenticated ? getCurrentUserRideRelationship(ride) : null;
  const rideAppEstimateDisplay = getRideAppTotalEstimateDisplay(ride);
  const podHref = `/pods/${ride.id}?fromTab=${encodeURIComponent(getRideDetailSourceTab(ride, sourceTab))}`;
  const cardHref = isAuthenticated ? podHref : `/login?next=${encodeURIComponent(podHref)}`;
  const displayHostName = getKnownRideHostDisplayName(ride);
  const rideAppTrustBadge = isRideApp ? getHomeRideTrustBadge(getRideAppTrustSummary(getHomeRideHostTrustUserId(ride))) : null;
  const ratingLabel =
    rideAppTrustBadge?.tone === "rating"
      ? rideAppTrustBadge.label.replace(/^Host\s+/i, "")
      : rideAppTrustBadge?.tone === "warning"
        ? null
        : isRideApp
          ? "4.9"
          : null;
  const compactStatusLabel = currentUserRelationship
    ? currentUserRelationship.tone === "host"
      ? "Created"
      : "Joined"
    : null;
  const estimateText = isRideApp
    ? rideAppEstimateDisplay.updated
      ? `Total Est. ${rideAppEstimateDisplay.value}`
      : "Estimate pending"
    : `Est. share HK$${ride.pricePerPerson}`;
  const secondaryRouteLabel = displayHostName ? `Host: ${displayHostName}` : getRideAppProviderLabel(ride) ?? ride.taxiType;

  return (
    <Link
      href={cardHref}
      className={cn(
        "block overflow-hidden rounded-[18px] border bg-[linear-gradient(145deg,color-mix(in_srgb,var(--rp-card)_96%,transparent),var(--rp-card-soft))] px-3 py-3 shadow-[var(--rp-shadow-soft)] transition min-[390px]:px-4 min-[560px]:rounded-[20px]",
        currentUserRelationship?.tone === "host"
          ? "border-[color-mix(in_srgb,var(--rp-primary)_78%,var(--rp-border))] shadow-[0_0_34px_color-mix(in_srgb,var(--rp-primary)_16%,transparent)] hover:border-[var(--rp-primary)]"
          : currentUserRelationship?.tone === "joined"
            ? "border-cyan-300/70 shadow-[0_0_34px_rgba(56,189,248,0.14)] hover:border-cyan-200"
            : isRideApp
          ? "border-sky-400/45 hover:border-sky-300/70 hover:shadow-[0_0_32px_rgba(56,189,248,0.16)]"
          : "border-[var(--rp-border-strong)] hover:border-[var(--rp-primary)] hover:shadow-[0_0_32px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)]",
      )}
    >
      <div className="grid grid-cols-[72px_minmax(0,1fr)_62px] items-center gap-3 min-[390px]:grid-cols-[86px_minmax(0,1fr)_70px] min-[560px]:grid-cols-[116px_minmax(0,1fr)_88px] min-[560px]:gap-5">
        <div className="grid min-w-0 grid-cols-[18px_minmax(0,1fr)] items-center gap-2 pr-2 min-[390px]:gap-2.5 min-[560px]:pr-4">
          <CalendarDays className="h-4 w-4 text-[var(--rp-primary)] min-[560px]:h-5 min-[560px]:w-5" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-[11px] font-black leading-4 text-[var(--rp-text)] min-[390px]:text-xs min-[560px]:text-sm">
              {ride.dateLabel}
            </p>
            <p className="mt-1 text-[11px] font-black leading-4 text-[var(--rp-muted-strong)] min-[390px]:text-xs min-[560px]:text-sm">
              {ride.timeLabel}
            </p>
          </div>
        </div>

        <div className="min-w-0 border-l border-white/10 pl-3 min-[390px]:pl-4 min-[560px]:pl-5">
          <h2 className="line-clamp-2 text-sm font-black leading-[1.15] text-[var(--rp-text)] min-[390px]:text-base min-[560px]:text-lg">
            {ride.fromLabel} {"\u2192"} {ride.toLabel}
          </h2>
          <p className="mt-1 truncate text-[11px] font-black leading-4 text-[var(--rp-muted-strong)] min-[390px]:text-xs min-[560px]:text-sm">
            {secondaryRouteLabel}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-black leading-4 min-[390px]:text-xs min-[560px]:text-sm">
            <span className="inline-flex items-center gap-1 text-[var(--rp-muted-strong)]">
              <UsersRound className="h-3.5 w-3.5 shrink-0 text-[var(--rp-primary)]" />
              {ride.seatsUsed} / {ride.seatsTotal}
            </span>
            <span className="h-3 w-px bg-white/12" aria-hidden="true" />
            <span className={cn("truncate", isRideApp ? "text-sky-300" : "text-[var(--rp-primary)]")}>
              {estimateText}
            </span>
          </div>
        </div>

        <div className="grid min-w-0 justify-items-center gap-1.5">
          <RideProfileAvatar ride={ride} currentUserAvatar={currentUserAvatar} />
          <div className="flex max-w-full items-center gap-1 text-[11px] font-black leading-4 text-[var(--rp-text)] min-[390px]:text-xs">
            {ratingLabel ? (
              <>
                <Star className="h-3 w-3 shrink-0 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
                <span className="shrink-0">{ratingLabel}</span>
              </>
            ) : null}
          </div>
          {compactStatusLabel ? (
            <span
              className={cn(
                "inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border px-2 text-[10px] font-black leading-none min-[390px]:px-2.5 min-[390px]:text-[11px]",
                currentUserRelationship?.tone === "joined"
                  ? "border-cyan-300/40 bg-cyan-400/12 text-cyan-100"
                  : "border-[color-mix(in_srgb,var(--rp-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-primary)]",
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{compactStatusLabel}</span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function ArmchairIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11V7a3 3 0 0 1 6 0v4" />
      <path d="M5 11h10a3 3 0 0 1 3 3v4H2v-4a3 3 0 0 1 3-3Z" />
      <path d="M4 18v2" />
      <path d="M16 18v2" />
      <path d="M18 14h2a2 2 0 0 1 2 2v2h-4" />
    </svg>
  );
}

function RideSearchResultCard(props: {
  ride: HomeRide;
  currentUserAvatar: CurrentUserAvatar;
  isAuthenticated: boolean;
  sourceTab: HomeTab;
}) {
  if (props.ride.rideKind === "recurring" || props.ride.is_recurring) {
    return <RecurringRideResultCard {...props} />;
  }

  return <HomeRideCard {...props} />;
}

function ScheduleRideResultsScreen({
  phase,
  rides,
  totalRideCount,
  activeFilter,
  onFilterChange,
  onBack,
  onFindRide,
  onOpenTransitionEnd,
  onExitTransitionEnd,
  resultsRef,
  currentUserAvatar,
  isAuthenticated,
}: {
  phase: CategoryTransitionPhase;
  rides: HomeRide[];
  totalRideCount: number;
  activeFilter: ScheduleRideQuickFilter;
  onFilterChange: (filter: ScheduleRideQuickFilter) => void;
  onBack: () => void;
  onFindRide: () => void;
  onOpenTransitionEnd: () => void;
  onExitTransitionEnd: () => void;
  resultsRef: RefObject<HTMLDivElement | null>;
  currentUserAvatar: CurrentUserAvatar;
  isAuthenticated: boolean;
}) {
  const screenOpen = phase === "open";

  return (
    <section
      aria-label="Schedule Ride results"
      onTransitionEnd={(event) => {
        if (event.currentTarget !== event.target || event.propertyName !== "transform") return;
        if (phase === "open") onOpenTransitionEnd();
        if (phase === "exiting") onExitTransitionEnd();
      }}
      style={{
        transform: screenOpen ? "translate3d(0, 0, 0)" : "translate3d(0, -100dvh, 0)",
        opacity: screenOpen ? 1 : 0.98,
      }}
      className={cn(
        "fixed inset-0 z-[140] h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#04101a] px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] text-[var(--rp-text)] shadow-[0_-18px_80px_rgba(0,0,0,0.58)] will-change-[transform,opacity] motion-safe:transition-[transform,opacity] motion-safe:duration-[220ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:px-6 lg:px-10",
      )}
    >
      <div className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-[#04101a]/96 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="mx-auto grid w-full max-w-[680px] grid-cols-[44px_minmax(0,1fr)_44px] items-center">
          <button
            type="button"
            onClick={onBack}
            className="my-2 grid h-11 w-11 place-items-center rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_48%,transparent)] bg-[rgba(13,24,35,0.92)] text-[var(--rp-primary)] shadow-[0_14px_32px_rgba(0,0,0,0.3)] transition hover:border-[var(--rp-primary)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[rgba(255,200,60,0.95)]"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 justify-self-center text-center text-2xl font-black tracking-tight">
            Ride<span className="text-[var(--rp-primary)]">Pod</span>
          </div>
          <Link
            href="/notifications"
            className="relative my-2 grid h-11 w-11 place-items-center justify-self-end rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_36%,transparent)] bg-[rgba(13,24,35,0.92)] text-white shadow-[0_14px_32px_rgba(0,0,0,0.3)] transition hover:border-[var(--rp-primary)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[rgba(255,200,60,0.95)]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 stroke-[2.2]" />
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[var(--rp-primary)] shadow-[0_0_0_2px_#04101a]" />
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-3 w-full max-w-[680px]">
        <div className="relative isolate min-h-[158px] overflow-hidden rounded-[24px] border border-[rgba(255,198,80,0.86)] bg-[linear-gradient(135deg,#ffe06f_0%,#ffc941_45%,#d89a21_100%)] text-[#071018] shadow-[0_24px_58px_rgba(244,183,46,0.22)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 bg-cover bg-center opacity-55 mix-blend-multiply"
            style={{
              backgroundImage: "url('/images/ridepod/home-ride-app-warm-pickup.jpg')",
            }}
          />
          <div aria-hidden="true" className="absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(255,220,91,0.98)_0%,rgba(255,207,64,0.9)_42%,rgba(255,207,64,0.66)_72%,rgba(255,207,64,0.42)_100%)]" />
          <div aria-hidden="true" className="absolute -right-10 top-5 z-0 h-24 w-24 rounded-full border border-white/38 bg-white/18" />
          <div className="relative z-10 grid min-h-[158px] grid-cols-[54px_minmax(0,1fr)_auto] gap-3 px-4 py-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-black/15 bg-white/24 text-[#071018] shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]">
              <CalendarDays className="h-6 w-6 stroke-[2.4]" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-black/72">One-off</p>
              <h1 className="mt-1 text-[27px] font-black leading-none tracking-tight">Schedule Ride</h1>
              <p className="mt-2 max-w-[15rem] text-sm font-bold leading-5 text-black/72">
                Plan ahead, pick your time & split the cost.
              </p>
            </div>
            <span className="inline-flex h-9 shrink-0 items-center self-start rounded-full border border-black/15 bg-black/12 px-3 text-xs font-black text-[#071018]">
              {totalRideCount} {totalRideCount === 1 ? "ride" : "rides"}
            </span>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {scheduleRideQuickFilters.map((filter) => {
            const selected = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilterChange(filter.id)}
                className={cn(
                  "inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-black transition",
                  selected
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)] shadow-[0_12px_30px_color-mix(in_srgb,var(--rp-primary)_20%,transparent)]"
                    : "border-[var(--rp-border-strong)] bg-[rgba(18,31,44,0.9)] text-[var(--rp-muted-strong)] hover:border-[color-mix(in_srgb,var(--rp-primary)_45%,transparent)] hover:text-[var(--rp-text)]",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div ref={resultsRef} className="mt-3 grid scroll-mt-28 gap-2.5">
          {rides.length > 0 ? (
            rides.map((ride) => (
              <ScheduleRideCompactResultCard
                key={ride.id}
                ride={ride}
                currentUserAvatar={currentUserAvatar}
                isAuthenticated={isAuthenticated}
              />
            ))
          ) : (
            <ScheduleRideLowResultsPanel onAdjustFilters={() => onFilterChange("recommended")} />
          )}
          {rides.length === 1 ? <ScheduleRideLowResultsPanel onAdjustFilters={() => onFilterChange("recommended")} /> : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-4 bg-[linear-gradient(180deg,rgba(4,16,26,0),#04101a_32%)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <button
          type="button"
          onClick={onFindRide}
          className="mx-auto flex min-h-14 w-full max-w-[680px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffdc6b,#f2ae35)] px-5 text-base font-black text-[#071018] shadow-[0_18px_44px_rgba(242,174,53,0.24)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[rgba(255,200,60,0.95)]"
        >
          Find a ride
        </button>
      </div>
    </section>
  );
}

function ScheduleRideCompactResultCard({
  ride,
  currentUserAvatar,
  isAuthenticated,
}: {
  ride: HomeRide;
  currentUserAvatar: CurrentUserAvatar;
  isAuthenticated: boolean;
}) {
  const podHref = `/pods/${ride.id}?fromTab=${encodeURIComponent(getRideDetailSourceTab(ride, "one_off"))}`;
  const cardHref = isAuthenticated ? podHref : `/login?next=${encodeURIComponent(podHref)}`;
  const openSeats = getOpenSeatCount(ride);
  const seatLabel = `${openSeats} ${openSeats === 1 ? "seat" : "seats"} left`;

  return (
    <Link
      href={cardHref}
      className="grid min-h-[82px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--rp-primary)_52%,var(--rp-border))] bg-[linear-gradient(145deg,rgba(7,16,24,0.98),rgba(18,31,44,0.92))] px-4 py-3 shadow-[0_16px_34px_rgba(0,0,0,0.28)] transition hover:border-[var(--rp-primary)] hover:shadow-[0_18px_40px_color-mix(in_srgb,var(--rp-primary)_14%,transparent)]"
    >
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-black leading-5 text-[var(--rp-text)] min-[390px]:text-base">
          {ride.fromLabel} <span className="text-[var(--rp-primary)]">{"\u2192"}</span> {ride.toLabel}
        </h2>
        <p className="mt-1 truncate text-xs font-bold leading-4 text-[var(--rp-muted-strong)] min-[390px]:text-sm">
          {ride.dateLabel} - {ride.timeLabel}
        </p>
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <ScheduleRideParticipantStack ride={ride} currentUserAvatar={currentUserAvatar} />
          <span className="truncate text-xs font-black leading-4 text-sky-300 min-[390px]:text-sm">
            HK${ride.pricePerPerson} / seat
          </span>
        </div>
      </div>
      <div className="grid shrink-0 justify-items-end gap-2 border-l border-white/10 pl-3">
        <span className="inline-flex min-h-8 items-center rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_52%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] px-3 text-xs font-black text-[var(--rp-primary)]">
          {seatLabel}
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--rp-muted-strong)]" />
      </div>
    </Link>
  );
}

function ScheduleRideParticipantStack({
  ride,
  currentUserAvatar,
}: {
  ride: HomeRide;
  currentUserAvatar: CurrentUserAvatar;
}) {
  const hostDisplayName = getRideHostDisplayName(ride);
  const showCurrentUserAvatar = ride.currentUserRole === "host";
  const avatarPreference = showCurrentUserAvatar ? currentUserAvatar.avatarPreference : ride.hostAvatarPreference;
  const avatarUrl = showCurrentUserAvatar ? currentUserAvatar.avatarUrl : ride.hostAvatarUrl;
  const avatarDisplayName = showCurrentUserAvatar ? currentUserAvatar.displayName : hostDisplayName;
  const extraRiders = ride.joinedRiders.slice(0, 2);

  return (
    <span className="flex shrink-0 items-center">
      <span className="relative z-[3] grid h-6 w-6 place-items-center overflow-hidden rounded-full border border-[#04101a] bg-[var(--rp-card-muted)] text-[9px] font-black text-[var(--rp-primary)]">
        {avatarPreference ? (
          <RidePodAvatar
            avatarUrl={avatarUrl}
            avatarPreference={avatarPreference}
            initials={getProfileInitials(avatarDisplayName)}
            displayName={avatarDisplayName}
            className="h-full w-full rounded-full text-[9px]"
          />
        ) : (
          getProfileInitial(hostDisplayName)
        )}
      </span>
      {extraRiders.map((rider, index) => (
        <span
          key={`${ride.id}-${rider}-${index}`}
          className="relative grid h-6 w-6 place-items-center rounded-full border border-[#04101a] bg-[color-mix(in_srgb,var(--rp-primary)_24%,var(--rp-card-muted))] text-[9px] font-black text-[var(--rp-text)]"
          style={{ marginLeft: "-0.45rem", zIndex: 2 - index }}
        >
          {getProfileInitial(rider)}
        </span>
      ))}
    </span>
  );
}

function ScheduleRideLowResultsPanel({ onAdjustFilters }: { onAdjustFilters: () => void }) {
  return (
    <div className="rounded-[18px] border border-[var(--rp-border)] bg-[linear-gradient(145deg,rgba(18,31,44,0.9),rgba(9,20,31,0.86))] p-4 shadow-[0_16px_34px_rgba(0,0,0,0.22)]">
      <p className="text-sm font-black text-[var(--rp-text)]">No more scheduled rides match this filter.</p>
      <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
        Try another date window or start a new one-off ride for your route.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAdjustFilters}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-3 text-xs font-black text-[var(--rp-primary)]"
        >
          Adjust filters
        </button>
        <Link
          href="/create"
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffdc6b,#f2ae35)] px-3 text-center text-xs font-black text-[#071018]"
        >
          Create a Schedule Ride
        </Link>
      </div>
    </div>
  );
}

function RideAppCommunityPanel() {
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const rideAppWaiver = useRideAppWaiverState();
  const waiverClaimed = rideAppWaiver.claimed && !rideAppWaiver.used;
  const waiverUsed = rideAppWaiver.claimed && rideAppWaiver.used;
  const ctaLabel = waiverUsed ? "Waiver used" : waiverClaimed ? "Waiver claimed" : "Claim HK$5 waiver";
  const helper = waiverUsed ? "Thanks for trying RidePod." : waiverClaimed ? "Use it on your next self-settle join." : null;

  return (
    <>
      <section className="mb-4 mt-4 grid gap-4">
        <div className="rounded-[26px] border border-cyan-200/35 bg-[linear-gradient(180deg,rgba(236,254,255,0.96),rgba(240,253,250,0.9))] p-5 text-[#12303a] shadow-[0_24px_60px_rgba(45,212,191,0.16)]">
          <div className="grid gap-4 min-[560px]:grid-cols-[1fr_auto] min-[560px]:items-start">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">RIDE APP LAUNCH OFFER</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-[#10212a]">
                First 100 joining members
              </h2>
              <p className="mt-1 text-left text-lg font-black leading-6 text-[#10212a]">
                HK$5 RidePod fee waived.
              </p>
            </div>
            <div className="grid gap-2 min-[560px]:justify-items-end">
              <button
                type="button"
                onClick={() => setClaimModalOpen(true)}
                disabled={waiverClaimed || waiverUsed}
                className={cn(
                  "inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[14px] px-5 text-sm font-black shadow-[0_18px_34px_rgba(37,99,235,0.28)] transition min-[560px]:w-auto",
                  waiverClaimed || waiverUsed
                    ? "bg-white/72 text-cyan-800"
                    : "bg-[linear-gradient(135deg,#2563eb_0%,#13d8cb_100%)] text-white hover:brightness-110",
                )}
              >
                {waiverClaimed || waiverUsed ? <CheckCircle2 className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                {ctaLabel}
              </button>
              {helper ? (
                <p className="text-center text-xs font-black text-cyan-800 min-[560px]:text-right">
                  {helper}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-cyan-800">
              <span>0 / 100 claimed</span>
              <span>100 left</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-cyan-900/10">
              <div className="h-full w-[2%] rounded-full bg-[linear-gradient(90deg,#5eead4,#2563eb)]" />
            </div>
          </div>
        </div>
      </section>

      {claimModalOpen ? (
        <RideAppWaiverClaimModal
          claimed={waiverClaimed}
          onCancel={() => setClaimModalOpen(false)}
          onClaim={claimRideAppWaiver}
        />
      ) : null}
    </>
  );
}

function RideAppWaiverClaimModal({
  claimed,
  onCancel,
  onClaim,
}: {
  claimed: boolean;
  onCancel: () => void;
  onClaim: () => void;
}) {
  const offerItems = [
    `${ridePodJoinFeeWaiverCopy.appliesTo} waived.`,
    ridePodJoinFeeWaiverCopy.excludes,
    ridePodJoinFeeWaiverCopy.demoNote,
  ];
  const ruleItems = [
    "Eligible pod joins only.",
    "One waiver per account in this demo.",
    "Abuse may be reviewed.",
  ];

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ride-app-waiver-title"
        className="w-full max-w-md rounded-[24px] border border-[var(--rp-border-strong)] bg-[linear-gradient(180deg,#07111a,#0b1620)] p-5 text-[var(--rp-text)] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">Ride app launch offer</p>
            <h2 id="ride-app-waiver-title" className="mt-2 text-2xl font-black leading-tight">
              {claimed ? "Waiver claimed" : "Claim HK$5 waiver?"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close waiver modal"
            onClick={onCancel}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[var(--rp-muted-strong)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          {claimed
            ? "We'll apply it to your next eligible self-settle join."
            : "Use this waiver on your next eligible Ride app self-settle join."}
        </p>

        <div className="mt-5 grid gap-3">
          <div className="rounded-[18px] border border-cyan-300/20 bg-cyan-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Offer summary</p>
            <ul className="mt-3 grid gap-2 text-sm font-bold leading-5 text-cyan-50">
              {offerItems.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-white/[0.04] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Rules</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
              {ruleItems.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 grid gap-3 min-[420px]:grid-cols-2">
          {claimed ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="min-h-12 rounded-full border border-[var(--rp-border)] px-4 text-sm font-black text-[var(--rp-muted-strong)]"
              >
                Close
              </button>
              <Link
                href="/create"
                onClick={onCancel}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#13d8cb)] px-4 text-sm font-black text-white"
              >
                Use on Ride app pod
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="min-h-12 rounded-full border border-[var(--rp-border)] px-4 text-sm font-black text-[var(--rp-muted-strong)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onClaim}
                className="min-h-12 rounded-full bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
              >
                Claim waiver
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function RideTypeInfoStrip() {
  return (
    <div className="mt-3 grid gap-2 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold text-[var(--rp-muted-strong)] min-[720px]:grid-cols-2">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span>Taxi pods use partner quote review.</span>
      </div>
      <div className="flex items-center gap-3 min-[720px]:border-l min-[720px]:border-white/12 min-[720px]:pl-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sky-300/35 bg-sky-400/12 text-sky-300">
          <Smartphone className="h-5 w-5" />
        </span>
        <span>Ride app pods are self-settle with host fare estimates.</span>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  tone = "taxi",
  onClick,
}: {
  label: string;
  active: boolean;
  tone?: "taxi" | "ride_app" | "neutral";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 shrink-0 rounded-full border px-4 text-xs font-black transition",
        active && tone === "ride_app" && "border-sky-300/45 bg-sky-400/16 text-sky-100",
        active && tone === "taxi" && "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]",
        active && tone === "neutral" && "border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-text)]",
        !active && "border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card-soft)_76%,transparent)] text-[var(--rp-muted-strong)] hover:border-[var(--rp-border-strong)]",
      )}
    >
      {label}
    </button>
  );
}

function EmptyRides({ tab, rideModeFilter, hasAnyRides }: { tab: HomeTab; rideModeFilter: RideModeFilter; hasAnyRides: boolean }) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-5 text-center">
      <p className="text-lg font-black text-[var(--rp-text)]">
        {hasAnyRides ? getEmptyTitle(tab, rideModeFilter) : "No matching pods"}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--rp-muted-strong)]">
        {getEmptyCopy(rideModeFilter, hasAnyRides)}
      </p>
      <Link
        href="/create"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
      >
        Create taxi pod
      </Link>
    </section>
  );
}

const startsWithRideAppOnly = homeRides.length > 0 && homeRides.every((ride) => ride.rideCategory === "ride_app_self_settle" || ride.rideService === "ride_app");
const initialRideModeFilter: RideModeFilter = startsWithRideAppOnly ? "ride_app" : "taxi";
const initialSettlementFilter: SettlementFilter = startsWithRideAppOnly ? "self_settle" : "protected";
const initialFromDistrict = "All districts";
const initialToDistrict = "All districts";

function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function scrollElementToTop(element: HTMLElement | null, offset = 88) {
  if (!element) return;

  const targetY = Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset);

  if (prefersReducedMotion()) {
    window.scrollTo({ top: targetY, behavior: "auto" });
    return;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  const duration = 420;
  const startTime = window.performance.now();

  if (Math.abs(distance) < 4) {
    window.scrollTo({ top: targetY, behavior: "auto" });
    return;
  }

  const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

  function step(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo({ top: startY + distance * easeOutCubic(progress), behavior: "auto" });

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rideTypesRef = useRef<HTMLDivElement | null>(null);
  const recommendationsRef = useRef<HTMLElement | null>(null);
  const scheduleTransitionTimerRef = useRef<number | null>(null);
  const scheduleTransitionLockedRef = useRef(false);
  const scheduleHistoryEntryActiveRef = useRef(false);
  const savedHomeScrollYRef = useRef(0);
  const scheduleResultsRef = useRef<HTMLDivElement | null>(null);
  const tabSearchParam = searchParams.get("tab");
  const urlActiveTab = getHomeTabFromSearchParam(tabSearchParam);
  const [optimisticActiveTab, setOptimisticActiveTab] = useState<HomeTab | null>(null);
  const activeTab = optimisticActiveTab ?? urlActiveTab;
  const { user, profile } = useAuth();
  const isAuthenticated = Boolean(user);
  const displayName = user
    ? profile?.account_name?.trim() ||
      profile?.display_name?.trim() ||
      profile?.preferred_name?.trim() ||
      (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "") ||
      user.email?.split("@")[0]?.trim() ||
      "RidePod account"
    : "Guest rider";
  const avatarProfileId = profile?.id ?? user?.id ?? null;
  const [avatarPreference] = useRidePodAvatarPreference(avatarProfileId);
  const currentUserAvatar = useMemo(
    () => ({
      avatarPreference,
      avatarUrl: profile?.avatar_url,
      displayName,
      initials: getProfileInitials(displayName),
    }),
    [avatarPreference, displayName, profile?.avatar_url],
  );
  const createdHomeRideViewerIdentity = useMemo(
    () => createdHomeRideViewerIdentityFromAuth({ profile, user }),
    [profile, user],
  );
  const createdHomeRides = useCreatedHomeRides(
    isAuthenticated ? user?.id ?? null : null,
    true,
    isAuthenticated ? createdHomeRideViewerIdentity : null,
  );
  useEffect(() => {
    if (!user || !avatarProfileId) return;
    updateCreatedHomeRideHostAvatar({
      hostAvatarPreference: avatarPreference,
      hostAvatarUrl: profile?.avatar_url ?? null,
      hostDisplayName: displayName,
    });
  }, [avatarPreference, avatarProfileId, displayName, profile?.avatar_url, user]);
  const [fromDistrict, setFromDistrict] = useState(initialFromDistrict);
  const [toDistrict, setToDistrict] = useState(initialToDistrict);
  const [podPreferenceFilter, setPodPreferenceFilter] = useState<PodPreferenceFilter>("all");
  const [taxiDriverFilter, setTaxiDriverFilter] = useState<TaxiDriverFilter>("all");
  const [taxiTypeFilter, setTaxiTypeFilter] = useState<TaxiTypeFilter>("all");
  const [airportDirectionFilter, setAirportDirectionFilter] = useState<AirportDirectionFilter>("all");
  const [rideModeFilter, setRideModeFilter] = useState<RideModeFilter>(initialRideModeFilter);
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>(initialSettlementFilter);
  const [fareEstimateFilter, setFareEstimateFilter] = useState<FareEstimateFilter>("any");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("any");
  const [seatFilter, setSeatFilter] = useState<SeatFilter>("any");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rideTypesVisible, setRideTypesVisible] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [categoryTransitionPhase, setCategoryTransitionPhase] = useState<CategoryTransitionPhase>("idle");
  const [scheduleRideQuickFilter, setScheduleRideQuickFilter] = useState<ScheduleRideQuickFilter>("recommended");
  const today = useMemo(() => new Date(), []);
  const activeHeroBackgroundMode = rideModeFilter === "ride_app" ? "ride_app" : "taxi";
  const heroGreeting = useMemo(() => getTimeOfDayGreeting(), []);

  useEffect(() => {
    const preloadedImages = heroBackgroundModes.map((mode) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = homeHeroBackgrounds[mode].image;
      return image;
    });

    return () => {
      preloadedImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);

  const allHomeRides = useMemo(() => {
    const demoHomeRides = homeRides.map((ride) => applyRideAppDemoPersona(ride, { profile, user }));
    const rides = [
      ...createdHomeRides,
      ...demoHomeRides.filter((ride) => !createdHomeRides.some((createdRide) => createdRide.id === ride.id)),
    ];

    return isAuthenticated ? rides : rides.map(withoutCurrentUserRelationship);
  }, [createdHomeRides, isAuthenticated, profile, user]);

  useEffect(() => {
    const element = rideTypesRef.current;
    if (!element) return;
    const rideTypesElement = element;
    const win = window;

    function updateVisibility() {
      const rect = rideTypesElement.getBoundingClientRect();
      setRideTypesVisible(rect.bottom > 88 && rect.top < win.innerHeight - 96);
    }

    updateVisibility();
    win.addEventListener("scroll", updateVisibility, { passive: true });
    win.addEventListener("resize", updateVisibility);

    return () => {
      win.removeEventListener("scroll", updateVisibility);
      win.removeEventListener("resize", updateVisibility);
    };
  }, []);

  const scheduleScreenVisible = selectedCategory === "schedule";

  useEffect(() => {
    return () => {
      if (scheduleTransitionTimerRef.current) {
        window.clearTimeout(scheduleTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scheduleScreenVisible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [scheduleScreenVisible]);

  const taxiTypeOptions = useMemo(
    () =>
      Array.from(new Set(allHomeRides.filter((ride) => isRideStillVisible(ride, today)).map((ride) => ride.taxiType))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [allHomeRides, today],
  );

  const filteredRides = useMemo(
    () =>
      allHomeRides.filter(
        (ride) =>
          isRideStillVisible(ride, today) &&
          matchesRideModeFilter(ride, rideModeFilter) &&
          matchesSettlementFilter(ride, settlementFilter) &&
          matchesFareEstimateFilter(ride, fareEstimateFilter) &&
          matchesDeadlineFilter(ride, deadlineFilter) &&
          matchesSeatFilter(ride, seatFilter) &&
          matchesOwnershipFilter(ride, ownershipFilter) &&
          matchesDistrict(fromDistrict, ride.fromDistrict) &&
          matchesDistrict(toDistrict, ride.toDistrict) &&
          (podPreferenceFilter === "all" ||
            (podPreferenceFilter === "open" && ride.podType === "Open pod") ||
            (podPreferenceFilter === "women_only" && ride.podType === "Women-only") ||
            (podPreferenceFilter === "verified_only" && ride.podType === "Verified-only") ||
            (podPreferenceFilter === "invite_only" && ride.podType === "Invite-only")) &&
          (taxiDriverFilter === "all" ||
            isRideAppSelfSettle(ride) ||
            (taxiDriverFilter === "accepted" && ride.driverAssignmentStatus === "PARTNER_ACCEPTED") ||
            (taxiDriverFilter === "waiting" && ride.driverAssignmentStatus !== "PARTNER_ACCEPTED")) &&
          (taxiTypeFilter === "all" || isRideAppSelfSettle(ride) || ride.taxiType === taxiTypeFilter) &&
          (airportDirectionFilter === "all" || ride.airportDirection === airportDirectionFilter),
      ),
    [
      airportDirectionFilter,
      allHomeRides,
      deadlineFilter,
      fareEstimateFilter,
      fromDistrict,
      ownershipFilter,
      podPreferenceFilter,
      rideModeFilter,
      seatFilter,
      settlementFilter,
      taxiDriverFilter,
      taxiTypeFilter,
      today,
      toDistrict,
    ],
  );

  const tabFilteredRides = useMemo(
    () => filteredRides.filter((ride) => rideMatchesTab(activeTab, ride)),
    [activeTab, filteredRides],
  );

  const visibleRides = tabFilteredRides;
  const scheduleRideRides = useMemo(
    () => filteredRides.filter((ride) => rideMatchesTab("one_off", ride)),
    [filteredRides],
  );
  const scheduleRideVisibleRides = useMemo(
    () =>
      scheduleRideRides.filter((ride) =>
        rideMatchesScheduleRideQuickFilter(ride, scheduleRideQuickFilter, today),
      ),
    [scheduleRideQuickFilter, scheduleRideRides, today],
  );
  const categoryRideCounts = useMemo<Record<HomeCategoryCardId, number>>(
    () => ({
      all: filteredRides.length,
      airport: filteredRides.filter((ride) => rideMatchesTab("airport", ride)).length,
      one_off: filteredRides.filter((ride) => rideMatchesTab("one_off", ride)).length,
      recurring: filteredRides.filter((ride) => rideMatchesTab("recurring", ride)).length,
    }),
    [filteredRides],
  );

  function handleTabChange(tab: HomeTab) {
    setOptimisticActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", tab);
    const nextUrl = `/home?${nextParams.toString()}`;
    window.history.replaceState(null, "", nextUrl);
    router.replace(nextUrl, { scroll: false });
  }

  const clearScheduleTransitionTimer = useCallback(() => {
    if (!scheduleTransitionTimerRef.current) return;
    window.clearTimeout(scheduleTransitionTimerRef.current);
    scheduleTransitionTimerRef.current = null;
  }, []);

  function pushScheduleHistoryEntry() {
    if (scheduleHistoryEntryActiveRef.current) return;

    const url = new URL(window.location.href);
    url.searchParams.set("category", "schedule");
    window.history.pushState({ ...(window.history.state ?? {}), ridepodCategoryLayer: "schedule" }, "", url);
    scheduleHistoryEntryActiveRef.current = true;
  }

  function finalizeScheduleOpen() {
    clearScheduleTransitionTimer();
    scheduleTransitionLockedRef.current = false;
    pushScheduleHistoryEntry();
  }

  const finishScheduleClose = useCallback(() => {
    clearScheduleTransitionTimer();
    setSelectedCategory(null);
    setCategoryTransitionPhase("idle");
    window.scrollTo({ top: savedHomeScrollYRef.current, behavior: "auto" });
    scheduleTransitionLockedRef.current = false;
  }, [clearScheduleTransitionTimer]);

  const beginScheduleClose = useCallback(() => {
    if (selectedCategory !== "schedule" || categoryTransitionPhase === "idle" || categoryTransitionPhase === "exiting") return;

    scheduleTransitionLockedRef.current = true;
    clearScheduleTransitionTimer();

    if (prefersReducedMotion()) {
      finishScheduleClose();
      return;
    }

    setCategoryTransitionPhase("exiting");
    scheduleTransitionTimerRef.current = window.setTimeout(finishScheduleClose, 300);
  }, [categoryTransitionPhase, clearScheduleTransitionTimer, finishScheduleClose, selectedCategory]);

  useEffect(() => {
    function handlePopState() {
      if (!scheduleHistoryEntryActiveRef.current || selectedCategory !== "schedule") return;
      scheduleHistoryEntryActiveRef.current = false;
      beginScheduleClose();
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [beginScheduleClose, selectedCategory]);

  function openScheduleRideScreen() {
    if (selectedCategory !== null || categoryTransitionPhase !== "idle" || scheduleTransitionLockedRef.current) return;

    scheduleTransitionLockedRef.current = true;
    savedHomeScrollYRef.current = window.scrollY;
    setScheduleRideQuickFilter("recommended");
    setSelectedCategory("schedule");

    if (prefersReducedMotion()) {
      setCategoryTransitionPhase("open");
      window.setTimeout(finalizeScheduleOpen, 0);
      return;
    }

    setCategoryTransitionPhase("entering");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setCategoryTransitionPhase("open");
        scheduleTransitionTimerRef.current = window.setTimeout(finalizeScheduleOpen, 300);
      });
    });
  }

  function closeScheduleRideScreen() {
    if (scheduleTransitionLockedRef.current) return;

    if (scheduleHistoryEntryActiveRef.current) {
      window.history.back();
      return;
    }

    beginScheduleClose();
  }

  function handleScheduleFindRide() {
    setScheduleRideQuickFilter("recommended");
    window.requestAnimationFrame(() => {
      scheduleResultsRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function handleCategoryCardSelect(tab: HomeCategoryCardId) {
    if (tab === "one_off") {
      openScheduleRideScreen();
      return;
    }

    handleTabChange(tab);
    window.requestAnimationFrame(() => {
      scrollElementToTop(recommendationsRef.current);
    });
  }

  function handleBackToRideTypes() {
    scrollElementToTop(rideTypesRef.current);
  }

  function handleRideModeChange(value: Extract<RideModeFilter, "taxi" | "ride_app">) {
    setRideModeFilter(value);
    if (value === "taxi") {
      setSettlementFilter("protected");
      setFareEstimateFilter("any");
    } else {
      setSettlementFilter("self_settle");
      if (activeTab === "quote_ready") {
        handleTabChange("all");
      }
    }
  }

  function handleAirportDirectionChange(direction: AirportDirectionFilter) {
    setAirportDirectionFilter(direction);

    if (direction === "to_airport") {
      setFromDistrict("All districts");
      setToDistrict("Airport");
    } else if (direction === "from_airport") {
      setFromDistrict("Airport");
      setToDistrict("All districts");
    } else {
      setFromDistrict("All districts");
      setToDistrict("All districts");
    }
  }

  function resetRouteFilters() {
    setFromDistrict(initialFromDistrict);
    setToDistrict(initialToDistrict);
    setPodPreferenceFilter("all");
    setTaxiDriverFilter("all");
    setTaxiTypeFilter("all");
    setAirportDirectionFilter("all");
    setSettlementFilter(rideModeFilter === "ride_app" ? "self_settle" : "protected");
    setFareEstimateFilter("any");
    setDeadlineFilter("any");
    setSeatFilter("any");
    setOwnershipFilter("all");
  }

  const airportSummary =
    airportDirectionFilter === "to_airport"
      ? "To airport"
      : airportDirectionFilter === "from_airport"
        ? "From airport"
        : "";
  const podPreferenceSummary =
    podPreferenceFilter === "open"
      ? "Open pod"
      : podPreferenceFilter === "women_only"
        ? "Women-only"
        : podPreferenceFilter === "verified_only"
          ? "Verified-only"
          : podPreferenceFilter === "invite_only"
            ? "Invite-only"
            : "";
  const taxiDriverSummary =
    taxiDriverFilter === "accepted"
      ? "Taxi driver accepted"
      : taxiDriverFilter === "waiting"
        ? "Waiting for driver"
        : "";
  const taxiTypeSummary = taxiTypeFilter !== "all" ? taxiTypeFilter : "";
  const rideModeSummary =
    rideModeFilter === "taxi" ? "Taxi" : rideModeFilter === "ride_app" ? "Ride app" : "";
  const settlementSummary =
    settlementFilter === "protected" ? "Protected quote" : settlementFilter === "self_settle" ? "Self-settle" : "";
  const fareEstimateSummary =
    fareEstimateFilter === "estimate_available"
      ? "Estimate available"
      : fareEstimateFilter === "estimate_pending"
        ? "Estimate pending"
        : "";
  const deadlineSummary =
    deadlineFilter === "joining_now"
      ? "Joining now"
      : deadlineFilter === "expiring_soon"
        ? "Expiring soon"
        : deadlineFilter === "minimum_reached"
          ? "Minimum reached"
          : "";
  const seatSummary =
    seatFilter === "one_left"
      ? "1 seat left"
      : seatFilter === "two_plus_available"
        ? "2+ seats"
        : seatFilter === "minimum_reached"
          ? "Minimum reached"
          : seatFilter === "minimum_not_reached"
            ? "Minimum not reached"
            : "";
  const baselineSettlementFilter =
    rideModeFilter === "taxi" ? "protected" : rideModeFilter === "ride_app" ? "self_settle" : initialSettlementFilter;
  const hasActiveFilters =
    fromDistrict !== initialFromDistrict ||
    toDistrict !== initialToDistrict ||
    podPreferenceFilter !== "all" ||
    taxiDriverFilter !== "all" ||
    taxiTypeFilter !== "all" ||
    airportDirectionFilter !== "all" ||
    settlementFilter !== baselineSettlementFilter ||
    fareEstimateFilter !== "any" ||
    deadlineFilter !== "any" ||
    seatFilter !== "any" ||
    ownershipFilter !== "all";
  const showRideRecommendations = true;
  const activeRecommendationLabel =
    activeTab === "all" || activeTab === "airport" || activeTab === "one_off" || activeTab === "recurring"
      ? categoryRecommendationLabels[activeTab]
      : tabLabels[activeTab];
  const [oneOffCard, recurringCard, airportCard, allRidesCard] = categoryCards;
  const renderCategoryCard = (card: (typeof categoryCards)[number]) => (
    <CategoryCard
      key={card.id}
      id={card.id}
      imageSrc={card.imageSrc}
      imageAlt={card.imageAlt}
      href={card.href}
      rideCount={categoryRideCounts[card.id]}
      selected={activeTab === card.id}
      onClick={handleCategoryCardSelect}
      className={
        card.id === "one_off"
          ? "absolute left-0 top-0 z-[1] h-full w-[48.35%] rounded-[clamp(22px,4vw,28px)]"
          : card.id === "recurring"
            ? "absolute right-0 top-0 z-[2] h-[44%] w-[49.55%] rounded-[clamp(20px,3.8vw,26px)]"
            : ""
      }
    />
  );
  const homepageExitingForSchedule = selectedCategory === "schedule" && categoryTransitionPhase !== "exiting";

  return (
    <>
    <div
      className={cn(
        "relative -mx-4 -mt-5 min-h-[calc(100vh-1.25rem)] overflow-x-hidden bg-[#04101a] pb-[calc(9rem+env(safe-area-inset-bottom))] transition-[transform,opacity] duration-[180ms] ease-out motion-reduce:transition-none sm:-mx-6 lg:-mx-10 lg:-mt-8 lg:pb-8",
        homepageExitingForSchedule ? "pointer-events-none translate-y-[6dvh] scale-[0.985] opacity-[0.35]" : "translate-y-0 scale-100 opacity-100",
      )}
    >
      <section className="relative overflow-hidden px-4 pb-2 pt-7 sm:px-6 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#04101a]"
        />
        <div className="relative z-10 mx-auto w-full max-w-[680px] px-1 pb-4 sm:px-2 min-[720px]:px-3">
          <p
            className={cn(
              "text-[25px] font-black leading-tight tracking-tight text-white min-[720px]:text-3xl",
            )}
          >
            {isAuthenticated ? (
              <>
                <span>{heroGreeting}, </span>
                <span className="break-words">{displayName}</span>
              </>
            ) : (
              "Your ride, together."
            )}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-white/72 min-[720px]:text-base">
            {isAuthenticated ? "Your ride, together." : "First Local Shared Ride in Hong Kong"}
          </p>
        </div>
        <div
          className={cn(
            "relative z-0 mx-auto mt-1 w-full max-w-[680px] overflow-hidden rounded-[30px] border border-white/10 bg-[#071018] shadow-[0_28px_64px_rgba(0,0,0,0.38)]",
            "aspect-[1.45/1]",
          )}
        >
          {heroBackgroundModes.map((mode) => {
            const background = homeHeroBackgrounds[mode];
            const active = activeHeroBackgroundMode === mode;

            return (
              <div key={mode} aria-hidden="true" className="absolute inset-0">
                <div
                  className="absolute inset-0 bg-no-repeat transition-opacity duration-300 ease-out min-[720px]:hidden"
                  style={{
                    backgroundImage: `url('${background.image}')`,
                    backgroundPosition: background.mobileBackdropPosition,
                    backgroundSize: background.mobileBackdropSize,
                    opacity: active ? background.mobileBackdropOpacity : 0,
                    willChange: "opacity",
                  }}
                />
                <div
                  className="absolute inset-0 bg-no-repeat transition-opacity duration-300 ease-out min-[720px]:hidden"
                  style={{
                    backgroundImage: `url('${background.image}')`,
                    backgroundPosition: background.mobilePosition,
                    backgroundSize: background.mobileSize,
                    opacity: active ? 1 : 0,
                    willChange: "opacity",
                  }}
                />
                <div
                  className="absolute inset-0 hidden bg-no-repeat transition-opacity duration-300 ease-out min-[720px]:block"
                  style={{
                    backgroundImage: `url('${background.image}')`,
                    backgroundPosition: background.desktopPosition,
                    backgroundSize: background.desktopSize,
                    opacity: active ? 1 : 0,
                    willChange: "opacity",
                  }}
                />
                <div
                  className="absolute inset-0 transition-opacity duration-300 ease-out"
                  style={{
                    backgroundImage: background.overlay,
                    opacity: active ? 1 : 0,
                    willChange: "opacity",
                  }}
                />
              </div>
            );
          })}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(3,9,15,0.42))]",
              "h-10 opacity-55",
            )}
          />
          <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(3,9,15,0.38),transparent)]" />
        </div>
        {showRideRecommendations ? (
          <div className="relative z-10 mx-auto mt-3 w-full max-w-[680px] px-4 min-[420px]:px-8">
            <RideModeSwitch
              value={rideModeFilter === "ride_app" ? "ride_app" : "taxi"}
              onChange={handleRideModeChange}
            />
          </div>
        ) : null}

        <div ref={rideTypesRef} className="relative z-10 mt-6 scroll-mt-[88px]">
          <div className="relative isolate mx-auto aspect-[1.6/1] w-full max-w-[680px] overflow-visible pb-1">
            {renderCategoryCard(oneOffCard)}
            {renderCategoryCard(recurringCard)}
            <div className="absolute bottom-0 right-0 z-[3] grid h-[53%] w-[57.1%] grid-cols-[minmax(0,1.095fr)_minmax(0,1fr)] gap-[clamp(8px,1.7vw,13px)]">
              <div className="relative isolate h-full w-full min-w-0 before:pointer-events-none before:absolute before:-inset-[clamp(6px,1.35vw,10px)] before:z-0 before:rounded-[clamp(23px,4vw,29px)] before:bg-[#04101a]">
                <CategoryCard
                  id={airportCard.id}
                  imageSrc={airportCard.imageSrc}
                  imageAlt={airportCard.imageAlt}
                  href={airportCard.href}
                  rideCount={categoryRideCounts[airportCard.id]}
                  selected={activeTab === airportCard.id}
                  onClick={handleCategoryCardSelect}
                  className="relative z-10 h-full w-full min-w-0 rounded-[clamp(19px,3.5vw,24px)]"
                />
              </div>
              <CategoryCard
                id={allRidesCard.id}
                imageSrc={allRidesCard.imageSrc}
                imageAlt={allRidesCard.imageAlt}
                href={allRidesCard.href}
                rideCount={categoryRideCounts[allRidesCard.id]}
                selected={activeTab === allRidesCard.id}
                onClick={handleCategoryCardSelect}
                className="relative h-full w-full min-w-0 rounded-[clamp(19px,3.5vw,24px)]"
              />
            </div>
          </div>
        </div>
      </section>

      {showRideRecommendations ? (
        <section ref={recommendationsRef} className="relative mx-auto mt-4 w-full max-w-[712px] scroll-mt-[88px] px-4 pb-4 sm:px-6 lg:px-4 min-[720px]:pb-64">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="whitespace-nowrap text-base font-black tracking-tight text-[var(--rp-text)]">Recommended for you</h1>
              <span className="mt-1 inline-flex max-w-full items-center rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-3 py-1 text-[11px] font-black text-[var(--rp-primary)]">
                {activeRecommendationLabel}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetRouteFilters}
                  className="inline-flex min-h-10 items-center rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-4 text-xs font-black text-[var(--rp-primary)]"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition",
                  hasActiveFilters
                    ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]"
                    : "border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)]",
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {visibleRides.length > 0 ? (
              visibleRides.map((ride) => (
                <RideSearchResultCard
                  key={ride.id}
                  ride={ride}
                  currentUserAvatar={currentUserAvatar}
                  isAuthenticated={isAuthenticated}
                  sourceTab={activeTab}
                />
              ))
            ) : (
              <EmptyRides tab={activeTab} rideModeFilter={rideModeFilter} hasAnyRides={filteredRides.length > 0} />
            )}
          </div>
          <RideTypeInfoStrip />
          <RideAppCommunityPanel />
        </section>
      ) : null}

      {showRideRecommendations && !rideTypesVisible ? (
        <button
          type="button"
          onClick={handleBackToRideTypes}
          className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_42%,transparent)] bg-[rgba(4,16,26,0.92)] px-3.5 text-xs font-black text-[var(--rp-primary)] shadow-[0_18px_42px_rgba(0,0,0,0.42)] backdrop-blur-md transition hover:border-[var(--rp-primary)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[rgba(255,200,60,0.95)] min-[720px]:bottom-8 min-[720px]:right-8"
        >
          <span aria-hidden="true">↑</span>
          Back to ride types
        </button>
      ) : null}

      <DistrictFilterSheet
        open={filtersOpen}
        activeTab={activeTab}
        fromDistrict={fromDistrict}
        toDistrict={toDistrict}
        ownership={ownershipFilter}
        onFromChange={setFromDistrict}
        onToChange={setToDistrict}
        onOwnershipChange={setOwnershipFilter}
        onSwap={() => {
          setFromDistrict(toDistrict);
          setToDistrict(fromDistrict);
        }}
        onReset={resetRouteFilters}
        onClose={() => setFiltersOpen(false)}
      />

    </div>
    {scheduleScreenVisible ? (
      <ScheduleRideResultsScreen
        phase={categoryTransitionPhase}
        rides={scheduleRideVisibleRides}
        totalRideCount={scheduleRideRides.length}
        activeFilter={scheduleRideQuickFilter}
        onFilterChange={setScheduleRideQuickFilter}
        onBack={closeScheduleRideScreen}
        onFindRide={handleScheduleFindRide}
        onOpenTransitionEnd={finalizeScheduleOpen}
        onExitTransitionEnd={finishScheduleClose}
        resultsRef={scheduleResultsRef}
        currentUserAvatar={currentUserAvatar}
        isAuthenticated={isAuthenticated}
      />
    ) : null}
    </>
  );
}
