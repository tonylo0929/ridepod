import "server-only";

import Stripe from "stripe";
import { validateRidePodStripeTestEnv } from "@/lib/payments/stripe-env";

let stripeClient: Stripe | null = null;

export function getRidePodStripeTestClient(env: Partial<Record<string, string | undefined>> = process.env) {
  const config = validateRidePodStripeTestEnv(env);
  if (!config.ok) {
    throw new Error(config.error);
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.secretKey);
  }

  return stripeClient;
}

