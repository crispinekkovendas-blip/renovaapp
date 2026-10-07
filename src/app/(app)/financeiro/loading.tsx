export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando financeiro">
      <div className="mb-6 h-9 w-40 rounded-lg bg-pine-900/10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card mt-6 h-80" />
    </div>
  );
}
