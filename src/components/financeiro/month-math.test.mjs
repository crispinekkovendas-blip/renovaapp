import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barWidth,
  groupBy,
  monthFromParam,
  monthIndicators,
  percent,
  plural,
  shiftMonth,
  summarizeMonth,
  sumBy,
} from "./month-math.ts";

test("monthFromParam accepts only AAAA-MM and falls back otherwise", () => {
  assert.equal(monthFromParam("2026-03", "2026-09"), "2026-03");
  assert.equal(monthFromParam(undefined, "2026-09"), "2026-09");
  assert.equal(monthFromParam("", "2026-09"), "2026-09");
  assert.equal(monthFromParam("2026-3", "2026-09"), "2026-09");
  assert.equal(monthFromParam("2026-03-01", "2026-09"), "2026-09");
  assert.equal(monthFromParam("x2026-03", "2026-09"), "2026-09");
});

test("shiftMonth crosses year boundaries and never skips a month", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2025-12", 1), "2026-01");
  assert.equal(shiftMonth("2026-01", 1), "2026-02");
  assert.equal(shiftMonth("2026-03", -1), "2026-02");
  assert.equal(shiftMonth("2026-09", 0), "2026-09");
});

test("summarizeMonth: received only counts payments paid in the month; pending counts every open one", () => {
  const rows = [
    { status: "pago", paid_at: "2026-09-10T10:00:00", amount_cents: 10000 },
    { status: "pago", paid_at: "2026-08-31", amount_cents: 5000 }, // venceu em setembro, pago em agosto
    { status: "pago", paid_at: null, amount_cents: 7000 },
    { status: "pendente", paid_at: null, amount_cents: 2500 },
    { status: "pendente", paid_at: null, amount_cents: 500 },
  ];
  assert.deepEqual(summarizeMonth(rows, "2026-09"), { received: 10000, pending: 3000 });
  assert.deepEqual(summarizeMonth([], "2026-09"), { received: 0, pending: 0 });
});

test("groupBy keeps first-seen key order and row order", () => {
  const rows = [
    { k: "Unimed", n: 1 },
    { k: "Amil", n: 2 },
    { k: "Unimed", n: 3 },
  ];
  const groups = groupBy(rows, (r) => r.k);
  assert.deepEqual([...groups.keys()], ["Unimed", "Amil"]);
  assert.deepEqual(groups.get("Unimed").map((r) => r.n), [1, 3]);
  assert.equal(sumBy(rows, (r) => r.n), 6);
  assert.equal(sumBy([], () => 1), 0);
});

test("percent and monthIndicators never divide by zero", () => {
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(2, 3), 67);
  assert.equal(percent(5, 0), 0);
  assert.deepEqual(monthIndicators({ concluidas: 0, faltas: 0, receita: 0 }), { noShowBase: 0, noShowRate: 0, ticket: 0 });
  assert.deepEqual(monthIndicators({ concluidas: 8, faltas: 2, receita: 100001 }), {
    noShowBase: 10,
    noShowRate: 20,
    ticket: 12500,
  });
});

test("barWidth is proportional with a 2% floor for non-zero values", () => {
  assert.equal(barWidth(50, 100), 50);
  assert.equal(barWidth(1, 1000), 2);
  assert.equal(barWidth(0, 100), 0);
  assert.equal(barWidth(10, 0), 0);
  assert.equal(barWidth(100, 100), 100);
});

test("plural", () => {
  assert.equal(plural(1, "atendimento"), "1 atendimento");
  assert.equal(plural(0, "atendimento"), "0 atendimentos");
  assert.equal(plural(2, "falta"), "2 faltas");
});
