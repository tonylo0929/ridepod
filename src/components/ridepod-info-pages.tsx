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
    "Helps riders create and join shared taxi pods",
    "Helps groups choose taxi type, luggage needs, and who can join",
    "Helps taxi partners review route and luggage details before quoting",
    "Helps guests review and accept the selected quote",
    "Helps keep ride updates and pod chat in one place",
  ];
  const whatRidePodDoesNotDo = [
    "RidePod does not provide drivers.",
    "RidePod is not a taxi operator.",
    "RidePod does not enable live payment in this version.",
    "RidePod does not send real payouts in this version.",
    "RidePod does not guarantee a specific taxi, driver, or route change.",
  ];

  return (
    <InfoPageLayout>
      <AboutTopNav activeTab={activeTab} onChange={setActiveTab} />
      <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_18%,transparent),transparent_34%),linear-gradient(180deg,var(--rp-card),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)] sm:p-7">
        <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border-strong)]">
          RidePod
        </Badge>
        <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight text-[var(--rp-text)] sm:text-5xl">
          About RidePod
        </h1>
        <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[var(--rp-muted-strong)] sm:text-lg">
          RidePod helps people coordinate shared taxi rides with clearer route, quote, and review steps.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <PrimaryButton href="/home" className="w-full whitespace-nowrap sm:w-auto">
            Search rides
          </PrimaryButton>
        </div>
      </section>

      <Card className="p-5">
        <CarFront className="h-7 w-7 text-[var(--rp-primary)]" />
        <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Why RidePod exists</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Many people want to share taxi rides, especially for airport trips, events, school routes, and recurring commutes. RidePod helps riders form a group first, then request one shared taxi partner quote.
        </p>
      </Card>

      <SupportRidePodCard compact />

      <section className="grid gap-3">
        <ContentHeading eyebrow="What RidePod does" title="Tools for shared taxi pods" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {whatRidePodDoes.map((item) => (
            <Card key={item} className="p-4">
              <CheckCircle2 className="h-6 w-6 text-[var(--rp-primary)]" />
              <p className="mt-4 text-sm font-black leading-6 text-[var(--rp-text)]">{item}</p>
            </Card>
          ))}
        </div>
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
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="p-5">
          <Sparkles className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Our focus</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            RidePod is currently focused on testing whether riders understand and trust the Taxi-first shared pod flow. The product prioritizes clarity, route planning, quote acceptance, pod chat, and manual review states.
          </p>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="h-7 w-7 text-[var(--rp-primary)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Safety and privacy</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            Public profiles should only show limited information. Private details such as phone, email, gender identity, ID status, admin notes, and safety reports should not be shown publicly.
          </p>
        </Card>
      </section>

      <Card className="p-5">
        <ReceiptText className="h-7 w-7 text-[var(--rp-primary)]" />
        <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">Taxi partners</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Taxi partners are external licensed providers. Taxi partner applications are reviewed manually before partner tools are enabled.
        </p>
      </Card>

      <section className="grid gap-3 rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)] sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
            Ready when your group is
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--rp-text)]">
            Start with a shared taxi pod.
          </h2>
        </div>
        <div className="grid gap-3 sm:flex">
          <PrimaryButton href="/home" className="w-full whitespace-nowrap sm:w-auto">
            Search rides
          </PrimaryButton>
          <SecondaryButton href="/create" className="w-full whitespace-nowrap sm:w-auto">
            Create taxi pod
          </SecondaryButton>
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
