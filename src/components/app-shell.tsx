"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  CircleHelp,
  Home,
  Info,
  MessageCircle,
  PlusCircle,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui";
import { RidePodLogo } from "@/components/ridepod-logo";
import { HomeMenuDrawer } from "@/components/home-menu-drawer";

const primaryNav = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/pods", label: "My Pods", icon: CalendarCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const utilityNav = [
  { href: "/host", label: "Host", icon: UsersRound },
  { href: "/admin/review", label: "Admin review", icon: ShieldAlert },
  { href: "/how-it-works", label: "How it works", icon: ShieldCheck },
  { href: "/faq", label: "FAQ", icon: CircleHelp },
  { href: "/about", label: "About", icon: Info },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  compact,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active =
    href === "/home" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
          : "text-[var(--rp-muted)] hover:bg-[var(--rp-card-muted)] hover:text-[var(--rp-text)]",
        compact && "flex-1 flex-col gap-1 rounded-none px-1 py-2 text-[11px]",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function PremiumBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] shadow-[var(--rp-shadow-nav)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center">
        <NavLink href="/home" label="Home" icon={Home} compact />
        <NavLink href="/pods" label="My Pods" icon={CalendarCheck} compact />
        <NavLink href="/notifications" label="Updates" icon={Bell} compact />
        <NavLink href="/host" label="Chat" icon={MessageCircle} compact />
        <NavLink href="/profile" label="Profile" icon={UserRound} compact />
      </div>
    </nav>
  );
}

function PremiumTopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-3xl grid-cols-[56px_1fr_auto] items-center gap-3">
        <HomeMenuDrawer />
        <Link href="/home" className="justify-self-center" aria-label="RidePod home">
          <RidePodLogo className="h-9 justify-center" priority />
        </Link>
        <div className="flex justify-self-end gap-2">
          <ThemeToggle compact />
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative grid h-12 w-12 place-items-center rounded-[20px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <Bell className="h-5 w-5 stroke-[2.2]" />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full border border-[var(--rp-shell)] bg-[var(--rp-primary)]" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="premium-app min-h-screen bg-[var(--rp-gradient-app)] text-[var(--rp-text)]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[var(--rp-border)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] lg:block">
        <Link href="/" className="grid gap-1">
          <RidePodLogo className="h-9" priority />
          <p className="text-xs font-medium text-[var(--rp-muted)]">Executive ride pods</p>
        </Link>

        <nav className="mt-8 grid gap-1">
          {primaryNav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="mt-8 border-t border-[var(--rp-border)] pt-6">
          <p className="px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--rp-primary)]">
            Tools
          </p>
          <nav className="mt-3 grid gap-1">
            {utilityNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-[var(--rp-border)] pt-6">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <div>
              <p className="text-sm font-black text-[var(--rp-text)]">Theme</p>
              <p className="text-xs text-[var(--rp-muted)]">Dark or travel light</p>
            </div>
            <ThemeToggle compact />
          </div>
        </div>

        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <p className="text-sm font-bold">Host workflow</p>
          <p className="mt-1 text-xs leading-5 text-[var(--rp-muted)]">
            Payments are mocked, but every screen assumes hosts never chase members manually.
          </p>
        </div>
      </aside>

      <PremiumTopNav />

      <main
        className={cn(
          "mx-auto w-full px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:px-10 lg:pb-12 lg:pt-8",
          "max-w-3xl lg:max-w-5xl",
        )}
      >
        {children}
      </main>

      <PremiumBottomNav />
    </div>
  );
}
