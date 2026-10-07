/** Esqueleto enquanto os agregados do mês carregam: título, quatro números e as tabelas. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando relatórios">
      <div className="mb-6 h-9 w-40 rounded-lg bg-pine-900/10" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-28" />
        ))}
      </div>
      <div className="card mt-8 h-64" />
    </div>
  );
}
