import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLINICAL_HISTORY_MAX,
  clinicalHistory,
  toMemedPatient,
  missingMemedPatientFields,
  normalizePatientSex,
} from "./patient.ts";

const base = {
  id: 42,
  name: "Ana Beatriz Souza",
  cpf: "412.658.790-01",
  birth_date: "1988-03-02",
  sex: "F",
  phone: "(11) 98811-2233",
  email: "ana.souza@gmail.com",
  city: "São Paulo",
  notes: "Hipertensa, em acompanhamento.",
};

test("maps the core fields", () => {
  const p = toMemedPatient(base);
  assert.equal(p.idExterno, "renova-pac-42");
  assert.equal(p.nome, "Ana Beatriz Souza");
  assert.equal(p.cpf, "41265879001");
  assert.equal(p.data_nascimento, "02/03/1988");
});

test("sends the fields Memed requires for production credentials", () => {
  const p = toMemedPatient(base);
  assert.equal(p.telefone, "11988112233");
  assert.equal(p.email, "ana.souza@gmail.com");
});

test("carries city and clinical history through", () => {
  const p = toMemedPatient(base);
  assert.equal(p.cidade, "São Paulo");
  assert.equal(p.historia_clinica, "Hipertensa, em acompanhamento.");
});

test("truncates clinical history at Memed's 2000-character limit", () => {
  const p = toMemedPatient({ ...base, notes: "a".repeat(2500) });
  assert.equal(p.historia_clinica.length, 2000);
});

test("clinical history puts allergies first, then medications, then notes", () => {
  const p = toMemedPatient({
    ...base,
    allergies: "Dipirona\nPenicilina",
    medications: "Losartana 50mg 1x/dia\n",
  });
  assert.equal(
    p.historia_clinica,
    "Alergias: Dipirona, Penicilina\nMedicamentos em uso: Losartana 50mg 1x/dia\nHipertensa, em acompanhamento."
  );
});

test("clinical history skips empty sections and is omitted when there is nothing", () => {
  assert.equal(clinicalHistory({ allergies: null, medications: "  ", notes: "Só notas." }), "Só notas.");
  assert.equal(clinicalHistory({ allergies: "Látex", medications: null, notes: null }), "Alergias: Látex");
  assert.equal(clinicalHistory({ allergies: undefined, medications: undefined, notes: "" }), "");
  const p = toMemedPatient({ ...base, notes: null, allergies: null, medications: null });
  assert.equal("historia_clinica" in p, false);
});

test("the 2000-character cut never takes the allergies", () => {
  assert.equal(CLINICAL_HISTORY_MAX, 2000);
  const p = toMemedPatient({ ...base, allergies: "Penicilina", notes: "x".repeat(3000) });
  assert.equal(p.historia_clinica.length, 2000);
  assert.ok(p.historia_clinica.startsWith("Alergias: Penicilina\n"));
});

test("expands single-letter sex to Memed's vocabulary", () => {
  assert.equal(toMemedPatient({ ...base, sex: "F" }).sexo, "Feminino");
  assert.equal(toMemedPatient({ ...base, sex: "M" }).sexo, "Masculino");
});

test("accepts already-spelled and lowercase values", () => {
  assert.equal(toMemedPatient({ ...base, sex: "feminino" }).sexo, "Feminino");
  assert.equal(toMemedPatient({ ...base, sex: "MASCULINO" }).sexo, "Masculino");
});

test("refuses to invent a sex, because Memed requires one", () => {
  assert.equal(normalizePatientSex("outro"), undefined);
  assert.throws(() => toMemedPatient({ ...base, sex: null }), /sexo/);
  assert.throws(() => toMemedPatient({ ...base, sex: "outro" }), /sexo/);
});

test("omits optional fields when absent instead of sending empty strings", () => {
  const p = toMemedPatient({ ...base, cpf: null, birth_date: null, phone: null, email: null, city: null, notes: null });
  for (const key of ["cpf", "data_nascimento", "telefone", "email", "cidade", "historia_clinica"]) {
    assert.equal(key in p, false, `${key} should be omitted`);
  }
  assert.equal(p.nome, "Ana Beatriz Souza");
  assert.equal(p.sexo, "Feminino");
});

test("a complete patient is missing nothing", () => {
  assert.deepEqual(missingMemedPatientFields(base), []);
});

test("names every field Memed needs, in a fixed order", () => {
  assert.deepEqual(
    missingMemedPatientFields({ ...base, sex: "", cpf: null, email: "", phone: null, birth_date: null }),
    ["sexo", "CPF", "e-mail", "telefone", "data de nascimento"]
  );
});
