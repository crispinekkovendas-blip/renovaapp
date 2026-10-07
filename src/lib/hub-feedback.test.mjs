import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingRenewalFor, portalFeedback, submissionState } from "./hub-feedback.ts";
import { serializeRenewalAnswers } from "./hub-forms.ts";

const who = { firstName: "Ana", clinic: "Clínica Renova" };

test("portalFeedback: nothing without a known code", () => {
  assert.deepEqual(portalFeedback({}, who), []);
  assert.deepEqual(portalFeedback({ ok: "toString", erro: "constructor" }, who), []);
});

test("portalFeedback: success banners name the patient and the clinic", () => {
  const [confirmed] = portalFeedback({ ok: "confirmado" }, who);
  assert.equal(confirmed.tone, "success");
  assert.match(confirmed.body, /Obrigado, Ana/);
  assert.match(confirmed.body, /Clínica Renova/);

  const [cancelled] = portalFeedback({ ok: "cancelado" }, who);
  assert.equal(cancelled.tone, "neutral");
  assert.equal(portalFeedback({ ok: "avaliacao" }, who)[0].title, "Obrigado pela avaliação, Ana!");
});

test("portalFeedback: ja_pedido depends on where it came from", () => {
  assert.equal(portalFeedback({ erro: "ja_pedido", de: "renovacao" }, who)[0].title, "Você já pediu a renovação desta receita.");
  assert.equal(portalFeedback({ erro: "ja_pedido" }, who)[0].title, "Você já pediu remarcação desta consulta.");
});

test("portalFeedback: success first, then the error", () => {
  const out = portalFeedback({ ok: "pre_consulta", erro: "vazio" }, who);
  assert.deepEqual(
    out.map((b) => b.tone),
    ["success", "warning"]
  );
});

const sub = (kind, appointment_id, extra = {}) => ({
  kind,
  appointment_id,
  handled_at: null,
  answers: null,
  message: null,
  ...extra,
});

test("submissionState: open reschedule, pre-consult and rating per appointment", () => {
  const subs = [
    sub("remarcacao", 7, { handled_at: "2026-09-01 10:00:00" }),
    sub("remarcacao", 7, { message: "de manhã" }),
    sub("pre_consulta", 7),
    sub("avaliacao", 3),
  ];
  const state = submissionState(subs, { nextId: 7, lastConcludedId: 3 });
  assert.equal(state.pendingReschedule?.message, "de manhã");
  assert.equal(state.preConsultSent, true);
  assert.equal(state.alreadyRated, true);

  const other = submissionState(subs, { nextId: 8, lastConcludedId: 4 });
  assert.equal(other.pendingReschedule, null);
  assert.equal(other.preConsultSent, false);
  assert.equal(other.alreadyRated, false);
});

test("submissionState: no next appointment and nothing to rate", () => {
  assert.deepEqual(submissionState([], { nextId: null, lastConcludedId: null }), {
    pendingReschedule: null,
    preConsultSent: false,
    alreadyRated: true,
  });
});

test("pendingRenewalFor: open request for that prescription only", () => {
  const answers = serializeRenewalAnswers({ memed_prescription_id: "rx-1", prescription_created_at: "2026-09-01" });
  const subs = [
    sub("renovacao", null, { answers, handled_at: "2026-09-02 09:00:00" }),
    sub("renovacao", null, { answers, message: "aberto" }),
    sub("renovacao", null, { answers: "{broken" }),
  ];
  assert.equal(pendingRenewalFor(subs, "rx-1")?.message, "aberto");
  assert.equal(pendingRenewalFor(subs, "rx-2"), null);
  assert.equal(pendingRenewalFor(subs, null), null);
});
