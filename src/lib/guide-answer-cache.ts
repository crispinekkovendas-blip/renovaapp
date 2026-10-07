import { sql } from "./db.ts";
import { stem, tokens } from "./smart-search.ts";
import { guideChunks } from "./emergency-guide/chunks.ts";
import { textHash } from "./emergency-guide/vectors.ts";
import { CONDITION_TERMS, allTermsOf } from "./clinical-terms.ts";
import { isMigrationPending } from "./pg-errors.ts";

/**
 * Memória das respostas da Super Inteligência: a mesma pergunta, feita de
 * novo por qualquer médico, volta na hora e sem custo.
 *
 * "Mesma pergunta" é decidido de propósito pelas palavras, não pelo
 * sentido: na calibração com os embeddings, "adrenalina na anafilaxia em
 * criança" × "… em adulto" deu 0,949 de similaridade — tão perto quanto uma
 * paráfrase de verdade (0,950–0,983). O que separa os dois casos é a
 * palavra clínica. Então a chave é o conjunto das palavras que importam
 * (radical, sem ordem, sem "qual", "pra", "numa") + os números ("20 kg").
 * Reaproveitar errado seria perigoso; deixar de reaproveitar custa centavos.
 *
 * A chave leva junto a versão do guia: se o texto do guia muda (errata
 * nova), as respostas antigas deixam de valer sozinhas.
 */

/** Palavras de conversa que não mudam a pergunta ("qual a dose pra…", "posso usar…"). */
const FILLER = new Set(
  "pra pro pras pros numa num numas nuns posso pode podemos usar uso serve servem fazer faco depois proximo passo agora entao ai favor sobre preciso queria gostaria saber me eu voce devo deve seria".split(
    " "
  )
);

/** Os números da pergunta ("20 kg", "0,5 mg", "230x130") — mudam a resposta. */
export function questionNumbers(question: string): string[] {
  return [...new Set((question.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".")))].sort();
}

/**
 * A chave da pergunta: radicais das palavras que importam, ordenados, mais
 * os números. Pergunta curta demais (menos de 2 palavras) não entra na
 * memória — "dose?" sozinho é ambíguo.
 */
export function questionKey(question: string): string | null {
  const words = [
    ...new Set(
      tokens(question)
        .filter((t) => !/\d/.test(t) && !FILLER.has(t))
        .map((t) => stem(t))
    ),
  ].sort();
  if (words.length < 2) return null;
  return `${words.join(" ")}|${questionNumbers(question).join(" ")}`;
}

let version: string | null = null;

/**
 * Muda quando o texto de qualquer trecho do guia muda — ou o vocabulário de
 * nomes e sintomas (clinical-terms.ts), que muda o que a busca acha: uma
 * resposta guardada como "o guia não traz" pode passar a ter resposta.
 */
const PROMPT_REVISION = 2;

export function guideVersion(): string {
  if (!version) {
    const chunks = guideChunks().map((c) => `${c.id}:${c.text}`).join("\n");
    // PROMPT_REVISION: subir quando o SYSTEM do guide-ask mudar o formato da resposta (2: hipóteses antes da conduta).
    version = textHash(`prompt:${PROMPT_REVISION}\n${chunks}\n${JSON.stringify(CONDITION_TERMS.map(allTermsOf))}`);
  }
  return version;
}

export interface CachedAnswer {
  answer: string;
  sources: { id: string; slug: string; topic: string; section: string | null; source?: "plantao" | "receitas" | "drive"; href?: string }[];
  /** "2026-10-01 14:32" */
  createdAt: string;
}

export interface AnswerStore {
  get(key: string, guide: string): Promise<CachedAnswer | null>;
  save(key: string, guide: string, question: string, entry: Omit<CachedAnswer, "createdAt">): Promise<void>;
}

/** Respostas mais velhas que isso são refeitas (o modelo pode ter melhorado). */
const MAX_AGE_DAYS = 90;

/**
 * Memória no banco (tabela guide_answer_cache, migração 2026-10-01). Sem a
 * tabela, cai para a memória da própria instância — funciona, só não é
 * compartilhada entre servidores nem sobrevive a um reinício.
 */
export function databaseStore(): AnswerStore {
  const memory = new Map<string, CachedAnswer>();
  let tableMissing = false;
  const memKey = (key: string, guide: string) => `${guide}|${key}`;

  return {
    async get(key, guide) {
      if (!tableMissing) {
        try {
          const rows = await sql<{ answer: string; sources: string; created_at: string }>`
            UPDATE guide_answer_cache
               SET hits = hits + 1,
                   last_used_at = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
             WHERE question_key = ${key} AND guide_version = ${guide}
               AND created_at >= to_char(timezone('America/Sao_Paulo', now()) - make_interval(days => ${MAX_AGE_DAYS}), 'YYYY-MM-DD HH24:MI:SS')
            RETURNING answer, sources, created_at`;
          if (rows[0]) return { answer: rows[0].answer, sources: JSON.parse(rows[0].sources), createdAt: rows[0].created_at };
          return null;
        } catch (error) {
          if (!isMigrationPending(error)) throw error;
          tableMissing = true;
        }
      }
      return memory.get(memKey(key, guide)) ?? null;
    },
    async save(key, guide, question, entry) {
      const createdAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      if (!tableMissing) {
        try {
          await sql`
            INSERT INTO guide_answer_cache (question_key, guide_version, question, answer, sources)
            VALUES (${key}, ${guide}, ${question.slice(0, 600)}, ${entry.answer}, ${JSON.stringify(entry.sources)})
            ON CONFLICT (question_key, guide_version) DO UPDATE
              SET answer = EXCLUDED.answer, sources = EXCLUDED.sources, question = EXCLUDED.question,
                  created_at = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')`;
          return;
        } catch (error) {
          if (!isMigrationPending(error)) throw error;
          tableMissing = true;
        }
      }
      if (memory.size > 500) memory.delete(memory.keys().next().value!);
      memory.set(memKey(key, guide), { ...entry, createdAt });
    },
  };
}

/** Memória só em RAM — para teste. */
export function memoryStore(): AnswerStore {
  const memory = new Map<string, CachedAnswer>();
  return {
    async get(key, guide) {
      return memory.get(`${guide}|${key}`) ?? null;
    },
    async save(key, guide, _question, entry) {
      memory.set(`${guide}|${key}`, { ...entry, createdAt: "2026-10-01 12:00" });
    },
  };
}
