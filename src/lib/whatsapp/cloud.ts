import crypto from "node:crypto";

/**
 * WhatsApp Cloud API (Meta), sem SDK. As chaves ficam só nas variáveis de
 * ambiente da Vercel — nunca no banco nem no código:
 *   WHATSAPP_TOKEN            token permanente do usuário do sistema
 *   WHATSAPP_APP_SECRET       segredo do app (assina cada webhook)
 *   WHATSAPP_PHONE_NUMBER_ID  o número que envia
 *   WHATSAPP_VERIFY_TOKEN     a frase que a Meta devolve ao cadastrar o webhook
 *   WHATSAPP_GRAPH_VERSION    opcional (padrão v24.0)
 */

export const GRAPH = "https://graph.facebook.com";

export function graphVersion(): string {
  return process.env.WHATSAPP_GRAPH_VERSION || "v24.0";
}

/** O que falta para enviar de verdade (nomes das variáveis, nunca os valores). */
export function missingCloudEnv(): string[] {
  return ["WHATSAPP_TOKEN", "WHATSAPP_APP_SECRET", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"].filter(
    (name) => !process.env[name],
  );
}

export function cloudReady(): boolean {
  return missingCloudEnv().length === 0;
}

/**
 * Confere o cabeçalho X-Hub-Signature-256 ("sha256=<hex>") contra o corpo
 * cru. Sem o segredo configurado, nada passa.
 */
export function verifySignature(rawBody: string, header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(header.slice(7), "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** O "hub.challenge" da verificação do webhook, se o token confere. */
export function verifyChallenge(params: URLSearchParams, verifyToken: string | undefined): string | null {
  if (!verifyToken) return null;
  if (params.get("hub.mode") !== "subscribe") return null;
  const token = params.get("hub.verify_token") ?? "";
  const a = Buffer.from(token);
  const b = Buffer.from(verifyToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return params.get("hub.challenge");
}

/* ---------- Webhook: o que chega ---------- */

export type InboundKind = "text" | "audio" | "image" | "document" | "button" | "other";

export interface InboundMessage {
  waId: string;
  from: string;
  contactName: string | null;
  kind: InboundKind;
  /** Texto, legenda ou título do botão escolhido. */
  text: string;
  /** Id do botão de resposta rápida (ex.: "consentir"). */
  buttonId: string | null;
  mediaId: string | null;
  mimeType: string | null;
  timestamp: number;
}

export interface StatusUpdate {
  waId: string;
  status: string;
  error: string | null;
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** Mensagens e status de um POST da Meta; o resto (outros campos) é ignorado. */
export function parseWebhook(body: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];
  for (const entry of arr(obj(body).entry)) {
    for (const change of arr(obj(entry).changes)) {
      const value = obj(obj(change).value);
      const names = new Map<string, string>();
      for (const c of arr(value.contacts)) {
        const name = text(obj(obj(c).profile).name);
        if (name) names.set(text(obj(c).wa_id), name);
      }
      for (const raw of arr(value.messages)) {
        const m = obj(raw);
        const from = text(m.from);
        const waId = text(m.id);
        if (!from || !waId) continue;
        const type = text(m.type);
        const base = {
          waId,
          from,
          contactName: names.get(from) ?? null,
          timestamp: Number(m.timestamp) || Math.floor(Date.now() / 1000),
          buttonId: null as string | null,
          mediaId: null as string | null,
          mimeType: null as string | null,
        };
        if (type === "text") {
          messages.push({ ...base, kind: "text", text: text(obj(m.text).body) });
        } else if (type === "interactive") {
          const reply = obj(obj(m.interactive).button_reply);
          const list = obj(obj(m.interactive).list_reply);
          messages.push({
            ...base,
            kind: "button",
            text: text(reply.title) || text(list.title),
            buttonId: text(reply.id) || text(list.id) || null,
          });
        } else if (type === "button") {
          const b = obj(m.button);
          messages.push({ ...base, kind: "button", text: text(b.text), buttonId: text(b.payload) || null });
        } else if (type === "audio" || type === "image" || type === "document" || type === "video" || type === "sticker") {
          const media = obj(m[type]);
          messages.push({
            ...base,
            kind: type === "audio" ? "audio" : type === "image" ? "image" : type === "document" ? "document" : "other",
            text: text(media.caption) || text(media.filename),
            mediaId: text(media.id) || null,
            mimeType: text(media.mime_type) || null,
          });
        } else {
          messages.push({ ...base, kind: "other", text: "" });
        }
      }
      for (const raw of arr(value.statuses)) {
        const s = obj(raw);
        const errors = arr(s.errors).map((e) => text(obj(e).title) || text(obj(e).message)).filter(Boolean);
        if (text(s.id)) statuses.push({ waId: text(s.id), status: text(s.status), error: errors[0] ?? null });
      }
    }
  }
  return { messages, statuses };
}

/* ---------- Envio ---------- */

export interface ReplyButton {
  id: string;
  /** Até 20 caracteres (limite da Meta). */
  title: string;
}

export type OutboundPayload =
  | { type: "text"; body: string }
  | { type: "buttons"; body: string; buttons: ReplyButton[] };

/** O JSON que a Meta espera, já dentro dos limites (texto 4096, botão 1024 e 3 botões de 20). */
export function graphMessage(to: string, payload: OutboundPayload): Json {
  if (payload.type === "text") {
    return {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: payload.body.slice(0, 4096), preview_url: true },
    };
  }
  return {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: payload.body.slice(0, 1024) },
      action: {
        buttons: payload.buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })),
      },
    },
  };
}

/** Envia pela Cloud API; devolve o id da mensagem na Meta ou o erro em texto. */
export async function sendCloud(to: string, payload: OutboundPayload): Promise<{ waId: string } | { error: string }> {
  const missing = missingCloudEnv();
  if (missing.length) return { error: `faltam variáveis: ${missing.join(", ")}` };
  try {
    const res = await fetch(`${GRAPH}/${graphVersion()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      body: JSON.stringify(graphMessage(to, payload)),
    });
    const data = obj(await res.json().catch(() => ({})));
    if (!res.ok) {
      const err = obj(data.error);
      return { error: `Meta ${res.status}: ${text(err.message) || "erro"}${err.code ? ` (código ${String(err.code)})` : ""}` };
    }
    const id = text(obj(arr(data.messages)[0]).id);
    return id ? { waId: id } : { error: "Meta não devolveu o id da mensagem" };
  } catch (error) {
    return { error: `rede: ${String(error).slice(0, 200)}` };
  }
}

/** Baixa uma mídia recebida (áudio, imagem): o id vale ~30 dias na Meta. */
export async function downloadMedia(mediaId: string, maxBytes = 15 * 1024 * 1024): Promise<{ bytes: Buffer; mime: string } | null> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token || !/^\d+$/.test(mediaId)) return null;
  const auth = { authorization: `Bearer ${token}` };
  const meta = await fetch(`${GRAPH}/${graphVersion()}/${mediaId}`, { headers: auth });
  if (!meta.ok) return null;
  const info = obj(await meta.json());
  const url = text(info.url);
  if (!url.startsWith("https://")) return null;
  if (Number(info.file_size) > maxBytes) return null;
  const file = await fetch(url, { headers: auth });
  if (!file.ok) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > maxBytes) return null;
  return { bytes, mime: text(info.mime_type) || file.headers.get("content-type") || "application/octet-stream" };
}
