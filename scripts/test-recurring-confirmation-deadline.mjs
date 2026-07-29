import assert from "node:assert/strict";
import {
  buildRecurringDeadlinePreview,
  defaultRecurringConfirmationOffsetMinutes,
} from "../src/lib/recurring-confirmation-deadline.ts";

const baseTemplate = {
  id: "test-template",
  hostUserId: "host",
  originGeneral: "Kowloon City",
  destinationGeneral: "Central",
  genderMode: "MIXED",
  accessMode: "OPEN",
  targetSeats: 4,
  minSeatsToBook: 2,
  estimatedTotalFareCents: 9600,
  approvedMaxTotalFareCents: 9600,
  ridepodFeeCents: 0,
  recurrenceFrequency: "WEEKLY",
  recurringPattern: "ONE_WAY",
  weekdays: ["MO", "TU", "FR"],
  departureTimeLocal: "08:00",
  recurringLegs: [
    { dayOfWeek: "MO", legType: "OUTBOUND", departureTime: "08:00", originLabel: "Kowloon City", destinationLabel: "Central" },
    { dayOfWeek: "TU", legType: "OUTBOUND", departureTime: "08:00", originLabel: "Kowloon City", destinationLabel: "Central" },
    { dayOfWeek: "FR", legType: "OUTBOUND", departureTime: "08:00", originLabel: "Kowloon City", destinationLabel: "Central" },
  ],
  startDate: "2026-08-03",
  endDate: null,
  occurrenceLimit: 3,
  flexibilityMinutes: 15,
  confirmationOffsetMinutes: defaultRecurringConfirmationOffsetMinutes,
  timezone: "Asia/Hong_Kong",
  status: "ACTIVE",
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

const preview = buildRecurringDeadlinePreview(
  baseTemplate,
  {
    preset: "1440",
    customValue: 24,
    customUnit: "hours",
    timezone: "Asia/Hong_Kong",
  },
  3,
);

assert.equal(preview.length, 3);
assert.equal(preview[0].departureAt, "2026-08-03T08:00:00");
assert.equal(preview[0].confirmationDeadlineAt, "2026-08-02T00:00:00.000Z");
assert.equal(preview[1].departureAt, "2026-08-04T08:00:00");
assert.equal(preview[1].confirmationDeadlineAt, "2026-08-03T00:00:00.000Z");
assert.equal(preview[2].departureAt, "2026-08-07T08:00:00");
assert.equal(preview[2].confirmationDeadlineAt, "2026-08-06T00:00:00.000Z");

const customPreview = buildRecurringDeadlinePreview(
  baseTemplate,
  {
    preset: "custom",
    customValue: 2,
    customUnit: "days",
    timezone: "Asia/Hong_Kong",
  },
  1,
);

assert.equal(customPreview[0].confirmationDeadlineAt, "2026-08-01T00:00:00.000Z");

console.log("Recurring confirmation deadline tests passed.");
