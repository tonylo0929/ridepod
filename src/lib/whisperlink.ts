export type RoomDuration = "1h" | "24h" | "7d" | "30d";

export type MessageExpiryMode = "room_expiry" | "after_24h" | "after_1h" | "after_read";

export type PrivacySkinId = "default" | "document" | "sheet" | "thread" | "notes" | "focus";

export type PrivacySkin = PrivacySkinId;

export type RoomStatus = "active" | "expired" | "destroyed" | "invalid" | "revoked";

export type PaymentState = "idle" | "processing" | "success" | "failed";

export type ParticipantRole = "creator" | "guest";

export type Participant = {
  id: string;
  label: string;
  role: ParticipantRole;
  initials: string;
  tone: "mint" | "ink";
};

export type Message = {
  id: string;
  participantId: string;
  body: string;
  sentAt: string;
  deliveryState: "sent" | "delivered" | "read";
};

export type RoomSettings = {
  title: string;
  passcodeEnabled: boolean;
  passcode: string;
  messageExpiryMode: MessageExpiryMode;
  defaultPrivacySkin: PrivacySkinId;
  exportEnabled: boolean;
};

export type Room = {
  id: string;
  title: string;
  creatorLabel: string;
  createdAt: string;
  expiresAt: string;
  duration: RoomDuration;
  passcodeEnabled: boolean;
  passcode?: string;
  messageExpiryMode: MessageExpiryMode;
  exportEnabled: boolean;
  privacySkin: PrivacySkinId;
  status: RoomStatus;
  participantCount: number;
  participants: Participant[];
  messages: Message[];
  shareLink: string;
  settings: RoomSettings;
};

export type DurationOption = {
  id: RoomDuration;
  name: string;
  label: string;
  price: string;
  priceCents: number;
  hours: number;
  helper: string;
  recommended?: boolean;
};

export type PrivacySkinOption = {
  id: PrivacySkinId;
  name: string;
  shortName: string;
  description: string;
  trustNote: string;
};

export const durationOptions: DurationOption[] = [
  {
    id: "1h",
    name: "Quick Room",
    label: "1 hour",
    price: "$0.99",
    priceCents: 99,
    hours: 1,
    helper: "For a short, private exchange that should disappear quickly.",
  },
  {
    id: "24h",
    name: "Day Room",
    label: "24 hours",
    price: "$1.99",
    priceCents: 199,
    hours: 24,
    helper: "Enough time to coordinate without keeping a permanent thread.",
  },
  {
    id: "7d",
    name: "Week Room",
    label: "7 days",
    price: "$4.99",
    priceCents: 499,
    hours: 24 * 7,
    helper: "Useful for temporary client, creator, or personal conversations.",
    recommended: true,
  },
  {
    id: "30d",
    name: "Month Room",
    label: "30 days",
    price: "$9.99",
    priceCents: 999,
    hours: 24 * 30,
    helper: "A longer private room that still has a clear end date.",
  },
];

export const messageExpiryOptions: Array<{ id: MessageExpiryMode; label: string; helper: string }> = [
  {
    id: "room_expiry",
    label: "Room expiry",
    helper: "Messages remain available until the room closes.",
  },
  {
    id: "after_24h",
    label: "After 24 hours",
    helper: "Each message disappears one day after it is sent.",
  },
  {
    id: "after_1h",
    label: "After 1 hour",
    helper: "Each message disappears one hour after it is sent.",
  },
  {
    id: "after_read",
    label: "After read",
    helper: "Messages disappear after the recipient opens them.",
  },
];

export const privacySkins: PrivacySkinOption[] = [
  {
    id: "default",
    name: "Default Chat",
    shortName: "Chat",
    description: "A premium private messenger with visible expiry and room controls.",
    trustNote: "Best for normal private conversation.",
  },
  {
    id: "document",
    name: "Document View",
    shortName: "Document",
    description: "Messages appear as generic document comments and revision notes.",
    trustNote: "Display-only. It does not rewrite the original messages.",
  },
  {
    id: "sheet",
    name: "Sheet View",
    shortName: "Sheet",
    description: "Messages appear as rows in a generic spreadsheet or task dashboard.",
    trustNote: "No brand styling, no invented records.",
  },
  {
    id: "thread",
    name: "Thread View",
    shortName: "Thread",
    description: "Messages appear as posts in a generic discussion thread.",
    trustNote: "Useful for screen-safe scanning in public.",
  },
  {
    id: "notes",
    name: "Notes View",
    shortName: "Notes",
    description: "Messages appear as clean private notes and bullets.",
    trustNote: "A calm reading mode for lower visual exposure.",
  },
  {
    id: "focus",
    name: "Focus View",
    shortName: "Focus",
    description: "Sensitive message text is masked until clicked.",
    trustNote: "Masks the display only. Original messages stay unchanged.",
  },
];

export const whisperParticipants: Participant[] = [
  {
    id: "creator",
    label: "Creator",
    role: "creator",
    initials: "C",
    tone: "mint",
  },
  {
    id: "guest",
    label: "Guest",
    role: "guest",
    initials: "G",
    tone: "ink",
  },
];

export const demoMessages: Message[] = [
  {
    id: "m-001",
    participantId: "creator",
    body: "Room is live. I set it to expire tomorrow and left exports off by default.",
    sentAt: "10:18 AM",
    deliveryState: "read",
  },
  {
    id: "m-002",
    participantId: "guest",
    body: "Perfect. I like that I did not have to install anything or share my number.",
    sentAt: "10:19 AM",
    deliveryState: "read",
  },
  {
    id: "m-003",
    participantId: "creator",
    body: "Screen Privacy Mode is on too. The skin only changes how this looks on screen.",
    sentAt: "10:21 AM",
    deliveryState: "delivered",
  },
  {
    id: "m-004",
    participantId: "guest",
    body: "Good. Let us keep the plan here and let the room expire after we are done.",
    sentAt: "10:24 AM",
    deliveryState: "sent",
  },
];

export const WHISPERLINK_ROOM_STORAGE_KEY = "whisperlink.activeRoom.v1";
export const WHISPERLINK_FLOW_STORAGE_KEY = "whisperlink.createFlow.v1";

export const generatedRoomLink = "https://whisperlink.app/r/WL-7KX9Q#demo-key";

export const defaultRoomSettings: RoomSettings = {
  title: "",
  passcodeEnabled: false,
  passcode: "7429",
  messageExpiryMode: "room_expiry",
  defaultPrivacySkin: "default",
  exportEnabled: false,
};

export const demoRoom: Room = {
  id: "wl-demo-47x9",
  title: "WhisperLink private room",
  creatorLabel: "Room creator",
  createdAt: "2026-06-23T02:12:00.000Z",
  expiresAt: "2026-06-24T18:30:00.000Z",
  duration: "24h",
  passcodeEnabled: true,
  passcode: "7429",
  messageExpiryMode: "room_expiry",
  exportEnabled: false,
  privacySkin: "default",
  status: "active",
  participantCount: 2,
  participants: whisperParticipants,
  messages: demoMessages,
  shareLink: generatedRoomLink,
  settings: {
    ...defaultRoomSettings,
    title: "WhisperLink private room",
    passcodeEnabled: true,
    defaultPrivacySkin: "default",
  },
};

export const expiredDemoRoom: Room = {
  ...demoRoom,
  id: "wl-expired-19q2",
  title: "Expired room",
  expiresAt: "2026-06-21T18:30:00.000Z",
  status: "expired",
  participantCount: 0,
  messages: [],
};

export const useCases = [
  "Dating privacy before sharing a number",
  "Sensitive personal conversations",
  "Temporary client or guest chat",
  "Creator or coach private rooms",
  "Private conversations that should expire",
];

export const trustPrinciples = [
  "No app install and no contact sync",
  "No permanent readable record by default",
  "Exports only when intentionally enabled",
  "Room links and screenshots have honest limits",
  "Block, report, and destroy-room controls are visible",
];

export const faqs = [
  {
    question: "Does WhisperLink protect my identity?",
    answer: "No. It reduces what you have to share, but it does not promise identity protection against every investigation, device, network, or recipient action.",
  },
  {
    question: "Can it prevent screenshots?",
    answer: "No. The interface can reduce exposure on screen, but screenshots and copied links cannot be technically prevented.",
  },
  {
    question: "Do privacy skins change the messages?",
    answer: "No. Skins are display-only. They do not rewrite history, alter exports, or create alternate records.",
  },
  {
    question: "What happens when a room expires?",
    answer: "The room closes automatically. By default, no permanent readable room record is kept.",
  },
];

export function getParticipant(room: Room, participantId: string) {
  return room.participants.find((participant) => participant.id === participantId) ?? room.participants[0];
}

export function getSkinOption(id: PrivacySkinId) {
  return privacySkins.find((skin) => skin.id === id) ?? privacySkins[0];
}

export function getDurationOption(id: RoomDuration) {
  return durationOptions.find((option) => option.id === id) ?? durationOptions[0];
}

export function getMessageExpiryLabel(mode: MessageExpiryMode) {
  return messageExpiryOptions.find((option) => option.id === mode)?.label ?? "Room expiry";
}

export function formatRoomDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCountdownFromDate(expiresAt: string, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "Expired";

  const totalMinutes = Math.max(1, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function buildRoomFromFlow(duration: RoomDuration, settings: RoomSettings): Room {
  const option = getDurationOption(duration);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + option.hours * 60 * 60 * 1000);
  const title = settings.title.trim() || "Private WhisperLink room";

  return {
    id: "WL-7KX9Q",
    title,
    creatorLabel: "Room creator",
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    duration,
    passcodeEnabled: settings.passcodeEnabled,
    passcode: settings.passcodeEnabled ? settings.passcode : undefined,
    messageExpiryMode: settings.messageExpiryMode,
    exportEnabled: settings.exportEnabled,
    privacySkin: settings.defaultPrivacySkin,
    status: "active",
    participantCount: 2,
    participants: whisperParticipants,
    messages: demoMessages,
    shareLink: generatedRoomLink,
    settings,
  };
}

export function loadStoredRoom(): Room | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(WHISPERLINK_ROOM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Room) : null;
  } catch {
    return null;
  }
}

export function saveStoredRoom(room: Room) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WHISPERLINK_ROOM_STORAGE_KEY, JSON.stringify(room));
}

export function clearStoredRoom() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WHISPERLINK_ROOM_STORAGE_KEY);
}
