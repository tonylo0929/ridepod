import "server-only";

import { getRidePodStripeTestClient } from "@/lib/payments/stripe-server";
import { validateRidePodStripeTestEnv } from "@/lib/payments/stripe-env";
import {
  RIDEPOD_PAYMENT_PURPOSES,
  type RidePodCreateTestPaymentIntentInput,
  type RidePodCreateTestPaymentIntentResponse,
} from "@/lib/payments/ridepod-payment-types";

function failed(error: string, message: string, status = 400) {
  return {
    response: {
      ok: false,
      error,
      message,
    } satisfies RidePodCreateTestPaymentIntentResponse,
    status,
  };
}

export async function createRidePodStripeTestPaymentIntent(
  input: RidePodCreateTestPaymentIntentInput,
): Promise<{ response: RidePodCreateTestPaymentIntentResponse; status: number }> {
  const env = validateRidePodStripeTestEnv();
  if (!env.ok) return failed(env.error, env.message, env.error === "STRIPE_TEST_MODE_DISABLED" ? 403 : 400);

  if (!input.rideInstanceId?.trim()) {
    return failed("RIDE_INSTANCE_ID_REQUIRED", "Couldn’t create test payment. Try again later.");
  }

  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    return failed("AMOUNT_CENTS_INVALID", "Couldn’t create test payment. Try again later.");
  }

  const currency = input.currency ?? "hkd";
  if (currency !== "hkd") {
    return failed("CURRENCY_UNSUPPORTED", "Couldn’t create test payment. Try again later.");
  }

  if (!RIDEPOD_PAYMENT_PURPOSES.includes(input.purpose)) {
    return failed("PAYMENT_PURPOSE_UNSUPPORTED", "Couldn’t create test payment. Try again later.");
  }

  const captureMethod = input.captureMode ?? "manual";
  if (captureMethod !== "manual" && captureMethod !== "automatic") {
    return failed("CAPTURE_MODE_UNSUPPORTED", "Couldn’t create test payment. Try again later.");
  }

  try {
    const stripe = getRidePodStripeTestClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: input.amountCents,
      currency,
      capture_method: captureMethod,
      description: "RidePod test mode taxi partner quote acceptance",
      metadata: {
        rideInstanceId: input.rideInstanceId,
        quoteRequestId: input.quoteRequestId ?? "",
        userId: input.userId ?? "",
        purpose: input.purpose,
        rideOption: "TAXI_PARTNER_QUOTE",
        paymentPurpose: input.purpose,
        demoMode: "true",
        captureMode: captureMethod,
      },
    });

    if (paymentIntent.livemode) {
      return failed("STRIPE_LIVE_PAYMENT_INTENT_BLOCKED", "Stripe test keys are not configured.", 500);
    }

    return {
      status: 200,
      response: {
        ok: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amountCents: paymentIntent.amount,
        currency: "hkd",
        status: paymentIntent.status,
        captureMethod,
        livemode: false,
      },
    };
  } catch (error) {
    const stripeError = error as { message?: string };
    console.error("RidePod Stripe test PaymentIntent failed:", stripeError.message ?? "Unknown Stripe error");
    return failed("STRIPE_TEST_PAYMENT_INTENT_FAILED", "Couldn’t create test payment. Try again later.", 500);
  }
}

