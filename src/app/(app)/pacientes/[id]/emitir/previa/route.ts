import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getClinicHeader } from "@/lib/documents-db";
import { buildDocumentPdf } from "@/lib/pdf/document-pdf";
import type { PdfMedication } from "@/lib/pdf/document-pdf";
import { parseItems } from "@/lib/prescription";
import { receiptKindFor, viasFor } from "@/lib/medications";
import { patientDisplayName } from "@/lib/documents";
import { fmtDate, todayISO } from "@/lib/format";

/**
 * O PDF de um documento que **ainda não foi emitido**.
 *
 * A prévia ao lado do editor é uma cópia em HTML, instantânea; este endpoint é
 * o "Ver o PDF real" — gera o arquivo de verdade a partir do rascunho, para o
 * médico conferir antes de assinar. **Não grava nada**: nem documento, nem
 * código, nem histórico. O código que aparece é o que o compositor sorteou no
 * navegador, e só vira definitivo quando o documento for emitido.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isInteger(patientId) || patientId <= 0) {
    return new NextResponse("Paciente inválido.", { status: 400 });
  }

  let draft: {
    title?: string;
    body?: string;
    code?: string;
    kind?: string;
    professionalId?: number;
    medicamentos?: string;
  };
  try {
    draft = await request.json();
  } catch {
    return new NextResponse("Rascunho ilegível.", { status: 400 });
  }

  // Três leituras independentes: de uma vez.
  const [[patient], [professional], clinic] = await Promise.all([
    sql<Patient>`SELECT * FROM patients WHERE id = ${patientId}`,
    sql<{
      name: string;
      council: string;
      specialty: string;
      rqe: string | null;
      signature_image: string | null;
    }>`SELECT * FROM professionals WHERE id = ${Number(draft.professionalId) || 0}`,
    getClinicHeader(),
  ]);
  if (!patient) return new NextResponse("Paciente não encontrado.", { status: 404 });

  let vias = 1;
  let medications: PdfMedication[] | undefined;
  if (draft.kind === "receituario") {
    const items = parseItems(draft.medicamentos ?? null);
    if (items.length > 0) {
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
    title: (draft.title ?? "").trim() || "Documento",
    body: draft.body ?? "",
    medications,
    vias,
    date: fmtDate(todayISO()),
    code: (draft.code ?? "").trim() || "RNV-PREVIA",
    validateUrl: `${base()}/validar/${(draft.code ?? "").trim()}`,
    clinic: { name: clinic.name, line: clinic.line, cnes: clinic.cnes },
    patient: { name: patientDisplayName(patient), cpf: patient.cpf },
    professional: {
      name: professional?.name ?? "—",
      council: professional?.council ?? "",
      specialty: professional?.specialty ?? null,
      rqe: professional?.rqe ?? null,
      signatureImage: professional?.signature_image ?? null,
    },
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"previa.pdf\"",
      // Rascunho não se guarda em cache nenhum.
      "Cache-Control": "no-store",
    },
  });
}

function base(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://renovaapp.vercel.app").replace(/\/$/, "");
}
