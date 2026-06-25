"use client";

import {
  Briefcase,
  CalendarDays,
  Clock3,
  Eye,
  MapPin,
  MessageCircle,
  Plane,
  Plus,
  Star,
  Sun,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/ui";

type RideBoardFilter = "near_me" | "airport" | "commute" | "leaving_soon";
type RideBoardStatus = "leaving_soon" | "open";

type RideBoardPost = {
  id: string;
  from: string;
  to: string;
  dateLabel: string;
  timeLabel: string;
  status: RideBoardStatus;
  hostName: string;
  hostRating: number;
  hostRideCount: number;
  interestedCount: number;
  note: string;
  tags: string[];
  actionLabel: string;
};

const rideBoardFilters: Array<{ id: RideBoardFilter; label: string; icon: LucideIcon }> = [
  { id: "near_me", label: "Near me", icon: MapPin },
  { id: "airport", label: "Airport", icon: Plane },
  { id: "commute", label: "Commute", icon: Briefcase },
  { id: "leaving_soon", label: "Leaving soon", icon: Clock3 },
];

const rideBoardPosts: RideBoardPost[] = [
  {
    id: "ride-call-shibuya-haneda",
    from: "Shibuya",
    to: "Haneda Airport",
    dateLabel: "Today",
    timeLabel: "6:00 PM",
    status: "leaving_soon",
    hostName: "trial_0",
    hostRating: 4.9,
    hostRideCount: 124,
    interestedCount: 3,
    note: "Looking for people heading to Terminal 3 tonight.",
    tags: ["Leaving soon"],
    actionLabel: "I'm interested",
  },
  {
    id: "ride-call-shinjuku-haneda",
    from: "Shinjuku",
    to: "Haneda Airport",
    dateLabel: "Today",
    timeLabel: "6:45 PM",
    status: "open",
    hostName: "maya_88",
    hostRating: 4.8,
    hostRideCount: 87,
    interestedCount: 2,
    note: "Heading to Haneda T3. Flexible on pickup near Shinjuku area.",
    tags: ["2 seats left"],
    actionLabel: "View details",
  },
];

const buildingHeights = [26, 44, 34, 56, 40, 68, 50, 60];

function getTagIcon(tag: string) {
  if (tag.toLowerCase().includes("soon")) return Clock3;
  if (tag.toLowerCase().includes("seat")) return UsersRound;
  return MapPin;
}

function CityRouteIllustration() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 h-full w-40 overflow-hidden rounded-r-[22px] opacity-95" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(242,193,91,0.06)_48%,rgba(242,193,91,0.16)_100%)]" />
      <svg className="absolute bottom-7 right-8 h-16 w-28 text-[var(--rp-primary)]" viewBox="0 0 130 72" fill="none">
        <path
          d="M6 60 C 34 44, 48 58, 72 32 C 88 16, 105 26, 122 10"
          stroke="currentColor"
          strokeDasharray="3 7"
          strokeLinecap="round"
          strokeWidth="2"
          opacity="0.75"
        />
      </svg>
      <MapPin className="absolute right-7 top-5 h-8 w-8 fill-[var(--rp-primary)] text-[var(--rp-primary)] drop-shadow-[0_0_14px_rgba(242,193,91,0.45)]" />
      <div className="absolute bottom-0 right-3 flex items-end gap-1.5">
        {buildingHeights.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className="relative w-3 rounded-t-sm border border-[rgba(242,193,91,0.18)] bg-[linear-gradient(180deg,rgba(242,193,91,0.34),rgba(242,193,91,0.08))] shadow-[0_0_18px_rgba(242,193,91,0.12)]"
            style={{ height }}
          >
            <span className="absolute inset-x-1 top-2 h-1 rounded-full bg-[rgba(255,211,106,0.7)]" />
            <span className="absolute inset-x-1 top-5 h-1 rounded-full bg-[rgba(255,211,106,0.45)]" />
          </span>
        ))}
      </div>
    </div>
  );
}

function RideBoardCard({ post }: { post: RideBoardPost }) {
  const ActionIcon = post.actionLabel === "View details" ? Eye : MessageCircle;

  return (
    <article className="relative overflow-hidden rounded-[16px] border border-[rgba(242,193,91,0.24)] bg-[linear-gradient(145deg,rgba(14,28,42,0.98),rgba(6,16,25,0.98))] p-2.5 shadow-[0_14px_32px_rgba(0,0,0,0.26)]">
      <span className="absolute bottom-3 left-2.5 top-3 w-1 rounded-full bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_48%,#d9912f_100%)] shadow-[0_0_12px_rgba(242,193,91,0.32)]" aria-hidden="true" />

      <div className="pl-3.5">
        <h2 className="min-w-0 text-[20px] font-black leading-[1.08] tracking-tight text-[var(--rp-text)] min-[390px]:text-[21px]">
          <span className="break-words">{post.from}</span>
          <span className="mx-1.5 inline-flex translate-y-0.5 text-[var(--rp-primary)]">-&gt;</span>
          <span className="break-words">{post.to}</span>
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2 text-[11px] font-bold text-[var(--rp-muted-strong)]">
            <CalendarDays className="h-3 w-3 text-[var(--rp-muted-strong)]" />
            {post.dateLabel}, {post.timeLabel}
          </span>
          {post.tags.map((tag) => {
            const TagIcon = getTagIcon(tag);
            const isGold = tag.toLowerCase().includes("soon");

            return (
              <span
                key={tag}
                className={cn(
                  "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-bold",
                  isGold
                    ? "border-[rgba(242,193,91,0.34)] bg-[rgba(242,193,91,0.1)] text-[var(--rp-primary)]"
                    : "border-white/10 bg-white/[0.06] text-[var(--rp-muted-strong)]",
                )}
              >
                <TagIcon className="h-3 w-3" />
                {tag}
              </span>
            );
          })}
        </div>

        <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgba(242,193,91,0.28)] bg-[rgba(242,193,91,0.1)] text-[var(--rp-primary)]">
              <UserRound className="h-5 w-5 fill-[rgba(242,193,91,0.52)]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-left text-[13px] font-black leading-4 text-[var(--rp-text)]">Host: {post.hostName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-left text-[11px] font-bold leading-4 text-[var(--rp-muted-strong)] min-[390px]:whitespace-nowrap">
                <Star className="h-3.5 w-3.5 shrink-0 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
                {post.hostRating.toFixed(1)} ({post.hostRideCount} rides)
              </p>
            </div>
          </div>
          <div className="rounded-[12px] border border-white/10 bg-white/[0.055] px-2 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-left text-xl font-black leading-none text-[var(--rp-primary)]">{post.interestedCount}</p>
            <p className="mt-0.5 text-left text-[8px] font-black uppercase tracking-[0.05em] text-[var(--rp-muted-strong)]">
              Interested
            </p>
          </div>
        </div>

        <p className="mt-2.5 rounded-[12px] border border-white/8 bg-[#06111d]/76 px-2.5 py-2 text-left text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
          {post.note}
        </p>

        <button
          type="button"
          className="mt-2.5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-[rgba(242,193,91,0.72)] bg-[linear-gradient(180deg,rgba(242,193,91,0.12),rgba(242,193,91,0.06))] px-3.5 text-[13px] font-black text-[var(--rp-primary)] shadow-[0_10px_22px_rgba(242,193,91,0.07)] transition hover:bg-[rgba(242,193,91,0.16)]"
        >
          <ActionIcon className="h-3.5 w-3.5" />
          {post.actionLabel}
        </button>
      </div>
    </article>
  );
}

function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/70 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-10 backdrop-blur-sm sm:place-items-center sm:py-8">
      <button type="button" aria-label="Close Post Today Ride modal" className="absolute inset-0" onClick={onClose} />
      <section className="relative z-10 w-full max-w-md rounded-[26px] border border-[rgba(242,193,91,0.28)] bg-[linear-gradient(180deg,#0b1620,#07111a)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-left text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Ride Call</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--rp-text)]">Post Today Ride coming soon</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Quick same-day ride calls will let you post where you are going today, then collect interest from people on similar routes.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-13 w-full rounded-[18px] bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_56%,#d9912f_100%)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_36px_rgba(242,193,91,0.22)] transition hover:brightness-105"
        >
          Got it
        </button>
      </section>
    </div>
  );
}

export default function TodayRidesPage() {
  const [activeFilter, setActiveFilter] = useState<RideBoardFilter>("near_me");
  const [showPostModal, setShowPostModal] = useState(false);

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-1.25rem)] overflow-hidden bg-[linear-gradient(180deg,#050b12_0%,#07111a_48%,#050b12_100%)] pb-5 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(242,193,91,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(242,193,91,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.13]" aria-hidden="true" />
      <div className="relative z-10 mx-auto grid w-full max-w-[560px] gap-6 px-4 pb-4 pt-5 sm:px-6 lg:max-w-3xl lg:pt-8">
        <section className="relative min-h-[130px] overflow-hidden rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,rgba(11,22,32,0.96),rgba(6,16,25,0.94))] p-5 shadow-[var(--rp-shadow-soft)]">
          <CityRouteIllustration />
          <div className="relative z-10 flex max-w-[280px] items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[var(--rp-primary)]">
              <Sun className="h-10 w-10 stroke-[2.4]" />
            </span>
            <div>
              <p className="text-left text-[22px] font-black leading-tight text-[var(--rp-text)]">Good morning, trial_2</p>
              <p className="mt-2 text-left text-base font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Find people going your way today.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h1 className="text-left text-[48px] font-black leading-none tracking-tight text-[var(--rp-text)] min-[390px]:text-[56px]">
            Ride Board
          </h1>
          <button
            type="button"
            onClick={() => setShowPostModal(true)}
            className="mt-6 inline-flex min-h-[74px] w-full items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_56%,#d9912f_100%)] px-5 text-xl font-black text-[var(--rp-primary-text)] shadow-[0_22px_46px_rgba(242,193,91,0.25)] transition hover:brightness-105"
          >
            <Plus className="h-8 w-8 stroke-[2.4]" />
            Post Today Ride
          </button>
        </section>

        <section aria-label="Ride Board filters" className="scrollbar-hide -mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-3">
            {rideBoardFilters.map((chip) => {
              const Icon = chip.icon;
              const active = activeFilter === chip.id;

              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  className={cn(
                    "inline-flex min-h-14 shrink-0 items-center gap-2 rounded-full border px-5 text-base font-black transition",
                    active
                      ? "border-[var(--rp-primary)] bg-[rgba(242,193,91,0.1)] text-[var(--rp-primary)] shadow-[0_0_26px_rgba(242,193,91,0.22)]"
                      : "border-white/10 bg-white/[0.055] text-[var(--rp-muted-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4" aria-label="Quick same-day Ride Calls">
          {rideBoardPosts.map((post) => (
            <RideBoardCard key={post.id} post={post} />
          ))}
        </section>
      </div>

      {showPostModal ? <ComingSoonModal onClose={() => setShowPostModal(false)} /> : null}
    </div>
  );
}
