"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/*
 * Usado por toda folha A4 que aparece na tela: a prévia do compositor, a folha
 * do documento, o recibo e as páginas de impressão.
 */

// No servidor não há layout para medir; o efeito comum evita o aviso do React.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Encolhe uma folha de largura fixa (A4 não refaz linhas) para caber na
 * largura do contêiner — a prévia no celular, o "Imprimir todos". Mede a
 * largura disponível e a altura real da folha, aplica `scale()` e reserva a
 * altura já encolhida, para o que vem embaixo não subir por cima.
 *
 * Com espaço de sobra não mexe em nada: o desktop fica como sempre foi. E o
 * `print:` desfaz tudo — a impressão sai do tamanho de verdade.
 */
export function FitWidth({
  width,
  maxScale,
  children,
  className,
}: {
  /** Largura natural da folha, em px CSS (595,28 para a prévia; 210mm ≈ 793,7 para a folha HTML). */
  width: number;
  /** Teto da escala (a prévia do compositor fica em 80% mesmo com espaço sobrando). */
  maxScale?: number;
  children: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ scale: number; height: number } | null>(null);

  useIsoLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    function measure() {
      if (!outer || !inner) return;
      const available = outer.clientWidth;
      const cap = maxScale ?? 1;
      if (!available || (cap >= 1 && available >= width)) {
        setBox(null);
        return;
      }
      const scale = Math.min(available / width, cap);
      setBox({ scale, height: inner.offsetHeight * scale });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [width, maxScale]);

  // Variáveis em vez de estilo inline: assim as classes `print:` conseguem desfazer.
  const vars = box
    ? ({ "--fit-scale": box.scale, "--fit-h": `${box.height}px`, "--fit-w": `${width}px` } as CSSProperties)
    : undefined;

  return (
    <div
      ref={outerRef}
      style={vars}
      className={`${box ? "h-[var(--fit-h)] overflow-hidden print:h-auto print:overflow-visible" : ""} ${className ?? ""}`}
    >
      <div
        ref={innerRef}
        className={
          box
            ? "w-[var(--fit-w)] origin-top-left [transform:scale(var(--fit-scale))] print:w-auto print:[transform:none]"
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
