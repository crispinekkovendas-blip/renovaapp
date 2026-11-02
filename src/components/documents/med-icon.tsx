import type { ReactNode } from "react";
import type { DosageForm } from "@/lib/dosage-form";
import { FORM_INFO } from "@/lib/dosage-form";
import type { Tarja } from "@/lib/medications";
import { TARJA_LABEL } from "@/lib/medications";
import { boxColor, fitBrand } from "@/lib/med-box";

/**
 * A caixinha do medicamento na lista, desenhada como uma embalagem de
 * farmácia: o nome comercial impresso na frente, a cor da marca (sempre a
 * mesma para a mesma marca), o selo com a forma farmacêutica (comprimido,
 * cápsula, gotas, seringa…) e, embaixo, a faixa da tarja como na caixa de
 * verdade — vermelha, vermelha com o traço da retenção, preta ou nenhuma.
 *
 * Sem marca (genérico, fórmula, item digitado), a mesma caixa traz só o
 * desenho grande da forma.
 */

const INK = "var(--color-pine-700)";
const SOFT = "var(--color-pine-100)";
const MID = "var(--color-pine-500)";
const WARM = "var(--color-sun-500)";
const CLAY = "var(--color-clay-500)";

/** Desenhos num quadro 24×24, centrados um pouco acima da faixa da tarja. */
const PICTOGRAM: Record<DosageForm | "formula" | "outro", ReactNode> = {
  comprimido: (
    <>
      <ellipse cx="12" cy="12.6" rx="8" ry="5" fill={INK} opacity=".3" />
      <ellipse cx="12" cy="11" rx="8" ry="5" fill={SOFT} stroke={INK} strokeWidth="1.4" />
      <path d="M12 7.4v7.2" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  capsula: (
    <g transform="rotate(-40 12 11)">
      <rect x="4" y="7.6" width="16" height="6.8" rx="3.4" fill={SOFT} stroke={INK} strokeWidth="1.4" />
      <path d="M12 7.6h4.6a3.4 3.4 0 0 1 0 6.8H12z" fill={WARM} stroke={INK} strokeWidth="1.4" />
    </g>
  ),
  dragea: (
    <>
      <ellipse cx="12" cy="11" rx="7.5" ry="5" fill={WARM} stroke={INK} strokeWidth="1.4" />
      <ellipse cx="9.5" cy="9.4" rx="2.2" ry="1" fill="white" opacity=".65" />
    </>
  ),
  sache: (
    <>
      <path d="M6 5.5h12v11H6z" fill={SOFT} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 5.5l1.5 1.4 1.5-1.4 1.5 1.4 1.5-1.4 1.5 1.4 1.5-1.4 1.5 1.4 1.5-1.4" fill="none" stroke={INK} strokeWidth="1.1" />
      <path d="M9 12h6" stroke={MID} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  gotas: (
    <>
      <path d="M10.5 3.5h3v3h-3z" fill={INK} />
      <path d="M9 6.5h6l.8 2.2V17a1 1 0 0 1-1 1h-5.6a1 1 0 0 1-1-1V8.7z" fill={SOFT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M12 10.5c1.2 1.6 1.8 2.6 1.8 3.4a1.8 1.8 0 0 1-3.6 0c0-.8.6-1.8 1.8-3.4z" fill={MID} />
    </>
  ),
  liquido: (
    <>
      <path d="M9.5 3.5h5v2.5h-5z" fill={INK} />
      <path d="M8.5 6h7l1 2.5V17a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V8.5z" fill={SOFT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 12.5h8V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill={WARM} opacity=".85" />
    </>
  ),
  topico: (
    <g transform="rotate(-30 12 11)">
      <path d="M5 8.2h11l2 1.3v3l-2 1.3H5z" fill={SOFT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M18 9.6h2.2v2.8H18z" fill={INK} />
      <path d="M5 8.2v5.6" stroke={INK} strokeWidth="2" />
    </g>
  ),
  colirio: (
    <>
      <path d="M11 2.8 12 1.8l1 1v2.4h-2z" fill={INK} />
      <path d="M9.6 5.2h4.8l1 2.4V13a1 1 0 0 1-1 1H9.6a1 1 0 0 1-1-1V7.6z" fill={SOFT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6 17.2c1.7-1.6 3.7-2.4 6-2.4s4.3.8 6 2.4c-1.7 1.6-3.7 2.4-6 2.4s-4.3-.8-6-2.4z" fill="none" stroke={MID} strokeWidth="1.2" />
      <circle cx="12" cy="17.2" r="1.3" fill={MID} />
    </>
  ),
  nasal: (
    <>
      <path d="M11 2.5h2l.6 4h-3.2z" fill={INK} />
      <path d="M9 6.5h6V17a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" fill={SOFT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M15.5 3.2l2.5-1M15.8 4.6h2.7M15.5 6l2.5 1" stroke={MID} strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
  inalatorio: (
    <>
      <path d="M9 3.5h5v8.5H9z" fill={WARM} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 9.5h7.5a1 1 0 0 1 1 1V15h-3v2.5h-6V10.5a1 1 0 0 1 .5-1z" fill={SOFT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  injetavel: (
    <g transform="rotate(-45 12 11)">
      <path d="M6 9h10v4H6z" fill={SOFT} stroke={INK} strokeWidth="1.3" />
      <path d="M6 10.2h5v1.6H6z" fill={MID} />
      <path d="M16 11h5M3 8.5v5M3 11h3" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
    </g>
  ),
  adesivo: (
    <>
      <rect x="5.5" y="4.5" width="13" height="13" rx="3" fill={SOFT} stroke={INK} strokeWidth="1.3" />
      <rect x="9" y="8" width="6" height="6" rx="1.2" fill={WARM} />
    </>
  ),
  supositorio: (
    <path d="M8.5 17V10a3.5 5.5 0 0 1 7 0v7z" fill={SOFT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" transform="rotate(20 12 12)" />
  ),
  ovulo: <ellipse cx="12" cy="11" rx="4.6" ry="6.4" fill={SOFT} stroke={INK} strokeWidth="1.3" />,
  formula: (
    <>
      <path d="M5.5 10h13a6.5 6.5 0 0 1-13 0z" fill={SOFT} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M13 9.5l4.5-6" stroke={CLAY} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  outro: (
    <>
      <rect x="5" y="5" width="14" height="12" rx="2" fill={SOFT} stroke={INK} strokeWidth="1.3" />
      <path d="M12 8v6M9 11h6" stroke={MID} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
};

const STRIPE: Partial<Record<Tarja, string>> = {
  vermelha: "#c2364a",
  vermelha_retida: "#c2364a",
  preta: "#1c1917",
};

const NEUTRAL = { main: "#5b6b82", dark: "#2c3a4f", tint: "#e3e8ef" };

/** Quadro 72×48: frente 62×41 com topo e lateral em perspectiva. */
const FRONT = { x: 1, y: 6, w: 62, h: 41 };
const TEXT_W = 54;
const CX = FRONT.x + FRONT.w / 2;

export function MedIcon({
  form,
  tarja,
  formula = false,
  brands,
  size = "md",
  className = "",
}: {
  form: DosageForm | null | undefined;
  tarja?: Tarja | null;
  /** Fórmula manipulada: o pilão no lugar da forma. */
  formula?: boolean;
  /** Nomes comerciais (da busca ou guardados no item): o primeiro vai impresso na caixa. */
  brands?: readonly string[] | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const kind = formula ? "formula" : (form ?? "outro");
  const stripe = tarja ? STRIPE[tarja] : undefined;
  const formLabel = formula ? "Fórmula manipulada" : form ? FORM_INFO[form].label : "Medicamento";
  const brand = formula ? null : (brands?.find((b) => b.trim()) ?? null);
  const color = brand ? boxColor(brand) : NEUTRAL;
  const label = [brand, formLabel, tarja && tarja !== "desconhecida" ? TARJA_LABEL[tarja] : null].filter(Boolean).join(" · ");
  const bottom = FRONT.y + FRONT.h - (stripe ? 8 : 0);
  const zoneTop = FRONT.y + 13;
  const lines = brand ? fitBrand(brand, TEXT_W, bottom - zoneTop - 1) : [];
  const nameCenter = (zoneTop + bottom) / 2;
  const lineGap = (lines[0]?.size ?? 0) * 1.05;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 ${size === "sm" ? "h-9 w-[3.375rem]" : "h-12 w-[4.5rem]"} ${className}`}
    >
      <svg viewBox="0 0 72 48" aria-hidden className="h-full w-full overflow-visible">
        {/* topo e lateral da caixa */}
        <path d="M1 6 9 1h62l-8 5z" fill={color.tint} stroke={color.dark} strokeWidth=".8" strokeLinejoin="round" />
        <path d="M63 6l8-5v41l-8 5z" fill={color.main} stroke={color.dark} strokeWidth=".8" strokeLinejoin="round" />
        <path d="M63 6l8-5v41l-8 5z" fill="black" opacity=".18" />
        {/* frente */}
        <rect x={FRONT.x} y={FRONT.y} width={FRONT.w} height={FRONT.h} fill="white" stroke={color.dark} strokeWidth=".8" />
        <path d={`M${FRONT.x} ${FRONT.y}h${FRONT.w}v8H${FRONT.x}z`} fill={color.main} />
        <path d={`M${FRONT.x + 22} ${FRONT.y + 8}c10-4 22-6 ${FRONT.w - 22} -6v6z`} fill="white" opacity=".22" />
        {brand ? (
          <>
            <circle cx="10" cy={FRONT.y + 7} r="6.5" fill="white" stroke={color.dark} strokeWidth=".8" />
            <g transform={`translate(${10 - 12 * 0.46} ${FRONT.y + 7 - 11 * 0.46}) scale(.46)`}>{PICTOGRAM[kind]}</g>
            <text
              x={CX}
              textAnchor="middle"
              fill={color.dark}
              style={{ fontFamily: "var(--font-sans)", fontWeight: 800, letterSpacing: "-0.01em" }}
            >
              {lines.map((line, i) => (
                <tspan
                  key={i}
                  x={CX}
                  y={nameCenter + line.size * 0.36 + (i - (lines.length - 1) / 2) * lineGap}
                  fontSize={line.size}
                  {...(line.squeeze ? { textLength: line.squeeze, lengthAdjust: "spacingAndGlyphs" } : {})}
                >
                  {line.text}
                </tspan>
              ))}
            </text>
          </>
        ) : (
          <g transform={`translate(${CX - 12 * 1.15} ${(FRONT.y + 8 + bottom) / 2 - 11 * 1.15}) scale(1.15)`}>{PICTOGRAM[kind]}</g>
        )}
        {stripe ? (
          <>
            <rect x={FRONT.x + 0.4} y={bottom} width={FRONT.w - 0.8} height={8 - 0.4} fill={stripe} />
            {tarja === "vermelha_retida" ? (
              <path d={`M${FRONT.x + 5} ${bottom + 3.8}h${FRONT.w - 10}`} stroke="white" strokeWidth="1.1" strokeDasharray="3 2" />
            ) : null}
          </>
        ) : null}
      </svg>
    </span>
  );
}
