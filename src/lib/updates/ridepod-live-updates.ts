import { currentUserId } from "@/lib/mock-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json, RidePodLiveUpdateRow } from "@/lib/supabase/types";

export type PodLiveUpdateType =
  | "joined"
  | "attendance_cancelled"
  | "left"
  | "host_update"
  | "taxi_quote_requested"
  | "taxi_quote_ready"
  | "quote_accepted"
  | "all_guests_accepted"
  | "ready_for_pickup"
  | "partner_arrived"
  | "ride_started"
  | "coordination_note"
  | "issue_reported"
  | "settlement_ready"
  | "system";

export type CreatePodLiveUpdateInput = {
  podId: string;
  userId?: string | null;
  updateType: PodLiveUpdateType;
  message?: string | null;
  metadata?: Record<string, unknown>;
};

const liveUpdatesStorageKey = "ridepod:pod-live-updates";

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

function nowIso() {
  return new Date().toISOString();
}

function emitUpdatesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ridepod:updates-changed"));
}

function readLocalUpdates() {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(window.localStorage.getItem(liveUpdatesStorageKey) ?? "[]") as RidePodLiveUpdateRow[];
  } catch {
    return [];
  }
}

function writeLocalUpdates(updates: RidePodLiveUpdateRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(liveUpdatesStorageKey, JSON.stringify(updates));
}

function sanitizeMetadata(metadata: Record<string, unknown> = {}): Json {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !["phone", "email", "card", "clientSecret", "client_secret"].includes(key)),
  ) as Json;
}

function localUpdateFromInput(input: CreatePodLiveUpdateInput): RidePodLiveUpdateRow {
  return {
    id: `local-${crypto.randomUUID()}`,
    pod_id: input.podId,
    user_id: input.userId ?? null,
    update_type: input.updateType,
    message: input.message ?? null,
    metadata: sanitizeMetadata(input.metadata),
    created_at: nowIso(),
  };
}

export function demoPodLiveUpdates(podId: string): RidePodLiveUpdateRow[] {
  const createdAt = Date.now();

  return [
    {
      id: `${podId}-demo-joined`,
      pod_id: podId,
      user_id: currentUserId,
      update_type: "joined",
      message: "Guest joined the pod.",
      metadata: {},
      created_at: new Date(createdAt - 18 * 60 * 1000).toISOString(),
    },
    {
      id: `${podId}-demo-quote`,
      pod_id: podId,
      user_id: null,
      update_type: "taxi_quote_requested",
      message: "Taxi partner quote is pending.",
      metadata: {},
      created_at: new Date(createdAt - 10 * 60 * 1000).toISOString(),
    },
  ];
}

export async function createPodLiveUpdate(input: CreatePodLiveUpdateInput) {
  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("pod_live_updates")
      .insert({
        pod_id: input.podId,
        user_id: input.userId ?? null,
        update_type: input.updateType,
        message: input.message ?? null,
        metadata: sanitizeMetadata(input.metadata),
      })
      .select("*")
      .maybeSingle();

    if (result.error) throw result.error;
    emitUpdatesChanged();
    return { ok: true, update: result.data, source: "supabase" as const };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod live update write failed", error);
    }

    const update = localUpdateFromInput(input);
    writeLocalUpdates([update, ...readLocalUpdates()]);
    emitUpdatesChanged();
    return { ok: true, update, source: "mock" as const };
  }
}

export async function listPodLiveUpdates(podId: string) {
  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("pod_live_updates")
      .select("*")
      .eq("pod_id", podId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (result.error) throw result.error;
    return { source: "supabase" as const, updates: result.data ?? [], fallbackNote: null };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod live update list failed", error);
    }

    const local = readLocalUpdates().filter((update) => update.pod_id === podId);
    return {
      source: "mock" as const,
      updates: [...demoPodLiveUpdates(podId), ...local].sort(
        (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
      ),
      fallbackNote: "Supabase pod activity is unavailable; showing local demo activity.",
    };
  }
}

export async function listAllLocalPodLiveUpdates() {
  return readLocalUpdates();
}

export async function listUserPodActivity(userId: string) {
  try {
    const client = getSupabaseBrowserClient();
    const [membershipResult, hostedResult] = await Promise.all([
      client.from("pod_members").select("pod_id").eq("user_id", userId),
      client.from("pods").select("id").eq("host_user_id", userId),
    ]);

    if (membershipResult.error) throw membershipResult.error;
    if (hostedResult.error) throw hostedResult.error;

    const podIds = Array.from(
      new Set([
        ...((membershipResult.data ?? []).map((membership) => membership.pod_id).filter(Boolean) as string[]),
        ...(hostedResult.data ?? []).map((pod) => pod.id),
      ]),
    );

    if (!podIds.length) return { source: "supabase" as const, updates: [], fallbackNote: null };

    const result = await client
      .from("pod_live_updates")
      .select("*")
      .in("pod_id", podIds)
      .order("created_at", { ascending: false })
      .limit(100);

    if (result.error) throw result.error;
    return { source: "supabase" as const, updates: result.data ?? [], fallbackNote: null };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod user pod activity list failed", error);
    }

    return {
      source: "mock" as const,
      updates: readLocalUpdates()
        .filter((update) => update.user_id === userId || userId.startsWith("mock-"))
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()),
      fallbackNote: "Supabase pod activity is unavailable; showing local demo activity.",
    };
  }
}

export async function canUserAccessPodUpdates(userId: string | null | undefined, podId: string) {
  if (!userId) return false;
  if (userId.startsWith("mock-") || userId === currentUserId) return true;

  try {
    const client = getSupabaseBrowserClient();
    const hostResult = await client
      .from("pods")
      .select("id")
      .eq("id", podId)
      .eq("host_user_id", userId)
      .limit(1);

    if (hostResult.error) throw hostResult.error;
    if (hostResult.data?.length) return true;

    const result = await client
      .from("pod_members")
      .select("id")
      .eq("user_id", userId)
      .eq("pod_id", podId)
      .limit(1);

    if (result.error) throw result.error;
    return Boolean(result.data?.length);
  } catch {
    return true;
  }
}

export async function createStatusAndUpdate(input: {
  podId: string;
  userId: string;
  status: string;
  message: string;
}) {
  return createPodLiveUpdate({
    podId: input.podId,
    userId: input.userId,
    updateType: "coordination_note",
    message: input.message,
    metadata: { status: input.status },
  });
}
