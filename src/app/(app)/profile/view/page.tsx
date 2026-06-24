"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import {
  formatRideAppTrustMetric,
  getRideAppTrustSummary,
  type RideAppTrustSummary,
} from "@/lib/ride-app-trust";

type ProfileRole = "host" | "rider";

function getProfileStats(name: string, role: ProfileRole) {
  const seed = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const isHost = role === "host";
  const hostedCount = isHost ? 12 + (seed % 18) : seed % 5;
  const joinedCount = isHost ? 24 + (seed % 28) : 8 + (seed % 34);
  const completedCount = isHost ? 31 + (seed % 30) : 10 + (seed % 38);
  const cancelledCount = seed % 4;
  const noShowCount = seed % 3;
  const totalHistory = Math.max(1, hostedCount + joinedCount);
  const noShowRate = Math.round((noShowCount / totalHistory) * 100);
  const completionRate = Math.round((completedCount / Math.max(1, completedCount + cancelledCount + noShowCount)) * 100);
  const rating = (4.5 + (seed % 5) / 10).toFixed(1);

  return {
    rating,
    hostedCount,
    joinedCount,
    completedCount,
    cancelledCount,
    noShowCount,
    noShowRate,
    completionRate,
  };
}

function getTrustUserId(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized ? `profile-${normalized}` : "profile-host";
}

function compactRating(value: number | null, count: number) {
  if (value == null || count <= 0) return "No ratings yet";
  return `${value.toFixed(1)} from ${count}`;
}

function getIssueCount(summary: RideAppTrustSummary) {
  return (
    summary.hostStats.hostLateCancelCount +
    summary.hostStats.hostConfirmedReportsCount +
    summary.riderStats.riderNoShowCount +
    summary.riderStats.riderLateLeaveCount +
    summary.riderStats.riderConfirmedReportsCount
  );
}

function ProfileViewPageContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name")?.trim() || "RidePod member";
  const role = searchParams.get("role") === "rider" ? "rider" : "host";
  const roleLabel = role === "host" ? "Host" : "Rider";
  const stats = getProfileStats(name, role);
  const trustSummary = getRideAppTrustSummary(getTrustUserId(name));
  const issueCount = getIssueCount(trustSummary);
  const isGoodStanding = trustSummary.warningLevel === "none";

  return (
    <main className="min-h-screen bg-[var(--rp-bg)] px-4 pb-24 pt-4 text-[var(--rp-text)]">
      <div className="mx-auto grid max-w-md gap-4">
        <Link
          href="/home?tab=one_off"
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <section className="overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.14),transparent_34%),linear-gradient(145deg,rgba(13,24,39,0.98),rgba(3,10,18,0.98))] p-5 shadow-[0_20px_56px_rgba(0,0,0,0.38)]">
          <div className="flex items-start gap-4">
            <span className="grid h-18 w-18 shrink-0 place-items-center rounded-full border border-[var(--rp-primary)]/55 bg-[var(--rp-primary)]/10 text-2xl font-black text-[var(--rp-primary)]">
              {name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">View Profile</p>
              <h1 className="mt-1 break-words text-2xl font-black leading-tight text-white">{name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="cyan">{roleLabel}</Badge>
                <Badge tone={isGoodStanding ? "gold" : "rose"}>{trustSummary.trustLevel}</Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-[var(--rp-primary)]/28 bg-[linear-gradient(135deg,rgba(242,193,91,0.16),rgba(103,232,249,0.07))] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">Trust score</p>
                <p className="mt-1 text-5xl font-black leading-none text-[var(--rp-primary)]">{trustSummary.rideAppTrustScore}</p>
              </div>
              <div className="grid justify-items-end gap-2 text-right">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--rp-primary)]/35 bg-black/22 px-3 py-1 text-sm font-black text-[var(--rp-primary)]">
                  <ShieldCheck className="h-4 w-4" />
                  {isGoodStanding ? "Good standing" : "Needs review"}
                </span>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
                  {issueCount} issue{issueCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Rating" value={stats.rating} helper="/ 5" tone="gold" icon={<Star className="h-4 w-4" />} />
          <StatCard label="Completed" value={stats.completedCount} helper="rides" icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label="Hosted" value={stats.hostedCount} helper="as host" tone="gold" icon={<UserRound className="h-4 w-4" />} />
          <StatCard label="As rider" value={stats.joinedCount} helper="joined pods" tone="cyan" icon={<BarChart3 className="h-4 w-4" />} />
        </section>

        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <SectionTitle title="Reliability" />
          <div className="mt-4 grid gap-3">
            <ProgressRow label="Completion" value={`${stats.completionRate}%`} percent={stats.completionRate} tone="cyan" />
            <ProgressRow label="No-show" value={`${stats.noShowRate}%`} percent={stats.noShowRate} tone="gold" />
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {stats.noShowCount === 0
              ? "No recent no-show records in demo history."
              : `${stats.noShowCount} no-show record${stats.noShowCount === 1 ? "" : "s"} in demo history.`}
          </p>
        </section>

        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <SectionTitle title="Ride app trust stats" />
          <div className="mt-4 grid gap-3">
            <TrustRows
              title="Host trust"
              rows={[
                ["Hosted rides", String(trustSummary.hostStats.hostedRideAppPodsCount)],
                ["Rating", compactRating(trustSummary.hostStats.hostRatingAverage, trustSummary.hostStats.hostRatingCount)],
                ["Completion", formatRideAppTrustMetric(trustSummary.hostStats.hostCompletionRate)],
                ["Show-up", formatRideAppTrustMetric(trustSummary.hostStats.hostShowUpRate)],
              ]}
            />
            <TrustRows
              title="Rider trust"
              rows={[
                ["Joined rides", String(trustSummary.riderStats.joinedRideAppPodsCount)],
                ["Rating", compactRating(trustSummary.riderStats.riderRatingAverage, trustSummary.riderStats.riderRatingCount)],
                ["Show-up", formatRideAppTrustMetric(trustSummary.riderStats.riderShowUpRate)],
                ["Late leaves", String(trustSummary.riderStats.riderLateLeaveCount)],
              ]}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ProfileViewPage() {
  return (
    <Suspense fallback={null}>
      <ProfileViewPageContent />
    </Suspense>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">{title}</h2>;
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "gold" | "cyan" | "rose" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em]",
        tone === "gold" && "border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]",
        tone === "cyan" && "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
        tone === "rose" && "border-rose-300/35 bg-rose-400/10 text-rose-100",
      )}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "white",
  icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: "gold" | "cyan" | "white";
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      <div className={cn("mb-3 inline-grid h-9 w-9 place-items-center rounded-full border", tone === "gold" ? "border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]" : tone === "cyan" ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/12 bg-white/8 text-white")}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">{label}</p>
      <p className={cn("mt-1 text-2xl font-black leading-none", tone === "gold" ? "text-[var(--rp-primary)]" : tone === "cyan" ? "text-cyan-100" : "text-white")}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--rp-muted-strong)]">{helper}</p>
    </div>
  );
}

function ProgressRow({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: "gold" | "cyan" }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
        <span className={cn("text-sm font-black", tone === "gold" ? "text-[var(--rp-primary)]" : "text-cyan-100")}>{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <span
          className={cn("block h-full rounded-full", tone === "gold" ? "bg-[var(--rp-primary)]" : "bg-cyan-300")}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function TrustRows({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
      <p className="text-sm font-black text-white">{title}</p>
      <div className="mt-3 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-[var(--rp-muted-strong)]">{label}</span>
            <span className="text-right font-black text-[var(--rp-text)]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
