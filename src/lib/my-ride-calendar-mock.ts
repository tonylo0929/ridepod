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
        label: "Issue reported",
        colorKey: "purple",
        helperText: "RidePod is reviewing a self-settle issue",
        ctaLabel: "View report",
        isActionNeeded: true,
      };
    }

    if (pod.status === "cancelled") {
      return { statusKey: "cancelled", label: "Cancelled", colorKey: "red", helperText: "This pod was cancelled", ctaLabel: "Open pod", isActionNeeded: false };
    }

    if (pod.status === "expired" || pod.status === "quote_expired" || pod.status === "too_late_to_confirm") {
      return { statusKey: "expired", label: "Expired", colorKey: "gray", helperText: "This pod expired", ctaLabel: "Open pod", isActionNeeded: false };
    }

    if (pod.status === "completed") {
      return { statusKey: "completed", label: "Completed", colorKey: "green", helperText: "Ride completed", ctaLabel: "Open pod", isActionNeeded: false };
    }

    if (pod.status === "ride_started" || pod.status === "settlement_pending") {
      return {
        statusKey: "settlement_pending",
        label: "Settlement pending",
        colorKey: "orange",
        helperText: "Settle final fare after ride and mark completed",
        ctaLabel: "Mark completed",
        isActionNeeded: true,
      };
    }

    if (pod.bookingDetailsConfirmed || pod.status === "quote_accepted" || pod.status === "ready_for_pickup") {
      return {
        statusKey: "ready_to_book",
        label: "Ready to book",
        colorKey: "green",
        helperText: "Group details confirmed. Host can book externally",
        ctaLabel: "Open chat",
        isActionNeeded: role === "host",
      };
    }

    if (pod.status === "confirm_details") {
      return {
        statusKey: "confirm_details",
        label: role === "host" ? "Confirm details" : "Waiting for host",
        colorKey: "gold",
        helperText:
          role === "host"
            ? "Confirm ride app, fare estimate, split, and payment method"
            : "Waiting for host to confirm details",
        ctaLabel: role === "host" ? "Confirm details" : "Open chat",
        isActionNeeded: role === "host",
      };
    }

    if (pod.seatsFilled >= 2) {
      return {
        statusKey: "minimum_reached",
        label: "Minimum reached",
        colorKey: "cyan",
        helperText: "Enough riders joined",
        ctaLabel: "Open pod",
        isActionNeeded: role === "host",
      };
    }

    return {
      statusKey: "open",
      label: "Open",
      colorKey: "blue",
      helperText: "Waiting for riders",
      ctaLabel: "Open pod",
      isActionNeeded: false,
    };
  }

  const taxiStatus: Record<string, MyRideCalendarStatus> = {
    quote_pending: { statusKey: "quote_pending", label: "Quote pending", colorKey: "gold", helperText: "Waiting for taxi partner quote", ctaLabel: "Open pod", isActionNeeded: false },
    quote_ready: { statusKey: "quote_ready", label: "Quote ready", colorKey: "cyan", helperText: "Review the taxi partner quote", ctaLabel: "Review quote", isActionNeeded: true },
    quote_deadline_soon: { statusKey: "quote_ready", label: "Quote ready", colorKey: "cyan", helperText: "Review the taxi partner quote soon", ctaLabel: "Review quote", isActionNeeded: true },
    late_confirmation: { statusKey: "quote_ready", label: "Quote ready", colorKey: "cyan", helperText: "Review the taxi partner quote soon", ctaLabel: "Review quote", isActionNeeded: true },
    completed: { statusKey: "completed", label: "Completed", colorKey: "green", helperText: "Ride completed", ctaLabel: "Open pod", isActionNeeded: false },
    cancelled: { statusKey: "cancelled", label: "Cancelled", colorKey: "red", helperText: "This pod was cancelled", ctaLabel: "Open pod", isActionNeeded: false },
    quote_expired: { statusKey: "expired", label: "Expired", colorKey: "gray", helperText: "Taxi partner quote expired", ctaLabel: "Open pod", isActionNeeded: false },
    expired: { statusKey: "expired", label: "Expired", colorKey: "gray", helperText: "This pod expired", ctaLabel: "Open pod", isActionNeeded: false },
    dispute_review: { statusKey: "under_review", label: "Under review", colorKey: "purple", helperText: "RidePod is reviewing this pod", ctaLabel: "View review", isActionNeeded: true },
  };

  return taxiStatus[pod.status] ?? {
    statusKey: "upcoming",
    label: "Upcoming",
    colorKey: "blue",
    helperText: "Upcoming taxi pod",
    ctaLabel: "Open pod",
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
    forming: "Forming",
    minimum_reached: "Minimum reached",
    confirm_details: "Confirm details",
    upcoming: "Upcoming",
    settlement_pending: "Settlement pending",
    cancelled: "Cancelled",
    expired: "Expired",
    issue_reported: "Issue reported",
    seat_locked: "Seat locked",
    quote_pending: "Waiting for quote",
    quote_ready: "Quote ready",
    quote_deadline_soon: "Deadline soon",
    quote_expired: "Quote expired",
    late_confirmation: "Late confirmation",
    too_late_to_confirm: "Too late to confirm",
    all_guests_accepted: "All guests accepted",
    quote_accepted: "Quote accepted",
    waiting_for_guests: "Waiting for guests",
    ready_for_pickup: "Ready for pickup",
    at_pickup: "At pickup",
    ride_started: "Ride started",
    completed: "Completed",
    dispute_review: "Dispute review",
  };

  return labels[status];
}
import { getActiveRideAppSelfSettleCalendarRide } from "@/lib/ride-app-self-settle-scenarios";
