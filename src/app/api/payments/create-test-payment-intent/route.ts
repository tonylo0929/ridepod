import { createRidePodStripeTestPaymentIntent } from "@/lib/payments/stripe-test-payment-intent";
import type {
  RidePodCreateTestPaymentIntentInput,
  RidePodPaymentPurpose,
} from "@/lib/payments/ridepod-payment-types";

export const runtime = "nodejs";

function getString(body: Record<string, unknown>, key: string) {
  return typeof body[key] === "string" ? body[key] : null;
}

function getNumber(body: Record<string, unknown>, key: string) {
  return typeof body[key] === "number" ? body[key] : null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "INVALID_JSON", message: "Couldn’t create test payment. Try again later." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { ok: false, error: "INVALID_BODY", message: "Couldn’t create test payment. Try again later." },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;
  const input: RidePodCreateTestPaymentIntentInput = {
    rideInstanceId: getString(payload, "rideInstanceId") ?? "",
    quoteRequestId: getString(payload, "quoteRequestId"),
    amountCents: getNumber(payload, "amountCents") ?? 0,
    currency: getString(payload, "currency") ?? "hkd",
    purpose: getString(payload, "purpose") as RidePodPaymentPurpose,
    userId: getString(payload, "userId"),
    captureMode: getString(payload, "captureMode") === "automatic" ? "automatic" : "manual",
  };

  const result = await createRidePodStripeTestPaymentIntent(input);
  return Response.json(result.response, { status: result.status });
}
