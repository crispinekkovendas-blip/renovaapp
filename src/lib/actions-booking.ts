"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sql } from "./db";
import type { Schedule } from "./db";
import { getSession } from "./auth";
import { todayISO } from "./format";
import { addMinutes } from "./booking-slots";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Teto de agendamentos online recentes no total. Trava um flood roteirizado
 * antes que ele entupa a agenda.
 */
const MAX_ONLINE_PER_WINDOW = 10;

/** Teto por telefone em 24h — um número não remarca a clínica inteira. */
const MAX_PER_PHONE_PER_DAY = 3;

/**
 * Limitação de taxa do portal público.
 *
 * Conta agendamentos já criados em vez de tentativas por IP: o papel do app não
 * tem privilégio de DDL em produção (ver db.ts), então não há como criar a
 * tabela de tentativas que o controle por IP exigiria. Isto barra o abuso que
 * de fato importa — encher a agenda — mas não sondagem sem gravação. Para
 * limitar por IP: regra de rate limiting no Vercel WAF, ou a migração que cria
 * `booking_attempts` rodada via Supabase.
 */
async function enforceBookingRateLimit(phone: string, backBase: string): Promise<void> {
  const [{ recent }] = await sql<{ recent: number }>`
    SELECT COUNT(*)::int AS recent FROM appointments
    WHERE source = 'online'
      AND created_at >= to_char(
        timezone('America/Sao_Paulo', now()) - interval '10 minutes',
        'YYYY-MM-DD HH24:MI:SS')`;
  if (recent >= MAX_ONLINE_PER_WINDOW) {
    redirect("/agendar?erro=limite");
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) return;

  const [{ mine }] = await sql<{ mine: number }>`
    SELECT COUNT(*)::int AS mine FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.source = 'online'
      AND regexp_replace(COALESCE(p.phone,''), '\\D', '', 'g') = ${digits}
      AND a.created_at >= to_char(
        timezone('America/Sao_Paulo', now()) - interval '24 hours',
        'YYYY-MM-DD HH24:MI:SS')`;
  if (mine >= MAX_PER_PHONE_PER_DAY) {
    redirect(`${backBase}&erro=limite_telefone`);
  }
}

/** Teto de tentativas por IP em 10 min — sondagem sem gravar também conta. */
const MAX_ATTEMPTS_PER_IP = 20;

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? "";
  return (forwarded.split(",")[0] || h.get("x-real-ip") || "").trim() || "desconhecido";
}

/**
 * Registra a tentativa e barra IP acima do teto. Tolerante à ausência da
 * tabela `booking_attempts` (migração 2026-09-06): até ela rodar, o portal
 * segue só com os limites por agendamento criado — o limitador nunca derruba
 * um agendamento legítimo por causa de si mesmo.
 */
async function enforceIpRateLimit(): Promise<void> {
  const ip = await clientIp();
  let attempts = 0;
  try {
    await sql`INSERT INTO booking_attempts (ip) VALUES (${ip})`;
    const [{ n }] = await sql<{ n: number }>`
      SELECT COUNT(*)::int AS n FROM booking_attempts
      WHERE ip = ${ip}
        AND created_at >= to_char(
          timezone('America/Sao_Paulo', now()) - interval '10 minutes',
          'YYYY-MM-DD HH24:MI:SS')`;
    attempts = n;
    // Limpeza barata na primeira tentativa de cada IP: linha de mais de um dia não serve para nada.
    if (attempts === 1) {
      await sql`DELETE FROM booking_attempts
        WHERE created_at < to_char(
          timezone('America/Sao_Paulo', now()) - interval '1 day',
          'YYYY-MM-DD HH24:MI:SS')`;
    }
  } catch {
    return;
  }
  // redirect() lança — fica fora do try para não ser engolido.
  if (attempts > MAX_ATTEMPTS_PER_IP) redirect("/agendar?erro=limite");
}

// ---------- Agendamento online (público — sem sessão) ----------

export async function createPublicBookingAction(formData: FormData): Promise<void> {
  await enforceIpRateLimit();

  // Honeypot: bots preenchem "website"; fingimos sucesso sem criar nada.
  if (str(formData, "website") !== "") {
    redirect("/agendar/confirmado");
  }

  const professionalId = Number(str(formData, "professional_id"));
  const date = str(formData, "date");
  const time = str(formData, "time");
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email");

  const backBase = `/agendar?prof=${professionalId}&date=${date}&time=${time}`;

  if (!professionalId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    redirect("/agendar?erro=campos");
  }
  if (!name || phone.replace(/\D/g, "").length < 8) {
    redirect(`${backBase}&erro=campos`);
  }
  if (date < todayISO()) {
    redirect(`/agendar?prof=${professionalId}&erro=indisponivel`);
  }
  // LGPD: consentimento explícito para tratar nome/telefone/e-mail. O
  // `required` do navegador cobre humanos; isto cobre quem pula o formulário.
  if (str(formData, "consent") === "") {
    redirect(`${backBase}&erro=consentimento`);
  }

  await enforceBookingRateLimit(phone, backBase);

  const [professional] = await sql<{ id: number }>`
    SELECT id FROM professionals WHERE id = ${professionalId} AND active = 1`;
  if (!professional) redirect("/agendar?erro=campos");

  // O horário precisa cair dentro de uma janela de atendimento do profissional.
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const [window] = await sql<Schedule>`
    SELECT * FROM schedules
    WHERE professional_id = ${professionalId} AND weekday = ${weekday}
      AND start_time <= ${time} AND end_time > ${time}`;
  if (!window) {
    redirect(`/agendar?prof=${professionalId}&date=${date}&erro=indisponivel`);
  }

  const endTime = addMinutes(time, window.slot_minutes);

  const [conflict] = await sql`
    SELECT id FROM appointments
    WHERE professional_id = ${professionalId} AND date = ${date}
      AND status NOT IN ('cancelado','faltou')
      AND start_time < ${endTime} AND end_time > ${time}`;
  if (conflict) {
    redirect(`/agendar?prof=${professionalId}&date=${date}&erro=ocupado`);
  }

  const digits = phone.replace(/\D/g, "");
  const [existing] = await sql<{ id: number }>`
    SELECT id FROM patients
    WHERE regexp_replace(COALESCE(phone,''), '\\D', '', 'g') = ${digits}
    ORDER BY id LIMIT 1`;

  let patientId: number;
  if (existing) {
    patientId = existing.id;
  } else {
    const [created] = await sql<{ id: number }>`
      INSERT INTO patients (name, phone, email)
      VALUES (${name}, ${phone}, ${email || null}) RETURNING id`;
    patientId = created.id;
  }

  await sql`
    INSERT INTO appointments (patient_id, professional_id, date, start_time, end_time, procedure, status, source)
    VALUES (${patientId}, ${professionalId}, ${date}, ${time}, ${endTime}, 'Consulta', 'agendado', 'online')`;

  revalidatePath("/", "layout");
  redirect(`/agendar/confirmado?prof=${professionalId}&date=${date}&time=${time}`);
}

// ---------- Horários de atendimento (admin) ----------

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");
  return session;
}

export async function addScheduleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const professionalId = Number(str(formData, "professional_id"));
  const weekday = Number(str(formData, "weekday"));
  const startTime = str(formData, "start_time");
  const endTime = str(formData, "end_time");
  const slotMinutes = Number(str(formData, "slot_minutes") || "30");

  if (
    !professionalId ||
    !Number.isInteger(weekday) || weekday < 0 || weekday > 6 ||
    !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) ||
    startTime >= endTime
  ) {
    redirect("/configuracoes/horarios?erro=campos");
  }

  await sql`
    INSERT INTO schedules (professional_id, weekday, start_time, end_time, slot_minutes)
    VALUES (${professionalId}, ${weekday}, ${startTime}, ${endTime}, ${slotMinutes})`;
  revalidatePath("/", "layout");
  redirect("/configuracoes/horarios");
}

export async function deleteScheduleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(str(formData, "id"));
  if (id) await sql`DELETE FROM schedules WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/configuracoes/horarios");
}
