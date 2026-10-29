import { sql, transaction } from "../db";
import type { Stage } from "./flow.ts";

/** Leitura e escrita das tabelas wa_* (migração 2026-10-29-whatsapp). */

export interface WaThread {
  id: number;
  phone: string;
  contact_name: string | null;
  patient_id: number | null;
  simulated: number;
  consent_at: string | null;
  last_inbound_at: string | null;
  last_message_at: string | null;
  unread: number;
  created_at: string;
}

export interface WaCase {
  id: number;
  thread_id: number;
  stage: Stage;
  triage: string;
  asking: string | null;
  turns: number;
  bot_paused: number;
  last_error: string | null;
  professional_id: number | null;
  price_cents: number;
  asaas_customer: string | null;
  asaas_payment_id: string | null;
  payment_url: string | null;
  paid_at: string | null;
  payment_id: number | null;
  consult_started_at: string | null;
  summary: string | null;
  encounter_id: number | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaMessage {
  id: number;
  thread_id: number;
  case_id: number | null;
  direction: "in" | "out";
  author: "paciente" | "robo" | "equipe" | "sistema";
  kind: string;
  body: string;
  button_id: string | null;
  wa_id: string | null;
  media_id: string | null;
  mime_type: string | null;
  status: string | null;
  error: string | null;
  handled: number;
  user_id: number | null;
  created_at: string;
}

export async function getThread(id: number): Promise<WaThread | null> {
  const [row] = await sql<WaThread>`SELECT * FROM wa_threads WHERE id = ${id}`;
  return row ?? null;
}

export async function getCase(id: number): Promise<WaCase | null> {
  const [row] = await sql<WaCase>`SELECT * FROM wa_cases WHERE id = ${id}`;
  return row ?? null;
}

export async function upsertThread(phone: string, contactName: string | null, simulated: boolean): Promise<WaThread> {
  const [row] = await sql<WaThread>`
    INSERT INTO wa_threads (phone, contact_name, simulated)
    VALUES (${phone}, ${contactName}, ${simulated ? 1 : 0})
    ON CONFLICT (phone) DO UPDATE SET contact_name = COALESCE(EXCLUDED.contact_name, wa_threads.contact_name)
    RETURNING *`;
  return row;
}

/**
 * O atendimento que recebe a mensagem: o aberto mais recente; um encerrado há
 * menos de 24 h ainda recebe (o "obrigado, doutor" não abre triagem nova).
 * Senão, abre um novo — direto na triagem se o paciente já consentiu antes.
 */
export async function caseForInbound(thread: WaThread): Promise<WaCase> {
  const [last] = await sql<WaCase>`SELECT * FROM wa_cases WHERE thread_id = ${thread.id} ORDER BY id DESC LIMIT 1`;
  const closedLongAgo =
    last &&
    (last.stage === "recusado" ||
      (last.stage === "encerrado" && (!last.closed_at || Date.now() - new Date(last.closed_at).getTime() > 24 * 3600_000)));
  if (last && !closedLongAgo) return last;
  const stage: Stage = thread.consent_at ? "triagem" : "consentimento";
  const [created] = await sql<WaCase>`
    INSERT INTO wa_cases (thread_id, stage) VALUES (${thread.id}, ${stage}) RETURNING *`;
  return created;
}

export async function insertInbound(input: {
  thread: WaThread;
  caseId: number;
  waId: string | null;
  kind: string;
  body: string;
  buttonId: string | null;
  mediaId: string | null;
  mimeType: string | null;
}): Promise<WaMessage | null> {
  const [row] = await sql<WaMessage>`
    INSERT INTO wa_messages (thread_id, case_id, direction, author, kind, body, button_id, wa_id, media_id, mime_type, status)
    VALUES (${input.thread.id}, ${input.caseId}, 'in', 'paciente', ${input.kind}, ${input.body}, ${input.buttonId},
      ${input.waId}, ${input.mediaId}, ${input.mimeType}, 'recebido')
    ON CONFLICT (wa_id) DO NOTHING
    RETURNING *`;
  if (!row) return null;
  await sql`
    UPDATE wa_threads SET last_inbound_at = now(), last_message_at = now(), unread = unread + 1
    WHERE id = ${input.thread.id}`;
  await sql`UPDATE wa_cases SET updated_at = now() WHERE id = ${input.caseId}`;
  return row;
}

export async function insertOutbound(input: {
  threadId: number;
  caseId: number | null;
  author: "robo" | "equipe" | "sistema";
  kind?: string;
  body: string;
  waId?: string | null;
  status: string;
  error?: string | null;
  userId?: number | null;
}): Promise<void> {
  await sql`
    INSERT INTO wa_messages (thread_id, case_id, direction, author, kind, body, wa_id, status, error, handled, user_id)
    VALUES (${input.threadId}, ${input.caseId}, 'out', ${input.author}, ${input.kind ?? "text"}, ${input.body},
      ${input.waId ?? null}, ${input.status}, ${input.error ?? null}, 1, ${input.userId ?? null})`;
  await sql`UPDATE wa_threads SET last_message_at = now() WHERE id = ${input.threadId}`;
}

export async function caseMessages(caseId: number, since?: string | null): Promise<WaMessage[]> {
  return since
    ? sql<WaMessage>`SELECT * FROM wa_messages WHERE case_id = ${caseId} AND created_at >= ${since} ORDER BY id`
    : sql<WaMessage>`SELECT * FROM wa_messages WHERE case_id = ${caseId} ORDER BY id`;
}

export async function updateCase(id: number, fields: Partial<Record<keyof WaCase, unknown>>): Promise<WaCase | null> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (!entries.length) return getCase(id);
  const changes = Object.fromEntries(entries) as Record<string, never>;
  // O `sql` daqui não monta SET dinâmico; o `tx` do postgres.js monta.
  return transaction(async (tx) => {
    const [row] = await tx`UPDATE wa_cases SET ${tx(changes)}, updated_at = now() WHERE id = ${id} RETURNING *`;
    return (row as unknown as WaCase) ?? null;
  });
}
