/**
 * Biblioteca de modelos prontos da clínica.
 *
 * Instalada em Configurações › Modelos ("Instalar modelos prontos"), entra
 * como modelo **da clínica** (`professional_id = NULL`), disponível para todos
 * os profissionais e editável depois — daqui em diante é texto da clínica, não
 * do sistema. Reinstalar só acrescenta o que falta, pela chave `name`, então
 * nada que o médico editou é sobrescrito.
 *
 * Regras que valem para todos os textos:
 *
 * - O corpo usa `{{placeholders}}`; uma linha cujos campos conhecidos estão
 *   todos vazios **some inteira** (ver `renderTemplate`). É por isso que
 *   "CID: {{cid}}" pode ficar em toda parte sem sujar o papel.
 * - No atestado, o CID só é impresso quando o paciente consente (CFM
 *   1.658/2002, art. 3º) — quem cuida disso é `printableCid`, não o modelo.
 * - Nenhum modelo de orientação traz dose de medicamento: dose é prescrição,
 *   e prescrição se faz no receituário, para aquele paciente.
 * - As orientações ao paciente terminam em sinais de alerta — o que faz o
 *   documento valer mais do que a conversa que o paciente vai esquecer.
 *
 * Os textos ficam em `document-library/`, um arquivo por grupo; a ordem dentro
 * de cada arquivo é a ordem em que a tela de Modelos os mostra.
 */
import { ATESTADOS } from "./document-library/atestados.ts";
import { ENCAMINHAMENTOS } from "./document-library/encaminhamentos.ts";
import { RELATORIOS } from "./document-library/relatorios.ts";
import { ORIENTACOES } from "./document-library/orientacoes.ts";
import { LIBRARY_GROUPS } from "./document-library/types.ts";
import type { LibraryGroup, LibraryTemplate } from "./document-library/types.ts";

export { LIBRARY_GROUPS };
export type { LibraryGroup, LibraryTemplate };

export const DOCUMENT_LIBRARY: readonly LibraryTemplate[] = [...ATESTADOS, ...ENCAMINHAMENTOS, ...RELATORIOS, ...ORIENTACOES];

export function libraryByGroup(): { group: LibraryGroup; items: LibraryTemplate[] }[] {
  return LIBRARY_GROUPS.map((group) => ({
    group,
    items: DOCUMENT_LIBRARY.filter((t) => t.group === group),
  })).filter((g) => g.items.length > 0);
}
