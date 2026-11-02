// Baixa as fotos aprovadas do Wikimedia Commons e gera o manifesto.
//
//   node scripts/medication-photos/build.mjs <candidates.json> <review.json>
//
// candidates.json: saída de search.mjs ({ key: { brand, candidates: [...] } }).
// review.json:     { "reject": ["chave", …], "pick": { "chave": índice } } —
//                  a conferência visual de cada foto, feita antes de rodar.
//
// Grava miniaturas 160×160 (webp) em public/medicamentos/fotos/ e o manifesto
// src/lib/medication-photos.json. Só entra licença que permite uso comercial.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const [, , CAND, REVIEW] = process.argv;
const UA = "RenovaApp/1.0 (clinic software; contact crispin.ekkovendas@gmail.com) brand-photo-builder";
const OK_LICENSE = /^(public domain|pd|cc0|cc by(-sa)? [\d.]+( [a-z\-]+)?)$/i;
const candidates = JSON.parse(readFileSync(CAND, "utf8"));
const review = REVIEW ? JSON.parse(readFileSync(REVIEW, "utf8")) : { reject: [], pick: {} };
const reject = new Set(review.reject ?? []);
const OUT_DIR = "public/medicamentos/fotos";
mkdirSync(OUT_DIR, { recursive: true });

const decode = (t) =>
  t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const slug = (k) => k.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const manifest = {};
for (const [key, entry] of Object.entries(candidates).sort(([a], [b]) => a.localeCompare(b))) {
  if (!entry.candidates?.length || reject.has(key)) continue;
  const choice = entry.candidates[review.pick?.[key] ?? 0];
  if (!choice || !OK_LICENSE.test(choice.license)) continue;
  const file = `${OUT_DIR}/${slug(key)}.webp`;
  if (!existsSync(file)) {
    const res = await fetch(choice.thumb, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.error("download failed", key, res.status);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).resize(160, 160, { fit: "cover", position: "attention" }).webp({ quality: 72 }).toFile(file);
    await new Promise((r) => setTimeout(r, 200));
  }
  manifest[key] = {
    brand: entry.brand,
    src: `/medicamentos/fotos/${slug(key)}.webp`,
    author: choice.artist ? decode(choice.artist).replace(/\s+/g, " ").trim().slice(0, 120) : null,
    license: choice.license,
    licenseUrl: choice.licenseUrl,
    page: choice.page,
  };
}
writeFileSync("src/lib/medication-photos.json", JSON.stringify(manifest, null, 1) + "\n");
console.log("photos:", Object.keys(manifest).length);
