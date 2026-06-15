"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { AuthPageShell } from "@/components/auth-page-shell";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, fallbackNote } = useAuth();
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const result = await login(loginIdentifier, password);

      if (!result.ok) {
        setError(result.error ?? "Couldn't log in. Try again later.");
        return;
      }

      setStatus(result.accountType === "taxi_partner" ? "Logged in as Taxi Partner." : "Logged in as Rider.");
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : result.redirectTo ?? "/home");
    } catch {
      setError("Couldn't log in. Try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell>
      <section className="mx-auto grid w-full max-w-md gap-4 rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        <div className="grid gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="text-3xl font-black text-[var(--rp-text)]">Log in</h1>
          <p className="text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            Log in to join shared taxi pods or manage Taxi Partner tools.
          </p>
          <p className="text-xs font-bold leading-5 text-[var(--rp-muted)]">
            RidePod detects your account type after login.
          </p>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-black text-[var(--rp-text)]">Account name or email</span>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(event) => setLoginIdentifier(event.target.value)}
              required
              className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold outline-none focus:border-[var(--rp-primary)]"
            />
            <span className="text-xs font-bold leading-5 text-[var(--rp-muted)]">
              Use your RidePod account name. Email also works.
            </span>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-black text-[var(--rp-text)]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold outline-none focus:border-[var(--rp-primary)]"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--rp-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        {status ? <p className="text-sm font-black text-[var(--rp-success)]">{status}</p> : null}
        {fallbackNote ? <p className="text-xs font-bold leading-5 text-[var(--rp-muted)]">{fallbackNote}</p> : null}
        {error ? <p className="text-sm font-black text-[var(--rp-danger)]">{error}</p> : null}

        <p className="text-sm font-semibold text-[var(--rp-muted)]">
          New to RidePod?{" "}
          <Link
            href="/register"
            onClick={(event) => {
              const next = new URLSearchParams(window.location.search).get("next");
              if (!next || !next.startsWith("/")) return;
              event.preventDefault();
              router.push(`/register?next=${encodeURIComponent(next)}`);
            }}
            className="font-black text-[var(--rp-primary)]"
          >
            Create account
          </Link>
        </p>
      </section>
    </AuthPageShell>
  );
}
