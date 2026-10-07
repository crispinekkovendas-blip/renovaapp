import { test } from "node:test";
import assert from "node:assert/strict";
import { readPatientForm, socialNameFrom } from "./patient-form.ts";

function form(entries) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

test("lê o cadastro inteiro com as mesmas regras de antes", () => {
  const p = readPatientForm(
    form({
      name: "  Ana Souza ",
      cpf: "",
      birth_date: "1988-03-14",
      sex: "F",
      phone: " (11) 98811-2233 ",
      email: "",
      insurance: "Unimed",
      insurance_number: "",
      city: "São Paulo",
      notes: "  ",
      allergies: "dipirona\n\n látex ",
      medications: "",
      social_name: "",
    })
  );
  assert.deepEqual(p, {
    name: "Ana Souza",
    cpf: null,
    birthDate: "1988-03-14",
    sex: "F",
    phone: "(11) 98811-2233",
    email: null,
    insurance: "Unimed",
    insuranceNumber: null,
    city: "São Paulo",
    notes: null,
    allergies: "dipirona\nlátex",
    medications: null,
    socialName: null,
  });
});

test("nome social: aparado e cortado em 120", () => {
  assert.equal(socialNameFrom(form({ social_name: "  Bia  " })), "Bia");
  assert.equal(socialNameFrom(form({ social_name: "x".repeat(200) })).length, 120);
  assert.equal(socialNameFrom(form({})), null);
});
