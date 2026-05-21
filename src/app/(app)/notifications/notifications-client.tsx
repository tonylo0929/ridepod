"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileWarning,
  Menu,
  ReceiptText,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import { Badge, cn } from "@/components/ui";
import type {
  RideInstanceNotification,
  RideInstanceNotificationGroup,
  RideInstanceNotificationTone,
  RideInstanceNotificationType,
} from "@/lib/ride-instance-notifications";

type UpdatesFilter = "unread" | "all";

const groupOrder: RideInstanceNotificationGroup[] = ["Today", "This week", "Earlier"];

const toneClasses: Record<RideInstanceNotificationTone, { icon: string; button: string }> = {
  gold: {
    icon: "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] text-[var(--rp-primary)]",
    button: "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)]",
  },
  amber: {
    icon: "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] text-[var(--rp-primary)]",
    button: "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)]",
  },
  green: {
    icon: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    button: "border border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
  },
  orange: {
    icon: "border-orange-400/30 bg-orange-400/10 text-orange-300",
    button: "border border-orange-400/30 bg-orange-400/15 text-orange-200",
  },
  red: {
    icon: "border-[var(--rp-danger)] bg-[var(--rp-danger-bg)] text-[var(--rp-danger)]",
    button: "border border-[var(--rp-danger)] bg-[var(--rp-danger-bg)] text-[var(--rp-danger)]",
  },
  purple: {
    icon: "border-violet-400/30 bg-violet-400/10 text-violet-300",
    button: "border border-violet-400/30 bg-violet-400/15 text-violet-200",
  },
  blue: {
    icon: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    button: "border border-sky-400/30 bg-sky-400/15 text-sky-200",
  },
  neutral: {
    icon: "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
    button: "border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
  },
};

const notificationIcons: Record<RideInstanceNotificationType, typeof Bell> = {
  upload_quote_needed: UploadCloud,
  quote_approved: CheckCircle2,
  upload_receipt_needed: ReceiptText,
  meter_proof_needed: ReceiptText,
  dispute_window_ending: Clock3,
  settlement_ready: WalletCards,
  payout_ready: CircleDollarSign,
  dispute_under_review: AlertTriangle,
  ride_booked: Car,
  proof_approved: CheckCircle2,
  proof_more_info_needed: FileWarning,
  proof_rejected: AlertTriangle,
  payout_held: AlertTriangle,
  taxi_partner_dispute_opened: AlertTriangle,
  taxi_partner_guest_dispute_review: AlertTriangle,
  taxi_partner_payout_held: WalletCards,
  taxi_partner_payout_ready: CircleDollarSign,
  taxi_partner_more_info_needed: FileWarning,
  taxi_partner_payout_denied: AlertTriangle,
  taxi_partner_dispute_resolved: CheckCircle2,
  taxi_partner_quote_received: WalletCards,
  taxi_partner_guests_accepting: Clock3,
  taxi_partner_accepted: CheckCircle2,
  taxi_partner_declined: AlertTriangle,
  taxi_partner_arrived: Car,
  taxi_partner_ride_started: Car,
  taxi_partner_ride_completed: CheckCircle2,
  taxi_partner_payout_pending: WalletCards,
};

function isNotificationRead(notification: RideInstanceNotification, readKeys: Set<string>) {
  return notification.read || readKeys.has(notification.stableKey);
}

export function NotificationsClient({
  initialNotifications,
  fallbackNote,
}: {
  initialNotifications: RideInstanceNotification[];
  fallbackNote: string | null;
}) {
  const [selectedFilter, setSelectedFilter] = useState<UpdatesFilter>("unread");
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());
  const unreadCount = initialNotifications.filter((notification) => !isNotificationRead(notification, readKeys)).length;
  const visibleNotifications = initialNotifications.filter((notification) =>
    selectedFilter === "all" ? true : !isNotificationRead(notification, readKeys),
  );

  const markRead = (notification: RideInstanceNotification) => {
    setReadKeys((current) => new Set(current).add(notification.stableKey));
  };

  return (
    <div className="mx-auto grid w-full max-w-[430px] gap-4 pb-4 min-[720px]:max-w-3xl">
      <UpdatesHeader unreadCount={unreadCount} />
      {fallbackNote ? (
        <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          {fallbackNote}
        </p>
      ) : null}
      <UpdateTabs selectedFilter={selectedFilter} unreadCount={unreadCount} onSelect={setSelectedFilter} />
      <div className="grid gap-5">
        {groupOrder.map((group) => {
          const groupNotifications = visibleNotifications.filter((notification) => notification.group === group);
          if (!groupNotifications.length) return null;

          return (
            <section key={group} className="grid gap-2">
              <h2 className="text-sm font-black text-[var(--rp-muted-strong)]">{group}</h2>
              <div className="grid gap-2.5">
                {groupNotifications.map((notification) => (
                  <UpdateCard
                    key={notification.stableKey}
                    notification={notification}
                    read={isNotificationRead(notification, readKeys)}
                    onRead={() => markRead(notification)}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {!visibleNotifications.length ? (
          <div className="rounded-[22px] border border-dashed border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-6 text-center">
            <Bell className="mx-auto h-7 w-7 text-[var(--rp-primary)]" />
            <p className="mt-3 text-sm font-black text-[var(--rp-text)]">No unread updates</p>
            <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">All ride updates are caught up.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UpdatesHeader({ unreadCount }: { unreadCount: number }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <button
        type="button"
        aria-label="Open menu"
        className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-text)]"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-xl font-black text-[var(--rp-text)]">Updates</h1>
      <div className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-text)]">
        <Bell className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--rp-primary)] px-1 text-[10px] font-black text-[var(--rp-primary-text)]">
          {unreadCount}
        </span>
      </div>
    </header>
  );
}

function UpdateTabs({
  selectedFilter,
  unreadCount,
  onSelect,
}: {
  selectedFilter: UpdatesFilter;
  unreadCount: number;
  onSelect: (filter: UpdatesFilter) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-1" role="tablist" aria-label="Update filters">
      {(["unread", "all"] as const).map((filter) => {
        const selected = selectedFilter === filter;
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(filter)}
            className={cn(
              "flex min-h-10 items-center justify-center gap-2 rounded-[14px] text-sm font-black transition",
              selected
                ? "border border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_10%,transparent)] text-[var(--rp-primary)]"
                : "text-[var(--rp-muted-strong)]",
            )}
          >
            {filter === "unread" ? "Unread" : "All"}
            {filter === "unread" ? (
              <Badge className="bg-[var(--rp-primary)] text-[var(--rp-primary-text)] ring-transparent">
                {unreadCount}
              </Badge>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function UpdateCard({
  notification,
  read,
  onRead,
}: {
  notification: RideInstanceNotification;
  read: boolean;
  onRead: () => void;
}) {
  const Icon = notificationIcons[notification.type];
  const tone = toneClasses[notification.tone];

  return (
    <article
      className={cn(
        "relative rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 shadow-[var(--rp-shadow-soft)]",
        !read && "border-[color-mix(in_srgb,var(--rp-primary)_34%,var(--rp-border))]",
      )}
    >
      {!read ? <span className="absolute left-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[var(--rp-primary)]" /> : null}
      <div className="grid grid-cols-[48px_1fr_auto] gap-3 pl-2">
        <div className={cn("grid h-12 w-12 place-items-center rounded-full border", tone.icon)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-black leading-5 text-[var(--rp-text)]">{notification.title}</h3>
          </div>
          <p className="mt-1 text-xs font-semibold leading-4 text-[var(--rp-muted-strong)]">{notification.body}</p>
          <div className="mt-2 grid gap-1 text-[11px] font-bold leading-4 text-[var(--rp-muted)]">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {notification.meta}
            </span>
            <span>{notification.routeLabel}</span>
          </div>
        </div>
        <p className="text-xs font-bold text-[var(--rp-muted)]">{notification.timeAgo}</p>
      </div>
      {notification.ctaLabel && notification.ctaTarget ? (
        <div className="mt-3 flex justify-end">
          <Link
            href={notification.ctaTarget}
            onClick={onRead}
            className={cn(
              "inline-flex min-h-10 min-w-[128px] items-center justify-center gap-2 rounded-[12px] px-4 text-xs font-black transition hover:brightness-110",
              tone.button,
            )}
          >
            {notification.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
