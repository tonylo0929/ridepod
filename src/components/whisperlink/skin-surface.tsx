"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  EyeOff,
  FileText,
  LayoutPanelTop,
  MessageSquareText,
  MessagesSquare,
  Notebook,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  getParticipant,
  getSkinOption,
  privacySkins,
  type Message,
  type PrivacySkinId,
  type Room,
} from "@/lib/whisperlink";

type SkinSurfaceProps = {
  room: Room;
  skin: PrivacySkinId;
  messages?: Message[];
  compact?: boolean;
  focusRevealedIds?: string[];
  onToggleFocus?: (messageId: string) => void;
};

type SkinIconProps = {
  id: PrivacySkinId;
  className?: string;
};

export function SkinIcon({ id, className }: SkinIconProps) {
  const icons = {
    default: MessagesSquare,
    document: FileText,
    sheet: Table2,
    thread: MessageSquareText,
    notes: Notebook,
    focus: EyeOff,
  };
  const Icon = icons[id];

  return <Icon className={className} />;
}

export function BrowserFrame({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_24px_80px_rgba(16,24,40,0.16)]", className)}>
      <div className="flex h-9 items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b61]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffcc4d]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#3ecf8e]" />
        <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-500">
          <LayoutPanelTop className="h-3 w-3 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[330px] rounded-[32px] border border-zinc-800 bg-zinc-950 p-2 shadow-[0_28px_90px_rgba(2,6,23,0.34)]", className)}>
      <div className="relative overflow-hidden rounded-[24px] bg-white">
        <div className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-zinc-900/80" />
        {children}
      </div>
    </div>
  );
}

export function SkinShowcaseGrid({ room, framed = true }: { room: Room; framed?: boolean }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {privacySkins.map((skin) => (
        <div key={skin.id} className="min-w-0">
          {framed ? (
            <>
              <div className="sm:hidden">
                <PhoneFrame className="max-w-[300px]">
                  <SkinSurface room={room} skin={skin.id} compact />
                </PhoneFrame>
              </div>
              <BrowserFrame title={`whisperlink.app/${skin.shortName.toLowerCase()}`} className="hidden sm:block">
                <SkinSurface room={room} skin={skin.id} compact />
              </BrowserFrame>
            </>
          ) : (
            <SkinSurface room={room} skin={skin.id} compact />
          )}
          <div className="mt-3 flex items-start gap-3 text-left">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#dff7ef] text-[#0e6b57]">
              <SkinIcon id={skin.id} className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#14201c]">{skin.name}</h3>
              <p className="mt-1 text-xs font-medium leading-5 text-[#5c6864]">{skin.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CompactSkinGallery({ room }: { room: Room }) {
  const [activeSkin, setActiveSkin] = useState<PrivacySkinId>("default");
  const selected = getSkinOption(activeSkin);

  return (
    <div className="grid gap-4">
      <div className="md:hidden">
        <div className="overflow-hidden rounded-lg border border-[#dce8e3] bg-white">
          <SkinSurface room={room} skin={activeSkin} compact />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {privacySkins.map((skin) => (
            <button
              key={skin.id}
              type="button"
              onClick={() => setActiveSkin(skin.id)}
              className={cn(
                "flex min-h-11 min-w-[136px] items-center gap-2 rounded-lg border px-3 text-left text-sm font-black",
                activeSkin === skin.id
                  ? "border-[#0e6b57] bg-[#edf8f3] text-[#0e6b57]"
                  : "border-[#dce8e3] bg-white text-[#40514b]",
              )}
            >
              <SkinIcon id={skin.id} className="h-4 w-4 shrink-0" />
              {skin.name}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-[#dce8e3] bg-white p-4">
          <h2 className="text-sm font-black text-[#14201c]">{selected.name}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-[#5c6864]">{selected.description}</p>
          <Link href="/demo/room" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0e6b57] px-4 text-sm font-black text-white">
            Try this skin <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {privacySkins.map((skin) => (
          <article key={skin.id} className="overflow-hidden rounded-lg border border-[#dce8e3] bg-white shadow-sm">
            <div className="max-h-[280px] overflow-hidden border-b border-[#dce8e3] bg-[#f8fbfa]">
              <SkinSurface room={room} skin={skin.id} compact />
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#dff7ef] text-[#0e6b57]">
                  <SkinIcon id={skin.id} className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#14201c]">{skin.name}</h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-[#5c6864]">{skin.description}</p>
                </div>
              </div>
              <Link href="/demo/room" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#c8d8d1] bg-[#f8fbfa] px-4 text-sm font-black text-[#14201c]">
                Try this skin <ArrowRight className="h-4 w-4 text-[#0e6b57]" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function SkinSurface({
  room,
  skin,
  messages = room.messages,
  compact = false,
  focusRevealedIds = [],
  onToggleFocus,
}: SkinSurfaceProps) {
  if (skin === "document") return <DocumentSkin room={room} messages={messages} compact={compact} />;
  if (skin === "sheet") return <SheetSkin room={room} messages={messages} compact={compact} />;
  if (skin === "thread") return <ThreadSkin room={room} messages={messages} compact={compact} />;
  if (skin === "notes") return <NotesSkin room={room} messages={messages} compact={compact} />;
  if (skin === "focus") {
    return (
      <FocusSkin
        room={room}
        messages={messages}
        compact={compact}
        focusRevealedIds={focusRevealedIds}
        onToggleFocus={onToggleFocus}
      />
    );
  }

  return <DefaultChatSkin room={room} messages={messages} compact={compact} />;
}

function EmptyConversation({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <div className={cn(
      "grid min-h-[190px] place-items-center p-6 text-center",
      tone === "dark" ? "text-white" : "text-zinc-950",
    )}>
      <div>
        <div className={cn(
          "mx-auto grid h-11 w-11 place-items-center rounded-lg",
          tone === "dark" ? "bg-white/10" : "bg-zinc-100",
        )}>
          <MessagesSquare className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-black">Room is ready</p>
        <p className={cn("mt-1 text-xs leading-5", tone === "dark" ? "text-white/62" : "text-zinc-500")}>
          Share the private link to start a 1:1 chat.
        </p>
      </div>
    </div>
  );
}

function DefaultChatSkin({ room, messages, compact }: { room: Room; messages: Message[]; compact: boolean }) {
  return (
    <div className="bg-[#08120f] text-white">
      <div className="border-b border-white/10 bg-[#0d1915] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{room.title}</p>
            <p className="text-[11px] font-semibold text-white/55">No permanent readable record by default</p>
          </div>
          <span className="rounded-md border border-[#8ee6c0]/30 bg-[#8ee6c0]/12 px-2 py-1 text-[11px] font-black text-[#8ee6c0]">
            Active
          </span>
        </div>
      </div>
      {messages.length ? (
        <div className={cn("grid gap-3 px-4 py-4", compact ? "min-h-[250px]" : "min-h-[360px] sm:min-h-[440px]")}>
          {messages.slice(0, compact ? 3 : messages.length).map((message) => {
            const participant = getParticipant(room, message.participantId);
            const isCreator = participant.role === "creator";
            return (
              <div key={message.id} className={cn("flex", isCreator ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[82%] rounded-lg px-3 py-2 shadow-sm",
                  isCreator ? "bg-[#8ee6c0] text-[#07130f]" : "bg-white/10 text-white ring-1 ring-white/10",
                )}>
                  <p className="text-[11px] font-black opacity-70">{participant.label} - {message.sentAt}</p>
                  <p className="mt-1 text-sm font-medium leading-5">{message.body}</p>
                </div>
              </div>
            );
          })}
          {compact ? (
            <div className="mt-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/60">
              Typing indicator, expiry countdown, copy link, report, and destroy controls stay visible in the room.
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyConversation />
      )}
    </div>
  );
}

function DocumentSkin({ room, messages, compact }: { room: Room; messages: Message[]; compact: boolean }) {
  return (
    <div className="bg-[#f4f7f4] text-[#17211d]">
      <div className="border-b border-[#dfe6e1] bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#68756f]">
          <span className="rounded-md bg-[#eef3ef] px-2 py-1">File</span>
          <span className="rounded-md bg-[#eef3ef] px-2 py-1">Edit</span>
          <span className="rounded-md bg-[#dff7ef] px-2 py-1 text-[#0e6b57]">Review</span>
          <span className="ml-auto rounded-md border border-[#d9e2dc] px-2 py-1">Room expires with document</span>
        </div>
      </div>
      <div className={cn("grid gap-4 p-4 lg:grid-cols-[1fr_190px]", compact ? "min-h-[250px]" : "min-h-[360px] sm:min-h-[440px]")}>
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-[#e3e9e5]">
          <p className="text-xs font-black uppercase text-[#6d7974]">Private Room Notes</p>
          <h3 className="mt-3 text-xl font-black tracking-tight">Temporary conversation record</h3>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-[#45514c]">
            <p className="text-left">This view makes the screen look like a generic document editor.</p>
            <p className="text-left">The original messages are unchanged and exports remain clearly labeled.</p>
            <div className="mt-2 h-2 w-5/6 rounded-full bg-[#e7ece8]" />
            <div className="h-2 w-2/3 rounded-full bg-[#e7ece8]" />
            <div className="h-2 w-4/5 rounded-full bg-[#e7ece8]" />
          </div>
        </div>
        <div className="grid gap-2">
          {(messages.length ? messages : []).slice(0, compact ? 3 : messages.length).map((message, index) => {
            const participant = getParticipant(room, message.participantId);
            return (
              <div key={message.id} className="rounded-lg border border-[#dbe4de] bg-white p-3 shadow-sm">
                <p className="text-[11px] font-black text-[#0e6b57]">Comment {index + 1} - {participant.label}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-[#405049]">{message.body}</p>
              </div>
            );
          })}
          {!messages.length ? <EmptyConversation tone="light" /> : null}
        </div>
      </div>
    </div>
  );
}

function SheetSkin({ room, messages, compact }: { room: Room; messages: Message[]; compact: boolean }) {
  return (
    <div className="bg-[#f7faf8] text-[#17211d]">
      <div className="border-b border-[#d9e3dd] bg-[#fbfdfb] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#68756f]">
          <span className="rounded-md bg-[#e9f5ef] px-2 py-1 text-[#0e6b57]">Tasks</span>
          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-[#d9e3dd]">Status</span>
          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-[#d9e3dd]">Notes</span>
        </div>
      </div>
      <div className={cn("p-4", compact ? "min-h-[250px]" : "min-h-[360px] sm:min-h-[440px]")}>
        <div className="overflow-x-auto rounded-lg border border-[#d9e3dd] bg-white shadow-sm">
          <div className="min-w-[520px]">
          <div className="grid grid-cols-[50px_1fr_86px_74px] bg-[#edf4ef] text-[11px] font-black text-[#52615a]">
            <span className="border-r border-[#d9e3dd] px-3 py-2">ID</span>
            <span className="border-r border-[#d9e3dd] px-3 py-2">Private row</span>
            <span className="border-r border-[#d9e3dd] px-3 py-2">Owner</span>
            <span className="px-3 py-2">Time</span>
          </div>
          {messages.length ? messages.slice(0, compact ? 4 : messages.length).map((message, index) => {
            const participant = getParticipant(room, message.participantId);
            return (
              <div key={message.id} className="grid grid-cols-[50px_1fr_86px_74px] border-t border-[#e4ece7] text-xs">
                <span className="border-r border-[#e4ece7] px-3 py-3 font-mono text-[#718078]">{index + 1}</span>
                <span className="border-r border-[#e4ece7] px-3 py-3 font-medium text-[#23302a]">{message.body}</span>
                <span className="border-r border-[#e4ece7] px-3 py-3 font-bold text-[#0e6b57]">{participant.label}</span>
                <span className="px-3 py-3 font-mono text-[#718078]">{message.sentAt}</span>
              </div>
            );
          }) : (
            <div className="p-5">
              <EmptyConversation tone="light" />
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadSkin({ room, messages, compact }: { room: Room; messages: Message[]; compact: boolean }) {
  return (
    <div className="bg-[#f8fafc] text-[#17211d]">
      <div className="border-b border-[#dfe5ea] bg-white px-4 py-3">
        <p className="text-sm font-black">{room.title}</p>
        <p className="text-[11px] font-semibold text-[#6b747e]">Generic discussion thread - display-only privacy skin</p>
      </div>
      <div className={cn("grid gap-3 p-4", compact ? "min-h-[250px]" : "min-h-[360px] sm:min-h-[440px]")}>
        {messages.length ? messages.slice(0, compact ? 3 : messages.length).map((message) => {
          const participant = getParticipant(room, message.participantId);
          return (
            <article key={message.id} className="rounded-lg border border-[#dfe5ea] bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "grid h-7 w-7 place-items-center rounded-md text-xs font-black",
                  participant.tone === "mint" ? "bg-[#dff7ef] text-[#0e6b57]" : "bg-[#e7ecf6] text-[#2d466b]",
                )}>
                  {participant.initials}
                </span>
                <div>
                  <p className="text-xs font-black text-[#1d2924]">{participant.label}</p>
                  <p className="text-[11px] font-semibold text-[#78837e]">{message.sentAt} - room member</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-[#34423c]">{message.body}</p>
            </article>
          );
        }) : (
          <EmptyConversation tone="light" />
        )}
      </div>
    </div>
  );
}

function NotesSkin({ room, messages, compact }: { room: Room; messages: Message[]; compact: boolean }) {
  return (
    <div className="bg-[#fbfbf7] text-[#1f2824]">
      <div className="border-b border-[#e4e4da] bg-[#fffffb] px-4 py-3">
        <p className="text-sm font-black">Private notes</p>
        <p className="text-[11px] font-semibold text-[#74786c]">Clean notes app presentation</p>
      </div>
      <div className={cn("p-4", compact ? "min-h-[250px]" : "min-h-[360px] sm:min-h-[440px]")}>
        {messages.length ? (
          <div className="rounded-lg border border-[#e4e4da] bg-[#fffffb] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-[#ecece2] pb-3">
              <h3 className="text-lg font-black">Room recap</h3>
              <span className="rounded-md bg-[#edf8f1] px-2 py-1 text-[11px] font-black text-[#0e6b57]">Expiring</span>
            </div>
            <ul className="grid gap-3">
              {messages.slice(0, compact ? 4 : messages.length).map((message) => {
                const participant = getParticipant(room, message.participantId);
                return (
                  <li key={message.id} className="grid grid-cols-[auto_1fr] gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#0e6b57]" />
                    <div>
                      <p className="text-[11px] font-black uppercase text-[#74786c]">{participant.label} - {message.sentAt}</p>
                      <p className="mt-1 text-sm font-medium leading-6 text-[#303a35]">{message.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <EmptyConversation tone="light" />
        )}
      </div>
    </div>
  );
}

function FocusSkin({
  room,
  messages,
  compact,
  focusRevealedIds,
  onToggleFocus,
}: {
  room: Room;
  messages: Message[];
  compact: boolean;
  focusRevealedIds: string[];
  onToggleFocus?: (messageId: string) => void;
}) {
  return (
    <div className="bg-[#101413] text-white">
      <div className="border-b border-white/10 bg-[#151b19] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">Focus View</p>
            <p className="text-[11px] font-semibold text-white/55">Sensitive content masked until clicked</p>
          </div>
          <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-black text-[#8ee6c0]">Public-safe</span>
        </div>
      </div>
      <div className={cn("grid gap-3 p-4", compact ? "min-h-[250px]" : "min-h-[360px] sm:min-h-[440px]")}>
        {messages.length ? messages.slice(0, compact ? 4 : messages.length).map((message) => {
          const participant = getParticipant(room, message.participantId);
          const revealed = focusRevealedIds.includes(message.id);
          return (
            <button
              key={message.id}
              type="button"
              className="rounded-lg border border-white/10 bg-white/[0.06] p-3 text-left transition hover:bg-white/[0.09]"
              onClick={() => onToggleFocus?.(message.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-white/72">{participant.label} - {message.sentAt}</span>
                <EyeOff className="h-4 w-4 text-[#8ee6c0]" />
              </div>
              {revealed ? (
                <p className="mt-2 text-sm font-medium leading-6 text-white">{message.body}</p>
              ) : (
                <div className="mt-2 rounded-md bg-[#1e2925] px-3 py-3 text-sm font-black text-[#8ee6c0]">
                  Private message hidden
                </div>
              )}
            </button>
          );
        }) : (
          <EmptyConversation />
        )}
      </div>
    </div>
  );
}

export function SkinDisclosure({ skin }: { skin: PrivacySkinId }) {
  const option = getSkinOption(skin);

  return (
    <div className="rounded-lg border border-[#cfe2da] bg-[#f4fbf8] p-3 text-left text-xs font-semibold leading-5 text-[#43524b]">
      <span className="font-black text-[#0e6b57]">{option.name}:</span> {option.trustNote} Privacy skins change presentation only. They never alter the original message content.
    </div>
  );
}
