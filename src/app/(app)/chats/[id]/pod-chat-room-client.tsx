"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCheck, LockKeyhole, Mic, MoreVertical, Plus, Send } from "lucide-react";
import { AnimalAvatar, getDemoAnimalAvatarId } from "@/components/animal-avatar";
import { cn } from "@/components/ui";
import { getHomeRide } from "@/lib/home-ride-mock";
import { getPodChatById, type ChatMessage } from "@/lib/pod-chat-mock";
import { getTaxiPartnerChatAccessState, getTaxiPartnerLockedChatBody } from "@/lib/taxi-partner-chat-unlock";

const quickReplies = ["I am here", "On my way", "Where should we meet?", "Running 5 min late"];

const avatarStyles = [
  "bg-[#d7ecd8] text-[#153b2c]",
  "bg-[#e8d0bd] text-[#59341e]",
  "bg-[#d9e6f7] text-[#18365c]",
  "bg-[#e7c7d0] text-[#5a2638]",
];

function senderInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "R";
}

function MessageAvatar({ name }: { name: string }) {
  const index = name.length % avatarStyles.length;
  const animalAvatarId = getDemoAnimalAvatarId(name);

  if (animalAvatarId) {
    return (
      <AnimalAvatar
        id={animalAvatarId}
        label={`${name} avatar`}
        className="h-11 w-11 shrink-0 border border-white/10 text-[8px] shadow-[0_8px_20px_rgba(0,0,0,0.34)]"
      />
    );
  }

  return (
    <span
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-sm font-black shadow-[0_8px_20px_rgba(0,0,0,0.34)]",
        avatarStyles[index],
        name === "Taxi Partner" && "border-[var(--rp-primary)] bg-[#2a2416] text-[var(--rp-primary-strong)]",
      )}
    >
      {senderInitial(name)}
    </span>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isTaxiPartner = message.senderRole === "taxi_partner";

  if (message.mine) {
    return (
      <article className="flex justify-end">
        <div className="max-w-[78%] rounded-[22px] rounded-br-[8px] bg-[var(--rp-gradient-primary)] px-5 py-3 text-[#07111a] shadow-[0_14px_34px_color-mix(in_srgb,var(--rp-primary)_20%,transparent)]">
          <p className="text-sm font-black">You</p>
          <p className="mt-2 text-lg font-semibold leading-7">{message.body}</p>
          <div className="mt-2 flex items-center justify-end gap-1 text-xs font-semibold text-[#07111a]/78">
            <span>{message.time}</span>
            <CheckCheck className="h-4 w-4" />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="grid grid-cols-[44px_1fr] items-end gap-3">
      <MessageAvatar name={message.sender} />
      <div className="max-w-[78%]">
        <p className={cn("mb-1 px-3 text-sm font-black", isTaxiPartner ? "text-[var(--rp-primary-strong)]" : "text-sky-200")}>
          {message.sender}
        </p>
        <div
          className={cn(
            "rounded-[22px] rounded-bl-[8px] border px-5 py-3 text-[var(--rp-text)] shadow-[0_12px_28px_rgba(0,0,0,0.28)]",
            isTaxiPartner
              ? "border-[var(--rp-primary)]/45 bg-[linear-gradient(135deg,rgba(242,193,91,0.22),rgba(20,28,34,0.94))]"
              : "border-white/6 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rp-card-muted)_88%,transparent),color-mix(in_srgb,var(--rp-card)_92%,transparent))]",
          )}
        >
          {isTaxiPartner ? (
            <span className="mb-2 inline-flex rounded-full border border-[var(--rp-primary)]/40 bg-[rgba(242,193,91,0.12)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-primary-strong)]">
              Taxi partner
            </span>
          ) : null}
          <p className="text-lg font-semibold leading-7">{message.body}</p>
          <p className="mt-2 text-right text-xs font-semibold text-[var(--rp-muted)]">{message.time}</p>
        </div>
      </div>
    </article>
  );
}

function getNowTime() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export function PodChatRoomClient({ chatId }: { chatId: string }) {
  const room = getPodChatById(chatId);
  const taxiRide = room?.rideMode === "taxi" ? getHomeRide(room.podId) : null;
  const taxiChatAccess = taxiRide ? getTaxiPartnerChatAccessState(taxiRide) : null;
  const [messages, setMessages] = useState<ChatMessage[]>(() => room?.messages ?? []);
  const [draft, setDraft] = useState("");
  const canSend = draft.trim().length > 0;
  const memberText = room ? `${room.route} - ${room.memberCount} members` : "";

  function sendMessage() {
    const body = draft.trim();
    if (!body) return;

    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        sender: "You",
        body,
        time: getNowTime(),
        mine: true,
      },
    ]);
    setDraft("");
  }

  function sendQuickReply(body: string) {
    setMessages((current) => [
      ...current,
      {
        id: `quick-${Date.now()}-${body}`,
        sender: "You",
        body,
        time: getNowTime(),
        mine: true,
      },
    ]);
  }

  if (!room) {
    return (
      <div className="fixed inset-x-0 top-[73px] bottom-[calc(env(safe-area-inset-bottom)+72px)] z-30 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(242,193,91,0.12),transparent_30%),linear-gradient(180deg,#07111a_0%,#050b12_100%)] text-[var(--rp-text)] lg:bottom-0 lg:left-72 lg:top-0">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,18,0.28),rgba(5,11,18,0.88)),url('/images/ridepod/home-dark-mode-background.png')] bg-cover bg-center opacity-60"
        />
        <div className="relative z-10 mx-auto grid h-full w-full max-w-[560px] place-items-center px-5">
          <section className="w-full rounded-[28px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_92%,transparent)] p-6 text-center shadow-[var(--rp-shadow-soft)]">
            <h1 className="text-3xl font-black text-[var(--rp-text)]">Chat not found</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              This pod chat may no longer be available.
            </p>
            <Link
              href="/chats"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] px-5 text-base font-black text-[var(--rp-primary-text)]"
            >
              Back to chats
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (room.rideMode === "taxi" && taxiChatAccess && !taxiChatAccess.canAccess) {
    return (
      <div className="fixed inset-x-0 top-[73px] bottom-[calc(env(safe-area-inset-bottom)+72px)] z-30 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(242,193,91,0.12),transparent_30%),linear-gradient(180deg,#07111a_0%,#050b12_100%)] text-[var(--rp-text)] lg:bottom-0 lg:left-72 lg:top-0">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,18,0.28),rgba(5,11,18,0.88)),url('/images/ridepod/home-dark-mode-background.png')] bg-cover bg-center opacity-60"
        />
        <div className="relative z-10 mx-auto grid h-full w-full max-w-[560px] place-items-center px-5">
          <section className="w-full rounded-[28px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_92%,transparent)] p-6 text-center shadow-[var(--rp-shadow-soft)]">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--rp-primary)]/35 bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] text-[var(--rp-primary)]">
              <LockKeyhole className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-3xl font-black text-[var(--rp-text)]">Taxi partner chat locked</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              {getTaxiPartnerLockedChatBody(taxiChatAccess.reason)}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href={`/pods/${encodeURIComponent(room.podId)}`}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] px-5 text-base font-black text-[var(--rp-primary-text)]"
              >
                View pod
              </Link>
              <Link
                href="/chats"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-5 text-base font-black text-[var(--rp-muted-strong)]"
              >
                Back to chats
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-[73px] bottom-[calc(env(safe-area-inset-bottom)+72px)] z-30 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(242,193,91,0.12),transparent_30%),linear-gradient(180deg,#07111a_0%,#050b12_100%)] text-[var(--rp-text)] lg:bottom-0 lg:left-72 lg:top-0">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,18,0.28),rgba(5,11,18,0.88)),url('/images/ridepod/home-dark-mode-background.png')] bg-cover bg-center opacity-60"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[560px] flex-col">
        <header className="grid grid-cols-[52px_1fr_52px] items-center gap-2 px-4 pb-4 pt-[max(18px,env(safe-area-inset-top))]">
          <Link
            href="/chats"
            aria-label="Back to Pod chats"
            className="grid h-12 w-12 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <ArrowLeft className="h-7 w-7" />
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-2xl font-black leading-tight text-[var(--rp-text)]">
              {room.rideMode === "taxi" ? "Taxi partner chat" : room.roomTitle}
            </h1>
            <p className="mt-1 text-base font-semibold text-[var(--rp-muted-strong)]">{memberText}</p>
          </div>
          <button
            type="button"
            aria-label="Chat options"
            className="grid h-12 w-12 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <MoreVertical className="h-6 w-6" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid gap-5 pb-4 pt-3">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        </main>

        <form
          className="border-t border-white/8 bg-[color-mix(in_srgb,var(--rp-shell)_88%,transparent)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <div className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto pb-1">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => sendQuickReply(reply)}
                className="shrink-0 rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-3 py-2 text-xs font-black text-[var(--rp-primary-strong)] transition hover:border-[var(--rp-primary)] hover:bg-[rgba(242,193,91,0.12)]"
              >
                {reply}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[52px_1fr_52px] items-center gap-3">
            <button
              type="button"
              aria-label="More chat actions"
              className="grid h-12 w-12 place-items-center rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
            >
              <Plus className="h-7 w-7" />
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              className="min-h-12 min-w-0 rounded-full border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-card)_86%,transparent)] px-5 text-base font-semibold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
            />
            <button
              type="submit"
              aria-label={canSend ? "Send message" : "Voice message"}
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full border text-[var(--rp-text)] transition",
                canSend
                  ? "border-[var(--rp-border-strong)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] hover:bg-[var(--rp-card-muted)]",
              )}
            >
              {canSend ? <Send className="h-5 w-5" /> : <Mic className="h-6 w-6" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
