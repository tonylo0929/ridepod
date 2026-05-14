import Stripe from "stripe";
import { makeAuditEvent, type AuditEvent, type PaymentProvider } from "./money-safety";
import { mockAuditEvents, protectedUsers } from "./money-safety-mock";
import { getConfiguredPaymentProviderName, getStripeTestConfig } from "./stripe-config";

type EnvLike = Partial<Record<string, string | undefined>>;

type StripeConnectedAccountLike = {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  requirements?: {
    currently_due?: string[] | null;
    eventually_due?: string[] | null;
    past_due?: string[] | null;
  } | null;
};

type StripeAccountLinkLike = {
  url: string;
  expires_at?: number | null;
};

export type StripeConnectClient = {
  accounts: {
    create(input: {
      type: "express";
      country: string;
      email?: string;
      metadata: Record<string, string>;
      capabilities: {
        transfers: { requested: true };
      };
    }): Promise<StripeConnectedAccountLike>;
    retrieve(accountId: string): Promise<StripeConnectedAccountLike>;
  };
  accountLinks: {
    create(input: {
      account: string;
      refresh_url: string;
      return_url: string;
      type: "account_onboarding";
    }): Promise<StripeAccountLinkLike>;
  };
};

export type HostConnectAccountResult =
  | {
      ok: true;
      provider: Extract<PaymentProvider, "STRIPE">;
      accountId: string;
      reused: boolean;
      payoutsEnabled: boolean;
      chargesEnabled: boolean;
      onboardingComplete: boolean;
      requirementsDue: string[];
      auditEvents: AuditEvent[];
    }
  | {
      ok: false;
      provider: Extract<PaymentProvider, "STRIPE">;
      error: string;
      auditEvents: AuditEvent[];
    };

export type HostOnboardingLinkResult =
  | {
      ok: true;
      provider: Extract<PaymentProvider, "STRIPE">;
      accountId: string;
      url: string;
      expiresAt: string | null;
      payoutsEnabled: boolean;
      chargesEnabled: boolean;
      onboardingComplete: boolean;
      requirementsDue: string[];
      auditEvents: AuditEvent[];
    }
  | {
      ok: false;
      provider: Extract<PaymentProvider, "STRIPE">;
      error: string;
      auditEvents: AuditEvent[];
    };

type StripeConnectOptions = {
  env?: EnvLike;
  stripe?: StripeConnectClient;
  forceStripe?: boolean;
  returnUrl?: string | null;
  refreshUrl?: string | null;
};

let stripeClient: StripeConnectClient | null = null;

function getStripeClient(secretKey: string): StripeConnectClient {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey) as unknown as StripeConnectClient;
  }

  return stripeClient;
}

function recordAudit(events: AuditEvent[]) {
  mockAuditEvents.push(...events);
  return events;
}

function getUser(userId: string) {
  return protectedUsers.find((user) => user.id === userId) ?? null;
}

function shouldUseStripe(options: StripeConnectOptions) {
  return options.forceStripe || getConfiguredPaymentProviderName(options.env) === "STRIPE_TEST";
}

function failed(error: string): HostConnectAccountResult {
  return { ok: false, provider: "STRIPE", error, auditEvents: [] };
}

function failedLink(error: string): HostOnboardingLinkResult {
  return { ok: false, provider: "STRIPE", error, auditEvents: [] };
}

function accountStatus(account: StripeConnectedAccountLike) {
  const requirementsDue = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];
  const uniqueRequirementsDue = [...new Set(requirementsDue)];
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const chargesEnabled = Boolean(account.charges_enabled);

  return {
    payoutsEnabled,
    chargesEnabled,
    onboardingComplete: payoutsEnabled && uniqueRequirementsDue.length === 0,
    requirementsDue: uniqueRequirementsDue,
  };
}

function defaultBaseUrl(env: EnvLike = process.env) {
  return env.RIDEPOD_URL ?? env.NEXT_PUBLIC_RIDEPOD_URL ?? "http://localhost:3000";
}

function defaultReturnUrl(env: EnvLike = process.env) {
  return `${defaultBaseUrl(env).replace(/\/$/, "")}/host`;
}

function defaultRefreshUrl(env: EnvLike = process.env) {
  return `${defaultBaseUrl(env).replace(/\/$/, "")}/host`;
}

export async function createOrGetHostConnectedAccount(
  hostUserId: string,
  options: StripeConnectOptions = {},
): Promise<HostConnectAccountResult> {
  const user = getUser(hostUserId);
  if (!user) return failed("USER_NOT_FOUND");
  if (user.riskStatus === "SUSPENDED" || user.riskStatus === "RESTRICTED") {
    return failed("HOST_CONNECT_NOT_ALLOWED");
  }

  if (!shouldUseStripe(options)) {
    return failed("PAYMENT_PROVIDER_MOCK");
  }

  const config = getStripeTestConfig(options.env);
  if (!config.ok) return failed(config.error);

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const now = new Date().toISOString();

  if (user.stripeConnectAccountId) {
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    const status = accountStatus(account);
    user.payoutsEnabled = status.payoutsEnabled;
    user.updatedAt = now;
    return {
      ok: true,
      provider: "STRIPE",
      accountId: user.stripeConnectAccountId,
      reused: true,
      ...status,
      auditEvents: [],
    };
  }

  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: user.email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      userId: hostUserId,
      app: "RidePod",
      environment: "test",
      purpose: "host_reimbursement",
    },
  });
  const status = accountStatus(account);
  user.stripeConnectAccountId = account.id;
  user.payoutsEnabled = status.payoutsEnabled;
  user.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("STRIPE_CONNECT_ACCOUNT_CREATED", {
      userId: hostUserId,
      eventPayload: {
        accountId: account.id,
        payoutsEnabled: status.payoutsEnabled,
        chargesEnabled: status.chargesEnabled,
        onboardingComplete: status.onboardingComplete,
      },
    }),
  ]);

  return {
    ok: true,
    provider: "STRIPE",
    accountId: account.id,
    reused: false,
    ...status,
    auditEvents,
  };
}

export async function createHostOnboardingLink(
  hostUserId: string,
  options: StripeConnectOptions = {},
): Promise<HostOnboardingLinkResult> {
  const accountResult = await createOrGetHostConnectedAccount(hostUserId, options);
  if (!accountResult.ok) return failedLink(accountResult.error);

  const config = getStripeTestConfig(options.env);
  if (!config.ok) return failedLink(config.error);

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const link = await stripe.accountLinks.create({
    account: accountResult.accountId,
    refresh_url: options.refreshUrl ?? defaultRefreshUrl(options.env),
    return_url: options.returnUrl ?? defaultReturnUrl(options.env),
    type: "account_onboarding",
  });

  const expiresAt = link.expires_at ? new Date(link.expires_at * 1000).toISOString() : null;
  const auditEvents = recordAudit([
    makeAuditEvent("STRIPE_CONNECT_ONBOARDING_LINK_CREATED", {
      userId: hostUserId,
      eventPayload: {
        accountId: accountResult.accountId,
        expiresAt,
      },
    }),
  ]);

  return {
    ok: true,
    provider: "STRIPE",
    accountId: accountResult.accountId,
    url: link.url,
    expiresAt,
    payoutsEnabled: accountResult.payoutsEnabled,
    chargesEnabled: accountResult.chargesEnabled,
    onboardingComplete: accountResult.onboardingComplete,
    requirementsDue: accountResult.requirementsDue,
    auditEvents: [...accountResult.auditEvents, ...auditEvents],
  };
}

export async function refreshHostConnectStatus(
  hostUserId: string,
  options: StripeConnectOptions = {},
): Promise<HostConnectAccountResult> {
  const user = getUser(hostUserId);
  if (!user) return failed("USER_NOT_FOUND");
  if (!user.stripeConnectAccountId) return failed("STRIPE_CONNECT_ACCOUNT_REQUIRED");
  if (!shouldUseStripe(options)) return failed("PAYMENT_PROVIDER_MOCK");

  const config = getStripeTestConfig(options.env);
  if (!config.ok) return failed(config.error);

  const stripe = options.stripe ?? getStripeClient(config.config.secretKey);
  const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
  const status = accountStatus(account);
  user.payoutsEnabled = status.payoutsEnabled;
  user.updatedAt = new Date().toISOString();

  const auditEvents = recordAudit([
    makeAuditEvent("STRIPE_CONNECT_STATUS_REFRESHED", {
      userId: hostUserId,
      eventPayload: {
        accountId: user.stripeConnectAccountId,
        payoutsEnabled: status.payoutsEnabled,
        chargesEnabled: status.chargesEnabled,
        onboardingComplete: status.onboardingComplete,
        requirementsDue: status.requirementsDue,
      },
    }),
  ]);

  return {
    ok: true,
    provider: "STRIPE",
    accountId: user.stripeConnectAccountId,
    reused: true,
    ...status,
    auditEvents,
  };
}
