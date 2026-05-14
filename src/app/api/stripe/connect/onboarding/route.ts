import { getConfiguredPaymentProviderName } from "@/lib/stripe-config";
import { createHostOnboardingLink } from "@/lib/stripe-connect";

export const runtime = "nodejs";

function getString(body: unknown, key: string) {
  return typeof body === "object" && body !== null && key in body && typeof body[key as keyof typeof body] === "string"
    ? (body[key as keyof typeof body] as string)
    : null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const userId = getString(body, "userId");
  if (!userId) {
    return Response.json({ ok: false, error: "USER_ID_REQUIRED" }, { status: 400 });
  }

  if (getConfiguredPaymentProviderName() !== "STRIPE_TEST") {
    return Response.json({ ok: false, error: "PAYMENT_PROVIDER_MOCK" }, { status: 400 });
  }

  const result = await createHostOnboardingLink(userId, {
    returnUrl: getString(body, "returnUrl"),
    refreshUrl: getString(body, "refreshUrl"),
  });

  if (!result.ok) {
    const status = result.error === "USER_NOT_FOUND" ? 404 : 400;
    return Response.json(result, { status });
  }

  return Response.json(result);
}
