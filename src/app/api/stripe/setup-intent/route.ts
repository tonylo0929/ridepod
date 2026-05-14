import { getConfiguredPaymentProviderName } from "@/lib/stripe-config";
import { createSetupIntent } from "@/lib/stripe-setup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const userId =
    typeof body === "object" && body !== null && "userId" in body && typeof body.userId === "string"
      ? body.userId
      : null;

  if (!userId) {
    return Response.json({ ok: false, error: "USER_ID_REQUIRED" }, { status: 400 });
  }

  if (getConfiguredPaymentProviderName() !== "STRIPE_TEST") {
    return Response.json({ ok: false, error: "PAYMENT_PROVIDER_MOCK" }, { status: 400 });
  }

  const result = await createSetupIntent(userId);
  if (!result.ok) {
    const status = result.error === "USER_NOT_FOUND" ? 404 : 400;
    return Response.json(result, { status });
  }

  return Response.json(result);
}
