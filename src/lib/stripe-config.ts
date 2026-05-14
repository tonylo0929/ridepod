import type { PaymentProvider } from "./money-safety";

type EnvLike = Partial<Record<string, string | undefined>>;
export type ConfiguredPaymentProviderName = "MOCK" | "STRIPE_TEST";

export type StripeTestConfig = {
  secretKey: string;
  publishableKey: string | null;
  webhookSecret: string | null;
};

export type StripeTestConfigResult =
  | {
      ok: true;
      config: StripeTestConfig;
    }
  | {
      ok: false;
      error: string;
    };

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function hasLiveStripeKey(value: string | undefined) {
  return Boolean(value?.startsWith("sk_live_") || value?.startsWith("pk_live_") || value?.startsWith("rk_live_"));
}

export function getConfiguredPaymentProviderName(env: EnvLike = process.env): ConfiguredPaymentProviderName {
  return (env.PAYMENT_PROVIDER ?? env.RIDEPOD_PAYMENT_PROVIDER) === "STRIPE_TEST" ? "STRIPE_TEST" : "MOCK";
}

export function getConfiguredPaymentProvider(env: EnvLike = process.env): PaymentProvider {
  return getConfiguredPaymentProviderName(env) === "STRIPE_TEST" ? "STRIPE" : "MOCK";
}

export function getStripeTestConfig(env: EnvLike = process.env): StripeTestConfigResult {
  const secretKey = env.STRIPE_SECRET_KEY;
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (hasLiveStripeKey(secretKey) || hasLiveStripeKey(publishableKey)) {
    return { ok: false, error: "STRIPE_LIVE_KEYS_NOT_ALLOWED" };
  }

  if (isBlank(secretKey)) {
    return { ok: false, error: "STRIPE_SECRET_KEY_REQUIRED" };
  }

  if (!secretKey?.startsWith("sk_test_")) {
    return { ok: false, error: "STRIPE_TEST_SECRET_KEY_REQUIRED" };
  }

  if (!isBlank(publishableKey) && !publishableKey?.startsWith("pk_test_")) {
    return { ok: false, error: "STRIPE_TEST_PUBLISHABLE_KEY_REQUIRED" };
  }

  return {
    ok: true,
    config: {
      secretKey,
      publishableKey: publishableKey ?? null,
      webhookSecret: webhookSecret ?? null,
    },
  };
}

export function assertStripeTestModeConfig(env: EnvLike = process.env): StripeTestConfig {
  const result = getStripeTestConfig(env);
  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.config;
}

export function getStripeWebhookConfig(env: EnvLike = process.env): StripeTestConfigResult {
  const result = getStripeTestConfig(env);
  if (!result.ok) return result;

  if (isBlank(result.config.webhookSecret)) {
    return { ok: false, error: "STRIPE_WEBHOOK_SECRET_REQUIRED" };
  }

  if (!result.config.webhookSecret?.startsWith("whsec_")) {
    return { ok: false, error: "STRIPE_WEBHOOK_SECRET_INVALID" };
  }

  return result;
}
