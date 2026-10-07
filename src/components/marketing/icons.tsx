/* Ícones da página pública. Os duotone (.icon-duo no <svg>) têm linha grossa em
   currentColor e UMA forma preenchida (className="fill") no acento "sun". */

const DUO = {
  viewBox: "0 0 64 64",
  className: "icon-duo h-full w-full",
  "aria-hidden": true,
} as const;

export function IconPhoneTap() {
  return (
    <svg {...DUO}>
      <circle className="fill" cx="32" cy="34" r="9" />
      <rect x="18" y="6" width="28" height="52" rx="6" />
      <path d="M28 12h8" />
      <path d="M32 34v-6M32 34l4-3" />
    </svg>
  );
}

export function IconChat() {
  return (
    <svg {...DUO}>
      <circle className="fill" cx="46" cy="18" r="7" />
      <path d="M12 16a6 6 0 0 1 6-6h28a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H26l-10 9v-9h-4a6 6 0 0 1-6-6z" />
      <path d="M22 24h14M22 32h20" />
    </svg>
  );
}

export function IconCheckCircle() {
  return (
    <svg {...DUO}>
      <circle className="fill" cx="32" cy="32" r="16" />
      <circle cx="32" cy="32" r="24" />
      <path d="M22 33l7 7 13-15" />
    </svg>
  );
}

export function IconPrescription() {
  return (
    <svg {...DUO}>
      <circle className="fill" cx="44" cy="46" r="9" />
      <path d="M16 8h22l10 10v20" />
      <path d="M38 8v10h10" />
      <path d="M16 8v46h16" />
      <path d="M23 24h10M23 32h16" />
      <path d="M40 46l3 3 6-7" />
    </svg>
  );
}

export function IconReceipt() {
  return (
    <svg {...DUO}>
      <circle className="fill" cx="40" cy="20" r="7" />
      <path d="M16 8h32v48l-6-4-6 4-6-4-6 4-6-4-4 4z" />
      <path d="M24 24h8M24 32h16M24 40h16" />
    </svg>
  );
}

export function IconCalendarAdd() {
  return (
    <svg {...DUO}>
      <circle className="fill" cx="44" cy="44" r="10" />
      <rect x="8" y="12" width="44" height="42" rx="6" />
      <path d="M8 24h44M20 6v10M40 6v10" />
      <path d="M44 38v12M38 44h12" />
    </svg>
  );
}

/** O "✓" pequeno das listas de confiança; herda a cor do texto. */
export function Tick({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}
