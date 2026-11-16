import assert from "node:assert/strict";
import { test } from "node:test";
import { THEMES, THEME_INIT_SCRIPT, nextTheme, parseTheme } from "./theme.ts";

test("o que não é escuro nem Marte é claro", () => {
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("mars"), "mars");
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme(undefined), "light");
  assert.equal(parseTheme("roxo"), "light");
});

test("a escolha oferece os três temas, uma vez cada, e todos sobrevivem à leitura", () => {
  assert.deepEqual([...THEMES], ["light", "dark", "mars"]);
  for (const theme of THEMES) assert.equal(parseTheme(theme), theme);
});

test("o botão do site e do portal só alterna claro e escuro; quem chega em Marte volta ao claro", () => {
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "light");
  assert.equal(nextTheme("mars"), "light");
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
