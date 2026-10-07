import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysISO,
  addMinutes,
  bookingDays,
  dayLabel,
  freeSlots,
  groupSlotsByPeriod,
  nextSlotLabel,
  parseBookingParams,
  weekdayOf,
} from "./booking-slots.ts";

const win = (start_time, end_time, slot_minutes = 30) => ({ start_time, end_time, slot_minutes });
const busy = (start_time, end_time) => ({ start_time, end_time });

test("addMinutes: crosses the hour and pads", () => {
  assert.equal(addMinutes("08:30", 30), "09:00");
  assert.equal(addMinutes("09:05", 50), "09:55");
  assert.equal(addMinutes("23:30", 45), "24:15");
});

test("addDaysISO: crosses month and year, independent of DST", () => {
  assert.equal(addDaysISO("2026-09-30", 1), "2026-10-01");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysISO("2026-10-18", 0), "2026-10-18");
  assert.equal(addDaysISO("2026-11-01", 13), "2026-11-14");
});

test("weekdayOf: 0 = Sunday", () => {
  assert.equal(weekdayOf("2026-09-27"), 0);
  assert.equal(weekdayOf("2026-09-30"), 3);
});

test("freeSlots: slices each window and drops the slice that overflows", () => {
  assert.deepEqual(freeSlots([win("08:00", "10:00")], [], null), ["08:00", "08:30", "09:00", "09:30"]);
  assert.deepEqual(freeSlots([win("08:00", "09:10", 30)], [], null), ["08:00", "08:30"]);
});

test("freeSlots: an overlapping appointment blocks the slice", () => {
  assert.deepEqual(freeSlots([win("08:00", "10:00")], [busy("08:15", "08:45")], null), ["09:00", "09:30"]);
  // Encostar não é colidir.
  assert.deepEqual(freeSlots([win("08:00", "09:00")], [busy("08:30", "09:00")], null), ["08:00"]);
});

test("freeSlots: today only keeps slots after now; merges and sorts windows", () => {
  assert.deepEqual(freeSlots([win("08:00", "10:00")], [], "08:30"), ["09:00", "09:30"]);
  assert.deepEqual(
    freeSlots([win("14:00", "15:00"), win("08:00", "09:00"), win("08:00", "08:30")], [], null),
    ["08:00", "08:30", "14:00", "14:30"]
  );
});

test("freeSlots: a zero-length slot never loops", () => {
  assert.deepEqual(freeSlots([win("08:00", "10:00", 0)], [], null), []);
});

test("bookingDays: only days with a free slot, within the window", () => {
  const schedules = [
    { professional_id: 4, weekday: 3, start_time: "08:00", end_time: "09:00", slot_minutes: 30 },
    { professional_id: 4, weekday: 4, start_time: "08:00", end_time: "08:30", slot_minutes: 30 },
    { professional_id: 5, weekday: 1, start_time: "08:00", end_time: "12:00", slot_minutes: 30 },
  ];
  const booked = [
    // Quinta 01/10 lotada: some da lista.
    { professional_id: 4, date: "2026-10-01", start_time: "08:00", end_time: "08:30" },
    // Consulta de outro profissional não conta.
    { professional_id: 5, date: "2026-09-30", start_time: "08:00", end_time: "09:00" },
  ];
  const days = bookingDays({
    professionalId: 4,
    schedules,
    busy: booked,
    today: "2026-09-30",
    nowTime: "08:10",
    days: 9,
  });
  assert.deepEqual(days, [
    { date: "2026-09-30", slots: ["08:30"] },
    { date: "2026-10-07", slots: ["08:00", "08:30"] },
    { date: "2026-10-08", slots: ["08:00"] },
  ]);
});

test("bookingDays: no schedule, no days", () => {
  assert.deepEqual(bookingDays({ professionalId: 9, schedules: [], busy: [], today: "2026-09-30", nowTime: "00:00" }), []);
});

test("groupSlotsByPeriod: morning, afternoon, evening, skipping empty groups", () => {
  assert.deepEqual(groupSlotsByPeriod(["08:00", "11:30", "12:00", "17:59", "18:00"]), [
    { period: "manha", slots: ["08:00", "11:30"] },
    { period: "tarde", slots: ["12:00", "17:59"] },
    { period: "noite", slots: ["18:00"] },
  ]);
  assert.deepEqual(groupSlotsByPeriod(["14:00"]), [{ period: "tarde", slots: ["14:00"] }]);
  assert.deepEqual(groupSlotsByPeriod([]), []);
});

test("parseBookingParams: drops anything off-format", () => {
  assert.deepEqual(parseBookingParams({ prof: "4", date: "2026-09-30", time: "09:00" }), {
    profId: 4,
    date: "2026-09-30",
    time: "09:00",
  });
  assert.deepEqual(parseBookingParams({ prof: "abc", date: "30/09/2026", time: "9h" }), {
    profId: null,
    date: null,
    time: null,
  });
  assert.deepEqual(parseBookingParams({ prof: "-2" }), { profId: null, date: null, time: null });
  assert.deepEqual(parseBookingParams({}), { profId: null, date: null, time: null });
});

test("dayLabel: today, tomorrow, then the weekday", () => {
  assert.deepEqual(dayLabel("2026-09-30", "2026-09-30"), { weekday: "Hoje", day: "30/09" });
  assert.deepEqual(dayLabel("2026-10-01", "2026-09-30"), { weekday: "Amanhã", day: "01/10" });
  assert.deepEqual(dayLabel("2026-10-02", "2026-09-30"), { weekday: "Sex", day: "02/10" });
});

test("nextSlotLabel: first free slot of the day", () => {
  assert.equal(nextSlotLabel({ date: "2026-09-30", slots: ["14:00", "15:00"] }, "2026-09-30"), "Hoje, 14:00");
  assert.equal(nextSlotLabel({ date: "2026-10-01", slots: ["09:00"] }, "2026-09-30"), "Amanhã, 09:00");
  assert.equal(nextSlotLabel({ date: "2026-10-05", slots: ["08:30"] }, "2026-09-30"), "Seg, 05/10, 08:30");
});
