"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { ReportConcernModal } from "@/components/member-report-concern";
import { Badge, cn } from "@/components/ui";
import type { MemberSafetyReportContext } from "@/lib/member-safety-report";
import type { PublicMemberViewModel } from "@/lib/public-profile";

function PublicAvatar({
  member,
  size = "md",
}: {
  member: Pick<PublicMemberViewModel, "avatarUrl" | "displayName" | "initials">;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] bg-cover bg-center font-black text-[var(--rp-primary-text)] shadow-[var(--rp-shadow-soft)]",
        size === "sm" && "h-9 w-9 text-xs",
        size === "md" && "h-11 w-11 text-sm",
        size === "lg" && "h-16 w-16 text-lg",
      )}
      style={member.avatarUrl ? { backgroundImage: `url(${member.avatarUrl})` } : undefined}
    >
      {member.avatarUrl ? <span className="sr-only">{member.displayName}</span> : member.initials}
    </span>
  );
}

function PublicBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "role" | "state" }) {
  return (
    <Badge
      className={cn(
        "ring-[var(--rp-border)]",
        tone === "neutral" && "bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
        tone === "role" && "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]",
        tone === "state" && "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)]",
      )}
    >
      {children}
    </Badge>
  );
}

function PublicMemberSummary({ member, compact = false }: { member: PublicMemberViewModel; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PublicAvatar member={member} size={compact ? "sm" : "md"} />
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[var(--rp-text)]">{member.displayName}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <PublicBadge tone="role">{member.roleLabel}</PublicBadge>
          {member.memberStateLabel ? <PublicBadge tone="state">{member.memberStateLabel}</PublicBadge> : null}
          {member.badges.map((badge) => (
            <PublicBadge key={badge}>{badge}</PublicBadge>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PublicProfilePreview({
  member,
  reportContext,
  onClose,
}: {
  member: PublicMemberViewModel;
  reportContext?: MemberSafetyReportContext;
  onClose: () => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const safetyReportContext: MemberSafetyReportContext = {
    ...reportContext,
    reportedUserId: reportContext?.reportedUserId ?? member.id,
    reportedMemberDisplayName: reportContext?.reportedMemberDisplayName ?? member.displayName,
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.62)] px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <PublicAvatar member={member} size="lg" />
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-black text-[var(--rp-text)]">{member.displayName}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <PublicBadge tone="role">{member.roleLabel}</PublicBadge>
                {member.memberStateLabel ? <PublicBadge tone="state">{member.memberStateLabel}</PublicBadge> : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close public profile preview"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)] transition hover:bg-[var(--rp-card-muted)] hover:text-[var(--rp-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="text-sm font-black text-[var(--rp-text)]">Public pod preview</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {member.badges.length ? (
              member.badges.map((badge) => <PublicBadge key={badge}>{badge}</PublicBadge>)
            ) : (
              <p className="text-sm font-semibold text-[var(--rp-muted)]">No public badges yet.</p>
            )}
            {member.communityLabel ? <PublicBadge>{member.communityLabel}</PublicBadge> : null}
          </div>
          <p className="text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            Verified badges help RidePod support safer matching.
          </p>
        </div>

        <p className="mt-4 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          Private details like phone, email, gender identity, and ID review are not shown publicly.
        </p>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-danger)] transition hover:bg-[var(--rp-card-muted)]"
        >
          Report concern
        </button>
      </section>
      {reportOpen ? (
        <ReportConcernModal
          context={safetyReportContext}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </div>
  );
}

export function PublicMemberCard({
  member,
  reportContext,
  className,
}: {
  member: PublicMemberViewModel;
  reportContext?: MemberSafetyReportContext;
  className?: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className={cn(
          "w-full rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-left transition hover:border-[var(--rp-border-strong)] hover:bg-[var(--rp-card-muted)]",
          className,
        )}
      >
        <PublicMemberSummary member={member} />
      </button>
      {previewOpen ? (
        <PublicProfilePreview
          member={member}
          reportContext={reportContext}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}
