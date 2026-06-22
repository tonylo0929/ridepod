import { getNormalizedRouteRequests, type HomeRide } from "@/lib/home-ride-mock";

export type RideAppChatLockedReason =
  | "not_joined"
  | "waiting_for_host_acceptance"
  | "waiting_for_booking_details"
  | "waiting_for_fare_update"
  | "waiting_for_gather_point"
  | "waiting_for_rider_confirmation"
  | "waiting_for_platform_fee"
  | "waiting_for_minimum_confirmed_riders"
  | "needs_review"
  | "host_replacement_needed"
  | "seat_released"
  | "seat_hold_expired"
  | "cancelled"
  | "expired";

export type RideAppChatAccessState = {
  canAccess: boolean;
  reason: RideAppChatLockedReason | "unlocked";
  label: string;
  statusLabel: string;
  primaryLabel: string;
  secondaryLabel: string;
  helper: string;
  requiredConfirmations: number;
  confirmedRiders: number;
};

export type RideAppConfirmationState =
  | "not_joined"
  | "joined_interest"
  | "booking_details_needed"
  | "booking_details_shared"
  | "awaiting_rider_confirmation"
  | "confirmed"
  | "needs_review"
  | "seat_hold_expired"
  | "waiting_for_required_riders"
  | "chat_unlocked"
  | "ready_to_book"
  | "ride_app_booked"
  | "cancelled"
  | "expired";

export type RideAppConfirmationStateResult = {
  state: RideAppConfirmationState;
  label: string;
  helper: string;
  primaryCta: string | null;
  secondaryCta: string | null;
};

export type RideAppHostMarkBookedGuard = {
  canMarkBooked: boolean;
  reason: string | null;
  helper: string;
};

export type RideAppMeaningfulDetailUpdateType = NonNullable<HomeRide["bookingDetailsLastMeaningfulUpdate"]>;

type RideAppDetailSnapshot = Partial<
  Pick<
    HomeRide,
    | "estimatedRideAppFare"
    | "rideAppEstimatedFareTotal"
    | "rideAppEstimatedFarePerPerson"
    | "rideAppBookingDetails"
    | "pickupLabel"
    | "dropoffLabel"
    | "pickupTime"
    | "timeLabel"
    | "rideAppProviderName"
    | "taxiType"
    | "rideAppSplitMethod"
    | "splitMethod"
    | "rideAppAcceptedPaymentMethods"
    | "paymentMethod"
    | "approvedStops"
    | "confirmationDeadlineAt"
    | "rideAppConfirmBy"
  >
>;

export type RideAppMeaningfulDetailUpdateResult = {
  isMeaningful: boolean;
  updateType: RideAppMeaningfulDetailUpdateType | null;
};

function normalizeDetailText(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeMoneyValue(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return normalizeDetailText(value).replace(/hk\$|hkd|\$|,/g, "");
}

function getRideAppFareEstimateComparable(details: RideAppDetailSnapshot) {
  return (
    normalizeMoneyValue(details.rideAppBookingDetails?.estimatedFare) ||
    normalizeMoneyValue(details.estimatedRideAppFare) ||
    normalizeMoneyValue(details.rideAppEstimatedFareTotal) ||
    normalizeMoneyValue(details.rideAppEstimatedFarePerPerson)
  );
}

function getAcceptedPaymentComparable(details: RideAppDetailSnapshot) {
  return details.rideAppAcceptedPaymentMethods?.length
    ? details.rideAppAcceptedPaymentMethods.map((item) => normalizeDetailText(item)).sort().join("|")
    : normalizeDetailText(details.paymentMethod);
}

function getApprovedStopsComparable(details: RideAppDetailSnapshot) {
  return (details.approvedStops ?? [])
    .filter((stop) => stop.status === "approved")
    .map((stop) => normalizeDetailText(stop.label))
    .sort()
    .join("|");
}

function parseOptionalDateMs(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function isMeaningfulRideAppDetailUpdate(
  previousDetails: RideAppDetailSnapshot,
  nextDetails: RideAppDetailSnapshot,
): RideAppMeaningfulDetailUpdateResult {
  if (getRideAppFareEstimateComparable(previousDetails) !== getRideAppFareEstimateComparable(nextDetails)) {
    return { isMeaningful: true, updateType: "fare_estimate" };
  }

  if (normalizeDetailText(previousDetails.pickupLabel) !== normalizeDetailText(nextDetails.pickupLabel)) {
    return { isMeaningful: true, updateType: "pickup" };
  }

  if (normalizeDetailText(previousDetails.dropoffLabel) !== normalizeDetailText(nextDetails.dropoffLabel)) {
    return { isMeaningful: true, updateType: "dropoff" };
  }

  if (normalizeDetailText(previousDetails.pickupTime ?? previousDetails.timeLabel) !== normalizeDetailText(nextDetails.pickupTime ?? nextDetails.timeLabel)) {
    return { isMeaningful: true, updateType: "pickup_time" };
  }

  if (normalizeDetailText(previousDetails.rideAppProviderName ?? previousDetails.taxiType) !== normalizeDetailText(nextDetails.rideAppProviderName ?? nextDetails.taxiType)) {
    return { isMeaningful: true, updateType: "ride_app" };
  }

  if (normalizeDetailText(previousDetails.rideAppSplitMethod ?? previousDetails.splitMethod) !== normalizeDetailText(nextDetails.rideAppSplitMethod ?? nextDetails.splitMethod)) {
    return { isMeaningful: true, updateType: "split_method" };
  }

  if (getAcceptedPaymentComparable(previousDetails) !== getAcceptedPaymentComparable(nextDetails)) {
    return { isMeaningful: true, updateType: "payment_method" };
  }

  if (getApprovedStopsComparable(previousDetails) !== getApprovedStopsComparable(nextDetails)) {
    return { isMeaningful: true, updateType: "stop_added" };
  }

  const previousConfirmBy = parseOptionalDateMs(previousDetails.confirmationDeadlineAt ?? previousDetails.rideAppConfirmBy);
  const nextConfirmBy = parseOptionalDateMs(nextDetails.confirmationDeadlineAt ?? nextDetails.rideAppConfirmBy);
  if (previousConfirmBy !== null && nextConfirmBy !== null && nextConfirmBy < previousConfirmBy) {
    return { isMeaningful: true, updateType: "confirm_by_shortened" };
  }

  return { isMeaningful: false, updateType: null };
}

export function isRiderConfirmedForCurrentDetails(
  rider: NonNullable<HomeRide["riderConfirmations"]>[number],
  bookingDetailsVersion: number,
) {
  const confirmedVersion = rider.confirmedBookingDetailsVersion ?? rider.confirmedDetailVersion;
  return rider.role === "rider" && rider.status === "confirmed" && (confirmedVersion ?? bookingDetailsVersion) >= bookingDetailsVersion;
}

export function getCurrentDetailsConfirmedCount(ride: HomeRide) {
  return getRideAppConfirmedRiderCount(ride);
}

export function hasRidersNeedingCurrentDetailsReview(ride: HomeRide) {
  return getRideAppRidersNeedingCurrentDetailsReview(ride) > 0;
}

export function applyRideAppMeaningfulDetailUpdate(
  pod: HomeRide,
  updateType: RideAppMeaningfulDetailUpdateType,
): Partial<HomeRide> {
  const previousDetailVersion = getRideAppCurrentDetailVersion(pod);
  const nextDetailVersion = previousDetailVersion + 1;
  const chatWasUnlocked = getRideAppChatWasUnlocked(pod);
  const riderConfirmations = pod.riderConfirmations?.map((rider) => {
    if (rider.role !== "rider" || rider.status !== "confirmed") return rider;
    return { ...rider, status: "needs_review" as const };
  });
  const currentUserWasAffected =
    pod.currentUserRole !== "host" &&
    (pod.currentUserJoinIntentStatus === "confirmed" ||
      pod.selfSettleConfirmationStatus === "confirmed" ||
      pod.currentUserBookingDetailsConfirmed === true);

  return {
    bookingDetailsVersion: nextDetailVersion,
    rideAppCurrentDetailVersion: nextDetailVersion,
    bookingDetailsUpdated: true,
    bookingDetailsLastMeaningfulUpdate: updateType,
    rideAppPodStatus: chatWasUnlocked ? "chat_unlocked" : "needs_review",
    confirmedRiderCount: 0,
    rideAppConfirmedRiderCount: 0,
    rideAppConfirmedRiderIds: [],
    ...(riderConfirmations ? { riderConfirmations } : {}),
    ...(currentUserWasAffected
      ? {
          currentUserJoinIntentStatus: "needs_review" as const,
          currentUserBookingDetailsConfirmed: false,
          selfSettleConfirmationStatus: "needs_review" as const,
        }
      : {}),
  };
}

function formatRejoinCooldownTimeLeft(iso: string, now = new Date()) {
  const until = new Date(iso);
  if (Number.isNaN(until.getTime()) || until.getTime() <= now.getTime()) return null;
  const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / (60 * 1000)));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export type RideAppConfirmDeadlineStatus =
  | "not_started"
  | "active"
  | "soon"
  | "expired"
  | "confirmed"
  | "not_required";

export type RideAppConfirmDeadlineState = {
  status: RideAppConfirmDeadlineStatus;
  label: string;
  helper: string;
  timeLeftLabel: string | null;
};

export type RideAppSeatHoldState = RideAppConfirmDeadlineState;

export function getConfirmDeadlineState({
  confirmationDeadlineAt,
  confirmationDeadlineLabel,
  now = new Date(),
  bookingDetailsFinalized = true,
  currentUserBookingDetailsConfirmed = false,
  currentUserConfirmationExpired = false,
  confirmationRequired = true,
}: {
  confirmationDeadlineAt?: string | null;
  confirmationDeadlineLabel?: string | null;
  now?: Date;
  bookingDetailsFinalized?: boolean;
  currentUserBookingDetailsConfirmed?: boolean;
  currentUserConfirmationExpired?: boolean;
  confirmationRequired?: boolean;
}): RideAppConfirmDeadlineState {
  if (!confirmationRequired) {
    return {
      status: "not_required",
      label: "Not required",
      helper: "No rider confirmation time is required.",
      timeLeftLabel: null,
    };
  }

  if (!bookingDetailsFinalized) {
    return {
      status: "not_started",
      label: "Waiting for host details",
      helper: "Riders can confirm after the host shares the required details.",
      timeLeftLabel: null,
    };
  }

  if (currentUserBookingDetailsConfirmed) {
    return {
      status: "confirmed",
      label: "Confirmed",
      helper: "You confirmed the booking details.",
      timeLeftLabel: null,
    };
  }

  if (currentUserConfirmationExpired) {
    return expiredDeadlineState();
  }

  const deadline = parseDeadline(confirmationDeadlineAt);
  if (!deadline) {
    return {
      status: "active",
      label: `Confirm by ${confirmationDeadlineLabel?.trim() || "5:00 PM"}`,
      helper: "Confirm ride details before the confirm-by time.",
      timeLeftLabel: "24h to confirm",
    };
  }

  const millisecondsLeft = deadline.getTime() - now.getTime();
  if (millisecondsLeft <= 0) return expiredDeadlineState();

  const timeLeftLabel = formatDeadlineTimeLeft(millisecondsLeft);
  const soon = millisecondsLeft <= 60 * 60 * 1000;
  return {
    status: soon ? "soon" : "active",
    label: soon ? "Confirm soon" : `Confirm by ${confirmationDeadlineLabel?.trim() || formatDeadlineTime(deadline)}`,
    helper: soon ? "Your seat hold may expire soon if you do not confirm." : "Confirm ride details before the confirm-by time.",
    timeLeftLabel,
  };
}

export function getRideAppRequiredConfirmations(ride: HomeRide) {
  return Math.max(
    1,
    Math.min(
      ride.seatsTotal,
      ride.rideAppRequiredConfirmations ?? ride.rideAppMinimumConfirmedRiders ?? ride.seatsTotal,
    ),
  );
}

export function getRideAppConfirmedRiderCount(ride: HomeRide) {
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);

  if (ride.riderConfirmations?.length) {
    return ride.riderConfirmations.filter(
      (rider) =>
        rider.role === "rider" &&
        rider.status === "confirmed" &&
        (rider.confirmedBookingDetailsVersion ?? rider.confirmedDetailVersion ?? currentDetailVersion) >= currentDetailVersion,
    ).length;
  }

  const explicit = ride.rideAppConfirmedRiderCount ?? ride.rideAppConfirmedRiderIds?.length ?? ride.confirmedRiderCount;
  if (typeof explicit === "number") return Math.max(0, explicit);

  if (
    ride.currentUserJoined === true &&
    (ride.currentUserBookingDetailsConfirmed === true || ride.selfSettleConfirmationStatus === "confirmed")
  ) {
    return 1;
  }

  return 0;
}

export function getRideAppRidersNeedingCurrentDetailsReview(ride: HomeRide) {
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);

  if (ride.riderConfirmations?.length) {
    return ride.riderConfirmations.filter((rider) => {
      if (rider.role !== "rider") return false;
      if (rider.status === "needs_review") return true;
      if (rider.status !== "confirmed") return false;
      const confirmedVersion = rider.confirmedBookingDetailsVersion ?? rider.confirmedDetailVersion;
      return typeof confirmedVersion === "number" && confirmedVersion < currentDetailVersion;
    }).length;
  }

  return ride.bookingDetailsUpdated === true && ride.currentUserBookingDetailsConfirmed === true ? 1 : 0;
}

export function getRideAppChatWasUnlocked(ride: HomeRide) {
  return ride.rideAppPodStatus === "chat_unlocked" || Boolean(ride.chatUnlockedAt);
}

export function getCurrentUserRideAppPlatformFeeSettled(ride: HomeRide) {
  if (ride.currentUserRole === "host") return true;
  if (ride.platformFeeStatus === "demo_confirmed" || ride.platformFeeStatus === "paid" || ride.platformFeeStatus === "waived") return true;
  return false;
}

export function getCurrentUserConfirmedRideAppDetails(ride: HomeRide) {
  if (ride.currentUserRole === "host") return true;
  if (ride.selfSettleConfirmationStatus === "expired") return false;
  if (ride.selfSettleConfirmationStatus === "needs_review") return false;
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);
  const confirmedDetailVersion = getCurrentUserConfirmedBookingDetailsVersion(ride);
  if (
    ride.bookingDetailsUpdated === true &&
    ride.bookingDetailsLastMeaningfulUpdate === "fare_estimate" &&
    ride.currentUserBookingDetailsConfirmed === true &&
    (typeof confirmedDetailVersion !== "number" || confirmedDetailVersion < currentDetailVersion)
  ) {
    return false;
  }
  if (
    typeof confirmedDetailVersion === "number" &&
    confirmedDetailVersion < currentDetailVersion
  ) {
    return false;
  }
  if (ride.currentUserBookingDetailsConfirmed === true) return true;
  if (ride.selfSettleConfirmationStatus === "confirmed") return true;
  return false;
}

export function getRideAppCurrentDetailVersion(ride: HomeRide) {
  return Math.max(1, ride.bookingDetailsVersion ?? ride.rideAppCurrentDetailVersion ?? ride.rideAppDetailVersion ?? 1);
}

export function getCurrentUserConfirmedBookingDetailsVersion(ride: HomeRide) {
  return ride.currentUserConfirmedBookingDetailsVersion ?? ride.currentUserRideAppDetailVersionConfirmed ?? null;
}

export function getRideAppConfirmByDate(ride: HomeRide, now = new Date()) {
  const explicitDeadline = ride.confirmationDeadlineAt ?? ride.rideAppConfirmBy;
  if (explicitDeadline) {
    const explicit = new Date(explicitDeadline);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }

  const sharedAt = ride.rideAppBookingDetailsFinalizedAt ?? ride.rideAppBookingDetailsConfirmedAt ?? ride.rideAppEstimatedFareUpdatedAt;
  const base = sharedAt ? new Date(sharedAt) : now;
  if (Number.isNaN(base.getTime())) return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return new Date(base.getTime() + 24 * 60 * 60 * 1000);
}

export function getRideAppConfirmDeadlineState(ride: HomeRide, now = new Date()) {
  const isHost = ride.currentUserRole === "host";
  return getConfirmDeadlineState({
    confirmationDeadlineAt: ride.confirmationDeadlineAt ?? ride.rideAppConfirmBy,
    confirmationDeadlineLabel: ride.confirmationDeadlineLabel,
    now,
    bookingDetailsFinalized: getRideAppBookingDetailsFinalized(ride),
    currentUserBookingDetailsConfirmed: isHost ? false : getCurrentUserConfirmedRideAppDetails(ride),
    currentUserConfirmationExpired: isHost ? false : isRideAppSeatHoldExplicitlyExpired(ride),
    confirmationRequired: true,
  });
}

export function getRideAppSeatHoldState({
  pod,
  now = new Date(),
}: {
  pod: HomeRide;
  currentUser?: unknown;
  now?: Date;
}): RideAppSeatHoldState {
  return getConfirmDeadlineState({
    confirmationDeadlineAt: pod.confirmationDeadlineAt ?? pod.rideAppConfirmBy,
    confirmationDeadlineLabel: pod.confirmationDeadlineLabel,
    now,
    bookingDetailsFinalized: getRideAppBookingDetailsFinalized(pod),
    currentUserBookingDetailsConfirmed: getCurrentUserConfirmedRideAppDetails(pod),
    currentUserConfirmationExpired: isRideAppSeatHoldExplicitlyExpired(pod),
    confirmationRequired: true,
  });
}

export function isRideAppSeatHoldExpired(ride: HomeRide, now = new Date()) {
  if (isRideAppSeatHoldExplicitlyExpired(ride)) return true;
  if (ride.currentUserRole === "host") return false;
  if (ride.currentUserBookingDetailsConfirmed === true || ride.selfSettleConfirmationStatus === "confirmed") return false;
  if (!getRideAppBookingDetailsFinalized(ride)) return false;
  const confirmBy = getRideAppConfirmByDate(ride, now);
  return confirmBy.getTime() <= now.getTime();
}

export function getRideAppConfirmationState(ride: HomeRide, currentUser?: unknown): RideAppConfirmationStateResult {
  void currentUser;
  const chatAccess = getRideAppChatAccessState(ride);
  const isHost = ride.currentUserRole === "host";
  const joined = isRideAppCurrentUserJoined(ride);
  const bookingDetailsFinalized = getRideAppBookingDetailsFinalized(ride);
  const hasGatherPoint = Boolean(ride.pickupLabel?.trim());
  const hasConfirmByTime = Boolean(ride.confirmationDeadlineAt || ride.rideAppConfirmBy || ride.confirmationDeadlineLabel?.trim());
  const currentUserConfirmed = getCurrentUserConfirmedRideAppDetails(ride);
  const confirmedDetailVersion = getCurrentUserConfirmedBookingDetailsVersion(ride);
  const currentUserNeedsReview =
    !isHost &&
    getRideAppBookingDetailsFinalized(ride) &&
    (
      ride.currentUserJoinIntentStatus === "needs_review" ||
      ride.selfSettleConfirmationStatus === "needs_review" ||
      (ride.bookingDetailsUpdated === true &&
        ride.currentUserBookingDetailsConfirmed === true &&
        (typeof confirmedDetailVersion !== "number" || confirmedDetailVersion < getRideAppCurrentDetailVersion(ride)))
    );
  const requiredConfirmations = getRideAppRequiredConfirmations(ride);
  const confirmedRiders = getRideAppConfirmedRiderCount(ride);
  const hostBooked = ride.rideAppPodStatus === "ride_booked";
  const podAcceptsRejoin =
    ride.status !== "cancelled" &&
    ride.status !== "expired" &&
    ride.rideAppPodStatus !== "cancelled" &&
    ride.rideAppPodStatus !== "expired" &&
    ride.rideAppPodStatus !== "ride_booked" &&
    ride.rideAppPodStatus !== "completed";
  const releasedSeatCount =
    ride.riderConfirmations?.filter((rider) => rider.role === "rider" && (rider.status === "seat_hold_expired" || rider.status === "expired")).length ?? 1;
  const seatsAvailableAfterRelease = Math.max(0, ride.seatsTotal - Math.max(0, ride.seatsUsed - releasedSeatCount)) > 0;

  if (ride.status === "cancelled" || ride.rideAppPodStatus === "cancelled") {
    return confirmationState("cancelled", "Cancelled", "This self-settle pod was cancelled.", null, null);
  }

  if (ride.status === "expired" || ride.rideAppPodStatus === "expired") {
    return confirmationState("expired", "Expired", "This self-settle pod has expired.", null, null);
  }

  if (!isHost && !joined) {
    return confirmationState("not_joined", "Join pod", "Join first as interest / seat hold. Ride-detail confirmation happens after host shares details.", "Join pod", null);
  }

  if (isRideAppSeatHoldExpired(ride)) {
    const cooldownTimeLeft = ride.rejoinCooldownUntil ? formatRejoinCooldownTimeLeft(ride.rejoinCooldownUntil) : null;
    const rejoinPrimaryCta = ride.requiresHostApprovalToRejoin
      ? "Ask host to rejoin"
      : cooldownTimeLeft
        ? "Rejoin available soon"
        : podAcceptsRejoin && seatsAvailableAfterRelease
          ? "Request to rejoin"
          : "Find another pod";
    const rejoinHelper = ride.requiresHostApprovalToRejoin
      ? "Too many join/leave actions. Host approval is needed before you can rejoin this pod."
      : cooldownTimeLeft
        ? `You can request to rejoin after ${cooldownTimeLeft}.`
        : "You did not confirm before the confirm-by time, so your seat was released for other riders.";
    return confirmationState(
      "seat_hold_expired",
      "Seat released",
      rejoinHelper,
      rejoinPrimaryCta,
      rejoinPrimaryCta === "Request to rejoin" ? "Find another pod" : null,
    );
  }

  if (hostBooked) {
    return confirmationState("ride_app_booked", "Ride app booked", "Use chat for pickup updates. Ride fare is paid outside RidePod.", "Open chat", null);
  }

  if (!bookingDetailsFinalized) {
    const hostName = ride.hostName?.trim() || "the host";
    return confirmationState(
      isHost ? "booking_details_needed" : "joined_interest",
      "Waiting for host details",
      isHost ? "Share booking details and set a confirm-by time." : `Riders can confirm after ${hostName} shares the required details.`,
      isHost ? "Share booking details" : "View Pod Status",
      null,
    );
  }

  if (!hasGatherPoint) {
    return confirmationState(
      "booking_details_needed",
      "Waiting for host details",
      "Host must set the gather point before riders can confirm.",
      isHost ? "Set gather point" : "View Pod Status",
      null,
    );
  }

  if (!hasConfirmByTime) {
    return confirmationState(
      "booking_details_needed",
      "Waiting for host details",
      "Host must set the confirm-by time before riders can confirm.",
      isHost ? "Set confirm-by time" : "View Pod Status",
      null,
    );
  }

  if (chatAccess.reason === "needs_review" || currentUserNeedsReview) {
    return confirmationState("needs_review", "Review updated details", "Host updated the details. Please review again.", "Review updated details", "View status");
  }

  if (!isHost && !currentUserConfirmed) {
    return confirmationState("awaiting_rider_confirmation", "Confirm ride details", "Review the details and confirm before the deadline.", "Confirm ride details", null);
  }

  if (currentUserConfirmed && confirmedRiders < requiredConfirmations) {
    return confirmationState("waiting_for_required_riders", "Confirmed", "Waiting for required riders to confirm.", "View Pod Status", null);
  }

  if (isHost && confirmedRiders >= requiredConfirmations) {
    return confirmationState("ready_to_book", "Ready to book", "Required riders confirmed. Host can mark ride app booked after booking outside RidePod.", "Mark ride app booked", null);
  }

  if (chatAccess.canAccess) {
    return confirmationState("chat_unlocked", "Chat unlocked", "Required riders confirmed current details.", "Open chat", null);
  }

  return confirmationState("booking_details_shared", "Waiting for required riders", chatAccess.helper, chatAccess.primaryLabel, null);
}

export function canHostMarkRideAppBooked(ride: HomeRide): RideAppHostMarkBookedGuard {
  if (ride.currentUserRole !== "host") {
    return {
      canMarkBooked: false,
      reason: "not_host",
      helper: "Only the host can mark ride app booked.",
    };
  }

  if (ride.status === "cancelled" || ride.rideAppPodStatus === "cancelled") {
    return {
      canMarkBooked: false,
      reason: "cancelled",
      helper: "Cancelled pods cannot be marked booked.",
    };
  }

  if (ride.status === "expired" || ride.rideAppPodStatus === "expired") {
    return {
      canMarkBooked: false,
      reason: "expired",
      helper: "Expired pods cannot be marked booked.",
    };
  }

  if (ride.rideAppHostCancellationStatus === "host_replacement_needed") {
    return {
      canMarkBooked: false,
      reason: "cancelled",
      helper: "Host replacement mode is active. A new booker must be selected first.",
    };
  }

  if (!getRideAppBookingDetailsFinalized(ride)) {
    return {
      canMarkBooked: false,
      reason: "waiting_for_booking_details",
      helper: "Share booking details before marking the ride app booked.",
    };
  }

  if (!ride.pickupLabel?.trim()) {
    return {
      canMarkBooked: false,
      reason: "waiting_for_booking_details",
      helper: "Host must set the gather point before riders can confirm.",
    };
  }

  if (!(ride.confirmationDeadlineAt || ride.rideAppConfirmBy || ride.confirmationDeadlineLabel?.trim())) {
    return {
      canMarkBooked: false,
      reason: "waiting_for_booking_details",
      helper: "Host must set the confirm-by time before riders can confirm.",
    };
  }

  const requiredConfirmations = getRideAppRequiredConfirmations(ride);
  const confirmedRiders = getRideAppConfirmedRiderCount(ride);
  const ridersNeedingReview = getRideAppRidersNeedingCurrentDetailsReview(ride);
  const pendingRouteRequest = getNormalizedRouteRequests(ride).pendingCount > 0;

  if (pendingRouteRequest) {
    return {
      canMarkBooked: false,
      reason: "pending_route_request",
      helper: "Review pending route requests before the host books.",
    };
  }

  if (ridersNeedingReview > 0) {
    return {
      canMarkBooked: false,
      reason: "needs_review",
      helper:
        ride.bookingDetailsLastMeaningfulUpdate === "fare_estimate"
          ? "Riders need to review the updated fare estimate before the host books."
          : "Riders need to review the updated details before the host books.",
    };
  }

  if (confirmedRiders < requiredConfirmations) {
    return {
      canMarkBooked: false,
      reason: "waiting_for_minimum_confirmed_riders",
      helper: "Required riders must confirm current booking details before the host books.",
    };
  }

  return {
    canMarkBooked: true,
    reason: null,
    helper: "Required riders confirmed. Book outside RidePod, then mark ride app booked.",
  };
}

export function getRideAppChatAccessState(ride: HomeRide, currentUser?: unknown): RideAppChatAccessState {
  void currentUser;
  const requiredConfirmations = getRideAppRequiredConfirmations(ride);
  const confirmedRiders = getRideAppConfirmedRiderCount(ride);
  const chatWasUnlocked = getRideAppChatWasUnlocked(ride);
  const hostReplacementNeeded = ride.rideAppHostCancellationStatus === "host_replacement_needed";
  const isHost = ride.currentUserRole === "host";
  const isCurrentBooker = isHost && !hostReplacementNeeded;
  const isJoinedRider = isRideAppCurrentUserJoined(ride);
  const bookingDetailsFinalized = getRideAppBookingDetailsFinalized(ride);
  const hasFareEstimate =
    Boolean(ride.rideAppBookingDetails?.estimatedFare?.trim()) ||
    Boolean(ride.estimatedRideAppFare?.trim()) ||
    typeof ride.rideAppEstimatedFarePerPerson === "number" ||
    typeof ride.rideAppEstimatedFareTotal === "number" ||
    ride.rideAppFareEstimateStatus === "accepted" ||
    ride.rideAppFareEstimateStatus === "pending";
  const hasSplitMethod = Boolean(ride.rideAppSplitMethod?.trim() || ride.splitMethod?.trim());
  const hasPaymentMethod = Boolean(ride.rideAppAcceptedPaymentMethods?.length || ride.paymentMethod?.trim());
  const hasGatherPoint = Boolean(ride.pickupLabel?.trim());
  const hasConfirmByTime = Boolean(ride.confirmationDeadlineAt || ride.rideAppConfirmBy || ride.confirmationDeadlineLabel?.trim());
  const currentUserConfirmed = getCurrentUserConfirmedRideAppDetails(ride);
  const platformFeeSettled = getCurrentUserRideAppPlatformFeeSettled(ride);
  const currentUserConfirmedVersion = getCurrentUserConfirmedBookingDetailsVersion(ride);
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);
  const currentUserHadConfirmedDetails =
    ride.currentUserBookingDetailsConfirmed === true ||
    ride.selfSettleConfirmationStatus === "confirmed" ||
    ride.selfSettleConfirmationStatus === "needs_review" ||
    typeof currentUserConfirmedVersion === "number";
  const currentDetailsNeedReview =
    (!isHost &&
      (ride.currentUserJoinIntentStatus === "needs_review" ||
        ride.selfSettleConfirmationStatus === "needs_review")) ||
    (!isHost &&
      ride.bookingDetailsUpdated === true &&
      ride.currentUserBookingDetailsConfirmed === true &&
      (typeof currentUserConfirmedVersion !== "number" || currentUserConfirmedVersion < currentDetailVersion)) ||
    (!isHost &&
      typeof currentUserConfirmedVersion === "number" &&
      currentUserConfirmedVersion < currentDetailVersion);

  if (ride.status === "cancelled" || ride.rideAppPodStatus === "cancelled" || ride.rideAppHostCancellationStatus === "cancelled" || ride.rideAppHostCancellationStatus === "host_cancelled") {
    return locked("cancelled", "Cancelled", "Pod cancelled", "Chat locked", "This self-settle pod was cancelled.", requiredConfirmations, confirmedRiders);
  }

  if (ride.status === "expired" || ride.rideAppPodStatus === "expired") {
    return locked("expired", "Expired", "Find another pod", "Chat unavailable", "This self-settle pod is no longer active.", requiredConfirmations, confirmedRiders);
  }

  if (isRideAppCurrentUserSeatReleased(ride)) {
    return locked(
      "seat_released",
      "Seat released",
      "View pod status",
      "Chat unavailable",
      "Your seat was released because you did not confirm before the confirm-by time.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!isCurrentBooker && !isJoinedRider) {
    return locked("not_joined", "Members only", "Join pod", "Chat locked", "Join this pod before chat can open.", requiredConfirmations, confirmedRiders);
  }

  if (!isCurrentBooker && chatWasUnlocked && platformFeeSettled && currentUserHadConfirmedDetails && currentDetailsNeedReview) {
    return {
      canAccess: true,
      reason: "unlocked",
      label: "Chat open - review needed",
      statusLabel: "Chat open - review needed",
      primaryLabel: "Open chat",
      secondaryLabel: "Review updated details",
      helper: "Chat stays open, but the host should not book until required riders review the updated details.",
      requiredConfirmations,
      confirmedRiders,
    };
  }

  if (!isCurrentBooker && currentDetailsNeedReview) {
    return locked(
      "waiting_for_rider_confirmation",
      "Review updated details",
      "Review updated details",
      "Chat locked",
      "Review updated details before chat can open.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!isCurrentBooker && !currentUserConfirmed) {
    return locked(
      "waiting_for_rider_confirmation",
      "Confirm ride details",
      "Confirm ride details",
      "Chat locked",
      "Confirm ride details before chat can open.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!isCurrentBooker && !platformFeeSettled) {
    return locked(
      "waiting_for_platform_fee",
      "Awaiting platform fee",
      "Confirm fee",
      "Chat locked",
      "RidePod fee must be demo-confirmed or waived before chat can unlock.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (hostReplacementNeeded) {
    if (chatWasUnlocked) {
      return {
        canAccess: true,
        reason: "unlocked",
        label: "Chat unlocked",
        statusLabel: "Chat unlocked",
        primaryLabel: "Open chat",
        secondaryLabel: "Host replacement needed",
        helper: "Host replacement mode started. Confirmed riders can keep coordinating while a new booker is selected.",
        requiredConfirmations,
        confirmedRiders,
      };
    }

    return locked(
      "host_replacement_needed",
      "Read-only",
      "View status",
      "Chat read-only",
      "Host replacement needed. A confirmed rider can become the new booker.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!bookingDetailsFinalized) {
    const hostName = ride.hostName?.trim() || "the host";
    return locked(
      "waiting_for_booking_details",
      "Waiting for host details",
      isCurrentBooker ? "Share booking details" : "Waiting for host details",
      "Chat locked",
      isCurrentBooker ? "Host needs to accept the route and share booking details." : `Riders can confirm after ${hostName} shares the required details.`,
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!hasFareEstimate) {
    return locked(
      "waiting_for_fare_update",
      "Waiting for host details",
      isCurrentBooker ? "Update fare" : "Waiting for host details",
      "Chat locked",
      isCurrentBooker ? "Host needs to add or accept the ride app fare estimate before chat unlocks." : "Riders can confirm after the host shares the required details.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!hasGatherPoint) {
    return locked(
      "waiting_for_gather_point",
      "Waiting for host details",
      isCurrentBooker ? "Set gather point" : "Waiting for host details",
      "Chat locked",
      isCurrentBooker ? "Host must set the gather point before riders can confirm." : "Riders can confirm after the host shares the required details.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!hasConfirmByTime) {
    return locked(
      "waiting_for_booking_details",
      "Waiting for host details",
      isCurrentBooker ? "Set confirm-by time" : "Waiting for host details",
      "Chat locked",
      isCurrentBooker ? "Host must set the confirm-by time before riders can confirm." : "Riders can confirm after the host shares the required details.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!hasSplitMethod || !hasPaymentMethod) {
    return locked(
      "waiting_for_host_acceptance",
      "Waiting for host details",
      isCurrentBooker ? "Confirm details" : "Waiting for host details",
      "Chat locked",
      isCurrentBooker ? "Host needs to confirm the split method and accepted payment method." : "Riders can confirm after the host shares the required details.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (confirmedRiders < requiredConfirmations) {
    if (chatWasUnlocked) {
      return {
        canAccess: true,
        reason: "unlocked",
        label: "Chat open - review needed",
        statusLabel: "Chat open - review needed",
        primaryLabel: "Open chat",
        secondaryLabel: "Chat open - review needed",
        helper: "Chat remains open, but Mark ride app booked is blocked until riders reconfirm.",
        requiredConfirmations,
        confirmedRiders,
      };
    }

    return locked(
      "waiting_for_minimum_confirmed_riders",
      "Waiting for required riders",
      isCurrentBooker ? "Waiting for riders" : "Confirmed",
      "Chat locked",
      "Waiting for required riders to confirm.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  return {
    canAccess: true,
    reason: "unlocked",
    label: "Chat unlocked",
    statusLabel: "Chat unlocked",
    primaryLabel: "Open chat",
    secondaryLabel: "Ready to gather",
    helper: isCurrentBooker
      ? "Confirm everyone is ready before booking."
      : "Ready to gather. Chat is open for confirmed riders.",
    requiredConfirmations,
    confirmedRiders,
  };
}

function getRideAppBookingDetailsFinalized(ride: HomeRide) {
  return (
    ride.rideAppBookingDetailsFinalized === true ||
    ride.bookingDetailsShared === true ||
    ride.rideAppBookingDetailsConfirmed === true
  );
}

function isRideAppSeatHoldExplicitlyExpired(ride: HomeRide) {
  if (
    ride.currentUserJoinIntentStatus === "seat_hold_expired" ||
    Boolean(ride.seatHoldExpiredAt || ride.seatHoldReleasedAt) ||
    ride.rideAppPodStatus === "seat_hold_expired" ||
    ride.selfSettleConfirmationStatus === "expired"
  ) {
    return true;
  }

  return (
    ride.currentUserConfirmationExpired === true &&
    getRideAppBookingDetailsFinalized(ride)
  );
}

function parseDeadline(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function expiredDeadlineState(): RideAppConfirmDeadlineState {
  return {
    status: "expired",
    label: "Seat released",
    helper: "You did not confirm before the confirm-by time, so your seat was released for other riders.",
    timeLeftLabel: null,
  };
}

function formatDeadlineTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDeadlineTimeLeft(milliseconds: number) {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / (60 * 1000)));
  if (totalMinutes < 60) return `${totalMinutes}m left`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24 && minutes === 0) return `${Math.round(hours / 24) * 24}h to confirm`;
  return minutes ? `${hours}h ${minutes}m left` : `${hours}h to confirm`;
}

function isRideAppCurrentUserJoined(ride: HomeRide) {
  return (
    ride.currentUserJoined === true ||
    ride.currentUserRole === "joined_rider" ||
    ride.currentUserJoinIntentStatus === "joined_interest" ||
    ride.currentUserJoinIntentStatus === "confirmed" ||
    ride.currentUserJoinIntentStatus === "needs_review"
  );
}

function isRideAppCurrentUserParticipant(ride: HomeRide) {
  return (
    isRideAppCurrentUserJoined(ride) ||
    ride.currentUserJoinIntentStatus === "seat_hold_expired" ||
    ride.currentUserJoinIntentStatus === "left"
  );
}

function isRideAppCurrentUserSeatReleased(ride: HomeRide) {
  if (ride.currentUserRole === "host") return false;
  if (ride.currentUserJoinIntentStatus === "seat_hold_expired") return true;
  if (ride.selfSettleConfirmationStatus === "expired") return true;
  return isRideAppCurrentUserParticipant(ride) && isRideAppSeatHoldExpired(ride);
}

function confirmationState(
  state: RideAppConfirmationState,
  label: string,
  helper: string,
  primaryCta: string | null,
  secondaryCta: string | null,
): RideAppConfirmationStateResult {
  return {
    state,
    label,
    helper,
    primaryCta,
    secondaryCta,
  };
}

export function canAccessRideAppChat({
  pod,
}: {
  pod: HomeRide;
  currentUserId?: string | null;
  membership?: unknown;
  now?: Date;
}) {
  return getRideAppChatAccessState(pod);
}

function locked(
  reason: RideAppChatLockedReason,
  statusLabel: string,
  primaryLabel: string,
  secondaryLabel: string,
  helper: string,
  requiredConfirmations: number,
  confirmedRiders: number,
): RideAppChatAccessState {
  return {
    canAccess: false,
    reason,
    label: statusLabel,
    statusLabel,
    primaryLabel,
    secondaryLabel,
    helper,
    requiredConfirmations,
    confirmedRiders,
  };
}
