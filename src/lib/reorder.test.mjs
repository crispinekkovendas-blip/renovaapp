import { test } from "node:test";
import assert from "node:assert/strict";
import { moveItem, nudge, canNudge } from "./reorder.ts";

const L = ["a", "b", "c", "d"];

test("move para cima e para baixo", () => {
  assert.deepEqual(moveItem(L, 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveItem(L, 3, 1), ["a", "d", "b", "c"]);
});

test("arrastar para o fim para no fim", () => {
  assert.deepEqual(moveItem(L, 0, 3), ["b", "c", "d", "a"]);
});

test("soltar no mesmo lugar não muda nada", () => {
  assert.deepEqual(moveItem(L, 2, 2), L);
});

/** Soltar fora da lista não pode embaralhar o que já estava certo. */
test("índice fora da lista devolve a lista intacta", () => {
  assert.deepEqual(moveItem(L, -1, 2), L);
  assert.deepEqual(moveItem(L, 1, 99), L);
  assert.deepEqual(moveItem(L, 99, 1), L);
  assert.deepEqual(moveItem(L, 1.5, 2), L);
});

test("não muda a lista original", () => {
  const orig = [...L];
  moveItem(L, 0, 3);
  assert.deepEqual(L, orig);
});

test("lista vazia ou de um item aguenta", () => {
  assert.deepEqual(moveItem([], 0, 0), []);
  assert.deepEqual(moveItem(["x"], 0, 0), ["x"]);
});

test("subir e descer pelo teclado", () => {
  assert.deepEqual(nudge(L, 1, -1), ["b", "a", "c", "d"]);
  assert.deepEqual(nudge(L, 1, 1), ["a", "c", "b", "d"]);
  // Nas pontas, não faz nada.
  assert.deepEqual(nudge(L, 0, -1), L);
  assert.deepEqual(nudge(L, 3, 1), L);
});

test("sabe quando o botão deve ficar desabilitado", () => {
  assert.equal(canNudge(4, 0, -1), false);
  assert.equal(canNudge(4, 0, 1), true);
  assert.equal(canNudge(4, 3, 1), false);
  assert.equal(canNudge(4, 3, -1), true);
  assert.equal(canNudge(1, 0, 1), false);
});
