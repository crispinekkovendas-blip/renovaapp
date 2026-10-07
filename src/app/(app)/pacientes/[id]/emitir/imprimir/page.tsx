import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { publicBaseUrl } from "@/lib/marketing-stats";
import { getClinicHeader, getDocumentsByIds } from "@/lib/documents-db";
import { validationUrlFor } from "@/lib/documents";
import { qrSvg } from "@/lib/qr-svg";
import { parseIdList } from "@/lib/id-list";
import { DocumentSheet, PRINT_STYLE_MULTI } from "@/components/documents/document-sheet";
import { PrintButton } from "@/components/print-button";
import { FitWidth } from "@/components/fit-width";

/** 210mm em px CSS (96 dpi): a largura da folha HTML. */
const SHEET_PX = (210 / 25.4) * 96;

/**
 * "Imprimir todos": as folhas de uma emissão em sequência, uma por página.
 * Cada folha é o mesmo DocumentSheet do prontuário e do portal, em modo
 * "multi" (sem posicionamento absoluto); PRINT_STYLE_MULTI entra uma vez.
 */
export default async function PrintAllPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  await requireSession();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const patientId = Number(id);
  if (!Number.isFinite(patientId)) notFound();
  const ids = parseIdList(query.ids);
  if (ids.length === 0) notFound();

  const [docs, clinic, base] = await Promise.all([getDocumentsByIds(ids), getClinicHeader(), publicBaseUrl()]);
  if (docs.length !== ids.length || docs.some((doc) => doc.patient_id !== patientId)) notFound();

  // Os QR de cada folha em paralelo (a ordem das folhas é a de `docs`).
  const sheets = await Promise.all(
    docs.map(async (doc) => {
      const validationUrl = validationUrlFor(base, doc.code);
      return { doc, validationUrl, qr: await qrSvg(validationUrl, 200) };
    })
  );

  return (
    <>
      <style>{PRINT_STYLE_MULTI}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/pacientes/${patientId}/emitir/pronto?ids=${ids.join(",")}`} className="btn btn-outline">
            ← Voltar
          </Link>
          <span className="text-sm text-pine-900/60">
            {docs.length} documento{docs.length === 1 ? "" : "s"} · uma folha por página
          </span>
        </div>
        <PrintButton />
      </div>

      <div className="space-y-8">
        {/* No celular a folha encolhe inteira em vez de refazer as linhas; na impressão, tamanho real.
            O invólucro faz de cada folha a última do seu pai, e o `.print-sheet:last-of-type` do
            PRINT_STYLE_MULTI perderia a quebra de página — por isso a quebra vai no invólucro. */}
        {sheets.map(({ doc, validationUrl, qr }) => (
          <FitWidth key={doc.id} width={SHEET_PX} className="print:break-after-page print:last:break-after-auto">
            <DocumentSheet
              printMode="multi"
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
          </FitWidth>
        ))}
      </div>
    </>
  );
}
