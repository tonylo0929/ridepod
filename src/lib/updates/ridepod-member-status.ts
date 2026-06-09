import { createPodLiveUpdate } from "@/lib/updates/ridepod-live-updates";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RidePodMemberStatusRow } from "@/lib/supabase/types";

export type PodMemberStatus = "on_my_way" | "arrived" | "running_late" | "cant_find_pickup" | "not_coming";

export const podMemberStatusLabels: Record<PodMemberStatus, string> = {
  on_my_way: "On my way",
  arrived: "Arrived",
  running_late: "Running late",
  cant_find_pickup: "Can't find pickup",
  not_coming: "Not coming",
};

const statusStorageKey = "ridepod:pod-member-status";

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

function nowIso() {
  return new Date().toISOString();
}

function emitUpdatesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ridepod:updates-changed"));
}

function readLocalStatuses() {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(window.localStorage.getItem(statusStorageKey) ?? "[]") as RidePodMemberStatusRow[];
  } catch {
    return [];
  }
}

function writeLocalStatuses(statuses: RidePodMemberStatusRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(statusStorageKey, JSON.stringify(statuses));
}

export async function upsertPodMemberStatus(
  podId: string,
  userId: string,
  status: PodMemberStatus,
  message?: string | null,
) {
  const updatedAt = nowIso();

  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("pod_member_status")
      .upsert(
        {
          pod_id: podId,
          user_id: userId,
          status,
          message: message ?? null,
          updated_at: updatedAt,
        },
        { onConflict: "pod_id,user_id" },
      )
      .select("*")
      .maybeSingle();

    if (result.error) throw result.error;
    emitUpdatesChanged();
    return { source: "supabase" as const, status: result.data };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod member status write failed", error);
    }

    const statuses = readLocalStatuses().filter((item) => !(item.pod_id === podId && item.user_id === userId));
    const nextStatus: RidePodMemberStatusRow = {
      id: `local-${crypto.randomUUID()}`,
      pod_id: podId,
      user_id: userId,
      status,
      message: message ?? null,
      updated_at: updatedAt,
    };
    writeLocalStatuses([nextStatus, ...statuses]);
    emitUpdatesChanged();
    return { source: "mock" as const, status: nextStatus };
  }
}

export async function listPodMemberStatuses(podId: string) {
  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("pod_member_status")
      .select("*")
      .eq("pod_id", podId)
      .order("updated_at", { ascending: false });

    if (result.error) throw result.error;
    return { source: "supabase" as const, statuses: result.data ?? [], fallbackNote: null };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod member status list failed", error);
    }

    return {
      source: "mock" as const,
      statuses: readLocalStatuses().filter((item) => item.pod_id === podId),
      fallbackNote: "Supabase member statuses are unavailable; showing local demo statuses.",
    };
  }
}

export async function createPodStatusUpdate(podId: string, userId: string, status: PodMemberStatus) {
  const label = podMemberStatusLabels[status];
  await upsertPodMemberStatus(podId, userId, status, label);

  return createPodLiveUpdate({
    podId,
    userId,
    updateType: "coordination_note",
    message: `${label}.`,
    metadata: { status },
  });
}
