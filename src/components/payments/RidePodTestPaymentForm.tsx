"use client";

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { PaymentIntent, StripePaymentElementOptions } from "@stripe/stripe-js";
import { useState } from "react";
import { cn } from "@/components/ui";
import type { TaxiPartnerMockPaymentState } from "@/lib/taxi-partner-quote";

const paymentElementOptions: StripePaymentElementOptions = {
  layout: "tabs",
};

function mapStripePaymentIntentStatus(status: PaymentIntent.Status): TaxiPartnerMockPaymentState {
  if (status === "requires_capture") return "TEST_REQUIRES_CAPTURE";
  if (status === "succeeded") return "TEST_SUCCEEDED";
  if (status === "canceled") return "TEST_CANCELED";
  if (status === "requires_payment_method") return "TEST_REQUIRES_PAYMENT_METHOD";

  return "TEST_PAYMENT_CONFIRMED";
}

export function RidePodTestPaymentForm({
  disabled,
  onConfirmed,
}: {
  disabled?: boolean;
  onConfirmed: (result: {
    paymentIntentId: string;
    status: PaymentIntent.Status;
    mockPaymentState: TaxiPartnerMockPaymentState;
    message: string;
  }) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  async function confirmTestPayment() {
    if (!stripe || !elements || disabled) return;

    setState({ loading: true, error: null });
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error || !result.paymentIntent) {
      setState({
        loading: false,
        error: "Couldn’t confirm test payment. Try again.",
      });
      return;
    }

    const mockPaymentState = mapStripePaymentIntentStatus(result.paymentIntent.status);
    onConfirmed({
      paymentIntentId: result.paymentIntent.id,
      status: result.paymentIntent.status,
      mockPaymentState,
      message:
        result.paymentIntent.status === "requires_capture"
          ? "Test authorization complete. Capture is not implemented in this slice."
          : "Test payment confirmed. No live money was charged.",
    });
    setState({ loading: false, error: null });
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[16px] border border-sky-400/20 bg-[var(--rp-card-soft)] p-3">
        <PaymentElement options={paymentElementOptions} />
      </div>
      {state.error ? (
        <p className="rounded-[14px] border border-[var(--rp-danger)] bg-[var(--rp-danger-bg)] p-3 text-xs font-bold leading-5 text-[var(--rp-danger)]">
          {state.error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!stripe || !elements || state.loading || disabled}
        onClick={confirmTestPayment}
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-sm font-black transition",
          !stripe || !elements || state.loading || disabled
            ? "border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]"
            : "bg-sky-500 text-white shadow-[0_14px_28px_rgba(14,165,233,0.22)] hover:bg-sky-400",
        )}
      >
        {state.loading ? "Confirming..." : "Confirm test payment"}
      </button>
    </div>
  );
}
