import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getDocument, getClinicHeader } from "@/lib/documents-db";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";
import { fmtDate } from "@/lib/format";
import { patientDisplayName } from "@/lib/documents";
import { parseItems } from "@/lib/prescription";
import type { PdfMedication } from "@/lib/pdf/document-pdf";
import { receiptKindFor, viasFor } from "@/lib/medications";

/**
 * O documento em PDF: `/pacientes/1/documentos/12/pdf`.
 *
 * É o mesmo conteúdo da folha impressa, mas como arquivo — o que o paciente
 * guarda, a farmácia abre, e o que a assinatura ICP-Brasil vai assinar (PAdES
 * assina bytes de PDF; não há como assinar uma página que só existe quando o
 * navegador imprime).
 *
 * O número de vias sai da tarja dos medicamentos, não de um parâmetro: o
 * Receituário de Controle Especial precisa de duas (Portaria SVS/MS 344/98) e
 * quem sabe disso é a receita, não quem clica.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  await requireSession();
  const { id, docId } = await params;

  // O cabeçalho da clínica não depende do documento: as duas leituras vão juntas.
  const [document, clinic] = await Promise.all([getDocument(Number(docId)), getClinicHeader()]);
  if (!document || document.patient_id !== Number(id)) {
    return new NextResponse("Documento não encontrado.", { status: 404 });
  }

  // Receituário: as vias dependem da tarja do que foi prescrito.
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
    validateUrl: validateUrl(document.code),
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

  const fileName = `${slug(document.title)}-${document.code}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      // `inline` para abrir na aba; o navegador ainda oferece salvar.
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function safeFields(raw: string | null): Record<string, string> {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const fields = parsed?.fields;
    return fields && typeof fields === "object" ? fields : {};
  } catch {
    return {};
  }
}

function validateUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://renovaapp.vercel.app";
  return `${base.replace(/\/$/, "")}/validar/${code}`;
}

/** Nome de arquivo sem acento nem espaço — o Content-Disposition simples não os aceita bem. */
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
