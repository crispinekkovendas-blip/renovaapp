import { test } from "node:test";
import assert from "node:assert/strict";
import { DATE_RE, TIME_RE, endTimeFor } from "./times.ts";

test("endTimeFor adds minutes and pads", () => {
  assert.equal(endTimeFor("08:00", 30), "08:30");
  assert.equal(endTimeFor("08:45", 30), "09:15");
  assert.equal(endTimeFor("09:05", 5), "09:10");
  assert.equal(endTimeFor("23:30", 60), "24:30");
});

test("DATE_RE / TIME_RE", () => {
  assert.ok(DATE_RE.test("2026-09-23"));
  assert.ok(!DATE_RE.test("23/09/2026"));
  assert.ok(TIME_RE.test("08:00"));
  assert.ok(!TIME_RE.test("8:00"));
});
