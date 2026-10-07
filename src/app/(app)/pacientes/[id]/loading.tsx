/** Esqueleto da ficha: cabeçalho, pílulas de ação e as duas colunas do prontuário. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando prontuário">
      <div className="card mb-4 flex items-center gap-4 p-4 sm:p-5">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-pine-900/10 sm:h-14 sm:w-14" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-pine-900/10" />
          <div className="h-6 w-48 max-w-full rounded-lg bg-pine-900/10" />
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="h-11 w-full rounded-full bg-pine-900/10 sm:w-44" />
        <div className="h-11 w-32 rounded-full bg-pine-900/10" />
        <div className="h-11 w-28 rounded-full bg-pine-900/10" />
      </div>
      <div className="grid items-start gap-6 sm:gap-8 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <div className="h-7 w-36 rounded-lg bg-pine-900/10" />
          <div className="card h-24" />
          <div className="card h-20" />
          <div className="card h-48" />
        </div>
        <div className="card h-80" />
      </div>
    </div>
  );
}
