import {
  checkHostPodCreationEligibility,
  checkPodEligibility as evaluatePodEligibility,
  GENDER_IDENTITIES,
  RISK_STATUSES,
  VERIFICATION_STATUSES,
  type EligibilityOptions,
  type EligibilityResult,
  type GenderIdentity,
  type ProtectedPod,
  type ProtectedUser,
  type RiskStatus,
  type VerificationStatus,
} from "./money-safety";
import { protectedPods, protectedUsers } from "./money-safety-mock";
import type { RidePodProfileRow } from "./supabase/types";

type PodEligibilityFields = Pick<
  ProtectedPod,
  "genderMode" | "accessMode" | "communityId" | "inviteCode" | "minTrustScore"
>;

type ProfileEligibilityFields = Partial<RidePodProfileRow> & {
  displayName?: string | null;
  genderIdentity?: string | null;
  genderVerifiedAt?: string | null;
  verificationStatus?: string | null;
  communityId?: string | null;
  trustScore?: number | null;
  noShowCount?: number | null;
  lateCancelCount?: number | null;
  riskStatus?: string | null;
};

function normalizeGenderIdentity(value: string | null | undefined): GenderIdentity {
  return GENDER_IDENTITIES.includes(value as GenderIdentity)
    ? (value as GenderIdentity)
    : "UNKNOWN";
}

function normalizeVerificationStatus(value: string | null | undefined): VerificationStatus {
  return VERIFICATION_STATUSES.includes(value as VerificationStatus)
    ? (value as VerificationStatus)
    : "NONE";
}

function normalizeRiskStatus(value: string | null | undefined): RiskStatus {
  return RISK_STATUSES.includes(value as RiskStatus)
    ? (value as RiskStatus)
    : "NORMAL";
}

function normalizeNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function profileToProtectedUser(
  profile: ProfileEligibilityFields,
  fallback: Partial<ProtectedUser> = {},
): ProtectedUser {
  const now = new Date().toISOString();

  return {
    id: profile.id ?? fallback.id ?? "profile-user",
    name: profile.display_name ?? profile.displayName ?? fallback.name ?? "RidePod member",
    email: profile.email ?? fallback.email,
    phone: profile.phone ?? fallback.phone,
    genderIdentity: normalizeGenderIdentity(profile.gender_identity ?? profile.genderIdentity),
    genderVerifiedAt: profile.gender_verified_at ?? profile.genderVerifiedAt ?? fallback.genderVerifiedAt ?? null,
    verificationStatus: normalizeVerificationStatus(profile.verification_status ?? profile.verificationStatus),
    communityId: profile.community_id ?? profile.communityId ?? fallback.communityId ?? null,
    trustScore: normalizeNumber(profile.trust_score ?? profile.trustScore, fallback.trustScore ?? 0),
    noShowCount: normalizeNumber(profile.no_show_count ?? profile.noShowCount, fallback.noShowCount ?? 0),
    lateCancelCount: normalizeNumber(profile.late_cancel_count ?? profile.lateCancelCount, fallback.lateCancelCount ?? 0),
    safetyReportCount: fallback.safetyReportCount ?? 0,
    riskStatus: normalizeRiskStatus(profile.risk_status ?? profile.riskStatus),
    stripeCustomerId: fallback.stripeCustomerId ?? null,
    stripeConnectAccountId: fallback.stripeConnectAccountId ?? null,
    payoutsEnabled: fallback.payoutsEnabled ?? false,
    createdAt: profile.created_at ?? fallback.createdAt ?? now,
    updatedAt: profile.updated_at ?? fallback.updatedAt ?? now,
  };
}

export function checkProfilePodEligibility(
  profile: ProfileEligibilityFields,
  pod: PodEligibilityFields,
  options: EligibilityOptions = {},
): EligibilityResult {
  return evaluatePodEligibility(profileToProtectedUser(profile), pod, options);
}

function notFound(entity: "user" | "pod"): EligibilityResult {
  const label = entity === "user" ? "User" : "Pod";

  return {
    eligible: false,
    reasons: [`${label} not found.`],
    blockingReason: `${label} not found.`,
    requiredAction: `${entity.toUpperCase()}_NOT_FOUND`,
  };
}

export function checkPodEligibility(
  userId: string,
  podId: string,
  optionalInviteCode?: string | null,
): EligibilityResult {
  const user = protectedUsers.find((candidate) => candidate.id === userId);
  if (!user) return notFound("user");

  const pod = protectedPods.find((candidate) => candidate.id === podId);
  if (!pod) return notFound("pod");

  return evaluatePodEligibility(user, pod, {
    inviteCode: optionalInviteCode ?? null,
    hasInviteMembership: pod.members.some((member) => member.userId === userId),
  });
}

export function checkPodCreationEligibility(
  hostUserId: string,
  pod: PodEligibilityFields,
  options: EligibilityOptions & { hostIsRiding?: boolean } = {},
): EligibilityResult {
  const host = protectedUsers.find((candidate) => candidate.id === hostUserId);
  if (!host) return notFound("user");

  return checkHostPodCreationEligibility(host, pod, options);
}
