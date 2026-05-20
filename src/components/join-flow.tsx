"use client";

import { currentUserId, type RidePod } from "@/lib/mock-data";
import { getProtectedPod } from "@/lib/money-safety-mock";
import { calculateHkTaxiBaseline, suggestApprovedMaxFare } from "@/lib/fare-estimates";
import { calculateJoinPodMaxChargeCents } from "@/lib/join-money";
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
  const defaultBaseline = calculateHkTaxiBaseline({
    taxiType: "URBAN",
    distanceKm: 6,
    baggageCount: 2,
    tollTunnelEstimateCents: 0,
    waitingTrafficBufferMinutes: 0,
  });
  const hostIsRiding = protectedPod?.hostIsRiding ?? true;
  const targetSeats = protectedPod?.targetSeats ?? pod.seatsTotal;
  const guestSeats = hostIsRiding ? Math.max(1, targetSeats - 1) : Math.max(1, targetSeats);
  const estimatedFareCents = isSelectedDemoRoute
    ? defaultBaseline.baselineFareCents
    : protectedPod?.estimatedTotalFareCents ?? Math.round(pod.estimatedFare * 100);
  const approvedMaxFareCents = isSelectedDemoRoute
    ? suggestApprovedMaxFare({
        baselineFareCents: defaultBaseline.baselineFareCents,
        routeRisk: "NORMAL",
      })
    : protectedPod?.approvedMaxTotalFareCents ?? Math.round(pod.maxFare * 100);
  const maxChargeCents = calculateJoinPodMaxChargeCents({
    selectedEstimatedFareCents: estimatedFareCents,
    approvedMaxTotalFareCents: approvedMaxFareCents,
    guestSeats,
    hostIsRiding,
    minimumLockedRiders: protectedPod?.minSeatsToBook ?? pod.seatsTotal,
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
      maxChargeCents={maxChargeCents}
      isEligible={eligibility.eligible}
      blockingReason={eligibility.blockingReason}
      requiredAction={eligibility.requiredAction}
      backHref={`/pods/${pod.id}`}
    />
  );
}
