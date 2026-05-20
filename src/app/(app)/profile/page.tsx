"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  IdCard,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  getCurrentProfile,
  idVerificationStatusLabel,
  mockRidePodProfile,
  normalizeIdVerificationStatus,
  requestManualIdVerificationReview,
  updateCurrentProfile,
  type RidePodGenderIdentity,
} from "@/lib/supabase/auth";
import type { RidePodProfileRow } from "@/lib/supabase/types";
import { cn } from "@/components/ui";

const genderOptions: Array<{ value: RidePodGenderIdentity; label: string }> = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
  { value: "UNKNOWN", label: "Unknown" },
];

type ProfileFormState = {
  displayName: string;
  phone: string;
  genderIdentity: RidePodGenderIdentity;
  communityId: string;
  safetyNote: string;
};

function formStateFromProfile(profile: RidePodProfileRow): ProfileFormState {
  return {
    displayName: profile.display_name ?? "",
    phone: profile.phone ?? "",
    genderIdentity: normalizeGenderIdentity(profile.gender_identity),
    communityId: profile.community_id ?? "",
    safetyNote: profile.safety_note ?? "",
  };
}

function normalizeGenderIdentity(value: RidePodProfileRow["gender_identity"]): RidePodGenderIdentity {
  if (value === "FEMALE" || value === "MALE" || value === "NON_BINARY" || value === "PREFER_NOT_TO_SAY") {
    return value;
  }

  return "UNKNOWN";
}

function initialsFor(name: string) {
  const initials = name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return initials.toUpperCase() || "RP";
}

function trustLevel(profile: RidePodProfileRow | null) {
  if (profile?.risk_status === "RESTRICTED" || profile?.risk_status === "SUSPENDED") {
    return "Limited access";
  }

  return "Normal";
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<RidePodProfileRow | null>(mockRidePodProfile);
  const [form, setForm] = useState<ProfileFormState>(() => formStateFromProfile(mockRidePodProfile));
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestReviewOpen, setRequestReviewOpen] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const result = await getCurrentProfile();
      if (!active) return;

      setLoading(false);
      setIsLoggedIn(result.isLoggedIn);
      setFallbackNote(result.fallbackNote);
      setLoadError(result.userFacingError);

      if (result.profile) {
        setProfile(result.profile);
        setForm(formStateFromProfile(result.profile));
      } else {
        setProfile(null);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const displayName = form.displayName.trim() || profile?.display_name || "RidePod user";
  const initials = useMemo(() => initialsFor(displayName), [displayName]);
  const email = profile?.email ?? "Not available";
  const hasCommunity = Boolean(form.communityId.trim());

  async function onSaveProfile() {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    const result = await updateCurrentProfile({
      displayName: form.displayName,
      phone: form.phone,
      genderIdentity: form.genderIdentity,
      communityId: form.communityId,
      safetyNote: form.safetyNote,
    });

    setSaving(false);
    setFallbackNote(result.fallbackNote);

    if (!result.ok) {
      setSaveError(result.userFacingMessage);
      return;
    }

    if (result.profile) {
      setProfile(result.profile);
      setForm(formStateFromProfile(result.profile));
    }

    setSaveMessage(result.userFacingMessage);
  }

  async function onRequestManualReview() {
    setRequestingReview(true);
    setSaveMessage(null);
    setSaveError(null);

    const result = await requestManualIdVerificationReview();
    setRequestingReview(false);
    setRequestReviewOpen(false);
    setFallbackNote(result.fallbackNote);

    if (!result.ok) {
      setSaveError(result.userFacingMessage);
      return;
    }

    if (result.profile) {
      setProfile(result.profile);
      setForm(formStateFromProfile(result.profile));
    }

    setSaveMessage(result.userFacingMessage);
  }

  if (!loading && !isLoggedIn) {
    return (
      <div className="mx-auto grid w-full max-w-[560px] gap-4">
        <PageHeader />
        <ProfileCard>
          <div className="grid gap-3 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-[var(--rp-text)]">Log in to continue</h2>
            <p className="text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              Profile and trust settings are connected to your RidePod account.
            </p>
            <Link
              href="/login"
              className="mt-2 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
            >
              Log in
            </Link>
          </div>
        </ProfileCard>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[980px] gap-4 pb-3">
      <PageHeader />

      {fallbackNote ? (
        <p className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-semibold text-[var(--rp-muted)]">
          {fallbackNote}
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-2xl border border-[var(--rp-danger)] bg-[color-mix(in_srgb,var(--rp-danger)_10%,transparent)] px-4 py-3 text-sm font-bold text-[var(--rp-danger)]">
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid gap-4">
          <ProfileCard>
            <SectionTitle title="Basic profile" icon={UserRound} />
            <div className="mt-4 grid gap-4">
              <TextField
                label="Display name"
                helper="Shown to people in your pods."
                value={form.displayName}
                onChange={(displayName) => setForm((current) => ({ ...current, displayName }))}
              />
              <TextField
                label="Phone number"
                helper="Used for account recovery and safety checks. Phone verification coming soon."
                value={form.phone}
                inputMode="tel"
                onChange={(phone) => setForm((current) => ({ ...current, phone }))}
              />
              <SelectField
                label="Gender identity"
                helper="Used only for safety eligibility, such as Women-only pods."
                value={form.genderIdentity}
                onChange={(genderIdentity) => setForm((current) => ({ ...current, genderIdentity }))}
              />
              <TextField
                label="Community"
                helper="Used for community-only pods, such as school, workplace, or apartment groups."
                value={form.communityId}
                onChange={(communityId) => setForm((current) => ({ ...current, communityId }))}
              />
              <TextAreaField
                label="Safety note"
                helper="Optional note for RidePod safety review. Not shown publicly."
                value={form.safetyNote}
                onChange={(safetyNote) => setForm((current) => ({ ...current, safetyNote }))}
              />
            </div>

            <p className="mt-4 rounded-2xl bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              Private details are used for eligibility and safety checks. They are not shown publicly.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSaveProfile}
                disabled={saving || loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save profile"}
              </button>
              {saveMessage ? <p className="text-sm font-black text-[var(--rp-success)]">{saveMessage}</p> : null}
              {saveError ? <p className="text-sm font-black text-[var(--rp-danger)]">{saveError}</p> : null}
            </div>
          </ProfileCard>

          <TrustStatusCard profile={profile} />
        </div>

        <div className="grid gap-4">
          <VerificationCard
            profile={profile}
            hasCommunity={hasCommunity}
            requestingReview={requestingReview}
            onRequestReview={() => setRequestReviewOpen(true)}
          />
          <PublicPreviewCard
            initials={initials}
            displayName={displayName}
            hasCommunity={hasCommunity}
            profile={profile}
          />
          <ProfileCard>
            <SectionTitle title="Account" icon={Mail} />
            <dl className="mt-4 grid gap-3 text-sm">
              <KeyValue label="Email" value={email} />
              <KeyValue label="Profile source" value={fallbackNote ? "Mock/local" : "Supabase"} />
            </dl>
          </ProfileCard>
        </div>
      </div>
      {requestReviewOpen ? (
        <RequestManualReviewModal
          disabled={requestingReview}
          onCancel={() => setRequestReviewOpen(false)}
          onConfirm={onRequestManualReview}
        />
      ) : null}
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">RidePod account</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--rp-text)]">Profile</h1>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        Manage your RidePod identity and trust settings.
      </p>
    </header>
  );
}

function VerificationCard({
  profile,
  hasCommunity,
  requestingReview,
  onRequestReview,
}: {
  profile: RidePodProfileRow | null;
  hasCommunity: boolean;
  requestingReview: boolean;
  onRequestReview: () => void;
}) {
  const emailVerified = Boolean(profile?.email);
  const phoneStatus = profile?.phone ? "Coming soon" : "Not verified";
  const communityStatus = hasCommunity && profile?.community_verified_at ? "Verified" : hasCommunity ? "Not verified" : "Not verified";
  const idVerificationStatus = normalizeIdVerificationStatus(profile?.id_verification_status);
  const canRequestReview = idVerificationStatus === "NOT_REQUESTED" || idVerificationStatus === "REJECTED";

  return (
    <ProfileCard>
      <SectionTitle title="Verification" icon={ShieldCheck} />
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        Verification helps RidePod support safer matching. ID verification is not required for most pods. It may be used later for higher-trust pods.
      </p>
      <div className="mt-4 grid gap-3">
        <StatusRow icon={Mail} label="Email" status={emailVerified ? "Verified" : "Not verified"} tone={emailVerified ? "success" : "muted"} />
        <StatusRow icon={Phone} label="Phone" status={phoneStatus} tone="muted" />
        <StatusRow icon={UsersRound} label="Community" status={communityStatus} tone={communityStatus === "Verified" ? "success" : "muted"} />
        <StatusRow
          icon={IdCard}
          label="ID verification"
          status={idVerificationStatusLabel(profile?.id_verification_status)}
          tone={idVerificationStatus === "VERIFIED" ? "success" : "muted"}
        />
      </div>
      <p className="mt-3 rounded-2xl bg-[var(--rp-card-soft)] px-4 py-3 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
        Verification status may be used for eligibility and trust features. Private review details are not shown publicly.
      </p>
      {canRequestReview ? (
        <button
          type="button"
          onClick={onRequestReview}
          disabled={requestingReview}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {requestingReview ? "Requesting..." : "Request manual review"}
        </button>
      ) : null}
    </ProfileCard>
  );
}

function TrustStatusCard({ profile }: { profile: RidePodProfileRow | null }) {
  const noShows = profile?.no_show_count ?? 0;
  const lateCancels = profile?.late_cancel_count ?? 0;
  const limited = profile?.risk_status === "RESTRICTED" || profile?.risk_status === "SUSPENDED";

  return (
    <ProfileCard>
      <SectionTitle title="Trust status" icon={CheckCircle2} />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <TrustMetric label="Trust level" value={trustLevel(profile)} />
        <TrustMetric label="No-show count" value={String(noShows)} />
        <TrustMetric label="Late cancel count" value={String(lateCancels)} />
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        {limited
          ? "Your account has limited access. Contact support for help."
          : noShows || lateCancels
            ? "Trust history is based on completed RidePod activity."
            : "Trust history will appear after you join rides."}
      </p>
    </ProfileCard>
  );
}

function PublicPreviewCard({
  initials,
  displayName,
  hasCommunity,
  profile,
}: {
  initials: string;
  displayName: string;
  hasCommunity: boolean;
  profile: RidePodProfileRow | null;
}) {
  const showVerifiedBadge =
    normalizeIdVerificationStatus(profile?.id_verification_status) === "VERIFIED" ||
    profile?.verification_status === "ID_VERIFIED";

  return (
    <ProfileCard>
      <SectionTitle title="Public pod preview" icon={UserRound} />
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[var(--rp-card-soft)] p-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--rp-gradient-primary)] text-lg font-black text-[var(--rp-primary-text)]">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-black text-[var(--rp-text)]">{displayName}</span>
          <span className="mt-2 flex flex-wrap gap-2">
            <Badge>Profile</Badge>
            {hasCommunity ? <Badge>Community</Badge> : null}
            {showVerifiedBadge ? <Badge>Verified</Badge> : null}
          </span>
        </span>
      </div>
    </ProfileCard>
  );
}

function RequestManualReviewModal({
  disabled,
  onCancel,
  onConfirm,
}: {
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.62)] px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <h3 className="text-xl font-black text-[var(--rp-text)]">Request ID verification review?</h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          RidePod is not collecting ID documents yet. This request only asks RidePod to review your account for future higher-trust features.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="min-h-12 rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] disabled:opacity-60"
          >
            {disabled ? "Requesting..." : "Request review"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TextField({
  label,
  helper,
  value,
  inputMode,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  inputMode?: "tel";
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold text-[var(--rp-text)] outline-none transition focus:border-[var(--rp-primary)]"
      />
      <span className="text-xs font-semibold leading-5 text-[var(--rp-muted)]">{helper}</span>
    </label>
  );
}

function TextAreaField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="resize-none rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-semibold text-[var(--rp-text)] outline-none transition focus:border-[var(--rp-primary)]"
      />
      <span className="text-xs font-semibold leading-5 text-[var(--rp-muted)]">{helper}</span>
    </label>
  );
}

function SelectField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: RidePodGenderIdentity;
  onChange: (value: RidePodGenderIdentity) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as RidePodGenderIdentity)}
        className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold text-[var(--rp-text)] outline-none transition focus:border-[var(--rp-primary)]"
      >
        {genderOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="text-xs font-semibold leading-5 text-[var(--rp-muted)]">{helper}</span>
    </label>
  );
}

function ProfileCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      {children}
    </section>
  );
}

function SectionTitle({ title, icon: Icon }: { title: string; icon: typeof UserRound }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-black text-[var(--rp-text)]">{title}</h2>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  status,
  tone,
}: {
  icon: typeof Mail;
  label: string;
  status: string;
  tone: "success" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--rp-card-soft)] p-3">
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
        <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
      </span>
      <span
        className={cn(
          "text-sm font-black",
          tone === "success" ? "text-[var(--rp-success)]" : "text-[var(--rp-muted)]",
        )}
      >
        {status}
      </span>
    </div>
  );
}

function TrustMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--rp-card-soft)] p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">{label}</p>
      <p className="mt-2 text-xl font-black text-[var(--rp-text)]">{value}</p>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--rp-card-soft)] px-3 py-2">
      <dt className="font-semibold text-[var(--rp-muted)]">{label}</dt>
      <dd className="truncate text-right font-black text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--rp-badge-success-bg)] px-3 py-1 text-xs font-black text-[var(--rp-badge-success-text)]">
      {children}
    </span>
  );
}
