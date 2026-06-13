import type { HomeRide } from "@/lib/home-ride-mock";

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
      helper: "Host needs to share booking details before riders can confirm.",
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

  if (hostBooked) {
    return confirmationState("ride_app_booked", "Ride app booked", "Use chat for pickup updates. Ride fare is paid outside RidePod.", "Open chat", null);
  }

  if (!isHost && !joined) {
    return confirmationState("not_joined", "Join pod", "Join first as interest / seat hold. Ride-detail confirmation happens after host shares details.", "Join pod", null);
  }

  if (isRideAppSeatHoldExpired(ride)) {
    return confirmationState(
      "seat_hold_expired",
      "Seat released",
      "You did not confirm before the confirm-by time, so your seat was released for other riders.",
      podAcceptsRejoin && seatsAvailableAfterRelease ? "Request to rejoin" : "Find another pod",
      podAcceptsRejoin && seatsAvailableAfterRelease ? "Find another pod" : null,
    );
  }

  if (!bookingDetailsFinalized) {
    return confirmationState(
      isHost ? "booking_details_needed" : "joined_interest",
      isHost ? "Waiting for host details" : "Joined",
      isHost ? "Share booking details and set a confirm-by time." : "You joined as interest. Waiting for host details.",
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
    return confirmationState("needs_review", "Review updated details", "Host updated the booking details. Review again before the ride proceeds.", "Review updated details", "View Pod Status");
  }

  if (!isHost && !currentUserConfirmed) {
    return confirmationState("awaiting_rider_confirmation", "Confirm ride details", "Confirm the route, gather point, fare estimate, split method, and payment method before the confirm-by time.", "Confirm ride details", null);
  }

  if (currentUserConfirmed && confirmedRiders < requiredConfirmations) {
    return confirmationState("waiting_for_required_riders", "Waiting for required riders", "Your details are confirmed. Chat opens when required riders confirm.", "View Pod Status", null);
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
  const fareEstimateNeedsReview =
    ride.bookingDetailsUpdated === true &&
    ridersNeedingReview > 0 &&
    confirmedRiders < requiredConfirmations;
  if (fareEstimateNeedsReview) {
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
  const isHost = ride.currentUserRole === "host";
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
  const currentDetailsNeedReview =
    ride.rideAppPodStatus === "needs_review" ||
    ride.selfSettleConfirmationStatus === "needs_review" ||
    (!isHost &&
      ride.bookingDetailsUpdated === true &&
      ride.currentUserBookingDetailsConfirmed === true) ||
    (!isHost &&
      typeof getCurrentUserConfirmedBookingDetailsVersion(ride) === "number" &&
      getCurrentUserConfirmedBookingDetailsVersion(ride)! < getRideAppCurrentDetailVersion(ride));

  if (ride.rideAppHostCancellationStatus === "host_replacement_needed") {
    return locked(
      "cancelled",
      "Read-only",
      "View status",
      "Chat read-only",
      "Host cancelled. Chat reopens when a confirmed rider becomes the new booker.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (ride.status === "cancelled" || ride.rideAppPodStatus === "cancelled" || ride.rideAppHostCancellationStatus === "cancelled" || ride.rideAppHostCancellationStatus === "host_cancelled") {
    return locked("cancelled", "Cancelled", "Pod cancelled", "Chat locked", "This self-settle pod was cancelled.", requiredConfirmations, confirmedRiders);
  }

  if (ride.status === "expired" || ride.rideAppPodStatus === "expired" || isRideAppSeatHoldExpired(ride)) {
    return locked(
      isRideAppSeatHoldExplicitlyExpired(ride) ? "seat_hold_expired" : "expired",
      "Seat released",
      "Find another pod",
      "Chat unavailable",
      "You did not confirm before the confirm-by time, so your seat was released for other riders.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!isHost && !isJoinedRider) {
    return locked("not_joined", "Open", "Join pod", "Chat locked", "Chat opens after booking details are confirmed.", requiredConfirmations, confirmedRiders);
  }

  if (!bookingDetailsFinalized) {
    return locked(
      "waiting_for_booking_details",
      "Waiting for host details",
      isHost ? "Share booking details" : "Waiting for host details",
      "Chat locked",
      "Host needs to accept the route and share booking details.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!hasFareEstimate) {
    return locked(
      "waiting_for_fare_update",
      "Booking details shared",
      isHost ? "Update fare" : "Waiting for fare",
      "Chat locked",
      "Host needs to add or accept the ride app fare estimate before chat unlocks.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!hasGatherPoint) {
    return locked(
      "waiting_for_gather_point",
      "Waiting for host details",
      isHost ? "Set gather point" : "Waiting for host details",
      "Chat locked",
      "Host must set the gather point before riders can confirm.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!hasConfirmByTime) {
    return locked(
      "waiting_for_booking_details",
      "Waiting for host details",
      isHost ? "Set confirm-by time" : "Waiting for host details",
      "Chat locked",
      "Host must set the confirm-by time before riders can confirm.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!hasSplitMethod || !hasPaymentMethod) {
    return locked(
      "waiting_for_host_acceptance",
      "Booking details shared",
      isHost ? "Confirm details" : "Waiting for host",
      "Chat locked",
      "Host needs to confirm the split method and accepted payment method.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!isHost && !currentUserConfirmed) {
    return locked(
      currentDetailsNeedReview ? "needs_review" : "waiting_for_rider_confirmation",
      currentDetailsNeedReview ? "Needs review" : "Awaiting rider confirmation",
      currentDetailsNeedReview ? "Review updated details" : "Confirm ride details",
      "Chat locked",
      currentDetailsNeedReview
        ? "Details changed. Review the updated route, gather point, fare estimate, split method, and payment method."
        : "Confirm the route, gather point, fare estimate, split method, and payment method to unlock chat.",
      requiredConfirmations,
      confirmedRiders,
    );
  }

  if (!isHost && !platformFeeSettled) {
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
      isHost ? "Waiting for riders" : "Confirmed",
      "Chat locked",
      isHost
        ? "Chat unlocks after required riders confirm the booking details."
        : "Chat opens when the required riders confirm.",
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
    helper: isHost
      ? "Confirm everyone is ready before booking."
      : "Gather at the gather point and confirm everyone is ready before host books.",
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
  return (
    ride.currentUserConfirmationExpired === true ||
    ride.currentUserJoinIntentStatus === "seat_hold_expired" ||
    Boolean(ride.seatHoldExpiredAt || ride.seatHoldReleasedAt) ||
    ride.rideAppPodStatus === "seat_hold_expired" ||
    ride.selfSettleConfirmationStatus === "expired"
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
