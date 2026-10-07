import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TEMPLATES } from "../../../../lib/documents.ts";
import {
  NEW_FROM,
  canManage,
  editorState,
  scopeLabel,
  templatesErroMessage,
  templatesOkMessage,
} from "./template-page.ts";

const admin = { role: "admin", professionalId: null };
const adminProf = { role: "admin", professionalId: 4 };
const prof4 = { role: "profissional", professionalId: 4 };
const recep = { role: "recepcao", professionalId: null };

const tpl = (id, professional_id, extra = {}) => ({
  id,
  professional_id,
  kind: "atestado",
  subkind: "medico",
  name: `m${id}`,
  title: null,
  body: "x",
  fields: null,
  created_at: "2026-09-01",
  ...extra,
});

test("canManage: admin manages everything; a professional only their own", () => {
  assert.equal(canManage(tpl(1, null), admin), true);
  assert.equal(canManage(tpl(1, 9), admin), true);
  assert.equal(canManage(tpl(1, 4), prof4), true);
  assert.equal(canManage(tpl(1, 9), prof4), false);
  assert.equal(canManage(tpl(1, null), prof4), false);
  // Sem profissional vinculado, "null === null" não pode virar permissão.
  assert.equal(canManage(tpl(1, null), recep), false);
});

test("scopeLabel", () => {
  assert.equal(scopeLabel(tpl(1, null), prof4), "Da clínica");
  assert.equal(scopeLabel(tpl(1, 4), prof4), "Meus modelos");
  assert.equal(scopeLabel(tpl(1, 9, { professional_name: "Dra. Ana" }), prof4), "De Dra. Ana");
  assert.equal(scopeLabel(tpl(1, 9), prof4), "De outro profissional");
});

test("editorState: editing only a manageable, non-protocol template", () => {
  const list = [tpl(1, 4, { kind: "laudo", subkind: null }), tpl(2, 9), tpl(3, 4, { kind: "protocolo" })];
  const mine = editorState(list, prof4, { editar: "1" });
  assert.equal(mine.editing?.id, 1);
  assert.equal(mine.kind, "laudo");
  assert.equal(mine.subkind, "medico");
  assert.equal(mine.seed, null);
  assert.equal(editorState(list, prof4, { editar: "2" }).editing, null);
  assert.equal(editorState(list, admin, { editar: "2" }).editing?.id, 2);
  assert.equal(editorState(list, adminProf, { editar: "3" }).editing, null);
  assert.equal(editorState(list, admin, { editar: "abc" }).editing, null);
});

test("editorState: ?novo= seeds from a default only when not editing and the key exists", () => {
  const seeded = editorState([], admin, { novo: "atestado.acompanhante" });
  assert.equal(seeded.seed, "atestado.acompanhante");
  assert.equal(seeded.kind, "atestado");
  assert.equal(seeded.subkind, "acompanhante");
  assert.equal(seeded.seedTemplate, DEFAULT_TEMPLATES["atestado.acompanhante"]);

  const laudo = editorState([], admin, { novo: "laudo" });
  assert.equal(laudo.kind, "laudo");
  assert.equal(laudo.subkind, "medico");

  const unknown = editorState([], admin, { novo: "toString" });
  assert.equal(unknown.seed, null);
  assert.equal(unknown.kind, "atestado");
  assert.equal(unknown.subkind, "medico");

  const both = editorState([tpl(1, null)], admin, { editar: "1", novo: "laudo" });
  assert.equal(both.seed, null);
  assert.equal(both.editing?.id, 1);
});

test("every 'Começar do padrão' shortcut points at an existing default", () => {
  for (const item of NEW_FROM) assert.ok(DEFAULT_TEMPLATES[item.key], item.key);
});

test("templatesOkMessage / templatesErroMessage", () => {
  assert.equal(templatesOkMessage(undefined, undefined), null);
  assert.equal(templatesOkMessage("apagado", undefined), "Modelo apagado.");
  assert.match(templatesOkMessage("biblioteca", "3"), /^3 modelo\(s\) pronto\(s\)/);
  assert.match(templatesOkMessage("biblioteca", "0"), /^Modelos prontos instalados/);
  assert.equal(templatesOkMessage("nada", undefined), null);
  assert.equal(templatesErroMessage("campos"), "Dê um nome ao modelo e escreva o texto.");
  assert.equal(templatesErroMessage("nada"), null);
  assert.equal(templatesErroMessage(undefined), null);
});
