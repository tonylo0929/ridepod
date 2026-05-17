import Link from "next/link";
import {
  Building2,
  CarFront,
  Landmark,
  UserRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import { RidePodHeroBackground } from "@/components/ridepod-background";

const premiumPods = [
  {
    route: "USC \u2192 LAX",
    time: "Tue, May 14 \u2022 7:30 AM",
    seats: "3 / 4 seats",
    status: "Locked",
    price: "$18.50",
    priceLabel: "per person",
    href: "/pods/usc-lax-001",
    icon: CarFront,
  },
  {
    route: "Downtown \u2192 Airport",
    time: "Next Tue, May 21 \u2022 8:00 AM",
    seats: "2 / 4 seats",
    status: "Forming",
    price: "$22.00",
    priceLabel: "per person",
    href: "/pods/concert-oak-118/join",
    icon: Landmark,
  },
  {
    route: "Apartment \u2192 Office District",
    time: "Weekdays \u2022 8:15 AM",
    seats: "2 / 4 seats",
    status: "Locked",
    price: "$7.75",
    priceLabel: "per person",
    href: "/pods/campus-commute-442/join",
    icon: Building2,
  },
];

function PremiumIconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)] shadow-[0_0_24px_rgba(0,124,137,0.12)]">
      <div className="absolute inset-1 rounded-full border border-[var(--rp-border-strong)]" />
      {children}
    </div>
  );
}

function SearchFilterBar() {
  const fields = [
    ["From", "From"],
    ["To", "To"],
    ["Type", "One-off / Recurring"],
    ["Date", "May 14"],
    ["Time", "Anytime"],
  ];

  return (
    <div className="relative mt-7 overflow-hidden rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] shadow-[var(--rp-shadow-soft)] backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_46%)]" />
      <div className="relative grid grid-cols-2 sm:grid-cols-5">
        {fields.map(([label, value], index) => (
          <div
            key={label}
            className={cn(
              "min-w-0 px-3 py-4 sm:px-4",
              index > 0 && "sm:border-l sm:border-[var(--rp-border)]",
              index > 1 && "border-t border-[var(--rp-border)] sm:border-t-0",
            )}
          >
            <p className="truncate text-xs font-medium text-[var(--rp-muted)]">{label}</p>
            <p className="mt-2 truncate text-[15px] font-semibold text-[var(--rp-text)] sm:text-base">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const locked = status === "Locked";
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-4 text-sm font-medium",
        locked
          ? "border-emerald-300/20 bg-[var(--rp-success-bg)] text-[var(--rp-success)]"
          : "border-amber-300/20 bg-[var(--rp-warning-bg)] text-[var(--rp-warning)]",
      )}
    >
      {status}
    </span>
  );
}

function RidePodCard({
  pod,
}: {
  pod: (typeof premiumPods)[number];
}) {
  const Icon = pod.icon;

  return (
    <article className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex gap-4">
        <PremiumIconBadge>
          <Icon className="h-6 w-6" />
        </PremiumIconBadge>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[19px] font-black leading-tight tracking-tight text-[var(--rp-text)] sm:text-xl">
                {pod.route}
              </h2>
              <p className="mt-1 text-[15px] font-medium text-[var(--rp-muted-strong)]">{pod.time}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xl font-black text-[var(--rp-text)]">{pod.price}</p>
              <p className="mt-1 text-xs font-medium text-[var(--rp-muted)]">{pod.priceLabel}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-[var(--rp-text)]">
              <UserRound className="h-4 w-4 shrink-0 text-[var(--rp-muted)]" />
              <span className="truncate">{pod.seats}</span>
            </div>
            <StatusBadge status={pod.status} />
            <Link
              href={pod.href}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[var(--rp-gradient-primary)] px-6 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_10px_24px_rgba(0,124,137,0.22)] transition hover:brightness-105"
            >
              Join
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-[calc(100vh-1.25rem)] overflow-hidden pb-2">
      <RidePodHeroBackground className="h-[270px]" priority />

      <section className="relative mt-8">
        <h1 className="max-w-[330px] text-[42px] font-black leading-[1.08] tracking-[-0.02em] text-[var(--rp-text)] sm:max-w-none sm:text-5xl">
          Split the ride.
          <br />
          Not the risk.
        </h1>
        <p className="mt-4 text-lg font-medium text-[var(--rp-muted-strong)]">
          Locked seats. Protected payments. Fair splits.
        </p>
        <SearchFilterBar />
      </section>

      <section className="relative mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-[var(--rp-text)]">Curated ride pods</h2>
          <Link href="/pods" className="text-sm font-bold text-[var(--rp-primary)]">
            View all
          </Link>
        </div>

        <div className="grid gap-3">
          {premiumPods.map((pod) => (
            <RidePodCard key={pod.route} pod={pod} />
          ))}
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-36 bg-[linear-gradient(180deg,transparent,var(--rp-bg))] opacity-80 lg:hidden" />
    </div>
  );
}
