"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AskEvent, AskTurn } from "@/lib/guide-ask";
import { CITATION, SOURCE_NAME, citedIds, sourceHref, sourceOf } from "@/lib/guide-citations";

type Source = Extract<AskEvent, { t: "sources" }>["items"][number];

interface Exchange {
  question: string;
  answer: string;
  searches: string[];
  sources: Source[];
  error: string | null;
  done: boolean;
  /** Veio da memória: quando a resposta foi dada. */
  cachedAt: string | null;
}

/**
 * "Perguntar ao guia": a resposta chega enquanto é escrita, com as buscas
 * que a IA fez e cada afirmação ligada ao trecho de onde veio. Perguntas de
 * seguimento levam a conversa junto.
 */
export function GuideAsk({ question, onClose }: { question: string; onClose(): void }) {
  const [thread, setThread] = useState<Exchange[]>([]);
  const [followUp, setFollowUp] = useState("");
  const busy = thread.some((e) => !e.done);
  const abort = useRef<AbortController | null>(null);
  const started = useRef(false);

  const ask = async (q: string, fresh = false) => {
    // "Perguntar de novo" é uma pergunta nova e solta: sem a conversa, para não repetir a resposta guardada.
    const history: AskTurn[] = fresh ? [] : thread.flatMap((e) => [
      { role: "user" as const, content: e.question },
      { role: "assistant" as const, content: e.answer },
    ]);
    const i = thread.length;
    const update = (fn: (e: Exchange) => Exchange) => setThread((t) => t.map((e, k) => (k === i ? fn(e) : e)));
    setThread((t) => [...t, { question: q, answer: "", searches: [], sources: [], error: null, done: false, cachedAt: null }]);

    abort.current = new AbortController();
    try {
      const res = await fetch("/api/guia/perguntar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, history, fresh }),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        update((e) => ({ ...e, error: data.error ?? "Não foi possível perguntar agora.", done: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AskEvent;
          if (event.t === "text") update((e) => ({ ...e, answer: e.answer + event.d }));
          else if (event.t === "search") update((e) => ({ ...e, searches: [...e.searches, event.q] }));
          else if (event.t === "sources") update((e) => ({ ...e, sources: event.items }));
          else if (event.t === "error") update((e) => ({ ...e, error: event.m }));
          else if (event.t === "cached") update((e) => ({ ...e, cachedAt: event.at }));
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") update((e) => ({ ...e, error: "A conexão caiu. Tente de novo." }));
    } finally {
      update((e) => ({ ...e, done: true }));
    }
  };

  // A primeira pergunta sai ao abrir o painel (uma vez só, mesmo com o React montando duas vezes em dev).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void ask(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      aria-label="Resposta do guia"
      className="card mb-4 border-pine-200 bg-gradient-to-b from-pine-50/70 to-white p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold tracking-[0.12em] text-pine-700 uppercase">✨ Pergunta ao guia</p>
        <button
          type="button"
          onClick={() => {
            abort.current?.abort();
            onClose();
          }}
          aria-label="Fechar a resposta"
          className="-mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-lg text-pine-900/45 hover:bg-pine-100 hover:text-pine-950"
        >
          ×
        </button>
      </div>

      <div className="space-y-5">
        {thread.map((e, i) => (
          <ExchangeView
            key={i}
            exchange={e}
            onRefresh={
              e.cachedAt && !busy
                ? () => void ask(e.question, true)
                : undefined
            }
          />
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const q = followUp.trim();
          if (!q || busy) return;
          setFollowUp("");
          void ask(q);
        }}
      >
        <input
          className="input min-w-0 flex-1"
          placeholder="Pergunta de seguimento (ex.: e em criança de 20 kg?)"
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          maxLength={600}
        />
        <button type="submit" disabled={busy || !followUp.trim()} className="btn btn-primary shrink-0 disabled:opacity-40">
          Perguntar
        </button>
      </form>
      <p className="mt-3 text-[11.5px] leading-snug text-pine-900/50">
        Resposta gerada por IA só com o texto do guia, com a fonte de cada trecho. Confira a dose no tópico antes de
        prescrever. Não digite nome ou dados do paciente.
      </p>
    </section>
  );
}

function ExchangeView({ exchange: e, onRefresh }: { exchange: Exchange; onRefresh?: () => void }) {
  // Número de cada fonte na ordem em que aparece na resposta.
  const order = citedIds(e.answer);
  const bySlug = new Map(e.sources.map((s) => [s.id, s]));

  return (
    <div>
      <p className="mt-2 text-[15px] font-bold text-pine-950">{e.question}</p>
      {e.searches.length > 0 ? (
        <p className="mt-1 text-[11.5px] text-pine-900/50">Buscou no guia: {e.searches.map((q) => `“${q}”`).join(", ")}</p>
      ) : null}
      {!e.answer && !e.error && !e.done ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-pine-900/55">
          <span className="h-2 w-2 animate-pulse rounded-full bg-pine-500" /> Lendo o guia…
        </p>
      ) : null}
      {e.answer ? (
        <div className="mt-2 space-y-1.5 text-[14.5px] leading-relaxed break-words text-pine-900/85">
          {renderAnswer(e.answer, order, bySlug)}
          {!e.done ? <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-pine-400 align-middle" /> : null}
        </div>
      ) : null}
      {e.cachedAt ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-emerald-800">
          <span>♻️ Resposta já dada antes ({formatWhen(e.cachedAt)}) · sem custo de IA</span>
          {onRefresh ? (
            <button type="button" onClick={onRefresh} className="font-bold text-pine-600 hover:underline">
              Perguntar de novo
            </button>
          ) : null}
        </p>
      ) : null}
      {e.error ? <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{e.error}</p> : null}
      {e.done && e.sources.length > 0 ? (
        <ol className="mt-3 space-y-1 border-t border-pine-900/10 pt-2 text-[12.5px]">
          {order
            .map((id) => bySlug.get(id))
            .filter((s): s is Source => Boolean(s))
            .map((s) => (
              <li key={s.id} className="flex gap-1.5">
                <span className="font-bold text-pine-600">{order.indexOf(s.id) + 1}.</span>
                <span className="min-w-0">
                  <span className="text-pine-900/45">{SOURCE_NAME[s.source ?? sourceOf(s.id)]} › </span>
                  <Link href={sourceHref(s.id, s.href)} className="font-semibold text-pine-700 hover:underline">
                    {s.topic}
                    {s.section ? ` › ${s.section}` : ""}
                  </Link>
                </span>
              </li>
            ))}
        </ol>
      ) : null}
    </div>
  );
}

/** "2026-10-01 14:32:05" → "01/10 às 14:32". */
function formatWhen(at: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(at);
  return m ? `${m[3]}/${m[2]} às ${m[4]}:${m[5]}` : at;
}

/** Markdown mínimo da resposta: parágrafos, tópicos "- ", **negrito** e as citações [[id]]. */
function renderAnswer(text: string, order: string[], sources: Map<string, Source>): ReactNode {
  const BOLD = /\*\*[^*]+\*\*/;
  const cites = new RegExp(`(${BOLD.source}|${CITATION.source})`, "g");
  const inline = (line: string, key: string) =>
    line.split(cites).map((part, i) => {
      if (new RegExp(`^${CITATION.source}$`).test(part)) {
        // Um grupo [[a#1], [b#2]] vira um número por fonte.
        return (
          <Fragment key={`${key}-${i}`}>
            {(part.match(/[a-z0-9-]+#\d+/g) ?? []).map((id) => {
              const n = order.indexOf(id) + 1;
              const s = sources.get(id);
              return (
                <Link
                  key={id}
                  href={sourceHref(id, s?.href)}
                  title={s ? `${s.topic}${s.section ? ` › ${s.section}` : ""}` : "Abrir o tópico"}
                  className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-pine-100 px-1 align-super text-[10px] font-extrabold text-pine-700 no-underline hover:bg-pine-200"
                >
                  {n || "↗"}
                </Link>
              );
            })}
          </Fragment>
        );
      }
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${key}-${i}`} className="text-pine-950">{part.slice(2, -2)}</strong>;
      return <Fragment key={`${key}-${i}`}>{part}</Fragment>;
    });

  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={`ul-${out.length}`} className="list-disc space-y-1 pl-5">{bullets}</ul>);
    bullets = [];
  };
  lines.forEach((line, i) => {
    const t = line.trim();
    if (/^[-•*]\s+/.test(t)) {
      bullets.push(<li key={i}>{inline(t.replace(/^[-•*]\s+/, ""), `l${i}`)}</li>);
    } else {
      flush();
      if (t) out.push(<p key={i}>{inline(t.replace(/^#+\s*/, ""), `p${i}`)}</p>);
    }
  });
  flush();
  return out;
}
