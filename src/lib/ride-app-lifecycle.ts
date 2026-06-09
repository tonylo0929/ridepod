import type { HomeRide, RideAppChecklist, RideAppSelfSettleReport } from "@/lib/home-ride-mock";
import type { CalendarRide } from "@/lib/my-ride-calendar-mock";
import { getRideAppCompletionResponse } from "@/lib/ride-app-completion";
import { getRideAppAccessNotice, getRideAppTrustSummary } from "@/lib/ride-app-trust";

export type RideAppLifecycleStatusKey =
  | "open"
  | "confirm_details"
  | "ready_to_book"
  | "upcoming"
  | "settlement_pending"
  | "completed"
  | "cancelled"
  | "expired"
  | "issue_reported"
  | "restricted";

export type RideAppLifecycleTone = "blue" | "purple" | "gold" | "green" | "red" | "gray";

export type RideAppLifecycleStatus = {
  statusKey: RideAppLifecycleStatusKey;
  label: string;
  subcopy: string;
  ctaLabel: string;
  nextAction: string;
  priority: number;
  tone: RideAppLifecycleTone;
  hrefSuffix?: "chat" | "trust";
};

type RideAppLifecycleInput = {
  pod: HomeRide | CalendarRide;
  currentUserId?: string | null;
  isHost?: boolean;
  now?: Date;
};

const issueReportStorageKey = "ridepod:self-settle-issue-reports";

const lifecycleStatus: Record<RideAppLifecycleStatusKey, RideAppLifecycleStatus> = {
  open: {
    statusKey: "open",
    label: "Open",
    subcopy: "Waiting for riders",
    ctaLabel: "View pod",
    nextAction: "View pod",
    priority: 10,
    tone: "blue",
  },
  confirm_details: {
    statusKey: "confirm_details",
    label: "Confirm details",
    subcopy: "Waiting for host to confirm details.",
    ctaLabel: "Open chat",
    nextAction: "Waiting for host",
    priority: 40,
    tone: "gold",
    hrefSuffix: "chat",
  },
  ready_to_book: {
    statusKey: "ready_to_book",
    label: "Ready to book",
    subcopy: "Group details confirmed. Ride fare after ride.",
    ctaLabel: "Open chat",
    nextAction: "Confirm details in chat",
    priority: 30,
    tone: "purple",
    hrefSuffix: "chat",
  },
  upcoming: {
    statusKey: "upcoming",
    label: "Upcoming",
    subcopy: "Settle final fare after the ride.",
    ctaLabel: "Open pod",
    nextAction: "Settle after ride",
    priority: 20,
    tone: "blue",
  },
  settlement_pending: {
    statusKey: "settlement_pending",
    label: "Settlement pending",
    subcopy: "Settle final fare after ride, then mark completed.",
    ctaLabel: "Mark completed",
    nextAction: "Mark completed",
    priority: 60,
    tone: "gold",
  },
  completed: {
    statusKey: "completed",
    label: "Completed",
    subcopy: "Self-settle ride completed.",
    ctaLabel: "View summary",
    nextAction: "View summary",
    priority: 70,
    tone: "green",
  },
  cancelled: {
    statusKey: "cancelled",
    label: "Cancelled",
    subcopy: "Cancellation status available.",
    ctaLabel: "View status",
    nextAction: "Status pending",
    priority: 100,
    tone: "red",
  },
  expired: {
    statusKey: "expired",
    label: "Expired",
    subcopy: "Pod did not proceed.",
    ctaLabel: "View details",
    nextAction: "View details",
    priority: 50,
    tone: "gray",
  },
  issue_reported: {
    statusKey: "issue_reported",
    label: "Issue reported",
    subcopy: "Under review",
    ctaLabel: "View report",
    nextAction: "Report under review",
    priority: 90,
    tone: "purple",
  },
  restricted: {
    statusKey: "restricted",
    label: "Restricted",
    subcopy: "Self-settle access limited due to recent issues.",
    ctaLabel: "View trust",
    nextAction: "View trust",
    priority: 80,
    tone: "red",
    hrefSuffix: "trust",
  },
};

export function isRideAppLifecyclePod(pod: HomeRide | CalendarRide) {
  return ("rideMode" in pod && pod.rideMode === "ride_app") || ("rideService" in pod && pod.rideService === "ride_app") || ("rideCategory" in pod && pod.rideCategory === "ride_app_self_settle");
}

export function getRideAppPodLifecycleStatus({
  pod,
  currentUserId,
  isHost = false,
  now = new Date(),
}: RideAppLifecycleInput): RideAppLifecycleStatus {
  if (!isRideAppLifecyclePod(pod)) return lifecycleStatus.open;

  const cancelled = getStringField(pod, "status") === "cancelled";
  if (cancelled) return lifecycleStatus.cancelled;

  if (currentUserId && hasCurrentUserIssueReport(getPodId(pod), currentUserId)) return lifecycleStatus.issue_reported;

  if (currentUserId) {
    const notice = getRideAppAccessNotice(getRideAppTrustSummary(currentUserId));
    if (notice?.blocked) return lifecycleStatus.restricted;
  }

  const completion = currentUserId ? getRideAppCompletionResponse(getPodId(pod), currentUserId) : null;
  if (completion?.status === "completed" || getStringField(pod, "status") === "completed") return lifecycleStatus.completed;

  const scheduledAt = getScheduledAt(pod);
  const isPastRide = scheduledAt ? scheduledAt.getTime() <= now.getTime() : getStringField(pod, "status") === "ride_started";
  if (isPastRide && completion?.status === "issue_reported") return lifecycleStatus.issue_reported;
  if (isPastRide || getStringField(pod, "status") === "ride_started") return lifecycleStatus.settlement_pending;

  if (
    getStringField(pod, "currentUserJoinIntentStatus") === "seat_hold_expired" ||
    getBooleanField(pod, "currentUserConfirmationExpired") ||
    getStringField(pod, "rideAppPodStatus") === "seat_hold_expired"
  ) {
    return {
      ...lifecycleStatus.expired,
      label: isHost ? "Expired seat hold" : "Seat hold expired",
      subcopy: isHost ? "Rider confirmation missed." : "Seat hold expired.",
      nextAction: "View details",
    };
  }

  if (getStringField(pod, "status") === "quote_expired") return lifecycleStatus.expired;

  const detailsConfirmed = getBooleanField(pod, "rideAppBookingDetailsConfirmed");
  if (detailsConfirmed) {
    if ("rideAppChecklist" in pod && isRideAppChecklistComplete(pod.rideAppChecklist)) return lifecycleStatus.ready_to_book;
    return lifecycleStatus.upcoming;
  }

  const seatsFilled = getNumberField(pod, "seatsUsed") ?? getNumberField(pod, "seatsFilled") ?? 0;
  if (getStringField(pod, "status") === "confirm_details" || seatsFilled > 1) {
    return {
      ...lifecycleStatus.confirm_details,
      subcopy: isHost
        ? "Confirm ride app, fare estimate, split, and payment method."
        : "Waiting for host to confirm details.",
      ctaLabel: isHost ? "Confirm details" : "Open chat",
      nextAction: isHost ? "Confirm details in chat" : "Waiting for host",
      hrefSuffix: isHost ? undefined : "chat",
    };
  }

  return lifecycleStatus.open;
}

export function getRideAppLifecycleHref(podId: string, status: RideAppLifecycleStatus) {
  if (status.hrefSuffix === "chat") return `/pods/${podId}/chat`;
  if (status.hrefSuffix === "trust") return "/profile";
  return `/pods/${podId}`;
}

function getPodId(pod: HomeRide | CalendarRide) {
  return pod.id;
}

function getStringField(pod: HomeRide | CalendarRide, field: string) {
  const value = (pod as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function getBooleanField(pod: HomeRide | CalendarRide, field: string) {
  const value = (pod as Record<string, unknown>)[field];
  return typeof value === "boolean" ? value : false;
}

function getNumberField(pod: HomeRide | CalendarRide, field: string) {
  const value = (pod as Record<string, unknown>)[field];
  return typeof value === "number" ? value : null;
}

function isRideAppChecklistComplete(checklist?: RideAppChecklist) {
  if (!checklist) return false;
  return [
    checklist.pickupPoint,
    checklist.dropoffPoint,
    checklist.rideApp,
    checklist.estimatedFare,
    checklist.booker,
    checklist.fareSplit,
    checklist.paymentMethod,
    checklist.paymentRecipientAfterRide,
    checklist.meetingTime,
  ].every(Boolean);
}

function hasCurrentUserIssueReport(podId: string, currentUserId: string) {
  if (typeof window === "undefined") return false;

  try {
    const raw = window.localStorage.getItem(issueReportStorageKey);
    if (!raw) return false;
    const reports = JSON.parse(raw) as RideAppSelfSettleReport[];
    return Array.isArray(reports)
      ? reports.some((report) => report.podId === podId && report.reporterUserId === currentUserId)
      : false;
  } catch {
    return false;
  }
}

function getScheduledAt(pod: HomeRide | CalendarRide) {
  if ("date" in pod && "time" in pod) {
    const date = new Date(`${pod.date}T${pod.time}:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = parseRideDate(pod.dateLabel);
  const time = parseRideTime(pod.timeLabel);
  if (!date || !time) return null;
  date.setHours(time.hours, time.minutes, 0, 0);
  return date;
}

function parseRideDate(label: string) {
  const now = new Date();
  const normalized = label.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes("today")) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (lower.includes("tomorrow")) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const monthMatch =
    normalized.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{1,2})\b/i) ??
    normalized.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i);

  if (!monthMatch) return null;

  const monthToken = Number.isNaN(Number(monthMatch[1])) ? monthMatch[1] : monthMatch[2];
  const dayToken = Number.isNaN(Number(monthMatch[1])) ? monthMatch[2] : monthMatch[1];
  const monthIndex = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].findIndex((month) =>
    monthToken.toLowerCase().startsWith(month),
  );
  return monthIndex >= 0 ? new Date(now.getFullYear(), monthIndex, Number(dayToken)) : null;
}

function parseRideTime(label: string) {
  const match = label.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const period = match[3].toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}
