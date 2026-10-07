"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 1200;

/**
 * O número sobe de 0 ao valor quando entra na tela (~1,2 s, desacelerando).
 * O servidor já manda o valor final — sem JS ou com menos movimento ele
 * aparece pronto — e uma cópia invisível reserva a largura: nada se mexe
 * enquanto os dígitos mudam.
 */
export function CountUp({ value }: { value: number }) {
  const final = value.toLocaleString("pt-BR");
  const [text, setText] = useState(final);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          const eased = 1 - Math.pow(1 - t, 3);
          setText(Math.round(value * eased).toLocaleString("pt-BR"));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        setText("0");
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className="inline-grid tabular-nums">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {final}
      </span>
      <span className="col-start-1 row-start-1">{text}</span>
    </span>
  );
}
