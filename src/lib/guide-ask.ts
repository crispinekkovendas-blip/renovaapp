import { chunkById, formatChunk, retrieveHybrid } from "./emergency-guide/chunks.ts";
import type { ChunkSource, GuideChunk } from "./emergency-guide/chunks.ts";
import { geminiEnabled, streamGenerate } from "./gemini.ts";
import { citedIds } from "./guide-citations.ts";
import { databaseStore, guideVersion, questionKey } from "./guide-answer-cache.ts";
import type { AnswerStore } from "./guide-answer-cache.ts";

export { citedIds } from "./guide-citations.ts";
import type { GeminiChunk, GeminiContent, GeminiPart, GeminiRequest } from "./gemini.ts";

/**
 * "Perguntar ao guia": o médico pergunta em texto livre e o Gemini responde
 * só com o que está no Guia clínico (RAG) — o guia de plantão, as receitas
 * prontas e o Drive de prescrições revisado.
 *
 * 1. A pergunta já sai com os trechos mais relevantes anexados — busca
 *    híbrida: por palavra (erro de digitação, sinônimo) e por sentido
 *    (embeddings). A maioria responde de primeira.
 * 2. Se faltar algo, o modelo busca de novo com a ferramenta
 *    `buscar_no_guia` (outro nome, outra condição), até 3 vezes.
 * 3. Cada afirmação cita o trecho de onde veio ([[id]]); a tela transforma a
 *    citação em link para o tópico.
 *
 * O que o guia não traz, o modelo diz que não traz — não completa de memória.
 */

const MAX_SEARCHES = 3;
export const MAX_QUESTION = 600;

export function guideAiEnabled(): boolean {
  return geminiEnabled();
}

export type AskEvent =
  | { t: "search"; q: string }
  | { t: "text"; d: string }
  | { t: "sources"; items: AskSource[] }
  | { t: "error"; m: string }
  /** A resposta veio da memória (a mesma pergunta já foi feita): sem custo de IA. */
  | { t: "cached"; at: string }
  | { t: "done" };

/** Uma fonte citada: de que aba, qual item e onde abrir. Respostas antigas da memória não têm `source` nem `href`. */
export interface AskSource {
  id: string;
  slug: string;
  topic: string;
  section: string | null;
  source?: ChunkSource;
  href?: string;
}

export interface AskTurn {
  role: "user" | "assistant";
  content: string;
}

/** O que a pergunta usa de fora: o modelo e a recuperação (trocáveis no teste). */
export interface AskDeps {
  generate(req: GeminiRequest): AsyncGenerator<GeminiChunk>;
  retrieve(query: string, limit: number): Promise<GuideChunk[]>;
  /** Memória de respostas; sem ela, toda pergunta vai à IA. */
  store?: AnswerStore;
}

let sharedStore: AnswerStore | null = null;
const DEFAULT_DEPS: AskDeps = {
  generate: (req) => streamGenerate(req),
  retrieve: retrieveHybrid,
  get store() {
    sharedStore ??= databaseStore();
    return sharedStore;
  },
};

export const SYSTEM = `Você responde perguntas de médicos usando SOMENTE os trechos do Guia clínico que aparecem nesta conversa — os anexados à pergunta e os que você buscar com a ferramenta buscar_no_guia. O guia tem três fontes, e cada trecho diz de qual veio (atributo fonte):
- "Guia de Prescrições da Emergência (plantão)": pronto-socorro e sala vermelha.
- "Receitas prontas da clínica": receitas de consultório, ponto de partida para adulto sem comorbidade.
- "Drive de prescrições revisado": consultório e pronto-atendimento, com dose de criança.

Regras:
- Use a fonte que combina com o cenário da pergunta: plantão, PS ou sala vermelha → guia de plantão; consultório, receita para casa ou criança → receitas prontas e Drive. Se o cenário não está claro e as fontes dizem coisas diferentes, mostre as duas, cada uma com a sua fonte.
- Diga de qual fonte vem cada conduta (ex.: "No guia de plantão: …", "Pela receita pronta: …", "No Drive: …").
- Receita pronta é ponto de partida para adulto sem comorbidade: lembre isso quando a pergunta envolver gestante, criança, idoso, alergia ou doença renal.
- Se os trechos não bastam, busque de novo com outros termos (nome do medicamento, da condição, sinônimo). No máximo ${MAX_SEARCHES} buscas.
- Se o guia não traz a informação, diga isso claramente ("O guia não traz …") e pare. Nunca complete com conhecimento próprio: não invente dose, diluição, intervalo, via, duração nem indicação.
- Copie doses, apresentações, diluições e vias exatamente como no trecho.
- Se a pergunta traz peso ou idade, você pode calcular a partir da dose por kg do trecho, sempre escrevendo a conta inteira (dose por kg × peso = total por dia; total ÷ número de tomadas = dose por tomada). Se o trecho dá uma faixa (ex.: 80–90 mg/kg/dia), calcule as duas pontas (80 × 15 = 1.200 mg; 90 × 15 = 1.350 mg). Confira cada multiplicação antes de escrever. Respeite e mostre a dose máxima do trecho.
- Se o trecho diz [corrigido pela revisão …], use o texto corrigido e avise que foi corrigido. Se diz [conferir: …], repita o aviso.
- Cite a fonte logo após cada afirmação com [[id]], usando exatamente o id do trecho (ex.: [[sepse-e-choque-septico#1]], [[receita-cistite-itu-baixa-nao-complicada#0]], [[drive-enxaqueca#0]]). Duas fontes: [[a#1]] [[b#2]], cada uma no seu par de colchetes.
- Formato de plantão, em português do Brasil: comece pela resposta direta (dose/conduta), depois detalhes em tópicos curtos com "- ". Use **negrito** só para doses. Sem introdução, sem despedida. Até ~200 palavras, salvo se pedirem mais.
- Não peça nem use dados que identifiquem o paciente.`;

const TOOL = {
  name: "buscar_no_guia",
  description:
    "Busca trechos no Guia clínico — guia de plantão, receitas prontas e Drive —, por palavra e por sentido. Aceita condição, medicamento, sigla, sinônimo, sintoma ou uma frase. Devolve até 6 trechos com id, fonte, tópico e texto.",
  parameters: {
    type: "object",
    properties: { consulta: { type: "string", description: "O que buscar, ex.: 'adrenalina anafilaxia pediátrica'" } },
    required: ["consulta"],
  },
};

function chunksBlock(chunks: readonly GuideChunk[]): string {
  return chunks.length ? chunks.map(formatChunk).join("\n\n") : "Nenhum trecho encontrado para essa busca.";
}

export async function* askGuide(
  question: string,
  history: readonly AskTurn[] = [],
  deps: AskDeps = DEFAULT_DEPS,
  options: { fresh?: boolean } = {}
): AsyncGenerator<AskEvent> {
  // Pergunta solta (não seguimento) já respondida antes: volta da memória.
  // Seguimento depende da conversa, então sempre vai à IA.
  const key = history.length === 0 ? questionKey(question) : null;
  const store = deps.store;
  if (key && store && !options.fresh) {
    try {
      const hit = await store.get(key, guideVersion());
      if (hit) {
        yield { t: "cached", at: hit.createdAt };
        yield { t: "text", d: hit.answer };
        yield { t: "sources", items: hit.sources };
        yield { t: "done" };
        return;
      }
    } catch (error) {
      console.error("guia: memória de respostas indisponível", error);
    }
  }

  const seen = new Map<string, GuideChunk>();
  // Num seguimento ("e em criança?"), a busca inicial leva junto a pergunta anterior.
  const lastUser = [...history].reverse().find((h) => h.role === "user")?.content ?? "";
  const [initial, extra] = await Promise.all([
    deps.retrieve(question, 6),
    lastUser ? deps.retrieve(`${lastUser} ${question}`, 3) : Promise.resolve([]),
  ]);
  for (const c of [...initial, ...extra]) seen.set(c.id, c);

  const contents: GeminiContent[] = [
    ...history.slice(-6).map((h) => ({ role: h.role === "user" ? ("user" as const) : ("model" as const), parts: [{ text: h.content }] })),
    {
      role: "user",
      parts: [{ text: `Pergunta: ${question}\n\nTrechos do guia já encontrados para esta pergunta:\n\n${chunksBlock([...seen.values()])}` }],
    },
  ];

  let answer = "";
  let cut = false;
  for (let turn = 0; turn <= MAX_SEARCHES; turn++) {
    const parts: GeminiPart[] = [];
    for await (const chunk of deps.generate({ system: SYSTEM, contents, tools: turn < MAX_SEARCHES ? [TOOL] : [] })) {
      if (chunk.blocked) {
        yield { t: "error", m: "A IA não respondeu a esta pergunta. Consulte o tópico no guia." };
        return;
      }
      if (chunk.finishReason === "MAX_TOKENS") cut = true;
      for (const part of chunk.parts) {
        parts.push(part);
        if (part.text && !part.thought) {
          answer += part.text;
          yield { t: "text", d: part.text };
        }
      }
    }
    const calls = parts.filter((p) => p.functionCall);
    if (calls.length === 0) break;

    // A resposta do modelo volta inteira (com as assinaturas de raciocínio), e em seguida os resultados.
    contents.push({ role: "model", parts });
    const results: GeminiPart[] = [];
    for (const call of calls) {
      const q = String(call.functionCall?.args?.consulta ?? "").slice(0, 200);
      yield { t: "search", q };
      const found = await deps.retrieve(q, 6);
      for (const c of found) seen.set(c.id, c);
      results.push({ functionResponse: { name: TOOL.name, response: { trechos: chunksBlock(found) } } });
    }
    contents.push({ role: "user", parts: results });
  }

  if (!answer.trim()) {
    yield { t: "error", m: "A IA não trouxe resposta. Use a busca ou abra o tópico." };
    return;
  }
  if (cut) {
    const note = "\n\n(Resposta cortada pelo limite de tamanho — abra o tópico citado para o texto completo.)";
    answer += note;
    yield { t: "text", d: note };
  }
  const items = citedIds(answer)
    .map((id) => seen.get(id) ?? chunkById(id))
    .filter((c): c is GuideChunk => Boolean(c))
    .map((c) => ({ id: c.id, slug: c.slug, topic: c.topic, section: c.section, source: c.source, href: c.href }));
  yield { t: "sources", items };
  // Só guarda resposta completa e com fonte; cortada ou sem citação, não.
  if (key && store && !cut && items.length > 0) {
    try {
      await store.save(key, guideVersion(), question, { answer, sources: items });
    } catch (error) {
      console.error("guia: não consegui guardar a resposta", error);
    }
  }
  yield { t: "done" };
}
