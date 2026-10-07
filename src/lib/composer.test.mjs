import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_COMPOSER_ITEMS,
  appendItems,
  applyProtocol,
  buildItem,
  itemSummary,
  itemsToProtocol,
  parseItems,
  removeItem,
  renderItemBody,
  replaceItem,
  resolveTemplateText,
  seedFromDocument,
  seedFromTemplate,
  serializeItems,
  templatesForKind,
} from "./composer.ts";
import { ATESTADO_MOTIVOS, DEFAULT_TEMPLATES, DOCUMENT_CODE_RE, serializeDocumentFields } from "./documents.ts";

function stubRandom(bytes) {
  return {
    getRandomValues(array) {
      for (let i = 0; i < array.length; i += 1) array[i] = bytes[i % bytes.length];
      return array;
    },
  };
}

/** Fonte previsível mas que muda a cada chamada: códigos distintos e reproduzíveis. */
function sequence() {
  let n = 0;
  return {
    getRandomValues(array) {
      n += 1;
      for (let i = 0; i < array.length; i += 1) array[i] = (n * 7 + i) % 256;
      return array;
    },
  };
}

const ctx = {
  patient: { name: "Ana Beatriz Souza", cpf: "412.658.790-01", social_name: null },
  professional: { name: "Dra. Marina Costa", council: "CRM 123456-SP" },
  clinicName: "Clínica Renova",
  date: "2026-09-16",
};

const templates = [
  { id: 1, kind: "atestado", subkind: "medico", name: "Atestado 3 dias", title: null, body: "Atestado de {{dias}} dias para {{paciente}} em {{data}}.", scope: "meu" },
  { id: 2, kind: "atestado", subkind: "comparecimento", name: "Comparecimento curto", title: "Comparecimento", body: "{{paciente}} esteve aqui das {{entrada}} às {{saida}}.", scope: "clinica" },
  { id: 3, kind: "encaminhamento", subkind: null, name: "Encaminho cardio", title: "Encaminhamento ao cardiologista", body: "Encaminho {{paciente}} a {{destino}}. {{historia}}", scope: "clinica" },
  { id: 4, kind: "orientacoes", subkind: null, name: "Pós-op", title: null, body: "Repouso, {{paciente}}.", scope: "outro" },
  {
    id: 9,
    kind: "protocolo",
    subkind: null,
    name: "Pós-consulta padrão",
    title: null,
    body: "",
    scope: "clinica",
    items: [
      { kind: "atestado", subkind: "medico", template_id: 1, title: null, fields: { dias: "2" } },
      { kind: "encaminhamento", subkind: null, template_id: 3, title: "Para o cardio", fields: { destino: "Cardiologia" } },
      { kind: "orientacoes", subkind: null, template_id: 404, title: null, fields: {} },
    ],
  },
];

// ---------- templates ----------

test("templatesForKind picks the models of the active kind and subkind, never protocolos", () => {
  assert.deepEqual(templatesForKind(templates, "atestado", "medico").map((t) => t.id), [1]);
  assert.deepEqual(templatesForKind(templates, "atestado", null).map((t) => t.id), [1]);
  assert.deepEqual(templatesForKind(templates, "atestado", "comparecimento").map((t) => t.id), [2]);
  assert.deepEqual(templatesForKind(templates, "encaminhamento", null).map((t) => t.id), [3]);
  assert.deepEqual(templatesForKind(templates, "laudo", null), []);
});

test("resolveTemplateText mirrors the server: saved model of the same kind, else the default", () => {
  assert.deepEqual(resolveTemplateText(templates, null, "atestado", "medico"), {
    template: DEFAULT_TEMPLATES["atestado.medico"],
    templateId: null,
  });
  const saved = resolveTemplateText(templates, 1, "atestado", "medico");
  assert.equal(saved.templateId, 1);
  assert.equal(saved.template.body, templates[0].body);
  // Sem título no modelo, o título padrão do tipo.
  assert.equal(saved.template.title, "Atestado médico");
  assert.equal(resolveTemplateText(templates, 3, "encaminhamento", null).template.title, "Encaminhamento ao cardiologista");
  // Modelo de outro tipo ou que não existe mais → padrão.
  assert.equal(resolveTemplateText(templates, 3, "atestado", "medico").templateId, null);
  assert.equal(resolveTemplateText(templates, 404, "laudo", null).templateId, null);
  assert.equal(resolveTemplateText(templates, 9, "orientacoes", null).templateId, null);
});

test("renderItemBody applies the CID rule through kind", () => {
  const body = "CID: {{cid}}";
  assert.equal(renderItemBody("atestado", body, { cid: "J03.9" }, ctx), "");
  assert.equal(renderItemBody("atestado", body, { cid: "J03.9", cid_consent: "1" }, ctx), "CID: J03.9");
  assert.equal(renderItemBody("encaminhamento", body, { cid: "J03.9" }, ctx), "CID: J03.9");
});

// ---------- items ----------

test("buildItem renders the model with the fields and context and stamps a code", () => {
  const item = buildItem({
    kind: "atestado",
    subkind: "medico",
    templateId: 1,
    templates,
    fields: { dias: " 3 ", cid: "" },
    ctx,
    random: stubRandom([0, 1, 2, 3, 4, 5, 6, 7]),
  });
  assert.deepEqual(item, {
    kind: "atestado",
    subkind: "medico",
    template_id: 1,
    title: "Atestado médico",
    body: "Atestado de 3 dias para Ana Beatriz Souza em 16/09/2026.",
    body_auto: "1",
    fields: { dias: "3" },
    code: "RNV-ABCD-EFGH",
  });
});

test("buildItem with a hand-written body keeps it and marks body_auto = 0; title falls back to the kind", () => {
  const item = buildItem({ kind: "laudo", templates, body: "  Texto meu.  ", ctx });
  assert.equal(item.body, "Texto meu.");
  assert.equal(item.body_auto, "0");
  assert.equal(item.title, "Relatório médico");
  assert.equal(item.subkind, null);
  assert.match(item.code, DOCUMENT_CODE_RE);
  // Título explícito vence, aparado e limitado.
  assert.equal(buildItem({ kind: "laudo", templates, title: `  ${"x".repeat(200)}  `, ctx }).title.length, 120);
});

test("seedFromDocument re-renders from the stored model with today's date and keeps the title", () => {
  const doc = {
    kind: "atestado",
    subkind: "medico",
    title: "Atestado — gripe",
    body: "Atestado de 3 dias para Ana Beatriz Souza em 01/01/2026.",
    fields: serializeDocumentFields({ template_id: 1, fields: { dias: "3" } }),
  };
  const item = seedFromDocument(doc, templates, ctx, stubRandom([8, 9, 10, 11, 12, 13, 14, 15]));
  assert.equal(item.body, "Atestado de 3 dias para Ana Beatriz Souza em 16/09/2026.");
  assert.equal(item.title, "Atestado — gripe");
  assert.equal(item.template_id, 1);
  assert.equal(item.body_auto, "1");
  assert.deepEqual(item.fields, { dias: "3" });
  assert.equal(item.code, "RNV-JKLM-NPQR");
});

test("seedFromDocument falls back to the default model when the stored one is gone, and copies free text as is", () => {
  const gone = seedFromDocument(
    { kind: "atestado", subkind: "comparecimento", title: "Declaração", body: "velho", fields: serializeDocumentFields({ template_id: 404, fields: { entrada: "08:00", saida: "09:00" } }) },
    templates,
    ctx
  );
  assert.equal(gone.template_id, null);
  assert.match(gone.body, /compareceu a este serviço em 16\/09\/2026, das 08:00 às 09:00/);

  const free = seedFromDocument(
    { kind: "laudo", subkind: null, title: "Laudo de ontem", body: "Texto escrito à mão.", fields: null },
    templates,
    ctx
  );
  assert.equal(free.body, "Texto escrito à mão.");
  assert.equal(free.body_auto, "0");
  assert.equal(free.title, "Laudo de ontem");
  assert.equal(free.template_id, null);
});

test("applyProtocol turns each protocol item into a stack item with its own code", () => {
  const items = applyProtocol(templates[4].items, templates, ctx, sequence());
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((i) => [i.kind, i.template_id, i.title]),
    [
      ["atestado", 1, "Atestado médico"],
      ["encaminhamento", 3, "Para o cardio"],
      // Modelo 404 não existe mais → padrão do tipo.
      ["orientacoes", null, "Orientações"],
    ]
  );
  assert.equal(items[0].body, "Atestado de 2 dias para Ana Beatriz Souza em 16/09/2026.");
  assert.equal(items[1].body, "Encaminho Ana Beatriz Souza a Cardiologia.");
  assert.match(items[2].body, /^Orientações para Ana Beatriz Souza/);
  assert.equal(new Set(items.map((i) => i.code)).size, 3);
  for (const item of items) assert.match(item.code, DOCUMENT_CODE_RE);
});

test("seedFromTemplate: a plain model seeds one item with the default fields; a protocolo seeds several", () => {
  const [single] = seedFromTemplate(templates[0], templates, ctx);
  assert.equal(single.template_id, 1);
  assert.deepEqual(single.fields, { dias: "1", motivo: ATESTADO_MOTIVOS[0] });
  assert.equal(single.body, "Atestado de 1 dias para Ana Beatriz Souza em 16/09/2026.");
  assert.equal(seedFromTemplate(templates[4], templates, ctx).length, 3);
  assert.deepEqual(seedFromTemplate({ ...templates[4], items: undefined }, templates, ctx), []);
});

test("appendItems respects the limit and never repeats a code", () => {
  const base = buildItem({ kind: "laudo", templates, ctx, random: stubRandom([0, 1, 2, 3, 4, 5, 6, 7]) });
  const clash = buildItem({ kind: "orientacoes", templates, ctx, random: stubRandom([0, 1, 2, 3, 4, 5, 6, 7]) });
  assert.equal(base.code, clash.code);
  const stack = appendItems([base], [clash], stubRandom([8, 9, 10, 11, 12, 13, 14, 15]));
  assert.equal(stack.length, 2);
  assert.equal(stack[1].code, "RNV-JKLM-NPQR");
  assert.equal(stack[1].kind, "orientacoes");

  const many = Array.from({ length: MAX_COMPOSER_ITEMS + 3 }, () => buildItem({ kind: "laudo", templates, ctx }));
  assert.equal(appendItems([], many).length, MAX_COMPOSER_ITEMS);
  assert.equal(appendItems(many.slice(0, MAX_COMPOSER_ITEMS), [base]).length, MAX_COMPOSER_ITEMS);
});

test("replaceItem and removeItem work by code and leave the rest untouched", () => {
  const a = buildItem({ kind: "laudo", templates, ctx, random: stubRandom([0, 1, 2, 3, 4, 5, 6, 7]) });
  const b = buildItem({ kind: "orientacoes", templates, ctx, random: stubRandom([8, 9, 10, 11, 12, 13, 14, 15]) });
  const edited = { ...a, title: "Outro título" };
  assert.deepEqual(replaceItem([a, b], a.code, edited), [edited, b]);
  assert.deepEqual(removeItem([a, b], a.code), [b]);
  assert.deepEqual(removeItem([a, b], "RNV-ZZZZ-ZZZZ"), [a, b]);
});

// ---------- serialization ----------

test("serializeItems/parseItems round-trip the posted shape exactly", () => {
  const item = buildItem({
    kind: "encaminhamento",
    templateId: 3,
    templates,
    fields: { destino: "Cardiologia", cid: "I10", bogus: "x" },
    ctx,
    random: stubRandom([0, 1, 2, 3, 4, 5, 6, 7]),
  });
  const json = serializeItems([item]);
  assert.deepEqual(JSON.parse(json), [
    {
      kind: "encaminhamento",
      subkind: null,
      template_id: 3,
      title: "Encaminhamento ao cardiologista",
      body: "Encaminho Ana Beatriz Souza a Cardiologia.",
      body_auto: "1",
      fields: { destino: "Cardiologia", cid: "I10" },
      code: "RNV-ABCD-EFGH",
    },
  ]);
  assert.deepEqual(parseItems(json), [item]);
});

test("parseItems tolerates garbage, skips unknown kinds, fixes codes and caps the list", () => {
  assert.deepEqual(parseItems(""), []);
  assert.deepEqual(parseItems(null), []);
  assert.deepEqual(parseItems("{nope"), []);
  assert.deepEqual(parseItems("42"), []);
  assert.deepEqual(parseItems(JSON.stringify([{ kind: "receita", title: "x" }])), []);

  const fixed = parseItems(
    JSON.stringify({
      items: [
        { kind: "atestado", subkind: "qualquer", body: "  a  ", body_auto: "0", fields: { cid_consent: "on" }, code: "RNV-ABC0-EFGH" },
        { kind: "laudo", title: "", body: "b", code: "RNV-ABCD-EFGH", template_id: 0 },
        { kind: "laudo", body: "c", code: "RNV-ABCD-EFGH", template_id: 5, body_auto: "sim" },
      ],
    }),
    sequence()
  );
  assert.equal(fixed.length, 3);
  assert.equal(fixed[0].subkind, "medico");
  assert.equal(fixed[0].body, "a");
  assert.equal(fixed[0].body_auto, "0");
  assert.deepEqual(fixed[0].fields, { cid_consent: "1" });
  assert.match(fixed[0].code, DOCUMENT_CODE_RE);
  assert.notEqual(fixed[0].code, "RNV-ABC0-EFGH");
  assert.equal(fixed[1].title, "Relatório médico");
  assert.equal(fixed[1].code, "RNV-ABCD-EFGH");
  assert.equal(fixed[1].template_id, null);
  // Código repetido: o segundo ganha outro.
  assert.notEqual(fixed[2].code, "RNV-ABCD-EFGH");
  assert.equal(fixed[2].template_id, 5);
  assert.equal(fixed[2].body_auto, "1");

  const tooMany = Array.from({ length: MAX_COMPOSER_ITEMS + 5 }, () => ({ kind: "laudo", body: "x" }));
  assert.equal(parseItems(JSON.stringify(tooMany)).length, MAX_COMPOSER_ITEMS);
});

test("itemsToProtocol keeps kind, model, title and fields — never body or code", () => {
  const item = buildItem({ kind: "atestado", templateId: 1, templates, fields: { dias: "2" }, ctx });
  assert.deepEqual(itemsToProtocol([item, { ...item, title: "  " }]), [
    { kind: "atestado", subkind: "medico", template_id: 1, title: "Atestado médico", fields: { dias: "2" } },
    { kind: "atestado", subkind: "medico", template_id: 1, title: null, fields: { dias: "2" } },
  ]);
});

test("itemSummary flattens whitespace and cuts at a word boundary", () => {
  assert.equal(itemSummary("Curto.\n\nMesmo."), "Curto. Mesmo.");
  const long = "Atesto, para os devidos fins, que Ana Beatriz Souza esteve sob meus cuidados nesta data e precisa de repouso.";
  const summary = itemSummary(long, 60);
  assert.ok(summary.length <= 61, summary);
  assert.ok(summary.endsWith("…"));
  assert.doesNotMatch(summary, / …$/);
  assert.equal(itemSummary("x".repeat(100), 20), `${"x".repeat(20)}…`);
});
