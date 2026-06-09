"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, Crown, Gift, Sparkles, X } from "lucide-react";
import { cn } from "@/components/ui";
import {
  getMembershipTierInfo,
  activateMockRidePodPlus,
  organizerPlusBenefits,
  ridePodJoinFeeWaiverCopy,
  ridePodPlusBenefits,
  useRidePodMembershipState,
  type RidePodMembershipTier,
} from "@/lib/ridepod-membership";

const freeBenefits = [
  "Create and join pods",
  "Pod chat",
  "My Ride calendar",
  "Taxi and Ride app modes",
];

const tierPrices: Record<RidePodMembershipTier, string> = {
  free: "HK$0",
  plus: "Preview",
  organizer_plus: "Coming soon",
};

export default function MembershipPage() {
  const membership = useRidePodMembershipState();
  const [showPlusPreviewModal, setShowPlusPreviewModal] = useState(false);
  const [showPlusSuccessModal, setShowPlusSuccessModal] = useState(false);
  const currentTier = getMembershipTierInfo(membership.membershipTier);
  const isPlus = membership.membershipTier === "plus" && membership.plusActivated;
  const isOrganizerPlus = membership.membershipTier === "organizer_plus";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 pb-6">
      <header className="rounded-[28px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_top_right,rgba(242,193,91,0.18),transparent_34%),linear-gradient(135deg,rgba(11,22,32,0.98),rgba(5,11,18,0.94))] p-5 shadow-[var(--rp-shadow-soft)] sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]">
            <Crown className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">Membership</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--rp-text)] sm:text-4xl">
              RidePod Plus
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              More tools for frequent shared rides.
            </p>
            <p className="mt-3 inline-flex rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-1.5 text-xs font-black text-[var(--rp-muted-strong)]">
              No live subscription or payment is charged in this version.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-muted)]">Current plan</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--rp-text)]">{currentTier.label}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              {isPlus
                ? "You have Plus preview benefits."
                : isOrganizerPlus
                  ? "Organizer Plus is coming soon."
                  : "Create and join shared taxi pods."}
            </p>
            {isPlus ? (
              <p className="mt-3 rounded-2xl border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] px-4 py-3 text-sm font-black text-[var(--rp-primary)]">
                {membership.monthlyJoinFeeWaiversRemaining} / {membership.monthlyJoinFeeWaiversTotal} monthly waivers remaining
              </p>
            ) : null}
          </div>

          <button
            type="button"
            disabled={isOrganizerPlus}
            onClick={() => setShowPlusPreviewModal(true)}
            className={cn(
              "inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-black transition",
              isPlus
                ? "cursor-default border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]"
                : isOrganizerPlus
                  ? "cursor-not-allowed border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]"
                  : "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_26%,transparent)] hover:brightness-105",
            )}
          >
            {isPlus ? "Plus active" : isOrganizerPlus ? "Coming soon" : "Try Plus preview"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <TierCard
          tierId="free"
          title="Free"
          price={tierPrices.free}
          description="Create and join shared taxi pods."
          benefits={freeBenefits}
          current={membership.membershipTier === "free"}
          cta={membership.membershipTier === "free" ? "Current plan" : "Free plan"}
          disabled
        />
        <TierCard
          tierId="plus"
          title="RidePod Plus"
          price={tierPrices.plus}
          description="Extra tools for frequent shared rides."
          benefits={ridePodPlusBenefits}
          current={isPlus}
          cta={isPlus ? "Current plan" : "Try Plus preview"}
          highlighted
          note="No live payment is charged."
          onClick={() => setShowPlusPreviewModal(true)}
        />
        <TierCard
          tierId="organizer_plus"
          title="Organizer Plus"
          price={tierPrices.organizer_plus}
          description="Advanced host tools for recurring and larger pods."
          benefits={organizerPlusBenefits}
          cta="Coming soon"
          disabled
          comingSoon
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <InfoCard title="What Plus does not do" icon={<Sparkles className="h-5 w-5" />}>
          <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Plus does not guarantee a ride, taxi partner, refund, route change, or fare outcome.
          </p>
          <p className="mt-2 text-sm font-black leading-6 text-[var(--rp-muted-strong)]">
            Ride fares and taxi partner quotes are not included.
          </p>
        </InfoCard>

        <InfoCard title="Monthly waivers" icon={<Gift className="h-5 w-5" />}>
          <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Plus waivers apply to the HK$5 RidePod join fee on eligible pod joins.
          </p>
          <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            <li>- Taxi fares are not included.</li>
            <li>- Taxi partner quotes are not included.</li>
            <li>- Ride app fares are paid outside RidePod.</li>
          </ul>
        </InfoCard>
      </section>

      {showPlusPreviewModal ? (
        <PlusPreviewModal
          active={isPlus}
          onClose={() => setShowPlusPreviewModal(false)}
          onActivate={() => {
            activateMockRidePodPlus();
            setShowPlusPreviewModal(false);
            setShowPlusSuccessModal(true);
          }}
        />
      ) : null}

      {showPlusSuccessModal ? (
        <PlusSuccessModal onClose={() => setShowPlusSuccessModal(false)} />
      ) : null}
    </div>
  );
}

function TierCard({
  tierId,
  title,
  price,
  description,
  benefits,
  current = false,
  highlighted = false,
  comingSoon = false,
  disabled = false,
  cta,
  note,
  onClick,
}: {
  tierId: RidePodMembershipTier;
  title: string;
  price: string;
  description: string;
  benefits: string[];
  current?: boolean;
  highlighted?: boolean;
  comingSoon?: boolean;
  disabled?: boolean;
  cta: string;
  note?: string;
  onClick?: () => void;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[24px] border bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]",
        highlighted
          ? "border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,rgba(242,193,91,0.18),transparent_38%),var(--rp-card)] shadow-[0_24px_70px_color-mix(in_srgb,var(--rp-primary)_13%,transparent)]"
          : comingSoon
            ? "border-[var(--rp-border)] opacity-78"
            : "border-[var(--rp-border)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-[var(--rp-text)]">{title}</h2>
          <p className="mt-2 text-3xl font-black text-[var(--rp-primary)]">{price}</p>
        </div>
        {comingSoon ? (
          <span className="rounded-full bg-[var(--rp-badge-neutral-bg)] px-3 py-1 text-xs font-black text-[var(--rp-badge-neutral-text)]">
            Coming soon
          </span>
        ) : current ? (
          <span className="rounded-full bg-[var(--rp-badge-success-bg)] px-3 py-1 text-xs font-black text-[var(--rp-badge-success-text)]">
            Current
          </span>
        ) : tierId === "plus" ? (
          <span className="rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
            Plus preview
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{description}</p>

      <ul className="mt-5 grid gap-3">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      {note ? (
        <p className="mt-4 rounded-2xl bg-[var(--rp-card-soft)] px-4 py-3 text-xs font-black leading-5 text-[var(--rp-muted-strong)]">
          {note}
        </p>
      ) : null}

      <button
        type="button"
        disabled={disabled || current || comingSoon}
        onClick={onClick}
        className={cn(
          "mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-70",
          highlighted
            ? "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_25%,transparent)] hover:brightness-105"
            : "border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] hover:bg-[var(--rp-card-muted)]",
        )}
      >
        {cta}
      </button>
    </article>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
          {icon}
        </span>
        <h2 className="text-lg font-black text-[var(--rp-text)]">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlusPreviewModal({
  active,
  onClose,
  onActivate,
}: {
  active: boolean;
  onClose: () => void;
  onActivate: () => void;
}) {
  const [checked, setChecked] = useState(false);

  if (active) {
    return (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="plus-active-title"
          className="w-full max-w-md rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">RidePod Plus</p>
              <h2 id="plus-active-title" className="mt-2 text-2xl font-black leading-tight">
                Plus preview active
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close Plus active modal"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            You are using RidePod Plus preview. No live subscription or payment is charged.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 min-h-12 w-full rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
          >
            Close
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-[rgba(3,7,18,0.72)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plus-preview-title"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="min-h-0 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">Plus preview</p>
              <h2 id="plus-preview-title" className="mt-2 text-2xl font-black leading-tight">
                Try RidePod Plus preview?
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close Plus preview modal"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Plus gives frequent riders extra tools while RidePod tests membership features.
          </p>

          <ul className="mt-5 grid gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
            {ridePodPlusBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-2xl bg-[var(--rp-card-soft)] px-4 py-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            No live subscription or payment is charged in this version. {ridePodJoinFeeWaiverCopy.appliesTo} only. {ridePodJoinFeeWaiverCopy.excludes}
          </p>

          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
            />
            <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
              I understand this is a preview and no live payment is charged.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_96%,transparent)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!checked}
            onClick={() => {
              if (checked) onActivate();
            }}
            className={cn(
              "min-h-12 rounded-2xl px-4 text-sm font-black transition",
              checked
                ? "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_25%,transparent)] hover:brightness-105"
                : "cursor-not-allowed border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
            )}
          >
            Activate Plus preview
          </button>
        </div>
      </section>
    </div>
  );
}

function PlusSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plus-success-title"
        className="w-full max-w-md rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-center text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-primary)]">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 id="plus-success-title" className="mt-4 text-2xl font-black leading-tight">
          Plus preview active
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          You now have RidePod Plus preview benefits.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-12 w-full rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
        >
          Done
        </button>
      </section>
    </div>
  );
}
