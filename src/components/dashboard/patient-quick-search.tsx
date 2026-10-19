"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { IconSearch } from "@/components/icons";
import { suggestPatientsAction } from "@/lib/actions-search";
import type { PatientSuggestion } from "@/lib/actions-search";
import { ageFrom, fmtDate } from "@/lib/format";

/**
 * Busca de paciente da tela inicial: a cada letra (nome) ou dígito (CPF,
 * celular) abre a lista dos pacientes que batem; escolher um abre o
 * prontuário. Enter sem escolher leva à lista completa de Pacientes, como antes.
 */
export function PatientQuickSearch() {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSuggestion[]>([]);
  const [searched, setSearched] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearched("");
      return;
    }
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const found = await suggestPatientsAction(term);
        // Só a resposta da última tecla vale: uma lenta não sobrescreve a nova.
        if (mine !== seq.current) return;
        setResults(found);
        setSearched(term);
        setActive(found.length ? 0 : -1);
        setOpen(true);
      } catch {
        if (mine === seq.current) setResults([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const go = (patient: PatientSuggestion) => {
    setOpen(false);
    router.push(`/pacientes/${patient.id}`);
  };

  const showList = open && query.trim().length >= 2 && searched !== "";

  return (
    <form
      ref={boxRef}
      action="/pacientes"
      method="get"
      role="search"
      className="relative flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-sm"
      onSubmit={(event) => {
        if (showList && active >= 0 && results[active]) {
          event.preventDefault();
          go(results[active]);
        }
      }}
    >
      <IconSearch className="h-4 w-4 shrink-0 text-pine-900/50" />
      {/* 16px no celular: abaixo disso o iOS dá zoom ao focar. */}
      <input
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-pine-900/45 sm:text-sm"
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (!showList) return;
          if (event.key === "ArrowDown") setActive((i) => Math.min(i + 1, results.length - 1));
          else if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, -1));
          else if (event.key === "Escape") setOpen(false);
          else return;
          event.preventDefault();
        }}
        placeholder="Nome, CPF ou celular do paciente…"
        aria-label="Buscar paciente"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      <button type="submit" className="btn btn-primary px-4 py-1.5 text-xs">
        Buscar
      </button>

      {showList ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[0_18px_40px_-16px_rgba(18,26,38,0.35)]">
          <ul id={listId} role="listbox" aria-label="Pacientes encontrados" className="max-h-[min(22rem,55dvh)] overflow-y-auto overscroll-contain">
            {results.map((patient, i) => (
              <li
                key={patient.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerEnter={() => setActive(i)}
                onClick={() => go(patient)}
                className={`flex min-h-11 cursor-pointer flex-col justify-center border-b border-[var(--color-line)] px-4 py-2.5 last:border-b-0 ${
                  i === active ? "bg-pine-50" : ""
                }`}
              >
                <span className="truncate text-[13.5px] font-bold text-pine-950">
                  {patient.social_name || patient.name}
                  {patient.social_name ? <span className="font-normal text-pine-900/50"> · {patient.name}</span> : null}
                </span>
                <span className="truncate text-[11.5px] text-pine-900/55">
                  {[
                    patient.cpf ? `CPF ${patient.cpf}` : null,
                    patient.birth_date ? `${fmtDate(patient.birth_date)} (${ageFrom(patient.birth_date)})` : null,
                    patient.phone,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem CPF ou celular no cadastro"}
                </span>
              </li>
            ))}
          </ul>
          {results.length === 0 ? (
            <p className="px-4 py-3 text-[12.5px] text-pine-900/60">Nenhum paciente com “{searched}”.</p>
          ) : null}
          <a
            href={`/pacientes/novo`}
            className="flex min-h-11 items-center border-t border-[var(--color-line)] px-4 py-2.5 text-[12.5px] font-bold text-pine-600 hover:bg-pine-50"
          >
            + Cadastrar novo paciente
          </a>
        </div>
      ) : null}
    </form>
  );
}
