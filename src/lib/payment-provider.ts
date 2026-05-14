import type {
  CaptureMethod,
  MoneyCents,
  PaymentProvider,
  RidePodPaymentIntent,
  RidePodPaymentIntentStatus,
} from "./money-safety";
import { mockPaymentIntents } from "./money-safety-mock";
import { getConfiguredPaymentProvider, getStripeTestConfig } from "./stripe-config";
import type { StripeSeatAuthorizationClient } from "./stripe-seat-authorization";

type EnvLike = Partial<Record<string, string | undefined>>;

export type SeatAuthorizationInput = {
  podId: string;
  podMemberId: string;
  userId: string;
  amountAuthorizedCents: MoneyCents;
  maxChargeCents: MoneyCents;
  platformFeeCents: MoneyCents;
  approvedMaxTotalFareCents: MoneyCents;
  currency: string;
  customerId?: string | null;
  paymentMethodId?: string | null;
  externalPaymentIntentId?: string | null;
  authorizationExpiresAt?: string | null;
  idempotencyKey?: string | null;
};

export type SeatAuthorizationResult = {
  ok: boolean;
  provider: PaymentProvider;
  paymentIntent: RidePodPaymentIntent | null;
  error?: string;
};

export type ProviderStubResult = {
  ok: false;
  provider: PaymentProvider;
  error: string;
};

export type SetupIntentInput = {
  userId: string;
};

export type SetupIntentResult =
  | {
      ok: true;
      provider: PaymentProvider;
      setupIntentId: string;
      clientSecret: string;
      customerId: string;
    }
  | {
      ok: false;
      provider: PaymentProvider;
      error: string;
    };

export type PaymentProviderAdapter = {
  provider: PaymentProvider;
  createSeatAuthorization(input: SeatAuthorizationInput): Promise<SeatAuthorizationResult> | SeatAuthorizationResult;
  authorizeSeat(input: SeatAuthorizationInput): Promise<SeatAuthorizationResult> | SeatAuthorizationResult;
  captureAuthorizedPayment(): ProviderStubResult;
  cancelAuthorization(): ProviderStubResult;
  createSetupIntent(input: SetupIntentInput): Promise<SetupIntentResult> | SetupIntentResult;
};

export function upsertLocalPaymentIntent(
  input: SeatAuthorizationInput,
  provider: PaymentProvider,
  status: RidePodPaymentIntentStatus,
  options: {
    captureMethod?: CaptureMethod;
    amountCapturedCents?: MoneyCents;
    amountRefundedCents?: MoneyCents;
    failureCode?: string | null;
    failureMessage?: string | null;
  } = {},
) {
  const now = new Date().toISOString();
  const externalPaymentIntentId =
    input.externalPaymentIntentId ?? `${provider.toLowerCase()}_pi_${input.podId}_${input.userId}_${Date.now().toString(36)}`;
  const existing = mockPaymentIntents.find(
    (intent) =>
      intent.provider === provider &&
      intent.intentType === "SEAT_AUTHORIZATION" &&
      intent.podMemberId === input.podMemberId,
  );

  if (existing) {
    existing.externalPaymentIntentId = externalPaymentIntentId;
    existing.amountAuthorizedCents = input.amountAuthorizedCents;
    existing.amountCapturedCents = options.amountCapturedCents ?? existing.amountCapturedCents;
    existing.amountRefundedCents = options.amountRefundedCents ?? existing.amountRefundedCents;
    existing.currency = input.currency.toUpperCase();
    existing.status = status;
    existing.authorizationExpiresAt = input.authorizationExpiresAt ?? existing.authorizationExpiresAt;
    existing.idempotencyKey = input.idempotencyKey ?? existing.idempotencyKey;
    existing.failureCode = options.failureCode ?? null;
    existing.failureMessage = options.failureMessage ?? null;
    existing.updatedAt = now;
    return existing;
  }

  const paymentIntent: RidePodPaymentIntent = {
    id: `ridepod-pi-${provider.toLowerCase()}-${input.podMemberId}`,
    provider,
    intentType: "SEAT_AUTHORIZATION",
    captureMethod: options.captureMethod ?? "MANUAL",
    podId: input.podId,
    podMemberId: input.podMemberId,
    userId: input.userId,
    externalPaymentIntentId,
    amountAuthorizedCents: input.amountAuthorizedCents,
    amountCapturedCents: options.amountCapturedCents ?? 0,
    amountRefundedCents: options.amountRefundedCents ?? 0,
    currency: input.currency.toUpperCase(),
    status,
    authorizationExpiresAt: input.authorizationExpiresAt ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    failureCode: options.failureCode ?? null,
    failureMessage: options.failureMessage ?? null,
    createdAt: now,
    updatedAt: now,
  };

  mockPaymentIntents.push(paymentIntent);
  return paymentIntent;
}

function stub(provider: PaymentProvider, error: string): ProviderStubResult {
  return { ok: false, provider, error };
}

export const mockPaymentProvider: PaymentProviderAdapter = {
  provider: "MOCK",
  createSeatAuthorization(input) {
    return {
      ok: true,
      provider: "MOCK",
      paymentIntent: upsertLocalPaymentIntent(input, "MOCK", "AUTHORIZED"),
    };
  },
  authorizeSeat(input) {
    return this.createSeatAuthorization(input);
  },
  captureAuthorizedPayment() {
    return stub("MOCK", "MOCK_CAPTURE_NOT_IMPLEMENTED");
  },
  cancelAuthorization() {
    return stub("MOCK", "MOCK_CANCEL_AUTHORIZATION_NOT_IMPLEMENTED");
  },
  createSetupIntent() {
    return { ok: false, provider: "MOCK", error: "PAYMENT_PROVIDER_MOCK" };
  },
};

export function createStripeTestProvider(
  env: EnvLike = process.env,
  stripe?: StripeSeatAuthorizationClient,
): PaymentProviderAdapter {
  return {
    provider: "STRIPE",
    async createSeatAuthorization(input) {
      const { createStripeSeatAuthorization } = await import("./stripe-seat-authorization");
      return createStripeSeatAuthorization(input, { env, stripe });
    },
    async authorizeSeat(input) {
      const { createStripeSeatAuthorization } = await import("./stripe-seat-authorization");
      return createStripeSeatAuthorization(input, { env, stripe });
    },
    captureAuthorizedPayment() {
      const config = getStripeTestConfig(env);
      return stub("STRIPE", config.ok ? "STRIPE_CAPTURE_NOT_IMPLEMENTED" : config.error);
    },
    cancelAuthorization() {
      const config = getStripeTestConfig(env);
      return stub("STRIPE", config.ok ? "STRIPE_CANCEL_AUTHORIZATION_NOT_IMPLEMENTED" : config.error);
    },
    async createSetupIntent(input) {
      const { createSetupIntent } = await import("./stripe-setup");
      return createSetupIntent(input.userId, { env });
    },
  };
}

export function getPaymentProvider(env: EnvLike = process.env): PaymentProviderAdapter {
  return getConfiguredPaymentProvider(env) === "STRIPE" ? createStripeTestProvider(env) : mockPaymentProvider;
}
