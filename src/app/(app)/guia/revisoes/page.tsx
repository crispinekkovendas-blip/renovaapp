import Link from "next/link";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { guideEntries } from "@/lib/clinical-guide";
import { ORIENTATION_CHANGES } from "@/lib/rx-library/review";
import { ORIENTACOES } from "@/lib/document-library/orientacoes";
import { plantaoChanges } from "@/lib/emergency-guide";
import { driveRevisionLog, driveStats, revisionLines } from "@/lib/prescription-drive";
import { CURRENT_REVISION, GUIDE_REVISIONS, revisionLabel } from "@/lib/guide-revisions";
import { RevisionList } from "@/components/guide/revision-list";
import { headlineLine } from "@/lib/revision-diff";
import type { ConciseLine } from "@/lib/revision-diff";

export const metadata = { title: "Revisões do guia" };

type Tab = "receitas" | "plantao" | "drive";
const TABS: { key: Tab; label: string }[] = [
  { key: "receitas", label: "Receitas prontas" },
  { key: "plantao", label: "Plantão e emergência" },
  { key: "drive", label: "Drive de prescrições" },
];

interface LogItem {
  tab: Tab;
  rev: number;
  href: string;
  title: string;
  where: string;
  kind: string;
  text: string;
  before: string[] | null;
  after: string[] | null;
  /** Só o que mudou, para a lista começar enxuta. */
  concise: ConciseLine[];
}

/** FNV-1a de 32 bits: basta para dar um id curto e estável a cada mudança. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Identidade estável de uma mudança, para a decisão do médico continuar presa a ela. */
function itemId(i: LogItem): string {
  return `${i.tab}-${i.rev}-${hash(`${i.title}|${i.kind}|${i.text}|${(i.after ?? []).join("|")}`)}`;
}

/** Tudo o que cada revisão mudou nas três abas, com antes, depois e motivo. */
function revisionLog(): LogItem[] {
  const receitas: LogItem[] = guideEntries().flatMap((e) =>
    // Mudança em orientação compartilhada entra uma vez só, logo abaixo — não uma por receita.
    e.changes.filter((c) => !c.template).map((c) => ({
      tab: "receitas" as const,
      rev: c.rev,
      href: `/guia?q=${encodeURIComponent(e.name)}`,
      title: e.name,
      where: e.group,
      kind: c.kind === "orientacao" ? "Orientação ao paciente" : c.before ? "Receita mudou" : "Receita nova",
      text: c.text,
      before: c.kind === "orientacao" ? null : c.before,
      after: c.kind === "orientacao" ? null : c.after,
      concise: c.concise,
    }))
  );
  const orientacoes: LogItem[] = Object.entries(ORIENTATION_CHANGES).flatMap(([name, changes]) =>
    changes.map((c) => ({
      tab: "receitas" as const,
      rev: c.rev,
      href: "/guia",
      title: ORIENTACOES.find((t) => t.name === name)?.title ?? name,
      where: "Orientações ao paciente (vale para todas as receitas ligadas a ela)",
      kind: "Orientação ao paciente",
      text: c.text,
      before: null,
      after: null,
      concise: [headlineLine(c.text)],
    }))
  );
  const plantao: LogItem[] = plantaoChanges().map((c) => ({
    tab: "plantao" as const,
    rev: c.rev,
    href: `/guia/plantao/${c.slug}`,
    title: c.topic,
    where: c.chapter,
    kind: c.kind === "fix" ? "Trecho corrigido" : c.kind === "note" ? "Aviso “Conferir”" : "Aviso retirado",
    text: c.kind === "note" ? c.after : c.why,
    before: c.kind === "note" ? (c.before ? [`Aviso anterior: ${c.before}`] : null) : c.before ? [c.before] : null,
    after: c.kind === "fix" ? [c.after] : c.kind === "note" ? [c.why] : null,
    concise: c.concise,
  }));
  const drive: LogItem[] = driveRevisionLog().map((r) => ({
    tab: "drive" as const,
    rev: r.rev,
    href: `/guia/drive/${r.slug}`,
    title: r.title,
    where: r.section,
    kind: "Entrada mudou",
    text: r.text,
    before: revisionLines(r.before),
    after: revisionLines(r.after),
    concise: r.concise,
  }));
  return [...receitas, ...orientacoes, ...plantao, ...drive];
}

export default async function RevisoesPage({ searchParams }: { searchParams: Promise<{ rev?: string; aba?: string }> }) {
  await requireRole("admin", "profissional");
  const params = await searchParams;
  const rev = GUIDE_REVISIONS.some((r) => String(r.n) === params.rev) ? Number(params.rev) : CURRENT_REVISION;
  const tab = TABS.some((t) => t.key === params.aba) ? (params.aba as Tab) : null;
  const all = revisionLog();
  const inRev = all.filter((i) => i.rev === rev);
  const items = inRev.filter((i) => !tab || i.tab === tab);
  const href = (r: number, t: Tab | null) => `/guia/revisoes?rev=${r}${t ? `&aba=${t}` : ""}`;
  // Mudanças iguais no mesmo tópico (a mesma troca em dois trechos) ganham sufixo, para cada uma ter a sua decisão.
  const seen = new Map<string, number>();
  const ids = items.map((item) => {
    const base = itemId(item);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-4 sm:mb-5">
        <nav aria-label="Caminho" className="mb-2 text-xs font-semibold text-pine-900/50">
          <Link href="/guia" className="text-pine-600 hover:underline">
            Guia clínico
          </Link>{" "}
          › Revisões
        </nav>
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-950 sm:text-[28px]">Revisões do guia</h1>
        <p className="mt-1 max-w-2xl text-sm text-pine-900/60">
          Tudo o que cada revisão mudou nas Receitas prontas, no Plantão e no Drive: o que era antes, o que ficou e o motivo.
          A versão em uso é sempre a mais nova; a anterior fica registrada aqui. Marque em cada mudança se concorda ou
          discorda — e copie as discordâncias para avisar a equipe.
        </p>
      </header>

      <nav aria-label="Revisão" className="scroll-x -mx-1 flex gap-1.5 px-1 pb-1">
        {[...GUIDE_REVISIONS].reverse().map((r) => {
          const count = all.filter((i) => i.rev === r.n).length;
          const on = r.n === rev;
          return (
            <Link
              key={r.n}
              href={href(r.n, tab)}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${
                on ? "border-pine-950 bg-pine-950 text-white" : "border-pine-900/12 bg-white text-pine-900/70 hover:border-pine-400"
              }`}
            >
              {revisionLabel(r.n)} <span className={on ? "text-white/60" : "text-pine-900/40"}>{count}</span>
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Aba" className="scroll-x -mx-1 mt-2 flex gap-1.5 px-1 pb-1">
        <Chip on={tab === null} href={href(rev, null)}>
          Todas as abas <span className="opacity-60">{inRev.length}</span>
        </Chip>
        {TABS.map((t) => (
          <Chip key={t.key} on={tab === t.key} href={href(rev, t.key)}>
            {t.label} <span className="opacity-60">{inRev.filter((i) => i.tab === t.key).length}</span>
          </Chip>
        ))}
      </nav>

      {rev === 2 && (!tab || tab === "drive") ? (
        <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-[13px] text-sky-950 ring-1 ring-sky-200">
          Na {revisionLabel(2)} o Drive entrou no app: {driveStats().entries} condições reescritas. O que mudou em cada uma em
          relação ao Drive original está na própria entrada (caixa “O que mudou”).{" "}
          <Link href="/guia/drive" className="font-bold text-pine-700 hover:underline">
            Abrir o Drive →
          </Link>
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="card mt-4 px-5 py-8 text-center text-sm text-pine-900/60">Nenhuma mudança nesta revisão para esta aba.</p>
      ) : (
        <RevisionList
          key={`${rev}-${tab ?? "todas"}`}
          revLabel={revisionLabel(rev)}
          items={items.map((item, i) => ({
            id: ids[i],
            tab: TABS.find((t) => t.key === item.tab)?.label ?? item.tab,
            kind: item.kind,
            where: item.where,
            title: item.title,
            href: item.href,
            text: item.text,
            before: item.before,
            after: item.after,
            concise: item.concise,
            afterLabel: item.kind === "Aviso “Conferir”" ? "Trecho do guia" : "Agora",
          }))}
        />
      )}
      <p className="mt-6 text-[12.5px] text-pine-900/55">
        As revisões são feitas pela equipe Renova com apoio de IA, a partir de diretrizes públicas, e precisam de conferência
        médica. Para usar uma versão anterior, ajuste a receita na ficha antes de emitir.
      </p>
    </div>
  );
}

function Chip({ on, href, children }: { on: boolean; href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${
        on ? "border-amber-600 bg-amber-500 text-white" : "border-pine-900/12 bg-white text-pine-900/70 hover:border-pine-400"
      }`}
    >
      {children}
    </Link>
  );
}
