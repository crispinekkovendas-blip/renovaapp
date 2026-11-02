import { test } from "node:test";
import assert from "node:assert/strict";
import { BOX_COLORS, boxColor, fitBrand, textWidthEm } from "./med-box.ts";

test("boxColor: same brand, same color, ignoring case and accents", () => {
  assert.equal(boxColor("Rivotril"), boxColor("RIVOTRIL"));
  assert.equal(boxColor("Neosaldina"), boxColor("neosaldína"));
  assert.ok(BOX_COLORS.includes(boxColor("Zoloft")));
});

test("boxColor: spreads brands over the palette and never uses tarja red/black", () => {
  const used = new Set(["Rivotril", "Zoloft", "Novalgina", "Dorflex", "Amoxil", "Xarelto", "Ozempic", "Tylenol", "Aerolin", "Maxitrol", "Glifage", "Allegra"].map((b) => boxColor(b).main));
  assert.ok(used.size >= 5);
  for (const c of BOX_COLORS) assert.ok(!["#c2364a", "#1c1917"].includes(c.main));
});

test("fitBrand: short name is one big line", () => {
  const lines = fitBrand("AAS", 54, 19);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].size, 13);
});

test("fitBrand: long multi-word name wraps and every line fits", () => {
  const lines = fitBrand("Losartana Potássica Medley", 54, 19);
  assert.ok(lines.length >= 2);
  assert.deepEqual(lines.map((l) => l.text).join(" "), "Losartana Potássica Medley");
  for (const l of lines) assert.ok(l.squeeze || textWidthEm(l.text) * l.size <= 54);
  assert.ok(lines.length * lines[0].size * 1.05 <= 19 + 0.01);
});

test("fitBrand: a single very long word is squeezed to the width", () => {
  const [line, ...rest] = fitBrand("Hidroclorotiazidaextralonga", 54, 19);
  assert.equal(rest.length, 0);
  assert.equal(line.squeeze, 54);
});

test("fitBrand: empty name draws nothing", () => {
  assert.deepEqual(fitBrand("  ", 54, 19), []);
});
