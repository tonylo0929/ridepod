"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  LockKeyhole,
  ReceiptText,
  ShieldAlert,
  X,
} from "lucide-react";
import { Badge, cn } from "@/components/ui";
import {
  adminAuditEventPlaceholders,
  adminDecisionLabels,
  adminReviewDecisionCopy,
  adminReviewFilters,
  formatAdminHkd,
  getAdminReviewCases,
  type AdminDecisionKey,
  type AdminReviewCase,
  type AdminReviewFilter,
  type AdminReviewSeverity,
} from "@/lib/admin-review-queue";

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

function differenceLabel(value?: number, compareTo?: number) {
  if (typeof value !== "number" || typeof compareTo !== "number") return "None";
  const difference = value - compareTo;
  if (difference === 0) return "No difference";
  return `${difference > 0 ? "+" : "-"}${formatAdminHkd(Math.abs(difference))}`;
}

export default function AdminReviewPage() {
  const [selectedFilter, setSelectedFilter] = useState<AdminReviewFilter>("All");
  const [selectedCase, setSelectedCase] = useState<AdminReviewCase | null>(null);
  const [caseUpdates, setCaseUpdates] = useState<Record<string, Partial<AdminReviewCase>>>({});
  const baseCases = useMemo(() => getAdminReviewCases(), []);
  const cases = useMemo(
    () => baseCases.map((reviewCase) => ({ ...reviewCase, ...caseUpdates[reviewCase.id] })),
    [baseCases, caseUpdates],
  );
  const visibleCases = cases.filter((reviewCase) =>
    selectedFilter === "All" ? true : reviewCase.filter === selectedFilter,
  );

  const handleDecisionApplied = (caseId: string, decisionKey: AdminDecisionKey) => {
    const update = getDecisionCaseUpdate(decisionKey);
    setCaseUpdates((current) => ({ ...current, [caseId]: { ...current[caseId], ...update } }));
    setSelectedCase((current) => (current?.id === caseId ? { ...current, ...update } : current));
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
          </div>
          <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Open cases</p>
            <p className="mt-1 text-3xl font-black text-[var(--rp-primary)]">
              {cases.filter((reviewCase) => reviewCase.reviewState !== "RESOLVED").length}
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

function getDecisionCaseUpdate(decisionKey: AdminDecisionKey): Partial<AdminReviewCase> {
  if (decisionKey === "approveProof") {
    return { reviewState: "APPROVED", proofStatus: "VERIFIED", statusLabel: "Proof approved" };
  }
  if (decisionKey === "requestMoreInfo") {
    return { reviewState: "NEEDS_MORE_INFO", proofStatus: "NEEDS_MORE_INFO", statusLabel: "Needs more info" };
  }
  if (decisionKey === "rejectProof") {
    return { reviewState: "REJECTED", proofStatus: "REJECTED", payoutStatus: "HELD_FOR_REVIEW", statusLabel: "Proof rejected" };
  }
  if (decisionKey === "capReimbursement") {
    return { reviewState: "UNDER_REVIEW", payoutStatus: "HELD_FOR_REVIEW", statusLabel: "Capped at fare cap" };
  }
  if (decisionKey === "holdPayout") {
    return { reviewState: "UNDER_REVIEW", payoutStatus: "HELD_FOR_REVIEW", statusLabel: "Payout held" };
  }
  if (decisionKey === "releasePayout") {
    return { reviewState: "APPROVED", payoutStatus: "RELEASED", statusLabel: "Payout released" };
  }
  if (decisionKey === "resolveDispute") {
    return { reviewState: "RESOLVED", disputeStatus: "Resolved", statusLabel: "Dispute resolved" };
  }
  return { reviewState: "UNDER_REVIEW", statusLabel: "Account follow-up recorded" };
}

function ReviewCaseCard({ reviewCase, onOpen }: { reviewCase: AdminReviewCase; onOpen: () => void }) {
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
  reviewCase: AdminReviewCase;
  onClose: () => void;
  onDecisionApplied: (caseId: string, decisionKey: AdminDecisionKey) => void;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [decision, setDecision] = useState<AdminDecisionKey | null>(null);
  const selectedDecision = adminDecisionLabels.find((item) => item.key === decision);
  const notesRequired = Boolean(selectedDecision?.requiresNotes);
  const notesMissing = notesRequired && !adminNotes.trim();

  const applyDecision = (nextDecision: AdminDecisionKey) => {
    const config = adminDecisionLabels.find((item) => item.key === nextDecision);
    if (config?.requiresNotes && !adminNotes.trim()) {
      setDecision(nextDecision);
      return;
    }
    setDecision(nextDecision);
    onDecisionApplied(reviewCase.id, nextDecision);
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
                <div className="grid min-h-40 place-items-center rounded-[18px] border border-dashed border-[var(--rp-primary)] bg-[var(--rp-card-soft)] p-4 text-center">
                  <div>
                    <FileSearch className="mx-auto h-8 w-8 text-[var(--rp-primary)]" />
                    <p className="mt-2 text-sm font-black text-[var(--rp-text)]">Uploaded file preview</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--rp-muted)]">{reviewCase.evidenceLabel ?? "Screenshot / PDF placeholder"}</p>
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
                </dl>
                <div className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Issue note</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{reviewCase.disputeNote}</p>
                </div>
              </DetailSection>
            ) : null}
          </div>

          <aside className="grid content-start gap-4">
            <DetailSection icon={LockKeyhole} title="Admin decision">
              <div className="grid gap-2">
                {adminDecisionLabels.map((item) => {
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
                  placeholder="Add review notes for audit trail."
                />
              </label>
              {notesMissing ? (
                <p className="mt-2 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
                  Admin notes are required for this decision.
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
