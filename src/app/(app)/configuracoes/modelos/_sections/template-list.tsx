import Link from "next/link";
import type { ReactNode } from "react";
import type { Session } from "@/lib/auth";
import {
  ATESTADO_SUBKIND_LABEL,
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABEL,
  PROTOCOL_KIND,
  isAtestadoSubkind,
  parseProtocol,
  protocolSummary,
} from "@/lib/documents";
import type { DocumentTemplate } from "@/lib/documents";
import { deleteTemplateAction } from "@/lib/actions-documents";
import { canManage, scopeLabel } from "../template-page";

type Viewer = Pick<Session, "role" | "professionalId">;

/** Modelos agrupados por tipo, e os protocolos por último (só apagar). */
export function TemplateList({ templates, viewer }: { templates: DocumentTemplate[]; viewer: Viewer }) {
  if (templates.length === 0) {
    return (
      <p className="card px-5 py-4 text-sm text-pine-900/55">
        Nenhum modelo salvo ainda. Enquanto isso, cada tipo usa o texto padrão do Renova — crie o seu ao lado.
      </p>
    );
  }

  const protocols = templates.filter((t) => t.kind === PROTOCOL_KIND);
  return (
    <div className="space-y-5">
      {DOCUMENT_KINDS.map((item) => {
        const rows = templates.filter((t) => t.kind === item.kind);
        if (rows.length === 0) return null;
        return (
          <div key={item.kind}>
            <p className="label">{item.label}</p>
            <div className="card divide-y divide-pine-900/5">
              {rows.map((t) => (
                <TemplateRow
                  key={t.id}
                  template={t}
                  viewer={viewer}
                  detail={
                    <>
                      {t.kind === "atestado" && isAtestadoSubkind(t.subkind)
                        ? ATESTADO_SUBKIND_LABEL[t.subkind]
                        : DOCUMENT_KIND_LABEL[item.kind]}
                      {t.title ? ` · título: ${t.title}` : ""}
                    </>
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
      {protocols.length > 0 ? (
        <div>
          <p className="label">Protocolos</p>
          <p className="mb-2 text-xs text-pine-900/55">
            Vários documentos de uma vez. Um protocolo nasce na tela “Emitir documentos” (Salvar como
            protocolo); aqui só dá para apagar.
          </p>
          <div className="card divide-y divide-pine-900/5">
            {protocols.map((t) => (
              <TemplateRow key={t.id} template={t} viewer={viewer} detail={protocolSummary(parseProtocol(t.fields))} protocol />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TemplateRow({
  template: t,
  viewer,
  detail,
  protocol = false,
}: {
  template: DocumentTemplate;
  viewer: Viewer;
  detail: ReactNode;
  /** Modelo comum: Editar + Apagar. Protocolo: só Apagar (nasce no compositor). */
  protocol?: boolean;
}) {
  const manageable = canManage(t, viewer);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold break-words text-pine-950">
          {t.name}
          <span className={`chip ${t.professional_id === null ? "bg-peach-100 text-pine-900" : "bg-pine-100 text-pine-800"}`}>
            {scopeLabel(t, viewer)}
          </span>
          {protocol ? <span className="chip bg-clay-100 text-clay-800">protocolo</span> : null}
        </p>
        <p className="mt-0.5 text-xs text-pine-900/55">{detail}</p>
      </div>
      {!manageable ? null : !protocol ? (
        // No celular os links viram alvos de 44px (o texto continua pequeno).
        <div className="-my-2 flex items-center gap-3 text-xs sm:my-0">
          <Link
            href={`/configuracoes/modelos?editar=${t.id}#editor`}
            className="inline-flex min-h-11 items-center px-1 font-bold text-pine-700 hover:underline sm:min-h-0 sm:px-0"
          >
            Editar
          </Link>
          <DeleteButton id={t.id} className="inline-flex min-h-11 items-center px-1 font-bold text-rose-700 hover:underline sm:min-h-0 sm:px-0" />
        </div>
      ) : (
        <DeleteButton
          id={t.id}
          className="-my-2 inline-flex min-h-11 items-center px-1 text-xs font-bold text-rose-700 hover:underline sm:my-0 sm:min-h-0 sm:px-0"
        />
      )}
    </div>
  );
}

function DeleteButton({ id, className }: { id: number; className: string }) {
  return (
    <form action={deleteTemplateAction}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>
        Apagar
      </button>
    </form>
  );
}
