import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeDragItems, documentIndexes, encodeDragItems, firstAdded, pageOfItem } from "./rx-canvas.ts";
import { emptyItem, splitIntoDocuments } from "./prescription.ts";

const item = (name, tarja = "livre", posology = "1 comprimido de 8/8 horas") => ({
  ...emptyItem(),
  name,
  tarja,
  posology,
});

test("o que se arrasta volta igual do outro lado", () => {
  const items = [{ ...item("Amoxicilina 500 MG"), quantity: "21 cápsulas", route: "Via oral", continuous: false }];
  assert.deepEqual(decodeDragItems(encodeDragItems(items)), items);
});

test("soltar qualquer outra coisa não inclui nada", () => {
  assert.deepEqual(decodeDragItems(""), []);
  assert.deepEqual(decodeDragItems(null), []);
  assert.deepEqual(decodeDragItems("dipirona"), []);
  assert.deepEqual(decodeDragItems('{"name":"x"}'), []);
});

test("cada medicamento do papel aponta para a posição dele na lista do editor", () => {
  const rx = [item("Dipirona"), item("Sertralina", "vermelha_retida"), item("Sem posologia", "livre", ""), item("Paracetamol")];
  const docs = splitIntoDocuments(rx);
  const byKind = Object.fromEntries(docs.map((doc) => [doc.kind, documentIndexes(rx, doc)]));
  assert.deepEqual(byKind.simples, [0, 3]);
  assert.deepEqual(byKind.controle_especial, [1]);
});

test("dois itens iguais continuam distintos", () => {
  const rx = [item("Dipirona"), item("Dipirona")];
  assert.deepEqual(documentIndexes(rx, splitIntoDocuments(rx)[0]), [0, 1]);
});

test("a página de um item é a primeira que o mostra", () => {
  const pages = [{ itemIndexes: [0, 3] }, { itemIndexes: [1] }, { itemIndexes: [1] }, {}];
  assert.equal(pageOfItem(pages, 3), 0);
  assert.equal(pageOfItem(pages, 1), 1);
  assert.equal(pageOfItem(pages, 2), -1);
});

test("o foco vai para o primeiro item novo, e só quando a lista cresce", () => {
  assert.equal(firstAdded(2, 3), 2);
  assert.equal(firstAdded(2, 5), 2);
  assert.equal(firstAdded(3, 3), null);
  assert.equal(firstAdded(3, 2), null);
});
