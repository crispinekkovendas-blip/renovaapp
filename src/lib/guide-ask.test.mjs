import { test } from "node:test";
import assert from "node:assert/strict";
import { guideChunks, retrieveChunks, formatChunk, chunkById } from "./emergency-guide/chunks.ts";
import { askGuide, citedIds } from "./guide-ask.ts";
import { chunkEmbedText, dequantize, dot, fuseRanks, quantize, textHash } from "./emergency-guide/vectors.ts";
import vectors from "./emergency-guide/vectors.json" with { type: "json" };
import { normalize, parseSseEvent, embedInput } from "./gemini.ts";

const ids = (q, n = 3) => retrieveChunks(q, n).map((c) => c.id);

test("o guia inteiro vira trechos pequenos, com tópico e capítulo", () => {
  const chunks = guideChunks();
  assert.ok(chunks.length > 200, `só ${chunks.length} trechos`);
  assert.equal(new Set(chunks.map((c) => c.id)).size, chunks.length);
  for (const c of chunks) {
    assert.ok(c.text.length > 0 && c.text.length < 4000, c.id);
    assert.ok(c.topic && c.chapter, c.id);
  }
});

test("o trecho leva a correção da revisão e o aviso de conferência para a IA", () => {
  const brady = guideChunks().find((c) => c.slug === "bradiarritmias" && c.text.includes("Dopamina"));
  assert.match(brady.text, /cerca de 1 mg\/mL/);
  assert.match(brady.text, /\[corrigido pela revisão; o guia original dizia: .*10 mg\/mL/);
  const pancreatite = guideChunks().find((c) => c.slug === "pancreatite-aguda" && c.text.includes("3 mL/kg/h"));
  assert.match(pancreatite.text, /\[conferir: .*WATERFALL/);
  assert.match(formatChunk(brady), /^<trecho id="bradiarritmias#\d+" fonte="Guia de Prescrições da Emergência \(plantão\)">/);
});

test("perguntas em texto livre acham o trecho certo (busca por palavra)", () => {
  assert.ok(ids("qual a dose de adrenalina na anafilaxia em criança?").some((id) => id.startsWith("choque-anafilatico")));
  assert.ok(ids("como diluir noradrenalina").some((id) => id.startsWith("aminas-vasoativas")));
  assert.ok(ids("profilaxia de contactantes de meningococo").some((id) => id.startsWith("meningite-e-encefalite")));
  assert.ok(ids("paciente com potássio alto e alteração no ecg").some((id) => id.startsWith("hipercalemia")));
  assert.ok(ids("picada de jararaca grave quantas ampolas").some((id) => id.startsWith("acidente-ofidico")));
  assert.ok(ids("dose de ataque de fenitoina").some((id) => id.startsWith("crise-convulsiva")));
});

test("vetor em int8 volta quase igual (cosseno ~1) e o hash muda com o texto", () => {
  const v = normalize(Array.from({ length: 768 }, (_, i) => Math.sin(i * 1.3) + 0.2));
  const back = dequantize(quantize(v));
  assert.equal(back.length, 768);
  assert.ok(dot(v, back) > 0.999);
  assert.notEqual(textHash("dopamina 1 mg/mL"), textHash("dopamina 10 mg/mL"));
  assert.equal(textHash("igual"), textHash("igual"));
});

test("fusão por posição: quem vai bem nas duas buscas sobe", () => {
  assert.equal(fuseRanks([["a", "b", "c"], ["b", "d", "a"]])[0], "b");
  assert.equal(fuseRanks([["a", "b"], ["c", "d"]])[0], "a");
  assert.equal(fuseRanks([["x"], []])[0], "x");
});

test("formato do embedding: pergunta como busca, trecho com título", () => {
  assert.equal(embedInput("dose de nora", "query"), "task: search result | query: dose de nora");
  assert.equal(embedInput("texto", "doc", "Sepse"), "title: Sepse | text: texto");
});

test("lê o streaming do Gemini: texto, chamada de ferramenta e bloqueio", () => {
  const text = parseSseEvent('data: {"candidates":[{"content":{"parts":[{"text":"Olá"}]}}]}');
  assert.equal(text.parts[0].text, "Olá");
  const call = parseSseEvent('data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"buscar_no_guia","args":{"consulta":"x"}},"thoughtSignature":"abc"}]},"finishReason":"STOP"}]}');
  assert.equal(call.parts[0].functionCall.args.consulta, "x");
  assert.equal(call.parts[0].thoughtSignature, "abc");
  assert.equal(parseSseEvent('data: {"promptFeedback":{"blockReason":"SAFETY"}}').blocked, true);
  assert.equal(parseSseEvent(""), null);
});

/** Um Gemini de mentira: responde conforme o roteiro, uma rodada por chamada. */
function fakeGemini(rounds) {
  const calls = [];
  return {
    calls,
    generate: async function* (req) {
      calls.push(structuredClone(req));
      for (const chunk of rounds[calls.length - 1] ?? []) yield chunk;
    },
    retrieve: async (q, limit) => retrieveChunks(q, limit),
  };
}

test("pergunta completa: busca de novo com a ferramenta, devolve a assinatura e cita a fonte", async () => {
  const fake = fakeGemini([
    [{ parts: [{ functionCall: { name: "buscar_no_guia", args: { consulta: "adrenalina pediatrica anafilaxia" } }, thoughtSignature: "sig-1" }] }],
    [
      { parts: [{ text: "Adrenalina IM **0,01 mg/kg**, máximo 0,3 mg " }] },
      { parts: [{ text: "[[choque-anafilatico#0]]." }], finishReason: "STOP" },
    ],
  ]);
  const events = [];
  for await (const e of askGuide("dose de adrenalina na anafilaxia em criança?", [], fake)) events.push(e);

  assert.deepEqual(events.filter((e) => e.t === "search").map((e) => e.q), ["adrenalina pediatrica anafilaxia"]);
  assert.equal(events.filter((e) => e.t === "text").map((e) => e.d).join(""), "Adrenalina IM **0,01 mg/kg**, máximo 0,3 mg [[choque-anafilatico#0]].");
  const sources = events.find((e) => e.t === "sources").items;
  assert.equal(sources[0].slug, "choque-anafilatico");
  assert.equal(events.at(-1).t, "done");

  // 1ª chamada: a pergunta com os trechos anexados e a ferramenta disponível.
  assert.match(fake.calls[0].contents[0].parts[0].text, /Pergunta: dose de adrenalina/);
  assert.match(fake.calls[0].contents[0].parts[0].text, /<trecho id="choque-anafilatico#0" fonte=/);
  assert.equal(fake.calls[0].tools.length, 1);
  // 2ª chamada: a resposta do modelo volta com a assinatura, seguida do resultado da busca.
  const [, modelTurn, toolTurn] = fake.calls[1].contents;
  assert.equal(modelTurn.role, "model");
  assert.equal(modelTurn.parts[0].thoughtSignature, "sig-1");
  assert.equal(toolTurn.parts[0].functionResponse.name, "buscar_no_guia");
  assert.match(toolTurn.parts[0].functionResponse.response.trechos, /<trecho id=/);
});

test("bloqueio ou resposta vazia viram aviso, não tela em branco", async () => {
  const blocked = fakeGemini([[{ parts: [], blocked: true }]]);
  const a = [];
  for await (const e of askGuide("teste de bloqueio", [], blocked)) a.push(e);
  assert.equal(a.at(-1).t, "error");

  const empty = fakeGemini([[{ parts: [], finishReason: "STOP" }]]);
  const b = [];
  for await (const e of askGuide("pergunta sem resposta", [], empty)) b.push(e);
  assert.equal(b.at(-1).t, "error");
});

test("seguimento leva a conversa e o papel do modelo como 'model'", async () => {
  const fake = fakeGemini([[{ parts: [{ text: "Sim [[choque-anafilatico#0]]" }], finishReason: "STOP" }]]);
  const history = [
    { role: "user", content: "adrenalina na anafilaxia?" },
    { role: "assistant", content: "0,5 mg IM [[choque-anafilatico#0]]" },
  ];
  for await (const _ of askGuide("e em criança?", history, fake)) void _;
  assert.deepEqual(fake.calls[0].contents.map((c) => c.role), ["user", "model", "user"]);
});

test("as citações [[id]] saem na ordem, sem repetir, e apontam para trechos que existem", () => {
  const text = "Adrenalina **0,5 mg IM** [[choque-anafilatico#0]]. Repetir [[choque-anafilatico#0]]; broncoespasmo [[anafilaxia-adjuvantes#0]].";
  assert.deepEqual(citedIds(text), ["choque-anafilatico#0", "anafilaxia-adjuvantes#0"]);
  for (const id of citedIds(text)) assert.ok(chunkById(id), id);
  assert.deepEqual(citedIds("sem fonte"), []);
  // Grupos como o Gemini às vezes escreve.
  assert.deepEqual(citedIds("Diluição [[bradiarritmias#0], [aminas-vasoativas#1]]."), ["bradiarritmias#0", "aminas-vasoativas#1"]);
  assert.deepEqual(citedIds("x [[a-b#1, c-d#2]] y [[c-d#2]]"), ["a-b#1", "c-d#2"]);
});

test("vetores gravados batem com os trechos atuais (depois de npm run guia:embed)", () => {
  if (vectors.items.length === 0) return; // ainda não gerados: a busca por sentido calcula na hora
  const chunks = new Map(guideChunks().map((c) => [c.id, c]));
  for (const it of vectors.items) {
    assert.ok(chunks.has(it.id), `vetor de trecho que não existe mais: ${it.id}`);
    assert.equal(dequantize(it.v).length, vectors.dim, it.id);
    assert.equal(it.hash, textHash(chunkEmbedText(chunks.get(it.id))), `trecho mudou, rode npm run guia:embed: ${it.id}`);
  }
  assert.equal(vectors.items.length, chunks.size, "faltam vetores: rode npm run guia:embed");
});

test("modelo sem cota ou sobrecarregado: passa na hora para o próximo da lista", async () => {
  const { streamGenerate, GEMINI_MODELS } = await import("./gemini.ts");
  const original = globalThis.fetch;
  const hadKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "teste";
  const asked = [];
  globalThis.fetch = async (url) => {
    const model = /models\/([^:]+):/.exec(String(url))[1];
    asked.push(model);
    if (model === GEMINI_MODELS[0]) return new Response('{"error":{"code":429}}', { status: 429 });
    const sse = 'data: {"candidates":[{"content":{"parts":[{"text":"ok"}]},"finishReason":"STOP"}]}\n\n';
    return new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
  try {
    const parts = [];
    for await (const chunk of streamGenerate({ system: "s", contents: [{ role: "user", parts: [{ text: "q" }] }] })) parts.push(...chunk.parts);
    assert.equal(parts[0].text, "ok");
    assert.deepEqual(asked, [GEMINI_MODELS[0], GEMINI_MODELS[1]]);
    // No minuto seguinte, o que estava sem cota nem é tentado.
    asked.length = 0;
    for await (const _ of streamGenerate({ system: "s", contents: [{ role: "user", parts: [{ text: "q" }] }] })) void _;
    assert.deepEqual(asked, [GEMINI_MODELS[1]]);
  } finally {
    globalThis.fetch = original;
    if (hadKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = hadKey;
  }
});

test("resposta cortada pelo limite avisa o médico", async () => {
  const fake = fakeGemini([[{ parts: [{ text: "Diluição: dil" }], finishReason: "MAX_TOKENS" }]]);
  let text = "";
  for await (const e of askGuide("diluição da dopamina", [], fake)) if (e.t === "text") text += e.d;
  assert.match(text, /Resposta cortada/);
});

const { questionKey, questionNumbers, memoryStore } = await import("./guide-answer-cache.ts");

test("memória: a mesma pergunta em outras palavras tem a mesma chave", () => {
  const same = [
    ["dose de adrenalina na anafilaxia em criança de 20 kg?", "qual a dose de adrenalina pra anafilaxia numa criança de 20kg"],
    ["como diluo dopamina para bradicardia?", "diluição da dopamina na bradicardia"],
    ["noradrenalina choque séptico dose inicial", "qual a dose inicial de noradrenalina no choque séptico?"],
    ["Dose de ataque de FENITOÍNA", "dose de ataque de fenitoina"],
  ];
  for (const [a, b] of same) assert.equal(questionKey(a), questionKey(b), `${a} ⟷ ${b}`);
});

test("memória: pergunta parecida mas clinicamente diferente NUNCA reaproveita", () => {
  // Os pares da calibração: o embedding achava quase iguais (até 0,949).
  const different = [
    ["dose de adrenalina na anafilaxia em criança", "dose de adrenalina na anafilaxia em adulto"],
    ["dose de adrenalina IM na anafilaxia", "dose de adrenalina em bolus EV na anafilaxia"],
    ["hipercalemia tratamento", "hipocalemia tratamento"],
    ["dose de ataque de fenitoína", "dose de manutenção de fenitoína"],
    ["antibiótico para pielonefrite", "antibiótico para pielonefrite em gestante"],
    ["dose de ceftriaxona na meningite", "dose de ceftriaxona na pielonefrite"],
    ["adrenalina anafilaxia criança 20 kg", "adrenalina anafilaxia criança 30 kg"],
    ["adrenalina 0,5 mg", "adrenalina 0,3 mg"],
  ];
  for (const [a, b] of different) {
    const [ka, kb] = [questionKey(a), questionKey(b)];
    // Seguro: chaves diferentes, ou pergunta curta demais para entrar na memória (null).
    assert.ok(ka === null || kb === null || ka !== kb, `${a} ⟷ ${b}`);
  }
});

test("memória: números contam e pergunta curta demais não entra", () => {
  assert.deepEqual(questionNumbers("PA 230x130, 0,5 mg e 20 kg"), ["0.5", "130", "20", "230"]);
  assert.equal(questionKey("dose?"), null);
});

test("memória: a segunda vez não chama a IA; seguimento e 'perguntar de novo' chamam", async () => {
  const store = memoryStore();
  const answer = [{ parts: [{ text: "Adrenalina **0,2 mg** IM [[choque-anafilatico#0]]." }], finishReason: "STOP" }];
  const fake = { ...fakeGemini([answer, answer, answer]), store };
  const run = async (q, history = [], options = {}) => {
    const events = [];
    for await (const e of askGuide(q, history, fake, options)) events.push(e);
    return events;
  };

  const first = await run("dose de adrenalina na anafilaxia em criança de 20 kg?");
  assert.equal(fake.calls.length, 1);
  assert.ok(!first.some((e) => e.t === "cached"));

  const again = await run("qual a dose de adrenalina pra anafilaxia numa criança de 20kg");
  assert.equal(fake.calls.length, 1, "repetida: não chamou a IA");
  assert.ok(again.some((e) => e.t === "cached"));
  assert.match(again.filter((e) => e.t === "text").map((e) => e.d).join(""), /0,2 mg/);
  assert.equal(again.find((e) => e.t === "sources").items[0].slug, "choque-anafilatico");

  await run("dose de adrenalina na anafilaxia em criança de 30 kg?");
  assert.equal(fake.calls.length, 2, "30 kg é outra pergunta");

  await run("dose de adrenalina na anafilaxia em criança de 20 kg?", [], { fresh: true });
  assert.equal(fake.calls.length, 3, "perguntar de novo ignora a memória");
});

test("memória: não guarda resposta cortada nem sem fonte", async () => {
  const store = memoryStore();
  const cut = { ...fakeGemini([[{ parts: [{ text: "Diluição: dil" }], finishReason: "MAX_TOKENS" }]]), store };
  for await (const _ of askGuide("diluição da dopamina na bradicardia", [], cut)) void _;
  const noSource = { ...fakeGemini([[{ parts: [{ text: "Não sei." }], finishReason: "STOP" }]]), store };
  for await (const _ of askGuide("pergunta sem fonte nenhuma aqui", [], noSource)) void _;
  const { questionKey: k, guideVersion } = await import("./guide-answer-cache.ts");
  assert.equal(await store.get(k("diluição da dopamina na bradicardia"), guideVersion()), null);
  assert.equal(await store.get(k("pergunta sem fonte nenhuma aqui"), guideVersion()), null);
});
