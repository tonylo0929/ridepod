"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CircleHelp,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  PlusCircle,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/components/ui";
import { RidePodLogo } from "@/components/ridepod-logo";

const menuItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/create", label: "Create pod", icon: PlusCircle },
  { href: "/pods", label: "My pods", icon: UsersRound },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/host", label: "Host dashboard", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/host", label: "Live chat", icon: MessageCircle },
];

export function HomeMenuDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Open sidebar"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-14 w-14 place-items-center rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)] backdrop-blur-xl transition hover:bg-[var(--rp-card-muted)]"
      >
        <Menu className="h-7 w-7" />
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 transition",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          aria-label="Close sidebar overlay"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          aria-label="RidePod sidebar"
          className={cn(
            "absolute bottom-0 right-0 top-0 flex w-[86vw] max-w-[390px] flex-col border-l border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-4 text-[var(--rp-text)] shadow-[-28px_0_80px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 py-3 text-center">
              <RidePodLogo className="mx-auto h-10 justify-center" />
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--rp-muted)]">
                Premium ride pods
              </p>
            </div>
            <button
              aria-label="Close sidebar"
              onClick={() => setOpen(false)}
              className="grid h-14 w-14 place-items-center rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]"
            >
              <X className="h-7 w-7" />
            </button>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-5 flex items-center gap-4 rounded-[24px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] p-4"
          >
            <div className="grid h-14 w-14 place-items-center rounded-[20px] bg-[var(--rp-primary)] text-xl font-black text-[var(--rp-primary-text)]">
              M
            </div>
            <div>
              <p className="text-lg font-black text-[var(--rp-text)]">Maya Chen</p>
              <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">View profile</p>
            </div>
          </Link>

          <nav className="mt-7 grid gap-2">
            {menuItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 rounded-[18px] px-4 py-3 text-lg font-bold text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                <item.icon className="h-5 w-5 text-[var(--rp-primary)]" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-[var(--rp-border)] pt-4">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="mb-3 flex items-center gap-4 rounded-[18px] px-4 py-3 text-base font-bold text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
            >
              <CircleHelp className="h-5 w-5 text-[var(--rp-primary)]" />
              Help & safety
            </Link>
            <button className="flex w-full items-center gap-4 rounded-[18px] px-4 py-3 text-left text-base font-bold text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]">
              <LogOut className="h-5 w-5 text-[var(--rp-primary)]" />
              Logout
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
