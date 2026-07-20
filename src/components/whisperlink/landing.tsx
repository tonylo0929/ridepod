import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Clock3,
  Crown,
  MoreHorizontal,
  PhoneOff,
  ShieldCheck,
  TimerReset,
  UserRound,
  UsersRound,
} from "lucide-react";
import { WhisperLogo } from "@/components/whisperlink/brand";
import { BottomNav, MobileScreen } from "@/components/whisperlink/mobile-ui";
import { cn } from "@/lib/cn";

const features = [
  { label: "No app install", icon: ShieldCheck },
  { label: "No phone number", icon: PhoneOff },
  { label: "Auto-expiring rooms", icon: TimerReset },
];

const rooms = [
  {
    title: "Design Sync",
    status: "Active now",
    people: "2 / 2",
    time: "16h 10m left",
    active: true,
  },
  {
    title: "Marketing Brief",
    status: "",
    people: "1 / 2",
    time: "7h left",
    active: false,
  },
  {
    title: "Client Review",
    status: "",
    people: "2 / 2",
    time: "Expired",
    expired: true,
  },
];

export function WhisperLanding() {
  return (
    <MobileScreen>
      <div className="px-6 pb-28 pt-5">
        <header className="flex items-center justify-between gap-3">
          <WhisperLogo markClassName="h-10 w-12" />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center gap-2 rounded-[16px] border border-[#f0d7c4] bg-[#fff3e8] px-4 text-sm font-bold text-[#a35a13]"
            >
              <Crown className="h-4 w-4 fill-current/20" />
              Pro
            </Link>
            <Link
              href="/trust"
              aria-label="Open trust and limits"
              className="grid h-11 w-11 place-items-center rounded-full border border-[#d9e3de] bg-white text-[#087356] shadow-sm"
            >
              <UserRound className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <Link
          href="/create"
          aria-label="Create private room"
          className="mt-6 block overflow-hidden rounded-[24px] shadow-[0_20px_44px_rgba(0,100,72,0.22)] ring-1 ring-[#0b5f4f]/20"
        >
          <Image
            src="/images/whisperlink-home-hero.png"
            alt="Private chat by link. No sign-ups. No numbers. Rooms auto-expire."
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="h-auto w-full"
          />
        </Link>

        <section className="mt-5 grid grid-cols-3 gap-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.label}
                className="grid min-h-[108px] place-items-center rounded-[18px] border border-[#e2e9e5] bg-white p-3 text-center shadow-[0_12px_28px_rgba(16,24,40,0.08)]"
              >
                <Icon className="h-8 w-8 text-[#087356]" />
                <p className="mt-3 text-[15px] font-semibold leading-5 text-[#101815]">{feature.label}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-extrabold text-[#101815]">My rooms</h2>
            <Link href="/demo/room" className="inline-flex items-center gap-2 text-[16px] font-semibold text-[#087356]">
              View all <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {rooms.map((room) => (
              <RoomCard key={room.title} {...room} />
            ))}
          </div>
        </section>
      </div>
      <BottomNav active="home" />
    </MobileScreen>
  );
}

function RoomCard({
  title,
  status,
  people,
  time,
  active,
  expired,
}: {
  title: string;
  status?: string;
  people: string;
  time: string;
  active?: boolean;
  expired?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[18px] border bg-white p-5 shadow-[0_12px_28px_rgba(16,24,40,0.06)]",
        active ? "border-[#cbe5dc] bg-[#f1fbf7]" : "border-[#e2e9e5]",
      )}
    >
      {active ? <div className="absolute inset-y-0 left-0 w-1.5 bg-[#087356]" /> : null}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {status ? (
            <p className="mb-2 inline-flex items-center gap-2 text-[14px] font-bold text-[#087356]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#21c786]" />
              {status}
            </p>
          ) : null}
          <h3 className="truncate text-[22px] font-extrabold text-[#101815]">{title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[15px] font-medium text-[#4d5a55]">
            <span className="inline-flex items-center gap-1.5">
              <UsersRound className="h-4 w-4" />
              {people}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {expired ? <Clock3 className="h-4 w-4" /> : <TimerReset className="h-4 w-4" />}
              {time}
            </span>
          </div>
        </div>
        {expired ? (
          <button
            type="button"
            aria-label="Room actions"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#101815]"
          >
            <MoreHorizontal className="h-6 w-6" />
          </button>
        ) : (
          <Link
            href="/demo/room"
            className={cn(
              "inline-flex min-h-12 shrink-0 items-center justify-center rounded-[14px] px-7 text-[17px] font-bold",
              active ? "bg-[#087356] text-white" : "bg-[#e7efec] text-[#101815]",
            )}
          >
            Open
          </Link>
        )}
      </div>
    </article>
  );
}
