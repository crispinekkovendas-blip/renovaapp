import { test } from "node:test";
import assert from "node:assert/strict";
import { memedExternalId, missingMemedFields, toMemedPrescriberPayload } from "./prescriber.ts";

const complete = {
  id: 7,
  name: "Marina Costa Silva",
  specialty: "Clínica Geral",
  council: "CRM-SP 123456",
  cpf: "39053344705",
  board_code: "CRM",
  board_number: "123456",
  board_state: "SP",
  birth_date: "1985-05-15",
};

test("external id is stable and prefixed", () => {
  assert.equal(memedExternalId(7), "renova-prof-7");
});

test("a complete professional is missing nothing", () => {
  assert.deepEqual(missingMemedFields(complete), []);
});

test("reports each missing field in pt-BR", () => {
  const missing = missingMemedFields({ ...complete, cpf: null, board_state: "" });
  assert.deepEqual(missing, ["CPF", "UF do conselho"]);
});

test("payload uses JSON:API shape with usuarios type", () => {
  const body = toMemedPrescriberPayload(complete);
  assert.equal(body.data.type, "usuarios");
  assert.equal(body.data.attributes.external_id, "renova-prof-7");
});

test("splits the name into first name and the rest", () => {
  const attrs = toMemedPrescriberPayload(complete).data.attributes;
  assert.equal(attrs.nome, "Marina");
  assert.equal(attrs.sobrenome, "Costa Silva");
});

test("drops the honorific so the prescriber is not registered as \"Dra.\"", () => {
  const marina = toMemedPrescriberPayload({ ...complete, name: "Dra. Marina Costa" }).data.attributes;
  assert.equal(marina.nome, "Marina");
  assert.equal(marina.sobrenome, "Costa");

  const rafael = toMemedPrescriberPayload({ ...complete, name: "Dr. Rafael Lima" }).data.attributes;
  assert.equal(rafael.nome, "Rafael");
  assert.equal(rafael.sobrenome, "Lima");
});

test("drops stacked honorifics", () => {
  const attrs = toMemedPrescriberPayload({ ...complete, name: "Prof. Dra. Ana Paula Souza" }).data.attributes;
  assert.equal(attrs.nome, "Ana");
  assert.equal(attrs.sobrenome, "Paula Souza");
});

test("keeps an honorific that is not at the start", () => {
  const attrs = toMemedPrescriberPayload({ ...complete, name: "Marina Dra Costa" }).data.attributes;
  assert.equal(attrs.nome, "Marina");
  assert.equal(attrs.sobrenome, "Dra Costa");
});

test("a name that is only an honorific still produces something", () => {
  const attrs = toMemedPrescriberPayload({ ...complete, name: "Dra." }).data.attributes;
  assert.equal(attrs.nome, "Dra.");
  assert.equal(attrs.sobrenome, "Dra.");
});

test("a single-word name still yields a non-empty sobrenome", () => {
  const attrs = toMemedPrescriberPayload({ ...complete, name: "Marina" }).data.attributes;
  assert.equal(attrs.nome, "Marina");
  assert.equal(attrs.sobrenome, "Marina");
});

test("strips punctuation from cpf and board number", () => {
  const attrs = toMemedPrescriberPayload({
    ...complete, cpf: "390.533.447-05", board_number: "12.34-56",
  }).data.attributes;
  assert.equal(attrs.cpf, "39053344705");
  assert.equal(attrs.board_number, "123456");
});

test("converts birth date from ISO to dd/mm/YYYY", () => {
  const attrs = toMemedPrescriberPayload(complete).data.attributes;
  assert.equal(attrs.data_nascimento, "15/05/1985");
});

test("throws rather than sending an incomplete prescriber", () => {
  assert.throws(() => toMemedPrescriberPayload({ ...complete, cpf: null }), /CPF/);
});

test("counts e-mail and especialidade only when extras are supplied", () => {
  assert.deepEqual(missingMemedFields(complete), []);
  assert.deepEqual(missingMemedFields(complete, {}), ["e-mail", "especialidade"]);
  assert.deepEqual(missingMemedFields(complete, { email: "a@b.com" }), ["especialidade"]);
  assert.deepEqual(missingMemedFields(complete, { email: "a@b.com", especialidade: 12 }), []);
});

test("includes e-mail and especialidade in the payload when known", () => {
  const attrs = toMemedPrescriberPayload(complete, { email: "marina@renova.app", especialidade: 12 })
    .data.attributes;
  assert.equal(attrs.email, "marina@renova.app");
  assert.equal(attrs.especialidade, 12);
});

test("omits e-mail and especialidade rather than sending blanks", () => {
  const attrs = toMemedPrescriberPayload(complete, { email: "  ", especialidade: null }).data.attributes;
  assert.equal("email" in attrs, false);
  assert.equal("especialidade" in attrs, false);
});
