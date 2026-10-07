import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, completeWord, correct, editDistance, highlight, search, soundKey } from "./smart-search.ts";
import { memoryBoost, rememberPick, emptyMemory } from "./search-history.ts";
import { plantaoSearchDocs } from "./emergency-guide/search-docs.ts";

const index = buildIndex(plantaoSearchDocs());
const top = (q, n = 3) => search(index, q).hits.slice(0, n).map((h) => h.id);

test("distância de edição com troca de letras vizinhas", () => {
  assert.equal(editDistance("sepse", "sepse", 2), 0);
  assert.equal(editDistance("spese", "sepse", 2), 1);
  assert.equal(editDistance("dipirona", "dipyrona", 2), 1);
  assert.ok(editDistance("abc", "xyzuvw", 2) > 2);
});

test("chave sonora junta grafias que soam igual", () => {
  assert.equal(soundKey("anafilaxia"), soundKey("anafilasia"));
  assert.equal(soundKey("dipirona"), soundKey("dypirona"));
  assert.equal(soundKey("clonazepam"), soundKey("clonasepam"));
});

test("acha pelo título e pelo remédio", () => {
  assert.equal(top("sepse")[0], "sepse-e-choque-septico");
  assert.ok(top("noradrenalina", 5).includes("aminas-vasoativas"));
  assert.equal(top("hipercalemia")[0], "hipercalemia");
});

test("tolera erro de digitação", () => {
  assert.equal(top("sepce")[0], "sepse-e-choque-septico");
  assert.ok(top("anafilacia", 2).includes("choque-anafilatico"));
  assert.equal(top("hipercalemya")[0], "hipercalemia");
  assert.ok(top("enxaqeca").includes("enxaqueca"));
  assert.ok(top("pneumonai").includes("pneumonia"));
});

test("completa a palavra que ainda está sendo digitada", () => {
  assert.ok(top("taquic").some((id) => id.startsWith("taquicardia")));
  assert.equal(top("intub")[0], "intubacao");
  assert.ok(completeWord(index, "noradr")?.startsWith("noradrenalina"));
  assert.equal(completeWord(index, "anafilaxia em criança?"), null);
  assert.equal(completeWord(index, "sepse "), null);
});

test("entende sinônimo, abreviação e nome comercial", () => {
  assert.equal(top("iam")[0], "sindrome-coronariana-aguda");
  assert.equal(top("pressão alta")[0], "urgencia-e-emergencia-hipertensiva");
  assert.equal(top("picada de cobra")[0], "acidente-ofidico");
  assert.ok(top("nora", 5).includes("aminas-vasoativas"));
  assert.ok(top("iot").includes("intubacao"));
  assert.ok(top("dor de cabeça", 4).includes("enxaqueca"));
  assert.equal(top("k alto")[0], "hipercalemia");
});

test("várias palavras: a combinação vem primeiro", () => {
  assert.equal(top("gluconato hipercalemia")[0], "hipercalemia");
  assert.ok(top("diluicao noradrenalina").includes("aminas-vasoativas"));
  assert.equal(top("noradrenalina sepse")[0], "sepse-e-choque-septico");
});

test("sem nada parecido, oferece a busca corrigida", () => {
  const r = search(index, "hiponatremya sodio");
  assert.ok(r.hits.length > 0 || r.suggestion);
  assert.equal(correct(index, "sepce"), "sepse");
});

test("a mesma família de palavras se acha", async () => {
  const { stem } = await import("./smart-search.ts");
  assert.equal(stem("diluicao"), stem("diluir"));
  assert.equal(stem("diluido"), stem("diluir"));
  assert.equal(stem("hipertensao"), stem("hipertensiva"));
  assert.notEqual(stem("hipercalemia"), stem("hipocalemia"));
});

test("destaca a palavra sem mexer no acento do texto", () => {
  const parts = highlight("Choque séptico refratário", ["septico"]);
  assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ["séptico"]);
});

test("aprende com o que o médico abriu, inclusive nas tentativas anteriores", () => {
  let memory = emptyMemory();
  memory = rememberPick(memory, ["cho", "choque sep"], "sepse-e-choque-septico");
  assert.ok(memoryBoost(memory, "choque sep", "sepse-e-choque-septico") > 0);
  assert.ok(memoryBoost(memory, "ch", "sepse-e-choque-septico") > 0);
  assert.equal(memoryBoost(memory, "choque", "choque-anafilatico"), 0);
  assert.equal(memory.recent[0], "choque sep");
  const boosted = search(index, "choque", { boost: (id) => memoryBoost(memory, "choque", id) }).hits[0].id;
  assert.equal(boosted, "sepse-e-choque-septico");
});
