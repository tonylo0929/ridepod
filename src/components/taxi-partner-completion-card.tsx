"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ShieldCheck, WalletCards } from "lucide-react";
import { Badge, cn } from "@/components/ui";
import type { RecurringRideInstancePreview, RidePod } from "@/lib/mock-data";
import {
  completeTaxiPartnerQuoteRequestMock,
  getTaxiPartnerQuoteDisplayStatus,
  getTaxiPartnerQuoteMoneyDisplay,
  getTaxiPartnerQuoteRequest,
  taxiPartnerTaxiTypeLabels,
  type TaxiPartnerQuoteRequest,
} from "@/lib/taxi-partner-quote";

function formatHkdCents(cents: number) {
  return `HK$${(cents / 100).toFixed(2)}`;
}

function isCompletionRelevant(request: TaxiPartnerQuoteRequest | null) {
  if (!request) return false;

  return (
    request.guestAcceptanceStatus === "ALL_ACCEPTED" ||
    request.driverAssignmentStatus === "PARTNER_ACCEPTED" ||
    request.driverAssignmentStatus === "DRIVER_ASSIGNED" ||
    request.driverAssignmentStatus === "COMPLETED" ||
    request.payoutStatus === "PENDING_DISPUTE_WINDOW" ||
    request.payoutStatus === "HELD_FOR_REVIEW"
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--rp-border)] py-2 last:border-b-0">
      <dt className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</dt>
      <dd className="text-right text-sm font-black text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

export function TaxiPartnerCompletionCard({
  pod,
  rideInstance,
}: {
  pod: RidePod;
  rideInstance: RecurringRideInstancePreview;
}) {
  const baseRequest = getTaxiPartnerQuoteRequest(rideInstance.taxiPartnerQuoteRequestId);
  const [localRequest, setLocalRequest] = useState<TaxiPartnerQuoteRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [understandsMockCompletion, setUnderstandsMockCompletion] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const activeRequest = localRequest ?? baseRequest;
  const lockedGuestCount = Math.max(1, activeRequest?.acceptedGuestCount ?? pod.seatsFilled);
  const moneyDisplay = useMemo(
    () => activeRequest ? getTaxiPartnerQuoteMoneyDisplay(activeRequest, lockedGuestCount) : null,
    [activeRequest, lockedGuestCount],
  );
  const displayStatus = getTaxiPartnerQuoteDisplayStatus(activeRequest);
  const isPayoutPending = activeRequest?.payoutStatus === "PENDING_DISPUTE_WINDOW";
  const isDisputeReview = activeRequest?.payoutStatus === "HELD_FOR_REVIEW";
  const completed = activeRequest?.driverAssignmentStatus === "COMPLETED";
  const activeStatusLabel = isPayoutPending || completed || isDisputeReview ? displayStatus.label : "Ready for taxi partner";
  const activeStatusHelper =
    isPayoutPending || completed || isDisputeReview
      ? displayStatus.helperText
      : "Guests accepted the quote. In the live version, the taxi partner would complete the ride here.";

  if (!isCompletionRelevant(activeRequest) || !moneyDisplay || !activeRequest?.quoteAmountCents) return null;

  function markCompleted() {
    if (!activeRequest) return;
    const completedRequest = completeTaxiPartnerQuoteRequestMock(activeRequest);
    setLocalRequest(completedRequest);
    setShowCompletionModal(false);
    setUnderstandsMockCompletion(false);
    setMessage("Ride completed");
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_12%,transparent),transparent_36%),var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
            Taxi partner completion
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
            {activeStatusLabel}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            {activeStatusHelper}
          </p>
        </div>
        <Badge
          className={cn(
            isDisputeReview
              ? "bg-sky-400/10 text-sky-300 ring-sky-400/25"
              : isPayoutPending || completed
                ? "bg-sky-400/10 text-sky-300 ring-sky-400/25"
                : "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]",
          )}
        >
          {activeStatusLabel}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]">
          Guests accepted
        </Badge>
        <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border)]">
          Beta prototype
        </Badge>
        <Badge className="bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]">
          No real payout yet
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 min-[720px]:grid-cols-3">
        <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <CalendarClock className="h-5 w-5 text-[var(--rp-primary)]" />
          <p className="mt-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Route</p>
          <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
            {rideInstance.originLabel} to {rideInstance.destinationLabel}
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            {rideInstance.displayDate}, {rideInstance.departureTime}
          </p>
        </div>
        <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
          <p className="mt-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Taxi partner</p>
          <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
            {activeRequest.quotedByPartnerName ?? "Demo Taxi Partner"}
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            {taxiPartnerTaxiTypeLabels[activeRequest.requestedTaxiType]} taxi
          </p>
        </div>
        <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <WalletCards className="h-5 w-5 text-[var(--rp-primary)]" />
          <p className="mt-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Taxi partner payout</p>
          <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
            {formatHkdCents(moneyDisplay.driverPayoutCents)}
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">Display only</p>
        </div>
      </div>

      {isPayoutPending || completed || isDisputeReview ? (
        <div className="mt-5 rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <h3 className="text-lg font-black text-[var(--rp-text)]">{displayStatus.label}</h3>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            {displayStatus.helperText}
          </p>
          <dl className="mt-4">
            <SummaryRow label="Taxi partner quote" value={formatHkdCents(moneyDisplay.quoteAmountCents)} />
            <SummaryRow label="Taxi partner payout" value={formatHkdCents(moneyDisplay.driverPayoutCents)} />
            <SummaryRow label="Platform fee total" value={formatHkdCents(moneyDisplay.platformFeeTotalCents)} />
            <SummaryRow label="Dispute window" value="24h" />
          </dl>
          <p className="mt-4 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            No real payout is sent in beta. Payout is pending during the dispute window.
          </p>
          <div className="mt-4 grid gap-3 min-[520px]:grid-cols-2">
            <Link
              href={`/pods/${pod.id}/settlement`}
              className="inline-flex min-h-12 items-center justify-center rounded-[16px] px-5 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)]"
              style={{ background: "var(--rp-gradient-primary)" }}
            >
              View settlement
            </Link>
            <button
              type="button"
              onClick={() => setMessage("Report an issue before the dispute window ends.")}
              className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-5 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
            >
              View dispute window
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-5 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            This only updates the demo state. No real taxi payout is sent.
          </p>
          <button
            type="button"
            onClick={() => setShowCompletionModal(true)}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)] min-[520px]:w-auto"
            style={{ background: "var(--rp-gradient-primary)" }}
          >
            <CheckCircle2 className="h-4 w-4" /> Simulate ride completed
          </button>
        </>
      )}

      {message ? (
        <div className="mt-4 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <p className="text-sm font-black text-[var(--rp-success)]">{message}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            {message === "Ride completed"
              ? "Payout is pending until the dispute window ends."
              : "Payout is pending during the dispute window."}
          </p>
        </div>
      ) : null}

      {showCompletionModal ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxi-partner-completion-title"
        >
          <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <h2 id="taxi-partner-completion-title" className="text-2xl font-black leading-tight">
              Mark ride completed?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              This demo action marks the taxi partner ride as completed and starts the dispute window. No real payout is sent.
            </p>
            <dl className="mt-5 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
              <SummaryRow label="Taxi partner" value={activeRequest.quotedByPartnerName ?? "Demo Taxi Partner"} />
              <SummaryRow label="Quote amount" value={formatHkdCents(moneyDisplay.quoteAmountCents)} />
              <SummaryRow label="Guest count" value={`${moneyDisplay.guestCount} guests`} />
              <SummaryRow label="Guest charge" value={formatHkdCents(moneyDisplay.guestChargeCents)} />
              <SummaryRow label="Taxi partner payout amount" value={formatHkdCents(moneyDisplay.driverPayoutCents)} />
              <SummaryRow label="Route" value={`${rideInstance.originLabel} to ${rideInstance.destinationLabel}`} />
              <SummaryRow label="Date/time" value={`${rideInstance.displayDate}, ${rideInstance.departureTime}`} />
            </dl>
            <label className="mt-4 flex gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
              <input
                type="checkbox"
                checked={understandsMockCompletion}
                onChange={(event) => setUnderstandsMockCompletion(event.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--rp-primary)]"
              />
              <span>I understand this is a beta mock completion.</span>
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!understandsMockCompletion}
                onClick={markCompleted}
                className={cn(
                  "min-h-12 rounded-2xl border text-sm font-black transition",
                  understandsMockCompletion
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)] hover:brightness-105"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
                )}
              >
                Mark completed
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
