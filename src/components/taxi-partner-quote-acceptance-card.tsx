"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, WalletCards, XCircle } from "lucide-react";
import { RidePodTestPaymentElement } from "@/components/payments/RidePodTestPaymentElement";
import { Badge, cn } from "@/components/ui";
import type { RecurringRideInstancePreview, RidePod } from "@/lib/mock-data";
import { recordRidePodTestPaymentEvent } from "@/lib/payments/create-ridepod-payment-event";
import { createRidePodTestPaymentIntent } from "@/lib/payments/create-ridepod-test-payment";
import type { RidePodCreateTestPaymentIntentResponse } from "@/lib/payments/ridepod-payment-types";
import {
  createPendingTaxiPartnerQuoteAcceptance,
  getTaxiPartnerQuoteDisplayStatus,
  getTaxiPartnerQuoteMoneyDisplay,
  getTaxiPartnerQuoteRequest,
  taxiPartnerTaxiTypeLabels,
  type TaxiPartnerQuoteAcceptance,
} from "@/lib/taxi-partner-quote";
import { formatHKD, ridePodPricingCopy } from "@/lib/ridepod-pricing";
import { useRidePodPricingConfig } from "@/lib/use-ridepod-pricing-config";

function formatHkdCents(cents: number) {
  return formatHKD(cents);
}

function formatQuoteExpiry(value: string | null) {
  if (!value) return "Quote expiry not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatQuoteExpiryBadge(value: string | null) {
  return value ? "Quote expires in 15 min" : "Quote expiry not set";
}

function getInitialAcceptedCount(requestAcceptedCount: number | undefined, guestCount: number) {
  if (typeof requestAcceptedCount === "number") return Math.min(requestAcceptedCount, guestCount);

  return 0;
}

function MoneyRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--rp-border)] py-2 last:border-b-0">
      <dt className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</dt>
      <dd className={cn("text-sm font-black", strong ? "text-sky-300" : "text-[var(--rp-text)]")}>
        {value}
      </dd>
    </div>
  );
}

function AcceptanceModal({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  children,
  confirmDisabled = false,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="taxi-partner-acceptance-modal-title"
    >
      <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
        <h2 id="taxi-partner-acceptance-modal-title" className="text-2xl font-black leading-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{body}</p>
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            className={cn(
              "min-h-12 rounded-2xl border text-sm font-black transition",
              confirmDisabled
                ? "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]"
                : "border-sky-400 bg-sky-500 text-white hover:bg-sky-400",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function TaxiPartnerQuoteAcceptanceCard({
  pod,
  rideInstance,
  currentUserId,
  stripeTestModeEnabled = false,
}: {
  pod: RidePod;
  rideInstance: RecurringRideInstancePreview;
  currentUserId: string;
  stripeTestModeEnabled?: boolean;
}) {
  const baseRequest = getTaxiPartnerQuoteRequest(rideInstance.taxiPartnerQuoteRequestId);
  const guestCount = Math.max(1, pod.seatsFilled);
  const pricingConfig = useRidePodPricingConfig();
  const [acceptance, setAcceptance] = useState<TaxiPartnerQuoteAcceptance>(() =>
    createPendingTaxiPartnerQuoteAcceptance({
      quoteRequestId: baseRequest?.id ?? `${rideInstance.id}-quote`,
      rideInstanceId: rideInstance.id,
      guestUserId: currentUserId,
    }),
  );
  const [acceptedCount, setAcceptedCount] = useState(() =>
    getInitialAcceptedCount(baseRequest?.acceptedGuestCount, guestCount),
  );
  const [declinedCount, setDeclinedCount] = useState(0);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [understandsMockPayment, setUnderstandsMockPayment] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testPaymentIntent, setTestPaymentIntent] = useState<RidePodCreateTestPaymentIntentResponse | null>(null);
  const [creatingTestPayment, setCreatingTestPayment] = useState(false);
  const stripeTestIntentReady = Boolean(testPaymentIntent?.ok && testPaymentIntent.clientSecret);
  const paymentMode: "stripe_test" | "mock" = stripeTestModeEnabled ? "stripe_test" : "mock";

  const moneyDisplay = useMemo(
    () => baseRequest ? getTaxiPartnerQuoteMoneyDisplay(baseRequest, guestCount, pricingConfig) : null,
    [baseRequest, guestCount, pricingConfig],
  );
  const displayStatus = getTaxiPartnerQuoteDisplayStatus(baseRequest);
  const quoteAboveCap = Boolean(
    baseRequest?.quoteAmountCents &&
      rideInstance.bookingFareCapCents &&
      baseRequest.quoteAmountCents > rideInstance.bookingFareCapCents,
  );
  const userAccepted = acceptance.acceptanceStatus === "ACCEPTED";
  const userDeclined = acceptance.acceptanceStatus === "DECLINED";
  const effectiveAcceptedCount = acceptedCount;
  const pendingCount = Math.max(0, guestCount - effectiveAcceptedCount - declinedCount);
  const allAccepted = effectiveAcceptedCount >= guestCount;
  const totalLabel = moneyDisplay ? formatHkdCents(moneyDisplay.guestChargeCents) : "Pending";

  function handleAcceptQuote() {
    acceptQuoteWithPaymentState("MOCK_AUTHORIZED");
    setShowAcceptModal(false);
    setMessage("Quote accepted");
  }

  function acceptQuoteWithPaymentState(mockPaymentState: TaxiPartnerQuoteAcceptance["mockPaymentState"]) {
    setAcceptance((current) => ({
      ...current,
      acceptanceStatus: "ACCEPTED",
      mockPaymentState,
      acceptedAt: new Date().toISOString(),
      declinedAt: null,
      acceptedHigherQuote: quoteAboveCap,
    }));
    setAcceptedCount((current) => Math.min(guestCount, Math.max(current + 1, current)));
    setDeclinedCount((current) => Math.max(0, current - 1));
  }

  function paymentEventTypeForState(mockPaymentState: TaxiPartnerQuoteAcceptance["mockPaymentState"]) {
    if (mockPaymentState === "TEST_REQUIRES_CAPTURE") return "TEST_REQUIRES_CAPTURE";
    if (mockPaymentState === "TEST_SUCCEEDED" || mockPaymentState === "TEST_PAYMENT_CONFIRMED") {
      return "TEST_PAYMENT_CONFIRMED";
    }
    return "MOCK_PAYMENT_ACCEPTED";
  }

  async function handleCreateTestPayment() {
    if (!moneyDisplay) return;
    if (!stripeTestModeEnabled) {
      setMessage("Stripe test mode is not enabled.");
      return;
    }

    setCreatingTestPayment(true);
    setTestPaymentIntent(null);

    const result = await createRidePodTestPaymentIntent({
      rideInstanceId: rideInstance.id,
      quoteRequestId: baseRequest?.id ?? null,
      amountCents: moneyDisplay.guestChargeCents,
      currency: "hkd",
      purpose: "TAXI_PARTNER_QUOTE_ACCEPTANCE",
      userId: currentUserId,
      captureMode: "manual",
    });

    setCreatingTestPayment(false);
    setTestPaymentIntent(result);

    if (!result.ok) {
      setAcceptance((current) => ({
        ...current,
        mockPaymentState: result.error === "STRIPE_TEST_MODE_DISABLED" ? "NOT_STARTED" : "TEST_FAILED",
      }));
      setMessage(result.message);
      return;
    }

    setAcceptance((current) => ({
      ...current,
      mockPaymentState:
        result.status === "requires_capture"
          ? "TEST_REQUIRES_CAPTURE"
          : result.status === "succeeded"
            ? "TEST_SUCCEEDED"
            : result.status === "canceled"
              ? "TEST_CANCELED"
              : result.status === "requires_payment_method"
                ? "TEST_PAYMENT_INTENT_CREATED"
                : "TEST_PAYMENT_INTENT_CREATED",
    }));
    setMessage("Test payment ready. Continue with Stripe test card details.");
  }

  function handleTestPaymentConfirmed(result: {
    paymentIntentId: string;
    status: string;
    mockPaymentState: TaxiPartnerQuoteAcceptance["mockPaymentState"];
    message: string;
  }) {
    acceptQuoteWithPaymentState(result.mockPaymentState);
    void recordRidePodTestPaymentEvent({
      rideInstanceId: rideInstance.id,
      userId: currentUserId,
      actorRole: "guest",
      eventType: paymentEventTypeForState(result.mockPaymentState),
      stripePaymentIntentId: result.paymentIntentId,
      amountCents: moneyDisplay?.guestChargeCents ?? null,
      currency: "HKD",
      previousStatus: "TEST_PAYMENT_INTENT_CREATED",
      newStatus: result.status,
      eventPayload: {
        stripeStatus: result.status,
        demoMode: true,
        rideOption: "TAXI_PARTNER_QUOTE",
        quoteRequestId: baseRequest?.id ?? null,
      },
    });
    setTestPaymentIntent((current) =>
      current?.ok
        ? {
            ...current,
            paymentIntentId: result.paymentIntentId,
            status: result.status,
          }
        : current,
    );
    setMessage(result.message);
  }

  function handleDeclineQuote() {
    setAcceptance((current) => ({
      ...current,
      acceptanceStatus: "DECLINED",
      mockPaymentState: "NOT_STARTED",
      acceptedAt: null,
      declinedAt: new Date().toISOString(),
      acceptedHigherQuote: false,
    }));
    setDeclinedCount((current) => Math.min(guestCount, current + 1));
    setShowDeclineModal(false);
    setMessage("Quote declined");
  }

  if (!baseRequest || !moneyDisplay || !baseRequest.quoteAmountCents) return null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-sky-400/30 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.15),transparent_34%),var(--rp-card)] p-4 shadow-[0_18px_46px_rgba(14,165,233,0.12)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-300">
            Taxi partner quote
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
            Taxi partner quote
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            Taxi partner quote is separate from the RidePod fee.
          </p>
        </div>
        <Badge className={allAccepted ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25" : "bg-sky-400/10 text-sky-300 ring-sky-400/25"}>
          {allAccepted ? "Ready for pickup" : displayStatus.label}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          "Taxi partner",
          "Shared pod",
          paymentMode === "stripe_test" ? "Stripe test mode" : "Demo acceptance",
        ].map((badge) => (
          <Badge key={badge} className="border border-sky-400/20 bg-sky-400/10 text-sky-100 ring-sky-400/25">
            {badge}
          </Badge>
        ))}
      </div>

      <div className="mt-5 grid gap-3 min-[720px]:grid-cols-2">
        <div className="rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Route</p>
          <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
            {rideInstance.originLabel} to {rideInstance.destinationLabel}
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            {rideInstance.displayDate} - {rideInstance.departureTime}
          </p>
        </div>
        <div className="rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Taxi partner</p>
          <p className="mt-1 text-sm font-black text-[var(--rp-text)]">
            {baseRequest.quotedByPartnerName ?? "Demo Taxi Partner"}
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            {taxiPartnerTaxiTypeLabels[baseRequest.requestedTaxiType]} taxi
          </p>
        </div>
      </div>

      {quoteAboveCap ? (
        <div className="mt-4 rounded-[18px] border border-orange-400/25 bg-orange-400/10 p-3 text-orange-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-black">Quote above fare cap</p>
              <p className="mt-1 text-xs font-bold leading-5">
                This quote is above the original fare cap. Accept only if you agree to the higher amount.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <dl className="mt-4 rounded-[20px] border border-sky-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(15,23,42,0.18))] p-4">
        <MoneyRow label="Taxi partner" value={baseRequest.quotedByPartnerName ?? "Demo Taxi Partner"} />
        <MoneyRow label="Taxi type" value={`${taxiPartnerTaxiTypeLabels[baseRequest.requestedTaxiType]} taxi`} />
        <MoneyRow label="Taxi partner quote" value={formatHkdCents(moneyDisplay.quoteAmountCents)} />
        <MoneyRow label="Fare share" value={formatHkdCents(moneyDisplay.fareShareCents)} />
        <MoneyRow label="RidePod fee" value={formatHkdCents(moneyDisplay.platformFeeCents)} />
        <MoneyRow label="Your total" value={totalLabel} strong />
        <MoneyRow label="Quote expiry" value={formatQuoteExpiry(baseRequest.quoteExpiresAt)} />
      </dl>
      <p className="mt-3 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
        Guests must accept the selected quote before the ride proceeds. {ridePodPricingCopy.taxiQuoteSeparate}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] ring-[var(--rp-border)]">
          <Clock3 className="mr-1 h-3.5 w-3.5" />
          {formatQuoteExpiryBadge(baseRequest.quoteExpiresAt)}
        </Badge>
      </div>

      <div className="mt-4 rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-4">
        <p className="text-sm font-black text-[var(--rp-text)]">Guest acceptance</p>
        <p className="mt-1 text-lg font-black text-sky-300">
          {effectiveAcceptedCount} / {guestCount} accepted
        </p>
        <div className="mt-3 grid gap-2 text-sm font-bold text-[var(--rp-muted-strong)]">
          <div className="flex items-center justify-between gap-3">
            <span>You</span>
            <Badge
              className={cn(
                userAccepted
                  ? "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]"
                  : userDeclined
                    ? "bg-[var(--rp-danger-bg)] text-[var(--rp-danger)] ring-[var(--rp-border)]"
                    : "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]",
              )}
            >
              {userAccepted ? "Accepted" : userDeclined ? "Declined" : "Pending"}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Other guests</span>
            <span>{pendingCount} pending</span>
          </div>
          {declinedCount > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span>Declined</span>
              <span>{declinedCount}</span>
            </div>
          ) : null}
        </div>
        {allAccepted ? (
          <div className="mt-3 rounded-[14px] border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
            <CheckCircle2 className="h-5 w-5" />
            <p className="mt-2 text-sm font-black">All guests accepted</p>
            <p className="mt-1 text-xs font-bold leading-5">
              The shared taxi quote is ready in demo mode.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-[18px] border border-sky-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(15,23,42,0.18))] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[var(--rp-text)]">
              {paymentMode === "stripe_test" ? "Accept quote with test payment" : "Accept taxi quote"}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              {paymentMode === "stripe_test"
                ? "Use Stripe test mode to confirm this quote acceptance."
                : "Accept this shared taxi quote for the demo."}
            </p>
          </div>
          <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">
            {paymentMode === "stripe_test" ? "Stripe test mode" : "Demo acceptance"}
          </Badge>
        </div>

        <dl className="mt-3 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3">
          <MoneyRow label="Taxi partner quote" value={formatHkdCents(moneyDisplay.quoteAmountCents)} />
          <MoneyRow label="Fare share" value={formatHkdCents(moneyDisplay.fareShareCents)} />
          <MoneyRow label="RidePod fee" value={formatHkdCents(moneyDisplay.platformFeeCents)} />
          <MoneyRow label="Your total" value={totalLabel} strong />
        </dl>
        <p className="mt-2 text-xs font-bold leading-5 text-sky-100">
          {ridePodPricingCopy.taxiQuoteSeparate} RidePod fee is shown separately.
        </p>

        {paymentMode === "stripe_test" ? (
          <>
            <p className="mt-3 rounded-[14px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
              Stripe test mode only. No live money is charged.
            </p>
            <button
              type="button"
              disabled={creatingTestPayment || userAccepted || userDeclined || stripeTestIntentReady}
              onClick={handleCreateTestPayment}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[14px] border border-sky-400/30 bg-sky-400/10 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-400/15 disabled:border-[var(--rp-border)] disabled:bg-[var(--rp-card-muted)] disabled:text-[var(--rp-muted)]"
            >
              {creatingTestPayment ? "Creating test payment..." : "Continue to test payment"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              This records quote acceptance for the demo. No live money is charged.
            </p>
            <button
              type="button"
              disabled={userAccepted || userDeclined}
              onClick={() => {
                setUnderstandsMockPayment(false);
                setShowAcceptModal(true);
              }}
              className={cn(
                "mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-black shadow-[0_14px_28px_rgba(14,165,233,0.22)] transition",
                userAccepted
                  ? "bg-[var(--rp-card-muted)] text-[var(--rp-muted)]"
                  : "bg-sky-500 text-white hover:bg-sky-400",
              )}
            >
              <WalletCards className="h-4 w-4" /> {quoteAboveCap ? "Accept higher quote" : "Accept quote in demo"}
            </button>
          </>
        )}
        {paymentMode === "stripe_test" && testPaymentIntent ? (
          <details className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <summary className="cursor-pointer text-xs font-black text-sky-200">Test details</summary>
            {testPaymentIntent.ok ? (
              <div className="mt-3 grid gap-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                <p className="font-black text-sky-200">Test PaymentIntent created</p>
                <p>Intent: {testPaymentIntent.paymentIntentId}</p>
                <p>Status: {testPaymentIntent.status}</p>
                <p>Amount: {formatHkdCents(testPaymentIntent.amountCents)}</p>
              </div>
            ) : (
              <p className="text-xs font-bold leading-5 text-[var(--rp-warning)]">{testPaymentIntent.message}</p>
            )}
          </details>
        ) : null}
        {paymentMode === "stripe_test" && testPaymentIntent?.ok && testPaymentIntent.clientSecret && !userAccepted ? (
          <div className="mt-4 grid gap-3">
            <p className="rounded-[14px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
              Use Stripe test card details. Do not use a real card. Test card: 4242 4242 4242 4242.
            </p>
            <RidePodTestPaymentElement
              clientSecret={testPaymentIntent.clientSecret}
              disabled={userAccepted || userDeclined}
              onConfirmed={handleTestPaymentConfirmed}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 min-[520px]:grid-cols-2">
        <button
          type="button"
          disabled={userDeclined || userAccepted}
          onClick={() => setShowDeclineModal(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-sky-400/30 bg-sky-400/10 px-5 text-sm font-black text-sky-200 transition hover:bg-sky-400/15 disabled:text-[var(--rp-muted)]"
        >
          <XCircle className="h-4 w-4" /> Decline
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <p className="text-sm font-black text-[var(--rp-success)]">{message}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            {userAccepted
              ? allAccepted
                ? "Ready for pickup."
                : "Waiting for other guests to accept."
              : "The organizer may request another quote."}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-xs font-black text-sky-300">
        Next: guests accept the shared taxi quote.
      </p>

      {showAcceptModal ? (
        <AcceptanceModal
          title={quoteAboveCap ? "Quote above fare cap" : "Accept taxi quote"}
          body={
            quoteAboveCap
              ? "This quote is above the original fare cap. Accept only if you agree to the higher amount."
              : "Accept this shared taxi quote for the demo."
          }
          confirmLabel={quoteAboveCap ? "Accept higher quote" : "Accept quote in demo"}
          confirmDisabled={!understandsMockPayment}
          onCancel={() => setShowAcceptModal(false)}
          onConfirm={handleAcceptQuote}
        >
          <dl className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <MoneyRow label="Fare share" value={formatHkdCents(moneyDisplay.fareShareCents)} />
            <MoneyRow label="RidePod fee" value={formatHkdCents(moneyDisplay.platformFeeCents)} />
            <MoneyRow label="Total" value={totalLabel} strong />
            <MoneyRow label="Taxi partner" value={baseRequest.quotedByPartnerName ?? "Demo Taxi Partner"} />
            <MoneyRow label="Quote expiry" value={formatQuoteExpiry(baseRequest.quoteExpiresAt)} />
          </dl>
          <label className="mt-4 flex gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            <input
              type="checkbox"
              checked={understandsMockPayment}
              onChange={(event) => setUnderstandsMockPayment(event.target.checked)}
              className="mt-1 h-4 w-4 accent-sky-500"
            />
            <span>
              {quoteAboveCap
                ? "I understand this is a demo acceptance of a higher quote."
                : "I understand this is a demo acceptance."}
            </span>
          </label>
        </AcceptanceModal>
      ) : null}

      {showDeclineModal ? (
        <AcceptanceModal
          title="Decline taxi quote?"
          body="The organizer may request another quote or choose another option."
          confirmLabel="Decline quote"
          onCancel={() => setShowDeclineModal(false)}
          onConfirm={handleDeclineQuote}
        />
      ) : null}
    </section>
  );
}
