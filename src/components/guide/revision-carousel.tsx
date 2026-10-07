"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeSlide, OriginalSlide, RevisionSlide } from "@/lib/revision-slides";
import { ConciseLines } from "./concise";
import { RevisionBadge } from "./review-history";

/**
 * O histórico de um trecho do guia, logo embaixo dele, na cor complementar
 * do marca-texto: primeiro o original (PDF, e-book ou receita publicada),
 * depois a 1ª mudança, a 2ª e assim por diante. Arrasta para o lado no
 * celular; setas e pontos no computador. A altura acompanha o slide atual.
 */
export function RevisionCarousel({
  slides,
  alert = null,
  className = "",
}: {
  slides: readonly RevisionSlide[];
  /** Slide do aviso pendente: vira um "⚠ conferir" sempre visível no topo, que leva até ele. */
  alert?: number | null;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const originals = slides.filter((s) => s.kind === "original").length;
  const label = (i: number) =>
    slides[i].kind === "original" ? (originals > 1 ? `Original ${i + 1} de ${originals}` : "Original") : `${i - originals + 1}ª mudança`;

  useEffect(() => {
    const el = track.current?.children[index] as HTMLElement | undefined;
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  const go = (i: number) => {
    const t = track.current;
    if (!t) return;
    const target = Math.max(0, Math.min(slides.length - 1, i));
    t.scrollTo({ left: target * t.clientWidth, behavior: "smooth" });
    setIndex(target);
  };

  const onScroll = () => {
    const t = track.current;
    if (!t || t.clientWidth === 0) return;
    const i = Math.round(t.scrollLeft / t.clientWidth);
    if (i !== index) setIndex(i);
  };

  const current = slides[index];
  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Histórico deste trecho, do original até hoje"
      className={`rev-carousel mt-1.5 mb-3 min-w-0 overflow-hidden rounded-2xl text-[13px] leading-snug font-normal tracking-normal normal-case not-italic ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-2">
        <span className="rev-carousel-accent text-[11px] font-extrabold tracking-[0.08em] uppercase">{label(index)}</span>
        {current.kind === "change" ? <RevisionBadge rev={current.rev} /> : null}
        {alert !== null && index !== alert ? (
          <button
            type="button"
            onClick={() => go(alert)}
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100 pointer-coarse:py-1"
          >
            ⚠ conferir
          </button>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          <span className="text-[11px] tabular-nums opacity-60">
            {index + 1}/{slides.length}
          </span>
          <ArrowButton label="Anterior" disabled={index === 0} onClick={() => go(index - 1)}>
            ‹
          </ArrowButton>
          <ArrowButton label="Próximo" disabled={index === slides.length - 1} onClick={() => go(index + 1)}>
            ›
          </ArrowButton>
        </span>
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="Use as setas do teclado para ver as outras versões"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(index + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(index - 1);
          }
        }}
        style={{ height }}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain transition-[height] duration-200 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-[hsl(232_62%_60%)] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${label(i)} (${i + 1} de ${slides.length})`}
            inert={i !== index}
            className="w-full shrink-0 snap-start self-start px-3 pt-1.5 pb-2.5"
          >
            {slide.kind === "original" ? <OriginalCard slide={slide} /> : <ChangeCard slide={slide} />}
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="flex justify-center pb-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para ${label(i)}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className="p-1.5 pointer-coarse:p-2"
            >
              <span data-current={i === index} className="rev-carousel-dot block h-1.5 w-1.5 rounded-full" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick(): void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rev-carousel-accent inline-flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none font-bold hover:bg-white/70 disabled:opacity-25 pointer-coarse:h-9 pointer-coarse:w-9"
    >
      {children}
    </button>
  );
}

/** O original como estava na fonte: um cartão claro, com a fonte e a página. */
function OriginalCard({ slide }: { slide: OriginalSlide }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-pine-900/80">
      <p className="text-[10.5px] font-bold tracking-[0.06em] text-pine-900/45 uppercase">{slide.source}</p>
      {slide.title ? <p className="mt-0.5 text-[12.5px] font-extrabold text-pine-950">{slide.title}</p> : null}
      <div className="mt-1 max-h-72 space-y-0.5 overflow-y-auto text-[12.5px] leading-snug break-words">
        {slide.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      {slide.note ? <p className="mt-1.5 text-[11.5px] text-pine-900/55">{slide.note}</p> : null}
    </div>
  );
}

/** Uma mudança: o que mudou (resumo) e, a um toque, o porquê. */
function ChangeCard({ slide }: { slide: ChangeSlide }) {
  return (
    <div className="rounded-xl bg-white/75 px-3 py-2.5">
      <ConciseLines lines={slide.concise} />
      {slide.why ? (
        <details className="group mt-1.5">
          <summary className="rev-carousel-accent inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-bold [&::-webkit-details-marker]:hidden">
            {slide.tone === "note" ? "Aviso completo" : "Por quê"}
            <span aria-hidden className="transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <p className="mt-1 text-[12.5px] leading-snug text-pine-900/75">{slide.why}</p>
        </details>
      ) : null}
    </div>
  );
}
