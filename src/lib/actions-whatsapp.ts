"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { requireRole } from "./auth";
import { generateOnce } from "./gemini";
import { parseMoneyBR, todayISO } from "./format";
import { optional, str } from "./form-fields.ts";
import { firstWithColumns, isMigrationPending } from "./pg-errors.ts";
import { parseReturnDays, returnDueFor } from "./recall.ts";
import { formatPhone, isoDate } from "./whatsapp/br.ts";
import { WA_CONFIG_KEY, normalizeWaConfig } from "./whatsapp/config.ts";
import { botMode, createChargeFor, loadContext, markPaid, send, simulateInbound } from "./whatsapp/engine.ts";
import { windowOpen } from "./whatsapp/flow.ts";
import { getCase, getThread, caseMessages, updateCase } from "./whatsapp/store.ts";
import { parseDraft } from "./whatsapp/triage.ts";
import {
  SUMMARY_SCHEMA,
  parseConsultSummary,
  summaryFromDraft,
  summarySystemPrompt,
  summaryUserPrompt,
} from "./whatsapp/summary.ts";

/** Atendimento pelo WhatsApp: médico e admin (dado de saúde — a recepção não entra). */
const staff = () => requireRole("admin", "profissional");

const casePath = (id: number, flash?: string) => `/whatsapp/${id}${flash ? `?${flash}` : ""}`;

async function loadCase(formData: FormData) {
  const id = Number(str(formData, "case_id"));
  const current = id ? await getCase(id) : null;
  const thread = current ? await getThread(current.thread_id) : null;
  if (!current || !thread) redirect("/whatsapp?erro=caso");
  return { current, thread };
}

/* ---------- Configuração ---------- */

export async function saveWhatsappConfigAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const config = normalizeWaConfig({
    ativo: formData.get("ativo") === "on",
    geminiPago: formData.get("gemini_pago") === "on",
    precoCentavos: parseMoneyBR(str(formData, "preco")),
    profissionalId: Number(str(formData, "profissional_id")) || null,
    vencimentoDias: Number(str(formData, "vencimento_dias")) || 1,
    boasVindas: str(formData, "boas_vindas"),
    consentimento: str(formData, "consentimento"),
    instrucoes: str(formData, "instrucoes"),
    pagamentoConfirmado: str(formData, "pagamento_confirmado"),
  });
  await sql`
    INSERT INTO settings (key, value) VALUES (${WA_CONFIG_KEY}, ${JSON.stringify(config)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  revalidatePath("/whatsapp", "layout");
  redirect("/whatsapp/configurar?ok=salvo");
}

/* ---------- Simulador ---------- */

/** Abre uma conversa de teste: as mensagens não saem para o WhatsApp, mas passam pelo mesmo robô. */
export async function simulateStartAction(formData: FormData): Promise<void> {
  const session = await staff();
  const text = str(formData, "text") || "Olá, gostaria de uma consulta";
  const phone = `sim-${session.userId}-${crypto.randomBytes(3).toString("hex")}`;
  let caseId: number | null = null;
  try {
    caseId = await simulateInbound(phone, text);
  } catch (error) {
    if (isMigrationPending(error)) redirect("/whatsapp/simulador?erro=migracao");
    throw error;
  }
  if (!caseId) redirect("/whatsapp/simulador?erro=envio");
  redirect(casePath(caseId));
}

const BUTTON_IDS: Record<string, string> = {
  Concordo: "consentir",
  "Não concordo": "recusar",
  "Está correto": "confirmar",
  "Quero corrigir": "corrigir",
};

export async function simulateSendAction(formData: FormData): Promise<void> {
  await staff();
  const { current, thread } = await loadCase(formData);
  if (!thread.simulated) redirect(casePath(current.id));
  const button = str(formData, "button");
  const text = button || str(formData, "text");
  if (!text) redirect(casePath(current.id));
  const caseId = await simulateInbound(thread.phone, text, button ? (BUTTON_IDS[button] ?? null) : null);
  redirect(casePath(caseId ?? current.id));
}

/** Simulação do webhook da ASAAS: o pagamento "cai". */
export async function simulatePaymentAction(formData: FormData): Promise<void> {
  await staff();
  const { current, thread } = await loadCase(formData);
  if (!thread.simulated) redirect(casePath(current.id));
  await markPaid(current.id, { method: "pix", source: "simulação" });
  redirect(casePath(current.id, "ok=pago"));
}

/* ---------- Conversa ---------- */

export async function staffSendAction(formData: FormData): Promise<void> {
  const session = await staff();
  const { current, thread } = await loadCase(formData);
  const text = str(formData, "text").slice(0, 4000);
  if (!text) redirect(casePath(current.id));
  if (!thread.simulated && !windowOpen(thread.last_inbound_at)) redirect(casePath(current.id, "erro=janela"));
  const result = await send(thread, current.id, { type: "text", body: text }, "equipe", session.userId);
  revalidatePath(`/whatsapp/${current.id}`);
  redirect(casePath(current.id, result.ok ? undefined : "erro=envio"));
}

export async function startConsultAction(formData: FormData): Promise<void> {
  const session = await staff();
  const { current } = await loadCase(formData);
  const professional = session.professionalId ?? current.professional_id;
  await updateCase(current.id, {
    stage: "consulta",
    professional_id: professional,
    consult_started_at: current.consult_started_at ?? new Date().toISOString(),
  });
  redirect(casePath(current.id));
}

export async function setBotPausedAction(formData: FormData): Promise<void> {
  await staff();
  const { current } = await loadCase(formData);
  await updateCase(current.id, { bot_paused: formData.get("paused") === "1" ? 1 : 0 });
  redirect(casePath(current.id));
}

/** Urgência que a equipe avaliou e liberou: a triagem continua. */
export async function resumeTriageAction(formData: FormData): Promise<void> {
  await staff();
  const { current } = await loadCase(formData);
  await updateCase(current.id, { stage: "triagem", bot_paused: 0 });
  redirect(casePath(current.id));
}

export async function closeCaseAction(formData: FormData): Promise<void> {
  await staff();
  const { current } = await loadCase(formData);
  await updateCase(current.id, { stage: "encerrado", closed_at: new Date().toISOString() });
  redirect("/whatsapp?ok=encerrado");
}

/* ---------- Pagamento ---------- */

export async function markPaidManualAction(formData: FormData): Promise<void> {
  await staff();
  const { current } = await loadCase(formData);
  if (current.stage !== "pagamento" && current.stage !== "revisao") redirect(casePath(current.id));
  await markPaid(current.id, { method: str(formData, "method") || "pix", source: "manual" });
  redirect(casePath(current.id, "ok=pago"));
}

export async function retryChargeAction(formData: FormData): Promise<void> {
  await staff();
  const { current, thread } = await loadCase(formData);
  const ctx = await loadContext();
  const charge = await createChargeFor(ctx, thread, { ...current, price_cents: current.price_cents || ctx.config.precoCentavos });
  if (!("url" in charge)) redirect(casePath(current.id, "erro=cobranca"));
  await send(thread, current.id, {
    type: "text",
    body: `Aqui está o link para o pagamento da sua teleconsulta (Pix, cartão ou boleto):\n${charge.url}`,
  });
  redirect(casePath(current.id, "ok=cobranca"));
}

/* ---------- Paciente ---------- */

export async function linkPatientAction(formData: FormData): Promise<void> {
  await staff();
  const { current, thread } = await loadCase(formData);
  const patientId = Number(str(formData, "patient_id"));
  if (!patientId) redirect(casePath(current.id));
  await sql`UPDATE wa_threads SET patient_id = ${patientId} WHERE id = ${thread.id}`;
  if (current.payment_id) await sql`UPDATE payments SET patient_id = ${patientId} WHERE id = ${current.payment_id} AND patient_id IS NULL`;
  redirect(casePath(current.id, "ok=vinculado"));
}

/** Cadastra o paciente com a ficha da triagem (que o médico acabou de conferir na tela). */
export async function createPatientFromTriageAction(formData: FormData): Promise<void> {
  await staff();
  const { current, thread } = await loadCase(formData);
  const draft = parseDraft(current.triage);
  const name = str(formData, "name") || draft.nome;
  if (!name) redirect(casePath(current.id, "erro=nome"));
  const negative = (s?: string) => !s || /^(nega|nenhum|nenhuma|n[aã]o)\b/i.test(s);
  const phone = thread.simulated ? null : formatPhone(thread.phone);
  const notes = "Cadastrado pela triagem do WhatsApp.";
  const values = {
    name,
    cpf: draft.cpf ?? null,
    birth: draft.nascimento && isoDate(draft.nascimento) ? draft.nascimento : null,
    sex: draft.sexo ?? null,
    city: draft.cidade ?? null,
    email: draft.email ?? null,
    allergies: negative(draft.alergias) ? null : (draft.alergias as string),
    medications: negative(draft.medicamentos) ? null : (draft.medicamentos as string),
  };
  const [created] = await firstWithColumns([
    () => sql<{ id: number }>`
      INSERT INTO patients (name, cpf, birth_date, sex, phone, email, city, notes, allergies, medications)
      VALUES (${values.name}, ${values.cpf}, ${values.birth}, ${values.sex}, ${phone}, ${values.email}, ${values.city},
        ${notes}, ${values.allergies}, ${values.medications})
      RETURNING id`,
    () => sql<{ id: number }>`
      INSERT INTO patients (name, cpf, birth_date, sex, phone, email, city, notes)
      VALUES (${values.name}, ${values.cpf}, ${values.birth}, ${values.sex}, ${phone}, ${values.email}, ${values.city}, ${notes})
      RETURNING id`,
  ]);
  await sql`UPDATE wa_threads SET patient_id = ${created.id} WHERE id = ${thread.id}`;
  if (current.payment_id) await sql`UPDATE payments SET patient_id = ${created.id} WHERE id = ${current.payment_id} AND patient_id IS NULL`;
  revalidatePath("/pacientes");
  redirect(casePath(current.id, "ok=cadastrado"));
}

/* ---------- Resumo e prontuário ---------- */

/** O Gemini lê a triagem e a conversa com o médico e sugere o atendimento (o médico edita antes de salvar). */
export async function generateSummaryAction(formData: FormData): Promise<void> {
  await staff();
  const { current } = await loadCase(formData);
  const draft = parseDraft(current.triage);
  const ctx = await loadContext();
  let summary = summaryFromDraft(draft);
  let flash = "ok=resumo_triagem";
  if (botMode(ctx.config) === "gemini") {
    const messages = await caseMessages(current.id, current.consult_started_at);
    const transcript = messages
      .filter((m) => m.author === "paciente" || m.author === "equipe")
      .map((m) => ({ author: m.author === "paciente" ? "Paciente" : "Médico", body: m.body }));
    try {
      const raw = await generateOnce({
        system: summarySystemPrompt(),
        contents: [{ role: "user", parts: [{ text: summaryUserPrompt(draft, transcript) }] }],
        schema: SUMMARY_SCHEMA as unknown as Record<string, unknown>,
        maxOutputTokens: 6000,
        temperature: 0.1,
      });
      const parsed = parseConsultSummary(raw);
      if (parsed) {
        summary = parsed;
        flash = "ok=resumo";
      } else flash = "erro=resumo";
    } catch {
      flash = "erro=resumo";
    }
  }
  await updateCase(current.id, { summary: JSON.stringify(summary) });
  redirect(casePath(current.id, flash) + "#resumo");
}

const lineList = (s: string | null) =>
  (s ?? "")
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Junta itens novos ao texto que já está no cadastro, sem repetir. */
function appendItems(existing: string | null, items: string[]): string | null {
  const have = lineList(existing);
  const lower = new Set(have.map((h) => h.toLowerCase()));
  const added = items.filter((i) => !lower.has(i.toLowerCase()));
  if (!added.length) return existing;
  return [...have, ...added].join("\n");
}

export async function saveWhatsappEncounterAction(formData: FormData): Promise<void> {
  const session = await staff();
  const { current, thread } = await loadCase(formData);
  const patientId = thread.patient_id;
  if (!patientId) redirect(casePath(current.id, "erro=paciente"));
  const professionalId = Number(str(formData, "professional_id")) || session.professionalId || current.professional_id;
  if (!professionalId) redirect(casePath(current.id, "erro=profissional") + "#resumo");

  const date = todayISO();
  const returnDays = parseReturnDays(str(formData, "return_days"));
  const returnDue = returnDueFor(date, returnDays);
  const cid = optional(formData, "cid")?.toUpperCase().slice(0, 12) ?? null;
  const fields = {
    complaint: optional(formData, "complaint"),
    anamnesis: optional(formData, "anamnesis"),
    exam: optional(formData, "exam"),
    diagnosis: optional(formData, "diagnosis"),
    plan: optional(formData, "plan"),
    prescription: optional(formData, "prescription"),
  };
  const [encounter] = await firstWithColumns([
    () => sql<{ id: number }>`
      INSERT INTO encounters (patient_id, professional_id, date, complaint, anamnesis, exam, diagnosis, plan, prescription,
        return_days, return_due, cid)
      VALUES (${patientId}, ${professionalId}, ${date}, ${fields.complaint}, ${fields.anamnesis}, ${fields.exam},
        ${fields.diagnosis}, ${fields.plan}, ${fields.prescription}, ${returnDays}, ${returnDue}, ${cid})
      RETURNING id`,
    () => sql<{ id: number }>`
      INSERT INTO encounters (patient_id, professional_id, date, complaint, anamnesis, exam, diagnosis, plan, prescription,
        return_days, return_due)
      VALUES (${patientId}, ${professionalId}, ${date}, ${fields.complaint}, ${fields.anamnesis}, ${fields.exam},
        ${fields.diagnosis}, ${fields.plan}, ${fields.prescription}, ${returnDays}, ${returnDue})
      RETURNING id`,
  ]);

  // Alergias e medicamentos em uso: somam ao cadastro (o que o médico deixou marcado).
  const allergies = lineList(optional(formData, "allergies"));
  const medications = lineList(optional(formData, "medications"));
  if (allergies.length || medications.length) {
    try {
      const [patient] = await sql<{ allergies: string | null; medications: string | null }>`
        SELECT allergies, medications FROM patients WHERE id = ${patientId}`;
      if (patient) {
        await sql`
          UPDATE patients SET allergies = ${appendItems(patient.allergies, allergies)},
            medications = ${appendItems(patient.medications, medications)}
          WHERE id = ${patientId}`;
      }
    } catch (error) {
      if (!isMigrationPending(error)) throw error;
    }
  }

  await updateCase(current.id, { encounter_id: encounter.id, stage: "encerrado", closed_at: new Date().toISOString() });
  revalidatePath("/", "layout");
  redirect(`/pacientes/${patientId}?aba=atendimentos`);
}
