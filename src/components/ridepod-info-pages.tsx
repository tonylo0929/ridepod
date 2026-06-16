"use client";

import {
  CarFront,
  CheckCircle2,
  HelpCircle,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Badge, Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { SupportRidePodCard } from "@/components/support-ridepod-card";

const faqItems = [
  {
    question: "Does RidePod provide drivers?",
    answer:
      "No. RidePod helps riders coordinate shared taxi pods. Taxi partners are external licensed providers.",
  },
  {
    question: "What is a shared taxi pod?",
    answer:
      "A shared taxi pod is a planned ride where riders going in a similar direction join first, then request one shared taxi partner quote.",
  },
  {
    question: "When do guests accept the quote?",
    answer:
      "Guests accept after a taxi partner sends the selected quote. The ride proceeds only after the required guests accept.",
  },
  {
    question: "When do I pay?",
    answer:
      "RidePod does not charge live payments in this version. Future payment handling would require guests to review and accept the selected taxi quote first.",
  },
  {
    question: "Can I cancel?",
    answer:
      "You can leave before accepting a taxi quote. After all required guests accept the quote, free cancellation may no longer be available and cancellation may require review.",
  },
  {
    question: "What if not everyone accepts the quote?",
    answer:
      "If not all required guests accept before the quote deadline, the quote may expire and the organizer may request another quote.",
  },
  {
    question: "Can riders propose extra stops?",
    answer:
      "Only if the pod allows stop requests. A proposed stop must be approved by the host before it affects the route or taxi partner quote.",
  },
  {
    question: "Can I choose who joins?",
    answer:
      "Yes. Pods may use options such as Open pod, Women-only pod, Verified-only, or Invite-only. These control rider eligibility only.",
  },
  {
    question: "Does Women-only guarantee a female taxi driver?",
    answer:
      "No. Women-only controls who can join the pod. It does not guarantee a female taxi driver.",
  },
  {
    question: "Can I choose a taxi type?",
    answer:
      "Yes. Taxi type and luggage capacity are requested before the quote, but final support depends on taxi partner availability.",
  },
  {
    question: "Is airport mode supported?",
    answer:
      "Airport rides can include terminal, luggage, and pickup/dropoff details. Flight status sync is not live in this version.",
  },
  {
    question: "How do recurring rides work?",
    answer:
      "Recurring pods repeat on selected days. Each ride has its own quote, guest acceptance, and review state.",
  },
  {
    question: "What happens if there is an issue?",
    answer:
      "Users can report an issue. RidePod may review the case manually.",
  },
  {
    question: "Can taxi partners sign up?",
    answer:
      "Taxi partners can submit interest for manual review. Partner tools are not enabled automatically.",
  },
  {
    question: "Do normal riders need to upload ID?",
    answer:
      "No. RidePod does not collect ID documents during normal rider registration.",
  },
];

export function AboutRidePodPage() {
  const [activeTab, setActiveTab] = useState<"about" | "faq" | "how">("about");

  if (activeTab === "faq") {
    return (
      <InfoPageLayout>
        <AboutTopNav activeTab={activeTab} onChange={setActiveTab} />
        <FaqContent />
      </InfoPageLayout>
    );
  }

  if (activeTab === "how") {
    return (
      <InfoPageLayout>
        <AboutTopNav activeTab={activeTab} onChange={setActiveTab} />
        <AboutHowItWorksContent />
      </InfoPageLayout>
    );
  }

  const whatRidePodDoes = [
    "Create or join a shared ride pod.",
    "See who has joined and who still needs to act.",
    "Use Taxi mode for taxi partner quote review.",
    "Use Ride app mode for self-settle coordination.",
    "Keep ride details, confirmations, and chat status in one place.",
  ];
  const taxiModeSteps = [
    "Host creates a Taxi pod.",
    "Riders join before the quote request.",
    "Taxi partner provides a shared quote.",
    "Riders review and accept.",
    "Taxi partner accepts the job.",
    "Taxi partner chat opens for pickup coordination.",
  ];
  const rideAppModeSteps = [
    "Host creates a Ride app pod.",
    "Riders join as interest / seat hold.",
    "Host shares fare estimate, split method, payment method, gather point, and confirm-by time.",
    "Riders confirm ride details.",
    "Chat unlocks after required riders confirm.",
    "Host or agreed booker books the ride app outside RidePod.",
  ];
  const taxiPartnerBullets = [
    "Provide shared taxi quote information.",
    "Support suitable service areas and ride types.",
    "Accept jobs only when ready to support the ride.",
    "Use chat for pickup coordination after the job is accepted.",
    "Partner access may be reviewed manually.",
  ];
  const whatRidePodDoesNotDo = [
    "RidePod does not provide drivers.",
    "RidePod does not dispatch taxis directly.",
    "RidePod does not book external ride apps for self-settle pods.",
    "RidePod does not verify external ride app screenshots.",
    "RidePod does not guarantee final fare, route, pickup, or refund outcome.",
    "Ride app self-settle fares are paid outside RidePod.",
  ];
  const trustBullets = [
    "Use display names and avatars instead of private contact details.",
    "Phone, email, ID status, admin notes, and safety reports are not shown publicly.",
    "Community-only pods can help groups coordinate with people from the same school, workplace, building, or community.",
    "Issue reporting and manual review can be used for unsafe or wrong-detail situations.",
  ];
  const currentVersionBullets = [
    "No live payment is charged.",
    "No real taxi dispatch is enabled.",
    "No real ride app booking is made by RidePod.",
    "No real payout is sent.",
    "Some countdowns and statuses may use demo/local state.",
  ];

  return (
    <InfoPageLayout>
      <AboutTopNav activeTab={activeTab} onChange={setActiveTab} />
      <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_18%,transparent),transparent_34%),linear-gradient(180deg,var(--rp-card),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)] sm:p-7">
        <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border-strong)]">
          Shared rides, clearer coordination.
        </Badge>
        <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight text-[var(--rp-text)] sm:text-5xl">
          About RidePod
        </h1>
        <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--rp-muted-strong)] sm:text-lg">
          RidePod helps people coordinate shared rides with clearer roles, safer expectations, and better group status.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <PrimaryButton href="/home" className="w-full whitespace-nowrap sm:w-auto">
            Search pods
          </PrimaryButton>
          <SecondaryButton href="/create" className="w-full whitespace-nowrap sm:w-auto">
            Create pod
          </SecondaryButton>
        </div>
      </section>

      <Card className="p-5">
        <UsersRound className="h-7 w-7 text-[var(--rp-primary)]" />
        <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">What RidePod does</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          RidePod helps riders form small shared ride pods, review the ride details, and coordinate what needs to happen before the ride.
        </p>
        <div className="mt-4 grid gap-2">
          {whatRidePodDoes.map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
              <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{item}</p>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-3">
        <ContentHeading eyebrow="Two ways to use RidePod" title="Choose the mode that fits the group" />
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="border-[color-mix(in_srgb,var(--rp-primary)_58%,var(--rp-border))] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--rp-primary)_14%,transparent),transparent_44%),var(--rp-card)] p-5">
            <Badge className="bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)] ring-[color-mix(in_srgb,var(--rp-primary)_38%,var(--rp-border))]">
              Taxi Partner Quote
            </Badge>
            <CarFront className="mt-5 h-8 w-8 text-[var(--rp-primary)]" />
            <h2 className="mt-4 text-2xl font-black text-[var(--rp-text)]">Taxi mode</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              Riders form a pod first. A taxi partner can provide one shared quote. Riders review and accept the quote before the ride proceeds.
            </p>
            <SecondaryButton href="#taxi-mode" className="mt-4 w-full whitespace-nowrap sm:w-auto">
              Learn about Taxi mode
            </SecondaryButton>
          </Card>
          <Card className="border-cyan-300/30 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.13),transparent_44%),var(--rp-card)] p-5">
            <Badge className="bg-cyan-300/10 text-cyan-100 ring-cyan-300/25">
              Self-settle
            </Badge>
            <Smartphone className="mt-5 h-8 w-8 text-cyan-200" />
            <h2 className="mt-4 text-2xl font-black text-[var(--rp-text)]">Ride app mode</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              Host and riders coordinate an external ride app booking. The ride app fare is paid outside RidePod by the group.
            </p>
            <SecondaryButton href="#ride-app-mode" className="mt-4 w-full whitespace-nowrap sm:w-auto">
              Learn about Ride app mode
            </SecondaryButton>
          </Card>
        </div>
      </section>

      <section id="taxi-mode" className="grid gap-3 scroll-mt-28">
        <ContentHeading eyebrow="Taxi mode" title="For shared taxi pods with taxi partner quote review" />
        <Card className="border-[color-mix(in_srgb,var(--rp-primary)_42%,var(--rp-border))] p-5">
          <p className="text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            In Taxi mode, riders form a pod and wait for a taxi partner quote. Riders can review the total quote, estimated share, RidePod fee, and quote deadline before accepting.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {taxiModeSteps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-sm font-black text-[var(--rp-primary)]">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            {[
              "Taxi partner quote is separate from the RidePod fee.",
              "Stop requests close once the taxi quote request starts.",
              "Taxi partner chat opens only after riders accept and the taxi partner accepts the job.",
            ].map((note) => (
              <p key={note} className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-black leading-6 text-[var(--rp-text)]">
                {note}
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section id="ride-app-mode" className="grid gap-3 scroll-mt-28">
        <ContentHeading eyebrow="Ride app mode" title="For self-settle ride app coordination" />
        <Card className="border-cyan-300/25 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.12),transparent_38%),var(--rp-card)] p-5">
          <p className="text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            In Ride app mode, RidePod helps the group coordinate, but the external ride app booking and ride fare happen outside RidePod.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {rideAppModeSteps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-2xl border border-cyan-300/16 bg-cyan-300/8 p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-300/12 text-sm font-black text-cyan-100">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            {[
              "Ride fare is paid outside RidePod.",
              "RidePod does not verify ride app fare.",
              "Fare screenshots are optional context only.",
              "RidePod does not verify ride app screenshots.",
              "No fare protection is provided for self-settle Ride app pods.",
            ].map((note) => (
              <p key={note} className="rounded-2xl border border-cyan-300/16 bg-cyan-300/8 px-4 py-3 text-sm font-black leading-6 text-cyan-50">
                {note}
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-3">
        <ContentHeading eyebrow="Taxi Partners" title="For licensed taxi drivers or service partners" />
        <Card className="border-[color-mix(in_srgb,var(--rp-primary)_28%,var(--rp-border))] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--rp-primary)_12%,transparent),transparent_34%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.1),transparent_34%),var(--rp-card)] p-5">
          <ReceiptText className="h-8 w-8 text-[var(--rp-primary)]" />
          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            Taxi Partners can review eligible Taxi pods, provide quote information, and accept jobs when available.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {taxiPartnerBullets.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
                <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-cyan-300/18 bg-cyan-300/8 px-4 py-3 text-sm font-black leading-6 text-cyan-50">
            Partner verification is manual during this version. Do not upload ID documents in this version.
          </p>
          <PrimaryButton href="/taxi-partner" className="mt-4 w-full whitespace-nowrap sm:w-auto">
            Apply as Taxi Partner
          </PrimaryButton>
        </Card>
      </section>

      <section className="grid gap-3">
        <ContentHeading eyebrow="What RidePod does not do" title="Clear boundaries" />
        <Card className="p-5">
          <div className="grid gap-3">
            {whatRidePodDoesNotDo.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rp-primary)]" />
                <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-[var(--rp-primary)]/25 bg-[var(--rp-primary)]/10 px-4 py-3 text-sm font-black leading-6 text-[var(--rp-primary)]">
            In this version, no live payment, real payout, real taxi dispatch, or real ride app booking is enabled.
          </p>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="p-5">
          <ShieldCheck className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Trust and privacy</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            RidePod is designed to make shared ride coordination clearer without exposing unnecessary private details.
          </p>
          <div className="mt-4 grid gap-2">
            {trustBullets.map((item) => (
              <p key={item} className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {item}
              </p>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <Sparkles className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Current version</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            RidePod is currently focused on testing the shared ride coordination flow.
          </p>
          <div className="mt-4 grid gap-2">
            {currentVersionBullets.map((item) => (
              <p key={item} className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {item}
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-3">
        <ContentHeading eyebrow="Ready when your group is" title="Start with the right RidePod flow" />
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-5">
            <UsersRound className="h-7 w-7 text-[var(--rp-primary)]" />
            <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Find a ride pod</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">Browse Taxi and Ride app pods.</p>
            <PrimaryButton href="/home" className="mt-4 w-full whitespace-nowrap">
              Search pods
            </PrimaryButton>
          </Card>
          <Card className="p-5">
            <CarFront className="h-7 w-7 text-[var(--rp-primary)]" />
            <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Create a pod</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">Start a Taxi or Ride app self-settle pod.</p>
            <SecondaryButton href="/create" className="mt-4 w-full whitespace-nowrap">
              Create pod
            </SecondaryButton>
          </Card>
          <Card className="p-5">
            <ReceiptText className="h-7 w-7 text-[var(--rp-primary)]" />
            <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Become a Taxi Partner</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">Tell us what taxi services you can support.</p>
            <SecondaryButton href="/taxi-partner" className="mt-4 w-full whitespace-nowrap">
              Apply as Taxi Partner
            </SecondaryButton>
          </Card>
        </div>
      </section>
    </InfoPageLayout>
  );
}

export function HowRidePodWorksPage() {
  const mainFlowSteps = [
    {
      title: "Create or join a pod",
      body: "Choose route, time, taxi type, luggage, and who can join.",
      icon: UsersRound,
    },
    {
      title: "Riders lock seats",
      body: "Guests join the pod before the taxi partner quote is requested.",
      icon: LockKeyhole,
    },
    {
      title: "Taxi partner quote",
      body: "A licensed taxi partner reviews the route and sends one shared quote.",
      icon: ReceiptText,
    },
    {
      title: "Guests accept quote",
      body: "Guests review the selected quote and accept before the ride proceeds.",
      icon: CheckCircle2,
    },
    {
      title: "Pickup and review",
      body: "After acceptance, pickup details are shown. Each ride has its own review and issue flow.",
      icon: ShieldCheck,
    },
  ];
  const rideTypes = [
    {
      title: "Airport rides",
      body: "For airport trips with luggage, terminal, and pickup/dropoff details.",
      icon: CarFront,
    },
    {
      title: "One-off rides",
      body: "For single shared taxi trips.",
      icon: UsersRound,
    },
    {
      title: "Recurring rides",
      body: "For repeated routes, such as weekly commutes. Each ride has its own quote and review state.",
      icon: ReceiptText,
    },
  ];

  return (
    <InfoPageLayout>
      <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_18%,transparent),transparent_34%),linear-gradient(180deg,var(--rp-card),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)] sm:p-7">
        <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border-strong)]">
          Taxi-first
        </Badge>
        <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight text-[var(--rp-text)] sm:text-5xl">
          How RidePod works
        </h1>
        <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--rp-muted-strong)] sm:text-lg">
          Create or join shared taxi pods, get one taxi partner quote, and ride together with clear steps.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <PrimaryButton
            href="/create"
            className="w-full whitespace-nowrap border border-[var(--rp-primary)] bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] text-[#07111a] shadow-[0_14px_30px_rgba(242,193,91,0.24)] sm:w-auto"
          >
            Create taxi pod
          </PrimaryButton>
          <SecondaryButton href="/home" className="w-full whitespace-nowrap sm:w-auto">
            Search rides
          </SecondaryButton>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="p-5">
          <CarFront className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Taxi-first shared rides</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            RidePod helps groups coordinate shared taxi pods. Riders join first, then the pod requests one shared quote from a licensed taxi partner.
          </p>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">RidePod does not provide drivers</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            RidePod is a coordination platform. Taxi partners are external licensed providers.
          </p>
        </Card>
      </section>

      <section className="grid gap-3">
        <ContentHeading eyebrow="Main flow" title="From pod to pickup" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {mainFlowSteps.map(({ title, body, icon: Icon }, index) => (
            <Card key={title} className="relative p-4">
              <span className="grid h-9 w-9 place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--rp-primary)_46%,var(--rp-border))] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-sm font-black text-[var(--rp-primary)]">
                {index + 1}
              </span>
              <Icon className="mt-5 h-6 w-6 text-[var(--rp-primary)]" />
              <h3 className="mt-3 text-base font-black leading-tight text-[var(--rp-text)]">{title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <ContentHeading eyebrow="Ride types" title="Choose the taxi pod format" />
        <div className="grid gap-3 md:grid-cols-3">
          {rideTypes.map(({ title, body, icon: Icon }) => (
            <Card key={title} className="p-5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-black text-[var(--rp-text)]">{title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-[color-mix(in_srgb,var(--rp-primary)_55%,var(--rp-border))] bg-[color-mix(in_srgb,var(--rp-primary)_8%,var(--rp-card))] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <ReceiptText className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-black text-[var(--rp-text)]">Important note</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              RidePod does not charge live payments or send real payouts in this version.
            </p>
          </div>
        </div>
      </Card>

      <section className="grid gap-3 rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)] sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">Ready to start</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--rp-text)]">Find your next shared taxi pod.</h2>
        </div>
        <div className="grid gap-3 sm:flex">
          <PrimaryButton
            href="/create"
            className="w-full whitespace-nowrap border border-[var(--rp-primary)] bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] text-[#07111a] shadow-[0_14px_30px_rgba(242,193,91,0.24)] sm:w-auto"
          >
            Create taxi pod
          </PrimaryButton>
          <SecondaryButton href="/home" className="w-full whitespace-nowrap sm:w-auto">
            Search rides
          </SecondaryButton>
        </div>
      </section>
    </InfoPageLayout>
  );
}

export function RidePodFaqPage() {
  return (
    <InfoPageLayout>
      <FaqContent />
    </InfoPageLayout>
  );
}

export function SupportRidePodPage() {
  return (
    <InfoPageLayout>
      <SupportRidePodCard />
    </InfoPageLayout>
  );
}

function AboutTopNav({
  activeTab,
  onChange,
}: {
  activeTab: "about" | "faq" | "how";
  onChange: (tab: "about" | "faq" | "how") => void;
}) {
  const tabs: Array<{ id: "about" | "faq" | "how"; label: string }> = [
    { id: "about", label: "About" },
    { id: "faq", label: "FAQ" },
    { id: "how", label: "How it works" },
  ];

  return (
    <nav className="sticky top-[76px] z-20 -mx-1 flex gap-2 overflow-x-auto rounded-[22px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] p-1 shadow-[var(--rp-shadow-soft)] backdrop-blur-xl lg:top-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`min-h-11 flex-1 whitespace-nowrap rounded-[18px] px-4 text-sm font-black transition ${
            activeTab === tab.id
              ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
              : "text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)] hover:text-[var(--rp-text)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function AboutHowItWorksContent() {
  const [mode, setMode] = useState<"taxi" | "ride_app">("taxi");
  const isTaxi = mode === "taxi";
  const steps = isTaxi
    ? [
        ["Create or join", "Pick route, time, taxi type, luggage, and pod rules."],
        ["Partner quote", "A taxi partner reviews the group trip and sends one shared quote."],
        ["Accept and ride", "Guests review the quote, accept it, then meet for pickup."],
      ]
    : [
        ["Create or join", "Use RidePod to coordinate people, route, time, and chat."],
        ["Self-settle", "The ride app booking and ride fare are handled outside RidePod."],
        ["Confirm details", "Use the group to confirm pickup, split, and who books the ride."],
      ];

  return (
    <>
      <PageIntro
        eyebrow="How it works"
        title={isTaxi ? "Taxi protected quote flow" : "Ride app self-settle flow"}
        body={
          isTaxi
            ? "Taxi pods use partner quote review before the group rides together."
            : "Ride app pods are coordination-only. The ride fare is paid separately by the group."
        }
      />

      <div className="grid grid-cols-2 gap-2 rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-1.5">
        {[
          { id: "taxi" as const, label: "Taxi", icon: CarFront },
          { id: "ride_app" as const, label: "Ride app", icon: Smartphone },
        ].map(({ id, label, icon: Icon }) => {
          const active = mode === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition ${
                active
                  ? id === "taxi"
                    ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                    : "bg-cyan-300 text-[#06212a]"
                  : "text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {steps.map(([title, body], index) => (
          <Card key={title} className="p-5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-sm font-black text-[var(--rp-primary)]">
              {index + 1}
            </span>
            <h2 className="mt-4 text-lg font-black text-[var(--rp-text)]">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">{body}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

function FaqContent() {
  return (
    <>
      <PageIntro
        eyebrow="FAQ"
        title="FAQ"
        body="Common questions about RidePod shared taxi pods."
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
      <section className="rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
          Ready to start
        </p>
        <h2 className="mt-2 text-2xl font-black text-[var(--rp-text)]">Create your next shared taxi pod.</h2>
        <PrimaryButton href="/create" className="mt-4 w-full sm:w-auto">
          Create taxi pod
        </PrimaryButton>
      </section>
    </>
  );
}

function InfoPageLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid w-full max-w-4xl gap-5">{children}</div>;
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
