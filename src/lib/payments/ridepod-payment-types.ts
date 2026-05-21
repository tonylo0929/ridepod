export const RIDEPOD_PAYMENT_PURPOSES = ["TAXI_PARTNER_QUOTE_ACCEPTANCE"] as const;

export type RidePodPaymentPurpose = (typeof RIDEPOD_PAYMENT_PURPOSES)[number];

export const RIDEPOD_TEST_PAYMENT_STATUSES = [
  "MOCK_ONLY",
  "TEST_PAYMENT_INTENT_CREATED",
  "TEST_REQUIRES_PAYMENT_METHOD",
  "TEST_REQUIRES_CAPTURE",
  "TEST_SUCCEEDED",
  "TEST_CANCELED",
  "TEST_FAILED",
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
