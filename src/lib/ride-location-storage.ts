import type { RideLocation } from "@/lib/ride-location-types";

type SavedRideLocations = {
  home: RideLocation | null;
  work: RideLocation | null;
};

const savedLocationsKey = "fare-enough:ride-locations:saved:v1";
const recentLocationsKey = "fare-enough:ride-locations:recent:v1";
const maxRecentLocations = 5;

const emptySavedLocations: SavedRideLocations = {
  home: null,
  work: null,
};

function canUseBrowserStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseBrowserStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private browsing; location picking should still work.
  }
}

function isValidLocation(location: RideLocation | null | undefined): location is RideLocation {
  return Boolean(
    location &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      location.name.trim() &&
      location.formattedAddress.trim(),
  );
}

function distanceMeters(a: RideLocation, b: RideLocation) {
  const earthRadiusMeters = 6371000;
  const toRadians = Math.PI / 180;
  const latDelta = (b.latitude - a.latitude) * toRadians;
  const lngDelta = (b.longitude - a.longitude) * toRadians;
  const latA = a.latitude * toRadians;
  const latB = b.latitude * toRadians;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function isSameLocation(a: RideLocation, b: RideLocation) {
  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;
  return distanceMeters(a, b) < 35;
}

export function getSavedRideLocations(): SavedRideLocations {
  const saved = readJson<SavedRideLocations>(savedLocationsKey, emptySavedLocations);

  return {
    home: isValidLocation(saved.home) ? saved.home : null,
    work: isValidLocation(saved.work) ? saved.work : null,
  };
}

export function saveRideLocationShortcut(kind: keyof SavedRideLocations, location: RideLocation) {
  if (!isValidLocation(location)) return;
  const saved = getSavedRideLocations();
  writeJson(savedLocationsKey, {
    ...saved,
    [kind]: {
      ...location,
      source: "saved-place",
    },
  });
}

export function getRecentRideLocations(): RideLocation[] {
  return readJson<RideLocation[]>(recentLocationsKey, []).filter(isValidLocation).slice(0, maxRecentLocations);
}

export function rememberRideLocation(location: RideLocation) {
  if (!isValidLocation(location)) return;

  const normalizedLocation: RideLocation = {
    ...location,
    source: "recent",
  };
  const nextLocations = [
    normalizedLocation,
    ...getRecentRideLocations().filter((recent) => !isSameLocation(recent, normalizedLocation)),
  ].slice(0, maxRecentLocations);

  writeJson(recentLocationsKey, nextLocations);
}
