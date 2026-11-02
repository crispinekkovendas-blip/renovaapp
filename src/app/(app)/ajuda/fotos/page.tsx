import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { allPhotos } from "@/lib/medication-photos";

export const metadata = { title: "Créditos das fotos" };

/**
 * Créditos das fotos de medicamentos: as licenças CC BY e CC BY-SA exigem
 * autor, licença e link; domínio público e CC0 entram também, por clareza.
 */
export default async function PhotoCreditsPage() {
  await requireSession();
  const photos = allPhotos();
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 sm:mb-6">
        <Link href="/ajuda" className="text-xs font-bold text-pine-600 hover:underline">
          ← Ajuda
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-pine-950 sm:text-[28px]">Créditos das fotos</h1>
        <p className="mt-1 text-sm leading-relaxed text-pine-900/60">
          As fotos dos medicamentos vêm do Wikimedia Commons, todas com licença que permite este uso. São ilustrativas: muitas
          mostram a embalagem de outro país, e a apresentação que vale é a da receita. Medicamento sem foto livre aparece com a
          caixinha desenhada da forma farmacêutica.
        </p>
      </header>

      {photos.length === 0 ? (
        <p className="card p-5 text-sm text-pine-900/60">Nenhuma foto ainda.</p>
      ) : (
        <ul className="card divide-y divide-pine-900/5">
          {photos.map((photo) => (
            <li key={photo.src} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.brand} loading="lazy" className="h-12 w-12 shrink-0 rounded-lg border border-[var(--color-line)] object-cover" />
              <div className="min-w-0 text-sm">
                <p className="font-bold text-pine-950">{photo.brand}</p>
                <p className="text-xs text-pine-900/60">
                  {photo.author ? `${photo.author} · ` : ""}
                  {photo.licenseUrl ? (
                    <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className="underline">
                      {photo.license}
                    </a>
                  ) : (
                    photo.license
                  )}
                  {" · "}
                  <a href={photo.page} target="_blank" rel="noreferrer" className="underline">
                    arquivo no Commons
                  </a>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
