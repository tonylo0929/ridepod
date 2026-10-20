import test from "node:test";
import assert from "node:assert/strict";
import {
  departureAt,
  generatePost,
  normalizeFlight,
  sampleJourneys,
  validateAirportTiming,
} from "../src/app/v2-preview/data.ts";

const today = "2026-10-20";
const arrival = sampleJourneys(today)[0];

test("sample arrival, airport exit and planned car departure remain distinct", () => {
  assert.equal(arrival.scheduledFlightAt, `${today}T20:50`);
  assert.equal(arrival.airportReadyAt, `${today}T21:30`);
  assert.equal(departureAt(arrival), `${today}T21:50`);
  assert.equal(validateAirportTiming(arrival), "");
});
test("optional flight numbers never synthesize a schedule", () => {
  const noFlight = sampleJourneys(today).find(
    (j) => j.direction === "from_airport" && !j.flight,
  );
  assert.ok(noFlight);
  assert.equal(noFlight.scheduledFlightAt, undefined);
  assert.equal(validateAirportTiming(noFlight), "");
  const generated = generatePost(noFlight, today);
  assert.doesNotMatch(generated.title, /CX|undefined|null/);
});
test("arrival timing rejects car departure before exit or exit before landing", () => {
  assert.match(
    validateAirportTiming({ ...arrival, time: "21:00" }),
    /夾車出發時間/,
  );
  assert.match(
    validateAirportTiming({ ...arrival, scheduledFlightAt: `${today}T21:40` }),
    /預計出閘時間/,
  );
});
test("Hong Kong date-times support overnight flights without comparing clock alone", () => {
  assert.equal(
    validateAirportTiming({
      ...arrival,
      scheduledFlightAt: "2026-10-19T23:50",
      airportReadyAt: `${today}T00:40`,
      time: "01:00",
    }),
    "",
  );
  assert.match(
    validateAirportTiming({
      ...arrival,
      airportReadyAt: "2026-10-21T00:40",
      time: "23:50",
    }),
    /夾車出發時間/,
  );
});
test("to-airport departure precedes scheduled takeoff", () => {
  const journey = {
    ...arrival,
    direction: "to_airport",
    airportReadyAt: undefined,
    time: "07:00",
    scheduledFlightAt: `${today}T10:00`,
  };
  assert.equal(validateAirportTiming(journey), "");
  assert.match(
    validateAirportTiming({ ...journey, time: "11:00" }),
    /預定起飛之前/,
  );
});
test("generated Cantonese copy preserves the entered flight and each passenger timing", () => {
  const generated = generatePost({ ...arrival, flight: "cx 734" }, today);
  assert.match(generated.title, /CX734/);
  assert.match(generated.description, /21:30.*出閘.*21:50.*夾車出發/);
  assert.equal(normalizeFlight(" cx 734 "), "CX734");
  assert.equal(normalizeFlight(" "), "");
});
