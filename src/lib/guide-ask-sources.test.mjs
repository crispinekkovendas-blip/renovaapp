import { test } from "node:test";
import assert from "node:assert/strict";
import { SOURCE_LABEL, chunkById, formatChunk, guideChunks, retrieveChunks } from "./emergency-guide/chunks.ts";
import { citedIds, sourceHref, sourceOf } from "./guide-citations.ts";
import { RX_PROTOCOLS } from "./rx-library/protocols.ts";
import { PRESCRIPTION_DRIVE } from "./prescription-drive/index.ts";

test("a Super Inteligência lê as três abas: plantão, receitas prontas e Drive", () => {
  const chunks = guideChunks();
  const receitas = chunks.filter((c) => c.source === "receitas");
  const drive = chunks.filter((c) => c.source === "drive");
  assert.equal(receitas.length, RX_PROTOCOLS.length);
  assert.equal(drive.length, PRESCRIPTION_DRIVE.flatMap((s) => s.entries).length);
  assert.equal(new Set(chunks.map((c) => c.id)).size, chunks.length, "ids repetidos");
  for (const c of receitas) {
    assert.match(c.id, /^receita-[a-z0-9-]+#0$/);
    assert.equal(c.href, `/guia?q=${encodeURIComponent(c.topic)}`);
    assert.match(c.text, /^Receita pronta da clínica — ponto de partida para adulto sem comorbidade/);
  }
  for (const c of drive) {
    assert.match(c.id, /^drive-[a-z0-9-]+#0$/);
    assert.equal(c.href, `/guia/drive/${c.slug}`);
    assert.ok(!/O que mudou|Licensed/i.test(c.text), `${c.id}: texto do original no trecho`);
  }
  // A IA vê de que fonte veio cada trecho.
  assert.match(formatChunk(receitas[0]), new RegExp(`fonte="${SOURCE_LABEL.receitas}"`));
  assert.match(formatChunk(drive[0]), new RegExp(`fonte="${SOURCE_LABEL.drive}"`));
});

test("pergunta de consultório acha a receita pronta e o Drive; a de plantão continua no guia de emergência", () => {
  const ids = (q) => retrieveChunks(q, 6).map((c) => c.id);
  assert.ok(ids("receita para cistite em mulher").some((id) => id.startsWith("receita-cistite")));
  assert.ok(ids("amoxicilina na otite média em criança").some((id) => id.startsWith("drive-otite-media-aguda") || id.startsWith("receita-otite-media-aguda")));
  assert.ok(ids("o que orientar no início do antidepressivo").some((id) => id.startsWith("receita-ansiedade-depressao")));
  assert.ok(ids("corrimento com cheiro de peixe").some((id) => id === "drive-vaginose-bacteriana#0" || id.startsWith("receita-vaginose")));
  assert.ok(ids("dose de adrenalina na anafilaxia").some((id) => id.startsWith("choque-anafilatico")));
});

test("citação de receita e do Drive vira link para o lugar certo, mesmo em resposta antiga sem caminho", () => {
  const text = "Fosfomicina dose única [[receita-cistite-fosfomicina-dose-unica#0]]; no Drive [[drive-cistite-nao-complicada#0]] e no plantão [[infeccao-do-trato-urinario#0]].";
  assert.deepEqual(citedIds(text), ["receita-cistite-fosfomicina-dose-unica#0", "drive-cistite-nao-complicada#0", "infeccao-do-trato-urinario#0"]);
  for (const id of citedIds(text)) assert.ok(chunkById(id), `${id} não existe`);
  assert.equal(sourceOf("drive-enxaqueca#0"), "drive");
  assert.equal(sourceOf("receita-crise-de-enxaqueca#0"), "receitas");
  assert.equal(sourceOf("enxaqueca#0"), "plantao");
  assert.equal(sourceHref("drive-enxaqueca#0"), "/guia/drive/enxaqueca");
  assert.equal(sourceHref("enxaqueca#1"), "/guia/plantao/enxaqueca");
  assert.equal(sourceHref("receita-crise-de-enxaqueca#0", "/guia?q=Crise%20de%20enxaqueca"), "/guia?q=Crise%20de%20enxaqueca");
});
