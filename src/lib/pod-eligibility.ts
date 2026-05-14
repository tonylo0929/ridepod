import {
  checkHostPodCreationEligibility,
  checkPodEligibility as evaluatePodEligibility,
  type EligibilityOptions,
  type EligibilityResult,
  type ProtectedPod,
} from "./money-safety";
import { protectedPods, protectedUsers } from "./money-safety-mock";

type PodEligibilityFields = Pick<
  ProtectedPod,
  "genderMode" | "accessMode" | "communityId" | "inviteCode" | "minTrustScore"
>;

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
