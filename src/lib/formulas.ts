/**
 * Fórmulas manipuladas e a receita bilíngue (para comprar fora do país).
 *
 * Uma fórmula é um item do receituário como os outros — nome, quantidade,
 * posologia, tarja — mais a composição, que sai na folha no formato que a
 * farmácia de manipulação espera:
 *
 *   1) Minoxidil oral ........................... 30 cápsulas
 *      Minoxidil ................................... 2,5 mg
 *      Excipiente q.s.p. ........................ 1 cápsula
 *      Manipular 30 cápsulas.
 *      Tomar 1 cápsula ao dia. Via oral.
 *
 * As fórmulas prontas (biblioteca) ficam no conteúdo privado; aqui só a forma.
 */

export interface FormulaComponent {
  name: string;
  /** "2,5 mg", "50.000 UI", "10%". */
  dose: string;
}

export interface Formula {
  components: FormulaComponent[];
  /** "Excipiente q.s.p. 1 cápsula", "Creme base q.s.p. 60 g". */
  base: string;
  /** "Manipular 30 cápsulas". */
  amount: string;
}

export const MAX_COMPONENTS = 15;

/** Bases mais usadas, para escolher sem digitar. */
export const FORMULA_BASES = [
  "Excipiente q.s.p. 1 cápsula",
  "Excipiente q.s.p. 1 sachê",
  "Veículo q.s.p. 1 mL",
  "Xarope q.s.p. 100 mL",
  "Creme base q.s.p. 30 g",
  "Creme base q.s.p. 60 g",
  "Gel base q.s.p. 30 g",
  "Loção capilar q.s.p. 60 mL",
  "Shampoo base q.s.p. 120 mL",
  "Base para óvulo q.s.p. 1 óvulo",
] as const;

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Qualquer coisa → fórmula válida, ou null quando não há componente nenhum. */
export function cleanFormula(raw: unknown): Formula | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const components = (Array.isArray(r.components) ? r.components : [])
    .slice(0, MAX_COMPONENTS)
    .map((c) => ({ name: clip((c as FormulaComponent)?.name, 120), dose: clip((c as FormulaComponent)?.dose, 40) }))
    .filter((c) => c.name);
  if (!components.length) return null;
  return { components, base: clip(r.base, 80), amount: clip(r.amount, 80) };
}

/** As linhas da composição, como saem na folha. */
export function formulaLines(formula: Formula | null | undefined): string[] {
  if (!formula) return [];
  const lines = formula.components.map((c) => (c.dose ? `${c.name} — ${c.dose}` : c.name));
  if (formula.base) lines.push(formula.base);
  if (formula.amount) lines.push(/[.!]$/.test(formula.amount) ? formula.amount : `${formula.amount}.`);
  return lines;
}

/** Nomes dos componentes, para o aviso de alergia. */
export function formulaSubstances(formula: Formula | null | undefined): string[] {
  return formula?.components.map((c) => c.name) ?? [];
}

/* ---------- Receita bilíngue (português / espanhol) ---------- */

export const BILINGUAL = {
  titleSuffix: "Receta médica",
  labels: { Paciente: "Paciente", CPF: "CPF / Documento", Data: "Data / Fecha", Documento: "Documento" },
  declaration: [
    "Medicamento para uso pessoal do paciente acima, na quantidade necessária ao tratamento prescrito.",
    "Medicamento para uso personal del paciente arriba indicado, en la cantidad necesaria para el tratamiento prescrito.",
  ],
} as const;

/**
 * Português → espanhol das frases de posologia, por dicionário fixo (sem IA):
 * o que se escreve todo dia na receita. Palavra que não está aqui fica como
 * veio — o espanhol lê bem o português nesse vocabulário.
 */
const ES: readonly [RegExp, string][] = [
  [/\bde (\d+) em \1 horas\b/gi, "cada $1 horas"],
  [/\bpor (\d+) dias\b/gi, "durante $1 días"],
  [/\bpor (\d+) dia\b/gi, "durante $1 día"],
  [/\bpor (\d+) semanas\b/gi, "durante $1 semanas"],
  [/\bpor (\d+) meses\b/gi, "durante $1 meses"],
  [/\bpor até (\d+) dias\b/gi, "hasta $1 días"],
  [/\b(\d+) vezes ao dia\b/gi, "$1 veces al día"],
  [/\b1 vez ao dia\b/gi, "1 vez al día"],
  [/\b(\d+) vezes por semana\b/gi, "$1 veces por semana"],
  [/\b1 vez por semana\b/gi, "1 vez por semana"],
  [/\bao dia\b/gi, "al día"],
  [/\bpela manhã/gi, "por la mañana"],
  [/à noite\b/gi, "por la noche"],
  [/\bao deitar\b/gi, "al acostarse"],
  [/\bem jejum\b/gi, "en ayunas"],
  [/\bantes do café da manhã\b/gi, "antes del desayuno"],
  [/\bapós as refeições\b/gi, "después de las comidas"],
  [/\bjunto com a refeição\b/gi, "junto con la comida"],
  [/\bsempre no mesmo dia\b/gi, "siempre el mismo día"],
  [/\bvia subcutânea/gi, "vía subcutánea"],
  [/\bvia intramuscular\b/gi, "vía intramuscular"],
  [/\bvia retal\b/gi, "vía rectal"],
  [/\bvia vaginal\b/gi, "vía vaginal"],
  [/\bvia oral\b/gi, "vía oral"],
  [/\buso contínuo\b/gi, "uso continuo"],
  [/\bdose única\b/gi, "dosis única"],
  [/\bse dor\b/gi, "si dolor"],
  [/\bse febre\b/gi, "si fiebre"],
  [/\bse náusea\b/gi, "si náuseas"],
  [/\bna região afetada\b/gi, "en la zona afectada"],
  [/\bfina camada\b/gi, "capa fina"],
  [/\bno abdome, coxa ou braço\b/gi, "en el abdomen, muslo o brazo"],
  [/\balternando o local\b/gi, "alternando el sitio"],
  [/\bManter na geladeira\b/gi, "Mantener en la heladera"],
  [/\bsem congelar\b/gi, "sin congelar"],
  [/\bTomar\b/g, "Tomar"],
  [/\bAplicar\b/g, "Aplicar"],
  [/\bInstilar\b/g, "Instilar"],
  [/\bInalar\b/g, "Inhalar"],
  [/\bcomprimidos\b/gi, "comprimidos"],
  [/\bcápsulas\b/gi, "cápsulas"],
  [/\bcápsula\b/gi, "cápsula"],
  [/\bsachês\b/gi, "sobres"],
  [/\bsachê/gi, "sobre"],
  [/\bgotas\b/gi, "gotas"],
  [/\bcanetas\b/gi, "plumas"],
  [/\bcaneta\b/gi, "pluma"],
  [/\bcaixas\b/gi, "cajas"],
  [/\bcaixa\b/gi, "caja"],
  [/\bfrascos\b/gi, "frascos"],
  [/\bbisnaga\b/gi, "pomo"],
  [/\bManipular\b/g, "Preparar"],
  [/\bExcipiente q\.s\.p\./g, "Excipiente c.s.p."],
  [/\bq\.s\.p\./g, "c.s.p."],
  [/\be\b/g, "y"],
];

export function toSpanish(text: string): string {
  // Começo de frase continua com maiúscula ("Uso contínuo." → "Uso continuo.").
  return ES.reduce(
    (acc, [pattern, replacement]) =>
      acc.replace(pattern, (match: string, ...groups: unknown[]) => {
        const out = replacement.replace(/\$(\d)/g, (_, n: string) => String(groups[Number(n) - 1]));
        return /^[A-ZÀ-Ú]/.test(match) ? out[0].toUpperCase() + out.slice(1) : out;
      }),
    text,
  );
}
