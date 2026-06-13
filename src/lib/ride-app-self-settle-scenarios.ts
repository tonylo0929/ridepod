import type { HomeRide } from "@/lib/home-ride-mock";
import type { CalendarRide } from "@/lib/my-ride-calendar-mock";
import type { PodChatPreview, RideBadge } from "@/lib/pod-chat-mock";

export type RideAppSelfSettleScenarioId =
  | "RA-R-01"
  | "RA-R-02"
  | "RA-R-03"
  | "RA-R-04"
  | "RA-R-05"
  | "RA-R-06"
  | "RA-R-07"
  | "RA-R-08"
  | "RA-R-09"
  | "RA-R-10"
  | "RA-R-11"
  | "RA-R-12"
  | "RA-R-13"
  | "RA-R-14"
  | "RA-R-15"
  | "RA-R-16"
  | "RA-R-17"
  | "RA-R-18"
  | "RA-H-01"
  | "RA-H-02"
  | "RA-H-03"
  | "RA-H-04"
  | "RA-H-05"
  | "RA-H-06"
  | "RA-H-07"
  | "RA-H-08"
  | "RA-H-09"
  | "RA-H-10"
  | "RA-H-11";

export type RideAppSelfSettleScenario = {
  id: RideAppSelfSettleScenarioId;
  title: string;
  role: "rider" | "host";
  routePolicy: "direct" | "host_approved_stops";
  expected: string;
  ride: HomeRide;
  includeCalendar?: boolean;
  includeChat?: boolean;
};

// Keep null for an empty app. Change to one scenario id, for example "RA-R-03", to test one case at a time.
export const ACTIVE_RIDE_APP_SELF_SETTLE_SCENARIO_ID: RideAppSelfSettleScenarioId | null = "RA-H-11";

const baseConfirmBy = "2026-06-08T12:00:00.000Z";
const expiredConfirmBy = "2026-05-20T12:00:00.000Z";

const fullChecklist = {
  pickupPoint: true,
  dropoffPoint: true,
  rideApp: true,
  estimatedFare: true,
  booker: true,
  fareSplit: true,
  paymentMethod: true,
  paymentRecipientAfterRide: true,
  meetingTime: true,
  updatedAt: "2026-06-07T11:00:00.000Z",
  updatedBy: "Mark",
};

const missingFareChecklist = {
  ...fullChecklist,
  estimatedFare: false,
};

const missingSplitPaymentChecklist = {
  ...fullChecklist,
  fareSplit: false,
  paymentMethod: false,
  paymentRecipientAfterRide: false,
};

function routeStop(status: "pending_host_approval" | "approved" | "declined") {
  return {
    id: `ra-stop-${status}`,
    label: "Add Wan Chai quick pickup before TST",
    requestedBy: "You",
    stopType: "pickup_stop" as const,
    reason: "Meet another rider near the MTR exit.",
    status,
  };
}

function baseRide(overrides: Partial<HomeRide> = {}): HomeRide {
  const role = overrides.currentUserRole ?? "joined_rider";
  const joined = role === "host" ? false : overrides.currentUserJoined ?? true;
  const rideKind = overrides.rideKind ?? "one_off";

  return {
    id: "ra-scenario",
    fromDistrict: "Central",
    toDistrict: "Tsim Sha Tsui",
    fromLabel: "Central",
    toLabel: "Tsim Sha Tsui",
    dateLabel: "Mon, Jun 8",
    timeLabel: "7:30 PM",
    seatsUsed: joined ? 2 : 1,
    seatsTotal: 4,
    pricePerPerson: 24,
    rideKind,
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppBookingDetailsFinalized: false,
    confirmationDeadlineLabel: "8:00 PM",
    confirmationDeadlineAt: baseConfirmBy,
    currentUserJoinIntentStatus: role === "host" ? "not_joined" : joined ? "joined_interest" : "not_joined",
    currentUserConfirmationExpired: false,
    bookingDetailsVersion: 1,
    bookingDetailsUpdated: false,
    currentUserConfirmedBookingDetailsVersion: null,
    rideAppConfirmBy: baseConfirmBy,
    rideAppChecklist: fullChecklist,
    rideAppPodStatus: "booking_details_needed",
    rideAppBookingTrigger: "minimum_riders_confirmed",
    rideAppRequiredConfirmations: 2,
    rideAppConfirmedRiderIds: [],
    rideAppFarePaymentTiming: "after_ride",
    rideAppProviderName: "Uber",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "pending",
    rideAppAcceptedPaymentMethods: ["FPS", "PayMe"],
    airportDirection: null,
    status: "available",
    quoteStatus: joined ? "joined" : "quote_pending",
    currentUserRole: role,
    currentUserName: role === "host" ? "Mark" : "You",
    currentUserJoined: joined,
    currentUserBookingDetailsConfirmed: false,
    platformFeeStatus: "pending",
    selfSettleConfirmationStatus: joined ? "pending" : undefined,
    confirmedRiderCount: 0,
    joinedRiderCount: joined ? 1 : 0,
    rideAppConfirmedRiderCount: 0,
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      ...(joined ? [{ name: "You", role: "rider" as const, status: "joined_interest" as const, isCurrentUser: true, confirmBy: baseConfirmBy }] : []),
    ],
    taxiType: "Ride app",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "FPS or PayMe to booker after ride",
    luggage: "Small bags only",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Mark",
    joinedRiders: joined ? ["You"] : [],
    pickupLabel: "Central Pier 7 taxi stand",
    pickupTime: "7:25 PM",
    dropoffLabel: "Tsim Sha Tsui Star Ferry",
    stopRequestPolicy: "direct_only",
    proposedStops: [],
    approvedStops: [],
    declinedStops: [],
    ...(rideKind === "recurring"
      ? {
          scheduleLabel: "Every Monday and Thursday",
          weekdays: ["Mon", "Thu"],
          tripPattern: "one_way" as const,
          startLabel: "Starts Jun 8",
          endLabel: "No end date",
          outboundLabel: "Central to Tsim Sha Tsui",
          repeatsPattern: "Weekly",
          nextRideLabel: "Next ride Mon, Jun 8 at 7:30 PM",
          upcomingRides: [
            { date: "2026-06-08", time: "19:30", label: "Central to Tsim Sha Tsui" },
            { date: "2026-06-11", time: "19:30", label: "Central to Tsim Sha Tsui" },
          ],
        }
      : {}),
    ...overrides,
  };
}

function detailsShared(overrides: Partial<HomeRide> = {}) {
  return baseRide({
    bookingDetailsShared: true,
    rideAppBookingDetailsConfirmed: true,
    rideAppBookingDetails: {
      estimatedFare: "HK$96-112",
    },
    estimatedRideAppFare: "HK$96-112",
    rideAppEstimatedFarePerPerson: 24,
    rideAppEstimatedFareTotal: 96,
    rideAppEstimatedFareCurrency: "HKD",
    rideAppEstimatedFareUpdatedBy: "Mark",
    rideAppEstimatedFareUpdatedAt: "2026-06-07T11:00:00.000Z",
    rideAppEstimatedFareNote: "Fixed range shown by Uber before booking.",
    rideAppFareEstimateStatus: "accepted",
    fareEstimateScreenshot: {
      fileName: "uber-fare-estimate-ra-r-02.png",
      addedAt: "2026-06-07T11:00:00.000Z",
      note: "Uploaded by Mark after checking the Uber estimate.",
    },
    rideAppBookingDetailsConfirmedAt: "2026-06-07T11:00:00.000Z",
    rideAppBookingDetailsConfirmedBy: "Mark",
    rideAppBookingDetailsFinalized: true,
    rideAppBookingDetailsFinalizedAt: "2026-06-07T11:00:00.000Z",
    rideAppBookingDetailsFinalizedBy: "Mark",
    rideAppPodStatus: "awaiting_rider_confirmation",
    ...overrides,
  });
}

function confirmed(overrides: Partial<HomeRide> = {}) {
  return detailsShared({
    currentUserJoinIntentStatus: "confirmed",
    currentUserBookingDetailsConfirmed: true,
    currentUserConfirmedBookingDetailsVersion: 1,
    selfSettleConfirmationStatus: "confirmed",
    platformFeeStatus: "demo_confirmed",
    confirmedRiderCount: 1,
    rideAppConfirmedRiderCount: 1,
    rideAppConfirmedRiderIds: ["mock-qa-rider"],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "confirmed", isCurrentUser: true, confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
    ],
    ...overrides,
  });
}

function hostRide(overrides: Partial<HomeRide> = {}) {
  return baseRide({
    currentUserRole: "host",
    currentUserName: "Mark",
    currentUserJoined: false,
    currentUserJoinIntentStatus: "not_joined",
    quoteStatus: "quote_pending",
    seatsUsed: 1,
    joinedRiders: [],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
    ],
    ...overrides,
  });
}

function scenario(id: RideAppSelfSettleScenarioId, title: string, ride: HomeRide, expected: string): RideAppSelfSettleScenario {
  return {
    id,
    title,
    role: id.startsWith("RA-H") ? "host" : "rider",
    routePolicy: ride.stopRequestPolicy === "host_approved_before_quote" ? "host_approved_stops" : "direct",
    expected,
    ride: { ...ride, id: id.toLowerCase().replaceAll("-", "-") },
    includeCalendar: true,
    includeChat: true,
  };
}

const scenarios: RideAppSelfSettleScenario[] = [
  scenario("RA-R-01", "Rider joined interest before host details", baseRide(), "Joined interest / seat hold. Chat locked."),
  scenario("RA-R-02", "Rider reviews shared booking details", detailsShared(), "Confirm ride details CTA. Chat locked."),
  scenario("RA-R-03", "Rider confirmed before deadline", confirmed(), "Confirmed with demo-confirmed fee. Chat waits for required riders."),
  scenario("RA-R-04", "Rider missed confirmation deadline", detailsShared({
    currentUserJoinIntentStatus: "seat_hold_expired",
    currentUserConfirmationExpired: true,
    seatHoldExpiredAt: expiredConfirmBy,
    confirmationDeadlineAt: expiredConfirmBy,
    rideAppConfirmBy: expiredConfirmBy,
    rideAppPodStatus: "seat_hold_expired",
    selfSettleConfirmationStatus: "expired",
    platformFeeStatus: "pending",
    seatsUsed: 1,
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "seat_hold_expired", isCurrentUser: true, confirmBy: expiredConfirmBy, seatHoldExpiredAt: expiredConfirmBy },
    ],
  }), "Seat hold expired. Request to rejoin CTA. Chat locked."),
  scenario("RA-R-05", "Rider needs review after fare update", confirmed({
    bookingDetailsVersion: 2,
    bookingDetailsUpdated: true,
    bookingDetailsLastMeaningfulUpdate: "fare_estimate",
    lastBookingDetailsUpdateReason: "Host updated the ride app fare estimate.",
    currentUserJoinIntentStatus: "needs_review",
    currentUserBookingDetailsConfirmed: true,
    currentUserConfirmedBookingDetailsVersion: 1,
    selfSettleConfirmationStatus: "needs_review",
    rideAppPodStatus: "needs_review",
    confirmedRiderCount: 0,
    rideAppConfirmedRiderCount: 0,
    rideAppConfirmedRiderIds: [],
    estimatedRideAppFare: "HK$118-132",
    rideAppBookingDetails: { estimatedFare: "HK$118-132" },
    rideAppEstimatedFarePerPerson: 31,
    rideAppEstimatedFareTotal: 124,
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 2 },
      { name: "You", role: "rider", status: "needs_review", isCurrentUser: true, confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
    ],
  }), "Review updated details CTA."),
  scenario("RA-R-06", "Rider reconfirmed updated details", confirmed({
    bookingDetailsVersion: 2,
    bookingDetailsUpdated: true,
    bookingDetailsLastMeaningfulUpdate: "fare_estimate",
    currentUserConfirmedBookingDetailsVersion: 2,
    estimatedRideAppFare: "HK$118-132",
    rideAppBookingDetails: { estimatedFare: "HK$118-132" },
    rideAppEstimatedFarePerPerson: 31,
    rideAppEstimatedFareTotal: 124,
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 2 },
      { name: "You", role: "rider", status: "confirmed", isCurrentUser: true, confirmedBookingDetailsVersion: 2, confirmBy: baseConfirmBy },
    ],
  }), "Confirmed again. No second RidePod fee."),
  scenario("RA-R-07", "Direct route stop request unavailable", detailsShared({ stopRequestPolicy: "direct_only" }), "Direct route only. Stop requests unavailable."),
  scenario("RA-R-08", "Rider stop request pending", detailsShared({
    stopRequestPolicy: "host_approved_before_quote",
    proposedStops: [routeStop("pending_host_approval")],
  }), "Stop request pending. Host must approve. Chat locked."),
  scenario("RA-R-09", "Host approved rider stop", detailsShared({
    stopRequestPolicy: "host_approved_before_quote",
    bookingDetailsVersion: 2,
    bookingDetailsUpdated: true,
    bookingDetailsLastMeaningfulUpdate: "stop_added",
    currentUserJoinIntentStatus: "needs_review",
    selfSettleConfirmationStatus: "needs_review",
    rideAppPodStatus: "needs_review",
    approvedStops: [routeStop("approved")],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 2 },
      { name: "You", role: "rider", status: "needs_review", isCurrentUser: true, confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
    ],
  }), "Approved stop appears. Rider must review updated route."),
  scenario("RA-R-10", "Host declined rider stop", detailsShared({
    stopRequestPolicy: "host_approved_before_quote",
    declinedStops: [routeStop("declined")],
  }), "Stop request declined. Route remains direct."),
  scenario("RA-R-11", "Host plus one rider confirmed, waiting for one more", confirmed({
    rideAppRequiredConfirmations: 2,
    seatsTotal: 3,
    seatsUsed: 3,
    joinedRiders: ["You", "Mina"],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "confirmed", isCurrentUser: true, confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
      { name: "Mina", role: "rider", status: "pending", confirmBy: baseConfirmBy },
    ],
  }), "Status ratio shows host plus confirmed rider, waiting for required riders."),
  scenario("RA-R-12", "Required riders confirmed and chat unlocked", confirmed({
    rideAppRequiredConfirmations: 2,
    seatsUsed: 3,
    joinedRiders: ["You", "Mina"],
    rideAppPodStatus: "chat_unlocked",
    chatUnlockedAt: "2026-06-07T12:00:00.000Z",
    confirmedRiderCount: 2,
    rideAppConfirmedRiderCount: 2,
    rideAppConfirmedRiderIds: ["mock-qa-rider", "mock-rider-mina"],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "confirmed", isCurrentUser: true, confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
      { name: "Mina", role: "rider", status: "confirmed", confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
    ],
  }), "Chat unlocked. Open chat CTA."),
  scenario("RA-R-13", "Host marked ride app booked", confirmed({
    rideAppRequiredConfirmations: 2,
    seatsUsed: 3,
    joinedRiders: ["You", "Mina"],
    rideAppPodStatus: "ride_booked",
    chatUnlockedAt: "2026-06-07T12:00:00.000Z",
    confirmedRiderCount: 2,
    rideAppConfirmedRiderCount: 2,
    rideAppConfirmedRiderIds: ["mock-qa-rider", "mock-rider-mina"],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "confirmed", isCurrentUser: true, confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
      { name: "Mina", role: "rider", status: "confirmed", confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
    ],
  }), "Ride app booked. Chat open for pickup updates."),
  scenario("RA-R-14", "Details shared but fare estimate missing", detailsShared({
    rideAppChecklist: missingFareChecklist,
    rideAppFareEstimateStatus: undefined,
    rideAppBookingDetails: {},
    estimatedRideAppFare: undefined,
    rideAppEstimatedFarePerPerson: null,
    rideAppEstimatedFareTotal: null,
  }), "Chat locked with fare estimate helper."),
  scenario("RA-R-15", "Details shared but split/payment missing", detailsShared({
    rideAppChecklist: missingSplitPaymentChecklist,
    rideAppSplitMethod: "",
    splitMethod: "",
    rideAppAcceptedPaymentMethods: [],
    paymentMethod: "",
  }), "Chat locked until host confirms split and payment."),
  scenario("RA-R-16", "Confirmed details but platform fee pending", confirmed({
    platformFeeStatus: "pending",
  }), "Awaiting platform fee. Chat locked."),
  scenario("RA-R-17", "Recurring direct template joined", detailsShared({
    rideKind: "recurring",
    stopRequestPolicy: "direct_only",
    scheduleLabel: "Every Monday and Thursday",
  }), "Recurring template displays safely."),
  scenario("RA-R-18", "Recurring stop request unsupported", detailsShared({
    rideKind: "recurring",
    stopRequestPolicy: "host_approved_before_quote",
    scheduleLabel: "Every Monday and Thursday",
  }), "Recurring stop request controls remain unavailable/disabled."),
  scenario("RA-H-01", "Host creates empty direct ride app pod", hostRide({
    rideAppPodStatus: "open",
  }), "Open direct route. Riders can join as interest."),
  scenario("RA-H-02", "Host has riders joined but no details", hostRide({
    seatsUsed: 3,
    joinedRiders: ["You", "Mina"],
    joinedRiderCount: 2,
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "joined_interest", confirmBy: baseConfirmBy },
      { name: "Mina", role: "rider", status: "joined_interest", confirmBy: baseConfirmBy },
    ],
  }), "Share booking details CTA. Mark booked blocked."),
  scenario("RA-H-03", "Host shared full details", hostRide({
    bookingDetailsShared: true,
    rideAppBookingDetailsFinalized: true,
    rideAppPodStatus: "awaiting_rider_confirmation",
    seatsUsed: 3,
    joinedRiders: ["You", "Mina"],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "pending", confirmBy: baseConfirmBy },
      { name: "Mina", role: "rider", status: "pending", confirmBy: baseConfirmBy },
    ],
  }), "Riders can confirm details. Chat locked until confirmations."),
  scenario("RA-H-04", "Host waiting for required riders", hostRide({
    bookingDetailsShared: true,
    rideAppBookingDetailsFinalized: true,
    rideAppPodStatus: "waiting_for_required_riders",
    seatsUsed: 3,
    joinedRiders: ["You", "Mina"],
    confirmedRiderCount: 1,
    rideAppConfirmedRiderCount: 1,
    rideAppConfirmedRiderIds: ["mock-qa-rider"],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "confirmed", confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
      { name: "Mina", role: "rider", status: "pending", confirmBy: baseConfirmBy },
    ],
  }), "Waiting state. Mark ride app booked blocked."),
  scenario("RA-H-05", "Host ready to book externally", hostRide({
    bookingDetailsShared: true,
    rideAppBookingDetailsFinalized: true,
    rideAppPodStatus: "ready_to_book",
    seatsUsed: 3,
    joinedRiders: ["You", "Mina"],
    confirmedRiderCount: 2,
    rideAppConfirmedRiderCount: 2,
    rideAppConfirmedRiderIds: ["mock-qa-rider", "mock-rider-mina"],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "confirmed", confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
      { name: "Mina", role: "rider", status: "confirmed", confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
    ],
  }), "Host can mark ride app booked after booking outside RidePod."),
  scenario("RA-H-06", "Host updated details after confirmation", hostRide({
    bookingDetailsShared: true,
    rideAppBookingDetailsFinalized: true,
    rideAppPodStatus: "needs_review",
    bookingDetailsVersion: 2,
    bookingDetailsUpdated: true,
    bookingDetailsLastMeaningfulUpdate: "fare_estimate",
    seatsUsed: 3,
    joinedRiders: ["You", "Mina"],
    confirmedRiderCount: 0,
    rideAppConfirmedRiderCount: 0,
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 2 },
      { name: "You", role: "rider", status: "needs_review", confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
      { name: "Mina", role: "rider", status: "needs_review", confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
    ],
  }), "Riders need review. Mark booked blocked."),
  scenario("RA-H-07", "Host reviews pending stop", hostRide({
    stopRequestPolicy: "host_approved_before_quote",
    proposedStops: [routeStop("pending_host_approval")],
    joinedRiders: ["You"],
    seatsUsed: 2,
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "You", role: "rider", status: "joined_interest", confirmBy: baseConfirmBy },
    ],
  }), "Host can approve stop before details are finalized."),
  scenario("RA-H-08", "Host declined stop", hostRide({
    stopRequestPolicy: "host_approved_before_quote",
    declinedStops: [routeStop("declined")],
    joinedRiders: ["You"],
    seatsUsed: 2,
  }), "Route unchanged after declined stop."),
  scenario("RA-H-09", "Host recurring direct ride app pod", hostRide({
    rideKind: "recurring",
    stopRequestPolicy: "direct_only",
    scheduleLabel: "Every Monday and Thursday",
  }), "Recurring template copy appears."),
  scenario("RA-H-10", "Host recurring stop request unavailable", hostRide({
    rideKind: "recurring",
    stopRequestPolicy: "host_approved_before_quote",
    scheduleLabel: "Every Monday and Thursday",
  }), "Recurring stop request setup is unavailable/disabled."),
  scenario("RA-H-11", "Host action center pending route request", hostRide({
    fromDistrict: "Admiralty",
    toDistrict: "Tsim Sha Tsui",
    fromLabel: "MOCK ACTION TEST",
    toLabel: "Kai Tak Sports Park",
    dateLabel: "Tue, Jun 9",
    timeLabel: "6:15 PM",
    estimatedRideAppFare: "HK$168",
    rideAppBookingDetails: {
      estimatedFare: "HK$168",
    },
    rideAppEstimatedFarePerPerson: 42,
    rideAppEstimatedFareTotal: 168,
    rideAppEstimatedFareCurrency: "HKD",
    rideAppEstimatedFareUpdatedBy: "Mark",
    rideAppEstimatedFareUpdatedAt: "2026-06-07T12:30:00.000Z",
    rideAppFareEstimateStatus: "accepted",
    rideAppProviderName: "Uber",
    stopRequestPolicy: "host_approved_before_quote",
    rideAppPodStatus: "open",
    seatsTotal: 4,
    seatsUsed: 4,
    joinedRiders: ["Mandy", "Ken", "James"],
    joinedRiderCount: 3,
    pickupLabel: "Admiralty Station Exit A rideshare pickup",
    dropoffLabel: "Kai Tak Sports Park Gate B",
    proposedStops: [
      {
        id: "ra-h-11-stop-mandy",
        label: "Wan Chai MTR Exit A",
        requestedBy: "Mandy",
        stopType: "pickup_stop",
        reason: "Easier pickup before the group heads to Kai Tak.",
        status: "pending_host_approval",
      },
    ],
    riderConfirmations: [
      { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
      { name: "Mandy", role: "rider", status: "pending", confirmBy: baseConfirmBy },
      { name: "Ken", role: "rider", status: "needs_review", confirmedBookingDetailsVersion: 1, confirmBy: baseConfirmBy },
      { name: "James", role: "rider", status: "seat_hold_expired", confirmBy: expiredConfirmBy, seatHoldExpiredAt: expiredConfirmBy },
    ],
  }), "Manage pod actions shows confirmations plus a pending route request tab."),
];

export const rideAppSelfSettleScenarios = scenarios;

export function getRideAppSelfSettleScenario(id: RideAppSelfSettleScenarioId | null = ACTIVE_RIDE_APP_SELF_SETTLE_SCENARIO_ID) {
  if (!id) return null;
  return rideAppSelfSettleScenarios.find((item) => item.id === id) ?? null;
}

export function getActiveRideAppSelfSettleRide() {
  return getRideAppSelfSettleScenario()?.ride ?? null;
}

export function getActiveRideAppSelfSettleCalendarRide(): CalendarRide | null {
  const scenario = getRideAppSelfSettleScenario();
  if (!scenario?.includeCalendar) return null;

  return {
    id: scenario.ride.id,
    date: "2026-06-08",
    time: "19:30",
    route: `${scenario.ride.fromLabel} to ${scenario.ride.toLabel}`,
    rideKind: scenario.ride.rideKind,
    status:
      scenario.ride.rideAppPodStatus === "ride_booked" || scenario.ride.rideAppPodStatus === "chat_unlocked"
        ? "ready_for_pickup"
        : scenario.ride.rideAppPodStatus === "seat_hold_expired"
          ? "expired"
          : scenario.ride.bookingDetailsShared
            ? "confirm_details"
            : "forming",
    seatsFilled: scenario.ride.seatsUsed,
    seatsTotal: scenario.ride.seatsTotal,
    estimatedShare: scenario.ride.rideAppEstimatedFarePerPerson ?? scenario.ride.pricePerPerson,
    rideAppEstimatedFarePerPerson: scenario.ride.rideAppEstimatedFarePerPerson,
    rideAppEstimatedFareTotal: scenario.ride.rideAppEstimatedFareTotal,
    rideAppEstimatedFareCurrency: scenario.ride.rideAppEstimatedFareCurrency,
    rideAppEstimatedFareUpdatedBy: scenario.ride.rideAppEstimatedFareUpdatedBy,
    rideAppEstimatedFareUpdatedAt: scenario.ride.rideAppEstimatedFareUpdatedAt,
    rideAppEstimatedFareNote: scenario.ride.rideAppEstimatedFareNote,
    schedule: scenario.ride.scheduleLabel,
    rideMode: "ride_app",
    currentUserRole: scenario.ride.currentUserRole,
    bookingDetailsConfirmed: scenario.ride.currentUserBookingDetailsConfirmed,
  };
}

export function getActiveRideAppSelfSettleChatPreview(): PodChatPreview | null {
  const scenario = getRideAppSelfSettleScenario();
  if (!scenario?.includeChat) return null;

  const badge: RideBadge = scenario.ride.rideKind === "recurring" ? "Recurring" : "One-off";
  const chatUnlocked =
    scenario.ride.rideAppPodStatus === "chat_unlocked" ||
    scenario.ride.rideAppPodStatus === "ride_booked" ||
    Boolean(scenario.ride.chatUnlockedAt);

  return {
    id: scenario.ride.id,
    podId: scenario.ride.id,
    route: `${scenario.ride.fromLabel} to ${scenario.ride.toLabel}`,
    role: scenario.role === "host" ? "hosted" : "joined",
    rideMode: "ride_app",
    rideBadges: [badge],
    status: chatUnlocked ? "pickup_soon" : "locked",
    timeLabel: `${scenario.ride.dateLabel} - ${scenario.ride.timeLabel}`,
    participants: [scenario.ride.hostName, ...scenario.ride.joinedRiders],
    latestMessage: chatUnlocked ? "Ride app details are ready for pickup coordination." : scenario.expected,
    unreadCount: chatUnlocked ? 1 : undefined,
    roomTitle: `${scenario.id} ${scenario.title}`,
    memberCount: Math.max(1, scenario.ride.seatsUsed),
    messages: [
      {
        id: `${scenario.ride.id}-system`,
        sender: "RidePod",
        body: scenario.expected,
        time: "Now",
      },
    ],
  };
}
