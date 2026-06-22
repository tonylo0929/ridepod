"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimalAvatar, RidePodAvatar, getDemoAnimalAvatarId } from "@/components/animal-avatar";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Car,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Copy,
  Crown,
  ImagePlus,
  ListChecks,
  MapPin,
  MessageCircle,
  MessagesSquare,
  ReceiptText,
  Share2,
  ShieldCheck,
  Smartphone,
  Star,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { cn } from "@/components/ui";
import {
  getNormalizedRouteRequests,
  isHostApprovedStopPolicy,
  routeRequestToRoutePlanStop,
  type HomeRide,
  type RoutePlanStop,
} from "@/lib/home-ride-mock";
import {
  formatHkdCents,
  LockSeatConfirmationModal,
  LeaveSelfSettlePodModal,
  PodDetailSetupBadges,
  PodHeroJoinButton,
  PickupReadyCards,
  QuoteProvidedCard,
  RoutePlanCard,
  SelfSettleJoinConfirmationModal,
  SelfSettleJoinSuccessModal,
  StickyPodDetailCta,
  RIDE_APP_REJOIN_COOLDOWN_MINUTES,
  getCurrentUserCanJoinSelfSettlePod,
  getCurrentUserIsHost,
  getRideAppRejoinRestrictionCopy,
  isRideAppSelfSettlePod,
  type LuggageContribution,
  usePodDetailJoinState,
} from "@/components/pod-detail-join-state";
import { createRideAppTrustEvent } from "@/lib/ride-app-trust";
import { getRideAppHostFareEstimate, getRideAppHostFareEstimateDisplay } from "@/lib/ride-app-fare-estimate";
import {
  applyRideAppMeaningfulDetailUpdate,
  getRideAppChatAccessState,
  getRideAppConfirmByDate,
  getRideAppConfirmDeadlineState,
  getRideAppCurrentDetailVersion,
  getRideAppRequiredConfirmations,
  isMeaningfulRideAppDetailUpdate,
  isRideAppSeatHoldExpired,
} from "@/lib/ride-app-chat-unlock";
import { getRideWithStoredSelfSettleJoin, saveStoredSelfSettleRidePatch } from "@/lib/ride-app-local-join";
import { markRideAppWaiverUsed, useRideAppWaiverState } from "@/lib/ride-app-waiver";
import { saveViewerHomeRide, updateCreatedHomeRide } from "@/lib/created-home-rides";
import {
  listUserNotifications,
  type RidePodNotificationType,
} from "@/lib/notifications/ridepod-notifications";
import {
  notifyPodAudience,
  type NotifyPodAudienceInput,
  type PodNotificationAudience,
} from "@/lib/notifications/pod-notification-fanout";
import { cancelPodAttendance, joinPod as joinRidePodMembership } from "@/lib/pods/ridepod-membership";
import {
  isUuid,
  publicCreatedPodToHomeRide,
  publicCreatedRideSignature,
  type PublicCreatedRidePod,
} from "@/lib/public-created-rides";
import { applyRideAppDemoPersona } from "@/lib/ride-app-demo-persona";
import {
  consumeRidePodPlusJoinFeeWaiver,
  hasRidePodPlusJoinFeeWaiver,
  useRidePodMembershipState,
} from "@/lib/ridepod-membership";
import { useAuth } from "@/providers/AuthProvider";

type UserNotificationForStopRequest = Awaited<ReturnType<typeof listUserNotifications>>["notifications"][number];

function getRideAppJoinLeaveActivitySummary(ride: HomeRide, nextJoinLeaveCount: number) {
  const riderName = getCurrentUserRiderName(ride);
  if (ride.requiresHostApprovalToRejoin || nextJoinLeaveCount >= 3) return `${riderName} asked to rejoin.`;
  if (nextJoinLeaveCount >= 2) return `${riderName} joined and left this pod ${nextJoinLeaveCount} times.`;
  return `${riderName} left the pod.`;
}

function getSelfSettleRideAfterLeave(ride: HomeRide, now = new Date()): HomeRide {
  const currentUserName = ride.currentUserName?.trim().toLowerCase() || "you";
  const joinedRiders = ride.joinedRiders.filter((name) => {
    const normalized = name.trim().toLowerCase();
    return normalized !== "you" && normalized !== currentUserName;
  });
  const nextJoinLeaveCount = (ride.joinLeaveCountForCurrentUser ?? 0) + 1;
  const requiresHostApprovalToRejoin = nextJoinLeaveCount >= 3;
  const rejoinCooldownUntil =
    nextJoinLeaveCount === 2 && !requiresHostApprovalToRejoin
      ? new Date(now.getTime() + RIDE_APP_REJOIN_COOLDOWN_MINUTES * 60 * 1000).toISOString()
      : null;
  const riderName = getCurrentUserRiderName(ride);
  let currentUserRiderFound = false;
  const riderConfirmations = (ride.riderConfirmations ?? [
    { name: ride.hostName || "Host", role: "host" as const, status: "host" as const },
    { name: riderName, role: "rider" as const, status: "joined_interest" as const, isCurrentUser: true },
  ]).map((item) => {
    const isCurrentUser = item.isCurrentUser === true || item.name.trim().toLowerCase() === "you" || item.name.trim().toLowerCase() === currentUserName;
    if (!isCurrentUser || item.role !== "rider") return item;
    currentUserRiderFound = true;
    return {
      ...item,
      name: item.name?.trim() || riderName,
      status: "left" as const,
      isCurrentUser: true,
      confirmedBookingDetailsVersion: undefined,
      confirmedDetailVersion: undefined,
    };
  });

  if (!currentUserRiderFound) {
    riderConfirmations.push({
      name: riderName,
      role: "rider",
      status: "left",
      isCurrentUser: true,
    });
  }

  return {
    ...ride,
    currentUserJoined: false,
    currentUserRole: "rider",
    currentUserJoinIntentStatus: "left",
    currentUserBookingDetailsConfirmed: false,
    selfSettleConfirmationStatus: undefined,
    platformFeeStatus: "pending",
    quoteStatus: "quote_pending",
    joinLeaveCountForCurrentUser: nextJoinLeaveCount,
    lastLeftAt: now.toISOString(),
    rejoinCooldownUntil,
    requiresHostApprovalToRejoin,
    rideAppJoinLeaveActivitySummary: getRideAppJoinLeaveActivitySummary(ride, nextJoinLeaveCount),
    joinedRiders,
    joinedRiderCount: Math.max(0, (ride.joinedRiderCount ?? ride.joinedRiders.length) - 1),
    seatsUsed: Math.max(1, ride.seatsUsed - 1),
    riderConfirmations,
  };
}

function DetailShell({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_90%,transparent),var(--rp-card-soft))] p-5 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

type HowItWorksRideMode = "taxi" | "ride_app";

function DetailItem({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[18px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card-muted)_82%,transparent),color-mix(in_srgb,var(--rp-card-soft)_94%,transparent))] p-3.5 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--rp-primary)_45%,transparent),transparent)]" />
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-[color-mix(in_srgb,var(--rp-primary)_42%,var(--rp-border))] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)] shadow-[0_10px_22px_color-mix(in_srgb,var(--rp-primary)_10%,transparent)]">
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">{label}</p>
          <p className="mt-1 text-[17px] font-black leading-5 text-[var(--rp-text)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

type DetailTab = "trip" | "pod";

const detailTabs: Array<{ id: DetailTab; label: string }> = [
  { id: "trip", label: "Trip" },
  { id: "pod", label: "Pod" },
];

function DetailTag({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-sm font-black",
        tone === "green"
          ? "border-emerald-200 bg-emerald-300/15 text-emerald-100"
          : tone === "blue"
            ? "border-sky-200 bg-sky-300/15 text-sky-100"
            : "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]",
      )}
    >
      {children}
    </span>
  );
}

function DetailSwitch({
  value,
  onChange,
  rideMode = "taxi",
}: {
  value: DetailTab;
  onChange: (value: DetailTab) => void;
  rideMode?: HowItWorksRideMode;
}) {
  return (
    <div className="grid grid-cols-2 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-1">
      {detailTabs.map((tab) => {
        const active = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "min-h-11 rounded-[14px] px-4 text-sm font-black transition",
              active
                ? rideMode === "ride_app"
                  ? "bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] text-[#061019] shadow-[0_10px_22px_rgba(56,189,248,0.2)]"
                  : "bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] text-[#07111a] shadow-[0_10px_22px_color-mix(in_srgb,var(--rp-primary)_22%,transparent)]"
                : "text-[var(--rp-muted-strong)] hover:bg-[var(--rp-card-soft)] hover:text-[var(--rp-text)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function getTaxiTypeVisual(taxiType: string) {
  const normalized = taxiType.toLowerCase();

  if (normalized.includes("compact")) {
    return {
      title: "Compact 4-seat taxi",
      description: "Good for lighter luggage.",
      imageSrc: "/images/ridepod/taxis/compact-4-seat.png",
      riders: 4,
      bags: 2,
    };
  }

  if (normalized.includes("large") || normalized.includes("luggage")) {
    return {
      title: "Large-luggage 4-seat taxi",
      description: "Best for airport trips.",
      imageSrc: "/images/ridepod/taxis/large-luggage-4-seat.png",
      riders: 4,
      bags: 4,
    };
  }

  if (normalized.includes("6-seat") || normalized.includes("6 seater") || normalized.includes("6-seater")) {
    return {
      title: "6-seat taxi",
      description: "Best for bigger groups.",
      imageSrc: "/images/ridepod/taxis/taxi-6-seat.png",
      riders: 6,
      bags: 2,
    };
  }

  return {
    title: "Standard 4-seat taxi",
    description: "Everyday shared taxi.",
    imageSrc: "/images/ridepod/taxis/standard-4-seat.png",
    riders: 4,
    bags: 3,
  };
}

function TaxiTypeVisualCard({ taxiType }: { taxiType: string }) {
  const visual = getTaxiTypeVisual(taxiType);

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card-muted)_88%,transparent),var(--rp-card-soft))]">
      <div className="relative h-32 border-b border-[var(--rp-border)] bg-[#07111a]">
        <Image
          src={visual.imageSrc}
          alt={visual.title}
          fill
          sizes="(min-width: 640px) 420px, calc(100vw - 72px)"
          className="object-contain p-3"
        />
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Taxi requested</p>
          <h3 className="mt-1 text-xl font-black leading-tight text-[var(--rp-text)]">{visual.title}</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">{visual.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] pt-3">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-[var(--rp-muted-strong)]" />
            <div>
              <p className="text-lg font-black text-[var(--rp-text)]">x{visual.riders}</p>
              <p className="text-xs font-semibold text-[var(--rp-muted-strong)]">Up to {visual.riders} riders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5 text-[var(--rp-muted-strong)]" />
            <div>
              <p className="text-lg font-black text-[var(--rp-text)]">x{visual.bags}</p>
              <p className="text-xs font-semibold text-[var(--rp-muted-strong)]">Up to {visual.bags} bags</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getEstimatedShareRange(pricePerPerson: number) {
  const low = Math.max(1, Math.floor(pricePerPerson * 0.9));
  const high = Math.ceil(pricePerPerson * 1.1);

  return `HK$${low}-${high}`;
}

function getRideAppEstimateNumberInput(value: string) {
  return value.match(/\d+/)?.[0] ?? "";
}

function formatRideAppEstimateInput(value: string) {
  const amount = getRideAppEstimateNumberInput(value);
  return amount ? `HK$${amount}` : "";
}

function estimateTotalFromRange(value: string) {
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (!numbers.length) return null;
  return Math.round(numbers.reduce((total, number) => total + number, 0) / numbers.length);
}

function getRideAppProviderDisplay(ride: HomeRide) {
  if (ride.rideAppProviderName?.trim()) return ride.rideAppProviderName.trim();
  if (ride.taxiType && !ride.taxiType.toLowerCase().includes("ride app")) return ride.taxiType;
  return "Selected by host";
}

function getRideAppMinimumRidersToGoLabel(ride: HomeRide) {
  const maxJoinedRiders = Math.max(1, ride.seatsTotal - 1);
  const minimum = Math.max(
    1,
    Math.min(maxJoinedRiders, ride.rideAppMinimumConfirmedRiders ?? ride.rideAppRequiredConfirmations ?? Math.min(2, maxJoinedRiders)),
  );

  return `Need ${minimum} rider${minimum === 1 ? "" : "s"}`;
}

function getRideAppAcceptedPaymentDisplay(ride: HomeRide) {
  if (ride.rideAppAcceptedPaymentMethods?.length) return ride.rideAppAcceptedPaymentMethods.join(", ");
  if (ride.paymentMethod?.trim()) return ride.paymentMethod.trim();
  return "Not set yet";
}

function getRideAppFareEstimateProof(ride: HomeRide) {
  const fileName = ride.fareEstimateScreenshot?.fileName ?? ride.rideAppFareEstimateScreenshotName ?? null;
  const previewUrl = ride.fareEstimateScreenshot?.previewUrl ?? null;
  const addedAt = ride.fareEstimateScreenshot?.addedAt ?? ride.rideAppFareEstimateScreenshotAddedAt ?? null;
  if (!fileName && !previewUrl) return null;

  return {
    fileName,
    previewUrl,
    addedAt,
  };
}

function getHeroQuoteStatus(ride: HomeRide, joinView: string) {
  if (isRideAppSelfSettlePod(ride) && (getCurrentUserIsHost(ride) || joinView === "joined")) {
    return ride.bookingDetailsShared ? "Waiting for confirmations" : "Ride details pending";
  }
  if (isRideAppSelfSettlePod(ride) && joinView === "quote_pending") return "Forming";
  if (ride.quoteUpdatedAfterRouteChange && ["quote_ready", "quote_deadline_soon", "late_confirmation"].includes(joinView)) return "Updated quote ready";
  if (joinView === "quote_pending" || joinView === "joined") return "Waiting for quote";
  if (typeof ride.quoteAmountCents === "number") return formatHkdCents(ride.quoteAmountCents);
  if (joinView === "quote_ready" || joinView === "quote_accepted" || joinView === "all_accepted") return "Ready";

  return "Waiting for quote";
}

const avatarStyles = [
  "bg-[#f7d8bc] text-[#5b341f]",
  "bg-[#cfe7dc] text-[#173f34]",
  "bg-[#e7c7b5] text-[#5c2f22]",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getHostProfileImageUrl(ride: HomeRide) {
  const hostMedia = ride as HomeRide & {
    hostAvatarUrl?: string | null;
    hostImageUrl?: string | null;
    hostPhotoUrl?: string | null;
    hostProfileImageUrl?: string | null;
  };
  const candidates = [
    hostMedia.hostProfileImageUrl,
    hostMedia.hostAvatarUrl,
    hostMedia.hostPhotoUrl,
    hostMedia.hostImageUrl,
  ];
  const match = candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return match?.trim() ?? null;
}

function isCurrentUserRiderName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === "you" || normalized.includes("(you)");
}

function isWaitingRiderPlaceholderName(name: string) {
  return /^(?:waiting for rider|rider)\s+\d+$/i.test(name.trim());
}

function getWaitingRiderSlotName(slotNumber: number) {
  return `Waiting for rider ${slotNumber}`;
}

function isOpenRiderSlot(rider: PodStatusRider) {
  return rider.role === "rider" && rider.status === "pending" && isWaitingRiderPlaceholderName(rider.name);
}

function isHostEchoRider(rider: PodStatusRider, isHost: boolean) {
  return isHost && rider.role === "rider" && isCurrentUserRiderName(rider.name);
}

function getPodStatusPersonDisplayName(name: string) {
  if (isWaitingRiderPlaceholderName(name)) return "Waiting for rider";
  return isCurrentUserRiderName(name) ? "You" : name;
}

function getPodStatusAvatarLabel(name: string) {
  if (isWaitingRiderPlaceholderName(name)) return "R";
  return isCurrentUserRiderName(name) ? "You" : getInitials(name);
}

function RiderStack({ ride, seatsUsed }: { ride: HomeRide; seatsUsed: number }) {
  const names = [ride.hostName, ...ride.joinedRiders].slice(0, Math.max(0, Math.min(seatsUsed, 3)));

  return (
    <div className="flex shrink-0 -space-x-2">
      {names.map((name, index) => {
        const animalAvatarId = getDemoAnimalAvatarId(name);
        return animalAvatarId ? (
          <AnimalAvatar
            key={`${name}-${index}`}
            id={animalAvatarId}
            label={`${name} avatar`}
            className="h-10 w-10 border-2 border-[#07111a] text-[8px] shadow-[0_6px_14px_rgba(0,0,0,0.24)]"
          />
        ) : (
          <span
            key={`${name}-${index}`}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full border-2 border-[#07111a] text-xs font-black shadow-[0_6px_14px_rgba(0,0,0,0.24)]",
              avatarStyles[index % avatarStyles.length],
            )}
          >
            {getInitials(name)}
          </span>
        );
      })}
    </div>
  );
}

type PodStatusTab = "summary" | "riders" | "route" | "chat";
type ManagePodActionsTab = "confirmations" | "route_requests";
type ConfirmByUnit = "hours" | "days";
type PodStatusRiderState =
  | "host"
  | "joined_interest"
  | "confirmed"
  | "review_needed"
  | "pending"
  | "seat_hold_expired"
  | "left_pod"
  | "rejoin_cooldown"
  | "host_approval_needed"
  | "needs_review";
type PodStatusRider = {
  name: string;
  role: "host" | "rider";
  status: PodStatusRiderState;
  confirmedBookingDetailsVersion?: number;
  confirmedDetailVersion?: number;
  seatHoldExpiredAt?: string | null;
};
type RideAppHostCancellationStatus = NonNullable<HomeRide["rideAppHostCancellationStatus"]>;
type RideAppFeeResolution = NonNullable<HomeRide["rideAppFeeResolution"]>;
type HostCancellationReason = {
  label: string;
  value: string;
};

const beforeConfirmationCancellationReasons: HostCancellationReason[] = [
  { label: "Plans changed", value: "Plans changed" },
  { label: "Wrong details", value: "Wrong details" },
  { label: "Not enough riders", value: "Not enough riders" },
  { label: "Other", value: "Other" },
];

const afterConfirmationCancellationReasons: HostCancellationReason[] = [
  { label: "Cannot book ride app", value: "Cannot book ride app" },
  { label: "Fare changed too much", value: "Fare changed too much" },
  { label: "Host emergency", value: "Host emergency" },
  { label: "Wrong pickup/time", value: "Wrong pickup/time" },
  { label: "Other", value: "Other" },
];

const podStatusTabs: Array<{ id: PodStatusTab; label: string; icon: typeof BarChart3 }> = [
  { id: "summary", label: "Summary", icon: BarChart3 },
  { id: "riders", label: "Riders", icon: UsersRound },
  { id: "route", label: "Route", icon: MapPin },
  { id: "chat", label: "Chat", icon: MessageCircle },
];

function normalizePodStatusTab(value?: string | null): PodStatusTab {
  return podStatusTabs.some((tab) => tab.id === value) ? (value as PodStatusTab) : "summary";
}

function formatConfirmByLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRidePickupLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getRidePickupDate(ride: HomeRide) {
  const cleanedDate = ride.dateLabel.replace(/^[A-Za-z]{3,9},\s*/i, "").trim();
  const dateText = /\d{4}/.test(cleanedDate)
    ? `${cleanedDate} ${ride.timeLabel}`
    : `${cleanedDate} ${new Date().getFullYear()} ${ride.timeLabel}`;
  const parsed = new Date(dateText);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getConfirmByOffsetHours(amount: number, unit: ConfirmByUnit) {
  return Math.max(1, amount) * (unit === "days" ? 24 : 1);
}

function getConfirmByDeadline(ride: HomeRide, amount: number, unit: ConfirmByUnit) {
  const pickupDate = getRidePickupDate(ride);
  if (!pickupDate) return null;
  return new Date(pickupDate.getTime() - getConfirmByOffsetHours(amount, unit) * 60 * 60 * 1000);
}

function formatConfirmByOffset(amount: number, unit: ConfirmByUnit) {
  const safeAmount = Math.max(1, amount);
  const singular = unit === "days" ? "day" : "hour";
  return `${safeAmount} ${safeAmount === 1 ? singular : `${singular}s`}`;
}

function clampConfirmByAmount(value: number, unit: ConfirmByUnit) {
  const max = unit === "days" ? 14 : 72;
  return Math.min(max, Math.max(1, Math.round(value)));
}

function getNextRejoinConfirmByDate(ride: HomeRide, now = new Date()) {
  const currentConfirmBy = getRideAppConfirmByDate(ride, now);
  if (currentConfirmBy.getTime() > now.getTime()) return currentConfirmBy;
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function getCurrentUserRiderName(ride: HomeRide) {
  return ride.currentUserName?.trim() || "You";
}

function getRiderConfirmationStatusCounts(riders: NonNullable<HomeRide["riderConfirmations"]>, detailVersion: number) {
  const joined = riders.filter((item) => item.role === "rider" && item.status !== "seat_hold_expired" && item.status !== "expired" && item.status !== "left").length;
  const confirmed = riders.filter((item) => {
    if (item.role !== "rider" || item.status !== "confirmed") return false;
    const confirmedVersion = item.confirmedBookingDetailsVersion ?? item.confirmedDetailVersion ?? detailVersion;
    return confirmedVersion >= detailVersion;
  }).length;

  return { joined, confirmed };
}

function buildRequestToRejoinPatch(ride: HomeRide, detailVersion: number, now = new Date()): Partial<HomeRide> {
  const nextConfirmBy = getNextRejoinConfirmByDate(ride, now);
  const nextConfirmByIso = nextConfirmBy.toISOString();
  const riderName = getCurrentUserRiderName(ride);
  const existingRows = ride.riderConfirmations?.length
    ? ride.riderConfirmations
    : [
        { name: ride.hostName || "Host", role: "host" as const, status: "host" as const },
        { name: riderName, role: "rider" as const, status: "seat_hold_expired" as const, isCurrentUser: true },
      ];
  let currentUserRowFound = false;
  const riderConfirmations = existingRows.map((item) => {
    const isCurrentUser = item.isCurrentUser === true || isCurrentUserRiderName(item.name);
    if (!isCurrentUser || item.role !== "rider") return item;
    currentUserRowFound = true;
    return {
      ...item,
      name: item.name?.trim() || riderName,
      status: "joined_interest" as const,
      isCurrentUser: true,
      confirmBy: nextConfirmByIso,
      seatHoldExpiredAt: null,
      confirmedBookingDetailsVersion: undefined,
      confirmedDetailVersion: undefined,
    };
  });

  if (!currentUserRowFound) {
    riderConfirmations.push({
      name: riderName,
      role: "rider",
      status: "joined_interest",
      isCurrentUser: true,
      confirmBy: nextConfirmByIso,
      seatHoldExpiredAt: null,
    });
  }

  const counts = getRiderConfirmationStatusCounts(riderConfirmations, detailVersion);
  const joinedCount = Math.min(ride.seatsTotal, counts.joined);
  const nextPodStatus =
    ride.bookingDetailsShared || ride.rideAppBookingDetailsFinalized || ride.rideAppBookingDetailsConfirmed
      ? "awaiting_rider_confirmation"
      : "booking_details_needed";

  return {
    currentUserJoined: true,
    currentUserRole: "joined_rider",
    currentUserJoinIntentStatus: "joined_interest",
    currentUserConfirmationExpired: false,
    currentUserBookingDetailsConfirmed: false,
    currentUserConfirmedBookingDetailsVersion: null,
    currentUserRideAppDetailVersionConfirmed: undefined,
    selfSettleConfirmationStatus: "pending",
    platformFeeStatus: "pending",
    seatHoldExpiredAt: null,
    seatHoldReleasedAt: null,
    confirmationDeadlineAt: nextConfirmByIso,
    rideAppConfirmBy: nextConfirmByIso,
    confirmationDeadlineLabel: formatConfirmByLabel(nextConfirmBy),
    rideAppPodStatus: nextPodStatus,
    seatsUsed: joinedCount,
    joinedRiderCount: joinedCount,
    confirmedRiderCount: counts.confirmed,
    rideAppConfirmedRiderCount: counts.confirmed,
    riderConfirmations,
    rejoinCooldownUntil: null,
    requiresHostApprovalToRejoin: false,
    rideAppJoinLeaveActivitySummary: `${riderName} rejoined the pod.`,
    rideAppSeatReleasedAt: ride.rideAppSeatReleasedAt ?? ride.seatHoldReleasedAt ?? ride.seatHoldExpiredAt ?? now.toISOString(),
    rideAppRejoinRequestedAt: now.toISOString(),
    rideAppRejoinRequestedBy: riderName,
  };
}

function buildInitialSelfSettleJoinPatch(ride: HomeRide, detailVersion: number, now = new Date()): Partial<HomeRide> {
  const nextConfirmBy = getNextRejoinConfirmByDate(ride, now);
  const nextConfirmByIso = nextConfirmBy.toISOString();
  const riderName = getCurrentUserRiderName(ride);
  const existingRows = ride.riderConfirmations?.length
    ? ride.riderConfirmations
    : [{ name: ride.hostName || "Host", role: "host" as const, status: "host" as const }];
  let currentUserRowFound = false;
  const riderConfirmations = existingRows.map((item) => {
    const isCurrentUser = item.isCurrentUser === true || isCurrentUserRiderName(item.name);
    if (!isCurrentUser || item.role !== "rider") return item;
    currentUserRowFound = true;
    return {
      ...item,
      name: item.name?.trim() || riderName,
      status: "joined_interest" as const,
      isCurrentUser: true,
      confirmBy: nextConfirmByIso,
      seatHoldExpiredAt: null,
      confirmedBookingDetailsVersion: undefined,
      confirmedDetailVersion: undefined,
    };
  });

  if (!currentUserRowFound) {
    riderConfirmations.push({
      name: riderName,
      role: "rider",
      status: "joined_interest",
      isCurrentUser: true,
      confirmBy: nextConfirmByIso,
      seatHoldExpiredAt: null,
    });
  }

  const counts = getRiderConfirmationStatusCounts(riderConfirmations, detailVersion);
  const joinedSeatCount = Math.min(ride.seatsTotal, Math.max(ride.seatsUsed + 1, counts.joined));
  const nextPodStatus =
    ride.bookingDetailsShared || ride.rideAppBookingDetailsFinalized || ride.rideAppBookingDetailsConfirmed
      ? "awaiting_rider_confirmation"
      : "booking_details_needed";

  return {
    currentUserJoined: true,
    currentUserRole: "joined_rider",
    currentUserJoinIntentStatus: "joined_interest",
    currentUserConfirmationExpired: false,
    currentUserBookingDetailsConfirmed: false,
    currentUserConfirmedBookingDetailsVersion: null,
    currentUserRideAppDetailVersionConfirmed: undefined,
    selfSettleConfirmationStatus: "pending",
    platformFeeStatus: "pending",
    quoteStatus: "joined",
    seatHoldExpiredAt: null,
    seatHoldReleasedAt: null,
    confirmationDeadlineAt: nextConfirmByIso,
    rideAppConfirmBy: nextConfirmByIso,
    confirmationDeadlineLabel: formatConfirmByLabel(nextConfirmBy),
    rideAppPodStatus: nextPodStatus,
    seatsUsed: joinedSeatCount,
    joinedRiderCount: counts.joined,
    confirmedRiderCount: counts.confirmed,
    rideAppConfirmedRiderCount: counts.confirmed,
    riderConfirmations,
    rejoinCooldownUntil: null,
    requiresHostApprovalToRejoin: false,
    rideAppJoinLeaveActivitySummary: ride.joinLeaveCountForCurrentUser ? `${riderName} rejoined the pod.` : `${riderName} joined the pod.`,
  };
}

function buildRideAppStopRequestPatch(ride: HomeRide, stopLabel: string, requestedBy: string, now = new Date()): Partial<HomeRide> {
  const requestId = `stop-${now.getTime()}`;
  const requestedStop: RoutePlanStop = {
    id: requestId,
    label: stopLabel,
    requestedBy,
    stopType: "quick_stop",
    reason: "Rider requested an extra stop.",
    status: "pending_host_approval",
  };
  const routeRequests = getNormalizedRouteRequests(ride).all.filter((request) => request.status !== "pending");

  return {
    // Future: persist route requests and deliver to host across clients.
    routeRequests: [
      ...routeRequests,
      {
        id: requestId,
        requestedByName: requestedBy,
        stopLocation: stopLabel,
        reason: requestedStop.reason,
        status: "pending" as const,
        requestedAtLabel: "Just now",
      },
    ],
    proposedStops: [...(ride.proposedStops ?? []), requestedStop],
  };
}

function buildApproveRideAppStopPatch(ride: HomeRide, stop: RoutePlanStop): Partial<HomeRide> {
  const approvedStop: RoutePlanStop = { ...stop, status: "approved" };
  const normalized = getNormalizedRouteRequests(ride);
  const routeRequests = normalized.all.map((request) =>
    request.id === stop.id
      ? {
          ...request,
          status: "approved" as const,
          reviewedByName: ride.hostName || "Host",
          reviewedAtLabel: "Just now",
        }
      : request,
  );
  const nextRoutePatch = {
    routeRequests,
    proposedStops: (ride.proposedStops ?? []).filter((item) => item.id !== stop.id),
    approvedStops: [...(ride.approvedStops ?? []), approvedStop],
  };
  const reviewPatch = applyRideAppMeaningfulDetailUpdate(
    {
      ...ride,
      ...nextRoutePatch,
    },
    "stop_added",
  );

  return {
    ...nextRoutePatch,
    ...reviewPatch,
    lastBookingDetailsUpdateReason: "Host approved stop request.",
  };
}

function buildDeclineRideAppStopPatch(ride: HomeRide, stop: RoutePlanStop): Partial<HomeRide> {
  const declinedStop: RoutePlanStop = { ...stop, status: "declined" };
  const normalized = getNormalizedRouteRequests(ride);
  const routeRequests = normalized.all.map((request) =>
    request.id === stop.id
      ? {
          ...request,
          status: "declined" as const,
          reviewedByName: ride.hostName || "Host",
          reviewedAtLabel: "Just now",
        }
      : request,
  );

  return {
    routeRequests,
    proposedStops: (ride.proposedStops ?? []).filter((item) => item.id !== stop.id),
    declinedStops: [...(ride.declinedStops ?? []), declinedStop],
  };
}

function hasAnyRideAppStopRequestState(ride: HomeRide) {
  return getNormalizedRouteRequests(ride).all.length > 0;
}

function metadataValue(metadata: UserNotificationForStopRequest["metadata"], key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stopLabelFromNotification(notification: UserNotificationForStopRequest) {
  const metadataLabel =
    metadataValue(notification.metadata, "stopLabel") ||
    metadataValue(notification.metadata, "stopLocation") ||
    metadataValue(notification.metadata, "requestedStop");
  if (metadataLabel) return metadataLabel;

  const body = notification.body ?? "";
  const match = body.match(/requested a new stop:\s*(.+?)\.?$/i);
  return match?.[1]?.trim() || null;
}

function requestedByFromNotification(notification: UserNotificationForStopRequest) {
  const metadataName = metadataValue(notification.metadata, "requestedBy") || metadataValue(notification.metadata, "actorDisplayName");
  if (metadataName) return metadataName;

  const body = notification.body ?? "";
  const match = body.match(/^(.+?)\s+requested a new stop:/i);
  return match?.[1]?.trim() || "Rider";
}

function pendingStopFromNotification(notification: UserNotificationForStopRequest): RoutePlanStop | null {
  const action = metadataValue(notification.metadata, "action");
  const stopLabel = stopLabelFromNotification(notification);
  if (notification.type !== ("ride_app_action_required" satisfies RidePodNotificationType) || action !== "route_stop_requested" || !stopLabel) {
    return null;
  }

  return {
    id: `notification-stop-${notification.id}`,
    label: stopLabel,
    requestedBy: requestedByFromNotification(notification),
    stopType: "quick_stop",
    reason: "Rider requested an extra stop.",
    status: "pending_host_approval",
  };
}

async function getHostPendingStopRequestFromNotifications(userId: string, ride: HomeRide) {
  const result = await listUserNotifications(userId);
  const notification = result.notifications.find((item) => item.related_pod_id === ride.id && pendingStopFromNotification(item));
  return notification ? pendingStopFromNotification(notification) : null;
}

async function resolveSelfSettleMembershipTarget(ride: HomeRide, viewerUserId?: string | null) {
  if (isUuid(ride.id)) return { podId: ride.id, hostUserId: null as string | null };

  try {
    const response = await fetch("/api/public-created-rides", { cache: "no-store" });
    if (!response.ok) throw new Error(`Public ride lookup failed with ${response.status}`);

    const payload = (await response.json()) as { pods?: PublicCreatedRidePod[] };
    const rideSignature = publicCreatedRideSignature(ride);
    const matchingPod = (payload.pods ?? []).find(
      (pod) => publicCreatedRideSignature(publicCreatedPodToHomeRide(pod, viewerUserId)) === rideSignature,
    );

    if (matchingPod) return { podId: matchingPod.id, hostUserId: matchingPod.host_user_id ?? null };
  } catch (error) {
    console.warn("RidePod self-settle shared ride lookup failed", error);
  }

  return { podId: ride.id, hostUserId: null as string | null };
}

function mergeRidePatch<T extends Partial<HomeRide>>(base: T, patch?: Partial<HomeRide> | null) {
  if (!patch) return base;
  const merged: Partial<HomeRide> = {
    ...base,
    ...patch,
  };

  if (base.rideAppBookingDetails || patch.rideAppBookingDetails) {
    merged.rideAppBookingDetails = {
      ...base.rideAppBookingDetails,
      ...patch.rideAppBookingDetails,
    };
  }

  if (base.rideAppChecklist || patch.rideAppChecklist) {
    merged.rideAppChecklist = {
      ...base.rideAppChecklist,
      ...patch.rideAppChecklist,
    } as HomeRide["rideAppChecklist"];
  }

  return merged as T & Partial<HomeRide>;
}

function buildPodStatusRiders(ride: HomeRide): PodStatusRider[] {
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);
  const viewerIsHost = getCurrentUserIsHost(ride);

  if (ride.riderConfirmations?.length) {
    let riderSlotNumber = 0;
    const rows: PodStatusRider[] = ride.riderConfirmations.map((item) => {
      if (item.role === "rider") riderSlotNumber += 1;
      const confirmedVersion = item.confirmedBookingDetailsVersion ?? item.confirmedDetailVersion;
      const confirmedOldDetails =
        item.role === "rider" &&
        item.status === "confirmed" &&
        typeof confirmedVersion === "number" &&
        confirmedVersion < currentDetailVersion;
      const isCurrentUser = item.isCurrentUser === true || isCurrentUserRiderName(item.name);
      const cooldownActive = getRideAppRejoinRestrictionCopy(ride)?.kind === "cooldown";
      const hostViewingCurrentUserRider = viewerIsHost && item.role === "rider" && isCurrentUser;

      return {
        name: hostViewingCurrentUserRider ? `Rider ${riderSlotNumber}` : item.name,
        role: item.role,
        confirmedBookingDetailsVersion: item.confirmedBookingDetailsVersion,
        confirmedDetailVersion: item.confirmedDetailVersion,
        seatHoldExpiredAt: item.seatHoldExpiredAt,
        status:
          item.role === "rider" && isCurrentUser && ride.requiresHostApprovalToRejoin
            ? "host_approval_needed"
            : item.role === "rider" && isCurrentUser && cooldownActive
              ? "rejoin_cooldown"
              : item.status === "pending"
            ? "pending"
            : item.status === "confirmed"
              ? confirmedOldDetails
                ? "needs_review"
                : "confirmed"
              : item.status === "needs_review"
                ? "needs_review"
                : item.status === "expired" || item.status === "seat_hold_expired"
                  ? "seat_hold_expired"
                  : item.status === "left"
                    ? "left_pod"
                  : item.status === "joined_interest"
                    ? "joined_interest"
                  : "host",
      };
    });

    while (rows.length < ride.seatsTotal) {
      rows.push({
        name: getWaitingRiderSlotName(rows.length),
        role: "rider",
        status: "pending",
      });
    }

    return rows.slice(0, Math.max(1, ride.seatsTotal));
  }

  const rows: PodStatusRider[] = [{ name: ride.hostName || "Host", role: "host", status: "host" }];
  ride.joinedRiders.forEach((name, index) => {
    rows.push({
      name,
      role: "rider",
      status: index === 0 ? "confirmed" : name.toLowerCase().includes("you") ? "review_needed" : "pending",
    });
  });

  while (rows.length < ride.seatsTotal) {
    rows.push({
      name: getWaitingRiderSlotName(rows.length),
      role: "rider",
      status: "pending",
    });
  }

  return rows.slice(0, Math.max(1, ride.seatsTotal));
}

function buildManagePodActionRiders(ride: HomeRide) {
  const viewerIsHost = getCurrentUserIsHost(ride);
  const placeholderPattern = /^Rider\s+\d+$/i;

  return buildPodStatusRiders(ride).filter((rider) => {
    if (rider.role === "host") return true;
    if (viewerIsHost && isCurrentUserRiderName(rider.name)) return false;
    if (rider.status === "pending" && placeholderPattern.test(rider.name.trim())) return false;
    return true;
  });
}

function getPodStatusUpdateTitle(ride: HomeRide) {
  switch (ride.bookingDetailsLastMeaningfulUpdate) {
    case "fare_estimate":
      return "Fare estimate updated";
    case "gather_point":
    case "pickup":
      return "Gather point updated";
    case "route":
    case "stop_added":
      return "Route updated";
    case "split_method":
    case "payment_method":
      return "Payment details updated";
    default:
      return "Booking details updated";
  }
}

function getPodStatusUpdateSubtitle(ride: HomeRide) {
  switch (ride.bookingDetailsLastMeaningfulUpdate) {
    case "fare_estimate":
      return "Riders need to review the updated fare estimate.";
    case "gather_point":
    case "pickup":
      return "Riders need to review the updated gather point.";
    case "route":
    case "stop_added":
      return "Riders need to review the updated route.";
    case "split_method":
    case "payment_method":
      return "Riders need to review the split and payment method.";
    default:
      return "Riders need to review the latest details before the host books.";
  }
}

function isPodStatusRiderConfirmedForCurrentDetails(rider: PodStatusRider, bookingDetailsVersion: number) {
  const confirmedVersion = rider.confirmedBookingDetailsVersion ?? rider.confirmedDetailVersion;
  return rider.role === "rider" && rider.status === "confirmed" && (confirmedVersion ?? bookingDetailsVersion) >= bookingDetailsVersion;
}

function getPodStatusRiderHelper(rider: PodStatusRider, bookingDetailsVersion: number) {
  if (isOpenRiderSlot(rider)) return "Waiting for rider to join";
  if (rider.role === "host") return "Host";
  if (rider.status === "confirmed") {
    return isPodStatusRiderConfirmedForCurrentDetails(rider, bookingDetailsVersion)
      ? "Confirmed current details"
      : "Confirmed older details";
  }
  if (rider.status === "needs_review" || rider.status === "review_needed") return "Confirmed older details";
  if (rider.status === "seat_hold_expired") return "Seat released";
  if (rider.status === "rejoin_cooldown") return "Rejoin cooldown";
  if (rider.status === "host_approval_needed") return "Host approval needed";
  if (rider.status === "left_pod") return "Left pod";
  if (rider.status === "joined_interest") return "Waiting to confirm";
  return "Pending confirmation";
}

function getExpiredSeatHoldCount(ride: HomeRide) {
  return ride.riderConfirmations?.filter((item) => item.role === "rider" && (item.status === "seat_hold_expired" || item.status === "expired")).length ?? 0;
}

function getPendingRouteRequestCount(ride: HomeRide) {
  return getNormalizedRouteRequests(ride).pendingCount;
}

function getRideAppHostCancellationStatus(ride: HomeRide): RideAppHostCancellationStatus {
  return ride.rideAppHostCancellationStatus ?? "active";
}

function isRideAppHostReplacementNeeded(ride: HomeRide) {
  return getRideAppHostCancellationStatus(ride) === "host_replacement_needed";
}

function isRideAppReplacementBookerSelected(ride: HomeRide) {
  return getRideAppHostCancellationStatus(ride) === "replacement_booker_selected";
}

function isRideAppPodCancelledByHost(ride: HomeRide) {
  const status = getRideAppHostCancellationStatus(ride);
  return status === "host_cancelled" || status === "cancelled";
}

function getRideAppConfirmedReplacementRiders(ride: HomeRide) {
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);
  return buildPodStatusRiders(ride).filter((rider) => isPodStatusRiderConfirmedForCurrentDetails(rider, currentDetailVersion));
}

function getCurrentUserCanBecomeReplacementBooker(ride: HomeRide) {
  if (!isRideAppHostReplacementNeeded(ride) || getCurrentUserIsHost(ride)) return false;
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);
  return (
    ride.currentUserBookingDetailsConfirmed === true ||
    ride.selfSettleConfirmationStatus === "confirmed" ||
    buildPodStatusRiders(ride).some(
      (rider) => rider.role === "rider" && isCurrentUserRiderName(rider.name) && isPodStatusRiderConfirmedForCurrentDetails(rider, currentDetailVersion),
    )
  );
}

function getReplacementBookerDisplayName(ride: HomeRide) {
  return ride.rideAppReplacementBookerName?.trim() || ride.currentUserName?.trim() || "New booker";
}

function getOriginalHostDisplayName(ride: HomeRide) {
  return ride.riderConfirmations?.find((rider) => rider.role === "host")?.name ?? ride.rideAppBookingDetailsConfirmedBy ?? ride.hostName ?? "Host";
}

function getRideAppFeeResolutionCopy(resolution: RideAppFeeResolution | undefined) {
  switch (resolution) {
    case "remains_active":
      return "RidePod fee remains applied because the pod continues.";
    case "restore_waiver":
    case "restore_in_live_version":
      return "RidePod fee or waiver would be restored in the live version.";
    case "review_needed":
      return "RidePod fee/waiver stays with this pod while riders decide whether to continue.";
    case "not_confirmed":
      return "No RidePod fee was confirmed.";
    default:
      return "No live payment was charged in this version.";
  }
}

function getRideAppHostCancellationActivity(ride: HomeRide) {
  const status = getRideAppHostCancellationStatus(ride);
  const activity = ride.rideAppHostCancellationActivity ?? [];
  if (activity.length) return activity;
  const originalHostName = getOriginalHostDisplayName(ride);
  if (status === "replacement_booker_selected") {
    return [`${originalHostName} stepped down as host.`, "Host replacement mode started.", `${getReplacementBookerDisplayName(ride)} became the new booker.`];
  }
  if (status === "host_replacement_needed") return [`${originalHostName} stepped down as host.`, "Host replacement mode started."];
  if (status === "cancelled") return [`${originalHostName} stepped down as host.`, "Host replacement mode started.", "Pod cancelled because no new booker was selected."];
  if (status === "host_cancelled") return [`${originalHostName} cancelled the pod.`];
  return [];
}

function getManagePodActionsPendingCount(ride: HomeRide) {
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);
  const pendingConfirmationCount =
    ride.riderConfirmations?.filter(
      (item) => {
        if (item.role !== "rider") return false;
        const confirmedVersion = item.confirmedBookingDetailsVersion ?? item.confirmedDetailVersion;
        const confirmedOlderDetails =
          item.status === "confirmed" &&
          typeof confirmedVersion === "number" &&
          confirmedVersion < currentDetailVersion;
        return (
          item.status === "pending" ||
          item.status === "joined_interest" ||
          item.status === "needs_review" ||
          confirmedOlderDetails
        );
      },
    ).length ?? 0;

  return pendingConfirmationCount + getPendingRouteRequestCount(ride) + getExpiredSeatHoldCount(ride);
}

type PodStatusContext = {
  currentUserSeatHoldExpired?: boolean;
  currentUserViewingFullPod?: boolean;
  currentUserWaitingForHostDetails?: boolean;
  detailedHostDetailsMissing?: boolean;
};

function getRideAppHostDetailsCompactCopy(_ride: HomeRide) {
  return getRideAppHostDetailsDefaultCopy();
}

function getRideAppHostDetailsDefaultCopy() {
  return "The host needs to complete the ride details before riders can confirm.";
}

function getRideAppHostDetailsDetailedCopy(ride: HomeRide) {
  const fareMissing = !getHostUpdatedRideAppFare(ride);
  const gatherPointMissing = !ride.pickupLabel;
  const confirmByMissing = !Boolean(ride.confirmationDeadlineAt || ride.rideAppConfirmBy || ride.confirmationDeadlineLabel);
  const splitMethodMissing = !Boolean(ride.rideAppSplitMethod || ride.splitMethod);
  const paymentMethodMissing = !Boolean(ride.rideAppAcceptedPaymentMethods?.length || ride.paymentMethod);

  if (!splitMethodMissing && !paymentMethodMissing) {
    if (fareMissing && !gatherPointMissing && !confirmByMissing) {
      return "The host needs to add the fare estimate before riders can confirm.";
    }
    if (!fareMissing && gatherPointMissing && !confirmByMissing) {
      return "The host needs to set the gather point before riders can confirm.";
    }
    if (!fareMissing && !gatherPointMissing && confirmByMissing) {
      return "The host needs to set the confirm-by time before riders can confirm.";
    }
    if (!fareMissing && gatherPointMissing && confirmByMissing) {
      return "The host needs to set the gather point and confirm-by time before riders can confirm.";
    }
  }

  return getRideAppHostDetailsDefaultCopy();
}

function getPodStatusTitle(ride: HomeRide, chatAccess: ReturnType<typeof getRideAppChatAccessState>, context: PodStatusContext = {}) {
  const deadlineState = getRideAppConfirmDeadlineState(ride);
  const isHost = getCurrentUserIsHost(ride);
  const expiredSeatHoldCount = getExpiredSeatHoldCount(ride);
  if (isRideAppHostReplacementNeeded(ride)) return "Host replacement needed";
  if (isRideAppReplacementBookerSelected(ride)) return "New booker selected";
  if (isRideAppPodCancelledByHost(ride)) return "Pod cancelled";
  if (ride.rideAppPodStatus === "ride_booked") return "Ride booked";
  if (context.currentUserSeatHoldExpired) return "Seat released";
  if (!isHost && ride.requiresHostApprovalToRejoin) return "Ask host to rejoin";
  if (!isHost && getRideAppRejoinRestrictionCopy(ride)?.kind === "cooldown") return "Rejoin available soon";
  if (isHost && (deadlineState.status === "expired" || isRideAppSeatHoldExpired(ride))) return `${expiredSeatHoldCount || 1} seat released`;
  if (isHost && expiredSeatHoldCount > 0) return `${expiredSeatHoldCount} seat released`;
  if (context.currentUserViewingFullPod) return "Full";
  if (deadlineState.status === "expired" || isRideAppSeatHoldExpired(ride)) return "Confirm-by time ended";
  if (deadlineState.status === "soon") return isHost ? "Confirm-by time soon" : "Confirm soon";
  if (context.currentUserWaitingForHostDetails) return "Waiting for host details";
  if (ride.bookingDetailsUpdated || ride.rideAppPodStatus === "needs_review" || chatAccess.reason === "needs_review") {
    return getPodStatusUpdateTitle(ride);
  }
  if (isHost && chatAccess.reason === "waiting_for_gather_point") return "Gather point needed";
  if (isHost && chatAccess.reason === "waiting_for_fare_update") return "Fare estimate needed";
  if (isHost && chatAccess.reason === "waiting_for_host_acceptance") return "Split/payment needed";
  if (chatAccess.canAccess) return "Chat unlocked";
  if (ride.bookingDetailsShared || ride.rideAppBookingDetailsConfirmed) return "Waiting for confirmations";
  if (isHost) return "Add booking details";
  return "Waiting for host details";
}

function getPodStatusSubtitle(ride: HomeRide, chatAccess: ReturnType<typeof getRideAppChatAccessState>, context: PodStatusContext = {}) {
  const deadlineState = getRideAppConfirmDeadlineState(ride);
  const isHost = getCurrentUserIsHost(ride);
  const expiredSeatHoldCount = getExpiredSeatHoldCount(ride);
  if (isRideAppHostReplacementNeeded(ride)) return "Host stepped down. A confirmed rider can become the new booker.";
  if (isRideAppReplacementBookerSelected(ride)) return `${getReplacementBookerDisplayName(ride)} is now coordinating this ride app pod.`;
  if (getRideAppHostCancellationStatus(ride) === "host_cancelled") return "This self-settle pod is no longer accepting confirmations. No live payment was charged in this version.";
  if (isRideAppPodCancelledByHost(ride)) return "This self-settle pod is no longer accepting confirmations. No live payment was charged in this version.";
  if (ride.rideAppPodStatus === "ride_booked") return "Use chat for final pickup updates.";
  if (context.currentUserSeatHoldExpired) return "You did not confirm before the confirm-by time.";
  if (!isHost && ride.requiresHostApprovalToRejoin) return "Too many join/leave actions. Host approval is needed before you can rejoin this pod.";
  if (!isHost) {
    const rejoinRestriction = getRideAppRejoinRestrictionCopy(ride);
    if (rejoinRestriction?.kind === "cooldown") return rejoinRestriction.helper;
  }
  if (deadlineState.status === "expired" || isRideAppSeatHoldExpired(ride)) {
    if (isHost) return "Unconfirmed seats were released for other riders.";
    if (context.currentUserViewingFullPod) return "All seats are filled for this pod.";
    return "The confirm-by time has ended for this pod.";
  }
  if (isHost && expiredSeatHoldCount > 0) return "Unconfirmed seats were released for other riders.";
  if (context.currentUserViewingFullPod) return "All seats are filled for this pod.";
  if (deadlineState.status === "soon") {
    return isHost ? "Riders must confirm before the confirm-by time." : "Your seat hold may expire soon if you do not confirm.";
  }
  if (context.currentUserWaitingForHostDetails) {
    return context.detailedHostDetailsMissing ? getRideAppHostDetailsDetailedCopy(ride) : getRideAppHostDetailsCompactCopy(ride);
  }
  if (ride.bookingDetailsUpdated || ride.rideAppPodStatus === "needs_review" || chatAccess.reason === "needs_review") {
    return getPodStatusUpdateSubtitle(ride);
  }
  if (chatAccess.reason === "waiting_for_fare_update" || chatAccess.reason === "waiting_for_host_acceptance" || chatAccess.reason === "waiting_for_gather_point") {
    return chatAccess.helper;
  }
  if (chatAccess.canAccess) return "Use chat to gather at the gather point before the host books.";
  if (ride.bookingDetailsShared || ride.rideAppBookingDetailsConfirmed) {
    return isHost ? `Riders must confirm by ${ride.confirmationDeadlineLabel ?? "5:00 PM"}.` : "Confirm ride details before the confirm-by time.";
  }
  if (isHost) return "Update the estimate, send booking info to riders, and review confirmations.";
  return getRideAppHostDetailsCompactCopy(ride);
}

function getPodStatusFareLabel(ride: HomeRide) {
  return getRideAppHostFareEstimate(ride) ?? "Pending";
}

function getHostUpdatedRideAppFare(ride: HomeRide) {
  return Boolean(getRideAppHostFareEstimate(ride));
}

function getPodStatusFareStat(ride: HomeRide) {
  if (getHostUpdatedRideAppFare(ride)) {
    return {
      label: "Total estimate",
      value: getPodStatusFareLabel(ride),
    };
  }

  return {
    label: `${ride.hostName || "Host"} estimate`,
    value: "Not yet updated",
  };
}

function getPodStatusVehicleLabel(ride: HomeRide) {
  return getRideAppProviderDisplay(ride) === "Selected by host" ? "Ride app" : getRideAppProviderDisplay(ride);
}

function getSeatHoldDisplayLabel(status: PodStatusRiderState | "expired") {
  if (status === "seat_hold_expired" || status === "expired") return "Seat released";
  return status;
}

function StatusChip({ status }: { status: PodStatusRiderState }) {
  const label =
    status === "host"
      ? "Host"
      : status === "confirmed"
        ? "Confirmed"
        : status === "review_needed"
          ? "Review needed"
          : status === "seat_hold_expired"
            ? getSeatHoldDisplayLabel(status)
          : status === "rejoin_cooldown"
            ? "Rejoin cooldown"
          : status === "host_approval_needed"
            ? "Host approval needed"
          : status === "left_pod"
            ? "Left pod"
            : status === "joined_interest"
              ? "Joined"
            : status === "needs_review"
              ? "Needs review"
              : "Pending";
  const tone =
    status === "host"
      ? "border-[var(--rp-primary)]/50 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]"
      : status === "confirmed"
        ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
        : status === "seat_hold_expired"
          ? "border-amber-300/35 bg-amber-400/10 text-amber-200"
        : status === "rejoin_cooldown" || status === "host_approval_needed"
          ? "border-amber-300/35 bg-amber-400/10 text-amber-200"
        : status === "review_needed" || status === "needs_review"
          ? "border-amber-300/35 bg-amber-400/10 text-amber-200"
      : "border-white/12 bg-white/8 text-[var(--rp-muted-strong)]";

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black", tone)}>
      {label}
    </span>
  );
}

function getPodStatusParticipantChipLabel(rider: PodStatusRider, confirmationNotStarted: boolean, ride?: HomeRide) {
  if (ride && rider.role === "host" && isRideAppHostReplacementNeeded(ride)) return "Stepped down";
  if (ride && rider.role === "host" && isRideAppReplacementBookerSelected(ride)) return "Original host";
  if (ride && rider.role === "rider" && isRideAppHostReplacementNeeded(ride)) {
    return rider.status === "confirmed" ? "Eligible" : "Waiting";
  }
  if (rider.role === "host") return "Host";
  if (isOpenRiderSlot(rider)) return "Waiting";
  if (rider.status === "confirmed") return "Confirmed";
  if (rider.status === "needs_review" || rider.status === "review_needed") return "Needs review";
  if (rider.status === "seat_hold_expired") return getSeatHoldDisplayLabel(rider.status);
  if (rider.status === "rejoin_cooldown") return "Rejoin cooldown";
  if (rider.status === "host_approval_needed") return "Host approval needed";
  if (rider.status === "left_pod") return "Left";
  if (rider.status === "joined_interest") return "Joined";
  if (confirmationNotStarted && isCurrentUserRiderName(rider.name)) return "Joined";
  return "Pending";
}

function getPodStatusParticipantHelper(rider: PodStatusRider, bookingDetailsVersion: number, confirmationNotStarted: boolean, detailsReady: boolean, ride?: HomeRide) {
  if (ride && rider.role === "host" && isRideAppHostReplacementNeeded(ride)) return "Stepped down as host";
  if (ride && rider.role === "host" && isRideAppReplacementBookerSelected(ride)) return "Original host";
  if (ride && rider.role === "rider" && isRideAppHostReplacementNeeded(ride)) {
    return rider.status === "confirmed" ? "Eligible to become booker" : "Waiting / cannot become booker unless confirmed";
  }
  if (rider.role === "host") return confirmationNotStarted ? "Needs to share details" : "Host details shared";
  if (isOpenRiderSlot(rider)) return "Waiting for rider to join";
  if (rider.status === "confirmed") return getPodStatusRiderHelper(rider, bookingDetailsVersion);
  if (rider.status === "needs_review" || rider.status === "review_needed") return "Review updated details";
  if (rider.status === "seat_hold_expired") return "Missed confirm-by time";
  if (rider.status === "rejoin_cooldown") return "Rejoin available soon";
  if (rider.status === "host_approval_needed") return isCurrentUserRiderName(rider.name) ? "Too many join/leave actions" : "Wants to rejoin";
  if (rider.status === "left_pod") return "Left pod";
  if (rider.status === "joined_interest") return isCurrentUserRiderName(rider.name) ? "Waiting to confirm" : "Pending confirmation";
  if (isCurrentUserRiderName(rider.name)) return confirmationNotStarted ? "Joined - waiting for host" : "Waiting to confirm";
  return detailsReady ? "Pending confirmation" : "Not joined yet";
}

function getPodStatusProfileStats(rider: PodStatusRider) {
  const seed = rider.name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const isHost = rider.role === "host";
  const hostedCount = isHost ? 12 + (seed % 18) : seed % 5;
  const joinedCount = isHost ? 24 + (seed % 28) : 8 + (seed % 34);
  const completedCount = isHost ? 31 + (seed % 30) : 10 + (seed % 38);
  const cancelledCount = seed % 4;
  const ghostCount = seed % 3;
  const totalHistory = Math.max(1, hostedCount + joinedCount);
  const ghostRate = Math.round((ghostCount / totalHistory) * 100);
  const completionRate = Math.round((completedCount / Math.max(1, completedCount + cancelledCount + ghostCount)) * 100);

  return {
    rating: (4.5 + (seed % 5) / 10).toFixed(1),
    hostedCount,
    joinedCount,
    completedCount,
    ghostCount,
    ghostRate,
    completionRate,
  };
}

function PodStatusRiderProfileModal({
  rider,
  onClose,
}: {
  rider: PodStatusRider;
  onClose: () => void;
}) {
  const stats = getPodStatusProfileStats(rider);
  const roleLabel = rider.role === "host" ? "Host" : "Rider";
  const noShowCopy =
    stats.ghostCount === 0
      ? "No recent no-show records in demo history."
      : `${stats.ghostCount} no-show record${stats.ghostCount === 1 ? "" : "s"} in demo history.`;
  const trustedLabel = Number(stats.rating) >= 4.5 && stats.completionRate >= 80 ? "Trusted" : "Active";

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/70 px-5 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pod-rider-profile-title"
        className="w-full max-w-[390px] overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[linear-gradient(180deg,rgba(12,25,35,0.98),rgba(7,14,22,0.98))] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.5)] [&_p]:text-left"
      >
        <div className="relative p-5 pb-4">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-cyan-300/8" />
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-cyan-200/35 bg-[radial-gradient(circle_at_35%_25%,rgba(103,232,249,0.26),rgba(6,28,38,0.92))] text-2xl font-black text-cyan-100 shadow-[0_0_26px_rgba(103,232,249,0.14)]">
              {getInitials(rider.name)}
            </span>
            <div className="min-w-0">
              <h3 id="pod-rider-profile-title" className="truncate text-xl font-black text-white">
                {rider.name}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-cyan-100">
                  {roleLabel}
                </span>
                <span className="rounded-full border border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--rp-primary)]">
                  {trustedLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close rider profile"
              className="relative z-10 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 bg-white/8 text-[var(--rp-muted-strong)] transition hover:bg-white/12 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-[22px] border border-[var(--rp-primary)]/28 bg-[linear-gradient(135deg,rgba(242,193,91,0.16),rgba(103,232,249,0.07))] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">Rating</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-5xl font-black leading-none text-[var(--rp-primary)]">{stats.rating}</span>
                  <span className="pb-1 text-sm font-black text-[var(--rp-muted-strong)]">/ 5</span>
                </div>
              </div>
              <div className="grid justify-items-end gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--rp-primary)]/35 bg-black/22 px-3 py-1 text-sm font-black text-[var(--rp-primary)]">
                  <Star className="h-4 w-4 fill-current" />
                  {trustedLabel}
                </span>
                <div className="flex items-center gap-1 text-[var(--rp-primary)]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`rating-star-${index}`}
                      className={cn("h-3.5 w-3.5", index < Math.round(Number(stats.rating)) ? "fill-current" : "opacity-30")}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
              Based on demo ride history across hosted and joined pods.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <ProfileStat label="Hosted" value={stats.hostedCount} helper="as host" tone="gold" />
            <ProfileStat label="As rider" value={stats.joinedCount} helper="joined pods" tone="cyan" />
            <ProfileStat label="Completed" value={stats.completedCount} helper="finished rides" />
            <ProfileStat label="No-show rate" value={`${stats.ghostRate}%`} helper={`${stats.ghostCount} record${stats.ghostCount === 1 ? "" : "s"}`} />
          </div>

          <div className="mt-3 rounded-[18px] border border-cyan-300/22 bg-cyan-300/8 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Reliability</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">{noShowCopy}</p>
              </div>
              <ShieldCheck className="h-6 w-6 shrink-0 text-cyan-200" />
            </div>
            <div className="mt-3 grid gap-2">
              <ProfileProgressRow label="Completion" value={`${stats.completionRate}%`} percent={stats.completionRate} tone="cyan" />
              <ProfileProgressRow label="No-show" value={`${stats.ghostRate}%`} percent={stats.ghostRate} tone="gold" />
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Current pod</p>
                <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">Confirmation state</p>
              </div>
              <StatusChip status={rider.status} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileStat({
  label,
  value,
  helper,
  tone = "white",
}: {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "gold" | "cyan" | "white";
}) {
  const valueTone = tone === "gold" ? "text-[var(--rp-primary)]" : tone === "cyan" ? "text-cyan-200" : "text-white";

  return (
    <div className="rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
      <p className={cn("text-2xl font-black leading-none", valueTone)}>{value}</p>
      <p className="mt-1 w-full text-center text-[9px] font-black uppercase leading-3 tracking-[0.04em] text-[var(--rp-muted-strong)]">{label}</p>
      {helper ? <p className="mt-1 text-[11px] font-semibold leading-4 text-[var(--rp-muted)]">{helper}</p> : null}
    </div>
  );
}

function ProfileProgressRow({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string;
  percent: number;
  tone: "gold" | "cyan";
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">{label}</span>
        <span className="text-xs font-black text-white">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/12">
        <div
          className={cn("h-full rounded-full", tone === "cyan" ? "bg-cyan-300" : "bg-[var(--rp-primary)]")}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function PodStatusPanel({
  ride: baseRide,
  seatsUsed,
  onClose,
  pageMode = false,
  backHref,
  embedded = false,
  initialTab = "summary",
}: {
  ride: HomeRide;
  seatsUsed: number;
  onClose?: () => void;
  pageMode?: boolean;
  backHref?: string;
  embedded?: boolean;
  initialTab?: PodStatusTab;
}) {
  const { user, profile } = useAuth();
  const storedRide = applyRideAppDemoPersona(getRideWithStoredSelfSettleJoin(baseRide), { profile, user });
  const [ridePatchOverride, setRidePatchOverride] = useState<Partial<HomeRide> | null>(null);
  const ride = mergeRidePatch(storedRide, ridePatchOverride) as HomeRide;
  const [activeTab, setActiveTab] = useState<PodStatusTab>(normalizePodStatusTab(initialTab));
  const [selectedRiderProfile, setSelectedRiderProfile] = useState<PodStatusRider | null>(null);
  const [showConfirmByModal, setShowConfirmByModal] = useState(false);
  const [showGatherPointModal, setShowGatherPointModal] = useState(false);
  const [showBecomeBookerModal, setShowBecomeBookerModal] = useState(false);
  const [showRejoinModal, setShowRejoinModal] = useState(false);
  const [rejoinMessage, setRejoinMessage] = useState<string | null>(null);
  const [becomeBookerUnderstood, setBecomeBookerUnderstood] = useState(false);
  const [gatherPointDraft, setGatherPointDraft] = useState(() => baseRide.pickupLabel ?? "");
  const [confirmByAmount, setConfirmByAmount] = useState(6);
  const [confirmByUnit, setConfirmByUnit] = useState<ConfirmByUnit>("hours");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const confirmationDeadlineMs = getRideAppConfirmByDate(ride).getTime();
  const riders = buildPodStatusRiders(ride);
  const expiredSeatHoldCount = riders.filter((item) => item.role === "rider" && item.status === "seat_hold_expired").length;
  // TODO: Future: persist released seat count when confirm-by deadline release runs outside mock state.
  const effectiveSeatsUsed = Math.max(0, Math.max(seatsUsed, ride.seatsUsed) - expiredSeatHoldCount);
  const podIsFull = effectiveSeatsUsed >= ride.seatsTotal;
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);
  const requiredConfirmationsFromRide = getRideAppRequiredConfirmations(ride);
  const confirmedCurrentRiderCount = riders.filter((item) => isPodStatusRiderConfirmedForCurrentDetails(item, currentDetailVersion)).length;
  const pendingConfirmationRiders = riders.filter(
    (item) => item.role === "rider" && (item.status === "pending" || item.status === "joined_interest"),
  );
  const needsReviewRiders = riders.filter(
    (item) => item.role === "rider" && (item.status === "needs_review" || item.status === "review_needed"),
  );
  const pendingConfirmationActionCount = pendingConfirmationRiders.length + needsReviewRiders.length;
  const isHost = getCurrentUserIsHost(ride);
  const currentUserHadRideAppSeat =
    !isHost &&
    (ride.currentUserJoined === true ||
      ride.currentUserRole === "joined_rider" ||
      ride.quoteStatus === "joined" ||
      ride.currentUserJoinIntentStatus === "joined_interest" ||
      ride.currentUserJoinIntentStatus === "confirmed" ||
      ride.currentUserJoinIntentStatus === "needs_review" ||
      ride.currentUserJoinIntentStatus === "seat_hold_expired");
  const currentUserConfirmed =
    ride.currentUserBookingDetailsConfirmed === true ||
    ride.selfSettleConfirmationStatus === "confirmed" ||
    riders.some((item) => item.role === "rider" && item.name.toLowerCase().includes("you") && isPodStatusRiderConfirmedForCurrentDetails(item, currentDetailVersion));
  const currentUserSeatHoldExpired =
    currentUserHadRideAppSeat &&
    !currentUserConfirmed &&
    (ride.currentUserConfirmationExpired === true || ride.currentUserJoinIntentStatus === "seat_hold_expired" || isRideAppSeatHoldExpired(ride));
  const currentUserViewingFullPod = !isHost && !currentUserHadRideAppSeat && podIsFull;
  const chatAccessBase = getRideAppChatAccessState({
    ...ride,
    confirmedRiderCount: confirmedCurrentRiderCount,
    rideAppConfirmedRiderCount: confirmedCurrentRiderCount,
  });
  const hostCancellationStatus = getRideAppHostCancellationStatus(ride);
  const replacementNeeded = hostCancellationStatus === "host_replacement_needed";
  const replacementBookerSelected = hostCancellationStatus === "replacement_booker_selected";
  const hostCancelledPod = hostCancellationStatus === "host_cancelled" || hostCancellationStatus === "cancelled";
  const replacementEligibleRiders = getRideAppConfirmedReplacementRiders(ride);
  const currentUserCanBecomeBooker = getCurrentUserCanBecomeReplacementBooker(ride);
  const chatAccess = chatAccessBase;
  const requiredConfirmations = chatAccess.requiredConfirmations || requiredConfirmationsFromRide;
  const hostIncludedConfirmedCount = Math.min(1 + confirmedCurrentRiderCount, 1 + requiredConfirmations);
  const hostIncludedRequiredCount = 1 + requiredConfirmations;
  const deadlineState = getRideAppConfirmDeadlineState(ride, new Date(nowMs));
  const confirmByLabel = formatConfirmByLabel(new Date(confirmationDeadlineMs));
  const confirmationNotStarted = !ride.bookingDetailsShared && !ride.rideAppBookingDetailsFinalized;
  const detailsReady = ride.bookingDetailsShared === true || ride.rideAppBookingDetailsFinalized === true || ride.rideAppBookingDetailsConfirmed === true;
  const fareEstimateSet = getHostUpdatedRideAppFare(ride);
  const splitMethodSet = Boolean(ride.rideAppSplitMethod || ride.splitMethod);
  const paymentMethodSet = Boolean(ride.rideAppAcceptedPaymentMethods?.length || ride.paymentMethod);
  const confirmBySet = Boolean(ride.confirmationDeadlineAt || ride.rideAppConfirmBy || ride.confirmationDeadlineLabel);
  const pickupVenueSet = Boolean(ride.pickupLabel);
  const coreDetailsExceptGatherPointComplete = detailsReady && fareEstimateSet && splitMethodSet && paymentMethodSet && confirmBySet;
  const detailsComplete = coreDetailsExceptGatherPointComplete && pickupVenueSet;
  const currentUserWaitingForHostDetails =
    !currentUserSeatHoldExpired &&
    !isHost &&
    currentUserHadRideAppSeat &&
    !currentUserConfirmed &&
    !chatAccess.canAccess &&
    (!detailsReady ||
      !detailsComplete ||
      chatAccess.reason === "waiting_for_fare_update" ||
      chatAccess.reason === "waiting_for_host_acceptance" ||
      chatAccess.reason === "waiting_for_gather_point" ||
      chatAccess.reason === "waiting_for_booking_details");
  const podStillAcceptsRejoin =
    ride.status !== "cancelled" &&
    ride.status !== "expired" &&
    ride.rideAppPodStatus !== "cancelled" &&
    ride.rideAppPodStatus !== "expired" &&
    ride.rideAppPodStatus !== "ride_booked" &&
    ride.rideAppPodStatus !== "completed" &&
    !hostCancelledPod;
  const rejoinOpenSeatCount = Math.max(0, ride.seatsTotal - effectiveSeatsUsed);
  const rejoinRestriction = getRideAppRejoinRestrictionCopy(ride, rejoinOpenSeatCount > 0);
  const canRequestRejoin = currentUserSeatHoldExpired && podStillAcceptsRejoin && rejoinOpenSeatCount > 0 && !rejoinRestriction;
  const rejoinUnavailableHelper = rejoinRestriction?.helper ?? (podStillAcceptsRejoin ? "Your released seat is no longer available." : "This pod is no longer accepting riders.");
  const currentDashboardStep = ride.rideAppPodStatus === "ride_booked" || ride.rideAppPodStatus === "completed" ? 5 : chatAccess.canAccess ? 3 : detailsComplete ? 2 : 1;
  const detailChecklistRows = [
    {
      icon: WalletCards,
      label: "Estimated fare",
      value: detailsReady && fareEstimateSet ? getPodStatusFareLabel(ride) : "Not set",
      set: detailsReady && fareEstimateSet,
    },
    {
      icon: ListChecks,
      label: "Split method",
      value: ride.rideAppSplitMethod ?? ride.splitMethod ?? "Equal split",
      set: true,
    },
    {
      icon: ReceiptText,
      label: "Payment method",
      value: paymentMethodSet ? getRideAppAcceptedPaymentDisplay(ride) : "Not set",
      set: paymentMethodSet,
    },
    {
      icon: Clock3,
      label: "Confirm-by time",
      value: detailsReady && confirmBySet ? confirmByLabel : "Not set",
      set: detailsReady && confirmBySet,
      helper: "Riders must confirm before this time to keep their seat.",
      onClick: isHost ? () => setShowConfirmByModal(true) : undefined,
      actionLabel: isHost ? "Edit" : undefined,
    },
    {
      icon: MapPin,
      label: "Gather point",
      value: detailsReady && pickupVenueSet ? ride.pickupLabel ?? "Not set" : "Not set",
      set: detailsReady && pickupVenueSet,
      helper: detailsReady && pickupVenueSet ? ride.fromLabel : "Where riders meet before booking",
      onClick: isHost ? openGatherPointModal : undefined,
      actionLabel: isHost ? (detailsReady && pickupVenueSet ? "Edit" : "Set") : undefined,
      tone: detailsReady && !pickupVenueSet ? "warning" : "default",
      valueLayout: "stacked",
    },
  ];
  const riderJoinedCount = ride.joinedRiderCount ?? ride.joinedRiders.length;
  const riderReviewCount = riders.filter((item) => item.role === "rider" && (item.status === "needs_review" || item.status === "review_needed")).length;
  const missingDetailReasons = [
    detailsReady && !fareEstimateSet ? "Host has not added the ride app fare estimate yet." : null,
    detailsReady && !splitMethodSet ? "Host has not confirmed the split method yet." : null,
    detailsReady && !paymentMethodSet ? "Host has not confirmed the accepted payment method yet." : null,
    detailsReady && !confirmBySet ? "Host has not set the confirm-by time yet." : null,
    detailsReady && !pickupVenueSet ? "Host must set the gather point before riders can confirm." : null,
  ].filter((reason): reason is string => Boolean(reason));
  const chatLockedReasons = currentUserSeatHoldExpired
    ? [
        "You did not confirm before the confirm-by time, so your seat was released for other riders.",
        "No RidePod fee was confirmed.",
        "Waiver was not used.",
      ]
    : currentUserViewingFullPod
    ? [
        "All seats are filled for this ride app pod.",
        "Join another pod or check again if a seat opens.",
      ]
    : replacementNeeded
    ? [
        "Host stepped down. Chat is read-only until a new booker is selected.",
        "A confirmed rider can become the new booker.",
      ]
    : missingDetailReasons.length
    ? missingDetailReasons
    : detailsReady
      ? [
          "Required riders have not confirmed current details yet.",
          "Chat opens when all required confirmations are met.",
        ]
      : [
          "Host has not shared booking details yet.",
          "Riders cannot confirm until all details are set.",
          "Chat opens when all required riders confirm.",
        ];
  const ridePickupDate = getRidePickupDate(ride);
  const confirmByDeadlinePreview = getConfirmByDeadline(ride, confirmByAmount, confirmByUnit);
  const confirmByDeadlineIsPast = Boolean(confirmByDeadlinePreview && confirmByDeadlinePreview.getTime() <= nowMs);
  const podStatusRouteTitle = `${ride.fromLabel} -> ${ride.toLabel}`;
  const podStatusActorName =
    profile?.display_name?.trim() ||
    profile?.preferred_name?.trim() ||
    user?.email?.split("@")[0] ||
    ride.currentUserName?.trim() ||
    "Someone";

  function notifyPodStatusAction(input: {
    type?: NotifyPodAudienceInput["type"];
    audiences?: PodNotificationAudience[];
    title: string;
    body?: string | null;
    selfTitle?: string | null;
    selfBody?: string | null;
    action: string;
    relatedUrl?: string;
    dedupe?: boolean;
    delivery?: NotifyPodAudienceInput["delivery"];
    metadata?: Record<string, unknown>;
  }) {
    if (!user || !isRideAppSelfSettlePod(ride)) return;

    void notifyPodAudience({
      podId: ride.id,
      actorUserId: user.id,
      actorDisplayName: podStatusActorName,
      type: input.type ?? "ride_app_action_required",
      audiences: input.audiences ?? ["actor", "others"],
      title: input.title,
      body: input.body ?? null,
      selfTitle: input.selfTitle,
      selfBody: input.selfBody,
      relatedUrl: input.relatedUrl ?? `/pods/${ride.id}/status`,
      metadata: {
        action: input.action,
        route: podStatusRouteTitle,
        ...(input.metadata ?? {}),
      },
      dedupe: input.dedupe,
      delivery: input.delivery,
    });
  }

  function saveConfirmByTime() {
    if (!confirmByDeadlinePreview || confirmByDeadlineIsPast) return;

    const updatedAt = new Date().toISOString();
    const deadlineIso = confirmByDeadlinePreview.toISOString();
    const deadlineLabel = formatConfirmByLabel(confirmByDeadlinePreview);
    const patch: Partial<HomeRide> = {
      confirmationDeadlineAt: deadlineIso,
      confirmationDeadlineLabel: deadlineLabel,
      rideAppConfirmBy: deadlineIso,
      rideAppConfirmByUpdatedAt: updatedAt,
      riderConfirmations: ride.riderConfirmations?.map((rider) =>
        rider.role === "rider" ? { ...rider, confirmBy: deadlineIso } : rider,
      ),
    };

    setRidePatchOverride((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
    notifyPodStatusAction({
      type: "ride_app_action_required",
      title: "Confirm-by time updated",
      body: `${podStatusActorName} set confirm-by to ${deadlineLabel}. Please review current details.`,
      selfTitle: "You updated confirm-by time",
      selfBody: `Riders need to confirm by ${deadlineLabel}.`,
      action: "confirm_by_updated",
    });
    setShowConfirmByModal(false);
  }

  function openGatherPointModal() {
    setGatherPointDraft(ride.pickupLabel ?? "");
    setShowGatherPointModal(true);
  }

  function saveGatherPoint() {
    const nextGatherPoint = gatherPointDraft.trim();
    if (!nextGatherPoint) return;

    const previousGatherPoint = ride.pickupLabel?.trim() ?? "";
    const gatherPointChanged = previousGatherPoint !== nextGatherPoint;
    const reviewPatch =
      gatherPointChanged && detailsReady
        ? applyRideAppMeaningfulDetailUpdate({ ...ride, pickupLabel: nextGatherPoint }, "pickup")
        : {};
    const patch: Partial<HomeRide> = {
      pickupLabel: nextGatherPoint,
      rideAppChecklist: {
        dropoffPoint: ride.rideAppChecklist?.dropoffPoint ?? false,
        rideApp: ride.rideAppChecklist?.rideApp ?? false,
        estimatedFare: ride.rideAppChecklist?.estimatedFare ?? false,
        booker: ride.rideAppChecklist?.booker ?? false,
        fareSplit: ride.rideAppChecklist?.fareSplit ?? false,
        paymentMethod: ride.rideAppChecklist?.paymentMethod ?? false,
        paymentRecipientAfterRide: ride.rideAppChecklist?.paymentRecipientAfterRide ?? false,
        meetingTime: ride.rideAppChecklist?.meetingTime ?? false,
        pickupPoint: true,
        updatedAt: new Date().toISOString(),
        updatedBy: ride.hostName || "Host",
      },
      ...reviewPatch,
    };

    setRidePatchOverride((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
    notifyPodStatusAction({
      type: gatherPointChanged ? "ride_app_action_required" : "ride_app_details_updated",
      title: gatherPointChanged ? "Gather point updated" : "Gather point set",
      body: `${podStatusActorName} ${gatherPointChanged ? "updated" : "set"} the gather point: ${nextGatherPoint}.`,
      selfTitle: gatherPointChanged ? "You updated the gather point" : "You set the gather point",
      selfBody: nextGatherPoint,
      action: gatherPointChanged ? "gather_point_updated" : "gather_point_set",
    });
    setShowGatherPointModal(false);
  }

  function confirmBecomeBooker() {
    if (!currentUserCanBecomeBooker || !becomeBookerUnderstood) return;

    const bookerName = ride.currentUserName?.trim() || "Yuna";
    const patch: Partial<HomeRide> = {
      rideAppHostCancellationStatus: "replacement_booker_selected",
      rideAppReplacementBookerId: user?.id ?? "current-user",
      rideAppReplacementBookerName: bookerName,
      rideAppFeeResolution: "remains_active",
      currentUserRole: "host",
      hostName: bookerName,
      rideAppHostCancellationActivity: [
        ...getRideAppHostCancellationActivity(ride),
        `${bookerName} became the new booker.`,
      ],
    };

    setRidePatchOverride((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
    notifyPodStatusAction({
      type: "ride_app_details_updated",
      title: "New booker selected",
      body: `${bookerName} became the new booker for ${podStatusRouteTitle}.`,
      selfTitle: "You became the new booker",
      selfBody: "You can now coordinate and book the ride app outside RidePod.",
      action: "replacement_booker_selected",
    });
    setBecomeBookerUnderstood(false);
    setShowBecomeBookerModal(false);
  }

  function requestToRejoin() {
    if (!currentUserSeatHoldExpired) return;
    if (!canRequestRejoin) {
      setRejoinMessage(rejoinRestriction?.helper ?? (podStillAcceptsRejoin ? "This pod is full." : "This pod is no longer accepting riders."));
      setShowRejoinModal(false);
      return;
    }

    const patch = buildRequestToRejoinPatch(ride, currentDetailVersion);
    setRidePatchOverride((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
    notifyPodStatusAction({
      type: "ride_app_rejoin_requested",
      audiences: ["actor", "host"],
      title: "Rider wants to rejoin",
      body: `${podStatusActorName} requested to rejoin ${podStatusRouteTitle}.`,
      selfTitle: "You requested to rejoin",
      selfBody: detailsComplete ? "Please confirm ride details again." : "Waiting for host details.",
      action: "rejoin_requested",
    });
    setActiveTab("summary");
    setRejoinMessage(detailsComplete ? "Confirm ride details" : "Waiting for host details");
    setShowRejoinModal(false);
  }

  function requestRideAppStopFromStatus(stopLabel: string) {
    const trimmedStopLabel = stopLabel.trim();
    const routeLocked =
      ride.bookingDetailsShared === true ||
      ride.rideAppBookingDetailsConfirmed === true ||
      ride.rideAppBookingDetailsFinalized === true;
    const hasPendingStop = getNormalizedRouteRequests(ride).pendingCount > 0;
    if (!trimmedStopLabel || isHost || !currentUserHadRideAppSeat || currentUserSeatHoldExpired || hostCancelledPod || routeLocked || hasPendingStop) {
      return;
    }

    const patch = buildRideAppStopRequestPatch(ride, trimmedStopLabel, podStatusActorName);
    setRidePatchOverride((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
    notifyPodStatusAction({
      type: "ride_app_action_required",
      audiences: ["actor", "host"],
      title: "New stop requested",
      body: `${podStatusActorName} requested a new stop: ${trimmedStopLabel}.`,
      selfTitle: "Stop request sent",
      selfBody: `${trimmedStopLabel} is waiting for host approval.`,
      action: "route_stop_requested",
      relatedUrl: `/pods/${ride.id}/status?tab=route#route-requests`,
      dedupe: false,
      metadata: {
        stopLabel: trimmedStopLabel,
        requestedBy: podStatusActorName,
      },
    });
  }

  function approveRouteStopFromStatus(stop: RoutePlanStop) {
    const patch = buildApproveRideAppStopPatch(ride, stop);
    setRidePatchOverride((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
    notifyPodStatusAction({
      type: "ride_app_action_required",
      title: "Route request approved",
      body: `${podStatusActorName} approved ${stop.label}. Please review the latest ride details.`,
      selfTitle: "You approved a route request",
      selfBody: stop.label,
      action: "route_request_approved",
      metadata: {
        stopLabel: stop.label,
        requestedBy: stop.requestedBy ?? "Rider",
      },
    });
  }

  function declineRouteStopFromStatus(stop: RoutePlanStop) {
    const patch = buildDeclineRideAppStopPatch(ride, stop);
    setRidePatchOverride((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
    notifyPodStatusAction({
      type: "ride_app_details_updated",
      title: "Route request declined",
      body: `${podStatusActorName} declined ${stop.label}.`,
      selfTitle: "You declined a route request",
      selfBody: stop.label,
      action: "route_request_declined",
      metadata: {
        stopLabel: stop.label,
        requestedBy: stop.requestedBy ?? "Rider",
      },
    });
  }

  useEffect(() => {
    if (!user?.id || !isHost || !isRideAppSelfSettlePod(ride) || !isHostApprovedStopPolicy(ride.stopRequestPolicy) || hasAnyRideAppStopRequestState(ride)) {
      return;
    }

    let cancelled = false;
    void getHostPendingStopRequestFromNotifications(user.id, ride)
      .then((pendingStop) => {
        if (cancelled || !pendingStop) return;
        const existingRequests = getNormalizedRouteRequests(ride).all.filter((request) => request.id !== pendingStop.id);
        const patch: Partial<HomeRide> = {
          routeRequests: [
            ...existingRequests,
            {
              id: pendingStop.id,
              requestedByName: pendingStop.requestedBy ?? "Rider",
              stopLocation: pendingStop.label,
              reason: pendingStop.reason,
              status: "pending",
            },
          ],
          proposedStops: [pendingStop],
        };
        setRidePatchOverride((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
        saveStoredSelfSettleRidePatch(ride.id, patch);
        updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
      })
      .catch((error) => {
        console.warn("RidePod stop request hydration failed", error);
      });

    return () => {
      cancelled = true;
    };
    // Hydration is keyed to the persisted pod/stop state; the derived ride object itself is rebuilt during render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, ride.id, ride.stopRequestPolicy, ride.proposedStops?.length, ride.approvedStops?.length, ride.declinedStops?.length, user?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const statusContent = (
      <section className={cn(
        embedded
          ? "ridepod-status-dashboard grid w-full gap-3 text-left text-[var(--rp-text)]"
          : "ridepod-status-dashboard mx-auto flex w-full max-w-[430px] flex-col overflow-hidden border-x border-[var(--rp-border)] bg-[#030910] text-[var(--rp-text)] shadow-[0_28px_90px_rgba(0,0,0,0.56)]",
        !embedded && (pageMode ? "min-h-dvh" : "h-full"),
      )} id={embedded ? "ride-app-dashboard" : undefined}>
        {embedded ? null : <header className="grid grid-cols-[44px_1fr_44px] items-center border-b border-white/8 px-3 py-3">
          {pageMode ? (
            <Link
              href={backHref ?? `/pods/${ride.id}`}
              aria-label="Back to pod details"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-white/8 text-white shadow-[0_10px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/12"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close pod status"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-white/8 text-white shadow-[0_10px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/12"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
          <div className="text-center">
            <h2 id="pod-status-title" className="text-lg font-black text-[var(--rp-primary)]">
              View Pod Status
            </h2>
          </div>
          <span className="h-11 w-11" aria-hidden="true" />
        </header>}

        <div className={cn(embedded ? "grid gap-3 text-left" : "min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 text-left")}>
          {embedded ? null : <section className="hidden rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.9),rgba(2,8,15,0.98))] p-4 shadow-[var(--rp-shadow-soft)]">
            <div className="flex items-start gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[var(--rp-primary)]/40 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]">
                <UsersRound className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="inline-flex items-center gap-1 rounded-full border border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/10 px-2 py-0.5 text-[9px] font-black uppercase text-[var(--rp-primary)]">
                    <Crown className="h-3 w-3" />
                    Hosted by {ride.hostName || "host"}
                  </p>
                  <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-0.5 text-[9px] font-black uppercase text-cyan-200">
                    Confirming
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-[var(--rp-muted-strong)]">
                  {ride.fromLabel} {"->"} {ride.toLabel}
                </p>
                <p className="mt-1 text-sm font-black text-cyan-200">
                  {ride.dateLabel} {" · "} {ride.timeLabel}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-[var(--rp-muted-strong)]">
              <span>Pod ID: {ride.id.slice(0, 8).toUpperCase()}</span>
              <Copy className="h-3.5 w-3.5" />
            </div>
            <div className="mt-4 grid grid-cols-[1.05fr_1.14fr_0.9fr] gap-3 border-t border-white/10 pt-4">
              <MiniStat label="Seats filled" value={`${effectiveSeatsUsed} / ${ride.seatsTotal}`} tone="cyan" showProgress progress={(effectiveSeatsUsed / ride.seatsTotal) * 100} />
              <MiniStat label={getPodStatusFareStat(ride).label} value={getPodStatusFareStat(ride).value} tone="gold" href="#fare-split" compact />
              <MiniStat label="Ride type" value={getPodStatusVehicleLabel(ride)} tone="white" />
            </div>
          </section>}

          {currentUserSeatHoldExpired ? (
            <section className="mt-3 rounded-[20px] border border-rose-300/25 bg-rose-400/10 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rose-300/30 bg-rose-400/12 text-rose-100">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black leading-tight text-rose-100">Seat released</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                    You did not confirm before the confirm-by time, so your seat was released for other riders.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <p className="rounded-[14px] border border-white/10 bg-black/20 px-3 py-2 text-xs font-black leading-5 text-rose-100">
                      No RidePod fee was confirmed.
                    </p>
                    <p className="rounded-[14px] border border-white/10 bg-black/20 px-3 py-2 text-xs font-black leading-5 text-rose-100">
                      Waiver was not used.
                    </p>
                    {!canRequestRejoin ? (
                      <p className="rounded-[14px] border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-black leading-5 text-amber-100">
                        {podStillAcceptsRejoin ? "Pod is full. " : ""}{rejoinUnavailableHelper}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {canRequestRejoin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRejoinMessage(null);
                        setShowRejoinModal(true);
                      }}
                      className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[#07111a] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
                    >
                      Request to rejoin
                    </button>
                    <Link href="/home" className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-cyan-300/35 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/14">
                      Find another pod
                    </Link>
                  </>
                ) : (
                  <Link href="/home" className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[#07111a] shadow-[0_14px_30px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105">
                    Find another pod
                  </Link>
                )}
              </div>
            </section>
          ) : (
            <nav className="sticky top-0 z-10 mt-3 grid grid-cols-4 rounded-[18px] border border-white/10 bg-[rgba(8,14,22,0.92)] p-1 backdrop-blur-xl">
              {podStatusTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                const tabClassName = cn(
                  "flex min-h-11 items-center justify-center gap-1 rounded-[14px] text-[11px] font-black transition min-[390px]:gap-1.5 min-[390px]:text-xs",
                  active ? "bg-[var(--rp-primary)] text-[#07111a]" : "text-[var(--rp-muted-strong)] hover:bg-white/8",
                );

                if (tab.id === "chat") {
                  return (
                    <Link key={tab.id} href={`/pods/${ride.id}/chat`} className={tabClassName}>
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </Link>
                  );
                }

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={tabClassName}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          )}

          {!currentUserSeatHoldExpired && rejoinMessage ? (
            <p className="mt-3 rounded-[16px] border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100">
              {rejoinMessage}
            </p>
          ) : null}

          {activeTab === "summary" && !currentUserSeatHoldExpired ? (
            <div className="mt-3 grid gap-3">
              {hostCancellationStatus !== "active" ? (
                <section className="rounded-[20px] border border-[var(--rp-primary)]/45 bg-[linear-gradient(135deg,rgba(242,193,91,0.14),rgba(8,47,73,0.14),rgba(255,255,255,0.04))] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
                    {replacementNeeded || replacementBookerSelected ? "Host replacement" : "Pod cancellation"}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <div className="grid grid-cols-[1fr_auto] gap-3 rounded-[14px] border border-white/10 bg-black/18 p-3">
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">Original host</span>
                      <span className="text-right text-sm font-black text-white">{getOriginalHostDisplayName(ride)}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-3 rounded-[14px] border border-white/10 bg-black/18 p-3">
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">Reason</span>
                      <span className="text-right text-sm font-black text-white">{ride.rideAppHostCancellationReason ?? "Plans changed"}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-3 rounded-[14px] border border-white/10 bg-black/18 p-3">
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">Replacement deadline</span>
                      <span className="text-right text-sm font-black text-white">{ride.rideAppReplacementDeadlineLabel ?? "Before confirm-by time"}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-3 rounded-[14px] border border-white/10 bg-black/18 p-3">
                      <span className="text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">Eligible confirmed riders</span>
                      <span className="text-right text-sm font-black text-white">{replacementEligibleRiders.length}</span>
                    </div>
                  </div>
                  <p className="mt-3 rounded-[14px] border border-cyan-300/22 bg-cyan-300/8 px-3 py-2 text-xs font-semibold leading-5 text-cyan-100">
                    {getRideAppFeeResolutionCopy(ride.rideAppFeeResolution)}
                  </p>
                  {getRideAppHostCancellationActivity(ride).length ? (
                    <div className="mt-3 grid gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Activity</p>
                      {getRideAppHostCancellationActivity(ride).map((item, index) => (
                        <p key={`${item}-${index}`} className="rounded-[12px] border border-white/10 bg-black/18 px-3 py-2 text-xs font-semibold text-[var(--rp-muted-strong)]">
                          {item}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Overall progress</p>
                <div className="mt-3">
                  <PodStatusProgressRail currentStep={currentDashboardStep} isHost={isHost} />
                </div>
              </section>

              {isHost && detailsComplete && pendingConfirmationActionCount > 0 ? (
                <section className="rounded-[20px] border border-[var(--rp-primary)]/30 bg-[var(--rp-primary)]/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Confirm-by deadline</p>
                  <h3 className="mt-2 text-lg font-black leading-tight text-white">Waiting for confirmations</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                    {pendingConfirmationActionCount > 0
                      ? `${pendingConfirmationActionCount} ${pendingConfirmationActionCount === 1 ? "rider needs" : "riders need"} to confirm by ${confirmByLabel}.`
                      : "Riders need to confirm before the confirm-by time."}
                  </p>
                  <p className="mt-2 text-xs font-bold leading-5 text-cyan-100">
                    Unconfirmed seats may be released after the deadline.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 max-[360px]:grid-cols-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("riders")}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/8 px-3 text-xs font-black text-white transition hover:bg-white/12"
                    >
                      <UsersRound className="h-4 w-4" />
                      View confirmations
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmByModal(true)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/12 px-3 text-xs font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-primary)]/18"
                    >
                      <Clock3 className="h-4 w-4" />
                      Edit confirm-by time
                    </button>
                  </div>
                </section>
              ) : null}

              <section id="fare-split" className="scroll-mt-24 rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Key details</p>
                  {isHost ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmByModal(true)}
                      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 text-[10px] font-black uppercase text-cyan-100"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      Set confirm-by
                    </button>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--rp-muted-strong)]">
                      {detailsReady ? "Set details" : "Not set yet"}
                    </span>
                  )}
                </div>
                <div className="mt-3 rounded-[16px] border border-white/10 bg-black/20 p-3">
                  {detailChecklistRows.map((row) => (
                    <PodStatusChecklistRow
                      key={row.label}
                      icon={row.icon}
                      label={row.label}
                      value={row.value}
                      set={row.set}
                      helper={row.helper}
                      actionLabel={row.actionLabel}
                      tone={"tone" in row ? (row.tone as "default" | "warning" | undefined) : undefined}
                      valueLayout={"valueLayout" in row ? (row.valueLayout as "badge" | "stacked" | undefined) : undefined}
                      onClick={row.onClick}
                    />
                  ))}
                  <p className="mt-3 text-xs font-bold leading-5 text-cyan-100">Ride fare is paid outside RidePod.</p>
                </div>
              </section>

            </div>
          ) : null}

          {!currentUserSeatHoldExpired && activeTab === "riders" ? (
            <div className="mt-3 grid gap-3">
              <section className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Rider confirmations</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <PodStatusMetric value={`${hostIncludedConfirmedCount}/${hostIncludedRequiredCount}`} label="Confirmed" tone="green" />
                  <PodStatusMetric value={riderJoinedCount} label="Joined" tone="cyan" />
                  <PodStatusMetric value={riderReviewCount} label="Needs review" tone="gold" />
                  <PodStatusMetric value={expiredSeatHoldCount} label="Expired" tone="rose" />
                </div>
                <p className="mt-3 text-center text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                  Required confirmations: {hostIncludedRequiredCount} including host.
                </p>
              </section>

              <section className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                {isHost && ride.requiresHostApprovalToRejoin ? (
                  <div className="mb-3 rounded-[16px] border border-amber-300/25 bg-amber-400/10 p-3">
                    <p className="text-sm font-black text-amber-100">
                      {ride.rideAppRejoinRequestedBy ?? getCurrentUserRiderName(ride)} wants to rejoin.
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                      Too many join/leave actions. Host approval is needed before rejoin in this local mock flow.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" disabled className="min-h-10 rounded-[14px] border border-amber-300/30 bg-amber-300/10 text-xs font-black text-amber-100 opacity-80">
                        Approve rejoin
                      </button>
                      <button type="button" disabled className="min-h-10 rounded-[14px] border border-white/12 bg-white/8 text-xs font-black text-[var(--rp-muted-strong)] opacity-80">
                        Decline
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-1">
                  {riders.map((rider, index) => {
                    const hostEchoRider = isHostEchoRider(rider, isHost);
                    const chipLabel = hostEchoRider ? "Host" : getPodStatusParticipantChipLabel(rider, confirmationNotStarted, ride);
                    const helper = hostEchoRider ? "Host details shared" : getPodStatusParticipantHelper(rider, currentDetailVersion, confirmationNotStarted, detailsReady, ride);
                    const displayName = hostEchoRider ? "Host" : getPodStatusPersonDisplayName(rider.name);
                    const participantAvatarUrl =
                      rider.role === "host" || hostEchoRider
                        ? isHost
                          ? profile?.avatar_url?.trim() || getHostProfileImageUrl(ride)
                          : getHostProfileImageUrl(ride)
                        : null;
                    const rowClassName =
                      "flex w-full items-center gap-3 border-b border-white/8 py-3 text-left transition hover:bg-white/[0.03] last:border-b-0";
                    const rowContent = (
                      <>
                        <span
                          className={cn(
                            "grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border bg-cover bg-center text-sm font-black",
                            rider.role === "host" || hostEchoRider
                              ? "border-[var(--rp-primary)]/45 bg-[var(--rp-primary)] text-[#07111a]"
                              : isCurrentUserRiderName(rider.name)
                                ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                                : "border-white/12 bg-white/8 text-[var(--rp-muted-strong)]",
                          )}
                          style={participantAvatarUrl ? { backgroundImage: `url(${participantAvatarUrl})` } : undefined}
                        >
                          {participantAvatarUrl ? <span className="sr-only">{displayName}</span> : hostEchoRider ? "H" : getPodStatusAvatarLabel(rider.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">
                            {displayName}
                            {rider.role === "host" ? " (Host)" : ""}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold leading-4 text-[var(--rp-muted-strong)]">{helper}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--rp-muted-strong)]">
                          {chipLabel}
                        </span>
                      </>
                    );

                    if (rider.role === "host" && isHost) {
                      return (
                        <Link key={`${rider.name}-${index}`} href="/profile" className={rowClassName} aria-label="Open your profile">
                          {rowContent}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={`${rider.name}-${index}`}
                        type="button"
                        onClick={() => setSelectedRiderProfile(rider)}
                        className={rowClassName}
                      >
                        {rowContent}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {!currentUserSeatHoldExpired && activeTab === "route" ? (
            <div className="mt-3 grid gap-3">
              <CompactRideAppRoutePanel
                ride={ride}
                canRequestStop={!isHost && currentUserHadRideAppSeat && !hostCancelledPod}
                canReviewStop={isHost}
                onRequestStop={requestRideAppStopFromStatus}
                onApproveStop={approveRouteStopFromStatus}
                onDeclineStop={declineRouteStopFromStatus}
              />
            </div>
          ) : null}

          {!currentUserSeatHoldExpired && activeTab === "chat" ? (
            <div className="mt-3 grid gap-3">
              <section className="rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(242,193,91,0.12),transparent_42%),rgba(255,255,255,0.04)] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Chat status</p>
                <div className="mt-3 flex items-start gap-3 rounded-[18px] border border-white/10 bg-black/20 p-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/10 text-cyan-100">
                    {chatAccess.canAccess ? <MessageCircle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black leading-tight text-white">
                      {currentUserSeatHoldExpired ? "Chat unavailable" : replacementNeeded && !chatAccess.canAccess ? "Chat is read-only" : chatAccess.canAccess ? "Chat unlocked" : "Chat is locked"}
                    </h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                      {currentUserSeatHoldExpired
                        ? "Your seat was released because you did not confirm before the confirm-by time."
                        : replacementNeeded
                        ? chatAccess.canAccess
                          ? "Host replacement mode started. Confirmed riders can keep coordinating while a new booker is selected."
                          : "Host replacement needed. A confirmed rider can become the new booker."
                        : chatAccess.canAccess
                        ? "Ready to gather. Chat is open for confirmed riders."
                        : currentUserWaitingForHostDetails
                          ? getRideAppHostDetailsCompactCopy(ride)
                          : "Waiting for required riders to confirm."}
                    </p>
                  </div>
                </div>
              </section>

              {!chatAccess.canAccess ? (
                <section className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Why chat is locked</p>
                  <div className="mt-3 grid gap-2">
                    {chatLockedReasons.map((reason) => (
                      <div key={reason} className="flex items-start gap-3 rounded-[14px] border border-white/10 bg-black/20 p-3">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rp-muted-strong)]" />
                        <p className="text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{reason}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {ride.rideAppJoinLeaveActivitySummary ? (
                <section className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Pod activity</p>
                  <p className="mt-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-sm font-black leading-6 text-white">
                    {ride.rideAppJoinLeaveActivitySummary}
                  </p>
                </section>
              ) : null}

            </div>
          ) : null}
        </div>

        {showConfirmByModal ? (
          <div className="fixed inset-0 z-[105] grid place-items-center bg-black/68 px-4 py-6 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-by-title"
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[380px] flex-col overflow-hidden rounded-[26px] border border-cyan-200/25 bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.48)]"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-cyan-200/35 bg-cyan-300/12 text-cyan-100">
                    <Clock3 className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="confirm-by-title" className="text-xl font-black leading-tight text-white">Set confirm-by time</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                      Riders must confirm ride details before this time. If they do not confirm, their seat hold may expire and reopen for other riders.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Before pickup</p>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
                    <label className="grid gap-2">
                      <span className="sr-only">Confirm-by amount</span>
                      <input
                        type="number"
                        min={1}
                        max={confirmByUnit === "days" ? 14 : 72}
                        value={confirmByAmount}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setConfirmByAmount(clampConfirmByAmount(Number.isFinite(nextValue) ? nextValue : 1, confirmByUnit));
                        }}
                        className="h-12 rounded-[14px] border border-white/12 bg-black/24 px-4 text-lg font-black text-white outline-none focus:border-cyan-300"
                      />
                    </label>
                    <div className="grid grid-cols-2 rounded-[14px] border border-white/10 bg-black/20 p-1">
                      {(["hours", "days"] as ConfirmByUnit[]).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          aria-pressed={confirmByUnit === unit}
                          onClick={() => {
                            setConfirmByUnit(unit);
                            setConfirmByAmount((current) => clampConfirmByAmount(current, unit));
                          }}
                          className={cn(
                            "min-h-10 rounded-[11px] px-3 text-xs font-black capitalize transition",
                            confirmByUnit === unit
                              ? "bg-cyan-300 text-[#061019]"
                              : "text-[var(--rp-muted-strong)] hover:bg-white/8 hover:text-white",
                          )}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { amount: 2, unit: "hours" as const },
                      { amount: 6, unit: "hours" as const },
                      { amount: 12, unit: "hours" as const },
                      { amount: 1, unit: "days" as const },
                    ].map((preset) => (
                      <button
                        key={`${preset.amount}-${preset.unit}`}
                        type="button"
                        onClick={() => {
                          setConfirmByAmount(preset.amount);
                          setConfirmByUnit(preset.unit);
                        }}
                        className="min-h-10 rounded-[13px] border border-cyan-300/25 bg-cyan-300/8 px-3 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/14"
                      >
                        {formatConfirmByOffset(preset.amount, preset.unit)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                    Default is 24 hours before ride. If the ride is within 24 hours, use 1 hour before pickup.
                  </p>
                </div>

                <div className="mt-4 rounded-[18px] border border-[var(--rp-primary)]/25 bg-[var(--rp-primary)]/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Preview</p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
                    Pickup: {ridePickupDate ? formatRidePickupLabel(ridePickupDate) : `${ride.dateLabel} - ${ride.timeLabel}`}
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    Confirm by {confirmByDeadlinePreview ? formatConfirmByLabel(confirmByDeadlinePreview) : "Not available"}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5 text-cyan-100">
                    {formatConfirmByOffset(confirmByAmount, confirmByUnit)} before pickup.
                  </p>
                  {confirmByDeadlineIsPast ? (
                    <p className="mt-2 rounded-[12px] border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">
                      This confirm-by time is already past. Choose a shorter time or a future ride.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/10 bg-[var(--rp-shell)] p-5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmByModal(false)}
                  className="min-h-12 rounded-[16px] border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-white/12"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveConfirmByTime}
                  disabled={!confirmByDeadlinePreview || confirmByDeadlineIsPast}
                  className="min-h-12 rounded-[16px] bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] px-4 text-sm font-black text-[#061019] shadow-[0_14px_30px_rgba(56,189,248,0.22)] transition hover:brightness-105 disabled:opacity-45"
                >
                  Save time
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {showGatherPointModal ? (
          <div className="fixed inset-0 z-[105] grid place-items-center bg-black/68 px-4 py-6 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="gather-point-title"
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[380px] flex-col overflow-hidden rounded-[26px] border border-cyan-200/25 bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.48)]"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-cyan-200/35 bg-cyan-300/12 text-cyan-100">
                    <MapPin className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="gather-point-title" className="text-xl font-black leading-tight text-white">
                      Edit gather point
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                      Where riders meet before the host books.
                    </p>
                  </div>
                </div>

                <label className="mt-5 grid gap-2">
                  <span className="text-sm font-black text-white">Gather point</span>
                  <input
                    value={gatherPointDraft}
                    onChange={(event) => setGatherPointDraft(event.target.value)}
                    placeholder="e.g. Central Pier 7 taxi stand"
                    className="min-h-12 rounded-[14px] border border-white/12 bg-black/24 px-4 text-sm font-black text-white outline-none transition placeholder:text-[var(--rp-muted)] focus:border-cyan-300"
                  />
                  <span className="text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                    Riders should gather here before the host books.
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/10 bg-[var(--rp-shell)] p-5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGatherPointModal(false)}
                  className="min-h-12 rounded-[16px] border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-white/12"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveGatherPoint}
                  disabled={!gatherPointDraft.trim()}
                  className="min-h-12 rounded-[16px] bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] px-4 text-sm font-black text-[#061019] shadow-[0_14px_30px_rgba(56,189,248,0.22)] transition hover:brightness-105 disabled:opacity-45"
                >
                  Save
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {showBecomeBookerModal ? (
          <div className="fixed inset-0 z-[105] grid place-items-center bg-black/68 px-4 py-6 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="become-booker-title"
              className="w-full max-w-[380px] rounded-[26px] border border-cyan-200/25 bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.48)]"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/12 text-[var(--rp-primary)]">
                  <Crown className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h2 id="become-booker-title" className="text-xl font-black leading-tight text-white">Become new booker?</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                    You will take over coordination and book the ride app outside RidePod.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
                {[
                  "I can book the ride app outside RidePod.",
                  "I understand the ride fare is paid outside RidePod.",
                  "I will update riders if fare or pickup details change.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[14px] bg-black/20 px-3 py-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                    <p className="text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{item}</p>
                  </div>
                ))}
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[16px] border border-[var(--rp-primary)]/28 bg-[var(--rp-primary)]/10 p-3">
                <input
                  type="checkbox"
                  checked={becomeBookerUnderstood}
                  onChange={(event) => setBecomeBookerUnderstood(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--rp-primary)]"
                />
                <span className="text-sm font-black leading-5 text-white">
                  I understand and want to become the booker.
                </span>
              </label>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBecomeBookerModal(false);
                    setBecomeBookerUnderstood(false);
                  }}
                  className="min-h-12 rounded-[16px] border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-white/12"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBecomeBooker}
                  disabled={!becomeBookerUnderstood || !currentUserCanBecomeBooker}
                  className="min-h-12 rounded-[16px] bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] px-4 text-sm font-black text-[#061019] shadow-[0_14px_30px_rgba(56,189,248,0.22)] transition hover:brightness-105 disabled:opacity-45"
                >
                  Become booker
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {showRejoinModal ? (
          <div className="fixed inset-0 z-[105] grid place-items-center bg-black/68 px-4 py-6 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-rejoin-title"
              className="w-full max-w-[380px] rounded-[26px] border border-cyan-200/25 bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.48)]"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-cyan-200/35 bg-cyan-300/12 text-cyan-100">
                  <UserPlus className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h2 id="request-rejoin-title" className="text-xl font-black leading-tight text-white">Request to rejoin?</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                    You can request this seat again if the pod still has space. You will need to confirm ride details before the new confirm-by time.
                  </p>
                </div>
              </div>

              <p className="mt-4 rounded-[18px] border border-[var(--rp-primary)]/25 bg-[var(--rp-primary)]/10 p-4 text-sm font-black leading-6 text-[var(--rp-primary)]">
                No RidePod fee is confirmed until you confirm ride details.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejoinModal(false)}
                  className="min-h-12 rounded-[16px] border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-white/12"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={requestToRejoin}
                  disabled={!canRequestRejoin}
                  className="min-h-12 rounded-[16px] bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] px-4 text-sm font-black text-[#061019] shadow-[0_14px_30px_rgba(56,189,248,0.22)] transition hover:brightness-105 disabled:opacity-45"
                >
                  Request to rejoin
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {selectedRiderProfile ? (
          <PodStatusRiderProfileModal
            rider={selectedRiderProfile}
            onClose={() => setSelectedRiderProfile(null)}
          />
        ) : null}
      </section>
  );

  if (embedded) return statusContent;

  if (pageMode) {
    return (
      <div className="min-h-dvh bg-[#030910]" aria-labelledby="pod-status-title">
        {statusContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[95] bg-black/72 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pod-status-title">
      {statusContent}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  align = "left",
  href,
  compact = false,
  showProgress = false,
  progress = 0,
}: {
  label: string;
  value: string;
  tone: "gold" | "cyan" | "white";
  align?: "left" | "center";
  href?: string;
  compact?: boolean;
  showProgress?: boolean;
  progress?: number;
}) {
  const content = (
    <>
      <p className="text-[10px] font-semibold text-[var(--rp-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 font-black leading-tight",
          compact ? "text-[10px] tracking-[-0.02em]" : "break-words text-lg",
          href && "underline decoration-white/25 underline-offset-4",
          tone === "gold" ? "text-[var(--rp-primary)]" : tone === "cyan" ? "text-cyan-200" : "text-white",
        )}
        style={compact ? { whiteSpace: "nowrap" } : undefined}
      >
        {value}
      </p>
      {showProgress ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/14">
          <div
            className="h-full rounded-full bg-cyan-300"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : null}
    </>
  );

  return (
    <div className={cn("min-w-0 border-r border-white/10 pr-3 last:border-r-0", align === "center" && "text-center")}>
      {href ? (
        <a href={href} className="block rounded-[10px] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

function PodStatusProgressRail({ currentStep, isHost = false }: { currentStep: number; isHost?: boolean }) {
  const steps = [
    isHost ? "Share booking details" : "Host shares details",
    "Riders confirm",
    "Chat unlocks",
    "Host books ride app",
    "Enjoy your ride",
  ];

  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
      <div className="grid grid-cols-5 items-start gap-1">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const active = currentStep === stepNumber;
          const complete = currentStep > stepNumber;

          return (
            <div key={step} className="relative grid justify-items-center gap-2 text-center">
              {index > 0 ? <span className="absolute right-1/2 top-[15px] h-px w-full bg-white/12" /> : null}
              <span
                className={cn(
                  "relative z-10 grid h-8 w-8 place-items-center rounded-full border text-xs font-black",
                  active
                    ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[#07111a]"
                    : complete
                      ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
                      : "border-white/18 bg-[#07111a] text-[var(--rp-muted-strong)]",
                )}
              >
                {stepNumber}
              </span>
              <span className="text-[10px] font-semibold leading-4 text-[var(--rp-muted-strong)]">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PodStatusChecklistRow({
  icon: Icon,
  label,
  value,
  set,
  helper,
  actionLabel,
  tone = "default",
  valueLayout = "badge",
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  set: boolean;
  helper?: string;
  actionLabel?: string;
  tone?: "default" | "warning";
  valueLayout?: "badge" | "stacked";
  onClick?: () => void;
}) {
  const warning = tone === "warning";
  const stackedValue = valueLayout === "stacked";
  const content = (
    <>
      <Icon className={cn("h-4 w-4 shrink-0", warning ? "text-amber-200" : "text-[var(--rp-muted-strong)]")} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{label}</span>
        {stackedValue ? (
          <span className={cn("mt-0.5 block break-words text-sm font-black leading-5", set ? "text-white" : "text-amber-100")}>
            {value}
          </span>
        ) : null}
        {helper ? (
          <span className={cn("mt-0.5 block text-[11px] font-semibold leading-4", warning ? "text-amber-100/85" : "text-[var(--rp-muted-strong)]")}>
            {helper}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {stackedValue ? null : (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-black",
              set
                ? "border border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                : warning
                  ? "border border-amber-300/35 bg-amber-400/10 text-amber-100"
                  : "border border-white/10 bg-white/8 text-[var(--rp-muted-strong)]",
            )}
          >
            {value}
          </span>
        )}
        {actionLabel ? (
          <span className="rounded-full border border-[var(--rp-primary)]/30 bg-[var(--rp-primary)]/10 px-2.5 py-1 text-[10px] font-black text-[var(--rp-primary)]">
            {actionLabel}
          </span>
        ) : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 border-b border-white/8 py-2.5 text-left transition hover:bg-white/[0.03] first:pt-0 last:border-b-0 last:pb-0"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b border-white/8 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      {content}
    </div>
  );
}

function PodStatusMetric({ value, label, tone = "cyan" }: { value: string | number; label: string; tone?: "cyan" | "gold" | "rose" | "green" }) {
  const toneClass =
    tone === "gold"
      ? "text-[var(--rp-primary)]"
      : tone === "rose"
        ? "text-rose-200"
        : tone === "green"
          ? "text-emerald-200"
          : "text-cyan-200";

  return (
    <div className="flex min-h-[82px] flex-col items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] p-3 text-center">
      <p className={cn("w-full text-center text-xl font-black leading-none", toneClass)}>{value}</p>
      <p className="mt-1 block w-full text-center text-[8px] font-black uppercase leading-[10px] tracking-[0.02em] text-[var(--rp-muted-strong)]">{label}</p>
    </div>
  );
}

function CompactRideAppRoutePanel({
  ride,
  canRequestStop = false,
  canReviewStop = false,
  onRequestStop,
  onApproveStop,
  onDeclineStop,
}: {
  ride: HomeRide;
  canRequestStop?: boolean;
  canReviewStop?: boolean;
  onRequestStop?: (stopLabel: string) => void;
  onApproveStop?: (stop: RoutePlanStop) => void;
  onDeclineStop?: (stop: RoutePlanStop) => void;
}) {
  const [stopRequestDraft, setStopRequestDraft] = useState("");
  const routeRequests = getNormalizedRouteRequests(ride);
  const pendingRequest = routeRequests.pending[0] ?? null;
  const pendingStop = pendingRequest ? routeRequestToRoutePlanStop(pendingRequest) : null;
  const approvedStops = routeRequests.approved.map(routeRequestToRoutePlanStop);
  const declinedRequest = routeRequests.declined[0] ?? null;
  const declinedStop = declinedRequest ? routeRequestToRoutePlanStop(declinedRequest) : null;
  const allowStopRequests = isHostApprovedStopPolicy(ride.stopRequestPolicy) && ride.rideKind !== "recurring";
  const routeLocked =
    ride.bookingDetailsShared === true ||
    ride.rideAppBookingDetailsConfirmed === true ||
    ride.rideAppBookingDetailsFinalized === true;
  const canShowStopRequestForm =
    allowStopRequests &&
    canRequestStop &&
    Boolean(onRequestStop) &&
    !routeLocked &&
    !pendingStop &&
    approvedStops.length === 0;
  const canShowHostReviewActions = Boolean(canReviewStop && pendingStop && !routeLocked && onApproveStop && onDeclineStop);
  const stopRequestTitle = pendingStop
    ? "Stop request pending"
      : declinedStop
        ? "Stop request declined"
        : approvedStops.length
          ? "Approved stop included"
          : canShowStopRequestForm
            ? "Request a stop"
            : allowStopRequests
              ? "No stop requested"
              : routeLocked
                ? "Route locked"
                : "Direct route only";
  const stopRequestBody = pendingStop
    ? `${pendingStop.label} is waiting for host approval.`
    : declinedStop
      ? `${declinedStop.label} was declined. Route remains direct.`
      : approvedStops.length
        ? `${approvedStops[0].label} is included in the current route.`
        : routeLocked
          ? "Route changes are closed after booking details are confirmed."
        : allowStopRequests
          ? canShowStopRequestForm
            ? "Ask the host to approve one extra stop before booking details are shared."
            : "No rider has requested an extra stop yet."
          : "This pod does not allow extra stop requests.";
  const trimmedStopRequest = stopRequestDraft.trim();
  const gatherVenue = ride.pickupLabel ?? "Host will set gather point";
  const gatherArea = ride.pickupLabel ? ride.fromLabel : "Where riders meet before booking";
  const routeRows = [
    {
      id: "gather",
      dotClass: "bg-cyan-300",
      label: "Gather",
      title: gatherVenue,
      helper: gatherArea,
    },
    {
      id: "pickup",
      dotClass: "bg-emerald-300",
      label: "From",
      title: ride.fromLabel,
      helper: null,
    },
    ...approvedStops.map((stop, index) => ({
      id: stop.id,
      dotClass: "bg-[var(--rp-primary)]",
      label: `Stop ${index + 1}`,
      title: stop.label,
      helper: stop.requestedBy ? `Requested by ${stop.requestedBy}` : null,
    })),
    {
      id: "dropoff",
      dotClass: "bg-rose-300",
      label: "To",
      title: ride.dropoffLabel ?? ride.toLabel,
      helper: ride.dropoffLabel ? ride.toLabel : null,
    },
  ];

  function submitStopRequest() {
    if (!canShowStopRequestForm || !trimmedStopRequest) return;
    onRequestStop?.(trimmedStopRequest);
    setStopRequestDraft("");
  }

  return (
    <div id="route-requests" className="scroll-mt-24 grid gap-2">
      <section className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
        <ol className="grid gap-0">
          {routeRows.map((row, index) => {
            const last = index === routeRows.length - 1;

            return (
              <li key={row.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
                <span className="grid justify-items-center">
                  <span className={cn("mt-1.5 h-3 w-3 rounded-full", row.dotClass)} />
                  {!last ? <span className="h-full min-h-10 border-l border-dashed border-white/24" /> : null}
                </span>
                <span className={cn("min-w-0", !last && "pb-3")}>
                  <span className="block text-[10px] font-semibold leading-4 text-[var(--rp-muted-strong)]">{row.label}</span>
                  <span className="block break-words text-sm font-black leading-5 text-white">{row.title}</span>
                  {row.helper ? (
                    <span className="mt-0.5 block break-words text-xs font-semibold leading-4 text-[var(--rp-muted-strong)]">
                      {row.helper}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Stop requests</p>
        <div className="mt-3 flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-white/10 bg-black/20 text-[var(--rp-muted-strong)]">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className={cn("text-sm font-black", canShowStopRequestForm ? "text-[var(--rp-primary)]" : "text-white")}>
              {stopRequestTitle}
            </h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{stopRequestBody}</p>
            {canShowHostReviewActions && pendingStop ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onDeclineStop?.(pendingStop)}
                  className="min-h-10 rounded-[14px] border border-white/12 bg-white/8 px-3 text-xs font-black text-white transition hover:bg-white/12"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => onApproveStop?.(pendingStop)}
                  className="min-h-10 rounded-[14px] bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] px-3 text-xs font-black text-[#061019] shadow-[0_12px_24px_rgba(56,189,248,0.18)] transition hover:brightness-105"
                >
                  Approve stop
                </button>
              </div>
            ) : null}
            {canShowStopRequestForm ? (
              <form
                className="mt-3 grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitStopRequest();
                }}
              >
                <label className="sr-only" htmlFor={`stop-request-${ride.id}`}>
                  Stop location
                </label>
                <input
                  id={`stop-request-${ride.id}`}
                  value={stopRequestDraft}
                  onChange={(event) => setStopRequestDraft(event.target.value)}
                  placeholder="e.g. Admiralty Station Exit A"
                  className="min-h-11 rounded-[14px] border border-cyan-300/22 bg-black/24 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-[var(--rp-muted-strong)] focus:border-cyan-300/55 focus:bg-cyan-300/8"
                />
                <button
                  type="submit"
                  disabled={!trimmedStopRequest}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-cyan-300/35 bg-cyan-300/10 px-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/16 disabled:opacity-45"
                >
                  <MapPin className="h-4 w-4" />
                  Send request
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SelfSettlePodSummaryHero({
  ride,
  seatsUsed,
  estimateLabel,
  estimateValue,
  estimateUpdated,
  canUpdateEstimate,
  onEstimateClick,
  onManageActionsClick,
  hasFareProof,
  onViewFareProof,
  onSharePod,
  onJoinRide,
  onLeaveRide,
  onCancelPodClick,
}: {
  ride: HomeRide;
  seatsUsed: number;
  estimateLabel: string;
  estimateValue: string;
  estimateUpdated: boolean;
  canUpdateEstimate: boolean;
  onEstimateClick: () => void;
  onManageActionsClick: () => void;
  hasFareProof: boolean;
  onViewFareProof: () => void;
  onSharePod: () => void;
  onJoinRide: () => void;
  onLeaveRide: () => void;
  onCancelPodClick: () => void;
}) {
  const chatAccess = getRideAppChatAccessState(ride);
  const summaryRiders = buildPodStatusRiders(ride);
  const summaryCurrentDetailVersion = getRideAppCurrentDetailVersion(ride);
  const summaryExpiredSeatHoldCount = summaryRiders.filter((item) => item.role === "rider" && item.status === "seat_hold_expired").length;
  const summaryEffectiveSeatsUsed = Math.max(0, Math.max(seatsUsed, ride.seatsUsed) - summaryExpiredSeatHoldCount);
  const summaryProgress = Math.min((summaryEffectiveSeatsUsed / ride.seatsTotal) * 100, 100);
  const summaryUserIsHost = getCurrentUserIsHost(ride);
  const summaryUserHadRideAppSeat =
    !summaryUserIsHost &&
    (ride.currentUserJoined === true ||
      ride.currentUserRole === "joined_rider" ||
      ride.quoteStatus === "joined" ||
      ride.currentUserJoinIntentStatus === "joined_interest" ||
      ride.currentUserJoinIntentStatus === "confirmed" ||
      ride.currentUserJoinIntentStatus === "needs_review" ||
      ride.currentUserJoinIntentStatus === "seat_hold_expired");
  const summaryUserConfirmed =
    ride.currentUserBookingDetailsConfirmed === true ||
    ride.selfSettleConfirmationStatus === "confirmed" ||
    summaryRiders.some((item) => item.role === "rider" && item.name.toLowerCase().includes("you") && isPodStatusRiderConfirmedForCurrentDetails(item, summaryCurrentDetailVersion));
  const summaryStatusContext = {
    currentUserSeatHoldExpired:
      summaryUserHadRideAppSeat &&
      !summaryUserConfirmed &&
      (ride.currentUserConfirmationExpired === true || ride.currentUserJoinIntentStatus === "seat_hold_expired" || isRideAppSeatHoldExpired(ride)),
    currentUserViewingFullPod: !summaryUserIsHost && !summaryUserHadRideAppSeat && summaryEffectiveSeatsUsed >= ride.seatsTotal,
    currentUserWaitingForHostDetails:
      summaryUserHadRideAppSeat &&
      !summaryUserConfirmed &&
      !chatAccess.canAccess &&
      (ride.rideAppBookingDetailsFinalized !== true ||
        chatAccess.reason === "waiting_for_fare_update" ||
        chatAccess.reason === "waiting_for_host_acceptance" ||
        chatAccess.reason === "waiting_for_gather_point" ||
        chatAccess.reason === "waiting_for_booking_details"),
  };
  const statusTitle = getPodStatusTitle(ride, chatAccess, summaryStatusContext);
  const statusSubtitle = getPodStatusSubtitle(ride, chatAccess, summaryStatusContext);
  const hostProfileImageUrl = getHostProfileImageUrl(ride);
  const hostAvatarPreference = ride.hostAvatarPreference ?? null;
  const hostAvatarDisplayName = ride.hostDisplayName?.trim() || ride.hostName || "Host";
  const hostAvatarLabel = canUpdateEstimate ? "You" : getInitials(ride.hostName || "Host").slice(0, 1);
  const hostBadgeLabel = canUpdateEstimate ? "You are hosting" : ride.hostName || "New host";
  const canJoinRide = getCurrentUserCanJoinSelfSettlePod(ride, "quote_pending");
  const rejoinRestriction = getRideAppRejoinRestrictionCopy(ride, ride.seatsUsed < ride.seatsTotal);
  const hostEstimateUpdated = canUpdateEstimate && estimateUpdated;
  const canLeaveRideFromHero = summaryUserHadRideAppSeat && !summaryUserIsHost;
  const displayEstimateLabel = hostEstimateUpdated ? "Updated estimate" : canUpdateEstimate ? "Your estimate" : estimateLabel;
  const minimumRidersToGoLabel = getRideAppMinimumRidersToGoLabel(ride);
  const hostCancellationStatus = getRideAppHostCancellationStatus(ride);
  const hostCancellationActive = hostCancellationStatus !== "active";
  const estimateActionLabel = "Edit";
  const manageActionsPendingCount = getManagePodActionsPendingCount(ride);
  const noticeBadgeClass =
    "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-rose-300/35 bg-rose-400/12 px-1.5 text-[11px] font-black leading-none text-rose-200";
  const estimateContent = (
    <>
      <p className="w-full whitespace-nowrap text-center text-[12px] font-semibold text-[var(--rp-muted-strong)]">{displayEstimateLabel}</p>
      <p className={cn("mt-1 w-full whitespace-nowrap text-center font-black leading-tight text-[var(--rp-primary)]", estimateUpdated ? "text-2xl" : "text-sm")}>
        {estimateValue}
      </p>
    </>
  );

  return (
    <section className="grid gap-4">
      <div className="relative overflow-hidden rounded-[24px] border border-cyan-100/20 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.1),transparent_34%),linear-gradient(145deg,rgba(13,24,39,0.96),rgba(3,10,18,0.98))] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_38%)]" />
        <div className="relative grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3">
          <div className="grid justify-items-center">
            <span
              className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-[var(--rp-primary)]/55 bg-[var(--rp-primary)]/8 bg-cover bg-center text-2xl font-black text-[var(--rp-primary)] shadow-[0_14px_32px_rgba(0,0,0,0.28)]"
              style={!hostAvatarPreference && hostProfileImageUrl ? { backgroundImage: `url(${hostProfileImageUrl})` } : undefined}
              aria-label={`${hostAvatarDisplayName} profile`}
            >
              {hostAvatarPreference ? (
                <RidePodAvatar
                  avatarUrl={hostProfileImageUrl}
                  avatarPreference={hostAvatarPreference}
                  initials={getInitials(hostAvatarDisplayName) || hostAvatarLabel}
                  displayName={hostAvatarDisplayName}
                  className="h-full w-full rounded-full text-xl"
                />
              ) : hostProfileImageUrl ? null : (
                hostAvatarLabel
              )}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {canLeaveRideFromHero ? (
                <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-300/45 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-cyan-100">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Joined by you
                </span>
              ) : null}
              <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--rp-primary)]/45 bg-[var(--rp-primary)]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--rp-primary)]">
                <Crown className="h-3.5 w-3.5 shrink-0" />
                {hostBadgeLabel}
              </span>
              <span className="shrink-0 rounded-full border border-cyan-300/45 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-cyan-200">
                Self-settle
              </span>
            </div>
            <h2 className="mt-3 text-xl font-black leading-tight text-white">
              {ride.fromLabel} {"→"} {ride.toLabel}
            </h2>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">
              Created by {hostAvatarDisplayName}
            </p>
          </div>
          <span className="flex shrink-0 items-start justify-end gap-2">
            <Link
              href={`/pods/${ride.id}/chat`}
              aria-label="Open pod chat"
              className="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/35 bg-cyan-300/8 text-cyan-100 shadow-[0_8px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-300/14"
            >
              <MessagesSquare className="h-[18px] w-[18px]" />
            </Link>
            <button
              type="button"
              onClick={onSharePod}
              aria-label="Share pod"
              className="grid h-10 w-10 place-items-center rounded-full border border-cyan-200/35 bg-cyan-300/8 text-cyan-100 shadow-[0_8px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-300/14"
            >
              <Share2 className="h-[18px] w-[18px]" />
            </button>
          </span>
        </div>

        <div className="relative mt-4 grid grid-cols-[1.18fr_1.05fr_0.85fr] overflow-hidden rounded-[16px] border border-cyan-100/14 bg-white/[0.035] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] min-[390px]:grid-cols-3">
          <div className="grid min-w-0 grid-cols-[18px_minmax(0,1fr)] items-center gap-1 border-r border-white/10 px-2 py-3 min-[390px]:grid-cols-[22px_minmax(0,1fr)] min-[390px]:gap-2 min-[390px]:px-3">
            <CalendarDays className="h-[18px] w-[18px] shrink-0 text-[var(--rp-muted-strong)] min-[390px]:h-5 min-[390px]:w-5" />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-[11px] font-semibold leading-[13px] text-white min-[390px]:text-[13px] min-[390px]:leading-4">{ride.dateLabel}</span>
              <span className="block whitespace-nowrap text-[11px] font-black leading-[13px] text-cyan-200 min-[390px]:text-[13px] min-[390px]:leading-4">{ride.timeLabel}</span>
            </span>
          </div>
          <div className="min-w-0 border-r border-white/10 px-2.5 py-3">
            <span className="flex min-w-0 items-center gap-2">
              <UserRound className="h-5 w-5 shrink-0 text-[var(--rp-muted-strong)]" />
              <span className="block whitespace-nowrap text-lg font-black leading-5 text-cyan-100">{summaryEffectiveSeatsUsed} / {ride.seatsTotal}</span>
            </span>
            <span className="mt-0.5 block whitespace-nowrap text-[9px] font-black leading-4 text-[var(--rp-primary)] min-[390px]:text-[10px]">
              {minimumRidersToGoLabel}
            </span>
            <span className="mt-1.5 block h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-white/14">
              <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${summaryProgress}%` }} />
            </span>
          </div>
          <div className="grid min-w-0 grid-cols-[22px_minmax(0,1fr)] items-center gap-2 px-3 py-3">
            <Car className="h-5 w-5 shrink-0 text-[var(--rp-muted-strong)]" />
            <span className="min-w-0">
              <span className="block truncate text-base font-black leading-5 text-white">{getPodStatusVehicleLabel(ride)}</span>
              <span className="block text-[11px] font-semibold leading-4 text-[var(--rp-muted-strong)]">Ride type</span>
            </span>
          </div>
        </div>

        <div
          className={cn(
            "relative mt-4 grid gap-3",
            canUpdateEstimate || canLeaveRideFromHero ? "grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] max-[360px]:grid-cols-1" : "grid-cols-1",
          )}
        >
          {summaryUserIsHost ? (
            <button
              type="button"
              onClick={onEstimateClick}
              disabled={!canUpdateEstimate || hostCancellationActive}
              className="grid min-h-[124px] justify-items-center rounded-[16px] border border-cyan-300/24 bg-cyan-300/8 px-3 py-4 text-center transition hover:border-cyan-200/40 hover:bg-cyan-300/12 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {estimateContent}
              <span className="mx-auto mt-3 inline-flex min-h-8 max-w-full items-center justify-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-cyan-100">
                <WalletCards className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{estimateActionLabel}</span>
              </span>
            </button>
          ) : hasFareProof ? (
            <div className="grid min-h-[124px] justify-items-center rounded-[16px] border border-cyan-300/18 bg-cyan-300/6 px-4 py-4 text-center">
              {estimateContent}
              <button
                type="button"
                onClick={onViewFareProof}
                className="mt-3 inline-flex min-h-8 w-fit items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 text-[11px] font-black text-cyan-100 transition hover:bg-cyan-300/16"
              >
                View
              </button>
            </div>
          ) : (
            <a href="#fare-split" className="grid min-h-[124px] justify-items-center rounded-[16px] border border-cyan-300/18 bg-cyan-300/6 px-4 py-4 text-center transition hover:brightness-110">
              {estimateContent}
            </a>
          )}

          {canUpdateEstimate ? (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={onManageActionsClick}
                className="inline-flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-[14px] border border-[var(--rp-primary)]/55 bg-[var(--rp-primary)]/10 px-2 text-xs font-black text-[var(--rp-primary)] shadow-[0_10px_24px_rgba(242,193,91,0.1)] transition hover:bg-[var(--rp-primary)]/15 min-[390px]:gap-2 min-[390px]:text-[13px]"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="whitespace-nowrap">Manage pod actions</span>
                {manageActionsPendingCount > 0 ? (
                  <span className={noticeBadgeClass}>{manageActionsPendingCount}</span>
                ) : null}
              </button>
              <Link
                href={`/pods/${ride.id}/status`}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/8 px-3 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-white/12 hover:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                View status
              </Link>
              <button
                type="button"
                onClick={onCancelPodClick}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-rose-300/35 bg-rose-500/10 px-3 text-sm font-black text-rose-100 transition hover:bg-rose-500/16"
              >
                <X className="h-4 w-4" />
                Cancel pod
              </button>
            </div>
          ) : canLeaveRideFromHero ? (
            <div className="grid gap-3">
              <Link
                href={`/pods/${ride.id}/status`}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/8 px-3 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-white/12 hover:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                View status
              </Link>
              <button
                type="button"
                onPointerUp={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onLeaveRide();
                }}
                onClick={onLeaveRide}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-rose-300/35 bg-rose-500/10 px-3 text-sm font-black text-rose-100 transition hover:bg-rose-500/16"
              >
                <X className="h-4 w-4" />
                Leave Pod
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {canUpdateEstimate || canLeaveRideFromHero ? null : canJoinRide ? (
        <button
          type="button"
          onClick={onJoinRide}
          className="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-[22px] border border-[var(--rp-primary)]/70 bg-[linear-gradient(90deg,rgba(242,193,91,0.16),rgba(3,10,18,0.92))] p-4 text-left shadow-[0_16px_42px_rgba(0,0,0,0.28)] transition hover:bg-[linear-gradient(90deg,rgba(242,193,91,0.2),rgba(3,10,18,0.92))]"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/10 text-cyan-100">
            <UserPlus className="h-7 w-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-black text-white">Join Ride</span>
            <span className="mt-1 block text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
              Hold your seat before reviewing booking details.
            </span>
          </span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-primary)]/40 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]">
            <ArrowRight className="h-6 w-6 stroke-[3]" />
          </span>
        </button>
      ) : rejoinRestriction ? (
        <a
          href={rejoinRestriction.kind === "full" ? "/home" : `/pods/${ride.id}/status`}
          className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-[22px] border border-[var(--rp-primary)]/70 bg-[linear-gradient(90deg,rgba(242,193,91,0.13),rgba(3,10,18,0.92))] p-4 shadow-[0_16px_42px_rgba(0,0,0,0.28)]"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-[var(--rp-primary)]/40 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]">
            <Clock3 className="h-7 w-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-black text-white">{rejoinRestriction.cta}</span>
            <span className="mt-1 block text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">
              {rejoinRestriction.helper}
            </span>
          </span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-primary)]/40 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]">
            <ArrowRight className="h-6 w-6 stroke-[3]" />
          </span>
        </a>
      ) : (
        <a
          href={`/pods/${ride.id}/status`}
          className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-[22px] border border-[var(--rp-primary)]/70 bg-[linear-gradient(90deg,rgba(242,193,91,0.16),rgba(3,10,18,0.92))] p-4 shadow-[0_16px_42px_rgba(0,0,0,0.28)]"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/10 text-cyan-100">
            <UsersRound className="h-7 w-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-black text-white">{statusTitle}</span>
            <span className="mt-1 block text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">{statusSubtitle}</span>
          </span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--rp-primary)]/40 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]">
            <ArrowRight className="h-6 w-6 stroke-[3]" />
          </span>
        </a>
      )}
    </section>
  );
}

function ManagePodActionsModal({
  ride,
  initialTab = "confirmations",
  onClose,
  onApproveStop,
  onDeclineStop,
}: {
  ride: HomeRide;
  initialTab?: ManagePodActionsTab;
  onClose: () => void;
  onApproveStop: (stop: RoutePlanStop) => void;
  onDeclineStop: (stop: RoutePlanStop) => void;
}) {
  const allowStopRequests = isHostApprovedStopPolicy(ride.stopRequestPolicy) && ride.rideKind !== "recurring";
  const [activeTab, setActiveTab] = useState<ManagePodActionsTab>(
    !allowStopRequests && initialTab === "route_requests" ? "confirmations" : initialTab,
  );
  const [actionNote, setActionNote] = useState<string | null>(null);
  const riders = buildManagePodActionRiders(ride);
  const riderRows = riders.filter((item) => item.role === "rider");
  const currentDetailVersion = getRideAppCurrentDetailVersion(ride);
  const confirmedRiderCount = riderRows.filter((item) => isPodStatusRiderConfirmedForCurrentDetails(item, currentDetailVersion)).length;
  const riderTotal = riderRows.length;
  const pendingConfirmationRiders = riderRows.filter((item) => item.status === "pending" || item.status === "joined_interest");
  const needsReviewRiders = riderRows.filter((item) => item.status === "needs_review" || item.status === "review_needed");
  const ridersNeedingReviewCount = needsReviewRiders.length;
  const expiredSeatHoldCount = riders.filter((item) => item.role === "rider" && item.status === "seat_hold_expired").length;
  const confirmByLabel = formatConfirmByLabel(getRideAppConfirmByDate(ride));
  const routeRequests = getNormalizedRouteRequests(ride);
  const pendingRequest = routeRequests.pending[0] ?? null;
  const approvedRequest = routeRequests.approved[0] ?? null;
  const declinedRequest = routeRequests.declined[0] ?? null;
  const pendingStop = pendingRequest ? routeRequestToRoutePlanStop(pendingRequest) : null;
  const approvedStop = approvedRequest ? routeRequestToRoutePlanStop(approvedRequest) : null;
  const declinedStop = declinedRequest ? routeRequestToRoutePlanStop(declinedRequest) : null;
  const routeLocked =
    ride.bookingDetailsShared === true ||
    ride.rideAppBookingDetailsConfirmed === true ||
    ride.rideAppBookingDetailsFinalized === true;
  const tabs: Array<{ id: ManagePodActionsTab; label: string }> = [
    { id: "confirmations", label: "Confirmations" },
    ...(allowStopRequests ? [{ id: "route_requests" as const, label: "Route requests" }] : []),
  ];

  function approvePendingStop() {
    if (!pendingStop || routeLocked) return;
    onApproveStop(pendingStop);
    setActionNote("Updated booking details. Riders need to review again.");
  }

  function declinePendingStop() {
    if (!pendingStop || routeLocked) return;
    onDeclineStop(pendingStop);
    setActionNote("Stop declined.");
  }

  return (
    <div
      className="fixed inset-0 z-[110] grid items-end bg-black/72 px-3 pb-3 pt-10 backdrop-blur-sm min-[520px]:place-items-center min-[520px]:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-pod-actions-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(11,22,32,0.98),rgba(3,9,16,0.98))] text-[var(--rp-text)] shadow-[0_28px_90px_rgba(0,0,0,0.58)] min-[520px]:rounded-[28px]">
        <header className="border-b border-white/10 p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="manage-pod-actions-title" className="text-2xl font-black leading-tight text-white">
                Manage pod actions
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {allowStopRequests
                  ? "Review rider confirmations and route requests."
                  : "Review rider confirmations."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close manage pod actions"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 bg-white/8 text-[var(--rp-muted-strong)] transition hover:bg-white/12 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {tabs.length > 1 ? (
            <div className={cn("mt-4 grid rounded-[16px] border border-white/10 bg-black/22 p-1", tabs.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setActionNote(null);
                  }}
                  aria-pressed={activeTab === tab.id}
                  className={cn(
                    "min-h-10 rounded-[12px] px-2 text-center text-[11px] font-black transition min-[390px]:px-3 min-[390px]:text-xs",
                    activeTab === tab.id
                      ? "bg-[var(--rp-primary)] text-[#07111a] shadow-[0_10px_20px_rgba(242,193,91,0.18)]"
                      : "text-white/85 hover:bg-white/8 hover:text-white",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === "confirmations" ? (
            <div className="grid gap-4">
              <section className="rounded-[18px] border border-cyan-300/22 bg-cyan-300/8 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-black text-white">Confirmations</h3>
                  <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                    {confirmedRiderCount} / {riderTotal} riders confirmed
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ridersNeedingReviewCount > 0 ? (
                    <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">
                      {ridersNeedingReviewCount} {ridersNeedingReviewCount === 1 ? "rider needs" : "riders need"} review
                    </span>
                  ) : null}
                  {expiredSeatHoldCount > 0 ? (
                    <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">
                      {expiredSeatHoldCount} seat hold {expiredSeatHoldCount === 1 ? "expired" : "expired"}
                    </span>
                  ) : null}
                  {pendingConfirmationRiders.length === 0 && needsReviewRiders.length === 0 && expiredSeatHoldCount === 0 ? (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">
                      All clear
                    </span>
                  ) : null}
                </div>
              </section>

              {pendingConfirmationRiders.length ? (
                <ManagePodRiderGroup
                  title="Pending confirmation"
                  riders={pendingConfirmationRiders}
                  getHelper={() => `Confirm by ${confirmByLabel}`}
                />
              ) : null}

              {needsReviewRiders.length ? (
                <ManagePodRiderGroup
                  title="Needs review"
                  riders={needsReviewRiders}
                  getHelper={() => "Review updated details"}
                />
              ) : null}

              {!pendingConfirmationRiders.length && !needsReviewRiders.length ? (
                <section className="rounded-[18px] border border-emerald-300/24 bg-emerald-400/10 p-4">
                  <h3 className="text-base font-black text-emerald-100">All required riders have confirmed.</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-emerald-100/85">
                    Confirm-by deadline is active for any future detail changes.
                  </p>
                </section>
              ) : null}

              <section className="grid gap-2">
                <Link
                  href={`/pods/${ride.id}/status#fare-split`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/10 px-4 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-primary)]/15"
                >
                  <Clock3 className="h-4 w-4" />
                  Edit confirm-by time
                </Link>
                <Link
                  href={`/pods/${ride.id}/status?tab=riders`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-white/12"
                >
                  <BarChart3 className="h-4 w-4" />
                  View confirmations
                </Link>
              </section>
            </div>
          ) : activeTab === "route_requests" ? (
            <div className="grid gap-4">
              <RouteRequestsActionContent
                allowStopRequests={allowStopRequests}
                pendingStop={pendingStop}
                approvedStop={approvedStop}
                declinedStop={declinedStop}
                routeLocked={routeLocked}
                onApprove={approvePendingStop}
                onDecline={declinePendingStop}
              />
            </div>
          ) : null}

        </div>
        {actionNote ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-30 flex justify-center">
            <div className="pointer-events-auto flex w-full max-w-[360px] items-center justify-between gap-3 rounded-[16px] border border-cyan-300/35 bg-[#082533] px-4 py-3 text-cyan-100 shadow-[0_16px_42px_rgba(0,0,0,0.42)]">
              <p className="min-w-0 text-sm font-black leading-5">{actionNote}</p>
              <button
                type="button"
                onClick={() => setActionNote(null)}
                aria-label="Dismiss notification"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-cyan-300/24 bg-black/18 text-cyan-100 transition hover:bg-cyan-300/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ManagePodActionStatusChip({ rider, labelOverride }: { rider: PodStatusRider; labelOverride?: string }) {
  const label =
    labelOverride ??
    (rider.role === "host"
      ? "Host"
      : rider.status === "confirmed"
        ? "Confirmed"
        : rider.status === "needs_review" || rider.status === "review_needed"
          ? "Needs review"
          : rider.status === "seat_hold_expired"
            ? getSeatHoldDisplayLabel(rider.status)
            : rider.status === "left_pod"
              ? "Left"
              : isOpenRiderSlot(rider)
                ? "Waiting"
                : "Pending");
  const tone =
    rider.role === "host"
      ? "border-[var(--rp-primary)]/45 bg-[var(--rp-primary)]/10 text-[var(--rp-primary)]"
      : rider.status === "confirmed"
        ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
        : rider.status === "needs_review" || rider.status === "review_needed" || rider.status === "seat_hold_expired"
          ? "border-amber-300/35 bg-amber-400/10 text-amber-100"
          : "border-cyan-300/22 bg-cyan-300/8 text-cyan-100";

  return (
    <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black", tone)}>
      {label}
    </span>
  );
}

function ManagePodRiderGroup({
  title,
  riders,
  getHelper,
}: {
  title: string;
  riders: PodStatusRider[];
  getHelper: (rider: PodStatusRider) => string;
}) {
  return (
    <section className="grid gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
      <h3 className="text-base font-black text-white">{title}</h3>
      <div className="grid gap-2">
        {riders.map((rider) => (
          <div key={`${title}-${rider.name}-${rider.status}`} className="flex min-w-0 items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-black/18 p-3">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">
                {getInitials(rider.name).slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-white">{rider.name}</span>
                <span className="block text-xs font-semibold text-[var(--rp-muted-strong)]">{getHelper(rider)}</span>
              </span>
            </span>
            <ManagePodActionStatusChip rider={rider} />
          </div>
        ))}
      </div>
    </section>
  );
}

function RouteRequestsActionContent({
  allowStopRequests,
  pendingStop,
  approvedStop,
  declinedStop,
  routeLocked,
  onApprove,
  onDecline,
}: {
  allowStopRequests: boolean;
  pendingStop: RoutePlanStop | null;
  approvedStop: RoutePlanStop | null;
  declinedStop: RoutePlanStop | null;
  routeLocked: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  if (!allowStopRequests) {
    return (
      <section className="rounded-[18px] border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Route requests</p>
        <h3 className="mt-2 text-xl font-black text-white">Direct route only</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          This pod does not allow extra stop requests.
        </p>
      </section>
    );
  }

  if (routeLocked && pendingStop) {
    return (
      <RouteRequestsStateCard
        title="Route locked"
        body="Route changes are closed after booking details are confirmed."
        stop={pendingStop}
      />
    );
  }

  if (pendingStop) {
    return (
      <section className="grid gap-4 rounded-[18px] border border-cyan-300/22 bg-cyan-300/8 p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Route requests</p>
          <h3 className="mt-2 text-xl font-black text-white">Stop request pending</h3>
        </div>
        <dl className="grid gap-3">
          <RouteRequestRow label="Requested by" value={pendingStop.requestedBy ?? "Rider"} />
          <RouteRequestRow label="Stop location" value={pendingStop.label} />
          <RouteRequestRow label="Reason" value={pendingStop.reason ?? "Easier pickup for me"} />
          <RouteRequestRow label="Status" value="Pending host approval" />
        </dl>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="min-h-12 rounded-[16px] border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-white/12"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="min-h-12 rounded-[16px] bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] px-4 text-sm font-black text-[#061019] shadow-[0_14px_30px_rgba(56,189,248,0.22)] transition hover:brightness-105"
          >
            Approve stop
          </button>
        </div>
      </section>
    );
  }

  if (approvedStop) {
    return (
      <RouteRequestsStateCard
        title="Stop approved"
        body="Updated booking details. Riders need to review again."
        stop={approvedStop}
        tone="approved"
      />
    );
  }

  if (declinedStop) {
    return (
      <RouteRequestsStateCard
        title="Stop declined"
        body="Route remains direct."
        stop={declinedStop}
      />
    );
  }

  return (
    <section className="rounded-[18px] border border-white/10 bg-white/[0.04] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Route requests</p>
      <h3 className="mt-2 text-xl font-black text-white">No route requests</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
        No riders have requested an extra stop.
      </p>
    </section>
  );
}

function RouteRequestsStateCard({
  title,
  body,
  stop,
  tone = "default",
}: {
  title: string;
  body: string;
  stop?: RoutePlanStop | null;
  tone?: "default" | "approved";
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border p-5",
        tone === "approved"
          ? "border-emerald-300/24 bg-emerald-400/10"
          : "border-white/10 bg-white/[0.04]",
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Route requests</p>
      <h3 className="mt-2 text-xl font-black text-white">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{body}</p>
      {stop ? (
        <dl className="mt-4 grid gap-3">
          <RouteRequestRow label="Requested by" value={stop.requestedBy ?? "Rider"} />
          <RouteRequestRow label="Stop location" value={stop.label} />
          <RouteRequestRow label="Reason" value={stop.reason ?? "Easier pickup for me"} />
          <RouteRequestRow label="Status" value={title} />
        </dl>
      ) : null}
    </section>
  );
}

function RouteRequestRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-black/20 p-3">
      <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-black leading-5 text-white">{value}</dd>
    </div>
  );
}

function JoinedPodModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/64 px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="joined-pod-title"
        className="w-full max-w-[360px] rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-center shadow-[0_28px_80px_rgba(0,0,0,0.44)]"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-200/35 bg-emerald-300/12 text-emerald-200">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 id="joined-pod-title" className="mt-4 text-2xl font-black text-[var(--rp-text)]">
          You joined this pod
        </h2>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-5 min-h-12 w-full rounded-[16px] bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] px-5 text-base font-black text-[#07111a] shadow-[0_14px_30px_rgba(242,193,91,0.28)] transition hover:brightness-105"
        >
          Confirm
        </button>
      </section>
    </div>
  );
}

export function NormalPodDetailPage({ ride: baseRide }: { ride: HomeRide }) {
  const { user, profile } = useAuth();
  const [selfSettleLeft, setSelfSettleLeft] = useState(false);
  const storedRide = getRideWithStoredSelfSettleJoin(
    selfSettleLeft && isRideAppSelfSettlePod(baseRide) ? getSelfSettleRideAfterLeave(baseRide) : baseRide,
  );
  const personaRide = selfSettleLeft ? storedRide : applyRideAppDemoPersona(storedRide, { profile, user });
  const storedRideAppFareProof = getRideAppFareEstimateProof(storedRide);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("trip");
  const [showJoinedModal, setShowJoinedModal] = useState(false);
  const [showLockSeatModal, setShowLockSeatModal] = useState(false);
  const [showSelfSettleJoinModal, setShowSelfSettleJoinModal] = useState(false);
  const [showSelfSettleJoinSuccessModal, setShowSelfSettleJoinSuccessModal] = useState(false);
  const [showLeaveSelfSettleModal, setShowLeaveSelfSettleModal] = useState(false);
  const [showRideAppEstimateModal, setShowRideAppEstimateModal] = useState(false);
  const [showRideAppFareProofModal, setShowRideAppFareProofModal] = useState(false);
  const [showManagePodActionsModal, setShowManagePodActionsModal] = useState(false);
  const [hostCancellationModalConfirmedCount, setHostCancellationModalConfirmedCount] = useState<number | null>(null);
  const [hostCancellationChoice, setHostCancellationChoice] = useState<"step_down" | "cancel_everyone">("step_down");
  const [hostCancellationReason, setHostCancellationReason] = useState<string>(beforeConfirmationCancellationReasons[0]?.value ?? "Plans changed");
  const [rideActionPatch, setRideActionPatch] = useState<Partial<HomeRide> | null>(null);
  const [rideAppTotalEstimateOverride, setRideAppTotalEstimateOverride] = useState<string | null>(null);
  const [rideAppEstimateDraft, setRideAppEstimateDraft] = useState("");
  const [rideAppEstimateError, setRideAppEstimateError] = useState<string | null>(null);
  const [rideAppEstimateScreenshotName, setRideAppEstimateScreenshotName] = useState<string | null>(
    () => storedRideAppFareProof?.fileName ?? null,
  );
  const [rideAppEstimateScreenshotPreviewUrl, setRideAppEstimateScreenshotPreviewUrl] = useState<string | null>(
    () => storedRideAppFareProof?.previewUrl ?? null,
  );
  const [rideAppEstimateScreenshotAddedAt, setRideAppEstimateScreenshotAddedAt] = useState<string | null>(
    () => storedRideAppFareProof?.addedAt ?? null,
  );
  const [rideAppEstimateScreenshotDraftName, setRideAppEstimateScreenshotDraftName] = useState<string | null>(null);
  const [rideAppEstimateScreenshotDraftPreviewUrl, setRideAppEstimateScreenshotDraftPreviewUrl] = useState<string | null>(null);
  const [lockSeatUnderstood, setLockSeatUnderstood] = useState(false);
  const [selfSettleUnderstood, setSelfSettleUnderstood] = useState(false);
  const rideAppWaiver = useRideAppWaiverState();
  const membership = useRidePodMembershipState();
  const [lockSeatLuggage, setLockSeatLuggage] = useState<LuggageContribution>({
    bagsCount: 0,
    hasLargeLuggage: false,
  });
  const rideAppTotalEstimateValue = rideAppTotalEstimateOverride
    ? estimateTotalFromRange(rideAppTotalEstimateOverride)
    : null;
  const rideAppEstimatePerPersonValue =
    rideAppTotalEstimateValue === null
      ? null
      : Math.ceil(rideAppTotalEstimateValue / Math.max(1, storedRide.seatsUsed));
  const currentRideAppFareProof =
    rideAppEstimateScreenshotName || rideAppEstimateScreenshotPreviewUrl
      ? {
          fileName: rideAppEstimateScreenshotName ?? undefined,
          previewUrl: rideAppEstimateScreenshotPreviewUrl ?? undefined,
          addedAt: rideAppEstimateScreenshotAddedAt ?? undefined,
          note: "Uploaded by host with the ride app fare estimate.",
        }
      : null;
  const actionPatchedRide = mergeRidePatch(personaRide, rideActionPatch) as HomeRide;
  const ride = rideAppTotalEstimateOverride
    ? {
        ...actionPatchedRide,
        bookingDetailsShared: true,
        rideAppBookingDetailsConfirmed: true,
        rideAppBookingDetailsFinalized: true,
        estimatedRideAppFare: rideAppTotalEstimateOverride,
        rideAppBookingDetails: {
          ...actionPatchedRide.rideAppBookingDetails,
          estimatedFare: rideAppTotalEstimateOverride,
        },
        rideAppEstimatedFarePerPerson: rideAppEstimatePerPersonValue,
        rideAppEstimatedFareTotal: rideAppTotalEstimateValue,
        rideAppEstimatedFareCurrency: "HKD" as const,
        rideAppFareEstimateStatus: "accepted" as const,
        rideAppFareEstimateScreenshotName: rideAppEstimateScreenshotName,
        rideAppFareEstimateScreenshotAddedAt: rideAppEstimateScreenshotAddedAt,
        fareEstimateScreenshot: currentRideAppFareProof,
      }
    : actionPatchedRide;
  const {
    seatsUsed,
    joinView,
    acceptedGuestCount,
    requiredGuestCount,
    attendanceMessage,
    attendanceError,
    isCancellingAttendance,
    canLockSeatAfterCancel,
    groupLuggageLabel,
    userLuggageLabel,
    luggageCapacityWarning,
    lockSeat,
    joinSelfSettlePod,
    leaveSelfSettlePod,
    acceptQuote,
    declineQuote,
    cancelSeat,
    cancelQuoteAcceptance,
    requestCancellation,
    markAtPickup,
    cancelAttendance,
  } = usePodDetailJoinState(ride);
  const progress = Math.min((seatsUsed / ride.seatsTotal) * 100, 100);
  const estimatedShareRange = getEstimatedShareRange(ride.pricePerPerson);
  const rideAppEstimateDisplay = getRideAppHostFareEstimateDisplay(ride);
  const rideAppHeroEstimateUpdated = rideAppTotalEstimateOverride !== null || rideAppEstimateDisplay.updated;
  const rideAppHeroEstimateLabel = rideAppHeroEstimateUpdated ? "Total estimate" : rideAppEstimateDisplay.label;
  const rideAppHeroEstimateValue = rideAppTotalEstimateOverride ?? rideAppEstimateDisplay.value;
  const rideAppProviderDisplay = getRideAppProviderDisplay(ride);
  const rideAppAcceptedPaymentDisplay = getRideAppAcceptedPaymentDisplay(ride);
  const rideAppFareProof = getRideAppFareEstimateProof(ride);
  const routeChangedAfterQuoteReady = false;
  const updatedQuoteReady = Boolean(ride.quoteUpdatedAfterRouteChange && ["quote_ready", "quote_deadline_soon", "late_confirmation"].includes(joinView));
  const showQuoteProvidedCard =
    ["quote_ready", "quote_deadline_soon", "late_confirmation", "quote_expired", "too_late_to_confirm", "quote_accepted", "all_accepted", "quote_declined"].includes(joinView);
  const quoteStatus = getHeroQuoteStatus(ride, joinView);
  const selfSettlePod = isRideAppSelfSettlePod(ride);
  const howItWorksRideMode: HowItWorksRideMode = selfSettlePod ? "ride_app" : "taxi";
  const showSelfSettleJoin = getCurrentUserCanJoinSelfSettlePod(ride, joinView);
  const showSelfSettleHost = selfSettlePod && getCurrentUserIsHost(ride);
  const hostCancellationStatus = getRideAppHostCancellationStatus(ride);
  const hostCancellationAllowsHostControls = hostCancellationStatus === "active";
  const canUpdateRideAppEstimate = selfSettlePod && showSelfSettleHost && hostCancellationAllowsHostControls;
  const rideAppConfirmedRiderCount = getRideAppConfirmedReplacementRiders(ride).length;
  const currentUserIsSelfSettleRider =
    selfSettlePod &&
    !showSelfSettleHost &&
    (ride.currentUserJoined === true ||
      ride.currentUserRole === "joined_rider" ||
      ride.quoteStatus === "joined" ||
      ride.currentUserJoinIntentStatus === "joined_interest" ||
      ride.currentUserJoinIntentStatus === "confirmed" ||
      ride.currentUserJoinIntentStatus === "needs_review");
  const canRequestRideAppStop = currentUserIsSelfSettleRider && hostCancellationAllowsHostControls;
  const showHostCancellationModal = hostCancellationModalConfirmedCount !== null;
  const hostCancellationHasConfirmedRiders = (hostCancellationModalConfirmedCount ?? 0) > 0;
  const hostCancellationReasons = hostCancellationHasConfirmedRiders
    ? afterConfirmationCancellationReasons
    : beforeConfirmationCancellationReasons;
  const launchWaiverAvailable = rideAppWaiver.claimed && !rideAppWaiver.used;
  const plusWaiverAvailable = hasRidePodPlusJoinFeeWaiver(membership);
  const selfSettleWaiverSource =
    showSelfSettleJoin && launchWaiverAvailable
      ? "launch"
      : showSelfSettleJoin && plusWaiverAvailable
        ? "plus"
        : "none";
  const lockSeatWaiverSource = launchWaiverAvailable ? "launch" : plusWaiverAvailable ? "plus" : "none";
  const detailRouteTitle = `${ride.fromLabel} -> ${ride.toLabel}`;
  const detailActorName =
    profile?.display_name?.trim() ||
    profile?.preferred_name?.trim() ||
    user?.email?.split("@")[0] ||
    ride.currentUserName?.trim() ||
    "Someone";

  function notifyRideDetailAction(input: {
    type?: NotifyPodAudienceInput["type"];
    audiences?: PodNotificationAudience[];
    title: string;
    body?: string | null;
    selfTitle?: string | null;
    selfBody?: string | null;
    action: string;
    relatedUrl?: string;
    dedupe?: boolean;
    delivery?: NotifyPodAudienceInput["delivery"];
    metadata?: Record<string, unknown>;
  }) {
    if (!user || !isRideAppSelfSettlePod(ride)) return;

    void notifyPodAudience({
      podId: ride.id,
      actorUserId: user.id,
      actorDisplayName: detailActorName,
      type: input.type ?? "ride_app_action_required",
      audiences: input.audiences ?? ["actor", "others"],
      title: input.title,
      body: input.body ?? null,
      selfTitle: input.selfTitle,
      selfBody: input.selfBody,
      relatedUrl: input.relatedUrl ?? `/pods/${ride.id}`,
      metadata: {
        action: input.action,
        route: detailRouteTitle,
        ...(input.metadata ?? {}),
      },
      dedupe: input.dedupe,
      delivery: input.delivery,
    });
  }

  function joinPod(luggage?: LuggageContribution) {
    lockSeat(luggage);
    setShowJoinedModal(true);
  }

  function completeSelfSettleJoin(showSuccessModal: boolean) {
    if (getRideAppRejoinRestrictionCopy(ride, ride.seatsUsed < ride.seatsTotal)) return;
    setSelfSettleLeft(false);
    joinSelfSettlePod();
    const patch = buildInitialSelfSettleJoinPatch(ride, getRideAppCurrentDetailVersion(ride));
    setRideActionPatch((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    const joinedViewerRide = mergeRidePatch(ride, patch) as HomeRide;
    const updatedExistingRide = updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
    if (!updatedExistingRide) saveViewerHomeRide(joinedViewerRide);
    if (user && !ride.joinLeaveCountForCurrentUser) {
      const actorDisplayName =
        profile?.display_name?.trim() ||
        profile?.preferred_name?.trim() ||
        user.email?.split("@")[0] ||
        "RidePod rider";
      void resolveSelfSettleMembershipTarget(ride, user.id)
        .then((target) =>
          joinRidePodMembership({
            podId: target.podId,
            userId: user.id,
            actorDisplayName,
            podTitle: `${ride.fromLabel} -> ${ride.toLabel}`,
            hostUserId: target.hostUserId,
            relatedUrl: `/pods/${ride.id}`,
          }),
        )
        .then((result) => {
          if (!result.success) {
            console.warn("RidePod self-settle membership join failed", result.error);
            return;
          }
          window.dispatchEvent(new Event("ridepod-created-home-rides-updated"));
        })
        .catch((error) => {
          console.warn("RidePod self-settle membership join failed", error);
        });
    }
    setShowSelfSettleJoinModal(false);
    setSelfSettleUnderstood(false);
    setShowSelfSettleJoinSuccessModal(showSuccessModal);
  }

  function confirmSelfSettleJoin() {
    if (!selfSettleUnderstood) return;
    completeSelfSettleJoin(true);
  }

  function joinSelfSettleFromSummary() {
    if (!showSelfSettleJoin) return;
    completeSelfSettleJoin(true);
  }

  function confirmLeaveSelfSettle() {
    const leavePatch = getSelfSettleRideAfterLeave(ride);
    leaveSelfSettlePod();
    setRideActionPatch((current) => mergeRidePatch(current ?? {}, leavePatch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, leavePatch);
    const leftViewerRide = mergeRidePatch(ride, leavePatch) as HomeRide;
    const updatedExistingRide = updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, leavePatch) as HomeRide);
    if (!updatedExistingRide) saveViewerHomeRide(leftViewerRide);
    setSelfSettleLeft(true);
    setShowLeaveSelfSettleModal(false);

    if (user && isRideAppSelfSettlePod(ride)) {
      createRideAppTrustEvent({
        userId: user.id,
        podId: ride.id,
        eventType: ride.bookingDetailsShared === true ? "ride_app_rider_left_late" : "ride_app_rider_left_early",
        reason:
          ride.bookingDetailsShared === true
            ? "Rider left after booking details were shared."
            : "Rider left before booking details were shared.",
        createdBy: user.id,
      });
      if ((leavePatch.joinLeaveCountForCurrentUser ?? 0) <= 1) {
        void cancelPodAttendance({
          podId: ride.id,
          userId: user.id,
          actorDisplayName: detailActorName,
          podTitle: detailRouteTitle,
          relatedUrl: `/pods/${ride.id}`,
        }).then((result) => {
          if (!result.success) {
            console.warn("RidePod self-settle membership leave failed", result.error);
          }
        });
      }
    }

    if ((leavePatch.joinLeaveCountForCurrentUser ?? 0) <= 1) {
      notifyRideDetailAction({
        type: "attendance_cancelled",
        title: "Rider left this ride",
        body: `${detailActorName} left ${detailRouteTitle}.`,
        selfTitle: "You left this ride",
        selfBody: `${detailRouteTitle} was removed from your active rides.`,
        action: "attendance_cancelled",
        delivery: "local",
      });
    }
  }

  function openRideAppEstimateModal() {
    if (!canUpdateRideAppEstimate) return;
    const currentProof = getRideAppFareEstimateProof(ride);
    setRideAppEstimateDraft(getRideAppEstimateNumberInput(rideAppTotalEstimateOverride ?? getRideAppHostFareEstimate(ride) ?? ""));
    setRideAppEstimateScreenshotDraftName(currentProof?.fileName ?? null);
    setRideAppEstimateScreenshotDraftPreviewUrl(currentProof?.previewUrl ?? null);
    setRideAppEstimateError(null);
    setShowRideAppEstimateModal(true);
  }

  function confirmRideAppEstimateUpdate() {
    const formattedEstimate = formatRideAppEstimateInput(rideAppEstimateDraft);
    if (!formattedEstimate) {
      setRideAppEstimateError("Add the estimate from Ride App.");
      return;
    }

    setRideAppTotalEstimateOverride(formattedEstimate);
    setRideAppEstimateScreenshotName(rideAppEstimateScreenshotDraftName);
    const updatedAt = new Date().toISOString();
    const proofUpdatedAt =
      rideAppEstimateScreenshotDraftName || rideAppEstimateScreenshotDraftPreviewUrl
        ? updatedAt
        : null;
    setRideAppEstimateScreenshotPreviewUrl(rideAppEstimateScreenshotDraftPreviewUrl);
    setRideAppEstimateScreenshotAddedAt(proofUpdatedAt);
    const totalEstimate = estimateTotalFromRange(formattedEstimate);
    const estimatePerPerson =
      totalEstimate === null ? null : Math.ceil(totalEstimate / Math.max(1, ride.seatsUsed));
    const updatedBy = ride.currentUserRole === "host" ? "You" : ride.currentUserName ?? "You";
    const previousFareEstimate = getRideAppHostFareEstimate(ride);
    const nextEstimateSnapshot: Partial<HomeRide> = {
      estimatedRideAppFare: formattedEstimate,
      rideAppBookingDetails: {
        ...ride.rideAppBookingDetails,
        estimatedFare: formattedEstimate,
      },
      rideAppEstimatedFarePerPerson: estimatePerPerson,
      rideAppEstimatedFareTotal: totalEstimate,
    };
    const meaningfulUpdate = isMeaningfulRideAppDetailUpdate(ride, {
      ...ride,
      ...nextEstimateSnapshot,
    });
    const fareEstimateChangedMeaningfully = Boolean(previousFareEstimate?.trim()) && meaningfulUpdate.updateType === "fare_estimate";
    const reviewPatch = fareEstimateChangedMeaningfully
      ? applyRideAppMeaningfulDetailUpdate({ ...ride, ...nextEstimateSnapshot }, "fare_estimate")
      : {};
    const updatedChecklist = {
      ...ride.rideAppChecklist,
      pickupPoint: ride.rideAppChecklist?.pickupPoint ?? Boolean(ride.pickupLabel),
      dropoffPoint: ride.rideAppChecklist?.dropoffPoint ?? Boolean(ride.dropoffLabel),
      rideApp: ride.rideAppChecklist?.rideApp ?? Boolean(ride.rideAppProviderName || ride.taxiType),
      estimatedFare: true,
      booker: ride.rideAppChecklist?.booker ?? true,
      fareSplit: ride.rideAppChecklist?.fareSplit ?? Boolean(ride.rideAppSplitMethod || ride.splitMethod),
      paymentMethod: ride.rideAppChecklist?.paymentMethod ?? Boolean(ride.rideAppAcceptedPaymentMethods?.length || ride.paymentMethod),
      paymentRecipientAfterRide: ride.rideAppChecklist?.paymentRecipientAfterRide ?? true,
      meetingTime: ride.rideAppChecklist?.meetingTime ?? Boolean(ride.pickupTime || ride.timeLabel),
      updatedAt,
      updatedBy,
    };
    const updatedRidePatch: Partial<HomeRide> = {
      ...reviewPatch,
      bookingDetailsShared: true,
      rideAppBookingDetailsConfirmed: true,
      rideAppBookingDetailsConfirmedAt: ride.rideAppBookingDetailsConfirmedAt ?? updatedAt,
      rideAppBookingDetailsConfirmedBy: ride.rideAppBookingDetailsConfirmedBy ?? updatedBy,
      rideAppBookingDetailsFinalized: true,
      rideAppBookingDetailsFinalizedAt: ride.rideAppBookingDetailsFinalizedAt ?? updatedAt,
      rideAppBookingDetailsFinalizedBy: ride.rideAppBookingDetailsFinalizedBy ?? updatedBy,
      estimatedRideAppFare: formattedEstimate,
      rideAppBookingDetails: {
        ...ride.rideAppBookingDetails,
        estimatedFare: formattedEstimate,
      },
      rideAppEstimatedFarePerPerson: estimatePerPerson,
      rideAppEstimatedFareTotal: totalEstimate,
      rideAppEstimatedFareCurrency: "HKD" as const,
      rideAppEstimatedFareUpdatedBy: updatedBy,
      rideAppEstimatedFareUpdatedAt: updatedAt,
      rideAppEstimatedFareNote: rideAppEstimateScreenshotDraftName
        ? `Screenshot uploaded: ${rideAppEstimateScreenshotDraftName}`
        : "Updated by host.",
      rideAppFareEstimateStatus: "accepted" as const,
      rideAppFareEstimateScreenshotName: rideAppEstimateScreenshotDraftName,
      rideAppFareEstimateScreenshotAddedAt: proofUpdatedAt,
      fareEstimateScreenshot: rideAppEstimateScreenshotDraftName || rideAppEstimateScreenshotDraftPreviewUrl
        ? {
            fileName: rideAppEstimateScreenshotDraftName ?? undefined,
            previewUrl: rideAppEstimateScreenshotDraftPreviewUrl ?? undefined,
            addedAt: proofUpdatedAt ?? undefined,
            note: "Uploaded by host with the ride app fare estimate.",
          }
        : null,
      rideAppChecklist: updatedChecklist,
    };
    setRideActionPatch((current) => mergeRidePatch(current ?? {}, updatedRidePatch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, updatedRidePatch);
    updateCreatedHomeRide(ride.id, (storedRide) => ({
      ...storedRide,
      ...updatedRidePatch,
      rideAppBookingDetails: {
        ...storedRide.rideAppBookingDetails,
        ...updatedRidePatch.rideAppBookingDetails,
      },
      rideAppChecklist: {
        ...storedRide.rideAppChecklist,
        ...updatedRidePatch.rideAppChecklist,
      } as HomeRide["rideAppChecklist"],
    }));
    const screenshotOnlyUpdate = !fareEstimateChangedMeaningfully && Boolean(rideAppEstimateScreenshotDraftName || rideAppEstimateScreenshotDraftPreviewUrl);
    notifyRideDetailAction({
      type: fareEstimateChangedMeaningfully ? "ride_app_action_required" : "ride_app_details_updated",
      audiences: ["riders"],
      title: fareEstimateChangedMeaningfully ? "Fare estimate updated" : screenshotOnlyUpdate ? "Fare estimate screenshot added" : "Fare estimate updated",
      body: fareEstimateChangedMeaningfully
        ? `${detailActorName} updated the fare estimate to ${formattedEstimate}. Riders need to review.`
        : screenshotOnlyUpdate
          ? `${detailActorName} added a fare estimate screenshot.`
          : `${detailActorName} updated the fare estimate to ${formattedEstimate}.`,
      action: fareEstimateChangedMeaningfully ? "fare_estimate_needs_review" : screenshotOnlyUpdate ? "fare_screenshot_added" : "estimate_updated",
      dedupe: false,
    });
    setRideAppEstimateError(null);
    setShowRideAppEstimateModal(false);
  }

  function applyRideActionPatch(patch: Partial<HomeRide>) {
    setRideActionPatch((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
    saveStoredSelfSettleRidePatch(ride.id, patch);
    updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
  }

  function requestRideAppStopFromDetail(stopLabel: string) {
    const trimmedStopLabel = stopLabel.trim();
    const routeLocked =
      ride.bookingDetailsShared === true ||
      ride.rideAppBookingDetailsConfirmed === true ||
      ride.rideAppBookingDetailsFinalized === true;
    const hasPendingStop = getNormalizedRouteRequests(ride).pendingCount > 0;
    if (!trimmedStopLabel || !canRequestRideAppStop || routeLocked || hasPendingStop) return;

    const patch = buildRideAppStopRequestPatch(ride, trimmedStopLabel, detailActorName);
    applyRideActionPatch(patch);
    notifyRideDetailAction({
      type: "ride_app_action_required",
      audiences: ["actor", "host"],
      title: "New stop requested",
      body: `${detailActorName} requested a new stop: ${trimmedStopLabel}.`,
      selfTitle: "Stop request sent",
      selfBody: `${trimmedStopLabel} is waiting for host approval.`,
      action: "route_stop_requested",
      relatedUrl: `/pods/${ride.id}#route-requests`,
      dedupe: false,
      metadata: {
        stopLabel: trimmedStopLabel,
        requestedBy: detailActorName,
      },
    });
  }

  useEffect(() => {
    if (!user?.id || !showSelfSettleHost || !isRideAppSelfSettlePod(ride) || !isHostApprovedStopPolicy(ride.stopRequestPolicy) || hasAnyRideAppStopRequestState(ride)) {
      return;
    }

    let cancelled = false;
    void getHostPendingStopRequestFromNotifications(user.id, ride)
      .then((pendingStop) => {
        if (cancelled || !pendingStop) return;
        const existingRequests = getNormalizedRouteRequests(ride).all.filter((request) => request.id !== pendingStop.id);
        const patch: Partial<HomeRide> = {
          routeRequests: [
            ...existingRequests,
            {
              id: pendingStop.id,
              requestedByName: pendingStop.requestedBy ?? "Rider",
              stopLocation: pendingStop.label,
              reason: pendingStop.reason,
              status: "pending",
            },
          ],
          proposedStops: [pendingStop],
        };
        setRideActionPatch((current) => mergeRidePatch(current ?? {}, patch) as Partial<HomeRide>);
        saveStoredSelfSettleRidePatch(ride.id, patch);
        updateCreatedHomeRide(ride.id, (storedRide) => mergeRidePatch(storedRide, patch) as HomeRide);
      })
      .catch((error) => {
        console.warn("RidePod stop request hydration failed", error);
      });

    return () => {
      cancelled = true;
    };
    // Hydration is keyed to the persisted pod/stop state; the derived ride object itself is rebuilt during render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride.id, ride.stopRequestPolicy, ride.proposedStops?.length, ride.approvedStops?.length, ride.declinedStops?.length, showSelfSettleHost, user?.id]);

  function openHostCancellationModal(confirmedRiderCount: number) {
    const reasons = confirmedRiderCount > 0 ? afterConfirmationCancellationReasons : beforeConfirmationCancellationReasons;
    setHostCancellationChoice(confirmedRiderCount > 0 ? "step_down" : "cancel_everyone");
    setHostCancellationReason(reasons[0]?.value ?? "Plans changed");
    setHostCancellationModalConfirmedCount(confirmedRiderCount);
  }

  function closeHostCancellationModal() {
    setHostCancellationModalConfirmedCount(null);
    setHostCancellationChoice("step_down");
    setHostCancellationReason(beforeConfirmationCancellationReasons[0]?.value ?? "Plans changed");
  }

  function confirmHostCancellation() {
    if (!showHostCancellationModal) return;

    const replacementDeadlineLabel = ride.confirmationDeadlineLabel
      ? `Before ${ride.confirmationDeadlineLabel}`
      : "Before confirm-by time";
    const shouldStartReplacement = hostCancellationHasConfirmedRiders && hostCancellationChoice === "step_down";
    const patch: Partial<HomeRide> = shouldStartReplacement
      ? {
          rideAppHostCancellationStatus: "host_replacement_needed",
          rideAppHostCancellationReason: hostCancellationReason,
          rideAppReplacementBookerId: null,
          rideAppReplacementBookerName: null,
          rideAppReplacementDeadlineLabel: replacementDeadlineLabel,
          rideAppFeeResolution: "review_needed",
          rideAppHostCancellationActivity: [`${detailActorName} stepped down as host.`, "Host replacement mode started."],
        }
      : {
          rideAppHostCancellationStatus: hostCancellationHasConfirmedRiders ? "cancelled" : "host_cancelled",
          rideAppHostCancellationReason: hostCancellationReason,
          rideAppReplacementBookerId: null,
          rideAppReplacementBookerName: null,
          rideAppReplacementDeadlineLabel: replacementDeadlineLabel,
          rideAppFeeResolution: hostCancellationHasConfirmedRiders ? "restore_in_live_version" : "not_confirmed",
          rideAppHostCancellationActivity: [`${detailActorName} cancelled the pod.`],
          rideAppPodStatus: "cancelled",
          status: "cancelled",
        };

    applyRideActionPatch(patch);
    notifyRideDetailAction({
      type: "ride_app_host_cancelled",
      title: shouldStartReplacement ? "Host replacement needed" : "Pod cancelled",
      body: shouldStartReplacement
        ? `${detailActorName} can no longer host ${detailRouteTitle}. A confirmed rider can become the new booker.`
        : `${detailActorName} cancelled ${detailRouteTitle}. No live payment was charged in this version.`,
      selfTitle: shouldStartReplacement ? "You stepped down as host" : "You cancelled the pod",
      selfBody: hostCancellationReason,
      action: shouldStartReplacement ? "host_replacement_needed" : "host_cancelled",
    });
    closeHostCancellationModal();
    setShowManagePodActionsModal(false);
  }

  function approveRouteStop(stop: RoutePlanStop) {
    const patch = buildApproveRideAppStopPatch(ride, stop);

    applyRideActionPatch(patch);
    notifyRideDetailAction({
      type: "ride_app_action_required",
      title: "Route request approved",
      body: `${detailActorName} approved ${stop.label}. Please review the latest ride details.`,
      selfTitle: "You approved a route request",
      selfBody: stop.label,
      action: "route_request_approved",
      metadata: {
        stopLabel: stop.label,
        requestedBy: stop.requestedBy ?? "Rider",
      },
    });
  }

  function declineRouteStop(stop: RoutePlanStop) {
    const patch = buildDeclineRideAppStopPatch(ride, stop);

    applyRideActionPatch(patch);
    notifyRideDetailAction({
      type: "ride_app_details_updated",
      title: "Route request declined",
      body: `${detailActorName} declined ${stop.label}.`,
      selfTitle: "You declined a route request",
      selfBody: stop.label,
      action: "route_request_declined",
      metadata: {
        stopLabel: stop.label,
        requestedBy: stop.requestedBy ?? "Rider",
      },
    });
  }

  function closeLockSeatModal() {
    setShowLockSeatModal(false);
    setLockSeatUnderstood(false);
    setLockSeatLuggage({ bagsCount: 0, hasLargeLuggage: false });
  }

  function confirmLockSeat() {
    if (!lockSeatUnderstood) return;
    if (lockSeatWaiverSource === "launch") {
      markRideAppWaiverUsed();
    } else if (lockSeatWaiverSource === "plus") {
      consumeRidePodPlusJoinFeeWaiver();
    }
    joinPod(lockSeatLuggage);
    closeLockSeatModal();
  }

  function sharePod() {
    const podUrl = typeof window !== "undefined" ? window.location.href : `/pods/${ride.id}`;
    const title = `${ride.fromLabel} to ${ride.toLabel}`;
    const browserNavigator =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & {
            share?: (data: ShareData) => Promise<void>;
            clipboard?: Clipboard;
          })
        : null;
    if (browserNavigator?.share) {
      void browserNavigator.share({ title, text: `Join this RidePod hosted by ${ride.hostName || "the host"}.`, url: podUrl }).catch(() => {});
      return;
    }
    if (browserNavigator?.clipboard) {
      void browserNavigator.clipboard.writeText(podUrl).catch(() => {});
    }
  }

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden pb-48 sm:-mx-6 lg:-mx-10 lg:-mt-8">
      <div className="mx-auto w-full max-w-[520px] lg:pt-4">
        <header className="relative z-20 flex h-12 items-center justify-between px-4">
          <Link
            href="/home"
            aria-label="Back to Home"
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full border bg-[rgba(4,10,18,0.72)] text-[var(--rp-text)] shadow-[0_8px_22px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:bg-[rgba(20,27,34,0.92)]",
              selfSettlePod ? "border-cyan-200/35" : "border-[var(--rp-primary)]/45",
            )}
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <span className="h-10 w-10" aria-hidden="true" />
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        <main className="relative z-10 grid gap-3 px-4">
          {selfSettlePod ? (
            <SelfSettlePodSummaryHero
              ride={ride}
              seatsUsed={seatsUsed}
              estimateLabel={rideAppHeroEstimateLabel}
              estimateValue={rideAppHeroEstimateValue}
              estimateUpdated={rideAppHeroEstimateUpdated}
              canUpdateEstimate={canUpdateRideAppEstimate}
              onEstimateClick={openRideAppEstimateModal}
              onManageActionsClick={() => setShowManagePodActionsModal(true)}
              hasFareProof={Boolean(rideAppFareProof)}
              onViewFareProof={() => setShowRideAppFareProofModal(true)}
              onSharePod={sharePod}
              onJoinRide={joinSelfSettleFromSummary}
              onLeaveRide={() => setShowLeaveSelfSettleModal(true)}
              onCancelPodClick={() => openHostCancellationModal(rideAppConfirmedRiderCount)}
            />
          ) : (
          <section className="relative -mx-4 -mt-2 overflow-hidden rounded-b-[28px] border-b border-[var(--rp-border)] bg-[var(--rp-shell)] shadow-[var(--rp-shadow-soft)]">
            <div className={cn("relative pt-12", selfSettlePod ? "min-h-[430px]" : "min-h-[478px]")}>
              <Image
                src={selfSettlePod ? "/images/ridepod/ride-app-skyline-cyan.png" : "/images/ridepod/home-dark-mode-background.png"}
                alt={selfSettlePod ? "Cyan Hong Kong skyline at night" : "Hong Kong skyline illustration at night"}
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className={cn("object-cover", selfSettlePod ? "object-[62%_48%]" : "object-center")}
              />
              <div
                className={cn(
                  "absolute inset-0",
                  selfSettlePod
                    ? "bg-[linear-gradient(180deg,rgba(2,6,23,0.64)_0%,rgba(2,8,23,0.38)_34%,rgba(2,8,23,0.70)_66%,rgba(2,6,18,0.96)_100%)]"
                    : "bg-[linear-gradient(180deg,rgba(5,11,18,0.04)_0%,rgba(5,11,18,0.08)_34%,rgba(5,11,18,0.74)_76%,rgba(5,11,18,0.96)_100%)]",
                )}
              />

              <div className={cn("z-10 px-5 pb-5", selfSettlePod ? "relative" : "absolute inset-x-0 bottom-0")}>
                <h2 className="max-w-full text-[28px] font-black leading-[1.03] tracking-tight text-white min-[390px]:text-[32px]">
                  {ride.fromLabel} {"\u2192"} {ride.toLabel}
                </h2>

                <p className="mt-5 text-xl font-semibold text-[var(--rp-muted-strong)]">
                  {ride.dateLabel}{" "}
                  <span className={cn("px-2", selfSettlePod ? "text-cyan-200" : "text-[var(--rp-primary)]")} aria-hidden="true">
                    {"\u00b7"}
                  </span>{" "}
                  {ride.timeLabel}
                </p>
                <PodDetailSetupBadges ride={ride} />
                <div className="mt-3 flex max-w-full items-center gap-2">
                  <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/14 bg-black/26 px-3 py-2 text-xs font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-md">
                    <UserRound className={cn("h-4 w-4 shrink-0", selfSettlePod ? "text-cyan-200" : "text-[var(--rp-primary)]")} />
                    <span className="shrink-0 uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">Created by</span>
                    <span className="truncate text-[var(--rp-text)]">{ride.hostName || "RidePod host"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={sharePod}
                    aria-label="Share pod"
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-black/26 shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-white/10",
                      selfSettlePod
                        ? "border-cyan-200/35 text-cyan-100"
                        : "border-[var(--rp-primary)]/35 text-[var(--rp-primary)]",
                    )}
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 border-t border-white/14 pt-4">
                  {selfSettlePod ? (
                    <div className="grid gap-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(112px,0.68fr)] gap-3">
                        <div className="min-w-0 rounded-[18px] border border-cyan-200/24 bg-black/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
                          <div className="flex min-w-0 items-center gap-3">
                            <RiderStack ride={ride} seatsUsed={seatsUsed} />
                            <p className="min-w-0 text-left font-black leading-tight text-[var(--rp-text)]">
                              <span className="block whitespace-nowrap text-lg">{seatsUsed} / {ride.seatsTotal}</span>
                              <span className="block text-xs text-[var(--rp-muted-strong)]">seats filled</span>
                            </p>
                          </div>
                          <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/14">
                            <div
                              className="h-full rounded-full bg-cyan-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="grid min-w-0 content-center border-x border-white/14 px-3 py-2 text-left backdrop-blur-md">
                          {canUpdateRideAppEstimate ? (
                            <button
                              type="button"
                              onClick={openRideAppEstimateModal}
                              className="w-full text-left transition hover:brightness-110"
                            >
                              <span className="block text-[10px] font-semibold leading-4 text-[var(--rp-muted-strong)]">{rideAppHeroEstimateLabel}</span>
                              <span
                                className={cn(
                                  "mt-1 block font-black leading-tight text-[var(--rp-primary)]",
                                  rideAppHeroEstimateUpdated ? "text-lg" : "whitespace-nowrap text-[11px]",
                                )}
                              >
                                {rideAppHeroEstimateValue}
                              </span>
                            </button>
                          ) : (
                            <Link href="#fare-split" className="block text-left transition hover:brightness-110">
                              <p className="text-[10px] font-semibold leading-4 text-[var(--rp-muted-strong)]">
                                {rideAppHeroEstimateLabel}
                              </p>
                              <p
                                className={cn(
                                  "mt-1 font-black leading-tight text-[var(--rp-primary)]",
                                  rideAppHeroEstimateUpdated ? "text-lg" : "whitespace-nowrap text-[11px]",
                                )}
                              >
                                {rideAppHeroEstimateValue}
                              </p>
                            </Link>
                          )}
                        </div>
                      </div>
                      {!showQuoteProvidedCard ? (
                        <div className="grid gap-3">
                          {showSelfSettleJoin ? (
                            <button
                              type="button"
                              onClick={() => setShowSelfSettleJoinModal(true)}
                              className="min-h-12 rounded-[16px] bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] px-4 text-sm font-black text-[#061019] shadow-[0_12px_26px_rgba(56,189,248,0.22)]"
                            >
                              Join pod
                            </button>
                          ) : showSelfSettleHost ? (
                            <Link
                              href={`/pods/${ride.id}/status`}
                              className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-cyan-200/35 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
                            >
                              View pod status
                            </Link>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-primary)]/35 bg-white/8 px-4 text-sm font-black text-[var(--rp-primary)]">
                                <CheckCircle2 className="h-4 w-4" />
                                Joined
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowLeaveSelfSettleModal(true)}
                                className="min-h-12 rounded-[16px] border border-[var(--rp-primary)]/35 bg-white/8 px-4 text-sm font-black text-[var(--rp-primary)]"
                              >
                                Leave pod
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                      <div className="min-w-0 pr-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <RiderStack ride={ride} seatsUsed={seatsUsed} />
                          <p className="min-w-0 text-lg font-black text-[var(--rp-text)]">
                            {seatsUsed} / {ride.seatsTotal} seats filled
                          </p>
                        </div>
                        <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/14">
                          <div
                            className="h-full rounded-full bg-[var(--rp-primary)]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="min-w-[144px] border-l border-white/14 pl-4 text-right">
                        <p className="text-base font-semibold text-[var(--rp-muted-strong)]">
                          Est. share
                        </p>
                        <p className="mt-1 text-3xl font-black leading-none text-white">
                          {estimatedShareRange}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--rp-muted-strong)]">
                          per person
                        </p>
                      </div>
                    </div>
                  )}
                  {!showQuoteProvidedCard && !selfSettlePod ? (
                      <div id="quote-status" className="mt-4 grid grid-cols-[1fr_140px] items-center gap-3">
                        <div className="rounded-[14px] border border-white/14 bg-black/24 px-3 py-2 text-left backdrop-blur-md">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
                            Quote status
                          </p>
                          <p className="mt-1 text-sm font-black text-[var(--rp-primary)]">
                            {quoteStatus}
                          </p>
                          {updatedQuoteReady ? (
                            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                              Taxi partner updated the quote for the approved route.
                            </p>
                          ) : null}
                        </div>
                        <div className="[&>button]:mt-0">
                          <PodHeroJoinButton
                            ride={ride}
                            joinView={joinView}
                            onLeaveSelfSettle={() => setShowLeaveSelfSettleModal(true)}
                            onLeaveTaxiPod={() => setShowLockSeatModal(true)}
                            onJoin={() => {
                              if (showSelfSettleJoin) {
                                setShowSelfSettleJoinModal(true);
                                return;
                              }

                              setShowLockSeatModal(true);
                            }}
                          />
                        </div>
                      </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
          )}

          {showQuoteProvidedCard ? (
            <QuoteProvidedCard
              ride={ride}
              joinView={joinView}
              acceptedGuestCount={acceptedGuestCount}
              requiredGuestCount={requiredGuestCount}
              onAcceptQuote={acceptQuote}
              onDeclineQuote={declineQuote}
            />
          ) : null}

          <DetailShell className={activeDetailTab === "trip" ? "border-0 bg-transparent p-0 shadow-none" : undefined}>
            <div>
                <DetailSwitch value={activeDetailTab} onChange={setActiveDetailTab} rideMode={howItWorksRideMode} />
            </div>

            {activeDetailTab === "trip" ? (
              <div className="mt-4">
                <div className="hidden">
                  <DetailItem icon={<CalendarDays className="h-5 w-5" />} label="Date & time" value={`${ride.dateLabel} · ${ride.timeLabel}`} />
                </div>
                {selfSettlePod ? (
                  <div className="grid gap-3">
                    <section className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-white/10 bg-black/20 text-[var(--rp-primary)]">
                          <CalendarDays className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Date & time</p>
                          <p className="mt-1 text-sm font-black leading-5 text-white">{ride.dateLabel} - {ride.timeLabel}</p>
                        </div>
                      </div>
                    </section>
                    <CompactRideAppRoutePanel
                      ride={ride}
                      canRequestStop={canRequestRideAppStop}
                      canReviewStop={showSelfSettleHost}
                      onRequestStop={requestRideAppStopFromDetail}
                      onApproveStop={approveRouteStop}
                      onDeclineStop={declineRouteStop}
                    />
                  </div>
                ) : (
                  <div>
                    <RoutePlanCard ride={ride} joinView={joinView} />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {selfSettlePod ? null : (
                  <div className="flex flex-wrap gap-2">
                    <DetailTag tone="gold">Payment protected</DetailTag>
                  </div>
                )}
                <div className={cn("grid gap-3", selfSettlePod ? "" : "border-t border-[var(--rp-border)] pt-4")}>
                  {selfSettlePod ? (
                    <>
                      <div className="rounded-[18px] border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(8,47,73,0.36),rgba(15,23,42,0.72))] p-4 shadow-[0_0_22px_rgba(56,189,248,0.08)]">
                        <div className="flex items-start gap-3">
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-cyan-200/35 bg-cyan-300/12 text-cyan-100">
                            <Smartphone className="h-6 w-6" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Self-settle ride app</p>
                            <h3 className="mt-1 text-xl font-black leading-tight text-[var(--rp-text)]">{rideAppProviderDisplay}</h3>
                            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                              Accepted payment: {rideAppAcceptedPaymentDisplay}.
                            </p>
                            <p className="mt-1 text-sm font-black leading-6 text-cyan-100">
                              Settle directly with host/booker.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <TaxiTypeVisualCard taxiType={ride.taxiType} />
                  )}
                  <DetailItem
                    icon={ride.podType === "Open pod" ? <UsersRound className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                    label="Who can join"
                    value={ride.podType}
                  />
                  <DetailItem icon={<BriefcaseBusiness className="h-6 w-6" />} label="Group luggage" value={groupLuggageLabel} />
                  {userLuggageLabel ? (
                    <p className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-2 text-xs font-black text-[var(--rp-primary)]">
                      {userLuggageLabel}
                    </p>
                  ) : null}
                  {luggageCapacityWarning ? (
                    <p className="rounded-[14px] border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">
                      This taxi may not fit the group luggage. Taxi type and luggage capacity depend on taxi partner availability.
                    </p>
                  ) : null}
                  <DetailItem
                    icon={<ShieldCheck className="h-6 w-6" />}
                    label="Access"
                    value={ride.accessibility}
                  />
                </div>
              </div>
            )}
          </DetailShell>

          {!selfSettlePod ? (
            <PickupReadyCards
              ride={ride}
              joinView={joinView}
              acceptedGuestCount={acceptedGuestCount}
              requiredGuestCount={requiredGuestCount}
            />
          ) : null}
        </main>
      </div>

      {!selfSettlePod ? (
        <StickyPodDetailCta
          ride={ride}
          seatsUsed={seatsUsed}
          joinView={joinView}
          acceptedGuestCount={acceptedGuestCount}
          requiredGuestCount={requiredGuestCount}
          onLockSeat={joinPod}
          onJoinSelfSettle={joinSelfSettlePod}
          onLeaveSelfSettle={leaveSelfSettlePod}
          onAcceptQuote={acceptQuote}
          onDeclineQuote={declineQuote}
          onCancelSeat={cancelSeat}
          onCancelQuoteAcceptance={cancelQuoteAcceptance}
          onRequestCancellation={requestCancellation}
          onMarkAtPickup={markAtPickup}
          onCancelAttendance={cancelAttendance}
          attendanceMessage={attendanceMessage}
          attendanceError={attendanceError}
          canLockSeatAfterCancel={canLockSeatAfterCancel}
          isCancellingAttendance={isCancellingAttendance}
          routeChangedAfterQuoteReady={routeChangedAfterQuoteReady}
          hideQuoteActions={showQuoteProvidedCard}
        />
      ) : null}
      {showLockSeatModal ? (
        <LockSeatConfirmationModal
          ride={ride}
          seatsUsed={seatsUsed}
          checked={lockSeatUnderstood}
          luggage={lockSeatLuggage}
          waiverSource={lockSeatWaiverSource}
          plusWaiversRemaining={membership.monthlyJoinFeeWaiversRemaining}
          plusWaiversTotal={membership.monthlyJoinFeeWaiversTotal}
          onCheckedChange={setLockSeatUnderstood}
          onLuggageChange={setLockSeatLuggage}
          onCancel={closeLockSeatModal}
          onConfirm={confirmLockSeat}
        />
      ) : null}
      {showSelfSettleJoinModal ? (
        <SelfSettleJoinConfirmationModal
          ride={ride}
          seatsUsed={seatsUsed}
          checked={selfSettleUnderstood}
          waiverSource={selfSettleWaiverSource}
          plusWaiversRemaining={membership.monthlyJoinFeeWaiversRemaining}
          plusWaiversTotal={membership.monthlyJoinFeeWaiversTotal}
          onCheckedChange={setSelfSettleUnderstood}
          onCancel={() => {
            setShowSelfSettleJoinModal(false);
            setSelfSettleUnderstood(false);
          }}
          onConfirm={confirmSelfSettleJoin}
        />
      ) : null}
      {showSelfSettleJoinSuccessModal ? (
        <SelfSettleJoinSuccessModal
          onClose={() => setShowSelfSettleJoinSuccessModal(false)}
        />
      ) : null}
      {showLeaveSelfSettleModal ? (
        <LeaveSelfSettlePodModal
          confirmed={ride.currentUserJoinIntentStatus === "confirmed" || ride.currentUserBookingDetailsConfirmed === true}
          onCancel={() => setShowLeaveSelfSettleModal(false)}
          onConfirm={confirmLeaveSelfSettle}
        />
      ) : null}
      {showManagePodActionsModal && showSelfSettleHost ? (
        <ManagePodActionsModal
          ride={ride}
          onClose={() => setShowManagePodActionsModal(false)}
          onApproveStop={approveRouteStop}
          onDeclineStop={declineRouteStop}
        />
      ) : null}
      {showHostCancellationModal ? (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="host-cancellation-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeHostCancellationModal();
          }}
        >
          <section className="max-h-[calc(100dvh-2rem)] w-full max-w-[390px] overflow-y-auto rounded-[26px] border border-[var(--rp-primary)]/35 bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-[var(--rp-primary)]/35 bg-[var(--rp-primary)]/12 text-[var(--rp-primary)]">
                <X className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 id="host-cancellation-title" className="text-xl font-black leading-tight text-white">
                  Confirm host action
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  Confirm what should happen to this self-settle pod. Riders will be notified after you confirm.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {hostCancellationHasConfirmedRiders ? (
                <>
                  <button
                    type="button"
                    onClick={() => setHostCancellationChoice("step_down")}
                    className={cn(
                      "rounded-[16px] border p-3 text-left transition",
                      hostCancellationChoice === "step_down"
                        ? "border-cyan-300/45 bg-cyan-300/12"
                        : "border-cyan-300/20 bg-cyan-300/6 hover:bg-cyan-300/10",
                    )}
                  >
                    <p className="text-sm font-black text-white">Step down as host</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                      Confirmed riders can choose a new booker and continue the pod.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHostCancellationChoice("cancel_everyone")}
                    className={cn(
                      "rounded-[16px] border p-3 text-left transition",
                      hostCancellationChoice === "cancel_everyone"
                        ? "border-[var(--rp-primary)]/50 bg-[var(--rp-primary)]/14"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]",
                    )}
                  >
                    <p className="text-sm font-black text-white">Cancel pod for everyone</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                      Use only if the ride plan cannot continue.
                    </p>
                  </button>
                </>
              ) : (
                <div className="rounded-[16px] border border-cyan-300/28 bg-cyan-300/8 p-3">
                  <p className="text-sm font-black text-white">Cancel pod</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                    No riders have confirmed yet. The pod will close and seat holds will be released.
                  </p>
                </div>
              )}
            </div>

            {hostCancellationHasConfirmedRiders ? (
              <fieldset className="mt-4 grid gap-2">
                <legend className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Reason</legend>
                {hostCancellationReasons.map((reason) => (
                  <label
                    key={reason.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[14px] border px-3 py-3 transition",
                      hostCancellationReason === reason.value
                        ? "border-[var(--rp-primary)]/55 bg-[var(--rp-primary)]/14"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]",
                    )}
                  >
                    <input
                      type="radio"
                      name="host-cancellation-reason"
                      value={reason.value}
                      checked={hostCancellationReason === reason.value}
                      onChange={() => setHostCancellationReason(reason.value)}
                      className="h-4 w-4 accent-[var(--rp-primary)]"
                    />
                    <span className="text-sm font-black text-white">{reason.label}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}

            <p className="mt-4 rounded-[16px] border border-cyan-300/25 bg-cyan-300/8 px-3 py-3 text-xs font-semibold leading-5 text-cyan-100">
              {hostCancellationHasConfirmedRiders
                ? "RidePod fee/waiver stays with this pod while riders decide whether to continue."
                : "No RidePod fee was confirmed. No live payment was charged in this version."}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeHostCancellationModal}
                className="min-h-12 rounded-[16px] border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-white/12"
              >
                Keep hosting
              </button>
              <button
                type="button"
                onClick={confirmHostCancellation}
                className="min-h-12 rounded-[16px] border border-[var(--rp-primary)]/45 bg-[var(--rp-primary)]/14 px-4 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-primary)]/20"
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {showRideAppEstimateModal ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/64 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ride-app-estimate-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowRideAppEstimateModal(false);
          }}
        >
          <section className="max-h-[calc(100vh-2rem)] w-full max-w-[380px] overflow-y-auto rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.44)]">
            <h2 id="ride-app-estimate-title" className="text-2xl font-black leading-tight">
              Update total estimate
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Enter the estimate from Ride App. Final ride fare is paid after the ride.
            </p>
            <label className="mt-5 block">
              <span className="text-sm font-black text-[var(--rp-text)]">Estimate from Ride App</span>
              <div className="mt-2 flex h-13 w-full items-center overflow-hidden rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] transition focus-within:border-cyan-300">
                <span className="shrink-0 pl-4 pr-2 text-base font-black text-[var(--rp-muted-strong)]">HK$</span>
                <input
                  value={rideAppEstimateDraft}
                  onChange={(event) => {
                    setRideAppEstimateDraft(getRideAppEstimateNumberInput(event.target.value));
                    setRideAppEstimateError(null);
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="140"
                  className="h-full min-w-0 flex-1 bg-transparent pr-4 text-base font-black text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)]"
                />
              </div>
            </label>
            <div className="mt-4 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[var(--rp-text)]">Screenshot proof</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
                    Optional. Add the ride app fare screen if you want riders to see the source.
                  </p>
                  {rideAppEstimateScreenshotDraftName ? (
                    <div className="mt-3 flex min-h-10 items-center justify-between gap-3 rounded-[14px] border border-cyan-200/20 bg-cyan-300/8 px-3 py-2">
                      <span className="min-w-0 truncate text-xs font-black text-cyan-100">
                        {rideAppEstimateScreenshotDraftName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRideAppEstimateScreenshotDraftName(null);
                          setRideAppEstimateScreenshotDraftPreviewUrl(null);
                        }}
                        aria-label="Remove screenshot"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-black/20 text-[var(--rp-muted-strong)] transition hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  {rideAppEstimateScreenshotDraftPreviewUrl ? (
                    <div
                      className="mt-3 aspect-[16/10] w-full rounded-[14px] border border-white/12 bg-cover bg-center"
                      style={{ backgroundImage: `url(${rideAppEstimateScreenshotDraftPreviewUrl})` }}
                      role="img"
                      aria-label="Selected ride app screenshot preview"
                    />
                  ) : null}
                  <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-[14px] border border-[var(--rp-border-strong)] bg-[rgba(255,255,255,0.04)] px-4 text-xs font-black text-[var(--rp-primary)] transition hover:border-[var(--rp-primary)]/60 hover:bg-[var(--rp-primary)]/10">
                    {rideAppEstimateScreenshotDraftName ? "Edit Photo" : "Upload screenshot"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = "";
                        if (!file) return;

                        setRideAppEstimateScreenshotDraftName(file.name);
                        setRideAppEstimateError(null);
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setRideAppEstimateScreenshotDraftPreviewUrl(reader.result);
                          }
                        };
                        reader.onerror = () => {
                          setRideAppEstimateScreenshotDraftPreviewUrl(null);
                          setRideAppEstimateError("Could not load the screenshot preview. Try another image.");
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            {rideAppEstimateError ? (
              <p className="mt-3 rounded-[14px] border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">
                {rideAppEstimateError}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowRideAppEstimateModal(false)}
                className="min-h-12 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRideAppEstimateUpdate}
                className="min-h-12 rounded-[16px] bg-[linear-gradient(180deg,#7de8ff_0%,#38bdf8_100%)] text-sm font-black text-[#061019] shadow-[0_14px_30px_rgba(56,189,248,0.22)] transition hover:brightness-105"
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {showRideAppFareProofModal && rideAppFareProof ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/88 px-3 py-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Ride app screenshot proof"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowRideAppFareProofModal(false);
          }}
        >
          <section className="relative h-[min(92dvh,860px)] w-[min(96vw,560px)] overflow-hidden rounded-[24px] border border-cyan-200/18 bg-black shadow-[0_28px_80px_rgba(0,0,0,0.58)]">
            <button
              type="button"
              onClick={() => setShowRideAppFareProofModal(false)}
              aria-label="Close screenshot proof"
              className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/16 bg-black/55 text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition hover:border-cyan-200/35 hover:bg-black/70"
            >
              <X className="h-5 w-5" />
            </button>
            {rideAppFareProof.previewUrl ? (
              <div
                className="h-full w-full bg-black bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${rideAppFareProof.previewUrl})` }}
                role="img"
                aria-label="Ride app fare screenshot proof"
              />
            ) : (
              <div className="h-full w-full bg-black" />
            )}
          </section>
        </div>
      ) : null}
      {showJoinedModal ? <JoinedPodModal onConfirm={() => setShowJoinedModal(false)} /> : null}
    </div>
  );
}
