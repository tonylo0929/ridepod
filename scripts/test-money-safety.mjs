import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, join, normalize } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

function resolveTsPath(basePath) {
  const candidates = extname(basePath)
    ? [basePath]
    : [`${basePath}.ts`, `${basePath}.tsx`, join(basePath, "index.ts"), join(basePath, "index.tsx")];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`Cannot resolve module ${basePath}`);

  return normalize(found);
}

function loadTsModule(relativePath) {
  const sourcePath = resolveTsPath(isAbsolute(relativePath) ? relativePath : join(process.cwd(), relativePath));
  const cached = moduleCache.get(sourcePath);
  if (cached) return cached.exports;

  const source = readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const compiledModule = { exports: {} };
  moduleCache.set(sourcePath, compiledModule);

  function localRequire(specifier) {
    if (specifier.startsWith("@/")) {
      return loadTsModule(join("src", specifier.slice(2)));
    }

    if (specifier.startsWith(".")) {
      const targetPath = join(dirname(sourcePath), specifier);
      return loadTsModule(targetPath);
    }

    return require(specifier);
  }

  new Function("exports", "module", "require", compiled.outputText)(
    compiledModule.exports,
    compiledModule,
    localRequire,
  );

  return compiledModule.exports;
}

const moneySafety = loadTsModule("src/lib/money-safety.ts");
const podEligibility = loadTsModule("src/lib/pod-eligibility.ts");
const podJoin = loadTsModule("src/lib/pod-join.ts");
const podBooking = loadTsModule("src/lib/pod-booking.ts");
const podHostReplacement = loadTsModule("src/lib/pod-host-replacement.ts");
const podSettlement = loadTsModule("src/lib/pod-settlement.ts");
const podAdminReview = loadTsModule("src/lib/pod-admin-review.ts");
const podPaymentCapture = loadTsModule("src/lib/pod-payment-capture.ts");
const stripeWebhooks = loadTsModule("src/lib/stripe-webhooks.ts");
const stripeWebhookRoute = loadTsModule("src/app/api/stripe/webhook/route.ts");
const stripeConnect = loadTsModule("src/lib/stripe-connect.ts");
const stripeConnectRoute = loadTsModule("src/app/api/stripe/connect/onboarding/route.ts");
const stripeHostReimbursement = loadTsModule("src/lib/stripe-host-reimbursement.ts");
const stripeRefunds = loadTsModule("src/lib/stripe-refunds.ts");
const paymentReconciliation = loadTsModule("src/lib/payment-reconciliation.ts");
const moneySafetyMock = loadTsModule("src/lib/money-safety-mock.ts");
const stripeConfig = loadTsModule("src/lib/stripe-config.ts");
const paymentProvider = loadTsModule("src/lib/payment-provider.ts");
const stripeSetup = loadTsModule("src/lib/stripe-setup.ts");
const mockData = loadTsModule("src/lib/mock-data.ts");
const podSchedule = loadTsModule("src/lib/pod-schedule.ts");
const moneyProtection = loadTsModule("src/lib/money-protection.ts");
const fareEstimates = loadTsModule("src/lib/fare-estimates.ts");
const joinMoney = loadTsModule("src/lib/join-money.ts");
const proofUpload = loadTsModule("src/lib/uploads/proof-upload.ts");
const supabaseProofMetadata = loadTsModule("src/lib/supabase/proof-metadata.ts");
const publicProfile = loadTsModule("src/lib/public-profile.ts");
const memberSafetyReport = loadTsModule("src/lib/member-safety-report.ts");
const ridePodDemoScenarios = loadTsModule("src/lib/demo/ridepod-demo-scenarios.ts");
const ridePodDemoResetMock = loadTsModule("src/lib/demo/ridepod-demo-reset-mock.ts");

assert.deepEqual(ridePodDemoScenarios.RIDE_POD_DEMO_SCENARIO_IDS, [
  "scheduled_ride_app_quote_needed",
  "scheduled_ride_app_ready_to_book",
  "scheduled_ride_app_receipt_needed",
  "scheduled_taxi_meter_proof_needed",
  "recurring_back_and_forth",
  "settlement_ready",
  "dispute_review",
  "admin_review_queue",
  "profile_eligibility",
  "safety_report",
]);
assert.equal(ridePodDemoScenarios.listRidePodDemoScenarios().length, 10);
assert.equal(
  ridePodDemoScenarios.getRidePodDemoScenario("scheduled_ride_app_quote_needed").title,
  "Scheduled Ride App - Quote Needed",
);
assert.equal(ridePodDemoScenarios.getRidePodDemoScenario("missing_demo_scenario"), null);
assert.ok(
  ridePodDemoScenarios.listRidePodDemoScenarios().every((scenario) =>
    scenario.id &&
    scenario.title &&
    scenario.description &&
    scenario.role &&
    scenario.primaryStatus &&
    scenario.recommendedRoute &&
    scenario.tags.includes("demo") &&
    scenario.tags.includes("closed beta") &&
    scenario.notes
  ),
);
const demoResetKnown = ridePodDemoResetMock.resetRidePodDemoScenarioMock("settlement_ready");
assert.equal(demoResetKnown.success, true);
assert.equal(demoResetKnown.scenario.id, "settlement_ready");
assert.equal(demoResetKnown.routeToOpen, "/pods/usc-lax-001/settlement");
assert.equal(demoResetKnown.message, "Scenario opened with current demo data.");
const demoResetUnknown = ridePodDemoResetMock.resetRidePodDemoScenarioMock("unknown_scenario");
assert.equal(demoResetUnknown.success, false);
assert.equal(demoResetUnknown.scenario, null);
assert.equal(demoResetUnknown.routeToOpen, null);
assert.equal(demoResetUnknown.message, "Couldn't load this demo scenario.");

assert.deepEqual(moneySafety.POD_LIFECYCLE_STATES, [
  "DRAFT",
  "FORMING",
  "PAYMENT_LOCKING",
  "LOCKED",
  "HOST_CAN_BOOK",
  "RIDE_BOOKED",
  "PICKUP_WINDOW",
  "IN_PROGRESS",
  "COMPLETED",
  "RECEIPT_PENDING",
  "SETTLEMENT_PENDING",
  "SETTLED",
  "CLOSED",
  "HOST_REPLACEMENT_NEEDED",
  "CANCELED",
  "EXPIRED",
  "ADMIN_REVIEW",
  "DISPUTE_HOLD",
]);
assert.deepEqual(moneySafety.HOST_BOOKING_STATES, [
  "NOT_ALLOWED",
  "QUOTE_ALLOWED",
  "QUOTE_SUBMITTED",
  "QUOTE_APPROVED",
  "CAN_BOOK",
  "BOOKED_PENDING_PROOF",
  "BOOKED",
  "COMPLETED",
  "CANCELED_BY_HOST",
  "PROVIDER_CANCELED",
  "HOST_NO_SHOW",
  "WRONG_BOOKING",
]);
assert.deepEqual(moneySafety.MEMBER_ROLES, ["HOST", "RIDER", "REPLACEMENT_HOST"]);
assert.deepEqual(moneySafety.POD_MEMBER_ROLES, ["HOST", "RIDER", "REPLACEMENT_HOST"]);
assert.deepEqual(moneySafety.MEMBER_STATES, [
  "REQUESTED",
  "WAITLISTED",
  "ELIGIBLE",
  "PAYMENT_REQUIRED",
  "AUTHORIZING",
  "CONFIRMED",
  "LOCKED",
  "CANCELED",
  "COMPLETED",
  "NO_SHOW",
  "REMOVED",
]);
assert.deepEqual(moneySafety.POD_MEMBER_STATES, moneySafety.MEMBER_STATES);
assert.deepEqual(moneySafety.PAYMENT_STATES, [
  "NOT_STARTED",
  "PAYMENT_METHOD_REQUIRED",
  "AUTHORIZING",
  "AUTHORIZED",
  "LOCKED_IN",
  "CAPTURE_PENDING",
  "CAPTURED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "AUTH_FAILED",
  "AUTH_EXPIRED",
  "CAPTURE_FAILED",
  "DISPUTED",
]);
assert.deepEqual(moneySafety.PAYMENT_PROVIDERS, ["MOCK", "STRIPE"]);
assert.deepEqual(moneySafety.PAYMENT_INTENT_TYPES, [
  "SEAT_AUTHORIZATION",
  "DEPOSIT",
  "FINAL_CAPTURE",
  "PLATFORM_FEE",
]);
assert.ok(moneySafety.PAYMENT_INTENT_STATUSES.includes("AUTHORIZED"));
assert.ok(moneySafety.PAYMENT_INTENT_STATUSES.includes("SUCCEEDED"));
assert.deepEqual(moneySafety.GENDER_MODES, ["MIXED", "WOMEN_ONLY"]);
assert.equal(moneySafety.getGenderModeLabel("MIXED"), "Mixed pod");
assert.equal(moneySafety.getGenderModeLabel("WOMEN_ONLY"), "Women-only");
assert.deepEqual(podSchedule.SCHEDULE_TYPES, ["ONE_TIME", "RECURRING"]);
assert.deepEqual(podSchedule.RECURRENCE_FREQUENCIES, ["WEEKLY"]);
assert.deepEqual(podSchedule.RECURRING_PATTERNS, ["ONE_WAY", "BACK_AND_FORTH"]);
assert.deepEqual(podSchedule.RECURRING_LEG_TYPES, ["OUTBOUND", "RETURN"]);
assert.deepEqual(fareEstimates.ESTIMATE_SOURCES, [
  "RIDEPOD_HK_TAXI_BASELINE",
  "SYSTEM_TAXI_HK",
  "HOST_INPUT",
  "HOST_QUOTE_SCREENSHOT",
  "PROVIDER_API_FUTURE",
  "UNKNOWN",
]);
assert.deepEqual(fareEstimates.ESTIMATE_CONFIDENCES, ["LOW", "MEDIUM", "HIGH"]);
const urbanBaselineEstimate = fareEstimates.calculateHkTaxiBaseline({
  taxiType: "URBAN",
  distanceKm: 6,
  baggageCount: 2,
  tollTunnelEstimateCents: 0,
  waitingTrafficBufferMinutes: 0,
});
assert.equal(urbanBaselineEstimate.baselineFareCents, 8300);
assert.equal(urbanBaselineEstimate.estimateSource, "RIDEPOD_HK_TAXI_BASELINE");
assert.equal(urbanBaselineEstimate.estimateConfidence, "HIGH");
assert.equal(
  fareEstimates.suggestApprovedMaxFare({
    baselineFareCents: urbanBaselineEstimate.baselineFareCents,
    routeRisk: "NORMAL",
  }),
  10000,
);
const urbanFlagFallEstimate = fareEstimates.calculateHkTaxiFareEstimate({
  zone: "URBAN",
  distanceMeters: 2000,
});
assert.equal(urbanFlagFallEstimate.totalFareCents, 2900);
assert.equal(urbanFlagFallEstimate.estimateSource, "SYSTEM_TAXI_HK");
assert.equal(urbanFlagFallEstimate.estimateConfidence, "HIGH");
const urbanDistanceEstimate = fareEstimates.calculateHkTaxiFareEstimate({
  zone: "URBAN",
  distanceMeters: 6000,
  baggageCount: 2,
});
assert.equal(urbanDistanceEstimate.meteredFareCents, 7100);
assert.equal(urbanDistanceEstimate.surchargeCents, 1200);
assert.equal(urbanDistanceEstimate.totalFareCents, 8300);
assert.equal(fareEstimates.suggestApprovedMaxFare(urbanDistanceEstimate.totalFareCents, "NORMAL"), 10000);
assert.equal(fareEstimates.suggestApprovedMaxFare(urbanDistanceEstimate.totalFareCents, "AIRPORT_OR_TUNNEL"), 10500);
assert.equal(fareEstimates.suggestApprovedMaxFare(urbanDistanceEstimate.totalFareCents, "UNKNOWN_OR_PROVIDER_DYNAMIC"), 11000);
assert.equal(
  fareEstimates.getHostEstimateWarning({
    hostEstimatedFareCents: 6500,
    systemBaselineFareCents: 8300,
    suggestedApprovedMaxFareCents: 10000,
  }),
  "Host estimate is lower than RidePod's baseline. RidePod will keep the suggested approved max unless you upload a lower quote.",
);
assert.equal(
  fareEstimates.getHostEstimateWarning({
    hostEstimatedFareCents: 11000,
    systemBaselineFareCents: 8300,
    suggestedApprovedMaxFareCents: 10000,
  }),
  "This is higher than RidePod's taxi baseline. Riders may need to approve a higher max before protected booking unlocks.",
);
assert.equal(
  fareEstimates.getHostEstimateWarning({
    hostEstimatedFareCents: 9000,
    systemBaselineFareCents: 8300,
    suggestedApprovedMaxFareCents: 10000,
  }),
  null,
);
assert.equal(moneyProtection.PLATFORM_FEE_RATE_BPS, 1000);
assert.equal(moneyProtection.MINIMUM_PLATFORM_FEE_CENTS, 600);
assert.equal(moneyProtection.PLATFORM_FEE_CURRENCY, "HKD");
assert.equal(moneyProtection.calculatePlatformFeeCents(2500, 1000, 600), 600);
assert.equal(moneyProtection.calculatePlatformFeeCents(10000, 1000, 600), 1000);
assert.equal(moneyProtection.calculatePlatformFeeCents(2075, 1000, 600), 600);
const ridePodGuestCharge = moneyProtection.calculateRidePodGuestCharge({
  selectedEstimatedFareCents: 8300,
  approvedMaxTotalFareCents: 10000,
  guestSeats: 3,
  hostIsRiding: true,
  minimumLockedRiders: 3,
  platformFeeRateBps: 1000,
});
assert.equal(ridePodGuestCharge.expectedParticipants, 4);
assert.equal(ridePodGuestCharge.participantsForProtectedMax, 4);
assert.equal(ridePodGuestCharge.expectedFareShareCents, 2075);
assert.equal(ridePodGuestCharge.expectedPlatformFeeCents, 600);
assert.equal(ridePodGuestCharge.expectedGuestTotalCents, 2675);
assert.equal(ridePodGuestCharge.protectedFareShareCents, 2500);
assert.equal(ridePodGuestCharge.protectedPlatformFeeCents, 600);
assert.equal(ridePodGuestCharge.protectedGuestMaxCents, 3100);
const currentRidePodGuestCharge = moneyProtection.calculateRidePodGuestCharge({
  selectedEstimatedFareCents: 8600,
  approvedMaxTotalFareCents: 10100,
  guestSeats: 3,
  hostIsRiding: true,
  minimumLockedRiders: 3,
  platformFeeRateBps: 1000,
});
assert.equal(currentRidePodGuestCharge.expectedFareShareCents, 2150);
assert.equal(currentRidePodGuestCharge.expectedPlatformFeeCents, 600);
assert.equal(currentRidePodGuestCharge.expectedGuestTotalCents, 2750);
assert.equal(currentRidePodGuestCharge.protectedFareShareCents, 2525);
assert.equal(currentRidePodGuestCharge.protectedPlatformFeeCents, 600);
assert.equal(currentRidePodGuestCharge.protectedGuestMaxCents, 3125);
assert.equal(
  joinMoney.calculateJoinPodMaxChargeCents({
    selectedEstimatedFareCents: 8600,
    approvedMaxTotalFareCents: 10100,
    guestSeats: 3,
    hostIsRiding: true,
    minimumLockedRiders: 3,
    platformFeeRateBps: 1000,
  }),
  3125,
);
const previewMoneyProtection = moneyProtection.calculateMoneyProtection({
  estimatedTotalFareCents: 8400,
  approvedMaxTotalFareCents: 9700,
  targetSeats: 4,
  minSeatsToBook: 3,
  ridepodFeeCents: 500,
  hostIsRiding: true,
});
assert.equal(previewMoneyProtection.expectedRideShareCents, 2100);
assert.equal(previewMoneyProtection.expectedPlatformFeeCents, 600);
assert.equal(previewMoneyProtection.expectedTotalPerRiderCents, 2700);
assert.equal(previewMoneyProtection.expectedTotalChargeCents, 2700);
assert.equal(previewMoneyProtection.protectedMaxRideShareCents, 2425);
assert.equal(previewMoneyProtection.maxFareShareCents, 2425);
assert.equal(previewMoneyProtection.protectedMaxPlatformFeeCents, 600);
assert.equal(previewMoneyProtection.protectedMaxChargePerRiderCents, 3025);
assert.equal(previewMoneyProtection.participantMaxChargeCents, 3025);
assert.equal(previewMoneyProtection.platformFeeRateBps, 1000);
assert.equal(previewMoneyProtection.estimatedParticipants, 4);
assert.equal(previewMoneyProtection.minimumParticipantsForMax, 4);
const hostNotRidingMoneyProtection = moneyProtection.calculateMoneyProtection({
  estimatedTotalFareCents: 8400,
  approvedMaxTotalFareCents: 9700,
  targetSeats: 3,
  minSeatsToBook: 3,
  ridepodFeeCents: 500,
  hostIsRiding: false,
});
assert.equal(hostNotRidingMoneyProtection.expectedRideShareCents, 2800);
assert.equal(hostNotRidingMoneyProtection.expectedTotalPerRiderCents, 3400);
assert.equal(hostNotRidingMoneyProtection.protectedMaxRideShareCents, 3234);
assert.equal(hostNotRidingMoneyProtection.protectedMaxChargePerRiderCents, 3834);
assert.equal(hostNotRidingMoneyProtection.minimumParticipantsForMax, 3);
const hostOverrideMoneyProtection = moneyProtection.calculateMoneyProtection({
  estimatedTotalFareCents: 11000,
  approvedMaxTotalFareCents: 10000,
  targetSeats: 4,
  minSeatsToBook: 3,
  ridepodFeeCents: 500,
  hostIsRiding: true,
});
assert.equal(hostOverrideMoneyProtection.expectedTotalPerRiderCents, 3350);
assert.equal(hostOverrideMoneyProtection.protectedMaxChargePerRiderCents, 3100);
const oneTimeOccurrence = podSchedule.createOneTimeOccurrence({
  scheduleType: "ONE_TIME",
  occurrenceDate: "2026-05-19",
  departureTimeLocal: "16:30",
  flexibilityMinutes: 15,
});
assert.equal(oneTimeOccurrence.departureAt, "2026-05-19T16:30:00");
assert.equal(oneTimeOccurrence.isGeneratedFromRecurringTemplate, false);
assert.deepEqual(oneTimeOccurrence.quoteIds, []);
assert.deepEqual(oneTimeOccurrence.receiptIds, []);
assert.equal(oneTimeOccurrence.settlementId, null);
const recurringTemplate = {
  id: "template-usc-lax-weekly",
  hostUserId: "u1",
  originGeneral: "USC",
  destinationGeneral: "LAX",
  genderMode: "WOMEN_ONLY",
  accessMode: "VERIFIED_ONLY",
  targetSeats: 4,
  minSeatsToBook: 3,
  estimatedTotalFareCents: 8400,
  approvedMaxTotalFareCents: 9600,
  ridepodFeeCents: 200,
  recurrenceFrequency: "WEEKLY",
  recurringPattern: "ONE_WAY",
  weekdays: ["TU"],
  departureTimeLocal: "16:30",
  recurringLegs: [
    {
      dayOfWeek: "TU",
      legType: "OUTBOUND",
      departureTime: "16:30",
      originLabel: "USC",
      destinationLabel: "LAX",
    },
  ],
  startDate: "2026-05-19",
  endDate: null,
  occurrenceLimit: 3,
  flexibilityMinutes: 15,
  status: "ACTIVE",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};
const tuesdayOccurrences = podSchedule.generateRecurringOccurrences(recurringTemplate, {
  generatedAt: "2026-05-01T00:00:00.000Z",
});
assert.deepEqual(tuesdayOccurrences.map((occurrence) => occurrence.occurrenceDate), [
  "2026-05-19",
  "2026-05-26",
  "2026-06-02",
]);
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.recurringTemplateId === recurringTemplate.id));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.isGeneratedFromRecurringTemplate));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.lifecycleState === "FORMING"));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.bookingState === "QUOTE_ALLOWED"));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.quoteIds.length === 0));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.receiptIds.length === 0));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.settlementId === null));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.recurringLegType === "OUTBOUND"));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.originLabel === "USC"));
assert.ok(tuesdayOccurrences.every((occurrence) => occurrence.destinationLabel === "LAX"));
const multiWeekdayOccurrences = podSchedule.generateRecurringOccurrences({
  ...recurringTemplate,
  id: "template-mwf",
  weekdays: ["FR", "MO", "WE"],
  startDate: "2026-05-18",
  occurrenceLimit: 5,
});
assert.deepEqual(multiWeekdayOccurrences.map((occurrence) => occurrence.occurrenceDate), [
  "2026-05-18",
  "2026-05-20",
  "2026-05-22",
  "2026-05-25",
  "2026-05-27",
]);
const endDateLimitedOccurrences = podSchedule.generateRecurringOccurrences({
  ...recurringTemplate,
  occurrenceLimit: null,
  endDate: "2026-05-31",
});
assert.deepEqual(endDateLimitedOccurrences.map((occurrence) => occurrence.occurrenceDate), [
  "2026-05-19",
  "2026-05-26",
]);
const defaultLimitedOccurrences = podSchedule.generateRecurringOccurrences({
  ...recurringTemplate,
  occurrenceLimit: null,
  endDate: null,
});
assert.equal(defaultLimitedOccurrences.length, 8);
assert.equal(podSchedule.createRecurringTemplateRRule(recurringTemplate), "FREQ=WEEKLY;BYDAY=TU");
assert.equal("paymentIntentId" in recurringTemplate, false);
const backAndForthOccurrences = podSchedule.generateRecurringOccurrences({
  ...recurringTemplate,
  id: "template-commute",
  recurringPattern: "BACK_AND_FORTH",
  weekdays: ["MO", "TU"],
  startDate: "2026-05-18",
  occurrenceLimit: 4,
  recurringLegs: [
    {
      dayOfWeek: "MO",
      legType: "OUTBOUND",
      departureTime: "08:00",
      originLabel: "Home",
      destinationLabel: "Office",
    },
    {
      dayOfWeek: "MO",
      legType: "RETURN",
      departureTime: "18:00",
      originLabel: "Office",
      destinationLabel: "Home",
    },
    {
      dayOfWeek: "TU",
      legType: "OUTBOUND",
      departureTime: "08:00",
      originLabel: "Home",
      destinationLabel: "Office",
    },
    {
      dayOfWeek: "TU",
      legType: "RETURN",
      departureTime: "18:00",
      originLabel: "Office",
      destinationLabel: "Home",
    },
  ],
});
assert.deepEqual(
  backAndForthOccurrences.map((occurrence) => [
    occurrence.occurrenceDate,
    occurrence.recurringLegType,
    occurrence.departureAt,
    occurrence.originLabel,
    occurrence.destinationLabel,
  ]),
  [
    ["2026-05-18", "OUTBOUND", "2026-05-18T08:00:00", "Home", "Office"],
    ["2026-05-18", "RETURN", "2026-05-18T18:00:00", "Office", "Home"],
    ["2026-05-19", "OUTBOUND", "2026-05-19T08:00:00", "Home", "Office"],
    ["2026-05-19", "RETURN", "2026-05-19T18:00:00", "Office", "Home"],
  ],
);
assert.deepEqual(moneySafety.ACCESS_MODES, [
  "OPEN",
  "VERIFIED_ONLY",
  "COMMUNITY_ONLY",
  "HIGH_TRUST_ONLY",
  "INVITE_ONLY",
]);
assert.equal(moneySafety.getAccessModeLabel("OPEN"), "Open");
assert.equal(moneySafety.getAccessModeLabel("VERIFIED_ONLY"), "Verified-only");
assert.equal(moneySafety.getAccessModeLabel("COMMUNITY_ONLY"), "Community-only");
assert.equal(moneySafety.getAccessModeLabel("HIGH_TRUST_ONLY"), "High-trust-only");
assert.equal(moneySafety.getAccessModeLabel("INVITE_ONLY"), "Invite-only");
assert.deepEqual(moneySafety.RISK_STATUSES, ["NORMAL", "WATCH", "RESTRICTED", "SUSPENDED"]);
assert.ok(moneySafety.QUOTE_REVIEW_STATES.includes("AUTO_APPROVED"));
assert.ok(moneySafety.RECEIPT_VERIFICATION_STATES.includes("VERIFIED"));
assert.ok(moneySafety.SETTLEMENT_STATES.includes("DISPUTE_HOLD"));
assert.ok(moneySafety.SETTLEMENT_ITEM_TYPES.includes("FARE_SHARE"));
assert.ok(moneySafety.HOST_PAYOUT_STATES.includes("HELD_FOR_REVIEW"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("SAFETY_MODE_SET"));
assert.ok(moneySafety.RISK_TYPES.includes("SAFETY_MODE_VIOLATION"));
assert.ok(moneySafety.RISK_TYPES.includes("HOST_CANCELED_AFTER_BOOKING"));
assert.ok(moneySafety.RISK_TYPES.includes("FAKE_RECEIPT_SUSPECTED"));
assert.ok(moneySafety.RISK_TYPES.includes("QUOTE_RECEIPT_MISMATCH"));
assert.ok(moneySafety.RISK_TYPES.includes("MISLEADING_PROOF"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("QUOTE_PROOF_CERTIFIED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RECEIPT_PROOF_CERTIFIED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_QUOTE_SUBMITTED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_QUOTE_APPROVED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_QUOTE_ABOVE_CAP"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_RECEIPT_SUBMITTED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_METER_PROOF_SUBMITTED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_PROOF_CERTIFIED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_PROOF_VERIFIED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_PROOF_REJECTED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDE_INSTANCE_FARE_ABOVE_CAP"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("STRIPE_CONNECT_ACCOUNT_CREATED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("STRIPE_CONNECT_ONBOARDING_LINK_CREATED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("HOST_REIMBURSEMENT_SCHEDULED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("PAYMENT_REFUNDED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("PAYMENT_AUTHORIZATION_RELEASED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDEPOD_DISPUTE_OPENED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDEPOD_DISPUTE_RESOLVED"));
const moneySafetyUiSource = readFileSync("src/components/money-safety-ui.tsx", "utf8");
const settlementPageSource = readFileSync("src/components/settlement-page.tsx", "utf8");
const uiSource = readFileSync("src/components/ui.tsx", "utf8");
const mockDataSource = readFileSync("src/lib/mock-data.ts", "utf8");
const notificationsPageSource = readFileSync("src/app/(app)/notifications/page.tsx", "utf8");
const notificationsClientSource = readFileSync("src/app/(app)/notifications/notifications-client.tsx", "utf8");
const rideInstanceNotificationsSource = readFileSync("src/lib/ride-instance-notifications.ts", "utf8");
const rideInstanceUpdatesSource = readFileSync("src/lib/supabase/ride-instance-updates.ts", "utf8");
const adminReviewPageSource = readFileSync("src/app/(app)/admin/review/page.tsx", "utf8");
const adminReviewClientSource = readFileSync("src/app/(app)/admin/review/admin-review-client.tsx", "utf8");
const adminReviewQueueSource = readFileSync("src/lib/admin-review-queue.ts", "utf8");
const appShellSource = readFileSync("src/components/app-shell.tsx", "utf8");
const recurringInstanceProofFlowSource = readFileSync("src/components/recurring-instance-proof-flow.tsx", "utf8");
const podDetailSource = readFileSync("src/app/(app)/pods/[id]/page.tsx", "utf8");
const createPodChooseTypeSource = readFileSync("src/components/create-pod-choose-type.tsx", "utf8");
const createPodFormSource = readFileSync("src/components/create-pod-form.tsx", "utf8");
const joinFlowSource = readFileSync("src/components/join-flow.tsx", "utf8");
const joinPodMapFirstSource = readFileSync("src/components/join-pod-map-first-screen.tsx", "utf8");
const podEligibilitySource = readFileSync("src/lib/pod-eligibility.ts", "utf8");
const supabaseEnvSource = readFileSync("src/lib/supabase/env.ts", "utf8");
const supabaseClientSource = readFileSync("src/lib/supabase/client.ts", "utf8");
const supabaseServerSource = readFileSync("src/lib/supabase/server.ts", "utf8");
const supabaseAdminSource = readFileSync("src/lib/supabase/admin.ts", "utf8");
const supabaseQueriesSource = readFileSync("src/lib/supabase/queries.ts", "utf8");
const supabaseRideInstanceDetailSource = readFileSync("src/lib/supabase/ride-instance-detail.ts", "utf8");
const supabaseProofMetadataSource = readFileSync("src/lib/supabase/proof-metadata.ts", "utf8");
const proofUploadSource = readFileSync("src/lib/uploads/proof-upload.ts", "utf8");
const proofPreviewButtonSource = readFileSync("src/components/proof-preview-button.tsx", "utf8");
const storagePlanSource = readFileSync("docs/ridepod-supabase-storage-plan.md", "utf8");
const supabaseProofStorageMigrationSource = readFileSync(
  "supabase/migrations/202605190003_ridepod_proof_storage.sql",
  "utf8",
);
const supabaseProofStorageSanitySource = readFileSync(
  "supabase/tests/ridepod_storage_policy_sanity_checks.sql",
  "utf8",
);
const supabaseAdminReviewCasesSource = readFileSync("src/lib/supabase/admin-review-cases.ts", "utf8");
const supabaseAdminReviewActionsSource = readFileSync("src/lib/supabase/admin-review-actions.ts", "utf8");
const adminReviewActionsSource = readFileSync("src/app/(app)/admin/review/actions.ts", "utf8");
const supabaseAuthSource = readFileSync("src/lib/supabase/auth.ts", "utf8");
const profilePageSource = readFileSync("src/app/(app)/profile/page.tsx", "utf8");
const loginPageSource = readFileSync("src/app/login/page.tsx", "utf8");
const registerPageSource = readFileSync("src/app/register/page.tsx", "utf8");
const publicProfileSource = readFileSync("src/lib/public-profile.ts", "utf8");
const publicMemberCardSource = readFileSync("src/components/public-member-card.tsx", "utf8");
const memberSafetyReportSource = readFileSync("src/lib/member-safety-report.ts", "utf8");
const memberReportConcernSource = readFileSync("src/components/member-report-concern.tsx", "utf8");
const hostPageSource = readFileSync("src/app/(app)/host/page.tsx", "utf8");
const settingsPageSource = readFileSync("src/app/(app)/settings/page.tsx", "utf8");
const betaScenariosPageSource = readFileSync("src/app/(app)/beta/scenarios/page.tsx", "utf8");
const betaScenarioActionsSource = readFileSync("src/components/beta-scenario-actions.tsx", "utf8");
const ridePodDemoResetMockSource = readFileSync("src/lib/demo/ridepod-demo-reset-mock.ts", "utf8");
const ridePodDemoDataResetScriptSource = readFileSync("scripts/reset-ridepod-demo-data.mjs", "utf8");
const ridePodDemoDataResetDocSource = readFileSync("docs/ridepod-demo-data-reset.md", "utf8");
const supabaseProfileTrustMigrationSource = readFileSync(
  "supabase/migrations/202605200001_ridepod_profile_trust_fields.sql",
  "utf8",
);
const supabaseIdVerificationMigrationSource = readFileSync(
  "supabase/migrations/202605200002_ridepod_id_verification_placeholder.sql",
  "utf8",
);
const legalCopySource = [
  "src/app/layout.tsx",
  "src/app/invite/[id]/page.tsx",
  "src/components/create-pod-choose-type.tsx",
  "src/components/create-pod-form.tsx",
  "src/components/design-variation.tsx",
  "src/components/join-flow.tsx",
  "src/components/landing-page.tsx",
  "src/components/money-safety-ui.tsx",
  "src/components/premium-join-pod-flow.tsx",
  "src/components/premium-pod-detail.tsx",
  "src/components/ridepod-info-pages.tsx",
  "src/components/settlement-page.tsx",
  "src/app/(app)/notifications/page.tsx",
  "src/lib/ride-instance-notifications.ts",
  "src/app/(app)/admin/review/page.tsx",
  "src/lib/admin-review-queue.ts",
  "src/lib/design-variants.ts",
  "src/lib/money-safety.ts",
  "src/lib/money-safety-mock.ts",
  "src/lib/pod-host-replacement.ts",
].map((path) => readFileSync(path, "utf8")).join("\n");
assert.ok(
  moneySafetyUiSource.includes("Host reimbursement is based on verified final receipt and approved max fare."),
);
assert.ok(betaScenariosPageSource.includes("NEXT_PUBLIC_RIDEPOD_DEMO_MODE"));
assert.ok(betaScenariosPageSource.includes("Demo scenarios are not enabled."));
assert.ok(betaScenariosPageSource.includes("listRidePodDemoScenarios"));
assert.ok(betaScenariosPageSource.includes("BetaScenarioActions"));
assert.ok(betaScenarioActionsSource.includes("Load demo"));
assert.ok(betaScenarioActionsSource.includes("resetRidePodDemoScenarioMock"));
assert.ok(betaScenarioActionsSource.includes("router.push"));
assert.ok(betaScenarioActionsSource.includes("Opens scenario route"));
assert.ok(betaScenarioActionsSource.includes("Scenario route coming soon."));
assert.ok(betaScenariosPageSource.includes("These scenarios use demo or mock states."));
assert.equal(ridePodDemoResetMockSource.includes("supabase"), false);
assert.equal(ridePodDemoResetMockSource.includes(".from("), false);
assert.ok(ridePodDemoResetMockSource.includes("Demo scenario loaded."));
assert.ok(ridePodDemoResetMockSource.includes("Scenario opened with current demo data."));
assert.ok(ridePodDemoDataResetScriptSource.includes("RIDEPOD_ALLOW_DEMO_RESET"));
assert.ok(ridePodDemoDataResetScriptSource.includes("Never run this against production."));
assert.ok(ridePodDemoDataResetScriptSource.includes("supabase/seed.sql"));
assert.ok(ridePodDemoDataResetScriptSource.includes("ridepod_e2e_seed_checks.sql"));
assert.ok(ridePodDemoDataResetScriptSource.includes("supabaseCommand, [\"db\", \"reset\"]"));
assert.equal(ridePodDemoDataResetScriptSource.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.ok(ridePodDemoDataResetDocSource.includes("Never Run This Against Production"));
assert.ok(ridePodDemoDataResetDocSource.includes("Scheduled ride app quote needed"));
assert.ok(ridePodDemoDataResetDocSource.includes("Safety report"));
assert.equal(
  moneySafetyUiSource.includes("Host reimbursement is based on the verified final receipt and approved max fare."),
  false,
);
assert.ok(moneySafetyUiSource.includes("Quote approved. You may book the external ride."));
assert.equal(moneySafetyUiSource.includes("??host"), false);
assert.equal(moneySafetyUiSource.includes("??{"), false);
assert.equal(moneySafetyUiSource.includes("35??5 min"), false);
assert.ok(moneySafetyUiSource.includes("→ ${protectedPod.destinationGeneral}"));
assert.ok(moneySafetyUiSource.includes("→ ${pod.toLabel}"));
assert.ok(moneySafetyUiSource.includes("getQuoteReviewDisplayLabel"));
assert.ok(moneySafetyUiSource.includes("Submitted for review"));
assert.ok(moneySafetyUiSource.includes("Needs higher max approval"));
assert.ok(moneySafetyUiSource.includes("Waiting for guests to lock"));
assert.ok(moneySafetyUiSource.includes("guests locked. You’ll upload a fresh quote once the minimum guests are locked."));
assert.ok(moneySafetyUiSource.includes("Action needed: upload quote"));
assert.ok(moneySafetyUiSource.includes("Upload a fresh ride app quote before booking the external ride."));
assert.ok(moneySafetyUiSource.includes("Quote approved"));
assert.ok(moneySafetyUiSource.includes("The quote is within the booking fare cap. You may book the external ride."));
assert.ok(moneySafetyUiSource.includes("Mark ride as booked"));
assert.ok(moneySafetyUiSource.includes("Quote above booking fare cap"));
assert.ok(moneySafetyUiSource.includes("Guests must approve a higher max before this ride can be RidePod-protected."));
assert.ok(moneySafetyUiSource.includes("Request higher max approval"));
assert.ok(moneySafetyUiSource.includes("Quote not needed yet"));
assert.ok(moneySafetyUiSource.includes("Booking proof"));
assert.ok(moneySafetyUiSource.includes("No upfront quote is required for taxi meter rides."));
assert.ok(moneySafetyUiSource.includes("Ready for taxi meter ride"));
assert.ok(moneySafetyUiSource.includes("Meet the guests and take a metered taxi. Upload meter proof or receipt after the ride."));
assert.ok(moneySafetyUiSource.includes("Meter proof after ride"));
assert.ok(moneySafetyUiSource.includes("Upload a clear meter photo or taxi receipt showing the final fare."));
assert.ok(moneySafetyUiSource.includes("Verified meter proof or receipt controls final settlement."));
assert.ok(moneySafetyUiSource.includes("Confirm quote proof"));
assert.ok(moneySafetyUiSource.includes("This quote will be used to decide whether the host can book a RidePod-protected ride."));
assert.ok(moneySafetyUiSource.includes("I confirm this quote screenshot is real, accurate, unaltered, and belongs to this ride."));
assert.ok(moneySafetyUiSource.includes("False or misleading proof may lead to booking denial, reimbursement denial, account suspension, and manual review."));
assert.ok(moneySafetyUiSource.includes("Submit quote"));
assert.equal(moneySafetyUiSource.includes("Preview quote only. A fresh quote may be required before booking."), false);
assert.equal(moneySafetyUiSource.includes("Booking fare proof"), false);
assert.ok(settlementPageSource.includes("Confirm final receipt"));
assert.ok(settlementPageSource.includes("This receipt will be used to calculate the final split and host reimbursement."));
assert.ok(settlementPageSource.includes("I confirm this receipt is real, accurate, unaltered, and belongs to this completed ride."));
assert.ok(settlementPageSource.includes("I confirm this meter proof or taxi receipt is real, accurate, unaltered, and belongs to this completed ride."));
assert.ok(settlementPageSource.includes("False or misleading proof may lead to reimbursement denial, account suspension, dispute review, and further action where required."));
assert.ok(settlementPageSource.includes("Submit receipt"));
assert.ok(settlementPageSource.includes("Platform fee"));
assert.equal(settlementPageSource.includes("RidePod fee"), false);
assert.ok(moneySafetyUiSource.includes("Off-app payments are not protected"));
assert.ok(podDetailSource.includes("No confirmed riders yet. Seats lock after payment authorization."));
assert.ok(createPodChooseTypeSource.includes("Current estimate"));
assert.ok(createPodChooseTypeSource.includes("Expected guest cost"));
assert.ok(createPodChooseTypeSource.includes("Max charge per guest"));
assert.ok(createPodChooseTypeSource.includes("Booking fare cap"));
assert.ok(createPodChooseTypeSource.includes("[\"Pricing summary\", \"Money Protection\", \"Safety & Trust\", \"Preview your pod\"]"));
assert.ok(createPodChooseTypeSource.includes("const moneyProtectionPanelIndex = 1"));
assert.ok(createPodChooseTypeSource.includes("reviewPanel === 3"));
assert.ok(createPodChooseTypeSource.includes("Minimum locked guests"));
assert.ok(createPodChooseTypeSource.includes("Ideal pod size"));
assert.ok(createPodChooseTypeSource.includes("Total people, including the host."));
assert.ok(createPodChooseTypeSource.includes("Guests needed before host can book."));
assert.ok(createPodChooseTypeSource.includes("hostIsRiding: true"));
assert.ok(createPodChooseTypeSource.includes("RidePod route baseline"));
assert.ok(createPodChooseTypeSource.includes("Host quote"));
assert.ok(createPodChooseTypeSource.includes("if {getIdealPodSizeSummary(hostRidingMoney)} ride"));
assert.ok(createPodChooseTypeSource.includes("unless higher max approved"));
assert.ok(createPodChooseTypeSource.includes("RidePod taxi baseline sets this booking fare cap."));
assert.ok(createPodChooseTypeSource.includes("Guests authorize the max charge before the host books. Final settlement uses the verified receipt and may be lower."));
assert.ok(createPodChooseTypeSource.includes("This is RidePod's best estimate before the ride is booked."));
assert.ok(createPodChooseTypeSource.includes("This is the estimated amount each guest may pay if the pod fills as planned."));
assert.ok(createPodChooseTypeSource.includes("Platform fee is 10% of each guest's fare share, with a HK$6 minimum to cover payment processing and platform protection."));
assert.ok(createPodChooseTypeSource.includes("It includes the estimated fare share and system-controlled fees."));
assert.equal(createPodChooseTypeSource.includes("Platform fee: {PLATFORM_FEE_RATE_BPS / 100}% of fare share"), false);
assert.equal(createPodChooseTypeSource.includes("rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2 text-xs font-bold"), false);
assert.ok(createPodChooseTypeSource.includes("This is the most a guest can be charged for this pod unless they approve a higher fare."));
assert.ok(createPodChooseTypeSource.includes("This is the maximum total fare allowed for protected booking."));
assert.ok(createPodChooseTypeSource.includes("PricingExplanationDialog"));
assert.ok(createPodChooseTypeSource.includes("activeExplanation"));
assert.ok(createPodChooseTypeSource.includes("setActiveExplanation(pricingExplanations.currentEstimate)"));
assert.ok(createPodChooseTypeSource.includes("Back"));
assert.equal(createPodChooseTypeSource.includes("PricingFieldExplanation"), false);
assert.ok(createPodChooseTypeSource.includes("RidePod sets a fare cap. Host uploads proof before booking. Final charge uses the verified receipt."));
assert.ok(createPodChooseTypeSource.includes("RidePod uses the taxi baseline to set a fare cap. Guests authorize the max before the ride. Final charge uses verified meter proof or receipt."));
assert.ok(createPodChooseTypeSource.includes("Booking fare cap"));
assert.ok(createPodChooseTypeSource.includes("Quote must stay within this before host books."));
assert.equal(createPodChooseTypeSource.includes("RidePod estimates the fare to help set a fair approved max. Host confirms booking fare proof before booking."), false);
assert.equal(createPodChooseTypeSource.includes("RidePod estimate"), false);
assert.equal(createPodChooseTypeSource.includes("Suggested booking fare cap"), false);
assert.equal(createPodChooseTypeSource.includes("Host confirms fare proof before booking. Final settlement uses the verified receipt."), false);
assert.equal(createPodChooseTypeSource.includes("How RidePod estimates this"), false);
assert.equal(createPodChooseTypeSource.includes("RidePod uses route distance, local taxi fare rules, baggage/toll assumptions, and a safety buffer to suggest a booking fare cap."), false);
assert.equal(createPodChooseTypeSource.includes("Estimate source"), false);
assert.equal(createPodChooseTypeSource.includes("Approved max suggestion"), false);
assert.equal(createPodChooseTypeSource.includes("Use RidePod estimate"), false);
assert.equal(createPodChooseTypeSource.includes("Use suggested max"), false);
assert.equal(createPodChooseTypeSource.includes("money.estimateConfidence"), false);
assert.ok(createPodChooseTypeSource.includes("Ride app / fixed quote"));
assert.ok(createPodChooseTypeSource.includes("Host books through an app or provider that shows the fare before booking."));
assert.ok(createPodChooseTypeSource.includes("Fresh quote required before booking."));
assert.ok(createPodChooseTypeSource.includes("Fresh quote required before each ride booking."));
assert.ok(createPodChooseTypeSource.includes("Taxi meter"));
assert.ok(createPodChooseTypeSource.includes("Host takes a street taxi with a meter. RidePod uses the taxi baseline to set the booking fare cap."));
assert.ok(createPodChooseTypeSource.includes("Meter photo or receipt required after ride."));
assert.ok(createPodChooseTypeSource.includes("Meter proof or taxi receipt required after each ride."));
assert.ok(createPodChooseTypeSource.includes("taxi_partner_quote"));
assert.ok(createPodChooseTypeSource.includes("Taxi partner quote"));
assert.ok(createPodChooseTypeSource.includes("Licensed taxi partner quotes one price for the shared pod."));
assert.ok(createPodChooseTypeSource.includes("Future beta mode"));
assert.ok(createPodChooseTypeSource.includes("Beta prototype"));
assert.ok(createPodChooseTypeSource.includes("Coming soon"));
assert.ok(createPodChooseTypeSource.includes("Standard"));
assert.ok(createPodChooseTypeSource.includes("Electric"));
assert.ok(createPodChooseTypeSource.includes("Luggage-friendly"));
assert.ok(createPodChooseTypeSource.includes("Large"));
assert.ok(createPodChooseTypeSource.includes("Comfort"));
assert.ok(createPodChooseTypeSource.includes("Accessible"));
assert.ok(createPodChooseTypeSource.includes("RidePod groups riders first. A licensed taxi partner can quote one price for the shared pod. This mode is a future beta prototype and does not dispatch real taxis yet."));
assert.ok(createPodChooseTypeSource.includes("Use beta prototype"));
assert.ok(createPodChooseTypeSource.includes("Taxi partner quote required"));
assert.ok(createPodChooseTypeSource.includes("Guests accept the partner quote before the ride can proceed."));
assert.ok(createPodChooseTypeSource.includes("Payout is released after ride completion and dispute window review."));
assert.ok(createPodChooseTypeSource.includes("Future beta prototype. No real taxi dispatch or payout yet."));
assert.ok(createPodChooseTypeSource.includes("Women-only controls who can join the shared pod. It does not guarantee a female taxi driver unless supported by the taxi partner."));
assert.ok(createPodChooseTypeSource.includes("Add TAXI_PARTNER_QUOTE to Supabase ride_option enum in TAXI-2."));
assert.equal(createPodChooseTypeSource.includes("RidePod driver"), false);
assert.equal(createPodChooseTypeSource.includes("guaranteed payout"), false);
assert.equal(createPodChooseTypeSource.includes("official taxi dispatch"), false);
assert.equal(createPodChooseTypeSource.includes("female driver guaranteed"), false);
assert.equal(createPodChooseTypeSource.includes("100% safe"), false);
assert.equal(createPodChooseTypeSource.includes("escrow"), false);
assert.ok(createPodChooseTypeSource.includes("RidePod protection applies only when the ride stays within the approved max. Final settlement uses the verified receipt."));
assert.ok(createPodChooseTypeSource.includes("Pickup point"));
assert.ok(createPodChooseTypeSource.includes("Dropoff point"));
assert.equal(createPodChooseTypeSource.includes("Wait at"), false);
assert.ok(createPodChooseTypeSource.includes("Repeat on"));
assert.ok(createPodChooseTypeSource.includes("Start date"));
assert.ok(createPodChooseTypeSource.includes("After N rides"));
assert.ok(createPodChooseTypeSource.includes("On date"));
assert.ok(createPodChooseTypeSource.includes("No end date"));
assert.ok(createPodChooseTypeSource.includes("Number of rides"));
assert.ok(createPodChooseTypeSource.includes("One-way"));
assert.ok(createPodChooseTypeSource.includes("Return Trip"));
assert.ok(createPodChooseTypeSource.includes("Trip pattern"));
assert.equal(createPodChooseTypeSource.includes("Same direction on selected days."), false);
assert.ok(createPodChooseTypeSource.includes("Back-and-forth"));
assert.equal(createPodChooseTypeSource.includes("Outbound and return rides on selected days."), false);
assert.equal(createPodChooseTypeSource.includes("Return ride added"), false);
assert.equal(createPodChooseTypeSource.includes("Set the return time on the next step."), false);
assert.ok(createPodChooseTypeSource.includes("Outbound ride"));
assert.ok(createPodChooseTypeSource.includes("Return ride"));
assert.ok(createPodChooseTypeSource.includes("Guests see this pickup time window before locking their seat."));
assert.ok(createPodChooseTypeSource.includes("Recurring protection"));
assert.ok(createPodChooseTypeSource.includes("Each date is protected separately."));
assert.ok(createPodChooseTypeSource.includes("Every ride has its own seat lock, proof, receipt, and settlement."));
assert.ok(createPodChooseTypeSource.includes("Pick weekdays to preview upcoming rides."));
assert.ok(createPodChooseTypeSource.includes("Change rules"));
assert.ok(createPodChooseTypeSource.includes("Before lock: flexible."));
assert.ok(createPodChooseTypeSource.includes("After lock: may need guest approval."));
assert.ok(createPodChooseTypeSource.includes("After proof/booking: update in RidePod first."));
assert.ok(createPodChooseTypeSource.includes("I understand each ride settles separately."));
assert.ok(createPodChooseTypeSource.includes("Review recurring pod"));
assert.ok(createPodChooseTypeSource.includes("Template summary"));
assert.ok(createPodChooseTypeSource.includes("Weekly on"));
assert.ok(createPodChooseTypeSource.includes("Starts {formatReviewDate(dateTime.recurringStartDate)}"));
assert.ok(createPodChooseTypeSource.includes("Flexibility: {dateTime.flexibility}"));
assert.ok(createPodChooseTypeSource.includes("Upcoming rides"));
assert.ok(createPodChooseTypeSource.includes("Pick at least one weekday to preview rides."));
assert.ok(createPodChooseTypeSource.includes("Protected separately"));
assert.ok(createPodChooseTypeSource.includes("Each ride has its own guest lock, proof, receipt, and settlement."));
assert.ok(createPodChooseTypeSource.includes("Create Recurring Pod"));
assert.ok(createPodChooseTypeSource.includes("Create recurring pod?"));
assert.ok(createPodChooseTypeSource.includes("This creates a weekly template. Each ride date will lock guests, collect proof, and settle separately."));
assert.equal(createPodChooseTypeSource.includes("Change &amp; exception rules"), false);
assert.equal(createPodChooseTypeSource.includes("Recurring pods use a weekly template. Guests can request changes before a ride locks. After guests lock, major time or route changes may require re-approval."), false);
assert.equal(createPodChooseTypeSource.includes("Before lock: host can edit and notify guests."), false);
assert.equal(createPodChooseTypeSource.includes("After lock: changes may require guest re-approval."), false);
assert.equal(createPodChooseTypeSource.includes("After proof/booking: changes are not protected unless updated in RidePod."), false);
assert.equal(createPodChooseTypeSource.includes("FREQ=WEEKLY;BYDAY="), false);
assert.ok(createPodChooseTypeSource.includes("Select at least one repeat day."));
assert.ok(createPodChooseTypeSource.includes("Start date is required."));
assert.ok(createPodChooseTypeSource.includes("Number of rides is required."));
assert.ok(createPodChooseTypeSource.includes("Add an outbound time."));
assert.ok(createPodChooseTypeSource.includes("Add a return time."));
assert.ok(createPodChooseTypeSource.includes("Return time should be after outbound time."));
assert.ok(createPodChooseTypeSource.includes("getScheduleTimeSummary(dateTime)"));
assert.ok(createPodChooseTypeSource.includes("Booking proof"));
assert.ok(createPodChooseTypeSource.includes("Required screenshot later"));
assert.ok(createPodChooseTypeSource.includes("Fresh quote after guests lock."));
assert.ok(createPodChooseTypeSource.includes("No upfront quote required"));
assert.ok(createPodChooseTypeSource.includes("Guests authorize the max charge before the ride. RidePod uses the taxi baseline as the booking fare cap."));
assert.ok(createPodChooseTypeSource.includes("Final settlement uses verified meter proof or receipt."));
assert.equal(createPodChooseTypeSource.includes("Required later"), false);
assert.equal(createPodChooseTypeSource.includes("PreviewBookingRulesCard"), false);
assert.equal(createPodChooseTypeSource.includes("Minimum locked guests: "), false);
assert.equal(createPodChooseTypeSource.includes("must authorize before host can book."), false);
assert.equal(createPodChooseTypeSource.includes("Upload a fresh quote after guests lock."), false);
assert.ok(createPodChooseTypeSource.includes("Quote status"));
assert.ok(createPodChooseTypeSource.includes("normalizeRideOptionId"));
assert.ok(createPodChooseTypeSource.includes("rideConfirmationCopy"));
assert.ok(createPodChooseTypeSource.includes("Create this pod?"));
assert.ok(createPodChooseTypeSource.includes("Create this taxi meter pod?"));
assert.ok(createPodChooseTypeSource.includes("Guests can join and lock their seats after the pod is created."));
assert.ok(createPodChooseTypeSource.includes("Before you book the external ride, RidePod will ask you to upload a fresh quote or fare screenshot."));
assert.ok(createPodChooseTypeSource.includes("You do not need to upload it now."));
assert.ok(createPodChooseTypeSource.includes("After the ride, final settlement uses the verified receipt."));
assert.ok(createPodChooseTypeSource.includes("No upfront quote is required for taxi meter rides. After the ride, upload a clear meter photo or taxi receipt for settlement."));
assert.ok(createPodChooseTypeSource.includes("I understand quote proof is required before booking and receipt proof is required after the ride."));
assert.ok(createPodChooseTypeSource.includes("I understand meter proof or receipt is required after the ride."));
assert.ok(createPodChooseTypeSource.includes("Confirm External Ride"));
assert.ok(createPodChooseTypeSource.includes("The host books the ride outside RidePod using an app or provider with an upfront quote."));
assert.ok(createPodChooseTypeSource.includes("RidePod protection applies only when the fresh quote is within the approved max. Final settlement uses the verified receipt."));
assert.ok(createPodChooseTypeSource.includes("I understand the fresh quote must be approved before booking, and final settlement uses the verified receipt."));
assert.ok(createPodChooseTypeSource.includes("Confirm Taxi Meter Ride"));
assert.ok(createPodChooseTypeSource.includes("The host takes a metered taxi outside RidePod."));
assert.ok(createPodChooseTypeSource.includes("RidePod uses the taxi baseline to set the booking fare cap. Final settlement uses verified meter proof or receipt."));
assert.ok(createPodChooseTypeSource.includes("I understand the taxi fare is settled from verified meter proof or receipt, within the approved max rules."));
assert.ok(createPodChooseTypeSource.includes("Confirm Taxi Partner Quote Prototype"));
assert.ok(createPodChooseTypeSource.includes("Create this taxi partner quote pod?"));
assert.ok(createPodChooseTypeSource.includes("I understand this is a beta prototype and no real taxi dispatch or payout is enabled."));
assert.ok(createPodChooseTypeSource.includes("/ rider if ${getMinimumLockedSummary(hostRidingMoney)}"));
assert.ok(createPodChooseTypeSource.includes("Guests authorize the max charge before the host books. Final settlement uses the verified receipt and may be lower."));
assert.equal(createPodChooseTypeSource.includes("Expected total"), false);
assert.equal(createPodChooseTypeSource.includes("Est. fare"), false);
assert.equal(createPodChooseTypeSource.includes("Expected guest total"), false);
assert.equal(createPodChooseTypeSource.includes("Protected guest max"), false);
assert.equal(createPodChooseTypeSource.includes("Protected max charge"), false);
assert.equal(createPodChooseTypeSource.includes("Approved max fare"), false);
assert.equal(createPodChooseTypeSource.includes("fare share + shared platform fee"), false);
assert.equal(createPodChooseTypeSource.includes("includes platform fee"), false);
assert.equal(createPodChooseTypeSource.includes("RidePod's 10% platform charge"), false);
assert.equal(createPodChooseTypeSource.includes("RidePod fee"), false);
assert.equal(createPodChooseTypeSource.includes("HK$5 / rider"), false);
assert.equal(createPodChooseTypeSource.includes("Minimum confirmed riders"), false);
assert.equal(createPodChooseTypeSource.includes("Minimum locked riders"), false);
assert.equal(createPodChooseTypeSource.includes("Host is riding"), false);
assert.equal(createPodChooseTypeSource.includes("Estimated total fare"), false);
assert.equal(createPodChooseTypeSource.includes("Approved max total fare"), false);
assert.equal(createPodChooseTypeSource.includes("Min seats to book"), false);
assert.equal(createPodChooseTypeSource.includes("Target seats"), false);
assert.equal(createPodFormSource.includes("Min seats to book"), false);
assert.equal(createPodFormSource.includes("Target seats"), false);
assert.equal(createPodFormSource.includes("RidePod fee"), false);
assert.ok(createPodFormSource.includes("Minimum locked guests"));
assert.ok(createPodFormSource.includes("Ideal pod size"));
assert.equal(createPodChooseTypeSource.includes("Host&apos;s Choice"), false);
assert.equal(createPodChooseTypeSource.includes("Host's Choice"), false);
assert.equal(createPodChooseTypeSource.includes("Large Ride"), false);
assert.equal(createPodChooseTypeSource.includes("Standard Ride"), false);
assert.equal(createPodChooseTypeSource.includes("Taxi / Meter Taxi"), false);
assert.equal(createPodChooseTypeSource.includes("Comfort / Premium"), false);
assert.equal(createPodChooseTypeSource.includes("Confirm Host&apos;s Choice"), false);
assert.equal(createPodChooseTypeSource.includes("Confirm External Ride Booking"), false);
assert.equal(createPodChooseTypeSource.includes("Ride app / fixed quote selected"), false);
assert.equal(createPodChooseTypeSource.includes("Quote required before booking."), false);
assert.equal(createPodChooseTypeSource.includes("Final receipt or meter proof required after ride."), false);
assert.equal(createPodChooseTypeSource.includes("Host books with Uber, DiDi, Lyft, taxi app, private van, or another provider that shows the fare before booking."), false);
assert.equal(createPodChooseTypeSource.includes("I understand the host chooses and books the external ride under the approved max fare. Everyone pays their share."), false);
assert.equal(createPodChooseTypeSource.includes("Taxi baseline"), false);
assert.equal(createPodChooseTypeSource.includes("Route risk"), false);
assert.equal(createPodChooseTypeSource.includes("Estimated distance (km)"), false);
assert.equal(createPodChooseTypeSource.includes("Baggage count"), false);
assert.equal(createPodChooseTypeSource.includes("Toll / tunnel estimate"), false);
assert.equal(createPodChooseTypeSource.includes("Waiting / traffic buffer (min)"), false);
assert.ok(joinFlowSource.includes("calculateJoinPodMaxChargeCents"));
assert.ok(joinPodMapFirstSource.includes("Your max charge is the most you can be charged unless you approve a higher fare. Final charge uses the verified receipt and may be lower."));
assert.ok(joinPodMapFirstSource.includes("currency: \"HKD\""));
assert.equal(joinFlowSource.includes("expectedGuestTotalCents"), false);
assert.equal(joinFlowSource.includes("expectedFareShareCents"), false);
assert.ok(legalCopySource.includes("RidePod helps users coordinate planned ride pods."));
assert.ok(legalCopySource.includes("RidePod does not provide drivers."));
assert.ok(legalCopySource.includes("The host books the external ride."));
assert.ok(legalCopySource.includes("Host may preview fare early, but protected booking unlocks only after required participants authorize payment."));
assert.ok(legalCopySource.includes("Host reimbursement is based on verified final receipt and approved max fare."));
assert.ok(legalCopySource.includes("You will never pay more than your approved max unless you approve a higher fare."));
assert.ok(legalCopySource.includes("Submitting false, altered, AI-generated, or misleading proof may result in temporary or permanent account suspension, loss of reimbursement, charge reversal, and reporting to payment providers or authorities where required by law."));
for (const bannedCopy of [
  "prepaid and protected",
  "safe and secure",
  "full refund",
  "easy refund",
  "guaranteed safety",
  "guaranteed refund",
  "guaranteed reimbursement",
  "insured ride",
  "official Uber",
  "official Lyft",
  "Uber/Lyft integration",
  "RidePod driver",
  "100% safe",
  "100% real",
  "verified safe",
  "forever banned",
  "crime of forgery",
  "we guarantee fraud detection",
  "AI detector verified",
]) {
  assert.equal(legalCopySource.toLowerCase().includes(bannedCopy.toLowerCase()), false, `Risky copy remains: ${bannedCopy}`);
}
for (const label of [
  "Women-only",
  "Mixed pod",
  "Payment protected",
  "Seat locked",
  "Host can book",
  "Quote approval needed",
  "Host replacement needed",
  "Receipt pending",
  "Settlement ready",
]) {
  assert.ok(uiSource.includes(label) || moneySafetyUiSource.includes(label), `Missing demo copy label: ${label}`);
}
for (const recurringCopy of [
  "Recurring",
  "Weekly",
  "Next ride",
  "Outbound",
  "Return",
  "Quote needed",
  "Meter proof needed",
  "Each ride settles separately",
  "Upload receipt",
  "No upcoming rides",
  "Check the recurring schedule or create a new ride date.",
  "Upload quote",
  "Mark booked",
  "Upload meter proof",
  "View settlement",
  "Status overview",
  "This week",
  "Upload a fresh quote before booking.",
  "Ready to book",
  "Quote approved. Mark the ride as booked.",
  "Ride booked",
  "Stay coordinated with guests.",
  "Receipt needed",
  "Upload the final receipt for settlement.",
  "Proof verified. Dispute window is open.",
  "Closed",
  "Settlement complete. Payout processed.",
  "Next action",
  "Upcoming rides",
  "View all",
  "Open chat",
  "View receipt",
  "seats locked",
  "Ready for taxi meter",
  "No upfront quote needed.",
  "No upfront quote needed for taxi meter rides.",
  "Upload meter proof after the ride.",
]) {
  assert.ok(uiSource.includes(recurringCopy), `Missing My Pods recurring copy: ${recurringCopy}`);
}
assert.equal(uiSource.includes("seats owned"), false);
assert.ok(mockDataSource.includes("upcomingRideInstances"));
assert.ok(mockDataSource.includes("recurringPattern: \"back_and_forth\""));
assert.ok(mockDataSource.includes("recurringPattern: \"one_way\""));
assert.ok(mockDataSource.includes("rideOption: \"ride_app_fixed_quote\""));
assert.ok(mockDataSource.includes("rideOption: \"taxi_meter\""));
assert.ok(mockDataSource.includes("recurringTemplateId"));
assert.ok(mockDataSource.includes("proofType: \"QUOTE_SCREENSHOT\""));
assert.ok(mockDataSource.includes("proofType: \"METER_PROOF\""));
assert.ok(mockDataSource.includes("proofType: \"FINAL_RECEIPT\""));
assert.ok(mockDataSource.includes("proofStatus: \"APPROVED\""));
assert.ok(mockDataSource.includes("proofStatus: \"VERIFIED\""));
assert.ok(mockDataSource.includes("status: \"receipt_pending\""));
assert.ok(mockDataSource.includes("status: \"ride_booked\""));
assert.ok(mockDataSource.includes("status: \"settlement_ready\""));
assert.ok(mockDataSource.includes("campus-commute-442-2026-06-23-outbound"));
assert.ok(mockDataSource.includes("campus-commute-442-2026-06-30-outbound"));
assert.ok(mockDataSource.includes("taxi-meter-weekly-demo-2026-05-19-outbound"));
assert.ok(mockDataSource.includes("bookingFareCapCents: 32000"));
assert.ok(mockDataSource.includes("finalFareCents"));
assert.ok(mockDataSource.includes("settlementState: \"DISPUTE_WINDOW\""));
assert.ok(mockDataSource.includes("settlementId: \"settlement-campus-commute-442-2026-05-19-outbound\""));
assert.ok(mockDataSource.includes("disputeWindowEndsAt"));
assert.ok(mockDataSource.includes("platformFeeCents: 2980"));
assert.ok(mockDataSource.includes("hostReimbursementCents: 26820"));
assert.ok(mockDataSource.includes("payoutState: \"PENDING\""));
assert.ok(mockDataSource.includes("disputeReason?: string | null"));
assert.ok(mockDataSource.includes("disputeNote?: string | null"));
assert.ok(mockDataSource.includes("submittedAt"));
assert.ok(mockDataSource.includes("reviewedAt"));
assert.ok(mockDataSource.includes("bookingFareCapCents"));
assert.ok(mockDataSource.includes("certificationTextVersion: \"ride-instance-proof-v1\""));
assert.ok(uiSource.includes("/host?rideInstanceId="));
assert.ok(uiSource.includes("seats locked") || uiSource.includes("guests locked"));
assert.equal(uiSource.includes("FREQ=WEEKLY"), false);
for (const updatesCopy of [
  "Updates",
  "Unread",
  "All",
  "Today",
  "This week",
  "Earlier",
  "Upload quote needed",
  "Guests are locked. Upload a fresh quote before booking this ride.",
  "Quote approved",
  "The quote is within the fare cap. You may book the external ride.",
  "Upload receipt",
  "Upload the final receipt so RidePod can prepare settlement.",
  "Dispute window ending soon",
  "Less than 24h left to report an issue before settlement finalizes.",
  "Settlement ready",
  "Proof is verified. Guests can report issues until the dispute window ends.",
  "Payout ready",
  "Settlement is final. Your payout can be processed.",
  "Dispute under review",
  "RidePod is reviewing the issue. Settlement or payout may be held.",
  "Ride booked",
  "You marked this ride as booked. We'll remind you after the ride.",
  "Upload quote",
  "Mark booked",
  "Review settlement",
  "View settlement",
  "View payout",
  "View dispute",
  "View ride",
  "No unread updates",
  "More quote info needed",
  "More receipt info needed",
  "More meter proof needed",
  "Quote rejected",
  "Receipt rejected",
  "Meter proof rejected",
  "Payout held for review",
  "Settlement under review",
  "Final split ready",
  "Your quote proof was approved. You may book the external ride.",
  "The host can now book this ride under the booking fare cap.",
  "Upload valid quote proof before booking this ride.",
  "RidePod needs clearer quote proof before this ride can be protected.",
  "RidePod is reviewing this case. Payout is held until review is complete.",
]) {
  assert.ok(
    `${notificationsPageSource}\n${notificationsClientSource}\n${rideInstanceNotificationsSource}\n${rideInstanceUpdatesSource}`.includes(updatesCopy),
    `Missing Updates copy: ${updatesCopy}`,
  );
}
for (const stableNotificationKey of [
  "upload_quote_needed:${rideInstance.id}",
  "quote_approved:${rideInstance.id}",
  "upload_receipt_needed:${rideInstance.id}",
  "meter_proof_needed:${rideInstance.id}",
  "settlement_ready:${rideInstance.id}",
  "dispute_window_ending:${rideInstance.id}",
  "payout_ready:${rideInstance.id}",
  "dispute_under_review:${rideInstance.id}",
  "ride_booked:${rideInstance.id}",
  "admin_proof_approved:${rideInstance.id}:${proofId}",
  "admin_more_info:${rideInstance.id}:${proofId}",
  "admin_proof_rejected:${rideInstance.id}:${proofId}",
  "admin_payout_held:${rideInstance.id}:${caseId}",
]) {
  assert.ok(rideInstanceNotificationsSource.includes(stableNotificationKey), `Missing stable notification key: ${stableNotificationKey}`);
}
assert.ok(rideInstanceNotificationsSource.includes("getRideInstanceNotifications"));
assert.ok(rideInstanceNotificationsSource.includes("getDemoRideInstanceNotifications"));
assert.ok(rideInstanceNotificationsSource.includes("getAdminActionNotifications"));
assert.ok(rideInstanceUpdatesSource.includes("getRideInstanceUpdatesWithFallback"));
assert.ok(rideInstanceUpdatesSource.includes(".from(\"pod_events\")"));
assert.ok(rideInstanceUpdatesSource.includes("ADMIN_PROOF_APPROVED"));
assert.ok(rideInstanceUpdatesSource.includes("ADMIN_MORE_INFO_REQUESTED"));
assert.ok(rideInstanceUpdatesSource.includes("ADMIN_PROOF_REJECTED"));
assert.ok(rideInstanceUpdatesSource.includes("ADMIN_PAYOUT_HELD"));
assert.equal(rideInstanceUpdatesSource.includes("getSupabaseAdminClient"), false);
assert.ok(rideInstanceUpdatesSource.includes("Persist notification rows in later slice.") || rideInstanceUpdatesSource.includes("using mock ride notifications"));
assert.equal(rideInstanceNotificationsSource.includes('rideInstance.status === "ready_to_book" || rideInstance.proofStatus === "APPROVED"'), false);
assert.ok(rideInstanceNotificationsSource.includes("ctaTarget: hostTarget(settlementRide)"));
assert.ok(notificationsPageSource.includes("getRideInstanceUpdatesWithFallback"));
assert.ok(notificationsClientSource.includes("readKeys"));
assert.ok(notificationsClientSource.includes("selectedFilter === \"all\""));
assert.ok(uiSource.includes('rideInstance.proofType === "FINAL_RECEIPT"'));
assert.ok(uiSource.includes('rideInstance.settlementState === "DISPUTE_REVIEW"'));
assert.ok(recurringInstanceProofFlowSource.includes("More quote info needed"));
assert.ok(recurringInstanceProofFlowSource.includes("Quote rejected"));
assert.ok(appShellSource.includes('href="/notifications" label="Updates" icon={Bell} compact'));
assert.ok(appShellSource.includes('href: "/admin/review", label: "Admin review", icon: ShieldAlert'));
assert.ok(supabaseEnvSource.includes("getSupabasePublicEnv"));
assert.ok(supabaseEnvSource.includes("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."));
assert.equal(supabaseClientSource.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.ok(supabaseClientSource.includes("getSupabaseBrowserClient"));
assert.ok(supabaseServerSource.includes("getSupabaseServerClient"));
assert.ok(supabaseServerSource.includes('import "server-only"'));
assert.ok(supabaseEnvSource.includes("SUPABASE_SERVICE_ROLE_KEY"));
assert.ok(supabaseAdminSource.includes("getSupabaseAdminEnv"));
assert.ok(supabaseAdminSource.includes("Do not import this helper into client components."));
assert.ok(supabaseAdminSource.includes('import "server-only"'));
assert.ok(supabaseAuthSource.includes("getCurrentUser"));
assert.ok(supabaseAuthSource.includes("getCurrentProfile"));
assert.ok(supabaseAuthSource.includes("ensureProfileForUser"));
assert.ok(supabaseAuthSource.includes("updateCurrentProfile"));
assert.ok(supabaseAuthSource.includes("Supabase not configured; using mock profile data."));
assert.equal(supabaseAuthSource.includes("getSupabaseAdminClient"), false);
assert.equal(supabaseAuthSource.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.ok(loginPageSource.includes("Log in"));
assert.ok(loginPageSource.includes("Email"));
assert.ok(loginPageSource.includes("Password"));
assert.ok(loginPageSource.includes("Create account"));
assert.ok(loginPageSource.includes("signInWithPassword"));
assert.ok(loginPageSource.includes("Supabase not configured; using mock profile data."));
assert.ok(registerPageSource.includes("Create account"));
assert.ok(registerPageSource.includes("Display name"));
assert.ok(registerPageSource.includes("Email"));
assert.ok(registerPageSource.includes("Password"));
assert.ok(registerPageSource.includes("Log in"));
assert.ok(registerPageSource.includes("signUp"));
assert.ok(registerPageSource.includes("ensureProfileForUser"));
assert.ok(registerPageSource.includes("Supabase not configured; using mock profile data."));
assert.ok(supabaseProfileTrustMigrationSource.includes("gender_identity"));
assert.ok(supabaseProfileTrustMigrationSource.includes("community_id"));
assert.ok(supabaseProfileTrustMigrationSource.includes("no_show_count"));
assert.ok(supabaseProfileTrustMigrationSource.includes("late_cancel_count"));
assert.ok(supabaseProfileTrustMigrationSource.includes("risk_status"));
assert.ok(supabaseIdVerificationMigrationSource.includes("id_verification_status"));
assert.ok(supabaseIdVerificationMigrationSource.includes("manual_verification_requested_at"));
assert.ok(supabaseIdVerificationMigrationSource.includes("subject_user_id"));
assert.ok(supabaseIdVerificationMigrationSource.includes("ID_VERIFICATION_REQUEST"));
assert.ok(supabaseIdVerificationMigrationSource.includes("No identity document is collected"));
assert.ok(profilePageSource.includes("Manage your RidePod identity and trust settings."));
assert.ok(profilePageSource.includes("Display name"));
assert.ok(profilePageSource.includes("Phone number"));
assert.ok(profilePageSource.includes("Gender identity"));
assert.ok(profilePageSource.includes("Community"));
assert.ok(profilePageSource.includes("Verification"));
assert.ok(profilePageSource.includes("ID verification"));
assert.ok(profilePageSource.includes("idVerificationStatusLabel"));
assert.ok(supabaseAuthSource.includes("Not requested"));
assert.ok(profilePageSource.includes("ID verification is not required for most pods. It may be used later for higher-trust pods."));
assert.ok(profilePageSource.includes("Request manual review"));
assert.ok(profilePageSource.includes("Request ID verification review?"));
assert.ok(profilePageSource.includes("RidePod is not collecting ID documents yet. This request only asks RidePod to review your account for future higher-trust features."));
assert.ok(profilePageSource.includes("Verification status may be used for eligibility and trust features. Private review details are not shown publicly."));
assert.ok(profilePageSource.includes("Trust status"));
assert.ok(profilePageSource.includes("Public pod preview"));
assert.ok(profilePageSource.includes("Private details are used for eligibility and safety checks. They are not shown publicly."));
assert.ok(supabaseAuthSource.includes("Profile saved."));
assert.ok(supabaseAuthSource.includes("Couldn't save profile. Try again later."));
assert.ok(supabaseAuthSource.includes("requestManualIdVerificationReview"));
assert.ok(supabaseAuthSource.includes("ID_VERIFICATION_REQUEST"));
assert.ok(supabaseAdminReviewCasesSource.includes("ID verification request"));
assert.ok(supabaseAdminReviewActionsSource.includes("APPROVE_VERIFICATION"));
assert.ok(supabaseAdminReviewActionsSource.includes("REJECT_VERIFICATION"));
assert.ok(supabaseAdminReviewActionsSource.includes("Manual verification approved."));
assert.ok(adminReviewClientSource.includes("Approve manual verification?"));
assert.ok(adminReviewClientSource.includes("Reject verification request?"));
assert.ok(adminReviewClientSource.includes("Approve verification"));
assert.ok(adminReviewClientSource.includes("Reject verification"));
assert.equal(profilePageSource.includes("official ID checked"), false);
assert.equal(profilePageSource.includes("KYC approved"), false);
assert.equal(profilePageSource.includes("verified identity guaranteed"), false);
assert.equal(profilePageSource.includes("100% safe"), false);
assert.equal(profilePageSource.includes("100% verified"), false);
for (const forbiddenIdentityCopy of [
  "official government ID verified",
  "upload HKID",
  "upload passport",
  "selfie verification",
  "face scan",
]) {
  assert.equal(profilePageSource.toLowerCase().includes(forbiddenIdentityCopy.toLowerCase()), false);
  assert.equal(adminReviewClientSource.toLowerCase().includes(forbiddenIdentityCopy.toLowerCase()), false);
}
assert.ok(supabaseQueriesSource.includes("unwrapSupabaseResult"));
assert.ok(supabaseQueriesSource.includes("getMyPods"));
assert.ok(supabaseQueriesSource.includes("getRideInstancesForPod"));
assert.ok(supabaseQueriesSource.includes("getRideInstanceById"));
assert.ok(supabaseQueriesSource.includes("getProofsForRideInstance"));
assert.ok(supabaseQueriesSource.includes("getSettlementForRideInstance"));
assert.ok(supabaseQueriesSource.includes("getAdminReviewCases"));
assert.ok(supabaseAdminReviewCasesSource.includes("getAdminReviewCases"));
assert.ok(supabaseAdminReviewCasesSource.includes("getAdminReviewCaseDetail"));
assert.ok(supabaseAdminReviewCasesSource.includes("mapSupabaseAdminReviewCaseToViewModel"));
assert.ok(supabaseAdminReviewCasesSource.includes("getAdminReviewCasesWithFallback"));
assert.ok(supabaseAdminReviewCasesSource.includes(".from(\"admin_review_cases\")"));
assert.ok(supabaseAdminReviewCasesSource.includes('"ride_instances"'));
assert.ok(supabaseAdminReviewCasesSource.includes('"pods"'));
assert.ok(supabaseAdminReviewCasesSource.includes('"proofs"'));
assert.ok(supabaseAdminReviewCasesSource.includes('"settlements"'));
assert.ok(supabaseAdminReviewCasesSource.includes("Quote above fare cap"));
assert.ok(supabaseAdminReviewCasesSource.includes("Receipt above fare cap"));
assert.ok(supabaseAdminReviewCasesSource.includes("Meter proof above fare cap"));
assert.ok(supabaseAdminReviewCasesSource.includes('if (severity === "High") return "amber"'));
assert.ok(supabaseAdminReviewCasesSource.includes('if (severity === "Critical") return "red"'));
assert.ok(supabaseAdminReviewCasesSource.includes("Supabase admin review read is unavailable; using mock admin review cases."));
assert.ok(adminReviewPageSource.includes("getAdminReviewCasesWithFallback"));
assert.ok(adminReviewPageSource.includes("initialCases={reviewCases.cases}"));
assert.ok(adminReviewClientSource.includes("applyAdminReviewActionForCase"));
assert.ok(adminReviewClientSource.includes("Admin actions update proof, review, ride, and settlement hold state only."));
assert.ok(adminReviewClientSource.includes("ProofPreviewButton"));
assert.ok(adminReviewClientSource.includes("fileUrlOrStoragePath={reviewCase.fileUrl}"));
assert.ok(adminReviewClientSource.includes("proofType={reviewCase.proofType}"));
assert.ok(adminReviewQueueSource.includes("fileUrl?: string | null"));
assert.ok(supabaseAdminReviewCasesSource.includes("fileUrl: proof?.file_url ?? null"));
assert.ok(adminReviewQueueSource.includes("AdminEvidenceTimelineItem"));
assert.ok(adminReviewQueueSource.includes("AdminDisputeEvidenceTimelineItem"));
assert.ok(supabaseAdminReviewCasesSource.includes("buildEvidenceTimeline"));
assert.ok(supabaseAdminReviewCasesSource.includes("buildDisputeEvidenceTimeline"));
assert.ok(supabaseAdminReviewCasesSource.includes('"Current proof"'));
assert.ok(supabaseAdminReviewCasesSource.includes('"Previous proof"'));
assert.ok(supabaseAdminReviewCasesSource.includes("Needs more info"));
assert.ok(supabaseAdminReviewCasesSource.includes("Rejected"));
assert.ok(supabaseAdminReviewCasesSource.includes("Verified"));
assert.ok(supabaseAdminReviewCasesSource.includes("Under review"));
assert.ok(supabaseAdminReviewCasesSource.includes("Payout held"));
assert.ok(supabaseAdminReviewCasesSource.includes(".eq(\"ride_instance_id\", rideInstance.id)"));
assert.ok(supabaseAdminReviewCasesSource.includes(".eq(\"proof_type\", proof.proof_type)"));
assert.ok(supabaseAdminReviewCasesSource.includes(".from(\"pod_events\")"));
assert.ok(supabaseAdminReviewCasesSource.includes("DISPUTE_REPORTED"));
assert.ok(supabaseAdminReviewCasesSource.includes("RIDEPOD_DISPUTE_OPENED"));
assert.ok(supabaseAdminReviewCasesSource.includes("ADMIN_DISPUTE_RESOLVED"));
assert.ok(supabaseAdminReviewCasesSource.includes("Add a dedicated disputes table in later schema cleanup"));
assert.ok(supabaseAdminReviewCasesSource.includes("TODO SQL-2Q"));
assert.ok(adminReviewClientSource.includes("Evidence timeline"));
assert.ok(adminReviewClientSource.includes("Dispute evidence"));
assert.ok(adminReviewClientSource.includes("Issue note"));
assert.ok(adminReviewClientSource.includes("Settlement state"));
assert.ok(adminReviewClientSource.includes("Payout state"));
assert.ok(adminReviewClientSource.includes("fileUrlOrStoragePath={timelineItem.fileUrl}"));
assert.ok(adminReviewClientSource.includes("timelineItem.versionLabel"));
assert.ok(proofPreviewButtonSource.includes("No proof file available"));
assert.ok(adminReviewActionsSource.includes('"use server"'));
assert.ok(adminReviewActionsSource.includes("applyAdminReviewAction"));
assert.ok(adminReviewActionsSource.includes("Protect Admin Review route/actions with durable admin auth before production."));
assert.ok(supabaseAdminReviewActionsSource.includes("applyAdminReviewAction"));
assert.ok(supabaseAdminReviewActionsSource.includes('"APPROVE_PROOF"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"REQUEST_MORE_INFO"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"REJECT_PROOF"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"HOLD_PAYOUT"'));
assert.ok(supabaseAdminReviewActionsSource.includes("Admin notes are required for this action."));
assert.ok(supabaseAdminReviewActionsSource.includes('"VERIFIED"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"READY_TO_BOOK"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"SETTLEMENT_READY"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"NEEDS_MORE_INFO"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"REJECTED"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"QUOTE_NEEDED"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"RECEIPT_NEEDED"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"METER_PROOF_NEEDED"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"DISPUTE_HOLD"'));
assert.ok(supabaseAdminReviewActionsSource.includes('"ADMIN_REVIEW"'));
assert.ok(supabaseAdminReviewActionsSource.includes("ADMIN_PROOF_APPROVED"));
assert.ok(supabaseAdminReviewActionsSource.includes("ADMIN_MORE_INFO_REQUESTED"));
assert.ok(supabaseAdminReviewActionsSource.includes("ADMIN_PROOF_REJECTED"));
assert.ok(supabaseAdminReviewActionsSource.includes("ADMIN_PAYOUT_HELD"));
assert.ok(supabaseAdminReviewActionsSource.includes(".from(\"pod_events\")"));
assert.ok(supabaseAdminReviewActionsSource.includes("Supabase admin action is unavailable; using mock admin action state."));
assert.ok(proofUploadSource.includes("ProofUploadType"));
assert.ok(proofUploadSource.includes("ProofUploadInput"));
assert.ok(proofUploadSource.includes("ProofUploadResult"));
assert.ok(proofUploadSource.includes("validateProofUploadFile"));
assert.ok(proofUploadSource.includes("uploadProofFileMock"));
assert.ok(proofUploadSource.includes("uploadProofFileToSupabaseStorage"));
assert.ok(proofUploadSource.includes("uploadProofFile"));
assert.ok(proofUploadSource.includes("cleanupOrphanProofFile"));
assert.ok(proofUploadSource.includes("normalizeProofStoragePath"));
assert.ok(proofUploadSource.includes("createProofSignedUrl"));
assert.ok(proofUploadSource.includes("createSignedUrl(normalized.storagePath"));
assert.ok(proofUploadSource.includes("defaultProofSignedUrlExpiresInSeconds = 300"));
assert.ok(proofUploadSource.includes("maxProofSignedUrlExpiresInSeconds = 3600"));
assert.ok(proofUploadSource.includes("Couldn't open proof preview. Try again later."));
assert.ok(proofUploadSource.includes('"MOCK"'));
assert.ok(proofUploadSource.includes('"SUPABASE_STORAGE"'));
assert.ok(proofUploadSource.includes('"SUPABASE_STORAGE_FUTURE"'));
assert.ok(proofUploadSource.includes("buildProofStoragePath"));
assert.ok(proofUploadSource.includes("ride-instances/${input.rideInstanceId}/${input.proofType}/${proofUploadTimestamp(date)}-${fileName}"));
assert.ok(proofUploadSource.includes("NEXT_PUBLIC_RIDEPOD_USE_SUPABASE_STORAGE"));
assert.ok(proofUploadSource.includes('from(ridePodProofsBucketId).upload(storagePath'));
assert.ok(proofUploadSource.includes("upsert: false"));
assert.ok(proofUploadSource.includes("storage://${ridePodProofsBucketId}/${storagePath}"));
assert.ok(proofUploadSource.includes("mock://proofs/${input.rideInstanceId}/${input.proofType}/${fileName}"));
assert.ok(proofUploadSource.includes("mock/${input.rideInstanceId}/${input.proofType}/${fileName}"));
assert.ok(proofUploadSource.includes("Couldn't upload proof file. Try again later."));
assert.ok(proofUploadSource.includes("Storage cleanup is not enabled yet."));
assert.ok(proofUploadSource.includes("!value.startsWith(\"ride-instances/\")"));
assert.ok(proofUploadSource.includes("value.startsWith(\"mock://\")"));
assert.ok(proofUploadSource.includes("value.startsWith(\"http://\")"));
assert.ok(proofUploadSource.includes("value.startsWith(\"https://\")"));
assert.ok(proofUploadSource.includes("value.includes(\"..\")"));
assert.equal(proofUploadSource.includes(".remove("), false);
assert.ok(proofUploadSource.includes("TODO SQL-2N: Signed proof preview URLs."));
assert.ok(proofUploadSource.includes("metadata insert fails after storage upload"));
assert.ok(proofUploadSource.includes("storage_path/provider columns"));
assert.equal(proofUploadSource.includes("getSupabaseAdminClient"), false);
assert.equal(proofUploadSource.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.ok(storagePlanSource.includes("ridepod-proofs"));
assert.ok(storagePlanSource.includes("ride-instances/{rideInstanceId}/{proofType}/{proofId-or-timestamp}-{safeFileName}"));
assert.ok(storagePlanSource.includes("Storage RLS policies"));
assert.ok(storagePlanSource.includes("Admin manual review"));
assert.ok(storagePlanSource.includes("Guest raw proof preview is delayed intentionally"));
assert.ok(storagePlanSource.includes("Apply the `storage.objects` policies"));
assert.ok(storagePlanSource.includes("NEXT_PUBLIC_RIDEPOD_USE_SUPABASE_STORAGE=true"));
assert.ok(storagePlanSource.includes("storage://ridepod-proofs/{storagePath}"));
assert.ok(supabaseProofStorageMigrationSource.includes("insert into storage.buckets"));
assert.ok(supabaseProofStorageMigrationSource.includes("'ridepod-proofs'"));
assert.ok(supabaseProofStorageMigrationSource.includes("public = excluded.public"));
assert.ok(supabaseProofStorageMigrationSource.includes("10485760"));
assert.ok(supabaseProofStorageMigrationSource.includes("array['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']::text[]"));
assert.ok(supabaseProofStorageMigrationSource.includes("ridepod_proof_object_ride_instance_id"));
assert.ok(supabaseProofStorageMigrationSource.includes("ridepod_is_valid_proof_storage_path"));
assert.ok(supabaseProofStorageMigrationSource.includes("ridepod_can_host_storage_ride_instance"));
assert.ok(supabaseProofStorageMigrationSource.includes("storage.foldername(object_name)"));
assert.ok(supabaseProofStorageMigrationSource.includes("storage.filename(object_name)"));
assert.ok(supabaseProofStorageMigrationSource.includes("QUOTE_SCREENSHOT"));
assert.ok(supabaseProofStorageMigrationSource.includes("FINAL_RECEIPT"));
assert.ok(supabaseProofStorageMigrationSource.includes("METER_PROOF"));
assert.ok(supabaseProofStorageMigrationSource.includes("RidePod hosts can upload proof files"));
assert.ok(supabaseProofStorageMigrationSource.includes("RidePod hosts can read own proof files"));
assert.ok(supabaseProofStorageMigrationSource.includes("RidePod admins can read proof files"));
assert.ok(supabaseProofStorageMigrationSource.includes("public.is_admin()"));
assert.ok(supabaseProofStorageMigrationSource.includes("Guests intentionally do not get raw proof file access"));
assert.ok(supabaseProofStorageMigrationSource.includes("TODO SQL-2L: Implement signed upload/read URLs"));
assert.ok(supabaseProofStorageMigrationSource.includes("storage_path/provider columns"));
assert.equal(supabaseProofStorageMigrationSource.includes("for delete"), false);
assert.equal(supabaseProofStorageMigrationSource.includes("for update"), false);
assert.equal(supabaseProofStorageMigrationSource.includes("public = true"), false);
assert.equal(supabaseProofStorageMigrationSource.includes("using (bucket_id = 'ridepod-proofs')"), false);
assert.ok(supabaseProofStorageSanitySource.includes("Bucket exists and is private"));
assert.ok(supabaseProofStorageSanitySource.includes("Host insert/read expectations"));
assert.ok(supabaseProofStorageSanitySource.includes("Guest raw proof file access is intentionally disabled"));
assert.doesNotThrow(() =>
  proofUpload.validateProofUploadFile({
    rideInstanceId: "ride-1",
    proofType: "QUOTE_SCREENSHOT",
    file: { name: "quote.png", type: "image/png", size: 1024 },
  }),
);
assert.doesNotThrow(() =>
  proofUpload.validateProofUploadFile({
    rideInstanceId: "ride-1",
    proofType: "FINAL_RECEIPT",
    file: { name: "receipt.jpg", type: "image/jpeg", size: 1024 },
  }),
);
assert.doesNotThrow(() =>
  proofUpload.validateProofUploadFile({
    rideInstanceId: "ride-1",
    proofType: "METER_PROOF",
    file: { name: "meter.pdf", type: "application/pdf", size: 1024 },
  }),
);
assert.throws(
  () =>
    proofUpload.validateProofUploadFile({
      rideInstanceId: "ride-1",
      proofType: "QUOTE_SCREENSHOT",
      file: { name: "quote.gif", type: "image/gif", size: 1024 },
    }),
  /Upload a PNG, JPG, or PDF file\./,
);
assert.throws(
  () =>
    proofUpload.validateProofUploadFile({
      rideInstanceId: "ride-1",
      proofType: "QUOTE_SCREENSHOT",
      file: { name: "quote.png", type: "image/png", size: 10 * 1024 * 1024 + 1 },
    }),
  /File must be 10MB or smaller\./,
);
const mockProofUpload = await proofUpload.uploadProofFile({
  rideInstanceId: "ride-1",
  proofType: "FINAL_RECEIPT",
  file: { name: "Final Receipt.pdf", type: "application/pdf", size: 2048 },
});
assert.equal(mockProofUpload.provider, "MOCK");
assert.equal(mockProofUpload.fileUrl, "mock://proofs/ride-1/FINAL_RECEIPT/Final-Receipt.pdf");
assert.equal(mockProofUpload.storagePath, "mock/ride-1/FINAL_RECEIPT/Final-Receipt.pdf");
const storageProofPath = proofUpload.buildProofStoragePath(
  {
    rideInstanceId: "00000000-0000-4000-8000-000000000001",
    proofType: "METER_PROOF",
    file: { name: "Meter Proof 1.jpg", type: "image/jpeg", size: 2048 },
  },
  new Date("2026-05-19T08:00:00.000Z"),
);
assert.equal(
  storageProofPath.storagePath,
  "ride-instances/00000000-0000-4000-8000-000000000001/METER_PROOF/2026-05-19T08-00-00Z-Meter-Proof-1.jpg",
);
assert.equal(storageProofPath.fileName, "Meter-Proof-1.jpg");
assert.deepEqual(
  proofUpload.normalizeProofStoragePath(
    "storage://ridepod-proofs/ride-instances/abc/FINAL_RECEIPT/file.png",
  ),
  {
    kind: "storage",
    bucketId: "ridepod-proofs",
    storagePath: "ride-instances/abc/FINAL_RECEIPT/file.png",
    needsSignedUrl: true,
  },
);
assert.deepEqual(proofUpload.normalizeProofStoragePath("ride-instances/abc/METER_PROOF/file.jpg"), {
  kind: "storage",
  bucketId: "ridepod-proofs",
  storagePath: "ride-instances/abc/METER_PROOF/file.jpg",
  needsSignedUrl: true,
});
assert.deepEqual(proofUpload.normalizeProofStoragePath("mock://proofs/abc/METER_PROOF/file.jpg"), {
  kind: "mock",
  mockUrl: "mock://proofs/abc/METER_PROOF/file.jpg",
  needsSignedUrl: false,
});
assert.equal(proofUpload.normalizeProofStoragePath(null), null);
assert.equal(proofUpload.normalizeProofStoragePath(""), null);
assert.equal(proofUpload.normalizeProofStoragePath("https://example.com/proof.png"), null);
assert.equal(proofUpload.normalizeProofStoragePath("http://example.com/proof.png"), null);
assert.deepEqual(
  await proofUpload.cleanupOrphanProofFile({
    storagePath: "ride-instances/abc/FINAL_RECEIPT/file.png",
    reason: "metadata failed",
  }),
  {
    cleanupAttempted: false,
    cleanupSucceeded: false,
    cleanupSkipped: true,
    reason: "Storage cleanup is not enabled yet.",
  },
);
assert.equal(
  (
    await proofUpload.cleanupOrphanProofFile({
      storagePath: "",
      reason: "metadata failed",
    })
  ).cleanupSkipped,
  true,
);
assert.equal(
  (
    await proofUpload.cleanupOrphanProofFile({
      storagePath: "https://example.com/proof.png",
      reason: "metadata failed",
    })
  ).cleanupSkipped,
  true,
);
assert.equal(
  (
    await proofUpload.cleanupOrphanProofFile({
      storagePath: "other/file.png",
      reason: "metadata failed",
    })
  ).cleanupSkipped,
  true,
);
assert.equal(proofUpload.getProofSignedUrlExpiresInSeconds(), 300);
assert.equal(proofUpload.getProofSignedUrlExpiresInSeconds(120), 120);
assert.equal(proofUpload.getProofSignedUrlExpiresInSeconds(7200), 3600);
assert.equal(proofUpload.getProofSignedUrlExpiresInSeconds(-10), 300);
assert.equal(
  (
    await proofUpload.createProofSignedUrl({
      storagePath: "mock://proofs/abc/METER_PROOF/file.jpg",
    })
  ).ok,
  false,
);
assert.equal(
  (
    await proofUpload.createProofSignedUrl({
      storagePath: "https://example.com/proof.png",
    })
  ).ok,
  false,
);
const originalSupabaseUrlForSignedProof = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseAnonKeyForSignedProof = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const missingSupabaseSignedProofUrl = await proofUpload.createProofSignedUrl({
  storagePath: "ride-instances/abc/FINAL_RECEIPT/file.png",
});
assert.equal(missingSupabaseSignedProofUrl.ok, false);
assert.equal(missingSupabaseSignedProofUrl.error, "Couldn't open proof preview. Try again later.");
if (originalSupabaseUrlForSignedProof === undefined) {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
} else {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrlForSignedProof;
}
if (originalSupabaseAnonKeyForSignedProof === undefined) {
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
} else {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKeyForSignedProof;
}
assert.ok(proofPreviewButtonSource.includes("export function ProofPreviewButton"));
assert.ok(proofPreviewButtonSource.includes("createProofSignedUrl"));
assert.ok(proofPreviewButtonSource.includes("normalizeProofStoragePath"));
assert.ok(proofPreviewButtonSource.includes("Preview proof"));
assert.ok(proofPreviewButtonSource.includes("Open PDF"));
assert.ok(proofPreviewButtonSource.includes("Mock proof preview"));
assert.ok(proofPreviewButtonSource.includes("No proof file available"));
assert.ok(proofPreviewButtonSource.includes("Opening..."));
assert.ok(proofPreviewButtonSource.includes("Couldn't open proof preview. Try again later."));
assert.ok(proofPreviewButtonSource.includes("window.open(result.signedUrl"));
assert.ok(proofPreviewButtonSource.includes('"noopener,noreferrer"'));
assert.equal(proofPreviewButtonSource.includes("public URL"), false);
assert.equal(proofPreviewButtonSource.includes("100% verified"), false);
assert.equal(proofPreviewButtonSource.includes("AI verified"), false);
assert.equal(proofPreviewButtonSource.includes("fake"), false);
assert.ok(supabaseProofMetadataSource.includes("submitRideInstanceProofMetadata"));
assert.ok(supabaseProofMetadataSource.includes("Proof certification is required."));
assert.ok(supabaseProofMetadataSource.includes("amountCents must be greater than zero."));
assert.ok(supabaseProofMetadataSource.includes('"QUOTE_SCREENSHOT"'));
assert.ok(supabaseProofMetadataSource.includes('"FINAL_RECEIPT"'));
assert.ok(supabaseProofMetadataSource.includes('"METER_PROOF"'));
assert.ok(supabaseProofMetadataSource.includes("mock://proofs/${input.rideInstanceId}/${input.proofType}"));
assert.equal(supabaseProofMetadataSource.includes("getSupabaseAdminClient"), false);
assert.equal(supabaseProofMetadataSource.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.ok(supabaseProofMetadataSource.includes("updateRideInstanceStatusAfterProofSubmit"));
assert.ok(supabaseProofMetadataSource.includes('"QUOTE_UNDER_REVIEW"'));
assert.ok(supabaseProofMetadataSource.includes('"PROOF_UNDER_REVIEW"'));
assert.ok(supabaseProofMetadataSource.includes('.from("ride_instances")'));
assert.ok(supabaseProofMetadataSource.includes("instance_status: normalizedRideInstanceStatus"));
assert.ok(supabaseProofMetadataSource.includes("aboveCap"));
assert.ok(supabaseProofMetadataSource.includes("Proof was submitted, but ride status could not be updated. Try refreshing."));
assert.ok(supabaseProofMetadataSource.includes("createAdminReviewCaseForProofIfNeeded"));
assert.ok(supabaseProofMetadataSource.includes("QUOTE_ABOVE_CAP"));
assert.ok(supabaseProofMetadataSource.includes("RECEIPT_ABOVE_CAP"));
assert.ok(supabaseProofMetadataSource.includes("METER_PROOF_ABOVE_CAP"));
assert.ok(supabaseProofMetadataSource.includes("SUSPICIOUS_PROOF"));
assert.ok(supabaseProofMetadataSource.includes("openAdminReviewStates"));
assert.ok(supabaseProofMetadataSource.includes('.from("admin_review_cases")'));
assert.ok(supabaseProofMetadataSource.includes("Create server action/RPC for admin review case creation."));
assert.ok(supabaseProofMetadataSource.includes("ADMIN_REVIEW_CASE_CREATED"));
assert.ok(supabaseProofMetadataSource.includes("PROOF_ABOVE_CAP_REVIEW_CREATED"));
assert.ok(supabaseProofMetadataSource.includes("SUSPICIOUS_PROOF_REVIEW_CREATED"));
assert.equal(supabaseProofMetadataSource.includes('instance_status: "READY_TO_BOOK"'), false);
assert.equal(supabaseProofMetadataSource.includes('instance_status: "SETTLEMENT_READY"'), false);
assert.ok(supabaseProofMetadataSource.includes("getProofReplacementPolicy"));
assert.ok(supabaseProofMetadataSource.includes("canSubmitReplacementProof"));
assert.ok(supabaseProofMetadataSource.includes("canReplaceProof"));
assert.ok(supabaseProofMetadataSource.includes("proofResubmissionAllowedStatuses"));
assert.ok(supabaseProofMetadataSource.includes('"NEEDS_MORE_INFO"'));
assert.ok(supabaseProofMetadataSource.includes('"REJECTED"'));
assert.ok(supabaseProofMetadataSource.includes('"FRAUD_SUSPECTED"'));
assert.ok(supabaseProofMetadataSource.includes("ACTIVE_PROOF_EXISTS"));
assert.ok(supabaseProofMetadataSource.includes("SUSPICIOUS_PROOF_REVIEW"));
assert.deepEqual(supabaseProofMetadata.canReplaceProof({ proofStatus: "NEEDS_MORE_INFO" }), {
  canReplace: true,
  reason: "Upload a clearer proof.",
  ctaLabel: "Upload replacement proof",
});
assert.deepEqual(supabaseProofMetadata.canReplaceProof({ proofStatus: "REJECTED" }), {
  canReplace: true,
  reason: "Upload valid proof to continue.",
  ctaLabel: "Upload new proof",
});
assert.deepEqual(supabaseProofMetadata.canReplaceProof({ proofStatus: "SUBMITTED" }), {
  canReplace: false,
  reason: "Proof already submitted.",
});
assert.deepEqual(supabaseProofMetadata.canReplaceProof({ proofStatus: "UNDER_REVIEW" }), {
  canReplace: false,
  reason: "Proof is under review.",
});
assert.deepEqual(supabaseProofMetadata.canReplaceProof({ proofStatus: "VERIFIED" }), {
  canReplace: false,
  reason: "Proof already verified.",
});
assert.deepEqual(supabaseProofMetadata.canReplaceProof({ proofStatus: "FRAUD_SUSPECTED" }), {
  canReplace: false,
  reason: "Proof is under admin review.",
});
assert.deepEqual(supabaseProofMetadata.canReplaceProof({ proofStatus: "NEEDED" }), {
  canReplace: true,
  reason: "Proof is required.",
  ctaLabel: "Upload proof",
});
assert.deepEqual(supabaseProofMetadata.canReplaceProof({ proofStatus: "SOMETHING_ELSE" }), {
  canReplace: false,
  reason: "Proof status is unknown.",
});
assert.equal(supabaseProofMetadata.getCurrentProofForRideInstance([], "FINAL_RECEIPT"), null);
assert.equal(
  supabaseProofMetadata.getCurrentProofForRideInstance(
    [
      { id: "quote-1", proofType: "QUOTE_SCREENSHOT", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T08:00:00Z" },
      { id: "receipt-1", proofType: "FINAL_RECEIPT", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T09:00:00Z" },
    ],
    "FINAL_RECEIPT",
  )?.id,
  "receipt-1",
);
assert.equal(
  supabaseProofMetadata.getCurrentProofForRideInstance(
    [
      { id: "receipt-old-current", proofType: "FINAL_RECEIPT", proofStatus: "SUBMITTED", isCurrent: true, submittedAt: "2026-05-19T08:00:00Z" },
      { id: "receipt-new-current", proofType: "FINAL_RECEIPT", proofStatus: "REJECTED", isCurrent: true, submittedAt: "2026-05-19T09:00:00Z" },
    ],
    "FINAL_RECEIPT",
  )?.id,
  "receipt-new-current",
);
assert.equal(
  supabaseProofMetadata.getCurrentProofForRideInstance(
    [
      { id: "receipt-superseded", proofType: "FINAL_RECEIPT", proofStatus: "VERIFIED", supersededAt: "2026-05-19T10:00:00Z", submittedAt: "2026-05-19T08:00:00Z" },
      { id: "receipt-active", proofType: "FINAL_RECEIPT", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T09:00:00Z" },
    ],
    "FINAL_RECEIPT",
  )?.id,
  "receipt-active",
);
assert.equal(
  supabaseProofMetadata.getCurrentProofForRideInstance(
    [
      { id: "receipt-submitted", proofType: "FINAL_RECEIPT", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T10:00:00Z" },
      { id: "receipt-verified", proofType: "FINAL_RECEIPT", proofStatus: "VERIFIED", submittedAt: "2026-05-19T08:00:00Z" },
    ],
    "FINAL_RECEIPT",
  )?.id,
  "receipt-verified",
);
assert.equal(
  supabaseProofMetadata.getCurrentProofForRideInstance(
    [
      { id: "quote-submitted", proofType: "QUOTE_SCREENSHOT", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T10:00:00Z" },
      { id: "quote-under-review", proofType: "QUOTE_SCREENSHOT", proofStatus: "UNDER_REVIEW", submittedAt: "2026-05-19T08:00:00Z" },
    ],
    "QUOTE_SCREENSHOT",
  )?.id,
  "quote-under-review",
);
assert.equal(
  supabaseProofMetadata.getCurrentProofForRideInstance(
    [
      { id: "meter-old", proofType: "METER_PROOF", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T08:00:00Z" },
      { id: "meter-new", proofType: "METER_PROOF", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T09:00:00Z" },
    ],
    "METER_PROOF",
  )?.id,
  "meter-new",
);
assert.equal(
  supabaseProofMetadata.getCurrentProofForRideInstance(
    [
      { id: "receipt-needed", proofType: "FINAL_RECEIPT", proofStatus: "NEEDED", submittedAt: "2026-05-19T10:00:00Z" },
      { id: "receipt-rejected", proofType: "FINAL_RECEIPT", proofStatus: "REJECTED", submittedAt: "2026-05-19T08:00:00Z" },
    ],
    "FINAL_RECEIPT",
  )?.id,
  "receipt-rejected",
);
const originalProofSelectionInput = [
  { id: "stable-1", proofType: "FINAL_RECEIPT", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T08:00:00Z" },
  { id: "stable-2", proofType: "FINAL_RECEIPT", proofStatus: "SUBMITTED", submittedAt: "2026-05-19T09:00:00Z" },
];
const originalProofSelectionSnapshot = JSON.stringify(originalProofSelectionInput);
supabaseProofMetadata.getCurrentProofForRideInstance(originalProofSelectionInput, "FINAL_RECEIPT");
assert.equal(JSON.stringify(originalProofSelectionInput), originalProofSelectionSnapshot);
assert.ok(supabaseProofMetadataSource.includes("replaceRideInstanceProofMetadata"));
assert.ok(supabaseProofMetadataSource.includes("validateReplacementProofInput"));
assert.ok(supabaseProofMetadataSource.includes("fileUrl or storagePath is required."));
assert.ok(supabaseProofMetadataSource.includes("getProofsForReplacement"));
assert.ok(supabaseProofMetadataSource.includes("getCurrentProofForRideInstance"));
assert.ok(supabaseProofMetadataSource.includes("canReplaceProof"));
assert.ok(supabaseProofMetadataSource.includes("oldProofSuperseded: false"));
assert.ok(supabaseProofMetadataSource.includes("Add proof version columns in later schema cleanup."));
assert.equal(supabaseProofMetadataSource.includes(".delete("), false);
assert.equal(supabaseProofMetadataSource.includes(".remove("), false);
await assert.rejects(
  () =>
    supabaseProofMetadata.replaceRideInstanceProofMetadata({
      rideInstanceId: "ride-1",
      proofType: "FINAL_RECEIPT",
      amountCents: 1000,
      fileUrl: "mock://proofs/ride-1/FINAL_RECEIPT/replacement.png",
      certificationAccepted: false,
      certificationTextVersion: "test",
    }),
  /Proof certification is required\./,
);
await assert.rejects(
  () =>
    supabaseProofMetadata.replaceRideInstanceProofMetadata({
      rideInstanceId: "",
      proofType: "FINAL_RECEIPT",
      amountCents: 1000,
      fileUrl: "mock://proofs/ride-1/FINAL_RECEIPT/replacement.png",
      certificationAccepted: true,
      certificationTextVersion: "test",
    }),
  /rideInstanceId is required\./,
);
await assert.rejects(
  () =>
    supabaseProofMetadata.replaceRideInstanceProofMetadata({
      rideInstanceId: "ride-1",
      proofType: "FINAL_RECEIPT",
      amountCents: 0,
      fileUrl: "mock://proofs/ride-1/FINAL_RECEIPT/replacement.png",
      certificationAccepted: true,
      certificationTextVersion: "test",
    }),
  /amountCents must be greater than zero\./,
);
await assert.rejects(
  () =>
    supabaseProofMetadata.replaceRideInstanceProofMetadata({
      rideInstanceId: "ride-1",
      proofType: "FINAL_RECEIPT",
      amountCents: 1000,
      certificationAccepted: true,
      certificationTextVersion: "test",
    }),
  /fileUrl or storagePath is required\./,
);
assert.ok(recurringInstanceProofFlowSource.includes("submitRideInstanceProofMetadata"));
assert.ok(recurringInstanceProofFlowSource.includes("cleanupOrphanProofFile"));
assert.ok(recurringInstanceProofFlowSource.includes("Proof metadata insert failed after storage upload."));
assert.ok(recurringInstanceProofFlowSource.includes("Proof file uploaded, but proof record could not be saved. Please try again."));
assert.ok(recurringInstanceProofFlowSource.includes("canReplaceProof"));
assert.ok(recurringInstanceProofFlowSource.includes("getProofReplacementUi"));
assert.ok(recurringInstanceProofFlowSource.includes("focusProofUploadForm"));
assert.ok(supabaseProofMetadataSource.includes("Upload replacement proof"));
assert.ok(supabaseProofMetadataSource.includes("Upload new proof"));
assert.ok(supabaseProofMetadataSource.includes("Proof already submitted."));
assert.ok(supabaseProofMetadataSource.includes("Proof is under review."));
assert.ok(recurringInstanceProofFlowSource.includes("Proof verified."));
assert.ok(supabaseProofMetadataSource.includes("Proof is under admin review."));
assert.ok(supabaseProofMetadataSource.includes("Proof status is unknown."));
assert.ok(recurringInstanceProofFlowSource.includes("proof-upload-QUOTE_SCREENSHOT"));
assert.ok(recurringInstanceProofFlowSource.includes("proof-upload-FINAL_RECEIPT"));
assert.ok(recurringInstanceProofFlowSource.includes("proof-upload-METER_PROOF"));
assert.ok(recurringInstanceProofFlowSource.includes("TODO SQL-2O-E"));
assert.ok(recurringInstanceProofFlowSource.includes("uploadProofFile"));
assert.ok(recurringInstanceProofFlowSource.includes("fileUrl: uploadResult.fileUrl"));
assert.ok(recurringInstanceProofFlowSource.includes("fileName: uploadResult.fileName"));
assert.ok(recurringInstanceProofFlowSource.includes("ProofPreviewButton"));
assert.ok(recurringInstanceProofFlowSource.includes("localProofPreviews"));
assert.ok(recurringInstanceProofFlowSource.includes("setLocalProofPreviews"));
assert.ok(recurringInstanceProofFlowSource.includes("fileUrl: uploadResult.fileUrl"));
assert.ok(recurringInstanceProofFlowSource.includes("contentType: uploadResult.contentType"));
assert.ok(recurringInstanceProofFlowSource.includes("renderHostProofPreview(\"QUOTE_SCREENSHOT\")"));
assert.ok(recurringInstanceProofFlowSource.includes("renderHostProofPreview(\"FINAL_RECEIPT\")"));
assert.ok(recurringInstanceProofFlowSource.includes("renderHostProofPreview(\"METER_PROOF\")"));
assert.ok(mockDataSource.includes("proofFileUrl?: string | null"));
assert.ok(mockDataSource.includes("proofFileName?: string | null"));
assert.ok(mockDataSource.includes("proofContentType?: string | null"));
assert.ok(supabaseRideInstanceDetailSource.includes("proofFileUrl: primaryProof?.file_url ?? null"));
assert.equal(settlementPageSource.includes("ProofPreviewButton"), false);
assert.ok(recurringInstanceProofFlowSource.includes("proofUploadAccept"));
assert.ok(recurringInstanceProofFlowSource.includes('submitProofMetadata("QUOTE_SCREENSHOT"'));
assert.ok(recurringInstanceProofFlowSource.includes('submitProofMetadata("FINAL_RECEIPT"'));
assert.ok(recurringInstanceProofFlowSource.includes('submitProofMetadata("METER_PROOF"'));
assert.ok(recurringInstanceProofFlowSource.includes("getLocalRideStatusAfterProofSubmit"));
assert.ok(recurringInstanceProofFlowSource.includes('"quote_under_review"'));
assert.ok(recurringInstanceProofFlowSource.includes('"receipt_under_review"'));
assert.ok(recurringInstanceProofFlowSource.includes('"meter_proof_under_review"'));
assert.ok(recurringInstanceProofFlowSource.includes("Couldn't submit proof. Try again later."));
for (const adminReviewCopy of [
  "Admin Review",
  "Review proof, disputes, above-cap fares, and payout holds.",
  "All",
  "Proof",
  "Above cap",
  "Disputes",
  "Payout holds",
  "Resolved",
  "Quote above booking fare cap",
  "Receipt above cap",
  "Meter proof above cap",
  "Suspicious receipt",
  "Guest dispute",
  "Host cancellation after booking",
  "No-show dispute",
  "Receipt needs more info",
  "Quote / receipt mismatch",
  "Review case",
  "Ride instance summary",
  "Uploaded file preview",
  "Proof type",
  "Submitted amount",
  "Submitted by",
  "Certification accepted",
  "Comparison",
  "RidePod estimate / baseline",
  "Difference from cap",
  "Difference from quote",
  "Dispute raised",
  "Admin decision",
  "Admin notes",
  "Add notes for the audit trail.",
  "Admin notes are required for this action.",
  "Approve proof",
  "Request more info",
  "Reject proof",
  "Hold payout",
  "Proof approved. Settlement can continue.",
  "More information is required before settlement can continue.",
  "Proof rejected. Valid proof is required before settlement can continue.",
  "Payout is held for manual review.",
  "Approve this proof?",
  "This proof will be approved for RidePod settlement rules.",
  "Reject this proof?",
  "This proof will be marked rejected. The host must upload valid proof before settlement can continue.",
  "Hold payout?",
  "Payout will be held while RidePod reviews this case.",
  "Request more info?",
  "The host will need to provide clearer or corrected proof.",
  "Manual evidence review only.",
  "ADMIN_REVIEW_OPENED",
  "ADMIN_PROOF_APPROVED",
  "ADMIN_PROOF_REJECTED",
  "ADMIN_MORE_INFO_REQUESTED",
  "ADMIN_PAYOUT_HELD",
]) {
  assert.ok(
    `${adminReviewPageSource}\n${adminReviewClientSource}\n${adminReviewQueueSource}`.includes(adminReviewCopy),
    `Missing Admin Review copy: ${adminReviewCopy}`,
  );
}
assert.equal(`${adminReviewPageSource}\n${adminReviewClientSource}\n${adminReviewQueueSource}`.includes("Proof is guaranteed real"), false);
for (const recurringInstanceCopy of [
  "Ride instance",
  "Upload fresh quote",
  "Upload a quote or fare screenshot for this ride before booking.",
  "Provider / app name",
  "Quote amount, cap",
  "I confirm this quote screenshot is real, accurate, unaltered, and belongs to this ride.",
  "False or misleading proof may lead to booking denial, reimbursement denial, account suspension, and manual review.",
  "Submit quote",
  "Quote approved",
  "Proof verified.",
  "Quote above booking fare cap",
  "Guests must approve a higher max before this ride can be RidePod-protected.",
  "Request higher max approval",
  "This ride instance has its own proof, booking, final receipt, and settlement.",
  "Upload final receipt",
  "Tap to upload or drag and drop",
  "Provider / service",
  "Final fare (HKD)",
  "Receipt status",
  "False or misleading proof may lead to review, reimbursement denial, or account action.",
  "Upload the final receipt for this ride. Final settlement uses the verified receipt.",
  "Provider name",
  "Final fare amount",
  "PNG, JPG or PDF",
  "I confirm this receipt is real, accurate, unaltered, and belongs to this ride.",
  "False or misleading proof may lead to reimbursement denial, account suspension, dispute review, and manual review.",
  "Submit receipt",
  "Receipt submitted. RidePod will review it before settlement.",
  "Fare above booking fare cap",
  "Guests cannot be charged above their max unless they approve an increase. This receipt may need manual review.",
  "Guests cannot be charged above their max unless they approve an increase. This proof may need manual review.",
  "Ready for taxi meter ride",
  "Meet the guests and take a metered taxi. Upload meter proof or taxi receipt after the ride.",
  "Upload meter proof",
  "Meter proof needed",
  "Upload a clear meter photo or taxi receipt.",
  "Final meter fare (HKD)",
  "I certify this meter proof / receipt is real, accurate, unaltered, and belongs to this ride.",
  "False or misleading proof may lead to review, reimbursement denial, or account action.",
  "Guests cannot be charged above their max unless they approve an increase. This meter proof may need manual review.",
  "Meter proof status",
  "Upload a clear meter photo or taxi receipt showing the final fare.",
  "Final meter fare",
  "Submit meter proof",
  "I confirm this meter proof or receipt is real, accurate, unaltered, and belongs to this ride.",
  "Meter proof submitted. RidePod will review it before settlement.",
  "Settlement timeline",
  "Ride completed",
  "Proof verified",
  "Settlement ready",
  "Dispute window",
  "Settlement final",
  "About the dispute window",
  "Guests can raise a dispute until the window ends. If a dispute is raised, our team will review and update you.",
  "Final split",
  "Provider fare",
  "Platform fee",
  "Host reimbursement",
  "You&apos;ll receive",
  "Payout will be processed after the dispute window.",
  "Payout is held while RidePod reviews the dispute.",
  "Settlement is final. Payout can be processed.",
  "Payout completed.",
  "Guests can raise a dispute until",
  "48h remaining",
  "View settlement details",
  "Help center",
  "Settlement details",
  "Verified final fare",
  "Booking fare cap",
  "Within cap",
  "Above cap - manual review required",
  "Split breakdown",
  "Provider fare / meter fare",
  "Billable guests",
  "Fare share per guest",
  "Platform fee total",
  "Host own share",
  "deducted / not reimbursed",
  "Guest final charge",
  "Guests cannot be charged above their approved max unless they approved an increase.",
  "Proof type",
  "Meter proof / taxi receipt",
  "Final receipt",
  "Verified proof controls final settlement.",
  "Guests can report an issue until the dispute window ends. If no issue is reported, settlement finalizes automatically.",
  "Report an issue",
  "Tell RidePod what looks wrong. Our team will review the proof, fare, route, and ride timeline.",
  "Wrong fare",
  "Wrong route",
  "I did not take this ride",
  "Receipt or proof looks wrong",
  "Host issue",
  "Other",
  "Describe the issue",
  "Add screenshot or proof",
  "Submit issue",
  "RidePod will review this issue. Payout may be held until the review is complete.",
]) {
  assert.ok(
    recurringInstanceProofFlowSource.includes(recurringInstanceCopy),
    `Missing recurring ride instance proof copy: ${recurringInstanceCopy}`,
  );
}
assert.equal(`${uiSource}\n${moneySafetyUiSource}`.includes("gal only"), false);
assert.equal(`${uiSource}\n${moneySafetyUiSource}`.includes("boy and gal"), false);

const demoPodIds = [
  "women-only-demo",
  "mixed-open-demo",
  "airport-sfo-721",
  "locked-no-quote-demo",
  "usc-lax-001",
  "campus-commute-442",
  "host-replacement-demo",
  "private-car-napa-906",
  "settlement-complete-demo",
];
for (const podId of demoPodIds) {
  assert.ok(mockData.getPod(podId), `Missing UI demo pod ${podId}`);
  assert.ok(moneySafetyMock.getProtectedPod(podId), `Missing protected demo pod ${podId}`);
}
assert.equal(mockData.getPod("women-only-demo").genderMode, "women_only");
assert.equal(mockData.getPod("mixed-open-demo").genderMode, "mixed");
assert.equal(mockData.getPod("airport-sfo-721").moneyStatus, "waiting_for_riders");
assert.equal(mockData.getPod("locked-no-quote-demo").moneyStatus, "seat_locked");
assert.equal(mockData.getPod("usc-lax-001").moneyStatus, "host_can_book");
assert.equal(mockData.getPod("campus-commute-442").moneyStatus, "quote_approval_needed");
assert.equal(mockData.getPod("host-replacement-demo").moneyStatus, "host_replacement_needed");
assert.equal(mockData.getPod("private-car-napa-906").moneyStatus, "receipt_pending");
assert.equal(mockData.getPod("settlement-complete-demo").moneyStatus, "settlement_ready");
assert.equal(moneySafety.canHostBook("u1", moneySafetyMock.getProtectedPod("airport-sfo-721")).canBook, false);
assert.equal(moneySafety.canHostBook("u1", moneySafetyMock.getProtectedPod("locked-no-quote-demo")).canBook, false);
assert.equal(moneySafety.canHostBook("u1", moneySafetyMock.getProtectedPod("usc-lax-001")).canBook, true);
assert.equal(moneySafety.canHostBook("u4", moneySafetyMock.getProtectedPod("campus-commute-442")).canBook, false);
const stripeSource = [
  "src/lib/stripe-config.ts",
  "src/lib/stripe-setup.ts",
  "src/lib/stripe-seat-authorization.ts",
  "src/lib/stripe-settlement-capture.ts",
  "src/lib/stripe-webhooks.ts",
  "src/lib/stripe-connect.ts",
  "src/lib/stripe-host-reimbursement.ts",
  "src/lib/stripe-refunds.ts",
  "src/app/api/stripe/setup-intent/route.ts",
  "src/app/api/stripe/webhook/route.ts",
  "src/app/api/stripe/connect/onboarding/route.ts",
]
  .filter((path) => existsSync(path))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
assert.equal(stripeSource.includes("NEXT_PUBLIC_STRIPE_SECRET_KEY"), false);
assert.equal(/console\.(?:log|warn|error)\([^)]*secret/i.test(stripeSource), false);
assert.equal(/\bpayouts\.create\s*\(/.test(stripeSource), false);
assert.equal(/\b(?:cardNumber|card_number|cvc)\b/i.test(stripeSource), false);

assert.equal(stripeConfig.getConfiguredPaymentProvider({}), "MOCK");
assert.equal(stripeConfig.getConfiguredPaymentProviderName({}), "MOCK");
assert.equal(stripeConfig.getConfiguredPaymentProvider({ PAYMENT_PROVIDER: "MOCK" }), "MOCK");
assert.equal(stripeConfig.getConfiguredPaymentProvider({ PAYMENT_PROVIDER: "STRIPE_TEST" }), "STRIPE");
assert.equal(stripeConfig.getConfiguredPaymentProviderName({ PAYMENT_PROVIDER: "STRIPE_TEST" }), "STRIPE_TEST");
assert.equal(stripeConfig.getConfiguredPaymentProvider({ RIDEPOD_PAYMENT_PROVIDER: "STRIPE_TEST" }), "STRIPE");
assert.deepEqual(stripeConfig.getStripeTestConfig({ STRIPE_SECRET_KEY: "sk_live_bad" }), {
  ok: false,
  error: "STRIPE_LIVE_KEYS_NOT_ALLOWED",
});
assert.deepEqual(stripeConfig.getStripeTestConfig({}), {
  ok: false,
  error: "STRIPE_SECRET_KEY_REQUIRED",
});
assert.deepEqual(stripeConfig.getStripeTestConfig({ STRIPE_SECRET_KEY: "sk_test_123", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_bad" }), {
  ok: false,
  error: "STRIPE_LIVE_KEYS_NOT_ALLOWED",
});
assert.equal(stripeConfig.getStripeTestConfig({ STRIPE_SECRET_KEY: "sk_test_123" }).ok, true);
assert.deepEqual(stripeConfig.getStripeWebhookConfig({ STRIPE_SECRET_KEY: "sk_test_123" }), {
  ok: false,
  error: "STRIPE_WEBHOOK_SECRET_REQUIRED",
});
assert.deepEqual(stripeConfig.getStripeWebhookConfig({ STRIPE_SECRET_KEY: "sk_test_123", STRIPE_WEBHOOK_SECRET: "not_whsec" }), {
  ok: false,
  error: "STRIPE_WEBHOOK_SECRET_INVALID",
});
assert.equal(stripeConfig.getStripeWebhookConfig({ STRIPE_SECRET_KEY: "sk_test_123", STRIPE_WEBHOOK_SECRET: "whsec_123" }).ok, true);
assert.equal(stripeConfig.assertStripeTestModeConfig({ STRIPE_SECRET_KEY: "sk_test_123" }).secretKey, "sk_test_123");
assert.throws(
  () => stripeConfig.assertStripeTestModeConfig({ STRIPE_SECRET_KEY: "sk_live_bad" }),
  /STRIPE_LIVE_KEYS_NOT_ALLOWED/,
);
assert.equal(paymentProvider.getPaymentProvider({}).provider, "MOCK");
const stripeProviderMissingConfig = paymentProvider.getPaymentProvider({ PAYMENT_PROVIDER: "STRIPE_TEST" });
assert.equal(stripeProviderMissingConfig.provider, "STRIPE");
assert.deepEqual(
  await stripeProviderMissingConfig.createSeatAuthorization({
    podId: "pod-stripe-config",
    podMemberId: "pm-stripe-config",
    userId: "u2",
    amountAuthorizedCents: 1200,
    maxChargeCents: 1200,
    platformFeeCents: 200,
    approvedMaxTotalFareCents: 4000,
    currency: "USD",
  }),
  {
    ok: false,
    provider: "STRIPE",
    paymentIntent: null,
    error: "STRIPE_SECRET_KEY_REQUIRED",
  },
);
const stripeProviderStub = paymentProvider.getPaymentProvider({
  PAYMENT_PROVIDER: "STRIPE_TEST",
  STRIPE_SECRET_KEY: "sk_test_123",
});
assert.equal(
  (await stripeProviderStub.authorizeSeat({
    podId: "pod-stripe-stub",
    podMemberId: "pm-stripe-stub",
    userId: "u2",
    amountAuthorizedCents: 1200,
    maxChargeCents: 1200,
    platformFeeCents: 200,
    approvedMaxTotalFareCents: 4000,
    currency: "USD",
  })).error,
  "STRIPE_CUSTOMER_REQUIRED",
);
assert.equal((await stripeProviderMissingConfig.createSetupIntent({ userId: "u2" })).error, "STRIPE_SECRET_KEY_REQUIRED");
const stripeProviderMissingIntentInput = {
  podId: "pod-stripe-stub",
  podMemberId: "pm-stripe-stub",
  userId: "u2",
  localPaymentIntentId: "pi-local-stripe-stub",
  externalPaymentIntentId: null,
  finalChargeCents: 1200,
  amountAuthorizedCents: 1200,
  maxChargeCents: 1200,
  currency: "USD",
};
assert.equal(
  (await stripeProviderStub.captureAuthorizedPayment(stripeProviderMissingIntentInput)).error,
  "STRIPE_PAYMENT_INTENT_ID_REQUIRED",
);
assert.equal(
  (await stripeProviderStub.cancelAuthorization(stripeProviderMissingIntentInput)).error,
  "STRIPE_PAYMENT_INTENT_ID_REQUIRED",
);

const now = "2026-05-13T12:00:00.000Z";

function user(overrides = {}) {
  return {
    id: "u-test",
    name: "Test User",
    genderIdentity: "FEMALE",
    genderVerifiedAt: now,
    verificationStatus: "PHONE_VERIFIED",
    communityId: "usc",
    trustScore: 4.8,
    noShowCount: 0,
    lateCancelCount: 0,
    safetyReportCount: 0,
    riskStatus: "NORMAL",
    stripeCustomerId: null,
    stripeConnectAccountId: null,
    payoutsEnabled: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function member(userId, overrides = {}) {
  return {
    id: `pm-${userId}`,
    podId: "pod-test",
    userId,
    role: "RIDER",
    memberState: "CONFIRMED",
    paymentState: "AUTHORIZED",
    seatCount: 1,
    maxChargeCents: moneySafety.cents(33),
    estimatedShareCents: moneySafety.cents(20),
    finalChargeCents: null,
    platformFeeCents: moneySafety.cents(2),
    cancellationLiabilityCents: null,
    noShowLiabilityCents: null,
    joinedAt: now,
    lockedAt: now,
    canceledAt: null,
    cancelReason: null,
    checkinState: "NOT_CHECKED_IN",
    trustDelta: null,
    eligibilityPassed: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function podMember(podId, userId, overrides = {}) {
  return member(userId, {
    id: `pm-${podId}-${userId}`,
    podId,
    ...overrides,
  });
}

function settlementMember(podId, userId, overrides = {}) {
  return podMember(podId, userId, {
    memberState: "COMPLETED",
    paymentState: "CAPTURED",
    maxChargeCents: moneySafety.cents(1000),
    platformFeeCents: 0,
    finalChargeCents: null,
    createdAt: `2026-05-11T10:0${["u1", "u2", "u6", "u7"].indexOf(userId) + 1}:00.000Z`,
    ...overrides,
  });
}

function localPaymentIntent(overrides = {}) {
  return {
    id: `ridepod-pi-${overrides.podMemberId ?? "pm-test"}`,
    provider: "MOCK",
    intentType: "SEAT_AUTHORIZATION",
    captureMethod: "MANUAL",
    podId: overrides.podId ?? "pod-test",
    podMemberId: overrides.podMemberId ?? "pm-test",
    userId: overrides.userId ?? "u2",
    externalPaymentIntentId: overrides.externalPaymentIntentId ?? "mock_pi_test",
    amountAuthorizedCents: overrides.amountAuthorizedCents ?? moneySafety.cents(50),
    amountCapturedCents: overrides.amountCapturedCents ?? 0,
    amountRefundedCents: overrides.amountRefundedCents ?? 0,
    currency: overrides.currency ?? "USD",
    status: overrides.status ?? "AUTHORIZED",
    authorizationExpiresAt: overrides.authorizationExpiresAt ?? null,
    idempotencyKey: overrides.idempotencyKey ?? null,
    failureCode: overrides.failureCode ?? null,
    failureMessage: overrides.failureMessage ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

function settlementRecord(podId, overrides = {}) {
  return {
    id: `settlement-${podId}`,
    podId,
    settlementState: "FINALIZED",
    version: 1,
    approvedFareCents: moneySafety.cents(60),
    verifiedFareCents: moneySafety.cents(60),
    billableSeatCount: 2,
    totalPlatformFeeCents: 0,
    hostReimbursementCents: moneySafety.cents(60),
    hostRewardCents: 0,
    roundingPolicy: "test",
    disputeDeadlineAt: null,
    adminReviewRequired: false,
    items: [],
    createdAt: now,
    finalizedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function hostReimbursementRecord(podId, settlementId, hostUserId = "u1", overrides = {}) {
  return {
    id: `host-reimbursement-${podId}`,
    podId,
    settlementId,
    hostUserId,
    fareReimbursementCents: moneySafety.cents(60),
    hostRewardCents: 0,
    adjustmentCents: 0,
    totalTransferCents: moneySafety.cents(60),
    payoutState: "PENDING",
    externalTransferId: null,
    scheduledAt: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const createdStripeCustomers = [];
const createdStripeSetupIntents = [];
const createdStripeConnectAccounts = [];
const retrievedStripeConnectAccounts = [];
const createdStripeAccountLinks = [];
const createdStripeTransfers = [];
const createdStripeRefunds = [];
const fakeStripe = {
  customers: {
    create: async (input) => {
      createdStripeCustomers.push(input);
      return { id: `cus_test_${createdStripeCustomers.length}` };
    },
  },
  setupIntents: {
    create: async (input) => {
      createdStripeSetupIntents.push(input);
      return {
        id: `seti_test_${createdStripeSetupIntents.length}`,
        client_secret: `seti_test_${createdStripeSetupIntents.length}_secret_test`,
      };
    },
  },
  accounts: {
    create: async (input) => {
      createdStripeConnectAccounts.push(input);
      return {
        id: `acct_test_${createdStripeConnectAccounts.length}`,
        charges_enabled: false,
        payouts_enabled: false,
        requirements: { currently_due: ["external_account"], past_due: [] },
      };
    },
    retrieve: async (accountId) => {
      retrievedStripeConnectAccounts.push(accountId);
      return {
        id: accountId,
        charges_enabled: accountId.includes("complete"),
        payouts_enabled: accountId.includes("complete"),
        requirements: accountId.includes("complete") ? { currently_due: [], past_due: [] } : { currently_due: ["external_account"], past_due: [] },
      };
    },
  },
  accountLinks: {
    create: async (input) => {
      createdStripeAccountLinks.push(input);
      return {
        url: `https://connect.stripe.test/setup/${input.account}`,
        expires_at: 1770000000,
      };
    },
  },
  transfers: {
    create: async (input, options) => {
      createdStripeTransfers.push({ input, options });
      return { id: `tr_test_${createdStripeTransfers.length}` };
    },
  },
  refunds: {
    create: async (input, options) => {
      createdStripeRefunds.push({ input, options });
      return { id: `re_test_${createdStripeRefunds.length}`, amount: input.amount, status: "succeeded" };
    },
  },
};
const stripeTestEnv = { PAYMENT_PROVIDER: "STRIPE_TEST", STRIPE_SECRET_KEY: "sk_test_123" };

moneySafetyMock.protectedUsers.push(
  user({ id: "stripe-existing-user", email: "existing-stripe@example.com", stripeCustomerId: "cus_existing_123" }),
  user({ id: "stripe-new-user", email: "new-stripe@example.com", stripeCustomerId: null }),
  user({ id: "stripe-mock-user", email: "mock-stripe@example.com", stripeCustomerId: null }),
  user({ id: "stripe-host-new", email: "host-new@example.com", stripeConnectAccountId: null, payoutsEnabled: false }),
  user({ id: "stripe-host-existing", email: "host-existing@example.com", stripeConnectAccountId: "acct_complete_existing", payoutsEnabled: false }),
  user({ id: "stripe-host-mock", email: "host-mock@example.com", stripeConnectAccountId: null, payoutsEnabled: false }),
  user({ id: "stripe-host-suspended", email: "host-suspended@example.com", riskStatus: "SUSPENDED", stripeConnectAccountId: null }),
);

const existingCustomer = await stripeSetup.createOrGetStripeCustomer("stripe-existing-user", {
  env: stripeTestEnv,
  stripe: fakeStripe,
});
assert.deepEqual(existingCustomer, {
  ok: true,
  provider: "STRIPE",
  customerId: "cus_existing_123",
  reused: true,
});
assert.equal(createdStripeCustomers.length, 0);

const mockCustomerAttempt = await stripeSetup.createOrGetStripeCustomer("stripe-mock-user", {
  env: { PAYMENT_PROVIDER: "MOCK", STRIPE_SECRET_KEY: "sk_test_123" },
  stripe: fakeStripe,
});
assert.equal(mockCustomerAttempt.error, "PAYMENT_PROVIDER_MOCK");
assert.equal(moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-mock-user").stripeCustomerId, null);

const mockConnectAttempt = await stripeConnect.createOrGetHostConnectedAccount("stripe-host-mock", {
  env: { PAYMENT_PROVIDER: "MOCK", STRIPE_SECRET_KEY: "sk_test_123" },
  stripe: fakeStripe,
});
assert.equal(mockConnectAttempt.error, "PAYMENT_PROVIDER_MOCK");
assert.equal(moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-host-mock").stripeConnectAccountId, null);

assert.equal(
  (await stripeConnect.createOrGetHostConnectedAccount("stripe-host-new", {
    env: { PAYMENT_PROVIDER: "STRIPE_TEST" },
    stripe: fakeStripe,
  })).error,
  "STRIPE_SECRET_KEY_REQUIRED",
);
assert.equal(
  (await stripeConnect.createOrGetHostConnectedAccount("stripe-host-new", {
    env: { PAYMENT_PROVIDER: "STRIPE_TEST", STRIPE_SECRET_KEY: "sk_live_bad" },
    stripe: fakeStripe,
  })).error,
  "STRIPE_LIVE_KEYS_NOT_ALLOWED",
);

const suspendedConnectAttempt = await stripeConnect.createOrGetHostConnectedAccount("stripe-host-suspended", {
  env: stripeTestEnv,
  stripe: fakeStripe,
});
assert.equal(suspendedConnectAttempt.error, "HOST_CONNECT_NOT_ALLOWED");

const existingConnectAccount = await stripeConnect.createOrGetHostConnectedAccount("stripe-host-existing", {
  env: stripeTestEnv,
  stripe: fakeStripe,
});
assert.equal(existingConnectAccount.ok, true);
assert.equal(existingConnectAccount.reused, true);
assert.equal(existingConnectAccount.accountId, "acct_complete_existing");
assert.equal(existingConnectAccount.payoutsEnabled, true);
assert.equal(moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-host-existing").payoutsEnabled, true);

const newConnectAccount = await stripeConnect.createOrGetHostConnectedAccount("stripe-host-new", {
  env: stripeTestEnv,
  stripe: fakeStripe,
});
assert.equal(newConnectAccount.ok, true);
assert.equal(newConnectAccount.reused, false);
assert.equal(newConnectAccount.accountId, "acct_test_1");
assert.equal(newConnectAccount.payoutsEnabled, false);
assert.equal(moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-host-new").stripeConnectAccountId, "acct_test_1");
assert.equal(moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-host-new").payoutsEnabled, false);
assert.deepEqual(createdStripeConnectAccounts[0].metadata, {
  userId: "stripe-host-new",
  app: "RidePod",
  environment: "test",
  purpose: "host_reimbursement",
});
assert.deepEqual(createdStripeConnectAccounts[0].capabilities, {
  transfers: { requested: true },
});

const onboardingLink = await stripeConnect.createHostOnboardingLink("stripe-host-new", {
  env: stripeTestEnv,
  stripe: fakeStripe,
  returnUrl: "https://ridepod.test/host/return",
  refreshUrl: "https://ridepod.test/host/refresh",
});
assert.equal(onboardingLink.ok, true);
assert.equal(onboardingLink.accountId, "acct_test_1");
assert.equal(onboardingLink.url, "https://connect.stripe.test/setup/acct_test_1");
assert.equal(onboardingLink.expiresAt, "2026-02-02T02:40:00.000Z");
assert.deepEqual(createdStripeAccountLinks[0], {
  account: "acct_test_1",
  refresh_url: "https://ridepod.test/host/refresh",
  return_url: "https://ridepod.test/host/return",
  type: "account_onboarding",
});
assert.equal(moneySafetyMock.mockHostReimbursements.length, 0);
assert.equal(moneySafetyMock.mockAuditEvents.some((event) => event.eventType === "STRIPE_CONNECT_ACCOUNT_CREATED"), true);
assert.equal(moneySafetyMock.mockAuditEvents.some((event) => event.eventType === "STRIPE_CONNECT_ONBOARDING_LINK_CREATED"), true);

const refreshedConnectStatus = await stripeConnect.refreshHostConnectStatus("stripe-host-existing", {
  env: stripeTestEnv,
  stripe: fakeStripe,
});
assert.equal(refreshedConnectStatus.ok, true);
assert.equal(refreshedConnectStatus.payoutsEnabled, true);

const originalConnectEnv = {
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
};
process.env.PAYMENT_PROVIDER = "MOCK";
process.env.STRIPE_SECRET_KEY = undefined;
const connectRouteResponse = await stripeConnectRoute.POST(
  new Request("http://localhost/api/stripe/connect/onboarding", {
    method: "POST",
    body: JSON.stringify({
      userId: "stripe-host-existing",
      returnUrl: "https://ridepod.test/host",
      refreshUrl: "https://ridepod.test/host",
    }),
  }),
);
assert.equal(connectRouteResponse.status, 400);
process.env.PAYMENT_PROVIDER = originalConnectEnv.PAYMENT_PROVIDER;
process.env.STRIPE_SECRET_KEY = originalConnectEnv.STRIPE_SECRET_KEY;

const newCustomer = await stripeSetup.createOrGetStripeCustomer("stripe-new-user", {
  env: stripeTestEnv,
  stripe: fakeStripe,
});
assert.equal(newCustomer.ok, true);
assert.equal(newCustomer.customerId, "cus_test_1");
assert.equal(newCustomer.reused, false);
assert.equal(moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-new-user").stripeCustomerId, "cus_test_1");
assert.deepEqual(createdStripeCustomers[0].metadata, {
  userId: "stripe-new-user",
  app: "RidePod",
  environment: "test",
});

const lifecycleBeforeSetupIntent = moneySafetyMock.protectedPods[0].lifecycleState;
const memberStateBeforeSetupIntent = moneySafetyMock.protectedPods[0].members[0].memberState;
const setupIntent = await stripeSetup.createSetupIntent("stripe-new-user", {
  env: stripeTestEnv,
  stripe: fakeStripe,
});
assert.deepEqual(setupIntent, {
  ok: true,
  provider: "STRIPE",
  setupIntentId: "seti_test_1",
  clientSecret: "seti_test_1_secret_test",
  customerId: "cus_test_1",
});
assert.deepEqual(createdStripeSetupIntents[0], {
  customer: "cus_test_1",
  usage: "off_session",
  payment_method_types: ["card"],
  metadata: {
    userId: "stripe-new-user",
    purpose: "ridepod_payment_method_setup",
  },
});
assert.equal(moneySafetyMock.protectedPods[0].lifecycleState, lifecycleBeforeSetupIntent);
assert.equal(moneySafetyMock.protectedPods[0].members[0].memberState, memberStateBeforeSetupIntent);
assert.equal(moneySafetyMock.mockPaymentIntents.some((intent) => intent.userId === "stripe-new-user"), false);

const mockSetupAttempt = await stripeSetup.createSetupIntent("stripe-mock-user", {
  env: { PAYMENT_PROVIDER: "MOCK", STRIPE_SECRET_KEY: "sk_test_123" },
  stripe: fakeStripe,
});
assert.equal(mockSetupAttempt.error, "PAYMENT_PROVIDER_MOCK");

function pod(overrides = {}) {
  return {
    id: "pod-test",
    hostUserId: "host",
    lifecycleState: "FORMING",
    bookingState: "QUOTE_ALLOWED",
    genderMode: "MIXED",
    accessMode: "OPEN",
    inviteCode: null,
    communityId: "usc",
    minTrustScore: null,
    originGeneral: "USC",
    destinationGeneral: "LAX",
    pickupDetail: null,
    dropoffDetail: null,
    departureAt: now,
    departureWindowMinutes: 15,
    targetSeats: 4,
    minSeatsToBook: 3,
    maxSeats: 4,
    estimatedTotalFareCents: moneySafety.cents(74),
    approvedMaxTotalFareCents: moneySafety.cents(90),
    currency: "USD",
    ridepodFeeCents: moneySafety.cents(2),
    providerPolicy: null,
    cancellationPolicyId: null,
    lockDeadlineAt: null,
    bookingDeadlineAt: null,
    chatUnlockedAt: null,
    detailsUnlockedAt: null,
    hostReplacementStartedAt: null,
    originalHostUserId: null,
    replacementHostUserId: null,
    members: [member("host", { role: "HOST" })],
    quotes: [],
    receipts: [],
    adminReviewRequired: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function stripeAuthorizationProvider(status, captured = {}) {
  const calls = [];
  return {
    calls,
    provider: paymentProvider.createStripeTestProvider(stripeTestEnv, {
      paymentIntents: {
        create: async (input, options) => {
          calls.push({ input, options });
          if (status === "throw") {
            const error = new Error("Card declined.");
            error.code = "card_declined";
            throw error;
          }

          return {
            id: captured.id ?? `pi_${status}_${calls.length}`,
            status,
            amount: input.amount,
            currency: input.currency,
            last_payment_error:
              status === "requires_payment_method"
                ? { code: "card_declined", message: "Card declined." }
                : null,
          };
        },
      },
    }),
  };
}

const stripeAuthUser = moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "u2");
stripeAuthUser.stripeCustomerId = "cus_auth_u2";
const stripeAuthSuccessPod = pod({
  id: "stripe-auth-success",
  hostUserId: "u1",
  minSeatsToBook: 3,
  maxSeats: 4,
  targetSeats: 4,
  members: [podMember("stripe-auth-success", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(stripeAuthSuccessPod);
const stripeRequiresCapture = stripeAuthorizationProvider("requires_capture", { id: "pi_requires_capture_success" });
const stripeAuthorization = await podJoin.authorizeSeat("u2", "stripe-auth-success", {
  stripePaymentMethodId: "pm_card_visa",
  idempotencyKey: "seat-auth-stripe-success-u2",
  paymentProvider: stripeRequiresCapture.provider,
});
assert.equal(stripeAuthorization.ok, true);
assert.equal(stripeAuthorization.member.memberState, "CONFIRMED");
assert.equal(stripeAuthorization.member.paymentState, "AUTHORIZED");
assert.equal(stripeAuthorization.paymentIntent.provider, "STRIPE");
assert.equal(stripeAuthorization.paymentIntent.externalPaymentIntentId, "pi_requires_capture_success");
assert.equal(stripeAuthorization.paymentIntent.status, "AUTHORIZED");
assert.equal(stripeAuthorization.paymentIntent.captureMethod, "MANUAL");
assert.equal(stripeAuthorization.paymentIntent.amountAuthorizedCents, stripeAuthorization.member.maxChargeCents);
assert.equal(stripeAuthorization.paymentIntent.amountCapturedCents, 0);
assert.equal(stripeAuthorization.paymentIntent.amountRefundedCents, 0);
assert.equal(stripeAuthorization.paymentIntent.currency, "USD");
assert.equal(stripeAuthorization.paymentIntent.idempotencyKey, "seat-auth-stripe-success-u2");
assert.equal(stripeRequiresCapture.calls[0].input.amount, stripeAuthorization.member.maxChargeCents);
assert.equal(stripeRequiresCapture.calls[0].input.currency, "usd");
assert.equal(stripeRequiresCapture.calls[0].input.customer, "cus_auth_u2");
assert.equal(stripeRequiresCapture.calls[0].input.payment_method, "pm_card_visa");
assert.equal(stripeRequiresCapture.calls[0].input.capture_method, "manual");
assert.equal(stripeRequiresCapture.calls[0].input.confirm, true);
assert.deepEqual(stripeRequiresCapture.calls[0].input.metadata, {
  podId: "stripe-auth-success",
  podMemberId: stripeAuthorization.member.id,
  userId: "u2",
  chargeType: "seat_authorization",
  approvedMaxTotalFareCents: String(stripeAuthSuccessPod.approvedMaxTotalFareCents),
  maxChargeCents: String(stripeAuthorization.member.maxChargeCents),
  platformFeeCents: String(stripeAuthorization.member.platformFeeCents),
  environment: "test",
});
assert.equal(stripeAuthorization.pod.lifecycleState, "PAYMENT_LOCKING");
assert.notEqual(stripeAuthorization.pod.lifecycleState, "HOST_CAN_BOOK");

const stripeFailedPod = pod({
  id: "stripe-auth-failed",
  hostUserId: "u1",
  members: [podMember("stripe-auth-failed", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(stripeFailedPod);
const stripeRequiresPaymentMethod = stripeAuthorizationProvider("requires_payment_method");
const failedStripeAuthorization = await podJoin.authorizeSeat("u2", "stripe-auth-failed", {
  stripePaymentMethodId: "pm_card_declined",
  paymentProvider: stripeRequiresPaymentMethod.provider,
});
assert.equal(failedStripeAuthorization.ok, false);
assert.equal(failedStripeAuthorization.member.memberState, "REQUESTED");
assert.equal(failedStripeAuthorization.member.paymentState, "NOT_STARTED");
assert.equal(failedStripeAuthorization.paymentIntent.status, "REQUIRES_PAYMENT_METHOD");
assert.equal(failedStripeAuthorization.paymentIntent.failureCode, "card_declined");

const stripeActionPod = pod({
  id: "stripe-auth-action",
  hostUserId: "u1",
  members: [podMember("stripe-auth-action", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(stripeActionPod);
const stripeRequiresAction = stripeAuthorizationProvider("requires_action");
const actionStripeAuthorization = await podJoin.authorizeSeat("u2", "stripe-auth-action", {
  stripePaymentMethodId: "pm_card_authenticationRequired",
  paymentProvider: stripeRequiresAction.provider,
});
assert.equal(actionStripeAuthorization.ok, false);
assert.equal(actionStripeAuthorization.member.memberState, "REQUESTED");
assert.equal(actionStripeAuthorization.member.paymentState, "NOT_STARTED");
assert.equal(actionStripeAuthorization.error, "STRIPE_PAYMENT_REQUIRES_ACTION");
assert.equal(actionStripeAuthorization.paymentIntent.status, "REQUIRES_ACTION");

const stripeMissingMethodPod = pod({
  id: "stripe-auth-missing-method",
  hostUserId: "u1",
  members: [podMember("stripe-auth-missing-method", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(stripeMissingMethodPod);
const missingMethodAuthorization = await podJoin.authorizeSeat("u2", "stripe-auth-missing-method", {
  paymentProvider: stripeRequiresCapture.provider,
});
assert.equal(missingMethodAuthorization.ok, false);
assert.equal(missingMethodAuthorization.error, "STRIPE_PAYMENT_METHOD_REQUIRED");
assert.equal(missingMethodAuthorization.member.memberState, "REQUESTED");

const stripeLockPod = pod({
  id: "stripe-auth-locks",
  hostUserId: "u1",
  minSeatsToBook: 3,
  maxSeats: 4,
  targetSeats: 4,
  members: [podMember("stripe-auth-locks", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(stripeLockPod);
const stripeAuthUserTwo = moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "u6");
stripeAuthUserTwo.stripeCustomerId = "cus_auth_u6";
assert.equal(
  (await podJoin.authorizeSeat("u2", "stripe-auth-locks", {
    stripePaymentMethodId: "pm_card_visa",
    paymentProvider: stripeAuthorizationProvider("requires_capture").provider,
  })).pod.lifecycleState,
  "PAYMENT_LOCKING",
);
const secondStripeAuthorization = await podJoin.authorizeSeat("u6", "stripe-auth-locks", {
  stripePaymentMethodId: "pm_card_mastercard",
  paymentProvider: stripeAuthorizationProvider("requires_capture").provider,
});
assert.equal(secondStripeAuthorization.pod.lifecycleState, "LOCKED");
assert.notEqual(secondStripeAuthorization.pod.lifecycleState, "HOST_CAN_BOOK");

const womenOnly = pod({ genderMode: "WOMEN_ONLY", accessMode: "VERIFIED_ONLY" });
const maleWomenOnly = moneySafety.checkPodEligibility(user({ genderIdentity: "MALE" }), womenOnly);
const unknownWomenOnly = moneySafety.checkPodEligibility(user({ genderIdentity: "UNKNOWN" }), womenOnly);
const unverifiedFemaleWomenOnly = moneySafety.checkPodEligibility(user({ genderVerifiedAt: null }), womenOnly);
const eligibleWomenOnly = moneySafety.checkPodEligibility(user(), womenOnly);
assert.equal(maleWomenOnly.eligible, false);
assert.equal(
  maleWomenOnly.blockingReason,
  "This is a Women-only pod. Your profile is not eligible for this pod.",
);
assert.equal(unknownWomenOnly.eligible, false);
assert.equal(unverifiedFemaleWomenOnly.eligible, false);
assert.equal(unverifiedFemaleWomenOnly.requiredAction, "GENDER_VERIFICATION_REQUIRED");
assert.equal(unverifiedFemaleWomenOnly.blockingReason, "This pod requires gender verification before joining.");
assert.equal(eligibleWomenOnly.eligible, true);

assert.equal(
  moneySafety.checkPodEligibility(
    user({ verificationStatus: "EMAIL_VERIFIED" }),
    pod({ accessMode: "VERIFIED_ONLY" }),
  ).eligible,
  false,
);

const mixedPod = moneySafety.checkPodEligibility(user({ genderIdentity: "UNKNOWN" }), pod({ genderMode: "MIXED" }));
assert.equal(mixedPod.eligible, true);
assert.ok(mixedPod.reasons.includes("Mixed pod."));
assert.deepEqual(moneySafety.getSafetyBadges(pod({ genderMode: "MIXED", accessMode: "OPEN" })), ["Mixed pod"]);
assert.deepEqual(moneySafety.getSafetyBadges(pod({ genderMode: "WOMEN_ONLY", accessMode: "VERIFIED_ONLY" })), [
  "Women-only",
  "Verified-only",
]);

assert.equal(
  moneySafety.checkPodEligibility(
    user({ communityId: "other" }),
    pod({ accessMode: "COMMUNITY_ONLY", communityId: "usc" }),
  ).eligible,
  false,
);
assert.equal(
  moneySafety.checkPodEligibility(
    user({ communityId: "usc", verificationStatus: "COMMUNITY_VERIFIED" }),
    pod({ accessMode: "COMMUNITY_ONLY", communityId: "usc" }),
  ).eligible,
  true,
);
const missingCommunity = moneySafety.checkPodEligibility(
  user({ communityId: null, verificationStatus: "COMMUNITY_VERIFIED" }),
  pod({ accessMode: "COMMUNITY_ONLY", communityId: null }),
);
assert.equal(missingCommunity.eligible, false);
assert.equal(missingCommunity.requiredAction, "COMMUNITY_VERIFICATION_REQUIRED");
assert.equal(
  moneySafety.checkPodEligibility(
    user({ trustScore: 4.1, noShowCount: 1 }),
    pod({ accessMode: "HIGH_TRUST_ONLY", minTrustScore: 4.5 }),
  ).blockingReason,
  "This pod requires a higher trust level.",
);
assert.equal(
  moneySafety.checkPodEligibility(
    user({ trustScore: 4.1, noShowCount: 1 }),
    pod({ accessMode: "HIGH_TRUST_ONLY", minTrustScore: 4.5 }),
  ).eligible,
  false,
);
assert.equal(
  moneySafety.checkPodEligibility(user(), pod({ accessMode: "INVITE_ONLY", inviteCode: "abc" })).eligible,
  false,
);
assert.equal(
  moneySafety.checkPodEligibility(user(), pod({ accessMode: "INVITE_ONLY", inviteCode: "abc" }), { inviteCode: "abc" }).eligible,
  true,
);

assert.equal(
  moneySafety.checkPodEligibility(
    user({ id: "invited" }),
    pod({ accessMode: "INVITE_ONLY", inviteCode: "abc" }),
    { hasInviteMembership: true },
  ).eligible,
  true,
);

const suspendedEligibility = moneySafety.checkPodEligibility(
  user({ genderIdentity: "MALE", riskStatus: "SUSPENDED" }),
  pod({ genderMode: "WOMEN_ONLY" }),
);
assert.equal(suspendedEligibility.eligible, false);
assert.equal(suspendedEligibility.requiredAction, "CONTACT_SUPPORT");
assert.equal(suspendedEligibility.blockingReason, "Your account cannot join protected pods right now.");

const restrictedEligibility = moneySafety.checkPodEligibility(
  user({ riskStatus: "RESTRICTED" }),
  pod({ genderMode: "MIXED", accessMode: "OPEN" }),
);
assert.equal(restrictedEligibility.eligible, false);
assert.equal(restrictedEligibility.requiredAction, "CONTACT_SUPPORT");
assert.equal(restrictedEligibility.blockingReason, "Your account has limited access to protected pods.");

assert.equal(
  moneySafety.checkHostPodCreationEligibility(
    user({ genderIdentity: "MALE" }),
    pod({ genderMode: "WOMEN_ONLY", accessMode: "OPEN" }),
  ).eligible,
  false,
);
assert.equal(
  moneySafety.checkHostPodCreationEligibility(
    user({ genderIdentity: "FEMALE" }),
    pod({ genderMode: "WOMEN_ONLY", accessMode: "OPEN" }),
  ).eligible,
  true,
);

assert.equal(podEligibility.checkPodEligibility("u1", "women-only-demo").eligible, true);
assert.equal(podEligibility.checkPodEligibility("u2", "women-only-demo").eligible, false);
assert.equal(
  podEligibility.checkPodEligibility("u2", "women-only-demo").blockingReason,
  "This is a Women-only pod. Your profile is not eligible for this pod.",
);
assert.equal(podEligibility.checkPodEligibility("unknown-gender", "women-only-demo").eligible, false);
assert.equal(
  podEligibility.checkPodEligibility("u3", "women-only-demo").requiredAction,
  "GENDER_VERIFICATION_REQUIRED",
);
assert.equal(podEligibility.checkPodEligibility("u2", "mixed-open-demo").eligible, true);
assert.equal(podEligibility.checkPodEligibility("u3", "usc-lax-001").eligible, false);
assert.equal(
  podEligibility.checkPodEligibility("u3", "usc-lax-001").requiredAction,
  "PHONE_VERIFICATION_REQUIRED",
);
assert.equal(podEligibility.checkPodEligibility("wrong-community", "community-only-demo").eligible, false);
assert.equal(podEligibility.checkPodEligibility("low-trust", "high-trust-demo").eligible, false);
assert.equal(podEligibility.checkPodEligibility("u2", "invite-only-demo").eligible, false);
assert.equal(
  podEligibility.checkPodEligibility("u2", "invite-only-demo").requiredAction,
  "VALID_INVITE_REQUIRED",
);
assert.equal(podEligibility.checkPodEligibility("u2", "invite-only-demo", "INVITE-123").eligible, true);
assert.equal(podEligibility.checkPodEligibility("u1", "invite-only-demo").eligible, true);
assert.equal(podEligibility.checkPodEligibility("suspended", "mixed-open-demo").eligible, false);
assert.equal(
  podEligibility.checkPodCreationEligibility("u2", pod({ genderMode: "WOMEN_ONLY", accessMode: "OPEN" })).eligible,
  false,
);
assert.equal(
  podEligibility.checkPodCreationEligibility("u2", pod({ genderMode: "WOMEN_ONLY", accessMode: "OPEN" }), {
    hostIsRiding: false,
  }).eligible,
  true,
);
const profileEligibilityUser = podEligibility.profileToProtectedUser({
  id: "profile-user",
  display_name: "Profile User",
  email: "profile@example.com",
  gender_identity: "FEMALE",
  gender_verified_at: "2026-05-20T00:00:00.000Z",
  verification_status: "PHONE_VERIFIED",
  community_id: "usc",
  trust_score: 4.8,
  no_show_count: 0,
  late_cancel_count: 0,
  risk_status: "NORMAL",
});
assert.equal(profileEligibilityUser.genderIdentity, "FEMALE");
assert.equal(profileEligibilityUser.verificationStatus, "PHONE_VERIFIED");
assert.equal(profileEligibilityUser.riskStatus, "NORMAL");
assert.equal(
  podEligibility.profileToProtectedUser({ id: "fallback-profile" }).genderIdentity,
  "UNKNOWN",
);
assert.equal(
  podEligibility.profileToProtectedUser({ id: "fallback-profile" }).verificationStatus,
  "NONE",
);
assert.equal(
  podEligibility.checkProfilePodEligibility(
    { id: "supabase-profile", gender_identity: "FEMALE", gender_verified_at: "2026-05-20T00:00:00.000Z", verification_status: "PHONE_VERIFIED" },
    pod({ genderMode: "WOMEN_ONLY", accessMode: "VERIFIED_ONLY" }),
  ).eligible,
  true,
);

const ineligibleRequest = podJoin.requestJoinPod("u2", "women-only-demo");
assert.equal(ineligibleRequest.ok, false);
assert.equal(ineligibleRequest.eligibility.eligible, false);
assert.equal(
  moneySafetyMock.protectedPods
    .find((candidate) => candidate.id === "women-only-demo")
    .members.some((candidate) => candidate.userId === "u2"),
  false,
);
assert.equal((await podJoin.authorizeSeat("u2", "women-only-demo")).ok, false);
assert.ok(joinPodMapFirstSource.includes("You&rsquo;re eligible to join this pod."));
assert.ok(joinPodMapFirstSource.includes("You can&rsquo;t join this pod yet."));
assert.ok(joinPodMapFirstSource.includes("Update profile"));
assert.ok(joinPodMapFirstSource.includes("Verify account"));
assert.ok(joinPodMapFirstSource.includes("Enter invite code"));
assert.ok(joinPodMapFirstSource.includes("Contact support"));
assert.ok(joinPodMapFirstSource.includes("disabled={!isEligible || pending || authorized}"));
assert.ok(joinFlowSource.includes("requiredAction={eligibility.requiredAction}"));
assert.ok(createPodChooseTypeSource.includes("Women-only pods require the host profile to be eligible too."));
assert.ok(createPodFormSource.includes("Women-only pods require the host profile to be eligible too."));
assert.ok(podEligibilitySource.includes("profileToProtectedUser"));
assert.ok(podEligibilitySource.includes("gender_identity"));
assert.ok(podEligibilitySource.includes("verification_status"));
assert.ok(podEligibilitySource.includes("risk_status"));
assert.equal(joinPodMapFirstSource.includes("riskStatus"), false);
assert.equal(joinPodMapFirstSource.includes("genderIdentity"), false);
assert.equal(joinPodMapFirstSource.includes("admin notes"), false);

const publicHostMember = publicProfile.mapMemberToPublicProfileViewModel(
  { userId: "public-host", role: "HOST", paymentStatus: "authorized" },
  {
    id: "public-host",
    name: "Maya Chen",
    avatarUrl: "/avatars/maya.png",
    email: "maya@example.com",
    phone: "+12135550101",
    gender_identity: "FEMALE",
    id_verification_status: "VERIFIED",
    verification_status: "ID_VERIFIED",
    community_id: "usc",
    risk_status: "NORMAL",
    trust_score: 4.9,
    no_show_count: 0,
    late_cancel_count: 0,
    safety_note: "private",
  },
);
assert.equal(publicHostMember.displayName, "Maya Chen");
assert.equal(publicHostMember.roleLabel, "Host");
assert.equal(publicHostMember.memberStateLabel, "Seat locked");
assert.ok(publicHostMember.badges.includes("Verified"));
assert.ok(publicHostMember.badges.includes("Community"));
assert.equal(Object.hasOwn(publicHostMember, "email"), false);
assert.equal(Object.hasOwn(publicHostMember, "phone"), false);
assert.equal(Object.hasOwn(publicHostMember, "gender_identity"), false);
assert.equal(Object.hasOwn(publicHostMember, "risk_status"), false);
assert.equal(Object.hasOwn(publicHostMember, "trust_score"), false);
assert.equal(Object.hasOwn(publicHostMember, "no_show_count"), false);
assert.equal(Object.hasOwn(publicHostMember, "late_cancel_count"), false);
assert.equal(Object.hasOwn(publicHostMember, "safety_note"), false);
assert.equal(
  JSON.stringify(publicHostMember).includes("maya@example.com") ||
    JSON.stringify(publicHostMember).includes("+12135550101") ||
    JSON.stringify(publicHostMember).includes("FEMALE") ||
    JSON.stringify(publicHostMember).includes("NORMAL") ||
    JSON.stringify(publicHostMember).includes("private"),
  false,
);
assert.equal(
  publicProfile.mapMemberToPublicProfileViewModel({ userId: "guest", role: "RIDER" }, { name: "Guest User" }).roleLabel,
  "Guest",
);
assert.equal(
  publicProfile.mapMemberToPublicProfileViewModel({ userId: "guest", role: "GUEST" }, { name: "Guest User" }).roleLabel,
  "Guest",
);
assert.equal(
  publicProfile.mapMemberToPublicProfileViewModel({ userId: "replacement", role: "REPLACEMENT_HOST" }, { name: "Backup User" }).roleLabel,
  "Replacement host",
);
assert.equal(
  publicProfile.mapMemberToPublicProfileViewModel({ userId: "backup", role: "backup_host" }, { name: "Backup User" }).roleLabel,
  "Replacement host",
);
assert.equal(
  publicProfile.mapMemberToPublicProfileViewModel({ userId: "requested", member_state: "REQUESTED" }, { name: "Requested User" }).memberStateLabel,
  "Requested",
);
assert.equal(
  publicProfile.mapMemberToPublicProfileViewModel({ userId: "waitlisted", member_state: "WAITLISTED" }, { name: "Waitlisted User" }).memberStateLabel,
  "Waitlisted",
);
assert.equal(
  publicProfile.mapMemberToPublicProfileViewModel({ userId: "unverified", role: "RIDER" }, { name: "Unverified User", verification_status: "EMAIL_VERIFIED" }).badges.includes("Verified"),
  false,
);
assert.ok(publicMemberCardSource.includes("Private details like phone, email, gender identity, and ID review are not shown publicly."));
assert.ok(publicMemberCardSource.includes("Verified badges help RidePod support safer matching."));
assert.ok(publicMemberCardSource.includes("PublicProfilePreview"));
assert.ok(publicMemberCardSource.includes("PublicMemberCard"));
assert.ok(publicProfileSource.includes("mapMemberToPublicProfileViewModel"));
assert.ok(publicProfileSource.includes("Host"));
assert.ok(publicProfileSource.includes("Guest"));
assert.ok(publicProfileSource.includes("Replacement host"));
assert.ok(publicProfileSource.includes("Verified"));
assert.ok(publicProfileSource.includes("Community"));
assert.ok(publicProfileSource.includes("High-trust"));
assert.ok(publicProfileSource.includes("Seat locked"));
assert.ok(podDetailSource.includes("PublicMemberCard"));
assert.ok(podDetailSource.includes("mapMemberToPublicProfileViewModel"));
assert.equal(podDetailSource.includes("Trust {user.trustScore}"), false);
assert.ok(hostPageSource.includes("PublicMemberCard"));
assert.ok(hostPageSource.includes("mapMemberToPublicProfileViewModel"));
assert.equal(settingsPageSource.includes("trust score"), false);
for (const forbiddenPublicProfileCopy of [
  "KYC approved",
  "Official ID checked",
  "100% verified",
  "100% safe",
  "Female verified",
  "Gender verified",
  "Risk score",
  "Clean record",
  "gal only",
  "boy and gal",
]) {
  assert.equal(publicMemberCardSource.includes(forbiddenPublicProfileCopy), false);
  assert.equal(publicProfileSource.includes(forbiddenPublicProfileCopy), false);
}
assert.deepEqual(
  memberSafetyReport.MEMBER_SAFETY_CONCERN_TYPES,
  [
    "SAFETY_CONCERN",
    "HARASSMENT_OR_INAPPROPRIATE_BEHAVIOR",
    "WRONG_PROFILE_OR_ELIGIBILITY_CONCERN",
    "NO_SHOW_OR_UNRELIABLE_BEHAVIOR",
    "OFF_APP_PAYMENT_REQUEST",
    "OTHER",
  ],
);
assert.equal(
  memberSafetyReport.validateMemberSafetyReport(
    { concernType: "SAFETY_CONCERN", description: "This is a clear report." },
    "u1",
  ),
  "Member is required.",
);
assert.equal(
  memberSafetyReport.validateMemberSafetyReport(
    { reportedUserId: "u2", description: "This is a clear report." },
    "u1",
  ),
  "Choose a concern type.",
);
assert.equal(
  memberSafetyReport.validateMemberSafetyReport(
    { reportedUserId: "u2", concernType: "SAFETY_CONCERN", description: "short" },
    "u1",
  ),
  "Add a short description.",
);
assert.equal(
  memberSafetyReport.validateMemberSafetyReport(
    { reportedUserId: "u1", concernType: "SAFETY_CONCERN", description: "This is a clear report." },
    "u1",
  ),
  "You cannot report yourself.",
);
const memberSafetyReportResult = await memberSafetyReport.submitMemberSafetyReport({
  reporterUserId: "u1",
  reportedUserId: "u2",
  reportedMemberDisplayName: "Andre Lee",
  concernType: "OFF_APP_PAYMENT_REQUEST",
  description: "The member asked for payment outside RidePod.",
  podId: "usc-lax-001",
  podRoute: "USC to LAX",
});
assert.equal(memberSafetyReportResult.ok, true);
assert.equal(memberSafetyReportResult.userFacingMessage, "Report submitted");
assert.equal(memberSafetyReportResult.confirmationBody, "RidePod will review this concern. Reports are private.");
assert.ok(publicMemberCardSource.includes("Report concern"));
assert.ok(publicMemberCardSource.includes("ReportConcernModal"));
assert.ok(memberReportConcernSource.includes("Report a concern"));
assert.ok(memberReportConcernSource.includes("Tell RidePod what happened. Reports are private and reviewed manually."));
assert.ok(memberReportConcernSource.includes("Submit report"));
assert.ok(memberReportConcernSource.includes("Evidence upload coming later."));
assert.ok(memberReportConcernSource.includes("Do not use this form for emergencies. Contact local emergency services immediately."));
assert.ok(memberReportConcernSource.includes("RidePod will review this concern. Reports are private."));
assert.ok(memberSafetyReportSource.includes("MEMBER_SAFETY_REPORT"));
assert.ok(supabaseAdminReviewCasesSource.includes("MEMBER_SAFETY_REPORT"));
assert.ok(adminReviewClientSource.includes("Member safety concern"));
assert.ok(adminReviewClientSource.includes("Admin-reviewed user notification and account action should be handled in a later safety ops slice."));
for (const forbiddenReportCopy of [
  "Guaranteed action",
  "guaranteed action",
  "guaranteed safety",
  "We will ban them",
  "police report",
  "AI reviewed",
  "forever banned",
  "Verified guilty",
  "verified guilty",
]) {
  assert.equal(memberSafetyReportSource.includes(forbiddenReportCopy), false);
  assert.equal(memberReportConcernSource.includes(forbiddenReportCopy), false);
  assert.equal(publicMemberCardSource.includes(forbiddenReportCopy), false);
}

const singleLockPod = pod({
  id: "join-single-lock",
  hostUserId: "u1",
  lifecycleState: "FORMING",
  bookingState: "QUOTE_ALLOWED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  minSeatsToBook: 2,
  maxSeats: 4,
  targetSeats: 4,
  members: [],
});
moneySafetyMock.protectedPods.push(singleLockPod);

const joinRequest = podJoin.requestJoinPod("u2", "join-single-lock");
const singleLockProtection = moneyProtection.calculateMoneyProtection({
  estimatedTotalFareCents: singleLockPod.estimatedTotalFareCents,
  approvedMaxTotalFareCents: singleLockPod.approvedMaxTotalFareCents,
  targetSeats: singleLockPod.targetSeats,
  minSeatsToBook: singleLockPod.minSeatsToBook,
  ridepodFeeCents: singleLockPod.ridepodFeeCents,
});
assert.equal(joinRequest.ok, true);
assert.equal(joinRequest.member.memberState, "PAYMENT_REQUIRED");
assert.equal(joinRequest.member.paymentState, "PAYMENT_METHOD_REQUIRED");
assert.equal(joinRequest.member.maxChargeCents, singleLockProtection.protectedMaxChargePerRiderCents);
assert.equal(joinRequest.member.estimatedShareCents, singleLockProtection.expectedRideShareCents);
assert.equal(joinRequest.member.platformFeeCents, singleLockProtection.protectedMaxPlatformFeeCents);
assert.equal(podJoin.isMemberPaymentConfirmed(joinRequest.member), false);
assert.equal(podJoin.canAccessExactPickup("u2", "join-single-lock"), false);
assert.equal(podJoin.canAccessPodChat("u2", "join-single-lock"), false);
assert.ok(joinRequest.auditEvents.some((event) => event.eventType === "JOIN_REQUESTED"));
assert.ok(joinRequest.auditEvents.some((event) => event.eventType === "ELIGIBILITY_PASSED"));

const authorization = await podJoin.authorizeSeat("u2", "join-single-lock");
assert.equal(authorization.ok, true);
assert.equal(authorization.member.memberState, "CONFIRMED");
assert.equal(authorization.member.paymentState, "AUTHORIZED");
assert.equal(authorization.member.maxChargeCents, singleLockProtection.protectedMaxChargePerRiderCents);
assert.equal(authorization.member.estimatedShareCents, singleLockProtection.expectedRideShareCents);
assert.equal(authorization.member.platformFeeCents, singleLockProtection.protectedMaxPlatformFeeCents);
assert.ok(authorization.member.lockedAt);
assert.ok(authorization.mockPaymentIntentId.startsWith("mock_pi_join-single-lock_u2_"));
assert.equal(authorization.member.mockPaymentIntentId, authorization.mockPaymentIntentId);
const localMockPaymentIntent = moneySafetyMock.mockPaymentIntents.find(
  (paymentIntent) => paymentIntent.podMemberId === authorization.member.id,
);
assert.equal(localMockPaymentIntent.provider, "MOCK");
assert.equal(localMockPaymentIntent.intentType, "SEAT_AUTHORIZATION");
assert.equal(localMockPaymentIntent.externalPaymentIntentId, authorization.mockPaymentIntentId);
assert.equal(localMockPaymentIntent.amountAuthorizedCents, authorization.member.maxChargeCents);
assert.equal(localMockPaymentIntent.amountCapturedCents, 0);
assert.equal(localMockPaymentIntent.status, "AUTHORIZED");
assert.equal(authorization.pod.lifecycleState, "PAYMENT_LOCKING");
assert.equal(podJoin.recomputePodLockState("join-single-lock").confirmedCount, 1);

const enoughLockPod = pod({
  id: "join-enough-lock",
  hostUserId: "u1",
  lifecycleState: "FORMING",
  bookingState: "QUOTE_ALLOWED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  minSeatsToBook: 2,
  maxSeats: 4,
  targetSeats: 4,
  members: [],
});
moneySafetyMock.protectedPods.push(enoughLockPod);

assert.equal(podJoin.requestJoinPod("u2", "join-enough-lock").ok, true);
assert.equal((await podJoin.authorizeSeat("u2", "join-enough-lock")).pod.lifecycleState, "PAYMENT_LOCKING");
assert.equal(podJoin.requestJoinPod("u6", "join-enough-lock").ok, true);
const enoughAuthorization = await podJoin.authorizeSeat("u6", "join-enough-lock");
assert.equal(enoughAuthorization.pod.lifecycleState, "LOCKED");
assert.notEqual(enoughAuthorization.pod.lifecycleState, "HOST_CAN_BOOK");
assert.equal(enoughAuthorization.pod.bookingState, "QUOTE_ALLOWED");
assert.ok(enoughAuthorization.auditEvents.some((event) => event.eventType === "POD_LOCKED"));
assert.equal(podJoin.canAccessExactPickup("u2", "join-enough-lock"), true);
assert.equal(podJoin.canViewExactPickup("u2", "join-enough-lock"), true);
assert.equal(podJoin.canAccessPodChat("u2", "join-enough-lock"), true);
assert.equal(podJoin.canAccessExactPickup("u7", "join-enough-lock"), false);
assert.equal(podJoin.canViewExactPickup("u7", "join-enough-lock"), false);
assert.equal(podJoin.canAccessPodChat("u7", "join-enough-lock"), false);
const enoughLockState = moneySafetyMock.protectedPods.find((candidate) => candidate.id === "join-enough-lock");
enoughLockState.members.push(
  podMember("join-enough-lock", "suspended", {
    memberState: "CONFIRMED",
    paymentState: "AUTHORIZED",
    lockedAt: now,
  }),
  podMember("join-enough-lock", "u7", {
    memberState: "CANCELED",
    paymentState: "AUTHORIZED",
    lockedAt: now,
    canceledAt: now,
  }),
);
assert.equal(podJoin.canAccessPodChat("suspended", "join-enough-lock"), false);
assert.equal(podJoin.canAccessExactPickup("suspended", "join-enough-lock"), false);
assert.equal(podJoin.canAccessPodChat("u7", "join-enough-lock"), false);
assert.equal(podJoin.canAccessExactPickup("u7", "join-enough-lock"), false);
const publicRouteInfo = podJoin.getPublicRouteInfo("join-enough-lock");
assert.equal(publicRouteInfo.originGeneral, "USC");
assert.equal(publicRouteInfo.destinationGeneral, "LAX");
assert.equal(publicRouteInfo.departureAt, now);
assert.equal("pickupDetail" in publicRouteInfo, false);
assert.equal("dropoffDetail" in publicRouteInfo, false);
const lockedChatSend = podJoin.sendChatMessage("u7", "join-enough-lock", "Can I join the chat?");
assert.equal(lockedChatSend.ok, false);
assert.equal(lockedChatSend.error, "CHAT_LOCKED");
assert.equal(lockedChatSend.message, "Chat unlocks after your seat is payment-authorized.");
const normalChatSend = podJoin.sendChatMessage("u2", "join-enough-lock", "See you near the general pickup area.");
assert.equal(normalChatSend.ok, true);
assert.equal(normalChatSend.messageSent, true);
assert.equal(normalChatSend.warning, null);

const quoteBeforeConfirmPod = pod({
  id: "quote-before-confirm",
  hostUserId: "u1",
  lifecycleState: "FORMING",
  bookingState: "QUOTE_ALLOWED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  minSeatsToBook: 2,
  maxSeats: 4,
  targetSeats: 4,
  members: [],
});
moneySafetyMock.protectedPods.push(quoteBeforeConfirmPod);

const earlyQuote = podBooking.uploadQuoteScreenshot("u1", "quote-before-confirm", {
  providerName: "UBER",
  vehicleClass: "XL",
  quotedFareCents: moneySafety.cents(82),
  currency: "USD",
  routeSummary: "USC to LAX",
  screenshotFileUrl: "mock://quote-before-confirm.png",
  screenshotFileId: "mock-file-quote-before-confirm",
});
assert.equal(earlyQuote.ok, true);
assert.equal(earlyQuote.quote.reviewState, "AUTO_APPROVED");
assert.equal(earlyQuote.bookingPermission.canBook, false);
assert.ok(
  earlyQuote.bookingPermission.reasons.some((reason) =>
    reason.includes("Waiting for participants: 0/2 payment-authorized"),
  ),
);
assert.ok(earlyQuote.auditEvents.some((event) => event.eventType === "QUOTE_UPLOADED"));
const quoteCertifiedEvent = earlyQuote.auditEvents.find((event) => event.eventType === "QUOTE_PROOF_CERTIFIED");
assert.ok(quoteCertifiedEvent);
assert.equal(quoteCertifiedEvent.eventPayload.podId, "quote-before-confirm");
assert.equal(quoteCertifiedEvent.eventPayload.userId, "u1");
assert.equal(quoteCertifiedEvent.eventPayload.proofType, "QUOTE_SCREENSHOT");
assert.equal(quoteCertifiedEvent.eventPayload.certificationTextVersion, "quote-proof-certification-v1");
assert.equal(typeof quoteCertifiedEvent.eventPayload.submittedAt, "string");
assert.equal(quoteCertifiedEvent.eventPayload.screenshotFileId, "mock-file-quote-before-confirm");
assert.ok(earlyQuote.auditEvents.some((event) => event.eventType === "QUOTE_APPROVED"));
assert.equal(podBooking.canHostBook("u1", "quote-before-confirm").canBook, false);

const nonHostQuote = podBooking.uploadQuoteScreenshot("u2", "quote-before-confirm", {
  providerName: "UBER",
  quotedFareCents: moneySafety.cents(80),
  currency: "USD",
});
assert.equal(nonHostQuote.ok, false);
assert.equal(nonHostQuote.error, "HOST_REQUIRED");

const blockedBooking = podBooking.confirmExternalBooking("u1", "quote-before-confirm");
assert.equal(blockedBooking.ok, false);
assert.equal(blockedBooking.error, "PROTECTED_BOOKING_BLOCKED");
assert.equal(
  blockedBooking.warning,
  "You can book at your own risk, but this ride is not RidePod-protected until participants are payment-authorized. RidePod cannot guarantee reimbursement for unconfirmed seats.",
);
assert.equal(podJoin.requestJoinPod("u2", "quote-before-confirm").ok, true);
assert.equal((await podJoin.authorizeSeat("u2", "quote-before-confirm")).pod.lifecycleState, "PAYMENT_LOCKING");
assert.equal(podJoin.requestJoinPod("u6", "quote-before-confirm").ok, true);
const earlyQuoteReady = await podJoin.authorizeSeat("u6", "quote-before-confirm");
assert.equal(earlyQuoteReady.pod.lifecycleState, "LOCKED");
assert.equal(earlyQuoteReady.pod.bookingState, "QUOTE_APPROVED");
assert.equal(earlyQuoteReady.auditEvents.some((event) => event.eventType === "HOST_CAN_BOOK"), false);
assert.equal(podBooking.canHostBook("u1", "quote-before-confirm").canBook, true);

const bookingReadyPod = pod({
  id: "protected-booking-ready",
  hostUserId: "u1",
  lifecycleState: "FORMING",
  bookingState: "QUOTE_ALLOWED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  minSeatsToBook: 2,
  maxSeats: 4,
  targetSeats: 4,
  members: [],
});
moneySafetyMock.protectedPods.push(bookingReadyPod);

assert.equal(podJoin.requestJoinPod("u2", "protected-booking-ready").ok, true);
assert.equal((await podJoin.authorizeSeat("u2", "protected-booking-ready")).pod.lifecycleState, "PAYMENT_LOCKING");
assert.equal(podJoin.requestJoinPod("u6", "protected-booking-ready").ok, true);
assert.equal((await podJoin.authorizeSeat("u6", "protected-booking-ready")).pod.lifecycleState, "LOCKED");

const approvedQuote = podBooking.uploadQuoteScreenshot("u1", "protected-booking-ready", {
  providerName: "LYFT",
  vehicleClass: "XL",
  quotedFareCents: moneySafety.cents(86),
  currency: "USD",
  routeSummary: "USC to LAX",
  screenshotFileUrl: "mock://approved-quote.png",
  screenshotFileId: "mock-file-approved-quote",
});
assert.equal(approvedQuote.ok, true);
assert.equal(approvedQuote.bookingPermission.canBook, true);
assert.equal(approvedQuote.pod.lifecycleState, "HOST_CAN_BOOK");
assert.equal(approvedQuote.pod.bookingState, "CAN_BOOK");
assert.ok(approvedQuote.auditEvents.some((event) => event.eventType === "HOST_CAN_BOOK"));
assert.equal(podBooking.canHostBook("u1", "protected-booking-ready").canBook, true);

const externalBooking = podBooking.confirmExternalBooking("u1", "protected-booking-ready", {
  providerName: "LYFT",
  externalRideIdLast4: "1234",
});
assert.equal(externalBooking.ok, true);
assert.equal(externalBooking.pod.lifecycleState, "RIDE_BOOKED");
assert.equal(externalBooking.pod.bookingState, "BOOKED");
assert.ok(externalBooking.auditEvents.some((event) => event.eventType === "HOST_BOOKED_EXTERNAL_RIDE"));

const taxiMeterReadyPod = pod({
  id: "taxi-meter-no-quote-ready",
  hostUserId: "u1",
  rideOption: "TAXI_METER",
  lifecycleState: "LOCKED",
  bookingState: "QUOTE_APPROVED",
  minSeatsToBook: 3,
  members: [
    podMember("taxi-meter-no-quote-ready", "u1", { role: "HOST" }),
    podMember("taxi-meter-no-quote-ready", "u2"),
    podMember("taxi-meter-no-quote-ready", "u6"),
  ],
  quotes: [],
});
moneySafetyMock.protectedPods.push(taxiMeterReadyPod);
const taxiMeterPermission = podBooking.canHostBook("u1", "taxi-meter-no-quote-ready");
assert.equal(taxiMeterPermission.canBook, true);
assert.equal(
  taxiMeterPermission.reasons.some((reason) => reason.includes("quote screenshot")),
  false,
);
const taxiMeterBooking = podBooking.confirmExternalBooking("u1", "taxi-meter-no-quote-ready");
assert.equal(taxiMeterBooking.ok, true);
assert.equal(taxiMeterBooking.pod.bookingState, "BOOKED");

const aboveMaxServicePod = pod({
  id: "quote-above-max-blocks",
  hostUserId: "u1",
  lifecycleState: "FORMING",
  bookingState: "QUOTE_ALLOWED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  minSeatsToBook: 2,
  maxSeats: 4,
  targetSeats: 4,
  members: [],
});
moneySafetyMock.protectedPods.push(aboveMaxServicePod);

assert.equal(podJoin.requestJoinPod("u2", "quote-above-max-blocks").ok, true);
assert.equal((await podJoin.authorizeSeat("u2", "quote-above-max-blocks")).ok, true);
assert.equal(podJoin.requestJoinPod("u6", "quote-above-max-blocks").ok, true);
assert.equal((await podJoin.authorizeSeat("u6", "quote-above-max-blocks")).pod.lifecycleState, "LOCKED");

const aboveMaxServiceQuote = podBooking.uploadQuoteScreenshot("u1", "quote-above-max-blocks", {
  providerName: "UBER",
  vehicleClass: "XL",
  quotedFareCents: moneySafety.cents(120),
  currency: "USD",
  routeSummary: "USC to LAX",
  screenshotFileUrl: "mock://above-max-service-quote.png",
  screenshotFileId: "mock-file-above-max-service-quote",
});
assert.equal(aboveMaxServiceQuote.ok, true);
assert.equal(aboveMaxServiceQuote.quote.reviewState, "NEEDS_APPROVAL");
assert.equal(aboveMaxServiceQuote.bookingPermission.canBook, false);
assert.ok(
  aboveMaxServiceQuote.bookingPermission.reasons.some((reason) =>
    reason.includes("Quote needs approval before protected booking"),
  ),
);
assert.equal(aboveMaxServiceQuote.pod.lifecycleState, "LOCKED");
assert.ok(aboveMaxServiceQuote.auditEvents.some((event) => event.eventType === "QUOTE_ABOVE_MAX"));
const aboveMaxBlockedBooking = podBooking.confirmExternalBooking("u1", "quote-above-max-blocks");
assert.equal(aboveMaxBlockedBooking.ok, false);
assert.equal(aboveMaxBlockedBooking.error, "PROTECTED_BOOKING_BLOCKED");
assert.equal(
  aboveMaxBlockedBooking.warning,
  "You can book at your own risk, but this ride is not RidePod-protected until participants are payment-authorized. RidePod cannot guarantee reimbursement for unconfirmed seats.",
);

const replacementPod = pod({
  id: "host-replacement-before",
  hostUserId: "u1",
  lifecycleState: "HOST_CAN_BOOK",
  bookingState: "CAN_BOOK",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  minSeatsToBook: 2,
  maxSeats: 4,
  targetSeats: 4,
  members: [
    podMember("host-replacement-before", "u1", { role: "HOST" }),
    podMember("host-replacement-before", "u2"),
    podMember("host-replacement-before", "u6"),
  ],
  quotes: [
    {
      id: "quote-host-replacement-before-1",
      podId: "host-replacement-before",
      hostUserId: "u1",
      providerName: "UBER",
      vehicleClass: "XL",
      quotedFareCents: moneySafety.cents(84),
      currency: "USD",
      routeSummary: "USC to LAX",
      screenshotFileUrl: "mock://old-host-quote.png",
      screenshotFileId: "mock-file-old-host-quote",
      submittedAt: now,
      reviewState: "AUTO_APPROVED",
      reviewedByAdminId: null,
      adminNotes: null,
      isFresh: true,
      expiresAt: null,
    },
  ],
});
moneySafetyMock.protectedPods.push(replacementPod);

assert.equal(podHostReplacement.isExternallyBooked(replacementPod), false);
const beforeBookingCancel = podHostReplacement.cancelHostBeforeBooking(
  "u1",
  "host-replacement-before",
  "Schedule changed",
);
assert.equal(beforeBookingCancel.ok, true);
assert.equal(beforeBookingCancel.pod.lifecycleState, "HOST_REPLACEMENT_NEEDED");
assert.equal(beforeBookingCancel.pod.bookingState, "CANCELED_BY_HOST");
assert.equal(beforeBookingCancel.pod.originalHostUserId, "u1");
assert.ok(beforeBookingCancel.pod.hostReplacementStartedAt);
assert.equal(
  beforeBookingCancel.participantMessage,
  "Host canceled. Your pod is still active while RidePod looks for a replacement host. Your payment authorization will not be captured unless a replacement host books the external ride.",
);
assert.ok(beforeBookingCancel.auditEvents.some((event) => event.eventType === "HOST_CANCELED_BEFORE_BOOKING"));
assert.ok(beforeBookingCancel.auditEvents.some((event) => event.eventType === "HOST_REPLACEMENT_STARTED"));
const stillLockedParticipant = beforeBookingCancel.pod.members.find((candidate) => candidate.userId === "u2");
assert.equal(stillLockedParticipant.memberState, "CONFIRMED");
assert.equal(stillLockedParticipant.paymentState, "AUTHORIZED");
assert.ok(stillLockedParticipant.lockedAt);

const unconfirmedReplacementPod = pod({
  id: "host-replacement-unconfirmed",
  hostUserId: "u1",
  lifecycleState: "LOCKED",
  bookingState: "QUOTE_ALLOWED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  minSeatsToBook: 1,
  maxSeats: 4,
  targetSeats: 4,
  members: [
    podMember("host-replacement-unconfirmed", "u1", { role: "HOST" }),
    podMember("host-replacement-unconfirmed", "u7", {
      memberState: "PAYMENT_REQUIRED",
      paymentState: "PAYMENT_METHOD_REQUIRED",
      lockedAt: null,
      eligibilityPassed: true,
    }),
  ],
});
moneySafetyMock.protectedPods.push(unconfirmedReplacementPod);
assert.equal(
  podHostReplacement.cancelHostBeforeBooking("u1", "host-replacement-unconfirmed", "Emergency").ok,
  true,
);
const unconfirmedReplacement = podHostReplacement.acceptReplacementHost("u7", "host-replacement-unconfirmed");
assert.equal(unconfirmedReplacement.ok, false);
assert.equal(unconfirmedReplacement.error, "CONFIRMED_PARTICIPANT_REQUIRED");

const replacementAccepted = podHostReplacement.acceptReplacementHost("u2", "host-replacement-before");
assert.equal(replacementAccepted.ok, true);
assert.equal(replacementAccepted.pod.replacementHostUserId, "u2");
assert.equal(replacementAccepted.member.role, "REPLACEMENT_HOST");
assert.equal(replacementAccepted.pod.bookingState, "QUOTE_ALLOWED");
assert.equal(replacementAccepted.pod.quotes.every((quote) => quote.isFresh === false), true);
assert.ok(replacementAccepted.auditEvents.some((event) => event.eventType === "REPLACEMENT_HOST_ACCEPTED"));

const replacementPermissionBeforeQuote = podBooking.canHostBook("u2", "host-replacement-before");
assert.equal(replacementPermissionBeforeQuote.canBook, false);
assert.ok(
  replacementPermissionBeforeQuote.reasons.some((reason) =>
    reason.includes("Upload a fresh quote screenshot before protected booking"),
  ),
);

const replacementQuote = podBooking.uploadQuoteScreenshot("u2", "host-replacement-before", {
  providerName: "LYFT",
  vehicleClass: "XL",
  quotedFareCents: moneySafety.cents(86),
  currency: "USD",
  routeSummary: "USC to LAX",
  screenshotFileUrl: "mock://replacement-quote.png",
  screenshotFileId: "mock-file-replacement-quote",
});
assert.equal(replacementQuote.ok, true);
assert.equal(replacementQuote.bookingPermission.canBook, true);
assert.equal(replacementQuote.pod.lifecycleState, "HOST_CAN_BOOK");

const afterBookingCancelPod = pod({
  id: "host-cancel-after-booking",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  minSeatsToBook: 2,
  maxSeats: 4,
  targetSeats: 4,
  members: [
    podMember("host-cancel-after-booking", "u1", { role: "HOST" }),
    podMember("host-cancel-after-booking", "u2"),
    podMember("host-cancel-after-booking", "u6"),
  ],
});
moneySafetyMock.protectedPods.push(afterBookingCancelPod);
assert.equal(podHostReplacement.isExternallyBooked(afterBookingCancelPod), true);
const afterBookingCancel = podHostReplacement.cancelHostAfterBooking(
  "u1",
  "host-cancel-after-booking",
  "Provider canceled and host left",
);
assert.equal(afterBookingCancel.ok, true);
assert.equal(afterBookingCancel.pod.lifecycleState, "ADMIN_REVIEW");
assert.equal(afterBookingCancel.pod.bookingState, "CANCELED_BY_HOST");
assert.equal(afterBookingCancel.pod.adminReviewRequired, true);
assert.ok(afterBookingCancel.auditEvents.some((event) => event.eventType === "HOST_CANCELED_AFTER_BOOKING"));
assert.equal(afterBookingCancel.riskFlags[0].riskType, "HOST_CANCELED_AFTER_BOOKING");
assert.ok(moneySafetyMock.mockRiskFlags.some((flag) => flag.podId === "host-cancel-after-booking"));

const legacyAfterBookingCancel = moneySafety.cancelHostAfterBooking(
  "host",
  pod({
    id: "legacy-host-cancel-after-booking",
    lifecycleState: "RIDE_BOOKED",
    bookingState: "BOOKED",
  }),
  "Host left after booking.",
);
assert.equal(legacyAfterBookingCancel.riskFlags[0].riskType, "HOST_CANCELED_AFTER_BOOKING");

const receiptUploadBlockedPod = pod({
  id: "settlement-upload-blocked",
  hostUserId: "u1",
  lifecycleState: "FORMING",
  bookingState: "QUOTE_ALLOWED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  members: [settlementMember("settlement-upload-blocked", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(receiptUploadBlockedPod);
assert.equal(
  podSettlement.uploadFinalReceipt("u1", "settlement-upload-blocked", {
    providerName: "UBER",
    fareTotalCents: moneySafety.cents(40),
    currency: "USD",
  }).error,
  "RECEIPT_UPLOAD_NOT_ALLOWED",
);

const receiptNonHostPod = pod({
  id: "settlement-non-host-receipt",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  members: [settlementMember("settlement-non-host-receipt", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(receiptNonHostPod);
assert.equal(
  podSettlement.uploadFinalReceipt("u2", "settlement-non-host-receipt", {
    providerName: "UBER",
    fareTotalCents: moneySafety.cents(40),
    currency: "USD",
  }).error,
  "HOST_REQUIRED",
);

const lowerReceiptPod = pod({
  id: "settlement-lower-receipt",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: moneySafety.cents(90),
  members: [
    settlementMember("settlement-lower-receipt", "u1", { role: "HOST" }),
    settlementMember("settlement-lower-receipt", "u2"),
    settlementMember("settlement-lower-receipt", "u6"),
  ],
  quotes: [
    {
      id: "quote-settlement-lower-receipt-1",
      podId: "settlement-lower-receipt",
      hostUserId: "u1",
      providerName: "UBER",
      vehicleClass: "XL",
      quotedFareCents: moneySafety.cents(86),
      currency: "USD",
      routeSummary: "USC to LAX",
      screenshotFileUrl: "mock://settlement-lower-quote.png",
      screenshotFileId: "mock-file-settlement-lower-quote",
      submittedAt: now,
      reviewState: "AUTO_APPROVED",
      reviewedByAdminId: null,
      adminNotes: null,
      isFresh: true,
      expiresAt: null,
    },
  ],
});
moneySafetyMock.protectedPods.push(lowerReceiptPod);
const lowerReceiptUpload = podSettlement.uploadFinalReceipt("u1", "settlement-lower-receipt", {
  providerName: "UBER",
  vehicleClass: "XL",
  fareTotalCents: moneySafety.cents(75),
  currency: "USD",
  receiptFileUrl: "mock://receipt-lower.png",
  receiptFileId: "mock-file-receipt-lower",
  rideStartedAt: "2026-05-14T07:45:00.000Z",
  rideCompletedAt: "2026-05-14T08:15:00.000Z",
});
assert.equal(lowerReceiptUpload.ok, true);
assert.equal(lowerReceiptUpload.receipt.verificationState, "SUBMITTED");
assert.equal(lowerReceiptUpload.pod.lifecycleState, "RECEIPT_PENDING");
assert.ok(lowerReceiptUpload.auditEvents.some((event) => event.eventType === "RECEIPT_UPLOADED"));
const receiptCertifiedEvent = lowerReceiptUpload.auditEvents.find((event) => event.eventType === "RECEIPT_PROOF_CERTIFIED");
assert.ok(receiptCertifiedEvent);
assert.equal(receiptCertifiedEvent.eventPayload.podId, "settlement-lower-receipt");
assert.equal(receiptCertifiedEvent.eventPayload.userId, "u1");
assert.equal(receiptCertifiedEvent.eventPayload.proofType, "FINAL_RECEIPT_OR_METER_PROOF");
assert.equal(receiptCertifiedEvent.eventPayload.certificationTextVersion, "receipt-proof-certification-v1");
assert.equal(typeof receiptCertifiedEvent.eventPayload.submittedAt, "string");
assert.equal(receiptCertifiedEvent.eventPayload.receiptFileId, "mock-file-receipt-lower");
const beforeVerificationSettlement = podSettlement.calculateSettlement("settlement-lower-receipt");
assert.equal(beforeVerificationSettlement.ok, false);
assert.equal(beforeVerificationSettlement.error, "VERIFIED_RECEIPT_REQUIRED");
const lowerReceiptVerified = podSettlement.adminVerifyReceipt("admin-1", lowerReceiptUpload.receipt.id, "VERIFIED");
assert.equal(lowerReceiptVerified.ok, true);
assert.equal(lowerReceiptVerified.receipt.verificationState, "VERIFIED");
assert.equal(lowerReceiptVerified.settlementResult.settlement.verifiedFareCents, moneySafety.cents(75));
assert.equal(lowerReceiptVerified.settlementResult.hostReimbursement.fareReimbursementCents, moneySafety.cents(75));
assert.equal(
  lowerReceiptVerified.settlementResult.settlement.items
    .filter((item) => item.itemType === "FARE_SHARE")
    .reduce((sum, item) => sum + item.amountCents, 0),
  moneySafety.cents(75),
);
assert.equal(lowerReceiptVerified.settlementResult.settlement.settlementState, "FINALIZED");
assert.equal(lowerReceiptVerified.settlementResult.pod.lifecycleState, "SETTLEMENT_PENDING");
assert.ok(lowerReceiptVerified.auditEvents.some((event) => event.eventType === "RECEIPT_VERIFIED"));
assert.ok(lowerReceiptVerified.auditEvents.some((event) => event.eventType === "SETTLEMENT_CREATED"));
assert.ok(lowerReceiptVerified.auditEvents.some((event) => event.eventType === "SETTLEMENT_FINALIZED"));
assert.ok(moneySafetyMock.mockSettlements.some((settlement) => settlement.id === lowerReceiptVerified.settlementResult.settlement.id));
assert.ok(
  moneySafetyMock.mockHostReimbursements.some(
    (reimbursement) => reimbursement.id === lowerReceiptVerified.settlementResult.hostReimbursement.id,
  ),
);

const mockReimbursementTransfer = await stripeHostReimbursement.reimburseHostForSettledPod("settlement-lower-receipt", {
  env: { PAYMENT_PROVIDER: "MOCK" },
});
assert.equal(mockReimbursementTransfer.ok, true);
assert.equal(mockReimbursementTransfer.provider, "MOCK");
assert.equal(mockReimbursementTransfer.hostReimbursement.payoutState, "SCHEDULED");
assert.ok(mockReimbursementTransfer.hostReimbursement.externalTransferId.startsWith("mock_transfer_"));
assert.ok(mockReimbursementTransfer.auditEvents.some((event) => event.eventType === "HOST_REIMBURSEMENT_SCHEDULED"));
const duplicateMockReimbursementTransfer = await stripeHostReimbursement.reimburseHostForSettledPod("settlement-lower-receipt", {
  env: { PAYMENT_PROVIDER: "MOCK" },
});
assert.equal(duplicateMockReimbursementTransfer.ok, false);
assert.equal(duplicateMockReimbursementTransfer.error, "HOST_REIMBURSEMENT_ALREADY_TRANSFERRED");

const reimbursementDraftPod = pod({
  id: "reimbursement-draft",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [settlementMember("reimbursement-draft", "u1", { role: "HOST" }), settlementMember("reimbursement-draft", "u2")],
  receipts: [
    {
      id: "receipt-reimbursement-draft",
      podId: "reimbursement-draft",
      hostUserId: "u1",
      providerName: "UBER",
      vehicleClass: null,
      fareTotalCents: moneySafety.cents(60),
      currency: "USD",
      receiptFileUrl: "mock://receipt-reimbursement-draft.png",
      receiptFileId: null,
      rideStartedAt: null,
      rideCompletedAt: null,
      submittedAt: now,
      verificationState: "VERIFIED",
      verifiedByAdminId: "admin-1",
      verifiedAt: now,
      adminNotes: null,
    },
  ],
});
moneySafetyMock.protectedPods.push(reimbursementDraftPod);
const draftSettlement = settlementRecord("reimbursement-draft", { settlementState: "DRAFT", finalizedAt: null });
moneySafetyMock.mockSettlements.push(draftSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("reimbursement-draft", draftSettlement.id));
assert.equal(
  (await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-draft")).error,
  "SETTLEMENT_NOT_FINALIZED",
);

const noVerifiedReceiptPod = pod({
  id: "reimbursement-no-verified-receipt",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reimbursement-no-verified-receipt", "u1", { role: "HOST" }),
    settlementMember("reimbursement-no-verified-receipt", "u2"),
  ],
  receipts: [
    {
      id: "receipt-reimbursement-unverified",
      podId: "reimbursement-no-verified-receipt",
      hostUserId: "u1",
      providerName: "UBER",
      vehicleClass: null,
      fareTotalCents: moneySafety.cents(60),
      currency: "USD",
      receiptFileUrl: null,
      receiptFileId: null,
      rideStartedAt: null,
      rideCompletedAt: null,
      submittedAt: now,
      verificationState: "SUBMITTED",
      verifiedByAdminId: null,
      verifiedAt: null,
      adminNotes: null,
    },
  ],
});
moneySafetyMock.protectedPods.push(noVerifiedReceiptPod);
const noVerifiedSettlement = settlementRecord("reimbursement-no-verified-receipt");
moneySafetyMock.mockSettlements.push(noVerifiedSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("reimbursement-no-verified-receipt", noVerifiedSettlement.id));
assert.equal(
  (await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-no-verified-receipt")).error,
  "VERIFIED_RECEIPT_REQUIRED",
);

const adminReviewReimbursementPod = pod({
  id: "reimbursement-admin-review",
  hostUserId: "u1",
  lifecycleState: "ADMIN_REVIEW",
  bookingState: "BOOKED",
  adminReviewRequired: true,
  members: [
    settlementMember("reimbursement-admin-review", "u1", { role: "HOST" }),
    settlementMember("reimbursement-admin-review", "u2"),
  ],
  receipts: [lowerReceiptUpload.receipt],
});
adminReviewReimbursementPod.receipts[0] = { ...adminReviewReimbursementPod.receipts[0], id: "receipt-reimbursement-admin-review", podId: "reimbursement-admin-review", verificationState: "VERIFIED" };
moneySafetyMock.protectedPods.push(adminReviewReimbursementPod);
const adminReviewSettlement = settlementRecord("reimbursement-admin-review");
moneySafetyMock.mockSettlements.push(adminReviewSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("reimbursement-admin-review", adminReviewSettlement.id));
assert.equal(
  (await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-admin-review")).error,
  "POD_ADMIN_REVIEW_HOLD",
);

const disputeHoldReimbursementPod = pod({
  id: "reimbursement-dispute-hold",
  hostUserId: "u1",
  lifecycleState: "DISPUTE_HOLD",
  bookingState: "BOOKED",
  members: [
    settlementMember("reimbursement-dispute-hold", "u1", { role: "HOST" }),
    settlementMember("reimbursement-dispute-hold", "u2"),
  ],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reimbursement-dispute-hold", podId: "reimbursement-dispute-hold" }],
});
moneySafetyMock.protectedPods.push(disputeHoldReimbursementPod);
const disputeHoldSettlement = settlementRecord("reimbursement-dispute-hold");
moneySafetyMock.mockSettlements.push(disputeHoldSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("reimbursement-dispute-hold", disputeHoldSettlement.id));
assert.equal(
  (await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-dispute-hold")).error,
  "POD_ADMIN_REVIEW_HOLD",
);

const settlementReviewReimbursementPod = pod({
  id: "reimbursement-settlement-review",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reimbursement-settlement-review", "u1", { role: "HOST" }),
    settlementMember("reimbursement-settlement-review", "u2"),
  ],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reimbursement-settlement-review", podId: "reimbursement-settlement-review" }],
});
moneySafetyMock.protectedPods.push(settlementReviewReimbursementPod);
const settlementReviewSettlement = settlementRecord("reimbursement-settlement-review", { adminReviewRequired: true });
moneySafetyMock.mockSettlements.push(settlementReviewSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("reimbursement-settlement-review", settlementReviewSettlement.id));
assert.equal(
  (await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-settlement-review")).error,
  "SETTLEMENT_ADMIN_REVIEW_REQUIRED",
);

const stripeReimbursementPod = pod({
  id: "reimbursement-stripe-success",
  hostUserId: "stripe-host-existing",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reimbursement-stripe-success", "stripe-host-existing", { role: "HOST" }),
    settlementMember("reimbursement-stripe-success", "u2"),
  ],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reimbursement-stripe-success", podId: "reimbursement-stripe-success", hostUserId: "stripe-host-existing" }],
});
moneySafetyMock.protectedPods.push(stripeReimbursementPod);
const stripeReimbursementSettlement = settlementRecord("reimbursement-stripe-success", { hostReimbursementCents: moneySafety.cents(90) });
moneySafetyMock.mockSettlements.push(stripeReimbursementSettlement);
moneySafetyMock.mockHostReimbursements.push(
  hostReimbursementRecord("reimbursement-stripe-success", stripeReimbursementSettlement.id, "stripe-host-existing", {
    fareReimbursementCents: moneySafety.cents(90),
    totalTransferCents: moneySafety.cents(90),
  }),
);
moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-host-existing").payoutsEnabled = true;
const stripeReimbursementTransfer = await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-stripe-success", {
  env: stripeTestEnv,
  stripe: fakeStripe,
});
assert.equal(stripeReimbursementTransfer.ok, true);
assert.equal(stripeReimbursementTransfer.provider, "STRIPE");
assert.equal(stripeReimbursementTransfer.hostReimbursement.payoutState, "PAID");
assert.equal(stripeReimbursementTransfer.hostReimbursement.externalTransferId, "tr_test_1");
assert.equal(createdStripeTransfers.at(-1).input.amount, moneySafety.cents(90));
assert.equal(createdStripeTransfers.at(-1).input.destination, "acct_complete_existing");
assert.equal(createdStripeTransfers.at(-1).input.metadata.transferType, "host_reimbursement");
assert.equal(createdStripeTransfers.at(-1).input.metadata.environment, "test");
assert.equal(createdStripeTransfers.at(-1).input.transfer_group, "ridepod_pod_reimbursement-stripe-success");
assert.equal(createdStripeTransfers.at(-1).options.idempotencyKey, "ridepod-host-reimbursement-host-reimbursement-reimbursement-stripe-success");

const stripeMissingConnectPod = pod({
  id: "reimbursement-stripe-missing-connect",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reimbursement-stripe-missing-connect", "u1", { role: "HOST" }),
    settlementMember("reimbursement-stripe-missing-connect", "u2"),
  ],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reimbursement-stripe-missing-connect", podId: "reimbursement-stripe-missing-connect" }],
});
moneySafetyMock.protectedPods.push(stripeMissingConnectPod);
const stripeMissingConnectSettlement = settlementRecord("reimbursement-stripe-missing-connect");
moneySafetyMock.mockSettlements.push(stripeMissingConnectSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("reimbursement-stripe-missing-connect", stripeMissingConnectSettlement.id));
moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "u1").stripeConnectAccountId = null;
assert.equal(
  (await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-stripe-missing-connect", {
    env: stripeTestEnv,
    stripe: fakeStripe,
  })).error,
  "STRIPE_CONNECT_ACCOUNT_REQUIRED",
);

const stripeIncompletePayoutPod = pod({
  id: "reimbursement-stripe-incomplete-payout",
  hostUserId: "stripe-host-new",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reimbursement-stripe-incomplete-payout", "stripe-host-new", { role: "HOST" }),
    settlementMember("reimbursement-stripe-incomplete-payout", "u2"),
  ],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reimbursement-stripe-incomplete-payout", podId: "reimbursement-stripe-incomplete-payout", hostUserId: "stripe-host-new" }],
});
moneySafetyMock.protectedPods.push(stripeIncompletePayoutPod);
const stripeIncompletePayoutSettlement = settlementRecord("reimbursement-stripe-incomplete-payout");
moneySafetyMock.mockSettlements.push(stripeIncompletePayoutSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("reimbursement-stripe-incomplete-payout", stripeIncompletePayoutSettlement.id, "stripe-host-new"));
moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-host-new").stripeConnectAccountId = "acct_test_incomplete";
moneySafetyMock.protectedUsers.find((candidate) => candidate.id === "stripe-host-new").payoutsEnabled = false;
assert.equal(
  (await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-stripe-incomplete-payout", {
    env: stripeTestEnv,
    stripe: fakeStripe,
  })).error,
  "HOST_PAYOUTS_NOT_ENABLED",
);

const reimbursementExceedsPod = pod({
  id: "reimbursement-exceeds-settlement",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reimbursement-exceeds-settlement", "u1", { role: "HOST" }),
    settlementMember("reimbursement-exceeds-settlement", "u2"),
  ],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reimbursement-exceeds-settlement", podId: "reimbursement-exceeds-settlement" }],
});
moneySafetyMock.protectedPods.push(reimbursementExceedsPod);
const reimbursementExceedsSettlement = settlementRecord("reimbursement-exceeds-settlement", { hostReimbursementCents: moneySafety.cents(50) });
moneySafetyMock.mockSettlements.push(reimbursementExceedsSettlement);
moneySafetyMock.mockHostReimbursements.push(
  hostReimbursementRecord("reimbursement-exceeds-settlement", reimbursementExceedsSettlement.id, "u1", {
    totalTransferCents: moneySafety.cents(60),
  }),
);
assert.equal(
  (await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-exceeds-settlement")).error,
  "HOST_REIMBURSEMENT_EXCEEDS_SETTLEMENT",
);

const stripeFailedTransferPod = pod({
  id: "reimbursement-stripe-failure",
  hostUserId: "stripe-host-existing",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reimbursement-stripe-failure", "stripe-host-existing", { role: "HOST" }),
    settlementMember("reimbursement-stripe-failure", "u2"),
  ],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reimbursement-stripe-failure", podId: "reimbursement-stripe-failure", hostUserId: "stripe-host-existing" }],
});
moneySafetyMock.protectedPods.push(stripeFailedTransferPod);
const stripeFailedTransferSettlement = settlementRecord("reimbursement-stripe-failure");
moneySafetyMock.mockSettlements.push(stripeFailedTransferSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("reimbursement-stripe-failure", stripeFailedTransferSettlement.id, "stripe-host-existing"));
const failedTransfer = await stripeHostReimbursement.reimburseHostForSettledPod("reimbursement-stripe-failure", {
  env: stripeTestEnv,
  stripe: {
    transfers: {
      create: async () => {
        throw new Error("Insufficient test balance.");
      },
    },
  },
});
assert.equal(failedTransfer.ok, false);
assert.equal(failedTransfer.error, "STRIPE_TRANSFER_FAILED");
assert.equal(failedTransfer.hostReimbursement.payoutState, "FAILED");
assert.equal(failedTransfer.hostReimbursement.externalTransferId, null);

const mockRefundPod = pod({
  id: "refund-mock-captured",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("refund-mock-captured", "u1", { role: "HOST" }),
    settlementMember("refund-mock-captured", "u2", { paymentState: "CAPTURED" }),
  ],
});
moneySafetyMock.protectedPods.push(mockRefundPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    id: "ridepod-pi-refund-mock",
    provider: "MOCK",
    podId: "refund-mock-captured",
    podMemberId: "pm-refund-mock-captured-u2",
    userId: "u2",
    externalPaymentIntentId: "mock_pi_refund_captured",
    amountAuthorizedCents: moneySafety.cents(50),
    amountCapturedCents: moneySafety.cents(40),
    amountRefundedCents: 0,
    status: "SUCCEEDED",
  }),
);
const partialMockRefund = await stripeRefunds.refundMemberPayment(
  "pm-refund-mock-captured-u2",
  moneySafety.cents(15),
  "Settlement overcharge correction.",
);
assert.equal(partialMockRefund.ok, true);
assert.equal(partialMockRefund.paymentIntent.amountRefundedCents, moneySafety.cents(15));
assert.equal(partialMockRefund.member.paymentState, "PARTIALLY_REFUNDED");
const fullMockRefund = await stripeRefunds.refundMemberPayment(
  "pm-refund-mock-captured-u2",
  moneySafety.cents(25),
  "Rider dispute accepted.",
);
assert.equal(fullMockRefund.ok, true);
assert.equal(fullMockRefund.paymentIntent.amountRefundedCents, moneySafety.cents(40));
assert.equal(fullMockRefund.paymentIntent.status, "REFUNDED");
assert.equal(fullMockRefund.member.paymentState, "REFUNDED");
assert.ok(fullMockRefund.auditEvents.some((event) => event.eventType === "PAYMENT_REFUNDED"));

const refundUncapturedPod = pod({
  id: "refund-uncaptured",
  hostUserId: "u1",
  lifecycleState: "HOST_REPLACEMENT_NEEDED",
  bookingState: "CANCELED_BY_HOST",
  members: [
    settlementMember("refund-uncaptured", "u1", { role: "HOST" }),
    settlementMember("refund-uncaptured", "u2", { memberState: "CONFIRMED", paymentState: "AUTHORIZED" }),
  ],
});
moneySafetyMock.protectedPods.push(refundUncapturedPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    id: "ridepod-pi-refund-uncaptured",
    provider: "MOCK",
    podId: "refund-uncaptured",
    podMemberId: "pm-refund-uncaptured-u2",
    userId: "u2",
    externalPaymentIntentId: "mock_pi_refund_uncaptured",
    amountAuthorizedCents: moneySafety.cents(50),
    amountCapturedCents: 0,
    amountRefundedCents: 0,
    status: "AUTHORIZED",
  }),
);
assert.equal(
  (await stripeRefunds.refundMemberPayment("pm-refund-uncaptured-u2", moneySafety.cents(10), "Host canceled before booking.")).error,
  "PAYMENT_NOT_CAPTURED",
);
const releaseAuthorization = await stripeRefunds.releaseUncapturedAuthorization(
  "pm-refund-uncaptured-u2",
  "Host canceled before booking.",
);
assert.equal(releaseAuthorization.ok, true);
assert.equal(releaseAuthorization.paymentIntent.status, "CANCELED");
assert.equal(releaseAuthorization.member.paymentState, "AUTH_EXPIRED");
assert.equal(releaseAuthorization.member.memberState, "CANCELED");
assert.ok(releaseAuthorization.auditEvents.some((event) => event.eventType === "PAYMENT_AUTHORIZATION_RELEASED"));

const refundTooMuch = await stripeRefunds.refundMemberPayment(
  "pm-refund-mock-captured-u2",
  moneySafety.cents(1),
  "Cannot over-refund.",
);
assert.equal(refundTooMuch.ok, false);
assert.equal(refundTooMuch.error, "REFUND_EXCEEDS_CAPTURED_AMOUNT");

const stripeRefundPod = pod({
  id: "refund-stripe-captured",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("refund-stripe-captured", "u1", { role: "HOST" }),
    settlementMember("refund-stripe-captured", "u2", { paymentState: "CAPTURED" }),
  ],
});
moneySafetyMock.protectedPods.push(stripeRefundPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    id: "ridepod-pi-refund-stripe",
    provider: "STRIPE",
    podId: "refund-stripe-captured",
    podMemberId: "pm-refund-stripe-captured-u2",
    userId: "u2",
    externalPaymentIntentId: "pi_refund_stripe_captured",
    amountAuthorizedCents: moneySafety.cents(50),
    amountCapturedCents: moneySafety.cents(30),
    amountRefundedCents: 0,
    status: "SUCCEEDED",
  }),
);
const stripeRefund = await stripeRefunds.refundMemberPayment(
  "pm-refund-stripe-captured-u2",
  moneySafety.cents(30),
  "Receipt rejected by admin.",
  { env: stripeTestEnv, stripe: fakeStripe },
);
assert.equal(stripeRefund.ok, true);
assert.equal(stripeRefund.provider, "STRIPE");
assert.equal(stripeRefund.paymentIntent.amountRefundedCents, moneySafety.cents(30));
assert.equal(stripeRefund.member.paymentState, "REFUNDED");
assert.equal(createdStripeRefunds.at(-1).input.payment_intent, "pi_refund_stripe_captured");
assert.equal(createdStripeRefunds.at(-1).input.amount, moneySafety.cents(30));
assert.equal(createdStripeRefunds.at(-1).input.metadata.refundType, "ridepod_refund");
assert.equal(createdStripeRefunds.at(-1).options.idempotencyKey, "ridepod-refund-ridepod-pi-refund-stripe-3000");

const stripeRefundMissingTargetPod = pod({
  id: "refund-stripe-missing-target",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("refund-stripe-missing-target", "u1", { role: "HOST" }),
    settlementMember("refund-stripe-missing-target", "u2", { paymentState: "CAPTURED" }),
  ],
});
moneySafetyMock.protectedPods.push(stripeRefundMissingTargetPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    id: "ridepod-pi-refund-missing-target",
    provider: "STRIPE",
    podId: "refund-stripe-missing-target",
    podMemberId: "pm-refund-stripe-missing-target-u2",
    userId: "u2",
    externalPaymentIntentId: null,
    amountCapturedCents: moneySafety.cents(20),
    status: "SUCCEEDED",
  }),
);
const missingRefundTarget = await stripeRefunds.refundMemberPayment(
  "pm-refund-stripe-missing-target-u2",
  moneySafety.cents(10),
  "Missing Stripe refund target.",
  { env: stripeTestEnv, stripe: fakeStripe },
);
assert.equal(missingRefundTarget.ok, false);
assert.equal(missingRefundTarget.error, "STRIPE_REFUND_TARGET_REQUIRED");
assert.equal(stripeRefundMissingTargetPod.lifecycleState, "ADMIN_REVIEW");

const stripeRefundFailurePod = pod({
  id: "refund-stripe-failure",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("refund-stripe-failure", "u1", { role: "HOST" }),
    settlementMember("refund-stripe-failure", "u2", { paymentState: "CAPTURED" }),
  ],
});
moneySafetyMock.protectedPods.push(stripeRefundFailurePod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    id: "ridepod-pi-refund-stripe-failure",
    provider: "STRIPE",
    podId: "refund-stripe-failure",
    podMemberId: "pm-refund-stripe-failure-u2",
    userId: "u2",
    externalPaymentIntentId: "pi_refund_stripe_failure",
    amountCapturedCents: moneySafety.cents(20),
    amountRefundedCents: 0,
    status: "SUCCEEDED",
  }),
);
const failedStripeRefund = await stripeRefunds.refundMemberPayment(
  "pm-refund-stripe-failure-u2",
  moneySafety.cents(10),
  "Stripe refund failure.",
  {
    env: stripeTestEnv,
    stripe: {
      refunds: {
        create: async () => {
          throw new Error("Stripe refund failed.");
        },
      },
    },
  },
);
assert.equal(failedStripeRefund.ok, false);
assert.equal(failedStripeRefund.error, "STRIPE_REFUND_FAILED");
assert.equal(failedStripeRefund.paymentIntent.amountRefundedCents, 0);
assert.equal(failedStripeRefund.member.paymentState, "CAPTURED");

const disputePod = pod({
  id: "refund-dispute",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("refund-dispute", "u1", { role: "HOST" }),
    settlementMember("refund-dispute", "u2", { paymentState: "CAPTURED" }),
  ],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-refund-dispute", podId: "refund-dispute" }],
});
moneySafetyMock.protectedPods.push(disputePod);
const disputeSettlement = settlementRecord("refund-dispute");
moneySafetyMock.mockSettlements.push(disputeSettlement);
moneySafetyMock.mockHostReimbursements.push(hostReimbursementRecord("refund-dispute", disputeSettlement.id, "u1"));
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    id: "ridepod-pi-dispute",
    provider: "MOCK",
    podId: "refund-dispute",
    podMemberId: "pm-refund-dispute-u2",
    userId: "u2",
    amountCapturedCents: moneySafety.cents(30),
    amountRefundedCents: 0,
    status: "SUCCEEDED",
  }),
);
const openedDispute = stripeRefunds.openRidePodDispute(
  "refund-dispute",
  "pm-refund-dispute-u2",
  "Rider disputes host fault.",
  { source: "manual_qa" },
);
assert.equal(openedDispute.ok, true);
assert.equal(openedDispute.pod.lifecycleState, "DISPUTE_HOLD");
assert.equal(openedDispute.member.paymentState, "DISPUTED");
assert.equal(openedDispute.paymentIntent.status, "DISPUTED");
assert.equal(moneySafetyMock.mockHostReimbursements.find((reimbursement) => reimbursement.podId === "refund-dispute").payoutState, "HELD_FOR_REVIEW");
assert.ok(moneySafetyMock.mockRiskFlags.some((flag) => flag.riskType === "STRIPE_PAYMENT_DISPUTE" && flag.podId === "refund-dispute"));
assert.ok(openedDispute.auditEvents.some((event) => event.eventType === "RIDEPOD_DISPUTE_OPENED"));
const resolvedRiderRefund = await stripeRefunds.resolveRidePodDispute(
  "admin-1",
  "refund-dispute",
  "RIDER_REFUND",
  "Rider dispute accepted.",
  { podMemberId: "pm-refund-dispute-u2", refundAmountCents: moneySafety.cents(30) },
);
assert.equal(resolvedRiderRefund.ok, true);
assert.equal(resolvedRiderRefund.refundResult.ok, true);
assert.equal(resolvedRiderRefund.member.paymentState, "REFUNDED");
assert.ok(resolvedRiderRefund.auditEvents.some((event) => event.eventType === "RIDEPOD_DISPUTE_RESOLVED"));

const disputeReleasePod = pod({
  id: "refund-dispute-release",
  hostUserId: "u1",
  lifecycleState: "HOST_REPLACEMENT_NEEDED",
  bookingState: "CANCELED_BY_HOST",
  members: [
    settlementMember("refund-dispute-release", "u1", { role: "HOST" }),
    settlementMember("refund-dispute-release", "u2", { memberState: "CONFIRMED", paymentState: "AUTHORIZED" }),
  ],
});
moneySafetyMock.protectedPods.push(disputeReleasePod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    id: "ridepod-pi-dispute-release",
    provider: "MOCK",
    podId: "refund-dispute-release",
    podMemberId: "pm-refund-dispute-release-u2",
    userId: "u2",
    amountCapturedCents: 0,
    status: "AUTHORIZED",
  }),
);
stripeRefunds.openRidePodDispute("refund-dispute-release", "pm-refund-dispute-release-u2", "Host canceled before booking.");
const resolvedRelease = await stripeRefunds.resolveRidePodDispute(
  "admin-1",
  "refund-dispute-release",
  "RIDER_REFUND",
  "Release authorization after host cancellation.",
  { podMemberId: "pm-refund-dispute-release-u2" },
);
assert.equal(resolvedRelease.ok, true);
assert.equal(resolvedRelease.refundResult.ok, true);
assert.equal(resolvedRelease.member.paymentState, "AUTH_EXPIRED");
assert.equal(resolvedRelease.paymentIntent.status, "CANCELED");

const paidTransferDisputePod = pod({
  id: "refund-paid-transfer-dispute",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("refund-paid-transfer-dispute", "u1", { role: "HOST" }),
    settlementMember("refund-paid-transfer-dispute", "u2", { paymentState: "CAPTURED" }),
  ],
});
moneySafetyMock.protectedPods.push(paidTransferDisputePod);
const paidTransferSettlement = settlementRecord("refund-paid-transfer-dispute");
moneySafetyMock.mockSettlements.push(paidTransferSettlement);
moneySafetyMock.mockHostReimbursements.push(
  hostReimbursementRecord("refund-paid-transfer-dispute", paidTransferSettlement.id, "u1", {
    payoutState: "PAID",
    externalTransferId: "tr_paid_no_auto_reversal",
    paidAt: now,
  }),
);
const paidTransferDispute = stripeRefunds.openRidePodDispute(
  "refund-paid-transfer-dispute",
  null,
  "Host transfer already paid; review manually.",
);
assert.equal(paidTransferDispute.ok, true);
assert.equal(paidTransferDispute.pod.lifecycleState, "DISPUTE_HOLD");
const paidTransferReimbursement = moneySafetyMock.mockHostReimbursements.find((reimbursement) => reimbursement.podId === "refund-paid-transfer-dispute");
assert.equal(paidTransferReimbursement.payoutState, "PAID");
assert.equal(paidTransferReimbursement.externalTransferId, "tr_paid_no_auto_reversal");
assert.equal(stripeSource.includes("wallet"), false);

const reconciliationCapturedOverFinalPod = pod({
  id: "reconcile-captured-over-final",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reconcile-captured-over-final", "u1", { role: "HOST" }),
    settlementMember("reconcile-captured-over-final", "u2", {
      finalChargeCents: moneySafety.cents(20),
      maxChargeCents: moneySafety.cents(60),
      paymentState: "CAPTURED",
    }),
  ],
});
moneySafetyMock.protectedPods.push(reconciliationCapturedOverFinalPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    id: "ridepod-pi-reconcile-captured-over-final",
    provider: "MOCK",
    podId: "reconcile-captured-over-final",
    podMemberId: "pm-reconcile-captured-over-final-u2",
    userId: "u2",
    amountCapturedCents: moneySafety.cents(25),
    status: "SUCCEEDED",
  }),
);
const capturedOverFinalSnapshot = paymentReconciliation.getPaymentReconciliationSnapshot("reconcile-captured-over-final");
assert.equal(capturedOverFinalSnapshot.members.length, 2);
assert.ok(capturedOverFinalSnapshot.warnings.includes("Captured amount exceeds final charge for u2."));

const reconciliationFinalOverMaxPod = pod({
  id: "reconcile-final-over-max",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("reconcile-final-over-max", "u1", { role: "HOST" }),
    settlementMember("reconcile-final-over-max", "u2", {
      finalChargeCents: moneySafety.cents(65),
      maxChargeCents: moneySafety.cents(60),
    }),
  ],
});
moneySafetyMock.protectedPods.push(reconciliationFinalOverMaxPod);
assert.ok(
  paymentReconciliation
    .getPaymentReconciliationSnapshot("reconcile-final-over-max")
    .warnings.includes("Final charge exceeds max charge for u2."),
);

const reconciliationNoVerifiedReceiptPod = pod({
  id: "reconcile-no-verified-receipt",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [settlementMember("reconcile-no-verified-receipt", "u1", { role: "HOST" })],
  receipts: [
    {
      id: "receipt-reconcile-no-verified",
      podId: "reconcile-no-verified-receipt",
      hostUserId: "u1",
      providerName: "UBER",
      vehicleClass: null,
      externalTripReferenceHash: null,
      receiptFileUrl: null,
      receiptFileId: null,
      fareTotalCents: moneySafety.cents(45),
      baseFareCents: null,
      taxesCents: null,
      tollsCents: null,
      feesCents: null,
      tipCents: null,
      currency: "USD",
      rideStartedAt: null,
      rideCompletedAt: null,
      submittedAt: now,
      verificationState: "SUBMITTED",
      reviewedByAdminId: null,
      rejectionReason: null,
      fraudScore: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
});
moneySafetyMock.protectedPods.push(reconciliationNoVerifiedReceiptPod);
moneySafetyMock.mockSettlements.push(settlementRecord("reconcile-no-verified-receipt"));
assert.ok(
  paymentReconciliation
    .getPaymentReconciliationSnapshot("reconcile-no-verified-receipt")
    .warnings.includes("Settlement exists without a verified receipt."),
);

const reconciliationTransferHoldPod = pod({
  id: "reconcile-transfer-hold",
  hostUserId: "u1",
  lifecycleState: "DISPUTE_HOLD",
  bookingState: "BOOKED",
  members: [settlementMember("reconcile-transfer-hold", "u1", { role: "HOST" })],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reconcile-transfer-hold", podId: "reconcile-transfer-hold" }],
});
moneySafetyMock.protectedPods.push(reconciliationTransferHoldPod);
const transferHoldSettlement = settlementRecord("reconcile-transfer-hold");
moneySafetyMock.mockSettlements.push(transferHoldSettlement);
moneySafetyMock.mockHostReimbursements.push(
  hostReimbursementRecord("reconcile-transfer-hold", transferHoldSettlement.id, "u1", {
    payoutState: "PAID",
    externalTransferId: "tr_reconcile_hold",
    paidAt: now,
  }),
);
const transferHoldWarnings = paymentReconciliation.getPaymentReconciliationSnapshot("reconcile-transfer-hold").warnings;
assert.ok(transferHoldWarnings.includes("Transfer exists while pod is in admin review or dispute hold."));
assert.ok(transferHoldWarnings.includes("Host reimbursement is paid while dispute hold is active."));

const reconciliationHostReimbursementOverPod = pod({
  id: "reconcile-host-reimbursement-over",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [settlementMember("reconcile-host-reimbursement-over", "u1", { role: "HOST" })],
  receipts: [{ ...adminReviewReimbursementPod.receipts[0], id: "receipt-reconcile-host-reimbursement-over", podId: "reconcile-host-reimbursement-over" }],
});
moneySafetyMock.protectedPods.push(reconciliationHostReimbursementOverPod);
const reimbursementOverSettlement = settlementRecord("reconcile-host-reimbursement-over", {
  hostReimbursementCents: moneySafety.cents(40),
  hostRewardCents: moneySafety.cents(5),
});
moneySafetyMock.mockSettlements.push(reimbursementOverSettlement);
moneySafetyMock.mockHostReimbursements.push(
  hostReimbursementRecord("reconcile-host-reimbursement-over", reimbursementOverSettlement.id, "u1", {
    totalTransferCents: moneySafety.cents(50),
  }),
);
assert.ok(
  paymentReconciliation
    .getPaymentReconciliationSnapshot("reconcile-host-reimbursement-over")
    .warnings.includes("Host reimbursement exceeds eligible fare plus approved host reward."),
);

const reconciliationHostCanBookNoQuotePod = pod({
  id: "reconcile-host-can-book-no-quote",
  hostUserId: "u1",
  lifecycleState: "HOST_CAN_BOOK",
  bookingState: "CAN_BOOK",
  minSeatsToBook: 1,
  members: [settlementMember("reconcile-host-can-book-no-quote", "u1", { role: "HOST", paymentState: "AUTHORIZED", memberState: "CONFIRMED" })],
  quotes: [],
});
moneySafetyMock.protectedPods.push(reconciliationHostCanBookNoQuotePod);
assert.ok(
  paymentReconciliation
    .getPaymentReconciliationSnapshot("reconcile-host-can-book-no-quote")
    .warnings.includes("HOST_CAN_BOOK exists without an approved quote."),
);

const reconciliationRideBookedNoLocksPod = pod({
  id: "reconcile-ride-booked-no-locks",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  minSeatsToBook: 3,
  members: [
    settlementMember("reconcile-ride-booked-no-locks", "u1", { role: "HOST", paymentState: "AUTHORIZED", memberState: "CONFIRMED" }),
    settlementMember("reconcile-ride-booked-no-locks", "u2", { paymentState: "PAYMENT_METHOD_REQUIRED", memberState: "PAYMENT_REQUIRED" }),
  ],
});
moneySafetyMock.protectedPods.push(reconciliationRideBookedNoLocksPod);
assert.ok(
  paymentReconciliation
    .getPaymentReconciliationSnapshot("reconcile-ride-booked-no-locks")
    .warnings.includes("RIDE_BOOKED exists without required payment-authorized participants."),
);

const receiptNeedsInfoPod = pod({
  id: "settlement-needs-info",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  members: [settlementMember("settlement-needs-info", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(receiptNeedsInfoPod);
const needsInfoReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-needs-info", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(40),
  currency: "USD",
});
const needsInfoDecision = podSettlement.adminVerifyReceipt("admin-1", needsInfoReceipt.receipt.id, "NEEDS_MORE_INFO");
assert.equal(needsInfoDecision.ok, true);
assert.equal(needsInfoDecision.receipt.verificationState, "NEEDS_MORE_INFO");
assert.equal(needsInfoDecision.settlementResult, null);
assert.equal(needsInfoDecision.pod.lifecycleState, "RECEIPT_PENDING");

const receiptRejectedPod = pod({
  id: "settlement-rejected-receipt",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  members: [settlementMember("settlement-rejected-receipt", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(receiptRejectedPod);
const rejectedReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-rejected-receipt", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(40),
  currency: "USD",
});
const rejectedDecision = podSettlement.adminVerifyReceipt("admin-1", rejectedReceipt.receipt.id, {
  decision: "REJECTED",
  rejectionReason: "Receipt does not match the booked ride.",
});
assert.equal(rejectedDecision.ok, true);
assert.equal(rejectedDecision.receipt.verificationState, "REJECTED");
assert.equal(rejectedDecision.settlementResult, null);
assert.equal(rejectedDecision.pod.lifecycleState, "ADMIN_REVIEW");
assert.equal(rejectedDecision.pod.adminReviewRequired, true);
assert.ok(rejectedDecision.auditEvents.some((event) => event.eventType === "ADMIN_OVERRIDE"));
assert.ok(rejectedDecision.auditEvents.some((event) => event.eventPayload.action === "RECEIPT_REJECTED"));
assert.equal(
  moneySafetyMock.mockHostReimbursements.some((reimbursement) => reimbursement.podId === "settlement-rejected-receipt"),
  false,
);

const underMaxReceiptPod = pod({
  id: "settlement-under-max",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: moneySafety.cents(90),
  members: [
    settlementMember("settlement-under-max", "u1", { role: "HOST" }),
    settlementMember("settlement-under-max", "u2"),
    settlementMember("settlement-under-max", "u6"),
  ],
  quotes: [
    {
      id: "quote-settlement-under-max-1",
      podId: "settlement-under-max",
      hostUserId: "u1",
      providerName: "LYFT",
      vehicleClass: "XL",
      quotedFareCents: moneySafety.cents(70),
      currency: "USD",
      routeSummary: "USC to LAX",
      screenshotFileUrl: "mock://settlement-under-max-quote.png",
      screenshotFileId: "mock-file-settlement-under-max-quote",
      submittedAt: now,
      reviewState: "AUTO_APPROVED",
      reviewedByAdminId: null,
      adminNotes: null,
      isFresh: true,
      expiresAt: null,
    },
  ],
});
moneySafetyMock.protectedPods.push(underMaxReceiptPod);
const underMaxReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-under-max", {
  providerName: "LYFT",
  fareTotalCents: moneySafety.cents(86),
  currency: "USD",
  receiptFileUrl: "mock://receipt-under-max.png",
  receiptFileId: "mock-file-receipt-under-max",
});
const underMaxVerified = podSettlement.adminVerifyReceipt("admin-1", underMaxReceipt.receipt.id, "VERIFIED");
assert.equal(underMaxVerified.settlementResult.settlement.verifiedFareCents, moneySafety.cents(86));
assert.equal(underMaxVerified.settlementResult.hostReimbursement.fareReimbursementCents, moneySafety.cents(86));

const cappedReceiptPod = pod({
  id: "settlement-capped",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: moneySafety.cents(90),
  members: [
    settlementMember("settlement-capped", "u1", { role: "HOST" }),
    settlementMember("settlement-capped", "u2"),
    settlementMember("settlement-capped", "u6"),
  ],
});
moneySafetyMock.protectedPods.push(cappedReceiptPod);
const cappedReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-capped", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(120),
  currency: "USD",
  receiptFileUrl: "mock://receipt-capped.png",
  receiptFileId: "mock-file-receipt-capped",
});
const cappedVerified = podSettlement.adminVerifyReceipt("admin-1", cappedReceipt.receipt.id, "VERIFIED");
assert.equal(cappedVerified.settlementResult.settlement.verifiedFareCents, moneySafety.cents(120));
assert.equal(cappedVerified.settlementResult.hostReimbursement.fareReimbursementCents, moneySafety.cents(90));
assert.equal(cappedVerified.settlementResult.hostReimbursement.totalTransferCents, moneySafety.cents(90));
assert.equal(
  cappedVerified.settlementResult.settlement.items
    .filter((item) => item.itemType === "FARE_SHARE")
    .reduce((sum, item) => sum + item.amountCents, 0),
  moneySafety.cents(90),
);
assert.equal(cappedVerified.settlementResult.settlement.settlementState, "FINALIZED");

const higherMaxPod = pod({
  id: "settlement-higher-max",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: moneySafety.cents(90),
  higherMaxApprovedCents: moneySafety.cents(120),
  members: [
    settlementMember("settlement-higher-max", "u1", { role: "HOST" }),
    settlementMember("settlement-higher-max", "u2"),
    settlementMember("settlement-higher-max", "u6"),
  ],
});
moneySafetyMock.protectedPods.push(higherMaxPod);
const higherMaxReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-higher-max", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(120),
  currency: "USD",
  receiptFileUrl: "mock://receipt-higher-max.png",
});
const higherMaxVerified = podSettlement.adminVerifyReceipt("admin-1", higherMaxReceipt.receipt.id, "VERIFIED");
assert.equal(higherMaxVerified.settlementResult.settlement.approvedFareCents, moneySafety.cents(120));
assert.equal(higherMaxVerified.settlementResult.hostReimbursement.fareReimbursementCents, moneySafety.cents(120));

const memberCapPod = pod({
  id: "settlement-member-cap",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: moneySafety.cents(120),
  members: [
    settlementMember("settlement-member-cap", "u1", { role: "HOST", maxChargeCents: moneySafety.cents(30), platformFeeCents: moneySafety.cents(2) }),
    settlementMember("settlement-member-cap", "u2", { maxChargeCents: moneySafety.cents(30), platformFeeCents: moneySafety.cents(2) }),
  ],
});
moneySafetyMock.protectedPods.push(memberCapPod);
const memberCapReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-member-cap", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(120),
  currency: "USD",
  receiptFileUrl: "mock://receipt-member-cap.png",
});
const memberCapVerified = podSettlement.adminVerifyReceipt("admin-1", memberCapReceipt.receipt.id, "VERIFIED");
assert.equal(memberCapVerified.ok, true);
assert.ok(memberCapVerified.settlementResult.pod.members.every((member) => member.finalChargeCents <= member.maxChargeCents));

const noShowPod = pod({
  id: "settlement-no-show",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: moneySafety.cents(90),
  members: [
    settlementMember("settlement-no-show", "u1", { role: "HOST" }),
    settlementMember("settlement-no-show", "u2", {
      memberState: "NO_SHOW",
      paymentState: "AUTHORIZED",
      noShowLiabilityCents: moneySafety.cents(5),
    }),
    settlementMember("settlement-no-show", "u6"),
  ],
});
moneySafetyMock.protectedPods.push(noShowPod);
const noShowReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-no-show", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(75),
  currency: "USD",
  receiptFileUrl: "mock://receipt-no-show.png",
});
const noShowVerified = podSettlement.adminVerifyReceipt("admin-1", noShowReceipt.receipt.id, "VERIFIED");
assert.ok(
  noShowVerified.settlementResult.settlement.items.some(
    (item) => item.userId === "u2" && item.itemType === "NO_SHOW_FEE" && item.amountCents === moneySafety.cents(5),
  ),
);
assert.ok(noShowVerified.settlementResult.settlement.items.some((item) => item.userId === "u2" && item.itemType === "FARE_SHARE"));

const exclusionPod = pod({
  id: "settlement-exclusions",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: moneySafety.cents(80),
  members: [
    settlementMember("settlement-exclusions", "u1", { role: "HOST" }),
    settlementMember("settlement-exclusions", "u2", {
      memberState: "CANCELED",
      paymentState: "REFUNDED",
      lockedAt: null,
      cancellationLiabilityCents: null,
      canceledAt: "2026-05-13T01:00:00.000Z",
    }),
    settlementMember("settlement-exclusions", "u6", {
      memberState: "CANCELED",
      paymentState: "REFUNDED",
      cancellationLiabilityCents: moneySafety.cents(7),
      replacedByMemberId: "pm-settlement-exclusions-u7",
      canceledAt: "2026-05-14T07:20:00.000Z",
    }),
    settlementMember("settlement-exclusions", "u8", {
      memberState: "CANCELED",
      paymentState: "AUTHORIZED",
      cancellationLiabilityCents: moneySafety.cents(7),
      canceledAt: "2026-05-14T07:25:00.000Z",
    }),
    settlementMember("settlement-exclusions", "u7"),
  ],
});
moneySafetyMock.protectedPods.push(exclusionPod);
const exclusionReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-exclusions", {
  providerName: "TAXI",
  fareTotalCents: moneySafety.cents(60),
  currency: "USD",
  receiptFileUrl: "mock://receipt-exclusions.png",
});
const exclusionVerified = podSettlement.adminVerifyReceipt("admin-1", exclusionReceipt.receipt.id, "VERIFIED");
const exclusionFareUsers = exclusionVerified.settlementResult.settlement.items
  .filter((item) => item.itemType === "FARE_SHARE")
  .map((item) => item.userId);
assert.equal(exclusionFareUsers.includes("u2"), false);
assert.equal(exclusionFareUsers.includes("u6"), false);
assert.equal(exclusionFareUsers.includes("u8"), true);
assert.equal(exclusionFareUsers.includes("u7"), true);
assert.ok(
  exclusionVerified.settlementResult.settlement.items.some(
    (item) => item.userId === "u8" && item.itemType === "LATE_CANCEL_FEE" && item.amountCents === moneySafety.cents(7),
  ),
);

const roundingPod = pod({
  id: "settlement-rounding",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: 10001,
  members: [
    settlementMember("settlement-rounding", "u1", { role: "HOST", id: "pm-settlement-rounding-a", createdAt: "2026-05-11T10:01:00.000Z" }),
    settlementMember("settlement-rounding", "u2", { id: "pm-settlement-rounding-b", createdAt: "2026-05-11T10:02:00.000Z" }),
    settlementMember("settlement-rounding", "u6", { id: "pm-settlement-rounding-c", createdAt: "2026-05-11T10:03:00.000Z" }),
  ],
});
moneySafetyMock.protectedPods.push(roundingPod);
const roundingReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-rounding", {
  providerName: "UBER",
  fareTotalCents: 10001,
  currency: "USD",
  receiptFileUrl: "mock://receipt-rounding.png",
});
const roundingVerified = podSettlement.adminVerifyReceipt("admin-1", roundingReceipt.receipt.id, "VERIFIED");
assert.deepEqual(
  roundingVerified.settlementResult.settlement.items
    .filter((item) => item.itemType === "FARE_SHARE")
    .map((item) => item.amountCents),
  [3334, 3334, 3333],
);

const noBillablePod = pod({
  id: "settlement-no-billable",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  members: [
    settlementMember("settlement-no-billable", "u1", {
      memberState: "CANCELED",
      paymentState: "REFUNDED",
      lockedAt: null,
      cancellationLiabilityCents: null,
    }),
    settlementMember("settlement-no-billable", "u2", {
      memberState: "CANCELED",
      paymentState: "REFUNDED",
      lockedAt: null,
      cancellationLiabilityCents: null,
    }),
  ],
});
moneySafetyMock.protectedPods.push(noBillablePod);
const noBillableReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-no-billable", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(40),
  currency: "USD",
  receiptFileUrl: "mock://receipt-no-billable.png",
});
const noBillableVerified = podSettlement.adminVerifyReceipt("admin-1", noBillableReceipt.receipt.id, "VERIFIED");
assert.equal(noBillableVerified.ok, false);
assert.equal(noBillableVerified.error, "NO_BILLABLE_MEMBERS");
assert.equal(noBillableVerified.pod.lifecycleState, "ADMIN_REVIEW");
assert.equal(noBillableVerified.pod.adminReviewRequired, true);

const fraudReceiptPod = pod({
  id: "settlement-fraud-receipt",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  members: [settlementMember("settlement-fraud-receipt", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(fraudReceiptPod);
const fraudReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-fraud-receipt", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(40),
  currency: "USD",
  receiptFileUrl: "mock://receipt-fraud.png",
});
const fraudDecision = podSettlement.adminVerifyReceipt("admin-1", fraudReceipt.receipt.id, {
  decision: "FRAUD_SUSPECTED",
  rejectionReason: "Screenshot metadata mismatch",
  fraudScore: 0.91,
});
assert.equal(fraudDecision.ok, true);
assert.equal(fraudDecision.pod.lifecycleState, "ADMIN_REVIEW");
assert.ok(fraudDecision.auditEvents.some((event) => event.eventType === "ADMIN_OVERRIDE"));
assert.ok(fraudDecision.auditEvents.some((event) => event.eventPayload.action === "RECEIPT_FRAUD_SUSPECTED"));
assert.equal(fraudDecision.riskFlags[0].riskType, "FAKE_RECEIPT_SUSPECTED");

const hostFaultPod = pod({
  id: "settlement-host-fault",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  approvedMaxTotalFareCents: moneySafety.cents(90),
  adminReviewRequired: true,
  members: [
    settlementMember("settlement-host-fault", "u1", { role: "HOST" }),
    settlementMember("settlement-host-fault", "u2"),
  ],
});
moneySafetyMock.protectedPods.push(hostFaultPod);
const hostFaultReceipt = podSettlement.uploadFinalReceipt("u1", "settlement-host-fault", {
  providerName: "UBER",
  fareTotalCents: moneySafety.cents(70),
  currency: "USD",
  receiptFileUrl: "mock://receipt-host-fault.png",
});
const hostFaultVerified = podSettlement.adminVerifyReceipt("admin-1", hostFaultReceipt.receipt.id, "VERIFIED");
assert.equal(hostFaultVerified.ok, true);
assert.equal(hostFaultVerified.settlementResult.settlement.settlementState, "ADMIN_REVIEW");
assert.equal(hostFaultVerified.settlementResult.hostReimbursement.payoutState, "HELD_FOR_REVIEW");
assert.equal(hostFaultVerified.settlementResult.auditEvents.some((event) => event.eventType === "SETTLEMENT_FINALIZED"), false);

const hostReimbursementCountBeforeStripeFinalizationQa = moneySafetyMock.mockHostReimbursements.length;

const captureBeforeSettlementPod = pod({
  id: "capture-before-settlement",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  members: [settlementMember("capture-before-settlement", "u1", { role: "HOST", finalChargeCents: moneySafety.cents(20) })],
});
moneySafetyMock.protectedPods.push(captureBeforeSettlementPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    podId: "capture-before-settlement",
    podMemberId: "pm-capture-before-settlement-u1",
    userId: "u1",
    amountAuthorizedCents: moneySafety.cents(30),
  }),
);
assert.equal(
  (await podPaymentCapture.captureMemberPayment("pm-capture-before-settlement-u1")).error,
  "SETTLEMENT_REQUIRED",
);

const mockCapturePod = pod({
  id: "capture-mock-finalized",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("capture-mock-finalized", "u1", {
      role: "HOST",
      finalChargeCents: moneySafety.cents(24),
      maxChargeCents: moneySafety.cents(40),
    }),
    settlementMember("capture-mock-finalized", "u2", {
      finalChargeCents: 0,
      maxChargeCents: moneySafety.cents(40),
    }),
  ],
  receipts: [
    {
      id: "receipt-capture-mock-finalized",
      podId: "capture-mock-finalized",
      hostUserId: "u1",
      providerName: "UBER",
      vehicleClass: null,
      externalTripReferenceHash: null,
      receiptFileUrl: "mock://receipt-capture.png",
      receiptFileId: null,
      fareTotalCents: moneySafety.cents(24),
      baseFareCents: null,
      taxesCents: null,
      tollsCents: null,
      feesCents: null,
      tipCents: null,
      currency: "USD",
      rideStartedAt: null,
      rideCompletedAt: null,
      submittedAt: now,
      verificationState: "VERIFIED",
      reviewedByAdminId: "admin-1",
      rejectionReason: null,
      fraudScore: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
});
moneySafetyMock.protectedPods.push(mockCapturePod);
moneySafetyMock.mockSettlements.push({
  id: "settlement-capture-mock-finalized",
  podId: "capture-mock-finalized",
  settlementState: "FINALIZED",
  version: 1,
  approvedFareCents: moneySafety.cents(24),
  verifiedFareCents: moneySafety.cents(24),
  billableSeatCount: 2,
  totalPlatformFeeCents: 0,
  hostReimbursementCents: moneySafety.cents(24),
  hostRewardCents: 0,
  roundingPolicy: "test",
  disputeDeadlineAt: null,
  adminReviewRequired: false,
  items: [
    {
      id: "settlement-capture-mock-finalized-host-fare",
      settlementId: "settlement-capture-mock-finalized",
      podMemberId: "pm-capture-mock-finalized-u1",
      userId: "u1",
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: moneySafety.cents(24),
      reasonCode: "TEST",
      createdAt: now,
    },
    {
      id: "settlement-capture-mock-finalized-u2-fare",
      settlementId: "settlement-capture-mock-finalized",
      podMemberId: "pm-capture-mock-finalized-u2",
      userId: "u2",
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: 0,
      reasonCode: "TEST",
      createdAt: now,
    },
  ],
  createdAt: now,
  finalizedAt: now,
  updatedAt: now,
});
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    podId: "capture-mock-finalized",
    podMemberId: "pm-capture-mock-finalized-u1",
    userId: "u1",
    externalPaymentIntentId: "mock_pi_capture_u1",
    amountAuthorizedCents: moneySafety.cents(40),
  }),
  localPaymentIntent({
    podId: "capture-mock-finalized",
    podMemberId: "pm-capture-mock-finalized-u2",
    userId: "u2",
    externalPaymentIntentId: "mock_pi_capture_u2",
    amountAuthorizedCents: moneySafety.cents(40),
  }),
);
const mockCaptureResult = await podPaymentCapture.captureMemberPayment("pm-capture-mock-finalized-u1");
assert.equal(mockCaptureResult.ok, true);
assert.equal(mockCaptureResult.member.paymentState, "CAPTURED");
assert.equal(mockCaptureResult.paymentIntent.status, "SUCCEEDED");
assert.equal(mockCaptureResult.paymentIntent.amountCapturedCents, moneySafety.cents(24));
const mockCancelResult = await podPaymentCapture.cancelMemberAuthorization("pm-capture-mock-finalized-u2");
assert.equal(mockCancelResult.ok, true);
assert.equal(mockCancelResult.member.paymentState, "REFUNDED");
assert.equal(mockCancelResult.paymentIntent.status, "CANCELED");
assert.equal(mockCancelResult.paymentIntent.amountCapturedCents, 0);

const captureAllResult = await podPaymentCapture.captureSettledRidePayments("capture-mock-finalized");
assert.equal(captureAllResult.ok, false);
assert.ok(captureAllResult.results.some((result) => result.error === "PAYMENT_INTENT_NOT_CAPTURABLE"));

const unverifiedCapturePod = pod({
  id: "capture-unverified-receipt",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [settlementMember("capture-unverified-receipt", "u1", { role: "HOST", finalChargeCents: moneySafety.cents(10) })],
  receipts: [],
});
moneySafetyMock.protectedPods.push(unverifiedCapturePod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-unverified-receipt",
  podId: "capture-unverified-receipt",
  items: [],
});
assert.equal(
  (await podPaymentCapture.captureSettledRidePayments("capture-unverified-receipt")).error,
  "VERIFIED_RECEIPT_REQUIRED",
);

const adminHoldCapturePod = pod({
  id: "capture-admin-hold",
  hostUserId: "u1",
  lifecycleState: "ADMIN_REVIEW",
  bookingState: "BOOKED",
  adminReviewRequired: true,
  members: [settlementMember("capture-admin-hold", "u1", { role: "HOST", finalChargeCents: moneySafety.cents(10) })],
  receipts: mockCapturePod.receipts.map((receipt) => ({ ...receipt, id: "receipt-capture-admin-hold", podId: "capture-admin-hold" })),
});
moneySafetyMock.protectedPods.push(adminHoldCapturePod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-admin-hold",
  podId: "capture-admin-hold",
  adminReviewRequired: false,
});
assert.equal(
  (await podPaymentCapture.captureSettledRidePayments("capture-admin-hold")).error,
  "POD_ADMIN_REVIEW_HOLD",
);

const disputeHoldCapturePod = pod({
  id: "capture-dispute-hold",
  hostUserId: "u1",
  lifecycleState: "DISPUTE_HOLD",
  bookingState: "BOOKED",
  members: [settlementMember("capture-dispute-hold", "u1", { role: "HOST", finalChargeCents: moneySafety.cents(10) })],
  receipts: mockCapturePod.receipts.map((receipt) => ({ ...receipt, id: "receipt-capture-dispute-hold", podId: "capture-dispute-hold" })),
});
moneySafetyMock.protectedPods.push(disputeHoldCapturePod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-dispute-hold",
  podId: "capture-dispute-hold",
  adminReviewRequired: false,
});
assert.equal(
  (await podPaymentCapture.captureSettledRidePayments("capture-dispute-hold")).error,
  "POD_ADMIN_REVIEW_HOLD",
);

const settlementHoldPod = pod({
  id: "capture-settlement-review",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [settlementMember("capture-settlement-review", "u1", { role: "HOST", finalChargeCents: moneySafety.cents(10) })],
  receipts: mockCapturePod.receipts.map((receipt) => ({ ...receipt, id: "receipt-capture-settlement-review", podId: "capture-settlement-review" })),
});
moneySafetyMock.protectedPods.push(settlementHoldPod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-settlement-review",
  podId: "capture-settlement-review",
  adminReviewRequired: true,
});
assert.equal(
  (await podPaymentCapture.captureSettledRidePayments("capture-settlement-review")).error,
  "SETTLEMENT_ADMIN_REVIEW_REQUIRED",
);

const maxCapPod = pod({
  id: "capture-max-cap",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("capture-max-cap", "u1", {
      role: "HOST",
      finalChargeCents: moneySafety.cents(45),
      maxChargeCents: moneySafety.cents(40),
    }),
  ],
  receipts: mockCapturePod.receipts.map((receipt) => ({ ...receipt, id: "receipt-capture-max-cap", podId: "capture-max-cap" })),
});
moneySafetyMock.protectedPods.push(maxCapPod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-max-cap",
  podId: "capture-max-cap",
  items: [
    {
      id: "settlement-capture-max-cap-host-fare",
      settlementId: "settlement-capture-max-cap",
      podMemberId: "pm-capture-max-cap-u1",
      userId: "u1",
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: moneySafety.cents(45),
      reasonCode: "TEST",
      createdAt: now,
    },
  ],
  adminReviewRequired: false,
});
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    podId: "capture-max-cap",
    podMemberId: "pm-capture-max-cap-u1",
    userId: "u1",
    amountAuthorizedCents: moneySafety.cents(50),
  }),
);
assert.equal(
  (await podPaymentCapture.captureMemberPayment("pm-capture-max-cap-u1")).error,
  "FINAL_CHARGE_EXCEEDS_MAX_CHARGE",
);

const authCapPod = pod({
  id: "capture-auth-cap",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("capture-auth-cap", "u1", {
      role: "HOST",
      finalChargeCents: moneySafety.cents(35),
      maxChargeCents: moneySafety.cents(50),
    }),
  ],
  receipts: mockCapturePod.receipts.map((receipt) => ({ ...receipt, id: "receipt-capture-auth-cap", podId: "capture-auth-cap" })),
});
moneySafetyMock.protectedPods.push(authCapPod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-auth-cap",
  podId: "capture-auth-cap",
  items: [
    {
      id: "settlement-capture-auth-cap-host-fare",
      settlementId: "settlement-capture-auth-cap",
      podMemberId: "pm-capture-auth-cap-u1",
      userId: "u1",
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: moneySafety.cents(35),
      reasonCode: "TEST",
      createdAt: now,
    },
  ],
  adminReviewRequired: false,
});
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    podId: "capture-auth-cap",
    podMemberId: "pm-capture-auth-cap-u1",
    userId: "u1",
    amountAuthorizedCents: moneySafety.cents(30),
  }),
);
assert.equal(
  (await podPaymentCapture.captureMemberPayment("pm-capture-auth-cap-u1")).error,
  "FINAL_CHARGE_EXCEEDS_AUTHORIZATION",
);

function stripeCaptureProvider({ captureStatus = "succeeded", cancelStatus = "canceled", failCapture = false } = {}) {
  const calls = { captures: [], cancels: [] };
  return {
    calls,
    provider: paymentProvider.createStripeTestProvider(stripeTestEnv, {
      paymentIntents: {
        capture: async (id, input, options) => {
          calls.captures.push({ id, input, options });
          if (failCapture) {
            const error = new Error("Capture failed.");
            error.code = "capture_failed";
            throw error;
          }
          return { id, status: captureStatus, amount_received: input.amount_to_capture };
        },
        cancel: async (id, input, options) => {
          calls.cancels.push({ id, input, options });
          return { id, status: cancelStatus, cancellation_reason: input?.cancellation_reason ?? null };
        },
      },
    }),
  };
}

const stripeCapturePod = pod({
  id: "capture-stripe-finalized",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("capture-stripe-finalized", "u1", {
      role: "HOST",
      finalChargeCents: moneySafety.cents(22),
      maxChargeCents: moneySafety.cents(40),
      paymentState: "AUTHORIZED",
    }),
    settlementMember("capture-stripe-finalized", "u2", {
      finalChargeCents: 0,
      maxChargeCents: moneySafety.cents(40),
      paymentState: "AUTHORIZED",
    }),
  ],
  receipts: mockCapturePod.receipts.map((receipt) => ({ ...receipt, id: "receipt-capture-stripe-finalized", podId: "capture-stripe-finalized" })),
});
moneySafetyMock.protectedPods.push(stripeCapturePod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-stripe-finalized",
  podId: "capture-stripe-finalized",
  items: [
    {
      id: "settlement-capture-stripe-finalized-host-fare",
      settlementId: "settlement-capture-stripe-finalized",
      podMemberId: "pm-capture-stripe-finalized-u1",
      userId: "u1",
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: moneySafety.cents(22),
      reasonCode: "TEST",
      createdAt: now,
    },
    {
      id: "settlement-capture-stripe-finalized-u2-fare",
      settlementId: "settlement-capture-stripe-finalized",
      podMemberId: "pm-capture-stripe-finalized-u2",
      userId: "u2",
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: 0,
      reasonCode: "TEST",
      createdAt: now,
    },
  ],
  adminReviewRequired: false,
});
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    provider: "STRIPE",
    podId: "capture-stripe-finalized",
    podMemberId: "pm-capture-stripe-finalized-u1",
    userId: "u1",
    externalPaymentIntentId: "pi_capture_stripe_u1",
    amountAuthorizedCents: moneySafety.cents(40),
  }),
  localPaymentIntent({
    provider: "STRIPE",
    podId: "capture-stripe-finalized",
    podMemberId: "pm-capture-stripe-finalized-u2",
    userId: "u2",
    externalPaymentIntentId: "pi_capture_stripe_u2",
    amountAuthorizedCents: moneySafety.cents(40),
  }),
);
const stripeCapture = stripeCaptureProvider();
const stripeCaptureResult = await podPaymentCapture.captureMemberPayment("pm-capture-stripe-finalized-u1", {
  paymentProvider: stripeCapture.provider,
});
assert.equal(stripeCaptureResult.ok, true);
assert.equal(stripeCaptureResult.member.paymentState, "CAPTURED");
assert.equal(stripeCaptureResult.paymentIntent.status, "SUCCEEDED");
assert.equal(stripeCaptureResult.paymentIntent.amountCapturedCents, moneySafety.cents(22));
assert.equal(stripeCapture.calls.captures[0].id, "pi_capture_stripe_u1");
assert.equal(stripeCapture.calls.captures[0].input.amount_to_capture, moneySafety.cents(22));
const stripeCancelResult = await podPaymentCapture.cancelMemberAuthorization("pm-capture-stripe-finalized-u2", {
  paymentProvider: stripeCapture.provider,
});
assert.equal(stripeCancelResult.ok, true);
assert.equal(stripeCancelResult.member.paymentState, "REFUNDED");
assert.equal(stripeCancelResult.paymentIntent.status, "CANCELED");
assert.equal(stripeCapture.calls.cancels[0].id, "pi_capture_stripe_u2");
assert.equal(stripeCapture.calls.cancels[0].input.cancellation_reason, "requested_by_customer");

const missingExternalPod = pod({
  id: "capture-missing-external",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("capture-missing-external", "u1", {
      role: "HOST",
      finalChargeCents: moneySafety.cents(10),
      maxChargeCents: moneySafety.cents(20),
      paymentState: "AUTHORIZED",
    }),
  ],
  receipts: mockCapturePod.receipts.map((receipt) => ({ ...receipt, id: "receipt-capture-missing-external", podId: "capture-missing-external" })),
});
moneySafetyMock.protectedPods.push(missingExternalPod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-missing-external",
  podId: "capture-missing-external",
  items: [
    {
      id: "settlement-capture-missing-external-host-fare",
      settlementId: "settlement-capture-missing-external",
      podMemberId: "pm-capture-missing-external-u1",
      userId: "u1",
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: moneySafety.cents(10),
      reasonCode: "TEST",
      createdAt: now,
    },
  ],
  adminReviewRequired: false,
});
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    provider: "STRIPE",
    podId: "capture-missing-external",
    podMemberId: "pm-capture-missing-external-u1",
    userId: "u1",
    externalPaymentIntentId: null,
    amountAuthorizedCents: moneySafety.cents(20),
  }),
);
assert.equal(
  (await podPaymentCapture.captureMemberPayment("pm-capture-missing-external-u1", {
    paymentProvider: stripeCapture.provider,
  })).error,
  "STRIPE_PAYMENT_INTENT_ID_REQUIRED",
);

const failedStripeCapture = stripeCaptureProvider({ failCapture: true });
const stripeFailurePod = pod({
  id: "capture-stripe-failure",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  bookingState: "BOOKED",
  members: [
    settlementMember("capture-stripe-failure", "u1", {
      role: "HOST",
      finalChargeCents: moneySafety.cents(18),
      maxChargeCents: moneySafety.cents(40),
      paymentState: "AUTHORIZED",
    }),
  ],
  receipts: mockCapturePod.receipts.map((receipt) => ({ ...receipt, id: "receipt-capture-stripe-failure", podId: "capture-stripe-failure" })),
});
moneySafetyMock.protectedPods.push(stripeFailurePod);
moneySafetyMock.mockSettlements.push({
  ...moneySafetyMock.mockSettlements.find((settlement) => settlement.id === "settlement-capture-mock-finalized"),
  id: "settlement-capture-stripe-failure",
  podId: "capture-stripe-failure",
  items: [
    {
      id: "settlement-capture-stripe-failure-host-fare",
      settlementId: "settlement-capture-stripe-failure",
      podMemberId: "pm-capture-stripe-failure-u1",
      userId: "u1",
      itemType: "FARE_SHARE",
      direction: "DEBIT_USER",
      amountCents: moneySafety.cents(18),
      reasonCode: "TEST",
      createdAt: now,
    },
  ],
  adminReviewRequired: false,
});
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    provider: "STRIPE",
    podId: "capture-stripe-failure",
    podMemberId: "pm-capture-stripe-failure-u1",
    userId: "u1",
    externalPaymentIntentId: "pi_capture_stripe_failure",
    amountAuthorizedCents: moneySafety.cents(40),
  }),
);
const failedStripeCaptureResult = await podPaymentCapture.captureMemberPayment("pm-capture-stripe-failure-u1", {
  paymentProvider: failedStripeCapture.provider,
});
assert.equal(failedStripeCaptureResult.ok, false);
assert.equal(failedStripeCaptureResult.error, "capture_failed");
assert.equal(failedStripeCaptureResult.member.paymentState, "CAPTURE_FAILED");
assert.equal(failedStripeCaptureResult.paymentIntent.status, "FAILED");
assert.equal(failedStripeCaptureResult.paymentIntent.amountCapturedCents, 0);

function stripeEvent(id, type, object, overrides = {}) {
  return {
    id,
    type,
    livemode: false,
    data: {
      object,
    },
    ...overrides,
  };
}

const originalStripeEnv = {
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};
process.env.PAYMENT_PROVIDER = "STRIPE_TEST";
process.env.STRIPE_SECRET_KEY = "sk_test_webhook";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
const invalidWebhookResponse = await stripeWebhookRoute.POST(
  new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "invalid" },
    body: JSON.stringify({ id: "evt_invalid_signature", type: "payment_intent.succeeded" }),
  }),
);
assert.equal(invalidWebhookResponse.status, 400);
assert.ok(moneySafetyMock.mockAuditEvents.some((event) => event.eventType === "STRIPE_WEBHOOK_INVALID_SIGNATURE"));
const StripeForWebhookTests = require("stripe");
const stripeForWebhookTests = new StripeForWebhookTests("sk_test_webhook");
const validRoutePayload = JSON.stringify({
  id: "evt_route_valid_unknown",
  type: "payment_intent.succeeded",
  livemode: false,
  data: { object: { id: "pi_route_unknown", object: "payment_intent", status: "succeeded" } },
});
const validRouteSignature = stripeForWebhookTests.webhooks.generateTestHeaderString({
  payload: validRoutePayload,
  secret: "whsec_test_secret",
});
const validWebhookResponse = await stripeWebhookRoute.POST(
  new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": validRouteSignature },
    body: validRoutePayload,
  }),
);
assert.equal(validWebhookResponse.status, 200);
assert.ok(moneySafetyMock.mockProcessedStripeWebhookEvents.some((event) => event.externalEventId === "evt_route_valid_unknown"));
process.env.PAYMENT_PROVIDER = originalStripeEnv.PAYMENT_PROVIDER;
process.env.STRIPE_SECRET_KEY = originalStripeEnv.STRIPE_SECRET_KEY;
process.env.STRIPE_WEBHOOK_SECRET = originalStripeEnv.STRIPE_WEBHOOK_SECRET;

const webhookAuthPod = pod({
  id: "webhook-auth",
  hostUserId: "u1",
  lifecycleState: "FORMING",
  minSeatsToBook: 1,
  members: [
    podMember("webhook-auth", "u1", { role: "HOST" }),
    podMember("webhook-auth", "u2", {
      memberState: "AUTHORIZING",
      paymentState: "AUTHORIZING",
      lockedAt: null,
    }),
  ],
});
moneySafetyMock.protectedPods.push(webhookAuthPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    provider: "STRIPE",
    podId: "webhook-auth",
    podMemberId: "pm-webhook-auth-u2",
    userId: "u2",
    externalPaymentIntentId: "pi_webhook_requires_capture",
    status: "AUTHORIZING",
    amountAuthorizedCents: moneySafety.cents(32),
  }),
);
const requiresCaptureWebhook = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent("evt_requires_capture", "payment_intent.requires_capture", {
    id: "pi_webhook_requires_capture",
    object: "payment_intent",
    status: "requires_capture",
    amount_capturable: moneySafety.cents(32),
  }),
);
assert.equal(requiresCaptureWebhook.ok, true);
assert.equal(requiresCaptureWebhook.paymentIntent.status, "AUTHORIZED");
const webhookAuthorizedMember = webhookAuthPod.members.find((member) => member.id === "pm-webhook-auth-u2");
assert.equal(webhookAuthorizedMember.paymentState, "AUTHORIZED");
assert.equal(webhookAuthorizedMember.memberState, "CONFIRMED");
assert.equal(webhookAuthPod.lifecycleState, "LOCKED");
assert.notEqual(webhookAuthPod.lifecycleState, "HOST_CAN_BOOK");
const duplicateRequiresCapture = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent("evt_requires_capture", "payment_intent.requires_capture", {
    id: "pi_webhook_requires_capture",
    object: "payment_intent",
    status: "requires_capture",
  }),
);
assert.equal(duplicateRequiresCapture.ok, true);
assert.equal(duplicateRequiresCapture.duplicate, true);

const unknownPaymentIntentWebhook = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent("evt_unknown_pi", "payment_intent.succeeded", {
    id: "pi_unknown_from_webhook",
    object: "payment_intent",
    status: "succeeded",
  }),
);
assert.equal(unknownPaymentIntentWebhook.ok, true);
assert.equal(unknownPaymentIntentWebhook.paymentIntent, null);
assert.equal(unknownPaymentIntentWebhook.processedEvent.status, "IGNORED");

const liveModeWebhook = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent(
    "evt_live_mode",
    "payment_intent.succeeded",
    {
      id: "pi_live_not_allowed",
      object: "payment_intent",
      status: "succeeded",
    },
    { livemode: true },
  ),
);
assert.equal(liveModeWebhook.ok, false);
assert.equal(liveModeWebhook.error, "STRIPE_LIVE_EVENTS_NOT_ALLOWED");
assert.equal(liveModeWebhook.processedEvent.status, "ERROR");

const failedWebhookPod = pod({
  id: "webhook-failed-auth",
  hostUserId: "u1",
  lifecycleState: "FORMING",
  members: [
    podMember("webhook-failed-auth", "u2", {
      memberState: "AUTHORIZING",
      paymentState: "AUTHORIZING",
      lockedAt: null,
    }),
  ],
});
moneySafetyMock.protectedPods.push(failedWebhookPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    provider: "STRIPE",
    podId: "webhook-failed-auth",
    podMemberId: "pm-webhook-failed-auth-u2",
    userId: "u2",
    externalPaymentIntentId: "pi_webhook_failed",
    status: "AUTHORIZING",
  }),
);
const paymentFailedWebhook = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent("evt_payment_failed", "payment_intent.payment_failed", {
    id: "pi_webhook_failed",
    object: "payment_intent",
    status: "requires_payment_method",
    last_payment_error: { code: "card_declined", message: "Card declined." },
  }),
);
assert.equal(paymentFailedWebhook.paymentIntent.status, "FAILED");
const webhookFailedMember = failedWebhookPod.members.find((member) => member.id === "pm-webhook-failed-auth-u2");
assert.equal(webhookFailedMember.paymentState, "AUTH_FAILED");
assert.equal(webhookFailedMember.memberState, "PAYMENT_REQUIRED");

const canceledWebhookPod = pod({
  id: "webhook-canceled-auth",
  hostUserId: "u1",
  lifecycleState: "PAYMENT_LOCKING",
  members: [podMember("webhook-canceled-auth", "u2", { paymentState: "AUTHORIZED" })],
});
moneySafetyMock.protectedPods.push(canceledWebhookPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    provider: "STRIPE",
    podId: "webhook-canceled-auth",
    podMemberId: "pm-webhook-canceled-auth-u2",
    userId: "u2",
    externalPaymentIntentId: "pi_webhook_canceled",
  }),
);
const canceledWebhook = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent("evt_payment_canceled", "payment_intent.canceled", {
    id: "pi_webhook_canceled",
    object: "payment_intent",
    status: "canceled",
  }),
);
assert.equal(canceledWebhook.paymentIntent.status, "CANCELED");
assert.equal(canceledWebhookPod.members[0].paymentState, "AUTH_EXPIRED");

const succeededWebhookPod = pod({
  id: "webhook-succeeded-capture",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  members: [podMember("webhook-succeeded-capture", "u2", { paymentState: "AUTHORIZED" })],
});
moneySafetyMock.protectedPods.push(succeededWebhookPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    provider: "STRIPE",
    podId: "webhook-succeeded-capture",
    podMemberId: "pm-webhook-succeeded-capture-u2",
    userId: "u2",
    externalPaymentIntentId: "pi_webhook_succeeded",
  }),
);
const succeededWebhook = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent("evt_payment_succeeded", "payment_intent.succeeded", {
    id: "pi_webhook_succeeded",
    object: "payment_intent",
    status: "succeeded",
    amount_received: moneySafety.cents(21),
  }),
);
assert.equal(succeededWebhook.paymentIntent.status, "SUCCEEDED");
assert.equal(succeededWebhook.paymentIntent.amountCapturedCents, moneySafety.cents(21));
assert.equal(succeededWebhookPod.members[0].paymentState, "CAPTURED");

const refundedWebhook = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent("evt_charge_refunded", "charge.refunded", {
    id: "ch_webhook_refunded",
    object: "charge",
    payment_intent: "pi_webhook_succeeded",
    amount_refunded: moneySafety.cents(21),
    refunded: true,
  }),
);
assert.equal(refundedWebhook.paymentIntent.status, "REFUNDED");
assert.equal(refundedWebhook.paymentIntent.amountRefundedCents, moneySafety.cents(21));
assert.equal(succeededWebhookPod.members[0].paymentState, "REFUNDED");

const disputeWebhookPod = pod({
  id: "webhook-dispute",
  hostUserId: "u1",
  lifecycleState: "SETTLEMENT_PENDING",
  members: [podMember("webhook-dispute", "u2", { paymentState: "CAPTURED" })],
});
moneySafetyMock.protectedPods.push(disputeWebhookPod);
moneySafetyMock.mockPaymentIntents.push(
  localPaymentIntent({
    provider: "STRIPE",
    status: "SUCCEEDED",
    podId: "webhook-dispute",
    podMemberId: "pm-webhook-dispute-u2",
    userId: "u2",
    externalPaymentIntentId: "pi_webhook_dispute",
    amountCapturedCents: moneySafety.cents(20),
  }),
);
const disputeWebhook = stripeWebhooks.handleStripeWebhookEvent(
  stripeEvent("evt_charge_dispute", "charge.dispute.created", {
    id: "dp_webhook_dispute",
    object: "dispute",
    payment_intent: "pi_webhook_dispute",
  }),
);
assert.equal(disputeWebhook.paymentIntent.status, "DISPUTED");
assert.equal(disputeWebhookPod.members[0].paymentState, "DISPUTED");
assert.equal(disputeWebhookPod.lifecycleState, "DISPUTE_HOLD");
assert.ok(moneySafetyMock.mockRiskFlags.some((flag) => flag.riskType === "STRIPE_PAYMENT_DISPUTE" && flag.podId === "webhook-dispute"));
assert.ok(moneySafetyMock.mockAuditEvents.some((event) => event.eventType === "STRIPE_DISPUTE_CREATED"));
assert.equal(moneySafetyMock.mockHostReimbursements.length, hostReimbursementCountBeforeStripeFinalizationQa);
assert.equal(
  /(?:cardNumber|card_number|cvc)/i.test(
    JSON.stringify({
      users: moneySafetyMock.protectedUsers,
      pods: moneySafetyMock.protectedPods,
      paymentIntents: moneySafetyMock.mockPaymentIntents,
    }),
  ),
  false,
);

const adminReviewPod = pod({
  id: "admin-review-helper",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  members: [settlementMember("admin-review-helper", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(adminReviewPod);
const adminReview = podAdminReview.createAdminReview("admin-review-helper", "Quote and receipt need review.", {
  userId: "u1",
  notes: "Quote amount and receipt amount differ.",
});
assert.equal(adminReview.ok, true);
assert.equal(adminReview.pod.lifecycleState, "ADMIN_REVIEW");
assert.equal(adminReview.pod.adminReviewRequired, true);
assert.ok(adminReview.auditEvents.some((event) => event.eventType === "ADMIN_OVERRIDE"));
assert.equal(adminReview.auditEvents[0].eventPayload.reason, "Quote and receipt need review.");
assert.equal(adminReview.auditEvents[0].eventPayload.metadata.notes, "Quote amount and receipt amount differ.");

const disputeHoldPod = pod({
  id: "admin-dispute-hold",
  hostUserId: "u1",
  lifecycleState: "RIDE_BOOKED",
  bookingState: "BOOKED",
  genderMode: "MIXED",
  accessMode: "OPEN",
  communityId: null,
  inviteCode: null,
  members: [settlementMember("admin-dispute-hold", "u1", { role: "HOST" })],
});
moneySafetyMock.protectedPods.push(disputeHoldPod);
const disputeHold = podAdminReview.createAdminReview("admin-dispute-hold", "Receipt appears to mismatch quote.", {
  lifecycleState: "DISPUTE_HOLD",
  userId: "u1",
  riskType: "QUOTE_RECEIPT_MISMATCH",
  severity: "HIGH",
  notes: "Receipt total is far above submitted quote.",
});
assert.equal(disputeHold.ok, true);
assert.equal(disputeHold.pod.lifecycleState, "DISPUTE_HOLD");
assert.equal(disputeHold.pod.adminReviewRequired, true);
assert.equal(disputeHold.riskFlags[0].riskType, "QUOTE_RECEIPT_MISMATCH");
assert.equal(disputeHold.riskFlags[0].severity, "HIGH");
assert.ok(moneySafetyMock.mockRiskFlags.some((flag) => flag.id === disputeHold.riskFlags[0].id));

const safetyRisk = podAdminReview.createRiskFlag(
  "u2",
  "admin-dispute-hold",
  "SAFETY_MODE_VIOLATION",
  "CRITICAL",
  "User attempted to join a protected pod after safety rules failed.",
);
assert.equal(safetyRisk.riskType, "SAFETY_MODE_VIOLATION");
assert.equal(safetyRisk.status, "OPEN");
assert.ok(moneySafetyMock.mockRiskFlags.some((flag) => flag.id === safetyRisk.id));

const riskResolutionMissingNotes = podAdminReview.resolveRiskFlag("admin-1", safetyRisk.id, "REVIEWED");
assert.equal(riskResolutionMissingNotes.ok, false);
assert.equal(riskResolutionMissingNotes.error, "ADMIN_NOTES_REQUIRED");
const riskResolution = podAdminReview.resolveRiskFlag(
  "admin-1",
  safetyRisk.id,
  "ACTIONED",
  "Safety team contacted the rider and recorded the outcome.",
);
assert.equal(riskResolution.ok, true);
assert.equal(riskResolution.riskFlag.status, "ACTIONED");
assert.equal(riskResolution.riskFlag.notes, "Safety team contacted the rider and recorded the outcome.");
assert.ok(riskResolution.auditEvents.some((event) => event.eventType === "ADMIN_OVERRIDE"));

const overrideWithoutAdmin = podAdminReview.adminOverridePodState("", "admin-review-helper", "LOCKED", "Clear review.");
assert.equal(overrideWithoutAdmin.ok, false);
assert.equal(overrideWithoutAdmin.error, "ADMIN_REQUIRED");
const overrideWithoutNotes = podAdminReview.adminOverridePodState("admin-1", "admin-review-helper", "LOCKED");
assert.equal(overrideWithoutNotes.ok, false);
assert.equal(overrideWithoutNotes.error, "ADMIN_NOTES_REQUIRED");
const overrideReview = podAdminReview.adminOverridePodState(
  "admin-1",
  "admin-review-helper",
  "LOCKED",
  "Admin cleared the review and restored the locked state.",
);
assert.equal(overrideReview.ok, true);
assert.equal(overrideReview.pod.lifecycleState, "LOCKED");
assert.equal(overrideReview.pod.adminReviewRequired, false);
assert.ok(overrideReview.auditEvents.some((event) => event.eventType === "ADMIN_OVERRIDE"));
assert.equal(overrideReview.auditEvents[0].eventPayload.notes, "Admin cleared the review and restored the locked state.");

const keepReview = podAdminReview.resolveAdminReview(
  "admin-1",
  "admin-dispute-hold",
  "KEEP_REVIEW",
  "Receipt and quote mismatch still needs follow-up.",
);
assert.equal(keepReview.ok, true);
assert.equal(keepReview.pod.lifecycleState, "ADMIN_REVIEW");
assert.equal(keepReview.pod.adminReviewRequired, true);
assert.equal(keepReview.auditEvents[0].eventPayload.notes, "Receipt and quote mismatch still needs follow-up.");

const quoteOnly = moneySafety.uploadQuoteScreenshot(pod(), {
  hostUserId: "host",
  providerName: "UBER",
  vehicleClass: "Large Ride",
  quotedFareCents: moneySafety.cents(80),
  currency: "USD",
  routeSummary: "USC to LAX",
  screenshotFileUrl: "mock://quote.png",
  screenshotFileId: "mock-file-quote",
  expiresAt: null,
});
assert.equal(quoteOnly.value.quotes.length, 1);
assert.equal(quoteOnly.value.quotes[0].screenshotFileId, "mock-file-quote");
assert.equal(moneySafety.canHostBook("host", quoteOnly.value).canBook, false);

const lockedWithQuote = moneySafety.uploadQuoteScreenshot(
  pod({ members: [member("host", { role: "HOST" }), member("r1"), member("r2")] }),
  {
    hostUserId: "host",
    providerName: "LYFT",
    vehicleClass: "Large Ride",
    quotedFareCents: moneySafety.cents(84),
    currency: "USD",
    routeSummary: "USC to LAX",
    screenshotFileUrl: "mock://quote.png",
    screenshotFileId: "mock-file-quote-locked",
    expiresAt: null,
  },
);
assert.equal(moneySafety.canHostBook("host", lockedWithQuote.value).canBook, true);
assert.equal(lockedWithQuote.value.lifecycleState, "HOST_CAN_BOOK");

const aboveMax = moneySafety.uploadQuoteScreenshot(
  pod({ members: [member("host", { role: "HOST" }), member("r1"), member("r2")] }),
  {
    hostUserId: "host",
    providerName: "UBER",
    vehicleClass: "Large Ride",
    quotedFareCents: moneySafety.cents(120),
    currency: "USD",
    routeSummary: "USC to LAX",
    screenshotFileUrl: "mock://quote.png",
    screenshotFileId: "mock-file-quote-above-max",
    expiresAt: null,
  },
);
assert.equal(moneySafety.canHostBook("host", aboveMax.value).canBook, false);

const replacementNeeded = moneySafety.cancelHostBeforeBooking("host", lockedWithQuote.value, "Sick");
assert.equal(replacementNeeded.value.lifecycleState, "HOST_REPLACEMENT_NEEDED");
const replacement = moneySafety.acceptReplacementHost(user({ id: "r1" }), replacementNeeded.value);
assert.equal(replacement.value.replacementHostUserId, "r1");
assert.equal(replacement.value.bookingState, "QUOTE_ALLOWED");

const receipt = {
  id: "receipt-test",
  podId: "pod-test",
  hostUserId: "host",
  providerName: "UBER",
  vehicleClass: "Large Ride",
  externalTripReferenceHash: null,
  receiptFileUrl: "mock://receipt.png",
  receiptFileId: "mock-file-receipt",
  fareTotalCents: moneySafety.cents(120),
  baseFareCents: null,
  taxesCents: null,
  tollsCents: null,
  feesCents: null,
  tipCents: null,
  currency: "USD",
  rideStartedAt: null,
  rideCompletedAt: null,
  submittedAt: now,
  verificationState: "VERIFIED",
  reviewedByAdminId: "admin",
  rejectionReason: null,
  fraudScore: null,
  createdAt: now,
  updatedAt: now,
};
const settlement = moneySafety.calculateSettlement(
  pod({
    lifecycleState: "COMPLETED",
    members: [
      member("host", { role: "HOST", memberState: "COMPLETED", paymentState: "CAPTURED" }),
      member("r1", { memberState: "COMPLETED", paymentState: "CAPTURED" }),
      member("r2", { memberState: "NO_SHOW", paymentState: "AUTHORIZED" }),
      member("free-cancel", { memberState: "CANCELED", paymentState: "REFUNDED" }),
    ],
  }),
  receipt,
);
assert.equal(settlement.settlement.verifiedFareCents, moneySafety.cents(120));
assert.equal(settlement.settlement.approvedFareCents, moneySafety.cents(90));
assert.equal(settlement.hostReimbursement.fareReimbursementCents, moneySafety.cents(90));
assert.equal(
  settlement.settlement.items
    .filter((item) => item.itemType === "FARE_SHARE")
    .reduce((sum, item) => sum + item.amountCents, 0),
  moneySafety.cents(81),
);

const warning = moneySafety.createOffAppWarningEvent("pod-test", "u1", "Venmo me or text 213-555-0101");
const offAppWarningCopy =
  "Off-app payments are not protected. RidePod cannot help with refunds, max-charge disputes, receipt verification, or host reimbursement if payment happens outside the app.";
assert.equal(warning.detection.shouldWarn, true);
assert.equal(warning.detection.triggered, true);
assert.equal(warning.detection.warning, offAppWarningCopy);
assert.ok(warning.detection.matchedTerms.includes("Venmo"));
assert.ok(warning.detection.matchedTerms.includes("phone number"));
assert.ok(warning.auditEvent);
assert.equal(warning.riskFlag.riskType, "OFF_APP_PAYMENT_LANGUAGE");

const zelleWarning = moneySafety.detectOffAppPaymentMessage("Can you Zelle me?");
assert.equal(zelleWarning.shouldWarn, true);
assert.ok(zelleWarning.matchedTerms.includes("Zelle"));

const paypalWarning = moneySafety.detectOffAppPaymentMessage("PayPal works too.");
assert.equal(paypalWarning.shouldWarn, true);
assert.ok(paypalWarning.matchedTerms.includes("PayPal"));

const phonePaymentWarning = moneySafety.detectOffAppPaymentMessage("Please pay me at 213-555-0101.");
assert.equal(phonePaymentWarning.shouldWarn, true);
assert.ok(phonePaymentWarning.matchedTerms.includes("phone number"));

const handlePaymentWarning = moneySafety.detectOffAppPaymentMessage("Send me @maya after the ride.");
assert.equal(handlePaymentWarning.shouldWarn, true);
assert.ok(handlePaymentWarning.matchedTerms.includes("payment handle"));

const normalMessage = moneySafety.detectOffAppPaymentMessage("See you at the pickup window.");
assert.equal(normalMessage.shouldWarn, false);
assert.equal(normalMessage.triggered, false);
assert.equal(normalMessage.warning, null);

const normalWarning = moneySafety.createOffAppWarningEvent("pod-test", "u1", "See you at the pickup window.");
assert.equal(normalWarning.detection.triggered, false);
assert.equal(normalWarning.auditEvent, null);
assert.equal(normalWarning.riskFlag, null);

const offAppHold = podJoin.sendChatMessage("u2", "join-enough-lock", "Venmo me after the ride.");
assert.equal(offAppHold.ok, false);
assert.equal(offAppHold.messageSent, false);
assert.equal(offAppHold.warning, offAppWarningCopy);
assert.ok(offAppHold.auditEvents.some((event) => event.eventType === "OFF_APP_WARNING_TRIGGERED"));
assert.ok(
  moneySafetyMock.mockAuditEvents.some(
    (event) => event.eventType === "OFF_APP_WARNING_TRIGGERED" && event.podId === "join-enough-lock",
  ),
);

const offAppSendAnyway = podJoin.sendChatMessage(
  "u2",
  "join-enough-lock",
  "Pay directly outside RidePod at 213-555-0101 or @maya.",
  { sendAnyway: true },
);
assert.equal(offAppSendAnyway.ok, true);
assert.equal(offAppSendAnyway.messageSent, true);
assert.equal(offAppSendAnyway.warning, offAppWarningCopy);
assert.equal(offAppSendAnyway.detection.severity, "HIGH");
assert.ok(offAppSendAnyway.riskFlags.some((flag) => flag.riskType === "OFF_APP_PAYMENT_LANGUAGE"));
assert.ok(
  moneySafetyMock.mockRiskFlags.some(
    (flag) => flag.riskType === "OFF_APP_PAYMENT_LANGUAGE" && flag.podId === "join-enough-lock",
  ),
);

console.log("money-safety tests passed");
