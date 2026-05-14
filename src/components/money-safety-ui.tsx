import Link from "next/link";
import {
  AlertTriangle,
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
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
  XCircle,
} from "lucide-react";
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

const quoteApprovedCanBookCopy = "Quote approved — host can book";

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
        tone === "success" && "border-emerald-300/25 bg-emerald-500/12 text-emerald-300 [[data-theme=light]_&]:bg-emerald-50 [[data-theme=light]_&]:text-emerald-700",
        tone === "warning" && "border-amber-300/25 bg-amber-500/12 text-amber-200 [[data-theme=light]_&]:bg-amber-50 [[data-theme=light]_&]:text-amber-800",
        tone === "info" && "border-blue-300/20 bg-blue-500/12 text-blue-200 [[data-theme=light]_&]:bg-blue-50 [[data-theme=light]_&]:text-blue-700",
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
    ? "Quote is above approved max. Riders must approve a higher max before protected booking."
    : state.reasons[0] ?? "Protected booking unlocks after payment authorization and quote approval.";
  const message = state.canBook
    ? "All required participants are payment-authorized. Quote is within approved max. You may book."
    : state.aboveMax
      ? "Quote is above approved max. Riders must approve a higher max before protected booking."
      : state.quoteUploaded && state.confirmed < state.required
        ? "Quote saved. Booking unlocks when required participants authorize payment."
          : state.confirmed >= state.required
            ? "Upload a fresh quote screenshot before booking."
            : `Waiting for participants: ${state.confirmed}/${state.required} authorized.`;
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
          <QuoteStepHeader icon={<Upload className="h-5 w-5" />} title="1. Quote upload">
            You can preview fare now, but protected booking unlocks only after required participants authorize payment.
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
              Review quote <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <QuoteStepHeader icon={<Sparkles className="h-5 w-5" />} title="2. Quote review & fare extracted">
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
                {state.canBook ? "3. Can book ??eligible" : "3. Cannot book ??blocked"}
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

  return (
    <section className="mt-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      <div className="flex items-start gap-3">
        <Upload className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[var(--rp-text)]">Quote screenshot and protected booking</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
            You can preview fare now, but protected booking unlocks only after required participants authorize payment.
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
              ? "All required participants are payment-authorized. Quote is within approved max. You may book."
              : permission.reasons[0] ?? "Host cannot book a protected ride yet."}
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
              Disabled: {permission.reasons[0] ?? "Protected booking requires payment authorization and an approved fresh quote."}
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
  const replacementCandidate = pod.members.find((member) => member.role !== "HOST");
  const permission = canHostBook(pod.replacementHostUserId ?? pod.hostUserId, pod);

  return (
    <div className="mx-auto grid max-w-[430px] gap-4">
      <section className="rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-[var(--rp-warning)]" />
          <div>
            <h1 className="text-2xl font-black text-[var(--rp-text)]">Host canceled. Your pod is still active.</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              RidePod is looking for a replacement host. Your payment authorization will not be captured unless a replacement host books the external ride.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-lg font-black text-[var(--rp-text)]">Replacement host flow</h2>
        <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--rp-muted)]">
          <p>1. Confirm responsibility.</p>
          <p>2. Upload a fresh quote screenshot.</p>
          <p>3. Book only after quote approval and participant locks remain valid.</p>
        </div>
        <div className="mt-4 rounded-2xl bg-[var(--rp-card-soft)] p-3 text-sm">
          <p className="font-black text-[var(--rp-text)]">
            Candidate: {replacementCandidate ? replacementCandidate.userId : "No confirmed candidate yet"}
          </p>
          <p className="mt-1 font-semibold text-[var(--rp-muted)]">
            Current booking status: {permission.canBook ? "Can book" : "Fresh replacement quote required"}
          </p>
        </div>
        <form className="mt-4 grid gap-2">
          <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            Provider
            <select className="h-10 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-sm font-semibold text-[var(--rp-text)]">
              <option>Uber</option>
              <option>Lyft</option>
              <option>Taxi</option>
              <option>Private van</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            Vehicle class
            <input className="h-10 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-sm font-semibold text-[var(--rp-text)]" placeholder="XL, taxi van, private van" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            Quoted fare
            <input className="h-10 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-sm font-semibold text-[var(--rp-text)]" inputMode="decimal" placeholder="90.00" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            Screenshot file URL
            <input className="h-10 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-sm font-semibold text-[var(--rp-text)]" placeholder="mock://replacement-quote.png" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
            Route summary
            <input className="h-10 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-sm font-semibold text-[var(--rp-text)]" placeholder="USC to LAX" />
          </label>
        </form>
        <div
          className={cn(
            "mt-4 rounded-2xl px-3 py-2 text-xs font-black",
            permission.canBook
              ? "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)]"
              : "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]",
          )}
        >
          {permission.canBook
            ? "All required participants are payment-authorized. Quote is within approved max. You may book."
            : "Replacement host must upload a fresh quote before protected booking."}
        </div>
      </section>

      <div className="grid gap-3">
        <button className="h-12 rounded-xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)]">
          Become replacement host
        </button>
        <button className="h-12 rounded-xl border border-[var(--rp-border-strong)] text-sm font-black text-[var(--rp-primary)]">
          Stay in pod
        </button>
        <Link
          href={`/pods/${podId}`}
          className="flex h-12 items-center justify-center rounded-xl border border-[var(--rp-border)] text-sm font-black text-[var(--rp-muted-strong)]"
        >
          Leave pod / release authorization
        </Link>
      </div>
    </div>
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
