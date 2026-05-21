import type {
  RidePodRecordPaymentEventInput,
  RidePodRecordPaymentEventResult,
} from "@/lib/payments/ridepod-payment-types";

export async function recordRidePodTestPaymentEvent(
  input: RidePodRecordPaymentEventInput,
): Promise<RidePodRecordPaymentEventResult> {
  try {
    const response = await fetch("/api/payments/record-test-payment-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    return (await response.json()) as RidePodRecordPaymentEventResult;
  } catch {
    return {
      success: false,
      event: null,
      warning: "Payment event logging skipped: network unavailable.",
    };
  }
}
