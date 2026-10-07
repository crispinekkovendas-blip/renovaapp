import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HUB_KIND_LABEL,
  PRE_CONSULT_FIELDS,
  PRE_CONSULT_MAX,
  RATING_COMMENT_MAX,
  RENEWAL_MAX,
  RESCHEDULE_MAX,
  appendLines,
  firstNameOf,
  normalizePreConsult,
  normalizeText,
  parsePreConsultAnswers,
  parsePublish,
  parseRating,
  parseRenewalAnswers,
  renewalReplyMessage,
  rescheduleReplyMessage,
  serializeRenewalAnswers,
  splitLines,
  starsText,
} from "./hub-forms.ts";

// ---------- normalizeText ----------

test("normalizeText trims, normalizes CRLF and drops trailing spaces before line breaks", () => {
  assert.equal(normalizeText("  quinta de manhã  \r\n ou sexta \t\n", 500), "quinta de manhã\n ou sexta");
});

test("normalizeText ignores non-strings and caps by code point, not by UTF-16 unit", () => {
  assert.equal(normalizeText(null, 10), "");
  assert.equal(normalizeText(42, 10), "");
  assert.equal(normalizeText(["a"], 10), "");
  const emoji = "😀".repeat(12);
  assert.equal(normalizeText(emoji, 10), "😀".repeat(10));
  assert.equal(normalizeText("a".repeat(RESCHEDULE_MAX + 50), RESCHEDULE_MAX).length, RESCHEDULE_MAX);
  assert.equal(normalizeText("abc def", 4), "abc");
});

test("limits are the ones the brief asks for", () => {
  assert.equal(RESCHEDULE_MAX, 500);
  assert.equal(RATING_COMMENT_MAX, 300);
  assert.equal(PRE_CONSULT_MAX, 500);
});

// ---------- rating / publish ----------

test("parseRating accepts only integers 1..5", () => {
  assert.equal(parseRating("5"), 5);
  assert.equal(parseRating(" 3 "), 3);
  assert.equal(parseRating(1), 1);
  assert.equal(parseRating("0"), null);
  assert.equal(parseRating("6"), null);
  assert.equal(parseRating("4.5"), null);
  assert.equal(parseRating(""), null);
  assert.equal(parseRating(null), null);
  assert.equal(parseRating("cinco"), null);
});

test("parsePublish only turns an explicit yes into 1", () => {
  assert.equal(parsePublish("on"), 1);
  assert.equal(parsePublish("1"), 1);
  assert.equal(parsePublish("true"), 1);
  assert.equal(parsePublish(""), 0);
  assert.equal(parsePublish(null), 0);
  assert.equal(parsePublish("0"), 0);
  assert.equal(parsePublish("off"), 0);
});

// ---------- pré-consulta ----------

test("normalizePreConsult returns null when every answer is empty", () => {
  assert.equal(normalizePreConsult({}), null);
  assert.equal(normalizePreConsult({ motivo: "  ", sintomas: "", medicamentos: null, alergias: 3 }), null);
});

test("normalizePreConsult trims and caps each field, keeping the four keys", () => {
  const answers = normalizePreConsult({
    motivo: "  Retorno  ",
    sintomas: "x".repeat(PRE_CONSULT_MAX + 10),
    medicamentos: "",
    alergias: "Dipirona",
  });
  assert.deepEqual(Object.keys(answers), ["motivo", "sintomas", "medicamentos", "alergias"]);
  assert.equal(answers.motivo, "Retorno");
  assert.equal(answers.sintomas.length, PRE_CONSULT_MAX);
  assert.equal(answers.medicamentos, "");
  assert.equal(answers.alergias, "Dipirona");
});

test("parsePreConsultAnswers survives bad JSON, arrays and missing keys", () => {
  assert.equal(parsePreConsultAnswers(null), null);
  assert.equal(parsePreConsultAnswers(""), null);
  assert.equal(parsePreConsultAnswers("{not json"), null);
  assert.equal(parsePreConsultAnswers("[1,2]"), null);
  assert.equal(parsePreConsultAnswers('"texto"'), null);
  assert.equal(parsePreConsultAnswers("{}"), null);
  assert.deepEqual(parsePreConsultAnswers('{"motivo":"Dor de cabeça","extra":"ignorado"}'), {
    motivo: "Dor de cabeça",
    sintomas: "",
    medicamentos: "",
    alergias: "",
  });
});

test("the questionnaire has the four fields in the order of the brief, with pt-BR labels", () => {
  assert.deepEqual(
    PRE_CONSULT_FIELDS.map((field) => field.key),
    ["motivo", "sintomas", "medicamentos", "alergias"]
  );
  assert.deepEqual(
    PRE_CONSULT_FIELDS.map((field) => field.label),
    ["Motivo da consulta", "Sintomas e desde quando", "Medicamentos em uso", "Alergias"]
  );
  for (const field of PRE_CONSULT_FIELDS) assert.ok(field.hint.length > 0);
});

// ---------- texts ----------

test("starsText renders filled and empty stars, five empty when out of range", () => {
  assert.equal(starsText(4), "★★★★☆");
  assert.equal(starsText(5), "★★★★★");
  assert.equal(starsText(1), "★☆☆☆☆");
  assert.equal(starsText(null), "☆☆☆☆☆");
  assert.equal(starsText(9), "☆☆☆☆☆");
});

test("firstNameOf and the reception reply message", () => {
  assert.equal(firstNameOf("  Maria da Silva "), "Maria");
  assert.equal(firstNameOf(""), "");
  const message = rescheduleReplyMessage({
    patientName: "Maria da Silva",
    clinicName: "Clínica Renova",
    date: "10/09/2026",
    time: "14:30",
  });
  assert.match(message, /^Olá Maria!/);
  assert.match(message, /Clínica Renova/);
  assert.match(message, /10\/09\/2026 às 14:30/);
  assert.doesNotMatch(message, /undefined/);
});

test("every kind has a label for the prontuário", () => {
  assert.deepEqual(Object.keys(HUB_KIND_LABEL).sort(), ["avaliacao", "pre_consulta", "remarcacao", "renovacao"]);
  assert.equal(HUB_KIND_LABEL.renovacao, "Pedido de renovação de receita");
  assert.equal(RENEWAL_MAX, 300);
});

// ---------- renovação ----------

test("renewal answers round-trip through JSON and survive junk", () => {
  const json = serializeRenewalAnswers({ memed_prescription_id: "abc123", prescription_created_at: "2026-09-01 10:20:00" });
  assert.deepEqual(parseRenewalAnswers(json), {
    memed_prescription_id: "abc123",
    prescription_created_at: "2026-09-01 10:20:00",
  });
  assert.equal(parseRenewalAnswers(null), null);
  assert.equal(parseRenewalAnswers("{oops"), null);
  assert.equal(parseRenewalAnswers("[1]"), null);
  assert.equal(parseRenewalAnswers('{"memed_prescription_id":""}'), null);
  assert.deepEqual(parseRenewalAnswers('{"memed_prescription_id":" x9 "}'), {
    memed_prescription_id: "x9",
    prescription_created_at: "",
  });
});

test("renewalReplyMessage names the clinic and the prescription date when known", () => {
  const withDate = renewalReplyMessage({ patientName: "Maria da Silva", clinicName: "Clínica Renova", prescriptionDate: "01/09/2026" });
  assert.match(withDate, /^Olá Maria! Aqui é da Clínica Renova\./);
  assert.match(withDate, /receita de 01\/09\/2026/);
  const without = renewalReplyMessage({ patientName: "Maria", clinicName: "Clínica Renova", prescriptionDate: "" });
  assert.doesNotMatch(without, /receita de/);
  assert.doesNotMatch(without, /undefined/);
});

// ---------- cadastro a partir da pré-consulta ----------

test("splitLines trims, drops blanks and normalizes CRLF", () => {
  assert.deepEqual(splitLines(" Dipirona \r\n\n  Penicilina\n"), ["Dipirona", "Penicilina"]);
  assert.deepEqual(splitLines(null), []);
  assert.deepEqual(splitLines("   "), []);
});

test("appendLines keeps what exists, adds what is new and skips repeats regardless of case", () => {
  assert.equal(appendLines("", "Dipirona"), "Dipirona");
  assert.equal(appendLines(null, "Dipirona\nPenicilina"), "Dipirona\nPenicilina");
  assert.equal(appendLines("Dipirona", "dipirona\nPenicilina"), "Dipirona\nPenicilina");
  assert.equal(appendLines("Losartana 50mg\nAAS", ""), "Losartana 50mg\nAAS");
  assert.equal(appendLines("A\nB", "B\nC\nA"), "A\nB\nC");
});
