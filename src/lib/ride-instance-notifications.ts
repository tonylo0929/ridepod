import type { RecurringRideInstancePreview, RidePod } from "@/lib/mock-data";

export type RideInstanceNotificationTone = "gold" | "green" | "orange" | "purple" | "blue" | "neutral";
export type RideInstanceNotificationGroup = "Today" | "This week" | "Earlier";
export type RideInstanceNotificationType =
  | "upload_quote_needed"
  | "quote_approved"
  | "upload_receipt_needed"
  | "meter_proof_needed"
  | "dispute_window_ending"
  | "settlement_ready"
  | "payout_ready"
  | "dispute_under_review"
  | "ride_booked";
export type RideInstanceNotificationViewerRole = "HOST" | "GUEST";

export type RideInstanceNotification = {
  id: string;
  stableKey: string;
  type: RideInstanceNotificationType;
  title: string;
  body: string;
  meta: string;
  routeLabel: string;
  ctaLabel?: string;
  ctaTarget?: string;
  tone: RideInstanceNotificationTone;
  createdAt: string;
  timeAgo: string;
  group: RideInstanceNotificationGroup;
  read: boolean;
};

function rideMeta(rideInstance: RecurringRideInstancePreview) {
  return `${rideInstance.displayDate.replace(/^\w+\s+/, "")} \u00b7 ${rideInstance.departureTime} \u00b7 ${
    rideInstance.legType === "return" ? "Return" : "Outbound"
  }`;
}

function routeLabel(rideInstance: RecurringRideInstancePreview) {
  return `${rideInstance.originLabel} \u2192 ${rideInstance.destinationLabel}`;
}

function hostTarget(rideInstance: RecurringRideInstancePreview) {
  return `/host?rideInstanceId=${encodeURIComponent(rideInstance.id)}`;
}

function notification(
  rideInstance: RecurringRideInstancePreview,
  input: Omit<RideInstanceNotification, "id" | "meta" | "routeLabel"> & { stableKey: string },
): RideInstanceNotification {
  return {
    ...input,
    id: input.stableKey,
    meta: rideMeta(rideInstance),
    routeLabel: routeLabel(rideInstance),
  };
}

export function getRideInstanceNotifications(
  rideInstance: RecurringRideInstancePreview,
  viewerRole: RideInstanceNotificationViewerRole,
): RideInstanceNotification[] {
  const target = hostTarget(rideInstance);
  const host = viewerRole === "HOST";
  const items: RideInstanceNotification[] = [];

  if (rideInstance.status === "quote_needed") {
    items.push(
      notification(rideInstance, {
        stableKey: `upload_quote_needed:${rideInstance.id}`,
        type: "upload_quote_needed",
        title: "Upload quote needed",
        body: "Guests are locked. Upload a fresh quote before booking this ride.",
        timeAgo: "10m",
        group: "Today",
        tone: "gold",
        ctaLabel: host ? "Upload quote" : "View ride",
        ctaTarget: target,
        createdAt: "2026-05-18T09:50:00.000Z",
        read: false,
      }),
    );
  }

  if (rideInstance.status === "ready_to_book") {
    items.push(
      notification(rideInstance, {
        stableKey: `quote_approved:${rideInstance.id}`,
        type: "quote_approved",
        title: "Quote approved",
        body: "The quote is within the fare cap. You may book the external ride.",
        timeAgo: "2h",
        group: "Today",
        tone: "green",
        ctaLabel: host ? "Mark booked" : "View ride",
        ctaTarget: target,
        createdAt: "2026-05-18T08:00:00.000Z",
        read: false,
      }),
    );
  }

  if (rideInstance.status === "ride_booked") {
    items.push(
      notification(rideInstance, {
        stableKey: `ride_booked:${rideInstance.id}`,
        type: "ride_booked",
        title: "Ride booked",
        body: "You marked this ride as booked. We'll remind you after the ride.",
        timeAgo: "5d",
        group: "Earlier",
        tone: "blue",
        ctaLabel: "View ride",
        ctaTarget: target,
        createdAt: "2026-05-13T10:00:00.000Z",
        read: true,
      }),
    );
  }

  if (rideInstance.status === "receipt_pending") {
    items.push(
      notification(rideInstance, {
        stableKey: `upload_receipt_needed:${rideInstance.id}`,
        type: "upload_receipt_needed",
        title: "Upload receipt",
        body: "Upload the final receipt so RidePod can prepare settlement.",
        timeAgo: "5h",
        group: "Today",
        tone: "orange",
        ctaLabel: host ? "Upload receipt" : "View ride",
        ctaTarget: target,
        createdAt: "2026-05-18T05:00:00.000Z",
        read: false,
      }),
    );
  }

  if (rideInstance.status === "meter_proof_needed") {
    items.push(
      notification(rideInstance, {
        stableKey: `meter_proof_needed:${rideInstance.id}`,
        type: "meter_proof_needed",
        title: "Upload meter proof",
        body: "Upload meter proof or taxi receipt so RidePod can prepare settlement.",
        timeAgo: "5h",
        group: "Today",
        tone: "orange",
        ctaLabel: host ? "Upload meter proof" : "View ride",
        ctaTarget: target,
        createdAt: "2026-05-18T05:00:00.000Z",
        read: false,
      }),
    );
  }

  if (rideInstance.status === "settlement_ready" || rideInstance.settlementState === "DISPUTE_WINDOW") {
    items.push(
      notification(rideInstance, {
        stableKey: `dispute_window_ending:${rideInstance.id}`,
        type: "dispute_window_ending",
        title: "Dispute window ending soon",
        body: "Less than 24h left to report an issue before settlement finalizes.",
        timeAgo: "22h",
        group: "Today",
        tone: "purple",
        ctaLabel: "Review settlement",
        ctaTarget: target,
        createdAt: "2026-05-17T12:00:00.000Z",
        read: false,
      }),
      notification(rideInstance, {
        stableKey: `settlement_ready:${rideInstance.id}`,
        type: "settlement_ready",
        title: "Settlement ready",
        body: "Proof is verified. Guests can report issues until the dispute window ends.",
        timeAgo: "1d",
        group: "This week",
        tone: "blue",
        ctaLabel: "View settlement",
        ctaTarget: target,
        createdAt: "2026-05-17T10:15:00.000Z",
        read: false,
      }),
    );
  }

  if (rideInstance.settlementState === "DISPUTE_REVIEW" || rideInstance.disputeRaised) {
    items.push(
      notification(rideInstance, {
        stableKey: `dispute_under_review:${rideInstance.id}`,
        type: "dispute_under_review",
        title: "Dispute under review",
        body: "RidePod is reviewing the issue. Settlement or payout may be held.",
        timeAgo: "3d",
        group: "This week",
        tone: "orange",
        ctaLabel: "View dispute",
        ctaTarget: target,
        createdAt: "2026-05-15T10:00:00.000Z",
        read: false,
      }),
    );
  }

  if (rideInstance.settlementState === "PAID" || rideInstance.payoutState === "PAID") {
    items.push(
      notification(rideInstance, {
        stableKey: `payout_ready:${rideInstance.id}`,
        type: "payout_ready",
        title: "Payout ready",
        body: "Settlement is final. Your payout can be processed.",
        timeAgo: "2d",
        group: "This week",
        tone: "green",
        ctaLabel: "View payout",
        ctaTarget: target,
        createdAt: "2026-05-16T10:00:00.000Z",
        read: false,
      }),
    );
  }

  return items;
}

export function getDemoRideInstanceNotifications(
  pods: RidePod[],
  viewerRole: RideInstanceNotificationViewerRole = "HOST",
) {
  const notifications = pods.flatMap((pod) =>
    (pod.upcomingRideInstances ?? []).flatMap((rideInstance) =>
      getRideInstanceNotifications(rideInstance, viewerRole),
    ),
  );
  const settlementRide = pods.flatMap((pod) => pod.upcomingRideInstances ?? []).find((ride) => ride.status === "settlement_ready");

  if (settlementRide) {
    notifications.push(
      ...getRideInstanceNotifications(
        {
          ...settlementRide,
          id: `${settlementRide.id}-dispute-demo`,
          settlementState: "DISPUTE_REVIEW",
          disputeRaised: true,
        },
        viewerRole,
      )
        .filter((item) => item.type === "dispute_under_review")
        .map((item) => ({ ...item, ctaTarget: hostTarget(settlementRide) })),
    );
  }

  return Array.from(new Map(notifications.map((item) => [item.stableKey, item])).values());
}
