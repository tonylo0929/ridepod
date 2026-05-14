import {
  makeAuditEvent,
  type AuditEvent,
  type HostReimbursement,
  type PodLifecycleState,
  type ProviderName,
  type ProtectedPod,
  type ProtectedPodMember,
  type Receipt,
  type ReceiptVerificationState,
  type RiskFlag,
  type RiskType,
  type Settlement,
  type SettlementItem,
} from "./money-safety";
import {
  mockAuditEvents,
  mockHostReimbursements,
  mockRiskFlags,
  mockSettlements,
  protectedPods,
} from "./money-safety-mock";

type ReceiptDecision = Extract<
  ReceiptVerificationState,
  "VERIFIED" | "NEEDS_MORE_INFO" | "REJECTED" | "FRAUD_SUSPECTED"
>;

type ReceiptDecisionInput =
  | ReceiptDecision
  | {
      decision: ReceiptDecision;
      rejectionReason?: string | null;
      fraudScore?: number | null;
    };

export type FinalReceiptUploadInput = {
  providerName: ProviderName;
  vehicleClass?: string | null;
  fareTotalCents: number;
  currency: string;
  receiptFileUrl?: string | null;
  receiptFileId?: string | null;
  rideStartedAt?: string | null;
  rideCompletedAt?: string | null;
};

export type FinalReceiptUploadResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  receipt: Receipt | null;
  auditEvents: AuditEvent[];
  error?: string;
};

export type SettlementCalculationResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  settlement: Settlement | null;
  hostReimbursement: HostReimbursement | null;
  auditEvents: AuditEvent[];
  riskFlags: RiskFlag[];
  error?: string;
};

export type ReceiptVerificationResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  receipt: Receipt | null;
  settlementResult: SettlementCalculationResult | null;
  auditEvents: AuditEvent[];
  riskFlags: RiskFlag[];
  error?: string;
};

const receiptUploadAllowedStates: PodLifecycleState[] = [
  "RIDE_BOOKED",
  "PICKUP_WINDOW",
  "IN_PROGRESS",
  "COMPLETED",
  "RECEIPT_PENDING",
  "SETTLEMENT_PENDING",
];

const externallyBookedStates: PodLifecycleState[] = [
  "RIDE_BOOKED",
  "PICKUP_WINDOW",
  "IN_PROGRESS",
  "COMPLETED",
  "RECEIPT_PENDING",
  "SETTLEMENT_PENDING",
  "SETTLED",
  "CLOSED",
];

function getPod(podId: string) {
  return protectedPods.find((candidate) => candidate.id === podId) ?? null;
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

function findReceipt(receiptId: string) {
  for (const pod of protectedPods) {
    const receipt = pod.receipts.find((candidate) => candidate.id === receiptId);
    if (receipt) return { pod, receipt };
  }

  return { pod: null, receipt: null };
}

function normalizeDecision(input: ReceiptDecisionInput) {
  if (typeof input === "string") {
    return { decision: input, rejectionReason: null, fraudScore: null };
  }

  return {
    decision: input.decision,
    rejectionReason: input.rejectionReason ?? null,
    fraudScore: input.fraudScore ?? null,
  };
}

function hasHostFault(pod: ProtectedPod) {
  return pod.adminReviewRequired || ["ADMIN_REVIEW", "DISPUTE_HOLD"].includes(pod.lifecycleState);
}

function isRideBooked(pod: ProtectedPod) {
  return externallyBookedStates.includes(pod.lifecycleState) || ["BOOKED_PENDING_PROOF", "BOOKED", "COMPLETED"].includes(pod.bookingState);
}

function wasAffectedByHostFault(member: ProtectedPodMember) {
  return /host[_\s-]?fault/i.test(member.cancelReason ?? "");
}

function isBillableMember(member: ProtectedPodMember, pod: ProtectedPod) {
  if (wasAffectedByHostFault(member)) return false;
  if (member.replacedByMemberId) return false;
  if (member.memberState === "COMPLETED") return true;
  if (member.memberState === "NO_SHOW" && isRideBooked(pod)) return true;
  if (member.memberState === "CANCELED" && isRideBooked(pod)) {
    return Boolean(member.cancellationLiabilityCents && member.cancellationLiabilityCents > 0);
  }

  return false;
}

function sortMembersForRounding(a: ProtectedPodMember, b: ProtectedPodMember) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

function getMemberChargeCap(member: ProtectedPodMember, pod: ProtectedPod, approvedFareCents: number, extraLiabilityCents: number) {
  if (!pod.higherMaxApprovedCents) return member.maxChargeCents;

  const higherMaxShareCents = Math.ceil(approvedFareCents / Math.max(1, pod.maxSeats));
  return Math.max(member.maxChargeCents, higherMaxShareCents + member.platformFeeCents + extraLiabilityCents);
}

function failedSettlement(error: string, pod: ProtectedPod | null = null): SettlementCalculationResult {
  return {
    ok: false,
    pod,
    settlement: null,
    hostReimbursement: null,
    auditEvents: [],
    riskFlags: [],
    error,
  };
}

export function uploadFinalReceipt(
  hostUserId: string,
  podId: string,
  input: FinalReceiptUploadInput,
): FinalReceiptUploadResult {
  const pod = getPod(podId);
  if (!pod) return { ok: false, pod: null, receipt: null, auditEvents: [], error: "POD_NOT_FOUND" };
  if (hostUserId !== getCurrentHostId(pod)) {
    return { ok: false, pod, receipt: null, auditEvents: [], error: "HOST_REQUIRED" };
  }
  if (!receiptUploadAllowedStates.includes(pod.lifecycleState)) {
    return { ok: false, pod, receipt: null, auditEvents: [], error: "RECEIPT_UPLOAD_NOT_ALLOWED" };
  }

  const now = new Date().toISOString();
  const receipt: Receipt = {
    id: `receipt-${pod.id}-${pod.receipts.length + 1}`,
    podId,
    hostUserId,
    providerName: input.providerName,
    vehicleClass: input.vehicleClass ?? null,
    externalTripReferenceHash: null,
    receiptFileUrl: input.receiptFileUrl ?? null,
    receiptFileId: input.receiptFileId ?? null,
    fareTotalCents: input.fareTotalCents,
    baseFareCents: null,
    taxesCents: null,
    tollsCents: null,
    feesCents: null,
    tipCents: null,
    currency: input.currency,
    rideStartedAt: input.rideStartedAt ?? null,
    rideCompletedAt: input.rideCompletedAt ?? null,
    submittedAt: now,
    verificationState: "SUBMITTED",
    reviewedByAdminId: null,
    rejectionReason: null,
    fraudScore: null,
    createdAt: now,
    updatedAt: now,
  };

  pod.receipts = [...pod.receipts, receipt];
  pod.lifecycleState = "RECEIPT_PENDING";
  pod.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("RECEIPT_UPLOADED", {
      podId,
      userId: hostUserId,
      eventPayload: {
        providerName: input.providerName,
        fareTotalCents: input.fareTotalCents,
        currency: input.currency,
      },
    }),
  ]);

  return { ok: true, pod, receipt, auditEvents };
}

export function adminVerifyReceipt(
  adminUserId: string,
  receiptId: string,
  decisionInput: ReceiptDecisionInput,
): ReceiptVerificationResult {
  const { pod, receipt } = findReceipt(receiptId);
  if (!pod || !receipt) {
    return {
      ok: false,
      pod,
      receipt,
      settlementResult: null,
      auditEvents: [],
      riskFlags: [],
      error: "RECEIPT_NOT_FOUND",
    };
  }

  const now = new Date().toISOString();
  const decision = normalizeDecision(decisionInput);
  receipt.verificationState = decision.decision;
  receipt.reviewedByAdminId = adminUserId;
  receipt.rejectionReason = decision.rejectionReason;
  receipt.fraudScore = decision.fraudScore;
  receipt.updatedAt = now;
  pod.updatedAt = now;

  if (decision.decision === "VERIFIED") {
    const verifiedEvent = makeAuditEvent("RECEIPT_VERIFIED", {
      podId: pod.id,
      userId: adminUserId,
      eventPayload: { receiptId },
    });
    recordAudit([verifiedEvent]);
    const settlementResult = calculateSettlement(pod.id);

    return {
      ok: settlementResult.ok,
      pod,
      receipt,
      settlementResult,
      auditEvents: [verifiedEvent, ...settlementResult.auditEvents],
      riskFlags: settlementResult.riskFlags,
      error: settlementResult.error,
    };
  }

  if (decision.decision === "FRAUD_SUSPECTED") {
    pod.lifecycleState = "ADMIN_REVIEW";
    pod.adminReviewRequired = true;
    const auditEvents = recordAudit([
      makeAuditEvent("ADMIN_OVERRIDE", {
        podId: pod.id,
        userId: adminUserId,
        eventPayload: {
          action: "RECEIPT_FRAUD_SUSPECTED",
          receiptId,
          decision: decision.decision,
          rejectionReason: decision.rejectionReason,
          fraudScore: decision.fraudScore,
        },
      }),
    ]);
    const riskFlags = recordRiskFlags([
      makeRiskFlag({
        podId: pod.id,
        userId: receipt.hostUserId,
        riskType: "FAKE_RECEIPT_SUSPECTED",
        severity: "HIGH",
        notes: decision.rejectionReason ?? "Receipt marked fraud suspected by admin.",
      }),
    ]);

    return { ok: true, pod, receipt, settlementResult: null, auditEvents, riskFlags };
  }

  if (decision.decision === "REJECTED") {
    pod.lifecycleState = "ADMIN_REVIEW";
    pod.adminReviewRequired = true;
    pod.updatedAt = now;
    const auditEvents = recordAudit([
      makeAuditEvent("ADMIN_OVERRIDE", {
        podId: pod.id,
        userId: adminUserId,
        eventPayload: {
          action: "RECEIPT_REJECTED",
          receiptId,
          decision: decision.decision,
          rejectionReason: decision.rejectionReason,
        },
      }),
    ]);

    return { ok: true, pod, receipt, settlementResult: null, auditEvents, riskFlags: [] };
  }

  return { ok: true, pod, receipt, settlementResult: null, auditEvents: [], riskFlags: [] };
}

export function calculateSettlement(podId: string): SettlementCalculationResult {
  const pod = getPod(podId);
  if (!pod) return failedSettlement("POD_NOT_FOUND");

  const receipt = [...pod.receipts]
    .filter((candidate) => candidate.verificationState === "VERIFIED")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id))[0] ?? null;
  if (!receipt) return failedSettlement("VERIFIED_RECEIPT_REQUIRED", pod);

  const now = new Date().toISOString();
  const verifiedFareCents = receipt.fareTotalCents;
  const approvedFareCents = pod.higherMaxApprovedCents ?? pod.approvedMaxTotalFareCents;
  const eligibleFareCents = Math.min(verifiedFareCents, approvedFareCents);
  const billableMembers = pod.members.filter((member) => isBillableMember(member, pod)).sort(sortMembersForRounding);
  const billableSeatCount = billableMembers.reduce((sum, member) => sum + member.seatCount, 0);

  if (billableSeatCount === 0) {
    pod.lifecycleState = "ADMIN_REVIEW";
    pod.adminReviewRequired = true;
    pod.updatedAt = now;
    return failedSettlement("NO_BILLABLE_MEMBERS", pod);
  }

  const settlementVersion = mockSettlements.filter((settlement) => settlement.podId === pod.id).length + 1;
  const settlementId = `settlement-${pod.id}-v${settlementVersion}`;
  const baseShareCents = Math.floor(eligibleFareCents / billableSeatCount);
  let remainderCents = eligibleFareCents % billableSeatCount;
  const items: SettlementItem[] = [];
  let hostAdjustmentsCents = 0;

  for (const member of billableMembers) {
    let fareShareCents = baseShareCents * member.seatCount;
    for (let seat = 0; seat < member.seatCount && remainderCents > 0; seat += 1) {
      fareShareCents += 1;
      remainderCents -= 1;
    }

    const extraLiabilityCents =
      member.memberState === "NO_SHOW"
        ? (member.noShowLiabilityCents ?? 0)
        : member.memberState === "CANCELED"
          ? (member.cancellationLiabilityCents ?? 0)
          : 0;
    const chargeCapCents = getMemberChargeCap(member, pod, approvedFareCents, extraLiabilityCents);
    const cappedFareShareCents = Math.min(fareShareCents, Math.max(0, chargeCapCents - member.platformFeeCents - extraLiabilityCents));
    const liabilityCents = Math.min(extraLiabilityCents, Math.max(0, chargeCapCents - member.platformFeeCents - cappedFareShareCents));
    const platformFeeCents = Math.min(member.platformFeeCents, Math.max(0, chargeCapCents - cappedFareShareCents - liabilityCents));
    const finalChargeCents = Math.min(chargeCapCents, cappedFareShareCents + liabilityCents + platformFeeCents);

    member.finalChargeCents = finalChargeCents;
    member.updatedAt = now;

    if (cappedFareShareCents < fareShareCents) {
      hostAdjustmentsCents += fareShareCents - cappedFareShareCents;
    }

    items.push({
      id: `${settlementId}-${member.id}-fare`,
      settlementId,
      podMemberId: member.id,
      userId: member.userId,
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: cappedFareShareCents,
      reasonCode: "VERIFIED_RECEIPT_SHARE",
      createdAt: now,
    });

    if (liabilityCents > 0) {
      items.push({
        id: `${settlementId}-${member.id}-${member.memberState === "NO_SHOW" ? "no-show" : "late-cancel"}`,
        settlementId,
        podMemberId: member.id,
        userId: member.userId,
        itemType: member.memberState === "NO_SHOW" ? "NO_SHOW_FEE" : "LATE_CANCEL_FEE",
        direction: "DEBIT_USER",
        amountCents: liabilityCents,
        reasonCode: member.memberState === "NO_SHOW" ? "NO_SHOW_AFTER_BOOKING" : "LATE_CANCEL_AFTER_BOOKING",
        createdAt: now,
      });
    }

    if (platformFeeCents > 0) {
      items.push({
        id: `${settlementId}-${member.id}-fee`,
        settlementId,
        podMemberId: member.id,
        userId: member.userId,
        itemType: "PLATFORM_FEE",
        direction: "PLATFORM_REVENUE",
        amountCents: platformFeeCents,
        reasonCode: "RIDEPOD_FEE",
        createdAt: now,
      });
    }
  }

  const hostFaultReviewRequired = hasHostFault(pod);
  const hostRewardCents = 0;
  const hostReimbursementCents = Math.max(0, eligibleFareCents + hostRewardCents - hostAdjustmentsCents);
  const totalPlatformFeeCents = items
    .filter((item) => item.itemType === "PLATFORM_FEE")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const auditEvents = [
    makeAuditEvent("SETTLEMENT_CREATED", {
      podId: pod.id,
      userId: getCurrentHostId(pod),
      eventPayload: {
        receiptId: receipt.id,
        eligibleFareCents,
        verifiedFareCents,
        approvedFareCents,
        billableSeatCount,
      },
    }),
  ];
  const finalizedAt = hostFaultReviewRequired ? null : now;
  if (!hostFaultReviewRequired) {
    auditEvents.push(
      makeAuditEvent("SETTLEMENT_FINALIZED", {
        podId: pod.id,
        userId: getCurrentHostId(pod),
        eventPayload: { settlementId },
      }),
    );
  }

  const settlement: Settlement = {
    id: settlementId,
    podId: pod.id,
    settlementState: hostFaultReviewRequired ? "ADMIN_REVIEW" : "FINALIZED",
    version: settlementVersion,
    approvedFareCents,
    verifiedFareCents,
    billableSeatCount,
    totalPlatformFeeCents,
    hostReimbursementCents,
    hostRewardCents,
    roundingPolicy: "stable-member-createdAt-then-id-ascending",
    disputeDeadlineAt: null,
    adminReviewRequired: hostFaultReviewRequired,
    items,
    createdAt: now,
    finalizedAt,
    updatedAt: now,
  };
  const hostReimbursement: HostReimbursement = {
    id: `host-reimbursement-${pod.id}-v${settlementVersion}`,
    podId: pod.id,
    settlementId,
    hostUserId: getCurrentHostId(pod),
    fareReimbursementCents: eligibleFareCents,
    hostRewardCents,
    adjustmentCents: -hostAdjustmentsCents,
    totalTransferCents: hostReimbursementCents,
    payoutState: hostFaultReviewRequired ? "HELD_FOR_REVIEW" : "PENDING",
    externalTransferId: null,
    scheduledAt: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };

  mockSettlements.push(settlement);
  mockHostReimbursements.push(hostReimbursement);
  recordAudit(auditEvents);
  pod.lifecycleState = hostFaultReviewRequired ? "ADMIN_REVIEW" : "SETTLEMENT_PENDING";
  pod.adminReviewRequired = hostFaultReviewRequired;
  pod.updatedAt = now;

  return {
    ok: true,
    pod,
    settlement,
    hostReimbursement,
    auditEvents,
    riskFlags: [],
  };
}
