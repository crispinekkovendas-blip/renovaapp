// Fotografa as receitas prontas como estavam ao fim de cada revisão e grava
// src/lib/rx-library/history.json. O Guia clínico usa isso para mostrar
// "como era antes" ao lado de cada mudança, sem depender de texto escrito à mão.
//
//   node scripts/rx-history/snapshot.mjs
//
// Cada revisão aponta para o commit em que ela terminou. A revisão em curso
// não entra: o "depois" dela é a receita atual.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "src/lib/rx-library/history.json");

/** Revisão → commit em que ela terminou. */
const REVISIONS = { 1: "fcab29c", 2: "f51a067", 3: "9087dbb" };
const FILES = ["types.ts", "doses.ts", "protocols.ts"];

const history = {};
for (const [rev, commit] of Object.entries(REVISIONS)) {
  const dir = join(ROOT, "scripts/rx-history/.tmp", rev);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const f of FILES) {
    const src = execFileSync("git", ["show", `${commit}:src/lib/rx-library/${f}`], { cwd: ROOT, encoding: "utf8" });
    writeFileSync(join(dir, f), src);
  }
  const { DOSES } = await import(pathToFileURL(join(dir, "doses.ts")).href);
  const { RX_PROTOCOLS } = await import(pathToFileURL(join(dir, "protocols.ts")).href);
  const byName = new Map(DOSES.map((d) => [d.name, d]));
  history[rev] = Object.fromEntries(
    RX_PROTOCOLS.map((p) => [
      p.name,
      p.items.map(({ dose, option = 0 }) => {
        const o = byName.get(dose)?.options[option];
        return o ? `${dose} · ${o.quantity} — ${o.posology}` : dose;
      }),
    ])
  );
}
rmSync(join(ROOT, "scripts/rx-history/.tmp"), { recursive: true, force: true });
writeFileSync(OUT, JSON.stringify(history, null, 1) + "\n");
console.log(Object.entries(history).map(([r, h]) => `revisão ${r}: ${Object.keys(h).length} receitas`).join(" · "));
