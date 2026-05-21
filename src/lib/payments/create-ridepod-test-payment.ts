import type {
  RidePodCreateTestPaymentIntentInput,
  RidePodCreateTestPaymentIntentResponse,
} from "@/lib/payments/ridepod-payment-types";

export async function createRidePodTestPaymentIntent(
  input: RidePodCreateTestPaymentIntentInput,
): Promise<RidePodCreateTestPaymentIntentResponse> {
  try {
    const response = await fetch("/api/payments/create-test-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as RidePodCreateTestPaymentIntentResponse;
    if (!response.ok && payload.ok === false) return payload;

    return payload;
  } catch {
    return {
      ok: false,
      error: "TEST_PAYMENT_INTENT_REQUEST_FAILED",
      message: "Couldn’t create test payment. Try again later.",
    };
  }
}

