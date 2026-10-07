/**
 * Um trecho de uma entrada do Drive revisado, na ordem do texto:
 *
 * - `rx`: a receita pronta para copiar (via, itens com quantidade e posologia);
 * - `p`: parágrafo (pode começar com um rótulo em **negrito**, ex.: "Criança:");
 * - `warn`: cuidado específico (⚠️);
 * - `ul` / `ol`: lista; `table`: tabela (primeira linha é o cabeçalho).
 */
export type DriveBlock =
  | { k: "rx" | "p" | "warn"; t: string }
  | { k: "ul" | "ol"; items: string[] }
  | { k: "table"; rows: string[][] };

/** ✅ mantido (só forma) · ✏️ ajustado (dose, duração) · ⛔ refeito (conduta errada ou desatualizada). */
export type DriveStatus = "mantido" | "ajustado" | "refeito";

export interface DriveEntry {
  slug: string;
  title: string;
  cid: string | null;
  status: DriveStatus;
  /** Entradas do Drive original que esta junta ("Tonsilite 1 e 2…"). */
  replaces: string | null;
  /** O que mudou em relação ao Drive original, e por quê. */
  changed: string | null;
  source: string | null;
  /**
   * Mudanças desta entrada depois que o Drive entrou no app (2ª revisão), com
   * o número da revisão (guide-revisions.ts), o motivo e o trecho de antes e
   * de depois. O "O que mudou" acima é em relação ao Drive original.
   */
  revisions: { rev: number; text: string; before: string | null; after: string | null }[];
  blocks: DriveBlock[];
}

export interface DriveSection {
  title: string;
  entries: DriveEntry[];
}
