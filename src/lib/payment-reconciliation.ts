import {
  canHostBook,
  getConfirmedMembers,
  getLatestFreshQuote,
  getSafetyBadges,
  type HostReimbursement,
  type ProtectedPod,
  type ProtectedPodMember,
  type Receipt,
  type RidePodPaymentIntent,
  type RiskFlag,
  type Settlement,
} from "./money-safety";
import {
  getProtectedPodOrFallback,
  mockHostReimbursements,
  mockPaymentIntents,
  mockRiskFlags,
  mockSettlements,
  protectedPods,
  protectedUsers,
} from "./money-safety-mock";

export type ReconciledMemberPayment = {
  member: ProtectedPodMember;
  userName: string;
  paymentIntent: RidePodPaymentIntent | null;
};

export type PaymentReconciliationSnapshot = {
  pod: ProtectedPod;
  hostName: string;
  safetyBadges: string[];
  confirmedSeats: number;
  latestQuote: ReturnType<typeof getLatestFreshQuote>;
  latestReceipt: Receipt | null;
  verifiedReceipt: Receipt | null;
  settlement: Settlement | null;
  hostReimbursement: HostReimbursement | null;
  riskFlags: RiskFlag[];
  members: ReconciledMemberPayment[];
  warnings: string[];
};

function latestByCreatedAt<T extends { createdAt: string; id: string }>(items: T[]) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null;
}

function latestReceipt(pod: ProtectedPod) {
  return [...pod.receipts]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id))[0] ?? null;
}

function latestVerifiedReceipt(pod: ProtectedPod) {
  return [...pod.receipts]
    .filter((receipt) => receipt.verificationState === "VERIFIED")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id))[0] ?? null;
}

function latestPaymentIntent(memberId: string) {
  return latestByCreatedAt(
    mockPaymentIntents.filter(
      (intent) => intent.intentType === "SEAT_AUTHORIZATION" && intent.podMemberId === memberId,
    ),
  );
}

function latestSettlement(podId: string) {
  return latestByCreatedAt(mockSettlements.filter((settlement) => settlement.podId === podId));
}

function hostReimbursementForSettlement(settlement: Settlement | null) {
  if (!settlement) return null;
  return mockHostReimbursements.find((reimbursement) => reimbursement.settlementId === settlement.id) ?? null;
}

function userName(userId: string) {
  return protectedUsers.find((user) => user.id === userId)?.name ?? userId;
}

export function getPaymentReconciliationSnapshot(podId?: string | null): PaymentReconciliationSnapshot {
  const pod = podId ? getProtectedPodOrFallback(podId) : protectedPods[0];
  const settlement = latestSettlement(pod.id);
  const hostReimbursement = hostReimbursementForSettlement(settlement);
  const latestQuote = getLatestFreshQuote(pod);
  const receipt = latestReceipt(pod);
  const verifiedReceipt = latestVerifiedReceipt(pod);
  const members = pod.members.map((member) => ({
    member,
    userName: userName(member.userId),
    paymentIntent: latestPaymentIntent(member.id),
  }));
  const snapshot = {
    pod,
    hostName: userName(pod.replacementHostUserId ?? pod.hostUserId),
    safetyBadges: getSafetyBadges(pod),
    confirmedSeats: getConfirmedMembers(pod).reduce((sum, member) => sum + member.seatCount, 0),
    latestQuote,
    latestReceipt: receipt,
    verifiedReceipt,
    settlement,
    hostReimbursement,
    riskFlags: mockRiskFlags.filter((flag) => flag.podId === pod.id),
    members,
    warnings: [],
  };

  return {
    ...snapshot,
    warnings: getPaymentReconciliationWarnings(snapshot),
  };
}

export function getPaymentReconciliationWarnings(
  snapshot: Omit<PaymentReconciliationSnapshot, "warnings">,
): string[] {
  const warnings: string[] = [];
  const { pod, settlement, hostReimbursement, verifiedReceipt } = snapshot;

  for (const { member, paymentIntent } of snapshot.members) {
    if (member.finalChargeCents !== null && member.finalChargeCents > member.maxChargeCents) {
      warnings.push(`Final charge exceeds max charge for ${member.userId}.`);
    }
    if (!paymentIntent) continue;
    if (member.finalChargeCents !== null && paymentIntent.amountCapturedCents > member.finalChargeCents) {
      warnings.push(`Captured amount exceeds final charge for ${member.userId}.`);
    }
    if (paymentIntent.status === "REFUNDED" && member.paymentState !== "REFUNDED") {
      warnings.push(`Payment intent is refunded but member ${member.userId} is not marked refunded.`);
    }
    if (paymentIntent.status === "DISPUTED" && member.paymentState !== "DISPUTED") {
      warnings.push(`Payment intent is disputed but member ${member.userId} is not marked disputed.`);
    }
  }

  if (settlement && !verifiedReceipt) {
    warnings.push("Settlement exists without a verified receipt.");
  }

  if (hostReimbursement) {
    const allowedReimbursementCents = (settlement?.hostReimbursementCents ?? 0) + (settlement?.hostRewardCents ?? 0);
    if (hostReimbursement.totalTransferCents > allowedReimbursementCents) {
      warnings.push("Host reimbursement exceeds eligible fare plus approved host reward.");
    }
    if (hostReimbursement.externalTransferId && ["ADMIN_REVIEW", "DISPUTE_HOLD"].includes(pod.lifecycleState)) {
      warnings.push("Transfer exists while pod is in admin review or dispute hold.");
    }
    if (hostReimbursement.payoutState === "PAID" && pod.lifecycleState === "DISPUTE_HOLD") {
      warnings.push("Host reimbursement is paid while dispute hold is active.");
    }
  }

  const permission = canHostBook(pod.replacementHostUserId ?? pod.hostUserId, pod);
  const hasApprovedQuote = Boolean(
    snapshot.latestQuote && ["AUTO_APPROVED", "QUOTE_APPROVED"].includes(snapshot.latestQuote.reviewState),
  );
  if (pod.lifecycleState === "HOST_CAN_BOOK" && !hasApprovedQuote) {
    warnings.push("HOST_CAN_BOOK exists without an approved quote.");
  }
  if (pod.lifecycleState === "RIDE_BOOKED" && snapshot.confirmedSeats < pod.minSeatsToBook) {
    warnings.push("RIDE_BOOKED exists without required payment-authorized participants.");
  }
  if (permission.canBook && snapshot.confirmedSeats < pod.minSeatsToBook) {
    warnings.push("Booking permission is true without required payment locks.");
  }

  return [...new Set(warnings)];
}
