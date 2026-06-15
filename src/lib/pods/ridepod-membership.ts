import { getHomeRide } from "@/lib/home-ride-mock";
import { getHostedPods, getPod, getUserPods, type RidePod } from "@/lib/mock-data";
import { notifyPodAudience } from "@/lib/notifications/pod-notification-fanout";
import { createUserNotificationOnce } from "@/lib/notifications/ridepod-notifications";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RidePodMemberRow, RidePodPodRow } from "@/lib/supabase/types";
import { createPodLiveUpdate } from "@/lib/updates/ridepod-live-updates";

export type RidePodMembershipStatus = "joined" | "cancelled" | "waitlisted" | "left";

export type RidePodMembershipInput = {
  podId: string;
  userId: string;
  actorDisplayName?: string | null;
  podTitle?: string | null;
  hostUserId?: string | null;
  relatedUrl?: string | null;
};

export type ListMyPodsInput = {
  userId: string;
  includeCancelled?: boolean;
};

export type RidePodMembershipResult = {
  success: boolean;
  membership: RidePodMemberRow | null;
  warning?: string;
  error?: string;
};

type JoinPodServerResult = {
  membership?: RidePodMemberRow | null;
  pod?: RidePodPodRow | null;
  error?: string;
};

export type MyPodSummary = {
  podId: string;
  title: string;
  routeLabel: string;
  dateTimeLabel: string;
  status: string;
  source: "supabase" | "mock";
  membership?: RidePodMemberRow | null;
};

export type ListMyPodsResult = {
  hosted: MyPodSummary[];
  joined: MyPodSummary[];
  cancelled: MyPodSummary[];
  saved: MyPodSummary[];
  warning?: string;
};

const localMembershipKey = "ridepod:pod-memberships";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDepartureLabel(value: string | null | undefined) {
  if (!value) return "Date/time pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

function isUuid(value: string) {
  return uuidPattern.test(value);
}

function nowIso() {
  return new Date().toISOString();
}

function emitUpdatesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ridepod:updates-changed"));
}

function readLocalMemberships() {
  if (typeof window === "undefined") return inMemoryMemberships;

  try {
    return JSON.parse(window.localStorage.getItem(localMembershipKey) ?? "[]") as RidePodMemberRow[];
  } catch {
    return [];
  }
}

function writeLocalMemberships(memberships: RidePodMemberRow[]) {
  if (typeof window === "undefined") {
    inMemoryMemberships = memberships;
    return;
  }

  window.localStorage.setItem(localMembershipKey, JSON.stringify(memberships));
}

let inMemoryMemberships: RidePodMemberRow[] = [];

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function localMembership(input: RidePodMembershipInput, status: RidePodMembershipStatus): RidePodMemberRow {
  const timestamp = nowIso();

  return {
    id: `local-${input.podId}-${input.userId}`,
    pod_id: input.podId,
    user_id: input.userId,
    role: "guest",
    member_state: status === "cancelled" ? "CANCELED" : "REQUESTED",
    status,
    max_charge_cents: null,
    final_charge_cents: null,
    joined_at: timestamp,
    cancelled_at: status === "cancelled" ? timestamp : null,
    locked_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function isTerminalSupabasePod(pod: Pick<RidePodPodRow, "lifecycle_state">) {
  return ["COMPLETED", "SETTLED", "CLOSED", "CANCELED", "CANCELLED"].includes(pod.lifecycle_state);
}

function isTerminalMockPod(pod: RidePod | null | undefined) {
  if (!pod) return false;
  return pod.status === "completed" || pod.status === "cancelled";
}

function getMockPodSummary(podId: string): Omit<MyPodSummary, "source" | "membership"> {
  const pod = getPod(podId);
  if (pod) {
    return {
      podId: pod.id,
      title: pod.title,
      routeLabel: `${pod.fromLabel} -> ${pod.toLabel}`,
      dateTimeLabel: `${pod.date}, ${pod.time}`,
      status: pod.status,
    };
  }

  const homeRide = getHomeRide(podId);
  if (homeRide) {
    return {
      podId: homeRide.id,
      title: `${homeRide.fromLabel} -> ${homeRide.toLabel}`,
      routeLabel: `${homeRide.fromLabel} -> ${homeRide.toLabel}`,
      dateTimeLabel: `${homeRide.dateLabel}, ${homeRide.timeLabel}`,
      status: homeRide.quoteStatus,
    };
  }

  return {
    podId,
    title: "RidePod",
    routeLabel: "Shared taxi pod",
    dateTimeLabel: "Date/time pending",
    status: "joined",
  };
}

function supabasePodSummary(pod: RidePodPodRow, membership?: RidePodMemberRow | null): MyPodSummary {
  return {
    podId: pod.id,
    title: pod.route_label,
    routeLabel: pod.route_label,
    dateTimeLabel: formatDepartureLabel(pod.departure_at),
    status: pod.lifecycle_state,
    source: "supabase",
    membership,
  };
}

function mockPodSummary(podId: string, membership?: RidePodMemberRow | null): MyPodSummary {
  return {
    ...getMockPodSummary(podId),
    source: "mock",
    membership,
  };
}

function getLocalActiveSeatCount(podId: string) {
  return readLocalMemberships().filter((membership) => membership.pod_id === podId && membership.status === "joined").length;
}

function validateMockJoinable(podId: string) {
  const pod = getPod(podId);
  const homeRide = getHomeRide(podId);

  if (pod && isTerminalMockPod(pod)) return "This pod is no longer joinable.";
  if (homeRide && (homeRide.status === "locked" || homeRide.quoteStatus === "full")) return "Pod full";
  if (homeRide && homeRide.quoteStatus === "ready_for_pickup") return "This pod is no longer joinable.";

  if (pod) {
    const existingMemberIds = new Set(pod.members.map((member) => member.userId));
    const activeLocalSeats = readLocalMemberships().filter(
      (membership) =>
        membership.pod_id === podId &&
        membership.status === "joined" &&
        membership.user_id &&
        !existingMemberIds.has(membership.user_id),
    ).length;

    if (pod.seatsFilled + activeLocalSeats >= pod.seatsTotal) return "Pod full";
    return null;
  }

  if (homeRide && homeRide.seatsUsed + getLocalActiveSeatCount(podId) >= homeRide.seatsTotal) return "Pod full";

  return null;
}

function upsertLocalMembership(input: RidePodMembershipInput, status: RidePodMembershipStatus) {
  const memberships = readLocalMemberships();
  const existing = memberships.find((membership) => membership.pod_id === input.podId && membership.user_id === input.userId);
  const timestamp = nowIso();
  const nextMembership: RidePodMemberRow = existing
    ? {
        ...existing,
        status,
        member_state: status === "cancelled" ? "CANCELED" : "REQUESTED",
        joined_at: status === "joined" ? timestamp : existing.joined_at,
        cancelled_at: status === "cancelled" ? timestamp : null,
        updated_at: timestamp,
      }
    : localMembership(input, status);

  writeLocalMemberships([
    nextMembership,
    ...memberships.filter((membership) => !(membership.pod_id === input.podId && membership.user_id === input.userId)),
  ]);

  return nextMembership;
}

function validateInput(input: RidePodMembershipInput) {
  if (!normalizeText(input.userId)) return "Log in to continue.";
  if (!normalizeText(input.podId)) return "Missing pod.";
  return null;
}

async function getSupabaseMembership(podId: string, userId: string) {
  const client = getSupabaseBrowserClient();
  const result = await client
    .from("pod_members")
    .select("*")
    .eq("pod_id", podId)
    .eq("user_id", userId)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data;
}

async function updatePodMembershipViaServer(input: RidePodMembershipInput, action: "join" | "cancel") {
  const client = getSupabaseBrowserClient();
  const sessionResult = await client.auth.getSession();
  const token = sessionResult.data.session?.access_token;
  if (!token) throw new Error("Authentication required.");

  const response = await fetch("/api/pod-membership", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action,
      podId: input.podId,
    }),
  });

  const payload = (await response.json().catch(() => null)) as JoinPodServerResult | null;
  if (!response.ok) throw new Error(payload?.error ?? `Membership update failed with ${response.status}`);

  return {
    membership: payload?.membership ?? null,
    pod: payload?.pod ?? null,
  };
}

async function joinPodViaServer(input: RidePodMembershipInput) {
  return updatePodMembershipViaServer(input, "join");
}

async function cancelPodViaServer(input: RidePodMembershipInput) {
  return updatePodMembershipViaServer(input, "cancel");
}

async function getSupabasePodJoinState(podId: string) {
  const client = getSupabaseBrowserClient();
  const podResult = await client.from("pods").select("*").eq("id", podId).maybeSingle();
  if (podResult.error) throw podResult.error;
  if (!podResult.data) return { pod: null, activeCount: 0 };

  const membersResult = await client
    .from("pod_members")
    .select("id")
    .eq("pod_id", podId)
    .eq("status", "joined");

  if (membersResult.error) throw membersResult.error;

  return {
    pod: podResult.data,
    activeCount: membersResult.data?.length ?? 0,
  };
}

function shouldUseLocalFallback(input: RidePodMembershipInput) {
  return !isUuid(input.podId) || !isUuid(input.userId);
}

function getMockJoinContext(input: RidePodMembershipInput) {
  const pod = getPod(input.podId);
  const homeRide = getHomeRide(input.podId);

  return {
    hostUserId: input.hostUserId ?? pod?.hostUserId ?? null,
    rideTitle:
      input.podTitle ??
      pod?.title ??
      (homeRide ? `${homeRide.fromLabel} -> ${homeRide.toLabel}` : "this ride"),
  };
}

function getMockCancelContext(input: RidePodMembershipInput) {
  const pod = getPod(input.podId);
  const homeRide = getHomeRide(input.podId);
  const localJoinedMemberIds = readLocalMemberships()
    .filter((membership) => membership.pod_id === input.podId && membership.status === "joined" && membership.user_id)
    .map((membership) => membership.user_id as string);
  const podJoinedMemberIds =
    pod?.members
      .filter((member) => member.attendanceStatus !== "cancelled" && member.role !== "host" && member.role !== "backup_host")
      .map((member) => member.userId) ?? [];

  return {
    hostUserId: input.hostUserId ?? pod?.hostUserId ?? null,
    rideTitle:
      input.podTitle ??
      pod?.title ??
      (homeRide ? `${homeRide.fromLabel} -> ${homeRide.toLabel}` : "this ride"),
    joinedMemberIds: Array.from(new Set([...podJoinedMemberIds, ...localJoinedMemberIds])),
  };
}

async function getSupabaseCancelContext(input: RidePodMembershipInput) {
  const { pod } = await getSupabasePodJoinState(input.podId);
  const client = getSupabaseBrowserClient();
  let joinedMemberIds: string[] = [];

  try {
    const memberResult = await client
      .from("pod_members")
      .select("user_id")
      .eq("pod_id", input.podId)
      .eq("status", "joined");

    if (memberResult.error) throw memberResult.error;
    joinedMemberIds = Array.from(
      new Set((memberResult.data ?? []).map((member) => member.user_id).filter(Boolean) as string[]),
    );
  } catch (error) {
    console.warn("RidePod joined member list unavailable for cancel notification", error);
  }

  return {
    pod,
    joinedMemberIds,
  };
}

async function publishJoinSideEffects(input: RidePodMembershipInput, pod?: RidePodPodRow | null) {
  const hostUserId = input.hostUserId ?? pod?.host_user_id ?? getMockJoinContext(input).hostUserId;
  const rideTitle = input.podTitle ?? pod?.route_label ?? getMockJoinContext(input).rideTitle;
  const actorName = normalizeText(input.actorDisplayName) || "Someone";
  const relatedUrl = input.relatedUrl ?? `/pods/${input.podId}`;
  const tasks: Promise<unknown>[] = [
    createPodLiveUpdate({
      podId: input.podId,
      userId: input.userId,
      updateType: "joined",
      message: "Joined the ride",
    }),
  ];

  tasks.push(
    notifyPodAudience({
      podId: input.podId,
      actorUserId: input.userId,
      actorDisplayName: actorName,
      type: "pod_joined",
      audiences: ["actor", "others"],
      selfTitle: "You joined this ride",
      selfBody: `${rideTitle} is now in your rides.`,
      title: "New rider joined",
      body: `${actorName} joined ${rideTitle}.`,
      relatedUrl,
      metadata: {
        action: "pod_joined",
        route: rideTitle,
      },
      fallbackRecipientUserIds: hostUserId && hostUserId !== input.userId ? [hostUserId] : [],
    }),
  );

  await Promise.allSettled(tasks);
  emitUpdatesChanged();
}

async function publishCancelSideEffects(input: RidePodMembershipInput, context?: {
  pod?: RidePodPodRow | null;
  joinedMemberIds?: string[];
}) {
  try {
    const mockContext = getMockCancelContext(input);
    const hostUserId = input.hostUserId ?? context?.pod?.host_user_id ?? mockContext.hostUserId;
    const rideTitle = input.podTitle ?? context?.pod?.route_label ?? mockContext.rideTitle;
    const actorName = normalizeText(input.actorDisplayName) || "Someone";
    const relatedUrl = input.relatedUrl ?? `/pods/${input.podId}`;
    const joinedMemberIds = context?.joinedMemberIds ?? mockContext.joinedMemberIds;
    const memberRecipientIds = joinedMemberIds.filter(
      (memberId) => memberId !== input.userId && memberId !== hostUserId,
    );
    const tasks: Promise<unknown>[] = [
      createPodLiveUpdate({
        podId: input.podId,
        userId: input.userId,
        updateType: "attendance_cancelled",
        message: "Can’t make it",
      }),
    ];

    tasks.push(
      notifyPodAudience({
        podId: input.podId,
        actorUserId: input.userId,
        actorDisplayName: actorName,
        type: "attendance_cancelled",
        audiences: ["actor", "others"],
        selfTitle: "You cancelled this ride",
        selfBody: `${rideTitle} was removed from your active rides.`,
        title: "Rider cancelled attendance",
        body: `${actorName} can’t make it to ${rideTitle}.`,
        relatedUrl,
        metadata: {
          action: "attendance_cancelled",
          route: rideTitle,
        },
        fallbackRecipientUserIds: [
          ...(hostUserId && hostUserId !== input.userId ? [hostUserId] : []),
          ...memberRecipientIds,
        ],
      }),
    );

    if (hostUserId && hostUserId !== input.userId) {
      tasks.push(
        createUserNotificationOnce({
          recipientUserId: hostUserId,
          actorUserId: input.userId,
          type: "attendance_cancelled",
          title: "Guest cancelled attendance",
          body: `${actorName} can’t make it to ${rideTitle}.`,
          relatedPodId: input.podId,
          relatedUrl,
        }),
      );
    }

    for (const memberId of memberRecipientIds) {
      tasks.push(
        createUserNotificationOnce({
          recipientUserId: memberId,
          actorUserId: input.userId,
          type: "attendance_changed",
          title: "Ride attendance changed",
          body: `${actorName} can’t make it.`,
          relatedPodId: input.podId,
          relatedUrl: `/pods/${input.podId}/chat`,
        }),
      );
    }

    await Promise.allSettled(tasks);
  } catch (error) {
    console.warn("RidePod cancel attendance side effects failed", error);
  } finally {
    emitUpdatesChanged();
  }
}

export async function joinPod(input: RidePodMembershipInput): Promise<RidePodMembershipResult> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, membership: null, error: validationError };

  if (shouldUseLocalFallback(input)) {
    const mockJoinError = validateMockJoinable(input.podId);
    if (mockJoinError) return { success: false, membership: null, error: mockJoinError };

    const existing = readLocalMemberships().find(
      (membership) => membership.pod_id === input.podId && membership.user_id === input.userId,
    );
    if (existing?.status === "joined") {
      return { success: true, membership: existing, warning: "Using local mock membership." };
    }

    const membership = upsertLocalMembership(input, "joined");
    await publishJoinSideEffects(input);

    return {
      success: true,
      membership,
      warning: "Using local mock membership.",
    };
  }

  try {
    const serverJoin = await joinPodViaServer(input);
    await publishJoinSideEffects(input, serverJoin.pod);
    return { success: true, membership: serverJoin.membership };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod server join failed", error);
    }
  }

  try {
    const existing = await getSupabaseMembership(input.podId, input.userId);
    if (existing?.status === "joined") return { success: true, membership: existing };

    const { pod, activeCount } = await getSupabasePodJoinState(input.podId);
    if (!pod) return { success: false, membership: null, error: "This pod is no longer joinable." };
    if (isTerminalSupabasePod(pod)) return { success: false, membership: null, error: "This pod is no longer joinable." };
    if (activeCount >= pod.ideal_pod_size) return { success: false, membership: null, error: "Pod full" };

    const client = getSupabaseBrowserClient();
    const timestamp = nowIso();

    if (existing?.status === "cancelled") {
      const result = await client
        .from("pod_members")
        .update({
          status: "joined",
          member_state: "REQUESTED",
          joined_at: timestamp,
          cancelled_at: null,
          updated_at: timestamp,
        })
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();

      if (result.error) throw result.error;
      await publishJoinSideEffects(input, pod);
      return { success: true, membership: result.data };
    }

    const result = await client
      .from("pod_members")
      .insert({
        pod_id: input.podId,
        user_id: input.userId,
        role: "guest",
        member_state: "REQUESTED",
        status: "joined",
        joined_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select("*")
      .maybeSingle();

    if (result.error) throw result.error;
    await publishJoinSideEffects(input, pod);
    return { success: true, membership: result.data };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod join pod persistence failed", error);
    }

    const mockJoinError = validateMockJoinable(input.podId);
    if (mockJoinError) return { success: false, membership: null, error: mockJoinError };

    const membership = upsertLocalMembership(input, "joined");
    await publishJoinSideEffects(input);

    return {
      success: true,
      membership,
      warning: "Supabase membership is unavailable; using local mock membership.",
    };
  }
}

export async function cancelPodAttendance(input: RidePodMembershipInput): Promise<RidePodMembershipResult> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, membership: null, error: validationError };

  if (shouldUseLocalFallback(input)) {
    const pod = getPod(input.podId);
    const homeRide = getHomeRide(input.podId);
    if (isTerminalMockPod(pod) || homeRide?.pickupStatus === "RIDE_STARTED") {
      return { success: false, membership: null, error: "This pod is no longer joinable." };
    }

    const existing = readLocalMemberships().find(
      (membership) => membership.pod_id === input.podId && membership.user_id === input.userId,
    );
    if (!existing || existing.status !== "joined") {
      if (homeRide?.currentUserJoined === true || homeRide?.quoteStatus === "joined") {
        const membership = upsertLocalMembership(input, "cancelled");
        await publishCancelSideEffects(input);

        return {
          success: true,
          membership,
          warning: "Using local mock membership.",
        };
      }

      return { success: false, membership: existing ?? null, error: "No joined membership found." };
    }

    const membership = upsertLocalMembership(input, "cancelled");
    await publishCancelSideEffects(input);

    return {
      success: true,
      membership,
      warning: "Using local mock membership.",
    };
  }

  try {
    const serverCancel = await cancelPodViaServer(input);
    await publishCancelSideEffects(input, { pod: serverCancel.pod });
    return { success: true, membership: serverCancel.membership };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod server cancel failed", error);
    }
  }

  try {
    const existing = await getSupabaseMembership(input.podId, input.userId);
    if (!existing || existing.status !== "joined") {
      return { success: false, membership: existing ?? null, error: "No joined membership found." };
    }

    const cancelContext = await getSupabaseCancelContext(input);
    const { pod } = cancelContext;
    if (!pod || isTerminalSupabasePod(pod)) {
      return { success: false, membership: existing, error: "This pod is no longer joinable." };
    }

    const timestamp = nowIso();
    const result = await getSupabaseBrowserClient()
      .from("pod_members")
      .update({
        status: "cancelled",
        member_state: "CANCELED",
        cancelled_at: timestamp,
        updated_at: timestamp,
      })
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();

    if (result.error) throw result.error;
    await publishCancelSideEffects(input, cancelContext);
    return { success: true, membership: result.data };
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod cancel attendance persistence failed", error);
    }

    const existing = readLocalMemberships().find(
      (membership) => membership.pod_id === input.podId && membership.user_id === input.userId,
    );
    if (!existing || existing.status !== "joined") {
      return { success: false, membership: existing ?? null, error: "No joined membership found." };
    }

    const membership = upsertLocalMembership(input, "cancelled");
    await publishCancelSideEffects(input);

    return {
      success: true,
      membership,
      warning: "Supabase membership is unavailable; using local mock membership.",
    };
  }
}

async function listSupabaseMyPods(userId: string, includeCancelled = false): Promise<ListMyPodsResult> {
  const client = getSupabaseBrowserClient();
  const [hostedResult, membershipResult] = await Promise.all([
    client.from("pods").select("*").eq("host_user_id", userId),
    client
      .from("pod_members")
      .select("*")
      .eq("user_id", userId)
      .in("status", includeCancelled ? ["joined", "cancelled"] : ["joined"]),
  ]);

  if (hostedResult.error) throw hostedResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const memberships = membershipResult.data ?? [];
  const podIds = Array.from(new Set(memberships.map((membership) => membership.pod_id).filter(Boolean) as string[]));
  const podsResult = podIds.length ? await client.from("pods").select("*").in("id", podIds) : { data: [], error: null };
  if (podsResult.error) throw podsResult.error;

  const podsById = new Map((podsResult.data ?? []).map((pod) => [pod.id, pod]));

  return {
    hosted: (hostedResult.data ?? []).map((pod) => supabasePodSummary(pod)),
    joined: memberships
      .filter((membership) => membership.status === "joined" && membership.pod_id)
      .map((membership) => {
        const pod = podsById.get(membership.pod_id as string);
        return pod ? supabasePodSummary(pod, membership) : mockPodSummary(membership.pod_id as string, membership);
      }),
    cancelled: memberships
      .filter((membership) => membership.status === "cancelled" && membership.pod_id)
      .map((membership) => {
        const pod = podsById.get(membership.pod_id as string);
        return pod ? supabasePodSummary(pod, membership) : mockPodSummary(membership.pod_id as string, membership);
      }),
    saved: [],
  };
}

function listMockMyPods(userId: string, includeCancelled = false): ListMyPodsResult {
  const localMemberships = readLocalMemberships().filter((membership) => membership.user_id === userId);
  const hosted = getHostedPods(userId).map((pod) => mockPodSummary(pod.id));
  const existingJoinedPodIds = new Set(getUserPods(userId).map((pod) => pod.id));
  const joinedFromMock = getUserPods(userId).map((pod) => mockPodSummary(pod.id));
  const joinedFromLocal = localMemberships
    .filter((membership) => membership.status === "joined" && membership.pod_id && !existingJoinedPodIds.has(membership.pod_id))
    .map((membership) => mockPodSummary(membership.pod_id as string, membership));
  const cancelled = includeCancelled
    ? localMemberships
        .filter((membership) => membership.status === "cancelled" && membership.pod_id)
        .map((membership) => mockPodSummary(membership.pod_id as string, membership))
    : [];

  return {
    hosted,
    joined: [...joinedFromMock, ...joinedFromLocal],
    cancelled,
    saved: [],
    warning: "Using local mock membership.",
  };
}

export async function listMyPods(input: ListMyPodsInput): Promise<ListMyPodsResult> {
  if (!normalizeText(input.userId)) {
    return { hosted: [], joined: [], cancelled: [], saved: [], warning: "Log in to view My Pods." };
  }

  if (!isUuid(input.userId)) return listMockMyPods(input.userId, input.includeCancelled);

  try {
    return await listSupabaseMyPods(input.userId, input.includeCancelled);
  } catch (error) {
    if (!isMissingSupabaseConfig(error)) {
      console.warn("RidePod list My Pods failed", error);
    }

    return {
      ...listMockMyPods(input.userId, input.includeCancelled),
      warning: "Supabase membership is unavailable; using local mock membership.",
    };
  }
}
