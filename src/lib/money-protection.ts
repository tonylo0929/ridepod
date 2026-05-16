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

export type RidePodGuestChargeCalculationInput = {
  selectedEstimatedFareCents: number;
  approvedMaxTotalFareCents: number;
  guestSeats: number;
  hostIsRiding: boolean;
  minimumLockedRiders: number;
  platformFeeRateBps: number;
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

export function calculateRidePodGuestCharge({
  selectedEstimatedFareCents,
  approvedMaxTotalFareCents,
  guestSeats,
  hostIsRiding,
  minimumLockedRiders,
  platformFeeRateBps,
}: RidePodGuestChargeCalculationInput): RidePodGuestChargeCalculation {
  const safePlatformFeeRateBps = safeBps(platformFeeRateBps);
  const hostCountsAsParticipant = hostIsRiding !== false;
  const safeGuestSeats = safeSeatCount(guestSeats);
  const safeMinimumLockedRiders = safeSeatCount(minimumLockedRiders);
  const expectedParticipants = safeGuestSeats + (hostCountsAsParticipant ? 1 : 0);
  const participantsForProtectedMax =
    safeMinimumLockedRiders + (hostCountsAsParticipant ? 1 : 0);

  const expectedFareShareCents = Math.ceil(safeCents(selectedEstimatedFareCents) / expectedParticipants);
  const expectedPlatformFeeCents = calculatePlatformFeeCents(expectedFareShareCents, safePlatformFeeRateBps);
  const expectedGuestTotalCents = expectedFareShareCents + expectedPlatformFeeCents;
  const protectedFareShareCents = Math.ceil(safeCents(approvedMaxTotalFareCents) / participantsForProtectedMax);
  const protectedPlatformFeeCents = calculatePlatformFeeCents(protectedFareShareCents, safePlatformFeeRateBps);
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
  };
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
