import {
  createLocalUserNotification,
  createLocalUserNotificationOnce,
  type RidePodNotificationType,
} from "@/lib/notifications/ridepod-notifications";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";

export type PodNotificationAudience = "actor" | "host" | "members" | "riders" | "others" | "all";

export type NotifyPodAudienceInput = {
  podId: string;
  actorUserId: string;
  actorDisplayName?: string | null;
  type: RidePodNotificationType;
  audiences: PodNotificationAudience[];
  title: string;
  body?: string | null;
  selfTitle?: string | null;
  selfBody?: string | null;
  relatedUrl?: string | null;
  metadata?: Record<string, unknown>;
  dedupe?: boolean;
  fallbackRecipientUserIds?: string[];
  delivery?: "auto" | "local";
};

type NotifyPodAudienceRpc = {
  rpc: (
    fn: "notify_pod_audience",
    args: {
      p_pod_id: string;
      p_actor_user_id: string;
      p_audiences: string[];
      p_type: string;
      p_title: string;
      p_body: string | null;
      p_self_title: string | null;
      p_self_body: string | null;
      p_related_url: string | null;
      p_metadata: Json;
      p_dedupe: boolean;
    },
  ) => Promise<{ data: number | null; error: { message?: string } | null }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return uuidPattern.test(value);
}

function emitUpdatesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ridepod:updates-changed"));
}

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

function isMissingRpc(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return message.includes("notify_pod_audience") || message.includes("function") || message.includes("schema cache");
}

function sanitizeMetadata(metadata: Record<string, unknown> = {}): Json {
  const blockedKeys = new Set([
    "phone",
    "email",
    "card",
    "clientSecret",
    "client_secret",
    "paymentSecret",
    "payment_secret",
    "adminNotes",
    "admin_notes",
  ]);

  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !blockedKeys.has(key))) as Json;
}

async function notifyViaServer(input: NotifyPodAudienceInput) {
  let token: string | null = null;

  try {
    const client = getSupabaseBrowserClient();
    const sessionResult = await client.auth.getSession();
    token = sessionResult.data.session?.access_token ?? null;
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod notification session lookup failed", error);
    }
  }

  if (!token) return { ok: false, skipped: true };

  const response = await fetch("/api/pod-notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, skipped: response.status === 404 || response.status === 503 };
  }

  return { ok: true };
}

async function notifyViaRpc(input: NotifyPodAudienceInput) {
  if (!isUuid(input.podId) || !isUuid(input.actorUserId)) return { ok: false, skipped: true };

  try {
    const client = getSupabaseBrowserClient() as unknown as NotifyPodAudienceRpc;
    const result = await client.rpc("notify_pod_audience", {
      p_pod_id: input.podId,
      p_actor_user_id: input.actorUserId,
      p_audiences: input.audiences,
      p_type: input.type,
      p_title: input.title,
      p_body: input.body ?? null,
      p_self_title: input.selfTitle ?? null,
      p_self_body: input.selfBody ?? null,
      p_related_url: input.relatedUrl ?? `/pods/${input.podId}`,
      p_metadata: sanitizeMetadata(input.metadata),
      p_dedupe: input.dedupe !== false,
    });

    if (result.error) throw result.error;
    return { ok: true };
  } catch (error) {
    if (!isMissingSupabaseConfig(error) && !isMissingRpc(error)) {
      console.warn("RidePod pod notification fanout RPC failed", error);
    }
    return { ok: false, skipped: true };
  }
}

async function notifyLocalFallback(input: NotifyPodAudienceInput) {
  const relatedUrl = input.relatedUrl ?? `/pods/${input.podId}`;
  const recipients = new Set<string>();
  if (input.audiences.includes("actor") || input.audiences.includes("all")) recipients.add(input.actorUserId);
  for (const recipientId of input.fallbackRecipientUserIds ?? []) {
    if (recipientId) recipients.add(recipientId);
  }

  const tasks = Array.from(recipients).map((recipientUserId) => {
    const isSelf = recipientUserId === input.actorUserId;
    const payload = {
      recipientUserId,
      actorUserId: input.actorUserId,
      type: input.type,
      title: isSelf ? (input.selfTitle ?? input.title) : input.title,
      body: isSelf ? (input.selfBody ?? input.body ?? null) : (input.body ?? null),
      relatedPodId: input.podId,
      relatedUrl,
      metadata: {
        ...(input.metadata ?? {}),
        audience: input.audiences,
        localFallback: true,
      },
    };

    return input.dedupe === false ? createLocalUserNotification(payload) : createLocalUserNotificationOnce(payload);
  });

  await Promise.allSettled(tasks);
  emitUpdatesChanged();
}

export async function notifyPodAudience(input: NotifyPodAudienceInput) {
  if (input.delivery === "local") {
    await notifyLocalFallback(input);
    return { ok: true, source: "local" as const };
  }

  const serverResult = await notifyViaServer(input).catch((error) => {
    console.warn("RidePod pod notification fanout API failed", error);
    return { ok: false, skipped: true };
  });
  if (serverResult.ok) {
    emitUpdatesChanged();
    return { ok: true, source: "server" as const };
  }

  const rpcResult = await notifyViaRpc(input);
  if (rpcResult.ok) {
    emitUpdatesChanged();
    return { ok: true, source: "rpc" as const };
  }

  await notifyLocalFallback(input);
  return { ok: true, source: "local" as const };
}
