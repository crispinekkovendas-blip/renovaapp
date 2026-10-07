"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { buildIndex, completeWord, search } from "@/lib/smart-search";
import type { SearchHit, SearchIndex, SearchDoc } from "@/lib/smart-search";
import { emptyMemory, loadMemory, memoryBoost, rememberPick, saveMemory } from "@/lib/search-history";
import type { SearchMemory } from "@/lib/search-history";
import { searchKey } from "@/lib/normalize";

/** A busca vai para a URL (?q=): voltar do tópico devolve os resultados. */
function writeUrl(query: string) {
  try {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // URL não pôde ser trocada: a busca segue funcionando.
  }
}

/**
 * O estado da busca inteligente do guia: o índice (montado no navegador,
 * logo depois da primeira pintura), a busca na URL (?q=), o texto fantasma
 * para completar e a memória do médico — as buscas recentes e as tentativas
 * que antecederam o que ele abriu.
 *
 * `urlKey` (o caminho da página): quando muda, a busca volta a ser a da URL —
 * a caixa fica no layout e sobrevive à troca de aba. `inherit`: de onde
 * herdar a memória quando esta ainda não tem nenhuma.
 */
export function useSmartSearch(
  scope: string,
  docs: readonly SearchDoc[],
  options: { urlKey?: string; inherit?: readonly { scope: string; prefix: string }[] } = {}
) {
  const { urlKey, inherit } = options;
  const [query, setQueryState] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [memory, setMemory] = useState<SearchMemory>(emptyMemory);
  // As buscas desta procura (as tentativas até abrir algo), com o horário.
  const attempts = useRef<{ q: string; at: number }[]>([]);

  useEffect(() => setMemory(loadMemory(scope, inherit)), [scope, inherit]);

  useEffect(() => {
    // Montar o índice leva uns décimos de segundo: depois de pintar a tela.
    const timer = setTimeout(() => setIndex(buildIndex(docs)), 0);
    return () => clearTimeout(timer);
  }, [docs]);

  useEffect(() => {
    try {
      setQueryState(new URLSearchParams(window.location.search).get("q") ?? "");
    } catch {
      // Sem URL legível: começa vazio.
    }
  }, [urlKey]);

  // A busca vai para a URL e conta como tentativa.
  useEffect(() => {
    const timer = setTimeout(() => {
      writeUrl(query);
      const q = query.trim();
      if (q.length >= 2) {
        const now = Date.now();
        attempts.current = [...attempts.current.filter((a) => now - a.at < 3 * 60_000 && a.q !== q), { q, at: now }];
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  // Busca longa no celular demora: o campo responde na hora e a lista acompanha.
  const deferred = useDeferredValue(query);
  const result = useMemo(() => {
    if (!index || !deferred.trim()) return { hits: [] as SearchHit[], suggestion: null as string | null };
    return search(index, deferred, { boost: (id) => memoryBoost(memory, deferred, id) });
  }, [index, deferred, memory]);

  const ghost = useMemo(() => {
    if (!index) return "";
    const word = completeWord(index, query);
    if (!word) return "";
    const typed = searchKey(query).split(" ").pop() ?? "";
    // Só completa se o que falta encaixa no que foi digitado (sem acento no meio).
    return word.startsWith(typed) ? word.slice(typed.length) : "";
  }, [index, query]);

  const setQuery = useCallback((q: string) => setQueryState(q), []);

  /** O médico abriu `id`: lembra desta busca e das tentativas antes dela, e grava a busca na URL já. */
  const pick = useCallback(
    (id: string) => {
      const q = query.trim();
      writeUrl(q);
      const queries = [...attempts.current.map((a) => a.q), ...(q ? [q] : [])];
      if (queries.length === 0) return;
      const next = rememberPick(memory, queries, id);
      saveMemory(scope, next);
      setMemory(next);
      attempts.current = [];
    },
    [memory, query, scope]
  );

  const forgetRecent = useCallback(() => {
    const next = { ...memory, recent: [] };
    saveMemory(scope, next);
    setMemory(next);
  }, [memory, scope]);

  return {
    query,
    setQuery,
    ready: index !== null,
    /** A lista ainda é da busca anterior (a nova está sendo calculada). */
    stale: deferred !== query,
    hits: result.hits,
    suggestion: result.suggestion,
    ghost,
    recent: memory.recent,
    pick,
    forgetRecent,
  };
}
