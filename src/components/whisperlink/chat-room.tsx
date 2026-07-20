"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  Ellipsis,
  Link2,
  LoaderCircle,
  MoreHorizontal,
  Palette,
  Paperclip,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { WhisperLogo } from "@/components/whisperlink/brand";
import { MobileScreen, StatusBar } from "@/components/whisperlink/mobile-ui";
import { cn } from "@/lib/cn";
import {
  loadStoredRoom,
  saveStoredRoom,
  type Message,
  type Room,
} from "@/lib/whisperlink";

type ChatRoomProps = {
  room: Room;
};

export function WhisperChatRoom({ room: initialRoom }: ChatRoomProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [messages, setMessages] = useState<Message[]>(initialRoom.messages);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [destroyed, setDestroyed] = useState(initialRoom.status === "destroyed");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = loadStoredRoom();
      if (!stored) return;

      setRoom(stored);
      setMessages(stored.messages);
      setDestroyed(stored.status === "destroyed");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const title = room.title === "WhisperLink private room" ? "Design Sync" : room.title;
  const timeLeft = "16h 10m left";

  async function copyLink() {
    setCopied(true);
    try {
      await navigator.clipboard?.writeText(room.shareLink);
    } catch {
      // Local browser previews can limit clipboard access; visual feedback remains useful.
    }
    window.setTimeout(() => setCopied(false), 1400);
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || destroyed) return;

    setMessages((current) => {
      const nextMessages: Message[] = [
        ...current,
        {
          id: `local-${Date.now()}`,
          participantId: "creator",
          body: trimmed,
          sentAt: "Now",
          deliveryState: "sent",
        },
      ];
      const nextRoom = { ...room, messages: nextMessages };
      setRoom(nextRoom);
      saveStoredRoom(nextRoom);
      return nextMessages;
    });
    setDraft("");
  }

  function destroyRoom() {
    const nextRoom: Room = { ...room, status: "destroyed" };
    setDestroyed(true);
    setRoom(nextRoom);
    saveStoredRoom(nextRoom);
  }

  function restoreRoom() {
    const nextRoom: Room = { ...room, status: "active" };
    setDestroyed(false);
    setRoom(nextRoom);
    saveStoredRoom(nextRoom);
  }

  if (destroyed) {
    return (
      <MobileScreen dark withBottomInset={false}>
        <StatusBar dark />
        <section className="grid min-h-[calc(100vh-44px)] place-items-center px-7 text-center">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-7 shadow-[0_22px_64px_rgba(0,0,0,0.35)]">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#12342b] text-[#66e7a8]">
              <Trash2 className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-[30px] font-extrabold text-white">Room destroyed</h1>
            <p className="mt-3 text-[16px] font-medium leading-7 text-white/68">
              The creator closed this room. The link no longer opens the conversation.
            </p>
            <button
              type="button"
              onClick={restoreRoom}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#33d98d] px-5 text-[16px] font-bold text-[#001716]"
            >
              Restore active room <LoaderCircle className="h-4 w-4" />
            </button>
          </div>
        </section>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen dark contentClassName="relative bg-[radial-gradient(circle_at_65%_15%,rgba(16,124,88,0.35),transparent_34%),linear-gradient(180deg,#001615_0%,#00100f_52%,#001615_100%)]" withBottomInset={false}>
      <StatusBar dark />
      <div className="px-6 pb-32 pt-3">
        <header className="grid grid-cols-[36px_1fr_auto] items-start gap-3">
          <Link href="/" aria-label="Back to home" className="mt-2 grid h-10 w-10 place-items-center rounded-full text-white">
            <ArrowLeft className="h-7 w-7" />
          </Link>
          <div className="min-w-0">
            <WhisperLogo dark markClassName="h-10 w-10" />
            <h1 className="mt-1 text-[25px] font-extrabold leading-none text-white">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-[18px] font-medium text-white/82">2/2 participants</p>
              <span className="rounded-full bg-[#0c734e] px-4 py-1.5 text-[17px] font-bold text-[#72f0ad]">{timeLeft}</span>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              aria-label="Participants"
              className="grid h-14 w-14 place-items-center rounded-[16px] border border-white/16 bg-white/[0.07] text-white"
            >
              <UsersRound className="h-6 w-6" />
            </button>
            <Link
              href="/trust"
              aria-label="More room options"
              className="grid h-14 w-14 place-items-center rounded-[16px] border border-white/16 bg-white/[0.07] text-white"
            >
              <MoreHorizontal className="h-7 w-7" />
            </Link>
          </div>
        </header>

        <section className="mt-6 flex items-center gap-5 rounded-[18px] border border-[#13ad73]/45 bg-[#02432f]/80 p-5 shadow-[0_0_34px_rgba(36,211,136,0.16)]">
          <div className="relative grid h-18 w-18 shrink-0 place-items-center rounded-full bg-[#093929]">
            <div className="absolute inset-0 rounded-full bg-[#4cf29d]/20 blur-md" />
            <div className="relative grid h-14 w-14 place-items-center rounded-[20px] bg-gradient-to-br from-[#b7ffd7] to-[#17bb73] text-[#003c30]">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[23px] font-extrabold text-[#4ff39a]">Room is active</h2>
              <span className="h-3 w-3 rounded-full bg-[#7bffac] shadow-[0_0_16px_rgba(123,255,172,0.9)]" />
            </div>
            <p className="mt-2 text-[17px] font-medium leading-6 text-white/80">This room will expire in 16h 10m</p>
          </div>
        </section>

        <section className="mt-5 grid gap-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </section>

        <form onSubmit={submitMessage} className="mt-4 rounded-full border border-white/16 bg-white/[0.07] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="whisper-message">Message</label>
            <input
              id="whisper-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a private message..."
              className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-[17px] font-medium text-white outline-none placeholder:text-white/52"
            />
            <button type="button" aria-label="Attach file" className="grid h-11 w-11 place-items-center rounded-full text-white/84">
              <Paperclip className="h-6 w-6" />
            </button>
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim()}
              className="grid h-12 w-12 place-items-center rounded-full bg-[#44df8f] text-[#001716] disabled:opacity-50"
            >
              <ArrowUp className="h-7 w-7" />
            </button>
          </div>
        </form>

        <div className="mt-4 flex items-center gap-3 text-[15px] font-medium text-white/68">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#52e89d]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#52e89d]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#52e89d]/60" />
          </span>
          Guest is typing...
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-white/10 bg-[#001615]/92 px-5 pb-5 pt-3 text-white/76 backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          <ActionButton icon={<Link2 className="h-7 w-7" />} label={copied ? "Copied" : "Copy link"} onClick={copyLink} />
          <ActionButton icon={<UsersRound className="h-7 w-7" />} label="Participants" badge="2" />
          <ActionLink href="/demo/skins" icon={<Palette className="h-7 w-7" />} label="Skins" />
          <ActionButton icon={<Ellipsis className="h-7 w-7" />} label="More" onClick={destroyRoom} />
        </div>
        <div className="mx-auto mt-2 h-1 w-32 rounded-full bg-white" />
      </nav>
    </MobileScreen>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const fromCreator = message.participantId === "creator";
  const label = fromCreator ? "You" : "Guest";

  return (
    <div className={cn("flex", fromCreator ? "justify-end" : "justify-start")}>
      <article
        className={cn(
          "max-w-[79%] rounded-[18px] px-5 py-4 shadow-[0_18px_38px_rgba(0,0,0,0.16)]",
          fromCreator
            ? "border border-[#15a66d] bg-gradient-to-br from-[#075a3f] to-[#02422f] text-white"
            : "border border-white/12 bg-white/[0.09] text-white",
        )}
      >
        <div className="flex items-center gap-3">
          <p className={cn("text-[15px] font-bold", fromCreator ? "text-[#80f0b2]" : "text-white/76")}>{label}</p>
          <p className="text-[15px] font-medium text-white/56">{message.sentAt}</p>
        </div>
        <p className="mt-3 text-[20px] font-medium leading-[1.45]">{message.body}</p>
        {fromCreator ? (
          <div className="mt-3 flex justify-end text-[#58ee9c]">
            <Check className="h-5 w-5" />
            <Check className="-ml-2 h-5 w-5" />
          </div>
        ) : null}
      </article>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="relative grid min-h-[64px] place-items-center gap-1 rounded-[16px] text-[13px] font-medium">
      <span className="relative">
        {icon}
        {badge ? (
          <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#44df8f] text-xs font-extrabold text-[#001716]">
            {badge}
          </span>
        ) : null}
      </span>
      {label}
    </button>
  );
}

function ActionLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="grid min-h-[64px] place-items-center gap-1 rounded-[16px] text-[13px] font-medium">
      {icon}
      {label}
    </Link>
  );
}
