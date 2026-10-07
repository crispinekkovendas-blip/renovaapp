import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { documentsReady, listAllTemplates, listTemplates } from "@/lib/documents-db";
import { DOCUMENT_LIBRARY } from "@/lib/document-library";
import { PageHeader, SectionTitle } from "@/components/ui";
import { Flash } from "@/components/financeiro/flash";
import { editorState, templatesErroMessage, templatesOkMessage } from "./template-page";
import { LibraryBanner } from "./_sections/library-banner";
import { TemplateList } from "./_sections/template-list";
import { PlaceholderHelp } from "./_sections/placeholder-help";
import { TemplateEditor } from "./_sections/template-editor";

/**
 * Modelos de documentos com {{placeholders}}. Admin vê e edita todos (os da
 * clínica e os de cada profissional); um profissional vê os da clínica e os
 * seus. O escopo é definido na criação: "meus" quando a sessão tem
 * profissional, "da clínica" quando não tem ou quando o admin pede.
 */
export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; editar?: string; novo?: string; n?: string }>;
}) {
  const [session, query, ready] = await Promise.all([requireSession(), searchParams, documentsReady()]);
  const templates = ready
    ? session.role === "admin"
      ? await listAllTemplates()
      : await listTemplates(session.professionalId)
    : [];

  const editor = editorState(templates, session, query);
  // Quantos modelos prontos ainda não estão instalados como modelos da clínica.
  const clinicNames = new Set(templates.filter((t) => t.professional_id === null).map((t) => t.name));
  const missingFromLibrary = DOCUMENT_LIBRARY.filter((t) => !clinicNames.has(t.name)).length;

  const okText = templatesOkMessage(query.ok, query.n);
  const erroText = templatesErroMessage(query.erro);

  return (
    <>
      {/* O profissional não tem Configurações: volta para o início. */}
      <Link
        href={session.role === "admin" ? "/configuracoes" : "/dashboard"}
        className="mb-1 inline-flex min-h-11 items-center text-xs font-bold text-pine-600 hover:underline sm:mb-2 sm:min-h-0"
      >
        {session.role === "admin" ? "← Configurações" : "← Início"}
      </Link>
      <PageHeader
        title="Modelos de documentos"
        subtitle="Textos prontos para atestados, encaminhamentos, laudos e orientações — com campos que se preenchem sozinhos"
        action={
          ready ? (
            // Abaixo do xl o formulário fica no fim da página, depois de toda a lista: um atalho até ele.
            <a href="#editor" className="btn btn-outline justify-center xl:hidden">
              {editor.editing ? "Ir para o editor" : "Novo modelo"}
            </a>
          ) : undefined
        }
      />

      {okText ? <Flash tone="ok">{okText}</Flash> : null}
      {erroText ? <Flash tone="erro">{erroText}</Flash> : null}

      {!ready ? (
        <div className="card p-6">
          <p className="font-display text-lg font-semibold text-pine-950">Modelos ainda não ativos</p>
          <p className="mt-2 text-sm text-pine-900/70">
            Rode a migração <code className="font-mono">2026-09-09-documentos.sql</code> no banco. Enquanto isso, os
            documentos usam os textos padrão do Renova.
          </p>
        </div>
      ) : (
        // grid-cols-1 + min-w-0 nas seções: a coluna não cresce além da tela por causa de um texto longo.
        <div className="grid grid-cols-1 items-start gap-6 *:min-w-0 sm:gap-8 xl:grid-cols-[1fr_1.1fr]">
          {session.role === "admin" && missingFromLibrary > 0 ? (
            <LibraryBanner clinicNames={clinicNames} missing={missingFromLibrary} />
          ) : null}

          <section>
            <SectionTitle>Seus modelos</SectionTitle>
            <TemplateList templates={templates} viewer={session} />
            <PlaceholderHelp />
          </section>

          <TemplateEditor state={editor} viewer={session} />
        </div>
      )}
    </>
  );
}
