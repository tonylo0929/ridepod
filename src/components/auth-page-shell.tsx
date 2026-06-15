"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  History as HistoryIcon,
  Home,
  Info,
  LogIn,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { HomeMenuDrawer } from "@/components/home-menu-drawer";
import { RidePodAvatar, useRidePodAvatarPreference } from "@/components/animal-avatar";
import { RidePodLogo } from "@/components/ridepod-logo";
import { cn } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

const authPrimaryItems = [
  { href: "/about", label: "About", icon: Info },
  { href: "/support", label: "Support RidePod", icon: Coffee },
  { href: "/history", label: "Ride history", icon: HistoryIcon, requiresAuth: true },
  { href: "/chats", label: "Live Chat", icon: MessageCircle, requiresAuth: true },
];

function AuthSidebarLink({
  href,
  label,
  icon: Icon,
  requiresAuth,
  isLoggedIn,
  badgeCount,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  requiresAuth?: boolean;
  isLoggedIn?: boolean;
  badgeCount?: number;
}) {
  const pathname = usePathname();
  const destination = requiresAuth && !isLoggedIn ? `/login?next=${encodeURIComponent(href)}` : href;
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={destination}
      className={cn(
        "ridepod-drawer-link flex min-h-14 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold transition",
        active && "is-active",
      )}
    >
      <span className="ridepod-drawer-link-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {badgeCount ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--rp-primary)] px-1 text-[10px] font-black text-[var(--rp-primary-text)]">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function AuthSidebarAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Home;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ridepod-drawer-link flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-semibold transition"
    >
      <span className="ridepod-drawer-link-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}

function AuthDesktopSidebar() {
  const { profile, logout, user } = useAuth();
  const isLoggedIn = Boolean(user);
  const displayName = isLoggedIn ? profile?.display_name ?? "RidePod account" : "Guest rider";
  const profileSubtitle = isLoggedIn ? "View profile" : "Log in or create account";
  const initials = displayName
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "R";
  const [avatarPreference] = useRidePodAvatarPreference(profile?.id);
  const profileHref = isLoggedIn ? "/profile" : `/login?next=${encodeURIComponent("/profile")}`;

  return (
    <aside className="ridepod-mobile-drawer fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r text-[var(--rp-text)] shadow-[24px_0_70px_rgba(0,0,0,0.22)] lg:block">
      <div className="ridepod-drawer-header border-b px-5 pb-5 pt-5">
        <Link
          href={profileHref}
          className="ridepod-drawer-profile flex items-center gap-3 rounded-2xl border p-3 transition"
        >
          <RidePodAvatar
            avatarUrl={profile?.avatar_url}
            avatarPreference={avatarPreference}
            initials={initials}
            displayName={displayName}
            className="ridepod-drawer-avatar h-12 w-12 shrink-0 rounded-2xl text-base"
          />
          <span className="min-w-0">
            <span className="block truncate text-base font-black">{displayName}</span>
            <span className="ridepod-drawer-profile-subtitle block text-sm font-semibold">{profileSubtitle}</span>
          </span>
        </Link>
      </div>

      <div className="flex min-h-[calc(100dvh-214px)] flex-col">
        <nav className="grid gap-1 px-4 py-5">
          {authPrimaryItems.map((item) => (
            <AuthSidebarLink
              key={item.href}
              {...item}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </nav>

        <div className="ridepod-drawer-divider mx-5 border-t pt-4">
          <nav className="mt-2 grid gap-1">
            {isLoggedIn ? (
              <AuthSidebarAction label="Log out" icon={LogOut} onClick={() => void logout()} />
            ) : (
              <AuthSidebarLink href="/login" label="Login" icon={LogIn} />
            )}
          </nav>
        </div>
      </div>
    </aside>
  );
}

function AuthTopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-3xl grid-cols-[56px_1fr_56px] items-center gap-3">
        <HomeMenuDrawer />
        <Link href="/home" className="inline-flex items-center gap-1.5 justify-self-center" aria-label="RidePod home">
          <RidePodLogo className="h-9 justify-center" priority />
          <span className="rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-[var(--rp-primary)]">
            v1.0
          </span>
        </Link>
        <span aria-hidden="true" />
      </div>
    </header>
  );
}

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="premium-app min-h-screen bg-[var(--rp-gradient-app)] text-[var(--rp-text)]">
      <AuthDesktopSidebar />
      <AuthTopNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:ml-72 lg:max-w-5xl lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
