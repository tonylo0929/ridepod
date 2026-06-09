import type { HomeRide } from "@/lib/home-ride-mock";

export type TaxiPartnerChatLockedReason =
  | "not_joined"
  | "quote_not_ready"
  | "waiting_for_user_quote_acceptance"
  | "waiting_for_other_riders"
  | "waiting_for_taxi_partner_acceptance"
  | "cancelled"
  | "expired";

export type TaxiPartnerChatAccessState = {
  canAccess: boolean;
  reason: TaxiPartnerChatLockedReason | "unlocked";
  statusLabel: string;
  primaryLabel: string;
  secondaryLabel: string;
  helper: string;
  acceptedGuestCount: number;
  requiredGuestCount: number;
};

export function isTaxiPartnerQuotePod(pod: HomeRide) {
  return pod.rideCategory !== "ride_app_self_settle" && pod.rideService !== "ride_app";
}

export function getTaxiPartnerAcceptedGuestCount(pod: HomeRide) {
  return Math.max(0, pod.acceptedGuestCount ?? (pod.currentUserQuoteAccepted ? 1 : 0));
}

export function getTaxiPartnerRequiredGuestCount(pod: HomeRide) {
  return Math.max(1, Math.min(pod.seatsTotal, pod.requiredGuestCount ?? pod.seatsTotal));
}

export function getTaxiPartnerChatAccessState(pod: HomeRide): TaxiPartnerChatAccessState {
  const acceptedGuestCount = getTaxiPartnerAcceptedGuestCount(pod);
  const requiredGuestCount = getTaxiPartnerRequiredGuestCount(pod);
  const isHost = pod.currentUserRole === "host";
  const isTaxiPartner = pod.currentUserRole === "taxi_partner";
  const isJoinedOrAcceptedRider =
    pod.currentUserJoined === true ||
    pod.currentUserQuoteAccepted === true ||
    pod.currentUserRole === "joined_rider" ||
    pod.quoteStatus === "joined";
  const quoteExists =
    typeof pod.quoteAmountCents === "number" ||
    pod.quoteStatus === "quote_ready" ||
    pod.quoteStatus === "ready_for_pickup";
  const allRequiredRidersAccepted = pod.allGuestsAccepted === true || acceptedGuestCount >= requiredGuestCount;
  const taxiPartnerAccepted =
    pod.driverAssignmentStatus === "PARTNER_ACCEPTED" ||
    pod.quoteStatus === "ready_for_pickup" ||
    pod.pickupStatus === "READY_FOR_PICKUP" ||
    pod.pickupStatus === "PARTNER_ARRIVED" ||
    pod.pickupStatus === "RIDE_STARTED";

  if (!isTaxiPartnerQuotePod(pod)) {
    return locked(
      "not_joined",
      "Taxi partner chat unavailable",
      "View pod",
      "Chat locked",
      "Taxi partner chat is only used for Taxi Partner Quote pods.",
      acceptedGuestCount,
      requiredGuestCount,
    );
  }

  if (pod.status === "cancelled") {
    return locked("cancelled", "Cancelled", "View pod", "Chat locked", "This pod was cancelled.", acceptedGuestCount, requiredGuestCount);
  }

  if (pod.status === "expired") {
    return locked("expired", "Expired", "View pod", "Chat locked", "This pod is no longer active.", acceptedGuestCount, requiredGuestCount);
  }

  if (!isHost && !isJoinedOrAcceptedRider && !isTaxiPartner) {
    return locked(
      "not_joined",
      "Members only",
      "Join pod",
      "Chat locked",
      "Taxi partner chat is only available to the host, accepted riders, and the assigned taxi partner.",
      acceptedGuestCount,
      requiredGuestCount,
    );
  }

  if (!quoteExists) {
    return locked(
      "quote_not_ready",
      "Waiting for quote",
      "Waiting for quote",
      "Chat locked",
      "Chat opens after the taxi partner quote is accepted and the taxi partner accepts the job.",
      acceptedGuestCount,
      requiredGuestCount,
    );
  }

  if (!isHost && !isTaxiPartner && pod.currentUserQuoteAccepted !== true) {
    return locked(
      "waiting_for_user_quote_acceptance",
      "Quote ready",
      "Review quote",
      "Chat locked",
      "Accept the selected quote before taxi partner chat can open.",
      acceptedGuestCount,
      requiredGuestCount,
    );
  }

  if (!allRequiredRidersAccepted) {
    return locked(
      "waiting_for_other_riders",
      "Quote accepted",
      "Quote accepted",
      "Chat locked",
      "Chat opens when all required riders accept and the taxi partner accepts the job.",
      acceptedGuestCount,
      requiredGuestCount,
    );
  }

  if (!taxiPartnerAccepted) {
    return locked(
      "waiting_for_taxi_partner_acceptance",
      "Waiting for taxi partner",
      "View updates",
      "Chat locked",
      "Waiting for taxi partner to accept the job.",
      acceptedGuestCount,
      requiredGuestCount,
    );
  }

  if (pod.pickupStatus === "RIDE_STARTED") {
    return unlocked("Ride in progress", "Open chat", "Open chat", "Ride is in progress.", acceptedGuestCount, requiredGuestCount);
  }

  return unlocked(
    "Taxi partner chat",
    "Open taxi partner chat",
    "Open taxi partner chat",
    "Use chat for pickup coordination. Live GPS is not enabled.",
    acceptedGuestCount,
    requiredGuestCount,
  );
}

export function canAccessTaxiPartnerChat({
  pod,
}: {
  pod: HomeRide;
  currentUserId?: string | null;
  now?: Date;
}) {
  return getTaxiPartnerChatAccessState(pod);
}

export function getTaxiPartnerLockedChatBody(reason: TaxiPartnerChatAccessState["reason"]) {
  if (reason === "quote_not_ready") return "Waiting for taxi partner quote.";
  if (reason === "waiting_for_user_quote_acceptance") return "Review and accept the selected taxi quote first.";
  if (reason === "waiting_for_other_riders") return "Waiting for other riders to accept the selected quote.";
  if (reason === "waiting_for_taxi_partner_acceptance") return "All riders accepted. Waiting for taxi partner to accept the job.";
  if (reason === "cancelled") return "This pod was cancelled.";
  if (reason === "expired") return "This pod is no longer active.";
  return "Taxi partner chat is only available to members of this pod.";
}

function locked(
  reason: TaxiPartnerChatLockedReason,
  statusLabel: string,
  primaryLabel: string,
  secondaryLabel: string,
  helper: string,
  acceptedGuestCount: number,
  requiredGuestCount: number,
): TaxiPartnerChatAccessState {
  return {
    canAccess: false,
    reason,
    statusLabel,
    primaryLabel,
    secondaryLabel,
    helper,
    acceptedGuestCount,
    requiredGuestCount,
  };
}

function unlocked(
  statusLabel: string,
  primaryLabel: string,
  secondaryLabel: string,
  helper: string,
  acceptedGuestCount: number,
  requiredGuestCount: number,
): TaxiPartnerChatAccessState {
  return {
    canAccess: true,
    reason: "unlocked",
    statusLabel,
    primaryLabel,
    secondaryLabel,
    helper,
    acceptedGuestCount,
    requiredGuestCount,
  };
}
