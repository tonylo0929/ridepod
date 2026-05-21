"use client";

import { Elements } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { RidePodTestPaymentForm } from "@/components/payments/RidePodTestPaymentForm";
import { getRidePodStripeTestPromise } from "@/lib/payments/stripe-client";
import type { TaxiPartnerMockPaymentState } from "@/lib/taxi-partner-quote";

export function RidePodTestPaymentElement({
  clientSecret,
  disabled,
  onConfirmed,
}: {
  clientSecret: string;
  disabled?: boolean;
  onConfirmed: (result: {
    paymentIntentId: string;
    status: string;
    mockPaymentState: TaxiPartnerMockPaymentState;
    message: string;
  }) => void;
}) {
  const stripePromise = getRidePodStripeTestPromise();

  if (!stripePromise) {
    return (
      <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
        Stripe test key is not configured. Using mock payment state.
      </p>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#0ea5e9",
        borderRadius: "14px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <RidePodTestPaymentForm disabled={disabled} onConfirmed={onConfirmed} />
    </Elements>
  );
}

