"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock3,
  CreditCard,
  Link2,
  LockKeyhole,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { WhisperMark } from "@/components/whisperlink/brand";
import { BottomNav, MobileScreen, PrimaryCTA, SoftIcon, StatusBar } from "@/components/whisperlink/mobile-ui";
import { cn } from "@/lib/cn";
import {
  buildRoomFromFlow,
  defaultRoomSettings,
  durationOptions,
  generatedRoomLink,
  saveStoredRoom,
  type RoomDuration,
} from "@/lib/whisperlink";

type FlowStep = "duration" | "settings" | "payment" | "success" | "join" | "pricing" | "setup" | "share";
type CanonicalStep = "duration" | "settings" | "review" | "success";

const stepLabels: Array<{ id: CanonicalStep; label: string }> = [
  { id: "duration", label: "Duration" },
  { id: "settings", label: "Settings" },
  { id: "review", label: "Review" },
];

const durationCopy: Record<RoomDuration, { headline: string; sub: string; icon: typeof Clock3 }> = {
  "1h": { headline: "1 Hour", sub: "Quick Room", icon: TimerReset },
  "24h": { headline: "24 Hours", sub: "Day Room", icon: Calendar },
  "7d": { headline: "7 Days", sub: "Week Room", icon: Calendar },
  "30d": { headline: "30 Days", sub: "Month Room", icon: Calendar },
};

function canonicalStep(step: FlowStep): CanonicalStep {
  if (step === "payment") return "review";
  if (step === "success" || step === "share" || step === "join") return "success";
  if (step === "settings" || step === "setup") return "settings";
  return "duration";
}

export function WhisperFlowPage({ step }: { step: FlowStep }) {
  const router = useRouter();
  const activeStep = canonicalStep(step);
  const [selectedDuration, setSelectedDuration] = useState<RoomDuration>("1h");

  function continueFromDuration() {
    const room = buildRoomFromFlow(selectedDuration, {
      ...defaultRoomSettings,
      title: "Design Sync",
      passcodeEnabled: true,
    });
    saveStoredRoom(room);
    router.push("/create/settings");
  }

  return (
    <MobileScreen withBottomInset={activeStep === "duration"}>
      <StatusBar />
      <div className="px-6 pb-28 pt-3">
        <CreateTopBar />
        <Stepper active={activeStep} />

        {activeStep === "duration" ? (
          <DurationScreen selected={selectedDuration} onSelect={setSelectedDuration} onContinue={continueFromDuration} />
        ) : null}

        {activeStep === "settings" ? (
          <SimpleStep
            icon={<LockKeyhole className="h-6 w-6" />}
            title="Room settings"
            body="Passcode protection, message expiry, privacy skin, and export controls are ready for this room."
            primaryHref="/create/payment"
            primaryLabel="Continue to review"
            secondaryHref="/create"
          />
        ) : null}

        {activeStep === "review" ? (
          <SimpleStep
            icon={<CreditCard className="h-6 w-6" />}
            title="Review room"
            body="Quick Room, $0.99, passcode enabled, room expiry on, and exports off by default."
            primaryHref="/create/success"
            primaryLabel="Create private link"
            secondaryHref="/create/settings"
          />
        ) : null}

        {activeStep === "success" ? (
          <SimpleStep
            icon={<Link2 className="h-6 w-6" />}
            title="Private link ready"
            body={generatedRoomLink}
            primaryHref="/demo/room"
            primaryLabel="Open active room"
            secondaryHref="/create/payment"
            code
          />
        ) : null}
      </div>
      <BottomNav active="create" />
    </MobileScreen>
  );
}

function CreateTopBar() {
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
      <Link
        href="/"
        aria-label="Back to home"
        className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#101815] shadow-[0_8px_22px_rgba(16,24,40,0.08)] ring-1 ring-[#e4ebe7]"
      >
        <ArrowLeft className="h-6 w-6" />
      </Link>
      <div className="flex items-center justify-center gap-3">
        <WhisperMark className="h-12 w-12" />
        <h1 className="text-[28px] font-extrabold text-[#101815]">Create Room</h1>
      </div>
      <span />
    </header>
  );
}

function Stepper({ active }: { active: CanonicalStep }) {
  const activeIndex = stepLabels.findIndex((step) => step.id === active);

  return (
    <div className="mt-8">
      <div className="grid grid-cols-[1fr_72px_1fr_72px_1fr] items-center">
        {stepLabels.map((step, index) => {
          const isActive = activeIndex === index;
          const isDone = activeIndex > index;
          return (
            <div key={step.id} className="contents">
              <div className="grid place-items-center gap-2">
                <span
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-full border text-lg font-bold",
                    isActive || isDone ? "border-[#087356] bg-[#087356] text-white" : "border-[#d9e3de] bg-white text-[#101815]",
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" /> : index + 1}
                </span>
                <span className="text-sm font-semibold text-[#101815]">{step.label}</span>
              </div>
              {index < stepLabels.length - 1 ? <div className="mb-7 h-px bg-[#d9e3de]" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DurationScreen({
  selected,
  onSelect,
  onContinue,
}: {
  selected: RoomDuration;
  onSelect: (duration: RoomDuration) => void;
  onContinue: () => void;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-[29px] font-extrabold leading-tight text-[#101815]">Choose room duration</h2>
      <p className="mt-2 text-[17px] font-medium text-[#4d5a55]">Recommended options with clear pricing.</p>

      <div className="mt-8 grid gap-4">
        {durationOptions.map((option) => {
          const copy = durationCopy[option.id];
          const Icon = copy.icon;
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={cn(
                "relative flex min-h-[106px] items-center gap-5 rounded-[18px] border bg-white p-5 text-left shadow-[0_12px_28px_rgba(16,24,40,0.07)]",
                isSelected ? "border-[#0b9b70] bg-[#f1fbf7]" : "border-[#e4ebe7]",
              )}
            >
              {option.id === "1h" ? (
                <span className="absolute -top-4 right-3 rounded-full bg-[#087356] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_18px_rgba(8,115,86,0.18)]">
                  Most popular
                </span>
              ) : null}
              <SoftIcon>
                <Icon className="h-7 w-7" />
              </SoftIcon>
              <span className="min-w-0 flex-1">
                <span className="block text-[26px] font-extrabold leading-none text-[#101815]">{copy.headline}</span>
                <span className="mt-2 block text-[17px] font-medium text-[#4d5a55]">{copy.sub}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-[28px] font-extrabold text-[#101815]">{option.price}</span>
                {isSelected ? (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#087356] text-white">
                    <Check className="h-5 w-5" />
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4 rounded-[18px] border border-[#d4eee5] bg-[#f0fbf6] p-4">
        <SoftIcon className="bg-[#dff7ef]">
          <ShieldCheck className="h-7 w-7" />
        </SoftIcon>
        <div>
          <h3 className="text-[18px] font-extrabold text-[#101815]">All rooms auto-expire</h3>
          <p className="mt-1 text-[15px] font-medium text-[#4d5a55]">You control how long the link stays active.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 inline-flex min-h-[66px] w-full items-center justify-center gap-4 rounded-[18px] bg-[#007a55] px-5 text-[23px] font-extrabold text-white shadow-[0_16px_32px_rgba(0,122,85,0.24)]"
      >
        Continue <ArrowRight className="h-7 w-7" />
      </button>
      <p className="mt-5 flex items-center justify-center gap-2 text-[13px] font-medium text-[#6b7772]">
        <LockKeyhole className="h-4 w-4" />
        Secure, private, and encrypted in transit
      </p>
    </section>
  );
}

function SimpleStep({
  icon,
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  code,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  code?: boolean;
}) {
  return (
    <section className="mt-10 rounded-[24px] border border-[#e4ebe7] bg-white p-6 shadow-[0_14px_34px_rgba(16,24,40,0.08)]">
      <SoftIcon>{icon}</SoftIcon>
      <h2 className="mt-5 text-[29px] font-extrabold leading-tight text-[#101815]">{title}</h2>
      <p className={cn("mt-3 text-[16px] font-medium leading-7 text-[#4d5a55]", code && "break-all font-mono text-sm")}>{body}</p>
      <div className="mt-7 grid gap-3">
        <PrimaryCTA href={primaryHref} icon={<ArrowRight className="h-6 w-6" />}>
          {primaryLabel}
        </PrimaryCTA>
        <Link
          href={secondaryHref}
          className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[#d9e3de] bg-white text-[16px] font-bold text-[#101815]"
        >
          Back
        </Link>
      </div>
    </section>
  );
}
