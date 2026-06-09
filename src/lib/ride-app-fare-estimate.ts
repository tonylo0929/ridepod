import type { HomeRide } from "@/lib/home-ride-mock";
import type { CalendarRide } from "@/lib/my-ride-calendar-mock";

export type RideAppFareEstimateFields = {
  bookingDetailsShared?: boolean;
  estimatedRideAppFare?: string;
  hostName?: string;
  rideAppBookingDetails?: {
    estimatedFare?: string;
  };
  rideAppBookingDetailsConfirmed?: boolean;
  rideAppBookingDetailsFinalized?: boolean;
  rideAppEstimatedFarePerPerson?: number | null;
  rideAppEstimatedFareTotal?: number | null;
  rideAppEstimatedFareCurrency?: "HKD";
  rideAppEstimatedFareUpdatedBy?: string | null;
  rideAppEstimatedFareUpdatedAt?: string | null;
  rideAppEstimatedFareNote?: string | null;
  rideAppFareEstimateStatus?: "pending" | "accepted";
};

export function getRideAppEstimatedFarePerPerson(ride: (HomeRide | CalendarRide) & RideAppFareEstimateFields) {
  if (typeof ride.rideAppEstimatedFarePerPerson === "number") return ride.rideAppEstimatedFarePerPerson;

  if (typeof ride.rideAppEstimatedFareTotal === "number") {
    const seatsFilled = "seatsFilled" in ride ? ride.seatsFilled : ride.seatsUsed;
    return Math.ceil(ride.rideAppEstimatedFareTotal / Math.max(1, seatsFilled));
  }

  if ("estimatedRideAppFare" in ride && ride.estimatedRideAppFare) {
    const numbers = ride.estimatedRideAppFare.match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length) return Math.ceil(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
  }

  return null;
}

export function getRideAppHostFareEstimate(ride: (HomeRide | CalendarRide) & RideAppFareEstimateFields) {
  const hostDetailsShared =
    ride.bookingDetailsShared === true ||
    ride.rideAppBookingDetailsConfirmed === true ||
    ride.rideAppBookingDetailsFinalized === true;
  const bookingEstimate = ride.rideAppBookingDetails?.estimatedFare?.trim();
  const explicitEstimate = bookingEstimate || ride.estimatedRideAppFare?.trim();
  const estimateUpdated =
    ride.rideAppFareEstimateStatus === "accepted" ||
    Boolean(ride.rideAppEstimatedFareUpdatedAt);

  return explicitEstimate && (hostDetailsShared || estimateUpdated) ? explicitEstimate : null;
}

export function getRideAppHostFareEstimateDisplay(ride: (HomeRide | CalendarRide) & RideAppFareEstimateFields) {
  const estimate = getRideAppHostFareEstimate(ride);

  if (estimate) {
    return {
      helper: "Ride app estimate",
      label: "Total estimate",
      updated: true,
      value: estimate,
    };
  }

  return {
    helper: "Tap for status",
    label: `${ride.hostName || "Host"} estimate`,
    updated: false,
    value: "Not yet updated",
  };
}

export function formatRideAppEstimatedFarePerPerson(ride: (HomeRide | CalendarRide) & RideAppFareEstimateFields) {
  const estimate = getRideAppEstimatedFarePerPerson(ride);
  return typeof estimate === "number" ? `HK$${estimate}` : null;
}

export function formatRideAppEstimatedFareTotal(ride: (HomeRide | CalendarRide) & RideAppFareEstimateFields) {
  if (ride.estimatedRideAppFare?.trim()) return ride.estimatedRideAppFare.trim();

  if (typeof ride.rideAppEstimatedFareTotal === "number" && ride.rideAppEstimatedFareTotal > 0) {
    return `HK$${Math.round(ride.rideAppEstimatedFareTotal)}`;
  }

  return null;
}

export function parseRideAppFareEstimateInput(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}
