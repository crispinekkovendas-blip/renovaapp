import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODE_OF,
  COMPOSER_STEPS,
  MOBILE_VIEWS,
  appendToBody,
  avatarInitials,
  composerReducer,
  composerUrl,
  documentCountLabel,
  editorFromItem,
  emitErrorMessage,
  emptyFieldValues,
  freshEditor,
  initialComposerState,
  initialSendOptions,
  phoneForSend,
  prescriptionSummary,
  prescriptionToItems,
  withPatientPhone,
} from "./composer-editor.ts";
import { DOCUMENT_KIND_LABEL, defaultFieldValues, fieldsFor } from "./documents.ts";
import { parseItems as parsePrescription, printableDocuments } from "./prescription.ts";

const CODE_A = "RNV-AAAA-AAAA";
const CODE_B = "RNV-BBBB-BBBB";

function hydrated(kind = "atestado", subkind = "medico") {
  return composerReducer(initialComposerState(kind, subkind), { type: "hydrate-code", code: CODE_A });
}

const TEMPLATES = [
  { id: 7, kind: "atestado", subkind: "medico", name: "Repouso", title: "Atestado de repouso", body: "x", scope: "meu" },
  { id: 8, kind: "laudo", subkind: null, name: "Laudo curto", title: null, body: "y", scope: "clinica" },
  { id: 9, kind: "atestado", subkind: "comparecimento", name: "Comp.", title: null, body: "z", scope: "meu" },
];

/* ---------- estado inicial ---------- */

test("initialComposerState: pílula no tipo, editor sem código e com os padrões dos campos", () => {
  const state = initialComposerState("atestado", "medico");
  assert.equal(state.tab, "atestado");
  assert.equal(state.editor.code, "");
  assert.equal(state.editor.editing, null);
  assert.deepEqual(state.editor.fields, defaultFieldValues(fieldsFor("atestado", "medico")));
});

test("hydrate-code: dá o código uma vez e não troca um que já exista", () => {
  const state = hydrated();
  assert.equal(state.editor.code, CODE_A);
  const again = composerReducer(state, { type: "hydrate-code", code: CODE_B });
  assert.equal(again, state);
});

test("emptyFieldValues: todos os campos do tipo, vazios", () => {
  const empty = emptyFieldValues("atestado", "medico");
  const keys = fieldsFor("atestado", "medico").map((def) => def.key);
  assert.deepEqual(Object.keys(empty), keys);
  assert.ok(Object.values(empty).every((value) => value === ""));
});

/* ---------- pílulas ---------- */

test("select-tab: outro tipo abre o editor zerado com o código novo", () => {
  const state = composerReducer(hydrated(), { type: "set-body", body: "texto" });
  const next = composerReducer(state, { type: "select-tab", tab: "laudo", code: CODE_B });
  assert.equal(next.tab, "laudo");
  assert.deepEqual(next.editor, freshEditor("laudo", null, null, CODE_B));
});

test("select-tab: 'receita' e a pílula atual não mexem no editor", () => {
  const state = composerReducer(hydrated(), { type: "set-body", body: "texto" });
  const receita = composerReducer(state, { type: "select-tab", tab: "receita", code: CODE_B });
  assert.equal(receita.tab, "receita");
  assert.equal(receita.editor, state.editor);
  const back = composerReducer(receita, { type: "select-tab", tab: "atestado", code: CODE_B });
  assert.equal(back.tab, "atestado");
  assert.equal(back.editor.manualBody, "texto");
  assert.equal(back.editor.code, CODE_A);
  // Clicar a pílula que já está ativa devolve o mesmo estado (sem render à toa).
  assert.equal(composerReducer(back, { type: "select-tab", tab: "atestado", code: CODE_B }), back);
});

test("select-tab: atestado ganha o subtipo padrão; o receituário não tem subtipo", () => {
  const laudo = hydrated("laudo", null);
  assert.equal(composerReducer(laudo, { type: "select-tab", tab: "atestado", code: CODE_B }).editor.subkind, "medico");
  assert.equal(composerReducer(laudo, { type: "select-tab", tab: "receituario", code: CODE_B }).editor.subkind, null);
});

test("select-subkind: troca zera o editor; o mesmo subtipo não faz nada", () => {
  const state = hydrated();
  assert.equal(composerReducer(state, { type: "select-subkind", subkind: "medico", code: CODE_B }), state);
  const next = composerReducer(state, { type: "select-subkind", subkind: "comparecimento", code: CODE_B });
  assert.deepEqual(next.editor, freshEditor("atestado", "comparecimento", null, CODE_B));
});

/* ---------- modelos ---------- */

test("select-template: troca o modelo e volta título e texto ao do modelo", () => {
  let state = composerReducer(hydrated(), { type: "set-body", body: "à mão" });
  state = composerReducer(state, { type: "set-title", title: "Título à mão" });
  const next = composerReducer(state, { type: "select-template", templateId: 7 });
  assert.equal(next.editor.templateId, 7);
  assert.equal(next.editor.manualBody, null);
  assert.equal(next.editor.manualTitle, null);
  assert.equal(next.editor.code, CODE_A);
});

test("apply-template: mesmo tipo e subtipo só troca o modelo, mantendo campos e código", () => {
  let state = composerReducer(hydrated(), { type: "set-field", key: "dias", value: "3" });
  state = composerReducer(state, { type: "apply-template", template: TEMPLATES[0], code: CODE_B });
  assert.equal(state.editor.templateId, 7);
  assert.equal(state.editor.fields.dias, "3");
  assert.equal(state.editor.code, CODE_A);
});

test("apply-template: outro tipo ou subtipo abre o editor nele, com o modelo escolhido", () => {
  const laudo = composerReducer(hydrated(), { type: "apply-template", template: TEMPLATES[1], code: CODE_B });
  assert.equal(laudo.tab, "laudo");
  assert.deepEqual(laudo.editor, freshEditor("laudo", null, 8, CODE_B));
  const comp = composerReducer(hydrated(), { type: "apply-template", template: TEMPLATES[2], code: CODE_B });
  assert.deepEqual(comp.editor, freshEditor("atestado", "comparecimento", 9, CODE_B));
});

test("apply-template: vindo da pílula 'receita', o mesmo tipo reabre a pílula do tipo", () => {
  const receita = composerReducer(hydrated(), { type: "select-tab", tab: "receita", code: CODE_B });
  const next = composerReducer(receita, { type: "apply-template", template: TEMPLATES[0], code: CODE_B });
  assert.equal(next.tab, "atestado");
  assert.deepEqual(next.editor, freshEditor("atestado", "medico", 7, CODE_B));
});

test("apply-template: protocolo não mexe no editor (quem chama o acrescenta à pilha)", () => {
  const state = hydrated();
  const protocol = { id: 20, kind: "protocolo", subkind: null };
  assert.equal(composerReducer(state, { type: "apply-template", template: protocol, code: CODE_B }), state);
});

/* ---------- campos e texto ---------- */

test("set-field / set-title / set-body / reset-body", () => {
  let state = composerReducer(hydrated(), { type: "set-field", key: "dias", value: "2" });
  assert.equal(state.editor.fields.dias, "2");
  state = composerReducer(state, { type: "set-title", title: "T" });
  assert.equal(state.editor.manualTitle, "T");
  state = composerReducer(state, { type: "set-body", body: "B" });
  assert.equal(state.editor.manualBody, "B");
  state = composerReducer(state, { type: "reset-body" });
  assert.equal(state.editor.manualBody, null);
  assert.equal(state.editor.manualTitle, "T");
});

test("append-body: acrescenta ao texto da tela, ou ao manual se houver", () => {
  const auto = composerReducer(hydrated(), { type: "append-body", text: "Hemograma", currentBody: "Texto do modelo\n" });
  assert.equal(auto.editor.manualBody, "Texto do modelo\n\nHemograma");
  const manual = composerReducer(auto, { type: "append-body", text: "TSH", currentBody: "ignorado" });
  assert.equal(manual.editor.manualBody, "Texto do modelo\n\nHemograma\n\nTSH");
});

test("appendToBody: texto vazio não deixa linhas em branco no começo", () => {
  assert.equal(appendToBody("  ", "Painel"), "Painel");
  assert.equal(appendToBody("A  ", "B"), "A\n\nB");
});

/* ---------- pilha ---------- */

test("reset: zera no mesmo tipo, subtipo e modelo, com código novo", () => {
  let state = composerReducer(hydrated(), { type: "apply-template", template: TEMPLATES[0], code: CODE_B });
  state = composerReducer(state, { type: "set-body", body: "x" });
  const next = composerReducer(state, { type: "reset", code: CODE_B });
  assert.deepEqual(next.editor, freshEditor("atestado", "medico", 7, CODE_B));
  assert.equal(next.tab, state.tab);
});

test("editorFromItem + edit-item: o item volta ao editor, na pílula do seu tipo", () => {
  const item = {
    kind: "laudo",
    subkind: null,
    template_id: 8,
    title: "Laudo curto",
    body: "Texto à mão",
    body_auto: "0",
    fields: { historia: "h" },
    code: CODE_B,
  };
  const editor = editorFromItem(item, TEMPLATES);
  assert.equal(editor.editing, CODE_B);
  assert.equal(editor.code, CODE_B);
  assert.equal(editor.manualBody, "Texto à mão");
  assert.equal(editor.fields.historia, "h");
  // Todos os campos do tipo existem, mesmo os que o item não guardou.
  for (const key of Object.keys(emptyFieldValues("laudo", null))) assert.ok(key in editor.fields);
  const state = composerReducer(hydrated(), { type: "edit-item", editor });
  assert.equal(state.tab, "laudo");
  assert.equal(state.editor, editor);
});

test("editorFromItem: texto automático volta a seguir o modelo; título igual ao do modelo não fica fixado", () => {
  const item = {
    kind: "atestado",
    subkind: "medico",
    template_id: 7,
    title: "Atestado de repouso",
    body: "gerado",
    body_auto: "1",
    fields: {},
    code: CODE_B,
  };
  const editor = editorFromItem(item, TEMPLATES);
  assert.equal(editor.manualBody, null);
  assert.equal(editor.manualTitle, null);
  assert.equal(editorFromItem({ ...item, title: "Outro" }, TEMPLATES).manualTitle, "Outro");
});

test("item-removed: só zera se o item removido era o que estava em edição", () => {
  const item = { kind: "laudo", subkind: null, template_id: null, title: "L", body: "b", body_auto: "0", fields: {}, code: CODE_B };
  const editing = composerReducer(hydrated(), { type: "edit-item", editor: editorFromItem(item, []) });
  const other = composerReducer(editing, { type: "item-removed", itemCode: "RNV-CCCC-CCCC", code: CODE_A });
  assert.equal(other, editing);
  const removed = composerReducer(editing, { type: "item-removed", itemCode: CODE_B, code: CODE_A });
  assert.deepEqual(removed.editor, freshEditor("laudo", null, null, CODE_A));
});

/* ---------- receituário ---------- */

const RX = parsePrescription(
  JSON.stringify([
    { name: "Dipirona 500 mg", posology: "1 cp de 6/6 h", tarja: "livre", quantity: "1 caixa" },
    { name: "Amoxicilina 500 mg", posology: "1 cp de 8/8 h", tarja: "vermelha_retida", quantity: "21 cp" },
  ])
);

test("prescriptionToItems: um item por documento, cada um com seu código e a lista nos campos", () => {
  const docs = printableDocuments(RX);
  let n = 0;
  const items = prescriptionToItems(docs, () => `RNV-AAAA-AAA${++n}`);
  assert.equal(items.length, docs.length);
  assert.ok(items.length >= 2, "dipirona e amoxicilina saem em papéis diferentes");
  for (const [i, item] of items.entries()) {
    assert.equal(item.kind, "receituario");
    assert.equal(item.subkind, null);
    assert.equal(item.template_id, null);
    assert.equal(item.body_auto, "0");
    assert.equal(item.title, docs[i].label);
    assert.equal(item.body, docs[i].body);
    assert.equal(parsePrescription(item.fields.medicamentos).length, docs[i].items.length);
  }
  assert.deepEqual(items.map((item) => item.code), ["RNV-AAAA-AAA1", "RNV-AAAA-AAA2"]);
});

test("prescriptionSummary: conta documentos e medicamentos; o selo da via só com retenção ou mais de um papel", () => {
  const empty = prescriptionSummary([]);
  assert.deepEqual(empty, { docs: [], medicationCount: 0, viaLabel: null });
  const both = prescriptionSummary(RX);
  assert.equal(both.medicationCount, 2);
  assert.equal(both.viaLabel, "1ª via — Farmácia (retenção)");
  const simple = prescriptionSummary(RX.slice(0, 1));
  assert.equal(simple.docs.length, 1);
  assert.equal(simple.viaLabel, simple.docs[0].vias > 1 ? "1ª via — Farmácia (retenção)" : null);
});

/* ---------- textos ---------- */

test("avatarInitials: primeira e última iniciais", () => {
  assert.equal(avatarInitials("Ana Beatriz Souza"), "AS");
  assert.equal(avatarInitials("  maria  "), "M");
  assert.equal(avatarInitials(""), "");
});

test("documentCountLabel: singular e plural", () => {
  assert.equal(documentCountLabel(0), "0 documentos");
  assert.equal(documentCountLabel(1), "1 documento");
  assert.equal(documentCountLabel(4), "4 documentos");
});

test("CODE_OF cobre todo tipo de documento", () => {
  assert.deepEqual(Object.keys(CODE_OF).sort(), Object.keys(DOCUMENT_KIND_LABEL).sort());
});

test("emitErrorMessage: códigos conhecidos e o genérico (nem herança de Object passa)", () => {
  assert.match(emitErrorMessage("campos"), /profissional/);
  assert.equal(emitErrorMessage("xyz"), "Não deu para emitir agora. Tente de novo.");
  assert.equal(emitErrorMessage("toString"), "Não deu para emitir agora. Tente de novo.");
});

test("composerUrl: tipo, subtipo e atendimento só quando existem", () => {
  assert.equal(composerUrl(12, "laudo", null, null), "/pacientes/12/emitir?kind=laudo");
  assert.equal(composerUrl(12, "atestado", "medico", 5), "/pacientes/12/emitir?kind=atestado&sub=medico&encounter=5");
});

test("listas que espelham uniões", () => {
  assert.deepEqual(COMPOSER_STEPS, ["compose", "review"]);
  assert.deepEqual(MOBILE_VIEWS.map((v) => v.view), ["editar", "previa"]);
});

/* ---------- revisão ---------- */

test("initialSendOptions: WhatsApp ligado só com celular no cadastro", () => {
  assert.equal(initialSendOptions("(11) 9").openWhatsApp, true);
  assert.equal(initialSendOptions("  ").openWhatsApp, false);
  assert.equal(initialSendOptions(null).shared, true);
});

test("withPatientPhone: escrever liga o WhatsApp; apagar não desliga", () => {
  const off = initialSendOptions(null);
  const on = withPatientPhone(off, "11 99999");
  assert.equal(on.openWhatsApp, true);
  assert.equal(on.patientPhone, "11 99999");
  assert.equal(withPatientPhone(on, "").openWhatsApp, true);
  assert.equal(withPatientPhone(off, "   ").openWhatsApp, false);
});

test("phoneForSend: o do cadastro vence o escrito", () => {
  assert.equal(phoneForSend(" 11 1 ", "22"), "11 1");
  assert.equal(phoneForSend(null, " 22 "), "22");
  assert.equal(phoneForSend("", ""), "");
});
