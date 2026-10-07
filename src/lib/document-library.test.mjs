import { test } from "node:test";
import assert from "node:assert/strict";
import { DOCUMENT_LIBRARY, LIBRARY_GROUPS, libraryByGroup } from "./document-library.ts";
import { PLACEHOLDERS, DOCUMENT_KINDS, DOCUMENT_KIND_LABEL, ATESTADO_SUBKIND_LABEL, renderTemplate, buildTemplateVars } from "./documents.ts";

const KNOWN = new Set(PLACEHOLDERS.map((p) => p.key));
const used = (body) => [...body.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)].map((m) => m[1]);

test("a biblioteca tem modelos e nenhum nome repetido", () => {
  assert.ok(DOCUMENT_LIBRARY.length >= 30, `só ${DOCUMENT_LIBRARY.length} modelos`);
  const names = DOCUMENT_LIBRARY.map((t) => t.name);
  assert.equal(new Set(names).size, names.length, "nome de modelo repetido");
});

/**
 * O invariante que mais importa: placeholder desconhecido **não** é
 * substituído — sai "{{qualquer}}" impresso no documento assinado.
 */
test("nenhum modelo usa placeholder que o sistema não conhece", () => {
  for (const template of DOCUMENT_LIBRARY) {
    for (const key of used(template.body)) {
      assert.ok(KNOWN.has(key), `${template.name}: {{${key}}} não existe em PLACEHOLDERS`);
    }
  }
});

test("todo modelo tem tipo, grupo, nome, título e corpo válidos", () => {
  for (const t of DOCUMENT_LIBRARY) {
    assert.ok(DOCUMENT_KIND_LABEL[t.kind], `${t.name}: kind inválido (${t.kind})`);
    assert.ok(LIBRARY_GROUPS.includes(t.group), `${t.name}: grupo fora da lista (${t.group})`);
    assert.ok(t.name.trim().length > 0 && t.name.length <= 80, `${t.name}: nome fora do tamanho`);
    assert.ok(t.title.trim().length > 0, `${t.name}: sem título`);
    assert.ok(t.body.trim().length > 20, `${t.name}: corpo curto demais`);
  }
});

test("subkind só existe em atestado, e é um dos válidos", () => {
  for (const t of DOCUMENT_LIBRARY) {
    if (t.kind === "atestado") {
      assert.ok(ATESTADO_SUBKIND_LABEL[t.subkind], `${t.name}: subkind inválido (${t.subkind})`);
    } else {
      assert.ok(!t.subkind, `${t.name}: subkind só vale para atestado`);
    }
  }
});

/**
 * `DOCUMENT_KINDS` são os tipos que o **editor de texto** emite. O receituário
 * fica fora de propósito: é uma lista de medicamentos com editor próprio, e um
 * modelo dele seria um protocolo de medicamentos, não um texto com
 * {{placeholders}}.
 */
test("cada tipo de documento de texto tem pelo menos um modelo pronto", () => {
  for (const { kind } of DOCUMENT_KINDS) {
    assert.ok(DOCUMENT_LIBRARY.some((t) => t.kind === kind), `nenhum modelo para ${kind}`);
  }
  assert.ok(!DOCUMENT_KINDS.some((k) => k.kind === "receituario"), "receituário não usa o editor de texto");
});

/**
 * Com paciente e clínica preenchidos e todo o resto vazio, o documento tem de
 * sair limpo: sem "{{...}}" sobrando e sem linha órfã do tipo "CID:".
 */
test("renderiza limpo quando só o básico está preenchido", () => {
  const vars = buildTemplateVars({
    patient: { name: "Ana Beatriz Souza", cpf: null },
    professional: { name: "Dra. Marina Costa", council: "CRM 123456-SP" },
    clinicName: "Clínica Renova",
    date: "2026-09-17",
    fields: {},
  });

  for (const t of DOCUMENT_LIBRARY) {
    const out = renderTemplate(t.body, vars);
    assert.ok(!/\{\{/.test(out), `${t.name}: sobrou placeholder`);
    assert.ok(out.trim().length > 0, `${t.name}: renderizou vazio`);
    assert.ok(out.includes("Ana Beatriz Souza"), `${t.name}: o paciente sumiu`);
    // A linha do CID só aparece com CID; sem ele não pode sobrar o rótulo solto.
    assert.ok(!/^CID:\s*$/m.test(out), `${t.name}: linha "CID:" vazia no papel`);
  }
});

test("os agrupamentos cobrem todos os modelos", () => {
  const grouped = libraryByGroup().flatMap((g) => g.items);
  assert.equal(grouped.length, DOCUMENT_LIBRARY.length);
});

test("orientações falam com o paciente e trazem sinais de alerta", () => {
  const orientacoes = DOCUMENT_LIBRARY.filter((t) => t.kind === "orientacoes");
  assert.ok(orientacoes.length >= 12, `só ${orientacoes.length} modelos de orientação`);
  for (const t of orientacoes) {
    assert.match(t.body, /\{\{paciente\}\}/, `${t.name}: não nomeia o paciente`);
    assert.match(t.body, /\{\{clinica\}\}/, `${t.name}: não diz com quem falar em caso de dúvida`);
  }
  // Orientação administrativa (folha em branco, preparo de exame) não fala de
  // quadro clínico, então não tem sinal de alerta para dar. Toda orientação
  // sobre uma condição precisa ter.
  const ADMINISTRATIVAS = new Set([
    "Orientações — gerais pós-consulta",
    "Orientações — preparo para exames de sangue",
  ]);
  const clinicos = orientacoes.filter((t) => !ADMINISTRATIVAS.has(t.name));
  assert.ok(clinicos.length >= 10, `só ${clinicos.length} orientações clínicas`);
  for (const t of clinicos) {
    assert.match(t.body, /[Pp]rocure atendimento/, `${t.name}: sem sinais de alerta`);
  }
});

/** Dose é prescrição, e prescrição é no receituário — nunca num modelo de texto. */
test("nenhuma orientação embute dose de medicamento", () => {
  for (const t of DOCUMENT_LIBRARY.filter((x) => x.kind === "orientacoes")) {
    assert.ok(
      !/\d+\s*(mg|ml|mcg|g)\b/i.test(t.body),
      `${t.name}: parece trazer dose de medicamento`
    );
  }
});

/** Cada arquivo de `document-library/` é um grupo; o grupo decorre do tipo. */
test("o grupo de cada modelo corresponde ao tipo", () => {
  const GROUP_OF = { atestado: "Atestados", encaminhamento: "Encaminhamentos", laudo: "Relatórios", orientacoes: "Orientações" };
  for (const t of DOCUMENT_LIBRARY) {
    assert.equal(t.group, GROUP_OF[t.kind], `${t.name}: grupo ${t.group} para ${t.kind}`);
  }
});
