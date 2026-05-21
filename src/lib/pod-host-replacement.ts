import {
  isMemberPaymentConfirmed,
  makeAuditEvent,
  type AuditEvent,
  type EligibilityResult,
  type HostBookingState,
  type PodLifecycleState,
  type ProtectedPod,
  type ProtectedPodMember,
  type RiskFlag,
  type RiskType,
} from "./money-safety";
import { mockAuditEvents, mockRiskFlags, protectedPods, protectedUsers } from "./money-safety-mock";
import { checkPodEligibility } from "./pod-eligibility";

const hostCanceledParticipantMessage =
  "Host canceled. Your pod is still active while RidePod looks for a replacement host. Your seat commitment stays in review unless a replacement host books the external ride.";

const beforeBookingCancellationStates: PodLifecycleState[] = [
  "FORMING",
  "PAYMENT_LOCKING",
  "LOCKED",
  "HOST_CAN_BOOK",
];

const afterBookingCancellationStates: PodLifecycleState[] = [
  "RIDE_BOOKED",
  "PICKUP_WINDOW",
  "IN_PROGRESS",
  "COMPLETED",
  "RECEIPT_PENDING",
  "SETTLEMENT_PENDING",
  "SETTLED",
  "CLOSED",
];

const externallyBookedBookingStates: HostBookingState[] = [
  "BOOKED_PENDING_PROOF",
  "BOOKED",
  "COMPLETED",
];

export type HostCancellationResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  auditEvents: AuditEvent[];
  riskFlags: RiskFlag[];
  participantMessage?: string;
  error?: string;
};

export type ReplacementHostResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  member: ProtectedPodMember | null;
  eligibility: EligibilityResult | null;
  auditEvents: AuditEvent[];
  riskFlags: RiskFlag[];
  error?: string;
};

function getPod(podId: string) {
  return protectedPods.find((candidate) => candidate.id === podId) ?? null;
}

function getUser(userId: string) {
  return protectedUsers.find((candidate) => candidate.id === userId) ?? null;
}

function getCurrentHostId(pod: Pick<ProtectedPod, "hostUserId" | "replacementHostUserId">) {
  return pod.replacementHostUserId ?? pod.hostUserId;
}

function recordAudit(events: AuditEvent[]) {
  mockAuditEvents.push(...events);
  return events;
}

function recordRiskFlags(flags: RiskFlag[]) {
  mockRiskFlags.push(...flags);
  return flags;
}

function makeRiskFlag(input: {
  podId: string | null;
  userId: string;
  riskType: RiskType;
  severity: RiskFlag["severity"];
  notes: string | null;
}): RiskFlag {
  const now = new Date().toISOString();

  return {
    id: `risk-${input.riskType.toLowerCase()}-${now}`,
    podId: input.podId,
    userId: input.userId,
    riskType: input.riskType,
    severity: input.severity,
    status: "OPEN",
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}

function failedCancellation(error: string, pod: ProtectedPod | null = null): HostCancellationResult {
  return { ok: false, pod, auditEvents: [], riskFlags: [], error };
}

function failedReplacement(
  error: string,
  pod: ProtectedPod | null = null,
  member: ProtectedPodMember | null = null,
  eligibility: EligibilityResult | null = null,
  auditEvents: AuditEvent[] = [],
): ReplacementHostResult {
  return { ok: false, pod, member, eligibility, auditEvents, riskFlags: [], error };
}

export function isExternallyBooked(pod: Pick<ProtectedPod, "lifecycleState" | "bookingState">) {
  return afterBookingCancellationStates.includes(pod.lifecycleState) || externallyBookedBookingStates.includes(pod.bookingState);
}

export function cancelHostBeforeBooking(
  hostUserId: string,
  podId: string,
  reason: string,
): HostCancellationResult {
  const pod = getPod(podId);
  if (!pod) return failedCancellation("POD_NOT_FOUND");

  const currentHostId = getCurrentHostId(pod);
  if (hostUserId !== currentHostId) return failedCancellation("HOST_REQUIRED", pod);

  if (!beforeBookingCancellationStates.includes(pod.lifecycleState) || isExternallyBooked(pod)) {
    return failedCancellation("HOST_CANCEL_BEFORE_BOOKING_NOT_ALLOWED", pod);
  }

  const now = new Date().toISOString();
  pod.members = pod.members.map((member) =>
    member.userId === hostUserId && ["HOST", "REPLACEMENT_HOST"].includes(member.role)
      ? {
          ...member,
          memberState: "CANCELED",
          canceledAt: now,
          cancelReason: reason,
          updatedAt: now,
        }
      : member,
  );
  pod.lifecycleState = "HOST_REPLACEMENT_NEEDED";
  pod.bookingState = "CANCELED_BY_HOST";
  pod.originalHostUserId ??= currentHostId;
  if (pod.replacementHostUserId === currentHostId) pod.replacementHostUserId = null;
  pod.hostReplacementStartedAt = now;
  pod.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("HOST_CANCELED_BEFORE_BOOKING", {
      podId,
      userId: hostUserId,
      eventPayload: { reason },
    }),
    makeAuditEvent("HOST_REPLACEMENT_STARTED", {
      podId,
      userId: hostUserId,
      eventPayload: { participantMessage: hostCanceledParticipantMessage },
    }),
  ]);

  return {
    ok: true,
    pod,
    auditEvents,
    riskFlags: [],
    participantMessage: hostCanceledParticipantMessage,
  };
}

export function acceptReplacementHost(userId: string, podId: string): ReplacementHostResult {
  const pod = getPod(podId);
  if (!pod) return failedReplacement("POD_NOT_FOUND");

  const user = getUser(userId);
  if (!user) return failedReplacement("USER_NOT_FOUND", pod);

  if (pod.lifecycleState !== "HOST_REPLACEMENT_NEEDED" || isExternallyBooked(pod)) {
    return failedReplacement("HOST_REPLACEMENT_NOT_AVAILABLE", pod);
  }

  const member = pod.members.find((candidate) => candidate.userId === userId) ?? null;
  const eligibility = checkPodEligibility(userId, podId);

  if (!member || !isMemberPaymentConfirmed(member)) {
    return failedReplacement("CONFIRMED_PARTICIPANT_REQUIRED", pod, member, eligibility);
  }

  if (user.riskStatus === "SUSPENDED" || user.riskStatus === "RESTRICTED" || !eligibility.eligible) {
    const auditEvents = recordAudit([
      makeAuditEvent("ELIGIBILITY_FAILED", {
        podId,
        userId,
        eventPayload: {
          blockingReason:
            eligibility.blockingReason ?? "Only eligible, unrestricted confirmed participants can become replacement host.",
          requiredAction: eligibility.requiredAction,
          riskStatus: user.riskStatus,
        },
      }),
    ]);

    return failedReplacement("REPLACEMENT_HOST_NOT_ELIGIBLE", pod, member, eligibility, auditEvents);
  }

  const now = new Date().toISOString();
  pod.members = pod.members.map((candidate) => {
    if (candidate.userId === userId) return { ...candidate, role: "REPLACEMENT_HOST", updatedAt: now };
    if (candidate.role === "REPLACEMENT_HOST") return { ...candidate, role: "RIDER", updatedAt: now };
    return candidate;
  });
  pod.replacementHostUserId = userId;
  pod.bookingState = "QUOTE_ALLOWED";
  pod.quotes = pod.quotes.map((quote) => ({ ...quote, isFresh: false }));
  pod.updatedAt = now;

  const acceptedMember = pod.members.find((candidate) => candidate.userId === userId) ?? member;
  const auditEvents = recordAudit([
    makeAuditEvent("REPLACEMENT_HOST_ACCEPTED", {
      podId,
      userId,
      eventPayload: { freshQuoteRequired: true },
    }),
  ]);

  return {
    ok: true,
    pod,
    member: acceptedMember,
    eligibility,
    auditEvents,
    riskFlags: [],
  };
}

export function cancelHostAfterBooking(
  hostUserId: string,
  podId: string,
  reason: string,
): HostCancellationResult {
  const pod = getPod(podId);
  if (!pod) return failedCancellation("POD_NOT_FOUND");

  if (hostUserId !== getCurrentHostId(pod)) return failedCancellation("HOST_REQUIRED", pod);
  if (!isExternallyBooked(pod)) return failedCancellation("HOST_CANCEL_AFTER_BOOKING_NOT_ALLOWED", pod);

  const now = new Date().toISOString();
  pod.lifecycleState = "ADMIN_REVIEW";
  pod.bookingState = "CANCELED_BY_HOST";
  pod.adminReviewRequired = true;
  pod.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("HOST_CANCELED_AFTER_BOOKING", {
      podId,
      userId: hostUserId,
      eventPayload: {
        reason,
        adminReviewRequired: true,
        reimbursementImpact: "HOST_REIMBURSEMENT_HELD_FOR_REVIEW",
      },
    }),
  ]);
  const riskFlags = recordRiskFlags([
    makeRiskFlag({
      podId,
      userId: hostUserId,
      riskType: "HOST_CANCELED_AFTER_BOOKING",
      severity: "HIGH",
      notes: "Host cancellation after external booking requires admin reimbursement review.",
    }),
  ]);

  return {
    ok: true,
    pod,
    auditEvents,
    riskFlags,
  };
}
