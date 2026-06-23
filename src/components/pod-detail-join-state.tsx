"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, CarFront, CheckCircle2, Clock3, Info, MapPin, Plane, ShieldCheck, Smartphone, Star, UserPlus, UsersRound, WalletCards, X } from "lucide-react";
import { cn } from "@/components/ui";
import { PodDetailFareReferenceRows } from "@/components/pod-detail-fare-reference-card";
import { SelfSettleReportIssue } from "@/components/self-settle-report-issue";
import {
  getNormalizedRouteRequests,
  isDirectRoutePolicy,
  isHostApprovedStopPolicy,
  routeRequestToRoutePlanStop,
  type HomeRide,
  type QuoteStatus,
  type RiderPickupStatus,
  type RoutePlanStop,
} from "@/lib/home-ride-mock";
import { getTaxiPartnerQuoteMoneyDisplay } from "@/lib/taxi-partner-quote";
import { Fragment, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPodLiveUpdate } from "@/lib/updates/ridepod-live-updates";
import { cancelPodAttendance, joinPod } from "@/lib/pods/ridepod-membership";
import { useAuth } from "@/providers/AuthProvider";
import {
  createRideAppTrustEvent,
  getRideAppAccessNotice,
  getRideAppHostTrustJoinCopy,
  getRideAppPublicTrustBadge,
  getRideAppTrustSummary,
  submitRideAppRating,
} from "@/lib/ride-app-trust";
import {
  applyRideAppMeaningfulDetailUpdate,
  getRideAppChatAccessState,
  getRideAppConfirmByDate,
  getRideAppConfirmDeadlineState,
  getRideAppCurrentDetailVersion,
  isMeaningfulRideAppDetailUpdate,
  isRideAppSeatHoldExpired,
} from "@/lib/ride-app-chat-unlock";
import { getTaxiPartnerChatAccessState } from "@/lib/taxi-partner-chat-unlock";
import { formatRideAppEstimatedFarePerPerson } from "@/lib/ride-app-fare-estimate";
import { markRideAppWaiverUsed, useRideAppWaiverState } from "@/lib/ride-app-waiver";
import {
  consumeRidePodPlusJoinFeeWaiver,
  hasRidePodPlusJoinFeeWaiver,
  useRidePodMembershipState,
} from "@/lib/ridepod-membership";
import {
  calculateRideAppJoinFee,
  formatHKD,
  ridePodPricingCopy,
} from "@/lib/ridepod-pricing";
import {
  clearStoredSelfSettleJoin,
  getRideWithStoredSelfSettleJoin,
  saveStoredSelfSettleRidePatch,
  saveStoredSelfSettleJoin,
} from "@/lib/ride-app-local-join";
import { useRidePodPricingConfig } from "@/lib/use-ridepod-pricing-config";

export type PodDetailJoinView =
  | QuoteStatus
  | "quote_deadline_soon"
  | "quote_expired"
  | "late_confirmation"
  | "too_late_to_confirm"
  | "quote_accepted"
  | "all_accepted"
  | "quote_declined"
  | "seat_cancelled"
  | "quote_acceptance_cancelled"
  | "cancellation_requested"
  | "partner_arrived"
  | "ride_started"
  | "at_pickup"
  | "attendance_cancelled";

type JoinFeeWaiverSource = "none" | "launch" | "plus";

export type LuggageContribution = {
  bagsCount: number;
  hasLargeLuggage: boolean;
};

export const podDetailQuoteCopy: Record<PodDetailJoinView, { title: string; text: string }> = {
  quote_pending: {
    title: "Taxi partner is confirming the fare",
    text: "Lock your seat now. You will see the per-person price before accepting the quote.",
  },
  quote_ready: {
    title: "Quote ready",
    text: "Taxi partner submitted a shared quote. Guests must accept before the deadline.",
  },
  quote_deadline_soon: {
    title: "Deadline soon",
    text: "Guests must accept before the quote deadline.",
  },
  quote_expired: {
    title: "Quote expired",
    text: "Not all guests accepted before the deadline. No live money was charged.",
  },
  late_confirmation: {
    title: "Late confirmation",
    text: "This quote arrived close to pickup. Guests need to accept soon or request another quote.",
  },
  too_late_to_confirm: {
    title: "Too late to confirm",
    text: "This quote arrived too close to pickup. Request another quote or choose a new time.",
  },
  full: {
    title: "Pod full",
    text: "Join the waitlist if a seat opens.",
  },
  joined: {
    title: "Seat locked",
    text: "We will notify you when the taxi partner quote is ready.",
  },
  quote_accepted: {
    title: "Quote accepted",
    text: "Waiting for other guests to accept the selected taxi quote.",
  },
  all_accepted: {
    title: "All guests accepted",
    text: "The selected taxi quote is accepted. Taxi partner can accept the job in demo mode.",
  },
  quote_declined: {
    title: "Quote declined",
    text: "The organizer may request another quote.",
  },
  seat_cancelled: {
    title: "Seat canceled",
    text: "Your seat reopened. You can lock a seat again while this pod is joinable.",
  },
  quote_acceptance_cancelled: {
    title: "Quote acceptance canceled",
    text: "You can review the quote again before the deadline.",
  },
  cancellation_requested: {
    title: "Cancellation requested",
    text: "The organizer may review this request.",
  },
  ready_for_pickup: {
    title: "Ready for pickup",
    text: "Taxi partner accepted the shared taxi ride. Meet at the pickup point.",
  },
  partner_arrived: {
    title: "Taxi partner arrived",
    text: "Meet at the pickup point.",
  },
  ride_started: {
    title: "Ride started",
    text: "The shared taxi ride is in progress.",
  },
  at_pickup: {
    title: "You marked yourself at pickup.",
    text: "Waiting for ride start.",
  },
  attendance_cancelled: {
    title: "Attendance cancelled",
    text: "You are no longer listed as joined for this pod.",
  },
};

const quoteProgressSteps = ["Seat interest", "Partner quote", "Guest approval"];
const maxJoinerBags = 6;
const luggageContributionStorageKey = "ridepod:pod-luggage-contributions:v1";
const MAX_QUOTE_RESPONSE_HOURS = 24;
const NORMAL_CONFIRMATION_CUTOFF_HOURS = 2;
const AIRPORT_CONFIRMATION_CUTOFF_HOURS = 6;
const RECURRING_CONFIRMATION_CUTOFF_HOURS = 12;
const LATE_CONFIRMATION_MINUTES = 15;
const HARD_CUTOFF_MINUTES_BEFORE_PICKUP = 30;
const QUOTE_DEADLINE_SOON_MINUTES = 60;
export const RIDE_APP_REJOIN_COOLDOWN_MINUTES = 10;

type QuoteDeadlineState =
  | "quote_ready_active"
  | "quote_deadline_soon"
  | "quote_expired"
  | "late_confirmation"
  | "too_late_to_confirm"
  | "group_accepted"
  | "partner_accepted";

type QuoteDeadlineInfo = {
  state: QuoteDeadlineState;
  acceptBy: Date | null;
  acceptByLabel: string;
  timeLeftLabel: string | null;
  canAccept: boolean;
};

export function getBaseLuggageCount(luggage: string) {
  const normalized = luggage.toLowerCase();
  if (normalized.includes("no luggage")) return 0;
  const match = normalized.match(/\d+/);
  if (match) return Number(match[0]);
  if (normalized.includes("bag") || normalized.includes("luggage")) return 1;
  return 0;
}

export function getBaseHasLargeLuggage(luggage: string) {
  return /large|bulky|suitcase/i.test(luggage);
}

function formatLuggageCount(count: number) {
  if (count <= 0) return "No luggage";
  if (count === 1) return "1 bag";
  return `${count} bags`;
}

export function formatGroupLuggageLabel(count: number, hasLargeLuggage: boolean) {
  const countLabel = formatLuggageCount(count);
  if (count <= 0) return hasLargeLuggage ? "Large luggage" : countLabel;
  return hasLargeLuggage ? `${countLabel} - large luggage` : countLabel;
}

export function formatUserLuggageLabel(contribution: LuggageContribution, perRide = false) {
  const suffix = perRide ? " per ride" : "";
  if (contribution.bagsCount <= 0 && !contribution.hasLargeLuggage) return `Your luggage: none${suffix}`;
  if (contribution.bagsCount === 1 && contribution.hasLargeLuggage) return `Your luggage: 1 large bag${suffix}`;
  return `Your luggage: ${formatGroupLuggageLabel(contribution.bagsCount, contribution.hasLargeLuggage)}${suffix}`;
}

export function getTaxiMaxBags(taxiType: string) {
  const normalized = taxiType.toLowerCase();
  if (normalized.includes("large") || normalized.includes("luggage")) return 4;
  if (normalized.includes("compact")) return 2;
  if (normalized.includes("6-seat") || normalized.includes("6 seater") || normalized.includes("6-seater")) return 2;
  return 3;
}

type StoredLuggageContributions = Record<string, Record<string, LuggageContribution>>;

function canUseLuggageStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeLuggageContribution(value: unknown): LuggageContribution {
  if (!value || typeof value !== "object") return { bagsCount: 0, hasLargeLuggage: false };
  const contribution = value as Partial<LuggageContribution>;

  return {
    bagsCount: Math.max(0, Number(contribution.bagsCount) || 0),
    hasLargeLuggage: Boolean(contribution.hasLargeLuggage),
  };
}

function readStoredLuggageContributions(): StoredLuggageContributions {
  if (!canUseLuggageStorage()) return {};

  try {
    const raw = window.localStorage.getItem(luggageContributionStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredLuggageContributions;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStoredLuggageContributions(contributions: StoredLuggageContributions) {
  if (!canUseLuggageStorage()) return;
  window.localStorage.setItem(luggageContributionStorageKey, JSON.stringify(contributions));
}

function readPodLuggageContributions(podId: string) {
  return readStoredLuggageContributions()[podId] ?? {};
}

function savePodLuggageContribution(podId: string, userId: string, contribution: LuggageContribution) {
  const contributions = readStoredLuggageContributions();
  contributions[podId] = {
    ...(contributions[podId] ?? {}),
    [userId]: normalizeLuggageContribution(contribution),
  };
  writeStoredLuggageContributions(contributions);
}

function clearPodLuggageContribution(podId: string, userId: string) {
  const contributions = readStoredLuggageContributions();
  if (!contributions[podId]?.[userId]) return;
  delete contributions[podId][userId];
  if (!Object.keys(contributions[podId]).length) delete contributions[podId];
  writeStoredLuggageContributions(contributions);
}

function totalLuggageContributions(contributions: Record<string, LuggageContribution>) {
  return Object.values(contributions).reduce(
    (total, contribution) => {
      const normalized = normalizeLuggageContribution(contribution);
      return {
        bagsCount: total.bagsCount + normalized.bagsCount,
        hasLargeLuggage: total.hasLargeLuggage || normalized.hasLargeLuggage,
      };
    },
    { bagsCount: 0, hasLargeLuggage: false },
  );
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return addMinutes(date, hours * 60);
}

function minutesBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / (60 * 1000));
}

function getConfirmationCutoffHours(ride: HomeRide) {
  if (ride.rideKind === "airport" || ride.airportDirection) return AIRPORT_CONFIRMATION_CUTOFF_HOURS;
  if (ride.rideKind === "recurring") return RECURRING_CONFIRMATION_CUTOFF_HOURS;
  return NORMAL_CONFIRMATION_CUTOFF_HOURS;
}

function getMockQuoteTiming(ride: HomeRide, now = new Date()) {
  if (ride.id === "normal-central-tst-quote-ready") {
    return { quoteCreatedAt: addMinutes(now, -10), pickupAt: addHours(now, 4) };
  }

  if (ride.id === "central-mongkok-evening") {
    return { quoteCreatedAt: addMinutes(now, -(23 * 60 + 30)), pickupAt: addHours(now, 27) };
  }

  if (ride.id === "shatin-tst-weekend") {
    return { quoteCreatedAt: addHours(now, -25), pickupAt: addHours(now, 1) };
  }

  if (ride.id === "airport-central-evening") {
    return { quoteCreatedAt: now, pickupAt: addHours(now, 5) };
  }

  if (ride.id === "shatin-central") {
    return { quoteCreatedAt: now, pickupAt: addMinutes(now, 20) };
  }

  return { quoteCreatedAt: addMinutes(now, -(ride.quoteExpiresInMinutes ?? 15)), pickupAt: addHours(now, 4) };
}

function formatDeadlineDate(date: Date) {
  const now = new Date();
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);

  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;

  const tomorrow = addHours(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 24);
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatTimeLeft(minutes: number) {
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min left` : `${hours} hr left`;
}

function getQuoteDeadlineInfo(
  ride: HomeRide,
  acceptedGuestCount: number,
  requiredGuestCount: number,
  partnerAccepted = false,
  now = new Date(),
): QuoteDeadlineInfo {
  if (partnerAccepted) {
    return {
      state: "partner_accepted",
      acceptBy: null,
      acceptByLabel: "Accepted",
      timeLeftLabel: null,
      canAccept: false,
    };
  }

  const timing = getMockQuoteTiming(ride, now);
  const confirmationCutoffHours = getConfirmationCutoffHours(ride);
  const responseDeadline = addHours(timing.quoteCreatedAt, MAX_QUOTE_RESPONSE_HOURS);
  const pickupDeadline = addHours(timing.pickupAt, -confirmationCutoffHours);
  const baseDeadline = responseDeadline < pickupDeadline ? responseDeadline : pickupDeadline;

  if (acceptedGuestCount >= requiredGuestCount) {
    return {
      state: "group_accepted",
      acceptBy: baseDeadline,
      acceptByLabel: formatDeadlineDate(baseDeadline),
      timeLeftLabel: null,
      canAccept: false,
    };
  }

  if (baseDeadline > now) {
    const minutesLeft = minutesBetween(now, baseDeadline);
    return {
      state: minutesLeft <= QUOTE_DEADLINE_SOON_MINUTES ? "quote_deadline_soon" : "quote_ready_active",
      acceptBy: baseDeadline,
      acceptByLabel: formatDeadlineDate(baseDeadline),
      timeLeftLabel: formatTimeLeft(minutesLeft),
      canAccept: true,
    };
  }

  const quoteJustArrived = minutesBetween(timing.quoteCreatedAt, now) <= LATE_CONFIRMATION_MINUTES;
  const hardCutoff = addMinutes(timing.pickupAt, -HARD_CUTOFF_MINUTES_BEFORE_PICKUP);

  if (!quoteJustArrived) {
    return {
      state: "quote_expired",
      acceptBy: baseDeadline,
      acceptByLabel: formatDeadlineDate(baseDeadline),
      timeLeftLabel: null,
      canAccept: false,
    };
  }

  if (hardCutoff <= now) {
    return {
      state: "too_late_to_confirm",
      acceptBy: null,
      acceptByLabel: "Too late",
      timeLeftLabel: null,
      canAccept: false,
    };
  }

  const lateDeadlineCandidate = addMinutes(now, LATE_CONFIRMATION_MINUTES);
  const lateDeadline = lateDeadlineCandidate < hardCutoff ? lateDeadlineCandidate : hardCutoff;

  if (lateDeadline <= now) {
    return {
      state: "too_late_to_confirm",
      acceptBy: null,
      acceptByLabel: "Too late",
      timeLeftLabel: null,
      canAccept: false,
    };
  }

  return {
    state: "late_confirmation",
    acceptBy: lateDeadline,
    acceptByLabel: formatDeadlineDate(lateDeadline),
    timeLeftLabel: formatTimeLeft(minutesBetween(now, lateDeadline)),
    canAccept: true,
  };
}

function isQuoteAcceptanceBlocked(deadlineInfo: QuoteDeadlineInfo) {
  return deadlineInfo.state === "quote_expired" || deadlineInfo.state === "too_late_to_confirm";
}

function getDeadlineJoinView(deadlineInfo: QuoteDeadlineInfo): PodDetailJoinView {
  if (deadlineInfo.state === "quote_deadline_soon") return "quote_deadline_soon";
  if (deadlineInfo.state === "quote_expired") return "quote_expired";
  if (deadlineInfo.state === "late_confirmation") return "late_confirmation";
  if (deadlineInfo.state === "too_late_to_confirm") return "too_late_to_confirm";
  return "quote_ready";
}

export function usePodDetailJoinState(ride: HomeRide) {
  const initialRide = getRideWithStoredSelfSettleJoin(ride);
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const currentUserDisplayName = profile?.display_name?.trim() || profile?.preferred_name?.trim() || "RidePod rider";
  const [joined, setJoined] = useState(initialRide.currentUserJoined === true || initialRide.quoteStatus === "joined");
  const [attendanceCancelled, setAttendanceCancelled] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [isCancellingAttendance, setIsCancellingAttendance] = useState(false);
  const [seatsUsed, setSeatsUsed] = useState(initialRide.seatsUsed);
  const [quoteAccepted, setQuoteAccepted] = useState(ride.currentUserQuoteAccepted === true);
  const [quoteDeclined, setQuoteDeclined] = useState(ride.guestAcceptanceStatus === "DECLINED");
  const [seatCanceled, setSeatCanceled] = useState(false);
  const [quoteAcceptanceCanceled, setQuoteAcceptanceCanceled] = useState(false);
  const [cancellationRequested, setCancellationRequested] = useState(false);
  const [, setSelfSettleRiskAccepted] = useState(initialRide.selfSettleRiskAccepted === true);
  const [, setCurrentUserRole] = useState<HomeRide["currentUserRole"]>(initialRide.currentUserRole);
  const [acceptedGuestCount, setAcceptedGuestCount] = useState(
    ride.acceptedGuestCount ?? (ride.currentUserQuoteAccepted ? 1 : 0),
  );
  const [riderPickupStatus, setRiderPickupStatus] = useState<RiderPickupStatus>(
    ride.riderPickupStatus ?? "NOT_ARRIVED",
  );
  const baseLuggageCount = getBaseLuggageCount(ride.luggage);
  const baseHasLargeLuggage = getBaseHasLargeLuggage(ride.luggage);
  const [currentUserLuggage, setCurrentUserLuggage] = useState<LuggageContribution>({
    bagsCount: 0,
    hasLargeLuggage: false,
  });
  const [storedLuggageContributions, setStoredLuggageContributions] = useState<Record<string, LuggageContribution>>({});
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const contributions = readPodLuggageContributions(ride.id);
      setStoredLuggageContributions(contributions);
      if (user?.id && contributions[user.id]) setCurrentUserLuggage(normalizeLuggageContribution(contributions[user.id]));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ride.id, user?.id]);
  const full = !joined && (ride.quoteStatus === "full" || seatsUsed >= ride.seatsTotal);
  const requiredGuestCount = ride.requiredGuestCount ?? ride.seatsTotal;
  const allAccepted =
    ride.allGuestsAccepted === true ||
    ((ride.quoteStatus === "quote_ready" || ride.quoteStatus === "ready_for_pickup") &&
      acceptedGuestCount >= requiredGuestCount);
  const partnerAccepted =
    ride.quoteStatus === "ready_for_pickup" ||
    ride.driverAssignmentStatus === "PARTNER_ACCEPTED" ||
    ride.pickupStatus === "READY_FOR_PICKUP" ||
    ride.pickupStatus === "PARTNER_ARRIVED" ||
    ride.pickupStatus === "RIDE_STARTED";
  const quoteDeadlineInfo = getQuoteDeadlineInfo(ride, acceptedGuestCount, requiredGuestCount, partnerAccepted);
  const joinView: PodDetailJoinView = (() => {
    if (attendanceCancelled) return "attendance_cancelled";
    if (cancellationRequested) return "cancellation_requested";
    if (seatCanceled) return "seat_cancelled";
    if (quoteAcceptanceCanceled) return "quote_acceptance_cancelled";
    if (full) return "full";
    if (ride.pickupStatus === "RIDE_STARTED") return "ride_started";
    if (ride.pickupStatus === "PARTNER_ARRIVED") return "partner_arrived";
    if (partnerAccepted && riderPickupStatus === "ARRIVED_AT_PICKUP") return "at_pickup";
    if (partnerAccepted && allAccepted) return "ready_for_pickup";
    if (allAccepted) return "all_accepted";
    if (quoteDeclined) return "quote_declined";
    if (quoteAccepted && isQuoteAcceptanceBlocked(quoteDeadlineInfo)) return getDeadlineJoinView(quoteDeadlineInfo);
    if (quoteAccepted) return "quote_accepted";
    if (ride.quoteStatus === "quote_ready") return getDeadlineJoinView(quoteDeadlineInfo);
    if (joined) return "joined";
    return ride.quoteStatus;
  })();

  function requireLogin() {
    if (user) return true;
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
    return false;
  }

  function recordPodUpdate(updateType: "joined" | "quote_accepted" | "all_guests_accepted" | "ready_for_pickup", message: string) {
    if (!user) return;

    void createPodLiveUpdate({
      podId: ride.id,
      userId: user.id,
      updateType,
      message,
      metadata: {
        route: `${ride.fromLabel} -> ${ride.toLabel}`,
      },
    }).catch((error) => console.warn("RidePod live update failed", error));
  }

  const storedLuggageTotal = totalLuggageContributions(storedLuggageContributions);
  const groupLuggageCount = baseLuggageCount + storedLuggageTotal.bagsCount;
  const groupHasLargeLuggage = baseHasLargeLuggage || storedLuggageTotal.hasLargeLuggage;

  return {
    seatsUsed,
    joinView,
    currentUserLuggage,
    groupLuggageCount,
    groupHasLargeLuggage,
    groupLuggageLabel: formatGroupLuggageLabel(groupLuggageCount, groupHasLargeLuggage),
    userLuggageLabel: joined ? formatUserLuggageLabel(currentUserLuggage) : null,
    luggageCapacityWarning: groupLuggageCount > getTaxiMaxBags(ride.taxiType),
    acceptedGuestCount,
    requiredGuestCount,
    quoteDeadlineInfo,
    attendanceMessage,
    attendanceError,
    isCancellingAttendance,
    canCancelAttendance: joined && !attendanceCancelled && !["ride_started", "full"].includes(joinView),
    canLockSeatAfterCancel: attendanceCancelled && !full && ride.pickupStatus !== "RIDE_STARTED",
    lockSeat: (luggageContribution?: LuggageContribution) => {
      if (!requireLogin()) return;
      const currentUser = user;
      if (!currentUser) return;
      const nextLuggage = luggageContribution ?? currentUserLuggage;
      setAttendanceError(null);
      setAttendanceMessage(null);
      setCurrentUserLuggage(nextLuggage);
      savePodLuggageContribution(ride.id, currentUser.id, nextLuggage);
      setStoredLuggageContributions(readPodLuggageContributions(ride.id));
      setJoined(true);
      setAttendanceCancelled(false);
      setSeatCanceled(false);
      setQuoteAcceptanceCanceled(false);
      setCancellationRequested(false);
      setSeatsUsed((currentSeats) => Math.min(currentSeats + 1, ride.seatsTotal));
      void joinPod({
        podId: ride.id,
        userId: currentUser.id,
        actorDisplayName: currentUserDisplayName,
        podTitle: `${ride.fromLabel} -> ${ride.toLabel}`,
        relatedUrl: `/pods/${ride.id}`,
      }).catch((error) => console.warn("RidePod join pod persistence failed", error));
    },
    joinSelfSettlePod: () => {
      saveStoredSelfSettleJoin(ride);
      setJoined(true);
      setSelfSettleRiskAccepted(true);
      setCurrentUserRole("joined_rider");
      setAttendanceCancelled(false);
      setSeatCanceled(false);
      setQuoteAcceptanceCanceled(false);
      setCancellationRequested(false);
      setSeatsUsed((currentSeats) => Math.min(currentSeats + 1, ride.seatsTotal));
    },
    leaveSelfSettlePod: () => {
      clearStoredSelfSettleJoin(ride.id);
      if (user) {
        clearPodLuggageContribution(ride.id, user.id);
        setStoredLuggageContributions(readPodLuggageContributions(ride.id));
      }
      setJoined(false);
      setSelfSettleRiskAccepted(false);
      setCurrentUserRole(undefined);
      setAttendanceCancelled(false);
      setSeatCanceled(false);
      setQuoteAcceptanceCanceled(false);
      setCancellationRequested(false);
      setSeatsUsed((currentSeats) => Math.max(currentSeats - 1, 0));
    },
    acceptQuote: () => {
      if (!requireLogin()) return;
      if (isQuoteAcceptanceBlocked(quoteDeadlineInfo)) return;
      setQuoteDeclined(false);
      setQuoteAcceptanceCanceled(false);
      setCancellationRequested(false);
      setQuoteAccepted(true);
      setAcceptedGuestCount((currentCount) => Math.min(currentCount + 1, requiredGuestCount));
      recordPodUpdate("quote_accepted", "Guest accepted the quote.");
      if (acceptedGuestCount + 1 >= requiredGuestCount) {
        recordPodUpdate("all_guests_accepted", "All guests accepted the selected quote.");
      }
    },
    declineQuote: () => {
      if (!requireLogin()) return;
      setQuoteAccepted(false);
      setQuoteDeclined(true);
      setQuoteAcceptanceCanceled(false);
      setCancellationRequested(false);
    },
    cancelSeat: () => {
      if (!requireLogin()) return;
      if (user) {
        clearPodLuggageContribution(ride.id, user.id);
        setStoredLuggageContributions(readPodLuggageContributions(ride.id));
      }
      setJoined(false);
      setSeatCanceled(true);
      setAttendanceCancelled(false);
      setQuoteAccepted(false);
      setQuoteDeclined(false);
      setQuoteAcceptanceCanceled(false);
      setCancellationRequested(false);
      setSeatsUsed((currentSeats) => Math.max(currentSeats - 1, 0));
    },
    cancelQuoteAcceptance: () => {
      if (!requireLogin()) return;
      setQuoteAccepted(false);
      setQuoteDeclined(false);
      setQuoteAcceptanceCanceled(true);
      setCancellationRequested(false);
      setAcceptedGuestCount((currentCount) => Math.max(currentCount - 1, 0));
    },
    requestCancellation: () => {
      if (!requireLogin()) return;
      setCancellationRequested(true);
    },
    markAtPickup: () => {
      if (!requireLogin()) return;
      setRiderPickupStatus("ARRIVED_AT_PICKUP");
      recordPodUpdate("ready_for_pickup", "Guest is ready for pickup.");
    },
    cancelAttendance: async () => {
      if (!requireLogin()) return false;
      const currentUser = user;
      if (!currentUser) return false;
      setIsCancellingAttendance(true);
      setAttendanceError(null);
      setAttendanceMessage(null);

      try {
        const result = await cancelPodAttendance({
          podId: ride.id,
          userId: currentUser.id,
          actorDisplayName: currentUserDisplayName,
          podTitle: `${ride.fromLabel} -> ${ride.toLabel}`,
          relatedUrl: `/pods/${ride.id}`,
        });

        if (!result.success) {
          setAttendanceError(result.error ?? "Unable to cancel attendance.");
          return false;
        }

        clearPodLuggageContribution(ride.id, currentUser.id);
        setStoredLuggageContributions(readPodLuggageContributions(ride.id));
        setJoined(false);
        setAttendanceCancelled(true);
        setQuoteAccepted(false);
        setQuoteDeclined(false);
        setSeatsUsed((currentSeats) => Math.max(currentSeats - 1, 0));
        setAttendanceMessage("You cancelled your attendance.");
        return true;
      } catch (error) {
        console.warn("RidePod cancel attendance failed", error);
        setAttendanceError("Unable to cancel attendance.");
        return false;
      } finally {
        setIsCancellingAttendance(false);
      }
    },
  };
}

export function formatHkdCents(cents: number) {
  return `HK$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export function getPodDetailQuoteMoney(ride: HomeRide) {
  return getTaxiPartnerQuoteMoneyDisplay(
    {
      quoteAmountCents: ride.quoteAmountCents ?? 24000,
      currency: "HKD",
    },
    ride.requiredGuestCount ?? ride.seatsTotal,
  );
}

function getQuoteExpiresInLabel(ride: HomeRide) {
  if (ride.id === "central-mongkok-evening") return "23:45";

  const minutes = ride.quoteExpiresInMinutes ?? 15;
  return `${String(Math.max(minutes, 0)).padStart(2, "0")}:00`;
}

function getEstimatedShareRangeLabel(ride: HomeRide) {
  const low = Math.max(1, Math.floor(ride.pricePerPerson * 0.9));
  const high = Math.ceil(ride.pricePerPerson * 1.1);

  return `HK$${low}-${high}`;
}

export function isPickupDetailView(joinView: PodDetailJoinView) {
  return ["ready_for_pickup", "partner_arrived", "at_pickup", "ride_started"].includes(joinView);
}

function isActivePickupView(joinView: PodDetailJoinView) {
  return ["ready_for_pickup", "partner_arrived", "at_pickup", "ride_started"].includes(joinView);
}

function routeStopStatusLabel(status: "pending_host_approval" | "approved" | "declined") {
  if (status === "approved") return "Approved";
  if (status === "declined") return "Declined";
  return "Pending host approval";
}

function routeStopTone(status: "pending_host_approval" | "approved" | "declined") {
  if (status === "approved") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (status === "declined") return "border-rose-300/35 bg-rose-400/10 text-rose-100";
  return "border-[var(--rp-primary)]/45 bg-[rgba(242,193,91,0.12)] text-[var(--rp-primary)]";
}

function stopTypeLabel(stopType: RoutePlanStop["stopType"]) {
  if (stopType === "dropoff_stop") return "Dropoff stop";
  if (stopType === "quick_stop") return "Quick stop";
  return "Pickup stop";
}

function addMinutesToTimeLabel(timeLabel: string | undefined, minutes: number) {
  if (!timeLabel) return null;

  const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  const baseHour = (hour % 12) + (period === "PM" ? 12 : 0);
  const date = new Date(2026, 0, 1, baseHour, minute + minutes);
  const displayHour = date.getHours() % 12 || 12;
  const displayMinute = date.getMinutes().toString().padStart(2, "0");
  const displayPeriod = date.getHours() >= 12 ? "PM" : "AM";

  return `~${displayHour}:${displayMinute} ${displayPeriod}`;
}

function getRoutePlanStopRows(proposedStops: RoutePlanStop[], approvedStops: RoutePlanStop[]) {
  return [...proposedStops, ...approvedStops];
}

function quoteRequestHasStarted(ride: HomeRide, joinView: PodDetailJoinView) {
  const quoteStartedViews: PodDetailJoinView[] = [
    "quote_pending",
    "quote_ready",
    "quote_deadline_soon",
    "quote_expired",
    "late_confirmation",
    "too_late_to_confirm",
    "quote_accepted",
    "all_accepted",
    "ready_for_pickup",
    "partner_arrived",
    "ride_started",
    "at_pickup",
  ];
  const quoteStartedStatuses: QuoteStatus[] = ["quote_pending", "quote_ready", "ready_for_pickup"];

  return (
    quoteStartedViews.includes(joinView) ||
    quoteStartedStatuses.includes(ride.quoteStatus) ||
    ride.driverAssignmentStatus === "PARTNER_ACCEPTED" ||
    ride.pickupStatus === "READY_FOR_PICKUP" ||
    ride.pickupStatus === "PARTNER_ARRIVED" ||
    ride.pickupStatus === "RIDE_STARTED"
  );
}

export function getCurrentUserIsHost(ride: HomeRide) {
  if (ride.currentUserRole) return ride.currentUserRole === "host";

  return ride.hostName.trim().toLowerCase() === "tony" && !ride.joinedRiders.some((name) => name.trim().toLowerCase() === "you");
}

export function isRideAppSelfSettlePod(ride: HomeRide) {
  return ride.rideCategory === "ride_app_self_settle";
}

function formatRejoinTimeLeft(until: Date, now = new Date()) {
  const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / (60 * 1000)));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function getRideAppRejoinCooldownInfo(ride: HomeRide, now = new Date()) {
  if (!ride.rejoinCooldownUntil) return { active: false, timeLeftLabel: null as string | null };
  const cooldownUntil = new Date(ride.rejoinCooldownUntil);
  if (Number.isNaN(cooldownUntil.getTime()) || cooldownUntil.getTime() <= now.getTime()) {
    return { active: false, timeLeftLabel: null as string | null };
  }

  return {
    active: true,
    timeLeftLabel: formatRejoinTimeLeft(cooldownUntil, now),
  };
}

export function getRideAppRejoinRestrictionCopy(ride: HomeRide, seatsAvailable = true) {
  if (ride.requiresHostApprovalToRejoin) {
    return {
      kind: "host_approval" as const,
      cta: "Ask host to rejoin",
      helper: "Too many join/leave actions. Host approval is needed before you can rejoin this pod.",
    };
  }

  const cooldown = getRideAppRejoinCooldownInfo(ride);
  if (cooldown.active) {
    return {
      kind: "cooldown" as const,
      cta: "Rejoin available soon",
      helper: `You can request to rejoin after ${cooldown.timeLeftLabel}.`,
    };
  }

  if (!seatsAvailable) {
    return {
      kind: "full" as const,
      cta: "Find another pod",
      helper: "This pod is full.",
    };
  }

  return null;
}

export function getCurrentUserCanJoinSelfSettlePod(ride: HomeRide, joinView: PodDetailJoinView) {
  if (!isRideAppSelfSettlePod(ride)) return false;
  if (joinView !== "quote_pending") return false;
  if (getCurrentUserIsHost(ride)) return false;
  if (ride.currentUserJoined === true || ride.quoteStatus === "joined") return false;
  if (ride.requiresHostApprovalToRejoin) return false;
  if (getRideAppRejoinCooldownInfo(ride).active) return false;

  return !ride.joinedRiders.some((name) => name.trim().toLowerCase() === "you");
}

export function getCurrentUserIsJoinedSelfSettlePod(ride: HomeRide, joinView: PodDetailJoinView) {
  return isRideAppSelfSettlePod(ride) && joinView === "joined" && !getCurrentUserIsHost(ride);
}

function getRideAppHostTrustUserId(ride: HomeRide) {
  if (ride.rideAppEstimatedFareUpdatedBy?.trim()) return ride.rideAppEstimatedFareUpdatedBy.trim();
  const normalizedHost = ride.hostName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalizedHost ? `mock-host-${normalizedHost}` : "mock-host";
}

function getRideAppCurrentUserId(userId?: string | null) {
  return userId ?? "mock-rider-tony";
}

function isSelfSettleRideTimePassed(ride: HomeRide) {
  const date = parseSelfSettleRideDate(ride.dateLabel);
  const time = parseSelfSettleRideTime(ride.timeLabel);
  if (!date || !time) return ride.pickupStatus === "RIDE_STARTED" || ride.status === "locked";
  date.setHours(time.hours, time.minutes, 0, 0);
  return date.getTime() <= Date.now();
}

function parseSelfSettleRideDate(label: string) {
  const now = new Date();
  const normalized = label.trim();
  const lower = normalized.toLowerCase();
  if (lower.includes("today")) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (lower.includes("tomorrow")) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const match = normalized.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{1,2})\b/i);
  if (!match) return null;
  const monthIndex = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].findIndex((month) =>
    match[1].toLowerCase().startsWith(month),
  );
  return monthIndex >= 0 ? new Date(now.getFullYear(), monthIndex, Number(match[2])) : null;
}

function parseSelfSettleRideTime(label: string) {
  const match = label.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const period = match[3].toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

function getCurrentUserName(ride: HomeRide) {
  if (ride.currentUserName?.trim()) return ride.currentUserName.trim();
  if (ride.currentUserRole === "host") return ride.hostName;
  return "You";
}

function namesMatch(left: string | undefined, right: string | undefined) {
  const normalizeName = (value: string | undefined) =>
    value?.trim().toLowerCase().replace(/\s*\(you\)\s*$/, "") ?? "";

  return Boolean(normalizeName(left) && normalizeName(left) === normalizeName(right));
}

function getStopRequestCopy({
  ride,
  joinView,
  isHost,
  proposedStops,
  approvedStops,
}: {
  ride: HomeRide;
  joinView: PodDetailJoinView;
  isHost: boolean;
  proposedStops: RoutePlanStop[];
  approvedStops: RoutePlanStop[];
}) {
  const selfSettle = isRideAppSelfSettlePod(ride);
  const currentUserName = getCurrentUserName(ride);
  const hasApprovedStops = approvedStops.length > 0;
  const hasPendingStop = proposedStops.some((stop) => stop.status === "pending_host_approval");
  const currentUserPendingStop = proposedStops.some(
    (stop) => stop.status === "pending_host_approval" && namesMatch(stop.requestedBy, currentUserName),
  );
  const selfSettleRouteLocked =
    ride.bookingDetailsShared === true ||
    ride.rideAppBookingDetailsConfirmed === true ||
    ride.rideAppBookingDetailsFinalized === true;
  const routeLocked = selfSettle ? selfSettleRouteLocked : quoteRequestHasStarted(ride, joinView);
  const acceptedGuestCount = ride.acceptedGuestCount ?? (ride.currentUserQuoteAccepted ? 1 : 0);
  const requiredGuestCount = ride.requiredGuestCount ?? ride.seatsTotal;
  const allGuestsAccepted =
    ride.allGuestsAccepted === true ||
    (requiredGuestCount > 0 && acceptedGuestCount >= requiredGuestCount) ||
    joinView === "all_accepted";
  const taxiPartnerAccepted =
    ride.quoteStatus === "ready_for_pickup" ||
    ride.driverAssignmentStatus === "PARTNER_ACCEPTED" ||
    ride.pickupStatus === "READY_FOR_PICKUP" ||
    ride.pickupStatus === "PARTNER_ARRIVED";

  if (ride.pickupStatus === "RIDE_STARTED" || joinView === "ride_started") {
    return {
      action: null,
      title: "Ride has started. Route changes are closed.",
      helper: "Use updates for ride coordination.",
      tone: "muted" as const,
    };
  }

  if (!isHostApprovedStopPolicy(ride.stopRequestPolicy)) {
    return {
      action: null,
      title: "Direct route only",
      helper: "This pod does not allow extra stop requests.",
      tone: "muted" as const,
    };
  }

  if (routeLocked) {
    return {
      action: null,
      title: selfSettle ? "Route locked" : isHost ? "Route locked after quote request" : "Route locked",
      helper: selfSettle
        ? "Route changes are closed after booking details are confirmed."
        : isHost
          ? "Approve or decline stop requests before requesting a taxi partner quote."
          : ["quote_ready", "quote_deadline_soon", "late_confirmation", "quote_accepted", "all_accepted"].includes(joinView)
            ? "The taxi partner quote is based on this route. Stop requests are no longer available."
            : "Stop requests are closed because the taxi partner quote has started.",
      tone: "muted" as const,
    };
  }

  if (taxiPartnerAccepted || isActivePickupView(joinView)) {
    return {
      action: null,
      title: "Taxi partner accepted. Route changes require manual coordination.",
      helper: "Use updates for any pickup coordination.",
      tone: "muted" as const,
    };
  }

  if (allGuestsAccepted) {
    return {
      action: null,
      title: selfSettle ? "Route changes are closed after rider confirmation." : "Route changes are closed after guests accept the quote.",
      helper: selfSettle
        ? "Riders need to review any meaningful route update before the ride proceeds."
        : "Stop requests are closed because the taxi partner quote is based on this route.",
      tone: "muted" as const,
    };
  }

  if (isHost) {
    return {
      action: null,
      title: hasPendingStop ? "Stop request pending" : "Host-approved stop requests",
      helper: hasPendingStop
        ? "Review the stop request before the route changes."
        : selfSettle
          ? "Joined riders can propose one extra stop before current details are confirmed."
          : "Joined riders can propose one extra stop before taxi quote acceptance.",
      tone: "default" as const,
    };
  }

  if (currentUserPendingStop) {
    return {
      action: null,
      title: "Stop request pending",
      helper: "Host needs to approve before the route changes.",
      tone: "default" as const,
    };
  }

  if (ride.currentUserJoined !== true || !["rider", "joined_rider"].includes(ride.currentUserRole ?? "")) {
    return {
      action: null,
      title: "Join the pod before proposing a stop.",
      helper: selfSettle
        ? "Joined riders can propose one extra stop before current details are confirmed."
        : "Joined riders can propose one extra stop before taxi quote acceptance.",
      tone: "muted" as const,
    };
  }

  if (hasPendingStop || hasApprovedStops) {
    return {
      action: null,
      title: "Only one extra stop is supported in this beta.",
      helper: hasApprovedStops ? "The route plan already includes an approved stop." : "Wait for the host to review the pending stop.",
      tone: "muted" as const,
    };
  }

  return {
    action: "Propose stop",
    title: "Host-approved stop requests",
    helper: selfSettle
      ? "Host must approve before this affects the shared ride details."
      : "Host must approve before this affects the taxi quote.",
    tone: "default" as const,
  };
}

export function RoutePlanCard({ ride, joinView }: { ride: HomeRide; joinView: PodDetailJoinView }) {
  const [proposedStops, setProposedStops] = useState<RoutePlanStop[]>(ride.proposedStops ?? []);
  const [approvedStops, setApprovedStops] = useState<RoutePlanStop[]>(ride.approvedStops ?? []);
  const [declinedStops, setDeclinedStops] = useState<RoutePlanStop[]>(ride.declinedStops ?? []);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [approveStop, setApproveStop] = useState<RoutePlanStop | null>(null);
  const [declineStop, setDeclineStop] = useState<RoutePlanStop | null>(null);
  const [withdrawStop, setWithdrawStop] = useState<RoutePlanStop | null>(null);
  const [withdrawnStop, setWithdrawnStop] = useState<RoutePlanStop | null>(null);
  const [routeNotice, setRouteNotice] = useState<{ title: string; body: string } | null>(null);
  const hostRequestNoticeShown = useRef(false);
  const selfSettle = isRideAppSelfSettlePod(ride);
  const selfSettleRouteLocked =
    ride.bookingDetailsShared === true ||
    ride.rideAppBookingDetailsConfirmed === true ||
    ride.rideAppBookingDetailsFinalized === true;
  const taxiRouteLocked = quoteRequestHasStarted(ride, joinView);
  const routeLocked = selfSettle ? selfSettleRouteLocked : taxiRouteLocked;
  const routeRequestRide = { ...ride, proposedStops, approvedStops, declinedStops };
  const routeRequests = getNormalizedRouteRequests(routeRequestRide);
  const pendingRouteRequest = routeRequests.pending[0] ?? null;
  const pendingStop = pendingRouteRequest ? routeRequestToRoutePlanStop(pendingRouteRequest) : null;
  const displayedApprovedStops = routeRequests.approved.map(routeRequestToRoutePlanStop);
  const displayedDeclinedStops = routeRequests.declined.map(routeRequestToRoutePlanStop);
  const stopRows = getRoutePlanStopRows(routeLocked || !pendingStop ? [] : [pendingStop], displayedApprovedStops);
  const expiredPendingStop = routeLocked ? pendingStop : null;
  const isHost = getCurrentUserIsHost(ride);
  const currentUserName = getCurrentUserName(ride);
  const stopCopy = getStopRequestCopy({
    ride,
    joinView,
    isHost,
    proposedStops: pendingStop ? [pendingStop] : [],
    approvedStops: displayedApprovedStops,
  });
  const hasApprovedStops = displayedApprovedStops.length > 0;
  const approvedStop = displayedApprovedStops[0] ?? null;
  const declinedStop = displayedDeclinedStops[0] ?? null;
  const isAirport = ride.rideKind === "airport" || ride.airportDirection !== null;
  const isRecurring = ride.rideKind === "recurring";
  const canHostReviewStop = Boolean(!routeLocked && pendingStop && isHost && stopCopy.title === "Stop request pending");
  const requestingPendingStop = !routeLocked && !isHost && pendingStop && namesMatch(pendingStop.requestedBy, currentUserName) ? pendingStop : null;
  const otherRiderPendingStop = !routeLocked && !isHost && pendingStop && !namesMatch(pendingStop.requestedBy, currentUserName) ? pendingStop : null;
  const currentUserRequestedApprovedStop = namesMatch(approvedStop?.requestedBy, currentUserName);
  const currentUserRequestedDeclinedStop = namesMatch(declinedStop?.requestedBy, currentUserName);
  const pickupTime = ride.pickupTime ?? ride.timeLabel;
  const proposedStopTime = addMinutesToTimeLabel(pickupTime, 15) ?? "~7:45 PM";
  const dropoffTime = addMinutesToTimeLabel(pickupTime, 30) ?? "~8:00 PM";
  const routePlanNote = (() => {
    if (selfSettle && routeLocked && hasApprovedStops) return "Ride app details use the approved route plan.";
    if (selfSettle && routeLocked) {
      return isRecurring
        ? "Route set for this selected ride. Meaningful updates require rider review."
        : "Route set for ride details. Meaningful updates require rider review.";
    }
    if (taxiRouteLocked && hasApprovedStops) return "Taxi partner quote uses the approved route plan.";
    if (taxiRouteLocked && ["quote_ready", "quote_deadline_soon", "late_confirmation", "quote_accepted", "all_accepted"].includes(joinView)) {
      return "Route locked. The taxi partner quote is based on this route.";
    }
    if (taxiRouteLocked && isRecurring) return "Route locked. Stop requests are closed once the quote request starts for this ride.";
    if (taxiRouteLocked) return "Route locked. Stop requests are closed because the taxi partner quote has started.";
    if (stopCopy.title === "Ride has started. Route changes are closed.") return "Ride has started. Route changes are closed.";
    if (stopCopy.title === "Taxi partner accepted. Route changes require manual coordination.") {
      return "Taxi partner accepted. Route changes require manual coordination.";
    }
    if (stopCopy.title === "Route changes are closed after guests accept the quote.") {
      return "Route changes are closed after guests accept the quote.";
    }
    if (pendingStop) {
      return selfSettle
        ? "Host must approve before this affects the shared ride details."
        : "Host must approve before this affects the taxi quote.";
    }
    if (hasApprovedStops) return "The approved stop is included in the route plan.";

    return null;
  })();

  function showRouteNotice(title: string, body: string) {
    setRouteNotice({ title, body });
  }

  useEffect(() => {
    if (!pendingStop || routeLocked || !isHost || hostRequestNoticeShown.current) return;
    hostRequestNoticeShown.current = true;
    showRouteNotice(
      "New stop request",
      `${pendingStop.requestedBy ?? "A rider"} proposed an extra stop. Review it below.`,
    );
  }, [isHost, pendingStop, routeLocked]);

  useEffect(() => {
    if (!routeNotice) return;
    if (routeNotice.title === "New stop request") return;
    const timeout = window.setTimeout(() => setRouteNotice(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [routeNotice]);

  function handleSubmitStop(location: string, reason: string, stopType: RoutePlanStop["stopType"]) {
    const nextStopId = `stop-${ride.id}-${routeRequests.all.length + 1}`;
    const nextStop: RoutePlanStop = {
      id: nextStopId,
      label: location,
      requestedBy: currentUserName,
      reason: reason || undefined,
      stopType,
      status: "pending_host_approval",
    };
    const nextStops = [nextStop];
    const nextRouteRequests = [
      ...routeRequests.all.filter((request) => request.id !== nextStop.id && request.status !== "pending"),
      {
        id: nextStop.id,
        requestedByName: currentUserName,
        stopLocation: location,
        reason: reason || undefined,
        status: "pending" as const,
        requestedAtLabel: "Just now",
      },
    ];
    setProposedStops(nextStops);
    saveStoredSelfSettleRidePatch(ride.id, { routeRequests: nextRouteRequests, proposedStops: nextStops });
    setProposalOpen(false);
    showRouteNotice("Stop request sent", "Host has been notified and must approve before the route changes.");
  }

  function handleApproveStop(stop: RoutePlanStop) {
    const nextProposedStops = proposedStops.filter((item) => item.id !== stop.id);
    const nextApprovedStops = [{ ...stop, status: "approved" as const }];
    const nextRouteRequests = routeRequests.all.map((request) =>
      request.id === stop.id
        ? {
            ...request,
            status: "approved" as const,
            reviewedByName: ride.hostName || "Host",
            reviewedAtLabel: "Just now",
          }
        : request,
    );
    setProposedStops(nextProposedStops);
    setApprovedStops(nextApprovedStops);
    saveStoredSelfSettleRidePatch(ride.id, {
      routeRequests: nextRouteRequests,
      proposedStops: nextProposedStops,
      approvedStops: nextApprovedStops,
    });
    setApproveStop(null);
    showRouteNotice("Stop approved", `${stop.requestedBy ?? "The rider"} will see the approved route update.`);
  }

  function handleDeclineStop(stop: RoutePlanStop) {
    const nextProposedStops = proposedStops.filter((item) => item.id !== stop.id);
    const nextDeclinedStops = [{ ...stop, status: "declined" as const }];
    const nextRouteRequests = routeRequests.all.map((request) =>
      request.id === stop.id
        ? {
            ...request,
            status: "declined" as const,
            reviewedByName: ride.hostName || "Host",
            reviewedAtLabel: "Just now",
          }
        : request,
    );
    setProposedStops(nextProposedStops);
    setDeclinedStops(nextDeclinedStops);
    saveStoredSelfSettleRidePatch(ride.id, {
      routeRequests: nextRouteRequests,
      proposedStops: nextProposedStops,
      declinedStops: nextDeclinedStops,
    });
    setDeclineStop(null);
    showRouteNotice("Stop request declined", `${stop.requestedBy ?? "The rider"} will see that the route stays unchanged.`);
  }

  function handleWithdrawStop(stop: RoutePlanStop) {
    const nextProposedStops = proposedStops.filter((item) => item.id !== stop.id);
    const nextRouteRequests = routeRequests.all.map((request) =>
      request.id === stop.id
        ? {
            ...request,
            status: "withdrawn" as const,
            reviewedAtLabel: "Just now",
          }
        : request,
    );
    setProposedStops(nextProposedStops);
    saveStoredSelfSettleRidePatch(ride.id, { routeRequests: nextRouteRequests, proposedStops: nextProposedStops });
    setWithdrawnStop(stop);
    setWithdrawStop(null);
    showRouteNotice("Stop request withdrawn", "Route stays unchanged.");
  }

  const timelineRows = [
    {
      id: "pickup",
      label: "Pickup",
      value: ride.pickupLabel ?? ride.fromLabel,
      status: null,
      time: pickupTime,
      icon: MapPin,
    },
    ...stopRows.map((stop) => {
      const approvedIndex = displayedApprovedStops.findIndex((item) => item.id === stop.id);
      return {
        id: stop.id,
        label: stop.status === "pending_host_approval" ? "Proposed stop" : `Stop ${approvedIndex + 1}`,
        value: stop.label,
        status: stop.status,
        requestedBy: stop.requestedBy,
        time: stop.status === "pending_host_approval" ? proposedStopTime : proposedStopTime,
        icon: MapPin,
      };
    }),
    {
      id: "dropoff",
      label: "Dropoff",
      value: ride.dropoffLabel ?? ride.toLabel,
      status: null,
      time: dropoffTime,
      icon: MapPin,
    },
  ];

  return (
    <section className="grid gap-3">
      {routeNotice ? <RouteActionNotice notice={routeNotice} onDismiss={() => setRouteNotice(null)} /> : null}

      <section className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
              Date & Time
            </p>
            <p className="mt-1 break-words text-base font-black leading-5 text-[var(--rp-text)]">
              {ride.dateLabel} - {ride.timeLabel}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[var(--rp-text)]">Route plan</h3>
            {hasApprovedStops && ride.quoteStatus === "quote_pending" ? (
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-primary)]">
                Taxi partner quote will use the approved route plan.
              </p>
            ) : null}
            {ride.quoteUpdatedAfterRouteChange && hasApprovedStops ? (
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-primary)]">
                Updated quote ready.
              </p>
            ) : null}
          </div>
        </div>

        <ol className="mt-4 grid gap-0">
          {timelineRows.map((row, index) => {
            const isLast = index === timelineRows.length - 1;
            const proposed = row.status === "pending_host_approval";
            const approved = row.status === "approved";

            return (
              <li
                key={row.id}
                className="grid grid-cols-[64px_30px_minmax(0,1fr)] gap-3 px-1"
              >
                <span
                  className={cn(
                    "pt-1 text-sm font-black leading-7 text-[var(--rp-muted-strong)]",
                    (proposed || approved) && "text-[var(--rp-primary)]",
                  )}
                >
                  {row.time}
                </span>
                <span className="grid justify-items-center">
                  <span
                    className={cn(
                      "mt-1.5 h-4 w-4 rounded-full border-2 bg-[var(--rp-text)]",
                      proposed
                        ? "border-[var(--rp-primary)] bg-transparent outline outline-1 outline-offset-4 outline-[rgba(242,193,91,0.32)]"
                        : approved
                          ? "border-[var(--rp-primary)] bg-[var(--rp-primary)]"
                          : "border-[var(--rp-text)]",
                    )}
                  />
                  {!isLast ? <span className="h-full min-h-14 w-px bg-[var(--rp-primary)]/60" /> : null}
                </span>
                <span
                  className={cn(
                    "min-w-0 border-b border-[var(--rp-border)] pb-5",
                    index > 0 && "pt-1",
                    isLast && "border-b-0 pb-1",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-black text-[var(--rp-text)]",
                        (proposed || approved) && "text-[var(--rp-primary)]",
                      )}
                    >
                      {row.label}
                    </span>
                    {row.status ? (
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black leading-none", routeStopTone(row.status))}>
                        {routeStopStatusLabel(row.status)}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block break-words text-base font-black leading-6 text-[var(--rp-text)]">{row.value}</span>
                  {"requestedBy" in row && row.requestedBy && !isHost ? (
                    <span className="mt-1 block text-xs font-semibold text-[var(--rp-muted-strong)]">
                      Requested by {row.requestedBy}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>

        {routePlanNote ? (
          <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-[var(--rp-border-strong)] bg-[rgba(242,193,91,0.08)] px-3 py-3 text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--rp-primary)] text-[var(--rp-primary-text)]">
              <Info className="h-4 w-4" />
            </span>
            <span className="min-w-0">{routePlanNote}</span>
          </div>
        ) : null}
      </section>

      {expiredPendingStop ? (
        <section className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[rgba(242,193,91,0.1)] text-[var(--rp-primary)]">
              <Clock3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h4 className="text-base font-black text-[var(--rp-text)]">Stop request expired</h4>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Quote request already started. Route stays unchanged.
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                {expiredPendingStop.requestedBy ?? "A rider"} requested {expiredPendingStop.label}.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {canHostReviewStop && pendingStop ? (
        <section className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] p-4">
          <h4 className="text-base font-black text-[var(--rp-text)]">New stop request</h4>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {pendingStop.requestedBy ?? "A rider"} is waiting for host review.
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-3 max-[380px]:grid-cols-1">
            <div className="min-w-0">
              <dt className="text-[11px] font-bold text-[var(--rp-muted-strong)]">Stop location</dt>
              <dd className="mt-1 break-words text-xs font-black text-[var(--rp-text)]">{pendingStop.label}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-bold text-[var(--rp-muted-strong)]">Requested by</dt>
              <dd className="mt-1 break-words text-xs font-black text-[var(--rp-text)]">{pendingStop.requestedBy ?? "Rider"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-bold text-[var(--rp-muted-strong)]">Type</dt>
              <dd className="mt-1 break-words text-xs font-black text-[var(--rp-text)]">{stopTypeLabel(pendingStop.stopType)}</dd>
            </div>
            {pendingStop.reason ? (
              <div className="min-w-0">
                <dt className="text-[11px] font-bold text-[var(--rp-muted-strong)]">Reason</dt>
                <dd className="mt-1 break-words text-xs font-black text-[var(--rp-text)]">{pendingStop.reason}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-primary)]">
            {selfSettle
              ? "Approve or decline stop requests before booking details are confirmed."
              : "Approve or decline stop requests before requesting a taxi partner quote."}
          </p>
          {isAirport ? (
            <p className="mt-3 text-xs font-bold leading-5 text-cyan-100">
              Airport stops may affect timing, luggage space, and the taxi partner quote.
            </p>
          ) : null}
          {isRecurring ? (
            <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              This stop applies to this ride only.
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2 max-[360px]:grid-cols-1">
            <button
              type="button"
              onClick={() => setDeclineStop(pendingStop)}
              className="min-h-11 rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-2 text-sm font-black text-white"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => setApproveStop(pendingStop)}
              className="min-h-11 rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_65%,var(--rp-border))] bg-[color-mix(in_srgb,var(--rp-primary)_24%,var(--rp-card-muted))] px-3 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(242,193,91,0.16)]"
            >
              Approve stop
            </button>
          </div>
        </section>
      ) : null}

      {requestingPendingStop ? (
        <section className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <h4 className="text-base font-black text-[var(--rp-text)]">Your stop request is pending</h4>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Host must approve before the route changes.
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--rp-border)] pt-4 max-[420px]:grid-cols-1">
            <div className="min-w-0">
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">Stop location</dt>
              <dd className="mt-1 break-words text-sm font-black leading-5 text-[var(--rp-text)]">{requestingPendingStop.label}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">Type</dt>
              <dd className="mt-1 break-words text-sm font-black leading-5 text-[var(--rp-text)]">{stopTypeLabel(requestingPendingStop.stopType)}</dd>
            </div>
            {requestingPendingStop.reason ? (
              <div className="min-w-0">
                <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">Reason</dt>
                <dd className="mt-1 break-words text-sm font-black leading-5 text-[var(--rp-text)]">{requestingPendingStop.reason}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--rp-border)] px-3 py-2 text-sm font-black text-[var(--rp-muted-strong)]">
            <Clock3 className="h-4 w-4" />
            Waiting for host approval
          </div>
          <button
            type="button"
            onClick={() => setWithdrawStop(requestingPendingStop)}
            className="mt-3 min-h-11 w-full rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-2 text-sm font-black text-white"
          >
            Withdraw request
          </button>
        </section>
      ) : null}

      {otherRiderPendingStop ? (
        <section className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <h4 className="text-base font-black text-[var(--rp-text)]">Stop request pending</h4>
          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {otherRiderPendingStop.requestedBy ?? "A rider"} proposed an extra stop.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] pt-4 max-[420px]:grid-cols-1">
            <div className="min-w-0">
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">Stop location</dt>
              <dd className="mt-1 break-words text-sm font-black leading-5 text-[var(--rp-text)]">{otherRiderPendingStop.label}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">Type</dt>
              <dd className="mt-1 break-words text-sm font-black leading-5 text-[var(--rp-text)]">{stopTypeLabel(otherRiderPendingStop.stopType)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {selfSettle
              ? "Host must approve before this affects the shared ride details."
              : "Host must approve before this affects the taxi quote."}
          </p>
          {isAirport ? (
            <p className="mt-2 text-xs font-bold leading-5 text-cyan-100">
              Airport stops may affect timing, luggage space, and the taxi partner quote.
            </p>
          ) : null}
          {isRecurring ? (
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              This stop applies to this ride only.
            </p>
          ) : null}
        </section>
      ) : null}

      {approvedStop ? (
        <section className="rounded-[18px] border border-emerald-300/25 bg-emerald-400/10 p-4">
          <h4 className="text-base font-black text-emerald-100">
            {isHost ? "Stop approved" : currentUserRequestedApprovedStop ? "Your stop was approved" : "Stop approved"}
          </h4>
          <p className="mt-1 text-sm font-semibold leading-6 text-emerald-100">
            {isHost
              ? "The approved stop is included in the route plan."
              : currentUserRequestedApprovedStop
                ? "The route plan now includes this stop."
                : `The route plan now includes ${approvedStop.requestedBy ?? "the rider"}'s stop.`}
          </p>
        </section>
      ) : null}

      {declinedStop ? (
        <section className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
          <h4 className="text-base font-black text-[var(--rp-text)]">
            {isHost ? "Stop request declined" : currentUserRequestedDeclinedStop ? "Your stop request was declined" : "Stop request declined"}
          </h4>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">Route stays unchanged.</p>
        </section>
      ) : null}

      {withdrawnStop && !isHost ? (
        <section className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
          <h4 className="text-base font-black text-[var(--rp-text)]">Stop request withdrawn.</h4>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">Route stays unchanged.</p>
        </section>
      ) : null}

      {!expiredPendingStop && !canHostReviewStop && !requestingPendingStop && !otherRiderPendingStop && !approvedStop && !declinedStop && !withdrawnStop ? (
        <div
          className="rounded-[15px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3"
        >
          <div className="flex flex-col gap-3 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--rp-text)]">
                {stopCopy.title}
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                {stopCopy.helper}
              </p>
              {isAirport && isDirectRoutePolicy(ride.stopRequestPolicy) ? (
                <p className="mt-2 text-xs font-bold leading-5 text-cyan-100">
                  Airport rides usually work best without extra stops.
                </p>
              ) : null}
              {isAirport && isHostApprovedStopPolicy(ride.stopRequestPolicy) ? (
                <p className="mt-2 text-xs font-bold leading-5 text-cyan-100">
                  Airport stops may affect timing, luggage space, and the taxi partner quote.
                </p>
              ) : null}
              {isRecurring ? (
                <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                  This stop applies to this ride only.
                </p>
              ) : null}
            </div>
            {stopCopy.action ? (
              <button
                type="button"
                onClick={() => setProposalOpen(true)}
                className="min-h-10 shrink-0 rounded-full border border-[var(--rp-primary)] px-3 py-2 text-xs font-black text-[var(--rp-primary)]"
              >
                {stopCopy.action}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {proposalOpen ? (
        <ProposeStopModal ride={ride} onCancel={() => setProposalOpen(false)} onSubmit={handleSubmitStop} />
      ) : null}
      {approveStop ? (
        <ApproveStopModal
          ride={ride}
          stop={approveStop}
          joinView={joinView}
          onCancel={() => setApproveStop(null)}
          onConfirm={() => handleApproveStop(approveStop)}
        />
      ) : null}
      {declineStop ? (
        <DeclineStopModal onCancel={() => setDeclineStop(null)} onConfirm={() => handleDeclineStop(declineStop)} />
      ) : null}
      {withdrawStop ? (
        <WithdrawStopModal onCancel={() => setWithdrawStop(null)} onConfirm={() => handleWithdrawStop(withdrawStop)} />
      ) : null}
    </section>
  );
}

function RouteActionNotice({
  notice,
  onDismiss,
}: {
  notice: { title: string; body: string };
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="rounded-[18px] border border-[color-mix(in_srgb,var(--rp-primary)_48%,var(--rp-border))] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4 text-[var(--rp-text)] shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--rp-primary)] text-[var(--rp-primary-text)]">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">{notice.title}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">{notice.body}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full px-2 py-1 text-xs font-black text-[var(--rp-primary)]"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function RoutePreview({
  ride,
  stopLabel,
  pending,
  approved,
}: {
  ride: HomeRide;
  stopLabel: string;
  pending?: boolean;
  approved?: boolean;
}) {
  const rows = [
    { id: "pickup", label: "Pickup", value: ride.pickupLabel ?? ride.fromLabel, helper: null },
    {
      id: "stop",
      label: pending ? "Proposed stop" : "Stop 1",
      value: stopLabel.trim() || "Your stop appears here.",
      helper: pending ? "Pending host approval" : approved ? "Approved" : null,
    },
    { id: "dropoff", label: "Dropoff", value: ride.dropoffLabel ?? ride.toLabel, helper: null },
  ];

  return (
    <ol className="grid gap-0 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;

        return (
          <li key={row.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
            <span className="grid justify-items-center">
              <span className="mt-0.5 h-3 w-3 rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-primary)]" />
              {!isLast ? <span className="h-full min-h-8 w-px bg-[var(--rp-border)]" /> : null}
            </span>
            <span className={cn("min-w-0 pb-3", isLast && "pb-0")}>
              <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
                {row.label}
              </span>
              <span className="mt-1 block break-words text-sm font-black leading-5 text-[var(--rp-text)]">{row.value}</span>
              {row.helper ? (
                <span className="mt-1 block text-xs font-bold text-[var(--rp-muted-strong)]">{row.helper}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ProposeStopModal({
  ride,
  onCancel,
  onSubmit,
}: {
  ride: HomeRide;
  onCancel: () => void;
  onSubmit: (location: string, reason: string, stopType: RoutePlanStop["stopType"]) => void;
}) {
  const titleId = useId();
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [stopType, setStopType] = useState<RoutePlanStop["stopType"]>("pickup_stop");
  const trimmedLocation = location.trim();

  function submitStopRequest() {
    if (!trimmedLocation) return;
    onSubmit(trimmedLocation, reason.trim(), stopType);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitStopRequest();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-[460px] flex-col overflow-hidden rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]"
      >
        <div className="overflow-y-auto p-5">
          <h2 id={titleId} className="text-2xl font-black leading-tight">Propose a stop</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Ask the host to add one stop before the final dropoff.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-black text-[var(--rp-text)]">Stop location</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Admiralty Station Exit A"
                className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-semibold text-[var(--rp-text)] outline-none"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-[var(--rp-text)]">Why add this stop?</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Easier pickup for me"
                rows={3}
                className="rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 py-3 text-sm font-semibold text-[var(--rp-text)] outline-none"
              />
            </label>
            <div>
              <p className="text-sm font-black text-[var(--rp-text)]">Stop type</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  ["pickup_stop", "Pickup stop"],
                  ["dropoff_stop", "Dropoff stop"],
                  ["quick_stop", "Quick stop"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStopType(id as RoutePlanStop["stopType"])}
                    className={cn(
                      "min-h-10 rounded-full border px-2 text-xs font-black",
                      stopType === id
                        ? "border-[var(--rp-primary)] bg-[rgba(242,193,91,0.14)] text-[var(--rp-primary)]"
                        : "border-[var(--rp-border)] text-[var(--rp-muted-strong)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-black text-[var(--rp-text)]">Route preview</p>
              <RoutePreview ride={ride} stopLabel={location} pending />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] p-4">
          <button
            type="button"
            onClick={onCancel}
            onPointerDown={(event) => {
              event.preventDefault();
              onCancel();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              onCancel();
            }}
            className="min-h-12 rounded-full border border-[var(--rp-border)] px-4 text-sm font-black text-[var(--rp-muted-strong)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmedLocation}
            onPointerDown={(event) => {
              event.preventDefault();
              submitStopRequest();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              submitStopRequest();
            }}
            className="min-h-12 rounded-full bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] disabled:border disabled:border-[var(--rp-border)] disabled:bg-[var(--rp-card-muted)] disabled:text-[var(--rp-muted-strong)]"
          >
            Submit request
          </button>
        </div>
      </form>
    </div>
  );
}

function ApproveStopModal({
  ride,
  stop,
  joinView,
  onCancel,
  onConfirm,
}: {
  ride: HomeRide;
  stop: RoutePlanStop;
  joinView: PodDetailJoinView;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const quoteReady = ["quote_ready", "quote_deadline_soon", "late_confirmation"].includes(joinView);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[460px] rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">Approve this stop?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          This will add the proposed stop to the route plan.
        </p>
        <div className="mt-5">
          <RoutePreview ride={ride} stopLabel={stop.label} approved />
        </div>
        <p className={cn("mt-4 rounded-[14px] border p-3 text-xs font-bold leading-5", quoteReady ? "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]" : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]")}>
          {quoteReady ? "Route is locked once the taxi partner quote has started." : "The taxi partner quote will use the approved route plan."}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            onPointerDown={(event) => {
              event.preventDefault();
              onCancel();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              onCancel();
            }}
            className="min-h-12 rounded-full border border-[var(--rp-border)] px-4 text-sm font-black text-[var(--rp-muted-strong)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            onPointerDown={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className="min-h-12 rounded-full bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-white"
          >
            Approve stop
          </button>
        </div>
      </section>
    </div>
  );
}

function DeclineStopModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[460px] rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">Decline stop request?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          The route will stay unchanged.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            onPointerDown={(event) => {
              event.preventDefault();
              onCancel();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              onCancel();
            }}
            className="min-h-12 rounded-full border border-[var(--rp-border)] px-4 text-sm font-black text-[var(--rp-muted-strong)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            onPointerDown={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className="min-h-12 rounded-full border border-rose-300/35 bg-rose-400/12 px-4 text-sm font-black text-white"
          >
            Decline request
          </button>
        </div>
      </section>
    </div>
  );
}

function WithdrawStopModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[460px] rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">Withdraw stop request?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          The route will stay unchanged.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-full border border-[var(--rp-border)] px-4 text-sm font-black text-[var(--rp-muted-strong)]"
          >
            Keep request
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-4 text-sm font-black text-white"
          >
            Withdraw request
          </button>
        </div>
      </section>
    </div>
  );
}

function PrimaryCta({
  children,
  href,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] text-base font-black",
    disabled
      ? "border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]"
      : "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)]",
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--rp-border)] py-2.5 last:border-b-0">
      <dt className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</dt>
      <dd className="max-w-[64%] whitespace-pre-line text-right text-sm font-black text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

function airportBadgeLabel(ride: HomeRide) {
  if (ride.airportDirection === "to_airport") return "To airport";
  if (ride.airportDirection === "from_airport") return "From airport";
  return null;
}

export function LockSeatConfirmationModal({
  ride,
  seatsUsed,
  checked,
  luggage,
  waiverSource = "none",
  plusWaiversRemaining,
  plusWaiversTotal,
  onCheckedChange,
  onLuggageChange,
  onCancel,
  onConfirm,
}: {
  ride: HomeRide;
  seatsUsed: number;
  checked: boolean;
  luggage: LuggageContribution;
  waiverSource?: JoinFeeWaiverSource;
  plusWaiversRemaining?: number;
  plusWaiversTotal?: number;
  onCheckedChange: (checked: boolean) => void;
  onLuggageChange: (luggage: LuggageContribution) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const badge = airportBadgeLabel(ride);
  const baseLuggageCount = getBaseLuggageCount(ride.luggage);
  const baseHasLargeLuggage = getBaseHasLargeLuggage(ride.luggage);
  const totalLuggageCount = baseLuggageCount + luggage.bagsCount;
  const totalHasLargeLuggage = baseHasLargeLuggage || luggage.hasLargeLuggage;
  const exceedsCapacity = totalLuggageCount > getTaxiMaxBags(ride.taxiType);
  const stopRequestsAllowed = isHostApprovedStopPolicy(ride.stopRequestPolicy);
  const existingStopRequest = getNormalizedRouteRequests(ride).all.length > 0;
  const canAddStopRequest = stopRequestsAllowed && !existingStopRequest;
  const [stopRequestLocation, setStopRequestLocation] = useState("");
  const [stopRequestAdded, setStopRequestAdded] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.72)] px-3 py-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="flex max-h-[calc(100dvh-32px)] w-full max-w-[460px] flex-col overflow-hidden rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <div className="overflow-y-auto p-4 pb-3 min-[390px]:p-5 min-[390px]:pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-2xl font-black leading-tight">
                Lock your seat?
              </h2>
            </div>
            {badge ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/15 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-300">
                <Plane className="h-3.5 w-3.5" />
                {badge}
              </span>
            ) : null}
          </div>

          <dl className="mt-4 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <SummaryRow label="Route" value={`${ride.fromLabel} \u2192 ${ride.toLabel}`} />
            <SummaryRow label="Date/time" value={`${ride.dateLabel} \u00b7 ${ride.timeLabel}`} />
            <SummaryRow label="Estimated share" value={`HK$${ride.pricePerPerson} per person`} />
            <SummaryRow label="Seats" value={`${seatsUsed} / ${ride.seatsTotal} seats filled`} />
            <SummaryRow
              label="RidePod fee"
              value={
                waiverSource === "launch"
                  ? "HK$5 waiver applies after quote"
                  : waiverSource === "plus"
                    ? "Plus waiver applies after quote"
                    : "Calculated after quote"
              }
            />
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              {waiverSource === "launch"
                ? "HK$5 waiver applied to RidePod fee. Taxi partner quote is separate."
                : waiverSource === "plus"
                  ? `Plus waiver applied to RidePod fee. Taxi partner quote is separate.${plusWaiversRemaining !== undefined && plusWaiversTotal !== undefined ? ` ${plusWaiversRemaining} / ${plusWaiversTotal} monthly waivers remaining before this join.` : ""}`
                  : "RidePod fee is calculated from the accepted taxi partner quote. Taxi partner quote is separate."}
            </p>
          </dl>

          <section className="mt-4 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <div>
              <p className="text-sm font-black text-[var(--rp-text)]">Your luggage</p>
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Tell the group what you&rsquo;re bringing so the taxi partner can quote accurately.
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-[15px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
              <span>
                <span className="block text-sm font-black text-[var(--rp-text)]">Bags</span>
                <span className="block text-xs font-semibold text-[var(--rp-muted-strong)]">Your luggage is added to the pod summary.</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease bags"
                  disabled={luggage.bagsCount <= 0}
                  onClick={() => {
                    const nextBagsCount = Math.max(0, luggage.bagsCount - 1);
                    onLuggageChange({
                      bagsCount: nextBagsCount,
                      hasLargeLuggage: nextBagsCount > 0 && luggage.hasLargeLuggage,
                    });
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-lg font-black text-[var(--rp-primary)] disabled:opacity-40"
                >
                  -
                </button>
                <span className="grid h-9 min-w-10 place-items-center rounded-full bg-[var(--rp-shell)] px-3 text-base font-black text-[var(--rp-text)]">
                  {luggage.bagsCount}
                </span>
                <button
                  type="button"
                  aria-label="Increase bags"
                  disabled={luggage.bagsCount >= maxJoinerBags}
                  onClick={() => onLuggageChange({ ...luggage, bagsCount: Math.min(maxJoinerBags, luggage.bagsCount + 1) })}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-lg font-black text-[var(--rp-primary)] disabled:opacity-40"
                >
                  +
                </button>
              </span>
            </div>

            <label className="mt-3 flex items-center justify-between gap-3 rounded-[15px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
              <span>
                <span className="block text-sm font-black text-[var(--rp-text)]">Large luggage</span>
                <span className="block text-xs font-semibold text-[var(--rp-muted-strong)]">Suitcase or bulky item.</span>
              </span>
              <input
              type="checkbox"
              disabled={luggage.bagsCount <= 0}
              checked={luggage.bagsCount > 0 && luggage.hasLargeLuggage}
              onChange={(event) => onLuggageChange({ ...luggage, hasLargeLuggage: event.target.checked })}
              className="h-5 w-5 shrink-0 accent-[var(--rp-primary)] disabled:opacity-40"
            />
          </label>

            <p className="mt-3 text-xs font-black text-[var(--rp-primary)]">
              Group luggage: {formatGroupLuggageLabel(totalLuggageCount, totalHasLargeLuggage)}
            </p>
            {badge ? (
              <p className="mt-2 text-xs font-bold leading-5 text-blue-100">
                Airport luggage space is included in the taxi partner quote.
              </p>
            ) : null}
            {ride.quoteStatus === "quote_ready" ? (
              <p className="mt-2 rounded-[12px] border border-amber-300/25 bg-amber-400/10 p-2 text-xs font-bold leading-5 text-amber-100">
                Changing luggage may require the organizer to request a new quote.
              </p>
            ) : null}
            {exceedsCapacity ? (
              <p className="mt-2 rounded-[12px] border border-amber-300/25 bg-amber-400/10 p-2 text-xs font-bold leading-5 text-amber-100">
                This taxi may not fit the group luggage. Taxi type and luggage capacity depend on taxi partner availability.
              </p>
            ) : null}
          </section>

          <section
            className={cn(
              "mt-4 rounded-[16px] border p-3",
              canAddStopRequest
                ? "border-[color-mix(in_srgb,var(--rp-primary)_46%,var(--rp-border))] bg-[rgba(242,193,91,0.08)]"
                : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] opacity-70",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border",
                  canAddStopRequest
                    ? "border-[var(--rp-primary)] text-[var(--rp-primary)]"
                    : "border-[var(--rp-border-strong)] text-[var(--rp-muted)]",
                )}
              >
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-black", canAddStopRequest ? "text-[var(--rp-primary)]" : "text-[var(--rp-muted-strong)]")}>
                  Extra stop request
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                  {canAddStopRequest
                    ? "Add one stop for the host to review before it affects the route."
                    : existingStopRequest
                      ? "Only one extra stop is supported for this pod."
                      : "Direct route only. Extra stop requests are not available."}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <input
                type="text"
                value={stopRequestLocation}
                disabled={!canAddStopRequest || stopRequestAdded}
                onChange={(event) => {
                  setStopRequestLocation(event.target.value);
                  setStopRequestAdded(false);
                }}
                placeholder={canAddStopRequest ? "e.g. Admiralty Station Exit A" : "Extra stops are off"}
                className={cn(
                  "min-h-11 rounded-[14px] border px-3 text-sm font-semibold outline-none",
                  canAddStopRequest && !stopRequestAdded
                    ? "border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] text-[var(--rp-text)] placeholder:text-[var(--rp-muted)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
                )}
              />
              <button
                type="button"
                disabled={!canAddStopRequest || stopRequestAdded || stopRequestLocation.trim().length === 0}
                onClick={() => setStopRequestAdded(true)}
                className={cn(
                  "min-h-10 rounded-[14px] border px-3 text-sm font-black transition",
                  canAddStopRequest && !stopRequestAdded
                    ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)] hover:bg-[color-mix(in_srgb,var(--rp-primary)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
                )}
              >
                {stopRequestAdded ? "Stop request added" : "Add stop request"}
              </button>
            </div>

            {stopRequestAdded ? (
              <div className="mt-2 rounded-[12px] border border-[color-mix(in_srgb,var(--rp-primary)_38%,var(--rp-border))] bg-[rgba(242,193,91,0.08)] p-2 text-xs font-bold leading-5">
                <p className="text-[var(--rp-text)]">Requested stop: {stopRequestLocation.trim()}</p>
                <p className="mt-1 text-[var(--rp-primary)]">
                  Host must approve before the route or taxi partner quote changes.
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_94%,transparent)] p-3 backdrop-blur-xl min-[390px]:p-4">
          <label className="flex items-start gap-3 rounded-[15px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onCheckedChange(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
            />
            <span className="text-sm font-black leading-5 text-[var(--rp-text)]">
              I understand no live payment is charged now and Final share appears after the taxi partner quote.
            </span>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
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
                ? "border-[var(--rp-primary)] bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] text-[#07111a] shadow-[0_12px_28px_rgba(242,193,91,0.24)] hover:brightness-105"
                : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
            )}
          >
            Lock my seat
          </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function getQuoteAcceptanceRows(ride: HomeRide, joinView: PodDetailJoinView, acceptedGuestCount: number) {
  const currentUserAccepted = joinView === "quote_accepted" || ride.currentUserQuoteAccepted === true;
  const baseRows = [
    { name: ride.hostName || "Ken", role: "Host", currentUser: false },
    { name: "Amy", role: undefined, currentUser: false },
    { name: "You", role: undefined, currentUser: true },
    { name: "Marco", role: undefined, currentUser: false },
  ];
  let acceptedSlots = Math.max(0, acceptedGuestCount - (currentUserAccepted ? 1 : 0));

  return baseRows.map((row) => {
    const accepted = row.currentUser ? currentUserAccepted : acceptedSlots > 0;
    if (!row.currentUser && acceptedSlots > 0) acceptedSlots -= 1;

    return {
      ...row,
      status: accepted ? "accepted" : "pending",
    };
  });
}

export function QuoteProvidedCard({
  ride,
  joinView,
  acceptedGuestCount,
  requiredGuestCount,
  onAcceptQuote,
  onDeclineQuote,
}: {
  ride: HomeRide;
  joinView: PodDetailJoinView;
  acceptedGuestCount: number;
  requiredGuestCount: number;
  onAcceptQuote: () => void;
  onDeclineQuote: () => void;
}) {
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const quoteViews = ["quote_ready", "quote_deadline_soon", "late_confirmation", "quote_expired", "too_late_to_confirm", "quote_accepted", "all_accepted", "quote_declined"];
  if (!quoteViews.includes(joinView)) return null;

  const totalQuote = formatHkdCents(ride.quoteAmountCents ?? getPodDetailQuoteMoney(ride)?.quoteAmountCents ?? 0);
  const expiresIn = getQuoteExpiresInLabel(ride);
  const partnerName = ride.taxiPartnerName ?? "Golden Taxi Partner";
  const acceptanceRows = getQuoteAcceptanceRows(ride, joinView, acceptedGuestCount);
  const acceptedByCount = Math.min(
    Math.max(acceptanceRows.filter((row) => row.status === "accepted").length, ride.acceptedGuestCount ?? 0),
    requiredGuestCount,
  );
  const quoteActionView = ["quote_ready", "quote_deadline_soon", "late_confirmation"].includes(joinView);
  const expiredView = joinView === "quote_expired" || joinView === "too_late_to_confirm";
  const acceptedView = joinView === "quote_accepted";
  const declinedView = joinView === "quote_declined";
  const allAcceptedView = joinView === "all_accepted";
  const updatedQuoteView = Boolean(ride.quoteUpdatedAfterRouteChange && quoteActionView);
  const title = declinedView
    ? "Quote declined"
    : allAcceptedView
      ? "All riders accepted"
      : expiredView
        ? joinView === "quote_expired" ? "Quote expired" : "Too late to confirm"
        : acceptedView
          ? "Quote accepted"
          : updatedQuoteView
            ? "Updated quote ready"
            : "Quote ready";
  const body = declinedView
    ? "The organizer may request another quote."
    : allAcceptedView
      ? "The selected taxi quote is accepted. Taxi partner can accept the job in demo state."
      : expiredView
        ? joinView === "quote_expired"
          ? "Not all riders accepted before the deadline. No live money was charged."
          : "This quote arrived too close to pickup. Request another quote or choose a new time."
        : acceptedView
          ? "Waiting for other riders to accept the selected taxi quote."
          : updatedQuoteView
            ? "Taxi partner updated the quote for the approved route."
            : "Taxi partner submitted a shared quote. All joined riders must accept before the ride proceeds.";

  function closeQuoteModal() {
    setShowQuoteModal(false);
    setUnderstood(false);
  }

  function confirmAcceptQuote() {
    if (!understood) return;
    onAcceptQuote();
    closeQuoteModal();
  }

  function confirmDeclineQuote() {
    onDeclineQuote();
    setShowDeclineModal(false);
    closeQuoteModal();
  }

  return (
    <section className="rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(145deg,rgba(14,165,233,0.08),rgba(242,193,91,0.05)),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="grid gap-4">
        <div className="grid gap-4 min-[430px]:grid-cols-[1fr_154px]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-300/35 bg-emerald-400/10 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">{title}</p>
            </div>
            <p className="mt-5 text-xs font-black text-[var(--rp-muted-strong)]">Total quote</p>
            <p className="mt-1 text-[38px] font-black leading-none text-[var(--rp-primary)]">{totalQuote}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{body}</p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
            <div className="flex items-center gap-2 text-[var(--rp-primary)]">
              <Clock3 className="h-5 w-5" />
              <p className="text-sm font-semibold text-[var(--rp-text)]">Quote expires in</p>
            </div>
            <p className="mt-2 text-2xl font-black text-[var(--rp-primary)]">{expiresIn}</p>
            <p className="mt-4 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
              Riders who accept keep their spot. Anyone still pending at the deadline may be treated as out of the pod, and the host may need a refreshed quote.
            </p>
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[rgba(242,193,91,0.1)] text-[var(--rp-primary)]">
                <CarFront className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-lg font-black text-[var(--rp-text)]">{partnerName}</p>
                <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--rp-muted-strong)]">
                  <Star className="h-4 w-4 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
                  4.8 rating
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">Usually responds in 8 min</p>
              </div>
            </div>
            <button
              type="button"
              className="min-h-10 shrink-0 rounded-[14px] border border-[var(--rp-border-strong)] px-4 text-sm font-black text-[var(--rp-primary)]"
            >
              View details
            </button>
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--rp-muted-strong)]">
            Accepted by {acceptedByCount} of {requiredGuestCount} riders
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 min-[430px]:grid-cols-4">
            {acceptanceRows.map((row) => {
              const accepted = row.status === "accepted";
              const initial = row.currentUser ? "You" : row.name.slice(0, 1).toUpperCase();
              return (
                <div key={row.name} className="relative min-w-0 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-center">
                  <span className={cn("mx-auto grid h-11 w-11 place-items-center rounded-full text-sm font-black", row.currentUser ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)]" : "bg-sky-100 text-sky-950")}>
                    {initial}
                  </span>
                  <span className={cn("absolute right-3 top-10 grid h-6 w-6 place-items-center rounded-full", accepted ? "bg-emerald-500 text-white" : "bg-[var(--rp-card)] text-[var(--rp-muted-strong)]")}>
                    {accepted ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                  </span>
                  <p className="mt-3 truncate text-sm font-black text-[var(--rp-text)]">{row.name}</p>
                  {row.role ? <p className="mt-0.5 text-xs font-black text-[var(--rp-primary)]">{row.role}</p> : null}
                  <p className={cn("mt-0.5 text-xs font-black", accepted ? "text-emerald-300" : "text-[var(--rp-primary)]")}>
                    {accepted ? "Accepted" : "Pending"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {quoteActionView ? (
          <div className="grid gap-3 min-[430px]:grid-cols-2">
            <button
              type="button"
              onClick={() => setShowDeclineModal(true)}
              className="min-h-16 rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-center text-base font-black text-white transition hover:bg-[var(--rp-card-muted)]"
            >
              Decline quote
              <span className="mt-1 block text-xs font-semibold text-[var(--rp-muted-strong)]">The quote will expire</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuoteModal(true)}
              className="min-h-16 rounded-[18px] border border-[var(--rp-primary)] bg-[linear-gradient(180deg,#ffd76f_0%,#f2b83a_100%)] px-4 text-center text-base font-black text-[#07111a] shadow-[0_16px_34px_rgba(242,193,91,0.24)] transition hover:brightness-105"
            >
              {updatedQuoteView ? "Review quote" : "Accept quote"}
              <span className="mt-1 block text-xs font-black text-[#332103]">All required riders must accept</span>
            </button>
          </div>
        ) : acceptedView ? (
          <button
            type="button"
            disabled
            className="min-h-14 rounded-[18px] border border-emerald-300/25 bg-emerald-400/10 px-4 text-center text-base font-black text-emerald-200"
          >
            Quote accepted
            <span className="mt-1 block text-xs font-semibold text-emerald-100">Waiting for other riders to accept.</span>
          </button>
        ) : (
          <Link
            href={`/pods/${ride.id}/chat`}
            className="flex min-h-12 items-center justify-center rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-primary)]"
          >
            View updates
          </Link>
        )}
      </div>

      {showQuoteModal && quoteActionView ? (
        <QuoteReviewModal
          ride={ride}
          acceptedGuestCount={acceptedGuestCount}
          requiredGuestCount={requiredGuestCount}
          checked={understood}
          onCheckedChange={setUnderstood}
          onCancel={closeQuoteModal}
          onConfirm={confirmAcceptQuote}
          onDeclineRequest={() => setShowDeclineModal(true)}
        />
      ) : null}

      {showDeclineModal ? (
        <DeclineQuoteModal
          onCancel={() => setShowDeclineModal(false)}
          onConfirm={confirmDeclineQuote}
        />
      ) : null}
    </section>
  );
}

export function QuoteReadySummary({
  ride,
  joinView,
  acceptedGuestCount,
  requiredGuestCount,
}: {
  ride: HomeRide;
  joinView: PodDetailJoinView;
  acceptedGuestCount: number;
  requiredGuestCount: number;
}) {
  if (!["quote_ready", "quote_deadline_soon", "quote_expired", "late_confirmation", "too_late_to_confirm", "quote_accepted", "all_accepted", "quote_declined", "ready_for_pickup", "partner_arrived", "at_pickup", "ride_started"].includes(joinView)) {
    return null;
  }
  const pickupView = isActivePickupView(joinView);
  const money = getPodDetailQuoteMoney(ride);
  const deadlineInfo = getQuoteDeadlineInfo(ride, acceptedGuestCount, requiredGuestCount, pickupView);
  const blocked = isQuoteAcceptanceBlocked(deadlineInfo);
  const updatedQuoteReady = Boolean(ride.quoteUpdatedAfterRouteChange && ["quote_ready", "quote_deadline_soon", "late_confirmation"].includes(joinView));

  return (
    <div className="mt-4 grid gap-3">
      {updatedQuoteReady ? (
        <div className="rounded-[16px] border border-[var(--rp-border-strong)] bg-[rgba(242,193,91,0.1)] p-3">
          <p className="text-sm font-black text-[var(--rp-primary)]">Updated quote ready</p>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            Taxi partner updated the quote for the approved route.
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            Guests must accept the updated quote before the ride proceeds.
          </p>
        </div>
      ) : null}
      {ride.quoteAboveCap ? (
        <div className="rounded-[16px] border border-amber-300/30 bg-amber-400/12 p-3">
          <p className="text-sm font-black text-amber-200">Quote above fare cap</p>
          <p className="mt-1 text-xs font-bold leading-5 text-amber-100">
            This quote is above the original fare cap. Accept only if you agree to the higher amount.
          </p>
        </div>
      ) : null}
      {pickupView ? (
        <div className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <p className="text-sm font-black text-[var(--rp-text)]">All guests accepted</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
            All required guests accepted the selected taxi quote.
          </p>
          {money ? (
            <dl className="mt-3">
              <SummaryRow label="Your total" value={formatHkdCents(money.guestChargeCents)} />
              <SummaryRow label="Taxi partner quote" value={formatHkdCents(money.quoteAmountCents)} />
              <SummaryRow label="RidePod fee" value={formatHkdCents(money.platformFeeCents)} />
            </dl>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-[16px] border p-4",
            blocked
              ? "border-[var(--rp-border)] bg-[var(--rp-card-muted)] opacity-90"
              : deadlineInfo.state === "quote_deadline_soon" || deadlineInfo.state === "late_confirmation"
                ? "border-amber-300/25 bg-amber-400/10"
                : "border-[var(--rp-border)] bg-[var(--rp-card-soft)]",
          )}
        >
          {money ? (
            <dl>
              <SummaryRow label="Your total" value={formatHkdCents(money.guestChargeCents)} />
              <SummaryRow label="RidePod fee" value={formatHkdCents(money.platformFeeCents)} />
              <SummaryRow label="Accept by" value={deadlineInfo.acceptByLabel} />
              {deadlineInfo.timeLeftLabel ? <SummaryRow label="Time left" value={deadlineInfo.timeLeftLabel} /> : null}
            </dl>
          ) : null}
          {deadlineInfo.state === "quote_expired" ? (
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              The organizer may request another taxi partner quote.
            </p>
          ) : null}
          {deadlineInfo.state === "too_late_to_confirm" ? (
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              This quote can no longer be accepted before the hard cutoff.
            </p>
          ) : null}
          {deadlineInfo.state === "late_confirmation" ? (
            <p className="mt-2 text-xs font-bold leading-5 text-amber-100">
              No live money is charged in beta.
            </p>
          ) : null}
        </div>
      )}
      <div className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
          Quote acceptance
        </p>
        <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">
          {acceptedGuestCount} / {requiredGuestCount} guests accepted
        </p>
        {!pickupView && deadlineInfo.acceptBy ? (
          <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            Accept by {deadlineInfo.acceptByLabel}
          </p>
        ) : null}
      </div>
      {ride.airportDirection ? (
        <p className="rounded-[14px] border border-blue-300/15 bg-blue-400/10 p-3 text-sm font-semibold leading-6 text-blue-100">
          Airport tolls and luggage space are included in the quote.
        </p>
      ) : null}
    </div>
  );
}

export function QuoteStatusPanelContent({
  ride,
  joinView,
  title,
  text,
  acceptedGuestCount,
  requiredGuestCount,
  recurringNote,
}: {
  ride: HomeRide;
  joinView: PodDetailJoinView;
  title: string;
  text: string;
  acceptedGuestCount: number;
  requiredGuestCount: number;
  recurringNote?: string;
}) {
  const waitingForQuote = joinView === "quote_pending" || joinView === "joined";
  const selfSettle = isRideAppSelfSettlePod(ride);
  const progressSteps = selfSettle ? ["Join", "Details", "Confirm"] : quoteProgressSteps;

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)] shadow-[0_0_22px_color-mix(in_srgb,var(--rp-primary)_14%,transparent)]">
          <Clock3 className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
              {selfSettle ? "Ride detail status" : "Quote status"}
            </p>
            {waitingForQuote ? (
              <span className="rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-2.5 py-1 text-[11px] font-black text-[var(--rp-primary)]">
                {selfSettle ? "Details pending" : "Fare pending"}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 text-xl font-black leading-tight text-[var(--rp-text)]">{title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{text}</p>
        </div>
      </div>

      {waitingForQuote ? (
        <div className="grid gap-3">
          <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 px-1">
            {progressSteps.map((step, index) => (
              <Fragment key={step}>
                {index > 0 ? <span className="h-px bg-[var(--rp-border-strong)]" /> : null}
                <span className="grid min-w-0 justify-items-center gap-1 text-center">
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full border text-xs font-black",
                      index === 1
                        ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]"
                        : "border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[11px] font-black leading-4 text-[var(--rp-muted-strong)]">{step}</span>
                </span>
              </Fragment>
            ))}
          </div>
          <p className="flex items-start gap-2 rounded-[14px] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] px-3 py-2 text-xs font-bold leading-5 text-[var(--rp-text)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
            {selfSettle
              ? "Ride fare is handled outside RidePod. Riders confirm current details before chat opens."
              : "Final share appears when the taxi partner quote is ready and guests accept it."}
          </p>
        </div>
      ) : null}

      {recurringNote ? (
        <p className="rounded-[14px] bg-[var(--rp-card-muted)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          {recurringNote}
        </p>
      ) : null}

      <QuoteReadySummary
        ride={ride}
        joinView={joinView}
        acceptedGuestCount={acceptedGuestCount}
        requiredGuestCount={requiredGuestCount}
      />
    </div>
  );
}

export function PodHeroJoinButton({
  ride,
  joinView,
  onJoin,
  onLeaveSelfSettle,
  onLeaveTaxiPod,
}: {
  ride?: HomeRide;
  joinView: PodDetailJoinView;
  onJoin: () => void;
  onLeaveSelfSettle?: () => void;
  onLeaveTaxiPod?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  function handleJoin() {
    const selfSettle = ride ? getCurrentUserCanJoinSelfSettlePod(ride, joinView) : false;

    if (selfSettle) {
      onJoin();
      return;
    }

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    onJoin();
  }

  if (joinView === "quote_pending") {
    const selfSettle = ride ? getCurrentUserCanJoinSelfSettlePod(ride, joinView) : false;

    return (
      <button
        type="button"
        onClick={handleJoin}
        className={cn(
          "mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-black text-[#07111a] transition hover:brightness-105",
          selfSettle
            ? "bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] shadow-[0_10px_24px_rgba(56,189,248,0.24)]"
            : "bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] shadow-[0_10px_24px_rgba(242,193,91,0.28)]",
        )}
      >
        {selfSettle ? <Smartphone className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        Join pod
      </button>
    );
  }

  if (joinView === "joined") {
    const showLeavePod = ride
      ? !getCurrentUserIsHost(ride) && (getCurrentUserIsJoinedSelfSettlePod(ride, joinView) || !isRideAppSelfSettlePod(ride))
      : false;
    const handleLeavePod = ride && isRideAppSelfSettlePod(ride) ? onLeaveSelfSettle : onLeaveTaxiPod;

    return (
      <div className="mt-3 grid w-full gap-2">
        <button
          type="button"
          disabled
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-3 text-sm font-black text-[var(--rp-primary)]"
        >
          <CheckCircle2 className="h-4 w-4" />
          Joined
        </button>
        {showLeavePod ? (
          <button
            type="button"
            onClick={handleLeavePod}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-[14px] border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-card-muted)_88%,transparent)] px-3 text-sm font-black text-[var(--rp-primary)] transition hover:border-[var(--rp-primary)] hover:bg-[color-mix(in_srgb,var(--rp-primary)_12%,var(--rp-card-muted))]"
          >
            Leave pod
          </button>
        ) : null}
      </div>
    );
  }

  if (joinView === "full") {
    return (
      <button
        type="button"
        disabled
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-[14px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-3 text-sm font-black text-[var(--rp-muted-strong)]"
      >
        Full
      </button>
    );
  }

  return null;
}

export function PodDetailSetupBadges({ ride }: { ride: HomeRide }) {
  const selfSettle = isRideAppSelfSettlePod(ride);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span
        className={cn(
          "inline-flex min-h-8 items-center gap-1.5 rounded-full border bg-black/26 px-3 py-1 text-xs font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-md",
          selfSettle ? "border-cyan-200/28" : "border-white/14",
        )}
      >
        {ride.podType === "Open pod" ? (
          <UsersRound className={cn("h-3.5 w-3.5", selfSettle ? "text-cyan-200" : "text-[var(--rp-primary)]")} />
        ) : (
          <ShieldCheck className={cn("h-3.5 w-3.5", selfSettle ? "text-cyan-200" : "text-[var(--rp-primary)]")} />
        )}
        {ride.podType}
      </span>
      {!selfSettle ? (
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/14 bg-black/26 px-3 py-1 text-xs font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-md">
          <CarFront className="h-3.5 w-3.5 text-[var(--rp-primary)]" />
          {ride.taxiType}
        </span>
      ) : null}
    </div>
  );
}

function SelfSettleBookingDetailRow({ label, value }: { label: string; value: string }) {
  const warning = label === "Gather point" && value === "Not set";

  return (
    <div className="flex items-start justify-between gap-4 border-b border-blue-300/15 py-3 last:border-b-0">
      <span className={cn("text-sm font-bold", warning ? "text-amber-100" : "text-[var(--rp-muted-strong)]")}>{label}</span>
      <span className={cn("max-w-[58%] text-right text-sm font-black", warning ? "text-amber-100" : "text-[var(--rp-text)]")}>{value}</span>
    </div>
  );
}

function formatSelfSettleConfirmedTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatSelfSettleConfirmBy(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSelfSettleTimeLeft(date: Date) {
  const totalMinutes = Math.max(0, Math.ceil((date.getTime() - Date.now()) / (60 * 1000)));
  if (totalMinutes <= 0) return "Expired";
  if (totalMinutes < 60) return `${totalMinutes}m to confirm`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m to confirm` : `${hours}h to confirm`;
}

function SelfSettleRiderBookingConfirmationModal({
  summaryRows,
  screenshotName,
  detailsComplete,
  needsReview,
  feeLabel,
  feeHelper,
  checked,
  onCheckedChange,
  onCancel,
  onConfirm,
}: {
  summaryRows: string[][];
  screenshotName?: string | null;
  detailsComplete: boolean;
  needsReview: boolean;
  feeLabel: string;
  feeHelper: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const checklistItems = [
    "I know where to gather before the host books.",
    "I understand the estimated fare may change.",
    "I understand the split method and payment method.",
    "I understand the ride fare is paid outside RidePod.",
    "I understand RidePod does not verify the ride app fare.",
    ...(screenshotName ? ["I understand screenshots are optional and not verified by RidePod."] : []),
  ];
  const title = detailsComplete ? (needsReview ? "Review updated details?" : "Confirm ride details?") : "Waiting for host details";
  const body = detailsComplete
    ? needsReview
      ? "Host updated the booking details. Review the latest details before confirming again."
      : "Review the host's gather point, drop-off, fare estimate, split method, and payment method before confirming."
    : "Host must set the gather point before riders can confirm.";
  const confirmLabel = needsReview ? "Confirm updated details" : "Confirm ride details";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <div className="overflow-y-auto p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-100">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <h2 id={titleId} className="text-2xl font-black leading-tight">
                {title}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {body}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                The ride app booking and fare split are handled directly by pod members.
              </p>
            </div>
          </div>

          <dl className="mt-5 rounded-[18px] border border-blue-300/15 bg-[rgba(2,6,23,0.34)] px-4">
            {summaryRows.map(([label, value]) => (
              <SelfSettleBookingDetailRow key={label} label={label} value={value} />
            ))}
          </dl>
          <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            Estimated fare may change. RidePod does not verify the ride app fare.
          </p>

          <section className="mt-4 rounded-[16px] border border-blue-300/20 bg-blue-400/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.1em] text-blue-100">RidePod fee</p>
                <p className="mt-1 text-sm font-black text-[var(--rp-text)]">{feeLabel}</p>
              </div>
              <WalletCards className="h-5 w-5 shrink-0 text-blue-100" />
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">{feeHelper}</p>
          </section>

          <section className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted-strong)]">Fare estimate screenshot</p>
                <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
                  {screenshotName ? "Screenshot added by host" : "Not provided"}
                </p>
                {screenshotName ? (
                  <p className="mt-1 break-words text-xs font-bold text-blue-100">{screenshotName}</p>
                ) : null}
              </div>
              <Info className="h-5 w-5 shrink-0 text-blue-100" />
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              RidePod does not verify ride app screenshots. Do not upload screenshots showing phone numbers, payment details, or private account info.
            </p>
          </section>

          <ul className="mt-5 grid gap-2 rounded-[18px] border border-blue-300/20 bg-blue-400/10 p-4">
            {checklistItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onCheckedChange(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
            />
            <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
              I understand and confirm these ride details.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!checked || !detailsComplete}
            onClick={onConfirm}
            className={cn(
              "min-h-12 rounded-2xl border text-sm font-black transition",
              checked && detailsComplete
                ? "border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)] hover:bg-[var(--rp-card-muted)]"
                : "cursor-not-allowed border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
            )}
          >
            {detailsComplete ? confirmLabel : "View pod status"}
          </button>
        </div>
      </section>
    </div>
  );
}

type SelfSettleRiderConfirmation = {
  name: string;
  role: "host" | "rider";
  status: "host" | "joined_interest" | "confirmed" | "pending" | "needs_review" | "seat_hold_expired" | "expired" | "left";
  isCurrentUser?: boolean;
  confirmedDetailVersion?: number;
  confirmedBookingDetailsVersion?: number;
  confirmBy?: string | null;
  seatHoldExpiredAt?: string | null;
};

function buildSelfSettleRiderConfirmations(ride: HomeRide): SelfSettleRiderConfirmation[] {
  if (ride.riderConfirmations?.length) return ride.riderConfirmations;

  const currentUserName = getCurrentUserName(ride);
  const currentUserAlreadyListed = ride.joinedRiders.some((name) => namesMatch(name, currentUserName) || name.trim().toLowerCase() === "you");
  const riderNames =
    ride.currentUserRole === "joined_rider" && ride.currentUserJoined === true && !currentUserAlreadyListed
      ? [...ride.joinedRiders, currentUserName]
      : ride.joinedRiders;

  return [
    {
      name: ride.hostName,
      role: "host",
      status: "host",
    },
    ...riderNames.map((name, index) => {
      const isCurrentUser =
        name.trim().toLowerCase() === "you" ||
        namesMatch(name, currentUserName) ||
        (ride.currentUserRole === "joined_rider" && ride.currentUserJoined === true && index === riderNames.length - 1);

      const status: SelfSettleRiderConfirmation["status"] = isCurrentUser
        ? ride.selfSettleConfirmationStatus === "expired"
          ? "expired"
          : ride.selfSettleConfirmationStatus === "needs_review"
            ? "needs_review"
            : ride.currentUserBookingDetailsConfirmed === true
          ? "confirmed"
          : "pending"
        : index === 0
          ? "confirmed"
          : "pending";

      return {
        name: isCurrentUser ? "You" : name,
        role: "rider" as const,
        status,
        isCurrentUser,
      };
    }),
  ];
}

function countConfirmedSelfSettleRiders(confirmations: SelfSettleRiderConfirmation[], currentDetailVersion = 1) {
  return confirmations.filter(
    (item) =>
      item.role === "rider" &&
      item.status === "confirmed" &&
      (item.confirmedBookingDetailsVersion ?? item.confirmedDetailVersion ?? currentDetailVersion) >= currentDetailVersion,
  ).length;
}

function countJoinedSelfSettleRiders(confirmations: SelfSettleRiderConfirmation[]) {
  return confirmations.filter(
    (item) => item.role === "rider" && item.status !== "seat_hold_expired" && item.status !== "expired" && item.status !== "left",
  ).length;
}

function SelfSettleRiderConfirmationsCard({
  confirmations,
  confirmedCount,
  joinedCount,
  isHost,
  allConfirmed,
  confirmByLabel,
  confirmTimeLeftLabel,
}: {
  confirmations: SelfSettleRiderConfirmation[];
  confirmedCount: number;
  joinedCount: number;
  isHost: boolean;
  allConfirmed: boolean;
  confirmByLabel: string;
  confirmTimeLeftLabel: string;
}) {
  return (
    <section className="mt-5 rounded-[18px] border border-blue-300/20 bg-[rgba(2,6,23,0.34)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-[var(--rp-text)]">
            {allConfirmed ? "Ready to meet" : "Rider confirmations"}
          </h3>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            {allConfirmed
              ? isHost
                ? "All joined riders confirmed the booking details."
                : "All joined riders confirmed the booking details. Gather at the gather point."
              : isHost
                ? "Riders confirm they reviewed the booking details."
                : `Confirm-by time: ${confirmByLabel}. ${confirmTimeLeftLabel}.`}
          </p>
        </div>
        <span className="rounded-full border border-blue-300/25 bg-blue-400/12 px-3 py-1 text-xs font-black text-blue-100">
          {Math.min(confirmedCount, joinedCount)} / {joinedCount} riders confirmed
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {confirmations.map((item) => {
          const confirmed = item.status === "confirmed";
          const host = item.status === "host";
          const needsReview = item.status === "needs_review";
          const expired = item.status === "expired" || item.status === "seat_hold_expired";

          return (
            <span
              key={`${item.name}-${item.status}-${item.isCurrentUser ? "you" : "member"}`}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-black",
                host && "border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)]",
                confirmed && "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
                needsReview && "border-amber-300/30 bg-amber-400/12 text-amber-100",
                expired && "border-amber-300/30 bg-amber-400/12 text-amber-100",
                !host && !confirmed && !needsReview && !expired && "border-white/10 bg-white/5 text-[var(--rp-muted-strong)]",
              )}
            >
              {host ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : confirmed ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : needsReview ? (
                <Info className="h-3.5 w-3.5" />
              ) : (
                <Clock3 className="h-3.5 w-3.5" />
              )}
              {item.name}
              {host ? <span className="rounded-full bg-[var(--rp-card-soft)] px-2 py-0.5 text-[10px]">Host</span> : null}
              {!host ? <span className="text-[10px]">{confirmed ? "Confirmed" : needsReview ? "Needs review" : expired ? "Seat released" : "Pending"}</span> : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function SelfSettleRiderConfirmationCard({
  summaryRows,
  onConfirm,
  chatHref,
}: {
  summaryRows: string[][];
  onConfirm: () => void;
  chatHref: string;
}) {
  return (
    <section className="mt-5 rounded-[18px] border border-blue-300/25 bg-blue-400/10 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-300/30 bg-blue-400/12 text-blue-100">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-black text-[var(--rp-text)]">Confirm ride details</h3>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            Host shared the external ride app details. Confirm the current route, fare estimate, split, and payment method.
          </p>
          <p className="mt-2 text-xs font-black leading-5 text-blue-100">
            Ride fare is paid outside RidePod.
          </p>
        </div>
      </div>

      <dl className="mt-4 rounded-[16px] border border-blue-300/15 bg-[rgba(2,6,23,0.34)] px-4">
        {summaryRows
          .filter(([, value]) => value.trim().length > 0)
          .filter(([label]) => label !== "Ride app")
          .map(([label, value]) => (
            <SelfSettleBookingDetailRow key={label} label={label} value={value} />
          ))}
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
        >
          Confirm ride details
        </button>
        <Link
          href={chatHref}
          className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-soft)] hover:text-[var(--rp-text)]"
        >
          Open chat
        </Link>
      </div>
    </section>
  );
}

function SelfSettleRatingPrompt({
  ride,
  isHost,
  currentUserId,
}: {
  ride: HomeRide;
  isHost: boolean;
  currentUserId: string;
}) {
  const [skipped, setSkipped] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(5);
  const [targetRider, setTargetRider] = useState(ride.joinedRiders[0] ?? "Joined rider");
  const [didShowUp, setDidShowUp] = useState<boolean | null>(true);
  const [wasOnTime, setWasOnTime] = useState<boolean | null>(true);
  const [paymentSmooth, setPaymentSmooth] = useState<boolean | null>(true);
  const [bookingClear, setBookingClear] = useState<boolean | null>(true);
  const [fareSplitClear, setFareSplitClear] = useState<boolean | null>(true);
  const [paymentFair, setPaymentFair] = useState<boolean | null>(true);
  const [wouldRideAgain, setWouldRideAgain] = useState<boolean | null>(true);
  const targetUserId = isHost
    ? `mock-rider-${targetRider.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "joined-rider"}`
    : getRideAppHostTrustUserId(ride);

  if (submitted) {
    return (
      <div className="mt-5 rounded-[18px] border border-emerald-300/25 bg-emerald-400/10 p-4">
        <p className="text-sm font-black text-emerald-100">Thanks - your feedback helps keep self-settle pods reliable.</p>
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="mt-5 rounded-[18px] border border-blue-300/20 bg-blue-400/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-blue-100">Rating pending</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              You can rate later from this pod. Ratings help show host and rider reliability.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSkipped(false)}
            className="shrink-0 rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-100"
          >
            Rate now
          </button>
        </div>
      </div>
    );
  }

  function submitRating() {
    submitRideAppRating({
      podId: ride.id,
      reviewerUserId: currentUserId,
      reviewedUserId: targetUserId,
      reviewerRole: isHost ? "host" : "rider",
      reviewedRole: isHost ? "rider" : "host",
      rating,
      didShowUp,
      wasOnTime,
      paymentSmooth: isHost ? paymentSmooth : null,
      bookingClear: isHost ? null : bookingClear,
      fareSplitClear: isHost ? null : fareSplitClear,
      paymentFair: isHost ? null : paymentFair,
      wouldRideAgain,
      optionalComment: null,
    });

    createRideAppTrustEvent({
      userId: targetUserId,
      podId: ride.id,
      eventType: didShowUp === false ? (isHost ? "ride_app_rider_no_show" : "ride_app_host_no_show") : "ride_app_completed",
      createdBy: currentUserId,
      metadata: { role: isHost ? "rider" : "host" },
    });
    setSubmitted(true);
  }

  return (
    <section className="mt-5 rounded-[20px] border border-purple-300/25 bg-[linear-gradient(145deg,rgba(59,130,246,0.14),rgba(88,28,135,0.16))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-200">Rating pending</p>
          <h3 className="mt-1 text-lg font-black text-[var(--rp-text)]">{isHost ? "Rate your riders" : "Rate the host"}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Public badges show summary only. Comments and report details stay private.
          </p>
        </div>
        <Star className="h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
      </div>

      {isHost && ride.joinedRiders.length > 1 ? (
        <label className="mt-4 grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Rider</span>
          <select
            value={targetRider}
            onChange={(event) => setTargetRider(event.target.value)}
            className="min-h-11 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-sm font-black text-[var(--rp-text)]"
          >
            {ride.joinedRiders.map((rider) => (
              <option key={rider} value={rider}>
                {rider}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} star rating`}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full border text-sm font-black transition",
              value <= rating
                ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <YesNoRow label={isHost ? "Did this rider show up?" : "Did the host show up?"} value={didShowUp} onChange={setDidShowUp} />
        <YesNoRow label={isHost ? "Was this rider on time?" : "Was the booking clear?"} value={isHost ? wasOnTime : bookingClear} onChange={isHost ? setWasOnTime : setBookingClear} />
        {isHost ? (
          <YesNoRow label="Was payment smooth?" value={paymentSmooth} onChange={setPaymentSmooth} />
        ) : (
          <>
            <YesNoRow label="Was the fare split clear?" value={fareSplitClear} onChange={setFareSplitClear} />
            <YesNoRow label="Was payment/fare handling fair?" value={paymentFair} onChange={setPaymentFair} />
          </>
        )}
        <YesNoRow label={isHost ? "Would you ride with this rider again?" : "Would you ride with this host again?"} value={wouldRideAgain} onChange={setWouldRideAgain} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="min-h-11 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-muted-strong)]"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={submitRating}
          className="min-h-11 rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
        >
          Submit rating
        </button>
      </div>
    </section>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
      <span className="text-sm font-bold text-[var(--rp-text)]">{label}</span>
      <span className="grid grid-cols-2 gap-2">
        {[true, false].map((option) => (
          <button
            key={String(option)}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "min-h-9 rounded-full px-4 text-xs font-black transition",
              value === option
                ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                : "border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]",
            )}
          >
            {option ? "Yes" : "No"}
          </button>
        ))}
      </span>
    </div>
  );
}

export function SelfSettleBookingDetailsCard({
  ride,
  joinView,
  seatsUsed,
}: {
  ride: HomeRide;
  joinView: PodDetailJoinView;
  seatsUsed: number;
}) {
  const { user, profile } = useAuth();
  const [detailsConfirmed, setDetailsConfirmed] = useState(ride.rideAppBookingDetailsConfirmed === true);
  const [confirmedTime, setConfirmedTime] = useState(
    ride.rideAppBookingDetailsConfirmedAt ? formatSelfSettleConfirmedTime(ride.rideAppBookingDetailsConfirmedAt) : "",
  );
  const [confirmedBy, setConfirmedBy] = useState(ride.rideAppBookingDetailsConfirmedBy ?? "");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [isConfirmingDetails, setIsConfirmingDetails] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [riderAcknowledged, setRiderAcknowledged] = useState(
    ride.rideAppAcknowledgements?.some((item) => item.userId === (user?.id ?? "mock-rider")) === true,
  );
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewUnderstood, setReviewUnderstood] = useState(false);
  const [isSavingAcknowledgement, setIsSavingAcknowledgement] = useState(false);
  const [acknowledgementError, setAcknowledgementError] = useState<string | null>(null);
  const [showRiderConfirmRidingModal, setShowRiderConfirmRidingModal] = useState(false);
  const [riderConfirmRidingChecked, setRiderConfirmRidingChecked] = useState(false);
  const [riderConfirmRidingMessage, setRiderConfirmRidingMessage] = useState<string | null>(null);
  const [showRejoinModal, setShowRejoinModal] = useState(false);
  const [rejoinMessage, setRejoinMessage] = useState<string | null>(null);
  const [currentUserBookingDetailsConfirmedState, setCurrentUserBookingDetailsConfirmedState] = useState(
    ride.selfSettleConfirmationStatus !== "needs_review" &&
      ride.selfSettleConfirmationStatus !== "expired" &&
      (ride.currentUserBookingDetailsConfirmed === true || ride.selfSettleConfirmationStatus === "confirmed"),
  );
  const [currentUserConfirmationExpiredState, setCurrentUserConfirmationExpiredState] = useState(ride.currentUserConfirmationExpired === true);
  const [seatHoldExpiredAtState, setSeatHoldExpiredAtState] = useState<string | null>(ride.seatHoldExpiredAt ?? null);
  const [seatHoldReleasedAtState, setSeatHoldReleasedAtState] = useState<string | null>(ride.seatHoldReleasedAt ?? null);
  const [confirmByOverride, setConfirmByOverride] = useState<string | null>(null);
  const [confirmByLabelOverride, setConfirmByLabelOverride] = useState<string | null>(null);
  const [riderConfirmations, setRiderConfirmations] = useState<SelfSettleRiderConfirmation[]>(() =>
    buildSelfSettleRiderConfirmations(ride),
  );
  const initialFareEstimate = ride.rideAppBookingDetails?.estimatedFare ?? formatRideAppEstimatedFarePerPerson(ride);
  const [fareEstimate, setFareEstimate] = useState(initialFareEstimate);
  const [fareEstimateInput, setFareEstimateInput] = useState(initialFareEstimate ?? "");
  const [fareEstimateNote, setFareEstimateNote] = useState(ride.rideAppEstimatedFareNote ?? "");
  const [detailVersion, setDetailVersion] = useState(() => getRideAppCurrentDetailVersion(ride));
  const [fareScreenshotName, setFareScreenshotName] = useState(ride.rideAppFareEstimateScreenshotName ?? "");
  const [fareEstimateScreenshot, setFareEstimateScreenshot] = useState<HomeRide["fareEstimateScreenshot"]>(
    ride.fareEstimateScreenshot ??
      (ride.rideAppFareEstimateScreenshotName
        ? {
            fileName: ride.rideAppFareEstimateScreenshotName,
            previewUrl: "",
            addedAt: ride.rideAppFareEstimateScreenshotAddedAt ?? "",
            note: "",
          }
        : null),
  );
  const [fareEstimateUpdatedAt, setFareEstimateUpdatedAt] = useState<string | null>(ride.rideAppEstimatedFareUpdatedAt ?? null);
  const [bookingDetailsUpdated, setBookingDetailsUpdated] = useState(ride.bookingDetailsUpdated === true);
  const [bookingDetailsLastMeaningfulUpdate, setBookingDetailsLastMeaningfulUpdate] =
    useState<HomeRide["bookingDetailsLastMeaningfulUpdate"]>(ride.bookingDetailsLastMeaningfulUpdate ?? null);
  const [lastBookingDetailsUpdateReason, setLastBookingDetailsUpdateReason] = useState<string | null>(
    ride.lastBookingDetailsUpdateReason ?? null,
  );
  const [currentUserJoinIntentStatus, setCurrentUserJoinIntentStatus] = useState(ride.currentUserJoinIntentStatus ?? (ride.currentUserJoined ? "joined_interest" : "not_joined"));
  const [currentUserConfirmedBookingDetailsVersion, setCurrentUserConfirmedBookingDetailsVersion] = useState<number | null>(
    ride.currentUserConfirmedBookingDetailsVersion ?? ride.currentUserRideAppDetailVersionConfirmed ?? null,
  );
  const [platformFeeStatus, setPlatformFeeStatus] = useState(ride.platformFeeStatus ?? "pending");
  const [rideAppConfirmedRiderCount, setRideAppConfirmedRiderCount] = useState(ride.rideAppConfirmedRiderCount ?? ride.confirmedRiderCount ?? 0);
  const [feeConfirmationMessage, setFeeConfirmationMessage] = useState<string | null>(null);
  const [showFareEstimateModal, setShowFareEstimateModal] = useState(false);
  const [fareEstimateSaving, setFareEstimateSaving] = useState(false);
  const [fareEstimateMessage, setFareEstimateMessage] = useState<string | null>(null);
  const confirmTitleId = useId();
  const reviewTitleId = useId();
  const fareEstimateTitleId = useId();
  const rideAppWaiver = useRideAppWaiverState();
  const membership = useRidePodMembershipState();
  const pricingConfig = useRidePodPricingConfig();

  if (!isRideAppSelfSettlePod(ride)) return null;

  const isHost = getCurrentUserIsHost(ride);
  const isJoinedRider = getCurrentUserIsJoinedSelfSettlePod(ride, joinView);
  const isCurrentUserJoinedRider = ride.currentUserRole === "joined_rider" && ride.currentUserJoined === true;
  const shouldShow = isHost || isJoinedRider;
  const rideAppBookingShared = ride.bookingDetailsShared === true || detailsConfirmed;
  const rideAppBookingDetailsFinalized = ride.rideAppBookingDetailsFinalized === true || rideAppBookingShared;
  const currentUserNeedsReview =
    currentUserJoinIntentStatus === "needs_review" ||
    ride.selfSettleConfirmationStatus === "needs_review" ||
    (typeof currentUserConfirmedBookingDetailsVersion === "number" &&
      currentUserConfirmedBookingDetailsVersion < detailVersion);
  const rideForSelfSettleState: HomeRide = {
    ...ride,
    currentUserJoinIntentStatus,
    currentUserConfirmationExpired: currentUserConfirmationExpiredState,
    seatHoldExpiredAt: seatHoldExpiredAtState,
    seatHoldReleasedAt: seatHoldReleasedAtState,
    confirmationDeadlineAt: confirmByOverride ?? ride.confirmationDeadlineAt,
    rideAppConfirmBy: confirmByOverride ?? ride.rideAppConfirmBy,
    confirmationDeadlineLabel: confirmByLabelOverride ?? ride.confirmationDeadlineLabel,
    platformFeeStatus,
    currentUserBookingDetailsConfirmed: currentUserBookingDetailsConfirmedState,
    selfSettleConfirmationStatus:
      currentUserJoinIntentStatus === "joined_interest" && !currentUserConfirmationExpiredState
        ? "pending"
        : ride.selfSettleConfirmationStatus,
  };
  const seatHoldExpired = isRideAppSeatHoldExpired(rideForSelfSettleState);
  const deadlineState = getRideAppConfirmDeadlineState(rideForSelfSettleState);
  const confirmByDate = getRideAppConfirmByDate(rideForSelfSettleState);
  const confirmByLabel = confirmByLabelOverride ?? formatSelfSettleConfirmBy(confirmByDate);
  const confirmTimeLeftLabel = deadlineState.timeLeftLabel ?? formatSelfSettleTimeLeft(confirmByDate);
  const currentUserBookingDetailsConfirmed = !currentUserNeedsReview && !seatHoldExpired && (currentUserBookingDetailsConfirmedState || riderAcknowledged);
  const currentUserAlreadyConfirmedCurrentVersion =
    currentUserBookingDetailsConfirmed &&
    (currentUserConfirmedBookingDetailsVersion === null || currentUserConfirmedBookingDetailsVersion >= detailVersion);
  const currentUserSeatHoldExpired = isCurrentUserJoinedRider && seatHoldExpired && !currentUserAlreadyConfirmedCurrentVersion;
  const effectiveSeatsUsed = Math.max(0, Math.min(ride.seatsTotal, currentUserSeatHoldExpired ? seatsUsed - 1 : seatsUsed));
  const displayedRiderConfirmations = currentUserSeatHoldExpired
    ? riderConfirmations.map((item) =>
        item.isCurrentUser && item.role === "rider"
          ? {
              ...item,
              status: "seat_hold_expired" as const,
              seatHoldExpiredAt: seatHoldExpiredAtState ?? new Date().toISOString(),
            }
          : item,
      )
    : riderConfirmations;
  const podStillAcceptsRejoin =
    ride.status !== "cancelled" &&
    ride.status !== "expired" &&
    ride.rideAppPodStatus !== "cancelled" &&
    ride.rideAppPodStatus !== "expired" &&
    ride.rideAppPodStatus !== "ride_booked" &&
    ride.rideAppPodStatus !== "completed";
  const rejoinOpenSeatCount = Math.max(0, ride.seatsTotal - effectiveSeatsUsed);
  const rejoinRestriction = getRideAppRejoinRestrictionCopy(ride, rejoinOpenSeatCount > 0);
  const canRequestRejoin = currentUserSeatHoldExpired && podStillAcceptsRejoin && rejoinOpenSeatCount > 0 && !rejoinRestriction;
  const rejoinUnavailableHelper = rejoinRestriction?.helper ?? (podStillAcceptsRejoin ? "Your released seat is no longer available." : "This pod is no longer accepting riders.");
  const joinedRiderCount = ride.joinedRiderCount ?? countJoinedSelfSettleRiders(displayedRiderConfirmations);
  const confirmedRiderCount = Math.min(
    joinedRiderCount,
    ride.riderConfirmations?.length
      ? countConfirmedSelfSettleRiders(displayedRiderConfirmations, detailVersion)
      : Math.max(rideAppConfirmedRiderCount, countConfirmedSelfSettleRiders(displayedRiderConfirmations, detailVersion)),
  );
  const chatAccess = getRideAppChatAccessState({
    ...rideForSelfSettleState,
    platformFeeStatus,
    confirmedRiderCount,
    rideAppConfirmedRiderCount,
    riderConfirmations: displayedRiderConfirmations,
    bookingDetailsUpdated,
    bookingDetailsLastMeaningfulUpdate,
    bookingDetailsVersion: detailVersion,
    rideAppCurrentDetailVersion: detailVersion,
    currentUserJoinIntentStatus: currentUserSeatHoldExpired ? "seat_hold_expired" : currentUserJoinIntentStatus,
    currentUserConfirmationExpired: currentUserSeatHoldExpired || currentUserConfirmationExpiredState,
    currentUserBookingDetailsConfirmed,
  });
  const requiredRidersConfirmedCurrentDetails = confirmedRiderCount >= chatAccess.requiredConfirmations;
  const allRidersConfirmed = requiredRidersConfirmedCurrentDetails;
  const selfSettleRouteLabel = `${ride.fromLabel} -> ${ride.toLabel}`;
  const selfSettleRideDateTime = `${ride.dateLabel} - ${ride.timeLabel}`;
  const hostTrustSummary = getRideAppTrustSummary(getRideAppHostTrustUserId(ride));
  const hostTrustBadge = getRideAppPublicTrustBadge(hostTrustSummary, "host");
  const rideAppJoinFeeCents = calculateRideAppJoinFee(pricingConfig);
  const rideAppJoinFeeLabel = rideAppJoinFeeCents > 0 ? formatHKD(rideAppJoinFeeCents) : "Waived";
  const launchWaiverAvailable = rideAppWaiver.claimed && !rideAppWaiver.used;
  const plusWaiverAvailable = hasRidePodPlusJoinFeeWaiver(membership);
  const confirmationWaiverSource: JoinFeeWaiverSource =
    platformFeeStatus === "waived"
      ? "launch"
      : platformFeeStatus === "demo_confirmed" || platformFeeStatus === "paid"
        ? "none"
        : launchWaiverAvailable
          ? "launch"
          : plusWaiverAvailable
            ? "plus"
            : "none";
  const ridePodFeeLabel =
    platformFeeStatus === "demo_confirmed" || platformFeeStatus === "paid"
      ? "RidePod fee demo-confirmed"
      : platformFeeStatus === "waived"
        ? "HK$5 waived"
        : confirmationWaiverSource === "launch"
          ? "Launch waiver applied"
          : confirmationWaiverSource === "plus"
            ? "Plus waiver applied"
            : `${rideAppJoinFeeLabel} RidePod join fee`;
  const ridePodFeeHelper =
    platformFeeStatus === "demo_confirmed" || platformFeeStatus === "paid"
      ? "RidePod fee demo-confirmed. Ride fare is paid outside RidePod."
      : platformFeeStatus === "waived"
        ? "RidePod fee waived. Ride fare is paid outside RidePod."
        : confirmationWaiverSource === "launch"
          ? "Launch waiver applied. Ride fare is paid outside RidePod."
          : confirmationWaiverSource === "plus"
          ? "Plus waiver applied. Ride fare is paid outside RidePod."
          : "RidePod fee demo-confirmed in this version. Ride fare is paid outside RidePod.";
  const riderConfirmFeeHelper =
    currentUserNeedsReview && (platformFeeStatus === "demo_confirmed" || platformFeeStatus === "paid")
      ? "RidePod fee already demo-confirmed."
      : currentUserNeedsReview && platformFeeStatus === "waived"
        ? "RidePod fee already waived."
        : ridePodFeeHelper;
  const approvedRouteRequest = getNormalizedRouteRequests(ride).approved[0] ?? null;
  const approvedStop = approvedRouteRequest ? routeRequestToRoutePlanStop(approvedRouteRequest) : null;
  const fareEstimateScreenshotFileName = fareEstimateScreenshot?.fileName ?? fareScreenshotName.trim();
  const initialFareEstimateScreenshotFileName = ride.fareEstimateScreenshot?.fileName ?? ride.rideAppFareEstimateScreenshotName ?? "";
  const fareEstimateWasMeaningfullyUpdated = bookingDetailsUpdated && bookingDetailsLastMeaningfulUpdate === "fare_estimate";
  const fareEstimateUpdatedLabel = fareEstimateUpdatedAt ? formatSelfSettleConfirmedTime(fareEstimateUpdatedAt) : "";
  const confirmedRidersNeedFareReview =
    fareEstimateWasMeaningfullyUpdated &&
    riderConfirmations.some((item) => item.role === "rider" && item.status === "needs_review");
  const gatherPointSet = Boolean(ride.pickupLabel?.trim());
  const requiredBookingDetailsComplete = Boolean(
    ride.pickupLabel?.trim() &&
      (ride.estimatedRideAppFare ?? fareEstimate)?.trim() &&
      (ride.splitMethod ?? ride.rideAppSplitMethod)?.trim() &&
      (ride.paymentMethod ?? getRideAppAcceptedPaymentDisplay(ride))?.trim() &&
      (ride.confirmationDeadlineLabel ?? confirmByLabel).trim(),
  );
  const detailRows = [
    ["Route", selfSettleRouteLabel],
    ["Date & time", selfSettleRideDateTime],
    ["Seats", `${effectiveSeatsUsed} / ${ride.seatsTotal} seats`],
    ["Ride mode", "Ride app"],
    ["Estimated fare", fareEstimate ? `${fareEstimate} - ride app estimate` : "Ride app estimate pending"],
    ...(fareEstimateWasMeaningfullyUpdated
      ? [["Fare status", fareEstimateUpdatedLabel ? `Updated fare estimate - ${fareEstimateUpdatedLabel}` : "Updated fare estimate"]]
      : []),
    ...(lastBookingDetailsUpdateReason ? [["Update note", lastBookingDetailsUpdateReason]] : []),
    ["Gather point", gatherPointSet ? ride.pickupLabel ?? "" : "Not set"],
    ["Confirm-by time", deadlineState.status === "expired" ? "Seat released" : `${confirmByLabel} - ${confirmTimeLeftLabel}`],
    ["Detail version", `Version ${detailVersion}`],
    ["Host books when", getRideAppBookingTriggerDisplay(ride)],
    ["RidePod join fee", ridePodFeeLabel],
    ["Final ride fare", "Paid after ride"],
    ["Payment recipient", "Person who booked the ride"],
    ["Fare protection", "Not included"],
    ["Suggested split", ride.splitMethod ?? "Equal split, unless agreed otherwise"],
    ["Payment timing", "After ride completion"],
    ["Accepted payment", getRideAppAcceptedPaymentDisplay(ride)],
    ...(fareEstimateScreenshotFileName
      ? [["Fare estimate screenshot", `Screenshot added by host - ${fareEstimateScreenshotFileName}`]]
      : []),
    ["Booking responsibility", "Host / group to confirm"],
    ["Chat status", chatAccess.canAccess ? "Chat unlocked" : `${chatAccess.secondaryLabel} - ${chatAccess.helper}`],
  ];
  const checklistItems = [
    "Gather point",
    "Drop-off point",
    "Ride app to use",
    "Estimated fare",
    "Who books the ride",
    "How the fare will be split",
    "Payment method after ride",
    "Who receives payment after ride",
  ];
  const riderBookingSummaryRows = [
    ["Gather point", ride.pickupLabel ?? "Not set"],
    ["Drop-off", ride.dropoffLabel ?? ride.toLabel],
    ["Pickup time / ETA", ride.pickupTime ?? ride.timeLabel],
    ["Ride app", ride.rideAppProviderName ?? ride.taxiType],
    ["Confirm-by time", deadlineState.status === "expired" ? "Seat released" : `${confirmByLabel} - ${confirmTimeLeftLabel}`],
    ["Estimated fare", fareEstimate ?? ride.estimatedRideAppFare ?? "Shared by host"],
    ...(fareEstimateWasMeaningfullyUpdated ? [["Detail status", "Updated fare estimate"]] : []),
    ["Estimated fare helper", "Estimated fare may change."],
    ["Split method", ride.splitMethod ?? "Equal split"],
    ["Payment method", `${ride.paymentMethod ?? getRideAppAcceptedPaymentDisplay(ride)} after ride`],
    ["Host / booker", ride.hostName],
    [approvedStop ? "Route stop" : "Route", approvedStop?.label ?? "Direct route only"],
    ...(fareEstimateScreenshotFileName ? [["Fare estimate screenshot", "Screenshot added by host"]] : []),
    ["RidePod fee", ridePodFeeLabel],
  ];
  const showRiderConfirmRidingAction =
    isJoinedRider &&
    isCurrentUserJoinedRider &&
    rideAppBookingDetailsFinalized &&
    !seatHoldExpired &&
    !currentUserAlreadyConfirmedCurrentVersion &&
    (currentUserJoinIntentStatus === "joined_interest" || currentUserJoinIntentStatus === "needs_review" || !currentUserBookingDetailsConfirmed);
  const showRatingPrompt = shouldShow && isSelfSettleRideTimePassed(ride);

  if (!shouldShow) {
    return (
      <section className="rounded-[24px] border border-blue-300/20 bg-[linear-gradient(145deg,rgba(59,130,246,0.12),rgba(15,23,42,0.48))] p-5 shadow-[var(--rp-shadow-soft)]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/30 bg-blue-400/12 text-blue-100">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[var(--rp-text)]">Booking details are for joined riders</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Join this pod to view booking details and chat with the group.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 text-sm font-black text-blue-100"
        >
          Join
        </button>
      </section>
    );
  }

  function openConfirmModal() {
    if (!isHost || detailsConfirmed) return;
    setConfirmError(null);
    setConfirmUnderstood(false);
    setShowConfirmModal(true);
  }

  async function confirmBookingDetails() {
    if (!isHost || !confirmUnderstood || isConfirmingDetails || detailsConfirmed) return;

    setIsConfirmingDetails(true);
    setConfirmError(null);

    try {
      const confirmedAt = new Date();
      const confirmedAtLabel = new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
      }).format(confirmedAt);

      setDetailsConfirmed(true);
      setConfirmedTime(confirmedAtLabel);
      setConfirmedBy(ride.hostName);
      setShowConfirmModal(false);
      setConfirmUnderstood(false);

      await createPodLiveUpdate({
        podId: ride.id,
        userId: user?.id ?? null,
        updateType: "system",
        message:
          "Ride app booking details confirmed. Please check the pod chat and settle the final ride fare after the ride directly with the booker.",
        metadata: {
          rideAppBookingDetailsConfirmed: true,
          rideAppBookingDetailsConfirmedAt: confirmedAt.toISOString(),
          rideAppBookingDetailsConfirmedBy: user?.id ?? "mock-host",
        },
      });
    } catch {
      setConfirmError("Could not confirm details. Try again.");
    } finally {
      setIsConfirmingDetails(false);
    }
  }

  function openReviewModal() {
    if (!isJoinedRider || !detailsConfirmed || riderAcknowledged) return;
    setAcknowledgementError(null);
    setReviewUnderstood(false);
    setShowReviewModal(true);
  }

  function openRiderConfirmRidingModal() {
    if (!showRiderConfirmRidingAction) return;
    setRiderConfirmRidingMessage(null);
    setFeeConfirmationMessage(null);
    setRiderConfirmRidingChecked(false);
    setShowRiderConfirmRidingModal(true);
  }

  function closeRiderConfirmRidingModal() {
    setShowRiderConfirmRidingModal(false);
    setRiderConfirmRidingChecked(false);
  }

  function confirmRiderIsRiding() {
    if (!riderConfirmRidingChecked || !requiredBookingDetailsComplete || seatHoldExpired || currentUserAlreadyConfirmedCurrentVersion) return;

    const feeAlreadySettled = platformFeeStatus === "demo_confirmed" || platformFeeStatus === "paid" || platformFeeStatus === "waived";
    const shouldConsumeWaiver = !feeAlreadySettled && confirmationWaiverSource !== "none";

    if (shouldConsumeWaiver && confirmationWaiverSource === "launch") {
      markRideAppWaiverUsed();
    } else if (shouldConsumeWaiver && confirmationWaiverSource === "plus") {
      consumeRidePodPlusJoinFeeWaiver();
    }

    const nextPlatformFeeStatus = feeAlreadySettled ? platformFeeStatus : shouldConsumeWaiver ? "waived" : "demo_confirmed";

    setCurrentUserBookingDetailsConfirmedState(true);
    setCurrentUserJoinIntentStatus("confirmed");
    setCurrentUserConfirmedBookingDetailsVersion(detailVersion);
    setPlatformFeeStatus(nextPlatformFeeStatus);
    const nextRiderConfirmations = riderConfirmations.map((item) =>
      item.isCurrentUser && item.role === "rider"
        ? {
            ...item,
            status: "confirmed" as const,
            confirmedDetailVersion: detailVersion,
            confirmedBookingDetailsVersion: detailVersion,
          }
        : item,
    );
    const nextConfirmedRiderCount = Math.min(
      joinedRiderCount,
      countConfirmedSelfSettleRiders(nextRiderConfirmations, detailVersion),
    );
    const currentDetailsReviewCleared = nextConfirmedRiderCount >= chatAccess.requiredConfirmations;
    if (currentDetailsReviewCleared) {
      setBookingDetailsUpdated(false);
      setBookingDetailsLastMeaningfulUpdate(null);
    }
    setRiderConfirmations(nextRiderConfirmations);
    setRideAppConfirmedRiderCount(nextConfirmedRiderCount);
    saveStoredSelfSettleRidePatch(ride.id, {
      currentUserBookingDetailsConfirmed: true,
      currentUserJoinIntentStatus: "confirmed",
      currentUserConfirmedBookingDetailsVersion: detailVersion,
      currentUserRideAppDetailVersionConfirmed: detailVersion,
      selfSettleConfirmationStatus: "confirmed",
      platformFeeStatus: nextPlatformFeeStatus,
      riderConfirmations: nextRiderConfirmations,
      confirmedRiderCount: nextConfirmedRiderCount,
      rideAppConfirmedRiderCount: nextConfirmedRiderCount,
      ...(currentDetailsReviewCleared
        ? {
            bookingDetailsUpdated: false,
            bookingDetailsLastMeaningfulUpdate: null,
          }
        : {}),
    });
    closeRiderConfirmRidingModal();
    setRiderConfirmRidingMessage(currentUserNeedsReview ? "Updated ride details confirmed." : "Ride details confirmed.");
    setFeeConfirmationMessage(
      feeAlreadySettled && currentUserNeedsReview
        ? "RidePod fee is already demo-confirmed or waived for this pod."
        : nextPlatformFeeStatus === "waived"
        ? "RidePod fee waived for this confirmation. Ride fare is paid outside RidePod."
        : "RidePod fee demo-confirmed for this confirmation. Ride fare is paid outside RidePod.",
    );
  }

  function requestToRejoin() {
    if (!currentUserSeatHoldExpired) return;
    if (!canRequestRejoin) {
      setRejoinMessage(rejoinRestriction?.helper ?? (podStillAcceptsRejoin ? "This pod is full." : "This pod is no longer accepting riders."));
      setShowRejoinModal(false);
      return;
    }

    const requestedAt = new Date();
    const nextConfirmBy = confirmByDate.getTime() > requestedAt.getTime()
      ? confirmByDate
      : new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000);
    const nextConfirmByIso = nextConfirmBy.toISOString();
    const nextConfirmByLabel = formatSelfSettleConfirmBy(nextConfirmBy);
    const riderName = ride.currentUserName?.trim() || profile?.display_name?.trim() || profile?.preferred_name?.trim() || "You";
    let currentUserFound = false;
    const nextRiderConfirmations = riderConfirmations.map((item) => {
      const isCurrentUser = item.isCurrentUser === true || item.name.trim().toLowerCase() === "you";
      if (!isCurrentUser || item.role !== "rider") return item;
      currentUserFound = true;
      return {
        ...item,
        name: item.name?.trim() || riderName,
        status: "joined_interest" as const,
        isCurrentUser: true,
        confirmBy: nextConfirmByIso,
        seatHoldExpiredAt: null,
        confirmedDetailVersion: undefined,
        confirmedBookingDetailsVersion: undefined,
      };
    });

    if (!currentUserFound) {
      nextRiderConfirmations.push({
        name: riderName,
        role: "rider",
        status: "joined_interest",
        isCurrentUser: true,
        confirmBy: nextConfirmByIso,
        seatHoldExpiredAt: null,
      });
    }

    const nextJoinedCount = Math.min(
      ride.seatsTotal,
      countJoinedSelfSettleRiders(nextRiderConfirmations),
    );
    const nextConfirmedCount = Math.min(
      nextJoinedCount,
      countConfirmedSelfSettleRiders(nextRiderConfirmations, detailVersion),
    );
    const patch: Partial<HomeRide> = {
      currentUserJoined: true,
      currentUserRole: "joined_rider",
      currentUserJoinIntentStatus: "joined_interest",
      currentUserConfirmationExpired: false,
      currentUserBookingDetailsConfirmed: false,
      currentUserConfirmedBookingDetailsVersion: null,
      currentUserRideAppDetailVersionConfirmed: undefined,
      selfSettleConfirmationStatus: "pending",
      platformFeeStatus: "pending",
      seatHoldExpiredAt: null,
      seatHoldReleasedAt: null,
      confirmationDeadlineAt: nextConfirmByIso,
      rideAppConfirmBy: nextConfirmByIso,
      confirmationDeadlineLabel: nextConfirmByLabel,
      rideAppPodStatus: rideAppBookingDetailsFinalized ? "awaiting_rider_confirmation" : "booking_details_needed",
      seatsUsed: nextJoinedCount,
      joinedRiderCount: nextJoinedCount,
      confirmedRiderCount: nextConfirmedCount,
      rideAppConfirmedRiderCount: nextConfirmedCount,
      riderConfirmations: nextRiderConfirmations,
      rejoinCooldownUntil: null,
      requiresHostApprovalToRejoin: false,
      rideAppJoinLeaveActivitySummary: `${riderName} rejoined the pod.`,
      rideAppSeatReleasedAt: ride.rideAppSeatReleasedAt ?? seatHoldReleasedAtState ?? seatHoldExpiredAtState ?? requestedAt.toISOString(),
      rideAppRejoinRequestedAt: requestedAt.toISOString(),
      rideAppRejoinRequestedBy: riderName,
    };

    setCurrentUserJoinIntentStatus("joined_interest");
    setCurrentUserConfirmationExpiredState(false);
    setCurrentUserBookingDetailsConfirmedState(false);
    setCurrentUserConfirmedBookingDetailsVersion(null);
    setSeatHoldExpiredAtState(null);
    setSeatHoldReleasedAtState(null);
    setConfirmByOverride(nextConfirmByIso);
    setConfirmByLabelOverride(nextConfirmByLabel);
    setPlatformFeeStatus("pending");
    setRiderConfirmations(nextRiderConfirmations);
    setRideAppConfirmedRiderCount(nextConfirmedCount);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    setRejoinMessage(rideAppBookingDetailsFinalized ? "Confirm ride details" : "Waiting for host details");
    setShowRejoinModal(false);
  }

  function addMockFareEstimateScreenshot() {
    const addedAt = new Date().toISOString();
    const mockScreenshot = {
      fileName: "fare-estimate-example.png",
      previewUrl: "",
      addedAt,
      note: "",
    };
    setFareEstimateScreenshot(mockScreenshot);
    setFareScreenshotName(mockScreenshot.fileName);
  }

  function saveFareEstimate() {
    if (!isHost || fareEstimateSaving) return;
    const nextFareEstimate = fareEstimateInput.trim();
    if (!nextFareEstimate) {
      setFareEstimateMessage("Add the estimated ride app fare.");
      return;
    }

    setFareEstimateSaving(true);
    setFareEstimateMessage(null);

    try {
      const previousFareEstimate = (fareEstimate ?? "").trim();
      const nextFareSnapshot: Partial<HomeRide> = {
        estimatedRideAppFare: nextFareEstimate,
        rideAppBookingDetails: {
          ...ride.rideAppBookingDetails,
          estimatedFare: nextFareEstimate,
        },
      };
      const meaningfulUpdate = isMeaningfulRideAppDetailUpdate(ride, {
        ...ride,
        ...nextFareSnapshot,
      });
      const meaningfulFareUpdate = Boolean(previousFareEstimate) && meaningfulUpdate.updateType === "fare_estimate";
      const screenshotChanged = (fareEstimateScreenshot?.fileName ?? "") !== initialFareEstimateScreenshotFileName;
      const nextUpdatedAt = new Date().toISOString();
      const note = fareEstimateNote.trim();
      const ridersAlreadyConfirmed = countConfirmedSelfSettleRiders(riderConfirmations, detailVersion) > 0;
      const nextDetailVersion = meaningfulFareUpdate ? detailVersion + 1 : detailVersion;
      const reviewPatch = meaningfulFareUpdate
        ? applyRideAppMeaningfulDetailUpdate({ ...ride, ...nextFareSnapshot }, "fare_estimate")
        : {};
      const nextRiderConfirmations =
        reviewPatch.riderConfirmations ??
        riderConfirmations;
      const nextConfirmedRiderCount = Math.min(
        countJoinedSelfSettleRiders(nextRiderConfirmations),
        countConfirmedSelfSettleRiders(nextRiderConfirmations, nextDetailVersion),
      );
      const farePatch: Partial<HomeRide> = {
        ...reviewPatch,
        estimatedRideAppFare: nextFareEstimate,
        rideAppBookingDetails: {
          ...ride.rideAppBookingDetails,
          estimatedFare: nextFareEstimate,
        },
        rideAppEstimatedFareUpdatedAt: nextUpdatedAt,
        rideAppEstimatedFareNote: note || (fareEstimateScreenshot?.fileName ? `Screenshot uploaded: ${fareEstimateScreenshot.fileName}` : "Updated by host."),
        rideAppFareEstimateScreenshotName: fareEstimateScreenshot?.fileName ?? null,
        rideAppFareEstimateScreenshotAddedAt: fareEstimateScreenshot?.addedAt ?? null,
        fareEstimateScreenshot,
        lastBookingDetailsUpdateReason: note || null,
        confirmedRiderCount: nextConfirmedRiderCount,
        rideAppConfirmedRiderCount: nextConfirmedRiderCount,
      };

      setFareEstimate(nextFareEstimate);
      setFareEstimateInput(nextFareEstimate);
      setFareEstimateUpdatedAt(nextUpdatedAt);
      setLastBookingDetailsUpdateReason(note || null);
      if (fareEstimateScreenshot?.fileName) {
        setFareScreenshotName(fareEstimateScreenshot.fileName);
      }

      if (meaningfulFareUpdate) {
        setDetailVersion(nextDetailVersion);
        setBookingDetailsUpdated(true);
        setBookingDetailsLastMeaningfulUpdate("fare_estimate");
        setRiderConfirmations(nextRiderConfirmations);
        setRideAppConfirmedRiderCount(nextConfirmedRiderCount);
      }

      saveStoredSelfSettleRidePatch(ride.id, farePatch);
      setShowFareEstimateModal(false);
      setFareEstimateMessage(
        meaningfulFareUpdate && ridersAlreadyConfirmed
          ? "Booking details updated. Riders may need to review the updated fare estimate before the host books."
          : screenshotChanged
            ? "Fare estimate screenshot updated. RidePod does not verify ride app screenshots."
          : "Fare estimate updated. Ride fare is paid outside RidePod.",
      );
    } catch {
      setFareEstimateMessage("Could not save estimate. Try again.");
    } finally {
      setFareEstimateSaving(false);
    }
  }

  async function acknowledgeSelfSettleDetails() {
    if (!isJoinedRider || !detailsConfirmed || riderAcknowledged || !reviewUnderstood || isSavingAcknowledgement) return;

    setIsSavingAcknowledgement(true);
    setAcknowledgementError(null);

    try {
      const riderName = ride.currentUserName ?? profile?.display_name?.trim() ?? profile?.preferred_name?.trim() ?? "Rider";
      setRiderAcknowledged(true);
      setShowReviewModal(false);
      setReviewUnderstood(false);
      createRideAppTrustEvent({
        userId: user?.id ?? "mock-rider",
        podId: ride.id,
        eventType: "ride_app_acknowledged",
        reason: "Rider acknowledged self-settle details.",
        createdBy: user?.id ?? null,
      });

      await createPodLiveUpdate({
        podId: ride.id,
        userId: user?.id ?? null,
        updateType: "system",
        message: `${riderName} acknowledged the self-settle ride details.`,
        metadata: {
          rideAppAcknowledgement: true,
          acknowledgedAt: new Date().toISOString(),
        },
      });
    } catch {
      setAcknowledgementError("Could not save acknowledgement. Try again.");
    } finally {
      setIsSavingAcknowledgement(false);
    }
  }

  return (
    <>
    <section
      id="ride-app-booking-details"
      className="overflow-hidden rounded-[24px] border border-blue-300/25 bg-[linear-gradient(145deg,rgba(76,29,149,0.22),rgba(14,23,42,0.76)_45%,rgba(37,99,235,0.16))] shadow-[var(--rp-shadow-soft)]"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black leading-tight text-[var(--rp-text)]">
                Ride app booking details
              </h2>
              <span className="inline-flex min-h-7 items-center rounded-full border border-blue-300/35 bg-blue-400/12 px-3 text-xs font-black text-blue-100">
                {chatAccess.statusLabel}
              </span>
              <span className="inline-flex min-h-7 items-center rounded-full border border-white/12 bg-white/8 px-3 text-xs font-black text-[var(--rp-muted-strong)]">
                {hostTrustBadge}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              {chatAccess.canAccess
                ? "Chat is unlocked for confirmed riders. Use it to gather at the gather point before the host books."
                : "Booking details must be confirmed before chat opens. The actual ride app booking and final fare settlement are handled by pod members directly."}
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-100">
            <Smartphone className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-5 rounded-[18px] border border-blue-300/15 bg-[rgba(2,6,23,0.34)] px-4">
          {detailRows.map(([label, value]) => (
            <SelfSettleBookingDetailRow key={label} label={label} value={value} />
          ))}
        </div>

        {fareEstimateWasMeaningfullyUpdated ? (
          <div className="mt-4 rounded-[16px] border border-amber-300/25 bg-amber-400/10 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-7 items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-3 text-xs font-black text-amber-100">
                Updated fare estimate
              </span>
              {fareEstimateUpdatedLabel ? (
                <span className="text-xs font-bold text-[var(--rp-muted-strong)]">Updated {fareEstimateUpdatedLabel}</span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
              Ride fare is paid outside RidePod.
            </p>
          </div>
        ) : null}

        {fareEstimateScreenshotFileName ? (
          <div className="mt-4 rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 py-3">
            <p className="text-sm font-black text-blue-100">Fare estimate screenshot</p>
            <p className="mt-1 break-words text-sm font-bold text-[var(--rp-text)]">
              Screenshot added by host: {fareEstimateScreenshotFileName}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              RidePod does not verify ride app screenshots.
            </p>
          </div>
        ) : null}

        {!showFareEstimateModal && fareEstimateMessage ? (
          <p className="mt-4 rounded-[16px] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold leading-6 text-emerald-100">
            {fareEstimateMessage}
          </p>
        ) : null}

        {isHost && confirmedRidersNeedFareReview ? (
          <div className="mt-4 rounded-[16px] border border-amber-300/25 bg-amber-400/10 px-4 py-3">
            <h3 className="text-sm font-black text-amber-100">Booking details updated</h3>
            <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
              Riders may need to review the updated fare estimate before the host books.
            </p>
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              No second RidePod fee applies for updated details.
            </p>
          </div>
        ) : null}

        {showRiderConfirmRidingAction ? (
          <SelfSettleRiderConfirmationCard
            summaryRows={riderBookingSummaryRows}
            onConfirm={openRiderConfirmRidingModal}
            chatHref={`/pods/${ride.id}/chat`}
          />
        ) : null}

        <div className="mt-5 border-t border-blue-300/15 pt-5">
          <h3 className="text-sm font-black text-[var(--rp-text)]">Before booking, confirm:</h3>
          <ul className="mt-3 grid gap-2">
            {checklistItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {rideAppBookingShared ? (
          <SelfSettleRiderConfirmationsCard
            confirmations={displayedRiderConfirmations}
            confirmedCount={confirmedRiderCount}
            joinedCount={chatAccess.requiredConfirmations}
            isHost={isHost}
            allConfirmed={allRidersConfirmed}
            confirmByLabel={confirmByLabel}
            confirmTimeLeftLabel={confirmTimeLeftLabel}
          />
        ) : null}

        {detailsConfirmed ? (
          <div className="mt-5 rounded-[18px] border border-blue-300/15 bg-blue-400/10 p-4">
            <p className="text-sm font-black text-blue-100">Confirmed summary</p>
            <div className="mt-3 grid gap-2 text-sm font-bold text-[var(--rp-muted-strong)]">
              <p>Confirmed by host{confirmedBy ? ` (${confirmedBy})` : ""}</p>
              <p>Confirmed time: {confirmedTime}</p>
              <p>Ride fare is paid outside RidePod.</p>
            </div>
          </div>
        ) : null}

        {currentUserSeatHoldExpired ? (
          <div className="mt-5 rounded-[18px] border border-rose-300/25 bg-rose-400/10 p-4">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-rose-100" />
              <div>
                <h3 className="text-base font-black text-rose-100">Seat released</h3>
                <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                  You did not confirm before the confirm-by time, so your seat was released for other riders.
                </p>
                <p className="mt-2 text-xs font-black leading-5 text-rose-100">
                  No RidePod fee was confirmed.
                </p>
                <p className="mt-1 text-xs font-black leading-5 text-rose-100">
                  Waiver was not used.
                </p>
                {!canRequestRejoin ? (
                  <p className="mt-2 rounded-[12px] border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-black leading-5 text-amber-100">
                    {rejoinUnavailableHelper}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-2">
                  {canRequestRejoin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRejoinMessage(null);
                          setShowRejoinModal(true);
                        }}
                        className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
                      >
                        Request to rejoin
                      </button>
                      <Link href="/home" className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-soft)] hover:text-[var(--rp-text)]">
                        Find another pod
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={rejoinRestriction?.kind === "full" || !podStillAcceptsRejoin ? "/home" : `/pods/${ride.id}/status`}
                      className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
                    >
                      {rejoinRestriction?.cta ?? "Find another pod"}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isJoinedRider && currentUserNeedsReview ? (
          <div className="mt-5 rounded-[18px] border border-amber-300/25 bg-amber-400/10 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-100" />
              <div>
                <h3 className="text-base font-black text-amber-100">Review updated details</h3>
                <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                  Host updated the details. Please review again. No second RidePod fee applies.
                </p>
              </div>
            </div>
          </div>
        ) : isJoinedRider && currentUserBookingDetailsConfirmed ? (
          <div className="mt-5 rounded-[18px] border border-emerald-300/25 bg-emerald-400/10 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400/12 text-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-emerald-100">
                  {allRidersConfirmed ? "Ready to meet" : "Confirmed"}
                </h3>
                <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                  {allRidersConfirmed
                    ? "All required riders confirmed the booking details. Gather at the gather point."
                    : "Waiting for required riders to confirm."}
                </p>
                <p className="mt-2 text-xs font-black leading-5 text-emerald-100">
                  Ride fare is paid outside RidePod.
                </p>
              </div>
            </div>
          </div>
        ) : isJoinedRider && detailsConfirmed ? (
          <div className="mt-5 rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 py-3">
            <p className="text-sm font-bold leading-6 text-blue-100">
              {riderAcknowledged
                ? "Ride details acknowledged"
                : "Host confirmed the ride app booking details."}
            </p>
            {riderAcknowledged ? (
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                You acknowledged that the ride fare is paid after the ride outside RidePod.
              </p>
            ) : null}
          </div>
        ) : null}

        {riderConfirmRidingMessage ? (
          <p className="mt-5 rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-sm font-bold leading-6 text-blue-100">
            {riderConfirmRidingMessage}
          </p>
        ) : null}

        {!seatHoldExpired && rejoinMessage ? (
          <p className="mt-5 rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-center text-sm font-black leading-6 text-blue-100">
            {rejoinMessage}
          </p>
        ) : null}

        {feeConfirmationMessage ? (
          <p className="mt-3 rounded-[16px] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold leading-6 text-emerald-100">
            {feeConfirmationMessage}
          </p>
        ) : null}

        {showRatingPrompt ? (
          <SelfSettleRatingPrompt
            ride={ride}
            isHost={isHost}
            currentUserId={getRideAppCurrentUserId(user?.id)}
          />
        ) : null}

        <p className="mt-5 rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-sm font-bold leading-6 text-blue-100">
          {chatAccess.canAccess
            ? "Chat unlocked. Gather at pickup and confirm everyone is ready before the host books."
            : `${chatAccess.secondaryLabel}: ${chatAccess.helper}`}
        </p>

        <div className="mt-4 border-t border-blue-300/15 pt-4">
          <SelfSettleReportIssue
            podId={ride.id}
            routeLabel={selfSettleRouteLabel}
            rideDateTime={selfSettleRideDateTime}
            chatHref={`/pods/${ride.id}/chat`}
            currentUserRole={ride.currentUserRole ?? null}
            canSubmit={shouldShow}
            triggerLabel="Need help with this pod?"
          />
        </div>
      </div>

      <div className="grid gap-2 border-t border-blue-300/15 bg-[rgba(2,6,23,0.28)] p-4 sm:grid-cols-3">
        {currentUserSeatHoldExpired && canRequestRejoin ? (
          <button
            type="button"
            onClick={() => {
              setRejoinMessage(null);
              setShowRejoinModal(true);
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
          >
            Request to rejoin
          </button>
        ) : currentUserSeatHoldExpired ? (
          <Link
            href="/home"
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
          >
            Find another pod
          </Link>
        ) : isHost && rideAppBookingDetailsFinalized ? (
          <button
            type="button"
            onClick={() => {
              setFareEstimateMessage(null);
              setFareEstimateInput(fareEstimate ?? "");
              setShowFareEstimateModal(true);
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 text-sm font-black text-blue-100 transition hover:bg-blue-400/15"
          >
            Update fare estimate
          </button>
        ) : null}
        {isHost && !detailsConfirmed ? (
          <button
            type="button"
            onClick={openConfirmModal}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#8b5cf6,#60a5fa)] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(96,165,250,0.18)] transition hover:brightness-105"
          >
            Confirm details
          </button>
        ) : isHost && rideAppBookingShared && chatAccess.canAccess ? (
          <Link
            href={`/pods/${ride.id}/chat`}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
          >
            Open chat
          </Link>
        ) : isHost && rideAppBookingShared ? (
          <button
            type="button"
            disabled
            className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted)]"
          >
            {chatAccess.primaryLabel}
          </button>
        ) : isJoinedRider && currentUserBookingDetailsConfirmed && chatAccess.canAccess ? (
          <Link
            href={`/pods/${ride.id}/chat`}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
          >
            Open chat
          </Link>
        ) : isJoinedRider && currentUserBookingDetailsConfirmed ? (
          <button
            type="button"
            disabled
            className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted)]"
          >
            {chatAccess.primaryLabel}
          </button>
        ) : showRiderConfirmRidingAction ? (
          <button
            type="button"
            onClick={openRiderConfirmRidingModal}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
          >
            {currentUserNeedsReview ? "Review updated details" : "Confirm ride details"}
          </button>
        ) : isJoinedRider && !detailsConfirmed ? (
          <button
            type="button"
            disabled
            className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-[16px] border border-blue-300/15 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted)]"
          >
            Waiting for host confirmation
          </button>
        ) : isJoinedRider && !riderAcknowledged ? (
          <button
            type="button"
            onClick={openReviewModal}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#8b5cf6,#60a5fa)] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(96,165,250,0.18)] transition hover:brightness-105"
          >
            Review details
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-12 cursor-default items-center justify-center rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 text-sm font-black text-blue-100"
          >
            {isJoinedRider ? "Ride details acknowledged" : "Details confirmed"}
          </button>
        )}
        {currentUserSeatHoldExpired ? (
          <Link
            href={`/pods/${ride.id}/status`}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-soft)] hover:text-[var(--rp-text)]"
          >
            View pod status
          </Link>
        ) : chatAccess.canAccess ? (
          <Link
            href={`/pods/${ride.id}/chat`}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-soft)] hover:text-[var(--rp-text)]"
          >
            Open chat
          </Link>
        ) : (
          <span className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted)]">
            Chat locked
          </span>
        )}
      </div>
    </section>
    {showRejoinModal ? (
      <div
        className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="self-settle-rejoin-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowRejoinModal(false);
        }}
      >
        <section className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
          <div className="overflow-y-auto p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-100">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <h2 id="self-settle-rejoin-title" className="text-2xl font-black leading-tight">
                  Request to rejoin?
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  You can request this seat again if the pod still has space. You will need to confirm ride details before the new confirm-by time.
                </p>
              </div>
            </div>
            <p className="mt-5 rounded-[16px] border border-[var(--rp-primary)]/25 bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-4 py-3 text-sm font-black leading-6 text-[var(--rp-primary)]">
              No RidePod fee is confirmed until you confirm ride details.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
            <button
              type="button"
              onClick={() => setShowRejoinModal(false)}
              className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canRequestRejoin}
              onClick={requestToRejoin}
              className="min-h-12 rounded-2xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Request to rejoin
            </button>
          </div>
        </section>
      </div>
    ) : null}
    {showRiderConfirmRidingModal ? (
      <SelfSettleRiderBookingConfirmationModal
        summaryRows={riderBookingSummaryRows}
        screenshotName={fareEstimateScreenshotFileName || null}
        detailsComplete={requiredBookingDetailsComplete}
        needsReview={currentUserNeedsReview}
        feeLabel={ridePodFeeLabel}
        feeHelper={riderConfirmFeeHelper}
        checked={riderConfirmRidingChecked}
        onCheckedChange={setRiderConfirmRidingChecked}
        onCancel={closeRiderConfirmRidingModal}
        onConfirm={confirmRiderIsRiding}
      />
    ) : null}
    {showFareEstimateModal ? (
      <div
        className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={fareEstimateTitleId}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !fareEstimateSaving) setShowFareEstimateModal(false);
        }}
      >
        <section className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
          <div className="overflow-y-auto p-5">
            <h2 id={fareEstimateTitleId} className="text-2xl font-black leading-tight">
              Update fare estimate
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Update the external ride app fare estimate your pod should review.
            </p>
            <p className="mt-3 rounded-[14px] border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs font-bold leading-5 text-blue-100">
              This estimate is not verified by RidePod. Ride fare is paid outside RidePod.
            </p>
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-black text-[var(--rp-text)]">Estimated ride app fare</span>
              <input
                value={fareEstimateInput}
                onChange={(event) => setFareEstimateInput(event.target.value)}
                placeholder="e.g. HK$120-160"
                className="min-h-12 rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-bold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-blue-300/45"
              />
              <span className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                This estimate is not verified by RidePod.
              </span>
            </label>
            <label className="mt-4 grid gap-2">
              <span className="text-sm font-black text-[var(--rp-text)]">Update note</span>
              <textarea
                rows={3}
                value={fareEstimateNote}
                onChange={(event) => setFareEstimateNote(event.target.value)}
                placeholder="e.g. Fare changed after adding a stop."
                className="resize-none rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 py-3 text-sm font-bold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-blue-300/45"
              />
            </label>
            <section className="mt-4 rounded-[18px] border border-blue-300/20 bg-blue-400/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-[var(--rp-text)]">Optional fare estimate screenshot</h3>
                  <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                    Add a screenshot only to help riders understand the estimate.
                  </p>
                </div>
                <Info className="h-5 w-5 shrink-0 text-blue-100" />
              </div>
              {fareEstimateScreenshot?.fileName ? (
                <div className="mt-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-100">Screenshot added by host</p>
                  <p className="mt-1 break-words text-sm font-black text-[var(--rp-text)]">{fareEstimateScreenshot.fileName}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addMockFareEstimateScreenshot}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] border border-blue-300/25 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-blue-100 transition hover:bg-[var(--rp-card-soft)]"
                >
                  Add mock screenshot
                </button>
              )}
              <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                RidePod does not verify ride app screenshots. Do not upload screenshots showing phone numbers, payment details, or private account info.
              </p>
            </section>
            {fareEstimateMessage ? (
              <p className="mt-4 rounded-[14px] border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm font-bold text-rose-100">
                {fareEstimateMessage}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] p-4">
            <button
              type="button"
              onClick={() => setShowFareEstimateModal(false)}
              disabled={fareEstimateSaving}
              className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveFareEstimate}
              disabled={fareEstimateSaving || !fareEstimateInput.trim()}
              className="min-h-12 rounded-2xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fareEstimateSaving ? "Saving..." : "Save update"}
            </button>
          </div>
        </section>
      </div>
    ) : null}
    {showConfirmModal ? (
      <div
        className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={confirmTitleId}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isConfirmingDetails) setShowConfirmModal(false);
        }}
      >
        <section className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
          <div className="overflow-y-auto p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-100">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <h2 id={confirmTitleId} className="text-2xl font-black leading-tight">
                  Share booking details?
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Share only after you have the gather point, drop-off point, ride app, estimated fare, fare split, payment method, and who receives payment after the ride. Riders confirm ride details after this step.
                </p>
              </div>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
              <input
                type="checkbox"
                checked={confirmUnderstood}
                onChange={(event) => setConfirmUnderstood(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
              />
              <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
                I understand the ride fare is paid after the ride outside RidePod.
              </span>
            </label>

            {confirmError ? (
              <p className="mt-4 rounded-[14px] border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm font-bold text-rose-100">
                {confirmError}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
            <button
              type="button"
              disabled={isConfirmingDetails}
              onClick={() => setShowConfirmModal(false)}
              className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!confirmUnderstood || isConfirmingDetails}
              onClick={confirmBookingDetails}
              className={cn(
                "min-h-12 rounded-2xl border text-sm font-black transition",
                confirmUnderstood && !isConfirmingDetails
                  ? "border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] hover:brightness-105"
                  : "cursor-not-allowed border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
              )}
            >
                {isConfirmingDetails ? "Sharing..." : "Share details"}
            </button>
          </div>
        </section>
      </div>
    ) : null}
    {showReviewModal ? (
      <div
        className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={reviewTitleId}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSavingAcknowledgement) setShowReviewModal(false);
        }}
      >
        <section className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
          <div className="overflow-y-auto p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-100">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <h2 id={reviewTitleId} className="text-2xl font-black leading-tight">
                  Review ride app details
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Review the confirmed details before the ride starts.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-blue-300/15 bg-[rgba(2,6,23,0.34)] px-4">
              {detailRows.map(([label, value]) => (
                <SelfSettleBookingDetailRow key={label} label={label} value={value} />
              ))}
            </div>

            <div className="mt-5 rounded-[18px] border border-blue-300/20 bg-blue-400/10 p-4">
              <p className="text-sm font-black text-blue-100">Important</p>
              <ul className="mt-3 grid gap-2">
                {[
                  "RidePod only helps your group connect.",
                  "RidePod does not book the ride app.",
                  "RidePod does not verify or protect the final ride fare.",
                  "Confirm the estimated fare and split method before the ride starts.",
                  "Do not send large payments before confirming the ride details.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
              <input
                type="checkbox"
                checked={reviewUnderstood}
                onChange={(event) => setReviewUnderstood(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
              />
              <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
                I understand the ride fare is paid after the ride outside RidePod.
              </span>
            </label>

            {acknowledgementError ? (
              <p className="mt-4 rounded-[14px] border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm font-bold text-rose-100">
                {acknowledgementError}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
            <button
              type="button"
              disabled={isSavingAcknowledgement}
              onClick={() => setShowReviewModal(false)}
              className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back to details
            </button>
            <button
              type="button"
              disabled={!reviewUnderstood || isSavingAcknowledgement}
              onClick={acknowledgeSelfSettleDetails}
              className={cn(
                "min-h-12 rounded-2xl border text-sm font-black transition",
                reviewUnderstood && !isSavingAcknowledgement
                  ? "border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] hover:brightness-105"
                  : "cursor-not-allowed border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
              )}
            >
              {isSavingAcknowledgement ? "Saving..." : "I understand"}
            </button>
          </div>
        </section>
      </div>
    ) : null}
    </>
  );
}

type SelfSettleBookingDetailsDraft = {
  rideAppUsed: string;
  pickupVenue: string;
  pickupEta: string;
  confirmBy: string;
  estimatedFare: string;
  fareScreenshotName: string;
  splitMethod: string;
  paymentMethod: string;
  vehicleColor: string;
  carIdentifier: string;
  driverName: string;
  bookingNote: string;
};

type SelfSettleRideAppBookingDetails = {
  rideAppUsed: string;
  rideAppName: string;
  pickupVenue: string;
  pickupEta: string;
  confirmBy: string;
  estimatedFare: string;
  fareScreenshotName: string;
  splitMethod: string;
  paymentMethod: string;
  vehicleColor: string;
  vehicleIdentifier: string;
  driverName: string;
  note: string;
};

const rideAppUsedOptions = ["Uber", "HKTaxi", "DiDi", "Other"];
const splitMethodOptions = ["Equal split", "Pay host after ride", "Agree in chat", "Other"];
const paymentMethodOptions = ["Cash", "PayMe", "FPS", "Other"];

function getRideAppBookingTriggerDisplay(ride: HomeRide) {
  if (ride.rideAppBookingTrigger === "minimum_riders_confirmed") {
    const maxJoinedRiders = Math.max(1, ride.seatsTotal - 1);
    const minimum = Math.max(
      1,
      Math.min(maxJoinedRiders, ride.rideAppMinimumConfirmedRiders ?? ride.rideAppRequiredConfirmations ?? Math.min(2, maxJoinedRiders)),
    );

    return `At least ${minimum} rider${minimum === 1 ? "" : "s"} to go`;
  }

  return "all seats confirmed";
}

function getRideAppAcceptedPaymentDisplay(ride: HomeRide) {
  return ride.rideAppAcceptedPaymentMethods?.length
    ? ride.rideAppAcceptedPaymentMethods.join(", ")
    : ride.paymentMethod ?? "Agree in chat before the ride";
}

function SelfSettleBookingDetailsDisplay({ details }: { details: SelfSettleRideAppBookingDetails }) {
  const rows = [
    ["Ride app", details.rideAppName || details.rideAppUsed],
    ["Gather point", details.pickupVenue],
    ["Pickup time / ETA", details.pickupEta],
    ["Confirm-by time", details.confirmBy],
    ["Estimated fare", details.estimatedFare],
    ["Fare estimate screenshot", details.fareScreenshotName || "Optional, not uploaded"],
    ["Split method", details.splitMethod],
    ["Payment method", details.paymentMethod],
    ["Booking note", details.note],
    ["Vehicle color", details.vehicleColor],
    ["Car identifier / plate shown in app", details.vehicleIdentifier],
    ["Driver name shown in ride app", details.driverName],
  ].filter(([, value]) => value.trim().length > 0);

  return (
    <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-4">
      <div className="border-b border-[var(--rp-border)] py-3">
        <h3 className="text-base font-black text-[var(--rp-text)]">Ride app booking details</h3>
        <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          Ride fare is paid outside RidePod.
        </p>
      </div>
      <dl className="divide-y divide-[var(--rp-border)]">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-3 min-[420px]:grid-cols-[132px_1fr] min-[420px]:gap-3">
            <dt className="text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted)]">{label}</dt>
            <dd className="min-w-0 break-words text-sm font-black leading-6 text-[var(--rp-text)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function buildSelfSettleBookingChatHref(rideId: string, details: SelfSettleRideAppBookingDetails | null) {
  if (!details) return `/pods/${rideId}/chat`;

  const params = new URLSearchParams({
    bookingDetailsShared: "1",
    pickupVenue: details.pickupVenue,
    eta: details.pickupEta,
  });

  if (details.estimatedFare) params.set("estimatedFare", details.estimatedFare);
  if (details.confirmBy) params.set("confirmBy", details.confirmBy);
  if (details.splitMethod) params.set("splitMethod", details.splitMethod);
  if (details.paymentMethod) params.set("paymentMethod", details.paymentMethod);
  if (details.note) params.set("bookingNote", details.note);

  return `/pods/${rideId}/chat?${params.toString()}`;
}

export function SelfSettleHostBookingStatusCard({ ride }: { ride: HomeRide }) {
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [rideAppBookingShared, setRideAppBookingShared] = useState(ride.bookingDetailsShared === true);
  const [podStatus, setPodStatus] = useState<"booking_details_needed" | "booking_details_shared">(
    ride.bookingDetailsShared === true ? "booking_details_shared" : "booking_details_needed",
  );
  const [detailVersion, setDetailVersion] = useState(() => getRideAppCurrentDetailVersion(ride));
  const [rideAppBookingDetails, setRideAppBookingDetails] = useState<SelfSettleRideAppBookingDetails | null>(null);
  const [bookingDetailsDraft, setBookingDetailsDraft] = useState<SelfSettleBookingDetailsDraft>({
    rideAppUsed: "",
    pickupVenue: "",
    pickupEta: "",
    confirmBy: formatSelfSettleConfirmBy(getRideAppConfirmByDate(ride)),
    estimatedFare: ride.estimatedRideAppFare ?? "",
    fareScreenshotName: ride.rideAppFareEstimateScreenshotName ?? "",
    splitMethod: ride.splitMethod ?? "",
    paymentMethod: ride.paymentMethod ?? "",
    vehicleColor: "",
    carIdentifier: "",
    driverName: "",
    bookingNote: "",
  });
  const titleId = useId();
  const isHost = isRideAppSelfSettlePod(ride) && getCurrentUserIsHost(ride);
  const hasJoinedRiders = ride.joinedRiders.length > 0;
  const cardTitle = rideAppBookingShared
    ? "Ride app booking shared"
    : hasJoinedRiders
      ? "Waiting for host details"
      : "Waiting for riders";
  const cardBody = rideAppBookingShared
    ? "Riders can review the gather point, fare estimate, split method, and after-ride payment recipient."
    : hasJoinedRiders
      ? "Share fare estimate, split method, payment method, gather point, and confirm-by time before riders can confirm."
      : "Riders can join and chat before you book the external ride app.";
  const bookingDetailsErrors = {
    rideAppUsed: bookingDetailsDraft.rideAppUsed ? "" : "Choose the ride app used.",
    pickupVenue: bookingDetailsDraft.pickupVenue.trim() ? "" : "Add a gather point.",
    pickupEta: bookingDetailsDraft.pickupEta.trim() ? "" : "Add a pickup time or ETA.",
    confirmBy: bookingDetailsDraft.confirmBy.trim() ? "" : "Add a confirm-by time.",
    estimatedFare: bookingDetailsDraft.estimatedFare.trim() ? "" : "Add the estimated ride app fare.",
    splitMethod: bookingDetailsDraft.splitMethod ? "" : "Choose a split method.",
    paymentMethod: bookingDetailsDraft.paymentMethod ? "" : "Choose a payment method.",
  };
  const bookingDetailsValid = Object.values(bookingDetailsErrors).every((message) => !message);
  const bookingDetailsChatHref = buildSelfSettleBookingChatHref(ride.id, rideAppBookingDetails);

  function updateBookingDetailsDraft(field: keyof SelfSettleBookingDetailsDraft, value: string) {
    setBookingDetailsDraft((current) => ({ ...current, [field]: value }));
  }

  function openBookingDetailsModal() {
    if (rideAppBookingDetails) {
      setBookingDetailsDraft({
        rideAppUsed: rideAppBookingDetails.rideAppUsed,
        pickupVenue: rideAppBookingDetails.pickupVenue,
        pickupEta: rideAppBookingDetails.pickupEta,
        confirmBy: rideAppBookingDetails.confirmBy,
        estimatedFare: rideAppBookingDetails.estimatedFare,
        fareScreenshotName: rideAppBookingDetails.fareScreenshotName,
        splitMethod: rideAppBookingDetails.splitMethod,
        paymentMethod: rideAppBookingDetails.paymentMethod,
        vehicleColor: rideAppBookingDetails.vehicleColor,
        carIdentifier: rideAppBookingDetails.vehicleIdentifier,
        driverName: rideAppBookingDetails.driverName,
        bookingNote: rideAppBookingDetails.note,
      });
    }

    setShowBookingDetailsModal(true);
  }

  function handleBookingDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookingDetailsValid) return;
    const nextBookingDetails = {
      rideAppUsed: bookingDetailsDraft.rideAppUsed,
      rideAppName: bookingDetailsDraft.rideAppUsed,
      pickupVenue: bookingDetailsDraft.pickupVenue.trim(),
      pickupEta: bookingDetailsDraft.pickupEta.trim(),
      confirmBy: bookingDetailsDraft.confirmBy.trim(),
      estimatedFare: bookingDetailsDraft.estimatedFare.trim(),
      fareScreenshotName: bookingDetailsDraft.fareScreenshotName.trim(),
      splitMethod: bookingDetailsDraft.splitMethod,
      paymentMethod: bookingDetailsDraft.paymentMethod,
      vehicleColor: bookingDetailsDraft.vehicleColor.trim(),
      vehicleIdentifier: bookingDetailsDraft.carIdentifier.trim(),
      driverName: bookingDetailsDraft.driverName.trim(),
      note: bookingDetailsDraft.bookingNote.trim(),
    };
    const nextRideSnapshot: Partial<HomeRide> = {
      rideAppProviderName: nextBookingDetails.rideAppName,
      pickupLabel: nextBookingDetails.pickupVenue,
      pickupTime: nextBookingDetails.pickupEta,
      estimatedRideAppFare: nextBookingDetails.estimatedFare,
      rideAppBookingDetails: {
        ...ride.rideAppBookingDetails,
        estimatedFare: nextBookingDetails.estimatedFare,
      },
      splitMethod: nextBookingDetails.splitMethod,
      paymentMethod: nextBookingDetails.paymentMethod,
    };
    const meaningfulUpdate = rideAppBookingShared
      ? isMeaningfulRideAppDetailUpdate(ride, { ...ride, ...nextRideSnapshot })
      : { isMeaningful: false, updateType: null };
    const reviewPatch =
      meaningfulUpdate.isMeaningful && meaningfulUpdate.updateType
        ? applyRideAppMeaningfulDetailUpdate({ ...ride, ...nextRideSnapshot }, meaningfulUpdate.updateType)
        : {};
    const nextDetailVersion =
      typeof reviewPatch.bookingDetailsVersion === "number" ? reviewPatch.bookingDetailsVersion : detailVersion;
    const nextPatch: Partial<HomeRide> = {
      ...reviewPatch,
      bookingDetailsShared: true,
      rideAppBookingDetailsConfirmed: true,
      rideAppBookingDetailsFinalized: true,
      rideAppProviderName: nextBookingDetails.rideAppName,
      pickupLabel: nextBookingDetails.pickupVenue,
      pickupTime: nextBookingDetails.pickupEta,
      estimatedRideAppFare: nextBookingDetails.estimatedFare,
      rideAppBookingDetails: nextRideSnapshot.rideAppBookingDetails,
      splitMethod: nextBookingDetails.splitMethod,
      paymentMethod: nextBookingDetails.paymentMethod,
      rideAppFareEstimateScreenshotName: nextBookingDetails.fareScreenshotName || null,
    };

    setRideAppBookingDetails(nextBookingDetails);
    setDetailVersion(nextDetailVersion);
    setRideAppBookingShared(true);
    setPodStatus(rideAppBookingShared ? "booking_details_shared" : "booking_details_shared");
    saveStoredSelfSettleRidePatch(ride.id, nextPatch);
    window.dispatchEvent(
      new CustomEvent("ridepod:self-settle-booking-shared", {
        detail: {
          podId: ride.id,
          detailVersion: nextDetailVersion,
          status: meaningfulUpdate.isMeaningful ? "needs_review" : "booking_details_shared",
          confirmedAt: new Intl.DateTimeFormat("en", {
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date()),
        },
      }),
    );
    setShowBookingDetailsModal(false);
  }

  if (!isHost) return null;

  return (
    <>
      <section
        data-pod-status={podStatus}
        className="rounded-[24px] border border-[var(--rp-border-strong)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--rp-primary)_12%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-primary)]">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-[var(--rp-text)]">
              {cardTitle}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              {cardBody}
            </p>
            <p className="mt-2 text-xs font-black leading-5 text-[var(--rp-muted-strong)]">
              Ride fare is paid outside RidePod. Current details version: {detailVersion}.
            </p>
          </div>
        </div>

        {rideAppBookingShared ? (
          <div className="mt-4 grid gap-2">
            {rideAppBookingDetails ? <SelfSettleBookingDetailsDisplay details={rideAppBookingDetails} /> : null}
            <button
              type="button"
              onClick={openBookingDetailsModal}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
            >
              <Smartphone className="h-4 w-4" />
              Edit booking details
            </button>
            <Link
              href={bookingDetailsChatHref}
              className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-soft)] hover:text-[var(--rp-text)]"
            >
              Open chat
            </Link>
            <p className="text-center text-xs font-black leading-5 text-[var(--rp-muted-strong)]">
              Estimated fare is not verified by RidePod.
            </p>
          </div>
        ) : hasJoinedRiders ? (
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={openBookingDetailsModal}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
            >
              <Smartphone className="h-4 w-4" />
              Share booking details
            </button>
            <p className="text-center text-xs font-black leading-5 text-[var(--rp-muted-strong)]">
              Ride fare is paid outside RidePod.
            </p>
          </div>
        ) : null}
      </section>

      {showBookingDetailsModal ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowBookingDetailsModal(false);
          }}
        >
          <form
            onSubmit={handleBookingDetailsSubmit}
            className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]"
          >
            <div className="overflow-y-auto p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-primary)]">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <h2 id={titleId} className="text-2xl font-black leading-tight">
                    Share booking details
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                    Add the external ride app details your pod needs before pickup.
                  </p>
                </div>
              </div>

              <p className="mt-5 rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-sm font-bold leading-6 text-blue-100">
                Ride fare is paid outside RidePod. Estimated fare is not verified by RidePod. No live payment is taken in this version.
              </p>

              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm font-black text-[var(--rp-text)]">Ride app used</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {rideAppUsedOptions.map((option) => {
                      const selected = bookingDetailsDraft.rideAppUsed === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateBookingDetailsDraft("rideAppUsed", option)}
                          className={cn(
                            "min-h-11 rounded-[14px] border px-3 text-sm font-black transition",
                            selected
                              ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]"
                              : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] hover:border-[var(--rp-border-strong)]",
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {bookingDetailsErrors.rideAppUsed ? (
                    <p className="mt-2 text-xs font-bold text-amber-200">{bookingDetailsErrors.rideAppUsed}</p>
                  ) : null}
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--rp-text)]">Gather point</span>
                  <input
                    value={bookingDetailsDraft.pickupVenue}
                    onChange={(event) => updateBookingDetailsDraft("pickupVenue", event.target.value)}
                    placeholder="e.g. Central Pier 7 taxi stand"
                    className="min-h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                  />
                  <span className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                    Where riders meet before the host books.
                  </span>
                  {bookingDetailsErrors.pickupVenue ? (
                    <span className="text-xs font-bold text-amber-200">{bookingDetailsErrors.pickupVenue}</span>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--rp-text)]">Pickup time / ETA</span>
                  <input
                    value={bookingDetailsDraft.pickupEta}
                    onChange={(event) => updateBookingDetailsDraft("pickupEta", event.target.value)}
                    placeholder="e.g. 7:15 PM"
                    className="min-h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                  />
                  {bookingDetailsErrors.pickupEta ? (
                    <span className="text-xs font-bold text-amber-200">{bookingDetailsErrors.pickupEta}</span>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--rp-text)]">Confirm-by time</span>
                  <input
                    value={bookingDetailsDraft.confirmBy}
                    onChange={(event) => updateBookingDetailsDraft("confirmBy", event.target.value)}
                    placeholder="e.g. Today, 5:00 PM"
                    className="min-h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                  />
                  <span className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                    Recommended default is 24h from details shared, capped before pickup when pickup is sooner.
                  </span>
                  {bookingDetailsErrors.confirmBy ? (
                    <span className="text-xs font-bold text-amber-200">{bookingDetailsErrors.confirmBy}</span>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--rp-text)]">Estimated ride app fare</span>
                  <input
                    value={bookingDetailsDraft.estimatedFare}
                    onChange={(event) => updateBookingDetailsDraft("estimatedFare", event.target.value)}
                    placeholder="e.g. HK$120??60"
                    className="min-h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                  />
                  <span className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                    This estimate is not verified by RidePod.
                  </span>
                  {bookingDetailsErrors.estimatedFare ? (
                    <span className="text-xs font-bold text-amber-200">{bookingDetailsErrors.estimatedFare}</span>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--rp-text)]">Optional fare estimate screenshot</span>
                  <input
                    value={bookingDetailsDraft.fareScreenshotName}
                    onChange={(event) => updateBookingDetailsDraft("fareScreenshotName", event.target.value)}
                    placeholder="e.g. uber-estimate-730pm.png"
                    className="min-h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                  />
                  <span className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                    Local/mock placeholder only. RidePod does not verify ride app screenshots. Do not upload screenshots showing phone numbers, payment details, or private account info.
                  </span>
                </label>

                <div>
                  <p className="text-sm font-black text-[var(--rp-text)]">Split method</p>
                  <div className="mt-2 grid gap-2">
                    {splitMethodOptions.map((option) => {
                      const selected = bookingDetailsDraft.splitMethod === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateBookingDetailsDraft("splitMethod", option)}
                          className={cn(
                            "min-h-11 rounded-[14px] border px-3 text-left text-sm font-black transition",
                            selected
                              ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]"
                              : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] hover:border-[var(--rp-border-strong)]",
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {bookingDetailsErrors.splitMethod ? (
                    <p className="mt-2 text-xs font-bold text-amber-200">{bookingDetailsErrors.splitMethod}</p>
                  ) : null}
                </div>

                <div>
                  <p className="text-sm font-black text-[var(--rp-text)]">Payment method after ride</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {paymentMethodOptions.map((option) => {
                      const selected = bookingDetailsDraft.paymentMethod === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateBookingDetailsDraft("paymentMethod", option)}
                          className={cn(
                            "min-h-11 rounded-[14px] border px-3 text-sm font-black transition",
                            selected
                              ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]"
                              : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] hover:border-[var(--rp-border-strong)]",
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {bookingDetailsErrors.paymentMethod ? (
                    <p className="mt-2 text-xs font-bold text-amber-200">{bookingDetailsErrors.paymentMethod}</p>
                  ) : null}
                </div>

                <section className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
                  <div>
                    <h3 className="text-base font-black text-[var(--rp-text)]">Optional ride app details</h3>
                    <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                      Only share details needed for your pod to find the ride.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[var(--rp-text)]">Vehicle color</span>
                      <input
                        value={bookingDetailsDraft.vehicleColor}
                        onChange={(event) => updateBookingDetailsDraft("vehicleColor", event.target.value)}
                        className="min-h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[var(--rp-text)]">
                        Car identifier / plate shown in app
                      </span>
                      <input
                        value={bookingDetailsDraft.carIdentifier}
                        onChange={(event) => updateBookingDetailsDraft("carIdentifier", event.target.value)}
                        className="min-h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[var(--rp-text)]">
                        Driver name shown in ride app
                      </span>
                      <input
                        value={bookingDetailsDraft.driverName}
                        onChange={(event) => updateBookingDetailsDraft("driverName", event.target.value)}
                        className="min-h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[var(--rp-text)]">Booking note</span>
                      <textarea
                        value={bookingDetailsDraft.bookingNote}
                        onChange={(event) => updateBookingDetailsDraft("bookingNote", event.target.value)}
                        placeholder="e.g. Meet at the entrance. I?l confirm the car when it arrives."
                        rows={3}
                        className="min-h-24 resize-none rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
                      />
                    </label>
                  </div>
                </section>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
              <button
                type="button"
                onClick={() => setShowBookingDetailsModal(false)}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!bookingDetailsValid}
                className={cn(
                  "min-h-12 rounded-2xl border text-sm font-black transition",
                  bookingDetailsValid
                    ? "border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] hover:brightness-105"
                    : "cursor-not-allowed border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
                )}
              >
                Share details
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function PickupCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_92%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      <h2 className="text-xl font-black text-[var(--rp-text)]">{title}</h2>
      {children}
    </section>
  );
}

export function PickupReadyCards({
  ride,
  joinView,
  acceptedGuestCount,
  requiredGuestCount,
}: {
  ride: HomeRide;
  joinView: PodDetailJoinView;
  acceptedGuestCount: number;
  requiredGuestCount: number;
}) {
  if (!isPickupDetailView(joinView)) return null;

  const pickupPoint = ride.pickupLabel ?? ride.fromLabel;
  const dropoff = ride.dropoffLabel ?? ride.toLabel;
  const pickupTime = ride.pickupTime ?? ride.timeLabel;
  const partnerName = ride.taxiPartnerName ?? "Demo Taxi Partner";
  const airportHelper =
    ride.airportDirection === "from_airport"
      ? "Airport pickup details are included in the quote."
      : "Airport dropoff details are included in the quote.";
  const checklist = [
    "Arrive at the pickup point on time.",
    "Check taxi type and route details.",
    "Keep updates open for demo status changes.",
    ...(ride.airportDirection ? ["Use the listed terminal / pickup area."] : []),
  ];

  return (
    <div className="grid gap-3">
      {isActivePickupView(joinView) ? (
        <div className="inline-flex w-fit items-center rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] px-3 py-1.5 text-xs font-black text-[var(--rp-primary)]">
          Ready for pickup
        </div>
      ) : null}

      <PickupCard title="Pickup details">
        <dl className="mt-4">
          {ride.rideKind === "recurring" ? (
            <>
              <SummaryRow label="Ride date" value={ride.selectedRideDate ?? ride.dateLabel} />
              <SummaryRow label="Direction" value={ride.direction ?? "Outbound"} />
            </>
          ) : null}
          {ride.airportDirection ? (
            <SummaryRow
              label="Airport"
              value={ride.airportDirection === "from_airport" ? "From airport" : "To airport"}
            />
          ) : null}
          <SummaryRow label="Pickup point" value={pickupPoint} />
          <SummaryRow label="Pickup time" value={pickupTime} />
          <SummaryRow label="Dropoff" value={dropoff} />
          <SummaryRow label="Taxi partner" value={partnerName} />
          <SummaryRow label="Taxi type" value={ride.taxiType} />
          <SummaryRow label="Luggage" value={ride.luggage} />
          <SummaryRow label="Guests" value={`${acceptedGuestCount} / ${requiredGuestCount} accepted`} />
        </dl>
        {ride.airportDirection ? (
          <p className="mt-4 rounded-[14px] border border-blue-300/15 bg-blue-400/10 p-3 text-sm font-semibold leading-6 text-blue-100">
            {airportHelper}
          </p>
        ) : null}
        {ride.rideKind === "recurring" ? (
          <p className="mt-4 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            This pickup is for the selected ride date. Each recurring ride has its own quote and review state.
          </p>
        ) : null}
        <p className="mt-4 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Live GPS is not enabled in this beta. Use the pickup point shown above.
        </p>
      </PickupCard>

      <PickupCard title="Before pickup">
        <ul className="mt-4 grid gap-3">
          {checklist.map((item) => (
            <li key={item} className="flex gap-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--rp-primary)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href={`/pods/${ride.id}/review`}
          className="mt-4 min-h-10 rounded-2xl text-sm font-black text-[var(--rp-primary)]"
        >
          Report pickup issue
        </Link>
      </PickupCard>
    </div>
  );
}

function QuoteReviewModal({
  ride,
  acceptedGuestCount,
  requiredGuestCount,
  checked,
  onCheckedChange,
  onCancel,
  onConfirm,
  onDeclineRequest,
}: {
  ride: HomeRide;
  acceptedGuestCount: number;
  requiredGuestCount: number;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onDeclineRequest: () => void;
}) {
  const titleId = useId();
  const badge = airportBadgeLabel(ride);
  const aboveCap = ride.quoteAboveCap === true;
  const [fareReferenceOpen, setFareReferenceOpen] = useState(false);
  const deadlineInfo = getQuoteDeadlineInfo(ride, acceptedGuestCount, requiredGuestCount);
  const acceptBlocked = isQuoteAcceptanceBlocked(deadlineInfo);
  const totalQuoteCents = ride.quoteAmountCents ?? getPodDetailQuoteMoney(ride)?.quoteAmountCents ?? 0;
  const money = getPodDetailQuoteMoney(ride);
  const quoteSummaryRows = [
    ["Taxi partner quote", formatHkdCents(totalQuoteCents)],
    ["Fare share", money ? formatHkdCents(money.fareShareCents) : "Quote pending"],
    ["RidePod fee", money ? formatHkdCents(money.platformFeeCents) : "Quote pending"],
    ["Your total", money ? formatHkdCents(money.guestChargeCents) : `${getEstimatedShareRangeLabel(ride)} per person`],
    ["Taxi partner", ride.taxiPartnerName ?? "Golden Taxi Partner"],
    ["Accept by", `${getQuoteExpiresInLabel(ride)} remaining`],
  ];

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
      <section className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-2xl font-black leading-tight">
              Accept taxi quote?
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              {aboveCap
                ? "This quote is above the original fare cap. Accept only if you agree to the higher amount."
                : "You're accepting the selected taxi partner quote for this shared pod."}
            </p>
          </div>
          {badge ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/15 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-300">
              <Plane className="h-3.5 w-3.5" />
              {badge}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3">
          <dl className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
            {quoteSummaryRows.map(([label, value]) => (
              <SummaryRow key={label} label={label} value={value} />
            ))}
          </dl>
          <div className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
              Quote acceptance
            </p>
            <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">
              {acceptedGuestCount} / {requiredGuestCount} guests accepted
            </p>
            <p className="mt-2 text-xs font-bold text-[var(--rp-muted-strong)]">
              Riders who accept keep their spot. Anyone still pending at the deadline may be treated as out of the pod.
            </p>
          </div>
          <section className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)]">
            <button
              type="button"
              onClick={() => setFareReferenceOpen((open) => !open)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left text-sm font-black text-[var(--rp-primary)]"
              aria-expanded={fareReferenceOpen}
            >
              <span>View fare reference</span>
              <span aria-hidden="true">{fareReferenceOpen ? "-" : "+"}</span>
            </button>
            {fareReferenceOpen ? (
              <div className="border-t border-[var(--rp-border)] p-3">
                <PodDetailFareReferenceRows ride={ride} />
              </div>
            ) : null}
          </section>
          <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            {acceptBlocked
              ? "This quote can no longer be accepted. No live money was charged."
              : "Taxi partner quote is separate from the RidePod fee. No live payment is charged now."}
          </p>
        </div>

        {!acceptBlocked ? (
        <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
          />
          <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
            I understand no live payment is charged now.
          </span>
        </label>
        ) : null}

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
            disabled={!checked || acceptBlocked}
            onClick={onConfirm}
            className={cn(
              "min-h-12 rounded-2xl border text-sm font-black transition",
              checked && !acceptBlocked
                ? "border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] hover:brightness-105"
                : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
            )}
          >
            {acceptBlocked ? "Accept quote disabled" : "Accept quote"}
          </button>
        </div>
        {!acceptBlocked ? (
          <button
            type="button"
            onClick={onDeclineRequest}
            className="mt-3 min-h-10 w-full rounded-2xl text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Decline quote
          </button>
        ) : null}
      </section>
    </div>
  );
}

function DeclineQuoteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.74)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[420px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">
          Decline taxi quote?
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          The organizer may request another quote or choose another option.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Keep reviewing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-soft)]"
          >
            Decline quote
          </button>
        </div>
      </section>
    </div>
  );
}

function PolicyActionModal({
  title,
  body,
  helper,
  keepLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  helper?: string;
  keepLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.74)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[420px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">
          {title}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{body}</p>
        {helper ? (
          <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            {helper}
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            {keepLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-soft)]"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function CancelAttendanceModal({
  isSubmitting,
  policyCopy,
  onCancel,
  onConfirm,
}: {
  isSubmitting: boolean;
  policyCopy: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.74)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <section className="w-full max-w-[420px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">
          Cancel attendance?
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          The host will be notified that you can&rsquo;t make it.
        </p>
        <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          {policyCopy}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)] disabled:opacity-60"
          >
            Keep my spot
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="min-h-12 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-soft)] disabled:opacity-60"
          >
            Cancel attendance
          </button>
        </div>
      </section>
    </div>
  );
}

export function LeaveSelfSettlePodModal({
  confirmed,
  onCancel,
  onConfirm,
}: {
  confirmed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.74)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[420px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">
          {confirmed ? "Leave after confirming?" : "Leave pod?"}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          {confirmed
            ? "You already confirmed ride details. Leaving now may affect your RidePod trust score."
            : "Your seat hold will be released for other riders."}
        </p>
        <p className="mt-3 rounded-[16px] border border-cyan-200/18 bg-cyan-300/10 px-4 py-3 text-sm font-black leading-6 text-cyan-100">
          {confirmed ? "Ride fare is paid outside RidePod." : "No RidePod fee was confirmed."}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Stay in pod
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-soft)]"
          >
            {confirmed ? "Leave anyway" : "Leave pod"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SecondaryCta({
  children,
  href,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = cn(
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border px-4 text-sm font-black transition",
    disabled
      ? "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]"
      : "border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)] hover:bg-[var(--rp-card-muted)]",
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

function getCancellationPolicyCopy(joinView: PodDetailJoinView) {
  if (["quote_ready", "quote_deadline_soon", "late_confirmation"].includes(joinView)) {
    return "You can leave before accepting the taxi quote.";
  }

  if (joinView === "quote_accepted") {
    return "You can cancel acceptance before the quote deadline. This may delay or cancel the pod.";
  }

  if (joinView === "all_accepted") {
    return "All guests accepted this quote. Free cancellation is no longer available.";
  }

  if (["ready_for_pickup", "partner_arrived", "at_pickup", "ride_started"].includes(joinView)) {
    return "Taxi partner accepted this shared ride. Cancellation may be reviewed.";
  }

  return "You can leave before accepting the taxi quote.";
}

export function SelfSettleJoinSuccessModal({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.74)] px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="self-settle-joined-title"
        className="relative w-full max-w-[340px] rounded-[26px] border border-cyan-200/25 bg-[var(--rp-shell)] px-5 pb-6 pt-14 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-[var(--rp-muted-strong)] transition hover:border-cyan-200/35 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-cyan-200/35 bg-cyan-300/12 text-cyan-100">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 id="self-settle-joined-title" className="mt-4 text-center text-2xl font-black leading-tight">
          Now you joined the pod
        </h2>
      </section>
    </div>
  );
}

export function SelfSettleJoinConfirmationModal({
  ride,
  seatsUsed,
  checked,
  waiverSource = "none",
  plusWaiversRemaining,
  plusWaiversTotal,
  onCheckedChange,
  onCancel,
  onConfirm,
}: {
  ride: HomeRide;
  seatsUsed: number;
  checked: boolean;
  waiverSource?: JoinFeeWaiverSource;
  plusWaiversRemaining?: number;
  plusWaiversTotal?: number;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const estimatedFare = formatRideAppEstimatedFarePerPerson(ride);
  const pricingConfig = useRidePodPricingConfig();
  const rideAppJoinFeeCents = calculateRideAppJoinFee(pricingConfig);
  const rideAppJoinFeeLabel = rideAppJoinFeeCents > 0 ? formatHKD(rideAppJoinFeeCents) : "Waived";
  const hostTrustSummary = getRideAppTrustSummary(getRideAppHostTrustUserId(ride));
  const hostTrustCopy = getRideAppHostTrustJoinCopy(hostTrustSummary);
  const summaryRows = [
    ["Route", `${ride.fromLabel} \u2192 ${ride.toLabel}`],
    ["Date & time", `${ride.dateLabel} \u00b7 ${ride.timeLabel}`],
    ["Gather point", ride.pickupLabel ?? "Host must set before riders confirm"],
    ["Estimated fare", ride.estimatedRideAppFare ?? estimatedFare ?? "Confirm in chat"],
    ["Host books when", getRideAppBookingTriggerDisplay(ride)],
    ["Split method", ride.splitMethod ?? "Equal split"],
    ["Payment timing", "After ride"],
    ["Accepted payment", getRideAppAcceptedPaymentDisplay(ride)],
    [
      waiverSource === "launch"
        ? "Launch waiver"
        : waiverSource === "plus"
          ? "Plus waiver"
          : "RidePod join fee",
      waiverSource === "none" ? `${rideAppJoinFeeLabel} when confirming ride details` : "Available when confirming ride details",
    ],
    ["Ride fare", "After ride directly to booker"],
    ["Seats", `${Math.min(seatsUsed, ride.seatsTotal)} / ${ride.seatsTotal} seats filled`],
  ];
  const riskItems = [
    "RidePod does not book the ride app.",
    "RidePod does not collect or split the ride fare.",
    "RidePod does not verify or protect the final ride fare.",
    "Confirm the estimated fare and split method before the ride starts.",
    "Ride fare is paid outside RidePod after the ride, based on the final ride app fare.",
    "RidePod cannot resolve external payment disputes.",
  ];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <div className="overflow-y-auto p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-200">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <h2 id={titleId} className="text-2xl font-black leading-tight">
                Join ride app pod?
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                RidePod helps you find and chat with people going the same way. The ride app booking and fare split are handled directly by pod members.
              </p>
            </div>
          </div>

          <dl className="mt-5 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
            {summaryRows.map(([label, value]) => (
              <SummaryRow key={label} label={label} value={value} />
            ))}
          </dl>

          <p className="mt-4 rounded-[14px] border border-blue-300/25 bg-blue-400/10 px-3 py-2 text-xs font-black leading-5 text-blue-100">
            {hostTrustCopy}
          </p>

          <ul className="mt-5 grid gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
            {riskItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-[14px] border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] px-3 py-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            {waiverSource === "launch"
              ? "Launch waiver is available when you confirm ride details. Ride fare is paid outside RidePod."
              : waiverSource === "plus"
                ? `Plus waiver is available when you confirm ride details. Ride fare is paid outside RidePod.${plusWaiversRemaining !== undefined && plusWaiversTotal !== undefined ? ` ${plusWaiversRemaining} / ${plusWaiversTotal} monthly waivers available before confirmation.` : ""}`
                : `${ridePodPricingCopy.rideAppJoinFeeHelper} No live payment is taken in this version. The estimated ride fare is for reference only.`}
          </p>

          <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onCheckedChange(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
            />
            <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
              I understand the ride fare is paid after the ride outside RidePod.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
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
                ? "border-[var(--rp-primary)]/65 bg-[var(--rp-card-soft)] text-[#f2c15b] hover:bg-[var(--rp-card-muted)]"
                : "cursor-not-allowed border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[#f2c15b]/45",
            )}
          >
            Confirm
          </button>
        </div>
      </section>
    </div>
  );
}

export function StickyPodDetailCta({
  ride,
  seatsUsed,
  joinView,
  acceptedGuestCount,
  requiredGuestCount,
  onLockSeat,
  onJoinSelfSettle,
  onLeaveSelfSettle,
  onAcceptQuote,
  onDeclineQuote,
  onCancelSeat,
  onCancelQuoteAcceptance,
  onRequestCancellation,
  onMarkAtPickup,
  onCancelAttendance,
  attendanceMessage,
  attendanceError,
  canLockSeatAfterCancel,
  isCancellingAttendance,
  routeChangedAfterQuoteReady = false,
  hideQuoteActions = false,
}: {
  ride: HomeRide;
  seatsUsed: number;
  joinView: PodDetailJoinView;
  acceptedGuestCount: number;
  requiredGuestCount: number;
  onLockSeat: (luggage?: LuggageContribution) => void;
  onJoinSelfSettle?: () => void;
  onLeaveSelfSettle?: () => void;
  onAcceptQuote: () => void;
  onDeclineQuote: () => void;
  onCancelSeat: () => void;
  onCancelQuoteAcceptance: () => void;
  onRequestCancellation: () => void;
  onMarkAtPickup: () => void;
  onCancelAttendance: () => Promise<boolean>;
  attendanceMessage?: string | null;
  attendanceError?: string | null;
  canLockSeatAfterCancel?: boolean;
  isCancellingAttendance?: boolean;
  routeChangedAfterQuoteReady?: boolean;
  hideQuoteActions?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [showLockModal, setShowLockModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showSelfSettleJoinModal, setShowSelfSettleJoinModal] = useState(false);
  const [showSelfSettleJoinSuccessModal, setShowSelfSettleJoinSuccessModal] = useState(false);
  const [showLeaveSelfSettleModal, setShowLeaveSelfSettleModal] = useState(false);
  const [policyModal, setPolicyModal] = useState<
    null | "cancel_seat" | "cancel_acceptance" | "request_cancellation" | "partner_request_cancellation"
  >(null);
  const [showCancelAttendanceModal, setShowCancelAttendanceModal] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [selfSettleUnderstood, setSelfSettleUnderstood] = useState(false);
  const [lockSeatLuggage, setLockSeatLuggage] = useState<LuggageContribution>({
    bagsCount: 0,
    hasLargeLuggage: false,
  });
  const rideAppWaiver = useRideAppWaiverState();
  const membership = useRidePodMembershipState();

  function closeLockModal() {
    setShowLockModal(false);
    setUnderstood(false);
    setLockSeatLuggage({ bagsCount: 0, hasLargeLuggage: false });
  }

  function openLockSeatModal() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setShowLockModal(true);
  }

  function confirmLockSeat() {
    if (!understood) return;
    if (lockSeatWaiverSource === "launch") {
      markRideAppWaiverUsed();
    } else if (lockSeatWaiverSource === "plus") {
      consumeRidePodPlusJoinFeeWaiver();
    }
    onLockSeat(lockSeatLuggage);
    closeLockModal();
  }

  function closeQuoteModal() {
    setShowQuoteModal(false);
    setUnderstood(false);
  }

  function confirmAcceptQuote() {
    if (!understood) return;
    onAcceptQuote();
    closeQuoteModal();
  }

  function confirmDeclineQuote() {
    onDeclineQuote();
    setShowDeclineModal(false);
    closeQuoteModal();
  }

  function confirmPolicyAction() {
    if (policyModal === "cancel_seat") onCancelSeat();
    if (policyModal === "cancel_acceptance") onCancelQuoteAcceptance();
    if (policyModal === "request_cancellation" || policyModal === "partner_request_cancellation") {
      onRequestCancellation();
    }
    setPolicyModal(null);
  }

  async function confirmCancelAttendance() {
    const cancelled = await onCancelAttendance();
    if (cancelled) setShowCancelAttendanceModal(false);
  }

  function closeSelfSettleJoinModal() {
    setShowSelfSettleJoinModal(false);
    setSelfSettleUnderstood(false);
  }

  function openSelfSettleJoinModal() {
    setShowSelfSettleJoinModal(true);
  }

  function confirmSelfSettleJoin() {
    if (!selfSettleUnderstood) return;
    onJoinSelfSettle?.();
    closeSelfSettleJoinModal();
    setShowSelfSettleJoinSuccessModal(true);
  }

  function confirmLeaveSelfSettle() {
    if (user && isRideAppSelfSettlePod(ride)) {
      createRideAppTrustEvent({
        userId: user.id,
        podId: ride.id,
        eventType: ride.bookingDetailsShared === true ? "ride_app_rider_left_late" : "ride_app_rider_left_early",
        reason:
          ride.bookingDetailsShared === true
            ? "Rider left after booking details were shared."
            : "Rider left before booking details were shared.",
        createdBy: user.id,
      });
    }
    onLeaveSelfSettle?.();
    setShowLeaveSelfSettleModal(false);
  }

  const chatHref = `/pods/${ride.id}/chat`;
  const reportIssueHref = `/pods/${ride.id}/review`;
  const showSelfSettleJoinCta = getCurrentUserCanJoinSelfSettlePod(ride, joinView);
  const showSelfSettleJoinedCta = getCurrentUserIsJoinedSelfSettlePod(ride, joinView);
  const showSelfSettleHostCta =
    isRideAppSelfSettlePod(ride) &&
    getCurrentUserIsHost(ride) &&
    !ride.rideAppBookingDetailsFinalized &&
    (joinView === "quote_pending" || joinView === "joined");
  const launchWaiverAvailable = rideAppWaiver.claimed && !rideAppWaiver.used;
  const plusWaiverAvailable = hasRidePodPlusJoinFeeWaiver(membership);
  const selfSettleWaiverSource: JoinFeeWaiverSource =
    showSelfSettleJoinCta && launchWaiverAvailable
      ? "launch"
      : showSelfSettleJoinCta && plusWaiverAvailable
        ? "plus"
        : "none";
  const lockSeatWaiverSource: JoinFeeWaiverSource =
    launchWaiverAvailable ? "launch" : plusWaiverAvailable ? "plus" : "none";
  const rideAppTrustSummary = user ? getRideAppTrustSummary(user.id) : null;
  const rideAppAccessNotice = rideAppTrustSummary && isRideAppSelfSettlePod(ride)
    ? getRideAppAccessNotice(rideAppTrustSummary)
    : null;
  const taxiPartnerChatAccess = !isRideAppSelfSettlePod(ride) ? getTaxiPartnerChatAccessState(ride) : null;
  const taxiChatUnlocked = taxiPartnerChatAccess?.canAccess === true;
  const taxiChatHelper = taxiPartnerChatAccess?.helper ?? "Chat opens after quote acceptance and taxi partner acceptance.";
  const rejoinRestriction = getRideAppRejoinRestrictionCopy(ride, ride.seatsUsed < ride.seatsTotal);

  if (joinView === "quote_pending" && !showSelfSettleJoinCta && !showSelfSettleHostCta && !rejoinRestriction) {
    return null;
  }

  const quoteActionView = ["quote_ready", "quote_deadline_soon", "late_confirmation"].includes(joinView) && !routeChangedAfterQuoteReady && !hideQuoteActions;
  const quoteBlockedView = ["quote_expired", "too_late_to_confirm"].includes(joinView);
  const cancellationPolicyCopy = getCancellationPolicyCopy(joinView);
  const quoteProvidedCardOwnsActions =
    hideQuoteActions &&
    ["quote_ready", "quote_deadline_soon", "late_confirmation", "quote_expired", "too_late_to_confirm", "quote_accepted", "all_accepted", "quote_declined"].includes(joinView) &&
    !routeChangedAfterQuoteReady;

  if (quoteProvidedCardOwnsActions) return null;
  if (joinView === "joined" && !isRideAppSelfSettlePod(ride)) return null;
  if (showSelfSettleJoinedCta) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-3 lg:bottom-0 lg:left-72">
        <div className="mx-auto max-w-[520px] rounded-[24px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_94%,transparent)] p-3 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl">
          {showSelfSettleJoinCta ? (
            <div className="grid gap-2">
              <PrimaryCta onClick={rideAppAccessNotice?.blocked ? undefined : openSelfSettleJoinModal} disabled={rideAppAccessNotice?.blocked}>
                <Smartphone className="h-5 w-5" />
                Join
              </PrimaryCta>
              {rideAppAccessNotice ? (
                <p className="rounded-[14px] border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-center text-xs font-bold leading-5 text-blue-100">
                  {rideAppAccessNotice.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {!showSelfSettleJoinCta && rejoinRestriction ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                {rejoinRestriction.kind === "full" ? <UsersRound className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                {rejoinRestriction.cta}
              </PrimaryCta>
              <p className="rounded-[14px] border border-[var(--rp-primary)]/20 bg-[var(--rp-primary)]/10 px-3 py-2 text-center text-xs font-bold leading-5 text-[var(--rp-primary)]">
                {rejoinRestriction.helper}
              </p>
            </div>
          ) : null}

          {showSelfSettleHostCta ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <Smartphone className="h-5 w-5" />
                Share booking details
              </PrimaryCta>
              <p className="px-2 text-center text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">
                Book the ride app outside RidePod, then share details and after-ride settlement instructions.
              </p>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted)]">
                Details stay local/mock in this version.
              </p>
            </div>
          ) : null}

          {joinView === "full" ? (
            <PrimaryCta
              onClick={() => {
                // TODO: Add waitlist placeholder flow when mock waitlist state exists.
              }}
            >
              <Clock3 className="h-5 w-5" />
              Join waitlist
            </PrimaryCta>
          ) : null}

          {quoteActionView ? (
            <div className="grid gap-2">
              <PrimaryCta onClick={() => setShowQuoteModal(true)}>
                <CheckCircle2 className="h-5 w-5" />
                {ride.quoteAboveCap ? "Accept higher quote" : "Review quote"}
              </PrimaryCta>
              <SecondaryCta onClick={() => setShowDeclineModal(true)}>Decline quote</SecondaryCta>
              <SecondaryCta disabled>Chat locked</SecondaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Accept the selected quote before taxi partner chat can open.
              </p>
            </div>
          ) : null}

          {quoteBlockedView ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <Clock3 className="h-5 w-5" />
                View updates
              </PrimaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                {joinView === "quote_expired"
                  ? "The organizer may request another taxi partner quote."
                  : "Request another quote or choose a new time."}
              </p>
            </div>
          ) : null}

          {joinView === "quote_accepted" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <CheckCircle2 className="h-5 w-5" />
                Quote accepted
              </PrimaryCta>
              <SecondaryCta disabled>Chat locked</SecondaryCta>
              <SecondaryCta onClick={() => setPolicyModal("cancel_acceptance")}>Cancel quote acceptance</SecondaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Chat opens when all required riders accept and the taxi partner accepts the job.
              </p>
            </div>
          ) : null}

          {joinView === "all_accepted" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <CheckCircle2 className="h-5 w-5" />
                View updates
              </PrimaryCta>
              <SecondaryCta disabled>Chat locked</SecondaryCta>
              <SecondaryCta onClick={() => setPolicyModal("request_cancellation")}>Request cancellation</SecondaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Waiting for taxi partner to accept the job.
              </p>
            </div>
          ) : null}

          {joinView === "ready_for_pickup" || joinView === "partner_arrived" ? (
            <div className="grid gap-2">
              <PrimaryCta onClick={onMarkAtPickup}>
                <CheckCircle2 className="h-5 w-5" />
                I&apos;m at pickup
              </PrimaryCta>
              <SecondaryCta href={taxiChatUnlocked ? chatHref : undefined} disabled={!taxiChatUnlocked}>
                Open taxi partner chat
              </SecondaryCta>
              <SecondaryCta onClick={() => setPolicyModal("partner_request_cancellation")}>Request cancellation</SecondaryCta>
              <SecondaryCta href={reportIssueHref}>Report pickup issue</SecondaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Use chat for pickup coordination. Live GPS is not enabled.
              </p>
            </div>
          ) : null}

          {joinView === "at_pickup" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <CheckCircle2 className="h-5 w-5" />
                At pickup
              </PrimaryCta>
              <SecondaryCta href={taxiChatUnlocked ? chatHref : undefined} disabled={!taxiChatUnlocked}>
                Open taxi partner chat
              </SecondaryCta>
              <SecondaryCta onClick={() => setPolicyModal("partner_request_cancellation")}>Request cancellation</SecondaryCta>
              <SecondaryCta href={reportIssueHref}>Report pickup issue</SecondaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                You marked yourself at pickup. Waiting for ride start.
              </p>
            </div>
          ) : null}

          {joinView === "ride_started" ? (
            <div className="grid gap-2">
              <PrimaryCta href={taxiChatUnlocked ? chatHref : undefined} disabled={!taxiChatUnlocked}>
                <CheckCircle2 className="h-5 w-5" />
                Open chat
              </PrimaryCta>
              <SecondaryCta href={reportIssueHref}>Report issue</SecondaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Ride is in progress.
              </p>
            </div>
          ) : null}

          {joinView === "quote_declined" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <Clock3 className="h-5 w-5" />
                Quote declined
              </PrimaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                The organizer may request another quote.
              </p>
            </div>
          ) : null}

          {joinView === "seat_cancelled" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <Clock3 className="h-5 w-5" />
                Seat canceled
              </PrimaryCta>
              <PrimaryCta onClick={openLockSeatModal}>Lock my seat</PrimaryCta>
            </div>
          ) : null}

          {joinView === "quote_acceptance_cancelled" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <Clock3 className="h-5 w-5" />
                Quote acceptance canceled
              </PrimaryCta>
              <PrimaryCta onClick={() => setShowQuoteModal(true)}>Review quote</PrimaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                You can review the quote again before the deadline.
              </p>
            </div>
          ) : null}

          {joinView === "cancellation_requested" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <Clock3 className="h-5 w-5" />
                Cancellation requested
              </PrimaryCta>
              <SecondaryCta disabled>Chat locked</SecondaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                {taxiChatHelper}
              </p>
            </div>
          ) : null}

          {joinView === "attendance_cancelled" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <CheckCircle2 className="h-5 w-5" />
                Attendance cancelled
              </PrimaryCta>
              <p className="px-2 text-center text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                You are no longer listed as joined for this pod.
              </p>
              {canLockSeatAfterCancel ? (
                <PrimaryCta onClick={openLockSeatModal}>Lock my seat</PrimaryCta>
              ) : (
                <PrimaryCta disabled>This pod is no longer joinable</PrimaryCta>
              )}
            </div>
          ) : null}

          {attendanceMessage ? (
            <p className="mt-2 rounded-[14px] border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-center text-xs font-black text-emerald-200">
              {attendanceMessage}
            </p>
          ) : null}

          {attendanceError ? (
            <p className="mt-2 rounded-[14px] border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-center text-xs font-black text-rose-200">
              {attendanceError}
            </p>
          ) : null}
        </div>
      </div>

      {showLockModal ? (
        <LockSeatConfirmationModal
          ride={ride}
          seatsUsed={seatsUsed}
          checked={understood}
          luggage={lockSeatLuggage}
          onCheckedChange={setUnderstood}
          onLuggageChange={setLockSeatLuggage}
          waiverSource={lockSeatWaiverSource}
          plusWaiversRemaining={membership.monthlyJoinFeeWaiversRemaining}
          plusWaiversTotal={membership.monthlyJoinFeeWaiversTotal}
          onCancel={closeLockModal}
          onConfirm={confirmLockSeat}
        />
      ) : null}

      {showSelfSettleJoinModal ? (
        <SelfSettleJoinConfirmationModal
          ride={ride}
          seatsUsed={seatsUsed}
          checked={selfSettleUnderstood}
          waiverSource={selfSettleWaiverSource}
          plusWaiversRemaining={membership.monthlyJoinFeeWaiversRemaining}
          plusWaiversTotal={membership.monthlyJoinFeeWaiversTotal}
          onCheckedChange={setSelfSettleUnderstood}
          onCancel={closeSelfSettleJoinModal}
          onConfirm={confirmSelfSettleJoin}
        />
      ) : null}

      {showSelfSettleJoinSuccessModal ? (
        <SelfSettleJoinSuccessModal
          onClose={() => setShowSelfSettleJoinSuccessModal(false)}
        />
      ) : null}

      {showLeaveSelfSettleModal ? (
        <LeaveSelfSettlePodModal
          confirmed={ride.currentUserJoinIntentStatus === "confirmed" || ride.currentUserBookingDetailsConfirmed === true}
          onCancel={() => setShowLeaveSelfSettleModal(false)}
          onConfirm={confirmLeaveSelfSettle}
        />
      ) : null}

      {showQuoteModal && quoteActionView ? (
        <QuoteReviewModal
          ride={ride}
          acceptedGuestCount={acceptedGuestCount}
          requiredGuestCount={requiredGuestCount}
          checked={understood}
          onCheckedChange={setUnderstood}
          onCancel={closeQuoteModal}
          onConfirm={confirmAcceptQuote}
          onDeclineRequest={() => setShowDeclineModal(true)}
        />
      ) : null}

      {showDeclineModal ? (
        <DeclineQuoteModal
          onCancel={() => setShowDeclineModal(false)}
          onConfirm={confirmDeclineQuote}
        />
      ) : null}

      {policyModal ? (
        <PolicyActionModal
          title={
            policyModal === "cancel_seat"
              ? "Cancel your seat?"
              : policyModal === "cancel_acceptance"
                ? "Cancel quote acceptance?"
                : "Request cancellation?"
          }
          body={
            policyModal === "cancel_seat"
              ? "You can leave before accepting the taxi partner quote. Your seat will reopen."
              : policyModal === "cancel_acceptance"
                ? "This may delay or cancel the shared taxi pod."
                : policyModal === "partner_request_cancellation"
                  ? "The taxi partner has accepted this ride. Cancellation may be reviewed."
                  : "The group has accepted the selected quote. Cancellation may require organizer review."
          }
          helper={
            policyModal === "cancel_acceptance" ||
            policyModal === "request_cancellation" ||
            policyModal === "partner_request_cancellation"
              ? "Demo mode: no live payment or payout."
              : undefined
          }
          keepLabel={
            policyModal === "cancel_acceptance"
              ? "Keep acceptance"
              : policyModal === "partner_request_cancellation"
                ? "Keep ride"
                : "Keep seat"
          }
          confirmLabel={
            policyModal === "cancel_seat"
              ? "Cancel seat"
              : policyModal === "cancel_acceptance"
                ? "Cancel acceptance"
                : "Request cancellation"
          }
          onCancel={() => setPolicyModal(null)}
          onConfirm={confirmPolicyAction}
        />
      ) : null}

      {showCancelAttendanceModal ? (
        <CancelAttendanceModal
          isSubmitting={isCancellingAttendance === true}
          policyCopy={cancellationPolicyCopy}
          onCancel={() => setShowCancelAttendanceModal(false)}
          onConfirm={confirmCancelAttendance}
        />
      ) : null}
    </>
  );
}
