import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, RidePodPaymentEventRow } from "@/lib/supabase/types";
import {
  RIDEPOD_PAYMENT_EVENT_TYPES,
  type RidePodPaymentEvent,
  type RidePodRecordPaymentEventInput,
  type RidePodRecordPaymentEventResult,
} from "@/lib/payments/ridepod-payment-types";

const unsafePayloadKeys = new Set([
  "client_secret",
  "clientsecret",
  "secret",
  "stripesecretkey",
  "stripe_secret_key",
  "cardnumber",
  "cvc",
  "cvv",
]);

const mockPaymentEvents: RidePodPaymentEvent[] = [];

function createMockId() {
  return `mock-payment-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKey(key: string) {
  return key.replaceAll("-", "").replaceAll("_", "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizePaymentEventPayload(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {};

  const sanitizeValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (!isRecord(value)) return value;

    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !unsafePayloadKeys.has(normalizeKey(key)))
        .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]),
    );
  };

  return sanitizeValue(payload) as Record<string, unknown>;
}

function toPaymentEvent(row: RidePodPaymentEventRow): RidePodPaymentEvent {
  return {
    id: row.id,
    rideInstanceId: row.ride_instance_id,
    podId: row.pod_id,
    userId: row.user_id,
    actorRole: row.actor_role,
    eventType: row.event_type as RidePodPaymentEvent["eventType"],
    paymentProvider: row.payment_provider,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    amountCents: row.amount_cents,
    currency: row.currency ?? "HKD",
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    eventPayload: isRecord(row.event_payload) ? row.event_payload : {},
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function createMockPaymentEvent(input: RidePodRecordPaymentEventInput): RidePodPaymentEvent {
  const event: RidePodPaymentEvent = {
    id: createMockId(),
    rideInstanceId: input.rideInstanceId ?? null,
    podId: input.podId ?? null,
    userId: input.userId ?? null,
    actorRole: input.actorRole ?? null,
    eventType: input.eventType,
    paymentProvider: input.paymentProvider ?? "STRIPE_TEST",
    stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    amountCents: input.amountCents ?? null,
    currency: input.currency ?? "HKD",
    previousStatus: input.previousStatus ?? null,
    newStatus: input.newStatus ?? null,
    eventPayload: sanitizePaymentEventPayload(input.eventPayload ?? {}),
    createdAt: new Date().toISOString(),
  };

  mockPaymentEvents.unshift(event);
  return event;
}

export function getMockPaymentEvents() {
  return [...mockPaymentEvents];
}

export async function recordPaymentEvent(input: RidePodRecordPaymentEventInput): Promise<RidePodRecordPaymentEventResult> {
  if (!RIDEPOD_PAYMENT_EVENT_TYPES.includes(input.eventType)) {
    return {
      success: false,
      event: null,
      warning: "Payment event logging skipped: unsupported event type.",
    };
  }

  const sanitizedPayload = sanitizePaymentEventPayload(input.eventPayload ?? {});
  const fallbackEvent = createMockPaymentEvent({ ...input, eventPayload: sanitizedPayload });

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("payment_events")
      .insert({
        ride_instance_id: input.rideInstanceId ?? null,
        pod_id: input.podId ?? null,
        user_id: input.userId ?? null,
        actor_role: input.actorRole ?? null,
        event_type: input.eventType,
        payment_provider: input.paymentProvider ?? "STRIPE_TEST",
        stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
        amount_cents: input.amountCents ?? null,
        currency: input.currency ?? "HKD",
        previous_status: input.previousStatus ?? null,
        new_status: input.newStatus ?? null,
        event_payload: sanitizedPayload as Json,
      })
      .select()
      .single();

    if (error || !data) {
      return {
        success: true,
        event: fallbackEvent,
        warning: "Payment event logging skipped: Supabase not configured.",
      };
    }

    return { success: true, event: toPaymentEvent(data as RidePodPaymentEventRow) };
  } catch {
    return {
      success: true,
      event: fallbackEvent,
      warning: "Payment event logging skipped: Supabase not configured.",
    };
  }
}
