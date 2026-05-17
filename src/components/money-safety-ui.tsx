import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CarFront,
  CheckCircle2,
  Clock3,
  FileImage,
  FileText,
  LockKeyhole,
  ReceiptText,
  RefreshCcw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
  Venus,
  XCircle,
} from "lucide-react";
import { HostReplacementActionsScreen } from "@/components/host-replacement-actions-screen";
import { RidePodLogo } from "@/components/ridepod-logo";
import { cn } from "@/components/ui";
import {
  canHostBook,
  detectOffAppPaymentMessage,
  formatCents,
  getMoneySafetySnapshot,
  getSafetyBadges,
} from "@/lib/money-safety";
import { formatMoney, type RidePod } from "@/lib/mock-data";
import {
  getHostBookingSummary,
  getMockSettlementPreview,
  getProtectedPod,
  getProtectedPodOrFallback,
} from "@/lib/money-safety-mock";

const quoteApprovedCanBookCopy = "Quote approved. You may book the external ride.";

function getDisplayMoneyStatus({
  canBook,
  confirmedSeats,
  requiredSeats,
}: {
  canBook: boolean;
  confirmedSeats: number;
  requiredSeats: number;
}) {
  if (canBook) return quoteApprovedCanBookCopy;
  if (confirmedSeats >= requiredSeats) return "All required participants are authorized";
  return "Host cannot book yet";
}

export function SafetyBadgeRow({ podId, className }: { podId: string; className?: string }) {
  const protectedPod = getProtectedPod(podId);
  const badges = protectedPod ? getSafetyBadges(protectedPod) : ["Mixed pod", "Open"];

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((badge) => (
        <span
          key={badge}
          className="inline-flex items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-2.5 py-1 text-[11px] font-black text-[var(--rp-primary)]"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

export function MoneyLockStatus({ podId, compact = false }: { podId: string; compact?: boolean }) {
  const protectedPod = getProtectedPod(podId);

  if (!protectedPod) {
    return (
      <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold text-[var(--rp-muted)]">
        Money state: payment authorization required before protected booking.
      </div>
    );
  }

  const snapshot = getMoneySafetySnapshot(protectedPod);
  const permission = canHostBook(protectedPod.replacementHostUserId ?? protectedPod.hostUserId, protectedPod);
  const displayStatus = getDisplayMoneyStatus({
    canBook: permission.canBook,
    confirmedSeats: snapshot.confirmedSeats,
    requiredSeats: protectedPod.minSeatsToBook,
  });

  return (
    <div className={cn("rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3", compact && "p-2.5")}>
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
        <div>
          <p className="text-sm font-black text-[var(--rp-text)]">{displayStatus}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--rp-muted)]">
            {snapshot.confirmedSeats}/{protectedPod.minSeatsToBook} participants payment-authorized.{" "}
            {snapshot.hostActionNeeded}. Chat and exact pickup unlock after seat lock.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PodDetailMoneyLockPanel({ podId }: { podId: string }) {
  const protectedPod = getProtectedPodOrFallback(podId);
  const snapshot = getMoneySafetySnapshot(protectedPod);
  const permission = canHostBook(protectedPod.replacementHostUserId ?? protectedPod.hostUserId, protectedPod);
  const statusText = getDisplayMoneyStatus({
    canBook: permission.canBook,
    confirmedSeats: snapshot.confirmedSeats,
    requiredSeats: protectedPod.minSeatsToBook,
  });

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Money lock status</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">
            {snapshot.confirmedSeats}/{protectedPod.minSeatsToBook} participants payment-authorized
          </p>
        </div>
        <SafetyBadgeRow podId={podId} />
      </div>
      <div
        className={cn(
          "mt-3 rounded-2xl px-3 py-2 text-sm font-black",
          permission.canBook
            ? "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)]"
            : "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]",
        )}
      >
        {statusText}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        {snapshot.exactDetailsUnlocked
          ? "Exact pickup is visible to confirmed participants."
          : "Exact pickup unlocks after seat lock."}
      </p>
    </section>
  );
}

export function MoneySafetyTimeline({ podId }: { podId: string }) {
  const protectedPod = getProtectedPodOrFallback(podId);
  const snapshot = getMoneySafetySnapshot(protectedPod);

  return (
    <section className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-[var(--rp-text)]">Money lock timeline</h2>
        <SafetyBadgeRow podId={podId} />
      </div>
      <div className="mt-4 grid gap-2">
        {snapshot.timeline.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border",
                item.complete
                  ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
              )}
            >
              {item.complete ? <CheckCircle2 className="h-4 w-4" /> : null}
            </span>
            <span className={cn("font-semibold", item.complete ? "text-[var(--rp-text)]" : "text-[var(--rp-muted)]")}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-[var(--rp-card-soft)] p-3 text-sm font-semibold text-[var(--rp-muted)]">
        Exact pickup details: {snapshot.exactDetailsUnlocked ? "Unlocked for confirmed participants." : "Exact pickup unlocks after seat lock."}
      </div>
    </section>
  );
}

function getRidePodAuthorizedCount(pod: RidePod) {
  return pod.members.filter((member) => ["authorized", "charged"].includes(member.paymentStatus)).length;
}

function prettyProvider(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatProtectedDeparture(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getHostQuoteState(pod: RidePod) {
  const protectedPod = getProtectedPod(pod.id);

  if (protectedPod) {
    const permission = canHostBook(protectedPod.replacementHostUserId ?? protectedPod.hostUserId, protectedPod);
    const snapshot = getMoneySafetySnapshot(protectedPod);
    const latestQuote = permission.latestQuote;
    const aboveMax = Boolean(latestQuote && latestQuote.quotedFareCents > protectedPod.approvedMaxTotalFareCents);
    const routeLabel = `${protectedPod.originGeneral} ??${protectedPod.destinationGeneral}`;
    const quotedFareCents = latestQuote?.quotedFareCents ?? protectedPod.estimatedTotalFareCents;

    return {
      canBook: permission.canBook,
      confirmed: snapshot.confirmedSeats,
      required: protectedPod.minSeatsToBook,
      approvedMax: formatCents(protectedPod.approvedMaxTotalFareCents, protectedPod.currency),
      approvedMaxCents: protectedPod.approvedMaxTotalFareCents,
      routeLabel,
      departureLabel: formatProtectedDeparture(protectedPod.departureAt),
      quoteUploaded: Boolean(latestQuote),
      quoteReviewState: latestQuote?.reviewState ?? "SUBMITTED",
      provider: latestQuote ? prettyProvider(latestQuote.providerName) : "Uber",
      vehicleType: latestQuote?.vehicleClass ?? pod.vehicleType,
      quotedFare: formatCents(quotedFareCents, protectedPod.currency),
      quotedFareCents,
      routeSummary: latestQuote?.routeSummary ?? routeLabel,
      screenshotUrl: latestQuote?.screenshotFileUrl ?? "mock://quote/preview.png",
      estimatedTime: `${Math.max(15, protectedPod.departureWindowMinutes + 25)}??{Math.max(25, protectedPod.departureWindowMinutes + 35)} min`,
      aboveMax,
      reasons: permission.reasons,
    };
  }

  const confirmed = getRidePodAuthorizedCount(pod);
  const required = Math.min(3, pod.seatsTotal);
  const moneyStatus = pod.moneyStatus ?? "waiting_for_riders";
  const quoteUploaded = ["quote_approval_needed", "host_can_book", "ride_booked", "receipt_pending", "settlement_ready"].includes(moneyStatus);
  const aboveMax = moneyStatus === "quote_approval_needed";
  const quotedFare = aboveMax ? pod.maxFare + 8 : Math.max(pod.estimatedFare, pod.maxFare - 10);

  return {
    canBook: moneyStatus === "host_can_book",
    confirmed,
    required,
    approvedMax: formatMoney(pod.maxFare),
    approvedMaxCents: Math.round(pod.maxFare * 100),
    routeLabel: `${pod.fromLabel} ??${pod.toLabel}`,
    departureLabel: `${pod.date}, ${pod.time}`,
    quoteUploaded,
    quoteReviewState: aboveMax ? "NEEDS_APPROVAL" : "AUTO_APPROVED",
    provider: pod.vehicleType.includes("Lyft") ? "Lyft" : pod.vehicleType.includes("Taxi") ? "Taxi" : "Uber",
    vehicleType: pod.vehicleType,
    quotedFare: formatMoney(quotedFare),
    quotedFareCents: Math.round(quotedFare * 100),
    routeSummary: `${pod.fromLabel} to ${pod.toLabel}`,
    screenshotUrl: quoteUploaded ? `mock://quote/${pod.id}.png` : "mock://quote/preview.png",
    estimatedTime: "35??5 min",
    aboveMax,
    reasons: confirmed < required ? [`Waiting for participants: ${confirmed}/${required} authorized.`] : [],
  };
}

function QuoteFlowStatusPill({ children, tone }: { children: React.ReactNode; tone: "success" | "warning" | "info" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black",
        tone === "success" && "border-[var(--rp-border)] bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)]",
        tone === "warning" && "border-[var(--rp-border)] bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]",
        tone === "info" && "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)]",
      )}
    >
      {children}
    </span>
  );
}

function QuoteStepHeader({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-black text-[var(--rp-text)]">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted)]">{children}</p>
      </div>
    </div>
  );
}

export function HostQuoteUploadPanel({ pod }: { pod: RidePod }) {
  const state = getHostQuoteState(pod);
  const disabledReason = state.aboveMax
    ? "Quote is above the approved max. Guests must approve a higher max before protected booking."
    : state.confirmed < state.required
      ? "Waiting for guests to lock. A fresh quote will be required before booking."
      : state.reasons[0] ?? "Upload a fresh ride app quote before booking.";
  const message = state.canBook
    ? "Quote approved. You may book the external ride."
    : state.aboveMax
      ? "Quote is above the approved max. Guests must approve a higher max before protected booking."
      : state.quoteUploaded && state.confirmed < state.required
        ? "Waiting for guests to lock. A fresh quote will be required before booking."
          : state.confirmed >= state.required
            ? "Upload a fresh ride app quote before booking."
            : "Waiting for guests to lock. A fresh quote will be required before booking.";
  const statusTone = state.canBook ? "success" : state.aboveMax ? "warning" : "info";
  const statusLabel = state.canBook
    ? "Within approved max"
    : state.aboveMax
      ? "Above approved max"
      : "Waiting for more riders";

  return (
    <section className="mt-4 overflow-hidden rounded-[26px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),var(--rp-card)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
              Host quote check
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--rp-text)]">
              {state.routeLabel}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">{state.departureLabel}</p>
          </div>
          <QuoteFlowStatusPill tone={statusTone}>{statusLabel}</QuoteFlowStatusPill>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <UsersRound className="h-4 w-4 text-[var(--rp-primary)]" />
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">{state.confirmed}/{state.required}</p>
            <p className="mt-0.5 text-[11px] font-bold text-[var(--rp-muted)]">Authorized</p>
          </div>
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <ShieldCheck className="h-4 w-4 text-[var(--rp-primary)]" />
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">{state.approvedMax}</p>
            <p className="mt-0.5 text-[11px] font-bold text-[var(--rp-muted)]">Approved max</p>
          </div>
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <Clock3 className="h-4 w-4 text-[var(--rp-primary)]" />
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">{state.estimatedTime}</p>
            <p className="mt-0.5 text-[11px] font-bold text-[var(--rp-muted)]">Est. time</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <QuoteStepHeader icon={<Upload className="h-5 w-5" />} title="1. Booking fare proof">
            {state.confirmed < state.required
              ? "Preview quote only. A fresh quote may be required before booking."
              : "Upload a fresh quote screenshot before booking."}
          </QuoteStepHeader>
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              className="flex min-h-24 items-center gap-3 rounded-2xl border border-dashed border-[var(--rp-border-strong)] bg-[var(--rp-input-bg)] p-4 text-left"
            >
              <Camera className="h-7 w-7 shrink-0 text-[var(--rp-primary)]" />
              <span>
                <span className="block text-sm font-black text-[var(--rp-text)]">Upload quote screenshot</span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--rp-muted)]">
                  Demo only. Use the image URL field below for this slice.
                </span>
              </span>
            </button>
            <div className="grid gap-2 min-[760px]:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
                Provider
                <select className="h-11 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-semibold text-[var(--rp-text)]">
                  <option>{state.provider}</option>
                  <option>Uber</option>
                  <option>Lyft</option>
                  <option>Taxi</option>
                  <option>Private van</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
                Vehicle type
                <input className="h-11 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-semibold text-[var(--rp-text)]" defaultValue={state.vehicleType} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
                Quoted fare
                <input className="h-11 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-semibold text-[var(--rp-text)]" defaultValue={state.quotedFare.replace("$", "")} inputMode="decimal" />
              </label>
              <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
                Screenshot image URL
                <input className="h-11 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-semibold text-[var(--rp-text)]" defaultValue={state.screenshotUrl} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)] min-[760px]:col-span-2">
                Route note
                <input className="h-11 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-semibold text-[var(--rp-text)]" defaultValue={state.routeSummary} />
              </label>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
            >
              Review quote screenshot <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <QuoteStepHeader icon={<Sparkles className="h-5 w-5" />} title="2. Fresh quote review">
            RidePod checks the submitted quote against the approved max. No OCR or provider API is used in this demo.
          </QuoteStepHeader>
          <div className="mt-4 grid gap-3 min-[760px]:grid-cols-[0.85fr_1fr]">
            <div className="relative min-h-40 overflow-hidden rounded-2xl border border-[var(--rp-border)] bg-[linear-gradient(135deg,rgba(59,130,246,0.2),rgba(15,23,42,0.08)),var(--rp-input-bg)] p-4">
              <FileImage className="h-8 w-8 text-[var(--rp-primary)]" />
              <p className="mt-5 text-sm font-black text-[var(--rp-text)]">Quote preview</p>
              <p className="mt-1 text-xs font-semibold text-[var(--rp-muted)]">{state.screenshotUrl}</p>
              <div className="absolute bottom-3 right-3 rounded-full bg-[var(--rp-card)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
                Mock image
              </div>
            </div>
            <div className="grid gap-2 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card)] p-3">
              {[
                ["Provider", state.provider],
                ["Fare", state.quotedFare],
                ["Route", state.routeSummary],
                ["Estimated time", state.estimatedTime],
                ["Approved max", state.approvedMax],
                ["Review", state.quoteReviewState.replaceAll("_", " ")],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[var(--rp-muted)]">{label}</span>
                  <span className="max-w-[58%] text-right font-black text-[var(--rp-text)]">{value}</span>
                </div>
              ))}
              <div
                className={cn(
                  "mt-2 rounded-xl px-3 py-2 text-xs font-black",
                  state.aboveMax
                    ? "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]"
                    : "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)]",
                )}
              >
                {state.aboveMax ? "Above approved max" : "Within approved max"}
              </div>
            </div>
          </div>
        </section>

        <section
          className={cn(
            "rounded-[22px] border p-4",
            state.canBook
              ? "border-emerald-300/20 bg-[var(--rp-badge-success-bg)]"
              : "border-amber-300/20 bg-[var(--rp-warning-bg)]",
          )}
        >
          <div className="flex items-start gap-3">
            {state.canBook ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[var(--rp-badge-success-text)]" />
            ) : (
              <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-[var(--rp-warning)]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-[var(--rp-text)]">
                {state.canBook ? "3. Can book eligible" : "3. Cannot book blocked"}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">{message}</p>
              {!state.canBook ? (
                <div className="mt-3 grid gap-2 text-xs font-bold text-[var(--rp-muted-strong)]">
                  <p className="flex gap-2"><RefreshCcw className="h-4 w-4 shrink-0 text-[var(--rp-warning)]" /> Wait for riders to authorize payment.</p>
                  <p className="flex gap-2"><CarFront className="h-4 w-4 shrink-0 text-[var(--rp-warning)]" /> Choose a lower-cost option or adjust route/time.</p>
                  <p className="flex gap-2"><Route className="h-4 w-4 shrink-0 text-[var(--rp-warning)]" /> Re-upload quote after checking the route.</p>
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            disabled={!state.canBook}
            className="mt-4 h-12 w-full rounded-2xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {state.canBook ? "Book protected ride" : "Protected booking locked"}
          </button>
          {!state.canBook ? (
            <p className="mt-3 rounded-2xl bg-[var(--rp-card-soft)] px-3 py-2 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
              Disabled: {disabledReason}
            </p>
          ) : null}
        </section>
      </div>
    </section>
  );
}

export function HostBookingProtectionPanel({ podId }: { podId: string }) {
  const { pod, permission, snapshot } = getHostBookingSummary(podId);
  const quote = permission.latestQuote;
  const quoteAboveMax = Boolean(quote && quote.quotedFareCents > pod.approvedMaxTotalFareCents);
  const bookingMessage = permission.canBook
    ? "Quote approved. You may book the external ride."
    : quoteAboveMax
      ? "Quote is above the approved max. Guests must approve a higher max before protected booking."
      : snapshot.confirmedSeats >= pod.minSeatsToBook
        ? "Upload a fresh ride app quote before booking."
        : "Waiting for guests to lock. A fresh quote will be required before booking.";

  return (
    <section className="mt-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      <div className="flex items-start gap-3">
        <Upload className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[var(--rp-text)]">Quote screenshot and protected booking</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
            Quote controls booking permission. Verified receipt controls final settlement.
          </p>
          <div className="mt-3 grid gap-2 text-xs font-bold text-[var(--rp-muted-strong)]">
            <p>Provider: {quote?.providerName.replaceAll("_", " ") ?? "Upload quote"}</p>
            <p>Quoted fare: {quote ? formatCents(quote.quotedFareCents, quote.currency) : "Not submitted"}</p>
            <p>Approved max: {formatCents(pod.approvedMaxTotalFareCents, pod.currency)}</p>
            <p>Authorized seats: {snapshot.confirmedSeats}/{pod.minSeatsToBook}</p>
          </div>
          <div
            className={cn(
              "mt-3 rounded-xl px-3 py-2 text-xs font-black",
              permission.canBook
                ? "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)]"
                : "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]",
            )}
          >
            {permission.canBook
              ? "Quote approved. You may book the external ride."
              : bookingMessage}
          </div>
          {!permission.canBook ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
              Book at your own risk. This ride is not RidePod-protected until participants are payment-authorized.
            </p>
          ) : null}
          <button
            type="button"
            disabled={!permission.canBook}
            className="mt-3 h-10 w-full rounded-xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Protected booking {permission.canBook ? "enabled" : "locked"}
          </button>
          {!permission.canBook ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
              Disabled: {bookingMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function SettlementProtectionSummary({ podId }: { podId: string }) {
  const preview = getMockSettlementPreview(podId);

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start gap-3">
        <ReceiptText className="mt-1 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Receipt protection</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            Host reimbursement is based on verified final receipt and approved max fare.
          </p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-[var(--rp-muted)]">Verified receipt</dt>
              <dd className="font-black text-[var(--rp-text)]">{formatCents(preview.settlement.verifiedFareCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-[var(--rp-muted)]">Approved max</dt>
              <dd className="font-black text-[var(--rp-text)]">{formatCents(preview.settlement.approvedFareCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-[var(--rp-muted)]">Payout state</dt>
              <dd className="font-black text-[var(--rp-primary)]">{preview.hostReimbursement.payoutState.replaceAll("_", " ")}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

export function HostReplacementModePanel({ podId }: { podId: string }) {
  const pod = getProtectedPodOrFallback(podId);
  const confirmedRiders = pod.members.filter((member) => member.role !== "HOST" && member.memberState === "CONFIRMED").length;
  const riderCount = Math.max(3, confirmedRiders + 1);

  return (
    <HostReplacementActionsScreen
      backHref={`/pods/${podId}`}
      routeLabel="USC → LAX"
      departureTime="Today • 4:30 PM"
      riderCount={riderCount}
      riderCapacity={pod.maxSeats}
      genderMode="WOMEN_ONLY"
      lifecycleState={pod.lifecycleState}
      paymentCaptureBlocked
    />
  );
}

export function HostReplacementActiveScreen({
  backHref = "/pods",
  routeLabel = "USC → LAX",
  departureTime = "Today, 4:30 PM",
  riderCount = 3,
  riderCapacity = 4,
  genderMode = "WOMEN_ONLY",
  lifecycleState = "HOST_REPLACEMENT_NEEDED",
  paymentAuthorizationSafe = true,
}: {
  backHref?: string;
  routeLabel?: string;
  departureTime?: string;
  riderCount?: number;
  riderCapacity?: number;
  genderMode?: "WOMEN_ONLY" | "MIXED";
  lifecycleState?: string;
  paymentAuthorizationSafe?: boolean;
}) {
  const genderLabel = genderMode === "WOMEN_ONLY" ? "Women-only" : "Mixed pod";
  const replacementNeeded = lifecycleState === "HOST_REPLACEMENT_NEEDED";

  return (
    <main className="mx-auto min-h-[calc(100svh-2rem)] w-full max-w-[430px] overflow-hidden rounded-[32px] border border-[var(--rp-border)] bg-[var(--rp-shell)] shadow-[var(--rp-shadow-soft)]">
      <div className="flex min-h-[calc(100svh-2rem)] flex-col bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_34%),var(--rp-gradient-app)] px-5 py-5">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back to pod"
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <RidePodLogo className="mx-auto h-8 justify-center" imageClassName="max-w-[150px]" priority />
          <div
            aria-label="Host replacement status"
            className="grid h-11 w-11 place-items-center rounded-full border border-[rgba(245,158,11,0.35)] bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]"
          >
            <ShieldAlert className="h-5 w-5" />
          </div>
        </header>

        <section className="mt-8 rounded-[28px] border border-[rgba(245,158,11,0.42)] bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(245,158,11,0.08))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[rgba(245,158,11,0.18)] text-[var(--rp-warning)] ring-1 ring-[rgba(245,158,11,0.34)]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-[2rem] font-black leading-[1.08] tracking-normal text-[var(--rp-text)]">
              Host canceled.
              <br />
              Your pod is still active.
            </h1>
          </div>
        </section>

        <section className="mt-5 grid gap-3">
          <p className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] px-5 py-4 text-base font-black leading-6 text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)]">
            RidePod is looking for a replacement host.
          </p>
          <p className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] px-5 py-4 text-sm font-semibold leading-6 text-[var(--rp-muted)] shadow-[var(--rp-shadow-soft)]">
            Your payment authorization will not be captured unless a replacement host books the ride.
          </p>
        </section>

        <section className="mt-7">
          <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--rp-muted)]">POD SUMMARY</p>
          <div className="mt-3 rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[2rem] font-black leading-none text-[var(--rp-text)]">{routeLabel}</p>
                <p className="mt-3 text-sm font-bold text-[var(--rp-muted)]">{departureTime}</p>
              </div>
              <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-right">
                <p className="text-xl font-black text-[var(--rp-text)]">
                  {riderCount} / {riderCapacity}
                </p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--rp-muted)]">Riders</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(192,38,211,0.28)] bg-[rgba(192,38,211,0.14)] px-3 py-2 text-xs font-black text-[#e879f9]">
                <Venus className="h-4 w-4" />
                {genderLabel}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black",
                  replacementNeeded
                    ? "border-[rgba(245,158,11,0.32)] bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]",
                )}
              >
                <RefreshCcw className="h-4 w-4" />
                Host replacement needed
              </span>
            </div>
          </div>
        </section>

        <section
          className={cn(
            "mt-5 rounded-[28px] border p-5 shadow-[var(--rp-shadow-soft)]",
            paymentAuthorizationSafe
              ? "border-[rgba(59,130,246,0.38)] bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(37,99,235,0.08))]"
              : "border-[var(--rp-border)] bg-[var(--rp-card)]",
          )}
        >
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[rgba(37,99,235,0.16)] text-[#60a5fa] ring-1 ring-[rgba(96,165,250,0.32)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-base font-black leading-6 text-[var(--rp-text)]">
              Your payment authorization is safe with RidePod.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function ChatLockNotice({ podId }: { podId: string }) {
  const protectedPod = getProtectedPodOrFallback(podId);
  const snapshot = getMoneySafetySnapshot(protectedPod);

  return (
    <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold text-[var(--rp-muted)]">
      <div className="flex gap-2">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
        <p>
          {snapshot.chatUnlocked
            ? "Chat is unlocked for payment-authorized participants."
            : "Chat unlocks after your seat is payment-authorized."}
        </p>
      </div>
    </div>
  );
}

export function PodChatSafetyPanel({ podId, confirmed = false }: { podId: string; confirmed?: boolean }) {
  const warning = detectOffAppPaymentMessage("Can you Venmo me after the ride?");

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-base font-black text-[var(--rp-text)]">Pod chat</h2>
      {!confirmed ? (
        <div className="mt-3 rounded-2xl bg-[var(--rp-card-soft)] p-3 text-sm font-semibold text-[var(--rp-muted)]">
          <div className="flex gap-2">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
            <p>Chat unlocks after your seat is payment-authorized.</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1 text-xs font-black text-[var(--rp-muted-strong)]">
            Message
            <textarea
              className="min-h-20 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2 text-sm font-semibold text-[var(--rp-text)]"
              defaultValue="Can you Venmo me after the ride?"
            />
          </label>
        </div>
      )}
      {warning.triggered ? (
        <div className="mt-3 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-warning-bg)] p-3">
          <p className="text-sm font-black text-[var(--rp-warning)]">
            Off-app payments are not protected. RidePod cannot help with refunds, max-charge disputes, receipt verification, or host reimbursement if payment happens outside the app.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="h-10 rounded-xl bg-[var(--rp-primary)] text-xs font-black text-[var(--rp-primary-text)]">
              Keep payment in RidePod
            </button>
            <button className="h-10 rounded-xl border border-[var(--rp-border-strong)] text-xs font-black text-[var(--rp-warning)]">
              Send anyway
            </button>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[var(--rp-muted)]">
            Send anyway keeps this in the mock chat flow and records the warning when supported.
          </p>
        </div>
      ) : null}
      <p className="mt-2 text-[11px] font-semibold text-[var(--rp-muted)]">Pod {podId}</p>
    </section>
  );
}

export function AdminReviewHook({ podId }: { podId: string }) {
  return (
    <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-semibold text-[var(--rp-muted)]">
      <div className="flex gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
        <p>Admin review hook ready for host fault, receipt mismatch, disputes, or safety flags on pod {podId}.</p>
      </div>
    </div>
  );
}
