"use client";

import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Revela o bloco quando ele entra na tela (classe `is-in`). O CSS só esconde
 * quando `<html class="js">` existe — e é este componente que põe a classe,
 * ao montar. Sem JS, tudo nasce visível; com menos movimento, idem.
 */

type RevealTag = "div" | "li" | "section";

let shared: IntersectionObserver | null = null;

function sharedObserver(): IntersectionObserver {
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          shared?.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
  }
  return shared;
}

export function Reveal({
  as = "div",
  className,
  delay = 0,
  children,
}: {
  as?: RevealTag;
  className?: string;
  /** Escalonamento em ms (grades): cada cartão chega um pouco depois do anterior. */
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Quem já está na tela ao chegar recebe `is-in` no mesmo passo em que o
    // <html> ganha `js` — nunca some para reaparecer.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add("is-in");
    document.documentElement.classList.add("js");

    if (el.classList.contains("is-in") || !("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    const observer = sharedObserver();
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  const style: CSSProperties | undefined = delay > 0 ? { transitionDelay: `${delay}ms` } : undefined;
  return createElement(as, { ref, className: className ? `reveal ${className}` : "reveal", style }, children);
}
