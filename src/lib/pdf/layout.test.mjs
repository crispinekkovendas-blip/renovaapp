import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapText, paginate, linesThatFit } from "./layout.ts";

/** Fonte de largura fixa: 1 unidade por caractere, para o teste ser legível. */
const mono = (text) => text.length;

test("não quebra o que já cabe", () => {
  assert.deepEqual(wrapText("abc def", 20, mono), ["abc def"]);
});

test("quebra na palavra, sem cortá-la", () => {
  assert.deepEqual(wrapText("aaa bbb ccc ddd", 7, mono), ["aaa bbb", "ccc ddd"]);
});

test("respeita as quebras que o texto já tem", () => {
  assert.deepEqual(wrapText("um\ndois", 20, mono), ["um", "dois"]);
});

/** No receituário a linha em branco separa um medicamento do outro. */
test("preserva a linha em branco entre medicamentos", () => {
  assert.deepEqual(wrapText("1) Dipirona\n\n2) Omeprazol", 20, mono), ["1) Dipirona", "", "2) Omeprazol"]);
});

test("mantém o recuo da posologia ao quebrar", () => {
  const lines = wrapText("   Tomar um comprimido de oito em oito horas", 20, mono);
  assert.ok(lines.length > 1);
  for (const line of lines) assert.match(line, /^ {3}\S/, `sem recuo: "${line}"`);
});

test("parte a palavra que não cabe de jeito nenhum", () => {
  const lines = wrapText("aaaaaaaaaaaaaaa", 5, mono);
  assert.ok(lines.length >= 3);
  for (const line of lines) assert.ok(mono(line) <= 5, `linha larga demais: "${line}"`);
  assert.equal(lines.join(""), "aaaaaaaaaaaaaaa");
});

test("palavra gigante no meio de uma frase não derruba o resto", () => {
  const lines = wrapText("ok aaaaaaaaaaaa fim", 6, mono);
  for (const line of lines) assert.ok(mono(line) <= 6, `"${line}"`);
  assert.ok(lines.join(" ").includes("fim"));
});

test("texto vazio não vira página vazia sem querer", () => {
  assert.deepEqual(wrapText("", 10, mono), [""]);
});

test("a primeira página cabe menos, por causa do cabeçalho", () => {
  const lines = ["a", "b", "c", "d", "e", "f", "g"];
  const pages = paginate(lines, 3, 2);
  assert.deepEqual(pages, [["a", "b", "c"], ["d", "e"], ["f", "g"]]);
});

test("tudo numa página quando cabe", () => {
  assert.deepEqual(paginate(["a", "b"], 10, 10), [["a", "b"]]);
});

test("sem linhas, ainda há uma página", () => {
  assert.deepEqual(paginate([], 10, 10), [[]]);
});

test("quantas linhas cabem numa altura", () => {
  assert.equal(linesThatFit(100, 10), 10);
  assert.equal(linesThatFit(95, 10), 9);
  assert.equal(linesThatFit(0, 10), 0);
  assert.equal(linesThatFit(-5, 10), 0);
});
