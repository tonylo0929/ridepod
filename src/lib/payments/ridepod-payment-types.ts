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

export const RIDEPOD_PAYMENT_EVENT_TYPES = [
  "TEST_PAYMENT_INTENT_CREATED",
  "TEST_PAYMENT_CONFIRMED",
  "TEST_REQUIRES_CAPTURE",
  "TEST_CAPTURED",
  "TEST_CANCELED",
  "TEST_REFUND_SIMULATED",
  "PAYMENT_HELD_FOR_REVIEW",
  "PAYOUT_MARKED_READY_DEMO",
  "PAYOUT_DENIED_DEMO",
  "PAYMENT_ACTION_FAILED",
  "PAYMENT_ACTION_SKIPPED",
  "MOCK_PAYMENT_ACCEPTED",
] as const;

export type RidePodPaymentEventType = (typeof RIDEPOD_PAYMENT_EVENT_TYPES)[number];

export type RidePodPaymentEvent = {
  id: string;
  rideInstanceId: string | null;
  podId: string | null;
  userId: string | null;
  actorRole: string | null;
  eventType: RidePodPaymentEventType;
  paymentProvider: string;
  stripePaymentIntentId: string | null;
  amountCents: number | null;
  currency: string;
  previousStatus: string | null;
  newStatus: string | null;
  eventPayload: Record<string, unknown>;
  createdAt: string;
};

export type RidePodRecordPaymentEventInput = {
  rideInstanceId?: string | null;
  podId?: string | null;
  userId?: string | null;
  actorRole?: string | null;
  eventType: RidePodPaymentEventType;
  paymentProvider?: string;
  stripePaymentIntentId?: string | null;
  amountCents?: number | null;
  currency?: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  eventPayload?: Record<string, unknown> | null;
};

export type RidePodRecordPaymentEventResult =
  | {
      success: true;
      event: RidePodPaymentEvent;
      warning?: string;
    }
  | {
      success: false;
      event: null;
      warning: string;
    };

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
