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
type ThemeVariant = "dark";

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
  requiredAction?: string | null;
  themeVariant?: ThemeVariant;
  backHref?: string;
  onAuthorize?: () => Promise<boolean> | boolean;
};

function formatDollars(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function getEligibilityCta(requiredAction?: string | null) {
  switch (requiredAction) {
    case "PROFILE_REQUIRED":
    case "TRUST_SCORE_TOO_LOW":
      return { label: "Update profile", href: "/profile" };
    case "GENDER_VERIFICATION_REQUIRED":
    case "PHONE_VERIFICATION_REQUIRED":
    case "COMMUNITY_VERIFICATION_REQUIRED":
      return { label: "Verify account", href: "/profile" };
    case "VALID_INVITE_REQUIRED":
      return { label: "Enter invite code", href: "#invite-code" };
    case "CONTACT_SUPPORT":
      return { label: "Contact support", href: "mailto:support@ridepod.local" };
    default:
      return { label: "Update profile", href: "/profile" };
  }
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
          ? "border-fuchsia-300/30 bg-fuchsia-500/14 text-fuchsia-200"
          : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[#2f84ff]",
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
          {genderMode === "WOMEN_ONLY" ? "Women-only" : "Open pod"}
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
        <path className="join-map-road" d="M164 0 C154 58 178 106 170 162 S156 252 170 335" />
        <path className="join-map-road" d="M340 0 C326 84 348 160 338 335" />
        <path className="join-map-road thin" d="M0 104 C58 112 116 98 170 116 S314 126 430 110" />
        <path className="join-map-road thin" d="M0 198 C56 188 118 204 188 194 S326 176 430 182" />
        <path className="join-map-road thin" d="M0 282 C84 258 184 266 430 252" />
        <path className="join-map-route-shadow" d="M84 137 H126 L139 174 H164 L176 198 H244 L262 220 H286 L298 238 H318 L330 256 H366" />
        <path className="join-map-route" d="M84 137 H126 L139 174 H164 L176 198 H244 L262 220 H286 L298 238 H318 L330 256 H366" />
        <circle className="join-map-route-dot" cx="366" cy="256" r="4.5" />
      </svg>

      <div className="absolute left-[64px] top-[90px] z-10">
        <div className="join-map-marker bg-[#246dff]">
          <Building2 className="h-7 w-7 text-white" />
        </div>
        <p className="mt-2 text-[32px] font-black leading-none text-[var(--rp-text)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          {originLabel}
        </p>
      </div>

      <div className="absolute right-[38px] top-[226px] z-10">
        <div className="join-map-marker bg-[#092344]">
          <Plane className="h-7 w-7 fill-white text-white" />
        </div>
        <p className="mt-2 text-[32px] font-black leading-none text-[var(--rp-text)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
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
    <div className="min-w-0 rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-base font-black leading-6 text-[var(--rp-text)]">
            {title}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
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
      <div className="absolute inset-0 rounded-full bg-[var(--rp-primary)]/18 blur-2xl" />
      <ShieldCheck className="relative h-24 w-24 fill-[var(--rp-primary)]/18 text-[var(--rp-primary)] drop-shadow-[0_12px_26px_rgba(242,193,91,0.24)]" />
      <LockKeyhole className="absolute h-9 w-9 text-[var(--rp-primary)]" />
    </div>
  );
}

export function JoinPodMapFirstScreen({
  originLabel = "USC",
  destinationLabel = "LAX",
  routeLabel,
  departureTime = "Today, 4:30 PM",
  estimate = "Est. 35??5 min",
  riderCount = 3,
  riderCapacity = 4,
  seatsLeft = 4,
  genderMode = "WOMEN_ONLY",
  maxChargeCents = 1800,
  isEligible = true,
  isAuthorized = false,
  blockingReason,
  requiredAction,
  themeVariant = "dark",
  backHref = "/pods",
  onAuthorize,
}: JoinPodMapFirstScreenProps) {
  const [authorized, setAuthorized] = useState(isAuthorized);
  const [pending, setPending] = useState(false);
  const genderLabel = genderMode === "WOMEN_ONLY" ? "Women-only" : "Open pod";
  const displayRoute = routeLabel ?? `${originLabel} \u2192 ${destinationLabel}`;
  const eligibilityCta = getEligibilityCta(requiredAction);

  async function handleAuthorize() {
    if (!isEligible || pending || authorized) return;
    if (!onAuthorize) return;
    setPending(true);
    const result = await onAuthorize();
    setPending(false);
    if (result) setAuthorized(true);
  }

  return (
    <div
      data-theme={themeVariant}
      className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[30px] border border-[var(--rp-border)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_30px_80px_rgba(0,0,0,0.34)] min-[560px]:rounded-[34px]"
    >
      <header className="grid h-[88px] grid-cols-[56px_1fr_56px] items-center px-5">
        <Link
          href={backHref}
          aria-label="Back to pod"
          className="grid h-12 w-12 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
        >
          <ArrowLeft className="h-8 w-8" />
        </Link>
        <div className="flex justify-center">
          <RidePodLogo className="h-10" priority />
        </div>
        <div className="grid h-12 w-12 place-items-center justify-self-end rounded-full text-[var(--rp-text)]">
          <ShieldCheck className="h-8 w-8" />
        </div>
      </header>

      <StaticRouteMap
        originLabel={originLabel}
        destinationLabel={destinationLabel}
        genderMode={genderMode}
      />

      <section className="-mt-5 grid gap-5 rounded-t-[30px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-6 shadow-[0_-20px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-[36px] font-black leading-none tracking-[0.02em] text-[var(--rp-text)]">
              {displayRoute}
            </h1>
            <p className="mt-4 text-lg font-semibold text-[var(--rp-muted)]">
              {departureTime}
              <span className="px-4 text-[#6f7f94]">.</span>
              {estimate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[34px] font-black leading-none text-[var(--rp-text)]">
              {riderCount}/{riderCapacity}
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--rp-muted)]">
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
            icon={<ShieldCheck className="h-11 w-11 text-[var(--rp-success)]" />}
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

        <div className="overflow-hidden rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] p-5 shadow-[inset_0_0_60px_rgba(47,132,255,0.08)]">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="min-w-0">
              <p className="text-[28px] font-black leading-tight text-[var(--rp-text)]">
                Your max charge: <span className="text-[var(--rp-primary)]">{formatDollars(maxChargeCents)}</span>
              </p>
              <p className="mt-4 max-w-[280px] text-base font-semibold leading-7 text-[var(--rp-muted)]">
                Your max charge is the most you can be charged unless you approve a higher fare. Final charge uses the verified receipt and may be lower.
              </p>
            </div>
            <ShieldLockVisual />
          </div>
        </div>

        {isEligible ? (
          <div className="rounded-2xl border border-[var(--rp-success)]/25 bg-[var(--rp-success)]/10 p-4 text-sm font-bold leading-6 text-[var(--rp-success)]">
            You&rsquo;re eligible to join this pod.
          </div>
        ) : (
          <div className="grid gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-4 text-sm font-bold leading-6 text-[var(--rp-warning)]">
            <div>
              <p className="text-base font-black">You can&rsquo;t join this pod yet.</p>
              <p className="mt-1 font-semibold">
                {blockingReason ?? "This pod is not available for your profile."}
              </p>
            </div>
            <Link
              href={eligibilityCta.href}
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card)] px-4 text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-soft)]"
            >
              {eligibilityCta.label}
            </Link>
          </div>
        )}

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
