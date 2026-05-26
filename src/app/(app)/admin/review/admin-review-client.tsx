"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileSearch,
  IdCard,
  LockKeyhole,
  ReceiptText,
  ShieldAlert,
  X,
} from "lucide-react";
import { applyAdminReviewActionForCase } from "@/app/(app)/admin/review/actions";
import { ProofPreviewButton } from "@/components/proof-preview-button";
import { Badge, cn } from "@/components/ui";
import {
  adminAuditEventPlaceholders,
  adminDecisionLabels,
  adminReviewDecisionCopy,
  adminReviewFilters,
  formatAdminHkd,
  type AdminDecisionKey,
  type AdminDisputeEvidenceTimelineItem,
  type AdminReviewCase,
  type AdminReviewFilter,
  type AdminReviewSeverity,
} from "@/lib/admin-review-queue";
import {
  buildRidePodEvidencePackageFromAdminReviewCase,
  type RidePodEvidencePackage,
} from "@/lib/payments/evidence-package";
import type { AdminReviewCaseViewModel } from "@/lib/supabase/admin-review-cases";

type AdminReviewAction =
  | "APPROVE_PROOF"
  | "REQUEST_MORE_INFO"
  | "REJECT_PROOF"
  | "HOLD_PAYOUT"
  | "APPROVE_VERIFICATION"
  | "REJECT_VERIFICATION";
type ApplyAdminReviewActionResult = Awaited<ReturnType<typeof applyAdminReviewActionForCase>>;
type TaxiPartnerMockActionKey =
  | "holdPayout"
  | "releasePayoutMock"
  | "requestMoreInfo"
  | "resolveDispute"
  | "denyPayoutMock";
type TaxiPartnerConfirmableActionKey = TaxiPartnerMockActionKey;
type AdminPaymentSimulationActionKey =
  | "captureTestPayment"
  | "cancelTestAuthorization"
  | "simulateRefund"
  | "holdPayment"
  | "markPayoutReady";

type AdminPaymentSimulationStatus =
  | "TEST_PAYMENT_INTENT_CREATED"
  | "TEST_REQUIRES_CAPTURE"
  | "TEST_CAPTURED"
  | "TEST_CANCELED"
  | "TEST_REFUND_SIMULATED"
  | "TEST_CAPTURE_FAILED"
  | "TEST_CANCEL_FAILED"
  | "HELD_FOR_REVIEW"
  | "CLEARED_FOR_PAYOUT";

type AdminPaymentHistoryEvent = {
  id: string;
  createdAt: string;
  eventType: string;
  actor: string;
  amountCents: number | null;
  previousStatus: string | null;
  newStatus: string | null;
};

const taxiPartnerMockActionLabels: Array<{ key: TaxiPartnerMockActionKey; label: string; requiresNotes: boolean }> = [
  { key: "holdPayout", label: "Hold payout", requiresNotes: true },
  { key: "releasePayoutMock", label: "Mark payout ready", requiresNotes: false },
  { key: "requestMoreInfo", label: "Request more info", requiresNotes: true },
  { key: "resolveDispute", label: "Resolve dispute", requiresNotes: false },
  { key: "denyPayoutMock", label: "Deny payout in demo", requiresNotes: true },
];

const taxiPartnerMockActionMessages: Record<TaxiPartnerMockActionKey, string> = {
  holdPayout: "Payout held for manual review.",
  releasePayoutMock: "Payout marked ready in demo mode.",
  requestMoreInfo: "More information requested.",
  resolveDispute: "Dispute resolved in demo mode.",
  denyPayoutMock: "Payout denied in demo mode.",
};

function severityClass(severity: AdminReviewSeverity) {
  if (severity === "Critical") return "bg-[var(--rp-danger-bg)] text-[var(--rp-danger)] ring-[var(--rp-border)]";
  if (severity === "High") return "bg-orange-400/10 text-orange-300 ring-orange-400/25";
  if (severity === "Medium") return "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]";
  return "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]";
}

function reviewStateClass(state: string) {
  if (["APPROVED", "RESOLVED", "RELEASED", "VERIFIED"].includes(state)) {
    return "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]";
  }
  if (["REJECTED", "HELD_FOR_REVIEW", "FRAUD_SUSPECTED"].includes(state)) {
    return "bg-[var(--rp-danger-bg)] text-[var(--rp-danger)] ring-[var(--rp-border)]";
  }
  return "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]";
}

function timelineToneClass(tone: AdminDisputeEvidenceTimelineItem["tone"]) {
  if (tone === "green") return "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]";
  if (tone === "red") return "bg-[var(--rp-danger-bg)] text-[var(--rp-danger)] ring-[var(--rp-border)]";
  if (tone === "amber") return "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]";
  if (tone === "blue") return "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-primary)] ring-[var(--rp-border)]";
  return "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]";
}

function isOpenReviewState(state: string) {
  return !["APPROVED", "REJECTED", "RESOLVED"].includes(state);
}

function differenceLabel(value?: number, compareTo?: number) {
  if (typeof value !== "number" || typeof compareTo !== "number") return "None";
  const difference = value - compareTo;
  if (difference === 0) return "No difference";
  return `${difference > 0 ? "+" : "-"}${formatAdminHkd(Math.abs(difference))}`;
}

function getTaxiPartnerMockActionUpdate(
  actionKey: TaxiPartnerMockActionKey,
  reviewCase: AdminReviewCaseViewModel,
): Partial<AdminReviewCaseViewModel> {
  const timeline = [
    ...(reviewCase.taxiPartnerTimeline ?? []),
    {
      id: `taxi-partner-admin-${actionKey}-${Date.now()}`,
      title: "Admin decision" as const,
      timestampLabel: "Just now",
      detail: taxiPartnerMockActionMessages[actionKey],
    },
  ];

  if (actionKey === "holdPayout") {
    return {
      payoutStatus: "HELD_FOR_REVIEW",
      reviewState: "UNDER_REVIEW",
      reviewStateLabel: "Under review",
      payoutStatusLabel: "Payout held",
      statusLabel: "Payout held",
      taxiPartnerTimeline: timeline,
    };
  }

  if (actionKey === "releasePayoutMock") {
    return {
      payoutStatus: "READY_TO_RELEASE",
      reviewState: "RESOLVED",
      reviewStateLabel: "Resolved",
      payoutStatusLabel: "Payout ready",
      statusLabel: "Payout ready",
      taxiPartnerTimeline: timeline,
    };
  }

  if (actionKey === "requestMoreInfo") {
    return {
      reviewState: "NEEDS_MORE_INFO",
      reviewStateLabel: "Needs more info",
      statusLabel: "Needs more info",
      taxiPartnerTimeline: timeline,
    };
  }

  if (actionKey === "resolveDispute") {
    return {
      disputeStatus: "RESOLVED",
      reviewState: "RESOLVED",
      reviewStateLabel: "Resolved",
      statusLabel: "Resolved",
      taxiPartnerTimeline: timeline,
    };
  }

  return {
    payoutStatus: "DENIED_MOCK",
    reviewState: "RESOLVED",
    reviewStateLabel: "Resolved",
    payoutStatusLabel: "Payout denied",
    statusLabel: "Payout denied",
    taxiPartnerTimeline: timeline,
  };
}

export function AdminReviewClient({
  initialCases,
  source,
  fallbackNote,
  userFacingError,
  stripeTestModeEnabled,
}: {
  initialCases: AdminReviewCaseViewModel[];
  source: "supabase" | "mock";
  fallbackNote: string | null;
  userFacingError: string | null;
  stripeTestModeEnabled: boolean;
}) {
  const [selectedFilter, setSelectedFilter] = useState<AdminReviewFilter>("All");
  const [selectedCase, setSelectedCase] = useState<AdminReviewCaseViewModel | null>(null);
  const [caseUpdates, setCaseUpdates] = useState<Record<string, Partial<AdminReviewCaseViewModel>>>({});
  const baseCases = useMemo(() => initialCases, [initialCases]);
  const cases = useMemo(
    () => baseCases.map((reviewCase) => ({ ...reviewCase, ...caseUpdates[reviewCase.id] })),
    [baseCases, caseUpdates],
  );
  const visibleCases = cases.filter((reviewCase) =>
    selectedFilter === "All" ? true : reviewCase.filter === selectedFilter,
  );

  const handleDecisionApplied = async (caseId: string, decisionKey: AdminDecisionKey, adminNotes: string) => {
    const result = await applyAdminReviewActionForCase({
      caseId,
      action: adminActionForDecision(decisionKey),
      adminNotes,
    });

    if (!result.ok) {
      return {
        ok: false,
        message: result.validationError ?? result.userFacingMessage,
      };
    }

    const update = getDecisionCaseUpdate(decisionKey, result);
    setCaseUpdates((current) => ({ ...current, [caseId]: { ...current[caseId], ...update } }));
    setSelectedCase((current) => (current?.id === caseId ? { ...current, ...update } : current));
    return { ok: true, message: result.userFacingMessage };
  };

  const handleTaxiPartnerMockActionApplied = async (
    caseId: string,
    actionKey: TaxiPartnerMockActionKey,
    adminNotes: string,
  ) => {
    const reviewCase = cases.find((item) => item.id === caseId) ?? selectedCase;
    if (!reviewCase) {
      return { ok: false, message: "Could not find this taxi partner case." };
    }

    const actionConfig = taxiPartnerMockActionLabels.find((item) => item.key === actionKey);
    if (actionConfig?.requiresNotes && !adminNotes.trim()) {
      return { ok: false, message: "Admin notes are required for this action." };
    }

    const update = getTaxiPartnerMockActionUpdate(actionKey, reviewCase);
    setCaseUpdates((current) => ({ ...current, [caseId]: { ...current[caseId], ...update } }));
    setSelectedCase((current) => (current?.id === caseId ? { ...current, ...update } : current));

    return { ok: true, message: taxiPartnerMockActionMessages[actionKey] };
  };

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_18%,transparent),transparent_38%),var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Internal queue</p>
            <h1 className="mt-2 text-[34px] font-black leading-tight text-[var(--rp-text)]">Admin Review</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Review proof, disputes, above-cap fares, and payout holds.
            </p>
            {source === "mock" && fallbackNote ? (
              <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
                {userFacingError ?? "Couldn't load review cases. Try again later."} {fallbackNote}
              </p>
            ) : null}
          </div>
          <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Open cases</p>
            <p className="mt-1 text-3xl font-black text-[var(--rp-primary)]">
              {cases.filter((reviewCase) => isOpenReviewState(reviewCase.reviewState)).length}
            </p>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Admin review filters">
        {adminReviewFilters.map((filter) => {
          const selected = selectedFilter === filter;
          const count = filter === "All" ? cases.length : cases.filter((reviewCase) => reviewCase.filter === filter).length;

          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSelectedFilter(filter)}
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black transition",
                selected
                  ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
              )}
            >
              {filter}
              <span className="rounded-full bg-[rgba(255,255,255,0.14)] px-2 py-0.5 text-[11px]">{count}</span>
            </button>
          );
        })}
      </div>

      <section className="grid gap-3">
        {visibleCases.map((reviewCase) => (
          <ReviewCaseCard key={reviewCase.id} reviewCase={reviewCase} onOpen={() => setSelectedCase(reviewCase)} />
        ))}
      </section>

      {selectedCase ? (
        <ReviewCaseModal
          reviewCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onDecisionApplied={handleDecisionApplied}
          onTaxiPartnerMockActionApplied={handleTaxiPartnerMockActionApplied}
          stripeTestModeEnabled={stripeTestModeEnabled}
        />
      ) : null}
    </div>
  );
}

function adminActionForDecision(decisionKey: AdminDecisionKey): AdminReviewAction {
  if (decisionKey === "approveProof") return "APPROVE_PROOF";
  if (decisionKey === "approveVerification") return "APPROVE_VERIFICATION";
  if (decisionKey === "rejectVerification") return "REJECT_VERIFICATION";
  if (decisionKey === "requestMoreInfo") return "REQUEST_MORE_INFO";
  if (decisionKey === "rejectProof") return "REJECT_PROOF";
  return "HOLD_PAYOUT";
}

function getDecisionCaseUpdate(
  decisionKey: AdminDecisionKey,
  result?: ApplyAdminReviewActionResult,
): Partial<AdminReviewCase> {
  const reviewState = result?.updatedReviewCase?.review_state as AdminReviewCase["reviewState"] | undefined;
  const proofStatus = result?.updatedProof?.proof_status as AdminReviewCase["proofStatus"] | undefined;
  const settlementHeld =
    result?.updatedSettlement?.settlement_state === "ADMIN_REVIEW" ||
    result?.updatedSettlement?.settlement_state === "DISPUTE_HOLD";

  if (decisionKey === "approveVerification") {
    return {
      reviewState: reviewState ?? "APPROVED",
      filter: "Resolved",
      primaryAction: "View resolution",
      statusLabel: "Approved",
      idVerificationStatus: result?.updatedProfile?.id_verification_status ?? "VERIFIED",
    };
  }
  if (decisionKey === "rejectVerification") {
    return {
      reviewState: reviewState ?? "REJECTED",
      filter: "Resolved",
      primaryAction: "View resolution",
      statusLabel: "Rejected",
      idVerificationStatus: result?.updatedProfile?.id_verification_status ?? "REJECTED",
    };
  }
  if (decisionKey === "approveProof") {
    return {
      reviewState: reviewState ?? "APPROVED",
      proofStatus: proofStatus ?? "VERIFIED",
      filter: "Resolved",
      primaryAction: "View resolution",
      statusLabel: "Proof approved",
    };
  }
  if (decisionKey === "requestMoreInfo") {
    return {
      reviewState: reviewState ?? "NEEDS_MORE_INFO",
      proofStatus: proofStatus ?? "NEEDS_MORE_INFO",
      statusLabel: "Needs more info",
    };
  }
  if (decisionKey === "rejectProof") {
    return {
      reviewState: reviewState ?? "REJECTED",
      proofStatus: proofStatus ?? "REJECTED",
      payoutStatus: "HELD_FOR_REVIEW",
      filter: "Resolved",
      primaryAction: "View resolution",
      statusLabel: "Proof rejected",
    };
  }
  if (decisionKey === "holdPayout") {
    return {
      reviewState: reviewState ?? "UNDER_REVIEW",
      payoutStatus: settlementHeld ? "HELD_FOR_REVIEW" : "HELD_FOR_REVIEW",
      statusLabel: "Payout held",
    };
  }
  return { reviewState: reviewState ?? "UNDER_REVIEW", statusLabel: "Manual review" };
}

function ReviewCaseCard({ reviewCase, onOpen }: { reviewCase: AdminReviewCaseViewModel; onOpen: () => void }) {
  const aboveCap = reviewCase.fareAmountCents > reviewCase.bookingFareCapCents;
  const isTaxiPartnerQuoteCase = reviewCase.rideOption === "Taxi partner quote";
  const rideDateTimeLabel = reviewCase.rideDateTime.trim() || "Ride details unavailable";
  const routeLabel = reviewCase.route.trim() || "Ride details unavailable";
  const taxiPartnerQuoteLabel =
    typeof reviewCase.taxiPartnerQuoteAmountCents === "number"
      ? `Quote: ${formatAdminHkd(reviewCase.taxiPartnerQuoteAmountCents)}`
      : "Quote pending.";
  const hasTaxiPartnerFareCap = reviewCase.bookingFareCapCents > 0;
  const taxiPartnerFareCapLabel = formatAdminHkd(reviewCase.bookingFareCapCents);
  const disputeStatusLabel = reviewCase.disputeStatus === "None" ? "No dispute" : reviewCase.disputeStatus;

  return (
    <article className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="grid gap-4 min-[760px]:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={severityClass(reviewCase.severity)}>{reviewCase.severity}</Badge>
            <Badge className={reviewStateClass(reviewCase.reviewState)}>{reviewCase.reviewStateLabel}</Badge>
            {isTaxiPartnerQuoteCase ? (
              <Badge className={reviewStateClass(reviewCase.payoutStatus)}>{reviewCase.statusLabel}</Badge>
            ) : null}
            {aboveCap ? (
              <Badge className="bg-orange-400/10 text-orange-300 ring-orange-400/25">Above cap</Badge>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-black text-[var(--rp-text)]">{reviewCase.caseTypeLabel}</h2>
          <p className="mt-2 text-sm font-bold text-[var(--rp-muted-strong)]">{rideDateTimeLabel}</p>
          <p className="mt-1 text-sm font-black text-[var(--rp-text)]">{routeLabel}</p>
          {reviewCase.isMemberSafetyReportCase ? (
            <dl className="mt-4 grid gap-2 text-sm min-[560px]:grid-cols-2">
              <KeyValue label="Concern type" value={reviewCase.safetyConcernType ?? "Safety concern"} />
              <KeyValue label="Reported member" value={reviewCase.reportedMemberLabel ?? reviewCase.host} />
              <KeyValue label="Reporter" value={reviewCase.reporterLabel ?? "Reporter private"} />
              <KeyValue label="Created" value={reviewCase.createdTime} />
            </dl>
          ) : reviewCase.isIdVerificationCase ? (
            <dl className="mt-4 grid gap-2 text-sm min-[560px]:grid-cols-2">
              <KeyValue label="User" value={reviewCase.subjectUserLabel ?? reviewCase.host} />
              <KeyValue label="Email" value={reviewCase.subjectUserEmail ?? "Not available"} />
              <KeyValue label="Review status" value={reviewCase.reviewState.replaceAll("_", " ")} />
              <KeyValue label="Description" value="No identity document was collected." />
            </dl>
          ) : isTaxiPartnerQuoteCase ? (
            <dl className="mt-4 grid gap-2 text-sm min-[560px]:grid-cols-2">
              <KeyValue label="Ride option" value={reviewCase.rideOptionLabel} />
              <KeyValue label="Taxi partner" value={reviewCase.taxiPartnerName ?? "Taxi partner pending"} />
              <KeyValue label="Fare" value={taxiPartnerQuoteLabel} />
              {hasTaxiPartnerFareCap ? <KeyValue label="Fare cap" value={taxiPartnerFareCapLabel} /> : null}
              <KeyValue label="Payout status" value={reviewCase.payoutStatusLabel} />
              <KeyValue label="Dispute status" value={disputeStatusLabel} />
              <KeyValue label="Created" value={reviewCase.createdAtLabel} />
            </dl>
          ) : (
            <dl className="mt-4 grid gap-2 text-sm min-[560px]:grid-cols-2">
              <KeyValue label="Ride option" value={reviewCase.rideOption} />
              <KeyValue label="Host" value={reviewCase.host} />
              <KeyValue label="Reporter" value={reviewCase.reporter ?? "None"} />
              <KeyValue label="Created" value={reviewCase.createdTime} />
              <KeyValue label={reviewCase.fareLabel} value={formatAdminHkd(reviewCase.fareAmountCents)} />
              <KeyValue label="Booking fare cap" value={formatAdminHkd(reviewCase.bookingFareCapCents)} />
              <KeyValue label="Proof status" value={reviewCase.proofStatusLabel} />
              <KeyValue label="Payout status" value={reviewCase.payoutStatusLabel} />
            </dl>
          )}
        </div>
        <div className="grid gap-3 min-[760px]:w-52">
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Status</p>
            <p className="mt-2 text-sm font-black text-[var(--rp-primary)]">{reviewCase.statusLabel}</p>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_16px_34px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)]"
          >
            {reviewCase.primaryActionLabel} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
      <dt className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-black text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

function optionalAdminHkd(cents: number | null | undefined, fallback = "Not available") {
  return typeof cents === "number" ? formatAdminHkd(cents) : fallback;
}

function optionalCount(count: number | null | undefined, fallback = "Not available") {
  return typeof count === "number" ? String(count) : fallback;
}

function aboveCapDifferenceLabel(quoteCents: number | null | undefined, fareCapCents: number | null | undefined) {
  if (typeof quoteCents !== "number" || typeof fareCapCents !== "number" || fareCapCents <= 0 || quoteCents <= fareCapCents) {
    return "Not above cap";
  }

  return `${formatAdminHkd(quoteCents - fareCapCents)} above cap`;
}

function getDecisionHeaderTitle(reviewCase: AdminReviewCaseViewModel) {
  if (reviewCase.rideOption === "Taxi partner quote") return "Taxi partner case needs review";
  if (reviewCase.filter === "Payout holds" || reviewCase.payoutStatus === "HELD_FOR_REVIEW") {
    return "Payment / payout review needed";
  }
  return "Proof needs review";
}

function getPrimaryDecisionNeeded(reviewCase: AdminReviewCaseViewModel) {
  if (reviewCase.rideOption === "Taxi partner quote") {
    return "Decide whether payout can be marked ready, held, or denied in demo review.";
  }
  if (reviewCase.filter === "Payout holds" || reviewCase.payoutStatus === "HELD_FOR_REVIEW") {
    return "Decide whether payout should stay held while the case is reviewed.";
  }
  return "Decide whether the proof is approved, needs more info, or should be rejected.";
}

function getRecommendedNextAction(reviewCase: AdminReviewCaseViewModel) {
  if (reviewCase.rideOption === "Taxi partner quote") return "Review evidence";
  if (reviewCase.reviewState === "NEEDS_MORE_INFO") return "Review admin notes";
  return reviewCase.primaryActionLabel || "Review evidence";
}

function ReviewDecisionHeader({ reviewCase }: { reviewCase: AdminReviewCaseViewModel }) {
  return (
    <section className="rounded-[24px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_16%,transparent),transparent_40%),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Review decision needed</p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
            {getDecisionHeaderTitle(reviewCase)}
          </h3>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {getPrimaryDecisionNeeded(reviewCase)}
          </p>
        </div>
        <Badge className={severityClass(reviewCase.severity)}>{reviewCase.severityLabel}</Badge>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <KeyValue label="Case type" value={reviewCase.caseTypeLabel} />
        <KeyValue label="Review state" value={reviewCase.reviewStateLabel} />
        <KeyValue label="Ride option" value={reviewCase.rideOptionLabel} />
        <KeyValue label="Money state" value={reviewCase.payoutStatusLabel || reviewCase.statusLabel} />
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Primary action</span>
        <span className="text-sm font-black text-[var(--rp-text)]">{getRecommendedNextAction(reviewCase)}</span>
      </div>
    </section>
  );
}

function TaxiPartnerQuoteDetailSections({ reviewCase }: { reviewCase: AdminReviewCaseViewModel }) {
  const acceptance = reviewCase.taxiPartnerGuestAcceptance;
  const timeline = (reviewCase.taxiPartnerTimeline ?? []).filter((item) => item.title && (item.timestampLabel || item.detail));
  const acceptedGuestsLabel =
    typeof reviewCase.taxiPartnerAcceptedGuestCount === "number"
      ? `${reviewCase.taxiPartnerAcceptedGuestCount} guests accepted`
      : "Guest acceptance unavailable";
  const hasProofFile = Boolean(reviewCase.fileUrl);
  const acceptedCount = acceptance?.acceptedCount ?? reviewCase.taxiPartnerAcceptedGuestCount;
  const pendingCount = acceptance?.pendingCount;
  const declinedCount = acceptance?.declinedCount;

  return (
    <>
      <DetailSection icon={ClipboardCheck} title="What happened">
        <dl className="grid gap-2 sm:grid-cols-2">
          <KeyValue label="Route" value={reviewCase.routeLabel || "Ride details unavailable"} />
          <KeyValue label="Date/time" value={reviewCase.rideDateLabel || "Ride details unavailable"} />
          <KeyValue label="Taxi partner" value={reviewCase.taxiPartnerName ?? "Taxi partner pending"} />
          <KeyValue label="Taxi type" value={reviewCase.taxiPartnerTaxiType ? `${reviewCase.taxiPartnerTaxiType} taxi` : "Taxi type not specified"} />
          <KeyValue label="Quote" value={optionalAdminHkd(reviewCase.taxiPartnerQuoteAmountCents, "Quote unavailable")} />
          <KeyValue label="Guests" value={acceptedGuestsLabel} />
          <KeyValue label="Issue" value={reviewCase.disputeStatus !== "None" ? (reviewCase.disputeIssueType ?? "Reported issue") : "No dispute reported"} />
          <KeyValue label="Payout" value={reviewCase.payoutStatusLabel || "Payout pending"} />
        </dl>
      </DetailSection>

      <DetailSection icon={CreditCard} title="Current impact">
        <dl className="grid gap-2 sm:grid-cols-2">
          <KeyValue label="Guest payment state" value="Mock payment state" />
          <KeyValue label="Payout state" value={reviewCase.payoutStatusLabel || "Payout pending"} />
          <KeyValue label="Dispute window" value={reviewCase.disputeStatus === "None" ? "Open" : reviewCase.disputeStatus} />
          <KeyValue label="Admin review" value={reviewCase.reviewStateLabel} />
        </dl>
        <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          No live payment or payout is enabled.
        </p>
      </DetailSection>

      <DetailSection icon={ReceiptText} title="Selected quote">
        <dl className="grid gap-2 sm:grid-cols-2">
          <KeyValue label="Taxi partner quote" value={optionalAdminHkd(reviewCase.taxiPartnerQuoteAmountCents, "Quote pending.")} />
          <KeyValue label="Fare cap" value={reviewCase.bookingFareCapCents > 0 ? formatAdminHkd(reviewCase.bookingFareCapCents) : "Fare cap unavailable"} />
          <KeyValue label="Above cap" value={aboveCapDifferenceLabel(reviewCase.taxiPartnerQuoteAmountCents, reviewCase.bookingFareCapCents)} />
          <KeyValue label="Quote expiry" value="Quote expiry unavailable" />
          <KeyValue label="Taxi partner" value={reviewCase.taxiPartnerName ?? "Taxi partner pending"} />
          <KeyValue label="Fare share" value={typeof reviewCase.taxiPartnerFareSharePerGuestCents === "number" ? `${formatAdminHkd(reviewCase.taxiPartnerFareSharePerGuestCents)} / guest` : "Not available"} />
          <KeyValue label="Platform fee" value={typeof reviewCase.taxiPartnerPlatformFeePerGuestCents === "number" ? `${formatAdminHkd(reviewCase.taxiPartnerPlatformFeePerGuestCents)} / guest` : "Not available"} />
          <KeyValue label="Guest charge" value={optionalAdminHkd(reviewCase.taxiPartnerGuestChargeCents)} />
          <KeyValue label="Taxi partner payout" value={optionalAdminHkd(reviewCase.taxiPartnerDriverPayoutCents)} />
        </dl>
        <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          No real payout is sent in beta.
        </p>
      </DetailSection>

      <DetailSection icon={CheckCircle2} title="Guest acceptance">
        <dl className="grid gap-2 sm:grid-cols-3">
          <KeyValue label="Accepted" value={optionalCount(acceptedCount, "Guest acceptance unavailable")} />
          <KeyValue label="Pending" value={optionalCount(pendingCount, "Guest acceptance unavailable")} />
          <KeyValue label="Declined" value={optionalCount(declinedCount, "Guest acceptance unavailable")} />
          {(reviewCase.taxiPartnerQuoteAmountCents ?? 0) > reviewCase.bookingFareCapCents ? (
            <KeyValue label="Higher quote accepted" value="Needs review" />
          ) : null}
        </dl>
        <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Guest acceptance is summarized by count only. Private guest-level details are not shown in this admin queue view.
        </p>
      </DetailSection>

      <DetailSection icon={ShieldAlert} title="Reported issue">
        {reviewCase.disputeStatus !== "None" ? (
          <>
            <dl className="grid gap-2 sm:grid-cols-2">
              <KeyValue label="Issue type" value={reviewCase.disputeIssueType ?? "Dispute under review"} />
              <KeyValue label="Reporter" value={reviewCase.reporter ?? "Reporter unavailable"} />
              <KeyValue label="Submitted" value={reviewCase.createdAtLabel} />
              <KeyValue label="Attached evidence" value={reviewCase.evidenceLabel ?? "Evidence placeholder"} />
            </dl>
            <div className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Issue note</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {reviewCase.disputeNote ?? "Dispute under review."}
              </p>
            </div>
          </>
        ) : (
          <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            No dispute reported.
          </p>
        )}
      </DetailSection>

      <DetailSection icon={FileSearch} title="Evidence timeline">
        {timeline.length ? (
          <div className="grid gap-3">
            {timeline.map((item) => (
              <article key={item.id} className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                <p className="text-sm font-black text-[var(--rp-text)]">{item.title}</p>
                <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">{item.timestampLabel}</p>
                {item.detail ? (
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{item.detail}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            No timeline events available yet.
          </p>
        )}
      </DetailSection>

      <DetailSection icon={CreditCard} title="Payment events">
        <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          No payment events yet.
        </p>
      </DetailSection>

      <DetailSection icon={FileSearch} title="Key evidence preview">
        {hasProofFile ? (
          <ProofPreviewButton
            fileUrlOrStoragePath={reviewCase.fileUrl}
            proofType={reviewCase.proofType}
            fileName={reviewCase.evidenceLabel ?? undefined}
          />
        ) : (
          <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            No proof file available.
          </p>
        )}
      </DetailSection>
    </>
  );
}

function TaxiPartnerAdminNotes({
  value,
  onChange,
  selectedAction,
  actionMessage,
  actionError,
  onAction,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  selectedAction: TaxiPartnerMockActionKey | null;
  actionMessage: string | null;
  actionError: string | null;
  onAction: (actionKey: TaxiPartnerMockActionKey) => void;
}) {
  const selectedConfig = taxiPartnerMockActionLabels.find((item) => item.key === selectedAction);
  const notesMissing = Boolean(selectedConfig?.requiresNotes && !value.trim());
  const actionGroups: Array<{ title: string; keys: TaxiPartnerMockActionKey[] }> = [
    { title: "Primary / resolution", keys: ["releasePayoutMock", "resolveDispute"] },
    { title: "Review", keys: ["requestMoreInfo", "holdPayout"] },
    { title: "Negative / caution", keys: ["denyPayoutMock"] },
  ];

  return (
    <DetailSection icon={LockKeyhole} title="Admin actions">
      <div className="mb-4 grid gap-2">
        {actionGroups.map((group) => (
          <div key={group.title} className="grid gap-2">
            <p className="px-1 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">{group.title}</p>
            {group.keys.map((key) => {
              const item = taxiPartnerMockActionLabels.find((candidate) => candidate.key === key);
              if (!item) return null;
              const active = selectedAction === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onAction(item.key)}
                  className={cn(
                    "min-h-11 rounded-[14px] border px-3 text-left text-sm font-black transition",
                    active
                      ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                      : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <label className="grid gap-2 text-sm font-black text-[var(--rp-muted-strong)]">
        Admin notes
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-32 rounded-[16px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
          placeholder="Add notes for review and audit trail."
        />
      </label>
      <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted)]">
        Notes should explain the decision clearly. Do not include unnecessary private information.
      </p>
      {notesMissing ? (
        <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
          Admin notes are required for this action.
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-danger-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-danger)]">
          {actionError}
        </p>
      ) : null}
      {actionMessage ? (
        <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-success-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-badge-success-text)]">
          {actionMessage}
        </p>
      ) : null}
      <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
        These controls update mock state only. No real payout is sent and no real money moves.
        TODO: Persist Taxi Partner Quote admin actions in later Supabase slice.
        TODO: Taxi Partner Quote admin action notifications handled in TAXI-6F.
      </p>
    </DetailSection>
  );
}

const paymentSimulationActionCopy: Record<AdminPaymentSimulationActionKey, { title: string; body: string; confirm: string }> = {
  captureTestPayment: {
    title: "Capture test payment?",
    body: "This captures the Stripe test-mode authorization. No live money moves.",
    confirm: "Capture test payment",
  },
  cancelTestAuthorization: {
    title: "Cancel test authorization?",
    body: "This cancels the test authorization. No live money moves.",
    confirm: "Cancel test authorization",
  },
  simulateRefund: {
    title: "Simulate refund?",
    body: "This records a demo refund state. Do not use this for live refunds.",
    confirm: "Simulate refund",
  },
  holdPayment: {
    title: "Hold payment?",
    body: "Payment and payout stay held while RidePod reviews this demo case.",
    confirm: "Hold payment",
  },
  markPayoutReady: {
    title: "Mark payout ready?",
    body: "This marks the payout ready in demo mode. No payout is sent.",
    confirm: "Mark payout ready",
  },
};

function paymentStatusClass(status: string) {
  if (["TEST_CAPTURED", "CLEARED_FOR_PAYOUT"].includes(status)) {
    return "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]";
  }
  if (["TEST_CANCELED", "TEST_REFUND_SIMULATED"].includes(status)) {
    return "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]";
  }
  if (["TEST_CAPTURE_FAILED", "TEST_CANCEL_FAILED", "HELD_FOR_REVIEW"].includes(status)) {
    return "bg-[var(--rp-danger-bg)] text-[var(--rp-danger)] ring-[var(--rp-border)]";
  }
  return "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-primary)] ring-[var(--rp-border)]";
}

function adminPaymentStateLabel(status: AdminPaymentSimulationStatus) {
  if (status === "TEST_PAYMENT_INTENT_CREATED") return "Test payment created";
  if (status === "TEST_REQUIRES_CAPTURE") return "Requires capture";
  if (status === "TEST_CAPTURED") return "Captured in test mode";
  if (status === "TEST_CANCELED") return "Canceled in test mode";
  if (status === "TEST_REFUND_SIMULATED") return "Refund simulated";
  if (status === "TEST_CAPTURE_FAILED") return "Capture failed";
  if (status === "TEST_CANCEL_FAILED") return "Cancel failed";
  if (status === "HELD_FOR_REVIEW") return "Payment held";
  return "Cleared for payout";
}

function stripeStatusToPaymentState(status: string): AdminPaymentSimulationStatus {
  if (status === "requires_capture") return "TEST_REQUIRES_CAPTURE";
  if (status === "succeeded") return "TEST_CAPTURED";
  if (status === "canceled") return "TEST_CANCELED";
  return "TEST_PAYMENT_INTENT_CREATED";
}

function paymentEventLabel(eventType: string) {
  if (eventType === "TEST_PAYMENT_INTENT_CREATED") return "Test payment created";
  if (eventType === "TEST_PAYMENT_CONFIRMED") return "Test payment confirmed";
  if (eventType === "TEST_REQUIRES_CAPTURE") return "Test authorization ready for capture";
  if (eventType === "TEST_CAPTURED") return "Test payment captured";
  if (eventType === "TEST_CANCELED") return "Test authorization canceled";
  if (eventType === "TEST_REFUND_SIMULATED") return "Refund simulated";
  if (eventType === "PAYMENT_HELD_FOR_REVIEW") return "Payment held for review";
  if (eventType === "PAYOUT_MARKED_READY_DEMO") return "Payout marked ready in demo";
  if (eventType === "PAYOUT_DENIED_DEMO") return "Payout denied in demo";
  if (eventType === "PAYMENT_ACTION_FAILED") return "Payment action failed";
  return "Payment event";
}

type PaymentAdminApiResponse =
  | {
      ok: true;
      paymentIntentId: string;
      status: string;
    }
  | {
      ok: false;
      message: string;
    };

function TaxiPartnerPaymentSimulation({
  reviewCase,
  stripeTestModeEnabled,
  onTaxiPartnerMockActionApplied,
}: {
  reviewCase: AdminReviewCaseViewModel;
  stripeTestModeEnabled: boolean;
  onTaxiPartnerMockActionApplied: (
    caseId: string,
    actionKey: TaxiPartnerMockActionKey,
    adminNotes: string,
  ) => Promise<{ ok: boolean; message: string }>;
}) {
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [stripeStatus, setStripeStatus] = useState("requires_capture");
  const [paymentState, setPaymentState] = useState<AdminPaymentSimulationStatus>("TEST_REQUIRES_CAPTURE");
  const [paymentReviewState, setPaymentReviewState] = useState<"OPEN" | "HELD_FOR_REVIEW" | "CLEARED">("OPEN");
  const [paymentEvents, setPaymentEvents] = useState<AdminPaymentHistoryEvent[]>([]);
  const [confirmationAction, setConfirmationAction] = useState<AdminPaymentSimulationActionKey | null>(null);
  const [isApplyingPaymentAction, setIsApplyingPaymentAction] = useState(false);
  const [paymentActionMessage, setPaymentActionMessage] = useState<string | null>(null);
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null);
  const [evidencePackage, setEvidencePackage] = useState<RidePodEvidencePackage | null>(null);
  const [evidenceCopyMessage, setEvidenceCopyMessage] = useState<string | null>(null);
  const guestPaymentAmountCents = reviewCase.taxiPartnerGuestChargeCents ?? reviewCase.maxChargePerGuestCents;
  const paymentPurpose = "TAXI_PARTNER_QUOTE_ACCEPTANCE";
  const disputeWindowStatus = reviewCase.disputeStatus === "None" ? "Open / no issue reported" : reviewCase.disputeStatus;
  const hasPaymentIntent = paymentIntentId.trim().startsWith("pi_");

  const generateEvidencePackage = () => {
    const generated = buildRidePodEvidencePackageFromAdminReviewCase(reviewCase, {
      packageType: reviewCase.disputeStatus !== "None" ? "TAXI_PARTNER_QUOTE_DISPUTE" : "ADMIN_PAYOUT_REVIEW",
      viewerRole: "admin",
      paymentIntentId: paymentIntentId.trim() || null,
      paymentEvents: paymentEvents.map((event) => ({
        eventType: event.eventType,
        timestamp: event.createdAt,
        amountCents: event.amountCents,
        paymentProvider: "STRIPE_TEST",
        paymentIntentId: paymentIntentId.trim() || null,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        actorRole: event.actor,
      })),
    });
    setEvidencePackage(generated);
    setEvidenceCopyMessage(null);
  };

  const copyEvidenceSummary = async () => {
    if (!evidencePackage) return;
    try {
      await navigator.clipboard.writeText(evidencePackage.recommendedAdminNotes);
      setEvidenceCopyMessage("Summary copied.");
    } catch {
      setEvidenceCopyMessage("Summary text is ready to copy.");
    }
  };

  const appendPaymentEvent = async (
    eventType: AdminPaymentHistoryEvent["eventType"],
    newStatus: string,
    previousStatus: string | null = paymentState,
    persistEvent = true,
  ) => {
    const localEvent: AdminPaymentHistoryEvent = {
      id: `payment-event-${Date.now()}-${eventType}`,
      createdAt: new Date().toISOString(),
      eventType,
      actor: "Admin",
      amountCents: guestPaymentAmountCents,
      previousStatus,
      newStatus,
    };
    setPaymentEvents((current) => [localEvent, ...current]);

    if (!persistEvent) return;

    try {
      await fetch("/api/payments/record-test-payment-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideInstanceId: reviewCase.id,
          actorRole: "admin",
          eventType,
          stripePaymentIntentId: paymentIntentId.trim() || null,
          amountCents: guestPaymentAmountCents,
          currency: "HKD",
          previousStatus,
          newStatus,
          eventPayload: {
            adminReason: "Admin payment simulation",
            demoMode: true,
            disputeWindowState: disputeWindowStatus,
          },
        }),
      });
    } catch {
      // Audit logging should not block the demo payment flow.
    }
  };

  const callPaymentApi = async (endpoint: string): Promise<PaymentAdminApiResponse> => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: paymentIntentId.trim(),
        rideInstanceId: reviewCase.id,
        reason: "Admin payment simulation",
      }),
    });
    return (await response.json()) as PaymentAdminApiResponse;
  };

  const applyPaymentAction = async () => {
    if (!confirmationAction) return;

    setIsApplyingPaymentAction(true);
    setPaymentActionError(null);
    setPaymentActionMessage(null);

    try {
      if (confirmationAction === "captureTestPayment") {
        if (!stripeTestModeEnabled) {
          setPaymentActionError("Stripe test mode is not enabled.");
          return;
        }
        if (hasPaymentIntent && stripeTestModeEnabled) {
          const result = await callPaymentApi("/api/payments/capture-test-payment-intent");
          if (!result.ok) {
            setPaymentState("TEST_CAPTURE_FAILED");
            setPaymentActionError(result.message || "Couldn't capture test payment.");
            return;
          }
          setStripeStatus(result.status);
          setPaymentState(stripeStatusToPaymentState(result.status));
        } else {
          setStripeStatus("succeeded");
          setPaymentState("TEST_CAPTURED");
        }
        setPaymentActionMessage("Test payment captured.");
        void appendPaymentEvent("TEST_CAPTURED", "TEST_CAPTURED", paymentState, !(hasPaymentIntent && stripeTestModeEnabled));
        return;
      }

      if (confirmationAction === "cancelTestAuthorization") {
        if (!stripeTestModeEnabled) {
          setPaymentActionError("Stripe test mode is not enabled.");
          return;
        }
        if (hasPaymentIntent && stripeTestModeEnabled) {
          const result = await callPaymentApi("/api/payments/cancel-test-payment-intent");
          if (!result.ok) {
            setPaymentState("TEST_CANCEL_FAILED");
            setPaymentActionError(result.message || "Couldn't cancel test authorization.");
            return;
          }
          setStripeStatus(result.status);
          setPaymentState(stripeStatusToPaymentState(result.status));
        } else {
          setStripeStatus("canceled");
          setPaymentState("TEST_CANCELED");
        }
        setPaymentActionMessage("Test authorization canceled.");
        void appendPaymentEvent("TEST_CANCELED", "TEST_CANCELED", paymentState, !(hasPaymentIntent && stripeTestModeEnabled));
        return;
      }

      if (confirmationAction === "simulateRefund") {
        setPaymentState("TEST_REFUND_SIMULATED");
        setPaymentActionMessage("Refund simulated.");
        void appendPaymentEvent("TEST_REFUND_SIMULATED", "TEST_REFUND_SIMULATED");
        return;
      }

      if (confirmationAction === "holdPayment") {
        setPaymentReviewState("HELD_FOR_REVIEW");
        setPaymentState("HELD_FOR_REVIEW");
        await onTaxiPartnerMockActionApplied(reviewCase.id, "holdPayout", "Payment held for review in demo mode.");
        setPaymentActionMessage("Payment held for review.");
        void appendPaymentEvent("PAYMENT_HELD_FOR_REVIEW", "HELD_FOR_REVIEW");
        return;
      }

      setPaymentReviewState("CLEARED");
      setPaymentState("CLEARED_FOR_PAYOUT");
      await onTaxiPartnerMockActionApplied(reviewCase.id, "releasePayoutMock", "Payout marked ready from payment simulation.");
      setPaymentActionMessage("Payout marked ready in demo mode.");
      void appendPaymentEvent("PAYOUT_MARKED_READY_DEMO", "CLEARED_FOR_PAYOUT");
    } finally {
      setIsApplyingPaymentAction(false);
      setConfirmationAction(null);
    }
  };

  return (
    <DetailSection icon={CreditCard} title="Payment simulation">
      <div className="grid gap-3">
        <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
          Admin payment simulation is demo-only. Test mode only. No live money moves.
        </p>
        {!stripeTestModeEnabled ? (
          <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
            Stripe test mode is not enabled. Stripe capture/cancel calls are disabled; mock state controls remain available.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Badge className={paymentStatusClass(paymentState)}>{adminPaymentStateLabel(paymentState)}</Badge>
          <Badge className={paymentStatusClass(reviewCase.payoutStatus)}>{reviewCase.payoutStatusLabel}</Badge>
          <Badge className="bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]">
            {paymentReviewState === "CLEARED" ? "Review cleared" : paymentReviewState === "HELD_FOR_REVIEW" ? "Payment held" : "Manual review"}
          </Badge>
        </div>
        <dl className="grid gap-2">
          <KeyValue label="Ride instance" value={reviewCase.id} />
          <KeyValue label="Payment purpose" value={paymentPurpose} />
          <KeyValue label="Guest payment amount" value={formatAdminHkd(guestPaymentAmountCents)} />
          <KeyValue label="Stripe test status" value={stripeStatus.replaceAll("_", " ")} />
          <KeyValue label="RidePod payment state" value={adminPaymentStateLabel(paymentState)} />
          <KeyValue label="Dispute window status" value={disputeWindowStatus} />
          <KeyValue label="Payout status" value={reviewCase.payoutStatusLabel} />
          <KeyValue label="Admin review state" value={reviewCase.reviewStateLabel} />
        </dl>
        <label className="grid gap-2 text-sm font-black text-[var(--rp-muted-strong)]">
          Test PaymentIntent ID
          <input
            value={paymentIntentId}
            onChange={(event) => setPaymentIntentId(event.target.value)}
            className="min-h-11 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-bold text-[var(--rp-text)]"
            placeholder="pi_..."
          />
          <span className="text-xs font-bold text-[var(--rp-muted)]">
            If no test PaymentIntent ID is available, actions update mock state only.
          </span>
        </label>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setConfirmationAction("captureTestPayment")}
            disabled={!stripeTestModeEnabled}
            className="min-h-11 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-left text-sm font-black text-[var(--rp-text)] disabled:opacity-55"
          >
            Capture test payment
          </button>
          <button
            type="button"
            onClick={() => setConfirmationAction("cancelTestAuthorization")}
            disabled={!stripeTestModeEnabled}
            className="min-h-11 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-left text-sm font-black text-[var(--rp-text)] disabled:opacity-55"
          >
            Cancel test authorization
          </button>
          <button
            type="button"
            onClick={() => setConfirmationAction("simulateRefund")}
            className="min-h-11 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-left text-sm font-black text-[var(--rp-text)]"
          >
            Simulate refund
          </button>
          <button
            type="button"
            onClick={() => setConfirmationAction("holdPayment")}
            className="min-h-11 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-left text-sm font-black text-[var(--rp-text)]"
          >
            Hold payment
          </button>
          <button
            type="button"
            onClick={() => setConfirmationAction("markPayoutReady")}
            className="min-h-11 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-left text-sm font-black text-[var(--rp-text)]"
          >
            Mark payout ready
          </button>
        </div>
        {reviewCase.disputeStatus === "None" ? (
          <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
            Dispute window is still open. Capturing now is for test/demo only.
          </p>
        ) : (
          <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
            A dispute exists. Prefer hold, cancel, or refund simulation until manual review clears the case.
          </p>
        )}
        {paymentActionError ? (
          <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-danger-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-danger)]">
            {paymentActionError}
          </p>
        ) : null}
        {paymentActionMessage ? (
          <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-success-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-badge-success-text)]">
            {paymentActionMessage}
          </p>
        ) : null}
        <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          Refund simulation is mock-only in PAY-5. Payment events are recorded when server-side persistence is available.
        </p>
        <div className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <h4 className="text-sm font-black text-[var(--rp-text)]">Payment event history</h4>
          {paymentEvents.length ? (
            <div className="mt-3 grid gap-2">
              {paymentEvents.map((event) => (
                <article key={event.id} className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-black text-[var(--rp-text)]">{paymentEventLabel(event.eventType)}</p>
                    <p className="text-xs font-bold text-[var(--rp-muted)]">
                      {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(event.createdAt))}
                    </p>
                  </div>
                  <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                    <KeyValue label="Amount" value={event.amountCents ? formatAdminHkd(event.amountCents) : "Not available"} />
                    <KeyValue
                      label="Status change"
                      value={event.previousStatus ? `${event.previousStatus} -> ${event.newStatus}` : event.newStatus}
                    />
                    <KeyValue label="Actor" value={event.actor} />
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">No payment events yet.</p>
          )}
          <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted)]">
            Event payloads are sanitized. Client secrets, secret keys, and card data are not shown here.
          </p>
        </div>
        <div className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-[var(--rp-text)]">Evidence package</h4>
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted)]">
                Internal payment dispute review summary. No Stripe submission happens here.
              </p>
            </div>
            <button
              type="button"
              onClick={generateEvidencePackage}
              className="min-h-10 rounded-[14px] bg-[var(--rp-gradient-primary)] px-3 text-xs font-black text-[var(--rp-primary-text)]"
            >
              Generate evidence package
            </button>
          </div>
          {evidencePackage ? (
            <div className="mt-3 grid gap-3">
              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                <KeyValue label="Package type" value={evidencePackage.packageType.replaceAll("_", " ")} />
                <KeyValue
                  label="Generated"
                  value={new Intl.DateTimeFormat("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(evidencePackage.generatedAt))}
                />
                <KeyValue
                  label="Checklist"
                  value={`${evidencePackage.evidenceChecklist.filter((item) => item.present).length} / ${evidencePackage.evidenceChecklist.length} present`}
                />
                <KeyValue label="Missing evidence" value={String(evidencePackage.missingEvidence.length)} />
              </dl>
              <div className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Recommended admin notes</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  {evidencePackage.recommendedAdminNotes}
                </p>
                <button
                  type="button"
                  onClick={copyEvidenceSummary}
                  className="mt-3 min-h-10 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-text)]"
                >
                  Copy summary
                </button>
                {evidenceCopyMessage ? (
                  <p className="mt-2 text-xs font-bold text-[var(--rp-success)]">{evidenceCopyMessage}</p>
                ) : null}
              </div>
              <div className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Timeline preview</p>
                {evidencePackage.timeline.length ? (
                  <div className="mt-2 grid gap-2">
                    {evidencePackage.timeline.slice(0, 4).map((item, index) => (
                      <p key={`${item.title}-${index}`} className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                        {item.title} - {item.description}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-bold text-[var(--rp-muted-strong)]">No timeline events available.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Generate an internal evidence package before payment dispute review.
            </p>
          )}
        </div>
      </div>
      {confirmationAction ? (
        <AdminPaymentSimulationConfirmation
          action={confirmationAction}
          disabled={isApplyingPaymentAction}
          onCancel={() => setConfirmationAction(null)}
          onConfirm={applyPaymentAction}
        />
      ) : null}
    </DetailSection>
  );
}

function ReviewCaseModal({
  reviewCase,
  onClose,
  onDecisionApplied,
  onTaxiPartnerMockActionApplied,
  stripeTestModeEnabled,
}: {
  reviewCase: AdminReviewCaseViewModel;
  onClose: () => void;
  onDecisionApplied: (
    caseId: string,
    decisionKey: AdminDecisionKey,
    adminNotes: string,
  ) => Promise<{ ok: boolean; message: string }>;
  onTaxiPartnerMockActionApplied: (
    caseId: string,
    actionKey: TaxiPartnerMockActionKey,
    adminNotes: string,
  ) => Promise<{ ok: boolean; message: string }>;
  stripeTestModeEnabled: boolean;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [decision, setDecision] = useState<AdminDecisionKey | null>(null);
  const [confirmationDecision, setConfirmationDecision] = useState<AdminDecisionKey | null>(null);
  const [taxiPartnerAction, setTaxiPartnerAction] = useState<TaxiPartnerMockActionKey | null>(null);
  const [taxiPartnerConfirmationAction, setTaxiPartnerConfirmationAction] = useState<TaxiPartnerConfirmableActionKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const activeDecisionLabels = reviewCase.isIdVerificationCase
    ? [
        { key: "approveVerification" as const, label: "Approve verification", requiresNotes: false },
        { key: "rejectVerification" as const, label: "Reject verification", requiresNotes: true },
        { key: "requestMoreInfo" as const, label: "Request more info", requiresNotes: true },
      ]
    : adminDecisionLabels;
  const selectedDecision = activeDecisionLabels.find((item) => item.key === decision);
  const notesRequired = Boolean(selectedDecision?.requiresNotes);
  const notesMissing = notesRequired && !adminNotes.trim();
  const isTaxiPartnerQuoteCase = reviewCase.rideOption === "Taxi partner quote";

  const applyTaxiPartnerAction = async (nextAction: TaxiPartnerMockActionKey) => {
    const config = taxiPartnerMockActionLabels.find((item) => item.key === nextAction);
    setTaxiPartnerAction(nextAction);
    setActionMessage(null);
    setActionError(null);

    if (config?.requiresNotes && !adminNotes.trim()) return;

    setTaxiPartnerConfirmationAction(nextAction);
  };

  const applyDecision = (nextDecision: AdminDecisionKey) => {
    const config = adminDecisionLabels.find((item) => item.key === nextDecision);
    if (config?.requiresNotes && !adminNotes.trim()) {
      setDecision(nextDecision);
      setActionMessage(null);
      setActionError(null);
      return;
    }
    setDecision(nextDecision);
    setActionMessage(null);
    setActionError(null);
    setConfirmationDecision(nextDecision);
  };

  const confirmDecision = async () => {
    if (!confirmationDecision) return;
    setIsSubmitting(true);
    setActionError(null);

    const result = await onDecisionApplied(reviewCase.id, confirmationDecision, adminNotes);
    setIsSubmitting(false);
    setConfirmationDecision(null);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    setActionMessage(result.message);
  };

  const confirmTaxiPartnerAction = async () => {
    if (!taxiPartnerConfirmationAction) return;
    setIsSubmitting(true);
    setActionError(null);

    const result = await onTaxiPartnerMockActionApplied(reviewCase.id, taxiPartnerConfirmationAction, adminNotes);
    setIsSubmitting(false);
    setTaxiPartnerConfirmationAction(null);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    setActionMessage(result.message);
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[rgba(3,7,18,0.78)] px-4 py-6 backdrop-blur-sm">
      <section className="mx-auto grid w-full max-w-5xl gap-4 rounded-[30px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-4 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Review detail</p>
            <h2 className="mt-2 text-2xl font-black">{reviewCase.caseTypeLabel}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">{reviewCase.rideDateTime}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review case"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ReviewDecisionHeader reviewCase={reviewCase} />

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {reviewCase.isMemberSafetyReportCase ? (
              <DetailSection icon={ShieldAlert} title="Member safety concern">
                <dl className="grid gap-2 sm:grid-cols-2">
                  <KeyValue label="Concern type" value={reviewCase.safetyConcernType ?? "Safety concern"} />
                  <KeyValue label="Reported member" value={reviewCase.reportedMemberLabel ?? reviewCase.host} />
                  <KeyValue label="Reporter" value={reviewCase.reporterLabel ?? "Reporter private"} />
                  <KeyValue label="Review status" value={reviewCase.reviewState.replaceAll("_", " ")} />
                  <KeyValue label="Created" value={reviewCase.createdTime} />
                  <KeyValue label="Evidence" value="Evidence upload coming later." />
                </dl>
                <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  {reviewCase.safetyReportDescription ?? "Member safety concern submitted for manual review."}
                </p>
                <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-sm font-bold leading-6 text-[var(--rp-warning)]">
                  This is a manual review placeholder. Report details are private and should not be shown to other pod members.
                </p>
              </DetailSection>
            ) : reviewCase.isIdVerificationCase ? (
              <DetailSection icon={IdCard} title="ID verification request">
                <dl className="grid gap-2 sm:grid-cols-2">
                  <KeyValue label="User" value={reviewCase.subjectUserLabel ?? reviewCase.host} />
                  <KeyValue label="Email" value={reviewCase.subjectUserEmail ?? "Not available"} />
                  <KeyValue label="Review status" value={reviewCase.reviewState.replaceAll("_", " ")} />
                  <KeyValue label="ID verification status" value={(reviewCase.idVerificationStatus ?? "NOT_REQUESTED").replaceAll("_", " ")} />
                  <KeyValue label="Created" value={reviewCase.createdTime} />
                  <KeyValue label="Evidence" value="No identity document was collected." />
                </dl>
                <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  {reviewCase.caseDescription ?? "User requested manual ID verification review. No identity document was collected."}
                </p>
              </DetailSection>
            ) : isTaxiPartnerQuoteCase ? (
              <TaxiPartnerQuoteDetailSections reviewCase={reviewCase} />
            ) : (
              <>
            <DetailSection icon={ClipboardCheck} title="Ride instance summary">
              <dl className="grid gap-2 sm:grid-cols-2">
                <KeyValue label="Ride" value={reviewCase.rideDateTime} />
                <KeyValue label="Route" value={reviewCase.route} />
                <KeyValue label="Ride option" value={reviewCase.rideOption} />
                <KeyValue label="Host" value={reviewCase.host} />
                <KeyValue label="Guests locked" value={reviewCase.guestsLocked} />
                <KeyValue label="Booking fare cap" value={formatAdminHkd(reviewCase.bookingFareCapCents)} />
                <KeyValue label="Max charge per guest" value={formatAdminHkd(reviewCase.maxChargePerGuestCents)} />
              </dl>
            </DetailSection>

            <DetailSection icon={ReceiptText} title="Proof">
              <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                <div className="grid min-h-40 place-items-center rounded-[18px] border border-dashed border-[var(--rp-primary)] bg-[var(--rp-card-soft)] p-4">
                  <div>
                    <FileSearch className="mx-auto h-8 w-8 text-[var(--rp-primary)]" />
                    <p className="mt-2 text-center text-sm font-black text-[var(--rp-text)]">Uploaded file preview</p>
                    <ProofPreviewButton
                      className="mt-3"
                      fileUrlOrStoragePath={reviewCase.fileUrl}
                      proofType={reviewCase.proofType}
                      fileName={reviewCase.evidenceLabel}
                    />
                  </div>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <KeyValue label="Proof type" value={reviewCase.proofType} />
                  <KeyValue label="Submitted amount" value={formatAdminHkd(reviewCase.fareAmountCents)} />
                  <KeyValue label="Submitted by" value={reviewCase.submittedBy} />
                  <KeyValue label="Submitted time" value={reviewCase.submittedAt} />
                  <KeyValue label="Certification accepted" value={reviewCase.certificationAccepted ? "Yes" : "No"} />
                  <KeyValue label="Proof status" value={reviewCase.proofStatus.replaceAll("_", " ")} />
                </dl>
              </div>
            </DetailSection>

            <DetailSection icon={FileSearch} title="Evidence timeline">
              {reviewCase.evidenceTimeline?.length ? (
                <div className="grid gap-3">
                  {reviewCase.evidenceTimeline.map((timelineItem) => (
                    <article
                      key={timelineItem.id}
                      className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Badge
                            className={cn(
                              "mb-2 ring-[var(--rp-border)]",
                              timelineItem.isCurrent
                                ? "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)]"
                                : "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)]",
                            )}
                          >
                            {timelineItem.versionLabel}
                          </Badge>
                          <h4 className="text-sm font-black text-[var(--rp-text)]">{timelineItem.title}</h4>
                          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                            {timelineItem.proofTypeLabel} - {timelineItem.statusLabel} - {timelineItem.amountLabel}
                          </p>
                        </div>
                        <ProofPreviewButton
                          fileUrlOrStoragePath={timelineItem.fileUrl}
                          proofType={
                            timelineItem.proofType === "quote screenshot" ||
                            timelineItem.proofType === "final receipt" ||
                            timelineItem.proofType === "meter proof"
                              ? timelineItem.proofType
                              : undefined
                          }
                          fileName={timelineItem.fileName ?? undefined}
                        />
                      </div>
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <KeyValue label="Submitted" value={timelineItem.submittedAtLabel} />
                        <KeyValue label="Reviewed" value={timelineItem.reviewedAtLabel} />
                        <KeyValue label="Actor" value={timelineItem.actorLabel} />
                        <KeyValue label="Status" value={timelineItem.statusLabel} />
                      </dl>
                      {timelineItem.adminNotes ? (
                        <div className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
                            Admin notes
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                            {timelineItem.adminNotes}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Evidence history is built from available proof rows. Full audit event timeline will be added later.
                </p>
              )}
            </DetailSection>

            <DetailSection icon={AlertTriangle} title="Comparison">
              <dl className="grid gap-2 sm:grid-cols-2">
                <KeyValue label="RidePod estimate / baseline" value={formatAdminHkd(reviewCase.ridepodEstimateCents)} />
                <KeyValue label="Booking fare cap" value={formatAdminHkd(reviewCase.bookingFareCapCents)} />
                <KeyValue label="Uploaded quote amount" value={reviewCase.uploadedQuoteCents ? formatAdminHkd(reviewCase.uploadedQuoteCents) : "None"} />
                <KeyValue label="Final receipt / meter proof amount" value={reviewCase.finalProofCents ? formatAdminHkd(reviewCase.finalProofCents) : "None"} />
                <KeyValue label="Difference from cap" value={differenceLabel(reviewCase.fareAmountCents, reviewCase.bookingFareCapCents)} />
                <KeyValue label="Difference from quote" value={differenceLabel(reviewCase.finalProofCents, reviewCase.uploadedQuoteCents)} />
                <KeyValue label="Dispute raised" value={reviewCase.disputeStatus === "None" ? "No" : "Yes"} />
              </dl>
            </DetailSection>

            {reviewCase.disputeStatus !== "None" ? (
              <DetailSection icon={ShieldAlert} title="Dispute">
                <dl className="grid gap-2 sm:grid-cols-2">
                  <KeyValue label="Issue type" value={reviewCase.disputeIssueType ?? "Other"} />
                  <KeyValue label="Reporter" value={reviewCase.reporter ?? "Guest"} />
                  <KeyValue label="Submitted time" value={reviewCase.createdTime} />
                  <KeyValue label="Attached evidence" value={reviewCase.evidenceLabel ?? "Evidence placeholder"} />
                  <KeyValue label="Settlement state" value={reviewCase.payoutStatus.replaceAll("_", " ")} />
                  <KeyValue label="Payout state" value={reviewCase.statusLabel} />
                </dl>
                <div className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Issue note</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{reviewCase.disputeNote}</p>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-black text-[var(--rp-text)]">Dispute evidence</h4>
                  {reviewCase.disputeEvidenceTimeline?.length ? (
                    <div className="mt-3 grid gap-3">
                      {reviewCase.disputeEvidenceTimeline.map((timelineItem) => (
                        <article
                          key={timelineItem.id}
                          className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <Badge className={timelineToneClass(timelineItem.tone)}>{timelineItem.actorLabel}</Badge>
                              <h5 className="mt-2 text-sm font-black text-[var(--rp-text)]">{timelineItem.title}</h5>
                              <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">{timelineItem.timestampLabel}</p>
                            </div>
                            <ProofPreviewButton
                              fileUrlOrStoragePath={timelineItem.fileUrl}
                              proofType={timelineItem.proofType}
                              fileName={timelineItem.fileName ?? undefined}
                            />
                          </div>
                          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                            {timelineItem.description}
                          </p>
                          {timelineItem.adminNotes ? (
                            <div className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
                                Admin notes
                              </p>
                              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                                {timelineItem.adminNotes}
                              </p>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                      Dispute evidence is built from available review, proof, settlement, and event rows. Add a dedicated disputes table in later schema cleanup.
                    </p>
                  )}
                </div>
              </DetailSection>
            ) : null}
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            {isTaxiPartnerQuoteCase ? (
              <>
                <TaxiPartnerPaymentSimulation
                  reviewCase={reviewCase}
                  stripeTestModeEnabled={stripeTestModeEnabled}
                  onTaxiPartnerMockActionApplied={onTaxiPartnerMockActionApplied}
                />
                <TaxiPartnerAdminNotes
                  value={adminNotes}
                  onChange={setAdminNotes}
                  selectedAction={taxiPartnerAction}
                  actionMessage={actionMessage}
                  actionError={actionError}
                  onAction={applyTaxiPartnerAction}
                />
              </>
            ) : reviewCase.isMemberSafetyReportCase ? (
              <DetailSection icon={LockKeyhole} title="Manual safety review">
                <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Safety report actions are placeholders in this slice. Admin-reviewed user notification and account action should be handled in a later safety ops slice.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]">
                    Request more info later
                  </Badge>
                  <Badge className="bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]">
                    Account action later
                  </Badge>
                </div>
              </DetailSection>
            ) : (
            <DetailSection icon={LockKeyhole} title="Admin decision">
              <div className="grid gap-2">
                {activeDecisionLabels.map((item) => {
                  const active = decision === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => applyDecision(item.key)}
                      className={cn(
                        "min-h-11 rounded-[14px] border px-3 text-left text-sm font-black transition",
                        active
                          ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                          : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <label className="mt-4 grid gap-2 text-sm font-black text-[var(--rp-muted-strong)]">
                Admin notes
                <textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  className="min-h-28 rounded-[16px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                  placeholder="Add notes for the audit trail."
                />
              </label>
              {notesMissing ? (
                <p className="mt-2 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
                  Admin notes are required for this action.
                </p>
              ) : null}
              {decision && !notesMissing ? (
                <div className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-success)]" />
                    <p className="text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                      {adminReviewDecisionCopy[decision]}
                    </p>
                  </div>
                </div>
              ) : null}
              {actionError ? (
                <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-danger-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-danger)]">
                  {actionError}
                </p>
              ) : null}
              {actionMessage ? (
                <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-success-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-badge-success-text)]">
                  {actionMessage}
                </p>
              ) : null}
              <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Admin actions update proof, review, ride, and settlement hold state only. Real payouts are handled later.
              </p>
            </DetailSection>
            )}

            <DetailSection icon={FileSearch} title="Audit behavior">
              <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Audit hooks exist in the money safety layer. This MVP queue records local decision copy only; backend audit writes are a TODO for persistence.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {adminAuditEventPlaceholders.map((eventName) => (
                  <Badge key={eventName} className="bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]">
                    {eventName}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-primary)]">
                Manual evidence review only.
              </p>
            </DetailSection>
          </aside>
        </div>
        {confirmationDecision ? (
          <AdminDecisionConfirmation
            decision={confirmationDecision}
            disabled={isSubmitting}
            onCancel={() => setConfirmationDecision(null)}
            onConfirm={confirmDecision}
          />
        ) : null}
        {taxiPartnerConfirmationAction ? (
          <TaxiPartnerActionConfirmation
            action={taxiPartnerConfirmationAction}
            disabled={isSubmitting}
            onCancel={() => setTaxiPartnerConfirmationAction(null)}
            onConfirm={confirmTaxiPartnerAction}
          />
        ) : null}
      </section>
    </div>
  );
}

const confirmationCopy: Record<AdminDecisionKey, { title: string; body: string; confirm: string }> = {
  approveProof: {
    title: "Approve this proof?",
    body: "This proof will be approved for RidePod settlement rules.",
    confirm: "Approve proof",
  },
  requestMoreInfo: {
    title: "Request more info?",
    body: "The host will need to provide clearer or corrected proof.",
    confirm: "Request more info",
  },
  rejectProof: {
    title: "Reject this proof?",
    body: "This proof will be marked rejected. The host must upload valid proof before settlement can continue.",
    confirm: "Reject proof",
  },
  holdPayout: {
    title: "Hold payout?",
    body: "Payout will be held while RidePod reviews this case.",
    confirm: "Hold payout",
  },
  capReimbursement: {
    title: "Hold payout?",
    body: "Payout will be held while RidePod reviews this case.",
    confirm: "Hold payout",
  },
  releasePayout: {
    title: "Hold payout?",
    body: "Payout will be held while RidePod reviews this case.",
    confirm: "Hold payout",
  },
  resolveDispute: {
    title: "Request more info?",
    body: "The host will need to provide clearer or corrected proof.",
    confirm: "Request more info",
  },
  restrictAccount: {
    title: "Hold payout?",
    body: "Payout will be held while RidePod reviews this case.",
    confirm: "Hold payout",
  },
  approveVerification: {
    title: "Approve manual verification?",
    body: "This marks the account as manually verified for RidePod trust features. No identity document was collected.",
    confirm: "Approve verification",
  },
  rejectVerification: {
    title: "Reject verification request?",
    body: "This keeps the account unverified.",
    confirm: "Reject verification",
  },
};

const taxiPartnerConfirmationCopy: Record<TaxiPartnerConfirmableActionKey, { title: string; body: string; confirm: string }> = {
  holdPayout: {
    title: "Hold payout?",
    body: "Payout will stay held while RidePod reviews this taxi partner case.",
    confirm: "Hold payout",
  },
  releasePayoutMock: {
    title: "Mark payout ready in demo?",
    body: "This only updates demo status. No real payout is sent.",
    confirm: "Mark payout ready",
  },
  requestMoreInfo: {
    title: "Request more info?",
    body: "RidePod needs more information before this case can be resolved.",
    confirm: "Request more info",
  },
  resolveDispute: {
    title: "Resolve dispute?",
    body: "This marks the dispute as resolved for this demo case.",
    confirm: "Resolve dispute",
  },
  denyPayoutMock: {
    title: "Deny payout in demo?",
    body: "This marks payout denied in demo mode. No real money moves.",
    confirm: "Deny payout",
  },
};

function AdminDecisionConfirmation({
  decision,
  disabled,
  onCancel,
  onConfirm,
}: {
  decision: AdminDecisionKey;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = confirmationCopy[decision];

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(3,7,18,0.62)] px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <h3 className="text-xl font-black text-[var(--rp-text)]">{copy.title}</h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{copy.body}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="min-h-12 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="min-h-12 rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] disabled:opacity-60"
          >
            {disabled ? "Applying..." : copy.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function TaxiPartnerActionConfirmation({
  action,
  disabled,
  onCancel,
  onConfirm,
}: {
  action: TaxiPartnerConfirmableActionKey;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = taxiPartnerConfirmationCopy[action];

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(3,7,18,0.62)] px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <h3 className="text-xl font-black text-[var(--rp-text)]">{copy.title}</h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{copy.body}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="min-h-12 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="min-h-12 rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] disabled:opacity-60"
          >
            {disabled ? "Applying..." : copy.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function AdminPaymentSimulationConfirmation({
  action,
  disabled,
  onCancel,
  onConfirm,
}: {
  action: AdminPaymentSimulationActionKey;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = paymentSimulationActionCopy[action];

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-[rgba(3,7,18,0.62)] px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <h3 className="text-xl font-black text-[var(--rp-text)]">{copy.title}</h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{copy.body}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="min-h-12 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="min-h-12 rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] disabled:opacity-60"
          >
            {disabled ? "Applying..." : copy.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
        <h3 className="text-lg font-black text-[var(--rp-text)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}
