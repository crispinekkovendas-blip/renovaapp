import type { ReactNode } from "react";

/** Erro curto sob um controle. role="alert": quem usa leitor de tela ouve na hora em que aparece. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1 text-[11px] font-bold text-rose-600">
      {children}
    </p>
  );
}
