import type { ReactNode } from "react";
import type { DosageForm } from "@/lib/dosage-form";
import { FORM_INFO } from "@/lib/dosage-form";
import type { Tarja } from "@/lib/medications";

/**
 * A "fotinho" do medicamento na lista: uma caixinha desenhada com o símbolo da
 * forma (comprimido, cápsula, gotas, seringa, bisnaga…) e, embaixo, a faixa da
 * tarja como na caixa de verdade — vermelha, preta ou nenhuma.
 *
 * Desenho próprio de propósito: foto de embalagem é do fabricante (e da
 * farmácia que fotografou), não existe base aberta delas, e 25 mil
 * apresentações com fotos de fontes diferentes virariam uma lista desigual.
 * A forma e a tarja são o que o médico precisa reconhecer de relance.
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
      <circle cx="12" cy="11" r="6.5" fill={SOFT} stroke={INK} strokeWidth="1.4" />
      <path d="M7.4 15.6 16.6 6.4" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
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

export function MedIcon({
  form,
  tarja,
  formula = false,
  size = "md",
  className = "",
}: {
  form: DosageForm | null | undefined;
  tarja?: Tarja | null;
  /** Fórmula manipulada: o pilão no lugar da forma. */
  formula?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const kind = formula ? "formula" : (form ?? "outro");
  const stripe = tarja ? STRIPE[tarja] : undefined;
  const label = formula ? "Fórmula manipulada" : form ? FORM_INFO[form].label : "Medicamento";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-line)] bg-white ${
        size === "sm" ? "h-8 w-8" : "h-10 w-10"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className={size === "sm" ? "h-6 w-6" : "h-7 w-7"}>
        {PICTOGRAM[kind]}
      </svg>
      {stripe ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-[5px]" style={{ background: stripe }} /> : null}
    </span>
  );
}
