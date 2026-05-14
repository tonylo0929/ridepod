import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { designVariantSlugs, designVariants } from "@/lib/design-variants";
import { RidePodLogo } from "@/components/ridepod-logo";

export default function DesignsIndexPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] px-5 py-8 text-zinc-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="flex items-center gap-3">
          <div>
            <RidePodLogo className="h-8" priority />
            <p className="text-xs font-semibold text-zinc-500">Design variations</p>
          </div>
        </Link>

        <section className="py-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Compare visual directions
          </p>
          <h1 className="mt-3 max-w-3xl text-5xl font-black leading-tight tracking-tight">
            Five high-fidelity RidePod design concepts.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600">
            Each route includes home/feed, pod detail, create pod, join confirmation, host dashboard, and profile/trust screens using the same mock ride pod data.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {designVariantSlugs.map((slug) => {
            const variant = designVariants[slug];
            return (
              <Link
                key={slug}
                href={`/designs/${slug}`}
                className={`group rounded-2xl border p-5 transition hover:-translate-y-1 ${variant.panel} ${variant.border} ${variant.shadow}`}
              >
                <div className={`grid h-12 w-12 place-items-center ${variant.radius} ${variant.accent}`}>
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <h2 className={`mt-5 text-2xl font-black ${variant.text}`}>{variant.name}</h2>
                <p className={`mt-2 text-sm font-bold ${variant.accentText}`}>{variant.bestFor}</p>
                <p className={`mt-3 text-sm leading-6 ${variant.muted}`}>{variant.tone}</p>
                <div className={`mt-5 inline-flex items-center gap-2 text-sm font-black ${variant.accentText}`}>
                  View concept <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
