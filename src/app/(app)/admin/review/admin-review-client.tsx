"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
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
import type { AdminReviewCaseViewModel } from "@/lib/supabase/admin-review-cases";

type AdminReviewAction =
  | "APPROVE_PROOF"
  | "REQUEST_MORE_INFO"
  | "REJECT_PROOF"
  | "HOLD_PAYOUT"
  | "APPROVE_VERIFICATION"
  | "REJECT_VERIFICATION";
type ApplyAdminReviewActionResult = Awaited<ReturnType<typeof applyAdminReviewActionForCase>>;

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

export function AdminReviewClient({
  initialCases,
  source,
  fallbackNote,
  userFacingError,
}: {
  initialCases: AdminReviewCaseViewModel[];
  source: "supabase" | "mock";
  fallbackNote: string | null;
  userFacingError: string | null;
}) {
  const [selectedFilter, setSelectedFilter] = useState<AdminReviewFilter>("All");
  const [selectedCase, setSelectedCase] = useState<AdminReviewCaseViewModel | null>(null);
  const [caseUpdates, setCaseUpdates] = useState<Record<string, Partial<AdminReviewCase>>>({});
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

  return (
    <article className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="grid gap-4 min-[760px]:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={severityClass(reviewCase.severity)}>{reviewCase.severity}</Badge>
            <Badge className={reviewStateClass(reviewCase.reviewState)}>{reviewCase.reviewState.replaceAll("_", " ")}</Badge>
            {aboveCap ? (
              <Badge className="bg-orange-400/10 text-orange-300 ring-orange-400/25">Above cap</Badge>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-black text-[var(--rp-text)]">{reviewCase.caseType}</h2>
          <p className="mt-2 text-sm font-bold text-[var(--rp-muted-strong)]">{reviewCase.rideDateTime}</p>
          <p className="mt-1 text-sm font-black text-[var(--rp-text)]">{reviewCase.route}</p>
          {reviewCase.isIdVerificationCase ? (
            <dl className="mt-4 grid gap-2 text-sm min-[560px]:grid-cols-2">
              <KeyValue label="User" value={reviewCase.subjectUserLabel ?? reviewCase.host} />
              <KeyValue label="Email" value={reviewCase.subjectUserEmail ?? "Not available"} />
              <KeyValue label="Review status" value={reviewCase.reviewState.replaceAll("_", " ")} />
              <KeyValue label="Description" value="No identity document was collected." />
            </dl>
          ) : (
            <dl className="mt-4 grid gap-2 text-sm min-[560px]:grid-cols-2">
              <KeyValue label="Ride option" value={reviewCase.rideOption} />
              <KeyValue label="Host" value={reviewCase.host} />
              <KeyValue label="Reporter" value={reviewCase.reporter ?? "None"} />
              <KeyValue label="Created" value={reviewCase.createdTime} />
              <KeyValue label={reviewCase.fareLabel} value={formatAdminHkd(reviewCase.fareAmountCents)} />
              <KeyValue label="Booking fare cap" value={formatAdminHkd(reviewCase.bookingFareCapCents)} />
              <KeyValue label="Proof status" value={reviewCase.proofStatus.replaceAll("_", " ")} />
              <KeyValue label="Payout status" value={reviewCase.payoutStatus.replaceAll("_", " ")} />
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
            {reviewCase.primaryAction} <ArrowRight className="h-4 w-4" />
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

function ReviewCaseModal({
  reviewCase,
  onClose,
  onDecisionApplied,
}: {
  reviewCase: AdminReviewCaseViewModel;
  onClose: () => void;
  onDecisionApplied: (
    caseId: string,
    decisionKey: AdminDecisionKey,
    adminNotes: string,
  ) => Promise<{ ok: boolean; message: string }>;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [decision, setDecision] = useState<AdminDecisionKey | null>(null);
  const [confirmationDecision, setConfirmationDecision] = useState<AdminDecisionKey | null>(null);
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

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[rgba(3,7,18,0.78)] px-4 py-6 backdrop-blur-sm">
      <section className="mx-auto grid w-full max-w-5xl gap-4 rounded-[30px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-4 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Review detail</p>
            <h2 className="mt-2 text-2xl font-black">{reviewCase.caseType}</h2>
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

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {reviewCase.isIdVerificationCase ? (
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
