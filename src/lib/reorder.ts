/**
 * Reordenação de listas — a parte pura do arrastar e soltar.
 *
 * O arrastar em si é do navegador (HTML5 drag and drop); o que decide onde o
 * item cai é isto aqui, que não depende de DOM e por isso dá para testar.
 */

/**
 * Move o item de `from` para `to`, como o usuário espera ao soltar: o item
 * desaparece de onde estava e aparece onde foi solto, empurrando o resto.
 *
 * Índice fora da lista devolve a lista como está — soltar fora não pode
 * embaralhar nada.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const out = [...items];
  if (!Number.isInteger(from) || !Number.isInteger(to)) return out;
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved);
  return out;
}

/** Sobe ou desce um item — o mesmo movimento pelo teclado, para quem não arrasta. */
export function nudge<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  return moveItem(items, index, index + delta);
}

/** O item pode subir/descer? Usado para desabilitar os botões nas pontas. */
export function canNudge(length: number, index: number, delta: -1 | 1): boolean {
  const to = index + delta;
  return index >= 0 && index < length && to >= 0 && to < length;
}
