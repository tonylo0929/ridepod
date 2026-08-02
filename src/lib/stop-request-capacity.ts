export type StopRequestCapacityStatus =
  | "pending"
  | "pending_capacity_blocked"
  | "approved_hold_active"
  | "joined"
  | "declined"
  | "withdrawn"
  | "approval_expired"
  | "cancelled_by_host";

export type SeatHoldStatus = "active" | "converted" | "expired" | "released";

export type StopRequestCapacityState = {
  capacity: number;
  joined: Set<string>;
  routeStops: Set<string>;
  requests: Map<string, { riderId: string; stopId: string; status: StopRequestCapacityStatus }>;
  holds: Map<string, { riderId: string; requestId: string; status: SeatHoldStatus; expiresAt: number }>;
  now: number;
};

export function createStopRequestCapacityState(input: {
  capacity: number;
  joined?: string[];
  now?: number;
}): StopRequestCapacityState {
  return {
    capacity: input.capacity,
    joined: new Set(input.joined ?? []),
    routeStops: new Set(),
    requests: new Map(),
    holds: new Map(),
    now: input.now ?? 0,
  };
}

export function activeHolds(state: StopRequestCapacityState) {
  return [...state.holds.entries()].filter(([, hold]) => hold.status === "active" && hold.expiresAt > state.now);
}

export function availableSeats(state: StopRequestCapacityState) {
  return Math.max(0, state.capacity - state.joined.size - activeHolds(state).length);
}

export function submitStopRequest(state: StopRequestCapacityState, riderId: string, stopId: string) {
  const existing = [...state.requests.entries()].find(
    ([, request]) =>
      request.riderId === riderId &&
      ["pending", "pending_capacity_blocked", "approved_hold_active"].includes(request.status),
  );
  if (existing) return existing[0];

  const requestId = `request-${state.requests.size + 1}`;
  state.requests.set(requestId, { riderId, stopId, status: "pending" });
  return requestId;
}

export function directJoin(state: StopRequestCapacityState, riderId: string) {
  if (state.joined.has(riderId)) return true;
  if (availableSeats(state) <= 0) return false;
  state.joined.add(riderId);
  return true;
}

export function approveStopRequest(state: StopRequestCapacityState, requestId: string) {
  const request = state.requests.get(requestId);
  if (!request) return { ok: false, error: "missing" };

  const existingHold = [...state.holds.values()].find(
    (hold) => hold.requestId === requestId && hold.status === "active" && hold.expiresAt > state.now,
  );
  if (existingHold) return { ok: true, holdId: `hold-${requestId}` };

  if (availableSeats(state) <= 0) {
    request.status = "pending_capacity_blocked";
    return { ok: false, error: "full" };
  }

  request.status = "approved_hold_active";
  const holdId = `hold-${requestId}`;
  state.holds.set(holdId, {
    riderId: request.riderId,
    requestId,
    status: "active",
    expiresAt: state.now + 10 * 60 * 1000,
  });
  return { ok: true, holdId };
}

export function expireHolds(state: StopRequestCapacityState) {
  for (const hold of state.holds.values()) {
    if (hold.status === "active" && hold.expiresAt <= state.now) {
      hold.status = "expired";
      const request = state.requests.get(hold.requestId);
      if (request?.status === "approved_hold_active") request.status = "approval_expired";
    }
  }
}

export function completeStopJoin(state: StopRequestCapacityState, requestId: string) {
  expireHolds(state);
  const request = state.requests.get(requestId);
  if (!request) return false;
  const hold = [...state.holds.values()].find(
    (candidate) => candidate.requestId === requestId && candidate.status === "active" && candidate.expiresAt > state.now,
  );
  if (!hold) return false;

  state.joined.add(request.riderId);
  state.routeStops.add(request.stopId);
  hold.status = "converted";
  request.status = "joined";
  return true;
}
