export const ESTIMATE_SOURCES = [
  "RIDEPOD_HK_TAXI_BASELINE",
  "SYSTEM_TAXI_HK",
  "HOST_INPUT",
  "HOST_QUOTE_SCREENSHOT",
  "PROVIDER_API_FUTURE",
  "UNKNOWN",
] as const;

export type EstimateSource = (typeof ESTIMATE_SOURCES)[number];

export const ESTIMATE_CONFIDENCES = ["LOW", "MEDIUM", "HIGH"] as const;
export type EstimateConfidence = (typeof ESTIMATE_CONFIDENCES)[number];

export const HK_TAXI_ZONES = ["URBAN", "NEW_TERRITORIES", "LANTAU"] as const;
export type HkTaxiZone = (typeof HK_TAXI_ZONES)[number];

export const ROUTE_RISK_LEVELS = [
  "NORMAL",
  "AIRPORT_OR_TUNNEL",
  "UNKNOWN_OR_PROVIDER_DYNAMIC",
] as const;
export type RouteRiskLevel = (typeof ROUTE_RISK_LEVELS)[number];

export type HkTaxiFareRule = {
  zone: HkTaxiZone;
  label: string;
  flagFallCents: number;
  flagFallDistanceMeters: number;
  firstTierIncrementCents: number;
  firstTierThresholdCents: number;
  secondTierIncrementCents: number;
  incrementDistanceMeters: number;
  baggageFeeCents: number;
  phoneBookingFeeCents: number;
};

export type HkTaxiFareEstimateInput = {
  zone: HkTaxiZone;
  distanceMeters?: number | null;
  baggageCount?: number;
  tollEstimateCents?: number;
  waitingMinutes?: number;
  phoneBooking?: boolean;
  trafficBufferPercent?: number;
};

export type HkTaxiFareEstimate = {
  estimateSource: Extract<EstimateSource, "SYSTEM_TAXI_HK">;
  estimateConfidence: EstimateConfidence;
  zone: HkTaxiZone;
  ruleLabel: string;
  distanceMeters: number | null;
  meteredFareCents: number;
  surchargeCents: number;
  trafficBufferCents: number;
  totalFareCents: number;
};

export type HkTaxiBaselineInput = {
  taxiType: HkTaxiZone;
  distanceKm?: number | null;
  baggageCount?: number;
  tollTunnelEstimateCents?: number;
  waitingTrafficBufferMinutes?: number;
};

export type HkTaxiBaselineEstimate = {
  baselineFareCents: number;
  estimateSource: Extract<EstimateSource, "RIDEPOD_HK_TAXI_BASELINE">;
  estimateConfidence: EstimateConfidence;
};

export const HK_TAXI_FARE_RULES: Record<HkTaxiZone, HkTaxiFareRule> = {
  URBAN: {
    zone: "URBAN",
    label: "Urban taxi",
    flagFallCents: 2900,
    flagFallDistanceMeters: 2000,
    firstTierIncrementCents: 210,
    firstTierThresholdCents: 10250,
    secondTierIncrementCents: 140,
    incrementDistanceMeters: 200,
    baggageFeeCents: 600,
    phoneBookingFeeCents: 500,
  },
  NEW_TERRITORIES: {
    zone: "NEW_TERRITORIES",
    label: "New Territories taxi",
    flagFallCents: 2550,
    flagFallDistanceMeters: 2000,
    firstTierIncrementCents: 190,
    firstTierThresholdCents: 8250,
    secondTierIncrementCents: 140,
    incrementDistanceMeters: 200,
    baggageFeeCents: 600,
    phoneBookingFeeCents: 500,
  },
  LANTAU: {
    zone: "LANTAU",
    label: "Lantau taxi",
    flagFallCents: 2400,
    flagFallDistanceMeters: 2000,
    firstTierIncrementCents: 190,
    firstTierThresholdCents: 19500,
    secondTierIncrementCents: 160,
    incrementDistanceMeters: 200,
    baggageFeeCents: 600,
    phoneBookingFeeCents: 500,
  },
};

export const APPROVED_MAX_BUFFERS: Record<RouteRiskLevel, number> = {
  NORMAL: 1.15,
  AIRPORT_OR_TUNNEL: 1.25,
  UNKNOWN_OR_PROVIDER_DYNAMIC: 1.3,
};

function safeCents(value: number | null | undefined) {
  return Math.max(0, Math.round(Number.isFinite(value) ? Number(value) : 0));
}

function safeCount(value: number | null | undefined) {
  return Math.max(0, Math.floor(Number.isFinite(value) ? Number(value) : 0));
}

function safeDistance(value: number | null | undefined) {
  if (!Number.isFinite(value) || Number(value) <= 0) return null;
  return Math.round(Number(value));
}

function safeTaxiType(value: HkTaxiZone) {
  return HK_TAXI_ZONES.includes(value) ? value : "URBAN";
}

function calculateMeteredFareCents(rule: HkTaxiFareRule, distanceMeters: number | null, waitingMinutes: number) {
  if (!distanceMeters) return 0;

  const distanceUnits = Math.ceil(
    Math.max(0, distanceMeters - rule.flagFallDistanceMeters) / rule.incrementDistanceMeters,
  );
  const waitingUnits = Math.ceil(Math.max(0, waitingMinutes));
  const totalUnits = distanceUnits + waitingUnits;
  let fareCents = rule.flagFallCents;

  for (let unit = 0; unit < totalUnits; unit += 1) {
    fareCents +=
      fareCents < rule.firstTierThresholdCents
        ? rule.firstTierIncrementCents
        : rule.secondTierIncrementCents;
  }

  return fareCents;
}

export function calculateHkTaxiFareEstimate(input: HkTaxiFareEstimateInput): HkTaxiFareEstimate {
  const zone = safeTaxiType(input.zone);
  const rule = HK_TAXI_FARE_RULES[zone];
  const distanceMeters = safeDistance(input.distanceMeters);
  const waitingMinutes = safeCount(input.waitingMinutes);
  const baggageCount = safeCount(input.baggageCount);
  const tollEstimateCents = safeCents(input.tollEstimateCents);
  const meteredFareCents = calculateMeteredFareCents(rule, distanceMeters, waitingMinutes);
  const surchargeCents =
    baggageCount * rule.baggageFeeCents +
    tollEstimateCents +
    (input.phoneBooking ? rule.phoneBookingFeeCents : 0);
  const subtotalCents = meteredFareCents + surchargeCents;
  const trafficBufferPercent = Math.max(0, Number.isFinite(input.trafficBufferPercent) ? Number(input.trafficBufferPercent) : 0);
  const trafficBufferCents = Math.ceil((subtotalCents * trafficBufferPercent) / 100);
  const totalFareCents = subtotalCents + trafficBufferCents;

  return {
    estimateSource: "SYSTEM_TAXI_HK",
    estimateConfidence: distanceMeters ? (trafficBufferPercent > 0 || waitingMinutes > 0 ? "MEDIUM" : "HIGH") : "LOW",
    zone,
    ruleLabel: rule.label,
    distanceMeters,
    meteredFareCents,
    surchargeCents,
    trafficBufferCents,
    totalFareCents,
  };
}

export function calculateHkTaxiBaseline(input: HkTaxiBaselineInput): HkTaxiBaselineEstimate {
  const taxiType = safeTaxiType(input.taxiType);
  const rule = HK_TAXI_FARE_RULES[taxiType];
  const distanceMeters = safeDistance(
    Number.isFinite(input.distanceKm) ? Number(input.distanceKm) * 1000 : null,
  );
  const waitingTrafficBufferMinutes = safeCount(input.waitingTrafficBufferMinutes);
  const baggageCount = safeCount(input.baggageCount);
  const tollTunnelEstimateCents = safeCents(input.tollTunnelEstimateCents);
  const meteredFareCents = calculateMeteredFareCents(
    rule,
    distanceMeters,
    waitingTrafficBufferMinutes,
  );
  const baselineFareCents =
    meteredFareCents +
    baggageCount * rule.baggageFeeCents +
    tollTunnelEstimateCents;

  return {
    baselineFareCents,
    estimateSource: "RIDEPOD_HK_TAXI_BASELINE",
    estimateConfidence: distanceMeters
      ? waitingTrafficBufferMinutes > 0 || tollTunnelEstimateCents > 0
        ? "MEDIUM"
        : "HIGH"
      : "LOW",
  };
}

export function suggestApprovedMaxFare(
  systemEstimatedFareCents: number,
  routeRiskLevel: RouteRiskLevel = "NORMAL",
) {
  const buffer = APPROVED_MAX_BUFFERS[routeRiskLevel] ?? APPROVED_MAX_BUFFERS.NORMAL;
  const bufferedCents = safeCents(systemEstimatedFareCents) * buffer;

  return Math.ceil(bufferedCents / 500) * 500;
}

export function getHostEstimateWarning({
  systemEstimatedFareCents,
  hostEstimatedFareCents,
}: {
  systemEstimatedFareCents: number;
  hostEstimatedFareCents: number;
}) {
  const systemEstimate = safeCents(systemEstimatedFareCents);
  const hostEstimate = safeCents(hostEstimatedFareCents);
  if (systemEstimate <= 0 || hostEstimate <= 0) return null;

  if (hostEstimate >= systemEstimate * 1.25) {
    return "This is much higher than RidePod's taxi estimate. Riders may need a higher max approval.";
  }

  if (hostEstimate <= systemEstimate * 0.85) {
    return "This may be too low for the route. If the final fare is higher, host reimbursement may be capped by the approved max.";
  }

  return null;
}
