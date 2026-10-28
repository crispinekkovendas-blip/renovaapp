import { test } from "node:test";
import assert from "node:assert/strict";
import { orthoChunks } from "./chunks.ts";
import { ORTHO_GUIDE } from "./index.ts";
import { SOURCE_LABEL, chunkById, formatChunk, guideChunks, retrieveChunks } from "../emergency-guide/chunks.ts";
import { SYSTEM, askGuide } from "../guide-ask.ts";

test("cada tópico de ortopedia vira dois trechos — avaliação e conduta — com fonte, link e CID", () => {
  const chunks = orthoChunks();
  const topics = ORTHO_GUIDE.flatMap((c) => c.topics);
  assert.equal(chunks.length, topics.length * 2);
  for (const c of chunks) {
    assert.match(c.id, /^orto-[a-z0-9-]+#[01]$/);
    assert.equal(c.source, "ortopedia");
    assert.equal(c.href, `/guia/ortopedia/${c.slug}`);
    assert.ok(c.text.length > 100 && c.text.length < 6000, `${c.id}: ${c.text.length}`);
  }
  const entorse = chunks.filter((c) => c.slug === "entorse-de-tornozelo");
  assert.match(entorse[0].text, /Regra de Ottawa/);
  assert.match(entorse[0].text, /CID S93\.4/);
  assert.match(entorse[1].text, /Naproxeno 500 mg — /);
  assert.match(entorse[1].text, /Atestado: Grau I/);
  assert.ok(formatChunk(entorse[0]).includes(`fonte="${SOURCE_LABEL.ortopedia}"`));
  assert.ok(formatChunk(entorse[1]).includes("› Conduta"));
});

test("os trechos de ortopedia entram no corpo da Super Inteligência e a busca por palavra os acha", () => {
  const all = guideChunks();
  assert.ok(all.some((c) => c.source === "ortopedia"));
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.ok(chunkById("orto-lombalgia-aguda#1"));
  const ids = (q) => retrieveChunks(q, 6).map((c) => c.id);
  assert.ok(ids("como faço o teste de Lachman").some((id) => id.startsWith("orto-entorse-de-joelho")));
  assert.ok(ids("joanete").some((id) => id.startsWith("orto-halux-valgo")));
  assert.ok(ids("quantos dias de atestado numa entorse de tornozelo").some((id) => id.startsWith("orto-entorse-de-tornozelo")));
  assert.ok(ids("paciente torceu o pé, preciso de raio-x?").some((id) => id.startsWith("orto-entorse-de-tornozelo")));
  // O plantão continua mandando no cenário de plantão.
  assert.ok(ids("dose de adrenalina na anafilaxia").some((id) => id.startsWith("choque-anafilatico")));
});

test("o prompt conhece a quarta fonte e o contexto da tela entra na busca e na pergunta", async () => {
  assert.match(SYSTEM, /Guia de ortopedia ambulatorial \(Renova\)/);
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
