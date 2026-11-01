import { test } from "node:test";
import assert from "node:assert/strict";
import { SCREEN_PARENT, initialScreen, isScreen, resolveScreen, screenHref, screenIndex } from "./composer-screens.ts";

test("abre em Nesta emissão quando a pilha já tem algo, em Montar quando o tipo veio no link, senão em Tipo", () => {
  assert.equal(initialScreen({ itemCount: 2, kindChosen: true }), "emissao");
  assert.equal(initialScreen({ itemCount: 0, kindChosen: true }), "montar");
  assert.equal(initialScreen({ itemCount: 0, kindChosen: false }), "tipo");
});

test("a tela da URL vale, menos Revisar com a pilha vazia e valores estranhos", () => {
  assert.equal(resolveScreen("montar", "tipo", 0), "montar");
  assert.equal(resolveScreen("revisar", "tipo", 1), "revisar");
  assert.equal(resolveScreen("revisar", "tipo", 0), "emissao");
  assert.equal(resolveScreen("lixo", "montar", 0), "montar");
  assert.equal(resolveScreen(null, "tipo", 0), "tipo");
  assert.equal(isScreen("emissao"), true);
  assert.equal(isScreen("pronto"), false);
});

test("o voltar sem histórico sobe um nível; a primeira tela fecha", () => {
  assert.equal(SCREEN_PARENT.revisar, "emissao");
  assert.equal(SCREEN_PARENT.emissao, "tipo");
  assert.equal(SCREEN_PARENT.montar, "tipo");
  assert.equal(SCREEN_PARENT.tipo, null);
});

test("trocar de tela mantém o resto da URL", () => {
  assert.equal(
    screenHref("https://x.app/pacientes/3/emitir?kind=receituario&encounter=9", "revisar"),
    "/pacientes/3/emitir?kind=receituario&encounter=9&tela=revisar"
  );
  assert.equal(screenHref("https://x.app/pacientes/3/emitir?tela=tipo", "montar"), "/pacientes/3/emitir?tela=montar");
  assert.equal(screenIndex("tipo"), 1);
  assert.equal(screenIndex("revisar"), 4);
});
