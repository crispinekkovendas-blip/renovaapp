/**
 * Um trecho do guia, na ordem da página:
 *
 * - `sub`: subtítulo de situação ("Estável hemodinamicamente:");
 * - `route`: via ("Uso intravenoso:");
 * - `drug`: medicamento/apresentação em destaque; `drugnote`: nota em vermelho;
 * - `text` / `strong`: corpo e corpo em negrito;
 * - `ped`: dose pediátrica; `tip`: "Bizu" (dica);
 * - `plus`: associação ("+") entre dois itens; `grid`: tabela.
 */
export type GuideBlockKind =
  | "sub"
  | "route"
  | "drug"
  | "drugnote"
  | "text"
  | "strong"
  | "ped"
  | "tip"
  | "plus"
  | "grid"
  | "table";

export interface GuideBlock {
  k: GuideBlockKind;
  t: string;
  rows?: string[][];
  /**
   * Correção da revisão Renova: o texto de antes e o motivo. `rev` é o número
   * da revisão (guide-revisions.ts); sem ele, é da publicação (1).
   */
  fix?: GuideFix;
  /** Correções anteriores do mesmo trecho, da mais antiga para a mais nova. */
  earlier?: GuideFix[];
  /** Aviso da revisão Renova, sem mexer no texto do guia. */
  note?: string;
  /** Revisão do aviso; sem ela, é da publicação (1). */
  noteRev?: number;
  /** Avisos anteriores do trecho — trocados por outro ou retirados (com o motivo). */
  notesEarlier?: { note: string; rev: number; withdrawn?: string; withdrawnRev?: number; replaced?: boolean }[];
}

export interface GuideFix {
  orig: string;
  why: string;
  rev?: number;
}

export interface GuideTopic {
  slug: string;
  title: string;
  /** Página no PDF original. */
  page: number;
  blocks: GuideBlock[];
  fix?: { orig: string; why: string };
}

export interface GuideChapter {
  title: string;
  topics: GuideTopic[];
}
