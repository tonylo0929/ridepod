import "server-only";

import {
  getAdminReviewCases as getMockAdminReviewCases,
  type AdminReviewCase,
  type AdminReviewFilter,
  type AdminReviewSeverity,
} from "@/lib/admin-review-queue";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  RidePodAdminReviewCaseRow,
  RidePodPodRow,
  RidePodProofRow,
  RidePodRideInstanceRow,
  RidePodSettlementRow,
} from "@/lib/supabase/types";

export type AdminReviewCaseFilters = {
  reviewState?: string;
  caseType?: string;
  severity?: string;
  search?: string;
};

export type AdminReviewCaseViewModel = AdminReviewCase & {
  caseTypeLabel: string;
  severityLabel: string;
  severityTone: "gray" | "blue" | "amber" | "red";
  reviewStateLabel: string;
  routeLabel: string;
  rideDateLabel: string;
  rideOptionLabel: "Ride app / fixed quote" | "Taxi meter";
  proofTypeLabel: "quote screenshot" | "final receipt" | "meter proof";
  proofStatusLabel: string;
  fareAmountLabel: string;
  bookingFareCapLabel: string;
  differenceLabel: string;
  payoutStatusLabel: string;
  primaryActionLabel: "Review case" | "View resolution";
  createdAtLabel: string;
};

export type AdminReviewCaseDetailViewModel = AdminReviewCaseViewModel & {
  caseId: string;
  createdAt: string | null;
  resolvedAt: string | null;
  adminNotes: string | null;
  rideInstanceStatus: string;
  settlementState: string | null;
  verifiedFareCents: number | null;
  hostReimbursementCents: number | null;
  disputeDeadlineAt: string | null;
  aboveCap: boolean;
  differenceCents: number;
  fileUrl: string | null;
};

type AdminReviewRelatedRows = {
  rideInstance: RidePodRideInstanceRow | null;
  pod: RidePodPodRow | null;
  proof: RidePodProofRow | null;
  settlement: RidePodSettlementRow | null;
};

export type AdminReviewCasesReadResult = {
  source: "supabase" | "mock";
  cases: AdminReviewCaseViewModel[];
  fallbackNote: string | null;
  userFacingError: string | null;
};

const fallbackNote = "Supabase admin review read is unavailable; using mock admin review cases.";

function formatHkd(cents: number) {
  return `HK$${(cents / 100).toFixed(2)}`;
}

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRideDateTime(value: string | null | undefined, legType: string | null | undefined) {
  const date = safeDate(value);
  if (!date) return "Ride date unknown";

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const legLabel = legType === "RETURN" || legType === "return" ? "Return" : "Outbound";

  return `${dateLabel} · ${timeLabel} · ${legLabel}`;
}

function formatCreatedAt(value: string | null | undefined) {
  const date = safeDate(value);
  if (!date) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function titleCaseEnum(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function caseTypeLabel(caseType: string) {
  if (caseType === "QUOTE_ABOVE_CAP") return "Quote above fare cap";
  if (caseType === "RECEIPT_ABOVE_CAP") return "Receipt above fare cap";
  if (caseType === "METER_PROOF_ABOVE_CAP") return "Meter proof above fare cap";
  if (caseType === "SUSPICIOUS_PROOF") return "Suspicious proof";
  if (caseType === "GUEST_DISPUTE") return "Guest dispute";
  if (caseType === "PAYOUT_HOLD") return "Payout hold";
  if (caseType === "QUOTE_RECEIPT_MISMATCH") return "Quote / receipt mismatch";
  return caseType.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function caseFilter(caseType: string, reviewState: string): Exclude<AdminReviewFilter, "All"> {
  if (reviewState === "RESOLVED") return "Resolved";
  if (caseType.includes("ABOVE_CAP") || caseType.toLowerCase().includes("above cap")) return "Above cap";
  if (caseType.includes("DISPUTE") || caseType.toLowerCase().includes("dispute")) return "Disputes";
  if (caseType.includes("PAYOUT") || caseType.toLowerCase().includes("payout")) return "Payout holds";
  return "Proof";
}

function severityLabel(severity: string): AdminReviewSeverity {
  if (severity === "CRITICAL" || severity === "Critical") return "Critical";
  if (severity === "HIGH" || severity === "High") return "High";
  if (severity === "MEDIUM" || severity === "Medium") return "Medium";
  return "Low";
}

function severityTone(severity: AdminReviewSeverity): AdminReviewCaseViewModel["severityTone"] {
  if (severity === "Critical") return "red";
  if (severity === "High") return "amber";
  if (severity === "Medium") return "blue";
  return "gray";
}

function proofTypeLabel(proofType: RidePodProofRow["proof_type"] | null | undefined): AdminReviewCase["proofType"] {
  if (proofType === "QUOTE_SCREENSHOT") return "quote screenshot";
  if (proofType === "METER_PROOF") return "meter proof";
  return "final receipt";
}

function rideOptionLabel(pod: RidePodPodRow | null): AdminReviewCase["rideOption"] {
  return pod?.ride_option === "TAXI_METER" ? "Taxi meter" : "Ride app / fixed quote";
}

function payoutStatusLabel(reviewCase: RidePodAdminReviewCaseRow, settlement: RidePodSettlementRow | null) {
  if (reviewCase.review_state === "RESOLVED" || reviewCase.review_state === "APPROVED") return "RELEASED";
  if (settlement?.settlement_state === "PAID") return "RELEASED";
  if (
    reviewCase.review_state === "OPEN" ||
    reviewCase.review_state === "UNDER_REVIEW" ||
    settlement?.settlement_state === "ADMIN_REVIEW" ||
    settlement?.settlement_state === "DISPUTE_HOLD"
  ) {
    return "HELD_FOR_REVIEW";
  }
  return "PENDING";
}

function statusLabel(reviewCase: RidePodAdminReviewCaseRow, payoutStatus: AdminReviewCase["payoutStatus"]) {
  if (reviewCase.review_state === "RESOLVED") return "Resolved";
  if (payoutStatus === "HELD_FOR_REVIEW") return "Payout held";
  if (reviewCase.review_state === "NEEDS_MORE_INFO") return "Needs more info";
  return "Manual review";
}

function differenceLabel(amountCents: number, capCents: number) {
  const difference = amountCents - capCents;
  if (difference === 0) return "No difference";
  return `${difference > 0 ? "+" : "-"}${formatHkd(Math.abs(difference))}`;
}

export function mapSupabaseAdminReviewCaseToViewModel(
  reviewCase: RidePodAdminReviewCaseRow,
  related: AdminReviewRelatedRows,
): AdminReviewCaseViewModel {
  const proof = related.proof;
  const rideInstance = related.rideInstance;
  const pod = related.pod;
  const settlement = related.settlement;
  const severity = severityLabel(reviewCase.severity);
  const fareAmountCents =
    proof?.amount_cents ??
    settlement?.verified_fare_cents ??
    rideInstance?.booking_fare_cap_cents ??
    pod?.booking_fare_cap_cents ??
    0;
  const bookingFareCapCents =
    rideInstance?.booking_fare_cap_cents ?? settlement?.booking_fare_cap_cents ?? pod?.booking_fare_cap_cents ?? 0;
  const guestsLocked = `${rideInstance?.guests_locked_count ?? 0} / ${rideInstance?.required_guests_count ?? pod?.minimum_locked_guests ?? 0}`;
  const payoutStatus = payoutStatusLabel(reviewCase, settlement) as AdminReviewCase["payoutStatus"];
  const proofLabel = proofTypeLabel(proof?.proof_type);
  const label = caseTypeLabel(reviewCase.case_type);
  const rideDateTime = formatRideDateTime(rideInstance?.departure_at, rideInstance?.leg_type);
  const route = rideInstance?.route_label ?? pod?.route_label ?? "Route unavailable";

  return {
    id: reviewCase.id,
    caseType: label as AdminReviewCase["caseType"],
    caseTypeLabel: label,
    filter: caseFilter(reviewCase.case_type, reviewCase.review_state),
    severity,
    severityLabel: severity,
    severityTone: severityTone(severity),
    reviewState: reviewCase.review_state as AdminReviewCase["reviewState"],
    reviewStateLabel: titleCaseEnum(reviewCase.review_state),
    rideDateTime,
    rideDateLabel: rideDateTime,
    route,
    routeLabel: route,
    rideOption: rideOptionLabel(pod),
    rideOptionLabel: rideOptionLabel(pod),
    host: pod?.host_user_id ? `Host ${pod.host_user_id.slice(0, 8)}` : "Host unavailable",
    reporter: "System",
    guestsLocked,
    fareLabel: proofLabel === "quote screenshot" ? "Quote" : proofLabel === "meter proof" ? "Meter proof" : "Receipt",
    fareAmountCents,
    fareAmountLabel: formatHkd(fareAmountCents),
    bookingFareCapCents,
    bookingFareCapLabel: formatHkd(bookingFareCapCents),
    maxChargePerGuestCents: Math.ceil(bookingFareCapCents / Math.max(rideInstance?.required_guests_count ?? 1, 1)),
    proofType: proofLabel,
    proofTypeLabel: proofLabel,
    proofStatus: (proof?.proof_status ?? "SUBMITTED") as AdminReviewCase["proofStatus"],
    proofStatusLabel: titleCaseEnum(proof?.proof_status ?? "SUBMITTED"),
    disputeStatus: reviewCase.case_type.includes("DISPUTE") ? "Submitted" : "None",
    payoutStatus,
    payoutStatusLabel: titleCaseEnum(payoutStatus),
    createdTime: formatCreatedAt(reviewCase.created_at),
    createdAtLabel: formatCreatedAt(reviewCase.created_at),
    submittedBy: proof?.uploaded_by_user_id ? `User ${proof.uploaded_by_user_id.slice(0, 8)}` : "Host",
    submittedAt: formatCreatedAt(proof?.submitted_at),
    certificationAccepted: Boolean(proof?.certification_accepted),
    ridepodEstimateCents: pod?.current_estimate_cents ?? 0,
    uploadedQuoteCents: proof?.proof_type === "QUOTE_SCREENSHOT" ? proof.amount_cents ?? undefined : undefined,
    finalProofCents: proof?.proof_type !== "QUOTE_SCREENSHOT" ? proof?.amount_cents ?? undefined : undefined,
    evidenceLabel: proof?.file_url ?? "Proof preview placeholder",
    statusLabel: statusLabel(reviewCase, payoutStatus),
    primaryAction: reviewCase.review_state === "RESOLVED" ? "View resolution" : "Review case",
    primaryActionLabel: reviewCase.review_state === "RESOLVED" ? "View resolution" : "Review case",
    differenceLabel: differenceLabel(fareAmountCents, bookingFareCapCents),
  };
}

function applyFilters(cases: AdminReviewCaseViewModel[], filters: AdminReviewCaseFilters = {}) {
  return cases.filter((reviewCase) => {
    if (filters.reviewState && reviewCase.reviewState !== filters.reviewState) return false;
    if (filters.caseType && reviewCase.caseTypeLabel !== caseTypeLabel(filters.caseType)) return false;
    if (filters.severity && reviewCase.severityLabel !== severityLabel(filters.severity)) return false;
    if (filters.search) {
      const query = filters.search.toLowerCase();
      return `${reviewCase.caseTypeLabel} ${reviewCase.routeLabel} ${reviewCase.rideDateLabel}`
        .toLowerCase()
        .includes(query);
    }
    return true;
  });
}

function mockCases(filters?: AdminReviewCaseFilters): AdminReviewCaseViewModel[] {
  return applyFilters(
    getMockAdminReviewCases().map((reviewCase) => ({
      ...reviewCase,
      caseTypeLabel: reviewCase.caseType,
      severityLabel: reviewCase.severity,
      severityTone: severityTone(reviewCase.severity),
      reviewStateLabel: titleCaseEnum(reviewCase.reviewState),
      routeLabel: reviewCase.route,
      rideDateLabel: reviewCase.rideDateTime,
      rideOptionLabel: reviewCase.rideOption,
      proofTypeLabel: reviewCase.proofType,
      proofStatusLabel: titleCaseEnum(reviewCase.proofStatus),
      fareAmountLabel: formatHkd(reviewCase.fareAmountCents),
      bookingFareCapLabel: formatHkd(reviewCase.bookingFareCapCents),
      differenceLabel: differenceLabel(reviewCase.fareAmountCents, reviewCase.bookingFareCapCents),
      payoutStatusLabel: titleCaseEnum(reviewCase.payoutStatus),
      primaryActionLabel: reviewCase.primaryAction,
      createdAtLabel: reviewCase.createdTime,
    })),
    filters,
  );
}

async function fetchRowsByIds<Row extends { id: string }>(
  table: "ride_instances" | "pods" | "proofs" | "settlements",
  ids: string[],
): Promise<Map<string, Row>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map();

  const result = await getSupabaseAdminClient()
    .from(table)
    .select("*")
    .in("id", uniqueIds);

  if (result.error) throw result.error;
  return new Map(((result.data ?? []) as unknown as Row[]).map((row) => [row.id, row]));
}

export async function getAdminReviewCases(filters: AdminReviewCaseFilters = {}): Promise<AdminReviewCaseViewModel[]> {
  const client = getSupabaseAdminClient();
  let query = client.from("admin_review_cases").select("*").order("created_at", { ascending: false });

  if (filters.reviewState) query = query.eq("review_state", filters.reviewState);
  if (filters.caseType) query = query.eq("case_type", filters.caseType);
  if (filters.severity) query = query.eq("severity", filters.severity);

  const result = await query;
  if (result.error) throw result.error;

  const reviewCases = result.data ?? [];
  const rideInstances = await fetchRowsByIds<RidePodRideInstanceRow>(
    "ride_instances",
    reviewCases.map((reviewCase) => reviewCase.ride_instance_id).filter((id): id is string => Boolean(id)),
  );
  const proofs = await fetchRowsByIds<RidePodProofRow>(
    "proofs",
    reviewCases.map((reviewCase) => reviewCase.proof_id).filter((id): id is string => Boolean(id)),
  );
  const settlements = await fetchRowsByIds<RidePodSettlementRow>(
    "settlements",
    reviewCases.map((reviewCase) => reviewCase.settlement_id).filter((id): id is string => Boolean(id)),
  );
  const pods = await fetchRowsByIds<RidePodPodRow>(
    "pods",
    Array.from(rideInstances.values()).map((rideInstance) => rideInstance.pod_id).filter((id): id is string => Boolean(id)),
  );

  return applyFilters(
    reviewCases.map((reviewCase) => {
      const rideInstance = reviewCase.ride_instance_id ? rideInstances.get(reviewCase.ride_instance_id) ?? null : null;
      return mapSupabaseAdminReviewCaseToViewModel(reviewCase, {
        rideInstance,
        pod: rideInstance?.pod_id ? pods.get(rideInstance.pod_id) ?? null : null,
        proof: reviewCase.proof_id ? proofs.get(reviewCase.proof_id) ?? null : null,
        settlement: reviewCase.settlement_id ? settlements.get(reviewCase.settlement_id) ?? null : null,
      });
    }),
    filters,
  );
}

export async function getAdminReviewCaseDetail(caseId: string): Promise<AdminReviewCaseDetailViewModel | null> {
  const client = getSupabaseAdminClient();
  const result = await client
    .from("admin_review_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();

  if (result.error || !result.data) return null;

  const [rideInstances, proofs, settlements] = await Promise.all([
    fetchRowsByIds<RidePodRideInstanceRow>("ride_instances", result.data.ride_instance_id ? [result.data.ride_instance_id] : []),
    fetchRowsByIds<RidePodProofRow>("proofs", result.data.proof_id ? [result.data.proof_id] : []),
    fetchRowsByIds<RidePodSettlementRow>("settlements", result.data.settlement_id ? [result.data.settlement_id] : []),
  ]);
  const rideInstance = result.data.ride_instance_id ? rideInstances.get(result.data.ride_instance_id) ?? null : null;
  const pods = await fetchRowsByIds<RidePodPodRow>("pods", rideInstance?.pod_id ? [rideInstance.pod_id] : []);
  const proof = result.data.proof_id ? proofs.get(result.data.proof_id) ?? null : null;
  const settlement = result.data.settlement_id ? settlements.get(result.data.settlement_id) ?? null : null;
  const viewModel = mapSupabaseAdminReviewCaseToViewModel(result.data, {
    rideInstance,
    pod: rideInstance?.pod_id ? pods.get(rideInstance.pod_id) ?? null : null,
    proof,
    settlement,
  });
  const differenceCents = viewModel.fareAmountCents - viewModel.bookingFareCapCents;

  return {
    ...viewModel,
    caseId: result.data.id,
    createdAt: result.data.created_at,
    resolvedAt: result.data.resolved_at,
    adminNotes: result.data.admin_notes,
    rideInstanceStatus: rideInstance?.instance_status ?? "UNKNOWN",
    settlementState: settlement?.settlement_state ?? null,
    verifiedFareCents: settlement?.verified_fare_cents ?? null,
    hostReimbursementCents: settlement?.host_reimbursement_cents ?? null,
    disputeDeadlineAt: settlement?.dispute_deadline_at ?? null,
    aboveCap: differenceCents > 0,
    differenceCents,
    fileUrl: proof?.file_url ?? null,
  };
}

export async function getAdminReviewCasesWithFallback(
  filters: AdminReviewCaseFilters = {},
): Promise<AdminReviewCasesReadResult> {
  try {
    const cases = await getAdminReviewCases(filters);
    return {
      source: "supabase",
      cases,
      fallbackNote: null,
      userFacingError: null,
    };
  } catch {
    return {
      source: "mock",
      cases: mockCases(filters),
      fallbackNote,
      userFacingError: "Couldn't load review cases. Try again later.",
    };
  }
}
