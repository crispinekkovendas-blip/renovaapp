import { requireRole } from "@/lib/auth";
import { ORTHO_CREDIT, orthoDocs, orthoStats } from "@/lib/ortho-guide";
import { GuideHeader } from "@/components/guide/guide-header";
import { OrthoIndex } from "@/components/guide/ortho-index";
import { OrthoCredit } from "@/components/guide/ortho-credit";

export const metadata = { title: "Ortopedia" };

/** O guia de ortopedia ambulatorial, para o clínico que assume a vaga de ortopedia. */
export default async function OrtopediaPage() {
  await requireRole("admin", "profissional");
  const stats = orthoStats();
  return (
    <div className="mx-auto max-w-5xl">
      <GuideHeader
        title="Ortopedia"
        action={
          <span className="chip bg-amber-100 text-amber-900">
            Revisão {ORTHO_CREDIT.revision} · {ORTHO_CREDIT.writtenAt}
          </span>
        }
      >
        Ambulatório de ortopedia para o clínico geral: {stats.topics} condições em {stats.chapters} capítulos, cada uma na ordem da
        consulta — perguntar, examinar ({stats.exams} manobras), alarme, imagem, conduta, receita, encaminhar e atestado.
      </GuideHeader>
      <OrthoIndex docs={orthoDocs()} />
      <div className="mt-8">
        <OrthoCredit />
      </div>
    </div>
  );
}
