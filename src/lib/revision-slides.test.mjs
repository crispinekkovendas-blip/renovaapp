import { test } from "node:test";
import assert from "node:assert/strict";
import { EMERGENCY_GUIDE, blockHistory } from "./emergency-guide/index.ts";
import { PRESCRIPTION_DRIVE, driveHistory, driveOriginals } from "./prescription-drive/index.ts";
import { guideEntries } from "./clinical-guide.ts";

const ascending = (slides) => slides.filter((s) => s.kind === "change").every((s, i, all) => i === 0 || all[i - 1].rev <= s.rev);

test("plantão: todo trecho revisado abre no texto do PDF e segue as mudanças em ordem", () => {
  let revised = 0;
  for (const topic of EMERGENCY_GUIDE.flatMap((c) => c.topics)) {
    for (const block of topic.blocks) {
      const history = blockHistory(block, topic.page);
      const chain = [...(block.earlier ?? []), ...(block.fix ? [block.fix] : [])];
      if (!history) {
        assert.ok(chain.length === 0 && !block.note && !(block.notesEarlier ?? []).length, `${topic.title}: trecho revisado sem histórico`);
        continue;
      }
      revised++;
      const [original, ...changes] = history.slides;
      assert.equal(original.kind, "original");
      assert.deepEqual(original.lines, [chain[0]?.orig ?? block.t], `${topic.title}: o original é o texto do PDF`);
      assert.match(original.source, new RegExp(`p\\. ${topic.page}$`));
      assert.ok(changes.length >= 1 && changes.every((s) => s.kind === "change" && s.concise.length > 0));
      assert.ok(ascending(history.slides), `${topic.title}: mudanças fora de ordem`);
      // O aviso sai inteiro no slide, sem corte na primeira frase.
      if (block.note) assert.equal(history.slides[history.alert].concise[0].parts[0].t, block.note.trim(), `${topic.title}: "⚠ conferir" aponta para o aviso inteiro`);
      else assert.equal(history.alert, null);
    }
  }
  assert.ok(revised > 300);
});

test("drive: toda entrada abre nos cards do e-book original, sem a marca d'água da licença", () => {
  for (const entry of PRESCRIPTION_DRIVE.flatMap((s) => s.entries)) {
    const cards = driveOriginals(entry.slug);
    assert.ok(cards.length > 0, `${entry.title}: sem card original`);
    const { slides } = driveHistory(entry);
    assert.deepEqual(
      slides.slice(0, cards.length).map((s) => s.kind === "original" && s.title),
      cards.map((c) => c.title)
    );
    assert.ok(slides.length > cards.length, `${entry.title}: sem mudança depois do original`);
    assert.ok(ascending(slides), `${entry.title}: mudanças fora de ordem`);
    for (const card of cards) {
      assert.ok(card.lines.length > 0);
      assert.ok(!card.lines.some((l) => /licensed|kevintuco|@/i.test(l)), `${card.title}: marca d'água no texto`);
    }
  }
});

test("receitas: o carrossel abre na receita publicada e o marca-texto vai no que mudou desde ela", () => {
  const entries = guideEntries();
  const withHistory = entries.filter((e) => e.history);
  assert.ok(withHistory.length > 20);
  for (const entry of entries) {
    assert.equal(entry.marked.length, entry.items.length, entry.name);
    if (!entry.history) {
      assert.ok(entry.marked.every((m) => !m), `${entry.name}: marca-texto sem histórico`);
      continue;
    }
    const [original, ...changes] = entry.history.slides;
    assert.equal(original.kind, "original");
    assert.ok(changes.length >= 1 && ascending(entry.history.slides), entry.name);
  }
  const anemia = entries.find((e) => e.name === "Anemia por falta de ferro");
  assert.equal(anemia.history.slides[0].source, "Receita pronta como foi publicada (30/09)");
  assert.deepEqual(anemia.marked, [true]);
});
