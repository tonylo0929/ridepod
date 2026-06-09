import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const sourcePath = new URL("../src/lib/hkTaxiFare.ts", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

const tempDir = mkdtempSync(join(tmpdir(), "ridepod-hk-taxi-"));
const compiledPath = join(tempDir, "hkTaxiFare.cjs");
writeFileSync(compiledPath, compiled.outputText);

const {
  calculateHkTaxiFareEstimate,
  calculateSuggestedSeatContribution,
  formatHkdRange,
} = await import(pathToFileURL(compiledPath).href);

try {
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "urban", distanceMeters: 1500 }).baseMeterFare, 29);
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "nt", distanceMeters: 1500 }).baseMeterFare, 25.5);
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "lantau", distanceMeters: 1500 }).baseMeterFare, 24);

  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "urban", distanceMeters: 9000, uncertaintyPercent: 0 }).baseMeterFare, 102.5);
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "urban", distanceMeters: 9200, uncertaintyPercent: 0 }).baseMeterFare, 103.9);
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "nt", distanceMeters: 8000, uncertaintyPercent: 0 }).baseMeterFare, 82.5);
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "lantau", distanceMeters: 20000, uncertaintyPercent: 0 }).baseMeterFare, 195);

  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "urban", distanceMeters: 1500, baggageCount: 2 }).surcharges.baggage, 12);
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "urban", distanceMeters: 1500, hasAnimalOrBird: true }).surcharges.animalOrBird, 5);
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "urban", distanceMeters: 1500, hasPhoneBooking: true }).surcharges.phoneBooking, 5);
  assert.equal(calculateHkTaxiFareEstimate({ taxiType: "urban", distanceMeters: 1500, tollAmount: 35 }).surcharges.toll, 35);

  const buffered = calculateHkTaxiFareEstimate({
    taxiType: "urban",
    distanceMeters: 8600,
    baggageCount: 1,
    uncertaintyPercent: 0.15,
  });
  assert.equal(buffered.baseMeterFare, 98.3);
  assert.equal(buffered.lowEstimate, 104.3);
  assert.equal(Number(buffered.highEstimate.toFixed(3)), 119.945);
  assert.equal(buffered.roundedLowEstimate, 105);
  assert.equal(buffered.roundedHighEstimate, 120);

  const fourSeats = calculateSuggestedSeatContribution({
    fareEstimate: buffered,
    seatCount: 4,
    ridePodServiceFeePerSeat: 8,
  });
  const twoSeats = calculateSuggestedSeatContribution({
    fareEstimate: buffered,
    seatCount: 2,
    ridePodServiceFeePerSeat: 8,
  });
  assert.equal(fourSeats.roundedSuggestedLowPerSeat, 34);
  assert.equal(fourSeats.roundedSuggestedHighPerSeat, 38);
  assert.equal(twoSeats.roundedSuggestedLowPerSeat, 61);
  assert.equal(twoSeats.roundedSuggestedHighPerSeat, 68);

  const unavailable = calculateHkTaxiFareEstimate({ taxiType: "urban", distanceMeters: 0 });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.notes[0], "Fare reference unavailable until pickup and dropoff are selected.");

  assert.equal(formatHkdRange(98, 112), "HK$98-112");
  assert.ok(buffered.notes.some((note) => /Reference estimate only/i.test(note)));
  assert.ok(buffered.notes.some((note) => /Final taxi meter fare may vary/i.test(note)));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log("HK taxi fare reference tests passed.");
