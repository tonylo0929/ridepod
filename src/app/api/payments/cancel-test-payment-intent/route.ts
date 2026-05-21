import { cancelRidePodStripeTestPaymentIntent } from "@/lib/payments/stripe-test-admin-actions";

export const runtime = "nodejs";

function getString(body: Record<string, unknown>, key: string) {
  return typeof body[key] === "string" ? body[key] : null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "INVALID_JSON", message: "Couldn't cancel test authorization." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { ok: false, error: "INVALID_BODY", message: "Couldn't cancel test authorization." },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;
  const result = await cancelRidePodStripeTestPaymentIntent({
    paymentIntentId: getString(payload, "paymentIntentId") ?? "",
    rideInstanceId: getString(payload, "rideInstanceId"),
    reason: getString(payload, "reason"),
  });

  return Response.json(result.response, { status: result.status });
}
