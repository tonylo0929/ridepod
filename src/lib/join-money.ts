import {
  PLATFORM_FEE_RATE_BPS,
  calculateRidePodGuestCharge,
} from "./money-protection";

export type JoinPodMaxChargeInput = {
  selectedEstimatedFareCents: number;
  approvedMaxTotalFareCents: number;
  guestSeats: number;
  hostIsRiding: boolean;
  minimumLockedRiders: number;
  platformFeeRateBps?: number;
};

export function calculateJoinPodMaxChargeCents({
  selectedEstimatedFareCents,
  approvedMaxTotalFareCents,
  guestSeats,
  hostIsRiding,
  minimumLockedRiders,
  platformFeeRateBps = PLATFORM_FEE_RATE_BPS,
}: JoinPodMaxChargeInput) {
  return calculateRidePodGuestCharge({
    selectedEstimatedFareCents,
    approvedMaxTotalFareCents,
    guestSeats,
    hostIsRiding,
    minimumLockedRiders,
    platformFeeRateBps,
  }).protectedGuestMaxCents;
}
