import type { Hk18District } from "@/lib/hk-districts";

export type RideLocationSource =
  | "autocomplete"
  | "current-location"
  | "map-pin"
  | "saved-place"
  | "recent";

export type RideLocation = {
  placeId: string | null;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  district: Hk18District | null;
  source: RideLocationSource;
  meetingPointNote?: string;
};

export type RideLocationMode = "pickup" | "dropoff";

export type RideCoordinates = {
  lat: number;
  lng: number;
};

export type RideRouteSummary = {
  distanceMeters: number | null;
  durationMillis: number | null;
  distanceLabel: string | null;
  durationLabel: string | null;
};
