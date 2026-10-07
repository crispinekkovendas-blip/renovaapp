import { test } from "node:test";
import assert from "node:assert/strict";
import { erroMessage, okMessage } from "./settings-messages.ts";

test("okMessage maps known codes, falls back to 'Feito.', and is null without a code", () => {
  assert.equal(okMessage(undefined), null);
  assert.equal(okMessage(""), null);
  assert.equal(okMessage("portal"), "Configuração do portal salva.");
  assert.equal(okMessage("qualquer"), "Feito.");
  // Nome de propriedade herdada não é código válido.
  assert.equal(okMessage("toString"), "Feito.");
});

test("erroMessage maps known codes and falls back to the generic message", () => {
  assert.equal(erroMessage(undefined), null);
  assert.equal(erroMessage("email"), "Já existe um usuário com esse e-mail.");
  assert.equal(erroMessage("confirmacao_limpeza"), "Digite APAGAR exatamente para confirmar a limpeza.");
  assert.equal(erroMessage("xyz"), "Verifique os campos e tente novamente.");
  assert.equal(erroMessage("constructor"), "Verifique os campos e tente novamente.");
});
