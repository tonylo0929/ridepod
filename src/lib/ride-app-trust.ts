import type { RidePodProfileRow } from "@/lib/supabase/types";

export type RideAppTrustEventType =
  | "ride_app_completed"
  | "ride_app_checklist_completed"
  | "ride_app_acknowledged"
  | "ride_app_host_cancelled_before_confirm"
  | "ride_app_host_cancelled_after_confirm"
  | "ride_app_host_no_show"
  | "ride_app_rider_left_early"
  | "ride_app_rider_left_late"
  | "ride_app_rider_no_show"
  | "ride_app_positive_rating"
  | "ride_app_low_rating"
  | "ride_app_report_submitted"
  | "ride_app_report_confirmed"
  | "ride_app_report_dismissed"
  | "ride_app_payment_issue_confirmed"
  | "ride_app_safety_issue_confirmed";

export type RideAppTrustLevel = "New" | "Reliable" | "Trusted" | "Recent issues" | "Limited access";
export type RideAppTrustWarningLevel = "none" | "caution" | "blocked";
export type RideAppRatingRole = "host" | "rider";

export type RideAppTrustEvent = {
  id: string;
  userId: string;
  podId?: string | null;
  eventType: RideAppTrustEventType;
  impactScore: number;
  reason: string;
  createdBy?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

export type RideAppRating = {
  id: string;
  podId: string;
  reviewerUserId: string;
  reviewedUserId: string;
  reviewerRole: RideAppRatingRole;
  reviewedRole: RideAppRatingRole;
  rating: number;
  didShowUp?: boolean | null;
  wasOnTime?: boolean | null;
  paymentSmooth?: boolean | null;
  bookingClear?: boolean | null;
  fareSplitClear?: boolean | null;
  paymentFair?: boolean | null;
  wouldRideAgain?: boolean | null;
  optionalComment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RideAppHostTrustStats = {
  hostedRideAppPodsCount: number;
  hostCompletedCount: number;
  hostCancelledCount: number;
  hostLateCancelCount: number;
  hostNoShowCount: number;
  hostRatingAverage: number | null;
  hostRatingCount: number;
  hostCompletionRate: number | null;
  hostShowUpRate: number | null;
  hostCancellationRate: number | null;
  hostConfirmedReportsCount: number;
};

export type RideAppRiderTrustStats = {
  joinedRideAppPodsCount: number;
  riderCompletedCount: number;
  riderLateLeaveCount: number;
  riderNoShowCount: number;
  riderRatingAverage: number | null;
  riderRatingCount: number;
  riderShowUpRate: number | null;
  riderCancellationRate: number | null;
  riderConfirmedReportsCount: number;
};

export type RideAppTrustSummary = {
  userId: string;
  hostStats: RideAppHostTrustStats;
  riderStats: RideAppRiderTrustStats;
  rideAppTrustScore: number;
  overallScore: number;
  trustLevel: RideAppTrustLevel;
  rideAppTrustLevel: RideAppTrustLevel;
  publicBadgeLabel: string;
  warningLevel: RideAppTrustWarningLevel;
  completedRideAppPodsCount: number;
  lateCancelCount: number;
  noShowCount: number;
  confirmedReportCount: number;
  updatedAt: string;
};

export const rideAppTrustImpact: Record<RideAppTrustEventType, number> = {
  ride_app_completed: 2,
  ride_app_checklist_completed: 1,
  ride_app_acknowledged: 1,
  ride_app_host_cancelled_before_confirm: -2,
  ride_app_host_cancelled_after_confirm: -6,
  ride_app_host_no_show: -10,
  ride_app_rider_left_early: -1,
  ride_app_rider_left_late: -3,
  ride_app_rider_no_show: -8,
  ride_app_positive_rating: 1,
  ride_app_low_rating: -2,
  ride_app_report_submitted: 0,
  ride_app_report_confirmed: -10,
  ride_app_report_dismissed: 0,
  ride_app_payment_issue_confirmed: -10,
  ride_app_safety_issue_confirmed: -15,
};

const trustEventsStorageKey = "ridepod:ride-app-trust-events";
const ratingsStorageKey = "ridepod:ride-app-ratings";

const seededTrustSummaries: Record<string, Partial<RideAppTrustSummary>> = {
  "mock-host-leo": {
    rideAppTrustScore: 14,
    hostStats: {
      hostedRideAppPodsCount: 18,
      hostCompletedCount: 17,
      hostCancelledCount: 1,
      hostLateCancelCount: 1,
      hostNoShowCount: 0,
      hostRatingAverage: 4.8,
      hostRatingCount: 16,
      hostCompletionRate: 94,
      hostShowUpRate: 100,
      hostCancellationRate: 6,
      hostConfirmedReportsCount: 0,
    },
    riderStats: {
      joinedRideAppPodsCount: 6,
      riderCompletedCount: 6,
      riderLateLeaveCount: 0,
      riderNoShowCount: 0,
      riderRatingAverage: 4.6,
      riderRatingCount: 5,
      riderShowUpRate: 100,
      riderCancellationRate: 0,
      riderConfirmedReportsCount: 0,
    },
  },
  "mock-rider-tony": {
    rideAppTrustScore: 8,
    riderStats: {
      joinedRideAppPodsCount: 26,
      riderCompletedCount: 24,
      riderLateLeaveCount: 2,
      riderNoShowCount: 1,
      riderRatingAverage: 4.7,
      riderRatingCount: 21,
      riderShowUpRate: 96,
      riderCancellationRate: 8,
      riderConfirmedReportsCount: 0,
    },
  },
};

function emptyHostStats(): RideAppHostTrustStats {
  return {
    hostedRideAppPodsCount: 0,
    hostCompletedCount: 0,
    hostCancelledCount: 0,
    hostLateCancelCount: 0,
    hostNoShowCount: 0,
    hostRatingAverage: null,
    hostRatingCount: 0,
    hostCompletionRate: null,
    hostShowUpRate: null,
    hostCancellationRate: null,
    hostConfirmedReportsCount: 0,
  };
}

function emptyRiderStats(): RideAppRiderTrustStats {
  return {
    joinedRideAppPodsCount: 0,
    riderCompletedCount: 0,
    riderLateLeaveCount: 0,
    riderNoShowCount: 0,
    riderRatingAverage: null,
    riderRatingCount: 0,
    riderShowUpRate: null,
    riderCancellationRate: null,
    riderConfirmedReportsCount: 0,
  };
}

function readLocalTrustEvents(): RideAppTrustEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(trustEventsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTrustEvents(events: RideAppTrustEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(trustEventsStorageKey, JSON.stringify(events));
}

function readLocalRatings(): RideAppRating[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ratingsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalRatings(ratings: RideAppRating[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ratingsStorageKey, JSON.stringify(ratings));
}

export function createRideAppTrustEvent(input: {
  userId: string;
  podId?: string | null;
  eventType: RideAppTrustEventType;
  reason?: string;
  createdBy?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const event: RideAppTrustEvent = {
    id: `ride-app-trust-${input.userId}-${input.eventType}-${Date.now()}`,
    userId: input.userId,
    podId: input.podId ?? null,
    eventType: input.eventType,
    impactScore: rideAppTrustImpact[input.eventType],
    reason: input.reason ?? defaultTrustEventReason(input.eventType),
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
    metadata: input.metadata ?? null,
  };

  const events = readLocalTrustEvents();
  const duplicate = events.some(
    (item) => item.userId === event.userId && item.podId === event.podId && item.eventType === event.eventType,
  );
  if (!duplicate) writeLocalTrustEvents([...events, event]);

  // TODO: Replace local trust events with server-side ride_app_trust_events writes and RLS.
  // TODO: Admin report confirmation/dismissal should create trust events from admin-only actions, not client code.
  return event;
}

export function submitRideAppRating(input: Omit<RideAppRating, "id" | "createdAt" | "updatedAt">) {
  if (input.reviewerUserId === input.reviewedUserId) {
    return { ok: false, error: "Users cannot rate themselves." };
  }

  const ratings = readLocalRatings();
  const duplicate = ratings.some(
    (rating) =>
      rating.podId === input.podId &&
      rating.reviewerUserId === input.reviewerUserId &&
      rating.reviewedUserId === input.reviewedUserId,
  );
  if (duplicate) return { ok: false, error: "Rating already submitted for this pod." };

  const now = new Date().toISOString();
  const rating: RideAppRating = {
    ...input,
    id: `ride-app-rating-${input.podId}-${input.reviewerUserId}-${input.reviewedUserId}`,
    rating: clampRating(input.rating),
    createdAt: now,
    updatedAt: now,
  };

  writeLocalRatings([...ratings, rating]);
  createRideAppTrustEvent({
    userId: input.reviewedUserId,
    podId: input.podId,
    eventType: rating.rating >= 4 ? "ride_app_positive_rating" : "ride_app_low_rating",
    reason: rating.rating >= 4 ? "Positive Ride app self-settle rating." : "Low Ride app self-settle rating.",
    createdBy: input.reviewerUserId,
    metadata: {
      reviewerRole: input.reviewerRole,
      reviewedRole: input.reviewedRole,
    },
  });

  // TODO: Persist ratings through ride_app_ratings with server-side membership checks.
  return { ok: true, rating };
}

export function getRideAppRatingsForUser(userId: string) {
  return readLocalRatings().filter((rating) => rating.reviewedUserId === userId);
}

export function getRideAppTrustEvents(userId: string) {
  return readLocalTrustEvents().filter((event) => event.userId === userId);
}

export function getRideAppTrustSummary(userId: string, profile?: RidePodProfileRow | null): RideAppTrustSummary {
  const events = getRideAppTrustEvents(userId);
  const ratings = getRideAppRatingsForUser(userId);
  const seeded = seededTrustSummaries[userId] ?? {};
  const seededHost = seeded.hostStats ?? emptyHostStats();
  const seededRider = seeded.riderStats ?? emptyRiderStats();
  const scoreFromEvents = events.reduce((sum, event) => sum + event.impactScore, 0);

  const hostRatings = ratings.filter((rating) => rating.reviewedRole === "host");
  const riderRatings = ratings.filter((rating) => rating.reviewedRole === "rider");
  const hostCompletedEvents = events.filter((event) => event.eventType === "ride_app_completed" && event.metadata?.role === "host").length;
  const riderCompletedEvents = events.filter((event) => event.eventType === "ride_app_completed" && event.metadata?.role !== "host").length;
  const hostLateCancelEvents = events.filter((event) => event.eventType === "ride_app_host_cancelled_after_confirm").length;
  const riderLateLeaveEvents = events.filter((event) => event.eventType === "ride_app_rider_left_late").length;
  const hostNoShowEvents = events.filter((event) => event.eventType === "ride_app_host_no_show").length;
  const riderNoShowEvents = events.filter((event) => event.eventType === "ride_app_rider_no_show").length;
  const confirmedReports = events.filter((event) =>
    ["ride_app_report_confirmed", "ride_app_payment_issue_confirmed", "ride_app_safety_issue_confirmed"].includes(event.eventType),
  );
  const seriousSafetyIssue = events.some((event) => event.eventType === "ride_app_safety_issue_confirmed");

  const hostCompletedCount = seededHost.hostCompletedCount + hostCompletedEvents;
  const riderCompletedCount = seededRider.riderCompletedCount + riderCompletedEvents;
  const hostLateCancelCount = seededHost.hostLateCancelCount + hostLateCancelEvents;
  const riderLateLeaveCount = seededRider.riderLateLeaveCount + riderLateLeaveEvents;
  const hostNoShowCount = seededHost.hostNoShowCount + hostNoShowEvents;
  const riderNoShowCount = seededRider.riderNoShowCount + riderNoShowEvents + (profile?.no_show_count ?? 0);
  const hostConfirmedReportsCount = seededHost.hostConfirmedReportsCount + confirmedReports.length;
  const riderConfirmedReportsCount = seededRider.riderConfirmedReportsCount + confirmedReports.length;

  const hostStats: RideAppHostTrustStats = {
    hostedRideAppPodsCount: Math.max(seededHost.hostedRideAppPodsCount, hostCompletedCount + hostLateCancelCount + hostNoShowCount),
    hostCompletedCount,
    hostCancelledCount: seededHost.hostCancelledCount + hostLateCancelEvents,
    hostLateCancelCount,
    hostNoShowCount,
    hostRatingAverage: mergeAverage(seededHost.hostRatingAverage, seededHost.hostRatingCount, averageRating(hostRatings), hostRatings.length),
    hostRatingCount: seededHost.hostRatingCount + hostRatings.length,
    hostCompletionRate: rate(hostCompletedCount, hostCompletedCount + hostLateCancelCount + hostNoShowCount),
    hostShowUpRate: rate(hostCompletedCount, hostCompletedCount + hostNoShowCount),
    hostCancellationRate: rate(hostLateCancelCount, hostCompletedCount + hostLateCancelCount + hostNoShowCount),
    hostConfirmedReportsCount,
  };

  const riderStats: RideAppRiderTrustStats = {
    joinedRideAppPodsCount: Math.max(seededRider.joinedRideAppPodsCount, riderCompletedCount + riderLateLeaveCount + riderNoShowCount),
    riderCompletedCount,
    riderLateLeaveCount,
    riderNoShowCount,
    riderRatingAverage: mergeAverage(seededRider.riderRatingAverage, seededRider.riderRatingCount, averageRating(riderRatings), riderRatings.length),
    riderRatingCount: seededRider.riderRatingCount + riderRatings.length,
    riderShowUpRate: rate(riderCompletedCount, riderCompletedCount + riderNoShowCount),
    riderCancellationRate: rate(riderLateLeaveCount, riderCompletedCount + riderLateLeaveCount + riderNoShowCount),
    riderConfirmedReportsCount,
  };

  const rideAppTrustScore = (seeded.rideAppTrustScore ?? 0) + scoreFromEvents;
  const completedRideAppPodsCount = hostStats.hostCompletedCount + riderStats.riderCompletedCount;
  const lateCancelCount = hostStats.hostLateCancelCount + riderStats.riderLateLeaveCount + (profile?.late_cancel_count ?? 0);
  const noShowCount = hostStats.hostNoShowCount + riderStats.riderNoShowCount;
  const confirmedReportCount = hostStats.hostConfirmedReportsCount + riderStats.riderConfirmedReportsCount;
  const trustLevel = getRideAppTrustLevel({
    score: rideAppTrustScore,
    completedRideAppPodsCount,
    lateCancelCount,
    noShowCount,
    confirmedReportCount,
    seriousSafetyIssue,
    riskStatus: profile?.risk_status ?? null,
  });
  const latestEvent = events.length ? events[events.length - 1] : null;

  return {
    userId,
    hostStats,
    riderStats,
    rideAppTrustScore,
    overallScore: rideAppTrustScore,
    trustLevel,
    rideAppTrustLevel: trustLevel,
    publicBadgeLabel: getRideAppPublicTrustBadgeLabel(trustLevel, hostStats),
    warningLevel: trustLevel === "Limited access" ? "blocked" : trustLevel === "Recent issues" ? "caution" : "none",
    completedRideAppPodsCount,
    lateCancelCount,
    noShowCount,
    confirmedReportCount,
    updatedAt: latestEvent?.createdAt ?? new Date().toISOString(),
  };
}

export function getRideAppTrustLevel(input: {
  score: number;
  completedRideAppPodsCount: number;
  lateCancelCount: number;
  noShowCount: number;
  confirmedReportCount: number;
  seriousSafetyIssue?: boolean;
  riskStatus?: string | null;
}): RideAppTrustLevel {
  if (
    input.riskStatus === "RESTRICTED" ||
    input.riskStatus === "SUSPENDED" ||
    input.score < -15 ||
    input.seriousSafetyIssue ||
    input.confirmedReportCount >= 2
  ) {
    return "Limited access";
  }

  if (input.score < -5 || input.lateCancelCount >= 2 || input.noShowCount > 0 || input.confirmedReportCount > 0) {
    return "Recent issues";
  }

  if (input.completedRideAppPodsCount < 3) return "New";
  if (input.score >= 10 && input.completedRideAppPodsCount >= 5) return "Trusted";
  return "Reliable";
}

export function getRideAppPublicTrustBadge(summary: RideAppTrustSummary, role: RideAppRatingRole = "host") {
  if (role === "rider") {
    if (summary.trustLevel === "Trusted") return `Trusted rider - ${summary.riderStats.riderCompletedCount} rides`;
    if (summary.trustLevel === "Reliable") return `Reliable rider - ${summary.riderStats.riderCompletedCount} rides`;
    if (summary.trustLevel === "Recent issues" || summary.trustLevel === "Limited access") return "Recent self-settle issues";
    return "New rider";
  }

  return summary.publicBadgeLabel;
}

export function getRideAppHostTrustJoinCopy(summary: RideAppTrustSummary) {
  if (summary.trustLevel === "Trusted") {
    return `Host trust: Trusted - ${summary.hostStats.hostCompletedCount} rides - ${formatRate(summary.hostStats.hostShowUpRate)} show-up`;
  }

  if (summary.trustLevel === "Reliable") {
    return `Host trust: Reliable - ${summary.hostStats.hostCompletedCount} rides`;
  }

  if (summary.trustLevel === "Recent issues") {
    return "Recent self-settle issues - confirm details carefully before joining.";
  }

  if (summary.trustLevel === "Limited access") {
    return "Ride app self-settle access is temporarily limited due to recent platform issues.";
  }

  return "Confirm ride details clearly in chat.";
}

export function getRideAppAccessNotice(summary: RideAppTrustSummary) {
  if (summary.trustLevel === "Limited access") {
    return {
      blocked: true,
      message: "Ride app self-settle access is temporarily limited due to recent platform issues.",
    };
  }

  if (summary.trustLevel === "Recent issues") {
    return {
      blocked: false,
      message: "This account has recent self-settle issues. Confirm details clearly and avoid last-minute changes.",
    };
  }

  return null;
}

export function formatRideAppTrustMetric(value: number | null, suffix = "%") {
  if (value === null) return "Not enough rides yet";
  return `${Math.round(value)}${suffix}`;
}

export function formatRideAppRating(value: number | null, count: number) {
  if (value === null || count === 0) return "Not enough rides yet";
  return `${value.toFixed(1)} rating`;
}

function getRideAppPublicTrustBadgeLabel(level: RideAppTrustLevel, hostStats: RideAppHostTrustStats) {
  if (level === "Trusted") {
    return `Trusted host - ${hostStats.hostCompletedCount} rides - ${formatRate(hostStats.hostShowUpRate)} show-up`;
  }
  if (level === "Reliable") return `Reliable host - ${hostStats.hostCompletedCount} rides`;
  if (level === "Recent issues" || level === "Limited access") return "Recent self-settle issues";
  return "New";
}

function defaultTrustEventReason(eventType: RideAppTrustEventType) {
  switch (eventType) {
    case "ride_app_completed":
      return "Successful completed ride app pod.";
    case "ride_app_checklist_completed":
      return "Self-settle checklist completed.";
    case "ride_app_acknowledged":
      return "Rider acknowledged self-settle details.";
    case "ride_app_report_submitted":
      return "Report submitted for admin review. No penalty applied.";
    case "ride_app_report_dismissed":
      return "Report dismissed by admin. No negative impact.";
    case "ride_app_safety_issue_confirmed":
      return "Confirmed safety issue.";
    case "ride_app_payment_issue_confirmed":
      return "Confirmed payment/fare issue.";
    default:
      return "Ride app self-settle platform behaviour event.";
  }
}

function clampRating(value: number) {
  return Math.min(5, Math.max(1, Math.round(value)));
}

function averageRating(ratings: RideAppRating[]) {
  if (!ratings.length) return null;
  return ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;
}

function mergeAverage(firstAverage: number | null, firstCount: number, secondAverage: number | null, secondCount: number) {
  if (firstAverage === null && secondAverage === null) return null;
  if (firstAverage === null) return secondAverage;
  if (secondAverage === null || secondCount === 0) return firstAverage;
  return (firstAverage * firstCount + secondAverage * secondCount) / (firstCount + secondCount);
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function formatRate(value: number | null) {
  return value === null ? "Not enough rides yet" : `${Math.round(value)}%`;
}
