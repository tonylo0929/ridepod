"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, LifeBuoy, ShieldAlert } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { cn } from "@/components/ui";
import type {
  HomeRide,
  RideAppSelfSettleReport,
  RideAppSelfSettleReportCategory,
} from "@/lib/home-ride-mock";
import { createRideAppTrustEvent } from "@/lib/ride-app-trust";
import { useAuth } from "@/providers/AuthProvider";

type SelfSettleReportIssueProps = {
  podId: string;
  routeLabel: string;
  rideDateTime?: string;
  chatHref: string;
  currentUserRole?: HomeRide["currentUserRole"] | null;
  canSubmit: boolean;
  triggerLabel?: "Report an issue" | "Need help with this self-settle pod?" | "Need help with this pod?";
  className?: string;
};

type ReportCategoryOption = {
  value: RideAppSelfSettleReportCategory;
  label: string;
  helper: string;
};

const reportCategories: ReportCategoryOption[] = [
  {
    value: "safety_concern",
    label: "Safety concern",
    helper: "Report behaviour that made you feel unsafe.",
  },
  {
    value: "harassment_abuse",
    label: "Harassment or abusive behaviour",
    helper: "Report threatening, offensive, or inappropriate messages or actions.",
  },
  {
    value: "host_no_show",
    label: "Host did not show up",
    helper: "Report if the host failed to attend the agreed ride.",
  },
  {
    value: "rider_no_show",
    label: "Rider did not show up",
    helper: "Report if a joined rider failed to attend.",
  },
  {
    value: "host_cancelled_after_confirmed",
    label: "Host cancelled after details were confirmed",
    helper: "Report last-minute cancellation after the group agreed details.",
  },
  {
    value: "fare_payment_disagreement",
    label: "Fare/payment disagreement",
    helper: "Report disagreement about the external fare or split.",
  },
  {
    value: "suspicious_fake_information",
    label: "Suspicious or fake information",
    helper: "Report route, identity, or payment information that seems false.",
  },
  {
    value: "pressure_to_pay_outside_agreed_method",
    label: "Pressure to pay outside the agreed method",
    helper: "Report if someone pressured you to pay in an unsafe way.",
  },
  {
    value: "other",
    label: "Other",
    helper: "Describe what happened.",
  },
];

const localReportStorageKey = "ridepod:self-settle-issue-reports";

function readStoredReports(): RideAppSelfSettleReport[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(localReportStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredReports(reports: RideAppSelfSettleReport[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localReportStorageKey, JSON.stringify(reports));
}

export function SelfSettleReportIssue({
  podId,
  routeLabel,
  rideDateTime,
  chatHref,
  currentUserRole,
  canSubmit,
  triggerLabel = "Report an issue",
  className,
}: SelfSettleReportIssueProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<RideAppSelfSettleReportCategory | "">("");
  const [description, setDescription] = useState("");
  const [amountInvolved, setAmountInvolved] = useState("");
  const [paymentMethodInvolved, setPaymentMethodInvolved] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const reporterId = user?.id ?? null;
  const descriptionLength = description.trim().length;
  const reportTouched = Boolean(category || description || amountInvolved || paymentMethodInvolved || acknowledged);
  const validationError = useMemo(() => {
    if (!category) return "Choose an issue category.";
    if (descriptionLength < 20) return "Describe what happened in at least 20 characters.";
    if (!acknowledged) {
      return "Confirm that RidePod does not guarantee recovery of external ride fare.";
    }
    return null;
  }, [acknowledged, category, descriptionLength]);

  useEffect(() => {
    if (!reporterId) return;
    const timeoutId = window.setTimeout(() => {
      setSubmitted(readStoredReports().some((report) => report.podId === podId && report.reporterUserId === reporterId));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [podId, reporterId]);

  function resetDraft() {
    setCategory("");
    setDescription("");
    setAmountInvolved("");
    setPaymentMethodInvolved("");
    setAcknowledged(false);
    setError(null);
    setSubmittedSuccess(false);
  }

  function openReport() {
    if (!canSubmit) return;
    resetDraft();
    setOpen(true);
  }

  function closeReport() {
    if (submitting) return;
    setOpen(false);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!reporterId) {
      setError("Log in to submit a report.");
      return;
    }

    if (!canSubmit) {
      setError("Only joined pod members can submit a report.");
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reports = readStoredReports();
      const existing = reports.some((report) => report.podId === podId && report.reporterUserId === reporterId);
      if (!existing) {
        reports.push({
          id: `self-settle-report-${podId}-${reporterId}-${Date.now()}`,
          podId,
          reporterUserId: reporterId,
          reporterRole: currentUserRole ?? null,
          category: category as RideAppSelfSettleReportCategory,
          description: description.trim(),
          amountInvolved: amountInvolved.trim() || null,
          paymentMethodInvolved: paymentMethodInvolved.trim() || null,
          status: "under_review",
          submittedAt: new Date().toISOString(),
        });
        writeStoredReports(reports);
      }

      // TODO: Replace local mock storage with a private admin review case and reporter notification when pod-level report storage exists.
      // TODO: Add optional screenshot/photo upload when self-settle report storage is available.
      // TODO: Add "Who is this about?" targeting when pod member lists are available in this surface.
      createRideAppTrustEvent({
        userId: reporterId,
        podId,
        eventType: "ride_app_report_submitted",
        reason: "Self-settle report submitted for review. No trust penalty applied until admin confirms.",
        createdBy: reporterId,
        metadata: {
          category,
        },
      });
      setSubmitted(true);
      setSubmittedSuccess(true);
    } catch {
      setError("Could not submit the report. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canSubmit) return null;

  return (
    <>
      <div className={cn("grid gap-2", className)}>
        {submitted ? (
          <div className="rounded-[16px] border border-blue-300/20 bg-blue-400/10 px-3 py-2">
            <p className="text-sm font-black text-blue-100">Report submitted</p>
            <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">Under review</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={openReport}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[15px] border border-blue-300/20 bg-blue-400/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-200/45 hover:bg-blue-400/16"
        >
          <LifeBuoy className="h-4 w-4" />
          {triggerLabel}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReport();
          }}
        >
          <section className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
            {submittedSuccess ? (
              <>
                <div className="overflow-y-auto p-5">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-300/25 bg-blue-400/12 text-blue-100">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h2 id={titleId} className="mt-4 text-2xl font-black leading-tight">
                    Report submitted
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                    RidePod will review the issue. Please keep all relevant chat messages, payment records, and ride app receipts.
                  </p>
                  <div className="mt-5 rounded-[18px] border border-blue-300/15 bg-blue-400/10 p-4">
                    <p className="text-sm font-black text-blue-100">Under review</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                      This status is only shown to you.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
                  <button
                    type="button"
                    onClick={closeReport}
                    className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
                  >
                    Back to pod
                  </button>
                  <Link
                    href={chatHref}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8b5cf6,#60a5fa)] px-4 text-sm font-black text-white transition hover:brightness-105"
                  >
                    Open pod chat
                  </Link>
                </div>
              </>
            ) : (
              <form onSubmit={submitReport} className="contents">
                <div className="overflow-y-auto p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-100">
                      <ShieldAlert className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 id={titleId} className="text-2xl font-black leading-tight">
                        Report self-settle pod issue
                      </h2>
                      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                        RidePod can review safety, abuse, fraud, and platform misuse. RidePod does not guarantee recovery of external ride fare, especially payments made outside the recommended after-ride settlement.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 rounded-[18px] border border-blue-300/15 bg-[rgba(2,6,23,0.34)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Route</span>
                      <span className="text-right text-sm font-black text-[var(--rp-text)]">{routeLabel}</span>
                    </div>
                    {rideDateTime ? (
                      <div className="flex items-start justify-between gap-3 border-t border-blue-300/15 pt-2">
                        <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Date & time</span>
                        <span className="text-right text-sm font-black text-[var(--rp-text)]">{rideDateTime}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-black text-[var(--rp-text)]">Issue category</p>
                    <div className="mt-3 grid gap-2">
                      {reportCategories.map((option) => {
                        const selected = category === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setCategory(option.value);
                              setError(null);
                            }}
                            aria-pressed={selected}
                            className={cn(
                              "rounded-[16px] border p-3 text-left transition",
                              selected
                                ? "border-blue-300/45 bg-blue-400/14 text-blue-100"
                                : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] hover:border-blue-300/30",
                            )}
                          >
                            <span className="block text-sm font-black">{option.label}</span>
                            <span className="mt-1 block text-xs font-bold leading-5">{option.helper}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="mt-5 grid gap-2">
                    <span className="text-sm font-black text-[var(--rp-text)]">Description</span>
                    <textarea
                      value={description}
                      onChange={(event) => {
                        setDescription(event.target.value);
                        setError(null);
                      }}
                      placeholder="Describe what happened and include the most relevant details."
                      className="min-h-32 rounded-[16px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold leading-6 text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-blue-300/45"
                    />
                    <span className="text-xs font-bold text-[var(--rp-muted-strong)]">
                      {descriptionLength} / 20 minimum characters
                    </span>
                  </label>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[var(--rp-text)]">Optional amount involved</span>
                      <input
                        value={amountInvolved}
                        onChange={(event) => setAmountInvolved(event.target.value)}
                        placeholder="e.g. HK$120"
                        className="min-h-12 rounded-[16px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-blue-300/45"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[var(--rp-text)]">Optional payment method involved</span>
                      <input
                        value={paymentMethodInvolved}
                        onChange={(event) => setPaymentMethodInvolved(event.target.value)}
                        placeholder="e.g. PayMe / FPS"
                        className="min-h-12 rounded-[16px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-blue-300/45"
                      />
                    </label>
                  </div>

                  <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) => {
                        setAcknowledged(event.target.checked);
                        setError(null);
                      }}
                      className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
                    />
                    <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
                      I understand RidePod can review platform misuse and safety issues, but RidePod does not guarantee recovery of external ride fare.
                    </span>
                  </label>

                  <p className="mt-4 rounded-[16px] border border-blue-300/20 bg-blue-400/10 p-3 text-sm font-bold leading-6 text-blue-100">
                    RidePod may review platform misuse and safety issues. Do not use this form for emergencies.
                  </p>

                  {error ? (
                    <p className="mt-4 rounded-[14px] border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm font-bold text-rose-100">
                      <AlertTriangle className="mr-2 inline h-4 w-4" />
                      {error}
                    </p>
                  ) : reportTouched && validationError ? (
                    <p className="mt-4 rounded-[14px] border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-100">
                      {validationError}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={closeReport}
                    className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || Boolean(validationError)}
                    className={cn(
                      "min-h-12 rounded-2xl border text-sm font-black transition",
                      !validationError && !submitting
                        ? "border-[var(--rp-border-strong)] bg-[linear-gradient(135deg,#8b5cf6,#60a5fa)] text-white hover:brightness-105"
                        : "cursor-not-allowed border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
                    )}
                  >
                    {submitting ? "Submitting..." : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
