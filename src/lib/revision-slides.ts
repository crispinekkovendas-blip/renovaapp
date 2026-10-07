import type { ConciseLine } from "./revision-diff.ts";

/**
 * O carrossel do histórico, embaixo de cada trecho que mudou no guia: primeiro
 * o original (o PDF do guia de plantão, o e-book do Drive, a receita como foi
 * publicada) e depois cada mudança, da mais antiga para a mais nova — só o que
 * mudou, com o porquê a um toque.
 */

/** O texto como estava na fonte. */
export interface OriginalSlide {
  kind: "original";
  /** "Guia de Prescrições da Emergência · p. 178". */
  source: string;
  /** Título do card no original (Drive), quando há. */
  title?: string;
  lines: string[];
  /** Observação curta sobre o original (receita: o que a publicação já tinha mudado). */
  note?: string;
}

/** Uma mudança: o trecho trocado e o porquê. */
export interface ChangeSlide {
  kind: "change";
  rev: number;
  concise: ConciseLine[];
  why?: string;
  /** "note": aviso (o "porquê" é o próprio aviso); "withdrawn": aviso retirado. */
  tone?: "fix" | "note" | "withdrawn";
}

export type RevisionSlide = OriginalSlide | ChangeSlide;

/** Os slides de um trecho e, se ele tem aviso pendente, qual slide é o aviso. */
export interface RevisionHistory {
  slides: RevisionSlide[];
  alert: number | null;
}
