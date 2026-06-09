export type TaxiType = "urban" | "nt" | "lantau";

export type TaxiFareInput = {
  taxiType: TaxiType;
  distanceMeters: number;
  baggageCount?: number;
  hasAnimalOrBird?: boolean;
  hasPhoneBooking?: boolean;
  tollAmount?: number;
  uncertaintyPercent?: number;
};

export type TaxiFareEstimate = {
  available: boolean;
  taxiType: TaxiType;
  distanceMeters: number;
  baseMeterFare: number;
  surcharges: {
    baggage: number;
    animalOrBird: number;
    phoneBooking: number;
    toll: number;
  };
  lowEstimate: number;
  highEstimate: number;
  roundedLowEstimate: number;
  roundedHighEstimate: number;
  notes: string[];
};

export type SuggestedSeatContributionInput = {
  fareEstimate: TaxiFareEstimate;
  seatCount: number;
  ridePodServiceFeePerSeat?: number;
};

export type SuggestedSeatContribution = {
  available: boolean;
  seatCount: number;
  ridePodServiceFeePerSeat: number;
  baseLowPerSeat: number;
  baseHighPerSeat: number;
  suggestedLowPerSeat: number;
  suggestedHighPerSeat: number;
  roundedBaseLowPerSeat: number;
  roundedBaseHighPerSeat: number;
  roundedSuggestedLowPerSeat: number;
  roundedSuggestedHighPerSeat: number;
  notes: string[];
};

type TaxiFareRule = {
  label: string;
  flagfall: number;
  firstTierIncrement: number;
  firstTierThreshold: number;
  secondTierIncrement: number;
};

export const HK_TAXI_TYPE_LABELS: Record<TaxiType, string> = {
  urban: "Urban taxi",
  nt: "New Territories taxi",
  lantau: "Lantau taxi",
};

const HK_TAXI_FARE_RULES: Record<TaxiType, TaxiFareRule> = {
  urban: {
    label: HK_TAXI_TYPE_LABELS.urban,
    flagfall: 29,
    firstTierIncrement: 2.1,
    firstTierThreshold: 102.5,
    secondTierIncrement: 1.4,
  },
  nt: {
    label: HK_TAXI_TYPE_LABELS.nt,
    flagfall: 25.5,
    firstTierIncrement: 1.9,
    firstTierThreshold: 82.5,
    secondTierIncrement: 1.4,
  },
  lantau: {
    label: HK_TAXI_TYPE_LABELS.lantau,
    flagfall: 24,
    firstTierIncrement: 1.9,
    firstTierThreshold: 195,
    secondTierIncrement: 1.6,
  },
};

const FLAGFALL_DISTANCE_METERS = 2000;
const INCREMENT_DISTANCE_METERS = 200;
const DEFAULT_UNCERTAINTY_PERCENT = 0.15;
const DEFAULT_RIDEPOD_SERVICE_FEE_PER_SEAT = 8;

function safeMoney(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

function safeCount(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function referenceNotes(includeTollNote: boolean) {
  return [
    "Reference estimate only.",
    "Final taxi meter fare may vary due to traffic, waiting time, tolls and route.",
    ...(includeTollNote ? ["Tolls may not be included."] : []),
  ];
}

function calculateMeterFare(taxiType: TaxiType, distanceMeters: number) {
  const rule = HK_TAXI_FARE_RULES[taxiType];
  const remainingMeters = Math.max(0, distanceMeters - FLAGFALL_DISTANCE_METERS);
  const totalUnits = Math.ceil(remainingMeters / INCREMENT_DISTANCE_METERS);
  const firstTierUnits = Math.max(
    0,
    Math.ceil((rule.firstTierThreshold - rule.flagfall) / rule.firstTierIncrement),
  );
  const chargedFirstTierUnits = Math.min(totalUnits, firstTierUnits);
  const chargedSecondTierUnits = Math.max(0, totalUnits - chargedFirstTierUnits);

  return (
    rule.flagfall +
    chargedFirstTierUnits * rule.firstTierIncrement +
    chargedSecondTierUnits * rule.secondTierIncrement
  );
}

export function roundToNearestFive(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / 5) * 5;
}

export function calculateHkTaxiFareEstimate(input: TaxiFareInput): TaxiFareEstimate {
  const distanceMeters = Number.isFinite(input.distanceMeters) ? Math.round(input.distanceMeters) : 0;
  const taxiType = input.taxiType;

  if (distanceMeters <= 0) {
    return {
      available: false,
      taxiType,
      distanceMeters: 0,
      baseMeterFare: 0,
      surcharges: {
        baggage: 0,
        animalOrBird: 0,
        phoneBooking: 0,
        toll: 0,
      },
      lowEstimate: 0,
      highEstimate: 0,
      roundedLowEstimate: 0,
      roundedHighEstimate: 0,
      notes: ["Fare reference unavailable until pickup and dropoff are selected."],
    };
  }

  const baseMeterFare = calculateMeterFare(taxiType, distanceMeters);
  const toll = safeMoney(input.tollAmount);
  const surcharges = {
    baggage: safeCount(input.baggageCount) * 6,
    animalOrBird: input.hasAnimalOrBird ? 5 : 0,
    phoneBooking: input.hasPhoneBooking ? 5 : 0,
    toll,
  };
  const lowEstimate =
    baseMeterFare +
    surcharges.baggage +
    surcharges.animalOrBird +
    surcharges.phoneBooking +
    surcharges.toll;
  const uncertaintyPercent = Number.isFinite(input.uncertaintyPercent)
    ? Math.max(0, Number(input.uncertaintyPercent))
    : DEFAULT_UNCERTAINTY_PERCENT;
  const highEstimate = lowEstimate * (1 + uncertaintyPercent);

  return {
    available: true,
    taxiType,
    distanceMeters,
    baseMeterFare,
    surcharges,
    lowEstimate,
    highEstimate,
    roundedLowEstimate: roundToNearestFive(lowEstimate),
    roundedHighEstimate: roundToNearestFive(highEstimate),
    notes: referenceNotes(toll <= 0),
  };
}

export function calculateSuggestedSeatContribution({
  fareEstimate,
  seatCount,
  ridePodServiceFeePerSeat = DEFAULT_RIDEPOD_SERVICE_FEE_PER_SEAT,
}: SuggestedSeatContributionInput): SuggestedSeatContribution {
  const safeSeatCount = Math.max(1, Math.floor(Number.isFinite(seatCount) ? Number(seatCount) : 1));
  const serviceFee = safeMoney(ridePodServiceFeePerSeat);

  if (!fareEstimate.available) {
    return {
      available: false,
      seatCount: safeSeatCount,
      ridePodServiceFeePerSeat: serviceFee,
      baseLowPerSeat: 0,
      baseHighPerSeat: 0,
      suggestedLowPerSeat: 0,
      suggestedHighPerSeat: 0,
      roundedBaseLowPerSeat: 0,
      roundedBaseHighPerSeat: 0,
      roundedSuggestedLowPerSeat: 0,
      roundedSuggestedHighPerSeat: 0,
      notes: fareEstimate.notes,
    };
  }

  const baseLowPerSeat = fareEstimate.roundedLowEstimate / safeSeatCount;
  const baseHighPerSeat = fareEstimate.roundedHighEstimate / safeSeatCount;
  const suggestedLowPerSeat = baseLowPerSeat + serviceFee;
  const suggestedHighPerSeat = baseHighPerSeat + serviceFee;

  return {
    available: true,
    seatCount: safeSeatCount,
    ridePodServiceFeePerSeat: serviceFee,
    baseLowPerSeat,
    baseHighPerSeat,
    suggestedLowPerSeat,
    suggestedHighPerSeat,
    roundedBaseLowPerSeat: Math.round(baseLowPerSeat),
    roundedBaseHighPerSeat: Math.round(baseHighPerSeat),
    roundedSuggestedLowPerSeat: Math.round(suggestedLowPerSeat),
    roundedSuggestedHighPerSeat: Math.round(suggestedHighPerSeat),
    notes: fareEstimate.notes,
  };
}

export function formatHkdRange(low: number, high: number) {
  const roundedLow = Math.round(low);
  const roundedHigh = Math.round(high);

  if (roundedLow === roundedHigh) return `HK$${roundedLow}`;
  return `HK$${roundedLow}-${roundedHigh}`;
}
