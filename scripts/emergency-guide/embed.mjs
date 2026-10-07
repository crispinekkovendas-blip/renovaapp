// Converte os trechos do guia de plantão em vetores (embeddings do Gemini)
// e grava src/lib/emergency-guide/vectors.json.
//
//   node scripts/emergency-guide/embed.mjs
//
// A chave vem de GEMINI_API_KEY (ambiente) ou do .env.local. Só os trechos
// novos ou alterados são enviados; os outros reaproveitam o vetor gravado.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
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

const { guideChunks } = await import(pathToFileURL(join(ROOT, "src/lib/emergency-guide/chunks.ts")).href);
const { chunkEmbedText, textHash, quantize } = await import(pathToFileURL(join(ROOT, "src/lib/emergency-guide/vectors.ts")).href);
const { embedTexts, GEMINI_EMBED_MODEL, EMBED_DIM } = await import(pathToFileURL(join(ROOT, "src/lib/gemini.ts")).href);

const OUT = join(ROOT, "src/lib/emergency-guide/vectors.json");
const previous = JSON.parse(readFileSync(OUT, "utf8"));
const reuse =
  previous.model === GEMINI_EMBED_MODEL && previous.dim === EMBED_DIM ? new Map(previous.items.map((it) => [it.id, it])) : new Map();

const chunks = guideChunks();
const items = [];
const todo = [];
for (const c of chunks) {
  const text = chunkEmbedText(c);
  const hash = textHash(text);
  const old = reuse.get(c.id);
  if (old && old.hash === hash) items.push(old);
  else todo.push({ c, text, hash });
}
console.log(`${chunks.length} trechos; ${todo.length} para calcular com ${GEMINI_EMBED_MODEL} (${EMBED_DIM} dimensões).`);

if (todo.length) {
  const vectors = await embedTexts(
    todo.map((t) => t.text),
    { batch: 20, patient: true, onProgress: (n) => console.log(`  ${n}/${todo.length}`) }
  );
  todo.forEach((t, i) => items.push({ id: t.c.id, hash: t.hash, v: quantize(vectors[i]) }));
}
const order = new Map(chunks.map((c, i) => [c.id, i]));
items.sort((a, b) => order.get(a.id) - order.get(b.id));

const lines = items.map((it) => "  " + JSON.stringify(it));
writeFileSync(
  OUT,
  `{"model":${JSON.stringify(GEMINI_EMBED_MODEL)},"dim":${EMBED_DIM},"items":[\n${lines.join(",\n")}\n]}\n`
);
console.log(`Gravado ${OUT} (${items.length} vetores).`);
