"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  MapPin,
  MoreHorizontal,
  Plane,
  Share2,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";
import { RidePodLogo } from "@/components/ridepod-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui";

type RoutePoint = {
  title: string;
  subtitle: string;
  time: string;
};

type InviteRoute = {
  fromLabel: string;
  toLabel: string;
  pickup: RoutePoint;
  dropoff: RoutePoint;
  stops: RoutePoint[];
};

const invite = {
  route: {
    fromLabel: "USC",
    toLabel: "LAX",
    pickup: {
      title: "USC - Leavey Library",
      subtitle: "Rideshare pickup zone",
      time: "7:30 AM",
    },
    dropoff: {
      title: "LAX - Terminal 1",
      subtitle: "Departures level",
      time: "~8:45 AM",
    },
    stops: [],
  } satisfies InviteRoute,
  rideType: "Express ride",
  capacity: "4 seats max",
  date: "Tue, May 14",
  time: "7:30 AM",
  seatsFilled: "3 / 4",
  estimatedShare: "$18.50",
  maxCharge: "$24.50",
  host: "Maya Chen",
  hostRating: "4.9",
  hostSince: "RidePod host since 2023",
  hostPods: "28 successful pods",
  membersJoined: 3,
};

export default function PublicPodInvitePage() {
  const [saved, setSaved] = useState(false);

  return (
    <main className="min-h-screen bg-[var(--rp-gradient-app)] px-4 py-5 text-[var(--rp-text)]">
      <div className="mx-auto grid w-full max-w-[430px] gap-4 pb-6 min-[760px]:max-w-4xl">
        <PublicInviteTopBar />
        <InviteHero />
        <InviteQuickFacts />
        <div className="grid gap-4 min-[760px]:grid-cols-[minmax(0,1fr)_340px] min-[760px]:items-start">
          <div className="grid gap-4">
            <RoutePreviewCard route={invite.route} />
            <HostTrustCard />
            <ProtectionBadges />
          </div>
          <div className="grid gap-4">
            <InvitePriceCard />
            <JoinedMembersCard />
            <InviteCTA saved={saved} onToggleSaved={() => setSaved((value) => !value)} />
          </div>
        </div>
      </div>
    </main>
  );
}

function PublicInviteTopBar() {
  return (
    <header className="grid grid-cols-[54px_1fr_116px] items-center border-b border-[var(--rp-border)] pb-4">
      <span className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-3 text-xs font-black text-[var(--rp-primary)]">
        <ShieldCheck className="mr-1.5 h-4 w-4" />
        Safe
      </span>
      <Link href="/home" className="justify-self-center" aria-label="RidePod home">
        <RidePodLogo className="h-9" priority />
      </Link>
      <div className="flex justify-self-end gap-2">
        <ThemeToggle compact />
        <button
          type="button"
          aria-label="Share invite"
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]"
        >
          <Share2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="More invite options"
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function InviteHero() {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_22%,transparent),transparent_42%),var(--rp-card)] p-5 shadow-[0_24px_60px_color-mix(in_srgb,var(--rp-primary)_22%,transparent)]">
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full bg-[var(--rp-card-muted)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
          You&apos;ve been invited to join
        </span>
        <span className="grid h-[52px] w-[52px] place-items-center rounded-[20px] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]">
          <CarFront className="h-7 w-7" />
        </span>
      </div>
      <div className="mt-8">
        <p className="text-[42px] font-black leading-none tracking-normal text-[var(--rp-text)]">
          {invite.route.fromLabel} <span className="text-[var(--rp-primary)]">&rarr;</span>{" "}
          {invite.route.toLabel}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge label={invite.rideType} />
          <StatusBadge label={invite.capacity} muted />
        </div>
      </div>
    </section>
  );
}

function InviteQuickFacts() {
  const facts = [
    { label: invite.date, value: invite.time, icon: CalendarDays },
    { label: "Seats filled", value: invite.seatsFilled, icon: UsersRound },
    { label: "Est. per person", value: invite.estimatedShare, icon: CreditCard },
  ];

  return (
    <section className="grid grid-cols-3 gap-2">
      {facts.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 shadow-[var(--rp-shadow-soft)]">
          <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
          <p className="mt-3 text-xs font-bold leading-4 text-[var(--rp-muted)]">{label}</p>
          <p className="mt-1 text-base font-black text-[var(--rp-text)]">{value}</p>
        </div>
      ))}
    </section>
  );
}

function RoutePreviewCard({ route }: { route: InviteRoute }) {
  const points = [route.pickup, ...route.stops, route.dropoff];

  return (
    <InviteCard>
      <CardTitle title="Route details" icon={MapPin} />
      <div className="mt-5 grid gap-4">
        {points.map((point, index) => {
          const isLast = index === points.length - 1;

          return (
            <div key={`${point.title}-${point.time}`} className="grid grid-cols-[30px_1fr_auto] gap-3">
              <div className="relative flex justify-center">
                <span
                  className={cn(
                    "mt-1 grid h-7 w-7 place-items-center rounded-full border-2",
                    isLast
                      ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                      : "border-[var(--rp-primary)] bg-[var(--rp-card)] text-[var(--rp-primary)]",
                  )}
                >
                  {isLast ? <Plane className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                </span>
                {!isLast ? (
                  <span className="absolute bottom-[-26px] top-9 w-px bg-[var(--rp-border-strong)]" />
                ) : null}
              </div>
              <div>
                <p className="text-base font-black text-[var(--rp-text)]">{point.title}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">{point.subtitle}</p>
              </div>
              <p className="pt-1 text-sm font-black text-[var(--rp-primary)]">{point.time}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
        <p className="text-sm font-black text-[var(--rp-text)]">Direct route</p>
        <div className="mt-4 flex items-center gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[var(--rp-primary)]" />
          <span className="h-1 flex-1 rounded-full bg-[var(--rp-border-strong)]" />
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--rp-primary)] text-[var(--rp-primary-text)]">
            <Plane className="h-4 w-4" />
          </span>
        </div>
      </div>
    </InviteCard>
  );
}

function HostTrustCard() {
  return (
    <InviteCard>
      <button type="button" className="grid w-full grid-cols-[58px_1fr_20px] items-center gap-3 text-left">
        <Avatar initials="MC" />
        <span>
          <span className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Hosted by</span>
          <span className="mt-1 block text-xl font-black text-[var(--rp-text)]">{invite.host}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--rp-muted)]">
            <Star className="h-4 w-4 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
            {invite.hostRating} rating
            <span aria-hidden="true">/</span>
            {invite.hostPods}
          </span>
          <span className="mt-1 block text-sm font-semibold text-[var(--rp-muted)]">{invite.hostSince}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-[var(--rp-primary)]" />
      </button>
      <div className="mt-4">
        <StatusBadge label="Verified trusted host" />
      </div>
    </InviteCard>
  );
}

function ProtectionBadges() {
  const items = [
    ["Payment protected", "Your max charge is authorized before the host books externally."],
    ["Confirmed members only", "All members are verified."],
    ["No cash or pay-later", "Off-app payments are not protected."],
  ];

  return (
    <InviteCard>
      <CardTitle title="RidePod protects every ride" icon={ShieldCheck} />
      <div className="mt-4 grid gap-3">
        {items.map(([title, body]) => (
          <div key={title} className="flex gap-3 rounded-[18px] bg-[var(--rp-card-soft)] p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rp-success)]" />
            <div>
              <p className="text-sm font-black text-[var(--rp-text)]">{title}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </InviteCard>
  );
}

function InvitePriceCard() {
  return (
    <InviteCard>
      <CardTitle title="Price clarity" icon={CreditCard} />
      <div className="mt-4 grid gap-3">
        <PriceRow label="Est. per person" value={invite.estimatedShare} strong />
        <PriceRow label="Max charge" value={invite.maxCharge} />
      </div>
      <p className="mt-4 rounded-[18px] bg-[var(--rp-card-soft)] p-3 text-sm font-black text-[var(--rp-muted-strong)]">
        You will never pay more than your approved max unless you approve a higher fare.
      </p>
    </InviteCard>
  );
}

function JoinedMembersCard() {
  return (
    <InviteCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">{invite.membersJoined} members already joined</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">You&apos;ll ride with great company.</p>
        </div>
        <AvatarStack />
      </div>
    </InviteCard>
  );
}

function InviteCTA({ saved, onToggleSaved }: { saved: boolean; onToggleSaved: () => void }) {
  return (
    <section className="grid gap-3 rounded-[24px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] p-4 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl">
      <Link
        href="/pods/usc-lax-001/join"
        className="flex min-h-14 items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_16px_36px_color-mix(in_srgb,var(--rp-primary)_28%,transparent)]"
      >
        Join this pod
      </Link>
      <button
        type="button"
        onClick={onToggleSaved}
        className="flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-border-strong)] text-sm font-black text-[var(--rp-primary)]"
      >
        {saved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        {saved ? "Saved" : "Save for later"}
      </button>
      <p className="text-center text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
        Secure / Trusted / Covered by RidePod
      </p>
    </section>
  );
}

function InviteCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      {children}
    </section>
  );
}

function CardTitle({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
      <h2 className="text-lg font-black text-[var(--rp-text)]">{title}</h2>
    </div>
  );
}

function StatusBadge({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset",
        muted
          ? "bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] ring-[var(--rp-border)]"
          : "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]",
      )}
    >
      {label}
    </span>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)] ring-2 ring-[var(--rp-card)]">
      {initials}
    </span>
  );
}

function AvatarStack() {
  return (
    <div className="flex -space-x-3">
      {["MC", "AL", "PR"].map((initials) => (
        <Avatar key={initials} initials={initials} />
      ))}
    </div>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] bg-[var(--rp-card-soft)] p-3">
      <p className="text-sm font-bold text-[var(--rp-muted)]">{label}</p>
      <p className={cn("font-black text-[var(--rp-text)]", strong ? "text-2xl" : "text-lg")}>{value}</p>
    </div>
  );
}
