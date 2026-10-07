import { test } from "node:test";
import assert from "node:assert/strict";
import { isClosed, isMuted } from "./status.ts";

const ALL = ["agendado", "confirmado", "em_atendimento", "concluido", "faltou", "cancelado"];

test("isMuted: só cancelado e faltou", () => {
  assert.deepEqual(
    ALL.filter(isMuted),
    ["faltou", "cancelado"]
  );
});

test("isClosed: concluído, faltou e cancelado saem do fluxo", () => {
  assert.deepEqual(
    ALL.filter(isClosed),
    ["concluido", "faltou", "cancelado"]
  );
});

test("o que não está fechado é o que ainda se atende", () => {
  assert.deepEqual(
    ALL.filter((s) => !isClosed(s)),
    ["agendado", "confirmado", "em_atendimento"]
  );
});
