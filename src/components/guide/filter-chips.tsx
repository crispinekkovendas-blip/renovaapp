"use client";

/**
 * Chips para navegar o guia por seção (capítulo, grupo): "Todos" e uma por
 * seção, com a contagem. Servem para folhear — com texto na busca eles
 * somem e a busca cobre a aba inteira.
 */
export function FilterChips({
  label,
  options,
  total,
  value,
  onChange,
}: {
  label: string;
  options: readonly { key: string; count: number }[];
  total: number;
  value: string | null;
  onChange(value: string | null): void;
}) {
  const all: { key: string | null; count: number }[] = [{ key: null, count: total }, ...options];
  return (
    <div className="scroll-x -mx-1 mb-4 flex gap-1.5 px-1 pb-0.5 lg:flex-wrap" role="group" aria-label={label}>
      {all.map(({ key, count }) => {
        const on = key === value;
        return (
          <button
            key={key ?? "todos"}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors pointer-coarse:min-h-10 ${
              on
                ? "border-pine-950 bg-pine-950 text-white"
                : "border-pine-900/12 bg-white text-pine-900/70 hover:border-pine-400 hover:text-pine-950"
            }`}
          >
            {key ?? "Todos"} <span className={on ? "text-white/60" : "text-pine-900/40"}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
