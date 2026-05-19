import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RidePodAdminReviewCaseRow, RidePodProofRow, RidePodRideInstanceRow } from "@/lib/supabase/types";

export type RideInstanceProofMetadataInput = {
  rideInstanceId: string;
  proofType: "QUOTE_SCREENSHOT" | "FINAL_RECEIPT" | "METER_PROOF";
  amountCents: number;
  providerName?: string;
  fileUrl?: string;
  fileName?: string;
  note?: string;
  suspiciousReason?: string;
  certificationAccepted: boolean;
  certificationTextVersion: string;
};

export type RideInstanceProofMetadataResult = {
  source: "supabase" | "mock";
  proof: RidePodProofRow;
  normalizedProofStatus: "SUBMITTED";
  normalizedRideInstanceStatus: RideInstanceStatusAfterProofSubmit;
  duplicate: boolean;
  aboveCap: boolean;
  reviewRequired: boolean;
  reviewCase: RidePodAdminReviewCaseRow | null;
  adminReviewCaseCreated: boolean;
  adminReviewCaseFailed: boolean;
  userFacingMessage: string;
  statusUpdateFailed: boolean;
  fallbackNote: string | null;
};

type RideOptionForProof = "RIDE_APP_FIXED_QUOTE" | "TAXI_METER" | "UNKNOWN";
type RideInstanceStatusAfterProofSubmit = "QUOTE_UNDER_REVIEW" | "PROOF_UNDER_REVIEW";
type AdminReviewCaseTypeForProof =
  | "QUOTE_ABOVE_CAP"
  | "RECEIPT_ABOVE_CAP"
  | "METER_PROOF_ABOVE_CAP"
  | "SUSPICIOUS_PROOF";
type AdminReviewSeverityForProof = "HIGH" | "CRITICAL";
type ReplaceableProofStatus =
  | "NEEDED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "NEEDS_MORE_INFO"
  | "REJECTED"
  | "FRAUD_SUSPECTED";
type ProofReplacementPolicyReason =
  | "NO_EXISTING_PROOF"
  | "PROOF_NEEDS_UPLOAD"
  | "PROOF_NEEDS_MORE_INFO"
  | "PROOF_REJECTED"
  | "ACTIVE_PROOF_EXISTS"
  | "SUSPICIOUS_PROOF_REVIEW"
  | "UNKNOWN_PROOF_STATUS";

export type RideInstanceStatusAfterProofSubmitInput = {
  rideInstanceId: string;
  proofType: RideInstanceProofMetadataInput["proofType"];
  proofAmountCents: number;
  bookingFareCapCents?: number | null;
  rideOption: Exclude<RideOptionForProof, "UNKNOWN">;
};

export type RideInstanceStatusAfterProofSubmitResult = {
  source: "supabase";
  rideInstance: RidePodRideInstanceRow | null;
  normalizedRideInstanceStatus: RideInstanceStatusAfterProofSubmit;
  aboveCap: boolean;
  reviewRequired: boolean;
  userFacingMessage: string;
  statusUpdateFailed: boolean;
};

export type AdminReviewCaseForProofInput = {
  rideInstanceId: string;
  proofId: string;
  proofType: RideInstanceProofMetadataInput["proofType"];
  proofAmountCents: number;
  bookingFareCapCents?: number | null;
  rideOption: Exclude<RideOptionForProof, "UNKNOWN">;
  suspiciousReason?: string;
  submittedByUserId?: string;
};

export type AdminReviewCaseForProofResult = {
  createdCase: RidePodAdminReviewCaseRow | null;
  existingCase: RidePodAdminReviewCaseRow | null;
  reviewRequired: boolean;
  caseType?: AdminReviewCaseTypeForProof;
  severity?: AdminReviewSeverityForProof;
  persisted: boolean;
  failed: boolean;
};

export type ProofReplacementPolicyResult = {
  canSubmitProof: boolean;
  canReplaceProof: boolean;
  blocksNewSubmission: boolean;
  reason: ProofReplacementPolicyReason;
  userFacingMessage: string;
};

export type CanReplaceProofInput = {
  proofStatus?: ReplaceableProofStatus | string | null;
  proofType?: RideInstanceProofMetadataInput["proofType"] | string | null;
  uploadedByUserId?: string | null;
  currentUserId?: string | null;
  currentUserRole?: string | null;
};

export type CanReplaceProofResult = {
  canReplace: boolean;
  reason: string;
  ctaLabel?: string;
};

export type CurrentProofSelectionInput = {
  id?: string | null;
  proofType?: RideInstanceProofMetadataInput["proofType"] | string | null;
  proofStatus?: ReplaceableProofStatus | string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  isCurrent?: boolean | null;
  supersededAt?: string | null;
  supersededByProofId?: string | null;
};

const activeProofStatuses = new Set(["SUBMITTED", "UNDER_REVIEW", "VERIFIED"]);
const proofResubmissionAllowedStatuses = new Set(["NEEDED", "NEEDS_MORE_INFO", "REJECTED"]);
const openAdminReviewStates = ["OPEN", "UNDER_REVIEW", "NEEDS_MORE_INFO"];
const proofStatusPriority = new Map<string, number>([
  ["VERIFIED", 7],
  ["UNDER_REVIEW", 6],
  ["SUBMITTED", 5],
  ["NEEDS_MORE_INFO", 4],
  ["REJECTED", 3],
  ["FRAUD_SUSPECTED", 2],
  ["NEEDED", 1],
]);

class ProofMetadataSubmitError extends Error {}

export function getProofReplacementPolicy(
  existingProof?: Pick<RidePodProofRow, "proof_status"> | null,
): ProofReplacementPolicyResult {
  const proofStatus = existingProof?.proof_status ?? null;

  if (!proofStatus) {
    return {
      canSubmitProof: true,
      canReplaceProof: false,
      blocksNewSubmission: false,
      reason: "NO_EXISTING_PROOF",
      userFacingMessage: "No proof has been submitted yet.",
    };
  }

  if (proofResubmissionAllowedStatuses.has(proofStatus) && proofStatus === "NEEDED") {
    return {
      canSubmitProof: true,
      canReplaceProof: false,
      blocksNewSubmission: false,
      reason: "PROOF_NEEDS_UPLOAD",
      userFacingMessage: "Proof is needed before this ride can continue.",
    };
  }

  if (proofResubmissionAllowedStatuses.has(proofStatus) && proofStatus === "NEEDS_MORE_INFO") {
    return {
      canSubmitProof: true,
      canReplaceProof: true,
      blocksNewSubmission: false,
      reason: "PROOF_NEEDS_MORE_INFO",
      userFacingMessage: "Upload clearer proof so review can continue.",
    };
  }

  if (proofResubmissionAllowedStatuses.has(proofStatus) && proofStatus === "REJECTED") {
    return {
      canSubmitProof: true,
      canReplaceProof: true,
      blocksNewSubmission: false,
      reason: "PROOF_REJECTED",
      userFacingMessage: "Upload valid proof before this ride can continue.",
    };
  }

  if (activeProofStatuses.has(proofStatus)) {
    return {
      canSubmitProof: false,
      canReplaceProof: false,
      blocksNewSubmission: true,
      reason: "ACTIVE_PROOF_EXISTS",
      userFacingMessage: "Proof already submitted.",
    };
  }

  if (proofStatus === "FRAUD_SUSPECTED") {
    return {
      canSubmitProof: false,
      canReplaceProof: false,
      blocksNewSubmission: true,
      reason: "SUSPICIOUS_PROOF_REVIEW",
      userFacingMessage: "Proof needs manual review before another upload can replace it.",
    };
  }

  return {
    canSubmitProof: false,
    canReplaceProof: false,
    blocksNewSubmission: true,
    reason: "UNKNOWN_PROOF_STATUS",
    userFacingMessage: "Proof status needs review before another upload can replace it.",
  };
}

export function canSubmitReplacementProof(existingProof?: Pick<RidePodProofRow, "proof_status"> | null) {
  return getProofReplacementPolicy(existingProof).canSubmitProof;
}

export function canReplaceProof(proof?: CanReplaceProofInput | null): CanReplaceProofResult {
  switch (proof?.proofStatus) {
    case "NEEDS_MORE_INFO":
      return {
        canReplace: true,
        reason: "Upload a clearer proof.",
        ctaLabel: "Upload replacement proof",
      };
    case "REJECTED":
      return {
        canReplace: true,
        reason: "Upload valid proof to continue.",
        ctaLabel: "Upload new proof",
      };
    case "SUBMITTED":
      return {
        canReplace: false,
        reason: "Proof already submitted.",
      };
    case "UNDER_REVIEW":
      return {
        canReplace: false,
        reason: "Proof is under review.",
      };
    case "VERIFIED":
      return {
        canReplace: false,
        reason: "Proof already verified.",
      };
    case "FRAUD_SUSPECTED":
      return {
        canReplace: false,
        reason: "Proof is under admin review.",
      };
    case "NEEDED":
      return {
        canReplace: true,
        reason: "Proof is required.",
        ctaLabel: "Upload proof",
      };
    default:
      return {
        canReplace: false,
        reason: "Proof status is unknown.",
      };
  }
}

function proofTimestampValue(proof: CurrentProofSelectionInput) {
  const timestamp = proof.submittedAt || proof.reviewedAt;
  if (!timestamp) return null;

  const value = Date.parse(timestamp);
  return Number.isFinite(value) ? value : null;
}

export function getCurrentProofForRideInstance<TProof extends CurrentProofSelectionInput>(
  proofs: readonly TProof[],
  proofType: RideInstanceProofMetadataInput["proofType"],
): TProof | null {
  const matchingProofs = proofs.filter((proof) => proof.proofType === proofType);
  if (matchingProofs.length === 0) return null;

  const currentProofs = matchingProofs.filter((proof) => proof.isCurrent === true);
  if (currentProofs.length > 0) {
    // TODO: enforce a single current proof in schema once proof versioning lands.
    return chooseLatestStableProof(currentProofs);
  }

  const unsupersededProofs = matchingProofs.filter((proof) => !proof.supersededAt);
  const candidateProofs = unsupersededProofs.length > 0 ? unsupersededProofs : matchingProofs;
  const realProofs = candidateProofs.filter((proof) => proof.proofStatus !== "NEEDED");

  return chooseHighestPriorityProof(realProofs.length > 0 ? realProofs : candidateProofs);
}

function chooseLatestStableProof<TProof extends CurrentProofSelectionInput>(proofs: readonly TProof[]) {
  return proofs.reduce<TProof | null>((selectedProof, proof) => {
    if (!selectedProof) return proof;

    const selectedTimestamp = proofTimestampValue(selectedProof);
    const proofTimestamp = proofTimestampValue(proof);

    if (proofTimestamp === null && selectedTimestamp === null) return proof;
    if (proofTimestamp === null) return selectedProof;
    if (selectedTimestamp === null) return proof;

    return proofTimestamp >= selectedTimestamp ? proof : selectedProof;
  }, null);
}

function chooseHighestPriorityProof<TProof extends CurrentProofSelectionInput>(proofs: readonly TProof[]) {
  return proofs.reduce<TProof | null>((selectedProof, proof) => {
    if (!selectedProof) return proof;

    const selectedPriority = proofStatusPriority.get(selectedProof.proofStatus || "") ?? 0;
    const proofPriority = proofStatusPriority.get(proof.proofStatus || "") ?? 0;

    if (proofPriority !== selectedPriority) {
      return proofPriority > selectedPriority ? proof : selectedProof;
    }

    const selectedTimestamp = proofTimestampValue(selectedProof);
    const proofTimestamp = proofTimestampValue(proof);

    if (proofTimestamp === null && selectedTimestamp === null) return proof;
    if (proofTimestamp === null) return selectedProof;
    if (selectedTimestamp === null) return proof;

    return proofTimestamp >= selectedTimestamp ? proof : selectedProof;
  }, null);
}

function createMockProof(input: RideInstanceProofMetadataInput): RidePodProofRow {
  return {
    id: `mock-proof-${input.rideInstanceId}-${input.proofType}`,
    ride_instance_id: input.rideInstanceId,
    uploaded_by_user_id: null,
    proof_type: input.proofType,
    proof_status: "SUBMITTED",
    amount_cents: input.amountCents,
    file_url: input.fileUrl ?? `mock://proofs/${input.rideInstanceId}/${input.proofType}`,
    provider_name: input.providerName ?? null,
    certification_accepted: true,
    certification_text_version: input.certificationTextVersion,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
    admin_notes: null,
  };
}

function validateProofInput(input: RideInstanceProofMetadataInput) {
  if (!input.rideInstanceId) throw new Error("rideInstanceId is required.");
  if (!input.proofType) throw new Error("proofType is required.");
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("amountCents must be greater than zero.");
  }
  if (!input.certificationAccepted) {
    throw new Error("Proof certification is required.");
  }
}

function validateProofTypeForRideOption(proofType: RideInstanceProofMetadataInput["proofType"], rideOption: RideOptionForProof) {
  if (rideOption === "TAXI_METER" && proofType !== "METER_PROOF") {
    throw new Error("Taxi meter rides only accept meter proof after the ride.");
  }

  if (rideOption === "RIDE_APP_FIXED_QUOTE" && proofType === "METER_PROOF") {
    throw new Error("Ride app / fixed quote rides do not accept meter proof.");
  }
}

async function getCurrentUserId() {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.getUser();

  if (error || !data.user?.id) return null;
  return data.user.id;
}

async function getRideContextForProof(
  rideInstanceId: string,
): Promise<{ rideOption: RideOptionForProof; bookingFareCapCents: number | null }> {
  const client = getSupabaseBrowserClient();
  const rideInstanceResult = await client
    .from("ride_instances")
    .select("pod_id, booking_fare_cap_cents")
    .eq("id", rideInstanceId)
    .maybeSingle();

  if (rideInstanceResult.error || !rideInstanceResult.data?.pod_id) {
    return { rideOption: "UNKNOWN", bookingFareCapCents: null };
  }

  const podResult = await client
    .from("pods")
    .select("ride_option")
    .eq("id", rideInstanceResult.data.pod_id)
    .maybeSingle();

  if (podResult.error || !podResult.data?.ride_option) {
    return { rideOption: "UNKNOWN", bookingFareCapCents: rideInstanceResult.data.booking_fare_cap_cents };
  }

  return {
    rideOption: podResult.data.ride_option,
    bookingFareCapCents: rideInstanceResult.data.booking_fare_cap_cents,
  };
}

async function findExistingActiveProof(input: RideInstanceProofMetadataInput) {
  const client = getSupabaseBrowserClient();
  const result = await client
    .from("proofs")
    .select("*")
    .eq("ride_instance_id", input.rideInstanceId)
    .eq("proof_type", input.proofType)
    .order("submitted_at", { ascending: false });

  if (result.error) return null;
  return result.data?.find((proof) => activeProofStatuses.has(proof.proof_status)) ?? null;
}

function mockSubmit(input: RideInstanceProofMetadataInput, fallbackNote: string): RideInstanceProofMetadataResult {
  const normalizedRideInstanceStatus = getRideInstanceStatusForProofType(input.proofType);
  return {
    source: "mock",
    proof: createMockProof(input),
    normalizedProofStatus: "SUBMITTED",
    normalizedRideInstanceStatus,
    duplicate: false,
    aboveCap: false,
    reviewRequired: false,
    reviewCase: null,
    adminReviewCaseCreated: false,
    adminReviewCaseFailed: false,
    userFacingMessage: getSubmittedMessage(input.proofType),
    statusUpdateFailed: false,
    fallbackNote,
  };
}

function getRideInstanceStatusForProofType(
  proofType: RideInstanceProofMetadataInput["proofType"],
): RideInstanceStatusAfterProofSubmit {
  if (proofType === "QUOTE_SCREENSHOT") return "QUOTE_UNDER_REVIEW";
  return "PROOF_UNDER_REVIEW";
}

function getSubmittedMessage(proofType: RideInstanceProofMetadataInput["proofType"], aboveCap = false) {
  if (proofType === "QUOTE_SCREENSHOT" && aboveCap) {
    return "Quote above booking fare cap. Guests may need to approve a higher max.";
  }

  if (proofType === "QUOTE_SCREENSHOT") return "Quote submitted. RidePod will review it before booking.";
  if (proofType === "METER_PROOF") return "Meter proof submitted. RidePod will review it before settlement.";
  return "Receipt submitted. RidePod will review it before settlement.";
}

function isAboveBookingFareCap(proofAmountCents: number, bookingFareCapCents?: number | null) {
  return typeof bookingFareCapCents === "number" && proofAmountCents > bookingFareCapCents;
}

function getManualReviewMessage(reviewCaseType?: AdminReviewCaseTypeForProof) {
  if (reviewCaseType === "SUSPICIOUS_PROOF") {
    return "Proof needs manual review before settlement can continue.";
  }

  return "Fare above booking fare cap. This needs manual review.";
}

function shouldCreateAdminReviewCaseForProof(
  input: RideInstanceProofMetadataInput,
  proofStatus: string,
  bookingFareCapCents?: number | null,
) {
  return Boolean(
    input.suspiciousReason ||
      proofStatus === "FRAUD_SUSPECTED" ||
      isAboveBookingFareCap(input.amountCents, bookingFareCapCents),
  );
}

function suspiciousReasonForProof(input: RideInstanceProofMetadataInput, proofStatus: string) {
  if (input.suspiciousReason) return input.suspiciousReason;
  if (proofStatus === "FRAUD_SUSPECTED") return "Proof was flagged as suspicious and needs manual review.";
  return undefined;
}

function getAdminReviewTriggerForProof(input: AdminReviewCaseForProofInput): {
  caseType: AdminReviewCaseTypeForProof;
  title: string;
  description: string;
  severity: AdminReviewSeverityForProof;
} | null {
  if (input.suspiciousReason) {
    return {
      caseType: "SUSPICIOUS_PROOF",
      title: "Suspicious proof",
      description: input.suspiciousReason || "Proof was flagged as suspicious and needs manual review.",
      severity: "CRITICAL",
    };
  }

  if (!isAboveBookingFareCap(input.proofAmountCents, input.bookingFareCapCents)) return null;

  if (input.proofType === "QUOTE_SCREENSHOT") {
    return {
      caseType: "QUOTE_ABOVE_CAP",
      title: "Quote above booking fare cap",
      description: "Submitted quote is above the booking fare cap and needs review or higher max approval.",
      severity: "HIGH",
    };
  }

  if (input.proofType === "FINAL_RECEIPT") {
    return {
      caseType: "RECEIPT_ABOVE_CAP",
      title: "Receipt above booking fare cap",
      description:
        "Final receipt is above the booking fare cap. Guests cannot be charged above max unless they approve an increase.",
      severity: "HIGH",
    };
  }

  return {
    caseType: "METER_PROOF_ABOVE_CAP",
    title: "Meter proof above booking fare cap",
    description: "Taxi meter proof is above the booking fare cap and needs manual review.",
    severity: "HIGH",
  };
}

function createMockAdminReviewCase(
  input: AdminReviewCaseForProofInput,
  trigger: NonNullable<ReturnType<typeof getAdminReviewTriggerForProof>>,
): RidePodAdminReviewCaseRow {
  return {
    id: `mock-review-${input.rideInstanceId}-${input.proofId}-${trigger.caseType}`,
    ride_instance_id: input.rideInstanceId,
    proof_id: input.proofId,
    settlement_id: null,
    review_state: "OPEN",
    case_type: trigger.caseType,
    severity: trigger.severity,
    title: trigger.title,
    description: trigger.description,
    created_at: new Date().toISOString(),
    resolved_at: null,
    admin_notes: null,
  };
}

async function findExistingOpenAdminReviewCase(input: AdminReviewCaseForProofInput, caseType: AdminReviewCaseTypeForProof) {
  const client = getSupabaseBrowserClient();
  const result = await client
    .from("admin_review_cases")
    .select("*")
    .eq("ride_instance_id", input.rideInstanceId)
    .eq("proof_id", input.proofId)
    .eq("case_type", caseType)
    .in("review_state", openAdminReviewStates)
    .order("created_at", { ascending: false })
    .limit(1);

  if (result.error) return null;
  return result.data?.[0] ?? null;
}

export async function createAdminReviewCaseForProofIfNeeded(
  input: AdminReviewCaseForProofInput,
): Promise<AdminReviewCaseForProofResult> {
  const trigger = getAdminReviewTriggerForProof(input);
  if (!trigger) {
    return {
      createdCase: null,
      existingCase: null,
      reviewRequired: false,
      persisted: false,
      failed: false,
    };
  }

  validateProofTypeForRideOption(input.proofType, input.rideOption);

  const existingCase = await findExistingOpenAdminReviewCase(input, trigger.caseType);
  if (existingCase) {
    return {
      createdCase: null,
      existingCase,
      reviewRequired: true,
      caseType: trigger.caseType,
      severity: trigger.severity,
      persisted: true,
      failed: false,
    };
  }

  const client = getSupabaseBrowserClient();
  const insertResult = await client
    .from("admin_review_cases")
    .insert({
      ride_instance_id: input.rideInstanceId,
      proof_id: input.proofId,
      review_state: "OPEN",
      case_type: trigger.caseType,
      severity: trigger.severity,
      title: trigger.title,
      description: trigger.description,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  // TODO: Create server action/RPC for admin review case creation.
  // TODO: Log ADMIN_REVIEW_CASE_CREATED, PROOF_ABOVE_CAP_REVIEW_CREATED, and SUSPICIOUS_PROOF_REVIEW_CREATED once audit writes move server-side.
  if (insertResult.error || !insertResult.data) {
    return {
      createdCase: createMockAdminReviewCase(input, trigger),
      existingCase: null,
      reviewRequired: true,
      caseType: trigger.caseType,
      severity: trigger.severity,
      persisted: false,
      failed: true,
    };
  }

  return {
    createdCase: insertResult.data,
    existingCase: null,
    reviewRequired: true,
    caseType: trigger.caseType,
    severity: trigger.severity,
    persisted: true,
    failed: false,
  };
}

export async function updateRideInstanceStatusAfterProofSubmit(
  input: RideInstanceStatusAfterProofSubmitInput,
): Promise<RideInstanceStatusAfterProofSubmitResult> {
  if (!input.rideInstanceId) throw new Error("rideInstanceId is required.");
  if (!input.proofType) throw new Error("proofType is required.");
  if (!Number.isFinite(input.proofAmountCents) || input.proofAmountCents <= 0) {
    throw new Error("proofAmountCents must be greater than zero.");
  }

  validateProofTypeForRideOption(input.proofType, input.rideOption);

  const client = getSupabaseBrowserClient();
  const normalizedRideInstanceStatus = getRideInstanceStatusForProofType(input.proofType);
  const aboveCap = isAboveBookingFareCap(input.proofAmountCents, input.bookingFareCapCents);
  const result = await client
    .from("ride_instances")
    .update({
      instance_status: normalizedRideInstanceStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.rideInstanceId)
    .select("*")
    .maybeSingle();

  // TODO: RLS update policy may need adjustment for host ride instance status updates if this is blocked.
  // TODO: Create admin review case for above-cap quote in SQL-2G.
  // TODO: Above-cap proof should create admin review case in later slice.
  // TODO: Log RIDE_INSTANCE_STATUS_UPDATED_AFTER_PROOF and RIDE_INSTANCE_PROOF_ABOVE_CAP once audit helpers are wired.
  if (result.error || !result.data) {
    return {
      source: "supabase",
      rideInstance: null,
      normalizedRideInstanceStatus,
      aboveCap,
      reviewRequired: aboveCap,
      userFacingMessage: "Proof was submitted, but ride status could not be updated. Try refreshing.",
      statusUpdateFailed: true,
    };
  }

  return {
    source: "supabase",
    rideInstance: result.data,
    normalizedRideInstanceStatus,
    aboveCap,
    reviewRequired: aboveCap,
    userFacingMessage:
      aboveCap && input.proofType !== "QUOTE_SCREENSHOT"
        ? "Fare above booking fare cap. Guests cannot be charged above their max unless they approve an increase. This may need manual review."
        : getSubmittedMessage(input.proofType, aboveCap),
    statusUpdateFailed: false,
  };
}

export async function submitRideInstanceProofMetadata(
  input: RideInstanceProofMetadataInput,
): Promise<RideInstanceProofMetadataResult> {
  validateProofInput(input);

  try {
    const uploadedByUserId = await getCurrentUserId();
    if (!uploadedByUserId) {
      // TODO: replace mock fallback with a real demo-auth/session path once auth is wired.
      return mockSubmit(input, "Supabase not configured; using mock proof submission.");
    }

    const rideContext = await getRideContextForProof(input.rideInstanceId);
    const rideOption = rideContext.rideOption;
    validateProofTypeForRideOption(input.proofType, rideOption);

    const existingProof = await findExistingActiveProof(input);
    if (existingProof) {
      const existingVerified = existingProof.proof_status === "VERIFIED";
      const statusResult = existingVerified || rideOption === "UNKNOWN"
        ? null
        : await updateRideInstanceStatusAfterProofSubmit({
            rideInstanceId: input.rideInstanceId,
            proofType: input.proofType,
            proofAmountCents: input.amountCents,
            bookingFareCapCents: rideContext.bookingFareCapCents,
            rideOption,
          });
      const reviewResult = rideOption === "UNKNOWN" ||
        !shouldCreateAdminReviewCaseForProof(input, existingProof.proof_status, rideContext.bookingFareCapCents)
        ? null
        : await createAdminReviewCaseForProofIfNeeded({
            rideInstanceId: input.rideInstanceId,
            proofId: existingProof.id,
            proofType: input.proofType,
            proofAmountCents: input.amountCents,
            bookingFareCapCents: rideContext.bookingFareCapCents,
            rideOption,
            suspiciousReason: suspiciousReasonForProof(input, existingProof.proof_status),
            submittedByUserId: uploadedByUserId,
          });
      const aboveCap = statusResult?.aboveCap ?? isAboveBookingFareCap(input.amountCents, rideContext.bookingFareCapCents);

      return {
        source: "supabase",
        proof: existingProof,
        normalizedProofStatus: "SUBMITTED",
        normalizedRideInstanceStatus: statusResult?.normalizedRideInstanceStatus ?? getRideInstanceStatusForProofType(input.proofType),
        duplicate: true,
        aboveCap,
        reviewRequired: Boolean(reviewResult?.reviewRequired || statusResult?.reviewRequired || aboveCap),
        reviewCase: reviewResult?.existingCase ?? reviewResult?.createdCase ?? null,
        adminReviewCaseCreated: Boolean(reviewResult?.createdCase),
        adminReviewCaseFailed: Boolean(reviewResult?.failed),
        userFacingMessage: reviewResult?.reviewRequired
          ? getManualReviewMessage(reviewResult.caseType)
          : statusResult?.userFacingMessage ?? "Proof already submitted.",
        statusUpdateFailed: statusResult?.statusUpdateFailed ?? false,
        fallbackNote: null,
      };
    }

    const client = getSupabaseBrowserClient();
    const placeholderFileUrl = input.fileUrl ?? `mock://proofs/${input.rideInstanceId}/${input.proofType}`;
    const result = await client
      .from("proofs")
      .insert({
        ride_instance_id: input.rideInstanceId,
        uploaded_by_user_id: uploadedByUserId,
        proof_type: input.proofType,
        proof_status: "SUBMITTED",
        amount_cents: input.amountCents,
        file_url: placeholderFileUrl,
        provider_name: input.providerName ?? null,
        certification_accepted: input.certificationAccepted,
        certification_text_version: input.certificationTextVersion,
        submitted_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (result.error || !result.data) {
      throw new ProofMetadataSubmitError("Couldn't submit proof. Try again later.");
    }

    const statusResult = rideOption === "UNKNOWN"
      ? null
      : await updateRideInstanceStatusAfterProofSubmit({
          rideInstanceId: input.rideInstanceId,
          proofType: input.proofType,
          proofAmountCents: input.amountCents,
          bookingFareCapCents: rideContext.bookingFareCapCents,
          rideOption,
        });
    const reviewResult = rideOption === "UNKNOWN" ||
      !shouldCreateAdminReviewCaseForProof(input, result.data.proof_status, rideContext.bookingFareCapCents)
      ? null
      : await createAdminReviewCaseForProofIfNeeded({
          rideInstanceId: input.rideInstanceId,
          proofId: result.data.id,
          proofType: input.proofType,
          proofAmountCents: input.amountCents,
          bookingFareCapCents: rideContext.bookingFareCapCents,
          rideOption,
          suspiciousReason: suspiciousReasonForProof(input, result.data.proof_status),
          submittedByUserId: uploadedByUserId,
        });
    const aboveCap = statusResult?.aboveCap ?? isAboveBookingFareCap(input.amountCents, rideContext.bookingFareCapCents);

    return {
      source: "supabase",
      proof: result.data,
      normalizedProofStatus: "SUBMITTED",
      normalizedRideInstanceStatus: statusResult?.normalizedRideInstanceStatus ?? getRideInstanceStatusForProofType(input.proofType),
      duplicate: false,
      aboveCap,
      reviewRequired: Boolean(reviewResult?.reviewRequired || statusResult?.reviewRequired || aboveCap),
      reviewCase: reviewResult?.existingCase ?? reviewResult?.createdCase ?? null,
      adminReviewCaseCreated: Boolean(reviewResult?.createdCase),
      adminReviewCaseFailed: Boolean(reviewResult?.failed),
      userFacingMessage: reviewResult?.reviewRequired
        ? getManualReviewMessage(reviewResult.caseType)
        : statusResult?.userFacingMessage ?? getSubmittedMessage(input.proofType),
      statusUpdateFailed: statusResult?.statusUpdateFailed ?? false,
      fallbackNote: null,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error instanceof ProofMetadataSubmitError ||
        error.message.includes("Taxi meter rides only accept") ||
        error.message.includes("Ride app / fixed quote rides do not accept"))
    ) {
      throw error;
    }

    return mockSubmit(input, "Supabase not configured; using mock proof submission.");
  }
}
