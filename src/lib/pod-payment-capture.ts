import type { PaymentProvider, ProtectedPod, ProtectedPodMember, RidePodPaymentIntent, Settlement } from "./money-safety";
import { mockPaymentIntents, mockSettlements, protectedPods } from "./money-safety-mock";
import { getPaymentProvider, mockPaymentProvider, type PaymentFinalizationResult, type PaymentProviderAdapter } from "./payment-provider";

type PaymentCaptureResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  member: ProtectedPodMember | null;
  paymentIntent: RidePodPaymentIntent | null;
  error?: string;
};

type CaptureAllResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  settlement: Settlement | null;
  results: PaymentCaptureResult[];
  error?: string;
};

type CaptureOptions = {
  paymentProvider?: PaymentProviderAdapter;
};

function getLatestSettlement(podId: string) {
  return [...mockSettlements]
    .filter((settlement) => settlement.podId === podId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null;
}

function getVerifiedReceipt(pod: ProtectedPod) {
  return [...pod.receipts]
    .filter((receipt) => receipt.verificationState === "VERIFIED")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id))[0] ?? null;
}

function findMember(podMemberId: string) {
  for (const pod of protectedPods) {
    const member = pod.members.find((candidate) => candidate.id === podMemberId);
    if (member) return { pod, member };
  }

  return { pod: null, member: null };
}

function getMemberPaymentIntent(member: ProtectedPodMember, provider?: PaymentProvider) {
  return [...mockPaymentIntents]
    .filter(
      (intent) =>
        intent.intentType === "SEAT_AUTHORIZATION" &&
        intent.podMemberId === member.id &&
        (!provider || intent.provider === provider),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null;
}

function billableSettlementMemberIds(settlement: Settlement) {
  return new Set(
    settlement.items
      .filter((item) => item.itemType === "FARE_SHARE" || item.itemType === "NO_SHOW_FEE" || item.itemType === "LATE_CANCEL_FEE")
      .map((item) => item.podMemberId)
      .filter((id): id is string => Boolean(id)),
  );
}

function failed(error: string, pod: ProtectedPod | null = null, member: ProtectedPodMember | null = null): PaymentCaptureResult {
  return { ok: false, pod, member, paymentIntent: null, error };
}

function getProvider(paymentIntent: RidePodPaymentIntent, options: CaptureOptions) {
  if (options.paymentProvider) return options.paymentProvider;
  if (paymentIntent.provider === "MOCK") return mockPaymentProvider;
  return getPaymentProvider();
}

function validatePodForCapture(pod: ProtectedPod, settlement: Settlement | null) {
  if (!settlement) return "SETTLEMENT_REQUIRED";
  if (settlement.settlementState !== "FINALIZED") return "SETTLEMENT_NOT_FINALIZED";
  if (settlement.adminReviewRequired) return "SETTLEMENT_ADMIN_REVIEW_REQUIRED";
  if (pod.adminReviewRequired || ["ADMIN_REVIEW", "DISPUTE_HOLD"].includes(pod.lifecycleState)) {
    return "POD_ADMIN_REVIEW_HOLD";
  }
  if (!getVerifiedReceipt(pod)) return "VERIFIED_RECEIPT_REQUIRED";

  return null;
}

function validateMemberPayment(member: ProtectedPodMember, paymentIntent: RidePodPaymentIntent | null) {
  if (!paymentIntent) return "PAYMENT_INTENT_REQUIRED";
  if (member.finalChargeCents === null || member.finalChargeCents === undefined) return "FINAL_CHARGE_REQUIRED";
  if (member.finalChargeCents < 0) return "FINAL_CHARGE_INVALID";
  if (member.finalChargeCents > member.maxChargeCents) return "FINAL_CHARGE_EXCEEDS_MAX_CHARGE";
  if (member.finalChargeCents > paymentIntent.amountAuthorizedCents) return "FINAL_CHARGE_EXCEEDS_AUTHORIZATION";
  if (paymentIntent.status !== "AUTHORIZED") return "PAYMENT_INTENT_NOT_CAPTURABLE";
  if (paymentIntent.provider === "STRIPE" && !paymentIntent.externalPaymentIntentId) {
    return "STRIPE_PAYMENT_INTENT_ID_REQUIRED";
  }

  return null;
}

function applyProviderResult(
  result: PaymentFinalizationResult,
  pod: ProtectedPod,
  member: ProtectedPodMember,
  captured: boolean,
): PaymentCaptureResult {
  if (!result.ok) {
    if (captured) member.paymentState = "CAPTURE_FAILED";
    member.updatedAt = new Date().toISOString();
    return { ok: false, pod, member, paymentIntent: result.paymentIntent, error: result.error };
  }

  member.paymentState = captured ? "CAPTURED" : "REFUNDED";
  member.updatedAt = new Date().toISOString();

  return {
    ok: true,
    pod,
    member,
    paymentIntent: result.paymentIntent,
  };
}

export async function captureMemberPayment(
  podMemberId: string,
  options: CaptureOptions = {},
): Promise<PaymentCaptureResult> {
  const { pod, member } = findMember(podMemberId);
  if (!pod || !member) return failed("MEMBER_NOT_FOUND", pod, member);

  const settlement = getLatestSettlement(pod.id);
  const podError = validatePodForCapture(pod, settlement);
  if (podError) return failed(podError, pod, member);

  const paymentIntent = getMemberPaymentIntent(member);
  const memberError = validateMemberPayment(member, paymentIntent);
  if (memberError) return { ok: false, pod, member, paymentIntent, error: memberError };

  const finalChargeCents = member.finalChargeCents;
  if (finalChargeCents === null || finalChargeCents === undefined) {
    return { ok: false, pod, member, paymentIntent, error: "FINAL_CHARGE_REQUIRED" };
  }
  if (finalChargeCents === 0) {
    return cancelMemberAuthorization(podMemberId, options);
  }

  const provider = getProvider(paymentIntent, options);
  if (provider.provider !== paymentIntent.provider) {
    return { ok: false, pod, member, paymentIntent, error: "PAYMENT_PROVIDER_MISMATCH" };
  }

  const result = await provider.captureAuthorizedPayment({
    podId: pod.id,
    podMemberId: member.id,
    userId: member.userId,
    externalPaymentIntentId: paymentIntent.externalPaymentIntentId,
    amountAuthorizedCents: paymentIntent.amountAuthorizedCents,
    finalChargeCents,
    currency: paymentIntent.currency,
  });

  return applyProviderResult(result, pod, member, true);
}

export async function cancelMemberAuthorization(
  podMemberId: string,
  options: CaptureOptions = {},
): Promise<PaymentCaptureResult> {
  const { pod, member } = findMember(podMemberId);
  if (!pod || !member) return failed("MEMBER_NOT_FOUND", pod, member);

  const settlement = getLatestSettlement(pod.id);
  const podError = validatePodForCapture(pod, settlement);
  if (podError) return failed(podError, pod, member);

  const paymentIntent = getMemberPaymentIntent(member);
  const memberError = validateMemberPayment(member, paymentIntent);
  if (memberError) return { ok: false, pod, member, paymentIntent, error: memberError };
  if (member.finalChargeCents !== 0) return { ok: false, pod, member, paymentIntent, error: "FINAL_CHARGE_NOT_ZERO" };

  const provider = getProvider(paymentIntent, options);
  if (provider.provider !== paymentIntent.provider) {
    return { ok: false, pod, member, paymentIntent, error: "PAYMENT_PROVIDER_MISMATCH" };
  }

  const result = await provider.cancelAuthorization({
    podId: pod.id,
    podMemberId: member.id,
    userId: member.userId,
    externalPaymentIntentId: paymentIntent.externalPaymentIntentId,
    amountAuthorizedCents: paymentIntent.amountAuthorizedCents,
    finalChargeCents: member.finalChargeCents,
    currency: paymentIntent.currency,
  });

  return applyProviderResult(result, pod, member, false);
}

export async function captureSettledRidePayments(
  podId: string,
  options: CaptureOptions = {},
): Promise<CaptureAllResult> {
  const pod = protectedPods.find((candidate) => candidate.id === podId) ?? null;
  if (!pod) return { ok: false, pod: null, settlement: null, results: [], error: "POD_NOT_FOUND" };

  const settlement = getLatestSettlement(podId);
  const podError = validatePodForCapture(pod, settlement);
  if (podError) return { ok: false, pod, settlement, results: [], error: podError };

  const billableMemberIds = billableSettlementMemberIds(settlement);
  const members = pod.members.filter((member) => billableMemberIds.has(member.id) && getMemberPaymentIntent(member));
  const results: PaymentCaptureResult[] = [];

  for (const member of members) {
    results.push(
      member.finalChargeCents === 0
        ? await cancelMemberAuthorization(member.id, options)
        : await captureMemberPayment(member.id, options),
    );
  }

  return {
    ok: results.every((result) => result.ok),
    pod,
    settlement,
    results,
    error: results.some((result) => !result.ok) ? "PAYMENT_CAPTURE_FAILED" : undefined,
  };
}
