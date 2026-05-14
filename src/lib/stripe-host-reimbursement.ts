import Stripe from "stripe";

import {
  makeAuditEvent,
  type AuditEvent,
  type HostReimbursement,
  type PaymentProvider,
  type ProtectedPod,
  type Settlement,
} from "./money-safety";
import {
  mockAuditEvents,
  mockHostReimbursements,
  mockSettlements,
  protectedPods,
  protectedUsers,
} from "./money-safety-mock";
import { getConfiguredPaymentProviderName, getStripeTestConfig } from "./stripe-config";

type EnvLike = Partial<Record<string, string | undefined>>;

type StripeTransferLike = {
  id: string;
};

export type StripeHostTransferClient = {
  transfers: {
    create(
      input: {
        amount: number;
        currency: string;
        destination: string;
        metadata: Record<string, string>;
        transfer_group?: string;
      },
      options?: {
        idempotencyKey?: string;
      },
    ): Promise<StripeTransferLike>;
  };
};

type ReimbursementOptions = {
  env?: EnvLike;
  stripe?: StripeHostTransferClient;
  forceStripe?: boolean;
};

export type HostReimbursementTransferResult =
  | {
      ok: true;
      provider: PaymentProvider;
      pod: ProtectedPod;
      settlement: Settlement;
      hostReimbursement: HostReimbursement;
      externalTransferId: string | null;
      auditEvents: AuditEvent[];
    }
  | {
      ok: false;
      provider: PaymentProvider;
      pod: ProtectedPod | null;
      settlement: Settlement | null;
      hostReimbursement: HostReimbursement | null;
      error: string;
      auditEvents: AuditEvent[];
    };

let stripeClient: StripeHostTransferClient | null = null;

function getStripeClient(secretKey: string): StripeHostTransferClient {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey) as unknown as StripeHostTransferClient;
  }

  return stripeClient;
}

function recordAudit(events: AuditEvent[]) {
  mockAuditEvents.push(...events);
  return events;
}

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

function getHostUser(pod: ProtectedPod) {
  return protectedUsers.find((user) => user.id === (pod.replacementHostUserId ?? pod.hostUserId)) ?? null;
}

function getHostReimbursement(settlement: Settlement) {
  return mockHostReimbursements.find((reimbursement) => reimbursement.settlementId === settlement.id) ?? null;
}

function getProvider(options: ReimbursementOptions): PaymentProvider {
  return options.forceStripe || getConfiguredPaymentProviderName(options.env) === "STRIPE_TEST" ? "STRIPE" : "MOCK";
}

function failed(
  provider: PaymentProvider,
  error: string,
  pod: ProtectedPod | null = null,
  settlement: Settlement | null = null,
  hostReimbursement: HostReimbursement | null = null,
): HostReimbursementTransferResult {
  return { ok: false, provider, pod, settlement, hostReimbursement, error, auditEvents: [] };
}

function validateBaseReimbursement(
  provider: PaymentProvider,
  pod: ProtectedPod,
  settlement: Settlement | null,
  hostReimbursement: HostReimbursement | null,
) {
  if (!settlement) return failed(provider, "SETTLEMENT_REQUIRED", pod, null, null);
  if (settlement.settlementState !== "FINALIZED") {
    return failed(provider, "SETTLEMENT_NOT_FINALIZED", pod, settlement, hostReimbursement);
  }
  if (settlement.adminReviewRequired) {
    return failed(provider, "SETTLEMENT_ADMIN_REVIEW_REQUIRED", pod, settlement, hostReimbursement);
  }
  if (pod.adminReviewRequired || pod.lifecycleState === "ADMIN_REVIEW" || pod.lifecycleState === "DISPUTE_HOLD") {
    return failed(provider, "POD_ADMIN_REVIEW_HOLD", pod, settlement, hostReimbursement);
  }
  if (!getVerifiedReceipt(pod)) {
    return failed(provider, "VERIFIED_RECEIPT_REQUIRED", pod, settlement, hostReimbursement);
  }
  if (!hostReimbursement) {
    return failed(provider, "HOST_REIMBURSEMENT_REQUIRED", pod, settlement, null);
  }
  if (hostReimbursement.payoutState === "PAID" || hostReimbursement.payoutState === "SCHEDULED" || hostReimbursement.externalTransferId) {
    return failed(provider, "HOST_REIMBURSEMENT_ALREADY_TRANSFERRED", pod, settlement, hostReimbursement);
  }
  if (hostReimbursement.payoutState === "HELD_FOR_REVIEW") {
    return failed(provider, "HOST_REIMBURSEMENT_HELD_FOR_REVIEW", pod, settlement, hostReimbursement);
  }
  if (hostReimbursement.totalTransferCents <= 0 || settlement.hostReimbursementCents <= 0) {
    return failed(provider, "HOST_REIMBURSEMENT_AMOUNT_REQUIRED", pod, settlement, hostReimbursement);
  }
  if (hostReimbursement.totalTransferCents > settlement.hostReimbursementCents) {
    return failed(provider, "HOST_REIMBURSEMENT_EXCEEDS_SETTLEMENT", pod, settlement, hostReimbursement);
  }

  return null;
}

function applySuccessfulTransfer(
  provider: PaymentProvider,
  pod: ProtectedPod,
  settlement: Settlement,
  hostReimbursement: HostReimbursement,
  externalTransferId: string | null,
  payoutState: Extract<HostReimbursement["payoutState"], "SCHEDULED" | "PAID">,
) {
  const now = new Date().toISOString();
  hostReimbursement.payoutState = payoutState;
  hostReimbursement.externalTransferId = externalTransferId;
  hostReimbursement.scheduledAt = now;
  hostReimbursement.paidAt = payoutState === "PAID" ? now : null;
  hostReimbursement.updatedAt = now;
  const auditEvents = recordAudit([
    makeAuditEvent("HOST_REIMBURSEMENT_SCHEDULED", {
      podId: pod.id,
      userId: hostReimbursement.hostUserId,
      eventPayload: {
        settlementId: settlement.id,
        hostReimbursementId: hostReimbursement.id,
        externalTransferId,
        provider,
        payoutState,
        totalTransferCents: hostReimbursement.totalTransferCents,
      },
    }),
  ]);

  return {
    ok: true,
    provider,
    pod,
    settlement,
    hostReimbursement,
    externalTransferId,
    auditEvents,
  } satisfies HostReimbursementTransferResult;
}

export async function reimburseHostForSettledPod(
  podId: string,
  options: ReimbursementOptions = {},
): Promise<HostReimbursementTransferResult> {
  const provider = getProvider(options);
  const pod = protectedPods.find((candidate) => candidate.id === podId) ?? null;
  if (!pod) return failed(provider, "POD_NOT_FOUND");

  const settlement = getLatestSettlement(podId);
  const hostReimbursement = settlement ? getHostReimbursement(settlement) : null;
  const baseError = validateBaseReimbursement(provider, pod, settlement, hostReimbursement);
  if (baseError) return baseError;
  if (!settlement || !hostReimbursement) return failed(provider, "HOST_REIMBURSEMENT_REQUIRED", pod, settlement, hostReimbursement);

  if (provider === "MOCK") {
    return applySuccessfulTransfer(
      "MOCK",
      pod,
      settlement,
      hostReimbursement,
      `mock_transfer_${hostReimbursement.id}`,
      "SCHEDULED",
    );
  }

  const host = getHostUser(pod);
  if (!host) return failed("STRIPE", "HOST_NOT_FOUND", pod, settlement, hostReimbursement);
  if (!host.stripeConnectAccountId) {
    return failed("STRIPE", "STRIPE_CONNECT_ACCOUNT_REQUIRED", pod, settlement, hostReimbursement);
  }
  if (!host.payoutsEnabled) {
    return failed("STRIPE", "HOST_PAYOUTS_NOT_ENABLED", pod, settlement, hostReimbursement);
  }

  const config = getStripeTestConfig(options.env);
  if (!config.ok) return failed("STRIPE", config.error, pod, settlement, hostReimbursement);

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const receipt = getVerifiedReceipt(pod);
  const idempotencyKey = `ridepod-host-reimbursement-${hostReimbursement.id}`;

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: hostReimbursement.totalTransferCents,
        currency: pod.currency.toLowerCase(),
        destination: host.stripeConnectAccountId,
        metadata: {
          podId: pod.id,
          settlementId: settlement.id,
          hostUserId: host.id,
          hostReimbursementId: hostReimbursement.id,
          receiptId: receipt?.id ?? "",
          transferType: "host_reimbursement",
          environment: "test",
        },
        transfer_group: `ridepod_pod_${pod.id}`,
      },
      { idempotencyKey },
    );

    return applySuccessfulTransfer("STRIPE", pod, settlement, hostReimbursement, transfer.id, "PAID");
  } catch {
    const now = new Date().toISOString();
    hostReimbursement.payoutState = "FAILED";
    hostReimbursement.updatedAt = now;
    return failed("STRIPE", "STRIPE_TRANSFER_FAILED", pod, settlement, hostReimbursement);
  }
}
