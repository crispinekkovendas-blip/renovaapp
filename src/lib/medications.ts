import { searchKey } from "./normalize.ts";

/**
 * Catálogo de medicamentos e as regras de receituário que dependem dele.
 *
 * A fonte é a **Lista de Preços de Medicamentos da CMED/ANVISA**
 * (`dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv`, ~25 mil apresentações,
 * atualizada mensalmente): substância, produto, apresentação, laboratório,
 * classe terapêutica, preço máximo ao consumidor e — o que importa de verdade
 * aqui — a **tarja**, que decide em que receituário o medicamento pode sair.
 *
 * Os helpers são puros de propósito: a regra "isto exige Notificação de
 * Receita" não pode depender de banco nem de rede para ser testada.
 */

/** Tarja normalizada. O texto da CMED é inconsistente; o nosso vocabulário não. */
export type Tarja = "livre" | "vermelha" | "vermelha_retida" | "preta" | "desconhecida";

/** Em que documento o medicamento pode ser prescrito. */
export type ReceiptKind = "simples" | "controle_especial" | "notificacao";

export const TARJA_LABEL: Record<Tarja, string> = {
  livre: "Venda livre",
  vermelha: "Tarja vermelha",
  vermelha_retida: "Tarja vermelha com retenção",
  preta: "Tarja preta",
  desconhecida: "Tarja não informada",
};

/**
 * `"Tarja Vermelha sob restrição"` → `"vermelha_retida"`. A CMED escreve com
 * caixa e espaços variados, e usa `- (*)` para "não informada".
 */
export function normalizeTarja(raw: string | null | undefined): Tarja {
  const value = (raw ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!value || value.startsWith("-")) return "desconhecida";
  if (value.includes("preta")) return "preta";
  if (value.includes("vermelha")) {
    // "sob restrição" é o que obriga a retenção da receita.
    return /restri|reten/.test(value) ? "vermelha_retida" : "vermelha";
  }
  if (value.includes("sem tarja") || value.includes("livre")) return "livre";
  return "desconhecida";
}

/**
 * O receituário exigido por lei para cada tarja.
 *
 * - vermelha / livre → receituário simples, uma via.
 * - vermelha com retenção → **Receituário de Controle Especial**, duas vias
 *   (Portaria SVS/MS 344/98): a farmácia retém uma.
 * - preta → **Notificação de Receita** (A amarela / B azul), que é formulário
 *   numerado e controlado, fornecido pela vigilância sanitária. Não é algo que
 *   um sistema imprima: por isso é tratado à parte e o médico é avisado.
 */
export function receiptKindFor(tarja: Tarja): ReceiptKind {
  if (tarja === "preta") return "notificacao";
  if (tarja === "vermelha_retida") return "controle_especial";
  return "simples";
}

/** Quantas vias o documento precisa ter. */
export function viasFor(kind: ReceiptKind): number {
  return kind === "simples" ? 1 : 2;
}

export const RECEIPT_KIND_LABEL: Record<ReceiptKind, string> = {
  simples: "Receituário simples",
  controle_especial: "Receituário de Controle Especial",
  notificacao: "Notificação de Receita",
};

/**
 * O aviso que o médico precisa ver antes de imprimir. Só existe para a tarja
 * preta, e o texto diz o que fazer, não só que há um problema.
 */
export function receiptWarning(tarja: Tarja): string | null {
  if (tarja === "preta") {
    return "Tarja preta: exige Notificação de Receita numerada, fornecida pela vigilância sanitária — não pode sair neste receituário.";
  }
  if (tarja === "desconhecida") {
    return "Tarja não informada pela ANVISA: confira o receituário exigido antes de imprimir.";
  }
  return null;
}

/**
 * Um receituário só pode misturar medicamentos que usem o mesmo documento.
 * Devolve os grupos na ordem em que devem ser impressos.
 */
export function groupByReceiptKind<T>(items: T[], tarjaOf: (item: T) => Tarja): { kind: ReceiptKind; items: T[] }[] {
  const order: ReceiptKind[] = ["simples", "controle_especial", "notificacao"];
  const groups = new Map<ReceiptKind, T[]>();
  for (const item of items) {
    const kind = receiptKindFor(tarjaOf(item));
    groups.set(kind, [...(groups.get(kind) ?? []), item]);
  }
  return order.filter((k) => groups.has(k)).map((kind) => ({ kind, items: groups.get(kind)! }));
}

/** A mesma regra vale para o catálogo de CID-10 — por isso mora em `normalize.ts`. */
export { searchKey };

/**
 * A apresentação da CMED é densa: `"500 MG COM REV CT BL AL PLAS INC X 20"`.
 * Extraímos a concentração, que é o que vai na receita, e deixamos o resto
 * como está — abreviação de embalagem não ajuda o paciente nem o farmacêutico.
 */
const MEASURE = String.raw`(?:MG|MCG|G|UI|ML|%)(?:\s*\/\s*[\d.,]*\s*(?:MG|MCG|G|UI|ML|DOSE|GOTA)?)?`;
const UNIT = String.raw`[\d.,]+\s*${MEASURE}`;
// Duas formas convivem na CMED para associações: "10 MG/G + 0,443 MG/G" e
// "(0,5 + 0,1) MG" — a segunda soma dentro dos parênteses e põe a unidade fora.
const GROUPED = String.raw`\(\s*[\d.,]+(?:\s*\+\s*[\d.,]+)+\s*\)\s*${MEASURE}`;
const CONCENTRATION = new RegExp(String.raw`^\s*(${GROUPED}|${UNIT}(?:\s*\+\s*${UNIT})*)`, "i");

/**
 * A CMED escreve a mesma dose de várias formas: "1 G" e "1G", "0,5 MG" e
 * "0,5MG", "(1000 + 200) MG" e "(1000,0 + 200,0) MG". Sem normalizar, o
 * autocompletar mostra o mesmo medicamento três vezes e o médico tem de
 * escolher entre opções idênticas.
 *
 * Só mexe em grafia: separa número e unidade, e tira casa decimal que é só
 * zero ("50,0" → "50", mas "0,25" e "0,5" ficam como estão).
 */
export function normalizeConcentration(value: string): string {
  return value
    .toUpperCase()
    // "2.5" e "2,5" são a mesma dose; no Brasil a vírgula é a decimal.
    .replace(/(\d)\.(\d)/g, "$1,$2")
    .replace(/(\d),0+\b/g, "$1")
    .replace(/(\d)\s*(MG|MCG|UI|ML|G)\b/g, "$1 $2")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Quão restrito é o controle, do mais livre ao mais rígido. Usado para decidir
 * a tarja de uma substância quando as linhas da ANVISA discordam entre si.
 */
const TARJA_SEVERITY: Record<Tarja, number> = {
  desconhecida: 0,
  livre: 1,
  vermelha: 2,
  vermelha_retida: 3,
  preta: 4,
};

/** A mais restritiva de um conjunto — nunca a média, nunca a primeira. */
export function strictestTarja(tarjas: readonly Tarja[]): Tarja {
  let worst: Tarja = "desconhecida";
  for (const tarja of tarjas) {
    if (TARJA_SEVERITY[tarja] > TARJA_SEVERITY[worst]) worst = tarja;
  }
  return worst;
}

/**
 * A tarja que vale para o que o médico vê como **uma linha** na busca
 * (substância + concentração). Duas regras, e cada uma corrige um erro real
 * encontrado na lista da CMED:
 *
 * 1. **Tarja preta vale para a substância inteira.** A Portaria SVS/MS 344/98
 *    lista o princípio ativo, não a embalagem: se qualquer apresentação de
 *    clonazepam é preta, todo clonazepam é. Isso conserta as linhas em que a
 *    CMED deixou a tarja vazia — sem a regra, "CLONAZEPAM 2,5 MG/ML" sairia
 *    num receituário simples, que a farmácia não pode aceitar.
 *
 * 2. **As demais tarjas valem por apresentação.** Aqui o mais restritivo NÃO
 *    pode subir para a substância inteira: a dipirona injetável de uso
 *    hospitalar é vermelha com retenção, enquanto o comprimido é de venda
 *    livre. Propagar a mais rígida faria o medicamento mais prescrito do país
 *    exigir Receituário de Controle Especial — e isso vale para 675
 *    substâncias cujas apresentações discordam entre si.
 */
export function effectiveTarja(
  groupTarjas: readonly Tarja[],
  substanceTarjas: readonly Tarja[]
): Tarja {
  if (substanceTarjas.includes("preta")) return "preta";
  return strictestTarja(groupTarjas);
}

export function concentrationFrom(presentation: string): string | null {
  const match = presentation.match(CONCENTRATION);
  return match ? normalizeConcentration(match[1]) : null;
}

/** "DIPIRONA MONOIDRATADA" + "NOVALGINA" → como aparece na lista de busca. */
export function medicationLabel(row: { substance: string; product: string; presentation: string }): string {
  const concentration = concentrationFrom(row.presentation);
  const head = row.product.trim() || row.substance.trim();
  return concentration ? `${head} ${concentration}` : head;
}

/**
 * Alergia é texto livre no cadastro ("Dipirona", "penicilina"), e a substância
 * da CMED vem em caixa alta e às vezes composta
 * ("21-ACETATO DE DEXAMETASONA;CLOTRIMAZOL"). O casamento é por palavra
 * inteira, nos dois sentidos, para "Dipirona" pegar "DIPIRONA MONOIDRATADA"
 * sem que "sal" pegue "salbutamol".
 *
 * É um alerta, nunca um bloqueio: quem decide é o médico.
 */
export function allergyHits(substance: string, allergies: string | null | undefined): string[] {
  const words = new Set(searchKey(substance).split(" ").filter((w) => w.length >= 4));
  if (words.size === 0) return [];

  const listed = (allergies ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/[\n,;]/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hits: string[] = [];
  for (const allergy of listed) {
    const terms = searchKey(allergy).split(" ").filter((w) => w.length >= 4);
    if (terms.length > 0 && terms.some((term) => words.has(term))) hits.push(allergy);
  }
  return hits;
}
