type EnvLike = Partial<Record<string, string | undefined>>;

export type RidePodStripeTestEnv =
  | {
      ok: true;
      secretKey: string;
      publishableKey: string;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function hasLiveStripeKey(value: string | null | undefined) {
  return Boolean(value?.startsWith("sk_live_") || value?.startsWith("pk_live_") || value?.startsWith("rk_live_"));
}

export function validateRidePodStripeTestEnv(env: EnvLike = process.env): RidePodStripeTestEnv {
  if (env.RIDEPOD_ENABLE_STRIPE_TEST_MODE !== "true") {
    return {
      ok: false,
      error: "STRIPE_TEST_MODE_DISABLED",
      message: "Stripe test mode is not enabled.",
    };
  }

  const secretKey = env.STRIPE_SECRET_KEY;
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (hasLiveStripeKey(secretKey) || hasLiveStripeKey(publishableKey)) {
    return {
      ok: false,
      error: "STRIPE_LIVE_KEYS_NOT_ALLOWED",
      message: "Stripe test keys are not configured.",
    };
  }

  if (isBlank(secretKey) || isBlank(publishableKey)) {
    return {
      ok: false,
      error: "STRIPE_TEST_KEYS_REQUIRED",
      message: "Stripe test keys are not configured.",
    };
  }

  if (!secretKey?.startsWith("sk_test_") || !publishableKey?.startsWith("pk_test_")) {
    return {
      ok: false,
      error: "STRIPE_TEST_KEYS_REQUIRED",
      message: "Stripe test keys are not configured.",
    };
  }

  return {
    ok: true,
    secretKey,
    publishableKey,
  };
}

