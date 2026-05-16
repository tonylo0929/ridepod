export type MoneyProtectionCalculationInput = {
  estimatedTotalFareCents: number;
  approvedMaxTotalFareCents: number;
  targetSeats: number;
  minSeatsToBook: number;
  /**
   * Legacy/demo-only fixed fee. Platform fees are calculated from platformFeeRateBps.
   */
  ridepodFeeCents?: number;
  platformFeeRateBps?: number;
  hostIsRiding?: boolean;
};

export type MoneyProtectionCalculation = {
  expectedRideShareCents: number;
  expectedPlatformFeeCents: number;
  expectedTotalPerRiderCents: number;
  protectedMaxRideShareCents: number;
  protectedMaxPlatformFeeCents: number;
  protectedMaxChargePerRiderCents: number;
  platformFeeRateBps: number;
  estimatedParticipants: number;
  minimumParticipantsForMax: number;
  guestSeats: number;
  hostIsRiding: boolean;
  /**
   * Backward-compatible alias for expectedTotalPerRiderCents.
   */
  expectedTotalChargeCents: number;
  /**
   * Backward-compatible alias for protectedMaxRideShareCents.
   */
  maxFareShareCents: number;
  /**
   * Backward-compatible alias for protectedMaxChargePerRiderCents.
   */
  participantMaxChargeCents: number;
};

export const PLATFORM_FEE_RATE_BPS = 1000;

function safeSeatCount(value: number) {
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
}

function safeCents(value: number) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

function safeBps(value: number) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : PLATFORM_FEE_RATE_BPS));
}

export function calculatePlatformFeeCents(
  fareShareCents: number,
  platformFeeRateBps: number = PLATFORM_FEE_RATE_BPS,
) {
  return Math.ceil((safeCents(fareShareCents) * safeBps(platformFeeRateBps)) / 10000);
}

export function calculateMoneyProtection({
  estimatedTotalFareCents,
  approvedMaxTotalFareCents,
  targetSeats,
  minSeatsToBook,
  platformFeeRateBps = PLATFORM_FEE_RATE_BPS,
  hostIsRiding = true,
}: MoneyProtectionCalculationInput): MoneyProtectionCalculation {
  const safeTargetSeats = safeSeatCount(targetSeats);
  const safeMinimumLockedRiders = safeSeatCount(minSeatsToBook);
  const safePlatformFeeRateBps = safeBps(platformFeeRateBps);
  const hostCountsAsParticipant = hostIsRiding !== false;
  const guestSeats = hostCountsAsParticipant
    ? Math.max(1, safeTargetSeats - 1)
    : safeTargetSeats;
  const estimatedParticipants = guestSeats + (hostCountsAsParticipant ? 1 : 0);
  const minimumParticipantsForMax =
    safeMinimumLockedRiders + (hostCountsAsParticipant ? 1 : 0);

  const expectedRideShareCents = Math.ceil(safeCents(estimatedTotalFareCents) / estimatedParticipants);
  const protectedMaxRideShareCents = Math.ceil(safeCents(approvedMaxTotalFareCents) / minimumParticipantsForMax);
  const expectedPlatformFeeCents = calculatePlatformFeeCents(expectedRideShareCents, safePlatformFeeRateBps);
  const protectedMaxPlatformFeeCents = calculatePlatformFeeCents(protectedMaxRideShareCents, safePlatformFeeRateBps);
  const expectedTotalPerRiderCents = expectedRideShareCents + expectedPlatformFeeCents;
  const protectedMaxChargePerRiderCents = protectedMaxRideShareCents + protectedMaxPlatformFeeCents;

  return {
    expectedRideShareCents,
    expectedPlatformFeeCents,
    expectedTotalPerRiderCents,
    protectedMaxRideShareCents,
    protectedMaxPlatformFeeCents,
    protectedMaxChargePerRiderCents,
    platformFeeRateBps: safePlatformFeeRateBps,
    estimatedParticipants,
    minimumParticipantsForMax,
    guestSeats,
    hostIsRiding: hostCountsAsParticipant,
    expectedTotalChargeCents: expectedTotalPerRiderCents,
    maxFareShareCents: protectedMaxRideShareCents,
    participantMaxChargeCents: protectedMaxChargePerRiderCents,
  };
}
