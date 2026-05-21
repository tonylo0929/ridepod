import "server-only";

import { getRidePodStripeTestClient } from "@/lib/payments/stripe-server";
import { validateRidePodStripeTestEnv } from "@/lib/payments/stripe-env";
import type {
  RidePodTestPaymentIntentAdminActionInput,
  RidePodTestPaymentIntentAdminActionResponse,
} from "@/lib/payments/ridepod-payment-types";
import { recordPaymentEvent } from "@/lib/payments/payment-events";

function failed(error: string, message: string, status = 400) {
  return {
    response: {
      ok: false,
      error,
      message,
    } satisfies RidePodTestPaymentIntentAdminActionResponse,
    status,
  };
}

function validateInput(input: RidePodTestPaymentIntentAdminActionInput) {
  const env = validateRidePodStripeTestEnv();
  if (!env.ok) {
    return failed(env.error, env.message, env.error === "STRIPE_TEST_MODE_DISABLED" ? 403 : 400);
  }

  if (!input.paymentIntentId?.trim()) {
    return failed("PAYMENT_INTENT_ID_REQUIRED", "Couldn't update test payment.");
  }

  if (!input.paymentIntentId.startsWith("pi_")) {
    return failed("PAYMENT_INTENT_ID_INVALID", "Couldn't update test payment.");
  }

  return null;
}

function stripePaymentIntentResponse(paymentIntent: {
  id: string;
  amount: number;
  currency: string;
  status: string;
  livemode: boolean;
}): { response: RidePodTestPaymentIntentAdminActionResponse; status: number } {
  if (paymentIntent.livemode) {
    return failed("STRIPE_LIVE_PAYMENT_INTENT_BLOCKED", "Stripe test keys are not configured.", 500);
  }

  return {
    status: 200,
    response: {
      ok: true,
      paymentIntentId: paymentIntent.id,
      amountCents: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      livemode: false,
    },
  };
}

export async function captureRidePodStripeTestPaymentIntent(
  input: RidePodTestPaymentIntentAdminActionInput,
): Promise<{ response: RidePodTestPaymentIntentAdminActionResponse; status: number }> {
  const validation = validateInput(input);
  if (validation) return validation;

  try {
    const stripe = getRidePodStripeTestClient();
    const current = await stripe.paymentIntents.retrieve(input.paymentIntentId);

    if (current.livemode) {
      return failed("STRIPE_LIVE_PAYMENT_INTENT_BLOCKED", "Stripe test keys are not configured.", 500);
    }

    if (current.status !== "requires_capture") {
      return failed("TEST_PAYMENT_NOT_CAPTURABLE", "Couldn't capture test payment.", 409);
    }

    const captured = await stripe.paymentIntents.capture(input.paymentIntentId);
    void recordPaymentEvent({
      rideInstanceId: input.rideInstanceId,
      actorRole: "admin",
      eventType: "TEST_CAPTURED",
      stripePaymentIntentId: captured.id,
      amountCents: captured.amount,
      currency: captured.currency.toUpperCase(),
      previousStatus: current.status,
      newStatus: captured.status,
      eventPayload: {
        stripeStatus: captured.status,
        adminReason: input.reason ?? null,
        livemode: captured.livemode,
        demoMode: true,
      },
    });
    return stripePaymentIntentResponse(captured);
  } catch (error) {
    const stripeError = error as { message?: string };
    console.error("RidePod Stripe test capture failed:", stripeError.message ?? "Unknown Stripe error");
    void recordPaymentEvent({
      rideInstanceId: input.rideInstanceId,
      actorRole: "admin",
      eventType: "PAYMENT_ACTION_FAILED",
      stripePaymentIntentId: input.paymentIntentId,
      eventPayload: {
        failureMessage: stripeError.message ?? "Unknown Stripe error",
        adminReason: input.reason ?? null,
        demoMode: true,
      },
    });
    return failed("STRIPE_TEST_CAPTURE_FAILED", "Couldn't capture test payment.", 500);
  }
}

export async function cancelRidePodStripeTestPaymentIntent(
  input: RidePodTestPaymentIntentAdminActionInput,
): Promise<{ response: RidePodTestPaymentIntentAdminActionResponse; status: number }> {
  const validation = validateInput(input);
  if (validation) return validation;

  try {
    const stripe = getRidePodStripeTestClient();
    const current = await stripe.paymentIntents.retrieve(input.paymentIntentId);

    if (current.livemode) {
      return failed("STRIPE_LIVE_PAYMENT_INTENT_BLOCKED", "Stripe test keys are not configured.", 500);
    }

    if (["succeeded", "canceled"].includes(current.status)) {
      return failed("TEST_PAYMENT_NOT_CANCELABLE", "Couldn't cancel test authorization.", 409);
    }

    const canceled = await stripe.paymentIntents.cancel(input.paymentIntentId);
    void recordPaymentEvent({
      rideInstanceId: input.rideInstanceId,
      actorRole: "admin",
      eventType: "TEST_CANCELED",
      stripePaymentIntentId: canceled.id,
      amountCents: canceled.amount,
      currency: canceled.currency.toUpperCase(),
      previousStatus: current.status,
      newStatus: canceled.status,
      eventPayload: {
        stripeStatus: canceled.status,
        adminReason: input.reason ?? null,
        livemode: canceled.livemode,
        demoMode: true,
      },
    });
    return stripePaymentIntentResponse(canceled);
  } catch (error) {
    const stripeError = error as { message?: string };
    console.error("RidePod Stripe test cancel failed:", stripeError.message ?? "Unknown Stripe error");
    void recordPaymentEvent({
      rideInstanceId: input.rideInstanceId,
      actorRole: "admin",
      eventType: "PAYMENT_ACTION_FAILED",
      stripePaymentIntentId: input.paymentIntentId,
      eventPayload: {
        failureMessage: stripeError.message ?? "Unknown Stripe error",
        adminReason: input.reason ?? null,
        demoMode: true,
      },
    });
    return failed("STRIPE_TEST_CANCEL_FAILED", "Couldn't cancel test authorization.", 500);
  }
}
