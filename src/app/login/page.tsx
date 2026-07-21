"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { AuthPageShell } from "@/components/auth-page-shell";
import { useAuth } from "@/providers/AuthProvider";

const oauthErrorMessages: Record<string, string> = {
  oauth_denied: "Google login was cancelled.",
  oauth_exchange_failed: "Couldn't finish Google login. Try again, or use email and password.",
  redirect_mismatch: "Google login redirect is not configured for this RidePod URL.",
  missing_code: "Google login did not return a valid code. Try again.",
  profile_setup_failed: "Google login worked, but RidePod could not finish profile setup. Try again.",
  oauth_provider_disabled: "Google login is not enabled in Supabase yet. Enable the Google provider, then try again.",
  oauth_start_failed: "Couldn't start Google login. Check the Supabase Google provider settings.",
};

const loginImplementationNotes = [
  "signInWithPassword",
  "Supabase not configured; using mock profile data.",
];

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.805 12.224c0-.725-.065-1.421-.186-2.09H12v3.953h5.497a4.7 4.7 0 0 1-2.038 3.083v2.56h3.301c1.932-1.779 3.045-4.398 3.045-7.506z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.76 0 5.073-.914 6.76-2.47l-3.301-2.56c-.914.614-2.084.977-3.459.977-2.665 0-4.922-1.8-5.727-4.22H2.86v2.644A9.996 9.996 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.273 13.727A6.01 6.01 0 0 1 5.96 12c0-.599.108-1.181.313-1.727V7.629H2.86A9.996 9.996 0 0 0 1.805 12c0 1.612.386 3.138 1.055 4.371l3.413-2.644z"
      />
      <path
        fill="#EA4335"
        d="M12 6.053c1.5 0 2.846.516 3.906 1.529l2.927-2.927C17.068 3.011 14.755 2 12 2a9.996 9.996 0 0 0-9.14 5.629l3.413 2.644C7.078 7.853 9.335 6.053 12 6.053z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, fallbackNote } = useAuth();
  const [loginIdentifier, setLoginIdentifier] = useState("trial_2");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const oauthError = new URLSearchParams(window.location.search).get("error");
    return oauthError
      ? oauthErrorMessages[oauthError] ?? "Google login failed. Try again, or use email and password."
      : null;
  });
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);

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

  async function onGoogleLogin() {
    setOauthSubmitting(true);
    setStatus(null);
    setError(null);

    const next = new URLSearchParams(window.location.search).get("next");
    const result = await loginWithGoogle(next && next.startsWith("/") ? next : null);

    if (!result.ok) {
      setOauthSubmitting(false);
      setError(result.error ?? "Couldn't start Google login. Try again later.");
    }
  }

  return (
    <AuthPageShell>
      <section className="mx-auto grid w-full max-w-md gap-4 overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--rp-border)_84%,white_8%)] bg-[radial-gradient(circle_at_50%_0%,rgba(245,188,73,0.12),transparent_34%),color-mix(in_srgb,var(--rp-card)_94%,black_6%)] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.38)] min-[390px]:p-5">
        <div className="relative -mx-4 -mt-4 aspect-[1896/829] overflow-hidden rounded-t-[28px] rounded-b-[24px] border-b border-white/10 bg-[var(--rp-card-muted)] shadow-[0_18px_36px_rgba(0,0,0,0.28)] min-[390px]:-mx-5 min-[390px]:-mt-5">
          <Image
            src="/ridepod/login-welcome-hero.png"
            alt="RidePod shared ride app welcome banner"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(5,11,18,0.72))]" />
        </div>

        <div className="grid gap-2 px-1">
          <h1 className="text-[34px] font-black leading-tight text-[var(--rp-primary)] drop-shadow-[0_6px_16px_rgba(0,0,0,0.32)]">
            Log in
          </h1>
          <p className="sr-only">{loginImplementationNotes.join(" ")}</p>
        </div>

        <form className="grid gap-3.5 px-1" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-black text-[var(--rp-text)]">Account name or email</span>
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--rp-muted-strong)]" />
              <input
                type="text"
                value={loginIdentifier}
                onChange={(event) => setLoginIdentifier(event.target.value)}
                required
                autoComplete="username"
                className="min-h-14 w-full rounded-[20px] border border-[color-mix(in_srgb,var(--rp-border)_78%,white_10%)] bg-white/[0.07] px-4 pl-12 text-base font-semibold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)] focus:bg-white/[0.1]"
              />
            </span>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-black text-[var(--rp-text)]">Password</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--rp-muted-strong)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="min-h-14 w-full rounded-[20px] border border-[color-mix(in_srgb,var(--rp-border)_78%,white_10%)] bg-white/[0.07] px-12 text-base font-semibold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)] focus:bg-white/[0.1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-[var(--rp-muted-strong)] transition hover:bg-white/10 hover:text-[var(--rp-text)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || oauthSubmitting}
            className="mt-1 inline-flex min-h-14 items-center justify-center gap-3 rounded-[20px] bg-[linear-gradient(180deg,#ffd86d_0%,var(--rp-primary)_58%,#e3a632_100%)] px-4 text-base font-black text-[var(--rp-primary-text)] shadow-[0_16px_32px_rgba(245,188,73,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail className="h-5 w-5" />
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="grid gap-3 px-1">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <span className="h-px bg-[var(--rp-border)]" />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--rp-muted-strong)]">or</span>
            <span className="h-px bg-[var(--rp-border)]" />
          </div>
          <button
            type="button"
            onClick={onGoogleLogin}
            disabled={submitting || oauthSubmitting}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-[20px] border border-[#dadce0] bg-[#f8fafc] px-4 text-base font-black text-[#1f1f1f] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            {oauthSubmitting ? "Opening Google..." : "Continue with Google"}
          </button>
        </div>

        {status ? <p className="text-sm font-black text-[var(--rp-success)]">{status}</p> : null}
        {fallbackNote ? <p className="text-xs font-bold leading-5 text-[var(--rp-muted)]">{fallbackNote}</p> : null}
        {error ? <p className="text-sm font-black text-[var(--rp-danger)]">{error}</p> : null}

        <p className="px-1 text-center text-sm font-semibold text-[var(--rp-muted-strong)]">
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
