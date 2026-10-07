/**
 * Regras puras da página de modelos: quem pode mexer em qual modelo, o rótulo
 * de escopo, o estado do editor (editar / começar de um padrão / em branco) e
 * as mensagens de retorno. Sem banco — testáveis com `node --test`.
 */
import { DEFAULT_TEMPLATES, PROTOCOL_KIND } from "../../../../lib/documents.ts";
import type { DocumentTemplate, TemplateText } from "../../../../lib/documents.ts";
import type { Session } from "../../../../lib/auth.ts";

type Viewer = Pick<Session, "role" | "professionalId">;
type TemplateOwner = Pick<DocumentTemplate, "professional_id">;

/** Atalhos "Começar do padrão": chaves de `DEFAULT_TEMPLATES`. */
export const NEW_FROM: readonly { key: string; label: string }[] = [
  { key: "atestado.medico", label: "Atestado médico" },
  { key: "atestado.comparecimento", label: "Comparecimento" },
  { key: "atestado.acompanhante", label: "Acompanhante" },
  { key: "encaminhamento", label: "Encaminhamento" },
  { key: "laudo", label: "Laudo / relatório" },
  { key: "orientacoes", label: "Orientações" },
];

const OK_MESSAGE: Readonly<Record<string, string>> = {
  salvo: "Modelo salvo. Ele já aparece na lista “Modelo” ao emitir um documento.",
  apagado: "Modelo apagado.",
  biblioteca: "Modelos prontos instalados. Já aparecem em “Modelo” ao emitir um documento — edite à vontade, agora são da clínica.",
  biblioteca_completa: "Todos os modelos prontos já estavam instalados.",
};

const ERRO_MESSAGE: Readonly<Record<string, string>> = {
  campos: "Dê um nome ao modelo e escreva o texto.",
  permissao: "Você só pode mexer nos seus próprios modelos.",
  migracao: "Rode a migração 2026-09-09 para usar modelos.",
};

/** Admin mexe em todos; o profissional, só nos próprios. */
export function canManage(template: TemplateOwner, viewer: Viewer): boolean {
  if (viewer.role === "admin") return true;
  return viewer.professionalId !== null && template.professional_id === viewer.professionalId;
}

export function scopeLabel(template: TemplateOwner & { professional_name?: string | null }, viewer: Viewer): string {
  if (template.professional_id === null) return "Da clínica";
  if (template.professional_id === viewer.professionalId) return "Meus modelos";
  return template.professional_name ? `De ${template.professional_name}` : "De outro profissional";
}

export interface EditorState<T> {
  /** O modelo em edição (só um que o viewer pode mexer, e nunca um protocolo). */
  editing: T | null;
  /** Chave do padrão escolhido em "Começar do padrão", quando não há edição. */
  seed: string | null;
  seedTemplate: TemplateText | null;
  kind: string;
  subkind: string;
}

/** O que o formulário mostra, a partir de `?editar=` e `?novo=`. */
export function editorState<T extends DocumentTemplate>(
  templates: readonly T[],
  viewer: Viewer,
  query: { editar?: string; novo?: string }
): EditorState<T> {
  const editId = Number(query.editar) || null;
  // Protocolos não têm editor aqui: nascem no compositor e só se apagam.
  const editing = editId
    ? (templates.find((t) => t.id === editId && t.kind !== PROTOCOL_KIND && canManage(t, viewer)) ?? null)
    : null;
  const seed = !editing && query.novo && Object.hasOwn(DEFAULT_TEMPLATES, query.novo) ? query.novo : null;
  const [seedKind, seedSub] = (seed ?? "atestado.medico").split(".");
  return {
    editing,
    seed,
    seedTemplate: seed ? DEFAULT_TEMPLATES[seed] : null,
    kind: editing?.kind ?? seedKind,
    subkind: editing ? (editing.subkind ?? "medico") : (seedSub ?? "medico"),
  };
}

/** Mensagem de `?ok=`; a da biblioteca diz quantos modelos entraram quando o número veio. */
export function templatesOkMessage(ok: string | undefined, installedParam: string | undefined): string | null {
  if (!ok) return null;
  const installed = Number(installedParam) || 0;
  if (ok === "biblioteca" && installed > 0) {
    return `${installed} modelo(s) pronto(s) instalado(s). Já aparecem em “Modelo” ao emitir um documento — edite à vontade, agora são da clínica.`;
  }
  return Object.hasOwn(OK_MESSAGE, ok) ? OK_MESSAGE[ok] : null;
}

export function templatesErroMessage(erro: string | undefined): string | null {
  return erro && Object.hasOwn(ERRO_MESSAGE, erro) ? ERRO_MESSAGE[erro] : null;
}
