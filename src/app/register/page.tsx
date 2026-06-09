"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CarFront, CheckCircle2, ClipboardCheck, UserRound } from "lucide-react";
import {
  ANIMAL_AVATARS,
  AnimalAvatarPicker,
  RidePodAvatar,
  type AnimalAvatarId,
  type RidePodAvatarPreference,
} from "@/components/animal-avatar";
import { AuthPageShell } from "@/components/auth-page-shell";
import { cn } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

type AccountType = "rider" | "taxi_partner";
type RegistrationStep = "account_type" | "form";

const accountTypeCards: Array<{
  id: AccountType;
  title: string;
  description: string;
  helper: string;
  icon: typeof UserRound;
}> = [
  {
    id: "rider",
    title: "Rider",
    description: "Create or join shared taxi pods.",
    helper: "Best for people sharing rides with others.",
    icon: UserRound,
  },
  {
    id: "taxi_partner",
    title: "Taxi Partner",
    description: "Quote and manage shared taxi pod requests.",
    helper: "For licensed taxi drivers, fleets, or operators.",
    icon: CarFront,
  },
];

const genderEligibilityOptions = [
  "Woman",
  "Man",
];

const districtOptions = [
  "Hong Kong Island",
  "Kowloon",
  "New Territories",
  "HK Airport / Tung Chung",
  "Other / not sure",
];

const ageRangeOptions = ["18-24", "25-34", "35-44", "45-54", "55+"];

const accessibilityOptions = [
  "No special access need",
  "Step-free support preferred",
  "Wheelchair-accessible taxi, if supported",
  "Extra space preferred",
];

const partnerTypeOptions = [
  "Individual licensed taxi driver",
  "Taxi fleet / operator",
  "Dispatcher / coordinator",
];

const individualTaxiTypeOptions = [
  "Standard 4-seat",
  "Compact 4-seat",
  "Large-luggage 4-seat",
  "6-seat taxi",
  "Other / not sure",
];

const serviceAreaOptions = [
  "Hong Kong Island",
  "Kowloon",
  "New Territories",
  "Airport / Tung Chung",
  "Cross-district",
];

const taxiCapabilityOptions = [
  "Standard 4-seat",
  "Compact 4-seat",
  "Large-luggage 4-seat",
  "6-seat taxi",
  "Airport / luggage-friendly",
  "Accessibility support, if available",
];

const availabilityOptions = ["Weekdays", "Weekends", "Morning", "Afternoon", "Evening", "Late night"];

const futureVerificationItems = [
  "Taxi driving licence",
  "Taxi Driver Identity Plate",
  "Vehicle / taxi details",
  "Insurance / operator documents, if applicable",
];

type PartnerApplicationSummary = {
  partnerType: string;
  serviceAreas: string[];
  taxiCapabilities: string[];
  verificationStatus: "Manual review pending";
};

const standardTaxiImageSrc = "/images/ridepod/taxis/standard-4-seat.png";
const passwordHelperText = "At least 6 characters, with a letter and a number.";

function normalizeAccountName(accountName: string) {
  return accountName.trim().toLowerCase();
}

function getAccountNameValidationError(accountName: string) {
  const normalized = normalizeAccountName(accountName);
  if (normalized.length < 3) return "Account name must be at least 3 characters.";
  if (normalized.length > 24) return "Account name must be 24 characters or less.";
  if (!/^[a-z0-9._]+$/.test(normalized)) {
    return "Account name can only use letters, numbers, dot, or underscore.";
  }
  return null;
}

function normalizeHongKongPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function formatHongKongPhone(phone: string) {
  return `+852${normalizeHongKongPhone(phone)}`;
}

function getPhoneValidationError(phone: string) {
  const digits = normalizeHongKongPhone(phone);
  if (!digits) return "Phone number is required.";
  if (digits.length !== 8) return "Enter an 8-digit Hong Kong phone number.";
  return null;
}

function getPasswordValidationError(password: string) {
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
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

function FieldLabel({ label, helper }: { label: string; helper?: string }) {
  return (
    <span className="grid gap-1">
      <span className="text-sm font-black text-[var(--rp-text)]">{label}</span>
      {helper ? <span className="text-xs font-bold leading-5 text-[var(--rp-muted)]">{helper}</span> : null}
    </span>
  );
}

function TaxiPartnerRegisterHero() {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--rp-primary)_58%,var(--rp-border))] bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(2,6,23,0.66))] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div className="relative min-h-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_72%,rgba(250,204,21,0.22),transparent_58%)]" />
        <Image
          src={standardTaxiImageSrc}
          alt="Standard 4-seat taxi"
          width={720}
          height={380}
          sizes="(max-width: 768px) 92vw, 640px"
          unoptimized
          className="relative h-40 w-full object-contain px-5 pt-3"
        />
      </div>
      <div className="border-t border-[color-mix(in_srgb,var(--rp-primary)_30%,var(--rp-border))] p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
          Taxi partner setup
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
          Standard 4-seat taxi support
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Manual review", "Shared taxi quotes", "No document upload"].map((item) => (
            <span
              key={item}
              className="rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-1 text-xs font-black text-[var(--rp-muted-strong)]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function TextField({
  label,
  helper,
  value,
  onChange,
  type = "text",
  required,
  inputMode,
  min,
  minLength,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  minLength?: number;
}) {
  return (
    <label className="grid gap-2">
      <FieldLabel label={label} helper={helper} />
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        inputMode={inputMode}
        min={min}
        minLength={minLength}
        className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold outline-none transition focus:border-[var(--rp-primary)]"
      />
    </label>
  );
}

function SelectField({
  label,
  helper,
  value,
  options,
  onChange,
}: {
  label: string;
  helper?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <FieldLabel label={label} helper={helper} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold outline-none transition focus:border-[var(--rp-primary)]"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[var(--rp-shell)] text-[var(--rp-text)]">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PhoneField({
  label,
  helper,
  value,
  onChange,
  required,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <FieldLabel label={label} helper={helper} />
      <span className="grid min-h-12 grid-cols-[auto_1fr] overflow-hidden rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] transition focus-within:border-[var(--rp-primary)]">
        <span className="grid place-items-center border-r border-[var(--rp-border)] px-4 text-sm font-black text-[var(--rp-primary)]">
          +852
        </span>
        <input
          type="tel"
          value={value}
          onChange={(event) => onChange(normalizeHongKongPhone(event.target.value).slice(0, 8))}
          required={required}
          inputMode="numeric"
          minLength={8}
          maxLength={8}
          placeholder="12345678"
          className="min-h-12 bg-transparent px-4 text-sm font-semibold outline-none"
        />
      </span>
    </label>
  );
}

function CheckboxGrid({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);
  }

  return (
    <div className="grid gap-2">
      <FieldLabel label={label} />
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = values.includes(option);
          return (
            <label
              key={option}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-bold transition",
                checked
                  ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-text)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
                className="h-4 w-4 accent-[var(--rp-primary)]"
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function RegisterAvatarField({
  avatarPreference,
  displayName,
  onChooseSticker,
  onUseInitials,
}: {
  avatarPreference: RidePodAvatarPreference;
  displayName: string;
  onChooseSticker: () => void;
  onUseInitials: () => void;
}) {
  const initials = initialsFor(displayName);
  const selectedLabel = avatarPreference.avatarType === "animal" ? "Sticker avatar selected" : "Initials selected";

  return (
    <div className="grid gap-2">
      <FieldLabel
        label="Choose your profile avatar"
        helper="Pick a sticker avatar for your RidePod profile. You can change it later. A real profile photo is not required."
      />
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
        <RidePodAvatar
          avatarPreference={avatarPreference}
          initials={initials}
          displayName={displayName}
          className="h-16 w-16 shrink-0 rounded-2xl text-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
            Profile preview
          </span>
          <span className="mt-1 block text-sm font-black text-[var(--rp-text)]">{selectedLabel}</span>
          <span className="mt-1 block text-xs font-bold leading-5 text-[var(--rp-muted)]">
            {displayName}
          </span>
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onChooseSticker}
          className="min-h-11 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-primary)] transition hover:border-[var(--rp-border-strong)]"
        >
          Animal avatar
        </button>
        <button
          type="button"
          onClick={onUseInitials}
          className="min-h-11 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]"
        >
          Use initials
        </button>
      </div>
    </div>
  );
}

function RegisterAvatarPickerModal({
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
        <h3 className="text-2xl font-black text-[var(--rp-text)]">Choose your avatar</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Pick a simple sticker avatar for your RidePod profile.
        </p>
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

export default function RegisterPage() {
  const router = useRouter();
  const { register, recordTaxiPartnerInterest, fallbackNote } = useAuth();
  const [step, setStep] = useState<RegistrationStep>("account_type");
  const [accountType, setAccountType] = useState<AccountType>("rider");
  const [accountName, setAccountName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarPreference, setAvatarPreference] = useState<RidePodAvatarPreference>({
    avatarType: "animal",
    animalAvatarId: ANIMAL_AVATARS[0]?.id ?? null,
  });
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [homeDistrict, setHomeDistrict] = useState(districtOptions[0]);
  const [genderEligibility, setGenderEligibility] = useState(genderEligibilityOptions[0]);
  const [ageRange, setAgeRange] = useState(ageRangeOptions[0]);
  const [accessibilityPreference, setAccessibilityPreference] = useState(accessibilityOptions[0]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [partnerContactName, setPartnerContactName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerType, setPartnerType] = useState(partnerTypeOptions[0]);
  const [legalLicenceName, setLegalLicenceName] = useState("");
  const [taxiDriverIdentityPlateNumber, setTaxiDriverIdentityPlateNumber] = useState("");
  const [taxiVehicleRegistrationMark, setTaxiVehicleRegistrationMark] = useState("");
  const [companyFleetName, setCompanyFleetName] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [sampleRegistrationMarks, setSampleRegistrationMarks] = useState("");
  const [individualTaxiType, setIndividualTaxiType] = useState(individualTaxiTypeOptions[0]);
  const [manualReviewAgreement, setManualReviewAgreement] = useState(false);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [taxiCapabilities, setTaxiCapabilities] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [partnerApplicationSummary, setPartnerApplicationSummary] = useState<PartnerApplicationSummary | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isIndividualDriver = partnerType === "Individual licensed taxi driver";
  const isFleetOrOperator = partnerType === "Taxi fleet / operator" || partnerType === "Dispatcher / coordinator";

  async function onSubmitRider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    const accountNameError = getAccountNameValidationError(accountName);
    if (accountNameError) {
      setSubmitting(false);
      setError(accountNameError);
      return;
    }

    const phoneError = getPhoneValidationError(phone);
    if (phoneError) {
      setSubmitting(false);
      setError(phoneError);
      return;
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setSubmitting(false);
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setSubmitting(false);
      setError("Passwords do not match.");
      return;
    }

    const result = await register({
      accountName,
      email,
      password,
      displayName: displayName.trim() || accountName,
      phone: formatHongKongPhone(phone),
      homeDistrict,
      accountType: "rider",
      avatarPreference,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Couldn't create account. Try again later.");
      return;
    }

    if (result.requiresEmailConfirmation) {
      setStatus("Account created. Check your email to confirm, then log in with your account name and password.");
      return;
    }

    void genderEligibility;
    void ageRange;
    void accessibilityPreference;
    setStatus("Account created.");
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && next.startsWith("/") ? next : "/home");
  }

  async function onSubmitTaxiPartner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    if (!partnerContactName.trim() || !partnerPhone.trim() || !partnerEmail.trim() || !partnerType || !legalLicenceName.trim()) {
      setError("Fill in all required fields.");
      return;
    }

    if (isIndividualDriver && !taxiDriverIdentityPlateNumber.trim()) {
      setError("Add your Taxi Driver Identity Plate number.");
      return;
    }

    if (isIndividualDriver && !taxiVehicleRegistrationMark.trim()) {
      setError("Add your taxi vehicle registration mark.");
      return;
    }

    if (isFleetOrOperator && !companyFleetName.trim()) {
      setError("Add your company / fleet name.");
      return;
    }

    if (isFleetOrOperator && (!fleetSize.trim() || Number(fleetSize) < 1)) {
      setError("Add number of taxis.");
      return;
    }

    if (!manualReviewAgreement) {
      setError("Confirm manual review before submitting.");
      return;
    }

    void taxiDriverIdentityPlateNumber;
    void taxiVehicleRegistrationMark;
    void companyFleetName;
    void fleetSize;
    void sampleRegistrationMarks;
    void individualTaxiType;
    void availability;
    const result = await recordTaxiPartnerInterest({
      contactName: partnerContactName,
      email: partnerEmail,
      phone: partnerPhone,
      legalLicenceName,
      partnerType,
      serviceAreas,
      taxiCapabilities,
    });

    if (!result.ok) {
      setError(result.error ?? "Couldn't submit partner interest. Try again later.");
      return;
    }

    setPartnerApplicationSummary({
      partnerType,
      serviceAreas,
      taxiCapabilities,
      verificationStatus: "Manual review pending",
    });
    setStatus("Partner interest submitted for manual review.");
  }

  return (
    <AuthPageShell>
      <section className="mx-auto grid w-full max-w-2xl gap-4 rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        {step === "form" ? (
          <button
            type="button"
            onClick={() => setStep("account_type")}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[var(--rp-border-strong)] hover:bg-[var(--rp-card-muted)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : null}

        <div className="grid gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            {accountType === "taxi_partner" ? <CarFront className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
          </span>
          <h1 className="text-3xl font-black text-[var(--rp-text)]">
            {step === "account_type"
              ? "Create your RidePod account"
              : accountType === "taxi_partner"
                ? "Taxi Partner application"
                : "Create your RidePod account"}
          </h1>
          <p className="text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            {step === "account_type"
              ? "Choose how you’ll use RidePod."
              : accountType === "taxi_partner"
                ? "Tell us what taxi services you can support. Partner verification is manual during beta."
                : "Rider profiles help match pod rules and taxi needs."}
          </p>
        </div>

        {step === "form" && accountType === "taxi_partner" ? <TaxiPartnerRegisterHero /> : null}

        {step === "account_type" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {accountTypeCards.map((card) => {
                const Icon = card.icon;
                const selected = accountType === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setAccountType(card.id)}
                    className={cn(
                      "grid gap-3 rounded-[22px] border p-4 text-left transition",
                      selected
                        ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,var(--rp-card-soft))]"
                        : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] hover:border-[var(--rp-border-strong)]",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-[var(--rp-primary)]" /> : null}
                    </span>
                    <span>
                      <span className="block text-lg font-black text-[var(--rp-text)]">{card.title}</span>
                      <span className="mt-1 block text-sm font-bold leading-6 text-[var(--rp-muted)]">
                        {card.description}
                      </span>
                      <span className="mt-3 block text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
                        {card.helper}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setStatus(null);
                setError(null);
                setStep("form");
              }}
              className="min-h-12 rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
            >
              Continue
            </button>
          </div>
        ) : null}

        {step === "form" && accountType === "rider" ? (
          <form className="grid gap-4" onSubmit={onSubmitRider}>
            <TextField
              label="Account name"
              helper="Use this to log in with your password."
              value={accountName}
              onChange={(value) => setAccountName(normalizeAccountName(value))}
              required
            />
            <TextField
              label="Display name"
              helper="Shown to people in your pods. Leave blank to use account name."
              value={displayName}
              onChange={setDisplayName}
            />
            <TextField
              label="Email"
              helper="Used for confirmation and account recovery."
              type="email"
              value={email}
              onChange={setEmail}
              required
            />
            <PhoneField
              label="Phone number"
              helper="Hong Kong number only. RidePod adds +852 automatically."
              value={phone}
              onChange={setPhone}
              required
            />
            <TextField
              label="Password"
              helper={passwordHelperText}
              type="password"
              value={password}
              onChange={setPassword}
              minLength={6}
              required
            />
            <TextField
              label="Confirm password"
              helper="Type the same password again."
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
            />

            <RegisterAvatarField
              avatarPreference={avatarPreference}
              displayName={displayName.trim() || accountName || "RidePod user"}
              onChooseSticker={() => setAvatarPickerOpen(true)}
              onUseInitials={() => setAvatarPreference({ avatarType: "initials", animalAvatarId: null })}
            />

            <SelectField label="Home district" value={homeDistrict} options={districtOptions} onChange={setHomeDistrict} />
            <SelectField
              label="Gender / rider eligibility"
              helper="Used only for pod eligibility. Not shown publicly."
              value={genderEligibility}
              options={genderEligibilityOptions}
              onChange={setGenderEligibility}
            />
            <SelectField label="Age range" value={ageRange} options={ageRangeOptions} onChange={setAgeRange} />
            <SelectField
              label="Accessibility needs"
              value={accessibilityPreference}
              options={accessibilityOptions}
              onChange={setAccessibilityPreference}
            />

            <p className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-xs font-bold leading-5 text-[var(--rp-muted)]">
              RidePod does not collect ID documents during this beta registration. Rider eligibility details are not
              shown publicly.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="min-h-12 rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create account"}
            </button>
          </form>
        ) : null}

        {avatarPickerOpen ? (
          <RegisterAvatarPickerModal
            avatarPreference={avatarPreference}
            onCancel={() => setAvatarPickerOpen(false)}
            onSave={(animalAvatarId) => {
              setAvatarPreference({ avatarType: "animal", animalAvatarId });
              setAvatarPickerOpen(false);
            }}
          />
        ) : null}

        {step === "form" && accountType === "taxi_partner" && partnerApplicationSummary ? (
          <section className="grid gap-4 rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-[var(--rp-text)]">Partner interest submitted</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
                RidePod will manually review your taxi partner details before enabling partner tools.
              </p>
            </div>
            <dl className="grid gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-bold text-[var(--rp-muted)]">Partner type</dt>
                <dd className="text-right text-sm font-black text-[var(--rp-text)]">{partnerApplicationSummary.partnerType}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-bold text-[var(--rp-muted)]">Service areas</dt>
                <dd className="max-w-[62%] text-right text-sm font-black text-[var(--rp-text)]">
                  {partnerApplicationSummary.serviceAreas.length ? partnerApplicationSummary.serviceAreas.join(", ") : "Not selected"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-bold text-[var(--rp-muted)]">Taxi capabilities</dt>
                <dd className="max-w-[62%] text-right text-sm font-black text-[var(--rp-text)]">
                  {partnerApplicationSummary.taxiCapabilities.length ? partnerApplicationSummary.taxiCapabilities.join(", ") : "Not selected"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm font-bold text-[var(--rp-muted)]">Verification status</dt>
                <dd className="text-right text-sm font-black text-[var(--rp-primary)]">{partnerApplicationSummary.verificationStatus}</dd>
              </div>
            </dl>
            <p className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card)] px-4 py-3 text-xs font-bold leading-5 text-[var(--rp-muted)]">
              Private review fields such as legal / licence name, phone, email, Taxi Driver Identity Plate number, and taxi vehicle registration mark are not shown publicly.
            </p>
          </section>
        ) : null}

        {step === "form" && accountType === "taxi_partner" && !partnerApplicationSummary ? (
          <form className="grid gap-4" onSubmit={onSubmitTaxiPartner}>
            <button
              type="button"
              onClick={() => setStep("account_type")}
              className="inline-flex min-h-12 w-fit items-center gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[var(--rp-border-strong)] hover:bg-[var(--rp-card-muted)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Account type
            </button>

            <TextField label="Contact name" value={partnerContactName} onChange={setPartnerContactName} required />
            <TextField label="Phone" inputMode="tel" value={partnerPhone} onChange={setPartnerPhone} required />
            <TextField label="Email" type="email" value={partnerEmail} onChange={setPartnerEmail} required />
            <TextField
              label="Legal / licence name"
              helper="Use the name shown on your taxi partner or driver records."
              value={legalLicenceName}
              onChange={setLegalLicenceName}
              required
            />
            <SelectField label="Partner type" value={partnerType} options={partnerTypeOptions} onChange={setPartnerType} />

            <TextField
              label="Taxi Driver Identity Plate number"
              helper="Used for manual review. Do not upload documents in beta."
              value={taxiDriverIdentityPlateNumber}
              onChange={setTaxiDriverIdentityPlateNumber}
            />
            <TextField
              label="Taxi vehicle registration mark"
              helper="Example: taxi plate / registration mark shown on the vehicle."
              value={taxiVehicleRegistrationMark}
              onChange={setTaxiVehicleRegistrationMark}
            />

            {isIndividualDriver ? (
              <SelectField
                label="Taxi type currently driven"
                value={individualTaxiType}
                options={individualTaxiTypeOptions}
                onChange={setIndividualTaxiType}
              />
            ) : null}

            {isFleetOrOperator ? (
              <>
                <TextField label="Company / fleet name" value={companyFleetName} onChange={setCompanyFleetName} required />
                <TextField
                  label="Number of taxis"
                  helper="Approximate number of taxis you can coordinate."
                  type="number"
                  value={fleetSize}
                  onChange={setFleetSize}
                  inputMode="numeric"
                  min={1}
                />
                <label className="grid gap-2">
                  <FieldLabel
                    label="Sample taxi registration marks"
                    helper="Add one or more taxi registration marks for manual review. Do not upload documents."
                  />
                  <textarea
                    value={sampleRegistrationMarks}
                    onChange={(event) => setSampleRegistrationMarks(event.target.value)}
                    rows={3}
                    className="min-h-24 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[var(--rp-primary)]"
                  />
                </label>
              </>
            ) : null}

            <CheckboxGrid label="Service areas" options={serviceAreaOptions} values={serviceAreas} onChange={setServiceAreas} />
            <CheckboxGrid
              label="Taxi capabilities"
              options={taxiCapabilityOptions}
              values={taxiCapabilities}
              onChange={setTaxiCapabilities}
            />
            <CheckboxGrid label="Availability" options={availabilityOptions} values={availability} onChange={setAvailability} />

            <p className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--rp-muted)]">
              Taxi partner verification is manual during beta. Do not upload ID documents here.
            </p>
            <p className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-xs font-bold leading-5 text-[var(--rp-muted)]">
              Duplicate applications using the same phone, email, identity plate number, or taxi registration mark may be reviewed or blocked.
            </p>

            <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-black text-[var(--rp-text)]">
                <ClipboardCheck className="h-4 w-4 text-[var(--rp-primary)]" />
                Future verification checklist
              </div>
              <div className="mt-3 grid gap-2">
                {futureVerificationItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs font-bold text-[var(--rp-muted)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--rp-primary)]" />
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted)]">
                Partner documents may be reviewed manually later. Do not upload ID documents in this beta form.
              </p>
            </div>

            <label
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 transition",
                manualReviewAgreement
                  ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-text)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
              )}
            >
              <input
                type="checkbox"
                checked={manualReviewAgreement}
                onChange={(event) => setManualReviewAgreement(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--rp-primary)]"
              />
              I understand RidePod will manually review taxi partner details before enabling partner tools.
            </label>

            <button
              type="submit"
              className="min-h-12 rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
            >
              Submit partner interest
            </button>
          </form>
        ) : null}

        {status ? <p className="text-sm font-black text-[var(--rp-success)]">{status}</p> : null}
        {fallbackNote && accountType === "rider" ? (
          <p className="text-xs font-bold leading-5 text-[var(--rp-muted)]">{fallbackNote}</p>
        ) : null}
        {error ? <p className="text-sm font-black text-[var(--rp-danger)]">{error}</p> : null}

        <p className="text-sm font-semibold text-[var(--rp-muted)]">
          Already have an account?{" "}
          <Link
            href="/login"
            onClick={(event) => {
              const next = new URLSearchParams(window.location.search).get("next");
              if (!next || !next.startsWith("/")) return;
              event.preventDefault();
              router.push(`/login?next=${encodeURIComponent(next)}`);
            }}
            className="font-black text-[var(--rp-primary)]"
          >
            Log in
          </Link>
        </p>
      </section>
    </AuthPageShell>
  );
}
