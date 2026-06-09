import { useSyncExternalStore } from "react";

export type RideAppWaiverState = {
  claimed: boolean;
  used: boolean;
};

const rideAppWaiverStorageKey = "ridepod:ride-app-waiver";
const rideAppWaiverChangeEvent = "ridepod:ride-app-waiver-change";
const emptyRideAppWaiverState: RideAppWaiverState = { claimed: false, used: false };

let cachedRawRideAppWaiverState: string | null = null;
let cachedRideAppWaiverState: RideAppWaiverState = emptyRideAppWaiverState;

export function getRideAppWaiverState(): RideAppWaiverState {
  if (typeof window === "undefined") return emptyRideAppWaiverState;

  try {
    const rawState = window.localStorage.getItem(rideAppWaiverStorageKey);
    if (!rawState) {
      cachedRawRideAppWaiverState = null;
      cachedRideAppWaiverState = emptyRideAppWaiverState;
      return cachedRideAppWaiverState;
    }
    if (rawState === cachedRawRideAppWaiverState) return cachedRideAppWaiverState;

    const parsed = JSON.parse(rawState) as Partial<RideAppWaiverState>;

    cachedRawRideAppWaiverState = rawState;
    cachedRideAppWaiverState = {
      claimed: parsed.claimed === true,
      used: parsed.used === true,
    };
    return cachedRideAppWaiverState;
  } catch {
    cachedRawRideAppWaiverState = null;
    cachedRideAppWaiverState = emptyRideAppWaiverState;
    return cachedRideAppWaiverState;
  }
}

export function setRideAppWaiverState(state: RideAppWaiverState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(rideAppWaiverStorageKey, JSON.stringify(state));
  window.dispatchEvent(new Event(rideAppWaiverChangeEvent));
}

export function claimRideAppWaiver() {
  const nextState = { claimed: true, used: false };
  setRideAppWaiverState(nextState);
  return nextState;
}

export function markRideAppWaiverUsed() {
  const nextState = { claimed: true, used: true };
  setRideAppWaiverState(nextState);
  return nextState;
}

function subscribeRideAppWaiver(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", listener);
  window.addEventListener(rideAppWaiverChangeEvent, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(rideAppWaiverChangeEvent, listener);
  };
}

function getEmptyRideAppWaiverState(): RideAppWaiverState {
  return emptyRideAppWaiverState;
}

export function useRideAppWaiverState() {
  return useSyncExternalStore(
    subscribeRideAppWaiver,
    getRideAppWaiverState,
    getEmptyRideAppWaiverState,
  );
}
