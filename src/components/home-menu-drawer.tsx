"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Coffee,
  Crown,
  History as HistoryIcon,
  Home,
  Info,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/components/ui";
import { RidePodAvatar, useRidePodAvatarPreference } from "@/components/animal-avatar";
import { getMembershipTierInfo, useRidePodMembershipState } from "@/lib/ridepod-membership";
import { useAuth } from "@/providers/AuthProvider";

const primaryItems = [
  { href: "/about", label: "About", icon: Info },
  { href: "/support", label: "Support RidePod", icon: Coffee },
  { href: "/membership", label: "RidePod Plus", icon: Crown },
  { href: "/history", label: "Ride history", icon: HistoryIcon, requiresAuth: true },
  { href: "/chats", label: "Live Chat", icon: MessageCircle, requiresAuth: true },
];

function DrawerNavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
  badgeCount,
  requiresAuth,
  isLoggedIn,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  onNavigate: () => void;
  badgeCount?: number;
  requiresAuth?: boolean;
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname();
  const destination = requiresAuth && !isLoggedIn ? `/login?next=${encodeURIComponent(href)}` : href;
  const active =
    href === "/home"
      ? pathname === href || pathname.startsWith("/pods/")
      : href === "/pods"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={destination}
      onClick={onNavigate}
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

function DrawerActionButton({
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

export function HomeMenuDrawer() {
  const { profile, logout, user } = useAuth();
  const membership = useRidePodMembershipState();
  const [open, setOpen] = useState(false);
  const closeDrawer = () => setOpen(false);
  const isLoggedIn = Boolean(user);
  const displayName = isLoggedIn ? profile?.display_name ?? "RidePod account" : "Guest rider";
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
          type="button"
          aria-label="Close sidebar"
          tabIndex={open ? 0 : -1}
          onClick={closeDrawer}
          className={cn(
            "absolute inset-0 cursor-default bg-[rgba(15,23,42,0.55)] transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          aria-label="RidePod sidebar"
          onPointerDown={(event) => event.stopPropagation()}
          className={cn(
            "ridepod-mobile-drawer absolute inset-y-0 left-0 z-[90] flex h-[100dvh] w-[min(82vw,420px)] flex-col overflow-hidden border-r shadow-[24px_0_70px_rgba(0,0,0,0.34)] transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="ridepod-drawer-header border-b px-5 pb-4 pt-[max(12px,env(safe-area-inset-top))]">
            <div className="flex justify-end">
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={closeDrawer}
                className="ridepod-drawer-close grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <Link
              href={profileHref}
              onClick={closeDrawer}
              className="ridepod-drawer-profile mt-2 flex items-center gap-3 rounded-2xl border p-3 transition"
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

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(96px+env(safe-area-inset-bottom))]">
            <nav className="grid gap-1 px-4 py-5">
              {primaryItems.map((item) => (
                <DrawerNavLink
                  key={item.href}
                  {...item}
                  isLoggedIn={isLoggedIn}
                  onNavigate={closeDrawer}
                />
              ))}
            </nav>

            <div className="ridepod-drawer-divider mx-5 border-t pt-4">
              <nav className="mt-2 grid gap-1">
                {isLoggedIn ? (
                  <DrawerActionButton
                    label="Log out"
                    icon={LogOut}
                    onClick={() => {
                      void logout();
                      closeDrawer();
                    }}
                  />
                ) : (
                  <>
                    <DrawerNavLink href="/login" label="Login" icon={LogIn} onNavigate={closeDrawer} />
                    <DrawerNavLink href="/register" label="Register" icon={UserPlus} onNavigate={closeDrawer} />
                  </>
                )}
              </nav>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
