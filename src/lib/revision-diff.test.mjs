import { test } from "node:test";
import assert from "node:assert/strict";
import { conciseDiff, conciseItems, headline, plainLine } from "./revision-diff.ts";
import { plantaoChanges } from "./emergency-guide/index.ts";
import { guideEntries } from "./clinical-guide.ts";
import { driveRevisionLog } from "./prescription-drive/index.ts";

const plain = (before, after) => plainLine({ parts: conciseDiff(before, after) });

test("só a dose trocada, com pouco contexto", () => {
  assert.equal(plain("Glicemia > 189: aumentar 2 mL/h", "Glicemia > 180: aumentar 2 mL/h"), "Glicemia > ~189~ → *180*: aumentar 2 mL …");
  assert.equal(plain("Ondansetrona (4 mg/mL) – 1 ampola", "Ondansetrona (4 mg/2 mL) – 1 ampola"), "Ondansetrona (4 mg/*2* mL) – 1 ampola");
  assert.equal(
    plain("Administrar 5 mL (5 mg) EV, imediatamente.", "Administrar 1 mL (5 mg) EV lento, imediatamente."),
    "Administrar ~5~ → *1* mL (5 mg) EV *lento*, imediatamente."
  );
});

test("trocas juntas viram um trecho só e o espaço de cada texto é mantido", () => {
  const out = plain(
    "21 cápsulas — Tomar 1 cápsula de 8 em 8 horas por 7 dias",
    "30 cápsulas — Tomar 2 cápsulas (1 g) de 8 em 8 horas por 5 dias"
  );
  assert.match(out, /~21 cápsulas — Tomar 1 cápsula~ → \*30 cápsulas — Tomar 2 cápsulas \(1 g\)\*/);
  assert.match(out, /por ~7~ → \*5\* dias/);
});

test("texto reescrito vira o começo do antigo → o começo do novo", () => {
  const parts = conciseDiff(
    "Evitar em pacientes com peso menor que 60 kg por risco de sangramento grave",
    "Contraindicado se AVC ou AIT prévio; a dose de manutenção de 5 mg vale para quem tem 75 anos ou mais"
  );
  assert.deepEqual(
    parts.map((p) => p.k),
    ["del", "ins"]
  );
  assert.ok(parts[0].t.endsWith("…") && parts[1].t.endsWith("…"));
});

test("a primeira frase, sem cortar parênteses, abreviação nem cabeçalho curto", () => {
  assert.equal(
    headline("Mometasona de 1 vez para 2 vezes ao dia (2 jatos em cada narina de 12/12 h): na rinossinusite aguda a dose é maior."),
    "Mometasona de 1 vez para 2 vezes ao dia (2 jatos em cada narina de 12/12 h)"
  );
  assert.equal(
    headline("Não suspender de rotina: a maioria das epistaxes para com medidas locais. Avaliar caso a caso."),
    "Não suspender de rotina: a maioria das epistaxes para com medidas locais."
  );
  assert.equal(headline("Prednisolona 1 a 2 mg/kg (máx. 40 mg) por 3 a 5 dias. Depois, reavaliar."), "Prednisolona 1 a 2 mg/kg (máx. 40 mg) por 3 a 5 dias.");
  assert.ok(headline("a ".repeat(200)).length <= 151);
});

test("receita: o trecho de cada remédio, o que entrou e o que saiu", () => {
  const lines = conciseItems(
    ["Omeprazol 20 mg · 28 cápsulas — Tomar 1 cápsula ao dia", "Domperidona 10 mg · 21 comprimidos — Tomar 1 comprimido antes das refeições"],
    ["Omeprazol 20 mg · 56 cápsulas — Tomar 2 cápsulas ao dia", "Ceftriaxona 1 g · 1 frasco-ampola — Aplicar 1 frasco-ampola via intramuscular, dose única"]
  ).map(plainLine);
  assert.deepEqual(lines, [
    "Omeprazol 20 mg: ~28 cápsulas — Tomar 1 cápsula~ → *56 cápsulas — Tomar 2 cápsulas* ao dia",
    "Entrou: *Ceftriaxona 1 g — Aplicar 1 frasco-ampola via intramuscular, dose única*",
    "Saiu: ~Domperidona 10 mg~",
  ]);
});

test("toda mudança do guia tem um resumo curto do que mudou", () => {
  const all = [
    ...plantaoChanges().map((c) => ({ where: `plantão: ${c.topic}`, concise: c.concise })),
    ...guideEntries().flatMap((e) => e.changes.map((c) => ({ where: `receita: ${e.name}`, concise: c.concise }))),
    ...driveRevisionLog().map((r) => ({ where: `drive: ${r.title}`, concise: r.concise })),
  ];
  assert.ok(all.length > 400);
  for (const { where, concise } of all) {
    assert.ok(concise.length > 0, `${where}: sem resumo`);
    for (const line of concise) {
      const text = plainLine(line);
      assert.ok(text.replace(/[~*]/g, "").trim().length > 0, `${where}: resumo vazio`);
      // Avisos saem inteiros (até ~400 caracteres); o resto, enxuto.
      const limit = /^(⚠ Conferir|Aviso)/.test(line.label ?? "") ? 600 : 400;
      assert.ok(text.length <= limit, `${where}: resumo longo demais (${text.length})`);
    }
  }
});
