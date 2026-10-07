/** Esqueleto de configurações e subpáginas (horários, modelos, API). */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando configurações">
      <div className="mb-6 h-9 w-48 rounded-lg bg-pine-900/10" />
      <div className="card h-40" />
      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="card h-72" />
        <div className="card h-72" />
      </div>
    </div>
  );
}
