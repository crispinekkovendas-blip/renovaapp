import { test } from "node:test";
import assert from "node:assert/strict";
import { orthoChunks } from "./chunks.ts";
import { ORTHO_GUIDE } from "./index.ts";
import { SOURCE_LABEL, chunkById, formatChunk, guideChunks, retrieveChunks } from "../emergency-guide/chunks.ts";
import { SYSTEM, askGuide } from "../guide-ask.ts";

test("cada tópico de ortopedia vira três trechos — avaliação, urgência, conduta e retorno — e um por procedimento, com fonte, link e CID", () => {
  const chunks = orthoChunks();
  const topics = ORTHO_GUIDE.flatMap((c) => c.topics);
  const procedures = topics.reduce((n, t) => n + (t.procedures?.length ?? 0), 0);
  assert.ok(procedures >= 30, `só ${procedures} procedimentos`);
  assert.equal(chunks.length, topics.length * 3 + procedures);
  for (const c of chunks) {
    assert.match(c.id, /^orto-[a-z0-9-]+#\d+$/);
    assert.equal(c.source, "ortopedia");
    assert.equal(c.href, `/guia/ortopedia/${c.slug}`);
    assert.ok(c.text.length > 100 && c.text.length < 4000, `${c.id}: ${c.text.length}`);
  }
  const entorse = chunks.filter((c) => c.slug === "entorse-de-tornozelo");
  assert.match(entorse[0].text, /Regra de Ottawa/);
  assert.match(entorse[0].text, /CID S93\.4/);
  assert.match(entorse[1].text, /Na urgência \(você é o ortopedista de plantão\):/);
  assert.match(entorse[1].text, /Cirurgia e regulação \(o que sai da sua mão\):/);
  assert.match(entorse[2].text, /Naproxeno 500 mg — /);
  assert.match(entorse[2].text, /No retorno \(ambulatório\):/);
  assert.match(entorse[2].text, /Atestado: Grau I/);
  for (const c of chunks) assert.doesNotMatch(c.text, /Encaminhar ao ortopedista/);
  const ombro = chunks.find((c) => c.id === "orto-luxacao-e-instabilidade-do-ombro#3");
  assert.ok(ombro && ombro.section.startsWith("Procedimento: Redução da luxação anterior do ombro"));
  assert.match(ombro.text, /Cunningham/);
  assert.match(ombro.text, /1\. Rotação externa/);
  assert.ok(formatChunk(entorse[0]).includes(`fonte="${SOURCE_LABEL.ortopedia}"`));
  assert.ok(formatChunk(entorse[2]).includes("› Conduta e retorno"));
});

test("os trechos de ortopedia entram no corpo da Super Inteligência e a busca por palavra os acha", () => {
  const all = guideChunks();
  assert.ok(all.some((c) => c.source === "ortopedia"));
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.ok(chunkById("orto-lombalgia-aguda#2"));
  const ids = (q) => retrieveChunks(q, 6).map((c) => c.id);
  assert.ok(ids("como faço o teste de Lachman").some((id) => id.startsWith("orto-entorse-de-joelho")));
  assert.ok(ids("joanete").some((id) => id.startsWith("orto-halux-valgo")));
  assert.ok(ids("quantos dias de atestado numa entorse de tornozelo").some((id) => id.startsWith("orto-entorse-de-tornozelo")));
  assert.ok(ids("paciente torceu o pé, preciso de raio-x?").some((id) => id.startsWith("orto-entorse-de-tornozelo")));
  // O plantão continua mandando no cenário de plantão.
  assert.ok(ids("dose de adrenalina na anafilaxia").some((id) => id.startsWith("choque-anafilatico")));
});

test("o prompt conhece a quarta fonte e o contexto da tela entra na busca e na pergunta", async () => {
  assert.match(SYSTEM, /Guia de ortopedia — plantão e ambulatório \(Renova\)/);
  assert.match(SYSTEM, /nunca responda "encaminhe ao ortopedista"/);
  assert.match(SYSTEM, /orto-entorse-de-tornozelo#1/);
  assert.match(SYSTEM, /Contexto/);
  const queries = [];
  let prompt = "";
  const deps = {
    retrieve: async (q) => {
      queries.push(q);
      return [chunkById("orto-entorse-de-tornozelo#0")];
    },
    async *generate(req) {
      prompt = req.contents.at(-1).parts[0].text;
      yield { parts: [{ text: "Ottawa decide [[orto-entorse-de-tornozelo#0]]" }] };
    },
  };
  const events = [];
  for await (const e of askGuide("preciso de raio-x?", [], deps, { context: "Ortopedia › Entorse de tornozelo" })) events.push(e);
  assert.equal(queries[0], "Ortopedia › Entorse de tornozelo preciso de raio-x?");
  assert.match(prompt, /Contexto: o médico está na tela "Ortopedia › Entorse de tornozelo" do app\./);
  const sources = events.find((e) => e.t === "sources");
  assert.equal(sources.items[0].id, "orto-entorse-de-tornozelo#0");
  assert.equal(sources.items[0].source, "ortopedia");
  assert.equal(sources.items[0].href, "/guia/ortopedia/entorse-de-tornozelo");
  // Sem contexto, a pergunta segue como era.
  queries.length = 0;
  for await (const e of askGuide("preciso de raio-x?", [], deps)) events.push(e);
  assert.equal(queries[0], "preciso de raio-x?");
});
