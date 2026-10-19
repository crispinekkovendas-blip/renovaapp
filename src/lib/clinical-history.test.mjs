import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bmi,
  cleanLines,
  conditionsOf,
  formatVitals,
  hasLine,
  parseHistory,
  parseVitals,
  readVitals,
  serializeHistory,
  serializeVitals,
  toggleLine,
  vitalAlerts,
} from "./clinical-history.ts";

test("história: só seções conhecidas e preenchidas; vazia vira null", () => {
  const raw = serializeHistory({ pessoais: "HAS\n\nHAS\n DM2 ", familiares: "  ", habitos: "Ex-tabagista" });
  assert.deepEqual(JSON.parse(raw), { pessoais: "HAS\nDM2", habitos: "Ex-tabagista" });
  assert.deepEqual(parseHistory(raw), { pessoais: "HAS\nDM2", habitos: "Ex-tabagista" });
  assert.equal(serializeHistory({ pessoais: " \n " }), null);
  assert.deepEqual(parseHistory('{"pessoais":"Asma","hack":"x","vacinas":3}'), { pessoais: "Asma" });
  assert.deepEqual(parseHistory("não é json"), {});
  assert.deepEqual(conditionsOf({ pessoais: "HAS\nAsma" }), ["HAS", "Asma"]);
});

test("atalhos acrescentam e tiram linhas sem mexer no resto", () => {
  let text = "Asma desde a infância";
  text = toggleLine(text, "Hipertensão arterial (HAS)");
  assert.equal(text, "Asma desde a infância\nHipertensão arterial (HAS)");
  assert.equal(hasLine(text, "hipertensão arterial (has)"), true);
  text = toggleLine(text, "Hipertensão arterial (HAS)");
  assert.equal(text, "Asma desde a infância");
  assert.equal(cleanLines("a\nA\n b "), "a\nb");
});

test("sinais vitais: lê vírgula, altura em metros e descarta o impossível", () => {
  const { vitals, rejected } = readVitals({
    pa: "130 / 85",
    fc: "88",
    temp: "38,2",
    spo2: "93",
    peso: "92,5",
    altura: "1,75",
    glicemia: "9999",
    fr: "",
  });
  assert.deepEqual(vitals, { pa: "130/85", fc: 88, temp: 38.2, spo2: 93, peso: 92.5, altura: 175 });
  assert.deepEqual(rejected, ["glicemia"]);
  assert.deepEqual(readVitals({ pa: "80/120" }).rejected, ["pa"]);
  assert.deepEqual(parseVitals(serializeVitals(vitals)), vitals);
  assert.equal(serializeVitals({}), null);
});

test("IMC, texto da ficha e alertas", () => {
  const v = { pa: "150/95", fc: 110, temp: 38.2, spo2: 92, peso: 92.5, altura: 175 };
  assert.equal(bmi(v), 30.2);
  assert.equal(formatVitals(v), "PA 150/95 mmHg · FC 110 bpm · Temp. 38,2 °C · SpO₂ 92 % · Peso 92,5 kg · Altura 175 cm · IMC 30,2");
  assert.deepEqual(vitalAlerts(v), ["PA elevada", "Taquicardia", "Febre", "Saturação baixa", "Obesidade (IMC ≥ 30)"]);
  assert.deepEqual(vitalAlerts({ pa: "120/80", fc: 72, temp: 36.5, spo2: 98 }), []);
  assert.equal(bmi({ peso: 70 }), null);
});
