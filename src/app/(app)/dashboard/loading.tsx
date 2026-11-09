export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="mb-5 h-16 w-64 rounded-lg bg-pine-900/10" />
      <div className="h-44 rounded-[24px] bg-pine-900/10" />
      <div className="card mt-8 h-64" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
    </div>
  );
}
