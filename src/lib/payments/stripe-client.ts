"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripeTestPublishableKey() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return {
      ok: false,
      error: "STRIPE_TEST_PUBLISHABLE_KEY_REQUIRED",
      message: "Stripe test key is not configured.",
    } as const;
  }

  if (!publishableKey.startsWith("pk_test_")) {
    return {
      ok: false,
      error: "STRIPE_TEST_PUBLISHABLE_KEY_REQUIRED",
      message: "Stripe test key is not configured.",
    } as const;
  }

  return {
    ok: true,
    publishableKey,
  } as const;
}

export function getRidePodStripeTestPromise() {
  const config = getStripeTestPublishableKey();
  if (!config.ok) return null;

  stripePromise ??= loadStripe(config.publishableKey);
  return stripePromise;
}

