import { test } from "node:test";
import assert from "node:assert/strict";
import { CONDITION_TERMS, conditionsFor, termsFor } from "./clinical-terms.ts";
import { buildIndex, search } from "./smart-search.ts";
import { EMERGENCY_GUIDE } from "./emergency-guide/index.ts";
import { plantaoSearchDocs } from "./emergency-guide/search-docs.ts";
import { retrieveChunks } from "./emergency-guide/chunks.ts";
import { RX_PROTOCOLS } from "./rx-library/protocols.ts";
import { PRESCRIPTION_DRIVE, driveDocs } from "./prescription-drive/index.ts";
import { guideEntries } from "./clinical-guide.ts";
import { driveSearchDoc, receitaSearchDoc } from "./guide-search.ts";

const titles = () => [
  ...EMERGENCY_GUIDE.flatMap((c) => c.topics.map((t) => t.title)),
  ...RX_PROTOCOLS.map((p) => p.name),
  ...PRESCRIPTION_DRIVE.flatMap((s) => s.entries.map((e) => e.title)),
];

test("todo item das três abas tem outros nomes e sintomas, e toda condição serve a algum item", () => {
  const all = titles();
  assert.equal(all.length, 285);
  for (const title of all) {
    const { names, symptoms } = termsFor(title);
    assert.ok(names.length > 0 && symptoms.length > 0, `${title}: sem vocabulário`);
  }
  const used = new Set(all.flatMap((t) => conditionsFor(t).map((c) => c.match[0])));
  for (const c of CONDITION_TERMS) assert.ok(used.has(c.match[0]), `condição sem item: ${c.match[0]}`);
});

test("termo negado e pedaço de palavra não puxam vocabulário errado", () => {
  assert.ok(!conditionsFor("DM2 descompensado, sem cetoacidose").some((c) => c.match.includes("cetoacidose")));
  assert.ok(!conditionsFor("Úlcera péptica").some((c) => c.names.includes("PEP")), "péptica não é PEP");
  assert.ok(conditionsFor("Crise asmática").some((c) => c.match.includes("asma")), "asma casa com asmática");
});

const top = (docs, query, n = 1) => {
  const index = buildIndex(docs);
  return search(index, query, { limit: n }).hits.map((h) => h.id);
};

test("plantão: nome popular e sintoma vago acham o tópico", () => {
  const docs = plantaoSearchDocs();
  const cases = {
    migranha: "enxaqueca",
    "dor de cabeça latejante com enjoo": "enxaqueca",
    "ardência para urinar": "infeccao-do-trato-urinario",
    "perna vermelha inchada e quente": "celulite-e-erisipela",
    "coração disparado": "taquicardia-supraventricular",
    "coceira que piora à noite": "escabiose",
    "picada de cobra": "acidente-ofidico",
    "fezes pretas": "hemorragia-digestiva-alta",
    cobreiro: "herpes-zoster",
    chumbinho: "organofosforados-e-carbamatos",
    "falta de ar e chiado": "crise-asmatica",
  };
  for (const [query, slug] of Object.entries(cases)) assert.equal(top(docs, query)[0], slug, `"${query}"`);
  assert.ok(top(docs, "boca torta", 2).includes("paralisia-de-bell"));
});

test("receitas e drive: nome popular e sintoma vago acham a condição", () => {
  const receitas = guideEntries().map(receitaSearchDoc);
  for (const [query, name] of Object.entries({
    migranha: "Crise de enxaqueca",
    "ardência para urinar": "Cistite (ITU baixa não complicada)",
    "placas brancas na garganta": "Faringoamigdalite bacteriana",
    "intestino preso": "Constipação intestinal",
    "unha grossa amarelada": "Onicomicose (micose de unha)",
    "coceira no ânus à noite": "Oxiuríase",
    azia: "Dispepsia / refluxo",
  })) {
    assert.equal(top(receitas, query)[0], name, `"${query}"`);
  }
  const drive = driveDocs().map(driveSearchDoc);
  for (const [query, slug] of Object.entries({
    "cheiro de peixe": "vaginose-bacteriana",
    "bicho geográfico": "larva-migrans-cutanea",
    "pano branco": "pitiriase-versicolor",
    "dedão inchado": "gota-crise",
    "jato urinário fraco": "hiperplasia-prostatica-benigna",
    "bebê chorando muito": "colica-e-gases-do-lactente",
  })) {
    assert.equal(top(drive, query)[0], slug, `"${query}"`);
  }
});

test("super inteligência: a busca por palavra acha a condição pela queixa vaga, em qualquer aba", () => {
  // O primeiro trecho pode ser do plantão, da receita pronta ou do Drive — a condição é que importa.
  for (const [query, condition] of Object.entries({
    "dor de cabeça latejante com enjoo e luz incomoda": /enxaqueca/,
    "picada de cobra com sangramento": /acidente-ofidico/,
    migranha: /enxaqueca/,
    "paciente com ardência para urinar e febre": /pielonefrite|cistite|infeccao-do-trato-urinario/,
    "fezes pretas e tontura": /hemorragia-digestiva-alta/,
  })) {
    assert.match(retrieveChunks(query, 1)[0]?.id ?? "", condition, `"${query}"`);
  }
});

test("vocabulário ampliado: toda condição tem dezenas de queixas, curtas e sem repetir", async () => {
  const { default: extra } = await import("./clinical-terms-extra.json", { with: { type: "json" } });
  const { allTermsOf } = await import("./clinical-terms.ts");
  const keys = new Set(CONDITION_TERMS.map((c) => c.match[0]));
  for (const key of Object.keys(extra.conditions)) assert.ok(keys.has(key), `chave sem condição: ${key}`);
  for (const c of CONDITION_TERMS) {
    const all = allTermsOf(c);
    assert.ok(all.symptoms.length >= 30, `${c.match[0]}: só ${all.symptoms.length} queixas`);
    for (const s of all.symptoms) assert.ok(s.split(" ").length <= 12, `${c.match[0]}: queixa longa demais "${s}"`);
  }
});
