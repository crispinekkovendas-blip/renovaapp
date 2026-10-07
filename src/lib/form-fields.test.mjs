import { test } from "node:test";
import assert from "node:assert/strict";
import { ISO_DATE_RE, lines, optional, safeBack, safePath, str, withQuery } from "./form-fields.ts";

function form(entries) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

test("str apara e troca ausente por vazio", () => {
  const fd = form({ nome: "  Ana  " });
  assert.equal(str(fd, "nome"), "Ana");
  assert.equal(str(fd, "falta"), "");
});

test("optional: vazio ou só espaço vira null", () => {
  const fd = form({ a: "   ", b: " x " });
  assert.equal(optional(fd, "a"), null);
  assert.equal(optional(fd, "b"), "x");
  assert.equal(optional(fd, "c"), null);
});

test("lines: uma por linha, sem vazias, CRLF normalizado", () => {
  const fd = form({ alergias: " dipirona \r\n\r\n  látex\rpenicilina \n  " });
  assert.equal(lines(fd, "alergias"), "dipirona\nlátex\npenicilina");
  assert.equal(lines(form({ x: " \n \n" }), "x"), null);
});

test("safeBack aceita só caminho do próprio app", () => {
  assert.equal(safeBack(form({ back: "/agenda?date=2026-09-23" }), "/x"), "/agenda?date=2026-09-23");
  assert.equal(safeBack(form({}), "/financeiro"), "/financeiro");
  for (const evil of ["https://evil.com", "//evil.com", `/${String.fromCharCode(92)}evil.com`, "javascript:alert(1)", "agenda"]) {
    assert.equal(safeBack(form({ back: evil }), "/agenda"), "/agenda", evil);
  }
  assert.equal(safePath("/pacientes/1", "/"), "/pacientes/1");
});

test("withQuery escolhe ? ou &", () => {
  assert.equal(withQuery("/pacientes/1/emitir", "ok", "perfil"), "/pacientes/1/emitir?ok=perfil");
  assert.equal(withQuery("/pacientes/1/emitir?kind=laudo", "ok", "perfil"), "/pacientes/1/emitir?kind=laudo&ok=perfil");
});

test("ISO_DATE_RE: só YYYY-MM-DD", () => {
  assert.ok(ISO_DATE_RE.test("2026-09-23"));
  assert.ok(!ISO_DATE_RE.test("23/09/2026"));
  assert.ok(!ISO_DATE_RE.test("2026-09-23T10:00"));
});
