import { IconDocDuo, IconFileText, IconPillDuo } from "@/components/icons";
import type { ComposerTab } from "@/lib/composer-editor";

/* Ícones pequenos do compositor (16px, traço 2, pontas redondas). */

const SVG = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

type IconProps = { className?: string };

export function IconArrowBox({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <path d="M4 5h9v14H4z" />
      <path d="M13 12h8M17 8l4 4-4 4" />
    </svg>
  );
}

export function IconList({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

export function IconPencil({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="m13.5 8.5 3 3" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="m6 7 1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevron({ up, className }: IconProps & { up?: boolean }) {
  return (
    <svg {...SVG} className={className}>
      <path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </svg>
  );
}

/** Receita digital: o celular do paciente, onde ela chega por link. */
export function IconPhoneRx({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3M9.5 9.5h5M12 7v5" />
    </svg>
  );
}

export function TabIcon({ tab, className }: { tab: ComposerTab; className?: string }) {
  // Sem `className`, o tamanho vem de `.doc-tab svg` (globals.css).
  if (tab === "atestado") return <IconFileText className={className} />;
  if (tab === "encaminhamento") return <IconArrowBox className={className} />;
  if (tab === "laudo") return <IconDocDuo className={className} />;
  if (tab === "orientacoes") return <IconList className={className} />;
  if (tab === "receita") return <IconPhoneRx className={className} />;
  return <IconPillDuo className={className} />;
}
