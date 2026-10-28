import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_ANSWERS, ORTHO_REGIONS, TRAUMA_TOPICS, UNIVERSAL_ALARM, alarmTexts, buildSoapNote, orderTopics, regionOf, stepOf } from "./consult.ts";
import { ORTHO_GUIDE, findOrthoTopic, orthoSlugs } from "./index.ts";
import { CURRENT_ORTHO_REVISION } from "./revisions.ts";

test("toda região aponta para tópicos que existem, e toda condição clínica está em alguma região", () => {
  const slugs = new Set(orthoSlugs());
  const covered = new Set();
  for (const r of ORTHO_REGIONS) {
    assert.ok(r.topics.length >= 1 && r.alarm.length >= 2, r.key);
    for (const s of r.topics) {
      assert.ok(slugs.has(s), `${r.key}: ${s}`);
      assert.ok(!covered.has(s), `${s} em duas regiões`);
      covered.add(s);
    }
  }
  // As páginas de base (primeiro capítulo) não são condições; o resto precisa estar numa região.
  const base = new Set(ORTHO_GUIDE[0].topics.map((t) => t.slug));
  assert.ok(base.size >= 8);
  for (const s of slugs) if (!base.has(s)) assert.ok(covered.has(s), `${s} fora das regiões`);
  for (const s of TRAUMA_TOPICS) assert.ok(slugs.has(s), s);
});

test("com trauma, os tópicos de trauma vêm primeiro; sem, por último", () => {
  const joelho = ORTHO_REGIONS.find((r) => r.key === "joelho");
  assert.equal(orderTopics(joelho, true)[0], "entorse-de-joelho-ligamentos");
  assert.equal(orderTopics(joelho, false)[0], "osteoartrite-de-joelho");
  assert.deepEqual(orderTopics(joelho, null), joelho.topics);
  assert.equal(regionOf("crise-de-gota").key, "articulacao-quente");
  assert.equal(regionOf("nao-existe"), null);
});

test("o passo segue o que foi respondido", () => {
  assert.equal(stepOf(EMPTY_ANSWERS), "regiao");
  assert.equal(stepOf({ ...EMPTY_ANSWERS, region: "joelho" }), "alarme");
  assert.equal(stepOf({ ...EMPTY_ANSWERS, region: "joelho", trauma: false }), "condicao");
  assert.equal(stepOf({ ...EMPTY_ANSWERS, region: "joelho", trauma: false, topic: "lesao-meniscal" }), "roteiro");
});

test("a nota SOAP traz o que foi marcado, o alarme e a receita escolhida", () => {
  const region = ORTHO_REGIONS.find((r) => r.key === "tornozelo-pe");
  const { topic } = findOrthoTopic("entorse-de-tornozelo");
  const answers = {
    ...EMPTY_ANSWERS,
    region: "tornozelo-pe",
    trauma: true,
    alarm: ["u:1"],
    topic: "entorse-de-tornozelo",
    ask: [0],
    askNote: "Torceu jogando futebol ontem.",
    exam: { 0: "neg", 1: "pos", 2: "nd" },
    topicAlarm: [],
    rx: [0, 2],
    leave: "7 dias",
  };
  const note = buildSoapNote(region, topic, answers);
  assert.match(note, /^ORTOPEDIA — Entorse de tornozelo \(CID S93\.4\)/);
  assert.match(note, /com trauma/);
  assert.match(note, /S — Anamnese\n- Como torceu .*: SIM/);
  assert.match(note, /Observações: Torceu jogando futebol ontem\./);
  assert.match(note, /- Regra de Ottawa: negativo/);
  assert.match(note, /- Palpação ligamentar: POSITIVO \(/);
  assert.doesNotMatch(note, /Gaveta anterior e inclinação talar/);
  assert.match(note, new RegExp(`SINAIS DE ALARME: ${UNIVERSAL_ALARM[1].slice(0, 20)}`));
  assert.match(note, /ALARME PRESENTE: conduta de urgência hoje/);
  assert.match(note, /- Na urgência: /);
  assert.match(note, /- Cirurgia\/regulação: Sai da sua mão/);
  assert.ok(note.endsWith(`Roteiro: Guia de ortopedia Renova, revisão ${CURRENT_ORTHO_REVISION}.`));
  assert.match(note, /· Dipirona 1 g — /);
  assert.match(note, /· Naproxeno 500 mg — /);
  assert.doesNotMatch(note, /· Paracetamol/);
  assert.match(note, /Atestado: 7 dias · Retorno: /);
  assert.deepEqual(alarmTexts(region, answers, topic), [UNIVERSAL_ALARM[1]]);
});

test("sem nada marcado, a nota ainda sai inteira e usa o atestado do guia", () => {
  const region = ORTHO_REGIONS.find((r) => r.key === "lombar");
  const { topic } = findOrthoTopic("lombalgia-aguda");
  const note = buildSoapNote(region, topic, { ...EMPTY_ANSWERS, region: "lombar", trauma: false, topic: "lombalgia-aguda" });
  assert.match(note, /nenhuma pergunta marcada/);
  assert.match(note, /nenhuma manobra registrada/);
  assert.match(note, /Sem sinais de alarme/);
  assert.doesNotMatch(note, /ALARME PRESENTE/);
  assert.match(note, new RegExp(`Atestado: ${topic.leave.slice(0, 10)}`));
});
