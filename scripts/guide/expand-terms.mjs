// Amplia o vocabulário do Guia clínico: para cada condição de
// src/lib/clinical-terms.ts, o Gemini escreve mais nomes e, sobretudo, as
// queixas como o paciente conta (coloquial, regional, cuidador de criança,
// idoso), com localização, irradiação, caráter, gatilhos e sinais associados.
// Grava src/lib/clinical-terms-extra.json (só para ACHAR — nada disso aparece
// como texto do guia). Retoma de onde parou: condições já geradas ficam.
//
// Uso: node scripts/guide/expand-terms.mjs [--only=asma,enxaqueca] [--redo]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
if (!process.env.GEMINI_API_KEY && existsSync(join(ROOT, ".env.local"))) {
  const m = readFileSync(join(ROOT, ".env.local"), "utf8").match(/^GEMINI_API_KEY=(.*)$/m);
  if (m) process.env.GEMINI_API_KEY = m[1].trim().replace(/^"|"$/g, "");
}
if (!process.env.GEMINI_API_KEY) {
  console.error("Defina GEMINI_API_KEY (no ambiente ou no .env.local).");
  process.exit(1);
}
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { CONDITION_TERMS, conditionsFor } = await imp("src/lib/clinical-terms.ts");
const { EMERGENCY_GUIDE } = await imp("src/lib/emergency-guide/index.ts");
const { RX_PROTOCOLS } = await imp("src/lib/rx-library/protocols.ts");
const { PRESCRIPTION_DRIVE } = await imp("src/lib/prescription-drive/index.ts");
const { streamGenerate } = await imp("src/lib/gemini.ts");

const OUT = join(ROOT, "src/lib/clinical-terms-extra.json");
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const redo = args.includes("--redo");
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { conditions: {} };
const done = redo ? {} : previous.conditions;

// Os títulos de cada condição nas três abas: o contexto que o modelo recebe.
const titles = [
  ...EMERGENCY_GUIDE.flatMap((c) => c.topics.map((t) => `Plantão: ${t.title}`)),
  ...RX_PROTOCOLS.map((p) => `Receita pronta: ${p.name}`),
  ...PRESCRIPTION_DRIVE.flatMap((s) => s.entries.map((e) => `Drive: ${e.title}`)),
];
const itemsOf = (c) => titles.filter((t) => conditionsFor(t.split(": ")[1]).includes(c));

const SYSTEM = `Você ajuda a construir o vocabulário de busca de um guia clínico brasileiro usado por médicos em consultório e pronto-socorro.
O médico vai ouvir o paciente (ou o acompanhante) descrever o que sente — às vezes por reconhecimento de voz — e o app precisa achar a condição certa a partir dessas palavras.
Para cada condição pedida, escreva:
- "names": outros nomes que médicos e pacientes usam (sinônimos, nomes populares e regionais, grafias erradas comuns, siglas). Até 20.
- "symptoms": de 60 a 120 frases curtas (2 a 9 palavras) de queixas e achados TÍPICOS dessa condição, a maioria do jeito que o paciente fala no Brasil: linguagem coloquial e regional ("pontada", "agonia", "gastura", "zonzeira", "dor nas cadeiras", "xixi ardendo"), falas de mãe/cuidador de criança e de idoso, e também como o médico anota (termos técnicos, sinais de exame). Cubra: localização, irradiação, caráter da dor, início e duração, o que piora e o que melhora, horário, sintomas associados, sinais de gravidade que o paciente relata, e achados objetivos.
Regras: só o que é característico da condição (nada genérico sozinho como "dor", "febre", "mal-estar" — junte ao contexto: "febre alta com calafrio"); sem nome de remédio; sem nome da própria condição dentro de "symptoms"; sem números de dose; português do Brasil; não repita frases nem varie só plural/gênero.
Responda SÓ com JSON: {"<id>": {"names": [...], "symptoms": [...]}, ...} usando exatamente os ids dados.`;

async function generate(batch) {
  const prompt = batch
    .map((c) => {
      const id = c.match[0];
      return `id: ${id}
itens do guia: ${itemsOf(c).slice(0, 8).join("; ") || "(nenhum)"}
nomes que já temos: ${c.names.join(", ")}
sintomas que já temos: ${c.symptoms.join(", ")}`;
    })
    .join("\n\n");
  let text = "";
  for await (const chunk of streamGenerate({
    system: SYSTEM,
    contents: [{ role: "user", parts: [{ text: `Condições:\n\n${prompt}` }] }],
    maxOutputTokens: 24000,
  })) {
    if (chunk.blocked) throw new Error("bloqueado");
    for (const p of chunk.parts) if (p.text && !p.thought) text += p.text;
  }
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

const clean = (list, max) =>
  [...new Set((Array.isArray(list) ? list : []).map((s) => String(s).trim().replace(/\s+/g, " ").replace(/[.;]$/, "")))]
    .filter((s) => s.length >= 3 && s.length <= 80 && s.split(" ").length <= 10 && !/\d+\s?(mg|ml|g)\b/i.test(s))
    .slice(0, max);

const todo = CONDITION_TERMS.filter((c) => (only ? only.includes(c.match[0]) : !done[c.match[0]]));
console.log(`${todo.length} condições a gerar (${Object.keys(done).length} já prontas)`);
const BATCH = 4;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await generate(batch);
      for (const c of batch) {
        const r = result[c.match[0]];
        if (!r) throw new Error(`faltou ${c.match[0]}`);
        // Gerar de novo soma ao que já havia (não perde frase boa da rodada anterior).
        const before = done[c.match[0]] ?? { names: [], symptoms: [] };
        done[c.match[0]] = {
          names: clean([...before.names, ...(r.names ?? [])], 30),
          symptoms: clean([...before.symptoms, ...(r.symptoms ?? [])], 160),
        };
      }
      break;
    } catch (error) {
      console.warn(`lote ${i / BATCH + 1}, tentativa ${attempt}: ${error.message}`);
      if (attempt === 3) throw error;
    }
  }
  writeFileSync(OUT, JSON.stringify({ note: "Gerado por scripts/guide/expand-terms.mjs (Gemini). Só para a busca; revisar.", conditions: done }, null, 1) + "\n");
  const counts = batch.map((c) => `${c.match[0]} ${done[c.match[0]].symptoms.length}`).join(" · ");
  console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length} — ${counts}`);
}
const all = Object.values(done);
console.log(`pronto: ${all.length} condições · ${all.reduce((n, c) => n + c.symptoms.length, 0)} queixas · ${all.reduce((n, c) => n + c.names.length, 0)} nomes`);
