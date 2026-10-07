import { sql } from "@/lib/db";
import type { AppointmentStatus } from "@/lib/db";
import { getSessionSecret } from "@/lib/auth";
import { signPatientToken } from "@/lib/patient-token";
import { addDaysISO, todayISO } from "@/lib/format";
import { recallPayload, reminderPayload, stampSaoPaulo, targetDateFor } from "@/lib/push";
import { recallDateFor } from "@/lib/recall";
import { pushConfigured, sendReminder, type SendResult } from "@/lib/push-send";
import { baseUrl, firstName, groupByPatient, migrationPending } from "./helpers";

/**
 * Lembretes automáticos por Web Push (Vercel Cron, 09:00 São Paulo) — o Hobby
 * só dá dois crons e os dois já estão em uso, então esta rota faz duas passadas:
 *
 * 1. Véspera: para cada consulta de amanhã ainda sem lembrete, envia o aviso a
 *    todos os aparelhos em que o paciente ativou lembretes e marca
 *    `reminder_sent_at`.
 * 2. Retorno: para cada atendimento com `return_due` daqui a três dias, ainda
 *    não avisado, cujo paciente tem push ativo e nenhuma consulta futura,
 *    envia "hora de marcar seu retorno" e marca `return_reminded_at`.
 *
 * Quem não tem push continua recebendo o WhatsApp manual da recepção.
 *
 * Só com o `CRON_SECRET` (o mesmo do keepalive):
 *   ?date=YYYY-MM-DD  outro dia em vez de amanhã (o retorno acompanha: date + 2)
 *   ?dry=1            simula: conta, não envia, não grava
 * Sem segredo configurado (dev local, que divide o banco de produção), toda
 * chamada é simulação — nunca sai um push nem grava uma linha por engano.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Candidate {
  id: number;
  date: string;
  start_time: string;
  status: AppointmentStatus;
  patient_id: number;
  patient_name: string;
  professional_name: string;
}

interface RecallCandidate {
  id: number;
  patient_id: number;
  patient_name: string;
  professional_name: string;
  return_due: string;
}

interface SubscriptionRow {
  id: number;
  patient_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function clinicName(): Promise<string> {
  try {
    const [row] = await sql<{ value: string }>`SELECT value FROM settings WHERE key = 'clinic_name'`;
    return row?.value?.trim() || "Clínica Renova";
  } catch {
    return "Clínica Renova";
  }
}

/** Registra o resultado na assinatura. Falha de banco aqui não derruba a rodada. */
async function recordResult(subscriptionId: number, result: SendResult, stamp: string): Promise<void> {
  try {
    if (result.ok) {
      await sql`UPDATE push_subscriptions SET last_success_at = ${stamp}, last_error = NULL WHERE id = ${subscriptionId}`;
    } else if (result.gone) {
      await sql`UPDATE push_subscriptions SET disabled = 1, last_error = ${result.error} WHERE id = ${subscriptionId}`;
    } else {
      await sql`UPDATE push_subscriptions SET last_error = ${result.error} WHERE id = ${subscriptionId}`;
    }
  } catch {
    // Só telemetria; o envio já aconteceu.
  }
}

interface RecallLoad {
  rows: RecallCandidate[];
  subs: SubscriptionRow[];
  skipped?: string;
}

/**
 * Passada 2: retornos (três dias antes de `return_due`). Nunca rejeita — sem
 * as colunas `return_*` (migração 2026-09-09) a passada só se declara pulada.
 */
async function loadRecall(recallDate: string, today: string): Promise<RecallLoad> {
  try {
    const [rows, subs] = await Promise.all([
      sql<RecallCandidate>`
        SELECT e.id, e.patient_id, p.name AS patient_name, pr.name AS professional_name, e.return_due
        FROM encounters e
        JOIN patients p ON p.id = e.patient_id
        JOIN professionals pr ON pr.id = e.professional_id
        WHERE e.return_due = ${recallDate}
          AND e.return_reminded_at IS NULL
          AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.patient_id = e.patient_id AND s.disabled = 0)
          AND NOT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.patient_id = e.patient_id AND a.date >= ${today} AND a.status IN ('agendado', 'confirmado'))
        ORDER BY e.id`,
      sql<SubscriptionRow>`
        SELECT s.id, s.patient_id, s.endpoint, s.p256dh, s.auth
        FROM push_subscriptions s
        WHERE s.disabled = 0
          AND s.patient_id IN (
            SELECT patient_id FROM encounters
            WHERE return_due = ${recallDate} AND return_reminded_at IS NULL)
        ORDER BY s.id`,
    ]);
    return { rows, subs };
  } catch (error) {
    return { rows: [], subs: [], skipped: migrationPending(error) ? "migration pending" : "query failed" };
  }
}

interface Tally {
  sent: number;
  failed: number;
  disabled: number;
}

/** Envia um payload a todas as assinaturas e soma o resultado; devolve quantas deram certo. */
async function sendToAll(subs: SubscriptionRow[], payload: ReturnType<typeof reminderPayload>, stamp: string, tally: Tally) {
  const results = await Promise.all(
    subs.map(async (sub) => {
      const result = await sendReminder(sub, payload);
      await recordResult(sub.id, result, stamp);
      return result;
    })
  );
  const okCount = results.filter((r) => r.ok).length;
  tally.sent += okCount;
  tally.failed += results.length - okCount;
  tally.disabled += results.filter((r) => !r.ok && r.gone).length;
  return okCount;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const today = todayISO();
  const dateParam = params.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : targetDateFor(today);
  const dry = params.get("dry") === "1" || !secret;
  const note = secret ? undefined : "CRON_SECRET ausente: só simulação";

  // As leituras da passada 2 não dependem da 1: saem juntas.
  const recallDate = recallDateFor(date);
  const recallLoad = loadRecall(recallDate, today);

  // ---- Passada 1: lembretes da véspera ----
  let candidates: Candidate[];
  let subscriptions: SubscriptionRow[];
  try {
    [candidates, subscriptions] = await Promise.all([
      sql<Candidate>`
        SELECT a.id, a.date, a.start_time, a.status, a.patient_id,
          p.name AS patient_name, pr.name AS professional_name
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        JOIN professionals pr ON pr.id = a.professional_id
        WHERE a.date = ${date}
          AND a.status IN ('agendado', 'confirmado')
          AND a.reminder_sent_at IS NULL
        ORDER BY a.start_time, a.id`,
      sql<SubscriptionRow>`
        SELECT s.id, s.patient_id, s.endpoint, s.p256dh, s.auth
        FROM push_subscriptions s
        WHERE s.disabled = 0
          AND s.patient_id IN (
            SELECT patient_id FROM appointments
            WHERE date = ${date}
              AND status IN ('agendado', 'confirmado')
              AND reminder_sent_at IS NULL)
        ORDER BY s.id`,
    ]);
  } catch (error) {
    // Migração ainda não rodou: 200 para o cron não alarmar; a recepção segue no WhatsApp.
    if (migrationPending(error)) return Response.json({ ok: true, skipped: "migration pending", date, dry });
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "db unreachable" },
      { status: 503 }
    );
  }

  const byPatient = groupByPatient(subscriptions);
  const targets = candidates.filter((a) => byPatient.has(a.patient_id));

  // ---- Passada 2: retornos (três dias antes de `return_due`) ----
  const { rows: recallRows, subs: recallSubs, skipped: recallSkipped } = await recallLoad;
  const recallByPatient = groupByPatient(recallSubs);

  const summary = {
    ok: true,
    date,
    dry,
    candidates: candidates.length,
    withPush: targets.length,
    sent: 0,
    failed: 0,
    disabled: 0,
  };
  const recall: { date: string; candidates: number; sent: number; failed: number; skipped?: string } = {
    date: recallDate,
    candidates: recallRows.length,
    sent: 0,
    failed: 0,
    ...(recallSkipped ? { skipped: recallSkipped } : {}),
  };

  if (dry || (targets.length === 0 && recallRows.length === 0)) return Response.json({ ...summary, recall, note });
  if (!pushConfigured()) return Response.json({ ...summary, recall, skipped: "vapid not configured" });

  const [clinic, base, secretKey, stamp] = [
    await clinicName(),
    baseUrl(request.headers, process.env.VERCEL_PROJECT_PRODUCTION_URL),
    getSessionSecret(),
    stampSaoPaulo(),
  ];
  const portalExpiry = addDaysISO(today, 30);

  for (const appointment of targets) {
    const token = signPatientToken(appointment.patient_id, portalExpiry, secretKey);
    const payload = reminderPayload({
      appointmentId: appointment.id,
      firstName: firstName(appointment.patient_name),
      date: appointment.date,
      start_time: appointment.start_time,
      professional: appointment.professional_name,
      clinic,
      url: `${base}/p/${token}`,
      status: appointment.status,
      today,
    });

    const okCount = await sendToAll(byPatient.get(appointment.patient_id) ?? [], payload, stamp, summary);
    if (okCount > 0) {
      try {
        await sql`UPDATE appointments SET reminder_sent_at = ${stamp} WHERE id = ${appointment.id} AND reminder_sent_at IS NULL`;
      } catch {
        // Sem a marca, o pior caso é repetir o aviso na próxima rodada.
      }
    }
  }

  const recallTally: Tally = { sent: 0, failed: 0, disabled: 0 };
  for (const encounter of recallRows) {
    const token = signPatientToken(encounter.patient_id, portalExpiry, secretKey);
    // O clique abre o portal, onde o card "Retorno recomendado" leva ao agendamento.
    const payload = recallPayload({
      encounterId: encounter.id,
      firstName: firstName(encounter.patient_name),
      professional: encounter.professional_name,
      dueDate: encounter.return_due,
      url: `${base}/p/${token}`,
    });

    const okCount = await sendToAll(recallByPatient.get(encounter.patient_id) ?? [], payload, stamp, recallTally);
    if (okCount > 0) {
      try {
        await sql`UPDATE encounters SET return_reminded_at = ${stamp} WHERE id = ${encounter.id} AND return_reminded_at IS NULL`;
      } catch {
        // Idem: sem a marca, repete na próxima rodada.
      }
    }
  }
  recall.sent = recallTally.sent;
  recall.failed = recallTally.failed;
  summary.disabled += recallTally.disabled;

  return Response.json({ ...summary, recall, note });
}
