import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { canIssueDocuments } from "@/lib/document-permissions";
import { sql } from "@/lib/db";
import type { Attachment, Encounter, Patient, Professional } from "@/lib/db";
import { prescriptionsForPatient } from "@/lib/prescriptions-db";
import { patientPortalLink } from "@/lib/actions-confirm";
import { aiEnabled } from "@/lib/ai";
import { fmtDate, todayISO, waLink } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { memedConfig } from "@/lib/memed/client";
import { SyncPrescriptionsButton } from "@/components/memed/prescribe-button";
import { AttachmentsPanel } from "@/components/pacientes/attachments-panel";
import { HubSubmissions } from "@/components/pacientes/hub-submissions";
import { submissionsForPatient } from "@/lib/hub";
import { documentsReady, listDocumentsForPatient } from "@/lib/documents-db";
import { DocumentsSection } from "@/components/documents/documents-list";
import type { ReceiptRow } from "@/components/documents/documents-list";
import { splitLines } from "@/lib/hub-forms";
import { DOCUMENT_KIND_LABEL, patientDisplayName, patientFirstName } from "@/lib/documents";
import { encounterCountLabel, patientTab, patientTabHref } from "@/components/pacientes/chart/chart-model";
import { ChartFlash } from "@/components/pacientes/chart/chart-flash";
import { PatientHero, PatientTabs } from "@/components/pacientes/chart/patient-hero";
import { ClinicalAlerts } from "@/components/pacientes/chart/clinical-alerts";
import { DraftsPanel, DraftsSummaryRow } from "@/components/pacientes/chart/drafts-panel";
import { SummaryList, SummaryRow } from "@/components/pacientes/chart/summary-list";
import { listDraftsForPatient } from "@/lib/drafts-db";
import { NewEncounterForm } from "@/components/pacientes/chart/new-encounter-form";
import { EncounterTimeline } from "@/components/pacientes/chart/encounter-timeline";
import { PatientDataCard } from "@/components/pacientes/chart/patient-data-card";
import { PatientAppointments, PatientPayments } from "@/components/pacientes/chart/recent-lists";
import type { ChartAppointment, ChartPayment } from "@/components/pacientes/chart/recent-lists";

/**
 * Prontuário do paciente. A página só busca os dados — todas as consultas de
 * uma vez, em paralelo — e monta as seções (src/components/pacientes/chart).
 */
export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    aba?: string;
    editar?: string;
    atender?: string;
    ok?: string;
    erro?: string;
    ordem?: string;
    tipo?: string;
  }>;
}) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, requireSession()]);
  const { editar, atender, ok, erro } = query;
  const tab = patientTab(query);

  const patientId = Number(id);
  if (!Number.isFinite(patientId)) notFound();

  // A prescrição digital só aparece quando o ambiente tem as chaves da Memed,
  // igual ao Resumo IA — instalação sem integração não mostra botão morto.
  const memedEnabled = memedConfig() !== null;
  const aiOn = aiEnabled();

  // Tudo depende só do id da URL: uma ida ao banco em paralelo em vez de cinco
  // em sequência. Paciente inexistente é raro (link velho) e cai no 404 abaixo.
  const [
    [patient],
    professionals,
    encounters,
    appointments,
    payments,
    attachments,
    hubSubmissions,
    memedPrescriptions,
    documents,
    documentsOk,
    receipts,
    [clinicRow],
    portalUrl,
    drafts,
  ] = await Promise.all([
    sql<Patient>`SELECT * FROM patients WHERE id = ${patientId}`,
    sql<Pick<Professional, "id" | "name">>`SELECT id, name FROM professionals WHERE active = 1 ORDER BY name`,
    sql<Encounter>`
      SELECT e.*, pr.name AS professional_name FROM encounters e
      JOIN professionals pr ON pr.id = e.professional_id
      WHERE e.patient_id = ${patientId} ORDER BY e.date DESC, e.id DESC`,
    sql<ChartAppointment>`
      SELECT a.id, a.date, a.start_time, a.procedure, a.status, pr.name AS professional_name FROM appointments a
      JOIN professionals pr ON pr.id = a.professional_id
      WHERE a.patient_id = ${patientId} ORDER BY a.date DESC, a.start_time DESC LIMIT 8`,
    sql<ChartPayment>`
      SELECT id, description, amount_cents, status, due_date FROM payments
      WHERE patient_id = ${patientId} ORDER BY due_date DESC LIMIT 8`,
    // Nunca selecionar `data` aqui: o bytea de cada anexo pode ter 10 MB.
    // Tolerante à tabela ainda não existir (migração 2026-09-06-attachments):
    // o prontuário inteiro não pode cair por causa da seção de anexos.
    sql<Attachment>`
      SELECT id, patient_id, encounter_id, file_name, mime_type, size_bytes, created_at
      FROM attachments WHERE patient_id = ${patientId} ORDER BY id DESC`.catch(() => [] as Attachment[]),
    // O que o paciente mandou pelo portal; [] enquanto a migração 2026-09-07 não rodar.
    submissionsForPatient(patientId),
    memedEnabled ? prescriptionsForPatient(patientId) : Promise.resolve([]),
    // Documentos da clínica + recibos de pagamentos recebidos, para a seção
    // "Documentos". Tolerante à migração 2026-09-09 ainda não ter rodado.
    listDocumentsForPatient(patientId),
    documentsReady(),
    sql<ReceiptRow>`
      SELECT id, description, amount_cents, paid_at, due_date FROM payments
      WHERE patient_id = ${patientId} AND status = 'pago'
      ORDER BY COALESCE(paid_at, due_date) DESC, id DESC LIMIT 20`.catch(() => [] as ReceiptRow[]),
    sql<{ value: string }>`
      SELECT value FROM settings WHERE key = 'clinic_name'`.catch(() => [] as { value: string }[]),
    // Portal do paciente (/p/<token>, 30 dias): só assina um token, sem banco.
    patientPortalLink(patientId),
    // Rascunhos do compositor ([] antes da migração 2026-09-28; os do navegador vêm no cliente).
    listDraftsForPatient(patientId),
  ]);
  if (!patient) notFound();

  const latestEncounter = encounters[0] ?? null;
  const latestWithRx = encounters.find((e) => e.prescription) ?? null;

  // Nome social primeiro (migração 2026-09-16; antes dela a coluna não vem e vale o civil).
  const socialName = patient.social_name?.trim() || null;
  const displayName = patientDisplayName(patient);
  const firstName = patientFirstName(patient);
  const clinicName = clinicRow?.value?.trim() || "Clínica Renova";

  // Portal enviado pelo WhatsApp com o nome da clínica; sem telefone, o link
  // abre direto para copiar.
  const portalWa = waLink(patient.phone, `Olá ${firstName}! Aqui está o seu portal na ${clinicName}: ${portalUrl}`);

  const canIssue = canIssueDocuments(session);
  const today = todayISO();
  const emitHref = `/pacientes/${patient.id}/emitir${latestEncounter ? `?encounter=${latestEncounter.id}` : ""}`;
  const documentsHref = patientTabHref(patient.id, "documentos");
  const nextAppointment = appointments
    .filter((a) => a.date >= today && a.status !== "cancelado" && a.status !== "faltou")
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`))[0];
  const latestDocument = documents.find((d) => !d.revoked_at) ?? null;
  const documentsCount = documents.length + memedPrescriptions.length + receipts.length;
  const ordered = (order: string, filter: string | null) => {
    const q = new URLSearchParams({ aba: "documentos" });
    if (order !== "recentes") q.set("ordem", order);
    if (filter) q.set("tipo", filter);
    return `/pacientes/${patient.id}?${q.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <ChartFlash ok={ok} erro={erro} />

      <PatientHero
        patient={patient}
        displayName={displayName}
        socialName={socialName}
        phoneWa={waLink(patient.phone, `Olá ${firstName}! Aqui é da clínica.`)}
        portalHref={portalWa ?? portalUrl}
        aiOn={aiOn}
        emitHref={emitHref}
        canIssue={canIssue}
        memedEnabled={memedEnabled}
        latestEncounterId={latestEncounter?.id ?? null}
        latestWithRxId={latestWithRx?.id ?? null}
      />

      {/* Sem a migração 2026-09-09 as colunas não vêm e nada aparece. */}
      <ClinicalAlerts allergies={splitLines(patient.allergies)} medications={splitLines(patient.medications)} />

      <PatientTabs
        patientId={patient.id}
        active={tab}
        counts={{ atendimentos: encounters.length, documentos: documentsCount }}
      />

      {tab === "resumo" ? (
        <div className="space-y-6">
          <SummaryList>
            <DraftsSummaryRow
              patientId={patient.id}
              drafts={drafts}
              today={today}
              canEdit={canIssue}
              documentsHref={documentsHref}
            />
            <SummaryRow
              href={patientTabHref(patient.id, "atendimentos")}
              icon="atendimento"
              label="Último atendimento"
              value={
                latestEncounter
                  ? `${fmtDate(latestEncounter.date)} · ${latestEncounter.professional_name}`
                  : "Nenhum atendimento ainda"
              }
              muted={!latestEncounter}
            />
            <SummaryRow
              href={`${patientTabHref(patient.id, "mais")}#consultas`}
              icon="consulta"
              label="Próxima consulta"
              value={
                nextAppointment
                  ? `${fmtDate(nextAppointment.date)} às ${nextAppointment.start_time} · ${nextAppointment.professional_name}`
                  : "Nenhuma marcada"
              }
              muted={!nextAppointment}
            />
            <SummaryRow
              href={documentsHref}
              icon="documento"
              label={documentsCount === 1 ? "1 documento" : `${documentsCount} documentos`}
              value={
                latestDocument
                  ? `Último: ${DOCUMENT_KIND_LABEL[latestDocument.kind]} · ${fmtDate(latestDocument.issued_at)}`
                  : "Nenhum emitido ainda"
              }
              muted={!latestDocument}
            />
          </SummaryList>

          <HubSubmissions
            patientId={patient.id}
            submissions={hubSubmissions}
            latestEncounterId={latestEncounter?.id ?? null}
          />
        </div>
      ) : null}

      {tab === "atendimentos" ? (
        <section>
          <div id="prontuario" className="mb-3 flex scroll-mt-20 items-baseline justify-between">
            <SectionTitle>Prontuário</SectionTitle>
            <span className="text-xs font-bold text-pine-900/45">{encounterCountLabel(encounters.length)}</span>
          </div>
          <NewEncounterForm patientId={patient.id} professionals={professionals} open={atender === "1"} />
          <EncounterTimeline patientId={patient.id} encounters={encounters} />
        </section>
      ) : null}

      {tab === "documentos" ? (
        <section>
          <DraftsPanel patientId={patient.id} drafts={drafts} today={today} canEdit={canIssue} />
          <div id="documentos" className="scroll-mt-20" />
          <DocumentsSection
            patientId={patient.id}
            patientName={displayName}
            patientPhone={patient.phone}
            clinicName={clinicName}
            portalUrl={portalUrl}
            latestEncounterId={latestEncounter?.id ?? null}
            ready={documentsOk}
            documents={documents}
            prescriptions={memedPrescriptions}
            receipts={receipts}
            headerExtra={memedEnabled ? <SyncPrescriptionsButton patientId={patient.id} /> : null}
            viewer={session}
            order={query.ordem}
            filter={query.tipo}
            hrefFor={ordered}
          />
        </section>
      ) : null}

      {tab === "mais" ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-6">
            <PatientDataCard patient={patient} editing={editar === "1"} />
            <section id="anexos" className="scroll-mt-20">
              <SectionTitle>Anexos</SectionTitle>
              <AttachmentsPanel
                patientId={patient.id}
                encounters={encounters.map((e) => ({ id: e.id, date: e.date }))}
                attachments={attachments}
              />
            </section>
          </div>
          <div className="min-w-0 space-y-6">
            <PatientAppointments appointments={appointments} />
            <PatientPayments payments={payments} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
