import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DRIVE_CREDIT, driveHistory, driveMarks, findDriveEntry, isMarked } from "@/lib/prescription-drive";
import { DriveEntryBody } from "@/components/guide/drive-entry";
import { RevisionCarousel } from "@/components/guide/revision-carousel";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const found = findDriveEntry((await params).slug);
  return { title: found ? `${found.entry.title} · Drive` : "Drive de prescrições" };
}

/** Uma condição do Drive revisado, com as outras da mesma seção ao lado. */
export default async function DriveEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireRole("admin", "profissional");
  const found = findDriveEntry((await params).slug);
  if (!found) notFound();
  const { section, entry, prev, next } = found;
  const marks = driveMarks(entry);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <article className="min-w-0">
        <nav aria-label="Caminho" className="mb-2 text-xs font-semibold text-pine-900/50">
          <Link href="/guia/drive" className="text-pine-600 hover:underline">
            Drive de prescrições
          </Link>{" "}
          › {section.title}
        </nav>
        <h1 className="text-2xl leading-tight font-extrabold tracking-tight break-words text-pine-950 sm:text-[28px]">{entry.title}</h1>
        {entry.cid ? (
          <p className="mt-1.5 text-xs">
            <span className={`chip tabular-nums ${isMarked(entry.cid, marks) ? "bg-[hsl(52_100%_72%/0.7)] text-pine-900" : "bg-pine-50 text-pine-800"}`}>CID {entry.cid}</span>
          </p>
        ) : null}

        <div className="card mt-4 p-4 sm:p-6">
          <DriveEntryBody entry={entry} marks={marks} />
        </div>
        <RevisionCarousel slides={driveHistory(entry).slides} />

        <div className="mt-4 grid grid-cols-2 gap-2 [&>a]:min-w-0 [&>a]:break-words">
          {prev ? (
            <Link href={`/guia/drive/${prev.slug}`} className="rounded-2xl border border-pine-900/10 bg-white px-3.5 py-2.5 text-sm hover:border-pine-400">
              <span className="block text-[11px] font-bold text-pine-900/45">← Anterior</span>
              <span className="font-bold text-pine-950">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/guia/drive/${next.slug}`}
              className="rounded-2xl border border-pine-900/10 bg-white px-3.5 py-2.5 text-right text-sm hover:border-pine-400"
            >
              <span className="block text-[11px] font-bold text-pine-900/45">Próximo →</span>
              <span className="font-bold text-pine-950">{next.title}</span>
            </Link>
          ) : null}
        </div>

        <p className="mt-6 rounded-2xl border border-pine-900/10 bg-white/70 p-3.5 text-xs text-pine-900/65">
          Condição do {DRIVE_CREDIT.basedOn}: o card original, no início do histórico, é reproduzido com autorização da autora. Texto da revisão Renova ({DRIVE_CREDIT.reviewedAt}), com apoio de IA. Confira
          antes de prescrever: alergias, gestação, função renal e hepática, peso e idade mudam a conduta. Para emitir, use a
          ficha do paciente.
        </p>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-4">
          <p className="mb-2 text-xs font-extrabold tracking-[0.12em] text-pine-900/50 uppercase">{section.title}</p>
          <ul className="space-y-0.5">
            {section.entries.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/guia/drive/${e.slug}`}
                  aria-current={e.slug === entry.slug ? "page" : undefined}
                  className={`block rounded-lg px-2.5 py-1.5 text-[13px] leading-snug ${
                    e.slug === entry.slug ? "bg-pine-100 font-bold text-pine-950" : "text-pine-900/70 hover:bg-pine-50"
                  }`}
                >
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
