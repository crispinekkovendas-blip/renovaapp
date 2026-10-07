import { test } from "node:test";
import assert from "node:assert/strict";
import { ENCOUNTER_TEMPLATES, applyEncounterTemplate } from "./encounter-templates.ts";
import { MESSAGE_GROUPS, allMessages } from "./message-templates.ts";
import { PLACEHOLDERS } from "./documents.ts";

/* ---------- roteiros de atendimento ---------- */

test("os roteiros têm nome único e dica", () => {
  assert.ok(ENCOUNTER_TEMPLATES.length >= 6, `só ${ENCOUNTER_TEMPLATES.length} roteiros`);
  const names = ENCOUNTER_TEMPLATES.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
  for (const t of ENCOUNTER_TEMPLATES) assert.ok(t.hint.trim().length > 0, `${t.name}: sem dica`);
});

/**
 * O invariante do módulo: roteiro traz **pergunta**, não resposta. Um achado
 * pré-escrito ("murmúrio vesicular presente") viraria exame que ninguém fez.
 */
test("os roteiros não trazem achado clínico pré-escrito", () => {
  const achados = /murm[úu]rio vesicular presente|bulhas normofon|sem altera[çc][õo]es|normal\b|ausculta limpa/i;
  for (const t of ENCOUNTER_TEMPLATES) {
    for (const [campo, texto] of Object.entries(t)) {
      if (campo === "name" || campo === "hint" || !texto) continue;
      assert.ok(!achados.test(texto), `${t.name}.${campo}: parece trazer achado pronto`);
    }
  }
});

test("nenhum roteiro embute dose de medicamento", () => {
  for (const t of ENCOUNTER_TEMPLATES) {
    const todo = [t.complaint, t.anamnesis, t.exam, t.diagnosis, t.plan].filter(Boolean).join("\n");
    assert.ok(!/\d+\s*(mg|ml|mcg)\b/i.test(todo), `${t.name}: parece trazer dose`);
  }
});

test("aplicar o roteiro preenche o que está vazio", () => {
  const t = ENCOUNTER_TEMPLATES[0];
  const out = applyEncounterTemplate(t, {});
  assert.equal(out.anamnesis, t.anamnesis);
  assert.equal(out.exam, t.exam);
});

/** O que o médico já escreveu não pode ser apagado por escolher um roteiro. */
test("aplicar o roteiro nunca sobrescreve o que já foi escrito", () => {
  const t = ENCOUNTER_TEMPLATES[0];
  const out = applyEncounterTemplate(t, { anamnesis: "Paciente relata dor há 3 dias.", exam: "   " });
  assert.equal(out.anamnesis, "Paciente relata dor há 3 dias.");
  // Campo só com espaços conta como vazio.
  assert.equal(out.exam, t.exam);
});

test("roteiro sem um campo devolve string vazia, nunca undefined", () => {
  const out = applyEncounterTemplate({ name: "x", hint: "y" }, {});
  assert.deepEqual(out, { complaint: "", anamnesis: "", exam: "", diagnosis: "", plan: "" });
});

/* ---------- mensagens ---------- */

const KNOWN = new Set(PLACEHOLDERS.map((p) => p.key));

test("as mensagens têm nome único e dica", () => {
  const all = allMessages();
  assert.ok(all.length >= 12, `só ${all.length} mensagens`);
  const names = all.map((m) => m.name);
  assert.equal(new Set(names).size, names.length);
  for (const m of all) assert.ok(m.hint.trim().length > 0, `${m.name}: sem dica`);
  for (const g of MESSAGE_GROUPS) assert.ok(g.label.trim().length > 0);
});

/** Placeholder desconhecido chegaria ao paciente como "{{algo}}" no WhatsApp. */
test("nenhuma mensagem usa placeholder que o sistema não conhece", () => {
  for (const m of allMessages()) {
    for (const match of m.body.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)) {
      assert.ok(KNOWN.has(match[1]), `${m.name}: {{${match[1]}}} não existe`);
    }
  }
});

test("toda mensagem diz de onde está falando", () => {
  for (const m of allMessages()) {
    assert.match(m.body, /\{\{clinica\}\}/, `${m.name}: não identifica a clínica`);
  }
});

/**
 * Resultado de exame não vai por WhatsApp: é dado de saúde em canal que a
 * clínica não controla, e a leitura sem o médico assusta ou tranquiliza errado.
 */
test("a mensagem de resultado não entrega o resultado", () => {
  const resultado = allMessages().find((m) => m.name === "Resultado de exame disponível");
  assert.ok(resultado);
  assert.match(resultado.body, /consulta de retorno/i);
  assert.ok(!/resultado (foi|deu|está)\s+(normal|alterado)/i.test(resultado.body));
});
