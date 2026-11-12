import { searchKey } from "./normalize.ts";
import { formFromPresentation, type DosageForm } from "./dosage-form.ts";

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

/** Um número com ponto e, se vier colada, a unidade internacional. */
const DOTTED = /(\d+(?:\.\d+)+)(\s*UI?\b)?/g;

/**
 * O ponto da CMED ora é milhar ("100.000 UI/ML", "1.250 MG", "1.200.000 UI"),
 * ora é decimal ("2.5 MG", "0.352 G", "(9.532 + 1.049) MG"). É milhar quando
 * cada grupo depois do ponto tem três dígitos, o número não começa com zero e
 * há um sinal de que é inteiro: mais de um ponto, unidade internacional ou
 * final redondo ("1.250", nunca "1.049"). O decimal vira vírgula; o milhar
 * perde o ponto, que é como a própria CMED escreve na maioria das linhas
 * ("50000 UI", "1000 MG") — assim a mesma dose não aparece duas vezes na busca.
 *
 * Sem isto a nistatina "100.000 UI/ML" entrava no catálogo como "100 UI/ML" e
 * o carbonato de cálcio "1.250 MG" como "1,250 MG".
 */
function dotted(number: string, international: boolean): string {
  const [head, ...groups] = number.split(".");
  const thousands =
    head.length <= 3 &&
    !head.startsWith("0") &&
    groups.every((group) => group.length === 3) &&
    (groups.length > 1 || international || groups[0].endsWith("0"));
  return `${head}${thousands ? "" : ","}${groups.join("")}`;
}

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
    // "2.5" e "2,5" são a mesma dose (a vírgula é a decimal); "100.000 UI" é cem mil.
    .replace(DOTTED, (_, number: string, unit: string | undefined) => dotted(number, Boolean(unit)) + (unit ?? ""))
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

/**
 * Agonistas de GLP-1 (as "canetas" de semaglutida, liraglutida, tirzepatida…):
 * desde 2025 a Anvisa exige a retenção da receita na farmácia, mas a CMED
 * ainda traz parte das apresentações como tarja vermelha comum ou sem tarja.
 * Sem esta regra, a mesma tirzepatida sairia em uma via ou em duas conforme a
 * concentração escolhida.
 */
const RETENTION_SUBSTANCES = /\b(SEMAGLUTIDA|LIRAGLUTIDA|TIRZEPATIDA|DULAGLUTIDA|EXENATIDA|LIXISENATIDA)\b/;

export function withRetentionRules(substance: string, tarja: Tarja): Tarja {
  if (tarja === "preta") return tarja;
  return RETENTION_SUBSTANCES.test(substance.toUpperCase()) ? "vermelha_retida" : tarja;
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

/* ---------- Busca no catálogo ---------- */

export interface MedicationHit {
  substance: string;
  concentration: string | null;
  /** Forma farmacêutica (da apresentação); null quando a CMED não deixa claro. */
  form: DosageForm | null;
  tarja: Tarja;
  /** Uma marca conhecida daquela substância, só para o médico reconhecer. */
  product: string | null;
  /**
   * Os nomes comerciais à venda daquela substância + concentração + forma
   * (`brandNames`): "Novalgina", "Anador"… — sem os genéricos, que na CMED
   * levam o nome da própria substância. Do mais comum ao menos.
   */
  products: string[];
  presentation: string | null;
  therapeutic_class: string | null;
  /** Quantas apresentações existem — sinal de que é comum, não um item raro. */
  brands: number;
}

/** Uma linha da CMED como a busca traz, já na ordem de relevância. */
export interface MedicationRow {
  substance: string;
  concentration: string | null;
  /** A tarja daquela linha, como a CMED informou. */
  tarja: Tarja;
  /**
   * A tarja da substância + concentração inteira, de todas as formas juntas
   * (já "preta" quando a substância é de tarja preta): vale quando nenhuma
   * linha daquela forma informa a tarja.
   */
  tarja_conc?: Tarja;
  product: string | null;
  presentation: string | null;
  therapeutic_class: string | null;
  marketed: boolean | number;
  rank: number;
}

/**
 * A tarja de um resultado da busca (substância + concentração + forma).
 *
 * Vale a mais restritiva **daquela forma**: a dipirona 500 mg/mL em gotas é de
 * venda livre mesmo que a ampola de 500 mg/mL, de uso hospitalar, seja
 * vermelha com retenção — antes as duas dividiam a tarja porque têm a mesma
 * concentração. Quando nenhuma linha da forma informa a tarja, vale a da
 * concentração inteira; e tarja preta continua valendo para a substância toda.
 */
export function groupTarja(rows: readonly Pick<MedicationRow, "tarja" | "tarja_conc">[]): Tarja {
  const whole = rows[0]?.tarja_conc ?? "desconhecida";
  if (whole === "preta") return "preta";
  const own = strictestTarja(rows.map((row) => row.tarja));
  return own === "desconhecida" ? whole : own;
}

/**
 * Um resultado por substância + concentração + forma. As linhas chegam na
 * ordem de relevância (e comercializadas primeiro): a primeira de cada grupo o
 * representa e dá a posição; entre grupos de mesma relevância, o mais comum
 * (mais apresentações) vem antes.
 */
export function collapseMedicationRows(rows: readonly MedicationRow[], limit = 20, query = ""): MedicationHit[] {
  const groups = new Map<
    string,
    { hit: MedicationHit; rank: number; marketed: boolean; order: number; rows: MedicationRow[] }
  >();
  rows.forEach((row, order) => {
    const form = formFromPresentation(row.presentation);
    const key = `${row.substance}|${row.concentration ?? ""}|${form ?? ""}`;
    const group = groups.get(key);
    if (group) {
      group.hit.brands++;
      group.rows.push(row);
      return;
    }
    groups.set(key, {
      hit: {
        substance: row.substance,
        concentration: row.concentration,
        form,
        tarja: withRetentionRules(row.substance, row.tarja),
        product: row.product,
        presentation: row.presentation,
        therapeutic_class: row.therapeutic_class,
        brands: 1,
        products: [],
      },
      rank: row.rank,
      marketed: Boolean(row.marketed),
      order,
      rows: [row],
    });
  });
  return [...groups.values()]
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(b.marketed) - Number(a.marketed) ||
        b.hit.brands - a.hit.brands ||
        a.order - b.order,
    )
    .slice(0, limit)
    .map((g) => ({
      ...g.hit,
      tarja: withRetentionRules(g.hit.substance, groupTarja(g.rows)),
      products: brandNames(g.hit.substance, g.rows, query),
    }));
}

/* ---------- Nomes comerciais ---------- */

/** Quantos nomes comerciais acompanham cada resultado — o resto vira "+N". */
export const MAX_BRAND_NAMES = 12;

/** Sal, hidratação, "cloridrato de": palavras de substância que não identificam marca. */
const SALT_WORDS = new Set([
  "sodica", "sodico", "potassica", "potassico", "calcica", "calcico", "magnesica",
  "cloridrato", "bromidrato", "maleato", "succinato", "tartarato", "fumarato", "mesilato",
  "besilato", "acetato", "citrato", "sulfato", "fosfato", "monoidratada", "monoidratado",
  "trihidratada", "triidratada", "hidratada", "anidra", "anidro", "acido",
]);

/** As palavras de uma substância (composta ou não) que dizem que um nome é genérico. */
function substanceWords(substance: string): Set<string> {
  const words = new Set<string>();
  for (const word of searchKey(substance).split(" ")) {
    if (word.length >= 5 && !SALT_WORDS.has(word)) words.add(word);
  }
  return words;
}

/**
 * Na CMED o genérico se chama pela substância ("DIPIRONA SÓDICA",
 * "AMOXICILINA + CLAVULANATO DE POTÁSSIO", "LOSARTANA POTASSICA"): é nome
 * comercial quem não repete nenhuma palavra do princípio ativo.
 */
export function isGenericName(product: string, substance: string): boolean {
  const key = searchKey(product);
  if (!key || /\bgenerico\b/.test(key)) return true;
  const words = substanceWords(substance);
  if (words.size === 0) return false;
  return key.split(" ").some((word) => words.has(word) || [...words].some((w) => word.length >= 5 && w.startsWith(word)));
}

/**
 * "DORFLEX UNO" → "Dorflex Uno"; siglas sem vogal e números ficam como estão
 * ("VELAMOX BD", "ARADOIS H", "GLIFAGE XR").
 */
export function brandCase(product: string): string {
  return product
    .trim()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      /\d/.test(word) || (word.length <= 3 && !/[AEIOUÁÉÍÓÚÂÊÔÃÕ]/i.test(word))
        ? word.toUpperCase()
        : word
            .toLowerCase()
            .replace(/(^|-)(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase()),
    )
    .join(" ");
}

/**
 * Os nomes comerciais de um grupo de linhas da CMED: só os comercializados,
 * sem os genéricos, um por nome (a grafia não importa), do que tem mais
 * apresentações ao que tem menos. Quem casa com o que o médico digitou vem
 * primeiro — buscou "novalgina", a Novalgina abre a lista.
 */
export function brandNames(
  substance: string,
  rows: readonly Pick<MedicationRow, "product" | "marketed">[],
  query = "",
): string[] {
  const counts = new Map<string, { name: string; n: number }>();
  for (const row of rows) {
    const product = (row.product ?? "").trim();
    if (!product || !Number(row.marketed) || isGenericName(product, substance)) continue;
    const key = searchKey(product);
    const entry = counts.get(key);
    if (entry) entry.n++;
    else counts.set(key, { name: brandCase(product), n: 1 });
  }
  const q = searchKey(query);
  return [...counts.entries()]
    .sort(
      ([ka, a], [kb, b]) =>
        Number(Boolean(q) && kb.startsWith(q)) - Number(Boolean(q) && ka.startsWith(q)) ||
        b.n - a.n ||
        a.name.localeCompare(b.name, "pt-BR"),
    )
    .slice(0, MAX_BRAND_NAMES)
    .map(([, v]) => v.name);
}

