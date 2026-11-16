import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ORTHO_GUIDE } from "@/lib/ortho-guide";
import { OrthoConsult } from "@/components/guide/ortho-consult";
import { OrthoCredit } from "@/components/guide/ortho-credit";

export const metadata = { title: "Consulta guiada · Ortopedia" };

/** A consulta de ortopedia passo a passo, para quem nunca atendeu ortopedia. */
export default async function OrtopediaConsultaPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await requireRole("admin", "profissional");
  const { t } = await searchParams;
  // As condições, sem as cinco páginas de base (o primeiro capítulo).
  const topics = ORTHO_GUIDE.slice(1).flatMap((c) => c.topics);
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Caminho" className="mb-2 text-xs font-semibold text-pine-900/50">
        <Link href="/guia/ortopedia" className="text-pine-600 hover:underline">
          Ortopedia
        </Link>{" "}
        › Consulta guiada
      </nav>
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-950 sm:text-[28px]">Atender agora</h1>
        <p className="mt-1 max-w-2xl text-sm text-pine-900/60">
          Cinco passos na ordem da consulta: onde dói, alarme, condição, roteiro (perguntas, manobras, conduta, receita) e a nota
          pronta para o prontuário. Nada sai da sua tela — o paciente não vê.
        </p>
      </header>
      <OrthoConsult topics={topics} initialTopic={t ?? null} />
      <div className="mt-8">
        <OrthoCredit compact />
      </div>
    </div>
  );
}
