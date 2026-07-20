"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, KeyRound, LockKeyhole, ShieldAlert, ShieldCheck, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import { WhisperPageShell } from "@/components/whisperlink/states";
import {
  demoRoom,
  formatRoomDateTime,
  getMessageExpiryLabel,
  getSkinOption,
  loadStoredRoom,
  type Room,
} from "@/lib/whisperlink";

type AccessState = "ready" | "wrong_passcode" | "expired" | "destroyed" | "invalid" | "revoked";

export function WhisperJoinPage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room>(demoRoom);
  const [passcode, setPasscode] = useState("");
  const [consent, setConsent] = useState(false);
  const [accessState, setAccessState] = useState<AccessState>("ready");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = loadStoredRoom();
      if (stored) setRoom(stored);

      const params = new URLSearchParams(window.location.search);
      const requestedState = params.get("state");
      if (requestedState === "invalid" || requestedState === "revoked") {
        setAccessState(requestedState);
        return;
      }

      const status = stored?.status ?? demoRoom.status;
      if (status === "expired" || status === "destroyed" || status === "invalid" || status === "revoked") {
        setAccessState(status);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const skin = getSkinOption(room.privacySkin);
  const disabled = !consent || (room.passcodeEnabled && !passcode.trim());

  function enterRoom() {
    if (room.passcodeEnabled && passcode.trim() !== room.passcode) {
      setAccessState("wrong_passcode");
      return;
    }

    router.push("/demo/room");
  }

  if (accessState !== "ready" && accessState !== "wrong_passcode") {
    return <JoinAccessState state={accessState} />;
  }

  return (
    <WhisperPageShell eyebrow="Guest join">
      <section className="mx-auto grid max-w-5xl gap-4 px-3 py-4 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10">
        <div className="rounded-lg border border-[#dce8e3] bg-white p-4 shadow-[0_24px_80px_rgba(16,24,40,0.1)] sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#cfe2da] bg-[#edf8f3] px-3 py-2 text-xs font-black text-[#0e6b57]">
            <LockKeyhole className="h-4 w-4" />
            Private temporary room
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-[#14201c] sm:text-4xl">{room.title}</h1>
          <p className="mt-2 text-left text-sm font-medium leading-6 text-[#5c6864]">
            Created by {room.creatorLabel || "Room creator"}. Review the limits before entering.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <JoinMetric icon={<Timer className="h-4 w-4" />} label="Expires" value={formatRoomDateTime(room.expiresAt)} />
            <JoinMetric icon={<ShieldCheck className="h-4 w-4" />} label="Skin" value={skin.shortName} />
            <JoinMetric icon={<KeyRound className="h-4 w-4" />} label="Passcode" value={room.passcodeEnabled ? "Required" : "Off"} />
            <JoinMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Messages" value={getMessageExpiryLabel(room.messageExpiryMode)} />
          </div>

          <div className="mt-5 grid gap-3">
            {room.passcodeEnabled ? (
              <label className="block rounded-lg border border-[#dce8e3] bg-[#f8fbfa] p-4">
                <span className="text-sm font-black text-[#14201c]">Passcode</span>
                <input
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    if (accessState === "wrong_passcode") setAccessState("ready");
                  }}
                  inputMode="numeric"
                  placeholder="Enter room code"
                  className="mt-2 min-h-12 w-full rounded-lg border border-[#c8d8d1] bg-white px-4 font-mono text-sm font-black text-[#14201c] outline-none placeholder:tracking-normal placeholder:text-[#8a9892] focus:border-[#0e6b57]"
                />
                {accessState === "wrong_passcode" ? (
                  <p className="mt-2 text-left text-xs font-black text-[#9a4d16]">Wrong passcode. Check the code and try again.</p>
                ) : null}
              </label>
            ) : null}

            <label className="flex items-start gap-3 rounded-lg border border-[#dce8e3] bg-white p-4">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-[#c8d8d1] accent-[#0e6b57]"
              />
              <span className="text-left text-sm font-bold leading-6 text-[#40514b]">
                I understand this is a private temporary room and screenshots/copied links cannot be technically prevented.
              </span>
            </label>

            <button
              type="button"
              onClick={enterRoom}
              disabled={disabled}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0e6b57] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enter room <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-[#f0d8c9] bg-[#fff7ed] p-4">
            <ShieldAlert className="h-5 w-5 text-[#9a4d16]" />
            <p className="mt-3 text-left text-sm font-black text-[#9a4d16]">Privacy limitations</p>
            <div className="mt-2 grid gap-2">
              {[
                "Privacy skins change display only.",
                "Copied links and screenshots cannot be technically prevented.",
                "Only enter if you trust the person who sent the room link.",
              ].map((item) => (
                <p key={item} className="text-left text-xs font-bold leading-5 text-[#72411c]">{item}</p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#dce8e3] bg-white p-4">
            <p className="text-left text-sm font-black text-[#14201c]">Access states</p>
            <div className="mt-3 grid gap-2">
              <StatePreview label="Room expired" href="/demo/expired" />
              <StatePreview label="Invalid link" href="/join?state=invalid" />
              <StatePreview label="Revoked link" href="/join?state=revoked" />
            </div>
          </div>
        </aside>
      </section>
    </WhisperPageShell>
  );
}

function JoinAccessState({ state }: { state: Exclude<AccessState, "ready" | "wrong_passcode"> }) {
  const copy: Record<typeof state, { title: string; body: string; badge: string }> = {
    expired: {
      title: "This room has expired.",
      body: "The private link no longer opens the conversation. Ask the creator to start a new room if you still need to talk.",
      badge: "Expired",
    },
    destroyed: {
      title: "Room destroyed by creator.",
      body: "The creator closed this room. The link no longer opens the conversation.",
      badge: "Destroyed",
    },
    invalid: {
      title: "Invalid room link.",
      body: "This link is incomplete or does not match an active room.",
      badge: "Invalid",
    },
    revoked: {
      title: "Room link revoked.",
      body: "This link was revoked and can no longer be used to enter.",
      badge: "Revoked",
    },
  };
  const selected = copy[state];

  return (
    <WhisperPageShell eyebrow={selected.badge}>
      <section className="mx-auto grid min-h-[72svh] max-w-3xl place-items-center px-5 py-12 text-center sm:px-8">
        <div className="rounded-lg border border-[#dce8e3] bg-white p-8 shadow-[0_24px_80px_rgba(16,24,40,0.12)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-[#fff1e8] text-[#b4531b]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <span className="mt-5 inline-flex rounded-md bg-[#fff7ed] px-3 py-1 text-xs font-black text-[#9a4d16] ring-1 ring-[#f0d8c9]">
            {selected.badge}
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-[#14201c]">{selected.title}</h1>
          <p className="mt-3 text-center text-sm font-medium leading-6 text-[#5c6864]">{selected.body}</p>
          <div className="mt-6 grid gap-3 sm:flex sm:justify-center">
            <Link
              href="/create"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0e6b57] px-5 text-sm font-black text-white"
            >
              Create a new room <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/join"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#c8d8d1] bg-white px-5 text-sm font-black text-[#14201c]"
            >
              Back to join
            </Link>
          </div>
        </div>
      </section>
    </WhisperPageShell>
  );
}

function JoinMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dce8e3] bg-[#f8fbfa] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-[#66736e]">{label}</p>
        <span className="text-[#0e6b57]">{icon}</span>
      </div>
      <p className="mt-2 truncate text-sm font-black text-[#14201c]">{value}</p>
    </div>
  );
}

function StatePreview({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-10 items-center justify-between gap-3 rounded-lg border border-[#dce8e3] bg-[#f8fbfa] px-3 text-sm font-black text-[#14201c]",
      )}
    >
      {label}
      <ArrowRight className="h-4 w-4 text-[#0e6b57]" />
    </Link>
  );
}
