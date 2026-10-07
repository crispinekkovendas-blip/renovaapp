import Link from "next/link";
import { Fragment } from "react";
import type { ReactNode } from "react";
import type { ConciseLine } from "@/lib/revision-diff";
import { RevisionBadge } from "./review-history";

export type { RevisionGroup, TabRevision } from "@/lib/guide-tab-revisions";
import type { RevisionGroup, TabRevision } from "@/lib/guide-tab-revisions";

const MAX_LINES = 4;

/**
 * O "Revisões · ver mais" de uma aba: por revisão, só o que mudou em cada
 * item — a revisão atual aberta, as anteriores fechadas. O detalhe (motivo,
 * antes e agora) e o Concordo/Discordo ficam na página Revisões.
 */
export function TabRevisions({
  revisions,
  current,
  detailsHref,
  children,
}: {
  revisions: readonly TabRevision[];
  current: number;
  detailsHref: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {revisions.map((r) => {
        const head = (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <RevisionBadge rev={r.rev} />
            <span className="text-[12px] font-semibold text-pine-900/55">{r.count}</span>
          </span>
        );
        return r.rev === current ? (
          <section key={r.rev}>
            {head}
            <div className="mt-2">
              <GroupList groups={r.groups} />
            </div>
          </section>
        ) : (
          <details key={r.rev} className="group rounded-xl bg-pine-50/50 px-3 py-2">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 [&::-webkit-details-marker]:hidden">
              {head}
              <span className="text-[11.5px] font-bold text-pine-600 group-open:hidden">ver ›</span>
            </summary>
            <div className="mt-2">
              <GroupList groups={r.groups} />
            </div>
          </details>
        );
      })}
      {children}
      <div>
        <Link
          href={detailsHref}
          className="inline-flex min-h-10 items-center rounded-full border border-pine-900/12 bg-white px-3.5 text-[12.5px] font-bold text-pine-800 hover:border-pine-400"
        >
          Ver detalhes: motivo, antes e agora →
        </Link>
        <p className="mt-1 text-[11.5px] text-pine-900/50">Lá você também marca Concordo / Discordo em cada mudança.</p>
      </div>
    </div>
  );
}

function GroupList({ groups }: { groups: readonly RevisionGroup[] }) {
  return (
    <ul className="space-y-2.5">
      {groups.map((g, i) => {
        // Sem página para onde levar o resto, mostra todas.
        const extra = g.href ? g.lines.length - MAX_LINES : 0;
        return (
          <li key={i} className="min-w-0">
            {g.href ? (
              <Link href={g.href} className="text-[13px] font-bold break-words text-pine-950 hover:underline">
                {g.title}
              </Link>
            ) : (
              <p className="text-[13px] font-bold break-words text-pine-950">{g.title}</p>
            )}
            <div className="mt-1">
              <ConciseLines lines={extra > 0 ? g.lines.slice(0, MAX_LINES) : g.lines} />
            </div>
            {extra > 0 && g.href ? (
              <Link href={g.href} className="mt-1 inline-block text-[12px] font-bold text-pine-600 hover:underline">
                + {extra} {extra === 1 ? "mudança" : "mudanças"} →
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Uma linha do "o que mudou": o que saiu riscado em vermelho, o que entrou em verde, "→" entre os dois. */
export function ConciseText({ line, className = "" }: { line: ConciseLine; className?: string }) {
  return (
    <p className={`min-w-0 leading-snug break-words ${className}`}>
      {line.label ? <b className="mr-1 font-bold text-pine-950">{line.label}:</b> : null}
      {line.parts.map((p, i) => {
        const prev = line.parts[i - 1];
        const arrow = p.k === "ins" && prev?.k === "del";
        return (
          <Fragment key={i}>
            {arrow ? (
              <span aria-label="mudou para" className="mx-1 text-pine-900/45">
                →
              </span>
            ) : i > 0 && p.sp ? (
              " "
            ) : null}
            {p.k === "del" ? (
              <del className="text-rose-800 decoration-rose-400/80">{p.t}</del>
            ) : p.k === "ins" ? (
              <ins className="rounded bg-emerald-50 px-0.5 font-semibold text-emerald-900 no-underline">{p.t}</ins>
            ) : (
              <span className="text-pine-900/55">{p.t}</span>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}

/** As linhas de uma mudança, com marcador. */
export function ConciseLines({ lines }: { lines: readonly ConciseLine[] }) {
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-pine-300" />
          <ConciseText line={line} />
        </li>
      ))}
    </ul>
  );
}
