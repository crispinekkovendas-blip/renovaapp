import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RAIL_DRAWERS,
  RAIL_STORAGE_KEY,
  TEMPLATE_FILTERS,
  filterTemplates,
  groupByYear,
  isRailDrawer,
  isTemplateFilter,
  normalizeSearch,
  shortDayMonth,
  stackStorageKey,
  stackStorageKeyPrefix,
} from "./composer-rail.ts";

test("rail drawers: three, in Mevo's order, with a type guard", () => {
  assert.deepEqual(
    RAIL_DRAWERS.map((d) => d.id),
    ["perfil", "historico", "modelos"]
  );
  assert.equal(isRailDrawer("perfil"), true);
  assert.equal(isRailDrawer("historico"), true);
  assert.equal(isRailDrawer("modelos"), true);
  assert.equal(isRailDrawer("receita"), false);
  assert.equal(isRailDrawer(null), false);
  assert.equal(RAIL_STORAGE_KEY, "renova_emit_rail");
});

test("stackStorageKey is per patient and encounter; the prefix covers every encounter of the patient", () => {
  assert.equal(stackStorageKey(12, 34), "renova_emit_stack_12_34");
  assert.equal(stackStorageKey(12, null), "renova_emit_stack_12_0");
  assert.equal(stackStorageKey(12, undefined), "renova_emit_stack_12_0");
  assert.equal(stackStorageKeyPrefix(12), "renova_emit_stack_12_");
  assert.ok(stackStorageKey(12, 34).startsWith(stackStorageKeyPrefix(12)));
  // Paciente 1 nunca casa com o prefixo do paciente 12.
  assert.ok(!stackStorageKey(1, 2).startsWith(stackStorageKeyPrefix(12)));
});

test("groupByYear keeps the incoming order, one group per year in first-seen order", () => {
  const docs = [
    { id: 5, issued_at: "2026-09-16" },
    { id: 4, issued_at: "2026-01-02" },
    { id: 3, issued_at: "2025-12-31" },
    { id: 2, issued_at: "2025-03-10" },
    { id: 1, issued_at: "2023-07-07" },
  ];
  const groups = groupByYear(docs, (d) => d.issued_at);
  assert.deepEqual(
    groups.map((g) => [g.year, g.items.map((d) => d.id)]),
    [
      ["2026", [5, 4]],
      ["2025", [3, 2]],
      ["2023", [1]],
    ]
  );
});

test("groupByYear tolerates empty lists and unreadable dates", () => {
  assert.deepEqual(groupByYear([], () => "2026-01-01"), []);
  const groups = groupByYear([{ d: "" }, { d: null }, { d: "2026-05-05T10:00:00" }, { d: "abc" }], (x) => x.d);
  assert.deepEqual(
    groups.map((g) => [g.year, g.items.length]),
    [
      ["Sem data", 3],
      ["2026", 1],
    ]
  );
});

test("shortDayMonth prints day + pt-BR month abbreviation", () => {
  assert.equal(shortDayMonth("2026-09-16"), "16 set");
  assert.equal(shortDayMonth("2026-01-01"), "1 jan");
  assert.equal(shortDayMonth("2025-12-31T23:59:00"), "31 dez");
  assert.equal(shortDayMonth("2026-13-01"), "—");
  assert.equal(shortDayMonth("16/09/2026"), "—");
  assert.equal(shortDayMonth(""), "—");
  assert.equal(shortDayMonth(null), "—");
});

test("normalizeSearch drops case and accents", () => {
  assert.equal(normalizeSearch("  Pós-Consulta Padrão "), "pos-consulta padrao");
  assert.equal(normalizeSearch("ATESTAÇÃO"), "atestacao");
});

const templates = [
  { id: 1, name: "Atestado repouso", kind: "atestado", scope: "meu" },
  { id: 2, name: "Encaminhamento cardio", kind: "encaminhamento", scope: "clinica" },
  { id: 3, name: "Pós-consulta padrão", kind: "protocolo", scope: "clinica" },
  { id: 4, name: "Orientações pós-op", kind: "orientacoes", scope: "outro" },
  { id: 5, name: "Meu protocolo", kind: "protocolo", scope: "meu" },
];

test("filterTemplates: filters by scope or protocolos, searches by name without accents", () => {
  const ids = (list) => list.map((t) => t.id);
  assert.deepEqual(ids(filterTemplates(templates, "", "todos")), [1, 2, 3, 4, 5]);
  assert.deepEqual(ids(filterTemplates(templates, "", "meus")), [1, 5]);
  assert.deepEqual(ids(filterTemplates(templates, "", "clinica")), [2, 3]);
  assert.deepEqual(ids(filterTemplates(templates, "", "protocolos")), [3, 5]);
  assert.deepEqual(ids(filterTemplates(templates, "pos", "todos")), [3, 4]);
  assert.deepEqual(ids(filterTemplates(templates, "PÓS", "clinica")), [3]);
  assert.deepEqual(ids(filterTemplates(templates, "cardio", "meus")), []);
  assert.deepEqual(ids(filterTemplates([], "x", "todos")), []);
});

test("template filters: four pills, with a type guard", () => {
  assert.deepEqual(
    TEMPLATE_FILTERS.map((f) => f.id),
    ["todos", "meus", "clinica", "protocolos"]
  );
  assert.equal(isTemplateFilter("clinica"), true);
  assert.equal(isTemplateFilter("outro"), false);
});
