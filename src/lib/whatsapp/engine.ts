import { sql } from "../db";
import { geminiEnabled, generateOnce } from "../gemini";
import { addDaysISO, moneyBR, todayISO } from "../format";
import { asaasReady, createCharge, ensureCustomer, methodLabel } from "./asaas.ts";
import { cloudReady, downloadMedia, sendCloud } from "./cloud.ts";
import type { InboundMessage, OutboundPayload } from "./cloud.ts";
import { DEFAULT_WA_CONFIG, WA_CONFIG_KEY, botCanTriage, fillClinic, parseWaConfig } from "./config.ts";
import type { WhatsappConfig } from "./config.ts";
import { decide, geminiContents, noteCorrection, questionnaireStep } from "./flow.ts";
import type { BotMode, Decision } from "./flow.ts";
import {
  TRIAGE_SCHEMA,
  URGENT_REPLY,
  mergeDraft,
  missingRequired,
  parseDraft,
  parseTriageTurn,
  summaryForPatient,
  triageSystemPrompt,
} from "./triage.ts";
import type { TriageDraft } from "./triage.ts";
import { caseForInbound, caseMessages, getCase, getThread, insertInbound, insertOutbound, updateCase, upsertThread } from "./store.ts";
import type { WaCase, WaMessage, WaThread } from "./store.ts";

/**
 * O motor do atendimento pelo WhatsApp: recebe a mensagem, decide (flow.ts),
 * conversa com o Gemini, cobra pela ASAAS e responde. Uma conversa por vez:
 * cada atendimento tem uma "trava" (`bot_busy_until`) — mensagens que chegam
 * enquanto o robô pensa são respondidas juntas na volta seguinte.
 */

export interface EngineContext {
  config: WhatsappConfig;
  clinic: string;
}

export async function loadContext(): Promise<EngineContext> {
  const rows = await sql<{ key: string; value: string }>`
    SELECT key, value FROM settings WHERE key IN (${WA_CONFIG_KEY}, 'clinic_name')`.catch(() => []);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return { config: parseWaConfig(map.get(WA_CONFIG_KEY)), clinic: map.get("clinic_name")?.trim() || "clínica" };
}

export function botMode(config: WhatsappConfig): BotMode {
  if (!config.ativo) return "off";
  return botCanTriage(config, geminiEnabled()) ? "gemini" : "questionario";
}

/* ---------- Envio ---------- */

/** Envia (ou só grava, na conversa simulada) e registra na conversa. */
export async function send(
  thread: WaThread,
  caseId: number | null,
  payload: OutboundPayload,
  author: "robo" | "equipe" | "sistema" = "robo",
  userId: number | null = null,
): Promise<{ ok: boolean; error?: string }> {
  const body =
    payload.type === "buttons" ? `${payload.body}\n${payload.buttons.map((b) => `[${b.title}]`).join(" ")}` : payload.body;
  if (thread.simulated) {
    await insertOutbound({ threadId: thread.id, caseId, author, body, status: "simulado", userId });
    return { ok: true };
  }
  const result = await sendCloud(thread.phone, payload);
  if ("waId" in result) {
    await insertOutbound({ threadId: thread.id, caseId, author, body, waId: result.waId, status: "enviado", userId });
    return { ok: true };
  }
  await insertOutbound({ threadId: thread.id, caseId, author, body, status: "erro", error: result.error, userId });
  return { ok: false, error: result.error };
}

/* ---------- Entrada ---------- */

/** Mensagem que chegou pelo webhook: grava (sem duplicar) e devolve o atendimento a processar. */
export async function receive(message: InboundMessage, simulated = false): Promise<{ threadId: number; caseId: number } | null> {
  const thread = await upsertThread(message.from, message.contactName, simulated);
  const current = await caseForInbound(thread);
  let body = message.text;
  if (message.kind === "audio") body = (await transcribe(message.mediaId)) ?? "[áudio — não consegui transcrever; ouça na conversa]";
  else if (message.kind === "image") body = `[imagem]${body ? ` ${body}` : ""}`;
  else if (message.kind === "document") body = `[documento]${body ? ` ${body}` : ""}`;
  else if (message.kind === "other" && !body) body = "[mensagem de um tipo que o Renova não lê — veja no celular]";
  const saved = await insertInbound({
    thread,
    caseId: current.id,
    waId: message.waId,
    kind: message.kind,
    body,
    buttonId: message.buttonId,
    mediaId: message.mediaId,
    mimeType: message.mimeType,
  });
  return saved ? { threadId: thread.id, caseId: current.id } : null;
}

/** Áudio do paciente → texto, pelo Gemini (só com o plano pago confirmado). */
async function transcribe(mediaId: string | null): Promise<string | null> {
  if (!mediaId) return null;
  const { config } = await loadContext();
  if (botMode(config) !== "gemini") return null;
  try {
    const media = await downloadMedia(mediaId);
    if (!media) return null;
    const text = await generateOnce({
      system: "Transcreva literalmente o áudio, em português do Brasil. Devolva só a transcrição, sem comentários.",
      contents: [
        { role: "user", parts: [{ inlineData: { mimeType: media.mime.split(";")[0], data: media.bytes.toString("base64") } }] },
      ],
      temperature: 0,
      maxOutputTokens: 2048,
    });
    return `[áudio] ${text.trim()}`;
  } catch (error) {
    console.warn("WhatsApp: transcrição falhou", String(error).slice(0, 200));
    return null;
  }
}

/* ---------- Processamento ---------- */

/** Trava o atendimento por até 2 min; só quem trava responde. */
async function claim(caseId: number): Promise<boolean> {
  const rows = await sql`
    UPDATE wa_cases SET bot_busy_until = now() + interval '2 minutes'
    WHERE id = ${caseId} AND (bot_busy_until IS NULL OR bot_busy_until < now())
    RETURNING id`;
  return rows.length > 0;
}

async function release(caseId: number): Promise<void> {
  await sql`UPDATE wa_cases SET bot_busy_until = NULL WHERE id = ${caseId}`;
}

/**
 * Responde as mensagens ainda não tratadas do atendimento. Quem chega
 * durante a resposta entra na volta seguinte (até 4 voltas).
 */
export async function processCase(caseId: number, depth = 0): Promise<void> {
  if (!(await claim(caseId))) return;
  await processClaimed(caseId);
  // Mensagem que chegou entre a última volta e a liberação da trava: quem a
  // recebeu não conseguiu travar, então ela é respondida aqui.
  const [left] = await sql<{ n: number }>`
    SELECT count(*)::int AS n FROM wa_messages WHERE case_id = ${caseId} AND direction = 'in' AND handled = 0`;
  if (left?.n && depth < 2) await processCase(caseId, depth + 1);
}

async function processClaimed(caseId: number): Promise<void> {
  try {
    const ctx = await loadContext();
    for (let round = 0; round < 4; round++) {
      const pending = await sql<WaMessage>`
        UPDATE wa_messages SET handled = 1
        WHERE case_id = ${caseId} AND direction = 'in' AND handled = 0
        RETURNING *`;
      if (!pending.length) break;
      pending.sort((a, b) => a.id - b.id);
      const current = await getCase(caseId);
      const thread = current && (await getThread(current.thread_id));
      if (!current || !thread) break;
      try {
        await step(ctx, thread, current, pending);
      } catch (error) {
        console.error("WhatsApp: falha no atendimento", caseId, error);
        await updateCase(caseId, { last_error: String(error).slice(0, 500) });
        await send(thread, caseId, {
          type: "text",
          body: "Desculpe, tive uma instabilidade aqui. Pode mandar sua última mensagem de novo, por favor?",
        });
      }
    }
  } finally {
    await release(caseId);
  }
}

async function lastBotMinutes(caseId: number): Promise<{ spoken: boolean; minutes: number | null }> {
  const [row] = await sql<{ at: string | null; n: number }>`
    SELECT max(created_at) AS at, count(*)::int AS n FROM wa_messages
    WHERE case_id = ${caseId} AND direction = 'out' AND author = 'robo'`;
  if (!row?.at) return { spoken: false, minutes: null };
  return { spoken: true, minutes: (Date.now() - new Date(row.at).getTime()) / 60_000 };
}

async function step(ctx: EngineContext, thread: WaThread, current: WaCase, pending: WaMessage[]): Promise<void> {
  const text = pending.map((m) => m.body).join("\n").trim();
  const buttonId = [...pending].reverse().find((m) => m.button_id)?.button_id ?? null;
  const mode = botMode(ctx.config);
  const bot = await lastBotMinutes(current.id);
  const decision: Decision = decide({
    stage: current.stage,
    mode,
    botPaused: current.bot_paused === 1,
    text,
    buttonId,
    botHasSpoken: bot.spoken,
    minutesSinceBot: bot.minutes,
  });
  const say = (body: string) => send(thread, current.id, { type: "text", body });
  const draft = parseDraft(current.triage);

  switch (decision.kind) {
    case "silent":
      return;
    case "handoff":
      await updateCase(current.id, { bot_paused: 1 });
      await say("Certo! Vou chamar alguém da nossa equipe para falar com você por aqui. 🙂");
      return;
    case "urgent": {
      const next = mergeDraft(draft, { alertas: decision.flags.map((f) => `Paciente relatou: ${f}`) });
      await updateCase(current.id, { stage: "urgente", triage: JSON.stringify(next) });
      await say(URGENT_REPLY);
      return;
    }
    case "send_consent":
      if (!decision.again) await say(fillClinic(ctx.config.boasVindas, ctx.clinic));
      await send(thread, current.id, {
        type: "buttons",
        body: decision.again
          ? "Para seguir, preciso que você toque em *Concordo* ou *Não concordo*."
          : fillClinic(ctx.config.consentimento, ctx.clinic),
        buttons: [
          { id: "consentir", title: "Concordo" },
          { id: "recusar", title: "Não concordo" },
        ],
      });
      return;
    case "consent_no":
      await updateCase(current.id, { stage: "recusado", closed_at: new Date().toISOString() });
      await say(
        "Tudo bem, respeitamos a sua decisão. Sem o consentimento não conseguimos fazer a triagem por aqui. " +
          "Se mudar de ideia, é só mandar uma nova mensagem. Se quiser falar com uma pessoa, escreva *atendente*.",
      );
      return;
    case "consent_yes": {
      await sql`UPDATE wa_threads SET consent_at = now() WHERE id = ${thread.id} AND consent_at IS NULL`;
      const updated = await updateCase(current.id, { stage: "triagem" });
      await runTriage(ctx, thread, updated ?? current, false, mode, "");
      return;
    }
    case "triage":
      await runTriage(ctx, thread, current, decision.correcting, mode, text);
      return;
    case "confirm_review":
      await startPayment(ctx, thread, current);
      return;
    case "ask_correction":
      await say("Claro! Escreva aqui o que precisa ser corrigido ou acrescentado.");
      return;
    case "payment_reminder":
      await say(
        current.payment_url
          ? `Seu pagamento ainda não apareceu por aqui. O link é este: ${current.payment_url}\nAssim que for confirmado, aviso você.`
          : "Estamos preparando o seu pagamento — a equipe envia as instruções em instantes.",
      );
      return;
    case "paid_ack":
      await say("Seu pagamento está confirmado ✅. O médico vai chamar você aqui mesmo, em breve.");
      return;
  }
}

/* ---------- Triagem ---------- */

async function runTriage(
  ctx: EngineContext,
  thread: WaThread,
  current: WaCase,
  correcting: boolean,
  mode: BotMode,
  text: string,
): Promise<void> {
  const draft = parseDraft(current.triage);
  const say = (body: string) => send(thread, current.id, { type: "text", body });

  if (mode !== "gemini") {
    // Questionário: perguntas fixas, uma por vez.
    if (correcting) {
      const next = noteCorrection(draft, text);
      await updateCase(current.id, { triage: JSON.stringify(next) });
      await say("Anotado! O médico vai ver a sua correção.");
      await sendReview(thread, current.id, next);
      return;
    }
    // Depois do consentimento, a primeira mensagem do paciente (antes dele) pode já ser a queixa.
    let answer = text;
    if (!text && !draft.queixa) {
      const [first] = await sql<{ body: string }>`
        SELECT body FROM wa_messages WHERE case_id = ${current.id} AND direction = 'in' AND button_id IS NULL
        ORDER BY id LIMIT 1`;
      answer = first?.body ?? "";
    }
    const result = questionnaireStep(draft, current.asking, answer);
    await updateCase(current.id, { triage: JSON.stringify(result.draft), asking: result.asking, turns: current.turns + 1 });
    if (result.done) {
      await updateCase(current.id, { stage: "revisao" });
      await say("Obrigado! Terminamos as perguntas.");
      await sendReview(thread, current.id, result.draft);
    } else {
      await say(result.reply);
    }
    return;
  }

  // Gemini: conversa livre, ficha preenchida a cada mensagem.
  const history = await caseMessages(current.id);
  const contents = geminiContents(
    history.filter((m) => m.author !== "sistema").map((m) => ({ direction: m.direction, body: m.body })),
  );
  if (!contents.length || contents[contents.length - 1].role !== "user") {
    contents.push({ role: "user", parts: [{ text: correcting ? "(correção acima)" : "(paciente consentiu; comece a triagem)" }] });
  }
  const raw = await generateOnce({
    system: triageSystemPrompt({
      clinic: ctx.clinic,
      draft,
      extraInstructions: ctx.config.instrucoes,
      today: todayISO(),
      correcting,
    }),
    contents,
    schema: TRIAGE_SCHEMA as unknown as Record<string, unknown>,
    maxOutputTokens: 4096,
  });
  const turn = parseTriageTurn(raw);
  if (!turn) throw new Error("resposta do Gemini fora do formato");
  let next: TriageDraft = mergeDraft(draft, turn.ficha);
  const turns = current.turns + 1;

  if (turn.urgencia) {
    next = mergeDraft(next, { alertas: [turn.motivoUrgencia || "Gemini marcou urgência"] });
    await updateCase(current.id, { stage: "urgente", triage: JSON.stringify(next), turns });
    await say(URGENT_REPLY);
    return;
  }

  const missing = missingRequired(next);
  if ((turn.completa || turns >= 30) && !missing.length) {
    await updateCase(current.id, { stage: "revisao", triage: JSON.stringify(next), turns });
    if (turn.resposta) await say(turn.resposta);
    await sendReview(thread, current.id, next);
    return;
  }
  if (turns >= 40) {
    // Conversa longa demais: a equipe assume.
    await updateCase(current.id, { triage: JSON.stringify(next), turns, bot_paused: 1, last_error: "triagem longa — equipe assumiu" });
    await say("Obrigado pelas informações! Uma pessoa da nossa equipe vai continuar com você por aqui.");
    return;
  }
  await updateCase(current.id, { stage: correcting ? "triagem" : current.stage, triage: JSON.stringify(next), turns });
  await say(turn.completa && missing.length ? missing[0].question : turn.resposta);
}

async function sendReview(thread: WaThread, caseId: number, draft: TriageDraft): Promise<void> {
  await send(thread, caseId, { type: "text", body: summaryForPatient(draft) });
  await send(thread, caseId, {
    type: "buttons",
    body: "Está tudo certo?",
    buttons: [
      { id: "confirmar", title: "Está correto" },
      { id: "corrigir", title: "Quero corrigir" },
    ],
  });
}

/* ---------- Pagamento ---------- */

/** Paciente aceitou o resumo: gera a cobrança (ou, sem preço, vai direto para o médico). */
export async function startPayment(ctx: EngineContext, thread: WaThread, current: WaCase): Promise<void> {
  const say = (body: string) => send(thread, current.id, { type: "text", body });
  const price = ctx.config.precoCentavos;
  const professional = ctx.config.profissionalId;
  if (price <= 0) {
    await updateCase(current.id, { stage: "pago", price_cents: 0, professional_id: professional, paid_at: new Date().toISOString() });
    await say("Obrigado! Sua triagem foi enviada ao médico. Ele vai chamar você aqui mesmo, em breve.");
    return;
  }
  await updateCase(current.id, { stage: "pagamento", price_cents: price, professional_id: professional });
  const charge = await createChargeFor(ctx, thread, { ...current, price_cents: price });
  if ("url" in charge) {
    await say(
      `Perfeito! ✅ Para confirmar a sua teleconsulta, o valor é *${moneyBR(price)}*.\n\n` +
        `Pague por Pix, cartão ou boleto neste link:\n${charge.url}\n\n` +
        "Assim que o pagamento for confirmado, eu aviso você aqui e o médico recebe a sua triagem.",
    );
  } else {
    await say("Obrigado! Sua triagem foi registrada. Em instantes a nossa equipe envia as instruções de pagamento por aqui.");
  }
}

/** Cria a cobrança na ASAAS e guarda o link; devolve o erro em texto se não deu. */
export async function createChargeFor(
  ctx: EngineContext,
  thread: WaThread,
  current: WaCase,
): Promise<{ url: string } | { error: string }> {
  if (!asaasReady()) {
    await updateCase(current.id, { last_error: "ASAAS não configurada — cobre por fora e marque como pago" });
    return { error: "ASAAS não configurada" };
  }
  if (thread.simulated && process.env.ASAAS_ENV === "producao") {
    await updateCase(current.id, { last_error: "Conversa simulada: cobrança real não gerada (ASAAS em produção)" });
    return { error: "simulada" };
  }
  const draft = parseDraft(current.triage);
  try {
    const customer =
      current.asaas_customer ||
      (await ensureCustomer({
        name: draft.nome || thread.contact_name || "Paciente",
        cpf: draft.cpf || "",
        phone: thread.simulated ? null : thread.phone,
        email: draft.email ?? null,
        ref: `wa-thread-${thread.id}`,
      }));
    const charge = await createCharge({
      customer,
      cents: current.price_cents || ctx.config.precoCentavos,
      dueDate: addDaysISO(todayISO(), ctx.config.vencimentoDias),
      description: `Teleconsulta — ${ctx.clinic}`,
      ref: `wa-case-${current.id}`,
    });
    await updateCase(current.id, {
      asaas_customer: customer,
      asaas_payment_id: charge.id,
      payment_url: charge.url,
      last_error: null,
    });
    return { url: charge.url };
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).slice(0, 400);
    await updateCase(current.id, { last_error: `Cobrança: ${message}` });
    return { error: message };
  }
}

/**
 * Pagamento confirmado (webhook da ASAAS ou "Marcar como pago"): uma vez só —
 * lança no Financeiro, passa para "pago" e avisa o paciente.
 */
export async function markPaid(caseId: number, input: { method: string; cents?: number; source: string }): Promise<boolean> {
  const [updated] = await sql<WaCase>`
    UPDATE wa_cases SET stage = 'pago', paid_at = now(), updated_at = now()
    WHERE id = ${caseId} AND stage IN ('revisao', 'pagamento') RETURNING *`;
  if (!updated) return false;
  const thread = await getThread(updated.thread_id);
  if (!thread) return true;
  const draft = parseDraft(updated.triage);
  const cents = input.cents ?? updated.price_cents;
  const today = todayISO();
  try {
    const [payment] = await sql<{ id: number }>`
      INSERT INTO payments (patient_id, description, amount_cents, method, status, due_date, paid_at)
      VALUES (${thread.patient_id}, ${`Teleconsulta WhatsApp — ${draft.nome || thread.contact_name || thread.phone}`},
        ${cents}, ${input.method}, 'pago', ${today}, ${today})
      RETURNING id`;
    await updateCase(caseId, { payment_id: payment.id, last_error: null });
  } catch (error) {
    await updateCase(caseId, { last_error: `Financeiro: ${String(error).slice(0, 300)}` });
  }
  const { config, clinic } = await loadContext();
  await send(thread, caseId, { type: "text", body: fillClinic(config.pagamentoConfirmado || DEFAULT_WA_CONFIG.pagamentoConfirmado, clinic) });
  return true;
}

/** Estorno/chargeback: volta a aguardar pagamento e o lançamento do Financeiro volta a pendente. */
export async function reversePayment(caseId: number, reason: string): Promise<void> {
  const [updated] = await sql<WaCase>`
    UPDATE wa_cases SET stage = 'pagamento', paid_at = NULL, last_error = ${`Pagamento revertido: ${reason}`}, updated_at = now()
    WHERE id = ${caseId} AND stage IN ('pago', 'pagamento') RETURNING *`;
  if (updated?.payment_id) await sql`UPDATE payments SET status = 'pendente', paid_at = NULL WHERE id = ${updated.payment_id}`;
}

export { methodLabel };

/** O atendimento da cobrança, pela referência "wa-case-<id>" ou pelo id da ASAAS. */
export async function caseForPayment(paymentId: string, ref: string | null): Promise<number | null> {
  const fromRef = ref?.match(/^wa-case-(\d+)$/);
  if (fromRef) return Number(fromRef[1]);
  const [row] = await sql<{ id: number }>`SELECT id FROM wa_cases WHERE asaas_payment_id = ${paymentId}`;
  return row?.id ?? null;
}

/** Para o Simulador: uma mensagem "do paciente" passa pelo mesmo caminho do webhook. */
export async function simulateInbound(threadPhone: string, text: string, buttonId: string | null = null): Promise<number | null> {
  const got = await receive(
    {
      waId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: threadPhone,
      contactName: "Paciente (simulação)",
      kind: buttonId ? "button" : "text",
      text,
      buttonId,
      mediaId: null,
      mimeType: null,
      timestamp: Math.floor(Date.now() / 1000),
    },
    true,
  );
  if (!got) return null;
  await processCase(got.caseId);
  return got.caseId;
}

export function readiness(): { cloud: boolean; asaas: boolean; gemini: boolean } {
  return { cloud: cloudReady(), asaas: asaasReady(), gemini: geminiEnabled() };
}
