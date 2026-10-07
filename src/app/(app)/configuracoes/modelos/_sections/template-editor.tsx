import Link from "next/link";
import type { Session } from "@/lib/auth";
import { ATESTADO_SUBKINDS, DOCUMENT_KINDS } from "@/lib/documents";
import type { DocumentTemplate } from "@/lib/documents";
import { saveTemplateAction } from "@/lib/actions-documents";
import { SectionTitle } from "@/components/ui";
import { NEW_FROM } from "../template-page";
import type { EditorState } from "../template-page";

/**
 * Formulário de modelo: edição de um existente, ou novo (em branco ou a
 * partir de um padrão). `#editor`: no celular ele fica depois de uma lista
 * longa; Editar e os padrões pulam direto para cá.
 */
export function TemplateEditor({
  state,
  viewer,
}: {
  state: EditorState<DocumentTemplate>;
  viewer: Pick<Session, "role" | "professionalId">;
}) {
  const { editing, seed, seedTemplate } = state;
  return (
    <section id="editor" className="card scroll-mt-20 p-4 sm:p-5">
      <SectionTitle>{editing ? `Editar “${editing.name}”` : "Novo modelo"}</SectionTitle>
      {!editing ? (
        // No celular cada padrão é um alvo de 44px de altura; do sm para cima, a linha de links de sempre.
        <p className="-mt-2 mb-4 flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-pine-900/60 sm:gap-x-2 sm:gap-y-1">
          <span className="basis-full sm:basis-auto">Começar do padrão:</span>
          {NEW_FROM.map((item) => (
            <Link
              key={item.key}
              href={`/configuracoes/modelos?novo=${item.key}#editor`}
              aria-current={seed === item.key ? "true" : undefined}
              className={`inline-flex min-h-11 items-center font-bold hover:underline sm:min-h-0 ${seed === item.key ? "text-pine-950 underline" : "text-pine-600"}`}
            >
              {item.label}
            </Link>
          ))}
        </p>
      ) : null}
      <form action={saveTemplateAction} className="space-y-3" key={editing?.id ?? seed ?? "novo"}>
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tpl-kind">
              Tipo
            </label>
            <select className="input" id="tpl-kind" name="kind" defaultValue={state.kind}>
              {DOCUMENT_KINDS.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tpl-sub">
              Tipo de atestado
            </label>
            <select className="input" id="tpl-sub" name="subkind" defaultValue={state.subkind} aria-describedby="tpl-sub-hint">
              {ATESTADO_SUBKINDS.map((item) => (
                <option key={item.subkind} value={item.subkind}>
                  {item.label}
                </option>
              ))}
            </select>
            <p id="tpl-sub-hint" className="mt-1 text-[11px] text-pine-900/50">
              Só conta quando o tipo é Atestado.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tpl-name">
              Nome do modelo
            </label>
            <input
              className="input"
              id="tpl-name"
              name="name"
              required
              maxLength={80}
              defaultValue={editing?.name ?? ""}
              placeholder="Ex.: Atestado 3 dias"
            />
          </div>
          <div>
            <label className="label" htmlFor="tpl-title">
              Título na folha (opcional)
            </label>
            <input
              className="input"
              id="tpl-title"
              name="title"
              maxLength={120}
              defaultValue={editing?.title ?? seedTemplate?.title ?? ""}
              placeholder="Ex.: Atestado médico"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="tpl-body">
            Texto
          </label>
          <textarea
            className="input min-h-[14rem] font-display text-base leading-relaxed"
            id="tpl-body"
            name="body"
            rows={10}
            required
            defaultValue={editing?.body ?? seedTemplate?.body ?? ""}
          />
        </div>
        {!editing && viewer.role === "admin" ? (
          <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
            <input
              type="checkbox"
              name="scope"
              value="clinica"
              defaultChecked={viewer.professionalId === null}
              className="h-4 w-4 accent-pine-700"
            />
            Modelo da clínica (todos os profissionais veem)
          </label>
        ) : null}
        {/* O texto é longo: no celular o Salvar fica preso embaixo, acima das abas, enquanto se edita. */}
        <div className="mobile-action-bar flex gap-2 max-sm:-mb-4 max-sm:rounded-b-[18px] sm:flex-wrap">
          <button type="submit" className="btn btn-primary flex-1 justify-center sm:flex-none">
            {editing ? "Salvar alterações" : "Salvar modelo"}
          </button>
          {editing ? (
            <Link href="/configuracoes/modelos" className="btn btn-outline flex-1 justify-center sm:flex-none">
              Cancelar
            </Link>
          ) : null}
        </div>
      </form>
    </section>
  );
}
