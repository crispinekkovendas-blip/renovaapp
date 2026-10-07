"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { plainLine } from "@/lib/revision-diff";
import type { ConciseLine } from "@/lib/revision-diff";
import { ConciseLines } from "./concise";

export interface RevisionItem {
  /** Estável entre visitas: a decisão do médico fica presa a ele. */
  id: string;
  tab: string;
  kind: string;
  where: string;
  title: string;
  href: string;
  text: string;
  before: string[] | null;
  after: string[] | null;
  /** Só o que mudou: é o que aparece primeiro; o motivo e o texto inteiro ficam em "Detalhes". */
  concise: ConciseLine[];
  afterLabel: string;
}

type Decision = "ok" | "no";
type Filter = "todas" | "faltam" | "no";

const KEY = "renova:revisoes:decisoes:v1";
const TAB_LABEL: Record<string, string> = { receitas: "Receitas prontas", plantao: "Plantão", drive: "Drive" };

function load(): Record<string, Decision> {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Decision>) : {};
  } catch {
    return {};
  }
}

function save(decisions: Record<string, Decision>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(decisions));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): a decisão vale só nesta visita.
  }
}

/**
 * A lista de mudanças de uma revisão, para o médico ler e decidir: em cada
 * uma, "Concordo" ou "Discordo". As decisões ficam neste aparelho; as
 * discordâncias podem ser copiadas para mandar à equipe.
 */
export function RevisionList({ items, revLabel }: { items: readonly RevisionItem[]; revLabel: string }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [filter, setFilter] = useState<Filter>("todas");
  const [copied, setCopied] = useState(false);
  const [allDetails, setAllDetails] = useState(false);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => setDecisions(load()), []);
  const toggleDetails = (id: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const decide = (id: string, d: Decision) =>
    setDecisions((prev) => {
      const next = { ...prev };
      if (next[id] === d) delete next[id];
      else next[id] = d;
      save(next);
      return next;
    });

  const counts = useMemo(() => {
    let ok = 0;
    let no = 0;
    for (const i of items) {
      if (decisions[i.id] === "ok") ok++;
      else if (decisions[i.id] === "no") no++;
    }
    return { ok, no, left: items.length - ok - no };
  }, [items, decisions]);

  const visible = items.filter((i) =>
    filter === "todas" ? true : filter === "faltam" ? !decisions[i.id] : decisions[i.id] === "no"
  );

  const copyDisagreements = async () => {
    const lines = items
      .filter((i) => decisions[i.id] === "no")
      .map((i) => {
        const what = i.concise.map(plainLine).join(" | ");
        return `• [${TAB_LABEL[i.tab] ?? i.tab}] ${i.title} (${i.kind}): ${what}\n  Motivo: ${i.text}`;
      });
    const text = `Discordo destas mudanças do Guia clínico (${revLabel}):\n\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="card flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5 text-[13px]">
        <span className="font-bold text-pine-950">
          {counts.left === 0 ? "Tudo decidido nesta lista" : `Faltam ${counts.left} de ${items.length}`}
        </span>
        <span className="text-emerald-800">✓ {counts.ok} concordo</span>
        <span className="text-rose-800">✗ {counts.no} discordo</span>
        <span className="flex flex-wrap gap-1.5 sm:ml-auto">
          {(
            [
              ["todas", "Todas"],
              ["faltam", "Faltam decidir"],
              ["no", "Discordei"],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-2.5 py-1 text-[12px] font-bold pointer-coarse:min-h-9 ${
                filter === f ? "border-pine-950 bg-pine-950 text-white" : "border-pine-900/12 bg-white text-pine-900/70"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={allDetails}
            onClick={() => setAllDetails((v) => !v)}
            className={`rounded-full border px-2.5 py-1 text-[12px] font-bold pointer-coarse:min-h-9 ${
              allDetails ? "border-pine-950 bg-pine-950 text-white" : "border-pine-900/12 bg-white text-pine-900/70"
            }`}
          >
            {allDetails ? "Só o resumo" : "Detalhes de todas"}
          </button>
          {counts.no > 0 ? (
            <button
              type="button"
              onClick={copyDisagreements}
              className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-[12px] font-bold text-rose-900 pointer-coarse:min-h-9"
            >
              {copied ? "Copiado ✓" : "Copiar discordâncias"}
            </button>
          ) : null}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="card mt-3 px-5 py-8 text-center text-sm text-pine-900/60">Nada nesta lista.</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {visible.map((item) => {
            const d = decisions[item.id];
            return (
              <li
                key={item.id}
                className={`card min-w-0 p-3.5 sm:p-4 ${d === "ok" ? "opacity-70" : d === "no" ? "ring-1 ring-rose-300" : ""}`}
              >
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-semibold text-pine-900/50">
                  <span className="rounded-full bg-pine-50 px-2 py-0.5 font-bold text-pine-800">{item.tab}</span>
                  <span>{item.kind}</span>
                  <span>· {item.where}</span>
                </p>
                <Link href={item.href} className="mt-1 block text-[15px] font-bold break-words text-pine-950 hover:underline">
                  {item.title}
                </Link>
                <div className="mt-1.5 text-[13.5px]">
                  <ConciseLines lines={item.concise} />
                </div>
                {!allDetails ? (
                  <button
                    type="button"
                    aria-expanded={opened.has(item.id)}
                    onClick={() => toggleDetails(item.id)}
                    className="mt-1 inline-flex min-h-8 items-center text-[12px] font-bold text-pine-600 hover:underline pointer-coarse:min-h-10"
                  >
                    {opened.has(item.id) ? "Esconder detalhes" : "Detalhes: motivo, antes e agora"}
                  </button>
                ) : null}
                {allDetails || opened.has(item.id) ? (
                  <div className="mt-1.5 rounded-xl bg-pine-50/50 px-3 py-2.5">
                    <p className="text-[13px] leading-snug text-pine-900/80">{item.text}</p>
                    {item.before || item.after ? (
                      <div className="mt-2 grid gap-1.5 text-[12.5px] sm:grid-cols-2">
                        {item.before ? (
                          <div className="min-w-0 rounded-lg bg-rose-50/70 px-2.5 py-1.5 break-words">
                            <p className="text-[10.5px] font-extrabold text-rose-800/80 uppercase">Antes</p>
                            {item.before.map((l, k) => (
                              <p key={k} className="text-rose-950/80">
                                {l}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        {item.after ? (
                          <div className="min-w-0 rounded-lg bg-emerald-50/70 px-2.5 py-1.5 break-words">
                            <p className="text-[10.5px] font-extrabold text-emerald-800/80 uppercase">{item.afterLabel}</p>
                            {item.after.map((l, k) => (
                              <p key={k} className="text-emerald-950/85">
                                {l}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Sua decisão">
                  <button
                    type="button"
                    aria-pressed={d === "ok"}
                    onClick={() => decide(item.id, "ok")}
                    className={`rounded-full border px-3 py-1 text-[12px] font-bold pointer-coarse:min-h-9 ${
                      d === "ok" ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-300 bg-white text-emerald-800"
                    }`}
                  >
                    ✓ Concordo
                  </button>
                  <button
                    type="button"
                    aria-pressed={d === "no"}
                    onClick={() => decide(item.id, "no")}
                    className={`rounded-full border px-3 py-1 text-[12px] font-bold pointer-coarse:min-h-9 ${
                      d === "no" ? "border-rose-700 bg-rose-700 text-white" : "border-rose-300 bg-white text-rose-800"
                    }`}
                  >
                    ✗ Discordo
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-[12px] text-pine-900/50">
        Suas decisões ficam salvas neste aparelho. Para avisar a equipe, use “Copiar discordâncias” e envie a mensagem.
      </p>
    </div>
  );
}
