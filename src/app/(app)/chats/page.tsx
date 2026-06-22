"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircle,
  LockKeyhole,
  Plane,
  RefreshCcw,
  Smartphone,
} from "lucide-react";
import { cn } from "@/components/ui";
import { AnimalAvatar, getDemoAnimalAvatarId } from "@/components/animal-avatar";
import { getHomeRide, getNormalizedRouteRequests } from "@/lib/home-ride-mock";
import {
  filterPodChats,
  podChats,
  type ChatFilter,
  type ChatRole,
  type ChatRideMode,
  type ChatStatus,
  type PodChatPreview,
} from "@/lib/pod-chat-mock";
import { getRideAppChatAccessState } from "@/lib/ride-app-chat-unlock";
import { getTaxiPartnerChatAccessState } from "@/lib/taxi-partner-chat-unlock";
import { useAuth } from "@/providers/AuthProvider";

const chatFilters: Array<{ id: ChatFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "joined", label: "Joined" },
  { id: "hosted", label: "Hosted" },
  { id: "completed", label: "Completed" },
];

const rideModeOptions: Array<{ id: ChatRideMode; label: string; icon: typeof CarFront }> = [
  { id: "taxi", label: "Taxi", icon: CarFront },
  { id: "ride_app", label: "Ride app", icon: Smartphone },
];

const initialChatRideMode: ChatRideMode =
  podChats.length > 0 && podChats.every((chat) => chat.rideMode === "ride_app") ? "ride_app" : "taxi";

function roleLabel(role: ChatRole) {
  return role === "hosted" ? "Hosted" : "Joined";
}

function statusLabel(status: ChatStatus) {
  if (status === "replacement_needed") return "Replacement needed";
  if (status === "locked") return "Chat locked";
  if (status === "quote_ready") return "Quote ready";
  if (status === "pickup_soon") return "Pickup soon";
  if (status === "completed") return "Completed";
  return "Forming";
}

function ChatCardIcon({ chat }: { chat: PodChatPreview }) {
  if (getChatAccess(chat).locked) return <LockKeyhole className="h-7 w-7" />;
  if (chat.status === "completed") return <CheckCircle2 className="h-7 w-7" />;
  if (chat.rideBadges.includes("Airport")) return <Plane className="h-7 w-7" />;
  if (chat.rideBadges.includes("Recurring")) return <RefreshCcw className="h-7 w-7" />;
  if (chat.status === "quote_ready") return <MessageCircle className="h-7 w-7" />;
  return <CarFront className="h-7 w-7" />;
}

function badgeClass(kind: "role" | "status" | "ride", value: string) {
  if (kind === "role") {
    return value === "Hosted"
      ? "border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]"
      : "border-blue-300/25 bg-blue-400/12 text-blue-100";
  }

  if (value === "Pickup soon") return "border-emerald-300/25 bg-emerald-400/12 text-emerald-100";
  if (value === "Taxi partner chat") return "border-[var(--rp-primary)]/25 bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]";
  if (value === "Quote ready") return "border-blue-300/25 bg-blue-400/12 text-blue-100";
  if (value === "Replacement needed") return "border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/14 text-[var(--rp-primary)]";
  if (value === "Action needed") return "border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/14 text-[var(--rp-primary)]";
  if (value === "Completed") return "border-white/12 bg-white/8 text-[var(--rp-muted-strong)]";
  if (value === "Chat locked") return "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]";
  if (value === "Airport") return "border-violet-300/25 bg-violet-400/14 text-violet-100";
  if (value === "Recurring") return "border-teal-300/25 bg-teal-400/14 text-teal-100";

  return "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]";
}

function ChatBadge({ kind, children }: { kind: "role" | "status" | "ride"; children: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full border px-2.5 py-0.5 text-xs font-black", badgeClass(kind, children))}>
      {children}
    </span>
  );
}

function initials(name: string) {
  if (name.toLowerCase() === "you") return "Y";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ParticipantStack({ chat }: { chat: PodChatPreview }) {
  return (
    <div className="flex shrink-0 -space-x-2">
      {chat.participants.slice(0, 4).map((name, index) => {
        const animalAvatarId = getDemoAnimalAvatarId(name);
        return animalAvatarId ? (
          <AnimalAvatar
            key={`${chat.id}-${name}-${index}`}
            id={animalAvatarId}
            label={`${name} avatar`}
            className="h-8 w-8 border-2 border-[var(--rp-card)] text-[7px] shadow-[0_6px_14px_rgba(0,0,0,0.24)]"
          />
        ) : (
          <span
            key={`${chat.id}-${name}-${index}`}
            title={name}
            className="grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--rp-card)] bg-[var(--rp-gradient-primary)] text-[10px] font-black text-[var(--rp-primary-text)] shadow-[0_6px_14px_rgba(0,0,0,0.24)]"
          >
            {initials(name)}
          </span>
        );
      })}
      {chat.extraParticipants ? (
        <span className="grid h-8 min-w-8 place-items-center rounded-full border-2 border-[var(--rp-card)] bg-[var(--rp-card-muted)] px-1.5 text-[10px] font-black text-[var(--rp-muted-strong)]">
          +{chat.extraParticipants}
        </span>
      ) : null}
    </div>
  );
}

function ChatCard({ chat }: { chat: PodChatPreview }) {
  const ride = chat.rideMode === "ride_app" ? getHomeRide(chat.podId) : null;
  const chatAccess = getChatAccess(chat, ride);
  const status =
    ride?.rideAppHostCancellationStatus === "host_replacement_needed"
      ? "Replacement needed"
      : ride && chat.role === "hosted" && getNormalizedRouteRequests(ride).pendingCount > 0
        ? "Action needed"
      : chatAccess.locked
        ? "Chat locked"
        : chat.rideMode === "taxi"
          ? "Taxi partner chat"
          : statusLabel(chat.status);
  const role = roleLabel(chat.role);

  return (
    <Link
      href={`/chats/${encodeURIComponent(chat.id)}`}
      className="group grid grid-cols-[56px_1fr_auto] gap-3 rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rp-card)_90%,transparent),color-mix(in_srgb,var(--rp-card-soft)_82%,transparent))] p-4 shadow-[var(--rp-shadow-soft)] transition hover:border-[var(--rp-border-strong)] hover:bg-[var(--rp-card-muted)]"
      aria-label={`Open chat for ${chat.route}`}
    >
      <span className="mt-1 grid h-14 w-14 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_8%,transparent)] text-[var(--rp-primary)]">
        <ChatCardIcon chat={chat} />
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 text-xl font-black leading-tight text-[var(--rp-text)]">{chat.route}</span>
          <ChatBadge kind="role">{role}</ChatBadge>
        </span>
        <span className="mt-2 flex flex-wrap gap-2">
          {chat.rideBadges.map((badge) => (
            <ChatBadge key={badge} kind="ride">
              {badge}
            </ChatBadge>
          ))}
        </span>
        <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--rp-muted-strong)]">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>{chat.timeLabel}</span>
        </span>
        <span className="mt-3 flex min-w-0 items-center gap-3">
          <ParticipantStack chat={chat} />
          <span className="min-w-0 truncate text-sm font-semibold text-[var(--rp-muted)]">
            {chatAccess.locked ? chatAccess.helper : chat.latestMessage}
          </span>
        </span>
      </span>

      <span className="flex flex-col items-end justify-between gap-4">
        <ChatBadge kind="status">{status}</ChatBadge>
        <span className="flex items-center gap-3">
          {chat.unreadCount && !chatAccess.locked ? (
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[var(--rp-primary)] px-2 text-sm font-black text-[var(--rp-primary-text)]">
              {chat.unreadCount}
            </span>
          ) : null}
          <ChevronRight className="h-6 w-6 text-[var(--rp-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--rp-primary)]" />
        </span>
      </span>
    </Link>
  );
}

function getChatAccess(chat: PodChatPreview, ride = getHomeRide(chat.podId)) {
  if (chat.rideMode === "ride_app") {
    if (!ride) return { locked: chat.status === "locked", helper: "Chat locked." };
    const access = getRideAppChatAccessState(ride);
    return {
      locked: !access.canAccess,
      helper:
        access.reason === "host_replacement_needed"
          ? "Host replacement needed. A confirmed rider can become the new booker."
          : access.reason === "seat_released" || access.reason === "seat_hold_expired"
            ? "Seat released."
            : access.helper,
      access,
    };
  }
  if (chat.rideMode !== "taxi") return { locked: false, helper: "Chat locked." };
  if (!ride) return { locked: chat.status === "locked", helper: "Unlocks after quote acceptance and taxi partner acceptance." };
  const access = getTaxiPartnerChatAccessState(ride);
  return { locked: !access.canAccess, helper: "Unlocks after quote acceptance and taxi partner acceptance.", access };
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Activity; title: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
      <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">{title}</h2>
    </div>
  );
}

function ChatRideModeSwitch({
  value,
  onChange,
}: {
  value: ChatRideMode;
  onChange: (value: ChatRideMode) => void;
}) {
  return (
    <div className="mt-5 grid justify-items-center">
      <div className="w-full max-w-[600px] rounded-[34px] border border-[color-mix(in_srgb,var(--rp-primary)_62%,rgba(34,211,238,0.55))] bg-[linear-gradient(135deg,rgba(242,193,91,0.16),rgba(34,211,238,0.12)_48%,rgba(248,250,252,0.08))] p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_22px_54px_rgba(0,0,0,0.36),0_0_38px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)]">
        <div className="relative grid grid-cols-2 rounded-full border border-white/25 bg-[rgba(248,250,252,0.92)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          {rideModeOptions.map((option) => {
            const selected = value === option.id;
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id)}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition min-[420px]:text-base",
                  selected
                    ? option.id === "ride_app"
                      ? "bg-[#0f5fa8] text-white shadow-[0_16px_32px_rgba(15,95,168,0.28)]"
                      : "bg-[var(--rp-primary)] text-[#07111a] shadow-[0_16px_32px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)]"
                    : option.id === "ride_app"
                      ? "text-sky-900 hover:bg-sky-100"
                      : "text-amber-900 hover:bg-amber-100",
                )}
              >
                <Icon className="h-5 w-5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ChatsPage() {
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [rideMode, setRideMode] = useState<ChatRideMode>(initialChatRideMode);
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const visibleChats = useMemo(
    () => filterPodChats(filter).filter((chat) => chat.rideMode === rideMode),
    [filter, rideMode],
  );
  const activeChats = visibleChats.filter((chat) => chat.status !== "completed");
  const pastChats = visibleChats.filter((chat) => chat.status === "completed");

  if (!isLoggedIn) {
    return (
      <div className="mx-auto grid min-h-[58vh] max-w-xl place-items-center px-1">
        <section className="w-full rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-6 text-center shadow-[var(--rp-shadow-soft)]">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <MessageCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-3xl font-black text-[var(--rp-primary)]">Pod Chats</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Log in to view chats for pods you joined or hosted.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent("/chats")}`}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] px-5 text-base font-black text-[var(--rp-primary-text)]"
          >
            Log in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden px-4 pb-10 pt-8 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-8 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--rp-primary)_13%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,#0b2238_58%,transparent),transparent)]"
      />

      <main className="relative z-10 mx-auto w-full max-w-4xl">
        <header className="pt-2">
          <h1 className="text-[42px] font-black leading-none tracking-tight text-[var(--rp-primary)] sm:text-5xl">
            Pod Chats
          </h1>
          <p className="mt-4 text-base font-semibold leading-7 text-[var(--rp-muted-strong)]">
            Chat with your pod after you join or create a ride.
          </p>
        </header>

        <div className="mt-7 grid grid-cols-4 rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-1" role="tablist" aria-label="Pod chat filters">
          {chatFilters.map((item) => {
            const active = filter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "min-h-12 rounded-[20px] px-2 text-sm font-black transition sm:text-base",
                  active
                    ? "bg-[var(--rp-card-muted)] text-[var(--rp-primary-strong)] shadow-[0_12px_28px_color-mix(in_srgb,var(--rp-primary)_22%,transparent)]"
                    : "text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)] hover:text-[var(--rp-text)]",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <ChatRideModeSwitch value={rideMode} onChange={setRideMode} />

        <div className="mt-9 grid gap-8">
          {activeChats.length ? (
            <section className="grid gap-4">
              <SectionHeader icon={Activity} title="Active chats" />
              <div className="grid gap-4">
                {activeChats.map((chat) => (
                  <ChatCard key={chat.id} chat={chat} />
                ))}
              </div>
            </section>
          ) : null}

          {pastChats.length ? (
            <section className="grid gap-4">
              <SectionHeader icon={Clock3} title="Past rides" />
              <div className="grid gap-4">
                {pastChats.map((chat) => (
                  <ChatCard key={chat.id} chat={chat} />
                ))}
              </div>
            </section>
          ) : null}

          {!visibleChats.length ? (
            <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-6 text-center shadow-[var(--rp-shadow-soft)]">
              <h2 className="text-xl font-black text-[var(--rp-text)]">No pod chats yet</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Join or create a shared taxi pod to start chatting.
              </p>
              <Link
                href="/home"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
              >
                Find rides
              </Link>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
