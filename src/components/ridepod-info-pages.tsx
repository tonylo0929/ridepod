import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  ChevronDown,
  CheckCircle2,
  CircleDollarSign,
  HelpCircle,
  LockKeyhole,
  ReceiptText,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Badge, Card, PrimaryButton, SecondaryButton, cn } from "@/components/ui";

const proofPoints = ["Shared taxi pods", "Taxi partner quotes", "Review steps"];

const featureCards = [
  {
    title: "Shared taxi pods",
    body: "Riders join first, then the group requests one shared taxi partner quote.",
    icon: LockKeyhole,
  },
  {
    title: "Quote and review flow",
    body: "Guests review the taxi quote, accept it, and see mock payment state during beta.",
    icon: ShieldCheck,
  },
  {
    title: "Manual proof review",
    body: "Fallback proof flows can support manual settlement review.",
    icon: ReceiptText,
  },
  {
    title: "Clear quote split",
    body: "Guests see the selected quote, fare share, platform fee, and review state.",
    icon: CircleDollarSign,
  },
  {
    title: "Taxi-first beta",
    body: "Ride app support is coming later. Taxi Partner Quote is the main beta path.",
    icon: UsersRound,
  },
  {
    title: "Safety modes",
    body: "Pods can support options like Women-only, Verified-only, Community-only, High-trust-only, and Invite-only.",
    icon: Sparkles,
  },
];

const cleanHowSteps = [
  {
    title: "Create taxi pod",
    body: "Choose route, time, taxi type, and who can join.",
    icon: UsersRound,
  },
  {
    title: "Guests join",
    body: "Riders lock into the shared pod.",
    icon: LockKeyhole,
  },
  {
    title: "Request taxi quote",
    body: "A licensed taxi partner quotes one shared price.",
    icon: CarFront,
  },
  {
    title: "Ride and review",
    body: "Payout stays pending during the dispute window.",
    icon: Scale,
  },
];

const cleanRideOptions = [
  {
    title: "Taxi",
    body: "Create a shared taxi pod, choose taxi type, let guests join, then request one shared taxi partner quote.",
    icon: CarFront,
    badge: "Available in beta",
    helper: "No real taxi dispatch or payout yet.",
  },
  {
    title: "Ride app",
    body: "Group ride app bookings are coming later.",
    icon: Smartphone,
    badge: "Coming soon",
    helper: "Start with taxi pods first.",
  },
];

const fallbackRideOptions = [
  {
    title: "Ride app / fixed quote",
    body: "Legacy beta / coming later.",
    icon: Smartphone,
  },
  {
    title: "Taxi meter",
    body: "Fallback beta mode.",
    icon: CarFront,
  },
];

const cleanMoneyItems = [
  "Quote acceptance",
  "Mock payment state",
  "Dispute window review",
];

const faqPreviewItems = [
  "Does RidePod provide drivers?",
  "What is Taxi partner quote?",
  "What is max charge?",
  "When is proof needed?",
  "Is Taxi partner quote live?",
];

const faqItems = [
  {
    question: "What is RidePod?",
    answer:
      "RidePod helps groups coordinate shared taxi pods. Riders join first, then the group requests one shared quote from a licensed taxi partner. RidePod does not provide drivers.",
  },
  {
    question: "Is RidePod a ride-hailing company?",
    answer:
      "No. RidePod does not provide drivers or operate the ride. RidePod helps users organize shared taxi pods and manage quote acceptance, mock payment state, coordination, and review steps.",
  },
  {
    question: "Who books the actual ride?",
    answer:
      "For Taxi Partner Quote, a licensed taxi partner is the external provider. Older ride app and taxi meter flows remain fallback beta modes.",
  },
  {
    question: "What is Taxi partner quote?",
    answer:
      "Taxi partner quote is the Taxi-first beta flow. RidePod groups riders first, then a licensed taxi partner can quote one shared price. It is not live taxi dispatch yet.",
  },
  {
    question: "Does RidePod provide drivers?",
    answer:
      "No. RidePod does not provide drivers. Taxi partners are external licensed providers.",
  },
  {
    question: "Is Taxi partner quote live?",
    answer:
      "It is beta/demo only. No real taxi dispatch, payment, or payout is enabled unless clearly stated.",
  },
  {
    question: "When is my seat confirmed?",
    answer:
      "In the Taxi-first beta, your seat moves forward after you accept the shared taxi quote. Payment is mock/test mode unless clearly stated.",
  },
  {
    question: "What is max charge?",
    answer:
      "Your max charge is the most you can be charged for that pod unless you approve a higher fare. If the verified final receipt is lower, your final charge can be lower.",
  },
  {
    question: "Can the host book before everyone confirms?",
    answer:
      "For Taxi Partner Quote, the ride proceeds only after guests accept the shared taxi quote. Ride app support is coming later.",
  },
  {
    question: "Why does the host upload a quote screenshot?",
    answer:
      "The quote screenshot helps RidePod check whether the expected fare is within the approved max before the host books. The final settlement still uses the verified final receipt.",
  },
  {
    question: "What happens if proof is misleading or unsupported?",
    answer:
      "Misleading or unsupported proof may go to manual review. RidePod may request more information or take account action if needed.",
  },
  {
    question: "What happens if the final receipt is lower than expected?",
    answer:
      "Riders pay based on the verified final receipt. If the final fare is lower, riders may pay less or receive an adjustment depending on the payment flow.",
  },
  {
    question: "What happens if the final receipt is higher than the approved max?",
    answer:
      "Riders cannot be charged above their approved max unless they approve an increase. Unauthorized overage may not be reimbursed to the host.",
  },
  {
    question: "What happens if the host cancels before booking?",
    answer:
      "The pod can stay active in Host Replacement Mode. Confirmed participants can stay together, and an eligible participant may become the replacement host. A replacement host must upload a fresh quote before reviewed booking unlocks.",
  },
  {
    question: "What happens if I cancel or no-show?",
    answer:
      "Before the pod locks, cancellation is usually simple. After the host books, a cancellation or no-show may still be billable if your seat is not replaced. This helps protect the group from ghosting.",
  },
  {
    question: "What are Women-only pods?",
    answer:
      "Women-only controls who can join the shared pod. It does not guarantee a female taxi driver unless supported by the taxi partner.",
  },
  {
    question: "What are Verified-only, Community-only, High-trust-only, and Invite-only pods?",
    answer:
      "These are trust settings that help hosts control who can join a pod. For example, a pod may be limited to verified users, people from the same community, users with strong trust history, or invited members only.",
  },
  {
    question: "Why should I keep the quote and review flow in RidePod?",
    answer:
      "Off-app arrangements are not part of RidePod review. RidePod can only help with quote, dispute, and settlement review when the flow stays in RidePod.",
  },
  {
    question: "Can I pay with Venmo, Zelle, PayPal, or cash?",
    answer:
      "Direct payments outside RidePod are not part of the beta quote and review flow. Keep the quote and review flow in RidePod.",
  },
  {
    question: "Does RidePod guarantee safety?",
    answer:
      "No. RidePod provides tools designed for safer matching, trust rules, quote review, and reporting. These tools help reduce risk, but they do not guarantee safety.",
  },
  {
    question: "Does RidePod guarantee a refund?",
    answer:
      "No. Refunds or adjustments depend on the pod state, receipt verification, cancellation timing, no-show rules, and dispute review.",
  },
  {
    question: "When does chat unlock?",
    answer:
      "Chat unlocks after your seat is accepted for the pod. Exact pickup details may also unlock only after seat lock.",
  },
  {
    question: "What if the receipt cannot be verified?",
    answer:
      "RidePod may request more information, hold settlement, or route the case to manual review. Payout or reimbursement state may stay pending if proof is missing or unsupported.",
  },
  {
    question: "What is the best use case for RidePod?",
    answer:
      "RidePod is best for planned shared rides such as airport trips, campus rides, commute pods, event travel, and community-based ride coordination.",
  },
];

export function AboutRidePodPage() {
  return (
    <InfoPageLayout>
      <HeroSection />

      <Card className="grid gap-4 border-[var(--rp-border-strong)] bg-[var(--rp-card-elevated)] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-tight text-[var(--rp-text)]">
              RidePod does not provide drivers.
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              RidePod is not a ride-hailing company. We help users coordinate planned shared rides
              and manage quote, acceptance, and review steps. Taxi partners are external licensed
              providers.
            </p>
          </div>
        </div>
      </Card>

      <section className="grid gap-3">
        <ContentHeading eyebrow="What RidePod Helps With" title="Built for planned shared rides" />
        <div className="grid gap-3 sm:grid-cols-2">
          {featureCards.map(({ title, body, icon: Icon }) => (
            <Card key={title} className="p-4">
              <Icon className="h-6 w-6 text-[var(--rp-primary)]" />
              <h3 className="mt-4 text-lg font-black text-[var(--rp-text)]">{title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <TwoColumnInfo />

      <section className="grid gap-3 rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
          Ready when your group is
        </p>
        <h2 className="text-2xl font-black tracking-tight text-[var(--rp-text)]">
          Start with a planned ride pod.
        </h2>
        <div className="grid gap-3 sm:flex">
          <PrimaryButton href="/create" className="w-full sm:w-auto">
            Create a pod
          </PrimaryButton>
          <SecondaryButton href="/pods" className="w-full sm:w-auto">
            Join a ride
          </SecondaryButton>
        </div>
      </section>
    </InfoPageLayout>
  );
}

export function HowRidePodWorksPage() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-4 pb-6">
      <section className="grid gap-2 text-center">
        <h1 className="text-[30px] font-black leading-tight tracking-tight text-[var(--rp-text)]">
          How RidePod Works
        </h1>
        <p className="text-base font-black text-[var(--rp-primary)]">
          RidePod helps groups coordinate shared taxi pods.
        </p>
        <p className="text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Riders join first, then the group requests one shared quote from a licensed taxi partner. Ride app support is coming later.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cleanHowSteps.map(({ title, body, icon: Icon }, index) => (
          <Card key={title} className="relative p-2.5 text-center">
            <span className="absolute -top-2 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-[var(--rp-primary)] text-[11px] font-black text-[var(--rp-primary-text)]">
              {index + 1}
            </span>
            <Icon className="mx-auto mt-3 h-6 w-6 text-[var(--rp-primary)]" />
            <h2 className="mt-2 text-[11px] font-black text-[var(--rp-text)]">{title}</h2>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-[var(--rp-muted)]">{body}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-3">
        {cleanRideOptions.map(({ title, body, icon: Icon, badge, helper }) => (
          <Card key={title} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black leading-4 text-[var(--rp-text)]">{title}</span>
              <span className="mt-1 block text-[11px] font-semibold text-[var(--rp-muted)]">{body}</span>
              {badge ? (
                <span className="mt-2 inline-flex rounded-full bg-[var(--rp-warning-bg)] px-2 py-1 text-[10px] font-black text-[var(--rp-warning)]">
                  {badge}
                </span>
              ) : null}
              {helper ? (
                <span className="mt-1 block text-[10px] font-semibold text-[var(--rp-muted)]">{helper}</span>
              ) : null}
            </span>
            <ArrowRight className="h-4 w-4 text-[var(--rp-muted)]" />
          </Card>
        ))}
      </section>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
          <h2 className="text-base font-black text-[var(--rp-text)]">Quote and review flow</h2>
        </div>
        <div className="mt-3 grid gap-2">
          {cleanMoneyItems.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm font-semibold text-[var(--rp-muted-strong)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--rp-primary)]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
          Closed beta uses mock payment state. No live payment or payout is enabled.
        </p>
      </Card>

      <section className="grid gap-2">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
          Other beta / fallback modes
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {fallbackRideOptions.map(({ title, body, icon: Icon }) => (
            <Card key={title} className="grid grid-cols-[34px_1fr] items-center gap-3 p-3 opacity-85">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-black leading-4 text-[var(--rp-text)]">{title}</span>
                <span className="mt-1 block text-[11px] font-semibold text-[var(--rp-muted)]">{body}</span>
              </span>
            </Card>
          ))}
        </div>
      </section>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[var(--rp-muted-strong)]" />
            <h2 className="text-base font-black text-[var(--rp-text)]">FAQ</h2>
          </div>
          <Link href="/faq" className="text-xs font-black text-[var(--rp-primary)]">
            View all
          </Link>
        </div>
        <div className="mt-3 grid gap-2">
          {faqPreviewItems.map((question) => (
            <details
              key={question}
              className="group rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-xs font-black text-[var(--rp-text)]">
                {question}
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--rp-muted)] transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
                View the full FAQ for details.
              </p>
            </details>
          ))}
        </div>
      </Card>

      <Card className="border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_8%,var(--rp-card))] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-base font-black text-[var(--rp-primary)]">
              RidePod does not provide drivers.
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
              Taxi partners are external licensed providers.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function RidePodFaqPage() {
  return (
    <InfoPageLayout>
      <PageIntro
        eyebrow="FAQ"
        title="Straight answers for riders and hosts."
        body="RidePod is built around shared taxi pods, taxi partner quotes, guest acceptance, mock payment state, and review steps."
      />
      <div className="grid gap-3">
        {faqItems.map((item, index) => (
          <details
            key={item.question}
            className="group rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]"
            open={index < 3}
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
              <span className="text-base font-black text-[var(--rp-text)]">{item.question}</span>
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rp-primary)] transition group-open:rotate-45" />
            </summary>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </InfoPageLayout>
  );
}

function InfoPageLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid w-full max-w-4xl gap-5">{children}</div>;
}

function HeroSection() {
  return (
    <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <div className="grid gap-5 p-5 sm:p-7">
        <div className="flex flex-wrap gap-2">
          {proofPoints.map((point) => (
            <Badge
              key={point}
              className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border-strong)]"
            >
              {point}
            </Badge>
          ))}
        </div>
        <div>
          <h1 className="max-w-2xl text-5xl font-black leading-[0.95] tracking-tight text-[var(--rp-text)] sm:text-6xl">
            Split the ride.
            <br />
            Not the risk.
          </h1>
          <p className="mt-4 text-xl font-black text-[var(--rp-primary)]">
            Shared taxi pods. Taxi partner quotes. Review steps.
          </p>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[var(--rp-muted)] sm:text-base">
            RidePod helps groups create shared taxi pods, choose taxi needs, coordinate pickup, and
            request one shared quote from a licensed taxi partner. Closed beta uses mock payment
            state and review steps. Ride app support is coming later.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TextLink href="/how-it-works">See how it works</TextLink>
          <TextLink href="/faq">Read FAQ</TextLink>
        </div>
      </div>
    </section>
  );
}

function TwoColumnInfo() {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <Card className="p-5">
        <Sparkles className="h-6 w-6 text-[var(--rp-primary)]" />
        <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">
          Designed for safer matching.
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          RidePod supports safety and trust modes such as Women-only pods, verified members,
          community-only pods, and high-trust pods. These tools are designed to make planned shared
          rides easier to coordinate, but they are not a guarantee of safety.
        </p>
      </Card>
      <Card className="p-5">
        <ShieldCheck className="h-6 w-6 text-[var(--rp-primary)]" />
        <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Keep the review flow in RidePod.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Off-app arrangements are not part of RidePod review. RidePod can only help with quote,
          dispute, and settlement review when the flow stays in RidePod.
        </p>
      </Card>
    </section>
  );
}

function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-[var(--rp-text)]">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--rp-muted)]">
        {body}
      </p>
    </section>
  );
}

function ContentHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--rp-text)]">{title}</h2>
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--rp-border-strong)] px-4 py-2 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]",
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
