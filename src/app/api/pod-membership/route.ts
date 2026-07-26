import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RidePodMemberRow, RidePodPodRow } from "@/lib/supabase/types";

type MembershipBody = {
  action?: unknown;
  podId?: unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

async function getAuthenticatedUserId(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return null;

  const client = getSupabaseAdminClient();
  const result = await client.auth.getUser(token);
  if (result.error) return null;
  return result.data.user?.id ?? null;
}

function isTerminalPod(pod: Pick<RidePodPodRow, "lifecycle_state">) {
  return ["COMPLETED", "SETTLED", "CLOSED", "CANCELED", "CANCELLED"].includes(pod.lifecycle_state);
}

async function getJoinedMemberUserIds(input: {
  client: ReturnType<typeof getSupabaseAdminClient>;
  podId: string;
}) {
  const result = await input.client
    .from("pod_members")
    .select("user_id")
    .eq("pod_id", input.podId)
    .eq("status", "joined");

  if (result.error) throw result.error;

  return Array.from(
    new Set((result.data ?? []).map((member) => member.user_id).filter((userId): userId is string => Boolean(userId))),
  );
}

async function notifyMembershipAudience(input: {
  client: ReturnType<typeof getSupabaseAdminClient>;
  pod: RidePodPodRow;
  actorUserId: string;
  memberUserIds: string[];
  action: "joined" | "left";
}) {
  const recipients = Array.from(
    new Set([
      input.pod.host_user_id,
      ...input.memberUserIds,
    ].filter((userId): userId is string => Boolean(userId && userId !== input.actorUserId))),
  );

  if (!recipients.length) return;

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const notificationType = input.action === "joined" ? "pod_joined" : "pod_member_left";
  const existingResult = await input.client
    .from("user_notifications")
    .select("recipient_user_id")
    .in("recipient_user_id", recipients)
    .eq("actor_user_id", input.actorUserId)
    .eq("related_pod_id", input.pod.id)
    .eq("type", notificationType)
    .gte("created_at", since)
    .limit(recipients.length);

  if (existingResult.error) throw existingResult.error;
  const existingRecipients = new Set((existingResult.data ?? []).map((notification) => notification.recipient_user_id));
  const title = input.action === "joined" ? "Rider joined this ride" : "Rider left this ride";
  const body = input.action === "joined" ? `A rider joined ${input.pod.route_label}.` : `A rider left ${input.pod.route_label}.`;
  const metadataAction = input.action === "joined" ? "pod_joined" : "pod_member_left";
  const rows = recipients
    .filter((recipientUserId) => !existingRecipients.has(recipientUserId))
    .map((recipientUserId) => ({
      recipient_user_id: recipientUserId,
      actor_user_id: input.actorUserId,
      type: notificationType,
      title,
      body,
      related_pod_id: input.pod.id,
      related_url: `/pods/${input.pod.id}`,
      metadata: {
        action: metadataAction,
        route: input.pod.route_label,
        source: "pod_membership",
      },
    }));

  if (!rows.length) return;

  const insertResult = await input.client.from("user_notifications").insert(rows);

  if (insertResult.error) throw insertResult.error;
}

export async function POST(request: NextRequest) {
  let client: ReturnType<typeof getSupabaseAdminClient>;

  try {
    client = getSupabaseAdminClient();
  } catch (error) {
    if (isMissingAdminConfig(error)) {
      return noStoreJson({ error: "Pod membership is not configured." }, { status: 503 });
    }
    throw error;
  }

  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return noStoreJson({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as MembershipBody | null;
    const action = typeof body?.action === "string" ? body.action : "";
    const podId = typeof body?.podId === "string" ? body.podId.trim() : "";

    if ((action !== "join" && action !== "cancel") || !uuidPattern.test(podId)) {
      return noStoreJson({ error: "Invalid membership payload." }, { status: 400 });
    }

    const podResult = await client.from("pods").select("*").eq("id", podId).maybeSingle();
    if (podResult.error) throw podResult.error;
    if (!podResult.data) return noStoreJson({ error: "Pod not found." }, { status: 404 });
    if (isTerminalPod(podResult.data)) return noStoreJson({ error: "This pod is no longer joinable." }, { status: 409 });
    if (action === "join" && podResult.data.host_user_id === userId) {
      return noStoreJson({ error: "Host cannot join their own pod." }, { status: 409 });
    }

    const existingResult = await client
      .from("pod_members")
      .select("*")
      .eq("pod_id", podId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existingResult.error) throw existingResult.error;
    const joinedMemberUserIdsBeforeAction = await getJoinedMemberUserIds({ client, podId });

    if (action === "cancel") {
      if (!existingResult.data || existingResult.data.status !== "joined") {
        return noStoreJson({ error: "No joined membership found." }, { status: 404 });
      }

      const timestamp = new Date().toISOString();
      const result = await client
        .from("pod_members")
        .update({
          status: "cancelled",
          member_state: "CANCELED",
          cancelled_at: timestamp,
          updated_at: timestamp,
        })
        .eq("id", existingResult.data.id)
        .select("*")
        .maybeSingle();

      if (result.error) throw result.error;
      await notifyMembershipAudience({
        client,
        pod: podResult.data as RidePodPodRow,
        actorUserId: userId,
        memberUserIds: joinedMemberUserIdsBeforeAction,
        action: "left",
      });
      return noStoreJson({ membership: result.data as RidePodMemberRow | null, pod: podResult.data as RidePodPodRow });
    }

    if (existingResult.data?.status === "joined") {
      return noStoreJson({ membership: existingResult.data as RidePodMemberRow, pod: podResult.data as RidePodPodRow });
    }

    const activeRiderCount = joinedMemberUserIdsBeforeAction.length;
    const riderCapacity = Math.max(0, (podResult.data.ideal_pod_size || 1) - 1);
    if (activeRiderCount >= riderCapacity) return noStoreJson({ error: "Pod full" }, { status: 409 });

    const timestamp = new Date().toISOString();
    const payload = {
      pod_id: podId,
      user_id: userId,
      role: "guest",
      member_state: "REQUESTED",
      status: "joined",
      joined_at: timestamp,
      cancelled_at: null,
      updated_at: timestamp,
    };

    const result = existingResult.data
      ? await client
          .from("pod_members")
          .update(payload)
          .eq("id", existingResult.data.id)
          .select("*")
          .maybeSingle()
      : await client
          .from("pod_members")
          .insert({
            ...payload,
            created_at: timestamp,
          })
          .select("*")
          .maybeSingle();

    if (result.error) throw result.error;
    await notifyMembershipAudience({
      client,
      pod: podResult.data as RidePodPodRow,
      actorUserId: userId,
      memberUserIds: [...joinedMemberUserIdsBeforeAction, userId],
      action: "joined",
    });
    return noStoreJson({ membership: result.data as RidePodMemberRow | null, pod: podResult.data as RidePodPodRow });
  } catch (error) {
    console.warn("RidePod membership join failed", error);
    return noStoreJson({ error: "Pod membership join failed." }, { status: 500 });
  }
}
