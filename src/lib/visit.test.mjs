import assert from "node:assert/strict";
import { test } from "node:test";
import { canStartVisit, emitVisitHref, returnHref, visitHref, visitSteps } from "./visit.ts";

const states = (input) => visitSteps(input).map((step) => step.state);

test("antes de registrar, só o primeiro passo está na vez", () => {
  assert.deepEqual(states({ recorded: false, documents: 0 }), ["agora", "depois", "depois"]);
  // Documento emitido antes do registro não adianta o passo: sem atendimento não se conclui.
  assert.deepEqual(states({ recorded: false, documents: 2 }), ["agora", "depois", "depois"]);
});

test("registrado: documentos são opcionais e concluir é o passo da vez", () => {
  assert.deepEqual(states({ recorded: true, documents: 0 }), ["feito", "opcional", "agora"]);
  assert.deepEqual(states({ recorded: true, documents: 1 }), ["feito", "feito", "agora"]);
});

test("só se inicia atendimento de consulta ainda aberta", () => {
  for (const status of ["agendado", "confirmado", "em_atendimento"]) assert.ok(canStartVisit(status), status);
  for (const status of ["concluido", "faltou", "cancelado", "", "outro"]) assert.ok(!canStartVisit(status), status);
});

test("a ficha abre no formulário ou no painel", () => {
  assert.equal(visitHref(12), "/pacientes/12?aba=atendimentos#atendimento");
  assert.equal(visitHref(12, { form: true }), "/pacientes/12?aba=atendimentos&atender=1#novo-atendimento");
});

test("o documento do atendimento volta para o painel", () => {
  const href = emitVisitHref(12, 88);
  const url = new URL(href, "https://x.test");
  assert.equal(url.pathname, "/pacientes/12/emitir");
  assert.equal(url.searchParams.get("encounter"), "88");
  assert.equal(url.searchParams.get("volta"), "/pacientes/12?aba=atendimentos#atendimento");
});

test("agendar retorno leva paciente, profissional, a data prevista e o caminho de volta", () => {
  const url = (input) => new URL(returnHref({ today: "2026-11-15", ...input }), "https://x.test");
  const full = url({ patientId: 12, professionalId: 3, returnDue: "2026-12-15" });
  assert.equal(full.pathname, "/agenda/novo");
  assert.equal(full.searchParams.get("patient"), "12");
  assert.equal(full.searchParams.get("prof"), "3");
  assert.equal(full.searchParams.get("date"), "2026-12-15");
  assert.equal(full.searchParams.get("volta"), "/pacientes/12?aba=atendimentos#atendimento");
});

test("retorno sem data, com data vencida ou torta abre sem data (a pessoa escolhe)", () => {
  const date = (returnDue) =>
    new URL(returnHref({ patientId: 1, professionalId: null, returnDue, today: "2026-11-15" }), "https://x.test").searchParams.get("date");
  assert.equal(date(null), null);
  assert.equal(date(undefined), null);
  assert.equal(date("2026-11-01"), null);
  assert.equal(date("15/12/2026"), null);
  assert.equal(date("2026-11-15"), "2026-11-15");
  const noProf = new URL(returnHref({ patientId: 1, professionalId: null, returnDue: null, today: "2026-11-15" }), "https://x.test");
  assert.equal(noProf.searchParams.has("prof"), false);
});
