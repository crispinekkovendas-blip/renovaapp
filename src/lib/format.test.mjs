import { test } from "node:test";
import assert from "node:assert/strict";
import { addMinutesHHMM, fmtDate, parseMoneyBR } from "./format.ts";

test("addMinutesHHMM soma e carrega a hora", () => {
  assert.equal(addMinutesHHMM("08:00", 30), "08:30");
  assert.equal(addMinutesHHMM("08:45", 30), "09:15");
  assert.equal(addMinutesHHMM("09:05", 0), "09:05");
  // Sem dar a volta na meia-noite — a agenda nunca passou disso.
  assert.equal(addMinutesHHMM("23:30", 60), "24:30");
});

test("parseMoneyBR", () => {
  assert.equal(parseMoneyBR("R$ 1.250,50"), 125050);
  assert.equal(parseMoneyBR("250"), 25000);
  assert.equal(parseMoneyBR(""), 0);
  assert.equal(parseMoneyBR("-10"), 0);
});

test("fmtDate", () => {
  assert.equal(fmtDate("2026-09-23"), "23/09/2026");
  assert.equal(fmtDate("2026-09-23 10:00:00"), "23/09/2026");
  assert.equal(fmtDate(null), "—");
});
