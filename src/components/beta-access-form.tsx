"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Card, cn } from "@/components/ui";

const roleOptions = ["Host", "Guest", "Admin reviewer", "Not sure"] as const;
const useCaseOptions = ["Airport rides", "Campus rides", "Community rides", "Recurring commute", "Other"] as const;

type BetaAccessFormState = {
  name: string;
  email: string;
  desiredRole: string;
  useCase: string;
  note: string;
};

const initialForm: BetaAccessFormState = {
  name: "",
  email: "",
  desiredRole: "",
  useCase: "",
  note: "",
};

const inputClass =
  "min-h-12 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-sm font-semibold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--rp-primary)_24%,transparent)]";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function BetaAccessForm() {
  const [form, setForm] = useState<BetaAccessFormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof BetaAccessFormState, string>>>({});
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle");

  function updateField(field: keyof BetaAccessFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitState("idle");
  }

  function validateForm() {
    const nextErrors: Partial<Record<keyof BetaAccessFormState, string>> = {};

    if (!form.name.trim()) nextErrors.name = "Add your name.";
    if (!isValidEmail(form.email)) nextErrors.email = "Add a valid email.";
    if (!form.desiredRole) nextErrors.desiredRole = "Choose a role.";
    if (!form.useCase) nextErrors.useCase = "Choose a use case.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("idle");

    if (!validateForm()) return;

    try {
      // TODO: Persist beta access requests in a later slice when a Supabase table is approved.
      window.localStorage.setItem(
        "ridepod:last-beta-access-request",
        JSON.stringify({
          ...form,
          createdAt: new Date().toISOString(),
          status: "REQUESTED",
        }),
      );
      setForm(initialForm);
      setSubmitState("success");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <Card className="grid gap-5 border-[var(--rp-border-strong)] bg-[var(--rp-card-elevated)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
          <Send className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-[var(--rp-text)]">Request beta access</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            Tell us how you want to test RidePod. We&apos;ll only use this information to contact you
            about RidePod beta testing.
          </p>
        </div>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[var(--rp-text)]">
            Name
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              autoComplete="name"
            />
            {errors.name ? <span className="text-xs font-bold text-[var(--rp-danger)]">{errors.name}</span> : null}
          </label>

          <label className="grid gap-2 text-sm font-black text-[var(--rp-text)]">
            Email
            <input
              className={inputClass}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              autoComplete="email"
              inputMode="email"
            />
            {errors.email ? <span className="text-xs font-bold text-[var(--rp-danger)]">{errors.email}</span> : null}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[var(--rp-text)]">
            Role you want to test
            <select
              className={cn(inputClass, "appearance-none")}
              value={form.desiredRole}
              onChange={(event) => updateField("desiredRole", event.target.value)}
            >
              <option value="">Choose a role</option>
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.desiredRole ? (
              <span className="text-xs font-bold text-[var(--rp-danger)]">{errors.desiredRole}</span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-black text-[var(--rp-text)]">
            Use case
            <select
              className={cn(inputClass, "appearance-none")}
              value={form.useCase}
              onChange={(event) => updateField("useCase", event.target.value)}
            >
              <option value="">Choose a use case</option>
              {useCaseOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.useCase ? (
              <span className="text-xs font-bold text-[var(--rp-danger)]">{errors.useCase}</span>
            ) : null}
          </label>
        </div>

        <label className="grid gap-2 text-sm font-black text-[var(--rp-text)]">
          Short note
          <textarea
            className={cn(inputClass, "min-h-28 resize-none py-3 leading-6")}
            value={form.note}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="Tell us what you want to test."
          />
        </label>

        <div className="grid gap-3">
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_rgba(0,124,137,0.18)] transition hover:brightness-105"
          >
            Request access
          </button>
          <p className="text-xs font-semibold leading-5 text-[var(--rp-muted)]">
            Do not include phone numbers, payment details, exact addresses, or sensitive identity
            data in this request.
          </p>
          {submitState === "success" ? (
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-300">
              Request received. We&apos;ll follow up when your beta slot is ready.
            </p>
          ) : null}
          {submitState === "error" ? (
            <p className="rounded-xl border border-[var(--rp-border)] bg-[var(--rp-danger-bg)] p-3 text-sm font-bold text-[var(--rp-danger)]">
              Couldn&apos;t submit request. Try again later.
            </p>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
