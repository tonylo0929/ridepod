import {
  formatCents,
  isMemberPaymentConfirmed,
  makeAuditEvent,
  type AuditEvent,
  type BookingPermission,
  type PodLifecycleState,
  type ProviderName,
  type ProtectedPod,
  type QuoteReviewState,
  type QuoteScreenshot,
} from "./money-safety";
import { mockAuditEvents, protectedPods } from "./money-safety-mock";

export type QuoteUploadInput = {
  providerName: ProviderName;
  vehicleClass?: string | null;
  quotedFareCents: number;
  currency: string;
  routeSummary?: string | null;
  screenshotFileUrl?: string | null;
  screenshotFileId?: string | null;
};

export type QuoteUploadResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  quote: QuoteScreenshot | null;
  bookingPermission: BookingPermission | null;
  auditEvents: AuditEvent[];
  error?: string;
};

export type ExternalBookingResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  bookingPermission: BookingPermission | null;
  auditEvents: AuditEvent[];
  warning?: string;
  error?: string;
};

const protectedBookingWarning =
  "You can book at your own risk, but this ride is outside RidePod review until participants accept their seats.";
const quoteProofCertificationTextVersion = "quote-proof-certification-v1";

const quoteUploadAllowedStates: PodLifecycleState[] = [
  "FORMING",
  "PAYMENT_LOCKING",
  "LOCKED",
  "HOST_REPLACEMENT_NEEDED",
] as const;

const bookingAllowedStates: PodLifecycleState[] = [
  "FORMING",
  "PAYMENT_LOCKING",
  "LOCKED",
  "HOST_CAN_BOOK",
  "HOST_REPLACEMENT_NEEDED",
] as const;

function recordAudit(events: AuditEvent[]) {
  mockAuditEvents.push(...events);
  return events;
}

function getPod(podId: string) {
  return protectedPods.find((candidate) => candidate.id === podId) ?? null;
}

function getCurrentHostId(pod: Pick<ProtectedPod, "hostUserId" | "replacementHostUserId">) {
  return pod.replacementHostUserId ?? pod.hostUserId;
}

function getActiveMembers(pod: Pick<ProtectedPod, "members">) {
  return pod.members.filter((member) => !["CANCELED", "REMOVED"].includes(member.memberState));
}

function getConfirmedSeatCount(pod: Pick<ProtectedPod, "members">) {
  return getActiveMembers(pod)
    .filter(isMemberPaymentConfirmed)
    .reduce((sum, member) => sum + member.seatCount, 0);
}

function getLatestFreshQuote(pod: Pick<ProtectedPod, "quotes">, now = new Date().toISOString()) {
  return [...pod.quotes]
    .filter((quote) => quote.isFresh && quote.reviewState !== "EXPIRED")
    .filter((quote) => !quote.expiresAt || quote.expiresAt >= now)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null;
}

function buildBookingPermission(
  hostUserId: string,
  pod: ProtectedPod,
  options: { now?: string; adminOverride?: boolean } = {},
): BookingPermission {
  const now = options.now ?? new Date().toISOString();
  const reasons: string[] = [];
  const latestQuote = getLatestFreshQuote(pod, now);
  const quoteRequired = pod.rideOption !== "TAXI_METER";
  const confirmedCount = getConfirmedSeatCount(pod);
  const activeMembers = getActiveMembers(pod);
  const currentHostId = getCurrentHostId(pod);
  const approvedMaxCents = pod.higherMaxApprovedCents ?? pod.approvedMaxTotalFareCents;

  if (hostUserId !== currentHostId) reasons.push("Only the current host can book.");
  if (!bookingAllowedStates.includes(pod.lifecycleState)) {
    reasons.push("Pod lifecycle does not allow reviewed booking.");
  }
  if (pod.lifecycleState === "HOST_REPLACEMENT_NEEDED" && !pod.replacementHostUserId) {
    reasons.push("A replacement host must accept before reviewed booking.");
  }
  if (["CANCELED", "EXPIRED"].includes(pod.lifecycleState)) reasons.push("Pod is not active.");
  if (pod.adminReviewRequired || ["ADMIN_REVIEW", "DISPUTE_HOLD"].includes(pod.lifecycleState)) {
    reasons.push("Pod is on admin review or dispute hold.");
  }
  if (confirmedCount < pod.minSeatsToBook) {
    reasons.push(`Waiting for participants: ${confirmedCount}/${pod.minSeatsToBook} accepted.`);
  }
  if (activeMembers.some((member) => !isMemberPaymentConfirmed(member))) {
    reasons.push("All active participants must accept their seat.");
  }
  if (quoteRequired && !latestQuote) {
    reasons.push("Upload a fresh quote screenshot before reviewed booking.");
  } else if (quoteRequired && latestQuote) {
    if (!["AUTO_APPROVED", "QUOTE_APPROVED"].includes(latestQuote.reviewState)) {
      reasons.push("Quote needs approval before reviewed booking.");
    }
    if (latestQuote.quotedFareCents > approvedMaxCents) {
      reasons.push("Quote is above approved max. Riders or admin must approve a higher max.");
    }
  }
  if (pod.bookingDeadlineAt && now > pod.bookingDeadlineAt && !options.adminOverride) {
    reasons.push("Booking deadline passed.");
  }

  return {
    canBook: reasons.length === 0,
    reasons,
    warning: reasons.length > 0 ? protectedBookingWarning : null,
    confirmedCount,
    requiredCount: pod.minSeatsToBook,
    latestQuote,
  };
}

export function canHostBook(
  hostUserId: string,
  podId: string,
  options: { now?: string; adminOverride?: boolean } = {},
): BookingPermission {
  const pod = getPod(podId);
  if (!pod) {
    return {
      canBook: false,
      reasons: ["Pod not found."],
      warning: protectedBookingWarning,
      confirmedCount: 0,
      requiredCount: 0,
      latestQuote: null,
    };
  }

  return buildBookingPermission(hostUserId, pod, options);
}

export function uploadQuoteScreenshot(
  hostUserId: string,
  podId: string,
  input: QuoteUploadInput,
): QuoteUploadResult {
  const pod = getPod(podId);
  if (!pod) {
    return { ok: false, pod: null, quote: null, bookingPermission: null, auditEvents: [], error: "POD_NOT_FOUND" };
  }

  if (hostUserId !== getCurrentHostId(pod)) {
    return { ok: false, pod, quote: null, bookingPermission: null, auditEvents: [], error: "HOST_REQUIRED" };
  }

  if (!quoteUploadAllowedStates.includes(pod.lifecycleState)) {
    return { ok: false, pod, quote: null, bookingPermission: null, auditEvents: [], error: "QUOTE_UPLOAD_NOT_ALLOWED" };
  }

  const now = new Date().toISOString();
  const reviewState: QuoteReviewState =
    input.quotedFareCents <= pod.approvedMaxTotalFareCents ? "AUTO_APPROVED" : "NEEDS_APPROVAL";
  const quote: QuoteScreenshot = {
    id: `quote-${pod.id}-${pod.quotes.length + 1}`,
    podId: pod.id,
    hostUserId,
    providerName: input.providerName,
    vehicleClass: input.vehicleClass ?? null,
    quotedFareCents: input.quotedFareCents,
    currency: input.currency,
    routeSummary: input.routeSummary ?? null,
    screenshotFileUrl: input.screenshotFileUrl ?? null,
    screenshotFileId: input.screenshotFileId ?? null,
    submittedAt: now,
    reviewState,
    reviewedByAdminId: null,
    adminNotes: null,
    isFresh: true,
    expiresAt: null,
  };

  pod.quotes = [...pod.quotes.map((existing) => ({ ...existing, isFresh: false })), quote];
  pod.bookingState = reviewState === "AUTO_APPROVED" ? "QUOTE_APPROVED" : "QUOTE_SUBMITTED";
  pod.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("QUOTE_PROOF_CERTIFIED", {
      podId,
      userId: hostUserId,
      createdAt: now,
      eventPayload: {
        podId,
        userId: hostUserId,
        proofType: "QUOTE_SCREENSHOT",
        certificationTextVersion: quoteProofCertificationTextVersion,
        submittedAt: now,
        screenshotFileId: input.screenshotFileId ?? null,
        screenshotFileUrl: input.screenshotFileUrl ?? null,
      },
    }),
    makeAuditEvent("QUOTE_UPLOADED", {
      podId,
      userId: hostUserId,
      createdAt: now,
      eventPayload: {
        providerName: input.providerName,
        quotedFareCents: input.quotedFareCents,
        currency: input.currency,
      },
    }),
    makeAuditEvent(reviewState === "AUTO_APPROVED" ? "QUOTE_APPROVED" : "QUOTE_ABOVE_MAX", {
      podId,
      userId: hostUserId,
      createdAt: now,
      eventPayload: {
        quotedFareCents: input.quotedFareCents,
        approvedMaxTotalFareCents: pod.approvedMaxTotalFareCents,
      },
    }),
  ]);
  const recomputed = recomputeHostBookingState(podId, hostUserId);

  return {
    ok: true,
    pod,
    quote,
    bookingPermission: recomputed.bookingPermission,
    auditEvents: [...auditEvents, ...recomputed.auditEvents],
  };
}

export function recomputeHostBookingState(
  podId: string,
  hostUserId?: string,
): {
  pod: ProtectedPod | null;
  bookingPermission: BookingPermission | null;
  auditEvents: AuditEvent[];
  error?: string;
} {
  const pod = getPod(podId);
  if (!pod) return { pod: null, bookingPermission: null, auditEvents: [], error: "POD_NOT_FOUND" };

  const permission = buildBookingPermission(hostUserId ?? getCurrentHostId(pod), pod);
  const auditEvents: AuditEvent[] = [];

  if (permission.canBook) {
    const wasReady = pod.lifecycleState === "HOST_CAN_BOOK" && pod.bookingState === "CAN_BOOK";
    pod.lifecycleState = "HOST_CAN_BOOK";
    pod.bookingState = "CAN_BOOK";
    pod.updatedAt = new Date().toISOString();

    if (!wasReady) {
      auditEvents.push(
        makeAuditEvent("HOST_CAN_BOOK", {
          podId,
          userId: getCurrentHostId(pod),
          eventPayload: {
            confirmedCount: permission.confirmedCount,
            quoteFare: permission.latestQuote ? formatCents(permission.latestQuote.quotedFareCents) : null,
          },
        }),
      );
    }
  }

  if (auditEvents.length) recordAudit(auditEvents);

  return { pod, bookingPermission: permission, auditEvents };
}

export function confirmExternalBooking(
  hostUserId: string,
  podId: string,
  bookingProof: Record<string, unknown> = {},
): ExternalBookingResult {
  const pod = getPod(podId);
  if (!pod) {
    return {
      ok: false,
      pod: null,
      bookingPermission: null,
      auditEvents: [],
      warning: protectedBookingWarning,
      error: "POD_NOT_FOUND",
    };
  }

  const bookingPermission = buildBookingPermission(hostUserId, pod);
  if (!bookingPermission.canBook) {
    return {
      ok: false,
      pod,
      bookingPermission,
      auditEvents: [],
      warning: protectedBookingWarning,
      error: "PROTECTED_BOOKING_BLOCKED",
    };
  }

  pod.lifecycleState = "RIDE_BOOKED";
  pod.bookingState = "BOOKED";
  pod.updatedAt = new Date().toISOString();

  const auditEvents = recordAudit([
    makeAuditEvent("HOST_BOOKED_EXTERNAL_RIDE", {
      podId,
      userId: hostUserId,
      eventPayload: {
        protectedBooking: true,
        bookingProof,
      },
    }),
  ]);

  return {
    ok: true,
    pod,
    bookingPermission,
    auditEvents,
  };
}
