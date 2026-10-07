import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyItem,
  itemComplete,
  whatIsMissing,
  serializeItems,
  parseItems,
  renderItem,
  renderBody,
  splitIntoDocuments,
  blockedItems,
  printableDocuments,
  prescriptionWarnings,
  MAX_PRESCRIPTION_ITEMS,
} from "./prescription.ts";

const item = (over = {}) => ({
  name: "Dipirona 500 MG",
  concentration: "500 MG",
  tarja: "vermelha",
  quantity: "1 caixa",
  posology: "Tomar 1 comprimido de 6 em 6 horas se dor",
  route: "Via oral",
  continuous: false,
  ...over,
});

test("item só vale com medicamento e posologia", () => {
  assert.equal(itemComplete(item()), true);
  assert.equal(itemComplete(emptyItem()), false);
  assert.deepEqual(whatIsMissing(emptyItem()), ["medicamento", "posologia"]);
  assert.deepEqual(whatIsMissing(item({ posology: "  " })), ["posologia"]);
});

test("a lista vai e volta em JSON sem perder nada", () => {
  const items = [item(), item({ name: "Omeprazol 20 MG", continuous: true, route: "Via oral" })];
  const back = parseItems(serializeItems(items));
  assert.deepEqual(back, items);
});

test("JSON corrompido devolve lista vazia em vez de derrubar a tela", () => {
  for (const raw of ["", null, undefined, "{", "null", '"texto"', "{}", "[1,2]"]) {
    assert.deepEqual(parseItems(raw), []);
  }
});

test("item sem nome é descartado na leitura", () => {
  assert.equal(parseItems(JSON.stringify([{ name: "  ", posology: "x" }])).length, 0);
});

test("tarja e via desconhecidas caem num valor seguro", () => {
  const [row] = parseItems(JSON.stringify([{ name: "X", tarja: "roxa", route: "Via espacial" }]));
  assert.equal(row.tarja, "desconhecida");
  assert.equal(row.route, "");
});

test("a lista é limitada, na ida e na volta", () => {
  const many = Array.from({ length: MAX_PRESCRIPTION_ITEMS + 10 }, (_, i) => item({ name: `Med ${i}` }));
  assert.equal(parseItems(serializeItems(many)).length, MAX_PRESCRIPTION_ITEMS);
});

test("a linha impressa traz quantidade ao lado do nome e posologia embaixo", () => {
  const text = renderItem(item(), 0);
  assert.match(text, /^1\) Dipirona 500 MG — 1 caixa$/m);
  assert.match(text, /Tomar 1 comprimido de 6 em 6 horas se dor\. Via oral\./);
});

test("uso contínuo aparece na receita", () => {
  assert.match(renderItem(item({ continuous: true }), 0), /Uso contínuo\./);
});

test("o corpo numera os itens e ignora os incompletos", () => {
  const body = renderBody([item(), emptyItem(), item({ name: "Omeprazol 20 MG" })]);
  assert.match(body, /^1\) Dipirona/m);
  assert.match(body, /^2\) Omeprazol/m);
  assert.equal(body.includes("3)"), false);
});

/**
 * A regra que mais importa: dipirona e amoxicilina numa consulta são **dois
 * papéis**, não um. Errar aqui é emitir um documento que a farmácia recusa.
 */
test("separa a prescrição nos documentos que a lei exige", () => {
  const docs = splitIntoDocuments([
    item({ name: "Dipirona 500 MG", tarja: "vermelha" }),
    item({ name: "Amoxicilina 500 MG", tarja: "vermelha_retida" }),
    item({ name: "Paracetamol 750 MG", tarja: "livre" }),
  ]);
  assert.equal(docs.length, 2);
  assert.equal(docs[0].kind, "simples");
  assert.equal(docs[0].vias, 1);
  assert.deepEqual(docs[0].items.map((i) => i.name), ["Dipirona 500 MG", "Paracetamol 750 MG"]);
  assert.equal(docs[1].kind, "controle_especial");
  assert.equal(docs[1].vias, 2);
  assert.match(docs[1].label, /Controle Especial/);
});

test("receita só de medicamentos simples sai num documento só", () => {
  const docs = splitIntoDocuments([item(), item({ name: "Paracetamol", tarja: "livre" })]);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].items.length, 2);
});

test("cada documento numera a partir de 1", () => {
  const docs = splitIntoDocuments([
    item({ name: "Dipirona", tarja: "vermelha" }),
    item({ name: "Amoxicilina", tarja: "vermelha_retida" }),
  ]);
  assert.match(docs[1].body, /^1\) Amoxicilina/m);
});

test("tarja preta é identificada e fica fora do que se imprime", () => {
  const items = [item({ name: "Dipirona", tarja: "vermelha" }), item({ name: "Clonazepam 2 MG", tarja: "preta" })];
  assert.deepEqual(blockedItems(items).map((i) => i.name), ["Clonazepam 2 MG"]);
  const printable = printableDocuments(items);
  assert.equal(printable.length, 1);
  assert.equal(printable[0].kind, "simples");
});

test("avisa alergia usando o que já está no cadastro", () => {
  const w = prescriptionWarnings([item({ name: "DIPIRONA MONOIDRATADA 500 MG" })], "Dipirona\nPoeira");
  assert.equal(w.length, 1);
  assert.equal(w[0].kind, "alergia");
  assert.match(w[0].message, /alergia a Dipirona/);
});

test("avisa o mesmo medicamento repetido na mesma receita", () => {
  const w = prescriptionWarnings([item(), item()], null);
  const dup = w.filter((x) => x.kind === "duplicado");
  assert.equal(dup.length, 1);
  assert.match(dup[0].message, /2 vezes/);
});

test("avisa que tarja preta não sai neste papel", () => {
  const w = prescriptionWarnings([item({ name: "Clonazepam 2 MG", tarja: "preta" })], null);
  const blocked = w.filter((x) => x.kind === "bloqueado");
  assert.equal(blocked.length, 1);
  assert.match(blocked[0].message, /Notificação de Receita/);
});

test("receita limpa não inventa aviso", () => {
  assert.deepEqual(prescriptionWarnings([item()], "Penicilina"), []);
  assert.deepEqual(prescriptionWarnings([], null), []);
});

test("item incompleto não gera aviso nem documento", () => {
  assert.deepEqual(prescriptionWarnings([emptyItem()], "qualquer"), []);
  assert.deepEqual(splitIntoDocuments([emptyItem()]), []);
});
