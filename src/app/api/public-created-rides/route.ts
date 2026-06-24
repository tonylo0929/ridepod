import { NextResponse, type NextRequest } from "next/server";
import {
  departureAtFromHomeRide,
  homeRideToPublicCreatedPodInsert,
  isUuid,
  publicCreatedRideLifecycleState,
  type PublicCreatedRidePod,
} from "@/lib/public-created-rides";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { HomeRide } from "@/lib/home-ride-mock";
import type { RidePodProfileRow } from "@/lib/supabase/types";

const selectPublicCreatedRideColumns = [
  "id",
  "host_user_id",
  "pod_type",
  "lifecycle_state",
  "ride_option",
  "route_label",
  "pickup_point",
  "dropoff_point",
  "ideal_pod_size",
  "minimum_locked_guests",
  "booking_fare_cap_cents",
  "current_estimate_cents",
  "currency",
  "departure_at",
  "recurring_days",
  "recurring_pattern",
  "created_at",
  "updated_at",
].join(",");

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

function isMissingAdminConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase admin access is not configured");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHomeRidePayload(value: unknown): value is HomeRide {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.fromLabel === "string" &&
    typeof value.toLabel === "string" &&
    typeof value.dateLabel === "string" &&
    typeof value.timeLabel === "string" &&
    typeof value.seatsTotal === "number"
  );
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

async function findDeletionTargetPod({
  ride,
  rideId,
  userId,
}: {
  ride?: HomeRide | null;
  rideId?: string | null;
  userId: string;
}) {
  const client = getSupabaseAdminClient();

  if (rideId && isUuid(rideId)) {
    const result = await client.from("pods").select("id,host_user_id").eq("id", rideId).maybeSingle();
    if (result.error) throw result.error;
    return result.data as Pick<PublicCreatedRidePod, "id" | "host_user_id"> | null;
  }

  if (!ride) return null;

  const routeLabel = `${ride.fromLabel} -> ${ride.toLabel}`;
  const departureAt = departureAtFromHomeRide(ride);
  let query = client
    .from("pods")
    .select("id,host_user_id")
    .eq("host_user_id", userId)
    .eq("lifecycle_state", publicCreatedRideLifecycleState)
    .eq("route_label", routeLabel)
    .order("created_at", { ascending: false })
    .limit(1);

  query = departureAt ? query.eq("departure_at", departureAt) : query.is("departure_at", null);
  const result = await query.maybeSingle();
  if (result.error) throw result.error;
  return result.data as Pick<PublicCreatedRidePod, "id" | "host_user_id"> | null;
}

export async function GET() {
  let client: ReturnType<typeof getSupabaseAdminClient>;

  try {
    client = getSupabaseAdminClient();
  } catch (error) {
    if (isMissingAdminConfig(error)) {
      return noStoreJson({ pods: [], fallbackNote: "Public created rides are unavailable." });
    }
    throw error;
  }

  try {
    const result = await client
      .from("pods")
      .select(selectPublicCreatedRideColumns)
      .eq("lifecycle_state", publicCreatedRideLifecycleState)
      .order("created_at", { ascending: false })
      .limit(100);

    if (result.error) throw result.error;

    const pods = (result.data ?? []) as unknown as PublicCreatedRidePod[];
    const podIds = pods.map((pod) => pod.id).filter(Boolean);
    const hostUserIds = Array.from(
      new Set(pods.map((pod) => pod.host_user_id).filter((userId): userId is string => Boolean(userId))),
    );
    const activeMemberUserIdsByPod = new Map<string, string[]>();
    const hostDisplayNamesByUserId = new Map<string, string>();

    if (podIds.length > 0) {
      const membersResult = await client
        .from("pod_members")
        .select("pod_id,user_id")
        .in("pod_id", podIds)
        .eq("status", "joined");

      if (membersResult.error) {
        console.warn("RidePod public created ride member counts unavailable", membersResult.error);
      } else {
        for (const member of membersResult.data ?? []) {
          if (!member.pod_id || !member.user_id) continue;
          activeMemberUserIdsByPod.set(member.pod_id, [
            ...(activeMemberUserIdsByPod.get(member.pod_id) ?? []),
            member.user_id,
          ]);
        }
      }
    }

    if (hostUserIds.length > 0) {
      const profilesResult = await client.from("profiles").select("id,display_name").in("id", hostUserIds);
      if (profilesResult.error) {
        console.warn("RidePod public created ride host names unavailable", profilesResult.error);
      } else {
        for (const profile of (profilesResult.data ?? []) as Pick<RidePodProfileRow, "id" | "display_name">[]) {
          const displayName = profile.display_name?.trim();
          if (profile.id && displayName) hostDisplayNamesByUserId.set(profile.id, displayName);
        }
      }
    }

    return noStoreJson({
      pods: pods.map((pod) => {
        const hostUserId = pod.host_user_id?.trim() ?? null;
        const activeMemberUserIds = Array.from(new Set(activeMemberUserIdsByPod.get(pod.id) ?? [])).filter(
          (memberId) => !hostUserId || memberId !== hostUserId,
        );
        return {
          ...pod,
          active_member_count: activeMemberUserIds.length,
          active_member_user_ids: activeMemberUserIds,
          host_display_name: pod.host_user_id ? hostDisplayNamesByUserId.get(pod.host_user_id) ?? null : null,
        } satisfies PublicCreatedRidePod;
      }),
    });
  } catch (error) {
    if (isMissingAdminConfig(error)) {
      return noStoreJson({ pods: [], fallbackNote: "Public created rides are unavailable." });
    }
    console.warn("RidePod public created rides list failed", error);
    return noStoreJson({ pods: [], fallbackNote: "Public created rides are unavailable." }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return noStoreJson({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { ride?: unknown } | null;
    if (!isHomeRidePayload(body?.ride)) {
      return noStoreJson({ error: "Invalid ride payload." }, { status: 400 });
    }

    const client = getSupabaseAdminClient();
    const podId = isUuid(body.ride.id) ? body.ride.id : crypto.randomUUID();
    const existing = await client.from("pods").select("id,host_user_id").eq("id", podId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.host_user_id && existing.data.host_user_id !== userId) {
      return noStoreJson({ error: "Ride ID belongs to another host." }, { status: 409 });
    }

    const insert = homeRideToPublicCreatedPodInsert(body.ride, userId, podId);
    const result = await client
      .from("pods")
      .upsert(insert, { onConflict: "id" })
      .select(selectPublicCreatedRideColumns)
      .maybeSingle();

    if (result.error) throw result.error;
    return noStoreJson({ pod: result.data as unknown as PublicCreatedRidePod | null });
  } catch (error) {
    if (isMissingAdminConfig(error)) {
      return noStoreJson({ error: "Public created rides are not configured." }, { status: 503 });
    }
    console.warn("RidePod public created ride publish failed", error);
    return noStoreJson({ error: "Public created ride publish failed." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return noStoreJson({ error: "Authentication required." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { rideId?: unknown; ride?: unknown } | null;
    const ride = isHomeRidePayload(body?.ride) ? body.ride : null;
    const rideId = typeof body?.rideId === "string" ? body.rideId : ride?.id ?? null;
    if (!rideId && !ride) return noStoreJson({ error: "Invalid ride payload." }, { status: 400 });

    const client = getSupabaseAdminClient();
    const targetPod = await findDeletionTargetPod({ ride, rideId, userId });
    if (!targetPod) return noStoreJson({ deleted: false, podId: null }, { status: 404 });
    if (targetPod.host_user_id !== userId) {
      return noStoreJson({ error: "Only the host can delete this pod." }, { status: 403 });
    }

    const membersResult = await client.from("pod_members").select("user_id").eq("pod_id", targetPod.id).eq("status", "joined");
    if (membersResult.error) throw membersResult.error;
    const activeRiderCount = (membersResult.data ?? []).filter((member) => member.user_id && member.user_id !== userId).length;
    if (activeRiderCount > 0) {
      return noStoreJson({ error: "Cannot delete a pod after riders have joined." }, { status: 409 });
    }

    const memberDelete = await client.from("pod_members").delete().eq("pod_id", targetPod.id);
    if (memberDelete.error) throw memberDelete.error;

    const podDelete = await client.from("pods").delete().eq("id", targetPod.id);
    if (podDelete.error) throw podDelete.error;

    return noStoreJson({ deleted: true, podId: targetPod.id });
  } catch (error) {
    if (isMissingAdminConfig(error)) {
      return noStoreJson({ error: "Public created rides are not configured." }, { status: 503 });
    }
    console.warn("RidePod public created ride delete failed", error);
    return noStoreJson({ error: "Public created ride delete failed." }, { status: 503 });
  }
}
