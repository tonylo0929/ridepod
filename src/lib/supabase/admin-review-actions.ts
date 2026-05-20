import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  RidePodAdminReviewCaseRow,
  RidePodEventRow,
  RidePodProfileRow,
  RidePodProofRow,
  RidePodRideInstanceRow,
  RidePodSettlementRow,
} from "@/lib/supabase/types";

export type AdminReviewAction =
  | "APPROVE_PROOF"
  | "REQUEST_MORE_INFO"
  | "REJECT_PROOF"
  | "HOLD_PAYOUT"
  | "APPROVE_VERIFICATION"
  | "REJECT_VERIFICATION";

export type ApplyAdminReviewActionInput = {
  caseId: string;
  action: AdminReviewAction;
  adminNotes?: string;
  adminUserId?: string;
};

export type ApplyAdminReviewActionResult = {
  ok: boolean;
  source: "supabase" | "mock";
  validationError: string | null;
  updatedReviewCase: RidePodAdminReviewCaseRow | null;
  updatedProof: RidePodProofRow | null;
  updatedRideInstance: RidePodRideInstanceRow | null;
  updatedSettlement: RidePodSettlementRow | null;
  updatedProfile: RidePodProfileRow | null;
  auditEvent: RidePodEventRow | null;
  userFacingMessage: string;
  fallbackNote: string | null;
};

const requiredNotesActions = new Set<AdminReviewAction>(["REQUEST_MORE_INFO", "REJECT_PROOF", "HOLD_PAYOUT", "REJECT_VERIFICATION"]);

function notesAreMissing(input: ApplyAdminReviewActionInput) {
  return requiredNotesActions.has(input.action) && !input.adminNotes?.trim();
}

function nowIso() {
  return new Date().toISOString();
}

function statusForRejectedProof(proofType: RidePodProofRow["proof_type"] | undefined) {
  if (proofType === "QUOTE_SCREENSHOT") return "QUOTE_NEEDED";
  if (proofType === "METER_PROOF") return "METER_PROOF_NEEDED";
  return "RECEIPT_NEEDED";
}

function statusForNeedsMoreInfo(proofType: RidePodProofRow["proof_type"] | undefined) {
  if (proofType === "QUOTE_SCREENSHOT") return "QUOTE_UNDER_REVIEW";
  return "PROOF_UNDER_REVIEW";
}

function statusForApprovedProof(
  proof: RidePodProofRow | null,
  rideInstance: RidePodRideInstanceRow | null,
) {
  if (proof?.proof_type === "QUOTE_SCREENSHOT") {
    const proofAmount = proof.amount_cents ?? 0;
    const fareCap = rideInstance?.booking_fare_cap_cents ?? 0;
    return proofAmount > fareCap ? "QUOTE_UNDER_REVIEW" : "READY_TO_BOOK";
  }

  if (proof?.proof_type === "FINAL_RECEIPT" || proof?.proof_type === "METER_PROOF") {
    return "SETTLEMENT_READY";
  }

  return null;
}

function messageForAction(
  action: AdminReviewAction,
  proof: RidePodProofRow | null,
  rideInstance: RidePodRideInstanceRow | null,
) {
  if (action === "APPROVE_PROOF") {
    if (proof?.proof_type === "QUOTE_SCREENSHOT") {
      const proofAmount = proof.amount_cents ?? 0;
      const fareCap = rideInstance?.booking_fare_cap_cents ?? 0;
      return proofAmount > fareCap
        ? "Quote is above cap. Higher max approval is still required."
        : "Quote approved. Host can book this ride.";
    }
    if (proof?.proof_type === "METER_PROOF") return "Meter proof approved. Settlement can continue.";
    if (proof?.proof_type === "FINAL_RECEIPT") return "Receipt approved. Settlement can continue.";
    return "Proof approved. Settlement can continue.";
  }

  if (action === "REQUEST_MORE_INFO") {
    if (proof?.proof_type === "QUOTE_SCREENSHOT") return "More quote information is required.";
    if (proof?.proof_type === "METER_PROOF") return "More meter proof information is required.";
    if (proof?.proof_type === "FINAL_RECEIPT") return "More receipt information is required.";
    return "More information is required before settlement can continue.";
  }

  if (action === "REJECT_PROOF") {
    if (proof?.proof_type === "QUOTE_SCREENSHOT") {
      return "Quote rejected. Host must upload valid quote proof before booking.";
    }
    if (proof?.proof_type === "METER_PROOF") {
      return "Meter proof rejected. Host must upload valid meter proof before settlement.";
    }
    if (proof?.proof_type === "FINAL_RECEIPT") {
      return "Receipt rejected. Host must upload valid receipt proof before settlement.";
    }
    return "Proof rejected. Valid proof is required before settlement can continue.";
  }

  return "Payout held for manual review.";
}

function eventTypeForAction(action: AdminReviewAction) {
  if (action === "APPROVE_PROOF") return "ADMIN_PROOF_APPROVED";
  if (action === "REQUEST_MORE_INFO") return "ADMIN_MORE_INFO_REQUESTED";
  if (action === "REJECT_PROOF") return "ADMIN_PROOF_REJECTED";
  if (action === "APPROVE_VERIFICATION") return "ADMIN_ID_VERIFICATION_APPROVED";
  if (action === "REJECT_VERIFICATION") return "ADMIN_ID_VERIFICATION_REJECTED";
  return "ADMIN_PAYOUT_HELD";
}

function mockActionResult(input: ApplyAdminReviewActionInput, fallbackNote: string): ApplyAdminReviewActionResult {
  const timestamp = nowIso();
  const reviewState =
    input.action === "APPROVE_PROOF" || input.action === "APPROVE_VERIFICATION"
      ? "APPROVED"
      : input.action === "REQUEST_MORE_INFO"
        ? "NEEDS_MORE_INFO"
        : input.action === "REJECT_PROOF" || input.action === "REJECT_VERIFICATION"
          ? "REJECTED"
          : "UNDER_REVIEW";

  return {
    ok: true,
    source: "mock",
    validationError: null,
    updatedReviewCase: {
      id: input.caseId,
      ride_instance_id: null,
      proof_id: null,
      settlement_id: null,
      subject_user_id: null,
      review_state: reviewState,
      case_type: "MOCK_ADMIN_ACTION",
      severity: "MEDIUM",
      title: "Mock admin action",
      description: null,
      created_at: timestamp,
      resolved_at:
        input.action === "APPROVE_PROOF" ||
        input.action === "REJECT_PROOF" ||
        input.action === "APPROVE_VERIFICATION" ||
        input.action === "REJECT_VERIFICATION"
          ? timestamp
          : null,
      admin_notes: input.adminNotes?.trim() || null,
    },
    updatedProof: null,
    updatedRideInstance: null,
    updatedSettlement: null,
    updatedProfile: null,
    auditEvent: null,
    userFacingMessage:
      input.action === "APPROVE_VERIFICATION"
        ? "Manual verification approved."
        : input.action === "REJECT_VERIFICATION"
          ? "Manual verification rejected."
          : input.action === "APPROVE_PROOF"
        ? "Proof approved. Settlement can continue."
        : input.action === "REQUEST_MORE_INFO"
          ? "More information is required before settlement can continue."
          : input.action === "REJECT_PROOF"
            ? "Proof rejected. Valid proof is required before settlement can continue."
            : "Payout is held for manual review.",
    fallbackNote,
  };
}

async function maybeWriteAdminEvent(input: {
  caseId: string;
  action: AdminReviewAction;
  adminNotes: string | null;
  adminUserId?: string;
  previousState: string | null;
  newState: string | null;
  rideInstance: RidePodRideInstanceRow | null;
  reviewCase: RidePodAdminReviewCaseRow | null;
  proof: RidePodProofRow | null;
}) {
  const client = getSupabaseAdminClient();
  const eventPayload = {
    caseId: input.caseId,
    proofId: input.proof?.id ?? input.reviewCase?.proof_id ?? null,
    action: input.action,
    adminUserId: input.adminUserId ?? null,
    adminNotes: input.adminNotes,
    previousState: input.previousState,
    newState: input.newState,
  };
  const result = await client
    .from("pod_events")
    .insert({
      pod_id: input.rideInstance?.pod_id ?? null,
      ride_instance_id: input.rideInstance?.id ?? input.reviewCase?.ride_instance_id ?? null,
      user_id: input.adminUserId ?? null,
      event_type: eventTypeForAction(input.action),
      event_payload: eventPayload,
      created_at: nowIso(),
    })
    .select("*")
    .maybeSingle();

  // TODO: Route audit writes through a durable server audit helper once the event model settles.
  return result.error ? null : result.data;
}

export async function applyAdminReviewAction(
  input: ApplyAdminReviewActionInput,
): Promise<ApplyAdminReviewActionResult> {
  if (!input.caseId) {
    return {
      ok: false,
      source: "mock",
      validationError: "Review case is required.",
      updatedReviewCase: null,
      updatedProof: null,
      updatedRideInstance: null,
      updatedSettlement: null,
      updatedProfile: null,
      auditEvent: null,
      userFacingMessage: "Couldn't apply admin action. Try again later.",
      fallbackNote: null,
    };
  }

  if (notesAreMissing(input)) {
    return {
      ok: false,
      source: "mock",
      validationError: "Admin notes are required for this action.",
      updatedReviewCase: null,
      updatedProof: null,
      updatedRideInstance: null,
      updatedSettlement: null,
      updatedProfile: null,
      auditEvent: null,
      userFacingMessage: "Admin notes are required for this action.",
      fallbackNote: null,
    };
  }

  try {
    const client = getSupabaseAdminClient();
    const timestamp = nowIso();
    const adminNotes = input.adminNotes?.trim() || null;
    const reviewResult = await client
      .from("admin_review_cases")
      .select("*")
      .eq("id", input.caseId)
      .maybeSingle();

    if (reviewResult.error || !reviewResult.data) {
      return {
        ok: false,
        source: "supabase",
        validationError: null,
        updatedReviewCase: null,
        updatedProof: null,
        updatedRideInstance: null,
        updatedSettlement: null,
        updatedProfile: null,
        auditEvent: null,
        userFacingMessage: "Couldn't apply admin action. Try again later.",
        fallbackNote: null,
      };
    }

    const reviewCase = reviewResult.data;
    if (reviewCase.case_type === "ID_VERIFICATION_REQUEST") {
      if (!["APPROVE_VERIFICATION", "REJECT_VERIFICATION", "REQUEST_MORE_INFO"].includes(input.action)) {
        return {
          ok: false,
          source: "supabase",
          validationError: "This action is not available for ID verification requests.",
          updatedReviewCase: null,
          updatedProof: null,
          updatedRideInstance: null,
          updatedSettlement: null,
          updatedProfile: null,
          auditEvent: null,
          userFacingMessage: "Couldn't apply admin action. Try again later.",
          fallbackNote: null,
        };
      }

      if (!reviewCase.subject_user_id) {
        return {
          ok: false,
          source: "supabase",
          validationError: "Verification request user is required.",
          updatedReviewCase: null,
          updatedProof: null,
          updatedRideInstance: null,
          updatedSettlement: null,
          updatedProfile: null,
          auditEvent: null,
          userFacingMessage: "Couldn't apply admin action. Try again later.",
          fallbackNote: null,
        };
      }

      const reviewPatch: Partial<RidePodAdminReviewCaseRow> = {
        admin_notes: adminNotes,
        review_state:
          input.action === "APPROVE_VERIFICATION"
            ? "APPROVED"
            : input.action === "REJECT_VERIFICATION"
              ? "REJECTED"
              : "NEEDS_MORE_INFO",
        resolved_at:
          input.action === "APPROVE_VERIFICATION" || input.action === "REJECT_VERIFICATION"
            ? timestamp
            : null,
      };

      const updatedReviewCaseResult = await client
        .from("admin_review_cases")
        .update(reviewPatch)
        .eq("id", input.caseId)
        .select("*")
        .maybeSingle();

      if (updatedReviewCaseResult.error || !updatedReviewCaseResult.data) {
        throw new Error("Review case update failed.");
      }

      const profilePatch: Partial<RidePodProfileRow> =
        input.action === "APPROVE_VERIFICATION"
          ? {
              id_verification_status: "VERIFIED",
              id_verified_at: timestamp,
              verification_status: "ID_VERIFIED",
              manually_verified_by: input.adminUserId ?? null,
              updated_at: timestamp,
            }
          : input.action === "REJECT_VERIFICATION"
            ? {
                id_verification_status: "REJECTED",
                updated_at: timestamp,
              }
            : {
                id_verification_status: "UNDER_REVIEW",
                updated_at: timestamp,
              };

      const updatedProfileResult = await client
        .from("profiles")
        .update(profilePatch)
        .eq("id", reviewCase.subject_user_id)
        .select("*")
        .maybeSingle();

      if (updatedProfileResult.error || !updatedProfileResult.data) {
        throw new Error("Profile update failed.");
      }

      const auditEvent = await maybeWriteAdminEvent({
        caseId: input.caseId,
        action: input.action,
        adminNotes,
        adminUserId: input.adminUserId,
        previousState: reviewCase.review_state,
        newState: updatedReviewCaseResult.data.review_state,
        rideInstance: null,
        reviewCase: updatedReviewCaseResult.data,
        proof: null,
      });

      return {
        ok: true,
        source: "supabase",
        validationError: null,
        updatedReviewCase: updatedReviewCaseResult.data,
        updatedProof: null,
        updatedRideInstance: null,
        updatedSettlement: null,
        updatedProfile: updatedProfileResult.data,
        auditEvent,
        userFacingMessage:
          input.action === "APPROVE_VERIFICATION"
            ? "Manual verification approved."
            : input.action === "REJECT_VERIFICATION"
              ? "Manual verification rejected."
              : "More information is required before verification can continue.",
        fallbackNote: null,
      };
    }

    const [proofResult, rideInstanceResult] = await Promise.all([
      reviewCase.proof_id
        ? client.from("proofs").select("*").eq("id", reviewCase.proof_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      reviewCase.ride_instance_id
        ? client.from("ride_instances").select("*").eq("id", reviewCase.ride_instance_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const proof = proofResult.data ?? null;
    const rideInstance = rideInstanceResult.data ?? null;
    const settlementId = reviewCase.settlement_id ?? rideInstance?.settlement_id ?? null;
    const settlementResult = settlementId
      ? await client.from("settlements").select("*").eq("id", settlementId).maybeSingle()
      : { data: null, error: null };
    const settlement = settlementResult.data ?? null;

    const reviewPatch: Partial<RidePodAdminReviewCaseRow> = {
      admin_notes: adminNotes,
    };
    if (input.action === "APPROVE_PROOF") {
      reviewPatch.review_state = "APPROVED";
      reviewPatch.resolved_at = timestamp;
    } else if (input.action === "REQUEST_MORE_INFO") {
      reviewPatch.review_state = "NEEDS_MORE_INFO";
    } else if (input.action === "REJECT_PROOF") {
      reviewPatch.review_state = "REJECTED";
      reviewPatch.resolved_at = timestamp;
    } else {
      reviewPatch.review_state = "UNDER_REVIEW";
    }

    const updatedReviewCaseResult = await client
      .from("admin_review_cases")
      .update(reviewPatch)
      .eq("id", input.caseId)
      .select("*")
      .maybeSingle();

    if (updatedReviewCaseResult.error || !updatedReviewCaseResult.data) {
      throw new Error("Review case update failed.");
    }

    let updatedProof: RidePodProofRow | null = proof;
    if (proof) {
      const proofPatch: Partial<RidePodProofRow> = {
        admin_notes: adminNotes,
      };
      if (input.action === "APPROVE_PROOF") {
        proofPatch.proof_status = "VERIFIED";
        proofPatch.reviewed_at = timestamp;
      } else if (input.action === "REQUEST_MORE_INFO") {
        proofPatch.proof_status = "NEEDS_MORE_INFO";
      } else if (input.action === "REJECT_PROOF") {
        proofPatch.proof_status = "REJECTED";
        proofPatch.reviewed_at = timestamp;
      }

      if (Object.keys(proofPatch).length) {
        const updatedProofResult = await client
          .from("proofs")
          .update(proofPatch)
          .eq("id", proof.id)
          .select("*")
          .maybeSingle();
        if (updatedProofResult.error || !updatedProofResult.data) throw new Error("Proof update failed.");
        updatedProof = updatedProofResult.data;
      }
    }

    let updatedRideInstance: RidePodRideInstanceRow | null = rideInstance;
    if (rideInstance && proof) {
      const nextStatus =
        input.action === "APPROVE_PROOF"
          ? statusForApprovedProof(proof, rideInstance)
          : input.action === "REQUEST_MORE_INFO"
            ? statusForNeedsMoreInfo(proof.proof_type)
            : input.action === "REJECT_PROOF"
              ? statusForRejectedProof(proof.proof_type)
              : null;

      if (nextStatus) {
        const updatedRideResult = await client
          .from("ride_instances")
          .update({
            instance_status: nextStatus,
            updated_at: timestamp,
          })
          .eq("id", rideInstance.id)
          .select("*")
          .maybeSingle();
        if (updatedRideResult.error || !updatedRideResult.data) throw new Error("Ride instance update failed.");
        updatedRideInstance = updatedRideResult.data;
      }
    }

    let updatedSettlement: RidePodSettlementRow | null = settlement;
    if (settlement && (input.action === "REJECT_PROOF" || input.action === "HOLD_PAYOUT")) {
      const updatedSettlementResult = await client
        .from("settlements")
        .update({
          settlement_state: input.action === "HOLD_PAYOUT" ? "DISPUTE_HOLD" : "ADMIN_REVIEW",
        })
        .eq("id", settlement.id)
        .select("*")
        .maybeSingle();
      if (updatedSettlementResult.error || !updatedSettlementResult.data) {
        throw new Error("Settlement update failed.");
      }
      updatedSettlement = updatedSettlementResult.data;
    }

    const auditEvent = await maybeWriteAdminEvent({
      caseId: input.caseId,
      action: input.action,
      adminNotes,
      adminUserId: input.adminUserId,
      previousState: reviewCase.review_state,
      newState: updatedReviewCaseResult.data.review_state,
      rideInstance: updatedRideInstance,
      reviewCase: updatedReviewCaseResult.data,
      proof: updatedProof,
    });

    return {
      ok: true,
      source: "supabase",
      validationError: null,
      updatedReviewCase: updatedReviewCaseResult.data,
      updatedProof,
      updatedRideInstance,
      updatedSettlement,
      updatedProfile: null,
      auditEvent,
      userFacingMessage:
        input.action === "APPROVE_PROOF" || input.action === "REQUEST_MORE_INFO" || input.action === "REJECT_PROOF"
          ? messageForAction(input.action, proof, rideInstance)
          : "Payout is held for manual review.",
      fallbackNote: null,
    };
  } catch {
    return mockActionResult(input, "Supabase admin action is unavailable; using mock admin action state.");
  }
}
