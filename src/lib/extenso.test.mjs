import { test } from "node:test";
import assert from "node:assert/strict";
import { valorPorExtenso } from "./extenso.ts";

test("zero", () => {
  assert.equal(valorPorExtenso(0), "zero reais");
});

test("um centavo (singular)", () => {
  assert.equal(valorPorExtenso(1), "um centavo");
});

test("somente centavos, plural com 'e' entre dezena e unidade", () => {
  assert.equal(valorPorExtenso(21), "vinte e um centavos");
});

test("um real (singular)", () => {
  assert.equal(valorPorExtenso(100), "um real");
});

test("vinte e cinco reais", () => {
  assert.equal(valorPorExtenso(2500), "vinte e cinco reais");
});

test("cem reais usa 'cem', não 'cento'", () => {
  assert.equal(valorPorExtenso(10000), "cem reais");
});

test("cento e vinte reais e cinquenta centavos", () => {
  assert.equal(valorPorExtenso(12050), "cento e vinte reais e cinquenta centavos");
});

test("mil reais (sem 'um' antes de mil)", () => {
  assert.equal(valorPorExtenso(100000), "mil reais");
});

test("mil e um reais", () => {
  assert.equal(valorPorExtenso(100100), "mil e um reais");
});

test("mil e cem reais", () => {
  assert.equal(valorPorExtenso(110000), "mil e cem reais");
});

test("mil e quinhentos reais (centena redonda leva 'e')", () => {
  assert.equal(valorPorExtenso(150000), "mil e quinhentos reais");
});

test("mil, duzentos e cinquenta reais (grupo final não redondo leva vírgula)", () => {
  assert.equal(valorPorExtenso(125000), "mil, duzentos e cinquenta reais");
});

test("dois mil e trinta reais e cinco centavos", () => {
  assert.equal(valorPorExtenso(203005), "dois mil e trinta reais e cinco centavos");
});

test("cem mil reais", () => {
  assert.equal(valorPorExtenso(10_000_000), "cem mil reais");
});

test("um milhão de reais (milhão redondo leva 'de')", () => {
  assert.equal(valorPorExtenso(100_000_000), "um milhão de reais");
});

test("dois milhões de reais", () => {
  assert.equal(valorPorExtenso(200_000_000), "dois milhões de reais");
});

test("um milhão e quinhentos mil reais (não redondo, sem 'de')", () => {
  assert.equal(valorPorExtenso(150_000_000), "um milhão e quinhentos mil reais");
});

test("um milhão de reais e um centavo", () => {
  assert.equal(valorPorExtenso(100_000_001), "um milhão de reais e um centavo");
});

test("um milhão, duzentos mil e quinhentos reais", () => {
  assert.equal(valorPorExtenso(120_050_000), "um milhão, duzentos mil e quinhentos reais");
});

test("valor máximo 999.999.999,99", () => {
  assert.equal(
    valorPorExtenso(99_999_999_999),
    "novecentos e noventa e nove milhões, novecentos e noventa e nove mil, novecentos e noventa e nove reais e noventa e nove centavos"
  );
});

test("arredonda centavos fracionados", () => {
  assert.equal(valorPorExtenso(2500.4), "vinte e cinco reais");
});

test("rejeita negativos, acima do máximo e não finitos", () => {
  assert.throws(() => valorPorExtenso(-1), RangeError);
  assert.throws(() => valorPorExtenso(100_000_000_000), RangeError);
  assert.throws(() => valorPorExtenso(Number.NaN), RangeError);
});
