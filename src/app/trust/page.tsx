import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FileLock2,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { WhisperMark } from "@/components/whisperlink/brand";
import { BottomNav, MobileScreen, PrimaryCTA, SoftIcon, StatusBar } from "@/components/whisperlink/mobile-ui";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Trust & Limits | WhisperLink",
  description: "Clear privacy limits for WhisperLink private chat rooms.",
};

const trustItems = [
  {
    title: "No permanent records",
    body: "Messages are not stored.",
    icon: FileLock2,
  },
  {
    title: "End-to-end in transit",
    body: "Encrypted and secure.",
    icon: LockKeyhole,
  },
  {
    title: "Auto-expiring rooms",
    body: "Links and data expire automatically.",
    icon: Clock3,
  },
  {
    title: "Screenshot aware",
    body: "We can't stop screenshots. Share links with trust.",
    icon: ScanLine,
  },
];

const skinPreviews = [
  { name: "Forest", tone: "from-[#07835e] to-[#024b3c]", selected: true },
  { name: "Slate", tone: "from-[#2f4454] to-[#162532]" },
  { name: "Ocean", tone: "from-[#0d87a8] to-[#07506d]" },
  { name: "Midnight", tone: "from-[#111c2f] to-[#060b15]" },
];

export default function TrustPage() {
  return (
    <MobileScreen>
      <StatusBar />
      <div className="px-6 pb-32 pt-3">
        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
          <Link href="/" aria-label="Back to home" className="grid h-11 w-11 place-items-center rounded-full text-[#087356]">
            <ArrowLeft className="h-7 w-7" />
          </Link>
          <h1 className="text-center text-[26px] font-extrabold text-[#101815]">Trust & Limits</h1>
          <span />
        </header>

        <section className="relative mt-7 overflow-hidden rounded-[18px] border border-[#cfe6dd] bg-gradient-to-br from-[#f0fbf6] to-white p-7 shadow-[0_12px_30px_rgba(16,24,40,0.07)]">
          <div className="absolute -right-8 top-3 grid h-44 w-44 place-items-center rounded-full border border-[#d8eee6]">
            <div className="grid h-32 w-32 place-items-center rounded-full border border-[#d8eee6]">
              <div className="relative">
                <WhisperMark className="h-20 w-20" />
                <div className="absolute -bottom-4 right-0 grid h-12 w-12 place-items-center rounded-[16px] border border-[#cfe6dd] bg-[#effaf5] text-[#087356] shadow-sm">
                  <ShieldCheck className="h-7 w-7" />
                </div>
              </div>
            </div>
          </div>
          <div className="relative max-w-[245px]">
            <h2 className="font-serif text-[31px] font-bold leading-tight text-[#087356]">Built for privacy</h2>
            <p className="mt-5 text-[17px] font-medium leading-8 text-[#4d5a55]">
              WhisperLink never records or stores your messages. Rooms and links auto-expire.
            </p>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[18px] border border-[#e2e9e5] bg-white shadow-[0_12px_28px_rgba(16,24,40,0.07)]">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className={cn("flex items-center gap-5 p-5", index > 0 && "border-t border-[#e5ebe8]")}>
                <SoftIcon className="h-14 w-14">
                  <Icon className="h-7 w-7" />
                </SoftIcon>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[18px] font-extrabold text-[#101815]">{item.title}</h3>
                  <p className="mt-1 text-[15px] font-medium leading-6 text-[#4d5a55]">{item.body}</p>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0 text-[#5e6965]" />
              </article>
            );
          })}
        </section>

        <section className="mt-4 rounded-[18px] border border-[#e2e9e5] bg-white p-5 shadow-[0_12px_28px_rgba(16,24,40,0.07)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#101815]">Privacy skins</h2>
              <p className="mt-1 text-[15px] font-medium text-[#4d5a55]">Change the look, not the security.</p>
            </div>
            <Link href="/demo/skins" className="text-[15px] font-bold text-[#087356]">
              Preview
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-3">
            {skinPreviews.map((skin) => (
              <SkinPreview key={skin.name} {...skin} />
            ))}
          </div>
        </section>

        <PrimaryCTA href="/demo/skins" className="mt-6" icon={<ChevronRight className="h-7 w-7" />}>
          Learn more about privacy
        </PrimaryCTA>
      </div>
      <BottomNav active="settings" />
    </MobileScreen>
  );
}

function SkinPreview({
  name,
  tone,
  selected,
}: {
  name: string;
  tone: string;
  selected?: boolean;
}) {
  return (
    <article className="min-w-0">
      <div className={cn("rounded-[8px] bg-gradient-to-br p-2 shadow-sm", tone)}>
        <div className="mb-2 text-[5px] font-bold text-white">WhisperLink</div>
        <div className="grid gap-1.5">
          <div className="h-6 rounded-[5px] bg-white/22" />
          <div className="h-6 rounded-[5px] bg-white/18" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="h-3 w-3 rounded-full bg-white/20" />
          <span className="h-3 w-8 rounded-full bg-white/16" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <p className={cn("truncate text-[15px] font-medium", selected ? "font-bold text-[#087356]" : "text-[#303a35]")}>{name}</p>
        {selected ? (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#087356] text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
    </article>
  );
}
