// Gera src/app/theme-dark.css: o tema escuro do Renova ("Tevet & Iyar").
//
//   node scripts/theme/build-dark.mjs
//
// As utilities do Tailwind v4 leem variáveis (`bg-rose-50` = var(--color-rose-50)),
// então o escuro é só redefinir os tokens em html[data-theme="dark"]. As escalas
// padrão do Tailwind são espelhadas (50↔950, 100↔900, …): fundo claro de alerta
// vira fundo escuro, texto escuro vira claro, sem mexer em componente nenhum.
// As escalas da marca (pine, clay, peach, sun) têm valores escuros escolhidos à mão.
//
// `.theme-light` devolve os valores claros: a folha A4 (prévia do documento) é
// papel e continua branca no tema escuro.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const themeCss = readFileSync(join(ROOT, "node_modules/tailwindcss/theme.css"), "utf8");

const PALETTES = [
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green",
  "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
];
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const MIRROR = Object.fromEntries(STEPS.map((s, i) => [s, STEPS[STEPS.length - 1 - i]]));

function tailwindColor(name, step) {
  const m = themeCss.match(new RegExp(`--color-${name}-${step}:\\s*([^;]+);`));
  if (!m) throw new Error(`sem --color-${name}-${step} no theme.css do Tailwind`);
  return m[1].trim();
}

// Marca: claro (o mesmo do @theme em globals.css) e escuro, à mão.
const BRAND = {
  light: {
    paper: "#f5f6f8", ink: "#1a2230", white: "#ffffff", line: "#dfe4ec", muted: "#5a6575",
    pine: ["#f3f6fa", "#e3eaf3", "#c7d4e6", "#9fb5d1", "#6f8db4", "#4a6b94", "#36557a", "#2c4a6e", "#233b58", "#1a2230", "#121a26"],
    clay: ["#f6f7ec", "#ebeed3", "#d8dea8", "#bec777", "#a3ad4f", "#858f37", "#6f7a3a", "#565f2c", "#454c25", "#383e21"],
    peach: ["#f4f6f9", "#e6ebf2", "#d3dbe6", "#b9c5d5"],
    sun: ["#e9d9b8", "#d9bf8a", "#b8955a"],
  },
  dark: {
    paper: "#0f141b", ink: "#e6eaf0", white: "#18202a", line: "#2a3546", muted: "#96a2b3",
    pine: ["#162030", "#1c283a", "#27364d", "#3a4f6d", "#56739a", "#7894bb", "#8fb1d9", "#a9c4e4", "#c4d6ee", "#dde6f2", "#eef3fa"],
    clay: ["#1d2014", "#262b18", "#363d1f", "#4c5529", "#6b7738", "#8f9b4f", "#b5c06f", "#c8d18c", "#dbe1ad", "#ebefcf"],
    peach: ["#141b25", "#1a2433", "#223047", "#2c3d58"],
    sun: ["#5c4a2a", "#8a6f3f", "#c9a56d"],
  },
};
const PINE_STEPS = STEPS;
const CLAY_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const PEACH_STEPS = [50, 100, 200, 300];
const SUN_STEPS = [300, 400, 500];

function brandVars(b) {
  return [
    `--color-paper: ${b.paper};`,
    `--color-ink: ${b.ink};`,
    `--color-white: ${b.white};`,
    `--color-line: ${b.line};`,
    `--color-muted: ${b.muted};`,
    ...PINE_STEPS.map((s, i) => `--color-pine-${s}: ${b.pine[i]};`),
    ...CLAY_STEPS.map((s, i) => `--color-clay-${s}: ${b.clay[i]};`),
    ...PEACH_STEPS.map((s, i) => `--color-peach-${s}: ${b.peach[i]};`),
    ...SUN_STEPS.map((s, i) => `--color-sun-${s}: ${b.sun[i]};`),
  ];
}

const darkDefaults = PALETTES.flatMap((p) => STEPS.map((s) => `--color-${p}-${s}: ${tailwindColor(p, MIRROR[s])};`));
const lightDefaults = PALETTES.flatMap((p) => STEPS.map((s) => `--color-${p}-${s}: ${tailwindColor(p, s)};`));
const indent = (lines) => lines.map((l) => `  ${l}`).join("\n");

const css = `/* GERADO por scripts/theme/build-dark.mjs — não editar à mão. */

/* Tema escuro: ligado pelo botão (html[data-theme="dark"]), nunca sozinho. */
html[data-theme="dark"] {
  color-scheme: dark;
${indent(brandVars(BRAND.dark))}
${indent(darkDefaults)}
}

/* As faixas escuras (cabeçalho do portal, rodapé, seções "tinta") continuam escuras. */
html[data-theme="dark"] .section-ink {
  background-color: #0a0f16;
  color: #e6eaf0;
  box-shadow: inset 0 1px 0 #2a3546, inset 0 -1px 0 #2a3546;
}

/* Papel continua papel: a folha A4 e o que imita impresso ficam claros. */
html[data-theme="dark"] .theme-light,
html[data-theme="dark"] .theme-paper,
html[data-theme="dark"] .print-area {
  color-scheme: light;
${indent(brandVars(BRAND.light))}
${indent(lightDefaults)}
  color: var(--color-ink);
}
`;
writeFileSync(join(ROOT, "src/app/theme-dark.css"), css);
console.log(`theme-dark.css: ${PALETTES.length} escalas espelhadas + marca`);
