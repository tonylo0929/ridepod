"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Repeat2,
  Share2,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { HomeRide } from "@/lib/home-ride-mock";
import {
  podDetailQuoteCopy,
  QuoteReadySummary,
  StickyPodDetailCta,
  usePodDetailJoinState,
} from "@/components/pod-detail-join-state";

function RecurringCard({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_92%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--rp-border)] py-3 last:border-b-0">
      <dt className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</dt>
      <dd className="max-w-[62%] text-right text-sm font-black leading-5 text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

function tripPatternLabel(ride: HomeRide) {
  return ride.tripPattern === "back_and_forth" ? "Back-and-forth" : "One-way";
}

function scheduleLabel(ride: HomeRide) {
  return ride.scheduleLabel ?? `${ride.repeatsPattern ?? ride.dateLabel} \u00b7 ${ride.timeLabel}`;
}

function whoCanJoinLabel(ride: HomeRide) {
  return ride.podType === "Women-only" ? "Women-only pod" : ride.podType;
}

function LockRecurringSeatModal({
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
        <h2 id={titleId} className="text-2xl font-black leading-tight">
          Lock recurring seat?
        </h2>
        <div className="mt-3 grid gap-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          <p>You&apos;ll join this recurring shared taxi pod and reserve one seat.</p>
          <p>Each ride gets its own taxi partner quote before guests accept.</p>
          <p>No live payment is charged now.</p>
        </div>

        <dl className="mt-5 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <DetailRow label="Route" value={`${ride.fromLabel} \u2192 ${ride.toLabel}`} />
          <DetailRow label="Schedule" value={scheduleLabel(ride)} />
          <DetailRow label="Est. share" value={`HK$${ride.pricePerPerson} per person`} />
          <DetailRow label="Seats" value={`${seatsUsed} / ${ride.seatsTotal} seats filled`} />
        </dl>

        <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
          />
          <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
            I understand each ride has its own quote before it proceeds.
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
            Lock recurring seat
          </button>
        </div>
      </section>
    </div>
  );
}

function RecurringStickyCta({
  ride,
  seatsUsed,
  joined,
  onLock,
}: {
  ride: HomeRide;
  seatsUsed: number;
  joined: boolean;
  onLock: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState(false);
  const full = !joined && seatsUsed >= ride.seatsTotal;
  const quoteReady = ride.quoteStatus === "quote_ready";
  const accepted = ride.currentUserQuoteAccepted === true;

  function closeModal() {
    setShowModal(false);
    setChecked(false);
  }

  function confirm() {
    if (!checked) return;
    onLock();
    closeModal();
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-3 lg:bottom-0 lg:left-72">
        <div className="mx-auto max-w-[520px] rounded-[24px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_94%,transparent)] p-3 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl">
          {full ? (
            <button type="button" className="flex min-h-14 w-full items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)]">
              Join waitlist
            </button>
          ) : quoteReady && accepted ? (
            <button type="button" disabled className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-base font-black text-[var(--rp-muted-strong)]">
              <CheckCircle2 className="h-5 w-5" />
              Quote accepted
            </button>
          ) : quoteReady ? (
            <a href="#quote-status" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)]">
              <CheckCircle2 className="h-5 w-5" />
              Review quote
            </a>
          ) : joined ? (
            <div className="grid gap-2">
              <button type="button" disabled className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-base font-black text-[var(--rp-muted-strong)]">
                <CheckCircle2 className="h-5 w-5" />
                You joined this recurring pod
              </button>
              <a href="#quote-status" className="flex min-h-12 w-full items-center justify-center rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-primary)]">
                View updates
              </a>
            </div>
          ) : (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)]"
              >
                <Repeat2 className="h-5 w-5" />
                Lock recurring seat
              </button>
              <p className="px-2 text-center text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Final share appears after each taxi partner quote.
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal ? (
        <LockRecurringSeatModal
          ride={ride}
          seatsUsed={seatsUsed}
          checked={checked}
          onCheckedChange={setChecked}
          onCancel={closeModal}
          onConfirm={confirm}
        />
      ) : null}
    </>
  );
}

export function RecurringPodDetailPage({ ride }: { ride: HomeRide }) {
  const [joined, setJoined] = useState(ride.currentUserJoined === true || ride.quoteStatus === "joined");
  const [seatsUsed, setSeatsUsed] = useState(ride.seatsUsed);
  const quoteState = usePodDetailJoinState(ride);
  const progress = Math.min((seatsUsed / ride.seatsTotal) * 100, 100);
  const recurringSeatLocked = joined && ride.quoteStatus !== "quote_ready";
  const recurringQuoteView = ["quote_ready", "quote_accepted", "all_accepted", "quote_declined"].includes(
    quoteState.joinView,
  );
  const currentQuoteStatus = podDetailQuoteCopy[quoteState.joinView];
  const quoteTitle = recurringSeatLocked
    ? "Recurring seat locked"
    : recurringQuoteView
      ? currentQuoteStatus.title
      : "Waiting for taxi partner quote";
  const quoteBody = recurringSeatLocked
    ? "We'll notify you when the next taxi partner quote is ready."
    : recurringQuoteView
      ? currentQuoteStatus.text
      : "Each ride gets its own taxi partner quote before guests accept.";

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden pb-48 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <div className="mx-auto w-full max-w-[520px] lg:pt-4">
        <header className="relative z-20 flex h-12 items-center justify-between px-4">
          <Link href="/home" aria-label="Back to Home" className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-lg font-semibold text-[var(--rp-text)]">Pod details</h1>
          <button type="button" aria-label="Share pod" className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]">
            <Share2 className="h-5 w-5" />
          </button>
        </header>

        <main className="relative z-10 grid gap-3 px-4">
          <section className="relative -mx-4 -mt-12 overflow-hidden rounded-b-[28px] border-b border-[var(--rp-border)] bg-[var(--rp-shell)] shadow-[var(--rp-shadow-soft)]">
            <div className="relative min-h-[390px] pt-12">
              <Image
                src="/images/ridepod/pod-detail-hong-kong-skyline.png"
                alt="Hong Kong skyline at night"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,18,0.16)_0%,rgba(5,11,18,0.24)_36%,rgba(5,11,18,0.82)_78%,rgba(5,11,18,0.98)_100%)]" />

              <div className="relative z-10 flex justify-end gap-2 px-5 pt-14">
                <span className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] px-4 py-2 text-sm font-black text-[var(--rp-primary)]">
                  <Repeat2 className="h-4 w-4" />
                  Recurring
                </span>
                <span className="inline-flex items-center rounded-[18px] border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white">
                  {tripPatternLabel(ride)}
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5">
                <h2 className="max-w-full whitespace-nowrap text-[30px] font-black leading-none tracking-tight text-white min-[390px]:text-[34px]">
                  {ride.fromLabel} {"\u2192"} {ride.toLabel}
                </h2>
                <p className="mt-4 text-lg font-semibold text-[var(--rp-muted-strong)]">
                  {scheduleLabel(ride)}
                </p>
              </div>
            </div>
          </section>

          <RecurringCard className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="min-w-0 pr-3">
              <p className="flex items-center gap-2 text-lg font-black text-[var(--rp-text)]">
                <UsersRound className="h-5 w-5" />
                {seatsUsed} / {ride.seatsTotal} seats filled
              </p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/14">
                <div className="h-full rounded-full bg-[var(--rp-primary)]" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="min-w-[132px] border-l border-[var(--rp-border)] pl-4 text-right">
              <p className="text-base font-semibold text-[var(--rp-muted-strong)]">Est. share</p>
              <p className="mt-1 text-3xl font-black leading-none text-[var(--rp-text)]">HK${ride.pricePerPerson}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">per person</p>
            </div>
          </RecurringCard>

          <RecurringCard>
            <h2 className="text-xl font-black text-[var(--rp-text)]">Recurring schedule</h2>
            <dl className="mt-3">
              <DetailRow label="Repeats" value={ride.repeatsPattern ?? ride.dateLabel} />
              <DetailRow label="Trip pattern" value={tripPatternLabel(ride)} />
              <DetailRow label="Starts" value={ride.startLabel ?? "May 27, 2026"} />
              <DetailRow label="Ends" value={ride.endLabel ?? "After 8 rides"} />
              {ride.tripPattern === "back_and_forth" ? (
                <>
                  <DetailRow label="Outbound" value={ride.outboundLabel ?? `${ride.timeLabel} \u00b7 ${ride.fromLabel} \u2192 ${ride.toLabel}`} />
                  <DetailRow label="Return" value={ride.returnLabel ?? `6:00 PM \u00b7 ${ride.toLabel} \u2192 ${ride.fromLabel}`} />
                </>
              ) : null}
            </dl>
          </RecurringCard>

          <RecurringCard>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[var(--rp-text)]">Upcoming rides</h2>
              {ride.upcomingRides && ride.upcomingRides.length > 3 ? (
                <button type="button" className="text-sm font-black text-[var(--rp-primary)]">View all</button>
              ) : null}
            </div>
            {ride.upcomingRides?.length ? (
              <div className="mt-4 grid gap-3">
                {ride.upcomingRides.slice(0, 5).map((item) => (
                  <div key={`${item.date}-${item.time}-${item.label}`} className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
                    <p className="text-sm font-black text-[var(--rp-text)]">{item.date}</p>
                    <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">{item.time}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Upcoming ride dates will appear after the recurring pod is created.
              </p>
            )}
          </RecurringCard>

          <RecurringCard>
            <h2 className="text-xl font-black text-[var(--rp-text)]">Trip details</h2>
            <dl className="mt-3">
              <DetailRow label="Pickup" value={ride.pickupLabel ?? ride.fromLabel} />
              <DetailRow label="Dropoff" value={ride.dropoffLabel ?? ride.toLabel} />
              <DetailRow label="Taxi type" value={ride.taxiType} />
              <DetailRow label="Luggage" value={ride.luggage} />
              <DetailRow label="Who can join" value={whoCanJoinLabel(ride)} />
            </dl>
          </RecurringCard>

          <RecurringCard>
            <h2 className="text-xl font-black text-[var(--rp-text)]">How recurring pods work</h2>
            <div className="mt-4 grid gap-3">
              {["Lock recurring seat", "Each ride gets a quote", "Guests accept quote", "Ride proceeds"].map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--rp-primary)] text-sm font-black text-[var(--rp-primary-text)]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-black text-[var(--rp-text)]">{step}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Recurring pods repeat on your selected days. Each ride is reviewed separately.
            </p>
          </RecurringCard>

          <RecurringCard
            id="quote-status"
            className="scroll-mt-28 border-[var(--rp-border-strong)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rp-primary)_9%,transparent),var(--rp-card-soft))]"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] text-[var(--rp-primary)]">
                <Clock3 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-base font-black text-[var(--rp-text)]">Quote status</p>
                <h2 className="mt-2 text-xl font-black text-[var(--rp-text)]">{quoteTitle}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{quoteBody}</p>
                <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Each ride has its own quote, guest acceptance, and review state. No live payment is charged now.
                </p>
                <QuoteReadySummary
                  ride={ride}
                  joinView={quoteState.joinView}
                  acceptedGuestCount={quoteState.acceptedGuestCount}
                  requiredGuestCount={quoteState.requiredGuestCount}
                />
              </div>
            </div>
          </RecurringCard>
        </main>
      </div>

      {recurringQuoteView ? (
        <StickyPodDetailCta
          ride={ride}
          seatsUsed={quoteState.seatsUsed}
          joinView={quoteState.joinView}
          acceptedGuestCount={quoteState.acceptedGuestCount}
          requiredGuestCount={quoteState.requiredGuestCount}
          onLockSeat={quoteState.lockSeat}
          onAcceptQuote={quoteState.acceptQuote}
          onDeclineQuote={quoteState.declineQuote}
        />
      ) : (
        <RecurringStickyCta
          ride={ride}
          seatsUsed={seatsUsed}
          joined={joined}
          onLock={() => {
            setJoined(true);
            setSeatsUsed((currentSeats) => Math.min(currentSeats + 1, ride.seatsTotal));
          }}
        />
      )}
    </div>
  );
}
