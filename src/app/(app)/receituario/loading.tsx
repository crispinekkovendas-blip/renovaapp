/** Esqueleto comum das telas do Receituário: título, barra de busca e a lista. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando o receituário">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-pine-900/10" />
        <div className="h-4 w-72 rounded bg-pine-900/10" />
      </div>
      <div className="h-10 max-w-xl rounded-2xl bg-pine-900/10" />
      <div className="card divide-y divide-pine-900/5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="h-4 flex-1 rounded bg-pine-900/10" />
            <div className="h-6 w-24 rounded-full bg-pine-900/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
