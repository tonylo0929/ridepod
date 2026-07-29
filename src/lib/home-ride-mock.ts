import type { TaxiType } from "@/lib/hkTaxiFare";
import { getActiveRideAppSelfSettleRide } from "@/lib/ride-app-self-settle-scenarios";
import type { RidePodAvatarPreference } from "@/components/animal-avatar";

export type HomeTab = "all" | "airport" | "one_off" | "recurring" | "quote_ready";
export type AirportDirection = "to_airport" | "from_airport" | null;
export type AirportLuggage = {
  largeSuitcases: number;
  cabinBags: number;
  specialItems: string[];
  note?: string;
};
export type QuoteStatus = "quote_pending" | "quote_ready" | "ready_for_pickup" | "full" | "joined";
export type RideStatus =
  | "forming"
  | "locked"
  | "available"
  | "cancelled"
  | "cancelled_by_host"
  | "cancelled_by_system"
  | "cancellation_review_required"
  | "expired";
export type QuoteAcceptanceStatus = "PENDING" | "ACCEPTED" | "DECLINED";
export type DriverAssignmentStatus = "PENDING" | "PARTNER_ACCEPTED";
export type PickupStatus = "WAITING_FOR_PARTNER" | "READY_FOR_PICKUP" | "PARTNER_ARRIVED" | "RIDE_STARTED";
export type RiderPickupStatus = "NOT_ARRIVED" | "ARRIVED_AT_PICKUP";
export type RecurringTripPattern = "one_way" | "back_and_forth";
export type StopRequestPolicy = "direct_only" | "host_approved_before_quote" | "host_approved_stops";
export type RoutePlanStopStatus = "pending_host_approval" | "approved" | "declined";
export type RouteRequestStatus = "pending" | "approved" | "declined" | "joined" | "closed_pod_cancelled" | "withdrawn" | "expired";

export type GeoCoordinates = {
  lat: number;
  lng: number;
};

export type RoutePlanStop = {
  id: string;
  label: string;
  coordinates?: GeoCoordinates | null;
  requestedBy?: string;
  stopType?: "pickup_stop" | "dropoff_stop" | "quick_stop";
  reason?: string;
  status: RoutePlanStopStatus;
};

export type RouteRequest = {
  id: string;
  requestedByUserId?: string;
  requestedByName: string;
  stopLocation: string;
  stopCoordinates?: GeoCoordinates | null;
  reason?: string;
  status: RouteRequestStatus;
  requestedAtLabel?: string;
  reviewedAtLabel?: string;
  reviewedByName?: string;
};

export type NormalizedRouteRequests = {
  all: RouteRequest[];
  pending: RouteRequest[];
  approved: RouteRequest[];
  declined: RouteRequest[];
  currentUserRequest?: RouteRequest | null;
  pendingCount: number;
  hasPendingForHost: boolean;
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
  | "stop_request_pending"
  | "stop_request_approved"
  | "stop_request_declined"
  | "joined"
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
  | "cancelled_by_host"
  | "cancelled_by_system"
  | "cancellation_review_required"
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
  confirmationOffsetMinutes?: number | null;
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
    | "gather_point"
    | "dropoff"
    | "pickup_time"
    | "ride_app"
    | "split_method"
    | "payment_method"
    | "stop_added"
    | "confirm_by_shortened";
  lastBookingDetailsUpdateReason?: string | null;
  currentUserConfirmedBookingDetailsVersion?: number | null;
  rideAppDetailVersion?: number;
  rideAppCurrentDetailVersion?: number;
  rideAppBookingDetails?: {
    rideAppName?: string;
    rideAppUsed?: string;
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
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  previousPodStatus?: string | null;
  cancellationStatus?: "cancelled_by_host" | "cancelled_by_system" | "cancellation_review_required" | null;
  paymentReleaseStatus?: "not_charged" | "hold_release_pending" | "hold_released" | "refund_pending" | "refunded" | "cancellation_review_required" | null;
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
  rideAppFareEstimateReviewStatus?: "needs_review" | "confirmed";
  rideAppAcceptedPaymentMethods?: string[];
  tripKind?: "normal" | "airport";
  airportDirection: AirportDirection;
  flightNumber?: string | null;
  flightFrom?: string | null;
  flightTo?: string | null;
  flightTimeLabel?: string | null;
  airportTerminal?: string | null;
  airportHall?: string | null;
  airportLuggage?: AirportLuggage | null;
  status: RideStatus;
  quoteStatus: QuoteStatus;
  currentUserRole?: "host" | "rider" | "joined_rider" | "taxi_partner";
  currentUserName?: string;
  currentUserJoined?: boolean;
  deletedByCurrentUser?: boolean;
  deletedAt?: string | null;
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
  createdByUserId?: string | null;
  hostAvatarPreference?: RidePodAvatarPreference;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
  joinedRiders: string[];
  pickupLabel?: string;
  pickupCoordinates?: GeoCoordinates | null;
  pickupTime?: string;
  dropoffLabel?: string;
  dropoffCoordinates?: GeoCoordinates | null;
  stopRequestPolicy?: StopRequestPolicy;
  routeRequests?: RouteRequest[];
  proposedStops?: RoutePlanStop[];
  approvedStops?: RoutePlanStop[];
  declinedStops?: RoutePlanStop[];
  selectedRideDate?: string;
  direction?: "Outbound" | "Return";
  is_recurring?: boolean;
  recurrence_label?: string;
  ride_time?: string;
  period_label?: string;
  next_occurrence_label?: string;
  regular_count?: number;
  max_regulars?: number;
  seats_open?: number;
  estimated_share?: string | number;
  host_avatar_url?: string | null;
  host_rating?: number | string;
  is_verified?: boolean;
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

const recurringRideAppSearchRides: HomeRide[] = [
  {
    id: "recurring-ride-app-central-cyberport",
    fromDistrict: "Central",
    toDistrict: "Hong Kong Island",
    fromLabel: "Central",
    toLabel: "Cyberport",
    dateLabel: "Thu, Aug 13",
    timeLabel: "7:10 AM",
    seatsUsed: 3,
    seatsTotal: 5,
    pricePerPerson: 38,
    rideKind: "recurring",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppProviderName: "Uber",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "accepted",
    rideAppEstimatedFarePerPerson: 38,
    rideAppEstimatedFareCurrency: "HKD",
    airportDirection: null,
    status: "available",
    quoteStatus: "quote_pending",
    taxiType: "Ride app",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "Outside RidePod after each ride",
    luggage: "Daily commute bags",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Maya",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "raccoon" },
    hostDisplayName: "Maya",
    joinedRiders: ["Maya", "Leo", "Anson"],
    pickupLabel: "Central",
    pickupCoordinates: { lat: 22.2819, lng: 114.1588 },
    pickupTime: "7:05 AM",
    dropoffLabel: "Cyberport",
    dropoffCoordinates: { lat: 22.2617, lng: 114.13 },
    stopRequestPolicy: "direct_only",
    selectedRideDate: "2026-08-13",
    direction: "Outbound",
    is_recurring: true,
    recurrence_label: "MON-FRI",
    ride_time: "7:10 AM",
    period_label: "Morning",
    next_occurrence_label: "Thu, Aug 13",
    regular_count: 3,
    max_regulars: 5,
    seats_open: 2,
    estimated_share: 38,
    host_rating: 4.9,
    is_verified: true,
    scheduleLabel: "Weekdays",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    tripPattern: "one_way",
    startLabel: "Starts Aug 13",
    endLabel: "Ongoing",
    outboundLabel: "Central to Cyberport",
    repeatsPattern: "Weekdays",
    nextRideLabel: "Next: Thu, Aug 13",
    upcomingRides: [{ date: "2026-08-13", time: "07:10", label: "Central to Cyberport" }],
  },
  {
    id: "ride-app-tai-po-airport",
    fromDistrict: "New Territories",
    toDistrict: "Airport",
    fromLabel: "Tai Po",
    toLabel: "Hong Kong Airport",
    dateLabel: "Aug 11",
    timeLabel: "7:25 AM",
    seatsUsed: 2,
    seatsTotal: 4,
    pricePerPerson: 45,
    rideKind: "airport",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppProviderName: "Uber",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "accepted",
    rideAppEstimatedFarePerPerson: 45,
    rideAppEstimatedFareCurrency: "HKD",
    airportDirection: "to_airport",
    flightNumber: "CX 841",
    flightTo: "Hong Kong Airport",
    airportTerminal: "Terminal 1",
    status: "available",
    quoteStatus: "quote_pending",
    taxiType: "Uber",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "Outside RidePod after each ride",
    luggage: "Cabin bags welcome",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Jason",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "raccoon" },
    hostDisplayName: "Jason",
    joinedRiders: ["Jason", "Ivy"],
    pickupLabel: "Tai Po",
    pickupCoordinates: { lat: 22.4508, lng: 114.1642 },
    pickupTime: "7:20 AM",
    dropoffLabel: "Hong Kong Airport",
    dropoffCoordinates: { lat: 22.308, lng: 113.9185 },
    stopRequestPolicy: "direct_only",
    selectedRideDate: "2026-08-11",
    direction: "Outbound",
    ride_time: "7:25 AM",
    period_label: "Morning",
    seats_open: 2,
    estimated_share: 45,
    host_rating: 4.8,
    is_verified: true,
    tripPattern: "one_way",
    outboundLabel: "Tai Po to Hong Kong Airport",
    upcomingRides: [{ date: "2026-08-11", time: "07:25", label: "Tai Po to Hong Kong Airport" }],
  },
  {
    id: "ride-app-central-airport-early",
    fromDistrict: "Hong Kong Island",
    toDistrict: "Airport",
    fromLabel: "Central",
    toLabel: "Hong Kong Airport",
    dateLabel: "Aug 12",
    timeLabel: "5:45 AM",
    seatsUsed: 1,
    seatsTotal: 4,
    pricePerPerson: 52,
    rideKind: "airport",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppProviderName: "Uber",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "accepted",
    rideAppEstimatedFarePerPerson: 52,
    rideAppEstimatedFareCurrency: "HKD",
    airportDirection: "to_airport",
    flightNumber: "UO 624",
    flightTo: "Hong Kong Airport",
    status: "available",
    quoteStatus: "quote_pending",
    taxiType: "Uber",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "Outside RidePod after each ride",
    luggage: "Cabin bags welcome",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Chloe",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "frog" },
    hostDisplayName: "Chloe",
    joinedRiders: ["Chloe"],
    pickupLabel: "Central Pier 7",
    pickupCoordinates: { lat: 22.2877, lng: 114.1584 },
    pickupTime: "5:35 AM",
    dropoffLabel: "Hong Kong Airport",
    dropoffCoordinates: { lat: 22.308, lng: 113.9185 },
    stopRequestPolicy: "host_approved_stops",
    selectedRideDate: "2026-08-12",
    direction: "Outbound",
    ride_time: "5:45 AM",
    period_label: "Early Morning",
    seats_open: 3,
    estimated_share: 52,
    host_rating: 4.9,
    is_verified: true,
    tripPattern: "one_way",
    outboundLabel: "Central to Hong Kong Airport",
    upcomingRides: [{ date: "2026-08-12", time: "05:45", label: "Central to Hong Kong Airport" }],
  },
  {
    id: "ride-app-tsim-sha-tsui-airport",
    fromDistrict: "Kowloon",
    toDistrict: "Airport",
    fromLabel: "Tsim Sha Tsui",
    toLabel: "Hong Kong Airport",
    dateLabel: "Aug 14",
    timeLabel: "9:15 AM",
    seatsUsed: 3,
    seatsTotal: 5,
    pricePerPerson: 49,
    rideKind: "airport",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppProviderName: "HKTaxi",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "accepted",
    rideAppEstimatedFarePerPerson: 49,
    rideAppEstimatedFareCurrency: "HKD",
    airportDirection: "to_airport",
    flightNumber: "CX 734",
    flightTo: "Hong Kong Airport",
    status: "available",
    quoteStatus: "quote_pending",
    taxiType: "HKTaxi",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "Outside RidePod after each ride",
    luggage: "1 large suitcase space left",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Nora",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "raccoon" },
    hostDisplayName: "Nora",
    joinedRiders: ["Nora", "Ethan", "Yan"],
    pickupLabel: "K11 Musea",
    pickupCoordinates: { lat: 22.2947, lng: 114.1731 },
    pickupTime: "9:05 AM",
    dropoffLabel: "Hong Kong Airport",
    dropoffCoordinates: { lat: 22.308, lng: 113.9185 },
    stopRequestPolicy: "direct_only",
    selectedRideDate: "2026-08-14",
    direction: "Outbound",
    ride_time: "9:15 AM",
    period_label: "Morning",
    seats_open: 2,
    estimated_share: 49,
    host_rating: 4.8,
    is_verified: true,
    tripPattern: "one_way",
    outboundLabel: "Tsim Sha Tsui to Hong Kong Airport",
    upcomingRides: [{ date: "2026-08-14", time: "09:15", label: "Tsim Sha Tsui to Hong Kong Airport" }],
  },
  {
    id: "ride-app-sha-tin-airport",
    fromDistrict: "New Territories",
    toDistrict: "Airport",
    fromLabel: "Sha Tin",
    toLabel: "Hong Kong Airport",
    dateLabel: "Aug 16",
    timeLabel: "1:20 PM",
    seatsUsed: 2,
    seatsTotal: 6,
    pricePerPerson: 42,
    rideKind: "airport",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppProviderName: "Uber",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "accepted",
    rideAppEstimatedFarePerPerson: 42,
    rideAppEstimatedFareCurrency: "HKD",
    airportDirection: "to_airport",
    flightNumber: "HX 608",
    flightTo: "Hong Kong Airport",
    status: "available",
    quoteStatus: "quote_pending",
    taxiType: "Uber",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "Outside RidePod after each ride",
    luggage: "Light luggage preferred",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Brian",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "frog" },
    hostDisplayName: "Brian",
    joinedRiders: ["Brian", "Miki"],
    pickupLabel: "Sha Tin Station",
    pickupCoordinates: { lat: 22.3828, lng: 114.1881 },
    pickupTime: "1:10 PM",
    dropoffLabel: "Hong Kong Airport",
    dropoffCoordinates: { lat: 22.308, lng: 113.9185 },
    stopRequestPolicy: "host_approved_stops",
    selectedRideDate: "2026-08-16",
    direction: "Outbound",
    ride_time: "1:20 PM",
    period_label: "Afternoon",
    seats_open: 4,
    estimated_share: 42,
    host_rating: 4.7,
    is_verified: true,
    tripPattern: "one_way",
    outboundLabel: "Sha Tin to Hong Kong Airport",
    upcomingRides: [{ date: "2026-08-16", time: "13:20", label: "Sha Tin to Hong Kong Airport" }],
  },
  {
    id: "ride-app-airport-causeway-bay",
    fromDistrict: "Airport",
    toDistrict: "Hong Kong Island",
    fromLabel: "Hong Kong Airport",
    toLabel: "Causeway Bay",
    dateLabel: "Aug 11",
    timeLabel: "8:40 PM",
    seatsUsed: 2,
    seatsTotal: 5,
    pricePerPerson: 55,
    rideKind: "airport",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppProviderName: "Uber",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "accepted",
    rideAppEstimatedFarePerPerson: 55,
    rideAppEstimatedFareCurrency: "HKD",
    airportDirection: "from_airport",
    flightNumber: "CX 712",
    flightFrom: "Bangkok",
    status: "available",
    quoteStatus: "quote_pending",
    taxiType: "Uber",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "Outside RidePod after each ride",
    luggage: "2 large suitcase spaces",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Ivy",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "raccoon" },
    hostDisplayName: "Ivy",
    joinedRiders: ["Ivy", "Marco"],
    pickupLabel: "HKIA Arrival Hall A",
    pickupCoordinates: { lat: 22.3136, lng: 113.9272 },
    pickupTime: "8:35 PM",
    dropoffLabel: "Causeway Bay",
    dropoffCoordinates: { lat: 22.2802, lng: 114.1844 },
    stopRequestPolicy: "host_approved_stops",
    selectedRideDate: "2026-08-11",
    direction: "Outbound",
    ride_time: "8:40 PM",
    period_label: "Evening",
    seats_open: 3,
    estimated_share: 55,
    host_rating: 4.9,
    is_verified: true,
    tripPattern: "one_way",
    outboundLabel: "Hong Kong Airport to Causeway Bay",
    upcomingRides: [{ date: "2026-08-11", time: "20:40", label: "Hong Kong Airport to Causeway Bay" }],
  },
  {
    id: "ride-app-airport-kowloon-station",
    fromDistrict: "Airport",
    toDistrict: "Kowloon",
    fromLabel: "Hong Kong Airport",
    toLabel: "Kowloon Station",
    dateLabel: "Aug 13",
    timeLabel: "6:10 PM",
    seatsUsed: 1,
    seatsTotal: 4,
    pricePerPerson: 48,
    rideKind: "airport",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppProviderName: "HKTaxi",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "accepted",
    rideAppEstimatedFarePerPerson: 48,
    rideAppEstimatedFareCurrency: "HKD",
    airportDirection: "from_airport",
    flightNumber: "UO 701",
    flightFrom: "Taipei",
    status: "available",
    quoteStatus: "quote_pending",
    taxiType: "HKTaxi",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "Outside RidePod after each ride",
    luggage: "Cabin bags welcome",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Felix",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "frog" },
    hostDisplayName: "Felix",
    joinedRiders: ["Felix"],
    pickupLabel: "HKIA Arrival Hall B",
    pickupCoordinates: { lat: 22.3136, lng: 113.9272 },
    pickupTime: "6:05 PM",
    dropoffLabel: "Kowloon Station",
    dropoffCoordinates: { lat: 22.3049, lng: 114.1615 },
    stopRequestPolicy: "direct_only",
    selectedRideDate: "2026-08-13",
    direction: "Outbound",
    ride_time: "6:10 PM",
    period_label: "Evening",
    seats_open: 3,
    estimated_share: 48,
    host_rating: 4.8,
    is_verified: true,
    tripPattern: "one_way",
    outboundLabel: "Hong Kong Airport to Kowloon Station",
    upcomingRides: [{ date: "2026-08-13", time: "18:10", label: "Hong Kong Airport to Kowloon Station" }],
  },
  {
    id: "recurring-ride-app-mong-kok-kowloon-bay",
    fromDistrict: "Kowloon",
    toDistrict: "Kowloon",
    fromLabel: "Mong Kok",
    toLabel: "Kowloon Bay",
    dateLabel: "Wed, Aug 12",
    timeLabel: "7:40 AM",
    seatsUsed: 4,
    seatsTotal: 6,
    pricePerPerson: 35,
    rideKind: "recurring",
    rideService: "ride_app",
    rideCategory: "ride_app_self_settle",
    selfSettleRiskAccepted: true,
    bookingDetailsShared: false,
    rideAppProviderName: "HKTaxi",
    rideAppSplitMethod: "Even split",
    rideAppFareEstimateStatus: "accepted",
    rideAppEstimatedFarePerPerson: 35,
    rideAppEstimatedFareCurrency: "HKD",
    airportDirection: null,
    status: "available",
    quoteStatus: "quote_pending",
    taxiType: "Ride app",
    platformFee: 5,
    splitMethod: "Even split",
    paymentMethod: "Outside RidePod after each ride",
    luggage: "Daily commute bags",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Kara",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "raccoon" },
    hostDisplayName: "Kara",
    joinedRiders: ["Kara", "Sam", "Hei", "Wing"],
    pickupLabel: "Mong Kok",
    pickupCoordinates: { lat: 22.3193, lng: 114.1694 },
    pickupTime: "7:35 AM",
    dropoffLabel: "Kowloon Bay",
    dropoffCoordinates: { lat: 22.3235, lng: 114.2143 },
    stopRequestPolicy: "direct_only",
    selectedRideDate: "2026-08-12",
    direction: "Outbound",
    is_recurring: true,
    recurrence_label: "MON/WED/FRI",
    ride_time: "7:40 AM",
    period_label: "Morning",
    next_occurrence_label: "Wed, Aug 12",
    regular_count: 4,
    max_regulars: 6,
    seats_open: 1,
    estimated_share: 35,
    host_rating: 4.9,
    is_verified: true,
    scheduleLabel: "Monday, Wednesday, Friday",
    weekdays: ["Mon", "Wed", "Fri"],
    tripPattern: "one_way",
    startLabel: "Starts Aug 12",
    endLabel: "Ongoing",
    outboundLabel: "Mong Kok to Kowloon Bay",
    repeatsPattern: "Weekly",
    nextRideLabel: "Next: Wed, Aug 12",
    upcomingRides: [{ date: "2026-08-12", time: "07:40", label: "Mong Kok to Kowloon Bay" }],
  },
];

const taxiSearchRides: HomeRide[] = [
  {
    id: "taxi-one-off-tuen-mun-k-city",
    fromDistrict: "Tuen Mun",
    toDistrict: "Kowloon City",
    fromLabel: "Tuen Mun",
    toLabel: "K City",
    dateLabel: "Thu, Aug 20",
    timeLabel: "7:30 AM",
    seatsUsed: 1,
    seatsTotal: 4,
    pricePerPerson: 58,
    rideKind: "one_off",
    rideService: "taxi",
    rideCategory: "taxi_partner_quote",
    airportDirection: null,
    status: "available",
    quoteStatus: "quote_pending",
    driverAssignmentStatus: "PENDING",
    taxiType: "Taxi",
    platformFee: 5,
    splitMethod: "Equal split",
    paymentMethod: "PayMe, FPS",
    luggage: "Small bags welcome",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "trial_2",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "raccoon" },
    hostDisplayName: "trial_2",
    joinedRiders: ["trial_2"],
    pickupLabel: "Tuen Mun Station Exit B",
    pickupCoordinates: { lat: 22.3958, lng: 113.9731 },
    pickupTime: "7:20 AM",
    dropoffLabel: "K City",
    dropoffCoordinates: { lat: 22.3302, lng: 114.2034 },
    stopRequestPolicy: "host_approved_before_quote",
    selectedRideDate: "2026-08-20",
    seats_open: 3,
    estimated_share: 58,
    host_rating: 4.9,
    is_verified: true,
  },
  {
    id: "taxi-one-off-yuen-long-mong-kok",
    fromDistrict: "Yuen Long",
    toDistrict: "Mong Kok",
    fromLabel: "Yuen Long",
    toLabel: "Mong Kok",
    dateLabel: "Fri, Aug 21",
    timeLabel: "6:40 PM",
    seatsUsed: 2,
    seatsTotal: 4,
    pricePerPerson: 46,
    rideKind: "one_off",
    rideService: "taxi",
    rideCategory: "taxi_partner_quote",
    airportDirection: null,
    status: "available",
    quoteStatus: "quote_pending",
    driverAssignmentStatus: "PENDING",
    taxiType: "Taxi",
    platformFee: 5,
    splitMethod: "Equal split",
    paymentMethod: "FPS, PayMe",
    luggage: "Small bags only",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Helen",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "frog" },
    hostDisplayName: "Helen",
    joinedRiders: ["Helen", "Jasper"],
    pickupLabel: "Yuen Long Station",
    pickupCoordinates: { lat: 22.4456, lng: 114.0347 },
    pickupTime: "6:30 PM",
    dropoffLabel: "Mong Kok MTR Exit E2",
    dropoffCoordinates: { lat: 22.3193, lng: 114.1694 },
    stopRequestPolicy: "host_approved_before_quote",
    selectedRideDate: "2026-08-21",
    seats_open: 2,
    estimated_share: 46,
    host_rating: 4.8,
    is_verified: true,
  },
  {
    id: "taxi-one-off-tko-central",
    fromDistrict: "Sai Kung",
    toDistrict: "Central",
    fromLabel: "Tseung Kwan O",
    toLabel: "Central",
    dateLabel: "Sat, Aug 22",
    timeLabel: "2:15 PM",
    seatsUsed: 1,
    seatsTotal: 4,
    pricePerPerson: 42,
    rideKind: "one_off",
    rideService: "taxi",
    rideCategory: "taxi_partner_quote",
    airportDirection: null,
    status: "available",
    quoteStatus: "quote_pending",
    driverAssignmentStatus: "PENDING",
    taxiType: "Taxi",
    platformFee: 5,
    splitMethod: "Equal split",
    paymentMethod: "Cash, FPS",
    luggage: "Light bags welcome",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Marcus",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "raccoon" },
    hostDisplayName: "Marcus",
    joinedRiders: ["Marcus"],
    pickupLabel: "PopCorn Tseung Kwan O",
    pickupCoordinates: { lat: 22.3075, lng: 114.2607 },
    pickupTime: "2:05 PM",
    dropoffLabel: "Central Pier",
    dropoffCoordinates: { lat: 22.2877, lng: 114.1584 },
    stopRequestPolicy: "direct_only",
    selectedRideDate: "2026-08-22",
    seats_open: 3,
    estimated_share: 42,
    host_rating: 4.7,
    is_verified: true,
  },
  {
    id: "taxi-airport-hkia-central",
    fromDistrict: "Airport",
    toDistrict: "Central",
    fromLabel: "HKIA Arrival Hall B",
    toLabel: "Central",
    dateLabel: "Fri, Jul 24",
    timeLabel: "8:15 PM",
    seatsUsed: 2,
    seatsTotal: 5,
    pricePerPerson: 72,
    rideKind: "airport",
    rideService: "taxi",
    rideCategory: "taxi_partner_quote",
    airportDirection: "from_airport",
    flightNumber: "CX 701",
    flightFrom: "Singapore",
    airportTerminal: "Terminal 2",
    airportHall: "Arrival Hall B",
    airportLuggage: { largeSuitcases: 2, cabinBags: 2, specialItems: [] },
    status: "available",
    quoteStatus: "quote_pending",
    driverAssignmentStatus: "PENDING",
    taxiType: "Urban taxi",
    platformFee: 5,
    splitMethod: "Equal split",
    paymentMethod: "Cash, FPS",
    luggage: "2 large suitcases",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "May",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "frog" },
    hostDisplayName: "May",
    joinedRiders: ["May", "Ken"],
    pickupLabel: "HKIA Arrival Hall B",
    pickupTime: "8:05 PM",
    dropoffLabel: "Central",
    stopRequestPolicy: "direct_only",
    selectedRideDate: "2026-07-24",
    seats_open: 3,
    estimated_share: 72,
    host_rating: 4.8,
    is_verified: true,
  },
  {
    id: "taxi-recurring-sha-tin-quarry-bay",
    fromDistrict: "New Territories",
    toDistrict: "Hong Kong Island",
    fromLabel: "Sha Tin",
    toLabel: "Quarry Bay",
    dateLabel: "Mon, Jul 27",
    timeLabel: "8:05 AM",
    seatsUsed: 3,
    seatsTotal: 4,
    pricePerPerson: 46,
    rideKind: "recurring",
    rideService: "taxi",
    rideCategory: "taxi_partner_quote",
    airportDirection: null,
    status: "available",
    quoteStatus: "quote_pending",
    driverAssignmentStatus: "PENDING",
    taxiType: "Taxi",
    platformFee: 5,
    splitMethod: "Equal split",
    paymentMethod: "PayMe",
    luggage: "Daily commute bags",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Anson",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "frog" },
    hostDisplayName: "Anson",
    joinedRiders: ["Anson", "Ivy", "Lok"],
    pickupLabel: "Sha Tin Station",
    pickupTime: "7:55 AM",
    dropoffLabel: "Quarry Bay",
    stopRequestPolicy: "host_approved_before_quote",
    selectedRideDate: "2026-07-27",
    direction: "Outbound",
    is_recurring: true,
    recurrence_label: "MON-FRI",
    ride_time: "8:05 AM",
    period_label: "Morning",
    next_occurrence_label: "Mon, Jul 27",
    regular_count: 3,
    max_regulars: 4,
    seats_open: 1,
    estimated_share: 46,
    host_rating: 4.7,
    is_verified: true,
    scheduleLabel: "Weekdays",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    tripPattern: "one_way",
    startLabel: "Starts Jul 27",
    endLabel: "Ongoing",
    outboundLabel: "Sha Tin to Quarry Bay",
    repeatsPattern: "Weekdays",
    nextRideLabel: "Next: Mon, Jul 27",
    upcomingRides: [{ date: "2026-07-27", time: "08:05", label: "Sha Tin to Quarry Bay" }],
  },
  {
    id: "taxi-quote-ready-tsim-sha-tsui-disney",
    fromDistrict: "Kowloon",
    toDistrict: "New Territories",
    fromLabel: "Tsim Sha Tsui",
    toLabel: "Disneyland",
    dateLabel: "Sat, Jul 25",
    timeLabel: "10:30 AM",
    seatsUsed: 3,
    seatsTotal: 6,
    pricePerPerson: 64,
    rideKind: "one_off",
    rideService: "taxi",
    rideCategory: "taxi_partner_quote",
    airportDirection: null,
    status: "available",
    quoteStatus: "quote_ready",
    driverAssignmentStatus: "PARTNER_ACCEPTED",
    currentUserQuoteAccepted: false,
    quoteAmountCents: 38400,
    quoteExpiresInMinutes: 95,
    taxiType: "Taxi",
    platformFee: 5,
    splitMethod: "Equal split",
    paymentMethod: "Cash, PayMe",
    luggage: "Light bags",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: "Eason",
    hostAvatarPreference: { avatarType: "animal", animalAvatarId: "raccoon" },
    hostDisplayName: "Eason",
    joinedRiders: ["Eason", "May", "Chris"],
    pickupLabel: "Tsim Sha Tsui Clock Tower",
    pickupTime: "10:20 AM",
    dropoffLabel: "Disneyland",
    stopRequestPolicy: "direct_only",
    selectedRideDate: "2026-07-25",
    seats_open: 3,
    estimated_share: 64,
    host_rating: 4.9,
    is_verified: true,
  },
];

const activeRideAppSelfSettleRide = getActiveRideAppSelfSettleRide();

export const homeRides: HomeRide[] = [
  ...taxiSearchRides,
  ...recurringRideAppSearchRides,
  ...(activeRideAppSelfSettleRide ? [activeRideAppSelfSettleRide] : []),
];

export function matchesDistrict(selectedDistrict: string, rideDistrict: string) {
  if (selectedDistrict === "All districts") return true;
  if (selectedDistrict === rideDistrict) return true;

  return districtGroups[selectedDistrict]?.includes(rideDistrict) ?? false;
}

export function rideMatchesTab(tab: HomeTab, ride: HomeRide) {
  if (tab === "all") return true;
  if (tab === "airport") return ride.rideKind === "airport" || Boolean(ride.airportDirection);
  if (tab === "quote_ready") {
    return ride.quoteStatus === "quote_ready" && ride.currentUserQuoteAccepted !== true;
  }
  return ride.rideKind === tab;
}

export function getHomeRide(id: string) {
  return homeRides.find((ride) => ride.id === id) ?? null;
}

export function isHostApprovedStopPolicy(routePolicy?: string | null) {
  return routePolicy === "host_approved_before_quote" || routePolicy === "host_approved_stops";
}

export function isDirectRoutePolicy(routePolicy?: string | null) {
  return !routePolicy || routePolicy === "direct_only" || routePolicy === "direct";
}

function normalizeRouteRequestName(value?: string | null) {
  return value?.trim() || "Rider";
}

function currentUserRouteRequestNames(ride: HomeRide) {
  return new Set(
    ["You", ride.currentUserName]
      .map((name) => name?.trim().toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
}

function routePlanStopToRouteRequest(stop: RoutePlanStop, status: RouteRequestStatus): RouteRequest {
  return {
    id: stop.id,
    requestedByName: normalizeRouteRequestName(stop.requestedBy),
    stopLocation: stop.label,
    stopCoordinates: stop.coordinates ?? null,
    reason: stop.reason,
    status,
  };
}

function routeRequestKey(request: RouteRequest) {
  return request.id || request.stopLocation;
}

export function routeRequestToRoutePlanStop(request: RouteRequest): RoutePlanStop {
  return {
    id: request.id,
    label: request.stopLocation,
    coordinates: request.stopCoordinates ?? null,
    requestedBy: request.requestedByName,
    stopType: "quick_stop",
    reason: request.reason,
    status:
      request.status === "approved"
        ? "approved"
        : request.status === "declined"
          ? "declined"
          : "pending_host_approval",
  };
}

export function getNormalizedRouteRequests(ride: HomeRide): NormalizedRouteRequests {
  const byKey = new Map<string, RouteRequest>();

  (ride.routeRequests ?? []).forEach((request) => {
    byKey.set(routeRequestKey(request), {
      ...request,
      requestedByName: normalizeRouteRequestName(request.requestedByName),
      stopLocation: request.stopLocation.trim(),
      stopCoordinates: request.stopCoordinates ?? null,
    });
  });

  (ride.proposedStops ?? [])
    .filter((stop) => stop.status === "pending_host_approval")
    .forEach((stop) => {
      const request = routePlanStopToRouteRequest(stop, "pending");
      byKey.set(routeRequestKey(request), request);
    });

  (ride.approvedStops ?? [])
    .filter((stop) => stop.status === "approved")
    .forEach((stop) => {
      const request = routePlanStopToRouteRequest(stop, "approved");
      byKey.set(routeRequestKey(request), request);
    });

  (ride.declinedStops ?? [])
    .filter((stop) => stop.status === "declined")
    .forEach((stop) => {
      const request = routePlanStopToRouteRequest(stop, "declined");
      byKey.set(routeRequestKey(request), request);
    });

  const all = [...byKey.values()].filter((request) => request.stopLocation);
  const pending = all.filter((request) => request.status === "pending");
  const approved = all.filter((request) => request.status === "approved");
  const declined = all.filter((request) => request.status === "declined");
  const currentUserNames = currentUserRouteRequestNames(ride);
  const currentUserRequest =
    all.find((request) => currentUserNames.has(request.requestedByName.trim().toLowerCase())) ?? null;

  return {
    all,
    pending,
    approved,
    declined,
    currentUserRequest,
    pendingCount: pending.length,
    hasPendingForHost: pending.length > 0,
  };
}
