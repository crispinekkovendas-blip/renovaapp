"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" role="alert">
      <h1 className="font-display text-2xl font-semibold text-pine-950">Algo deu errado</h1>
      <p className="mt-2 max-w-sm text-sm text-pine-900/60">
        Não foi possível carregar esta página. Tente novamente — se o problema continuar, avise a equipe técnica.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6 w-full max-w-xs justify-center sm:w-auto">
        Tentar novamente
      </button>
    </div>
  );
}
