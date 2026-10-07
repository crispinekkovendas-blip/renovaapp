// Gera os arquivos que os testes do app Android usam (não vão para o git):
//
// - o pacote do guia, igual ao que /api/app/guia serve (testes de unidade e emulador);
// - as respostas do motor de busca do SITE para ~80 consultas, para o porte em
//   Kotlin provar que acha a mesma coisa, na mesma ordem (SmartSearchGoldenTest).
//
// Uso: node scripts/app/export-fixtures.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { appBundle } from "../../src/lib/app-bundle.ts";
import { bestLine, buildIndex, completeWord, search, tokens } from "../../src/lib/smart-search.ts";
import { searchKey } from "../../src/lib/normalize.ts";
import { cidMatches, orderHits } from "../../src/lib/guide-search.ts";

const { bundle, json } = appBundle();
const TEST_RES = "android/app/src/test/resources";
const ANDROID_ASSETS = "android/app/src/androidTest/assets";
for (const dir of [TEST_RES, ANDROID_ASSETS]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/guia.json`, json);
}

const QUERIES = [
  // Condições, nas três abas
  "enxaqueca", "migranha", "sepse", "choque septico", "dengue", "cistite", "pielonefrite", "pneumonia", "pneumonia criança",
  "otite", "sinusite", "asma", "crise asmatica", "gota", "escabiose", "piolho", "herpes zoster", "sifilis", "pep sexual",
  // Erros de digitação e grafias
  "anafilacia", "sepce", "hipocalemya", "dypirona", "clonasepam", "sepce choqe", "xyzqwk",
  // Siglas, apelidos, nomes comerciais
  "IAM", "AVC", "IOT", "nora", "pressão alta", "dor no peito", "novalgina", "rivotril", "lasix", "intox", "ped",
  // Remédios
  "amoxicilina", "amoxi", "dipirona", "noradrenalina diluição", "fentanil", "cetamina", "adrenalina anafilaxia criança",
  // Sintomas vagos e nomes populares
  "dor de cabeça latejante com enjoo", "ardência para urinar", "febre em criança", "falta de ar e chiado", "fezes pretas",
  "picada de cobra", "chumbinho", "cobreiro", "pano branco", "bicho geografico", "coceira que piora à noite",
  "perna vermelha inchada e quente", "bebê chorando muito", "dedão inchado", "jato urinário fraco", "cheiro de peixe",
  // CID
  "N30", "n30", "J03.9", "G43", "A90", "B86",
  // Digitando (sem espaço no fim) e com espaço no fim
  "se", "anafil", "dor de cab", "convuls", "crise convulsiva ", "hipogl", "potássio", "cetoacidose diabética",
  // Perguntas em texto livre
  "qual a dose de dipirona", "como tratar hipercalemia", "conduta na crise hipertensiva",
];

const index = buildIndex(bundle.search.docs);
const queries = QUERIES.map((q) => {
  const result = search(index, q);
  return {
    q,
    hits: result.hits.slice(0, 12).map((h) => ({ id: h.id, score: h.score, complete: h.complete, terms: [...h.terms].sort() })),
    total: result.hits.length,
    suggestion: result.suggestion,
    complete: completeWord(index, q),
  };
});

// A busca única como a tela usa: CID primeiro, a aba aberta na frente, e o trecho de cada resultado.
const items = new Map(bundle.search.items.map((i) => [i.id, i]));
const data = {
  receitas: bundle.receitas.items.map((r) => ({ name: r.name, cid: r.cid })),
  drive: bundle.drive.sections.flatMap((s) => s.entries).map((e) => ({ slug: e.slug, cid: e.cid })),
};
const unified = [];
for (const tab of [null, "receitas", "plantao", "drive"]) {
  for (const q of ["enxaqueca", "dor de cabeça latejante com enjoo", "N30", "ardência para urinar", "amoxicilina", "dengue"]) {
    const byCid = cidMatches(data, q.trim());
    const seen = new Set(byCid);
    const ordered = [
      ...byCid.map((id) => ({ id, terms: [] })),
      ...orderHits(search(index, q).hits, tab).filter((h) => !seen.has(h.id)),
    ].slice(0, 10);
    unified.push({
      q,
      tab,
      rows: ordered.map((r) => {
        const item = items.get(r.id);
        const marks = [...new Set([...r.terms, ...tokens(q.trim())])];
        const line = marks.length ? bestLine(item.lines, marks) : null;
        return { id: r.id, line: line && line !== item.title ? line : null };
      }),
    });
  }
}

const NORMALIZE = [
  "Crise de enxaqueca", "Dipirona 500 mg · Cloreto de sódio 0,9% nasal", "AÇÃO ÇÃO àéîõü", "x^2 + y`", "mg·kg", "São João d'Ávila",
  "N30.0 / N39.0", "  muitos   espaços  ", "℃ ½ ² Ⅳ", "İstanbul ß", "naïve café", "ÁGUA-viva (picada)", "“aspas” — travessão",
];
const normalize = NORMALIZE.map((s) => ({ in: s, key: searchKey(s), tokens: tokens(s) }));

writeFileSync(`${TEST_RES}/search-golden.json`, JSON.stringify({ version: bundle.version, normalize, queries, unified }, null, 1));
console.log(`pacote ${bundle.version} (${(json.length / 1024).toFixed(0)} KB) · ${queries.length} consultas · ${unified.length} buscas únicas`);
