"use client";

import type { ButtonHTMLAttributes } from "react";

/**
 * O "×" de fechar, igual em todo pop-up, folha e aviso do app: 44px de alvo
 * de toque (o ícone é pequeno, a área não), rótulo para leitor de tela.
 */
export function CloseButton({
  label = "Fechar",
  className = "",
  size = "md",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { label?: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-9 w-9 pointer-coarse:h-11 pointer-coarse:w-11" : "h-11 w-11";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex ${box} shrink-0 cursor-pointer items-center justify-center rounded-full text-current opacity-60 transition hover:bg-black/5 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-500 ${className}`}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-[18px] w-[18px]" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
