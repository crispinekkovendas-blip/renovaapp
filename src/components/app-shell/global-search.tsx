"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { CloseButton } from "@/components/close-button";
import { patientSuggestionDetail, usePatientSuggestions } from "@/components/dashboard/patient-quick-search";
import { IconSearch } from "@/components/icons";
import { commandsFor, matchCommands } from "@/lib/command-search";
import type { Role } from "@/lib/db";
import { navItemsFor } from "./nav-config";

const OPEN_EVENT = "shinmed:abrir-busca";

const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Botão de lupa da barra do celular. */
export function SearchIconButton() {
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label="Buscar paciente ou ação"
      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-pine-950 hover:bg-pine-50"
    >
      <IconSearch className="h-5 w-5" />
    </button>
  );
}

/** Faixa do tablet e do desktop, acima do conteúdo de toda página. */
export function SearchBarTrigger() {
  return (
    <div className="hidden justify-end px-6 pt-3 md:flex md:px-8 print:hidden">
      <button
        type="button"
        onClick={openSearch}
        className="flex h-9 w-72 max-w-full cursor-pointer items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-3.5 text-[13px] text-pine-900/55 transition-colors hover:border-pine-400"
      >
        <IconSearch className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">Buscar paciente ou ação…</span>
        <kbd className="shrink-0 rounded-md bg-pine-50 px-1.5 py-0.5 font-sans text-[11px] font-bold text-pine-900/60">Ctrl K</kbd>
      </button>
    </div>
  );
}

/** Ctrl+K (ou a lupa) abre a busca de pacientes e ações em qualquer tela. */
export function GlobalSearch({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return open ? <SearchDialog role={role} onClose={() => setOpen(false)} /> : null;
}

type Row = { key: string; href: string; title: string; detail?: string };

function SearchDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { results, searched } = usePatientSuggestions(query);

  const commands = useMemo(() => commandsFor(role, navItemsFor(role)), [role]);
  const term = query.trim();
  const showPatients = term.length >= 2;

  const patientRows: Row[] = showPatients
    ? results.map((p) => ({
        key: `p${p.id}`,
        href: `/pacientes/${p.id}`,
        title: p.social_name || p.name,
        detail: patientSuggestionDetail(p),
      }))
    : [];
  const commandRows: Row[] = matchCommands(term, commands).map((c) => ({
    key: `c${c.href}`,
    href: c.href,
    title: c.label,
  }));
  const rows = [...patientRows, ...commandRows];
  const noPatients = showPatients && searched !== "" && results.length === 0;

  // A lista mudou: volta para o primeiro item.
  const signature = rows.map((r) => r.key).join();
  useEffect(() => setActive(0), [signature]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const go = (row: Row) => {
    onClose();
    router.push(row.href);
  };

  const renderRow = (row: Row, index: number) => (
    <li
      key={row.key}
      id={`${listId}-${index}`}
      role="option"
      aria-selected={index === active}
      onPointerEnter={() => setActive(index)}
      onClick={() => go(row)}
      className={`flex min-h-11 cursor-pointer flex-col justify-center px-4 py-2 ${index === active ? "bg-pine-50" : ""}`}
    >
      <span className="truncate text-[13.5px] font-bold text-pine-950">{row.title}</span>
      {row.detail ? <span className="truncate text-[11.5px] text-pine-900/55">{row.detail}</span> : null}
    </li>
  );

  const groupTitle = "px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-pine-900/50";

  return (
    <div
      className="sheet-backdrop fixed inset-0 z-[60] flex items-start justify-center bg-pine-950/40 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-sm sm:pt-[12vh] print:hidden"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar paciente ou ação"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-16px_rgba(18,26,38,0.35)]"
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] pl-4 pr-1">
          <IconSearch className="h-4 w-4 shrink-0 text-pine-900/50" />
          {/* 16px no celular: abaixo disso o iOS dá zoom ao focar. */}
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") setActive((i) => Math.min(i + 1, rows.length - 1));
              else if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
              else if (event.key === "Enter" && rows[active]) go(rows[active]);
              else if (event.key === "Escape") onClose();
              else if (event.key !== "Tab") return;
              // Tab fica no campo: a lista se percorre com as setas.
              event.preventDefault();
            }}
            placeholder="Nome, CPF, celular ou o que quer fazer…"
            aria-label="Buscar paciente ou ação"
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-pine-900/45 sm:text-sm"
          />
          <CloseButton onClick={onClose} />
        </div>

        <div id={listId} role="listbox" aria-label="Resultados" className="max-h-[min(26rem,60dvh)] overflow-y-auto overscroll-contain pb-2">
          {patientRows.length > 0 ? (
            <>
              <p className={groupTitle}>Pacientes</p>
              <ul role="presentation">{patientRows.map(renderRow)}</ul>
            </>
          ) : null}
          {noPatients ? <p className="px-4 pt-3 text-[12.5px] text-pine-900/60">Nenhum paciente com “{searched}”.</p> : null}
          {commandRows.length > 0 ? (
            <>
              <p className={groupTitle}>{term ? "Ações" : "Atalhos"}</p>
              <ul role="presentation">{commandRows.map((row, i) => renderRow(row, patientRows.length + i))}</ul>
            </>
          ) : null}
          {rows.length === 0 && !noPatients ? (
            <p className="px-4 pt-3 text-[12.5px] text-pine-900/60">Nada encontrado.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
