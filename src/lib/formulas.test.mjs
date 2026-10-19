import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanFormula, formulaLines, toSpanish } from "./formulas.ts";

test("fórmula: limpa, descarta componente sem nome e monta as linhas da folha", () => {
  const f = cleanFormula({
    components: [{ name: " Minoxidil ", dose: "2,5 mg" }, { name: "", dose: "1 mg" }, { name: "Biotina", dose: "" }],
    base: "Excipiente q.s.p. 1 cápsula",
    amount: "Manipular 30 cápsulas",
  });
  assert.deepEqual(formulaLines(f), ["Minoxidil — 2,5 mg", "Biotina", "Excipiente q.s.p. 1 cápsula", "Manipular 30 cápsulas."]);
  assert.equal(cleanFormula({ components: [{ name: " " }] }), null);
  assert.equal(cleanFormula("lixo"), null);
  assert.deepEqual(formulaLines(null), []);
});

test("posologia em espanhol, por dicionário", () => {
  assert.equal(
    toSpanish("Tomar 1 cápsula de 8 em 8 horas por 7 dias, após as refeições"),
    "Tomar 1 cápsula cada 8 horas durante 7 días, después de las comidas",
  );
  assert.equal(
    toSpanish("Aplicar 2,5 mg por via subcutânea, 1 vez por semana, sempre no mesmo dia"),
    "Aplicar 2,5 mg por vía subcutánea, 1 vez por semana, siempre el mismo día",
  );
  assert.equal(toSpanish("Tomar 1 comprimido ao dia, pela manhã e à noite"), "Tomar 1 comprimido al día, por la mañana y por la noche");
  assert.equal(toSpanish("4 canetas"), "4 plumas");
  assert.equal(toSpanish("1 sachê"), "1 sobre");
});

test("espanhol mantém a maiúscula do começo da frase", () => {
  assert.equal(toSpanish("Via subcutânea. Uso contínuo."), "Vía subcutánea. Uso continuo.");
  assert.equal(toSpanish("Via oral"), "Vía oral");
});
