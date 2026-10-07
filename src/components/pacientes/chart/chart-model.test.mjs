import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PATIENT_TABS,
  patientTab,
  patientTabHref,
  DOCUMENT_SHORTCUTS,
  chartFlashMessages,
  civilNameAndCpf,
  emitHref,
  encounterCountLabel,
  initials,
  patientFacts,
  sexLabel,
} from "./chart-model.ts";

test("initials: first and last name, uppercased", () => {
  assert.equal(initials("maria da silva"), "MS");
  assert.equal(initials("  Ana  "), "A");
  assert.equal(initials(""), "");
});

test("sexLabel maps the codes and keeps unknown values", () => {
  assert.equal(sexLabel("F"), "Feminino");
  assert.equal(sexLabel("M"), "Masculino");
  assert.equal(sexLabel("Outro"), "Outro");
  assert.equal(sexLabel("X"), "X");
  assert.equal(sexLabel(null), null);
  assert.equal(sexLabel(""), null);
});

test("emitHref keeps the historical URL shape", () => {
  const [atestado, encaminhamento] = DOCUMENT_SHORTCUTS;
  assert.equal(emitHref(12, atestado, 7), "/pacientes/12/emitir?kind=atestado&sub=medico&encounter=7");
  assert.equal(emitHref(12, atestado, null), "/pacientes/12/emitir?kind=atestado&sub=medico&");
  assert.equal(emitHref(12, encaminhamento, 7), "/pacientes/12/emitir?kind=encaminhamento&encounter=7");
  assert.equal(emitHref(12, encaminhamento, null), "/pacientes/12/emitir?kind=encaminhamento&");
});

test("document shortcuts and sections keep their order", () => {
  assert.deepEqual(
    DOCUMENT_SHORTCUTS.map((s) => s.kind),
    ["atestado", "encaminhamento", "laudo", "orientacoes"]
  );
  assert.deepEqual(
    PATIENT_TABS.map((t) => t.id),
    ["resumo", "atendimentos", "documentos", "mais"]
  );
});

test("patientTab: abas pela URL, e os links antigos caem no lugar certo", () => {
  assert.equal(patientTab({}), "resumo");
  assert.equal(patientTab({ aba: "documentos" }), "documentos");
  assert.equal(patientTab({ aba: "xyz" }), "resumo");
  assert.equal(patientTab({ editar: "1" }), "mais");
  assert.equal(patientTab({ atender: "1", aba: "documentos" }), "atendimentos");
  assert.equal(patientTabHref(7, "resumo"), "/pacientes/7");
  assert.equal(patientTabHref(7, "mais"), "/pacientes/7?aba=mais");
});

const EMPTY = {
  cpf: null,
  birth_date: null,
  sex: null,
  phone: null,
  email: null,
  insurance: null,
  insurance_number: null,
  city: null,
};

test("patientFacts: empty patient still shows the insurance as Particular", () => {
  assert.deepEqual(patientFacts(EMPTY), [{ label: "Convênio", value: "Particular" }]);
});

test("patientFacts: filled patient, in display order", () => {
  const facts = patientFacts({
    ...EMPTY,
    cpf: "123",
    birth_date: "2000-01-01",
    sex: "F",
    phone: "11 9",
    email: "a@b.c",
    insurance: "Unimed",
    insurance_number: "42",
    city: "Santos",
  });
  assert.deepEqual(
    facts.map((f) => f.label),
    ["CPF", "Nascimento", "Sexo", "Telefone", "E-mail", "Convênio", "Carteirinha", "Cidade"]
  );
  assert.match(facts[1].value, /^01\/01\/2000 \(\d+ anos\)$/);
  assert.equal(facts[2].value, "Feminino");
});

test("encounterCountLabel pluralizes", () => {
  assert.equal(encounterCountLabel(0), "0 atendimentos");
  assert.equal(encounterCountLabel(1), "1 atendimento");
  assert.equal(encounterCountLabel(2), "2 atendimentos");
});

test("chartFlashMessages: known keys in order, unknown and prototype keys ignored", () => {
  assert.deepEqual(chartFlashMessages(undefined, undefined), []);
  assert.deepEqual(
    chartFlashMessages("cadastro", "nada").map((m) => m.tone),
    ["ok", "aviso"]
  );
  assert.equal(chartFlashMessages(undefined, "migracao")[0].tone, "erro");
  assert.deepEqual(chartFlashMessages("toString", "constructor"), []);
  assert.deepEqual(chartFlashMessages("xyz", "abc"), []);
});

test("civilNameAndCpf: civil name only with a social name, then the CPF", () => {
  assert.equal(civilNameAndCpf({ name: "João", social_name: "Joana", cpf: "123" }), "nome civil: João · 123");
  assert.equal(civilNameAndCpf({ name: "João", social_name: "  ", cpf: "123" }), "123");
  assert.equal(civilNameAndCpf({ name: "João", social_name: "Joana", cpf: null }), "nome civil: João");
  assert.equal(civilNameAndCpf({ name: "João", cpf: null }), null);
});
