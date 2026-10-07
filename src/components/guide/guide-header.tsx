import type { ReactNode } from "react";

/**
 * O alto das três abas do Guia clínico, igual em todas: título, uma linha do
 * que a aba traz e, à direita, o "Revisões · ver mais" (o histórico fica no
 * pop-up, não na tela).
 */
export function GuideHeader({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <header className="mb-4 sm:mb-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-950 sm:text-[28px]">{title}</h1>
        {action}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-pine-900/60">{children}</p>
    </header>
  );
}
