"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  memberSafetyConcernLabels,
  MEMBER_SAFETY_CONCERN_TYPES,
  submitMemberSafetyReport,
  type MemberSafetyConcernType,
  type MemberSafetyReportContext,
  type SubmitMemberSafetyReportResult,
} from "@/lib/member-safety-report";
import { cn } from "@/components/ui";

type ReportConcernModalProps = {
  context: MemberSafetyReportContext;
  onClose: () => void;
};

function ContextRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">{label}</p>
      <p className="mt-1 text-sm font-black text-[var(--rp-text)]">{value}</p>
    </div>
  );
}

export function ReportConcernModal({ context, onClose }: ReportConcernModalProps) {
  const [concernType, setConcernType] = useState<MemberSafetyConcernType | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitMemberSafetyReportResult | null>(null);

  const submit = async () => {
    setSubmitting(true);
    const nextResult = await submitMemberSafetyReport({
      ...context,
      concernType: concernType || null,
      description,
    });
    setResult(nextResult);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(3,7,18,0.66)] px-4 py-6 backdrop-blur-sm">
      <section className="max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        {result?.ok ? (
          <div className="grid gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[var(--rp-text)]">Report submitted</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                RidePod will review this concern. Reports are private.
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
                Your report will not be shown to the reported member.
              </p>
              {result.fallbackNote ? (
                <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                  {result.fallbackNote}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
                  Manual review
                </p>
                <h3 className="mt-2 text-2xl font-black text-[var(--rp-text)]">Report a concern</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Tell RidePod what happened. Reports are private and reviewed manually.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
              <ContextRow label="Reported member" value={context.reportedMemberDisplayName} />
              <ContextRow label="Pod route" value={context.podRoute} />
              <ContextRow label="Ride context" value={context.rideDateTime} />
              <ContextRow label="Reporter role" value={context.reporterRole} />
            </div>

            <label className="mt-5 grid gap-2 text-sm font-black text-[var(--rp-muted-strong)]">
              Concern type
              <select
                value={concernType}
                onChange={(event) => {
                  setConcernType(event.target.value as MemberSafetyConcernType | "");
                  setResult(null);
                }}
                className="min-h-12 rounded-[16px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
              >
                <option value="">Choose a concern type</option>
                {MEMBER_SAFETY_CONCERN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {memberSafetyConcernLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 grid gap-2 text-sm font-black text-[var(--rp-muted-strong)]">
              Describe the issue
              <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setResult(null);
                }}
                placeholder="Share what happened. Include helpful details, but do not include sensitive personal information unless necessary."
                className="min-h-32 rounded-[16px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold leading-6 text-[var(--rp-text)]"
              />
            </label>

            <p className="mt-4 rounded-[16px] border border-dashed border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] p-3 text-sm font-bold text-[var(--rp-muted-strong)]">
              Evidence upload coming later.
            </p>

            <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-sm font-bold leading-6 text-[var(--rp-warning)]">
              Do not use this form for emergencies. Contact local emergency services immediately.
            </p>

            {result?.validationError ? (
              <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-danger-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-danger)]">
                {result.validationError}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="min-h-12 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className={cn(
                  "min-h-12 rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] disabled:opacity-60",
                )}
              >
                {submitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
