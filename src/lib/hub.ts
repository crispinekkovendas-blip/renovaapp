import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import type { AppointmentStatus } from "@/lib/db";
import type { DocumentKind } from "./documents";
import type { HubKind } from "./hub-forms";
import { expectedPin, pinCookieName, verifyPinCookie } from "./hub-pin";
import { qrSvg } from "./qr-svg";
import { getPublicClinic } from "./marketing-stats";

/**
 * Consultas do portal do paciente (`/p/[token]`) e da caixa de entrada da
 * clínica. Tudo o que toca `hub_submissions` é tolerante: a migração
 * 2026-09-07-hub-push pode ainda não ter rodado em produção quando este código
 * subir, e nesse caso as seções simplesmente não aparecem. O mesmo vale para
 * `documents`, `encounters.return_*` e o kind 'renovacao' (migração
 * 2026-09-09-documentos).
 */

export interface HubClinic {
  name: string;
  phone: string | null;
  address: string | null;
}

/**
 * Página pública: sem a tabela de configurações, ainda responde (com o nome
 * genérico). A leitura é a mesma da landing, deduplicada por requisição.
 */
export async function hubClinic(): Promise<HubClinic> {
  const { name, phone, address } = await getPublicClinic();
  return { name, phone, address };
}

export interface NextAppointment {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  procedure: string;
  telemed_room: string | null;
  professional_name: string;
  professional_specialty: string;
}

/** A próxima consulta ainda de pé (agendada ou confirmada), de hoje em diante. */
export async function nextAppointmentFor(patientId: number, today: string): Promise<NextAppointment | null> {
  const [row] = await sql<NextAppointment>`
    SELECT a.id, a.date, a.start_time, a.end_time, a.status, a.procedure, a.telemed_room,
      pr.name AS professional_name, pr.specialty AS professional_specialty
    FROM appointments a
    JOIN professionals pr ON pr.id = a.professional_id
    WHERE a.patient_id = ${patientId}
      AND a.date >= ${today}
      AND a.status IN ('agendado', 'confirmado')
    ORDER BY a.date, a.start_time
    LIMIT 1`;
  return row ?? null;
}

export interface ConcludedAppointment {
  id: number;
  date: string;
  start_time: string;
  professional_name: string;
}

/** A consulta realizada mais recente a partir de `since` — a que o paciente pode avaliar. */
export async function lastConcludedFor(patientId: number, since: string): Promise<ConcludedAppointment | null> {
  const [row] = await sql<ConcludedAppointment>`
    SELECT a.id, a.date, a.start_time, pr.name AS professional_name
    FROM appointments a
    JOIN professionals pr ON pr.id = a.professional_id
    WHERE a.patient_id = ${patientId}
      AND a.status = 'concluido'
      AND a.date >= ${since}
    ORDER BY a.date DESC, a.start_time DESC
    LIMIT 1`;
  return row ?? null;
}

/**
 * A migração 2026-09-07 já rodou? Enquanto não, o portal esconde os
 * formulários (remarcação, pré-consulta, avaliação) em vez de mostrar um
 * botão que só devolve erro.
 */
export async function hubReady(): Promise<boolean> {
  try {
    await sql`SELECT 1 FROM hub_submissions LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

export interface HubSubmission {
  id: number;
  patient_id: number;
  appointment_id: number | null;
  kind: HubKind;
  rating: number | null;
  message: string | null;
  answers: string | null;
  publish: number;
  handled_at: string | null;
  created_at: string;
  appointment_date: string | null;
  appointment_time: string | null;
  professional_name: string | null;
}

/** Tudo o que o paciente já mandou pelo portal, mais recente primeiro. `[]` sem a tabela. */
export async function submissionsForPatient(patientId: number): Promise<HubSubmission[]> {
  try {
    return await sql<HubSubmission>`
      SELECT s.id, s.patient_id, s.appointment_id, s.kind, s.rating, s.message, s.answers,
        s.publish, s.handled_at, s.created_at,
        a.date AS appointment_date, a.start_time AS appointment_time, pr.name AS professional_name
      FROM hub_submissions s
      LEFT JOIN appointments a ON a.id = s.appointment_id
      LEFT JOIN professionals pr ON pr.id = a.professional_id
      WHERE s.patient_id = ${patientId}
      ORDER BY s.created_at DESC, s.id DESC`;
  } catch {
    return [];
  }
}

/**
 * O CHECK de `hub_submissions.kind` já aceita 'renovacao'? Só leitura do
 * catálogo — inserir para descobrir gravaria uma linha de verdade. Sem a
 * constraint (ou sem a tabela), vale o que `hubReady()` disser.
 */
export async function renewalReady(): Promise<boolean> {
  try {
    const [row] = await sql<{ def: string | null }>`
      SELECT pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'hub_submissions' AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) LIKE '%kind%'`;
    if (!row) return hubReady();
    return (row.def ?? "").includes("renovacao");
  } catch {
    return false;
  }
}

export interface InboxRow {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string | null;
  kind: HubKind;
  appointment_id: number | null;
  appointment_date: string | null;
  appointment_time: string | null;
  professional_name: string | null;
  message: string | null;
  answers: string | null;
  created_at: string;
}

/**
 * Pedidos do portal ainda não resolvidos pela recepção — remarcação e
 * renovação de receita — mais antigo primeiro. `[]` sem a tabela.
 */
export async function portalInbox(): Promise<InboxRow[]> {
  try {
    return await sql<InboxRow>`
      SELECT s.id, s.patient_id, p.name AS patient_name, p.phone AS patient_phone, s.kind,
        s.appointment_id, a.date AS appointment_date, a.start_time AS appointment_time,
        pr.name AS professional_name, s.message, s.answers, s.created_at
      FROM hub_submissions s
      JOIN patients p ON p.id = s.patient_id
      LEFT JOIN appointments a ON a.id = s.appointment_id
      LEFT JOIN professionals pr ON pr.id = a.professional_id
      WHERE s.kind IN ('remarcacao', 'renovacao') AND s.handled_at IS NULL
      ORDER BY s.created_at ASC, s.id ASC
      LIMIT 50`;
  } catch {
    return [];
  }
}

/* ---------- Documentos e recibos no portal ---------- */

export interface PortalDocument {
  id: number;
  kind: DocumentKind;
  title: string;
  issued_at: string;
  professional_name: string;
}

/** Documentos que o paciente pode ver: dele, compartilhados e não revogados. `[]` sem a tabela. */
export async function sharedDocumentsFor(patientId: number): Promise<PortalDocument[]> {
  try {
    return await sql<PortalDocument>`
      SELECT d.id, d.kind, d.title, d.issued_at, pr.name AS professional_name
      FROM documents d
      JOIN professionals pr ON pr.id = d.professional_id
      WHERE d.patient_id = ${patientId} AND d.shared_with_patient = 1 AND d.revoked_at IS NULL
      ORDER BY d.issued_at DESC, d.id DESC`;
  } catch {
    return [];
  }
}

export interface PortalReceipt {
  id: number;
  description: string;
  amount_cents: number;
  paid_at: string | null;
  due_date: string;
}

/** Pagamentos recebidos deste paciente — cada um tem recibo. */
export async function paidReceiptsFor(patientId: number): Promise<PortalReceipt[]> {
  try {
    return await sql<PortalReceipt>`
      SELECT id, description, amount_cents, paid_at, due_date
      FROM payments
      WHERE patient_id = ${patientId} AND status = 'pago'
      ORDER BY COALESCE(paid_at, due_date) DESC, id DESC
      LIMIT 20`;
  } catch {
    return [];
  }
}

/* ---------- Retorno ---------- */

export interface UpcomingReturn {
  encounter_id: number;
  return_due: string;
  professional_id: number;
  professional_name: string;
}

/**
 * O retorno recomendado mais recente deste paciente, contando os atrasados
 * até 30 dias (`since`). `null` sem coluna (migração 2026-09-09 pendente).
 */
export async function upcomingReturnFor(patientId: number, since: string): Promise<UpcomingReturn | null> {
  try {
    const [row] = await sql<UpcomingReturn>`
      SELECT e.id AS encounter_id, e.return_due, e.professional_id, pr.name AS professional_name
      FROM encounters e
      JOIN professionals pr ON pr.id = e.professional_id
      WHERE e.patient_id = ${patientId} AND e.return_due IS NOT NULL AND e.return_due >= ${since}
      ORDER BY e.date DESC, e.id DESC
      LIMIT 1`;
    return row ?? null;
  } catch {
    return null;
  }
}

/* ---------- Código de acesso (PIN) ---------- */

/** Configuração `portal_pin` = "1": o portal exige os 4 últimos dígitos do celular. */
export async function portalPinRequired(): Promise<boolean> {
  try {
    const [row] = await sql<{ value: string }>`SELECT value FROM settings WHERE key = 'portal_pin'`;
    return row?.value?.trim() === "1";
  } catch {
    return false;
  }
}

/**
 * O portal deste paciente está trancado para quem está pedindo a página?
 * Trancado = a clínica exige PIN, o paciente tem celular com 4 dígitos e o
 * cookie `renova_pin_<id>` não confere (ou não existe). Sem celular no
 * cadastro não há o que digitar — entra direto.
 */
export async function portalLocked(
  patient: { id: number; phone: string | null },
  secret: string,
  today: string
): Promise<boolean> {
  if (!expectedPin(patient.phone)) return false;
  if (!(await portalPinRequired())) return false;
  const jar = await cookies();
  return !verifyPinCookie(jar.get(pinCookieName(patient.id))?.value, patient.id, secret, today);
}

/**
 * QR da receita para a farmácia ler direto da tela do paciente: SVG inline,
 * gerado no servidor. Só o link da Memed entra no código — nada do prontuário.
 */
export async function prescriptionQrSvg(link: string): Promise<string | null> {
  return qrSvg(link, 180);
}
