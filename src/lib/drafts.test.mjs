import { test } from "node:test";
import assert from "node:assert/strict";
import { draftIsEmpty, draftTitle, draftWhen, parseDraft, serializeDraft } from "./drafts.ts";

const editor = (patch = {}) => ({
  kind: "atestado",
  subkind: "medico",
  templateId: null,
  fields: {},
  manualBody: null,
  manualTitle: null,
  ...patch,
});
const rxItem = (name) => ({ name, concentration: null, tarja: "livre", quantity: "1 caixa", posology: "Tomar", route: "Via oral", continuous: false });
const stackItem = (kind, title) => ({ kind, subkind: null, template_id: null, title, body: "x", body_auto: "0", fields: {}, code: "" });

test("rascunho vazio: nada montado e só os valores padrão do formulário", () => {
  assert.equal(draftIsEmpty({ tab: "atestado", editor: editor(), items: [], rx: [] }), true);
  // "1" dia de afastamento é o padrão do atestado: não conta como escrito.
  assert.equal(draftIsEmpty({ tab: "atestado", editor: editor({ fields: { dias: "1" } }), items: [], rx: [] }), true);
  assert.equal(draftIsEmpty({ tab: "atestado", editor: editor({ fields: { dias: "3" } }), items: [], rx: [] }), false);
  assert.equal(draftIsEmpty({ tab: "receituario", editor: editor(), items: [], rx: [rxItem("Dipirona")] }), false);
  assert.equal(draftIsEmpty({ tab: "atestado", editor: editor({ manualBody: "Texto" }), items: [], rx: [] }), false);
});

test("título do rascunho resume o que está montado", () => {
  const state = {
    tab: "receituario",
    editor: editor(),
    items: [stackItem("encaminhamento", "Encaminhamento a cardiologia")],
    rx: [rxItem("Dipirona"), rxItem("Amoxicilina")],
  };
  assert.equal(draftTitle(state), "Receituário · 2 medicamentos + Encaminhamento a cardiologia");
  assert.equal(draftTitle({ tab: "atestado", editor: editor({ fields: { dias: "2" } }), items: [], rx: [] }), "Atestado");
});

test("ida e volta pelo JSON, e lixo vira null", () => {
  const state = { tab: "receituario", editor: editor(), items: [], rx: [rxItem("Dipirona")] };
  const back = parseDraft(serializeDraft(state));
  assert.equal(back.tab, "receituario");
  assert.equal(back.rx[0].name, "Dipirona");
  assert.equal(parseDraft("{nada"), null);
  assert.equal(parseDraft("[]"), null);
  assert.equal(parseDraft(null), null);
});

test("quando: hoje, ontem, data do ano e de outro ano", () => {
  assert.equal(draftWhen("2026-09-28 14:32:05", "2026-09-28"), "hoje às 14:32");
  assert.equal(draftWhen("2026-09-27 09:10:00", "2026-09-28"), "ontem às 09:10");
  assert.equal(draftWhen("2026-09-25 18:00:00", "2026-09-28"), "25/09 às 18:00");
  assert.equal(draftWhen("2025-12-31 23:59:00", "2026-01-01"), "ontem às 23:59");
  assert.equal(draftWhen("2025-03-02 08:00:00", "2026-09-28"), "02/03/2025 às 08:00");
});
