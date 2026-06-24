"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  Coffee,
  Crown,
  History as HistoryIcon,
  Home,
  Info,
  LogIn,
  LogOut,
  MessageCircle,
  Search,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import { RidePodAvatar, useRidePodAvatarPreference } from "@/components/animal-avatar";
import { RidePodLogo } from "@/components/ridepod-logo";
import { HomeMenuDrawer } from "@/components/home-menu-drawer";
import { getMembershipTierInfo, useRidePodMembershipState } from "@/lib/ridepod-membership";
import { useRidePodUnreadCount } from "@/lib/notifications/use-ridepod-unread-count";
import { useAuth } from "@/providers/AuthProvider";

function getProfileDisplayName({
  profile,
  user,
  isLoggedIn,
}: {
  profile: ReturnType<typeof useAuth>["profile"];
  user: ReturnType<typeof useAuth>["user"];
  isLoggedIn: boolean;
}) {
  if (!isLoggedIn) return "Guest rider";

  return (
    profile?.account_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.preferred_name?.trim() ||
    profile?.email?.split("@")[0]?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    "RidePod account"
  );
}

const desktopDrawerNav = [
  { href: "/about", label: "About", icon: Info },
  { href: "/support", label: "Support RidePod", icon: Coffee },
  { href: "/membership", label: "RidePod Plus", icon: Crown },
  { href: "/history", label: "Ride history", icon: HistoryIcon, requiresAuth: true },
  { href: "/chats", label: "Live Chat", icon: MessageCircle, requiresAuth: true },
];

function NavLink({
  href,
  label,
  icon: Icon,
  compact,
  badgeCount,
  requiresAuth,
  isLoggedIn,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  compact?: boolean;
  badgeCount?: number;
  requiresAuth?: boolean;
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname();
  const destination = requiresAuth && !isLoggedIn ? `/login?next=${encodeURIComponent(href)}` : href;
  const active =
    href === "/home"
      ? pathname === href
      : href === "/pods"
        ? pathname === href || pathname.startsWith("/pods/date/")
        : href === "/ride-groups"
          ? pathname === href || pathname.startsWith("/ride-groups/") || pathname.startsWith("/ride-calls/")
        : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={destination}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
          : "text-[var(--rp-muted)] hover:bg-[var(--rp-card-muted)] hover:text-[var(--rp-text)]",
        compact && "flex-1 flex-col gap-1 rounded-none px-1 py-2 text-center text-[11px] leading-tight",
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {badgeCount ? (
          <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--rp-primary)] px-1 text-[9px] font-black text-[var(--rp-primary-text)] ring-1 ring-[var(--rp-shell)]">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}

function PremiumBottomNav() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] shadow-[var(--rp-shadow-nav)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center">
        <NavLink href="/home" label="Search" icon={Search} compact />
        <NavLink href="/ride-groups/coldplay-concert" label="Ride Group" icon={UsersRound} compact />
        <NavLink href="/pods" label="My Ride" icon={CalendarCheck} compact requiresAuth isLoggedIn={isLoggedIn} />
        <NavLink href="/chats" label="Chats" icon={MessageCircle} compact requiresAuth isLoggedIn={isLoggedIn} />
        <NavLink href="/profile" label="Profile" icon={UserRound} compact requiresAuth isLoggedIn={isLoggedIn} />
      </div>
    </nav>
  );
}

function PremiumTopNav() {
  const unreadCount = useRidePodUnreadCount();
  const { user } = useAuth();
  const pathname = usePathname();
  const nextPath = pathname || "/home";
  const updatesHref = user ? "/updates" : `/login?next=${encodeURIComponent("/updates")}`;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-3xl grid-cols-[56px_1fr_auto] items-center gap-3">
        <HomeMenuDrawer />
        <Link href="/home" className="inline-flex items-center gap-1.5 justify-self-center" aria-label="RidePod home">
          <RidePodLogo className="h-9 justify-center" priority />
          <span className="rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-[var(--rp-primary)]">
            v1.0
          </span>
        </Link>
        <div className="flex justify-self-end gap-2">
          {user ? (
            <Link
              href={updatesHref}
              aria-label="Notifications"
              className="relative grid h-12 w-12 place-items-center rounded-[20px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-muted)]"
            >
              <Bell className="h-5 w-5 stroke-[2.2]" />
              {unreadCount ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border border-[var(--rp-shell)] bg-[var(--rp-primary)] px-1 text-[10px] font-black text-[var(--rp-primary-text)]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={loginHref}
                className="inline-flex min-h-10 items-center justify-center rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-3 text-sm font-black text-[var(--rp-text)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Login
              </Link>
              <Link
                href={registerHref}
                className="inline-flex min-h-10 items-center justify-center rounded-[16px] border border-[var(--rp-primary)] bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] px-3 text-sm font-black text-[#07111a] shadow-[0_12px_26px_rgba(242,193,91,0.24)] transition hover:brightness-105"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DesktopDrawerLink({
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
  const active =
    href === "/home"
      ? pathname === href
      : href === "/pods"
        ? pathname === href || pathname.startsWith("/pods/date/")
        : href === "/ride-groups"
          ? pathname === href || pathname.startsWith("/ride-groups/") || pathname.startsWith("/ride-calls/")
        : pathname === href || pathname.startsWith(`${href}/`);

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

function DesktopDrawerAction({
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

function PremiumDesktopSidebar() {
  const { profile, logout, user } = useAuth();
  const membership = useRidePodMembershipState();
  const isLoggedIn = Boolean(user);
  const displayName = getProfileDisplayName({ profile, user, isLoggedIn });
  const profileSubtitle = isLoggedIn ? "View profile" : "Log in or create account";
  const membershipTier = getMembershipTierInfo(membership.membershipTier);
  const initials = displayName
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "R";
  const [avatarPreference] = useRidePodAvatarPreference(profile?.id ?? user?.id);
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
            {isLoggedIn ? (
              <span className="mt-2 inline-flex rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-muted)] px-2.5 py-1 text-[11px] font-black text-[var(--rp-primary)]">
                {membershipTier.label}
              </span>
            ) : null}
          </span>
        </Link>
      </div>

      <div className="flex min-h-[calc(100dvh-214px)] flex-col">
        <nav className="grid gap-1 px-4 py-5">
          {desktopDrawerNav.map((item) => (
            <DesktopDrawerLink
              key={item.href}
              {...item}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </nav>

        <div className="ridepod-drawer-divider mx-5 border-t pt-4">
          <nav className="mt-2 grid gap-1">
            {isLoggedIn ? (
              <DesktopDrawerAction label="Log out" icon={LogOut} onClick={() => void logout()} />
            ) : (
              <>
                <DesktopDrawerLink href="/login" label="Login" icon={LogIn} />
                <DesktopDrawerLink href="/register" label="Register" icon={UserPlus} />
              </>
            )}
          </nav>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const fullScreenChatRoom = false;

  return (
    <div className="premium-app min-h-screen bg-[var(--rp-gradient-app)] text-[var(--rp-text)]">
      <PremiumDesktopSidebar />

      {fullScreenChatRoom ? null : <PremiumTopNav />}

      <main
        className={cn(
          fullScreenChatRoom
            ? "w-full pb-20 lg:pb-0"
            : "mx-auto w-full px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:w-[calc(100%-18rem)] lg:px-10 lg:pb-12 lg:pt-8",
          !fullScreenChatRoom && "max-w-3xl lg:max-w-5xl",
        )}
      >
        {children}
      </main>

      <PremiumBottomNav />
    </div>
  );
}
