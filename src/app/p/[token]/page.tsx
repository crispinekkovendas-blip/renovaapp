import type { Metadata } from "next";
import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { getSessionSecret } from "@/lib/auth";
import { verifyPatientToken } from "@/lib/patient-token";
import { signConfirmToken } from "@/lib/confirm-token";
import {
  hubClinic,
  hubReady,
  lastConcludedFor,
  nextAppointmentFor,
  paidReceiptsFor,
  portalLocked,
  renewalReady,
  sharedDocumentsFor,
  submissionsForPatient,
  upcomingReturnFor,
} from "@/lib/hub";
import { portalFeedback, submissionState } from "@/lib/hub-feedback";
import { patientDisplayName, patientFirstName } from "@/lib/documents";
import { RECALL_WINDOW_DAYS } from "@/lib/recall";
import { prescriptionsForPatient } from "@/lib/prescriptions-db";
import { addDaysISO, todayISO, waLink } from "@/lib/format";
import { HubBanner, HubShell, InvalidLinkCard } from "@/components/hub/shell";
import { PinGate } from "@/components/hub/pin-gate";
import { RatingCard } from "@/components/hub/rating-card";
import { RecallCard } from "@/components/hub/recall-card";
import { HubDocuments } from "@/components/hub/documents-section";
import { NextAppointmentCard } from "@/components/hub/next-appointment-card";
import { PrescriptionsSection } from "@/components/hub/prescriptions-section";
import { PastAppointments, type PastAppointment } from "@/components/hub/past-appointments";

/**
 * Portal do paciente: a página pessoal, sem login, que o paciente recebe pelo
 * WhatsApp e guarda no celular — próxima consulta (confirmar/cancelar, agenda,
 * teleconsulta, remarcação, pré-consulta), retorno recomendado, avaliação da
 * última consulta, receitas digitais com QR e pedido de renovação, documentos
 * e recibos, e histórico. A autorização é o token assinado da URL; com a
 * configuração `portal_pin` ligada, antes de tudo vem o código de acesso.
 */

// O link carrega um token pessoal: fora dos buscadores e sem repassar a URL a terceiros.
export const metadata = {
  title: "Meu portal",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
} satisfies Metadata;

export default async function PatientHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string; erro?: string; de?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const today = todayISO();
  const secret = getSessionSecret();
  const verified = verifyPatientToken(token, secret, today);
  if (!verified) return <HubShell><InvalidLinkCard /></HubShell>;

  // SELECT * porque `social_name` (migração 2026-09-16) pode ainda não existir.
  // A clínica não depende do paciente: as duas leituras vão juntas.
  const [[patient], clinic] = await Promise.all([
    sql<Pick<Patient, "id" | "name" | "phone" | "social_name">>`
      SELECT * FROM patients WHERE id = ${verified.patientId}`,
    hubClinic(),
  ]);
  if (!patient) return <HubShell><InvalidLinkCard /></HubShell>;

  const portalPath = `/p/${token}`;

  // Código de acesso: com `portal_pin` ligado e celular no cadastro, nada
  // aparece antes dos 4 últimos dígitos — nem o primeiro nome.
  if (await portalLocked(patient, secret, today)) {
    return (
      <HubShell clinic={clinic.name}>
        <PinGate token={token} redirectTo={portalPath} error={query.erro === "pin"} />
      </HubShell>
    );
  }

  const [
    next,
    past,
    prescriptions,
    [lastEncounter],
    lastConcluded,
    submissions,
    canSubmit,
    canRenew,
    documents,
    receipts,
    retorno,
  ] = await Promise.all([
    nextAppointmentFor(patient.id, today),
    sql<PastAppointment>`
      SELECT a.id, a.date, a.start_time, a.status, pr.name AS professional_name
      FROM appointments a
      JOIN professionals pr ON pr.id = a.professional_id
      WHERE a.patient_id = ${patient.id}
        AND (a.date < ${today} OR a.status = 'concluido')
      ORDER BY a.date DESC, a.start_time DESC
      LIMIT 5`,
    // Tolerante à tabela ainda não existir em instalações sem a Memed.
    prescriptionsForPatient(patient.id),
    sql<{ date: string }>`
      SELECT date FROM encounters WHERE patient_id = ${patient.id}
      ORDER BY date DESC, id DESC LIMIT 1`.catch(() => [] as { date: string }[]),
    // Só consultas realizadas nos últimos 30 dias pedem avaliação.
    lastConcludedFor(patient.id, addDaysISO(today, -30)),
    // Tudo o que o paciente já mandou pelo portal; [] sem a tabela.
    submissionsForPatient(patient.id),
    // Sem a tabela (migração 2026-09-07 pendente), os formulários ficam escondidos.
    hubReady(),
    // Sem o kind 'renovacao' no CHECK (migração 2026-09-09 pendente), sem "Pedir renovação".
    renewalReady(),
    // Documentos liberados e recibos; [] sem as tabelas.
    sharedDocumentsFor(patient.id),
    paidReceiptsFor(patient.id),
    // Retorno recomendado (atrasado até 30 dias ainda conta); null sem a coluna.
    upcomingReturnFor(patient.id, addDaysISO(today, -RECALL_WINDOW_DAYS)),
  ]);

  // Saudação pelo nome social, quando há.
  const firstName = patientFirstName(patient);
  const clinicWa = waLink(clinic.phone, `Olá! Sou ${patientDisplayName(patient)}, quero falar sobre minha consulta.`);
  // Token de confirmação daquela consulta, assinado aqui: o portal é o link
  // longo (30 dias); a confirmação continua valendo só até o dia seguinte.
  const confirmToken = next ? signConfirmToken(next.id, addDaysISO(next.date, 1), secret) : null;
  const { pendingReschedule, preConsultSent, alreadyRated } = submissionState(submissions, {
    nextId: next?.id ?? null,
    lastConcludedId: lastConcluded?.id ?? null,
  });

  return (
    <HubShell clinic={clinic.name} firstName={firstName}>
      {/* ── Retorno das ações ─────────────────────────────────── */}
      {portalFeedback(query, { firstName, clinic: clinic.name }).map((banner) => (
        <HubBanner key={banner.title} tone={banner.tone} title={banner.title}>
          {banner.body}
        </HubBanner>
      ))}

      {/* ── Próxima consulta ──────────────────────────────────── */}
      <NextAppointmentCard
        next={next}
        token={token}
        confirmToken={confirmToken}
        clinic={clinic}
        clinicWa={clinicWa}
        canSubmit={canSubmit}
        pendingReschedule={pendingReschedule}
        preConsultSent={preConsultSent}
        openForms={query.erro === "vazio"}
      />

      {/* ── Retorno recomendado ───────────────────────────────── */}
      {!next && retorno ? <RecallCard retorno={retorno} today={today} /> : null}

      {/* ── Avaliar a última consulta ─────────────────────────── */}
      {canSubmit && lastConcluded && !alreadyRated ? (
        <RatingCard token={token} appointment={lastConcluded} firstName={firstName} />
      ) : null}

      {/* ── Receitas digitais ─────────────────────────────────── */}
      <PrescriptionsSection
        token={token}
        prescriptions={prescriptions}
        submissions={submissions}
        canRenew={canSubmit && canRenew}
      />

      {/* ── Documentos e recibos ──────────────────────────────── */}
      <HubDocuments token={token} documents={documents} receipts={receipts} />

      {/* ── Consultas anteriores ──────────────────────────────── */}
      <PastAppointments past={past} lastEncounterDate={lastEncounter?.date ?? null} />

      <p className="mt-6 text-center text-xs text-pine-900/55">
        Este link é pessoal e vale por 30 dias. Precisa de um novo? Peça à clínica.
      </p>
    </HubShell>
  );
}
