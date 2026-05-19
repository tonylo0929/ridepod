import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  RidePodAdminReviewCaseRow,
  RidePodEventRow,
  RidePodMemberRow,
  RidePodPodRow,
  RidePodProofRow,
  RidePodRideInstanceRow,
  RidePodSettlementItemRow,
  RidePodSettlementRow,
} from "@/lib/supabase/types";

type SupabaseResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export function unwrapSupabaseResult<T>(result: SupabaseResult<T>, operationName: string): T {
  if (result.error) {
    throw new Error(`Failed to ${operationName}: ${result.error.message}`);
  }

  return result.data as T;
}

export async function getMyPods(userId: string): Promise<RidePodPodRow[]> {
  const client = getSupabaseServerClient();
  const hostedPods = await client.from("pods").select("*").eq("host_user_id", userId);
  const memberPods = await client
    .from("pod_members")
    .select("pod_id")
    .eq("user_id", userId);

  const hosted = unwrapSupabaseResult(hostedPods, "load hosted pods");
  const memberships = unwrapSupabaseResult(memberPods, "load member pod memberships");
  const memberPodIds = memberships.map((membership) => membership.pod_id).filter((podId): podId is string => Boolean(podId));
  const memberPodResult = memberPodIds.length
    ? await client.from("pods").select("*").in("id", memberPodIds)
    : { data: [], error: null };
  const memberRows = unwrapSupabaseResult(memberPodResult, "load member pods");
  const byId = new Map<string, RidePodPodRow>();

  for (const pod of hosted) byId.set(pod.id, pod);
  for (const pod of memberRows) byId.set(pod.id, pod);

  return Array.from(byId.values());
}

export async function getRideInstancesForPod(podId: string): Promise<RidePodRideInstanceRow[]> {
  const result = await getSupabaseServerClient()
    .from("ride_instances")
    .select("*")
    .eq("pod_id", podId)
    .order("departure_at", { ascending: true });

  return unwrapSupabaseResult(result, "load ride instances");
}

export async function getPodById(podId: string): Promise<RidePodPodRow | null> {
  const result = await getSupabaseServerClient()
    .from("pods")
    .select("*")
    .eq("id", podId)
    .maybeSingle();

  return unwrapSupabaseResult(result, "load pod");
}

export async function getPodMembersForPod(podId: string): Promise<RidePodMemberRow[]> {
  const result = await getSupabaseServerClient()
    .from("pod_members")
    .select("*")
    .eq("pod_id", podId)
    .order("joined_at", { ascending: true });

  return unwrapSupabaseResult(result, "load pod members");
}

export async function getRideInstanceById(rideInstanceId: string): Promise<RidePodRideInstanceRow | null> {
  const result = await getSupabaseServerClient()
    .from("ride_instances")
    .select("*")
    .eq("id", rideInstanceId)
    .maybeSingle();

  return unwrapSupabaseResult(result, "load ride instance");
}

export async function getProofsForRideInstance(rideInstanceId: string): Promise<RidePodProofRow[]> {
  const result = await getSupabaseServerClient()
    .from("proofs")
    .select("*")
    .eq("ride_instance_id", rideInstanceId)
    .order("submitted_at", { ascending: false });

  return unwrapSupabaseResult(result, "load ride instance proofs");
}

export async function getSettlementForRideInstance(rideInstanceId: string): Promise<RidePodSettlementRow | null> {
  const result = await getSupabaseServerClient()
    .from("settlements")
    .select("*")
    .eq("ride_instance_id", rideInstanceId)
    .maybeSingle();

  return unwrapSupabaseResult(result, "load ride instance settlement");
}

export async function getSettlementItemsForSettlement(settlementId: string): Promise<RidePodSettlementItemRow[]> {
  const result = await getSupabaseServerClient()
    .from("settlement_items")
    .select("*")
    .eq("settlement_id", settlementId)
    .order("created_at", { ascending: true });

  return unwrapSupabaseResult(result, "load settlement items");
}

export async function getAccessibleAdminReviewCasesForRideInstance(
  rideInstanceId: string,
): Promise<RidePodAdminReviewCaseRow[]> {
  const result = await getSupabaseServerClient()
    .from("admin_review_cases")
    .select("*")
    .eq("ride_instance_id", rideInstanceId)
    .order("created_at", { ascending: false });

  return unwrapSupabaseResult(result, "load ride instance admin review cases");
}

export async function getPodEventsForRideInstance(rideInstanceId: string): Promise<RidePodEventRow[]> {
  const result = await getSupabaseServerClient()
    .from("pod_events")
    .select("*")
    .eq("ride_instance_id", rideInstanceId)
    .order("created_at", { ascending: false });

  return unwrapSupabaseResult(result, "load ride instance events");
}

export async function getAdminReviewCases(): Promise<RidePodAdminReviewCaseRow[]> {
  const result = await getSupabaseAdminClient()
    .from("admin_review_cases")
    .select("*")
    .order("created_at", { ascending: false });

  return unwrapSupabaseResult(result, "load admin review cases");
}
