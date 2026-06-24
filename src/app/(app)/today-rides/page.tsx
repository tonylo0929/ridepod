"use client";

import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  MessageCircle,
  Plane,
  Plus,
  Send,
  SlidersHorizontal,
  Star,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { cn } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

type TodayRideStatus =
  | "OPEN"
  | "INTEREST_FOUND"
  | "LEAVING_SOON"
  | "POD_FORMING"
  | "CLOSED"
  | "EXPIRED"
  | "CANCELLED";

type TodayRideAccent = "gold" | "blue" | "teal";
type TodayRideCategory = "Airport" | "Community" | "General";
type TodayRideVisibility = "Public" | "Community";

type TodayRidePost = {
  id: string;
  from: string;
  to: string;
  departureTime: string;
  hostName: string;
  hostRating: string;
  interestedCount: number;
  interestedUserNames: string[];
  status: TodayRideStatus;
  accent: TodayRideAccent;
  category: TodayRideCategory;
  visibility: TodayRideVisibility;
  note?: string;
  demoPinned?: boolean;
};

type TodayRideFormState = {
  from: string;
  to: string;
  departureTime: string;
  flexibility: string;
  note: string;
  category: TodayRideCategory;
  visibility: TodayRideVisibility;
};

type StatusDisplay = {
  label: string;
  className: string;
};

const currentMockUserName = "trial_2";

const filterChips: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "near_me", label: "Near me", icon: MapPin },
  { id: "airport", label: "Airport", icon: Plane },
  { id: "leaving_soon", label: "Leaving soon", icon: Clock3 },
  { id: "community", label: "Community", icon: UsersRound },
  { id: "filters", label: "Filters", icon: SlidersHorizontal },
];

const initialTodayRidePosts: TodayRidePost[] = [
  {
    id: "today-shibuya-haneda",
    from: "Shibuya",
    to: "Haneda Airport",
    departureTime: "18:00",
    hostName: "trial_0",
    hostRating: "4.9",
    interestedCount: 3,
    interestedUserNames: ["Aki", "Mina", "Ken"],
    status: "LEAVING_SOON",
    accent: "gold",
    category: "Airport",
    visibility: "Community",
    note: "Looking for people heading to Terminal 3 tonight.",
    demoPinned: true,
  },
  {
    id: "today-kcity-tst",
    from: "K City",
    to: "TST",
    departureTime: "19:30",
    hostName: "Tony_LO",
    hostRating: "5.0",
    interestedCount: 1,
    interestedUserNames: ["Ivy"],
    status: "OPEN",
    accent: "blue",
    category: "Community",
    visibility: "Public",
    note: "Flexible by about 15 minutes if a small pod forms.",
    demoPinned: true,
  },
  {
    id: "today-airport-central",
    from: "Airport Express Station",
    to: "Central",
    departureTime: "20:10",
    hostName: "May_L",
    hostRating: "4.8",
    interestedCount: 4,
    interestedUserNames: ["Chris", "Nora", "Sam", "Jo"],
    status: "POD_FORMING",
    accent: "teal",
    category: "Airport",
    visibility: "Community",
    note: "Pod is forming from interested riders before final confirmation.",
    demoPinned: true,
  },
];

const defaultFormState: TodayRideFormState = {
  from: "",
  to: "",
  departureTime: "18:30",
  flexibility: "+/- 15 minutes",
  note: "",
  category: "General",
  visibility: "Public",
};

function displayNameFromAuth(profile: ReturnType<typeof useAuth>["profile"], user: ReturnType<typeof useAuth>["user"]) {
  return (
    profile?.account_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.preferred_name?.trim() ||
    (typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "") ||
    user?.email?.split("@")[0]?.trim() ||
    currentMockUserName
  );
}

function parseTodayTime(time: string, now: Date) {
  const [hour = "0", minute = "0"] = time.split(":");
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hour), Number(minute));
}

function formatTodayTime(time: string) {
  const [hour = "0", minute = "0"] = time.split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));
  return `Today, ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
}

function getEffectiveStatus(post: TodayRidePost, now: Date): TodayRideStatus {
  if (["POD_FORMING", "CLOSED", "EXPIRED", "CANCELLED"].includes(post.status)) return post.status;
  if (post.demoPinned) return post.status;

  const departure = parseTodayTime(post.departureTime, now);
  const cutoff = new Date(departure.getTime() - 20 * 60 * 1000);

  if (now > departure) return post.interestedCount > 0 ? "CLOSED" : "EXPIRED";
  if (now >= cutoff) return post.interestedCount > 0 ? "LEAVING_SOON" : "EXPIRED";
  if (post.interestedCount > 0 && post.status === "INTEREST_FOUND") return "OPEN";

  return post.status;
}

function getStatusDisplay(status: TodayRideStatus): StatusDisplay {
  if (status === "LEAVING_SOON") {
    return {
      label: "Leaving soon",
      className: "border-[var(--rp-primary)]/45 bg-[var(--rp-primary)]/16 text-[var(--rp-primary)]",
    };
  }

  if (status === "POD_FORMING") {
    return {
      label: "Pod forming",
      className: "border-teal-300/45 bg-teal-400/15 text-teal-100",
    };
  }

  if (status === "CLOSED") {
    return {
      label: "Closed",
      className: "border-slate-300/25 bg-slate-400/10 text-slate-200",
    };
  }

  if (status === "EXPIRED") {
    return {
      label: "Expired",
      className: "border-rose-300/30 bg-rose-400/10 text-rose-100",
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Cancelled",
      className: "border-rose-300/30 bg-rose-400/10 text-rose-100",
    };
  }

  return {
    label: "Open",
    className: "border-sky-300/35 bg-sky-400/12 text-sky-100",
  };
}

function getAccentClasses(accent: TodayRideAccent) {
  if (accent === "gold") {
    return {
      card: "border-[var(--rp-primary)]/55 shadow-[0_18px_46px_color-mix(in_srgb,var(--rp-primary)_15%,transparent)]",
      rail: "bg-[linear-gradient(180deg,#ffd36a,#f2c15b)]",
      icon: "border-[var(--rp-primary)]/30 bg-[var(--rp-primary)]/14 text-[var(--rp-primary)]",
      cta: "border-[var(--rp-primary)]/40 bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)] hover:bg-[color-mix(in_srgb,var(--rp-primary)_22%,transparent)]",
    };
  }

  if (accent === "teal") {
    return {
      card: "border-teal-300/45 shadow-[0_18px_46px_rgba(20,184,166,0.13)]",
      rail: "bg-[linear-gradient(180deg,#5eead4,#14b8a6)]",
      icon: "border-teal-300/30 bg-teal-400/12 text-teal-100",
      cta: "border-teal-300/35 bg-teal-400/12 text-teal-100 hover:bg-teal-400/18",
    };
  }

  return {
    card: "border-sky-300/45 shadow-[0_18px_46px_rgba(22,119,255,0.14)]",
    rail: "bg-[linear-gradient(180deg,#4f94ff,#1677ff)]",
    icon: "border-sky-300/30 bg-sky-400/12 text-sky-100",
    cta: "border-sky-300/35 bg-sky-400/12 text-sky-100 hover:bg-sky-400/18",
  };
}

function getVisiblePosts(posts: TodayRidePost[], now: Date, activeFilter: string) {
  return posts
    .map((post) => ({ post, status: getEffectiveStatus(post, now) }))
    .filter(({ post, status }) => {
      if (status === "EXPIRED" && post.interestedCount === 0) return false;
      if (status === "CANCELLED") return false;
      if (activeFilter === "airport") return post.category === "Airport";
      if (activeFilter === "leaving_soon") return status === "LEAVING_SOON";
      if (activeFilter === "community") return post.visibility === "Community";
      return true;
    });
}

function buildNewPost(form: TodayRideFormState, hostName: string): TodayRidePost {
  return {
    id: `today-${Date.now()}`,
    from: form.from.trim() || "Central",
    to: form.to.trim() || "TST",
    departureTime: form.departureTime || "18:30",
    hostName,
    hostRating: "4.9",
    interestedCount: 0,
    interestedUserNames: [],
    status: "OPEN",
    accent: form.category === "Airport" ? "teal" : "blue",
    category: form.category,
    visibility: form.visibility,
    note: [form.flexibility.trim(), form.note.trim()].filter(Boolean).join(" | "),
  };
}

function TodayRideAvatar({ name, accent }: { name: string; accent: TodayRideAccent }) {
  const initials = name
    .split(/[_\s-]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const accentClass = getAccentClasses(accent).icon;

  return (
    <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-sm font-black", accentClass)}>
      {initials || "R"}
    </span>
  );
}

function TodayRideCard({
  post,
  status,
  currentUserName,
  onInterested,
  onStartPod,
  onCancel,
}: {
  post: TodayRidePost;
  status: TodayRideStatus;
  currentUserName: string;
  onInterested: (id: string) => void;
  onStartPod: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const statusDisplay = getStatusDisplay(status);
  const accent = getAccentClasses(post.accent);
  const isHost = post.hostName.toLowerCase() === currentUserName.toLowerCase();
  const alreadyInterested = post.interestedUserNames.some((name) => name.toLowerCase() === currentUserName.toLowerCase());
  const closed = status === "POD_FORMING" || status === "CLOSED" || status === "EXPIRED" || status === "CANCELLED";
  const ctaLabel = status === "POD_FORMING" ? "Pod forming" : alreadyInterested ? "Interested" : "I'm interested";

  return (
    <article className={cn("relative overflow-hidden rounded-[24px] border bg-[linear-gradient(180deg,rgba(13,26,38,0.96),rgba(7,17,26,0.96))] p-4 shadow-[var(--rp-shadow-soft)]", accent.card)}>
      <span className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full", accent.rail)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-[var(--rp-primary)]" />
            <h2 className="min-w-0 break-words text-[22px] font-black leading-tight text-[var(--rp-text)]">
              {post.from} <span className="text-[var(--rp-primary)]">{"->"}</span> {post.to}
            </h2>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--rp-muted-strong)]">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">
              <CalendarDays className="h-3.5 w-3.5 text-sky-200" />
              {formatTodayTime(post.departureTime)}
            </span>
            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black", statusDisplay.className)}>
              {statusDisplay.label}
            </span>
          </div>
        </div>
        <TodayRideAvatar name={post.hostName} accent={post.accent} />
      </div>

      <div className="mt-4 grid gap-3 rounded-[18px] border border-white/8 bg-white/[0.045] p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--rp-text)]">Host: {post.hostName}</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[var(--rp-muted-strong)]">
              <Star className="h-3.5 w-3.5 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
              {post.hostRating} community rating
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2 text-right">
            <p className="text-lg font-black text-[var(--rp-primary)]">{post.interestedCount}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">interested</p>
          </div>
        </div>

        {post.note ? (
          <p className="rounded-[14px] border border-white/8 bg-[#06111d]/70 p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            {post.note}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 min-[420px]:grid-cols-[1fr_auto]">
        {isHost ? (
          <>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
            >
              <UsersRound className="h-4 w-4 text-[var(--rp-primary)]" />
              View interested users
            </button>
            <button
              type="button"
              onClick={() => onStartPod(post.id)}
              disabled={status === "POD_FORMING" || post.interestedCount === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#4f94ff,#1677ff)] px-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(22,119,255,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Start Pod
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onCancel(post.id)}
              className="min-[420px]:col-span-2 text-center text-xs font-black text-[var(--rp-muted-strong)] transition hover:text-rose-100"
            >
              Cancel post
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onInterested(post.id)}
              disabled={closed || alreadyInterested}
              className={cn(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-65",
                status === "POD_FORMING" ? "border-teal-300/35 bg-teal-400/12 text-teal-100" : accent.cta,
              )}
            >
              <MessageCircle className="h-4 w-4" />
              {ctaLabel}
            </button>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
            >
              View details
              <ChevronRight className="h-4 w-4 text-[var(--rp-primary)]" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function QuickPostSheet({
  open,
  form,
  onFormChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: TodayRideFormState;
  onFormChange: (form: TodayRideFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/65 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-10 backdrop-blur-sm sm:place-items-center sm:py-8">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-[28px] border border-[var(--rp-border-strong)] bg-[linear-gradient(180deg,#0b1620,#07111a)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Quick post</p>
            <h2 className="mt-1 text-2xl font-black">Post Today Ride</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick post"
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="grid gap-1.5 text-sm font-black">
            From
            <input
              value={form.from}
              onChange={(event) => onFormChange({ ...form, from: event.target.value })}
              placeholder="e.g. Shibuya"
              className="h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-base font-semibold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-sky-300"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-black">
            To
            <input
              value={form.to}
              onChange={(event) => onFormChange({ ...form, to: event.target.value })}
              placeholder="e.g. Haneda Airport"
              className="h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-base font-semibold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-sky-300"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm font-black">
              Leaving time today
              <input
                type="time"
                value={form.departureTime}
                onChange={(event) => onFormChange({ ...form, departureTime: event.target.value })}
                className="h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-base font-semibold text-[var(--rp-text)] outline-none focus:border-sky-300"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-black">
              Flexible
              <input
                value={form.flexibility}
                onChange={(event) => onFormChange({ ...form, flexibility: event.target.value })}
                placeholder="Optional"
                className="h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-base font-semibold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-sky-300"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-black">
            Note
            <textarea
              value={form.note}
              onChange={(event) => onFormChange({ ...form, note: event.target.value })}
              placeholder="Anyone want to split taxi?"
              className="min-h-20 resize-none rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-3 text-base font-semibold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-sky-300"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm font-black">
              Category
              <select
                value={form.category}
                onChange={(event) => onFormChange({ ...form, category: event.target.value as TodayRideCategory })}
                className="h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-base font-semibold text-[var(--rp-text)] outline-none focus:border-sky-300"
              >
                <option>General</option>
                <option>Airport</option>
                <option>Community</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-black">
              Visibility
              <select
                value={form.visibility}
                onChange={(event) => onFormChange({ ...form, visibility: event.target.value as TodayRideVisibility })}
                className="h-12 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 text-base font-semibold text-[var(--rp-text)] outline-none focus:border-sky-300"
              >
                <option>Public</option>
                <option>Community</option>
              </select>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#4f94ff,#1677ff)] px-5 py-4 text-base font-black text-white shadow-[0_18px_36px_rgba(22,119,255,0.24)] transition hover:brightness-110"
        >
          <Send className="h-5 w-5" />
          Post Today Ride
        </button>
      </form>
    </div>
  );
}

export default function TodayRidesPage() {
  const { profile, user } = useAuth();
  const currentUserName = displayNameFromAuth(profile, user);
  const [posts, setPosts] = useState<TodayRidePost[]>(initialTodayRidePosts);
  const [activeFilter, setActiveFilter] = useState("near_me");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<TodayRideFormState>(defaultFormState);
  const now = useMemo(() => new Date(), []);
  const visiblePosts = useMemo(() => getVisiblePosts(posts, now, activeFilter), [activeFilter, now, posts]);

  function handleInterested(id: string) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== id) return post;
        const alreadyInterested = post.interestedUserNames.some((name) => name.toLowerCase() === currentUserName.toLowerCase());
        if (alreadyInterested || ["POD_FORMING", "CLOSED", "EXPIRED", "CANCELLED"].includes(post.status)) return post;

        return {
          ...post,
          interestedCount: post.interestedCount + 1,
          interestedUserNames: [...post.interestedUserNames, currentUserName],
          status: post.status === "OPEN" ? "INTEREST_FOUND" : post.status,
        };
      }),
    );
  }

  function handleStartPod(id: string) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === id && post.interestedCount > 0 ? { ...post, status: "POD_FORMING" } : post)),
    );
  }

  function handleCancel(id: string) {
    setPosts((currentPosts) => currentPosts.map((post) => (post.id === id ? { ...post, status: "CANCELLED" } : post)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPost = buildNewPost(form, currentUserName);
    setPosts((currentPosts) => [nextPost, ...currentPosts]);
    setForm(defaultFormState);
    setSheetOpen(false);
  }

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-1.25rem)] overflow-hidden pb-5 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <section className="relative overflow-hidden px-4 pb-6 pt-7 sm:px-6 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#04101a] bg-cover bg-[72%_top]"
          style={{ backgroundImage: "url('/images/ridepod/home-taxi-harbor-night.png')" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,11,18,0.88)_0%,rgba(5,11,18,0.48)_40%,rgba(5,11,18,0.08)_72%),linear-gradient(180deg,rgba(5,11,18,0.12)_0%,rgba(5,11,18,0.1)_40%,rgba(5,11,18,0.76)_84%,var(--rp-bg)_100%)]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,var(--rp-bg))]" />

        <div className="relative z-10 pt-1 min-[720px]:pt-8">
          <p className="text-[28px] font-serif leading-tight text-[var(--rp-primary)] min-[720px]:text-[42px]">
            Good morning, {currentMockUserName}
          </p>
          <h1 className="mt-4 text-[44px] font-black leading-none tracking-tight text-[var(--rp-text)] min-[720px]:text-[62px]">
            Today Rides
          </h1>
          <p className="mt-3 max-w-[310px] text-base font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Find people going your way today.
          </p>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mt-6 inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#4f94ff,#1677ff)] px-5 text-base font-black text-white shadow-[0_20px_44px_rgba(22,119,255,0.3)] transition hover:brightness-110"
          >
            <Plus className="h-5 w-5" />
            Post Today Ride
          </button>
        </div>
      </section>

      <main className="relative z-10 grid gap-4 px-4 sm:px-6 lg:px-10">
        <section aria-label="Today ride filters" className="scrollbar-hide -mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-2">
            {filterChips.map((chip) => {
              const Icon = chip.icon;
              const active = activeFilter === chip.id;

              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-black transition",
                    active
                      ? "border-sky-300/45 bg-sky-400/16 text-sky-100 shadow-[0_12px_24px_rgba(22,119,255,0.12)]"
                      : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3" aria-label="Same-day ride posts">
          {visiblePosts.length ? (
            visiblePosts.map(({ post, status }) => (
              <TodayRideCard
                key={post.id}
                post={post}
                status={status}
                currentUserName={currentUserName}
                onInterested={handleInterested}
                onStartPod={handleStartPod}
                onCancel={handleCancel}
              />
            ))
          ) : (
            <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-center shadow-[var(--rp-shadow-soft)]">
              <Filter className="mx-auto h-8 w-8 text-[var(--rp-primary)]" />
              <h2 className="mt-4 text-xl font-black text-[var(--rp-text)]">No Today Rides yet</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Post where you&apos;re going today and see who&apos;s interested.
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#4f94ff,#1677ff)] px-5 text-sm font-black text-white"
              >
                Post Today Ride
              </button>
            </section>
          )}
        </section>

        <section className="rounded-[24px] border border-teal-300/25 bg-[linear-gradient(135deg,rgba(20,184,166,0.12),rgba(11,22,32,0.86))] p-4 shadow-[var(--rp-shadow-soft)]">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-teal-300/30 bg-teal-400/12 text-teal-100">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-[var(--rp-text)]">Community rides for today.</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Post a ride plan for today. If people are interested, start a pod and confirm together.
              </p>
            </div>
          </div>
        </section>
      </main>

      <QuickPostSheet
        open={sheetOpen}
        form={form}
        onFormChange={setForm}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
