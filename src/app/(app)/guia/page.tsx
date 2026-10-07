import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { GUIDE_GROUPS, guideEntries } from "@/lib/clinical-guide";
import { ClinicalGuide } from "@/components/guide/clinical-guide";
import { AskBox } from "@/components/guide/ask-box";
import { GuideHeader } from "@/components/guide/guide-header";
import { SeeMore } from "@/components/guide/see-more";
import { SEE_MORE_TAB } from "@/components/guide/review-history";
import { TabRevisions } from "@/components/guide/concise";
import { guideAiEnabled } from "@/lib/guide-ask";
import { CURRENT_REVISION, revisionLabel } from "@/lib/guide-revisions";
import { receitasTabRevisions } from "@/lib/guide-tab-revisions";

export const metadata = { title: "Receitas prontas" };

/** Receitas prontas e orientações ao paciente para consultar sem abrir uma ficha. */
export default async function GuiaPage() {
  await requireRole("admin", "profissional");
  const entries = guideEntries();
  return (
    <div className="mx-auto max-w-5xl">
      <GuideHeader
        title="Receitas prontas"
        action={
          <SeeMore
            label="Revisões · ver mais"
            title="Revisões das Receitas prontas"
            subtitle={`Última: ${revisionLabel(CURRENT_REVISION)}`}
            className={SEE_MORE_TAB}
          >
            <TabRevisions revisions={receitasTabRevisions(entries)} current={CURRENT_REVISION} detailsHref="/guia/revisoes?aba=receitas" />
          </SeeMore>
        }
      >
        {entries.length} receitas por condição, com a orientação ao paciente: ponto de partida para adulto sem comorbidade. Para
        receitar, abra a{" "}
        <Link href="/pacientes" className="font-bold text-pine-600 hover:underline">
          ficha do paciente
        </Link>{" "}
        › Emitir documento.
      </GuideHeader>
      {guideAiEnabled() ? <AskBox scope="consultorio" /> : null}
      <ClinicalGuide groups={GUIDE_GROUPS} />
    </div>
  );
}
