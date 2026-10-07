import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function IconHome(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function IconUsers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <path d="M16 5a3 3 0 0 1 0 6M18.5 15.5c1.6.7 2.7 2 3 4.5" />
    </svg>
  );
}

export function IconWallet(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 3.5h10" />
      <circle cx="16.5" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconLogout(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

export function IconChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconStethoscope(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 3v6a5 5 0 0 0 10 0V3" />
      <path d="M10 14v2.5a5.5 5.5 0 0 0 11 0V14" />
      <circle cx="21" cy="11" r="2" />
    </svg>
  );
}

export function IconFileText(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </svg>
  );
}

/** Livro aberto: o guia clínico de consulta. */
export function IconBook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 6.5C10 5 7 4.5 3 4.5v14c4 0 7 .5 9 2 2-1.5 5-2 9-2v-14c-4 0-7 .5-9 2z" />
      <path d="M12 6.5v14" />
    </svg>
  );
}

/** Folha com lápis: modelos e protocolos que a clínica personaliza. */
export function IconTemplate(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M13 22H5V2h9l4 4v4" />
      <path d="M13 2v5h5M8 10h5M8 14h3" />
      <path d="M19.5 13.5l2 2L15 22h-2v-2z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Duotone (estilo Mevo): linha grossa em currentColor + UMA forma      */
/* preenchida em sun via `.icon-duo .fill` (globals.css). A forma       */
/* preenchida vem primeiro no DOM para o traço ficar por cima dela.     */
/* ------------------------------------------------------------------ */

function duo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    ...props,
    className: className ? `icon-duo ${className}` : "icon-duo",
  };
}

export function IconPhoneDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <rect className="fill" x="9" y="5" width="6" height="9" rx="1" />
      <rect x="6.5" y="2" width="11" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconBuildingDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <rect className="fill" x="7.5" y="6.5" width="5" height="4.5" rx="0.75" />
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h2a2 2 0 0 1 2 2v10" />
      <path d="M2 21h20M8 21v-4h4v4" />
    </svg>
  );
}

export function IconPillDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <g transform="rotate(-45 12 12)">
        <path className="fill" d="M12 8.5h5.5a3.5 3.5 0 0 1 0 7H12z" />
        <rect x="3" y="8.5" width="18" height="7" rx="3.5" />
        <path d="M12 8.5v7" />
      </g>
    </svg>
  );
}

export function IconFaceDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <path className="fill" d="M8 13.5h8a4 4 0 0 1-8 0z" />
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8 13.5a4 4 0 0 0 8 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </svg>
  );
}

export function IconShieldDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <path className="fill" d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8 7.5 9.5z" />
      <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5v-6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconCalendarDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <rect className="fill" x="7" y="13" width="4.5" height="4.5" rx="1.25" />
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function IconChatDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <path
        className="fill"
        d="M6.5 3.5h11A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H10L5 20.5v-4h-.5A2.5 2.5 0 0 1 4 14V6a2.5 2.5 0 0 1 2.5-2.5z"
      />
      <path d="M6.5 3.5h11A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H10L5 20.5v-4h-.5A2.5 2.5 0 0 1 4 14V6a2.5 2.5 0 0 1 2.5-2.5z" />
      <path d="M8.5 10h.01M12 10h.01M15.5 10h.01" />
    </svg>
  );
}

export function IconDocDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <path className="fill" d="M14.5 2.5 20 8h-5.5z" />
      <path d="M6 2.5h8.5L20 8v13.5H6z" />
      <path d="M14.5 2.5V8H20M9.5 12.5h5M9.5 16.5h5" />
    </svg>
  );
}

export function IconReceiptDuo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...duo(props)}>
      <circle className="fill" cx="15" cy="15.5" r="2.25" />
      <path d="M5 3h14v18l-2.5-1.8L14 21l-2-1.6L10 21l-2.5-1.8L5 21z" />
      <path d="M9 8h6M9 12h4" />
    </svg>
  );
}
