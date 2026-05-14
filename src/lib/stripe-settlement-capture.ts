import Stripe from "stripe";
import type { RidePodPaymentIntentStatus } from "./money-safety";
import type { PaymentFinalizationInput, PaymentFinalizationResult } from "./payment-provider";
import { upsertLocalPaymentIntent } from "./payment-provider";
import { getStripeTestConfig } from "./stripe-config";

type EnvLike = Partial<Record<string, string | undefined>>;

type StripePaymentIntentLike = {
  id: string;
  status:
    | "requires_capture"
    | "succeeded"
    | "canceled"
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing";
  amount_capturable?: number;
  amount_received?: number;
  cancellation_reason?: string | null;
  last_payment_error?: {
    code?: string;
    message?: string;
  } | null;
};

export type StripeSettlementCaptureClient = {
  paymentIntents: {
    capture(
      id: string,
      input: { amount_to_capture: number },
      options?: { idempotencyKey?: string },
    ): Promise<StripePaymentIntentLike>;
    cancel(
      id: string,
      input?: { cancellation_reason?: "abandoned" | "requested_by_customer" },
      options?: { idempotencyKey?: string },
    ): Promise<StripePaymentIntentLike>;
  };
};

type StripeFinalizationOptions = {
  env?: EnvLike;
  stripe?: StripeSettlementCaptureClient;
  idempotencyKey?: string | null;
};

let stripeClient: StripeSettlementCaptureClient | null = null;

function getStripeClient(secretKey: string): StripeSettlementCaptureClient {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey) as unknown as StripeSettlementCaptureClient;
  }

  return stripeClient;
}

function mapCapturedStatus(status: StripePaymentIntentLike["status"]): RidePodPaymentIntentStatus {
  if (status === "succeeded") return "SUCCEEDED";
  if (status === "canceled") return "CANCELED";
  if (status === "processing") return "PROCESSING";
  if (status === "requires_payment_method") return "REQUIRES_PAYMENT_METHOD";
  if (status === "requires_action" || status === "requires_confirmation") return "REQUIRES_ACTION";
  if (status === "requires_capture") return "AUTHORIZED";
  return "FAILED";
}

function failed(error: string, paymentIntent: PaymentFinalizationResult["paymentIntent"] = null): PaymentFinalizationResult {
  return {
    ok: false,
    provider: "STRIPE",
    paymentIntent,
    error,
  };
}

export async function captureStripeAuthorizedPayment(
  input: PaymentFinalizationInput,
  options: StripeFinalizationOptions = {},
): Promise<PaymentFinalizationResult> {
  const config = getStripeTestConfig(options.env);
  if (!config.ok) return failed(config.error);
  if (!input.externalPaymentIntentId) return failed("STRIPE_PAYMENT_INTENT_ID_REQUIRED");

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const idempotencyKey = options.idempotencyKey ?? `capture-${input.podMemberId}-${input.finalChargeCents}`;

  try {
    const captured = await stripe.paymentIntents.capture(
      input.externalPaymentIntentId,
      { amount_to_capture: input.finalChargeCents },
      { idempotencyKey },
    );
    const status = mapCapturedStatus(captured.status);
    const localPaymentIntent = upsertLocalPaymentIntent(
      {
        podId: input.podId,
        podMemberId: input.podMemberId,
        userId: input.userId,
        amountAuthorizedCents: input.amountAuthorizedCents,
        maxChargeCents: input.amountAuthorizedCents,
        platformFeeCents: 0,
        approvedMaxTotalFareCents: input.amountAuthorizedCents,
        currency: input.currency,
        externalPaymentIntentId: captured.id,
        idempotencyKey,
      },
      "STRIPE",
      status,
      {
        captureMethod: "MANUAL",
        amountCapturedCents: captured.status === "succeeded" ? input.finalChargeCents : 0,
        failureCode: captured.last_payment_error?.code ?? null,
        failureMessage: captured.last_payment_error?.message ?? null,
      },
    );

    if (captured.status !== "succeeded") {
      return failed("STRIPE_CAPTURE_FAILED", localPaymentIntent);
    }

    return {
      ok: true,
      provider: "STRIPE",
      paymentIntent: localPaymentIntent,
    };
  } catch (error) {
    const stripeError = error as { code?: string; message?: string };
    const localPaymentIntent = upsertLocalPaymentIntent(
      {
        podId: input.podId,
        podMemberId: input.podMemberId,
        userId: input.userId,
        amountAuthorizedCents: input.amountAuthorizedCents,
        maxChargeCents: input.amountAuthorizedCents,
        platformFeeCents: 0,
        approvedMaxTotalFareCents: input.amountAuthorizedCents,
        currency: input.currency,
        externalPaymentIntentId: input.externalPaymentIntentId,
        idempotencyKey,
      },
      "STRIPE",
      "FAILED",
      {
        captureMethod: "MANUAL",
        failureCode: stripeError.code ?? null,
        failureMessage: stripeError.message ?? "Stripe capture failed.",
      },
    );

    return failed(stripeError.code ?? "STRIPE_CAPTURE_FAILED", localPaymentIntent);
  }
}

export async function cancelStripeAuthorization(
  input: PaymentFinalizationInput,
  options: StripeFinalizationOptions = {},
): Promise<PaymentFinalizationResult> {
  const config = getStripeTestConfig(options.env);
  if (!config.ok) return failed(config.error);
  if (!input.externalPaymentIntentId) return failed("STRIPE_PAYMENT_INTENT_ID_REQUIRED");

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const idempotencyKey = options.idempotencyKey ?? `cancel-${input.podMemberId}`;

  try {
    const canceled = await stripe.paymentIntents.cancel(
      input.externalPaymentIntentId,
      { cancellation_reason: "requested_by_customer" },
      { idempotencyKey },
    );
    const localPaymentIntent = upsertLocalPaymentIntent(
      {
        podId: input.podId,
        podMemberId: input.podMemberId,
        userId: input.userId,
        amountAuthorizedCents: input.amountAuthorizedCents,
        maxChargeCents: input.amountAuthorizedCents,
        platformFeeCents: 0,
        approvedMaxTotalFareCents: input.amountAuthorizedCents,
        currency: input.currency,
        externalPaymentIntentId: canceled.id,
        idempotencyKey,
      },
      "STRIPE",
      mapCapturedStatus(canceled.status),
      {
        captureMethod: "MANUAL",
        amountCapturedCents: 0,
        amountRefundedCents: 0,
        failureCode: canceled.last_payment_error?.code ?? null,
        failureMessage: canceled.last_payment_error?.message ?? null,
      },
    );

    if (canceled.status !== "canceled") {
      return failed("STRIPE_CANCEL_AUTHORIZATION_FAILED", localPaymentIntent);
    }

    return {
      ok: true,
      provider: "STRIPE",
      paymentIntent: localPaymentIntent,
    };
  } catch (error) {
    const stripeError = error as { code?: string; message?: string };
    const localPaymentIntent = upsertLocalPaymentIntent(
      {
        podId: input.podId,
        podMemberId: input.podMemberId,
        userId: input.userId,
        amountAuthorizedCents: input.amountAuthorizedCents,
        maxChargeCents: input.amountAuthorizedCents,
        platformFeeCents: 0,
        approvedMaxTotalFareCents: input.amountAuthorizedCents,
        currency: input.currency,
        externalPaymentIntentId: input.externalPaymentIntentId,
        idempotencyKey,
      },
      "STRIPE",
      "FAILED",
      {
        captureMethod: "MANUAL",
        failureCode: stripeError.code ?? null,
        failureMessage: stripeError.message ?? "Stripe authorization cancel failed.",
      },
    );

    return failed(stripeError.code ?? "STRIPE_CANCEL_AUTHORIZATION_FAILED", localPaymentIntent);
  }
}
