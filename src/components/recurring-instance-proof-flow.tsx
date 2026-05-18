"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  HelpCircle,
  Info,
  ReceiptText,
  ShieldCheck,
  Upload,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { formatMoney, type RecurringRideInstancePreview, type RidePod } from "@/lib/mock-data";

function getRideOptionLabel(pod: RidePod) {
  return pod.rideOption === "taxi_meter" || pod.vehicleType === "Taxi"
    ? "Taxi meter"
    : "Ride app / fixed quote";
}

function getGuestLockLabel(pod: RidePod) {
  return `${pod.seatsFilled}/${pod.seatsTotal} guests locked`;
}

function formatInstanceTitle(rideInstance: RecurringRideInstancePreview) {
  return `${rideInstance.displayDate} - ${rideInstance.departureTime} - ${
    rideInstance.legType === "return" ? "Return" : "Outbound"
  }`;
}

function getStatusLabel(rideInstance: RecurringRideInstancePreview, taxiMeter: boolean) {
  if (taxiMeter && rideInstance.status === "ready_for_taxi_meter") return "Ready for taxi meter";
  if (taxiMeter && rideInstance.status === "meter_proof_needed") return "Meter proof needed";
  if (taxiMeter && rideInstance.status === "meter_proof_submitted") return "Meter proof submitted";
  if (taxiMeter && rideInstance.status === "meter_proof_under_review") return "Meter proof under review";
  if (rideInstance.status === "quote_needed") return "Quote needed";
  if (rideInstance.status === "quote_under_review") return "Quote under review";
  if (rideInstance.status === "ready_to_book") return "Ready to book";
  if (rideInstance.status === "ride_booked") return "Ride booked";
  if (rideInstance.status === "receipt_pending") return "Receipt pending";
  if (rideInstance.status === "receipt_submitted") return "Receipt submitted";
  if (rideInstance.status === "receipt_under_review") return "Receipt under review";
  if (rideInstance.status === "settlement_ready") return "Settlement ready";
  if (rideInstance.status === "completed") return "Settled";
  return "Guests locking";
}

const receiptStatusCopy = {
  NEEDED: "We'll review your receipt and update the status. Host reimbursement is held until review is complete.",
  SUBMITTED: "Receipt submitted. RidePod will review it before settlement.",
  UNDER_REVIEW: "Receipt under review. Host reimbursement is held until review is complete.",
  VERIFIED: "Receipt verified. Settlement can continue.",
  APPROVED: "Receipt verified. Settlement can continue.",
  NEEDS_MORE_INFO: "Please upload a clearer receipt showing the final fare, date, time, and provider.",
  REJECTED: "Receipt rejected. Settlement requires valid proof.",
  NOT_REQUIRED: "We'll review your receipt and update the status. Host reimbursement is held until review is complete.",
} as const;

const receiptBadgeLabels = {
  NEEDED: "Receipt needed",
  SUBMITTED: "Receipt submitted",
  UNDER_REVIEW: "Under review",
  VERIFIED: "Verified",
  APPROVED: "Verified",
  NEEDS_MORE_INFO: "Needs more info",
  REJECTED: "Rejected",
  NOT_REQUIRED: "Receipt needed",
} as const;

const meterProofStatusCopy = {
  NEEDED: "Meter proof or taxi receipt is required after the ride.",
  SUBMITTED: "Meter proof submitted. RidePod will review it before settlement.",
  UNDER_REVIEW: "Meter proof under review. Host reimbursement is held until review is complete.",
  VERIFIED: "Meter proof verified. Settlement can continue.",
  APPROVED: "Meter proof verified. Settlement can continue.",
  NEEDS_MORE_INFO: "Please upload a clearer meter photo or taxi receipt showing the final fare.",
  REJECTED: "Meter proof rejected. Settlement requires valid proof.",
  NOT_REQUIRED: "Meter proof or taxi receipt is required after the ride.",
} as const;

const meterProofBadgeLabels = {
  NEEDED: "Meter proof needed",
  SUBMITTED: "Meter proof submitted",
  UNDER_REVIEW: "Under review",
  VERIFIED: "Verified",
  APPROVED: "Verified",
  NEEDS_MORE_INFO: "Needs more info",
  REJECTED: "Rejected",
  NOT_REQUIRED: "Meter proof needed",
} as const;

function centsFromInput(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue * 100) : null;
}

function formatHkdCents(cents: number) {
  return `HK$${(cents / 100).toFixed(2)}`;
}

const receiptStatusSteps = [
  { id: "NEEDED", label: "Receipt needed" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "UNDER_REVIEW", label: "Under review" },
  { id: "VERIFIED", label: "Verified" },
  { id: "NEEDS_MORE_INFO", label: "Needs more info" },
  { id: "REJECTED", label: "Rejected" },
] as const;

const meterProofStatusSteps = [
  { id: "NEEDED", label: "Meter proof needed" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "UNDER_REVIEW", label: "Under review" },
  { id: "VERIFIED", label: "Verified" },
  { id: "NEEDS_MORE_INFO", label: "Needs more info" },
  { id: "REJECTED", label: "Rejected" },
] as const;

function ProofResultCard({
  title,
  body,
  action,
  tone = "neutral",
}: {
  title: string;
  body: string;
  action?: string;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)]">
          {tone === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-[var(--rp-success)]" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-black text-[var(--rp-text)]">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{body}</p>
          {action ? (
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)]"
              style={{ background: "var(--rp-gradient-primary)" }}
            >
              {action}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function compactRideDate(rideInstance: RecurringRideInstancePreview) {
  return rideInstance.displayDate.replace(/^\w+\s+/, "");
}

function getSettlementDisplayState(rideInstance: RecurringRideInstancePreview) {
  if (rideInstance.disputeRaised || rideInstance.settlementState === "DISPUTE_REVIEW") {
    return {
      badge: "Dispute review",
      payoutHelper: "Payout is held while RidePod reviews the dispute.",
      finalStepComplete: false,
    };
  }

  if (rideInstance.settlementState === "SETTLEMENT_FINAL") {
    return {
      badge: "Settlement final",
      payoutHelper: "Settlement is final. Payout can be processed.",
      finalStepComplete: true,
    };
  }

  if (rideInstance.settlementState === "PAID" || rideInstance.payoutState === "PAID") {
    return {
      badge: "Paid",
      payoutHelper: "Payout completed.",
      finalStepComplete: true,
    };
  }

  return {
    badge: "Settlement ready",
    payoutHelper: "Payout will be processed after the dispute window.",
    finalStepComplete: false,
  };
}

function SettlementTimelineStep({
  title,
  detail,
  active,
  final,
}: {
  title: string;
  detail: string;
  active?: boolean;
  final?: boolean;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <div className="relative grid justify-center">
        {!final ? (
          <span className="absolute left-1/2 top-8 h-[calc(100%+0.75rem)] w-px -translate-x-1/2 bg-[var(--rp-border-strong)]" />
        ) : null}
        <span
          className={[
            "relative z-10 grid h-7 w-7 place-items-center rounded-full border text-[11px] font-black",
            active
              ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
              : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
          ].join(" ")}
        >
          {active ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        </span>
      </div>
      <div className="pb-4">
        <p className={active ? "text-sm font-black text-[var(--rp-primary)]" : "text-sm font-black text-[var(--rp-text)]"}>
          {title}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{detail}</p>
      </div>
    </div>
  );
}

const disputeIssueTypes = [
  "Wrong fare",
  "Wrong route",
  "I did not take this ride",
  "Receipt or proof looks wrong",
  "Host issue",
  "Other",
] as const;

function RideInstanceSettlementSummary({
  rideInstance,
  statusLabel,
}: {
  rideInstance: RecurringRideInstancePreview;
  statusLabel: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
      <p className="text-sm font-bold text-[var(--rp-muted-strong)]">
        {rideInstance.displayDate}
        {" \u00b7 "}
        {rideInstance.departureTime}
        {" \u00b7 "}
        {rideInstance.legType === "return" ? "Return" : "Outbound"}
      </p>
      <h3 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
        {rideInstance.originLabel}
        {" \u2192 "}
        {rideInstance.destinationLabel}
      </h3>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="gap-1.5 bg-[var(--rp-success-bg)] px-3 py-1.5 text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]">
          <CheckCircle2 className="h-4 w-4" /> Verified
        </Badge>
        <Badge className="gap-1.5 bg-[var(--rp-success-bg)] px-3 py-1.5 text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]">
          <CheckCircle2 className="h-4 w-4" /> {statusLabel}
        </Badge>
      </div>
    </div>
  );
}

function SettlementDetailsScreen({
  rideInstance,
  onBack,
}: {
  rideInstance: RecurringRideInstancePreview;
  onBack: () => void;
}) {
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(Boolean(rideInstance.disputeRaised));
  const [selectedIssueType, setSelectedIssueType] = useState<(typeof disputeIssueTypes)[number]>("Wrong fare");
  const providerFareCents = rideInstance.finalFareCents ?? rideInstance.receiptFareCents ?? 29800;
  const bookingFareCapCents = rideInstance.bookingFareCapCents ?? 32000;
  const billableGuestCount = 4;
  const fareShareCents = Math.ceil(providerFareCents / billableGuestCount);
  const guestPlatformFeeCents = Math.ceil(fareShareCents * 0.1);
  const guestFinalChargeCents = fareShareCents + guestPlatformFeeCents;
  const platformFeeCents = rideInstance.platformFeeCents ?? guestPlatformFeeCents * billableGuestCount;
  const hostReimbursementCents = rideInstance.hostReimbursementCents ?? Math.max(0, providerFareCents - platformFeeCents);
  const proofTypeLabel = rideInstance.proofType === "METER_PROOF" ? "Meter proof / taxi receipt" : "Final receipt";
  const withinCap = providerFareCents <= bookingFareCapCents;
  const statusLabel = disputeSubmitted ? "Dispute review" : "Settlement ready";

  return (
    <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_12%,transparent),transparent_36%),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]"
          aria-label="Back to settlement"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-black text-[var(--rp-text)]">Settlement details</h2>
        <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5">
        <RideInstanceSettlementSummary rideInstance={rideInstance} statusLabel={statusLabel} />
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <h3 className="text-lg font-black text-[var(--rp-text)]">Final fare</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-[var(--rp-muted-strong)]">Verified final fare</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(providerFareCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-[var(--rp-muted-strong)]">Booking fare cap</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(bookingFareCapCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--rp-border)] pt-3">
            <dt className="font-black text-[var(--rp-text)]">Status</dt>
            <dd className={withinCap ? "font-black text-[var(--rp-success)]" : "font-black text-[var(--rp-danger)]"}>
              {withinCap ? "Within cap" : "Above cap - manual review required"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <h3 className="text-lg font-black text-[var(--rp-text)]">Split breakdown</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Provider fare / meter fare</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(providerFareCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Billable guests</dt>
            <dd className="font-black text-[var(--rp-text)]">{billableGuestCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Fare share per guest</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(fareShareCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Platform fee</dt>
            <dd className="font-black text-[var(--rp-text)]">10% of fare share</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Platform fee total</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(platformFeeCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Host own share</dt>
            <dd className="font-black text-[var(--rp-text)]">deducted / not reimbursed</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--rp-border)] pt-3">
            <dt className="font-black text-[var(--rp-primary)]">Host reimbursement</dt>
            <dd className="font-black text-[var(--rp-primary)]">{formatHkdCents(hostReimbursementCents)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <h3 className="text-lg font-black text-[var(--rp-text)]">Guest final charge</h3>
        <p className="mt-2 text-[34px] font-black leading-none text-[var(--rp-primary)]">{formatHkdCents(guestFinalChargeCents)}</p>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Fare share</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(fareShareCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Platform fee</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(guestPlatformFeeCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--rp-border)] pt-3">
            <dt className="font-black text-[var(--rp-text)]">Total</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(guestFinalChargeCents)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Guests cannot be charged above their approved max unless they approved an increase.
        </p>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <h3 className="text-lg font-black text-[var(--rp-text)]">Proof</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Proof type</dt>
            <dd className="font-black text-[var(--rp-text)]">{proofTypeLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Receipt status</dt>
            <dd className="font-black text-[var(--rp-success)]">Verified</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Verified proof controls final settlement.
        </p>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[var(--rp-text)]">Dispute window</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Guests can report an issue until the dispute window ends. If no issue is reported, settlement finalizes automatically.
            </p>
          </div>
          <Badge className={disputeSubmitted ? "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]" : "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]"}>
            {disputeSubmitted ? "Dispute review" : "Open"}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Deadline</dt>
            <dd className="font-black text-[var(--rp-text)]">May 22, 2025 · 8:00 AM</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--rp-muted-strong)]">Remaining</dt>
            <dd className="font-black text-[var(--rp-primary)]">48h remaining</dd>
          </div>
        </dl>
        {disputeSubmitted ? (
          <div className="mt-4 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-warning-bg)] p-4 text-sm font-bold leading-6 text-[var(--rp-warning)]">
            RidePod will review this issue. Payout may be held until the review is complete.
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowReportIssue(true)}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] px-4 text-sm font-black text-[var(--rp-primary)]"
          >
            Report an issue
          </button>
        )}
      </div>

      {showReportIssue ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm">
          <section className="w-full max-w-[430px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black">Report an issue</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Tell RidePod what looks wrong. Our team will review the proof, fare, route, and ride timeline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportIssue(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)]"
                aria-label="Close report issue"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {disputeIssueTypes.map((issueType) => (
                <button
                  key={issueType}
                  type="button"
                  onClick={() => setSelectedIssueType(issueType)}
                  className={[
                    "min-h-11 rounded-[14px] border px-3 text-left text-xs font-black",
                    selectedIssueType === issueType
                      ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                      : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
                  ].join(" ")}
                >
                  {issueType}
                </button>
              ))}
            </div>
            <label className="mt-4 grid gap-2 text-sm font-bold text-[var(--rp-muted-strong)]">
              Describe the issue
              <textarea
                className="min-h-28 rounded-[16px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                placeholder="Describe the issue"
              />
            </label>
            <label className="mt-4 grid min-h-20 cursor-pointer place-items-center rounded-[16px] border border-dashed border-[var(--rp-primary)] bg-[var(--rp-card-soft)] p-4 text-center text-sm font-black text-[var(--rp-primary)]">
              <input className="sr-only" type="file" />
              Add screenshot or proof
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowReportIssue(false)}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisputeSubmitted(true);
                  setShowReportIssue(false);
                }}
                className="min-h-12 rounded-2xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)]"
              >
                Submit issue
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function RecurringInstanceSettlementTimeline({
  rideInstance,
}: {
  rideInstance: RecurringRideInstancePreview;
}) {
  const [showSettlementDetails, setShowSettlementDetails] = useState(false);
  const settlementState = getSettlementDisplayState(rideInstance);
  const providerFareCents = rideInstance.finalFareCents ?? rideInstance.receiptFareCents ?? 29800;
  const platformFeeCents = rideInstance.platformFeeCents ?? Math.round(providerFareCents * 0.1);
  const hostReimbursementCents = rideInstance.hostReimbursementCents ?? Math.max(0, providerFareCents - platformFeeCents);
  const dateLabel = compactRideDate(rideInstance);
  const disputeDeadline = "May 22, 8:00 AM";

  if (showSettlementDetails) {
    return (
      <SettlementDetailsScreen
        rideInstance={rideInstance}
        onBack={() => setShowSettlementDetails(false)}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_12%,transparent),transparent_36%),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-black text-[var(--rp-text)]">Settlement</h2>
        <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <p className="text-sm font-bold text-[var(--rp-muted-strong)]">
          {rideInstance.displayDate}
          {" \u00b7 "}
          {rideInstance.departureTime}
          {" \u00b7 "}
          {rideInstance.legType === "return" ? "Return" : "Outbound"}
        </p>
        <h3 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
          {rideInstance.originLabel}
          {" \u2192 "}
          {rideInstance.destinationLabel}
        </h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="gap-1.5 bg-[var(--rp-success-bg)] px-3 py-1.5 text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]">
            <CheckCircle2 className="h-4 w-4" /> Verified
          </Badge>
          <Badge className="gap-1.5 bg-[var(--rp-success-bg)] px-3 py-1.5 text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]">
            <CheckCircle2 className="h-4 w-4" /> {settlementState.badge}
          </Badge>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <h3 className="text-lg font-black text-[var(--rp-text)]">Settlement timeline</h3>
        <div className="mt-5 grid gap-5 min-[760px]:grid-cols-[1fr_260px] min-[760px]:items-center">
          <div>
            <SettlementTimelineStep title="Ride completed" detail={`${dateLabel}, ${rideInstance.departureTime}`} active />
            <SettlementTimelineStep title="Proof verified" detail={`${dateLabel}, 9:30 AM`} active />
            <SettlementTimelineStep title="Settlement ready" detail={`${dateLabel}, 10:15 AM`} active />
            <SettlementTimelineStep title="Dispute window" detail={`Until ${disputeDeadline}`} active />
            <SettlementTimelineStep
              title="Settlement final"
              detail={`After ${disputeDeadline}`}
              active={settlementState.finalStepComplete}
              final
            />
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-black text-[var(--rp-text)]">About the dispute window</h4>
              <Info className="h-4 w-4 text-[var(--rp-primary)]" />
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
              Guests can raise a dispute until the window ends. If a dispute is raised, our team will review and update you.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <h3 className="text-lg font-black text-[var(--rp-text)]">Final split</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 font-semibold text-[var(--rp-muted-strong)]">
              <UsersRound className="h-4 w-4 text-[var(--rp-primary)]" /> Provider fare
            </dt>
            <dd className="font-black text-[var(--rp-text)]">{formatHkdCents(providerFareCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 font-semibold text-[var(--rp-muted-strong)]">
              <ShieldCheck className="h-4 w-4 text-[var(--rp-primary)]" /> Platform fee
            </dt>
            <dd className="font-black text-[var(--rp-text)]">-{formatHkdCents(platformFeeCents)}</dd>
          </div>
          <div className="border-t border-[var(--rp-border)] pt-3">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-black text-[var(--rp-primary)]">Host reimbursement</dt>
              <dd className="font-black text-[var(--rp-primary)]">{formatHkdCents(hostReimbursementCents)}</dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <p className="text-sm font-bold text-[var(--rp-muted-strong)]">You&apos;ll receive</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-[34px] font-black leading-none text-[var(--rp-primary)]">
            {formatHkdCents(hostReimbursementCents)}
          </p>
          <WalletCards className="h-12 w-12 text-[var(--rp-primary)] opacity-80" />
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          {settlementState.payoutHelper}
        </p>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Clock3 className="h-5 w-5 text-[var(--rp-primary)]" />
          <h3 className="text-lg font-black text-[var(--rp-text)]">Dispute window</h3>
        </div>
        <div className="mt-4 grid gap-5 min-[640px]:grid-cols-[1fr_auto] min-[640px]:items-center">
          <div>
            <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">Guests can raise a dispute until</p>
            <p className="mt-2 text-xl font-black text-[var(--rp-text)]">May 22, 2025 · 8:00 AM</p>
            <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">72 hours from now</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--rp-card-muted)]">
              <div className="h-full w-2/3 rounded-full bg-[var(--rp-primary)]" />
            </div>
            <p className="mt-2 text-center text-xs font-black text-[var(--rp-primary)]">48h remaining</p>
          </div>
          <div
            className="grid h-24 w-24 place-items-center rounded-full text-center"
            style={{ background: "conic-gradient(var(--rp-primary) 0 66%, var(--rp-card-muted) 66% 100%)" }}
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--rp-card)]">
              <p className="text-sm font-black leading-4 text-[var(--rp-primary)]">
                48h
                <span className="block text-[10px] text-[var(--rp-muted-strong)]">remaining</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => setShowSettlementDetails(true)}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[16px] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_20%,transparent)]"
          style={{ background: "var(--rp-gradient-primary)" }}
        >
          View settlement details <ArrowRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="inline-flex min-h-12 w-full items-center justify-between rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-muted-strong)]"
        >
          <span className="inline-flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-[var(--rp-primary)]" /> Help center
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export function RecurringInstanceProofFlow({
  pod,
  rideInstance,
}: {
  pod: RidePod;
  rideInstance: RecurringRideInstancePreview;
}) {
  const [quoteCertified, setQuoteCertified] = useState(Boolean(rideInstance.proofCertified));
  const [receiptCertified, setReceiptCertified] = useState(Boolean(rideInstance.proofCertified));
  const [meterCertified, setMeterCertified] = useState(Boolean(rideInstance.proofCertified));
  const [quoteAmount, setQuoteAmount] = useState(
    rideInstance.quotedFareCents ? String(Math.round(rideInstance.quotedFareCents / 100)) : "",
  );
  const [receiptFare, setReceiptFare] = useState(
    rideInstance.finalFareCents ? String(Math.round(rideInstance.finalFareCents / 100)) : "",
  );
  const [meterFare, setMeterFare] = useState(
    rideInstance.finalFareCents ? String(Math.round(rideInstance.finalFareCents / 100)) : "",
  );
  const taxiMeter = getRideOptionLabel(pod) === "Taxi meter";
  const receiptFlow =
    !taxiMeter &&
    (rideInstance.proofType === "FINAL_RECEIPT" ||
      [
        "ride_booked",
        "receipt_pending",
        "receipt_submitted",
        "receipt_under_review",
        "settlement_ready",
        "completed",
      ].includes(rideInstance.status));
  const bookingFareCapCents = rideInstance.bookingFareCapCents ?? Math.round(pod.maxFare * 100);
  const quoteAmountCents = quoteAmount.trim() ? centsFromInput(quoteAmount) : null;
  const receiptFareCents = receiptFare.trim() ? centsFromInput(receiptFare) : null;
  const meterFareCents = meterFare.trim() ? centsFromInput(meterFare) : null;
  const proofStatus = rideInstance.proofStatus ?? "NEEDED";
  const receiptAboveCap = receiptFareCents !== null && receiptFareCents > bookingFareCapCents;
  const meterAboveCap = meterFareCents !== null && meterFareCents > bookingFareCapCents;
  const quoteResult = useMemo(() => {
    if (taxiMeter) return null;
    if (rideInstance.status === "ready_to_book" || rideInstance.proofStatus === "APPROVED") {
      return "approved";
    }
    if (quoteAmountCents === null || Number.isNaN(quoteAmountCents)) return "missing";
    return quoteAmountCents <= bookingFareCapCents ? "approved" : "above_cap";
  }, [bookingFareCapCents, quoteAmountCents, rideInstance.proofStatus, rideInstance.status, taxiMeter]);
  const settlementFlow =
    (rideInstance.status === "settlement_ready" || rideInstance.status === "completed") &&
    (rideInstance.proofStatus === "VERIFIED" || rideInstance.proofStatus === "APPROVED");

  if (settlementFlow) {
    return <RecurringInstanceSettlementTimeline rideInstance={rideInstance} />;
  }

  if (receiptFlow) {
    const activeReceiptStatus =
      proofStatus === "APPROVED" || proofStatus === "VERIFIED" ? "VERIFIED" : proofStatus;
    const statusBody = receiptStatusCopy[proofStatus];

    return (
      <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_12%,transparent),transparent_36%),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-black text-[var(--rp-text)]">Upload receipt</h2>
          <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)]">
          <div className="p-4 sm:p-5">
            <p className="text-sm font-bold text-[var(--rp-muted-strong)]">
              {rideInstance.displayDate}
              {" \u00b7 "}
              {rideInstance.departureTime}
              {" \u00b7 "}
              {rideInstance.legType === "return" ? "Return" : "Outbound"}
            </p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
              {rideInstance.originLabel}
              {" \u2192 "}
              {rideInstance.destinationLabel}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="gap-1.5 border border-[var(--rp-primary)] bg-transparent px-3 py-1.5 text-[var(--rp-primary)] ring-0">
                <Car className="h-4 w-4" /> Ride app / fixed quote
              </Badge>
              <Badge className="gap-1.5 border border-[var(--rp-danger)] bg-transparent px-3 py-1.5 text-[var(--rp-danger)] ring-0">
                <FileText className="h-4 w-4" /> {receiptBadgeLabels[activeReceiptStatus]}
              </Badge>
            </div>
          </div>
          <div className="grid border-t border-[var(--rp-border)] min-[720px]:grid-cols-4">
            <div className="border-b border-[var(--rp-border)] p-4 min-[720px]:border-b-0 min-[720px]:border-r">
              <UsersRound className="h-5 w-5 text-[var(--rp-primary)]" />
              <p className="mt-2 text-xs font-bold text-[var(--rp-muted)]">Guests locked</p>
              <p className="mt-1 text-lg font-black text-[var(--rp-text)]">{pod.seatsFilled} / {pod.seatsTotal}</p>
            </div>
            <div className="border-b border-[var(--rp-border)] p-4 min-[720px]:border-b-0 min-[720px]:border-r">
              <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
              <p className="mt-2 text-xs font-bold text-[var(--rp-muted)]">Booking fare cap</p>
              <p className="mt-1 text-lg font-black text-[var(--rp-text)]">{formatHkdCents(bookingFareCapCents)}</p>
            </div>
            <div className="border-b border-[var(--rp-border)] p-4 min-[720px]:border-b-0 min-[720px]:border-r">
              <CheckCircle2 className="h-5 w-5 text-[var(--rp-primary)]" />
              <p className="mt-2 text-xs font-bold text-[var(--rp-muted)]">Quote approved</p>
              <p className="mt-1 text-lg font-black text-[var(--rp-text)]">
                {rideInstance.quotedFareCents ? formatHkdCents(rideInstance.quotedFareCents) : "Pending"}
              </p>
            </div>
            <div className="p-4">
              <CalendarCheck2 className="h-5 w-5 text-[var(--rp-primary)]" />
              <p className="mt-2 text-xs font-bold text-[var(--rp-muted)]">Ride status</p>
              <p className="mt-1 text-lg font-black text-[var(--rp-text)]">Completed</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
          <h3 className="text-xl font-black text-[var(--rp-text)]">Upload final receipt</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">PNG, JPG or PDF {"\u00b7"} Max 10MB</p>

          <label className="mt-5 grid min-h-36 cursor-pointer place-items-center rounded-[20px] border border-dashed border-[var(--rp-primary)] bg-[var(--rp-card)] p-5 text-center">
            <input className="sr-only" type="file" />
            <Upload className="h-12 w-12 text-[var(--rp-primary)]" />
            <span className="mt-3 text-base font-black text-[var(--rp-primary)]">Tap to upload or drag and drop</span>
          </label>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-[var(--rp-muted-strong)]">
              Provider / service
              <span className="relative block">
                <input
                  className="min-h-12 w-full rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 pr-11 text-sm font-bold text-[var(--rp-text)]"
                  placeholder="e.g. Uber, Lyft"
                />
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--rp-muted)]" />
              </span>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[var(--rp-muted-strong)]">
              Final fare (HKD)
              <input
                className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                inputMode="decimal"
                placeholder="HK$ 0.00"
                value={receiptFare}
                onChange={(event) => setReceiptFare(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[var(--rp-muted-strong)]">
              Note (optional)
              <textarea
                className="min-h-20 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                placeholder="Add a note about the ride"
              />
            </label>
          </div>

          <label className="mt-5 flex gap-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            <input
              type="checkbox"
              checked={receiptCertified}
              onChange={(event) => setReceiptCertified(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-[var(--rp-primary)] bg-transparent"
            />
            <span>I certify this receipt is real, accurate, unaltered, and belongs to this ride.</span>
          </label>

          <p className="mt-4 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-warning-bg)] p-3 text-sm font-bold leading-6 text-[var(--rp-warning)]">
            False or misleading proof may lead to review, reimbursement denial, or account action.
          </p>

          {receiptAboveCap ? (
            <div className="mt-4 rounded-[16px] border border-[var(--rp-danger)] bg-[var(--rp-danger-bg)] p-4">
              <h4 className="text-sm font-black text-[var(--rp-danger)]">Fare above booking fare cap</h4>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Guests cannot be charged above their max unless they approve an increase. This receipt may need manual review.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!receiptCertified}
            className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[16px] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: "var(--rp-gradient-primary)" }}
          >
            Submit receipt <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
          <h3 className="text-lg font-black text-[var(--rp-text)]">Receipt status</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 min-[720px]:grid-cols-6">
            {receiptStatusSteps.map((step) => {
              const active = step.id === activeReceiptStatus;
              return (
                <div key={step.id} className="grid gap-2 text-center">
                  <div
                    className={[
                      "mx-auto grid h-10 w-10 place-items-center rounded-full border text-xs font-black",
                      active
                        ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                        : "border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted)]",
                    ].join(" ")}
                  >
                    {active ? <FileText className="h-4 w-4" /> : null}
                  </div>
                  <p className={active ? "text-xs font-black text-[var(--rp-primary)]" : "text-xs font-bold text-[var(--rp-muted)]"}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{statusBody}</p>
        </div>
      </section>
    );
  }

  if (taxiMeter) {
    const activeMeterProofStatus =
      proofStatus === "APPROVED" || proofStatus === "VERIFIED"
        ? "VERIFIED"
        : proofStatus === "NOT_REQUIRED"
          ? "NEEDED"
          : proofStatus;
    const statusBody = meterProofStatusCopy[proofStatus];

    return (
      <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_12%,transparent),transparent_36%),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-black text-[var(--rp-text)]">Upload meter proof</h2>
          <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
            <HelpCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)]">
          <div className="p-4 sm:p-5">
            <p className="text-sm font-bold text-[var(--rp-muted-strong)]">
              {rideInstance.displayDate}
              {" \u00b7 "}
              {rideInstance.departureTime}
              {" \u00b7 "}
              {rideInstance.legType === "return" ? "Return" : "Outbound"}
            </p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
              {rideInstance.originLabel}
              {" \u2192 "}
              {rideInstance.destinationLabel}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="gap-1.5 border border-[var(--rp-primary)] bg-transparent px-3 py-1.5 text-[var(--rp-primary)] ring-0">
                <Car className="h-4 w-4" /> Taxi meter
              </Badge>
              <Badge className="gap-1.5 border border-[var(--rp-danger)] bg-transparent px-3 py-1.5 text-[var(--rp-danger)] ring-0">
                <AlertTriangle className="h-4 w-4" /> {meterProofBadgeLabels[activeMeterProofStatus]}
              </Badge>
            </div>
          </div>
          <div className="grid border-t border-[var(--rp-border)] min-[720px]:grid-cols-3">
            <div className="border-b border-[var(--rp-border)] p-4 min-[720px]:border-b-0 min-[720px]:border-r">
              <UsersRound className="h-5 w-5 text-[var(--rp-primary)]" />
              <p className="mt-2 text-xs font-bold text-[var(--rp-muted)]">Guests locked</p>
              <p className="mt-1 text-lg font-black text-[var(--rp-text)]">
                {pod.seatsFilled} / {pod.seatsTotal}
              </p>
            </div>
            <div className="border-b border-[var(--rp-border)] p-4 min-[720px]:border-b-0 min-[720px]:border-r">
              <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
              <p className="mt-2 text-xs font-bold text-[var(--rp-muted)]">Booking fare cap</p>
              <p className="mt-1 text-lg font-black text-[var(--rp-text)]">{formatHkdCents(bookingFareCapCents)}</p>
            </div>
            <div className="p-4">
              <CheckCircle2 className="h-5 w-5 text-[var(--rp-success)]" />
              <p className="mt-2 text-xs font-bold text-[var(--rp-muted)]">Ride status</p>
              <p className="mt-1 text-lg font-black text-[var(--rp-success)]">Completed</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
          <h3 className="text-xl font-black text-[var(--rp-text)]">Upload meter proof</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">
            Upload a clear meter photo or taxi receipt.
          </p>

          <label className="mt-5 grid min-h-36 cursor-pointer place-items-center rounded-[20px] border border-dashed border-[var(--rp-primary)] bg-[var(--rp-card)] p-5 text-center">
            <input className="sr-only" type="file" />
            <Upload className="h-12 w-12 text-[var(--rp-primary)]" />
            <span className="mt-3 text-base font-black text-[var(--rp-primary)]">Tap to upload or drag and drop</span>
            <span className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">PNG, JPG or PDF {"\u00b7"} Max 10MB</span>
          </label>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-[var(--rp-muted-strong)]">
              Final meter fare (HKD)
              <input
                className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                inputMode="decimal"
                placeholder="HK$0.00"
                value={meterFare}
                onChange={(event) => setMeterFare(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[var(--rp-muted-strong)]">
              Note (optional)
              <textarea
                className="min-h-20 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                placeholder="Add a note about the ride"
              />
            </label>
          </div>

          <label className="mt-5 flex gap-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            <input
              type="checkbox"
              checked={meterCertified}
              onChange={(event) => setMeterCertified(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-[var(--rp-primary)] bg-transparent"
            />
            <span>I certify this meter proof / receipt is real, accurate, unaltered, and belongs to this ride.</span>
          </label>

          <p className="mt-4 flex gap-3 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-warning-bg)] p-3 text-sm font-bold leading-6 text-[var(--rp-warning)]">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>False or misleading proof may lead to review, reimbursement denial, or account action.</span>
          </p>

          {meterAboveCap ? (
            <div className="mt-4 rounded-[16px] border border-[var(--rp-danger)] bg-[var(--rp-danger-bg)] p-4">
              <h4 className="text-sm font-black text-[var(--rp-danger)]">Fare above booking fare cap</h4>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Guests cannot be charged above their max unless they approve an increase. This meter proof may need manual review.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!meterCertified}
            className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[16px] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: "var(--rp-gradient-primary)" }}
          >
            Submit meter proof <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 sm:p-5">
          <h3 className="text-lg font-black text-[var(--rp-text)]">Meter proof status</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 min-[720px]:grid-cols-6">
            {meterProofStatusSteps.map((step) => {
              const active = step.id === activeMeterProofStatus;
              return (
                <div key={step.id} className="grid gap-2 text-center">
                  <div
                    className={[
                      "mx-auto grid h-10 w-10 place-items-center rounded-full border text-xs font-black",
                      active
                        ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                        : "border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted)]",
                    ].join(" ")}
                  >
                    {active ? <FileText className="h-4 w-4" /> : null}
                  </div>
                  <p className={active ? "text-xs font-black text-[var(--rp-primary)]" : "text-xs font-bold text-[var(--rp-muted)]"}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{statusBody}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <div className="bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_22%,transparent),transparent_38%),var(--rp-card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
              Ride instance
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
              {formatInstanceTitle(rideInstance)}
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
              {pod.fromLabel} recurring pod
            </p>
          </div>
          <Badge className="bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]">
            {getStatusLabel(rideInstance, taxiMeter)}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 min-[760px]:grid-cols-5">
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 min-[760px]:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Route</p>
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">
              {rideInstance.originLabel}
              {" \u2192 "}
              {rideInstance.destinationLabel}
            </p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Ride option</p>
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">{getRideOptionLabel(pod)}</p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Guest lock</p>
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">{getGuestLockLabel(pod)}</p>
          </div>
          {!taxiMeter ? (
            <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Quote status</p>
              <p className="mt-2 text-sm font-black text-[var(--rp-text)]">
                {rideInstance.quotedFareCents ? "Quote approved" : "Quote needed"}
              </p>
            </div>
          ) : null}
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Booking fare cap</p>
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">{formatMoney(bookingFareCapCents / 100)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          This ride instance has its own proof, booking, final receipt, and settlement.
        </p>
      </div>

      <div className="grid gap-4 p-5 sm:p-6">
        {receiptFlow ? (
          <>
            <div className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
              <h3 className="text-lg font-black text-[var(--rp-text)]">Upload final receipt</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Upload the final receipt for this ride. Final settlement uses the verified receipt.
              </p>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 min-[560px]:grid-cols-2">
                  <input
                    className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                    placeholder="Provider name"
                  />
                  <input
                    className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                    inputMode="decimal"
                    placeholder="Final fare amount"
                    value={receiptFare}
                    onChange={(event) => setReceiptFare(event.target.value)}
                  />
                </div>
                <label className="grid min-h-36 cursor-pointer place-items-center rounded-[20px] border border-dashed border-[var(--rp-primary)] bg-[var(--rp-card)] p-5 text-center">
                  <input className="sr-only" type="file" />
                  <Upload className="h-9 w-9 text-[var(--rp-primary)]" />
                  <span className="mt-3 text-base font-black text-[var(--rp-text)]">Upload final receipt</span>
                  <span className="mt-1 text-xs font-bold text-[var(--rp-muted)]">PNG, JPG or PDF - Max 10MB</span>
                </label>
                <textarea
                  className="min-h-24 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                  placeholder="Optional note"
                />
                <label className="flex gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                  <input
                    type="checkbox"
                    checked={receiptCertified}
                    onChange={(event) => setReceiptCertified(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>I confirm this receipt is real, accurate, unaltered, and belongs to this ride.</span>
                </label>
                <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
                  False or misleading proof may lead to reimbursement denial, account suspension, dispute review, and manual review.
                </p>
                <button
                  type="button"
                  disabled={!receiptCertified}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ background: "var(--rp-gradient-primary)" }}
                >
                  <ReceiptText className="h-4 w-4" /> Submit receipt
                </button>
              </div>
            </div>
            <ProofResultCard
              title={getStatusLabel(rideInstance, taxiMeter)}
              body={receiptStatusCopy[proofStatus]}
              tone={proofStatus === "VERIFIED" || proofStatus === "APPROVED" ? "success" : proofStatus === "REJECTED" ? "warning" : "neutral"}
            />
            {receiptAboveCap ? (
              <ProofResultCard
                title="Fare above booking fare cap"
                body="Guests cannot be charged above their max unless they approve an increase. This proof may need manual review."
                tone="warning"
              />
            ) : null}
          </>
        ) : taxiMeter ? (
          <>
            {rideInstance.status === "meter_proof_needed" ||
            rideInstance.status === "meter_proof_submitted" ||
            rideInstance.status === "meter_proof_under_review" ||
            rideInstance.status === "settlement_ready" ? (
              <div className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
                <h3 className="text-lg font-black text-[var(--rp-text)]">Upload meter proof</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Upload a clear meter photo or taxi receipt showing the final fare.
                </p>
                <div className="mt-4 grid gap-3">
                  <input
                    className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                    placeholder="Final meter fare"
                    inputMode="decimal"
                    value={meterFare}
                    onChange={(event) => setMeterFare(event.target.value)}
                  />
                  <input
                    className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                    type="file"
                  />
                  <label className="flex gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                    <input
                      type="checkbox"
                      checked={meterCertified}
                      onChange={(event) => setMeterCertified(event.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      I confirm this meter proof or receipt is real, accurate, unaltered, and belongs to this ride.
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!meterCertified}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ background: "var(--rp-gradient-primary)" }}
                  >
                    <Upload className="h-4 w-4" /> Submit meter proof
                  </button>
                </div>
              </div>
            ) : (
              <ProofResultCard
                title="Ready for taxi meter ride"
                body="Meet the guests and take a metered taxi. Upload meter proof or taxi receipt after the ride."
                action="Upload meter proof"
              />
            )}
            <ProofResultCard
              title={getStatusLabel(rideInstance, taxiMeter)}
              body={meterProofStatusCopy[proofStatus]}
              tone={proofStatus === "VERIFIED" || proofStatus === "APPROVED" ? "success" : proofStatus === "REJECTED" ? "warning" : "neutral"}
            />
            {meterAboveCap ? (
              <ProofResultCard
                title="Fare above booking fare cap"
                body="Guests cannot be charged above their max unless they approve an increase. This proof may need manual review."
                tone="warning"
              />
            ) : null}
          </>
        ) : (
          <>
            <div className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
              <h3 className="text-lg font-black text-[var(--rp-text)]">Upload fresh quote</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Upload a quote or fare screenshot for this ride before booking.
              </p>
              <div className="mt-4 grid gap-3">
                <input
                  className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                  placeholder="Provider / app name"
                />
                <input
                  className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                  inputMode="decimal"
                  placeholder={`Quote amount, cap ${formatMoney(bookingFareCapCents / 100)}`}
                  value={quoteAmount}
                  onChange={(event) => setQuoteAmount(event.target.value)}
                />
                <input
                  className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                  type="file"
                />
                <textarea
                  className="min-h-24 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                  placeholder="Optional note"
                />
                <label className="flex gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                  <input
                    type="checkbox"
                    checked={quoteCertified}
                    onChange={(event) => setQuoteCertified(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    I confirm this quote screenshot is real, accurate, unaltered, and belongs to this ride.
                  </span>
                </label>
                <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-warning)]">
                  False or misleading proof may lead to booking denial, reimbursement denial, account suspension, and manual review.
                </p>
                <button
                  type="button"
                  disabled={!quoteCertified}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ background: "var(--rp-gradient-primary)" }}
                >
                  <ReceiptText className="h-4 w-4" /> Submit quote
                </button>
              </div>
            </div>

            {quoteResult === "approved" ? (
              <ProofResultCard
                title="Quote approved"
                body="The quote is within the booking fare cap. You may book the external ride."
                action="Mark ride as booked"
                tone="success"
              />
            ) : quoteResult === "above_cap" ? (
              <ProofResultCard
                title="Quote above booking fare cap"
                body="Guests must approve a higher max before this ride can be RidePod-protected."
                action="Request higher max approval"
                tone="warning"
              />
            ) : (
              <ProofResultCard
                title="Quote needed"
                body="Fresh quote required before booking this ride."
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
