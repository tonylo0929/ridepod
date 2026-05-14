import * as StripeModule from "stripe";

import { getConfiguredPaymentProviderName, getStripeWebhookConfig } from "@/lib/stripe-config";
import {
  handleStripeWebhookEvent,
  recordInvalidStripeWebhookSignature,
  type StripeWebhookEventLike,
} from "@/lib/stripe-webhooks";

import type StripeTypes from "stripe";

export const runtime = "nodejs";

type StripeConstructor = new (apiKey: string) => StripeTypes;

function getStripeClient(secretKey: string) {
  const StripeConstructor = ((StripeModule as { default?: StripeConstructor }).default ?? StripeModule) as StripeConstructor;
  return new StripeConstructor(secretKey);
}

export async function POST(request: Request) {
  if (getConfiguredPaymentProviderName() !== "STRIPE_TEST") {
    return Response.json({ ok: false, error: "PAYMENT_PROVIDER_MOCK" }, { status: 400 });
  }

  const config = getStripeWebhookConfig();
  if (!config.ok) {
    return Response.json({ ok: false, error: config.error }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    recordInvalidStripeWebhookSignature("STRIPE_SIGNATURE_REQUIRED");
    return Response.json({ ok: false, error: "STRIPE_SIGNATURE_REQUIRED" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: StripeTypes.Event;

  try {
    event = getStripeClient(config.config.secretKey).webhooks.constructEvent(
      rawBody,
      signature,
      config.config.webhookSecret ?? "",
    );
  } catch {
    recordInvalidStripeWebhookSignature();
    return Response.json({ ok: false, error: "INVALID_STRIPE_SIGNATURE" }, { status: 400 });
  }

  const result = handleStripeWebhookEvent(event as unknown as StripeWebhookEventLike);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({
    ok: true,
    received: true,
    duplicate: result.duplicate,
    eventId: event.id,
    eventType: event.type,
  });
}
