import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { getSessionSecret } from "@/lib/auth";
import { verifyPatientToken } from "@/lib/patient-token";
import { portalLocked } from "@/lib/hub";
import { getDocument, getClinicHeader } from "@/lib/documents-db";
import { canPatientSeeDocument, patientDisplayName } from "@/lib/documents";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";
import { parseItems } from "@/lib/prescription";
import type { PdfMedication } from "@/lib/pdf/document-pdf";
import { receiptKindFor, viasFor } from "@/lib/medications";
import { fmtDate, todayISO } from "@/lib/format";
import { publicBaseUrl } from "@/lib/marketing-stats";

/**
 * O PDF do documento para o **paciente**: `/p/<token>/documentos/12/pdf`.
 *
 * Mesma geração da rota da clínica, guardas completamente diferentes: aqui não
 * há sessão, e sim o token do portal, o PIN (quando ligado) e a regra de
 * visibilidade do documento. Um documento escondido do portal ou revogado não
 * vira PDF — seria contornar o botão "Esconder do portal" por URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; docId: string }> }
) {
  const { token, docId } = await params;
  const today = todayISO();
  const secret = getSessionSecret();

  const verified = verifyPatientToken(token, secret, today);
  if (!verified) return notAllowed();

  const [patient] = await sql<Patient>`SELECT * FROM patients WHERE id = ${verified.patientId}`;
  if (!patient) return notAllowed();

  // Com o código de acesso ligado, o PDF segue a mesma trava da página.
  if (await portalLocked(patient, secret, today)) return notAllowed();

  const document = await getDocument(Number(docId));
  if (!document || !canPatientSeeDocument(document, patient.id)) return notAllowed();

  const [clinic, base] = await Promise.all([getClinicHeader(), publicBaseUrl()]);

  // A lista estruturada decide duas coisas: quantas vias o papel precisa e se
  // o corpo sai em blocos de medicamento em vez de texto corrido.
  let vias = 1;
  let medications: PdfMedication[] | undefined;
  if (document.kind === "receituario") {
    const items = parseItems(safeFields(document.fields).medicamentos);
    if (items.length > 0) {
      // Todos os itens do documento compartilham o mesmo tipo (foi assim que
      // `splitIntoDocuments` os separou), então o primeiro basta.
      vias = viasFor(receiptKindFor(items[0].tarja));
      medications = items.map((item) => ({
        name: item.name,
        quantity: item.quantity || null,
        posology: item.posology,
        route: item.route || null,
        continuous: item.continuous,
      }));
    }
  }

  const bytes = await buildDocumentPdf({
    title: document.title,
    body: document.body,
    date: fmtDate(document.issued_at),
    code: document.code,
    validateUrl: `${base.replace(/\/$/, "")}/validar/${document.code}`,
    vias,
    medications,
    clinic: { name: clinic.name, line: clinic.line, cnes: clinic.cnes },
    patient: {
      name: patientDisplayName({ name: document.patient_name, social_name: document.patient_social_name }),
      cpf: document.patient_cpf,
    },
    professional: {
      name: document.professional_name,
      council: document.professional_council,
      specialty: document.professional_specialty,
      rqe: document.professional_rqe ?? null,
      signatureImage: document.professional_signature_image ?? null,
    },
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug(document.title)}-${document.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Sempre a mesma resposta: não revela se o documento existe. */
function notAllowed(): NextResponse {
  return new NextResponse("Documento indisponível.", { status: 404 });
}

function safeFields(raw: string | null): Record<string, string> {
  try {
    const fields = JSON.parse(raw ?? "{}")?.fields;
    return fields && typeof fields === "object" ? fields : {};
  } catch {
    return {};
  }
}

function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "documento"
  );
}
