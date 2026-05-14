import {
  makeAuditEvent,
  type AuditEvent,
  type ProcessedStripeWebhookEvent,
  type RidePodPaymentIntent,
  type RidePodPaymentIntentStatus,
} from "./money-safety";
import {
  mockAuditEvents,
  mockPaymentIntents,
  mockProcessedStripeWebhookEvents,
  protectedPods,
} from "./money-safety-mock";
import { createAdminReview } from "./pod-admin-review";
import { checkPodEligibility } from "./pod-eligibility";
import { isMemberPaymentConfirmed, recomputePodLockState } from "./pod-join";

type StripeEventObject = {
  id?: string;
  object?: string;
  status?: string;
  amount?: number;
  amount_received?: number;
  amount_capturable?: number;
  amount_refunded?: number;
  refunded?: boolean;
  payment_intent?: string | null;
  last_payment_error?: {
    code?: string | null;
    message?: string | null;
  } | null;
};

export type StripeWebhookEventLike = {
  id: string;
  type: string;
  livemode?: boolean;
  data: {
    object: StripeEventObject;
  };
};

export type StripeWebhookResult = {
  ok: boolean;
  duplicate: boolean;
  processedEvent: ProcessedStripeWebhookEvent | null;
  paymentIntent: RidePodPaymentIntent | null;
  auditEvents: AuditEvent[];
  error?: string;
};

function recordAudit(events: AuditEvent[]) {
  mockAuditEvents.push(...events);
  return events;
}

function markProcessed(
  event: StripeWebhookEventLike,
  status: ProcessedStripeWebhookEvent["status"] = "PROCESSED",
  error: string | null = null,
) {
  const processed: ProcessedStripeWebhookEvent = {
    id: event.id,
    provider: "STRIPE",
    externalEventId: event.id,
    eventType: event.type,
    processedAt: new Date().toISOString(),
    status,
    error,
  };
  mockProcessedStripeWebhookEvents.push(processed);
  return processed;
}

function findPaymentIntentByExternalId(externalPaymentIntentId: string | null | undefined) {
  if (!externalPaymentIntentId) return null;
  return (
    mockPaymentIntents.find(
      (intent) => intent.provider === "STRIPE" && intent.externalPaymentIntentId === externalPaymentIntentId,
    ) ?? null
  );
}

function findPodAndMember(intent: RidePodPaymentIntent | null) {
  if (!intent) return { pod: null, member: null };
  const pod = protectedPods.find((candidate) => candidate.id === intent.podId) ?? null;
  const member = pod?.members.find((candidate) => candidate.id === intent.podMemberId) ?? null;
  return { pod, member };
}

function paymentIntentIdFromEvent(event: StripeWebhookEventLike) {
  const object = event.data.object;
  if (object.object === "payment_intent") return object.id ?? null;
  return typeof object.payment_intent === "string" ? object.payment_intent : null;
}

function updateIntent(
  intent: RidePodPaymentIntent,
  status: RidePodPaymentIntentStatus,
  eventObject: StripeEventObject,
) {
  intent.status = status;
  intent.failureCode = eventObject.last_payment_error?.code ?? null;
  intent.failureMessage = eventObject.last_payment_error?.message ?? null;

  if (typeof eventObject.amount_received === "number") {
    intent.amountCapturedCents = eventObject.amount_received;
  }

  if (typeof eventObject.amount_refunded === "number") {
    intent.amountRefundedCents = eventObject.amount_refunded;
  }

  intent.updatedAt = new Date().toISOString();
  return intent;
}

function logIntentUpdate(event: StripeWebhookEventLike, intent: RidePodPaymentIntent | null, action: string) {
  return makeAuditEvent("PAYMENT_INTENT_UPDATED", {
    podId: intent?.podId ?? null,
    userId: intent?.userId ?? null,
    eventPayload: {
      action,
      stripeEventId: event.id,
      stripeEventType: event.type,
      localPaymentIntentId: intent?.id ?? null,
      externalPaymentIntentId: intent?.externalPaymentIntentId ?? paymentIntentIdFromEvent(event),
    },
  });
}

function handleRequiresCapture(event: StripeWebhookEventLike, intent: RidePodPaymentIntent) {
  updateIntent(intent, "AUTHORIZED", event.data.object);
  const { pod, member } = findPodAndMember(intent);

  if (pod && member && intent.intentType === "SEAT_AUTHORIZATION") {
    member.paymentState = "AUTHORIZED";
    const eligibility = checkPodEligibility(member.userId, pod.id);
    if (eligibility.eligible && ["PAYMENT_REQUIRED", "AUTHORIZING", "CONFIRMED", "LOCKED"].includes(member.memberState)) {
      member.memberState = "CONFIRMED";
      member.lockedAt ??= new Date().toISOString();
      recomputePodLockState(pod.id);
    }
    member.updatedAt = new Date().toISOString();
  }
}

function handleSucceeded(event: StripeWebhookEventLike, intent: RidePodPaymentIntent) {
  updateIntent(intent, "SUCCEEDED", event.data.object);
  const { member } = findPodAndMember(intent);
  if (member && intent.intentType === "SEAT_AUTHORIZATION") {
    member.paymentState = "CAPTURED";
    member.updatedAt = new Date().toISOString();
  }
}

function handlePaymentFailed(event: StripeWebhookEventLike, intent: RidePodPaymentIntent) {
  updateIntent(intent, "FAILED", event.data.object);
  const { member } = findPodAndMember(intent);
  if (member && !isMemberPaymentConfirmed(member)) {
    member.paymentState = "AUTH_FAILED";
    member.memberState = "PAYMENT_REQUIRED";
    member.updatedAt = new Date().toISOString();
  }
}

function handleCanceled(event: StripeWebhookEventLike, intent: RidePodPaymentIntent) {
  updateIntent(intent, "CANCELED", event.data.object);
  const { member } = findPodAndMember(intent);
  if (member) {
    member.paymentState = intent.amountCapturedCents > 0 || intent.amountRefundedCents > 0 ? "REFUNDED" : "AUTH_EXPIRED";
    member.updatedAt = new Date().toISOString();
  }
}

function handleRefunded(event: StripeWebhookEventLike, intent: RidePodPaymentIntent) {
  updateIntent(intent, event.data.object.refunded ? "REFUNDED" : intent.status, event.data.object);
  const { member } = findPodAndMember(intent);
  if (member && event.data.object.refunded) {
    member.paymentState = "REFUNDED";
    member.updatedAt = new Date().toISOString();
  }
}

function handleDispute(event: StripeWebhookEventLike, intent: RidePodPaymentIntent) {
  updateIntent(intent, "DISPUTED", event.data.object);
  const { pod, member } = findPodAndMember(intent);
  if (member) {
    member.paymentState = "DISPUTED";
    member.updatedAt = new Date().toISOString();
  }

  if (pod) {
    createAdminReview(pod.id, "Stripe payment dispute created.", {
      lifecycleState: "DISPUTE_HOLD",
      userId: member?.userId ?? intent.userId,
      riskType: "STRIPE_PAYMENT_DISPUTE",
      severity: "HIGH",
      notes: "Stripe reported a payment dispute. Hold settlement and reimbursement review.",
      stripeEventId: event.id,
      externalPaymentIntentId: intent.externalPaymentIntentId,
    });
  }
}

export function recordInvalidStripeWebhookSignature(reason = "INVALID_SIGNATURE") {
  return recordAudit([
    makeAuditEvent("STRIPE_WEBHOOK_INVALID_SIGNATURE", {
      eventPayload: { reason },
    }),
  ]);
}

export function handleStripeWebhookEvent(event: StripeWebhookEventLike): StripeWebhookResult {
  const receivedEvent = makeAuditEvent("STRIPE_WEBHOOK_RECEIVED", {
    eventPayload: {
      stripeEventId: event.id,
      stripeEventType: event.type,
      livemode: Boolean(event.livemode),
    },
  });

  if (event.livemode) {
    const processedEvent = markProcessed(event, "ERROR", "STRIPE_LIVE_EVENTS_NOT_ALLOWED");
    const auditEvents = recordAudit([
      receivedEvent,
      makeAuditEvent("STRIPE_WEBHOOK_PROCESSED", {
        eventPayload: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          status: "ERROR",
          error: "STRIPE_LIVE_EVENTS_NOT_ALLOWED",
        },
      }),
    ]);
    return {
      ok: false,
      duplicate: false,
      processedEvent,
      paymentIntent: null,
      auditEvents,
      error: "STRIPE_LIVE_EVENTS_NOT_ALLOWED",
    };
  }

  const existingEvent = mockProcessedStripeWebhookEvents.find((candidate) => candidate.externalEventId === event.id || candidate.id === event.id);
  if (existingEvent) {
    const auditEvents = recordAudit([
      receivedEvent,
      makeAuditEvent("STRIPE_WEBHOOK_DUPLICATE", {
        eventPayload: {
          stripeEventId: event.id,
          stripeEventType: event.type,
        },
      }),
    ]);
    return { ok: true, duplicate: true, processedEvent: existingEvent, paymentIntent: null, auditEvents };
  }

  const externalPaymentIntentId = paymentIntentIdFromEvent(event);
  const intent = findPaymentIntentByExternalId(externalPaymentIntentId);
  const auditEvents: AuditEvent[] = [receivedEvent];

  if (!intent) {
    const processedEvent = markProcessed(event, "IGNORED", "PAYMENT_INTENT_NOT_FOUND");
    auditEvents.push(
      makeAuditEvent("STRIPE_WEBHOOK_PROCESSED", {
        eventPayload: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          status: "IGNORED",
          error: "PAYMENT_INTENT_NOT_FOUND",
          externalPaymentIntentId,
        },
      }),
    );
    return {
      ok: true,
      duplicate: false,
      processedEvent,
      paymentIntent: null,
      auditEvents: recordAudit(auditEvents),
    };
  }

  switch (event.type) {
    case "payment_intent.requires_capture":
      handleRequiresCapture(event, intent);
      auditEvents.push(logIntentUpdate(event, intent, "PAYMENT_INTENT_REQUIRES_CAPTURE"));
      break;
    case "payment_intent.succeeded":
      handleSucceeded(event, intent);
      auditEvents.push(logIntentUpdate(event, intent, "PAYMENT_INTENT_SUCCEEDED"));
      break;
    case "payment_intent.payment_failed":
      handlePaymentFailed(event, intent);
      auditEvents.push(logIntentUpdate(event, intent, "PAYMENT_INTENT_PAYMENT_FAILED"));
      break;
    case "payment_intent.canceled":
      handleCanceled(event, intent);
      auditEvents.push(logIntentUpdate(event, intent, "PAYMENT_INTENT_CANCELED"));
      break;
    case "charge.refunded":
      handleRefunded(event, intent);
      auditEvents.push(logIntentUpdate(event, intent, "CHARGE_REFUNDED"));
      break;
    case "charge.dispute.created":
      handleDispute(event, intent);
      auditEvents.push(
        logIntentUpdate(event, intent, "CHARGE_DISPUTE_CREATED"),
        makeAuditEvent("STRIPE_DISPUTE_CREATED", {
          podId: intent.podId,
          userId: intent.userId,
          eventPayload: {
            stripeEventId: event.id,
            externalPaymentIntentId: intent.externalPaymentIntentId,
          },
        }),
      );
      break;
    default:
      auditEvents.push(
        makeAuditEvent("STRIPE_WEBHOOK_PROCESSED", {
          podId: intent.podId,
          userId: intent.userId,
          eventPayload: {
            stripeEventId: event.id,
            stripeEventType: event.type,
            status: "IGNORED",
          },
        }),
      );
      break;
  }

  const processedEvent = markProcessed(event);
  auditEvents.push(
    makeAuditEvent("STRIPE_WEBHOOK_PROCESSED", {
      podId: intent.podId,
      userId: intent.userId,
      eventPayload: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        status: "PROCESSED",
      },
    }),
  );

  return {
    ok: true,
    duplicate: false,
    processedEvent,
    paymentIntent: intent,
    auditEvents: recordAudit(auditEvents),
  };
}
