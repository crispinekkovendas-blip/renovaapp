import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { blockHistory, findGuideTopic, titleHistory, topicRevised } from "@/lib/emergency-guide";
import { CURRENT_REVISION, revisionLabel } from "@/lib/guide-revisions";
import { GuideTopicBody } from "@/components/guide/guide-topic";
import { GuideCredit } from "@/components/guide/guide-credit";
import { RevisionCarousel } from "@/components/guide/revision-carousel";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const found = findGuideTopic((await params).slug);
  return { title: found ? `${found.topic.title} · Plantão` : "Plantão e emergência" };
}

/** Um tópico do guia de plantão, com os outros do mesmo capítulo ao lado. */
export default async function PlantaoTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireRole("admin", "profissional");
  const found = findGuideTopic((await params).slug);
  if (!found) notFound();
  const { chapter, topic, prev, next } = found;
  const revised = topicRevised(topic);
  const revisedBlocks = topic.blocks.filter((b) => blockHistory(b, topic.page)).length;
  const title = titleHistory(topic);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <article className="min-w-0">
        <nav aria-label="Caminho" className="mb-2 text-xs font-semibold text-pine-900/50">
          <Link href="/guia/plantao" className="text-pine-600 hover:underline">
            Plantão e emergência
          </Link>{" "}
          › {chapter.title}
        </nav>
        <h1 className="text-2xl leading-tight font-extrabold tracking-tight break-words text-pine-950 sm:text-[28px]">
          {title ? <mark className="rev-mark">{topic.title}</mark> : topic.title}
        </h1>
        {title ? <RevisionCarousel slides={title.slides} /> : null}
        <p className="mt-1 text-xs text-pine-900/45">
          Página {topic.page} do guia
          {revisedBlocks > 0
            ? ` · ${revisedBlocks} ${revisedBlocks === 1 ? "trecho revisado" : "trechos revisados"}, em amarelo, com o histórico logo abaixo de cada um`
            : ""}
          {revised > 0 ? (
            <span className="font-semibold text-pine-900/60">
              {" "}
              · {revised} {revised === 1 ? "mudança" : "mudanças"} na {revisionLabel(CURRENT_REVISION)}
            </span>
          ) : null}
        </p>

        <div className="card mt-4 p-4 sm:p-6">
          <GuideTopicBody blocks={topic.blocks} page={topic.page} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 [&>a]:min-w-0 [&>a]:break-words">
          {prev ? (
            <Link
              href={`/guia/plantao/${prev.slug}`}
              className="rounded-2xl border border-pine-900/10 bg-white px-3.5 py-2.5 text-sm hover:border-pine-400"
            >
              <span className="block text-[11px] font-bold text-pine-900/45">← Anterior</span>
              <span className="font-bold text-pine-950">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/guia/plantao/${next.slug}`}
              className="rounded-2xl border border-pine-900/10 bg-white px-3.5 py-2.5 text-right text-sm hover:border-pine-400"
            >
              <span className="block text-[11px] font-bold text-pine-900/45">Próximo →</span>
              <span className="font-bold text-pine-950">{next.title}</span>
            </Link>
          ) : null}
        </div>

        <div className="mt-6">
          <GuideCredit compact />
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-4">
          <p className="mb-2 text-xs font-extrabold tracking-[0.12em] text-pine-900/50 uppercase">{chapter.title}</p>
          <ul className="space-y-0.5">
            {chapter.topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/guia/plantao/${t.slug}`}
                  aria-current={t.slug === topic.slug ? "page" : undefined}
                  className={`block rounded-lg px-2.5 py-1.5 text-[13px] leading-snug ${
                    t.slug === topic.slug ? "bg-pine-100 font-bold text-pine-950" : "text-pine-900/70 hover:bg-pine-50"
                  }`}
                >
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
