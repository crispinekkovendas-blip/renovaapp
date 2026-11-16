import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ORTHO_CREDIT, orthoDocs, orthoStats } from "@/lib/ortho-guide";
import { GuideHeader } from "@/components/guide/guide-header";
import { OrthoIndex } from "@/components/guide/ortho-index";
import { OrthoCredit } from "@/components/guide/ortho-credit";
import { AskBox } from "@/components/guide/ask-box";
import { guideAiEnabled } from "@/lib/guide-ask";

export const metadata = { title: "Ortopedia" };

/** O guia de ortopedia — plantão e ambulatório — para o médico que assume a vaga de ortopedia no SUS e é, ali, o ortopedista. */
export default async function OrtopediaPage() {
  await requireRole("admin", "profissional");
  const stats = orthoStats();
  return (
    <div className="mx-auto max-w-5xl">
      <GuideHeader
        title="Ortopedia"
        action={
          <Link href="/guia/ortopedia/revisoes" className="chip bg-amber-100 text-amber-900 hover:bg-amber-200">
            Revisão {ORTHO_CREDIT.revision} · {ORTHO_CREDIT.revisedAt} · ver mudanças →
          </Link>
        }
      >
        Você é o ortopedista de plantão e de ambulatório: {stats.topics} tópicos em {stats.chapters} capítulos, cada um na ordem do
        atendimento — perguntar, examinar ({stats.exams} manobras), alarme, imagem, o que fazer na urgência, procedimentos passo a
        passo, conduta, receita, o retorno, o que vai para a cirurgia pela regulação, e atestado.
      </GuideHeader>
      {guideAiEnabled() ? <AskBox examples="ortopedia" defaultScope="ortopedia" /> : null}
      <OrthoIndex docs={orthoDocs()} />
      <div className="mt-8">
        <OrthoCredit />
      </div>
    </div>
  );
}
