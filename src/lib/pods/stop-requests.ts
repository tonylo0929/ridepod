import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json, RidePodMemberRow, RidePodSeatHoldRow, RidePodStopRequestRow } from "@/lib/supabase/types";

export type PodStopRequestType = "pickup_stop" | "dropoff_stop" | "both" | "quick_stop";

export type PodStopRequestAction = "submit" | "approve" | "decline" | "withdraw" | "complete_join";

export type PodStopRequestInput = {
  action: PodStopRequestAction;
  rideId?: string;
  stopRequestId?: string;
  requestType?: PodStopRequestType;
  requestedLocation?: string;
  requestedCoordinates?: { lat: number; lng: number } | null;
  optionalNote?: string | null;
};

export type PodStopRequestResult = {
  success: boolean;
  request: RidePodStopRequestRow | null;
  hold?: RidePodSeatHoldRow | null;
  membership?: RidePodMemberRow | null;
  capacityAvailable?: number | null;
  warning?: string;
  error?: string;
};

type StopRequestServerResult = {
  request?: RidePodStopRequestRow | null;
  hold?: RidePodSeatHoldRow | null;
  membership?: RidePodMemberRow | null;
  capacityAvailable?: number | null;
  error?: string;
};

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

function emitUpdatesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ridepod:updates-changed"));
}

async function getAccessToken() {
  const client = getSupabaseBrowserClient();
  const sessionResult = await client.auth.getSession();
  if (sessionResult.error) throw sessionResult.error;
  return sessionResult.data.session?.access_token ?? null;
}

function toJsonCoordinates(value: { lat: number; lng: number } | null | undefined): Json | null {
  if (!value || typeof value.lat !== "number" || typeof value.lng !== "number") return null;
  return { lat: value.lat, lng: value.lng };
}

export async function updatePodStopRequestViaServer(input: PodStopRequestInput): Promise<PodStopRequestResult> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, request: null, error: "Authentication required." };
    }

    const response = await fetch("/api/pod-stop-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...input,
        requestedCoordinates: toJsonCoordinates(input.requestedCoordinates),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as StopRequestServerResult;
    if (!response.ok || payload.error) {
      return {
        success: false,
        request: payload.request ?? null,
        hold: payload.hold ?? null,
        membership: payload.membership ?? null,
        capacityAvailable: payload.capacityAvailable ?? null,
        error: payload.error ?? "Stop request action failed.",
      };
    }

    emitUpdatesChanged();

    return {
      success: true,
      request: payload.request ?? null,
      hold: payload.hold ?? null,
      membership: payload.membership ?? null,
      capacityAvailable: payload.capacityAvailable ?? null,
    };
  } catch (error) {
    if (isMissingSupabaseConfig(error)) {
      return {
        success: true,
        request: null,
        warning: "Supabase not configured; stop request was saved locally only.",
      };
    }

    return {
      success: false,
      request: null,
      error: error instanceof Error ? error.message : "Stop request action failed.",
    };
  }
}

export function submitPodStopRequest(input: Omit<PodStopRequestInput, "action" | "stopRequestId">) {
  return updatePodStopRequestViaServer({ ...input, action: "submit" });
}

export function approvePodStopRequest(stopRequestId: string) {
  return updatePodStopRequestViaServer({ action: "approve", stopRequestId });
}

export function declinePodStopRequest(stopRequestId: string) {
  return updatePodStopRequestViaServer({ action: "decline", stopRequestId });
}

export function withdrawPodStopRequest(stopRequestId: string) {
  return updatePodStopRequestViaServer({ action: "withdraw", stopRequestId });
}

export function completeStopRequestJoin(stopRequestId: string) {
  return updatePodStopRequestViaServer({ action: "complete_join", stopRequestId });
}
