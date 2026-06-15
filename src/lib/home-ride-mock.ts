import type { TaxiType } from "@/lib/hkTaxiFare";
import { getActiveRideAppSelfSettleRide } from "@/lib/ride-app-self-settle-scenarios";
import type { RidePodAvatarPreference } from "@/components/animal-avatar";

export type HomeTab = "all" | "airport" | "one_off" | "recurring" | "quote_ready";
export type AirportDirection = "to_airport" | "from_airport" | null;
export type QuoteStatus = "quote_pending" | "quote_ready" | "ready_for_pickup" | "full" | "joined";
export type RideStatus = "forming" | "locked" | "available" | "cancelled" | "expired";
export type QuoteAcceptanceStatus = "PENDING" | "ACCEPTED" | "DECLINED";
export type DriverAssignmentStatus = "PENDING" | "PARTNER_ACCEPTED";
export type PickupStatus = "WAITING_FOR_PARTNER" | "READY_FOR_PICKUP" | "PARTNER_ARRIVED" | "RIDE_STARTED";
export type RiderPickupStatus = "NOT_ARRIVED" | "ARRIVED_AT_PICKUP";
export type RecurringTripPattern = "one_way" | "back_and_forth";
export type StopRequestPolicy = "direct_only" | "host_approved_before_quote";
export type RoutePlanStopStatus = "pending_host_approval" | "approved" | "declined";

export type RoutePlanStop = {
  id: string;
  label: string;
  requestedBy?: string;
  stopType?: "pickup_stop" | "dropoff_stop" | "quick_stop";
  reason?: string;
  status: RoutePlanStopStatus;
};

export type RideAppChecklist = {
  pickupPoint: boolean;
  dropoffPoint: boolean;
  rideApp: boolean;
  estimatedFare: boolean;
  booker: boolean;
  fareSplit: boolean;
  paymentMethod: boolean;
  paymentRecipientAfterRide: boolean;
  meetingTime: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type RideAppRiderConfirmationStatus =
  | "host"
  | "joined_interest"
  | "confirmed"
  | "pending"
  | "needs_review"
  | "seat_hold_expired"
  | "expired"
  | "left";

export type RideAppJoinIntentStatus =
  | "not_joined"
  | "joined_interest"
  | "confirmed"
  | "needs_review"
  | "seat_hold_expired"
  | "left";

export type RideAppPlatformFeeStatus = "pending" | "demo_confirmed" | "paid" | "waived" | "failed";

export type RideAppFareEstimateScreenshot = {
  fileName?: string;
  previewUrl?: string;
  addedAt?: string;
  note?: string;
} | null;

export type RideAppSelfSettleReportCategory =
  | "safety_concern"
  | "harassment_abuse"
  | "host_no_show"
  | "rider_no_show"
  | "host_cancelled_after_confirmed"
  | "fare_payment_disagreement"
  | "suspicious_fake_information"
  | "pressure_to_pay_outside_agreed_method"
  | "other";

export type RideAppSelfSettleReport = {
  id: string;
  podId: string;
  reporterUserId: string;
  reporterRole?: HomeRide["currentUserRole"] | null;
  category: RideAppSelfSettleReportCategory;
  description: string;
  amountInvolved?: string | null;
  paymentMethodInvolved?: string | null;
  status: "under_review";
  submittedAt: string;
};

export type RideAppHostCancellationStatus =
  | "active"
  | "host_cancelled"
  | "host_replacement_needed"
  | "replacement_booker_selected"
  | "cancelled";

export type RideAppFeeResolution =
  | "not_confirmed"
  | "remains_active"
  | "restore_waiver"
  | "restore_in_live_version"
  | "review_needed";

export type HomeRide = {
  id: string;
  fromDistrict: string;
  toDistrict: string;
  fromLabel: string;
  toLabel: string;
  dateLabel: string;
  timeLabel: string;
  seatsUsed: number;
  seatsTotal: number;
  pricePerPerson: number;
  rideKind: "airport" | "one_off" | "recurring";
  rideService?: "taxi" | "ride_app";
  rideCategory?: "taxi" | "taxi_partner_quote" | "taxi_meter" | "ride_app_self_settle";
  selfSettleRiskAccepted?: boolean;
  bookingDetailsShared?: boolean;
  rideAppBookingDetailsConfirmed?: boolean;
  rideAppBookingDetailsConfirmedAt?: string | null;
  rideAppBookingDetailsConfirmedBy?: string | null;
  rideAppBookingDetailsFinalized?: boolean;
  rideAppBookingDetailsFinalizedAt?: string | null;
  rideAppBookingDetailsFinalizedBy?: string | null;
  confirmationDeadlineLabel?: string;
  confirmationDeadlineAt?: string | null;
  currentUserJoinIntentStatus?: RideAppJoinIntentStatus;
  joinLeaveCountForCurrentUser?: number;
  lastLeftAt?: string | null;
  rejoinCooldownUntil?: string | null;
  requiresHostApprovalToRejoin?: boolean;
  rideAppJoinLeaveActivitySummary?: string | null;
  currentUserConfirmationExpired?: boolean;
  seatHoldReleasedAt?: string | null;
  seatHoldExpiredAt?: string | null;
  bookingDetailsVersion?: number;
  bookingDetailsUpdated?: boolean;
  bookingDetailsLastMeaningfulUpdate?:
    | null
    | "fare_estimate"
    | "route"
    | "pickup"
    | "dropoff"
    | "pickup_time"
    | "ride_app"
    | "split_method"
    | "payment_method"
    | "stop_added";
  lastBookingDetailsUpdateReason?: string | null;
  currentUserConfirmedBookingDetailsVersion?: number | null;
  rideAppDetailVersion?: number;
  rideAppCurrentDetailVersion?: number;
  rideAppBookingDetails?: {
    estimatedFare?: string;
  };
  currentUserRideAppDetailVersionConfirmed?: number;
  rideAppConfirmBy?: string | null;
  rideAppConfirmByUpdatedAt?: string | null;
  rideAppFareEstimateScreenshotName?: string | null;
  rideAppFareEstimateScreenshotAddedAt?: string | null;
  fareEstimateScreenshot?: RideAppFareEstimateScreenshot;
  rideAppAcknowledgements?: Array<{ userId: string; acknowledgedAt: string }>;
  rideAppChecklist?: RideAppChecklist;
  rideAppPodStatus?:
    | "open"
    | "booking_details_needed"
    | "pending_host_acceptance"
    | "booking_details_shared"
    | "awaiting_rider_confirmation"
    | "needs_review"
    | "waiting_for_required_riders"
    | "chat_unlocked"
    | "ready_to_book"
    | "seat_hold_expired"
    | "ride_booked"
    | "settlement_pending"
    | "completed"
    | "cancelled"
    | "expired";
  // TODO: Persist these Ride app booking/payment rules in backend pod metadata when create flow writes to storage.
  rideAppBookingTrigger?: "all_seats_confirmed" | "minimum_riders_confirmed";
  rideAppMinimumConfirmedRiders?: number;
  rideAppRequiredConfirmations?: number;
  rideAppConfirmedRiderIds?: string[];
  rideAppHostCancellationStatus?: RideAppHostCancellationStatus;
  rideAppHostCancellationReason?: string | null;
  rideAppReplacementBookerId?: string | null;
  rideAppReplacementBookerName?: string | null;
  rideAppReplacementDeadlineLabel?: string | null;
  rideAppFeeResolution?: RideAppFeeResolution;
  rideAppHostCancellationActivity?: string[];
  rideAppSeatReleasedAt?: string | null;
  rideAppRejoinRequestedAt?: string | null;
  rideAppRejoinRequestedBy?: string | null;
  chatUnlockedAt?: string | null;
  rideAppFarePaymentTiming?: "after_ride";
  rideAppProviderName?: string;
  rideAppSplitMethod?: string;
  rideAppFareEstimateStatus?: "pending" | "accepted";
  rideAppAcceptedPaymentMethods?: string[];
  airportDirection: AirportDirection;
  status: RideStatus;
  quoteStatus: QuoteStatus;
  currentUserRole?: "host" | "rider" | "joined_rider" | "taxi_partner";
  currentUserName?: string;
  currentUserJoined?: boolean;
  currentUserBookingDetailsConfirmed?: boolean;
  platformFeeStatus?: RideAppPlatformFeeStatus;
  selfSettleConfirmationStatus?: "pending" | "confirmed" | "needs_review" | "expired";
  confirmedRiderCount?: number;
  joinedRiderCount?: number;
  rideAppConfirmedRiderCount?: number;
  riderConfirmations?: Array<{
    name: string;
    role: "host" | "rider";
    status: RideAppRiderConfirmationStatus;
    isCurrentUser?: boolean;
    confirmedDetailVersion?: number;
    confirmedBookingDetailsVersion?: number;
    confirmBy?: string | null;
    seatHoldExpiredAt?: string | null;
  }>;
  currentUserQuoteAccepted?: boolean;
  guestAcceptanceStatus?: QuoteAcceptanceStatus;
  mockPaymentState?: "NOT_STARTED" | "DEMO_ACCEPTED" | "MOCK_ACCEPTED";
  allGuestsAccepted?: boolean;
  driverAssignmentStatus?: DriverAssignmentStatus;
  pickupStatus?: PickupStatus;
  riderPickupStatus?: RiderPickupStatus;
  taxiPartnerName?: string;
  quoteAmountCents?: number;
  quoteAboveCap?: boolean;
  routeChangeRequiresNewQuote?: boolean;
  quoteUpdatedAfterRouteChange?: boolean;
  bookingFareCapCents?: number;
  quoteExpiresInMinutes?: number;
  acceptedGuestCount?: number;
  requiredGuestCount?: number;
  taxiType: string;
  platformFee?: number;
  estimatedRideAppFare?: string;
  rideAppEstimatedFarePerPerson?: number | null;
  rideAppEstimatedFareTotal?: number | null;
  rideAppEstimatedFareCurrency?: "HKD";
  rideAppEstimatedFareUpdatedBy?: string | null;
  rideAppEstimatedFareUpdatedAt?: string | null;
  rideAppEstimatedFareNote?: string | null;
  splitMethod?: string;
  paymentMethod?: string;
  fareReferenceTaxiType?: TaxiType;
  fareReferenceDistanceMeters?: number;
  ridePodProtectionFeePerSeat?: number;
  fareReferenceTollAmount?: number;
  luggage: string;
  accessibility: string;
  podType: "Open pod" | "Women-only" | "Verified-only" | "Invite-only";
  hostName: string;
  hostAvatarPreference?: RidePodAvatarPreference;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
  joinedRiders: string[];
  pickupLabel?: string;
  pickupTime?: string;
  dropoffLabel?: string;
  stopRequestPolicy?: StopRequestPolicy;
  proposedStops?: RoutePlanStop[];
  approvedStops?: RoutePlanStop[];
  declinedStops?: RoutePlanStop[];
  selectedRideDate?: string;
  direction?: "Outbound" | "Return";
  scheduleLabel?: string;
  weekdays?: string[];
  tripPattern?: RecurringTripPattern;
  startLabel?: string;
  endLabel?: string;
  outboundLabel?: string;
  returnLabel?: string;
  repeatsPattern?: string;
  nextRideLabel?: string;
  upcomingRides?: Array<{ date: string; time: string; label: string }>;
};

export const districtOptions = [
  "All districts",
  "Hong Kong Island",
  "Kowloon",
  "New Territories",
  "Central",
  "Admiralty",
  "Wan Chai",
  "Causeway Bay",
  "Tsim Sha Tsui",
  "Mong Kok",
  "Jordan",
  "Sha Tin",
  "Tsuen Wan",
  "Tung Chung",
  "Airport",
];

export const districtGroups: Record<string, string[]> = {
  "Hong Kong Island": ["Central", "Admiralty", "Wan Chai", "Causeway Bay"],
  Kowloon: ["Tsim Sha Tsui", "Mong Kok", "Jordan"],
  "New Territories": ["Sha Tin", "Tsuen Wan", "Tung Chung"],
  Airport: ["Airport", "Hong Kong International Airport", "Chek Lap Kok"],
};

const activeRideAppSelfSettleRide = getActiveRideAppSelfSettleRide();

export const homeRides: HomeRide[] = activeRideAppSelfSettleRide ? [activeRideAppSelfSettleRide] : [];

export function matchesDistrict(selectedDistrict: string, rideDistrict: string) {
  if (selectedDistrict === "All districts") return true;
  if (selectedDistrict === rideDistrict) return true;

  return districtGroups[selectedDistrict]?.includes(rideDistrict) ?? false;
}

export function rideMatchesTab(tab: HomeTab, ride: HomeRide) {
  if (tab === "all") return true;
  if (tab === "airport") return ride.rideKind === "airport";
  if (tab === "quote_ready") {
    return ride.quoteStatus === "quote_ready" && ride.currentUserQuoteAccepted !== true;
  }
  return ride.rideKind === tab;
}

export function getHomeRide(id: string) {
  return homeRides.find((ride) => ride.id === id) ?? null;
}
