export const TAXI_PARTNER_TAXI_TYPES = [
  "STANDARD",
  "ELECTRIC",
  "LUGGAGE_FRIENDLY",
  "LARGE",
  "COMFORT",
  "ACCESSIBLE",
] as const;

export type TaxiPartnerTaxiType = (typeof TAXI_PARTNER_TAXI_TYPES)[number];

export const TAXI_PARTNER_QUOTE_STATUSES = [
  "QUOTE_NOT_REQUESTED",
  "QUOTE_REQUESTED",
  "QUOTE_RECEIVED",
  "QUOTE_EXPIRED",
  "QUOTE_REJECTED",
  "QUOTE_ACCEPTED",
  "QUOTE_ABOVE_CAP",
  "ADMIN_REVIEW",
] as const;

export type TaxiPartnerQuoteStatus = (typeof TAXI_PARTNER_QUOTE_STATUSES)[number];

export const TAXI_PARTNER_GUEST_ACCEPTANCE_STATUSES = [
  "WAITING_FOR_GUESTS",
  "GUESTS_LOCKED",
  "ACCEPTING_QUOTE",
  "ALL_ACCEPTED",
  "SOME_REJECTED",
  "EXPIRED",
] as const;

export type TaxiPartnerGuestAcceptanceStatus =
  (typeof TAXI_PARTNER_GUEST_ACCEPTANCE_STATUSES)[number];

export const TAXI_PARTNER_QUOTE_ACCEPTANCE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
] as const;

export type TaxiPartnerQuoteAcceptanceStatus =
  (typeof TAXI_PARTNER_QUOTE_ACCEPTANCE_STATUSES)[number];

export const TAXI_PARTNER_MOCK_PAYMENT_STATES = [
  "NOT_STARTED",
  "MOCK_AUTHORIZING",
  "MOCK_AUTHORIZED",
  "MOCK_FAILED",
  "TEST_PAYMENT_INTENT_CREATED",
  "TEST_PAYMENT_CONFIRMED",
  "TEST_REQUIRES_PAYMENT_METHOD",
  "TEST_REQUIRES_CAPTURE",
  "TEST_SUCCEEDED",
  "TEST_CANCELED",
  "TEST_FAILED",
] as const;

export type TaxiPartnerMockPaymentState =
  (typeof TAXI_PARTNER_MOCK_PAYMENT_STATES)[number];

export const TAXI_PARTNER_DRIVER_ASSIGNMENT_STATUSES = [
  "NOT_ASSIGNED",
  "PARTNER_ACCEPTED",
  "PARTNER_DECLINED",
  "DRIVER_ASSIGNED",
  "DRIVER_EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
] as const;

export type TaxiPartnerDriverAssignmentStatus =
  (typeof TAXI_PARTNER_DRIVER_ASSIGNMENT_STATUSES)[number];

export const TAXI_PARTNER_PAYOUT_STATUSES = [
  "NOT_READY",
  "PENDING_DISPUTE_WINDOW",
  "HELD_FOR_REVIEW",
  "READY_TO_RELEASE",
  "RELEASED",
  "RELEASED_MOCK",
  "DENIED",
  "DENIED_MOCK",
] as const;

export type TaxiPartnerPayoutStatus = (typeof TAXI_PARTNER_PAYOUT_STATUSES)[number];

export type TaxiPartnerReviewState = "OPEN" | "UNDER_REVIEW" | "NEEDS_MORE_INFO" | "APPROVED" | "REJECTED" | "RESOLVED";

export type TaxiPartnerDisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED";

export type TaxiPartnerPickupStatus =
  | "READY_FOR_PICKUP"
  | "PARTNER_ARRIVED"
  | "RIDERS_CHECKING_IN"
  | "RIDE_STARTED"
  | "PICKUP_ISSUE";

export type TaxiPartnerQuoteRequest = {
  id: string;
  podId: string;
  rideInstanceId?: string;
  organizerUserId: string;
  rideOption: "TAXI_PARTNER_QUOTE";
  requestedTaxiType: TaxiPartnerTaxiType;
  requestedAt: string;
  quoteStatus: TaxiPartnerQuoteStatus;
  quoteAmountCents: number | null;
  currency: "HKD";
  quotedByPartnerName: string | null;
  quotedByPartnerId: string | null;
  quoteExpiresAt: string | null;
  guestAcceptanceStatus: TaxiPartnerGuestAcceptanceStatus;
  driverAssignmentStatus: TaxiPartnerDriverAssignmentStatus;
  payoutStatus: TaxiPartnerPayoutStatus;
  pickupStatus?: TaxiPartnerPickupStatus;
  reviewState?: TaxiPartnerReviewState;
  disputeStatus?: TaxiPartnerDisputeStatus;
  luggageCount?: number;
  extraSpaceNeeded?: boolean;
  wheelchairAccessibleRequested?: boolean;
  stepFreeSupportRequested?: boolean;
  acceptedGuestCount?: number;
  disputeWindowEndsAt?: string | null;
  quoteAboveCap?: boolean;
  notes?: string;
};

export type TaxiPartnerQuoteDisplayStatus = {
  label: string;
  tone: "gold" | "green" | "purple" | "orange" | "blue" | "gray" | "amber" | "red";
  helperText: string;
  primaryActionLabel: string;
  primaryActionTarget?: string;
};

export type TaxiPartnerQuoteMoneyDisplay = {
  quoteAmountCents: number;
  guestCount: number;
  fareShareCents: number;
  platformFeeCents: number;
  platformFeeTotalCents: number;
  guestChargeCents: number;
  driverPayoutCents: number;
  currency: "HKD";
};

export type TaxiPartnerQuoteAcceptance = {
  id: string;
  quoteRequestId: string;
  rideInstanceId: string;
  guestUserId: string;
  acceptanceStatus: TaxiPartnerQuoteAcceptanceStatus;
  mockPaymentState: TaxiPartnerMockPaymentState;
  acceptedAt: string | null;
  declinedAt: string | null;
  acceptedHigherQuote: boolean;
};

export type TaxiPartnerMockQuoteInput = {
  requestId?: string;
  rideInstanceId?: string;
  quoteAmountCents: number;
  taxiType: TaxiPartnerTaxiType;
  quoteExpiresInMinutes: number;
  partnerName?: string;
  partnerNote?: string;
  bookingFareCapCents?: number | null;
};

export type TaxiPartnerMockQuoteResult = {
  success: boolean;
  quoteRequest: TaxiPartnerQuoteRequest | null;
  message: string;
  aboveCap: boolean;
  nextStatus: TaxiPartnerQuoteStatus | null;
  error?: string;
};

export type TaxiPartnerMockJobResult = {
  success: boolean;
  quoteRequest: TaxiPartnerQuoteRequest | null;
  message: string;
  nextStatus: TaxiPartnerDriverAssignmentStatus | null;
  error?: string;
};

export const taxiPartnerTaxiTypeLabels: Record<TaxiPartnerTaxiType, string> = {
  STANDARD: "Standard",
  ELECTRIC: "Electric",
  LUGGAGE_FRIENDLY: "Luggage-friendly",
  LARGE: "Large",
  COMFORT: "Comfort",
  ACCESSIBLE: "Accessible",
};

export const mockTaxiPartnerQuoteRequests: TaxiPartnerQuoteRequest[] = [
  {
    id: "taxi_partner_quote_needed",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-needed",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "STANDARD",
    requestedAt: "2026-05-20T08:00:00.000Z",
    quoteStatus: "QUOTE_NOT_REQUESTED",
    quoteAmountCents: null,
    currency: "HKD",
    quotedByPartnerName: null,
    quotedByPartnerId: null,
    quoteExpiresAt: null,
    guestAcceptanceStatus: "GUESTS_LOCKED",
    driverAssignmentStatus: "NOT_ASSIGNED",
    payoutStatus: "NOT_READY",
    luggageCount: 2,
    notes: "Guests are locked. Request a shared pod quote from a licensed taxi partner.",
  },
  {
    id: "taxi_partner_quote_received",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-received",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:05:00.000Z",
    quoteStatus: "QUOTE_RECEIVED",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: "2026-05-20T08:35:00.000Z",
    guestAcceptanceStatus: "GUESTS_LOCKED",
    driverAssignmentStatus: "NOT_ASSIGNED",
    payoutStatus: "NOT_READY",
    luggageCount: 2,
    notes: "A licensed taxi partner quoted HK$240 for the shared pod.",
  },
  {
    id: "taxi_partner_guests_accepting",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-accepting",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:10:00.000Z",
    quoteStatus: "QUOTE_RECEIVED",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: "2026-05-20T08:40:00.000Z",
    guestAcceptanceStatus: "ACCEPTING_QUOTE",
    driverAssignmentStatus: "NOT_ASSIGNED",
    payoutStatus: "NOT_READY",
    luggageCount: 2,
    acceptedGuestCount: 2,
    notes: "Some guests accepted the shared pod quote; others still need to accept.",
  },
  {
    id: "taxi_partner_ready",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-ready",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:15:00.000Z",
    quoteStatus: "QUOTE_ACCEPTED",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: "2026-05-20T08:45:00.000Z",
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "NOT_ASSIGNED",
    payoutStatus: "NOT_READY",
    luggageCount: 2,
    acceptedGuestCount: 4,
    notes: "Guests accepted the quote. Waiting for taxi partner to accept.",
  },
  {
    id: "taxi_partner_completed_payout_pending",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-payout-pending",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:20:00.000Z",
    quoteStatus: "QUOTE_ACCEPTED",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: null,
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "PENDING_DISPUTE_WINDOW",
    luggageCount: 2,
    acceptedGuestCount: 4,
    disputeWindowEndsAt: "2026-07-01T07:45:00.000Z",
    notes: "Ride completed. Payout waits for the dispute window.",
  },
  {
    id: "taxi_partner_dispute_review",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-dispute-review",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:25:00.000Z",
    quoteStatus: "ADMIN_REVIEW",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: null,
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "HELD_FOR_REVIEW",
    luggageCount: 2,
    acceptedGuestCount: 4,
    disputeWindowEndsAt: "2026-07-08T07:45:00.000Z",
    notes: "A guest raised an issue. Payout is held for manual review.",
  },
  {
    id: "taxi_partner_payout_ready",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-payout-ready",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:30:00.000Z",
    quoteStatus: "QUOTE_ACCEPTED",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: null,
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "READY_TO_RELEASE",
    reviewState: "RESOLVED",
    luggageCount: 2,
    acceptedGuestCount: 4,
    notes: "Manual review complete. Payout is ready in demo mode.",
  },
  {
    id: "taxi_partner_more_info_needed",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-more-info-needed",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:35:00.000Z",
    quoteStatus: "ADMIN_REVIEW",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: null,
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "NOT_READY",
    reviewState: "NEEDS_MORE_INFO",
    luggageCount: 2,
    acceptedGuestCount: 4,
    notes: "RidePod needs more information before resolving this taxi partner case.",
  },
  {
    id: "taxi_partner_under_review",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-under-review",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:40:00.000Z",
    quoteStatus: "ADMIN_REVIEW",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: null,
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "NOT_READY",
    reviewState: "UNDER_REVIEW",
    luggageCount: 2,
    acceptedGuestCount: 4,
    notes: "RidePod is reviewing this taxi partner case.",
  },
  {
    id: "taxi_partner_payout_denied",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-payout-denied",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:45:00.000Z",
    quoteStatus: "ADMIN_REVIEW",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: null,
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "DENIED_MOCK",
    reviewState: "RESOLVED",
    luggageCount: 2,
    acceptedGuestCount: 4,
    notes: "Payout was denied in demo review.",
  },
  {
    id: "taxi_partner_dispute_resolved",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-dispute-resolved",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:50:00.000Z",
    quoteStatus: "ADMIN_REVIEW",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: null,
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "NOT_READY",
    reviewState: "RESOLVED",
    disputeStatus: "RESOLVED",
    luggageCount: 2,
    acceptedGuestCount: 4,
    notes: "RidePod marked this dispute resolved in demo mode.",
  },
  {
    id: "taxi_partner_closed",
    podId: "taxi-partner-quote-demo",
    rideInstanceId: "taxi-partner-quote-demo-closed",
    organizerUserId: "u1",
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType: "ELECTRIC",
    requestedAt: "2026-05-20T08:55:00.000Z",
    quoteStatus: "QUOTE_ACCEPTED",
    quoteAmountCents: 24000,
    currency: "HKD",
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: null,
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "RELEASED_MOCK",
    reviewState: "RESOLVED",
    luggageCount: 2,
    acceptedGuestCount: 4,
    notes: "Payout was marked closed in demo mode.",
  },
];

const TAXI_PARTNER_DEMO_QUOTE_STORAGE_KEY = "ridepod:taxi-partner-demo-quotes";

function canUseTaxiPartnerDemoStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredTaxiPartnerQuoteRequests() {
  if (!canUseTaxiPartnerDemoStorage()) return [];

  try {
    const rawValue = window.localStorage.getItem(TAXI_PARTNER_DEMO_QUOTE_STORAGE_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);

    return Array.isArray(parsed) ? (parsed as TaxiPartnerQuoteRequest[]) : [];
  } catch {
    return [];
  }
}

function writeStoredTaxiPartnerQuoteRequest(request: TaxiPartnerQuoteRequest) {
  if (!canUseTaxiPartnerDemoStorage()) return;

  const storedRequests = readStoredTaxiPartnerQuoteRequests();
  const nextRequests = [
    request,
    ...storedRequests.filter((storedRequest) => storedRequest.id !== request.id),
  ];

  window.localStorage.setItem(TAXI_PARTNER_DEMO_QUOTE_STORAGE_KEY, JSON.stringify(nextRequests));
}

function upsertMockTaxiPartnerQuoteRequest(request: TaxiPartnerQuoteRequest) {
  const existingIndex = mockTaxiPartnerQuoteRequests.findIndex((mockRequest) => mockRequest.id === request.id);

  if (existingIndex >= 0) {
    mockTaxiPartnerQuoteRequests[existingIndex] = request;
  } else {
    mockTaxiPartnerQuoteRequests.unshift(request);
  }

  writeStoredTaxiPartnerQuoteRequest(request);
}

export function getTaxiPartnerQuoteRequest(id: string | null | undefined) {
  if (!id) return null;

  const storedRequest = readStoredTaxiPartnerQuoteRequests().find(
    (request) => request.id === id || request.rideInstanceId === id,
  );
  if (storedRequest) return storedRequest;

  return mockTaxiPartnerQuoteRequests.find((request) => request.id === id) ?? null;
}

export function submitTaxiPartnerMockQuote(input: TaxiPartnerMockQuoteInput): TaxiPartnerMockQuoteResult {
  if (!input.quoteAmountCents) {
    return {
      success: false,
      quoteRequest: null,
      message: "Add a quote amount.",
      aboveCap: false,
      nextStatus: null,
      error: "Add a quote amount.",
    };
  }

  if (input.quoteAmountCents <= 0) {
    return {
      success: false,
      quoteRequest: null,
      message: "Quote amount must be greater than 0.",
      aboveCap: false,
      nextStatus: null,
      error: "Quote amount must be greater than 0.",
    };
  }

  if (!input.taxiType) {
    return {
      success: false,
      quoteRequest: null,
      message: "Choose a taxi type.",
      aboveCap: false,
      nextStatus: null,
      error: "Choose a taxi type.",
    };
  }

  if (!input.quoteExpiresInMinutes || input.quoteExpiresInMinutes <= 0) {
    return {
      success: false,
      quoteRequest: null,
      message: "Choose quote expiry.",
      aboveCap: false,
      nextStatus: null,
      error: "Choose quote expiry.",
    };
  }

  const existingRequest =
    getTaxiPartnerQuoteRequest(input.requestId) ??
    mockTaxiPartnerQuoteRequests.find((request) => request.rideInstanceId === input.rideInstanceId) ??
    null;
  const now = new Date();
  const quoteExpiresAt = new Date(now.getTime() + input.quoteExpiresInMinutes * 60 * 1000).toISOString();
  const aboveCap =
    typeof input.bookingFareCapCents === "number" && input.quoteAmountCents > input.bookingFareCapCents;
  const quoteRequest: TaxiPartnerQuoteRequest = {
    ...(existingRequest ?? {
      id: input.requestId ?? `taxi_partner_mock_quote_${input.rideInstanceId ?? Date.now()}`,
      podId: "taxi-partner-quote-demo",
      rideInstanceId: input.rideInstanceId,
      organizerUserId: "u1",
      rideOption: "TAXI_PARTNER_QUOTE" as const,
      requestedAt: now.toISOString(),
      currency: "HKD" as const,
      quotedByPartnerId: "demo-taxi-partner",
      luggageCount: 0,
    }),
    requestedTaxiType: input.taxiType,
    quoteStatus: "QUOTE_RECEIVED",
    quoteAmountCents: input.quoteAmountCents,
    quotedByPartnerName: input.partnerName ?? "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt,
    guestAcceptanceStatus: "ACCEPTING_QUOTE",
    driverAssignmentStatus: "NOT_ASSIGNED",
    payoutStatus: "NOT_READY",
    quoteAboveCap: aboveCap,
    notes: input.partnerNote?.trim() || "Taxi partner submitted a shared pod quote.",
  };

  upsertMockTaxiPartnerQuoteRequest(quoteRequest);

  return {
    success: true,
    quoteRequest,
    message: "Quote submitted. Guests can now review and accept this shared taxi quote.",
    aboveCap,
    nextStatus: quoteRequest.quoteStatus,
  };
}

export function acceptTaxiPartnerMockJob(requestId: string | null | undefined): TaxiPartnerMockJobResult {
  const existingRequest = getTaxiPartnerQuoteRequest(requestId);

  if (!existingRequest) {
    return {
      success: false,
      quoteRequest: null,
      message: "Taxi partner quote request not found.",
      nextStatus: null,
      error: "Taxi partner quote request not found.",
    };
  }

  const quoteRequest: TaxiPartnerQuoteRequest = {
    ...existingRequest,
    quoteStatus: "QUOTE_ACCEPTED",
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "PARTNER_ACCEPTED",
    payoutStatus: "NOT_READY",
    pickupStatus: "READY_FOR_PICKUP",
    notes: "Taxi partner accepted the shared taxi job in demo mode.",
  };

  upsertMockTaxiPartnerQuoteRequest(quoteRequest);

  return {
    success: true,
    quoteRequest,
    message: "Job accepted. This ride is ready for pickup in demo mode.",
    nextStatus: quoteRequest.driverAssignmentStatus,
  };
}

export function markTaxiPartnerArrivedMock(requestId: string | null | undefined): TaxiPartnerMockJobResult {
  const existingRequest = getTaxiPartnerQuoteRequest(requestId);

  if (!existingRequest) {
    return {
      success: false,
      quoteRequest: null,
      message: "Taxi partner quote request not found.",
      nextStatus: null,
      error: "Taxi partner quote request not found.",
    };
  }

  const quoteRequest: TaxiPartnerQuoteRequest = {
    ...existingRequest,
    driverAssignmentStatus: "ARRIVED",
    pickupStatus: "PARTNER_ARRIVED",
    notes: "Taxi partner marked arrived at the pickup point in demo mode.",
  };

  upsertMockTaxiPartnerQuoteRequest(quoteRequest);

  return {
    success: true,
    quoteRequest,
    message: "Taxi partner arrived. Meet at the pickup point.",
    nextStatus: quoteRequest.driverAssignmentStatus,
  };
}

export function startTaxiPartnerRideMock(requestId: string | null | undefined): TaxiPartnerMockJobResult {
  const existingRequest = getTaxiPartnerQuoteRequest(requestId);

  if (!existingRequest) {
    return {
      success: false,
      quoteRequest: null,
      message: "Taxi partner quote request not found.",
      nextStatus: null,
      error: "Taxi partner quote request not found.",
    };
  }

  const quoteRequest: TaxiPartnerQuoteRequest = {
    ...existingRequest,
    driverAssignmentStatus: "IN_PROGRESS",
    pickupStatus: "RIDE_STARTED",
    notes: "Taxi partner started the shared taxi ride in demo mode.",
  };

  upsertMockTaxiPartnerQuoteRequest(quoteRequest);

  return {
    success: true,
    quoteRequest,
    message: "Ride started. The shared taxi ride is in progress.",
    nextStatus: quoteRequest.driverAssignmentStatus,
  };
}

export function declineTaxiPartnerMockJob(requestId: string | null | undefined): TaxiPartnerMockJobResult {
  const existingRequest = getTaxiPartnerQuoteRequest(requestId);

  if (!existingRequest) {
    return {
      success: false,
      quoteRequest: null,
      message: "Taxi partner quote request not found.",
      nextStatus: null,
      error: "Taxi partner quote request not found.",
    };
  }

  const quoteRequest: TaxiPartnerQuoteRequest = {
    ...existingRequest,
    driverAssignmentStatus: "PARTNER_DECLINED",
    payoutStatus: "NOT_READY",
    notes: "Taxi partner declined the shared taxi job in demo mode.",
  };

  upsertMockTaxiPartnerQuoteRequest(quoteRequest);

  return {
    success: true,
    quoteRequest,
    message: "Partner declined. Organizer may request another quote.",
    nextStatus: quoteRequest.driverAssignmentStatus,
  };
}

export function getTaxiPartnerQuoteDisplayStatus(
  request: TaxiPartnerQuoteRequest | null | undefined,
): TaxiPartnerQuoteDisplayStatus {
  if (!request || request.quoteStatus === "QUOTE_NOT_REQUESTED") {
    return {
      label: "Partner quote needed",
      tone: "gold",
      helperText: "Request a quote from a licensed taxi partner.",
      primaryActionLabel: "Request quote",
    };
  }

  if (request.quoteStatus === "QUOTE_REQUESTED") {
    return {
      label: "Waiting for quote",
      tone: "gold",
      helperText: "Taxi partners can quote one price for this shared pod.",
      primaryActionLabel: "View request",
    };
  }

  if (request.payoutStatus === "HELD_FOR_REVIEW") {
    return {
      label: "Dispute review",
      tone: "amber",
      helperText: "Payout is held while RidePod reviews the issue.",
      primaryActionLabel: "View review",
    };
  }

  if (request.payoutStatus === "READY_TO_RELEASE") {
    return {
      label: "Payout ready",
      tone: "green",
      helperText: "Review is complete. Payout can be processed in demo mode.",
      primaryActionLabel: "View payout",
    };
  }

  if (request.payoutStatus === "RELEASED_MOCK") {
    return {
      label: "Closed",
      tone: "gray",
      helperText: "Payout was marked released in demo mode.",
      primaryActionLabel: "View details",
    };
  }

  if (request.payoutStatus === "DENIED_MOCK") {
    return {
      label: "Payout denied",
      tone: "red",
      helperText: "Payout was denied in demo review.",
      primaryActionLabel: "View review",
    };
  }

  if (request.reviewState === "NEEDS_MORE_INFO") {
    return {
      label: "More info needed",
      tone: "amber",
      helperText: "RidePod needs more information before resolving this case.",
      primaryActionLabel: "View review",
    };
  }

  if (request.reviewState === "UNDER_REVIEW") {
    return {
      label: "Under review",
      tone: "blue",
      helperText: "RidePod is reviewing this taxi partner case.",
      primaryActionLabel: "View review",
    };
  }

  if (request.disputeStatus === "OPEN" || request.disputeStatus === "UNDER_REVIEW") {
    return {
      label: "Dispute review",
      tone: "amber",
      helperText: "RidePod is reviewing the reported issue.",
      primaryActionLabel: "View dispute",
    };
  }

  if (request.disputeStatus === "RESOLVED") {
    return {
      label: "Dispute resolved",
      tone: "green",
      helperText: "The dispute was resolved in demo mode.",
      primaryActionLabel: "View details",
    };
  }

  if (request.quoteStatus === "ADMIN_REVIEW") {
    return {
      label: "Dispute review",
      tone: "amber",
      helperText: "Payout is held while RidePod reviews the issue.",
      primaryActionLabel: "View review",
    };
  }

  if (request.payoutStatus === "RELEASED" || request.payoutStatus === "DENIED") {
    return {
      label: "Closed",
      tone: "gray",
      helperText: "Ride completed and payout status is closed.",
      primaryActionLabel: "View details",
    };
  }

  if (
    request.driverAssignmentStatus === "COMPLETED" &&
    request.payoutStatus === "PENDING_DISPUTE_WINDOW"
  ) {
    return {
      label: "Payout pending",
      tone: "blue",
      helperText: "Payout releases after the dispute window if no issue is reported.",
      primaryActionLabel: "View payout",
    };
  }

  if (request.driverAssignmentStatus === "COMPLETED") {
    return {
      label: "Ride completed",
      tone: "blue",
      helperText: "Dispute window is open before payout is marked ready.",
      primaryActionLabel: "View settlement",
    };
  }

  if (
    request.pickupStatus === "PICKUP_ISSUE"
  ) {
    return {
      label: "Pickup issue",
      tone: "amber",
      helperText: "RidePod may need to review this pickup.",
      primaryActionLabel: "View review",
    };
  }

  if (
    request.pickupStatus === "RIDE_STARTED" ||
    request.driverAssignmentStatus === "IN_PROGRESS"
  ) {
    return {
      label: "Ride started",
      tone: "blue",
      helperText: "The shared taxi ride is in progress.",
      primaryActionLabel: "View ride",
    };
  }

  if (request.pickupStatus === "RIDERS_CHECKING_IN") {
    return {
      label: "Riders checking in",
      tone: "blue",
      helperText: "Waiting for guests to confirm they are at pickup.",
      primaryActionLabel: "View pickup",
    };
  }

  if (
    request.pickupStatus === "PARTNER_ARRIVED" ||
    request.driverAssignmentStatus === "ARRIVED"
  ) {
    return {
      label: "Taxi partner arrived",
      tone: "blue",
      helperText: "Meet at the pickup point.",
      primaryActionLabel: "View pickup",
    };
  }

  if (
    request.driverAssignmentStatus === "PARTNER_ACCEPTED" ||
    request.driverAssignmentStatus === "DRIVER_ASSIGNED" ||
    request.driverAssignmentStatus === "DRIVER_EN_ROUTE"
  ) {
    return {
      label: "Ready for pickup",
      tone: "green",
      helperText: "Taxi partner accepted the shared pod in demo mode.",
      primaryActionLabel: "View ride",
    };
  }

  if (request.driverAssignmentStatus === "PARTNER_DECLINED" || request.driverAssignmentStatus === "CANCELED") {
    return {
      label: "Partner declined",
      tone: "amber",
      helperText: "Organizer may request another quote.",
      primaryActionLabel: "Request quote",
    };
  }

  if (
    request.guestAcceptanceStatus === "ALL_ACCEPTED" &&
    request.driverAssignmentStatus === "NOT_ASSIGNED"
  ) {
    return {
      label: "Ready for taxi partner",
      tone: "blue",
      helperText: "Guests accepted the quote. Waiting for taxi partner to accept.",
      primaryActionLabel: "View ride",
    };
  }

  if (
    request.quoteStatus === "QUOTE_RECEIVED" &&
    request.guestAcceptanceStatus === "ACCEPTING_QUOTE" &&
    (request.acceptedGuestCount ?? 0) > 0
  ) {
    return {
      label: "Guests accepting",
      tone: "purple",
      helperText: "Waiting for all guests to accept the quote.",
      primaryActionLabel: "View acceptances",
    };
  }

  if (request.quoteStatus === "QUOTE_RECEIVED") {
    return {
      label: "Quote received",
      tone: "green",
      helperText: "Guests need to accept the partner quote before the ride proceeds.",
      primaryActionLabel: "Review quote",
    };
  }

  return {
    label: "Partner quote needed",
    tone: "gold",
    helperText: "Request a quote from a licensed taxi partner.",
    primaryActionLabel: "Request quote",
  };
}

export function getTaxiPartnerQuoteMoneyDisplay(
  request: Pick<TaxiPartnerQuoteRequest, "quoteAmountCents" | "currency">,
  lockedGuestCount: number,
): TaxiPartnerQuoteMoneyDisplay | null {
  if (!request.quoteAmountCents) return null;

  const guestCount = Math.max(1, Math.floor(lockedGuestCount));
  const fareShareCents = Math.ceil(request.quoteAmountCents / guestCount);
  const platformFeeCents = Math.max(Math.ceil(fareShareCents * 0.1), 600);
  const platformFeeTotalCents = platformFeeCents * guestCount;

  return {
    quoteAmountCents: request.quoteAmountCents,
    guestCount,
    fareShareCents,
    platformFeeCents,
    platformFeeTotalCents,
    guestChargeCents: fareShareCents + platformFeeCents,
    driverPayoutCents: request.quoteAmountCents,
    currency: request.currency,
  };
}

export function createPendingTaxiPartnerQuoteAcceptance(input: {
  quoteRequestId: string;
  rideInstanceId: string;
  guestUserId: string;
}): TaxiPartnerQuoteAcceptance {
  return {
    id: `${input.quoteRequestId}-${input.guestUserId}`,
    quoteRequestId: input.quoteRequestId,
    rideInstanceId: input.rideInstanceId,
    guestUserId: input.guestUserId,
    acceptanceStatus: "PENDING",
    mockPaymentState: "NOT_STARTED",
    acceptedAt: null,
    declinedAt: null,
    acceptedHigherQuote: false,
  };
}

export function completeTaxiPartnerQuoteRequestMock(
  request: TaxiPartnerQuoteRequest,
  now = new Date(),
): TaxiPartnerQuoteRequest {
  const completedAt = Number.isNaN(now.getTime()) ? new Date() : now;
  const disputeWindowEndsAt = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const quoteRequest: TaxiPartnerQuoteRequest = {
    ...request,
    quoteStatus: "QUOTE_ACCEPTED",
    guestAcceptanceStatus: "ALL_ACCEPTED",
    driverAssignmentStatus: "COMPLETED",
    payoutStatus: "PENDING_DISPUTE_WINDOW",
    pickupStatus: "RIDE_STARTED",
    acceptedGuestCount: request.acceptedGuestCount ?? 0,
    disputeWindowEndsAt,
    notes: "Ride completed. Payout is pending until the dispute window ends.",
  };

  upsertMockTaxiPartnerQuoteRequest(quoteRequest);

  return quoteRequest;
}
