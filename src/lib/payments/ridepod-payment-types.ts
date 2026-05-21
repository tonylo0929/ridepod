export const RIDEPOD_PAYMENT_PURPOSES = ["TAXI_PARTNER_QUOTE_ACCEPTANCE"] as const;

export type RidePodPaymentPurpose = (typeof RIDEPOD_PAYMENT_PURPOSES)[number];

export const RIDEPOD_TEST_PAYMENT_STATUSES = [
  "MOCK_ONLY",
  "TEST_PAYMENT_INTENT_CREATED",
  "TEST_PAYMENT_CONFIRMED",
  "TEST_REQUIRES_PAYMENT_METHOD",
  "TEST_REQUIRES_CAPTURE",
  "TEST_CAPTURED",
  "TEST_SUCCEEDED",
  "TEST_CANCELED",
  "TEST_REFUND_SIMULATED",
  "TEST_CAPTURE_FAILED",
  "TEST_CANCEL_FAILED",
  "TEST_FAILED",
  "HELD_FOR_REVIEW",
  "CLEARED_FOR_PAYOUT",
] as const;

export type RidePodTestPaymentStatus = (typeof RIDEPOD_TEST_PAYMENT_STATUSES)[number];

export type RidePodCreateTestPaymentIntentInput = {
  rideInstanceId: string;
  quoteRequestId?: string | null;
  amountCents: number;
  currency?: string;
  purpose: RidePodPaymentPurpose;
  userId?: string | null;
  captureMode?: "manual" | "automatic";
};

export type RidePodCreateTestPaymentIntentResponse =
  | {
      ok: true;
      paymentIntentId: string;
      clientSecret: string | null;
      amountCents: number;
      currency: "hkd";
      status: string;
      captureMethod: "manual" | "automatic";
      livemode: false;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export type RidePodTestPaymentIntentAdminActionInput = {
  paymentIntentId: string;
  rideInstanceId?: string | null;
  reason?: string | null;
};

export type RidePodTestPaymentIntentAdminActionResponse =
  | {
      ok: true;
      paymentIntentId: string;
      amountCents: number;
      currency: string;
      status: string;
      livemode: false;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };
