import Stripe from "stripe";
import type { RidePodPaymentIntentStatus } from "./money-safety";
import type { SeatAuthorizationInput, SeatAuthorizationResult } from "./payment-provider";
import { upsertLocalPaymentIntent } from "./payment-provider";
import { getStripeTestConfig } from "./stripe-config";

type EnvLike = Partial<Record<string, string | undefined>>;

type StripePaymentIntentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "processing"
  | "requires_capture"
  | "canceled"
  | "succeeded";

type StripePaymentIntentLike = {
  id: string;
  status: StripePaymentIntentStatus;
  amount: number;
  currency: string;
  last_payment_error?: {
    code?: string;
    message?: string;
  } | null;
};

export type StripeSeatAuthorizationClient = {
  paymentIntents: {
    create(
      input: {
        amount: number;
        currency: string;
        customer: string;
        payment_method: string;
        capture_method: "manual";
        confirm: true;
        metadata: Record<string, string>;
      },
      options?: { idempotencyKey?: string },
    ): Promise<StripePaymentIntentLike>;
  };
};

type StripeSeatAuthorizationOptions = {
  env?: EnvLike;
  stripe?: StripeSeatAuthorizationClient;
};

let stripeClient: StripeSeatAuthorizationClient | null = null;

function getStripeClient(secretKey: string): StripeSeatAuthorizationClient {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function conservativeAuthorizationExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 6);
  return expiresAt.toISOString();
}

function mapStripeStatus(status: StripePaymentIntentStatus): RidePodPaymentIntentStatus {
  if (status === "requires_capture") return "AUTHORIZED";
  if (status === "requires_payment_method") return "REQUIRES_PAYMENT_METHOD";
  if (status === "requires_action" || status === "requires_confirmation") return "REQUIRES_ACTION";
  if (status === "processing") return "PROCESSING";
  if (status === "succeeded") return "SUCCEEDED";
  if (status === "canceled") return "CANCELED";
  return "FAILED";
}

function failed(input: SeatAuthorizationInput, error: string): SeatAuthorizationResult {
  return {
    ok: false,
    provider: "STRIPE",
    paymentIntent: null,
    error,
  };
}

export async function createStripeSeatAuthorization(
  input: SeatAuthorizationInput,
  options: StripeSeatAuthorizationOptions = {},
): Promise<SeatAuthorizationResult> {
  const config = getStripeTestConfig(options.env);
  if (!config.ok) return failed(input, config.error);
  if (!input.customerId) return failed(input, "STRIPE_CUSTOMER_REQUIRED");
  if (!input.paymentMethodId) return failed(input, "STRIPE_PAYMENT_METHOD_REQUIRED");

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const idempotencyKey = input.idempotencyKey ?? `seat-auth-${input.podId}-${input.podMemberId}`;

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: input.maxChargeCents,
        currency: input.currency.toLowerCase(),
        customer: input.customerId,
        payment_method: input.paymentMethodId,
        capture_method: "manual",
        confirm: true,
        metadata: {
          podId: input.podId,
          podMemberId: input.podMemberId,
          userId: input.userId,
          chargeType: "seat_authorization",
          approvedMaxTotalFareCents: String(input.approvedMaxTotalFareCents),
          maxChargeCents: String(input.maxChargeCents),
          platformFeeCents: String(input.platformFeeCents),
          environment: "test",
        },
      },
      { idempotencyKey },
    );
    const status = mapStripeStatus(paymentIntent.status);
    const localPaymentIntent = upsertLocalPaymentIntent(
      {
        ...input,
        amountAuthorizedCents: input.maxChargeCents,
        externalPaymentIntentId: paymentIntent.id,
        authorizationExpiresAt: input.authorizationExpiresAt ?? conservativeAuthorizationExpiry(),
        idempotencyKey,
      },
      "STRIPE",
      status,
      {
        captureMethod: "MANUAL",
        failureCode: paymentIntent.last_payment_error?.code ?? null,
        failureMessage: paymentIntent.last_payment_error?.message ?? null,
      },
    );

    if (paymentIntent.status === "requires_capture") {
      return {
        ok: true,
        provider: "STRIPE",
        paymentIntent: localPaymentIntent,
      };
    }

    return {
      ok: false,
      provider: "STRIPE",
      paymentIntent: localPaymentIntent,
      error:
        paymentIntent.status === "requires_action"
          ? "STRIPE_PAYMENT_REQUIRES_ACTION"
          : paymentIntent.status === "processing"
            ? "STRIPE_PAYMENT_PROCESSING"
            : paymentIntent.status === "requires_payment_method"
              ? "STRIPE_PAYMENT_METHOD_REQUIRED"
              : paymentIntent.status === "succeeded"
                ? "STRIPE_PAYMENT_INTENT_UNEXPECTEDLY_SUCCEEDED"
                : paymentIntent.status === "canceled"
                  ? "STRIPE_PAYMENT_INTENT_CANCELED"
                  : "STRIPE_AUTHORIZATION_FAILED",
    };
  } catch (error) {
    const stripeError = error as { code?: string; message?: string };
    const localPaymentIntent = upsertLocalPaymentIntent(
      {
        ...input,
        amountAuthorizedCents: input.maxChargeCents,
        externalPaymentIntentId: null,
        authorizationExpiresAt: null,
        idempotencyKey,
      },
      "STRIPE",
      "FAILED",
      {
        captureMethod: "MANUAL",
        failureCode: stripeError.code ?? null,
        failureMessage: stripeError.message ?? "Stripe authorization failed.",
      },
    );

    return {
      ok: false,
      provider: "STRIPE",
      paymentIntent: localPaymentIntent,
      error: stripeError.code ?? "STRIPE_AUTHORIZATION_FAILED",
    };
  }
}
