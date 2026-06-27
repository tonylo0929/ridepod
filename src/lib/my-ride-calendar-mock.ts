export type RideKind = "one_off" | "airport" | "recurring";
export type RideStatus =
  | "forming"
  | "minimum_reached"
  | "confirm_details"
  | "upcoming"
  | "settlement_pending"
  | "cancelled"
  | "expired"
  | "issue_reported"
  | "seat_locked"
  | "host_replacement_needed"
  | "replacement_booker_selected"
  | "quote_pending"
  | "quote_ready"
  | "quote_deadline_soon"
  | "quote_expired"
  | "late_confirmation"
  | "too_late_to_confirm"
  | "all_guests_accepted"
  | "quote_accepted"
  | "waiting_for_guests"
  | "ready_for_pickup"
  | "at_pickup"
  | "ride_started"
  | "completed"
  | "dispute_review";
export type RideFilter = "all" | "airport" | "one_off" | "recurring" | "action_needed";

export type CalendarRide = {
  id: string;
  date: string;
  time: string;
  route: string;
  rideKind: RideKind;
  status: RideStatus;
  seatsFilled: number;
  seatsTotal: number;
  estimatedShare?: number;
  rideAppEstimatedFarePerPerson?: number | null;
  rideAppEstimatedFareTotal?: number | null;
  rideAppEstimatedFareCurrency?: "HKD";
  rideAppEstimatedFareUpdatedBy?: string | null;
  rideAppEstimatedFareUpdatedAt?: string | null;
  rideAppEstimatedFareNote?: string | null;
  rideAppFareEstimateReviewStatus?: "needs_review" | "confirmed";
  quoteTotal?: number;
  airportDirection?: "to_airport" | "from_airport";
  luggage?: string;
  direction?: string;
  schedule?: string;
  rideMode?: "taxi" | "ride_app";
  hostUserId?: string;
  currentUserRole?: "host" | "rider" | "joined_rider" | "taxi_partner";
  joinedRiderIds?: string[];
  bookingDetailsConfirmed?: boolean;
  issueReported?: boolean;
};

export type MyRideCalendarRole = "host" | "rider";
export type MyRideCalendarColorKey = "blue" | "cyan" | "gold" | "green" | "orange" | "red" | "gray" | "purple";
export type MyRideCalendarStatus = {
  statusKey: string;
  label: string;
  colorKey: MyRideCalendarColorKey;
  helperText: string;
  ctaLabel: string;
  isActionNeeded: boolean;
};

const activeRideAppSelfSettleCalendarRide = getActiveRideAppSelfSettleCalendarRide();

export const calendarRides: CalendarRide[] = activeRideAppSelfSettleCalendarRide ? [activeRideAppSelfSettleCalendarRide] : [];

export const rideFilters: Array<{ id: RideFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "airport", label: "Airport" },
  { id: "one_off", label: "One-off" },
  { id: "recurring", label: "Recurring" },
  { id: "action_needed", label: "Action needed" },
];

export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
}

export function fullDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function timeLabel(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(2026, 0, 1, hour, minute),
  );
}

export function buildMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Array<Date | null> = [];

  for (let index = 0; index < first.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export function getMyRideCalendarRole(ride: CalendarRide, currentUserId?: string | null): MyRideCalendarRole {
  if (ride.currentUserRole === "host") return "host";
  if (currentUserId && ride.hostUserId === currentUserId) return "host";
  return "rider";
}

export function isMyRideCalendarRide(ride: CalendarRide, currentUserId?: string | null) {
  if (!currentUserId) return true;
  if (!ride.hostUserId && !ride.joinedRiderIds?.length) return true;
  return ride.hostUserId === currentUserId || ride.joinedRiderIds?.includes(currentUserId);
}

export function getMyRideCalendarItems(currentUserId?: string | null) {
  return calendarRides.filter((ride) => isMyRideCalendarRide(ride, currentUserId));
}

export function getMyRideCalendarStatus({
  pod,
  currentUserId,
  role = getMyRideCalendarRole(pod, currentUserId),
}: {
  pod: CalendarRide;
  currentUserId?: string | null;
  role?: MyRideCalendarRole;
  now?: Date;
}): MyRideCalendarStatus {
  if (pod.rideMode === "ride_app") {
    if (pod.issueReported || pod.status === "issue_reported" || pod.status === "dispute_review") {
      return {
        statusKey: "issue_reported",
        label: "Action needed",
        colorKey: "gold",
        helperText: "Review updated ride details",
        ctaLabel: "View details",
        isActionNeeded: true,
      };
    }

    if (pod.status === "cancelled") {
      return { statusKey: "cancelled", label: "Cancelled", colorKey: "red", helperText: "This pod was cancelled", ctaLabel: "View details", isActionNeeded: false };
    }

    if (pod.status === "host_replacement_needed") {
      return {
        statusKey: "host_replacement_needed",
        label: "Host replacement needed",
        colorKey: "gold",
        helperText: role === "host" ? "Waiting for new booker" : "Confirmed riders can become the new booker",
        ctaLabel: "View details",
        isActionNeeded: role !== "host",
      };
    }

    if (pod.status === "replacement_booker_selected") {
      return {
        statusKey: "replacement_booker_selected",
        label: "New booker selected",
        colorKey: "cyan",
        helperText: "This pod continues with a new booker",
        ctaLabel: "View details",
        isActionNeeded: role === "host",
      };
    }

    if (pod.status === "expired" || pod.status === "quote_expired" || pod.status === "too_late_to_confirm") {
      return { statusKey: "expired", label: "Expired", colorKey: "gray", helperText: "This pod expired", ctaLabel: "View details", isActionNeeded: false };
    }

    if (pod.status === "completed") {
      return { statusKey: "completed", label: "Completed", colorKey: "green", helperText: "Ride completed", ctaLabel: "View details", isActionNeeded: false };
    }

    if (pod.status === "ride_started" || pod.status === "settlement_pending") {
      return {
        statusKey: "settlement_pending",
        label: "Action needed",
        colorKey: "gold",
        helperText: "Review updated ride details",
        ctaLabel: "View details",
        isActionNeeded: true,
      };
    }

    if (pod.bookingDetailsConfirmed || pod.status === "quote_accepted" || pod.status === "ready_for_pickup") {
      return {
        statusKey: "ready_to_gather",
        label: "Ready to gather",
        colorKey: "green",
        helperText: "Group details are ready",
        ctaLabel: "View details",
        isActionNeeded: role === "host",
      };
    }

    if (pod.status === "confirm_details") {
      return {
        statusKey: "confirm_details",
        label: role === "host" ? "Action needed" : "Waiting for host details",
        colorKey: "gold",
        helperText:
          role === "host"
            ? "Confirm ride app details"
            : "Waiting for host details",
        ctaLabel: "View details",
        isActionNeeded: role === "host",
      };
    }

    if (pod.seatsFilled >= 2) {
      return {
        statusKey: "minimum_reached",
        label: "Ready to gather",
        colorKey: "cyan",
        helperText: "Enough riders joined",
        ctaLabel: "View details",
        isActionNeeded: role === "host",
      };
    }

    return {
      statusKey: "upcoming",
      label: "Upcoming",
      colorKey: "cyan",
      helperText: "Waiting for riders",
      ctaLabel: "View details",
      isActionNeeded: false,
    };
  }

  const taxiStatus: Record<string, MyRideCalendarStatus> = {
    quote_pending: { statusKey: "quote_pending", label: "Waiting for quote", colorKey: "cyan", helperText: "Waiting for taxi partner quote", ctaLabel: "View details", isActionNeeded: false },
    quote_ready: { statusKey: "quote_ready", label: "Action needed", colorKey: "gold", helperText: "Review the taxi partner quote", ctaLabel: "View details", isActionNeeded: true },
    quote_deadline_soon: { statusKey: "quote_ready", label: "Action needed", colorKey: "gold", helperText: "Review the taxi partner quote soon", ctaLabel: "View details", isActionNeeded: true },
    late_confirmation: { statusKey: "quote_ready", label: "Action needed", colorKey: "gold", helperText: "Review the taxi partner quote soon", ctaLabel: "View details", isActionNeeded: true },
    all_guests_accepted: { statusKey: "waiting_for_partner", label: "Waiting for taxi partner", colorKey: "cyan", helperText: "Waiting for taxi partner", ctaLabel: "View details", isActionNeeded: false },
    quote_accepted: { statusKey: "waiting_for_riders", label: "Waiting for riders", colorKey: "cyan", helperText: "Waiting for riders", ctaLabel: "View details", isActionNeeded: false },
    waiting_for_guests: { statusKey: "waiting_for_riders", label: "Waiting for riders", colorKey: "cyan", helperText: "Waiting for riders", ctaLabel: "View details", isActionNeeded: false },
    ready_for_pickup: { statusKey: "ready_for_pickup", label: "Ready for pickup", colorKey: "green", helperText: "Ready for pickup", ctaLabel: "View details", isActionNeeded: false },
    at_pickup: { statusKey: "ready_for_pickup", label: "Ready for pickup", colorKey: "green", helperText: "Ready for pickup", ctaLabel: "View details", isActionNeeded: false },
    ride_started: { statusKey: "ready_for_pickup", label: "Ready for pickup", colorKey: "green", helperText: "Ride started", ctaLabel: "View details", isActionNeeded: false },
    completed: { statusKey: "completed", label: "Completed", colorKey: "green", helperText: "Ride completed", ctaLabel: "View details", isActionNeeded: false },
    cancelled: { statusKey: "cancelled", label: "Cancelled", colorKey: "red", helperText: "This pod was cancelled", ctaLabel: "View details", isActionNeeded: false },
    quote_expired: { statusKey: "expired", label: "Expired", colorKey: "gray", helperText: "Taxi partner quote expired", ctaLabel: "View details", isActionNeeded: false },
    expired: { statusKey: "expired", label: "Expired", colorKey: "gray", helperText: "This pod expired", ctaLabel: "View details", isActionNeeded: false },
    dispute_review: { statusKey: "needs_review", label: "Action needed", colorKey: "gold", helperText: "Review updated details", ctaLabel: "View details", isActionNeeded: true },
  };

  return taxiStatus[pod.status] ?? {
    statusKey: "upcoming",
    label: "Upcoming",
    colorKey: "cyan",
    helperText: "Upcoming taxi pod",
    ctaLabel: "View details",
    isActionNeeded: false,
  };
}

export function isActionNeeded(ride: CalendarRide, currentUserId?: string | null) {
  return getMyRideCalendarStatus({ pod: ride, currentUserId }).isActionNeeded;
}

export function ridesForFilter(rides: CalendarRide[], filter: RideFilter) {
  if (filter === "all") return rides;
  if (filter === "action_needed") return rides.filter((ride) => isActionNeeded(ride));
  return rides.filter((ride) => ride.rideKind === filter);
}

export function ridesForDate(date: string) {
  return calendarRides
    .filter((ride) => ride.date === date)
    .sort((first, second) => first.time.localeCompare(second.time));
}

export function rideTypeLabel(ride: CalendarRide) {
  if (ride.rideMode === "ride_app") return "Ride app";
  if (ride.rideKind === "airport") return "Airport";
  if (ride.rideKind === "recurring") return "Recurring";
  return "One-off";
}

export function rideStatusLabel(status: RideStatus) {
  const labels: Record<RideStatus, string> = {
    forming: "Upcoming",
    minimum_reached: "Ready to gather",
    confirm_details: "Action needed",
    upcoming: "Upcoming",
    settlement_pending: "Action needed",
    cancelled: "Cancelled",
    expired: "Expired",
    issue_reported: "Action needed",
    seat_locked: "Upcoming",
    host_replacement_needed: "Host replacement needed",
    replacement_booker_selected: "New booker selected",
    quote_pending: "Waiting for quote",
    quote_ready: "Action needed",
    quote_deadline_soon: "Action needed",
    quote_expired: "Quote expired",
    late_confirmation: "Action needed",
    too_late_to_confirm: "Expired",
    all_guests_accepted: "Waiting for taxi partner",
    quote_accepted: "Waiting for riders",
    waiting_for_guests: "Waiting for riders",
    ready_for_pickup: "Ready for pickup",
    at_pickup: "At pickup",
    ride_started: "Ride started",
    completed: "Completed",
    dispute_review: "Action needed",
  };

  return labels[status];
}
import { getActiveRideAppSelfSettleCalendarRide } from "@/lib/ride-app-self-settle-scenarios";
