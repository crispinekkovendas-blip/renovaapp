import { test } from "node:test";
import assert from "node:assert/strict";
import { dateParam, profParam } from "./params.ts";

test("dateParam aceita AAAA-MM-DD", () => {
  assert.equal(dateParam("2026-09-23", "2000-01-01"), "2026-09-23");
});

test("dateParam: ausente ou fora do formato cai no padrão", () => {
  for (const bad of [undefined, "", "23/09/2026", "2026-9-23", "2026-09-23x", "'; drop"]) {
    assert.equal(dateParam(bad, "2000-01-01"), "2000-01-01", String(bad));
  }
});

test("profParam: só dígitos viram id; o resto é 0 (todos)", () => {
  assert.equal(profParam("4"), 4);
  assert.equal(profParam("012"), 12);
  assert.equal(profParam(undefined), 0);
  assert.equal(profParam(""), 0);
  assert.equal(profParam("-1"), 0);
  assert.equal(profParam("4a"), 0);
});
