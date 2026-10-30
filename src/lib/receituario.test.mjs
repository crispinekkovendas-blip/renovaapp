import { test } from "node:test";
import assert from "node:assert/strict";
import { continuousRenewals, hasMedication, medicationStats, rxSummary } from "./receituario.ts";

const item = (name, extra = {}) => ({
  name,
  concentration: null,
  tarja: "vermelha",
  quantity: "1 caixa",
  posology: "Tomar 1 comprimido ao dia",
  route: "Via oral",
  continuous: false,
  ...extra,
});

const rx = (docId, patientId, issuedAt, items, patientName = `Paciente ${patientId}`) => ({
  docId,
  patientId,
  patientName,
  issuedAt,
  items,
});

test("resumo: o papel mais restrito vence e item incompleto não conta", () => {
  const s = rxSummary([item("Dipirona 500 mg"), item("Clonazepam 2 mg", { tarja: "vermelha_retida" }), item("Sem posologia", { posology: "" })]);
  assert.deepEqual(s.names, ["Dipirona 500 mg", "Clonazepam 2 mg"]);
  assert.equal(s.receipt, "controle_especial");
  assert.equal(s.continuous, false);
  assert.equal(rxSummary([item("Losartana", { continuous: true })]).continuous, true);
});

test("busca por medicamento ignora acento e caixa", () => {
  const items = [item("Losartana Potássica 50 mg")];
  assert.equal(hasMedication(items, "potassica"), true);
  assert.equal(hasMedication(items, "LOSART"), true);
  assert.equal(hasMedication(items, "metformina"), false);
  assert.equal(hasMedication(items, "  "), true);
});

test("renovações: só uso contínuo, a receita mais nova de cada remédio, mais urgente primeiro", () => {
  const rxs = [
    rx(30, 1, "2026-10-01", [item("Losartana 50 mg", { continuous: true })]),
    rx(20, 2, "2026-04-10", [item("Metformina 850 mg", { continuous: true }), item("Amoxicilina 500 mg")]),
    rx(10, 1, "2026-01-05", [item("Losartana 50 mg", { continuous: true }), item("Sinvastatina 20 mg", { continuous: true })]),
  ];
  const out = continuousRenewals(rxs, "2026-10-29");
  // Paciente 1: a losartana vale pela receita nova (em dia); a sinvastatina só veio na antiga, que venceu.
  assert.equal(out.length, 3);
  const p2 = out.find((r) => r.patientId === 2);
  assert.deepEqual(p2.medications, ["Metformina 850 mg"]);
  assert.equal(p2.dueAt, "2026-10-07");
  assert.equal(p2.status, "vencida");
  const p1 = out.filter((r) => r.patientId === 1);
  assert.deepEqual(p1.map((r) => [r.docId, r.medications, r.status]), [
    [10, ["Sinvastatina 20 mg"], "vencida"],
    [30, ["Losartana 50 mg"], "em_dia"],
  ]);
  assert.equal(out[2].docId, 30, "a em dia vem por último");
});

test("renovações: controle especial vale 30 dias e avisa com 7; tarja preta fica de fora", () => {
  const rxs = [
    rx(1, 5, "2026-10-05", [
      item("Sertralina 50 mg", { tarja: "vermelha_retida", continuous: true }),
      item("Clonazepam 2 mg", { tarja: "preta", continuous: true }),
    ]),
  ];
  const [r] = continuousRenewals(rxs, "2026-10-29");
  assert.equal(r.receipt, "controle_especial");
  assert.equal(r.dueAt, "2026-11-04");
  assert.equal(r.daysLeft, 6);
  assert.equal(r.status, "em_breve");
  assert.deepEqual(r.medications, ["Sertralina 50 mg"]);
});

test("mais receitados: conta receitas e pacientes, posologias da mais usada para a menos", () => {
  const rxs = [
    rx(3, 1, "2026-10-20", [item("Dipirona 500 mg", { posology: "1 cp de 6/6h se dor" })]),
    rx(2, 2, "2026-10-10", [item("dipirona 500 mg", { posology: "1 cp de 6/6h se dor" }), item("Dipirona 500 mg")]),
    rx(1, 1, "2026-09-01", [item("Dipirona 500 mg", { posology: "2 cp de 6/6h" }), item("Losartana 50 mg", { continuous: true })]),
  ];
  const [top, second] = medicationStats(rxs);
  assert.equal(top.name, "Dipirona 500 mg");
  assert.equal(top.count, 3, "repetido na mesma receita conta uma vez");
  assert.equal(top.patients, 2);
  assert.equal(top.lastIssuedAt, "2026-10-20");
  assert.equal(top.posologies[0].text, "1 cp de 6/6h se dor");
  assert.equal(top.posologies[0].count, 2);
  assert.equal(second.name, "Losartana 50 mg");
  assert.equal(second.continuous, true);
});
