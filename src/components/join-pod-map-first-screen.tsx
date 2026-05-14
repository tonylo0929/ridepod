"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  LockKeyhole,
  Plane,
  Route,
  ShieldCheck,
  UsersRound,
  Venus,
} from "lucide-react";
import { RidePodLogo } from "@/components/ridepod-logo";
import { cn } from "@/components/ui";

type GenderMode = "WOMEN_ONLY" | "MIXED";
type ThemeVariant = "light" | "dark";

export type JoinPodMapFirstScreenProps = {
  originLabel?: string;
  destinationLabel?: string;
  routeLabel?: string;
  departureTime?: string;
  estimate?: string;
  riderCount?: number;
  riderCapacity?: number;
  seatsLeft?: number;
  genderMode?: GenderMode;
  maxChargeCents?: number;
  isEligible?: boolean;
  isAuthorized?: boolean;
  blockingReason?: string | null;
  themeVariant?: ThemeVariant;
  backHref?: string;
  onAuthorize?: () => Promise<boolean | void> | boolean | void;
};

function formatDollars(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function Chip({
  children,
  tone = "blue",
  icon,
}: {
  children: React.ReactNode;
  tone?: "blue" | "purple";
  icon: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 text-sm font-black",
        tone === "purple"
          ? "border-fuchsia-300/30 bg-fuchsia-500/14 text-fuchsia-200 [[data-theme=light]_&]:border-fuchsia-200 [[data-theme=light]_&]:bg-fuchsia-50 [[data-theme=light]_&]:text-fuchsia-700"
          : "border-blue-300/18 bg-blue-500/12 text-[#2f84ff] [[data-theme=light]_&]:border-blue-100 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:text-blue-700",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function StaticRouteMap({
  originLabel,
  destinationLabel,
  genderMode,
}: {
  originLabel: string;
  destinationLabel: string;
  genderMode: GenderMode;
}) {
  return (
    <section className="join-pod-map-static relative min-h-[335px] overflow-hidden rounded-b-[30px] border border-[var(--rp-border)] min-[560px]:rounded-[30px]">
      <div className="absolute left-[40%] top-5 z-20 -translate-x-1/2 rounded-full border border-fuchsia-200/25 bg-gradient-to-b from-fuchsia-400 to-fuchsia-700 px-5 py-3 text-base font-black text-white shadow-[0_12px_32px_rgba(168,85,247,0.35)]">
        <span className="inline-flex items-center gap-2">
          <Venus className="h-5 w-5" />
          {genderMode === "WOMEN_ONLY" ? "Women-only" : "Mixed pod"}
        </span>
      </div>

      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 430 335"
        preserveAspectRatio="none"
      >
        <path className="join-map-road major" d="M0 236 C64 198 98 190 154 198 S252 228 430 192" />
        <path className="join-map-road" d="M8 68 C90 76 145 60 218 84 S356 92 430 62" />
        <path className="join-map-road" d="M40 0 C72 76 94 128 108 335" />
        <path className="join-map-road" d="M262 0 C252 88 282 150 268 335" />
        <path className="join-map-road" d="M0 156 C84 144 180 152 430 138" />
        <path className="join-map-road thin" d="M0 104 C58 112 116 98 170 116 S314 126 430 110" />
        <path className="join-map-road thin" d="M0 282 C84 258 184 266 430 252" />
        <path className="join-map-route-shadow" d="M84 137 H126 L139 174 H164 L176 198 H244 L262 220 H286 L298 238 H318 L330 256 H366" />
        <path className="join-map-route" d="M84 137 H126 L139 174 H164 L176 198 H244 L262 220 H286 L298 238 H318 L330 256 H366" />
        <circle className="join-map-route-dot" cx="366" cy="256" r="4.5" />
      </svg>

      <div className="absolute left-[64px] top-[90px] z-10">
        <div className="join-map-marker bg-[#246dff]">
          <Building2 className="h-7 w-7 text-white" />
        </div>
        <p className="mt-2 text-[32px] font-black leading-none text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] [[data-theme=light]_&]:text-slate-950 [[data-theme=light]_&]:drop-shadow-none">
          {originLabel}
        </p>
      </div>

      <div className="absolute right-[38px] top-[226px] z-10">
        <div className="join-map-marker bg-[#092344]">
          <Plane className="h-7 w-7 fill-white text-white" />
        </div>
        <p className="mt-2 text-[32px] font-black leading-none text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] [[data-theme=light]_&]:text-slate-950 [[data-theme=light]_&]:drop-shadow-none">
          {destinationLabel}
        </p>
      </div>

      <span className="join-map-highway left-[30px] top-[72px]">10</span>
      <span className="join-map-highway left-[245px] top-[242px]">110</span>
      <span className="join-map-highway bottom-[35px] right-[86px]">105</span>
      <span className="join-map-label left-[150px] top-[84px]">MID CITY</span>
      <span className="join-map-label right-[92px] top-[106px]">KOREATOWN</span>
      <span className="join-map-label left-[178px] top-[210px]">VERNON</span>
      <span className="join-map-label left-[32px] top-[246px]">CULVER CITY</span>
    </section>
  );
}

function ProtectionTile({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[22px] border border-white/12 bg-white/[0.035] p-4 [[data-theme=light]_&]:border-[#e0e7f0] [[data-theme=light]_&]:bg-white">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-base font-black leading-6 text-white [[data-theme=light]_&]:text-slate-950">
            {title}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#b9c7d8] [[data-theme=light]_&]:text-slate-700">
            {children}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShieldLockVisual() {
  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
      <div className="absolute inset-0 rounded-full bg-[#f2c15b]/18 blur-2xl [[data-theme=light]_&]:bg-blue-500/12" />
      <ShieldCheck className="relative h-24 w-24 fill-[#f2c15b]/18 text-[#f2c15b] drop-shadow-[0_12px_26px_rgba(242,193,91,0.24)] [[data-theme=light]_&]:fill-blue-500/15 [[data-theme=light]_&]:text-blue-700" />
      <LockKeyhole className="absolute h-9 w-9 text-[#f2c15b] [[data-theme=light]_&]:text-blue-700" />
    </div>
  );
}

export function JoinPodMapFirstScreen({
  originLabel = "USC",
  destinationLabel = "LAX",
  routeLabel,
  departureTime = "Today, 4:30 PM",
  estimate = "Est. 35-45 min",
  riderCount = 3,
  riderCapacity = 4,
  seatsLeft = 4,
  genderMode = "WOMEN_ONLY",
  maxChargeCents = 1800,
  isEligible = true,
  isAuthorized = false,
  blockingReason,
  themeVariant,
  backHref = "/pods",
  onAuthorize,
}: JoinPodMapFirstScreenProps) {
  const [authorized, setAuthorized] = useState(isAuthorized);
  const [pending, setPending] = useState(false);
  const genderLabel = genderMode === "WOMEN_ONLY" ? "Women-only" : "Mixed pod";
  const displayRoute = routeLabel ?? `${originLabel} \u2192 ${destinationLabel}`;

  async function handleAuthorize() {
    if (!isEligible || pending || authorized) return;
    setPending(true);
    const result = await onAuthorize?.();
    setPending(false);
    if (result !== false) setAuthorized(true);
  }

  return (
    <div
      data-theme={themeVariant}
      className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[30px] border border-[var(--rp-border)] bg-[#020812] text-white shadow-[0_30px_80px_rgba(0,0,0,0.34)] [[data-theme=light]_&]:bg-[#fbfdff] [[data-theme=light]_&]:text-slate-950 min-[560px]:rounded-[34px]"
    >
      <header className="grid h-[88px] grid-cols-[56px_1fr_56px] items-center px-5">
        <Link
          href={backHref}
          aria-label="Back to pod"
          className="grid h-12 w-12 place-items-center rounded-full text-white transition hover:bg-white/8 [[data-theme=light]_&]:text-slate-950 [[data-theme=light]_&]:hover:bg-slate-100"
        >
          <ArrowLeft className="h-8 w-8" />
        </Link>
        <div className="flex justify-center">
          <RidePodLogo className="h-10" priority />
        </div>
        <div className="grid h-12 w-12 place-items-center justify-self-end rounded-full text-white [[data-theme=light]_&]:text-slate-950">
          <ShieldCheck className="h-8 w-8" />
        </div>
      </header>

      <StaticRouteMap
        originLabel={originLabel}
        destinationLabel={destinationLabel}
        genderMode={genderMode}
      />

      <section className="-mt-5 grid gap-5 rounded-t-[30px] border border-white/10 bg-[#06131f]/96 p-6 shadow-[0_-20px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl [[data-theme=light]_&]:border-[#e0e7f0] [[data-theme=light]_&]:bg-white">
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-[36px] font-black leading-none tracking-[0.02em] text-white [[data-theme=light]_&]:text-slate-950">
              {displayRoute}
            </h1>
            <p className="mt-4 text-lg font-semibold text-[#b9c7d8] [[data-theme=light]_&]:text-slate-700">
              {departureTime}
              <span className="px-4 text-[#6f7f94]">.</span>
              {estimate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[34px] font-black leading-none text-white [[data-theme=light]_&]:text-slate-950">
              {riderCount}/{riderCapacity}
            </p>
            <p className="mt-2 text-lg font-semibold text-[#b9c7d8] [[data-theme=light]_&]:text-slate-700">
              Riders
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-3">
          <Chip icon={<UsersRound className="h-5 w-5" />}>{seatsLeft} Seats left</Chip>
          <Chip icon={<Route className="h-5 w-5" />}>Direct route</Chip>
          <Chip tone="purple" icon={<Venus className="h-5 w-5" />}>{genderLabel}</Chip>
        </div>

        <div className="grid gap-3 min-[390px]:grid-cols-2">
          <ProtectionTile
            title="Payment protected"
            icon={<ShieldCheck className="h-11 w-11 text-emerald-400 [[data-theme=light]_&]:text-emerald-600" />}
          >
            Money is locked.<br />
            You&apos;re never overcharged.
          </ProtectionTile>
          <ProtectionTile
            title="Seat confirms after authorization"
            icon={<LockKeyhole className="h-11 w-11 fill-[#2f84ff]/18 text-[#2f84ff]" />}
          >
            Chat &amp; exact pickup unlock after lock.
          </ProtectionTile>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#f2c15b]/24 bg-[#071728] p-5 shadow-[inset_0_0_60px_rgba(47,132,255,0.08)] [[data-theme=light]_&]:border-blue-200 [[data-theme=light]_&]:bg-[#f8fbff]">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="min-w-0">
              <p className="text-[28px] font-black leading-tight text-white [[data-theme=light]_&]:text-slate-950">
                Your max charge: <span className="text-[#f2c15b] [[data-theme=light]_&]:text-blue-700">{formatDollars(maxChargeCents)}</span>
              </p>
              <p className="mt-4 max-w-[280px] text-base font-semibold leading-7 text-[#b9c7d8] [[data-theme=light]_&]:text-slate-700">
                You will never pay more than this unless you approve a higher fare.
              </p>
            </div>
            <ShieldLockVisual />
          </div>
        </div>

        {!isEligible ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/12 p-4 text-sm font-bold leading-6 text-amber-100 [[data-theme=light]_&]:bg-amber-50 [[data-theme=light]_&]:text-amber-900">
            {blockingReason ?? "This pod is not available for your profile."}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleAuthorize}
          disabled={!isEligible || pending || authorized}
          className="min-h-16 rounded-[22px] bg-gradient-to-b from-[#0878ff] to-[#0052e8] px-5 text-lg font-black text-white shadow-[0_16px_32px_rgba(0,82,232,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {authorized ? (
            <span className="inline-flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Seat locked
            </span>
          ) : pending ? (
            "Authorizing..."
          ) : (
            "Authorize payment and lock seat"
          )}
        </button>
      </section>
    </div>
  );
}
