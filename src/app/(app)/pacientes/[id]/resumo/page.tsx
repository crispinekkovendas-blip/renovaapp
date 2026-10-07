import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import type { Appointment, Encounter, Patient } from "@/lib/db";
import { aiEnabled, summarizePatientHistory } from "@/lib/ai";
import { PageHeader } from "@/components/ui";
import { Feedback } from "@/components/feedback";

export default async function PatientAiSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isFinite(patientId)) notFound();

  // Sem IA configurada só o paciente importa; com ela, as três leituras vão juntas.
  const aiOn = aiEnabled();
  const [[patient], encounters, appointments] = await Promise.all([
    sql<Patient>`SELECT * FROM patients WHERE id = ${patientId}`,
    aiOn
      ? sql<Encounter>`
          SELECT e.date, e.complaint, e.anamnesis, e.exam, e.diagnosis, e.plan, e.prescription,
            pr.name AS professional_name
          FROM encounters e
          JOIN professionals pr ON pr.id = e.professional_id
          WHERE e.patient_id = ${patientId}
          ORDER BY e.date DESC, e.id DESC`
      : Promise.resolve([] as Encounter[]),
    aiOn
      ? sql<Appointment>`
          SELECT a.date, a.start_time, a.procedure, a.status, pr.name AS professional_name
          FROM appointments a
          JOIN professionals pr ON pr.id = a.professional_id
          WHERE a.patient_id = ${patientId}
          ORDER BY a.date DESC, a.start_time DESC
          LIMIT 20`
      : Promise.resolve([] as Appointment[]),
  ]);
  if (!patient) notFound();

  const back = (
    <Link href={`/pacientes/${patient.id}`} className="btn btn-outline">
      ← Voltar à ficha
    </Link>
  );

  if (!aiOn) {
    return (
      <>
        <PageHeader title="Resumo IA" subtitle={patient.name} action={back} />
        <div className="card max-w-2xl p-4 text-sm text-pine-900/70 sm:p-6">
          <p className="font-bold text-pine-950">Recurso opcional não configurado</p>
          <p className="mt-2">
            O resumo automático do prontuário usa a API da Anthropic. Para ativar, defina a
            variável de ambiente <code className="font-semibold">ANTHROPIC_API_KEY</code> e
            reinicie o aplicativo.
          </p>
        </div>
      </>
    );
  }

  let summary: string | null = null;
  let error: string | null = null;
  try {
    summary = await summarizePatientHistory({
      patient: {
        nome: patient.name,
        nascimento: patient.birth_date,
        sexo: patient.sex,
        convenio: patient.insurance,
        observacoes: patient.notes,
      },
      encounters: encounters as unknown as Record<string, unknown>[],
      appointments: appointments as unknown as Record<string, unknown>[],
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Não foi possível gerar o resumo agora.";
  }

  return (
    <>
      <PageHeader
        title="Resumo do prontuário — gerado por IA"
        subtitle={patient.name}
        action={back}
      />
      {error ? (
        <Feedback tone="erro" className="max-w-2xl">
          {error} Tente novamente em instantes.
        </Feedback>
      ) : (
        <div className="max-w-3xl">
          <div className="card p-4 sm:p-6">
            <p className="whitespace-pre-line break-words text-sm leading-6">{summary}</p>
          </div>
          <p className="mt-3 text-xs text-pine-900/50">
            Conteúdo gerado por IA a partir do prontuário — confira antes de usar clinicamente.
          </p>
        </div>
      )}
    </>
  );
}
