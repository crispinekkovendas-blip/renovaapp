import type { ComposerTab } from "./composer-editor.ts";

/**
 * Os cartões do compositor: o que cada tipo é, numa linha, e quais modelos o
 * médico mais usa (a aba "Mais usados" dos modelos).
 */

/** Uma linha por tipo, para quem ainda não sabe qual escolher. */
export const TAB_BLURB: Record<ComposerTab, string> = {
  receita: "Assinada na Memed; o paciente recebe por link",
  atestado: "Médico, comparecimento ou acompanhante",
  encaminhamento: "Para especialista, com história e conduta",
  laudo: "Para empresa, perícia, escola ou INSS",
  orientacoes: "Cuidados, dieta e sinais de alerta",
  receituario: "Impressa: simples ou controle especial",
};

/** Uma fileira de modelos: o que a aba "Mais usados" mostra. */
export const MOST_USED_LIMIT = 6;

/** Os meus primeiro, depois os da clínica, depois os de outros profissionais. */
const SCOPE_RANK = { meu: 0, clinica: 1, outro: 2 } as const;

/**
 * Os modelos mais usados nos documentos emitidos primeiro. Empate (e quem
 * ainda não emitiu nada): os meus, os da clínica, e a ordem de sempre.
 */
export function mostUsedTemplates<T extends { id: number; scope: keyof typeof SCOPE_RANK }>(
  templates: readonly T[],
  usage: Readonly<Record<number, number>>,
  limit = MOST_USED_LIMIT
): T[] {
  const count = (t: T) => usage[t.id] ?? 0;
  return templates
    .map((template, order) => ({ template, order }))
    .sort(
      (a, b) =>
        count(b.template) - count(a.template) ||
        SCOPE_RANK[a.template.scope] - SCOPE_RANK[b.template.scope] ||
        a.order - b.order
    )
    .slice(0, limit)
    .map(({ template }) => template);
}

/** Quantas vezes cada modelo aparece nos documentos (o `template_id` de cada um). */
export function countTemplateUses(templateIds: readonly (number | null | undefined)[]): Record<number, number> {
  const usage: Record<number, number> = {};
  for (const id of templateIds) if (id) usage[id] = (usage[id] ?? 0) + 1;
  return usage;
}

/** Prefixos que só repetem o tipo aberto ("Encaminhamento — fisioterapia"). */
const KIND_PREFIXES = ["atestado", "atestado médico", "declaração", "encaminhamento", "laudo", "relatório", "orientações", "receituário"];

/**
 * O nome curto do modelo no quadradinho: sem o tipo na frente, que o cartão
 * de cima já diz. "Encaminhamento — fisioterapia" → "Fisioterapia". Outros
 * prefixos ("Contrarreferência — …") ficam: dizem algo.
 */
export function shortTemplateName(name: string): string {
  const match = /^(.+?)\s+[—–-]\s+(.+)$/.exec(name.trim());
  if (!match || !KIND_PREFIXES.includes(match[1].toLocaleLowerCase("pt-BR"))) return name.trim();
  const rest = match[2];
  return rest.charAt(0).toLocaleUpperCase("pt-BR") + rest.slice(1);
}
