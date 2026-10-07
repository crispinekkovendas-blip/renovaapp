import { test } from "node:test";
import assert from "node:assert/strict";
import { accentCount, groupKey, groupSpecialties } from "./specialty-groups.ts";

const s = (id, grupo) => ({ id: String(id), nome: `esp ${id}`, grupo });

test("groupKey ignores case and accents; accentCount counts diacritics", () => {
  assert.equal(groupKey("Clínica Geral"), groupKey("clinica geral"));
  assert.equal(accentCount("Clinica Geral"), 0);
  assert.equal(accentCount("Clínica Médica"), 2);
});

test("groupSpecialties merges spelling variants and keeps the accented label", () => {
  const groups = groupSpecialties([s(1, "Clinica Geral"), s(2, "Clínica geral"), s(3, "Cirurgia")]);
  assert.deepEqual(
    groups.map((g) => [g.label, g.items.map((i) => i.id)]),
    [
      ["Cirurgia", ["3"]],
      ["Clínica geral", ["1", "2"]],
    ]
  );
});

test("blank and literal 'Null' groups go to 'Outras', which sorts last", () => {
  const groups = groupSpecialties([s(1, "Null"), s(2, "  "), s(3, "Pediatria"), s(4, "Alergia"), s(5, "null")]);
  assert.deepEqual(groups.map((g) => g.label), ["Alergia", "Pediatria", "Outras"]);
  assert.deepEqual(groups.at(-1).items.map((i) => i.id), ["1", "2", "5"]);
});

test("empty input gives no groups", () => {
  assert.deepEqual(groupSpecialties([]), []);
});
