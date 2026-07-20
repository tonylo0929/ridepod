import Link from "next/link";
import { ArrowRight, Clock3, Home, LoaderCircle, ShieldAlert } from "lucide-react";
import { WhisperLogo } from "@/components/whisperlink/brand";

export function WhisperPageShell({
  children,
  eyebrow,
}: {
  children: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <main className="whisperlink-shell min-h-screen bg-[#f3f7f6] text-[#14201c]">
      <header className="border-b border-[#dce8e3] bg-white/86 px-5 py-4 backdrop-blur sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" aria-label="WhisperLink home">
            <WhisperLogo />
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-bold text-[#40514b] md:flex">
            <Link href="/create">Create</Link>
            <Link href="/demo/room">Demo Room</Link>
            <Link href="/demo/skins">Skins</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/trust">Trust</Link>
          </nav>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#c8d8d1] bg-white px-4 text-sm font-black text-[#14201c] shadow-sm"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Landing</span>
          </Link>
        </div>
        {eyebrow ? (
          <div className="mx-auto mt-4 max-w-7xl">
            <p className="text-left text-xs font-black uppercase tracking-[0.18em] text-[#0e6b57]">{eyebrow}</p>
          </div>
        ) : null}
      </header>
      {children}
    </main>
  );
}

export function WhisperLoadingState({ label = "Preparing private room" }: { label?: string }) {
  return (
    <WhisperPageShell eyebrow="Loading">
      <section className="mx-auto grid min-h-[72svh] max-w-3xl place-items-center px-5 py-16 text-center sm:px-8">
        <div className="w-full rounded-lg border border-[#dce8e3] bg-white p-8 shadow-[0_24px_80px_rgba(16,24,40,0.12)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-[#dff7ef] text-[#0e6b57]">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-[#14201c]">{label}</h1>
          <p className="mt-3 text-center text-sm font-medium leading-6 text-[#5c6864]">
            Preparing a temporary room shell and checking expiry settings.
          </p>
          <div className="mt-6 grid gap-2">
            <div className="h-3 rounded-full bg-[#edf4f1]" />
            <div className="mx-auto h-3 w-4/5 rounded-full bg-[#edf4f1]" />
            <div className="mx-auto h-3 w-2/3 rounded-full bg-[#edf4f1]" />
          </div>
        </div>
      </section>
    </WhisperPageShell>
  );
}

export function ExpiredRoomState() {
  return (
    <WhisperPageShell eyebrow="Expired room demo">
      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <div className="rounded-lg border border-[#dce8e3] bg-white p-6 shadow-[0_24px_80px_rgba(16,24,40,0.1)]">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-[#fff1e8] text-[#b4531b]">
            <Clock3 className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-[#14201c]">This room has expired.</h1>
          <p className="mt-4 text-left text-base font-medium leading-7 text-[#5c6864]">
            The private link no longer opens the conversation. By default, WhisperLink does not keep a permanent readable room record.
          </p>
          <div className="mt-6 rounded-lg border border-[#f0d8c9] bg-[#fff7ed] p-4">
            <p className="text-left text-sm font-black text-[#9a4d16]">Honest privacy note</p>
            <p className="mt-1 text-left text-sm font-semibold leading-6 text-[#72411c]">
              If someone copied text or took screenshots before expiry, WhisperLink cannot technically erase those copies.
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:flex">
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0e6b57] px-5 text-sm font-black text-white"
            >
              Create another room <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo/room"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#c8d8d1] bg-white px-5 text-sm font-black text-[#14201c]"
            >
              View active demo
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-[#dce8e3] bg-[#f8fbfa] p-5">
          <div className="rounded-lg border border-[#e3ebe6] bg-white p-5">
            <div className="flex items-center justify-between gap-4 border-b border-[#e6eee9] pb-4">
              <div>
                <p className="text-left text-xs font-black uppercase tracking-[0.14em] text-[#8a9892]">Room wl-expired-19q2</p>
                <h2 className="mt-1 text-xl font-black text-[#14201c]">Conversation unavailable</h2>
              </div>
              <span className="rounded-lg bg-[#fff1e8] px-3 py-1 text-xs font-black text-[#b4531b]">Expired</span>
            </div>
            <div className="grid min-h-[280px] place-items-center text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-[#edf4f1] text-[#61706a]">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <p className="mt-4 text-center text-sm font-black text-[#14201c]">No messages to show</p>
                <p className="mt-2 max-w-sm text-center text-sm font-medium leading-6 text-[#5c6864]">
                  The room ended at its scheduled expiry time. A new room gets a new link and new settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </WhisperPageShell>
  );
}
