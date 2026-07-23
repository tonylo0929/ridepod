import { useSyncExternalStore } from "react";

export type RidePodMembershipTier = "free" | "plus" | "organizer_plus";
export type RidePodMembershipStatus = "inactive" | "active" | "coming_soon";

export type RidePodMembershipState = {
  membershipTier: RidePodMembershipTier;
  membershipStatus: RidePodMembershipStatus;
  plusActivated: boolean;
  plusSince?: string;
  monthlyJoinFeeWaiversRemaining: number;
  monthlyJoinFeeWaiversTotal: number;
};

export type RidePodMembershipTierInfo = {
  id: RidePodMembershipTier;
  label: string;
  description: string;
  status?: "Coming soon";
  benefits: string[];
};

export const ridePodPlusBenefits = [
  "5 monthly HK$5 FareEnough fee waivers",
  "Saved routes",
  "Quick-create from saved route",
  "Recurring ride templates",
  "Advanced ride filters",
  "Plus badge",
];

export const organizerPlusBenefits = [
  "More active pods",
  "Co-host tools",
  "Booking detail templates",
  "Host analytics",
  "Priority manual review",
];

export const ridePodMembershipTiers: RidePodMembershipTierInfo[] = [
  {
    id: "free",
    label: "Free",
    description: "Create and join shared taxi pods.",
    benefits: ["Create shared taxi pods", "Join shared taxi pods"],
  },
  {
    id: "plus",
    label: "FareEnough Plus",
    description: "Extra tools for frequent shared rides.",
    benefits: ridePodPlusBenefits,
  },
  {
    id: "organizer_plus",
    label: "Organizer Plus",
    description: "Advanced host tools for recurring and larger pods.",
    status: "Coming soon",
    benefits: organizerPlusBenefits,
  },
];

export const freeMembershipState: RidePodMembershipState = {
  membershipTier: "free",
  membershipStatus: "inactive",
  plusActivated: false,
  monthlyJoinFeeWaiversRemaining: 0,
  monthlyJoinFeeWaiversTotal: 0,
};

export const plusMembershipState: RidePodMembershipState = {
  membershipTier: "plus",
  membershipStatus: "active",
  plusActivated: true,
  plusSince: "2026-06-01",
  monthlyJoinFeeWaiversRemaining: 5,
  monthlyJoinFeeWaiversTotal: 5,
};

export const ridePodJoinFeeWaiverCopy = {
  appliesTo: "HK$5 FareEnough join fee",
  excludes: "Ride fare and taxi partner quotes are not included.",
  demoNote: "No live payment is charged.",
};

const membershipStorageKey = "ridepod:membership";
const membershipChangeEvent = "ridepod:membership-change";

let cachedRawMembershipState: string | null = null;
let cachedMembershipState: RidePodMembershipState = freeMembershipState;

function normalizeMembershipState(value: Partial<RidePodMembershipState> | null | undefined): RidePodMembershipState {
  if (value?.membershipTier === "plus" && value.plusActivated === true) {
    return {
      ...plusMembershipState,
      ...value,
      membershipTier: "plus",
      membershipStatus: "active",
      plusActivated: true,
      monthlyJoinFeeWaiversRemaining: Math.max(0, value.monthlyJoinFeeWaiversRemaining ?? 5),
      monthlyJoinFeeWaiversTotal: Math.max(0, value.monthlyJoinFeeWaiversTotal ?? 5),
    };
  }

  if (value?.membershipTier === "organizer_plus") {
    return {
      ...freeMembershipState,
      ...value,
      membershipTier: "organizer_plus",
      membershipStatus: "coming_soon",
      plusActivated: false,
      monthlyJoinFeeWaiversRemaining: 0,
      monthlyJoinFeeWaiversTotal: 0,
    };
  }

  return freeMembershipState;
}

export function getRidePodMembershipState(): RidePodMembershipState {
  if (typeof window === "undefined") return freeMembershipState;

  try {
    const rawState = window.localStorage.getItem(membershipStorageKey);
    if (!rawState) {
      cachedRawMembershipState = null;
      cachedMembershipState = freeMembershipState;
      return cachedMembershipState;
    }

    if (rawState === cachedRawMembershipState) return cachedMembershipState;

    cachedRawMembershipState = rawState;
    cachedMembershipState = normalizeMembershipState(JSON.parse(rawState) as Partial<RidePodMembershipState>);
    return cachedMembershipState;
  } catch {
    cachedRawMembershipState = null;
    cachedMembershipState = freeMembershipState;
    return cachedMembershipState;
  }
}

export function setRidePodMembershipState(state: RidePodMembershipState) {
  if (typeof window === "undefined") return;

  const normalizedState = normalizeMembershipState(state);
  window.localStorage.setItem(membershipStorageKey, JSON.stringify(normalizedState));
  window.dispatchEvent(new Event(membershipChangeEvent));
}

export function activateMockRidePodPlus() {
  setRidePodMembershipState({
    ...plusMembershipState,
    plusSince: new Date().toISOString().slice(0, 10),
  });
}

export function isRidePodPlusActive(state: RidePodMembershipState) {
  return state.membershipTier === "plus" && state.membershipStatus === "active" && state.plusActivated;
}

export function hasRidePodPlusJoinFeeWaiver(state: RidePodMembershipState) {
  return isRidePodPlusActive(state) && state.monthlyJoinFeeWaiversRemaining > 0;
}

export function consumeRidePodPlusJoinFeeWaiver() {
  const currentState = getRidePodMembershipState();
  if (!hasRidePodPlusJoinFeeWaiver(currentState)) return currentState;

  const nextState = {
    ...currentState,
    monthlyJoinFeeWaiversRemaining: Math.max(0, currentState.monthlyJoinFeeWaiversRemaining - 1),
  };

  setRidePodMembershipState(nextState);
  return nextState;
}

export function resetMockRidePodMembership() {
  setRidePodMembershipState(freeMembershipState);
}

export function getMembershipTierInfo(tier: RidePodMembershipTier) {
  return ridePodMembershipTiers.find((item) => item.id === tier) ?? ridePodMembershipTiers[0];
}

function subscribeMembership(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", listener);
  window.addEventListener(membershipChangeEvent, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(membershipChangeEvent, listener);
  };
}

export function useRidePodMembershipState() {
  return useSyncExternalStore(
    subscribeMembership,
    getRidePodMembershipState,
    () => freeMembershipState,
  );
}
