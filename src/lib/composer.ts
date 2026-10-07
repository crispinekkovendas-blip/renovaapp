import {
  DOCUMENT_CODE_RE,
  MAX_PROTOCOL_ITEMS,
  buildTemplateVars,
  defaultFieldValues,
  defaultTemplate,
  documentTitle,
  fieldsFor,
  generateDocumentCode,
  isDocumentKind,
  normalizeFieldValues,
  normalizeSubkind,
  parseDocumentFields,
  renderTemplate,
} from "./documents.ts";
import type {
  AtestadoSubkind,
  DocumentFieldValues,
  DocumentKind,
  ProtocolItem,
  RandomSource,
  TemplateKind,
  TemplateText,
} from "./documents.ts";
import type { PrescriptionItem } from "./prescription.ts";

/**
 * A pilha do "Emitir documentos": os itens que o compositor monta no
 * navegador e manda de uma vez para `emitDocumentsAction`. Só funções puras
 * — o estado em React fica em emit-composer.tsx e a persistência (sessionStorage)
 * vem depois. Cada item é serializável como está: `serializeItems` é o JSON
 * que vai no campo `items` do formulário e `parseItems` o lê de volta, no
 * servidor e no navegador, tolerando lixo.
 */

export interface ComposerItem {
  kind: DocumentKind;
  subkind: AtestadoSubkind | null;
  /** Modelo salvo usado; null = padrão do tipo. */
  template_id: number | null;
  title: string;
  body: string;
  /** "1" = o texto segue o modelo (o servidor refaz com a data e o profissional escolhidos); "0" = editado à mão. */
  body_auto: "0" | "1";
  fields: DocumentFieldValues;
  /** RNV-XXXX-XXXX, gerado no navegador desde o primeiro clique; o servidor troca se colidir. */
  code: string;
}

/** Modelo como o compositor o recebe da página (inclusive protocolos, já com os itens lidos). */
export interface ComposerTemplate {
  id: number;
  kind: TemplateKind;
  subkind: string | null;
  name: string;
  title: string | null;
  body: string;
  scope: "clinica" | "meu" | "outro";
  /** Só em protocolos. */
  items?: ProtocolItem[];
  /** Só em protocolos de receituário (kind "receituario"), já lidos no servidor. */
  medications?: PrescriptionItem[];
}

/** O que `renderTemplate` precisa além dos campos: quem, onde e quando. */
export interface RenderContext {
  patient: { name: string; cpf?: string | null; social_name?: string | null };
  professional: { name: string; council?: string | null } | null;
  clinicName: string;
  /** YYYY-MM-DD */
  date: string;
}

export const MAX_COMPOSER_ITEMS = MAX_PROTOCOL_ITEMS;

/** Modelos (não protocolos) que servem ao editor de um tipo/subtipo. */
export function templatesForKind(
  templates: ReadonlyArray<ComposerTemplate>,
  kind: DocumentKind,
  subkind: string | null | undefined
): ComposerTemplate[] {
  const sub = normalizeSubkind(kind, subkind);
  return templates.filter((t) => t.kind === kind && normalizeSubkind(kind, t.subkind) === sub);
}

/** Modelo salvo (se ainda existe e é do mesmo tipo) ou o padrão do tipo — a mesma regra do servidor. */
export function resolveTemplateText(
  templates: ReadonlyArray<ComposerTemplate>,
  templateId: number | null | undefined,
  kind: DocumentKind,
  subkind: string | null | undefined
): { template: TemplateText; templateId: number | null } {
  const fallback = defaultTemplate(kind, subkind);
  if (!templateId) return { template: fallback, templateId: null };
  const saved = templates.find((t) => t.id === templateId);
  if (!saved || saved.kind !== kind) return { template: fallback, templateId: null };
  return { template: { title: saved.title?.trim() || fallback.title, body: saved.body }, templateId: saved.id };
}

export function renderItemBody(
  kind: DocumentKind,
  templateBody: string,
  fields: DocumentFieldValues,
  ctx: RenderContext
): string {
  return renderTemplate(
    templateBody,
    buildTemplateVars({
      patient: ctx.patient,
      professional: ctx.professional,
      clinicName: ctx.clinicName,
      date: ctx.date,
      fields,
      kind,
    })
  );
}

export interface NewItemInput {
  kind: DocumentKind;
  subkind?: string | null;
  templateId?: number | null;
  templates: ReadonlyArray<ComposerTemplate>;
  /** Campos como estão (sem misturar defaults): o que o item guarda é o que o servidor recebe. */
  fields?: DocumentFieldValues | null;
  /** Título fixado; vazio = o do modelo. */
  title?: string | null;
  /** Texto editado à mão (`body_auto = "0"`); vazio = o texto do modelo com os campos. */
  body?: string | null;
  ctx: RenderContext;
  random?: RandomSource;
}

/** Um item pronto para a pilha, com código novo. */
export function buildItem(input: NewItemInput): ComposerItem {
  const kind = input.kind;
  const subkind = normalizeSubkind(kind, input.subkind);
  const { template, templateId } = resolveTemplateText(input.templates, input.templateId ?? null, kind, subkind);
  const fields = normalizeFieldValues(input.fields ?? {});
  const manual = input.body?.trim() ? input.body.trim() : null;
  const body = manual ?? renderItemBody(kind, template.body, fields, input.ctx);
  const title = input.title?.trim().slice(0, 120) || template.title || documentTitle(kind, subkind);
  return {
    kind,
    subkind,
    template_id: templateId,
    title,
    body,
    body_auto: manual ? "0" : "1",
    fields,
    code: generateDocumentCode(input.random),
  };
}

/**
 * "Renovar": o mesmo documento de novo, com a data de hoje. Se o original
 * guardou modelo e campos, o texto é refeito (o modelo se ainda existir,
 * senão o padrão do tipo); senão o texto vai como está. O título é mantido.
 */
export function seedFromDocument(
  doc: { kind: DocumentKind; subkind: string | null; title: string; body: string; fields: string | null },
  templates: ReadonlyArray<ComposerTemplate>,
  ctx: RenderContext,
  random?: RandomSource
): ComposerItem {
  const stored = parseDocumentFields(doc.fields);
  if (stored) {
    return buildItem({
      kind: doc.kind,
      subkind: doc.subkind,
      templateId: stored.template_id,
      templates,
      fields: stored.fields,
      title: doc.title,
      ctx,
      random,
    });
  }
  return buildItem({ kind: doc.kind, subkind: doc.subkind, templates, title: doc.title, body: doc.body, ctx, random });
}

/** Cada item do protocolo vira um item da pilha, com o modelo de então (ou o padrão) e código novo. */
export function applyProtocol(
  items: ReadonlyArray<ProtocolItem>,
  templates: ReadonlyArray<ComposerTemplate>,
  ctx: RenderContext,
  random?: RandomSource
): ComposerItem[] {
  return items.slice(0, MAX_COMPOSER_ITEMS).map((item) =>
    buildItem({
      kind: item.kind,
      subkind: item.subkind,
      templateId: item.template_id,
      templates,
      fields: item.fields,
      title: item.title,
      ctx,
      random,
    })
  );
}

/** Um modelo comum vira um item com os campos padrão; um protocolo, vários. */
export function seedFromTemplate(
  template: ComposerTemplate,
  templates: ReadonlyArray<ComposerTemplate>,
  ctx: RenderContext,
  random?: RandomSource
): ComposerItem[] {
  if (template.kind === "protocolo") return applyProtocol(template.items ?? [], templates, ctx, random);
  const kind = template.kind;
  const subkind = normalizeSubkind(kind, template.subkind);
  return [
    buildItem({
      kind,
      subkind,
      templateId: template.id,
      templates,
      fields: defaultFieldValues(fieldsFor(kind, subkind)),
      ctx,
      random,
    }),
  ];
}

/** Acrescenta à pilha respeitando o limite e sem repetir código (um repetido ganha outro). */
export function appendItems(
  stack: ReadonlyArray<ComposerItem>,
  additions: ReadonlyArray<ComposerItem>,
  random?: RandomSource
): ComposerItem[] {
  const out = [...stack];
  const seen = new Set(stack.map((item) => item.code));
  for (const item of additions) {
    if (out.length >= MAX_COMPOSER_ITEMS) break;
    let code = item.code;
    while (seen.has(code)) code = generateDocumentCode(random);
    seen.add(code);
    out.push(code === item.code ? item : { ...item, code });
  }
  return out;
}

export function replaceItem(
  stack: ReadonlyArray<ComposerItem>,
  code: string,
  next: ComposerItem
): ComposerItem[] {
  return stack.map((item) => (item.code === code ? next : item));
}

export function removeItem(stack: ReadonlyArray<ComposerItem>, code: string): ComposerItem[] {
  return stack.filter((item) => item.code !== code);
}

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function parseItem(raw: unknown): Omit<ComposerItem, "code"> & { code: string | null } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!isDocumentKind(obj.kind)) return null;
  const kind = obj.kind;
  const subkind = normalizeSubkind(kind, obj.subkind);
  const title = typeof obj.title === "string" ? obj.title.trim().slice(0, 120) : "";
  const body = typeof obj.body === "string" ? obj.body.replace(/\r\n?/g, "\n").trim() : "";
  const code = typeof obj.code === "string" && DOCUMENT_CODE_RE.test(obj.code) ? obj.code : null;
  return {
    kind,
    subkind,
    template_id: positiveInt(obj.template_id),
    title: title || documentTitle(kind, subkind),
    body,
    body_auto: obj.body_auto === "0" ? "0" : "1",
    fields: normalizeFieldValues(obj.fields as Record<string, unknown> | undefined),
    code,
  };
}

/** O JSON do campo `items` do formulário — exatamente o formato de `ComposerItem`. */
export function serializeItems(items: ReadonlyArray<ComposerItem>): string {
  return JSON.stringify(
    items.slice(0, MAX_COMPOSER_ITEMS).map((item) => ({
      kind: item.kind,
      subkind: item.subkind,
      template_id: item.template_id,
      title: item.title,
      body: item.body,
      body_auto: item.body_auto,
      fields: normalizeFieldValues(item.fields),
      code: item.code,
    }))
  );
}

/**
 * Lê a pilha de volta (servidor e navegador). Tolerante: lixo → [], item sem
 * tipo válido é pulado, excesso é cortado, código inválido ou repetido ganha
 * um novo. O texto pode vir vazio (`body_auto = "1"` refaz no servidor).
 */
export function parseItems(json: string | null | undefined, random?: RandomSource): ComposerItem[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : [];
  const seen = new Set<string>();
  const out: ComposerItem[] = [];
  for (const raw of list) {
    if (out.length >= MAX_COMPOSER_ITEMS) break;
    const item = parseItem(raw);
    if (!item) continue;
    let code = item.code;
    while (!code || seen.has(code)) code = generateDocumentCode(random);
    seen.add(code);
    out.push({ ...item, code });
  }
  return out;
}

/** O que "Salvar como protocolo" guarda de cada item: tipo, modelo, título e campos — nunca o texto nem o código. */
export function itemsToProtocol(items: ReadonlyArray<ComposerItem>): ProtocolItem[] {
  return items.slice(0, MAX_PROTOCOL_ITEMS).map((item) => ({
    kind: item.kind,
    subkind: item.subkind,
    template_id: item.template_id,
    title: item.title.trim() || null,
    fields: normalizeFieldValues(item.fields),
  }));
}

/** Primeira linha do texto, curta, para a pilha ("Atesto, para os devidos fins, que…"). */
export function itemSummary(body: string, max = 90): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
