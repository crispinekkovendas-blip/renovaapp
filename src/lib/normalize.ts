/**
 * Normalização de texto para busca, compartilhada pelos catálogos
 * (medicamentos, CID-10). Sem acento, minúsculo, pontuação virando espaço.
 *
 * Mora sozinha porque os dois catálogos precisam **exatamente** da mesma
 * regra: se divergirem, o índice gravado na importação deixa de casar com o
 * termo digitado na busca, e a lista simplesmente vem vazia.
 */
export function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
