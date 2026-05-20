"use client";

import Link from "next/link";
import { useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
      const client = getSupabaseBrowserClient();
      const result = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError("Couldn't log in. Check your details and try again.");
      } else {
        setStatus("Logged in.");
      }
    } catch (caughtError) {
      if (isMissingSupabaseConfig(caughtError)) {
        setStatus("Supabase not configured; using mock profile data.");
      } else {
        setError("Couldn't log in. Try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--rp-gradient-app)] px-4 py-8 text-[var(--rp-text)]">
      <section className="mx-auto grid w-full max-w-md gap-4 rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        <div className="grid gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="text-3xl font-black text-[var(--rp-text)]">Log in</h1>
          <p className="text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            Log in to continue to protected RidePod actions.
          </p>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-black text-[var(--rp-text)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold outline-none focus:border-[var(--rp-primary)]"
            />
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
        {error ? <p className="text-sm font-black text-[var(--rp-danger)]">{error}</p> : null}

        <p className="text-sm font-semibold text-[var(--rp-muted)]">
          New to RidePod?{" "}
          <Link href="/register" className="font-black text-[var(--rp-primary)]">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
