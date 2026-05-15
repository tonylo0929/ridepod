"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CircleHelp,
  CalendarCheck,
  Home,
  Info,
  LogOut,
  Menu,
  MessageCircle,
  PlusCircle,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { RidePodLogo } from "@/components/ridepod-logo";
import { cn } from "@/components/ui";

const primaryItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/pods", label: "My Pods", icon: CalendarCheck },
  { href: "/create", label: "Create Pod", icon: PlusCircle },
  { href: "/host", label: "Chat", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/notifications", label: "Updates", icon: Bell },
];

const supportItems = [
  { href: "/how-it-works", label: "How it works", icon: ShieldCheck },
  { href: "/faq", label: "FAQ", icon: CircleHelp },
  { href: "/about", label: "About", icon: Info },
  { href: "/settings", label: "Settings", icon: Settings },
];

function DrawerNavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active =
    href === "/home" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "ridepod-drawer-link flex min-h-14 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold transition",
        active && "is-active",
      )}
    >
      <span className="ridepod-drawer-link-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl">
        <Icon className="h-5 w-5" />
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function HomeMenuDrawer() {
  const [open, setOpen] = useState(false);
  const closeDrawer = () => setOpen(false);

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
          "fixed inset-0 z-[80] transition lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          aria-label="Close sidebar overlay"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-[rgba(15,23,42,0.55)] transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          aria-label="RidePod sidebar"
          className={cn(
            "ridepod-mobile-drawer absolute inset-y-0 left-0 z-[90] flex h-[100dvh] w-[min(82vw,420px)] flex-col overflow-y-auto overscroll-contain border-r shadow-[24px_0_70px_rgba(0,0,0,0.34)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="ridepod-drawer-header border-b px-5 pb-5 pt-[max(18px,env(safe-area-inset-top))]">
            <div className="flex items-start justify-between gap-4">
              <Link
                href="/home"
                onClick={closeDrawer}
                aria-label="RidePod home"
                className="min-w-0"
              >
                <span className="ridepod-drawer-logo-card inline-flex rounded-2xl border px-3 py-2">
                  <RidePodLogo className="h-9" imageClassName="max-w-[150px]" priority />
                </span>
                <span className="ridepod-drawer-subtitle mt-2 block text-[12px] font-black uppercase tracking-[0.18em]">
                  Premium ride pods
                </span>
              </Link>

              <button
                type="button"
                aria-label="Close sidebar"
                onClick={closeDrawer}
                className="ridepod-drawer-close grid h-14 w-14 shrink-0 place-items-center rounded-2xl border transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <Link
              href="/profile"
              onClick={closeDrawer}
              className="ridepod-drawer-profile mt-5 flex items-center gap-3 rounded-2xl border p-3 transition"
            >
              <span className="ridepod-drawer-avatar grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-black text-white">
                M
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-black">Maya Chen</span>
                <span className="ridepod-drawer-profile-subtitle block text-sm font-semibold">View profile</span>
              </span>
            </Link>
          </div>

          <div className="flex min-h-[520px] flex-1 flex-col">
            <nav className="grid gap-1 px-4 py-5">
              {primaryItems.map((item) => (
                <DrawerNavLink key={item.href} {...item} onNavigate={closeDrawer} />
              ))}
            </nav>

            <div className="ridepod-drawer-divider mx-5 border-t pt-4">
              <p className="ridepod-drawer-section-label px-2 text-[11px] font-black uppercase tracking-[0.18em]">
                Support
              </p>
              <nav className="mt-2 grid gap-1">
                {supportItems.map((item) => (
                  <DrawerNavLink key={`${item.href}-${item.label}`} {...item} onNavigate={closeDrawer} />
                ))}
              </nav>
            </div>

            <div className="ridepod-drawer-divider mt-auto border-t p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="ridepod-drawer-link flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-semibold transition"
              >
                <span className="ridepod-drawer-link-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                  <LogOut className="h-5 w-5" />
                </span>
                Logout
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
