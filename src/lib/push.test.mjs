import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BODY_MAX,
  TITLE_MAX,
  applicationServerKey,
  clampText,
  decodeBase64url,
  isIos,
  readTokenExpiry,
  recallPayload,
  reminderPayload,
  stampSaoPaulo,
  targetDateFor,
} from "./push.ts";
import { signPatientToken } from "./patient-token.ts";

const base = {
  appointmentId: 42,
  firstName: "Ana",
  date: "2026-09-08",
  start_time: "14:30",
  professional: "Dra. Marina Costa",
  clinic: "Clínica Renova",
  url: "https://renovaapp.vercel.app/p/abc.def",
  today: "2026-09-07",
};

test("targetDateFor: tomorrow, across month and year ends and leap day", () => {
  assert.equal(targetDateFor("2026-09-07"), "2026-09-08");
  assert.equal(targetDateFor("2026-09-30"), "2026-10-01");
  assert.equal(targetDateFor("2026-12-31"), "2027-01-01");
  assert.equal(targetDateFor("2028-02-28"), "2028-02-29");
});

test("stampSaoPaulo: UTC-3, no DST, database text format", () => {
  assert.equal(stampSaoPaulo(new Date("2026-09-07T12:00:00Z")), "2026-09-07 09:00:00");
  assert.equal(stampSaoPaulo(new Date("2026-09-08T02:30:05Z")), "2026-09-07 23:30:05");
  assert.equal(stampSaoPaulo(new Date("2026-01-15T03:00:00Z")), "2026-01-15 00:00:00");
});

test("clampText: untouched when short, ellipsis when long, never above max", () => {
  assert.equal(clampText("  oi  ", 10), "oi");
  const long = clampText("a".repeat(50), 10);
  assert.equal(long.length, 10);
  assert.ok(long.endsWith("…"));
});

test("reminderPayload: tag, url and the two bodies (agendado vs confirmado)", () => {
  const pending = reminderPayload({ ...base, status: "agendado" });
  const confirmed = reminderPayload({ ...base, status: "confirmado" });

  assert.equal(pending.tag, "lembrete-42");
  assert.equal(pending.url, base.url);
  assert.equal(pending.title, "Ana, sua consulta é amanhã");
  assert.equal(
    pending.body,
    "Amanhã às 14:30 com Dra. Marina Costa, na Clínica Renova. Toque para confirmar sua presença."
  );
  assert.equal(
    confirmed.body,
    "Amanhã às 14:30 com Dra. Marina Costa, na Clínica Renova. Presença confirmada — até lá!"
  );
  assert.notEqual(pending.body, confirmed.body);
  assert.deepEqual(Object.keys(pending).sort(), ["body", "tag", "title", "url"]);
});

test("reminderPayload: says the day instead of 'amanhã' when the target is not tomorrow", () => {
  const payload = reminderPayload({ ...base, status: "agendado", today: "2026-09-01" });
  assert.equal(payload.title, "Ana, consulta dia 08/09");
  assert.match(payload.body, /^Dia 08\/09 às 14:30/);
});

test("reminderPayload: without today it assumes the cron default (tomorrow)", () => {
  const { today: _today, ...noToday } = base;
  assert.equal(reminderPayload({ ...noToday, status: "agendado" }).title, "Ana, sua consulta é amanhã");
});

test("reminderPayload: long names never push title or body past the limits", () => {
  const payload = reminderPayload({
    ...base,
    firstName: "Maximiliano-Bartolomeu-Fernandes",
    professional: "Dr. Francisco Xavier de Albuquerque Montenegro Junior Filho",
    clinic: "Clínica Integrada de Especialidades Médicas e Odontológicas do Vale",
    status: "agendado",
  });
  assert.ok(payload.title.length <= TITLE_MAX, payload.title);
  assert.ok(payload.body.length <= BODY_MAX, payload.body);
  // The actionable tail survives; the clinic is what gets dropped.
  assert.ok(payload.body.endsWith("Toque para confirmar sua presença."), payload.body);
  assert.ok(!payload.body.includes("Clínica Integrada"));
});

test("recallPayload: title with the name, body with professional and date, tag per encounter", () => {
  const payload = recallPayload({
    encounterId: 99,
    firstName: "Ana",
    professional: "Dra. Marina Costa",
    dueDate: "2026-09-12",
    url: "https://renovaapp.vercel.app/p/abc.def",
  });
  assert.equal(payload.title, "Ana, hora de marcar seu retorno");
  assert.equal(payload.body, "Retorno com Dra. Marina Costa recomendado para 12/09. Toque para agendar.");
  assert.equal(payload.tag, "retorno-99");
  assert.equal(payload.url, "https://renovaapp.vercel.app/p/abc.def");
  assert.deepEqual(Object.keys(payload).sort(), ["body", "tag", "title", "url"]);
});

test("recallPayload: long names stay within the notification limits", () => {
  const payload = recallPayload({
    encounterId: 1,
    firstName: "Maximiliano-Bartolomeu-Fernandes",
    professional: "Dr. Francisco Xavier de Albuquerque Montenegro Junior Filho",
    dueDate: "2026-09-12",
    url: "https://renovaapp.vercel.app/p/abc.def",
  });
  assert.ok(payload.title.length <= TITLE_MAX, payload.title);
  assert.ok(payload.body.length <= BODY_MAX, payload.body);
  assert.ok(payload.body.includes("12/09"), payload.body);
});

test("decodeBase64url / applicationServerKey: known vector and no padding needed", () => {
  // bytes 0x04 0xff 0xfe -> base64 "BP/+" -> base64url "BP_-"
  assert.deepEqual(Array.from(decodeBase64url("BP_-")), [4, 255, 254]);
  const key = applicationServerKey(" BAf2Z7Q ");
  assert.ok(key instanceof Uint8Array);
  assert.equal(key.length, 5);
  // Real VAPID keys are 65 uncompressed P-256 bytes.
  const real = "BJ5tW6v9Q8H6mQ0y5cM6rL1xkE5bZg4mB1k2C7X9d2Hn8yHqYQm9eG1Wm1qQb3Yp9r0K2sK3M6mD9rEo1Ae9YfM";
  assert.equal(applicationServerKey(real).length, 65);
});

test("readTokenExpiry: reads id and expiry from a real token, rejects junk", () => {
  const token = signPatientToken(7, "2026-10-06", "segredo");
  assert.deepEqual(readTokenExpiry(token), { patientId: 7, expiresAt: "2026-10-06" });
  assert.equal(readTokenExpiry("app"), null);
  assert.equal(readTokenExpiry("a.b.c"), null);
  assert.equal(readTokenExpiry("!!.x"), null);
  const confirm = Buffer.from("cfm.7.2026-10-06", "utf8").toString("base64url");
  assert.equal(readTokenExpiry(`${confirm}.sig`), null);
});

test("isIos: iPhone, iPadOS-as-Mac, and not Android", () => {
  assert.equal(isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15"), true);
  assert.equal(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", "MacIntel", 5), true);
  assert.equal(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", "MacIntel", 0), false);
  assert.equal(isIos("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124", "Linux armv8l", 5), false);
});
