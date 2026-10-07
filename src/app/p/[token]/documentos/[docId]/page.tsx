import Link from "next/link";
import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { getSessionSecret } from "@/lib/auth";
import { verifyPatientToken } from "@/lib/patient-token";
import { fmtDate, todayISO } from "@/lib/format";
import { hubClinic, portalLocked } from "@/lib/hub";
import { getClinicHeader, getDocument } from "@/lib/documents-db";
import { canPatientSeeDocument, patientFirstName, validationHost, validationUrlFor } from "@/lib/documents";
import { publicBaseUrl } from "@/lib/marketing-stats";
import { qrSvg } from "@/lib/qr-svg";
import { DocumentSheet } from "@/components/documents/document-sheet";
import { PrintButton } from "@/components/print-button";
import { HubShell, InvalidLinkCard, UnavailableCard } from "@/components/hub/shell";
import { PinGate } from "@/components/hub/pin-gate";

/**
 * Um documento da clínica aberto pelo portal: a mesma folha A4 do prontuário
 * (com o QR de validação), para mostrar no celular ou imprimir. Só abre se o
 * documento for deste paciente, estiver liberado e não tiver sido revogado —
 * e, com `portal_pin` ligado, depois do código de acesso.
 */

export const metadata = {
  title: "Documento",
  robots: { index: false, follow: false },
};

export default async function HubDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; docId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ token, docId }, query] = await Promise.all([params, searchParams]);
  const today = todayISO();
  const secret = getSessionSecret();
  const verified = verifyPatientToken(token, secret, today);
  if (!verified) return <HubShell><InvalidLinkCard /></HubShell>;

  // SELECT * porque `social_name` (migração 2026-09-16) pode ainda não existir.
  const [patient] = await sql<Pick<Patient, "id" | "name" | "phone" | "social_name">>`
    SELECT * FROM patients WHERE id = ${verified.patientId}`;
  if (!patient) return <HubShell><InvalidLinkCard /></HubShell>;

  const portalPath = `/p/${token}`;
  const clinic = await hubClinic();
  if (await portalLocked(patient, secret, today)) {
    return (
      <HubShell clinic={clinic.name}>
        <PinGate token={token} redirectTo={`${portalPath}/documentos/${docId}`} error={query.erro === "pin"} />
      </HubShell>
    );
  }

  const doc = await getDocument(Number(docId));
  if (!doc || !canPatientSeeDocument(doc, patient.id)) {
    return (
      <HubShell clinic={clinic.name} firstName={patientFirstName(patient)}>
        <UnavailableCard backHref={portalPath} />
      </HubShell>
    );
  }

  const [header, base] = await Promise.all([getClinicHeader(), publicBaseUrl()]);
  const validationUrl = validationUrlFor(base, doc.code);
  const qr = await qrSvg(validationUrl, 200);

  return (
    <HubShell
      clinic={clinic.name}
      heading={doc.title}
      subheading={`Emitido em ${fmtDate(doc.issued_at)} por ${doc.professional_name}`}
      wide
    >
      {/* No celular, Voltar e Imprimir dividem a linha meio a meio. */}
      <div className="no-print mb-5 flex items-center justify-between gap-3 [&>*]:flex-1 sm:flex-wrap sm:[&>*]:flex-none">
        <Link href={portalPath} className="btn btn-outline">
          ← Voltar ao portal
        </Link>
        <PrintButton />
      </div>

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
        clinic={header}
        validationUrl={validationUrl}
        qrSvg={qr}
      />

      <p className="no-print mt-5 text-center text-xs text-pine-900/50">
        Precisa entregar este documento? Quem receber confere a autenticidade em{" "}
        <span className="font-semibold text-pine-900">{validationHost(validationUrl)}</span> com o código impresso na
        folha.
      </p>
    </HubShell>
  );
}
