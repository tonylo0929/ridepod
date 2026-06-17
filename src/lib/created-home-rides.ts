"use client";

import { useEffect, useState } from "react";
import type { HomeRide } from "@/lib/home-ride-mock";
import type { CalendarRide } from "@/lib/my-ride-calendar-mock";
import {
  publicCreatedPodToHomeRide,
  publicCreatedRideSignature,
  viewerIdentityMatchesHostName,
  type PublicCreatedRidePod,
  type PublicCreatedRideViewerIdentity,
} from "@/lib/public-created-rides";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const createdHomeRidesStorageKey = "ridepod-created-home-rides";
const createdHomeRidesCookieKey = "ridepod_created_home_rides";
const publicCreatedHomeRidesStorageKey = "ridepod-public-created-home-rides";
const publicCreatedHomeRidesChannel = "ridepod-public-created-home-rides";
type CachedPublicCreatedHomeRide = {
  ride: HomeRide;
  hostUserId: string | null;
  cachedAt: string;
};
type PublicCreatedHomeRideBroadcast = {
  version: 1;
  ride: HomeRide;
  hostUserId: string | null;
  sentAt: string;
};
type PublicCreatedHomeRideSyncRequest = {
  version: 1;
  requesterUserId: string | null;
  sentAt: string;
};
export type CreatedHomeRideHostAvatar = Pick<HomeRide, "hostAvatarPreference" | "hostAvatarUrl" | "hostDisplayName">;
export type CreatedHomeRideViewerIdentity = PublicCreatedRideViewerIdentity;
type PublicCreatedHomeRidesChannel = ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]>;
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

function readCachedPublicCreatedHomeRides() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(publicCreatedHomeRidesStorageKey) ?? "[]");
    return Array.isArray(parsed) ? (parsed as CachedPublicCreatedHomeRide[]) : [];
  } catch {
    return [];
  }
}

function writeCachedPublicCreatedHomeRides(rides: CachedPublicCreatedHomeRide[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(publicCreatedHomeRidesStorageKey, JSON.stringify(rides.slice(0, 100)));
}

export function createdHomeRideViewerIdentityFromAuth({
  profile,
  user,
}: {
  profile?: {
    account_name?: string | null;
    display_name?: string | null;
    preferred_name?: string | null;
    email?: string | null;
  } | null;
  user?: {
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
}): CreatedHomeRideViewerIdentity {
  return {
    accountName: profile?.account_name ?? null,
    displayName: profile?.display_name ?? null,
    preferredName: profile?.preferred_name ?? null,
    email: profile?.email ?? user?.email ?? null,
    metadataAccountName: typeof user?.user_metadata?.account_name === "string" ? user.user_metadata.account_name : null,
    metadataDisplayName: typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null,
  };
}

function getRideHostNameForViewerMatch(ride: HomeRide) {
  return ride.hostDisplayName ?? (ride.hostName !== "You" ? ride.hostName : null);
}

function applyViewerRelationship(
  ride: HomeRide,
  hostUserId: string | null,
  viewerUserId?: string | null,
  viewerIdentity?: CreatedHomeRideViewerIdentity | null,
): HomeRide {
  const isHost =
    Boolean(viewerUserId && hostUserId && viewerUserId === hostUserId) ||
    viewerIdentityMatchesHostName(getRideHostNameForViewerMatch(ride), viewerIdentity);
  if (isHost) {
    return {
      ...ride,
      currentUserRole: "host",
      currentUserName: "You",
      hostName: "You",
    };
  }

  return {
    ...ride,
    currentUserRole: "rider",
    currentUserName: undefined,
    currentUserJoined: false,
    currentUserBookingDetailsConfirmed: false,
    currentUserJoinIntentStatus: "not_joined",
    hostName: ride.hostName === "You" ? "New host" : ride.hostName,
    rideAppChecklist: ride.rideAppChecklist
      ? {
          ...ride.rideAppChecklist,
          updatedBy: ride.rideAppChecklist.updatedBy === "You" ? "Host" : ride.rideAppChecklist.updatedBy,
        }
      : undefined,
    riderConfirmations: ride.riderConfirmations?.map((confirmation) =>
      confirmation.isCurrentUser ? { ...confirmation, isCurrentUser: false } : confirmation,
    ),
  };
}

function cachedPublicRidesForViewer(
  viewerUserId?: string | null,
  viewerIdentity?: CreatedHomeRideViewerIdentity | null,
) {
  return readCachedPublicCreatedHomeRides().map((cached) =>
    applyViewerRelationship(cached.ride, cached.hostUserId, viewerUserId, viewerIdentity),
  );
}

function cachePublicCreatedHomeRide(ride: HomeRide, hostUserId: string | null) {
  const current = readCachedPublicCreatedHomeRides();
  const nextRide = {
    ride,
    hostUserId,
    cachedAt: new Date().toISOString(),
  };
  writeCachedPublicCreatedHomeRides([nextRide, ...current.filter((item) => item.ride.id !== ride.id)]);
}

function isViewerRide(ride: HomeRide) {
  return ride.currentUserRole === "host" || ride.currentUserRole === "joined_rider" || ride.currentUserJoined === true;
}

function createdHomeRideSortKey(ride: HomeRide) {
  return `${toDateKey(ride.dateLabel)}T${toTimeKey(ride.timeLabel)}`;
}

function getEffectiveJoinedRiderCount(ride: HomeRide) {
  return Math.max(ride.joinedRiderCount ?? 0, Math.max(0, ride.seatsUsed - 1));
}

function mergeRiderConfirmations(existing: HomeRide, incoming: HomeRide) {
  const existingRows = existing.riderConfirmations ?? [];
  const incomingRows = incoming.riderConfirmations ?? [];
  if (!existingRows.length) return incoming.riderConfirmations;
  if (!incomingRows.length) return existing.riderConfirmations;

  const keepExistingCurrentUser = existingRows.some((row) => row.role === "rider" && row.isCurrentUser);
  if (!keepExistingCurrentUser && incomingRows.length > existingRows.length) return incomingRows;

  const mergedRows = [...existingRows];
  const incomingRiderRows = incomingRows.filter((row) => row.role === "rider");
  for (const incomingRow of incomingRiderRows) {
    const duplicate = mergedRows.some((row) => row.role === incomingRow.role && row.name === incomingRow.name);
    if (!duplicate && mergedRows.filter((row) => row.role === "rider").length < incomingRiderRows.length) {
      mergedRows.push(incomingRow);
    }
  }

  return mergedRows;
}

function mergeCreatedHomeRide(existing: HomeRide, incoming: HomeRide): HomeRide {
  const incomingIsPublicViewerCopy =
    incoming.currentUserRole === "rider" && incoming.currentUserJoined === false && incoming.hostName !== "You";
  const shouldDemoteStaleHost = existing.currentUserRole === "host" && incomingIsPublicViewerCopy;
  const shouldDiscardStaleViewerJoin =
    incoming.currentUserRole === "host" && (existing.currentUserRole === "joined_rider" || existing.currentUserJoined === true);
  const shouldUseIncomingRelationship =
    (existing.currentUserRole !== "host" || shouldDemoteStaleHost) &&
    (incoming.currentUserRole === "host" ||
      incoming.currentUserRole === "joined_rider" ||
      incoming.currentUserJoined === true ||
      shouldDemoteStaleHost);
  const seatsTotal = Math.max(1, existing.seatsTotal || incoming.seatsTotal || 4);
  const seatsUsed = shouldDiscardStaleViewerJoin
    ? Math.min(seatsTotal, incoming.seatsUsed)
    : Math.min(seatsTotal, Math.max(existing.seatsUsed, incoming.seatsUsed));
  const joinedRiderCount = shouldDiscardStaleViewerJoin
    ? getEffectiveJoinedRiderCount(incoming)
    : Math.max(getEffectiveJoinedRiderCount(existing), getEffectiveJoinedRiderCount(incoming));
  const riderConfirmations = shouldDiscardStaleViewerJoin ? incoming.riderConfirmations : mergeRiderConfirmations(existing, incoming);

  return {
    ...existing,
    id: shouldDemoteStaleHost ? incoming.id : existing.id,
    ...(shouldUseIncomingRelationship
      ? {
          currentUserRole: incoming.currentUserRole,
          currentUserName: incoming.currentUserName,
          currentUserJoined: incoming.currentUserJoined,
          currentUserJoinIntentStatus: incoming.currentUserJoinIntentStatus,
          quoteStatus: incoming.quoteStatus,
          hostName: incoming.hostName,
        }
      : null),
    seatsUsed,
    joinedRiderCount,
    confirmedRiderCount: Math.max(existing.confirmedRiderCount ?? 0, incoming.confirmedRiderCount ?? 0),
    rideAppConfirmedRiderCount: Math.max(existing.rideAppConfirmedRiderCount ?? 0, incoming.rideAppConfirmedRiderCount ?? 0),
    riderConfirmations,
    joinedRiders: shouldDiscardStaleViewerJoin
      ? (incoming.joinedRiders ?? [])
      : Array.from(new Set([...(existing.joinedRiders ?? []), ...(incoming.joinedRiders ?? [])])),
  };
}

function mergeCreatedHomeRides(
  localRides: HomeRide[],
  publicRides: HomeRide[],
  includePublicRiderCards: boolean,
) {
  const rides: HomeRide[] = [];
  const indexesById = new Map<string, number>();
  const indexesBySignature = new Map<string, number>();

  function push(ride: HomeRide) {
    const signature = publicCreatedRideSignature(ride);
    const existingIndex = indexesById.get(ride.id) ?? indexesBySignature.get(signature);
    if (existingIndex !== undefined) {
      rides[existingIndex] = mergeCreatedHomeRide(rides[existingIndex], ride);
      return;
    }

    rides.push(ride);
    const index = rides.length - 1;
    indexesById.set(ride.id, index);
    indexesBySignature.set(signature, index);
  }

  localRides.forEach(push);
  publicRides.filter((ride) => includePublicRiderCards || isViewerRide(ride)).forEach(push);
  return rides.sort((first, second) => createdHomeRideSortKey(second).localeCompare(createdHomeRideSortKey(first)));
}

async function getSupabaseSessionContext() {
  try {
    const client = getSupabaseBrowserClient();
    const result = await client.auth.getSession();
    return {
      client,
      token: result.data.session?.access_token ?? null,
      userId: result.data.session?.user.id ?? null,
    };
  } catch {
    return null;
  }
}

async function publishCreatedHomeRide(ride: HomeRide) {
  const session = await getSupabaseSessionContext();
  if (!session?.token) return null;

  try {
    const response = await fetch("/api/public-created-rides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
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

async function broadcastCreatedHomeRide(ride: HomeRide) {
  const session = await getSupabaseSessionContext();
  if (!session?.client || !session.userId) return;

  const channel = session.client.channel(publicCreatedHomeRidesChannel, {
    config: { broadcast: { self: false } },
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Broadcast subscription timed out")), 5000);
      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        window.clearTimeout(timeout);
        resolve();
      });
    });
    await sendCreatedHomeRideBroadcast(channel, ride, session.userId);
  } catch (error) {
    console.warn("RidePod public created ride broadcast failed", error);
  } finally {
    void session.client.removeChannel(channel);
  }
}

async function sendCreatedHomeRideBroadcast(
  channel: PublicCreatedHomeRidesChannel,
  ride: HomeRide,
  hostUserId: string | null,
) {
  await channel.send({
    type: "broadcast",
    event: "created",
    payload: {
      version: 1,
      ride,
      hostUserId,
      sentAt: new Date().toISOString(),
    } satisfies PublicCreatedHomeRideBroadcast,
  });
}

async function sendPublicCreatedHomeRideSyncRequest(
  channel: PublicCreatedHomeRidesChannel,
  requesterUserId: string | null,
) {
  await channel.send({
    type: "broadcast",
    event: "sync-request",
    payload: {
      version: 1,
      requesterUserId,
      sentAt: new Date().toISOString(),
    } satisfies PublicCreatedHomeRideSyncRequest,
  });
}

async function broadcastKnownCreatedHomeRides(
  channel: PublicCreatedHomeRidesChannel,
  hostUserId: string | null | undefined,
) {
  const sentRideIds = new Set<string>();

  if (hostUserId) {
    for (const ride of readCreatedHomeRides()) {
      sentRideIds.add(ride.id);
      await sendCreatedHomeRideBroadcast(channel, ride, hostUserId);
    }
  }

  for (const cached of readCachedPublicCreatedHomeRides()) {
    if (sentRideIds.has(cached.ride.id)) continue;
    sentRideIds.add(cached.ride.id);
    await sendCreatedHomeRideBroadcast(channel, cached.ride, cached.hostUserId);
  }
}

async function announceLocalCreatedHomeRides(
  channel: PublicCreatedHomeRidesChannel,
  hostUserId: string | null | undefined,
) {
  if (!hostUserId) return;

  for (const ride of readCreatedHomeRides()) {
    await sendCreatedHomeRideBroadcast(channel, ride, hostUserId);
  }
}

async function readPublicCreatedHomeRides(
  viewerUserId?: string | null,
  viewerIdentity?: CreatedHomeRideViewerIdentity | null,
) {
  try {
    const response = await fetch("/api/public-created-rides", { cache: "no-store" });
    if (!response.ok) throw new Error(`List failed with ${response.status}`);
    const payload = (await response.json()) as { pods?: PublicCreatedRidePod[] };
    return (payload.pods ?? []).map((pod) => publicCreatedPodToHomeRide(pod, viewerUserId, viewerIdentity));
  } catch (error) {
    console.warn("RidePod public created rides list failed", error);
    return [];
  }
}

export function saveCreatedHomeRide(ride: HomeRide) {
  const current = readCreatedHomeRides();
  writeCreatedHomeRides([ride, ...current.filter((item) => item.id !== ride.id)]);
  void publishCreatedHomeRide(ride);
  void broadcastCreatedHomeRide(ride);
}

export function saveViewerHomeRide(ride: HomeRide) {
  const current = readCreatedHomeRides();
  writeCreatedHomeRides([ride, ...current.filter((item) => item.id !== ride.id)]);
}

export function updateCreatedHomeRideHostAvatar(hostAvatar: CreatedHomeRideHostAvatar) {
  const current = readCreatedHomeRides();
  let changed = false;
  const next = current.map((ride) => {
    if (ride.currentUserRole !== "host") return ride;
    const updated = {
      ...ride,
      hostAvatarPreference: hostAvatar.hostAvatarPreference,
      hostAvatarUrl: hostAvatar.hostAvatarUrl,
      hostDisplayName: hostAvatar.hostDisplayName,
    };
    const didChange =
      JSON.stringify(ride.hostAvatarPreference ?? null) !== JSON.stringify(updated.hostAvatarPreference ?? null) ||
      (ride.hostAvatarUrl ?? null) !== (updated.hostAvatarUrl ?? null) ||
      (ride.hostDisplayName ?? null) !== (updated.hostDisplayName ?? null);
    if (didChange) changed = true;
    return updated;
  });

  if (!changed) return;
  writeCreatedHomeRides(next);
  next.forEach((ride) => {
    if (ride.currentUserRole === "host") void publishCreatedHomeRide(ride);
    if (ride.currentUserRole === "host") void broadcastCreatedHomeRide(ride);
  });
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
    const rideToPublish = updatedRide as HomeRide | null;
    if (rideToPublish?.currentUserRole === "host") {
      void publishCreatedHomeRide(rideToPublish);
      void broadcastCreatedHomeRide(rideToPublish);
    }
  }
  return updated;
}

function isPublicCreatedHomeRideBroadcast(value: unknown): value is PublicCreatedHomeRideBroadcast {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<PublicCreatedHomeRideBroadcast>;
  return payload.version === 1 && Boolean(payload.ride?.id);
}

function isPublicCreatedHomeRideSyncRequest(value: unknown): value is PublicCreatedHomeRideSyncRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<PublicCreatedHomeRideSyncRequest>;
  return payload.version === 1 && "requesterUserId" in payload;
}

function toDateKey(dateLabel: string) {
  const dayMonthMatch = dateLabel.match(/(\d{1,2})\s+([A-Za-z]+)/);
  const monthDayMatch = dateLabel.match(/([A-Za-z]+)\s+(\d{1,2})/);
  const fallback = new Date();
  if (!dayMonthMatch && !monthDayMatch) {
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, "0");
    const day = String(fallback.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const day = Number(dayMonthMatch?.[1] ?? monthDayMatch?.[2]);
  const monthName = dayMonthMatch?.[2] ?? monthDayMatch?.[1] ?? "";
  const month = rideDateMonths[monthName.toLowerCase()];
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
  const hostCancellationStatus = ride.rideAppHostCancellationStatus;
  const status =
    hostCancellationStatus === "host_replacement_needed"
      ? "host_replacement_needed"
      : hostCancellationStatus === "replacement_booker_selected"
        ? "replacement_booker_selected"
        : hostCancellationStatus === "host_cancelled" || hostCancellationStatus === "cancelled" || ride.status === "cancelled"
          ? "cancelled"
          : "confirm_details";

  return {
    id: ride.id,
    date: toDateKey(ride.dateLabel),
    time: toTimeKey(ride.timeLabel),
    route: `${ride.fromLabel} \u2192 ${ride.toLabel}`,
    rideKind: ride.rideKind === "recurring" ? "recurring" : ride.airportDirection ? "airport" : "one_off",
    status,
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

export function useCreatedHomeRides(
  viewerUserId?: string | null,
  includePublicRiderCards = true,
  viewerIdentity?: CreatedHomeRideViewerIdentity | null,
) {
  const stableViewerIdentity = viewerIdentity ?? null;
  const [rides, setRides] = useState<HomeRide[]>(() =>
    mergeCreatedHomeRides(
      readCreatedHomeRides(),
      cachedPublicRidesForViewer(viewerUserId, stableViewerIdentity),
      includePublicRiderCards,
    ),
  );

  useEffect(() => {
    let cancelled = false;
    let syncId = 0;

    async function sync() {
      const currentSyncId = ++syncId;
      const localRides = readCreatedHomeRides();
      const cachedPublicRides = cachedPublicRidesForViewer(viewerUserId, stableViewerIdentity);
      setRides(mergeCreatedHomeRides(localRides, cachedPublicRides, includePublicRiderCards));

      const publicRides = await readPublicCreatedHomeRides(viewerUserId, stableViewerIdentity);
      if (cancelled || currentSyncId !== syncId) return;
      setRides(mergeCreatedHomeRides(localRides, [...cachedPublicRides, ...publicRides], includePublicRiderCards));
    }

    function syncWhenVisible() {
      if (document.visibilityState === "visible") void syncAndRequest();
    }

    async function requestRealtimeSync() {
      if (!realtimeChannel) return;
      await sendPublicCreatedHomeRideSyncRequest(realtimeChannel, viewerUserId ?? null);
      await broadcastKnownCreatedHomeRides(realtimeChannel, viewerUserId);
    }

    function syncAndRequest() {
      void sync();
      void requestRealtimeSync();
    }

    void sync();
    let realtimeClient: ReturnType<typeof getSupabaseBrowserClient> | null = null;
    let realtimeChannel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | null = null;
    try {
      realtimeClient = getSupabaseBrowserClient();
      const channel = realtimeClient
        .channel(publicCreatedHomeRidesChannel, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "created" }, ({ payload }) => {
          if (!isPublicCreatedHomeRideBroadcast(payload)) return;
          cachePublicCreatedHomeRide(payload.ride, payload.hostUserId);
          void sync();
        })
        .on("broadcast", { event: "sync-request" }, ({ payload }) => {
          if (!isPublicCreatedHomeRideSyncRequest(payload) || payload.requesterUserId === viewerUserId) return;
          window.setTimeout(() => {
            void broadcastKnownCreatedHomeRides(channel, viewerUserId);
          }, 250);
        });
      realtimeChannel = channel;
      realtimeChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") void requestRealtimeSync();
      });
    } catch {
      realtimeClient = null;
      realtimeChannel = null;
    }
    window.addEventListener("storage", sync);
    window.addEventListener("ridepod-created-home-rides-updated", syncAndRequest);
    window.addEventListener("focus", syncAndRequest);
    document.addEventListener("visibilitychange", syncWhenVisible);
    const interval = window.setInterval(sync, 30_000);
    const realtimeSyncInterval = window.setInterval(() => {
      if (!realtimeChannel) return;
      void announceLocalCreatedHomeRides(realtimeChannel, viewerUserId);
      void sendPublicCreatedHomeRideSyncRequest(realtimeChannel, viewerUserId ?? null);
    }, 5_000);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", sync);
      window.removeEventListener("ridepod-created-home-rides-updated", syncAndRequest);
      window.removeEventListener("focus", syncAndRequest);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.clearInterval(interval);
      window.clearInterval(realtimeSyncInterval);
      if (realtimeClient && realtimeChannel) void realtimeClient.removeChannel(realtimeChannel);
    };
  }, [includePublicRiderCards, stableViewerIdentity, viewerUserId]);

  return rides;
}

export function useCreatedCalendarRides(
  viewerUserId?: string | null,
  viewerIdentity?: CreatedHomeRideViewerIdentity | null,
) {
  return useCreatedHomeRides(viewerUserId, false, viewerIdentity).map(createdHomeRideToCalendarRide);
}
