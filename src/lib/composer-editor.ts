import { defaultFieldValues, fieldsFor, normalizeSubkind } from "./documents.ts";
import type { AtestadoSubkind, DocumentFieldValues, DocumentKind, FieldKey } from "./documents.ts";
import { resolveTemplateText } from "./composer.ts";
import type { ComposerItem, ComposerTemplate } from "./composer.ts";
import { printableDocuments, serializeItems as serializePrescription } from "./prescription.ts";
import type { PrescriptionDocument, PrescriptionItem } from "./prescription.ts";

/**
 * O estado do editor do "Emitir documentos" como funções puras: o reducer
 * que o compositor usa (qual pílula está ativa e o que está sendo
 * preenchido) e os pedaços de regra que antes moravam soltos no componente.
 * Nada aqui sorteia código: quem despacha passa o código novo junto, para o
 * reducer continuar puro (o StrictMode o chama duas vezes).
 */

/** A pílula ativa: um tipo de documento ou a "Receita digital" (Memed). */
export type ComposerTab = DocumentKind | "receita";

export const COMPOSER_STEPS = ["compose", "review"] as const;
export type ComposerStep = (typeof COMPOSER_STEPS)[number];

/** Abaixo do lg: o que o controle segmentado mostra, o editor ou a folha. */
export const MOBILE_VIEWS = [
  { view: "editar", label: "Editar" },
  { view: "previa", label: "Prévia da folha" },
] as const;
export type MobileView = (typeof MOBILE_VIEWS)[number]["view"];

export interface EditorState {
  kind: DocumentKind;
  subkind: AtestadoSubkind | null;
  templateId: number | null;
  fields: DocumentFieldValues;
  /** null = segue o modelo; texto = editado à mão. */
  manualBody: string | null;
  manualTitle: string | null;
  /** Código do item que está sendo montado. Vazio só antes da hidratação. */
  code: string;
  /** Código do item da pilha em edição; null = item novo. */
  editing: string | null;
}

export interface ComposerState {
  tab: ComposerTab;
  editor: EditorState;
}

/** Todos os campos do tipo, vazios — a base sobre a qual um item salvo é reaberto. */
export function emptyFieldValues(kind: DocumentKind, subkind: AtestadoSubkind | null): DocumentFieldValues {
  const out: DocumentFieldValues = {};
  for (const def of fieldsFor(kind, subkind)) out[def.key] = "";
  return out;
}

/** Editor zerado num tipo/modelo, com os valores padrão dos campos. */
export function freshEditor(
  kind: DocumentKind,
  subkind: AtestadoSubkind | null,
  templateId: number | null,
  code: string
): EditorState {
  return {
    kind,
    subkind,
    templateId,
    fields: defaultFieldValues(fieldsFor(kind, subkind)),
    manualBody: null,
    manualTitle: null,
    code,
    editing: null,
  };
}

/** O primeiro render: sem código (ele nasce depois da hidratação, ver "hydrate-code"). */
export function initialComposerState(kind: DocumentKind, subkind: AtestadoSubkind | null): ComposerState {
  return { tab: kind, editor: freshEditor(kind, subkind, null, "") };
}

/**
 * Um item da pilha de volta no editor ("Editar"). Texto editado à mão volta
 * como manual; o título só é fixado se difere do título do modelo.
 */
export function editorFromItem(item: ComposerItem, templates: ReadonlyArray<ComposerTemplate>): EditorState {
  const { template } = resolveTemplateText(templates, item.template_id, item.kind, item.subkind);
  return {
    kind: item.kind,
    subkind: item.subkind,
    templateId: item.template_id,
    fields: { ...emptyFieldValues(item.kind, item.subkind), ...item.fields },
    manualBody: item.body_auto === "0" ? item.body : null,
    manualTitle: item.title !== template.title ? item.title : null,
    code: item.code,
    editing: item.code,
  };
}

/** Acrescenta um bloco ao fim do texto (painéis de exames): o que já estava fica acima. */
export function appendToBody(current: string, addition: string): string {
  return `${current.trim()}\n\n${addition}`.trim();
}

export type ComposerAction =
  /** O código sorteado depois da hidratação; não troca um que já exista. */
  | { type: "hydrate-code"; code: string }
  /** Clique numa pílula de tipo. `code` só é usado se o tipo mudar. */
  | { type: "select-tab"; tab: ComposerTab; code: string }
  | { type: "select-subkind"; subkind: AtestadoSubkind; code: string }
  | { type: "select-template"; templateId: number | null }
  /** Modelo comum (não protocolo): carrega no editor, trocando de tipo se preciso. */
  | { type: "apply-template"; template: Pick<ComposerTemplate, "id" | "kind" | "subkind">; code: string }
  | { type: "set-field"; key: FieldKey; value: string }
  | { type: "set-title"; title: string }
  | { type: "set-body"; body: string }
  | { type: "reset-body" }
  /** `currentBody` é o texto que está na tela (o do modelo, se não houver manual). */
  | { type: "append-body"; text: string; currentBody: string }
  | { type: "edit-item"; editor: EditorState }
  /** "Limpar", "Cancelar" e depois de incluir: zera no mesmo tipo e modelo. */
  | { type: "reset"; code: string }
  /** Um item saiu da pilha: se era o que estava em edição, o editor zera. */
  | { type: "item-removed"; itemCode: string; code: string }
  /** Rascunho do navegador lido depois da hidratação: troca o estado inteiro. */
  | { type: "restore"; state: ComposerState };

function openKind(
  kind: DocumentKind,
  subkind: AtestadoSubkind | null,
  templateId: number | null,
  code: string
): ComposerState {
  return { tab: kind, editor: freshEditor(kind, subkind, templateId, code) };
}

function patchEditor(state: ComposerState, patch: Partial<EditorState>): ComposerState {
  return { ...state, editor: { ...state.editor, ...patch } };
}

function resetEditor(state: ComposerState, code: string): ComposerState {
  const { kind, subkind, templateId } = state.editor;
  return { ...state, editor: freshEditor(kind, subkind, templateId, code) };
}

export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  const { editor } = state;
  switch (action.type) {
    case "hydrate-code":
      return editor.code ? state : patchEditor(state, { code: action.code });
    case "select-tab":
      // Voltar da pílula "Receita" (ou clicar a pílula atual) não mexe no que está sendo preenchido.
      if (action.tab === "receita" || action.tab === editor.kind) {
        return action.tab === state.tab ? state : { ...state, tab: action.tab };
      }
      return openKind(action.tab, normalizeSubkind(action.tab, null), null, action.code);
    case "select-subkind":
      return action.subkind === editor.subkind ? state : openKind("atestado", action.subkind, null, action.code);
    case "select-template":
      return patchEditor(state, { templateId: action.templateId, manualBody: null, manualTitle: null });
    case "apply-template": {
      const { template } = action;
      if (template.kind === "protocolo") return state;
      const subkind = normalizeSubkind(template.kind, template.subkind);
      if (template.kind === editor.kind && subkind === editor.subkind && state.tab === template.kind) {
        return patchEditor(state, { templateId: template.id, manualBody: null, manualTitle: null });
      }
      return openKind(template.kind, subkind, template.id, action.code);
    }
    case "set-field":
      return patchEditor(state, { fields: { ...editor.fields, [action.key]: action.value } });
    case "set-title":
      return patchEditor(state, { manualTitle: action.title });
    case "set-body":
      return patchEditor(state, { manualBody: action.body });
    case "reset-body":
      return patchEditor(state, { manualBody: null });
    case "append-body":
      return patchEditor(state, { manualBody: appendToBody(editor.manualBody ?? action.currentBody, action.text) });
    case "edit-item":
      return { tab: action.editor.kind, editor: action.editor };
    case "reset":
      return resetEditor(state, action.code);
    case "item-removed":
      return editor.editing === action.itemCode ? resetEditor(state, action.code) : state;
    case "restore":
      return { ...action.state, editor: { ...action.state.editor, code: action.state.editor.code || editor.code } };
  }
}

/* ---------- Receituário ---------- */

/**
 * O receituário vira **vários** itens: a Portaria SVS/MS 344/98 não deixa
 * dipirona e amoxicilina no mesmo papel, e a tarja preta nem entra
 * (`printableDocuments` já a exclui). Cada documento ganha o seu código.
 */
export function prescriptionToItems(
  docs: ReadonlyArray<PrescriptionDocument>,
  newCode: () => string
): ComposerItem[] {
  return docs.map((doc): ComposerItem => ({
    kind: "receituario",
    subkind: null,
    template_id: null,
    title: doc.label,
    body: doc.body,
    // O corpo é derivado da lista; o servidor não deve refazê-lo por modelo.
    body_auto: "0",
    fields: { medicamentos: serializePrescription(doc.items) },
    code: newCode(),
  }));
}

/** O resumo do receituário: em quantos documentos sai e com quantos medicamentos. */
export function prescriptionSummary(rx: ReadonlyArray<PrescriptionItem>): {
  docs: PrescriptionDocument[];
  medicationCount: number;
  /** O selo da prévia: só quando a receita sai em mais de um papel ou em vias. */
  viaLabel: string | null;
} {
  const docs = printableDocuments(rx);
  return {
    docs,
    medicationCount: docs.reduce((n, doc) => n + doc.items.length, 0),
    viaLabel: docs.length > 1 || (docs[0]?.vias ?? 1) > 1 ? "1ª via — Farmácia (retenção)" : null,
  };
}

/* ---------- Textos e rótulos ---------- */

/** "Ana Beatriz Souza" → "AS", para o avatar do cabeçalho. */
export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** "1 documento", "3 documentos". */
export function documentCountLabel(count: number): string {
  return `${count} documento${count === 1 ? "" : "s"}`;
}

/** "código do atestado", "código das orientações"… */
export const CODE_OF: Record<DocumentKind, string> = {
  atestado: "do atestado",
  encaminhamento: "do encaminhamento",
  laudo: "do laudo",
  orientacoes: "das orientações",
  receituario: "do receituário",
};

const EMIT_ERROR_MESSAGE: Record<string, string> = {
  migracao: "Os documentos ainda não estão ativos neste banco: rode as migrações 2026-09-09 e 2026-09-16.",
  texto: "Um dos documentos ficou sem texto — abra o item e escreva alguma coisa antes de emitir.",
  codigo: "Não deu para gerar códigos únicos agora. Tente de novo.",
  campos: "Faltou escolher o profissional que assina.",
  itens: "Nenhum documento chegou para emitir. Inclua pelo menos um e tente de novo.",
  permissao: "Documento médico é emitido pelo profissional (ou pelo administrador). A recepção pode imprimir e enviar os já emitidos.",
};

/** O `?erro=` que `emitDocumentsAction` devolve, em português. */
export function emitErrorMessage(code: string): string {
  return Object.prototype.hasOwnProperty.call(EMIT_ERROR_MESSAGE, code)
    ? EMIT_ERROR_MESSAGE[code]
    : "Não deu para emitir agora. Tente de novo.";
}

/**
 * Para onde o Perfil volta depois de salvar: este compositor, no tipo e
 * atendimento atuais (sem ?from/?modelo — as sementes já estão na pilha guardada).
 */
export function composerUrl(
  patientId: number,
  kind: DocumentKind,
  subkind: AtestadoSubkind | null,
  encounterId: number | null
): string {
  return `/pacientes/${patientId}/emitir?kind=${kind}${subkind ? `&sub=${subkind}` : ""}${
    encounterId ? `&encounter=${encounterId}` : ""
  }`;
}

/* ---------- Revisão ---------- */

/** Os controles de envio da revisão (vão no formulário da emissão). */
export interface SendOptions {
  shared: boolean;
  openWhatsApp: boolean;
  /** Só quando o cadastro não tem: o que for escrito aqui fica no cadastro. */
  patientCpf: string;
  patientPhone: string;
}

export function initialSendOptions(registeredPhone: string | null): SendOptions {
  return { shared: true, openWhatsApp: Boolean(registeredPhone?.trim()), patientCpf: "", patientPhone: "" };
}

/** Escrever um celular liga o "Abrir o WhatsApp" (apagar não desliga). */
export function withPatientPhone(options: SendOptions, phone: string): SendOptions {
  return { ...options, patientPhone: phone, openWhatsApp: options.openWhatsApp || phone.trim() !== "" };
}

/** O celular para onde a mensagem vai: o do cadastro ou o recém-escrito. */
export function phoneForSend(registeredPhone: string | null, typedPhone: string): string {
  return registeredPhone?.trim() || typedPhone.trim();
}
