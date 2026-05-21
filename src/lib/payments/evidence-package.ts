import type { AdminReviewCaseViewModel } from "@/lib/supabase/admin-review-cases";

export const RIDEPOD_EVIDENCE_PACKAGE_TYPES = [
  "TAXI_PARTNER_QUOTE_DISPUTE",
  "RIDE_APP_RECEIPT_DISPUTE",
  "TAXI_METER_PROOF_DISPUTE",
  "PAYMENT_CHARGEBACK_REVIEW",
  "ADMIN_PAYOUT_REVIEW",
] as const;

export type RidePodEvidencePackageType = (typeof RIDEPOD_EVIDENCE_PACKAGE_TYPES)[number];
export type RidePodEvidenceViewerRole = "admin" | "internal" | "host" | "guest";

export type RidePodEvidenceChecklistItem = {
  item: string;
  present: boolean;
  notes: string;
};

export type RidePodEvidenceTimelineItem = {
  title: string;
  timestamp: string | null;
  actorLabel: string;
  description: string;
  source: "pod" | "rideInstance" | "proof" | "paymentEvent" | "adminReview" | "dispute";
};

export type RidePodEvidencePackage = {
  packageId: string;
  packageType: RidePodEvidencePackageType;
  generatedAt: string;
  rideInstanceSummary: Record<string, unknown>;
  podSummary: Record<string, unknown>;
  userAcceptanceSummary: Record<string, unknown>;
  moneySummary: Record<string, unknown>;
  proofSummary: Record<string, unknown>;
  paymentEventSummary: Array<Record<string, unknown>>;
  disputeSummary: Record<string, unknown>;
  adminReviewSummary: Record<string, unknown>;
  timeline: RidePodEvidenceTimelineItem[];
  evidenceChecklist: RidePodEvidenceChecklistItem[];
  missingEvidence: string[];
  recommendedAdminNotes: string;
};

export type BuildRidePodEvidencePackageInput = {
  rideInstanceId: string;
  disputeId?: string | null;
  paymentIntentId?: string | null;
  adminReviewCaseId?: string | null;
  packageType: RidePodEvidencePackageType;
  viewerRole?: RidePodEvidenceViewerRole;
  reviewCase?: AdminReviewCaseViewModel | null;
  paymentEvents?: Array<{
    eventType: string;
    timestamp?: string | null;
    amountCents?: number | null;
    paymentProvider?: string | null;
    paymentIntentId?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    actorRole?: string | null;
  }>;
};

const unsafeEvidenceKeys = new Set([
  "clientsecret",
  "client_secret",
  "secret",
  "stripesecretkey",
  "stripe_secret_key",
  "cardnumber",
  "cvc",
  "cvv",
  "phone",
  "email",
  "genderidentity",
  "riskstatus",
  "riskscore",
  "safetynote",
]);

function formatHkd(cents: number | null | undefined) {
  return typeof cents === "number" ? `HK$${(cents / 100).toFixed(2)}` : "Not available";
}

function normalizeKey(key: string) {
  return key.replaceAll("-", "").replaceAll("_", "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeEvidencePackageValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeEvidencePackageValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !unsafeEvidenceKeys.has(normalizeKey(key)))
      .map(([key, nestedValue]) => [key, sanitizeEvidencePackageValue(nestedValue)]),
  );
}

function eventLabel(eventType: string) {
  if (eventType === "TEST_PAYMENT_INTENT_CREATED") return "Test payment created";
  if (eventType === "TEST_PAYMENT_CONFIRMED") return "Test payment confirmed";
  if (eventType === "TEST_REQUIRES_CAPTURE") return "Test authorization ready for capture";
  if (eventType === "TEST_CAPTURED") return "Test payment captured";
  if (eventType === "TEST_CANCELED") return "Test authorization canceled";
  if (eventType === "TEST_REFUND_SIMULATED") return "Refund simulated";
  if (eventType === "PAYMENT_HELD_FOR_REVIEW") return "Payment held for review";
  if (eventType === "PAYOUT_MARKED_READY_DEMO") return "Payout marked ready in demo";
  if (eventType === "PAYOUT_DENIED_DEMO") return "Payout denied in demo";
  if (eventType === "PAYMENT_ACTION_FAILED") return "Payment action failed";
  return "Payment event";
}

function sortTimeline(timeline: RidePodEvidenceTimelineItem[]) {
  return [...timeline].sort((left, right) => {
    const leftTime = left.timestamp ? Date.parse(left.timestamp) : Number.MAX_SAFE_INTEGER;
    const rightTime = right.timestamp ? Date.parse(right.timestamp) : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

function checklistItem(item: string, present: boolean, notes: string): RidePodEvidenceChecklistItem {
  return { item, present, notes };
}

function packageId(input: BuildRidePodEvidencePackageInput) {
  return `evidence-${input.packageType.toLowerCase()}-${input.rideInstanceId}-${Date.now()}`;
}

export function buildRidePodEvidencePackage(input: BuildRidePodEvidencePackageInput): RidePodEvidencePackage {
  const reviewCase = input.reviewCase ?? null;
  const viewerRole = input.viewerRole ?? "admin";
  const isAdminViewer = viewerRole === "admin" || viewerRole === "internal";
  const acceptance = reviewCase?.taxiPartnerGuestAcceptance;
  const missingEvidence: string[] = [];
  const paymentEvents = input.paymentEvents ?? [];
  const disputeSubmitted = Boolean(reviewCase && reviewCase.disputeStatus !== "None");
  const proofExists = Boolean(reviewCase?.fileUrl || reviewCase?.evidenceLabel);
  const completionRecorded = Boolean(reviewCase?.taxiPartnerRideCompletionStatus?.toLowerCase().includes("completed"));
  const acceptedCount = acceptance?.acceptedCount ?? reviewCase?.taxiPartnerAcceptedGuestCount ?? null;
  const hasAcceptance = typeof acceptedCount === "number" && acceptedCount > 0;
  const aboveCap = Boolean(
    typeof reviewCase?.taxiPartnerQuoteAmountCents === "number" &&
      reviewCase.bookingFareCapCents > 0 &&
      reviewCase.taxiPartnerQuoteAmountCents > reviewCase.bookingFareCapCents,
  );

  if (!hasAcceptance) missingEvidence.push("No guest acceptance timestamp found.");
  if (!paymentEvents.length) missingEvidence.push("No payment event history found.");
  if (!proofExists) missingEvidence.push("No proof certification found.");
  if (!completionRecorded) missingEvidence.push("No ride completion timestamp found.");
  if (isAdminViewer && !reviewCase?.caseDescription && !reviewCase?.disputeNote) missingEvidence.push("No admin review notes found.");
  if (disputeSubmitted && !reviewCase?.disputeNote) missingEvidence.push("No dispute note found.");

  const rideInstanceSummary = {
    rideInstanceId: input.rideInstanceId,
    podId: null,
    rideOption: reviewCase?.rideOptionLabel ?? reviewCase?.rideOption ?? "Ride details unavailable",
    route: reviewCase?.routeLabel || reviewCase?.route || "Ride details unavailable",
    pickupPoint: "See route summary",
    dropoffPoint: "See route summary",
    dateTime: reviewCase?.rideDateLabel || reviewCase?.rideDateTime || "Ride details unavailable",
    legType: reviewCase?.rideDateTime?.toLowerCase().includes("return") ? "Return" : "Outbound",
    status: reviewCase ? reviewCase.statusLabel : "Review unavailable",
    createdAt: reviewCase?.createdAtLabel ?? "Unknown",
    completedAt: completionRecorded ? "Recorded in demo timeline" : null,
  };

  const podSummary = {
    podType: "Shared ride pod",
    organizer: reviewCase?.host ?? "Organizer unavailable",
    guestCount: reviewCase?.guestsLocked ?? "Guest count unavailable",
    minimumLockedGuests: reviewCase?.guestsLocked ?? "Not available",
    safetyAccessMode: "Shared pod access mode",
    taxiType: reviewCase?.taxiPartnerTaxiType ?? "Not specified",
    luggageAccessibilitySummary: "Use ride request notes when available.",
  };

  const userAcceptanceSummary = {
    quoteAmountShown: formatHkd(reviewCase?.taxiPartnerQuoteAmountCents),
    quoteExpiry: "Quote expiry unavailable",
    guestsAcceptedCount: acceptedCount ?? "Guest acceptance unavailable",
    currentUserAccepted: hasAcceptance ? "Accepted count available" : "Not available",
    acceptedAt: hasAcceptance ? "Acceptance timestamp unavailable" : null,
    mockPaymentState: paymentEvents.length ? eventLabel(paymentEvents.at(-1)?.eventType ?? "") : "No payment event history",
    higherQuoteAccepted: aboveCap ? "Above-cap quote needs explicit approval" : "No above-cap flag",
  };

  const moneySummary = {
    quoteAmount: formatHkd(reviewCase?.taxiPartnerQuoteAmountCents ?? reviewCase?.fareAmountCents),
    bookingFareCap: formatHkd(reviewCase?.bookingFareCapCents),
    fareShare: formatHkd(reviewCase?.taxiPartnerFareSharePerGuestCents),
    platformFee: formatHkd(reviewCase?.taxiPartnerPlatformFeePerGuestCents),
    guestTotal: formatHkd(reviewCase?.taxiPartnerGuestChargeCents),
    platformFeeTotal:
      typeof reviewCase?.taxiPartnerPlatformFeePerGuestCents === "number" && typeof acceptedCount === "number"
        ? formatHkd(reviewCase.taxiPartnerPlatformFeePerGuestCents * acceptedCount)
        : "Not available",
    taxiPartnerPayout: formatHkd(reviewCase?.taxiPartnerDriverPayoutCents),
    payoutStatus: reviewCase?.payoutStatusLabel ?? "Payout status unavailable",
    aboveCap,
    currency: "HKD",
    betaNote: "No live money in this evidence package.",
  };

  const proofSummary = {
    proofType: reviewCase?.proofTypeLabel ?? reviewCase?.proofType ?? "Proof unavailable",
    proofStatus: reviewCase?.proofStatusLabel ?? reviewCase?.proofStatus ?? "Proof status unavailable",
    amount: formatHkd(reviewCase?.fareAmountCents),
    providerOrPartner: reviewCase?.taxiPartnerName ?? reviewCase?.host ?? "Provider unavailable",
    submittedAt: reviewCase?.submittedAt ?? "Not available",
    reviewedAt: "Review timestamp unavailable",
    certificationAccepted: reviewCase?.certificationAccepted ?? false,
    proofPreviewAvailable: proofExists,
    proofReference: reviewCase?.evidenceLabel ?? "No proof reference available",
  };

  const paymentEventSummary = paymentEvents.map((event) => ({
    eventLabel: eventLabel(event.eventType),
    timestamp: event.timestamp ?? null,
    amount: formatHkd(event.amountCents),
    paymentProvider: event.paymentProvider ?? "STRIPE_TEST",
    paymentIntentId: event.paymentIntentId ?? input.paymentIntentId ?? null,
    previousStatus: event.previousStatus ?? null,
    newStatus: event.newStatus ?? null,
    actorRole: event.actorRole ?? "unknown",
  }));

  const disputeSummary = {
    disputeType: reviewCase?.disputeIssueType ?? (disputeSubmitted ? "Reported issue" : "No dispute reported"),
    reporter: isAdminViewer ? (reviewCase?.reporter ?? "Reporter unavailable") : "Reporter private",
    reporterRole: reviewCase?.reporter ? "Guest" : "Not available",
    submittedAt: disputeSubmitted ? reviewCase?.createdAtLabel : null,
    issueNote: isAdminViewer ? (reviewCase?.disputeNote ?? "No dispute note found.") : "Limited dispute summary only.",
    evidenceAttachmentCount: proofExists ? 1 : 0,
    disputeStatus: reviewCase?.disputeStatus ?? "None",
    requestedResolution: "Manual review",
  };

  const adminReviewSummary = {
    adminReviewCaseId: input.adminReviewCaseId ?? reviewCase?.id ?? null,
    caseType: reviewCase?.caseTypeLabel ?? "Review case unavailable",
    severity: reviewCase?.severityLabel ?? "Unknown",
    reviewState: reviewCase?.reviewStateLabel ?? "Unknown",
    adminNotes: isAdminViewer ? (reviewCase?.caseDescription ?? reviewCase?.disputeNote ?? null) : null,
    lastAction: reviewCase?.statusLabel ?? "No admin action recorded",
    lastActionTimestamp: reviewCase?.createdAtLabel ?? null,
    payoutState: reviewCase?.payoutStatusLabel ?? "Payout state unavailable",
  };

  const timeline = sortTimeline([
    {
      title: "Review case created",
      timestamp: reviewCase?.createdTime ?? null,
      actorLabel: "RidePod",
      description: reviewCase?.caseTypeLabel ?? "Evidence review opened.",
      source: "adminReview",
    },
    ...(reviewCase?.taxiPartnerTimeline ?? []).map((item): RidePodEvidenceTimelineItem => ({
      title: item.title,
      timestamp: item.timestampLabel,
      actorLabel: "RidePod",
      description: item.detail ?? item.title,
      source: item.title === "Dispute opened" ? "dispute" : item.title === "Ride marked completed" ? "rideInstance" : "pod",
    })),
    ...paymentEvents.map((event): RidePodEvidenceTimelineItem => ({
      title: eventLabel(event.eventType),
      timestamp: event.timestamp ?? null,
      actorLabel: event.actorRole ?? "Payment system",
      description: `${eventLabel(event.eventType)}${event.newStatus ? `: ${event.newStatus}` : ""}`,
      source: "paymentEvent",
    })),
  ]);

  const evidenceChecklist = [
    checklistItem("User accepted quote/max charge", hasAcceptance, hasAcceptance ? "Guest acceptance count is available." : "Acceptance detail missing."),
    checklistItem("Payment/test authorization exists", paymentEvents.length > 0, paymentEvents.length ? "Payment event history is available." : "No payment event history found."),
    checklistItem("Fare/quote amount shown", typeof reviewCase?.taxiPartnerQuoteAmountCents === "number", "Taxi partner quote amount should be visible."),
    checklistItem("Booking fare cap available", Boolean(reviewCase?.bookingFareCapCents), "Fare cap helps evaluate above-cap issues."),
    checklistItem("Proof exists", proofExists, proofExists ? "Proof reference available." : "No proof reference found."),
    checklistItem("Proof certification accepted", Boolean(reviewCase?.certificationAccepted), "Certification is needed for proof reliability."),
    checklistItem("Ride completion recorded", completionRecorded, completionRecorded ? "Completion appears in review data." : "Completion timestamp missing."),
    checklistItem("Dispute window notice shown", reviewCase?.payoutStatus === "PENDING" || reviewCase?.payoutStatus === "HELD_FOR_REVIEW", "Payout/dispute state is represented."),
    checklistItem("Dispute submitted", disputeSubmitted, disputeSubmitted ? "Dispute exists." : "No dispute submitted."),
    checklistItem("Admin review case exists", Boolean(reviewCase), Boolean(reviewCase) ? "Admin review data loaded." : "No admin review case found."),
    checklistItem("Payment event history exists", paymentEvents.length > 0, paymentEvents.length ? "Payment event history included." : "No payment event history found."),
    checklistItem("Payout held if dispute exists", !disputeSubmitted || reviewCase?.payoutStatus === "HELD_FOR_REVIEW", "Dispute should keep payout in manual review."),
    checklistItem("No above-cap unresolved issue", !aboveCap || reviewCase?.reviewState === "RESOLVED", aboveCap ? "Above-cap quote needs review." : "No above-cap issue found."),
  ];

  const recommendedAdminNotes =
    reviewCase?.rideOption === "Taxi partner quote"
      ? `Guest accepted Taxi Partner Quote of ${formatHkd(reviewCase.taxiPartnerQuoteAmountCents)}. Payment state is test-mode only. Ride status is ${taxiPartnerRideStatusForEvidence(reviewCase)}. ${disputeSubmitted ? `Guest reported ${reviewCase.disputeIssueType ?? "an issue"}. Payout is ${reviewCase.payoutStatusLabel.toLowerCase()} for manual review.` : "No dispute is currently reported."}`
      : `RidePod evidence package generated for ${reviewCase?.rideOptionLabel ?? "this ride"}. Review payment events, proof status, and any reported issue before making an admin decision.`;

  return sanitizeEvidencePackageValue({
    packageId: packageId(input),
    packageType: input.packageType,
    generatedAt: new Date().toISOString(),
    rideInstanceSummary,
    podSummary,
    userAcceptanceSummary,
    moneySummary,
    proofSummary,
    paymentEventSummary,
    disputeSummary,
    adminReviewSummary,
    timeline,
    evidenceChecklist,
    missingEvidence,
    recommendedAdminNotes,
  }) as RidePodEvidencePackage;
}

function taxiPartnerRideStatusForEvidence(reviewCase: AdminReviewCaseViewModel) {
  if (reviewCase.payoutStatus === "HELD_FOR_REVIEW" || reviewCase.disputeStatus !== "None") return "in dispute review";
  if (reviewCase.taxiPartnerRideCompletionStatus?.toLowerCase().includes("completed")) return "completed";
  return reviewCase.taxiPartnerRideCompletionStatus ?? "under review";
}

export function buildRidePodEvidencePackageFromAdminReviewCase(
  reviewCase: AdminReviewCaseViewModel,
  options: Omit<BuildRidePodEvidencePackageInput, "rideInstanceId" | "adminReviewCaseId" | "reviewCase">,
) {
  return buildRidePodEvidencePackage({
    ...options,
    rideInstanceId: reviewCase.id,
    adminReviewCaseId: reviewCase.id,
    reviewCase,
  });
}
