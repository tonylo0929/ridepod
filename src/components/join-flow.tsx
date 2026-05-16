"use client";

import { currentUserId, type RidePod } from "@/lib/mock-data";
import { getProtectedPod } from "@/lib/money-safety-mock";
import { calculateMoneyProtection } from "@/lib/money-protection";
import { checkPodEligibility } from "@/lib/pod-eligibility";
import { JoinPodMapFirstScreen } from "@/components/join-pod-map-first-screen";

export function JoinFlow({ pod }: { pod: RidePod }) {
  const protectedPod = getProtectedPod(pod.id);
  const eligibility = protectedPod
    ? checkPodEligibility(currentUserId, pod.id)
    : {
        eligible: true,
        reasons: [pod.genderMode === "women_only" ? "Women-only eligibility passed." : "Mixed pod."],
        blockingReason: null,
        requiredAction: null,
      };

  const isSelectedDemoRoute = pod.fromLabel.includes("USC") && pod.toLabel.includes("LAX");
  const moneyProtection = calculateMoneyProtection({
    estimatedTotalFareCents: protectedPod?.estimatedTotalFareCents ?? Math.round(pod.estimatedFare * 100),
    approvedMaxTotalFareCents: protectedPod?.approvedMaxTotalFareCents ?? Math.round(pod.maxFare * 100),
    targetSeats: protectedPod?.targetSeats ?? pod.seatsTotal,
    minSeatsToBook: protectedPod?.minSeatsToBook ?? pod.seatsTotal,
    ridepodFeeCents: protectedPod?.ridepodFeeCents ?? Math.round(pod.platformFee * 100),
    hostIsRiding: protectedPod?.hostIsRiding ?? true,
  });

  return (
    <JoinPodMapFirstScreen
      originLabel={isSelectedDemoRoute ? "USC" : pod.fromLabel}
      destinationLabel={isSelectedDemoRoute ? "LAX" : pod.toLabel}
      routeLabel={isSelectedDemoRoute ? "USC \u2192 LAX" : `${pod.fromLabel} \u2192 ${pod.toLabel}`}
      departureTime={isSelectedDemoRoute ? "Today, 4:30 PM" : `${pod.date}, ${pod.time}`}
      estimate="Est. 35–45 min"
      riderCount={isSelectedDemoRoute ? 3 : pod.seatsFilled}
      riderCapacity={isSelectedDemoRoute ? 4 : pod.seatsTotal}
      seatsLeft={isSelectedDemoRoute ? 4 : Math.max(0, pod.seatsTotal - pod.seatsFilled)}
      genderMode={pod.genderMode === "mixed" ? "MIXED" : "WOMEN_ONLY"}
      maxChargeCents={moneyProtection.protectedMaxChargePerRiderCents}
      isEligible={eligibility.eligible}
      blockingReason={eligibility.blockingReason ?? eligibility.requiredAction}
      backHref={`/pods/${pod.id}`}
    />
  );
}
