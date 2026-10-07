import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RECALL_LEAD_DAYS,
  RECALL_WINDOW_DAYS,
  RETURN_OPTIONS,
  bookingUrlFor,
  daysBetween,
  parseReturnDays,
  recallCardTitle,
  recallDateFor,
  recallMessage,
  recallStatus,
  recallWindow,
  returnDueFor,
} from "./recall.ts";

test("the select offers 'sem retorno' plus the six prazos of the brief", () => {
  assert.deepEqual(
    RETURN_OPTIONS.map((option) => option.days),
    [0, 7, 15, 30, 60, 90, 180]
  );
  assert.equal(RETURN_OPTIONS[0].label, "Sem retorno");
  assert.equal(RETURN_OPTIONS[3].label, "30 dias");
});

test("parseReturnDays accepts only the listed prazos", () => {
  assert.equal(parseReturnDays("30"), 30);
  assert.equal(parseReturnDays(" 7 "), 7);
  assert.equal(parseReturnDays(180), 180);
  assert.equal(parseReturnDays("0"), null);
  assert.equal(parseReturnDays(""), null);
  assert.equal(parseReturnDays(null), null);
  assert.equal(parseReturnDays("45"), null);
  assert.equal(parseReturnDays("-7"), null);
  assert.equal(parseReturnDays("trinta"), null);
});

test("returnDueFor adds the days to the encounter date, across month ends", () => {
  assert.equal(returnDueFor("2026-09-09", 30), "2026-10-09");
  assert.equal(returnDueFor("2026-12-20", 15), "2027-01-04");
  assert.equal(returnDueFor("2026-09-09", null), null);
  assert.equal(returnDueFor("2026-09-09", 0), null);
  assert.equal(returnDueFor("09/09/2026", 30), null);
});

test("recallWindow is 30 days each way and recallDateFor is three days ahead of today", () => {
  assert.equal(RECALL_WINDOW_DAYS, 30);
  assert.deepEqual(recallWindow("2026-09-09"), { from: "2026-08-10", to: "2026-10-09" });
  assert.equal(RECALL_LEAD_DAYS, 3);
  // The cron's default target is tomorrow; the recall date is today + 3 = target + 2.
  assert.equal(recallDateFor("2026-09-10"), "2026-09-12");
  assert.equal(recallDateFor("2026-12-31"), "2027-01-02");
});

test("daysBetween counts whole days, negative when the target is in the past", () => {
  assert.equal(daysBetween("2026-09-09", "2026-09-12"), 3);
  assert.equal(daysBetween("2026-09-09", "2026-09-09"), 0);
  assert.equal(daysBetween("2026-09-09", "2026-09-01"), -8);
  assert.equal(daysBetween("2026-02-27", "2026-03-02"), 3);
});

test("recallStatus labels overdue, today, tomorrow and future returns", () => {
  assert.deepEqual(recallStatus("2026-09-06", "2026-09-09"), { overdue: true, days: -3, label: "atrasado há 3 dias" });
  assert.deepEqual(recallStatus("2026-09-08", "2026-09-09"), { overdue: true, days: -1, label: "atrasado há 1 dia" });
  assert.deepEqual(recallStatus("2026-09-09", "2026-09-09"), { overdue: false, days: 0, label: "hoje" });
  assert.deepEqual(recallStatus("2026-09-10", "2026-09-09"), { overdue: false, days: 1, label: "amanhã" });
  assert.deepEqual(recallStatus("2026-09-14", "2026-09-09"), { overdue: false, days: 5, label: "em 5 dias" });
});

test("bookingUrlFor and the reception WhatsApp message", () => {
  assert.equal(bookingUrlFor("https://renova.app/", 3), "https://renova.app/agendar?prof=3");
  assert.equal(bookingUrlFor("http://localhost:3000", 12), "http://localhost:3000/agendar?prof=12");
  const message = recallMessage({
    firstName: "Ana",
    professional: "Dra. Marina Costa",
    bookingUrl: "https://renova.app/agendar?prof=3",
  });
  assert.equal(
    message,
    "Olá Ana! Está na hora de marcar seu retorno com Dra. Marina Costa. Agende aqui: https://renova.app/agendar?prof=3"
  );
});

test("recallCardTitle uses dd/mm/aaaa and the professional's name", () => {
  assert.equal(recallCardTitle("2026-09-12", "Dra. Marina Costa"), "Retorno recomendado para 12/09/2026 com Dra. Marina Costa");
});
