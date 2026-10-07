import { requireRole } from "@/lib/auth";
import { guideAiEnabled } from "@/lib/guide-ask";
import { guideStats } from "@/lib/emergency-guide";
import { CURRENT_REVISION } from "@/lib/guide-revisions";
import { plantaoTabRevisions } from "@/lib/guide-tab-revisions";
import { EmergencyIndex } from "@/components/guide/emergency-index";
import { AskBox } from "@/components/guide/ask-box";
import { GuideCredit } from "@/components/guide/guide-credit";
import { GuideHeader } from "@/components/guide/guide-header";
import { SeeMore } from "@/components/guide/see-more";
import { SEE_MORE_TAB } from "@/components/guide/review-history";
import { TabRevisions } from "@/components/guide/concise";

export const metadata = { title: "Plantão e emergência" };

/** O guia de prescrições da emergência, para o médico que também dá plantão. */
export default async function PlantaoPage() {
  await requireRole("admin", "profissional");
  const stats = guideStats();
  return (
    <div className="mx-auto max-w-5xl">
      <GuideHeader
        title="Plantão e emergência"
        action={
          <SeeMore
            label="Revisões · ver mais"
            title="Revisões do Plantão e emergência"
            subtitle={`${stats.fixes} trechos corrigidos e ${stats.notes} avisos desde a publicação`}
            className={SEE_MORE_TAB}
          >
            <TabRevisions revisions={plantaoTabRevisions()} current={CURRENT_REVISION} detailsHref="/guia/revisoes?aba=plantao" />
          </SeeMore>
        }
      >
        Prescrições de pronto-socorro e sala vermelha: {stats.topics} tópicos em {stats.chapters} capítulos, com diluições e doses
        pediátricas.
      </GuideHeader>
      {guideAiEnabled() ? <AskBox scope="plantao" /> : null}
      <EmergencyIndex />
      <div className="mt-8">
        <GuideCredit />
      </div>
    </div>
  );
}
