import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, search } from "./smart-search.ts";
import { plantaoDocs } from "./emergency-guide/index.ts";
import { driveDocs } from "./prescription-drive/index.ts";
import { guideEntries } from "./clinical-guide.ts";
import { TAB_SOURCE, cidMatches, guideItems, guideSearchDocs, orderHits, resultSnippet } from "./guide-search.ts";
import { loadMemory, mergeMemories } from "./search-history.ts";

const data = { receitas: guideEntries(), plantao: plantaoDocs(), drive: driveDocs() };
const index = buildIndex(guideSearchDocs(data));
const items = guideItems(data);
const source = (id) => id.split(":")[0];

/** Como a tela ordena: CID primeiro, depois a busca, com a aba aberta na frente no empate. */
function results(query, tab) {
  const byCid = cidMatches(data, query);
  return [...byCid, ...orderHits(search(index, query).hits, tab).map((h) => h.id).filter((id) => !byCid.includes(id))];
}

test("busca única: as três abas num índice só, cada item com a sua fonte", () => {
  const docs = guideSearchDocs(data);
  assert.equal(docs.length, data.receitas.length + data.plantao.length + data.drive.length);
  assert.equal(new Set(docs.map((d) => d.id)).size, docs.length, "id repetido entre abas");
  assert.deepEqual([...new Set(docs.map((d) => source(d.id)))], ["receitas", "plantao", "drive"]);
  for (const d of docs) assert.ok(items.has(d.id), `${d.id} sem item para mostrar`);
  assert.deepEqual(TAB_SOURCE, { "/guia": "receitas", "/guia/plantao": "plantao", "/guia/drive": "drive" });
});

test("busca única: a condição aparece nas três fontes, e a aba aberta vem antes no empate", () => {
  for (const query of ["enxaqueca", "migranha", "dengue"]) {
    const top3 = results(query, "receitas").slice(0, 3);
    assert.deepEqual(new Set(top3.map(source)), new Set(["receitas", "plantao", "drive"]), `"${query}": ${top3.join(", ")}`);
  }
  assert.equal(results("enxaqueca", "receitas")[0], "receitas:Crise de enxaqueca");
  assert.equal(results("enxaqueca", "plantao")[0], "plantao:enxaqueca");
  assert.equal(results("enxaqueca", "drive")[0], "drive:enxaqueca");
  // Fora da aba (sem preferência), nada se perde.
  assert.ok(results("sepse", null).includes("plantao:sepse-e-choque-septico"));
});

test("busca única: CID acha a receita e a entrada do Drive", () => {
  assert.deepEqual(cidMatches(data, "n30").map(source), ["receitas", "receitas", "drive"]);
  assert.ok(cidMatches(data, "N30").includes("drive:cistite-nao-complicada"));
  assert.deepEqual(cidMatches(data, "sepse"), []);
  assert.equal(source(results("N30", "plantao")[0]), "receitas", "CID vem antes mesmo na aba do plantão");
});

test("busca única: o resultado mostra a linha que explica por que casou", () => {
  const line = (query, id) => {
    const hit = search(index, query).hits.find((h) => h.id === id);
    assert.ok(hit, `"${query}" não achou ${id}`);
    return resultSnippet(items.get(id), hit.terms, query).line ?? "";
  };
  // A queixa como o médico digitou ganha do nome parecido ("infecção urinária").
  assert.equal(line("ardência para urinar", "receitas:Cistite (ITU baixa não complicada)"), "Sintoma: ardência para urinar");
  assert.match(line("dor de cabeça latejante com enjoo", "drive:enxaqueca"), /^Sintoma: .*latejante/);
  assert.match(line("noradrenalina", "plantao:aminas-vasoativas"), /noradrenalina/i);
  // Receita achada pelo remédio: a linha dos remédios, como fechada.
  assert.match(line("amoxicilina", "receitas:Otite média aguda"), /^Amoxicilina 500 mg · /);
  // Pela posologia: o remédio com o modo de usar.
  assert.match(line("início da crise", "receitas:Crise de enxaqueca"), /^Sumatriptana .*: Tomar .*início da crise/);
  // O título não se repete como trecho.
  assert.equal(line("dengue", "plantao:dengue") === "Dengue", false);
});

test("na mesma relevância a aba aberta vem antes; relevância maior ainda ganha", () => {
  const hits = [
    { id: "plantao:a", score: 10, complete: true, terms: [] },
    { id: "receitas:b", score: 10, complete: true, terms: [] },
    { id: "drive:c", score: 20, complete: true, terms: [] },
  ];
  assert.deepEqual(orderHits(hits, "receitas").map((h) => h.id), ["drive:c", "receitas:b", "plantao:a"]);
  assert.deepEqual(orderHits(hits, "plantao").map((h) => h.id), ["drive:c", "plantao:a", "receitas:b"]);
  assert.deepEqual(orderHits(hits, null).map((h) => h.id), ["drive:c", "plantao:a", "receitas:b"]);
});

test("a memória das três buscas antigas vira a da busca única", () => {
  const merged = mergeMemories([
    { prefix: "receitas:", memory: { recent: ["garganta", "cistite"], picks: { cistite: { "Cistite (ITU baixa não complicada)": 2 } } } },
    { prefix: "plantao:", memory: { recent: ["sepse", "Cistite"], picks: { sepse: { "sepse-e-choque-septico": 3 }, cistite: { "infeccao-do-trato-urinario": 1 } } } },
    { prefix: "drive:", memory: { recent: [], picks: {} } },
  ]);
  assert.deepEqual(merged.recent, ["garganta", "sepse", "cistite"], "intercaladas, sem repetir");
  assert.deepEqual(merged.picks, {
    cistite: { "receitas:Cistite (ITU baixa não complicada)": 2, "plantao:infeccao-do-trato-urinario": 1 },
    sepse: { "plantao:sepse-e-choque-septico": 3 },
  });

  const store = new Map([
    ["renova.busca.plantao", JSON.stringify({ recent: ["nora"], picks: { nora: { "aminas-vasoativas": 1 } } })],
  ]);
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  try {
    const inherit = [{ scope: "receitas", prefix: "receitas:" }, { scope: "plantao", prefix: "plantao:" }];
    assert.deepEqual(loadMemory("guia", inherit), { recent: ["nora"], picks: { nora: { "plantao:aminas-vasoativas": 1 } } });
    // Já com memória própria, não herda de novo.
    store.set("renova.busca.guia", JSON.stringify({ recent: ["dengue"], picks: {} }));
    assert.deepEqual(loadMemory("guia", inherit).recent, ["dengue"]);
  } finally {
    delete globalThis.localStorage;
  }
});
