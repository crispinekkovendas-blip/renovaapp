import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  GLOBAL_ERRO_CODES,
  GLOBAL_OK_CODES,
  flashFromParams,
  parseUndo,
  undoParam,
  withFlash,
  withoutFlash,
} from "./flash.ts";
import { SETTINGS_ERRO, SETTINGS_OK } from "../app/(app)/configuracoes/settings-messages.ts";
import { chartFlashMessages } from "../components/pacientes/chart/chart-model.ts";

test("código geral vira aviso; código desconhecido (de uma tela, ou lixo) não vira nada", () => {
  assert.deepEqual(flashFromParams({ ok: "atendimento" }), [{ tone: "ok", text: "Atendimento salvo.", undo: null }]);
  assert.deepEqual(flashFromParams({ ok: "rascunho_excluido" }), []);
  assert.deepEqual(flashFromParams({ ok: "constructor", erro: "toString" }), []);
  assert.deepEqual(flashFromParams({}), []);
});

test("concluir mostra a cobrança quando houve, e só então", () => {
  const withCharge = flashFromParams({ ok: "concluido", valor: "15000", desfazer: "consulta.7" })[0];
  assert.match(withCharge.text, /^Atendimento concluído\. Cobrança de R\$\s150,00 lançada no Financeiro\.$/);
  assert.deepEqual(withCharge.undo, { kind: "consulta", id: 7 });
  assert.equal(flashFromParams({ ok: "concluido" })[0].text, "Atendimento concluído.");
  assert.equal(flashFromParams({ ok: "concluido", valor: "abc" })[0].text, "Atendimento concluído.");
  assert.equal(flashFromParams({ ok: "concluido", valor: "-5" })[0].text, "Atendimento concluído.");
});

test("sucesso vem antes do erro, e o desfazer só acompanha o sucesso", () => {
  const both = flashFromParams({ ok: "pago", erro: "sem_permissao", desfazer: "pagamento.3" });
  assert.deepEqual(
    both.map((m) => [m.tone, m.undo]),
    [
      ["ok", { kind: "pagamento", id: 3 }],
      ["erro", null],
    ],
  );
  assert.equal(flashFromParams({ erro: "consulta_fechada", desfazer: "consulta.3" })[0].undo, null);
});

test("o desfazer só aceita um tipo conhecido e um id positivo", () => {
  assert.deepEqual(parseUndo("espera.12"), { kind: "espera", id: 12 });
  assert.equal(parseUndo(undoParam("retorno", 5)).kind, "retorno");
  for (const lixo of ["", null, undefined, "consulta", "consulta.", "consulta.0", "consulta.-1", "anexo.3", "consulta.1;x", "consulta.1.2"]) {
    assert.equal(parseUndo(lixo), null, String(lixo));
  }
});

test("withFlash respeita a query e a âncora que o caminho já tem", () => {
  assert.equal(withFlash("/financeiro", "pago"), "/financeiro?ok=pago");
  assert.equal(withFlash("/agenda?date=2026-11-15", "espera"), "/agenda?date=2026-11-15&ok=espera");
  assert.equal(
    withFlash("/pacientes/9?aba=atendimentos#atendimento", "agendado"),
    "/pacientes/9?aba=atendimentos&ok=agendado#atendimento",
  );
  assert.equal(
    withFlash("/dashboard", "concluido", { undo: { kind: "consulta", id: 4 }, valor: 9900 }),
    "/dashboard?ok=concluido&desfazer=consulta.4&valor=9900",
  );
  assert.equal(withFlash("/dashboard", "concluido", { undo: null, valor: 0 }), "/dashboard?ok=concluido");
});

test("fechar o aviso tira só os parâmetros dele", () => {
  assert.equal(
    withoutFlash("/financeiro", "?mes=2026-11&ok=pago&desfazer=pagamento.3", ""),
    "/financeiro?mes=2026-11",
  );
  assert.equal(withoutFlash("/pacientes/9", "?ok=atendimento&aba=atendimentos", "#atendimento"), "/pacientes/9?aba=atendimentos#atendimento");
  assert.equal(withoutFlash("/dashboard", "?ok=concluido&valor=100", ""), "/dashboard");
  // Nada para limpar: não mexe na URL (não gera navegação à toa).
  assert.equal(withoutFlash("/agenda", "?date=2026-11-15", ""), null);
});

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

test("nenhuma tela repete um código geral (o aviso apareceria duas vezes)", () => {
  for (const code of GLOBAL_OK_CODES) {
    assert.ok(!Object.hasOwn(SETTINGS_OK, code), `SETTINGS_OK também tem "${code}"`);
    assert.deepEqual(chartFlashMessages(code, undefined), [], `a ficha também tem ok="${code}"`);
  }
  for (const code of GLOBAL_ERRO_CODES) {
    assert.ok(!Object.hasOwn(SETTINGS_ERRO, code), `SETTINGS_ERRO também tem "${code}"`);
    assert.deepEqual(chartFlashMessages(undefined, code), [], `a ficha também tem erro="${code}"`);
  }
  // As telas que comparam o código na mão (`ok === "salvo"`).
  const root = join(import.meta.dirname, "..");
  const files = [...sources(join(root, "app")), ...sources(join(root, "components"))];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const code of GLOBAL_OK_CODES) {
      assert.ok(!text.includes(`ok === "${code}"`), `${file} compara ok === "${code}"`);
    }
    for (const code of GLOBAL_ERRO_CODES) {
      assert.ok(!text.includes(`erro === "${code}"`), `${file} compara erro === "${code}"`);
    }
  }
});

test("as ações só redirecionam com código geral que existe", () => {
  const lib = import.meta.dirname;
  const actionFiles = readdirSync(lib).filter((name) => /^actions.*\.ts$/.test(name));
  const used = new Set();
  for (const name of actionFiles) {
    const text = readFileSync(join(lib, name), "utf8");
    for (const match of text.matchAll(/withFlash\([^,]+,\s*"([a-z_]+)"/g)) used.add(match[1]);
  }
  assert.ok(used.size >= 5, "esperava achar as chamadas de withFlash nas ações");
  for (const code of used) assert.ok(GLOBAL_OK_CODES.includes(code), `withFlash usa "${code}", que não está em lib/flash.ts`);
});
