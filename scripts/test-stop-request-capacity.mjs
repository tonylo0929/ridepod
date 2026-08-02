import assert from "node:assert/strict";
import {
  activeHolds,
  approveStopRequest,
  availableSeats,
  completeStopJoin,
  createStopRequestCapacityState,
  directJoin,
  expireHolds,
  submitStopRequest,
} from "../src/lib/stop-request-capacity.ts";

{
  const state = createStopRequestCapacityState({ capacity: 4, joined: ["r1", "r2", "r3"] });
  const requestId = submitStopRequest(state, "pending-rider", "stop-a");
  assert.equal(state.joined.size, 3);
  assert.equal(availableSeats(state), 1);
  assert.equal(state.joined.has("pending-rider"), false);
  assert.equal(state.requests.get(requestId).status, "pending");
}

{
  const state = createStopRequestCapacityState({ capacity: 4, joined: ["r1", "r2", "r3"] });
  const requestId = submitStopRequest(state, "pending-rider", "stop-a");
  assert.equal(directJoin(state, "direct-rider"), true);
  assert.equal(state.joined.size, 4);
  assert.equal(state.joined.has("pending-rider"), false);
  assert.equal(state.requests.get(requestId).status, "pending");
}

{
  const state = createStopRequestCapacityState({ capacity: 4, joined: ["r1", "r2", "r3", "r4"] });
  const requestId = submitStopRequest(state, "pending-rider", "stop-a");
  assert.deepEqual(approveStopRequest(state, requestId), { ok: false, error: "full" });
  assert.equal(activeHolds(state).length, 0);
  assert.equal(state.requests.get(requestId).status, "pending_capacity_blocked");
}

{
  const state = createStopRequestCapacityState({ capacity: 4, joined: ["r1", "r2", "r3"] });
  const requestId = submitStopRequest(state, "pending-rider", "stop-a");
  assert.equal(approveStopRequest(state, requestId).ok, true);
  assert.equal(activeHolds(state).length, 1);
  assert.equal(availableSeats(state), 0);
  assert.equal(state.joined.has("pending-rider"), false);
  assert.equal(state.routeStops.has("stop-a"), false);
}

{
  const state = createStopRequestCapacityState({ capacity: 4, joined: ["r1", "r2", "r3"] });
  const requestId = submitStopRequest(state, "pending-rider", "stop-a");
  approveStopRequest(state, requestId);
  assert.equal(completeStopJoin(state, requestId), true);
  assert.equal(state.joined.size, 4);
  assert.equal(state.routeStops.has("stop-a"), true);
  assert.equal(activeHolds(state).length, 0);
  assert.equal(state.requests.get(requestId).status, "joined");
}

{
  const state = createStopRequestCapacityState({ capacity: 4, joined: ["r1", "r2", "r3"] });
  const requestId = submitStopRequest(state, "pending-rider", "stop-a");
  approveStopRequest(state, requestId);
  state.now = 10 * 60 * 1000 + 1;
  expireHolds(state);
  assert.equal(availableSeats(state), 1);
  assert.equal(state.joined.has("pending-rider"), false);
  assert.equal(state.routeStops.has("stop-a"), false);
  assert.equal(state.requests.get(requestId).status, "approval_expired");
}

{
  const state = createStopRequestCapacityState({ capacity: 4, joined: ["r1", "r2", "r3"] });
  const first = submitStopRequest(state, "first-rider", "stop-a");
  const second = submitStopRequest(state, "second-rider", "stop-b");
  assert.equal(approveStopRequest(state, first).ok, true);
  assert.deepEqual(approveStopRequest(state, second), { ok: false, error: "full" });
  assert.equal(activeHolds(state).length, 1);
  assert.equal(availableSeats(state), 0);
}

{
  const state = createStopRequestCapacityState({ capacity: 4, joined: ["r1", "r2", "r3"] });
  const requestId = submitStopRequest(state, "pending-rider", "stop-a");
  assert.equal(submitStopRequest(state, "pending-rider", "stop-a"), requestId);
  approveStopRequest(state, requestId);
  approveStopRequest(state, requestId);
  completeStopJoin(state, requestId);
  completeStopJoin(state, requestId);
  assert.equal(state.joined.size, 4);
  assert.equal(state.routeStops.size, 1);
  assert.equal(activeHolds(state).length, 0);
}

console.log("Stop request capacity tests passed.");
