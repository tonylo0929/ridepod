"use client";

import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { cn } from "@/components/ui";

type RideBoardFilter = "near_me" | "commute" | "events" | "leaving_soon" | "saved";
type RideRequestCategory = "airport" | "commute" | "events" | "other";
type RideRequestStatus = "open" | "leaving_soon" | "closed" | "expired";
type RideType = "Taxi" | "Ride App" | "Airport" | "Commute" | "Other";

type RideRequestHost = {
  name: string;
  rating: number;
  rideCount: number;
  trustLabel: string;
};

type RideRequest = {
  id: string;
  from: string;
  to: string;
  dateLabel: string;
  timeLabel: string;
  departureDate: string;
  departureTime: string;
  rideType: RideType;
  category: RideRequestCategory;
  pickupFlexibility: string;
  maxPeople: number;
  interestedCount: number;
  status: RideRequestStatus;
  host: RideRequestHost;
  note: string;
  saved: boolean;
  chatAllowed: boolean;
  userInterested?: boolean;
  expiryLabel: string;
};

type RideRequestFormValues = {
  from: string;
  to: string;
  date: string;
  time: string;
  pickupFlexibility: string;
  rideType: RideType;
  maxPeople: string;
  note: string;
  expiryTime: string;
};

const rideBoardFilters: Array<{ id: RideBoardFilter; label: string; icon: LucideIcon }> = [
  { id: "near_me", label: "Near me", icon: MapPin },
  { id: "commute", label: "Commute", icon: BriefcaseBusiness },
  { id: "events", label: "Events", icon: Sparkles },
  { id: "leaving_soon", label: "Leaving soon", icon: Clock3 },
  { id: "saved", label: "Saved", icon: Bookmark },
];

const rideTypeOptions: RideType[] = ["Taxi", "Ride App", "Airport", "Commute", "Other"];

const rideTypeToCategory: Record<RideType, RideRequestCategory> = {
  Taxi: "other",
  "Ride App": "other",
  Airport: "airport",
  Commute: "commute",
  Other: "other",
};

const statusCopy: Record<
  RideRequestStatus,
  {
    label: string;
    className: string;
  }
> = {
  open: {
    label: "Open",
    className: "border-white/10 bg-white/[0.06] text-[var(--rp-muted-strong)]",
  },
  leaving_soon: {
    label: "Leaving soon",
    className: "border-[rgba(242,193,91,0.42)] bg-[rgba(242,193,91,0.12)] text-[var(--rp-primary)]",
  },
  closed: {
    label: "Full / closed",
    className: "border-white/10 bg-white/[0.08] text-[var(--rp-muted)]",
  },
  expired: {
    label: "Expired",
    className: "border-white/10 bg-white/[0.04] text-[var(--rp-muted)]",
  },
};

const initialRideRequests: RideRequest[] = [
  {
    id: "board-shibuya-haneda",
    from: "Shibuya",
    to: "Haneda Airport",
    dateLabel: "Today",
    timeLabel: "6:00 PM",
    departureDate: "2026-06-27",
    departureTime: "18:00",
    rideType: "Airport",
    category: "airport",
    pickupFlexibility: "Flexible within 10 minutes near Shibuya Station",
    maxPeople: 4,
    interestedCount: 3,
    status: "leaving_soon",
    host: {
      name: "trial_0",
      rating: 4.9,
      rideCount: 124,
      trustLabel: "Trusted airport rider",
    },
    note: "Looking for people heading to Terminal 3 tonight.",
    saved: true,
    chatAllowed: false,
    expiryLabel: "After departure",
  },
  {
    id: "board-shinjuku-haneda",
    from: "Shinjuku",
    to: "Haneda Airport",
    dateLabel: "Today",
    timeLabel: "6:45 PM",
    departureDate: "2026-06-27",
    departureTime: "18:45",
    rideType: "Ride App",
    category: "airport",
    pickupFlexibility: "Flexible pickup around Shinjuku area",
    maxPeople: 4,
    interestedCount: 2,
    status: "open",
    host: {
      name: "maya_88",
      rating: 4.8,
      rideCount: 87,
      trustLabel: "Verified RidePod member",
    },
    note: "Heading to Haneda T3. Flexible on pickup near Shinjuku area.",
    saved: false,
    chatAllowed: false,
    expiryLabel: "After departure",
  },
  {
    id: "board-central-west-kowloon",
    from: "Central",
    to: "West Kowloon",
    dateLabel: "Tomorrow",
    timeLabel: "8:10 AM",
    departureDate: "2026-06-28",
    departureTime: "08:10",
    rideType: "Taxi",
    category: "commute",
    pickupFlexibility: "Can meet near IFC or Hong Kong Station",
    maxPeople: 3,
    interestedCount: 5,
    status: "open",
    host: {
      name: "ken_lau",
      rating: 4.7,
      rideCount: 42,
      trustLabel: "Morning commute regular",
    },
    note: "Regular weekday route. Looking for people with similar timing.",
    saved: true,
    chatAllowed: true,
    userInterested: true,
    expiryLabel: "After departure",
  },
  {
    id: "board-cwb-asiaworld",
    from: "Causeway Bay",
    to: "AsiaWorld-Expo",
    dateLabel: "Today",
    timeLabel: "7:20 PM",
    departureDate: "2026-06-27",
    departureTime: "19:20",
    rideType: "Other",
    category: "events",
    pickupFlexibility: "Pickup near Times Square taxi stand",
    maxPeople: 4,
    interestedCount: 6,
    status: "closed",
    host: {
      name: "nora_music",
      rating: 4.9,
      rideCount: 61,
      trustLabel: "Event ride host",
    },
    note: "Concert ride is now full. Keeping it visible for status only.",
    saved: false,
    chatAllowed: false,
    expiryLabel: "After departure",
  },
  {
    id: "board-expired-sample",
    from: "Tsim Sha Tsui",
    to: "Mong Kok",
    dateLabel: "Today",
    timeLabel: "9:00 AM",
    departureDate: "2026-06-27",
    departureTime: "09:00",
    rideType: "Taxi",
    category: "other",
    pickupFlexibility: "Near the Star Ferry",
    maxPeople: 3,
    interestedCount: 1,
    status: "expired",
    host: {
      name: "old_route",
      rating: 4.6,
      rideCount: 18,
      trustLabel: "Expired ride request",
    },
    note: "This expired mock request is intentionally hidden from the board.",
    saved: false,
    chatAllowed: false,
    expiryLabel: "After departure",
  },
];

const defaultFormValues: RideRequestFormValues = {
  from: "",
  to: "",
  date: "",
  time: "",
  pickupFlexibility: "Flexible within 10 minutes",
  rideType: "Ride App",
  maxPeople: "3",
  note: "",
  expiryTime: "departure",
};

const buildingHeights = [30, 48, 38, 58, 44, 72, 52, 64];

function getTodayInputValue() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localNow.toISOString().slice(0, 10);
}

function formatDateLabel(dateValue: string) {
  if (!dateValue) return "Today";
  if (dateValue === getTodayInputValue()) return "Today";

  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return dateValue;

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(timeValue: string) {
  if (!timeValue) return "Flexible";

  const [hourValue, minuteValue] = timeValue.split(":");
  const parsedDate = new Date();
  parsedDate.setHours(Number(hourValue), Number(minuteValue), 0, 0);

  return parsedDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRequestStatus(dateValue: string, timeValue: string): RideRequestStatus {
  if (!dateValue || !timeValue) return "open";

  const departure = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(departure.getTime())) return "open";

  const timeUntilDeparture = departure.getTime() - Date.now();
  if (timeUntilDeparture < 0) return "expired";
  if (timeUntilDeparture <= 60 * 60 * 1000) return "leaving_soon";

  return "open";
}

function getVisibleRequests(requests: RideRequest[], filter: RideBoardFilter) {
  return requests.filter((request) => {
    if (request.status === "expired") return false;
    if (filter === "near_me") return true;
    if (filter === "leaving_soon") return request.status === "leaving_soon";
    if (filter === "saved") return request.saved;
    return request.category === filter;
  });
}

function getInterestedLabel(count: number) {
  return `${count} interested`;
}

function getActionState(request: RideRequest) {
  if (request.status === "closed") return { label: "Closed", disabled: true, icon: Lock };
  if (request.status === "expired") return { label: "Expired", disabled: true, icon: Clock3 };
  if (request.userInterested) return { label: "Interested", disabled: true, icon: CheckCircle2 };
  return { label: "I'm interested", disabled: false, icon: MessageCircle };
}

function RideBoardHero() {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,rgba(12,25,38,0.98),rgba(7,17,27,0.98))] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="absolute inset-y-0 right-0 w-44 bg-[linear-gradient(90deg,transparent_0%,rgba(242,193,91,0.08)_58%,rgba(242,193,91,0.16)_100%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-full w-44 overflow-hidden rounded-r-[24px]" aria-hidden="true">
        <svg className="absolute bottom-9 right-8 h-16 w-28 text-[var(--rp-primary)]" viewBox="0 0 130 72" fill="none">
          <path
            d="M6 60 C 34 44, 48 58, 72 32 C 88 16, 105 26, 122 10"
            stroke="currentColor"
            strokeDasharray="3 7"
            strokeLinecap="round"
            strokeWidth="2"
            opacity="0.8"
          />
        </svg>
        <MapPin className="absolute right-8 top-7 h-8 w-8 fill-[var(--rp-primary)] text-[var(--rp-primary)] drop-shadow-[0_0_14px_rgba(242,193,91,0.45)]" />
        <div className="absolute bottom-0 right-4 flex items-end gap-1.5">
          {buildingHeights.map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="relative w-3 rounded-t-sm border border-[rgba(242,193,91,0.2)] bg-[linear-gradient(180deg,rgba(242,193,91,0.32),rgba(242,193,91,0.08))]"
              style={{ height }}
            >
              <span className="absolute inset-x-1 top-2 h-1 rounded-full bg-[rgba(255,211,106,0.7)]" />
              <span className="absolute inset-x-1 top-5 h-1 rounded-full bg-[rgba(255,211,106,0.42)]" />
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 grid max-w-[290px] grid-cols-[56px_1fr] items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-[18px] border border-[rgba(242,193,91,0.22)] bg-[rgba(242,193,91,0.08)] text-[var(--rp-primary)]">
          <Sun className="h-9 w-9 stroke-[2.35]" />
        </span>
        <div>
          <p className="text-left text-[22px] font-black leading-tight text-[var(--rp-text)]">Good morning, trial_2</p>
          <p className="mt-2 text-left text-base font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Find people going your way today.
          </p>
        </div>
      </div>
    </section>
  );
}

function PostRideRequestButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_58%,#d9912f_100%)] px-5 font-black text-[var(--rp-primary-text)] shadow-[0_22px_46px_rgba(242,193,91,0.25)] transition hover:brightness-105 active:scale-[0.99]",
        compact ? "min-h-[54px] text-base" : "min-h-[74px] text-xl",
      )}
    >
      <Plus className={cn("stroke-[2.5]", compact ? "h-5 w-5" : "h-8 w-8")} />
      Post Ride Request
    </button>
  );
}

function RideBoardFilters({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: RideBoardFilter;
  onFilterChange: (filter: RideBoardFilter) => void;
}) {
  return (
    <section aria-label="Ride Board filters" className="scrollbar-hide -mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-3">
        {rideBoardFilters.map((chip) => {
          const Icon = chip.icon;
          const active = activeFilter === chip.id;

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={cn(
                "inline-flex min-h-14 shrink-0 items-center gap-2 rounded-full border px-5 text-base font-black transition",
                active
                  ? "border-[var(--rp-primary)] bg-[rgba(242,193,91,0.12)] text-[var(--rp-primary)] shadow-[0_0_24px_rgba(242,193,91,0.18)]"
                  : "border-white/10 bg-white/[0.055] text-[var(--rp-muted-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]",
              )}
            >
              <Icon className="h-5 w-5" />
              {chip.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RideRequestCard({
  request,
  onOpen,
  onInterested,
}: {
  request: RideRequest;
  onOpen: (id: string) => void;
  onInterested: (id: string) => void;
}) {
  const status = statusCopy[request.status];
  const actionState = getActionState(request);
  const ActionIcon = actionState.icon;
  const seatsLeft = Math.max(request.maxPeople - request.interestedCount, 0);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(request.id);
    }
  };

  const handleInterestClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!actionState.disabled) onInterested(request.id);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(request.id)}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[18px] border border-[rgba(242,193,91,0.24)] bg-[linear-gradient(145deg,rgba(14,28,42,0.98),rgba(6,16,25,0.98))] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.28)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--rp-primary)]",
        request.status === "closed" && "border-white/10 opacity-80",
      )}
    >
      <span
        className={cn(
          "absolute bottom-3 left-3 top-3 w-1 rounded-full shadow-[0_0_14px_rgba(242,193,91,0.28)]",
          request.status === "closed"
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))]"
            : "bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_48%,#d9912f_100%)]",
        )}
        aria-hidden="true"
      />

      <div className="pl-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-left text-[21px] font-black leading-[1.1] tracking-tight text-[var(--rp-text)] min-[390px]:text-[23px]">
              <span className="break-words">{request.from}</span>
              <span className="mx-1.5 inline-flex translate-y-0.5 text-[var(--rp-primary)]">-&gt;</span>
              <span className="break-words">{request.to}</span>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2 text-[11px] font-bold text-[var(--rp-muted-strong)]">
                <CalendarDays className="h-3 w-3" />
                {request.dateLabel}, {request.timeLabel}
              </span>
              <span className={cn("inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-black", status.className)}>
                <Clock3 className="h-3 w-3" />
                {status.label}
              </span>
              {request.status !== "closed" ? (
                <span className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2 text-[11px] font-bold text-[var(--rp-muted-strong)]">
                  <UsersRound className="h-3 w-3" />
                  {seatsLeft} seats left
                </span>
              ) : null}
            </div>
          </div>
          {request.userInterested ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgba(98,232,187,0.32)] bg-[rgba(98,232,187,0.12)] text-[#62e8bb]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_74px] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[rgba(242,193,91,0.28)] bg-[rgba(242,193,91,0.1)] text-[var(--rp-primary)]">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-left text-[13px] font-black leading-4 text-[var(--rp-text)]">Host: {request.host.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-left text-[11px] font-bold leading-4 text-[var(--rp-muted-strong)]">
                <Star className="h-3.5 w-3.5 shrink-0 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
                {request.host.rating.toFixed(1)} ({request.host.rideCount} rides)
              </p>
            </div>
          </div>

          <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-2 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-left text-2xl font-black leading-none text-[var(--rp-primary)]">{request.interestedCount}</p>
            <p className="mt-0.5 text-left text-[8px] font-black uppercase tracking-[0.05em] text-[var(--rp-muted-strong)]">
              Interested
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-[13px] border border-white/10 bg-[#06111d]/75 px-3 py-2.5 text-left text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
          {request.note}
        </p>

        <button
          type="button"
          onClick={handleInterestClick}
          disabled={actionState.disabled}
          className={cn(
            "mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[13px] border px-3.5 text-[13px] font-black transition",
            request.userInterested
              ? "border-[rgba(98,232,187,0.32)] bg-[rgba(98,232,187,0.1)] text-[#62e8bb]"
              : actionState.disabled
                ? "cursor-not-allowed border-white/10 bg-white/[0.05] text-[var(--rp-muted)]"
                : "border-[rgba(242,193,91,0.72)] bg-[linear-gradient(180deg,rgba(242,193,91,0.12),rgba(242,193,91,0.06))] text-[var(--rp-primary)] shadow-[0_10px_22px_rgba(242,193,91,0.07)] hover:bg-[rgba(242,193,91,0.16)]",
          )}
        >
          <ActionIcon className="h-4 w-4" />
          {actionState.label}
        </button>
      </div>
    </article>
  );
}

function RideRequestDetailModal({
  request,
  onClose,
  onInterested,
}: {
  request: RideRequest;
  onClose: () => void;
  onInterested: (id: string) => void;
}) {
  const actionState = getActionState(request);
  const ActionIcon = actionState.icon;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/72 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-10 backdrop-blur-sm sm:grid sm:place-items-center sm:py-8">
      <button type="button" aria-label="Close ride request details" className="fixed inset-0 cursor-default" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ride-request-detail-title"
        className="relative z-10 mx-auto w-full max-w-md rounded-[26px] border border-[rgba(242,193,91,0.28)] bg-[linear-gradient(180deg,#0c1824,#07111a)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-left text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Ride request</p>
            <h2 id="ride-request-detail-title" className="mt-2 text-left text-2xl font-black leading-tight text-[var(--rp-text)]">
              {request.from} -&gt; {request.to}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 text-xs font-bold text-[var(--rp-muted-strong)]">
                <CalendarDays className="h-3.5 w-3.5" />
                {request.dateLabel}, {request.timeLabel}
              </span>
              <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-black", statusCopy[request.status].className)}>
                <Clock3 className="h-3.5 w-3.5" />
                {statusCopy[request.status].label}
              </span>
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 text-xs font-bold text-[var(--rp-muted-strong)]">
                <Route className="h-3.5 w-3.5" />
                {request.rideType}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 text-left">
              <div>
                <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Pickup flexibility</dt>
                <dd className="mt-1 text-sm font-bold leading-5 text-[var(--rp-text)]">{request.pickupFlexibility}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Interested users</dt>
                <dd className="mt-1 text-sm font-bold leading-5 text-[var(--rp-text)]">
                  {getInterestedLabel(request.interestedCount)} of {request.maxPeople} target riders
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Expiry</dt>
                <dd className="mt-1 text-sm font-bold leading-5 text-[var(--rp-text)]">{request.expiryLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[rgba(242,193,91,0.28)] bg-[rgba(242,193,91,0.1)] text-[var(--rp-primary)]">
                <UserRound className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-left text-base font-black text-[var(--rp-text)]">{request.host.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-left text-xs font-bold text-[var(--rp-muted-strong)]">
                  <Star className="h-3.5 w-3.5 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
                  {request.host.rating.toFixed(1)} rating, {request.host.rideCount} rides
                </p>
              </div>
            </div>
            <div className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(98,232,187,0.24)] bg-[rgba(98,232,187,0.1)] px-3 text-xs font-black text-[#62e8bb]">
              <ShieldCheck className="h-4 w-4" />
              {request.host.trustLabel}
            </div>
          </div>

          <p className="rounded-[16px] border border-white/10 bg-[#06111d]/78 px-4 py-3 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {request.note}
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            disabled={actionState.disabled}
            onClick={() => onInterested(request.id)}
            className={cn(
              "inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[18px] px-5 text-base font-black transition",
              request.userInterested
                ? "border border-[rgba(98,232,187,0.32)] bg-[rgba(98,232,187,0.12)] text-[#62e8bb]"
                : actionState.disabled
                  ? "cursor-not-allowed border border-white/10 bg-white/[0.05] text-[var(--rp-muted)]"
                  : "bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_58%,#d9912f_100%)] text-[var(--rp-primary-text)] shadow-[0_18px_36px_rgba(242,193,91,0.22)] hover:brightness-105",
            )}
          >
            <ActionIcon className="h-5 w-5" />
            {actionState.label}
          </button>

          {request.chatAllowed ? (
            <button
              type="button"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-5 text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
            >
              <MessageCircle className="h-5 w-5 text-[var(--rp-primary)]" />
              Message / View chat
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PostRideRequestForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (values: RideRequestFormValues) => void;
}) {
  const [values, setValues] = useState<RideRequestFormValues>(() => ({
    ...defaultFormValues,
    date: getTodayInputValue(),
    time: "18:00",
  }));

  const inputClass =
    "min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)] focus:ring-2 focus:ring-[rgba(242,193,91,0.18)]";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/72 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-10 backdrop-blur-sm sm:grid sm:place-items-center sm:py-8">
      <button type="button" aria-label="Close post ride request form" className="fixed inset-0 cursor-default" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-ride-request-title"
        className="relative z-10 mx-auto w-full max-w-md rounded-[26px] border border-[rgba(242,193,91,0.28)] bg-[linear-gradient(180deg,#0c1824,#07111a)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-left text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Quick post</p>
            <h2 id="post-ride-request-title" className="mt-2 text-left text-2xl font-black text-[var(--rp-text)]">
              Post Ride Request
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">From</span>
              <input
                required
                value={values.from}
                onChange={(event) => setValues((current) => ({ ...current, from: event.target.value }))}
                className={inputClass}
                placeholder="Pickup area"
              />
            </label>
            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">To</span>
              <input
                required
                value={values.to}
                onChange={(event) => setValues((current) => ({ ...current, to: event.target.value }))}
                className={inputClass}
                placeholder="Destination"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Date</span>
              <input
                required
                type="date"
                value={values.date}
                min={getTodayInputValue()}
                onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Time</span>
              <input
                required
                type="time"
                value={values.time}
                onChange={(event) => setValues((current) => ({ ...current, time: event.target.value }))}
                className={inputClass}
              />
            </label>
          </div>

          <label className="grid gap-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Flexible time range</span>
            <input
              value={values.pickupFlexibility}
              onChange={(event) => setValues((current) => ({ ...current, pickupFlexibility: event.target.value }))}
              className={inputClass}
              placeholder="Flexible within 10 minutes"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Ride type</span>
              <select
                value={values.rideType}
                onChange={(event) => setValues((current) => ({ ...current, rideType: event.target.value as RideType }))}
                className={inputClass}
              >
                {rideTypeOptions.map((rideType) => (
                  <option key={rideType} value={rideType}>
                    {rideType}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Max people</span>
              <input
                required
                type="number"
                min="1"
                max="6"
                value={values.maxPeople}
                onChange={(event) => setValues((current) => ({ ...current, maxPeople: event.target.value }))}
                className={inputClass}
              />
            </label>
          </div>

          <label className="grid gap-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Short note</span>
            <textarea
              value={values.note}
              onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))}
              className={cn(inputClass, "min-h-[92px] resize-none py-3 leading-6")}
              placeholder="Add pickup details or timing notes"
              maxLength={160}
            />
          </label>

          <label className="grid gap-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Expiry time</span>
            <select
              value={values.expiryTime}
              onChange={(event) => setValues((current) => ({ ...current, expiryTime: event.target.value }))}
              className={inputClass}
            >
              <option value="departure">After departure</option>
              <option value="thirty_before">30 minutes before departure</option>
              <option value="one_hour">1 hour after posting</option>
            </select>
          </label>

          <button
            type="submit"
            className="mt-1 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_58%,#d9912f_100%)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_36px_rgba(242,193,91,0.22)] transition hover:brightness-105"
          >
            <Send className="h-5 w-5" />
            Post Ride Request
          </button>
        </form>
      </section>
    </div>
  );
}

function EmptyRideBoard({ onPostClick }: { onPostClick: () => void }) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(145deg,rgba(14,28,42,0.92),rgba(6,16,25,0.96))] px-5 py-8 text-center shadow-[var(--rp-shadow-soft)]">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] border border-[rgba(242,193,91,0.28)] bg-[rgba(242,193,91,0.1)] text-[var(--rp-primary)]">
        <Navigation className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-2xl font-black text-[var(--rp-text)]">No ride requests nearby yet.</h2>
      <p className="mx-auto mt-2 max-w-[280px] text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
        Post one and see who is going your way.
      </p>
      <div className="mt-5">
        <PostRideRequestButton onClick={onPostClick} compact />
      </div>
    </section>
  );
}

function RideBoardToast({ message }: { message: string }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[95] px-4 lg:bottom-8 lg:left-72">
      <div className="mx-auto flex min-h-12 max-w-md items-center gap-2 rounded-[18px] border border-[rgba(98,232,187,0.28)] bg-[linear-gradient(180deg,rgba(13,38,34,0.98),rgba(8,24,28,0.98))] px-4 py-3 text-sm font-bold leading-5 text-[#bdf8df] shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#62e8bb]" />
        {message}
      </div>
    </div>
  );
}

export default function RideBoardPage() {
  const [activeFilter, setActiveFilter] = useState<RideBoardFilter>("near_me");
  const [requests, setRequests] = useState<RideRequest[]>(initialRideRequests);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  const visibleRequests = useMemo(() => getVisibleRequests(requests, activeFilter), [requests, activeFilter]);
  const selectedRequest = selectedRequestId ? requests.find((request) => request.id === selectedRequestId) ?? null : null;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(""), 3200);
  };

  const handleInterested = (requestId: string) => {
    setRequests((currentRequests) =>
      currentRequests.map((request) => {
        if (request.id !== requestId || request.userInterested || request.status === "closed" || request.status === "expired") {
          return request;
        }

        return {
          ...request,
          interestedCount: request.interestedCount + 1,
          userInterested: true,
        };
      }),
    );
    showToast("You're interested. We'll notify you if this ride forms.");
  };

  const handlePostSubmit = (values: RideRequestFormValues) => {
    const newRequest: RideRequest = {
      id: `posted-${Date.now()}`,
      from: values.from.trim(),
      to: values.to.trim(),
      dateLabel: formatDateLabel(values.date),
      timeLabel: formatTimeLabel(values.time),
      departureDate: values.date,
      departureTime: values.time,
      rideType: values.rideType,
      category: rideTypeToCategory[values.rideType],
      pickupFlexibility: values.pickupFlexibility.trim() || "Flexible pickup",
      maxPeople: Math.max(Number(values.maxPeople) || 1, 1),
      interestedCount: 0,
      status: getRequestStatus(values.date, values.time),
      host: {
        name: "trial_2",
        rating: 4.9,
        rideCount: 12,
        trustLabel: "RidePod profile verified",
      },
      note: values.note.trim() || "Looking for people going the same way.",
      saved: false,
      chatAllowed: false,
      expiryLabel:
        values.expiryTime === "thirty_before"
          ? "30 minutes before departure"
          : values.expiryTime === "one_hour"
            ? "1 hour after posting"
            : "After departure",
    };

    setRequests((currentRequests) => [newRequest, ...currentRequests]);
    setActiveFilter("near_me");
    setShowPostForm(false);
    showToast("Ride request posted. We'll show it to nearby riders.");
  };

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-1.25rem)] overflow-hidden bg-[linear-gradient(180deg,#050b12_0%,#07111a_48%,#050b12_100%)] pb-5 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(242,193,91,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(242,193,91,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.13]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto grid w-full max-w-[560px] gap-6 px-4 pb-5 pt-5 sm:px-6 lg:max-w-3xl lg:pt-8">
        <RideBoardHero />

        <section>
          <h1 className="text-left text-[52px] font-black leading-none tracking-tight text-[var(--rp-text)] min-[390px]:text-[60px]">
            Ride Board
          </h1>
          <div className="mt-6">
            <PostRideRequestButton onClick={() => setShowPostForm(true)} />
          </div>
        </section>

        <RideBoardFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        <section className="grid gap-4" aria-label="Public ride requests">
          {visibleRequests.length > 0 ? (
            visibleRequests.map((request) => (
              <RideRequestCard
                key={request.id}
                request={request}
                onOpen={setSelectedRequestId}
                onInterested={handleInterested}
              />
            ))
          ) : (
            <EmptyRideBoard onPostClick={() => setShowPostForm(true)} />
          )}
        </section>
      </div>

      {selectedRequest ? (
        <RideRequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequestId(null)}
          onInterested={handleInterested}
        />
      ) : null}
      {showPostForm ? <PostRideRequestForm onClose={() => setShowPostForm(false)} onSubmit={handlePostSubmit} /> : null}
      {toastMessage ? <RideBoardToast message={toastMessage} /> : null}
    </div>
  );
}
