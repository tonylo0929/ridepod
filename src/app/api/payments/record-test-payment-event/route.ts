import { recordPaymentEvent } from "@/lib/payments/payment-events";
import type { RidePodPaymentEventType } from "@/lib/payments/ridepod-payment-types";

export const runtime = "nodejs";

function getString(body: Record<string, unknown>, key: string) {
  return typeof body[key] === "string" ? body[key] : null;
}

function getNumber(body: Record<string, unknown>, key: string) {
  return typeof body[key] === "number" ? body[key] : null;
}

function getRecord(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, event: null, warning: "Payment event logging skipped: invalid request." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { success: false, event: null, warning: "Payment event logging skipped: invalid request." },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;
  const result = await recordPaymentEvent({
    rideInstanceId: getString(payload, "rideInstanceId"),
    podId: getString(payload, "podId"),
    userId: getString(payload, "userId"),
    actorRole: getString(payload, "actorRole"),
    eventType: getString(payload, "eventType") as RidePodPaymentEventType,
    paymentProvider: getString(payload, "paymentProvider") ?? "STRIPE_TEST",
    stripePaymentIntentId: getString(payload, "stripePaymentIntentId"),
    amountCents: getNumber(payload, "amountCents"),
    currency: getString(payload, "currency") ?? "HKD",
    previousStatus: getString(payload, "previousStatus"),
    newStatus: getString(payload, "newStatus"),
    eventPayload: getRecord(payload, "eventPayload"),
  });

  return Response.json(result, { status: result.success ? 200 : 400 });
}
