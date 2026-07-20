"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  EyeOff,
  KeyRound,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { WhisperPageShell } from "@/components/whisperlink/states";
import { SkinIcon } from "@/components/whisperlink/skin-surface";
import {
  durationOptions,
  generatedRoomLink,
  messageExpiryOptions,
  privacySkins,
  type MessageExpiryMode,
  type PrivacySkinId,
  type RoomDuration,
} from "@/lib/whisperlink";

const steps = ["Duration", "Settings", "Confirm", "Link"];

const expiryOptions: Array<{ id: MessageExpiryMode; label: string; helper: string }> = messageExpiryOptions;

export function WhisperDemoFlow() {
  const [step, setStep] = useState(0);
  const [duration, setDuration] = useState<RoomDuration>("24h");
  const [privacySkin, setPrivacySkin] = useState<PrivacySkinId>("default");
  const [passcodeEnabled, setPasscodeEnabled] = useState(true);
  const [screenPrivacyMode, setScreenPrivacyMode] = useState(true);
  const [exportEnabled, setExportEnabled] = useState(false);
  const [messageExpiryMode, setMessageExpiryMode] = useState<MessageExpiryMode>("room_expiry");
  const [isPaying, setIsPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedDuration = durationOptions.find((option) => option.id === duration) ?? durationOptions[1];
  const selectedSkin = privacySkins.find((skin) => skin.id === privacySkin) ?? privacySkins[0];
  const demoLink = generatedRoomLink;

  function continueFromPayment() {
    setIsPaying(true);
    window.setTimeout(() => {
      setIsPaying(false);
      setStep(3);
    }, 850);
  }

  async function copyDemoLink() {
    setCopied(true);
    try {
      await navigator.clipboard?.writeText(demoLink);
    } catch {
      // Copy feedback still matters in local previews without clipboard permission.
    }
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <WhisperPageShell eyebrow="Founder demo path">
      <section className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-8 sm:py-10 lg:grid-cols-[360px_1fr] lg:gap-8 lg:px-10">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-[#dce8e3] bg-white p-4 shadow-[0_20px_70px_rgba(16,24,40,0.08)] sm:p-5">
            <p className="text-left text-xs font-black uppercase tracking-[0.18em] text-[#0e6b57]">Best possible flow</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[#14201c] sm:mt-3 sm:text-3xl">Create a private room.</h1>
            <p className="mt-3 hidden text-left text-sm font-medium leading-6 text-[#5c6864] sm:block">
              This route compresses the product flow for a founder pitch: duration, room setup, generated link, and direct room links.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2 sm:mt-6 sm:grid-cols-1 sm:gap-3">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    "grid place-items-center gap-1 rounded-lg border px-2 py-2 text-center transition sm:flex sm:gap-3 sm:px-3 sm:py-3 sm:text-left",
                    step === index
                      ? "border-[#0e6b57] bg-[#edf8f3] text-[#0e6b57]"
                      : "border-[#dce8e3] bg-[#f8fbfa] text-[#52615a] hover:bg-white",
                  )}
                >
                  <span className={cn(
                    "grid h-7 w-7 place-items-center rounded-md text-xs font-black",
                    step > index ? "bg-[#0e6b57] text-white" : "bg-white text-current ring-1 ring-inset ring-[#dce8e3]",
                  )}>
                    {step > index ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="text-[11px] font-black sm:text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {step === 0 ? (
            <Panel
              icon={<Timer className="h-5 w-5" />}
              title="Choose room duration"
              body="Pricing keeps the room duration and expiry decision visible."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {durationOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDuration(option.id)}
                    className={cn(
                      "rounded-lg border p-5 text-left transition",
                      duration === option.id
                        ? "border-[#0e6b57] bg-[#edf8f3] shadow-[0_18px_44px_rgba(14,107,87,0.12)]"
                        : "border-[#dce8e3] bg-white hover:border-[#b9cec5]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-[#0e6b57]">{option.name}</p>
                        <p className="mt-2 text-3xl font-black text-[#14201c]">{option.price}</p>
                      </div>
                      <span className="rounded-lg bg-[#f3f7f6] px-3 py-1 text-xs font-black text-[#40514b]">{option.label}</span>
                    </div>
                    <p className="mt-4 text-left text-sm font-medium leading-6 text-[#5c6864]">{option.helper}</p>
                  </button>
                ))}
              </div>
              <FooterAction onNext={() => setStep(1)} nextLabel="Continue to setup" />
            </Panel>
          ) : null}

          {step === 1 ? (
            <Panel
              icon={<LockKeyhole className="h-5 w-5" />}
              title="Set the room rules"
              body="The defaults are conservative: passcode on, screen privacy on, and exports off unless intentionally enabled."
            >
              <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
                <div className="grid gap-3">
                  <ToggleRow
                    icon={<KeyRound className="h-4 w-4" />}
                    title="Room passcode"
                    body="Ask the guest for a passcode before entering."
                    checked={passcodeEnabled}
                    onToggle={() => setPasscodeEnabled((value) => !value)}
                  />
                  <ToggleRow
                    icon={<EyeOff className="h-4 w-4" />}
                    title="Screen Privacy Mode"
                    body="Allow visual skins that make the screen less revealing in public."
                    checked={screenPrivacyMode}
                    onToggle={() => setScreenPrivacyMode((value) => !value)}
                  />
                  <ToggleRow
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title="Encrypted export option"
                    body="Only show export controls when the creator intentionally enables exports."
                    checked={exportEnabled}
                    onToggle={() => setExportEnabled((value) => !value)}
                  />
                </div>

                <div className="rounded-lg border border-[#dce8e3] bg-[#f8fbfa] p-4">
                  <p className="text-left text-sm font-black text-[#14201c]">Message expiry</p>
                  <div className="mt-3 grid gap-2">
                    {expiryOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMessageExpiryMode(option.id)}
                        className={cn(
                          "rounded-lg border px-3 py-3 text-left",
                          messageExpiryMode === option.id
                            ? "border-[#0e6b57] bg-white text-[#0e6b57]"
                            : "border-[#dce8e3] bg-white/70 text-[#52615a]",
                        )}
                      >
                        <p className="text-sm font-black">{option.label}</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-[#6a7771]">{option.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-[#dce8e3] bg-white p-4">
                <p className="text-left text-sm font-black text-[#14201c]">Starting skin</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {privacySkins.map((skin) => (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => setPrivacySkin(skin.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left",
                        privacySkin === skin.id
                          ? "border-[#0e6b57] bg-[#edf8f3] text-[#0e6b57]"
                          : "border-[#dce8e3] bg-[#f8fbfa] text-[#40514b]",
                      )}
                    >
                      <SkinIcon id={skin.id} className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-black">{skin.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <FooterAction onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="Review payment" />
            </Panel>
          ) : null}

          {step === 2 ? (
            <Panel
              icon={<CreditCard className="h-5 w-5" />}
              title="Confirm room"
              body="Review the room length, privacy defaults, and passcode before generating the private link."
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                <div className="rounded-lg border border-[#dce8e3] bg-white p-5">
                  <p className="text-left text-sm font-black text-[#14201c]">Order summary</p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <SummaryRow label="Duration" value={`${selectedDuration.name} - ${selectedDuration.label}`} />
                    <SummaryRow label="Price" value={selectedDuration.price} />
                    <SummaryRow label="Passcode" value={passcodeEnabled ? "Enabled" : "Off"} />
                    <SummaryRow label="Message expiry" value={expiryOptions.find((option) => option.id === messageExpiryMode)?.label ?? "Room expiry"} />
                    <SummaryRow label="Privacy skin" value={selectedSkin.name} />
                    <SummaryRow label="Exports" value={exportEnabled ? "Enabled by creator" : "Off by default"} />
                  </dl>
                </div>
                <div className="rounded-lg border border-[#dce8e3] bg-[#f8fbfa] p-5">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#dff7ef] text-[#0e6b57]">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-black text-[#14201c]">Room confirmation</h3>
                  <p className="mt-2 text-left text-sm font-medium leading-6 text-[#5c6864]">
                    The generated room link appears after confirmation.
                  </p>
                  <button
                    type="button"
                    onClick={continueFromPayment}
                    disabled={isPaying}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0e6b57] px-5 text-sm font-black text-white disabled:opacity-70"
                  >
                    {isPaying ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Creating private room
                      </>
                    ) : (
                      <>
                        Generate room link <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              <FooterAction onBack={() => setStep(1)} />
            </Panel>
          ) : null}

          {step === 3 ? (
            <Panel
              icon={<Link2 className="h-5 w-5" />}
              title="Private link generated"
              body="The creator copies the link and shares it manually. This demo opens directly into the active room."
            >
              <div className="rounded-lg border border-[#cfe2da] bg-[#edf8f3] p-4">
                <p className="text-left text-xs font-black uppercase tracking-[0.14em] text-[#0e6b57]">Room link</p>
                <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[#cfe2da] bg-white p-3 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 truncate font-mono text-sm font-bold text-[#14201c]">{demoLink}</code>
                  <button
                    type="button"
                    onClick={copyDemoLink}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#14201c] px-4 text-sm font-black text-white"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-3 text-left text-xs font-semibold leading-5 text-[#52615a]">
                  Demo passcode: <span className="font-black text-[#14201c]">link-2048</span>. Guests must consent before entering.
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <DemoRouteCard href="/demo/room" title="Open active room" body="Seeded messages, visible countdown, and live skin switching." />
                <DemoRouteCard href="/demo/skins" title="Open skin gallery" body="All six skins in realistic device and browser frames." />
                <DemoRouteCard href="/demo/expired" title="Open expired state" body="The room is closed with honest limitation copy." />
              </div>

              <div className="mt-5 rounded-lg border border-[#f0d8c9] bg-[#fff7ed] p-4">
                <p className="text-left text-sm font-black text-[#9a4d16]">Safety copy shown before join</p>
                <p className="mt-1 text-left text-sm font-semibold leading-6 text-[#72411c]">
                  Join only if you consent to this private 1:1 room. Screenshots and copied links cannot be technically prevented.
                </p>
              </div>
              <FooterAction onBack={() => setStep(2)} />
            </Panel>
          ) : null}
        </div>
      </section>
    </WhisperPageShell>
  );
}

function Panel({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#dce8e3] bg-white p-4 shadow-[0_24px_80px_rgba(16,24,40,0.1)] sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#dff7ef] text-[#0e6b57] sm:h-11 sm:w-11">{icon}</div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#14201c] sm:text-3xl">{title}</h2>
          <p className="mt-1 text-left text-xs font-medium leading-5 text-[#5c6864] sm:mt-2 sm:text-sm sm:leading-6">{body}</p>
        </div>
      </div>
      <div className="mt-5 sm:mt-6">{children}</div>
    </section>
  );
}

function FooterAction({
  onBack,
  onNext,
  nextLabel = "Continue",
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="sticky bottom-3 z-20 mt-6 flex flex-col-reverse gap-3 border-t border-[#e5eee9] bg-white/95 pt-4 backdrop-blur sm:static sm:flex-row sm:justify-between sm:bg-transparent sm:pt-5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#c8d8d1] bg-white px-5 text-sm font-black text-[#14201c]"
        >
          Back
        </button>
      ) : (
        <span />
      )}
      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0e6b57] px-5 text-sm font-black text-white"
        >
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  body,
  checked,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid gap-3 rounded-lg border border-[#dce8e3] bg-white p-4 text-left sm:grid-cols-[auto_1fr_auto] sm:items-center"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#f3f7f6] text-[#0e6b57]">{icon}</div>
      <div>
        <p className="text-sm font-black text-[#14201c]">{title}</p>
        <p className="mt-1 text-xs font-medium leading-5 text-[#5c6864]">{body}</p>
      </div>
      <span className={cn(
        "flex h-7 w-12 items-center rounded-full p-1 transition",
        checked ? "justify-end bg-[#0e6b57]" : "justify-start bg-[#d6e2dd]",
      )}>
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#edf2ef] pb-3 last:border-b-0 last:pb-0">
      <dt className="font-bold text-[#6a7771]">{label}</dt>
      <dd className="text-right font-black text-[#14201c]">{value}</dd>
    </div>
  );
}

function DemoRouteCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-[#dce8e3] bg-white p-4 transition hover:border-[#0e6b57] hover:shadow-[0_18px_44px_rgba(14,107,87,0.1)]">
      <div className="flex items-center justify-between gap-3">
        <MessageSquareText className="h-5 w-5 text-[#0e6b57]" />
        <ArrowRight className="h-4 w-4 text-[#8a9892] transition group-hover:translate-x-0.5 group-hover:text-[#0e6b57]" />
      </div>
      <p className="mt-4 text-left text-sm font-black text-[#14201c]">{title}</p>
      <p className="mt-2 text-left text-xs font-medium leading-5 text-[#5c6864]">{body}</p>
    </Link>
  );
}
