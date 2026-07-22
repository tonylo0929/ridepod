"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { useRidePodAvatarPreference, type RidePodAvatarPreference } from "@/components/animal-avatar";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  Clock3,
  Info,
  Loader2,
  LocateFixed,
  Luggage,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Plane,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import {
  calculateHkTaxiFareEstimate as calculateMoneyHkTaxiFareEstimate,
  suggestApprovedMaxFare,
  type EstimateConfidence,
  type EstimateSource,
  type HkTaxiZone,
  type RouteRiskLevel,
} from "@/lib/fare-estimates";
import {
  calculateHkTaxiFareEstimate,
  formatHkdRange,
  type TaxiType,
} from "@/lib/hkTaxiFare";
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
import { useAuth } from "@/providers/AuthProvider";
import { isRidePodAdminUser } from "@/lib/admin-access";
import { getRideAppAccessNotice, getRideAppTrustSummary } from "@/lib/ride-app-trust";
import {
  calculateRideAppJoinFee,
  calculateRidePodFee,
  formatHKD,
  ridePodPricingConfig,
  ridePodPricingCopy,
} from "@/lib/ridepod-pricing";
import { saveCreatedHomeRide } from "@/lib/created-home-rides";
import { createUserNotificationOnce } from "@/lib/notifications/ridepod-notifications";
import type { HomeRide } from "@/lib/home-ride-mock";

type PodType = "scheduled" | "airport" | "recurring";
type CreateStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type AirportDirection = "to_airport" | "from_airport";
type AirportDetailsSlice = "direction" | "flight" | "luggage";
type AirportLuggageState = {
  largeSuitcases: number;
  cabinBags: number;
  specialItems: string;
  note: string;
};
type AirportDetailsState = {
  airportDirection: AirportDirection;
  flightNumber: string;
  flightFrom: string;
  flightTo: string;
  flightTimeLabel: string;
  airportTerminal: string;
  airportHall: string;
  airportLuggage: AirportLuggageState;
};
type RecurringScheduleSubstep = "weekdays" | "times";
type RouteStop = {
  id: number;
  address: string;
};
type RouteCoordinates = {
  lng: number;
  lat: number;
};
type RoutePointSelection = {
  label: string;
  coordinates: RouteCoordinates;
};
type MapboxPlaceSuggestion = RoutePointSelection & {
  id: string;
  shortLabel: string;
};
type MapboxFeature = {
  id?: string;
  place_name?: string;
  text?: string;
  center?: [number, number];
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: {
      longitude?: number;
      latitude?: number;
    };
  };
};
type MapboxFeatureCollection = {
  features?: MapboxFeature[];
};
type MapboxDirectionsResponse = {
  routes?: Array<{
    geometry?: {
      type?: string;
      coordinates?: [number, number][];
    };
  }>;
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

const defaultRideAppJoinFeeCents = calculateRideAppJoinFee(ridePodPricingConfig);
const defaultRideAppJoinFeeLabel = defaultRideAppJoinFeeCents > 0 ? formatHKD(defaultRideAppJoinFeeCents) : "Waived";
const defaultRideAppHostCreateFeeCents = calculateRidePodFee(ridePodPricingConfig.hostCreateFees.rideAppSelfSettle, 0);
const defaultRideAppCreateFeeLabel = defaultRideAppHostCreateFeeCents > 0 ? formatHKD(defaultRideAppHostCreateFeeCents) : "Free";
const defaultRideAppCreateFeeSentence =
  defaultRideAppHostCreateFeeCents > 0
    ? `Host create fee: ${defaultRideAppCreateFeeLabel}. No live payment is taken in this version.`
    : "Free to create.";

const hk18DistrictOptions = [
  "Central and Western",
  "Eastern",
  "Southern",
  "Wan Chai",
  "Kowloon City",
  "Kwun Tong",
  "Sham Shui Po",
  "Wong Tai Sin",
  "Yau Tsim Mong",
  "Islands",
  "Kwai Tsing",
  "North",
  "Sai Kung",
  "Sha Tin",
  "Tai Po",
  "Tsuen Wan",
  "Tuen Mun",
  "Yuen Long",
] as const;

type Hk18District = (typeof hk18DistrictOptions)[number];

const hk18DistrictCenters: Record<Hk18District, RouteCoordinates> = {
  "Central and Western": { lat: 22.285, lng: 114.15 },
  Eastern: { lat: 22.284, lng: 114.225 },
  Southern: { lat: 22.248, lng: 114.158 },
  "Wan Chai": { lat: 22.277, lng: 114.173 },
  "Kowloon City": { lat: 22.328, lng: 114.191 },
  "Kwun Tong": { lat: 22.313, lng: 114.225 },
  "Sham Shui Po": { lat: 22.331, lng: 114.159 },
  "Wong Tai Sin": { lat: 22.342, lng: 114.195 },
  "Yau Tsim Mong": { lat: 22.304, lng: 114.17 },
  Islands: { lat: 22.309, lng: 113.918 },
  "Kwai Tsing": { lat: 22.354, lng: 114.103 },
  North: { lat: 22.501, lng: 114.128 },
  "Sai Kung": { lat: 22.382, lng: 114.271 },
  "Sha Tin": { lat: 22.384, lng: 114.188 },
  "Tai Po": { lat: 22.45, lng: 114.166 },
  "Tsuen Wan": { lat: 22.371, lng: 114.114 },
  "Tuen Mun": { lat: 22.391, lng: 113.977 },
  "Yuen Long": { lat: 22.445, lng: 114.022 },
};

const newTerritoriesDistricts = new Set<string>([
  "Kwai Tsing",
  "North",
  "Sai Kung",
  "Sha Tin",
  "Tai Po",
  "Tsuen Wan",
  "Tuen Mun",
  "Yuen Long",
]);

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
  pickupVenue: string;
  pickupDistrict: string;
  dropoffDistrict: string;
  rideAppProvider: RideAppProvider;
  rideAppProviderOther: string;
  estimatedRideAppFare: string;
  splitMethod: SelfSettleSplitMethod;
  paymentMethod: SelfSettlePaymentMethod;
  rideAppBookingTrigger: RideAppBookingTrigger;
  rideAppMinimumConfirmedRiders: number;
  rideAppFarePaymentTiming: RideAppFarePaymentTiming;
  rideAppAcceptedPaymentMethods: SelfSettlePaymentMethod[];
  rideAppPaymentMethodOther: string;
};
type PricingState = {
  estimatedFare: number;
  estimatedShare: number;
  maxFare: number;
};
type GenderMode = "women_only" | "mixed";
type AccessMode = "open" | "verified_only" | "community_only" | "high_trust_only" | "invite_only";
type WhoCanJoinId = "women_only" | "mixed" | "verified_only" | "invite_only";
type TaxiPartnerPreference = "standard" | "higher_trust" | "airport_luggage_friendly" | "accessibility_support";
type StopRequestPolicy = "direct_only" | "host_approved_before_quote";
type RideAppProvider = "uber" | "didi" | "hk_taxi" | "amap" | "other";
type SelfSettleSplitMethod = "equal_split" | "pay_host_after_ride" | "agree_in_chat";
type SelfSettlePaymentMethod = "cash" | "payme" | "fps" | "other";
type RideAppBookingTrigger = "all_seats_confirmed" | "minimum_riders_confirmed";
type RideAppFarePaymentTiming = "after_ride";
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

const baseCreateSteps = ["People & Vehicle", "Choose Type", "Route & Stops", "Estimated Cost", "Date & Time", "Review", "Success"];
const rideAppCreateSteps = [
  "People & Vehicle",
  "Choose Type",
  "Route & Stops",
  "Estimated Cost",
  "Date & Time",
  "Booking & Payment Rules",
  "Review",
  "Success",
];
const airportCreateSteps = [
  "People & Vehicle",
  "Choose Type",
  "Airport Details",
  "Route & Stops",
  "Estimated Cost",
  "Date & Time",
  "Review",
  "Success",
];
const airportRideAppCreateSteps = [
  "People & Vehicle",
  "Choose Type",
  "Airport Details",
  "Route & Stops",
  "Estimated Cost",
  "Date & Time",
  "Booking & Payment Rules",
  "Review",
  "Success",
];

const podTypes: Array<{
  id: PodType;
  title: string;
  sublabel: string;
  description: string;
  icon: "calendar" | "airport" | "repeat";
  accent?: "airport";
}> = [
  {
    id: "scheduled",
    title: "Scheduled",
    sublabel: "",
    description: "For a single trip on a specific date and time.",
    icon: "calendar",
  },
  {
    id: "recurring",
    title: "Recurring",
    sublabel: "Repeat on specific days or a schedule.",
    description: "",
    icon: "repeat",
  },
  {
    id: "airport",
    title: "Airport",
    sublabel: "",
    description: "Match around airport trips, flights, and luggage.",
    icon: "airport",
    accent: "airport",
  },
];

type CalendarDay = {
  label: string;
  day: number;
  inMonth: boolean;
  isoDate: string;
  disabled: boolean;
};

const timeMinutes = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

const weekdayLabels = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const stopRequestPolicyOptions: Array<{
  id: StopRequestPolicy;
  title: string;
  description: string;
  helper?: string;
}> = [
  {
    id: "direct_only",
    title: "Direct route only",
    description: "Riders cannot propose extra stops.",
  },
  {
    id: "host_approved_before_quote",
    title: "Host-approved stop requests",
    description: "Joined riders can propose one extra stop before taxi quote acceptance.",
    helper: "Approved stops may change the taxi partner quote.",
  },
];
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
    title: "Ride App",
    description: `${defaultRideAppCreateFeeSentence} Fee applies only when riders confirm ride details.`,
    helper: "Coordination-only. RidePod does not collect or protect the ride fare.",
    recurringHelper: "Create pod is free. RidePod fee applies only when someone joins an eligible pod.",
    icon: Smartphone,
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
    title: "Taxi Partner Quote",
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
    title: "Confirm self-settle ride app pod",
    body: [
      "RidePod only helps the group coordinate and chat.",
      `${defaultRideAppCreateFeeSentence} Riders demo-confirm or waive the ${defaultRideAppJoinFeeLabel} RidePod join fee when they confirm ride details.`,
      ridePodPricingCopy.rideAppJoinFeeHelper,
    ],
    checkbox:
      "I understand this pod uses self-settle ride app coordination.",
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
      "RidePod will request one shared quote from a licensed taxi partner after guests join.",
      "Guests must accept the selected quote before the ride proceeds.",
    ],
    checkbox: "I understand how taxi quotes work.",
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
        "Mock/demo state only. No live payment or payout is enabled.",
      fareCapHelper: "Final guest price appears after taxi partner quote.",
      bookingProofStatus: "Shared quote pending",
      bookingProofHelper: "Guests accept the taxi partner quote before the ride can proceed.",
      reviewRows: [
        { label: "Main ride type", value: "Taxi" },
        { label: "Taxi quote mode", value: "Taxi Partner Quote" },
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
          `${defaultRideAppCreateFeeSentence} Riders demo-confirm or waive the ${defaultRideAppJoinFeeLabel} RidePod join fee when they confirm ride details. ${ridePodPricingCopy.rideAppJoinFeeHelper}`,
        fareCapHelper: "RidePod does not verify, collect, split, or protect the final ride app fare.",
        bookingProofStatus: "Optional fare estimate screenshot",
        bookingProofHelper: "RidePod does not verify ride app screenshots.",
        reviewRows: [
          { label: "Ride type", value: "Ride App" },
          { label: "Payment rule", value: `${defaultRideAppCreateFeeSentence} Riders demo-confirm or waive the ${defaultRideAppJoinFeeLabel} RidePod join fee when they confirm ride details. ${ridePodPricingCopy.rideAppJoinFeeHelper}` },
          { label: "Screenshot", value: "Optional, local/mock only, not verified by RidePod." },
          { label: "Protection", value: "No fare protection is provided." },
        ],
      };
}

const genderModeOptions: Array<{ id: GenderMode; label: string }> = [
  { id: "women_only", label: "Women-only" },
  { id: "mixed", label: "Open pod" },
];

const accessModeOptions: Array<{ id: AccessMode; label: string }> = [
  { id: "open", label: "Open" },
  { id: "verified_only", label: "Verified-only" },
  { id: "community_only", label: "Community-only" },
  { id: "high_trust_only", label: "High-trust-only" },
  { id: "invite_only", label: "Invite-only" },
];

const whoCanJoinOptions: Array<{
  id: WhoCanJoinId;
  title: string;
  description: string;
  helper?: string;
}> = [
  {
    id: "women_only",
    title: "Women-only pod",
    description: "Only eligible women can join this pod, including the host.",
    helper: "Rider eligibility only.",
  },
  {
    id: "mixed",
    title: "Open pod",
    description: "All eligible riders are welcome.",
    helper: "Anyone who matches the pod rules can join.",
  },
];

const taxiPartnerPreferenceOptions: Array<{
  id: TaxiPartnerPreference;
  title: string;
  description: string;
}> = [
  {
    id: "standard",
    title: "Standard taxi partner",
    description: "Any available licensed taxi partner who can support this ride.",
  },
  {
    id: "higher_trust",
    title: "Higher-trust taxi partner",
    description: "Prioritize partners with stronger RidePod trust signals.",
  },
  {
    id: "airport_luggage_friendly",
    title: "Airport / luggage-friendly",
    description: "Prioritize partners comfortable with airport trips and luggage.",
  },
  {
    id: "accessibility_support",
    title: "Accessibility support",
    description: "Request a partner who can support access needs when available.",
  },
];

const selfSettleSplitMethodOptions: Array<{
  id: SelfSettleSplitMethod;
  title: string;
  description: string;
}> = [
  {
    id: "equal_split",
    title: "Equal split",
    description: "Split the estimated ride app fare evenly.",
  },
  {
    id: "pay_host_after_ride",
    title: "Pay host after ride",
    description: "Riders settle the final fare after the ride with the host/booker.",
  },
  {
    id: "agree_in_chat",
    title: "Agree in chat",
    description: "Use pod chat to agree on split and after-ride payment details.",
  },
];

const rideAppProviderOptions: Array<{
  id: RideAppProvider;
  title: string;
}> = [
  { id: "uber", title: "Uber" },
  { id: "didi", title: "DiDi" },
  { id: "hk_taxi", title: "HKTaxi" },
  { id: "amap", title: "Amap" },
  { id: "other", title: "Other" },
];

const selfSettlePaymentMethodOptions: Array<{
  id: SelfSettlePaymentMethod;
  title: string;
}> = [
  { id: "cash", title: "Cash" },
  { id: "payme", title: "PayMe" },
  { id: "fps", title: "FPS" },
  { id: "other", title: "Other" },
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

  const days = Array.from({ length: 42 }, (_, index) => {
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

function parseEstimatedCost(value: string) {
  const normalizedValue = value.replace(/[^\d.]/g, "");
  const amount = Number(normalizedValue);

  return Number.isFinite(amount) ? amount : 0;
}

function sanitizeEstimatedCostInput(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function formatEstimatedCostDraft(value: number) {
  return Number.isFinite(value) && value > 0 ? String(Math.round(value)) : "";
}

function formatEstimatedCostTextDraft(value: string) {
  const amount = parseEstimatedCost(value);

  return amount > 0 ? formatEstimatedCostDraft(amount) : "";
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

function isHk18District(value: string): value is Hk18District {
  return hk18DistrictOptions.includes(value as Hk18District);
}

function getDistrictCenter(value: string) {
  return isHk18District(value) ? hk18DistrictCenters[value] : null;
}

function estimateDistrictDistanceMeters(pickupDistrict: string, dropoffDistrict: string) {
  const pickupCenter = getDistrictCenter(pickupDistrict);
  const dropoffCenter = getDistrictCenter(dropoffDistrict);
  if (!pickupCenter || !dropoffCenter) return null;

  if (pickupDistrict === dropoffDistrict) return 3200;

  const earthRadiusKm = 6371;
  const degreesToRadians = Math.PI / 180;
  const latDelta = (dropoffCenter.lat - pickupCenter.lat) * degreesToRadians;
  const lngDelta = (dropoffCenter.lng - pickupCenter.lng) * degreesToRadians;
  const pickupLat = pickupCenter.lat * degreesToRadians;
  const dropoffLat = dropoffCenter.lat * degreesToRadians;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(pickupLat) * Math.cos(dropoffLat) * Math.sin(lngDelta / 2) ** 2;
  const straightLineKm = 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
  const roadDistanceKm = Math.max(4.5, straightLineKm * 1.38 + 1.2);

  return Math.round(roadDistanceKm * 1000);
}

function inferTaxiZoneFromDistricts(pickupDistrict: string, dropoffDistrict: string): HkTaxiZone {
  if (pickupDistrict === "Islands" || dropoffDistrict === "Islands") return "LANTAU";
  if (newTerritoriesDistricts.has(pickupDistrict) && newTerritoriesDistricts.has(dropoffDistrict)) {
    return "NEW_TERRITORIES";
  }

  return "URBAN";
}

function inferRouteRiskFromDistricts(pickupDistrict: string, dropoffDistrict: string): RouteRiskLevel {
  const crossesHarbour =
    ["Central and Western", "Eastern", "Southern", "Wan Chai"].includes(pickupDistrict) !==
    ["Central and Western", "Eastern", "Southern", "Wan Chai"].includes(dropoffDistrict);

  return pickupDistrict === "Islands" || dropoffDistrict === "Islands" || crossesHarbour
    ? "AIRPORT_OR_TUNNEL"
    : "NORMAL";
}

function getDistrictTaxiFareSuggestion(peopleVehicle: PeopleVehicleState) {
  const distanceMeters = estimateDistrictDistanceMeters(
    peopleVehicle.pickupDistrict,
    peopleVehicle.dropoffDistrict,
  );
  if (!distanceMeters) return null;

  const zone = inferTaxiZoneFromDistricts(peopleVehicle.pickupDistrict, peopleVehicle.dropoffDistrict);
  const routeRiskLevel = inferRouteRiskFromDistricts(peopleVehicle.pickupDistrict, peopleVehicle.dropoffDistrict);
  const tollEstimateCents = routeRiskLevel === "AIRPORT_OR_TUNNEL" ? 2500 : 0;
  const taxiEstimate = calculateMoneyHkTaxiFareEstimate({
    zone,
    distanceMeters,
    baggageCount: peopleVehicle.bags,
    tollEstimateCents,
    trafficBufferPercent: routeRiskLevel === "AIRPORT_OR_TUNNEL" ? 8 : 5,
  });

  return {
    totalFareCents: taxiEstimate.totalFareCents,
    totalFare: Math.round(centsToDollars(taxiEstimate.totalFareCents)),
    distanceMeters,
    zone,
    routeRiskLevel,
    estimateConfidence: taxiEstimate.estimateConfidence,
    ruleLabel: taxiEstimate.ruleLabel,
  };
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
  if (podType === "recurring") return "Recurring";
  if (podType === "airport") return "Airport";
  return "Scheduled";
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

function isAirportAddress(address: string) {
  const normalizedAddress = address.toUpperCase();

  return (
    normalizedAddress.includes("AIRPORT") ||
    normalizedAddress.includes("TERMINAL") ||
    normalizedAddress.includes("LAX") ||
    normalizedAddress.includes("HKIA")
  );
}

function isAirportTaxiRoute(pickupAddress: string, dropoffAddress: string) {
  return isAirportAddress(pickupAddress) || isAirportAddress(dropoffAddress);
}

function createDefaultAirportDetails(): AirportDetailsState {
  return {
    airportDirection: "to_airport",
    flightNumber: "",
    flightFrom: "Hong Kong (HKG)",
    flightTo: "",
    flightTimeLabel: "",
    airportTerminal: "HKIA Terminal 1 Departures",
    airportHall: "",
    airportLuggage: {
      largeSuitcases: 1,
      cabinBags: 1,
      specialItems: "",
      note: "",
    },
  };
}

function getAirportDirectionLabel(direction: AirportDirection) {
  return direction === "to_airport" ? "To airport" : "From airport";
}

function syncAirportDirectionDefaults(details: AirportDetailsState, direction: AirportDirection): AirportDetailsState {
  if (direction === "to_airport") {
    return {
      ...details,
      airportDirection: direction,
      flightFrom: details.flightFrom.trim() || "Hong Kong (HKG)",
      flightTo: details.flightTo === "Hong Kong (HKG)" ? "" : details.flightTo,
      airportTerminal: details.airportTerminal.trim() || "HKIA Terminal 1 Departures",
      airportHall: details.airportHall === "HKIA Arrival Hall A" ? "" : details.airportHall,
    };
  }

  return {
    ...details,
    airportDirection: direction,
    flightFrom: details.flightFrom === "Hong Kong (HKG)" ? "" : details.flightFrom,
    flightTo: details.flightTo.trim() || "Hong Kong (HKG)",
    airportTerminal: details.airportTerminal === "HKIA Terminal 1 Departures" ? "" : details.airportTerminal,
    airportHall: details.airportHall.trim() || "HKIA Arrival Hall A",
  };
}

function getAirportTerminalHallValue(details: AirportDetailsState) {
  const value = details.airportDirection === "to_airport" ? details.airportTerminal : details.airportHall;
  return value.trim() || "Not provided";
}

function getAirportLuggageSummary(details: AirportDetailsState) {
  const { largeSuitcases, cabinBags, specialItems, note } = details.airportLuggage;
  const parts = [
    `${largeSuitcases} large ${pluralize(largeSuitcases, "suitcase")}`,
    `${cabinBags} cabin ${pluralize(cabinBags, "bag")}`,
  ];
  const special = specialItems.trim();
  if (special) parts.push(special);
  const luggageNote = note.trim();
  if (luggageNote) parts.push(luggageNote);

  return parts.join(" / ");
}

function getAirportSpecialItems(details: AirportDetailsState) {
  return details.airportLuggage.specialItems
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAirportDetailsSliceComplete(details: AirportDetailsState, slice: AirportDetailsSlice) {
  if (slice === "direction") return Boolean(details.airportDirection);

  if (slice === "flight") {
    const terminalOrHall = details.airportDirection === "to_airport" ? details.airportTerminal : details.airportHall;

    return (
      details.flightNumber.trim().length > 0 &&
      details.flightFrom.trim().length > 0 &&
      details.flightTo.trim().length > 0 &&
      details.flightTimeLabel.trim().length > 0 &&
      terminalOrHall.trim().length > 0
    );
  }

  return (
    details.airportLuggage.largeSuitcases >= 0 &&
    details.airportLuggage.cabinBags >= 0 &&
    details.airportLuggage.specialItems.trim().length > 0 &&
    details.airportLuggage.note.trim().length > 0
  );
}

function canOpenAirportDetailsSlice(details: AirportDetailsState, slice: AirportDetailsSlice) {
  const targetIndex = airportDetailsSliceOrder.indexOf(slice);
  if (targetIndex <= 0) return true;

  return airportDetailsSliceOrder
    .slice(0, targetIndex)
    .every((previousSlice) => isAirportDetailsSliceComplete(details, previousSlice));
}

function CreatePodStepper({
  currentStep,
  stepLabels = baseCreateSteps,
}: {
  currentStep: number;
  stepLabels?: string[];
}) {
  const activeStepLabel = stepLabels[currentStep] ?? stepLabels[0] ?? "Create pod";

  return (
    <nav aria-label="Create pod progress" className="mx-auto mt-6 w-full max-w-[342px]">
      <div className="rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_88%,transparent),rgba(5,12,20,0.72))] p-3 shadow-[0_18px_42px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
            Step {currentStep + 1} of {stepLabels.length}
          </p>
          <p className="min-w-0 truncate text-[13px] font-black text-[var(--rp-text)]">
            {activeStepLabel}
          </p>
        </div>

        <ol className="mt-3 grid grid-flow-col gap-1.5" style={{ gridTemplateColumns: `repeat(${stepLabels.length}, minmax(0, 1fr))` }}>
          {stepLabels.map((step, index) => {
            const active = index === currentStep;
            const completed = index < currentStep;

            return (
              <li key={step} className="min-w-0">
                <div
                  aria-current={active ? "step" : undefined}
                  title={step}
                  className={cn(
                    "h-2 rounded-full transition",
                    completed
                      ? "bg-[var(--rp-primary)]"
                      : active
                        ? "bg-[var(--rp-primary)] shadow-[0_0_18px_color-mix(in_srgb,var(--rp-primary)_46%,transparent)]"
                        : "bg-[var(--rp-card-muted)]",
                  )}
                />
              </li>
            );
          })}
        </ol>

        <ol
          className="mt-3 grid items-center gap-1.5"
          style={{ gridTemplateColumns: `repeat(${stepLabels.length}, minmax(0, 1fr))` }}
        >
          {stepLabels.map((step, index) => {
            const active = index === currentStep;
            const completed = index < currentStep;

            return (
              <li key={`${step}-marker`} className="grid min-w-0 place-items-center">
                <span
                  aria-label={`${step}: ${completed ? "complete" : active ? "current" : "upcoming"}`}
                  className={cn(
                    "grid h-8 w-full min-w-0 max-w-10 place-items-center rounded-full border text-xs font-black transition",
                    active
                      ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)] shadow-[0_0_18px_color-mix(in_srgb,var(--rp-primary)_42%,transparent)]"
                      : completed
                        ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,var(--rp-card))] text-[var(--rp-primary)]"
                        : "border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted)]",
                  )}
                >
                  {completed ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function CreatePodTopBar({
  currentStep,
  onBack,
  stepLabels,
}: {
  currentStep: CreateStep;
  onBack?: () => void;
  stepLabels?: string[];
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
      <CreatePodStepper currentStep={currentStep} stepLabels={stepLabels} />
    </header>
  );
}

function TypeIcon({ type }: { type: "calendar" | "airport" | "repeat" }) {
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

  if (type === "airport") {
    return (
      <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-300/30 bg-[radial-gradient(circle_at_35%_30%,rgba(103,232,249,0.28),rgba(88,28,135,0.16),rgba(7,17,26,0.52))] text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.16)]">
        <Plane className="-rotate-12 h-9 w-9 stroke-[1.9]" />
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
  const isAirport = item.accent === "airport";

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
          ? isAirport
            ? "border-cyan-300/75 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(124,58,237,0.12),var(--rp-card))] ring-1 ring-cyan-300/65 shadow-[0_0_34px_rgba(34,211,238,0.16)]"
            : "border-[var(--rp-primary)] ring-1 ring-[var(--rp-primary)]"
          : isAirport
            ? "border-cyan-300/24 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(124,58,237,0.08),var(--rp-card))] hover:border-cyan-300/55"
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
              selected ? (isAirport ? "text-cyan-200" : "text-[var(--rp-primary)]") : "text-[var(--rp-muted)]",
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
            ? isAirport
              ? "border-cyan-200 bg-cyan-300/10"
              : "border-[var(--rp-primary)] bg-transparent"
            : "border-[var(--rp-muted)] bg-transparent",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "h-4 w-4 rounded-full transition",
            selected ? (isAirport ? "bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.55)]" : "bg-[var(--rp-primary)]") : "bg-transparent",
          )}
        />
      </span>
    </button>
  );
}

function routePointSummary(value: string, fallback: string) {
  const clean = value.trim();
  if (!clean) return fallback;

  return clean.split(",")[0]?.trim() || fallback;
}

function getMapboxAccessToken() {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";
}

function getMapboxFeatureCoordinates(feature: MapboxFeature): RouteCoordinates | null {
  const longitude = feature.properties?.coordinates?.longitude;
  const latitude = feature.properties?.coordinates?.latitude;

  if (typeof longitude === "number" && typeof latitude === "number") {
    return { lng: longitude, lat: latitude };
  }

  const [lng, lat] = feature.center ?? feature.geometry?.coordinates ?? [];
  if (typeof lng === "number" && typeof lat === "number") return { lng, lat };

  return null;
}

function getMapboxFeatureLabel(feature: MapboxFeature) {
  const formattedPlace = [feature.properties?.name ?? feature.text, feature.properties?.place_formatted]
    .filter(Boolean)
    .join(", ");
  const label =
    feature.properties?.full_address ||
    formattedPlace ||
    feature.place_name ||
    feature.properties?.name ||
    feature.text ||
    "Selected place";

  return label.trim() || "Selected place";
}

function mapboxFeatureToSuggestion(feature: MapboxFeature, index: number): MapboxPlaceSuggestion | null {
  const coordinates = getMapboxFeatureCoordinates(feature);
  if (!coordinates) return null;

  const label = getMapboxFeatureLabel(feature);
  const shortLabel = feature.properties?.name ?? feature.text ?? routePointSummary(label, "Place");

  return {
    id: feature.id ?? `${label}-${coordinates.lng}-${coordinates.lat}-${index}`,
    label,
    shortLabel,
    coordinates,
  };
}

function makeForwardGeocodeUrl(query: string, token: string) {
  const params = new URLSearchParams({
    access_token: token,
    autocomplete: "true",
    language: "en",
    limit: "5",
    proximity: "ip",
    q: query,
    types: "address,poi,place,locality,neighborhood",
  });

  return `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;
}

function makeReverseGeocodeUrl(coordinates: RouteCoordinates, token: string) {
  const params = new URLSearchParams({
    access_token: token,
    language: "en",
    latitude: String(coordinates.lat),
    limit: "1",
    longitude: String(coordinates.lng),
  });

  return `https://api.mapbox.com/search/geocode/v6/reverse?${params.toString()}`;
}

function makeDirectionsUrl(pickup: RouteCoordinates, dropoff: RouteCoordinates, token: string) {
  const coordinates = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
  const params = new URLSearchParams({
    access_token: token,
    alternatives: "false",
    geometries: "geojson",
    overview: "full",
  });

  return `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params.toString()}`;
}

function lngLatToTile(lng: number, lat: number, zoom: number) {
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale);

  return { x, y };
}

function getFallbackMapTiles() {
  const zoom = 12;
  const centerTile = lngLatToTile(114.1694, 22.3193, zoom);

  return [-1, 0, 1].flatMap((row) =>
    [-1, 0, 1].map((column) => ({
      key: `${row}-${column}`,
      url: `https://basemaps.cartocdn.com/dark_all/${zoom}/${centerTile.x + column}/${centerTile.y + row}.png`,
    })),
  );
}

const fallbackMapTiles = getFallbackMapTiles();

function FallbackRouteMap() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07111d]">
      <div className="absolute left-1/2 top-1/2 grid aspect-square w-[112%] min-w-[330px] -translate-x-1/2 -translate-y-1/2 grid-cols-3 grid-rows-3 opacity-85 saturate-[1.1]">
        {fallbackMapTiles.map((tile) => (
          <span
            key={tile.key}
            className="bg-cover bg-center"
            style={{ backgroundImage: `url('${tile.url}')` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(86,217,239,0.14),transparent_34%),linear-gradient(180deg,rgba(2,9,18,0.18),rgba(2,9,18,0.54))]" />
      <div className="absolute left-[45%] top-[42%] grid h-10 w-10 place-items-center rounded-full border border-[#f6c453]/70 bg-[#07111d]/80 text-[#f6c453] shadow-[0_0_28px_rgba(246,196,83,0.22)] backdrop-blur">
        <MapPin className="h-5 w-5" />
      </div>
      <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#06111d]/82 px-3 py-1 text-[11px] font-black text-slate-100 backdrop-blur">
        Hong Kong map preview
      </div>
      <div className="absolute bottom-1.5 right-2 rounded bg-[#06111d]/72 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
        © OpenStreetMap © CARTO
      </div>
    </div>
  );
}

function RouteJourneyPreview({
  pickupAddress,
  dropoffAddress,
  pickupPoint,
  dropoffPoint,
  stops,
  pickupLabel = "Pickup point",
  dropoffLabel = "Dropoff point",
}: {
  pickupAddress: string;
  dropoffAddress: string;
  pickupPoint: RoutePointSelection | null;
  dropoffPoint: RoutePointSelection | null;
  stops: RouteStop[];
  pickupLabel?: string;
  dropoffLabel?: string;
}) {
  const mapboxToken = getMapboxAccessToken();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const pickupLng = pickupPoint?.coordinates.lng;
  const pickupLat = pickupPoint?.coordinates.lat;
  const dropoffLng = dropoffPoint?.coordinates.lng;
  const dropoffLat = dropoffPoint?.coordinates.lat;
  const hasRoutePoints =
    pickupAddress.trim().length > 0 ||
    dropoffAddress.trim().length > 0 ||
    stops.some((stop) => stop.address.trim().length > 0);
  const filledPointCount =
    (pickupAddress.trim() ? 1 : 0) +
    stops.filter((stop) => stop.address.trim()).length +
    (dropoffAddress.trim() ? 1 : 0);
  const points = [
    {
      id: "pickup",
      label: pickupLabel,
      value: routePointSummary(pickupAddress, "None"),
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
      label: stops.length > 0 ? `Final ${dropoffLabel.toLowerCase()}` : dropoffLabel,
      value: routePointSummary(dropoffAddress, "None"),
      type: "dropoff",
    },
  ];

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    async function loadMap() {
      try {
        const mapboxModule = await import("mapbox-gl");
        if (cancelled || !mapContainerRef.current) return;

        const mapboxgl = mapboxModule.default;
        mapboxgl.accessToken = mapboxToken;

        const map = new mapboxgl.Map({
          attributionControl: false,
          center: [114.1694, 22.3193],
          container: mapContainerRef.current,
          interactive: true,
          pitchWithRotate: false,
          style: "mapbox://styles/mapbox/dark-v11",
          zoom: 10.5,
        });

        mapRef.current = map;
        map.on("load", () => {
          if (!cancelled) setMapReady(true);
        });
        map.on("error", () => {
          if (!cancelled) setMapError("Map preview could not load.");
        });
      } catch {
        if (!cancelled) setMapError("Map preview could not load.");
      }
    }

    void loadMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!mapboxToken || pickupLng == null || pickupLat == null || dropoffLng == null || dropoffLat == null) return;

    const controller = new AbortController();
    const pickupCoordinates = { lng: pickupLng, lat: pickupLat };
    const dropoffCoordinates = { lng: dropoffLng, lat: dropoffLat };
    const loadingTimeout = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setIsRouteLoading(true);
        setRouteError(null);
      }
    }, 0);

    async function loadRoute() {
      try {
        const response = await fetch(
          makeDirectionsUrl(pickupCoordinates, dropoffCoordinates, mapboxToken),
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Directions request failed");
        const data = (await response.json()) as MapboxDirectionsResponse;
        const coordinates = data.routes?.[0]?.geometry?.coordinates ?? [];
        if (coordinates.length < 2) throw new Error("No route returned");
        setRouteCoordinates(coordinates);
      } catch {
        if (!controller.signal.aborted) {
          setRouteCoordinates([]);
          setRouteError("Route line unavailable. Pins still show selected points.");
        }
      } finally {
        if (!controller.signal.aborted) setIsRouteLoading(false);
      }
    }

    void loadRoute();

    return () => {
      window.clearTimeout(loadingTimeout);
      controller.abort();
    };
  }, [
    dropoffLat,
    dropoffLng,
    mapboxToken,
    pickupLat,
    pickupLng,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const activeRouteCoordinates = pickupPoint && dropoffPoint ? routeCoordinates : [];

    const routeData = {
      type: "FeatureCollection",
      features: activeRouteCoordinates.length > 1
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: activeRouteCoordinates,
              },
            },
          ]
        : [],
    };
    const pointFeatures = [
      pickupPoint
        ? {
            type: "Feature",
            properties: { label: "Pickup", pointType: "pickup" },
            geometry: {
              type: "Point",
              coordinates: [pickupPoint.coordinates.lng, pickupPoint.coordinates.lat],
            },
          }
        : null,
      dropoffPoint
        ? {
            type: "Feature",
            properties: { label: "Dropoff", pointType: "dropoff" },
            geometry: {
              type: "Point",
              coordinates: [dropoffPoint.coordinates.lng, dropoffPoint.coordinates.lat],
            },
          }
        : null,
    ].filter(Boolean);
    const pointsData = {
      type: "FeatureCollection",
      features: pointFeatures,
    };

    if (!map.getSource("ridepod-route")) {
      map.addSource("ridepod-route", { type: "geojson", data: routeData as Parameters<GeoJSONSource["setData"]>[0] });
      map.addLayer({
        id: "ridepod-route-line",
        type: "line",
        source: "ridepod-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#56d9ef",
          "line-opacity": 0.92,
          "line-width": 5,
        },
      });
    } else {
      (map.getSource("ridepod-route") as GeoJSONSource).setData(routeData as Parameters<GeoJSONSource["setData"]>[0]);
    }

    if (!map.getSource("ridepod-points")) {
      map.addSource("ridepod-points", { type: "geojson", data: pointsData as Parameters<GeoJSONSource["setData"]>[0] });
      map.addLayer({
        id: "ridepod-points-circle",
        type: "circle",
        source: "ridepod-points",
        paint: {
          "circle-color": ["match", ["get", "pointType"], "pickup", "#f6c453", "#fb923c"],
          "circle-radius": 8,
          "circle-stroke-color": "#06111d",
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "ridepod-points-label",
        type: "symbol",
        source: "ridepod-points",
        layout: {
          "text-field": ["get", "label"],
          "text-offset": [0, 1.45],
          "text-size": 11,
        },
        paint: {
          "text-color": "#f8fafc",
          "text-halo-color": "#06111d",
          "text-halo-width": 1.4,
        },
      });
    } else {
      (map.getSource("ridepod-points") as GeoJSONSource).setData(pointsData as Parameters<GeoJSONSource["setData"]>[0]);
    }

    if (pickupPoint && dropoffPoint) {
      const west = Math.min(pickupPoint.coordinates.lng, dropoffPoint.coordinates.lng);
      const east = Math.max(pickupPoint.coordinates.lng, dropoffPoint.coordinates.lng);
      const south = Math.min(pickupPoint.coordinates.lat, dropoffPoint.coordinates.lat);
      const north = Math.max(pickupPoint.coordinates.lat, dropoffPoint.coordinates.lat);
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { duration: 600, maxZoom: 14.5, padding: 44 },
      );
    } else if (pickupPoint || dropoffPoint) {
      const point = pickupPoint ?? dropoffPoint;
      if (point) map.flyTo({ center: [point.coordinates.lng, point.coordinates.lat], duration: 600, zoom: 13.5 });
    }
  }, [dropoffPoint, mapReady, pickupPoint, routeCoordinates]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--rp-primary)_28%,var(--rp-border))] bg-[linear-gradient(180deg,rgba(15,27,39,0.94),rgba(8,17,29,0.94))] p-3 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Route preview</p>
          <p className="mt-1 text-sm font-bold text-slate-300">
            {hasRoutePoints ? "Pickup to final dropoff" : "No route points set yet"}
          </p>
        </div>
        <span className="rounded-full border border-[var(--rp-border)] bg-[#0b1724] px-3 py-1 text-xs font-black text-[var(--rp-text)]">
          {filledPointCount} set
        </span>
      </div>

      <div className="relative h-[150px] overflow-hidden rounded-[18px] border border-white/10 bg-[#06111d]">
        {mapboxToken ? (
          <>
            <div ref={mapContainerRef} className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,9,18,0.02),rgba(2,9,18,0.2))]" />
            {!pickupPoint || !dropoffPoint ? (
              <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#06111d]/80 px-3 py-1 text-[11px] font-black text-slate-200 backdrop-blur">
                Select pickup and dropoff
              </div>
            ) : null}
            {isRouteLoading ? (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-[#56d9ef]/25 bg-[#06111d]/86 px-3 py-1 text-[11px] font-black text-[#a7f3ff] backdrop-blur">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Routing
              </div>
            ) : null}
            {routeError || mapError ? (
              <div className="absolute inset-x-3 bottom-3 rounded-[12px] border border-amber-300/20 bg-[#19170d]/88 px-3 py-2 text-[11px] font-bold leading-4 text-amber-100 backdrop-blur">
                {routeError ?? mapError}
              </div>
            ) : null}
            <div className="absolute bottom-1.5 right-2 rounded bg-[#06111d]/70 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
              © Mapbox © OpenStreetMap
            </div>
          </>
        ) : (
          <FallbackRouteMap />
        )}
      </div>

      <div className="mt-3 grid gap-1.5">
        {points.map((point) => (
          <div
            key={point.id}
            className="grid min-h-11 grid-cols-[18px_1fr_auto] items-center gap-3 rounded-[14px] px-2.5 py-2"
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                point.type === "pickup"
                  ? "bg-[var(--rp-primary)]"
                  : point.type === "dropoff"
                    ? "bg-orange-400"
                    : "border border-[var(--rp-primary)] bg-transparent",
              )}
            />
            <span className="min-w-0 truncate text-sm font-black text-[#f8fafc]">
              {point.value}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#f6c453]">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapboxPlaceField({
  label,
  type,
  value,
  selectedPoint,
  placeholder,
  allowCurrentLocation = false,
  onChange,
  onPlaceSelect,
}: {
  label: string;
  type: "pickup" | "dropoff";
  value: string;
  selectedPoint: RoutePointSelection | null;
  placeholder: string;
  allowCurrentLocation?: boolean;
  onChange: (value: string) => void;
  onPlaceSelect: (point: RoutePointSelection | null) => void;
}) {
  const fieldId = useId();
  const mapboxToken = getMapboxAccessToken();
  const [suggestions, setSuggestions] = useState<MapboxPlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const cleanValue = value.trim();
  const hasSelectedPoint = Boolean(selectedPoint && selectedPoint.label.trim() === cleanValue);
  const visibleSuggestions = mapboxToken && cleanValue.length >= 3 && !hasSelectedPoint ? suggestions : [];
  const showSearching = isSearching && mapboxToken && cleanValue.length >= 3 && !hasSelectedPoint;

  useEffect(() => {
    if (!mapboxToken || cleanValue.length < 3 || hasSelectedPoint) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      setStatusMessage(null);

      fetch(makeForwardGeocodeUrl(cleanValue, mapboxToken), { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Place search failed");
          return response.json() as Promise<MapboxFeatureCollection>;
        })
        .then((data) => {
          const nextSuggestions = (data.features ?? [])
            .map((feature, index) => mapboxFeatureToSuggestion(feature, index))
            .filter((suggestion): suggestion is MapboxPlaceSuggestion => Boolean(suggestion));
          setSuggestions(nextSuggestions);
          setStatusMessage(nextSuggestions.length ? null : "No matching places found.");
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setStatusMessage("Place search unavailable right now.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [cleanValue, hasSelectedPoint, mapboxToken]);

  function handleChange(nextValue: string) {
    onChange(nextValue);
    if (selectedPoint && nextValue.trim() !== selectedPoint.label.trim()) {
      onPlaceSelect(null);
    }
  }

  function handleSelect(suggestion: MapboxPlaceSuggestion) {
    onChange(suggestion.label);
    onPlaceSelect({ label: suggestion.label, coordinates: suggestion.coordinates });
    setSuggestions([]);
    setStatusMessage(null);
  }

  function handleUseCurrentLocation() {
    if (!mapboxToken || !navigator.geolocation) {
      setStatusMessage("Current location is not available in this browser.");
      return;
    }

    setIsLocating(true);
    setStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };

        try {
          const response = await fetch(makeReverseGeocodeUrl(coordinates, mapboxToken));
          if (!response.ok) throw new Error("Reverse geocode failed");
          const data = (await response.json()) as MapboxFeatureCollection;
          const suggestion = data.features
            ?.map((feature, index) => mapboxFeatureToSuggestion(feature, index))
            .find(Boolean);
          const label = suggestion?.label ?? "Current location";
          onChange(label);
          onPlaceSelect({ label, coordinates });
          setSuggestions([]);
        } catch {
          onChange("Current location");
          onPlaceSelect({ label: "Current location", coordinates });
          setStatusMessage("Current location selected without an address label.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setStatusMessage("Location permission was not allowed.");
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  }

  if (!mapboxToken) {
    return (
      <div className="grid gap-2">
        <AddressField
          label={label}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />
        <p className="px-1 text-xs font-bold leading-5 text-slate-500">
          Type the pickup or dropoff address manually.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-[18px] border border-white/10 bg-[rgba(15,27,39,0.9)] px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition focus-within:border-[#f6c453] focus-within:shadow-[0_0_0_1px_rgba(246,196,83,0.38),0_16px_34px_rgba(0,0,0,0.24)]">
      <div className="grid grid-cols-[42px_1fr] items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full border border-[#f6c453]/25 bg-[#1b2936] text-[#ffc94d]">
          <MapPin className="h-5 w-5 fill-[#ffc94d]/10 stroke-[2.3]" />
        </span>
        <span className="min-w-0">
          <label htmlFor={fieldId} className="block text-xs font-black uppercase tracking-[0.12em] text-[#f6c453]">
            {label}
          </label>
          <span className="mt-2 flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              id={fieldId}
              type="text"
              value={value}
              onChange={(event) => handleChange(event.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className="min-h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-black leading-5 text-[#f8fafc] outline-none placeholder:text-slate-500"
            />
            {showSearching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#56d9ef]" /> : null}
          </span>
        </span>
      </div>

      {allowCurrentLocation ? (
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="ml-[52px] inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#56d9ef]/25 bg-[#0b2a38] px-3 text-xs font-black text-[#a7f3ff] transition hover:border-[#56d9ef]/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          Use my current location
        </button>
      ) : null}

      {visibleSuggestions.length > 0 ? (
        <div className="ml-[52px] overflow-hidden rounded-[14px] border border-white/10 bg-[#07111d]">
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="grid w-full gap-0.5 border-b border-white/8 px-3 py-2.5 text-left last:border-b-0 hover:bg-white/5"
            >
              <span className="truncate text-sm font-black text-[#f8fafc]">{suggestion.shortLabel}</span>
              <span className="line-clamp-2 text-xs font-semibold leading-4 text-slate-400">{suggestion.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {statusMessage ? (
        <p className="ml-[52px] text-xs font-bold leading-5 text-slate-500">{statusMessage}</p>
      ) : null}
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
        "grid min-h-[76px] w-full grid-cols-[42px_1fr] items-center gap-3 rounded-[18px] border border-white/10 bg-[rgba(15,27,39,0.9)] px-3 py-3 text-left shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition focus-within:border-[#f6c453] focus-within:shadow-[0_0_0_1px_rgba(246,196,83,0.38),0_16px_34px_rgba(0,0,0,0.24)]",
        onRemove ? "pr-3" : "",
      )}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-[#f6c453]/25 bg-[#1b2936] text-[#ffc94d]">
        <span className="sr-only">{iconLabel}</span>
        <MapPin className="h-5 w-5 fill-[#ffc94d]/10 stroke-[2.3]" />
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
            className="min-h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-black leading-5 text-[#f8fafc] outline-none placeholder:text-slate-500"
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
      className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[18px] border border-dashed border-[#f6c453] bg-[rgba(246,196,83,0.05)] px-4 text-sm font-black text-[#f6c453] shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition hover:bg-[rgba(246,196,83,0.1)]"
    >
      <Plus className="h-5 w-5 text-[#f6c453]" />
      Add stop
    </button>
  );
}

function SelfSettleTextField({
  label,
  value,
  placeholder,
  helper,
  required,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  helper?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const fieldId = useId();

  return (
    <label htmlFor={fieldId} className="grid min-w-0 gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-left">
      <span className="text-xs font-black uppercase tracking-[0.13em] text-[var(--rp-primary)]">
        {label}
        {required ? <span className="ml-1 text-[#f6c453]">*</span> : null}
      </span>
      <input
        id={fieldId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--rp-border)] bg-[rgba(5,12,20,0.48)] px-3 text-base font-black text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
      />
      {helper ? <span className="text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{helper}</span> : null}
    </label>
  );
}

function DistrictSelectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldId = useId();

  return (
    <label htmlFor={fieldId} className="grid min-w-0 gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-left">
      <span className="text-xs font-black uppercase tracking-[0.13em] text-[var(--rp-primary)]">
        {label}
        <span className="ml-1 text-[#f6c453]">*</span>
      </span>
      <span className="relative block">
        <select
          id={fieldId}
          value={value}
          required
          aria-required="true"
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full min-w-0 appearance-none rounded-xl border border-[var(--rp-border)] bg-[rgba(5,12,20,0.48)] px-3 pr-10 text-base font-black text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
        >
          <option value="">Choose district</option>
          {hk18DistrictOptions.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--rp-primary)]" />
      </span>
    </label>
  );
}

function SelfSettleSelectField<T extends string>({
  label,
  value,
  options,
  helper,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; title: string }>;
  helper?: string;
  onChange: (value: T) => void;
}) {
  const fieldId = useId();

  return (
    <label htmlFor={fieldId} className="grid gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-left">
      <span className="text-xs font-black uppercase tracking-[0.13em] text-[var(--rp-primary)]">{label}</span>
      <select
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="min-h-11 rounded-xl border border-[var(--rp-border)] bg-[rgba(5,12,20,0.48)] px-3 text-base font-black text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)]"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
      {helper ? <span className="text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{helper}</span> : null}
    </label>
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
      className="relative z-20 flex h-14 w-full items-center justify-center gap-3 rounded-[12px] border border-[var(--rp-border-strong)] text-base font-black shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_34%,transparent)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
    >
      {children}
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

function CreatePodStepActions({
  onBack,
  onContinue,
  continueLabel = "Continue",
  disabled = false,
  showBack = true,
  continueIcon,
}: {
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: React.ReactNode;
  disabled?: boolean;
  showBack?: boolean;
  continueIcon?: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-3", showBack ? "grid-cols-2" : "grid-cols-1")}>
      {showBack ? <SecondaryButton onClick={onBack}>Back</SecondaryButton> : null}
      <PrimaryButton onClick={onContinue} disabled={disabled}>
        {continueLabel}
        {continueIcon}
      </PrimaryButton>
    </div>
  );
}

function AirportDirectionCard({
  direction,
  selected,
  onSelect,
}: {
  direction: AirportDirection;
  selected: boolean;
  onSelect: () => void;
}) {
  const isToAirport = direction === "to_airport";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "grid min-h-[146px] gap-3 rounded-[20px] border p-4 text-left transition",
        selected
          ? "border-cyan-200 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(124,58,237,0.13),rgba(8,17,29,0.86))] shadow-[0_0_30px_rgba(34,211,238,0.16)]"
          : "border-cyan-300/18 bg-[rgba(15,27,39,0.74)] hover:border-cyan-300/45",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-[16px] border border-cyan-300/24 bg-cyan-300/10 text-cyan-100">
          <Plane className={cn("h-7 w-7", isToAirport ? "-rotate-12" : "rotate-[18deg]")} />
        </span>
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition",
            selected ? "border-cyan-200 bg-cyan-300 text-[#06111d]" : "border-[var(--rp-muted)]",
          )}
        >
          {selected ? <Check className="h-4 w-4" /> : null}
        </span>
      </span>
      <span>
        <span className="block text-lg font-black leading-6 text-[var(--rp-primary)]">
          {isToAirport ? "To airport" : "From airport"}
        </span>
        <span className="mt-1 block text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
          {isToAirport ? "Ride to the airport before your flight." : "Ride from the airport after landing."}
        </span>
      </span>
      <span className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-cyan-100">
        {isToAirport ? "Central -> Hong Kong Airport" : "Hong Kong Airport -> Mong Kok"}
      </span>
    </button>
  );
}

function AirportLuggageStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-cyan-300/18 bg-[rgba(5,12,20,0.42)] p-3">
      <p className="flex min-h-8 items-start text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">{label}</p>
      <div className="mt-3 grid grid-cols-[40px_minmax(32px,1fr)_40px] items-center justify-items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/8 text-cyan-100 transition hover:bg-cyan-300/14 disabled:opacity-35"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-8 text-center text-3xl font-black leading-none text-[var(--rp-text)] tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= 8}
          onClick={() => onChange(Math.min(8, value + 1))}
          className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/8 text-cyan-100 transition hover:bg-cyan-300/14 disabled:opacity-35"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const airportDetailsSliceOrder: AirportDetailsSlice[] = ["direction", "flight", "luggage"];

const airportDetailsSliceCopy: Record<
  AirportDetailsSlice,
  {
    label: string;
    title: string;
  }
> = {
  direction: {
    label: "To / From",
    title: "To airport / From airport",
  },
  flight: {
    label: "Flight",
    title: "Flight details",
  },
  luggage: {
    label: "Luggage",
    title: "Luggage",
  },
};

function AirportDetailsStep({
  airportDetails,
  stepLabels,
  currentStep,
  onAirportDetailsChange,
  onBack,
  onContinue,
}: {
  airportDetails: AirportDetailsState;
  stepLabels: string[];
  currentStep: CreateStep;
  onAirportDetailsChange: (details: AirportDetailsState) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [airportDetailsSlice, setAirportDetailsSlice] = useState<AirportDetailsSlice>("direction");
  const isToAirport = airportDetails.airportDirection === "to_airport";
  const terminalLabel = isToAirport ? "Departure terminal / hall" : "Arrival hall / meeting area";
  const terminalPlaceholder = isToAirport ? "e.g. Terminal 1, Departures" : "e.g. Arrival Hall A";
  const flightTimeLabel = isToAirport ? "Flight departure time" : "Flight arrival time";
  const activeSliceIndex = Math.max(0, airportDetailsSliceOrder.indexOf(airportDetailsSlice));
  const isLastAirportDetailsSlice = activeSliceIndex === airportDetailsSliceOrder.length - 1;
  const nextAirportDetailsSlice =
    airportDetailsSliceOrder[Math.min(airportDetailsSliceOrder.length - 1, activeSliceIndex + 1)] ?? "luggage";
  const previousAirportDetailsSlice =
    airportDetailsSliceOrder[Math.max(0, activeSliceIndex - 1)] ?? "direction";
  const airportDetailsContinueLabel = isLastAirportDetailsSlice ? "Continue" : "Next";
  const canContinueAirportDetailsSlice = isAirportDetailsSliceComplete(airportDetails, airportDetailsSlice);
  const airportDetailsSliceSummary: Record<AirportDetailsSlice, string> = {
    direction: getAirportDirectionLabel(airportDetails.airportDirection),
    flight: airportDetails.flightNumber.trim() || "Add flight",
    luggage: getAirportLuggageSummary(airportDetails),
  };

  function updateAirportLuggage(patch: Partial<AirportLuggageState>) {
    onAirportDetailsChange({
      ...airportDetails,
      airportLuggage: {
        ...airportDetails.airportLuggage,
        ...patch,
      },
    });
  }

  function handleAirportDetailsBack() {
    if (activeSliceIndex === 0) {
      onBack();
      return;
    }

    setAirportDetailsSlice(previousAirportDetailsSlice);
  }

  function handleAirportDetailsContinue() {
    if (!canContinueAirportDetailsSlice) return;

    if (isLastAirportDetailsSlice) {
      onContinue();
      return;
    }

    setAirportDetailsSlice(nextAirportDetailsSlice);
  }

  return (
    <>
      <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#020912] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 text-[#f8fafc]">
        <section className="grid grid-cols-3 gap-2" role="tablist" aria-label="Airport details sections">
          {airportDetailsSliceOrder.map((slice, index) => {
            const selected = airportDetailsSlice === slice;
            const completed = isAirportDetailsSliceComplete(airportDetails, slice);
            const canOpenSlice = canOpenAirportDetailsSlice(airportDetails, slice);

            return (
              <button
                key={slice}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-disabled={!canOpenSlice}
                disabled={!canOpenSlice}
                onClick={() => setAirportDetailsSlice(slice)}
                className={cn(
                  "grid min-h-[74px] justify-items-center gap-1 rounded-[18px] border px-2 py-3 text-center transition",
                  selected
                    ? "border-cyan-200 bg-cyan-300/14 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                    : "border-cyan-300/16 bg-[rgba(15,27,39,0.62)] text-[var(--rp-muted-strong)] hover:border-cyan-300/40",
                  !canOpenSlice && "cursor-not-allowed opacity-45 hover:border-cyan-300/16",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-black",
                    selected || completed
                      ? "border-cyan-200 bg-cyan-300 text-[#06111d]"
                      : "border-cyan-300/24 text-cyan-100",
                  )}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-black leading-4",
                    selected && "text-[var(--rp-primary)]",
                  )}
                >
                  {airportDetailsSliceCopy[slice].label}
                </span>
                <span className="line-clamp-1 max-w-full text-[10px] font-bold leading-4 opacity-80">
                  {airportDetailsSliceSummary[slice]}
                </span>
              </button>
            );
          })}
        </section>

        {airportDetailsSlice === "direction" ? (
          <section className="mt-5 grid gap-3" role="radiogroup" aria-label="Airport direction">
            {(["to_airport", "from_airport"] as AirportDirection[]).map((direction) => (
              <AirportDirectionCard
                key={direction}
                direction={direction}
                selected={airportDetails.airportDirection === direction}
                onSelect={() => onAirportDetailsChange(syncAirportDirectionDefaults(airportDetails, direction))}
              />
            ))}
          </section>
        ) : null}

        {airportDetailsSlice === "flight" ? (
          <section className="mt-5 rounded-[24px] border border-cyan-300/24 bg-[linear-gradient(135deg,rgba(14,165,233,0.11),rgba(124,58,237,0.11),rgba(15,23,42,0.86))] p-4 shadow-[var(--rp-shadow-soft)]">
            <h2 className="text-xl font-black text-cyan-100">Flight details</h2>

            <div className="mt-4 grid gap-4">
              <SelfSettleTextField
                label="Flight number"
                value={airportDetails.flightNumber}
                placeholder="Example: CX841, UO624, HX236, BR872"
                helper="RidePod does not verify flight status in this version."
                required
                onChange={(flightNumber) => onAirportDetailsChange({ ...airportDetails, flightNumber })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SelfSettleTextField
                  label="Flying from"
                  value={airportDetails.flightFrom}
                  placeholder={isToAirport ? "Hong Kong (HKG)" : "Taipei (TPE)"}
                  required
                  onChange={(flightFrom) => onAirportDetailsChange({ ...airportDetails, flightFrom })}
                />
                <SelfSettleTextField
                  label="Flying to"
                  value={airportDetails.flightTo}
                  placeholder={isToAirport ? "Taipei (TPE)" : "Hong Kong (HKG)"}
                  required
                  onChange={(flightTo) => onAirportDetailsChange({ ...airportDetails, flightTo })}
                />
              </div>
              <SelfSettleTextField
                label={flightTimeLabel}
                value={airportDetails.flightTimeLabel}
                placeholder={isToAirport ? "e.g. 10:45 AM" : "e.g. 7:20 PM"}
                required
                onChange={(flightTimeLabelValue) => onAirportDetailsChange({ ...airportDetails, flightTimeLabel: flightTimeLabelValue })}
              />
              <SelfSettleTextField
                label={terminalLabel}
                value={isToAirport ? airportDetails.airportTerminal : airportDetails.airportHall}
                placeholder={terminalPlaceholder}
                required
                onChange={(value) =>
                  onAirportDetailsChange(
                    isToAirport
                      ? { ...airportDetails, airportTerminal: value }
                      : { ...airportDetails, airportHall: value },
                  )
                }
              />
            </div>
          </section>
        ) : null}

        {airportDetailsSlice === "luggage" ? (
          <section className="mt-5 rounded-[24px] border border-cyan-300/20 bg-[rgba(15,27,39,0.82)] p-4 shadow-[var(--rp-shadow-soft)]">
            <h2 className="text-xl font-black text-[var(--rp-primary)]">Luggage</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Airport rides may need more luggage space.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <AirportLuggageStepper
                label="Large suitcases"
                value={airportDetails.airportLuggage.largeSuitcases}
                onChange={(largeSuitcases) => updateAirportLuggage({ largeSuitcases })}
              />
              <AirportLuggageStepper
                label="Cabin bags"
                value={airportDetails.airportLuggage.cabinBags}
                onChange={(cabinBags) => updateAirportLuggage({ cabinBags })}
              />
            </div>
            <div className="mt-4 grid gap-4">
              <SelfSettleTextField
                label="Special items"
                value={airportDetails.airportLuggage.specialItems}
                placeholder="stroller, golf bag, sports gear, none"
                helper="Type none if there are no special items."
                required
                onChange={(specialItems) => updateAirportLuggage({ specialItems })}
              />
              <SelfSettleTextField
                label="Luggage note"
                value={airportDetails.airportLuggage.note}
                placeholder="Type none or add a note for riders"
                required
                onChange={(note) => updateAirportLuggage({ note })}
              />
            </div>
            <p className="mt-4 rounded-[16px] border border-cyan-300/18 bg-cyan-300/8 p-3 text-xs font-bold leading-5 text-cyan-100">
              Large luggage may reduce usable seats. Confirm luggage fit before the ride.
            </p>
          </section>
        ) : null}

        <div className="mt-6">
          <CreatePodStepActions
            onBack={handleAirportDetailsBack}
            onContinue={handleAirportDetailsContinue}
            continueLabel={airportDetailsContinueLabel}
            disabled={!canContinueAirportDetailsSlice}
            continueIcon={!isLastAirportDetailsSlice ? <ArrowRight className="h-5 w-5" /> : undefined}
          />
        </div>
      </main>
    </>
  );
}

function RouteStopsStep({
  podType,
  pickupAddress,
  dropoffAddress,
  pickupRoutePoint,
  dropoffRoutePoint,
  pickupVenue,
  pickupDistrict,
  dropoffDistrict,
  stops,
  stopRequestPolicy,
  isRideAppSelfSettle,
  airportDetails,
  currentStep = 2,
  stepLabels = baseCreateSteps,
  onBack,
  onPickupChange,
  onDropoffChange,
  onPickupPlaceSelect,
  onDropoffPlaceSelect,
  onPickupVenueChange,
  onPickupDistrictChange,
  onDropoffDistrictChange,
  onAddStop,
  onStopChange,
  onRemoveStop,
  onStopRequestPolicyChange,
  onContinue,
}: {
  podType: PodType;
  pickupAddress: string;
  dropoffAddress: string;
  pickupRoutePoint: RoutePointSelection | null;
  dropoffRoutePoint: RoutePointSelection | null;
  pickupVenue: string;
  pickupDistrict: string;
  dropoffDistrict: string;
  stops: RouteStop[];
  stopRequestPolicy: StopRequestPolicy;
  isRideAppSelfSettle: boolean;
  airportDetails?: AirportDetailsState | null;
  currentStep?: CreateStep;
  stepLabels?: string[];
  onBack: () => void;
  onPickupChange: (value: string) => void;
  onDropoffChange: (value: string) => void;
  onPickupPlaceSelect: (point: RoutePointSelection | null) => void;
  onDropoffPlaceSelect: (point: RoutePointSelection | null) => void;
  onPickupVenueChange: (value: string) => void;
  onPickupDistrictChange: (value: string) => void;
  onDropoffDistrictChange: (value: string) => void;
  onAddStop: () => void;
  onStopChange: (id: number, value: string) => void;
  onRemoveStop: (id: number) => void;
  onStopRequestPolicyChange: (value: StopRequestPolicy) => void;
  onContinue: () => void;
}) {
  const gatherPointRequired = isRideAppSelfSettle;
  const gatherPointProvided = pickupVenue.trim().length > 0;
  const canContinue =
    pickupAddress.trim().length > 0 &&
    dropoffAddress.trim().length > 0 &&
    pickupDistrict.trim().length > 0 &&
    dropoffDistrict.trim().length > 0 &&
    (!gatherPointRequired || gatherPointProvided);
  const [routePanel, setRoutePanel] = useState<"route" | "requests">("route");
  const isRoutePanel = routePanel === "route";
  const routePanelCount = 2;
  const isAirport = Boolean(airportDetails);
  const isFromAirport = airportDetails?.airportDirection === "from_airport";
  const pickupFieldLabel = isAirport
    ? isFromAirport
      ? isRideAppSelfSettle
        ? "Gather point"
        : "Airport pickup"
      : "Pickup point"
    : "Pickup point";
  const dropoffFieldLabel = isAirport
    ? isFromAirport
      ? "Destination"
      : "Airport drop-off"
    : "Dropoff point";
  const pickupPlaceholder = isAirport
    ? isFromAirport
      ? "HKIA Arrival Hall A"
      : "Central"
    : "None yet";
  const dropoffPlaceholder = isAirport
    ? isFromAirport
      ? "Mong Kok"
      : "HKIA Terminal 1 Departures"
    : "None yet";

  function handleRouteBack() {
    if (!isRoutePanel) {
      setRoutePanel("route");
      return;
    }

    onBack();
  }

  function handleRouteForward() {
    if (isRoutePanel) {
      if (!canContinue) return;
      setRoutePanel("requests");
      return;
    }

    onContinue();
  }

  return (
    <>
      <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#020912] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 text-[#f8fafc]">
        <section className="text-center">
          <ScheduleTypeEyebrow podType={podType} />
          <h1 className="text-center text-[29px] font-black leading-tight text-[#f8fafc]">
            {isAirport ? "Airport route" : "Route & stops"}
          </h1>
          <p className="mx-auto mt-2 max-w-[320px] whitespace-nowrap text-center text-[13px] font-medium leading-5 text-[#cbd5e1]">
            {isRoutePanel
              ? isRideAppSelfSettle
                ? isAirport
                  ? "Add airport route and where riders should meet."
                  : "Add pickup, dropoff & meeting point."
                : isAirport
                  ? "Add airport pickup and drop-off details."
                  : "Add your pickup and dropoff."
              : isRideAppSelfSettle
                ? "Choose whether joined riders can ask for a route change."
                : "Choose whether riders can request one extra stop."}
          </p>
        </section>

        <div className="relative mt-5 flex items-center justify-between rounded-full border border-white/10 bg-[rgba(15,27,39,0.72)] p-1.5">
          <button
            type="button"
            aria-label="Previous route section"
            onClick={handleRouteBack}
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-primary)] transition hover:bg-[#1b2936]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-[calc(100%-6rem)] -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
              {isRoutePanel ? `Step 1 of ${routePanelCount}` : `Step 2 of ${routePanelCount}`}
            </p>
            <p className="w-full whitespace-nowrap text-center text-[13px] font-black leading-4 text-[var(--rp-text)]">
              {isRoutePanel ? (isAirport ? "Airport pickup & drop-off" : "Pickup & dropoff") : isRideAppSelfSettle ? "Route requests" : "Extra stop requests"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Next route section"
            disabled={isRoutePanel && !canContinue}
            onClick={() => {
              if (isRoutePanel) {
                if (canContinue) setRoutePanel("requests");
                return;
              }
              onContinue();
            }}
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-primary)] transition hover:bg-[#1b2936] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {isRoutePanel ? (
          <>
            <section className="mt-6 grid gap-4">
              <RouteJourneyPreview
                pickupAddress={pickupAddress}
                dropoffAddress={dropoffAddress}
                pickupPoint={pickupRoutePoint}
                dropoffPoint={dropoffRoutePoint}
                stops={stops}
                pickupLabel={pickupFieldLabel}
                dropoffLabel={dropoffFieldLabel}
              />

              <div className="grid gap-3">
                <MapboxPlaceField
                  label={pickupFieldLabel}
                  type="pickup"
                  value={pickupAddress}
                  selectedPoint={pickupRoutePoint}
                  placeholder={pickupPlaceholder}
                  allowCurrentLocation
                  onChange={onPickupChange}
                  onPlaceSelect={onPickupPlaceSelect}
                />
                <DistrictSelectField
                  label="Pickup district"
                  value={pickupDistrict}
                  onChange={onPickupDistrictChange}
                />
                {!isRideAppSelfSettle ? (
                  <SelfSettleTextField
                    label="Gather point"
                    value={pickupVenue}
                    placeholder="MTR exit, lobby, gate, or landmark"
                    helper="Optional. Where riders meet before pickup."
                    onChange={onPickupVenueChange}
                  />
                ) : null}
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
                <MapboxPlaceField
                  label={dropoffFieldLabel}
                  type="dropoff"
                  value={dropoffAddress}
                  selectedPoint={dropoffRoutePoint}
                  placeholder={dropoffPlaceholder}
                  onChange={onDropoffChange}
                  onPlaceSelect={onDropoffPlaceSelect}
                />
                <DistrictSelectField
                  label="Destination district"
                  value={dropoffDistrict}
                  onChange={onDropoffDistrictChange}
                />
                {isRideAppSelfSettle ? (
                  <SelfSettleTextField
                    label={isAirport ? "Gather point" : "Gather point"}
                    value={pickupVenue}
                    placeholder={isAirport && isFromAirport ? "Arrival Hall A pillar 4" : "Required"}
                    helper={isAirport ? "Required. Where riders meet before the host books." : "Required. Tell riders where to meet before the external ride app booking."}
                    required
                    onChange={onPickupVenueChange}
                  />
                ) : null}
              </div>

            </section>

            {!isRideAppSelfSettle ? <div className="mt-4">
              <AddStopButton onAddStop={onAddStop} />
            </div> : null}
          </>
        ) : (
          <div className="mt-6 grid gap-4">
            <div className="rounded-[18px] border border-white/10 bg-[rgba(15,27,39,0.72)] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
                Route summary
              </p>
              <p className="mt-2 text-sm font-black leading-5 text-[var(--rp-text)]">
                {routePointSummary(pickupAddress, "None")} {"\u2192"} {routePointSummary(dropoffAddress, "None")}
              </p>
              <p className="mt-2 text-xs font-black text-[var(--rp-muted-strong)]">
                {pickupDistrict || "Pickup district"} {"\u2192"} {dropoffDistrict || "Destination district"}
              </p>
            </div>
            <StopRequestPolicySelector
              value={stopRequestPolicy}
              isRideAppSelfSettle={isRideAppSelfSettle}
              onChange={onStopRequestPolicyChange}
            />
          </div>
        )}

        <div className="mt-7">
          <div className="grid grid-cols-2 gap-3">
            <SecondaryButton onClick={handleRouteBack}>
              <ChevronLeft className="h-5 w-5" />
              Back
            </SecondaryButton>
            <PrimaryButton
              onClick={handleRouteForward}
              disabled={isRoutePanel && !canContinue}
            >
              <span className="inline-flex items-center gap-2">
                {isRoutePanel ? "Next" : "Confirm"}
                <ChevronRight className="h-5 w-5" />
              </span>
            </PrimaryButton>
          </div>
        </div>
      </main>
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
  const [displayedMonthDate, setDisplayedMonthDate] = useState(() => {
    const todayIso = getTodayIsoDate();
    const safeSelectedDate = selectedDate < todayIso ? todayIso : selectedDate;
    const date = parseIsoDateToLocalDate(safeSelectedDate);
    date.setDate(1);
    return toLocalIsoDate(date);
  });
  const calendar = buildCalendarDays(displayedMonthDate);
  const today = new Date();
  const firstVisibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const visibleMonth = parseIsoDateToLocalDate(displayedMonthDate);
  visibleMonth.setDate(1);
  const canShowPreviousMonth = visibleMonth.getTime() > firstVisibleMonth.getTime();

  function moveDisplayedMonth(direction: -1 | 1) {
    const nextMonth = parseIsoDateToLocalDate(displayedMonthDate);
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + direction);

    if (nextMonth.getTime() < firstVisibleMonth.getTime()) {
      setDisplayedMonthDate(toLocalIsoDate(firstVisibleMonth));
      return;
    }

    setDisplayedMonthDate(toLocalIsoDate(nextMonth));
  }

  return (
    <section aria-label="Calendar picker" className="mt-8">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canShowPreviousMonth}
          onClick={() => moveDisplayedMonth(-1)}
          className="grid h-11 w-11 place-items-center justify-self-end rounded-full text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-center text-[22px] font-black leading-none text-[var(--rp-text)]">
          {calendar.monthLabel}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => moveDisplayedMonth(1)}
          className="grid h-11 w-11 place-items-center justify-self-start rounded-full text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
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
                    ? "bg-[var(--rp-primary)] text-[var(--rp-text)] ring-2 ring-[var(--rp-focus)]"
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
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedTime = parseDisplayTime(value);
  const localTimeValue = displayTimeToLocalTime(value);

  const handleTimeInputChange = (nextValue: string) => {
    if (!nextValue) return;
    onChange(localTimeToDisplayTime(nextValue));
  };

  const openTimePicker = () => {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker !== "function") {
      input.focus();
      return;
    }

    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <fieldset>
      <legend className="text-base font-bold text-[var(--rp-muted-strong)]">Time</legend>
      <div className="relative mt-3 rounded-[12px] focus-within:outline focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-[var(--rp-focus)]">
        <input
          ref={inputRef}
          type="time"
          step={300}
          aria-label={`Time, currently ${selectedTime.hour}:${selectedTime.minute} ${selectedTime.period}`}
          value={localTimeValue}
          onClick={openTimePicker}
          onChange={(event) => handleTimeInputChange(event.target.value)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          aria-hidden="true"
          className="grid h-16 grid-cols-[1fr_1fr_1fr_54px] items-center overflow-hidden rounded-[12px] border border-[var(--rp-primary)] bg-[var(--rp-input-bg)] shadow-[var(--rp-shadow-soft)]"
        >
          <span className="grid h-full place-items-center px-4 text-center text-lg font-black text-[var(--rp-text)]">
            {selectedTime.hour}
          </span>
          <span className="grid h-full place-items-center border-l border-[var(--rp-input-border)] px-3 text-center text-lg font-black text-[var(--rp-text)]">
            {selectedTime.minute}
          </span>
          <span className="grid h-full place-items-center border-l border-[var(--rp-input-border)] px-3 text-center text-lg font-black text-[var(--rp-text)]">
            {selectedTime.period}
          </span>
          <span className="grid h-full place-items-center border-l border-[var(--rp-input-border)] text-[var(--rp-primary)]">
            <Clock3 className="h-6 w-6" />
          </span>
        </div>
      </div>
    </fieldset>
  );
}

function localTimeToDisplayTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return "08:30 AM";

  const hour24 = Number(match[1]);
  const minute = timeMinutes.includes(match[2]) ? match[2] : "30";
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "PM" : "AM";

  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
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
  substep,
  dateTime,
  stepLabels = baseCreateSteps,
  onDateTimeChange,
  pickupAddress,
  dropoffAddress,
}: {
  substep: RecurringScheduleSubstep;
  dateTime: DateTimeState;
  stepLabels?: string[];
  onDateTimeChange: (dateTime: DateTimeState) => void;
  pickupAddress: string;
  dropoffAddress: string;
}) {
  const visibleLegs = getRecurringLegsForSelection({ dateTime, pickupAddress, dropoffAddress });
  const selectedWeekdays = sortedWeekdays(dateTime.recurringWeekdays);
  const selectedDaysSummary = selectedWeekdays
    .map((weekday) => recurringWeekdayOptions.find((option) => option.id === weekday)?.label ?? weekday)
    .join(", ");
  const validationError = getRecurringScheduleSubstepError(substep, dateTime, visibleLegs);
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
      {substep === "weekdays" ? (
        <>
          <fieldset>
            <legend className="sr-only">Choose weekdays</legend>
            <div className="mx-auto flex max-w-[320px] flex-wrap justify-center gap-3 pt-4">
              {recurringWeekdayOptions.map((option) => {
                const selected = dateTime.recurringWeekdays.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleWeekday(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "relative grid h-[68px] w-[68px] place-items-center rounded-[16px] border text-base font-black transition",
                      selected
                        ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)] shadow-[0_16px_34px_color-mix(in_srgb,var(--rp-primary)_22%,transparent)]"
                        : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] hover:border-[var(--rp-primary)]",
                    )}
                  >
                    {option.label}
                    {selected ? (
                      <span className="absolute -bottom-2 grid h-6 w-6 place-items-center rounded-full border border-[var(--rp-shell)] bg-[#071326] text-[var(--rp-primary)]">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      ) : null}

      {substep === "times" ? (
        <>
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_8%,transparent)] px-4 py-2 text-sm font-black text-[var(--rp-primary)]">
            <CalendarDays className="h-4 w-4" />
            Repeats on {selectedDaysSummary || "selected days"}
          </div>

          <fieldset>
            <legend className="sr-only">Trip pattern</legend>
            <div className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-1">
              {[
                { id: "ONE_WAY" as const, label: "One-way" },
                { id: "BACK_AND_FORTH" as const, label: "Back-and-forth" },
              ].map((option) => {
                const selected = dateTime.recurringPattern === option.id;
                const Icon = option.id === "ONE_WAY" ? ArrowRight : RefreshCcw;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updatePattern(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-2 rounded-[12px] border px-3 text-sm font-black transition",
                      selected
                        ? "border-[var(--rp-primary)] bg-transparent text-[var(--rp-primary)]"
                        : "border-transparent text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <section className="relative grid gap-4">
            {sharedOutbound ? (
              <RecurringLegEditor
                title={dateTime.recurringPattern === "BACK_AND_FORTH" ? "Outbound ride" : "One-way ride"}
                leg={sharedOutbound}
                onChange={(patch) => updateSharedLeg("OUTBOUND", patch)}
              />
            ) : null}
            {dateTime.recurringPattern === "BACK_AND_FORTH" && sharedReturn ? (
              <>
                <div className="mx-auto -my-4 h-7 w-px bg-[var(--rp-primary)]" />
                <RecurringLegEditor
                  title="Return ride"
                  leg={sharedReturn}
                  onChange={(patch) => updateSharedLeg("RETURN", patch)}
                />
              </>
            ) : null}
          </section>
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

function getRecurringScheduleSubstepError(
  substep: RecurringScheduleSubstep,
  dateTime: DateTimeState,
  visibleLegs: RecurringScheduleLeg[],
) {
  if (substep === "weekdays") {
    return dateTime.recurringWeekdays.length === 0 ? "Choose at least one weekday." : null;
  }

  const outbound = visibleLegs.find((leg) => leg.legType === "OUTBOUND");
  if (!outbound?.departureTime.trim()) return "Add a departure time.";

  if (dateTime.recurringPattern === "BACK_AND_FORTH") {
    const returnLeg = visibleLegs.find((leg) => leg.legType === "RETURN");
    if (!returnLeg?.departureTime.trim()) return "Add a return time.";
  }

  return null;
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
  const isReturnRide = title === "Return ride";

  return (
    <div className="rounded-[20px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_92%,transparent),var(--rp-card-soft))] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--rp-primary)] text-[var(--rp-primary)]">
          {isReturnRide ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </span>
        <p className="text-base font-black text-[var(--rp-text)]">{title}</p>
      </div>
      <div className="mt-4 grid gap-0 divide-y divide-[var(--rp-border)]">
        <RecurringRideTimeRow
          icon={<Clock3 className="h-4 w-4" />}
          label="Departure time"
          value={leg.departureTime}
          displayValue={formatLocalTimeLabel(leg.departureTime)}
          type="time"
          onChange={(value) => onChange({ departureTime: value })}
        />
        <RecurringRideTimeRow
          icon={<MapPin className="h-4 w-4" />}
          label="From"
          value={leg.originLabel}
          onChange={(value) => onChange({ originLabel: value })}
        />
        <RecurringRideTimeRow
          icon={<ArrowRight className="h-4 w-4" />}
          label="To"
          value={leg.destinationLabel}
          onChange={(value) => onChange({ destinationLabel: value })}
        />
      </div>
    </div>
  );
}

function RecurringRideTimeRow({
  icon,
  label,
  value,
  displayValue,
  type = "text",
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  displayValue?: string;
  type?: "text" | "time";
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-h-12 grid-cols-[1fr_minmax(0,48%)] items-center gap-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--rp-muted-strong)]">
        <span className="text-[var(--rp-primary)]">{icon}</span>
        {label}
      </span>
      <input
        type={type}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-9 min-w-0 rounded-lg border border-transparent bg-transparent px-1 text-right text-base font-black text-[var(--rp-text)] outline-none transition focus:border-[var(--rp-primary)] focus:bg-[var(--rp-input-bg)]",
          type === "time" && "text-[var(--rp-primary)]",
        )}
      />
      {type === "time" && displayValue ? <span className="sr-only">{displayValue}</span> : null}
    </label>
  );
}

function DateTimeStep({
  podType,
  pickupAddress,
  dropoffAddress,
  dateTime,
  currentStep = 3,
  stepLabels = baseCreateSteps,
  onDateTimeChange,
  onBack,
  onContinue,
}: {
  podType: PodType;
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  currentStep?: CreateStep;
  stepLabels?: string[];
  onDateTimeChange: (dateTime: DateTimeState) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [recurringScheduleSubstep, setRecurringScheduleSubstep] = useState<RecurringScheduleSubstep>("weekdays");
  const activeScheduleType: ScheduleType = podType === "recurring" ? "RECURRING" : "ONE_TIME";
  const recurringVisibleLegs = getRecurringLegsForSelection({ dateTime, pickupAddress, dropoffAddress });
  const activeRecurringValidationError =
    activeScheduleType === "RECURRING"
      ? getRecurringScheduleSubstepError(recurringScheduleSubstep, dateTime, recurringVisibleLegs)
      : null;
  const canContinue =
    activeScheduleType === "ONE_TIME"
      ? dateTime.selectedDate.length > 0 && dateTime.time.length > 0
      : !activeRecurringValidationError;
  const handleBack = () => {
    if (activeScheduleType === "RECURRING" && recurringScheduleSubstep === "times") {
      setRecurringScheduleSubstep("weekdays");
      return;
    }

    onBack();
  };
  const handleContinue = () => {
    if (activeScheduleType === "RECURRING" && recurringScheduleSubstep === "weekdays") {
      if (activeRecurringValidationError) return;
      setRecurringScheduleSubstep("times");
      return;
    }

    if (activeScheduleType === "RECURRING" && activeRecurringValidationError) return;

    onContinue();
  };

  return (
    <>
      <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
        <section className="text-center">
          {activeScheduleType === "RECURRING" ? (
            <p className="text-sm font-semibold text-[var(--rp-muted-strong)]">Step 4 of 6</p>
          ) : (
            <ScheduleTypeEyebrow podType={podType} />
          )}
          {activeScheduleType === "RECURRING" ? (
            <h1 className="text-[28px] font-black leading-tight text-[var(--rp-text)]">
              {recurringScheduleSubstep === "weekdays" ? "Which days repeat?" : "Set ride times"}
            </h1>
          ) : null}
          {activeScheduleType === "RECURRING" ? (
            <p className="mt-3 text-base font-medium text-[var(--rp-muted)]">
              {recurringScheduleSubstep === "weekdays"
                ? "Choose the weekdays for this recurring taxi pod."
                : dateTime.recurringPattern === "BACK_AND_FORTH"
                  ? "Set outbound and return times for selected weekdays."
                  : "Set the departure time for selected weekdays."}
            </p>
          ) : null}
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
            substep={recurringScheduleSubstep}
            dateTime={dateTime}
            onDateTimeChange={onDateTimeChange}
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
          />
        )}

        <div className="mt-7">
          <CreatePodStepActions onBack={handleBack} onContinue={handleContinue} disabled={!canContinue} />
        </div>
      </main>

    </>
  );
}

function EstimatedCostStep({
  podType,
  peopleVehicle,
  pricing,
  currentStep = 3,
  stepLabels = baseCreateSteps,
  onPeopleVehicleChange,
  onPricingChange,
  onBack,
  onContinue,
}: {
  podType: PodType;
  peopleVehicle: PeopleVehicleState;
  pricing: PricingState;
  currentStep?: CreateStep;
  stepLabels?: string[];
  onPeopleVehicleChange: (peopleVehicle: PeopleVehicleState) => void;
  onPricingChange: (pricing: PricingState) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const isRideAppSelfSettle = normalizeRideOptionId(peopleVehicle.rideOption) === "ride_app_fixed_quote";
  const districtFareSuggestion = isRideAppSelfSettle ? null : getDistrictTaxiFareSuggestion(peopleVehicle);
  const seatCount = Math.max(1, peopleVehicle.seatsAvailable);
  const [estimateDraft, setEstimateDraft] = useState(() =>
    isRideAppSelfSettle
      ? formatEstimatedCostTextDraft(peopleVehicle.estimatedRideAppFare)
      : formatEstimatedCostDraft(districtFareSuggestion?.totalFare ?? pricing.estimatedFare),
  );
  const estimateAmount = parseEstimatedCost(estimateDraft);
  const roundedEstimate = Math.round(estimateAmount);
  const perRiderEstimate = Math.max(1, Math.ceil(roundedEstimate / seatCount));
  const canContinue = roundedEstimate > 0;
  const rideAppProviderLabel = getRideAppProviderLabel(peopleVehicle.rideAppProvider, peopleVehicle.rideAppProviderOther);
  const estimatedDistanceKm = districtFareSuggestion ? Math.max(1, districtFareSuggestion.distanceMeters / 1000).toFixed(1) : null;

  function handleContinue() {
    if (!canContinue) return;

    if (isRideAppSelfSettle) {
      onPeopleVehicleChange({
        ...peopleVehicle,
        estimatedRideAppFare: `HK$${roundedEstimate}`,
      });
    } else {
      const approvedMaxFare = districtFareSuggestion
        ? centsToDollars(
            suggestApprovedMaxFare(dollarsToCents(roundedEstimate), districtFareSuggestion.routeRiskLevel),
          )
        : Math.max(roundedEstimate, Math.ceil(roundedEstimate * 1.15));

      onPricingChange({
        estimatedFare: roundedEstimate,
        estimatedShare: perRiderEstimate,
        maxFare: approvedMaxFare,
      });
    }

    onContinue();
  }

  return (
    <>
      <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#020912] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 text-[#f8fafc]">
        <section className="grid justify-items-center text-center">
          <ScheduleTypeEyebrow podType={podType} />
          <h1 className="mt-2 w-full text-center text-[31px] font-black leading-tight text-[var(--rp-text)]">
            Estimated Cost
          </h1>
          <p className="mt-2 w-full max-w-[330px] text-center text-base font-medium leading-6 text-[var(--rp-muted)]">
            Add the total ride estimate before riders can review this pod.
          </p>
        </section>

        <section className="mt-7 grid gap-5 rounded-[26px] border border-[#f6c453]/45 bg-[linear-gradient(180deg,rgba(246,196,83,0.14),rgba(15,27,39,0.74))] p-4 shadow-[0_22px_54px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#f6c453]/35 bg-[#f6c453]/16 text-[#f6c453]">
              {isRideAppSelfSettle ? <Smartphone className="h-5 w-5" /> : <CarFront className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6c453]">
                Required estimate
              </p>
              <h2 className="mt-1 text-xl font-black leading-tight text-[var(--rp-text)]">
                {isRideAppSelfSettle ? rideAppProviderLabel : "Taxi fare"}
              </h2>
            </div>
          </div>

          <label className="grid gap-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
              {isRideAppSelfSettle ? `Total estimated ${rideAppProviderLabel} fare` : "Total estimated cost"}
            </span>
            <div className="inline-flex min-h-14 w-fit max-w-full items-center rounded-[18px] border border-[var(--rp-border)] bg-[rgba(5,12,20,0.58)] px-4 focus-within:border-[var(--rp-primary)]">
              <span className="mr-2 text-base font-black text-[#f6c453]">HK$</span>
              <input
                type="text"
                inputMode="decimal"
                value={estimateDraft}
                onChange={(event) => setEstimateDraft(sanitizeEstimatedCostInput(event.target.value))}
                placeholder="84"
                aria-invalid={!canContinue}
                className="h-12 w-[7ch] min-w-0 bg-transparent text-[30px] font-black leading-none text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)]"
              />
            </div>
            {!isRideAppSelfSettle ? (
              <span className={cn("text-xs font-semibold leading-5", canContinue ? "text-[var(--rp-muted-strong)]" : "text-[#f6c453]")}>
                {canContinue
                  ? districtFareSuggestion
                    ? `RidePod district estimate from ${peopleVehicle.pickupDistrict} to ${peopleVehicle.dropoffDistrict}. You can still edit it.`
                    : "Use the best total estimate you have right now. You can still review details later."
                  : "Estimated cost is compulsory. Enter a positive HKD amount to continue."}
              </span>
            ) : null}
          </label>

          {!isRideAppSelfSettle ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.13em] text-[var(--rp-muted-strong)]">
                  Total estimate
                </p>
                <p className="mt-2 text-xl font-black text-[var(--rp-text)]">
                  {canContinue ? formatMoney(roundedEstimate) : "Required"}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.13em] text-[var(--rp-muted-strong)]">
                  Per rider
                </p>
                <p className="mt-2 text-xl font-black text-[var(--rp-primary)]">
                  {canContinue ? formatMoney(perRiderEstimate) : "-"}
                </p>
              </div>
              {districtFareSuggestion ? (
                <div className="col-span-2 rounded-[18px] border border-[#f6c453]/25 bg-[#f6c453]/10 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.13em] text-[#f6c453]">
                    RidePod estimate basis
                  </p>
                  <p className="mt-2 text-sm font-black leading-5 text-[var(--rp-text)]">
                    {peopleVehicle.pickupDistrict} {"\u2192"} {peopleVehicle.dropoffDistrict}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                    About {estimatedDistanceKm} km, {districtFareSuggestion.ruleLabel.toLowerCase()}.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <p className="mt-4 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
          {isRideAppSelfSettle
            ? "This estimate appears on the pod so riders know the external app fare before joining."
            : `RidePod will show about ${seatCount} seat${seatCount === 1 ? "" : "s"} and the estimated share per rider.`}
        </p>

        <div className="mt-7">
          <CreatePodStepActions
            onBack={onBack}
            onContinue={handleContinue}
            continueLabel="Save estimate"
            continueIcon={<ArrowRight className="h-5 w-5" />}
            disabled={!canContinue}
          />
        </div>
      </main>
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
  const maxSeats = 6;

  return (
    <section>
      <h2 className="text-[17px] font-black leading-6 text-[var(--rp-text)]">Total rider</h2>
      <div className="mt-4 rounded-[22px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="grid grid-cols-[52px_1fr_52px] items-center gap-3">
          <button
            type="button"
            aria-label="Decrease seats"
            disabled={value <= minSeats}
            onClick={() => onChange(Math.max(minSeats, value - 1))}
            className="grid h-14 w-14 place-items-center rounded-full border border-white/18 bg-black/10 text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)] disabled:opacity-35"
          >
            <Minus className="h-7 w-7" />
          </button>
          <div className="text-center text-[54px] font-black leading-none text-[var(--rp-primary)]">
            {value}
          </div>
          <button
            type="button"
            aria-label="Increase seats"
            disabled={value >= maxSeats}
            onClick={() => onChange(Math.min(maxSeats, value + 1))}
            className="grid h-14 w-14 place-items-center rounded-full border border-white/18 bg-black/10 text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)] disabled:opacity-35"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-base font-black text-[var(--rp-muted-strong)]">
        {value - 1} guests + host
      </p>
    </section>
  );
}

type RideCategoryId = "taxi" | "ride_app";

const rideCategories: Array<{
  id: RideCategoryId;
  title: string;
  modeLabel: string;
  statusLabel: string;
  priceLabel: string;
  priceHelper: string;
  detailRows: Array<{
    icon: typeof CalendarDays;
    label: string;
  }>;
  footer: string;
  icon: typeof CarFront;
}> = [
  {
    id: "taxi",
    title: "Taxi Partner Quote",
    modeLabel: "Protected",
    statusLabel: "Quote pending",
    priceLabel: "HK$68",
    priceHelper: "est. per person",
    detailRows: [
      { icon: CalendarDays, label: "Date and time set later" },
      { icon: UsersRound, label: "Protected shared taxi pod" },
    ],
    footer: "Taxi pods use protected pricing with partner quotes.",
    icon: CarFront,
  },
  {
    id: "ride_app",
    title: "Ride App",
    modeLabel: "Self-settle",
    statusLabel: "Ride app",
    priceLabel: defaultRideAppCreateFeeLabel,
    priceHelper: defaultRideAppHostCreateFeeCents > 0 ? "create fee" : "to create",
    detailRows: [
      { icon: CalendarDays, label: "Date and time set later" },
      { icon: UsersRound, label: "Final fare handled by group" },
    ],
    footer: "RidePod fee applies only when someone joins an eligible pod.",
    icon: Smartphone,
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

function estimateMockRouteDistanceMeters(pickupAddress: string, dropoffAddress: string) {
  const pickup = pickupAddress.trim().toLowerCase();
  const dropoff = dropoffAddress.trim().toLowerCase();
  if (!pickup || !dropoff) return 0;

  const routeKey = `${pickup} -> ${dropoff}`;
  const knownRoutes: Array<[RegExp, number]> = [
    [/central.*tsim sha tsui|tsim sha tsui.*central/, 8600],
    [/wan chai.*mong kok|mong kok.*wan chai/, 7200],
    [/central.*mong kok|mong kok.*central/, 7600],
    [/airport|hk international airport|lax/i, 32000],
    [/sha tin.*central|central.*sha tin/, 17000],
    [/tsuen wan.*airport|airport.*tsuen wan/, 24000],
    [/tung chung|lantau/i, 15000],
  ];
  const matched = knownRoutes.find(([pattern]) => pattern.test(routeKey));

  return matched?.[1] ?? 6000;
}

function inferTaxiFareTypeFromRoute(pickupAddress: string, dropoffAddress: string): TaxiType {
  const routeText = `${pickupAddress} ${dropoffAddress}`.toLowerCase();
  const lantauKeywords = ["lantau", "tung chung", "airport", "hk international airport", "chek lap kok", "disneyland", "mui wo", "tai o"];
  const ntKeywords = [
    "new territories",
    "sha tin",
    "shatin",
    "tsuen wan",
    "yuen long",
    "tuen mun",
    "tai po",
    "fanling",
    "sheung shui",
    "ma on shan",
    "sai kung",
    "tseung kwan o",
  ];

  if (lantauKeywords.some((keyword) => routeText.includes(keyword))) return "lantau";
  if (ntKeywords.some((keyword) => routeText.includes(keyword))) return "nt";

  return "urban";
}

function getSuggestedFareReference(
  pickupAddress: string,
  dropoffAddress: string,
  peopleVehicle: PeopleVehicleState,
) {
  const distanceMeters = estimateMockRouteDistanceMeters(pickupAddress, dropoffAddress);
  const taxiFareType = inferTaxiFareTypeFromRoute(pickupAddress, dropoffAddress);
  const fareEstimate = calculateHkTaxiFareEstimate({
    taxiType: taxiFareType,
    distanceMeters,
    baggageCount: peopleVehicle.bags,
    tollAmount: 0,
    uncertaintyPercent: 0.15,
  });

  return fareEstimate;
}

function TaxiFareReferenceCard({
  pickupAddress,
  dropoffAddress,
  peopleVehicle,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  peopleVehicle: PeopleVehicleState;
}) {
  const fareEstimate = getSuggestedFareReference(
    pickupAddress,
    dropoffAddress,
    peopleVehicle,
  );

  if (!fareEstimate.available) {
    return (
      <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-primary)]">Fare reference</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Fare reference unavailable until pickup and dropoff are selected.
        </p>
      </section>
    );
  }

  const fareRange = formatHkdRange(fareEstimate.roundedLowEstimate, fareEstimate.roundedHighEstimate);

  return (
    <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[linear-gradient(135deg,rgba(246,196,83,0.1),rgba(15,23,42,0.18)),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
            Fare reference
          </p>
          <h2 className="mt-2 text-3xl font-black leading-none text-[var(--rp-text)]">
            {fareRange}
          </h2>
          <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
            Total taxi fare reference
          </p>
        </div>
      </div>
    </section>
  );
}

function RideCategoryCard({
  category,
  selected,
  disabled,
  onSelect,
}: {
  category: (typeof rideCategories)[number];
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const Icon = category.icon;
  const taxiCategory = category.id === "taxi";
  const rideAppCategory = category.id === "ride_app";
  const displayTitle = disabled && taxiCategory ? "Taxi · Coming soon" : category.title;
  const statusText = disabled && taxiCategory ? "Coming soon" : selected ? "Selected" : "Tap to choose";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-[24px] border text-left shadow-[var(--rp-shadow-soft)] transition-[background,border-color,box-shadow,outline-color,transform] duration-200",
        selected ? "border-2 p-4 outline outline-[4px] outline-offset-[3px] min-[390px]:p-5" : "p-3 min-[390px]:p-4",
        selected && taxiCategory
          ? "border-[var(--rp-primary)] bg-[linear-gradient(135deg,rgba(246,196,83,0.2),rgba(15,23,42,0.88)_42%,rgba(3,7,18,0.72))] outline-[rgba(246,196,83,0.48)] shadow-[0_0_0_1px_rgba(246,196,83,0.42),0_22px_52px_rgba(246,196,83,0.2),0_18px_42px_rgba(0,0,0,0.36)]"
          : taxiCategory
            ? "border-[rgba(246,196,83,0.42)] bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(3,7,18,0.66))] hover:border-[rgba(246,196,83,0.72)]"
            : "",
        selected && rideAppCategory
          ? "border-blue-300 bg-[linear-gradient(135deg,rgba(37,99,235,0.28),rgba(15,23,42,0.88)_42%,rgba(3,7,18,0.72))] outline-blue-400/55 shadow-[0_0_0_1px_rgba(96,165,250,0.52),0_22px_52px_rgba(37,99,235,0.26),0_18px_42px_rgba(0,0,0,0.36)]"
          : rideAppCategory
            ? "border-blue-400/45 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(3,7,18,0.66))] hover:border-blue-300/75"
            : "",
        disabled && "cursor-not-allowed opacity-60 hover:border-[rgba(246,196,83,0.42)]",
      )}
    >
      <span className="grid min-w-0 grid-cols-[46px_minmax(0,1fr)] items-center gap-3 min-[390px]:grid-cols-[52px_minmax(0,1fr)]">
        <span className="grid justify-items-center gap-2">
          <span
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full border text-[var(--rp-primary)] min-[390px]:h-12 min-[390px]:w-12",
              taxiCategory
                ? "border-[rgba(246,196,83,0.48)] bg-[rgba(246,196,83,0.12)] text-[var(--rp-primary-strong)] shadow-[0_0_30px_rgba(246,196,83,0.12)]"
                : "border-blue-400/45 bg-blue-500/10 text-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.12)]",
            )}
          >
            <Icon className="h-5 w-5 min-[390px]:h-6 min-[390px]:w-6" />
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full border-2",
              selected && taxiCategory
                ? "border-[var(--rp-primary-strong)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                : selected && rideAppCategory
                  ? "border-blue-400 bg-blue-500 text-white"
                  : "border-[var(--rp-muted)] text-transparent",
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
        </span>

        <span className="min-w-0">
          <span className="grid min-w-0 gap-2">
            <span className="min-w-0 whitespace-nowrap text-[18px] font-black leading-6 text-[var(--rp-text)] min-[390px]:text-[22px]">
              {displayTitle}
            </span>
            <span
              className={cn(
                "w-fit max-w-full rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em]",
                taxiCategory
                  ? "border-[rgba(246,196,83,0.62)] bg-[rgba(246,196,83,0.1)] text-[var(--rp-primary-strong)]"
                  : "border-blue-400/55 bg-blue-500/10 text-blue-300",
              )}
            >
              {category.modeLabel}
            </span>
          </span>
          <span
            className={cn(
              "mt-2 block text-xs font-black",
              selected && taxiCategory && "text-[var(--rp-primary-strong)]",
              selected && rideAppCategory && "text-blue-300",
              !selected && "text-[var(--rp-muted)]",
            )}
          >
            {statusText}
          </span>
        </span>
      </span>
    </button>
  );
}

function RideOptionSelector({
  value,
  peopleVehicle,
  taxiCreateUnlocked,
  onChange,
}: {
  value: RideOptionId;
  peopleVehicle: PeopleVehicleState;
  taxiCreateUnlocked: boolean;
  onChange: (value: RideOptionId) => void;
}) {
  const selectedRideOption = normalizeRideOptionId(value);
  const selectedCategory: RideCategoryId =
    selectedRideOption === "taxi_partner_quote" || selectedRideOption === "taxi_meter"
      ? "taxi"
      : "ride_app";

  return (
    <section className="mt-9">
      <h2 className="text-[19px] font-black leading-6 text-[var(--rp-text)]">Ride Mode</h2>
      <div className="mt-5 grid gap-4" role="radiogroup" aria-label="Ride Mode">
        {rideCategories.map((category) => (
          <RideCategoryCard
            key={category.id}
            category={category}
            selected={selectedCategory === category.id}
            disabled={category.id === "taxi" && !taxiCreateUnlocked}
            onSelect={() => {
              onChange(category.id === "taxi" ? "taxi_partner_quote" : "ride_app_fixed_quote");
            }}
          />
        ))}
      </div>
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
  const hasAnyFit = taxiTypeOptions.some(
    (option) =>
      peopleVehicle.seatsAvailable <= option.maxRiders && peopleVehicle.bags <= option.maxBags,
  );
  const doesNotFit =
    peopleVehicle.seatsAvailable > selectedOption.maxRiders || peopleVehicle.bags > selectedOption.maxBags;

  function updateTaxiType(option: (typeof taxiTypeOptions)[number]) {
    onPeopleVehicleChange({
      ...peopleVehicle,
      taxiType: option.id,
      vehicleType: option.title,
    });
  }

  function moveTaxiOption(direction: -1 | 1) {
    const nextIndex = (selectedIndex + direction + taxiTypeOptions.length) % taxiTypeOptions.length;
    updateTaxiType(taxiTypeOptions[nextIndex]);
  }

  return (
    <section className="mt-7 space-y-4">
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
              {selectedIndex + 1} of {taxiTypeOptions.length}
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

        <div role="radiogroup" aria-label="Taxi type">
          <TaxiTypeOptionCard
            key={selectedOption.id}
            option={selectedOption}
            selected
            onSelect={() => updateTaxiType(selectedOption)}
          />
        </div>

      </div>

      {doesNotFit || !hasAnyFit ? (
        <div className="rounded-[18px] border border-amber-300/35 bg-amber-300/10 p-3">
          <p className="text-sm font-bold leading-5 text-amber-100">
            {hasAnyFit
              ? "Choose another taxi type or reduce luggage."
              : "No single taxi type clearly fits this group."}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-amber-100/85">
            {hasAnyFit
              ? "Try another taxi type or split into two pods."
              : "This group may need a larger vehicle or split pod."}
          </p>
          {!hasAnyFit ? (
            <p className="mt-3 rounded-[12px] border border-amber-300/25 px-3 py-2 text-xs font-black text-amber-100">
              Reduce luggage or split pod.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function TaxiOptionImage({ src, alt }: { src: string; alt: string }) {
  const [fallbackImage, setFallbackImage] = useState<{ originalSrc: string; imageSrc: string } | null>(null);
  const imageSrc = fallbackImage?.originalSrc === src ? fallbackImage.imageSrc : src;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={360}
      height={190}
      sizes="(max-width: 640px) 320px, 360px"
      unoptimized
      className="h-full w-full object-contain"
      onError={() => setFallbackImage({ originalSrc: src, imageSrc: TAXI_IMAGE_FALLBACK_SRC })}
    />
  );
}

function TaxiTypeOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: (typeof taxiTypeOptions)[number];
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
        "grid w-full gap-3 rounded-[22px] border bg-[linear-gradient(135deg,rgba(15,23,42,0.74),rgba(2,6,23,0.54))] p-3 text-left transition",
        selected
          ? "border-[var(--rp-primary)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--rp-primary)_42%,transparent),0_16px_36px_rgba(250,204,21,0.12)]"
          : "border-[var(--rp-border)] hover:border-sky-400/45",
      )}
    >
      <span className="relative flex min-h-28 items-center justify-center overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_50%_70%,rgba(250,204,21,0.2),transparent_56%)]">
        <span className={cn("block h-full w-full", option.id === "large_luggage_4_seat" && "scale-[1.22]")}>
          <TaxiOptionImage src={option.imageSrc} alt={option.title} />
        </span>
      </span>

      <span className="min-w-0">
        <span className="block text-[22px] font-black leading-tight text-[var(--rp-text)]">
          {option.title}
        </span>
        <span className="mt-1 block text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
          {option.description}
        </span>
        <span className="mt-3 grid grid-cols-2 gap-4">
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

    </button>
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
  const largeLuggageId = "large-luggage-toggle";

  return (
    <section className="mt-7 space-y-4">
      <div className="rounded-[26px] border border-[var(--rp-border-strong)] bg-[linear-gradient(145deg,rgba(14,165,233,0.08),rgba(15,23,42,0.28)),var(--rp-card)] p-5 text-center shadow-[0_22px_54px_rgba(3,7,18,0.28)]">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[var(--rp-primary)] bg-[radial-gradient(circle,rgba(255,210,101,0.2),rgba(15,23,42,0.52))] text-[var(--rp-primary)] shadow-[0_0_34px_rgba(246,196,83,0.14)]">
          <Luggage className="h-9 w-9" />
        </div>
        <h2 className="mt-4 text-[28px] font-black leading-tight text-[var(--rp-text)]">Luggage</h2>
        <p className="mx-auto mt-2 max-w-[230px] text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Add bag details before the taxi partner quotes.
        </p>

        <div className="mt-6 rounded-[22px] border border-[var(--rp-primary)]/35 bg-[rgba(7,19,38,0.62)] p-3">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Luggage count</p>
          <div className="mt-4 grid min-h-[84px] grid-cols-[48px_1fr_48px] items-center gap-2">
            <button
              type="button"
              aria-label="Decrease luggage count"
              disabled={peopleVehicle.bags <= minBags}
              onClick={() => onPeopleVehicleChange({ ...peopleVehicle, bags: Math.max(minBags, peopleVehicle.bags - 1) })}
              className="grid h-10 w-10 place-items-center justify-self-start rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-soft)] disabled:opacity-35"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="grid min-w-0 justify-items-center text-center">
              <p className="text-5xl font-black leading-none text-[var(--rp-text)]">{peopleVehicle.bags}</p>
              <p className="mt-2 max-w-[96px] text-center text-xs font-semibold leading-4 text-[var(--rp-muted)]">
                {peopleVehicle.bags === 1 ? "Standard piece" : "Standard pieces"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Increase luggage count"
              disabled={peopleVehicle.bags >= maxBags}
              onClick={() => onPeopleVehicleChange({ ...peopleVehicle, bags: Math.min(maxBags, peopleVehicle.bags + 1) })}
              className="grid h-10 w-10 place-items-center justify-self-end rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-soft)] disabled:opacity-35"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <label
          htmlFor={largeLuggageId}
          className="mx-auto mt-6 grid max-w-[220px] cursor-pointer justify-items-center gap-4 text-center"
        >
          <span>
            <span className="block text-xl font-black leading-6 text-[var(--rp-text)]">Large luggage</span>
            <span className="mt-2 block text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              Items longer than 75 cm or bulky equipment.
            </span>
          </span>
          <span
            className={cn(
              "relative h-10 w-[70px] shrink-0 rounded-full border transition",
              peopleVehicle.largeLuggage
                ? "border-[var(--rp-primary)] bg-[var(--rp-primary)]"
                : "border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)]",
            )}
          >
            <span
              className={cn(
                "absolute top-1 grid h-8 w-8 place-items-center rounded-full bg-[var(--rp-text)] transition",
                peopleVehicle.largeLuggage ? "left-[33px] text-[var(--rp-primary)]" : "left-1 text-[var(--rp-muted)]",
              )}
            />
          </span>
          <input
            id={largeLuggageId}
            type="checkbox"
            checked={peopleVehicle.largeLuggage}
            onChange={(event) => onPeopleVehicleChange({ ...peopleVehicle, largeLuggage: event.target.checked })}
            className="sr-only"
          />
        </label>
      </div>

      <p className="rounded-[20px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] p-4 text-left text-xs font-medium leading-5 text-[var(--rp-muted-strong)]">
        <Info className="mr-2 inline h-5 w-5 align-[-4px] text-[var(--rp-primary)]" />
        Luggage capacity is a guide and may vary by bag size. Actual space may vary by vehicle type and taxi partner.
      </p>
    </section>
  );
}

function PreferenceOptionCard({
  title,
  description,
  badge,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  badge?: string;
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
        "w-full rounded-[18px] border p-4 text-left transition",
        selected
          ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,var(--rp-card))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--rp-primary)_35%,transparent)]"
          : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] hover:border-sky-400/45",
      )}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-base font-black leading-5 text-[var(--rp-primary)]">{title}</span>
        {badge ? (
          <span className="rounded-full border border-[var(--rp-primary)]/45 bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--rp-primary)]">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="mt-2 block text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">{description}</span>
    </button>
  );
}

function WhoCanJoinSelector({
  podType,
  genderMode,
  accessMode,
  onGenderModeChange,
  onAccessModeChange,
}: {
  podType: PodType;
  genderMode: GenderMode;
  accessMode: AccessMode;
  onGenderModeChange: (genderMode: GenderMode) => void;
  onAccessModeChange: (accessMode: AccessMode) => void;
}) {
  const selectedWhoCanJoin = getWhoCanJoinId(genderMode, accessMode);

  function updateWhoCanJoin(whoCanJoin: WhoCanJoinId) {
    if (whoCanJoin === "women_only") {
      onGenderModeChange("women_only");
      onAccessModeChange("open");
      return;
    }

    onGenderModeChange("mixed");
    if (whoCanJoin === "verified_only") {
      onAccessModeChange("verified_only");
      return;
    }
    if (whoCanJoin === "invite_only") {
      onAccessModeChange("invite_only");
      return;
    }
    onAccessModeChange("open");
  }

  return (
    <section className="mt-7 grid gap-3">
      <div className="grid gap-3" role="radiogroup" aria-label="Who can join">
        {whoCanJoinOptions.map((option) => (
          <WhoCanJoinOptionCard
            key={option.id}
            id={option.id}
            title={option.title}
            description={option.description}
            helper={option.helper}
            selected={selectedWhoCanJoin === option.id}
            onSelect={() => updateWhoCanJoin(option.id)}
          />
        ))}
      </div>
      {podType === "recurring" ? (
        <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          This applies to every ride in this recurring pod.
        </p>
      ) : null}
    </section>
  );
}

function WhoCanJoinOptionCard({
  id,
  title,
  description,
  helper,
  selected,
  onSelect,
}: {
  id: WhoCanJoinId;
  title: string;
  description: string;
  helper?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon =
    id === "women_only"
      ? UserRound
      : id === "mixed"
        ? UsersRound
        : id === "verified_only"
          ? ShieldCheck
          : Mail;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex min-h-[78px] w-full items-center gap-3 rounded-[15px] border p-3 text-left transition",
        selected
          ? "border-[var(--rp-primary)] bg-[linear-gradient(135deg,rgba(246,196,83,0.12),rgba(15,23,42,0.76))] shadow-[0_0_0_1px_rgba(246,196,83,0.24),0_0_24px_rgba(246,196,83,0.18)]"
          : "border-[var(--rp-border)] bg-[rgba(15,23,42,0.74)] hover:border-[var(--rp-primary)]/45",
      )}
    >
      <span
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center rounded-[14px] border text-[var(--rp-primary)] transition",
          selected
            ? "border-[var(--rp-primary)]/45 bg-[rgba(246,196,83,0.12)]"
            : "border-[var(--rp-border)] bg-[var(--rp-card-muted)]",
        )}
      >
        <Icon className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black leading-5 text-[var(--rp-text)]">{title}</span>
        <span className="mt-1 block text-xs font-semibold leading-4 text-[var(--rp-muted-strong)]">{description}</span>
        {helper ? (
          <span className="mt-2 block text-xs font-semibold leading-4 text-[var(--rp-primary)]">
            {helper}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
          selected ? "border-[var(--rp-primary)]" : "border-[var(--rp-muted)]",
        )}
      >
        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--rp-primary)]" /> : null}
      </span>
    </button>
  );
}

function TaxiPartnerPreferenceSelector({
  podType,
  value,
  onChange,
}: {
  podType: PodType;
  value: TaxiPartnerPreference;
  onChange: (value: TaxiPartnerPreference) => void;
}) {
  const contextNotes = podType === "recurring" ? ["This preference applies to recurring quote requests."] : [];

  return (
    <section className="mt-7 grid gap-3">
      <div className="grid gap-3" role="radiogroup" aria-label="Taxi partner preference">
        {taxiPartnerPreferenceOptions.map((option) => {
          return (
            <PreferenceOptionCard
              key={option.id}
              title={option.title}
              description={option.description}
              selected={value === option.id}
              onSelect={() => onChange(option.id)}
            />
          );
        })}
      </div>
      {contextNotes.map((note) => (
        <p
          key={note}
          className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]"
        >
          {note}
        </p>
      ))}
    </section>
  );
}

function SelfSettleOptionGrid<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; title: string; description?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-black text-[var(--rp-text)]">{label}</p>
      <div className="mt-2 grid gap-2">
        {options.map((option) => {
          const selected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                "min-w-0 overflow-hidden rounded-[16px] border px-3 py-3 text-left transition",
                selected
                  ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_13%,var(--rp-card))]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] hover:border-[var(--rp-border-strong)]",
              )}
            >
              <span className={cn("block break-words text-sm font-black leading-5", selected ? "text-[var(--rp-primary)]" : "text-[var(--rp-text)]")}>
                {option.title}
              </span>
              {option.description ? (
                <span className="mt-1 block break-words text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelfSettleDetailsSelector({
  peopleVehicle,
  onPeopleVehicleChange,
}: {
  peopleVehicle: PeopleVehicleState;
  onPeopleVehicleChange: (peopleVehicle: PeopleVehicleState) => void;
}) {
  return (
    <section className="grid gap-4">
      <SelfSettleSelectField
        label="Ride app"
        value={peopleVehicle.rideAppProvider}
        options={rideAppProviderOptions}
        helper="Choose the app your group expects to book outside RidePod."
        onChange={(rideAppProvider) => onPeopleVehicleChange({ ...peopleVehicle, rideAppProvider })}
      />

      <SelfSettleTextField
        label="Total estimate fee"
        value={peopleVehicle.estimatedRideAppFare}
        placeholder="e.g. HK$68"
        helper="Optional. Host can check and update this after the pod is confirmed."
        onChange={(estimatedRideAppFare) => onPeopleVehicleChange({ ...peopleVehicle, estimatedRideAppFare })}
      />

      <SelfSettleOptionGrid
        label="Split method"
        value={peopleVehicle.splitMethod}
        options={selfSettleSplitMethodOptions}
        onChange={(splitMethod) => onPeopleVehicleChange({ ...peopleVehicle, splitMethod })}
      />

      <SelfSettleOptionGrid
        label="Payment method after ride"
        value={peopleVehicle.paymentMethod}
        options={selfSettlePaymentMethodOptions}
        onChange={(paymentMethod) => onPeopleVehicleChange({ ...peopleVehicle, paymentMethod })}
      />

    </section>
  );
}

function RideAppProviderSelector({
  peopleVehicle,
  onPeopleVehicleChange,
}: {
  peopleVehicle: PeopleVehicleState;
  onPeopleVehicleChange: (peopleVehicle: PeopleVehicleState) => void;
}) {
  return (
    <section className="grid gap-4">
      <SelfSettleSelectField
        label="Choose ride app"
        value={peopleVehicle.rideAppProvider}
        options={rideAppProviderOptions}
        onChange={(rideAppProvider) => onPeopleVehicleChange({ ...peopleVehicle, rideAppProvider })}
      />
      {peopleVehicle.rideAppProvider === "other" ? (
        <SelfSettleTextField
          label="App name"
          value={peopleVehicle.rideAppProviderOther}
          placeholder="e.g. Blacklane, local car app"
          helper="This name will appear on the pod summary."
          onChange={(rideAppProviderOther) => onPeopleVehicleChange({ ...peopleVehicle, rideAppProviderOther })}
        />
      ) : null}
      <p className="rounded-[16px] border border-blue-300/20 bg-blue-400/10 p-3 text-xs font-bold leading-5 text-blue-100">
        Riders will see this before joining. The host books with the selected app outside RidePod.
      </p>
    </section>
  );
}

function RideAppBookingRulesStep({
  peopleVehicle,
  currentStep = 4,
  stepLabels = rideAppCreateSteps,
  onPeopleVehicleChange,
  onBack,
  onContinue,
}: {
  peopleVehicle: PeopleVehicleState;
  currentStep?: CreateStep;
  stepLabels?: string[];
  onPeopleVehicleChange: (peopleVehicle: PeopleVehicleState) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const maxMinimumRidersToGo = Math.max(1, peopleVehicle.seatsAvailable - 1);
  const selectedMinimumConfirmedRiders = Math.max(
    1,
    Math.min(maxMinimumRidersToGo, peopleVehicle.rideAppMinimumConfirmedRiders),
  );
  const selectedPaymentMethods = peopleVehicle.rideAppAcceptedPaymentMethods;
  const hasPaymentMethod = selectedPaymentMethods.length > 0;
  const otherPaymentMethodSelected = selectedPaymentMethods.includes("other");
  const otherPaymentMethodLabel = peopleVehicle.rideAppPaymentMethodOther.trim();
  const otherPaymentMethodValid = !otherPaymentMethodSelected || otherPaymentMethodLabel.length > 0;
  const minRidersValid =
    selectedMinimumConfirmedRiders >= 1 && selectedMinimumConfirmedRiders <= maxMinimumRidersToGo;
  const canContinue = hasPaymentMethod && otherPaymentMethodValid && minRidersValid;
  const [isPaymentTimingOpen, setIsPaymentTimingOpen] = useState(true);
  const [isOtherPaymentDialogOpen, setIsOtherPaymentDialogOpen] = useState(false);
  const [otherPaymentDraft, setOtherPaymentDraft] = useState(peopleVehicle.rideAppPaymentMethodOther);
  const [minimumRidersDraft, setMinimumRidersDraft] = useState(() => String(selectedMinimumConfirmedRiders));
  const paymentTimingPanelId = useId();

  function updateMinimumRidersToGo(value: number) {
    const nextMinimum = Math.max(1, Math.min(maxMinimumRidersToGo, value || 1));

    onPeopleVehicleChange({
      ...peopleVehicle,
      rideAppBookingTrigger: "minimum_riders_confirmed",
      rideAppMinimumConfirmedRiders: nextMinimum,
    });
  }

  function handleMinimumRidersDraftChange(value: string) {
    setMinimumRidersDraft(value);

    const nextMinimum = Number(value);
    if (Number.isFinite(nextMinimum)) updateMinimumRidersToGo(nextMinimum);
  }

  useEffect(() => {
    if (
      peopleVehicle.rideAppBookingTrigger === "minimum_riders_confirmed" &&
      peopleVehicle.rideAppMinimumConfirmedRiders === selectedMinimumConfirmedRiders
    ) {
      return;
    }

    onPeopleVehicleChange({
      ...peopleVehicle,
      rideAppBookingTrigger: "minimum_riders_confirmed",
      rideAppMinimumConfirmedRiders: selectedMinimumConfirmedRiders,
    });
  }, [onPeopleVehicleChange, peopleVehicle, selectedMinimumConfirmedRiders]);

  function setPaymentMethodSelected(paymentMethod: SelfSettlePaymentMethod, selected: boolean) {
    const nextPaymentMethods = selectedPaymentMethods.includes(paymentMethod)
      ? selected
        ? selectedPaymentMethods
        : selectedPaymentMethods.filter((method) => method !== paymentMethod)
      : selected
        ? [...selectedPaymentMethods, paymentMethod]
        : selectedPaymentMethods;

    onPeopleVehicleChange({
      ...peopleVehicle,
      rideAppAcceptedPaymentMethods: nextPaymentMethods,
      paymentMethod: nextPaymentMethods[0] ?? peopleVehicle.paymentMethod,
    });
  }

  function handlePaymentMethodToggle(paymentMethod: SelfSettlePaymentMethod) {
    if (paymentMethod === "other") {
      setOtherPaymentDraft(peopleVehicle.rideAppPaymentMethodOther);
      setIsOtherPaymentDialogOpen(true);
      return;
    }

    setPaymentMethodSelected(paymentMethod, !selectedPaymentMethods.includes(paymentMethod));
  }

  function saveOtherPaymentMethod() {
    const nextOtherPaymentMethod = otherPaymentDraft.trim();

    if (!nextOtherPaymentMethod) return;

    const nextPaymentMethods = selectedPaymentMethods.includes("other")
      ? selectedPaymentMethods
      : [...selectedPaymentMethods, "other" as SelfSettlePaymentMethod];

    onPeopleVehicleChange({
      ...peopleVehicle,
      rideAppPaymentMethodOther: nextOtherPaymentMethod,
      rideAppAcceptedPaymentMethods: nextPaymentMethods,
      paymentMethod: nextPaymentMethods[0] ?? peopleVehicle.paymentMethod,
    });
    setIsOtherPaymentDialogOpen(false);
  }

  function removeOtherPaymentMethod() {
    const nextPaymentMethods = selectedPaymentMethods.filter((method) => method !== "other");

    onPeopleVehicleChange({
      ...peopleVehicle,
      rideAppPaymentMethodOther: "",
      rideAppAcceptedPaymentMethods: nextPaymentMethods,
      paymentMethod: nextPaymentMethods[0] ?? peopleVehicle.paymentMethod,
    });
    setOtherPaymentDraft("");
    setIsOtherPaymentDialogOpen(false);
  }

  return (
    <>
      <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-7">
        <section className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Ride app</p>
          <h1 className="mt-2 whitespace-nowrap text-[25px] font-black leading-tight text-[var(--rp-text)]">
            Booking & Payment Rules
          </h1>
          <p className="mx-auto mt-2 max-w-[300px] text-sm font-medium leading-6 text-[var(--rp-muted)]">
            Set when the host should book and how riders will settle after the ride.
          </p>
        </section>

        <section className="mt-6 grid gap-4 rounded-[24px] border border-cyan-300/35 bg-[linear-gradient(135deg,rgba(56,189,248,0.12),rgba(124,58,237,0.10),rgba(15,23,42,0.78))] p-4 shadow-[var(--rp-shadow-soft)]">
          <div>
            <h2 className="text-lg font-black text-[var(--rp-primary)]">Minimum riders to go</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
              Set the minimum joined riders needed before the host books. If fewer riders join, the pod can be cancelled.
            </p>
          </div>

          <label className="grid gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[rgba(5,12,20,0.36)] p-4">
            <span className="text-xs font-black uppercase tracking-[0.13em] text-cyan-100">
              Minimum riders
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxMinimumRidersToGo}
              value={minimumRidersDraft}
              onChange={(event) => handleMinimumRidersDraftChange(event.target.value)}
              onBlur={() => setMinimumRidersDraft(String(selectedMinimumConfirmedRiders))}
              className="min-h-11 rounded-xl border border-[var(--rp-border)] bg-[rgba(5,12,20,0.72)] px-3 text-base font-black text-[var(--rp-text)] outline-none focus:border-cyan-300"
            />
            <span className="text-xs font-black text-[var(--rp-primary)]">
              At least {selectedMinimumConfirmedRiders} rider{selectedMinimumConfirmedRiders === 1 ? "" : "s"} to go
            </span>
          </label>
        </section>

        <section className="mt-4 rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
          <button
            type="button"
            onClick={() => setIsPaymentTimingOpen((current) => !current)}
            aria-expanded={isPaymentTimingOpen}
            aria-controls={paymentTimingPanelId}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h2 className="text-lg font-black text-[var(--rp-primary)]">Ride fare payment timing</h2>
            {isPaymentTimingOpen ? (
              <ChevronUp className="h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
            ) : (
              <ChevronDown className="h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
            )}
          </button>
          {isPaymentTimingOpen ? (
            <p id={paymentTimingPanelId} className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Riders settle the final ride fare directly with the booker after the ride is completed.
            </p>
          ) : null}
        </section>

        <section className="mt-4 rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
          <h2 className="text-lg font-black text-[var(--rp-primary)]">Accepted payment methods</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
            Riders will see these methods before joining. Final payment is handled outside RidePod.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {selfSettlePaymentMethodOptions.map((method) => {
              const selected = selectedPaymentMethods.includes(method.id);

              return (
                <label
                  key={method.id}
                  className={cn(
                    "flex min-h-12 items-center gap-2 rounded-[16px] border px-3 text-sm font-black transition",
                    selected
                      ? "border-cyan-300/80 bg-cyan-300/10 text-cyan-100"
                      : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handlePaymentMethodToggle(method.id)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{method.title}</span>
                    {method.id === "other" && selected && otherPaymentMethodLabel ? (
                      <span className="mt-0.5 block truncate text-[11px] font-black text-cyan-100/80">
                        {otherPaymentMethodLabel}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
          {!hasPaymentMethod ? (
            <p className="mt-2 text-xs font-black text-[var(--rp-danger)]">Choose at least one payment method.</p>
          ) : null}
          {otherPaymentMethodSelected && !otherPaymentMethodValid ? (
            <p className="mt-2 text-xs font-black text-[var(--rp-danger)]">Type the preferred payment method for Other.</p>
          ) : null}
        </section>

        <div className="mt-5">
          <CreatePodStepActions onBack={onBack} onContinue={onContinue} disabled={!canContinue} />
        </div>
      </main>

      {isOtherPaymentDialogOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="other-payment-dialog-title"
        >
          <section className="w-full max-w-[360px] rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <h2 id="other-payment-dialog-title" className="text-xl font-black text-[var(--rp-primary)]">
              Preferred payment method
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Tell riders which payment method you prefer.
            </p>
            <label className="mt-4 grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.13em] text-[var(--rp-muted)]">
                Payment method
              </span>
              <input
                value={otherPaymentDraft}
                onChange={(event) => setOtherPaymentDraft(event.target.value)}
                placeholder="e.g. AlipayHK, bank transfer"
                autoFocus
                className="min-h-12 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-cyan-300"
              />
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOtherPaymentDraft(peopleVehicle.rideAppPaymentMethodOther);
                  setIsOtherPaymentDialogOpen(false);
                }}
                className="min-h-12 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveOtherPaymentMethod}
                disabled={!otherPaymentDraft.trim()}
                className="min-h-12 rounded-[16px] bg-[linear-gradient(180deg,#ffe48a,#f6b63f)] text-sm font-black text-black shadow-[0_12px_28px_rgba(246,182,63,0.25)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Save
              </button>
            </div>
            {otherPaymentMethodSelected ? (
              <button
                type="button"
                onClick={removeOtherPaymentMethod}
                className="mt-3 min-h-10 w-full rounded-[14px] border border-[var(--rp-danger)]/40 bg-[var(--rp-danger)]/10 text-xs font-black text-[var(--rp-danger)]"
              >
                Remove Other
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
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

function VehicleDarkPanel({ variant = "default" }: { variant?: "default" | "taxiSelector" | "luggage" | "whoCanJoin" }) {
  const isTaxiSelector = variant === "taxiSelector";
  const isLuggage = variant === "luggage";
  const isWhoCanJoin = variant === "whoCanJoin";
  const isDefault = variant === "default";
  // TODO: Replace with rider group image for Who Can Join step.
  const imageSrc =
    isTaxiSelector || isLuggage || isWhoCanJoin
      ? "/images/ridepod/taxi-selector-left.jpg"
      : "/images/ridepod/people-vehicle-dark.png";

  return (
    <aside className="people-vehicle-dark-panel relative min-h-[650px] overflow-hidden border-r border-[var(--rp-border-strong)]">
      <Image
        src={imageSrc}
        alt=""
        fill
        sizes={isTaxiSelector || isLuggage || isWhoCanJoin ? "(max-width: 768px) 40vw, 360px" : "(max-width: 768px) 52vw, 360px"}
        quality={100}
        className={cn("object-cover", isTaxiSelector || isLuggage || isWhoCanJoin ? "object-center" : "object-[38%_center]")}
        priority
      />
      <div className={cn(
        "absolute inset-0",
        isTaxiSelector || isLuggage || isWhoCanJoin
          ? "bg-[linear-gradient(90deg,rgba(5,11,18,0.1),rgba(5,11,18,0.02)_48%,rgba(5,11,18,0.34)),linear-gradient(180deg,rgba(5,11,18,0.02),rgba(5,11,18,0.1)_58%,rgba(5,11,18,0.48))]"
          : "bg-[linear-gradient(90deg,rgba(5,11,18,0.2),rgba(5,11,18,0.02)_45%,rgba(5,11,18,0.32)),linear-gradient(180deg,rgba(5,11,18,0.03),rgba(5,11,18,0.18)_58%,rgba(5,11,18,0.7))]",
      )} />
      {isDefault ? (
        <>
          <div className="absolute inset-x-[24%] top-[25%] h-[30%]">
            <svg viewBox="0 0 92 220" className="h-full w-full overflow-visible drop-shadow-[0_0_14px_rgba(246,196,83,0.65)]" aria-hidden="true">
              <path
                d="M17 13 C 24 45, 53 58, 61 91 S 29 136, 35 169 S 52 197, 70 211"
                fill="none"
                stroke="#f6c453"
                strokeLinecap="round"
                strokeWidth="8"
              />
              <circle cx="17" cy="13" r="13" fill="#07111a" stroke="#ffd36a" strokeWidth="6" />
              <circle cx="70" cy="211" r="15" fill="#07111a" stroke="#ffd36a" strokeWidth="7" />
              <circle cx="70" cy="211" r="5" fill="#ffd36a" />
            </svg>
          </div>
          <div className="absolute left-[42%] top-[25%] rounded-xl bg-[#07111a]/45 px-2 py-1 text-sm font-semibold leading-5 text-slate-200 backdrop-blur-sm">
            <p>Pickup</p>
            <p>7:10 PM</p>
          </div>
          <div className="absolute left-[24%] top-[47%] rounded-xl bg-[#07111a]/45 px-2 py-1 text-sm font-semibold leading-5 text-slate-200 backdrop-blur-sm">
            <p>Drop-off</p>
            <p>7:43 PM</p>
          </div>
          <div className="absolute bottom-8 left-5 right-5 rounded-[12px] border border-white/12 bg-[#07111a]/68 p-3 text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-md">
            <p className="flex items-center gap-2 text-sm font-black text-[#ffd36a]">
              <UsersRound className="h-5 w-5" />
              Group ride
            </p>
            <p className="mt-3 text-sm font-medium leading-5 text-slate-200">
              Coordinated pickup. One seamless ride.
            </p>
          </div>
        </>
      ) : null}
    </aside>
  );
}

function PeopleVehicleStep({
  podType,
  peopleVehicle,
  genderMode,
  accessMode,
  taxiPartnerPreference,
  stopRequestPolicy,
  isAirportTrip,
  onPeopleVehicleChange,
  onGenderModeChange,
  onAccessModeChange,
  onTaxiPartnerPreferenceChange,
  onStopRequestPolicyChange,
  onBack,
  onContinue,
  currentStep = 0,
  stepLabels = baseCreateSteps,
  onRequireAuth,
  rideAppAccessNotice,
  taxiCreateUnlocked,
  showBackAction = true,
}: {
  podType: PodType;
  peopleVehicle: PeopleVehicleState;
  genderMode: GenderMode;
  accessMode: AccessMode;
  taxiPartnerPreference: TaxiPartnerPreference;
  stopRequestPolicy: StopRequestPolicy;
  isAirportTrip: boolean;
  onPeopleVehicleChange: (peopleVehicle: PeopleVehicleState) => void;
  onGenderModeChange: (genderMode: GenderMode) => void;
  onAccessModeChange: (accessMode: AccessMode) => void;
  onTaxiPartnerPreferenceChange: (preference: TaxiPartnerPreference) => void;
  onStopRequestPolicyChange: (value: StopRequestPolicy) => void;
  onBack: () => void;
  onContinue: () => void;
  currentStep?: CreateStep;
  stepLabels?: string[];
  onRequireAuth?: () => boolean;
  rideAppAccessNotice?: { blocked: boolean; message: string } | null;
  taxiCreateUnlocked: boolean;
  showBackAction?: boolean;
}) {
  const selectedRideOptionId = normalizeRideOptionId(peopleVehicle.rideOption);
  const isTaxiFlow = selectedRideOptionId === "taxi_partner_quote" || selectedRideOptionId === "taxi_meter";
  const isRideAppSelfSettle = selectedRideOptionId === "ride_app_fixed_quote";
  const [taxiDetailsPage, setTaxiDetailsPage] = useState<"category" | "type" | "needs" | "join" | "partner" | "provider" | "selfSettle">("category");
  const isTaxiTypePage = isTaxiFlow && taxiDetailsPage === "type";
  const isRideCategoryPage = taxiDetailsPage === "category";
  const [showRideConfirm, setShowRideConfirm] = useState(false);
  const [rideConfirmChecked, setRideConfirmChecked] = useState(false);
  const [confirmedRideOption, setConfirmedRideOption] = useState<ActiveRideOptionId | null>(null);

  function handleContinue() {
    if (onRequireAuth && !onRequireAuth()) return;

    if (isRideAppSelfSettle && rideAppAccessNotice?.blocked) return;

    if (taxiDetailsPage === "category") {
      if (isRideAppSelfSettle) {
        setTaxiDetailsPage("provider");
        return;
      }

      if (isTaxiFlow) {
        setTaxiDetailsPage("type");
        return;
      }

      setConfirmedRideOption(selectedRideOptionId);
      onContinue();
      return;
    }

    if (isRideAppSelfSettle && taxiDetailsPage === "provider") {
      setConfirmedRideOption(selectedRideOptionId);
      onContinue();
      return;
    }

    if (isRideAppSelfSettle && taxiDetailsPage === "selfSettle") {
      setTaxiDetailsPage("join");
      return;
    }

    if (isRideAppSelfSettle && taxiDetailsPage === "join") {
      setConfirmedRideOption(selectedRideOptionId);
      onContinue();
      return;
    }

    if (isTaxiFlow && taxiDetailsPage === "type") {
      setTaxiDetailsPage("needs");
      return;
    }

    if (isTaxiFlow && taxiDetailsPage === "needs") {
      setTaxiDetailsPage("join");
      return;
    }

    if (isTaxiFlow && taxiDetailsPage === "join") {
      setTaxiDetailsPage("partner");
      return;
    }

    if (selectedRideOptionId === "taxi_partner_quote") {
      setConfirmedRideOption(selectedRideOptionId);
      onContinue();
      return;
    }

    if (confirmedRideOption !== selectedRideOptionId) {
      setRideConfirmChecked(false);
      setShowRideConfirm(true);
      return;
    }

    onContinue();
  }

  function handleBack() {
    if (isRideAppSelfSettle && taxiDetailsPage === "provider") {
      setTaxiDetailsPage("category");
      return;
    }

    if (isRideAppSelfSettle && taxiDetailsPage === "join") {
      setTaxiDetailsPage("selfSettle");
      return;
    }

    if (isRideAppSelfSettle && taxiDetailsPage === "selfSettle") {
      setTaxiDetailsPage("category");
      return;
    }

    if (isTaxiFlow && taxiDetailsPage === "partner") {
      setTaxiDetailsPage("join");
      return;
    }

    if (isTaxiFlow && taxiDetailsPage === "join") {
      setTaxiDetailsPage("needs");
      return;
    }

    if (isTaxiFlow && taxiDetailsPage === "needs") {
      setTaxiDetailsPage("type");
      return;
    }

    if (isTaxiFlow && taxiDetailsPage === "type") {
      setTaxiDetailsPage("category");
      return;
    }

    onBack();
  }

  const isLuggagePage = isTaxiFlow && taxiDetailsPage === "needs";
  const isWhoCanJoinPage = (isTaxiFlow || isRideAppSelfSettle) && taxiDetailsPage === "join";
  const isTaxiPartnerPreferencePage = isTaxiFlow && taxiDetailsPage === "partner";
  const isRideAppProviderPage = isRideAppSelfSettle && taxiDetailsPage === "provider";
  const isSelfSettleDetailsPage = isRideAppSelfSettle && taxiDetailsPage === "selfSettle";
  const usesSplitTaxiLayout = isTaxiTypePage || isLuggagePage || isWhoCanJoinPage || isRideAppProviderPage || isSelfSettleDetailsPage;
  const providerOtherMissing = isRideAppProviderPage && peopleVehicle.rideAppProvider === "other" && !peopleVehicle.rideAppProviderOther.trim();
  const continueDisabled = (isRideAppSelfSettle && rideAppAccessNotice?.blocked === true) || providerOtherMissing;

  return (
    <>
      <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} onBack={!isRideCategoryPage || isRideAppProviderPage ? handleBack : undefined} />

      <main className={cn(
        "people-vehicle-layout scrollbar-hide min-h-0 flex-1 overflow-y-auto",
        isRideCategoryPage && "ride-category-layout",
        isTaxiTypePage && "taxi-selector-layout",
        isLuggagePage && "luggage-selector-layout",
        isWhoCanJoinPage && "who-can-join-layout",
        isRideAppProviderPage && "self-settle-details-layout",
        isSelfSettleDetailsPage && "self-settle-details-layout",
      )}>
        {!isRideCategoryPage && !isRideAppProviderPage && !isSelfSettleDetailsPage ? (
          <VehicleDarkPanel
            variant={
              isTaxiTypePage || isTaxiPartnerPreferencePage
                ? "taxiSelector"
                : isLuggagePage || isSelfSettleDetailsPage
                  ? "luggage"
                  : isWhoCanJoinPage
                    ? "whoCanJoin"
                    : "default"
            }
          />
        ) : null}
        <section className={cn("people-vehicle-content flex min-h-0 flex-col px-6 pb-10 pt-8", usesSplitTaxiLayout && "taxi-selector-content", isRideCategoryPage && "ride-category-content", (isRideAppProviderPage || isSelfSettleDetailsPage) && "self-settle-details-content")}>
          <div className={cn("text-center", isRideCategoryPage && "text-left")}>
            <ScheduleTypeEyebrow podType={podType} />
            {((isTaxiFlow && taxiDetailsPage === "needs") ||
              isWhoCanJoinPage ||
              isRideAppProviderPage ||
              isSelfSettleDetailsPage ||
              (isTaxiFlow && taxiDetailsPage === "partner") ||
              (isTaxiFlow && taxiDetailsPage === "type")) ? (
              <h1
                className={cn(
                  "font-black leading-tight text-[var(--rp-text)]",
                  isTaxiTypePage
                    ? "whitespace-nowrap text-[28px] min-[390px]:text-[30px]"
                    : isRideCategoryPage
                      ? "mt-7 whitespace-nowrap text-[27px] min-[390px]:text-[31px]"
                      : "whitespace-nowrap text-[25px] min-[390px]:text-[27px]",
                )}
              >
                {isTaxiFlow && taxiDetailsPage === "needs"
                  ? "Luggage"
                  : isWhoCanJoinPage
                    ? "Who can join?"
                  : isRideAppProviderPage
                    ? "Which ride app?"
                  : isSelfSettleDetailsPage
                    ? "Ride App"
                  : isTaxiFlow && taxiDetailsPage === "partner"
                    ? "Taxi partner preference"
                  : "Choose Taxi Type"}
              </h1>
            ) : null}
            {!isRideCategoryPage ? (
              <p className="mx-auto mt-2 max-w-[280px] text-center text-base font-medium leading-6 text-[var(--rp-muted)]">
                {isTaxiFlow && taxiDetailsPage === "needs"
                  ? "Tell taxi partners your bag count before they quote."
                  : isWhoCanJoinPage
                    ? "Choose who can join this shared taxi pod."
                    : isRideAppProviderPage
                      ? "Choose the app the host will book."
                    : isSelfSettleDetailsPage
                    ? "Set the estimate, split, and how riders will settle the final fare after the ride."
                  : isTaxiFlow && taxiDetailsPage === "partner"
                    ? "Choose what kind of taxi partner you prefer for this ride."
                  : isTaxiFlow && taxiDetailsPage === "type"
                    ? "Choose based on riders and luggage."
                  : null}
              </p>
            ) : null}
          </div>

          <div className={isRideCategoryPage ? "mt-6" : "mt-7"}>
            {isTaxiFlow && taxiDetailsPage === "needs" ? (
              <TaxiNeedsSelector
                peopleVehicle={peopleVehicle}
                onPeopleVehicleChange={onPeopleVehicleChange}
              />
            ) : isRideAppProviderPage ? (
              <RideAppProviderSelector
                peopleVehicle={peopleVehicle}
                onPeopleVehicleChange={onPeopleVehicleChange}
              />
            ) : isSelfSettleDetailsPage ? (
              <SelfSettleDetailsSelector
                peopleVehicle={peopleVehicle}
                onPeopleVehicleChange={onPeopleVehicleChange}
              />
            ) : isWhoCanJoinPage ? (
              <WhoCanJoinSelector
                podType={podType}
                genderMode={genderMode}
                accessMode={accessMode}
                onGenderModeChange={onGenderModeChange}
                onAccessModeChange={onAccessModeChange}
              />
            ) : isTaxiFlow && taxiDetailsPage === "partner" ? (
              <TaxiPartnerPreferenceSelector
                podType={podType}
                value={taxiPartnerPreference}
                onChange={onTaxiPartnerPreferenceChange}
              />
            ) : isTaxiFlow && taxiDetailsPage === "type" ? (
              <TaxiTypeSelector
                peopleVehicle={peopleVehicle}
                onPeopleVehicleChange={onPeopleVehicleChange}
              />
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
                  peopleVehicle={peopleVehicle}
                  taxiCreateUnlocked={taxiCreateUnlocked}
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
              </>
            )}
          </div>

          <div className="mt-6">
            {isRideAppSelfSettle && rideAppAccessNotice ? (
              <p className="mb-3 rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-center text-xs font-bold leading-5 text-blue-100">
                {rideAppAccessNotice.message}
              </p>
            ) : null}
            <CreatePodStepActions
              onBack={handleBack}
              onContinue={handleContinue}
              disabled={continueDisabled}
              showBack={showBackAction || isRideAppProviderPage}
              continueIcon={isRideCategoryPage ? <ArrowRight className="h-6 w-6" /> : undefined}
            />
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
          className="object-cover object-center"
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
    body: "This is RidePod's best estimate before the ride is booked. It may come from RidePod's route baseline, the host's estimate, or the host's uploaded quote. It is not the final charge. RidePod fee is 10% of each guest's fare share, with a HK$6 minimum in the mock/demo model. Final settlement uses the verified receipt after the ride.",
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

function getWhoCanJoinId(genderMode: GenderMode, accessMode: AccessMode): WhoCanJoinId {
  if (genderMode === "women_only") return "women_only";
  if (accessMode === "verified_only") return "verified_only";
  if (accessMode === "invite_only") return "invite_only";
  return "mixed";
}

function getWhoCanJoinLabel(genderMode: GenderMode, accessMode: AccessMode) {
  const whoCanJoin = getWhoCanJoinId(genderMode, accessMode);
  if (whoCanJoin === "women_only") return "Women-only pod";
  if (whoCanJoin === "verified_only") return "Verified-only";
  if (whoCanJoin === "invite_only") return "Invite-only";
  return "Open pod";
}

function getTaxiPartnerPreferenceLabel(preference: TaxiPartnerPreference) {
  return taxiPartnerPreferenceOptions.find((option) => option.id === preference)?.title ?? "Standard taxi partner";
}

function getSelfSettleSplitMethodLabel(splitMethod: SelfSettleSplitMethod) {
  return selfSettleSplitMethodOptions.find((option) => option.id === splitMethod)?.title ?? "Equal split";
}

function getRideAppProviderLabel(provider: RideAppProvider, otherProvider = "") {
  if (provider === "other") return otherProvider.trim() || "Other";
  return rideAppProviderOptions.find((option) => option.id === provider)?.title ?? "Uber";
}

function getSelfSettlePaymentMethodLabel(paymentMethod: SelfSettlePaymentMethod, otherPaymentMethod = "") {
  if (paymentMethod === "other") return otherPaymentMethod.trim() || "Other";
  return selfSettlePaymentMethodOptions.find((option) => option.id === paymentMethod)?.title ?? "PayMe";
}

function formatMinimumRidersToGo(count: number) {
  return `At least ${count} rider${count === 1 ? "" : "s"} to go`;
}

function getRideAppBookingTriggerLabel(peopleVehicle: PeopleVehicleState) {
  return formatMinimumRidersToGo(peopleVehicle.rideAppMinimumConfirmedRiders);
}

function getStopRequestPolicyLabel(policy: StopRequestPolicy) {
  return policy === "host_approved_before_quote" ? "Host-approved before quote" : "Direct route only";
}

function districtFromLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("central") || normalized.includes("ifc")) return "Central";
  if (normalized.includes("tsim sha tsui") || normalized.includes("tst")) return "Tsim Sha Tsui";
  if (normalized.includes("airport") || normalized.includes("lax")) return "Airport";
  return "Central";
}

function getLuggageLabel(peopleVehicle: PeopleVehicleState) {
  if (peopleVehicle.largeLuggage || peopleVehicle.extraSpaceNeeded) return "Large luggage";
  if (peopleVehicle.bags <= 0) return "No luggage";
  if (peopleVehicle.bags === 1) return "1 bag";
  return peopleVehicle.bags <= 2 ? "Small bags only" : `${peopleVehicle.bags} bags`;
}

function getAccessLabel(peopleVehicle: PeopleVehicleState) {
  const needs = [
    peopleVehicle.wheelchairAccessibleRequested ? "Wheelchair access" : null,
    peopleVehicle.stepFreeSupportRequested ? "Step-free support" : null,
  ].filter((item): item is string => Boolean(item));

  return needs.length ? needs.join(", ") : "No special access needs";
}

function getCreatedPodTypeLabel(genderMode: GenderMode, accessMode: AccessMode): HomeRide["podType"] {
  if (genderMode === "women_only") return "Women-only";
  if (accessMode === "verified_only") return "Verified-only";
  if (accessMode === "invite_only") return "Invite-only";
  return "Open pod";
}

function getAirportHomeRideFields(airportDetails?: AirportDetailsState | null): Partial<HomeRide> {
  if (!airportDetails) {
    return {
      tripKind: "normal",
      airportDirection: null,
      airportLuggage: null,
    };
  }

  return {
    tripKind: "airport",
    airportDirection: airportDetails.airportDirection,
    flightNumber: airportDetails.flightNumber.trim() || null,
    flightFrom: airportDetails.flightFrom.trim() || null,
    flightTo: airportDetails.flightTo.trim() || null,
    flightTimeLabel: airportDetails.flightTimeLabel.trim() || null,
    airportTerminal: airportDetails.airportTerminal.trim() || null,
    airportHall: airportDetails.airportHall.trim() || null,
    airportLuggage: {
      largeSuitcases: airportDetails.airportLuggage.largeSuitcases,
      cabinBags: airportDetails.airportLuggage.cabinBags,
      specialItems: getAirportSpecialItems(airportDetails),
      note: airportDetails.airportLuggage.note.trim() || undefined,
    },
  };
}

function buildCreatedRideAppHomeRide({
  pickupAddress,
  dropoffAddress,
  dateTime,
  peopleVehicle,
  accessMode,
  stopRequestPolicy,
  airportDetails,
  hostAvatarPreference,
  hostAvatarUrl,
  hostDisplayName,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  peopleVehicle: PeopleVehicleState;
  accessMode: AccessMode;
  stopRequestPolicy: StopRequestPolicy;
  airportDetails?: AirportDetailsState | null;
  hostAvatarPreference?: RidePodAvatarPreference;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
}): HomeRide {
  const id = crypto.randomUUID();
  const airportFields = getAirportHomeRideFields(airportDetails);
  const isAirportRide = airportFields.tripKind === "airport";
  const rideAppProviderName = getRideAppProviderLabel(peopleVehicle.rideAppProvider, peopleVehicle.rideAppProviderOther);
  const acceptedPaymentMethods = peopleVehicle.rideAppAcceptedPaymentMethods.map((paymentMethod) =>
    getSelfSettlePaymentMethodLabel(paymentMethod, peopleVehicle.rideAppPaymentMethodOther),
  );
  const splitMethod = getSelfSettleSplitMethodLabel(peopleVehicle.splitMethod);
  const estimatedFare = peopleVehicle.estimatedRideAppFare.trim();
  const luggageLabel = airportDetails ? getAirportLuggageSummary(airportDetails) : getLuggageLabel(peopleVehicle);

  return {
    id,
    fromDistrict: peopleVehicle.pickupDistrict || districtFromLabel(pickupAddress),
    toDistrict: peopleVehicle.dropoffDistrict || districtFromLabel(dropoffAddress),
    fromLabel: pickupAddress || "Pickup",
    toLabel: dropoffAddress || "Drop-off",
    dateLabel: getScheduleDateSummary(dateTime),
    timeLabel: getScheduleTimeSummary(dateTime),
    seatsUsed: 1,
    seatsTotal: peopleVehicle.seatsAvailable,
    pricePerPerson: 24,
    rideKind: isAirportRide ? "airport" : dateTime.scheduleType === "RECURRING" ? "recurring" : "one_off",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppBookingDetailsFinalized: false,
    confirmationDeadlineLabel: "Not set yet",
    confirmationDeadlineAt: null,
    currentUserJoinIntentStatus: "not_joined",
    currentUserConfirmationExpired: false,
    bookingDetailsVersion: 1,
    bookingDetailsUpdated: false,
    currentUserConfirmedBookingDetailsVersion: null,
    rideAppConfirmBy: null,
    rideAppChecklist: {
      pickupPoint: Boolean(peopleVehicle.pickupVenue),
      dropoffPoint: true,
      rideApp: true,
      estimatedFare: Boolean(estimatedFare),
      booker: true,
      fareSplit: true,
      paymentMethod: acceptedPaymentMethods.length > 0,
      paymentRecipientAfterRide: acceptedPaymentMethods.length > 0,
      meetingTime: true,
      updatedAt: null,
      updatedBy: "You",
    },
    rideAppPodStatus: "booking_details_needed",
    rideAppBookingTrigger: peopleVehicle.rideAppBookingTrigger,
    rideAppMinimumConfirmedRiders: peopleVehicle.rideAppMinimumConfirmedRiders,
    rideAppRequiredConfirmations: peopleVehicle.rideAppMinimumConfirmedRiders,
    rideAppConfirmedRiderIds: [],
    rideAppFarePaymentTiming: peopleVehicle.rideAppFarePaymentTiming,
    rideAppProviderName,
    rideAppSplitMethod: splitMethod,
    rideAppFareEstimateStatus: estimatedFare ? "accepted" : "pending",
    rideAppAcceptedPaymentMethods: acceptedPaymentMethods,
    ...airportFields,
    airportDirection: airportFields.airportDirection ?? null,
    status: "available",
    quoteStatus: "quote_pending",
    currentUserRole: "host",
    currentUserName: "You",
    currentUserJoined: false,
    currentUserBookingDetailsConfirmed: false,
    platformFeeStatus: "pending",
    confirmedRiderCount: 0,
    joinedRiderCount: 0,
    rideAppConfirmedRiderCount: 0,
    riderConfirmations: [
      { name: "You", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
    ],
    taxiType: "Ride app",
    platformFee: 5,
    estimatedRideAppFare: estimatedFare || undefined,
    splitMethod,
    paymentMethod: acceptedPaymentMethods.join(", "),
    luggage: luggageLabel,
    accessibility: getAccessLabel(peopleVehicle),
    podType: accessMode === "verified_only" ? "Verified-only" : accessMode === "invite_only" ? "Invite-only" : "Open pod",
    hostName: "You",
    hostAvatarPreference,
    hostAvatarUrl,
    hostDisplayName,
    joinedRiders: [],
    pickupLabel: peopleVehicle.pickupVenue || pickupAddress,
    pickupTime: getScheduleTimeSummary(dateTime),
    dropoffLabel: dropoffAddress,
    stopRequestPolicy,
    proposedStops: [],
    approvedStops: [],
    declinedStops: [],
  };
}

function buildCreatedTaxiHomeRide({
  pickupAddress,
  dropoffAddress,
  dateTime,
  peopleVehicle,
  pricing,
  genderMode,
  accessMode,
  stopRequestPolicy,
  hostAvatarPreference,
  hostAvatarUrl,
  hostDisplayName,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  peopleVehicle: PeopleVehicleState;
  pricing: PricingState;
  genderMode: GenderMode;
  accessMode: AccessMode;
  stopRequestPolicy: StopRequestPolicy;
  hostAvatarPreference?: RidePodAvatarPreference;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
}): HomeRide {
  const normalizedRideOption = normalizeRideOptionId(peopleVehicle.rideOption);
  const normalRideFields = getAirportHomeRideFields(null);
  const taxiType = normalizedRideOption === "taxi_partner_quote" ? getTaxiTypeLabel(peopleVehicle.taxiType) : "Taxi meter";

  return {
    id: crypto.randomUUID(),
    fromDistrict: peopleVehicle.pickupDistrict || districtFromLabel(pickupAddress),
    toDistrict: peopleVehicle.dropoffDistrict || districtFromLabel(dropoffAddress),
    fromLabel: pickupAddress || "Pickup",
    toLabel: dropoffAddress || "Drop-off",
    dateLabel: getScheduleDateSummary(dateTime),
    timeLabel: getScheduleTimeSummary(dateTime),
    seatsUsed: 1,
    seatsTotal: peopleVehicle.seatsAvailable,
    pricePerPerson: pricing.estimatedShare,
    rideKind: dateTime.scheduleType === "RECURRING" ? "recurring" : "one_off",
    rideService: "taxi",
    rideCategory: normalizedRideOption === "taxi_partner_quote" ? "taxi_partner_quote" : "taxi_meter",
    currentUserQuoteAccepted: false,
    acceptedGuestCount: 0,
    requiredGuestCount: Math.max(1, peopleVehicle.seatsAvailable - 1),
    ...normalRideFields,
    airportDirection: null,
    status: "available",
    quoteStatus: "quote_pending",
    currentUserRole: "host",
    currentUserName: "You",
    currentUserJoined: false,
    currentUserBookingDetailsConfirmed: false,
    confirmedRiderCount: 0,
    joinedRiderCount: 0,
    rideAppConfirmedRiderCount: 0,
    riderConfirmations: [
      { name: "You", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
    ],
    taxiType,
    platformFee: 5,
    luggage: getLuggageNeedsSummary(peopleVehicle),
    accessibility: getAccessLabel(peopleVehicle),
    podType: getCreatedPodTypeLabel(genderMode, accessMode),
    hostName: "You",
    hostAvatarPreference,
    hostAvatarUrl,
    hostDisplayName,
    joinedRiders: [],
    pickupLabel: peopleVehicle.pickupVenue || pickupAddress,
    pickupTime: getScheduleTimeSummary(dateTime),
    dropoffLabel: dropoffAddress,
    bookingFareCapCents: dollarsToCents(pricing.maxFare),
    stopRequestPolicy,
    proposedStops: [],
    approvedStops: [],
    declinedStops: [],
  };
}

function buildCreatedAirportTaxiHomeRide({
  pickupAddress,
  dropoffAddress,
  dateTime,
  peopleVehicle,
  pricing,
  genderMode,
  accessMode,
  stopRequestPolicy,
  airportDetails,
  hostAvatarPreference,
  hostAvatarUrl,
  hostDisplayName,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  peopleVehicle: PeopleVehicleState;
  pricing: PricingState;
  genderMode: GenderMode;
  accessMode: AccessMode;
  stopRequestPolicy: StopRequestPolicy;
  airportDetails: AirportDetailsState;
  hostAvatarPreference?: RidePodAvatarPreference;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
}): HomeRide {
  const normalizedRideOption = normalizeRideOptionId(peopleVehicle.rideOption);
  const airportFields = getAirportHomeRideFields(airportDetails);
  const taxiType = normalizedRideOption === "taxi_partner_quote" ? getTaxiTypeLabel(peopleVehicle.taxiType) : "Taxi meter";

  return {
    id: crypto.randomUUID(),
    fromDistrict: peopleVehicle.pickupDistrict || districtFromLabel(pickupAddress),
    toDistrict: peopleVehicle.dropoffDistrict || districtFromLabel(dropoffAddress),
    fromLabel: pickupAddress || (airportDetails.airportDirection === "from_airport" ? getAirportTerminalHallValue(airportDetails) : "Pickup"),
    toLabel: dropoffAddress || (airportDetails.airportDirection === "to_airport" ? getAirportTerminalHallValue(airportDetails) : "Destination"),
    dateLabel: getScheduleDateSummary(dateTime),
    timeLabel: getScheduleTimeSummary(dateTime),
    seatsUsed: 1,
    seatsTotal: peopleVehicle.seatsAvailable,
    pricePerPerson: pricing.estimatedShare,
    rideKind: "airport",
    rideService: "taxi",
    rideCategory: normalizedRideOption === "taxi_partner_quote" ? "taxi_partner_quote" : "taxi_meter",
    currentUserQuoteAccepted: false,
    acceptedGuestCount: 0,
    requiredGuestCount: Math.max(1, peopleVehicle.seatsAvailable - 1),
    ...airportFields,
    airportDirection: airportFields.airportDirection ?? airportDetails.airportDirection,
    status: "available",
    quoteStatus: "quote_pending",
    currentUserRole: "host",
    currentUserName: "You",
    currentUserJoined: false,
    currentUserBookingDetailsConfirmed: false,
    confirmedRiderCount: 0,
    joinedRiderCount: 0,
    rideAppConfirmedRiderCount: 0,
    riderConfirmations: [
      { name: "You", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
    ],
    taxiType,
    platformFee: 5,
    luggage: getAirportLuggageSummary(airportDetails),
    accessibility: getAccessLabel(peopleVehicle),
    podType: getCreatedPodTypeLabel(genderMode, accessMode),
    hostName: "You",
    hostAvatarPreference,
    hostAvatarUrl,
    hostDisplayName,
    joinedRiders: [],
    pickupLabel: peopleVehicle.pickupVenue || pickupAddress || getAirportTerminalHallValue(airportDetails),
    pickupTime: getScheduleTimeSummary(dateTime),
    dropoffLabel: dropoffAddress || getAirportTerminalHallValue(airportDetails),
    stopRequestPolicy,
    proposedStops: [],
    approvedStops: [],
    declinedStops: [],
  };
}

function getRoutePlanSummary(pickupAddress: string, dropoffAddress: string, stops: RouteStop[]) {
  const parts = [
    routePointSummary(pickupAddress, "None"),
    ...stops.map((_, index) => `Stop ${index + 1}`),
    routePointSummary(dropoffAddress, "None"),
  ];

  return parts.join(" \u2192 ");
}

function StopRequestPolicySelector({
  value,
  isRideAppSelfSettle = false,
  onChange,
}: {
  value: StopRequestPolicy;
  isRideAppSelfSettle?: boolean;
  onChange: (value: StopRequestPolicy) => void;
}) {
  const options = isRideAppSelfSettle
    ? stopRequestPolicyOptions.map((option) =>
        option.id === "direct_only"
          ? {
              ...option,
              title: "Direct route only",
              description: "Riders join the pickup and dropoff route set by the host.",
            }
          : {
              ...option,
              title: "Allow route requests",
              description: "Joined riders can ask for one route change or extra stop before the host books.",
              helper: "Host decides before booking the ride app outside RidePod.",
            },
      )
    : stopRequestPolicyOptions;

  return (
    <section className="rounded-[22px] border border-[color-mix(in_srgb,var(--rp-primary)_28%,var(--rp-border))] bg-[linear-gradient(180deg,rgba(17,28,40,0.92),rgba(10,19,31,0.92))] p-3 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-black text-[var(--rp-text)]">
            {isRideAppSelfSettle ? "Route requests from other riders" : "Stop requests from other riders"}
          </h2>
        </div>
      </div>

      <div className="mt-3 grid gap-2" role="radiogroup" aria-label={isRideAppSelfSettle ? "Route requests" : "Stop requests"}>
        {options.map((option) => {
          const selected = value === option.id;
          const directOnly = option.id === "direct_only";

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                "grid grid-cols-[20px_1fr] gap-3 rounded-[16px] border p-3 text-left transition",
                selected
                  ? "border-[var(--rp-primary)] bg-[rgba(242,193,91,0.11)] shadow-[0_10px_22px_rgba(242,193,91,0.08)]"
                  : "border-[var(--rp-border)] bg-[rgba(15,27,39,0.58)] hover:border-[var(--rp-border-strong)]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 place-items-center rounded-full border",
                  selected ? "border-[var(--rp-primary)]" : "border-[var(--rp-muted)]",
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", selected ? "bg-[var(--rp-primary)]" : "bg-transparent")} />
              </span>
              <span>
                <span
                  className={cn(
                    "block text-sm font-black",
                    selected ? "text-[var(--rp-primary)]" : directOnly ? "text-[var(--rp-muted-strong)]" : "text-[var(--rp-text)]",
                  )}
                >
                  {option.title}
                </span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                  {option.description}
                </span>
                {selected && option.helper ? (
                  <span className="mt-1 block text-[11px] font-bold leading-5 text-[var(--rp-primary)]">{option.helper}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TaxiReviewSummaryCard({
  peopleVehicle,
  pickupAddress,
  dropoffAddress,
  dateTime,
  genderMode,
  accessMode,
  taxiPartnerPreference,
  stopRequestPolicy,
  stops,
}: {
  peopleVehicle: PeopleVehicleState;
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  genderMode: GenderMode;
  accessMode: AccessMode;
  taxiPartnerPreference: TaxiPartnerPreference;
  stopRequestPolicy: StopRequestPolicy;
  stops: RouteStop[];
}) {
  const taxiType = getTaxiTypeLabel(peopleVehicle.taxiType);
  const tripRows = [
    ["Date/time", `${getScheduleDateSummary(dateTime)} / ${getScheduleTimeSummary(dateTime)}`],
    ["Seats", `${peopleVehicle.seatsAvailable} seats total`],
    ...(dateTime.scheduleType === "RECURRING" ? [["Trip pattern", getRecurringWeekdaySummary(dateTime)]] : []),
  ];
  const taxiNeeds: Array<[string, string]> = [
    ["Taxi type", taxiType],
    ["Luggage", getLuggageNeedsSummary(peopleVehicle)],
    ["Pickup point", pickupAddress || "None"],
    ["Pickup district", peopleVehicle.pickupDistrict || "None"],
    ...(peopleVehicle.pickupVenue.trim() ? ([["Gather point", peopleVehicle.pickupVenue.trim()]] as Array<[string, string]>) : []),
    ["Dropoff point", dropoffAddress || "None"],
    ["Destination district", peopleVehicle.dropoffDistrict || "None"],
  ];
  const taxiPartnerPreferenceLabel = getTaxiPartnerPreferenceLabel(taxiPartnerPreference);

  return (
    <section className="grid gap-3">
      <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[linear-gradient(135deg,rgba(246,196,83,0.08),rgba(15,23,42,0.16)),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-primary)]">Trip</h2>
        <dl className="mt-3 grid gap-2">
          <RouteSummaryLine label="Pickup" value={pickupAddress || "None"} />
          <RouteSummaryLine label="Pickup district" value={peopleVehicle.pickupDistrict || "None"} />
          {peopleVehicle.pickupVenue.trim() ? <RouteSummaryLine label="Gather" value={peopleVehicle.pickupVenue.trim()} /> : null}
          {stops.map((stop, index) => (
            <RouteSummaryLine key={stop.id} label={`Stop ${index + 1}`} value={stop.address || "Optional stop"} />
          ))}
          <RouteSummaryLine label="Dropoff" value={dropoffAddress || "None"} />
          <RouteSummaryLine label="Destination district" value={peopleVehicle.dropoffDistrict || "None"} />
        </dl>
        <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-black text-[var(--rp-primary)]">
          Route: {getRoutePlanSummary(pickupAddress, dropoffAddress, stops)}
        </p>
        <dl className="mt-4 grid gap-2">
          {tripRows.map(([label, value]) => (
            <SummaryLine key={label} label={label} value={value} />
          ))}
        </dl>
      </section>

      <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-primary)]">Taxi needs</h2>
        <dl className="mt-3 grid gap-2">
          {taxiNeeds.map(([label, value]) => (
            <SummaryLine key={label} label={label} value={value} />
          ))}
        </dl>
        <p className="mt-3 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
          Taxi type and luggage capacity depend on taxi partner availability.
        </p>
      </section>

      <TaxiFareReferenceCard
        pickupAddress={pickupAddress}
        dropoffAddress={dropoffAddress}
        peopleVehicle={peopleVehicle}
      />

      <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-primary)]">Who can join</h2>
        <p className="mt-3 text-base font-black leading-5 text-[var(--rp-text)]">
          {getWhoCanJoinLabel(genderMode, accessMode)}
        </p>
        {genderMode === "women_only" ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
            Rider eligibility only.
          </p>
        ) : null}
      </section>

      <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-primary)]">Taxi partner preference</h2>
        <p className="mt-3 text-base font-black leading-5 text-[var(--rp-text)]">
          {taxiPartnerPreferenceLabel}
        </p>
      </section>

      <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-primary)]">Stop requests</h2>
        <p className="mt-3 text-base font-black leading-5 text-[var(--rp-text)]">
          {getStopRequestPolicyLabel(stopRequestPolicy)}
        </p>
      </section>

      <p className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] p-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
        No live payment or payout is enabled. Guests see the final price after the taxi partner quote.
      </p>
    </section>
  );
}

function SelfSettleReviewSummaryCard({
  peopleVehicle,
  pickupAddress,
  dropoffAddress,
  dateTime,
  onEditDetails,
}: {
  peopleVehicle: PeopleVehicleState;
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  onEditDetails: () => void;
}) {
  const rows: Array<{ icon: ReactNode; label: string; value: string }> = [
    { icon: <Smartphone className="h-4 w-4" />, label: "Ride type", value: "Ride App" },
    { icon: <MapPin className="h-4 w-4" />, label: "Route", value: `${routePointSummary(pickupAddress, "None")} -> ${routePointSummary(dropoffAddress, "None")}` },
    { icon: <MapPin className="h-4 w-4" />, label: "Pickup district", value: peopleVehicle.pickupDistrict || "None" },
    { icon: <MapPin className="h-4 w-4" />, label: "Destination district", value: peopleVehicle.dropoffDistrict || "None" },
    { icon: <LocateFixed className="h-4 w-4" />, label: "Gather point", value: peopleVehicle.pickupVenue || "None" },
    { icon: <CarFront className="h-4 w-4" />, label: "Ride app", value: getRideAppProviderLabel(peopleVehicle.rideAppProvider, peopleVehicle.rideAppProviderOther) },
    { icon: <CalendarDays className="h-4 w-4" />, label: "Date/time", value: `${getScheduleDateSummary(dateTime)} / ${getScheduleTimeSummary(dateTime)}` },
    { icon: <UsersRound className="h-4 w-4" />, label: "Seats", value: `${peopleVehicle.seatsAvailable} seats total` },
  ];

  return (
    <section className="grid gap-3">
      <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[linear-gradient(135deg,rgba(246,196,83,0.08),rgba(15,23,42,0.18)),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[var(--rp-primary)]">Ride App</h2>
          </div>
          </div>
          <button
            type="button"
            onClick={onEditDetails}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[var(--rp-primary)]/45 bg-[var(--rp-primary)]/10 px-3 text-xs font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-primary)]/16"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        <dl className="mt-4 grid gap-3">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-[16px] border border-[var(--rp-border)] bg-black/12 p-3">
              <span className="grid h-9 w-9 place-items-center rounded-[12px] border border-white/10 bg-white/7 text-[var(--rp-primary)]">
                {row.icon}
              </span>
              <span className="min-w-0">
                <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">{row.label}</dt>
                <dd className="mt-1 break-words text-sm font-black leading-5 text-[var(--rp-text)]">{row.value}</dd>
              </span>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}

function RouteSummaryLine({ label, value }: { label: string; value: string }) {
  const lines = formatRouteAddressLines(value);

  return (
    <div className="grid gap-1 border-t border-[var(--rp-border)] pt-3 first:border-t-0 first:pt-0">
      <dt className="text-sm font-semibold leading-5 text-[var(--rp-muted)]">{label}</dt>
      <dd className="min-w-0 text-left text-sm font-black leading-5 text-[var(--rp-text)]">
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className={index === 0 ? "block" : "block font-semibold text-[var(--rp-muted-strong)]"}>
            {line}
          </span>
        ))}
      </dd>
    </div>
  );
}

function formatRouteAddressLines(value: string) {
  const lines = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [value];
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  const oneLineValue = label === "Route";

  return (
    <div className="flex items-start justify-between gap-4 border-t border-[var(--rp-border)] pt-2 first:border-t-0 first:pt-0">
      <dt className="text-sm font-semibold leading-5 text-[var(--rp-muted)]">{label}</dt>
      <dd
        className={cn(
          "text-right text-sm font-black leading-5 text-[var(--rp-text)]",
          oneLineValue ? "min-w-0 flex-1 truncate whitespace-nowrap" : "max-w-[58%]",
        )}
        title={oneLineValue ? value : undefined}
      >
        {value}
      </dd>
    </div>
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
  return calculateMoneyHkTaxiFareEstimate({
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
              ? "Mock/demo state only. No live payment or payout is enabled."
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
              {genderMode === "women_only" ? "Women-only pod" : "Open pod"}
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
  onBack,
  onCreate,
  canProceed,
  blockedReason,
  createLabel = "Create Pod",
  panelLabels = ["Pricing summary", "Money Protection", "Safety & Trust", "Preview your pod"],
}: {
  currentPanel: number;
  onPanelChange: (panel: number) => void;
  onBack: () => void;
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
          onClick={() => {
            if (isFirst) {
              onBack();
              return;
            }
            onPanelChange(Math.max(0, currentPanel - 1));
          }}
          className="flex min-h-12 items-center justify-center rounded-2xl border border-[var(--rp-primary)] bg-transparent px-4 text-base font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
        >
          Back
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
  const isSelfSettleRideApp = normalizedRideOption === "ride_app_fixed_quote";
  const copy =
    normalizedRideOption === "taxi_partner_quote"
      ? {
          title: "Create this taxi pod?",
          body: [
            "Guests can join and lock seats after the pod is created.",
            "Next, you'll request one shared quote from a licensed taxi partner.",
            "Guests accept the selected quote before the ride proceeds.",
          ],
          checkbox: "I understand guests accept the quote before the ride proceeds.",
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
            title: "Create self-settle pod?",
            body: [
              "This pod uses self-settle ride app coordination. RidePod helps the host and riders organise the ride details, confirmations, and chat status only.",
              "The host or agreed group member will book the external ride app outside RidePod. RidePod does not book the ride, provide a driver, dispatch transport, verify the final fare, or guarantee pickup, route, arrival time, safety, refund, or cancellation outcome.",
              "Riders should review the fare estimate, split method, payment method, gather point, route, and confirm-by time before confirming. The ride fare is paid outside RidePod directly between the group members and/or the external ride app.",
              "Free to create. Riders confirm or waive the HK$5 RidePod join fee only when they confirm ride details.",
              "By creating this pod, I understand that this is a self-settle coordination pod and that the external ride app booking and ride fare are handled outside RidePod.",
            ],
            checkbox: "I understand this pod uses self-settle ride app coordination.",
            submitLabel: "Create",
          };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm md:absolute"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-pod-confirm-title"
    >
      <section className="flex max-h-[86dvh] w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
        <header className="flex shrink-0 items-start gap-3 p-5 pb-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <Info className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="create-pod-confirm-title" className={cn("whitespace-nowrap text-[21px] font-black leading-tight", isSelfSettleRideApp && "text-[var(--rp-primary)]")}>
              {copy.title}
            </h2>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          <div className="grid gap-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {copy.body.map((paragraph) => (
              <p key={paragraph} className="text-left">{paragraph}</p>
            ))}
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--rp-border)] bg-[var(--rp-shell)] p-5 shadow-[0_-14px_30px_rgba(0,0,0,0.22)]">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-sm font-black leading-6 text-[var(--rp-muted-strong)]">
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
        </footer>
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
  stops,
  stopRequestPolicy,
}: {
  routeFrom: string;
  routeTo: string;
  pickupAddress: string;
  dropoffAddress: string;
  peopleVehicle: PeopleVehicleState;
  stops: RouteStop[];
  stopRequestPolicy: StopRequestPolicy;
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
      value: pickup || "None",
    },
    ...stops.map((stop, index) => ({
      icon: MapPin,
      label: `Stop ${index + 1}`,
      value: stop.address.replace(",", "") || "Optional stop",
    })),
    {
      icon: MapPin,
      label: "Dropoff point",
      value: dropoff || "None",
    },
    {
      icon: ShieldCheck,
      label: "Stop requests",
      value: getStopRequestPolicyLabel(stopRequestPolicy),
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

function getRecurringOccurrenceTime(occurrence: ReturnType<typeof generateRecurringOccurrences>[number]) {
  const localTime = occurrence.departureAt.split("T")[1]?.slice(0, 5) ?? "";

  return formatLocalTimeLabel(localTime);
}

function RecurringReviewCard({
  title,
  children,
  icon,
  action,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_94%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]">
              {icon}
            </span>
          ) : null}
          <h2 className="min-w-0 text-lg font-black leading-6 text-[var(--rp-text)]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RecurringSummaryCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-3">
      <div className="mt-0.5 shrink-0 text-[var(--rp-primary)]">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">{label}</p>
        <p className="mt-1 break-words text-base font-black leading-6 text-[var(--rp-text)]">{value}</p>
      </div>
    </div>
  );
}

function RecurringPatternReviewRow({ label, leg }: { label: string; leg?: RecurringScheduleLeg }) {
  return (
    <div className="grid gap-1 border-t border-[var(--rp-border)] py-3 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-primary)]">{label}</p>
      <p className="text-base font-black text-[var(--rp-text)]">{leg ? formatLocalTimeLabel(leg.departureTime) : "--"}</p>
      <p className="min-w-0 break-words text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
        {leg ? `${leg.originLabel} \u2192 ${leg.destinationLabel}` : "Set ride route"}
      </p>
    </div>
  );
}

function UpcomingRideCard({ occurrence }: { occurrence: ReturnType<typeof generateRecurringOccurrences>[number] }) {
  const legLabel = occurrence.recurringLegType === "RETURN" ? "Return" : "Outbound";

  return (
    <article className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-black leading-6 text-[var(--rp-text)]">{formatDateForPreview(occurrence.occurrenceDate)}</p>
          <p className="mt-1 text-sm font-black text-[var(--rp-muted-strong)]">{getRecurringOccurrenceTime(occurrence)}</p>
        </div>
        <p className="shrink-0 rounded-full border border-[var(--rp-border-strong)] px-2.5 py-1 text-xs font-black text-[var(--rp-primary)]">{legLabel}</p>
      </div>
      <p className="mt-3 break-words text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
        {occurrence.originLabel} {"\u2192"} {occurrence.destinationLabel}
      </p>
    </article>
  );
}

function RecurringPodReview({
  dateTime,
  pickupAddress,
  dropoffAddress,
  peopleVehicle,
  genderMode,
  accessMode,
  taxiPartnerPreference,
  stopRequestPolicy,
  stops,
}: {
  dateTime: DateTimeState;
  pickupAddress: string;
  dropoffAddress: string;
  peopleVehicle: PeopleVehicleState;
  genderMode: GenderMode;
  accessMode: AccessMode;
  taxiPartnerPreference: TaxiPartnerPreference;
  stopRequestPolicy: StopRequestPolicy;
  stops: RouteStop[];
}) {
  const recurringLegs = getRecurringLegsForSelection({ dateTime, pickupAddress, dropoffAddress });
  const outboundLeg = recurringLegs.find((leg) => leg.legType === "OUTBOUND");
  const returnLeg = recurringLegs.find((leg) => leg.legType === "RETURN");
  const rideOption = getRideOption(peopleVehicle.rideOption);
  const allUpcomingRides = generateRecurringOccurrences(
    buildPreviewTemplate({ dateTime, pickupAddress, dropoffAddress }),
    { defaultOccurrenceLimit: 6, generatedAt: new Date(0).toISOString() },
  );
  const upcomingRides = allUpcomingRides.slice(0, 6);
  const patternLabel = dateTime.recurringPattern === "BACK_AND_FORTH" ? "Back-and-forth" : "One-way";
  const taxiPartnerPreferenceLabel = getTaxiPartnerPreferenceLabel(taxiPartnerPreference);

  return (
    <section className="grid gap-5">
      <RecurringReviewCard title="Template summary" icon={<CalendarDays className="h-5 w-5" />}>
        <div className="grid gap-3">
          <RecurringSummaryCell icon={<RefreshCcw className="h-4 w-4" />} label="Type" value="Recurring pod" />
          <RecurringSummaryCell icon={<CalendarDays className="h-4 w-4" />} label="Repeats" value={getRecurringWeekdaySummary(dateTime)} />
          <RecurringSummaryCell icon={<CalendarPlus className="h-4 w-4" />} label="Starts" value={formatReviewDate(dateTime.recurringStartDate)} />
          <RecurringSummaryCell icon={<Check className="h-4 w-4" />} label="Ends" value={getRecurringEndRuleSummary(dateTime)} />
        </div>
      </RecurringReviewCard>

      <RecurringReviewCard
        title="Trip pattern"
        icon={<ArrowRight className="h-5 w-5" />}
        action={
          <span className="shrink-0 rounded-full border border-[var(--rp-primary)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
            {patternLabel}
          </span>
        }
      >
        <div className="grid gap-0">
          {dateTime.recurringPattern === "BACK_AND_FORTH" ? (
            <>
              <RecurringPatternReviewRow label="Outbound" leg={outboundLeg} />
              <RecurringPatternReviewRow label="Return" leg={returnLeg} />
            </>
          ) : (
            <RecurringPatternReviewRow label="Outbound" leg={outboundLeg} />
          )}
        </div>
      </RecurringReviewCard>

      <RecurringReviewCard title="Ride option" icon={<CarFront className="h-5 w-5" />}>
        <div className="grid gap-3">
          <div className="grid gap-3 border-b border-[var(--rp-border)] pb-3">
            <div>
              <p className="text-xs font-semibold text-[var(--rp-muted-strong)]">Ride option</p>
              <p className="mt-1 text-base font-black leading-6 text-[var(--rp-text)]">{rideOption.title}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--rp-muted-strong)]">Taxi type</p>
              <p className="mt-1 text-base font-black leading-6 text-[var(--rp-text)]">{getTaxiTypeLabel(peopleVehicle.taxiType)}</p>
            </div>
          </div>
          {normalizeRideOptionId(peopleVehicle.rideOption) === "taxi_partner_quote" ? (
            <p className="text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
              Demo mode. No real taxi dispatch or payout yet.
            </p>
          ) : (
            <p className="text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{rideOption.recurringHelper}</p>
          )}
        </div>
      </RecurringReviewCard>

      <RecurringReviewCard title="Route plan" icon={<MapPin className="h-5 w-5" />}>
        <div className="grid gap-2">
          <RouteSummaryLine label="Pickup" value={pickupAddress || "None"} />
          {stops.map((stop, index) => (
            <RouteSummaryLine key={stop.id} label={`Stop ${index + 1}`} value={stop.address || "Optional stop"} />
          ))}
          <RouteSummaryLine label="Dropoff" value={dropoffAddress || "None"} />
          <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-black text-[var(--rp-primary)]">
            Stop requests: {getStopRequestPolicyLabel(stopRequestPolicy)}
          </p>
        </div>
      </RecurringReviewCard>

      <RecurringReviewCard title="Who can join" icon={<UsersRound className="h-5 w-5" />}>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-xs font-semibold text-[var(--rp-muted-strong)]">Who can join</p>
            <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
              {getWhoCanJoinLabel(genderMode, accessMode)}
            </p>
            {genderMode === "women_only" ? (
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                Rider eligibility only.
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-xs font-semibold text-[var(--rp-muted-strong)]">Taxi partner preference</p>
            <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
              {taxiPartnerPreferenceLabel}
            </p>
          </div>
        </div>
      </RecurringReviewCard>

      <RecurringReviewCard
        title="Upcoming rides"
        icon={<CalendarDays className="h-5 w-5" />}
        action={
          allUpcomingRides.length > 4 ? (
            <button type="button" className="text-xs font-black text-[var(--rp-primary)]">
              View all
            </button>
          ) : null
        }
      >
        {upcomingRides.length > 0 ? (
          <div className="grid gap-3">
            {upcomingRides.map((occurrence) => (
              <UpcomingRideCard key={occurrence.id} occurrence={occurrence} />
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-[var(--rp-muted-strong)]">
            Upcoming ride dates will appear after the recurring pod is created.
          </p>
        )}
      </RecurringReviewCard>

      <section className="rounded-[18px] border border-[var(--rp-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rp-primary)_14%,transparent),var(--rp-card))] p-4 shadow-[0_20px_50px_color-mix(in_srgb,var(--rp-primary)_16%,transparent)]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-primary)] text-[var(--rp-primary)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-6 text-[var(--rp-text)]">Each ride is reviewed separately</h2>
            <p className="mt-2 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
              Each ride has its own guest lock, quote, proof, dispute window, and settlement state.
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
              This creates the recurring pod. Each ride has its own guest lock, quote, and review state.
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
            Create recurring pod
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
  airportDetails,
  pricing,
  genderMode,
  accessMode,
  taxiPartnerPreference,
  stopRequestPolicy,
  stops,
  currentStep = 4,
  stepLabels = baseCreateSteps,
  onGenderModeChange,
  onAccessModeChange,
  onEditDetails,
  onBack,
  onCreate,
}: {
  podType: PodType;
  pickupAddress: string;
  dropoffAddress: string;
  dateTime: DateTimeState;
  peopleVehicle: PeopleVehicleState;
  airportDetails?: AirportDetailsState | null;
  pricing: PricingState;
  genderMode: GenderMode;
  accessMode: AccessMode;
  taxiPartnerPreference: TaxiPartnerPreference;
  stopRequestPolicy: StopRequestPolicy;
  stops: RouteStop[];
  currentStep?: CreateStep;
  stepLabels?: string[];
  onGenderModeChange: (genderMode: GenderMode) => void;
  onAccessModeChange: (accessMode: AccessMode) => void;
  onEditDetails: () => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  const routeFrom = airportDetails ? routePointSummary(pickupAddress, "Pickup") : routeCode(pickupAddress, "USC");
  const routeTo = airportDetails ? routePointSummary(dropoffAddress, "Airport") : routeCode(dropoffAddress, "LAX");
  const [reviewPanel, setReviewPanel] = useState(0);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [createConfirmChecked, setCreateConfirmChecked] = useState(false);
  const districtFareSuggestion = getDistrictTaxiFareSuggestion(peopleVehicle);
  const defaultTaxiEstimate = districtFareSuggestion ?? calculateMoneyHkTaxiFareEstimate({
    zone: "URBAN",
    distanceMeters: 6000,
    baggageCount: peopleVehicle.bags,
  });
  const defaultRouteRisk = districtFareSuggestion?.routeRiskLevel ?? "NORMAL";
  const defaultDistanceKm = districtFareSuggestion
    ? Math.max(1, districtFareSuggestion.distanceMeters / 1000)
    : 6;
  const defaultApprovedMaxCents = suggestApprovedMaxFare(defaultTaxiEstimate.totalFareCents, defaultRouteRisk);
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
    taxiZone: defaultTaxiEstimate.zone,
    estimatedDistanceKm: defaultDistanceKm,
    baggageCount: peopleVehicle.bags,
    tollEstimate: 0,
    waitingMinutes: 0,
    trafficBufferPercent: 0,
    routeRiskLevel: defaultRouteRisk,
  });
  const normalizedRideOption = normalizeRideOptionId(peopleVehicle.rideOption);
  const isTaxiPartnerQuoteReview = normalizedRideOption === "taxi_partner_quote";
  const isRideAppSelfSettleReview = normalizedRideOption === "ride_app_fixed_quote";
  const safetyPanelIndex = 2;
  const previewPanelIndex = isTaxiPartnerQuoteReview ? 1 : 3;
  const moneyProtectionError =
    moneyProtection.approvedMaxTotalFare < moneyProtection.estimatedTotalFare
      ? `Approved max must be at least ${formatMoney(moneyProtection.estimatedTotalFare)} before you continue.`
      : null;

  if (podType === "recurring") {
    return (
      <>
        <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} />

        <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-7">
          <section className="text-center">
            <ScheduleTypeEyebrow podType={podType} />
            <h1 className="text-[26px] font-black leading-tight text-[var(--rp-text)]">
              Review recurring pod
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--rp-muted)]">
              Check the weekly plan before creating your pod.
            </p>
          </section>

          <div className="mt-5">
            <RecurringPodReview
              dateTime={dateTime}
              pickupAddress={pickupAddress}
              dropoffAddress={dropoffAddress}
              peopleVehicle={peopleVehicle}
              genderMode={genderMode}
              accessMode={accessMode}
              taxiPartnerPreference={taxiPartnerPreference}
              stopRequestPolicy={stopRequestPolicy}
              stops={stops}
            />
          </div>

          <div className="mt-5">
            <CreatePodStepActions
              onBack={onBack}
              onContinue={() => {
                setCreateConfirmChecked(false);
                setShowCreateConfirm(true);
              }}
              continueLabel="Create recurring pod"
            />
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
      <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} />

      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-7">
        {reviewPanel === previewPanelIndex ? null : (
          <section className="text-center">
            {airportDetails ? null : <ScheduleTypeEyebrow podType={podType} />}
            <h1 className="text-[26px] font-black leading-tight text-[var(--rp-text)]">
              Final check
            </h1>
          </section>
        )}

        <div className={cn("grid gap-4", reviewPanel === previewPanelIndex ? "mt-0" : "mt-5")}>
          {reviewPanel === 0 ? (
            <>
              {isTaxiPartnerQuoteReview ? (
                <TaxiReviewSummaryCard
                  peopleVehicle={peopleVehicle}
                  pickupAddress={pickupAddress}
                  dropoffAddress={dropoffAddress}
                  dateTime={dateTime}
                  genderMode={genderMode}
                  accessMode={accessMode}
                  taxiPartnerPreference={taxiPartnerPreference}
                  stopRequestPolicy={stopRequestPolicy}
                  stops={stops}
                />
              ) : isRideAppSelfSettleReview ? (
                <SelfSettleReviewSummaryCard
                  peopleVehicle={peopleVehicle}
                  pickupAddress={pickupAddress}
                  dropoffAddress={dropoffAddress}
                  dateTime={dateTime}
                  onEditDetails={onEditDetails}
                />
              ) : (
                <PricingSummaryCard money={moneyProtection} rideOption={peopleVehicle.rideOption} />
              )}
            </>
          ) : null}

          {!isTaxiPartnerQuoteReview && reviewPanel === 1 ? (
            <MoneyProtectionPanel
              money={moneyProtection}
              peopleVehicle={peopleVehicle}
              onMoneyChange={setMoneyProtection}
            />
          ) : null}

          {!isTaxiPartnerQuoteReview && reviewPanel === safetyPanelIndex ? (
            <SafetyTrustPanel
              genderMode={genderMode}
              accessMode={accessMode}
              onGenderModeChange={onGenderModeChange}
              onAccessModeChange={onAccessModeChange}
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
                stops={stops}
                stopRequestPolicy={stopRequestPolicy}
              />
            </section>
          ) : null}
        </div>

        {isTaxiPartnerQuoteReview || isRideAppSelfSettleReview ? (
          <div className="mt-5">
            <CreatePodStepActions
              onBack={onBack}
              onContinue={() => {
                setCreateConfirmChecked(false);
                setShowCreateConfirm(true);
              }}
              continueLabel={isRideAppSelfSettleReview ? "Create" : "Create taxi pod"}
            />
          </div>
        ) : (
          <ReviewPanelControls
            currentPanel={reviewPanel}
            onPanelChange={setReviewPanel}
            onBack={onBack}
            onCreate={() => {
              setCreateConfirmChecked(false);
              setShowCreateConfirm(true);
            }}
            canProceed={!moneyProtectionError}
            blockedReason={moneyProtectionError ?? undefined}
            createLabel="Create Pod"
          />
        )}

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
          className="object-cover object-center"
          priority
        />
      </div>
      <h1 className="mt-5 text-[40px] font-black leading-none text-[var(--rp-text)]">
        All set!
      </h1>
    </section>
  );
}

function SuccessStep({
  podType,
  peopleVehicle,
  podDetailHref,
  currentStep = 5,
  stepLabels = baseCreateSteps,
}: {
  podType: PodType;
  peopleVehicle: PeopleVehicleState;
  podDetailHref?: string | null;
  currentStep?: CreateStep;
  stepLabels?: string[];
}) {
  const isRideAppSelfSettle = normalizeRideOptionId(peopleVehicle.rideOption) === "ride_app_fixed_quote";
  const detailHref = podDetailHref ?? "/pods";

  return (
    <>
      <CreatePodTopBar currentStep={currentStep} stepLabels={stepLabels} />
      <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-8 pt-6">
        <div className="text-center">
          <ScheduleTypeEyebrow podType={podType} />
        </div>
        <SuccessHero />

        <div className="mt-7 grid gap-3">
          <Link
            href={detailHref}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-[12px] border border-[var(--rp-border-strong)] text-base font-black shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_34%,transparent)] transition hover:brightness-105"
            style={{
              background: "var(--rp-gradient-primary)",
              color: "var(--rp-primary-text)",
            }}
          >
            View my pod
            <ArrowRight className="h-5 w-5" />
          </Link>
          {isRideAppSelfSettle ? (
            <Link
              href={detailHref}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-[12px] border border-[var(--rp-primary)] bg-transparent text-base font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
            >
              Share booking details
              <Smartphone className="h-5 w-5" />
            </Link>
          ) : (
            <SecondaryButton onClick={() => undefined}>
              Invite riders
              <UserPlus className="h-5 w-5" />
            </SecondaryButton>
          )}
        </div>
      </main>
    </>
  );
}

export function CreatePodChooseType() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const [avatarPreference] = useRidePodAvatarPreference(profile?.id ?? user?.id);
  const hostDisplayName = profile?.display_name ?? profile?.preferred_name ?? user?.email?.split("@")[0] ?? "RidePod host";
  const todayIsoDate = getTodayIsoDate();
  const todayDate = parseIsoDateToLocalDate(todayIsoDate);
  const [step, setStep] = useState<CreateStep>(0);
  const [podType, setPodType] = useState<PodType>("scheduled");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupRoutePoint, setPickupRoutePoint] = useState<RoutePointSelection | null>(null);
  const [dropoffRoutePoint, setDropoffRoutePoint] = useState<RoutePointSelection | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [nextStopId, setNextStopId] = useState(1);
  const [airportDetails, setAirportDetails] = useState<AirportDetailsState>(() => createDefaultAirportDetails());
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
        originLabel: "None",
        destinationLabel: "None",
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
    rideOption: "ride_app_fixed_quote",
    vehicleType: getRideOption("ride_app_fixed_quote").title,
    priceSource: "Ride app self-settle",
    pickupVenue: "",
    pickupDistrict: "",
    dropoffDistrict: "",
    rideAppProvider: "uber",
    rideAppProviderOther: "",
    estimatedRideAppFare: "",
    splitMethod: "equal_split",
    paymentMethod: "payme",
    rideAppBookingTrigger: "minimum_riders_confirmed",
    rideAppMinimumConfirmedRiders: 2,
    rideAppFarePaymentTiming: "after_ride",
    rideAppAcceptedPaymentMethods: [],
    rideAppPaymentMethodOther: "",
  });
  const [genderMode, setGenderMode] = useState<GenderMode>("mixed");
  const [accessMode, setAccessMode] = useState<AccessMode>("open");
  const [taxiPartnerPreference, setTaxiPartnerPreference] = useState<TaxiPartnerPreference>("standard");
  const [taxiPartnerPreferenceTouched, setTaxiPartnerPreferenceTouched] = useState(false);
  const [stopRequestPolicy, setStopRequestPolicy] = useState<StopRequestPolicy>("direct_only");
  const [stopRequestPolicyTouched, setStopRequestPolicyTouched] = useState(false);
  const [createdPodDetailHref, setCreatedPodDetailHref] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingState>({
    estimatedFare: 84,
    estimatedShare: 21,
    maxFare: 96,
  });
  const rideAppAccessNotice = user
    ? getRideAppAccessNotice(getRideAppTrustSummary(user.id))
    : null;
  const taxiCreateUnlocked = isRidePodAdminUser(user, profile);
  const isAirportPod = podType === "airport";
  const isAirportTrip = isAirportPod || isAirportTaxiRoute(pickupAddress, dropoffAddress);
  const displayedTaxiPartnerPreference =
    taxiPartnerPreferenceTouched
      ? taxiPartnerPreference
      : isAirportTrip
        ? "airport_luggage_friendly"
        : "standard";
  const displayedStopRequestPolicy = stopRequestPolicyTouched ? stopRequestPolicy : "direct_only";
  const isRideAppSelfSettle = normalizeRideOptionId(peopleVehicle.rideOption) === "ride_app_fixed_quote";
  const activeStepLabels = isAirportPod
    ? isRideAppSelfSettle
      ? airportRideAppCreateSteps
      : airportCreateSteps
    : isRideAppSelfSettle
      ? rideAppCreateSteps
      : baseCreateSteps;
  const routeStepIndex: CreateStep = isAirportPod ? 3 : 2;
  const estimateCostStepIndex: CreateStep = isAirportPod ? 4 : 3;
  const dateTimeStepIndex: CreateStep = isAirportPod ? 5 : 4;
  const bookingRulesStepIndex: CreateStep = isAirportPod ? 6 : 5;
  const reviewStepIndex: CreateStep = isRideAppSelfSettle ? (isAirportPod ? 7 : 6) : isAirportPod ? 6 : 5;
  const successStepIndex: CreateStep = isRideAppSelfSettle ? (isAirportPod ? 8 : 7) : isAirportPod ? 7 : 6;

  function continueFromAirportDetails() {
    const terminalOrHall = getAirportTerminalHallValue(airportDetails);

    if (airportDetails.airportDirection === "to_airport") {
      if (!dropoffAddress.trim()) setDropoffAddress(terminalOrHall === "Not provided" ? "HKIA Terminal 1 Departures" : terminalOrHall);
      if (!peopleVehicle.dropoffDistrict.trim()) {
        setPeopleVehicle((current) => ({
          ...current,
          dropoffDistrict: "Islands",
        }));
      }
    } else {
      if (!pickupAddress.trim()) setPickupAddress(terminalOrHall === "Not provided" ? "HKIA Arrival Hall A" : terminalOrHall);
      if (!peopleVehicle.pickupDistrict.trim() || (isRideAppSelfSettle && !peopleVehicle.pickupVenue.trim())) {
        setPeopleVehicle((current) => ({
          ...current,
          pickupDistrict: current.pickupDistrict.trim() ? current.pickupDistrict : "Islands",
          pickupVenue: isRideAppSelfSettle && !current.pickupVenue.trim()
            ? airportDetails.airportHall.trim() || "HKIA Arrival Hall A"
            : current.pickupVenue,
        }));
      }
    }

    continueToStep(routeStepIndex);
  }

  function handleTaxiPartnerPreferenceChange(preference: TaxiPartnerPreference) {
    setTaxiPartnerPreferenceTouched(true);
    setTaxiPartnerPreference(preference);
  }

  function handleStopRequestPolicyChange(policy: StopRequestPolicy) {
    setStopRequestPolicyTouched(true);
    setStopRequestPolicy(policy);
  }

  function handlePickupAddressChange(value: string) {
    setPickupAddress(value);
    setPickupRoutePoint((current) => (current && current.label.trim() !== value.trim() ? null : current));
  }

  function handleDropoffAddressChange(value: string) {
    setDropoffAddress(value);
    setDropoffRoutePoint((current) => (current && current.label.trim() !== value.trim() ? null : current));
  }

  function handleAirportDetailsChange(details: AirportDetailsState) {
    const switchedToFromAirport = airportDetails.airportDirection !== "from_airport" && details.airportDirection === "from_airport";
    const switchedToAirportDropoff = airportDetails.airportDirection !== "to_airport" && details.airportDirection === "to_airport";

    setAirportDetails(details);

    if (switchedToFromAirport) {
      setDropoffAddress("");
      setDropoffRoutePoint(null);
      setPeopleVehicle((current) => ({
        ...current,
        pickupDistrict: "Islands",
        dropoffDistrict: "",
      }));
    }

    if (switchedToAirportDropoff) {
      setPickupAddress("");
      setPickupRoutePoint(null);
      setPeopleVehicle((current) => ({
        ...current,
        pickupDistrict: "",
        dropoffDistrict: "Islands",
      }));
    }
  }

  function handlePickupPlaceSelect(point: RoutePointSelection | null) {
    setPickupRoutePoint(point);
    if (point) setPickupAddress(point.label);
  }

  function handleDropoffPlaceSelect(point: RoutePointSelection | null) {
    setDropoffRoutePoint(point);
    if (point) setDropoffAddress(point.label);
  }

  function ensureCreateAuth() {
    if (isAuthLoading) return false;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/create")}`);
      return false;
    }
    return true;
  }

  function continueToStep(nextStep: CreateStep) {
    if (!ensureCreateAuth()) return;
    setStep(nextStep);
  }

  function completeCreate() {
    if (!ensureCreateAuth()) return;

    if (isRideAppSelfSettle) {
      const createdRide = buildCreatedRideAppHomeRide({
        pickupAddress,
        dropoffAddress,
        dateTime,
        peopleVehicle,
        accessMode,
        stopRequestPolicy: displayedStopRequestPolicy,
        airportDetails: isAirportPod ? airportDetails : null,
        hostAvatarPreference: avatarPreference,
        hostAvatarUrl: profile?.avatar_url ?? null,
        hostDisplayName,
      });
      saveCreatedHomeRide(createdRide);
      setCreatedPodDetailHref(`/pods/${createdRide.id}`);
      if (user && !createdRide.estimatedRideAppFare?.trim()) {
        const rideRouteLabel = `${createdRide.fromLabel} -> ${createdRide.toLabel}`;
        const rideTimeLabel = `${createdRide.dateLabel} - ${createdRide.timeLabel}`;
        void createUserNotificationOnce({
          recipientUserId: user.id,
          actorUserId: user.id,
          type: "demo_ride_app_estimate_needed",
          title: "Update your ride app estimate",
          body: null,
          relatedPodId: createdRide.id,
          relatedUrl: `/pods/${createdRide.id}`,
          metadata: {
            action: "update_ride_app_estimate",
            route: rideRouteLabel,
            rideTime: rideTimeLabel,
            screenshotOptional: true,
          },
        });
      }
    } else if (isAirportPod) {
      const createdRide = buildCreatedAirportTaxiHomeRide({
        pickupAddress,
        dropoffAddress,
        dateTime,
        peopleVehicle,
        pricing,
        genderMode,
        accessMode,
        stopRequestPolicy: displayedStopRequestPolicy,
        airportDetails,
        hostAvatarPreference: avatarPreference,
        hostAvatarUrl: profile?.avatar_url ?? null,
        hostDisplayName,
      });
      saveCreatedHomeRide(createdRide);
      setCreatedPodDetailHref(`/pods/${createdRide.id}`);
    } else {
      const createdRide = buildCreatedTaxiHomeRide({
        pickupAddress,
        dropoffAddress,
        dateTime,
        peopleVehicle,
        pricing,
        genderMode,
        accessMode,
        stopRequestPolicy: displayedStopRequestPolicy,
        hostAvatarPreference: avatarPreference,
        hostAvatarUrl: profile?.avatar_url ?? null,
        hostDisplayName,
      });
      saveCreatedHomeRide(createdRide);
      setCreatedPodDetailHref(`/pods/${createdRide.id}`);
    }

    setStep(successStepIndex);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[34px] border border-[var(--rp-border)] bg-[var(--rp-bg)] shadow-[var(--rp-shadow-soft)] md:min-h-[760px]">
      {step === successStepIndex ? (
        <SuccessStep
          podType={podType}
          peopleVehicle={peopleVehicle}
          podDetailHref={createdPodDetailHref}
          currentStep={successStepIndex}
          stepLabels={activeStepLabels}
        />
      ) : step === reviewStepIndex ? (
        <ReviewPodStep
          podType={podType}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          dateTime={dateTime}
          peopleVehicle={peopleVehicle}
          airportDetails={isAirportPod ? airportDetails : null}
          pricing={pricing}
          genderMode={genderMode}
          accessMode={accessMode}
          taxiPartnerPreference={displayedTaxiPartnerPreference}
          stopRequestPolicy={displayedStopRequestPolicy}
          stops={stops}
          currentStep={reviewStepIndex}
          stepLabels={activeStepLabels}
          onGenderModeChange={setGenderMode}
          onAccessModeChange={setAccessMode}
          onEditDetails={() => setStep(routeStepIndex)}
          onBack={() => setStep(isRideAppSelfSettle ? bookingRulesStepIndex : dateTimeStepIndex)}
          onCreate={completeCreate}
        />
      ) : step === bookingRulesStepIndex && isRideAppSelfSettle ? (
        <RideAppBookingRulesStep
          peopleVehicle={peopleVehicle}
          currentStep={bookingRulesStepIndex}
          stepLabels={activeStepLabels}
          onPeopleVehicleChange={setPeopleVehicle}
          onBack={() => setStep(dateTimeStepIndex)}
          onContinue={() => continueToStep(reviewStepIndex)}
        />
      ) : step === dateTimeStepIndex ? (
        <DateTimeStep
          podType={podType}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          dateTime={dateTime}
          currentStep={dateTimeStepIndex}
          stepLabels={activeStepLabels}
          onDateTimeChange={setDateTime}
          onBack={() => setStep(estimateCostStepIndex)}
          onContinue={() => continueToStep(isRideAppSelfSettle ? bookingRulesStepIndex : reviewStepIndex)}
        />
      ) : step === estimateCostStepIndex ? (
        <EstimatedCostStep
          podType={podType}
          peopleVehicle={peopleVehicle}
          pricing={pricing}
          currentStep={estimateCostStepIndex}
          stepLabels={activeStepLabels}
          onPeopleVehicleChange={setPeopleVehicle}
          onPricingChange={setPricing}
          onBack={() => setStep(routeStepIndex)}
          onContinue={() => continueToStep(dateTimeStepIndex)}
        />
      ) : step === routeStepIndex ? (
        <RouteStopsStep
          podType={podType}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          pickupRoutePoint={pickupRoutePoint}
          dropoffRoutePoint={dropoffRoutePoint}
          pickupVenue={peopleVehicle.pickupVenue}
          pickupDistrict={peopleVehicle.pickupDistrict}
          dropoffDistrict={peopleVehicle.dropoffDistrict}
          stops={stops}
          stopRequestPolicy={displayedStopRequestPolicy}
          isRideAppSelfSettle={isRideAppSelfSettle}
          airportDetails={isAirportPod ? airportDetails : null}
          currentStep={routeStepIndex}
          stepLabels={activeStepLabels}
          onBack={() => setStep(isAirportPod ? 2 : 1)}
          onPickupChange={handlePickupAddressChange}
          onDropoffChange={handleDropoffAddressChange}
          onPickupPlaceSelect={handlePickupPlaceSelect}
          onDropoffPlaceSelect={handleDropoffPlaceSelect}
          onPickupVenueChange={(pickupVenue) => setPeopleVehicle((current) => ({ ...current, pickupVenue }))}
          onPickupDistrictChange={(pickupDistrict) => setPeopleVehicle((current) => ({ ...current, pickupDistrict }))}
          onDropoffDistrictChange={(dropoffDistrict) => setPeopleVehicle((current) => ({ ...current, dropoffDistrict }))}
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
          onStopRequestPolicyChange={handleStopRequestPolicyChange}
          onContinue={() => continueToStep(estimateCostStepIndex)}
        />
      ) : step === 2 && isAirportPod ? (
        <AirportDetailsStep
          airportDetails={airportDetails}
          currentStep={2}
          stepLabels={activeStepLabels}
          onAirportDetailsChange={handleAirportDetailsChange}
          onBack={() => setStep(1)}
          onContinue={continueFromAirportDetails}
        />
      ) : step === 1 ? (
        <>
          <CreatePodTopBar currentStep={1} stepLabels={activeStepLabels} />

          <main className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
            <section className="flex min-w-0 flex-col">
              <div className="text-center">
                <h1 className="mx-auto max-w-none whitespace-nowrap text-center text-[28px] font-black leading-[1.08] text-[var(--rp-text)] min-[390px]:text-[30px]">
                  Trip Type
                </h1>
                <p className="mx-auto mt-3 max-w-[260px] text-center text-base font-medium leading-6 text-[var(--rp-muted)]">
                  You&apos;ll be the host and book the ride.
                </p>
              </div>

              <div className="mt-6 grid gap-4" role="radiogroup" aria-label="Trip Type">
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
                      if (item.id === "airport") {
                        setAirportDetails((current) => syncAirportDirectionDefaults(current, current.airportDirection));
                      }
                    }}
                  />
                ))}
              </div>

              <div className="mt-6">
                <CreatePodStepActions onBack={() => setStep(0)} onContinue={() => continueToStep(2)} />
              </div>
            </section>
          </main>
        </>
      ) : (
        <PeopleVehicleStep
          podType={podType}
          peopleVehicle={peopleVehicle}
          genderMode={genderMode}
          accessMode={accessMode}
          taxiPartnerPreference={displayedTaxiPartnerPreference}
          stopRequestPolicy={displayedStopRequestPolicy}
          isAirportTrip={isAirportTrip}
          onPeopleVehicleChange={setPeopleVehicle}
          onGenderModeChange={setGenderMode}
          onAccessModeChange={setAccessMode}
          onTaxiPartnerPreferenceChange={handleTaxiPartnerPreferenceChange}
          onStopRequestPolicyChange={handleStopRequestPolicyChange}
          onBack={() => undefined}
          onContinue={() => continueToStep(1)}
          currentStep={0}
          stepLabels={activeStepLabels}
          onRequireAuth={ensureCreateAuth}
          rideAppAccessNotice={rideAppAccessNotice}
          taxiCreateUnlocked={taxiCreateUnlocked}
          showBackAction={false}
        />
      )}
    </div>
  );
}

