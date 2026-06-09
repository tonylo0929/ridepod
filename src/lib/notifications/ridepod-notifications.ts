import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json, RidePodUserNotificationRow } from "@/lib/supabase/types";

export type RidePodNotificationType =
  | "pod_join_requested"
  | "pod_join_approved"
  | "pod_join_declined"
  | "pod_joined"
  | "pod_member_left"
  | "attendance_cancelled"
  | "attendance_changed"
  | "taxi_quote_requested"
  | "taxi_quote_ready"
  | "guest_quote_accepted"
  | "all_guests_accepted"
  | "ready_for_pickup"
  | "taxi_partner_arrived"
  | "ride_started"
  | "proof_uploaded"
  | "dispute_opened"
  | "settlement_ready"
  | "admin_decision_made"
  | `demo_${string}`;

export type CreateUserNotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  type: RidePodNotificationType;
  title: string;
  body?: string | null;
  relatedPodId?: string | null;
  relatedUrl?: string | null;
  metadata?: Record<string, unknown>;
};

const notificationStorageKey = "ridepod:user-notifications";
const blockedMetadataKeys = new Set([
  "clientsecret",
  "client_secret",
  "clientSecret",
  "card",
  "carddata",
  "card_data",
  "cardData",
  "cardnumber",
  "card_number",
  "cardNumber",
  "paymentmethod",
  "payment_method",
  "paymentMethod",
  "paymentsecret",
  "payment_secret",
  "paymentSecret",
  "stripeclientsecret",
  "stripe_client_secret",
  "stripeClientSecret",
  "adminnotes",
  "admin_notes",
  "adminNotes",
  "privatesafetynotes",
  "private_safety_notes",
  "privateSafetyNotes",
  "privatesafetyreporttext",
  "private_safety_report_text",
  "privateSafetyReportText",
  "safetyreport",
  "safety_report",
]);

const recentDedupeWindowMs = 15 * 60 * 1000;

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeMetadataKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function notificationDedupeKey(input: CreateUserNotificationInput) {
  return [
    input.recipientUserId,
    input.actorUserId ?? "system",
    input.relatedPodId ?? "no-pod",
    input.type,
  ].join(":");
}

function isRecentOrUnread(notification: RidePodUserNotificationRow) {
  if (!notification.read_at) return true;
  if (!notification.created_at) return false;

  const createdAt = new Date(notification.created_at).getTime();
  return !Number.isNaN(createdAt) && Date.now() - createdAt <= recentDedupeWindowMs;
}

function emitUpdatesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ridepod:updates-changed"));
}

function readLocalNotifications() {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(window.localStorage.getItem(notificationStorageKey) ?? "[]") as RidePodUserNotificationRow[];
  } catch {
    return [];
  }
}

function writeLocalNotifications(notifications: RidePodUserNotificationRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(notificationStorageKey, JSON.stringify(notifications));
}

function sanitizeValue(value: unknown): Json {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !blockedMetadataKeys.has(key) && !blockedMetadataKeys.has(normalizeMetadataKey(key)))
        .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]),
    );
  }
  return String(value);
}

export function sanitizeNotificationMetadata(metadata: Record<string, unknown> = {}): Json {
  return sanitizeValue(metadata);
}

function localNotificationFromInput(input: CreateUserNotificationInput): RidePodUserNotificationRow {
  return {
    id: `local-${crypto.randomUUID()}`,
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    related_pod_id: input.relatedPodId ?? null,
    related_url: input.relatedUrl ?? null,
    metadata: sanitizeNotificationMetadata(input.metadata),
    read_at: null,
    created_at: nowIso(),
  };
}

function findLocalDuplicate(input: CreateUserNotificationInput) {
  return readLocalNotifications().find(
    (notification) =>
      notification.recipient_user_id === input.recipientUserId &&
      notification.actor_user_id === (input.actorUserId ?? null) &&
      notification.related_pod_id === (input.relatedPodId ?? null) &&
      notification.type === input.type &&
      isRecentOrUnread(notification),
  );
}

async function findSupabaseDuplicate(input: CreateUserNotificationInput) {
  const client = getSupabaseBrowserClient();
  let query = client
    .from("user_notifications")
    .select("*")
    .eq("recipient_user_id", input.recipientUserId)
    .eq("type", input.type)
    .order("created_at", { ascending: false })
    .limit(20);

  query = input.actorUserId ? query.eq("actor_user_id", input.actorUserId) : query.is("actor_user_id", null);
  query = input.relatedPodId ? query.eq("related_pod_id", input.relatedPodId) : query.is("related_pod_id", null);

  const result = await query;
  if (result.error) throw result.error;

  return (result.data ?? []).find((notification) => isRecentOrUnread(notification)) ?? null;
}

export async function createUserNotification(input: CreateUserNotificationInput) {
  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("user_notifications")
      .insert({
        recipient_user_id: input.recipientUserId,
        actor_user_id: input.actorUserId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        related_pod_id: input.relatedPodId ?? null,
        related_url: input.relatedUrl ?? null,
        metadata: sanitizeNotificationMetadata(input.metadata),
      })
      .select("*")
      .maybeSingle();

    if (result.error) throw result.error;
    emitUpdatesChanged();
    return { ok: true, notification: result.data, source: "supabase" as const };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod notification write failed", error);
    }

    const notification = localNotificationFromInput(input);
    writeLocalNotifications([notification, ...readLocalNotifications()]);
    emitUpdatesChanged();
    return { ok: true, notification, source: "mock" as const };
  }
}

export async function createUserNotificationOnce(input: CreateUserNotificationInput) {
  const dedupeKey = notificationDedupeKey(input);
  const metadata = {
    ...(input.metadata ?? {}),
    dedupeKey,
  };
  const dedupedInput = {
    ...input,
    metadata,
  };

  try {
    const existing = await findSupabaseDuplicate(dedupedInput);
    if (existing) {
      return { ok: true, notification: existing, source: "supabase" as const, deduped: true };
    }

    const result = await createUserNotification(dedupedInput);
    return { ...result, deduped: false };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod notification dedupe check failed", error);
    }

    const existing = findLocalDuplicate(dedupedInput);
    if (existing) {
      return { ok: true, notification: existing, source: "mock" as const, deduped: true };
    }

    const notification = localNotificationFromInput(dedupedInput);
    writeLocalNotifications([notification, ...readLocalNotifications()]);
    emitUpdatesChanged();
    return { ok: true, notification, source: "mock" as const, deduped: false };
  }
}

export async function listUserNotifications(userId: string) {
  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("user_notifications")
      .select("*")
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (result.error) throw result.error;
    return { source: "supabase" as const, notifications: result.data ?? [], fallbackNote: null };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod notification list failed", error);
    }

    return {
      source: "mock" as const,
      notifications: readLocalNotifications().filter((notification) => notification.recipient_user_id === userId),
      fallbackNote: "Supabase notifications are unavailable; showing local demo notifications.",
    };
  }
}

export async function markNotificationRead(notificationId: string) {
  const readAt = nowIso();

  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("user_notifications")
      .update({ read_at: readAt })
      .eq("id", notificationId);

    if (result.error) throw result.error;
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod notification read failed", error);
    }

    writeLocalNotifications(
      readLocalNotifications().map((notification) =>
        notification.id === notificationId ? { ...notification, read_at: readAt } : notification,
      ),
    );
  }

  emitUpdatesChanged();
}

export async function markAllNotificationsRead(userId: string) {
  const readAt = nowIso();

  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("user_notifications")
      .update({ read_at: readAt })
      .eq("recipient_user_id", userId)
      .is("read_at", null);

    if (result.error) throw result.error;
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod mark all notifications read failed", error);
    }

    writeLocalNotifications(
      readLocalNotifications().map((notification) =>
        notification.recipient_user_id === userId && !notification.read_at
          ? { ...notification, read_at: readAt }
          : notification,
      ),
    );
  }

  emitUpdatesChanged();
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const client = getSupabaseBrowserClient();
    const result = await client
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .is("read_at", null);

    if (result.error) throw result.error;
    return result.count ?? 0;
  } catch {
    return readLocalNotifications().filter((notification) => notification.recipient_user_id === userId && !notification.read_at).length;
  }
}
