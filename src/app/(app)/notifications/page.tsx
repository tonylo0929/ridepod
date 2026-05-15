"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  Clock3,
  DollarSign,
  LockKeyhole,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/components/ui";

type NotificationFilter = "all" | "rides" | "payments" | "chat" | "reminders";
type NotificationCategory = Exclude<NotificationFilter, "all">;

type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  subtitle: string;
  timestamp: string;
  icon: typeof Bell;
  tone: "success" | "primary" | "warning";
  read: boolean;
  details: Array<{ label: string; value: string }>;
  action?: string;
};

const filters: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "rides", label: "Rides" },
  { id: "payments", label: "Payments" },
  { id: "chat", label: "Chat" },
  { id: "reminders", label: "Reminders" },
];

const notifications: NotificationItem[] = [
  {
    id: "payment-authorized",
    category: "payments",
    title: "Payment Authorized",
    subtitle: "$42.50 authorized for tonight's ride.",
    timestamp: "10m ago",
    icon: DollarSign,
    tone: "success",
    read: false,
    details: [
      { label: "Amount", value: "$42.50" },
      { label: "Payment method", value: "Visa \u2022\u2022\u2022\u2022 4242" },
      { label: "Ride", value: "Tonight \u2022 8:00 PM" },
    ],
    action: "View receipt",
  },
  {
    id: "pod-locked",
    category: "rides",
    title: "Pod Locked",
    subtitle: "Your pod is locked and secured.",
    timestamp: "2m ago",
    icon: LockKeyhole,
    tone: "primary",
    read: false,
    details: [
      { label: "Route", value: "USC to LAX" },
      { label: "Status", value: "Locked" },
      { label: "Riders", value: "4 / 4 confirmed" },
    ],
  },
  {
    id: "pickup-reminder",
    category: "reminders",
    title: "Pickup in 30 Minutes",
    subtitle: "Meet at Observatory Tower lobby.",
    timestamp: "1h ago",
    icon: Clock3,
    tone: "warning",
    read: true,
    details: [
      { label: "Pickup spot", value: "Observatory Tower lobby" },
      { label: "Ride", value: "USC to LAX" },
    ],
    action: "Open pod chat",
  },
];

export default function NotificationsPage() {
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilter>("all");
  const [expandedNotificationIds, setExpandedNotificationIds] = useState<string[]>([]);
  const [heroExpanded, setHeroExpanded] = useState(false);

  const filteredNotifications = useMemo(
    () =>
      selectedFilter === "all"
        ? notifications
        : notifications.filter((notification) => notification.category === selectedFilter),
    [selectedFilter],
  );

  const showHero = selectedFilter === "all" || selectedFilter === "rides" || selectedFilter === "reminders";

  const toggleExpanded = (id: string) => {
    setExpandedNotificationIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <NotificationsPageShell>
      <NotificationsHeader />
      <NotificationFilterChips selectedFilter={selectedFilter} onSelect={setSelectedFilter} />
      <ImportantSection
        showHero={showHero}
        heroExpanded={heroExpanded}
        onToggleHero={() => setHeroExpanded((value) => !value)}
      />
      <NotificationFeed
        notifications={filteredNotifications}
        expandedNotificationIds={expandedNotificationIds}
        onToggleExpanded={toggleExpanded}
      />
      <NotificationFooterCTA />
    </NotificationsPageShell>
  );
}

function NotificationsPageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid w-full max-w-[430px] gap-5 pb-4 min-[560px]:max-w-4xl">{children}</div>;
}

function NotificationsHeader() {
  return (
    <header className="grid gap-5 pt-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-black leading-tight text-[var(--rp-text)]">Notifications</h1>
          <p className="mt-2 text-base font-semibold text-[var(--rp-muted)]">
            Tap a card to view more details
          </p>
        </div>
        <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[var(--rp-card)] text-[var(--rp-primary)] shadow-[var(--rp-shadow-soft)]">
          <Bell className="h-7 w-7" />
          <span className="absolute right-3 top-3 h-3 w-3 rounded-full border border-[var(--rp-card)] bg-[var(--rp-success)]" />
        </div>
      </div>
    </header>
  );
}

function NotificationFilterChips({
  selectedFilter,
  onSelect,
}: {
  selectedFilter: NotificationFilter;
  onSelect: (filter: NotificationFilter) => void;
}) {
  return (
    <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label="Notification filters">
      {filters.map((filter) => {
        const selected = selectedFilter === filter.id;

        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(filter.id)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-black transition",
              selected
                ? "bg-[var(--rp-primary)] text-[var(--rp-primary-text)] shadow-[0_12px_26px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)]"
                : "border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-muted)]",
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

function ImportantSection({
  showHero,
  heroExpanded,
  onToggleHero,
}: {
  showHero: boolean;
  heroExpanded: boolean;
  onToggleHero: () => void;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[var(--rp-text)]">Important</h2>
        <button type="button" className="text-sm font-black text-[var(--rp-primary)]">
          View all
        </button>
      </div>
      {showHero ? (
        <PriorityHeroNotificationCard expanded={heroExpanded} onToggle={onToggleHero} />
      ) : (
        <EmptyFilterState />
      )}
    </section>
  );
}

function PriorityHeroNotificationCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="relative overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_22%,transparent),transparent_42%),var(--rp-card)] p-5 text-left shadow-[0_22px_60px_color-mix(in_srgb,var(--rp-primary)_28%,transparent)]"
    >
      <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--rp-primary),transparent)]" />
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center rounded-full bg-[var(--rp-primary)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-primary-text)]">
          High Priority
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
          <Bell className="h-6 w-6" />
        </span>
      </div>

      <div className="mt-6 grid gap-5 min-[390px]:grid-cols-[1fr_132px] min-[390px]:items-center">
        <div>
          <h3 className="text-2xl font-black text-[var(--rp-text)]">Pickup starts soon</h3>
          <p className="mt-2 text-lg font-black text-[var(--rp-primary)]">
            USC <span aria-hidden="true">&rarr;</span> LAX
          </p>
          <p className="mt-2 text-base font-semibold text-[var(--rp-muted-strong)]">
            Pickup in 30 minutes
          </p>
        </div>
        <CountdownRing minutes={30} />
      </div>

      {expanded ? (
        <div className="mt-5 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Meet at Observatory Tower lobby. Keep your phone nearby for host updates.
        </div>
      ) : null}
    </button>
  );
}

function CountdownRing({ minutes }: { minutes: number }) {
  return (
    <div
      className="mx-auto grid h-[132px] w-[132px] place-items-center rounded-full"
      style={{
        background: "conic-gradient(var(--rp-primary) 0% 75%, var(--rp-card-muted) 75% 100%)",
      }}
      aria-label={`${minutes} minutes until pickup`}
    >
      <div className="grid h-[102px] w-[102px] place-items-center rounded-full bg-[var(--rp-card)] text-center shadow-[inset_0_0_0_1px_var(--rp-border)]">
        <div>
          <p className="text-3xl font-black leading-none text-[var(--rp-text)]">30:00</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">
            countdown
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationFeed({
  notifications,
  expandedNotificationIds,
  onToggleExpanded,
}: {
  notifications: NotificationItem[];
  expandedNotificationIds: string[];
  onToggleExpanded: (id: string) => void;
}) {
  return (
    <section className="grid gap-3" aria-label="Notification feed">
      {notifications.length ? (
        notifications.map((notification) => (
          <ExpandableNotificationCard
            key={notification.id}
            notification={notification}
            expanded={expandedNotificationIds.includes(notification.id)}
            onToggle={() => onToggleExpanded(notification.id)}
          />
        ))
      ) : (
        <EmptyFilterState />
      )}
    </section>
  );
}

function ExpandableNotificationCard({
  notification,
  expanded,
  onToggle,
}: {
  notification: NotificationItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = notification.icon;

  return (
    <article className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 p-4 text-left"
      >
        <span
          className={cn(
            "relative grid h-12 w-12 place-items-center rounded-full bg-[var(--rp-card-muted)]",
            notification.tone === "success" ? "text-[var(--rp-success)]" : "text-[var(--rp-primary)]",
          )}
        >
          <Icon className="h-6 w-6" />
          {!notification.read ? (
            <span className="absolute right-0 top-0 h-3 w-3 rounded-full border border-[var(--rp-card)] bg-[var(--rp-primary)]" />
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-black text-[var(--rp-text)]">{notification.title}</span>
            {!notification.read ? (
              <span className="rounded-full bg-[var(--rp-card-muted)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--rp-primary)]">
                unread
              </span>
            ) : null}
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-[var(--rp-muted)]">
            {notification.subtitle}
          </span>
          <span className="mt-1 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--rp-primary)]">
            {notification.category} · {notification.timestamp}
          </span>
        </span>
        <ChevronDown
          className={cn("h-5 w-5 text-[var(--rp-primary)] transition", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="border-t border-[var(--rp-border)] px-4 pb-4 pt-3">
          <dl className="grid gap-2">
            {notification.details.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between gap-3 text-sm">
                <dt className="font-semibold text-[var(--rp-muted)]">{detail.label}</dt>
                <dd className="text-right font-black text-[var(--rp-text)]">{detail.value}</dd>
              </div>
            ))}
          </dl>
          {notification.action ? (
            <button
              type="button"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--rp-border-strong)] px-4 text-sm font-black text-[var(--rp-primary)]"
            >
              {notification.action}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function EmptyFilterState() {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-5 text-center">
      <MessageCircle className="mx-auto h-7 w-7 text-[var(--rp-primary)]" />
      <p className="mt-3 text-sm font-black text-[var(--rp-text)]">No updates in this filter</p>
      <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">New ride updates will appear here.</p>
    </div>
  );
}

function NotificationFooterCTA() {
  return (
    <button
      type="button"
      className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[18px] bg-[var(--rp-gradient-primary)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_16px_36px_color-mix(in_srgb,var(--rp-primary)_28%,transparent)]"
    >
      View all notifications
      <ArrowRight className="h-5 w-5" />
    </button>
  );
}
