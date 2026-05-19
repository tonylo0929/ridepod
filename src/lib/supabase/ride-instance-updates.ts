import "server-only";

import { getUserPods, type RecurringRideInstancePreview } from "@/lib/mock-data";
import {
  getAdminActionNotifications,
  getDemoRideInstanceNotifications,
  type AdminActionNotificationEventType,
  type RideInstanceNotification,
  type RideInstanceNotificationViewerRole,
} from "@/lib/ride-instance-notifications";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Json,
  RidePodAdminReviewCaseRow,
  RidePodEventRow,
  RidePodPodRow,
  RidePodProofRow,
  RidePodRideInstanceRow,
  RidePodSettlementRow,
} from "@/lib/supabase/types";

type AdminActionUpdatesResult = {
  source: "supabase" | "mock";
  notifications: RideInstanceNotification[];
  fallbackNote: string | null;
};

const adminActionEventTypes: AdminActionNotificationEventType[] = [
  "ADMIN_PROOF_APPROVED",
  "ADMIN_MORE_INFO_REQUESTED",
  "ADMIN_PROOF_REJECTED",
  "ADMIN_PAYOUT_HELD",
];

function asRecord(value: Json | null): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function payloadString(payload: Record<string, Json | undefined>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

async function fetchRowsByIds<Row extends { id: string }>(
  table: "ride_instances" | "pods" | "proofs" | "settlements" | "admin_review_cases",
  ids: string[],
): Promise<Map<string, Row>> {
  const targetIds = unique(ids);
  if (!targetIds.length) return new Map();

  const result = await getSupabaseServerClient().from(table).select("*").in("id", targetIds);
  if (result.error) throw result.error;

  return new Map(((result.data ?? []) as unknown as Row[]).map((row) => [row.id, row]));
}

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(value: string) {
  const date = safeDate(value);
  if (!date) return "Ride date";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeLabel(value: string) {
  const date = safeDate(value);
  if (!date) return "Time";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function splitRoute(routeLabel: string, pod: RidePodPodRow | null) {
  const parts = routeLabel.split(/\s*(?:->|→)\s*/);
  const origin = parts[0] || pod?.pickup_point || "Pickup point";
  const destination = parts[1] || pod?.dropoff_point || "Dropoff point";
  return { origin, destination };
}

function normalizeProofStatus(status: string | null | undefined): RecurringRideInstancePreview["proofStatus"] {
  if (
    status === "NEEDED" ||
    status === "SUBMITTED" ||
    status === "UNDER_REVIEW" ||
    status === "APPROVED" ||
    status === "VERIFIED" ||
    status === "REJECTED" ||
    status === "NEEDS_MORE_INFO"
  ) {
    return status;
  }

  return status === "FRAUD_SUSPECTED" ? "UNDER_REVIEW" : "NOT_REQUIRED";
}

function normalizeSettlementState(state: string | null | undefined): RecurringRideInstancePreview["settlementState"] {
  if (state === "ADMIN_REVIEW" || state === "DISPUTE_HOLD") return "DISPUTE_REVIEW";
  if (state === "DISPUTE_WINDOW" || state === "RIDER_NOTICE_SENT") return "DISPUTE_WINDOW";
  if (state === "FINALIZED") return "SETTLEMENT_FINAL";
  if (state === "PAYOUT_PENDING") return "PAYOUT_PENDING";
  if (state === "PAID" || state === "CLOSED") return "PAID";
  return undefined;
}

function statusFromRideInstance(
  rideInstance: RidePodRideInstanceRow,
  proof: RidePodProofRow | null,
  pod: RidePodPodRow | null,
): RecurringRideInstancePreview["status"] {
  if (rideInstance.instance_status === "QUOTE_NEEDED") return "quote_needed";
  if (rideInstance.instance_status === "QUOTE_UNDER_REVIEW") return "quote_under_review";
  if (rideInstance.instance_status === "READY_TO_BOOK") return "ready_to_book";
  if (rideInstance.instance_status === "RIDE_BOOKED") return "ride_booked";
  if (rideInstance.instance_status === "READY_FOR_TAXI_METER") return "ready_for_taxi_meter";
  if (rideInstance.instance_status === "RECEIPT_NEEDED") return "receipt_pending";
  if (rideInstance.instance_status === "METER_PROOF_NEEDED") return "meter_proof_needed";
  if (rideInstance.instance_status === "SETTLEMENT_READY" || rideInstance.instance_status === "DISPUTE_REVIEW") {
    return "settlement_ready";
  }
  if (rideInstance.instance_status === "SETTLEMENT_FINAL" || rideInstance.instance_status === "CLOSED") return "completed";
  if (rideInstance.instance_status === "PROOF_UNDER_REVIEW") {
    if (proof?.proof_type === "METER_PROOF" || pod?.ride_option === "TAXI_METER") return "meter_proof_under_review";
    if (proof?.proof_type === "FINAL_RECEIPT") return "receipt_under_review";
    return "quote_under_review";
  }
  return pod?.ride_option === "TAXI_METER" ? "ready_for_taxi_meter" : "quote_needed";
}

function ridePreviewFromRows(
  rideInstance: RidePodRideInstanceRow,
  pod: RidePodPodRow | null,
  proof: RidePodProofRow | null,
  settlement: RidePodSettlementRow | null,
): RecurringRideInstancePreview {
  const route = splitRoute(rideInstance.route_label, pod);

  return {
    id: rideInstance.id,
    recurringTemplateId: pod?.id,
    instanceDate: rideInstance.departure_at,
    displayDate: formatDateLabel(rideInstance.departure_at),
    departureTime: formatTimeLabel(rideInstance.departure_at),
    legType: rideInstance.leg_type === "RETURN" || rideInstance.leg_type === "return" ? "return" : "outbound",
    originLabel: route.origin,
    destinationLabel: route.destination,
    status: statusFromRideInstance(rideInstance, proof, pod),
    proofType: proof?.proof_type,
    proofStatus: normalizeProofStatus(proof?.proof_status),
    quotedFareCents: proof?.proof_type === "QUOTE_SCREENSHOT" ? proof.amount_cents ?? undefined : undefined,
    bookingFareCapCents: rideInstance.booking_fare_cap_cents,
    finalFareCents: proof?.proof_type !== "QUOTE_SCREENSHOT" ? proof?.amount_cents ?? undefined : undefined,
    receiptFareCents: proof?.proof_type === "FINAL_RECEIPT" ? proof.amount_cents ?? undefined : undefined,
    proofCertified: proof?.certification_accepted ?? undefined,
    certificationTextVersion: proof?.certification_text_version ?? undefined,
    submittedAt: proof?.submitted_at ?? undefined,
    reviewedAt: proof?.reviewed_at ?? undefined,
    settlementId: settlement?.id,
    settlementState: normalizeSettlementState(settlement?.settlement_state),
    disputeWindowEndsAt: settlement?.dispute_deadline_at ?? undefined,
    disputeRaised: settlement?.settlement_state === "ADMIN_REVIEW" || settlement?.settlement_state === "DISPUTE_HOLD",
    platformFeeCents: settlement?.platform_fee_cents ?? undefined,
    hostReimbursementCents: settlement?.host_reimbursement_cents ?? undefined,
    payoutState: settlement?.settlement_state === "PAID" || settlement?.settlement_state === "CLOSED" ? "PAID" : "PENDING",
    disputeReason: settlement?.settlement_state ?? null,
  };
}

function mergeNotifications(notifications: RideInstanceNotification[]) {
  return Array.from(new Map(notifications.map((notification) => [notification.stableKey, notification])).values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getAdminActionUpdateNotifications(
  viewerRole: RideInstanceNotificationViewerRole = "HOST",
): Promise<RideInstanceNotification[]> {
  const client = getSupabaseServerClient();
  const eventResult = await client
    .from("pod_events")
    .select("*")
    .in("event_type", adminActionEventTypes)
    .order("created_at", { ascending: false })
    .limit(50);

  if (eventResult.error) throw eventResult.error;

  const events = (eventResult.data ?? []) as RidePodEventRow[];
  const payloads = new Map(events.map((event) => [event.id, asRecord(event.event_payload)]));
  const rideInstanceIds = unique(events.map((event) => event.ride_instance_id));
  const proofIds = unique(events.map((event) => payloadString(payloads.get(event.id) ?? {}, "proofId")));
  const caseIds = unique(events.map((event) => payloadString(payloads.get(event.id) ?? {}, "caseId")));

  const [rideInstances, proofs, reviewCases] = await Promise.all([
    fetchRowsByIds<RidePodRideInstanceRow>("ride_instances", rideInstanceIds),
    fetchRowsByIds<RidePodProofRow>("proofs", proofIds),
    fetchRowsByIds<RidePodAdminReviewCaseRow>("admin_review_cases", caseIds),
  ]);
  const settlementIds = unique([
    ...Array.from(reviewCases.values()).map((reviewCase) => reviewCase.settlement_id),
    ...Array.from(rideInstances.values()).map((rideInstance) => rideInstance.settlement_id),
  ]);
  const podIds = unique(Array.from(rideInstances.values()).map((rideInstance) => rideInstance.pod_id));
  const [settlements, pods] = await Promise.all([
    fetchRowsByIds<RidePodSettlementRow>("settlements", settlementIds),
    fetchRowsByIds<RidePodPodRow>("pods", podIds),
  ]);

  return mergeNotifications(
    events.flatMap((event) => {
      if (!adminActionEventTypes.includes(event.event_type as AdminActionNotificationEventType)) return [];
      if (!event.ride_instance_id) return [];

      const payload = payloads.get(event.id) ?? {};
      const rideInstance = rideInstances.get(event.ride_instance_id);
      if (!rideInstance) return [];

      const proof = payloadString(payload, "proofId") ? proofs.get(payloadString(payload, "proofId") as string) ?? null : null;
      const reviewCase = payloadString(payload, "caseId")
        ? reviewCases.get(payloadString(payload, "caseId") as string) ?? null
        : null;
      const settlementId = reviewCase?.settlement_id ?? rideInstance.settlement_id;
      const settlement = settlementId ? settlements.get(settlementId) ?? null : null;
      const pod = rideInstance.pod_id ? pods.get(rideInstance.pod_id) ?? null : null;
      const preview = ridePreviewFromRows(rideInstance, pod, proof, settlement);

      return getAdminActionNotifications({
        adminAction: event.event_type as AdminActionNotificationEventType,
        rideInstance: preview,
        proof,
        settlement,
        reviewCase,
        viewerRole,
        createdAt: event.created_at,
      });
    }),
  );
}

export async function getRideInstanceUpdatesWithFallback(
  viewerRole: RideInstanceNotificationViewerRole = "HOST",
): Promise<AdminActionUpdatesResult> {
  const mockNotifications = getDemoRideInstanceNotifications(getUserPods(), viewerRole);

  try {
    const adminActionNotifications = await getAdminActionUpdateNotifications(viewerRole);

    // TODO: Persist notification rows in later slice.
    return {
      source: "supabase",
      notifications: mergeNotifications([...adminActionNotifications, ...mockNotifications]),
      fallbackNote: null,
    };
  } catch {
    return {
      source: "mock",
      notifications: mockNotifications,
      fallbackNote: "Supabase updates are unavailable; using mock ride notifications.",
    };
  }
}
