import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/supabase/auth";

export const MEMBER_SAFETY_CONCERN_TYPES = [
  "SAFETY_CONCERN",
  "HARASSMENT_OR_INAPPROPRIATE_BEHAVIOR",
  "WRONG_PROFILE_OR_ELIGIBILITY_CONCERN",
  "NO_SHOW_OR_UNRELIABLE_BEHAVIOR",
  "OFF_APP_PAYMENT_REQUEST",
  "OTHER",
] as const;

export type MemberSafetyConcernType = (typeof MEMBER_SAFETY_CONCERN_TYPES)[number];

export const memberSafetyConcernLabels: Record<MemberSafetyConcernType, string> = {
  SAFETY_CONCERN: "Safety concern",
  HARASSMENT_OR_INAPPROPRIATE_BEHAVIOR: "Harassment or inappropriate behavior",
  WRONG_PROFILE_OR_ELIGIBILITY_CONCERN: "Wrong profile or eligibility concern",
  NO_SHOW_OR_UNRELIABLE_BEHAVIOR: "No-show or unreliable behavior",
  OFF_APP_PAYMENT_REQUEST: "Off-app payment request",
  OTHER: "Other",
};

export type MemberSafetyReportContext = {
  reporterUserId?: string | null;
  reporterRole?: string | null;
  reportedUserId?: string | null;
  reportedMemberDisplayName?: string | null;
  podId?: string | null;
  podRoute?: string | null;
  rideInstanceId?: string | null;
  rideDateTime?: string | null;
};

export type SubmitMemberSafetyReportInput = MemberSafetyReportContext & {
  concernType?: MemberSafetyConcernType | null;
  description?: string | null;
};

export type SubmitMemberSafetyReportResult = {
  ok: boolean;
  source: "supabase" | "mock";
  validationError: string | null;
  reviewCaseId: string | null;
  userFacingMessage: string;
  confirmationBody: string | null;
  fallbackNote: string | null;
};

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

function isConcernType(value: string | null | undefined): value is MemberSafetyConcernType {
  return MEMBER_SAFETY_CONCERN_TYPES.includes(value as MemberSafetyConcernType);
}

function isUuid(value: string | null | undefined) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function success(source: "supabase" | "mock", reviewCaseId: string | null, fallbackNote: string | null): SubmitMemberSafetyReportResult {
  return {
    ok: true,
    source,
    validationError: null,
    reviewCaseId,
    userFacingMessage: "Report submitted",
    confirmationBody: "RidePod will review this concern. Reports are private.",
    fallbackNote,
  };
}

function failed(validationError: string): SubmitMemberSafetyReportResult {
  return {
    ok: false,
    source: "mock",
    validationError,
    reviewCaseId: null,
    userFacingMessage: validationError,
    confirmationBody: null,
    fallbackNote: null,
  };
}

export function validateMemberSafetyReport(input: SubmitMemberSafetyReportInput, reporterUserId?: string | null) {
  if (!input.reportedUserId) return "Member is required.";
  if (!isConcernType(input.concernType)) return "Choose a concern type.";
  if (!input.description?.trim() || input.description.trim().length < 10) return "Add a short description.";
  if (reporterUserId && input.reportedUserId === reporterUserId) return "You cannot report yourself.";
  return null;
}

function buildReviewDescription(input: SubmitMemberSafetyReportInput, reporterUserId: string) {
  const concernLabel = isConcernType(input.concernType) ? memberSafetyConcernLabels[input.concernType] : "Other";
  const contextLines = [
    `Concern type: ${concernLabel}`,
    `Reporter user id: ${reporterUserId}`,
    `Reported user id: ${input.reportedUserId ?? "Unknown"}`,
    input.reportedMemberDisplayName ? `Reported member: ${input.reportedMemberDisplayName}` : null,
    input.reporterRole ? `Reporter role: ${input.reporterRole}` : null,
    input.podId ? `Pod id: ${input.podId}` : null,
    input.podRoute ? `Pod route: ${input.podRoute}` : null,
    input.rideInstanceId ? `Ride instance id: ${input.rideInstanceId}` : null,
    input.rideDateTime ? `Ride context: ${input.rideDateTime}` : null,
  ].filter(Boolean);

  return `${contextLines.join("\n")}\n\nDescription:\n${input.description?.trim() ?? ""}`;
}

export async function submitMemberSafetyReport(input: SubmitMemberSafetyReportInput): Promise<SubmitMemberSafetyReportResult> {
  try {
    const currentUser = await getCurrentUser();
    const reporterUserId = input.reporterUserId ?? currentUser.user?.id ?? null;

    if (!reporterUserId) return failed("Log in to report a concern.");

    const validationError = validateMemberSafetyReport(input, reporterUserId);
    if (validationError) return failed(validationError);

    if (currentUser.source === "mock") {
      return success("mock", null, currentUser.fallbackNote);
    }

    const client = getSupabaseBrowserClient();
    const timestamp = new Date().toISOString();
    const result = await client
      .from("admin_review_cases")
      .insert({
        subject_user_id: isUuid(input.reportedUserId) ? input.reportedUserId : null,
        ride_instance_id: isUuid(input.rideInstanceId) ? input.rideInstanceId : null,
        review_state: "OPEN",
        case_type: "MEMBER_SAFETY_REPORT",
        severity: "MEDIUM",
        title: "Member safety concern",
        description: buildReviewDescription(input, reporterUserId),
        created_at: timestamp,
      })
      .select("id")
      .maybeSingle();

    if (result.error) {
      return success(
        "mock",
        null,
        "Safety report persistence is not enabled yet; using local report confirmation.",
      );
    }

    return success("supabase", result.data?.id ?? null, null);
  } catch (error) {
    if (isMissingSupabaseConfig(error)) {
      const validationError = validateMemberSafetyReport(input, input.reporterUserId);
      if (validationError) return failed(validationError);
      return success("mock", null, "Supabase not configured; using local report confirmation.");
    }

    return success("mock", null, "Safety report persistence is unavailable; using local report confirmation.");
  }
}
