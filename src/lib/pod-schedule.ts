export const SCHEDULE_TYPES = ["ONE_TIME", "RECURRING"] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export const RECURRENCE_FREQUENCIES = ["WEEKLY"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const RECURRING_TEMPLATE_STATUSES = ["ACTIVE", "PAUSED", "CANCELED"] as const;
export type RecurringPodTemplateStatus = (typeof RECURRING_TEMPLATE_STATUSES)[number];

export type RecurringPodTemplate = {
  id: string;
  hostUserId: string;
  originGeneral: string;
  destinationGeneral: string;
  genderMode: "MIXED" | "WOMEN_ONLY";
  accessMode: "OPEN" | "VERIFIED_ONLY" | "COMMUNITY_ONLY" | "HIGH_TRUST_ONLY" | "INVITE_ONLY";
  targetSeats: number;
  minSeatsToBook: number;
  estimatedTotalFareCents: number;
  approvedMaxTotalFareCents: number;
  ridepodFeeCents: number;
  recurrenceFrequency: RecurrenceFrequency;
  weekdays: Weekday[];
  departureTimeLocal: string;
  startDate: string;
  endDate: string | null;
  occurrenceLimit: number | null;
  flexibilityMinutes: number;
  status: RecurringPodTemplateStatus;
  createdAt: string;
  updatedAt: string;
};

export type PodOccurrence = {
  id: string;
  recurringTemplateId: string | null;
  occurrenceDate: string;
  departureAt: string;
  departureWindowMinutes: number;
  lifecycleState: "FORMING";
  bookingState: "QUOTE_ALLOWED";
  generatedFromTemplateAt: string;
  isGeneratedFromRecurringTemplate: boolean;
  quoteIds: string[];
  receiptIds: string[];
  settlementId: string | null;
};

export type OneTimePodSchedule = {
  scheduleType: "ONE_TIME";
  occurrenceDate: string;
  departureTimeLocal: string;
  flexibilityMinutes: number;
};

export type GenerateRecurringOccurrencesOptions = {
  defaultOccurrenceLimit?: number;
  generatedAt?: string;
};

const weekdayIndexes: Record<Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function parseDateOnly(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid date: ${date}`);

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizeTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid departure time: ${time}`);

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid departure time: ${time}`);
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function toLocalDepartureAt(date: string, departureTimeLocal: string) {
  return `${date}T${normalizeTime(departureTimeLocal)}:00`;
}

export function createOneTimeOccurrence(schedule: OneTimePodSchedule): PodOccurrence {
  return {
    id: `one-time-${schedule.occurrenceDate.replaceAll("-", "")}`,
    recurringTemplateId: null,
    occurrenceDate: schedule.occurrenceDate,
    departureAt: toLocalDepartureAt(schedule.occurrenceDate, schedule.departureTimeLocal),
    departureWindowMinutes: schedule.flexibilityMinutes,
    lifecycleState: "FORMING",
    bookingState: "QUOTE_ALLOWED",
    generatedFromTemplateAt: new Date(0).toISOString(),
    isGeneratedFromRecurringTemplate: false,
    quoteIds: [],
    receiptIds: [],
    settlementId: null,
  };
}

export function createRecurringTemplateRRule(template: Pick<RecurringPodTemplate, "recurrenceFrequency" | "weekdays">) {
  if (template.recurrenceFrequency !== "WEEKLY") {
    throw new Error("Only weekly recurrence is supported.");
  }

  return `FREQ=WEEKLY;BYDAY=${template.weekdays.join(",")}`;
}

export function generateRecurringOccurrences(
  template: RecurringPodTemplate,
  options: GenerateRecurringOccurrencesOptions = {},
): PodOccurrence[] {
  if (template.recurrenceFrequency !== "WEEKLY") {
    throw new Error("Only weekly recurrence is supported.");
  }

  const weekdays = [...new Set(template.weekdays)].sort(
    (a, b) => weekdayIndexes[a] - weekdayIndexes[b],
  );
  if (weekdays.length === 0) return [];

  const defaultLimit = options.defaultOccurrenceLimit ?? 8;
  const limit = Math.max(0, template.occurrenceLimit ?? defaultLimit);
  if (limit === 0) return [];

  const start = parseDateOnly(template.startDate);
  const end = template.endDate ? parseDateOnly(template.endDate) : null;
  const generatedAt = options.generatedAt ?? new Date(0).toISOString();
  const occurrences: PodOccurrence[] = [];
  let cursor = start;
  let guard = 0;

  while (occurrences.length < limit && guard < 370) {
    const cursorDate = formatDateOnly(cursor);
    const cursorWeekday = WEEKDAYS[cursor.getUTCDay()];
    const withinEnd = !end || cursor.getTime() <= end.getTime();

    if (!withinEnd) break;

    if (weekdays.includes(cursorWeekday)) {
      occurrences.push({
        id: `${template.id}-${cursorDate.replaceAll("-", "")}`,
        recurringTemplateId: template.id,
        occurrenceDate: cursorDate,
        departureAt: toLocalDepartureAt(cursorDate, template.departureTimeLocal),
        departureWindowMinutes: template.flexibilityMinutes,
        lifecycleState: "FORMING",
        bookingState: "QUOTE_ALLOWED",
        generatedFromTemplateAt: generatedAt,
        isGeneratedFromRecurringTemplate: true,
        quoteIds: [],
        receiptIds: [],
        settlementId: null,
      });
    }

    cursor = addDays(cursor, 1);
    guard += 1;
  }

  return occurrences.sort((a, b) => a.departureAt.localeCompare(b.departureAt));
}
