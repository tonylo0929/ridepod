import Stripe from "stripe";
import type { PaymentProvider } from "./money-safety";
import { protectedUsers } from "./money-safety-mock";
import { getConfiguredPaymentProviderName, getStripeTestConfig } from "./stripe-config";

type EnvLike = Partial<Record<string, string | undefined>>;

type StripeCustomerClient = {
  customers: {
    create(input: {
      email?: string;
      name?: string;
      phone?: string;
      metadata: Record<string, string>;
    }): Promise<{ id: string }>;
  };
  setupIntents: {
    create(input: {
      customer: string;
      usage: "off_session";
      payment_method_types: ["card"];
      metadata: Record<string, string>;
    }): Promise<{ id: string; client_secret: string | null }>;
  };
};

export type StripeSetupResult =
  | {
      ok: true;
      provider: Extract<PaymentProvider, "STRIPE">;
      setupIntentId: string;
      clientSecret: string;
      customerId: string;
    }
  | {
      ok: false;
      provider: Extract<PaymentProvider, "STRIPE">;
      error: string;
    };

export type StripeCustomerResult =
  | {
      ok: true;
      provider: Extract<PaymentProvider, "STRIPE">;
      customerId: string;
      reused: boolean;
    }
  | {
      ok: false;
      provider: Extract<PaymentProvider, "STRIPE">;
      error: string;
    };

type StripeSetupOptions = {
  env?: EnvLike;
  stripe?: StripeCustomerClient;
  forceStripe?: boolean;
};

let stripeClient: StripeCustomerClient | null = null;

function getStripeClient(secretKey: string): StripeCustomerClient {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function getUser(userId: string) {
  return protectedUsers.find((user) => user.id === userId) ?? null;
}

function shouldUseStripe(options: StripeSetupOptions) {
  return options.forceStripe || getConfiguredPaymentProviderName(options.env) === "STRIPE_TEST";
}

export async function createOrGetStripeCustomer(
  userId: string,
  options: StripeSetupOptions = {},
): Promise<StripeCustomerResult> {
  const user = getUser(userId);
  if (!user) return { ok: false, provider: "STRIPE", error: "USER_NOT_FOUND" };

  if (user.stripeCustomerId) {
    return { ok: true, provider: "STRIPE", customerId: user.stripeCustomerId, reused: true };
  }

  if (!shouldUseStripe(options)) {
    return { ok: false, provider: "STRIPE", error: "PAYMENT_PROVIDER_MOCK" };
  }

  const config = getStripeTestConfig(options.env);
  if (!config.ok) return { ok: false, provider: "STRIPE", error: config.error };

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    phone: user.phone,
    metadata: {
      userId,
      app: "RidePod",
      environment: "test",
    },
  });

  user.stripeCustomerId = customer.id;
  user.updatedAt = new Date().toISOString();

  return { ok: true, provider: "STRIPE", customerId: customer.id, reused: false };
}

export async function createSetupIntent(
  userId: string,
  options: StripeSetupOptions = {},
): Promise<StripeSetupResult> {
  if (!shouldUseStripe(options)) {
    return { ok: false, provider: "STRIPE", error: "PAYMENT_PROVIDER_MOCK" };
  }

  const customerResult = await createOrGetStripeCustomer(userId, options);
  if (!customerResult.ok) return customerResult;

  const config = getStripeTestConfig(options.env);
  if (!config.ok) return { ok: false, provider: "STRIPE", error: config.error };

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const setupIntent = await stripe.setupIntents.create({
    customer: customerResult.customerId,
    usage: "off_session",
    payment_method_types: ["card"],
    metadata: {
      userId,
      purpose: "ridepod_payment_method_setup",
    },
  });

  if (!setupIntent.client_secret) {
    return { ok: false, provider: "STRIPE", error: "STRIPE_SETUP_INTENT_CLIENT_SECRET_MISSING" };
  }

  return {
    ok: true,
    provider: "STRIPE",
    setupIntentId: setupIntent.id,
    clientSecret: setupIntent.client_secret,
    customerId: customerResult.customerId,
  };
}
