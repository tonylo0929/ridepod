"use client";

import Image from "next/image";
import {
  Bookmark,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Lock,
  MapPin,
  MessageCircle,
  Moon,
  Plus,
  Route,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
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

type RideRequestCategory = "today_requests" | "commute" | "events" | "late_night" | "others";
type RideBoardFilter = "all" | RideRequestCategory;
type RideRequestStatus = "open" | "leaving_soon" | "closed" | "expired";
type RecurrenceType = "One-time" | "Recurring";
type EventTiming = "Going to event" | "Leaving after event" | "Both possible";
type TimeFlexibility = "Exact time" | "±15 minutes" | "±30 minutes" | "Flexible";
type PickupFlexibility = "Exact pickup point" | "Nearby pickup okay" | "Decide in chat";

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
  category: RideRequestCategory;
  detailLine: string;
  maxPeople: number;
  interestedCount: number;
  status: RideRequestStatus;
  host: RideRequestHost;
  note: string;
  chatAllowed: boolean;
  userInterested?: boolean;
  saved?: boolean;
  expiryLabel: string;
  visibilityLabel: string;
  extraLabel?: string;
};

type RideRequestFormValues = {
  category: RideRequestCategory;
  from: string;
  to: string;
  date: string;
  time: string;
  maxPeople: string;
  note: string;
  visibility: string;
  expiryTime: string;
  timeFlexibility: TimeFlexibility;
  repeatPattern: string;
  recurrenceType: RecurrenceType;
  eventName: string;
  eventTiming: EventTiming;
  pickupFlexibility: PickupFlexibility;
  requestType: string;
};

const rideBoardFilters: Array<{ id: RideBoardFilter; label: string; icon: typeof MapPin }> = [
  { id: "all", label: "All", icon: MapPin },
  { id: "today_requests", label: "Today Requests", icon: Clock3 },
  { id: "commute", label: "Commute", icon: Route },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "late_night", label: "Late Night", icon: Moon },
  { id: "others", label: "Others", icon: ShieldCheck },
];

const rideBoardCategories: Array<{
  id: "today-requests" | "commute" | "events" | "late-night" | "others";
  label: string;
  subtitle: string;
  image: string;
  filter: RideRequestCategory;
  featured?: boolean;
  eyebrow?: string;
  ctaLabel?: string;
  objectPosition: string;
  tone?: "mint" | "gold";
}> = [
  {
    id: "today-requests",
    label: "Today Requests",
    subtitle: "Find rides happening today, near you.",
    image: "/images/ride-board/today-requests.png",
    filter: "today_requests",
    featured: true,
    eyebrow: "Featured",
    ctaLabel: "Browse Today",
    objectPosition: "right center",
  },
  {
    id: "commute",
    label: "Commute",
    subtitle: "Daily rides. Better together.",
    image: "/images/ride-board/commute.png",
    filter: "commute",
    objectPosition: "center bottom",
  },
  {
    id: "events",
    label: "Events",
    subtitle: "Go together. Enjoy more.",
    image: "/images/ride-board/events.png",
    filter: "events",
    objectPosition: "right center",
  },
  {
    id: "late-night",
    label: "Late Night",
    subtitle: "Safe rides. Anytime.",
    image: "/images/ride-board/late-night.png",
    filter: "late_night",
    objectPosition: "right bottom",
  },
  {
    id: "others",
    label: "Others",
    subtitle: "Flexible rides. Your way.",
    image: "/images/ride-board/others.png",
    filter: "others",
    objectPosition: "right bottom",
    tone: "gold",
  },
];

const postTypeOptions: Array<{ id: RideRequestCategory; label: string; description: string }> = [
  { id: "today_requests", label: "Today Requests", description: "For quick ride matching today, tonight, or soon." },
  { id: "commute", label: "Commute", description: "For regular work, school, or repeated routes." },
  { id: "events", label: "Events", description: "For concerts, shows, matches, exhibitions, or big venue trips." },
  { id: "late_night", label: "Late Night", description: "For safer ride sharing after dinner, drinks, overtime, or last train." },
  { id: "others", label: "Others", description: "For anything that does not fit the categories above." },
];

const categoryLabels: Record<RideRequestCategory, string> = {
  today_requests: "Today Requests",
  commute: "Commute",
  events: "Events",
  late_night: "Late Night",
  others: "Others",
};

const timeFlexibilityOptions: TimeFlexibility[] = ["Exact time", "±15 minutes", "±30 minutes", "Flexible"];
const recurrenceOptions: RecurrenceType[] = ["One-time", "Recurring"];
const eventTimingOptions: EventTiming[] = ["Going to event", "Leaving after event", "Both possible"];
const pickupFlexibilityOptions: PickupFlexibility[] = ["Exact pickup point", "Nearby pickup okay", "Decide in chat"];
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
    id: "board-shibuya-ebisu",
    from: "Shibuya",
    to: "Ebisu",
    dateLabel: "Today",
    timeLabel: "8:30 AM",
    departureDate: "2026-06-29",
    departureTime: "08:30",
    category: "today_requests",
    detailLine: "~45 min drive",
    maxPeople: 4,
    interestedCount: 3,
    status: "leaving_soon",
    host: {
      name: "Yuto S.",
      rating: 4.9,
      rideCount: 25,
      trustLabel: "RidePod member",
    },
    note: "Heading across town this morning. Happy to split fuel costs.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Estimated travel time",
  },
  {
    id: "board-shinjuku-tokyo",
    from: "Shinjuku",
    to: "Tokyo Station",
    dateLabel: "Today",
    timeLabel: "6:15 PM",
    departureDate: "2026-06-29",
    departureTime: "18:15",
    category: "commute",
    detailLine: "~20 min drive",
    maxPeople: 4,
    interestedCount: 2,
    status: "leaving_soon",
    host: {
      name: "Mika T.",
      rating: 4.8,
      rideCount: 18,
      trustLabel: "Trusted commute rider",
    },
    note: "Driving back after work. Let's ride together and beat the traffic!",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Estimated travel time",
  },
  {
    id: "board-roppongi-ginza",
    from: "Roppongi",
    to: "Ginza",
    dateLabel: "Tomorrow",
    timeLabel: "7:40 PM",
    departureDate: "2026-06-29",
    departureTime: "19:40",
    category: "events",
    detailLine: "~18 min drive",
    maxPeople: 3,
    interestedCount: 4,
    status: "open",
    host: {
      name: "Ari K.",
      rating: 4.7,
      rideCount: 34,
      trustLabel: "Event ride regular",
    },
    note: "Heading out after an event. Flexible pickup around the main exit.",
    chatAllowed: true,
    userInterested: true,
    saved: true,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Estimated travel time",
  },
  {
    id: "board-ueno-akihabara",
    from: "Ueno",
    to: "Akihabara",
    dateLabel: "Today",
    timeLabel: "9:00 PM",
    departureDate: "2026-06-29",
    departureTime: "21:00",
    category: "late_night",
    detailLine: "~12 min drive",
    maxPeople: 4,
    interestedCount: 4,
    status: "closed",
    host: {
      name: "Ren M.",
      rating: 4.9,
      rideCount: 61,
      trustLabel: "Fast response host",
    },
    note: "This request is full, but you can still view the public details.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Estimated travel time",
  },
  {
    id: "board-saved-sample",
    from: "Meguro",
    to: "Daikanyama",
    dateLabel: "Sat",
    timeLabel: "2:30 PM",
    departureDate: "2026-07-04",
    departureTime: "14:30",
    category: "others",
    detailLine: "~10 min drive",
    maxPeople: 3,
    interestedCount: 1,
    status: "open",
    host: {
      name: "Sam R.",
      rating: 4.6,
      rideCount: 18,
      trustLabel: "RidePod member",
    },
    note: "Light shopping trip with one suitcase. Saved for later.",
    chatAllowed: false,
    saved: true,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Request type",
  },
];

const defaultFormValues: RideRequestFormValues = {
  category: "today_requests",
  from: "",
  to: "",
  date: "",
  time: "",
  maxPeople: "3",
  note: "",
  visibility: "Public board",
  expiryTime: "departure",
  timeFlexibility: "Exact time",
  repeatPattern: "",
  recurrenceType: "One-time",
  eventName: "",
  eventTiming: "Going to event",
  pickupFlexibility: "Nearby pickup okay",
  requestType: "",
};

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
    if (filter === "all") return true;
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

function PostRideRequestButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_58%,#d9912f_100%)] px-5 font-black text-[var(--rp-primary-text)] shadow-[0_22px_46px_rgba(242,193,91,0.25)] transition hover:brightness-105 active:scale-[0.99]",
        compact ? "min-h-[54px] text-base" : "min-h-14 text-base",
      )}
    >
      <Plus className={cn("stroke-[2.5]", compact ? "h-5 w-5" : "h-8 w-8")} />
      Post Ride Request
    </button>
  );
}

function RideBoardCategoryArtwork({
  activeFilter,
  onCategorySelect,
}: {
  activeFilter: RideBoardFilter;
  onCategorySelect: (filter: RideRequestCategory) => void;
}) {
  const featuredCategory = rideBoardCategories.find((category) => category.featured);
  const secondaryCategories = rideBoardCategories.filter((category) => !category.featured);

  return (
    <section aria-label="Ride Board categories" className="grid gap-3">
      {featuredCategory ? (
        <RideBoardCategoryCard
          category={featuredCategory}
          active={activeFilter === featuredCategory.filter}
          onSelect={onCategorySelect}
          priority
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 max-[340px]:grid-cols-1">
        {secondaryCategories.map((category) => (
          <RideBoardCategoryCard
            key={category.id}
            category={category}
            active={activeFilter === category.filter}
            onSelect={onCategorySelect}
          />
        ))}
      </div>
    </section>
  );
}

function RideBoardCategoryCard({
  category,
  active,
  onSelect,
  priority = false,
}: {
  category: (typeof rideBoardCategories)[number];
  active: boolean;
  onSelect: (filter: RideRequestCategory) => void;
  priority?: boolean;
}) {
  const isFeatured = category.featured === true;
  const isGold = category.tone === "gold";
  const accentClassName = isGold ? "text-[var(--rp-primary)]" : "text-[#98FBCB]";
  const ringClassName = isGold
    ? "border-[var(--rp-primary)]/54 shadow-[0_20px_48px_rgba(0,0,0,0.34),0_0_28px_rgba(242,193,91,0.12)]"
    : "border-[#98FBCB]/64 shadow-[0_20px_48px_rgba(0,0,0,0.34),0_0_30px_rgba(152,251,203,0.16)]";

  return (
    <button
      type="button"
      onClick={() => onSelect(category.filter)}
      aria-pressed={active}
      aria-label={`Show ${category.label} ride requests`}
      className={cn(
        "group relative block w-full overflow-hidden border bg-[rgba(5,18,26,0.92)] text-left outline-none transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#98FBCB] active:translate-y-0",
        isFeatured ? "min-h-[188px] rounded-[28px] p-5" : "aspect-[1/1.08] rounded-[24px] p-3.5",
        active ? ringClassName : isGold ? "border-[var(--rp-primary)]/38" : "border-[#98FBCB]/22",
        !active && "shadow-[0_18px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#98FBCB]/44 hover:shadow-[0_20px_48px_rgba(0,0,0,0.32),0_0_24px_rgba(152,251,203,0.10)]",
      )}
    >
      <Image
        src={category.image}
        alt=""
        fill
        priority={priority}
        sizes={isFeatured ? "(max-width: 768px) 100vw, 560px" : "(max-width: 768px) 50vw, 270px"}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]",
          isFeatured ? "opacity-100" : "opacity-95",
        )}
        style={{ objectPosition: category.objectPosition }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0",
          isFeatured
            ? "bg-[linear-gradient(90deg,rgba(3,12,18,0.92)_0%,rgba(3,12,18,0.62)_38%,rgba(3,12,18,0.14)_68%,rgba(3,12,18,0)_100%)]"
            : "bg-[linear-gradient(135deg,rgba(3,12,18,0.9)_0%,rgba(3,12,18,0.66)_30%,rgba(3,12,18,0.24)_58%,rgba(3,12,18,0.04)_100%)]",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0",
          isGold
            ? "bg-[radial-gradient(circle_at_90%_88%,rgba(242,193,91,0.22),transparent_38%)]"
            : "bg-[radial-gradient(circle_at_86%_80%,rgba(152,251,203,0.16),transparent_40%)]",
        )}
      />
      {isFeatured ? (
        <span aria-hidden="true" className="absolute inset-y-5 left-0 w-1.5 rounded-r-full bg-[#98FBCB] shadow-[0_0_18px_rgba(152,251,203,0.58)]" />
      ) : null}

      <span className={cn("relative z-10 flex h-full flex-col items-start", isFeatured ? "max-w-[68%]" : "min-h-full")}>
        {isFeatured ? (
          <span className="rounded-full border border-[#98FBCB]/35 bg-[#98FBCB]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#98FBCB]">
            {category.eyebrow}
          </span>
        ) : null}
        <span
          className={cn(
            "block font-black leading-tight",
            accentClassName,
            isFeatured ? "mt-3 text-[18px] min-[390px]:text-[21px]" : "text-[14px] min-[390px]:text-[16px]",
          )}
        >
          {category.label}
        </span>
        <span
          className={cn(
            "block font-semibold leading-5 text-white/82",
            isFeatured ? "mt-1.5 text-[11px] min-[390px]:text-xs" : "mt-1 max-w-[8rem] text-[10px] min-[390px]:text-[11px]",
          )}
        >
          {category.subtitle}
        </span>

        {isFeatured ? (
          <span className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#98FBCB]/38 bg-[#98FBCB]/12 px-3 text-[11px] font-black text-[#98FBCB] transition group-hover:bg-[#98FBCB]/18">
            {category.ctaLabel}
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <span
            className={cn(
              "mt-auto grid h-10 w-10 place-items-center rounded-full border transition group-hover:scale-105",
              isGold
                ? "border-[var(--rp-primary)]/48 bg-[var(--rp-primary)]/14 text-[var(--rp-primary)]"
                : "border-[#98FBCB]/36 bg-[#98FBCB]/12 text-[#98FBCB]",
            )}
            aria-hidden="true"
          >
            <ChevronRight className="h-5 w-5" />
          </span>
        )}
      </span>
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
          const active = activeFilter === chip.id;
          const Icon = chip.icon;
          const isOthers = chip.id === "others";

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-black transition min-[390px]:text-[13px]",
                active
                  ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)] shadow-[0_0_24px_color-mix(in_srgb,var(--rp-primary)_20%,transparent)]"
                  : isOthers
                    ? "border-[var(--rp-primary)]/44 bg-[var(--rp-primary)]/8 text-[var(--rp-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-[var(--rp-primary)]/12"
                    : "border-white/10 bg-white/[0.055] text-[var(--rp-muted-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[var(--rp-border-strong)] hover:text-[var(--rp-text)]",
              )}
            >
              <Icon className="h-4 w-4 stroke-[2.2]" />
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
  const hostInitials = request.host.name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
        "group relative cursor-pointer overflow-hidden rounded-[22px] border border-[rgba(152,251,203,0.24)] bg-[linear-gradient(145deg,rgba(8,27,39,0.98),rgba(5,16,25,0.98))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.32),0_0_30px_rgba(52,211,183,0.08)] outline-none transition focus-visible:ring-2 focus-visible:ring-[#98FBCB]",
        request.status === "closed" && "border-white/10 opacity-80",
      )}
    >
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-black uppercase tracking-[0.12em]",
              request.category === "others"
                ? "border-white/12 bg-white/[0.06] text-[var(--rp-muted-strong)]"
                : "border-[#34e9ce]/55 bg-[#34e9ce]/10 text-[#34e9ce]",
            )}
          >
            <Star className="h-4 w-4" />
            {categoryLabels[request.category]}
          </span>
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--rp-muted-strong)]",
              request.saved && "text-[#98FBCB]",
            )}
            aria-label={request.saved ? "Saved ride request" : "Save ride request"}
          >
            <Bookmark className={cn("h-6 w-6", request.saved && "fill-[#98FBCB]/20")} />
          </span>
        </div>

        <h2 className="text-left text-[22px] font-black leading-tight tracking-tight text-[var(--rp-text)] min-[430px]:text-[24px]">
          <span className="break-words">{request.from}</span>
          <span className="mx-2 inline-flex text-[#34e9ce]">-&gt;</span>
          <span className="break-words">{request.to}</span>
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-bold text-[var(--rp-muted-strong)]">
            <CalendarDays className="h-4 w-4" />
            {request.dateLabel}, {request.timeLabel}
          </span>
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-bold text-[var(--rp-muted-strong)]">
            <CarFront className="h-4 w-4" />
            {request.detailLine.replace(/^~/, "")}
          </span>
          <span className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-black", status.className)}>
            <Clock3 className="h-4 w-4" />
            {status.label}
          </span>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[rgba(52,233,206,0.45)] bg-[linear-gradient(145deg,rgba(52,233,206,0.20),rgba(8,25,31,0.92))] text-lg font-black text-[#34e9ce]">
              {hostInitials || <UserRound className="h-5 w-5" />}
            </span>
              <div className="min-w-0">
                <p className="truncate text-left text-base font-black leading-5 text-[var(--rp-text)]">Host: {request.host.name}</p>
                <p className="mt-1 flex items-center gap-1 text-left text-sm font-bold leading-4 text-[var(--rp-muted-strong)]">
                <Star className="h-4 w-4 shrink-0 fill-[var(--rp-primary)] text-[var(--rp-primary)]" />
                {request.host.rating.toFixed(1)} ({request.host.rideCount} rides)
              </p>
              </div>
            </div>
            <div className="rounded-[14px] border border-white/10 bg-white/[0.055] px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-2xl font-black leading-none text-[#34e9ce]">{request.interestedCount}</p>
              <p className="mt-1 text-[11px] font-semibold leading-3 text-[var(--rp-muted-strong)]">interested</p>
            </div>
          </div>
        </div>

        <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-white/10 bg-[#06111d]/75 px-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <MessageCircle className="h-8 w-8 shrink-0 text-[#34e9ce]" />
            <p className="min-w-0 overflow-hidden text-left text-sm font-semibold leading-5 text-[var(--rp-muted-strong)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {request.note}
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(request.id);
            }}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-[12px] border border-[#34e9ce]/60 bg-[#34e9ce]/5 px-3 text-xs font-black text-[#34e9ce] transition hover:bg-[#34e9ce]/12"
          >
            View details
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleInterestClick}
            disabled={actionState.disabled}
            className={cn(
              "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[14px] px-4 text-base font-black transition",
              request.userInterested
                ? "border border-[#34e9ce]/45 bg-[#34e9ce]/12 text-[#34e9ce]"
                : actionState.disabled
                  ? "cursor-not-allowed border border-white/10 bg-white/[0.05] text-[var(--rp-muted)]"
                  : "bg-[linear-gradient(180deg,#53f5dc_0%,#34e9ce_55%,#21c5b0_100%)] text-[#041016] shadow-[0_18px_36px_rgba(52,233,206,0.20)] hover:brightness-105",
            )}
          >
            <ActionIcon className="h-5 w-5" />
            {actionState.label}
          </button>
        </div>
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
        className="relative z-10 mx-auto w-full max-w-md rounded-[26px] border border-[rgba(152,251,203,0.28)] bg-[linear-gradient(180deg,#0c1824,#07111a)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-left text-xs font-black uppercase tracking-[0.14em] text-[#98FBCB]">Ride request</p>
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
                {categoryLabels[request.category]}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 text-left">
              <div>
                <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-[#98FBCB]">{request.extraLabel ?? "Request details"}</dt>
                <dd className="mt-1 text-sm font-bold leading-5 text-[var(--rp-text)]">{request.detailLine}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-[#98FBCB]">Interested users</dt>
                <dd className="mt-1 text-sm font-bold leading-5 text-[var(--rp-text)]">
                  {getInterestedLabel(request.interestedCount)} of {request.maxPeople} target riders
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-[#98FBCB]">Expiry</dt>
                <dd className="mt-1 text-sm font-bold leading-5 text-[var(--rp-text)]">{request.expiryLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-[#98FBCB]">Visibility</dt>
                <dd className="mt-1 text-sm font-bold leading-5 text-[var(--rp-text)]">{request.visibilityLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[rgba(152,251,203,0.32)] bg-[rgba(152,251,203,0.1)] text-[#98FBCB]">
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
            <div className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(152,251,203,0.24)] bg-[rgba(152,251,203,0.1)] px-3 text-xs font-black text-[#98FBCB]">
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
                ? "border border-[rgba(152,251,203,0.32)] bg-[rgba(152,251,203,0.12)] text-[#98FBCB]"
                : actionState.disabled
                  ? "cursor-not-allowed border border-white/10 bg-white/[0.05] text-[var(--rp-muted)]"
                  : "border border-[rgba(152,251,203,0.72)] bg-[linear-gradient(180deg,rgba(152,251,203,0.14),rgba(152,251,203,0.06))] text-[#98FBCB] shadow-[0_18px_36px_rgba(152,251,203,0.12)] hover:bg-[rgba(152,251,203,0.16)]",
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
              <MessageCircle className="h-5 w-5 text-[#98FBCB]" />
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const selectedPostType = postTypeOptions.find((option) => option.id === values.category) ?? postTypeOptions[0];

  const inputClass =
    "min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[#98FBCB] focus:ring-2 focus:ring-[rgba(152,251,203,0.18)]";

  const handleDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStep(3);
  };

  const updateValue = <Key extends keyof RideRequestFormValues>(key: Key, value: RideRequestFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/72 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-10 backdrop-blur-sm sm:grid sm:place-items-center sm:py-8">
      <button type="button" aria-label="Close post ride request form" className="fixed inset-0 cursor-default" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-ride-request-title"
        className="relative z-10 mx-auto w-full max-w-md rounded-[26px] border border-[rgba(152,251,203,0.28)] bg-[linear-gradient(180deg,#0c1824,#07111a)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-left text-xs font-black uppercase tracking-[0.14em] text-[#98FBCB]">Quick post</p>
            <h2 id="post-ride-request-title" className="mt-2 text-left text-2xl font-black text-[var(--rp-text)]">
              {step === 1 ? "Choose post type" : step === 2 ? "Ride details" : "Review and post"}
            </h2>
            <p className="mt-1 text-left text-xs font-bold text-[var(--rp-muted-strong)]">Step {step} of 3</p>
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

        {step === 1 ? (
          <div className="mt-5 grid gap-3">
            {postTypeOptions.map((option) => {
              const selected = values.category === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateValue("category", option.id)}
                  className={cn(
                    "grid gap-1 rounded-[18px] border p-4 text-left transition",
                    selected
                      ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_14%,transparent)] shadow-[0_0_24px_color-mix(in_srgb,var(--rp-primary)_16%,transparent)]"
                      : "border-white/10 bg-white/[0.055] hover:border-[var(--rp-border-strong)]",
                  )}
                >
                  <span className={cn("text-base font-black", selected ? "text-[var(--rp-primary)]" : "text-[var(--rp-text)]")}>{option.label}</span>
                  <span className="text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">{option.description}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-1 inline-flex min-h-[54px] w-full items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_58%,#d9912f_100%)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_36px_rgba(242,193,91,0.22)] transition hover:brightness-105"
            >
              Continue
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <form className="mt-5 grid gap-4" onSubmit={handleDetailsSubmit}>
            <div className="rounded-[16px] border border-[rgba(152,251,203,0.22)] bg-[rgba(152,251,203,0.08)] px-3 py-2 text-left">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#98FBCB]">{selectedPostType.label}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{selectedPostType.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
              <label className="grid gap-2 text-left">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">From</span>
                <input required value={values.from} onChange={(event) => updateValue("from", event.target.value)} className={inputClass} placeholder="Pickup area" />
              </label>
              <label className="grid gap-2 text-left">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">To</span>
                <input required value={values.to} onChange={(event) => updateValue("to", event.target.value)} className={inputClass} placeholder="Destination" />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
              <label className="grid gap-2 text-left">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Date</span>
                <input required type="date" value={values.date} min={getTodayInputValue()} onChange={(event) => updateValue("date", event.target.value)} className={inputClass} />
              </label>
              <label className="grid gap-2 text-left">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Time</span>
                <input required type="time" value={values.time} onChange={(event) => updateValue("time", event.target.value)} className={inputClass} />
              </label>
            </div>

            {values.category === "today_requests" ? (
              <div className="grid gap-3">
                <p className="rounded-[14px] border border-white/10 bg-white/[0.055] px-3 py-2 text-left text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                  Today requests can automatically expire after the ride time.
                </p>
                <label className="grid gap-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">How flexible is your time?</span>
                  <select value={values.timeFlexibility} onChange={(event) => updateValue("timeFlexibility", event.target.value as TimeFlexibility)} className={inputClass}>
                    {timeFlexibilityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {values.category === "commute" ? (
              <div className="grid gap-3">
                <label className="grid gap-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Repeat pattern</span>
                  <input value={values.repeatPattern} onChange={(event) => updateValue("repeatPattern", event.target.value)} className={inputClass} placeholder="Weekdays, Monday only, every Friday..." />
                </label>
                <label className="grid gap-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">One-time or recurring?</span>
                  <select value={values.recurrenceType} onChange={(event) => updateValue("recurrenceType", event.target.value as RecurrenceType)} className={inputClass}>
                    {recurrenceOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {values.category === "events" ? (
              <div className="grid gap-3">
                <label className="grid gap-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Event name</span>
                  <input value={values.eventName} onChange={(event) => updateValue("eventName", event.target.value)} className={inputClass} placeholder="Coldplay, football match, concert, exhibition..." />
                </label>
                <label className="grid gap-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Before or after event?</span>
                  <select value={values.eventTiming} onChange={(event) => updateValue("eventTiming", event.target.value as EventTiming)} className={inputClass}>
                    {eventTimingOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {values.category === "late_night" ? (
              <div className="grid gap-3">
                <p className="rounded-[14px] border border-white/10 bg-white/[0.055] px-3 py-2 text-left text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                  Share only the ride plan first. Confirm exact pickup details after both sides agree.
                </p>
                <label className="grid gap-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Pickup flexibility</span>
                  <select value={values.pickupFlexibility} onChange={(event) => updateValue("pickupFlexibility", event.target.value as PickupFlexibility)} className={inputClass}>
                    {pickupFlexibilityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {values.category === "others" ? (
              <div className="grid gap-3">
                <label className="grid gap-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Request type</span>
                  <input value={values.requestType} onChange={(event) => updateValue("requestType", event.target.value)} className={inputClass} placeholder="Describe your ride situation here." />
                </label>
                <p className="rounded-[14px] border border-white/10 bg-white/[0.055] px-3 py-2 text-left text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                  Use Others only when the request does not fit Today, Commute, Events, or Late Night.
                </p>
              </div>
            ) : null}

            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Short note</span>
              <textarea value={values.note} onChange={(event) => updateValue("note", event.target.value)} className={cn(inputClass, "min-h-[92px] resize-none py-3 leading-6")} placeholder="Add pickup details or timing notes" maxLength={160} />
            </label>

            <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
              <label className="grid gap-2 text-left">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Number of people / seats</span>
                <input required type="number" min="1" max="6" value={values.maxPeople} onChange={(event) => updateValue("maxPeople", event.target.value)} className={inputClass} />
              </label>
              <label className="grid gap-2 text-left">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Visibility / expiry</span>
                <select value={values.visibility} onChange={(event) => updateValue("visibility", event.target.value)} className={inputClass}>
                  <option value="Public board">Public board</option>
                  <option value="Visible until ride time">Visible until ride time</option>
                  <option value="Hide after 24 hours">Hide after 24 hours</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Expiry setting</span>
              <select value={values.expiryTime} onChange={(event) => updateValue("expiryTime", event.target.value)} className={inputClass}>
                <option value="departure">After ride time</option>
                <option value="thirty_before">30 minutes before ride time</option>
                <option value="one_hour">1 hour after posting</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-5 text-base font-black text-[var(--rp-text)]">
                Back
              </button>
              <button type="submit" className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_58%,#d9912f_100%)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_36px_rgba(242,193,91,0.22)]">
                Review
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="mt-5 grid gap-4">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4 text-left">
              <span className="inline-flex min-h-7 items-center rounded-full border border-[rgba(152,251,203,0.34)] bg-[rgba(152,251,203,0.1)] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#98FBCB]">
                {categoryLabels[values.category]}
              </span>
              <h3 className="mt-3 text-xl font-black leading-tight text-[var(--rp-text)]">
                {values.from || "From"} -&gt; {values.to || "To"}
              </h3>
              <p className="mt-2 text-sm font-bold text-[var(--rp-muted-strong)]">
                {formatDateLabel(values.date)}, {formatTimeLabel(values.time)} · {values.maxPeople} people / seats
              </p>
              <p className="mt-3 rounded-[14px] border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {values.note.trim() || "Looking for people going the same way."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-5 text-base font-black text-[var(--rp-text)]">
                Edit
              </button>
              <button
                type="button"
                onClick={() => onSubmit(values)}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(180deg,#fff0b8_0%,#ffd36a_24%,#f2c15b_58%,#d9912f_100%)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_18px_36px_rgba(242,193,91,0.22)] transition hover:brightness-105"
              >
                <Send className="h-5 w-5" />
                Post
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function EmptyRideBoard({ onPostClick }: { onPostClick: () => void }) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(145deg,rgba(14,28,42,0.92),rgba(6,16,25,0.96))] px-5 py-8 text-center shadow-[var(--rp-shadow-soft)]">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] border border-[rgba(152,251,203,0.28)] bg-[rgba(152,251,203,0.1)] text-[#98FBCB]">
        <MapPin className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-2xl font-black text-[var(--rp-text)]">No ride requests yet</h2>
      <p className="mx-auto mt-2 max-w-[280px] text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
        Post the first one for this category.
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
      <div className="mx-auto flex min-h-12 max-w-md items-center gap-2 rounded-[18px] border border-[rgba(152,251,203,0.28)] bg-[linear-gradient(180deg,rgba(13,38,34,0.98),rgba(8,24,28,0.98))] px-4 py-3 text-sm font-bold leading-5 text-[#d8ffea] shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#98FBCB]" />
        {message}
      </div>
    </div>
  );
}

export default function RideBoardPage() {
  const [activeFilter, setActiveFilter] = useState<RideBoardFilter>("all");
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
    const detailLineByCategory: Record<RideRequestCategory, string> = {
      today_requests: values.timeFlexibility,
      commute: values.repeatPattern.trim() || values.recurrenceType,
      events: values.eventName.trim() || values.eventTiming,
      late_night: values.pickupFlexibility,
      others: values.requestType.trim() || "Other ride situation",
    };
    const extraLabelByCategory: Record<RideRequestCategory, string> = {
      today_requests: "Time flexibility",
      commute: "Commute pattern",
      events: "Event details",
      late_night: "Pickup flexibility",
      others: "Request type",
    };
    const newRequest: RideRequest = {
      id: `posted-${Date.now()}`,
      from: values.from.trim(),
      to: values.to.trim(),
      dateLabel: formatDateLabel(values.date),
      timeLabel: formatTimeLabel(values.time),
      departureDate: values.date,
      departureTime: values.time,
      category: values.category,
      detailLine: detailLineByCategory[values.category],
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
      chatAllowed: false,
      expiryLabel:
        values.expiryTime === "thirty_before"
          ? "30 minutes before departure"
          : values.expiryTime === "one_hour"
            ? "1 hour after posting"
            : "After departure",
      visibilityLabel: values.visibility,
      extraLabel: extraLabelByCategory[values.category],
    };

    setRequests((currentRequests) => [newRequest, ...currentRequests]);
    setActiveFilter(values.category);
    setShowPostForm(false);
    showToast("Ride request posted. We'll show it to nearby riders.");
  };

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-1.25rem)] overflow-hidden bg-[linear-gradient(180deg,#050b12_0%,#07111a_48%,#050b12_100%)] pb-5 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(152,251,203,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(152,251,203,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.13]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto grid w-full max-w-[560px] gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-6 sm:px-6 lg:max-w-3xl lg:pb-8 lg:pt-8">
        <section className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="whitespace-nowrap text-left text-[30px] font-black leading-none text-[var(--rp-text)] min-[390px]:text-[36px]">
              Ride Board
            </h1>
            <p className="mt-1.5 text-[13px] font-semibold leading-5 text-white/62 min-[390px]:text-sm">
              Find a ride. Share the journey.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className="mt-0.5 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#0fb7a8]/72 bg-[#0fb7a8]/8 px-3.5 text-xs font-black text-[#20d6c4] shadow-[0_0_26px_rgba(15,183,168,0.12)] transition hover:bg-[#0fb7a8]/14 min-[390px]:text-[13px]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </section>

        <RideBoardFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        <RideBoardCategoryArtwork activeFilter={activeFilter} onCategorySelect={setActiveFilter} />

        <PostRideRequestButton onClick={() => setShowPostForm(true)} compact />

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
