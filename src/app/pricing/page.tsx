import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Timer } from "lucide-react";
import { WhisperPageShell } from "@/components/whisperlink/states";
import { cn } from "@/lib/cn";
import { durationOptions } from "@/lib/whisperlink";

export const metadata: Metadata = {
  title: "Pricing | WhisperLink",
  description: "Choose a WhisperLink room duration.",
};

export default function PricingPage() {
  return (
    <WhisperPageShell eyebrow="Pricing">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
        <div className="rounded-lg border border-[#dce8e3] bg-white p-5 shadow-[0_24px_80px_rgba(16,24,40,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#cfe2da] bg-[#edf8f3] px-3 py-2 text-xs font-black text-[#0e6b57]">
                <Timer className="h-4 w-4" />
                Auto-expiring rooms
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-[#14201c] sm:text-4xl">
                Pay for the room length you need.
              </h1>
              <p className="mt-2 max-w-2xl text-left text-sm font-medium leading-6 text-[#5c6864] sm:text-base sm:leading-7">
                Every room has a clear expiry time.
              </p>
            </div>
            <Link href="/create" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0e6b57] px-5 text-sm font-black text-white">
              Create room <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {durationOptions.map((option) => (
              <article
                key={option.id}
                className={cn(
                  "rounded-lg border p-5",
                  option.id === "7d" ? "border-[#0e6b57] bg-[#edf8f3]" : "border-[#dce8e3] bg-[#f8fbfa]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black text-[#0e6b57]">{option.name}</p>
                  {option.id === "7d" ? <span className="rounded-md bg-white px-2 py-1 text-[11px] font-black text-[#0e6b57]">Recommended</span> : null}
                </div>
                <p className="mt-4 text-4xl font-black text-[#14201c]">{option.price}</p>
                <p className="mt-1 text-xs font-black text-[#66736e]">{option.label}</p>
                <p className="mt-4 text-sm font-medium leading-6 text-[#5c6864]">{option.helper}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </WhisperPageShell>
  );
}
