"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ReceiptText, ShieldCheck, Upload } from "lucide-react";
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
  return `${rideInstance.displayDate} · ${rideInstance.departureTime} · ${
    rideInstance.legType === "return" ? "Return" : "Outbound"
  }`;
}

function getStatusLabel(rideInstance: RecurringRideInstancePreview, taxiMeter: boolean) {
  if (taxiMeter && rideInstance.status === "ready_for_taxi_meter") return "Ready for taxi meter";
  if (taxiMeter && rideInstance.status === "meter_proof_needed") return "Meter proof needed";
  if (rideInstance.status === "quote_needed") return "Quote needed";
  if (rideInstance.status === "quote_under_review") return "Quote under review";
  if (rideInstance.status === "ready_to_book") return "Ready to book";
  if (rideInstance.status === "ride_booked") return "Ride booked";
  if (rideInstance.status === "receipt_pending") return "Receipt pending";
  if (rideInstance.status === "settlement_ready") return "Settlement ready";
  if (rideInstance.status === "completed") return "Settled";
  return "Guests locking";
}

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

export function RecurringInstanceProofFlow({
  pod,
  rideInstance,
}: {
  pod: RidePod;
  rideInstance: RecurringRideInstancePreview;
}) {
  const [quoteCertified, setQuoteCertified] = useState(Boolean(rideInstance.proofCertified));
  const [meterCertified, setMeterCertified] = useState(Boolean(rideInstance.proofCertified));
  const [quoteAmount, setQuoteAmount] = useState(
    rideInstance.quotedFareCents ? String(Math.round(rideInstance.quotedFareCents / 100)) : "",
  );
  const taxiMeter = getRideOptionLabel(pod) === "Taxi meter";
  const bookingFareCapCents = rideInstance.bookingFareCapCents ?? Math.round(pod.maxFare * 100);
  const quoteAmountCents = quoteAmount.trim() ? Math.round(Number(quoteAmount) * 100) : null;
  const quoteResult = useMemo(() => {
    if (taxiMeter) return null;
    if (rideInstance.status === "ready_to_book" || rideInstance.proofStatus === "APPROVED") {
      return "approved";
    }
    if (quoteAmountCents === null || Number.isNaN(quoteAmountCents)) return "missing";
    return quoteAmountCents <= bookingFareCapCents ? "approved" : "above_cap";
  }, [bookingFareCapCents, quoteAmountCents, rideInstance.proofStatus, rideInstance.status, taxiMeter]);

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

        <div className="mt-5 grid gap-3 min-[760px]:grid-cols-4">
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 min-[760px]:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Route</p>
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">
              {rideInstance.originLabel} → {rideInstance.destinationLabel}
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
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          This ride instance has its own proof, booking, final receipt, and settlement.
        </p>
      </div>

      <div className="grid gap-4 p-5 sm:p-6">
        {taxiMeter ? (
          <>
            {rideInstance.status === "meter_proof_needed" || rideInstance.status === "receipt_pending" ? (
              <div className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
                <h3 className="text-lg font-black text-[var(--rp-text)]">Upload meter proof</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Upload a clear meter photo or taxi receipt showing the final fare.
                </p>
                <div className="mt-4 grid gap-3">
                  <input
                    className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                    placeholder="Final fare amount"
                    inputMode="decimal"
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
                    <Upload className="h-4 w-4" /> Submit receipt
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
