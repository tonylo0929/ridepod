"use client";

import { useEffect, useState } from "react";
import type { HomeRide } from "@/lib/home-ride-mock";
import type { CalendarRide } from "@/lib/my-ride-calendar-mock";
import {
  publicCreatedPodToHomeRide,
  publicCreatedRideSignature,
  type PublicCreatedRidePod,
} from "@/lib/public-created-rides";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const createdHomeRidesStorageKey = "ridepod-created-home-rides";
const createdHomeRidesCookieKey = "ridepod_created_home_rides";
const rideDateMonths: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function readCreatedHomeRides() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(createdHomeRidesStorageKey) ?? "[]");
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as HomeRide[];
  } catch {
    // Fall through to the cookie fallback below.
  }

  try {
    const cookieValue = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${createdHomeRidesCookieKey}=`))
      ?.split("=")[1];
    if (!cookieValue) return [];
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    return Array.isArray(parsed) ? (parsed as HomeRide[]) : [];
  } catch {
    return [];
  }
}

function writeCreatedHomeRides(rides: HomeRide[]) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(rides);
  try {
    window.localStorage.setItem(createdHomeRidesStorageKey, payload);
  } catch {
    // Keep cookie persistence available when local storage is not writable.
  }
  document.cookie = `${createdHomeRidesCookieKey}=${encodeURIComponent(payload)}; path=/; max-age=2592000; samesite=lax`;
  window.dispatchEvent(new Event("ridepod-created-home-rides-updated"));
}

function isViewerRide(ride: HomeRide) {
  return ride.currentUserRole === "host" || ride.currentUserRole === "joined_rider" || ride.currentUserJoined === true;
}

function mergeCreatedHomeRides(
  localRides: HomeRide[],
  publicRides: HomeRide[],
  includePublicRiderCards: boolean,
) {
  const rides: HomeRide[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  function push(ride: HomeRide) {
    const signature = publicCreatedRideSignature(ride);
    if (seenIds.has(ride.id) || seenSignatures.has(signature)) return;
    rides.push(ride);
    seenIds.add(ride.id);
    seenSignatures.add(signature);
  }

  localRides.forEach(push);
  publicRides.filter((ride) => includePublicRiderCards || isViewerRide(ride)).forEach(push);
  return rides;
}

async function getSupabaseAccessToken() {
  try {
    const client = getSupabaseBrowserClient();
    const result = await client.auth.getSession();
    return result.data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function publishCreatedHomeRide(ride: HomeRide) {
  const token = await getSupabaseAccessToken();
  if (!token) return null;

  try {
    const response = await fetch("/api/public-created-rides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ride }),
    });

    if (!response.ok) throw new Error(`Publish failed with ${response.status}`);
    window.dispatchEvent(new Event("ridepod-created-home-rides-updated"));
    return response.json() as Promise<{ pod: PublicCreatedRidePod | null }>;
  } catch (error) {
    console.warn("RidePod public created ride publish failed", error);
    return null;
  }
}

async function readPublicCreatedHomeRides(viewerUserId?: string | null) {
  try {
    const response = await fetch("/api/public-created-rides", { cache: "no-store" });
    if (!response.ok) throw new Error(`List failed with ${response.status}`);
    const payload = (await response.json()) as { pods?: PublicCreatedRidePod[] };
    return (payload.pods ?? []).map((pod) => publicCreatedPodToHomeRide(pod, viewerUserId));
  } catch (error) {
    console.warn("RidePod public created rides list failed", error);
    return [];
  }
}

export function saveCreatedHomeRide(ride: HomeRide) {
  const current = readCreatedHomeRides();
  writeCreatedHomeRides([ride, ...current.filter((item) => item.id !== ride.id)]);
  void publishCreatedHomeRide(ride);
}

export function updateCreatedHomeRide(rideId: string, updater: (ride: HomeRide) => HomeRide) {
  const current = readCreatedHomeRides();
  let updated = false;
  let updatedRide: HomeRide | null = null;
  const next = current.map((ride) => {
    if (ride.id !== rideId) return ride;
    updated = true;
    updatedRide = updater(ride);
    return updatedRide;
  });

  if (updated) {
    writeCreatedHomeRides(next);
    if (updatedRide) void publishCreatedHomeRide(updatedRide);
  }
  return updated;
}

function toDateKey(dateLabel: string) {
  const match = dateLabel.match(/(\d{1,2})\s+([A-Za-z]+)/);
  const fallback = new Date();
  if (!match) {
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, "0");
    const day = String(fallback.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const day = Number(match[1]);
  const month = rideDateMonths[match[2].toLowerCase()];
  if (!Number.isFinite(day) || month === undefined) {
    const year = fallback.getFullYear();
    const fallbackMonth = String(fallback.getMonth() + 1).padStart(2, "0");
    const fallbackDay = String(fallback.getDate()).padStart(2, "0");
    return `${year}-${fallbackMonth}-${fallbackDay}`;
  }

  return `${fallback.getFullYear()}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toTimeKey(timeLabel: string) {
  const match = timeLabel.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return "07:30";

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function createdHomeRideToCalendarRide(ride: HomeRide): CalendarRide {
  return {
    id: ride.id,
    date: toDateKey(ride.dateLabel),
    time: toTimeKey(ride.timeLabel),
    route: `${ride.fromLabel} \u2192 ${ride.toLabel}`,
    rideKind: ride.rideKind === "recurring" ? "recurring" : ride.airportDirection ? "airport" : "one_off",
    status: ride.bookingDetailsShared ? "confirm_details" : "confirm_details",
    seatsFilled: ride.seatsUsed,
    seatsTotal: ride.seatsTotal,
    rideMode: ride.rideService === "ride_app" ? "ride_app" : "taxi",
    luggage: ride.luggage,
    currentUserRole: ride.currentUserRole,
    joinedRiderIds: [],
    bookingDetailsConfirmed: ride.currentUserBookingDetailsConfirmed,
    rideAppEstimatedFareTotal: ride.rideAppEstimatedFareTotal ?? null,
    rideAppEstimatedFarePerPerson: ride.rideAppEstimatedFarePerPerson ?? null,
    rideAppEstimatedFareCurrency: ride.rideAppEstimatedFareCurrency,
    rideAppEstimatedFareUpdatedBy: ride.rideAppEstimatedFareUpdatedBy,
    rideAppEstimatedFareUpdatedAt: ride.rideAppEstimatedFareUpdatedAt,
    rideAppEstimatedFareNote: ride.rideAppEstimatedFareNote,
  };
}

export function useCreatedHomeRides(viewerUserId?: string | null, includePublicRiderCards = true) {
  const [rides, setRides] = useState<HomeRide[]>(() =>
    mergeCreatedHomeRides(readCreatedHomeRides(), [], includePublicRiderCards),
  );

  useEffect(() => {
    let cancelled = false;
    let syncId = 0;

    async function sync() {
      const currentSyncId = ++syncId;
      const localRides = readCreatedHomeRides();
      setRides(mergeCreatedHomeRides(localRides, [], includePublicRiderCards));

      const publicRides = await readPublicCreatedHomeRides(viewerUserId);
      if (cancelled || currentSyncId !== syncId) return;
      setRides(mergeCreatedHomeRides(localRides, publicRides, includePublicRiderCards));
    }

    function syncWhenVisible() {
      if (document.visibilityState === "visible") void sync();
    }

    void sync();
    window.addEventListener("storage", sync);
    window.addEventListener("ridepod-created-home-rides-updated", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", syncWhenVisible);
    const interval = window.setInterval(sync, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", sync);
      window.removeEventListener("ridepod-created-home-rides-updated", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.clearInterval(interval);
    };
  }, [includePublicRiderCards, viewerUserId]);

  return rides;
}

export function useCreatedCalendarRides(viewerUserId?: string | null) {
  return useCreatedHomeRides(viewerUserId, false).map(createdHomeRideToCalendarRide);
}
