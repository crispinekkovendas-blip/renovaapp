import { canUseGuide, requestSession } from "@/lib/request-session";
import { askGuide, guideAiEnabled, MAX_QUESTION } from "@/lib/guide-ask";
import type { AskTurn } from "@/lib/guide-ask";

/**
 * Pergunta ao Guia clínico (plantão, receitas prontas e Drive): responde em NDJSON (um evento por linha),
 * para a tela mostrar a busca e escrever a resposta enquanto ela chega. Aceita a sessão do site (cookie) e o
 * token do app Android (Authorization: Bearer).
 */

export const maxDuration = 60;

// Limite por usuário e instância: evita laço acidental de perguntas.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 40;
const recent = new Map<number, number[]>();

function allowed(userId: number): boolean {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) return false;
  list.push(now);
  recent.set(userId, list);
  return true;
}

function parseHistory(raw: unknown): AskTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is AskTurn =>
        !!t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.length < 4000
    )
    .slice(-6);
}

export async function POST(request: Request) {
  const session = await requestSession(request);
  if (!session) return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  if (!canUseGuide(session)) {
    return Response.json({ error: "Disponível para profissionais." }, { status: 403 });
  }
  if (!guideAiEnabled()) return Response.json({ error: "A IA não está configurada." }, { status: 503 });

  let body: { question?: unknown; history?: unknown; fresh?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pergunta inválida." }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 3 || question.length > MAX_QUESTION) {
    return Response.json({ error: `Escreva a pergunta (até ${MAX_QUESTION} caracteres).` }, { status: 400 });
  }
  if (!allowed(session.userId)) {
    return Response.json({ error: "Muitas perguntas seguidas. Tente de novo em alguns minutos." }, { status: 429 });
  }

  const history = parseHistory(body.history);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        for await (const event of askGuide(question, history, undefined, { fresh: body.fresh === true })) {
          if (request.signal.aborted) break;
          send(event);
        }
      } catch (error) {
        console.error("guia/perguntar", error);
        send({ t: "error", m: "Não foi possível responder agora. Use a busca ou abra o tópico." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
