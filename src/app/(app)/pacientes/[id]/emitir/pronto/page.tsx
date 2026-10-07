import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { patientPortalLink } from "@/lib/actions-confirm";
import { publicBaseUrl } from "@/lib/marketing-stats";
import { getClinicHeader, getDocumentsByIds } from "@/lib/documents-db";
import {
  DOCUMENT_KIND_LABEL,
  documentsBatchWhatsAppMessage,
  patientFirstName,
  validationHost,
  validationUrlFor,
} from "@/lib/documents";
import { waLink } from "@/lib/format";
import { AutoOpenWhatsApp, ClearEmitStacks, CopyButton } from "@/components/documents/emit-done";
import { parseIdList } from "@/lib/id-list";

/**
 * "Tudo certo": o que acabou de ser emitido pelo compositor, com uma mensagem
 * só de WhatsApp (link do portal + um código por documento), o link para
 * copiar, o portal, "Imprimir todos" e a lista com "Abrir". `?wa=1` abre o
 * WhatsApp sozinho uma vez (JS). Ids de outro paciente → 404.
 */
export default async function EmitDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string; wa?: string }>;
}) {
  await requireSession();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const patientId = Number(id);
  if (!Number.isFinite(patientId)) notFound();
  const ids = parseIdList(query.ids);
  if (ids.length === 0) notFound();

  // Os documentos e o resto (cabeçalho, base, link do portal) não dependem um do outro.
  const [docs, clinic, base, portalUrl] = await Promise.all([
    getDocumentsByIds(ids),
    getClinicHeader(),
    publicBaseUrl(),
    patientPortalLink(patientId),
  ]);
  if (docs.length !== ids.length || docs.some((doc) => doc.patient_id !== patientId)) notFound();
  const first = docs[0];
  const firstName = patientFirstName({ name: first.patient_name, social_name: first.patient_social_name });
  const phone = first.patient_phone?.trim() || null;
  const message = documentsBatchWhatsAppMessage({
    firstName,
    clinicName: clinic.name,
    portalUrl,
    documents: docs.map((doc) => ({ title: doc.title, code: doc.code })),
    validationHost: validationHost(validationUrlFor(base, first.code)),
  });
  const whatsapp = waLink(phone, message);
  const idsParam = ids.join(",");
  const many = docs.length !== 1;

  return (
    <div className="mx-auto max-w-3xl">
      {/* A pilha guardada pelo compositor já virou documentos: esquece. */}
      <ClearEmitStacks patientId={patientId} />
      <section className="card p-5 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine-950 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden>
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-2xl sm:mt-5 sm:text-3xl font-extrabold tracking-tight text-pine-950">
          {many ? "Documentos emitidos" : "Documento emitido"}
        </h1>
        <p className="mt-2 text-sm text-pine-900/70">
          Avise {firstName} que {many ? "os documentos já estão" : "o documento já está"} no portal.
        </p>
        {phone ? (
          <p className="mt-1 text-sm text-pine-900/70">
            Mande pelo WhatsApp: <span className="font-bold text-pine-950">{phone}</span>
          </p>
        ) : (
          <p className="mx-auto mt-3 max-w-md rounded-xl border border-clay-200 bg-clay-50 px-4 py-2 text-sm font-semibold text-clay-900">
            O paciente não tem celular cadastrado — copie o link do portal ou imprima.
          </p>
        )}

        {/* No celular os botões viram uma pilha na largura toda: dedo não erra. */}
        <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap sm:justify-center">
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Enviar pelo WhatsApp
            </a>
          ) : null}
          <CopyButton text={portalUrl} label="Copiar link do portal" done="Link copiado" />
          <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            Abrir portal
          </a>
          <Link href={`/pacientes/${patientId}/emitir/imprimir?ids=${idsParam}`} className="btn btn-outline">
            Imprimir todos
          </Link>
          <Link href={`/pacientes/${patientId}?aba=documentos`} className="btn btn-ghost">
            Concluir
          </Link>
        </div>
        {whatsapp && query.wa === "1" ? <AutoOpenWhatsApp href={whatsapp} storageKey={`renova_wa_${idsParam}`} /> : null}
      </section>

      <section className="card mt-4 divide-y divide-pine-900/5 sm:mt-6" aria-label="Documentos emitidos">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-pine-950">
                <span className="chip bg-pine-100 text-pine-800">{DOCUMENT_KIND_LABEL[doc.kind]}</span>
                <span className="truncate">{doc.title}</span>
              </p>
              <p className="mt-0.5 break-all font-mono text-xs font-bold text-pine-700">{doc.code}</p>
            </div>
            <Link
              href={`/pacientes/${patientId}/documentos/${doc.id}`}
              className="-my-2 inline-flex min-h-11 shrink-0 items-center px-2 text-xs font-bold text-pine-700 hover:underline sm:min-h-0"
            >
              Abrir
            </Link>
          </div>
        ))}
      </section>

      <details className="mt-4 text-xs text-pine-900/60">
        <summary className="cursor-pointer py-3 font-bold text-pine-700 sm:py-0">Ver a mensagem do WhatsApp</summary>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-pine-50 p-3 font-sans">{message}</pre>
      </details>
    </div>
  );
}
