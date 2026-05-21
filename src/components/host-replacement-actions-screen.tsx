"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Crown,
  LogOut,
  MapPin,
  MoreHorizontal,
  ShieldCheck,
  UsersRound,
  Venus,
} from "lucide-react";
import { RidePodLogo } from "@/components/ridepod-logo";
import { cn } from "@/components/ui";

type GenderMode = "WOMEN_ONLY" | "MIXED";
type ThemeVariant = "light" | "dark";

export type HostReplacementActionsScreenProps = {
  backHref?: string;
  routeLabel?: string;
  departureTime?: string;
  riderCount?: number;
  riderCapacity?: number;
  genderMode?: GenderMode;
  lifecycleState?: string;
  paymentCaptureBlocked?: boolean;
  themeVariant?: ThemeVariant;
  onStayInPod?: () => void;
  onBecomeReplacementHost?: () => void;
  onLeavePod?: () => void;
};

type ActionTone = "blue" | "purple" | "red";

const actionToneClasses: Record<ActionTone, string> = {
  blue: "host-replacement-action-blue",
  purple: "host-replacement-action-purple",
  red: "host-replacement-action-red",
};

function RouteMiniMap() {
  return (
    <div className="relative h-16 min-w-24 overflow-hidden rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)]">
      <svg aria-hidden="true" viewBox="0 0 120 64" className="absolute inset-0 h-full w-full">
        <path d="M8 44 C28 16 50 48 72 24 S98 18 112 38" fill="none" stroke="rgba(59,130,246,0.28)" strokeWidth="16" />
        <path d="M8 44 C28 16 50 48 72 24 S98 18 112 38" fill="none" stroke="#3b82f6" strokeLinecap="round" strokeWidth="5" />
        <circle cx="8" cy="44" r="5" fill="#fbbf24" />
        <circle cx="112" cy="38" r="5" fill="#60a5fa" />
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:18px_18px]" />
    </div>
  );
}

function ActionCard({
  title,
  subtitle,
  icon,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: ActionTone;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "host-replacement-action group grid min-h-[138px] gap-3 rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 hover:brightness-110",
        actionToneClasses[tone],
      )}
    >
      <span className="host-replacement-action-icon grid h-11 w-11 place-items-center rounded-2xl text-current">
        {icon}
      </span>
      <span>
        <span className="block text-base font-black leading-tight text-[var(--rp-text)]">{title}</span>
        <span className="mt-1 block text-sm font-bold leading-5 text-current">{subtitle}</span>
      </span>
    </button>
  );
}

export function HostReplacementActionsScreen({
  backHref = "/pods",
  routeLabel = "USC \u2192 LAX",
  departureTime = "Today \u2022 4:30 PM",
  riderCount = 3,
  riderCapacity = 4,
  genderMode = "WOMEN_ONLY",
  lifecycleState = "HOST_REPLACEMENT_NEEDED",
  paymentCaptureBlocked = true,
  themeVariant,
  onStayInPod,
  onBecomeReplacementHost,
  onLeavePod,
}: HostReplacementActionsScreenProps) {
  const genderLabel = genderMode === "WOMEN_ONLY" ? "Women-only" : "Mixed pod";
  const replacementActive = lifecycleState === "HOST_REPLACEMENT_NEEDED";

  return (
    <main
      data-theme={themeVariant}
      className="host-replacement-actions mx-auto w-full max-w-[430px] overflow-hidden rounded-[34px] border border-[var(--rp-border)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)]"
    >
      <div className="flex min-h-[calc(100svh-2rem)] flex-col bg-[radial-gradient(circle_at_14%_0%,rgba(245,158,11,0.18),transparent_28%),var(--rp-gradient-app)]">
        <header className="grid grid-cols-[48px_1fr_48px] items-center gap-3 px-5 pt-5">
          <Link
            href={backHref}
            aria-label="Back to pod"
            className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <RidePodLogo className="mx-auto h-8 justify-center" imageClassName="max-w-[150px]" priority />
          <button
            type="button"
            aria-label="More replacement options"
            className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </header>

        <section className="relative mt-5 overflow-hidden border-y border-[var(--rp-border)] px-5 py-8">
          <div className="host-replacement-hero-scene absolute inset-0" />
          <div className="relative z-10">
            <div className="host-replacement-warning-icon grid h-14 w-14 place-items-center rounded-[22px] border shadow-[0_14px_34px_rgba(245,158,11,0.18)]">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-[2.55rem] font-black leading-[0.98] tracking-normal text-[var(--rp-text)]">
              Host canceled
              <br />
              Pod is still active
            </h1>
            <p className="mt-4 max-w-[22rem] text-base font-bold leading-6 text-[var(--rp-muted-strong)]">
              No payment will be captured unless a replacement host books the ride.
            </p>
          </div>
        </section>

        <div className="grid flex-1 gap-4 px-5 py-5">
          <section className="rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
                  <MapPin className="h-4 w-4" />
                  Replacement mode
                </div>
                <h2 className="mt-3 text-[2rem] font-black leading-none text-[var(--rp-text)]">{routeLabel}</h2>
                <p className="mt-2 text-sm font-bold text-[var(--rp-muted)]">{departureTime}</p>
                <p className="mt-1 text-sm font-black text-[var(--rp-muted-strong)]">
                  {riderCount} / {riderCapacity} riders
                </p>
              </div>
              <RouteMiniMap />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="host-replacement-women-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black">
                <Venus className="h-4 w-4" />
                {genderLabel}
              </span>
              {replacementActive ? (
                <span className="host-replacement-needed-badge inline-flex items-center rounded-full border px-3 py-2 text-xs font-black">
                  Host replacement needed
                </span>
              ) : null}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-3">
            <ActionCard
              title="Stay in pod"
              subtitle="Keep your spot"
              tone="blue"
              icon={<UsersRound className="h-5 w-5" />}
              onClick={onStayInPod}
            />
            <ActionCard
              title="Become replacement host"
              subtitle="Upload fresh quote next"
              tone="purple"
              icon={<Crown className="h-5 w-5" />}
              onClick={onBecomeReplacementHost}
            />
            <ActionCard
              title="Leave pod"
              subtitle="Get a full refund"
              tone="red"
              icon={<LogOut className="h-5 w-5" />}
              onClick={onLeavePod}
            />
          </section>

          <section className="host-replacement-protection-card rounded-[28px] border p-5 shadow-[var(--rp-shadow-soft)]">
            <div className="flex gap-4">
              <div className="host-replacement-protection-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-black leading-6 text-[var(--rp-text)]">Your seat commitment is still tracked.</p>
                <p className="mt-2 text-sm font-bold leading-6 text-[var(--rp-muted)]">
                  {paymentCaptureBlocked
                    ? "It stays in review unless a replacement host books the ride."
                    : "RidePod will keep the commitment in review while this pod is reviewed."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
