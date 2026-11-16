/** Esqueleto das telas do WhatsApp: título e a lista de conversas (vale também para a conversa aberta e o Configurar). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-5" aria-busy="true" aria-label="Carregando o WhatsApp">
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg bg-pine-900/10" />
        <div className="h-4 w-full max-w-md rounded bg-pine-900/10" />
      </div>
      <div className="card divide-y divide-pine-900/5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-pine-900/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-pine-900/10" />
              <div className="h-3 w-2/3 rounded bg-pine-900/10" />
            </div>
            <div className="h-6 w-20 shrink-0 rounded-full bg-pine-900/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
