import "server-only";

import {
  getAdminReviewCases as getMockAdminReviewCases,
  type AdminReviewCase,
  type AdminDisputeEvidenceTimelineItem,
  type AdminEvidenceTimelineItem,
  type AdminReviewFilter,
  type AdminReviewSeverity,
} from "@/lib/admin-review-queue";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  RidePodAdminReviewCaseRow,
  RidePodEventRow,
  RidePodPodRow,
  RidePodProfileRow,
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
  rideOptionLabel: AdminReviewCase["rideOption"];
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
  subjectProfile?: RidePodProfileRow | null;
  proofs?: RidePodProofRow[];
  events?: RidePodEventRow[];
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

function proofStatusTimelineLabel(value: string | null | undefined) {
  if (value === "NEEDS_MORE_INFO") return "Needs more info";
  if (value === "REJECTED") return "Rejected";
  if (value === "VERIFIED") return "Verified";
  if (value === "UNDER_REVIEW") return "Under review";
  if (value === "FRAUD_SUSPECTED") return "Manual review";
  if (value === "SUBMITTED") return "Under review";
  if (value === "NEEDED") return "Needs proof";
  return "Proof status unknown";
}

function reviewStateDisplayLabel(value: string | null | undefined) {
  if (value === "NEEDS_MORE_INFO") return "Needs more info";
  if (value === "UNDER_REVIEW") return "Manual review";
  if (value === "APPROVED") return "Approved";
  if (value === "REJECTED") return "Rejected";
  if (value === "RESOLVED") return "Resolved";
  if (value === "OPEN") return "Open";
  return titleCaseEnum(value);
}

function caseTypeLabel(caseType: string) {
  if (caseType === "QUOTE_ABOVE_CAP") return "Quote above fare cap";
  if (caseType === "RECEIPT_ABOVE_CAP") return "Receipt above fare cap";
  if (caseType === "METER_PROOF_ABOVE_CAP") return "Meter proof above fare cap";
  if (caseType === "SUSPICIOUS_PROOF") return "Suspicious proof";
  if (caseType === "GUEST_DISPUTE") return "Guest dispute";
  if (caseType === "PAYOUT_HOLD") return "Payout hold";
  if (caseType === "QUOTE_RECEIPT_MISMATCH") return "Quote / receipt mismatch";
  if (caseType === "ID_VERIFICATION_REQUEST") return "ID verification request";
  if (caseType === "MEMBER_SAFETY_REPORT") return "Member safety concern";
  return caseType.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function caseFilter(caseType: string, reviewState: string): Exclude<AdminReviewFilter, "All"> {
  if (reviewState === "RESOLVED") return "Resolved";
  if (caseType === "ID_VERIFICATION_REQUEST") return "Proof";
  if (caseType === "MEMBER_SAFETY_REPORT") return "Disputes";
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
  if (reviewCase.case_type === "ID_VERIFICATION_REQUEST") return reviewStateDisplayLabel(reviewCase.review_state);
  if (reviewCase.case_type === "MEMBER_SAFETY_REPORT") return "Manual review";
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

function proofStatusRank(status: string | null | undefined) {
  if (status === "VERIFIED") return 0;
  if (status === "UNDER_REVIEW") return 1;
  if (status === "SUBMITTED") return 2;
  if (status === "NEEDS_MORE_INFO") return 3;
  if (status === "REJECTED") return 4;
  if (status === "FRAUD_SUSPECTED") return 5;
  if (status === "NEEDED") return 6;
  return 7;
}

function timestampMs(value: string | null | undefined) {
  const date = safeDate(value);
  return date ? date.getTime() : 0;
}

function chooseCurrentProof(proofs: RidePodProofRow[]) {
  const realProofs = proofs.filter((proof) => proof.proof_status !== "NEEDED");
  const candidates = realProofs.length ? realProofs : proofs;

  return candidates.reduce<RidePodProofRow | null>((selected, proof) => {
    if (!selected) return proof;
    const proofRank = proofStatusRank(proof.proof_status);
    const selectedRank = proofStatusRank(selected.proof_status);
    if (proofRank !== selectedRank) return proofRank < selectedRank ? proof : selected;

    const proofTime = timestampMs(proof.submitted_at ?? proof.reviewed_at);
    const selectedTime = timestampMs(selected.submitted_at ?? selected.reviewed_at);
    return proofTime >= selectedTime ? proof : selected;
  }, null);
}

function proofFileName(fileUrl: string | null | undefined) {
  if (!fileUrl) return null;
  const lastSegment = fileUrl.split("/").filter(Boolean).at(-1);
  return lastSegment ?? null;
}

function eventPayloadText(event: RidePodEventRow, key: string) {
  const payload = event.event_payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function proofTimelineTitle(proof: RidePodProofRow, isCurrent: boolean) {
  if (proof.proof_status === "NEEDS_MORE_INFO") return "Proof marked needs more info";
  if (proof.proof_status === "REJECTED") return "Proof rejected";
  if (proof.proof_status === "VERIFIED") return "Proof approved";
  if (proof.proof_status === "UNDER_REVIEW") return "Proof under review";
  if (proof.proof_status === "FRAUD_SUSPECTED") return "Proof under manual review";
  return isCurrent ? "Proof uploaded" : "Replacement proof uploaded";
}

function buildEvidenceTimeline(
  reviewCase: RidePodAdminReviewCaseRow,
  related: AdminReviewRelatedRows,
): AdminEvidenceTimelineItem[] {
  const proofRows = related.proofs?.length ? related.proofs : related.proof ? [related.proof] : [];
  const sortedProofs = [...proofRows].sort(
    (first, second) =>
      timestampMs(second.submitted_at ?? second.reviewed_at) - timestampMs(first.submitted_at ?? first.reviewed_at),
  );
  const currentProof = chooseCurrentProof(sortedProofs);
  const proofItems = sortedProofs.map<AdminEvidenceTimelineItem>((proof) => {
    const isCurrent = proof.id === currentProof?.id;
    const proofLabel = proofTypeLabel(proof.proof_type);

    return {
      id: `proof-${proof.id}`,
      title: proofTimelineTitle(proof, isCurrent),
      proofType: proofLabel,
      proofTypeLabel: proofLabel,
      amountCents: proof.amount_cents,
      amountLabel: typeof proof.amount_cents === "number" ? formatHkd(proof.amount_cents) : "Amount unavailable",
      status: proof.proof_status,
      statusLabel: proofStatusTimelineLabel(proof.proof_status),
      submittedAt: proof.submitted_at,
      submittedAtLabel: formatCreatedAt(proof.submitted_at),
      reviewedAt: proof.reviewed_at,
      reviewedAtLabel: proof.reviewed_at ? formatCreatedAt(proof.reviewed_at) : "Not reviewed yet",
      actorLabel: proof.uploaded_by_user_id ? `User ${proof.uploaded_by_user_id.slice(0, 8)}` : "Host",
      fileUrl: proof.file_url,
      fileName: proofFileName(proof.file_url),
      adminNotes: proof.admin_notes,
      versionLabel: isCurrent ? "Current proof" : "Previous proof",
      isCurrent,
    };
  });

  const reviewItems: AdminEvidenceTimelineItem[] = [];
  if (reviewCase.admin_notes) {
    reviewItems.push({
      id: `review-notes-${reviewCase.id}`,
      title: "Admin notes added",
      proofType: "review case",
      proofTypeLabel: "Review case",
      amountCents: null,
      amountLabel: "None",
      status: reviewCase.review_state,
      statusLabel: titleCaseEnum(reviewCase.review_state),
      submittedAt: reviewCase.resolved_at ?? reviewCase.created_at,
      submittedAtLabel: formatCreatedAt(reviewCase.resolved_at ?? reviewCase.created_at),
      reviewedAt: reviewCase.resolved_at,
      reviewedAtLabel: reviewCase.resolved_at ? formatCreatedAt(reviewCase.resolved_at) : "Review open",
      actorLabel: "Admin",
      fileUrl: null,
      fileName: null,
      adminNotes: reviewCase.admin_notes,
      versionLabel: "Review event",
      isCurrent: false,
    });
  }

  if (reviewCase.case_type.includes("DISPUTE")) {
    reviewItems.push({
      id: `dispute-${reviewCase.id}`,
      title: "Dispute opened",
      proofType: "review case",
      proofTypeLabel: "Review case",
      amountCents: null,
      amountLabel: "None",
      status: reviewCase.review_state,
      statusLabel: titleCaseEnum(reviewCase.review_state),
      submittedAt: reviewCase.created_at,
      submittedAtLabel: formatCreatedAt(reviewCase.created_at),
      reviewedAt: null,
      reviewedAtLabel: "Review open",
      actorLabel: "Reporter",
      fileUrl: null,
      fileName: null,
      adminNotes: reviewCase.description,
      versionLabel: "Review event",
      isCurrent: false,
    });
  }

  if (
    reviewCase.case_type.includes("PAYOUT") ||
    related.settlement?.settlement_state === "ADMIN_REVIEW" ||
    related.settlement?.settlement_state === "DISPUTE_HOLD"
  ) {
    reviewItems.push({
      id: `payout-held-${reviewCase.id}`,
      title: "Payout held",
      proofType: "settlement",
      proofTypeLabel: "Settlement",
      amountCents: related.settlement?.host_reimbursement_cents ?? null,
      amountLabel:
        typeof related.settlement?.host_reimbursement_cents === "number"
          ? formatHkd(related.settlement.host_reimbursement_cents)
          : "Amount unavailable",
      status: related.settlement?.settlement_state ?? reviewCase.review_state,
      statusLabel: "Payout held",
      submittedAt: reviewCase.created_at,
      submittedAtLabel: formatCreatedAt(reviewCase.created_at),
      reviewedAt: null,
      reviewedAtLabel: "Manual review",
      actorLabel: "RidePod",
      fileUrl: null,
      fileName: null,
      adminNotes: "Reimbursement may be held while RidePod completes manual review.",
      versionLabel: "Review event",
      isCurrent: false,
    });
  }

  // TODO SQL-2Q: replace this derived evidence timeline with persisted pod_events audit history when available.
  return [...proofItems, ...reviewItems];
}

function isDisputeCase(reviewCase: RidePodAdminReviewCaseRow) {
  return reviewCase.case_type.includes("DISPUTE") || reviewCase.case_type.toLowerCase().includes("dispute");
}

function disputeIssueType(reviewCase: RidePodAdminReviewCaseRow): string {
  const caseType = reviewCase.case_type.toLowerCase();
  const description = reviewCase.description?.toLowerCase() ?? "";

  if (caseType.includes("no_show") || caseType.includes("no-show") || description.includes("did not take")) {
    return "I did not take this ride";
  }
  if (description.includes("route") || caseType.includes("route")) return "Wrong route";
  if (description.includes("fare") || caseType.includes("fare")) return "Wrong fare";
  if (description.includes("receipt") || description.includes("proof")) return "Receipt or proof looks wrong";
  if (description.includes("host") || caseType.includes("host")) return "Host issue";
  return "Other";
}

function disputeTimelineTone(title: string): AdminDisputeEvidenceTimelineItem["tone"] {
  if (title === "Payout held") return "amber";
  if (title === "Admin decision") return "green";
  if (title === "Dispute opened") return "red";
  if (title.includes("Proof")) return "blue";
  return "neutral";
}

function buildDisputeEvidenceTimeline(
  reviewCase: RidePodAdminReviewCaseRow,
  related: AdminReviewRelatedRows,
): AdminDisputeEvidenceTimelineItem[] {
  if (!isDisputeCase(reviewCase)) return [];

  // TODO SQL-2R: Add a dedicated disputes table in later schema cleanup.
  const proofRows = related.proofs?.length ? related.proofs : related.proof ? [related.proof] : [];
  const items: AdminDisputeEvidenceTimelineItem[] = [];
  const pushItem = (item: Omit<AdminDisputeEvidenceTimelineItem, "tone"> & { tone?: AdminDisputeEvidenceTimelineItem["tone"] }) => {
    items.push({
      ...item,
      tone: item.tone ?? disputeTimelineTone(item.title),
    });
  };

  if (related.rideInstance?.updated_at || related.rideInstance?.created_at) {
    pushItem({
      id: `ride-completed-${reviewCase.id}`,
      title: "Ride completed",
      timestamp: related.rideInstance.updated_at ?? related.rideInstance.created_at,
      timestampLabel: formatCreatedAt(related.rideInstance.updated_at ?? related.rideInstance.created_at),
      actorLabel: "System",
      description: "Ride instance reached the settlement review flow.",
      fileUrl: null,
      fileName: null,
      adminNotes: null,
    });
  }

  proofRows.forEach((proof) => {
    const proofLabel = proofTypeLabel(proof.proof_type);
    pushItem({
      id: `dispute-proof-uploaded-${proof.id}`,
      title: "Proof uploaded",
      timestamp: proof.submitted_at,
      timestampLabel: formatCreatedAt(proof.submitted_at),
      actorLabel: "Host",
      description: `${proofLabel} submitted for settlement review.`,
      fileUrl: proof.file_url,
      fileName: proofFileName(proof.file_url),
      proofType: proofLabel,
      adminNotes: proof.admin_notes,
      tone: "blue",
    });

    if (proof.reviewed_at || proof.proof_status !== "SUBMITTED") {
      pushItem({
        id: `dispute-proof-reviewed-${proof.id}`,
        title: proof.proof_status === "VERIFIED" ? "Proof reviewed" : "Proof under review",
        timestamp: proof.reviewed_at ?? proof.submitted_at,
        timestampLabel: formatCreatedAt(proof.reviewed_at ?? proof.submitted_at),
        actorLabel: proof.reviewed_at ? "Admin" : "System",
        description: `Proof status: ${proofStatusTimelineLabel(proof.proof_status)}.`,
        fileUrl: proof.file_url,
        fileName: proofFileName(proof.file_url),
        proofType: proofLabel,
        adminNotes: proof.admin_notes,
        tone: proof.proof_status === "VERIFIED" ? "green" : "blue",
      });
    }
  });

  if (related.settlement) {
    pushItem({
      id: `final-split-notice-${related.settlement.id}`,
      title: "Final split notice",
      timestamp: related.settlement.created_at,
      timestampLabel: formatCreatedAt(related.settlement.created_at),
      actorLabel: "RidePod",
      description: related.settlement.dispute_deadline_at
        ? `Guests can report an issue until ${formatCreatedAt(related.settlement.dispute_deadline_at)}.`
        : "Final split notice is available from settlement metadata when present.",
      fileUrl: null,
      fileName: null,
      adminNotes: null,
      tone: "neutral",
    });
  }

  related.events
    ?.filter((event) =>
      [
        "RECEIPT_UPLOADED",
        "RECEIPT_VERIFIED",
        "SETTLEMENT_CREATED",
        "DISPUTE_REPORTED",
        "RIDEPOD_DISPUTE_OPENED",
        "PAYOUT_HELD",
        "ADMIN_PAYOUT_HELD",
        "ADMIN_DISPUTE_RESOLVED",
      ].includes(event.event_type),
    )
    .forEach((event) => {
      const eventTitle =
        event.event_type === "RECEIPT_UPLOADED"
          ? "Proof uploaded"
          : event.event_type === "RECEIPT_VERIFIED"
            ? "Proof reviewed"
            : event.event_type === "SETTLEMENT_CREATED"
              ? "Final split notice"
              : event.event_type.includes("DISPUTE") && event.event_type.includes("RESOLVED")
                ? "Admin decision"
                : event.event_type.includes("DISPUTE")
                  ? "Dispute opened"
                  : "Payout held";

      pushItem({
        id: `event-${event.id}`,
        title: eventTitle,
        timestamp: event.created_at,
        timestampLabel: formatCreatedAt(event.created_at),
        actorLabel: event.user_id ? "Guest" : "System",
        description: eventPayloadText(event, "description") ?? eventPayloadText(event, "notes") ?? titleCaseEnum(event.event_type),
        fileUrl: eventPayloadText(event, "fileUrl"),
        fileName: proofFileName(eventPayloadText(event, "fileUrl")),
        adminNotes: eventPayloadText(event, "adminNotes"),
      });
    });

  pushItem({
    id: `dispute-opened-${reviewCase.id}`,
    title: "Dispute opened",
    timestamp: reviewCase.created_at,
    timestampLabel: formatCreatedAt(reviewCase.created_at),
    actorLabel: "Guest",
    description: reviewCase.description ?? "Issue reported for manual review.",
    fileUrl: related.proof?.file_url ?? null,
    fileName: proofFileName(related.proof?.file_url),
    proofType: related.proof ? proofTypeLabel(related.proof.proof_type) : undefined,
    adminNotes: null,
    tone: "red",
  });

  if (related.settlement?.settlement_state === "ADMIN_REVIEW" || related.settlement?.settlement_state === "DISPUTE_HOLD") {
    pushItem({
      id: `dispute-payout-held-${reviewCase.id}`,
      title: "Payout held",
      timestamp: reviewCase.created_at,
      timestampLabel: formatCreatedAt(reviewCase.created_at),
      actorLabel: "RidePod",
      description: "Payout may be held while RidePod completes manual review.",
      fileUrl: null,
      fileName: null,
      adminNotes: null,
      tone: "amber",
    });
  }

  if (reviewCase.resolved_at || ["APPROVED", "REJECTED", "RESOLVED"].includes(reviewCase.review_state)) {
    pushItem({
      id: `admin-decision-${reviewCase.id}`,
      title: "Admin decision",
      timestamp: reviewCase.resolved_at ?? reviewCase.created_at,
      timestampLabel: formatCreatedAt(reviewCase.resolved_at ?? reviewCase.created_at),
      actorLabel: "Admin",
      description: `Case status: ${reviewStateDisplayLabel(reviewCase.review_state)}.`,
      fileUrl: null,
      fileName: null,
      adminNotes: reviewCase.admin_notes,
      tone: "green",
    });
  }

  return items.sort((first, second) => timestampMs(first.timestamp) - timestampMs(second.timestamp));
}

function subjectUserLabel(profile: RidePodProfileRow | null | undefined, fallbackId: string | null | undefined) {
  if (profile?.display_name) return profile.display_name;
  if (profile?.email) return profile.email;
  if (fallbackId) return `User ${fallbackId.slice(0, 8)}`;
  return "User unavailable";
}

function safetyConcernTypeFromDescription(description: string | null | undefined) {
  return description?.match(/^Concern type:\s*(.+)$/m)?.[1]?.trim() ?? "Safety concern";
}

function safetyReportBodyFromDescription(description: string | null | undefined) {
  return description?.split("\n\nDescription:\n")[1]?.trim() ?? description ?? "Member safety concern submitted for manual review.";
}

export function mapSupabaseAdminReviewCaseToViewModel(
  reviewCase: RidePodAdminReviewCaseRow,
  related: AdminReviewRelatedRows,
): AdminReviewCaseViewModel {
  const proof = related.proof;
  const rideInstance = related.rideInstance;
  const pod = related.pod;
  const settlement = related.settlement;
  const evidenceTimeline = buildEvidenceTimeline(reviewCase, related);
  const disputeEvidenceTimeline = buildDisputeEvidenceTimeline(reviewCase, related);
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
  const isIdVerificationCase = reviewCase.case_type === "ID_VERIFICATION_REQUEST";
  const isMemberSafetyReportCase = reviewCase.case_type === "MEMBER_SAFETY_REPORT";
  const accountLabel = subjectUserLabel(related.subjectProfile, reviewCase.subject_user_id);

  if (isMemberSafetyReportCase) {
    return {
      id: reviewCase.id,
      caseType: "Member safety concern",
      caseTypeLabel: "Member safety concern",
      filter: caseFilter(reviewCase.case_type, reviewCase.review_state),
      severity,
      severityLabel: severity,
      severityTone: severityTone(severity),
      reviewState: reviewCase.review_state as AdminReviewCase["reviewState"],
      reviewStateLabel: titleCaseEnum(reviewCase.review_state),
      rideDateTime: rideInstance ? rideDateTime : formatCreatedAt(reviewCase.created_at),
      rideDateLabel: rideInstance ? rideDateTime : formatCreatedAt(reviewCase.created_at),
      route: route === "Route unavailable" ? "Member safety report" : route,
      routeLabel: route === "Route unavailable" ? "Member safety report" : route,
      rideOption: rideInstance ? rideOptionLabel(pod) : "Account review",
      rideOptionLabel: rideInstance ? rideOptionLabel(pod) : "Account review",
      host: accountLabel,
      reporter: "Reporter private",
      guestsLocked,
      fareLabel: "Manual review",
      fareAmountCents: 0,
      fareAmountLabel: "None",
      bookingFareCapCents: 0,
      bookingFareCapLabel: "None",
      maxChargePerGuestCents: 0,
      proofType: "final receipt",
      proofTypeLabel: "final receipt",
      proofStatus: "UNDER_REVIEW",
      proofStatusLabel: "Manual review",
      disputeStatus: "Submitted",
      payoutStatus,
      payoutStatusLabel: titleCaseEnum(payoutStatus),
      createdTime: formatCreatedAt(reviewCase.created_at),
      createdAtLabel: formatCreatedAt(reviewCase.created_at),
      submittedBy: "Reporter private",
      submittedAt: formatCreatedAt(reviewCase.created_at),
      certificationAccepted: false,
      ridepodEstimateCents: 0,
      evidenceLabel: "Evidence upload coming later.",
      fileUrl: null,
      evidenceTimeline: [],
      disputeEvidenceTimeline: [],
      statusLabel: statusLabel(reviewCase, payoutStatus),
      primaryAction: reviewCase.review_state === "RESOLVED" ? "View resolution" : "Review case",
      primaryActionLabel: reviewCase.review_state === "RESOLVED" ? "View resolution" : "Review case",
      differenceLabel: "None",
      isIdVerificationCase: false,
      isMemberSafetyReportCase: true,
      safetyConcernType: safetyConcernTypeFromDescription(reviewCase.description),
      safetyReportDescription: safetyReportBodyFromDescription(reviewCase.description),
      reportedMemberLabel: accountLabel,
      reporterLabel: "Reporter private",
      caseDescription: reviewCase.description,
    };
  }

  if (isIdVerificationCase) {
    return {
      id: reviewCase.id,
      caseType: "ID verification request",
      caseTypeLabel: "ID verification request",
      filter: caseFilter(reviewCase.case_type, reviewCase.review_state),
      severity,
      severityLabel: severity,
      severityTone: severityTone(severity),
      reviewState: reviewCase.review_state as AdminReviewCase["reviewState"],
      reviewStateLabel: titleCaseEnum(reviewCase.review_state),
      rideDateTime: formatCreatedAt(reviewCase.created_at),
      rideDateLabel: formatCreatedAt(reviewCase.created_at),
      route: "Account review",
      routeLabel: "Account review",
      rideOption: "Account review",
      rideOptionLabel: "Account review",
      host: accountLabel,
      reporter: "User",
      guestsLocked: "None",
      fareLabel: "Manual review",
      fareAmountCents: 0,
      fareAmountLabel: "None",
      bookingFareCapCents: 0,
      bookingFareCapLabel: "None",
      maxChargePerGuestCents: 0,
      proofType: "final receipt",
      proofTypeLabel: "final receipt",
      proofStatus: "UNDER_REVIEW",
      proofStatusLabel: "Manual review",
      disputeStatus: "None",
      payoutStatus,
      payoutStatusLabel: titleCaseEnum(payoutStatus),
      createdTime: formatCreatedAt(reviewCase.created_at),
      createdAtLabel: formatCreatedAt(reviewCase.created_at),
      submittedBy: accountLabel,
      submittedAt: formatCreatedAt(reviewCase.created_at),
      certificationAccepted: false,
      ridepodEstimateCents: 0,
      evidenceLabel: "No identity document was collected.",
      fileUrl: null,
      evidenceTimeline: [],
      disputeEvidenceTimeline: [],
      statusLabel: statusLabel(reviewCase, payoutStatus),
      primaryAction: reviewCase.review_state === "RESOLVED" ? "View resolution" : "Review case",
      primaryActionLabel: reviewCase.review_state === "RESOLVED" ? "View resolution" : "Review case",
      differenceLabel: "None",
      isIdVerificationCase: true,
      subjectUserLabel: accountLabel,
      subjectUserEmail: related.subjectProfile?.email ?? null,
      idVerificationStatus: related.subjectProfile?.id_verification_status ?? null,
      caseDescription: reviewCase.description,
    };
  }

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
    reporter: isDisputeCase(reviewCase) ? "Guest" : "System",
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
    disputeStatus: isDisputeCase(reviewCase) ? "Submitted" : "None",
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
    fileUrl: proof?.file_url ?? null,
    evidenceTimeline,
    disputeEvidenceTimeline,
    disputeIssueType: isDisputeCase(reviewCase) ? disputeIssueType(reviewCase) : undefined,
    disputeNote: isDisputeCase(reviewCase) ? reviewCase.description ?? "Issue reported for manual review." : undefined,
    statusLabel: statusLabel(reviewCase, payoutStatus),
    primaryAction: reviewCase.review_state === "RESOLVED" ? "View resolution" : "Review case",
    primaryActionLabel: reviewCase.review_state === "RESOLVED" ? "View resolution" : "Review case",
    differenceLabel: differenceLabel(fareAmountCents, bookingFareCapCents),
    isIdVerificationCase: false,
    caseDescription: reviewCase.description,
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
    getMockAdminReviewCases().map((reviewCase) => {
      const evidenceTimeline: AdminEvidenceTimelineItem[] = reviewCase.evidenceTimeline ?? [
        {
          id: `mock-proof-${reviewCase.id}`,
          title: reviewCase.proofStatus === "REJECTED" ? "Proof rejected" : "Proof uploaded",
          proofType: reviewCase.proofType,
          proofTypeLabel: reviewCase.proofType,
          amountCents: reviewCase.fareAmountCents,
          amountLabel: formatHkd(reviewCase.fareAmountCents),
          status: reviewCase.proofStatus,
          statusLabel: proofStatusTimelineLabel(reviewCase.proofStatus),
          submittedAt: null,
          submittedAtLabel: reviewCase.submittedAt,
          reviewedAt: null,
          reviewedAtLabel: reviewCase.proofStatus === "VERIFIED" ? reviewCase.createdTime : "Not reviewed yet",
          actorLabel: reviewCase.submittedBy,
          fileUrl: reviewCase.fileUrl ?? null,
          fileName: reviewCase.evidenceLabel ?? null,
          adminNotes: reviewCase.disputeNote ?? null,
          versionLabel: "Current proof",
          isCurrent: true,
        },
      ];
      const disputeEvidenceTimeline: AdminDisputeEvidenceTimelineItem[] =
        reviewCase.disputeEvidenceTimeline ??
        (reviewCase.disputeStatus === "None"
          ? []
          : [
              {
                id: `mock-dispute-proof-${reviewCase.id}`,
                title: "Proof uploaded",
                timestamp: null,
                timestampLabel: reviewCase.submittedAt,
                actorLabel: "Host",
                description: `${reviewCase.proofType} submitted for settlement review.`,
                fileUrl: reviewCase.fileUrl ?? null,
                fileName: reviewCase.evidenceLabel ?? null,
                proofType: reviewCase.proofType,
                adminNotes: null,
                tone: "blue",
              },
              {
                id: `mock-dispute-opened-${reviewCase.id}`,
                title: "Dispute opened",
                timestamp: null,
                timestampLabel: reviewCase.createdTime,
                actorLabel: "Guest",
                description: reviewCase.disputeNote ?? "Issue reported for manual review.",
                fileUrl: null,
                fileName: null,
                adminNotes: reviewCase.disputeNote ?? null,
                tone: "red",
              },
              {
                id: `mock-dispute-payout-held-${reviewCase.id}`,
                title: "Payout held",
                timestamp: null,
                timestampLabel: reviewCase.createdTime,
                actorLabel: "RidePod",
                description: "Payout may be held while RidePod completes manual review.",
                fileUrl: null,
                fileName: null,
                adminNotes: null,
                tone: "amber",
              },
            ]);

      return {
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
        evidenceTimeline,
        disputeEvidenceTimeline,
      };
    }),
    filters,
  );
}

async function fetchRowsByIds<Row extends { id: string }>(
  table: "ride_instances" | "pods" | "proofs" | "settlements" | "pod_events" | "profiles",
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
  const subjectProfiles = await fetchRowsByIds<RidePodProfileRow>(
    "profiles",
    reviewCases.map((reviewCase) => reviewCase.subject_user_id).filter((id): id is string => Boolean(id)),
  );

  return applyFilters(
    reviewCases.map((reviewCase) => {
      const rideInstance = reviewCase.ride_instance_id ? rideInstances.get(reviewCase.ride_instance_id) ?? null : null;
      return mapSupabaseAdminReviewCaseToViewModel(reviewCase, {
        rideInstance,
        pod: rideInstance?.pod_id ? pods.get(rideInstance.pod_id) ?? null : null,
        proof: reviewCase.proof_id ? proofs.get(reviewCase.proof_id) ?? null : null,
        settlement: reviewCase.settlement_id ? settlements.get(reviewCase.settlement_id) ?? null : null,
        subjectProfile: reviewCase.subject_user_id ? subjectProfiles.get(reviewCase.subject_user_id) ?? null : null,
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
  const subjectProfiles = await fetchRowsByIds<RidePodProfileRow>("profiles", result.data.subject_user_id ? [result.data.subject_user_id] : []);
  const proof = result.data.proof_id ? proofs.get(result.data.proof_id) ?? null : null;
  const settlement = result.data.settlement_id ? settlements.get(result.data.settlement_id) ?? null : null;
  let evidenceProofs = proof ? [proof] : [];
  let events: RidePodEventRow[] = [];
  if (rideInstance && proof) {
    const allProofsResult = await client
      .from("proofs")
      .select("*")
      .eq("ride_instance_id", rideInstance.id)
      .eq("proof_type", proof.proof_type)
      .order("submitted_at", { ascending: false });

    if (!allProofsResult.error) {
      evidenceProofs = (allProofsResult.data ?? []) as RidePodProofRow[];
    }
  }
  if (rideInstance) {
    const eventsResult = await client
      .from("pod_events")
      .select("*")
      .eq("ride_instance_id", rideInstance.id)
      .order("created_at", { ascending: true });

    if (!eventsResult.error) {
      events = (eventsResult.data ?? []) as RidePodEventRow[];
    }
  }
  const viewModel = mapSupabaseAdminReviewCaseToViewModel(result.data, {
    rideInstance,
    pod: rideInstance?.pod_id ? pods.get(rideInstance.pod_id) ?? null : null,
    proof,
    settlement,
    subjectProfile: result.data.subject_user_id ? subjectProfiles.get(result.data.subject_user_id) ?? null : null,
    proofs: evidenceProofs,
    events,
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
