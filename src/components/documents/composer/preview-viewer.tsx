"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { A4_H, A4_W } from "../document-preview";

/**
 * A prévia como no Canva: uma página por vez, com a fileira de miniaturas
 * numeradas embaixo (clicar leva à página), setas e ← → do teclado, zoom com
 * a porcentagem à vista e "Tela cheia" com a opção de ver todas lado a lado.
 *
 * Existe porque, empilhadas numa coluna estreita, a segunda folha do
 * receituário ficava fora da vista e o médico não sabia que ela existia. Aqui
 * o número de páginas está sempre na tela.
 *
 * As páginas são o que sai na impressora: o Controle Especial conta duas
 * (1ª via da farmácia e 2ª via do paciente).
 */

export interface PreviewPage {
  key: string;
  /** "Receituário de Controle Especial · 2ª via — Paciente" */
  label: string;
  /** Qual PDF abrir no "Ver o PDF real" quando esta página está à vista. */
  pdfIndex: number;
  node: ReactNode;
  /** A mesma folha, interativa: só na página grande (miniaturas e tela cheia só mostram). */
  canvasNode?: ReactNode;
  /** Receituário: as posições (na lista do editor) dos medicamentos desta página. */
  itemIndexes?: readonly number[];
}

const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5];
/** Padrão do celular: 80%, ou menos se não couber na largura. */
const DEFAULT_ZOOM = 0.8;
const THUMB = 0.085;
const PAD = 24;

// No servidor não há layout para medir; o efeito comum evita o aviso do React.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Área útil de um elemento, acompanhando o redimensionamento. */
function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

/**
 * Uma folha em escala, ocupando na página o espaço já encolhido (o
 * `transform` sozinho deixaria o tamanho original reservado).
 */
export function ScaledPage({ scale, children }: { scale: number; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(A4_H);
  useIsoLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="relative mx-auto shrink-0" style={{ width: A4_W * scale, height: height * scale }}>
      <div
        ref={inner}
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: A4_W, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function Chevron({ left }: { left?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <path d={left ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

const TOOL_BTN =
  "flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-[12px] font-bold text-pine-900/70 transition-colors hover:bg-pine-50 hover:text-pine-950 disabled:opacity-30 disabled:hover:bg-transparent pointer-coarse:h-11 pointer-coarse:min-w-11";

/** Próximo passo de zoom a partir da escala à vista. */
function stepZoom(scale: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find((z) => z > scale + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  return [...ZOOM_STEPS].reverse().find((z) => z < scale - 0.001) ?? ZOOM_STEPS[0];
}

/** "‹  Página 2 de 3  ›" — o mesmo nas duas vistas. */
function Pager({
  index,
  count,
  onGo,
  dark,
}: {
  index: number;
  count: number;
  onGo(index: number): void;
  dark?: boolean;
}) {
  const btn = dark
    ? "flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-30"
    : TOOL_BTN;
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={btn} onClick={() => onGo(index - 1)} disabled={index === 0} aria-label="Página anterior">
        <Chevron left />
      </button>
      <span
        className={`min-w-[7.5rem] text-center text-[12.5px] font-bold tabular-nums ${dark ? "text-white" : "text-pine-950"}`}
        aria-live="polite"
      >
        Página {index + 1} de {count}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onGo(index + 1)}
        disabled={index >= count - 1}
        aria-label="Próxima página"
      >
        <Chevron />
      </button>
    </div>
  );
}

/** A fileira de miniaturas numeradas; a página à vista fica contornada. */
function Thumbnails({
  pages,
  index,
  onGo,
  dark,
}: {
  pages: readonly PreviewPage[];
  index: number;
  onGo(index: number): void;
  dark?: boolean;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);
  return (
    <div className="scroll-x flex gap-2.5 px-1 pt-1 pb-1.5" role="tablist" aria-label="Páginas">
      {pages.map((page, i) => {
        const active = i === index;
        return (
          <button
            key={page.key}
            ref={active ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`Página ${i + 1}: ${page.label}`}
            title={page.label}
            onClick={() => onGo(i)}
            className="group/thumb flex shrink-0 flex-col items-center gap-1"
          >
            <span
              className={`block overflow-hidden rounded-md bg-white ring-offset-2 transition-shadow ${
                active
                  ? `ring-2 ring-pine-600 ${dark ? "ring-offset-[#241a31]" : ""}`
                  : `ring-1 ${dark ? "ring-white/20 ring-offset-[#241a31]" : "ring-[#e2dcec]"} group-hover/thumb:ring-pine-400`
              }`}
              style={{ width: A4_W * THUMB, height: A4_H * THUMB }}
              aria-hidden
            >
              <span className="pointer-events-none block">
                <ScaledPage scale={THUMB}>{page.node}</ScaledPage>
              </span>
            </span>
            <span
              className={`text-[11px] font-bold tabular-nums ${
                active ? (dark ? "text-white" : "text-pine-700") : dark ? "text-white/55" : "text-pine-900/50"
              }`}
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface PreviewViewerProps {
  pages: readonly PreviewPage[];
  /** Aviso acima da página (tarja preta que não sai aqui). */
  notice?: ReactNode;
  pdfBusy: boolean;
  onOpenPdf(pdfIndex: number): void;
  /** Só no desktop: "Ocultar" a coluna. */
  onHide?(): void;
  /**
   * Desktop: o visualizador ocupa a altura da tela e a folha aparece inteira,
   * com a faixa das páginas sempre à vista embaixo.
   */
  fill?: boolean;
  /** Ir a uma página (o medicamento que acabou de entrar foi para o Controle Especial). */
  goTo?: { index: number; nonce: number } | null;
  /** A folha aceita o que se arrasta do editor (tipo próprio no `dataTransfer`). */
  drop?: { type: string; label: string; onDrop(data: string): void };
}

export function PreviewViewer({ pages, notice, pdfBusy, onOpenPdf, onHide, goTo, drop, fill }: PreviewViewerProps) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<number | "fit" | null>(null);
  const [full, setFull] = useState(false);
  const [bodyRef, body] = useSize<HTMLDivElement>();
  const [dropping, setDropping] = useState(false);

  const count = Math.max(pages.length, 1);
  const current = Math.min(index, count - 1);
  const page = pages[current];

  // Página que deixou de existir (tirou o antibiótico): volta para a última que há.
  useEffect(() => {
    if (index > count - 1) setIndex(count - 1);
  }, [index, count]);

  // "fit": a largura toda. Padrão: no desktop a folha inteira (largura e altura); no celular, 80%.
  const fit = body.w > 0 ? (body.w - PAD) / A4_W : DEFAULT_ZOOM;
  const whole = fill && body.h > 0 ? Math.min(fit, (body.h - PAD) / A4_H) : Math.min(DEFAULT_ZOOM, fit);
  const scale = Math.max(0.2, zoom === "fit" ? fit : zoom === null ? whole : zoom);

  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(next, count - 1))), [count]);

  // Pedido de fora (um `nonce` novo por pedido): mostra a página onde o item está.
  const goIndex = goTo?.index ?? -1;
  const goNonce = goTo?.nonce;
  useEffect(() => {
    if (goNonce !== undefined && goIndex >= 0) setIndex(goIndex);
  }, [goIndex, goNonce]);

  const accepts = (event: DragEvent) => drop !== undefined && event.dataTransfer.types.includes(drop.type);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight" || event.key === "PageDown") go(current + 1);
    else if (event.key === "ArrowLeft" || event.key === "PageUp") go(current - 1);
    else return;
    event.preventDefault();
  }

  return (
    <div
      className={`card overflow-hidden ${fill ? "flex h-[calc(100dvh-14rem)] min-h-[30rem] flex-col" : ""}`}
      onKeyDown={onKeyDown}
    >
      {/* ── Barra de cima: título, zoom, tela cheia, PDF, ocultar ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-[#e8e1f0] px-2.5 py-1.5">
        <span className="pl-1 text-[12px] font-bold text-pine-900/60">Prévia da folha</span>
        <div className="flex items-center gap-0.5">
          <div className="flex items-center rounded-lg bg-pine-50/70" role="group" aria-label="Zoom">
            <button
              type="button"
              className={TOOL_BTN}
              onClick={() => setZoom(stepZoom(scale, -1))}
              disabled={scale <= ZOOM_STEPS[0] + 0.001}
              aria-label="Diminuir zoom"
            >
              −
            </button>
            <button
              type="button"
              className={`${TOOL_BTN} min-w-12 tabular-nums`}
              onClick={() => setZoom(zoom === "fit" ? null : "fit")}
              title={zoom === "fit" ? (fill ? "Ver a página inteira" : "Voltar a 80%") : "Ajustar à largura"}
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              className={TOOL_BTN}
              onClick={() => setZoom(stepZoom(scale, 1))}
              disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] - 0.001}
              aria-label="Aumentar zoom"
            >
              +
            </button>
          </div>
          <button type="button" className={TOOL_BTN} onClick={() => setFull(true)} aria-label="Tela cheia" title="Tela cheia">
            <IconExpand />
          </button>
          <button
            type="button"
            className={`${TOOL_BTN} text-pine-600`}
            onClick={() => page && onOpenPdf(page.pdfIndex)}
            disabled={pdfBusy || !page}
            title="Gera o PDF de verdade desta página, sem emitir"
          >
            {pdfBusy ? "Gerando…" : "PDF real"}
          </button>
          {onHide ? (
            <button type="button" className={TOOL_BTN} onClick={onHide}>
              Ocultar
            </button>
          ) : null}
        </div>
      </div>

      {/* ── A página (e, no receituário, onde se solta o que vem do editor) ── */}
      {fill && notice ? <div className="shrink-0 border-b border-[#e8e1f0] p-3">{notice}</div> : null}
      <div
        className={`relative ${fill ? "min-h-0 flex-1" : ""}`}
        onDragEnter={(event) => {
          if (accepts(event)) setDropping(true);
        }}
        onDragOver={(event) => {
          if (!accepts(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDropping(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
        }}
        onDrop={(event) => {
          setDropping(false);
          if (!drop || !accepts(event)) return;
          event.preventDefault();
          drop.onDrop(event.dataTransfer.getData(drop.type));
        }}
      >
        <div
          ref={bodyRef}
          className={`${fill ? "h-full" : "max-h-[calc(100dvh-25rem)] min-h-64"} overflow-auto bg-pine-50/40 p-3 outline-none focus-visible:ring-2 focus-visible:ring-pine-400 focus-visible:ring-inset`}
          tabIndex={0}
          aria-label={page ? `Página ${current + 1} de ${count}: ${page.label}` : "Prévia"}
        >
          {notice && !fill ? <div className="mb-3">{notice}</div> : null}
          {page ? (
            <ScaledPage key={page.key} scale={scale}>
              {page.canvasNode ?? page.node}
            </ScaledPage>
          ) : null}
        </div>
        {dropping && drop ? (
          <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-pine-500 bg-pine-50/80 backdrop-blur-[1px]">
            <span className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-pine-700 shadow-sm">{drop.label}</span>
          </div>
        ) : null}
      </div>

      {/* ── Embaixo: páginas ── */}
      <div className="shrink-0 border-t border-[#e8e1f0] bg-white px-2.5 pt-2 pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate pl-1 text-[11.5px] text-pine-900/60">{page?.label}</p>
          <Pager index={current} count={count} onGo={go} />
        </div>
        {count > 1 ? <Thumbnails pages={pages} index={current} onGo={go} /> : null}
      </div>

      {full ? (
        <FullScreen pages={pages} notice={notice} index={current} onGo={go} onClose={() => setFull(false)} />
      ) : null}
    </div>
  );
}

/**
 * Tela cheia: a página à vista, do tamanho que a tela aguenta, ou todas lado
 * a lado ("Todas") — clicar numa volta para ela. Esc fecha; ← → trocam.
 */
function FullScreen({
  pages,
  notice,
  index,
  onGo,
  onClose,
}: {
  pages: readonly PreviewPage[];
  notice?: ReactNode;
  index: number;
  onGo(index: number): void;
  onClose(): void;
}) {
  const [grid, setGrid] = useState(false);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("resize", measure);
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (!grid && (event.key === "ArrowRight" || event.key === "PageDown")) onGo(index + 1);
      else if (!grid && (event.key === "ArrowLeft" || event.key === "PageUp")) onGo(index - 1);
      else return;
      event.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [grid, index, onGo, onClose]);

  const page = pages[index];
  // Sobra da altura: barra de cima, páginas embaixo e, se houver, o aviso de tarja preta.
  const single = Math.min((viewport.h - (notice ? 300 : 230)) / A4_H, (viewport.w - 64) / A4_W, 1.5);
  const gridScale = Math.min(0.42, (viewport.w - 96) / (A4_W * Math.min(pages.length, 3) + 24 * 2));

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      // O portal sai de dentro do `.theme-app`: a classe volta aqui para as cores e a fonte do app.
      // O fundo vai inline: o `.theme-app` pinta o fundo claro do app e ganharia de uma classe.
      style={{ background: "rgba(36, 26, 49, 0.96)" }}
      className="theme-app fixed inset-0 z-[70] flex flex-col backdrop-blur-sm animate-[fade-in_120ms_ease-out] motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label="Prévia em tela cheia"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="min-w-0 truncate text-[13px] font-bold">
          {grid ? `${pages.length} ${pages.length === 1 ? "página" : "páginas"}` : page?.label}
        </p>
        <div className="flex items-center gap-2">
          {pages.length > 1 ? (
            <div className="flex rounded-full bg-white/10 p-0.5 text-[12px] font-bold" role="group" aria-label="Visualização">
              <button
                type="button"
                onClick={() => setGrid(false)}
                aria-pressed={!grid}
                className={`rounded-full px-3 py-1.5 ${!grid ? "bg-white text-pine-950" : "text-white/75 hover:text-white"}`}
              >
                Uma
              </button>
              <button
                type="button"
                onClick={() => setGrid(true)}
                aria-pressed={grid}
                className={`rounded-full px-3 py-1.5 ${grid ? "bg-white text-pine-950" : "text-white/75 hover:text-white"}`}
              >
                Todas
              </button>
            </div>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar tela cheia"
            title="Fechar (Esc)"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="h-5 w-5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        {notice ? <div className="mx-auto mb-3 max-w-2xl">{notice}</div> : null}
        {grid ? (
          <div className="flex flex-wrap justify-center gap-6">
            {pages.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  onGo(i);
                  setGrid(false);
                }}
                className="flex flex-col items-center gap-2 text-white/80 hover:text-white"
                aria-label={`Abrir página ${i + 1}: ${p.label}`}
              >
                <span className="block rounded-md ring-2 ring-transparent ring-offset-4 ring-offset-[#241a31] hover:ring-pine-400">
                  <span className="pointer-events-none block">
                    <ScaledPage scale={gridScale}>{p.node}</ScaledPage>
                  </span>
                </span>
                <span className="max-w-[16rem] text-center text-[12px] font-bold">
                  {i + 1} · {p.label}
                </span>
              </button>
            ))}
          </div>
        ) : page ? (
          <ScaledPage key={page.key} scale={Math.max(single, 0.3)}>
            {page.node}
          </ScaledPage>
        ) : null}
      </div>

      {!grid ? (
        <div className="border-t border-white/10 px-4 pt-2 pb-3">
          <div className="mb-1 flex justify-center">
            <Pager index={index} count={pages.length} onGo={onGo} dark />
          </div>
          {pages.length > 1 ? (
            <div className="flex justify-center">
              <Thumbnails pages={pages} index={index} onGo={onGo} dark />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>,
    document.body
  );
}
