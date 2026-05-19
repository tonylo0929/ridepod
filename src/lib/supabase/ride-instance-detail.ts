import "server-only";

import {
  getAccessibleAdminReviewCasesForRideInstance,
  getPodById,
  getPodEventsForRideInstance,
  getPodMembersForPod,
  getProofsForRideInstance,
  getRideInstanceById,
  getSettlementForRideInstance,
  getSettlementItemsForSettlement,
} from "@/lib/supabase/queries";
import {
  currentUserId,
  getRecurringRideInstance,
  type PodMember,
  type RecurringRideInstancePreview,
  type RecurringRideStatus,
  type RideInstanceProofStatus,
  type RideInstanceProofType,
  type RideInstanceSettlementState,
  type RidePod,
} from "@/lib/mock-data";
import type {
  RidePodAdminReviewCaseRow,
  RidePodEventRow,
  RidePodMemberRow,
  RidePodPodRow,
  RidePodProofRow,
  RidePodRideInstanceRow,
  RidePodSettlementItemRow,
  RidePodSettlementRow,
} from "@/lib/supabase/types";

export type RideInstanceDetailSource = "supabase" | "mock";
export type RideInstanceStatusTone = "gold" | "green" | "purple" | "orange" | "blue" | "gray" | "neutral";

export type RideInstanceProofSummary = {
  quoteProof: RidePodProofRow | null;
  receiptProof: RidePodProofRow | null;
  meterProof: RidePodProofRow | null;
};

export type RideInstanceSettlementSummary = {
  settlementId: string | null;
  settlementState: string | null;
  verifiedFareCents: number | null;
  bookingFareCapCents: number | null;
  billableGuestCount: number | null;
  fareShareCents: number | null;
  platformFeeCents: number | null;
  hostReimbursementCents: number | null;
  disputeDeadlineAt: string | null;
  finalizedAt: string | null;
  items: RidePodSettlementItemRow[];
};

export type RideInstanceDisputeSummary = {
  openAdminReviewCaseCount: number;
  highestSeverity: string | null;
  disputeOrHoldStatus: string | null;
  events: RidePodEventRow[];
};

export type RideInstanceMemberContext = {
  currentUserRole: "HOST" | "GUEST" | "UNKNOWN";
  currentMemberState: string | null;
  maxChargeCents: number | null;
  finalChargeCents: number | null;
};

export type SupabaseRideInstanceDetailData = {
  rideInstance: RidePodRideInstanceRow;
  pod: RidePodPodRow;
  members: RidePodMemberRow[];
  proofs: RidePodProofRow[];
  settlement: RidePodSettlementRow | null;
  settlementItems: RidePodSettlementItemRow[];
  adminReviewCases: RidePodAdminReviewCaseRow[];
  events: RidePodEventRow[];
  memberContext: RideInstanceMemberContext;
};

export type RideInstanceDetailViewModel = {
  id: string;
  podId: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  legLabel: string;
  routeLabel: string;
  rideOptionLabel: string;
  statusLabel: string;
  statusTone: RideInstanceStatusTone;
  nextActionLabel: string;
  nextActionTarget: string;
  guestsLockedLabel: string;
  bookingFareCapLabel: string;
  proofSummary: RideInstanceProofSummary;
  settlementSummary: RideInstanceSettlementSummary;
  disputeSummary: RideInstanceDisputeSummary;
  memberContext: RideInstanceMemberContext;
  isRideAppFixedQuote: boolean;
  isTaxiMeter: boolean;
  canUploadQuote: boolean;
  canUploadReceipt: boolean;
  canUploadMeterProof: boolean;
  canViewSettlement: boolean;
  canReportDispute: boolean;
};

export type RideInstanceDetailResult = {
  source: RideInstanceDetailSource;
  fallbackNote: string | null;
  data: SupabaseRideInstanceDetailData | null;
  viewModel: RideInstanceDetailViewModel;
  pod: RidePod;
  rideInstance: RecurringRideInstancePreview;
};

const severityRank: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function formatHkdCents(cents: number | null | undefined) {
  if (typeof cents !== "number") return "HK$0.00";
  return `HK$${(cents / 100).toFixed(2)}`;
}

function safeDate(dateValue: string) {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(dateValue: string) {
  const date = safeDate(dateValue);
  if (!date) return "Date pending";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeLabel(dateValue: string) {
  const date = safeDate(dateValue);
  if (!date) return "Time pending";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function splitRoute(routeLabel: string, pickupPoint?: string | null, dropoffPoint?: string | null) {
  const [fromRoute, toRoute] = routeLabel.split(/\s*(?:->|→)\s*/);

  return {
    fromLabel: pickupPoint || fromRoute || routeLabel,
    toLabel: dropoffPoint || toRoute || routeLabel,
  };
}

function normalizeLegType(legType: string | null | undefined): RecurringRideInstancePreview["legType"] {
  return legType?.toUpperCase() === "RETURN" ? "return" : "outbound";
}

function getLegLabel(legType: string | null | undefined) {
  return normalizeLegType(legType) === "return" ? "Return" : "Outbound";
}

function normalizeProofStatus(status: string | null | undefined): RideInstanceProofStatus {
  if (
    status === "NEEDED" ||
    status === "SUBMITTED" ||
    status === "UNDER_REVIEW" ||
    status === "APPROVED" ||
    status === "VERIFIED" ||
    status === "REJECTED" ||
    status === "NEEDS_MORE_INFO"
  ) {
    return status;
  }

  return "NOT_REQUIRED";
}

function latestProofByType(proofs: RidePodProofRow[], proofType: RideInstanceProofType) {
  return proofs.find((proof) => proof.proof_type === proofType) ?? null;
}

function isProofVerified(proof: RidePodProofRow | null) {
  return proof?.proof_status === "VERIFIED" || proof?.proof_status === "APPROVED";
}

function hasOpenDisputeWindow(settlement: RidePodSettlementRow | null) {
  if (!settlement?.dispute_deadline_at) return false;
  const deadline = safeDate(settlement.dispute_deadline_at);
  return Boolean(deadline && deadline.getTime() > Date.now());
}

function statusLabelFor(status: string, taxiMeter: boolean) {
  if (status === "WAITING_FOR_GUESTS") return "Waiting for guests";
  if (status === "QUOTE_NEEDED") return "Quote needed";
  if (status === "QUOTE_UNDER_REVIEW") return "Quote under review";
  if (status === "READY_TO_BOOK") return "Ready to book";
  if (status === "RIDE_BOOKED") return "Ride booked";
  if (status === "READY_FOR_TAXI_METER") return "Ready for taxi meter";
  if (status === "RECEIPT_NEEDED") return "Receipt needed";
  if (status === "METER_PROOF_NEEDED") return "Meter proof needed";
  if (status === "PROOF_UNDER_REVIEW") return "Proof under review";
  if (status === "SETTLEMENT_READY") return "Settlement ready";
  if (status === "DISPUTE_REVIEW") return "Dispute review";
  if (status === "SETTLEMENT_FINAL") return "Settlement final";
  if (status === "CLOSED") return "Closed";
  return taxiMeter ? "Ready for taxi meter" : "Quote needed";
}

function toneForStatus(status: string, taxiMeter: boolean): RideInstanceStatusTone {
  if (status === "QUOTE_NEEDED") return "gold";
  if (status === "READY_TO_BOOK" || status === "READY_FOR_TAXI_METER") return "green";
  if (status === "RIDE_BOOKED") return "purple";
  if (status === "RECEIPT_NEEDED" || status === "METER_PROOF_NEEDED" || status === "PROOF_UNDER_REVIEW") {
    return "orange";
  }
  if (status === "SETTLEMENT_READY" || status === "DISPUTE_REVIEW") return "blue";
  if (status === "SETTLEMENT_FINAL" || status === "CLOSED") return "gray";
  return taxiMeter ? "green" : "gold";
}

function mockStatusFor(
  status: string,
  taxiMeter: boolean,
  proofSummary: RideInstanceProofSummary,
): RecurringRideStatus {
  if (status === "WAITING_FOR_GUESTS") return "waiting_for_guests";
  if (status === "QUOTE_NEEDED") return "quote_needed";
  if (status === "QUOTE_UNDER_REVIEW") return "quote_under_review";
  if (status === "READY_TO_BOOK") return "ready_to_book";
  if (status === "RIDE_BOOKED") return "ride_booked";
  if (status === "READY_FOR_TAXI_METER") return "ready_for_taxi_meter";
  if (status === "RECEIPT_NEEDED") return "receipt_pending";
  if (status === "METER_PROOF_NEEDED") return "meter_proof_needed";
  if (status === "SETTLEMENT_READY" || status === "DISPUTE_REVIEW") return "settlement_ready";
  if (status === "SETTLEMENT_FINAL" || status === "CLOSED") return "completed";

  if (status === "PROOF_UNDER_REVIEW") {
    if (taxiMeter || proofSummary.meterProof) return "meter_proof_under_review";
    if (proofSummary.receiptProof) return "receipt_under_review";
    return "quote_under_review";
  }

  return taxiMeter ? "ready_for_taxi_meter" : "quote_needed";
}

function getPrimaryProof(
  taxiMeter: boolean,
  proofSummary: RideInstanceProofSummary,
): RidePodProofRow | null {
  if (taxiMeter) return proofSummary.meterProof;
  return proofSummary.receiptProof ?? proofSummary.quoteProof;
}

function getMemberContext(
  pod: RidePodPodRow,
  members: RidePodMemberRow[],
  currentUserIdValue: string | null,
): RideInstanceMemberContext {
  if (!currentUserIdValue) {
    return {
      currentUserRole: "UNKNOWN",
      currentMemberState: null,
      maxChargeCents: null,
      finalChargeCents: null,
    };
  }

  if (pod.host_user_id === currentUserIdValue) {
    return {
      currentUserRole: "HOST",
      currentMemberState: "HOST",
      maxChargeCents: null,
      finalChargeCents: null,
    };
  }

  const membership = members.find((member) => member.user_id === currentUserIdValue);

  return {
    currentUserRole: membership ? "GUEST" : "UNKNOWN",
    currentMemberState: membership?.member_state ?? null,
    maxChargeCents: membership?.max_charge_cents ?? null,
    finalChargeCents: membership?.final_charge_cents ?? null,
  };
}

function getHighestSeverity(cases: RidePodAdminReviewCaseRow[]) {
  return cases.reduce<string | null>((current, reviewCase) => {
    if (!current) return reviewCase.severity;
    return (severityRank[reviewCase.severity] ?? 0) > (severityRank[current] ?? 0) ? reviewCase.severity : current;
  }, null);
}

function getDisputeOrHoldStatus(cases: RidePodAdminReviewCaseRow[], settlement: RidePodSettlementRow | null) {
  const openCase = cases.find((reviewCase) => reviewCase.review_state !== "RESOLVED");
  if (openCase) return openCase.case_type;
  if (settlement?.settlement_state === "DISPUTE_HOLD" || settlement?.settlement_state === "ADMIN_REVIEW") {
    return settlement.settlement_state;
  }
  return null;
}

function getNextAction(
  status: string,
  taxiMeter: boolean,
  canUploadQuote: boolean,
  canUploadReceipt: boolean,
  canUploadMeterProof: boolean,
  canViewSettlement: boolean,
) {
  if (canUploadQuote) return "Upload quote";
  if (status === "READY_TO_BOOK") return "Mark booked";
  if (canUploadReceipt) return "Upload receipt";
  if (canUploadMeterProof) return "Upload meter proof";
  if (canViewSettlement) return "View settlement";
  if (status === "RIDE_BOOKED") return "Open chat";
  return taxiMeter ? "View ride" : "View ride";
}

function mapMembers(members: RidePodMemberRow[], pod: RidePodPodRow): PodMember[] {
  const mappedMembers = members.map<PodMember>((member) => ({
    userId: member.user_id ?? member.id,
    role: member.user_id === pod.host_user_id ? "host" : "member",
    paymentStatus:
      member.member_state === "AUTHORIZED" || member.member_state === "CONFIRMED" || member.member_state === "LOCKED"
        ? "authorized"
        : "not_started",
    attendanceStatus: member.member_state === "NO_SHOW" ? "no_show" : "confirmed",
    joinedAt: member.joined_at ?? "",
  }));

  if (pod.host_user_id && !mappedMembers.some((member) => member.userId === pod.host_user_id)) {
    mappedMembers.unshift({
      userId: pod.host_user_id,
      role: "host",
      paymentStatus: "authorized",
      attendanceStatus: "confirmed",
      joinedAt: pod.created_at ?? "",
    });
  }

  return mappedMembers;
}

export function mapSupabaseRideInstanceToDetailViewModel(
  data: SupabaseRideInstanceDetailData,
): {
  viewModel: RideInstanceDetailViewModel;
  pod: RidePod;
  rideInstance: RecurringRideInstancePreview;
} {
  const { rideInstance, pod, members, proofs, settlement, settlementItems, adminReviewCases, events, memberContext } =
    data;
  const isTaxiMeter = pod.ride_option === "TAXI_METER";
  const isRideAppFixedQuote = pod.ride_option === "RIDE_APP_FIXED_QUOTE";
  const proofSummary: RideInstanceProofSummary = {
    quoteProof: latestProofByType(proofs, "QUOTE_SCREENSHOT"),
    receiptProof: latestProofByType(proofs, "FINAL_RECEIPT"),
    meterProof: latestProofByType(proofs, "METER_PROOF"),
  };
  const primaryProof = getPrimaryProof(isTaxiMeter, proofSummary);
  const proofStatus = normalizeProofStatus(primaryProof?.proof_status);
  const lockedGuests = rideInstance.guests_locked_count ?? 0;
  const requiredGuests = rideInstance.required_guests_count;
  const enoughGuestsLocked = lockedGuests >= requiredGuests;
  const status = rideInstance.instance_status;
  const rideCompletedEnoughForProof =
    status === "RECEIPT_NEEDED" ||
    status === "METER_PROOF_NEEDED" ||
    status === "PROOF_UNDER_REVIEW" ||
    status === "SETTLEMENT_READY" ||
    status === "DISPUTE_REVIEW" ||
    status === "SETTLEMENT_FINAL" ||
    status === "CLOSED";
  const canUploadQuote = isRideAppFixedQuote && enoughGuestsLocked && !proofSummary.quoteProof;
  const canUploadReceipt = isRideAppFixedQuote && rideCompletedEnoughForProof && !proofSummary.receiptProof;
  const canUploadMeterProof = isTaxiMeter && rideCompletedEnoughForProof && !proofSummary.meterProof;
  const canViewSettlement = Boolean(settlement) || isProofVerified(primaryProof);
  const canReportDispute = hasOpenDisputeWindow(settlement);
  const statusLabel = statusLabelFor(status, isTaxiMeter);
  const statusTone = toneForStatus(status, isTaxiMeter);
  const nextActionLabel = getNextAction(
    status,
    isTaxiMeter,
    canUploadQuote,
    canUploadReceipt,
    canUploadMeterProof,
    canViewSettlement,
  );
  const { fromLabel, toLabel } = splitRoute(rideInstance.route_label, pod.pickup_point, pod.dropoff_point);
  const dateLabel = formatDateLabel(rideInstance.departure_at);
  const timeLabel = formatTimeLabel(rideInstance.departure_at);
  const routeLabel = `${fromLabel} -> ${toLabel}`;
  const settlementSummary: RideInstanceSettlementSummary = {
    settlementId: settlement?.id ?? null,
    settlementState: settlement?.settlement_state ?? null,
    verifiedFareCents: settlement?.verified_fare_cents ?? null,
    bookingFareCapCents: settlement?.booking_fare_cap_cents ?? rideInstance.booking_fare_cap_cents,
    billableGuestCount: settlement?.billable_guest_count ?? null,
    fareShareCents: settlement?.fare_share_cents ?? null,
    platformFeeCents: settlement?.platform_fee_cents ?? null,
    hostReimbursementCents: settlement?.host_reimbursement_cents ?? null,
    disputeDeadlineAt: settlement?.dispute_deadline_at ?? null,
    finalizedAt: settlement?.finalized_at ?? null,
    items: settlementItems,
  };
  const disputeSummary: RideInstanceDisputeSummary = {
    openAdminReviewCaseCount: adminReviewCases.filter((reviewCase) => reviewCase.review_state !== "RESOLVED").length,
    highestSeverity: getHighestSeverity(adminReviewCases),
    disputeOrHoldStatus: getDisputeOrHoldStatus(adminReviewCases, settlement),
    events,
  };
  const viewModel: RideInstanceDetailViewModel = {
    id: rideInstance.id,
    podId: pod.id,
    title: routeLabel,
    dateLabel,
    timeLabel,
    legLabel: getLegLabel(rideInstance.leg_type),
    routeLabel,
    rideOptionLabel: isTaxiMeter ? "Taxi meter" : "Ride app / fixed quote",
    statusLabel,
    statusTone,
    nextActionLabel,
    nextActionTarget: `/host?rideInstanceId=${encodeURIComponent(rideInstance.id)}`,
    guestsLockedLabel: `${lockedGuests} / ${requiredGuests} guests locked`,
    bookingFareCapLabel: formatHkdCents(rideInstance.booking_fare_cap_cents),
    proofSummary,
    settlementSummary,
    disputeSummary,
    memberContext,
    isRideAppFixedQuote,
    isTaxiMeter,
    canUploadQuote,
    canUploadReceipt,
    canUploadMeterProof,
    canViewSettlement,
    canReportDispute,
  };
  const mappedStatus = mockStatusFor(status, isTaxiMeter, proofSummary);
  const mappedProofType = primaryProof?.proof_type ?? (isTaxiMeter ? "METER_PROOF" : mappedStatus === "quote_needed" ? "QUOTE_SCREENSHOT" : "FINAL_RECEIPT");
  const mappedRideInstance: RecurringRideInstancePreview = {
    id: rideInstance.id,
    recurringTemplateId: pod.id,
    instanceDate: rideInstance.departure_at,
    displayDate: dateLabel,
    departureTime: timeLabel,
    legType: normalizeLegType(rideInstance.leg_type),
    originLabel: fromLabel,
    destinationLabel: toLabel,
    status: mappedStatus,
    proofType: mappedProofType,
    proofStatus,
    quotedFareCents: proofSummary.quoteProof?.amount_cents ?? undefined,
    bookingFareCapCents: rideInstance.booking_fare_cap_cents,
    finalFareCents: proofSummary.receiptProof?.amount_cents ?? proofSummary.meterProof?.amount_cents ?? settlement?.verified_fare_cents ?? undefined,
    receiptFareCents: proofSummary.receiptProof?.amount_cents ?? undefined,
    proofCertified: primaryProof?.certification_accepted ?? undefined,
    proofFileUrl: primaryProof?.file_url ?? null,
    proofFileName: primaryProof?.file_url?.split("/").pop() ?? null,
    proofContentType: primaryProof?.file_url?.toLowerCase().endsWith(".pdf") ? "application/pdf" : null,
    certificationTextVersion: primaryProof?.certification_text_version ?? undefined,
    submittedAt: primaryProof?.submitted_at ?? undefined,
    reviewedAt: primaryProof?.reviewed_at ?? undefined,
    settlementId: settlement?.id ?? undefined,
    settlementState: normalizeSettlementState(settlement?.settlement_state),
    rideCompletedAt: status === "SETTLEMENT_READY" || status === "SETTLEMENT_FINAL" ? rideInstance.updated_at ?? undefined : undefined,
    proofVerifiedAt: primaryProof?.reviewed_at ?? undefined,
    settlementReadyAt: settlement?.created_at ?? undefined,
    disputeWindowEndsAt: settlement?.dispute_deadline_at ?? undefined,
    disputeRaised: settlement?.settlement_state === "DISPUTE_HOLD" || settlement?.settlement_state === "ADMIN_REVIEW",
    platformFeeCents: settlement?.platform_fee_cents ?? undefined,
    hostReimbursementCents: settlement?.host_reimbursement_cents ?? undefined,
    payoutState: settlement?.settlement_state === "PAID" || settlement?.settlement_state === "CLOSED" ? "PAID" : "PENDING",
    disputeReason: disputeSummary.disputeOrHoldStatus,
    disputeNote: adminReviewCases[0]?.description ?? null,
  };
  const mappedPod: RidePod = {
    id: pod.id,
    type: pod.pod_type === "RECURRING" ? "recurring" : "scheduled",
    title: routeLabel,
    fromLabel,
    toLabel,
    pickupHub: pod.pickup_point ?? fromLabel,
    dropoffHub: pod.dropoff_point ?? toLabel,
    date: dateLabel,
    time: timeLabel,
    timeFlexibility: "+/- 15 min",
    recurringDays: pod.recurring_days ?? undefined,
    recurringPattern: pod.recurring_pattern === "BACK_AND_FORTH" ? "back_and_forth" : "one_way",
    recurringScheduleLine: pod.recurring_days?.length ? `Weekly on ${pod.recurring_days.join(", ")}` : undefined,
    outboundTime: timeLabel,
    returnTime: undefined,
    protectionStatus: statusLabel,
    upcomingRideInstances: [mappedRideInstance],
    vehicleType: isTaxiMeter ? "Taxi" : "Private Car",
    rideOption: isTaxiMeter ? "taxi_meter" : "ride_app_fixed_quote",
    maxFare: pod.booking_fare_cap_cents / 100,
    estimatedFare: (pod.current_estimate_cents ?? pod.booking_fare_cap_cents) / 100,
    estimatedShare: (pod.current_estimate_cents ?? pod.booking_fare_cap_cents) / Math.max(1, pod.ideal_pod_size) / 100,
    platformFee: (pod.minimum_platform_fee_cents ?? 600) / 100,
    seatsTotal: pod.ideal_pod_size,
    seatsFilled: lockedGuests,
    moneyStatus: mapPodMoneyStatus(mappedStatus, isTaxiMeter),
    status: mapPodStatus(mappedStatus),
    hostUserId: pod.host_user_id ?? "",
    backupHostUserId: pod.host_user_id ?? "",
    lockDeadline: "",
    cancellationDeadline: "",
    members: mapMembers(members, pod),
    waitlist: [],
  };

  return { viewModel, pod: mappedPod, rideInstance: mappedRideInstance };
}

function normalizeSettlementState(state: string | null | undefined): RideInstanceSettlementState | undefined {
  if (state === "DISPUTE_HOLD" || state === "ADMIN_REVIEW") return "DISPUTE_REVIEW";
  if (state === "FINALIZED") return "SETTLEMENT_FINAL";
  if (state === "PAYOUT_PENDING") return "PAYOUT_PENDING";
  if (state === "PAID" || state === "CLOSED") return "PAID";
  if (state === "DISPUTE_WINDOW" || state === "RIDER_NOTICE_SENT") return "SETTLEMENT_READY";
  return undefined;
}

function mapPodMoneyStatus(status: RecurringRideStatus, taxiMeter: boolean): RidePod["moneyStatus"] {
  if (status === "settlement_ready" || status === "completed") return "settlement_ready";
  if (status === "receipt_pending" || status === "meter_proof_needed") return "receipt_pending";
  if (status === "ride_booked") return "ride_booked";
  if (status === "ready_to_book" || status === "ready_for_taxi_meter") return "host_can_book";
  if (!taxiMeter && (status === "quote_under_review" || status === "receipt_under_review")) return "quote_approval_needed";
  return "waiting_for_riders";
}

function mapPodStatus(status: RecurringRideStatus): RidePod["status"] {
  if (status === "completed" || status === "settlement_ready") return "completed";
  if (status === "receipt_pending" || status === "ride_booked" || status === "meter_proof_needed") return "booked";
  if (status === "ready_to_book" || status === "ready_for_taxi_meter") return "host_booking";
  if (status === "waiting_for_guests" || status === "guests_locking") return "forming";
  return "locked";
}

async function tryOptional<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch {
    return fallback;
  }
}

export async function getRideInstanceDetail(
  rideInstanceId: string,
  currentUserIdValue: string | null = null,
): Promise<RideInstanceDetailResult | null> {
  try {
    const rideInstance = await getRideInstanceById(rideInstanceId);
    if (!rideInstance?.pod_id) return null;

    const pod = await getPodById(rideInstance.pod_id);
    if (!pod) return null;

    const [members, proofs, settlement, adminReviewCases, events] = await Promise.all([
      tryOptional(() => getPodMembersForPod(pod.id), []),
      tryOptional(() => getProofsForRideInstance(rideInstance.id), []),
      tryOptional(() => getSettlementForRideInstance(rideInstance.id), null),
      tryOptional(() => getAccessibleAdminReviewCasesForRideInstance(rideInstance.id), []),
      tryOptional(() => getPodEventsForRideInstance(rideInstance.id), []),
    ]);
    const settlementItems = settlement?.id
      ? await tryOptional(() => getSettlementItemsForSettlement(settlement.id), [])
      : [];
    const memberContext = getMemberContext(pod, members, currentUserIdValue);
    const data: SupabaseRideInstanceDetailData = {
      rideInstance,
      pod,
      members,
      proofs,
      settlement,
      settlementItems,
      adminReviewCases,
      events,
      memberContext,
    };
    const mapped = mapSupabaseRideInstanceToDetailViewModel(data);

    return {
      source: "supabase",
      fallbackNote: null,
      data,
      ...mapped,
    };
  } catch {
    return null;
  }
}

function createMockViewModel(pod: RidePod, rideInstance: RecurringRideInstancePreview): RideInstanceDetailViewModel {
  const taxiMeter = pod.rideOption === "taxi_meter" || pod.vehicleType === "Taxi";
  const bookingFareCapCents = rideInstance.bookingFareCapCents ?? Math.round(pod.maxFare * 100);
  const proofSummary: RideInstanceProofSummary = {
    quoteProof: null,
    receiptProof: null,
    meterProof: null,
  };
  const settlementSummary: RideInstanceSettlementSummary = {
    settlementId: rideInstance.settlementId ?? null,
    settlementState: rideInstance.settlementState ?? null,
    verifiedFareCents: rideInstance.finalFareCents ?? null,
    bookingFareCapCents,
    billableGuestCount: null,
    fareShareCents: null,
    platformFeeCents: rideInstance.platformFeeCents ?? null,
    hostReimbursementCents: rideInstance.hostReimbursementCents ?? null,
    disputeDeadlineAt: rideInstance.disputeWindowEndsAt ?? null,
    finalizedAt: null,
    items: [],
  };
  const statusLabel = getMockStatusLabel(rideInstance.status, taxiMeter);
  const canViewSettlement = Boolean(rideInstance.settlementId) || rideInstance.proofStatus === "VERIFIED";
  const canUploadQuote = !taxiMeter && rideInstance.status === "quote_needed";
  const canUploadReceipt = !taxiMeter && rideInstance.status === "receipt_pending";
  const canUploadMeterProof = taxiMeter && rideInstance.status === "meter_proof_needed";

  return {
    id: rideInstance.id,
    podId: pod.id,
    title: `${rideInstance.originLabel} -> ${rideInstance.destinationLabel}`,
    dateLabel: rideInstance.displayDate,
    timeLabel: rideInstance.departureTime,
    legLabel: rideInstance.legType === "return" ? "Return" : "Outbound",
    routeLabel: `${rideInstance.originLabel} -> ${rideInstance.destinationLabel}`,
    rideOptionLabel: taxiMeter ? "Taxi meter" : "Ride app / fixed quote",
    statusLabel,
    statusTone: getMockStatusTone(rideInstance.status, taxiMeter),
    nextActionLabel: canUploadQuote
      ? "Upload quote"
      : canUploadReceipt
        ? "Upload receipt"
        : canUploadMeterProof
          ? "Upload meter proof"
          : canViewSettlement
            ? "View settlement"
            : "View ride",
    nextActionTarget: `/host?rideInstanceId=${encodeURIComponent(rideInstance.id)}`,
    guestsLockedLabel: `${pod.seatsFilled} / ${pod.seatsTotal} guests locked`,
    bookingFareCapLabel: formatHkdCents(bookingFareCapCents),
    proofSummary,
    settlementSummary,
    disputeSummary: {
      openAdminReviewCaseCount: 0,
      highestSeverity: null,
      disputeOrHoldStatus: rideInstance.disputeReason ?? null,
      events: [],
    },
    memberContext: {
      currentUserRole: pod.hostUserId === currentUserId ? "HOST" : "UNKNOWN",
      currentMemberState: null,
      maxChargeCents: null,
      finalChargeCents: null,
    },
    isRideAppFixedQuote: !taxiMeter,
    isTaxiMeter: taxiMeter,
    canUploadQuote,
    canUploadReceipt,
    canUploadMeterProof,
    canViewSettlement,
    canReportDispute: Boolean(rideInstance.disputeWindowEndsAt),
  };
}

function getMockStatusLabel(status: RecurringRideStatus, taxiMeter: boolean) {
  if (status === "waiting_for_guests" || status === "guests_locking") return "Waiting for guests";
  if (status === "quote_needed") return "Quote needed";
  if (status === "quote_under_review") return "Quote under review";
  if (status === "ready_to_book") return "Ready to book";
  if (status === "ride_booked") return "Ride booked";
  if (status === "ready_for_taxi_meter") return "Ready for taxi meter";
  if (status === "receipt_pending" || status === "receipt_submitted") return "Receipt needed";
  if (status === "meter_proof_needed" || status === "meter_proof_submitted") return "Meter proof needed";
  if (status === "receipt_under_review" || status === "meter_proof_under_review") return "Proof under review";
  if (status === "settlement_ready") return "Settlement ready";
  if (status === "completed") return "Closed";
  return taxiMeter ? "Ready for taxi meter" : "Quote needed";
}

function getMockStatusTone(status: RecurringRideStatus, taxiMeter: boolean): RideInstanceStatusTone {
  if (status === "quote_needed") return "gold";
  if (status === "ready_to_book" || status === "ready_for_taxi_meter") return "green";
  if (status === "ride_booked") return "purple";
  if (
    status === "receipt_pending" ||
    status === "receipt_submitted" ||
    status === "receipt_under_review" ||
    status === "meter_proof_needed" ||
    status === "meter_proof_submitted" ||
    status === "meter_proof_under_review"
  ) {
    return "orange";
  }
  if (status === "settlement_ready") return "blue";
  if (status === "completed") return "gray";
  return taxiMeter ? "green" : "neutral";
}

export async function getRideInstanceDetailWithFallback(
  rideInstanceId: string,
  currentUserIdValue: string | null = currentUserId,
): Promise<RideInstanceDetailResult | null> {
  const supabaseDetail = await getRideInstanceDetail(rideInstanceId, currentUserIdValue);
  if (supabaseDetail) return supabaseDetail;

  const mockDetail = getRecurringRideInstance(rideInstanceId);
  if (!mockDetail) return null;

  return {
    source: "mock",
    fallbackNote: "Supabase not configured; using mock ride instance detail data.",
    data: null,
    pod: mockDetail.pod,
    rideInstance: mockDetail.rideInstance,
    viewModel: createMockViewModel(mockDetail.pod, mockDetail.rideInstance),
  };
}
