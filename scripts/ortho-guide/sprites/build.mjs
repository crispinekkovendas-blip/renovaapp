// Gera os sprites dos procedimentos do Guia de ortopedia em public/ortho/procedures/
// (um SVG por procedimento, nome <slug>-<k>.svg, k = ordem no tópico) e uma folha
// de contato em scratch para conferir. Uso: node scripts/ortho-guide/sprites/build.mjs [pasta-da-folha]
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const guide = await import(pathToFileURL(resolve(root, "src/lib/ortho-guide/index.ts")).href);
const procs = [];
for (const c of guide.ORTHO_GUIDE) for (const t of c.topics) (t.procedures ?? []).forEach((p, k) => procs.push({ n: procs.length + 1, slug: t.slug, k: k + 1, name: p.name }));

const parts = [];
for (const f of ["part1.mjs", "part2.mjs", "part3.mjs"]) if (existsSync(resolve(here, f))) parts.push(...Object.values(await import(pathToFileURL(resolve(here, f)).href))[0]);
const out = resolve(root, "public/ortho/procedures"); mkdirSync(out, { recursive: true });
const sheet = [];
for (const s of parts) {
  const p = procs.find((q) => q.n === s.n); if (!p) throw new Error(`sprite ${s.n} sem procedimento`);
  const file = `${p.slug}-${p.k}.svg`;
  writeFileSync(resolve(out, file), s.draw(), "utf8");
  sheet.push({ ...p, file });
}
console.log(`${sheet.length} sprites em ${out}`);
const sheetDir = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (sheetDir) {
  const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>body{font-family:Segoe UI,Arial;margin:16px;background:#fff}.c{display:inline-block;width:600px;margin:6px;vertical-align:top}.c img{width:600px;border:1px solid #d9dee8}.c div{font-size:14px;margin:2px 0 8px}</style></head><body>` +
    sheet.map((s) => `<div class="c"><img src="${pathToFileURL(resolve(out, s.file)).href}"><div><b>${s.n}.</b> ${esc(s.name)}</div></div>`).join("") + `</body></html>`;
  writeFileSync(resolve(sheetDir, "sprites.html"), html, "utf8");
}
