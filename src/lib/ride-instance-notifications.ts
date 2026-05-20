import type { RecurringRideInstancePreview, RidePod } from "@/lib/mock-data";
import type { RidePodAdminReviewCaseRow, RidePodProofRow, RidePodSettlementRow } from "@/lib/supabase/types";
import { getTaxiPartnerQuoteDisplayStatus, getTaxiPartnerQuoteRequest } from "@/lib/taxi-partner-quote";

export type RideInstanceNotificationTone = "gold" | "green" | "orange" | "amber" | "red" | "purple" | "blue" | "neutral";
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
  | "ride_booked"
  | "proof_approved"
  | "proof_more_info_needed"
  | "proof_rejected"
  | "payout_held"
  | "taxi_partner_quote_received"
  | "taxi_partner_guests_accepting"
  | "taxi_partner_ride_completed"
  | "taxi_partner_payout_pending";
export type RideInstanceNotificationViewerRole = "HOST" | "GUEST";
export type RideInstanceNotificationAudience = "HOST" | "GUEST" | "LOCKED_GUESTS" | "ALL";
export type AdminActionNotificationEventType =
  | "ADMIN_PROOF_APPROVED"
  | "ADMIN_MORE_INFO_REQUESTED"
  | "ADMIN_PROOF_REJECTED"
  | "ADMIN_PAYOUT_HELD";

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
  audience?: RideInstanceNotificationAudience;
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

function guestTarget(rideInstance: RecurringRideInstancePreview) {
  return rideInstance.recurringTemplateId
    ? `/pods/${rideInstance.recurringTemplateId}?rideInstanceId=${encodeURIComponent(rideInstance.id)}`
    : hostTarget(rideInstance);
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

function notificationGroup(createdAt: string): RideInstanceNotificationGroup {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "Earlier";
  const ageMs = Date.now() - created.getTime();
  if (ageMs <= 24 * 60 * 60 * 1000) return "Today";
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return "This week";
  return "Earlier";
}

function notificationTimeAgo(createdAt: string) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "now";
  const ageMinutes = Math.max(0, Math.round((Date.now() - created.getTime()) / 60000));
  if (ageMinutes < 60) return `${Math.max(1, ageMinutes)}m`;
  const ageHours = Math.round(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours}h`;
  return `${Math.round(ageHours / 24)}d`;
}

function proofKind(proof: Pick<RidePodProofRow, "proof_type" | "id"> | null | undefined) {
  if (proof?.proof_type === "QUOTE_SCREENSHOT") return "quote";
  if (proof?.proof_type === "METER_PROOF") return "meter";
  return "receipt";
}

function adminActionTarget(rideInstance: RecurringRideInstancePreview) {
  return hostTarget(rideInstance);
}

function adminActionStableKey(
  eventType: AdminActionNotificationEventType,
  rideInstance: RecurringRideInstancePreview,
  proof: Pick<RidePodProofRow, "id" | "proof_type"> | null | undefined,
  reviewCase: Pick<RidePodAdminReviewCaseRow, "id"> | null | undefined,
) {
  const proofId = proof?.id ?? "proof";
  const caseId = reviewCase?.id ?? "case";

  if (eventType === "ADMIN_PROOF_APPROVED") return `admin_proof_approved:${rideInstance.id}:${proofId}`;
  if (eventType === "ADMIN_MORE_INFO_REQUESTED") return `admin_more_info:${rideInstance.id}:${proofId}`;
  if (eventType === "ADMIN_PROOF_REJECTED") return `admin_proof_rejected:${rideInstance.id}:${proofId}`;
  return `admin_payout_held:${rideInstance.id}:${caseId}`;
}

export function getAdminActionNotifications(input: {
  adminAction: AdminActionNotificationEventType;
  rideInstance: RecurringRideInstancePreview;
  proof?: Pick<RidePodProofRow, "id" | "proof_type"> | null;
  settlement?: Pick<RidePodSettlementRow, "id" | "settlement_state"> | null;
  reviewCase?: Pick<RidePodAdminReviewCaseRow, "id" | "case_type"> | null;
  viewerRole: RideInstanceNotificationViewerRole;
  createdAt?: string | null;
  read?: boolean;
}): RideInstanceNotification[] {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const group = notificationGroup(createdAt);
  const timeAgo = notificationTimeAgo(createdAt);
  const target = adminActionTarget(input.rideInstance);
  const proofType = proofKind(input.proof);
  const host = input.viewerRole === "HOST";
  const audience: RideInstanceNotificationAudience = host ? "HOST" : "LOCKED_GUESTS";
  const common = {
    createdAt,
    group,
    timeAgo,
    read: input.read ?? false,
    audience,
  };

  if (input.adminAction === "ADMIN_PROOF_APPROVED") {
    if (proofType === "quote") {
      return [
        notification(input.rideInstance, {
          ...common,
          stableKey: adminActionStableKey(input.adminAction, input.rideInstance, input.proof, input.reviewCase),
          type: "proof_approved",
          title: "Quote approved",
          body: host
            ? "Your quote proof was approved. You may book the external ride."
            : "The host can now book this ride under the booking fare cap.",
          ctaLabel: host ? "Mark booked" : "View ride",
          ctaTarget: target,
          tone: "green",
        }),
      ];
    }

    const meter = proofType === "meter";
    return [
      notification(input.rideInstance, {
        ...common,
        stableKey: adminActionStableKey(input.adminAction, input.rideInstance, input.proof, input.reviewCase),
        type: "proof_approved",
        title: host ? (meter ? "Meter proof approved" : "Receipt approved") : "Final split ready",
        body: host
          ? meter
            ? "Your meter proof was approved. Settlement can continue."
            : "Your receipt was approved. Settlement can continue."
          : meter
            ? "Meter proof was approved. Review your final split before the dispute window ends."
            : "Receipt was approved. Review your final split before the dispute window ends.",
        ctaLabel: host ? "View settlement" : "View final split",
        ctaTarget: target,
        tone: host ? "green" : "blue",
      }),
    ];
  }

  if (input.adminAction === "ADMIN_MORE_INFO_REQUESTED") {
    const quote = proofType === "quote";
    const meter = proofType === "meter";
    return [
      notification(input.rideInstance, {
        ...common,
        stableKey: adminActionStableKey(input.adminAction, input.rideInstance, input.proof, input.reviewCase),
        type: "proof_more_info_needed",
        title: host
          ? quote
            ? "More quote info needed"
            : meter
              ? "More meter proof needed"
              : "More receipt info needed"
          : quote
            ? "Quote under review"
            : "Settlement delayed",
        body: host
          ? quote
            ? "RidePod needs clearer quote proof before this ride can be protected."
            : meter
              ? "Upload a clearer meter photo or taxi receipt so settlement can continue."
              : "Upload a clearer receipt so settlement can continue."
          : quote
            ? "RidePod needs more proof before the host can book this ride."
            : meter
              ? "RidePod needs more meter proof before settlement can continue."
              : "RidePod needs more receipt information before settlement can continue.",
        ctaLabel: host ? (quote ? "Upload quote" : meter ? "Upload meter proof" : "Upload receipt") : quote ? "View ride" : "View settlement",
        ctaTarget: target,
        tone: "amber",
      }),
    ];
  }

  if (input.adminAction === "ADMIN_PROOF_REJECTED") {
    const quote = proofType === "quote";
    const meter = proofType === "meter";
    return [
      notification(input.rideInstance, {
        ...common,
        stableKey: adminActionStableKey(input.adminAction, input.rideInstance, input.proof, input.reviewCase),
        type: "proof_rejected",
        title: quote ? "Quote rejected" : meter ? "Meter proof rejected" : host ? "Receipt rejected" : "Settlement delayed",
        body: host
          ? quote
            ? "Upload valid quote proof before booking this ride."
            : meter
              ? "Upload valid meter proof before settlement can continue."
              : "Upload valid receipt proof before settlement can continue."
          : quote
            ? "The host must upload valid quote proof before this ride can be protected."
            : meter
              ? "Meter proof was rejected. Settlement requires valid proof."
              : "Receipt proof was rejected. Settlement requires valid proof.",
        ctaLabel: host ? (quote ? "Upload quote" : meter ? "Upload meter proof" : "Upload receipt") : quote ? "View ride" : "View settlement",
        ctaTarget: target,
        tone: "red",
      }),
    ];
  }

  return [
    notification(input.rideInstance, {
      ...common,
      stableKey: adminActionStableKey(input.adminAction, input.rideInstance, input.proof, input.reviewCase),
      type: "payout_held",
      title: host ? "Payout held for review" : "Settlement under review",
      body: host
        ? "RidePod is reviewing this case. Payout is held until review is complete."
        : "RidePod is reviewing this ride. Settlement may be delayed.",
      ctaLabel: host ? "View review" : "View settlement",
      ctaTarget: target,
      tone: "amber",
    }),
  ];
}

export function getRideInstanceNotifications(
  rideInstance: RecurringRideInstancePreview,
  viewerRole: RideInstanceNotificationViewerRole,
): RideInstanceNotification[] {
  const target = hostTarget(rideInstance);
  const guestRideTarget = guestTarget(rideInstance);
  const host = viewerRole === "HOST";
  const items: RideInstanceNotification[] = [];

  if (rideInstance.taxiPartnerQuoteRequestId) {
    const taxiQuoteStatus = getTaxiPartnerQuoteDisplayStatus(
      getTaxiPartnerQuoteRequest(rideInstance.taxiPartnerQuoteRequestId),
    );

    if (taxiQuoteStatus.label === "Quote received") {
      items.push(
        notification(rideInstance, {
          stableKey: `taxi_partner_quote_received:${rideInstance.id}`,
          type: "taxi_partner_quote_received",
          title: "Taxi partner quote received",
          body: host
            ? "Guests can review and accept the shared taxi quote."
            : "Review and accept the shared taxi quote.",
          timeAgo: "10m",
          group: "Today",
          tone: "green",
          ctaLabel: host ? "View quote" : "Review quote",
          ctaTarget: host ? target : guestRideTarget,
          createdAt: "2026-05-18T09:55:00.000Z",
          read: false,
          audience: host ? "HOST" : "LOCKED_GUESTS",
        }),
      );
    }

    if (taxiQuoteStatus.label === "Guests accepting") {
      items.push(
        notification(rideInstance, {
          stableKey: `taxi_partner_guests_accepting:${rideInstance.id}`,
          type: "taxi_partner_guests_accepting",
          title: "Guests accepting quote",
          body: "Waiting for guests to accept the taxi partner quote.",
          timeAgo: "20m",
          group: "Today",
          tone: "purple",
          ctaLabel: host ? "View acceptances" : "Review quote",
          ctaTarget: host ? target : guestRideTarget,
          createdAt: "2026-05-18T09:45:00.000Z",
          read: false,
          audience: host ? "HOST" : "LOCKED_GUESTS",
        }),
      );
    }

    if (taxiQuoteStatus.label === "Payout pending" || taxiQuoteStatus.label === "Ride completed") {
      items.push(
        notification(rideInstance, {
          stableKey: host
            ? `taxi_partner_payout_pending:${rideInstance.id}`
            : `taxi_partner_ride_completed:${rideInstance.id}`,
          type: host ? "taxi_partner_payout_pending" : "taxi_partner_ride_completed",
          title: host ? "Payout pending" : "Ride completed",
          body: host
            ? "Payout is pending until the dispute window ends."
            : "Review the ride before the dispute window ends.",
          timeAgo: "15m",
          group: "Today",
          tone: "blue",
          ctaLabel: host ? "View payout" : "View settlement",
          ctaTarget: host ? target : guestRideTarget,
          createdAt: "2026-05-18T10:10:00.000Z",
          read: false,
          audience: host ? "HOST" : "LOCKED_GUESTS",
        }),
      );
    }
  }

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

    notifications.push(
      ...getAdminActionNotifications({
        adminAction: "ADMIN_PROOF_APPROVED",
        rideInstance: settlementRide,
        proof: { id: "demo-final-receipt-proof", proof_type: "FINAL_RECEIPT" },
        reviewCase: { id: "demo-receipt-approved", case_type: "RECEIPT_ABOVE_CAP" },
        viewerRole,
        createdAt: "2026-05-18T11:30:00.000Z",
      }),
      ...getAdminActionNotifications({
        adminAction: "ADMIN_PROOF_REJECTED",
        rideInstance: {
          ...settlementRide,
          id: `${settlementRide.id}-rejected-demo`,
          status: "receipt_pending",
          proofStatus: "REJECTED",
        },
        proof: { id: "demo-rejected-receipt-proof", proof_type: "FINAL_RECEIPT" },
        reviewCase: { id: "demo-receipt-rejected", case_type: "SUSPICIOUS_PROOF" },
        viewerRole,
        createdAt: "2026-05-18T10:45:00.000Z",
      }),
      ...getAdminActionNotifications({
        adminAction: "ADMIN_MORE_INFO_REQUESTED",
        rideInstance: {
          ...settlementRide,
          id: `${settlementRide.id}-more-info-demo`,
          status: "receipt_under_review",
          proofStatus: "NEEDS_MORE_INFO",
        },
        proof: { id: "demo-more-info-receipt-proof", proof_type: "FINAL_RECEIPT" },
        reviewCase: { id: "demo-receipt-more-info", case_type: "RECEIPT_ABOVE_CAP" },
        viewerRole,
        createdAt: "2026-05-18T10:20:00.000Z",
      }),
      ...getAdminActionNotifications({
        adminAction: "ADMIN_PAYOUT_HELD",
        rideInstance: {
          ...settlementRide,
          id: `${settlementRide.id}-payout-held-demo`,
          settlementState: "DISPUTE_REVIEW",
          payoutState: "HELD_FOR_REVIEW",
        },
        proof: { id: "demo-payout-held-proof", proof_type: "FINAL_RECEIPT" },
        reviewCase: { id: "demo-payout-held-case", case_type: "PAYOUT_HOLD" },
        viewerRole,
        createdAt: "2026-05-18T09:40:00.000Z",
      }),
    );
  }

  return Array.from(new Map(notifications.map((item) => [item.stableKey, item])).values());
}
