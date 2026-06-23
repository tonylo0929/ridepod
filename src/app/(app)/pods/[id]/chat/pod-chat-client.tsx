"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, MessageCircle, Send, Smartphone, UserCheck } from "lucide-react";
import { SelfSettleCompletionCard } from "@/components/self-settle-completion-card";
import { SelfSettleReportIssue } from "@/components/self-settle-report-issue";
import { getNormalizedRouteRequests, type HomeRide, type RideAppChecklist } from "@/lib/home-ride-mock";
import { notifyPodAudience } from "@/lib/notifications/pod-notification-fanout";
import { getRideAppChatAccessState, type RideAppChatAccessState } from "@/lib/ride-app-chat-unlock";
import { applyRideAppDemoPersona } from "@/lib/ride-app-demo-persona";
import type { TaxiPartnerChatAccessState } from "@/lib/taxi-partner-chat-unlock";
import { getTaxiPartnerLockedChatBody } from "@/lib/taxi-partner-chat-unlock";
import { createRideAppTrustEvent } from "@/lib/ride-app-trust";
import type { RidePodLiveUpdateRow, RidePodMemberStatusRow } from "@/lib/supabase/types";
import { canUserAccessPodUpdates, createPodLiveUpdate, listPodLiveUpdates } from "@/lib/updates/ridepod-live-updates";
import {
  createPodStatusUpdate,
  listPodMemberStatuses,
  podMemberStatusLabels,
  type PodMemberStatus,
} from "@/lib/updates/ridepod-member-status";
import { useAuth } from "@/providers/AuthProvider";

const quickStatuses: PodMemberStatus[] = ["on_my_way", "arrived", "running_late", "cant_find_pickup", "not_coming"];
const rideAppQuickMessages = [
  "Please confirm gather point",
  "What ride app should we use?",
  "What is the estimated fare?",
  "Who will book?",
  "Equal split?",
  "Payment method after ride?",
  "Who receives payment after ride?",
];
const rideAppChecklistItems: Array<{ key: keyof RideAppChecklist; label: string }> = [
  { key: "pickupPoint", label: "Gather point" },
  { key: "dropoffPoint", label: "Drop-off point" },
  { key: "rideApp", label: "Ride app to use" },
  { key: "estimatedFare", label: "Estimated fare" },
  { key: "booker", label: "Who books the ride" },
  { key: "fareSplit", label: "Fare split" },
  { key: "paymentMethod", label: "Payment method after ride" },
  { key: "paymentRecipientAfterRide", label: "Who receives payment after ride" },
  { key: "meetingTime", label: "Meeting time" },
];

function emptyRideAppChecklist(): RideAppChecklist {
  return {
    pickupPoint: false,
    dropoffPoint: false,
    rideApp: false,
    estimatedFare: false,
    booker: false,
    fareSplit: false,
    paymentMethod: false,
    paymentRecipientAfterRide: false,
    meetingTime: false,
    updatedAt: null,
    updatedBy: null,
  };
}

function timeLabel(value: string | null) {
  if (!value) return "now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

type RideAppChatActivityType =
  | "pod_joined"
  | "pod_left"
  | "booking_details_shared"
  | "gather_point_set"
  | "gather_point_updated"
  | "fare_estimate_updated"
  | "fare_screenshot_added"
  | "fare_screenshot_viewed"
  | "ride_details_confirmed"
  | "ride_details_needs_review"
  | "seat_hold_expired"
  | "rejoin_requested"
  | "stop_requested"
  | "stop_approved"
  | "stop_declined"
  | "stop_withdrawn"
  | "stop_expired"
  | "host_cancellation"
  | "chat_unlocked"
  | "ride_app_booked"
  | "system_note";

type RideAppTimelineEvent = {
  id: string;
  type: RideAppChatActivityType | "coordination_note";
  kind: "system" | "chat";
  actorName?: string;
  text: string;
  timestampLabel: string;
  sortTime: number;
  mine?: boolean;
  visibility: "pod_members" | "confirmed_riders" | "host_only";
  metadata?: {
    fareEstimate?: string;
    gatherPoint?: string;
    stopLocation?: string;
    screenshotFileName?: string;
  };
};

function safeDateMs(value?: string | null, fallbackOffsetMinutes = 0) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }

  return Date.now() + fallbackOffsetMinutes * 60 * 1000;
}

function getRideAppFareEstimateText(ride: HomeRide) {
  if (ride.estimatedRideAppFare?.trim()) return ride.estimatedRideAppFare.trim();
  if (ride.rideAppBookingDetails?.estimatedFare?.trim()) return ride.rideAppBookingDetails.estimatedFare.trim();
  if (typeof ride.rideAppEstimatedFareTotal === "number") return `HK$${ride.rideAppEstimatedFareTotal}`;
  if (typeof ride.rideAppEstimatedFarePerPerson === "number") return `HK$${ride.rideAppEstimatedFarePerPerson} per person`;
  return null;
}

function getRideAppScreenshotFileName(ride: HomeRide) {
  return ride.fareEstimateScreenshot?.fileName ?? ride.rideAppFareEstimateScreenshotName ?? null;
}

function addTimelineEvent(events: RideAppTimelineEvent[], event: Omit<RideAppTimelineEvent, "timestampLabel">) {
  events.push({
    ...event,
    timestampLabel: timeLabel(new Date(event.sortTime).toISOString()),
  });
}

function rideAppUpdateText(update: RidePodLiveUpdateRow) {
  const message = update.message?.trim();
  if (message) return message;

  switch (update.update_type) {
    case "joined":
      return "A rider joined the pod.";
    case "left":
      return "A rider left the pod.";
    case "host_update":
      return "Host shared a pod update.";
    case "issue_reported":
      return "An issue was reported.";
    case "settlement_ready":
      return "Ride fare split is ready to review.";
    case "system":
      return "Pod updated.";
    default:
      return "Pod updated.";
  }
}

function buildRideAppTimelineEvents({
  ride,
  updates,
  statuses,
  canShowChatMessages,
  currentUserId,
}: {
  ride: HomeRide | null;
  updates: RidePodLiveUpdateRow[];
  statuses: RidePodMemberStatusRow[];
  canShowChatMessages: boolean;
  currentUserId?: string | null;
}) {
  const events: RideAppTimelineEvent[] = [];
  const baseTime = Date.now() - 45 * 60 * 1000;

  if (ride) {
    const hostName = ride.hostName || "Host";
    const joinedRiders = Array.from(new Set(ride.joinedRiders.filter(Boolean)));

    joinedRiders.forEach((name, index) => {
      addTimelineEvent(events, {
        id: `joined-${name}-${index}`,
        type: "pod_joined",
        kind: "system",
        actorName: name,
        text: `${name} joined the pod.`,
        sortTime: baseTime + index * 3 * 60 * 1000,
        visibility: "pod_members",
      });
    });

    if (ride.bookingDetailsShared || ride.rideAppBookingDetailsFinalized || ride.rideAppBookingDetailsConfirmed) {
      addTimelineEvent(events, {
        id: "booking-details-shared",
        type: "booking_details_shared",
        kind: "system",
        actorName: hostName,
        text: `${hostName} shared booking details.`,
        sortTime: safeDateMs(ride.rideAppBookingDetailsFinalizedAt ?? ride.rideAppBookingDetailsConfirmedAt, -25),
        visibility: "pod_members",
      });
    }

    if (ride.pickupLabel?.trim()) {
      const gatherPoint = ride.pickupLabel.trim();
      const gatherPointUpdated = ride.bookingDetailsUpdated === true && ride.bookingDetailsLastMeaningfulUpdate === "pickup";

      addTimelineEvent(events, {
        id: gatherPointUpdated ? "gather-point-updated" : "gather-point-set",
        type: gatherPointUpdated ? "gather_point_updated" : "gather_point_set",
        kind: "system",
        actorName: hostName,
        text: gatherPointUpdated
          ? `${hostName} updated the gather point. Riders need to review the latest details.`
          : `${hostName} set the gather point: ${gatherPoint}.`,
        sortTime: safeDateMs(ride.rideAppBookingDetailsFinalizedAt ?? ride.rideAppBookingDetailsConfirmedAt, -24),
        visibility: "pod_members",
        metadata: { gatherPoint },
      });
    }

    const fareEstimate = getRideAppFareEstimateText(ride);
    if (fareEstimate) {
      addTimelineEvent(events, {
        id: "fare-estimate-updated",
        type: "fare_estimate_updated",
        kind: "system",
        actorName: hostName,
        text: `${hostName} updated the fare estimate to ${fareEstimate}.`,
        sortTime: safeDateMs(ride.rideAppEstimatedFareUpdatedAt, -20),
        visibility: "pod_members",
        metadata: { fareEstimate },
      });
    }

    const screenshotFileName = getRideAppScreenshotFileName(ride);
    if (screenshotFileName) {
      addTimelineEvent(events, {
        id: "fare-screenshot-added",
        type: "fare_screenshot_added",
        kind: "system",
        actorName: hostName,
        text: `${hostName} added a fare estimate screenshot.`,
        sortTime: safeDateMs(ride.fareEstimateScreenshot?.addedAt ?? ride.rideAppFareEstimateScreenshotAddedAt, -18),
        visibility: "pod_members",
        metadata: { screenshotFileName },
      });
    }

    ride.riderConfirmations?.forEach((rider, index) => {
      if (rider.role !== "rider") return;

      if (rider.status === "confirmed") {
        addTimelineEvent(events, {
          id: `confirmed-${rider.name}-${index}`,
          type: "ride_details_confirmed",
          kind: "system",
          actorName: rider.name,
          text: `${rider.name} confirmed ride details.`,
          sortTime: baseTime + (index + 9) * 3 * 60 * 1000,
          visibility: "pod_members",
        });
      }

      if (rider.status === "needs_review") {
        addTimelineEvent(events, {
          id: `needs-review-${rider.name}-${index}`,
          type: "ride_details_needs_review",
          kind: "system",
          actorName: rider.name,
          text: `${rider.name} needs to review updated details.`,
          sortTime: baseTime + (index + 10) * 3 * 60 * 1000,
          visibility: "pod_members",
        });
      }

      if (rider.status === "seat_hold_expired" || rider.status === "expired") {
        const currentUserReleased = rider.isCurrentUser === true || rider.name.toLowerCase().includes("(you)") || rider.name.trim().toLowerCase() === "you";
        const releasedName = currentUserReleased ? ride.currentUserName?.trim() || "Yuna" : rider.name;
        const releasedPronoun = releasedName.trim().toLowerCase() === "yuna" ? "she" : "they";
        addTimelineEvent(events, {
          id: `seat-expired-${rider.name}-${index}`,
          type: "seat_hold_expired",
          kind: "system",
          actorName: rider.name,
          text: `${releasedName}'s seat was released because ${releasedPronoun} did not confirm in time.`,
          sortTime: safeDateMs(rider.seatHoldExpiredAt, -8 + index),
          visibility: "pod_members",
        });
      }
    });

    if (
      ride.rideAppSeatReleasedAt &&
      !ride.riderConfirmations?.some((rider) => rider.role === "rider" && (rider.status === "seat_hold_expired" || rider.status === "expired"))
    ) {
      const releasedName = ride.rideAppRejoinRequestedBy?.trim() || ride.currentUserName?.trim() || "Yuna";
      const releasedPronoun = releasedName.trim().toLowerCase() === "yuna" ? "she" : "they";
      addTimelineEvent(events, {
        id: "seat-expired-before-rejoin",
        type: "seat_hold_expired",
        kind: "system",
        actorName: releasedName,
        text: `${releasedName}'s seat was released because ${releasedPronoun} did not confirm in time.`,
        sortTime: safeDateMs(ride.rideAppSeatReleasedAt, -8),
        visibility: "pod_members",
      });
    }

    if (ride.rideAppRejoinRequestedAt) {
      const requestedBy = ride.rideAppRejoinRequestedBy?.trim() || ride.currentUserName?.trim() || "Yuna";
      const currentUserRequested =
        ride.currentUserJoinIntentStatus === "joined_interest" &&
        (requestedBy === ride.currentUserName?.trim() || requestedBy.toLowerCase() === "you");
      addTimelineEvent(events, {
        id: "rejoin-requested",
        type: "rejoin_requested",
        kind: "system",
        actorName: currentUserRequested ? "You" : requestedBy,
        text: currentUserRequested ? "You requested to rejoin the pod." : `${requestedBy} requested to rejoin the pod.`,
        sortTime: safeDateMs(ride.rideAppRejoinRequestedAt, -7),
        visibility: "pod_members",
      });
    }

    getNormalizedRouteRequests(ride).all.forEach((request, index) => {
      const requestedBy = request.requestedByName || "A rider";
      const stopLocation = request.stopLocation;
      const baseRouteRequestEvent = {
        kind: "system" as const,
        visibility: "pod_members" as const,
        metadata: { stopLocation },
      };

      if (request.status === "pending") {
        addTimelineEvent(events, {
          ...baseRouteRequestEvent,
          id: `stop-requested-${request.id}`,
          type: "stop_requested",
          actorName: requestedBy,
          text: `${requestedBy} requested a stop: ${stopLocation}.`,
          sortTime: baseTime + (31 + index) * 60 * 1000,
        });
        return;
      }

      if (request.status === "approved") {
        addTimelineEvent(events, {
          ...baseRouteRequestEvent,
          id: `stop-approved-${request.id}`,
          type: "stop_approved",
          actorName: request.reviewedByName ?? hostName,
          text: `${request.reviewedByName ?? hostName} approved ${requestedBy}'s stop request. Riders need to review updated details.`,
          sortTime: baseTime + (34 + index) * 60 * 1000,
        });
        return;
      }

      if (request.status === "declined") {
        addTimelineEvent(events, {
          ...baseRouteRequestEvent,
          id: `stop-declined-${request.id}`,
          type: "stop_declined",
          actorName: request.reviewedByName ?? hostName,
          text: `${request.reviewedByName ?? hostName} declined ${requestedBy}'s stop request.`,
          sortTime: baseTime + (34 + index) * 60 * 1000,
        });
        return;
      }

      if (request.status === "withdrawn") {
        addTimelineEvent(events, {
          ...baseRouteRequestEvent,
          id: `stop-withdrawn-${request.id}`,
          type: "stop_withdrawn",
          actorName: requestedBy,
          text: `${requestedBy} withdrew the stop request.`,
          sortTime: baseTime + (33 + index) * 60 * 1000,
        });
        return;
      }

      if (request.status === "expired") {
        addTimelineEvent(events, {
          ...baseRouteRequestEvent,
          id: `stop-expired-${request.id}`,
          type: "stop_expired",
          actorName: hostName,
          text: `Stop request expired because the route is locked.`,
          sortTime: baseTime + (33 + index) * 60 * 1000,
        });
      }
    });

    const hostCancellationActivity = ride.rideAppHostCancellationActivity?.length
      ? ride.rideAppHostCancellationActivity
      : ride.rideAppHostCancellationStatus === "cancelled"
        ? [`${hostName} stepped down as host.`, "Host replacement mode started.", "Pod cancelled because no new booker was selected."]
        : ride.rideAppHostCancellationStatus === "host_replacement_needed"
          ? [`${hostName} stepped down as host.`, "Host replacement mode started."]
          : ride.rideAppHostCancellationStatus === "replacement_booker_selected"
            ? [`${hostName} stepped down as host.`, "Host replacement mode started.", `${ride.rideAppReplacementBookerName ?? "Yuna"} became the new booker.`]
            : ride.rideAppHostCancellationStatus === "host_cancelled"
              ? [`${hostName} cancelled the pod.`]
              : [];

    hostCancellationActivity.forEach((item, index) => {
      addTimelineEvent(events, {
        id: `host-cancellation-${index}`,
        type: "host_cancellation",
        kind: "system",
        actorName: index === 2 ? ride.rideAppReplacementBookerName ?? undefined : hostName,
        text: item,
        sortTime: baseTime + (36 + index) * 60 * 1000,
        visibility: "pod_members",
      });
    });

    if (ride.rideAppJoinLeaveActivitySummary?.trim()) {
      addTimelineEvent(events, {
        id: "join-leave-summary",
        type: "system_note",
        kind: "system",
        actorName: ride.currentUserName ?? undefined,
        text: ride.rideAppJoinLeaveActivitySummary.trim(),
        sortTime: safeDateMs(ride.lastLeftAt ?? ride.rideAppRejoinRequestedAt ?? null, -4),
        visibility: "pod_members",
      });
    }

    if (ride.rideAppPodStatus === "chat_unlocked" || ride.chatUnlockedAt) {
      addTimelineEvent(events, {
        id: "chat-unlocked",
        type: "chat_unlocked",
        kind: "system",
        text: "Chat unlocked. Required riders confirmed.",
        sortTime: safeDateMs(ride.chatUnlockedAt, -5),
        visibility: "pod_members",
      });
    }

    if (ride.rideAppPodStatus === "ride_booked") {
      addTimelineEvent(events, {
        id: "ride-app-booked",
        type: "ride_app_booked",
        kind: "system",
        actorName: hostName,
        text: `${hostName} marked the ride app as booked.`,
        sortTime: safeDateMs(null, -2),
        visibility: "confirmed_riders",
      });
    }
  }

  updates.forEach((update) => {
    if (update.update_type.startsWith("taxi_") || update.update_type === "quote_accepted" || update.update_type === "all_guests_accepted") {
      return;
    }

    const sortTime = safeDateMs(update.created_at);

    if (update.update_type === "coordination_note") {
      if (!canShowChatMessages) return;

      addTimelineEvent(events, {
        id: `chat-${update.id}`,
        type: "coordination_note",
        kind: "chat",
        actorName: update.user_id === currentUserId ? "You" : "Rider",
        text: update.message ?? "Coordination note.",
        sortTime,
        mine: update.user_id === currentUserId,
        visibility: "pod_members",
      });
      return;
    }

    addTimelineEvent(events, {
      id: `update-${update.id}`,
      type: "system_note",
      kind: "system",
      text: rideAppUpdateText(update),
      sortTime,
      visibility: "pod_members",
    });
  });

  statuses.forEach((status) => {
    addTimelineEvent(events, {
      id: `status-${status.id}`,
      type: "system_note",
      kind: "system",
      text: status.message?.trim() || `${podMemberStatusLabels[status.status as PodMemberStatus] ?? status.status}.`,
      sortTime: safeDateMs(status.updated_at),
      visibility: "pod_members",
    });
  });

  if (!events.length) {
    addTimelineEvent(events, {
      id: "empty-system-note",
      type: "system_note",
      kind: "system",
      text: "Pod activity will appear here.",
      sortTime: Date.now(),
      visibility: "pod_members",
    });
  }

  return events.sort((a, b) => a.sortTime - b.sortTime);
}

function rideAppChatDividerLabel(access: RideAppChatAccessState | null, canUseChat: boolean) {
  if (canUseChat) return "Chat is Open";
  if (!access) return "Chat is read-only until riders confirm";
  const remaining = Math.max(0, access.requiredConfirmations - access.confirmedRiders);
  if (remaining > 0) return `Chat is read-only until ${remaining} ${remaining === 1 ? "rider confirms" : "riders confirm"}`;
  return "Chat is read-only until riders confirm";
}

function hasRideAppChatMembership(ride: HomeRide | null, currentUserRole: HomeRide["currentUserRole"] | null) {
  if (currentUserRole === "host" || ride?.currentUserRole === "host") return true;
  if (!ride) return currentUserRole === "joined_rider";

  return (
    ride.currentUserJoined === true ||
    ride.currentUserRole === "joined_rider" ||
    ride.quoteStatus === "joined" ||
    ride.currentUserJoinIntentStatus === "joined_interest" ||
    ride.currentUserJoinIntentStatus === "confirmed" ||
    ride.currentUserJoinIntentStatus === "needs_review"
  );
}

export function PodChatClient({
  podId,
  routeLabel,
  timeLabel: tripTimeLabel,
  readOnly,
  isRideAppSelfSettle = false,
  isTaxiPartnerChat = false,
  currentUserRole = null,
  initialRideAppChecklist = null,
  bookingDetailsShared = false,
  bookingDetailsSummary = null,
  rideAppChatAccess = null,
  taxiPartnerChatAccess = null,
  ride = null,
}: {
  podId: string;
  routeLabel: string;
  timeLabel: string;
  readOnly: boolean;
  isRideAppSelfSettle?: boolean;
  isTaxiPartnerChat?: boolean;
  currentUserRole?: HomeRide["currentUserRole"] | null;
  initialRideAppChecklist?: RideAppChecklist | null;
  bookingDetailsShared?: boolean;
  bookingDetailsSummary?: {
    pickupVenue?: string;
    eta?: string;
    estimatedFare?: string;
    splitMethod?: string;
    paymentMethod?: string;
    bookingNote?: string;
  } | null;
  rideAppChatAccess?: RideAppChatAccessState | null;
  taxiPartnerChatAccess?: TaxiPartnerChatAccessState | null;
  ride?: HomeRide | null;
}) {
  const { user, profile, isLoading } = useAuth();
  const effectiveRide = ride ? applyRideAppDemoPersona(ride, { profile, user }) : null;
  const effectiveCurrentUserRole = effectiveRide?.currentUserRole ?? currentUserRole;
  const effectiveRideAppChatAccess =
    effectiveRide && isRideAppSelfSettle ? getRideAppChatAccessState(effectiveRide) : rideAppChatAccess;
  const [updates, setUpdates] = useState<RidePodLiveUpdateRow[]>([]);
  const [statuses, setStatuses] = useState<RidePodMemberStatusRow[]>([]);
  const [message, setMessage] = useState("");
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [sending, setSending] = useState(false);
  const [rideAppChecklist, setRideAppChecklist] = useState<RideAppChecklist>(
    initialRideAppChecklist ?? emptyRideAppChecklist(),
  );
  const [updatingChecklist, setUpdatingChecklist] = useState<keyof RideAppChecklist | null>(null);
  const [checklistCompletedUpdateSent, setChecklistCompletedUpdateSent] = useState(false);
  const isHost = effectiveCurrentUserRole === "host";
  const rideAppChecklistComplete = rideAppChecklistItems.every((item) => rideAppChecklist[item.key] === true);
  const strictRideAppChatUnlocked = !isRideAppSelfSettle || effectiveRideAppChatAccess?.canAccess === true;
  const strictTaxiPartnerChatUnlocked = !isTaxiPartnerChat || taxiPartnerChatAccess?.canAccess === true;
  const rideAppChatMembership = isRideAppSelfSettle && hasRideAppChatMembership(effectiveRide, effectiveCurrentUserRole);
  const effectiveAccessAllowed = accessAllowed || rideAppChatMembership;
  const canUseChat = effectiveAccessAllowed && strictRideAppChatUnlocked && strictTaxiPartnerChatUnlocked;
  const chatHeaderStatusLabel = isRideAppSelfSettle
    ? canUseChat
      ? "Chat open"
      : "Read-only"
    : isTaxiPartnerChat
      ? canUseChat
        ? "Chat open"
        : "Read-only"
      : null;
  const rideAppTimelineEvents = isRideAppSelfSettle
    ? buildRideAppTimelineEvents({
        ride: effectiveRide,
        updates,
        statuses,
        canShowChatMessages: canUseChat,
        currentUserId: user?.id,
      })
    : [];
  const composerPlaceholder = readOnly
    ? "This pod is read-only."
    : isRideAppSelfSettle && !canUseChat
      ? effectiveRideAppChatAccess?.helper ?? "Chat unlocks after required riders confirm."
      : canUseChat
        ? "Type a message..."
        : "Chat is locked.";
  const currentUserDisplayName =
    profile?.display_name?.trim() ||
    profile?.preferred_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Someone";

  async function notifyChatMessage(body: string) {
    if (!user) return;

    await notifyPodAudience({
      podId,
      actorUserId: user.id,
      actorDisplayName: currentUserDisplayName,
      type: "pod_chat_message",
      audiences: ["others"],
      title: `${currentUserDisplayName} sent a message`,
      body,
      relatedUrl: `/pods/${podId}/chat`,
      metadata: {
        action: "chat_message",
        route: routeLabel,
      },
      dedupe: false,
    });
  }

  async function refresh() {
    if (!user) return;

    const [allowed, updateResult, statusResult] = await Promise.all([
      canUserAccessPodUpdates(user.id, podId),
      listPodLiveUpdates(podId),
      listPodMemberStatuses(podId),
    ]);
    setAccessAllowed(allowed);
    setUpdates(updateResult.updates);
    setStatuses(statusResult.statuses);
    void updateResult.fallbackNote;
    void statusResult.fallbackNote;
  }

  useEffect(() => {
    function onChanged() {
      void refresh();
    }

    const initialRefresh = window.setTimeout(onChanged, 0);
    window.addEventListener("focus", onChanged);
    window.addEventListener("ridepod:updates-changed", onChanged);

    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("focus", onChanged);
      window.removeEventListener("ridepod:updates-changed", onChanged);
    };
    // refresh is intentionally closed over current user and pod ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podId, user?.id]);

  async function sendMessage() {
    const body = message.trim();
    if (!body || !user || readOnly || !canUseChat) return;

    setSending(true);
    await createPodLiveUpdate({
      podId,
      userId: user.id,
      updateType: "coordination_note",
      message: body,
    });
    await notifyChatMessage(body);
    setMessage("");
    await refresh();
    setSending(false);
  }

  async function sendQuickMessage(body: string) {
    if (!user || readOnly || !canUseChat || sending) return;

    setSending(true);
    await createPodLiveUpdate({
      podId,
      userId: user.id,
      updateType: "coordination_note",
      message: body,
    });
    await notifyChatMessage(body);
    await refresh();
    setSending(false);
  }

  async function sendStatus(status: PodMemberStatus) {
    if (!user || readOnly || !canUseChat) return;

    setSending(true);
    await createPodStatusUpdate(podId, user.id, status);
    await refresh();
    setSending(false);
  }

  async function toggleChecklistItem(key: keyof RideAppChecklist) {
    if (!user || !isRideAppSelfSettle || !isHost || readOnly || !canUseChat || updatingChecklist) return;

    setUpdatingChecklist(key);
    const nextChecklist = {
      ...rideAppChecklist,
      [key]: !rideAppChecklist[key],
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    setRideAppChecklist(nextChecklist);

    const completed = rideAppChecklistItems.every((item) => nextChecklist[item.key] === true);
    if (completed && !checklistCompletedUpdateSent) {
      createRideAppTrustEvent({
        userId: user.id,
        podId,
        eventType: "ride_app_checklist_completed",
        reason: "Host completed the self-settle checklist.",
        createdBy: user.id,
      });
      await createPodLiveUpdate({
        podId,
        userId: user.id,
        updateType: "system",
        message:
          "Self-settle checklist completed. Please follow the agreed details and settle the final ride fare after the ride directly with the booker.",
        metadata: {
          rideAppChecklist: nextChecklist,
        },
      });
      await notifyPodAudience({
        podId,
        actorUserId: user.id,
        actorDisplayName: currentUserDisplayName,
        type: "ride_app_details_updated",
        audiences: ["actor", "others"],
        title: "Booking checklist completed",
        body: `${currentUserDisplayName} completed the booking checklist for ${routeLabel}.`,
        selfTitle: "You completed the booking checklist",
        selfBody: "Riders can follow the agreed details.",
        relatedUrl: `/pods/${podId}/chat`,
        metadata: {
          action: "checklist_completed",
          route: routeLabel,
        },
      });
      setChecklistCompletedUpdateSent(true);
      await refresh();
    }

    setUpdatingChecklist(null);
  }

  if (isLoading) {
    return <div className="mx-auto max-w-[720px] rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5" />;
  }

  if (!user) {
    return (
      <div className="mx-auto grid max-w-[520px] gap-4">
        <ChatHeader
          podId={podId}
          routeLabel={routeLabel}
          timeLabel={tripTimeLabel}
          title={isTaxiPartnerChat ? "Taxi partner chat" : "Ride Chat"}
          statusLabel={null}
        />
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-center">
          <LockKeyhole className="mx-auto h-8 w-8 text-[var(--rp-primary)]" />
          <h2 className="mt-3 text-2xl font-black text-[var(--rp-text)]">Log in to open Ride Chat.</h2>
          <Link
            href={`/login?next=/pods/${encodeURIComponent(podId)}/chat`}
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--rp-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
          >
            Log in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[760px] gap-4 pb-4">
      <ChatHeader
        podId={podId}
        routeLabel={routeLabel}
        timeLabel={tripTimeLabel}
        title={isTaxiPartnerChat ? "Taxi partner chat" : "Ride Chat"}
        statusLabel={chatHeaderStatusLabel}
      />

      {isTaxiPartnerChat && accessAllowed && !strictTaxiPartnerChatUnlocked ? (
        <section className="rounded-[24px] border border-[var(--rp-primary)]/25 bg-[linear-gradient(145deg,rgba(242,193,91,0.16),rgba(15,23,42,0.74))] p-5 text-center shadow-[var(--rp-shadow-soft)]">
          <LockKeyhole className="mx-auto h-9 w-9 text-[var(--rp-primary)]" />
          <h2 className="mt-3 text-2xl font-black text-[var(--rp-text)]">Taxi partner chat locked</h2>
          <p className="mx-auto mt-2 max-w-[520px] text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            {getTaxiPartnerLockedChatBody(taxiPartnerChatAccess?.reason ?? "not_joined")}
          </p>
          <div className="mt-4 inline-flex rounded-full border border-[var(--rp-primary)]/25 bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-4 py-2 text-xs font-black text-[var(--rp-primary)]">
            {taxiPartnerChatAccess?.statusLabel ?? "Chat locked"}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href={`/pods/${encodeURIComponent(podId)}`}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--rp-primary)]/25 bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-5 text-sm font-black text-[var(--rp-primary)]"
            >
              View pod
            </Link>
            <Link
              href="/chats"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-5 text-sm font-black text-[var(--rp-muted-strong)]"
            >
              Back to chats
            </Link>
          </div>
        </section>
      ) : null}

      {isTaxiPartnerChat && canUseChat ? (
        <section className="rounded-[22px] border border-[var(--rp-primary)]/20 bg-[linear-gradient(145deg,rgba(242,193,91,0.12),rgba(15,23,42,0.62))] p-4 shadow-[var(--rp-shadow-soft)]">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--rp-primary)]/30 bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-[var(--rp-text)]">Taxi partner chat</h2>
                <span className="rounded-full border border-[var(--rp-primary)]/25 bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
                  Ready for pickup
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Taxi partner accepted the ride. Use chat for pickup coordination. Live GPS is not enabled.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {false ? (
        <section className="rounded-[22px] border border-blue-300/20 bg-[linear-gradient(145deg,rgba(59,130,246,0.12),rgba(15,23,42,0.46))] p-4 shadow-[var(--rp-shadow-soft)]">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-300/30 bg-blue-400/12 text-blue-100">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-[var(--rp-text)]">
                  {effectiveRideAppChatAccess?.statusLabel ?? (bookingDetailsShared ? "Booking details shared" : "Chat open")}
                </h2>
                <span className="rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-100">
                  Ride app
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {bookingDetailsShared
                  ? "Use chat to gather at the gather point before the host books."
                  : "Use chat to agree on gather point, fare split, and who books the ride app."}
              </p>
            </div>
          </div>

          {bookingDetailsShared ? (
            <div className="mt-4 grid justify-items-center gap-2 border-t border-blue-300/15 pt-4 text-center">
              <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-xs font-black text-blue-100">
                Booking details shared
              </span>
              {bookingDetailsSummary?.pickupVenue || bookingDetailsSummary?.eta ? (
                <p className="max-w-[620px] text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                  {[
                    bookingDetailsSummary?.pickupVenue ? `Gather point: ${bookingDetailsSummary?.pickupVenue}` : null,
                    bookingDetailsSummary?.eta ? `ETA: ${bookingDetailsSummary?.eta}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : (
                <p className="max-w-[620px] text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                  Gather point and ETA can be confirmed in chat.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {!effectiveAccessAllowed ? (
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-center">
          <LockKeyhole className="mx-auto h-8 w-8 text-[var(--rp-primary)]" />
          <h2 className="mt-3 text-xl font-black text-[var(--rp-text)]">
            {isRideAppSelfSettle ? "Join this pod to view chat updates." : "Only pod members can send messages."}
          </h2>
          <p className="mt-2 text-sm font-semibold text-[var(--rp-muted)]">
            {isRideAppSelfSettle ? "Pod activity is visible to pod members only." : "You can still return to the pod detail page."}
          </p>
        </section>
      ) : null}

      {isRideAppSelfSettle && effectiveAccessAllowed ? (
        <section className="rounded-[24px] bg-[linear-gradient(180deg,rgba(8,47,73,0.14),rgba(15,23,42,0.52))] px-2 py-3 shadow-[var(--rp-shadow-soft)]">
          <div className="mb-3 grid justify-items-center">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--rp-muted-strong)]">
              Today
            </span>
          </div>
          <div className="grid gap-2.5">
            <RideAppChatStateDivider
              label={rideAppChatDividerLabel(effectiveRideAppChatAccess, canUseChat)}
              open={canUseChat}
            />
            {rideAppTimelineEvents.map((event) => (
              <RideAppTimelineMessage key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : null}

      {isRideAppSelfSettle && canUseChat ? (
        <section className="overflow-hidden rounded-[24px] border border-blue-300/25 bg-[linear-gradient(145deg,rgba(76,29,149,0.20),rgba(14,23,42,0.78)_45%,rgba(37,99,235,0.14))] shadow-[var(--rp-shadow-soft)]">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-[var(--rp-text)]">Self-settle checklist</h2>
                  <span className="inline-flex min-h-7 items-center rounded-full border border-blue-300/35 bg-blue-400/12 px-3 text-xs font-black text-blue-100">
                    {rideAppChecklistComplete ? "Ready to book" : "Ride app"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  {rideAppChecklistComplete
                    ? "Your group has confirmed the key self-settle details. Ride fare should still be settled after the ride with the booker."
                    : "Confirm these details with your group before booking or starting the ride."}
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-100">
                <Smartphone className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-4 divide-y divide-blue-300/15 rounded-[18px] border border-blue-300/15 bg-[rgba(2,6,23,0.34)]">
              {rideAppChecklistItems.map((item) => {
                const agreed = rideAppChecklist[item.key] === true;

                return (
                  <div key={item.key} className="flex items-center justify-between gap-3 p-3">
                    <span className="min-w-0 text-sm font-black text-[var(--rp-text)]">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(item.key)}
                      disabled={!isHost || readOnly || !canUseChat || Boolean(updatingChecklist)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black transition ${
                        agreed
                          ? "border-blue-300/35 bg-blue-400/16 text-blue-100"
                          : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]"
                      } disabled:cursor-default disabled:opacity-80`}
                    >
                      {agreed ? "Agreed" : "To confirm"}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
              {isHost
                ? "Only the host can update checklist status."
                : effectiveCurrentUserRole
                  ? "Ask the host in chat if something needs to be updated."
                  : "Ask the host in chat if something needs to be updated."}
            </p>
            {!effectiveCurrentUserRole ? (
              // TODO: wire host-only checklist updates to authenticated pod membership roles when role detection is available here.
              null
            ) : null}
            <p className="mt-3 rounded-[14px] border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs font-black leading-5 text-blue-100">
              Ride fare should be settled after the ride directly with the booker. RidePod join fee is separate from the ride fare.
            </p>
            <div className="mt-3 border-t border-blue-300/15 pt-3">
              <SelfSettleReportIssue
                podId={podId}
                routeLabel={routeLabel}
                rideDateTime={tripTimeLabel}
                chatHref={`/pods/${podId}/chat`}
                currentUserRole={effectiveCurrentUserRole}
                canSubmit={canUseChat}
                triggerLabel="Report an issue"
              />
            </div>
          </div>
        </section>
      ) : null}

      {effectiveRide && isRideAppSelfSettle && canUseChat ? (
        <SelfSettleCompletionCard
          ride={effectiveRide}
          currentUserRole={effectiveCurrentUserRole}
          canSubmit={canUseChat}
          chatHref={`/pods/${podId}/chat`}
          onQuickMessage={sendQuickMessage}
          compact
        />
      ) : null}

      {!isRideAppSelfSettle ? (
      <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Latest member status</h2>
          {readOnly ? <span className="text-xs font-black text-[var(--rp-muted)]">This pod is read-only.</span> : null}
        </div>
        {statuses.length ? (
          <div className="mt-3 grid gap-2">
            {statuses.map((status) => (
              <div key={status.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--rp-card-soft)] p-3">
                <span className="flex items-center gap-2 text-sm font-black text-[var(--rp-text)]">
                  <UserCheck className="h-4 w-4 text-[var(--rp-primary)]" />
                  {podMemberStatusLabels[status.status as PodMemberStatus] ?? status.status}
                </span>
                <span className="text-xs font-bold text-[var(--rp-muted)]">{timeLabel(status.updated_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-[var(--rp-card-soft)] p-3 text-sm font-semibold text-[var(--rp-muted)]">
            No member statuses yet.
          </p>
        )}
      </section>
      ) : null}

      {!isRideAppSelfSettle ? (
      <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Pod activity</h2>
        <div className="mt-3 grid gap-3">
          {updates.length ? (
            updates.map((update) => (
              <article key={update.id} className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">
                    {update.update_type.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs font-bold text-[var(--rp-muted)]">{timeLabel(update.created_at)}</span>
                </div>
                <p className="mt-1 text-sm font-black leading-6 text-[var(--rp-text)]">{update.message ?? "Pod update"}</p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl bg-[var(--rp-card-soft)] p-3 text-sm font-semibold text-[var(--rp-muted)]">
              No pod activity yet.
            </p>
          )}
        </div>
      </section>
      ) : null}

      <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        {(!isRideAppSelfSettle || canUseChat) ? (
        <div className="grid gap-2">
          <p className="text-sm font-black text-[var(--rp-text)]">Quick status</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => sendStatus(status)}
                disabled={readOnly || !canUseChat || sending}
                className="shrink-0 rounded-full border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-3 py-2 text-xs font-black text-[var(--rp-primary)] disabled:opacity-50"
              >
                {podMemberStatusLabels[status]}
              </button>
            ))}
          </div>
        </div>
        ) : null}

        {isRideAppSelfSettle && canUseChat ? (
          <div className="mt-4 grid gap-2 border-t border-[var(--rp-border)] pt-4">
            <p className="text-sm font-black text-[var(--rp-text)]">Ride app quick messages</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {rideAppQuickMessages.map((body) => (
                <button
                  key={body}
                  type="button"
                  onClick={() => sendQuickMessage(body)}
                  disabled={readOnly || !canUseChat || sending}
                  className="shrink-0 rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-100 disabled:opacity-50"
                >
                  {body}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isRideAppSelfSettle && !canUseChat ? (
          <button
            type="button"
            disabled
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--rp-primary)]/28 bg-[var(--rp-primary)]/10 px-4 text-sm font-black text-[var(--rp-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            <LockKeyhole className="h-4 w-4" />
            Chat unlocks after required riders confirm.
          </button>
        ) : (
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={readOnly || !canUseChat}
              placeholder={composerPlaceholder}
              className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-semibold text-[var(--rp-text)] outline-none focus:border-[var(--rp-primary)] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!message.trim() || readOnly || !canUseChat || sending}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-primary)] text-[var(--rp-primary-text)] disabled:opacity-50"
              aria-label="Send coordination note"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function RideAppChatStateDivider({ label, open }: { label: string; open: boolean }) {
  return (
    <div className="flex items-center gap-3 px-2 py-1" aria-label={label}>
      <span className={open ? "h-px flex-1 bg-cyan-300/24" : "h-px flex-1 bg-white/14"} />
      <button
        type="button"
        disabled
        className={
          open
            ? "shrink-0 rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100 shadow-[0_10px_22px_rgba(34,211,238,0.10)]"
            : "shrink-0 rounded-full border border-white/14 bg-white/[0.075] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)] shadow-[0_10px_22px_rgba(0,0,0,0.14)]"
        }
      >
        {label}
      </button>
      <span className={open ? "h-px flex-1 bg-cyan-300/24" : "h-px flex-1 bg-white/14"} />
    </div>
  );
}

function RideAppTimelineMessage({ event }: { event: RideAppTimelineEvent }) {
  if (event.kind === "chat") {
    return (
      <article className={`flex ${event.mine ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[82%] rounded-[20px] border px-4 py-3 ${
            event.mine
              ? "border-cyan-300/30 bg-cyan-300/14 text-cyan-50"
              : "border-white/10 bg-white/[0.06] text-[var(--rp-text)]"
          }`}
        >
          {!event.mine ? (
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
              {event.actorName ?? "Rider"}
            </p>
          ) : null}
          <p className="text-sm font-semibold leading-6">{event.text}</p>
          <p className="mt-1 text-right text-[10px] font-bold text-[var(--rp-muted)]">{event.timestampLabel}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="grid justify-items-center px-2">
      <div className="max-w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-3 py-2 text-center shadow-[0_10px_22px_rgba(0,0,0,0.12)]">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <UserCheck className="h-3 w-3" />
          </span>
          <p className="max-w-[36ch] text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">{event.text}</p>
        </div>
        {event.metadata?.screenshotFileName ? (
          <p className="mt-1 truncate text-[10px] font-black text-cyan-100">{event.metadata.screenshotFileName}</p>
        ) : null}
        {event.metadata?.stopLocation ? (
          <p className="mt-1 truncate text-[10px] font-black text-cyan-100">{event.metadata.stopLocation}</p>
        ) : null}
        <p className="mt-1 text-[10px] font-bold text-[var(--rp-muted)]">{event.timestampLabel}</p>
      </div>
    </article>
  );
}

function ChatHeader({
  podId,
  routeLabel,
  timeLabel,
  title = "Ride Chat",
  statusLabel = null,
}: {
  podId: string;
  routeLabel: string;
  timeLabel: string;
  title?: string;
  statusLabel?: string | null;
}) {
  return (
    <header className="grid gap-3">
      <Link
        href={`/pods/${encodeURIComponent(podId)}`}
        aria-label="Back to pod details"
        className="grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-white/8 text-white shadow-[0_10px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/12"
      >
        <ArrowLeft className="h-6 w-6" />
      </Link>
      <div className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
            <MessageCircle className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black text-[var(--rp-primary)]">{title}</h1>
              {statusLabel ? (
                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase text-cyan-100">
                  {statusLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-black text-[var(--rp-text)]">{routeLabel}</p>
            <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">{timeLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
