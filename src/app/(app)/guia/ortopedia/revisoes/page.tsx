import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { CURRENT_ORTHO_REVISION, ORTHO_REVISIONS, orthoRevisionItems, orthoRevisionLabel, orthoRevisionStats } from "@/lib/ortho-guide/revisions";
import { RevisionList } from "@/components/guide/revision-list";
import { OrthoCredit } from "@/components/guide/ortho-credit";

export const metadata = { title: "Revisões · Ortopedia" };

/** Tudo o que cada revisão mudou no Guia de ortopedia: antes, agora e motivo, com Concordo / Discordo. */
export default async function OrtopediaRevisoesPage({ searchParams }: { searchParams: Promise<{ rev?: string }> }) {
  await requireRole("admin", "profissional");
  const params = await searchParams;
  const rev = ORTHO_REVISIONS.some((r) => String(r.n) === params.rev) ? Number(params.rev) : CURRENT_ORTHO_REVISION;
  const items = orthoRevisionItems(rev);
  const stats = orthoRevisionStats(rev);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-4 sm:mb-5">
        <nav aria-label="Caminho" className="mb-2 text-xs font-semibold text-pine-900/50">
          <Link href="/guia/ortopedia" className="text-pine-600 hover:underline">
            Ortopedia
          </Link>{" "}
          › Revisões
        </nav>
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-950 sm:text-[28px]">Revisões do Guia de ortopedia</h1>
        <p className="mt-1 max-w-2xl text-sm text-pine-900/60">
          O que cada revisão mudou: o texto de antes, o de agora e o motivo, com a fonte. O guia sempre mostra o texto mais
          novo; o anterior fica aqui. Marque em cada mudança se concorda ou discorda — e copie as discordâncias para avisar a
          equipe.
        </p>
      </header>

      <nav aria-label="Revisão" className="scroll-x -mx-1 flex gap-1.5 px-1 pb-1">
        {[...ORTHO_REVISIONS].reverse().map((r) => {
          const count = orthoRevisionItems(r.n).length;
          const on = r.n === rev;
          return (
            <Link
              key={r.n}
              href={`/guia/ortopedia/revisoes?rev=${r.n}`}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${
                on ? "border-pine-950 bg-pine-950 text-white" : "border-pine-900/12 bg-white text-pine-900/70 hover:border-pine-400"
              }`}
            >
              {r.label} · {r.date.slice(0, 5)} <span className={on ? "text-white/60" : "text-pine-900/40"}>{count}</span>
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-pine-900/10 bg-white px-4 py-3 text-sm text-pine-900/60">
          {rev === 1 ? "A publicação: o texto inicial, sem mudanças registradas." : "Nenhuma mudança nesta revisão."}
        </p>
      ) : (
        <div className="mt-4">
          <p className="mb-3 text-[13px] text-pine-900/60">
            {stats.changes} {stats.changes === 1 ? "mudança" : "mudanças"}, tocando {stats.topics} tópicos (as receitas de base são compartilhadas).
          </p>
          <RevisionList items={items} revLabel={`Ortopedia, ${orthoRevisionLabel(rev)}`} />
        </div>
      )}

      <div className="mt-8">
        <OrthoCredit compact />
      </div>
    </div>
  );
}
