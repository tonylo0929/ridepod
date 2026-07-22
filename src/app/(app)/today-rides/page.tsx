"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
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
  type RefObject,
} from "react";
import { cn } from "@/components/ui";

type RideRequestCategory = "today_requests" | "schedule_later" | "commute" | "events" | "late_night" | "others";
type RideBoardCategory = "today" | "commute" | "events" | "late_night" | "others";
type RideBoardFilter = "all" | RideBoardCategory;
type RideBoardPreviewCategory = "today" | "schedule_later";
type RideBoardCategorySlug = "today-requests" | "commute" | "events" | "late-night" | "others";
type RideBoardDistrictFilter = "all_hk" | "hk_island" | "kowloon" | "new_territories" | "airport" | string;
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
  rideBoardCategory?: RideBoardCategory;
  rideCategory?: string;
  rideMode?: string;
  scheduleType?: string;
  tripKind?: string;
  routePolicy?: string;
  currentUserJoinIntentStatus?: string;
  eventName?: string;
  eventVenue?: string;
  purpose?: string;
  commuteLabel?: string;
  sameDay?: boolean;
  lateNight?: boolean;
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
  tags?: string[];
};

type RideRequestFormValues = {
  category: RideRequestCategory;
  from: string;
  to: string;
  date: string;
  time: string;
  maxPeople: string;
  note: string;
  tags: string;
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

const hkDistrictFilters: Array<{ id: RideBoardDistrictFilter; label: string; aliases: string[] }> = [
  { id: "all_hk", label: "All Hong Kong", aliases: [] },
  { id: "hk_island", label: "Hong Kong Island", aliases: ["hong kong island", "central", "admiralty", "wan chai", "causeway bay", "quarry bay", "hku", "lan kwai fong"] },
  { id: "kowloon", label: "Kowloon", aliases: ["kowloon", "tsim sha tsui", "tst", "jordan", "mong kok", "kowloon bay", "east kowloon", "kai tak", "k11 musea"] },
  { id: "new_territories", label: "New Territories", aliases: ["new territories", "sha tin", "tai po", "tuen mun", "yuen long", "tseung kwan o", "tko", "tsuen wan", "tung chung"] },
  { id: "airport", label: "Airport", aliases: ["airport", "hkia", "hong kong airport", "chek lap kok", "asiaworld-expo", "asia world expo"] },
  { id: "central", label: "Central", aliases: ["central", "lan kwai fong"] },
  { id: "causeway_bay", label: "Causeway Bay", aliases: ["causeway bay", "cwb"] },
  { id: "quarry_bay", label: "Quarry Bay", aliases: ["quarry bay"] },
  { id: "wan_chai", label: "Wan Chai", aliases: ["wan chai"] },
  { id: "tsim_sha_tsui", label: "Tsim Sha Tsui", aliases: ["tsim sha tsui", "tst", "k11 musea"] },
  { id: "mong_kok", label: "Mong Kok", aliases: ["mong kok"] },
  { id: "kowloon_bay", label: "Kowloon Bay / East Kowloon", aliases: ["kowloon bay", "east kowloon"] },
  { id: "sha_tin", label: "Sha Tin", aliases: ["sha tin", "shatin"] },
  { id: "tseung_kwan_o", label: "Tseung Kwan O", aliases: ["tseung kwan o", "tko"] },
  { id: "tai_po", label: "Tai Po", aliases: ["tai po"] },
  { id: "tuen_mun", label: "Tuen Mun", aliases: ["tuen mun"] },
  { id: "yuen_long", label: "Yuen Long", aliases: ["yuen long"] },
  { id: "tung_chung", label: "Tung Chung", aliases: ["tung chung"] },
];

const rideRequestCategoryToBoardCategory: Record<RideRequestCategory, RideBoardCategory> = {
  today_requests: "today",
  schedule_later: "others",
  commute: "commute",
  events: "events",
  late_night: "late_night",
  others: "others",
};

const rideBoardCategoryToRequestCategory: Record<RideBoardCategory, RideRequestCategory> = {
  today: "today_requests",
  commute: "commute",
  events: "events",
  late_night: "late_night",
  others: "others",
};

const rideBoardCategoryToSlug: Record<RideBoardCategory, RideBoardCategorySlug> = {
  today: "today-requests",
  commute: "commute",
  events: "events",
  late_night: "late-night",
  others: "others",
};

const rideBoardSlugToCategory: Record<RideBoardCategorySlug, RideBoardCategory> = {
  "today-requests": "today",
  commute: "commute",
  events: "events",
  "late-night": "late_night",
  others: "others",
};

function getRideBoardHref(filter: RideBoardFilter) {
  return filter === "all" ? "/today-rides" : `/today-rides/${rideBoardCategoryToSlug[filter]}`;
}

function getRideBoardPreviewHref(filter: RideBoardPreviewCategory) {
  return filter === "today" ? getRideBoardHref("today") : "/today-rides";
}

function getRideBoardFilterFromParam(param: string | string[] | undefined): RideBoardFilter {
  const slug = Array.isArray(param) ? param[0] : param;

  if (!slug) return "all";

  return slug in rideBoardSlugToCategory ? rideBoardSlugToCategory[slug as RideBoardCategorySlug] : "all";
}

type RideBoardEmptyCopy = {
  emptyHeading: string;
  emptyBody: string;
  emptyCtaLabel: string;
};

const rideBoardCategoryCopy: Record<
  RideBoardCategory,
  {
    heading: string;
    helper: string;
    emptyHeading: string;
    emptyBody: string;
    emptyCtaLabel: string;
  }
> = {
  today: {
    heading: "Today Requests",
    helper: "Short-notice rides happening today.",
    emptyHeading: "No today requests yet.",
    emptyBody: "Create a same-day ride request and see who is going the same way.",
    emptyCtaLabel: "Create today request",
  },
  commute: {
    heading: "Commute rides",
    helper: "Find repeated routes for work, school, or regular travel.",
    emptyHeading: "No commute pods yet.",
    emptyBody: "Create a commute pod for your regular route.",
    emptyCtaLabel: "Create commute pod",
  },
  events: {
    heading: "Event rides",
    helper: "Share rides before or after concerts, shows, games, and gatherings.",
    emptyHeading: "No event rides yet.",
    emptyBody: "Create a ride for an upcoming event.",
    emptyCtaLabel: "Create event ride",
  },
  late_night: {
    heading: "Late Night rides",
    helper: "Find rides for late-night travel with clear pickup, confirmation, and chat status.",
    emptyHeading: "No late-night rides yet.",
    emptyBody: "Create a late-night ride request.",
    emptyCtaLabel: "Create late-night ride",
  },
  others: {
    heading: "Other rides",
    helper: "Flexible shared ride requests.",
    emptyHeading: "No other rides yet.",
    emptyBody: "Create a flexible ride request.",
    emptyCtaLabel: "Create ride",
  },
};

const rideBoardPreviewCopy: Record<RideBoardPreviewCategory, RideBoardEmptyCopy & { heading: string; helper: string }> = {
  today: rideBoardCategoryCopy.today,
  schedule_later: {
    heading: "Schedule later",
    helper: "Plan ahead for tomorrow, commute days, events, and flexible routes.",
    emptyHeading: "No scheduled requests yet.",
    emptyBody: "Post a future ride request so riders can find it early.",
    emptyCtaLabel: "Create scheduled request",
  },
};

const rideBoardPreviewSeeMoreLabels: Record<RideBoardPreviewCategory, string> = {
  today: "View today's requests",
  schedule_later: "View scheduled requests",
};

type RideBoardCategoryDetail = {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  icon: typeof MapPin;
  chips: string[];
  listHeading: string;
  ctaLabel: string;
  accent: "teal" | "green" | "purple" | "indigo" | "gold";
};

const rideBoardCategoryDetails: Record<RideBoardCategory, RideBoardCategoryDetail> = {
  today: {
    eyebrow: "Featured - Today",
    title: "Today Requests",
    subtitle: "See who needs a ride near you today.",
    image: "/images/ride-board/today-requests.png",
    icon: UserRound,
    chips: ["Nearby", "Leaving Soon", "This Afternoon", "Tonight"],
    listHeading: "Requests happening today",
    ctaLabel: "Post Ride Request",
    accent: "teal",
  },
  commute: {
    eyebrow: "Daily Routes",
    title: "Commute Rides",
    subtitle: "Share your everyday route and split the cost.",
    image: "/images/ride-board/commute.png",
    icon: Route,
    chips: ["Morning", "Evening", "Weekdays", "Recurring"],
    listHeading: "Popular commute routes",
    ctaLabel: "Post Ride Request",
    accent: "green",
  },
  events: {
    eyebrow: "Event Travel",
    title: "Event Rides",
    subtitle: "Go together. Arrive together.",
    image: "/images/ride-board/events.png",
    icon: CalendarDays,
    chips: ["Concerts", "University", "Sports", "Weekend"],
    listHeading: "Upcoming event rides",
    ctaLabel: "Post Ride Request",
    accent: "purple",
  },
  late_night: {
    eyebrow: "After Dark",
    title: "Late Night Rides",
    subtitle: "A safer way to travel home together.",
    image: "/images/ride-board/late-night.png",
    icon: Moon,
    chips: ["Leaving Soon", "Tonight", "HK Island", "Kowloon"],
    listHeading: "Late-night rides near you",
    ctaLabel: "Post Ride Request",
    accent: "indigo",
  },
  others: {
    eyebrow: "Flexible Trips",
    title: "Other Rides",
    subtitle: "Flexible requests for every trip in between.",
    image: "/images/ride-board/others.png",
    icon: Send,
    chips: ["Shopping", "Errands", "Custom Route", "One-way"],
    listHeading: "Flexible ride requests",
    ctaLabel: "Post Ride Request",
    accent: "gold",
  },
};

const rideBoardAccentStyles: Record<
  RideBoardCategoryDetail["accent"],
  {
    heroBorder: string;
    countPill: string;
    activeChip: string;
    linkText: string;
    rowBorder: string;
    priceText: string;
    avatarRing: string;
  }
> = {
  teal: {
    heroBorder: "border-[#34e9ce]/42 shadow-[0_24px_64px_rgba(52,233,206,0.12)]",
    countPill: "border-[#34e9ce]/34 bg-[#092c34]/78 text-[#7df7ea]",
    activeChip: "border-[#34e9ce]/42 bg-[#34e9ce] text-[#032023]",
    linkText: "text-[#53f5dc]",
    rowBorder: "border-[#34e9ce]/26 hover:border-[#34e9ce]/46",
    priceText: "text-[#53f5dc]",
    avatarRing: "border-[#34e9ce]/38 bg-[#34e9ce]/14 text-[#9dfff3]",
  },
  green: {
    heroBorder: "border-[#62e48a]/38 shadow-[0_24px_64px_rgba(98,228,138,0.10)]",
    countPill: "border-[#62e48a]/34 bg-[#12331f]/78 text-[#9ff7b6]",
    activeChip: "border-[#62e48a]/42 bg-[#62e48a] text-[#032111]",
    linkText: "text-[#9ff7b6]",
    rowBorder: "border-[#62e48a]/24 hover:border-[#62e48a]/44",
    priceText: "text-[#9ff7b6]",
    avatarRing: "border-[#62e48a]/36 bg-[#62e48a]/14 text-[#b9ffca]",
  },
  purple: {
    heroBorder: "border-[#a673ff]/40 shadow-[0_24px_64px_rgba(166,115,255,0.12)]",
    countPill: "border-[#a673ff]/36 bg-[#241543]/78 text-[#d9c4ff]",
    activeChip: "border-[#a673ff]/46 bg-[#7c4fd9] text-white",
    linkText: "text-[#c8a9ff]",
    rowBorder: "border-[#a673ff]/24 hover:border-[#a673ff]/46",
    priceText: "text-[#c8a9ff]",
    avatarRing: "border-[#a673ff]/36 bg-[#a673ff]/14 text-[#eadfff]",
  },
  indigo: {
    heroBorder: "border-[#7691ff]/38 shadow-[0_24px_64px_rgba(118,145,255,0.12)]",
    countPill: "border-[#7691ff]/36 bg-[#121b45]/80 text-[#ccd6ff]",
    activeChip: "border-[#7691ff]/44 bg-[#3d63d9] text-white",
    linkText: "text-[#bfcaff]",
    rowBorder: "border-[#7691ff]/24 hover:border-[#7691ff]/46",
    priceText: "text-[#bfcaff]",
    avatarRing: "border-[#7691ff]/36 bg-[#7691ff]/14 text-[#e2e7ff]",
  },
  gold: {
    heroBorder: "border-[var(--rp-primary)]/46 shadow-[0_24px_64px_rgba(242,193,91,0.12)]",
    countPill: "border-[var(--rp-primary)]/42 bg-[#3a2a0b]/82 text-[var(--rp-primary)]",
    activeChip: "border-[var(--rp-primary)]/52 bg-[var(--rp-primary)] text-[#12120a]",
    linkText: "text-[var(--rp-primary)]",
    rowBorder: "border-[var(--rp-primary)]/30 hover:border-[var(--rp-primary)]/54",
    priceText: "text-[var(--rp-primary)]",
    avatarRing: "border-[var(--rp-primary)]/38 bg-[var(--rp-primary)]/14 text-[var(--rp-primary)]",
  },
};

const rideBoardCategories: Array<{
  id: "today-requests" | "schedule-later";
  label: string;
  subtitle: string;
  image: string;
  filter: RideBoardPreviewCategory;
  eyebrow?: string;
  ctaLabel?: string;
  objectPosition: string;
  tone?: "mint" | "gold";
}> = [
  {
    id: "today-requests",
    label: "Today's request",
    subtitle: "Find same-day ride requests near you.",
    image: "/images/ride-board/today-requests-card-20260722.png",
    filter: "today",
    eyebrow: "Now",
    ctaLabel: "Browse Today",
    objectPosition: "right center",
  },
  {
    id: "schedule-later",
    label: "Schedule later",
    subtitle: "Plan tomorrow, commute, events, or flexible routes.",
    image: "/images/ride-board/schedule-later-card-20260722.png",
    filter: "schedule_later",
    eyebrow: "Plan ahead",
    ctaLabel: "Browse Later",
    objectPosition: "center center",
  },
];

const postTypeOptions: Array<{ id: RideRequestCategory; label: string; description: string }> = [
  { id: "today_requests", label: "Today Requests", description: "For quick ride matching today, tonight, or soon." },
  { id: "schedule_later", label: "Schedule later", description: "For future ride requests planned ahead." },
];

const categoryLabels: Record<RideRequestCategory, string> = {
  today_requests: "Today Requests",
  schedule_later: "Schedule later",
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
    id: "board-causeway-central",
    from: "Causeway Bay",
    to: "Central",
    dateLabel: "Today",
    timeLabel: "7:30 PM",
    departureDate: "2026-07-04",
    departureTime: "19:30",
    category: "today_requests",
    rideBoardCategory: "today",
    sameDay: true,
    detailLine: "Same-day request",
    maxPeople: 4,
    interestedCount: 3,
    status: "open",
    host: {
      name: "Maya C.",
      rating: 4.9,
      rideCount: 25,
      trustLabel: "RidePod member",
    },
    note: "Heading across the harbour later today and open to a nearby pickup point.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Request type",
    tags: ["CausewayBay", "Central", "Today"],
  },
  {
    id: "board-tst-sha-tin-today",
    from: "Tsim Sha Tsui",
    to: "Sha Tin",
    dateLabel: "Today",
    timeLabel: "6:45 PM",
    departureDate: "2026-07-21",
    departureTime: "18:45",
    category: "today_requests",
    rideBoardCategory: "today",
    sameDay: true,
    detailLine: "After work",
    maxPeople: 4,
    interestedCount: 2,
    status: "open",
    host: {
      name: "Nora P.",
      rating: 4.8,
      rideCount: 16,
      trustLabel: "RidePod member",
    },
    note: "Leaving after work and happy to meet around TST station.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Request type",
    tags: ["TST", "ShaTin", "AfterWork"],
  },
  {
    id: "board-quarry-bay-tko-today",
    from: "Quarry Bay",
    to: "Tseung Kwan O",
    dateLabel: "Today",
    timeLabel: "8:10 PM",
    departureDate: "2026-07-21",
    departureTime: "20:10",
    category: "today_requests",
    rideBoardCategory: "today",
    sameDay: true,
    detailLine: "Same-day ride",
    maxPeople: 3,
    interestedCount: 1,
    status: "open",
    host: {
      name: "Calvin H.",
      rating: 4.7,
      rideCount: 11,
      trustLabel: "RidePod member",
    },
    note: "Can leave a little earlier if riders are ready.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Request type",
    tags: ["QuarryBay", "TKO", "Tonight"],
  },
  {
    id: "board-tko-central",
    from: "Tseung Kwan O",
    to: "Central",
    dateLabel: "Weekdays",
    timeLabel: "8:20 AM",
    departureDate: "2026-07-06",
    departureTime: "08:20",
    category: "commute",
    rideBoardCategory: "commute",
    scheduleType: "recurring",
    commuteLabel: "weekday commute",
    detailLine: "Weekday commute",
    maxPeople: 4,
    interestedCount: 2,
    status: "open",
    host: {
      name: "Jason L.",
      rating: 4.8,
      rideCount: 18,
      trustLabel: "Trusted commute rider",
    },
    note: "Regular morning route on weekdays. Looking for riders with a similar schedule.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Commute pattern",
    tags: ["TKO", "Central", "Commute"],
  },
  {
    id: "board-tuen-mun-central-commute",
    from: "Tuen Mun",
    to: "Central",
    dateLabel: "Weekdays",
    timeLabel: "8:00 AM",
    departureDate: "2026-07-22",
    departureTime: "08:00",
    category: "commute",
    rideBoardCategory: "commute",
    scheduleType: "recurring",
    commuteLabel: "weekday commute",
    detailLine: "Weekday commute",
    maxPeople: 4,
    interestedCount: 3,
    status: "open",
    host: {
      name: "Elaine T.",
      rating: 4.9,
      rideCount: 31,
      trustLabel: "Trusted commute rider",
    },
    note: "Regular weekday ride toward Central with a stable morning pickup.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Commute pattern",
  },
  {
    id: "board-yuen-long-kowloon-bay-commute",
    from: "Yuen Long",
    to: "Kowloon Bay",
    dateLabel: "Mon, Wed, Fri",
    timeLabel: "7:50 AM",
    departureDate: "2026-07-22",
    departureTime: "07:50",
    category: "commute",
    rideBoardCategory: "commute",
    scheduleType: "recurring",
    commuteLabel: "office commute",
    detailLine: "Regular routine",
    maxPeople: 4,
    interestedCount: 2,
    status: "open",
    host: {
      name: "Marco S.",
      rating: 4.8,
      rideCount: 22,
      trustLabel: "Trusted commute rider",
    },
    note: "Looking for regular riders with a similar office schedule.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Commute pattern",
  },
  {
    id: "board-asiaworld-mongkok",
    from: "AsiaWorld-Expo",
    to: "Mong Kok",
    dateLabel: "After concert",
    timeLabel: "10:45 PM",
    departureDate: "2026-07-12",
    departureTime: "22:45",
    category: "events",
    rideBoardCategory: "events",
    eventName: "Concert",
    eventVenue: "AsiaWorld-Expo",
    purpose: "event ride",
    detailLine: "Post-event ride",
    maxPeople: 3,
    interestedCount: 4,
    status: "open",
    host: {
      name: "Ari W.",
      rating: 4.7,
      rideCount: 34,
      trustLabel: "Event ride regular",
    },
    note: "Leaving after the concert. Flexible pickup around the main exits.",
    chatAllowed: true,
    userInterested: true,
    saved: true,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Event details",
    tags: ["AsiaWorld", "Concert", "MongKok"],
  },
  {
    id: "board-hku-concert-central",
    from: "HKU",
    to: "Central",
    dateLabel: "After show",
    timeLabel: "10:20 PM",
    departureDate: "2026-07-25",
    departureTime: "22:20",
    category: "events",
    rideBoardCategory: "events",
    eventName: "Campus concert",
    eventVenue: "HKU",
    purpose: "event ride",
    detailLine: "After-show ride",
    maxPeople: 4,
    interestedCount: 2,
    status: "open",
    host: {
      name: "Chloe N.",
      rating: 4.9,
      rideCount: 19,
      trustLabel: "Event ride regular",
    },
    note: "Meeting after the show near the main exit.",
    chatAllowed: true,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Event details",
    tags: ["HKU", "Central", "AfterShow"],
  },
  {
    id: "board-stadium-tko-events",
    from: "Kai Tak Stadium",
    to: "Tseung Kwan O",
    dateLabel: "Game night",
    timeLabel: "11:00 PM",
    departureDate: "2026-07-26",
    departureTime: "23:00",
    category: "events",
    rideBoardCategory: "events",
    eventName: "Match",
    eventVenue: "Kai Tak Stadium",
    purpose: "event ride",
    detailLine: "After-game ride",
    maxPeople: 4,
    interestedCount: 3,
    status: "open",
    host: {
      name: "Ken Y.",
      rating: 4.8,
      rideCount: 27,
      trustLabel: "Event ride regular",
    },
    note: "Leaving after the match, pickup can be around the north gate.",
    chatAllowed: true,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Event details",
  },
  {
    id: "board-lkf-taipo",
    from: "Lan Kwai Fong",
    to: "Tai Po",
    dateLabel: "Tonight",
    timeLabel: "12:30 AM",
    departureDate: "2026-07-05",
    departureTime: "00:30",
    category: "late_night",
    rideBoardCategory: "late_night",
    lateNight: true,
    detailLine: "Late-night pickup",
    maxPeople: 4,
    interestedCount: 1,
    status: "open",
    host: {
      name: "Ren C.",
      rating: 4.9,
      rideCount: 61,
      trustLabel: "Fast response host",
    },
    note: "Looking for a clear pickup point and confirmation before leaving.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Pickup flexibility",
  },
  {
    id: "board-central-midnight-tuen-mun",
    from: "Central",
    to: "Tuen Mun",
    dateLabel: "Tonight",
    timeLabel: "1:10 AM",
    departureDate: "2026-07-22",
    departureTime: "01:10",
    category: "late_night",
    rideBoardCategory: "late_night",
    lateNight: true,
    detailLine: "Late-night ride",
    maxPeople: 4,
    interestedCount: 2,
    status: "open",
    host: {
      name: "Ivy M.",
      rating: 4.8,
      rideCount: 29,
      trustLabel: "Fast response host",
    },
    note: "Looking for riders heading west after midnight.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Pickup flexibility",
  },
  {
    id: "board-mong-kok-late-night-yuen-long",
    from: "Mong Kok",
    to: "Yuen Long",
    dateLabel: "Late night",
    timeLabel: "12:50 AM",
    departureDate: "2026-07-23",
    departureTime: "00:50",
    category: "late_night",
    rideBoardCategory: "late_night",
    lateNight: true,
    detailLine: "After last train",
    maxPeople: 3,
    interestedCount: 1,
    status: "open",
    host: {
      name: "Oscar D.",
      rating: 4.7,
      rideCount: 14,
      trustLabel: "RidePod member",
    },
    note: "Planning ahead for a late route after the last train.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Pickup flexibility",
  },
  {
    id: "board-flexible-route",
    from: "Flexible pickup",
    to: "Flexible route",
    dateLabel: "Flexible",
    timeLabel: "2:30 PM",
    departureDate: "2026-07-11",
    departureTime: "14:30",
    category: "others",
    rideBoardCategory: "others",
    detailLine: "Flexible route",
    maxPeople: 3,
    interestedCount: 1,
    status: "open",
    host: {
      name: "Sam K.",
      rating: 4.6,
      rideCount: 18,
      trustLabel: "RidePod member",
    },
    note: "Flexible destination and timing. Share your route if it is nearby.",
    chatAllowed: false,
    saved: true,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Request type",
  },
  {
    id: "board-pet-friendly-flex",
    from: "Wan Chai",
    to: "Flexible East Kowloon",
    dateLabel: "Flexible",
    timeLabel: "4:00 PM",
    departureDate: "2026-07-24",
    departureTime: "16:00",
    category: "others",
    rideBoardCategory: "others",
    detailLine: "Flexible pickup",
    maxPeople: 3,
    interestedCount: 2,
    status: "open",
    host: {
      name: "Tara W.",
      rating: 4.9,
      rideCount: 20,
      trustLabel: "RidePod member",
    },
    note: "Flexible route for riders heading toward East Kowloon.",
    chatAllowed: false,
    expiryLabel: "After departure",
    visibilityLabel: "Public",
    extraLabel: "Request type",
  },
  {
    id: "board-shopping-flex-route",
    from: "K11 Musea",
    to: "Flexible New Territories",
    dateLabel: "Weekend",
    timeLabel: "3:15 PM",
    departureDate: "2026-07-25",
    departureTime: "15:15",
    category: "others",
    rideBoardCategory: "others",
    detailLine: "Flexible destination",
    maxPeople: 4,
    interestedCount: 2,
    status: "open",
    host: {
      name: "Ben F.",
      rating: 4.7,
      rideCount: 13,
      trustLabel: "RidePod member",
    },
    note: "Open to nearby destinations if routes match.",
    chatAllowed: false,
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
  tags: "",
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

function getTomorrowInputValue() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const localTomorrow = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000);
  return localTomorrow.toISOString().slice(0, 10);
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

function normalizeRequestTag(value: string) {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .slice(0, 24);
}

function parseRequestTags(value: string) {
  const tags = value
    .split(/[\s,]+/)
    .map(normalizeRequestTag)
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 6);
}

function formatRequestTag(tag: string) {
  const normalized = normalizeRequestTag(tag);
  return normalized ? `#${normalized}` : "";
}

function getRequestTags(request: RideRequest) {
  return request.tags?.map(formatRequestTag).filter(Boolean) ?? [];
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

function getRequestBoardCategory(request: RideRequest): RideBoardCategory {
  return request.rideBoardCategory ?? rideRequestCategoryToBoardCategory[request.category] ?? "others";
}

function getRequestSignalText(request: RideRequest) {
  return [
    request.category,
    request.rideBoardCategory,
    request.rideCategory,
    request.rideMode,
    request.scheduleType,
    request.tripKind,
    request.routePolicy,
    request.currentUserJoinIntentStatus,
    request.eventName,
    request.eventVenue,
    request.purpose,
    request.commuteLabel,
    request.detailLine,
    request.note,
    request.extraLabel,
    ...(request.tags ?? []),
    ...getRequestTags(request),
    request.dateLabel,
    request.timeLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizePlaceText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRequestPlaceSearchText(request: RideRequest) {
  return normalizePlaceText(
    [
      request.from,
      request.to,
      request.note,
      request.detailLine,
      ...(request.tags ?? []),
      ...getRequestTags(request),
      request.eventVenue,
      request.eventName,
      request.purpose,
      request.commuteLabel,
      request.extraLabel,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getDistrictFilterLabel(filter: RideBoardDistrictFilter) {
  return hkDistrictFilters.find((district) => district.id === filter)?.label ?? "All Hong Kong";
}

function matchesRideBoardDistrict(request: RideRequest, districtFilter: RideBoardDistrictFilter) {
  if (districtFilter === "all_hk") return true;

  const district = hkDistrictFilters.find((option) => option.id === districtFilter);
  if (!district) return true;

  const placeText = getRequestPlaceSearchText(request);

  return district.aliases.some((alias) => {
    const normalizedAlias = normalizePlaceText(alias);
    return normalizedAlias.length > 0 && placeText.includes(normalizedAlias);
  });
}

function isRideDateToday(request: RideRequest) {
  const dateLabel = request.dateLabel.trim().toLowerCase();
  return request.sameDay === true || request.departureDate === getTodayInputValue() || dateLabel === "today" || dateLabel.includes("today");
}

function isLateNightTime(request: RideRequest) {
  const [hourValue] = request.departureTime.split(":");
  const hour = Number(hourValue);

  if (Number.isNaN(hour)) return false;
  return hour >= 22 || hour < 6;
}

function matchesRideBoardCategory(request: RideRequest, filter: RideBoardCategory) {
  const boardCategory = getRequestBoardCategory(request);
  const signalText = getRequestSignalText(request);

  if (boardCategory === filter) return true;

  if (filter === "today") {
    return isRideDateToday(request);
  }

  if (filter === "commute") {
    return request.scheduleType === "recurring" || signalText.includes("commute") || signalText.includes("recurring") || signalText.includes("weekdays");
  }

  if (filter === "events") {
    return Boolean(request.eventName || request.eventVenue) || signalText.includes("event") || signalText.includes("concert") || signalText.includes("show") || signalText.includes("game") || signalText.includes("gathering");
  }

  if (filter === "late_night") {
    return request.lateNight === true || isLateNightTime(request) || signalText.includes("late night") || signalText.includes("late-night") || signalText.includes("after midnight");
  }

  return boardCategory === "others";
}

function getVisibleRequests(requests: RideRequest[], filter: RideBoardFilter, districtFilter: RideBoardDistrictFilter = "all_hk") {
  return requests.filter((request) => {
    if (request.status === "expired") return false;
    if (!matchesRideBoardDistrict(request, districtFilter)) return false;
    if (filter === "all") return true;
    return matchesRideBoardCategory(request, filter);
  });
}

function getVisiblePreviewRequests(requests: RideRequest[], filter: RideBoardPreviewCategory, districtFilter: RideBoardDistrictFilter = "all_hk") {
  return requests.filter((request) => {
    if (request.status === "expired") return false;
    if (!matchesRideBoardDistrict(request, districtFilter)) return false;
    if (filter === "today") return isRideDateToday(request);
    return !isRideDateToday(request);
  });
}

function getRideCountLabel(count: number) {
  return `${count} ${count === 1 ? "ride" : "rides"}`;
}

function getCompactRideCountLabel(count: number) {
  if (count >= 30) return "30+";
  return `${count}+`;
}

function getInterestedLabel(count: number) {
  return `${count} interested`;
}

const rideRequestSeatPrices: Record<string, number> = {
  "board-causeway-central": 45,
  "board-tst-sha-tin-today": 48,
  "board-quarry-bay-tko-today": 42,
  "board-tko-central": 34,
  "board-tuen-mun-central-commute": 38,
  "board-yuen-long-kowloon-bay-commute": 36,
  "board-asiaworld-mongkok": 55,
  "board-hku-concert-central": 25,
  "board-stadium-tko-events": 30,
  "board-lkf-taipo": 48,
  "board-wan-chai-tuen-mun-late": 55,
  "board-mong-kok-tko-late": 50,
  "board-yuen-long-ikea": 28,
  "board-shatin-outlet": 26,
  "board-central-repulse-bay": 30,
};

function getRideRequestSeatPrice(request: RideRequest) {
  if (rideRequestSeatPrices[request.id]) return rideRequestSeatPrices[request.id];

  const boardCategory = getRequestBoardCategory(request);
  if (boardCategory === "events") return 55;
  if (boardCategory === "late_night") return 48;
  if (boardCategory === "commute") return 38;
  if (boardCategory === "others") return 30;
  return 45;
}

function getRideRequestSeatLabel(request: RideRequest) {
  const availableSeats = Math.max(request.maxPeople - request.interestedCount, 1);
  return `${availableSeats} ${availableSeats === 1 ? "seat" : "seats"}`;
}

function getRideRequestPeople(request: RideRequest) {
  const fallbackInitials = ["A", "K", "M", "J"];
  const hostInitial =
    request.host.name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "RP";
  const avatarCount = Math.max(1, Math.min(3, request.interestedCount));
  const initials = Array.from({ length: avatarCount }, (_, index) => (index === 0 ? hostInitial : fallbackInitials[index] ?? "R"));

  return {
    initials,
    extraCount: Math.max(request.interestedCount - avatarCount, 0),
  };
}

function getActionState(request: RideRequest) {
  if (request.status === "closed") return { label: "Closed", disabled: true, icon: Lock };
  if (request.status === "expired") return { label: "Expired", disabled: true, icon: Clock3 };
  if (request.userInterested) return { label: "Interested", disabled: true, icon: CheckCircle2 };
  return { label: "I'm interested", disabled: false, icon: MessageCircle };
}

function PostRideRequestButton({
  onClick,
  compact = false,
  label = "Post Ride Request",
}: {
  onClick: () => void;
  compact?: boolean;
  label?: string;
}) {
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
      {label}
    </button>
  );
}

function RideBoardCategoryArtwork({
  selectedCategory,
  categoryCounts,
  onCategorySelect,
}: {
  selectedCategory: RideBoardPreviewCategory;
  categoryCounts: Record<RideBoardPreviewCategory, number>;
  onCategorySelect: (category: RideBoardPreviewCategory) => void;
}) {
  return (
    <section aria-label="Post a Request categories" className="grid gap-2">
      <div className="grid grid-cols-1 gap-3 p-px">
        {rideBoardCategories.map((category, index) => (
          <RideBoardCategoryCard
            key={category.id}
            category={category}
            active={selectedCategory === category.filter}
            count={categoryCounts[category.filter]}
            onClick={onCategorySelect}
            priority={index === 0}
          />
        ))}
      </div>
    </section>
  );
}

function RideBoardCategoryCard({
  category,
  active,
  count,
  onClick,
  priority = false,
}: {
  category: (typeof rideBoardCategories)[number];
  active: boolean;
  count: number;
  onClick: (category: RideBoardPreviewCategory) => void;
  priority?: boolean;
}) {
  const isGold = category.tone === "gold";
  const isScheduleLater = category.id === "schedule-later";
  const showWholeArtwork = category.id === "today-requests" || category.id === "schedule-later";
  const cardAspectClass = showWholeArtwork
    ? "aspect-[1792/1092]"
    : "aspect-[430/220] min-[720px]:aspect-[680/245]";

  return (
    <button
      type="button"
      onClick={() => onClick(category.filter)}
      aria-pressed={active}
      aria-label={`Show ${category.label} ride requests preview`}
      className={cn(
        "group relative block w-full overflow-hidden bg-[#030b12] text-left outline-none transition-[transform,box-shadow,filter] duration-300 ease-out after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:border after:transition-colors focus-visible:ring-2 focus-visible:ring-[#65E6D0] active:translate-y-0",
        showWholeArtwork ? "" : "hover:-translate-y-0.5 hover:scale-[1.01]",
        cardAspectClass,
        "rounded-[18px]",
        active
          ? cn(
              "z-10 brightness-[1.06]",
              isScheduleLater
                ? "shadow-[0_26px_60px_rgba(0,0,0,0.44),0_0_0_1px_rgba(242,193,91,0.35),0_0_42px_rgba(242,193,91,0.32)] after:border-2 after:border-[var(--rp-primary)]"
                : "shadow-[0_18px_42px_rgba(0,0,0,0.28)] after:border-transparent",
              showWholeArtwork ? "scale-100" : "-translate-y-0.5 scale-[1.015]",
            )
          : cn(
              "scale-100 shadow-[0_18px_42px_rgba(0,0,0,0.28)]",
              showWholeArtwork ? "after:border-transparent" : "after:border-[rgba(101,230,208,0.22)]",
            ),
      )}
    >
      <Image
        src={category.image}
        alt=""
        fill
        priority={priority}
        quality={68}
        sizes="(max-width: 768px) calc(100vw - 32px), 680px"
        style={{ objectPosition: category.objectPosition }}
        className={cn(
          "absolute inset-0 h-full w-full transition duration-500",
          showWholeArtwork ? "object-cover scale-100" : "object-cover",
          showWholeArtwork ? "" : active ? "scale-[1.015]" : "scale-100 group-hover:scale-[1.02]",
        )}
      />
      <span className="sr-only">
        {category.label}. {category.subtitle} {getRideCountLabel(count)}.
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-3 top-3 z-10 inline-flex min-h-7 items-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.08em] shadow-[0_10px_22px_rgba(0,0,0,0.36)] backdrop-blur-md min-[390px]:right-4 min-[390px]:top-4 min-[390px]:text-[11px]",
          isGold
            ? "border-[var(--rp-primary)]/42 bg-[rgba(21,24,20,0.72)] text-[var(--rp-primary)]"
            : "border-[#65E6D0]/38 bg-[rgba(5,18,26,0.72)] text-[#98FBCB]",
        )}
      >
        {getCompactRideCountLabel(count)}
      </span>
    </button>
  );
}

function getRideBoardPreviewCounts(requests: RideRequest[], districtFilter: RideBoardDistrictFilter = "all_hk") {
  return requests.reduce<Record<RideBoardPreviewCategory, number>>(
    (counts, request) => {
      if (request.status === "expired") return counts;
      if (!matchesRideBoardDistrict(request, districtFilter)) return counts;

      if (isRideDateToday(request)) {
        counts.today += 1;
      } else {
        counts.schedule_later += 1;
      }

      return counts;
    },
    {
      today: 0,
      schedule_later: 0,
    },
  );
}

function RideBoardDistrictFilterSheet({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: RideBoardDistrictFilter;
  onChange: (value: RideBoardDistrictFilter) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 px-3 pb-0 pt-10 backdrop-blur-sm">
      <button type="button" aria-label="Close district filters" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ride-board-district-filter-title"
        className="relative z-10 w-full max-w-md rounded-t-[28px] border border-[rgba(152,251,203,0.24)] bg-[linear-gradient(180deg,#0c1824,#07111a)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-24px_70px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-left text-xs font-black uppercase tracking-[0.14em] text-[#98FBCB]">Hong Kong district</p>
            <h2 id="ride-board-district-filter-title" className="mt-1 text-left text-xl font-black text-[var(--rp-text)]">
              Match host route places
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close district filters"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[var(--rp-muted-strong)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-left text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Choose an HK district. RideBoard matches pickup, destination, notes, and venue text written by hosts.
        </p>

        <div className="mt-4 grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
          {hkDistrictFilters.map((district) => {
            const selected = value === district.id;

            return (
              <button
                key={district.id}
                type="button"
                onClick={() => {
                  onChange(district.id);
                  onClose();
                }}
                className={cn(
                  "flex min-h-12 w-full items-center justify-between gap-3 rounded-[16px] border px-3 text-left text-sm font-black transition",
                  selected
                    ? "border-[#98FBCB] bg-[#98FBCB]/16 text-[#d8ffea]"
                    : "border-white/10 bg-white/[0.045] text-[var(--rp-muted-strong)] hover:border-[#98FBCB]/45 hover:text-[var(--rp-text)]",
                )}
              >
                <span>{district.label}</span>
                {selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#98FBCB]" /> : null}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function RideBoardPreviewSection({
  selectedCategory,
  requests,
  totalCount,
  onOpen,
  seeMoreHref,
  sectionRef,
}: {
  selectedCategory: RideBoardPreviewCategory;
  requests: RideRequest[];
  totalCount: number;
  onOpen: (id: string) => void;
  seeMoreHref: string;
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const copy = rideBoardPreviewCopy[selectedCategory];
  const seeMoreLabel = rideBoardPreviewSeeMoreLabels[selectedCategory];

  return (
    <section ref={sectionRef} className="grid scroll-mt-24 gap-3 rounded-[24px] border border-[rgba(101,230,208,0.18)] bg-[rgba(7,17,26,0.72)] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0 text-left">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#65E6D0]">Top posts</p>
          <h2 className="mt-1 text-xl font-black leading-tight text-[var(--rp-text)]">{copy.heading}</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{copy.helper}</p>
        </div>
        <span className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-[#65E6D0]/35 bg-[#65E6D0]/10 px-3 text-xs font-black text-[#98FBCB]">
          {Math.min(3, totalCount)} / {totalCount}
        </span>
      </div>

      {requests.length > 0 ? (
        <div className="grid gap-2.5">
          {requests.map((request) => (
            <RideBoardPreviewPostCard key={request.id} request={request} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-left">
          <p className="text-sm font-black text-[var(--rp-text)]">{copy.emptyHeading}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{copy.emptyBody}</p>
        </div>
      )}

      <Link
        href={seeMoreHref}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-[#65E6D0]/42 bg-[#65E6D0]/10 px-4 text-sm font-black text-[#98FBCB] shadow-[0_14px_34px_rgba(0,0,0,0.24)] transition hover:border-[#65E6D0]/70 hover:bg-[#65E6D0]/16 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#65E6D0]"
      >
        {seeMoreLabel}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function RideBoardPreviewPostCard({
  request,
  onOpen,
}: {
  request: RideRequest;
  onOpen: (id: string) => void;
}) {
  const status = statusCopy[request.status];
  const interestedProgressDegrees = Math.max(34, Math.min(340, Math.round((request.interestedCount / request.maxPeople) * 360)));
  const tags = getRequestTags(request);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(request.id);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(request.id)}
      onKeyDown={handleCardKeyDown}
      className="group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[rgba(152,251,203,0.22)] bg-[linear-gradient(145deg,rgba(8,27,39,0.94),rgba(5,16,25,0.98))] px-3 py-3 text-left shadow-[0_14px_34px_rgba(0,0,0,0.24)] outline-none transition hover:border-[#65E6D0]/54 focus-visible:ring-2 focus-visible:ring-[#65E6D0]"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#34e9ce]/35 bg-[#34e9ce]/12 text-xs font-black text-[#98FBCB]">
            {request.host.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-black leading-4 text-[var(--rp-text)] min-[390px]:text-sm">
              {request.from} <span className="text-[#34e9ce]">-&gt;</span> {request.to}
            </h3>
            <p className="mt-0.5 truncate text-xs font-bold leading-4 text-[var(--rp-muted-strong)]">
              {request.dateLabel}, {request.timeLabel} - {request.detailLine.replace(/^~/, "")}
            </p>
          </div>
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <span className={cn("inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-black", status.className)}>
            <Clock3 className="h-3.5 w-3.5" />
            {status.label}
          </span>
          <span className="truncate text-xs font-bold text-[var(--rp-muted-strong)]">Host: {request.host.name}</span>
        </div>
        {tags.length > 0 ? (
          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={`${request.id}-${tag}`}
                className="inline-flex min-h-6 items-center rounded-full border border-[#34e9ce]/26 bg-[#34e9ce]/10 px-2 text-[10px] font-black leading-none text-[#98FBCB]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid shrink-0 justify-items-end gap-2 border-l border-white/10 pl-3">
        <div className="grid justify-items-center gap-1">
          <div
            className="grid h-12 w-12 place-items-center rounded-full p-[3px] shadow-[0_0_18px_rgba(52,233,206,0.14)]"
            style={{
              background: `conic-gradient(#34e9ce 0deg ${interestedProgressDegrees}deg, rgba(52,233,206,0.18) ${interestedProgressDegrees}deg 360deg)`,
            }}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-[#06141f]">
              <span className="text-lg font-black leading-none text-[#34e9ce]">{request.interestedCount}</span>
            </div>
          </div>
          <p className="text-[10px] font-bold leading-none text-[var(--rp-muted-strong)]">interested</p>
        </div>
        <ChevronRight className="h-4 w-4 text-[#98FBCB] transition group-hover:translate-x-0.5" />
      </div>
    </article>
  );
}

function RideBoardCategoryDetailView({
  category,
  requests,
  totalCount,
  onOpen,
  onPostClick,
  sectionRef,
  headingRef,
}: {
  category: RideBoardCategory;
  requests: RideRequest[];
  totalCount: number;
  onOpen: (id: string) => void;
  onPostClick: () => void;
  sectionRef: RefObject<HTMLElement | null>;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const detail = rideBoardCategoryDetails[category];
  const styles = rideBoardAccentStyles[detail.accent];
  const emptyCopy = rideBoardCategoryCopy[category];

  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-3">
        <Link
          href="/today-rides"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--rp-primary)]/42 bg-white/[0.055] px-3.5 text-xs font-black text-[var(--rp-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-[var(--rp-primary)]/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Post a Request
        </Link>
      </div>

      <div className={cn("relative overflow-hidden rounded-[28px] border bg-[#071018]", styles.heroBorder)}>
        <div className="relative aspect-[16/10] min-h-[238px] w-full max-[380px]:min-h-[218px] min-[520px]:min-h-[286px]">
          <Image
            src={detail.image}
            alt={`${detail.title} illustration`}
            fill
            priority
            quality={75}
            sizes="(max-width: 768px) calc(100vw - 32px), 720px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,16,0.02),rgba(4,10,16,0.06)_62%,rgba(4,10,16,0.18))]" aria-hidden="true" />
          <span className={cn("absolute right-4 top-4 inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-black shadow-[0_12px_26px_rgba(0,0,0,0.32)] backdrop-blur-md", styles.countPill)}>
            {getRideCountLabel(totalCount)}
          </span>
          <span className="sr-only">
            {detail.eyebrow}. {detail.title}. {detail.subtitle}
          </span>
        </div>
      </div>

      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4" aria-label={`${detail.title} filters`}>
        <div className="flex min-w-max gap-2.5">
          {detail.chips.map((chip, index) => (
            <button
              key={chip}
              type="button"
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition",
                index === 0
                  ? styles.activeChip
                  : "border-white/10 bg-white/[0.075] text-[var(--rp-text)] hover:border-white/20",
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <section ref={sectionRef} className="grid scroll-mt-24 gap-3" aria-labelledby="ride-board-results-heading">
        <div className="flex items-center justify-between gap-3">
          <h1
            ref={headingRef}
            id="ride-board-results-heading"
            tabIndex={-1}
            className="text-left text-[24px] font-black leading-tight text-[var(--rp-text)] outline-none"
          >
            {detail.listHeading}
          </h1>
          <Link
            href={getRideBoardHref(category)}
            className={cn("inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-black transition hover:brightness-110", styles.linkText)}
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {requests.length > 0 ? (
          <div className="grid gap-2.5">
            {requests.map((request) => (
              <RideBoardCategoryResultRow
                key={request.id}
                request={request}
                accent={detail.accent}
                onOpen={onOpen}
              />
            ))}
          </div>
        ) : (
          <EmptyRideBoard copy={emptyCopy} onPostClick={onPostClick} />
        )}
      </section>

      <PostRideRequestButton onClick={onPostClick} compact label={detail.ctaLabel} />
    </section>
  );
}

function RideBoardCategoryResultRow({
  request,
  accent,
  onOpen,
}: {
  request: RideRequest;
  accent: RideBoardCategoryDetail["accent"];
  onOpen: (id: string) => void;
}) {
  const styles = rideBoardAccentStyles[accent];
  const people = getRideRequestPeople(request);
  const seatPrice = getRideRequestSeatPrice(request);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(request.id);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(request.id)}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border bg-[linear-gradient(145deg,rgba(16,30,42,0.96),rgba(7,17,26,0.98))] px-4 py-3.5 text-left shadow-[0_16px_38px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#65E6D0]",
        styles.rowBorder,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-black leading-5 text-[var(--rp-text)] min-[430px]:text-lg">
          {request.from} <span className={styles.priceText}>-&gt;</span> {request.to}
        </h2>
        <p className="mt-1 truncate text-[15px] font-semibold leading-5 text-white/68">
          {request.dateLabel}, {request.timeLabel}
        </p>
        <p className={cn("mt-1 text-[15px] font-bold leading-5", styles.priceText)}>HK${seatPrice} / seat</p>
      </div>

      <div className="grid min-w-[136px] shrink-0 grid-cols-[1fr_auto] items-center gap-2 border-l border-white/10 pl-3 max-[380px]:min-w-[112px] max-[380px]:pl-2">
        <div className="grid justify-items-end gap-2">
          <span className="inline-flex min-h-9 items-center rounded-full border border-[var(--rp-primary)]/32 bg-[var(--rp-primary)]/13 px-3 text-sm font-black text-[var(--rp-primary)]">
            {getRideRequestSeatLabel(request)}
          </span>
          <div className="flex items-center justify-end">
            {people.initials.map((initial, index) => (
              <span
                key={`${request.id}-${initial}-${index}`}
                className={cn(
                  "-ml-1.5 grid h-8 w-8 place-items-center rounded-full border bg-[#0d1822] text-[10px] font-black first:ml-0",
                  styles.avatarRing,
                )}
              >
                {initial}
              </span>
            ))}
            {people.extraCount > 0 ? (
              <span className="-ml-1.5 grid h-8 min-w-8 place-items-center rounded-full border border-white/10 bg-black/30 px-2 text-[11px] font-black text-white/82">
                +{people.extraCount}
              </span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white" />
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
  const tags = getRequestTags(request);

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
            {tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={`${request.id}-detail-${tag}`}
                    className="inline-flex min-h-7 items-center rounded-full border border-[#34e9ce]/30 bg-[#34e9ce]/10 px-3 text-xs font-black text-[#98FBCB]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

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
  initialCategory = defaultFormValues.category,
}: {
  onClose: () => void;
  onSubmit: (values: RideRequestFormValues) => void;
  initialCategory?: RideRequestCategory;
}) {
  const [values, setValues] = useState<RideRequestFormValues>(() => ({
    ...defaultFormValues,
    category: initialCategory,
    date: getTodayInputValue(),
    time: "18:00",
  }));
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const selectedPostType = postTypeOptions.find((option) => option.id === values.category) ?? postTypeOptions[0];
  const previewTags = parseRequestTags(values.tags);

  const inputClass =
    "min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[#98FBCB] focus:ring-2 focus:ring-[rgba(152,251,203,0.18)]";

  const handleDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStep(3);
  };

  const updateValue = <Key extends keyof RideRequestFormValues>(key: Key, value: RideRequestFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handlePostTypeSelect = (category: RideRequestCategory) => {
    setValues((current) => ({
      ...current,
      category,
      date:
        category === "schedule_later" && (!current.date || current.date === getTodayInputValue())
          ? getTomorrowInputValue()
          : category === "today_requests"
            ? getTodayInputValue()
            : current.date,
    }));
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
                  onClick={() => handlePostTypeSelect(option.id)}
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

            <label className="grid gap-2 text-left">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Tags</span>
              <input
                value={values.tags}
                onChange={(event) => updateValue("tags", event.target.value)}
                className={inputClass}
                placeholder="#HKU #Central #Concert"
              />
              <span className="text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">Add searchable tags separated by spaces or commas.</span>
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
              {previewTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewTags.map((tag) => (
                    <span
                      key={`review-${tag}`}
                      className="inline-flex min-h-7 items-center rounded-full border border-[#34e9ce]/30 bg-[#34e9ce]/10 px-3 text-xs font-black text-[#98FBCB]"
                    >
                      {formatRequestTag(tag)}
                    </span>
                  ))}
                </div>
              ) : null}
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

function EmptyRideBoard({
  copy,
  onPostClick,
}: {
  copy: RideBoardEmptyCopy;
  onPostClick: () => void;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(145deg,rgba(14,28,42,0.92),rgba(6,16,25,0.96))] px-5 py-8 text-center shadow-[var(--rp-shadow-soft)]">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] border border-[rgba(152,251,203,0.28)] bg-[rgba(152,251,203,0.1)] text-[#98FBCB]">
        <MapPin className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-2xl font-black text-[var(--rp-text)]">{copy.emptyHeading}</h2>
      <p className="mx-auto mt-2 max-w-[280px] text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
        {copy.emptyBody}
      </p>
      <div className="mt-5">
        <PostRideRequestButton onClick={onPostClick} compact label={copy.emptyCtaLabel} />
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
  const params = useParams();
  const router = useRouter();
  const routeFilter = getRideBoardFilterFromParam(params.category);
  const activeFilter = routeFilter;
  const [requests, setRequests] = useState<RideRequest[]>(initialRideRequests);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [previewCategory, setPreviewCategory] = useState<RideBoardPreviewCategory>("today");
  const districtFilter: RideBoardDistrictFilter = "all_hk";
  const [showPostForm, setShowPostForm] = useState(false);
  const [postFormCategory, setPostFormCategory] = useState<RideRequestCategory>(defaultFormValues.category);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef<number | null>(null);
  const previewListRef = useRef<HTMLElement | null>(null);
  const requestListRef = useRef<HTMLElement | null>(null);
  const requestListHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const visibleRequests = useMemo(() => getVisibleRequests(requests, activeFilter, districtFilter), [requests, activeFilter, districtFilter]);
  const previewRequests = useMemo(() => getVisiblePreviewRequests(requests, previewCategory, districtFilter), [previewCategory, requests, districtFilter]);
  const previewTopRequests = useMemo(() => previewRequests.slice(0, 3), [previewRequests]);
  const previewCategoryCounts = useMemo(() => getRideBoardPreviewCounts(requests, districtFilter), [requests, districtFilter]);
  const selectedRequest = selectedRequestId ? requests.find((request) => request.id === selectedRequestId) ?? null : null;
  const isCategoryPage = activeFilter !== "all";
  const activeCategory = isCategoryPage ? (activeFilter as RideBoardCategory) : null;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("post") !== "request") return;

    const openPostRequest = window.setTimeout(() => {
      setPostFormCategory(defaultFormValues.category);
      setShowPostForm(true);
      router.replace("/today-rides", { scroll: false });
    }, 0);

    return () => window.clearTimeout(openPostRequest);
  }, [router]);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(""), 3200);
  };

  const focusRideList = () => {
    window.requestAnimationFrame(() => {
      requestListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      requestListHeadingRef.current?.focus({ preventScroll: true });
    });
  };

  const handlePreviewCategorySelect = (category: RideBoardPreviewCategory) => {
    setPreviewCategory(category);
    window.requestAnimationFrame(() => {
      previewListRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const openPostForm = (category?: RideRequestCategory) => {
    const categoryToUse = category ?? (activeFilter === "all" ? defaultFormValues.category : rideBoardCategoryToRequestCategory[activeFilter]);
    setPostFormCategory(categoryToUse);
    setShowPostForm(true);
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
    const tags = parseRequestTags(values.tags);
    const detailLineByCategory: Record<RideRequestCategory, string> = {
      today_requests: values.timeFlexibility,
      schedule_later: "Planned ahead",
      commute: values.repeatPattern.trim() || values.recurrenceType,
      events: values.eventName.trim() || values.eventTiming,
      late_night: values.pickupFlexibility,
      others: values.requestType.trim() || "Other ride situation",
    };
    const extraLabelByCategory: Record<RideRequestCategory, string> = {
      today_requests: "Time flexibility",
      schedule_later: "Schedule type",
      commute: "Commute pattern",
      events: "Event details",
      late_night: "Pickup flexibility",
      others: "Request type",
    };
    const rideBoardCategory = rideRequestCategoryToBoardCategory[values.category];
    const newRequest: RideRequest = {
      id: `posted-${Date.now()}`,
      from: values.from.trim(),
      to: values.to.trim(),
      dateLabel: formatDateLabel(values.date),
      timeLabel: formatTimeLabel(values.time),
      departureDate: values.date,
      departureTime: values.time,
      category: values.category,
      rideBoardCategory,
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
      tags,
    };

    setRequests((currentRequests) => [newRequest, ...currentRequests]);
    router.push(getRideBoardHref(rideBoardCategory), { scroll: false });
    setShowPostForm(false);
    focusRideList();
    showToast("Ride request posted. We'll show it to nearby riders.");
  };

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-1.25rem)] overflow-hidden bg-[linear-gradient(180deg,#050b12_0%,#07111a_48%,#050b12_100%)] pb-5 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(152,251,203,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(152,251,203,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.13]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto grid w-full max-w-[560px] gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-6 sm:px-6 lg:max-w-3xl lg:pb-8 lg:pt-8">
        {activeCategory ? (
          <RideBoardCategoryDetailView
            category={activeCategory}
            requests={visibleRequests}
            totalCount={visibleRequests.length}
            onOpen={setSelectedRequestId}
            onPostClick={() => openPostForm()}
            sectionRef={requestListRef}
            headingRef={requestListHeadingRef}
          />
        ) : (
          <section className="flex items-start gap-4">
            <div className="min-w-0">
              <h1 className="whitespace-nowrap text-left text-[30px] font-black leading-none text-[var(--rp-text)] min-[390px]:text-[36px]">
                Post a Request
              </h1>
              <p className="mt-1.5 text-[13px] font-semibold leading-5 text-white/62 min-[390px]:text-sm">
                Find a ride. Share the journey.
              </p>
            </div>
          </section>
        )}

        {activeCategory ? null : (
          <>
            <RideBoardCategoryArtwork
              selectedCategory={previewCategory}
              categoryCounts={previewCategoryCounts}
              onCategorySelect={handlePreviewCategorySelect}
            />
            <RideBoardPreviewSection
              selectedCategory={previewCategory}
              requests={previewTopRequests}
              totalCount={previewRequests.length}
              onOpen={setSelectedRequestId}
              seeMoreHref={getRideBoardPreviewHref(previewCategory)}
              sectionRef={previewListRef}
            />
            <PostRideRequestButton onClick={() => openPostForm()} compact />
          </>
        )}
      </div>

      {selectedRequest ? (
        <RideRequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequestId(null)}
          onInterested={handleInterested}
        />
      ) : null}
      {showPostForm ? (
        <PostRideRequestForm
          key={postFormCategory}
          initialCategory={postFormCategory}
          onClose={() => setShowPostForm(false)}
          onSubmit={handlePostSubmit}
        />
      ) : null}
      {toastMessage ? <RideBoardToast message={toastMessage} /> : null}
    </div>
  );
}
