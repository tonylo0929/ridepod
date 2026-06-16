import type { HomeRide } from "@/lib/home-ride-mock";

const storageKey = "ridepod:ride-app-self-settle-joins:v1";
const ridePatchStorageKey = "ridepod:ride-app-self-settle-ride-patches:v1";

type StoredSelfSettleJoin = {
  currentUserJoined: true;
  currentUserRole: "joined_rider";
  selfSettleRiskAccepted: true;
  seatsUsed: number;
  joinedAt: string;
};

type StoredSelfSettleJoins = Record<string, StoredSelfSettleJoin>;
type StoredSelfSettleRidePatches = Record<string, Partial<HomeRide>>;

const hostUnsafeViewerPatchKeys = [
  "currentUserJoined",
  "currentUserRole",
  "currentUserName",
  "currentUserJoinIntentStatus",
  "currentUserBookingDetailsConfirmed",
  "currentUserConfirmedBookingDetailsVersion",
  "currentUserRideAppDetailVersionConfirmed",
  "currentUserConfirmationExpired",
  "selfSettleConfirmationStatus",
  "platformFeeStatus",
  "quoteStatus",
  "joinedRiders",
  "joinedRiderCount",
  "confirmedRiderCount",
  "rideAppConfirmedRiderCount",
  "riderConfirmations",
  "seatsUsed",
  "joinLeaveCountForCurrentUser",
  "lastLeftAt",
  "rejoinCooldownUntil",
  "requiresHostApprovalToRejoin",
  "rideAppJoinLeaveActivitySummary",
  "rideAppSeatReleasedAt",
  "rideAppRejoinRequestedAt",
  "rideAppRejoinRequestedBy",
] satisfies Array<keyof HomeRide>;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredJoins(): StoredSelfSettleJoins {
  if (!canUseLocalStorage()) return {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    return JSON.parse(raw) as StoredSelfSettleJoins;
  } catch {
    return {};
  }
}

function writeStoredJoins(joins: StoredSelfSettleJoins) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(joins));
}

function readStoredRidePatches(): StoredSelfSettleRidePatches {
  if (!canUseLocalStorage()) return {};

  try {
    const raw = window.localStorage.getItem(ridePatchStorageKey);
    if (!raw) return {};
    return JSON.parse(raw) as StoredSelfSettleRidePatches;
  } catch {
    return {};
  }
}

function writeStoredRidePatches(patches: StoredSelfSettleRidePatches) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(ridePatchStorageKey, JSON.stringify(patches));
}

function mergeRideAppBookingDetails(base: HomeRide["rideAppBookingDetails"], patch: HomeRide["rideAppBookingDetails"]) {
  return patch
    ? {
        ...base,
        ...patch,
      }
    : base;
}

function mergeRideAppChecklist(base: HomeRide["rideAppChecklist"], patch: HomeRide["rideAppChecklist"]) {
  return patch
    ? ({
        ...(base ?? patch),
        ...patch,
      } as HomeRide["rideAppChecklist"])
    : base;
}

function hasViewerRelationshipPatch(patch: Partial<HomeRide> | null) {
  if (!patch) return false;

  return (
    "currentUserRole" in patch ||
    "currentUserJoined" in patch ||
    "currentUserJoinIntentStatus" in patch ||
    "quoteStatus" in patch ||
    "joinLeaveCountForCurrentUser" in patch
  );
}

function stripViewerRelationshipPatchForHost(patch: Partial<HomeRide> | null) {
  if (!patch || !hasViewerRelationshipPatch(patch)) return patch;

  const nextPatch = { ...patch };
  for (const key of hostUnsafeViewerPatchKeys) {
    delete nextPatch[key];
  }

  return nextPatch;
}

export function getStoredSelfSettleJoin(rideId: string) {
  return readStoredJoins()[rideId] ?? null;
}

export function getStoredSelfSettleRidePatch(rideId: string) {
  return readStoredRidePatches()[rideId] ?? null;
}

export function getRideWithStoredSelfSettleJoin(ride: HomeRide): HomeRide {
  if (ride.rideCategory !== "ride_app_self_settle") return ride;

  const stored = getStoredSelfSettleJoin(ride.id);
  const patch =
    ride.currentUserRole === "host"
      ? stripViewerRelationshipPatchForHost(getStoredSelfSettleRidePatch(ride.id))
      : getStoredSelfSettleRidePatch(ride.id);
  const joinedRide = stored && ride.currentUserRole !== "host"
    ? {
        ...ride,
        currentUserJoined: true,
        currentUserRole: "joined_rider" as const,
        selfSettleRiskAccepted: true,
        quoteStatus: "joined" as const,
        seatsUsed: Math.min(stored.seatsUsed, ride.seatsTotal),
        joinedRiders: ride.joinedRiders.some((name) => name.trim().toLowerCase() === "you")
          ? ride.joinedRiders
          : [...ride.joinedRiders, "You"],
      }
    : ride;

  if (!patch) return joinedRide;

  return {
    ...joinedRide,
    ...patch,
    rideAppBookingDetails: mergeRideAppBookingDetails(joinedRide.rideAppBookingDetails, patch.rideAppBookingDetails),
    rideAppChecklist: mergeRideAppChecklist(joinedRide.rideAppChecklist, patch.rideAppChecklist),
  };
}

export function saveStoredSelfSettleRidePatch(rideId: string, patch: Partial<HomeRide>) {
  const patches = readStoredRidePatches();
  const existing = patches[rideId] ?? {};

  patches[rideId] = {
    ...existing,
    ...patch,
    rideAppBookingDetails: mergeRideAppBookingDetails(existing.rideAppBookingDetails, patch.rideAppBookingDetails),
    rideAppChecklist: mergeRideAppChecklist(existing.rideAppChecklist, patch.rideAppChecklist),
  };

  writeStoredRidePatches(patches);
}

export function saveStoredSelfSettleJoin(ride: HomeRide) {
  const joins = readStoredJoins();
  const alreadyJoined = ride.currentUserJoined === true || ride.quoteStatus === "joined";

  joins[ride.id] = {
    currentUserJoined: true,
    currentUserRole: "joined_rider",
    selfSettleRiskAccepted: true,
    seatsUsed: Math.min(ride.seatsUsed + (alreadyJoined ? 0 : 1), ride.seatsTotal),
    joinedAt: new Date().toISOString(),
  };

  writeStoredJoins(joins);
}

export function clearStoredSelfSettleJoin(rideId: string) {
  const joins = readStoredJoins();
  delete joins[rideId];
  writeStoredJoins(joins);
}
