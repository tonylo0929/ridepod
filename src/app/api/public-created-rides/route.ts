import { NextResponse, type NextRequest } from "next/server";
import {
  homeRideToPublicCreatedPodInsert,
  isUuid,
  publicCreatedRideLifecycleState,
  type PublicCreatedRidePod,
} from "@/lib/public-created-rides";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { HomeRide } from "@/lib/home-ride-mock";

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

export async function GET() {
  try {
    const client = getSupabaseAdminClient();
    const result = await client
      .from("pods")
      .select(selectPublicCreatedRideColumns)
      .eq("lifecycle_state", publicCreatedRideLifecycleState)
      .order("created_at", { ascending: false })
      .limit(100);

    if (result.error) throw result.error;

    const pods = (result.data ?? []) as unknown as PublicCreatedRidePod[];
    const podIds = pods.map((pod) => pod.id).filter(Boolean);
    const activeMemberUserIdsByPod = new Map<string, string[]>();

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

    return noStoreJson({
      pods: pods.map((pod) => {
        const activeMemberUserIds = Array.from(new Set(activeMemberUserIdsByPod.get(pod.id) ?? []));
        return {
          ...pod,
          active_member_count: activeMemberUserIds.length,
          active_member_user_ids: activeMemberUserIds,
        } satisfies PublicCreatedRidePod;
      }),
    });
  } catch (error) {
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
    console.warn("RidePod public created ride publish failed", error);
    return noStoreJson({ error: "Public created ride publish failed." }, { status: 503 });
  }
}
