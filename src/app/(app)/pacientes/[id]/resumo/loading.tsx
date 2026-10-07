/** O resumo espera a resposta da IA (alguns segundos): o esqueleto avisa que está vindo. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6 animate-pulse">
        <div className="h-8 w-72 max-w-full rounded-lg bg-pine-900/10" />
        <div className="mt-2 h-4 w-40 rounded bg-pine-900/10" />
      </div>
      <div className="card max-w-3xl space-y-3 p-4 sm:p-6">
        <p role="status" className="text-sm font-semibold text-pine-900/60">
          Gerando o resumo do prontuário…
        </p>
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-full rounded bg-pine-900/10" />
          <div className="h-3 w-11/12 rounded bg-pine-900/10" />
          <div className="h-3 w-4/5 rounded bg-pine-900/10" />
          <div className="h-3 w-2/3 rounded bg-pine-900/10" />
        </div>
      </div>
    </div>
  );
}
