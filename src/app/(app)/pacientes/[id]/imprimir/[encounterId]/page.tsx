import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import type { Encounter, Patient } from "@/lib/db";
import { fmtDateLong } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { FitWidth } from "@/components/fit-width";
import { PRINT_STYLE } from "@/components/documents/document-sheet";

/** 210mm em px CSS (96 dpi): a largura natural da folha, que o FitWidth encolhe no celular. */
const SHEET_PX = (210 / 25.4) * 96;

interface EncounterWithProfessional extends Pick<Encounter, "id" | "date" | "prescription"> {
  professional_name: string;
  professional_council: string;
  professional_specialty: string;
}

export default async function PrintDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; encounterId: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const [{ id, encounterId }, { tipo }] = await Promise.all([params, searchParams]);
  const patientId = Number(id);
  const encId = Number(encounterId);
  if (!Number.isFinite(patientId) || !Number.isFinite(encId)) notFound();

  const isAtestado = tipo === "atestado";

  // Três leituras independentes numa ida só ao banco.
  const [[patient], [encounter], settingsRows] = await Promise.all([
    sql<Pick<Patient, "id" | "name" | "cpf">>`SELECT id, name, cpf FROM patients WHERE id = ${patientId}`,
    sql<EncounterWithProfessional>`
      SELECT e.id, e.date, e.prescription, pr.name AS professional_name, pr.council AS professional_council, pr.specialty AS professional_specialty
      FROM encounters e
      JOIN professionals pr ON pr.id = e.professional_id
      WHERE e.id = ${encId} AND e.patient_id = ${patientId}`,
    sql<{ key: string; value: string }>`
      SELECT key, value FROM settings
      WHERE key IN ('clinic_name', 'clinic_address', 'clinic_phone', 'clinic_document')`,
  ]);
  if (!patient || !encounter) notFound();

  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  const clinicName = settings.clinic_name || "Clínica";
  const clinicLine = [settings.clinic_address, settings.clinic_phone, settings.clinic_document]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {/* Na impressão, só o documento (.print-area) aparece — o resto da página some. */}
      <style>{PRINT_STYLE}</style>

      {/* No celular: "Voltar" numa linha, as ações embaixo dividindo a largura. */}
      <div className="no-print mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Link href={`/pacientes/${patient.id}`} className="btn btn-outline self-start">
          ← Voltar à ficha
        </Link>
        <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          <Link
            href={`/pacientes/${patient.id}/imprimir/${encounter.id}?tipo=receita`}
            className={`btn ${isAtestado ? "btn-ghost" : "btn-outline"}`}
          >
            Receita
          </Link>
          {/* O atestado agora sai do fluxo de documentos, com código de autenticidade e QR. */}
          <Link
            href={`/pacientes/${patient.id}/documentos/novo?kind=atestado&sub=medico&encounter=${encounter.id}`}
            className={`btn ${isAtestado ? "btn-outline" : "btn-ghost"}`}
          >
            Emitir atestado
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* A4 não refaz linhas: no celular a folha encolhe para caber; a impressão sai do tamanho real. */}
      <FitWidth width={SHEET_PX}>
        <article className="print-area mx-auto flex min-h-[280mm] w-full max-w-[210mm] flex-col bg-white p-[18mm] text-ink shadow-[0_2px_16px_rgba(22,51,43,0.12)]">
          <header className="border-b-2 border-pine-900 pb-4">
            <p className="font-display text-2xl font-semibold text-pine-950">{clinicName}</p>
            {clinicLine ? <p className="mt-1 text-xs text-pine-900/60">{clinicLine}</p> : null}
          </header>

          <h1 className="mt-10 text-center font-display text-xl font-semibold text-pine-950">
            {isAtestado ? "Atestado Médico" : "Receituário"}
          </h1>

          <div className="mt-8 space-y-1 text-sm">
            <p>
              <span className="font-bold">Paciente:</span> {patient.name}
            </p>
            {patient.cpf ? (
              <p>
                <span className="font-bold">CPF:</span> {patient.cpf}
              </p>
            ) : null}
            <p>
              <span className="font-bold">Data:</span> {fmtDateLong(encounter.date)}
            </p>
          </div>

          <div className="mt-10 flex-1">
            {isAtestado ? (
              <p className="text-justify text-base leading-8">
                Atesto, para os devidos fins, que o(a) paciente <strong>{patient.name}</strong> esteve
                sob meus cuidados profissionais no dia {fmtDateLong(encounter.date).toLowerCase()},
                necessitando de ____ dia(s) de afastamento de suas atividades.
              </p>
            ) : encounter.prescription ? (
              <p className="whitespace-pre-line text-base leading-8">{encounter.prescription}</p>
            ) : (
              <p className="text-sm italic text-pine-900/50">
                Este atendimento não possui receita registrada.
              </p>
            )}
          </div>

          <footer className="mt-16 flex flex-col items-center gap-1 pb-2 text-center text-sm">
            <div className="w-72 border-t border-ink pt-2">
              <p className="font-bold">{encounter.professional_name}</p>
              <p className="text-xs text-pine-900/70">
                {[encounter.professional_specialty, encounter.professional_council]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </footer>
        </article>
      </FitWidth>
    </>
  );
}
