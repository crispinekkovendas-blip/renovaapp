import { after } from "next/server";
import { parseWebhook, verifyChallenge, verifySignature } from "@/lib/whatsapp/cloud";
import { processCase, receive } from "@/lib/whatsapp/engine";
import { sql } from "@/lib/db";

/**
 * Webhook da WhatsApp Cloud API.
 *   GET  — verificação ao cadastrar o webhook na Meta (hub.challenge).
 *   POST — mensagens e status. Só passa com a assinatura X-Hub-Signature-256
 *          do segredo do app; responde 200 na hora e trata depois (`after`),
 *          porque a Meta reenvia o que demora.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const challenge = verifyChallenge(new URL(request.url).searchParams, process.env.WHATSAPP_VERIFY_TOKEN);
  if (challenge === null) return new Response("forbidden", { status: 403 });
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

const STATUS_PT: Record<string, string> = { sent: "enviado", delivered: "entregue", read: "lido", failed: "erro" };

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    return new Response("invalid signature", { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const { messages, statuses } = parseWebhook(body);

  after(async () => {
    try {
      for (const s of statuses) {
        const status = STATUS_PT[s.status] ?? s.status;
        // "lido" não volta para "entregue" se os status chegarem fora de ordem.
        await sql`
          UPDATE wa_messages SET status = ${status}, error = COALESCE(${s.error}, error)
          WHERE wa_id = ${s.waId} AND NOT (COALESCE(status, '') = 'lido' AND ${status} IN ('enviado', 'entregue'))`;
      }
      const cases = new Set<number>();
      for (const m of messages) {
        const got = await receive(m);
        if (got) cases.add(got.caseId);
      }
      if (!cases.size) return;
      // Quem manda várias mensagens seguidas recebe uma resposta só.
      await new Promise((r) => setTimeout(r, 2500));
      for (const caseId of cases) await processCase(caseId);
    } catch (error) {
      console.error("WhatsApp webhook:", error);
    }
  });

  return new Response("ok", { status: 200 });
}
