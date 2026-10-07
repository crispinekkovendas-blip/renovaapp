"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { isAppointmentStatus, isRole, sql } from "./db";
import type { Appointment, User } from "./db";
import { createSession, destroySession, requireRole, requireSession } from "./auth";
import type { Session } from "./auth";
import { addMinutesHHMM, parseMoneyBR, todayISO } from "./format";
import { normalizeInsurances } from "./clinic-public";
import { appendLines, parsePreConsultAnswers } from "./hub-forms.ts";
import { parseReturnDays, returnDueFor } from "./recall.ts";
import { lines, optional, safeBack, str, withQuery } from "./form-fields.ts";
import { readPatientForm, socialNameFrom } from "./patient-form.ts";
import { firstWithColumns, isMissingColumn } from "./pg-errors.ts";

/*
 * Colunas novas (42703 = coluna ausente): a migração 2026-09-09-documentos
 * (alergias, medicamentos, retorno) ou a 2026-09-16-emitir (nome social, RQE,
 * assinatura) pode ainda não ter rodado. As ações que gravam essas colunas
 * tentam com elas e, sem elas, gravam do jeito antigo (`firstWithColumns`).
 */

/** Configurações é só do admin; os outros perfis voltam para a própria página, como sempre. */
async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/configuracoes");
  return session;
}

/** Financeiro: os mesmos perfis que o layout de /financeiro deixa entrar. */
function requireFinance(): Promise<Session> {
  return requireRole("admin", "recepcao");
}

async function upsertSettings(entries: ReadonlyArray<readonly [string, string]>): Promise<void> {
  // Um statement só: grava tudo ou nada, numa ida ao banco.
  await sql`
    INSERT INTO settings (key, value)
    SELECT * FROM unnest(${entries.map(([key]) => key)}::text[], ${entries.map(([, value]) => value)}::text[])
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

// ---------- Autenticação ----------

export async function loginAction(formData: FormData): Promise<void> {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [user] = await sql<Pick<User, "id" | "name" | "role" | "professional_id" | "password_hash">>`
    SELECT id, name, role, professional_id, password_hash FROM users WHERE email = ${email} AND active = 1`;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    redirect("/login?erro=1");
  }
  await createSession(user);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ---------- Pacientes ----------

export async function createPatientAction(formData: FormData): Promise<void> {
  await requireSession();
  const p = readPatientForm(formData);
  if (!p.name) redirect("/pacientes/novo?erro=nome");

  const [row] = await firstWithColumns([
    () => sql<{ id: number }>`
      INSERT INTO patients (name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city, notes,
        allergies, medications, social_name)
      VALUES (${p.name}, ${p.cpf}, ${p.birthDate}, ${p.sex}, ${p.phone}, ${p.email}, ${p.insurance}, ${p.insuranceNumber},
        ${p.city}, ${p.notes}, ${p.allergies}, ${p.medications}, ${p.socialName})
      RETURNING id`,
    // Sem a migração 2026-09-16: cadastro sem nome social.
    () => sql<{ id: number }>`
      INSERT INTO patients (name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city, notes,
        allergies, medications)
      VALUES (${p.name}, ${p.cpf}, ${p.birthDate}, ${p.sex}, ${p.phone}, ${p.email}, ${p.insurance}, ${p.insuranceNumber},
        ${p.city}, ${p.notes}, ${p.allergies}, ${p.medications})
      RETURNING id`,
    // Sem a 2026-09-09 também: cadastro sem alergias/medicamentos.
    () => sql<{ id: number }>`
      INSERT INTO patients (name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city, notes)
      VALUES (${p.name}, ${p.cpf}, ${p.birthDate}, ${p.sex}, ${p.phone}, ${p.email}, ${p.insurance}, ${p.insuranceNumber},
        ${p.city}, ${p.notes})
      RETURNING id`,
  ]);
  revalidatePath("/", "layout");
  redirect(`/pacientes/${row.id}`);
}

export async function updatePatientAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = Number(str(formData, "id"));
  const p = readPatientForm(formData);
  if (!id || !p.name) redirect("/pacientes");

  await firstWithColumns([
    () => sql`
      UPDATE patients SET name = ${p.name}, cpf = ${p.cpf}, birth_date = ${p.birthDate}, sex = ${p.sex},
        phone = ${p.phone}, email = ${p.email}, insurance = ${p.insurance}, insurance_number = ${p.insuranceNumber},
        city = ${p.city}, notes = ${p.notes}, allergies = ${p.allergies}, medications = ${p.medications},
        social_name = ${p.socialName}
      WHERE id = ${id}`,
    // Sem a migração 2026-09-16: sem nome social.
    () => sql`
      UPDATE patients SET name = ${p.name}, cpf = ${p.cpf}, birth_date = ${p.birthDate}, sex = ${p.sex},
        phone = ${p.phone}, email = ${p.email}, insurance = ${p.insurance}, insurance_number = ${p.insuranceNumber},
        city = ${p.city}, notes = ${p.notes}, allergies = ${p.allergies}, medications = ${p.medications}
      WHERE id = ${id}`,
    // Sem a 2026-09-09 também: sem alergias/medicamentos.
    () => sql`
      UPDATE patients SET name = ${p.name}, cpf = ${p.cpf}, birth_date = ${p.birthDate}, sex = ${p.sex},
        phone = ${p.phone}, email = ${p.email}, insurance = ${p.insurance}, insurance_number = ${p.insuranceNumber},
        city = ${p.city}, notes = ${p.notes}
      WHERE id = ${id}`,
  ]);
  revalidatePath("/", "layout");
  redirect(`/pacientes/${id}`);
}

/**
 * A gaveta "Perfil" do compositor: só o essencial do cadastro — nome social,
 * CPF, celular, alergias e medicamentos em uso — sem mexer no resto. Volta
 * para a URL `back` (o próprio compositor) com `?ok=perfil`; a pilha em
 * montagem sobrevive porque fica no sessionStorage. Sem a migração
 * 2026-09-16 grava sem nome social; sem a 2026-09-09, só CPF e celular.
 */
export async function updatePatientEssentialsAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = Number(str(formData, "id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/pacientes");
  const back = safeBack(formData, `/pacientes/${id}`);
  const socialName = socialNameFrom(formData);
  const cpf = optional(formData, "cpf")?.slice(0, 20) ?? null;
  const phone = optional(formData, "phone")?.slice(0, 30) ?? null;
  const allergies = lines(formData, "allergies");
  const medications = lines(formData, "medications");

  await firstWithColumns([
    () => sql`
      UPDATE patients SET social_name = ${socialName}, cpf = ${cpf}, phone = ${phone},
        allergies = ${allergies}, medications = ${medications}
      WHERE id = ${id}`,
    // Sem a migração 2026-09-16: sem nome social.
    () => sql`
      UPDATE patients SET cpf = ${cpf}, phone = ${phone}, allergies = ${allergies}, medications = ${medications}
      WHERE id = ${id}`,
    // Sem a 2026-09-09 também: só CPF e celular.
    () => sql`UPDATE patients SET cpf = ${cpf}, phone = ${phone} WHERE id = ${id}`,
  ]);
  revalidatePath("/", "layout");
  redirect(withQuery(back, "ok", "perfil"));
}

/**
 * "Usar no cadastro": copia alergias e medicamentos respondidos na pré-consulta
 * para a ficha do paciente — acrescentando ao que já existe, nunca apagando.
 */
export async function adoptPreConsultAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = Number(str(formData, "id"));
  const patientId = Number(str(formData, "patient_id"));
  if (!patientId) redirect("/pacientes");
  const back = (query: string) => `/pacientes/${patientId}${query}`;

  let submission: { answers: string | null } | undefined;
  try {
    [submission] = await sql<{ answers: string | null }>`
      SELECT answers FROM hub_submissions
      WHERE id = ${id} AND patient_id = ${patientId} AND kind = 'pre_consulta'`;
  } catch {
    redirect(back("?erro=migracao"));
  }
  const answers = parsePreConsultAnswers(submission?.answers);
  if (!answers || (!answers.alergias && !answers.medicamentos)) redirect(back("?erro=nada"));

  try {
    const [patient] = await sql<{ allergies: string | null; medications: string | null }>`
      SELECT allergies, medications FROM patients WHERE id = ${patientId}`;
    if (!patient) redirect("/pacientes");
    const allergies = appendLines(patient.allergies, answers.alergias) || null;
    const medications = appendLines(patient.medications, answers.medicamentos) || null;
    await sql`UPDATE patients SET allergies = ${allergies}, medications = ${medications} WHERE id = ${patientId}`;
  } catch (error) {
    if (isMissingColumn(error)) redirect(back("?erro=migracao"));
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(back("?ok=cadastro"));
}

// ---------- Agenda ----------

export async function createAppointmentAction(formData: FormData): Promise<void> {
  await requireSession();
  const patientId = Number(str(formData, "patient_id"));
  const professionalId = Number(str(formData, "professional_id"));
  const date = str(formData, "date") || todayISO();
  const startTime = str(formData, "start_time");
  const duration = Number(str(formData, "duration") || "30");
  const waitlistId = Number(str(formData, "waitlist_id")) || null;

  // Em caso de erro, voltar preservando o contexto (inclusive o encaixe da
  // lista de espera) — senão o vínculo com a entrada se perde no meio do fluxo.
  const retry = (erro: string) => {
    const query = new URLSearchParams({ date, erro });
    if (professionalId) query.set("prof", String(professionalId));
    if (patientId) query.set("patient", String(patientId));
    if (waitlistId) query.set("waitlist", String(waitlistId));
    return `/agenda/novo?${query.toString()}`;
  };

  if (!patientId || !professionalId || !startTime) {
    redirect(retry("campos"));
  }

  const endTime = addMinutesHHMM(startTime, duration);

  const [conflict] = await sql`
    SELECT id FROM appointments
    WHERE professional_id = ${professionalId} AND date = ${date} AND status NOT IN ('cancelado','faltou')
    AND start_time < ${endTime} AND end_time > ${startTime}`;
  if (conflict) {
    redirect(retry("conflito"));
  }

  await sql`
    INSERT INTO appointments (patient_id, professional_id, date, start_time, end_time, procedure, price_cents, notes)
    VALUES (${patientId}, ${professionalId}, ${date}, ${startTime}, ${endTime},
      ${str(formData, "procedure") || "Consulta"}, ${parseMoneyBR(str(formData, "price"))}, ${optional(formData, "notes")})`;

  // A entrada sai da lista de espera só agora, depois de o agendamento existir
  // de fato — era exatamente o elo que faltava.
  if (waitlistId) {
    await sql`UPDATE waitlist SET status = 'agendado' WHERE id = ${waitlistId} AND status = 'aguardando'`;
  }

  revalidatePath("/", "layout");
  redirect(`/agenda?date=${date}`);
}

export async function setAppointmentStatusAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = Number(str(formData, "id"));
  const status = str(formData, "status");
  const back = safeBack(formData, "/agenda");
  if (!id || !isAppointmentStatus(status)) redirect(back);

  await sql`UPDATE appointments SET status = ${status} WHERE id = ${id}`;

  if (status === "concluido") {
    const [appt] = await sql<Pick<Appointment, "patient_id" | "procedure" | "price_cents" | "date"> & { patient_name: string }>`
      SELECT a.patient_id, a.procedure, a.price_cents, a.date, p.name AS patient_name FROM appointments a
      JOIN patients p ON p.id = a.patient_id WHERE a.id = ${id}`;
    if (appt && appt.price_cents > 0) {
      const [existing] = await sql`SELECT id FROM payments WHERE appointment_id = ${id}`;
      if (!existing) {
        await sql`
          INSERT INTO payments (patient_id, appointment_id, description, amount_cents, status, due_date)
          VALUES (${appt.patient_id}, ${id}, ${`${appt.procedure} — ${appt.patient_name}`}, ${appt.price_cents}, 'pendente', ${appt.date})`;
      }
    }
  }

  revalidatePath("/", "layout");
  redirect(back);
}

// ---------- Prontuário ----------

export async function createEncounterAction(formData: FormData): Promise<void> {
  await requireSession();
  const patientId = Number(str(formData, "patient_id"));
  const professionalId = Number(str(formData, "professional_id"));
  if (!patientId || !professionalId) redirect("/pacientes");

  const date = str(formData, "date") || todayISO();
  const complaint = optional(formData, "complaint");
  const anamnesis = optional(formData, "anamnesis");
  const exam = optional(formData, "exam");
  const diagnosis = optional(formData, "diagnosis");
  const plan = optional(formData, "plan");
  const prescription = optional(formData, "prescription");
  // "Retorno em N dias" → data do retorno, que alimenta /agenda/retornos, o portal e o push.
  const returnDays = parseReturnDays(str(formData, "return_days"));
  const returnDue = returnDueFor(date, returnDays);

  try {
    await sql`
      INSERT INTO encounters (patient_id, professional_id, date, complaint, anamnesis, exam, diagnosis, plan, prescription,
        return_days, return_due)
      VALUES (${patientId}, ${professionalId}, ${date}, ${complaint}, ${anamnesis}, ${exam}, ${diagnosis}, ${plan},
        ${prescription}, ${returnDays}, ${returnDue})`;
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    await sql`
      INSERT INTO encounters (patient_id, professional_id, date, complaint, anamnesis, exam, diagnosis, plan, prescription)
      VALUES (${patientId}, ${professionalId}, ${date}, ${complaint}, ${anamnesis}, ${exam}, ${diagnosis}, ${plan},
        ${prescription})`;
  }
  revalidatePath("/", "layout");
  redirect(`/pacientes/${patientId}`);
}

/**
 * "Já marcou / ignorar" em /agenda/retornos: marca o retorno como tratado.
 * Reusa `return_reminded_at` — a mesma coluna que o push do cron preenche.
 */
export async function dismissRecallAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = Number(str(formData, "id"));
  const back = "/agenda/retornos";
  if (!id) redirect(back);
  try {
    await sql`
      UPDATE encounters
      SET return_reminded_at = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${id} AND return_reminded_at IS NULL`;
  } catch (error) {
    if (isMissingColumn(error)) redirect(`${back}?erro=migracao`);
    throw error;
  }
  revalidatePath("/", "layout");
  redirect(`${back}?ok=tratado`);
}

// ---------- Financeiro ----------

export async function createPaymentAction(formData: FormData): Promise<void> {
  await requireFinance();
  const description = str(formData, "description");
  const amount = parseMoneyBR(str(formData, "amount"));
  if (!description || amount <= 0) redirect("/financeiro?erro=campos");

  const patientId = Number(str(formData, "patient_id")) || null;
  const status = str(formData, "status") === "pago" ? "pago" : "pendente";
  const dueDate = str(formData, "due_date") || todayISO();

  await sql`
    INSERT INTO payments (patient_id, description, amount_cents, method, status, due_date, paid_at)
    VALUES (${patientId}, ${description}, ${amount}, ${optional(formData, "method")}, ${status}, ${dueDate},
      ${status === "pago" ? todayISO() : null})`;
  revalidatePath("/", "layout");
  redirect("/financeiro");
}

export async function payPaymentAction(formData: FormData): Promise<void> {
  await requireFinance();
  const id = Number(str(formData, "id"));
  const back = safeBack(formData, "/financeiro");
  if (!id) redirect(back);
  await sql`UPDATE payments SET status = 'pago', paid_at = ${todayISO()}, method = COALESCE(${optional(formData, "method")}, method) WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect(back);
}

// ---------- Configurações ----------

export async function createProfessionalAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) redirect("/configuracoes?erro=nome");
  await sql`INSERT INTO professionals (name, specialty, council, color)
    VALUES (${name}, ${str(formData, "specialty")}, ${str(formData, "council")}, ${str(formData, "color") || "#2f6553"})`;
  revalidatePath("/", "layout");
  redirect("/configuracoes");
}

export async function toggleProfessionalAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(str(formData, "id"));
  if (id) await sql`UPDATE professionals SET active = 1 - active WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/configuracoes");
}

/**
 * Dados que a Memed exige do prescritor e que o cadastro antigo não tinha.
 * Guardados separados de `council` (texto livre), que continua servindo o
 * receituário A4 — a Memed precisa de conselho, número e UF em campos próprios.
 */
export async function updateProfessionalMemedAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(str(formData, "id"));
  if (!id) redirect("/configuracoes");

  const cpf = str(formData, "cpf").replace(/\D/g, "");
  const boardNumber = str(formData, "board_number").replace(/\D/g, "");
  const boardCode = str(formData, "board_code").toUpperCase();
  const boardState = str(formData, "board_state").toUpperCase();
  const birthDate = str(formData, "birth_date");
  const specialtyId = str(formData, "memed_specialty_id").replace(/\D/g, "");

  if (cpf && cpf.length !== 11) redirect("/configuracoes?erro=cpf_prof");

  await sql`
    UPDATE professionals SET
      cpf = ${cpf || null},
      board_code = ${boardCode || null},
      board_number = ${boardNumber || null},
      board_state = ${boardState || null},
      birth_date = ${birthDate || null},
      memed_specialty_id = ${specialtyId || null}
    WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/configuracoes?ok=prescritor");
}

const SIGNATURE_TYPES = new Set(["image/png", "image/jpeg"]);
const SIGNATURE_MAX_BYTES = 300 * 1024;

/**
 * Assinatura digitalizada + RQE do profissional (migração 2026-09-16). A
 * imagem (PNG/JPEG, até 300 KB) vira data URL em `signature_image` e sai
 * impressa na folha dos documentos, com o carimbo (nome, conselho, RQE). Sem
 * arquivo novo e sem "remover", a assinatura atual não é tocada. Não é a
 * assinatura digital ICP-Brasil da receita — essa continua na Memed.
 */
export async function updateProfessionalSignatureAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(str(formData, "id"));
  if (!id) redirect("/configuracoes");

  const rqe = str(formData, "rqe").slice(0, 20) || null;
  // Input de arquivo vazio manda um File de tamanho 0 — conta como "sem arquivo".
  const upload = formData.get("signature");
  const file = upload instanceof File && upload.size > 0 ? upload : null;

  // undefined = manter a atual; null = remover; string = a nova data URL.
  let signature: string | null | undefined;
  if (file) {
    if (!SIGNATURE_TYPES.has(file.type)) redirect("/configuracoes?erro=assinatura_tipo");
    if (file.size > SIGNATURE_MAX_BYTES) redirect("/configuracoes?erro=assinatura_tamanho");
    const bytes = Buffer.from(await file.arrayBuffer());
    signature = `data:${file.type};base64,${bytes.toString("base64")}`;
  } else if (str(formData, "remove_signature") === "1") {
    signature = null;
  }

  try {
    if (signature === undefined) {
      await sql`UPDATE professionals SET rqe = ${rqe} WHERE id = ${id}`;
    } else {
      await sql`UPDATE professionals SET rqe = ${rqe}, signature_image = ${signature} WHERE id = ${id}`;
    }
  } catch (error) {
    if (isMissingColumn(error)) redirect("/configuracoes?erro=migracao");
    throw error;
  }
  revalidatePath("/", "layout");
  redirect("/configuracoes?ok=assinatura");
}

export async function createUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = str(formData, "role");
  if (!name || !email || password.length < 6) redirect("/configuracoes?erro=usuario");

  const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing) redirect("/configuracoes?erro=email");

  await sql`INSERT INTO users (name, email, password_hash, role, professional_id)
    VALUES (${name}, ${email}, ${bcrypt.hashSync(password, 10)},
      ${isRole(roleRaw) ? roleRaw : "recepcao"},
      ${Number(str(formData, "professional_id")) || null})`;
  revalidatePath("/", "layout");
  redirect("/configuracoes");
}

export async function updateClinicSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const entries: [string, string][] = [
    ["clinic_name", str(formData, "clinic_name") || "Clínica Renova"],
    ["clinic_phone", str(formData, "clinic_phone")],
    ["clinic_address", str(formData, "clinic_address")],
    ["clinic_document", str(formData, "clinic_document")],
    // CNES é obrigatório no `setWorkplace` da Memed para novos parceiros.
    ["clinic_cnes", str(formData, "clinic_cnes").replace(/\D/g, "")],
    // Convênios aceitos, lista separada por vírgula — vira os "chips" da página pública.
    ["clinic_insurances", normalizeInsurances(str(formData, "clinic_insurances"))],
  ];
  await upsertSettings(entries);
  revalidatePath("/", "layout");
  redirect("/configuracoes");
}

/**
 * Portal do paciente: `portal_pin` = "1" exige os 4 últimos dígitos do celular
 * antes de mostrar o portal. Formulário próprio para não mexer nos dados da
 * clínica ao salvar.
 */
export async function updatePortalSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const value = str(formData, "portal_pin") ? "1" : "0";
  await sql`INSERT INTO settings (key, value) VALUES ('portal_pin', ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  revalidatePath("/", "layout");
  redirect("/configuracoes?ok=portal");
}

export async function toggleUserAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(str(formData, "id"));
  if (id && id !== session.userId) await sql`UPDATE users SET active = 1 - active WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/configuracoes");
}
