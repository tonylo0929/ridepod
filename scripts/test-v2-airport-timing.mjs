import test from "node:test";
import assert from "node:assert/strict";
import {
  departureAt,
  generatePost,
  fullMomentLabel,
  journeyCounts,
  normalizeFlight,
  sampleJourneys,
  validateAirportTiming,
} from "../src/app/v2-preview/data.ts";

const today = "2026-10-21";
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
      scheduledFlightAt: "2026-10-20T23:50",
      airportReadyAt: `${today}T00:40`,
      time: "01:00",
    }),
    "",
  );
  assert.match(
    validateAirportTiming({
      ...arrival,
      airportReadyAt: "2026-10-22T00:40",
      time: "23:50",
    }),
    /夾車出發時間/,
  );
});

test("21 October car departure and 22 October takeoff keep their own dates", () => {
  const outbound = sampleJourneys(today)[2];
  assert.equal(departureAt(outbound), "2026-10-21T21:50");
  assert.equal(outbound.scheduledFlightAt, "2026-10-22T00:17");
  assert.equal(validateAirportTiming(outbound), "");
  assert.equal(fullMomentLabel(departureAt(outbound)), "2026年10月21日 21:50");
  assert.equal(fullMomentLabel(outbound.scheduledFlightAt), "2026年10月22日 00:17");
  assert.match(validateAirportTiming({ ...outbound, scheduledFlightAt: "2026-10-21T00:17" }), /預定起飛之前/);
});

test("arrival extras are optional and missing facts stay out of generated copy", () => {
  const minimal = { ...arrival, airportReadyAt: undefined, scheduledFlightAt: undefined, flight: "", luggage: undefined, wait: undefined };
  assert.equal(validateAirportTiming(minimal), "");
  const copy = generatePost(minimal, today);
  assert.doesNotMatch(copy.description, /出閘|個喼|可以等|undefined|null/);
  assert.match(validateAirportTiming({ ...minimal, scheduledFlightAt: `${today}T22:00` }), /預定抵達之後/);
  const overnight = generatePost({ ...arrival, airportReadyAt: "2026-10-22T00:40", date: "2026-10-22", time: "01:00" }, today);
  assert.match(overnight.description, /2026年10月22日 00:40.*2026年10月22日 01:00/);
  assert.doesNotMatch(overnight.title, /聽日.*落機/);
});

test("host, interest and maximum group size stay independent even beyond capacity", () => {
  assert.deepEqual(journeyCounts({ offeredPlaces: 3, interestCount: 0 }), { host: 1, interested: 0, maxCapacity: 4 });
  assert.deepEqual(journeyCounts({ offeredPlaces: 1, interestCount: 4 }, true), { host: 1, interested: 5, maxCapacity: 2 });
  assert.deepEqual(journeyCounts({ offeredPlaces: 3, interestCount: 0, mine: true }, true), { host: 1, interested: 0, maxCapacity: 4 });
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
