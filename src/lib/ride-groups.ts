"use client";

import { useEffect, useMemo, useState } from "react";

export type RideCallRideType = "ride_app" | "taxi" | "either";
export type RideCallStatus = "open" | "ready_to_convert" | "converted" | "cancelled" | "expired";
export type RideCallInterestStatus = "interested" | "invited_to_pod" | "declined" | "expired" | "converted";
export type DraftRidePodRideType = "ride_app" | "taxi";
export type DraftRidePodStatus =
  | "draft"
  | "collecting_confirmations"
  | "confirmed"
  | "booked"
  | "completed"
  | "cancelled";
export type DraftRidePodRiderStatus =
  | "invited"
  | "pending_confirmation"
  | "pending_payment"
  | "locked"
  | "expired"
  | "declined"
  | "cancelled"
  | "completed"
  | "no_show";
export type DraftRidePodPaymentStatus = "pending" | "authorized" | "failed";

export type RideGroup = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  type: "event" | "route" | "place";
  fromLabel: string;
  isPublic: boolean;
  isVerified: boolean;
  memberCountLabel: string;
};

export type RideCall = {
  id: string;
  groupId: string;
  createdBy: string;
  creatorName: string;
  creatorInitials: string;
  creatorAvatarTone: string;
  title: string;
  fromLabel: string;
  toLabel: string;
  approximateTimeLabel: string;
  targetPeopleCount: number;
  note: string;
  rideType: RideCallRideType;
  status: RideCallStatus;
  convertedPodId?: string | null;
  createdAt: string;
  expiresAt: string;
};

export type RideCallInterest = {
  id: string;
  rideCallId: string;
  userId: string;
  userName: string;
  userInitials: string;
  avatarTone: string;
  status: RideCallInterestStatus;
  createdAt: string;
  updatedAt: string;
};

export type DraftRidePod = {
  id: string;
  sourceRideCallId: string;
  rideGroupId: string;
  fromLabel: string;
  toLabel: string;
  approximateTimeLabel: string;
  rideType: DraftRidePodRideType;
  status: DraftRidePodStatus;
  targetSeats: number;
  minimumLockedRiders: number;
  createdBy: string;
  createdAt: string;
  confirmationDeadlineAt: string;
};

export type DraftRidePodRider = {
  id: string;
  podId: string;
  userId: string;
  userName: string;
  userInitials: string;
  avatarTone: string;
  status: DraftRidePodRiderStatus;
  paymentStatus: DraftRidePodPaymentStatus;
  invitedFromRideCallInterestId: string;
  confirmationExpiresAt: string;
  lockedAt?: string | null;
};

export type RideGroupsState = {
  groups: RideGroup[];
  rideCalls: RideCall[];
  interests: RideCallInterest[];
  draftPods: DraftRidePod[];
  draftPodRiders: DraftRidePodRider[];
};

export type RideGroupViewer = {
  id: string;
  name: string;
  initials: string;
  avatarTone: string;
};

export type CreateRideCallInput = {
  groupId: string;
  toLabel: string;
  fromLabel: string;
  approximateTimeLabel: string;
  targetPeopleCount: number;
  rideType: RideCallRideType;
  note: string;
};

const storageKey = "ridepod-ride-groups-state-v1";
const updateEventName = "ridepod-ride-groups-state-updated";

const defaultGroupId = "group-coldplay-concert";
export const defaultRideGroupSlug = "coldplay-concert";
export const demoRideCallId = "call-coldplay-tuen-mun";

const defaultCreatedAt = "2026-06-23T13:05:00.000Z";
const defaultExpiresAt = "2026-06-24T13:05:00.000Z";

const defaultGroups: RideGroup[] = [
  {
    id: defaultGroupId,
    slug: defaultRideGroupSlug,
    name: "Coldplay Concert",
    subtitle: "After-Show Rides",
    description: "Find people leaving AsiaWorld-Expo after the show.",
    type: "event",
    fromLabel: "Coldplay Concert",
    isPublic: true,
    isVerified: true,
    memberCountLabel: "834 members",
  },
];

const defaultRideCalls: RideCall[] = [
  {
    id: demoRideCallId,
    groupId: defaultGroupId,
    createdBy: "demo-tony",
    creatorName: "Tony",
    creatorInitials: "T",
    creatorAvatarTone: "from-sky-300 to-cyan-500",
    title: "To Tuen Mun",
    fromLabel: "AsiaWorld-Expo",
    toLabel: "Tuen Mun",
    approximateTimeLabel: "After concert - ~11:15 PM",
    targetPeopleCount: 4,
    note: "Let's split taxi or Uber back to Tuen Mun together.",
    rideType: "either",
    status: "open",
    convertedPodId: null,
    createdAt: defaultCreatedAt,
    expiresAt: defaultExpiresAt,
  },
  {
    id: "call-coldplay-shatin",
    groupId: defaultGroupId,
    createdBy: "demo-chloe",
    creatorName: "Chloe",
    creatorInitials: "C",
    creatorAvatarTone: "from-pink-200 to-rose-400",
    title: "To Shatin",
    fromLabel: "AsiaWorld-Expo",
    toLabel: "Shatin",
    approximateTimeLabel: "After concert - ~11:20 PM",
    targetPeopleCount: 4,
    note: "Looking for a few people to split a ride toward Shatin.",
    rideType: "either",
    status: "open",
    convertedPodId: null,
    createdAt: "2026-06-23T13:02:00.000Z",
    expiresAt: defaultExpiresAt,
  },
  {
    id: "call-coldplay-central",
    groupId: defaultGroupId,
    createdBy: "demo-ken",
    creatorName: "Ken",
    creatorInitials: "K",
    creatorAvatarTone: "from-teal-200 to-blue-500",
    title: "To Central",
    fromLabel: "AsiaWorld-Expo",
    toLabel: "Central",
    approximateTimeLabel: "After concert - ~11:10 PM",
    targetPeopleCount: 4,
    note: "Heading back to Central after the concert.",
    rideType: "ride_app",
    status: "open",
    convertedPodId: null,
    createdAt: "2026-06-23T12:58:00.000Z",
    expiresAt: defaultExpiresAt,
  },
];

const defaultInterests: RideCallInterest[] = [
  createDefaultInterest("interest-tony-tuen-mun", demoRideCallId, "demo-tony", "Tony", "T", "from-sky-300 to-cyan-500"),
  createDefaultInterest("interest-maya-tuen-mun", demoRideCallId, "demo-maya", "Maya", "M", "from-violet-200 to-fuchsia-500"),
  createDefaultInterest("interest-andre-tuen-mun", demoRideCallId, "demo-andre", "Andre", "A", "from-amber-200 to-orange-500"),
  createDefaultInterest("interest-chloe-shatin", "call-coldplay-shatin", "demo-chloe", "Chloe", "C", "from-pink-200 to-rose-400"),
  createDefaultInterest("interest-nora-shatin", "call-coldplay-shatin", "demo-nora", "Nora", "N", "from-emerald-200 to-green-500"),
  createDefaultInterest("interest-ken-central", "call-coldplay-central", "demo-ken", "Ken", "K", "from-teal-200 to-blue-500"),
];

export const defaultRideGroupsState: RideGroupsState = {
  groups: defaultGroups,
  rideCalls: defaultRideCalls,
  interests: defaultInterests,
  draftPods: [],
  draftPodRiders: [],
};

function createDefaultInterest(
  id: string,
  rideCallId: string,
  userId: string,
  userName: string,
  userInitials: string,
  avatarTone: string,
): RideCallInterest {
  return {
    id,
    rideCallId,
    userId,
    userName,
    userInitials,
    avatarTone,
    status: "interested",
    createdAt: defaultCreatedAt,
    updatedAt: defaultCreatedAt,
  };
}

function cloneDefaultState(): RideGroupsState {
  return JSON.parse(JSON.stringify(defaultRideGroupsState)) as RideGroupsState;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function addMinutesIso(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function isState(value: unknown): value is RideGroupsState {
  const state = value as Partial<RideGroupsState>;
  return Boolean(
    state &&
      Array.isArray(state.groups) &&
      Array.isArray(state.rideCalls) &&
      Array.isArray(state.interests) &&
      Array.isArray(state.draftPods) &&
      Array.isArray(state.draftPodRiders),
  );
}

export function readRideGroupsState(): RideGroupsState {
  if (typeof window === "undefined") return cloneDefaultState();

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    if (isState(stored)) {
      return {
        ...cloneDefaultState(),
        ...stored,
        groups: mergeById(defaultGroups, stored.groups),
        rideCalls: mergeById(defaultRideCalls, stored.rideCalls),
        interests: mergeById(defaultInterests, stored.interests),
      };
    }
  } catch {
    return cloneDefaultState();
  }

  return cloneDefaultState();
}

export function writeRideGroupsState(state: RideGroupsState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(state));
  window.dispatchEvent(new Event(updateEventName));
}

function mergeById<T extends { id: string }>(defaults: T[], stored: T[]) {
  const storedIds = new Set(stored.map((item) => item.id));
  return [...stored, ...defaults.filter((item) => !storedIds.has(item.id))];
}

function activeInterestsForCall(state: RideGroupsState, rideCallId: string) {
  return state.interests.filter(
    (interest) =>
      interest.rideCallId === rideCallId &&
      ["interested", "invited_to_pod", "converted"].includes(interest.status),
  );
}

function normalizeRideCallStatus(state: RideGroupsState, rideCall: RideCall): RideCall {
  if (rideCall.status === "converted" || rideCall.status === "cancelled" || rideCall.status === "expired") {
    return rideCall;
  }

  const interestCount = activeInterestsForCall(state, rideCall.id).length;
  if (interestCount >= rideCall.targetPeopleCount) {
    return { ...rideCall, status: "ready_to_convert" };
  }

  return { ...rideCall, status: "open" };
}

export function getRideGroupBySlug(state: RideGroupsState, slug: string) {
  return state.groups.find((group) => group.slug === slug) ?? null;
}

export function getRideCallById(state: RideGroupsState, id: string) {
  const rideCall = state.rideCalls.find((item) => item.id === id) ?? null;
  return rideCall ? normalizeRideCallStatus(state, rideCall) : null;
}

export function getDraftRidePodById(state: RideGroupsState, id: string) {
  return state.draftPods.find((item) => item.id === id) ?? null;
}

export function getRideCallInterests(state: RideGroupsState, rideCallId: string) {
  return activeInterestsForCall(state, rideCallId);
}

export function getDraftRidePodRiders(state: RideGroupsState, podId: string) {
  return state.draftPodRiders.filter((rider) => rider.podId === podId);
}

export function getLockedDraftRidePodRiders(state: RideGroupsState, podId: string) {
  return getDraftRidePodRiders(state, podId).filter((rider) => rider.status === "locked");
}

export function getViewerInterest(state: RideGroupsState, rideCallId: string, viewerId?: string | null) {
  if (!viewerId) return null;
  return state.interests.find(
    (interest) =>
      interest.rideCallId === rideCallId &&
      interest.userId === viewerId &&
      ["interested", "invited_to_pod", "converted"].includes(interest.status),
  ) ?? null;
}

export function getViewerDraftPodRider(state: RideGroupsState, podId: string, viewerId?: string | null) {
  if (!viewerId) return null;
  return state.draftPodRiders.find((rider) => rider.podId === podId && rider.userId === viewerId) ?? null;
}

export function getRideCallsForGroup(state: RideGroupsState, groupId: string) {
  return state.rideCalls
    .filter((rideCall) => rideCall.groupId === groupId)
    .map((rideCall) => normalizeRideCallStatus(state, rideCall));
}

export function getDraftPodInvitationCards(state: RideGroupsState, viewerId?: string | null) {
  if (!viewerId) return [];

  return state.draftPodRiders
    .filter((rider) => rider.userId === viewerId && ["invited", "pending_confirmation", "pending_payment", "locked"].includes(rider.status))
    .flatMap((rider) => {
      const pod = getDraftRidePodById(state, rider.podId);
      const group = pod ? state.groups.find((item) => item.id === pod.rideGroupId) ?? null : null;
      const lockedCount = pod ? getLockedDraftRidePodRiders(state, pod.id).length : 0;

      return pod
        ? [
            {
              rider,
              pod,
              group,
              lockedCount,
              href: `/pods/${pod.id}/confirm`,
            },
          ]
        : [];
    });
}

export function rideTypeLabel(rideType: RideCallRideType | DraftRidePodRideType) {
  if (rideType === "ride_app") return "Ride app";
  if (rideType === "taxi") return "Taxi";
  return "Split taxi / Uber";
}

export function finalDraftRideType(rideType: RideCallRideType): DraftRidePodRideType {
  return rideType === "ride_app" ? "ride_app" : "taxi";
}

export function useRideGroupsState() {
  const [state, setState] = useState<RideGroupsState>(() => readRideGroupsState());

  useEffect(() => {
    function sync() {
      setState(readRideGroupsState());
    }

    window.addEventListener(updateEventName, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(updateEventName, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const actions = useMemo(
    () => ({
      createRideCall(input: CreateRideCallInput, viewer: RideGroupViewer) {
        const stateBefore = readRideGroupsState();
        const createdAt = nowIso();
        const rideCall: RideCall = {
          id: createId("call"),
          groupId: input.groupId,
          createdBy: viewer.id,
          creatorName: viewer.name,
          creatorInitials: viewer.initials,
          creatorAvatarTone: viewer.avatarTone,
          title: `To ${input.toLabel.trim()}`,
          fromLabel: input.fromLabel.trim() || "Ride Group",
          toLabel: input.toLabel.trim(),
          approximateTimeLabel: input.approximateTimeLabel.trim(),
          targetPeopleCount: input.targetPeopleCount,
          note: input.note.trim() || `Looking for people going to ${input.toLabel.trim()}.`,
          rideType: input.rideType,
          status: input.targetPeopleCount <= 1 ? "ready_to_convert" : "open",
          convertedPodId: null,
          createdAt,
          expiresAt: addMinutesIso(60 * 24),
        };
        const interest: RideCallInterest = {
          id: createId("interest"),
          rideCallId: rideCall.id,
          userId: viewer.id,
          userName: viewer.name,
          userInitials: viewer.initials,
          avatarTone: viewer.avatarTone,
          status: "interested",
          createdAt,
          updatedAt: createdAt,
        };
        const next = {
          ...stateBefore,
          rideCalls: [rideCall, ...stateBefore.rideCalls],
          interests: [interest, ...stateBefore.interests],
        };
        writeRideGroupsState(next);
        return rideCall;
      },
      setInterest(rideCallId: string, viewer: RideGroupViewer, interested: boolean) {
        const stateBefore = readRideGroupsState();
        const rideCall = getRideCallById(stateBefore, rideCallId);
        if (!rideCall || ["converted", "cancelled", "expired"].includes(rideCall.status)) return null;

        const existing = stateBefore.interests.find(
          (interest) => interest.rideCallId === rideCallId && interest.userId === viewer.id,
        );
        const updatedAt = nowIso();
        const nextInterests: RideCallInterest[] = existing
          ? stateBefore.interests.map<RideCallInterest>((interest) =>
              interest.id === existing.id
                ? {
                    ...interest,
                    userName: viewer.name,
                    userInitials: viewer.initials,
                    avatarTone: viewer.avatarTone,
                    status: interested ? "interested" : "declined",
                    updatedAt,
                  }
                : interest,
            )
          : [
              {
                id: createId("interest"),
                rideCallId,
                userId: viewer.id,
                userName: viewer.name,
                userInitials: viewer.initials,
                avatarTone: viewer.avatarTone,
                status: "interested",
                createdAt: updatedAt,
                updatedAt,
              } satisfies RideCallInterest,
              ...stateBefore.interests,
            ];

        const nextBeforeStatus = { ...stateBefore, interests: nextInterests };
        const nextRideCalls = stateBefore.rideCalls.map((item) =>
          item.id === rideCallId ? normalizeRideCallStatus(nextBeforeStatus, item) : item,
        );
        const next = { ...nextBeforeStatus, rideCalls: nextRideCalls };
        writeRideGroupsState(next);
        return getRideCallById(next, rideCallId);
      },
      convertRideCallToDraftPod(rideCallId: string) {
        const stateBefore = readRideGroupsState();
        const rideCall = getRideCallById(stateBefore, rideCallId);
        if (!rideCall) return null;
        if (rideCall.convertedPodId) return getDraftRidePodById(stateBefore, rideCall.convertedPodId);

        const activeInterests = getRideCallInterests(stateBefore, rideCall.id);
        if (!activeInterests.length) return null;

        const createdAt = nowIso();
        const confirmationDeadlineAt = addMinutesIso(10);
        const pod: DraftRidePod = {
          id: createId("draft-pod"),
          sourceRideCallId: rideCall.id,
          rideGroupId: rideCall.groupId,
          fromLabel: stateBefore.groups.find((group) => group.id === rideCall.groupId)?.name ?? rideCall.fromLabel,
          toLabel: rideCall.toLabel,
          approximateTimeLabel: rideCall.approximateTimeLabel.replace("After concert - ", ""),
          rideType: finalDraftRideType(rideCall.rideType),
          status: "collecting_confirmations",
          targetSeats: rideCall.targetPeopleCount,
          minimumLockedRiders: Math.min(2, rideCall.targetPeopleCount),
          createdBy: rideCall.createdBy,
          createdAt,
          confirmationDeadlineAt,
        };
        const riders: DraftRidePodRider[] = activeInterests.map((interest) => ({
          id: createId("draft-rider"),
          podId: pod.id,
          userId: interest.userId,
          userName: interest.userName,
          userInitials: interest.userInitials,
          avatarTone: interest.avatarTone,
          status: "invited",
          paymentStatus: "pending",
          invitedFromRideCallInterestId: interest.id,
          confirmationExpiresAt: confirmationDeadlineAt,
          lockedAt: null,
        }));
        const next: RideGroupsState = {
          ...stateBefore,
          rideCalls: stateBefore.rideCalls.map((item) =>
            item.id === rideCall.id ? { ...item, status: "converted", convertedPodId: pod.id } : item,
          ),
          interests: stateBefore.interests.map((interest) =>
            interest.rideCallId === rideCall.id && ["interested", "invited_to_pod"].includes(interest.status)
              ? { ...interest, status: "invited_to_pod", updatedAt: createdAt }
              : interest,
          ),
          draftPods: [pod, ...stateBefore.draftPods],
          draftPodRiders: [...riders, ...stateBefore.draftPodRiders],
        };
        writeRideGroupsState(next);
        return pod;
      },
      confirmDraftPodSeat(podId: string, viewer: RideGroupViewer) {
        const stateBefore = readRideGroupsState();
        const pod = getDraftRidePodById(stateBefore, podId);
        if (!pod) return null;

        const existing = getViewerDraftPodRider(stateBefore, podId, viewer.id);
        if (!existing) return null;

        const lockedAt = nowIso();
        const nextRiders = stateBefore.draftPodRiders.map<DraftRidePodRider>((rider) =>
          rider.id === existing.id
            ? {
                ...rider,
                userName: viewer.name,
                userInitials: viewer.initials,
                avatarTone: viewer.avatarTone,
                status: "locked",
                paymentStatus: "authorized",
                lockedAt,
              }
            : rider,
        );
        const lockedCount = nextRiders.filter((rider) => rider.podId === podId && rider.status === "locked").length;
        const nextPods = stateBefore.draftPods.map<DraftRidePod>((item) =>
          item.id === podId
            ? {
                ...item,
                status: lockedCount >= item.targetSeats ? "confirmed" : "collecting_confirmations",
              }
            : item,
        );
        const next = { ...stateBefore, draftPods: nextPods, draftPodRiders: nextRiders };
        writeRideGroupsState(next);
        return getViewerDraftPodRider(next, podId, viewer.id);
      },
    }),
    [],
  );

  return { state, ...actions };
}
