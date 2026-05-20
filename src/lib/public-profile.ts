import type { PodMember, User } from "@/lib/mock-data";
import type { RidePodMemberRow, RidePodProfileRow } from "@/lib/supabase/types";

export type PublicMemberRoleLabel = "Host" | "Guest" | "Replacement host";
export type PublicMemberBadge = "Verified" | "Community" | "High-trust";
export type PublicMemberStateLabel = "Seat locked" | "Joined" | "Requested" | "Waitlisted" | "Left pod";

export type PublicMemberViewModel = {
  id: string;
  displayName: string;
  initials: string;
  avatarUrl?: string | null;
  roleLabel: PublicMemberRoleLabel;
  badges: PublicMemberBadge[];
  memberStateLabel?: PublicMemberStateLabel | null;
  communityLabel?: string | null;
};

type PublicMemberInput = Partial<PodMember> & Partial<RidePodMemberRow>;

type PublicProfileSource = Partial<User> &
  Partial<RidePodProfileRow> & {
    displayName?: string | null;
    communityLabel?: string | null;
  };

type PublicMemberMapperOptions = {
  communityLabel?: string | null;
  showHighTrustBadge?: boolean;
  highTrustThreshold?: number;
};

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizeRole(value: string | null | undefined): PublicMemberRoleLabel {
  const normalized = value?.toUpperCase();

  if (normalized === "HOST") return "Host";
  if (normalized === "REPLACEMENT_HOST" || normalized === "BACKUP_HOST") return "Replacement host";

  return "Guest";
}

function normalizeMemberState(member: PublicMemberInput): PublicMemberStateLabel | null {
  const state = getString(member.member_state)?.toUpperCase();
  const paymentStatus = getString(member.paymentStatus)?.toUpperCase();

  if (state === "LOCKED" || state === "CONFIRMED" || paymentStatus === "AUTHORIZED" || paymentStatus === "CHARGED") {
    return "Seat locked";
  }

  if (state === "REQUESTED") return "Requested";
  if (state === "WAITLISTED") return "Waitlisted";
  if (state === "CANCELED" || state === "CANCELLED" || paymentStatus === "REFUNDED") return "Left pod";
  if (state === "ELIGIBLE" || state === "PAYMENT_REQUIRED" || state === "AUTHORIZING" || paymentStatus === "DEPOSIT_PAID") {
    return "Joined";
  }

  return null;
}

function getDisplayName(profile: PublicProfileSource | null | undefined) {
  return profile?.display_name ?? profile?.displayName ?? profile?.name ?? "RidePod member";
}

function getInitials(displayName: string) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "RP";
}

function isVerified(profile: PublicProfileSource | null | undefined) {
  return (
    profile?.id_verification_status === "VERIFIED" ||
    profile?.verification_status === "ID_VERIFIED" ||
    profile?.verification_status === "PHONE_VERIFIED" ||
    profile?.phoneVerified === true
  );
}

function hasCommunity(profile: PublicProfileSource | null | undefined, options: PublicMemberMapperOptions) {
  return Boolean(options.communityLabel ?? profile?.communityLabel ?? profile?.community_id);
}

function isHighTrust(profile: PublicProfileSource | null | undefined, options: PublicMemberMapperOptions) {
  if (!options.showHighTrustBadge) return false;

  const threshold = options.highTrustThreshold ?? 4.5;
  const normalizedTrustScore =
    typeof profile?.trust_score === "number"
      ? profile.trust_score
      : typeof profile?.trustScore === "number" && profile.trustScore > 10
        ? profile.trustScore / 20
        : profile?.trustScore;

  return typeof normalizedTrustScore === "number" && normalizedTrustScore >= threshold;
}

function getBadges(profile: PublicProfileSource | null | undefined, options: PublicMemberMapperOptions) {
  const badges: PublicMemberBadge[] = [];

  if (isVerified(profile)) badges.push("Verified");
  if (hasCommunity(profile, options)) badges.push("Community");
  if (isHighTrust(profile, options)) badges.push("High-trust");

  return badges;
}

export function mapMemberToPublicProfileViewModel(
  member: PublicMemberInput,
  profile?: PublicProfileSource | null,
  options: PublicMemberMapperOptions = {},
): PublicMemberViewModel {
  const displayName = getDisplayName(profile);

  return {
    id: member.userId ?? member.user_id ?? profile?.id ?? member.id ?? displayName,
    displayName,
    initials: getInitials(displayName),
    avatarUrl: profile?.avatarUrl ?? null,
    roleLabel: normalizeRole(member.role),
    badges: getBadges(profile, options),
    memberStateLabel: normalizeMemberState(member),
    communityLabel: options.communityLabel ?? profile?.communityLabel ?? profile?.community_id ?? null,
  };
}
