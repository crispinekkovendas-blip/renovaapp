import crypto from "node:crypto";
import { findByteRange, removeTrailingNewLine, DEFAULT_SIGNATURE_LENGTH } from "@signpdf/utils";

/**
 * O lado PAdES da assinatura ICP-Brasil — a metade que não depende de
 * fornecedor nenhum.
 *
 * Como uma assinatura entra num PDF:
 *
 * 1. **Placeholder.** O gerador reserva um dicionário de assinatura com
 *    `/ByteRange [0 /****** /****** /******]` e um `/Contents <000…0>`. Os
 *    asteriscos são literais: o placeholder ainda não sabe onde o buraco vai
 *    cair no arquivo final.
 * 2. **Preparo.** Calculam-se os offsets reais e escrevem-se no lugar dos
 *    asteriscos. **Isto muda os bytes do PDF**, então o arquivo preparado é o
 *    que tem de ser assinado *e* o que tem de ser entregue — assinar um e
 *    guardar o outro produz assinatura inválida. Por isso `prepareForSigning`
 *    devolve os dois juntos e não há como separá-los por engano.
 * 3. **Digest.** SHA-256 dos dois trechos do ByteRange colados: tudo menos o
 *    buraco. São esses 32 bytes que vão para o IntegraICP — o documento não
 *    sai daqui.
 * 4. **Injeção.** O CMS que volta é escrito em hexadecimal dentro do
 *    `/Contents`, sem mover nenhum byte.
 *
 * Os quatro passos são verificáveis sem credencial nenhuma.
 */

/** Espaço reservado ao CMS. Certificado ICP-Brasil com cadeia e carimbo cabe folgado. */
export const SIGNATURE_LENGTH = DEFAULT_SIGNATURE_LENGTH * 2;

export interface PreparedPdf {
  /** O PDF com o ByteRange real — **este** é o que se assina e se entrega. */
  pdf: Buffer;
  /** SHA-256 em base64: o que o IntegraICP recebe. */
  digestBase64: string;
  digestHex: string;
  /** [início, tamanho, início do 2º trecho, tamanho] */
  byteRange: [number, number, number, number];
  /** Onde começa o `<...>` do /Contents, e quanto hexadecimal cabe dentro. */
  hole: { start: number; capacity: number };
}

/**
 * Preenche o ByteRange e calcula o digest. Idempotente na prática: rodar de
 * novo sobre o PDF já preparado devolve o mesmo resultado, porque os offsets
 * não mudam de tamanho (o ByteRange real é preenchido com espaços até ocupar
 * exatamente o mesmo espaço do placeholder).
 */
export function prepareForSigning(input: Buffer | Uint8Array): PreparedPdf {
  let pdf = removeTrailingNewLine(Buffer.isBuffer(input) ? input : Buffer.from(input));

  // Dois casos: o PDF recém-gerado (ByteRange ainda com asteriscos) e o já
  // preparado ou assinado (ByteRange com números). O segundo importa para
  // recalcular o digest e conferir uma assinatura depois.
  let placeholderPos: number;
  let placeholderEnd: number;
  try {
    const { byteRangePlaceholder } = findByteRange(pdf);
    if (!byteRangePlaceholder) throw new Error("sem placeholder");
    placeholderPos = pdf.indexOf(byteRangePlaceholder);
    placeholderEnd = placeholderPos + byteRangePlaceholder.length;
  } catch {
    const concrete = /\/ByteRange \[[\d ]+\] */.exec(pdf.toString("latin1"));
    if (!concrete) {
      throw new Error("PDF sem espaço de assinatura: gere-o com signaturePlaceholder.");
    }
    placeholderPos = concrete.index;
    placeholderEnd = placeholderPos + concrete[0].length;
  }

  // O /Contents vem logo depois do ByteRange; o buraco é o <...> dele.
  const contentsTag = pdf.indexOf("/Contents ", placeholderEnd);
  const holeStart = pdf.indexOf("<", contentsTag);
  const holeEnd = pdf.indexOf(">", holeStart);
  if (contentsTag < 0 || holeStart < 0 || holeEnd < 0) {
    throw new Error("PDF com espaço de assinatura malformado: /Contents não encontrado.");
  }
  const holeLength = holeEnd + 1 - holeStart;

  const byteRange: [number, number, number, number] = [
    0,
    holeStart,
    holeStart + holeLength,
    pdf.length - (holeStart + holeLength),
  ];

  // O texto novo tem de ocupar exatamente o espaço do placeholder, senão todos
  // os offsets seguintes andam e o próprio ByteRange deixa de valer.
  const slot = placeholderEnd - placeholderPos;
  let actual = `/ByteRange [${byteRange.join(" ")}]`;
  if (actual.length > slot) {
    throw new Error("ByteRange real maior que o espaço do placeholder.");
  }
  actual = actual.padEnd(slot, " ");

  pdf = Buffer.concat([pdf.subarray(0, placeholderPos), Buffer.from(actual, "latin1"), pdf.subarray(placeholderEnd)]);

  const signedBytes = Buffer.concat([
    pdf.subarray(byteRange[0], byteRange[0] + byteRange[1]),
    pdf.subarray(byteRange[2], byteRange[2] + byteRange[3]),
  ]);
  const digest = crypto.createHash("sha256").update(signedBytes).digest();

  return {
    pdf,
    digestBase64: digest.toString("base64"),
    digestHex: digest.toString("hex"),
    byteRange,
    hole: { start: holeStart, capacity: holeLength - 2 },
  };
}

/**
 * Escreve o CMS dentro do `/Contents`, preenchendo o resto com zeros.
 *
 * O tamanho do bloco **não muda**: é por isso que o placeholder é grande. Um
 * CMS maior do que o espaço reservado não cabe, e forçar moveria os offsets —
 * o ByteRange deixaria de bater e a assinatura não validaria. Melhor falhar
 * aqui, com o número na mensagem.
 */
export function injectSignature(prepared: PreparedPdf, cms: Buffer | Uint8Array): Buffer {
  const der = Buffer.isBuffer(cms) ? cms : Buffer.from(cms);
  const hex = der.toString("hex");

  if (hex.length > prepared.hole.capacity) {
    throw new Error(
      `A assinatura não cabe no espaço reservado: ${hex.length} caracteres para ${prepared.hole.capacity}. Aumente SIGNATURE_LENGTH.`
    );
  }

  const out = Buffer.from(prepared.pdf);
  out.write(`<${hex.padEnd(prepared.hole.capacity, "0")}>`, prepared.hole.start, "latin1");
  return out;
}

/** O CMS que está dentro do PDF agora — para conferir depois de injetar. */
export function embeddedSignature(pdf: Buffer, hole: { start: number; capacity: number }): Buffer {
  const hex = pdf.subarray(hole.start + 1, hole.start + 1 + hole.capacity).toString("latin1");
  // Tira o enchimento em **pares**: cortar caractere a caractere comeria meio
  // byte quando o CMS termina em algo como 0x60 ("60" acaba em zero).
  return Buffer.from(hex.replace(/(?:00)+$/, ""), "hex");
}
