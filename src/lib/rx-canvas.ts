import { parseItems, serializeItems } from "./prescription.ts";
import type { PrescriptionDocument, PrescriptionItem } from "./prescription.ts";

/**
 * A folha do receituário como parte da montagem, não só prévia: o médico
 * arrasta um medicamento da esquerda para a folha, clica num medicamento da
 * folha para achá-lo no editor, sobe, desce ou tira ali mesmo.
 *
 * Aqui fica a parte pura: o formato do que viaja no arrastar e a ligação entre
 * o que está na folha e a posição na lista do editor.
 */

/** Tipo próprio no `dataTransfer`: arrastar texto de outro lugar não inclui nada. */
export const RX_DRAG_TYPE = "application/x-renova-rx";

export function encodeDragItems(items: readonly PrescriptionItem[]): string {
  return serializeItems(items);
}

/** Entrada inválida vira lista vazia (soltar não inclui nada). */
export function decodeDragItems(raw: string | null | undefined): PrescriptionItem[] {
  return parseItems(raw);
}

/**
 * A posição de cada medicamento de um papel na lista do editor. Os papéis
 * são feitos com os mesmos objetos da lista (`splitIntoDocuments` só filtra
 * e agrupa), então a identidade basta — e resolve até dois itens iguais.
 */
export function documentIndexes(rx: readonly PrescriptionItem[], doc: Pick<PrescriptionDocument, "items">): number[] {
  return doc.items.map((item) => rx.indexOf(item));
}

/** A primeira página que mostra o item `rxIndex`, ou -1. */
export function pageOfItem(pages: readonly { itemIndexes?: readonly number[] }[], rxIndex: number): number {
  return pages.findIndex((page) => page.itemIndexes?.includes(rxIndex) ?? false);
}

/**
 * Onde pôr o foco depois de uma mudança na lista: no primeiro item novo,
 * quando a lista cresceu; senão, em nada.
 */
export function firstAdded(before: number, after: number): number | null {
  return after > before ? before : null;
}
