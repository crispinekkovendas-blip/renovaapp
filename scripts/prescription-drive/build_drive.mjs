// Gera src/lib/prescription-drive/data.ts a partir de drive-revisado.md.
// Uso: node scripts/prescription-drive/build_drive.mjs
//
// O .md é a fonte da revisão (texto nosso): para mudar o conteúdo, edite o .md
// e gere de novo. Não edite o data.ts à mão.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(here, "drive-revisado.md"), "utf8").replace(/\r\n/g, "\n");
const out = join(here, "../../src/lib/prescription-drive/data.ts");

const STATUS = { "✅": "mantido", "✏️": "ajustado", "⛔": "refeito" };
const problems = [];

function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Tabela markdown → linhas (sem a linha de separação). */
function table(lines) {
  return lines
    .filter((l) => !/^\|[\s|:-]+\|$/.test(l))
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
}

/** O corpo de uma entrada em blocos, na ordem. */
function blocks(lines, entry) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      out.push({ k: "rx", t: body.join("\n") });
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      out.push({ k: "table", rows: table(rows) });
      continue;
    }
    if (/^(- |\d+\. )/.test(line)) {
      const items = [];
      const ordered = /^\d+\. /.test(line);
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) {
        let item = lines[i++].replace(/^(- |\d+\. )/, "");
        // Continuação indentada do item (ex.: um bloco ``` dentro da lista).
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !lines[i].trim().startsWith("```")) item += " " + lines[i++].trim();
        items.push(item);
      }
      out.push({ k: ordered ? "ol" : "ul", items });
      continue;
    }
    let text = line;
    i++;
    while (i < lines.length && lines[i].trim() && !/^(```|\||- |\d+\. |\*\*|⚠️)/.test(lines[i])) text += " " + lines[i++];
    let m;
    if ((m = /^\*Substitui: (.+)\*$/.exec(text))) entry.replaces = m[1];
    else if ((m = /^\*\*O que mudou:\*\* (.+)$/.exec(text))) entry.changed = m[1];
    else if ((m = /^\*\*Fonte:\*\* (.+)$/.exec(text))) entry.source = m[1];
    else if ((m = /^\*\*Revisão (\d+):\*\* (.+)$/.exec(text))) {
      // "**Revisão 3:** motivo. Antes: «…» → Agora: «…»"
      const ba = /^(.*?)\s*Antes: «(.+?)» → Agora: «(.+?)»\s*$/.exec(m[2]);
      entry.revisions.push(
        ba
          ? { rev: Number(m[1]), text: ba[1], before: ba[2], after: ba[3] }
          : { rev: Number(m[1]), text: m[2], before: null, after: null }
      );
    }
    else if (text.startsWith("⚠️")) out.push({ k: "warn", t: text.replace(/^⚠️\s*/, "") });
    else out.push({ k: "p", t: text });
  }
  return out;
}

const sections = [];
let section = null;
let current = null;
let body = [];
const intro = { patterns: [], sources: [] };
let mode = "intro";

function flush() {
  if (!current) return;
  current.blocks = blocks(body, current);
  if (!current.changed) problems.push(`sem "O que mudou": ${current.title}`);
  if (!current.blocks.some((b) => b.k === "rx" || b.k === "p" || b.k === "ul" || b.k === "ol")) problems.push(`sem conteúdo: ${current.title}`);
  section.entries.push(current);
  current = null;
  body = [];
}

const lines = md.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let m;
  if ((m = /^## (\d+)\. (.+)$/.exec(line))) {
    flush();
    section = { title: m[2], entries: [] };
    sections.push(section);
    mode = "entries";
    continue;
  }
  if (/^## Fontes principais/.test(line)) {
    flush();
    mode = "sources";
    continue;
  }
  if (/^## /.test(line)) {
    mode = line.includes("Resumo") ? "resumo" : "intro";
    continue;
  }
  if (mode === "entries" && (m = /^### (.+?)(?: \(([^)]+)\))? — (✅|✏️|⛔) \S+$/.exec(line))) {
    flush();
    current = { slug: slug(m[1]), title: m[1], cid: m[2] ?? null, status: STATUS[m[3]], replaces: null, changed: null, source: null, revisions: [] };
    continue;
  }
  if (mode === "entries" && line.startsWith("### ")) problems.push(`título não reconhecido: ${line}`);
  if (mode === "entries" && line === "---") continue;
  if (mode === "entries" && current) body.push(line);
  if (mode === "resumo" && (m = /^\d+\. (.+)$/.exec(line))) intro.patterns.push(m[1]);
  if (mode === "sources" && (m = /^- (.+)$/.exec(line))) intro.sources.push(m[1]);
}
flush();

const slugs = sections.flatMap((s) => s.entries.map((e) => e.slug));
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dup.length) problems.push(`slug repetido: ${dup.join(", ")}`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const J = (v) => JSON.stringify(v);
let ts = `// Gerado por scripts/prescription-drive/build_drive.mjs a partir de drive-revisado.md.
// Não editar à mão: edite o .md e gere de novo.
import type { DriveSection } from "./types.ts";

export const DRIVE_PATTERNS: readonly string[] = ${J(intro.patterns)};

export const DRIVE_SOURCES: readonly string[] = ${J(intro.sources)};

export const PRESCRIPTION_DRIVE: readonly DriveSection[] = [
`;
for (const s of sections) {
  ts += ` {"title":${J(s.title)},"entries":[\n`;
  for (const e of s.entries) {
    const { blocks: bl, ...head } = e;
    ts += `  {${J(head).slice(1, -1)},"blocks":[\n`;
    for (const b of bl) ts += `   ${J(b)},\n`;
    ts += `  ]},\n`;
  }
  ts += ` ]},\n`;
}
ts += `];\n`;
writeFileSync(out, ts);

const all = sections.flatMap((s) => s.entries);
const count = (st) => all.filter((e) => e.status === st).length;
console.log(
  `${sections.length} seções, ${all.length} entradas (✅ ${count("mantido")} · ✏️ ${count("ajustado")} · ⛔ ${count("refeito")}), ${intro.patterns.length} problemas recorrentes, ${intro.sources.length} grupos de fontes`
);
