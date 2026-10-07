/**
 * Enquanto o compositor carrega (paciente, modelos, histórico): o esqueleto
 * da mesma tela — cabeçalho, etapas, pílulas de tipo, editor e, no desktop,
 * a coluna da prévia e o rail. Sem isto valia o esqueleto da lista de pacientes.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando o compositor">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full bg-pine-900/10 sm:h-12 sm:w-12" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-pine-900/10" />
          <div className="h-5 w-44 rounded-lg bg-pine-900/10" />
        </div>
      </div>
      <div className="h-6 w-56 rounded-full bg-pine-900/10" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)_4rem] lg:gap-x-5">
        <div className="space-y-3">
          <div className="flex gap-2 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-32 shrink-0 rounded-full bg-pine-900/10" />
            ))}
          </div>
          <div className="card h-96" />
        </div>
        <div className="card hidden h-[28rem] lg:block" />
        <div className="hidden space-y-2 lg:block">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[58px] w-16 rounded-2xl bg-pine-900/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
