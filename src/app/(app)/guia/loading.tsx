/** Esqueleto do Guia clínico: a busca do alto, as seções e os cartões das condições. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-5" aria-busy="true" aria-label="Carregando o guia clínico">
      <div className="h-12 rounded-2xl bg-pine-900/10" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-32 rounded-full bg-pine-900/10" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-pine-900/10" />
        <div className="h-4 w-full max-w-xl rounded bg-pine-900/10" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="card space-y-2 p-4">
            <div className="h-4 w-2/3 rounded bg-pine-900/10" />
            <div className="h-3 w-full rounded bg-pine-900/10" />
            <div className="h-3 w-1/2 rounded bg-pine-900/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
