import Stripe from "stripe";

import {
  makeAuditEvent,
  type AuditEvent,
  type PaymentProvider,
  type ProtectedPod,
  type ProtectedPodMember,
  type RidePodPaymentIntent,
} from "./money-safety";
import {
  mockAuditEvents,
  mockHostReimbursements,
  mockPaymentIntents,
  protectedPods,
} from "./money-safety-mock";
import { adminOverridePodState, createAdminReview } from "./pod-admin-review";
import {
  createStripeTestProvider,
  mockPaymentProvider,
  type PaymentProviderAdapter,
} from "./payment-provider";
import { getConfiguredPaymentProviderName, getStripeTestConfig } from "./stripe-config";

type EnvLike = Partial<Record<string, string | undefined>>;

type StripeRefundLike = {
  id: string;
  amount: number;
  status?: "succeeded" | "pending" | "failed" | "canceled" | string;
  failure_reason?: string | null;
};

export type StripeRefundClient = {
  refunds: {
    create(
      input: {
        payment_intent: string;
        amount: number;
        metadata: Record<string, string>;
      },
      options?: { idempotencyKey?: string },
    ): Promise<StripeRefundLike>;
  };
};

type RefundOptions = {
  env?: EnvLike;
  stripe?: StripeRefundClient;
  paymentProvider?: PaymentProviderAdapter;
  forceStripe?: boolean;
  allowDisputed?: boolean;
};

type RefundResult = {
  ok: boolean;
  provider: PaymentProvider;
  pod: ProtectedPod | null;
  member: ProtectedPodMember | null;
  paymentIntent: RidePodPaymentIntent | null;
  amountRefundedCents: number;
  auditEvents: AuditEvent[];
  error?: string;
};

type DisputeDecision = "RIDER_REFUND" | "HOST_VALID" | "SPLIT_ADJUSTMENT" | "FRAUD_SUSPECTED" | "DISMISS";

type DisputeOptions = RefundOptions & {
  podMemberId?: string | null;
  refundAmountCents?: number | null;
};

type DisputeResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  member: ProtectedPodMember | null;
  paymentIntent: RidePodPaymentIntent | null;
  auditEvents: AuditEvent[];
  refundResult?: RefundResult;
  error?: string;
};

let stripeClient: StripeRefundClient | null = null;

function getStripeClient(secretKey: string): StripeRefundClient {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey) as unknown as StripeRefundClient;
  }

  return stripeClient;
}

function recordAudit(events: AuditEvent[]) {
  mockAuditEvents.push(...events);
  return events;
}

function getProvider(options: RefundOptions, paymentIntent?: RidePodPaymentIntent | null): PaymentProvider {
  if (paymentIntent) return paymentIntent.provider;
  return options.forceStripe || getConfiguredPaymentProviderName(options.env) === "STRIPE_TEST" ? "STRIPE" : "MOCK";
}

function findMember(podMemberId: string) {
  for (const pod of protectedPods) {
    const member = pod.members.find((candidate) => candidate.id === podMemberId);
    if (member) return { pod, member };
  }

  return { pod: null, member: null };
}

function getMemberPaymentIntent(member: ProtectedPodMember) {
  return [...mockPaymentIntents]
    .filter((intent) => intent.intentType === "SEAT_AUTHORIZATION" && intent.podMemberId === member.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null;
}

function failedRefund(
  provider: PaymentProvider,
  error: string,
  pod: ProtectedPod | null = null,
  member: ProtectedPodMember | null = null,
  paymentIntent: RidePodPaymentIntent | null = null,
): RefundResult {
  return {
    ok: false,
    provider,
    pod,
    member,
    paymentIntent,
    amountRefundedCents: 0,
    auditEvents: [],
    error,
  };
}

function updateRefundedState(
  provider: PaymentProvider,
  pod: ProtectedPod,
  member: ProtectedPodMember,
  paymentIntent: RidePodPaymentIntent,
  amountCents: number,
  reason: string,
  externalRefundId: string | null,
): RefundResult {
  const now = new Date().toISOString();
  const nextRefundedCents = paymentIntent.amountRefundedCents + amountCents;
  paymentIntent.amountRefundedCents = nextRefundedCents;
  paymentIntent.status = nextRefundedCents >= paymentIntent.amountCapturedCents ? "REFUNDED" : paymentIntent.status;
  paymentIntent.updatedAt = now;
  member.paymentState = nextRefundedCents >= paymentIntent.amountCapturedCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
  member.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("PAYMENT_REFUNDED", {
      podId: pod.id,
      userId: member.userId,
      eventPayload: {
        podMemberId: member.id,
        localPaymentIntentId: paymentIntent.id,
        externalPaymentIntentId: paymentIntent.externalPaymentIntentId,
        externalRefundId,
        amountCents,
        amountRefundedCents: nextRefundedCents,
        provider,
        reason,
      },
    }),
  ]);

  return {
    ok: true,
    provider,
    pod,
    member,
    paymentIntent,
    amountRefundedCents: amountCents,
    auditEvents,
  };
}

export async function refundMemberPayment(
  podMemberId: string,
  amountCents: number,
  reason: string,
  options: RefundOptions = {},
): Promise<RefundResult> {
  const { pod, member } = findMember(podMemberId);
  if (!pod || !member) return failedRefund(getProvider(options), "MEMBER_NOT_FOUND", pod, member);

  const paymentIntent = getMemberPaymentIntent(member);
  const provider = getProvider(options, paymentIntent);
  if (!paymentIntent) return failedRefund(provider, "PAYMENT_INTENT_REQUIRED", pod, member);
  if (amountCents <= 0) return failedRefund(provider, "REFUND_AMOUNT_REQUIRED", pod, member, paymentIntent);
  if (paymentIntent.amountCapturedCents <= 0) {
    return failedRefund(provider, "PAYMENT_NOT_CAPTURED", pod, member, paymentIntent);
  }
  if (paymentIntent.status === "DISPUTED" && !options.allowDisputed) {
    return failedRefund(provider, "PAYMENT_DISPUTED", pod, member, paymentIntent);
  }

  const refundableCents = paymentIntent.amountCapturedCents - paymentIntent.amountRefundedCents;
  if (amountCents > refundableCents) {
    return failedRefund(provider, "REFUND_EXCEEDS_CAPTURED_AMOUNT", pod, member, paymentIntent);
  }

  if (provider === "MOCK") {
    return updateRefundedState("MOCK", pod, member, paymentIntent, amountCents, reason, `mock_refund_${paymentIntent.id}`);
  }

  const config = getStripeTestConfig(options.env);
  if (!config.ok) return failedRefund("STRIPE", config.error, pod, member, paymentIntent);
  if (!paymentIntent.externalPaymentIntentId) {
    createAdminReview(pod.id, "Stripe refund target is missing.", {
      lifecycleState: "ADMIN_REVIEW",
      userId: member.userId,
      riskType: "STRIPE_PAYMENT_DISPUTE",
      severity: "MEDIUM",
      notes: "Refund requires admin review because the local payment record has no Stripe PaymentIntent id.",
    });
    return failedRefund("STRIPE", "STRIPE_REFUND_TARGET_REQUIRED", pod, member, paymentIntent);
  }

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const idempotencyKey = `ridepod-refund-${paymentIntent.id}-${paymentIntent.amountRefundedCents + amountCents}`;

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntent.externalPaymentIntentId,
        amount: amountCents,
        metadata: {
          podId: pod.id,
          podMemberId: member.id,
          userId: member.userId,
          reason,
          refundType: "ridepod_refund",
          environment: "test",
        },
      },
      { idempotencyKey },
    );

    if (refund.status && refund.status !== "succeeded" && refund.status !== "pending") {
      return failedRefund("STRIPE", "STRIPE_REFUND_FAILED", pod, member, paymentIntent);
    }

    return updateRefundedState("STRIPE", pod, member, paymentIntent, amountCents, reason, refund.id);
  } catch {
    return failedRefund("STRIPE", "STRIPE_REFUND_FAILED", pod, member, paymentIntent);
  }
}

export async function releaseUncapturedAuthorization(
  podMemberId: string,
  reason: string,
  options: RefundOptions = {},
): Promise<RefundResult> {
  const { pod, member } = findMember(podMemberId);
  if (!pod || !member) return failedRefund(getProvider(options), "MEMBER_NOT_FOUND", pod, member);

  const paymentIntent = getMemberPaymentIntent(member);
  const provider = getProvider(options, paymentIntent);
  if (!paymentIntent) return failedRefund(provider, "PAYMENT_INTENT_REQUIRED", pod, member);
  if (paymentIntent.amountCapturedCents > paymentIntent.amountRefundedCents) {
    return failedRefund(provider, "PAYMENT_ALREADY_CAPTURED", pod, member, paymentIntent);
  }
  if (paymentIntent.status !== "AUTHORIZED" && !(paymentIntent.status === "DISPUTED" && options.allowDisputed)) {
    return failedRefund(provider, "PAYMENT_AUTHORIZATION_NOT_RELEASABLE", pod, member, paymentIntent);
  }

  const paymentProvider =
    options.paymentProvider ??
    (provider === "MOCK"
      ? mockPaymentProvider
      : createStripeTestProvider(options.env, {
          paymentIntents: {
            cancel: async () => ({ id: paymentIntent.externalPaymentIntentId ?? "", status: "canceled" }),
          },
        }));
  if (paymentProvider.provider !== provider) {
    return failedRefund(provider, "PAYMENT_PROVIDER_MISMATCH", pod, member, paymentIntent);
  }

  const result = await paymentProvider.cancelAuthorization({
    podId: pod.id,
    podMemberId: member.id,
    userId: member.userId,
    externalPaymentIntentId: paymentIntent.externalPaymentIntentId,
    amountAuthorizedCents: paymentIntent.amountAuthorizedCents,
    finalChargeCents: 0,
    currency: paymentIntent.currency,
  });

  if (!result.ok || !result.paymentIntent) {
    return failedRefund(provider, result.error ?? "AUTHORIZATION_RELEASE_FAILED", pod, member, paymentIntent);
  }

  const now = new Date().toISOString();
  member.paymentState = "AUTH_EXPIRED";
  member.memberState = "CANCELED";
  member.canceledAt = now;
  member.cancelReason = reason;
  member.updatedAt = now;
  paymentIntent.status = "CANCELED";
  paymentIntent.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("PAYMENT_AUTHORIZATION_RELEASED", {
      podId: pod.id,
      userId: member.userId,
      eventPayload: {
        podMemberId: member.id,
        localPaymentIntentId: paymentIntent.id,
        externalPaymentIntentId: paymentIntent.externalPaymentIntentId,
        provider,
        reason,
      },
    }),
  ]);

  return {
    ok: true,
    provider,
    pod,
    member,
    paymentIntent,
    amountRefundedCents: 0,
    auditEvents,
  };
}

export function openRidePodDispute(
  podId: string,
  podMemberId: string | null,
  reason: string,
  metadata: Record<string, unknown> = {},
): DisputeResult {
  const pod = protectedPods.find((candidate) => candidate.id === podId) ?? null;
  if (!pod) return { ok: false, pod: null, member: null, paymentIntent: null, auditEvents: [], error: "POD_NOT_FOUND" };

  const member = podMemberId ? (pod.members.find((candidate) => candidate.id === podMemberId) ?? null) : null;
  const paymentIntent = member ? getMemberPaymentIntent(member) : null;
  if (member) {
    member.paymentState = "DISPUTED";
    member.updatedAt = new Date().toISOString();
  }
  if (paymentIntent) {
    paymentIntent.status = "DISPUTED";
    paymentIntent.updatedAt = new Date().toISOString();
  }

  const reimbursements = mockHostReimbursements.filter((reimbursement) => reimbursement.podId === podId);
  for (const reimbursement of reimbursements) {
    if (reimbursement.payoutState !== "PAID") {
      reimbursement.payoutState = "HELD_FOR_REVIEW";
      reimbursement.updatedAt = new Date().toISOString();
    }
  }

  const review = createAdminReview(podId, reason, {
    lifecycleState: "DISPUTE_HOLD",
    userId: member?.userId ?? pod.hostUserId,
    riskType: "STRIPE_PAYMENT_DISPUTE",
    severity: "HIGH",
    notes: reason,
    ...metadata,
  });
  const auditEvents = recordAudit([
    makeAuditEvent("RIDEPOD_DISPUTE_OPENED", {
      podId,
      userId: member?.userId ?? pod.hostUserId,
      eventPayload: {
        podMemberId,
        reason,
        metadata,
        hostTransferAlreadyPaid: reimbursements.some((reimbursement) => reimbursement.payoutState === "PAID"),
      },
    }),
  ]);

  return {
    ok: review.ok,
    pod,
    member,
    paymentIntent,
    auditEvents: [...review.auditEvents, ...auditEvents],
    error: review.error,
  };
}

export async function resolveRidePodDispute(
  adminUserId: string,
  podId: string,
  decision: DisputeDecision,
  notes: string,
  options: DisputeOptions = {},
): Promise<DisputeResult> {
  if (!adminUserId) return { ok: false, pod: null, member: null, paymentIntent: null, auditEvents: [], error: "ADMIN_REQUIRED" };
  if (!notes?.trim()) return { ok: false, pod: null, member: null, paymentIntent: null, auditEvents: [], error: "ADMIN_NOTES_REQUIRED" };

  const pod = protectedPods.find((candidate) => candidate.id === podId) ?? null;
  if (!pod) return { ok: false, pod: null, member: null, paymentIntent: null, auditEvents: [], error: "POD_NOT_FOUND" };

  const member =
    options.podMemberId
      ? (pod.members.find((candidate) => candidate.id === options.podMemberId) ?? null)
      : (pod.members.find((candidate) => candidate.paymentState === "DISPUTED") ?? null);
  const paymentIntent = member ? getMemberPaymentIntent(member) : null;
  let refundResult: RefundResult | undefined;

  if (decision === "RIDER_REFUND") {
    if (!member || !paymentIntent) {
      return { ok: false, pod, member, paymentIntent, auditEvents: [], error: "PAYMENT_INTENT_REQUIRED" };
    }
    if (paymentIntent.amountCapturedCents > paymentIntent.amountRefundedCents) {
      const refundAmountCents =
        options.refundAmountCents ?? paymentIntent.amountCapturedCents - paymentIntent.amountRefundedCents;
      refundResult = await refundMemberPayment(member.id, refundAmountCents, notes, { ...options, allowDisputed: true });
    } else {
      refundResult = await releaseUncapturedAuthorization(member.id, notes, { ...options, allowDisputed: true });
    }
    if (!refundResult.ok) {
      return { ok: false, pod, member, paymentIntent, auditEvents: refundResult.auditEvents, refundResult, error: refundResult.error };
    }
  } else if (decision === "HOST_VALID" || decision === "DISMISS") {
    const nextState = pod.receipts.some((receipt) => receipt.verificationState === "VERIFIED") ? "SETTLEMENT_PENDING" : "FORMING";
    adminOverridePodState(adminUserId, podId, nextState, notes);
  } else if (decision === "FRAUD_SUSPECTED") {
    createAdminReview(podId, notes, {
      lifecycleState: "ADMIN_REVIEW",
      userId: member?.userId ?? pod.hostUserId,
      riskType: "FAKE_RECEIPT_SUSPECTED",
      severity: "HIGH",
      notes,
    });
  } else {
    createAdminReview(podId, notes, {
      lifecycleState: "ADMIN_REVIEW",
      userId: member?.userId ?? pod.hostUserId,
      riskType: "STRIPE_PAYMENT_DISPUTE",
      severity: "MEDIUM",
      notes,
    });
  }

  const auditEvents = recordAudit([
    makeAuditEvent("RIDEPOD_DISPUTE_RESOLVED", {
      podId,
      userId: adminUserId,
      eventPayload: {
        decision,
        notes,
        podMemberId: member?.id ?? null,
        refundOk: refundResult?.ok ?? null,
      },
    }),
  ]);

  return {
    ok: true,
    pod,
    member,
    paymentIntent,
    auditEvents: [...(refundResult?.auditEvents ?? []), ...auditEvents],
    refundResult,
  };
}
