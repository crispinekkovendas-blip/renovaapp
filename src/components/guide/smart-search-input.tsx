"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { IconSearch } from "@/components/icons";

/**
 * O campo da busca inteligente: mostra em cinza o resto da palavra que o
 * sistema prevê (Tab ou → aceitam), as buscas recentes quando está vazio, e
 * leva ↑ ↓ Enter para a lista de resultados.
 */
export function SmartSearchInput({
  query,
  onQuery,
  ghost,
  placeholder,
  recent,
  onForgetRecent,
  onMove,
  onEnter,
  label,
}: {
  query: string;
  onQuery(q: string): void;
  ghost: string;
  placeholder: string;
  recent: readonly string[];
  onForgetRecent(): void;
  /** ↑/↓ na lista de resultados. */
  onMove?(delta: number): void;
  onEnter?(): void;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const showRecent = focused && !query && recent.length > 0;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const atEnd = event.currentTarget.selectionStart === query.length;
    if (ghost && atEnd && (event.key === "Tab" || event.key === "ArrowRight")) {
      event.preventDefault();
      onQuery(query + ghost + " ");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onMove?.(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      onMove?.(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onEnter?.();
    } else if (event.key === "Escape") {
      onQuery("");
    }
  };

  return (
    <div className="relative">
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 z-[1] h-4 w-4 -translate-y-1/2 text-pine-900/40" />
        {/* O texto fantasma fica exatamente atrás do que foi digitado. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-10 left-10 flex items-center overflow-hidden text-base whitespace-pre sm:text-sm"
        >
          <span className="invisible">{query}</span>
          <span className="text-pine-900/35">{ghost}</span>
        </span>
        <input
          ref={input}
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="input relative bg-transparent pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
          placeholder={placeholder}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          aria-describedby={ghost ? "busca-dica" : undefined}
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              onQuery("");
              input.current?.focus();
            }}
            className="absolute top-1/2 right-2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-lg text-pine-900/45 hover:bg-pine-50 hover:text-pine-950"
          >
            ×
          </button>
        ) : null}
      </label>
      {ghost ? (
        <p id="busca-dica" className="sr-only">
          Sugestão: {query + ghost}. Tab para completar.
        </p>
      ) : null}

      {showRecent ? (
        <div className="absolute inset-x-0 top-full z-20 mt-1.5 rounded-2xl border border-pine-900/10 bg-white p-2 shadow-[0_12px_32px_-12px_rgba(40,20,70,0.25)]">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] font-bold tracking-[0.1em] text-pine-900/45 uppercase">Buscas recentes</span>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onForgetRecent}
              className="text-[11px] font-bold text-pine-900/45 hover:text-pine-950"
            >
              Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1 pb-1">
            {recent.map((q) => (
              <button
                key={q}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onQuery(q)}
                className="max-w-full truncate rounded-full bg-pine-50 px-3 py-1.5 text-[13px] font-semibold text-pine-900 hover:bg-pine-100 pointer-coarse:min-h-10"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Texto com as palavras achadas em destaque. */
export function Highlighted({ parts }: { parts: readonly { text: string; hit: boolean }[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-sm bg-sun-300/60 px-0.5 text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}
