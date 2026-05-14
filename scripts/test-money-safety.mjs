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
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("STRIPE_CONNECT_ACCOUNT_CREATED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("STRIPE_CONNECT_ONBOARDING_LINK_CREATED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("HOST_REIMBURSEMENT_SCHEDULED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("PAYMENT_REFUNDED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("PAYMENT_AUTHORIZATION_RELEASED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDEPOD_DISPUTE_OPENED"));
assert.ok(moneySafety.AUDIT_EVENT_TYPES.includes("RIDEPOD_DISPUTE_RESOLVED"));
const moneySafetyUiSource = readFileSync("src/components/money-safety-ui.tsx", "utf8");
assert.ok(
  moneySafetyUiSource.includes("Host reimbursement is based on verified final receipt and approved max fare."),
);
assert.equal(
  moneySafetyUiSource.includes("Host reimbursement is based on the verified final receipt and approved max fare."),
  false,
);
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
  platformFeeCents: String(stripeAuthSuccessPod.ridepodFeeCents),
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
assert.equal((await podJoin.authorizeSeat("u2", "women-only-demo")).ok, false);

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

const authorization = await podJoin.authorizeSeat("u2", "join-single-lock");
assert.equal(authorization.ok, true);
assert.equal(authorization.member.memberState, "CONFIRMED");
assert.equal(authorization.member.paymentState, "AUTHORIZED");
assert.equal(authorization.member.maxChargeCents, Math.ceil(singleLockPod.approvedMaxTotalFareCents / singleLockPod.maxSeats) + singleLockPod.ridepodFeeCents);
assert.equal(authorization.member.platformFeeCents, singleLockPod.ridepodFeeCents);
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
