"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, CheckCircle2, ChevronDown, RotateCcw, Save, Settings2, ShieldAlert } from "lucide-react";
import { cn } from "@/components/ui";
import {
  formatHKD,
  resetRidePodPricingConfig,
  ridePodPricingConfig,
  ridePodPricingCopy,
  setRidePodPricingConfig,
  type RidePodPricingConfig,
  type RidePodPricingRule,
  type RidePodPricingRuleType,
} from "@/lib/ridepod-pricing";
import { useRidePodPricingConfig } from "@/lib/use-ridepod-pricing-config";

type PricingRulePath =
  | "hostCreateFees.taxi"
  | "hostCreateFees.rideAppSelfSettle"
  | "joinFees.rideAppSelfSettle"
  | "joinFees.taxiPod"
  | "taxiPartnerFees.quoteCommission";

type ToastState = {
  tone: "success" | "neutral";
  message: string;
} | null;

const hostCreateRuleOptions = [
  { value: "disabled", label: "Disabled" },
  { value: "fixed", label: "Fixed amount" },
] satisfies Array<{ value: RidePodPricingRuleType; label: string }>;

const rideAppJoinRuleOptions = hostCreateRuleOptions;

const taxiRiderRuleOptions = [
  { value: "disabled", label: "Disabled" },
  { value: "fixed", label: "Fixed amount" },
  { value: "percentage", label: "Percentage" },
  { value: "percentage_with_minimum", label: "Percentage with minimum" },
  { value: "percentage_with_minimum_and_cap", label: "Percentage with minimum and cap" },
] satisfies Array<{ value: RidePodPricingRuleType; label: string }>;

const taxiPartnerRuleOptions = [
  { value: "disabled", label: "Disabled" },
  { value: "fixed", label: "Fixed amount" },
  { value: "percentage", label: "Percentage" },
] satisfies Array<{ value: RidePodPricingRuleType; label: string }>;

function centsToInput(cents: number | undefined) {
  return String((cents ?? 0) / 100);
}

function inputToCents(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function bpsToInput(bps: number | undefined) {
  return String((bps ?? 0) / 100);
}

function inputToBps(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function getRule(config: RidePodPricingConfig, path: PricingRulePath) {
  if (path === "hostCreateFees.taxi") return config.hostCreateFees.taxi;
  if (path === "hostCreateFees.rideAppSelfSettle") return config.hostCreateFees.rideAppSelfSettle;
  if (path === "joinFees.rideAppSelfSettle") return config.joinFees.rideAppSelfSettle;
  if (path === "joinFees.taxiPod") return config.joinFees.taxiPod;
  return config.taxiPartnerFees.quoteCommission;
}

function setRule(config: RidePodPricingConfig, path: PricingRulePath, rule: RidePodPricingRule): RidePodPricingConfig {
  if (path === "hostCreateFees.taxi") {
    return { ...config, hostCreateFees: { ...config.hostCreateFees, taxi: rule } };
  }

  if (path === "hostCreateFees.rideAppSelfSettle") {
    return { ...config, hostCreateFees: { ...config.hostCreateFees, rideAppSelfSettle: rule } };
  }

  if (path === "joinFees.rideAppSelfSettle") {
    return { ...config, joinFees: { ...config.joinFees, rideAppSelfSettle: rule } };
  }

  if (path === "joinFees.taxiPod") {
    return { ...config, joinFees: { ...config.joinFees, taxiPod: rule } };
  }

  return { ...config, taxiPartnerFees: { ...config.taxiPartnerFees, quoteCommission: rule } };
}

function createRuleForType(type: RidePodPricingRuleType, previous: RidePodPricingRule): RidePodPricingRule {
  if (type === "disabled") return { type };

  if (type === "fixed") {
    return { type, fixedAmountCents: previous.fixedAmountCents ?? 0 };
  }

  if (type === "percentage") {
    return { type, percentageBps: previous.percentageBps ?? 1000 };
  }

  if (type === "percentage_with_minimum") {
    return {
      type,
      percentageBps: previous.percentageBps ?? 1000,
      minimumAmountCents: previous.minimumAmountCents ?? 600,
    };
  }

  return {
    type,
    percentageBps: previous.percentageBps ?? 1000,
    minimumAmountCents: previous.minimumAmountCents ?? 600,
    maximumAmountCents: previous.maximumAmountCents ?? 0,
  };
}

function validateRule(rule: RidePodPricingRule) {
  const errors: string[] = [];

  if (rule.type === "fixed" && (rule.fixedAmountCents ?? 0) < 0) {
    errors.push("Enter a valid amount.");
  }

  if (
    ["percentage", "percentage_with_minimum", "percentage_with_minimum_and_cap"].includes(rule.type) &&
    ((rule.percentageBps ?? 0) < 0 || (rule.percentageBps ?? 0) > 10_000)
  ) {
    errors.push("Enter a percentage between 0 and 100.");
  }

  if (
    ["percentage_with_minimum", "percentage_with_minimum_and_cap"].includes(rule.type) &&
    (rule.minimumAmountCents ?? 0) < 0
  ) {
    errors.push("Enter a valid amount.");
  }

  if (rule.type === "percentage_with_minimum_and_cap") {
    if ((rule.maximumAmountCents ?? 0) < 0) {
      errors.push("Enter a valid amount.");
    }

    if ((rule.minimumAmountCents ?? 0) > (rule.maximumAmountCents ?? 0)) {
      errors.push("Minimum cannot exceed maximum.");
    }
  }

  return errors;
}

function validatePricingConfig(config: RidePodPricingConfig) {
  const ruleErrors = [
    validateRule(config.hostCreateFees.taxi),
    validateRule(config.hostCreateFees.rideAppSelfSettle),
    validateRule(config.joinFees.rideAppSelfSettle),
    validateRule(config.joinFees.taxiPod),
    validateRule(config.taxiPartnerFees.quoteCommission),
  ].flat();

  const waiverErrors = [
    config.waivers.launchWaiverMaxClaims < 0 ? "Enter a valid waiver count." : null,
    config.waivers.launchWaiverClaimedCount < 0 ? "Enter a valid waiver count." : null,
    config.waivers.plusMonthlyWaiverCount < 0 ? "Enter a valid waiver count." : null,
  ].filter(Boolean) as string[];

  return Array.from(new Set([...ruleErrors, ...waiverErrors]));
}

function ruleSummary(rule: RidePodPricingRule) {
  if (rule.type === "disabled") return "HK$0";
  if (rule.type === "fixed") return formatHKD(rule.fixedAmountCents ?? 0);
  if (rule.type === "percentage") return `${(rule.percentageBps ?? 0) / 100}%`;
  if (rule.type === "percentage_with_minimum") {
    return `${(rule.percentageBps ?? 0) / 100}%, minimum ${formatHKD(rule.minimumAmountCents ?? 0)}`;
  }
  return `${(rule.percentageBps ?? 0) / 100}%, minimum ${formatHKD(rule.minimumAmountCents ?? 0)}, cap ${formatHKD(
    rule.maximumAmountCents ?? 0,
  )}`;
}

export default function AdminPricingSettingsPage() {
  const savedConfig = useRidePodPricingConfig();
  const [draftConfig, setDraftConfig] = useState<RidePodPricingConfig>(savedConfig);
  const [toast, setToast] = useState<ToastState>(null);
  const validationErrors = useMemo(() => validatePricingConfig(draftConfig), [draftConfig]);
  const saveDisabled = validationErrors.length > 0;

  function updateRule(path: PricingRulePath, updater: (rule: RidePodPricingRule) => RidePodPricingRule) {
    setDraftConfig((currentConfig) => {
      const currentRule = getRule(currentConfig, path);
      return setRule(currentConfig, path, updater(currentRule));
    });
    setToast(null);
  }

  function updateWaivers(updater: (waivers: RidePodPricingConfig["waivers"]) => RidePodPricingConfig["waivers"]) {
    setDraftConfig((currentConfig) => ({
      ...currentConfig,
      waivers: updater(currentConfig.waivers),
    }));
    setToast(null);
  }

  function saveSettings() {
    if (saveDisabled) return;
    setRidePodPricingConfig(draftConfig);
    setToast({ tone: "success", message: "Mock pricing settings saved." });
  }

  function resetDefaults() {
    resetRidePodPricingConfig();
    setDraftConfig(ridePodPricingConfig);
    setToast({ tone: "neutral", message: "Defaults restored." });
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 pb-8">
      <header className="overflow-hidden rounded-[28px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_top_right,rgba(242,193,91,0.18),transparent_36%),linear-gradient(135deg,rgba(9,18,27,0.98),rgba(4,9,16,0.96))] p-5 shadow-[var(--rp-shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
              Admin mock
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--rp-text)] sm:text-4xl">
              Pricing settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Manage RidePod fee rules for Taxi and Ride app pods.
            </p>
            <p className="mt-3 inline-flex rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-black text-[var(--rp-muted-strong)]">
              Mock settings only. No live payment or billing is changed.
            </p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]">
            <Settings2 className="h-7 w-7" />
          </span>
        </div>
      </header>

      <DefaultsSummary />

      <section className="grid gap-5">
        <PricingSection
          title="Host create fees"
          description="Hosts can create pods for free by default."
          helper="Recommended: keep host creation free while growing supply."
        >
          <RuleEditor
            label="Taxi pod create fee"
            rule={draftConfig.hostCreateFees.taxi}
            options={hostCreateRuleOptions}
            onTypeChange={(type) => updateRule("hostCreateFees.taxi", (rule) => createRuleForType(type, rule))}
            onRuleChange={(rule) => updateRule("hostCreateFees.taxi", () => rule)}
          />
          <RuleEditor
            label="Ride app self-settle create fee"
            rule={draftConfig.hostCreateFees.rideAppSelfSettle}
            options={hostCreateRuleOptions}
            onTypeChange={(type) =>
              updateRule("hostCreateFees.rideAppSelfSettle", (rule) => createRuleForType(type, rule))
            }
            onRuleChange={(rule) => updateRule("hostCreateFees.rideAppSelfSettle", () => rule)}
          />
        </PricingSection>

        <PricingSection
          title="Ride app self-settle join fee"
          description={ridePodPricingCopy.ridePodJoinFee}
          helper="Ride fare is paid outside RidePod. This fee does not include the ride app fare."
        >
          <RuleEditor
            label="RidePod join fee"
            rule={draftConfig.joinFees.rideAppSelfSettle}
            options={rideAppJoinRuleOptions}
            onTypeChange={(type) =>
              updateRule("joinFees.rideAppSelfSettle", (rule) => createRuleForType(type, rule))
            }
            onRuleChange={(rule) => updateRule("joinFees.rideAppSelfSettle", () => rule)}
          />
        </PricingSection>

        <PricingSection
          title="Taxi pod rider platform fee"
          description="RidePod fee added to each rider's taxi fare share."
          helper="Taxi partner quote is separate. RidePod fee is shown separately from the taxi partner quote."
        >
          <RuleEditor
            label="Taxi pod rider platform fee"
            rule={draftConfig.joinFees.taxiPod}
            options={taxiRiderRuleOptions}
            onTypeChange={(type) => updateRule("joinFees.taxiPod", (rule) => createRuleForType(type, rule))}
            onRuleChange={(rule) => updateRule("joinFees.taxiPod", () => rule)}
          />
        </PricingSection>

        <PricingSection
          title="Taxi partner fee"
          description="Optional future fee for taxi partners. Disabled for MVP."
          helper="Recommended: keep taxi partner fees disabled while building partner supply."
        >
          <RuleEditor
            label="Taxi partner quote commission"
            rule={draftConfig.taxiPartnerFees.quoteCommission}
            options={taxiPartnerRuleOptions}
            onTypeChange={(type) =>
              updateRule("taxiPartnerFees.quoteCommission", (rule) => createRuleForType(type, rule))
            }
            onRuleChange={(rule) => updateRule("taxiPartnerFees.quoteCommission", () => rule)}
          />
        </PricingSection>

        <PricingSection
          title="Waivers"
          description="Control mock waiver availability for RidePod join fees."
          helper="Waivers cover RidePod join fees only. They do not cover taxi fare, taxi partner quote, ride app fare, tips, or external payments."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <WaiverCard
              title="Launch waiver"
              enabled={draftConfig.waivers.launchWaiverEnabled}
              helper="First 100 joining members can claim a HK$5 RidePod fee waiver."
              onEnabledChange={(enabled) => updateWaivers((waivers) => ({ ...waivers, launchWaiverEnabled: enabled }))}
            >
              <NumberField
                label="Max claims"
                value={draftConfig.waivers.launchWaiverMaxClaims}
                min={0}
                step={1}
                onChange={(value) =>
                  updateWaivers((waivers) => ({
                    ...waivers,
                    launchWaiverMaxClaims: Math.max(0, Math.floor(value)),
                  }))
                }
              />
              <NumberField
                label="Claimed count"
                value={draftConfig.waivers.launchWaiverClaimedCount}
                min={0}
                step={1}
                onChange={(value) =>
                  updateWaivers((waivers) => ({
                    ...waivers,
                    launchWaiverClaimedCount: Math.max(0, Math.floor(value)),
                  }))
                }
              />
            </WaiverCard>

            <WaiverCard
              title="RidePod Plus monthly waivers"
              enabled={draftConfig.waivers.plusWaiversEnabled}
              helper="Plus preview users receive monthly RidePod join fee waivers."
              onEnabledChange={(enabled) => updateWaivers((waivers) => ({ ...waivers, plusWaiversEnabled: enabled }))}
            >
              <NumberField
                label="Monthly waiver count"
                value={draftConfig.waivers.plusMonthlyWaiverCount}
                min={0}
                step={1}
                onChange={(value) =>
                  updateWaivers((waivers) => ({
                    ...waivers,
                    plusMonthlyWaiverCount: Math.max(0, Math.floor(value)),
                  }))
                }
              />
            </WaiverCard>
          </div>
        </PricingSection>

        <section className="sticky bottom-20 z-10 rounded-[24px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_92%,transparent)] p-4 shadow-[var(--rp-shadow-soft)] backdrop-blur-xl lg:bottom-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--rp-text)]">Save / reset actions</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                Local mock settings only. Pricing application comes in a later slice.
              </p>
              {validationErrors.length ? (
                <div className="mt-3 grid gap-1">
                  {validationErrors.map((error) => (
                    <p key={error} className="text-xs font-black text-[var(--rp-danger)]">
                      {error}
                    </p>
                  ))}
                </div>
              ) : null}
              {toast ? (
                <p
                  className={cn(
                    "mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black",
                    toast.tone === "success"
                      ? "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)]"
                      : "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)]",
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {toast.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={resetDefaults}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-5 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset defaults
              </button>
              <button
                type="button"
                disabled={saveDisabled}
                onClick={saveSettings}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition",
                  saveDisabled
                    ? "cursor-not-allowed border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]"
                    : "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)] shadow-[0_18px_34px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] hover:brightness-105",
                )}
              >
                <Save className="h-4 w-4" />
                Save mock settings
              </button>
            </div>
          </div>
        </section>
      </section>

      {/* TODO: Link this route from a dedicated admin dashboard menu when the admin navigation is formalized. */}
    </div>
  );
}

function DefaultsSummary() {
  const defaults = [
    ["Host create fee", "HK$0"],
    ["Ride app join fee", formatHKD(ridePodPricingConfig.joinFees.rideAppSelfSettle.fixedAmountCents ?? 0)],
    ["Taxi rider fee", "10%, minimum HK$6"],
    ["Taxi partner fee", "Disabled"],
    ["Launch waiver", `${ridePodPricingConfig.waivers.launchWaiverMaxClaims} claims`],
    ["Plus waivers", `${ridePodPricingConfig.waivers.plusMonthlyWaiverCount} monthly waivers`],
  ];

  return (
    <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
          <BadgeDollarSign className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-[var(--rp-text)]">Default config</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Current business-model defaults for the mock admin settings.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {defaults.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">{label}</p>
                <p className="mt-1 text-sm font-black text-[var(--rp-text)]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection({
  title,
  description,
  helper,
  children,
}: {
  title: string;
  description: string;
  helper: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full flex-col gap-3 text-left sm:flex-row sm:items-start sm:justify-between",
          open && "border-b border-[var(--rp-border)] pb-4",
        )}
      >
        <span className="min-w-0">
          <span className="block text-xl font-black text-[var(--rp-text)]">{title}</span>
          <span className="mt-2 block text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{description}</span>
        </span>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
          Mock
          <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
        </span>
      </button>

      {open ? (
        <>
          <div className="mt-4 grid gap-4">{children}</div>

          <p className="mt-4 flex gap-2 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
            {helper}
          </p>
        </>
      ) : null}
    </section>
  );
}

function RuleEditor({
  label,
  rule,
  options,
  onTypeChange,
  onRuleChange,
}: {
  label: string;
  rule: RidePodPricingRule;
  options: Array<{ value: RidePodPricingRuleType; label: string }>;
  onTypeChange: (type: RidePodPricingRuleType) => void;
  onRuleChange: (rule: RidePodPricingRule) => void;
}) {
  const ruleErrors = validateRule(rule);

  return (
    <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--rp-text)]">{label}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--rp-muted-strong)]">Current rule: {ruleSummary(rule)}</p>
        </div>
        <select
          value={rule.type}
          onChange={(event) => onTypeChange(event.target.value as RidePodPricingRuleType)}
          className="min-h-11 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card)] px-3 text-sm font-black text-[var(--rp-text)] outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {rule.type !== "disabled" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {rule.type === "fixed" ? (
            <MoneyField
              label="Amount HK$"
              value={centsToInput(rule.fixedAmountCents)}
              onChange={(value) => onRuleChange({ ...rule, fixedAmountCents: inputToCents(value) })}
            />
          ) : null}

          {["percentage", "percentage_with_minimum", "percentage_with_minimum_and_cap"].includes(rule.type) ? (
            <TextField
              label="Percentage %"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={bpsToInput(rule.percentageBps)}
              onChange={(value) => onRuleChange({ ...rule, percentageBps: inputToBps(value) })}
            />
          ) : null}

          {["percentage_with_minimum", "percentage_with_minimum_and_cap"].includes(rule.type) ? (
            <MoneyField
              label="Minimum HK$"
              value={centsToInput(rule.minimumAmountCents)}
              onChange={(value) => onRuleChange({ ...rule, minimumAmountCents: inputToCents(value) })}
            />
          ) : null}

          {rule.type === "percentage_with_minimum_and_cap" ? (
            <MoneyField
              label="Maximum HK$"
              value={centsToInput(rule.maximumAmountCents)}
              onChange={(value) => onRuleChange({ ...rule, maximumAmountCents: inputToCents(value) })}
            />
          ) : null}
        </div>
      ) : null}

      {ruleErrors.length ? (
        <div className="mt-3 grid gap-1">
          {ruleErrors.map((error) => (
            <p key={error} className="text-xs font-black text-[var(--rp-danger)]">
              {error}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      label={label}
      type="number"
      min={0}
      step={0.5}
      value={value}
      onChange={onChange}
    />
  );
}

function NumberField({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <TextField
      label={label}
      type="number"
      min={min}
      step={step}
      value={String(value)}
      onChange={(nextValue) => onChange(Number(nextValue))}
    />
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card)] px-3 text-sm font-black text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)]"
      />
    </label>
  );
}

function WaiverCard({
  title,
  enabled,
  helper,
  onEnabledChange,
  children,
}: {
  title: string;
  enabled: boolean;
  helper: string;
  onEnabledChange: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--rp-text)]">{title}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{helper}</p>
        </div>
        <button
          type="button"
          aria-pressed={enabled}
          onClick={() => onEnabledChange(!enabled)}
          className={cn(
            "relative h-8 w-14 shrink-0 rounded-full border transition",
            enabled
              ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_50%,transparent)]"
              : "border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)]",
          )}
        >
          <span
            className={cn(
              "absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--rp-text)] transition",
              enabled ? "left-7" : "left-1",
            )}
          />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
