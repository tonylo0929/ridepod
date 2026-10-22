import test from "node:test";
import assert from "node:assert/strict";
import { pastDepartureMessage, validateAirportTiming, validateDepartureTime } from "../src/app/v2-preview/data.ts";

const clock = () => Date.parse("2026-10-23T00:06:00+08:00");
const base = { date: "2026-10-23", time: "00:06" };
test("combined Hong Kong departure rejects yesterday and earlier today", () => {
  for (const journey of [{ ...base, date: "2026-10-22", time: "23:59" }, { ...base, time: "00:00" }])
    assert.equal(validateDepartureTime(journey, clock), pastDepartureMessage);
});
test("current-time boundary has no hidden grace period or rounding", () => {
  assert.equal(validateDepartureTime(base, clock), "");
  assert.equal(validateDepartureTime(base, () => clock() - 1), "");
  assert.equal(validateDepartureTime(base, () => clock() + 1), pastDepartureMessage);
});
test("later today, tomorrow and midnight use the full date", () => {
  assert.equal(validateDepartureTime({ ...base, time: "09:00" }, clock), "");
  assert.equal(validateDepartureTime({ ...base, date: "2026-10-24", time: "00:00" }, clock), "");
  assert.equal(validateDepartureTime({ ...base, date: "2026-10-24", time: "00:00" }, () => Date.parse("2026-10-23T23:59:59+08:00")), "");
});
test("flight and airport-exit dates stay independent, with optional flight absent or present", () => {
  const journey = { ...base, rideKind: "airport", direction: "to_airport", time: "23:50", scheduledFlightAt: "2026-10-24T01:00" };
  const before = structuredClone(journey);
  assert.equal(validateDepartureTime(journey, clock), "");
  assert.equal(validateAirportTiming(journey), "");
  assert.equal(validateDepartureTime({ ...journey, scheduledFlightAt: undefined }, clock), "");
  assert.deepEqual(journey, before);
});
test("the clock is read again at publication and input is never changed", () => {
  let now = clock();
  const journey = { ...base, time: "00:07" }, before = structuredClone(journey);
  assert.equal(validateDepartureTime(journey, () => now), "");
  now = Date.parse("2026-10-23T00:07:00.001+08:00");
  assert.equal(validateDepartureTime(journey, () => now), pastDepartureMessage);
  assert.deepEqual(journey, before);
});
