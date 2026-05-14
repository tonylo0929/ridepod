import { CalendarClock, CarFront, ShieldCheck, UsersRound } from "lucide-react";
import { RidePodHeroBackground } from "@/components/ridepod-background";
import {
  Card,
  PrimaryButton,
  SecondaryButton,
  Stepper,
  StatusBadge,
} from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

const previewSteps = [
  { label: "Type", icon: CarFront },
  { label: "Route", icon: CalendarClock },
  { label: "Seats", icon: UsersRound },
  { label: "Review", icon: ShieldCheck },
];

export default function ThemePreviewPage() {
  return (
    <div className="relative min-h-[calc(100vh-2rem)] pb-4">
      <section className="relative min-h-[560px] overflow-hidden rounded-[34px]">
        <RidePodHeroBackground treatment="showcase" priority />

        <header className="relative z-10 flex min-h-[560px] flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[var(--rp-primary)]">
              Design System
            </p>
            <ThemeToggle compact />
          </div>

          <div className="max-w-xl pb-8">
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.04em] text-[var(--rp-text)] sm:text-6xl">
              RidePod
              <br />
              theme base
            </h1>
            <p className="mt-5 max-w-md text-base font-semibold leading-7 text-[var(--rp-muted-strong)] sm:text-lg">
              Dark executive and light itinerary modes share one token system, one shell, and reusable UI primitives.
            </p>
          </div>
        </header>
      </section>

      <main className="relative mt-6 grid gap-4">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
                Create Pod
              </p>
              <h2 className="mt-2 text-2xl font-black text-[var(--rp-text)]">USC to LAX</h2>
              <p className="mt-1 text-sm text-[var(--rp-muted)]">
                Tue, May 14 at 7:30 AM
              </p>
            </div>
            <StatusBadge status="locked" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ["Share", "$18.50"],
              ["Seats", "3 / 4"],
              ["Max", "$24.50"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3"
              >
                <p className="text-xs font-bold text-[var(--rp-muted)]">{label}</p>
                <p className="mt-1 text-lg font-black text-[var(--rp-text)]">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="mb-5 text-sm font-black text-[var(--rp-text)]">Stepper primitive</p>
          <Stepper steps={previewSteps} currentStep={1} />
        </Card>

        <Card className="grid gap-3">
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--rp-primary)]" />
              <div>
                <p className="font-black text-[var(--rp-text)]">Payment protected</p>
                <p className="mt-1 text-sm leading-6 text-[var(--rp-muted)]">
                  Host booking starts only after every seat has a financial owner.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PrimaryButton href="/create">Primary action</PrimaryButton>
            <SecondaryButton href="/home">Secondary</SecondaryButton>
          </div>
        </Card>
      </main>
    </div>
  );
}
