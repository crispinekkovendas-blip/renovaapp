import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatCidCode,
  bareCidCode,
  isCidCode,
  parseSexRestriction,
  cidLabel,
  cidSearchKey,
  sexMismatchWarning,
} from "./cid.ts";

test("o DATASUS grava sem ponto; o documento leva com ponto", () => {
  assert.equal(formatCidCode("A000"), "A00.0");
  assert.equal(formatCidCode("J111"), "J11.1");
  // Categoria de 3 caracteres não ganha ponto.
  assert.equal(formatCidCode("A00"), "A00");
  assert.equal(formatCidCode("I10"), "I10");
});

test("formatar aceita o que o médico digita", () => {
  assert.equal(formatCidCode("a00.0"), "A00.0");
  assert.equal(formatCidCode(" j11 1 "), "J11.1");
  assert.equal(formatCidCode("A00-0"), "A00.0");
});

test("o caminho de volta tira o ponto", () => {
  assert.equal(bareCidCode("A00.0"), "A000");
  assert.equal(bareCidCode("I10"), "I10");
});

test("reconhece o que é e o que não é CID", () => {
  assert.equal(isCidCode("I10"), true);
  assert.equal(isCidCode("A00.0"), true);
  assert.equal(isCidCode("a000"), true);
  assert.equal(isCidCode("gripe"), false);
  assert.equal(isCidCode("123"), false);
  assert.equal(isCidCode(""), false);
});

test("restrição de sexo aceita letra e número do DATASUS", () => {
  assert.equal(parseSexRestriction("F"), "F");
  assert.equal(parseSexRestriction("2"), "F");
  assert.equal(parseSexRestriction("M"), "M");
  assert.equal(parseSexRestriction("1"), "M");
  // Qualquer outra coisa é "sem restrição": inventar esconderia código legítimo.
  assert.equal(parseSexRestriction(""), null);
  assert.equal(parseSexRestriction(null), null);
  assert.equal(parseSexRestriction("X"), null);
});

test("o rótulo junta código e descrição", () => {
  assert.equal(cidLabel({ code: "A09.0", description: "Gastroenterite" }), "A09.0 — Gastroenterite");
});

/** Três formas de procurar a mesma linha: com ponto, sem ponto e pelo nome. */
test("a chave de busca cobre código com ponto, sem ponto e descrição", () => {
  const key = cidSearchKey("A090", "Gastroenterite e colite de origem infecciosa");
  assert.ok(key.includes("a090"));
  assert.ok(key.includes("a09 0"), "o código com ponto vira 'a09 0' na normalização");
  assert.ok(key.includes("gastroenterite"));
  assert.ok(key.includes("colite"));
});

test("busca por descrição ignora acento", () => {
  assert.ok(cidSearchKey("A00", "Cólera").includes("colera"));
});

test("avisa quando o código não combina com o sexo da ficha", () => {
  const gestacao = { code: "O26.9", description: "Afecção ligada à gravidez", sexRestriction: "F" };
  assert.match(sexMismatchWarning(gestacao, "M"), /feminino/);
  assert.equal(sexMismatchWarning(gestacao, "F"), null);
  assert.equal(sexMismatchWarning(gestacao, "Feminino"), null);
});

test("sem restrição, ou sem sexo na ficha, não há aviso", () => {
  const comum = { code: "I10", description: "Hipertensão essencial", sexRestriction: null };
  assert.equal(sexMismatchWarning(comum, "M"), null);
  const gestacao = { code: "O26.9", description: "Gravidez", sexRestriction: "F" };
  assert.equal(sexMismatchWarning(gestacao, null), null);
  assert.equal(sexMismatchWarning(gestacao, ""), null);
});
