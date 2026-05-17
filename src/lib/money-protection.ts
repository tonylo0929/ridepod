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
  minimumPlatformFeeCents?: number;
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

export type RidePodGuestChargeCalculationInput = {
  selectedEstimatedFareCents: number;
  approvedMaxTotalFareCents: number;
  guestSeats: number;
  hostIsRiding: boolean;
  minimumLockedRiders: number;
  platformFeeRateBps: number;
  minimumPlatformFeeCents?: number;
};

export type RidePodGuestChargeCalculation = {
  expectedParticipants: number;
  participantsForProtectedMax: number;
  expectedFareShareCents: number;
  expectedPlatformFeeCents: number;
  expectedGuestTotalCents: number;
  protectedFareShareCents: number;
  protectedPlatformFeeCents: number;
  protectedGuestMaxCents: number;
  platformFeeRateBps: number;
  minimumPlatformFeeCents: number;
};

export const PLATFORM_FEE_RATE_BPS = 1000;
export const MINIMUM_PLATFORM_FEE_CENTS = 600;
export const PLATFORM_FEE_CURRENCY = "HKD";

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
  minimumPlatformFeeCents: number = MINIMUM_PLATFORM_FEE_CENTS,
) {
  const percentageFeeCents = Math.ceil((safeCents(fareShareCents) * safeBps(platformFeeRateBps)) / 10000);
  return Math.max(percentageFeeCents, safeCents(minimumPlatformFeeCents));
}

export function calculateRidePodGuestCharge({
  selectedEstimatedFareCents,
  approvedMaxTotalFareCents,
  guestSeats,
  hostIsRiding,
  minimumLockedRiders,
  platformFeeRateBps,
  minimumPlatformFeeCents = MINIMUM_PLATFORM_FEE_CENTS,
}: RidePodGuestChargeCalculationInput): RidePodGuestChargeCalculation {
  const safePlatformFeeRateBps = safeBps(platformFeeRateBps);
  const safeMinimumPlatformFeeCents = safeCents(minimumPlatformFeeCents);
  const hostCountsAsParticipant = hostIsRiding !== false;
  const safeGuestSeats = safeSeatCount(guestSeats);
  const safeMinimumLockedRiders = safeSeatCount(minimumLockedRiders);
  const expectedParticipants = safeGuestSeats + (hostCountsAsParticipant ? 1 : 0);
  const participantsForProtectedMax =
    safeMinimumLockedRiders + (hostCountsAsParticipant ? 1 : 0);

  const expectedFareShareCents = Math.ceil(safeCents(selectedEstimatedFareCents) / expectedParticipants);
  const expectedPlatformFeeCents = calculatePlatformFeeCents(
    expectedFareShareCents,
    safePlatformFeeRateBps,
    safeMinimumPlatformFeeCents,
  );
  const expectedGuestTotalCents = expectedFareShareCents + expectedPlatformFeeCents;
  const protectedFareShareCents = Math.ceil(safeCents(approvedMaxTotalFareCents) / participantsForProtectedMax);
  const protectedPlatformFeeCents = calculatePlatformFeeCents(
    protectedFareShareCents,
    safePlatformFeeRateBps,
    safeMinimumPlatformFeeCents,
  );
  const protectedGuestMaxCents = protectedFareShareCents + protectedPlatformFeeCents;

  return {
    expectedParticipants,
    participantsForProtectedMax,
    expectedFareShareCents,
    expectedPlatformFeeCents,
    expectedGuestTotalCents,
    protectedFareShareCents,
    protectedPlatformFeeCents,
    protectedGuestMaxCents,
    platformFeeRateBps: safePlatformFeeRateBps,
    minimumPlatformFeeCents: safeMinimumPlatformFeeCents,
  };
}

export function calculateMoneyProtection({
  estimatedTotalFareCents,
  approvedMaxTotalFareCents,
  targetSeats,
  minSeatsToBook,
  platformFeeRateBps = PLATFORM_FEE_RATE_BPS,
  minimumPlatformFeeCents = MINIMUM_PLATFORM_FEE_CENTS,
  hostIsRiding = true,
}: MoneyProtectionCalculationInput): MoneyProtectionCalculation {
  const safeTargetSeats = safeSeatCount(targetSeats);
  const safeMinimumLockedRiders = safeSeatCount(minSeatsToBook);
  const hostCountsAsParticipant = hostIsRiding !== false;
  const guestSeats = hostCountsAsParticipant
    ? Math.max(1, safeTargetSeats - 1)
    : safeTargetSeats;
  const guestCharge = calculateRidePodGuestCharge({
    selectedEstimatedFareCents: estimatedTotalFareCents,
    approvedMaxTotalFareCents,
    guestSeats,
    hostIsRiding: hostCountsAsParticipant,
    minimumLockedRiders: safeMinimumLockedRiders,
    platformFeeRateBps,
    minimumPlatformFeeCents,
  });

  return {
    expectedRideShareCents: guestCharge.expectedFareShareCents,
    expectedPlatformFeeCents: guestCharge.expectedPlatformFeeCents,
    expectedTotalPerRiderCents: guestCharge.expectedGuestTotalCents,
    protectedMaxRideShareCents: guestCharge.protectedFareShareCents,
    protectedMaxPlatformFeeCents: guestCharge.protectedPlatformFeeCents,
    protectedMaxChargePerRiderCents: guestCharge.protectedGuestMaxCents,
    platformFeeRateBps: guestCharge.platformFeeRateBps,
    estimatedParticipants: guestCharge.expectedParticipants,
    minimumParticipantsForMax: guestCharge.participantsForProtectedMax,
    guestSeats,
    hostIsRiding: hostCountsAsParticipant,
    expectedTotalChargeCents: guestCharge.expectedGuestTotalCents,
    maxFareShareCents: guestCharge.protectedFareShareCents,
    participantMaxChargeCents: guestCharge.protectedGuestMaxCents,
  };
}
