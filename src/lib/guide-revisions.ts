/**
 * As revisões do Guia clínico, numa lista só para as três abas (Receitas
 * prontas, Plantão e Drive). Toda mudança de conteúdo leva o número da
 * revisão em que entrou; a tela mostra o que era antes, o que ficou e o
 * motivo, para o médico conferir e decidir. A última revisão aparece em
 * destaque; as anteriores continuam visíveis.
 *
 * Para uma revisão nova: acrescente aqui, marque as mudanças com o número
 * dela (rx-library/review.ts, errata_revisaoN.py, "**Revisão N:**" no .md
 * do Drive) e escreva a entrada em Ajuda › Novidades.
 */

export interface GuideRevision {
  n: number;
  date: string;
  label: string;
}

export const GUIDE_REVISIONS: readonly GuideRevision[] = [
  { n: 1, date: "30/09/2026", label: "Publicação" },
  { n: 2, date: "01/10/2026", label: "2ª revisão" },
  { n: 3, date: "01/10/2026", label: "3ª revisão" },
  { n: 4, date: "01/10/2026", label: "4ª revisão" },
];

export const CURRENT_REVISION = GUIDE_REVISIONS[GUIDE_REVISIONS.length - 1].n;

export function revision(n: number): GuideRevision {
  return GUIDE_REVISIONS.find((r) => r.n === n) ?? GUIDE_REVISIONS[0];
}

/** "3ª revisão (01/10)". */
export function revisionLabel(n: number): string {
  const r = revision(n);
  return `${r.label} (${r.date.slice(0, 5)})`;
}
