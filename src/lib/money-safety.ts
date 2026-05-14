export const GENDER_IDENTITIES = [
  "FEMALE",
  "MALE",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
  "UNKNOWN",
] as const;

export type GenderIdentity = (typeof GENDER_IDENTITIES)[number];

export const VERIFICATION_STATUSES = [
  "NONE",
  "EMAIL_VERIFIED",
  "PHONE_VERIFIED",
  "COMMUNITY_VERIFIED",
  "ID_VERIFIED",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const RISK_STATUSES = ["NORMAL", "WATCH", "RESTRICTED", "SUSPENDED"] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export const GENDER_MODES = ["MIXED", "WOMEN_ONLY"] as const;
export type GenderMode = (typeof GENDER_MODES)[number];

export const GENDER_MODE_LABELS: Record<GenderMode, string> = {
  MIXED: "Mixed pod",
  WOMEN_ONLY: "Women-only",
};

export function getGenderModeLabel(mode: GenderMode) {
  return GENDER_MODE_LABELS[mode];
}

export const ACCESS_MODES = [
  "OPEN",
  "VERIFIED_ONLY",
  "COMMUNITY_ONLY",
  "HIGH_TRUST_ONLY",
  "INVITE_ONLY",
] as const;

export type AccessMode = (typeof ACCESS_MODES)[number];

export const ACCESS_MODE_LABELS: Record<AccessMode, string> = {
  OPEN: "Open",
  VERIFIED_ONLY: "Verified-only",
  COMMUNITY_ONLY: "Community-only",
  HIGH_TRUST_ONLY: "High-trust-only",
  INVITE_ONLY: "Invite-only",
};

export function getAccessModeLabel(mode: AccessMode) {
  return ACCESS_MODE_LABELS[mode];
}

export const POD_LIFECYCLE_STATES = [
  "DRAFT",
  "FORMING",
  "PAYMENT_LOCKING",
  "LOCKED",
  "HOST_CAN_BOOK",
  "RIDE_BOOKED",
  "PICKUP_WINDOW",
  "IN_PROGRESS",
  "COMPLETED",
  "RECEIPT_PENDING",
  "SETTLEMENT_PENDING",
  "SETTLED",
  "CLOSED",
  "HOST_REPLACEMENT_NEEDED",
  "CANCELED",
  "EXPIRED",
  "ADMIN_REVIEW",
  "DISPUTE_HOLD",
] as const;

export type PodLifecycleState = (typeof POD_LIFECYCLE_STATES)[number];

export const HOST_BOOKING_STATES = [
  "NOT_ALLOWED",
  "QUOTE_ALLOWED",
  "QUOTE_SUBMITTED",
  "QUOTE_APPROVED",
  "CAN_BOOK",
  "BOOKED_PENDING_PROOF",
  "BOOKED",
  "COMPLETED",
  "CANCELED_BY_HOST",
  "PROVIDER_CANCELED",
  "HOST_NO_SHOW",
  "WRONG_BOOKING",
] as const;

export type HostBookingState = (typeof HOST_BOOKING_STATES)[number];

export const MEMBER_ROLES = ["HOST", "RIDER", "REPLACEMENT_HOST"] as const;
export const POD_MEMBER_ROLES = MEMBER_ROLES;
export type PodMemberRole = (typeof POD_MEMBER_ROLES)[number];
export type MemberRole = PodMemberRole;

export const MEMBER_STATES = [
  "REQUESTED",
  "WAITLISTED",
  "ELIGIBLE",
  "PAYMENT_REQUIRED",
  "AUTHORIZING",
  "CONFIRMED",
  "LOCKED",
  "CANCELED",
  "COMPLETED",
  "NO_SHOW",
  "REMOVED",
] as const;

export const POD_MEMBER_STATES = MEMBER_STATES;
export type PodMemberState = (typeof POD_MEMBER_STATES)[number];
export type MemberState = PodMemberState;

export const PAYMENT_STATES = [
  "NOT_STARTED",
  "PAYMENT_METHOD_REQUIRED",
  "AUTHORIZING",
  "AUTHORIZED",
  "LOCKED_IN",
  "CAPTURE_PENDING",
  "CAPTURED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "AUTH_FAILED",
  "AUTH_EXPIRED",
  "CAPTURE_FAILED",
  "DISPUTED",
] as const;

export type PaymentState = (typeof PAYMENT_STATES)[number];

export const PAYMENT_PROVIDERS = ["MOCK", "STRIPE"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_INTENT_TYPES = [
  "SEAT_AUTHORIZATION",
  "DEPOSIT",
  "FINAL_CAPTURE",
  "PLATFORM_FEE",
] as const;

export type RidePodPaymentIntentType = (typeof PAYMENT_INTENT_TYPES)[number];

export const CAPTURE_METHODS = ["MANUAL", "AUTOMATIC"] as const;
export type CaptureMethod = (typeof CAPTURE_METHODS)[number];

export const PAYMENT_INTENT_STATUSES = [
  "CREATED",
  "REQUIRES_PAYMENT_METHOD",
  "REQUIRES_ACTION",
  "AUTHORIZING",
  "AUTHORIZED",
  "PROCESSING",
  "SUCCEEDED",
  "CANCELED",
  "FAILED",
  "REFUNDED",
  "DISPUTED",
] as const;

export type RidePodPaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

export const CHECKIN_STATES = [
  "NOT_CHECKED_IN",
  "CHECKED_IN",
  "LATE",
  "NO_SHOW",
  "EXCUSED",
] as const;

export type CheckinState = (typeof CHECKIN_STATES)[number];

export const PROVIDER_NAMES = [
  "UBER",
  "LYFT",
  "DIDI",
  "TAXI",
  "FIXED_FARE_TAXI",
  "PRIVATE_VAN",
  "OTHER",
] as const;

export type ProviderName = (typeof PROVIDER_NAMES)[number];

export const QUOTE_REVIEW_STATES = [
  "SUBMITTED",
  "AUTO_APPROVED",
  "QUOTE_APPROVED",
  "NEEDS_APPROVAL",
  "REJECTED",
  "EXPIRED",
] as const;

export type QuoteReviewState = (typeof QUOTE_REVIEW_STATES)[number];

export const RECEIPT_VERIFICATION_STATES = [
  "NOT_SUBMITTED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "NEEDS_MORE_INFO",
  "REJECTED",
  "FRAUD_SUSPECTED",
] as const;

export type ReceiptVerificationState = (typeof RECEIPT_VERIFICATION_STATES)[number];

export const SETTLEMENT_STATES = [
  "NOT_READY",
  "AWAITING_RECEIPT",
  "CALCULABLE",
  "DRAFT",
  "RIDER_NOTICE_SENT",
  "DISPUTE_WINDOW",
  "FINALIZED",
  "PAYOUT_PENDING",
  "PAID",
  "CLOSED",
  "ADMIN_REVIEW",
  "DISPUTE_HOLD",
] as const;

export type SettlementState = (typeof SETTLEMENT_STATES)[number];

export const RISK_TYPES = [
  "OFF_APP_PAYMENT_LANGUAGE",
  "FAKE_RECEIPT_SUSPECTED",
  "SAFETY_MODE_VIOLATION",
  "REPEATED_NO_SHOW",
  "HOST_BOOKED_BEFORE_AUTH",
  "HOST_CANCELED_AFTER_BOOKING",
  "QUOTE_RECEIPT_MISMATCH",
  "STRIPE_PAYMENT_DISPUTE",
] as const;

export type RiskType = (typeof RISK_TYPES)[number];

export const RISK_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const RISK_FLAG_STATUSES = ["OPEN", "REVIEWED", "DISMISSED", "ACTIONED"] as const;
export type RiskFlagStatus = (typeof RISK_FLAG_STATUSES)[number];

export const SETTLEMENT_ITEM_TYPES = [
  "FARE_SHARE",
  "PLATFORM_FEE",
  "REFUND",
  "NO_SHOW_FEE",
  "LATE_CANCEL_FEE",
  "HOST_REWARD",
  "HOST_ADJUSTMENT",
  "RIDER_CREDIT",
] as const;

export type SettlementItemType = (typeof SETTLEMENT_ITEM_TYPES)[number];

export const SETTLEMENT_ITEM_DIRECTIONS = [
  "DEBIT_USER",
  "CREDIT_USER",
  "CREDIT_HOST",
  "PLATFORM_REVENUE",
] as const;

export type SettlementItemDirection = (typeof SETTLEMENT_ITEM_DIRECTIONS)[number];

export const HOST_PAYOUT_STATES = [
  "PENDING",
  "HELD_FOR_REVIEW",
  "SCHEDULED",
  "PAID",
  "FAILED",
  "REVERSED",
  "DENIED",
] as const;

export type HostPayoutState = (typeof HOST_PAYOUT_STATES)[number];

export const AUDIT_EVENT_TYPES = [
  "POD_CREATED",
  "SAFETY_MODE_SET",
  "JOIN_REQUESTED",
  "ELIGIBILITY_PASSED",
  "ELIGIBILITY_FAILED",
  "PAYMENT_AUTHORIZED",
  "POD_LOCKED",
  "QUOTE_UPLOADED",
  "QUOTE_APPROVED",
  "QUOTE_ABOVE_MAX",
  "HOST_CAN_BOOK",
  "HOST_BOOKED_EXTERNAL_RIDE",
  "HOST_CANCELED_BEFORE_BOOKING",
  "HOST_CANCELED_AFTER_BOOKING",
  "HOST_REPLACEMENT_STARTED",
  "REPLACEMENT_HOST_ACCEPTED",
  "PARTICIPANT_CANCELED",
  "PARTICIPANT_NO_SHOW",
  "RECEIPT_UPLOADED",
  "RECEIPT_VERIFIED",
  "SETTLEMENT_CREATED",
  "SETTLEMENT_FINALIZED",
  "OFF_APP_WARNING_TRIGGERED",
  "ADMIN_OVERRIDE",
  "STRIPE_WEBHOOK_RECEIVED",
  "STRIPE_WEBHOOK_PROCESSED",
  "STRIPE_WEBHOOK_DUPLICATE",
  "STRIPE_WEBHOOK_INVALID_SIGNATURE",
  "PAYMENT_INTENT_UPDATED",
  "STRIPE_DISPUTE_CREATED",
  "STRIPE_CONNECT_ACCOUNT_CREATED",
  "STRIPE_CONNECT_ONBOARDING_LINK_CREATED",
  "STRIPE_CONNECT_STATUS_REFRESHED",
  "HOST_REIMBURSEMENT_SCHEDULED",
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export type MoneyCents = number;

export type ProtectedUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  genderIdentity: GenderIdentity;
  genderVerifiedAt: string | null;
  verificationStatus: VerificationStatus;
  communityId: string | null;
  trustScore: number;
  noShowCount: number;
  lateCancelCount: number;
  safetyReportCount: number;
  riskStatus: RiskStatus;
  stripeCustomerId: string | null;
  stripeConnectAccountId: string | null;
  payoutsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProtectedPodMember = {
  id: string;
  podId: string;
  userId: string;
  role: MemberRole;
  memberState: MemberState;
  paymentState: PaymentState;
  seatCount: number;
  maxChargeCents: MoneyCents;
  estimatedShareCents: MoneyCents;
  finalChargeCents: MoneyCents | null;
  platformFeeCents: MoneyCents;
  mockPaymentIntentId?: string | null;
  cancellationLiabilityCents: MoneyCents | null;
  noShowLiabilityCents: MoneyCents | null;
  joinedAt: string;
  lockedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  checkinState: CheckinState;
  trustDelta: number | null;
  eligibilityPassed: boolean;
  replacedByMemberId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuoteScreenshot = {
  id: string;
  podId: string;
  hostUserId: string;
  providerName: ProviderName;
  vehicleClass: string | null;
  quotedFareCents: MoneyCents;
  currency: string;
  routeSummary: string | null;
  screenshotFileUrl: string | null;
  screenshotFileId?: string | null;
  submittedAt: string;
  reviewState: QuoteReviewState;
  reviewedByAdminId: string | null;
  adminNotes: string | null;
  isFresh: boolean;
  expiresAt: string | null;
};

export type Receipt = {
  id: string;
  podId: string;
  hostUserId: string;
  providerName: ProviderName;
  vehicleClass: string | null;
  externalTripReferenceHash: string | null;
  receiptFileUrl: string | null;
  receiptFileId?: string | null;
  fareTotalCents: MoneyCents;
  baseFareCents: MoneyCents | null;
  taxesCents: MoneyCents | null;
  tollsCents: MoneyCents | null;
  feesCents: MoneyCents | null;
  tipCents: MoneyCents | null;
  currency: string;
  rideStartedAt: string | null;
  rideCompletedAt: string | null;
  submittedAt: string;
  verificationState: ReceiptVerificationState;
  reviewedByAdminId: string | null;
  rejectionReason: string | null;
  fraudScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ProtectedPod = {
  id: string;
  hostUserId: string;
  lifecycleState: PodLifecycleState;
  bookingState: HostBookingState;
  genderMode: GenderMode;
  accessMode: AccessMode;
  inviteCode: string | null;
  communityId: string | null;
  minTrustScore: number | null;
  originGeneral: string;
  destinationGeneral: string;
  pickupDetail: string | null;
  dropoffDetail: string | null;
  departureAt: string;
  departureWindowMinutes: number;
  targetSeats: number;
  minSeatsToBook: number;
  maxSeats: number;
  estimatedTotalFareCents: MoneyCents;
  approvedMaxTotalFareCents: MoneyCents;
  currency: string;
  ridepodFeeCents: MoneyCents;
  providerPolicy: string | null;
  cancellationPolicyId: string | null;
  lockDeadlineAt: string | null;
  bookingDeadlineAt: string | null;
  chatUnlockedAt: string | null;
  detailsUnlockedAt: string | null;
  hostReplacementStartedAt: string | null;
  originalHostUserId: string | null;
  replacementHostUserId: string | null;
  members: ProtectedPodMember[];
  quotes: QuoteScreenshot[];
  receipts: Receipt[];
  adminReviewRequired: boolean;
  higherMaxApprovedCents?: MoneyCents | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  podId: string | null;
  userId: string | null;
  eventType: AuditEventType;
  eventPayload: Record<string, unknown>;
  createdAt: string;
};

export type RiskFlag = {
  id: string;
  podId: string | null;
  userId: string;
  riskType: RiskType;
  severity: RiskSeverity;
  status: RiskFlagStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RidePodPaymentIntent = {
  id: string;
  provider: PaymentProvider;
  intentType: RidePodPaymentIntentType;
  captureMethod: CaptureMethod;
  podId: string;
  podMemberId: string;
  userId: string;
  externalPaymentIntentId: string | null;
  amountAuthorizedCents: MoneyCents;
  amountCapturedCents: MoneyCents;
  amountRefundedCents: MoneyCents;
  currency: string;
  status: RidePodPaymentIntentStatus;
  authorizationExpiresAt: string | null;
  idempotencyKey: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProcessedStripeWebhookEvent = {
  id: string;
  provider: "STRIPE";
  externalEventId: string;
  eventType: string;
  processedAt: string;
  status: "PROCESSED" | "IGNORED" | "ERROR";
  error: string | null;
};

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
  blockingReason: string | null;
  requiredAction: string | null;
};

export type EligibilityOptions = {
  inviteCode?: string | null;
  hasInviteMembership?: boolean;
  adminOverride?: boolean;
};

export type BookingPermission = {
  canBook: boolean;
  reasons: string[];
  warning: string | null;
  confirmedCount: number;
  requiredCount: number;
  latestQuote: QuoteScreenshot | null;
};

export type OffAppDetectionResult = {
  shouldWarn: boolean;
  triggered: boolean;
  matchedTerms: string[];
  warning: string | null;
  severity: RiskFlag["severity"];
};

export type SettlementItem = {
  id: string;
  settlementId: string;
  podMemberId: string | null;
  userId: string | null;
  itemType: SettlementItemType;
  direction: SettlementItemDirection;
  amountCents: MoneyCents;
  reasonCode: string;
  createdAt: string;
};

export type Settlement = {
  id: string;
  podId: string;
  settlementState: SettlementState;
  version: number;
  approvedFareCents: MoneyCents;
  verifiedFareCents: MoneyCents;
  billableSeatCount: number;
  totalPlatformFeeCents: MoneyCents;
  hostReimbursementCents: MoneyCents;
  hostRewardCents: MoneyCents;
  roundingPolicy: string;
  disputeDeadlineAt: string | null;
  adminReviewRequired: boolean;
  items: SettlementItem[];
  createdAt: string;
  finalizedAt: string | null;
  updatedAt: string;
};

export type HostReimbursement = {
  id: string;
  podId: string;
  settlementId: string;
  hostUserId: string;
  fareReimbursementCents: MoneyCents;
  hostRewardCents: MoneyCents;
  adjustmentCents: MoneyCents;
  totalTransferCents: MoneyCents;
  payoutState: HostPayoutState;
  externalTransferId: string | null;
  scheduledAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SettlementResult = {
  settlement: Settlement;
  hostReimbursement: HostReimbursement;
  auditEvents: AuditEvent[];
};

export type TransitionResult<T> = {
  value: T;
  auditEvents: AuditEvent[];
  riskFlags: RiskFlag[];
};

const verifiedRank: Record<VerificationStatus, number> = {
  NONE: 0,
  EMAIL_VERIFIED: 1,
  PHONE_VERIFIED: 2,
  COMMUNITY_VERIFIED: 3,
  ID_VERIFIED: 4,
};

const bookingAllowedStates: PodLifecycleState[] = [
  "FORMING",
  "PAYMENT_LOCKING",
  "LOCKED",
  "HOST_CAN_BOOK",
  "HOST_REPLACEMENT_NEEDED",
];

const offAppWarningCopy =
  "Off-app payments are not protected. RidePod cannot help with refunds, max-charge disputes, receipt verification, or host reimbursement if payment happens outside the app.";

const offAppPatterns: Array<{ label: string; pattern: RegExp; highRisk?: boolean }> = [
  { label: "Venmo", pattern: /\bvenmo\b/i },
  { label: "Zelle", pattern: /\bzelle\b/i },
  { label: "Cash App", pattern: /\bcash\s*app\b|\bcashapp\b|\$cashtag\b/i },
  { label: "PayPal", pattern: /\bpaypal\b/i },
  { label: "cash", pattern: /\bcash\b/i },
  { label: "pay me", pattern: /\bpay\s+me\b/i },
  { label: "send me", pattern: /\bsend\s+me\b/i },
  { label: "transfer", pattern: /\btransfer\b|\bbank\s+transfer\b/i },
  { label: "direct payment", pattern: /\bdirect\s+payment\b|\bpay\s+direct(?:ly)?\b/i, highRisk: true },
  { label: "Apple Cash", pattern: /\bapple\s+cash\b/i },
  { label: "outside RidePod", pattern: /\boutside\s+ridepod\b/i, highRisk: true },
  { label: "off app", pattern: /\boff[-\s]?app\b/i, highRisk: true },
];

const paymentContextPattern =
  /\b(?:venmo|zelle|cash\s*app|cashapp|paypal|cash|pay(?:ment)?|send|transfer|bank\s+transfer|apple\s+cash|outside\s+ridepod|off[-\s]?app|direct(?:ly)?)\b/i;
const phoneNumberPattern = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const paymentHandlePattern = /(?:^|\s)@[\w.-]{3,}/;

export function cents(dollars: number) {
  return Math.round(dollars * 100);
}

export function formatCents(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function makeAuditEvent(
  eventType: AuditEventType,
  payload: {
    podId?: string | null;
    userId?: string | null;
    eventPayload?: Record<string, unknown>;
    createdAt?: string;
  } = {},
): AuditEvent {
  const createdAt = payload.createdAt ?? new Date().toISOString();

  return {
    id: `${eventType.toLowerCase()}-${createdAt}`,
    podId: payload.podId ?? null,
    userId: payload.userId ?? null,
    eventType,
    eventPayload: payload.eventPayload ?? {},
    createdAt,
  };
}

export function getSafetyBadges(pod: Pick<ProtectedPod, "genderMode" | "accessMode">) {
  const badges = [getGenderModeLabel(pod.genderMode)];
  if (pod.accessMode !== "OPEN") badges.push(getAccessModeLabel(pod.accessMode));

  return badges;
}

export function checkPodEligibility(
  user: ProtectedUser,
  pod: Pick<
    ProtectedPod,
    "genderMode" | "accessMode" | "communityId" | "inviteCode" | "minTrustScore"
  >,
  options: EligibilityOptions = {},
): EligibilityResult {
  const reasons: string[] = [];

  if (options.adminOverride) {
    return {
      eligible: true,
      reasons: ["Admin override applied."],
      blockingReason: null,
      requiredAction: null,
    };
  }

  if (user.riskStatus === "SUSPENDED") {
    return blocked("Your account is suspended for protected pods.", "CONTACT_SUPPORT");
  }

  if (user.riskStatus === "RESTRICTED") {
    return blocked("Your account is restricted for protected pods.", "CONTACT_SUPPORT");
  }

  if (pod.genderMode === "WOMEN_ONLY") {
    if (user.genderIdentity !== "FEMALE") {
      return blocked(
        "This is a Women-only pod. Your profile is not eligible for this pod.",
        null,
      );
    }

    if (!user.genderVerifiedAt) {
      return blocked(
        "This Women-only pod requires gender verification before payment.",
        "GENDER_VERIFICATION_REQUIRED",
      );
    }

    reasons.push("Women-only eligibility passed.");
  } else {
    reasons.push("Mixed pod.");
  }

  if (pod.accessMode === "VERIFIED_ONLY" && verifiedRank[user.verificationStatus] < verifiedRank.PHONE_VERIFIED) {
    return blocked("This pod requires verified users.", "PHONE_VERIFICATION_REQUIRED");
  }

  if (pod.accessMode === "COMMUNITY_ONLY") {
    const hasMatchingCommunity = Boolean(pod.communityId && user.communityId === pod.communityId);

    if (!hasMatchingCommunity) {
      return blocked("This pod is limited to members of this community.", "COMMUNITY_VERIFICATION_REQUIRED");
    }
  }

  if (pod.accessMode === "HIGH_TRUST_ONLY") {
    const threshold = pod.minTrustScore ?? 4.5;
    if (user.trustScore < threshold || user.noShowCount > 0 || user.riskStatus !== "NORMAL") {
      return blocked("This pod requires a higher trust score.", "TRUST_SCORE_TOO_LOW");
    }
  }

  if (
    pod.accessMode === "INVITE_ONLY" &&
    !options.hasInviteMembership &&
    (!pod.inviteCode || options.inviteCode !== pod.inviteCode)
  ) {
    return blocked("This pod is invite-only.", "VALID_INVITE_REQUIRED");
  }

  return {
    eligible: true,
    reasons: reasons.length ? reasons : ["Eligibility passed."],
    blockingReason: null,
    requiredAction: null,
  };
}

export function checkHostPodCreationEligibility(
  host: ProtectedUser,
  pod: Pick<
    ProtectedPod,
    "genderMode" | "accessMode" | "communityId" | "inviteCode" | "minTrustScore"
  >,
  options: EligibilityOptions & { hostIsRiding?: boolean } = {},
): EligibilityResult {
  if (options.hostIsRiding === false) {
    if (options.adminOverride) {
      return {
        eligible: true,
        reasons: ["Admin override applied."],
        blockingReason: null,
        requiredAction: null,
      };
    }

    if (host.riskStatus === "SUSPENDED") {
      return blocked("Your account is suspended for protected pods.", "CONTACT_SUPPORT");
    }

    if (host.riskStatus === "RESTRICTED") {
      return blocked("Your account is restricted for protected pods.", "CONTACT_SUPPORT");
    }

    return {
      eligible: true,
      reasons: ["Host is not riding in this pod."],
      blockingReason: null,
      requiredAction: null,
    };
  }

  return checkPodEligibility(host, pod, options);
}

export function isPaymentAuthorized(member: Pick<ProtectedPodMember, "paymentState">) {
  return ["AUTHORIZED", "LOCKED_IN", "CAPTURE_PENDING", "CAPTURED"].includes(member.paymentState);
}

export function isMemberPaymentConfirmed(member: Pick<ProtectedPodMember, "memberState" | "paymentState">) {
  return (
    ["AUTHORIZED", "LOCKED_IN", "CAPTURED"].includes(member.paymentState) &&
    ["CONFIRMED", "LOCKED"].includes(member.memberState)
  );
}

export function isConfirmedParticipant(member: ProtectedPodMember) {
  return (
    ["CONFIRMED", "LOCKED", "COMPLETED"].includes(member.memberState) &&
    isPaymentAuthorized(member) &&
    member.eligibilityPassed
  );
}

export function getActiveMembers(pod: Pick<ProtectedPod, "members">) {
  return pod.members.filter(
    (member) => !["CANCELED", "REMOVED"].includes(member.memberState),
  );
}

export function getConfirmedMembers(pod: Pick<ProtectedPod, "members">) {
  return getActiveMembers(pod).filter(isConfirmedParticipant);
}

export function getLatestFreshQuote(pod: Pick<ProtectedPod, "quotes">) {
  return [...pod.quotes]
    .filter((quote) => quote.isFresh && quote.reviewState !== "EXPIRED")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null;
}

export function canHostBook(
  hostUserId: string,
  pod: ProtectedPod,
  options: { now?: string; adminOverride?: boolean } = {},
): BookingPermission {
  const reasons: string[] = [];
  const currentHostId = pod.replacementHostUserId ?? pod.hostUserId;
  const latestQuote = getLatestFreshQuote(pod);
  const confirmedCount = getConfirmedMembers(pod).reduce((sum, member) => sum + member.seatCount, 0);
  const activeMembers = getActiveMembers(pod);

  if (hostUserId !== currentHostId) reasons.push("Only the current host can book.");
  if (!bookingAllowedStates.includes(pod.lifecycleState)) reasons.push("Pod lifecycle does not allow booking.");
  if (pod.adminReviewRequired) reasons.push("Pod is on admin review hold.");
  if (confirmedCount < pod.minSeatsToBook) {
    reasons.push(`Waiting for participants: ${confirmedCount}/${pod.minSeatsToBook} authorized.`);
  }
  if (activeMembers.some((member) => !isPaymentAuthorized(member))) {
    reasons.push("All active participants must be payment-authorized.");
  }
  if (!latestQuote) reasons.push("Upload a fresh quote screenshot before booking.");
  if (latestQuote && !["AUTO_APPROVED", "QUOTE_APPROVED"].includes(latestQuote.reviewState)) {
    reasons.push("Quote needs approval before protected booking.");
  }

  const approvedMax = pod.higherMaxApprovedCents ?? pod.approvedMaxTotalFareCents;
  if (latestQuote && latestQuote.quotedFareCents > approvedMax) {
    reasons.push("Quote is above approved max. Riders must approve a higher max.");
  }

  if (pod.bookingDeadlineAt && options.now && options.now > pod.bookingDeadlineAt && !options.adminOverride) {
    reasons.push("Booking deadline passed.");
  }

  return {
    canBook: reasons.length === 0,
    reasons,
    warning:
      reasons.length > 0
        ? "You can book at your own risk, but this ride is not RidePod-protected until participants are payment-authorized. RidePod cannot guarantee reimbursement for unconfirmed seats."
        : null,
    confirmedCount,
    requiredCount: pod.minSeatsToBook,
    latestQuote,
  };
}

export function recomputePodLockState(pod: ProtectedPod): TransitionResult<ProtectedPod> {
  const auditEvents: AuditEvent[] = [];
  const permission = canHostBook(pod.replacementHostUserId ?? pod.hostUserId, pod);
  const confirmedSeats = permission.confirmedCount;
  let lifecycleState = pod.lifecycleState;
  let bookingState = pod.bookingState;

  if (["CANCELED", "EXPIRED", "ADMIN_REVIEW", "DISPUTE_HOLD", "RIDE_BOOKED"].includes(lifecycleState)) {
    return { value: pod, auditEvents, riskFlags: [] };
  }

  if (permission.canBook) {
    lifecycleState = "HOST_CAN_BOOK";
    bookingState = "CAN_BOOK";
    auditEvents.push(
      makeAuditEvent("HOST_CAN_BOOK", {
        podId: pod.id,
        userId: pod.replacementHostUserId ?? pod.hostUserId,
        eventPayload: { confirmedSeats },
      }),
    );
  } else if (confirmedSeats >= pod.minSeatsToBook) {
    lifecycleState = "LOCKED";
    if (pod.lifecycleState !== "LOCKED") {
      auditEvents.push(makeAuditEvent("POD_LOCKED", { podId: pod.id, eventPayload: { confirmedSeats } }));
    }
  } else if (confirmedSeats > 0) {
    lifecycleState = "PAYMENT_LOCKING";
  } else {
    lifecycleState = "FORMING";
  }

  return {
    value: { ...pod, lifecycleState, bookingState, updatedAt: new Date().toISOString() },
    auditEvents,
    riskFlags: [],
  };
}

export function uploadQuoteScreenshot(
  pod: ProtectedPod,
  input: Omit<QuoteScreenshot, "id" | "podId" | "submittedAt" | "reviewState" | "reviewedByAdminId" | "adminNotes" | "isFresh"> & {
    submittedAt?: string;
  },
): TransitionResult<ProtectedPod> {
  const submittedAt = input.submittedAt ?? new Date().toISOString();
  const reviewState: QuoteReviewState =
    input.quotedFareCents <= pod.approvedMaxTotalFareCents ? "AUTO_APPROVED" : "NEEDS_APPROVAL";
  const quote: QuoteScreenshot = {
    ...input,
    id: `quote-${pod.id}-${pod.quotes.length + 1}`,
    podId: pod.id,
    submittedAt,
    reviewState,
    reviewedByAdminId: null,
    adminNotes: null,
    isFresh: true,
  };
  const withQuote: ProtectedPod = {
    ...pod,
    quotes: [...pod.quotes.map((existing) => ({ ...existing, isFresh: false })), quote],
    bookingState: reviewState === "AUTO_APPROVED" ? "QUOTE_APPROVED" : "QUOTE_SUBMITTED",
  };
  const recomputed = recomputePodLockState(withQuote);
  const auditEvents = [
    makeAuditEvent("QUOTE_UPLOADED", {
      podId: pod.id,
      userId: input.hostUserId,
      eventPayload: { providerName: input.providerName, quotedFareCents: input.quotedFareCents },
    }),
    makeAuditEvent(reviewState === "AUTO_APPROVED" ? "QUOTE_APPROVED" : "QUOTE_ABOVE_MAX", {
      podId: pod.id,
      userId: input.hostUserId,
      eventPayload: { approvedMaxTotalFareCents: pod.approvedMaxTotalFareCents },
    }),
    ...recomputed.auditEvents,
  ];

  return { value: recomputed.value, auditEvents, riskFlags: [] };
}

export function authorizeSeat(pod: ProtectedPod, user: ProtectedUser): TransitionResult<ProtectedPod> {
  const eligibility = checkPodEligibility(user, pod);
  if (!eligibility.eligible) {
    return {
      value: pod,
      auditEvents: [
        makeAuditEvent("ELIGIBILITY_FAILED", {
          podId: pod.id,
          userId: user.id,
          eventPayload: { blockingReason: eligibility.blockingReason },
        }),
      ],
      riskFlags: [],
    };
  }

  const existingMember = pod.members.find((member) => member.userId === user.id);
  const updatedMembers = existingMember
    ? pod.members.map((member) =>
        member.userId === user.id
          ? {
              ...member,
              memberState: "CONFIRMED" as MemberState,
              paymentState: "AUTHORIZED" as PaymentState,
              eligibilityPassed: true,
              lockedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : member,
      )
    : [
        ...pod.members,
        {
          id: `pm-${pod.id}-${user.id}`,
          podId: pod.id,
          userId: user.id,
          role: "RIDER" as MemberRole,
          memberState: "CONFIRMED" as MemberState,
          paymentState: "AUTHORIZED" as PaymentState,
          seatCount: 1,
          maxChargeCents: Math.ceil(pod.approvedMaxTotalFareCents / pod.maxSeats) + pod.ridepodFeeCents,
          estimatedShareCents: Math.ceil(pod.estimatedTotalFareCents / pod.targetSeats),
          finalChargeCents: null,
          platformFeeCents: pod.ridepodFeeCents,
          cancellationLiabilityCents: null,
          noShowLiabilityCents: null,
          joinedAt: new Date().toISOString(),
          lockedAt: new Date().toISOString(),
          canceledAt: null,
          cancelReason: null,
          checkinState: "NOT_CHECKED_IN" as CheckinState,
          trustDelta: null,
          eligibilityPassed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

  const recomputed = recomputePodLockState({ ...pod, members: updatedMembers });

  return {
    value: recomputed.value,
    auditEvents: [
      makeAuditEvent("ELIGIBILITY_PASSED", { podId: pod.id, userId: user.id }),
      makeAuditEvent("PAYMENT_AUTHORIZED", {
        podId: pod.id,
        userId: user.id,
        eventPayload: { provider: "MOCK" },
      }),
      ...recomputed.auditEvents,
    ],
    riskFlags: [],
  };
}

export function confirmExternalBooking(hostUserId: string, pod: ProtectedPod): TransitionResult<ProtectedPod> {
  const permission = canHostBook(hostUserId, pod);
  if (!permission.canBook) {
    return {
      value: pod,
      auditEvents: [],
      riskFlags: [
        createRiskFlag({
          podId: pod.id,
          userId: hostUserId,
          riskType: "HOST_BOOKED_BEFORE_AUTH",
          severity: "HIGH",
          notes: permission.warning,
        }),
      ],
    };
  }

  return {
    value: {
      ...pod,
      lifecycleState: "RIDE_BOOKED",
      bookingState: "BOOKED",
      chatUnlockedAt: new Date().toISOString(),
      detailsUnlockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    auditEvents: [
      makeAuditEvent("HOST_BOOKED_EXTERNAL_RIDE", {
        podId: pod.id,
        userId: hostUserId,
        eventPayload: { protectedBooking: true },
      }),
    ],
    riskFlags: [],
  };
}

export function cancelHostBeforeBooking(
  hostUserId: string,
  pod: ProtectedPod,
  reason: string,
): TransitionResult<ProtectedPod> {
  const now = new Date().toISOString();
  const members = pod.members.map((member) =>
    member.userId === hostUserId && member.role === "HOST"
      ? { ...member, memberState: "CANCELED" as MemberState, canceledAt: now, cancelReason: reason }
      : member,
  );

  return {
    value: {
      ...pod,
      members,
      lifecycleState: "HOST_REPLACEMENT_NEEDED",
      bookingState: "CANCELED_BY_HOST",
      originalHostUserId: pod.hostUserId,
      hostReplacementStartedAt: now,
      updatedAt: now,
    },
    auditEvents: [
      makeAuditEvent("HOST_CANCELED_BEFORE_BOOKING", { podId: pod.id, userId: hostUserId, eventPayload: { reason } }),
      makeAuditEvent("HOST_REPLACEMENT_STARTED", { podId: pod.id, userId: hostUserId }),
    ],
    riskFlags: [],
  };
}

export function cancelHostAfterBooking(
  hostUserId: string,
  pod: ProtectedPod,
  reason: string,
): TransitionResult<ProtectedPod> {
  const now = new Date().toISOString();

  return {
    value: {
      ...pod,
      lifecycleState: "ADMIN_REVIEW",
      bookingState: "CANCELED_BY_HOST",
      adminReviewRequired: true,
      updatedAt: now,
    },
    auditEvents: [
      makeAuditEvent("HOST_CANCELED_AFTER_BOOKING", { podId: pod.id, userId: hostUserId, eventPayload: { reason } }),
    ],
    riskFlags: [
      createRiskFlag({
        podId: pod.id,
        userId: hostUserId,
        riskType: "HOST_CANCELED_AFTER_BOOKING",
        severity: "HIGH",
        notes: "Host cancellation after booking requires admin reimbursement review.",
      }),
    ],
  };
}

export function acceptReplacementHost(
  user: ProtectedUser,
  pod: ProtectedPod,
): TransitionResult<ProtectedPod> {
  const member = pod.members.find((candidate) => candidate.userId === user.id);
  const eligibility = checkPodEligibility(user, pod);
  const canAccept = Boolean(member && isConfirmedParticipant(member) && eligibility.eligible);

  if (!canAccept) {
    return {
      value: pod,
      auditEvents: [
        makeAuditEvent("ELIGIBILITY_FAILED", {
          podId: pod.id,
          userId: user.id,
          eventPayload: { blockingReason: eligibility.blockingReason ?? "Only confirmed eligible participants can become replacement host." },
        }),
      ],
      riskFlags: [],
    };
  }

  const now = new Date().toISOString();
  const members = pod.members.map((candidate) =>
    candidate.userId === user.id ? { ...candidate, role: "REPLACEMENT_HOST" as MemberRole, updatedAt: now } : candidate,
  );

  return {
    value: {
      ...pod,
      members,
      replacementHostUserId: user.id,
      bookingState: "QUOTE_ALLOWED",
      quotes: pod.quotes.map((quote) => ({ ...quote, isFresh: false })),
      updatedAt: now,
    },
    auditEvents: [
      makeAuditEvent("REPLACEMENT_HOST_ACCEPTED", {
        podId: pod.id,
        userId: user.id,
        eventPayload: { freshQuoteRequired: true },
      }),
    ],
    riskFlags: [],
  };
}

export function detectOffAppPaymentMessage(messageText: string): OffAppDetectionResult {
  const matchedTerms = offAppPatterns
    .filter(({ pattern }) => pattern.test(messageText))
    .map(({ label }) => label);
  const hasPaymentContext = paymentContextPattern.test(messageText);

  if (hasPaymentContext && phoneNumberPattern.test(messageText)) {
    matchedTerms.push("phone number");
  }

  if (hasPaymentContext && paymentHandlePattern.test(messageText)) {
    matchedTerms.push("payment handle");
  }

  const uniqueMatchedTerms = [...new Set(matchedTerms)];
  const hasHighRiskTerm = offAppPatterns.some(
    ({ label, pattern, highRisk }) => Boolean(highRisk && uniqueMatchedTerms.includes(label) && pattern.test(messageText)),
  );
  const severity =
    hasHighRiskTerm || uniqueMatchedTerms.length >= 3
      ? "HIGH"
      : uniqueMatchedTerms.length > 1
        ? "MEDIUM"
        : "LOW";

  return {
    shouldWarn: uniqueMatchedTerms.length > 0,
    triggered: uniqueMatchedTerms.length > 0,
    matchedTerms: uniqueMatchedTerms,
    warning: uniqueMatchedTerms.length > 0 ? offAppWarningCopy : null,
    severity,
  };
}

export function createOffAppWarningEvent(
  podId: string,
  userId: string,
  messageText: string,
): { detection: OffAppDetectionResult; auditEvent: AuditEvent | null; riskFlag: RiskFlag | null } {
  const detection = detectOffAppPaymentMessage(messageText);

  return {
    detection,
    auditEvent: detection.triggered
      ? makeAuditEvent("OFF_APP_WARNING_TRIGGERED", {
          podId,
          userId,
          eventPayload: { matchedTerms: detection.matchedTerms },
        })
      : null,
    riskFlag: detection.triggered
      ? createRiskFlag({
          podId,
          userId,
          riskType: "OFF_APP_PAYMENT_LANGUAGE",
          severity: detection.severity,
          notes: detection.matchedTerms.join(", "),
        })
      : null,
  };
}

export function calculateSettlement(pod: ProtectedPod, receipt: Receipt): SettlementResult {
  const now = new Date().toISOString();
  const verifiedFareCents = receipt.fareTotalCents;
  const approvedFareCents = pod.higherMaxApprovedCents ?? pod.approvedMaxTotalFareCents;
  const eligibleFareCents = Math.min(verifiedFareCents, approvedFareCents);
  const billableMembers = pod.members
    .filter((member) => {
      if (member.memberState === "COMPLETED") return true;
      if (member.memberState === "NO_SHOW" && !member.replacedByMemberId) return true;
      if (member.memberState === "CANCELED" && member.cancellationLiabilityCents && !member.replacedByMemberId) return true;
      return false;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const billableSeatCount = billableMembers.reduce((sum, member) => sum + member.seatCount, 0);
  const baseShare = billableSeatCount > 0 ? Math.floor(eligibleFareCents / billableSeatCount) : 0;
  let remainder = billableSeatCount > 0 ? eligibleFareCents % billableSeatCount : 0;
  const settlementId = `settlement-${pod.id}-v1`;
  const items: SettlementItem[] = [];

  billableMembers.forEach((member) => {
    const remainderCents = remainder > 0 ? 1 : 0;
    remainder -= remainderCents;
    const fareShareCents = (baseShare * member.seatCount) + remainderCents;
    const cappedFareShare = Math.min(fareShareCents, Math.max(0, member.maxChargeCents - member.platformFeeCents));
    items.push({
      id: `${settlementId}-${member.id}-fare`,
      settlementId,
      podMemberId: member.id,
      userId: member.userId,
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: cappedFareShare,
      reasonCode: "VERIFIED_RECEIPT_SHARE",
      createdAt: now,
    });
    items.push({
      id: `${settlementId}-${member.id}-fee`,
      settlementId,
      podMemberId: member.id,
      userId: member.userId,
      itemType: "PLATFORM_FEE",
      direction: "PLATFORM_REVENUE",
      amountCents: member.platformFeeCents,
      reasonCode: "RIDEPOD_FEE",
      createdAt: now,
    });
  });

  const totalPlatformFeeCents = items
    .filter((item) => item.itemType === "PLATFORM_FEE")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const adminReviewRequired = receipt.verificationState !== "VERIFIED" || verifiedFareCents > approvedFareCents || pod.adminReviewRequired;
  const hostReimbursementCents = adminReviewRequired ? eligibleFareCents : eligibleFareCents;
  const settlement: Settlement = {
    id: settlementId,
    podId: pod.id,
    settlementState: adminReviewRequired ? "ADMIN_REVIEW" : "DRAFT",
    version: 1,
    approvedFareCents,
    verifiedFareCents,
    billableSeatCount,
    totalPlatformFeeCents,
    hostReimbursementCents,
    hostRewardCents: 0,
    roundingPolicy: "stable-member-createdAt-ascending",
    disputeDeadlineAt: null,
    adminReviewRequired,
    items,
    createdAt: now,
    finalizedAt: null,
    updatedAt: now,
  };
  const hostReimbursement: HostReimbursement = {
    id: `host-reimbursement-${pod.id}`,
    podId: pod.id,
    settlementId,
    hostUserId: pod.replacementHostUserId ?? pod.hostUserId,
    fareReimbursementCents: eligibleFareCents,
    hostRewardCents: 0,
    adjustmentCents: 0,
    totalTransferCents: hostReimbursementCents,
    payoutState: adminReviewRequired ? "HELD_FOR_REVIEW" : "PENDING",
    externalTransferId: null,
    scheduledAt: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    settlement,
    hostReimbursement,
    auditEvents: [
      makeAuditEvent("SETTLEMENT_CREATED", {
        podId: pod.id,
        userId: pod.hostUserId,
        eventPayload: { eligibleFareCents, verifiedFareCents, approvedFareCents },
      }),
    ],
  };
}

export function getMoneySafetySnapshot(pod: ProtectedPod) {
  const permission = canHostBook(pod.replacementHostUserId ?? pod.hostUserId, pod);
  const activeMembers = getActiveMembers(pod);
  const confirmedSeats = getConfirmedMembers(pod).reduce((sum, member) => sum + member.seatCount, 0);
  const latestQuote = getLatestFreshQuote(pod);
  const chatUnlocked = activeMembers.some(isPaymentAuthorized) && Boolean(pod.chatUnlockedAt ?? confirmedSeats > 0);

  return {
    safetyBadges: getSafetyBadges(pod),
    confirmedSeats,
    activeSeats: activeMembers.reduce((sum, member) => sum + member.seatCount, 0),
    targetSeats: pod.targetSeats,
    minSeatsToBook: pod.minSeatsToBook,
    latestQuote,
    canBook: permission.canBook,
    bookingReasons: permission.reasons,
    moneyStatus: permission.canBook
      ? "Quote approved - host can book"
      : confirmedSeats >= pod.minSeatsToBook
        ? "All required participants are authorized"
        : `${confirmedSeats}/${pod.minSeatsToBook} participants payment-authorized`,
    hostActionNeeded: permission.canBook
      ? "Protected booking enabled"
      : latestQuote
        ? "Waiting for payment authorization"
        : "Fresh quote screenshot needed",
    chatUnlocked,
    exactDetailsUnlocked: chatUnlocked,
    timeline: [
      { label: "Pod forming", complete: pod.lifecycleState !== "DRAFT" },
      { label: "Payment locking", complete: confirmedSeats > 0 },
      { label: "Group locked", complete: confirmedSeats >= pod.minSeatsToBook },
      { label: "Quote uploaded", complete: Boolean(latestQuote) },
      { label: "Host can book", complete: permission.canBook },
      { label: "Ride booked", complete: ["RIDE_BOOKED", "PICKUP_WINDOW", "IN_PROGRESS", "COMPLETED", "RECEIPT_PENDING", "SETTLEMENT_PENDING", "SETTLED", "CLOSED"].includes(pod.lifecycleState) },
      { label: "Pickup", complete: ["PICKUP_WINDOW", "IN_PROGRESS", "COMPLETED", "RECEIPT_PENDING", "SETTLEMENT_PENDING", "SETTLED", "CLOSED"].includes(pod.lifecycleState) },
      { label: "Receipt uploaded", complete: pod.receipts.some((receipt) => receipt.verificationState !== "NOT_SUBMITTED") },
      { label: "Settlement", complete: ["SETTLED", "CLOSED"].includes(pod.lifecycleState) },
    ],
  };
}

function blocked(blockingReason: string, requiredAction: string | null): EligibilityResult {
  return {
    eligible: false,
    reasons: [blockingReason],
    blockingReason,
    requiredAction,
  };
}

function createRiskFlag({
  podId,
  userId,
  riskType,
  severity,
  notes,
}: {
  podId: string | null;
  userId: string;
  riskType: RiskType;
  severity: RiskFlag["severity"];
  notes: string | null;
}): RiskFlag {
  const now = new Date().toISOString();

  return {
    id: `risk-${riskType.toLowerCase()}-${now}`,
    podId,
    userId,
    riskType,
    severity,
    status: "OPEN",
    notes,
    createdAt: now,
    updatedAt: now,
  };
}
