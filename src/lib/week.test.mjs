import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WEEKDAY_SHORT_PT,
  shiftWeekISO,
  weekDaysISO,
  weekRangeLabelPT,
  weekStartISO,
} from "./week.ts";

// 2026-08-19 é uma quarta-feira; 2026-08-17 é a segunda dessa semana.

test("weekStartISO: a Wednesday goes back to Monday", () => {
  assert.equal(weekStartISO("2026-08-19"), "2026-08-17");
});

test("weekStartISO: a Sunday belongs to the week that started six days earlier", () => {
  assert.equal(weekStartISO("2026-08-23"), "2026-08-17");
});

test("weekStartISO: a Monday is its own week start", () => {
  assert.equal(weekStartISO("2026-08-17"), "2026-08-17");
});

test("weekStartISO: crosses a month boundary backwards", () => {
  // 2026-09-02 (quarta) → segunda 2026-08-31
  assert.equal(weekStartISO("2026-09-02"), "2026-08-31");
});

test("weekStartISO: crosses a year boundary backwards", () => {
  // 2026-01-01 (quinta) → segunda 2025-12-29
  assert.equal(weekStartISO("2026-01-01"), "2025-12-29");
});

test("weekStartISO: ignores a trailing time component", () => {
  assert.equal(weekStartISO("2026-08-19T23:59:00"), "2026-08-17");
});

test("weekDaysISO: returns the 7 days Monday→Sunday in order", () => {
  assert.deepEqual(weekDaysISO("2026-08-17"), [
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
    "2026-08-23",
  ]);
});

test("weekDaysISO: spans a month boundary", () => {
  assert.deepEqual(weekDaysISO("2026-08-31"), [
    "2026-08-31",
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
    "2026-09-04",
    "2026-09-05",
    "2026-09-06",
  ]);
});

test("weekDaysISO: spans a year boundary", () => {
  const days = weekDaysISO("2025-12-29");
  assert.equal(days[0], "2025-12-29");
  assert.equal(days[3], "2026-01-01");
  assert.equal(days[6], "2026-01-04");
});

test("weekDaysISO: leap day is included", () => {
  // 2028-02-28 é segunda; 2028 é bissexto
  assert.deepEqual(weekDaysISO("2028-02-28").slice(0, 3), ["2028-02-28", "2028-02-29", "2028-03-01"]);
});

test("shiftWeekISO: +1 crosses into the next month", () => {
  assert.equal(shiftWeekISO("2026-08-31", 1), "2026-09-07");
  assert.equal(shiftWeekISO("2026-08-24", 1), "2026-08-31");
});

test("shiftWeekISO: -1 crosses into the previous month", () => {
  assert.equal(shiftWeekISO("2026-09-07", -1), "2026-08-31");
  assert.equal(shiftWeekISO("2026-08-03", -1), "2026-07-27");
});

test("shiftWeekISO: crosses the year boundary in both directions", () => {
  assert.equal(shiftWeekISO("2025-12-29", 1), "2026-01-05");
  assert.equal(shiftWeekISO("2026-01-05", -1), "2025-12-29");
});

test("shiftWeekISO: zero is the identity and larger deltas compose", () => {
  assert.equal(shiftWeekISO("2026-08-17", 0), "2026-08-17");
  assert.equal(shiftWeekISO("2026-08-17", 4), "2026-09-14");
  assert.equal(shiftWeekISO("2026-08-17", -52), "2025-08-18");
});

test("shift then weekStart is stable (shifting a Monday keeps a Monday)", () => {
  for (let k = -60; k <= 60; k += 7) {
    const monday = shiftWeekISO("2026-08-17", k);
    assert.equal(weekStartISO(monday), monday);
  }
});

test("WEEKDAY_SHORT_PT: Monday-first, 7 entries", () => {
  assert.deepEqual([...WEEKDAY_SHORT_PT], ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
});

test("weekRangeLabelPT: same month", () => {
  assert.equal(weekRangeLabelPT("2026-08-18", "2026-08-24"), "18 a 24 de agosto de 2026");
});

test("weekRangeLabelPT: different months, same year", () => {
  assert.equal(weekRangeLabelPT("2026-08-31", "2026-09-06"), "31 de agosto a 6 de setembro de 2026");
});

test("weekRangeLabelPT: different years", () => {
  assert.equal(
    weekRangeLabelPT("2025-12-29", "2026-01-04"),
    "29 de dezembro de 2025 a 4 de janeiro de 2026"
  );
});
