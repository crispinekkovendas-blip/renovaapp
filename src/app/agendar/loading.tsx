/** Enquanto a agenda livre é calculada: a mesma coluna da página, em blocos. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-paper" aria-busy="true" aria-label="Carregando horários">
      <div className="h-16 border-b border-pine-900/10 bg-peach-50 pt-[env(safe-area-inset-top)]" />
      <div className="mx-auto max-w-3xl animate-pulse px-4 pt-6 sm:px-6 sm:pt-10">
        <div className="h-3 w-40 rounded bg-pine-900/10" />
        <div className="mt-3 h-1.5 w-full rounded-full bg-pine-900/10" />
        <div className="mt-8 h-9 w-72 max-w-full rounded-lg bg-pine-900/10" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="card h-24" />
          <div className="card h-24" />
          <div className="card h-24" />
        </div>
      </div>
    </div>
  );
}
