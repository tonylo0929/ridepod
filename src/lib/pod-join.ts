import {
  createOffAppWarningEvent,
  makeAuditEvent,
  isMemberPaymentConfirmed as memberPaymentConfirmed,
  type AuditEvent,
  type EligibilityResult,
  type OffAppDetectionResult,
  type PodLifecycleState,
  type ProtectedPod,
  type ProtectedPodMember,
  type RiskFlag,
} from "./money-safety";
import { checkPodEligibility } from "./pod-eligibility";
import { mockAuditEvents, mockRiskFlags, protectedPods, protectedUsers } from "./money-safety-mock";
import { getPaymentProvider } from "./payment-provider";

type JoinServiceResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  member: ProtectedPodMember | null;
  eligibility: EligibilityResult | null;
  auditEvents: AuditEvent[];
  mockPaymentIntentId?: string | null;
  error?: string;
};

type ChatMessageResult = {
  ok: boolean;
  blocked: boolean;
  messageSent: boolean;
  message: string | null;
  warning: string | null;
  detection: OffAppDetectionResult | null;
  auditEvents: AuditEvent[];
  riskFlags: RiskFlag[];
  error?: string;
};

const joinableStates: PodLifecycleState[] = ["FORMING", "PAYMENT_LOCKING", "LOCKED"];

function failed(error: string, pod: ProtectedPod | null = null): JoinServiceResult {
  return {
    ok: false,
    pod,
    member: null,
    eligibility: null,
    auditEvents: [],
    error,
  };
}

function recordAudit(events: AuditEvent[]) {
  mockAuditEvents.push(...events);
  return events;
}

function getPodAndUser(userId: string, podId: string) {
  const user = protectedUsers.find((candidate) => candidate.id === userId) ?? null;
  const pod = protectedPods.find((candidate) => candidate.id === podId) ?? null;

  return { user, pod };
}

function getActiveMembers(pod: Pick<ProtectedPod, "members">) {
  return pod.members.filter((member) => !["CANCELED", "REMOVED"].includes(member.memberState));
}

function getPaymentConfirmedAccessMember(userId: string, pod: ProtectedPod) {
  const user = protectedUsers.find((candidate) => candidate.id === userId);
  if (!user || user.riskStatus === "SUSPENDED") return null;

  const member = pod.members.find((candidate) => candidate.userId === userId);
  if (!member || member.memberState === "REMOVED") return null;

  return memberPaymentConfirmed(member) ? member : null;
}

function isPodJoinable(pod: ProtectedPod) {
  const activeSeatCount = getActiveMembers(pod).reduce((sum, member) => sum + member.seatCount, 0);

  return joinableStates.includes(pod.lifecycleState) && activeSeatCount < pod.maxSeats;
}

function getOrCreateMember(pod: ProtectedPod, userId: string, now: string) {
  const existingMember = pod.members.find((member) => member.userId === userId);
  if (existingMember) return existingMember;

  const member: ProtectedPodMember = {
    id: `pm-${pod.id}-${userId}`,
    podId: pod.id,
    userId,
    role: "RIDER",
    memberState: "REQUESTED",
    paymentState: "NOT_STARTED",
    seatCount: 1,
    maxChargeCents: Math.ceil(pod.approvedMaxTotalFareCents / pod.maxSeats) + pod.ridepodFeeCents,
    estimatedShareCents: Math.ceil(pod.estimatedTotalFareCents / Math.max(1, pod.targetSeats)),
    finalChargeCents: null,
    platformFeeCents: pod.ridepodFeeCents,
    mockPaymentIntentId: null,
    cancellationLiabilityCents: null,
    noShowLiabilityCents: null,
    joinedAt: now,
    lockedAt: null,
    canceledAt: null,
    cancelReason: null,
    checkinState: "NOT_CHECKED_IN",
    trustDelta: null,
    eligibilityPassed: false,
    createdAt: now,
    updatedAt: now,
  };

  pod.members.push(member);
  return member;
}

function makeMockPaymentIntentId(podId: string, userId: string) {
  const stamp = Date.now().toString(36);
  return `mock_pi_${podId}_${userId}_${stamp}`;
}

export function isMemberPaymentConfirmed(member: Pick<ProtectedPodMember, "memberState" | "paymentState">) {
  return memberPaymentConfirmed(member);
}

export function requestJoinPod(
  userId: string,
  podId: string,
  optionalInviteCode?: string | null,
): JoinServiceResult {
  const { user, pod } = getPodAndUser(userId, podId);
  if (!user) return failed("USER_NOT_FOUND");
  if (!pod) return failed("POD_NOT_FOUND");
  if (!isPodJoinable(pod)) return failed("POD_NOT_JOINABLE", pod);

  const joinRequestedEvent = makeAuditEvent("JOIN_REQUESTED", {
    podId,
    userId,
  });
  const eligibility = checkPodEligibility(userId, podId, optionalInviteCode);

  if (!eligibility.eligible) {
    const auditEvents = recordAudit([
      joinRequestedEvent,
      makeAuditEvent("ELIGIBILITY_FAILED", {
        podId,
        userId,
        eventPayload: {
          blockingReason: eligibility.blockingReason,
          requiredAction: eligibility.requiredAction,
        },
      }),
    ]);

    return {
      ok: false,
      pod,
      member: null,
      eligibility,
      auditEvents,
      error: eligibility.requiredAction ?? eligibility.blockingReason ?? "INELIGIBLE",
    };
  }

  const now = new Date().toISOString();
  const member = getOrCreateMember(pod, userId, now);

  if (!isMemberPaymentConfirmed(member)) {
    member.memberState = "PAYMENT_REQUIRED";
    member.paymentState = "PAYMENT_METHOD_REQUIRED";
    member.maxChargeCents = Math.ceil(pod.approvedMaxTotalFareCents / pod.maxSeats) + pod.ridepodFeeCents;
    member.estimatedShareCents = Math.ceil(pod.estimatedTotalFareCents / Math.max(1, pod.targetSeats));
    member.platformFeeCents = pod.ridepodFeeCents;
    member.eligibilityPassed = true;
    member.updatedAt = now;
  }

  const auditEvents = recordAudit([
    joinRequestedEvent,
    makeAuditEvent("ELIGIBILITY_PASSED", { podId, userId }),
  ]);

  return {
    ok: true,
    pod,
    member,
    eligibility,
    auditEvents,
  };
}

export function authorizeSeat(userId: string, podId: string): JoinServiceResult {
  const { user, pod } = getPodAndUser(userId, podId);
  if (!user) return failed("USER_NOT_FOUND");
  if (!pod) return failed("POD_NOT_FOUND");
  if (!isPodJoinable(pod)) return failed("POD_NOT_JOINABLE", pod);

  const eligibility = checkPodEligibility(userId, podId);
  if (!eligibility.eligible) {
    const auditEvents = recordAudit([
      makeAuditEvent("ELIGIBILITY_FAILED", {
        podId,
        userId,
        eventPayload: {
          blockingReason: eligibility.blockingReason,
          requiredAction: eligibility.requiredAction,
        },
      }),
    ]);

    return {
      ok: false,
      pod,
      member: null,
      eligibility,
      auditEvents,
      error: eligibility.requiredAction ?? eligibility.blockingReason ?? "INELIGIBLE",
    };
  }

  const now = new Date().toISOString();
  const member = getOrCreateMember(pod, userId, now);
  const mockPaymentIntentId = member.mockPaymentIntentId ?? makeMockPaymentIntentId(podId, userId);
  const provider = getPaymentProvider();
  const paymentIntentResult = provider.authorizeSeat({
    podId,
    podMemberId: member.id,
    userId,
    amountAuthorizedCents: Math.ceil(pod.approvedMaxTotalFareCents / pod.maxSeats) + pod.ridepodFeeCents,
    externalPaymentIntentId: mockPaymentIntentId,
  });

  if (!paymentIntentResult.ok) {
    return {
      ok: false,
      pod,
      member,
      eligibility,
      auditEvents: [],
      error: paymentIntentResult.error ?? "PAYMENT_AUTHORIZATION_FAILED",
    };
  }

  member.paymentState = "AUTHORIZED";
  member.memberState = "CONFIRMED";
  member.maxChargeCents = Math.ceil(pod.approvedMaxTotalFareCents / pod.maxSeats) + pod.ridepodFeeCents;
  member.estimatedShareCents = Math.ceil(pod.estimatedTotalFareCents / Math.max(1, pod.targetSeats));
  member.platformFeeCents = pod.ridepodFeeCents;
  member.mockPaymentIntentId = mockPaymentIntentId;
  member.lockedAt = now;
  member.eligibilityPassed = true;
  member.updatedAt = now;

  const paymentAuthorizedEvent = makeAuditEvent("PAYMENT_AUTHORIZED", {
    podId,
    userId,
    eventPayload: {
      provider: "MOCK",
      mockPaymentIntentId,
      maxChargeCents: member.maxChargeCents,
      platformFeeCents: member.platformFeeCents,
    },
  });
  const recomputeResult = recomputePodLockState(podId);
  const auditEvents = recordAudit([paymentAuthorizedEvent, ...recomputeResult.auditEvents]);

  return {
    ok: true,
    pod: recomputeResult.pod,
    member,
    eligibility,
    auditEvents,
    mockPaymentIntentId,
  };
}

export function recomputePodLockState(podId: string): {
  pod: ProtectedPod | null;
  confirmedCount: number;
  auditEvents: AuditEvent[];
  error?: string;
} {
  const pod = protectedPods.find((candidate) => candidate.id === podId) ?? null;
  if (!pod) return { pod: null, confirmedCount: 0, auditEvents: [], error: "POD_NOT_FOUND" };

  if (["CANCELED", "EXPIRED", "ADMIN_REVIEW", "DISPUTE_HOLD", "RIDE_BOOKED"].includes(pod.lifecycleState)) {
    return { pod, confirmedCount: 0, auditEvents: [] };
  }

  const confirmedCount = getActiveMembers(pod)
    .filter(isMemberPaymentConfirmed)
    .reduce((sum, member) => sum + member.seatCount, 0);
  const previousLifecycleState = pod.lifecycleState;

  if (confirmedCount === 0) {
    pod.lifecycleState = "FORMING";
  } else if (confirmedCount < pod.minSeatsToBook) {
    pod.lifecycleState = "PAYMENT_LOCKING";
  } else {
    pod.lifecycleState = "LOCKED";
    pod.chatUnlockedAt ??= new Date().toISOString();
    pod.detailsUnlockedAt ??= new Date().toISOString();
  }

  pod.updatedAt = new Date().toISOString();

  const auditEvents =
    pod.lifecycleState === "LOCKED" && previousLifecycleState !== "LOCKED"
      ? [makeAuditEvent("POD_LOCKED", { podId, eventPayload: { confirmedCount } })]
      : [];

  return { pod, confirmedCount, auditEvents };
}

export function canAccessExactPickup(userId: string, podId: string) {
  const pod = protectedPods.find((candidate) => candidate.id === podId);
  if (!pod?.detailsUnlockedAt) return false;

  return Boolean(getPaymentConfirmedAccessMember(userId, pod));
}

export function canViewExactPickup(userId: string, podId: string) {
  return canAccessExactPickup(userId, podId);
}

export function canAccessPodChat(userId: string, podId: string) {
  const pod = protectedPods.find((candidate) => candidate.id === podId);
  if (!pod?.chatUnlockedAt) return false;

  return Boolean(getPaymentConfirmedAccessMember(userId, pod));
}

export function getPublicRouteInfo(podId: string) {
  const pod = protectedPods.find((candidate) => candidate.id === podId);
  if (!pod) return null;

  return {
    originGeneral: pod.originGeneral,
    destinationGeneral: pod.destinationGeneral,
    departureAt: pod.departureAt,
    genderMode: pod.genderMode,
    accessMode: pod.accessMode,
    lifecycleState: pod.lifecycleState,
    bookingState: pod.bookingState,
  };
}

export function sendChatMessage(
  userId: string,
  podId: string,
  messageText: string,
  options: { sendAnyway?: boolean } = {},
): ChatMessageResult {
  const pod = protectedPods.find((candidate) => candidate.id === podId);
  if (!pod) {
    return {
      ok: false,
      blocked: true,
      messageSent: false,
      message: null,
      warning: null,
      detection: null,
      auditEvents: [],
      riskFlags: [],
      error: "POD_NOT_FOUND",
    };
  }

  if (!canAccessPodChat(userId, podId)) {
    return {
      ok: false,
      blocked: true,
      messageSent: false,
      message: "Chat unlocks after your seat is payment-authorized.",
      warning: null,
      detection: null,
      auditEvents: [],
      riskFlags: [],
      error: "CHAT_LOCKED",
    };
  }

  const warningEvent = createOffAppWarningEvent(podId, userId, messageText);
  const auditEvents = warningEvent.auditEvent ? recordAudit([warningEvent.auditEvent]) : [];
  const riskFlags = warningEvent.riskFlag ? [warningEvent.riskFlag] : [];
  mockRiskFlags.push(...riskFlags);
  const shouldHoldForWarning = warningEvent.detection.shouldWarn && !options.sendAnyway;

  return {
    ok: !shouldHoldForWarning,
    blocked: false,
    messageSent: !shouldHoldForWarning,
    message: shouldHoldForWarning ? null : messageText,
    warning: warningEvent.detection.warning,
    detection: warningEvent.detection,
    auditEvents,
    riskFlags,
  };
}
