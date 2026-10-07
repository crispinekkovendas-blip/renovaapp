import {
  type Tarja,
  type ReceiptKind,
  receiptKindFor,
  groupByReceiptKind,
  viasFor,
  RECEIPT_KIND_LABEL,
  allergyHits,
} from "./medications.ts";

/**
 * O receituário: a lista de medicamentos de uma prescrição, e as regras para
 * transformá-la nos documentos que a lei exige.
 *
 * O que distingue o receituário dos outros documentos do Renova é que ele não
 * é um texto — é uma **lista estruturada**. O texto impresso é derivado dela,
 * nunca o contrário, senão não dá para separar por tarja, avisar de alergia
 * nem reaproveitar a prescrição numa renovação.
 *
 * A separação por documento não é organização: é exigência legal. Dipirona e
 * amoxicilina numa mesma consulta são **dois papéis** — receituário simples e
 * Receituário de Controle Especial em duas vias (Portaria SVS/MS 344/98).
 */

/** Vias de administração, na ordem de uso. */
export const ROUTES = [
  "Via oral",
  "Via tópica",
  "Via intramuscular",
  "Via intravenosa",
  "Via subcutânea",
  "Via inalatória",
  "Via nasal",
  "Via oftálmica",
  "Via auricular",
  "Via retal",
  "Via vaginal",
] as const;

export type Route = (typeof ROUTES)[number];

export interface PrescriptionItem {
  /** Como sai na receita: substância (ou marca) já com a concentração. */
  name: string;
  /** Guardada à parte para a renovação e para a busca; pode ser null. */
  concentration: string | null;
  tarja: Tarja;
  /** O que a farmácia dispensa: "1 caixa", "30 comprimidos", "1 frasco". */
  quantity: string;
  /** Como tomar: "Tomar 1 comprimido de 8 em 8 horas por 7 dias". */
  posology: string;
  route: Route | "";
  /** Uso contínuo: a receita não "vence" para o paciente que depende dela. */
  continuous: boolean;
}

export const MAX_PRESCRIPTION_ITEMS = 30;

export function emptyItem(): PrescriptionItem {
  return { name: "", concentration: null, tarja: "desconhecida", quantity: "", posology: "", route: "Via oral", continuous: false };
}

/** Item utilizável: sem nome não existe receita; sem posologia a farmácia não dispensa. */
export function itemComplete(item: PrescriptionItem): boolean {
  return item.name.trim() !== "" && item.posology.trim() !== "";
}

export function whatIsMissing(item: PrescriptionItem): string[] {
  const missing: string[] = [];
  if (!item.name.trim()) missing.push("medicamento");
  if (!item.posology.trim()) missing.push("posologia");
  return missing;
}

/* ---------- Serialização (vai em `fields.medicamentos`) ---------- */

/**
 * A lista viaja como JSON num campo do documento — mesmo caminho dos
 * protocolos. Entrada corrompida devolve [] em vez de derrubar o compositor:
 * perder a lista é ruim, perder a tela inteira é pior.
 */
export function serializeItems(items: readonly PrescriptionItem[]): string {
  return JSON.stringify(items.slice(0, MAX_PRESCRIPTION_ITEMS));
}

const ROUTE_SET = new Set<string>(ROUTES);

export function parseItems(raw: string | null | undefined): PrescriptionItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  return data.slice(0, MAX_PRESCRIPTION_ITEMS).flatMap((row): PrescriptionItem[] => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const name = text(r.name);
    if (!name) return [];
    const route = text(r.route);
    return [
      {
        name,
        concentration: text(r.concentration) || null,
        tarja: isTarja(r.tarja) ? r.tarja : "desconhecida",
        quantity: text(r.quantity),
        posology: text(r.posology),
        route: ROUTE_SET.has(route) ? (route as Route) : "",
        continuous: r.continuous === true || r.continuous === "1",
      },
    ];
  });
}

function isTarja(value: unknown): value is Tarja {
  return (
    value === "livre" ||
    value === "vermelha" ||
    value === "vermelha_retida" ||
    value === "preta" ||
    value === "desconhecida"
  );
}

/* ---------- Impressão ---------- */

/**
 * Uma linha de receita, como o farmacêutico espera ler:
 *
 * ```
 * 1) Dipirona 500 mg .......................... 1 caixa
 *    Tomar 1 comprimido de 6/6h se dor. Via oral. Uso contínuo.
 * ```
 *
 * A quantidade fica na mesma linha do nome porque é o que a farmácia
 * confere primeiro; a posologia embaixo, porque é o que o paciente lê.
 */
export function renderItem(item: PrescriptionItem, index: number): string {
  const head = item.quantity.trim() ? `${item.name} — ${item.quantity.trim()}` : item.name;
  const details = [item.posology.trim(), item.route, item.continuous ? "Uso contínuo" : ""]
    .filter(Boolean)
    .join(". ");
  return `${index + 1}) ${head}\n   ${details}${details.endsWith(".") ? "" : "."}`;
}

/** O corpo de um receituário. Sem itens, string vazia — quem chama decide. */
export function renderBody(items: readonly PrescriptionItem[]): string {
  return items.filter(itemComplete).map(renderItem).join("\n\n");
}

/* ---------- Separação legal ---------- */

export interface PrescriptionDocument {
  kind: ReceiptKind;
  label: string;
  /** Quantas vias o papel precisa ter. */
  vias: number;
  items: PrescriptionItem[];
  body: string;
}

/**
 * Divide a prescrição nos documentos que a lei exige. Uma consulta com
 * dipirona e amoxicilina sai em dois papéis, não num só.
 *
 * A Notificação de Receita (tarja preta) aparece aqui como um grupo para que a
 * interface possa **avisar**, não para ser impressa: o formulário é numerado e
 * fornecido pela vigilância sanitária. Ver `blockedItems`.
 */
export function splitIntoDocuments(items: readonly PrescriptionItem[]): PrescriptionDocument[] {
  const usable = items.filter(itemComplete);
  return groupByReceiptKind(usable, (item) => item.tarja).map((group) => ({
    kind: group.kind,
    label: RECEIPT_KIND_LABEL[group.kind],
    vias: viasFor(group.kind),
    items: group.items,
    body: renderBody(group.items),
  }));
}

/**
 * Os itens que o sistema **não pode** imprimir: tarja preta exige Notificação
 * de Receita, formulário numerado que não se gera em impressora comum.
 */
export function blockedItems(items: readonly PrescriptionItem[]): PrescriptionItem[] {
  return items.filter(itemComplete).filter((item) => receiptKindFor(item.tarja) === "notificacao");
}

/** Os documentos que serão realmente emitidos (sem a Notificação de Receita). */
export function printableDocuments(items: readonly PrescriptionItem[]): PrescriptionDocument[] {
  return splitIntoDocuments(items).filter((doc) => doc.kind !== "notificacao");
}

/* ---------- Segurança ---------- */

export interface PrescriptionWarning {
  item: string;
  kind: "alergia" | "duplicado" | "bloqueado";
  message: string;
}

/**
 * O que a tela precisa mostrar antes de o médico assinar. Três checagens, cada
 * uma por um motivo concreto:
 *
 * - **alergia**: o cadastro já tem a alergia; não avisar seria ter a
 *   informação e guardá-la;
 * - **duplicado**: o mesmo princípio ativo duas vezes na mesma receita é o
 *   erro de dose mais comum quando se prescreve por marca e por genérico;
 * - **bloqueado**: tarja preta não sai neste papel.
 *
 * Tudo é aviso, nunca bloqueio: quem decide é quem assina.
 */
export function prescriptionWarnings(
  items: readonly PrescriptionItem[],
  allergies: string | null | undefined
): PrescriptionWarning[] {
  const usable = items.filter(itemComplete);
  const warnings: PrescriptionWarning[] = [];

  for (const item of usable) {
    const hits = allergyHits(item.name, allergies);
    if (hits.length > 0) {
      warnings.push({
        item: item.name,
        kind: "alergia",
        message: `${item.name} — o cadastro registra alergia a ${hits.join(", ")}.`,
      });
    }
  }

  const seen = new Map<string, number>();
  for (const item of usable) {
    const key = item.name.toLowerCase().trim();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      const name = usable.find((i) => i.name.toLowerCase().trim() === key)!.name;
      warnings.push({ item: name, kind: "duplicado", message: `${name} aparece ${count} vezes nesta receita.` });
    }
  }

  for (const item of blockedItems(items)) {
    warnings.push({
      item: item.name,
      kind: "bloqueado",
      message: `${item.name} é tarja preta: exige Notificação de Receita numerada, fornecida pela vigilância sanitária, e não pode sair neste receituário.`,
    });
  }

  return warnings;
}
