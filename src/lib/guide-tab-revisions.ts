import type { GuideEntry } from "./clinical-guide.ts";
import type { ConciseLine } from "./revision-diff.ts";
import { headlineLine } from "./revision-diff.ts";
import { GUIDE_REVISIONS } from "./guide-revisions.ts";
import { ORIENTATION_CHANGES } from "./rx-library/review.ts";
import { ORIENTACOES } from "./document-library/orientacoes.ts";
import { guideStats, plantaoChanges } from "./emergency-guide/index.ts";
import { PRESCRIPTION_DRIVE, driveChanges, driveStats } from "./prescription-drive/index.ts";

/**
 * O que cada revisão mudou em cada aba do Guia clínico — só o trecho trocado,
 * por item. Serve ao "Revisões · ver mais" do alto de cada aba e ao aviso de
 * revisão nova do app Android.
 */

export interface RevisionGroup {
  title: string;
  /** Página do item (tópico, entrada do Drive); o "+N" leva para lá. */
  href?: string;
  lines: readonly ConciseLine[];
}

export interface TabRevision {
  rev: number;
  /** "9 receitas · 4 orientações". */
  count: string;
  groups: readonly RevisionGroup[];
}

/** Receitas prontas: as receitas e as orientações compartilhadas que mudaram. */
export function receitasTabRevisions(entries: readonly GuideEntry[]): TabRevision[] {
  return [...GUIDE_REVISIONS].reverse().flatMap((r) => {
    const recipes: RevisionGroup[] = entries
      .map((e) => ({ title: e.name, lines: e.changes.filter((c) => c.rev === r.n && !c.template).flatMap((c) => c.concise) }))
      .filter((g) => g.lines.length > 0);
    const shared: RevisionGroup[] = Object.entries(ORIENTATION_CHANGES).flatMap(([name, changes]) =>
      changes
        .filter((c) => c.rev === r.n)
        .map((c) => ({
          title: `${ORIENTACOES.find((t) => t.name === name)?.title ?? name} (todas as receitas ligadas)`,
          lines: [headlineLine(c.text)],
        }))
    );
    if (recipes.length + shared.length === 0) return [];
    const count = [
      recipes.length ? `${recipes.length} ${recipes.length === 1 ? "receita" : "receitas"}` : null,
      shared.length ? `${shared.length} ${shared.length === 1 ? "orientação" : "orientações"}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return [{ rev: r.n, count, groups: [...recipes, ...shared] }];
  });
}

/** Plantão: as correções, os avisos e os retirados, por tópico. */
export function plantaoTabRevisions(): TabRevision[] {
  const stats = guideStats();
  const all = plantaoChanges();
  return [...GUIDE_REVISIONS].reverse().flatMap((r) => {
    const changes = all.filter((c) => c.rev === r.n);
    if (changes.length === 0) return [];
    const groups: RevisionGroup[] = [...new Set(changes.map((c) => c.slug))].map((slug) => {
      const topic = changes.filter((c) => c.slug === slug);
      return { title: topic[0].topic, href: `/guia/plantao/${slug}`, lines: topic.flatMap((c) => c.concise) };
    });
    const s = stats.byRev(r.n);
    const count = [
      `${s.fixes} ${s.fixes === 1 ? "correção" : "correções"}`,
      `${s.notes} ${s.notes === 1 ? "aviso" : "avisos"}`,
      s.withdrawn ? `${s.withdrawn} ${s.withdrawn === 1 ? "retirado" : "retirados"}` : null,
      `${s.topics} ${s.topics === 1 ? "tópico" : "tópicos"}`,
    ]
      .filter(Boolean)
      .join(" · ");
    return [{ rev: r.n, count, groups }];
  });
}

/** Drive: as entradas que mudaram depois de o Drive entrar no app. */
export function driveTabRevisions(): TabRevision[] {
  const stats = driveStats();
  const entries = PRESCRIPTION_DRIVE.flatMap((s) => s.entries);
  return [...GUIDE_REVISIONS].reverse().flatMap((r) => {
    const groups: RevisionGroup[] = entries
      .map((e) => ({ title: e.title, href: `/guia/drive/${e.slug}`, lines: driveChanges(e).filter((c) => c.rev === r.n).flatMap((c) => c.concise) }))
      .filter((g) => g.lines.length > 0);
    if (groups.length === 0) return [];
    // Na 2ª revisão o Drive entrou no app inteiro, revisto condição por condição.
    const count =
      r.n === 2
        ? `entrou no app: ${stats.refeito} refeitas · ${stats.ajustado} ajustadas · ${stats.mantido} mantidas`
        : `${groups.length} ${groups.length === 1 ? "entrada" : "entradas"}`;
    return [{ rev: r.n, count, groups }];
  });
}
