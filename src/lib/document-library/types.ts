import type { DocumentKind } from "../documents";

/** Grupos na ordem em que a tela de Modelos deve mostrá-los. */
export const LIBRARY_GROUPS = ["Atestados", "Encaminhamentos", "Relatórios", "Orientações"] as const;
export type LibraryGroup = (typeof LIBRARY_GROUPS)[number];

export interface LibraryTemplate {
  kind: DocumentKind;
  subkind?: string | null;
  /** Chave da instalação: único em toda a biblioteca. */
  name: string;
  title: string;
  body: string;
  /** Só para agrupar a lista na tela de Modelos. */
  group: LibraryGroup;
}
