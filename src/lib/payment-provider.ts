import type {
  MoneyCents,
  PaymentProvider,
  RidePodPaymentIntent,
  RidePodPaymentIntentStatus,
} from "./money-safety";
import { mockPaymentIntents } from "./money-safety-mock";
import { getConfiguredPaymentProvider, getStripeTestConfig } from "./stripe-config";

type EnvLike = Partial<Record<string, string | undefined>>;

export type SeatAuthorizationInput = {
  podId: string;
  podMemberId: string;
  userId: string;
  amountAuthorizedCents: MoneyCents;
  externalPaymentIntentId?: string | null;
  authorizationExpiresAt?: string | null;
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

export type PaymentProviderAdapter = {
  provider: PaymentProvider;
  createSeatAuthorization(input: SeatAuthorizationInput): SeatAuthorizationResult;
  authorizeSeat(input: SeatAuthorizationInput): SeatAuthorizationResult;
  captureAuthorizedPayment(): ProviderStubResult;
  cancelAuthorization(): ProviderStubResult;
  createSetupIntent(): ProviderStubResult;
};

function upsertLocalPaymentIntent(input: SeatAuthorizationInput, provider: PaymentProvider, status: RidePodPaymentIntentStatus) {
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
    existing.status = status;
    existing.authorizationExpiresAt = input.authorizationExpiresAt ?? existing.authorizationExpiresAt;
    existing.updatedAt = now;
    return existing;
  }

  const paymentIntent: RidePodPaymentIntent = {
    id: `ridepod-pi-${provider.toLowerCase()}-${input.podMemberId}`,
    provider,
    intentType: "SEAT_AUTHORIZATION",
    podId: input.podId,
    podMemberId: input.podMemberId,
    userId: input.userId,
    externalPaymentIntentId,
    amountAuthorizedCents: input.amountAuthorizedCents,
    amountCapturedCents: 0,
    status,
    authorizationExpiresAt: input.authorizationExpiresAt ?? null,
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
    return stub("MOCK", "MOCK_SETUP_INTENT_NOT_IMPLEMENTED");
  },
};

export function createStripeTestProvider(env: EnvLike = process.env): PaymentProviderAdapter {
  function stripeStub(error: string): SeatAuthorizationResult {
    const config = getStripeTestConfig(env);

    return {
      ok: false,
      provider: "STRIPE",
      paymentIntent: null,
      error: config.ok ? error : config.error,
    };
  }

  return {
    provider: "STRIPE",
    createSeatAuthorization() {
      return stripeStub("STRIPE_SEAT_AUTHORIZATION_NOT_IMPLEMENTED");
    },
    authorizeSeat() {
      return stripeStub("STRIPE_SEAT_AUTHORIZATION_NOT_IMPLEMENTED");
    },
    captureAuthorizedPayment() {
      const config = getStripeTestConfig(env);
      return stub("STRIPE", config.ok ? "STRIPE_CAPTURE_NOT_IMPLEMENTED" : config.error);
    },
    cancelAuthorization() {
      const config = getStripeTestConfig(env);
      return stub("STRIPE", config.ok ? "STRIPE_CANCEL_AUTHORIZATION_NOT_IMPLEMENTED" : config.error);
    },
    createSetupIntent() {
      const config = getStripeTestConfig(env);
      return stub("STRIPE", config.ok ? "STRIPE_SETUP_INTENT_NOT_IMPLEMENTED" : config.error);
    },
  };
}

export function getPaymentProvider(env: EnvLike = process.env): PaymentProviderAdapter {
  return getConfiguredPaymentProvider(env) === "STRIPE" ? createStripeTestProvider(env) : mockPaymentProvider;
}
