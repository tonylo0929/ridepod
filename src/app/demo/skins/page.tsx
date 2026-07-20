import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, EyeOff, ShieldCheck } from "lucide-react";
import { CompactSkinGallery, SkinDisclosure } from "@/components/whisperlink/skin-surface";
import { WhisperPageShell } from "@/components/whisperlink/states";
import { demoRoom } from "@/lib/whisperlink";

export const metadata: Metadata = {
  title: "Privacy Skin Gallery | WhisperLink",
  description: "All WhisperLink privacy skins shown in realistic device and browser frames.",
};

export default function DemoSkinsPage() {
  return (
    <WhisperPageShell eyebrow="Privacy skin gallery">
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#cfe2da] bg-white px-3 py-2 text-xs font-black text-[#0e6b57]">
              <EyeOff className="h-4 w-4" />
              Screen Privacy Mode
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-[#14201c] sm:text-5xl">
              All skins, same original conversation.
            </h1>
            <p className="mt-4 max-w-2xl text-left text-base font-medium leading-7 text-[#5c6864]">
              Switch between compact previews. Each view is visually distinct, generic, and display-only.
            </p>
          </div>
          <div className="rounded-lg border border-[#dce8e3] bg-white p-4 shadow-[0_20px_70px_rgba(16,24,40,0.08)]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0e6b57]" />
              <p className="text-left text-sm font-semibold leading-6 text-[#5c6864]">
                Privacy skins change display only. They do not rewrite messages or create alternate records.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-2xl">
          <SkinDisclosure skin="default" />
        </div>

        <div className="mt-10">
          <CompactSkinGallery room={demoRoom} />
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/demo/room"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0e6b57] px-5 text-sm font-black text-white"
          >
            Open active room <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#c8d8d1] bg-white px-5 text-sm font-black text-[#14201c]"
          >
            Back to flow
          </Link>
        </div>
      </section>
    </WhisperPageShell>
  );
}
