import {
  makeAuditEvent,
  type AuditEvent,
  type PodLifecycleState,
  type ProtectedPod,
  type RiskFlag,
  type RiskFlagStatus,
  type RiskSeverity,
  type RiskType,
} from "./money-safety";
import { mockAuditEvents, mockRiskFlags, protectedPods } from "./money-safety-mock";

type AdminReviewDecision = "RESOLVED" | "KEEP_REVIEW" | "DISPUTE_HOLD";

type AdminReviewMetadata = {
  lifecycleState?: Extract<PodLifecycleState, "ADMIN_REVIEW" | "DISPUTE_HOLD">;
  userId?: string | null;
  riskType?: RiskType;
  severity?: RiskSeverity;
  notes?: string | null;
  [key: string]: unknown;
};

type AdminReviewResult = {
  ok: boolean;
  pod: ProtectedPod | null;
  auditEvents: AuditEvent[];
  riskFlags: RiskFlag[];
  error?: string;
};

type RiskFlagResult = {
  ok: boolean;
  riskFlag: RiskFlag | null;
  auditEvents: AuditEvent[];
  error?: string;
};

const ADMIN_HOLD_STATES: PodLifecycleState[] = ["ADMIN_REVIEW", "DISPUTE_HOLD"];

function getPod(podId: string) {
  return protectedPods.find((candidate) => candidate.id === podId) ?? null;
}

function getRiskFlag(riskFlagId: string) {
  return mockRiskFlags.find((candidate) => candidate.id === riskFlagId) ?? null;
}

function recordAudit(events: AuditEvent[]) {
  mockAuditEvents.push(...events);
  return events;
}

function recordRiskFlags(flags: RiskFlag[]) {
  mockRiskFlags.push(...flags);
  return flags;
}

function makeRiskFlag(input: {
  podId: string | null;
  userId: string;
  riskType: RiskType;
  severity: RiskSeverity;
  notes: string | null;
}): RiskFlag {
  const now = new Date().toISOString();

  return {
    id: `risk-${input.riskType.toLowerCase()}-${now}`,
    podId: input.podId,
    userId: input.userId,
    riskType: input.riskType,
    severity: input.severity,
    status: "OPEN",
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}

function failedReview(error: string, pod: ProtectedPod | null = null): AdminReviewResult {
  return { ok: false, pod, auditEvents: [], riskFlags: [], error };
}

function failedRiskFlag(error: string, riskFlag: RiskFlag | null = null): RiskFlagResult {
  return { ok: false, riskFlag, auditEvents: [], error };
}

export function createRiskFlag(
  userId: string,
  podId: string | null,
  riskType: RiskType,
  severity: RiskSeverity,
  notes: string | null = null,
): RiskFlag {
  return recordRiskFlags([
    makeRiskFlag({
      podId,
      userId,
      riskType,
      severity,
      notes,
    }),
  ])[0];
}

export function createAdminReview(
  podId: string,
  reason: string,
  metadata: AdminReviewMetadata = {},
): AdminReviewResult {
  const pod = getPod(podId);
  if (!pod) return failedReview("POD_NOT_FOUND");

  const now = new Date().toISOString();
  const lifecycleState = metadata.lifecycleState ?? "ADMIN_REVIEW";
  pod.lifecycleState = lifecycleState;
  pod.adminReviewRequired = true;
  pod.updatedAt = now;

  const riskFlags =
    metadata.riskType && metadata.userId
      ? [
          createRiskFlag(
            metadata.userId,
            podId,
            metadata.riskType,
            metadata.severity ?? "MEDIUM",
            metadata.notes ?? reason,
          ),
        ]
      : [];
  const auditEvents = recordAudit([
    makeAuditEvent("ADMIN_OVERRIDE", {
      podId,
      userId: metadata.userId ?? null,
      eventPayload: {
        action: lifecycleState === "DISPUTE_HOLD" ? "DISPUTE_HOLD_CREATED" : "ADMIN_REVIEW_CREATED",
        reason,
        metadata,
      },
    }),
  ]);

  return { ok: true, pod, auditEvents, riskFlags };
}

export function resolveAdminReview(
  adminUserId: string,
  podId: string,
  decision: AdminReviewDecision,
  notes?: string | null,
): AdminReviewResult {
  if (!adminUserId) return failedReview("ADMIN_REQUIRED");
  if (!notes?.trim()) return failedReview("ADMIN_NOTES_REQUIRED");

  const pod = getPod(podId);
  if (!pod) return failedReview("POD_NOT_FOUND");

  const now = new Date().toISOString();
  if (decision === "DISPUTE_HOLD") {
    pod.lifecycleState = "DISPUTE_HOLD";
    pod.adminReviewRequired = true;
  } else if (decision === "RESOLVED") {
    pod.adminReviewRequired = false;
  } else {
    pod.lifecycleState = "ADMIN_REVIEW";
    pod.adminReviewRequired = true;
  }
  pod.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("ADMIN_OVERRIDE", {
      podId,
      userId: adminUserId,
      eventPayload: {
        action: "ADMIN_REVIEW_RESOLVED",
        decision,
        notes,
      },
    }),
  ]);

  return { ok: true, pod, auditEvents, riskFlags: [] };
}

export function resolveRiskFlag(
  adminUserId: string,
  riskFlagId: string,
  status: Exclude<RiskFlagStatus, "OPEN">,
  notes?: string | null,
): RiskFlagResult {
  if (!adminUserId) return failedRiskFlag("ADMIN_REQUIRED");
  if (!notes?.trim()) return failedRiskFlag("ADMIN_NOTES_REQUIRED");

  const riskFlag = getRiskFlag(riskFlagId);
  if (!riskFlag) return failedRiskFlag("RISK_FLAG_NOT_FOUND");

  const now = new Date().toISOString();
  riskFlag.status = status;
  riskFlag.notes = notes;
  riskFlag.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("ADMIN_OVERRIDE", {
      podId: riskFlag.podId,
      userId: adminUserId,
      eventPayload: {
        action: "RISK_FLAG_RESOLVED",
        riskFlagId,
        riskType: riskFlag.riskType,
        status,
        notes,
      },
    }),
  ]);

  return { ok: true, riskFlag, auditEvents };
}

export function adminOverridePodState(
  adminUserId: string,
  podId: string,
  nextState: PodLifecycleState,
  notes?: string | null,
): AdminReviewResult {
  if (!adminUserId) return failedReview("ADMIN_REQUIRED");
  if (!notes?.trim()) return failedReview("ADMIN_NOTES_REQUIRED");

  const pod = getPod(podId);
  if (!pod) return failedReview("POD_NOT_FOUND");

  const now = new Date().toISOString();
  pod.lifecycleState = nextState;
  pod.adminReviewRequired = ADMIN_HOLD_STATES.includes(nextState);
  pod.updatedAt = now;

  const auditEvents = recordAudit([
    makeAuditEvent("ADMIN_OVERRIDE", {
      podId,
      userId: adminUserId,
      eventPayload: {
        action: "POD_STATE_OVERRIDDEN",
        nextState,
        notes,
      },
    }),
  ]);

  return { ok: true, pod, auditEvents, riskFlags: [] };
}
