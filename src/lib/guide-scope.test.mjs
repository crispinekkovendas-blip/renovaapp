import { test } from "node:test";
import assert from "node:assert/strict";
import { retrieveChunks, retrieveHybrid } from "./emergency-guide/chunks.ts";
import { ASK_SCOPES, askGuide, parseScope } from "./guide-ask.ts";
import { activeTab } from "./active-tab.ts";

/*
 * O Guia clínico em duas áreas — Plantão (receitas prontas, emergência e
 * Drive) e Ortopedia — e o escopo da pergunta à Super Inteligência.
 */

test("escopo: a busca de trechos fica só nas abas pedidas", () => {
  const plantao = retrieveChunks("dor no joelho depois de torcer", 6, ASK_SCOPES.plantao.sources);
  assert.ok(plantao.length > 0);
  assert.ok(plantao.every((c) => c.source !== "ortopedia"), "no escopo Plantão não entra ortopedia");

  const orto = retrieveChunks("dor no joelho depois de torcer", 6, ASK_SCOPES.ortopedia.sources);
  assert.ok(orto.length > 0);
  assert.ok(orto.every((c) => c.source === "ortopedia"), "no escopo Ortopedia só entra ortopedia");

  // Pergunta de plantão puro com escopo de ortopedia: ainda devolve algo (só da ortopedia), nunca vazio por engano.
  const fora = retrieveChunks("adrenalina na anafilaxia", 6, ASK_SCOPES.ortopedia.sources);
  assert.ok(fora.every((c) => c.source === "ortopedia"));
});

test("escopo: sem Gemini a recuperação híbrida respeita o escopo e sem escopo traz tudo", async () => {
  const tudo = await retrieveHybrid("entorse de tornozelo", 8);
  assert.ok(tudo.some((c) => c.source === "ortopedia"), "sem escopo a ortopedia entra");
  const so = await retrieveHybrid("entorse de tornozelo", 8, ASK_SCOPES.ortopedia.sources);
  assert.ok(so.length > 0 && so.every((c) => c.source === "ortopedia"));
});

test("escopo: só os dois valores valem; o resto é 'tudo'", () => {
  assert.equal(parseScope("plantao"), "plantao");
  assert.equal(parseScope("ortopedia"), "ortopedia");
  assert.equal(parseScope("tudo"), undefined);
  assert.equal(parseScope(undefined), undefined);
  assert.equal(parseScope(3), undefined);
});

/** Um Gemini de mentira que responde uma vez, e uma recuperação que anota com que escopo foi chamada. */
function deps(store) {
  const retrieves = [];
  return {
    retrieves,
    generate: async function* () {
      yield { parts: [{ text: "Repouso e gelo [[orto-entorse-de-tornozelo#1]]." }], finishReason: "STOP" };
    },
    retrieve: async (q, limit, sources) => {
      retrieves.push({ q, sources });
      return retrieveChunks(q, limit, sources);
    },
    store,
  };
}

function memoryStore() {
  const saved = new Map();
  return {
    saved,
    get: async (key, version) => saved.get(`${version}|${key}`) ?? null,
    save: async (key, version, _q, data) => void saved.set(`${version}|${key}`, { ...data, createdAt: "2026-10-28 10:00" }),
  };
}

test("escopo: a pergunta leva o escopo à busca, ao prompt e à memória (chave própria por escopo)", async () => {
  const store = memoryStore();
  const d = deps(store);
  const events = [];
  for await (const e of askGuide("torceu o tornozelo: preciso de raio-x?", [], d, { scope: "ortopedia" })) events.push(e);
  assert.ok(d.retrieves.length > 0);
  assert.ok(d.retrieves.every((r) => r.sources === ASK_SCOPES.ortopedia.sources), "toda busca foi com o escopo");
  assert.ok(events.some((e) => e.t === "done"));
  const keys = [...store.saved.keys()];
  assert.equal(keys.length, 1);
  assert.match(keys[0], /\|ortopedia:/, "a chave da memória leva o escopo");

  // A mesma pergunta sem escopo é outra entrada: não volta a resposta só-ortopedia.
  const d2 = deps(store);
  const again = [];
  for await (const e of askGuide("torceu o tornozelo: preciso de raio-x?", [], d2)) again.push(e);
  assert.ok(!again.some((e) => e.t === "cached"), "sem escopo não reaproveita a resposta com escopo");
  assert.ok(d2.retrieves.every((r) => r.sources === undefined));
  assert.equal([...store.saved.keys()].length, 2);

  // Com o mesmo escopo, volta da memória.
  const d3 = deps(store);
  const third = [];
  for await (const e of askGuide("torceu o tornozelo: preciso de raio-x?", [], d3, { scope: "ortopedia" })) third.push(e);
  assert.ok(third.some((e) => e.t === "cached"));
});

test("Guia clínico em duas áreas: a aba certa acende (a Emergência e o Drive são do Plantão)", () => {
  const tabs = [
    { href: "/guia", label: "Plantão" },
    { href: "/guia/ortopedia", label: "Ortopedia" },
    { href: "/guia/app", label: "App Android" },
  ];
  assert.equal(activeTab("/guia", tabs).label, "Plantão");
  assert.equal(activeTab("/guia/plantao", tabs).label, "Plantão", "a Emergência é seção do Plantão");
  assert.equal(activeTab("/guia/drive/enxaqueca", tabs).label, "Plantão");
  assert.equal(activeTab("/guia/revisoes", tabs).label, "Plantão");
  assert.equal(activeTab("/guia/ortopedia", tabs).label, "Ortopedia");
  assert.equal(activeTab("/guia/ortopedia/consulta", tabs).label, "Ortopedia");
  assert.equal(activeTab("/guia/app", tabs).label, "App Android");
  assert.equal(activeTab("/agenda", tabs), undefined);
  // As outras seções continuam como eram.
  const agenda = [{ href: "/agenda", label: "Dia" }, { href: "/agenda/semana", label: "Semana" }];
  assert.equal(activeTab("/agenda", agenda).label, "Dia");
  assert.equal(activeTab("/agenda/semana", agenda).label, "Semana");
});
