import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Página do servidor só pode USAR o que vem de um módulo "use client" como
 * componente (<AskBox />). Ler um valor dele (ASK_EXAMPLES.consultorio) ou
 * chamar uma função dele quebra a página ao abrir — "cannot dot into a
 * client module" —, e nem o tsc nem os outros testes pegam: foi o que tirou o
 * Guia clínico do ar em 02/10. Este teste lê os imports de cada módulo do
 * servidor e procura esse uso.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT = /^\s*(?:(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*)*["']use client["']/;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

function resolveImport(from, spec) {
  const base = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Os nomes que o módulo importa como valor (não `import type`), com o caminho de onde vêm. */
function valueImports(code) {
  const out = [];
  for (const m of code.matchAll(/^import\s+(?!type\s)([\s\S]*?)\s+from\s+["']([^"']+)["'];?/gm)) {
    const [, clause, spec] = m;
    const names = [];
    const named = /\{([\s\S]*)\}/.exec(clause);
    if (named) {
      for (const part of named[1].split(",")) {
        const p = part.trim();
        if (!p || p.startsWith("type ")) continue;
        names.push(p.split(/\s+as\s+/).pop().trim());
      }
    }
    const head = clause.replace(/\{[\s\S]*\}/, "").replace(/,\s*$/, "").trim();
    const ns = /\*\s+as\s+(\w+)/.exec(head);
    if (ns) names.push(ns[1]);
    else if (head && /^\w+$/.test(head)) names.push(head);
    out.push({ spec, names });
  }
  return out;
}

const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/[^\n]*/g, "$1");

test("página do servidor não lê valor nem chama função de módulo \"use client\"", () => {
  const all = files(SRC);
  const isClient = new Map(all.map((f) => [f, CLIENT.test(readFileSync(f, "utf8"))]));
  const problems = [];
  let checked = 0;
  for (const file of all) {
    if (isClient.get(file)) continue;
    const code = readFileSync(file, "utf8");
    const body = stripComments(code.replace(/^import\s[\s\S]*?from\s+["'][^"']+["'];?/gm, ""));
    for (const { spec, names } of valueImports(code)) {
      const target = resolveImport(file, spec);
      if (!target || !isClient.get(target)) continue;
      for (const name of names) {
        checked++;
        const misuse = new RegExp(`(?<![\\w.<])${name}\\s*(\\.(?!\\.)|\\[|\\()`).exec(body);
        if (misuse) problems.push(`${relative(SRC, file)}: "${misuse[0]}" — ${name} vem de ${relative(SRC, target)} ("use client")`);
      }
    }
  }
  assert.ok(checked > 20, `poucos usos conferidos (${checked}): o teste deixou de achar os imports?`);
  assert.deepEqual(problems, []);
});
