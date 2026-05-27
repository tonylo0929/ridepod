"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, Plane, Share2 } from "lucide-react";
import { cn } from "@/components/ui";
import type { HomeRide, QuoteStatus } from "@/lib/home-ride-mock";
import { getTaxiPartnerQuoteMoneyDisplay } from "@/lib/taxi-partner-quote";
import { useEffect, useId, useState } from "react";

export type PodDetailJoinView = QuoteStatus | "quote_accepted" | "all_accepted" | "quote_declined";

export const podDetailQuoteCopy: Record<PodDetailJoinView, { title: string; text: string }> = {
  quote_pending: {
    title: "Waiting for taxi partner quote",
    text: "Lock your seat while the taxi partner quote is pending.",
  },
  quote_ready: {
    title: "Quote ready",
    text: "Taxi partner submitted a shared quote. Guests must accept before the ride proceeds.",
  },
  full: {
    title: "Pod full",
    text: "Join the waitlist if a seat opens.",
  },
  joined: {
    title: "Seat locked",
    text: "We'll notify you when the taxi partner quote is ready.",
  },
  quote_accepted: {
    title: "Quote accepted",
    text: "Waiting for other guests to accept the selected taxi quote.",
  },
  all_accepted: {
    title: "All guests accepted",
    text: "The shared taxi quote is accepted. The ride is ready for pickup in demo mode.",
  },
  quote_declined: {
    title: "Quote declined",
    text: "The organizer may request another quote.",
  },
};

export function usePodDetailJoinState(ride: HomeRide) {
  const [joined, setJoined] = useState(ride.currentUserJoined === true || ride.quoteStatus === "joined");
  const [seatsUsed, setSeatsUsed] = useState(ride.seatsUsed);
  const [quoteAccepted, setQuoteAccepted] = useState(ride.currentUserQuoteAccepted === true);
  const [quoteDeclined, setQuoteDeclined] = useState(ride.guestAcceptanceStatus === "DECLINED");
  const [acceptedGuestCount, setAcceptedGuestCount] = useState(
    ride.acceptedGuestCount ?? (ride.currentUserQuoteAccepted ? 1 : 0),
  );
  const full = !joined && (ride.quoteStatus === "full" || seatsUsed >= ride.seatsTotal);
  const requiredGuestCount = ride.requiredGuestCount ?? ride.seatsTotal;
  const allAccepted = ride.quoteStatus === "quote_ready" && acceptedGuestCount >= requiredGuestCount;
  const joinView: PodDetailJoinView = full
    ? "full"
    : allAccepted
      ? "all_accepted"
      : quoteDeclined
        ? "quote_declined"
        : quoteAccepted
          ? "quote_accepted"
          : ride.quoteStatus === "quote_ready"
            ? "quote_ready"
            : joined
              ? "joined"
              : ride.quoteStatus;

  return {
    seatsUsed,
    joinView,
    acceptedGuestCount,
    requiredGuestCount,
    lockSeat: () => {
      setJoined(true);
      setSeatsUsed((currentSeats) => Math.min(currentSeats + 1, ride.seatsTotal));
    },
    acceptQuote: () => {
      setQuoteDeclined(false);
      setQuoteAccepted(true);
      setAcceptedGuestCount((currentCount) => Math.min(currentCount + 1, requiredGuestCount));
    },
    declineQuote: () => {
      setQuoteAccepted(false);
      setQuoteDeclined(true);
    },
  };
}

export function formatHkdCents(cents: number) {
  return `HK$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export function getPodDetailQuoteMoney(ride: HomeRide) {
  return getTaxiPartnerQuoteMoneyDisplay(
    {
      quoteAmountCents: ride.quoteAmountCents ?? 24000,
      currency: "HKD",
    },
    ride.requiredGuestCount ?? ride.seatsTotal,
  );
}

function getQuoteExpiryLabel(ride: HomeRide) {
  if (ride.quoteExpiresInMinutes) return `Expires in ${ride.quoteExpiresInMinutes} min`;

  return "Expires in 15 min";
}

function PrimaryCta({
  children,
  href,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] text-base font-black",
    disabled
      ? "border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]"
      : "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)]",
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--rp-border)] py-2.5 last:border-b-0">
      <dt className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</dt>
      <dd className="max-w-[64%] text-right text-sm font-black text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

function airportBadgeLabel(ride: HomeRide) {
  if (ride.airportDirection === "to_airport") return "To Airport";
  if (ride.airportDirection === "from_airport") return "From Airport";
  return null;
}

function LockSeatConfirmationModal({
  ride,
  seatsUsed,
  checked,
  onCheckedChange,
  onCancel,
  onConfirm,
}: {
  ride: HomeRide;
  seatsUsed: number;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const badge = airportBadgeLabel(ride);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-2xl font-black leading-tight">
              Lock your seat?
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              You&apos;ll join this shared taxi pod and reserve one seat.
            </p>
          </div>
          {badge ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/15 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-300">
              <Plane className="h-3.5 w-3.5" />
              {badge}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          <p>No live payment is charged now. Final share appears after the taxi partner quote.</p>
          <p>Guests must accept the selected quote before the ride proceeds.</p>
        </div>

        <dl className="mt-5 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <SummaryRow label="Route" value={`${ride.fromLabel} \u2192 ${ride.toLabel}`} />
          <SummaryRow label="Date/time" value={`${ride.dateLabel} \u00b7 ${ride.timeLabel}`} />
          <SummaryRow label="Estimated share" value={`HK$${ride.pricePerPerson} per person`} />
          <SummaryRow label="Seats" value={`${seatsUsed} / ${ride.seatsTotal} seats filled`} />
          <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            Estimated share may change after taxi partner quote.
          </p>
        </dl>

        <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
          />
          <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
            I understand no live payment is charged now.
          </span>
        </label>

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
            disabled={!checked}
            onClick={onConfirm}
            className={cn(
              "min-h-12 rounded-2xl border text-sm font-black transition",
              checked
                ? "border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] hover:brightness-105"
                : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
            )}
          >
            Lock my seat
          </button>
        </div>
      </section>
    </div>
  );
}

function QuoteMoneyRows({ ride, compact = false }: { ride: HomeRide; compact?: boolean }) {
  const money = getPodDetailQuoteMoney(ride);
  if (!money) return null;

  const rows = compact
    ? [
        ["Taxi partner", ride.taxiPartnerName ?? "Demo Taxi Partner"],
        ["Taxi type", ride.taxiType],
        ["Taxi partner quote", formatHkdCents(money.quoteAmountCents)],
        ["Fare share", formatHkdCents(money.fareShareCents)],
        ["Platform fee", formatHkdCents(money.platformFeeCents)],
        ["Your total", formatHkdCents(money.guestChargeCents)],
        ["Quote expiry", getQuoteExpiryLabel(ride)],
      ]
    : [
        ["Taxi partner", ride.taxiPartnerName ?? "Demo Taxi Partner"],
        ["Taxi type", ride.taxiType],
        ["Taxi partner quote", formatHkdCents(money.quoteAmountCents)],
        ["Fare share", formatHkdCents(money.fareShareCents)],
        ["Platform fee", formatHkdCents(money.platformFeeCents)],
        ["Your total", formatHkdCents(money.guestChargeCents)],
        ["Quote expiry", getQuoteExpiryLabel(ride)],
      ];

  return (
    <dl className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      {rows.map(([label, value]) => (
        <SummaryRow key={label} label={label} value={value} />
      ))}
    </dl>
  );
}

export function QuoteReadySummary({
  ride,
  joinView,
  acceptedGuestCount,
  requiredGuestCount,
}: {
  ride: HomeRide;
  joinView: PodDetailJoinView;
  acceptedGuestCount: number;
  requiredGuestCount: number;
}) {
  if (!["quote_ready", "quote_accepted", "all_accepted", "quote_declined"].includes(joinView)) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3">
      {ride.quoteAboveCap ? (
        <div className="rounded-[16px] border border-amber-300/30 bg-amber-400/12 p-3">
          <p className="text-sm font-black text-amber-200">Quote above fare cap</p>
          <p className="mt-1 text-xs font-bold leading-5 text-amber-100">
            This quote is above the original fare cap. Accept only if you agree to the higher amount.
          </p>
        </div>
      ) : null}
      <QuoteMoneyRows ride={ride} />
      <div className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
          Quote acceptance
        </p>
        <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">
          {acceptedGuestCount} / {requiredGuestCount} guests accepted
        </p>
      </div>
      {ride.airportDirection ? (
        <p className="rounded-[14px] border border-blue-300/15 bg-blue-400/10 p-3 text-sm font-semibold leading-6 text-blue-100">
          Airport tolls and luggage space are included in the quote.
        </p>
      ) : null}
    </div>
  );
}

function QuoteReviewModal({
  ride,
  acceptedGuestCount,
  requiredGuestCount,
  checked,
  onCheckedChange,
  onCancel,
  onConfirm,
  onDeclineRequest,
}: {
  ride: HomeRide;
  acceptedGuestCount: number;
  requiredGuestCount: number;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onDeclineRequest: () => void;
}) {
  const titleId = useId();
  const badge = airportBadgeLabel(ride);
  const aboveCap = ride.quoteAboveCap === true;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-2xl font-black leading-tight">
              {aboveCap ? "Quote above fare cap" : "Accept taxi quote?"}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              {aboveCap
                ? "This quote is above the original fare cap. Accept only if you agree to the higher amount."
                : "You're accepting the selected taxi partner quote for this shared pod."}
            </p>
          </div>
          {badge ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/15 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-300">
              <Plane className="h-3.5 w-3.5" />
              {badge}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3">
          <QuoteMoneyRows ride={ride} compact />
          <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            This records quote acceptance for the demo. No live money is charged.
          </p>
          <p className="text-xs font-bold text-[var(--rp-muted)]">
            {acceptedGuestCount} / {requiredGuestCount} guests accepted before your response.
          </p>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
          />
          <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
            {aboveCap
              ? "I understand this is a demo acceptance of a higher quote."
              : "I understand no live payment is charged now."}
          </span>
        </label>

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
            disabled={!checked}
            onClick={onConfirm}
            className={cn(
              "min-h-12 rounded-2xl border text-sm font-black transition",
              checked
                ? "border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] hover:brightness-105"
                : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
            )}
          >
            {aboveCap ? "Accept higher quote" : "Accept quote"}
          </button>
        </div>
        <button
          type="button"
          onClick={onDeclineRequest}
          className="mt-3 min-h-10 w-full rounded-2xl text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
        >
          Decline quote
        </button>
      </section>
    </div>
  );
}

function DeclineQuoteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.74)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-[420px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <h2 id={titleId} className="text-2xl font-black leading-tight">
          Decline taxi quote?
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          The organizer may request another quote.
        </p>
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
            onClick={onConfirm}
            className="min-h-12 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-soft)]"
          >
            Decline quote
          </button>
        </div>
      </section>
    </div>
  );
}

function SecondaryCta({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function StickyPodDetailCta({
  ride,
  seatsUsed,
  joinView,
  acceptedGuestCount,
  requiredGuestCount,
  onLockSeat,
  onAcceptQuote,
  onDeclineQuote,
}: {
  ride: HomeRide;
  seatsUsed: number;
  joinView: PodDetailJoinView;
  acceptedGuestCount: number;
  requiredGuestCount: number;
  onLockSeat: () => void;
  onAcceptQuote: () => void;
  onDeclineQuote: () => void;
}) {
  const [showLockModal, setShowLockModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [understood, setUnderstood] = useState(false);

  function closeLockModal() {
    setShowLockModal(false);
    setUnderstood(false);
  }

  function confirmLockSeat() {
    if (!understood) return;
    onLockSeat();
    closeLockModal();
  }

  function closeQuoteModal() {
    setShowQuoteModal(false);
    setUnderstood(false);
  }

  function confirmAcceptQuote() {
    if (!understood) return;
    onAcceptQuote();
    closeQuoteModal();
  }

  function confirmDeclineQuote() {
    onDeclineQuote();
    setShowDeclineModal(false);
    closeQuoteModal();
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-3 lg:bottom-0 lg:left-72">
        <div className="mx-auto max-w-[520px] rounded-[24px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_94%,transparent)] p-3 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl">
          {joinView === "quote_pending" ? (
            <div className="grid gap-2">
              <PrimaryCta onClick={() => setShowLockModal(true)}>
                <Clock3 className="h-5 w-5" />
                Lock my seat
              </PrimaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Final share is confirmed after the taxi partner quote.
              </p>
              <SecondaryCta>
                <Share2 className="h-4 w-4" />
                Share pod
              </SecondaryCta>
            </div>
          ) : null}

          {joinView === "joined" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <CheckCircle2 className="h-5 w-5" />
                You joined this pod
              </PrimaryCta>
              <SecondaryCta href="#quote-status">View updates</SecondaryCta>
            </div>
          ) : null}

          {joinView === "full" ? (
            <PrimaryCta
              onClick={() => {
                // TODO: Add waitlist placeholder flow when mock waitlist state exists.
              }}
            >
              <Clock3 className="h-5 w-5" />
              Join waitlist
            </PrimaryCta>
          ) : null}

          {joinView === "quote_ready" ? (
            <div className="grid gap-2">
              <PrimaryCta onClick={() => setShowQuoteModal(true)}>
                <CheckCircle2 className="h-5 w-5" />
                {ride.quoteAboveCap ? "Accept higher quote" : "Review quote"}
              </PrimaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Guests must accept the selected quote before the ride proceeds.
              </p>
            </div>
          ) : null}

          {joinView === "quote_accepted" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <CheckCircle2 className="h-5 w-5" />
                Quote accepted
              </PrimaryCta>
              <SecondaryCta href="#quote-status">View updates</SecondaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Waiting for other guests to accept.
              </p>
            </div>
          ) : null}

          {joinView === "all_accepted" ? (
            <div className="grid gap-2">
              {/* TODO: Route to pickup page when the demo pickup flow exists. */}
              <PrimaryCta href="#quote-status">
                <CheckCircle2 className="h-5 w-5" />
                View pickup
              </PrimaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                All guests accepted the selected quote.
              </p>
            </div>
          ) : null}

          {joinView === "quote_declined" ? (
            <div className="grid gap-2">
              <PrimaryCta disabled>
                <Clock3 className="h-5 w-5" />
                Quote declined
              </PrimaryCta>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                The organizer may request another quote.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {showLockModal && joinView === "quote_pending" ? (
        <LockSeatConfirmationModal
          ride={ride}
          seatsUsed={seatsUsed}
          checked={understood}
          onCheckedChange={setUnderstood}
          onCancel={closeLockModal}
          onConfirm={confirmLockSeat}
        />
      ) : null}

      {showQuoteModal && joinView === "quote_ready" ? (
        <QuoteReviewModal
          ride={ride}
          acceptedGuestCount={acceptedGuestCount}
          requiredGuestCount={requiredGuestCount}
          checked={understood}
          onCheckedChange={setUnderstood}
          onCancel={closeQuoteModal}
          onConfirm={confirmAcceptQuote}
          onDeclineRequest={() => setShowDeclineModal(true)}
        />
      ) : null}

      {showDeclineModal ? (
        <DeclineQuoteModal
          onCancel={() => setShowDeclineModal(false)}
          onConfirm={confirmDeclineQuote}
        />
      ) : null}
    </>
  );
}
