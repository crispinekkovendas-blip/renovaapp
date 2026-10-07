import { test } from "node:test";
import assert from "node:assert/strict";
import { EXAM_PANELS, renderPanel, mergePanels } from "./exam-panels.ts";
import { POSOLOGY_GROUPS, allPhrases, applyPhrase, appendNote } from "./posology.ts";

/* ---------- painéis de exames ---------- */

test("os painéis têm nome único, dica e exames", () => {
  assert.ok(EXAM_PANELS.length >= 10, `só ${EXAM_PANELS.length} painéis`);
  const names = EXAM_PANELS.map((p) => p.name);
  assert.equal(new Set(names).size, names.length, "nome de painel repetido");
  for (const panel of EXAM_PANELS) {
    assert.ok(panel.hint.trim().length > 0, `${panel.name}: sem dica`);
    assert.ok(panel.exams.length >= 3, `${panel.name}: poucos exames`);
    assert.equal(new Set(panel.exams).size, panel.exams.length, `${panel.name}: exame repetido`);
  }
});

/** Pedir exame não é prescrever — mas um painel não pode conter dose. */
test("nenhum painel embute dose de medicamento", () => {
  for (const panel of EXAM_PANELS) {
    for (const exam of panel.exams) {
      assert.ok(!/\d+\s*(mg|ml|mcg)\b/i.test(exam), `${panel.name}: "${exam}" parece dose`);
    }
  }
});

test("o painel vira uma lista numerada", () => {
  const text = renderPanel(EXAM_PANELS[0]);
  assert.match(text, /^1\. /m);
  assert.equal(text.split("\n").length, EXAM_PANELS[0].exams.length);
});

test("juntar painéis não repete o exame que aparece nos dois", () => {
  const [a, b] = EXAM_PANELS;
  const merged = mergePanels([a, b]);
  assert.equal(new Set(merged.map((e) => e.toLowerCase())).size, merged.length);
  // E não perde nada: todo exame dos dois está no resultado.
  for (const exam of [...a.exams, ...b.exams]) {
    assert.ok(merged.some((e) => e.toLowerCase() === exam.toLowerCase()), `sumiu: ${exam}`);
  }
});

test("juntar nada devolve nada", () => {
  assert.deepEqual(mergePanels([]), []);
});

/* ---------- posologia ---------- */

test("as frases de posologia não mencionam medicamento nem dose", () => {
  for (const phrase of allPhrases()) {
    assert.ok(!/\d+\s*(mg|mcg|g)\b/i.test(phrase), `"${phrase}" parece trazer dose`);
  }
  assert.ok(allPhrases().length >= 25, `só ${allPhrases().length} frases`);
});

test("nenhuma frase repetida entre os grupos", () => {
  const all = allPhrases();
  assert.equal(new Set(all).size, all.length);
  for (const group of POSOLOGY_GROUPS) assert.ok(group.label.trim().length > 0);
});

test("{n} vira a quantidade escolhida", () => {
  assert.equal(applyPhrase("Tomar {n} mL de 8 em 8 horas", 10), "Tomar 10 mL de 8 em 8 horas");
  assert.equal(applyPhrase("Tomar {n} gotas", "15"), "Tomar 15 gotas");
});

/** Deixar "{n}" impresso numa receita seria pior que um espaço para preencher. */
test("sem quantidade, o marcador vira espaço para completar", () => {
  assert.equal(applyPhrase("Tomar {n} mL", null), "Tomar ___ mL");
  assert.equal(applyPhrase("Tomar {n} mL", ""), "Tomar ___ mL");
  assert.equal(applyPhrase("Tomar {n} mL"), "Tomar ___ mL");
});

test("frase sem marcador passa intacta", () => {
  assert.equal(applyPhrase("Tomar após as refeições", 5), "Tomar após as refeições");
});

test("a observação entra sem duplicar ponto", () => {
  assert.equal(appendNote("Tomar 1 comprimido ao dia.", "Tomar após as refeições"),
    "Tomar 1 comprimido ao dia. Tomar após as refeições");
  assert.equal(appendNote("Tomar 1 comprimido ao dia", "Tomar com bastante água"),
    "Tomar 1 comprimido ao dia. Tomar com bastante água");
});

test("a mesma observação não entra duas vezes", () => {
  const once = appendNote("Tomar 1 comprimido ao dia", "Tomar após as refeições");
  assert.equal(appendNote(once, "Tomar após as refeições"), once);
});

test("observação em posologia vazia vira a própria posologia", () => {
  assert.equal(appendNote("", "Tomar após as refeições"), "Tomar após as refeições");
});
