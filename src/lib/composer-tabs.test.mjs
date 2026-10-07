import { test } from "node:test";
import assert from "node:assert/strict";
import { TAB_BLURB, countTemplateUses, mostUsedTemplates, shortTemplateName } from "./composer-tabs.ts";

const T = (id, scope = "clinica") => ({ id, scope });
const ids = (list) => list.map((t) => t.id);

test("os modelos mais usados vêm primeiro, até 6", () => {
  const templates = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => T(id));
  assert.deepEqual(ids(mostUsedTemplates(templates, { 7: 9, 3: 4, 8: 4 })), [7, 3, 8, 1, 2, 4]);
});

test("empate: os meus antes dos da clínica, e os de outros por último", () => {
  const templates = [T(1, "outro"), T(2, "clinica"), T(3, "meu"), T(4, "clinica")];
  assert.deepEqual(ids(mostUsedTemplates(templates, {})), [3, 2, 4, 1]);
});

test("a lista original não muda de ordem (a aba Todos)", () => {
  const templates = [T(1), T(2), T(3)];
  mostUsedTemplates(templates, { 3: 5 });
  assert.deepEqual(ids(templates), [1, 2, 3]);
});

test("conta os usos de cada modelo e ignora documento sem modelo", () => {
  assert.deepEqual(countTemplateUses([4, null, 4, 9, undefined, 4]), { 4: 3, 9: 1 });
});

test("todo tipo tem descrição", () => {
  for (const tab of ["receita", "atestado", "encaminhamento", "laudo", "orientacoes", "receituario"]) {
    assert.ok(TAB_BLURB[tab]?.length > 10, tab);
  }
});

test("o nome curto tira só o tipo repetido na frente", () => {
  assert.equal(shortTemplateName("Encaminhamento — fisioterapia"), "Fisioterapia");
  assert.equal(shortTemplateName("Atestado médico – gripe"), "Gripe");
  assert.equal(shortTemplateName("Contrarreferência — retorno ao médico"), "Contrarreferência — retorno ao médico");
  assert.equal(shortTemplateName("Pós-operatório"), "Pós-operatório");
});
