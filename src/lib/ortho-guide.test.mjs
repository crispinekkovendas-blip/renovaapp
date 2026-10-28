import { test } from "node:test";
import assert from "node:assert/strict";
import { FIRST_DAY, ORTHO_GUIDE, findOrthoTopic, orthoDocs, orthoSearchDoc, orthoSlugs, orthoStats } from "./ortho-guide/index.ts";
import { buildIndex, search } from "./smart-search.ts";

const topics = () => ORTHO_GUIDE.flatMap((c) => c.topics);

test("o guia está inteiro: capítulos com intro, tópicos com as seções que o médico precisa, slugs únicos", () => {
  const { chapters, topics: n } = orthoStats();
  assert.ok(chapters >= 8, `só ${chapters} capítulos`);
  assert.ok(n >= 54, `só ${n} tópicos`);
  const slugs = orthoSlugs();
  assert.equal(new Set(slugs).size, slugs.length);
  for (const c of ORTHO_GUIDE) assert.ok(c.intro.length > 20, c.title);
  for (const t of topics()) {
    assert.match(t.slug, /^[a-z0-9-]+$/, t.slug);
    assert.ok(t.summary.length > 40, `${t.title}: resumo curto`);
    assert.ok(t.aliases.length >= 2, `${t.title}: sem outros nomes`);
    assert.ok(t.ask.length >= 1, `${t.title}: sem anamnese`);
    assert.ok(t.alarm.length >= 1, `${t.title}: sem alarme`);
    assert.ok(t.plan.length >= 1, `${t.title}: sem conduta`);
    assert.ok(t.urgent.length >= 1, `${t.title}: sem "na urgência"`);
    assert.ok(t.clinic.length >= 1, `${t.title}: sem "no retorno"`);
    assert.ok(t.refer.length >= 1, `${t.title}: sem "cirurgia e regulação"`);
    assert.match(t.refer[0], /^Sai da sua mão/, `${t.title}: o trecho de cirurgia e regulação começa por "Sai da sua mão"`);
    for (const p of t.procedures ?? []) assert.ok(p.name && p.when && p.needs && p.steps.length >= 2 && p.after, `${t.title}: procedimento incompleto`);
    // O médico é o ortopedista: o guia não manda ninguém "ao ortopedista".
    for (const line of [...t.urgent, ...t.plan, ...t.alarm, ...t.refer, ...t.clinic, t.summary]) {
      assert.doesNotMatch(line, /\b(ao|para o|encaminhe ao) ortopedista\b(?! de plantão)/i, `${t.title}: ${line.slice(0, 60)}`);
    }
    assert.ok(t.leave.length > 0 && t.followup.length > 0, `${t.title}: sem atestado ou retorno`);
    assert.ok(t.sources.length >= 1, `${t.title}: sem fonte`);
    for (const e of t.exam) assert.ok(e.name && e.how && e.positive, `${t.title}: manobra incompleta`);
    for (const r of t.rx) assert.ok(r.name && r.posology, `${t.title}: receita incompleta`);
  }
});

test("toda condição clínica tem CID; as páginas de base não", () => {
  const base = ORTHO_GUIDE[0];
  for (const t of base.topics) assert.equal(t.cid, "—", t.title);
  for (const c of ORTHO_GUIDE.slice(1)) for (const t of c.topics) assert.match(t.cid, /^[A-Z]\d{2}/, `${t.title}: ${t.cid}`);
});

test("nenhuma receita soma dois anti-inflamatórios sem avisar que é alternativa", () => {
  const aines = ["naproxeno", "ibuprofeno", "diclofenaco", "nimesulida", "cetoprofeno"];
  for (const t of topics()) {
    const orais = t.rx.filter((r) => aines.some((a) => r.name.toLowerCase().startsWith(a)) && !/gel/i.test(r.name));
    if (orais.length > 1) {
      assert.ok(orais.slice(1).every((r) => /alternativa/i.test(r.note ?? "")), `${t.title}: dois AINEs orais sem “alternativa”`);
    }
  }
});

test("tramadol e corticoide sempre levam o cuidado; nada de AINE sem a nota de risco", () => {
  for (const t of topics()) {
    for (const r of t.rx) {
      if (/tramadol/i.test(r.name)) assert.match(r.note ?? "", /tarja preta/i, t.title);
      if (/prednisona/i.test(r.name)) assert.ok(r.note, `${t.title}: prednisona sem cuidado`);
      if (/^naproxeno/i.test(r.name)) assert.match(r.note ?? "", /65 anos/, `${t.title}: naproxeno sem a nota`);
    }
  }
});

test("findOrthoTopic devolve capítulo e vizinhos; slug desconhecido é null", () => {
  const found = findOrthoTopic("lombalgia-aguda");
  assert.ok(found);
  assert.equal(found.chapter.title, "Coluna");
  assert.equal(found.prev, null);
  assert.equal(found.next?.slug, "lombociatalgia-hernia-de-disco");
  assert.equal(findOrthoTopic("nao-existe"), null);
});

test("os atalhos do primeiro dia apontam para tópicos que existem", () => {
  const slugs = new Set(orthoSlugs());
  for (const s of FIRST_DAY) assert.ok(slugs.has(s.slug), s.slug);
  assert.equal(FIRST_DAY.length, ORTHO_GUIDE[0].topics.length);
});

test("a busca acha pelo nome popular, pela manobra e pelo remédio", () => {
  const docs = orthoDocs();
  const index = buildIndex(docs.map(orthoSearchDoc));
  const top = (q) => search(index, q).hits[0]?.id;
  assert.equal(top("joanete"), "halux-valgo-e-metatarsalgia");
  assert.equal(top("torceu o pé"), "entorse-de-tornozelo");
  assert.equal(top("lachman"), "entorse-de-joelho-ligamentos");
  assert.equal(top("mão dormente à noite"), "sindrome-do-tunel-do-carpo");
  assert.equal(top("podagra"), "crise-de-gota");
  assert.ok(search(index, "colchicina").hits.some((h) => h.id === "crise-de-gota"));
  // Os procedimentos entram na busca com o peso das manobras.
  assert.equal(top("cunningham"), "luxacao-e-instabilidade-do-ombro");
  assert.equal(top("manobra de jahss"), "fraturas-de-metacarpo-e-falanges");
  assert.equal(top("cinta pelvica"), "fraturas-de-pelve-e-sacro-no-idoso");
});
