import { test } from "node:test";
import assert from "node:assert/strict";
import { EMERGENCY_GUIDE, findGuideTopic, guideSlugs, guideStats } from "./emergency-guide/index.ts";

const allBlocks = () => EMERGENCY_GUIDE.flatMap((c) => c.topics.flatMap((t) => t.blocks));
const text = (slug) => findGuideTopic(slug).topic.blocks.map((b) => b.t).join("\n");

test("o guia inteiro está lá: capítulos, tópicos com conteúdo, slugs únicos", () => {
  const { chapters, topics } = guideStats();
  assert.equal(chapters, 21);
  assert.ok(topics >= 115, `só ${topics} tópicos`);
  const slugs = guideSlugs();
  assert.equal(new Set(slugs).size, slugs.length);
  for (const c of EMERGENCY_GUIDE) for (const t of c.topics) assert.ok(t.blocks.length > 0, t.title);
});

test("nada da diagramação do PDF sobrou: rodapé de anúncio, tabela crua, dose em gramas trocada", () => {
  for (const b of allBlocks()) {
    assert.doesNotMatch(b.t, /ASSISTIR A AULA|Aprenda a prescrever/, b.t);
    assert.notEqual(b.k, "table", b.t);
    assert.doesNotMatch(b.t, /\b750 g\b/, b.t);
  }
});

test("toda correção guarda o texto original e o motivo", () => {
  const fixes = allBlocks().filter((b) => b.fix);
  assert.ok(fixes.length >= 50, `só ${fixes.length} correções`);
  for (const b of fixes) {
    assert.ok(b.fix.orig && b.fix.why, b.t);
    assert.notEqual(b.fix.orig, b.t, `correção sem mudança: ${b.t}`);
  }
});

test("as correções de maior risco estão aplicadas", () => {
  assert.match(text("bradiarritmias"), /cerca de 1 mg\/mL/);
  assert.match(text("aminas-vasoativas"), /Dopamina \(50 mg\/10 mL/);
  assert.match(text("meningite-e-encefalite"), /a cada 12 horas, por 2 dias/);
  assert.match(text("neutropenia-febril"), /15 a 20 mg\/kg IV/);
  assert.match(text("acidente-ofidico"), /não neutraliza o veneno da coral/);
  assert.match(text("cuidados-paliativos"), /2 comprimidos VO a cada 6 horas/);
  assert.match(text("hipercalcemia"), /dose única/);
  assert.ok(findGuideTopic("delirium-hiperativo-ou-misto"), "delirium com título próprio");
});

test("tabelas refeitas: DPOC em itens, tétano em grade", () => {
  assert.match(text("dpoc"), /Levofloxacino 750 mg/);
  const grid = findGuideTopic("tetano").topic.blocks.find((b) => b.k === "grid");
  assert.equal(grid.rows.length, 3);
  assert.ok(grid.rows.every((r) => r.length === 5));
});

test("anterior e próximo percorrem o guia em ordem", () => {
  const first = findGuideTopic(guideSlugs()[0]);
  assert.equal(first.prev, null);
  assert.equal(first.next.slug, guideSlugs()[1]);
  assert.equal(findGuideTopic("nao-existe"), null);
});

test("histórico de revisões do plantão: toda mudança tem revisão conhecida, antes e depois", async () => {
  const { plantaoChanges, EMERGENCY_GUIDE } = await import("./emergency-guide/index.ts");
  const { GUIDE_REVISIONS, CURRENT_REVISION } = await import("./guide-revisions.ts");
  const revs = new Set(GUIDE_REVISIONS.map((r) => r.n));
  const changes = plantaoChanges();
  for (const c of changes) {
    assert.ok(revs.has(c.rev), `${c.topic}: revisão ${c.rev}`);
    assert.ok(c.why && c.after, c.topic);
    if (c.kind === "fix") assert.notEqual(c.before, c.after, `${c.topic}: correção sem mudança`);
  }
  assert.ok(changes.some((c) => c.rev === 1) && changes.some((c) => c.rev === CURRENT_REVISION));
  // Trecho corrigido duas vezes: a cadeia liga a versão de cada revisão à seguinte.
  const blocks = EMERGENCY_GUIDE.flatMap((ch) => ch.topics.flatMap((t) => t.blocks));
  const refixed = blocks.filter((b) => b.earlier?.length);
  for (const b of refixed) {
    const chain = [...b.earlier, b.fix];
    for (let i = 1; i < chain.length; i++) assert.ok((chain[i].rev ?? 1) > (chain[i - 1].rev ?? 1));
  }
});
