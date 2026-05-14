import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  History,
  IdCard,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Settings,
  ShieldCheck,
  Star,
  ToggleRight,
  UsersRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui";

const profile = {
  name: "Maya Chen",
  role: "Trusted Host",
  location: "Los Angeles, CA",
  trustScore: "4.9",
  trustMax: "5.0",
  trustLabel: "Excellent",
  completedPods: "32",
  ridersTraveled: "128",
  averageRating: "4.9",
  noShows: "0",
  noShowRate: "0%",
  hostReliability: "97%",
  paymentMethod: "Visa ending 4242",
  paymentExpiry: "Expires 06/27",
};

const verificationItems = [
  { label: "Phone", status: "Verified", icon: Phone },
  { label: "Email", status: "Verified", icon: Mail },
  { label: "Payment", status: "Verified", icon: CreditCard },
  { label: "ID Check", status: "Verified", icon: IdCard },
];

const stats = [
  { value: profile.completedPods, label: "Completed pods", icon: ShieldCheck },
  { value: profile.ridersTraveled, label: "Riders traveled", icon: UsersRound },
  { value: profile.averageRating, label: "Average rating", icon: Star },
  { value: profile.noShows, label: "No-shows", icon: Check },
];

const settingsRows = [
  { label: "Notifications", icon: Bell, meta: undefined },
  { label: "Privacy", icon: LockKeyhole, meta: undefined },
  { label: "Help center", icon: CircleHelp, meta: undefined },
  { label: "About RidePod", icon: Info, meta: undefined },
  { label: "App version", icon: Info, meta: "v1.0.0" },
];

export default function ProfilePage() {
  return <ProfileTrustPage />;
}

function ProfileTrustPage() {
  return (
    <div className="mx-auto grid w-full max-w-[430px] gap-4 pb-3 min-[560px]:max-w-4xl">
      <ProfileTopBar />
      <ProfileHeader />

      <div className="grid gap-4 min-[820px]:grid-cols-[minmax(0,1fr)_340px] min-[820px]:items-start">
        <div className="grid gap-4">
          <VerificationCard />
          <TrustScoreCard />
          <StatsCard />
        </div>
        <div className="grid gap-4">
          <PaymentMethodCard />
          <SafetyPreferencesCard />
          <AppearanceCard />
          <SettingsList />
        </div>
      </div>
    </div>
  );
}

function ProfileTopBar() {
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center pt-1">
      <div />
      <h1 className="text-center text-xl font-black tracking-tight text-[var(--rp-text)]">
        Profile
      </h1>
      <button
        type="button"
        aria-label="Open profile settings"
        className="grid h-11 w-11 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
}

function ProfileHeader() {
  return (
    <button
      type="button"
      className="grid w-full grid-cols-[72px_1fr_24px] items-center gap-4 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 text-left shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-elevated)]"
    >
      <div className="relative grid h-[72px] w-[72px] place-items-center rounded-full bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_28%,transparent)]">
        <span className="text-xl font-black">MC</span>
        <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--rp-card)] bg-[var(--rp-success)] text-[var(--rp-primary-text)]">
          <Check className="h-4 w-4" />
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-black tracking-tight text-[var(--rp-text)]">
            {profile.name}
          </h2>
          <StatusBadge label={profile.role} />
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--rp-muted)]">
          <MapPin className="h-4 w-4 text-[var(--rp-primary)]" />
          {profile.location}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-[var(--rp-primary)]" />
    </button>
  );
}

function VerificationCard() {
  return (
    <ProfileCard>
      <CardTitle title="Verification" badge="All verified" />
      <div className="mt-4 grid gap-3">
        {verificationItems.map(({ label, status, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--rp-card-soft)] p-3"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-sm font-black text-[var(--rp-text)]">{label}</p>
            </div>
            <p className="flex items-center gap-1 text-sm font-black text-[var(--rp-success)]">
              <Check className="h-4 w-4" />
              {status}
            </p>
          </div>
        ))}
      </div>
    </ProfileCard>
  );
}

function TrustScoreCard() {
  return (
    <ProfileCard className="overflow-hidden">
      <CardTitle title="Trust score" />
      <div className="mt-5 grid gap-5 min-[390px]:grid-cols-[136px_1fr] min-[390px]:items-center">
        <TrustScoreRing score={98}>
          <span className="text-3xl font-black text-[var(--rp-text)]">{profile.trustScore}</span>
          <span className="text-xs font-black text-[var(--rp-muted)]">/ {profile.trustMax}</span>
        </TrustScoreRing>
        <div>
          <p className="text-2xl font-black text-[var(--rp-text)]">{profile.trustLabel}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            Verified, reliable, and great to ride with.
          </p>
          <dl className="mt-4 grid gap-2 text-sm">
            <MetricRow label="Reliable host" value={profile.averageRating} />
            <MetricRow label="Completed pods" value={profile.completedPods} />
            <MetricRow label="No-show rate" value={profile.noShowRate} />
          </dl>
        </div>
      </div>
    </ProfileCard>
  );
}

function StatsCard() {
  return (
    <ProfileCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[var(--rp-text)]">My stats</h2>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--rp-border-strong)] px-3 text-xs font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
        >
          <History className="h-4 w-4" />
          View history
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map(({ value, label, icon: Icon }) => (
          <div key={label} className="rounded-2xl bg-[var(--rp-card-soft)] p-4">
            <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-3 text-2xl font-black text-[var(--rp-text)]">{value}</p>
            <p className="mt-1 text-xs font-bold leading-4 text-[var(--rp-muted)]">{label}</p>
          </div>
        ))}
      </div>
    </ProfileCard>
  );
}

function PaymentMethodCard() {
  return (
    <ActionCard icon={CreditCard} title={profile.paymentMethod} subtitle={profile.paymentExpiry} />
  );
}

function SafetyPreferencesCard() {
  return (
    <ProfileCard>
      <CardTitle title="Safety preferences" />
      <button
        type="button"
        className="mt-4 grid w-full grid-cols-[44px_1fr_auto_20px] items-center gap-3 rounded-2xl bg-[var(--rp-card-soft)] p-3 text-left transition hover:bg-[var(--rp-card-muted)]"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
          <ToggleRight className="h-6 w-6" />
        </span>
        <span>
          <span className="block text-sm font-black text-[var(--rp-text)]">Share trip status</span>
          <span className="mt-1 block text-xs font-semibold text-[var(--rp-muted)]">
            Share with contacts
          </span>
        </span>
        <span className="rounded-full bg-[var(--rp-badge-success-bg)] px-3 py-1 text-xs font-black text-[var(--rp-badge-success-text)]">
          On
        </span>
        <ChevronRight className="h-5 w-5 text-[var(--rp-primary)]" />
      </button>
    </ProfileCard>
  );
}

function AppearanceCard() {
  return (
    <ProfileCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">Theme</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">
            Premium dark or travel light.
          </p>
        </div>
        <ThemeToggle />
      </div>
    </ProfileCard>
  );
}

function SettingsList() {
  return (
    <ProfileCard>
      <h2 className="text-lg font-black text-[var(--rp-text)]">Settings</h2>
      <div className="mt-3 divide-y divide-[var(--rp-border)]">
        {settingsRows.map(({ label, icon: Icon, meta }) => (
          <button
            key={label}
            type="button"
            className="grid w-full grid-cols-[34px_1fr_auto] items-center gap-3 py-3 text-left"
          >
            <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
            <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--rp-muted)]">
              {meta}
              {meta ? null : <ChevronRight className="h-5 w-5 text-[var(--rp-primary)]" />}
            </span>
          </button>
        ))}
      </div>
    </ProfileCard>
  );
}

function ActionCard({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof CreditCard;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      className="grid w-full grid-cols-[48px_1fr_20px] items-center gap-3 rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 text-left shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-elevated)]"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
        <Icon className="h-6 w-6" />
      </span>
      <span>
        <span className="block text-base font-black text-[var(--rp-text)]">{title}</span>
        <span className="mt-1 block text-sm font-semibold text-[var(--rp-muted)]">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-[var(--rp-primary)]" />
    </button>
  );
}

function ProfileCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function CardTitle({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-black text-[var(--rp-text)]">{title}</h2>
      {badge ? <StatusBadge label={badge} tone="success" /> : null}
    </div>
  );
}

function StatusBadge({
  label,
  tone = "primary",
}: {
  label: string;
  tone?: "primary" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset",
        tone === "success"
          ? "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]"
          : "bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border-strong)]",
      )}
    >
      {label}
    </span>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--rp-card-soft)] px-3 py-2">
      <dt className="font-semibold text-[var(--rp-muted)]">{label}</dt>
      <dd className="font-black text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

function TrustScoreRing({
  score,
  children,
}: {
  score: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mx-auto grid h-[136px] w-[136px] place-items-center rounded-full shadow-[0_16px_34px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)]"
      style={{
        background: `conic-gradient(var(--rp-success) 0% ${score}%, var(--rp-card-muted) ${score}% 100%)`,
      }}
      aria-label={`${profile.trustScore} out of ${profile.trustMax} trust score`}
    >
      <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-[var(--rp-card)] text-center shadow-[inset_0_0_0_1px_var(--rp-border)]">
        <div className="grid gap-0">{children}</div>
      </div>
    </div>
  );
}
