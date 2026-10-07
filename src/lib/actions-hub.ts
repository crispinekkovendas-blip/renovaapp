"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { getSession, getSessionSecret } from "./auth";
import { verifyPatientToken } from "./patient-token.ts";
import { addDaysISO, todayISO } from "./format";
import {
  RATING_COMMENT_MAX,
  RENEWAL_MAX,
  RESCHEDULE_MAX,
  normalizePreConsult,
  normalizeText,
  parsePublish,
  parseRating,
  parseRenewalAnswers,
  serializeRenewalAnswers,
} from "./hub-forms.ts";
import { PIN_COOKIE_DAYS, pinCookieName, pinMatches, signPinCookie } from "./hub-pin.ts";

/**
 * O que o paciente manda pelo portal (`/p/[token]`): pedido de remarcação,
 * avaliação da consulta, pré-consulta, pedido de renovação de receita e o
 * código de acesso. Ações públicas, sem sessão — a autorização é o token
 * assinado do próprio portal, que vem num campo oculto. Ids de consulta e de
 * receita também vêm do formulário, mas só valem se forem daquele paciente e
 * estiverem no estado certo; nunca se confia neles sozinhos.
 *
 * Todas gravam em `hub_submissions` (migração 2026-09-07-hub-push; o kind
 * 'renovacao' vem com a 2026-09-09). Se a tabela ainda não existe ou o CHECK
 * antigo recusa (23514), o paciente volta ao portal com `?erro=indisponivel`
 * em vez de ver um erro 500.
 */

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Token verificado → id do paciente. Inválido ou vencido, volta ao portal,
 * que mostra "link vencido". O token só é embutido numa URL depois de
 * verificado — aí sabemos que é base64url + ponto, sem surpresas.
 */
function verifiedPatient(token: string): number {
  const verified = verifyPatientToken(token, getSessionSecret(), todayISO());
  if (!verified) redirect(`/p/${encodeURIComponent(token || "invalido")}`);
  return verified.patientId;
}

/**
 * Consulta que existe, é deste paciente e está no estado certo: ainda de pé
 * (`upcoming`: agendada/confirmada) para remarcar e adiantar, ou realizada
 * (`concluido`) para avaliar.
 * `redirect()` lança — por isso nenhuma chamada dele fica dentro de try/catch.
 */
async function ownedAppointment(id: number, patientId: number, state: "upcoming" | "done"): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) return false;
  const rows =
    state === "upcoming"
      ? await sql<{ id: number }>`
          SELECT id FROM appointments
          WHERE id = ${id} AND patient_id = ${patientId} AND status IN ('agendado', 'confirmado')`
      : await sql<{ id: number }>`
          SELECT id FROM appointments
          WHERE id = ${id} AND patient_id = ${patientId} AND status = 'concluido'`;
  return rows.length > 0;
}

type Attempt<T> = { ok: true; value: T } | { ok: false };

/** Roda uma query que pode falhar por a tabela não existir; quem chama decide o redirect. */
async function attempt<T>(run: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, value: await run() };
  } catch {
    return { ok: false };
  }
}

async function alreadySent(appointmentId: number, kind: string, pendingOnly: boolean): Promise<Attempt<boolean>> {
  return attempt(async () => {
    const rows = pendingOnly
      ? await sql<{ id: number }>`
          SELECT id FROM hub_submissions
          WHERE appointment_id = ${appointmentId} AND kind = ${kind} AND handled_at IS NULL
          LIMIT 1`
      : await sql<{ id: number }>`
          SELECT id FROM hub_submissions
          WHERE appointment_id = ${appointmentId} AND kind = ${kind}
          LIMIT 1`;
    return rows.length > 0;
  });
}

// ---------- Pedir remarcação ----------

export async function requestRescheduleAction(formData: FormData): Promise<void> {
  const token = str(formData, "token");
  const patientId = verifiedPatient(token);
  const back = (query: string) => `/p/${token}${query}`;

  const appointmentId = Number(str(formData, "appointment_id"));
  if (!(await ownedAppointment(appointmentId, patientId, "upcoming"))) {
    redirect(back("?erro=estado"));
  }

  const message = normalizeText(formData.get("message"), RESCHEDULE_MAX);
  if (!message) redirect(back("?erro=vazio"));

  const pending = await alreadySent(appointmentId, "remarcacao", true);
  if (!pending.ok) redirect(back("?erro=indisponivel"));
  if (pending.value) redirect(back("?erro=ja_pedido"));

  const inserted = await attempt(
    () => sql`
      INSERT INTO hub_submissions (patient_id, appointment_id, kind, message)
      VALUES (${patientId}, ${appointmentId}, 'remarcacao', ${message})`
  );
  if (!inserted.ok) redirect(back("?erro=indisponivel"));

  revalidatePath("/", "layout");
  redirect(back("?ok=remarcacao"));
}

// ---------- Avaliar a consulta ----------

export async function rateVisitAction(formData: FormData): Promise<void> {
  const token = str(formData, "token");
  const patientId = verifiedPatient(token);
  const back = (query: string) => `/p/${token}${query}`;

  const appointmentId = Number(str(formData, "appointment_id"));
  if (!(await ownedAppointment(appointmentId, patientId, "done"))) {
    redirect(back("?erro=estado"));
  }

  const rating = parseRating(formData.get("rating"));
  if (rating === null) redirect(back("?erro=nota"));
  const message = normalizeText(formData.get("message"), RATING_COMMENT_MAX) || null;
  // Publicar só faz sentido com comentário: a página da clínica mostra a frase.
  const publish = message ? parsePublish(formData.get("publish")) : 0;

  const rated = await alreadySent(appointmentId, "avaliacao", false);
  if (!rated.ok) redirect(back("?erro=indisponivel"));
  if (rated.value) redirect(back("?erro=ja_avaliado"));

  const inserted = await attempt(
    () => sql`
      INSERT INTO hub_submissions (patient_id, appointment_id, kind, rating, message, publish)
      VALUES (${patientId}, ${appointmentId}, 'avaliacao', ${rating}, ${message}, ${publish})`
  );
  if (!inserted.ok) redirect(back("?erro=indisponivel"));

  revalidatePath("/", "layout");
  redirect(back("?ok=avaliacao"));
}

// ---------- Pré-consulta ----------

export async function preConsultAction(formData: FormData): Promise<void> {
  const token = str(formData, "token");
  const patientId = verifiedPatient(token);
  const back = (query: string) => `/p/${token}${query}`;

  const appointmentId = Number(str(formData, "appointment_id"));
  if (!(await ownedAppointment(appointmentId, patientId, "upcoming"))) {
    redirect(back("?erro=estado"));
  }

  const answers = normalizePreConsult({
    motivo: formData.get("motivo"),
    sintomas: formData.get("sintomas"),
    medicamentos: formData.get("medicamentos"),
    alergias: formData.get("alergias"),
  });
  if (!answers) redirect(back("?erro=vazio"));

  const sent = await alreadySent(appointmentId, "pre_consulta", false);
  if (!sent.ok) redirect(back("?erro=indisponivel"));
  if (sent.value) redirect(back("?erro=ja_enviado"));

  const inserted = await attempt(
    () => sql`
      INSERT INTO hub_submissions (patient_id, appointment_id, kind, answers)
      VALUES (${patientId}, ${appointmentId}, 'pre_consulta', ${JSON.stringify(answers)})`
  );
  if (!inserted.ok) redirect(back("?erro=indisponivel"));

  revalidatePath("/", "layout");
  redirect(back("?ok=pre_consulta"));
}

// ---------- Pedir renovação de receita ----------

interface OwnedPrescription {
  id: number;
  memed_prescription_id: string;
  created_at: string;
}

export async function requestRenewalAction(formData: FormData): Promise<void> {
  const token = str(formData, "token");
  const patientId = verifiedPatient(token);
  const back = (query: string) => `/p/${token}${query}`;

  // A receita precisa ser deste paciente e estar de pé (não excluída na Memed).
  const prescriptionId = str(formData, "prescription_id");
  const owned = await attempt(async () => {
    if (!prescriptionId) return null;
    const [row] = await sql<OwnedPrescription>`
      SELECT id, memed_prescription_id, created_at FROM memed_prescriptions
      WHERE patient_id = ${patientId} AND memed_prescription_id = ${prescriptionId} AND status = 'emitida'`;
    return row ?? null;
  });
  if (!owned.ok) redirect(back("?erro=indisponivel"));
  if (!owned.value) redirect(back("?erro=receita"));
  const prescription = owned.value;

  const message = normalizeText(formData.get("message"), RENEWAL_MAX) || null;

  // Um pedido pendente por receita: os pendentes deste paciente são poucos,
  // então o JSON é lido aqui em vez de filtrado no banco.
  const pending = await attempt(async () => {
    const rows = await sql<{ answers: string | null }>`
      SELECT answers FROM hub_submissions
      WHERE patient_id = ${patientId} AND kind = 'renovacao' AND handled_at IS NULL`;
    return rows.some((row) => parseRenewalAnswers(row.answers)?.memed_prescription_id === prescription.memed_prescription_id);
  });
  if (!pending.ok) redirect(back("?erro=indisponivel"));
  if (pending.value) redirect(back("?erro=ja_pedido&de=renovacao"));

  const answers = serializeRenewalAnswers({
    memed_prescription_id: prescription.memed_prescription_id,
    prescription_created_at: prescription.created_at,
  });
  // CHECK antigo sem 'renovacao' (23514) cai aqui também → indisponível.
  const inserted = await attempt(
    () => sql`
      INSERT INTO hub_submissions (patient_id, appointment_id, kind, message, answers)
      VALUES (${patientId}, NULL, 'renovacao', ${message}, ${answers})`
  );
  if (!inserted.ok) redirect(back("?erro=indisponivel"));

  revalidatePath("/", "layout");
  redirect(back("?ok=renovacao"));
}

// ---------- Código de acesso (PIN) ----------

/** Só um caminho dentro do portal deste token pode ser o destino depois do PIN. */
function portalTarget(token: string, redirectTo: string): string {
  const root = `/p/${token}`;
  const safe = /^[A-Za-z0-9_./-]+$/.test(redirectTo) && !redirectTo.includes("//");
  if (safe && (redirectTo === root || redirectTo.startsWith(`${root}/`))) return redirectTo;
  return root;
}

/**
 * Confere os 4 últimos dígitos do celular cadastrado e, se bater, grava o
 * cookie assinado por 30 dias (path `/p`, para valer também no próximo link
 * do mesmo paciente). Errou → `?erro=pin` na mesma página.
 */
export async function unlockPortalAction(formData: FormData): Promise<void> {
  const token = str(formData, "token");
  const patientId = verifiedPatient(token);
  const target = portalTarget(token, str(formData, "redirect_to"));

  const [patient] = await sql<{ phone: string | null }>`SELECT phone FROM patients WHERE id = ${patientId}`;
  if (!patient) redirect(`/p/${token}`);

  if (!pinMatches(str(formData, "pin"), patient.phone)) redirect(`${target}?erro=pin`);

  const expiresAt = addDaysISO(todayISO(), PIN_COOKIE_DAYS);
  (await cookies()).set(pinCookieName(patientId), signPinCookie(patientId, expiresAt, getSessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/p",
    maxAge: 60 * 60 * 24 * PIN_COOKIE_DAYS,
  });
  redirect(target);
}

// ---------- Lado da clínica ----------

/** Destinos aceitos depois de resolver um pedido: o dashboard ou o prontuário de onde veio. */
const BACK_PATH = /^\/(dashboard|pacientes\/\d+)$/;

/** Marca um pedido do portal como resolvido (`handled_at`). Exige sessão. */
export async function handleHubSubmissionAction(formData: FormData): Promise<void> {
  if (!(await getSession())) redirect("/login");

  const id = Number(str(formData, "id"));
  const redirectTo = str(formData, "redirect_to");
  const target = BACK_PATH.test(redirectTo) ? redirectTo : "/dashboard";

  if (Number.isInteger(id) && id > 0) {
    await attempt(
      () => sql`
        UPDATE hub_submissions
        SET handled_at = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
        WHERE id = ${id} AND handled_at IS NULL`
    );
  }

  revalidatePath("/", "layout");
  redirect(target);
}
