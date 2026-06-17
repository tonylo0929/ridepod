import { NextResponse, type NextRequest } from "next/server";
import type { PodNotificationAudience } from "@/lib/notifications/pod-notification-fanout";
import type { RidePodNotificationType } from "@/lib/notifications/ridepod-notifications";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

type FanoutBody = {
  podId?: unknown;
  actorUserId?: unknown;
  type?: unknown;
  audiences?: unknown;
  title?: unknown;
  body?: unknown;
  selfTitle?: unknown;
  selfBody?: unknown;
  relatedUrl?: unknown;
  metadata?: unknown;
  dedupe?: unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validAudiences = new Set<PodNotificationAudience>(["actor", "host", "members", "riders", "others", "all"]);
const blockedMetadataKeys = new Set([
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

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

function isMissingAdminConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase admin access is not configured");
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function sanitizeMetadata(metadata: unknown): Json {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>)
      .filter(([key]) => !blockedMetadataKeys.has(key))
      .map(([key, value]) => [key, sanitizeValue(value)]),
  ) as Json;
}

function sanitizeValue(value: unknown): Json {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (typeof value === "object") return sanitizeMetadata(value);
  return String(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeAudiences(value: unknown): PodNotificationAudience[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is PodNotificationAudience => validAudiences.has(item))));
}

async function getAuthenticatedUserId(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return null;

  const client = getSupabaseAdminClient();
  const result = await client.auth.getUser(token);
  if (result.error) return null;
  return result.data.user?.id ?? null;
}

function buildRecipients(input: {
  actorUserId: string;
  actorActsAsHost?: boolean;
  audiences: PodNotificationAudience[];
  hostUserId: string | null;
  memberUserIds: string[];
}) {
  const recipients = new Set<string>();
  const participantIds = new Set([
    ...(input.hostUserId ? [input.hostUserId] : []),
    ...input.memberUserIds,
  ]);

  for (const audience of input.audiences) {
    if (audience === "actor") recipients.add(input.actorUserId);
    if (audience === "host" && input.hostUserId) recipients.add(input.hostUserId);
    if (audience === "members" || audience === "riders") {
      input.memberUserIds.forEach((memberUserId) => {
        if (audience === "riders" && memberUserId === input.actorUserId) return;
        if (audience === "members" && input.actorActsAsHost && memberUserId === input.actorUserId) return;
        recipients.add(memberUserId);
      });
    }
    if (audience === "others") {
      participantIds.forEach((participantId) => {
        if (participantId !== input.actorUserId) recipients.add(participantId);
      });
    }
    if (audience === "all") {
      participantIds.forEach((participantId) => recipients.add(participantId));
      recipients.add(input.actorUserId);
    }
  }

  return Array.from(recipients);
}

type ProfileIdentity = {
  id: string;
  account_name: string | null;
  display_name: string | null;
  preferred_name: string | null;
  email: string | null;
};

function identityToken(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9]+/g, "") ?? "";
}

function emailName(value: string | null | undefined) {
  return value?.split("@")[0] ?? null;
}

function profileIdentityTokens(profile: ProfileIdentity | null | undefined) {
  return new Set(
    [profile?.account_name, profile?.display_name, profile?.preferred_name, emailName(profile?.email)]
      .map(identityToken)
      .filter((token) => token && token !== "host" && token !== "newhost" && token !== "you"),
  );
}

function profilesShareIdentity(first: ProfileIdentity | null | undefined, second: ProfileIdentity | null | undefined) {
  const firstTokens = profileIdentityTokens(first);
  if (!firstTokens.size) return false;

  for (const token of profileIdentityTokens(second)) {
    if (firstTokens.has(token)) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  let client: ReturnType<typeof getSupabaseAdminClient>;

  try {
    client = getSupabaseAdminClient();
  } catch (error) {
    if (isMissingAdminConfig(error)) {
      return noStoreJson({ error: "Notification fanout is not configured." }, { status: 503 });
    }
    throw error;
  }

  try {
    const authenticatedUserId = await getAuthenticatedUserId(request);
    if (!authenticatedUserId) return noStoreJson({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as FanoutBody | null;
    const podId = normalizeString(body?.podId);
    const actorUserId = normalizeString(body?.actorUserId);
    const type = normalizeString(body?.type) as RidePodNotificationType;
    const audiences = normalizeAudiences(body?.audiences);
    const title = normalizeString(body?.title);
    const messageBody = normalizeNullableString(body?.body);
    const selfTitle = normalizeNullableString(body?.selfTitle);
    const selfBody = normalizeNullableString(body?.selfBody);
    const relatedUrl = normalizeNullableString(body?.relatedUrl) ?? `/pods/${podId}`;
    const dedupe = body?.dedupe !== false;

    if (!podId || !uuidPattern.test(podId) || !actorUserId || actorUserId !== authenticatedUserId || !type || !title || !audiences.length) {
      return noStoreJson({ error: "Invalid notification fanout payload." }, { status: 400 });
    }

    const [podResult, membersResult] = await Promise.all([
      client.from("pods").select("id,host_user_id").eq("id", podId).maybeSingle(),
      client.from("pod_members").select("user_id,status,member_state").eq("pod_id", podId),
    ]);

    if (podResult.error) throw podResult.error;
    if (membersResult.error) throw membersResult.error;
    if (!podResult.data) return noStoreJson({ error: "Pod not found." }, { status: 404 });

    const memberUserIds = Array.from(
      new Set(
        (membersResult.data ?? [])
          .filter((member) => member.user_id && member.status !== "cancelled" && member.member_state !== "CANCELED")
          .map((member) => member.user_id as string),
      ),
    );
    const hostUserId = podResult.data.host_user_id ?? null;
    const profileIds = Array.from(new Set([actorUserId, hostUserId].filter((value): value is string => Boolean(value))));
    const profilesResult = profileIds.length
      ? await client.from("profiles").select("id,account_name,display_name,preferred_name,email").in("id", profileIds)
      : { data: [], error: null };
    if (profilesResult.error) throw profilesResult.error;
    const profilesById = new Map(((profilesResult.data ?? []) as ProfileIdentity[]).map((profile) => [profile.id, profile]));
    const actorMatchesHostIdentity = Boolean(
      hostUserId &&
        actorUserId !== hostUserId &&
        profilesShareIdentity(profilesById.get(actorUserId), profilesById.get(hostUserId)),
    );
    const actorCanNotify = actorUserId === hostUserId || actorMatchesHostIdentity || memberUserIds.includes(actorUserId);
    if (!actorCanNotify) return noStoreJson({ error: "Not allowed to notify this pod." }, { status: 403 });

    const recipients = buildRecipients({
      actorUserId,
      actorActsAsHost: actorUserId === hostUserId || actorMatchesHostIdentity,
      audiences,
      hostUserId,
      memberUserIds,
    });
    if (!recipients.length) return noStoreJson({ inserted: 0 });

    let existingRecipients = new Set<string>();
    if (dedupe) {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const existingResult = await client
        .from("user_notifications")
        .select("recipient_user_id")
        .in("recipient_user_id", recipients)
        .eq("actor_user_id", actorUserId)
        .eq("related_pod_id", podId)
        .eq("type", type)
        .gte("created_at", since);

      if (existingResult.error) throw existingResult.error;
      existingRecipients = new Set((existingResult.data ?? []).map((notification) => notification.recipient_user_id));
    }

    const metadata = sanitizeMetadata({
      ...(typeof body?.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata) ? body.metadata : {}),
      audience: audiences,
    });
    const rows = recipients
      .filter((recipientUserId) => !existingRecipients.has(recipientUserId))
      .map((recipientUserId) => {
        const isSelf = recipientUserId === actorUserId;
        return {
          recipient_user_id: recipientUserId,
          actor_user_id: actorUserId,
          type,
          title: isSelf ? (selfTitle ?? title) : title,
          body: isSelf ? (selfBody ?? messageBody) : messageBody,
          related_pod_id: podId,
          related_url: relatedUrl,
          metadata,
        };
      });

    if (!rows.length) return noStoreJson({ inserted: 0, deduped: recipients.length });

    const insertResult = await client.from("user_notifications").insert(rows);
    if (insertResult.error) throw insertResult.error;

    return noStoreJson({ inserted: rows.length, deduped: existingRecipients.size });
  } catch (error) {
    console.warn("RidePod pod notification fanout failed", error);
    return noStoreJson({ error: "Notification fanout failed." }, { status: 500 });
  }
}
