"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarPlus,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  DollarSign,
  Info,
  Luggage,
  MapPin,
  Minus,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import {
  HK_TAXI_FARE_RULES,
  HK_TAXI_ZONES,
  ROUTE_RISK_LEVELS,
  calculateHkTaxiFareEstimate,
  getHostEstimateWarning,
  suggestApprovedMaxFare,
  type EstimateConfidence,
  type EstimateSource,
  type HkTaxiZone,
  type RouteRiskLevel,
} from "@/lib/fare-estimates";
import { calculateMoneyProtection } from "@/lib/money-protection";
import {
  WEEKDAYS,
  createRecurringTemplateRRule,
  generateRecurringOccurrences,
  type RecurringPattern,
  type RecurringPodTemplate,
  type RecurringScheduleLeg,
  type ScheduleType,
  type Weekday,
} from "@/lib/pod-schedule";

type PodType = "scheduled" | "recurring";
type CreateStep = 0 | 1 | 2 | 3 | 4 | 5;
type RouteStop = {
  id: number;
  address: string;
};
type RideOptionId =
  | "hosts_choice"
  | "large_ride"
  | "standard_ride"
  | "taxi_meter"
  | "comfort_premium";
type DateTimeState = {
  scheduleType: ScheduleType;
  date: string;
  selectedDate: string;
  selectedDay: number;
  time: string;
  flexibility: string;
  recurringWeekdays: Weekday[];
  recurringPattern: RecurringPattern;
  recurringLegs: RecurringScheduleLeg[];
  recurringStartDate: string;
  recurringEndMode: "after" | "on_date" | "none";
  recurringOccurrenceLimit: number;
  recurringEndDate: string;
};
type PeopleVehicleState = {
  seatsAvailable: number;
  bags: number;
  rideOption: RideOptionId;
  vehicleType: string;
  priceSource: string;
};
type PricingState = {
  estimatedFare: number;
  estimatedShare: number;
  maxFare: number;
};
type GenderMode = "women_only" | "mixed";
type AccessMode = "open" | "verified_only" | "community_only" | "high_trust_only" | "invite_only";

const steps = ["Choose Type", "Route & Stops", "Date & Time", "People & Vehicle", "Review", "Success"];

const podTypes: Array<{
  id: PodType;
  title: string;
  sublabel: string;
  description: string;
  icon: "calendar" | "repeat";
}> = [
  {
    id: "scheduled",
    title: "Scheduled one-time trip",
    sublabel: "",
    description: "For a single trip on a specific date and time.",
    icon: "calendar",
  },
  {
    id: "recurring",
    title: "Recurring pod",
    sublabel: "Repeat on specific days or a schedule.",
    description: "",
    icon: "repeat",
  },
];

type CalendarDay = {
  label: string;
  day: number;
  inMonth: boolean;
  isoDate: string;
  disabled: boolean;
};

const timeHours = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);
const timeMinutes = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);
const timePeriods = ["AM", "PM"] as const;

const weekdayLabels = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const recurringWeekdayOptions: Array<{ id: Weekday; label: string }> = [
  { id: "MO", label: "Mon" },
  { id: "TU", label: "Tue" },
  { id: "WE", label: "Wed" },
  { id: "TH", label: "Thu" },
  { id: "FR", label: "Fri" },
  { id: "SA", label: "Sat" },
  { id: "SU", label: "Sun" },
];

const rideOptions: Array<{
  id: RideOptionId;
  title: string;
  description: string;
  helper: string;
  icon: typeof CarFront;
}> = [
  {
    id: "hosts_choice",
    title: "Host's Choice",
    description: "Host picks the best available ride under max fare.",
    helper: "Best for flexibility.",
    icon: ShieldCheck,
  },
  {
    id: "large_ride",
    title: "Large Ride",
    description: "Best for groups, airport trips, and luggage.",
    helper: "UberXL / large taxi / van.",
    icon: UsersRound,
  },
  {
    id: "standard_ride",
    title: "Standard Ride",
    description: "Best for 2-3 riders with light bags.",
    helper: "UberX / DiDi / standard taxi.",
    icon: CarFront,
  },
  {
    id: "taxi_meter",
    title: "Taxi / Meter Taxi",
    description: "Good when taxi is cheaper or easier.",
    helper: "Meter fare or city taxi.",
    icon: CarFront,
  },
  {
    id: "comfort_premium",
    title: "Comfort / Premium",
    description: "More space, smoother ride.",
    helper: "Comfort, SUV, premium car.",
    icon: Briefcase,
  },
];

const genderModeOptions: Array<{ id: GenderMode; label: string }> = [
  { id: "women_only", label: "Women-only" },
  { id: "mixed", label: "Mixed pod" },
];

const accessModeOptions: Array<{ id: AccessMode; label: string }> = [
  { id: "open", label: "Open" },
  { id: "verified_only", label: "Verified-only" },
  { id: "community_only", label: "Community-only" },
  { id: "high_trust_only", label: "High-trust-only" },
  { id: "invite_only", label: "Invite-only" },
];

function formatCalendarLabel(label: string) {
  return label.replace(/^([A-Za-z]{3}) /, "$1, ");
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayIsoDate() {
  return toLocalIsoDate(new Date());
}

function parseIsoDateToLocalDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatCalendarDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date).replace(",", "");
}

function formatCalendarMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildCalendarDays(selectedDate: string): { monthLabel: string; days: CalendarDay[] } {
  const todayIso = getTodayIsoDate();
  const selected = parseIsoDateToLocalDate(selectedDate < todayIso ? todayIso : selectedDate);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isoDate = toLocalIsoDate(date);

    return {
      label: formatCalendarDayLabel(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isoDate,
      disabled: isoDate < todayIso,
    };
  });

  return { monthLabel: formatCalendarMonthLabel(firstOfMonth), days };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "HKD",
  }).format(value);
}

function dollarsToCents(value: number) {
  return Math.round(Math.max(0, Number.isFinite(value) ? value : 0) * 100);
}

function formatCents(value: number) {
  const dollars = value / 100;
  const hasCents = value % 100 !== 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(dollars);
}

function formatCentsFixed(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function centsToDollars(value: number) {
  return Math.round(Math.max(0, value)) / 100;
}

function formatEstimateSource(source: EstimateSource) {
  return source
    .toLowerCase()
    .split("_")
    .map((part) => (part === "hk" ? "HK" : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

function formatRouteRiskLevel(level: RouteRiskLevel) {
  return level
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function parseFlexibilityMinutes(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : 15;
}

function displayTimeToLocalTime(value: string) {
  const parsed = parseDisplayTime(value);
  const hour12 = Number(parsed.hour);
  const hour24 =
    parsed.period === "PM"
      ? hour12 === 12
        ? 12
        : hour12 + 12
      : hour12 === 12
        ? 0
        : hour12;

  return `${String(hour24).padStart(2, "0")}:${parsed.minute}`;
}

function formatLocalTimeLabel(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value || "Add time";

  const hour24 = Number(match[1]);
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "PM" : "AM";

  return `${hour12}:${match[2]} ${period}`;
}

function localTimeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

function sortedWeekdays(weekdays: Weekday[]) {
  return [...new Set(weekdays)].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

function getWeekdayLabel(weekday: Weekday) {
  return recurringWeekdayOptions.find((option) => option.id === weekday)?.label ?? weekday;
}

function getBaseRouteLabel(value: string, fallback: string) {
  return routePointSummary(value, fallback);
}

function defaultLegForDay({
  dayOfWeek,
  legType,
  pickupAddress,
  dropoffAddress,
  existing,
}: {
  dayOfWeek: Weekday;
  legType: RecurringScheduleLeg["legType"];
  pickupAddress: string;
  dropoffAddress: string;
  existing?: RecurringScheduleLeg;
}): RecurringScheduleLeg {
  const baseOrigin = getBaseRouteLabel(pickupAddress, "Home");
  const baseDestination = getBaseRouteLabel(dropoffAddress, "Office");
  const isReturn = legType === "RETURN";

  return {
    dayOfWeek,
    legType,
    departureTime: existing?.departureTime ?? (isReturn ? "18:00" : "08:00"),
    originLabel: existing?.originLabel || (isReturn ? baseDestination : baseOrigin),
    destinationLabel: existing?.destinationLabel || (isReturn ? baseOrigin : baseDestination),
  };
}

function getRecurringLegsForSelection({
  dateTime,
  pickupAddress,
  dropoffAddress,
}: {
  dateTime: DateTimeState;
  pickupAddress: string;
  dropoffAddress: string;
}) {
  const weekdays = sortedWeekdays(dateTime.recurringWeekdays);
  const legs: RecurringScheduleLeg[] = [];

  weekdays.forEach((dayOfWeek) => {
    const outbound = dateTime.recurringLegs.find(
      (leg) => leg.dayOfWeek === dayOfWeek && leg.legType === "OUTBOUND",
    );
    legs.push(
      defaultLegForDay({
        dayOfWeek,
        legType: "OUTBOUND",
        pickupAddress,
        dropoffAddress,
        existing: outbound,
      }),
    );

    if (dateTime.recurringPattern === "BACK_AND_FORTH") {
      const returnLeg = dateTime.recurringLegs.find(
        (leg) => leg.dayOfWeek === dayOfWeek && leg.legType === "RETURN",
      );
      legs.push(
        defaultLegForDay({
          dayOfWeek,
          legType: "RETURN",
          pickupAddress,
          dropoffAddress,
          existing: returnLeg,
        }),
      );
    }
  });

  return legs;
}

function validateRecurringSchedule(dateTime: DateTimeState, pickupAddress: string, dropoffAddress: string) {
  if (dateTime.recurringWeekdays.length === 0) return "Select at least one repeat day.";

  const legs = getRecurringLegsForSelection({ dateTime, pickupAddress, dropoffAddress });
  const seen = new Set<string>();

  for (const weekday of sortedWeekdays(dateTime.recurringWeekdays)) {
    const outbound = legs.find((leg) => leg.dayOfWeek === weekday && leg.legType === "OUTBOUND");
    const returnLeg = legs.find((leg) => leg.dayOfWeek === weekday && leg.legType === "RETURN");

    if (!outbound?.departureTime) return "Add an outbound time.";
    if (!outbound.originLabel.trim() || !outbound.destinationLabel.trim()) return "Route is required.";

    if (dateTime.recurringPattern === "BACK_AND_FORTH") {
      if (!returnLeg?.departureTime) return "Add a return time.";
      if (!returnLeg.originLabel.trim() || !returnLeg.destinationLabel.trim()) return "Route is required.";

      const outboundMinutes = localTimeToMinutes(outbound.departureTime);
      const returnMinutes = localTimeToMinutes(returnLeg.departureTime);
      if (outboundMinutes !== null && returnMinutes !== null && returnMinutes <= outboundMinutes) {
        return "Return time should be after outbound time.";
      }
    }
  }

  for (const leg of legs) {
    const key = `${leg.dayOfWeek}-${leg.departureTime}`;
    if (seen.has(key)) return "Return time should be after outbound time.";
    seen.add(key);
  }

  return null;
}

function formatDateForPreview(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function getRecurringDateSummary(dateTime: DateTimeState) {
  const weekdays = dateTime.recurringWeekdays
    .map((weekday) => recurringWeekdayOptions.find((option) => option.id === weekday)?.label ?? weekday)
    .join(", ");

  return `Weekly ${weekdays || "days"} from ${formatDateForPreview(dateTime.recurringStartDate)}`;
}

function getScheduleDateSummary(dateTime: DateTimeState) {
  return dateTime.scheduleType === "RECURRING" ? getRecurringDateSummary(dateTime) : dateTime.date;
}

function getScheduleTypeLabel(dateTime: DateTimeState) {
  return dateTime.scheduleType === "RECURRING" ? "Recurring pod" : "Scheduled pod";
}

function getPodTypeTitle(podType: PodType) {
  return podType === "recurring" ? "Recurring pod" : "Scheduled one-time trip";
}

function ScheduleTypeEyebrow({ podType }: { podType: PodType }) {
  return (
    <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
      {getPodTypeTitle(podType)}
    </p>
  );
}

function routeCode(address: string, fallback: string) {
  const upperAddress = address.toUpperCase();

  if (upperAddress.includes("USC")) return "USC";
  if (upperAddress.includes("LAX")) return "LAX";

  return fallback;
}

function CreatePodStepper({ currentStep }: { currentStep: number }) {
  const progressWidth = `${(currentStep / (steps.length - 1)) * 84}%`;

  return (
    <nav aria-label="Create pod progress" className="mt-8 px-2">
      <ol className="relative grid grid-cols-6 items-center">
        <div
          aria-hidden="true"
          className="absolute left-[8%] right-[8%] top-1/2 h-px -translate-y-1/2 bg-[var(--rp-border)]"
        />
        <div
          aria-hidden="true"
          className="absolute left-[8%] top-1/2 h-px -translate-y-1/2 bg-[var(--rp-primary)] transition-all"
          style={{ width: progressWidth }}
        />
        {steps.map((step, index) => {
          const active = index === currentStep;
          const completed = index < currentStep;

          return (
            <li key={step} className="relative grid place-items-center">
              <div
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative z-10 grid h-8 w-8 place-items-center rounded-full border text-sm font-black",
                  active
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)] shadow-[0_0_18px_color-mix(in_srgb,var(--rp-primary)_42%,transparent)]"
                    : completed
                      ? "border-[var(--rp-primary)] bg-[var(--rp-card)] text-[var(--rp-primary)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted)]",
                )}
                title={step}
              >
                {completed ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CreatePodTopBar({
  currentStep,
  onBack,
}: {
  currentStep: CreateStep;
  onBack?: () => void;
}) {
  return (
    <header className="px-6 pt-5">
      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
        {onBack ? (
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="grid h-11 w-11 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        ) : (
          <span />
        )}
        <span />
        <span />
      </div>
      <CreatePodStepper currentStep={currentStep} />
    </header>
  );
}

function TypeIcon({ type }: { type: "calendar" | "repeat" }) {
  if (type === "calendar") {
    return (
      <div className="relative h-14 w-14 shrink-0 text-[var(--rp-primary)]">
        <div className="absolute left-2 top-3 h-10 w-10 rounded-[7px] border-[3px] border-current" />
        <div className="absolute left-2 top-[24px] h-[3px] w-10 bg-current" />
        <div className="absolute left-[18px] top-1 h-4 w-[3px] rounded-full bg-current" />
        <div className="absolute left-[34px] top-1 h-4 w-[3px] rounded-full bg-current" />
        <span className="absolute left-2 top-[25px] grid h-7 w-10 place-items-center text-[19px] font-black leading-none">
          17
        </span>
      </div>
    );
  }

  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[var(--rp-primary)]">
      <RefreshCcw className="h-11 w-11 stroke-[1.9]" />
    </div>
  );
}

function PodTypeCard({
  item,
  selected,
  onSelect,
}: {
  item: (typeof podTypes)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-4 rounded-[20px] border bg-[var(--rp-card)] p-4 text-left shadow-[var(--rp-shadow-soft)] transition",
        "focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--rp-focus)]",
        selected
          ? "border-[var(--rp-primary)] ring-1 ring-[var(--rp-primary)]"
          : "border-[var(--rp-border)] hover:border-[var(--rp-border-strong)]",
      )}
    >
      <TypeIcon type={item.icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-[var(--rp-text)]">{item.title}</span>
        {item.sublabel ? (
          <span
            className={cn(
              "mt-1 block text-sm font-bold",
              selected ? "text-[var(--rp-primary)]" : "text-[var(--rp-muted)]",
            )}
          >
            {item.sublabel}
          </span>
        ) : null}
        {item.description ? (
          <span className="mt-2 block text-sm leading-5 text-[var(--rp-muted)]">
            {item.description}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition",
          selected
            ? "border-[var(--rp-primary)] bg-transparent"
            : "border-[var(--rp-muted)] bg-transparent",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "h-4 w-4 rounded-full transition",
            selected ? "bg-[var(--rp-primary)]" : "bg-transparent",
          )}
        />
      </span>
    </button>
  );
}

function ThemeAwareHeroStrip() {
  return (
    <div
      aria-hidden="true"
      className="relative min-h-[430px] w-full shrink-0 overflow-hidden border-r border-[var(--rp-border)]"
    >
      <Image
        src="/ridepod/create-pod-dark-background.png"
        alt=""
        fill
        sizes="(max-width: 768px) 52vw, 360px"
        quality={100}
        priority
        className="ridepod-theme-image-dark object-cover object-[52%_center]"
      />
      <Image
        src="/ridepod/light-mode-background.png"
        alt=""
        fill
        sizes="(max-width: 768px) 52vw, 360px"
        quality={100}
        priority
        className="ridepod-theme-image-light object-cover object-[66%_center]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--rp-bg)_24%,transparent)_100%)]" />
    </div>
  );
}

function routePointSummary(value: string, fallback: string) {
  const clean = value.trim();
  if (!clean) return fallback;

  return clean.split(",")[0]?.trim() || fallback;
}

function RouteJourneyPreview({
  pickupAddress,
  dropoffAddress,
  stops,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  stops: RouteStop[];
}) {
  const points = [
    {
      id: "pickup",
      label: "Pickup",
      value: routePointSummary(pickupAddress, "Pickup location"),
      type: "pickup",
    },
    ...stops.map((stop, index) => ({
      id: `stop-${stop.id}`,
      label: `Stop ${index + 1}`,
      value: routePointSummary(stop.address, "Optional stop"),
      type: "stop" as const,
    })),
    {
      id: "dropoff",
      label: stops.length > 0 ? "Final dropoff" : "Dropoff",
      value: routePointSummary(dropoffAddress, "Destination"),
      type: "dropoff",
    },
  ];
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(15,27,39,0.88)] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
      <div className="relative h-[260px] overflow-hidden rounded-[22px] border border-white/10 bg-[#06111d]">
        <Image
          src="/images/ridepod/route-map-dark.png"
          alt="Route map preview"
          fill
          priority
          quality={100}
          sizes="(max-width: 430px) calc(100vw - 72px), 382px"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,9,18,0.04),rgba(2,9,18,0.18))]" />
      </div>

      <div className="mt-3 grid gap-2">
        {points.map((point) => (
          <div
            key={point.id}
            className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1724]/90 px-3 py-2"
          >
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f6c453]">
              {point.label}
            </span>
            <span className="min-w-0 truncate text-right text-sm font-black text-[#f8fafc]">
              {point.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddressField({
  label,
  type,
  value,
  placeholder,
  onChange,
  onRemove,
}: {
  label: string;
  type: "pickup" | "stop" | "dropoff";
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
}) {
  const fieldId = useId();
  const iconLabel = type === "dropoff" ? "Destination" : type === "pickup" ? "Pickup" : "Stop";

  return (
    <div
      className={cn(
        "grid min-h-[94px] w-full grid-cols-[48px_1fr] items-center gap-3 rounded-[18px] border border-white/10 bg-[rgba(15,27,39,0.88)] px-4 py-3 text-left shadow-[0_14px_34px_rgba(0,0,0,0.24)] transition focus-within:border-[#f6c453] focus-within:shadow-[0_0_0_1px_rgba(246,196,83,0.45),0_18px_40px_rgba(0,0,0,0.28)]",
        onRemove ? "pr-3" : "",
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#1b2936] text-[#ffc94d]">
        <span className="sr-only">{iconLabel}</span>
        <MapPin className="h-6 w-6 fill-[#ffc94d]/10 stroke-[2.3]" />
      </span>
      <span className="min-w-0">
        <label
          htmlFor={fieldId}
          className="block text-xs font-black uppercase tracking-[0.12em] text-[#f6c453]"
        >
          {label}
        </label>
        <span className="mt-2 flex items-center gap-2">
          <input
            id={fieldId}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            autoComplete="street-address"
            className="min-h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-semibold leading-5 text-[#f8fafc] outline-none placeholder:text-slate-500"
          />
          {onRemove ? (
            <button
              type="button"
              aria-label={`Remove ${label.toLowerCase()}`}
              onClick={onRemove}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-[#1b2936] hover:text-[#f8fafc]"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          ) : null}
        </span>
      </span>
    </div>
  );
}

function AddStopButton({ onAddStop }: { onAddStop: () => void }) {
  return (
    <button
      type="button"
      onClick={onAddStop}
      className="flex min-h-[76px] w-full items-center justify-center gap-4 rounded-[18px] border border-dashed border-[#f6c453] bg-[#06111d] px-4 text-base font-black text-[#f6c453] shadow-[0_14px_34px_rgba(0,0,0,0.22)] transition hover:bg-[#0b1724]"
    >
      <Plus className="h-7 w-7 text-[#f6c453]" />
      Add stop
    </button>
  );
}

function PrimaryButton({
  children = "Continue",
  onClick,
  disabled = false,
}: {
  children?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "var(--rp-gradient-primary)",
        color: "var(--rp-primary-text)",
      }}
      className="relative z-20 flex h-14 w-full items-center justify-center rounded-[12px] border border-[var(--rp-border-strong)] text-base font-black shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_34%,transparent)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
    >
      {children}
    </button>
  );
}

function RouteContinueButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative z-20 flex h-14 w-full items-center justify-center rounded-[18px] border border-[#ffd56a]/55 bg-[linear-gradient(180deg,#ffe082_0%,#f6c453_54%,#d99a24_100%)] text-base font-black text-[#071326] shadow-[0_20px_42px_rgba(246,196,83,0.32)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
    >
      Continue
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-3 rounded-[12px] border border-[var(--rp-primary)] bg-transparent text-base font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
    >
      {children}
    </button>
  );
}

function RouteStopsStep({
  podType,
  pickupAddress,
  dropoffAddress,
  stops,
  onBack,
  onPickupChange,
  onDropoffChange,
  onAddStop,
  onStopChange,
  onRemoveStop,
  onContinue,
}: {
  podType: PodType;
  pickupAddress: string;
  dropoffAddress: string;
  stops: RouteStop[];
  onBack: () => void;
  onPickupChange: (value: string) => void;
  onDropoffChange: (value: string) => void;
  onAddStop: () => void;
  onStopChange: (id: number, value: string) => void;
  onRemoveStop: (id: number) => void;
  onContinue: () => void;
}) {
  const canContinue = pickupAddress.trim().length > 0 && dropoffAddress.trim().length > 0;

  return (
    <>
      <CreatePodTopBar currentStep={1} onBack={onBack} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#020912] px-6 pb-40 pt-8 text-[#f8fafc] md:pb-5">
        <section className="text-center">
          <ScheduleTypeEyebrow podType={podType} />
          <h1 className="text-[34px] font-black leading-tight tracking-[-0.03em] text-[#f8fafc]">
            Route &amp; stops
          </h1>
          <p className="mt-3 text-lg font-medium text-[#cbd5e1]">
            Add your pickup and dropoff.
          </p>
        </section>

        <section className="mt-8 grid gap-5">
          <RouteJourneyPreview
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
            stops={stops}
          />

          <div className="grid gap-4">
            <AddressField
              label="Pickup"
              type="pickup"
              value={pickupAddress}
              placeholder="Enter pickup address"
              onChange={onPickupChange}
            />
            {stops.map((stop, index) => (
              <AddressField
                key={stop.id}
                label={`Stop ${index + 1}`}
                type="stop"
                value={stop.address}
                placeholder="Enter stop address"
                onChange={(value) => onStopChange(stop.id, value)}
                onRemove={() => onRemoveStop(stop.id)}
              />
            ))}
            <AddressField
              label="Dropoff"
              type="dropoff"
              value={dropoffAddress}
              placeholder="Enter dropoff address"
              onChange={onDropoffChange}
            />
          </div>
        </section>

        <div className="mt-8">
          <AddStopButton onAddStop={onAddStop} />
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-[88px] z-50 mx-auto max-w-[430px] px-6 pb-4 pt-8 md:static md:mx-0 md:max-w-none md:px-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-0">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-28 bg-[linear-gradient(180deg,transparent,#020912_42%)] md:hidden" />
        <RouteContinueButton onClick={onContinue} disabled={!canContinue} />
      </footer>
    </>
  );
}

function CalendarPicker({
  selectedDate,
  selectedDay,
  onSelectDay,
}: {
  selectedDate: string;
  selectedDay: number;
  onSelectDay: (day: number, label: string, isoDate: string) => void;
}) {
  const calendar = buildCalendarDays(selectedDate);

  return (
    <section aria-label="Calendar picker" className="mt-9">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[22px] font-black leading-none text-[var(--rp-text)]">
          {calendar.monthLabel}
        </h2>
        <div className="flex items-center gap-2 text-[var(--rp-primary)]">
          <button
            type="button"
            aria-label="Previous month"
            className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--rp-card-muted)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--rp-card-muted)]"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-2 py-3 shadow-[var(--rp-shadow-soft)]">
        <div className="grid grid-cols-7 gap-y-3 text-center text-sm font-black text-[var(--rp-muted)]">
          {weekdayLabels.map((weekday) => (
            <div key={weekday} className="py-1">
              {weekday}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-y-2 text-center">
          {calendar.days.map((date, index) => {
            const selected = date.inMonth && date.isoDate === selectedDate && date.day === selectedDay;
            const label = selected ? `${date.label}, selected` : date.label;

            return (
              <button
                key={`${date.isoDate}-${index}`}
                type="button"
                aria-label={label}
                aria-current={selected ? "date" : undefined}
                onClick={() => date.inMonth && !date.disabled && onSelectDay(date.day, date.label, date.isoDate)}
                disabled={!date.inMonth || date.disabled}
                className={cn(
                  "mx-auto grid h-10 w-10 place-items-center rounded-full text-base font-bold transition",
                  selected
                    ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)] ring-2 ring-[var(--rp-focus)]"
                    : date.inMonth && !date.disabled
                      ? "text-[var(--rp-text)] hover:bg-[var(--rp-card-muted)]"
                      : "cursor-not-allowed text-[var(--rp-muted)] opacity-35",
                )}
              >
                <span>{date.day}</span>
                {selected ? <span className="sr-only"> selected</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedTime = parseDisplayTime(value);
  const updateTime = (part: Partial<typeof selectedTime>) => {
    const nextTime = { ...selectedTime, ...part };
    onChange(`${nextTime.hour}:${nextTime.minute} ${nextTime.period}`);
  };

  return (
    <fieldset>
      <legend className="text-base font-bold text-[var(--rp-muted-strong)]">Time</legend>
      <div className="mt-3 grid h-16 grid-cols-[1fr_1fr_1fr_54px] items-center overflow-hidden rounded-[12px] border border-[var(--rp-primary)] bg-[var(--rp-input-bg)] shadow-[var(--rp-shadow-soft)]">
        <select
          aria-label="Hour"
          value={selectedTime.hour}
          onChange={(event) => updateTime({ hour: event.target.value })}
          className="h-full min-w-0 appearance-none border-0 bg-transparent px-4 text-center text-lg font-black text-[var(--rp-text)] outline-none"
        >
          {timeHours.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <select
          aria-label="Minute"
          value={selectedTime.minute}
          onChange={(event) => updateTime({ minute: event.target.value })}
          className="h-full min-w-0 appearance-none border-0 border-l border-[var(--rp-input-border)] bg-transparent px-3 text-center text-lg font-black text-[var(--rp-text)] outline-none"
        >
          {timeMinutes.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>
        <select
          aria-label="AM or PM"
          value={selectedTime.period}
          onChange={(event) => updateTime({ period: event.target.value as "AM" | "PM" })}
          className="h-full min-w-0 appearance-none border-0 border-l border-[var(--rp-input-border)] bg-transparent px-3 text-center text-lg font-black text-[var(--rp-text)] outline-none"
        >
          {timePeriods.map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
        </select>
        <span className="grid h-full place-items-center border-l border-[var(--rp-input-border)] text-[var(--rp-primary)]">
          <Clock3 className="h-6 w-6" />
        </span>
      </div>
    </fieldset>
  );
}

function parseDisplayTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const hour = match?.[1] ? match[1].padStart(2, "0") : "08";
  const minute = match?.[2] && timeMinutes.includes(match[2]) ? match[2] : "30";
  const period = match?.[3]?.toUpperCase() === "PM" ? "PM" : "AM";

  return { hour, minute, period };
}

function FlexibilityField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-base font-bold text-[var(--rp-muted-strong)]">Flexibility</span>
      <span className="mt-3 grid h-16 grid-cols-[1fr_66px] items-center rounded-[12px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] shadow-[var(--rp-shadow-soft)] focus-within:border-[var(--rp-primary)]">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 appearance-none rounded-l-[12px] border-0 bg-transparent px-5 text-lg font-black text-[var(--rp-text)] outline-none"
        >
          <option value={"\u00b1 5 min"}>&plusmn; 5 min</option>
          <option value={"\u00b1 10 min"}>&plusmn; 10 min</option>
          <option value={"\u00b1 15 min"}>&plusmn; 15 min</option>
          <option value={"\u00b1 30 min"}>&plusmn; 30 min</option>
        </select>
        <span className="grid h-full place-items-center border-l border-[var(--rp-input-border)] text-[var(--rp-primary)]">
          <ChevronDown className="h-6 w-6" />
        </span>
      </span>
    </label>
  );
}

function buildPreviewTemplate({
  dateTime,
  pickupAddress,
  dropoffAddress,
}: {
  dateTime: DateTimeState;
  pickupAddress: string;
  dropoffAddress: string;
}): RecurringPodTemplate {
  const now = new Date(0).toISOString();
  const recurringLegs = getRecurringLegsForSelection({ dateTime, pickupAddress, dropoffAddress });

  return {
    id: "create-preview-template",
    hostUserId: "current-user",
    originGeneral: getBaseRouteLabel(pickupAddress, "Home"),
    destinationGeneral: getBaseRouteLabel(dropoffAddress, "Office"),
    genderMode: "MIXED",
    accessMode: "VERIFIED_ONLY",
    targetSeats: 4,
    minSeatsToBook: 3,
    estimatedTotalFareCents: 8400,
    approvedMaxTotalFareCents: 9600,
    ridepodFeeCents: 200,
    recurrenceFrequency: "WEEKLY",
    recurringPattern: dateTime.recurringPattern,
    weekdays: dateTime.recurringWeekdays,
    departureTimeLocal: recurringLegs[0]?.departureTime ?? displayTimeToLocalTime(dateTime.time),
    recurringLegs,
    startDate: dateTime.recurringStartDate,
    endDate: dateTime.recurringEndMode === "on_date" ? dateTime.recurringEndDate : null,
    occurrenceLimit:
      dateTime.recurringEndMode === "after" ? Math.max(1, dateTime.recurringOccurrenceLimit) : null,
    flexibilityMinutes: parseFlexibilityMinutes(dateTime.flexibility),
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

function RecurringProtectionDialog({
  dateTime,
  pickupAddress,
  dropoffAddress,
  open,
  accepted,
  onAcceptedChange,
  onClose,
  onConfirm,
}: {
  dateTime: DateTimeState;
  pickupAddress: string;
  dropoffAddress: string;
  open: boolean;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const template = buildPreviewTemplate({ dateTime, pickupAddress, dropoffAddress });
  const occurrences = generateRecurringOccurrences(template, {
    defaultOccurrenceLimit: 8,
    generatedAt: new Date(0).toISOString(),
  });
  const preview = occurrences.slice(0, 3);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.66)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm md:absolute md:inset-0 md:px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-protection-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[390px] flex-col overflow-hidden rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
              <RefreshCcw className="h-6 w-6" />
            </span>
            <div>
              <h2 id="recurring-protection-title" className="text-lg font-black text-[var(--rp-text)]">
                Recurring protection
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Recurring pods create separate protected rides for each date. Each ride has its own payment lock, quote, receipt, and settlement.
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                You will authorize payment per ride, not for the entire recurring schedule.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
              Next rides
            </p>
            {preview.length > 0 ? (
              <p className="mt-2 text-sm font-black leading-6 text-[var(--rp-text)]">
                {preview.map((occurrence) => formatDateForPreview(occurrence.occurrenceDate)).join(", ")}
              </p>
            ) : (
              <p className="mt-2 text-sm font-bold text-[var(--rp-muted)]">
                Pick at least one weekday to preview rides.
              </p>
            )}
            <p className="mt-2 break-words text-xs font-semibold text-[var(--rp-muted)]">
              {createRecurringTemplateRRule(template)}
            </p>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => onAcceptedChange(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
            />
            <span className="text-sm font-bold leading-6 text-[var(--rp-text)]">
              I understand each recurring ride has its own payment lock, quote, receipt, and settlement.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_94%,black)] p-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!accepted}
            onClick={onConfirm}
            className="min-h-12 rounded-2xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_30%,transparent)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function RecurringScheduleFields({
  dateTime,
  onDateTimeChange,
  pickupAddress,
  dropoffAddress,
}: {
  dateTime: DateTimeState;
  onDateTimeChange: (dateTime: DateTimeState) => void;
  pickupAddress: string;
  dropoffAddress: string;
}) {
  const visibleLegs = getRecurringLegsForSelection({ dateTime, pickupAddress, dropoffAddress });
  const selectedWeekdays = sortedWeekdays(dateTime.recurringWeekdays);
  const validationError = validateRecurringSchedule(dateTime, pickupAddress, dropoffAddress);
  const syncLegs = (nextDateTime: DateTimeState) =>
    getRecurringLegsForSelection({ dateTime: nextDateTime, pickupAddress, dropoffAddress });

  const toggleWeekday = (weekday: Weekday) => {
    const selected = dateTime.recurringWeekdays.includes(weekday);
    const nextWeekdays = selected
      ? dateTime.recurringWeekdays.filter((current) => current !== weekday)
      : [...dateTime.recurringWeekdays, weekday].sort(
          (a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b),
        );
    const nextDateTime = { ...dateTime, recurringWeekdays: nextWeekdays };

    onDateTimeChange({ ...nextDateTime, recurringLegs: syncLegs(nextDateTime) });
  };

  const updatePattern = (recurringPattern: RecurringPattern) => {
    const nextDateTime = { ...dateTime, recurringPattern };
    onDateTimeChange({ ...nextDateTime, recurringLegs: syncLegs(nextDateTime) });
  };

  const updateLeg = (
    dayOfWeek: Weekday,
    legType: RecurringScheduleLeg["legType"],
    patch: Partial<RecurringScheduleLeg>,
  ) => {
    const nextLegs = visibleLegs.map((leg) =>
      leg.dayOfWeek === dayOfWeek && leg.legType === legType ? { ...leg, ...patch } : leg,
    );

    onDateTimeChange({ ...dateTime, recurringLegs: nextLegs });
  };

  return (
    <section className="mt-7 grid gap-6 border-t border-[var(--rp-border)] pt-7">
      <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
          Repeats
        </p>
        <p className="mt-1 text-lg font-black text-[var(--rp-text)]">Weekly</p>
      </div>

      <fieldset>
        <legend className="text-base font-bold text-[var(--rp-muted-strong)]">Repeat on</legend>
        <div className="mt-3 grid grid-cols-4 gap-2 min-[390px]:grid-cols-7">
          {recurringWeekdayOptions.map((option) => {
            const selected = dateTime.recurringWeekdays.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleWeekday(option.id)}
                aria-pressed={selected}
                className={cn(
                  "h-11 rounded-xl border text-sm font-black transition",
                  selected
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)]",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <section aria-label="Trip pattern">
        <h2 className="text-base font-bold text-[var(--rp-muted-strong)]">Trip pattern</h2>
        <div className="mt-3 grid gap-3 min-[390px]:grid-cols-2">
          {[
            {
              id: "ONE_WAY" as const,
              title: "One-way",
              body: "Same direction each selected day.",
            },
            {
              id: "BACK_AND_FORTH" as const,
              title: "Back-and-forth",
              body: "Outbound and return rides on selected days.",
            },
          ].map((option) => {
            const selected = dateTime.recurringPattern === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updatePattern(option.id)}
                aria-pressed={selected}
                className={cn(
                  "rounded-[18px] border p-4 text-left transition",
                  selected
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)] shadow-[0_12px_26px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] hover:bg-[var(--rp-card-muted)]",
                )}
              >
                <span className="block text-base font-black">{option.title}</span>
                <span className="mt-2 block text-xs font-bold leading-5 opacity-80">{option.body}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[var(--rp-muted-strong)]">
            {dateTime.recurringPattern === "BACK_AND_FORTH"
              ? "Back-and-forth schedule"
              : "One-way weekly rides"}
          </h2>
          {dateTime.recurringPattern === "ONE_WAY" ? (
            <button
              type="button"
              onClick={() => updatePattern("BACK_AND_FORTH")}
              className="text-xs font-black text-[var(--rp-primary)]"
            >
              Add return ride
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updatePattern("ONE_WAY")}
              className="text-xs font-black text-[var(--rp-primary)]"
            >
              Remove return ride
            </button>
          )}
        </div>

        {selectedWeekdays.length === 0 ? (
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-sm font-bold text-[var(--rp-muted)]">
            Select at least one repeat day.
          </div>
        ) : (
          selectedWeekdays.map((weekday) => {
            const outbound = visibleLegs.find(
              (leg) => leg.dayOfWeek === weekday && leg.legType === "OUTBOUND",
            );
            const returnLeg = visibleLegs.find(
              (leg) => leg.dayOfWeek === weekday && leg.legType === "RETURN",
            );

            if (!outbound) return null;

            return (
              <div
                key={weekday}
                className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
                      {getWeekdayLabel(weekday)}
                    </p>
                    <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
                      {getWeekdayLabel(weekday)} {formatLocalTimeLabel(outbound.departureTime)} -{" "}
                      {outbound.originLabel} to {outbound.destinationLabel}
                    </p>
                  </div>
                  {dateTime.recurringPattern === "BACK_AND_FORTH" ? (
                    <span className="rounded-full bg-[var(--rp-card-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--rp-primary)]">
                      Same route reversed
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3">
                  <RecurringLegEditor
                    title="Outbound ride"
                    leg={outbound}
                    onChange={(patch) => updateLeg(weekday, "OUTBOUND", patch)}
                  />
                  {dateTime.recurringPattern === "BACK_AND_FORTH" && returnLeg ? (
                    <RecurringLegEditor
                      title="Return ride"
                      leg={returnLeg}
                      onChange={(patch) => updateLeg(weekday, "RETURN", patch)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </section>

      <label className="grid gap-3 text-base font-bold text-[var(--rp-muted-strong)]">
        Start date
        <input
          type="date"
          min={getTodayIsoDate()}
          value={dateTime.recurringStartDate}
          onChange={(event) => onDateTimeChange({ ...dateTime, recurringStartDate: event.target.value })}
          className="h-14 rounded-[12px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-base font-black text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
        />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-base font-bold text-[var(--rp-muted-strong)]">End</legend>
        <div className="grid gap-2">
          {[
            { id: "after", label: "After N rides" },
            { id: "on_date", label: "On date" },
            { id: "none", label: "No end date" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onDateTimeChange({
                  ...dateTime,
                  recurringEndMode: option.id as DateTimeState["recurringEndMode"],
                })
              }
              className={cn(
                "flex min-h-12 items-center justify-between rounded-xl border px-4 text-sm font-black",
                dateTime.recurringEndMode === option.id
                  ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
              )}
            >
              {option.label}
              {dateTime.recurringEndMode === option.id ? <Check className="h-4 w-4" /> : null}
            </button>
          ))}
        </div>

        {dateTime.recurringEndMode === "after" ? (
          <label className="grid gap-2 text-sm font-black text-[var(--rp-text)]">
            Number of rides
            <input
              type="number"
              min={1}
              max={12}
              value={dateTime.recurringOccurrenceLimit}
              onChange={(event) =>
                onDateTimeChange({
                  ...dateTime,
                  recurringOccurrenceLimit: Number(event.target.value),
                })
              }
              className="h-12 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-base font-black text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
            />
          </label>
        ) : null}

        {dateTime.recurringEndMode === "on_date" ? (
          <label className="grid gap-2 text-sm font-black text-[var(--rp-text)]">
            End date
            <input
              type="date"
              min={dateTime.recurringStartDate || getTodayIsoDate()}
              value={dateTime.recurringEndDate}
              onChange={(event) => onDateTimeChange({ ...dateTime, recurringEndDate: event.target.value })}
              className="h-12 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-base font-black text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
            />
          </label>
        ) : null}
      </fieldset>

      <FlexibilityField
        value={dateTime.flexibility}
        onChange={(flexibility) => onDateTimeChange({ ...dateTime, flexibility })}
      />

      {validationError ? (
        <p className="rounded-2xl border border-[var(--rp-danger)] bg-[var(--rp-danger-bg)] p-3 text-sm font-black text-[var(--rp-danger)]">
          {validationError}
        </p>
      ) : null}
    </section>
  );
}

function RecurringLegEditor({
  title,
  leg,
  onChange,
}: {
  title: string;
  leg: RecurringScheduleLeg;
  onChange: (patch: Partial<RecurringScheduleLeg>) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[var(--rp-text)]">{title}</p>
        <span className="text-xs font-black text-[var(--rp-primary)]">
          {formatLocalTimeLabel(leg.departureTime)}
        </span>
      </div>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">
          Departure time
          <input
            type="time"
            value={leg.departureTime}
            onChange={(event) => onChange({ departureTime: event.target.value })}
            className="h-11 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-black text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
          />
        </label>
        <div className="grid gap-3 min-[390px]:grid-cols-2">
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">
            From
            <input
              type="text"
              value={leg.originLabel}
              onChange={(event) => onChange({ originLabel: event.target.value })}
              className="h-11 min-w-0 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-black text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
            />
          </label>
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">
            To
            <input
              type="text"
              value={leg.destinationLabel}
              onChange={(event) => onChange({ destinationLabel: event.target.value })}
              className="h-11 min-w-0 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-black text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function DateTimeStep({
  podType,
  pickupAddress,
  dropoffAddress,
  dateTime,
  onDateTimeChange,
  onBack,
  onContinue,
}: {
  podType: PodType;
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  onDateTimeChange: (dateTime: DateTimeState) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [showRecurringProtectionDialog, setShowRecurringProtectionDialog] = useState(false);
  const [recurringProtectionAccepted, setRecurringProtectionAccepted] = useState(false);
  const activeScheduleType: ScheduleType = podType === "recurring" ? "RECURRING" : "ONE_TIME";
  const recurringValidationError =
    activeScheduleType === "RECURRING"
      ? validateRecurringSchedule(dateTime, pickupAddress, dropoffAddress)
      : null;
  const canContinue =
    activeScheduleType === "ONE_TIME"
      ? dateTime.selectedDate.length > 0 && dateTime.time.length > 0
      : !recurringValidationError &&
        (dateTime.recurringEndMode !== "after" || dateTime.recurringOccurrenceLimit > 0);
  const handleContinue = () => {
    if (activeScheduleType === "RECURRING" && !recurringProtectionAccepted) {
      setShowRecurringProtectionDialog(true);
      return;
    }

    onContinue();
  };

  return (
    <>
      <CreatePodTopBar currentStep={2} onBack={onBack} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-40 pt-8 md:pb-5">
        <section className="text-center">
          <ScheduleTypeEyebrow podType={podType} />
          <h1 className="text-[28px] font-black leading-tight text-[var(--rp-text)]">
            {activeScheduleType === "RECURRING"
              ? "When does this pod repeat?"
              : "When are you leaving?"}
          </h1>
          <p className="mt-3 text-base font-medium text-[var(--rp-muted)]">
            {activeScheduleType === "RECURRING"
              ? "Create a weekly ride template for your recurring route."
              : "Select your date and departure time."}
          </p>
        </section>

        {activeScheduleType === "ONE_TIME" ? (
          <>
            <CalendarPicker
              selectedDate={dateTime.selectedDate}
              selectedDay={dateTime.selectedDay}
              onSelectDay={(day, label, isoDate) =>
                onDateTimeChange({
                  ...dateTime,
                  selectedDay: day,
                  selectedDate: isoDate,
                  date: formatCalendarLabel(label),
                })
              }
            />

            <section className="mt-7 grid gap-6 border-t border-[var(--rp-border)] pt-7">
              <TimeField
                value={dateTime.time}
                onChange={(time) => onDateTimeChange({ ...dateTime, time })}
              />
              <FlexibilityField
                value={dateTime.flexibility}
                onChange={(flexibility) => onDateTimeChange({ ...dateTime, flexibility })}
              />
            </section>
          </>
        ) : (
          <RecurringScheduleFields
            dateTime={dateTime}
            onDateTimeChange={onDateTimeChange}
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
          />
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-[88px] z-50 mx-auto max-w-[430px] px-6 pb-4 pt-8 md:static md:mx-0 md:max-w-none md:px-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-0">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-28 bg-[linear-gradient(180deg,transparent,var(--rp-bg)_42%)] md:hidden" />
        <PrimaryButton onClick={handleContinue} disabled={!canContinue}>Continue</PrimaryButton>
      </footer>

      <RecurringProtectionDialog
        dateTime={dateTime}
        pickupAddress={pickupAddress}
        dropoffAddress={dropoffAddress}
        open={showRecurringProtectionDialog}
        accepted={recurringProtectionAccepted}
        onAcceptedChange={setRecurringProtectionAccepted}
        onClose={() => setShowRecurringProtectionDialog(false)}
        onConfirm={() => {
          setShowRecurringProtectionDialog(false);
          onContinue();
        }}
      />
    </>
  );
}

function SeatCounter({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const minSeats = 2;
  const maxSeats = 8;

  return (
    <section>
      <h2 className="text-base font-black text-[var(--rp-text)]">Seats available</h2>
      <div className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-input-bg)] px-4 py-3 shadow-[var(--rp-shadow-soft)]">
        <div className="grid grid-cols-[52px_1fr_52px] items-center gap-3">
          <button
            type="button"
            aria-label="Decrease seats"
            disabled={value <= minSeats}
            onClick={() => onChange(Math.max(minSeats, value - 1))}
            className="grid h-12 w-12 place-items-center rounded-full border border-[var(--rp-input-border)] text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)] disabled:opacity-35"
          >
            <Minus className="h-6 w-6" />
          </button>
          <div className="text-center text-5xl font-black leading-none text-[var(--rp-primary)]">
            {value}
          </div>
          <button
            type="button"
            aria-label="Increase seats"
            disabled={value >= maxSeats}
            onClick={() => onChange(Math.min(maxSeats, value + 1))}
            className="grid h-12 w-12 place-items-center rounded-full border border-[var(--rp-input-border)] text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)] disabled:opacity-35"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-sm font-bold text-[var(--rp-muted)]">
        {value - 1} guests + host
      </p>
    </section>
  );
}

function RideOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: (typeof rideOptions)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[52px_1fr_34px] items-center gap-3 rounded-[14px] border bg-[var(--rp-card)] p-3 text-left shadow-[var(--rp-shadow-soft)] transition",
        selected
          ? "border-[var(--rp-primary)] ring-1 ring-[var(--rp-primary)]"
          : "border-[var(--rp-border)] hover:border-[var(--rp-border-strong)]",
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
        <Icon className="h-7 w-7" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black text-[var(--rp-text)]">{option.title}</span>
        <span className="mt-1 block text-xs font-semibold leading-4 text-[var(--rp-muted)]">
          {option.description}
        </span>
        <span className="mt-1 block text-[11px] font-black leading-4 text-[var(--rp-primary)]">
          {option.helper}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full border-2",
          selected
            ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
            : "border-[var(--rp-muted)] text-transparent",
        )}
      >
        <Check className="h-4 w-4" />
      </span>
      {selected ? <span className="sr-only">Selected</span> : null}
    </button>
  );
}

function RideOptionSelector({
  value,
  onChange,
}: {
  value: RideOptionId;
  onChange: (value: RideOptionId) => void;
}) {
  return (
    <section className="mt-7">
      <h2 className="text-base font-black text-[var(--rp-text)]">Ride option</h2>
      <div className="mt-3 grid gap-3" role="radiogroup" aria-label="Ride option">
        {rideOptions.map((option) => (
          <RideOptionCard
            key={option.id}
            option={option}
            selected={value === option.id}
            onSelect={() => onChange(option.id)}
          />
        ))}
      </div>
    </section>
  );
}

function HostChoiceConfirmationDialog({
  checked,
  onCheckedChange,
  onCancel,
  onConfirm,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/62 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8 backdrop-blur-sm sm:place-items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-choice-confirm-title"
        className="w-full max-w-[390px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 id="host-choice-confirm-title" className="text-xl font-black leading-tight">
              Confirm Host&apos;s Choice
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              RidePod helps users coordinate planned ride pods. RidePod does not provide drivers. The host books the external ride at or below the approved max fare.
            </p>
          </div>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="mt-1 h-5 w-5 accent-[var(--rp-primary)]"
          />
          <span className="text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            I understand the host chooses and books the external ride under the approved max fare. Everyone pays their share.
          </span>
        </label>

        <div className="mt-5 grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 w-full rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!checked}
            aria-disabled={!checked}
            onClick={() => {
              if (checked) onConfirm();
            }}
            className={cn(
              "min-h-12 w-full rounded-[16px] border text-sm font-black transition",
              checked
                ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_26%,transparent)] hover:brightness-105"
                : "cursor-not-allowed border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)] shadow-none",
            )}
          >
            Confirm
          </button>
        </div>
      </section>
    </div>
  );
}

function VehicleDarkPanel() {
  return (
    <aside className="people-vehicle-dark-panel ridepod-theme-image-dark relative min-h-[650px] overflow-hidden border-r border-[var(--rp-border-strong)]">
      <Image
        src="/images/ridepod/people-vehicle-dark.png"
        alt=""
        fill
        sizes="(max-width: 768px) 52vw, 360px"
        quality={100}
        className="object-cover object-[38%_center]"
        priority
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,11,18,0.2),rgba(5,11,18,0.02)_45%,rgba(5,11,18,0.32)),linear-gradient(180deg,rgba(5,11,18,0.03),rgba(5,11,18,0.18)_58%,rgba(5,11,18,0.7))]" />
    </aside>
  );
}

function VehicleLightArt() {
  return (
    <div className="people-vehicle-light-art ridepod-theme-image-light relative mt-5 h-36 overflow-hidden rounded-[18px]">
      <Image
        src="/ridepod/people-vehicle-light-background.png"
        alt=""
        fill
        sizes="390px"
        className="object-contain object-center"
        priority
      />
    </div>
  );
}

function PeopleVehicleStep({
  podType,
  peopleVehicle,
  onPeopleVehicleChange,
  onBack,
  onContinue,
}: {
  podType: PodType;
  peopleVehicle: PeopleVehicleState;
  onPeopleVehicleChange: (peopleVehicle: PeopleVehicleState) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const selectedRideOption = rideOptions.find((option) => option.id === peopleVehicle.rideOption);
  const [showHostChoiceConfirm, setShowHostChoiceConfirm] = useState(false);
  const [hostChoiceConfirmed, setHostChoiceConfirmed] = useState(false);

  function handleContinue() {
    if (peopleVehicle.rideOption === "hosts_choice" && !hostChoiceConfirmed) {
      setShowHostChoiceConfirm(true);
      return;
    }

    onContinue();
  }

  return (
    <>
      <CreatePodTopBar currentStep={3} onBack={onBack} />

      <main className="people-vehicle-layout scrollbar-hide min-h-0 flex-1 overflow-y-auto">
        <VehicleDarkPanel />
        <section className="people-vehicle-content flex min-h-0 flex-col px-6 pb-10 pt-8">
          <div className="text-center">
            <ScheduleTypeEyebrow podType={podType} />
            <h1 className="text-[30px] font-black leading-tight text-[var(--rp-text)]">
              Seats & ride option
            </h1>
            <p className="mt-2 text-base font-medium text-[var(--rp-muted)]">
              Set your pod capacity and ride preference.
            </p>
          </div>

          <div className="mt-7">
            <SeatCounter
              value={peopleVehicle.seatsAvailable}
              onChange={(seatsAvailable) =>
                onPeopleVehicleChange({ ...peopleVehicle, seatsAvailable })
              }
            />
            <RideOptionSelector
              value={peopleVehicle.rideOption}
              onChange={(rideOption) =>
                onPeopleVehicleChange({
                  ...peopleVehicle,
                  rideOption,
                  vehicleType:
                    rideOptions.find((option) => option.id === rideOption)?.title ?? "Host's Choice",
                })
              }
            />
            <VehicleLightArt />
          </div>

          <div className="mt-auto pt-7">
            <p className="mb-3 text-center text-xs font-bold text-[var(--rp-muted)]">
              {selectedRideOption?.title ?? "Host's Choice"} selected. Host books the external ride under approved max fare.
            </p>
            <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
          </div>
        </section>
      </main>

      {showHostChoiceConfirm ? (
        <HostChoiceConfirmationDialog
          checked={hostChoiceConfirmed}
          onCheckedChange={setHostChoiceConfirmed}
          onCancel={() => setShowHostChoiceConfirm(false)}
          onConfirm={() => {
            setShowHostChoiceConfirm(false);
            onContinue();
          }}
        />
      ) : null}
    </>
  );
}

function ReviewHeroCard({
  routeFrom,
  routeTo,
  dateTime,
  peopleVehicle,
}: {
  routeFrom: string;
  routeTo: string;
  dateTime: DateTimeState;
  peopleVehicle: PeopleVehicleState;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <div className="relative h-32 overflow-hidden">
        <Image
          src="/ridepod/review-dark-background.png"
          alt=""
          fill
          sizes="390px"
          className="ridepod-theme-image-dark object-cover object-center"
          priority
        />
        <Image
          src="/ridepod/review-light-background.png"
          alt=""
          fill
          sizes="390px"
          className="ridepod-theme-image-light object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--rp-card)_50%,transparent)_72%,var(--rp-card)_100%)]" />
      </div>
      <div className="px-4 pb-4 text-center">
        <p className="text-sm font-black text-[var(--rp-primary)]">
          {getScheduleTypeLabel(dateTime)}
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-[26px] font-black tracking-wide text-[var(--rp-text)]">
          <span>{routeFrom}</span>
          <span className="text-[var(--rp-primary)]">{"\u2192"}</span>
          <span>{routeTo}</span>
        </div>
        <dl className="mt-5 grid grid-cols-4 gap-2 text-left text-xs font-bold text-[var(--rp-text)]">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
            <span className="truncate">{getScheduleDateSummary(dateTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
            <span className="truncate">{dateTime.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
            <span className="truncate">{peopleVehicle.seatsAvailable} seats</span>
          </div>
          <div className="flex items-center gap-2">
            <Luggage className="h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
            <span className="truncate">{peopleVehicle.bags} bags</span>
          </div>
        </dl>
        <p className="mt-3 text-xs font-bold text-[var(--rp-muted-strong)]">
          Flexibility {dateTime.flexibility}
        </p>
      </div>
    </section>
  );
}

function PricingSummaryCard({ money }: { money: MoneyProtectionState }) {
  const estimatedFareCents = dollarsToCents(money.estimatedTotalFare);
  const approvedMaxCents = dollarsToCents(money.approvedMaxTotalFare);
  const feeCents = dollarsToCents(money.ridepodFee);
  const safeTargetSeats = Math.max(1, Math.floor(money.targetSeats));
  const safeMinSeats = Math.max(1, Math.floor(money.minSeatsToBook));
  const protection = calculateMoneyProtection({
    estimatedTotalFareCents: estimatedFareCents,
    approvedMaxTotalFareCents: approvedMaxCents,
    targetSeats: safeTargetSeats,
    minSeatsToBook: safeMinSeats,
    ridepodFeeCents: feeCents,
    hostIsRiding: money.hostIsRiding,
  });

  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 text-center shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-lg font-black text-[var(--rp-text)]">Pricing summary</h2>
      <dl className="mt-5 grid gap-3 text-left">
        <div className="rounded-2xl border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_88%,var(--rp-background))] p-3">
          <dt className="text-xs font-semibold text-[var(--rp-muted)]">Est. fare</dt>
          <dd className="mt-1 text-2xl font-black text-[var(--rp-text)]">
            {formatCentsFixed(estimatedFareCents)}
          </dd>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_88%,var(--rp-background))] p-3">
            <dt className="text-xs font-black text-[var(--rp-primary)]">Expected total</dt>
            <dd className="mt-1 text-xl font-black text-[var(--rp-primary)]">
              {formatCentsFixed(protection.expectedTotalPerRiderCents)}
            </dd>
            <dd className="text-xs font-semibold text-[var(--rp-muted-strong)]">
              / rider if {getIdealPodSizeSummary(money)} fill
            </dd>
          </div>
          <div className="rounded-2xl border border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,var(--rp-card))] p-3">
            <dt className="text-xs font-black text-[var(--rp-primary)]">Protected max</dt>
            <dd className="mt-1 text-xl font-black text-[var(--rp-primary)]">
              {formatCentsFixed(protection.protectedMaxChargePerRiderCents)}
            </dd>
            <dd className="text-xs font-semibold text-[var(--rp-muted-strong)]">
              / rider if {getMinimumLockedSummary(money)}
            </dd>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_88%,var(--rp-background))] p-3">
            <dt className="text-xs font-semibold text-[var(--rp-muted)]">Approved max fare</dt>
            <dd className="mt-1 text-lg font-black text-[var(--rp-text)]">
              {formatCentsFixed(approvedMaxCents)}
            </dd>
          </div>
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_88%,var(--rp-background))] p-3">
            <dt className="text-xs font-semibold text-[var(--rp-muted)]">RidePod fee</dt>
            <dd className="mt-1 text-lg font-black text-[var(--rp-text)]">
              {formatCentsFixed(feeCents)}
              <span className="text-xs font-semibold text-[var(--rp-muted-strong)]"> / rider</span>
            </dd>
          </div>
        </div>
      </dl>
      <p className="mx-auto mt-5 max-w-[320px] text-sm font-medium leading-5 text-[var(--rp-muted-strong)]">
        Host can book only after the minimum locked riders authorize payment and the quote is within the approved max.
        Final charge uses the verified receipt and may be lower.
      </p>
    </section>
  );
}

type MoneyProtectionState = {
  estimatedTotalFare: number;
  approvedMaxTotalFare: number;
  targetSeats: number;
  minSeatsToBook: number;
  ridepodFee: number;
  hostIsRiding: boolean;
  estimateSource: EstimateSource;
  estimateConfidence: EstimateConfidence;
  systemEstimatedFare: number;
  hostEstimatedFare: number;
  taxiZone: HkTaxiZone;
  estimatedDistanceKm: number;
  baggageCount: number;
  tollEstimate: number;
  waitingMinutes: number;
  trafficBufferPercent: number;
  routeRiskLevel: RouteRiskLevel;
};

type MoneyProtectionNumberKey = Exclude<
  keyof MoneyProtectionState,
  "hostIsRiding" | "estimateSource" | "estimateConfidence" | "taxiZone" | "routeRiskLevel"
>;

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function getIdealPodSizeSummary(money: Pick<MoneyProtectionState, "targetSeats" | "hostIsRiding">) {
  const idealPeople = Math.max(1, Math.floor(money.targetSeats));
  const guestSeats = money.hostIsRiding ? Math.max(0, idealPeople - 1) : idealPeople;
  const guestCopy = `${guestSeats} ${pluralize(guestSeats, "guest")}`;

  return money.hostIsRiding ? `${guestCopy} + host` : guestCopy;
}

function getMinimumLockedSummary(money: Pick<MoneyProtectionState, "minSeatsToBook" | "hostIsRiding">) {
  const lockedRiders = Math.max(1, Math.floor(money.minSeatsToBook));
  const personLabel = money.hostIsRiding ? "guest" : "rider";

  return `${lockedRiders} ${pluralize(lockedRiders, personLabel)} lock`;
}

function getMinimumLockedHelper(money: Pick<MoneyProtectionState, "minSeatsToBook" | "hostIsRiding">) {
  const lockedRiders = Math.max(1, Math.floor(money.minSeatsToBook));
  const personLabel = money.hostIsRiding ? "guest" : "rider";

  return `${lockedRiders} ${pluralize(lockedRiders, personLabel)} must authorize before host can book.`;
}

function getHkTaxiEstimateForMoney(money: MoneyProtectionState) {
  return calculateHkTaxiFareEstimate({
    zone: money.taxiZone,
    distanceMeters: Math.round(Math.max(0, money.estimatedDistanceKm) * 1000),
    baggageCount: money.baggageCount,
    tollEstimateCents: dollarsToCents(money.tollEstimate),
    waitingMinutes: money.waitingMinutes,
    trafficBufferPercent: money.trafficBufferPercent,
  });
}

function syncSystemEstimate(money: MoneyProtectionState): MoneyProtectionState {
  const taxiEstimate = getHkTaxiEstimateForMoney(money);
  const systemEstimatedFare = centsToDollars(taxiEstimate.totalFareCents);

  return {
    ...money,
    systemEstimatedFare,
    estimateConfidence: taxiEstimate.estimateConfidence,
    ...(money.estimateSource === "SYSTEM_TAXI_HK"
      ? {
          estimatedTotalFare: systemEstimatedFare,
          hostEstimatedFare: systemEstimatedFare,
        }
      : {}),
  };
}

function MoneyProtectionPanel({
  money,
  onMoneyChange,
}: {
  money: MoneyProtectionState;
  onMoneyChange: (money: MoneyProtectionState) => void;
}) {
  function commitMoney(nextMoney: MoneyProtectionState) {
    onMoneyChange(syncSystemEstimate(nextMoney));
  }

  function updateMoney(key: MoneyProtectionNumberKey, value: number) {
    const maxLockedRiders = money.hostIsRiding
      ? Math.max(1, Math.floor(money.targetSeats) - 1)
      : Math.max(1, Math.floor(money.targetSeats));
    const nextValue = Math.max(
      key === "ridepodFee" || key === "tollEstimate" || key === "waitingMinutes" || key === "trafficBufferPercent" ? 0 : 1,
      Number.isFinite(value) ? value : 0,
    );
    const boundedValue = key === "minSeatsToBook" ? Math.min(nextValue, maxLockedRiders) : nextValue;
    const nextMoney = {
      ...money,
      [key]: boundedValue,
      ...(key === "estimatedTotalFare"
        ? { estimateSource: "HOST_INPUT" as EstimateSource, hostEstimatedFare: boundedValue }
        : {}),
    };

    commitMoney(nextMoney);
  }

  const taxiEstimate = getHkTaxiEstimateForMoney(money);
  const systemEstimateCents = taxiEstimate.totalFareCents;
  const suggestedApprovedMaxCents = suggestApprovedMaxFare(systemEstimateCents, money.routeRiskLevel);
  const hostEstimateWarning = getHostEstimateWarning({
    hostEstimatedFareCents: dollarsToCents(money.estimatedTotalFare),
    systemBaselineFareCents: systemEstimateCents,
    suggestedApprovedMaxFareCents: suggestedApprovedMaxCents,
  });
  const approvedMaxBelowEstimate = money.approvedMaxTotalFare < money.estimatedTotalFare;
  const maxLockedRiders = money.hostIsRiding
    ? Math.max(1, Math.floor(money.targetSeats) - 1)
    : Math.max(1, Math.floor(money.targetSeats));
  const estimateIsAvailable = systemEstimateCents > 0;

  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Money Protection</h2>
          <p className="mt-2 text-sm font-medium leading-5 text-[var(--rp-muted-strong)]">
            Host may preview fare early, but protected booking unlocks only after required participants authorize payment.
            Final settlement uses the verified receipt and may be lower.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[var(--rp-text)]">RidePod estimate</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                {estimateIsAvailable
                  ? `${formatCentsFixed(systemEstimateCents)} based on ${HK_TAXI_FARE_RULES[money.taxiZone].label} fare baseline.`
                  : "Add route distance to preview a HK taxi fare baseline, or keep the manual estimate."}
              </p>
            </div>
            <span className="rounded-full border border-[var(--rp-border)] px-3 py-1 text-xs font-black uppercase text-[var(--rp-primary)]">
              {money.estimateConfidence}
            </span>
          </div>

          <dl className="mt-3 grid gap-2 text-xs font-bold text-[var(--rp-muted-strong)]">
            <div className="flex items-center justify-between gap-3">
              <dt>Estimate source</dt>
              <dd className="text-right text-[var(--rp-text)]">{formatEstimateSource(money.estimateSource)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Approved max suggestion</dt>
              <dd className="text-right text-[var(--rp-primary)]">
                {estimateIsAvailable ? formatCentsFixed(suggestedApprovedMaxCents) : "Needs distance"}
              </dd>
            </div>
          </dl>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!estimateIsAvailable}
              onClick={() => {
                const nextEstimate = centsToDollars(systemEstimateCents);
                commitMoney({
                  ...money,
                  estimateSource: "SYSTEM_TAXI_HK",
                  estimatedTotalFare: nextEstimate,
                  hostEstimatedFare: nextEstimate,
                });
              }}
              className="min-h-10 rounded-xl border border-[var(--rp-primary)] px-3 text-xs font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Use RidePod estimate
            </button>
            <button
              type="button"
              disabled={!estimateIsAvailable}
              onClick={() =>
                commitMoney({
                  ...money,
                  approvedMaxTotalFare: centsToDollars(suggestedApprovedMaxCents),
                })
              }
              className="min-h-10 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card)] px-3 text-xs font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Use suggested max
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 sm:grid-cols-2">
          <div className="grid gap-1.5 text-sm font-black text-[var(--rp-text)]">
            <span>Taxi baseline</span>
            <div className="grid gap-2">
              {HK_TAXI_ZONES.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => commitMoney({ ...money, taxiZone: zone })}
                  className={cn(
                    "min-h-10 rounded-xl border px-3 text-left text-xs font-black transition",
                    money.taxiZone === zone
                      ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                      : "border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)]",
                  )}
                >
                  {HK_TAXI_FARE_RULES[zone].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5 text-sm font-black text-[var(--rp-text)]">
            <span>Route risk</span>
            <div className="grid gap-2">
              {ROUTE_RISK_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => commitMoney({ ...money, routeRiskLevel: level })}
                  className={cn(
                    "min-h-10 rounded-xl border px-3 text-left text-xs font-black transition",
                    money.routeRiskLevel === level
                      ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                      : "border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)]",
                  )}
                >
                  {formatRouteRiskLevel(level)}
                </button>
              ))}
            </div>
          </div>
          {([
            { label: "Estimated distance (km)", key: "estimatedDistanceKm", step: 0.1 },
            { label: "Baggage count", key: "baggageCount", step: 1 },
            { label: "Toll / tunnel estimate", key: "tollEstimate", step: 1 },
            { label: "Waiting / traffic buffer (min)", key: "waitingMinutes", step: 1 },
          ] satisfies Array<{ label: string; key: MoneyProtectionNumberKey; step: number }>).map((field) => (
            <label key={field.key} className="grid gap-1.5 text-sm font-black text-[var(--rp-text)]">
              {field.label}
              <input
                type="number"
                min={0}
                step={field.step}
                value={money[field.key]}
                onChange={(event) => updateMoney(field.key, Number(event.target.value))}
                className="h-11 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card)] px-3 text-base font-semibold text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
              />
            </label>
          ))}
        </div>

        <div className="grid gap-1.5 text-sm font-black text-[var(--rp-text)]">
          <span>Ideal pod size</span>
          <div className="rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-3 text-base font-semibold text-[var(--rp-text)]">
            {money.targetSeats}
          </div>
          <p className="text-xs font-bold text-[var(--rp-muted-strong)]">
            Ideal pod size: {getIdealPodSizeSummary(money)}.
          </p>
        </div>

        <div className="grid gap-2 text-sm font-black text-[var(--rp-text)]">
          <span>Host is riding</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  const nextMaxLockedRiders = option.value
                    ? Math.max(1, Math.floor(money.targetSeats) - 1)
                    : Math.max(1, Math.floor(money.targetSeats));

                  commitMoney({
                    ...money,
                    hostIsRiding: option.value,
                    minSeatsToBook: Math.min(money.minSeatsToBook, nextMaxLockedRiders),
                  });
                }}
                className={cn(
                  "h-11 rounded-xl border text-sm font-black transition",
                  money.hostIsRiding === option.value
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {[
          ["Estimated total fare", "estimatedTotalFare"],
          ["Approved max total fare", "approvedMaxTotalFare"],
          ["Minimum locked riders", "minSeatsToBook"],
        ].map(([label, key]) => (
          <label key={key} className="grid gap-1.5 text-sm font-black text-[var(--rp-text)]">
            {label}
            <input
              type="number"
              min={1}
              max={key === "minSeatsToBook" ? maxLockedRiders : undefined}
              value={money[key as MoneyProtectionNumberKey]}
              onChange={(event) => updateMoney(key as MoneyProtectionNumberKey, Number(event.target.value))}
              aria-invalid={key === "approvedMaxTotalFare" && approvedMaxBelowEstimate}
              className={cn(
                "h-11 rounded-xl border bg-[var(--rp-card-soft)] px-3 text-base font-semibold text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]",
                key === "approvedMaxTotalFare" && approvedMaxBelowEstimate
                  ? "border-[var(--rp-primary)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--rp-primary)_55%,transparent)]"
                  : "border-[var(--rp-border)]",
              )}
            />
            {key === "approvedMaxTotalFare" && approvedMaxBelowEstimate ? (
              <span className="text-xs font-bold text-[var(--rp-primary)]">
                Approved max must be at least {formatMoney(money.estimatedTotalFare)} before you continue.
              </span>
            ) : null}
            {key === "estimatedTotalFare" && hostEstimateWarning ? (
              <span className="text-xs font-bold text-[var(--rp-primary)]">{hostEstimateWarning}</span>
            ) : null}
            {key === "minSeatsToBook" ? (
              <span className="text-xs font-bold text-[var(--rp-muted-strong)]">
                Minimum locked riders: {getMinimumLockedHelper(money)}
              </span>
            ) : null}
          </label>
        ))}

        <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
          <p className="font-black text-[var(--rp-text)]">Host quote</p>
          <p className="mt-1">Upload quote screenshot before booking. The quote controls booking permission; final settlement uses the verified receipt.</p>
        </div>
      </div>
    </section>
  );
}

function PreviewMoneyProtectionCard({ money }: { money: MoneyProtectionState }) {
  const safeTargetSeats = Math.max(1, money.targetSeats);
  const safeMinSeats = Math.max(1, money.minSeatsToBook);
  const approvedMaxCents = dollarsToCents(money.approvedMaxTotalFare);
  const feeCents = dollarsToCents(money.ridepodFee);
  const protection = calculateMoneyProtection({
    estimatedTotalFareCents: dollarsToCents(money.estimatedTotalFare),
    approvedMaxTotalFareCents: approvedMaxCents,
    targetSeats: safeTargetSeats,
    minSeatsToBook: safeMinSeats,
    ridepodFeeCents: feeCents,
    hostIsRiding: money.hostIsRiding,
  });
  const rows = [
    {
      label: "Expected total",
      value: `${formatCents(protection.expectedTotalPerRiderCents)} / rider if ${getIdealPodSizeSummary(money)} fill`,
    },
    {
      label: "Protected max",
      value: `${formatCents(protection.protectedMaxChargePerRiderCents)} / rider if ${getMinimumLockedSummary(money)}`,
    },
    {
      label: "RidePod fee",
      value: `${formatCents(feeCents)} included`,
    },
    {
      label: "Final charge",
      value: "Uses verified receipt and may be lower",
    },
  ];

  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Money Protection</h2>
          <p className="mt-2 text-sm font-medium leading-5 text-[var(--rp-muted-strong)]">
            Riders authorize the protected max before the host books. They may pay less after the final receipt is verified.
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-3"
          >
            <dt className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-primary)]">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-black leading-5 text-[var(--rp-text)]">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 grid gap-2 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
        <p className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          Host can book only after the minimum locked riders authorize payment and the quote is within the {formatCents(approvedMaxCents)} approved max.
        </p>
        <p className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          Final settlement uses the verified receipt, not the quote.
        </p>
      </div>
    </section>
  );
}

function SafetyTrustPanel({
  genderMode,
  accessMode,
  onGenderModeChange,
  onAccessModeChange,
}: {
  genderMode: GenderMode;
  accessMode: AccessMode;
  onGenderModeChange: (genderMode: GenderMode) => void;
  onAccessModeChange: (accessMode: AccessMode) => void;
}) {
  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Safety &amp; Trust</h2>
          <p className="mt-2 text-sm font-medium leading-5 text-[var(--rp-muted-strong)]">
            Choose who can join and which trust rules riders see before requesting a seat.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <p className="text-sm font-black text-[var(--rp-text)]">Gender mode</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {genderModeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onGenderModeChange(option.id)}
                className={cn(
                  "h-11 rounded-xl border px-3 text-sm font-black",
                  genderMode === option.id
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {genderMode === "women_only" ? (
            <p className="mt-3 rounded-xl bg-[var(--rp-card-soft)] p-3 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
              Women-only pods are designed for safer matching. Eligible female users can join. RidePod does not guarantee safety; report concerns immediately.
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-black text-[var(--rp-text)]">Access mode</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {accessModeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onAccessModeChange(option.id)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2 text-sm font-black",
                  accessMode === option.id
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewPanelControls({
  currentPanel,
  onPanelChange,
  onCreate,
  canProceed,
  blockedReason,
}: {
  currentPanel: number;
  onPanelChange: (panel: number) => void;
  onCreate: () => void;
  canProceed: boolean;
  blockedReason?: string;
}) {
  const panelLabels = ["Money Protection", "Safety & Trust", "Preview your pod"];
  const isFirst = currentPanel === 0;
  const isLast = currentPanel === panelLabels.length - 1;
  const nextBlocked = currentPanel === 0 && !canProceed;

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-center gap-2" aria-label="Review section progress">
        {panelLabels.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={`Show ${label}`}
            aria-current={currentPanel === index ? "step" : undefined}
            onClick={() => {
              if (!canProceed && index > currentPanel) return;
              onPanelChange(index);
            }}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition",
              currentPanel === index ? "w-7 bg-[var(--rp-primary)]" : "bg-[var(--rp-card-muted)]",
              !canProceed && index > currentPanel ? "cursor-not-allowed opacity-45" : "",
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onPanelChange(Math.max(0, currentPanel - 1))}
          className="flex min-h-12 items-center justify-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[22px] font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Previous review section"
        >
          {"<"}
        </button>
        {isLast ? (
          <button
            type="button"
            disabled={!canProceed}
            onClick={onCreate}
            className="review-create-pod-button min-h-12 rounded-2xl border px-4 text-sm font-black shadow-[0_14px_28px_rgba(246,196,83,0.34)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Create Pod
          </button>
        ) : (
          <button
            type="button"
            disabled={nextBlocked}
            onClick={() => onPanelChange(Math.min(panelLabels.length - 1, currentPanel + 1))}
            className="flex min-h-12 items-center justify-center rounded-2xl border border-[var(--rp-primary)] bg-[var(--rp-card)] text-[22px] font-black text-[var(--rp-primary)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_16%,transparent)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Next review section"
          >
            {">"}
          </button>
        )}
      </div>
      {!canProceed && blockedReason ? (
        <p className="mt-3 rounded-2xl border border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,var(--rp-card))] px-3 py-2 text-center text-xs font-bold leading-5 text-[var(--rp-primary)]">
          {blockedReason}
        </p>
      ) : null}
    </div>
  );
}

function DetailSummaryCard({
  routeFrom,
  routeTo,
  pickupAddress,
  dropoffAddress,
  peopleVehicle,
}: {
  routeFrom: string;
  routeTo: string;
  pickupAddress: string;
  dropoffAddress: string;
  peopleVehicle: PeopleVehicleState;
}) {
  const pickup = pickupAddress.replace(",", "");
  const dropoff = dropoffAddress.replace(",", "");
  const rows = [
    {
      icon: UsersRound,
      label: `${peopleVehicle.seatsAvailable} seats total`,
      value: `${Math.max(0, peopleVehicle.seatsAvailable - 3)} seat open`,
    },
    {
      icon: CarFront,
      label: "Ride option",
      value: `${peopleVehicle.vehicleType} / ${peopleVehicle.bags} bags`,
    },
    {
      icon: ShieldCheck,
      label: "Fare rule",
      value: "Host can book only when required riders are payment-authorized and the quote is within approved max.",
    },
    {
      icon: MapPin,
      label: "Route",
      value: `${routeFrom} \u2192 ${routeTo}`,
    },
    {
      icon: MapPin,
      label: "Pickup",
      value: pickup || "USC Village rideshare zone",
    },
    {
      icon: MapPin,
      label: "Dropoff",
      value: dropoff || "LAX Terminal 3 departures",
    },
  ];

  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <dl>
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <div
              key={row.label}
              className="grid grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-[var(--rp-border)] px-4 py-3 last:border-b-0"
            >
              <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
              <dt className="text-sm font-black text-[var(--rp-text)]">{row.label}</dt>
              <dd className="max-w-[170px] text-right text-sm font-medium text-[var(--rp-text)]">
                {row.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function ReviewPodStep({
  podType,
  pickupAddress,
  dropoffAddress,
  dateTime,
  peopleVehicle,
  pricing,
  onBack,
  onCreate,
}: {
  podType: PodType;
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  peopleVehicle: PeopleVehicleState;
  pricing: PricingState;
  onBack: () => void;
  onCreate: () => void;
}) {
  const routeFrom = routeCode(pickupAddress, "USC");
  const routeTo = routeCode(dropoffAddress, "LAX");
  const [reviewPanel, setReviewPanel] = useState(0);
  const defaultTaxiEstimate = calculateHkTaxiFareEstimate({
    zone: "URBAN",
    distanceMeters: 6000,
    baggageCount: peopleVehicle.bags,
  });
  const [moneyProtection, setMoneyProtection] = useState<MoneyProtectionState>({
    estimatedTotalFare: pricing.estimatedFare,
    approvedMaxTotalFare: pricing.maxFare,
    targetSeats: peopleVehicle.seatsAvailable,
    minSeatsToBook: Math.min(3, peopleVehicle.seatsAvailable),
    ridepodFee: 5,
    hostIsRiding: true,
    estimateSource: "HOST_INPUT",
    estimateConfidence: defaultTaxiEstimate.estimateConfidence,
    systemEstimatedFare: centsToDollars(defaultTaxiEstimate.totalFareCents),
    hostEstimatedFare: pricing.estimatedFare,
    taxiZone: "URBAN",
    estimatedDistanceKm: 6,
    baggageCount: peopleVehicle.bags,
    tollEstimate: 0,
    waitingMinutes: 0,
    trafficBufferPercent: 0,
    routeRiskLevel: "NORMAL",
  });
  const [genderMode, setGenderMode] = useState<GenderMode>("mixed");
  const [accessMode, setAccessMode] = useState<AccessMode>("verified_only");
  const moneyProtectionError =
    moneyProtection.approvedMaxTotalFare < moneyProtection.estimatedTotalFare
      ? `Approved max must be at least ${formatMoney(moneyProtection.estimatedTotalFare)} before you continue.`
      : null;

  return (
    <>
      <CreatePodTopBar currentStep={4} onBack={onBack} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-7">
        <section className="text-center">
          <ScheduleTypeEyebrow podType={podType} />
          <h1 className="text-[26px] font-black leading-tight text-[var(--rp-text)]">
            Review your pod
          </h1>
          <p className="mt-2 text-sm font-medium text-[var(--rp-muted)]">
            Review your selections before creating your pod.
          </p>
        </section>

        <div className="mt-5 grid gap-4">
          {reviewPanel === 0 ? (
            <>
              <PricingSummaryCard money={moneyProtection} />
              <MoneyProtectionPanel
                money={moneyProtection}
                onMoneyChange={setMoneyProtection}
              />
            </>
          ) : null}

          {reviewPanel === 1 ? (
            <SafetyTrustPanel
              genderMode={genderMode}
              accessMode={accessMode}
              onGenderModeChange={setGenderMode}
              onAccessModeChange={setAccessMode}
            />
          ) : null}

          {reviewPanel === 2 ? (
            <section className="grid gap-4">
              <div className="text-center">
                <h2 className="text-xl font-black text-[var(--rp-text)]">Preview your pod</h2>
                <p className="mt-1 text-sm font-medium text-[var(--rp-muted)]">
                  This is how riders will see your pod before joining.
                </p>
              </div>
              <ReviewHeroCard
                routeFrom={routeFrom}
                routeTo={routeTo}
                dateTime={dateTime}
                peopleVehicle={peopleVehicle}
              />
              <PreviewMoneyProtectionCard money={moneyProtection} />
              <DetailSummaryCard
                routeFrom={routeFrom}
                routeTo={routeTo}
                pickupAddress={pickupAddress}
                dropoffAddress={dropoffAddress}
                peopleVehicle={peopleVehicle}
              />
            </section>
          ) : null}
        </div>

        <ReviewPanelControls
          currentPanel={reviewPanel}
          onPanelChange={setReviewPanel}
          onCreate={onCreate}
          canProceed={!moneyProtectionError}
          blockedReason={moneyProtectionError ?? undefined}
        />

        <p className="mt-3 text-center text-sm font-medium text-[var(--rp-muted)]">
          You can move back to edit details before publishing.
        </p>
      </main>
    </>
  );
}

function SuccessHero() {
  return (
    <section className="text-center">
      <div className="relative mx-auto h-48 overflow-hidden rounded-[26px]">
        <Image
          src="/ridepod/success-dark-background.png"
          alt=""
          fill
          sizes="390px"
          className="ridepod-theme-image-dark object-cover object-center"
          priority
        />
        <Image
          src="/ridepod/success-light-background.png"
          alt=""
          fill
          sizes="390px"
          className="ridepod-theme-image-light object-cover object-center"
          priority
        />
      </div>
      <h1 className="mt-5 text-[40px] font-black leading-none text-[var(--rp-text)]">
        All set!
      </h1>
      <p className="mt-3 text-base font-medium text-[var(--rp-muted-strong)]">
        Your pod is created and ready to fill.
      </p>
    </section>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
      {label}
    </span>
  );
}

function PodCreatedSummaryCard({
  routeFrom,
  routeTo,
  dateTime,
  peopleVehicle,
  pricing,
}: {
  routeFrom: string;
  routeTo: string;
  dateTime: DateTimeState;
  peopleVehicle: PeopleVehicleState;
  pricing: PricingState;
}) {
  const rows = [
    {
      icon: MapPin,
      label: "Route",
      value: `${routeFrom} \u2192 ${routeTo}`,
      aside: <StatusBadge label="Forming" />,
    },
    {
      icon: CalendarDays,
      label: "Date & time",
      value: `${getScheduleDateSummary(dateTime)} \u2022 ${dateTime.time}`,
    },
    {
      icon: UsersRound,
      label: "Seats filled",
      value: `3 / ${peopleVehicle.seatsAvailable} seats filled`,
      aside: (
        <div className="flex gap-1 text-[var(--rp-primary)]" aria-hidden="true">
          {Array.from({ length: peopleVehicle.seatsAvailable }).map((_, index) => (
            <UsersRound
              key={index}
              className={cn("h-4 w-4", index >= 3 && "text-[var(--rp-muted)] opacity-45")}
            />
          ))}
        </div>
      ),
    },
    {
      icon: DollarSign,
      label: "Estimated share",
      value: `${formatMoney(pricing.estimatedShare)} / person`,
    },
    {
      icon: CarFront,
      label: "Ride option",
      value: peopleVehicle.vehicleType,
    },
  ];

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <h2 className="sr-only">Pod summary</h2>
      <dl>
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <div
              key={row.label}
              className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-[var(--rp-border)] py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted)]">
                  {row.label}
                </dt>
                <dd className="mt-1 text-base font-black text-[var(--rp-text)]">{row.value}</dd>
              </div>
              {row.aside ? <div className="shrink-0">{row.aside}</div> : null}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function SuccessStep({
  podType,
  pickupAddress,
  dropoffAddress,
  dateTime,
  peopleVehicle,
  pricing,
}: {
  podType: PodType;
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  peopleVehicle: PeopleVehicleState;
  pricing: PricingState;
}) {
  const routeFrom = routeCode(pickupAddress, "USC");
  const routeTo = routeCode(dropoffAddress, "LAX");

  return (
    <>
      <CreatePodTopBar currentStep={5} />
      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-8 pt-6">
        <div className="text-center">
          <ScheduleTypeEyebrow podType={podType} />
        </div>
        <SuccessHero />

        <div className="mt-7">
          <PodCreatedSummaryCard
            routeFrom={routeFrom}
            routeTo={routeTo}
            dateTime={dateTime}
            peopleVehicle={peopleVehicle}
            pricing={pricing}
          />
        </div>

        <div className="mt-5 grid gap-3">
          <Link
            href="/pods"
            className="flex h-14 w-full items-center justify-center gap-3 rounded-[12px] border border-[var(--rp-border-strong)] text-base font-black shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_34%,transparent)] transition hover:brightness-105"
            style={{
              background: "var(--rp-gradient-primary)",
              color: "var(--rp-primary-text)",
            }}
          >
            View my pod
            <ArrowRight className="h-5 w-5" />
          </Link>
          <SecondaryButton onClick={() => undefined}>
            Invite riders
            <UserPlus className="h-5 w-5" />
          </SecondaryButton>
          <button
            type="button"
            onClick={() => undefined}
            className="mx-auto flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-base font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <CalendarPlus className="h-5 w-5" />
            Add to calendar
          </button>
        </div>
      </main>
    </>
  );
}

export function CreatePodChooseType() {
  const todayIsoDate = getTodayIsoDate();
  const todayDate = parseIsoDateToLocalDate(todayIsoDate);
  const [step, setStep] = useState<CreateStep>(0);
  const [podType, setPodType] = useState<PodType>("scheduled");
  const [pickupAddress, setPickupAddress] = useState("USC Village, Rideshare zone");
  const [dropoffAddress, setDropoffAddress] = useState("LAX Terminal 3, Departures");
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [nextStopId, setNextStopId] = useState(1);
  const [dateTime, setDateTime] = useState<DateTimeState>({
    scheduleType: "ONE_TIME",
    date: formatCalendarLabel(formatCalendarDayLabel(todayDate)),
    selectedDate: todayIsoDate,
    selectedDay: todayDate.getDate(),
    time: "7:30 AM",
    flexibility: "\u00b1 15 min",
    recurringWeekdays: ["TU"],
    recurringPattern: "ONE_WAY",
    recurringLegs: [
      {
        dayOfWeek: "TU",
        legType: "OUTBOUND",
        departureTime: "08:00",
        originLabel: "USC Village",
        destinationLabel: "LAX Terminal 3",
      },
    ],
    recurringStartDate: todayIsoDate,
    recurringEndMode: "after",
    recurringOccurrenceLimit: 8,
    recurringEndDate: todayIsoDate,
  });
  const [peopleVehicle, setPeopleVehicle] = useState<PeopleVehicleState>({
    seatsAvailable: 4,
    bags: 2,
    rideOption: "hosts_choice",
    vehicleType: "Host's Choice",
    priceSource: "Host books the external ride under approved max fare",
  });
  const [pricing] = useState<PricingState>({
    estimatedFare: 84,
    estimatedShare: 21,
    maxFare: 96,
  });

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[34px] border border-[var(--rp-border)] bg-[var(--rp-bg)] shadow-[var(--rp-shadow-soft)] md:min-h-[760px]">
      {step === 5 ? (
        <SuccessStep
          podType={podType}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          dateTime={dateTime}
          peopleVehicle={peopleVehicle}
          pricing={pricing}
        />
      ) : step === 4 ? (
        <ReviewPodStep
          podType={podType}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          dateTime={dateTime}
          peopleVehicle={peopleVehicle}
          pricing={pricing}
          onBack={() => setStep(3)}
          onCreate={() => setStep(5)}
        />
      ) : step === 3 ? (
        <PeopleVehicleStep
          podType={podType}
          peopleVehicle={peopleVehicle}
          onPeopleVehicleChange={setPeopleVehicle}
          onBack={() => setStep(2)}
          onContinue={() => setStep(4)}
        />
      ) : step === 2 ? (
        <DateTimeStep
          podType={podType}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          dateTime={dateTime}
          onDateTimeChange={setDateTime}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      ) : step === 1 ? (
        <RouteStopsStep
          podType={podType}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          stops={stops}
          onBack={() => setStep(0)}
          onPickupChange={setPickupAddress}
          onDropoffChange={setDropoffAddress}
          onAddStop={() => {
            setStops((currentStops) => [...currentStops, { id: nextStopId, address: "" }]);
            setNextStopId((id) => id + 1);
          }}
          onStopChange={(id, value) => {
            setStops((currentStops) =>
              currentStops.map((stop) => (stop.id === id ? { ...stop, address: value } : stop)),
            );
          }}
          onRemoveStop={(id) => {
            setStops((currentStops) => currentStops.filter((stop) => stop.id !== id));
          }}
          onContinue={() => setStep(2)}
        />
      ) : (
        <>
          <CreatePodTopBar currentStep={0} />

          <main className="grid flex-1 grid-cols-[minmax(104px,32%)_1fr] px-6 pb-5 pt-7">
            <ThemeAwareHeroStrip />

            <section className="flex min-w-0 flex-col justify-center pl-6">
              <div>
                <h1 className="max-w-[210px] text-[30px] font-black leading-[1.08] tracking-[-0.03em] text-[var(--rp-text)]">
                  Choose your pod type
                </h1>
                <p className="mt-3 max-w-[210px] text-base font-medium leading-6 text-[var(--rp-muted)]">
                  You&apos;ll be the host and book the ride.
                </p>
              </div>

              <div className="mt-8 grid gap-4" role="radiogroup" aria-label="Pod type">
                {podTypes.map((item) => (
                  <PodTypeCard
                    key={item.id}
                    item={item}
                    selected={podType === item.id}
                    onSelect={() => {
                      setPodType(item.id);
                      setDateTime((current) => ({
                        ...current,
                        scheduleType: item.id === "recurring" ? "RECURRING" : "ONE_TIME",
                      }));
                    }}
                  />
                ))}
              </div>
            </section>
          </main>

          <footer className="fixed inset-x-0 bottom-[88px] z-50 mx-auto max-w-[430px] px-6 pb-4 pt-8 md:static md:mx-0 md:max-w-none md:px-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-0">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-28 bg-[linear-gradient(180deg,transparent,var(--rp-bg)_42%)] md:hidden" />
            <PrimaryButton onClick={() => setStep(1)}>Continue</PrimaryButton>
          </footer>
        </>
      )}
    </div>
  );
}
