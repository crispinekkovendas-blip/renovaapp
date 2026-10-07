export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="mb-6 h-9 w-64 rounded-lg bg-pine-900/10" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card mt-8 h-64" />
      <div className="card mt-8 h-48" />
    </div>
  );
}
