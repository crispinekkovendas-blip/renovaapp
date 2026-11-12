import assert from "node:assert/strict";
import { test } from "node:test";
import { THEME_INIT_SCRIPT, nextTheme, parseTheme } from "./theme.ts";

test("o que não é escuro nem Marte é claro", () => {
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("mars"), "mars");
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme(undefined), "light");
  assert.equal(parseTheme("roxo"), "light");
});

test("no app o botão dá a volta: claro, escuro, Marte, claro", () => {
  assert.equal(nextTheme("light", true), "dark");
  assert.equal(nextTheme("dark", true), "mars");
  assert.equal(nextTheme("mars", true), "light");
});

test("fora do app Marte não é oferecido, e quem chega em Marte volta ao claro", () => {
  assert.equal(nextTheme("light", false), "dark");
  assert.equal(nextTheme("dark", false), "light");
  assert.equal(nextTheme("mars", false), "light");
});

test("o script do <head> liga escuro e Marte, e nada mais", () => {
  const run = (stored) => {
    const dataset = {};
    const fn = new Function("localStorage", "document", THEME_INIT_SCRIPT);
    fn({ getItem: () => stored }, { documentElement: { dataset } });
    return dataset.theme;
  };
  assert.equal(run("dark"), "dark");
  assert.equal(run("mars"), "mars");
  assert.equal(run("light"), undefined);
  assert.equal(run(null), undefined);
  assert.equal(run("<script>"), undefined);
});
