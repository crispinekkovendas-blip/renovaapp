/**
 * Cliente mínimo da API do Gemini (REST, sem SDK): embeddings e geração em
 * streaming com chamada de ferramenta. A chave fica só no servidor
 * (GEMINI_API_KEY); os modelos podem ser trocados por variável de ambiente.
 */

const API = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Modelos de resposta em ordem de preferência. Se um está sem cota (429) ou
 * sobrecarregado (503), passa na hora para o seguinte e o deixa de lado por
 * um minuto. GEMINI_MODELS="a,b,c" troca a lista.
 *
 * Flash-Lite primeiro: a resposta só lê os trechos já encontrados, e ele
 * acerta como o Flash (testado em dose pediátrica, diluição corrigida,
 * "o guia não traz"), em 2–3 s e por ~1/3 do preço (out/2026: US$ 0,30 /
 * US$ 2,50 por milhão de tokens; ~US$ 1,30 a cada mil perguntas).
 */
export const GEMINI_MODELS = (process.env.GEMINI_MODELS || "gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.8-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const SKIP_MS = 60_000;
const unavailableUntil = new Map<string, number>();
/** Raciocínio interno: os trechos já vêm prontos, então "low" responde bem e bem mais rápido. */
const GEMINI_THINKING = process.env.GEMINI_THINKING || "low";
export const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2";
export const EMBED_DIM = 768;

export function geminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY não configurada");
  return k;
}

/** Quanto o Gemini pediu para esperar ("retryDelay": "23s"), em ms; sem pedido, o recuo padrão. */
export function retryDelayMs(body: string, attempt: number): number {
  const m = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  return m ? Math.ceil(Number(m[1]) * 1000) + 500 : Math.min(30_000, 2000 * 2 ** attempt);
}

/**
 * POST com nova tentativa quando o Gemini pede calma (429) ou está
 * sobrecarregado (503): espera o que ele pediu, até `maxWaitMs` no total —
 * curto na pergunta do médico, longo no script que gera os vetores.
 */
async function post(path: string, body: unknown, signal?: AbortSignal, maxWaitMs = 8_000): Promise<Response> {
  let waited = 0;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key() },
      body: JSON.stringify(body),
      signal,
    });
    if (res.ok) return res;
    const detail = await res.text().catch(() => "");
    if ((res.status === 429 || res.status === 503) && attempt < 6) {
      const wait = retryDelayMs(detail, attempt);
      if (waited + wait <= maxWaitMs) {
        waited += wait;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
    }
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/** Vetor com norma 1 (o produto escalar vira a similaridade de cosseno). */
export function normalize(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

/**
 * Formato de texto que o gemini-embedding-2 espera: a tarefa vai no próprio
 * texto (a pergunta é "busca"; o trecho leva título).
 */
export function embedInput(text: string, kind: "query" | "doc", title?: string): string {
  return kind === "query" ? `task: search result | query: ${text}` : `title: ${title || "none"} | text: ${text}`;
}

/**
 * Embeddings de vários textos, em lotes pequenos (a cota gratuita conta cada
 * texto). `patient`: pode esperar a cota voltar (o script de geração).
 */
export async function embedTexts(
  texts: readonly string[],
  options: { batch?: number; patient?: boolean; onProgress?(done: number): void } = {}
): Promise<number[][]> {
  const batch = options.batch ?? 20;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batch) {
    const res = await post(
      `models/${GEMINI_EMBED_MODEL}:batchEmbedContents`,
      {
        requests: texts.slice(i, i + batch).map((text) => ({
          model: `models/${GEMINI_EMBED_MODEL}`,
          content: { parts: [{ text }] },
          output_dimensionality: EMBED_DIM,
        })),
      },
      undefined,
      options.patient ? 10 * 60_000 : 8_000
    );
    const data = (await res.json()) as { embeddings?: { values: number[] }[] };
    for (const e of data.embeddings ?? []) out.push(normalize(e.values));
    options.onProgress?.(out.length);
  }
  if (out.length !== texts.length) throw new Error("Gemini devolveu menos embeddings que o pedido");
  return out;
}

/* ---------- Geração ---------- */

export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  /** Assinatura do raciocínio do modelo: volta intacta na próxima chamada. */
  thoughtSignature?: string;
  thought?: boolean;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiRequest {
  system: string;
  contents: GeminiContent[];
  tools?: { name: string; description: string; parameters: Record<string, unknown> }[];
  maxOutputTokens?: number;
}

export type GeminiChunk = { parts: GeminiPart[]; finishReason?: string; blocked?: boolean };

/** A geração em streaming (SSE): cada pedaço com as partes novas da resposta. */
export async function* streamGenerate(req: GeminiRequest, signal?: AbortSignal): AsyncGenerator<GeminiChunk> {
  const body = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.contents,
    ...(req.tools?.length ? { tools: [{ functionDeclarations: req.tools }] } : {}),
    generationConfig: {
      temperature: 0.2,
      // O raciocínio interno conta no limite: folga para a resposta não sair cortada.
      maxOutputTokens: req.maxOutputTokens ?? 8192,
      thinkingConfig: { thinkingLevel: GEMINI_THINKING },
    },
  };
  let res: Response | null = null;
  let lastError: unknown = null;
  const now = Date.now();
  const chain = GEMINI_MODELS.filter((m) => (unavailableUntil.get(m) ?? 0) <= now);
  for (const model of chain.length ? chain : GEMINI_MODELS) {
    try {
      // Sem esperar: indisponível, vai direto para o próximo modelo.
      res = await post(`models/${model}:streamGenerateContent?alt=sse`, body, signal, 0);
      break;
    } catch (error) {
      lastError = error;
      if (!/Gemini (503|429)/.test(String(error))) throw error;
      unavailableUntil.set(model, Date.now() + SKIP_MS);
      console.warn(`Gemini: ${model} indisponível agora, tentando o próximo`);
    }
  }
  if (!res) throw lastError ?? new Error("Gemini indisponível");
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) {
      const chunk = parseSseEvent(event);
      if (chunk) yield chunk;
    }
  }
  const last = parseSseEvent(buffer);
  if (last) yield last;
}

export function parseSseEvent(event: string): GeminiChunk | null {
  const data = event
    .split(/\r?\n/)
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim())
    .join("");
  if (!data) return null;
  const json = JSON.parse(data) as {
    candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const cand = json.candidates?.[0];
  return {
    parts: cand?.content?.parts ?? [],
    finishReason: cand?.finishReason,
    blocked: Boolean(json.promptFeedback?.blockReason) || cand?.finishReason === "SAFETY",
  };
}
