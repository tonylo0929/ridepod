import type { HomeRide } from "@/lib/home-ride-mock";
import type { RidePodPodRow } from "@/lib/supabase/types";

export const publicCreatedRideLifecycleState = "PUBLIC_FORMING";
export const publicCreatedRideTimeZone = "Asia/Hong_Kong";

export type PublicCreatedRidePod = Pick<
  RidePodPodRow,
  | "id"
  | "host_user_id"
  | "pod_type"
  | "lifecycle_state"
  | "ride_option"
  | "route_label"
  | "pickup_point"
  | "dropoff_point"
  | "ideal_pod_size"
  | "minimum_locked_guests"
  | "booking_fare_cap_cents"
  | "current_estimate_cents"
  | "currency"
  | "departure_at"
  | "recurring_days"
  | "recurring_pattern"
  | "created_at"
  | "updated_at"
> & {
  active_member_count?: number | null;
  active_member_user_ids?: string[] | null;
  host_display_name?: string | null;
};

export type PublicCreatedRideViewerIdentity = {
  accountName?: string | null;
  displayName?: string | null;
  preferredName?: string | null;
  email?: string | null;
  metadataAccountName?: string | null;
  metadataDisplayName?: string | null;
};

const rideDateMonths: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function compact(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function identityToken(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "") ?? "";
}

function emailName(value: string | null | undefined) {
  return value?.split("@")[0] ?? null;
}

function viewerIdentityTokens(viewerIdentity?: PublicCreatedRideViewerIdentity | null) {
  const tokens = [
    viewerIdentity?.accountName,
    viewerIdentity?.displayName,
    viewerIdentity?.preferredName,
    viewerIdentity?.metadataAccountName,
    viewerIdentity?.metadataDisplayName,
    emailName(viewerIdentity?.email),
  ]
    .map(identityToken)
    .filter(Boolean);

  return new Set(tokens);
}

export function viewerIdentityMatchesHostName(
  hostName: string | null | undefined,
  viewerIdentity?: PublicCreatedRideViewerIdentity | null,
) {
  const hostToken = identityToken(hostName);
  if (!hostToken || hostToken === "host" || hostToken === "newhost" || hostToken === "you") return false;
  return viewerIdentityTokens(viewerIdentity).has(hostToken);
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function isUuid(value: string | null | undefined) {
  return Boolean(
    value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  );
}

export function splitRouteLabel(routeLabel: string) {
  const [from = "Pickup", to = "Drop-off"] = routeLabel.split(/\s*(?:->|→)\s*/);
  return {
    fromLabel: from.trim() || "Pickup",
    toLabel: to.trim() || "Drop-off",
  };
}

export function districtFromRideLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("mong kok")) return "Mong Kok";
  if (normalized.includes("k city") || normalized.includes("kai tak")) return "Kowloon";
  if (normalized.includes("kowloon")) return "Kowloon";
  if (normalized.includes("central") || normalized.includes("ifc")) return "Central";
  if (normalized.includes("tsim sha tsui") || normalized.includes("tst")) return "Tsim Sha Tsui";
  if (normalized.includes("causeway bay")) return "Causeway Bay";
  if (normalized.includes("sha tin")) return "Sha Tin";
  if (normalized.includes("tsuen wan")) return "Tsuen Wan";
  if (normalized.includes("tung chung")) return "Tung Chung";
  if (normalized.includes("airport") || normalized.includes("lax")) return "Airport";
  return "Hong Kong Island";
}

export function dateKeyFromRideLabel(dateLabel: string) {
  const cleaned = dateLabel.replace(/^[A-Za-z]{3,9},\s*/i, "").trim();
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const monthDayMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (monthDayMatch) {
    const month = rideDateMonths[monthDayMatch[1].toLowerCase()];
    const day = Number(monthDayMatch[2]);
    const year = Number(monthDayMatch[3] ?? new Date().getFullYear());
    if (month && Number.isFinite(day) && Number.isFinite(year)) return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  const dayMonthMatch = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/);
  if (dayMonthMatch) {
    const day = Number(dayMonthMatch[1]);
    const month = rideDateMonths[dayMonthMatch[2].toLowerCase()];
    const year = Number(dayMonthMatch[3] ?? new Date().getFullYear());
    if (month && Number.isFinite(day) && Number.isFinite(year)) return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return null;
}

export function timeKeyFromRideLabel(timeLabel: string) {
  const match = timeLabel.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }

  return `${pad2(hour)}:${pad2(minute)}`;
}

export function departureAtFromHomeRide(ride: HomeRide) {
  const dateKey = dateKeyFromRideLabel(ride.dateLabel);
  const timeKey = timeKeyFromRideLabel(ride.timeLabel);
  if (!dateKey || !timeKey) return null;

  return `${dateKey}T${timeKey}:00+08:00`;
}

export function publicCreatedRideSignature(ride: Pick<HomeRide, "fromLabel" | "toLabel" | "dateLabel" | "timeLabel">) {
  return [
    compact(ride.fromLabel),
    compact(ride.toLabel),
    dateKeyFromRideLabel(ride.dateLabel) ?? compact(ride.dateLabel),
    timeKeyFromRideLabel(ride.timeLabel) ?? compact(ride.timeLabel),
  ].join("|");
}

function formatDateLabel(departureAt: string | null) {
  if (!departureAt) return "Date TBD";
  const date = new Date(departureAt);
  if (Number.isNaN(date.getTime())) return "Date TBD";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: publicCreatedRideTimeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeLabel(departureAt: string | null) {
  if (!departureAt) return "Time TBD";
  const date = new Date(departureAt);
  if (Number.isNaN(date.getTime())) return "Time TBD";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: publicCreatedRideTimeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function centsToDollars(cents: number | null | undefined) {
  return typeof cents === "number" && Number.isFinite(cents) ? Math.round(cents / 100) : null;
}

export function rideEstimateCentsFromHomeRide(ride: HomeRide) {
  if (typeof ride.rideAppEstimatedFareTotal === "number" && Number.isFinite(ride.rideAppEstimatedFareTotal)) {
    return Math.round(ride.rideAppEstimatedFareTotal * 100);
  }

  const numericEstimate = ride.estimatedRideAppFare?.match(/(\d+(?:\.\d+)?)/)?.[1];
  if (!numericEstimate) return null;

  const estimate = Number(numericEstimate);
  return Number.isFinite(estimate) ? Math.round(estimate * 100) : null;
}

export function publicCreatedPodToHomeRide(
  pod: PublicCreatedRidePod,
  viewerUserId?: string | null,
  viewerIdentity?: PublicCreatedRideViewerIdentity | null,
): HomeRide {
  const { fromLabel, toLabel } = splitRouteLabel(pod.route_label);
  const isRideApp = pod.ride_option === "RIDE_APP_FIXED_QUOTE";
  const hostUserId = pod.host_user_id?.trim() ?? null;
  const isHost =
    Boolean(viewerUserId && hostUserId === viewerUserId) ||
    viewerIdentityMatchesHostName(pod.host_display_name, viewerIdentity);
  const dateLabel = pod.pod_type === "RECURRING" ? (pod.recurring_pattern ?? "Recurring") : formatDateLabel(pod.departure_at);
  const timeLabel = formatTimeLabel(pod.departure_at);
  const estimateTotal = centsToDollars(pod.current_estimate_cents);
  const seatsTotal = Math.max(1, pod.ideal_pod_size || 4);
  const minimumRiders = Math.max(1, Math.min(pod.minimum_locked_guests || 2, seatsTotal));
  const activeMemberUserIds = Array.from(
    new Set(
      (pod.active_member_user_ids ?? [])
        .map((memberId) => memberId?.trim())
        .filter((memberId): memberId is string => Boolean(memberId && memberId !== hostUserId)),
    ),
  );
  const activeMemberCount = Array.isArray(pod.active_member_user_ids)
    ? activeMemberUserIds.length
    : (pod.active_member_count ?? activeMemberUserIds.length);
  const joinedRiderCount = Math.min(
    Math.max(0, seatsTotal - 1),
    Math.max(0, activeMemberCount),
  );
  const seatsUsed = Math.min(seatsTotal, Math.max(1, 1 + joinedRiderCount));
  const viewerJoined = Boolean(!isHost && viewerUserId && activeMemberUserIds.includes(viewerUserId));
  const joinedRiderNames = Array.from({ length: joinedRiderCount }, (_, index) => {
    const memberId = activeMemberUserIds[index];
    return viewerUserId && memberId === viewerUserId ? "You" : `Rider ${index + 1}`;
  });
  const riderConfirmations = isRideApp
    ? [
        { name: isHost ? "You" : "Host", role: "host" as const, status: "host" as const, confirmedBookingDetailsVersion: 1 },
        ...joinedRiderNames.map((name) => ({
          name,
          role: "rider" as const,
          status: "joined_interest" as const,
          isCurrentUser: name === "You",
          confirmedBookingDetailsVersion: undefined,
        })),
      ]
    : undefined;

  return {
    id: pod.id,
    fromDistrict: districtFromRideLabel(fromLabel),
    toDistrict: districtFromRideLabel(toLabel),
    fromLabel,
    toLabel,
    dateLabel,
    timeLabel,
    seatsUsed,
    seatsTotal,
    pricePerPerson: estimateTotal ? Math.round(estimateTotal / seatsTotal) : 0,
    rideKind: pod.pod_type === "RECURRING" ? "recurring" : "one_off",
    rideService: isRideApp ? "ride_app" : "taxi",
    rideCategory: isRideApp ? "ride_app_self_settle" : "taxi_meter",
    selfSettleRiskAccepted: isRideApp,
    bookingDetailsShared: false,
    rideAppBookingDetailsFinalized: false,
    confirmationDeadlineLabel: "Not set yet",
    confirmationDeadlineAt: null,
    currentUserJoinIntentStatus: isHost ? "not_joined" : viewerJoined ? "joined_interest" : "not_joined",
    currentUserConfirmationExpired: false,
    bookingDetailsVersion: 1,
    bookingDetailsUpdated: false,
    currentUserConfirmedBookingDetailsVersion: null,
    rideAppConfirmBy: null,
    rideAppChecklist: isRideApp
      ? {
          pickupPoint: Boolean(pod.pickup_point),
          dropoffPoint: Boolean(pod.dropoff_point),
          rideApp: true,
          estimatedFare: Boolean(pod.current_estimate_cents),
          booker: true,
          fareSplit: true,
          paymentMethod: true,
          paymentRecipientAfterRide: true,
          meetingTime: true,
          updatedAt: pod.updated_at,
          updatedBy: isHost ? "You" : "Host",
        }
      : undefined,
    rideAppPodStatus: isRideApp ? "booking_details_needed" : undefined,
    rideAppBookingTrigger: isRideApp ? "minimum_riders_confirmed" : undefined,
    rideAppMinimumConfirmedRiders: isRideApp ? minimumRiders : undefined,
    rideAppRequiredConfirmations: isRideApp ? minimumRiders : undefined,
    rideAppConfirmedRiderIds: isRideApp ? [] : undefined,
    rideAppFarePaymentTiming: isRideApp ? "after_ride" : undefined,
    rideAppProviderName: isRideApp ? "Ride app" : undefined,
    rideAppSplitMethod: isRideApp ? "Equal split" : undefined,
    rideAppFareEstimateStatus: isRideApp ? (estimateTotal ? "accepted" : "pending") : undefined,
    rideAppAcceptedPaymentMethods: isRideApp ? ["PayMe"] : undefined,
    airportDirection: null,
    status: "available",
    quoteStatus: viewerJoined ? "joined" : "quote_pending",
    currentUserRole: isHost ? "host" : viewerJoined ? "joined_rider" : "rider",
    currentUserName: isHost || viewerJoined ? "You" : undefined,
    currentUserJoined: viewerJoined,
    currentUserBookingDetailsConfirmed: false,
    platformFeeStatus: isRideApp ? "pending" : undefined,
    confirmedRiderCount: 0,
    joinedRiderCount,
    rideAppConfirmedRiderCount: 0,
    riderConfirmations,
    taxiType: isRideApp ? "Ride app" : "Taxi",
    platformFee: isRideApp ? 5 : undefined,
    bookingFareCapCents: pod.booking_fare_cap_cents,
    estimatedRideAppFare: isRideApp && estimateTotal ? `HK$${estimateTotal}` : undefined,
    rideAppEstimatedFareTotal: isRideApp ? estimateTotal : undefined,
    rideAppEstimatedFarePerPerson: isRideApp && estimateTotal ? Math.round(estimateTotal / seatsTotal) : undefined,
    rideAppEstimatedFareCurrency: isRideApp ? "HKD" : undefined,
    rideAppEstimatedFareUpdatedBy: isRideApp && estimateTotal ? (isHost ? "You" : "Host") : undefined,
    rideAppEstimatedFareUpdatedAt: isRideApp && estimateTotal ? pod.updated_at : undefined,
    splitMethod: isRideApp ? "Equal split" : undefined,
    paymentMethod: isRideApp ? "PayMe" : undefined,
    ridePodProtectionFeePerSeat: isRideApp ? 5 : undefined,
    luggage: "No luggage",
    accessibility: "No special access needs",
    podType: "Open pod",
    hostName: isHost ? "You" : pod.host_display_name?.trim() || "New host",
    hostDisplayName: pod.host_display_name?.trim() || undefined,
    joinedRiders: joinedRiderNames,
    pickupLabel: pod.pickup_point ?? fromLabel,
    pickupTime: timeLabel,
    dropoffLabel: pod.dropoff_point ?? toLabel,
    stopRequestPolicy: "direct_only",
    proposedStops: [],
    approvedStops: [],
    declinedStops: [],
  };
}

export function homeRideToPublicCreatedPodInsert(ride: HomeRide, hostUserId: string, podId: string): Partial<RidePodPodRow> {
  const estimateCents = rideEstimateCentsFromHomeRide(ride);
  const routeLabel = `${ride.fromLabel} -> ${ride.toLabel}`;
  const isRideApp = ride.rideService === "ride_app" || ride.rideCategory === "ride_app_self_settle";

  return {
    id: podId,
    host_user_id: hostUserId,
    pod_type: ride.rideKind === "recurring" ? "RECURRING" : "SCHEDULED",
    lifecycle_state: publicCreatedRideLifecycleState,
    ride_option: isRideApp ? "RIDE_APP_FIXED_QUOTE" : "TAXI_METER",
    route_label: routeLabel,
    pickup_point: ride.pickupLabel ?? ride.fromLabel,
    dropoff_point: ride.dropoffLabel ?? ride.toLabel,
    ideal_pod_size: Math.max(1, ride.seatsTotal || 4),
    minimum_locked_guests: Math.max(1, ride.rideAppMinimumConfirmedRiders ?? Math.min(2, ride.seatsTotal || 4)),
    booking_fare_cap_cents: ride.bookingFareCapCents ?? estimateCents ?? 0,
    current_estimate_cents: estimateCents,
    platform_fee_rate_bps: null,
    minimum_platform_fee_cents: null,
    currency: "HKD",
    departure_at: departureAtFromHomeRide(ride),
    recurring_days: ride.weekdays ?? null,
    recurring_pattern: ride.repeatsPattern ?? ride.scheduleLabel ?? null,
  };
}
