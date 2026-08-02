import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Json,
  RidePodPodRow,
  RidePodSeatHoldRow,
  RidePodStopRequestRow,
  RidePodUserNotificationRow,
} from "@/lib/supabase/types";

type StopRequestBody = {
  action?: unknown;
  rideId?: unknown;
  stopRequestId?: unknown;
  requestType?: unknown;
  requestedLocation?: unknown;
  requestedCoordinates?: unknown;
  optionalNote?: unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

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

async function getActorDisplayName(input: {
  client: ReturnType<typeof getSupabaseAdminClient>;
  actorUserId: string;
}) {
  const result = await input.client
    .from("profiles")
    .select("display_name,preferred_name,account_name,email")
    .eq("id", input.actorUserId)
    .maybeSingle();

  if (result.error) {
    console.warn("RidePod stop request actor profile lookup failed", result.error);
    return "A rider";
  }

  return (
    result.data?.display_name?.trim() ||
    result.data?.preferred_name?.trim() ||
    result.data?.account_name?.trim() ||
    result.data?.email?.split("@")[0]?.trim() ||
    "A rider"
  );
}

async function getPod(input: { client: ReturnType<typeof getSupabaseAdminClient>; podId: string }) {
  const result = await input.client.from("pods").select("*").eq("id", input.podId).maybeSingle();
  if (result.error) throw result.error;
  return (result.data ?? null) as RidePodPodRow | null;
}

async function getRequest(input: { client: ReturnType<typeof getSupabaseAdminClient>; stopRequestId: string }) {
  const result = await input.client.from("pod_stop_requests").select("*").eq("id", input.stopRequestId).maybeSingle();
  if (result.error) throw result.error;
  return (result.data ?? null) as RidePodStopRequestRow | null;
}

async function getJoinedRiderIds(input: { client: ReturnType<typeof getSupabaseAdminClient>; podId: string }) {
  const result = await input.client
    .from("pod_members")
    .select("user_id")
    .eq("pod_id", input.podId)
    .eq("status", "joined");
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => row.user_id).filter((userId): userId is string => Boolean(userId));
}

async function insertNotifications(input: {
  client: ReturnType<typeof getSupabaseAdminClient>;
  actorUserId: string;
  pod: RidePodPodRow;
  rows: Array<Pick<RidePodUserNotificationRow, "recipient_user_id" | "type" | "title" | "body"> & { metadata?: Json }>;
}) {
  const rows = input.rows
    .filter((row, index, source) => source.findIndex((candidate) => candidate.recipient_user_id === row.recipient_user_id && candidate.title === row.title) === index)
    .map((row) => ({
      recipient_user_id: row.recipient_user_id,
      actor_user_id: input.actorUserId,
      type: row.type,
      title: row.title,
      body: row.body,
      related_pod_id: input.pod.id,
      related_url: `/pods/${input.pod.id}`,
      metadata: {
        route: input.pod.route_label,
        source: "pod_stop_requests",
        ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}),
      },
    }));

  if (!rows.length) return;
  const result = await input.client.from("user_notifications").insert(rows);
  if (result.error) throw result.error;
}

function requestedCoordinatesFromBody(value: unknown): Json | null {
  if (!value || typeof value !== "object") return null;
  const maybe = value as { lat?: unknown; lng?: unknown };
  if (typeof maybe.lat !== "number" || typeof maybe.lng !== "number") return null;
  return { lat: maybe.lat, lng: maybe.lng };
}

function normalizeRpcListResult<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function POST(request: NextRequest) {
  let client: ReturnType<typeof getSupabaseAdminClient>;

  try {
    client = getSupabaseAdminClient();
  } catch (error) {
    if (isMissingAdminConfig(error)) {
      return noStoreJson({ error: "Stop requests are not configured." }, { status: 503 });
    }
    throw error;
  }

  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return noStoreJson({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as StopRequestBody | null;
    const action = typeof body?.action === "string" ? body.action : "";
    if (!["submit", "approve", "decline", "withdraw", "complete_join"].includes(action)) {
      return noStoreJson({ error: "Invalid stop request action." }, { status: 400 });
    }

    const actorName = await getActorDisplayName({ client, actorUserId: userId });

    if (action === "submit") {
      const rideId = typeof body?.rideId === "string" ? body.rideId.trim() : "";
      const requestedLocation = typeof body?.requestedLocation === "string" ? body.requestedLocation.trim() : "";
      if (!uuidPattern.test(rideId) || !requestedLocation) {
        return noStoreJson({ error: "Invalid stop request payload." }, { status: 400 });
      }

      const requestType = typeof body?.requestType === "string" ? body.requestType : "quick_stop";
      const optionalNote = typeof body?.optionalNote === "string" ? body.optionalNote : null;
      const pod = await getPod({ client, podId: rideId });
      if (!pod) return noStoreJson({ error: "Ride not found." }, { status: 404 });

      const result = await client.rpc("ridepod_submit_stop_request", {
        p_ride_id: rideId,
        p_requester_id: userId,
        p_request_type: requestType,
        p_requested_location: requestedLocation,
        p_optional_note: optionalNote,
        p_requested_coordinates: requestedCoordinatesFromBody(body?.requestedCoordinates),
      });
      if (result.error) throw result.error;
      const stopRequest = result.data as RidePodStopRequestRow;

      try {
        await insertNotifications({
          client,
          actorUserId: userId,
          pod,
          rows: [
            ...(pod.host_user_id
              ? [
                  {
                    recipient_user_id: pod.host_user_id,
                    type: "ride_app_action_required",
                    title: "New stop request",
                    body: `${actorName} requested an additional stop for your ${pod.route_label} ride.`,
                    metadata: { action: "route_stop_requested", stopRequestId: stopRequest.id, requestedLocation },
                  },
                ]
              : []),
            {
              recipient_user_id: userId,
              type: "ride_app_details_updated",
              title: "Stop request sent",
              body: "Your stop request was sent. You have not joined yet.",
              metadata: { action: "route_stop_requested", stopRequestId: stopRequest.id, requestedLocation },
            },
          ],
        });
      } catch (error) {
        console.warn("RidePod stop request notification failed", error);
      }

      return noStoreJson({ request: stopRequest });
    }

    const stopRequestId = typeof body?.stopRequestId === "string" ? body.stopRequestId.trim() : "";
    if (!uuidPattern.test(stopRequestId)) {
      return noStoreJson({ error: "Invalid stop request id." }, { status: 400 });
    }

    const existingRequest = await getRequest({ client, stopRequestId });
    if (!existingRequest) return noStoreJson({ error: "Stop request not found." }, { status: 404 });
    const pod = await getPod({ client, podId: existingRequest.ride_id });
    if (!pod) return noStoreJson({ error: "Ride not found." }, { status: 404 });

    if (action === "approve") {
      const result = await client.rpc("ridepod_approve_stop_request", {
        p_stop_request_id: stopRequestId,
        p_reviewer_id: userId,
      });
      if (result.error) {
        const message = result.error.message || "Could not approve this request.";
        if (message.toLowerCase().includes("last available seat")) {
          return noStoreJson({ error: "The last available seat has already been taken." }, { status: 409 });
        }
        throw result.error;
      }
      const approved = normalizeRpcListResult(result.data as { request_row: RidePodStopRequestRow; hold_row: RidePodSeatHoldRow; capacity_available: number }[]);
      if (!approved) return noStoreJson({ error: "Stop request approval failed." }, { status: 500 });

      try {
        const requesterName = await getActorDisplayName({ client, actorUserId: approved.request_row.requester_id });
        await insertNotifications({
          client,
          actorUserId: userId,
          pod,
          rows: [
            {
              recipient_user_id: approved.request_row.requester_id,
              type: "ride_app_action_required",
              title: "Your stop was approved",
              body: "Join within 10 minutes to secure your seat.",
              metadata: { action: "route_request_approved", stopRequestId, holdExpiresAt: approved.hold_row.expires_at },
            },
            {
              recipient_user_id: userId,
              type: "ride_app_details_updated",
              title: "Stop approved",
              body: `You approved ${requesterName}'s stop request. Their seat is held for 10 minutes.`,
              metadata: { action: "route_request_approved", stopRequestId, holdExpiresAt: approved.hold_row.expires_at },
            },
          ],
        });
      } catch (error) {
        console.warn("RidePod stop approval notification failed", error);
      }

      return noStoreJson({ request: approved.request_row, hold: approved.hold_row, capacityAvailable: approved.capacity_available });
    }

    if (action === "decline") {
      const result = await client.rpc("ridepod_decline_stop_request", {
        p_stop_request_id: stopRequestId,
        p_reviewer_id: userId,
      });
      if (result.error) throw result.error;
      const stopRequest = result.data as RidePodStopRequestRow;

      try {
        await insertNotifications({
          client,
          actorUserId: userId,
          pod,
          rows: [
            {
              recipient_user_id: stopRequest.requester_id,
              type: "ride_app_details_updated",
              title: "Stop request declined",
              body: "Your stop request was declined. You have not joined the ride.",
              metadata: { action: "route_request_declined", stopRequestId },
            },
          ],
        });
      } catch (error) {
        console.warn("RidePod stop decline notification failed", error);
      }

      return noStoreJson({ request: stopRequest });
    }

    if (action === "withdraw") {
      const result = await client.rpc("ridepod_withdraw_stop_request", {
        p_stop_request_id: stopRequestId,
        p_requester_id: userId,
      });
      if (result.error) throw result.error;
      const stopRequest = result.data as RidePodStopRequestRow;

      try {
        await insertNotifications({
          client,
          actorUserId: userId,
          pod,
          rows: [
            ...(pod.host_user_id
              ? [
                  {
                    recipient_user_id: pod.host_user_id,
                    type: "ride_app_details_updated",
                    title: "Stop request withdrawn",
                    body: `${actorName} withdrew their stop request for ${pod.route_label}.`,
                    metadata: { action: "route_request_withdrawn", stopRequestId },
                  },
                ]
              : []),
            {
              recipient_user_id: userId,
              type: "ride_app_details_updated",
              title: "Stop request withdrawn",
              body: "Your stop request was withdrawn. No seat was reserved.",
              metadata: { action: "route_request_withdrawn", stopRequestId },
            },
          ],
        });
      } catch (error) {
        console.warn("RidePod stop withdrawal notification failed", error);
      }

      return noStoreJson({ request: stopRequest });
    }

    const result = await client.rpc("ridepod_complete_stop_request_join", {
      p_stop_request_id: stopRequestId,
      p_requester_id: userId,
    });
    if (result.error) {
      const message = result.error.message || "Could not join this ride.";
      if (message.toLowerCase().includes("expired")) {
        return noStoreJson({ error: "Seat hold expired" }, { status: 409 });
      }
      throw result.error;
    }
    const completed = normalizeRpcListResult(result.data as { request_row: RidePodStopRequestRow; hold_row: RidePodSeatHoldRow; membership_row: unknown }[]);
    if (!completed) return noStoreJson({ error: "Join failed." }, { status: 500 });

    try {
      const riderIds = await getJoinedRiderIds({ client, podId: pod.id });
      await insertNotifications({
        client,
        actorUserId: userId,
        pod,
        rows: [
          ...Array.from(new Set([pod.host_user_id, ...riderIds].filter((id): id is string => Boolean(id)))).map((recipientUserId) => ({
            recipient_user_id: recipientUserId,
            type: "pod_joined",
            title: recipientUserId === userId ? "You joined the ride" : "Rider joined with approved stop",
            body:
              recipientUserId === userId
                ? "You joined the ride. Your approved stop has been added."
                : `${actorName} joined ${pod.route_label} with the approved stop.`,
            metadata: { action: "route_request_completed", stopRequestId },
          })),
        ],
      });
    } catch (error) {
      console.warn("RidePod stop completion notification failed", error);
    }

    return noStoreJson({
      request: completed.request_row,
      hold: completed.hold_row,
      membership: completed.membership_row,
    });
  } catch (error) {
    console.error("RidePod stop request action failed", error);
    const message = error instanceof Error ? error.message : "Stop request action failed.";
    return noStoreJson({ error: message }, { status: 500 });
  }
}
