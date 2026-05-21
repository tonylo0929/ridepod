"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CarFront,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  CreditCard,
  Crown,
  FileText,
  Info,
  Luggage,
  MapPin,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";

const pod = {
  id: "usc-lax-001",
  route: "USC \u2192 LAX",
  dateTime: "Tue, May 14 \u2022 7:30 AM",
  pickupHub: "USC Village rideshare zone",
  dropoffHub: "LAX Terminal 3 departures",
  vehicle: "UberXL or Taxi",
  vehicleShort: "UberXL",
  timeFlexibility: "\u00b115 min",
  luggage: "1 bag per rider",
  seats: "3 / 4 seats filled",
  seatAvailability: "1 seat left",
  estimatedShare: "$18.50",
  platformFee: "$2.00",
  maxCharge: "$24.50",
  lockDeadline: "Mon, May 13 \u2022 8:00 PM",
  cancellationDeadline: "Mon, May 13 \u2022 6:00 PM",
  host: "Maya Chen",
  backupHost: "Jordan Lee",
  paymentMethod: "Visa \u2022\u2022\u2022\u2022 4242",
};

const steps = [
  { label: "Review", icon: UserRound },
  { label: "Rules", icon: FileText },
  { label: "Payment", icon: CreditCard },
  { label: "Confirmed", icon: CheckCircle2 },
] as const;

function PremiumCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[20px] border border-white/10 bg-[#0b1620]/92 shadow-[0_18px_45px_rgba(0,0,0,0.34)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function JoinFlowStepper({ step }: { step: number }) {
  return (
    <div className="px-1 py-2">
      <div className="relative grid grid-cols-4">
        <div className="absolute left-[12.5%] right-[12.5%] top-[18px] h-px bg-white/12" />
        <div
          className="absolute left-[12.5%] top-[18px] h-px bg-[#f2c15b] transition-all duration-300"
          style={{ width: `${(Math.min(step, 3) / 3) * 75}%` }}
        />

        {steps.map(({ label, icon: Icon }, index) => {
          const complete = index < step;
          const current = index === step;
          const active = complete || current;

          return (
            <div key={label} className="relative z-10 flex min-w-0 flex-col items-center">
              <div
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full border text-sm shadow-[0_0_18px_rgba(0,0,0,0.28)] transition",
                  current && "border-[#f2c15b] bg-[#f2c15b] text-[#07111a]",
                  complete && "border-[#f2c15b]/50 bg-[#101a24] text-[#ffd36a]",
                  !active && "border-white/14 bg-[#101a24] text-[#6f7b88]",
                )}
              >
                {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <p
                className={cn(
                  "mt-2 truncate text-[11px] font-black",
                  active ? "text-[#f2c15b]" : "text-[#7d8792]",
                )}
              >
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "green" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black",
        tone === "green"
          ? "border-emerald-300/25 bg-emerald-500/16 text-[#8eea7a]"
          : "border-[#ffd36a]/25 bg-[#ffd36a]/10 text-[#ffd36a]",
      )}
    >
      {children}
    </span>
  );
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-0 border-r border-white/10 px-2 last:border-r-0">
      <div className="flex items-center gap-1.5 text-[#ffd36a]">{icon}</div>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-[#aab3be]">{label}</p>
    </div>
  );
}

function CostRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <p className={cn("text-sm font-semibold", strong ? "text-[#ffd36a]" : "text-[#cbd5e1]")}>
        {label}
      </p>
      <p className={cn("font-black text-white", strong ? "text-xl" : "text-sm")}>{value}</p>
    </div>
  );
}

function ProtectedPaymentBanner({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-500/12 text-[#8eea7a]",
        compact ? "px-3 py-2 text-xs font-black" : "p-3 text-sm font-bold",
      )}
    >
      <ShieldCheck className="h-5 w-5 shrink-0 text-[#ffd36a]" />
      <span>Your max charge is authorized before the host books externally.</span>
    </div>
  );
}

function RouteSummaryCard() {
  return (
    <PremiumCard className="relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#f2c15b]/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-black leading-none tracking-[-0.02em] text-white">
            {pod.route}
          </h1>
          <p className="mt-2 text-sm font-black text-white">{pod.dateTime}</p>
        </div>
        <StatusPill tone="green">{pod.seatAvailability}</StatusPill>
      </div>

      <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] gap-4 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#ffd36a]">
            <MapPin className="h-4 w-4" />
            <p className="text-xs font-bold text-[#aab3be]">Pickup</p>
          </div>
          <p className="mt-2 text-sm font-black leading-5 text-white">{pod.pickupHub}</p>
        </div>
        <div className="h-full border-l border-dashed border-white/25" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#ffd36a]">
            <MapPin className="h-4 w-4" />
            <p className="text-xs font-bold text-[#aab3be]">Dropoff</p>
          </div>
          <p className="mt-2 text-sm font-black leading-5 text-white">{pod.dropoffHub}</p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-4">
        <StatItem icon={<UsersRound className="h-4 w-4" />} value="3 / 4" label="Seats filled" />
        <StatItem icon={<CarFront className="h-4 w-4" />} value={pod.vehicleShort} label="Vehicle" />
        <StatItem icon={<Clock3 className="h-4 w-4" />} value={pod.timeFlexibility} label="Time flex" />
        <StatItem icon={<Luggage className="h-4 w-4" />} value="1 bag" label="per rider" />
      </div>
    </PremiumCard>
  );
}

function EstimatedCostCard() {
  return (
    <PremiumCard className="p-4">
      <h2 className="text-base font-black text-white">Your estimated cost</h2>
      <div className="mt-4 divide-y divide-white/10">
        <CostRow label="Est. share" value={pod.estimatedShare} />
        <CostRow label="Platform fee" value={pod.platformFee} />
        <CostRow label="Max charge" value={pod.maxCharge} strong />
      </div>
      <div className="mt-3">
        <ProtectedPaymentBanner />
      </div>
    </PremiumCard>
  );
}

function TripDetailsCard() {
  const rows = [
    ["Lock deadline", pod.lockDeadline],
    ["Cancellation deadline", pod.cancellationDeadline],
    ["Host", pod.host],
    ["Backup host", pod.backupHost],
  ];

  return (
    <PremiumCard className="p-4">
      <h2 className="text-base font-black text-white">What you need to know</h2>
      <div className="mt-4 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#aab3be]">{label}</p>
            <p className="max-w-[58%] text-right text-sm font-black text-white">{value}</p>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

function SafetyCard() {
  const items = [
    "Every seat has a financial owner",
    "Final settlement uses a verified receipt",
    "No cash or pay-later",
    "No-show rules apply through RidePod review",
  ];

  return (
    <PremiumCard className="p-4">
      <h2 className="text-base font-black text-white">RidePod seat commitment</h2>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm font-semibold text-[#d7dee8]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#8eea7a]" />
            {item}
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

function ReviewStep() {
  return (
    <div className="grid gap-3">
      <RouteSummaryCard />
      <EstimatedCostCard />
      <TripDetailsCard />
      <SafetyCard />
    </div>
  );
}

function RulesStep({
  accepted,
  onAcceptedChange,
}: {
  accepted: boolean;
  onAcceptedChange: (checked: boolean) => void;
}) {
  const rules = [
    {
      icon: ShieldCheck,
      text: "Your seat is held after quote acceptance.",
      tone: "gold",
    },
    {
      icon: Clock3,
      text: "Cancel before Mon, May 13 \u2022 6:00 PM may release your authorization when eligible.",
      tone: "gold",
    },
    {
      icon: AlertTriangle,
      text: "Cancel after lock and penalties may apply.",
      tone: "amber",
    },
    {
      icon: Circle,
      text: "If someone replaces your seat, you may receive credit.",
      tone: "gold",
    },
    {
      icon: CreditCard,
      text: "No cash or pay-later. Pay in app only.",
      tone: "gold",
    },
    {
      icon: UsersRound,
      text: "Host never has to chase people for money.",
      tone: "gold",
    },
  ];

  return (
    <div className="grid gap-3">
      <PremiumCard className="p-4">
        <h1 className="text-2xl font-black tracking-tight text-white">Pod rules</h1>
        <p className="mt-2 text-sm font-semibold text-[#aab3be]">
          Please review and agree to continue.
        </p>

        <div className="mt-5 grid gap-2.5">
          {rules.map(({ icon: Icon, text, tone }) => (
            <div key={text} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-3.5">
              <Icon
                className={cn(
                  "h-6 w-6 shrink-0",
                  tone === "amber" ? "text-[#fbbf24]" : "text-[#f2c15b]",
                )}
              />
              <p className="text-sm font-semibold leading-5 text-[#d7dee8]">{text}</p>
            </div>
          ))}
        </div>
      </PremiumCard>

      <label className="flex items-center gap-3 px-1 py-2 text-sm font-black text-white">
        <span className="relative grid h-6 w-6 place-items-center rounded border border-[#f2c15b] text-[#f2c15b]">
          {accepted ? <Check className="h-4 w-4" /> : null}
          <input
            checked={accepted}
            onChange={(event) => onAcceptedChange(event.target.checked)}
            type="checkbox"
            className="absolute inset-0 opacity-0"
          />
        </span>
        I understand the pod rules.
      </label>
    </div>
  );
}

function PaymentStep({ authorized }: { authorized: boolean }) {
  return (
    <div className="grid gap-3">
      <PremiumCard className="p-4">
        <h1 className="text-2xl font-black tracking-tight text-white">Quote acceptance</h1>
        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#8eea7a]">
          <ShieldCheck className="h-4 w-4" />
          Your max charge is accepted before the host books externally.
        </div>

        <div className="mt-5 divide-y divide-white/10">
          <CostRow label="Est. share" value={pod.estimatedShare} />
          <CostRow label="Platform fee" value={pod.platformFee} />
          <CostRow label="Max charge" value={pod.maxCharge} strong />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-12 place-items-center rounded-lg bg-[#244a8f] text-[10px] font-black text-white">
              VISA
            </div>
            <p className="text-sm font-black text-white">{pod.paymentMethod}</p>
          </div>
          <button className="text-sm font-black text-[#9cc7ff]">Change</button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#8eea7a]" />
            <p className="text-xs font-semibold leading-5 text-[#cbd5e1]">
              We’ll only charge you after the ride, and never more than the max charge.
              You will never pay more than your approved max unless you approve a higher fare. Cancellation before the deadline may release your authorization when eligible.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-black text-white">Payment status</p>
            <div className={cn("text-right text-xs font-black", authorized ? "text-[#8eea7a]" : "text-[#fbbf24]")}>
              <p>{authorized ? "Authorized" : "Not authorized yet"}</p>
              {authorized ? (
                <p className="mt-1 font-semibold text-[#8eea7a]">
                  You’re all set! Your seat is reserved.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}

function ConfirmedStep({
  shared,
  onShare,
}: {
  shared: boolean;
  onShare: () => void;
}) {
  const summaryRows = [
    ["Pickup", pod.pickupHub],
    ["Dropoff", pod.dropoffHub],
    ["Vehicle", pod.vehicle],
    ["Seats", "3 / 4 filled"],
    ["Host", pod.host],
    ["Backup host", pod.backupHost],
  ];

  return (
    <div className="grid gap-3">
      <PremiumCard className="relative overflow-hidden p-5 text-center">
        <div className="pointer-events-none absolute inset-x-8 -top-14 h-44 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-300/40 bg-emerald-500/14 text-[#8eea7a]">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="relative mt-4 text-3xl font-black tracking-tight text-white">Seat confirmed!</h1>
        <p className="relative mt-3 text-sm font-semibold text-[#aab3be]">You’re going to</p>
        <p className="relative mt-2 text-2xl font-black text-white">{pod.route}</p>
        <p className="relative mt-2 text-sm font-black text-white">{pod.dateTime}</p>

        <div className="relative mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-500/12 p-3 text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ffd36a]" />
            <div>
              <p className="text-sm font-black text-[#8eea7a]">Seat accepted</p>
              <p className="mt-1 text-xs font-semibold text-white">
                You’re all set. See you on the trip!
              </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      <PremiumCard className="p-4">
        <h2 className="text-base font-black text-white">Trip summary</h2>
        <div className="mt-4 grid gap-3">
          {summaryRows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[#aab3be]">{label}</p>
              <p className="max-w-[60%] text-right text-sm font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </PremiumCard>

      <PremiumCard className="p-4">
        <h2 className="text-base font-black text-white">What’s next?</h2>
        <div className="mt-4 grid gap-4">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-[#ffd36a]" />
            <div>
              <p className="text-sm font-black text-white">Lock deadline</p>
              <p className="mt-1 text-sm text-[#cbd5e1]">{pod.lockDeadline}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#ffd36a]" />
            <div>
              <p className="text-sm font-black text-white">Cancellation deadline</p>
              <p className="mt-1 text-sm text-[#cbd5e1]">{pod.cancellationDeadline}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#ffd36a]" />
            <p className="text-sm leading-6 text-[#cbd5e1]">
              You’ll get updates in the app as the trip gets closer.
            </p>
          </div>
        </div>
      </PremiumCard>

      <div className="grid gap-3 pt-2">
        <Link
          href={`/pods/${pod.id}`}
          className="flex h-14 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)] shadow-[0_12px_32px_rgba(0,124,137,0.24)]"
        >
          View my pod
        </Link>
        <button
          onClick={onShare}
          className="flex h-14 items-center justify-center rounded-[16px] border border-[var(--rp-border-strong)] bg-transparent text-base font-black text-[var(--rp-primary)]"
        >
          {shared ? "Share link ready" : "Share this pod"}
        </button>
        <p className="pb-4 text-center text-xs font-black text-[#f2c15b]">
          1 seat left <span className="text-[#8eea7a]">• payment protected</span>
        </p>
      </div>
    </div>
  );
}

function StickyCostCTA({
  step,
  canContinue,
  paymentAuthorized,
  onContinue,
}: {
  step: number;
  canContinue: boolean;
  paymentAuthorized: boolean;
  onContinue: () => void;
}) {
  const label = useMemo(() => {
    if (step === 0) return "Continue";
    if (step === 1) return "Continue to payment";
    if (step === 2) return paymentAuthorized ? "Confirm seat" : "Authorize payment";
    return "";
  }, [paymentAuthorized, step]);

  if (step === 3) return null;

  return (
    <div className="fixed inset-x-0 bottom-[88px] z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] md:bottom-0 lg:left-[18rem]">
      <div className="mx-auto max-w-[390px] rounded-t-[22px] border border-[var(--rp-border)] bg-[var(--rp-shell)] p-3 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl sm:max-w-[430px]">
        <div className="grid grid-cols-[1fr_1.05fr] items-center gap-3">
          <div className="grid gap-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#aab3be]">Est. share</span>
              <span className="font-black text-white">{pod.estimatedShare}</span>
            </div>
            {step === 0 ? (
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#aab3be]">Platform fee</span>
                <span className="font-black text-white">{pod.platformFee}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#aab3be]">Max charge</span>
              <span className="font-black text-white">{pod.maxCharge}</span>
            </div>
          </div>
          <button
            onClick={onContinue}
            disabled={!canContinue}
            className={cn(
              "h-13 rounded-[14px] px-3 text-sm font-black shadow-[0_12px_32px_rgba(242,193,91,0.28)] transition",
              canContinue
                ? "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)]"
                : "cursor-not-allowed bg-white/[0.08] text-[#6f7b88] shadow-none",
            )}
          >
            {label}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-black">
          <ShieldCheck className="h-3.5 w-3.5 text-[#ffd36a]" />
          <span className="text-[#f2c15b]">1 seat left</span>
          <span className="text-[#677484]">•</span>
          <span className="text-[#8eea7a]">payment protected</span>
        </div>
      </div>
    </div>
  );
}

export function PremiumJoinPodFlow() {
  const [step, setStep] = useState(0);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [paymentAuthorized, setPaymentAuthorized] = useState(false);
  const [shared, setShared] = useState(false);

  const canContinue = step === 0 || (step === 1 && rulesAccepted) || step === 2;

  function continueFlow() {
    if (!canContinue) return;

    if (step === 2 && !paymentAuthorized) {
      setPaymentAuthorized(true);
      return;
    }

    setStep((current) => Math.min(current + 1, 3));
  }

  return (
    <div className="relative mx-auto max-w-[390px] pb-36 sm:max-w-[430px]">
      <header className="relative flex items-center justify-between pt-1">
        <Link
          href={`/pods/${pod.id}`}
          aria-label="Back to pod detail"
          className="grid h-10 w-10 place-items-center rounded-full text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="text-base font-black text-white">Join this pod</p>
        <div className="grid h-10 w-10 place-items-center rounded-full text-[#ffd36a]">
          <Crown className="h-6 w-6" />
        </div>
      </header>

      <div className="mt-4 grid gap-4">
        <JoinFlowStepper step={step} />

        {step === 0 ? <ReviewStep /> : null}
        {step === 1 ? (
          <RulesStep accepted={rulesAccepted} onAcceptedChange={setRulesAccepted} />
        ) : null}
        {step === 2 ? <PaymentStep authorized={paymentAuthorized} /> : null}
        {step === 3 ? (
          <ConfirmedStep shared={shared} onShare={() => setShared(true)} />
        ) : null}
      </div>

      <StickyCostCTA
        step={step}
        canContinue={canContinue}
        paymentAuthorized={paymentAuthorized}
        onContinue={continueFlow}
      />
    </div>
  );
}
