/**
 * Quebra de linha e paginação para o PDF — puras, para serem testáveis sem
 * abrir um PDF.
 *
 * A medição de texto vem de fora (`measure`), porque quem sabe a largura real
 * de uma string é a fonte do pdf-lib. Aqui só entra a decisão de onde quebrar.
 */

export type Measure = (text: string) => number;

/**
 * Quebra o texto na largura disponível, respeitando as quebras que já existem.
 *
 * Uma linha em branco no original continua em branco: no receituário ela
 * separa um medicamento do outro, e comê-la juntaria as posologias.
 *
 * Palavra maior que a linha inteira é partida no meio — feio, mas melhor do
 * que sair do papel. Acontece com nome de medicamento manipulado e com URL.
 */
export function wrapText(text: string, maxWidth: number, measure: Measure): string[] {
  const out: string[] = [];

  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (paragraph.trim() === "") {
      out.push("");
      continue;
    }

    // A indentação do começo da linha é preservada (as posologias entram recuadas).
    const indent = paragraph.match(/^\s*/)?.[0] ?? "";
    let line = "";

    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line === "" ? `${indent}${word}` : `${line} ${word}`;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line !== "") out.push(line);
      // A palavra sozinha ainda não cabe: parte.
      if (measure(`${indent}${word}`) > maxWidth) {
        const pieces = breakWord(word, maxWidth, indent, measure);
        out.push(...pieces.slice(0, -1));
        line = pieces[pieces.length - 1];
      } else {
        line = `${indent}${word}`;
      }
    }
    if (line !== "") out.push(line);
  }

  return out;
}

function breakWord(word: string, maxWidth: number, indent: string, measure: Measure): string[] {
  const pieces: string[] = [];
  let current = indent;
  for (const char of word) {
    if (current !== indent && measure(current + char) > maxWidth) {
      pieces.push(current);
      current = indent;
    }
    current += char;
  }
  pieces.push(current);
  return pieces;
}

/**
 * Distribui as linhas nas páginas. A primeira página costuma ter menos espaço
 * (cabeçalho da clínica e dados do paciente), então o limite dela vem à parte.
 */
export function paginate(lines: readonly string[], firstPage: number, otherPages: number): string[][] {
  if (lines.length === 0) return [[]];
  const pages: string[][] = [];
  let index = 0;
  while (index < lines.length) {
    const capacity = pages.length === 0 ? firstPage : otherPages;
    if (capacity <= 0) break;
    pages.push(lines.slice(index, index + capacity));
    index += capacity;
  }
  return pages.length > 0 ? pages : [[]];
}

/** Quantas linhas cabem numa altura, dado o espaçamento. */
export function linesThatFit(height: number, lineHeight: number): number {
  return Math.max(0, Math.floor(height / lineHeight));
}
