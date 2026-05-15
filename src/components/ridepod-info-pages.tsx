import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  HelpCircle,
  LockKeyhole,
  MapPinned,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Badge, Card, PrimaryButton, SecondaryButton, cn } from "@/components/ui";

const proofPoints = ["Locked seats", "Protected payments", "Fair splits"];

const featureCards = [
  {
    title: "Locked seats",
    body: "Participants are not confirmed until their seat is payment-authorized.",
    icon: LockKeyhole,
  },
  {
    title: "Protected payments",
    body: "Riders see their max charge before locking a seat.",
    icon: ShieldCheck,
  },
  {
    title: "Verified receipts",
    body: "Final settlement uses the host's verified final receipt.",
    icon: ReceiptText,
  },
  {
    title: "Fair splits",
    body: "RidePod calculates each participant's share based on the final verified fare.",
    icon: CircleDollarSign,
  },
  {
    title: "Host protection",
    body: "Hosts can book with more confidence once required participants are authorized.",
    icon: UsersRound,
  },
  {
    title: "Safety modes",
    body: "Pods can support options like Women-only, Verified-only, Community-only, High-trust-only, and Invite-only.",
    icon: Sparkles,
  },
];

const timelineSteps = [
  {
    title: "Create or join a pod",
    body: "Choose a planned route, time, safety mode, seats, estimated fare, and approved max fare.",
    icon: MapPinned,
  },
  {
    title: "Lock your seat",
    body: "Participants authorize their max charge. A seat is confirmed only after payment authorization.",
    icon: LockKeyhole,
  },
  {
    title: "Group locks",
    body: "Once required participants are authorized, the pod becomes locked and chat/pickup details can unlock.",
    icon: UsersRound,
  },
  {
    title: "Host checks the fare",
    body: "The host uploads a live quote screenshot from Uber, Lyft, DiDi, taxi, or another external ride app.",
    icon: ClipboardCheck,
  },
  {
    title: "Host can book",
    body: "Protected booking unlocks only when required participants are authorized and the quote is within the approved max.",
    icon: CheckCircle2,
  },
  {
    title: "Ride happens",
    body: "The group rides together using the external ride booked by the host.",
    icon: CalendarClock,
  },
  {
    title: "Host uploads receipt",
    body: "After the ride, the host uploads the final receipt.",
    icon: ReceiptText,
  },
  {
    title: "RidePod settles fairly",
    body: "RidePod verifies the receipt, calculates the final split, charges or adjusts riders, and marks host reimbursement.",
    icon: CircleDollarSign,
  },
  {
    title: "Stay protected in-app",
    body: "Payments, key ride updates, and receipt settlement stay inside RidePod. Off-app payments are not protected.",
    icon: ShieldCheck,
  },
];

const faqItems = [
  {
    question: "What is RidePod?",
    answer:
      "RidePod helps users coordinate planned shared ride pods, lock seats, and split ride costs fairly. RidePod does not provide drivers. The host books the external ride through a third-party ride app, taxi, or similar provider.",
  },
  {
    question: "Is RidePod a ride-hailing company?",
    answer:
      "No. RidePod does not provide drivers or operate the ride. RidePod helps users organize planned ride pods and manage the protected payment, coordination, and settlement flow.",
  },
  {
    question: "Who books the actual ride?",
    answer:
      "The host books the external ride through Uber, Lyft, DiDi, taxi, private van, or another provider. RidePod helps confirm that participants are payment-authorized before protected booking.",
  },
  {
    question: "When is my seat confirmed?",
    answer:
      "Your seat is confirmed only after payment authorization. Before that, you may be interested or requested, but you are not fully confirmed.",
  },
  {
    question: "What is max charge?",
    answer:
      "Your max charge is the most you can be charged for that pod unless you approve a higher fare. If the verified final receipt is lower, your final charge can be lower.",
  },
  {
    question: "Can the host book before everyone confirms?",
    answer:
      "The host can preview the fare early, but protected booking unlocks only after the required participants authorize payment and the quote is within the approved max.",
  },
  {
    question: "Why does the host upload a quote screenshot?",
    answer:
      "The quote screenshot helps RidePod check whether the expected fare is within the approved max before the host books. The final settlement still uses the verified final receipt.",
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
      "The pod can stay active in Host Replacement Mode. Confirmed participants can stay together, and an eligible participant may become the replacement host. A replacement host must upload a fresh quote before protected booking unlocks.",
  },
  {
    question: "What happens if I cancel or no-show?",
    answer:
      "Before the pod locks, cancellation is usually simple. After the host books, a cancellation or no-show may still be billable if your seat is not replaced. This helps protect the group from ghosting.",
  },
  {
    question: "What are Women-only pods?",
    answer:
      "Women-only pods are designed for safer matching. Eligible female users can join based on profile and verification settings. RidePod does not guarantee safety; report concerns immediately.",
  },
  {
    question: "What are Verified-only, Community-only, High-trust-only, and Invite-only pods?",
    answer:
      "These are trust settings that help hosts control who can join a pod. For example, a pod may be limited to verified users, people from the same community, users with strong trust history, or invited members only.",
  },
  {
    question: "Why should I keep payment inside RidePod?",
    answer:
      "Off-app payments are not protected. RidePod cannot help with refunds, max-charge disputes, receipt verification, or host reimbursement if payment happens outside the app.",
  },
  {
    question: "Can I pay with Venmo, Zelle, PayPal, or cash?",
    answer:
      "Direct payments outside RidePod are not protected. To keep your seat, max charge, receipt settlement, and dispute support protected, keep payment inside RidePod.",
  },
  {
    question: "Does RidePod guarantee safety?",
    answer:
      "No. RidePod provides tools designed for safer matching, payment protection, trust rules, and reporting. These tools help reduce risk, but they do not guarantee safety.",
  },
  {
    question: "Does RidePod guarantee a refund?",
    answer:
      "No. Refunds or adjustments depend on the pod state, receipt verification, cancellation timing, no-show rules, and dispute review.",
  },
  {
    question: "When does chat unlock?",
    answer:
      "Chat unlocks after your seat is payment-authorized. Exact pickup details may also unlock only after seat lock.",
  },
  {
    question: "What if the receipt cannot be verified?",
    answer:
      "RidePod may request more information, hold settlement, or route the case to review. Host reimbursement may be delayed or denied if the receipt is missing, incorrect, or suspicious.",
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
              and manage the protected payment and settlement flow. The host books the actual ride
              externally.
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
    <InfoPageLayout>
      <PageIntro
        eyebrow="How RidePod Works"
        title="One planned pod, clear steps, protected settlement."
        body="Each RidePod ride has its own payment lock, host quote check, final receipt, and fair split. The host books the external ride, while RidePod keeps the coordination and money rules visible."
      />
      <Timeline />
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-[var(--rp-primary)]" />
          <div>
            <h2 className="text-lg font-black text-[var(--rp-text)]">
              Off-app payments are not protected.
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              Payments, key ride updates, and receipt settlement stay inside RidePod so the group
              can use max-charge rules, receipt verification, and dispute support.
            </p>
          </div>
        </div>
      </Card>
    </InfoPageLayout>
  );
}

export function RidePodFaqPage() {
  return (
    <InfoPageLayout>
      <PageIntro
        eyebrow="FAQ"
        title="Straight answers for riders and hosts."
        body="RidePod is built around planned shared rides, seat locks, max-charge protection, verified receipts, and fair split settlement."
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
            Locked seats. Protected payments. Fair splits.
          </p>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[var(--rp-muted)] sm:text-base">
            RidePod helps people form planned shared ride pods, lock seats, coordinate pickup, and
            split costs fairly. The host books the external ride through Uber, Lyft, DiDi, taxi,
            private van, or another ride app. RidePod helps protect the group with payment
            authorization, max-charge rules, receipt-based settlement, and trust tools.
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
        <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Keep the pod protected.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Off-app payments are not protected. RidePod cannot help with refunds, max-charge disputes,
          receipt verification, or host reimbursement if payment happens outside the app.
        </p>
      </Card>
    </section>
  );
}

function Timeline() {
  return (
    <section className="grid gap-3">
      {timelineSteps.map(({ title, body, icon: Icon }, index) => (
        <div key={title} className="grid grid-cols-[44px_1fr] gap-3">
          <div className="relative grid justify-items-center">
            <span className="z-10 grid h-11 w-11 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card)] text-[var(--rp-primary)] shadow-[var(--rp-shadow-soft)]">
              <Icon className="h-5 w-5" />
            </span>
            {index < timelineSteps.length - 1 ? (
              <span className="absolute bottom-[-18px] top-11 w-px bg-[var(--rp-border-strong)]" />
            ) : null}
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
                Step {index + 1}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-black text-[var(--rp-text)]">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">{body}</p>
          </Card>
        </div>
      ))}
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
