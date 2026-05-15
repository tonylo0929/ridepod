"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CircleHelp,
  CalendarCheck,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  PlusCircle,
  Settings,
  UserRound,
  X,
} from "lucide-react";
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
  { href: "/settings", label: "Help & safety", icon: CircleHelp },
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
        "flex min-h-14 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold text-[#334155] transition",
        "hover:bg-[#f1f5f9] hover:text-[#071326]",
        active && "bg-[#e6fbf9] text-[#071326] shadow-[inset_3px_0_0_#078c99]",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f8fafc] text-[#078c99]",
          active && "bg-[#ffffff] text-[#056f78]",
        )}
      >
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
            "absolute inset-y-0 left-0 z-[90] flex h-[100dvh] w-[min(82vw,420px)] flex-col overflow-hidden border-r border-[rgba(15,23,42,0.08)] text-[#071326] shadow-[24px_0_70px_rgba(15,23,42,0.24)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="border-b border-[rgba(15,23,42,0.08)] px-5 pb-5 pt-[max(18px,env(safe-area-inset-top))]">
            <div className="flex items-start justify-between gap-4">
              <Link
                href="/home"
                onClick={closeDrawer}
                aria-label="RidePod home"
                className="min-w-0"
              >
                <span className="inline-flex rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                  <Image
                    src="/ridepod/lightmode-logo.png"
                    alt="RidePod"
                    width={260}
                    height={72}
                    priority
                    className="h-auto w-[150px] object-contain"
                  />
                </span>
                <span className="mt-2 block text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b]">
                  Premium ride pods
                </span>
              </Link>

              <button
                type="button"
                aria-label="Close sidebar"
                onClick={closeDrawer}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[rgba(15,23,42,0.10)] bg-[#f8fafc] text-[#071326] transition hover:bg-[#eef2f7]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <Link
              href="/profile"
              onClick={closeDrawer}
              className="mt-5 flex items-center gap-3 rounded-2xl border border-[#b8ebe7] bg-[#e6fbf9] p-3 text-[#071326] transition hover:bg-[#d8f6f3]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#078c99] text-base font-black text-white">
                M
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-black">Maya Chen</span>
                <span className="block text-sm font-semibold text-[#497174]">View profile</span>
              </span>
            </Link>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <nav className="grid gap-1 px-4 py-5">
              {primaryItems.map((item) => (
                <DrawerNavLink key={item.href} {...item} onNavigate={closeDrawer} />
              ))}
            </nav>

            <div className="mx-5 border-t border-[rgba(15,23,42,0.08)] pt-4">
              <p className="px-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#078c99]">
                Support
              </p>
              <nav className="mt-2 grid gap-1">
                {supportItems.map((item) => (
                  <DrawerNavLink key={`${item.href}-${item.label}`} {...item} onNavigate={closeDrawer} />
                ))}
              </nav>
            </div>

            <div className="mt-auto border-t border-[rgba(15,23,42,0.08)] p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-semibold text-[#334155] transition hover:bg-[#f1f5f9] hover:text-[#071326]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f8fafc] text-[#078c99]">
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
