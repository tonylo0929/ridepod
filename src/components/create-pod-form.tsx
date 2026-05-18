"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Send, ShieldCheck, ToggleRight } from "lucide-react";
import { cn } from "@/components/ui";
import type { PodAccessMode, PodGenderMode } from "@/lib/mock-data";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-zinc-800">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "h-12 rounded-lg border border-zinc-200 bg-white px-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100";

const genderModeOptions: Array<{ value: PodGenderMode; label: string }> = [
  { value: "women_only", label: "Women-only" },
  { value: "mixed", label: "Mixed pod" },
];

const accessModeOptions: Array<{ value: PodAccessMode; label: string }> = [
  { value: "open", label: "Open" },
  { value: "verified_only", label: "Verified-only" },
  { value: "community_only", label: "Community-only" },
  { value: "high_trust_only", label: "High-trust-only" },
  { value: "invite_only", label: "Invite-only" },
];

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-lg border px-3 py-2 text-sm font-bold transition",
        active
          ? "border-emerald-700 bg-emerald-700 text-white"
          : "border-zinc-200 bg-white text-zinc-700",
      )}
    >
      {children}
    </button>
  );
}

function MoneySafetyFields({
  defaults,
}: {
  defaults: {
    estimatedTotalFareCents: number;
    approvedMaxTotalFareCents: number;
    targetSeats: number;
    minSeatsToBook: number;
    ridepodFeeCents: number;
  };
}) {
  const [money, setMoney] = useState(defaults);
  const [genderMode, setGenderMode] = useState<PodGenderMode>("mixed");
  const [accessMode, setAccessMode] = useState<PodAccessMode>("verified_only");

  function updateMoney(key: keyof typeof money, value: number) {
    setMoney((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div>
          <h2 className="text-base font-bold text-zinc-950">Money Protection</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Host may preview fare early, but protected booking unlocks only after required participants authorize payment.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estimated total fare (cents)">
          <input
            className={inputClass}
            type="number"
            min="0"
            value={money.estimatedTotalFareCents}
            onChange={(event) => updateMoney("estimatedTotalFareCents", Number(event.target.value))}
          />
        </Field>
        <Field label="Approved max total fare (cents)">
          <input
            className={inputClass}
            type="number"
            min="0"
            value={money.approvedMaxTotalFareCents}
            onChange={(event) => updateMoney("approvedMaxTotalFareCents", Number(event.target.value))}
          />
        </Field>
        <Field label="Ideal pod size">
          <input
            className={inputClass}
            type="number"
            min="1"
            value={money.targetSeats}
            onChange={(event) => updateMoney("targetSeats", Number(event.target.value))}
          />
        </Field>
        <Field label="Minimum locked guests">
          <input
            className={inputClass}
            type="number"
            min="1"
            value={money.minSeatsToBook}
            onChange={(event) => updateMoney("minSeatsToBook", Number(event.target.value))}
          />
        </Field>
        <Field label="Platform fee note">
          <div className={cn(inputClass, "flex items-center font-semibold text-zinc-950")}>
            {money.ridepodFeeCents}
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-500">System-controlled demo value.</p>
        </Field>
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <h2 className="text-base font-bold text-zinc-950">Safety &amp; Trust</h2>
        <div className="mt-3 grid gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-800">Gender mode</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {genderModeOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={genderMode === option.value}
                  onClick={() => setGenderMode(option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
            {genderMode === "women_only" ? (
              <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs font-semibold leading-5 text-zinc-600">
                Women-only pods are designed for safer matching. Eligible female users can join. RidePod does not guarantee safety; report concerns immediately.
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-800">Access mode</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {accessModeOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={accessMode === option.value}
                  onClick={() => setAccessMode(option.value)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          </div>

          {accessMode === "high_trust_only" ? (
            <Field label="Minimum trust score">
              <input className={inputClass} type="number" min="0" max="5" step="0.1" defaultValue="4.5" />
            </Field>
          ) : null}

          {accessMode === "community_only" ? (
            <Field label="Community">
              <input className={inputClass} defaultValue="usc" />
            </Field>
          ) : null}

          {accessMode === "invite_only" ? (
            <Field label="Invite code">
              <input className={inputClass} defaultValue="RIDEPOD" />
            </Field>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ScheduledPodForm() {
  const [created, setCreated] = useState(false);
  const [canHost, setCanHost] = useState(true);

  if (created) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-emerald-700" />
        <h1 className="mt-4 text-2xl font-bold text-zinc-950">Pod created</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Your scheduled pod is now forming. Members can claim seats after mock deposit or payment authorization.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-bold text-zinc-950">
            <Copy className="h-4 w-4" /> Share link
          </button>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-bold text-white">
            <Send className="h-4 w-4" /> Invite people
          </button>
        </div>
        <Link
          href="/home"
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white"
        >
          View feed
        </Link>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setCreated(true);
      }}
    >
      <Field label="From">
        <input className={inputClass} defaultValue="Mission District" />
      </Field>
      <Field label="To">
        <input className={inputClass} defaultValue="SFO Terminal 2" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pickup hub">
          <input className={inputClass} defaultValue="16th St BART curb" />
        </Field>
        <Field label="Dropoff hub">
          <input className={inputClass} defaultValue="Terminal 2 departures" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <input className={inputClass} type="date" defaultValue="2026-05-18" />
        </Field>
        <Field label="Time">
          <input className={inputClass} type="time" defaultValue="05:45" />
        </Field>
      </div>
      <Field label="Time flexibility">
        <select className={inputClass} defaultValue="+/- 10 min">
          <option>Exact time</option>
          <option>+/- 5 min</option>
          <option>+/- 10 min</option>
          <option>+/- 20 min</option>
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seats needed">
          <input className={inputClass} type="number" defaultValue="4" min="2" max="6" />
        </Field>
        <Field label="Vehicle type">
          <select className={inputClass} defaultValue="UberXL">
            <option>UberX</option>
            <option>UberXL</option>
            <option>Lyft</option>
            <option>Taxi</option>
            <option>Private Car</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estimated fare">
          <input className={inputClass} type="number" defaultValue="74" />
        </Field>
        <Field label="Max approved fare">
          <input className={inputClass} type="number" defaultValue="92" />
        </Field>
      </div>
      <MoneySafetyFields
        defaults={{
          estimatedTotalFareCents: 7400,
          approvedMaxTotalFareCents: 9200,
          targetSeats: 4,
          minSeatsToBook: 3,
          ridepodFeeCents: 200,
        }}
      />
      <Field label="Cancellation deadline">
        <input className={inputClass} type="datetime-local" defaultValue="2026-05-17T18:00" />
      </Field>
      <button
        type="button"
        onClick={() => setCanHost((value) => !value)}
        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 text-left"
      >
        <div>
          <p className="text-sm font-bold text-zinc-950">I can host</p>
          <p className="mt-1 text-xs text-zinc-600">
            RidePod helps users coordinate planned ride pods. RidePod does not provide drivers. The host books the external ride.
          </p>
        </div>
        <ToggleRight className={cn("h-8 w-8", canHost ? "text-emerald-700" : "text-zinc-300")} />
      </button>
      <button className="sticky bottom-24 h-12 rounded-lg bg-zinc-950 text-sm font-bold text-white lg:static">
        Create scheduled pod
      </button>
    </form>
  );
}

export function RecurringPodForm() {
  const [created, setCreated] = useState(false);
  const [days, setDays] = useState(["Mon", "Wed", "Fri"]);
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  if (created) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-emerald-700" />
        <h1 className="mt-4 text-2xl font-bold text-zinc-950">Recurring pod created</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Seats are reserved for the billing period. Cancelled seats can be replaced by the waitlist before the next cycle.
        </p>
        <div className="mt-5 rounded-lg bg-zinc-50 p-4">
          <p className="text-sm font-bold text-zinc-950">Member slots</p>
          <div className="mt-3 grid gap-2 text-sm text-zinc-700">
            <p>Slot 1: You, host</p>
            <p>Slot 2: Open seat</p>
            <p>Slot 3: Open seat</p>
            <p>Waitlist: Empty</p>
          </div>
        </div>
        <Link
          href="/pods"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white"
        >
          View my pods
        </Link>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setCreated(true);
      }}
    >
      <Field label="Route">
        <input className={inputClass} defaultValue="North Berkeley to UC Berkeley" />
      </Field>
      <div className="grid gap-2">
        <p className="text-sm font-semibold text-zinc-800">Days of week</p>
        <div className="grid grid-cols-5 gap-2">
          {weekDays.map((day) => {
            const selected = days.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() =>
                  setDays((value) =>
                    selected ? value.filter((item) => item !== day) : [...value, day],
                  )
                }
                className={cn(
                  "h-11 rounded-lg border text-sm font-bold",
                  selected
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-zinc-200 bg-white text-zinc-700",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Time">
          <input className={inputClass} type="time" defaultValue="08:10" />
        </Field>
        <Field label="Billing period">
          <select className={inputClass} defaultValue="Weekly">
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seat count">
          <input className={inputClass} type="number" min="2" max="6" defaultValue="4" />
        </Field>
        <Field label="Vehicle type">
          <select className={inputClass} defaultValue="Lyft">
            <option>UberX</option>
            <option>UberXL</option>
            <option>Lyft</option>
            <option>Taxi</option>
            <option>Private Car</option>
          </select>
        </Field>
      </div>
      <Field label="Estimated weekly cost">
        <input className={inputClass} type="number" defaultValue="84" />
      </Field>
      <MoneySafetyFields
        defaults={{
          estimatedTotalFareCents: 8400,
          approvedMaxTotalFareCents: 9600,
          targetSeats: 4,
          minSeatsToBook: 3,
          ridepodFeeCents: 200,
        }}
      />
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-bold text-zinc-950">Seat ownership rules</p>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Members own their seat for the billing period. If a member leaves mid-period, the waitlist can replace the seat and credit may apply.
        </p>
      </div>
      <button className="sticky bottom-24 h-12 rounded-lg bg-zinc-950 text-sm font-bold text-white lg:static">
        Create recurring pod
      </button>
    </form>
  );
}
