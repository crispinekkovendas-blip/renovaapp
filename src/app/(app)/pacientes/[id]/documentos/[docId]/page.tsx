import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Popover, PopoverClose } from "@/components/popover";
import { canActOnDocument } from "@/lib/document-permissions";
import { patientPortalLink } from "@/lib/actions-confirm";
import { publicBaseUrl } from "@/lib/marketing-stats";
import { getClinicHeader, getDocument } from "@/lib/documents-db";
import { DOCUMENT_KIND_LABEL, documentWhatsAppMessage, patientFirstName, validationUrlFor } from "@/lib/documents";
import { qrSvg } from "@/lib/qr-svg";
import { fmtDate, waLink } from "@/lib/format";
import { duplicateDocumentAction, revokeDocumentAction, toggleShareDocumentAction } from "@/lib/actions-documents";
import { DocumentSheet } from "@/components/documents/document-sheet";
import { PrintButton } from "@/components/print-button";
import { Feedback } from "@/components/feedback";

const OK_MESSAGE: Record<string, string> = {
  emitido: "Documento emitido. Imprima ou envie pelo WhatsApp — o paciente também vê no portal.",
  duplicado: "Documento duplicado com a data de hoje e um código novo.",
  revogado: "Documento revogado. Quem conferir o código vai ver que ele não vale mais.",
  compartilhado: "O documento agora aparece no portal do paciente.",
  oculto: "O documento saiu do portal do paciente.",
};

const ERRO_MESSAGE: Record<string, string> = {
  ja_revogado: "Este documento já estava revogado.",
  permissao: "Só o profissional que assinou (ou o administrador) pode revogar ou duplicar este documento.",
  migracao: "Rode a migração 2026-09-09 antes de emitir documentos.",
  codigo: "Não deu para gerar um código único agora. Tente de novo.",
};

/**
 * Um documento emitido: a folha A4 (DocumentSheet) com o QR de validação e a
 * barra de ações — imprimir, WhatsApp, duplicar, mostrar/esconder no portal,
 * revogar. Documento de outro paciente na URL → 404.
 */
export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; docId: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const session = await requireSession();
  const [{ id, docId }, query] = await Promise.all([params, searchParams]);
  const patientId = Number(id);
  const documentId = Number(docId);
  if (!Number.isFinite(patientId) || !Number.isFinite(documentId)) notFound();

  // Cabeçalho da clínica, URL pública e link do portal não dependem do documento:
  // vão junto com ele, e o 404 continua valendo antes de qualquer coisa aparecer.
  const [doc, clinic, base, portalUrl] = await Promise.all([
    getDocument(documentId),
    getClinicHeader(),
    publicBaseUrl(),
    patientPortalLink(patientId),
  ]);
  if (!doc || doc.patient_id !== patientId) notFound();
  const validationUrl = validationUrlFor(base, doc.code);
  // Revogar e duplicar são do profissional que assinou (ou do admin); a recepção imprime e envia.
  const canAct = canActOnDocument(session, doc.professional_id);
  const qr = await qrSvg(validationUrl, 200);

  const firstName = patientFirstName({ name: doc.patient_name, social_name: doc.patient_social_name });
  const whatsapp = waLink(
    doc.patient_phone,
    documentWhatsAppMessage({ firstName, clinicName: clinic.name, title: doc.title, portalUrl, code: doc.code })
  );
  const shared = Number(doc.shared_with_patient) === 1;
  // hasOwn: "?ok=toString" não pode achar um método do Object.prototype.
  const okMessage = query.ok && Object.hasOwn(OK_MESSAGE, query.ok) ? OK_MESSAGE[query.ok] : null;
  const erroMessage = query.erro && Object.hasOwn(ERRO_MESSAGE, query.erro) ? ERRO_MESSAGE[query.erro] : null;

  return (
    <>
      {/* No celular as ações viram uma grade de duas colunas, com alvos largos. */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link href={`/pacientes/${patientId}`} className="btn btn-outline">
            ← Voltar à ficha
          </Link>
          <span className="chip bg-pine-100 text-pine-800">{DOCUMENT_KIND_LABEL[doc.kind]}</span>
          <span className={`chip ${shared ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-500"}`}>
            {shared ? "No portal do paciente" : "Fora do portal"}
          </span>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          {/* O PDF é o arquivo que o paciente guarda e a farmácia abre — e é o
              que a assinatura ICP-Brasil vai assinar. Abre em aba nova. */}
          <a
            href={`/pacientes/${patientId}/documentos/${doc.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            Baixar PDF
          </a>
          <form action={toggleShareDocumentAction}>
            <input type="hidden" name="id" value={doc.id} />
            <button type="submit" className="btn btn-ghost w-full sm:w-auto">
              {shared ? "Esconder do portal" : "Mostrar no portal"}
            </button>
          </form>
          {canAct ? (
            <form action={duplicateDocumentAction}>
              <input type="hidden" name="id" value={doc.id} />
              <button type="submit" className="btn btn-ghost w-full sm:w-auto">
                Duplicar
              </button>
            </form>
          ) : null}
          {canAct && !doc.revoked_at ? (
            // Aberto no celular, o formulário ocupa a linha inteira logo abaixo (não flutua
            // para fora da tela); do sm para cima volta a ser o balão à direita.
            <Popover
              className="relative open:col-span-2 sm:open:col-span-1"
              summary="Revogar"
              summaryClassName="btn btn-outline w-full cursor-pointer text-rose-700"
            >
              <form
                action={revokeDocumentAction}
                className="card relative z-10 mt-2 w-full space-y-3 p-4 text-left sm:absolute sm:right-0 sm:w-80"
              >
                <input type="hidden" name="id" value={doc.id} />
                <PopoverClose className="absolute top-1.5 right-1.5" />
                <p className="pr-9 text-sm text-pine-900/70">
                  O documento continua na ficha, mas passa a mostrar “revogado” na folha e na validação pública.
                </p>
                <div>
                  <label className="label" htmlFor="revoke-reason">
                    Motivo (opcional)
                  </label>
                  <input className="input" id="revoke-reason" name="reason" maxLength={300} placeholder="Ex.: emitido com data errada" />
                </div>
                <button type="submit" className="btn btn-primary w-full bg-rose-700 hover:bg-rose-800">
                  Confirmar revogação
                </button>
              </form>
            </Popover>
          ) : null}
          {whatsapp && !doc.revoked_at ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              Enviar pelo WhatsApp
            </a>
          ) : null}
          <PrintButton />
        </div>
      </div>

      {okMessage ? (
        <Feedback tone="ok" className="no-print mb-4">
          {okMessage}
        </Feedback>
      ) : null}
      {erroMessage ? (
        <Feedback tone="erro" className="no-print mb-4">
          {erroMessage}
        </Feedback>
      ) : null}
      {doc.revoked_at ? (
        <p className="no-print mb-4 text-center text-xs text-pine-900/50">
          Revogado em {fmtDate(doc.revoked_at)}
          {doc.revoke_reason ? ` — ${doc.revoke_reason}` : ""}. Para emitir de novo, use “Duplicar”.
        </p>
      ) : null}

      <DocumentSheet
        document={doc}
        patient={{ name: doc.patient_name, cpf: doc.patient_cpf, social_name: doc.patient_social_name }}
        professional={{
          name: doc.professional_name,
          council: doc.professional_council,
          specialty: doc.professional_specialty,
          rqe: doc.professional_rqe,
          signature_image: doc.professional_signature_image,
        }}
        clinic={clinic}
        validationUrl={validationUrl}
        qrSvg={qr}
      />
    </>
  );
}
