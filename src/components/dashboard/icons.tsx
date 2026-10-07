import type { SVGProps } from "react";

// Ícones só do início (atalhos e cards); os comuns ficam em components/icons.

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

export function IconPhone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconPlusCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ strokeWidth: 2.2, ...props })}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function IconIdCard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.5 17a3.5 3.5 0 0 1 7 0M14 10h4M14 14h4" />
    </svg>
  );
}
