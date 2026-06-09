import Link from "next/link";
import { SettlementPage as SettlementExperience } from "@/components/settlement-page";
import { getPod, getHostedPods } from "@/lib/mock-data";

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ pod?: string }>;
}) {
  const { pod: podId } = await searchParams;
  const pod = (podId ? getPod(podId) : undefined) ?? getHostedPods()[0];

  if (!pod) {
    return (
      <section className="mx-auto grid min-h-[52vh] max-w-xl place-items-center px-4">
        <div className="w-full rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-6 text-center shadow-[var(--rp-shadow-soft)]">
          <h1 className="text-2xl font-black text-[var(--rp-primary)]">No pods yet</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Add a test pod first, then settlement details will appear here.
          </p>
          <Link
            href="/create"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] px-5 text-base font-black text-[var(--rp-primary-text)]"
          >
            Create test pod
          </Link>
        </div>
      </section>
    );
  }

  return <SettlementExperience pod={pod} />;
}
