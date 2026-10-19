import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adaptPhrase,
  formFromPresentation,
  formFromText,
  formOfItem,
  quantitySuggestions,
  unitsForCourse,
} from "./dosage-form.ts";
import { POSOLOGY_GROUPS, hasPhrase, phraseGroupsFor, togglePhrase } from "./posology.ts";

test("apresentação da CMED → forma", () => {
  const cases = {
    "500 MG CAP DURA CT BL AL PLAS TRANS X 21": "capsula",
    "500MG COM CT BL  AL PLAS TRANS X 30": "comprimido",
    "50 MG COM REV CT BL AL PLAS PVC TRANS X 60": "comprimido",
    "500 MG/ML SOL OR CT FR GOT PLAS OPC  X 20 ML": "gotas",
    "50 MG/ML PO SUS OR CT FR PLAS TRANSL X 150 ML + COP": "liquido",
    "40 MG PO SOL INJ CT 50 FA VD TRANS + 50 AMP DIL X 10ML": "injetavel",
    "500 MG/ML SOL INJ CT EST 50 AMP VD AMB X 2 ML": "injetavel",
    "20 MG/G CREM DERM CT BG AL X 30 G": "topico",
    "5 MG/ML SOL OFT CT FR GOT PLAS OPC X 5 ML": "colirio",
    "1 MG/G GRAN CT 10 ENV X 5 G": "sache",
    "20 MG CAP GEL DURA CT BL AL PLAS INC X 56": "capsula",
    "10 MG/G GEL CT BG AL X 30 G": "topico",
  };
  for (const [presentation, form] of Object.entries(cases)) assert.equal(formFromPresentation(presentation), form, presentation);
  assert.equal(formFromPresentation(null), null);
});

test("o que o médico escreveu → forma", () => {
  assert.equal(formFromText("30 cápsulas"), "capsula");
  assert.equal(formFromText("Tomar 1 comprimido ao dia"), "comprimido");
  assert.equal(formFromText("DIPIRONA 500 MG/ML"), "liquido");
  assert.equal(formFromText("Instilar 1 gota em cada olho"), "colirio");
  assert.equal(formFromText("Aplicar 2,5 mg por via subcutânea"), "injetavel");
  assert.equal(formFromText("AMOXICILINA 500 MG"), null);
  assert.equal(formOfItem({ form: "capsula", name: "X", quantity: "1 caixa", posology: "Tomar 1 comprimido" }), "capsula");
  assert.equal(formOfItem({ name: "X", quantity: "21 cápsulas", posology: "Tomar 1 comprimido" }), "capsula");
});

test("frase de comprimido na forma do item, com plural e maiúscula", () => {
  assert.equal(adaptPhrase("Tomar 1 comprimido de 8 em 8 horas", "capsula"), "Tomar 1 cápsula de 8 em 8 horas");
  assert.equal(adaptPhrase("Tomar 2 comprimidos em dose única", "dragea"), "Tomar 2 drágeas em dose única");
  assert.equal(adaptPhrase("Comprimido mastigável", "capsula"), "Cápsula mastigável");
  assert.equal(adaptPhrase("Tomar 1 comprimido", "liquido"), "Tomar 1 comprimido");
  assert.equal(adaptPhrase("Tomar 1 comprimido", null), "Tomar 1 comprimido");
});

test("grupos de frases: os da forma primeiro, observações por último", () => {
  const capsula = phraseGroupsFor("capsula");
  assert.equal(capsula[0].label, "Comprimidos e cápsulas");
  assert.match(capsula[0].phrases[0], /cápsula/);
  assert.equal(capsula.at(-1).label, "Observações que se acrescentam");
  assert.equal(phraseGroupsFor("injetavel")[0].label, "Injetáveis");
  assert.equal(phraseGroupsFor("gotas")[0].label, "Gotas");
  assert.equal(phraseGroupsFor(null).length, POSOLOGY_GROUPS.length);
});

test("frases prontas acumulam e saem com um segundo toque", () => {
  let p = togglePhrase("", "Tomar 1 comprimido de 8 em 8 horas por 7 dias");
  assert.equal(p, "Tomar 1 comprimido de 8 em 8 horas por 7 dias");
  p = togglePhrase(p, "Tomar após as refeições");
  p = togglePhrase(p, "Evitar bebida alcoólica durante o tratamento");
  assert.equal(p, "Tomar 1 comprimido de 8 em 8 horas por 7 dias. Tomar após as refeições. Evitar bebida alcoólica durante o tratamento");
  assert.equal(hasPhrase(p, "Tomar após as refeições"), true);
  p = togglePhrase(p, "Tomar após as refeições");
  assert.equal(p, "Tomar 1 comprimido de 8 em 8 horas por 7 dias. Evitar bebida alcoólica durante o tratamento");
  p = togglePhrase(p, "Tomar 1 comprimido de 8 em 8 horas por 7 dias");
  assert.equal(p, "Evitar bebida alcoólica durante o tratamento");
});

test("total do tratamento pela posologia", () => {
  assert.equal(unitsForCourse("Tomar 1 cápsula de 8 em 8 horas por 7 dias"), 21);
  assert.equal(unitsForCourse("Tomar 1 comprimido de 12 em 12 horas por 10 dias"), 20);
  assert.equal(unitsForCourse("Tomar 2 comprimidos 3 vezes ao dia por 5 dias"), 30);
  assert.equal(unitsForCourse("Tomar 1 comprimido ao dia por 30 dias"), 30);
  assert.equal(unitsForCourse("Tomar meio comprimido ao dia por 2 semanas"), 7);
  assert.equal(unitsForCourse("Tomar 2 comprimidos em dose única"), 2);
  assert.equal(unitsForCourse("Tomar 1 comprimido de 6 em 6 horas se dor, por até 3 dias"), null);
  assert.equal(unitsForCourse("Tomar 1 comprimido ao dia, uso contínuo"), null);
  assert.equal(unitsForCourse("Tomar 20 gotas de 6 em 6 horas"), null);
});

test("quantidade sugere a unidade da forma", () => {
  const capsula = { form: "capsula", name: "AMOXICILINA 500 MG", quantity: "", posology: "Tomar 1 cápsula de 8 em 8 horas por 7 dias" };
  assert.deepEqual(quantitySuggestions(capsula), ["21 cápsulas", "1 caixa", "2 caixas"]);
  assert.equal(quantitySuggestions({ ...capsula, quantity: "30" })[0], "30 cápsulas");
  const continuo = { form: "comprimido", name: "LOSARTANA 50 MG", quantity: "", posology: "Tomar 1 comprimido ao dia, pela manhã, uso contínuo", continuous: true };
  assert.deepEqual(quantitySuggestions(continuo).slice(0, 2), ["30 comprimidos (1 mês)", "90 comprimidos (3 meses)"]);
  assert.deepEqual(quantitySuggestions({ form: "gotas", name: "DIPIRONA 500 MG/ML", quantity: "", posology: "Tomar 40 gotas" }), ["1 frasco", "2 frascos"]);
  assert.ok(!quantitySuggestions({ ...capsula, quantity: "1 caixa" }).includes("1 caixa"));
});
