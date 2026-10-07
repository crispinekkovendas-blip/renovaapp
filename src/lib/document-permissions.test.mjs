import { test } from "node:test";
import assert from "node:assert/strict";
import { canIssueDocuments, issuerProfessionalId, canActOnDocument } from "./document-permissions.ts";

const admin = { role: "admin", professionalId: null };
const medico = { role: "profissional", professionalId: 4 };
const medicoSemVinculo = { role: "profissional", professionalId: null };
const recepcao = { role: "recepcao", professionalId: null };

test("quem pode emitir", () => {
  assert.equal(canIssueDocuments(admin), true);
  assert.equal(canIssueDocuments(medico), true);
  assert.equal(canIssueDocuments(medicoSemVinculo), false);
  assert.equal(canIssueDocuments(recepcao), false);
});

/** O formulário não escolhe o médico por ele: é sempre quem está logado. */
test("profissional emite sempre em nome próprio", () => {
  assert.equal(issuerProfessionalId(medico, 7), 4);
  assert.equal(issuerProfessionalId(medico, 0), 4);
  assert.equal(issuerProfessionalId(medicoSemVinculo, 7), null);
});

test("admin emite pelo profissional escolhido", () => {
  assert.equal(issuerProfessionalId(admin, 7), 7);
  assert.equal(issuerProfessionalId(admin, 0), null);
  assert.equal(issuerProfessionalId(admin, Number.NaN), null);
});

test("recepção não emite em nome de ninguém", () => {
  assert.equal(issuerProfessionalId(recepcao, 4), null);
});

test("revogar e duplicar: admin qualquer um, profissional só os próprios", () => {
  assert.equal(canActOnDocument(admin, 7), true);
  assert.equal(canActOnDocument(medico, 4), true);
  assert.equal(canActOnDocument(medico, 7), false);
  assert.equal(canActOnDocument(medicoSemVinculo, 4), false);
  assert.equal(canActOnDocument(recepcao, 4), false);
});
