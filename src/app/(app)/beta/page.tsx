import Link from "next/link";
import {
  CalendarClock,
  CarFront,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  Repeat2,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { BetaAccessForm } from "@/components/beta-access-form";
import { Badge, Card, PrimaryButton, SecondaryButton, cn } from "@/components/ui";

const betaFlows = [
  {
    title: "Scheduled ride app",
    body: "Quote before booking. Receipt after ride.",
    cta: "Try flow",
    href: "/create/scheduled",
    icon: CalendarClock,
  },
  {
    title: "Taxi meter",
    body: "No upfront quote. Meter proof after ride.",
    cta: "Try flow",
    href: "/create/scheduled",
    icon: CarFront,
  },
  {
    title: "Recurring pod",
    body: "Weekly template. Each ride settles separately.",
    cta: "Try flow",
    href: "/create/recurring",
    icon: Repeat2,
  },
  {
    title: "Settlement",
    body: "Final split, dispute window, and payout status.",
    cta: "Try flow",
    href: "/pods/usc-lax-001/settlement",
    icon: WalletCards,
  },
  {
    title: "Admin review",
    body: "Review proof, disputes, and above-cap cases.",
    cta: "Try flow",
    href: "/admin/review",
    icon: ClipboardCheck,
  },
];

const betaLimits = [
  "Mock payment states",
  "Manual proof review",
  "No real payout yet",
  "No OCR or AI fraud detection",
  "No live provider integration",
];

const watchItems = [
  "Do you understand quote vs receipt?",
  "Do you trust max charge?",
  "Is taxi meter clear?",
  "Is recurring pod clear?",
  "Would you use this for airport or community rides?",
];

function SectionHeading({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div className="grid gap-2">
      {eyebrow ? (
        <p className="text-xs font-black uppercase text-[var(--rp-primary)]">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-black text-[var(--rp-text)]">{title}</h2>
    </div>
  );
}

function FlowCard({ flow }: { flow: (typeof betaFlows)[number] }) {
  const Icon = flow.icon;

  return (
    <Card className="grid content-between gap-5 p-5">
      <div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-4 text-lg font-black text-[var(--rp-text)]">{flow.title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">{flow.body}</p>
      </div>
      <Link
        href={flow.href}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
      >
        {flow.cta}
      </Link>
    </Card>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
      <span>{children}</span>
    </li>
  );
}

export default function BetaPage() {
  return (
    <div className="grid gap-8 pb-4">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card-elevated)] p-6 shadow-[var(--rp-shadow-soft)] sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_18%,transparent),transparent_42%)]" />
        <div className="relative grid gap-6">
          <Badge className="w-fit bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]">
            Closed beta
          </Badge>
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase text-[var(--rp-primary)]">RidePod Closed Beta</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--rp-text)] sm:text-5xl">
              Split the ride. Not the risk.
            </h1>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-[var(--rp-muted-strong)] sm:text-lg">
              Test planned shared ride pods with seat locks, fare caps, proof review, and fair
              settlement.
            </p>
          </div>
          <div className="grid gap-3 sm:flex">
            <PrimaryButton href="/pods" className="w-full sm:w-auto">
              Start demo
            </PrimaryButton>
            <SecondaryButton href="/how-it-works" className="w-full sm:w-auto">
              How RidePod works
            </SecondaryButton>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <UsersRound className="mt-1 h-6 w-6 shrink-0 text-[var(--rp-primary)]" />
            <div>
              <h2 className="text-xl font-black text-[var(--rp-text)]">What you&apos;re testing</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
                RidePod helps people organize planned shared ride pods. The host books or takes the
                external ride, while RidePod helps guests lock seats, review proof, and split costs
                fairly.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-[var(--rp-border-strong)] bg-[var(--rp-card-elevated)] p-5">
          <div className="flex items-start gap-3">
            <CarFront className="mt-1 h-6 w-6 shrink-0 text-[var(--rp-primary)]" />
            <div>
              <h2 className="text-xl font-black text-[var(--rp-text)]">
                RidePod does not provide drivers
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
                RidePod is not a ride-hailing company. Hosts use ride apps, providers, or taxi meter
                rides outside RidePod.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4">
        <SectionHeading title="Try these beta flows" eyebrow="Demo paths" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {betaFlows.map((flow) => (
            <FlowCard key={flow.title} flow={flow} />
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading title="Beta limits" />
          <ul className="mt-5 grid gap-3">
            {betaLimits.map((item) => (
              <CheckItem key={item}>{item}</CheckItem>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <SectionHeading title="Tell us what feels confusing" />
          <ul className="mt-5 grid gap-3">
            {watchItems.map((item) => (
              <CheckItem key={item}>{item}</CheckItem>
            ))}
          </ul>
        </Card>
      </section>

      <BetaAccessForm />

      <div id="feedback">
        <Card className="grid gap-4 border-[var(--rp-border-strong)] bg-[var(--rp-card-elevated)] p-5">
          <div className="flex items-start gap-3">
            <MessageSquareText className="mt-1 h-6 w-6 shrink-0 text-[var(--rp-primary)]" />
            <div>
              <h2 className="text-2xl font-black text-[var(--rp-text)]">Give feedback</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
                After testing, tell us what felt clear, confusing, risky, or useful.
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
                Feedback form template: docs/ridepod-beta-feedback-form.md.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:flex">
            <SecondaryButton href="#feedback" className="w-full sm:w-auto">
              Open feedback form
            </SecondaryButton>
            <SecondaryButton href="/how-it-works" className="w-full sm:w-auto">
              Review beta basics
            </SecondaryButton>
          </div>
        </Card>
      </div>

      <footer
        className={cn(
          "rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4",
          "text-sm font-semibold leading-6 text-[var(--rp-muted)]",
        )}
      >
        <FileText className="mb-3 h-5 w-5 text-[var(--rp-primary)]" />
        Closed beta is for testing workflow and trust. Real payments and payouts are not enabled
        unless explicitly stated.
      </footer>
    </div>
  );
}
