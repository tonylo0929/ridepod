export type ChatFilter = "all" | "joined" | "hosted" | "completed";
export type ChatRole = "joined" | "hosted";
export type ChatStatus = "forming" | "quote_ready" | "pickup_soon" | "completed" | "locked";
export type ChatRideMode = "taxi" | "ride_app";
export type RideBadge = "Airport" | "One-off" | "Recurring";

export type ChatMessage = {
  id: string;
  sender: string;
  body: string;
  time: string;
  mine?: boolean;
  senderRole?: "member" | "taxi_partner";
};

export type PodChatPreview = {
  id: string;
  podId: string;
  route: string;
  role: ChatRole;
  rideMode: ChatRideMode;
  rideBadges: RideBadge[];
  status: ChatStatus;
  timeLabel: string;
  participants: string[];
  extraParticipants?: number;
  latestMessage: string;
  unreadCount?: number;
  roomTitle: string;
  memberCount: number;
  messages: ChatMessage[];
};

const activeRideAppSelfSettleChatPreview = getActiveRideAppSelfSettleChatPreview();

export const podChats: PodChatPreview[] = activeRideAppSelfSettleChatPreview ? [activeRideAppSelfSettleChatPreview] : [];

export function getPodChatById(id: string) {
  return podChats.find((chat) => chat.id === id) ?? null;
}

export function filterPodChats(filter: ChatFilter) {
  if (filter === "completed") return podChats.filter((chat) => chat.status === "completed");
  if (filter === "joined") return podChats.filter((chat) => chat.role === "joined");
  if (filter === "hosted") return podChats.filter((chat) => chat.role === "hosted");
  return podChats;
}
import { getActiveRideAppSelfSettleChatPreview } from "@/lib/ride-app-self-settle-scenarios";
