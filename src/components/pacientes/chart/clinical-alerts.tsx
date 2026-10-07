/**
 * Alergias e medicamentos em uso ("uma por linha" no cadastro) viram faixas no
 * alto do prontuário — a de alergias em vermelho, impossível de não ver.
 */
export function ClinicalAlerts({ allergies, medications }: { allergies: string[]; medications: string[] }) {
  return (
    <>
      {allergies.length > 0 ? (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-rose-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
              <path d="M12 3 2.5 20h19L12 3z" />
              <path d="M12 10v4M12 17.5v.5" />
            </svg>
            Alergias
          </span>
          {allergies.map((item) => (
            <span key={item} className="chip bg-rose-600 text-white">
              {item}
            </span>
          ))}
        </div>
      ) : null}
      {medications.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-pine-900/10 bg-pine-50 px-4 py-3">
          <span className="text-xs font-bold text-pine-900/60">Medicamentos em uso</span>
          {medications.map((item) => (
            <span key={item} className="chip bg-white text-pine-900 ring-1 ring-pine-900/10">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
