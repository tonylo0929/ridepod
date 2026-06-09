import type { HomeRide } from "@/lib/home-ride-mock";

export type RideAppCompletionStatus = "completed" | "issue_reported" | "dismissed";

export type RideAppCompletionResponse = {
  id: string;
  podId: string;
  userId: string;
  status: RideAppCompletionStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const completionStorageKey = "ridepod:ride-app-completion-responses";

export function readRideAppCompletionResponses(): RideAppCompletionResponse[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(completionStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRideAppCompletionResponses(responses: RideAppCompletionResponse[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(completionStorageKey, JSON.stringify(responses));
}

export function getRideAppCompletionResponse(podId: string, userId: string) {
  return readRideAppCompletionResponses().find((response) => response.podId === podId && response.userId === userId) ?? null;
}

export function saveRideAppCompletionResponse(input: {
  podId: string;
  userId: string;
  status: RideAppCompletionStatus;
}) {
  const now = new Date().toISOString();
  const responses = readRideAppCompletionResponses();
  const existingIndex = responses.findIndex((response) => response.podId === input.podId && response.userId === input.userId);
  const nextResponse: RideAppCompletionResponse = {
    id: existingIndex >= 0 ? responses[existingIndex].id : `ride-app-completion-${input.podId}-${input.userId}-${Date.now()}`,
    podId: input.podId,
    userId: input.userId,
    status: input.status,
    completedAt: input.status === "completed" ? now : null,
    createdAt: existingIndex >= 0 ? responses[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    responses[existingIndex] = nextResponse;
  } else {
    responses.push(nextResponse);
  }

  writeRideAppCompletionResponses(responses);
  // TODO: Replace local mock storage with ride_app_completion_responses table/RPC and RLS.
  // TODO: Create private reminder notification after ride time when notification scheduling exists.
  return nextResponse;
}

export function isRideAppSelfSettleRide(ride: HomeRide) {
  return ride.rideCategory === "ride_app_self_settle" || ride.rideService === "ride_app";
}

export function isRideAppCompletionDue(ride: HomeRide, now = new Date()) {
  if (!isRideAppSelfSettleRide(ride)) return false;
  if (ride.status === "locked" && ride.quoteStatus === "full") return false;

  const scheduledAt = getRideScheduledDateTime(ride);
  if (!scheduledAt) return false;
  return scheduledAt.getTime() <= now.getTime();
}

function getRideScheduledDateTime(ride: HomeRide) {
  const date = parseRideDate(ride.dateLabel);
  const time = parseRideTime(ride.timeLabel);
  if (!date || !time) return null;

  date.setHours(time.hours, time.minutes, 0, 0);
  return date;
}

function parseRideDate(label: string) {
  const now = new Date();
  const normalized = label.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes("today")) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (lower.includes("tomorrow")) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const monthMatch = normalized.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{1,2})\b/i)
    ?? normalized.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i);

  if (monthMatch) {
    const monthToken = Number.isNaN(Number(monthMatch[1])) ? monthMatch[1] : monthMatch[2];
    const dayToken = Number.isNaN(Number(monthMatch[1])) ? monthMatch[2] : monthMatch[1];
    const monthIndex = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].findIndex((month) =>
      monthToken.toLowerCase().startsWith(month),
    );
    if (monthIndex >= 0) return new Date(now.getFullYear(), monthIndex, Number(dayToken));
  }

  return null;
}

function parseRideTime(label: string) {
  const match = label.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const period = match[3].toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}
