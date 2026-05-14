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
const moneySafetyMock = loadTsModule("src/lib/money-safety-mock.ts");

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
assert.deepEqual(moneySafety.GENDER_MODES, ["MIXED", "WOMEN_ONLY"]);
assert.equal(moneySafety.getGenderModeLabel("MIXED"), "Mixed pod");
assert.equal(moneySafety.getGenderModeLabel("WOMEN_ONLY"), "Women-only");
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
    maxChargeCents: moneySafety.cents(32),
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
assert.equal(suspendedEligibility.blockingReason, "Your account is suspended for protected pods.");

const restrictedEligibility = moneySafety.checkPodEligibility(
  user({ riskStatus: "RESTRICTED" }),
  pod({ genderMode: "MIXED", accessMode: "OPEN" }),
);
assert.equal(restrictedEligibility.eligible, false);
assert.equal(restrictedEligibility.requiredAction, "CONTACT_SUPPORT");
assert.equal(restrictedEligibility.blockingReason, "Your account is restricted for protected pods.");

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

const ineligibleRequest = podJoin.requestJoinPod("u2", "women-only-demo");
assert.equal(ineligibleRequest.ok, false);
assert.equal(ineligibleRequest.eligibility.eligible, false);
assert.equal(
  moneySafetyMock.protectedPods
    .find((candidate) => candidate.id === "women-only-demo")
    .members.some((candidate) => candidate.userId === "u2"),
  false,
);
assert.equal(podJoin.authorizeSeat("u2", "women-only-demo").ok, false);

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
assert.equal(joinRequest.ok, true);
assert.equal(joinRequest.member.memberState, "PAYMENT_REQUIRED");
assert.equal(joinRequest.member.paymentState, "PAYMENT_METHOD_REQUIRED");
assert.equal(joinRequest.member.maxChargeCents, Math.ceil(singleLockPod.approvedMaxTotalFareCents / singleLockPod.maxSeats) + singleLockPod.ridepodFeeCents);
assert.equal(joinRequest.member.platformFeeCents, singleLockPod.ridepodFeeCents);
assert.equal(podJoin.isMemberPaymentConfirmed(joinRequest.member), false);
assert.equal(podJoin.canAccessExactPickup("u2", "join-single-lock"), false);
assert.equal(podJoin.canAccessPodChat("u2", "join-single-lock"), false);
assert.ok(joinRequest.auditEvents.some((event) => event.eventType === "JOIN_REQUESTED"));
assert.ok(joinRequest.auditEvents.some((event) => event.eventType === "ELIGIBILITY_PASSED"));

const authorization = podJoin.authorizeSeat("u2", "join-single-lock");
assert.equal(authorization.ok, true);
assert.equal(authorization.member.memberState, "CONFIRMED");
assert.equal(authorization.member.paymentState, "AUTHORIZED");
assert.equal(authorization.member.maxChargeCents, Math.ceil(singleLockPod.approvedMaxTotalFareCents / singleLockPod.maxSeats) + singleLockPod.ridepodFeeCents);
assert.equal(authorization.member.platformFeeCents, singleLockPod.ridepodFeeCents);
assert.ok(authorization.member.lockedAt);
assert.ok(authorization.mockPaymentIntentId.startsWith("mock_pi_join-single-lock_u2_"));
assert.equal(authorization.member.mockPaymentIntentId, authorization.mockPaymentIntentId);
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
assert.equal(podJoin.authorizeSeat("u2", "join-enough-lock").pod.lifecycleState, "PAYMENT_LOCKING");
assert.equal(podJoin.requestJoinPod("u6", "join-enough-lock").ok, true);
const enoughAuthorization = podJoin.authorizeSeat("u6", "join-enough-lock");
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
assert.equal(podJoin.authorizeSeat("u2", "quote-before-confirm").pod.lifecycleState, "PAYMENT_LOCKING");
assert.equal(podJoin.requestJoinPod("u6", "quote-before-confirm").ok, true);
const earlyQuoteReady = podJoin.authorizeSeat("u6", "quote-before-confirm");
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
assert.equal(podJoin.authorizeSeat("u2", "protected-booking-ready").pod.lifecycleState, "PAYMENT_LOCKING");
assert.equal(podJoin.requestJoinPod("u6", "protected-booking-ready").ok, true);
assert.equal(podJoin.authorizeSeat("u6", "protected-booking-ready").pod.lifecycleState, "LOCKED");

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
assert.equal(podJoin.authorizeSeat("u2", "quote-above-max-blocks").ok, true);
assert.equal(podJoin.requestJoinPod("u6", "quote-above-max-blocks").ok, true);
assert.equal(podJoin.authorizeSeat("u6", "quote-above-max-blocks").pod.lifecycleState, "LOCKED");

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
  "Host canceled. Your pod is still active while RidePod looks for a replacement host. Your payment authorization will not be captured unless a replacement host books the ride.",
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
  moneySafety.cents(90),
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
