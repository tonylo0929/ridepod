export type RidePodPricingRuleType =
  | "disabled"
  | "fixed"
  | "percentage"
  | "percentage_with_minimum"
  | "percentage_with_minimum_and_cap";

export type RidePodPricingRule = {
  type: RidePodPricingRuleType;
  fixedAmountCents?: number;
  percentageBps?: number;
  minimumAmountCents?: number;
  maximumAmountCents?: number;
};

export type RidePodPricingConfig = {
  currency: "HKD";
  hostCreateFees: {
    taxi: RidePodPricingRule;
    rideAppSelfSettle: RidePodPricingRule;
  };
  joinFees: {
    rideAppSelfSettle: RidePodPricingRule;
    taxiPod: RidePodPricingRule;
  };
  taxiPartnerFees: {
    quoteCommission: RidePodPricingRule;
  };
  waivers: {
    launchWaiverEnabled: boolean;
    launchWaiverMaxClaims: number;
    launchWaiverClaimedCount: number;
    plusWaiversEnabled: boolean;
    plusMonthlyWaiverCount: number;
  };
};

export type TaxiRiderPlatformFeeInput = {
  taxiPartnerQuoteCents: number;
  acceptedRiderCount: number;
  config?: RidePodPricingConfig;
};

export type TaxiRiderPlatformFeeCalculation = {
  riderFareShareCents: number;
  ridePodFeeCents: number;
  riderTotalCents: number;
};

export const ridePodPricingCopy = {
  ridePodJoinFee: "Fee charged by RidePod when a rider joins an eligible pod.",
  taxiPartnerQuote: "Amount quoted by taxi partner for the shared taxi ride.",
  rideAppFare: "External ride app fare paid outside RidePod.",
  feeExclusions: "RidePod fee does not include taxi fare, ride app fare, tips, or external payments.",
  rideAppJoinFeeHelper: "Ride fare is paid outside RidePod.",
  taxiQuoteSeparate: "Taxi partner quote is separate.",
  hostCreatesFree: "Host creates free.",
  noLivePaymentCharged: "No live payment is charged.",
} as const;

export const ridePodPricingExamples = {
  taxiPartnerQuoteCents: 24_000,
  acceptedRiderCount: 4,
  note: "Taxi quote HK$240 / 4 riders = HK$60 fare share. RidePod fee is max(10%, HK$6), so rider total is HK$66.",
  rideAppSelfSettle: "RidePod join fee is HK$5. Ride fare is paid outside RidePod.",
} as const;

export const ridePodPricingConfig: RidePodPricingConfig = {
  currency: "HKD",
  hostCreateFees: {
    taxi: { type: "disabled" },
    rideAppSelfSettle: { type: "disabled" },
  },
  joinFees: {
    rideAppSelfSettle: {
      type: "fixed",
      fixedAmountCents: 500,
    },
    taxiPod: {
      type: "percentage_with_minimum",
      percentageBps: 1000,
      minimumAmountCents: 600,
    },
  },
  taxiPartnerFees: {
    quoteCommission: { type: "disabled" },
  },
  waivers: {
    launchWaiverEnabled: true,
    launchWaiverMaxClaims: 100,
    launchWaiverClaimedCount: 0,
    plusWaiversEnabled: true,
    plusMonthlyWaiverCount: 5,
  },
};

const pricingStorageKey = "ridepod:admin-pricing-config";
export const ridePodPricingChangeEvent = "ridepod:admin-pricing-config-change";

let cachedRawPricingConfig: string | null = null;
let cachedPricingConfig: RidePodPricingConfig = ridePodPricingConfig;

function safeCents(value: number | undefined) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value ?? 0 : 0));
}

function safeBps(value: number | undefined) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value ?? 0 : 0));
}

function safeCount(value: number) {
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
}

function normalizeRule(rule: Partial<RidePodPricingRule> | null | undefined): RidePodPricingRule {
  const type = rule?.type ?? "disabled";

  if (type === "disabled") return { type };

  if (type === "fixed") {
    return {
      type,
      fixedAmountCents: safeCents(rule?.fixedAmountCents),
    };
  }

  if (type === "percentage") {
    return {
      type,
      percentageBps: Math.min(10_000, safeBps(rule?.percentageBps)),
    };
  }

  if (type === "percentage_with_minimum") {
    return {
      type,
      percentageBps: Math.min(10_000, safeBps(rule?.percentageBps)),
      minimumAmountCents: safeCents(rule?.minimumAmountCents),
    };
  }

  return {
    type,
    percentageBps: Math.min(10_000, safeBps(rule?.percentageBps)),
    minimumAmountCents: safeCents(rule?.minimumAmountCents),
    maximumAmountCents: safeCents(rule?.maximumAmountCents),
  };
}

function normalizePricingConfig(value: Partial<RidePodPricingConfig> | null | undefined): RidePodPricingConfig {
  return {
    currency: "HKD",
    hostCreateFees: {
      taxi: normalizeRule(value?.hostCreateFees?.taxi ?? ridePodPricingConfig.hostCreateFees.taxi),
      rideAppSelfSettle: normalizeRule(
        value?.hostCreateFees?.rideAppSelfSettle ?? ridePodPricingConfig.hostCreateFees.rideAppSelfSettle,
      ),
    },
    joinFees: {
      rideAppSelfSettle: normalizeRule(
        value?.joinFees?.rideAppSelfSettle ?? ridePodPricingConfig.joinFees.rideAppSelfSettle,
      ),
      taxiPod: normalizeRule(value?.joinFees?.taxiPod ?? ridePodPricingConfig.joinFees.taxiPod),
    },
    taxiPartnerFees: {
      quoteCommission: normalizeRule(
        value?.taxiPartnerFees?.quoteCommission ?? ridePodPricingConfig.taxiPartnerFees.quoteCommission,
      ),
    },
    waivers: {
      launchWaiverEnabled: value?.waivers?.launchWaiverEnabled ?? ridePodPricingConfig.waivers.launchWaiverEnabled,
      launchWaiverMaxClaims: Math.max(
        0,
        Math.floor(value?.waivers?.launchWaiverMaxClaims ?? ridePodPricingConfig.waivers.launchWaiverMaxClaims),
      ),
      launchWaiverClaimedCount: Math.max(
        0,
        Math.floor(value?.waivers?.launchWaiverClaimedCount ?? ridePodPricingConfig.waivers.launchWaiverClaimedCount),
      ),
      plusWaiversEnabled: value?.waivers?.plusWaiversEnabled ?? ridePodPricingConfig.waivers.plusWaiversEnabled,
      plusMonthlyWaiverCount: Math.max(
        0,
        Math.floor(value?.waivers?.plusMonthlyWaiverCount ?? ridePodPricingConfig.waivers.plusMonthlyWaiverCount),
      ),
    },
  };
}

export function getRidePodPricingConfig(): RidePodPricingConfig {
  if (typeof window === "undefined") return ridePodPricingConfig;

  try {
    const rawState = window.localStorage.getItem(pricingStorageKey);
    if (!rawState) {
      cachedRawPricingConfig = null;
      cachedPricingConfig = ridePodPricingConfig;
      return cachedPricingConfig;
    }

    if (rawState === cachedRawPricingConfig) return cachedPricingConfig;

    cachedRawPricingConfig = rawState;
    cachedPricingConfig = normalizePricingConfig(JSON.parse(rawState) as Partial<RidePodPricingConfig>);
    return cachedPricingConfig;
  } catch {
    cachedRawPricingConfig = null;
    cachedPricingConfig = ridePodPricingConfig;
    return cachedPricingConfig;
  }
}

export function setRidePodPricingConfig(config: RidePodPricingConfig) {
  if (typeof window === "undefined") return;

  const normalizedConfig = normalizePricingConfig(config);
  cachedRawPricingConfig = JSON.stringify(normalizedConfig);
  cachedPricingConfig = normalizedConfig;
  window.localStorage.setItem(pricingStorageKey, cachedRawPricingConfig);
  window.dispatchEvent(new Event(ridePodPricingChangeEvent));
}

export function resetRidePodPricingConfig() {
  if (typeof window === "undefined") return;

  cachedRawPricingConfig = null;
  cachedPricingConfig = ridePodPricingConfig;
  window.localStorage.removeItem(pricingStorageKey);
  window.dispatchEvent(new Event(ridePodPricingChangeEvent));
}

export function calculateRidePodFee(rule: RidePodPricingRule, baseAmountCents: number) {
  const safeBaseAmountCents = safeCents(baseAmountCents);

  if (rule.type === "disabled") return 0;

  if (rule.type === "fixed") {
    return safeCents(rule.fixedAmountCents);
  }

  const percentageFeeCents = Math.ceil((safeBaseAmountCents * safeBps(rule.percentageBps)) / 10_000);

  if (rule.type === "percentage") {
    return percentageFeeCents;
  }

  const feeWithMinimum = Math.max(percentageFeeCents, safeCents(rule.minimumAmountCents));

  if (rule.type === "percentage_with_minimum") {
    return feeWithMinimum;
  }

  return Math.min(feeWithMinimum, safeCents(rule.maximumAmountCents));
}

export function calculateRideAppJoinFee(config: RidePodPricingConfig = ridePodPricingConfig) {
  return calculateRidePodFee(config.joinFees.rideAppSelfSettle, 0);
}

export function calculateTaxiRiderPlatformFee({
  taxiPartnerQuoteCents,
  acceptedRiderCount,
  config = ridePodPricingConfig,
}: TaxiRiderPlatformFeeInput): TaxiRiderPlatformFeeCalculation {
  const riderFareShareCents = Math.ceil(safeCents(taxiPartnerQuoteCents) / safeCount(acceptedRiderCount));
  const ridePodFeeCents = calculateRidePodFee(config.joinFees.taxiPod, riderFareShareCents);

  return {
    riderFareShareCents,
    ridePodFeeCents,
    riderTotalCents: riderFareShareCents + ridePodFeeCents,
  };
}

export function formatHKD(cents: number) {
  const safeAmountCents = safeCents(cents);
  const dollars = safeAmountCents / 100;

  if (Number.isInteger(dollars)) {
    return `HK$${dollars.toLocaleString("en-HK", { maximumFractionDigits: 0 })}`;
  }

  return `HK$${dollars.toLocaleString("en-HK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
