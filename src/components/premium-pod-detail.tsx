import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Crown,
  Luggage,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/components/ui";
import { RidePodLogo } from "@/components/ridepod-logo";
import {
  MoneySafetyTimeline,
  PodChatSafetyPanel,
  PodDetailMoneyLockPanel,
} from "@/components/money-safety-ui";

const pod = {
  id: "usc-lax-001",
  route: "USC \u2192 LAX",
  type: "Scheduled pod",
  dateTime: "Tue, May 14 \u2022 7:30 AM",
  pickupHub: "USC Village rideshare zone",
  dropoffHub: "LAX Terminal 3 departures",
  vehicle: "UberXL or Taxi",
  timeFlexibility: "\u00b115 min",
  luggage: "1 bag per rider",
  estimatedFare: "$74.00",
  maxApprovedFare: "$90.00",
  estimatedShare: "$18.50",
  platformFee: "$2.00",
  seats: "3 / 4",
  status: "Locked",
  lockDeadline: "Mon, May 13 \u2022 8:00 PM",
  cancellationDeadline: "Mon, May 13 \u2022 6:00 PM",
};

const members = [
  {
    name: "Maya Chen",
    initials: "MC",
    role: "Host",
    paymentStatus: "Authorized",
    trustCue: "Verified host",
  },
  {
    name: "Jordan Lee",
    initials: "JL",
    role: "Backup",
    paymentStatus: "Authorized",
    trustCue: "Reliable backup",
  },
  {
    name: "Alex Kim",
    initials: "AK",
    role: "Member",
    paymentStatus: "Authorized",
    trustCue: "Payment protected",
  },
];

function PremiumCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[20px] border border-white/10 bg-[#0b1620]/92 shadow-[0_18px_45px_rgba(0,0,0,0.34)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function StatusBadge() {
  return (
    <span className="inline-flex h-7 items-center rounded-full border border-emerald-300/20 bg-emerald-500/18 px-3 text-xs font-bold text-[#b7f7c4]">
      {pod.status}
    </span>
  );
}

function GoldIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#f2c15b]/35 bg-[#f2c15b]/10 text-[#ffd36a]">
      {children}
    </div>
  );
}

function InitialAvatar({
  initials,
  gold,
}: {
  initials: string;
  gold?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full border text-xs font-black",
        gold
          ? "border-[#ffd36a]/70 bg-[#f2c15b] text-[#07111a]"
          : "border-white/10 bg-white/[0.08] text-white",
      )}
    >
      {initials}
    </div>
  );
}

export function PodHeroCard() {
  return (
    <PremiumCard className="relative overflow-hidden p-3.5">
      <div className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 rounded-full bg-[#f2c15b]/10 blur-2xl" />
      <div className="pointer-events-none absolute right-4 top-4 h-24 w-32 opacity-35">
        <div className="absolute left-8 top-0 h-20 w-14 rotate-[-34deg] rounded-[70%_20%_70%_20%] border border-[#e6a93a]/35" />
        <div className="absolute left-14 top-0 h-20 w-14 rotate-[34deg] rounded-[20%_70%_20%_70%] border border-[#e6a93a]/35" />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[25px] font-black leading-none tracking-[-0.02em] text-white">
            {pod.route}
          </h1>
          <p className="mt-1.5 text-[12px] font-semibold text-[#cbd5e1]">{pod.type}</p>
          <p className="mt-1 text-[12px] font-semibold text-white">{pod.dateTime}</p>
        </div>
        <StatusBadge />
      </div>
    </PremiumCard>
  );
}

function SummaryCell({
  label,
  value,
  note,
  accent,
  valueClassName,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: "gold" | "green";
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 p-2.5", className)}>
      <p className="text-[11px] font-bold text-[#aab3be]">{label}</p>
      <p
        className={cn(
          "mt-1 text-[16px] font-black leading-tight text-white",
          accent === "gold" && "text-[#ffd36a]",
          valueClassName ?? "truncate",
        )}
      >
        {value}
      </p>
      {note ? (
        <p className={cn("mt-1 truncate text-[11px] font-semibold", accent === "green" ? "text-[#b7f7c4]" : "text-[#cbd5e1]")}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function PodSummaryGrid() {
  return (
    <PremiumCard className="overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-[#f2c15b]/14 border-b border-[#f2c15b]/14">
        <SummaryCell label="Share" value={pod.estimatedShare} note="per person" accent="gold" />
        <SummaryCell label="Seats" value={pod.seats} note="1 seat left" accent="green" />
        <SummaryCell
          label="Vehicle"
          value={pod.vehicle}
          valueClassName="whitespace-normal text-[13px] leading-4"
        />
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#f2c15b]/14">
        <SummaryCell label="Est. fare" value={pod.estimatedFare} />
        <SummaryCell label="Max approved" value={pod.maxApprovedFare} />
        <SummaryCell label="Fee" value={pod.platformFee} />
      </div>
    </PremiumCard>
  );
}

function DetailItem({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex gap-3 border-b border-white/10 px-3.5 py-2.5 last:border-b-0">
      <div className={cn("mt-1", danger ? "text-[#f59e0b]" : "text-[#ffd36a]")}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[#aab3be]">{label}</p>
        <p className="mt-0.5 text-[13px] font-bold leading-5 text-white">{value}</p>
      </div>
    </div>
  );
}

export function RouteDetailsCard() {
  return (
    <PremiumCard className="overflow-hidden">
      <DetailItem icon={<MapPin className="h-5 w-5" />} label="Pickup hub" value={pod.pickupHub} />
      <DetailItem icon={<MapPin className="h-5 w-5" />} label="Dropoff hub" value={pod.dropoffHub} />
      <DetailItem icon={<CalendarClock className="h-5 w-5" />} label="Lock by" value={pod.lockDeadline} />
      <DetailItem
        icon={<XCircle className="h-5 w-5" />}
        label="Cancel by"
        value={pod.cancellationDeadline}
        danger
      />
      <DetailItem icon={<CarFront className="h-5 w-5" />} label="Time flexibility" value={pod.timeFlexibility} />
      <DetailItem icon={<Luggage className="h-5 w-5" />} label="Luggage" value={pod.luggage} />
    </PremiumCard>
  );
}

export function PaymentProtectionCard() {
  const items = [
    "Your max charge is authorized before the host books externally.",
    "No cash or pay-later.",
    "Host never has to chase people for money.",
  ];

  return (
    <PremiumCard className="p-4">
      <div className="flex gap-3">
        <GoldIcon>
          <ShieldCheck className="h-5 w-5" />
        </GoldIcon>
        <div>
          <h2 className="text-base font-black text-white">Payment protection</h2>
          <div className="mt-2 grid gap-2">
            {items.map((item) => (
              <p key={item} className="flex gap-2 text-[13px] leading-5 text-[#d7dee8]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#b7f7c4]" />
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </PremiumCard>
  );
}

export function MembersCard() {
  return (
    <PremiumCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white">Host & members</h2>
          <p className="mt-1 text-sm font-medium text-[#aab3be]">Maya hosts. Jordan backs up.</p>
        </div>
        <div className="flex -space-x-2">
          {members.map((member, index) => (
            <InitialAvatar key={member.name} initials={member.initials} gold={index === 0} />
          ))}
          <div className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-[#ffd36a]/50 bg-[#07111a] text-xs font-black text-[#ffd36a]">
            +1
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {members.map((member, index) => (
          <div key={member.name} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.055] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <InitialAvatar initials={member.initials} gold={index === 0} />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{member.name}</p>
                <p className="text-xs font-medium text-[#aab3be]">{member.trustCue}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-flex rounded-full border border-[#ffd36a]/20 bg-[#ffd36a]/10 px-2.5 py-1 text-[11px] font-black text-[#ffd36a]">
                {member.role}
              </span>
              <p className="mt-1 text-[11px] font-bold text-[#b7f7c4]">{member.paymentStatus}</p>
            </div>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

export function RulesCard() {
  const rules = [
    "Cancel before the deadline may release your authorization when eligible.",
    "Cancel after lock and penalties may apply.",
    "If someone replaces your seat, you may receive credit.",
    "No cash or pay-later. Pay in app only.",
  ];

  return (
    <PremiumCard className="p-4">
      <h2 className="text-base font-black text-white">Rules</h2>
      <div className="mt-3 grid gap-2">
        {rules.map((rule) => (
          <p key={rule} className="flex gap-2 text-[13px] leading-5 text-[#d7dee8]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ffd36a]" />
            {rule}
          </p>
        ))}
      </div>
    </PremiumCard>
  );
}

export function StickyJoinCTA() {
  return (
    <div className="fixed inset-x-0 bottom-[88px] z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:bottom-0 lg:left-[18rem]">
      <div className="mx-auto max-w-[390px] rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-2.5 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl sm:max-w-[430px]">
        <Link
          href="/pods/usc-lax-001/join"
          className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)] shadow-[0_12px_32px_rgba(0,124,137,0.24)]"
        >
          Join this pod
        </Link>
        <p className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-[#d7dee8]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#ffd36a]" />
          1 seat left <span className="text-[#677484]">•</span> payment protected
        </p>
      </div>
    </div>
  );
}

export function PremiumPodDetailPage() {
  return (
    <div className="relative mx-auto max-w-[390px] pb-36 sm:max-w-[430px]">
      <header className="relative flex items-center justify-between pt-1">
        <Link
          href="/home"
          aria-label="Back to home"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 px-3 text-center">
          <RidePodLogo className="mx-auto h-5 justify-center" />
          <p className="truncate text-xs font-semibold text-[#aab3be]">{pod.route}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full text-[#ffd36a]">
          <Crown className="h-7 w-7" />
        </div>
      </header>

      <div className="mt-4 grid gap-3">
        <PodHeroCard />
        <PodSummaryGrid />
        <PodDetailMoneyLockPanel podId={pod.id} />
        <MoneySafetyTimeline podId={pod.id} />
        <RouteDetailsCard />
        <PaymentProtectionCard />
        <MembersCard />
        <PodChatSafetyPanel podId={pod.id} />
        <RulesCard />
      </div>

      <StickyJoinCTA />
    </div>
  );
}
