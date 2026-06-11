"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Camera,
  CheckCircle2,
  IdCard,
  LockKeyhole,
  Mail,
  Phone,
  Pencil,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  AnimalAvatarPicker,
  RidePodAvatar,
  useRidePodAvatarPreference,
  type AnimalAvatarId,
  type RidePodAvatarPreference,
} from "@/components/animal-avatar";
import {
  getCurrentProfile,
  idVerificationStatusLabel,
  mockRidePodProfile,
  normalizeIdVerificationStatus,
  requestManualIdVerificationReview,
  updateCurrentProfile,
  updateCurrentProfilePhoto,
  type RidePodGenderIdentity,
} from "@/lib/supabase/auth";
import type { RidePodProfileRow } from "@/lib/supabase/types";
import { cn } from "@/components/ui";
import {
  formatRideAppRating,
  formatRideAppTrustMetric,
  getRideAppTrustSummary,
  type RideAppTrustSummary,
} from "@/lib/ride-app-trust";

const genderOptions: Array<{ value: RidePodGenderIdentity; label: string }> = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "UNKNOWN", label: "Unknown" },
];

type ProfileFormState = {
  displayName: string;
  phone: string;
  genderIdentity: RidePodGenderIdentity;
  communityId: string;
};

type ProfileTab = "profile" | "trust";
type EditableProfileField = "displayName" | "phone" | "communityId";

const profileTabs: Array<{
  id: ProfileTab;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "trust", label: "Trust", icon: ShieldCheck },
];

function formStateFromProfile(profile: RidePodProfileRow): ProfileFormState {
  return {
    displayName: profile.display_name ?? "",
    phone: profile.phone ?? "",
    genderIdentity: normalizeGenderIdentity(profile.gender_identity),
    communityId: profile.community_id ?? "",
  };
}

function normalizeGenderIdentity(value: RidePodProfileRow["gender_identity"]): RidePodGenderIdentity {
  if (value === "FEMALE" || value === "MALE") {
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editingProfileField, setEditingProfileField] = useState<EditableProfileField | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [requestReviewOpen, setRequestReviewOpen] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

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
  const [avatarPreference, setAvatarPreference] = useRidePodAvatarPreference(profile?.id);
  const rideAppTrustSummary = useMemo(
    () => getRideAppTrustSummary(profile?.id ?? "mock-profile-user", profile),
    [profile],
  );

  async function onSaveProfile() {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    const result = await updateCurrentProfile({
      displayName: form.displayName,
      phone: form.phone,
      communityId: form.communityId,
      avatarUrl: profile?.avatar_url ?? null,
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

    void result.userFacingMessage;
    setEditingProfileField(null);
    setSaveMessage("Confirmed");
  }

  function onCancelProfileEdit() {
    if (profile) {
      setForm(formStateFromProfile(profile));
    }
    setEditingProfileField(null);
    setSaveError(null);
    setSaveMessage("Canceled");
  }

  function renderProfileFieldActions(field: EditableProfileField) {
    const isEditing = editingProfileField === field;

    if (!isEditing) {
      return (
        <button
          type="button"
          onClick={() => {
            setSaveMessage(null);
            setSaveError(null);
            setEditingProfileField(field);
          }}
          disabled={loading || saving || Boolean(editingProfileField)}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-primary)] transition hover:border-[var(--rp-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      );
    }

    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveProfile}
          disabled={saving || loading}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-[var(--rp-primary)] px-3 text-xs font-black text-[var(--rp-primary-text)] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancelProfileEdit}
          disabled={saving}
          className="grid min-h-9 min-w-9 place-items-center rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Cancel edit"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  async function onProfilePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setPhotoUploading(true);
    setSaveMessage(null);
    setSaveError(null);

    const result = await updateCurrentProfilePhoto(file);

    setPhotoUploading(false);
    setFallbackNote(result.fallbackNote);

    if (!result.ok) {
      setSaveError(result.userFacingMessage);
      return;
    }

    if (result.profile) {
      setProfile(result.profile);
      setForm(formStateFromProfile(result.profile));
    }

    if (profile?.id) {
      setAvatarPreference({ avatarType: "uploaded", animalAvatarId: null });
    }
    setSaveMessage("Confirmed");
  }

  function onSaveAnimalAvatar(id: AnimalAvatarId) {
    if (!profile?.id) return;

    setAvatarPreference({ avatarType: "animal", animalAvatarId: id });
    setAvatarPickerOpen(false);
    setSaveError(null);
    setSaveMessage("Confirmed");
  }

  function onUseInitialsAvatar() {
    if (!profile?.id) return;

    setAvatarPreference({ avatarType: "initials", animalAvatarId: null });
    setAvatarPickerOpen(false);
    setSaveError(null);
    setSaveMessage("Confirmed");
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

      {saveMessage ? (
        <ProfileToast message={saveMessage} onDismiss={() => setSaveMessage(null)} />
      ) : null}

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

      <ProfileTabNav activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "profile" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <ProfileCard>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle title="Basic profile" icon={UserRound} />
            </div>
            <div className="mt-4 grid gap-4">
              <ProfileAvatarField
                avatarUrl={profile?.avatar_url ?? null}
                avatarPreference={avatarPreference}
                initials={initials}
                displayName={displayName}
                uploading={photoUploading}
                onChooseSticker={() => setAvatarPickerOpen(true)}
                onChoosePhoto={() => profilePhotoInputRef.current?.click()}
                onUseInitials={onUseInitialsAvatar}
              />
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                className="sr-only"
                onChange={onProfilePhotoSelected}
              />
              <TextField
                label="Display name"
                helper="Shown to people in your pods."
                value={form.displayName}
                onChange={(displayName) => setForm((current) => ({ ...current, displayName }))}
                disabled={editingProfileField !== "displayName"}
                action={renderProfileFieldActions("displayName")}
              />
              <TextField
                label="Phone number"
                helper="Used for account recovery and safety checks. Phone verification coming soon."
                value={form.phone}
                inputMode="tel"
                onChange={(phone) => setForm((current) => ({ ...current, phone }))}
                disabled={editingProfileField !== "phone"}
                action={renderProfileFieldActions("phone")}
              />
              <SelectField
                label="Gender identity"
                helper="Set during account creation and cannot be changed here."
                value={form.genderIdentity}
                disabled
              />
              <TextField
                label="Community"
                helper="Used for community-only pods, such as school, workplace, or apartment groups."
                value={form.communityId}
                onChange={(communityId) => setForm((current) => ({ ...current, communityId }))}
                disabled={editingProfileField !== "communityId"}
                action={renderProfileFieldActions("communityId")}
              />
            </div>

            <div className="mt-4">
              {saveError ? <p className="text-sm font-black text-[var(--rp-danger)]">{saveError}</p> : null}
            </div>
          </ProfileCard>

          <div className="grid gap-4">
            <ProfileCard>
              <SectionTitle title="Account" icon={Mail} />
              <dl className="mt-4 grid gap-3 text-sm">
                <KeyValue label="Email" value={email} />
              </dl>
            </ProfileCard>
            <VerificationCard
              profile={profile}
              hasCommunity={hasCommunity}
              requestingReview={requestingReview}
              onRequestReview={() => setRequestReviewOpen(true)}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "trust" ? (
        <div className="grid gap-4">
          <TrustStatusCard profile={profile} />
          <RideAppTrustStatusCard summary={rideAppTrustSummary} />
        </div>
      ) : null}

      {requestReviewOpen ? (
        <RequestManualReviewModal
          disabled={requestingReview}
          onCancel={() => setRequestReviewOpen(false)}
          onConfirm={onRequestManualReview}
        />
      ) : null}

      {avatarPickerOpen ? (
        <AvatarPickerModal
          avatarPreference={avatarPreference}
          onCancel={() => setAvatarPickerOpen(false)}
          onSave={onSaveAnimalAvatar}
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

function ProfileToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const isConfirmed = message === "Confirmed";

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-[420px] items-center justify-between gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card)] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full",
            isConfirmed
              ? "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)]"
              : "bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
          )}
        >
          {isConfirmed ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </span>
        <span className="text-sm font-black text-[var(--rp-text)]">{message}</span>
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="grid h-9 w-9 place-items-center rounded-full text-[var(--rp-muted)] transition hover:bg-[var(--rp-card-soft)] hover:text-[var(--rp-text)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProfileTabNav({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  return (
    <nav
      aria-label="Profile sections"
      className="grid grid-cols-2 gap-2 rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-2 shadow-[var(--rp-shadow-soft)]"
    >
      {profileTabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "grid min-h-14 place-items-center gap-1 rounded-2xl border px-2 text-xs font-black transition sm:flex sm:justify-center sm:gap-2 sm:text-sm",
              active
                ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)] shadow-[0_12px_28px_rgba(250,198,75,0.2)]"
                : "border-transparent bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
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
  const status = trustLevel(profile);
  const issueCount = noShows + lateCancels;

  return (
    <ProfileCard>
      <SectionTitle title="Trust status" icon={CheckCircle2} />
      <div className="mt-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-muted)]">Account trust</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <span className="text-3xl font-black leading-none text-[var(--rp-text)]">{status}</span>
          <TrustPill tone={limited ? "danger" : issueCount ? "watch" : "good"}>
            {limited ? "Limited access" : issueCount ? "Needs attention" : "Clear history"}
          </TrustPill>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          {limited
            ? "Your account has limited access. Contact support for help."
            : issueCount
              ? "These counts come from completed RidePod activity."
              : "No no-shows or late cancellations recorded yet."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniTrustMetric label="No-shows" value={String(noShows)} />
          <MiniTrustMetric label="Late cancels" value={String(lateCancels)} />
        </div>
      </div>
    </ProfileCard>
  );
}

function RideAppTrustStatusCard({ summary }: { summary: RideAppTrustSummary }) {
  const limited = summary.trustLevel === "Limited access";
  const recentIssues = summary.trustLevel === "Recent issues";
  const hostIssueCount = summary.hostStats.hostLateCancelCount + summary.hostStats.hostConfirmedReportsCount;
  const riderIssueCount =
    summary.riderStats.riderNoShowCount + summary.riderStats.riderLateLeaveCount + summary.riderStats.riderConfirmedReportsCount;
  const hostHasHistory = summary.hostStats.hostedRideAppPodsCount > 0 || summary.hostStats.hostRatingCount > 0 || hostIssueCount > 0;
  const riderHasHistory = summary.riderStats.joinedRideAppPodsCount > 0 || summary.riderStats.riderRatingCount > 0 || riderIssueCount > 0;

  return (
    <ProfileCard>
      <SectionTitle title="Ride app trust" icon={ShieldCheck} />
      <div className="mt-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span>
            <span className="block text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-muted)]">Self-settle status</span>
            <span className="mt-2 block text-3xl font-black leading-none text-[var(--rp-text)]">{summary.trustLevel}</span>
          </span>
          <span className="grid justify-items-end gap-2">
            <TrustPill tone={limited ? "danger" : recentIssues ? "watch" : "good"}>
              {limited ? "Restricted" : recentIssues ? "Warnings" : "Good standing"}
            </TrustPill>
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">Score {summary.rideAppTrustScore}</span>
          </span>
        </div>
      </div>

      <TrustRoleSection
        title="Host trust"
        helper={hostHasHistory ? "Shown when you organize ride app pods." : "Host history starts after your first completed hosted ride app pod."}
        rows={[
          ["Hosted rides", String(summary.hostStats.hostedRideAppPodsCount)],
          ["Rating", compactRating(summary.hostStats.hostRatingAverage, summary.hostStats.hostRatingCount)],
          ["Reliability", compactPair(formatRideAppTrustMetric(summary.hostStats.hostCompletionRate), formatRideAppTrustMetric(summary.hostStats.hostShowUpRate))],
          ["Issues", `${hostIssueCount} total`],
        ]}
      />

      <TrustRoleSection
        title="Rider trust"
        helper={riderHasHistory ? "Shown when you join ride app pods." : "Rider history starts after your first completed joined ride app pod."}
        rows={[
          ["Joined rides", String(summary.riderStats.joinedRideAppPodsCount)],
          ["Rating", compactRating(summary.riderStats.riderRatingAverage, summary.riderStats.riderRatingCount)],
          ["Show-up", formatRideAppTrustMetric(summary.riderStats.riderShowUpRate)],
          ["Issues", `${riderIssueCount} total`],
        ]}
      />
    </ProfileCard>
  );
}

function ProfileAvatarField({
  avatarUrl,
  avatarPreference,
  initials,
  displayName,
  uploading,
  onChooseSticker,
  onChoosePhoto,
  onUseInitials,
}: {
  avatarUrl: string | null;
  avatarPreference: RidePodAvatarPreference;
  initials: string;
  displayName: string;
  uploading: boolean;
  onChooseSticker: () => void;
  onChoosePhoto: () => void;
  onUseInitials: () => void;
}) {
  const cleanAvatarUrl = avatarUrl?.trim();
  const activeLabel =
    avatarPreference.avatarType === "animal"
      ? "Sticker avatar selected"
      : avatarPreference.avatarType === "uploaded" && cleanAvatarUrl
        ? "Uploaded photo selected"
        : "Initials selected";

  return (
    <div className="grid gap-2">
      <span className="flex min-h-9 items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-black text-[var(--rp-text)]">Profile avatar</span>
          <span className="mt-1 block text-xs font-bold text-[var(--rp-muted)]">{activeLabel}</span>
        </span>
        <span className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onChooseSticker}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-primary)] transition hover:border-[var(--rp-border-strong)]"
          >
            Choose sticker avatar
          </button>
          <button
            type="button"
            onClick={onChoosePhoto}
            disabled={uploading}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-primary)] transition hover:border-[var(--rp-border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera className="h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload photo"}
          </button>
        </span>
      </span>
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
        <RidePodAvatar
          avatarUrl={avatarUrl}
          avatarPreference={avatarPreference}
          initials={initials}
          displayName={displayName}
          className="h-16 w-16 shrink-0 rounded-2xl text-xl"
        />
        <span className="min-w-0 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Pick a simple sticker avatar for your RidePod profile, upload a photo, or keep initials.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUseInitials}
          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]"
        >
          Use initials
        </button>
        <span className="text-xs font-semibold leading-5 text-[var(--rp-muted)]">
          Upload supports PNG, JPG, WebP, or GIF. Max 3 MB.
        </span>
      </div>
    </div>
  );
}

function AvatarPickerModal({
  avatarPreference,
  onCancel,
  onSave,
}: {
  avatarPreference: RidePodAvatarPreference;
  onCancel: () => void;
  onSave: (id: AnimalAvatarId) => void;
}) {
  const [selectedId, setSelectedId] = useState<AnimalAvatarId | null>(avatarPreference.animalAvatarId ?? "frog");

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm">
      <section className="max-h-[calc(100dvh-48px)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-[var(--rp-text)]">Choose your avatar</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              Pick a simple sticker avatar for your RidePod profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel avatar selection"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          <AnimalAvatarPicker selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] transition hover:border-[var(--rp-border-strong)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selectedId && onSave(selectedId)}
            disabled={!selectedId}
            className="min-h-12 rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save avatar
          </button>
        </div>
      </section>
    </div>
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
  disabled,
  action,
}: {
  label: string;
  helper: string;
  value: string;
  inputMode?: "tel";
  onChange: (value: string) => void;
  disabled?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex min-h-9 items-center justify-between gap-3">
        <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
        {action}
      </span>
      <input
        value={value}
        inputMode={inputMode}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold text-[var(--rp-text)] outline-none transition focus:border-[var(--rp-primary)] disabled:cursor-not-allowed disabled:opacity-75"
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
  disabled,
}: {
  label: string;
  helper: string;
  value: RidePodGenderIdentity;
  onChange?: (value: RidePodGenderIdentity) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value as RidePodGenderIdentity)}
        className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold text-[var(--rp-text)] outline-none transition focus:border-[var(--rp-primary)] disabled:cursor-not-allowed disabled:opacity-75"
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

function compactRating(value: number | null, count: number) {
  if (value === null || count === 0) return "No ratings yet";
  return formatRideAppRating(value, count);
}

function compactPair(first: string, second: string) {
  if (first === "Not enough rides yet" && second === "Not enough rides yet") return "Not enough history";
  if (first === "Not enough rides yet") return `${second} show-up`;
  if (second === "Not enough rides yet") return `${first} complete`;
  return `${first} complete · ${second} show-up`;
}

function TrustPill({ children, tone }: { children: React.ReactNode; tone: "good" | "watch" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-black",
        tone === "good"
          ? "border-emerald-300/25 bg-emerald-300/12 text-emerald-100"
          : tone === "watch"
            ? "border-amber-300/30 bg-amber-300/14 text-amber-100"
            : "border-rose-300/30 bg-rose-400/12 text-rose-100",
      )}
    >
      {children}
    </span>
  );
}

function MiniTrustMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[color-mix(in_srgb,var(--rp-shell)_46%,transparent)] px-3 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black leading-none text-[var(--rp-text)]">{value}</p>
    </div>
  );
}

function TrustRoleSection({ title, helper, rows }: { title: string; helper: string; rows: Array<[string, string]> }) {
  return (
    <section className="mt-5">
      <div className="flex items-start justify-between gap-3">
        <span>
          <h3 className="text-base font-black text-[var(--rp-text)]">{title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted)]">{helper}</p>
        </span>
      </div>
      <dl className="mt-3 overflow-hidden rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-[var(--rp-border)] px-4 py-3 last:border-b-0">
            <dt className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">{label}</dt>
            <dd className="min-w-0 max-w-[62%] text-right text-sm font-black leading-5 text-[var(--rp-text)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
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
