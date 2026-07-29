import { generateRecurringOccurrences, type RecurringPodTemplate } from "./pod-schedule.ts";

export const recurringConfirmationTimezone = "Asia/Hong_Kong";
export const defaultRecurringConfirmationOffsetMinutes = 24 * 60;
export const recurringConfirmationOffsetOptions = [
  { id: "2880", label: "48 hours before each ride", minutes: 48 * 60 },
  { id: "1440", label: "24 hours before each ride", minutes: defaultRecurringConfirmationOffsetMinutes, recommended: true },
  { id: "720", label: "12 hours before each ride", minutes: 12 * 60 },
  { id: "360", label: "6 hours before each ride", minutes: 6 * 60 },
  { id: "custom", label: "Custom", minutes: null },
] as const;

export type RecurringConfirmationOffsetUnit = "hours" | "days";
export type RecurringConfirmationOffsetPreset = (typeof recurringConfirmationOffsetOptions)[number]["id"];

export type RecurringConfirmationRule = {
  preset: RecurringConfirmationOffsetPreset;
  customValue: number;
  customUnit: RecurringConfirmationOffsetUnit;
  timezone: string;
};

export type RecurringDeadlinePreviewItem = {
  occurrenceId: string;
  rideLabel: string;
  confirmByLabel: string;
  departureAt: string;
  confirmationDeadlineAt: string;
};

function formatInTimezone(isoLikeDate: string, timezone: string) {
  const date = new Date(isoLikeDate);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getRecurringConfirmationOffsetMinutes(rule: RecurringConfirmationRule) {
  if (rule.preset !== "custom") {
    const option = recurringConfirmationOffsetOptions.find((item) => item.id === rule.preset);
    return option?.minutes ?? defaultRecurringConfirmationOffsetMinutes;
  }

  const value = Math.max(1, Math.floor(rule.customValue || 1));
  return rule.customUnit === "days" ? value * 24 * 60 : value * 60;
}

export function getRecurringConfirmationPresetLabel(rule: RecurringConfirmationRule) {
  if (rule.preset !== "custom") {
    const option = recurringConfirmationOffsetOptions.find((item) => item.id === rule.preset);
    return option?.label ?? "24 hours before each ride";
  }

  const value = Math.max(1, Math.floor(rule.customValue || 1));
  const unit = rule.customUnit === "days" ? (value === 1 ? "day" : "days") : value === 1 ? "hour" : "hours";
  return `${value} ${unit} before each ride`;
}

export function calculateConfirmationDeadlineAt(departureAt: string, offsetMinutes: number) {
  const departure = new Date(departureAt.match(/[zZ]|[+-]\d{2}:\d{2}$/) ? departureAt : `${departureAt}+08:00`);
  if (Number.isNaN(departure.getTime())) return null;

  return new Date(departure.getTime() - offsetMinutes * 60 * 1000).toISOString();
}

export function buildRecurringDeadlinePreview(
  template: RecurringPodTemplate,
  rule: RecurringConfirmationRule,
  limit = 3,
): RecurringDeadlinePreviewItem[] {
  const offsetMinutes = getRecurringConfirmationOffsetMinutes(rule);
  const timezone = rule.timezone || recurringConfirmationTimezone;

  return generateRecurringOccurrences(
    {
      ...template,
      confirmationOffsetMinutes: offsetMinutes,
      timezone,
    },
    { defaultOccurrenceLimit: limit },
  )
    .slice(0, limit)
    .map((occurrence) => {
      const confirmationDeadlineAt = occurrence.confirmationDeadlineAt ?? calculateConfirmationDeadlineAt(occurrence.departureAt, offsetMinutes);

      return {
        occurrenceId: occurrence.id,
        rideLabel: formatInTimezone(occurrence.departureAt, timezone),
        confirmByLabel: confirmationDeadlineAt ? formatInTimezone(confirmationDeadlineAt, timezone) : "Invalid deadline",
        departureAt: occurrence.departureAt,
        confirmationDeadlineAt: confirmationDeadlineAt ?? "",
      };
    });
}
