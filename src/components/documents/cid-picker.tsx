"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchCidAction } from "@/lib/actions-documents";
import { isCidCode, sexMismatchWarning } from "@/lib/cid";

/**
 * Campo de CID com busca no catálogo do DATASUS.
 *
 * Continua sendo um campo de texto: o valor é o que o médico escrever, e o
 * catálogo só ajuda a achar. Isso é de propósito — sem a migração, ou com um
 * código que a versão 2008 do DATASUS não tem, o campo funciona como sempre
 * funcionou. Nenhum documento deixa de ser emitido porque o catálogo não
 * carregou.
 */

interface Hit {
  code: string;
  description: string;
  chapter: string | null;
  sexRestriction: "M" | "F" | null;
}

export function CidPicker({
  value,
  onChange,
  id,
  label,
  patientSex,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label: string;
  /** Para avisar quando o código é classificado para outro sexo. */
  patientSex?: string | null;
}) {
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Hit | null>(null);
  const [searching, startSearch] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2 || (chosen && chosen.code === term)) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        setHits(await searchCidAction(term));
        setOpen(true);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [value, chosen]);

  useEffect(() => {
    if (!open) return;
    // pointerdown e não mousedown: vale para o dedo também, sem esperar o clique emulado.
    const onDown = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    // Esc também fecha, como em todo pop-up do app.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(hit: Hit) {
    setChosen(hit);
    onChange(hit.code);
    setHits([]);
    setOpen(false);
  }

  const warning = chosen ? sexMismatchWarning(chosen, patientSex) : null;
  // Código escrito à mão que não veio da lista: avisa que não foi conferido.
  const unverified = value.trim() !== "" && !chosen && isCidCode(value) ? value.trim().toUpperCase() : null;

  return (
    <div ref={boxRef} className="relative">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        className="input"
        id={id}
        name={id.replace(/^.*-/, "")}
        value={value}
        autoComplete="off"
        placeholder="Código ou doença — ex.: J11, gastroenterite"
        onChange={(e) => {
          setChosen(null);
          onChange(e.target.value);
        }}
        onFocus={() => hits.length > 0 && setOpen(true)}
      />

      {chosen ? (
        <p className="mt-1 text-[11.5px] font-semibold text-pine-700">{chosen.description}</p>
      ) : unverified && !open ? (
        // Só depois que a lista fecha: com resultados na tela o médico ainda
        // está escolhendo, e dizer "não conferido" ali é adiantado.
        <p className="mt-1 text-[11px] text-pine-900/50">Código digitado — não conferido no catálogo.</p>
      ) : (
        <p className="mt-1 text-[11px] text-pine-900/50">
          {searching ? "Buscando…" : "Busque pelo código ou pelo nome da doença (CID-10, DATASUS)."}
        </p>
      )}

      {warning ? (
        <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11.5px] font-semibold text-amber-900">
          {warning}
        </p>
      ) : null}

      {open && hits.length > 0 ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-[#e2dcec] bg-white shadow-lg">
          {/* No celular o teclado come metade da tela: a lista não passa de 45% da altura visível. */}
          <ul className="max-h-[min(16rem,45dvh)] overflow-y-auto overscroll-contain">
            {hits.map((hit) => (
              <li key={hit.code}>
                <button
                  type="button"
                  onClick={() => pick(hit)}
                  className="flex min-h-11 w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-pine-50 sm:min-h-0 sm:py-2"
                >
                  <span className="shrink-0 font-mono text-[12.5px] font-bold text-pine-700">{hit.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[13px] text-pine-950">{hit.description}</span>
                    {hit.chapter ? (
                      <span className="block truncate text-[11px] text-pine-900/45">{hit.chapter}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
