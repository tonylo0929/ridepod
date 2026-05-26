"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  CalendarDays,
  CarFront,
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
  Smartphone,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import {
  calculateHkTaxiFareEstimate,
  suggestApprovedMaxFare,
  type EstimateConfidence,
  type EstimateSource,
  type HkTaxiZone,
  type RouteRiskLevel,
} from "@/lib/fare-estimates";
import {
  calculateMoneyProtection,
} from "@/lib/money-protection";
import {
  WEEKDAYS,
  generateRecurringOccurrences,
  type RecurringPattern,
  type RecurringPodTemplate,
  type RecurringScheduleLeg,
  type ScheduleType,
  type Weekday,
} from "@/lib/pod-schedule";

type PodType = "scheduled" | "recurring";
type CreateStep = 0 | 1 | 2 | 3 | 4 | 5;
type RecurringSchedulePage = "rides" | "settings";
type RouteStop = {
  id: number;
  address: string;
};
type RideOptionId =
  | "ride_app_fixed_quote"
  | "hosts_choice"
  | "large_ride"
  | "standard_ride"
  | "taxi_meter"
  | "taxi_partner_quote"
  | "comfort_premium";
type ActiveRideOptionId = Extract<RideOptionId, "ride_app_fixed_quote" | "taxi_meter" | "taxi_partner_quote">;
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
  taxiType: TaxiTypeId;
  largeLuggage: boolean;
  extraSpaceNeeded: boolean;
  wheelchairAccessibleRequested: boolean;
  stepFreeSupportRequested: boolean;
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
type TaxiTypeId =
  | "standard"
  | "compact_4_seat"
  | "large_luggage_4_seat"
  | "six_seat"
  | "electric"
  | "luggage_friendly"
  | "large_van"
  | "comfort"
  | "accessible";

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
  id: ActiveRideOptionId;
  title: string;
  description: string;
  helper: string;
  recurringHelper: string;
  icon: typeof CarFront;
  badge?: string;
  taxiTypeChips?: string[];
}> = [
  {
    id: "ride_app_fixed_quote",
    title: "Ride app / fixed quote",
    description: "Host books through an app or provider that shows the fare before booking.",
    helper: "Fresh quote required before booking.",
    recurringHelper: "Fresh quote required before each ride booking.",
    icon: ShieldCheck,
  },
  {
    id: "taxi_meter",
    title: "Taxi meter",
    description: "Host takes a street taxi with a meter. RidePod uses the taxi baseline to set the booking fare cap.",
    helper: "Meter photo or receipt required after ride.",
    recurringHelper: "Meter proof or taxi receipt required after each ride.",
    icon: CarFront,
  },
  {
    id: "taxi_partner_quote",
    title: "Taxi partner quote",
    description: "Licensed taxi partner quotes one price for the shared pod.",
    helper: "Demo mode. No real taxi dispatch or payout yet.",
    recurringHelper: "Demo mode. No real taxi dispatch or payout yet.",
    icon: CarFront,
    badge: "Future beta",
    taxiTypeChips: ["Standard", "Electric", "Luggage-friendly", "Large", "Comfort", "Accessible"],
  },
];

const rideConfirmationCopy: Record<ActiveRideOptionId, { title: string; body: string[]; checkbox: string }> = {
  ride_app_fixed_quote: {
    title: "Confirm External Ride",
    body: [
      "The host books the ride outside RidePod using an app or provider with an upfront quote.",
      "RidePod review applies only when the fresh quote is within the approved max. Final settlement uses the verified receipt.",
    ],
    checkbox:
      "I understand the fresh quote must be approved before booking, and final settlement uses the verified receipt.",
  },
  taxi_meter: {
    title: "Confirm Taxi Meter Ride",
    body: [
      "The host takes a metered taxi outside RidePod.",
      "RidePod uses the taxi baseline to set the booking fare cap. Final settlement uses verified meter proof or receipt.",
    ],
    checkbox:
      "I understand the taxi fare is settled from verified meter proof or receipt, within the approved max rules.",
  },
  taxi_partner_quote: {
    title: "Confirm shared taxi pod",
    body: [
      "RidePod will group riders first, then request one shared quote from a licensed taxi partner.",
      "Guests accept the quote before the ride proceeds.",
    ],
    checkbox:
      "I understand guests must accept the taxi quote before the ride proceeds.",
  },
};

function normalizeRideOptionId(rideOption: RideOptionId): ActiveRideOptionId {
  if (rideOption === "taxi_meter") return "taxi_meter";
  if (rideOption === "taxi_partner_quote") return "taxi_partner_quote";

  return "ride_app_fixed_quote";
}

function getRideOption(rideOption: RideOptionId) {
  const normalizedRideOption = normalizeRideOptionId(rideOption);

  return rideOptions.find((option) => option.id === normalizedRideOption) ?? rideOptions[0];
}

function getRideProofCopy(rideOption: RideOptionId) {
  const normalizedRideOption = normalizeRideOptionId(rideOption);

  if (normalizedRideOption === "taxi_partner_quote") {
    return {
      moneyIntro:
        "Beta uses mock payment state. No live payment or payout is enabled.",
      fareCapHelper: "Final guest price appears after taxi partner quote.",
      bookingProofStatus: "Shared quote pending",
      bookingProofHelper: "Guests accept the taxi partner quote before the ride can proceed.",
      reviewRows: [
        { label: "Main ride type", value: "Taxi" },
        { label: "Taxi quote mode", value: "Taxi partner quote" },
        {
          label: "Booking rule",
          value: "Guests accept quote before the ride can proceed.",
        },
        {
          label: "Settlement rule",
          value: "Payout stays pending until completion and dispute window review.",
        },
        { label: "Beta limit", value: "No real taxi dispatch yet. No real payout yet." },
      ],
    };
  }

  return normalizedRideOption === "taxi_meter"
    ? {
        moneyIntro:
          "RidePod uses the taxi baseline to set a fare cap. Guests authorize the max before the ride. Final charge uses verified meter proof or receipt.",
        fareCapHelper: "RidePod taxi baseline sets this booking fare cap.",
        bookingProofStatus: "No upfront quote required",
        bookingProofHelper: "Meter photo or taxi receipt required after ride.",
        reviewRows: [
          { label: "Ride option", value: "Taxi meter" },
          { label: "Booking proof", value: "No upfront quote required" },
          {
            label: "Booking rule",
            value: "Guests authorize the max charge before the ride. RidePod uses the taxi baseline as the booking fare cap.",
          },
          { label: "Settlement rule", value: "Final settlement uses verified meter proof or receipt." },
        ],
      }
    : {
        moneyIntro:
          "RidePod sets a fare cap. Host uploads proof before booking. Final charge uses the verified receipt.",
        fareCapHelper: "Quote must stay within this before host books.",
        bookingProofStatus: "Required screenshot later",
        bookingProofHelper: "Fresh quote after guests lock.",
        reviewRows: [
          { label: "Booking proof", value: "Required screenshot later" },
          { label: "Final charge", value: "Uses verified receipt and may be lower" },
        ],
      };
}

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
    ) ?? dateTime.recurringLegs.find((leg) => leg.legType === "OUTBOUND");
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
      ) ?? dateTime.recurringLegs.find((leg) => leg.legType === "RETURN");
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

function validateRecurringRideSchedule(dateTime: DateTimeState, pickupAddress: string, dropoffAddress: string) {
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

function validateRecurringDateSettings(dateTime: DateTimeState) {
  if (!dateTime.recurringStartDate.trim()) return "Start date is required.";
  if (dateTime.recurringEndMode === "after" && dateTime.recurringOccurrenceLimit <= 0) {
    return "Number of rides is required.";
  }
  if (dateTime.recurringEndMode === "on_date" && !dateTime.recurringEndDate.trim()) {
    return "End date is required.";
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

function getScheduleTimeSummary(dateTime: DateTimeState) {
  if (dateTime.scheduleType !== "RECURRING") return dateTime.time;

  const outbound = dateTime.recurringLegs.find((leg) => leg.legType === "OUTBOUND");
  return formatLocalTimeLabel(outbound?.departureTime ?? displayTimeToLocalTime(dateTime.time));
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
      label: "Pickup point",
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
      label: stops.length > 0 ? "Final dropoff point" : "Dropoff point",
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
  recurringPattern,
  onBack,
  onPickupChange,
  onDropoffChange,
  onAddStop,
  onStopChange,
  onRemoveStop,
  onRecurringPatternChange,
  onContinue,
}: {
  podType: PodType;
  pickupAddress: string;
  dropoffAddress: string;
  stops: RouteStop[];
  recurringPattern: RecurringPattern;
  onBack: () => void;
  onPickupChange: (value: string) => void;
  onDropoffChange: (value: string) => void;
  onAddStop: () => void;
  onStopChange: (id: number, value: string) => void;
  onRemoveStop: (id: number) => void;
  onRecurringPatternChange: (recurringPattern: RecurringPattern) => void;
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
              label="Pickup point"
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
              label="Dropoff point"
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

        {podType === "recurring" ? (
          <section className="mt-5 rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
            <p className="text-sm font-black text-[var(--rp-text)]">Return trip</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { id: "ONE_WAY" as const, label: "One-way" },
                { id: "BACK_AND_FORTH" as const, label: "Return Trip" },
              ].map((option) => {
                const selected = recurringPattern === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onRecurringPatternChange(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "min-h-12 rounded-xl border px-3 text-sm font-black transition",
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
          </section>
        ) : null}
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
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.66)] px-4 py-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:absolute md:inset-0 md:px-6">
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
                Each date is protected separately.
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Every ride has its own seat lock, proof, receipt, and settlement.
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
                Pick weekdays to preview upcoming rides.
              </p>
            )}
          </div>

          <section className="mt-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <h3 className="text-sm font-black text-[var(--rp-text)]">Change rules</h3>
            <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Before lock: flexible.
              {"\n"}After lock: may need guest approval.
              {"\n"}After proof/booking: update in RidePod first.
            </p>
          </section>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => onAcceptedChange(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
            />
            <span className="text-sm font-bold leading-6 text-[var(--rp-text)]">
              I understand each ride settles separately.
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
            className="min-h-12 rounded-2xl border border-[#f6c453] bg-[#f6c453] text-sm font-black text-[#071326] shadow-[0_14px_28px_rgba(246,196,83,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:border-[#8f7a3e] disabled:bg-[#6f6135] disabled:text-[#c9c3b6] disabled:shadow-none disabled:hover:brightness-100"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function RecurringScheduleFields({
  page,
  dateTime,
  onDateTimeChange,
  pickupAddress,
  dropoffAddress,
}: {
  page: RecurringSchedulePage;
  dateTime: DateTimeState;
  onDateTimeChange: (dateTime: DateTimeState) => void;
  pickupAddress: string;
  dropoffAddress: string;
}) {
  const visibleLegs = getRecurringLegsForSelection({ dateTime, pickupAddress, dropoffAddress });
  const selectedWeekdays = sortedWeekdays(dateTime.recurringWeekdays);
  const validationError =
    page === "rides"
      ? validateRecurringRideSchedule(dateTime, pickupAddress, dropoffAddress)
      : validateRecurringDateSettings(dateTime);
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

  const updateSharedLeg = (legType: RecurringScheduleLeg["legType"], patch: Partial<RecurringScheduleLeg>) => {
    const nextLegs = visibleLegs.map((leg) =>
      leg.legType === legType ? { ...leg, ...patch } : leg,
    );

    onDateTimeChange({ ...dateTime, recurringLegs: nextLegs });
  };

  const sharedOutbound = visibleLegs.find((leg) => leg.legType === "OUTBOUND");
  const sharedReturn = visibleLegs.find((leg) => leg.legType === "RETURN");

  return (
    <section className="mt-7 grid gap-6 border-t border-[var(--rp-border)] pt-7">
      {page === "rides" ? (
        <>
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

          <fieldset>
            <legend className="text-base font-bold text-[var(--rp-muted-strong)]">Trip pattern</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { id: "ONE_WAY" as const, label: "One-way" },
                { id: "BACK_AND_FORTH" as const, label: "Back-and-forth" },
              ].map((option) => {
                const selected = dateTime.recurringPattern === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updatePattern(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "min-h-12 rounded-xl border px-3 text-sm font-black transition",
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

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[var(--rp-muted-strong)]">
                {dateTime.recurringPattern === "BACK_AND_FORTH"
                  ? "Weekly ride times"
                  : "Weekly ride time"}
              </h2>
            </div>

            {selectedWeekdays.length === 0 ? (
              <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-sm font-bold text-[var(--rp-muted)]">
                Select at least one repeat day.
              </div>
            ) : sharedOutbound ? (
              <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
                <p className="text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
                  Same start time for every selected day.
                </p>
                <div className="mt-4 grid gap-3">
                  <RecurringLegEditor
                    title="Outbound ride"
                    leg={sharedOutbound}
                    onChange={(patch) => updateSharedLeg("OUTBOUND", patch)}
                  />
                  {dateTime.recurringPattern === "BACK_AND_FORTH" && sharedReturn ? (
                    <RecurringLegEditor
                      title="Return ride"
                      leg={sharedReturn}
                      onChange={(patch) => updateSharedLeg("RETURN", patch)}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {page === "settings" ? (
        <>
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

        </>
      ) : null}

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
  const [recurringSchedulePage, setRecurringSchedulePage] = useState<RecurringSchedulePage>("rides");
  const activeScheduleType: ScheduleType = podType === "recurring" ? "RECURRING" : "ONE_TIME";
  const recurringRideValidationError =
    activeScheduleType === "RECURRING"
      ? validateRecurringRideSchedule(dateTime, pickupAddress, dropoffAddress)
      : null;
  const recurringSettingsValidationError =
    activeScheduleType === "RECURRING"
      ? validateRecurringDateSettings(dateTime)
      : null;
  const activeRecurringValidationError =
    recurringSchedulePage === "rides"
      ? recurringRideValidationError
      : recurringRideValidationError ?? recurringSettingsValidationError;
  const canContinue =
    activeScheduleType === "ONE_TIME"
      ? dateTime.selectedDate.length > 0 && dateTime.time.length > 0
      : !activeRecurringValidationError;
  const handleBack = () => {
    if (activeScheduleType === "RECURRING" && recurringSchedulePage === "settings") {
      setRecurringSchedulePage("rides");
      return;
    }

    onBack();
  };
  const handleContinue = () => {
    if (activeScheduleType === "RECURRING" && recurringSchedulePage === "rides") {
      setRecurringSchedulePage("settings");
      return;
    }

    if (activeScheduleType === "RECURRING" && !recurringProtectionAccepted) {
      setShowRecurringProtectionDialog(true);
      return;
    }

    onContinue();
  };

  return (
    <>
      <CreatePodTopBar currentStep={2} onBack={handleBack} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-40 pt-8 md:pb-5">
        <section className="text-center">
          <ScheduleTypeEyebrow podType={podType} />
          <h1 className="text-[28px] font-black leading-tight text-[var(--rp-text)]">
            {activeScheduleType === "RECURRING"
              ? recurringSchedulePage === "settings"
                ? "Set start and end"
                : "When does this pod repeat?"
              : "When are you leaving?"}
          </h1>
          <p className="mt-3 text-base font-medium text-[var(--rp-muted)]">
            {activeScheduleType === "RECURRING"
              ? recurringSchedulePage === "settings"
                ? "Choose when this weekly template starts and ends."
                : "Create a weekly ride template for your recurring route."
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
            </section>
          </>
        ) : (
          <RecurringScheduleFields
            page={recurringSchedulePage}
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

type RideCategoryId = "taxi" | "ride_app";

const rideCategories: Array<{
  id: RideCategoryId;
  title: string;
  description: string;
  badge: string;
  helper: string;
  icon: typeof CarFront;
  disabled?: boolean;
}> = [
  {
    id: "taxi",
    title: "Taxi",
    description: "Licensed taxi partner quote for your shared pod.",
    badge: "Available in beta",
    helper: "Choose taxi type, luggage needs, and safety mode next.",
    icon: CarFront,
  },
  {
    id: "ride_app",
    title: "Ride app",
    description: "Group ride app bookings are coming later.",
    badge: "Coming soon",
    helper: "Start with taxi pods first. Ride app support will be added later.",
    icon: Smartphone,
    disabled: true,
  },
];

const TAXI_IMAGE_FALLBACK_SRC = "/images/ridepod/taxis/standard-4-seat.png";

const taxiTypeOptions: Array<{
  id: TaxiTypeId;
  title: string;
  description: string;
  maxRiders: number;
  maxBags: number;
  imageSrc: string;
  placeholderVisual?: boolean;
}> = [
  {
    id: "standard",
    title: "Standard 4-seat taxi",
    description: "Everyday shared taxi.",
    maxRiders: 4,
    maxBags: 3,
    imageSrc: TAXI_IMAGE_FALLBACK_SRC,
  },
  {
    id: "compact_4_seat",
    title: "Compact 4-seat taxi",
    description: "Good for lighter luggage.",
    maxRiders: 4,
    maxBags: 2,
    imageSrc: "/images/ridepod/taxis/compact-4-seat.png",
    placeholderVisual: true,
  },
  {
    id: "large_luggage_4_seat",
    title: "Large-luggage 4-seat taxi",
    description: "Best for airport trips.",
    maxRiders: 4,
    maxBags: 4,
    imageSrc: "/images/ridepod/taxis/large-luggage-4-seat.png",
    placeholderVisual: true,
  },
  {
    id: "six_seat",
    title: "6-seat taxi",
    description: "Best for bigger groups.",
    maxRiders: 6,
    maxBags: 2,
    imageSrc: "/images/ridepod/taxis/taxi-6-seat.png",
    placeholderVisual: true,
  },
];

// TODO: Replace placeholder taxi visuals with final assets:
// public/images/ridepod/taxis/compact-4-seat.png
// public/images/ridepod/taxis/large-luggage-4-seat.png
// public/images/ridepod/taxis/taxi-6-seat.png

function getTaxiTypeLabel(taxiType: TaxiTypeId) {
  const legacyLabels: Partial<Record<TaxiTypeId, string>> = {
    electric: "Electric taxi",
    luggage_friendly: "Luggage-friendly",
    large_van: "Large / van",
    comfort: "Comfort",
    accessible: "Accessible taxi",
  };

  return taxiTypeOptions.find((option) => option.id === taxiType)?.title ?? legacyLabels[taxiType] ?? "Standard 4-seat taxi";
}

function getRecommendedTaxiType(riders: number, bags: number): TaxiTypeId {
  if (riders >= 5) return "six_seat";
  if (bags >= 4) return "large_luggage_4_seat";
  if (bags <= 2) return "compact_4_seat";
  return "standard";
}

function RideCategoryCard({
  category,
  selected,
  onSelect,
}: {
  category: (typeof rideCategories)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = category.icon;
  const taxiCategory = category.id === "taxi";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={category.disabled}
      disabled={category.disabled}
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[52px_1fr_34px] items-center gap-3 rounded-[14px] border bg-[var(--rp-card)] p-3 text-left shadow-[var(--rp-shadow-soft)] transition",
        selected && taxiCategory
          ? "border-sky-400/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(2,6,23,0.02))] ring-1 ring-sky-400/45"
          : selected
            ? "border-[var(--rp-primary)] ring-1 ring-[var(--rp-primary)]"
            : "border-[var(--rp-border)] hover:border-[var(--rp-border-strong)]",
        category.disabled && "cursor-not-allowed opacity-70 hover:border-[var(--rp-border)]",
      )}
    >
      <span
        className={cn(
          "grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]",
          taxiCategory && "border border-sky-400/25 bg-sky-400/10 text-sky-300",
        )}
      >
        <Icon className="h-7 w-7" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-base font-black text-[var(--rp-text)]">
          <span>{category.title}</span>
          <span
            className={cn(
              "rounded-full border border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,var(--rp-card))] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--rp-primary)]",
              taxiCategory && "border-sky-400/35 bg-sky-400/10 text-sky-200",
            )}
          >
            {category.badge}
          </span>
        </span>
        <span className="mt-1 block text-xs font-semibold leading-4 text-[var(--rp-muted)]">
          {category.description}
        </span>
        <span className={cn("mt-1 block text-[11px] font-black leading-4 text-[var(--rp-primary)]", taxiCategory && "text-sky-300")}>
          {category.helper}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full border-2",
          selected && taxiCategory
            ? "border-sky-400 bg-sky-500 text-white"
            : selected
            ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
            : category.disabled
              ? "border-[var(--rp-border)] text-transparent"
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
  const selectedRideOption = normalizeRideOptionId(value);
  const selectedCategory: RideCategoryId =
    selectedRideOption === "taxi_partner_quote" || selectedRideOption === "taxi_meter"
      ? "taxi"
      : "ride_app";

  return (
    <section className="mt-7">
      <h2 className="text-base font-black text-[var(--rp-text)]">Ride category</h2>
      <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Ride category">
        {rideCategories.map((category) => (
          <RideCategoryCard
            key={category.id}
            category={category}
            selected={selectedCategory === category.id}
            onSelect={() => {
              if (category.disabled) return;
              onChange("taxi_partner_quote");
            }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted)]">
        Existing ride app, taxi meter, and taxi partner quote modes remain available for demo/internal flows.
      </p>
      {/* TODO: Add TAXI_PARTNER_QUOTE to Supabase ride_option enum in TAXI-2. */}
    </section>
  );
}

function TaxiTypeSelector({
  peopleVehicle,
  onPeopleVehicleChange,
}: {
  peopleVehicle: PeopleVehicleState;
  onPeopleVehicleChange: (peopleVehicle: PeopleVehicleState) => void;
}) {
  const selectedIndex = Math.max(
    0,
    taxiTypeOptions.findIndex((option) => option.id === peopleVehicle.taxiType),
  );
  const selectedOption = taxiTypeOptions[selectedIndex] ?? taxiTypeOptions[0];
  const recommendedTaxiType = getRecommendedTaxiType(peopleVehicle.seatsAvailable, peopleVehicle.bags);
  const recommendedOption =
    taxiTypeOptions.find((option) => option.id === recommendedTaxiType) ?? taxiTypeOptions[0];
  const hasAnyFit = taxiTypeOptions.some(
    (option) =>
      peopleVehicle.seatsAvailable <= option.maxRiders && peopleVehicle.bags <= option.maxBags,
  );
  const visibleTaxiOptions = taxiTypeOptions.map(
    (_, offset) => taxiTypeOptions[(selectedIndex + offset) % taxiTypeOptions.length],
  );
  const accessibilityRequired =
    peopleVehicle.wheelchairAccessibleRequested || peopleVehicle.stepFreeSupportRequested;
  const doesNotFit =
    peopleVehicle.seatsAvailable > selectedOption.maxRiders || peopleVehicle.bags > selectedOption.maxBags;

  function updateTaxiType(option: (typeof taxiTypeOptions)[number]) {
    onPeopleVehicleChange({
      ...peopleVehicle,
      taxiType: option.id,
      vehicleType: option.title,
    });
  }

  function updateRiders(nextRiders: number) {
    const riders = Math.min(6, Math.max(1, nextRiders));
    onPeopleVehicleChange({
      ...peopleVehicle,
      seatsAvailable: riders,
    });
  }

  function updateBags(nextBags: number) {
    const bags = Math.min(6, Math.max(0, nextBags));
    onPeopleVehicleChange({
      ...peopleVehicle,
      bags,
    });
  }

  function updateAccessibility(required: boolean) {
    onPeopleVehicleChange({
      ...peopleVehicle,
      wheelchairAccessibleRequested: required,
      stepFreeSupportRequested: required,
    });
  }

  function switchToRecommended() {
    updateTaxiType(recommendedOption);
  }

  function moveTaxiOption(direction: -1 | 1) {
    const nextIndex = (selectedIndex + direction + taxiTypeOptions.length) % taxiTypeOptions.length;
    updateTaxiType(taxiTypeOptions[nextIndex]);
  }

  return (
    <section className="mt-7 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <TaxiCapacityCounter
          label="Riders"
          value={peopleVehicle.seatsAvailable}
          min={1}
          max={6}
          icon={<UsersRound className="h-5 w-5" />}
          onChange={updateRiders}
        />
        <TaxiCapacityCounter
          label="Bags"
          value={peopleVehicle.bags}
          min={0}
          max={8}
          icon={<Luggage className="h-5 w-5" />}
          onChange={updateBags}
        />
        <div className="col-span-2 rounded-[18px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,rgba(15,23,42,0.78),rgba(2,6,23,0.72))] p-3 shadow-[var(--rp-shadow-soft)]">
          <p className="text-center text-sm font-black text-[var(--rp-text)]">Accessibility</p>
          <div className="mt-3 grid gap-2">
            {[
              { label: "No access needs", value: false },
              { label: "Access needed", value: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => updateAccessibility(option.value)}
                className={cn(
                  "min-h-11 rounded-[14px] border px-3 text-sm font-black leading-5 transition",
                  accessibilityRequired === option.value
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

      <div className="space-y-3 rounded-[24px] border border-sky-400/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(15,23,42,0.12)),var(--rp-card)] p-3 shadow-[0_18px_42px_rgba(14,165,233,0.1)]">
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            aria-label="Previous taxi type"
            onClick={() => moveTaxiOption(-1)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-primary)] hover:text-[var(--rp-primary)]"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
              Choose taxi type
            </p>
            <p className="mt-1 text-xs font-bold leading-4 text-[var(--rp-muted-strong)]">
              {selectedIndex + 1} of {taxiTypeOptions.length} · Recommended:{" "}
              <span className="text-[var(--rp-text)]">{recommendedOption.title}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Next taxi type"
            onClick={() => moveTaxiOption(1)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-primary)] hover:text-[var(--rp-primary)]"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="grid gap-3" role="radiogroup" aria-label="Taxi type">
          {visibleTaxiOptions.map((option) => {
            const selected = option.id === selectedOption.id;
            const recommended = option.id === recommendedOption.id;
            const fits =
              peopleVehicle.seatsAvailable <= option.maxRiders && peopleVehicle.bags <= option.maxBags;

            return (
              <TaxiTypeOptionCard
                key={option.id}
                option={option}
                selected={selected}
                recommended={recommended}
                fits={fits}
                onSelect={() => updateTaxiType(option)}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-[48px_1fr_48px] items-center gap-3 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-2">
          <button
            type="button"
            aria-label="Previous taxi type"
            onClick={() => moveTaxiOption(-1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-primary)] hover:text-[var(--rp-primary)]"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
              {selectedIndex + 1} of {taxiTypeOptions.length}
            </p>
            <p className="mt-1 truncate text-sm font-black text-[var(--rp-text)]">
              {selectedOption.title}
            </p>
          </div>
          <button
            type="button"
            aria-label="Next taxi type"
            onClick={() => moveTaxiOption(1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-primary)] hover:text-[var(--rp-primary)]"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      {doesNotFit || !hasAnyFit ? (
        <div className="rounded-[18px] border border-amber-300/35 bg-amber-300/10 p-3">
          <p className="text-sm font-bold leading-5 text-amber-100">
            {hasAnyFit
              ? "This taxi may not fit your group or luggage."
              : "No single taxi type clearly fits this group."}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-amber-100/85">
            {hasAnyFit
              ? "Try the recommended taxi type or split into two pods."
              : "This group may need a larger vehicle or split pod."}
          </p>
          {hasAnyFit ? (
            <button
              type="button"
              onClick={switchToRecommended}
              className="mt-3 min-h-10 w-full rounded-[14px] bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] transition hover:brightness-105"
            >
              Switch to recommended
            </button>
          ) : (
            <p className="mt-3 rounded-[12px] border border-amber-300/25 px-3 py-2 text-xs font-black text-amber-100">
              Reduce luggage or split pod.
            </p>
          )}
        </div>
      ) : null}

      <div className="rounded-[18px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-primary)_9%,var(--rp-card))] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
        <p>Taxi type depends on taxi partner availability.</p>
        <p>Luggage capacity is a guide and may vary by bag size.</p>
        {doesNotFit ? <p className="mt-2">Try the recommended taxi type or split into two pods.</p> : null}
        {accessibilityRequired ? (
          <p className="mt-2 text-sky-100">
            Accessibility support depends on taxi partner availability.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TaxiOptionImage({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    setImageSrc(src);
  }, [src]);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={360}
      height={190}
      sizes="(max-width: 640px) 320px, 360px"
      unoptimized
      className="h-full w-full object-contain"
      onError={() => setImageSrc(TAXI_IMAGE_FALLBACK_SRC)}
    />
  );
}

function TaxiTypeOptionCard({
  option,
  selected,
  recommended,
  fits,
  onSelect,
}: {
  option: (typeof taxiTypeOptions)[number];
  selected: boolean;
  recommended: boolean;
  fits: boolean;
  onSelect: () => void;
}) {
  const badgeLabel = recommended ? "Recommended" : fits ? "Fits your group" : "May not fit";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "grid w-full gap-3 rounded-[22px] border bg-[linear-gradient(135deg,rgba(15,23,42,0.74),rgba(2,6,23,0.54))] p-3 text-left transition min-[390px]:grid-cols-[42%_1fr_36px] min-[390px]:items-center",
        selected
          ? "border-[var(--rp-primary)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--rp-primary)_42%,transparent),0_16px_36px_rgba(250,204,21,0.12)]"
          : "border-[var(--rp-border)] hover:border-sky-400/45",
      )}
    >
      <span className="relative flex min-h-28 items-center justify-center overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_50%_70%,rgba(250,204,21,0.2),transparent_56%)]">
        {recommended ? (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-[var(--rp-primary)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--rp-primary-text)]">
            Recommended
          </span>
        ) : null}
        <TaxiOptionImage src={option.imageSrc} alt={option.title} />
      </span>

      <span className="min-w-0">
        {!recommended ? (
          <span
            className={cn(
              "mb-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase",
              fits
                ? "border-sky-400/35 bg-sky-400/10 text-sky-100"
                : "border-amber-300/45 bg-amber-300/15 text-amber-100",
            )}
          >
            {badgeLabel}
          </span>
        ) : null}
        <span className="block text-xl font-black leading-tight text-[var(--rp-text)]">
          {option.title}
        </span>
        <span className="mt-1 block text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
          {option.description}
        </span>
        <span className="mt-3 grid grid-cols-2 gap-3">
          <TaxiCapacityStat
            icon={<UsersRound className="h-5 w-5" />}
            value={`x${option.maxRiders}`}
            label={`Up to ${option.maxRiders} riders`}
          />
          <TaxiCapacityStat
            icon={<Luggage className="h-5 w-5" />}
            value={`x${option.maxBags}`}
            label={`Up to ${option.maxBags} bags`}
          />
        </span>
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "grid h-9 w-9 place-items-center justify-self-end rounded-full border-2",
          selected
            ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
            : "border-[var(--rp-muted)] text-transparent",
        )}
      >
        <Check className="h-5 w-5" />
      </span>
    </button>
  );
}

function TaxiCapacityCounter({
  label,
  value,
  min,
  max,
  icon,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  icon: ReactNode;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,rgba(15,23,42,0.78),rgba(2,6,23,0.72))] p-3 shadow-[var(--rp-shadow-soft)]">
      <p className="text-center text-sm font-black text-[var(--rp-text)]">{label}</p>
      <div className="mt-3 grid grid-cols-[36px_1fr_36px] items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--rp-input-border)] text-[var(--rp-muted-strong)] transition hover:text-[var(--rp-primary)] disabled:opacity-35"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="flex items-center justify-center gap-2 text-2xl font-black text-[var(--rp-text)]">
          <span className="text-[var(--rp-muted-strong)]">{icon}</span>
          <span>{value}</span>
        </div>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--rp-input-border)] text-[var(--rp-muted-strong)] transition hover:text-[var(--rp-primary)] disabled:opacity-35"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function TaxiCapacityStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-[var(--rp-text)]">
        <span className="text-[var(--rp-muted-strong)]">{icon}</span>
        <span className="text-2xl font-black">{value}</span>
      </div>
      <p className="mt-1 text-xs font-bold leading-4 text-[var(--rp-muted)]">{label}</p>
    </div>
  );
}

function TaxiNeedsSelector({
  peopleVehicle,
  onPeopleVehicleChange,
}: {
  peopleVehicle: PeopleVehicleState;
  onPeopleVehicleChange: (peopleVehicle: PeopleVehicleState) => void;
}) {
  const minBags = 0;
  const maxBags = 8;

  return (
    <section className="mt-7 rounded-[22px] border border-sky-400/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(15,23,42,0.12)),var(--rp-card)] p-4 shadow-[0_18px_42px_rgba(14,165,233,0.1)]">
      <div>
        <div className="flex items-center gap-2">
          <Luggage className="h-5 w-5 text-sky-300" />
          <h2 className="text-[26px] font-black leading-tight text-[var(--rp-text)]">Luggage and access needs</h2>
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Add bags, extra space, and accessibility requests before the taxi partner quotes.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Luggage count</p>
          <div className="mt-2 grid grid-cols-[44px_1fr_44px] items-center gap-3">
            <button
              type="button"
              aria-label="Decrease luggage count"
              disabled={peopleVehicle.bags <= minBags}
              onClick={() => onPeopleVehicleChange({ ...peopleVehicle, bags: Math.max(minBags, peopleVehicle.bags - 1) })}
              className="grid h-11 w-11 place-items-center rounded-full border border-sky-400/25 text-sky-300 transition hover:bg-sky-400/10 disabled:opacity-35"
            >
              <Minus className="h-5 w-5" />
            </button>
            <p className="text-center text-3xl font-black text-sky-300">{peopleVehicle.bags}</p>
            <button
              type="button"
              aria-label="Increase luggage count"
              disabled={peopleVehicle.bags >= maxBags}
              onClick={() => onPeopleVehicleChange({ ...peopleVehicle, bags: Math.min(maxBags, peopleVehicle.bags + 1) })}
              className="grid h-11 w-11 place-items-center rounded-full border border-sky-400/25 text-sky-300 transition hover:bg-sky-400/10 disabled:opacity-35"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {[
          ["largeLuggage", "Large luggage"] as const,
          ["extraSpaceNeeded", "Extra space needed"] as const,
          ["wheelchairAccessibleRequested", "Wheelchair-accessible taxi requested"] as const,
          ["stepFreeSupportRequested", "Step-free support requested"] as const,
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex gap-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]"
          >
            <input
              type="checkbox"
              checked={peopleVehicle[key]}
              onChange={(event) => onPeopleVehicleChange({ ...peopleVehicle, [key]: event.target.checked })}
              className="mt-1 h-4 w-4 accent-sky-500"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <p className="mt-4 rounded-[16px] border border-sky-400/25 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
        Taxi type and accessibility requests depend on taxi partner availability.
      </p>
      <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
        Women-only controls who can join the shared pod. It does not guarantee a female taxi driver unless supported by the taxi partner.
      </p>
    </section>
  );
}

function HostChoiceConfirmationDialog({
  rideOption,
  checked,
  onCheckedChange,
  onCancel,
  onConfirm,
}: {
  rideOption: ActiveRideOptionId;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = rideConfirmationCopy[rideOption];

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/62 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8 backdrop-blur-sm sm:place-items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="external-ride-confirm-title"
        className="w-full max-w-[390px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 id="external-ride-confirm-title" className="text-xl font-black leading-tight">
              {copy.title}
            </h2>
            {copy.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {paragraph}
              </p>
            ))}
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
            {copy.checkbox}
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
  const selectedRideOptionId = normalizeRideOptionId(peopleVehicle.rideOption);
  const isTaxiFlow = selectedRideOptionId === "taxi_partner_quote" || selectedRideOptionId === "taxi_meter";
  const [taxiDetailsPage, setTaxiDetailsPage] = useState<"category" | "type" | "needs">("category");
  const [showRideConfirm, setShowRideConfirm] = useState(false);
  const [rideConfirmChecked, setRideConfirmChecked] = useState(false);
  const [confirmedRideOption, setConfirmedRideOption] = useState<ActiveRideOptionId | null>(null);

  function handleContinue() {
    if (isTaxiFlow && taxiDetailsPage === "category") {
      setTaxiDetailsPage("type");
      return;
    }

    if (isTaxiFlow && taxiDetailsPage === "type") {
      setTaxiDetailsPage("needs");
      return;
    }

    if (confirmedRideOption !== selectedRideOptionId) {
      setRideConfirmChecked(false);
      setShowRideConfirm(true);
      return;
    }

    onContinue();
  }

  return (
    <>
      <CreatePodTopBar
        currentStep={3}
        onBack={() => {
          if (isTaxiFlow && taxiDetailsPage === "needs") {
            setTaxiDetailsPage("type");
            return;
          }

          if (isTaxiFlow && taxiDetailsPage === "type") {
            setTaxiDetailsPage("category");
            return;
          }

          onBack();
        }}
      />

      <main className="people-vehicle-layout scrollbar-hide min-h-0 flex-1 overflow-y-auto">
        <VehicleDarkPanel />
        <section className="people-vehicle-content flex min-h-0 flex-col px-6 pb-10 pt-8">
          <div className="text-center">
            <ScheduleTypeEyebrow podType={podType} />
            <h1 className="text-[30px] font-black leading-tight text-[var(--rp-text)]">
              {isTaxiFlow && taxiDetailsPage === "needs"
                ? "Luggage and access needs"
                : isTaxiFlow && taxiDetailsPage === "type"
                  ? "What taxi type fits your group?"
                  : "How do you want to ride?"}
            </h1>
            <p className="mx-auto mt-2 max-w-[280px] text-center text-base font-medium leading-6 text-[var(--rp-muted)]">
              {isTaxiFlow && taxiDetailsPage === "needs"
                ? "Tell taxi partners what your group needs before they quote."
                : isTaxiFlow && taxiDetailsPage === "type"
                  ? "Choose based on riders, luggage, and access needs."
                : "RidePod groups riders first, then helps the group request the right ride."}
            </p>
          </div>

          <div className="mt-7">
            {isTaxiFlow && taxiDetailsPage === "needs" ? (
              <TaxiNeedsSelector
                peopleVehicle={peopleVehicle}
                onPeopleVehicleChange={onPeopleVehicleChange}
              />
            ) : isTaxiFlow && taxiDetailsPage === "type" ? (
              <>
                <TaxiTypeSelector
                  peopleVehicle={peopleVehicle}
                  onPeopleVehicleChange={onPeopleVehicleChange}
                />
                <VehicleLightArt />
              </>
            ) : (
              <>
                <SeatCounter
                  value={peopleVehicle.seatsAvailable}
                  onChange={(seatsAvailable) =>
                    onPeopleVehicleChange({ ...peopleVehicle, seatsAvailable })
                  }
                />
                <RideOptionSelector
                  value={peopleVehicle.rideOption}
                  onChange={(rideOption) =>
                    {
                      setTaxiDetailsPage("category");
                      setRideConfirmChecked(false);
                      setConfirmedRideOption(null);
                      onPeopleVehicleChange({
                        ...peopleVehicle,
                        rideOption,
                        vehicleType:
                          normalizeRideOptionId(rideOption) === "taxi_partner_quote"
                            ? getTaxiTypeLabel(peopleVehicle.taxiType)
                            : getRideOption(rideOption).title,
                      });
                    }
                  }
                />
                <VehicleLightArt />
              </>
            )}
          </div>

          <div className="mt-auto pt-7">
            <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
          </div>
        </section>
      </main>

      {showRideConfirm ? (
        <HostChoiceConfirmationDialog
          rideOption={selectedRideOptionId}
          checked={rideConfirmChecked}
          onCheckedChange={setRideConfirmChecked}
          onCancel={() => {
            setRideConfirmChecked(false);
            setShowRideConfirm(false);
          }}
          onConfirm={() => {
            setConfirmedRideOption(selectedRideOptionId);
            setShowRideConfirm(false);
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
      </div>
    </section>
  );
}

function getCurrentEstimateHelper(money: MoneyProtectionState) {
  return money.estimateSource === "HOST_QUOTE_SCREENSHOT" ? "Host quote" : "RidePod route baseline";
}

type PricingExplanation = {
  title: string;
  body: string;
};

const pricingExplanations: Record<string, PricingExplanation> = {
  currentEstimate: {
    title: "Current estimate",
    body: "This is RidePod's best estimate before the ride is booked. It may come from RidePod's route baseline, the host's estimate, or the host's uploaded quote. It is not the final charge. Platform fee is 10% of each guest's fare share, with a HK$6 minimum to cover payment processing and platform protection. Final settlement uses the verified receipt after the ride.",
  },
  expectedGuestCost: {
    title: "Expected guest cost",
    body: "This is the estimated amount each guest may pay if the pod fills as planned. It includes the estimated fare share and system-controlled fees. The final amount may be lower or higher, but it cannot exceed the max charge unless guests approve an increase.",
  },
  maxChargePerGuest: {
    title: "Max charge per guest",
    body: "This is the most a guest can be charged for this pod unless they approve a higher fare. It is calculated from the booking fare cap, the minimum locked guests, the host riding with the group, and system-controlled fees.",
  },
  bookingFareCap: {
    title: "Booking fare cap",
    body: "This is the maximum total fare allowed for reviewed booking. The host must upload a quote within this cap before booking. If the quote is higher, guests must approve a higher max before the ride continues in RidePod.",
  },
};

function PricingExplanationDialog({
  explanation,
  onBack,
}: {
  explanation: PricingExplanation;
  onBack: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/62 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8 backdrop-blur-sm sm:place-items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-explanation-title"
        className="w-full max-w-[390px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 id="pricing-explanation-title" className="text-xl font-black leading-tight">
              {explanation.title}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              {explanation.body}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-5 min-h-12 w-full rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
        >
          Back
        </button>
      </section>
    </div>
  );
}

function PricingSummaryCard({ money, rideOption }: { money: MoneyProtectionState; rideOption: RideOptionId }) {
  const hostRidingMoney = { ...money, hostIsRiding: true };
  const [activeExplanation, setActiveExplanation] = useState<PricingExplanation | null>(null);
  const rideProofCopy = getRideProofCopy(rideOption);
  const estimatedFareCents = dollarsToCents(money.estimatedTotalFare);
  const approvedMaxCents = dollarsToCents(money.approvedMaxTotalFare);
  const safeTargetSeats = Math.max(1, Math.floor(money.targetSeats));
  const safeMinSeats = Math.max(1, Math.floor(money.minSeatsToBook));
  const protection = calculateMoneyProtection({
    estimatedTotalFareCents: estimatedFareCents,
    approvedMaxTotalFareCents: approvedMaxCents,
    targetSeats: safeTargetSeats,
    minSeatsToBook: safeMinSeats,
    hostIsRiding: true,
  });

  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 text-center shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-lg font-black text-[var(--rp-text)]">Pricing summary</h2>
      <dl className="mt-5 grid gap-3 text-center">
        <button
          type="button"
          onClick={() => setActiveExplanation(pricingExplanations.currentEstimate)}
          className="rounded-2xl border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_88%,var(--rp-background))] p-3 text-center transition hover:border-[var(--rp-border-strong)]"
        >
          <dt className="text-xs font-semibold text-[var(--rp-muted)]">Current estimate</dt>
          <dd className="mt-1 text-2xl font-black text-[var(--rp-text)]">
            {formatCentsFixed(estimatedFareCents)}
          </dd>
          <dd className="text-xs font-semibold text-[var(--rp-muted-strong)]">
            {getCurrentEstimateHelper(money)}
          </dd>
        </button>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveExplanation(pricingExplanations.expectedGuestCost)}
            className="rounded-2xl border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_88%,var(--rp-background))] p-3 text-center transition hover:border-[var(--rp-border-strong)]"
          >
            <dt className="text-xs font-black text-[var(--rp-primary)]">Expected guest cost</dt>
            <dd className="mt-1 text-xl font-black text-[var(--rp-primary)]">
              {formatCentsFixed(protection.expectedTotalPerRiderCents)}
            </dd>
            <dd className="text-xs font-semibold text-[var(--rp-muted-strong)]">
              if {getIdealPodSizeSummary(hostRidingMoney)} ride
            </dd>
          </button>
          <button
            type="button"
            onClick={() => setActiveExplanation(pricingExplanations.maxChargePerGuest)}
            className="rounded-2xl border border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,var(--rp-card))] p-3 text-center transition hover:brightness-105"
          >
            <dt className="text-xs font-black text-[var(--rp-primary)]">Max charge per guest</dt>
            <dd className="mt-1 text-xl font-black text-[var(--rp-primary)]">
              {formatCentsFixed(protection.protectedMaxChargePerRiderCents)}
            </dd>
            <dd className="text-xs font-semibold text-[var(--rp-muted-strong)]">
              unless higher max approved
            </dd>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setActiveExplanation(pricingExplanations.bookingFareCap)}
          className="rounded-2xl border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_88%,var(--rp-background))] p-3 text-center transition hover:border-[var(--rp-border-strong)]"
        >
          <dt className="text-xs font-semibold text-[var(--rp-muted)]">Booking fare cap</dt>
          <dd className="mt-1 text-lg font-black text-[var(--rp-text)]">
            {formatCentsFixed(approvedMaxCents)}
          </dd>
          <dd className="text-xs font-semibold text-[var(--rp-muted-strong)]">
            {rideProofCopy.fareCapHelper}
          </dd>
        </button>
      </dl>
      <p className="mx-auto mt-5 max-w-[320px] text-sm font-medium leading-5 text-[var(--rp-muted-strong)]">
        Guests authorize the max charge before the host books. Final settlement uses the verified receipt and may be lower.
      </p>
      {activeExplanation ? (
        <PricingExplanationDialog
          explanation={activeExplanation}
          onBack={() => setActiveExplanation(null)}
        />
      ) : null}
    </section>
  );
}

function getLuggageNeedsSummary(peopleVehicle: PeopleVehicleState) {
  const parts = [`${peopleVehicle.bags} ${pluralize(peopleVehicle.bags, "bag")}`];
  if (peopleVehicle.largeLuggage) parts.push("large luggage");

  return parts.join(" / ");
}

function getAccessibilityNeedsSummary(peopleVehicle: PeopleVehicleState) {
  const needs = [
    peopleVehicle.extraSpaceNeeded ? "Extra space needed" : null,
    peopleVehicle.wheelchairAccessibleRequested ? "Wheelchair-accessible taxi requested" : null,
    peopleVehicle.stepFreeSupportRequested ? "Step-free support requested" : null,
  ].filter(Boolean);

  return needs.length ? needs.join(", ") : "Not specified";
}

function TaxiReviewSummaryCard({
  peopleVehicle,
  pickupAddress,
  dropoffAddress,
  dateTime,
  genderMode,
  accessMode,
}: {
  peopleVehicle: PeopleVehicleState;
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  genderMode: GenderMode;
  accessMode: AccessMode;
}) {
  const selectedAccessMode = accessModeOptions.find((option) => option.id === accessMode)?.label ?? "Open";
  const taxiType = getTaxiTypeLabel(peopleVehicle.taxiType);
  const summaryRows = [
    ["Route", `${pickupAddress || "Pickup point"} \u2192 ${dropoffAddress || "Dropoff point"}`],
    ["Date/time", `${getScheduleDateSummary(dateTime)} / ${getScheduleTimeSummary(dateTime)}`],
    ["Taxi type", taxiType],
    ["Seats / guests", `${peopleVehicle.seatsAvailable} seats total`],
    ...(dateTime.scheduleType === "RECURRING" ? [["Trip pattern", getRecurringWeekdaySummary(dateTime)]] : []),
  ];
  const quoteSteps = [
    ["Group first", "Guests join before quote request."],
    ["Partner quote", "A licensed taxi partner quotes one shared price."],
    ["Guests accept", "The ride proceeds after guests accept the quote."],
    ["Review window", "Payout stays pending during the dispute window."],
  ];
  const taxiNeeds = [
    ["Taxi type", taxiType],
    ["Luggage", getLuggageNeedsSummary(peopleVehicle)],
    ["Accessibility", getAccessibilityNeedsSummary(peopleVehicle)],
    ["Pickup point", pickupAddress || "Not specified"],
    ["Dropoff point", dropoffAddress || "Not specified"],
  ];
  const joinChips: string[] = [
    genderMode === "women_only" ? "Women-only" : "Mixed pod",
    accessMode !== "open" ? selectedAccessMode : null,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <section className="grid gap-4">
      <section className="rounded-[22px] border border-sky-400/30 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.16)),var(--rp-card)] p-4 shadow-[0_18px_42px_rgba(14,165,233,0.1)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">Shared taxi pod</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
              RidePod groups riders first, then requests one shared quote from a licensed taxi partner.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-200">
              Taxi
            </span>
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-200">
              Taxi partner quote
            </span>
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-200">
              Beta
            </span>
          </div>
        </div>
        <dl className="mt-4 grid gap-2">
          {summaryRows.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-3">
              <dt className="text-xs font-black uppercase tracking-[0.1em] text-sky-300">{label}</dt>
              <dd className="mt-1 text-sm font-black leading-5 text-[var(--rp-text)]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-text)]">How the taxi quote works</h2>
        <div className="mt-3 grid gap-2">
          {quoteSteps.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
              <p className="text-sm font-black text-[var(--rp-text)]">{title}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-text)]">Taxi needs</h2>
        <dl className="mt-3 grid gap-2">
          {taxiNeeds.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-3">
              <dt className="text-xs font-black uppercase tracking-[0.1em] text-sky-300">{label}</dt>
              <dd className="mt-1 text-sm font-black leading-5 text-[var(--rp-text)]">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
          Taxi type and accessibility requests depend on taxi partner availability.
        </p>
      </section>

      <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-text)]">Who can join</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {joinChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-1 text-xs font-black text-[var(--rp-muted-strong)]"
            >
              {chip}
            </span>
          ))}
        </div>
        {genderMode === "women_only" ? (
          <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            Women-only controls who can join the pod. It does not guarantee a female taxi driver.
          </p>
        ) : null}
      </section>

      <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <p className="text-sm font-black leading-6 text-[var(--rp-text)]">
          No live payment or payout is enabled. Guests accept the selected taxi quote before the ride proceeds.
        </p>
        <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          Final guest price appears after the taxi partner quote.
        </p>
      </section>
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
  const lockedGuests = Math.max(1, Math.floor(money.minSeatsToBook));
  const personLabel = money.hostIsRiding ? "guest" : "rider";

  return `${lockedGuests} ${pluralize(lockedGuests, personLabel)} lock`;
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
  peopleVehicle,
  onMoneyChange,
}: {
  money: MoneyProtectionState;
  peopleVehicle: PeopleVehicleState;
  onMoneyChange: (money: MoneyProtectionState) => void;
}) {
  function commitMoney(nextMoney: MoneyProtectionState) {
    onMoneyChange(syncSystemEstimate({ ...nextMoney, hostIsRiding: true }));
  }

  function updateMoney(key: MoneyProtectionNumberKey, value: number) {
    const maxLockedGuests = Math.max(1, Math.floor(money.targetSeats) - 1);
    const nextValue = Math.max(
      key === "ridepodFee" || key === "tollEstimate" || key === "waitingMinutes" || key === "trafficBufferPercent" ? 0 : 1,
      Number.isFinite(value) ? value : 0,
    );
    const boundedValue = key === "minSeatsToBook" ? Math.min(nextValue, maxLockedGuests) : nextValue;
    const nextMoney = {
      ...money,
      hostIsRiding: true,
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
  const maxLockedGuests = Math.max(1, Math.floor(money.targetSeats) - 1);
  const rideProofCopy = getRideProofCopy(peopleVehicle.rideOption);

  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Money Protection</h2>
          <p className="mt-2 text-sm font-medium leading-5 text-[var(--rp-muted-strong)]">
            {rideProofCopy.moneyIntro}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-center">
          <p className="text-sm font-black text-[var(--rp-text)]">Booking fare cap</p>
          <p className="mt-1 text-2xl font-black text-[var(--rp-primary)]">
            {formatCentsFixed(suggestedApprovedMaxCents)}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
            {rideProofCopy.fareCapHelper}
          </p>
        </div>

        <div className="grid gap-1.5 text-center text-sm font-black text-[var(--rp-text)]">
          <span>Ideal pod size</span>
          <div className="rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-3 text-center text-base font-semibold text-[var(--rp-text)]">
            {money.targetSeats}
          </div>
          <p className="text-xs font-bold text-[var(--rp-muted-strong)]">
            Total people, including the host.
          </p>
        </div>

        {[
          ["Minimum locked guests", "minSeatsToBook"],
        ].map(([label, key]) => (
          <label key={key} className="grid gap-1.5 text-sm font-black text-[var(--rp-text)]">
            {label}
            <input
              type="number"
              min={1}
              max={maxLockedGuests}
              value={money[key as MoneyProtectionNumberKey]}
              onChange={(event) => updateMoney(key as MoneyProtectionNumberKey, Number(event.target.value))}
              className="h-11 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-center text-base font-semibold text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
            />
            <span className="text-xs font-bold text-[var(--rp-muted-strong)]">
              Guests needed before host can book.
            </span>
          </label>
        ))}

        <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-[var(--rp-text)]">Booking proof</p>
            <p className="text-right text-[var(--rp-primary)]">{rideProofCopy.bookingProofStatus}</p>
          </div>
          <p className="mt-1">{rideProofCopy.bookingProofHelper}</p>
        </div>
      </div>
    </section>
  );
}

function PreviewMoneyProtectionCard({
  money,
  peopleVehicle,
}: {
  money: MoneyProtectionState;
  peopleVehicle: PeopleVehicleState;
}) {
  const hostRidingMoney = { ...money, hostIsRiding: true };
  const rideProofCopy = getRideProofCopy(peopleVehicle.rideOption);
  const safeTargetSeats = Math.max(1, money.targetSeats);
  const safeMinSeats = Math.max(1, money.minSeatsToBook);
  const approvedMaxCents = dollarsToCents(money.approvedMaxTotalFare);
  const protection = calculateMoneyProtection({
    estimatedTotalFareCents: dollarsToCents(money.estimatedTotalFare),
    approvedMaxTotalFareCents: approvedMaxCents,
    targetSeats: safeTargetSeats,
    minSeatsToBook: safeMinSeats,
    hostIsRiding: true,
  });
  const rows = [
    {
      label: "Expected guest cost",
      value: `${formatCents(protection.expectedTotalPerRiderCents)} / rider if ${getIdealPodSizeSummary(hostRidingMoney)} fill`,
    },
    {
      label: "Max charge per guest",
      value: `${formatCents(protection.protectedMaxChargePerRiderCents)} / rider if ${getMinimumLockedSummary(hostRidingMoney)}`,
    },
    ...rideProofCopy.reviewRows,
  ];

  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">
            {normalizeRideOptionId(peopleVehicle.rideOption) === "taxi_partner_quote" ? "Payment status" : "Money Protection"}
          </h2>
          <p className="mt-2 text-sm font-medium leading-5 text-[var(--rp-muted-strong)]">
            {normalizeRideOptionId(peopleVehicle.rideOption) === "taxi_partner_quote"
              ? "Beta uses mock payment state. No live payment or payout is enabled."
              : "Riders authorize the protected max before the host books. They may pay less after the final receipt is verified."}
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
  const selectedAccessMode = accessModeOptions.find((option) => option.id === accessMode)?.label ?? "Open";

  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Who can join</h2>
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
              Women-only controls who can join the pod. It does not guarantee a female taxi driver.
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
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-1 text-xs font-black text-[var(--rp-muted-strong)]">
              {genderMode === "women_only" ? "Women-only" : "Mixed pod"}
            </span>
            {accessMode !== "open" ? (
              <span className="rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-1 text-xs font-black text-[var(--rp-muted-strong)]">
                {selectedAccessMode}
              </span>
            ) : null}
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
  createLabel = "Create Pod",
  panelLabels = ["Pricing summary", "Money Protection", "Safety & Trust", "Preview your pod"],
}: {
  currentPanel: number;
  onPanelChange: (panel: number) => void;
  onCreate: () => void;
  canProceed: boolean;
  blockedReason?: string;
  createLabel?: string;
  panelLabels?: string[];
}) {
  const isFirst = currentPanel === 0;
  const isLast = currentPanel === panelLabels.length - 1;
  const moneyProtectionPanelIndex = 1;
  const nextBlocked = currentPanel === moneyProtectionPanelIndex && !canProceed;

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
              if (!canProceed && index > moneyProtectionPanelIndex) return;
              onPanelChange(index);
            }}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition",
              currentPanel === index ? "w-7 bg-[var(--rp-primary)]" : "bg-[var(--rp-card-muted)]",
              !canProceed && index > moneyProtectionPanelIndex ? "cursor-not-allowed opacity-45" : "",
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
            {createLabel}
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

function CreatePodConfirmationDialog({
  rideOption,
  checked,
  onCheckedChange,
  onCancel,
  onCreate,
}: {
  rideOption: RideOptionId;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const normalizedRideOption = normalizeRideOptionId(rideOption);
  const copy =
    normalizedRideOption === "taxi_partner_quote"
      ? {
          title: "Create this taxi pod?",
          body: [
            "Guests can join and lock their seats after the pod is created.",
            "RidePod groups riders first, then requests one shared quote from a licensed taxi partner.",
            "Demo mode: no live payment or payout.",
          ],
          checkbox: "I understand guests must accept the taxi quote before the ride proceeds.",
          submitLabel: "Create taxi pod",
        }
      : normalizedRideOption === "taxi_meter"
        ? {
            title: "Create this taxi meter pod?",
            body: [
              "Guests can join and lock their seats after the pod is created.",
              "No upfront quote is required for taxi meter rides. After the ride, upload a clear meter photo or taxi receipt for settlement.",
            ],
            checkbox: "I understand meter proof or receipt is required after the ride.",
            submitLabel: "Create Pod",
          }
        : {
            title: "Create this pod?",
            body: [
              "Guests can join and lock their seats after the pod is created.",
              "Before you book the external ride, RidePod will ask you to upload a fresh quote or fare screenshot. You do not need to upload it now.",
              "After the ride, final settlement uses the verified receipt.",
            ],
            checkbox: "I understand quote proof is required before booking and receipt proof is required after the ride.",
            submitLabel: "Confirm",
          };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm md:absolute"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-pod-confirm-title"
    >
      <section className="w-full max-w-[390px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 id="create-pod-confirm-title" className="text-2xl font-black leading-tight">
              {copy.title}
            </h2>
            <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              {copy.body.map((paragraph) => (
                <p key={paragraph} className="text-left">{paragraph}</p>
              ))}
            </div>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-sm font-black leading-6 text-[var(--rp-muted-strong)]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--rp-primary)]"
          />
          <span>{copy.checkbox}</span>
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
            onClick={onCreate}
            className={cn(
              "min-h-12 rounded-2xl border text-sm font-black transition hover:brightness-105 disabled:cursor-not-allowed",
              checked
                ? "border-[#f6c453] bg-[#f6c453] text-[#071326] shadow-[0_16px_34px_rgba(246,196,83,0.28)]"
                : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
            )}
          >
            {copy.submitLabel}
          </button>
        </div>
      </section>
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
  const rideOption = getRideOption(peopleVehicle.rideOption);
  const rows = [
    {
      icon: UsersRound,
      label: `${peopleVehicle.seatsAvailable} seats total`,
      value: `${Math.max(0, peopleVehicle.seatsAvailable - 3)} seat open`,
    },
    {
      icon: CarFront,
      label: "Ride option",
      value:
        normalizeRideOptionId(peopleVehicle.rideOption) === "taxi_partner_quote"
          ? `${getTaxiTypeLabel(peopleVehicle.taxiType)} / ${peopleVehicle.bags} bags`
          : `${rideOption.title} / ${peopleVehicle.bags} bags`,
    },
    {
      icon: MapPin,
      label: "Route",
      value: `${routeFrom} \u2192 ${routeTo}`,
    },
    {
      icon: MapPin,
      label: "Pickup point",
      value: pickup || "USC Village rideshare zone",
    },
    {
      icon: MapPin,
      label: "Dropoff point",
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

function formatReviewDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getRecurringWeekdaySummary(dateTime: DateTimeState) {
  const weekdays = sortedWeekdays(dateTime.recurringWeekdays)
    .map((weekday) => recurringWeekdayOptions.find((option) => option.id === weekday)?.label ?? weekday);

  return weekdays.length > 0 ? `Weekly on ${weekdays.join(", ")}` : "Weekly";
}

function getRecurringEndRuleSummary(dateTime: DateTimeState) {
  if (dateTime.recurringEndMode === "after") {
    return `Ends after ${Math.max(1, dateTime.recurringOccurrenceLimit)} rides`;
  }

  if (dateTime.recurringEndMode === "on_date") {
    return `Ends on ${formatReviewDate(dateTime.recurringEndDate)}`;
  }

  return "No end date";
}

function getRecurringRideLine(leg?: RecurringScheduleLeg) {
  if (!leg) return "Set ride time and route";

  return `${formatLocalTimeLabel(leg.departureTime)} \u2014 ${leg.originLabel} \u2192 ${leg.destinationLabel}`;
}

function getRecurringOccurrenceLine(occurrence: ReturnType<typeof generateRecurringOccurrences>[number]) {
  const localTime = occurrence.departureAt.split("T")[1]?.slice(0, 5) ?? "";
  const legLabel = occurrence.recurringLegType === "RETURN" ? "Return" : "Outbound";

  return `${formatDateForPreview(occurrence.occurrenceDate)} \u00b7 ${formatLocalTimeLabel(localTime)} \u00b7 ${legLabel}`;
}

function RecurringReviewCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-lg font-black text-[var(--rp-text)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RecurringPodReview({
  dateTime,
  pickupAddress,
  dropoffAddress,
  peopleVehicle,
}: {
  dateTime: DateTimeState;
  pickupAddress: string;
  dropoffAddress: string;
  peopleVehicle: PeopleVehicleState;
}) {
  const recurringLegs = getRecurringLegsForSelection({ dateTime, pickupAddress, dropoffAddress });
  const outboundLeg = recurringLegs.find((leg) => leg.legType === "OUTBOUND");
  const returnLeg = recurringLegs.find((leg) => leg.legType === "RETURN");
  const rideOption = getRideOption(peopleVehicle.rideOption);
  const upcomingRides = generateRecurringOccurrences(
    buildPreviewTemplate({ dateTime, pickupAddress, dropoffAddress }),
    { defaultOccurrenceLimit: 6, generatedAt: new Date(0).toISOString() },
  ).slice(0, 6);

  return (
    <section className="grid gap-4">
      <RecurringReviewCard title="Template summary">
        <div className="grid gap-2 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
          <p className="text-[var(--rp-primary)]">Recurring pod</p>
          <p>{getRecurringWeekdaySummary(dateTime)}</p>
          <p>Starts {formatReviewDate(dateTime.recurringStartDate)}</p>
          <p>{getRecurringEndRuleSummary(dateTime)}</p>
        </div>
      </RecurringReviewCard>

      <RecurringReviewCard title="Trip pattern">
        <div className="grid gap-3 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
          {dateTime.recurringPattern === "BACK_AND_FORTH" ? (
            <>
              <p className="text-[var(--rp-primary)]">Back-and-forth</p>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-primary)]">Outbound</p>
                <p className="mt-1 text-[var(--rp-text)]">{getRecurringRideLine(outboundLeg)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-primary)]">Return</p>
                <p className="mt-1 text-[var(--rp-text)]">{getRecurringRideLine(returnLeg)}</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-[var(--rp-primary)]">One-way</p>
              <p className="text-[var(--rp-text)]">{getRecurringRideLine(outboundLeg)}</p>
            </>
          )}
        </div>
      </RecurringReviewCard>

      <RecurringReviewCard title="Ride option">
        <div className="grid gap-2 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
          <p className="text-[var(--rp-text)]">{rideOption.title}</p>
          {normalizeRideOptionId(peopleVehicle.rideOption) === "taxi_partner_quote" ? (
            <p>Taxi type: {getTaxiTypeLabel(peopleVehicle.taxiType)}</p>
          ) : null}
          <p>{rideOption.recurringHelper}</p>
        </div>
      </RecurringReviewCard>

      <RecurringReviewCard title="Upcoming rides">
        {upcomingRides.length > 0 ? (
          <div className="grid gap-2">
            {upcomingRides.map((occurrence) => (
              <div
                key={occurrence.id}
                className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2"
              >
                <p className="text-sm font-black text-[var(--rp-text)]">{getRecurringOccurrenceLine(occurrence)}</p>
                <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">
                  {occurrence.originLabel} \u2192 {occurrence.destinationLabel}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-[var(--rp-muted-strong)]">
            Pick at least one weekday to preview rides.
          </p>
        )}
      </RecurringReviewCard>

      <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
          <div>
            <h2 className="text-lg font-black text-[var(--rp-text)]">Protected separately</h2>
            <p className="mt-2 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
              Each ride has its own guest lock, proof, receipt, and settlement.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function CreateRecurringPodConfirmationDialog({
  checked,
  onCheckedChange,
  onCancel,
  onCreate,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm md:absolute"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-recurring-pod-confirm-title"
    >
      <section className="w-full max-w-[390px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 id="create-recurring-pod-confirm-title" className="text-2xl font-black leading-tight">
              Create recurring pod?
            </h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              This creates a weekly template. Each ride date will lock guests, collect proof, and settle separately.
            </p>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-sm font-black leading-6 text-[var(--rp-muted-strong)]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--rp-primary)]"
          />
          <span>I understand each ride settles separately.</span>
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
            onClick={onCreate}
            className={cn(
              "min-h-12 rounded-2xl border text-sm font-black transition hover:brightness-105 disabled:cursor-not-allowed",
              checked
                ? "border-[#f6c453] bg-[#f6c453] text-[#071326] shadow-[0_16px_34px_rgba(246,196,83,0.28)]"
                : "border-[#8f7a3e] bg-[#6f6135] text-[#c9c3b6]",
            )}
          >
            Create Pod
          </button>
        </div>
      </section>
    </div>
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
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [createConfirmChecked, setCreateConfirmChecked] = useState(false);
  const defaultTaxiEstimate = calculateHkTaxiFareEstimate({
    zone: "URBAN",
    distanceMeters: 6000,
    baggageCount: peopleVehicle.bags,
  });
  const defaultApprovedMaxCents = suggestApprovedMaxFare(defaultTaxiEstimate.totalFareCents, "NORMAL");
  const [moneyProtection, setMoneyProtection] = useState<MoneyProtectionState>({
    estimatedTotalFare: centsToDollars(defaultTaxiEstimate.totalFareCents),
    approvedMaxTotalFare: centsToDollars(defaultApprovedMaxCents),
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
  const isTaxiPartnerQuoteReview = normalizeRideOptionId(peopleVehicle.rideOption) === "taxi_partner_quote";
  const safetyPanelIndex = isTaxiPartnerQuoteReview ? 1 : 2;
  const previewPanelIndex = isTaxiPartnerQuoteReview ? 2 : 3;
  const moneyProtectionError =
    moneyProtection.approvedMaxTotalFare < moneyProtection.estimatedTotalFare
      ? `Approved max must be at least ${formatMoney(moneyProtection.estimatedTotalFare)} before you continue.`
      : null;

  if (podType === "recurring") {
    return (
      <>
        <CreatePodTopBar currentStep={4} onBack={onBack} />

        <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-7">
          <section className="text-center">
            <ScheduleTypeEyebrow podType={podType} />
            <h1 className="text-[26px] font-black leading-tight text-[var(--rp-text)]">
              Review recurring pod
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--rp-muted)]">
              Check the weekly template before creating your pod.
            </p>
          </section>

          <div className="mt-5">
            <RecurringPodReview
              dateTime={dateTime}
              pickupAddress={pickupAddress}
              dropoffAddress={dropoffAddress}
              peopleVehicle={peopleVehicle}
            />
          </div>

          <div className="mt-5 grid gap-3">
            <PrimaryButton
              onClick={() => {
                setCreateConfirmChecked(false);
                setShowCreateConfirm(true);
              }}
            >
              Create Recurring Pod
            </PrimaryButton>
            <p className="text-center text-sm font-medium text-[var(--rp-muted)]">
              You can move back to edit details before publishing.
            </p>
          </div>
        </main>

        {showCreateConfirm ? (
          <CreateRecurringPodConfirmationDialog
            checked={createConfirmChecked}
            onCheckedChange={setCreateConfirmChecked}
            onCancel={() => {
              setCreateConfirmChecked(false);
              setShowCreateConfirm(false);
            }}
            onCreate={() => {
              if (!createConfirmChecked) return;
              setShowCreateConfirm(false);
              onCreate();
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <CreatePodTopBar currentStep={4} onBack={onBack} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-7">
        {reviewPanel === previewPanelIndex ? null : (
          <section className="text-center">
            <ScheduleTypeEyebrow podType={podType} />
            <h1 className="text-[26px] font-black leading-tight text-[var(--rp-text)]">
              Final check
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--rp-muted)]">
              Confirm the details before creating your pod.
            </p>
          </section>
        )}

        <div className={cn("grid gap-4", reviewPanel === previewPanelIndex ? "mt-0" : "mt-5")}>
          {reviewPanel === 0 ? (
            isTaxiPartnerQuoteReview ? (
              <TaxiReviewSummaryCard
                peopleVehicle={peopleVehicle}
                pickupAddress={pickupAddress}
                dropoffAddress={dropoffAddress}
                dateTime={dateTime}
                genderMode={genderMode}
                accessMode={accessMode}
              />
            ) : (
              <PricingSummaryCard money={moneyProtection} rideOption={peopleVehicle.rideOption} />
            )
          ) : null}

          {!isTaxiPartnerQuoteReview && reviewPanel === 1 ? (
            <MoneyProtectionPanel
              money={moneyProtection}
              peopleVehicle={peopleVehicle}
              onMoneyChange={setMoneyProtection}
            />
          ) : null}

          {reviewPanel === safetyPanelIndex ? (
            <SafetyTrustPanel
              genderMode={genderMode}
              accessMode={accessMode}
              onGenderModeChange={setGenderMode}
              onAccessModeChange={setAccessMode}
            />
          ) : null}

          {reviewPanel === previewPanelIndex ? (
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
              {isTaxiPartnerQuoteReview ? null : (
                <PreviewMoneyProtectionCard money={moneyProtection} peopleVehicle={peopleVehicle} />
              )}
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
          onCreate={() => {
            setCreateConfirmChecked(false);
            setShowCreateConfirm(true);
          }}
          canProceed={isTaxiPartnerQuoteReview ? true : !moneyProtectionError}
          blockedReason={isTaxiPartnerQuoteReview ? undefined : moneyProtectionError ?? undefined}
          createLabel={isTaxiPartnerQuoteReview ? "Create taxi pod" : "Create Pod"}
          panelLabels={
            isTaxiPartnerQuoteReview
              ? ["Taxi review", "Who can join", "Preview your pod"]
              : undefined
          }
        />

        <p className="mt-3 text-center text-sm font-medium text-[var(--rp-muted)]">
          You can move back to edit details before publishing.
        </p>
      </main>

      {showCreateConfirm ? (
        <CreatePodConfirmationDialog
          rideOption={peopleVehicle.rideOption}
          checked={createConfirmChecked}
          onCheckedChange={setCreateConfirmChecked}
          onCancel={() => {
            setCreateConfirmChecked(false);
            setShowCreateConfirm(false);
          }}
          onCreate={() => {
            if (!createConfirmChecked) return;
            setShowCreateConfirm(false);
            onCreate();
          }}
        />
      ) : null}
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
      value: `${getScheduleDateSummary(dateTime)} \u2022 ${getScheduleTimeSummary(dateTime)}`,
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
      label: normalizeRideOptionId(peopleVehicle.rideOption) === "taxi_partner_quote" ? "Taxi type" : "Ride option",
      value:
        normalizeRideOptionId(peopleVehicle.rideOption) === "taxi_partner_quote"
          ? getTaxiTypeLabel(peopleVehicle.taxiType)
          : peopleVehicle.vehicleType,
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
    bags: 3,
    taxiType: "standard",
    largeLuggage: false,
    extraSpaceNeeded: false,
    wheelchairAccessibleRequested: false,
    stepFreeSupportRequested: false,
    rideOption: "taxi_partner_quote",
    vehicleType: "Standard taxi",
    priceSource: "Licensed taxi partner quote for the shared pod",
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
          recurringPattern={dateTime.recurringPattern}
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
          onRecurringPatternChange={(recurringPattern) =>
            setDateTime((current) => ({ ...current, recurringPattern }))
          }
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

