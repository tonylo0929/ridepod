"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  LockKeyhole,
  MoreHorizontal,
  ReceiptText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";

type ThemeVariant = "light" | "dark";

export type SettlementReceiptVerifiedScreenProps = {
  backHref?: string;
  totalTripFareCents?: number;
  rideType?: string;
  rideDate?: string;
  rideTime?: string;
  receiptVerified?: boolean;
  settlementReady?: boolean;
  themeVariant?: ThemeVariant;
  settlementBreakdownHref?: string;
  finalSplitHref?: string;
  onViewSettlementBreakdown?: () => void;
  onViewFinalSplit?: () => void;
};

const protectionRules = [
  {
    copy: "Final settlement uses verified receipt.",
    icon: ReceiptText,
    tone: "text-emerald-400",
  },
  {
    copy: "You cannot be charged above your approved max unless you approve an increase.",
    icon: LockKeyhole,
    tone: "text-sky-400",
  },
  {
    copy: "Host reimbursement is based on verified final receipt and approved max fare.",
    icon: UsersRound,
    tone: "text-amber-300",
  },
] as const;

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function TopBar({ backHref }: { backHref: string }) {
  return (
    <header className="grid grid-cols-[48px_1fr_48px] items-center gap-3 px-5 pt-5">
      <Link
        href={backHref}
        aria-label="Back to settlement"
        className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-center text-lg font-black tracking-tight text-[var(--rp-text)]">
        Settlement
      </h1>
      <button
        type="button"
        aria-label="More settlement options"
        className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </header>
  );
}

function Confetti() {
  const pieces = [
    "left-[13%] top-[18%] bg-emerald-300",
    "left-[28%] top-[9%] bg-sky-300",
    "left-[72%] top-[15%] bg-amber-300",
    "left-[84%] top-[32%] bg-fuchsia-300",
    "left-[18%] top-[63%] bg-amber-300",
    "left-[77%] top-[68%] bg-emerald-300",
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((className, index) => (
        <span
          key={className}
          className={cn(
            "absolute h-2 w-1 rounded-full opacity-80 shadow-[0_0_16px_currentColor]",
            index % 2 === 0 ? "rotate-45" : "-rotate-12",
            className,
          )}
        />
      ))}
    </div>
  );
}

function SuccessHero({
  receiptVerified,
  settlementReady,
}: {
  receiptVerified: boolean;
  settlementReady: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.22),transparent_34%),var(--rp-card)] p-6 text-center shadow-[var(--rp-shadow-soft)]">
      <Confetti />
      <div className="relative z-10 mx-auto grid h-24 w-24 place-items-center rounded-[32px] border border-emerald-300/35 bg-emerald-400/15 text-emerald-300 shadow-[0_22px_58px_rgba(34,197,94,0.24)]">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-[#062016] shadow-[inset_0_-8px_20px_rgba(6,32,22,0.2)]">
          <Check className="h-9 w-9 stroke-[3]" />
        </div>
      </div>
      <div className="relative z-10 mt-6">
        <p className="text-[2.35rem] font-black leading-none tracking-normal text-[var(--rp-text)]">
          {receiptVerified ? "Receipt verified" : "Receipt under review"}
        </p>
        <p className="mt-3 text-base font-bold text-[var(--rp-muted-strong)]">
          {settlementReady ? "Final settlement is ready" : "Final settlement is waiting for review"}
        </p>
      </div>
    </section>
  );
}

function VerifiedFareCard({
  totalTripFareCents,
  rideType,
  rideDate,
  rideTime,
}: {
  totalTripFareCents: number;
  rideType: string;
  rideDate: string;
  rideTime: string;
}) {
  const details = [
    { label: "Ride type", value: rideType, icon: Car },
    { label: "Date", value: rideDate, icon: CalendarDays },
    { label: "Time", value: rideTime, icon: ReceiptText },
  ];

  return (
    <section className="rounded-[30px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
            Total trip fare verified
          </p>
          <p className="mt-3 text-[3.2rem] font-black leading-none tracking-normal text-[var(--rp-text)]">
            {formatCents(totalTripFareCents)}
          </p>
        </div>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/25">
          <ShieldCheck className="h-7 w-7" />
        </span>
      </div>

      <dl className="mt-6 grid gap-3">
        {details.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3"
          >
            <dt className="flex items-center gap-3 text-sm font-bold text-[var(--rp-muted)]">
              <Icon className="h-4 w-4 text-[var(--rp-primary)]" />
              {label}
            </dt>
            <dd className="text-right text-sm font-black text-[var(--rp-text)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ProtectionRuleCards() {
  return (
    <section className="grid gap-3" aria-label="Settlement protection rules">
      {protectionRules.map(({ copy, icon: Icon, tone }) => (
        <article
          key={copy}
          className="flex items-center gap-4 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]"
        >
          <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--rp-card-muted)]", tone)}>
            <Icon className="h-6 w-6" />
          </span>
          <p className="text-sm font-black leading-6 text-[var(--rp-text)]">{copy}</p>
        </article>
      ))}
    </section>
  );
}

function SettlementCta({
  primaryHref,
  secondaryHref,
  onViewSettlementBreakdown,
  onViewFinalSplit,
}: {
  primaryHref?: string;
  secondaryHref?: string;
  onViewSettlementBreakdown?: () => void;
  onViewFinalSplit?: () => void;
}) {
  const primaryClasses =
    "inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[var(--rp-gradient-primary)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_38px_rgba(0,124,137,0.22)] transition hover:brightness-105";
  const secondaryClasses =
    "inline-flex min-h-14 w-full items-center justify-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-5 text-base font-black text-[var(--rp-primary)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-muted)]";

  return (
    <section className="grid gap-3 rounded-[28px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_90%,transparent)] p-4 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl">
      {primaryHref ? (
        <Link href={primaryHref} className={primaryClasses}>
          View settlement breakdown
          <ChevronRight className="ml-2 h-5 w-5" />
        </Link>
      ) : (
        <button type="button" onClick={onViewSettlementBreakdown} className={primaryClasses}>
          View settlement breakdown
          <ChevronRight className="ml-2 h-5 w-5" />
        </button>
      )}

      {secondaryHref ? (
        <Link href={secondaryHref} className={secondaryClasses}>
          View final split
        </Link>
      ) : (
        <button type="button" onClick={onViewFinalSplit} className={secondaryClasses}>
          View final split
        </button>
      )}
    </section>
  );
}

export function SettlementReceiptVerifiedScreen({
  backHref = "/pods",
  totalTripFareCents = 4680,
  rideType = "UberX",
  rideDate = "May 20, 2025",
  rideTime = "4:42 PM",
  receiptVerified = true,
  settlementReady = true,
  themeVariant,
  settlementBreakdownHref,
  finalSplitHref,
  onViewSettlementBreakdown,
  onViewFinalSplit,
}: SettlementReceiptVerifiedScreenProps) {
  return (
    <main
      data-theme={themeVariant}
      className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[34px] border border-[var(--rp-border)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)]"
    >
      <div className="flex min-h-[calc(100svh-2rem)] flex-col bg-[radial-gradient(circle_at_50%_-10%,rgba(34,197,94,0.16),transparent_30%),var(--rp-gradient-app)]">
        <TopBar backHref={backHref} />

        <div className="grid flex-1 content-start gap-4 px-5 py-5">
          <SuccessHero receiptVerified={receiptVerified} settlementReady={settlementReady} />
          <VerifiedFareCard
            totalTripFareCents={totalTripFareCents}
            rideType={rideType}
            rideDate={rideDate}
            rideTime={rideTime}
          />
          <ProtectionRuleCards />
        </div>

        <div className="px-5 pb-5">
          <SettlementCta
            primaryHref={settlementBreakdownHref}
            secondaryHref={finalSplitHref}
            onViewSettlementBreakdown={onViewSettlementBreakdown}
            onViewFinalSplit={onViewFinalSplit}
          />
        </div>
      </div>
    </main>
  );
}
