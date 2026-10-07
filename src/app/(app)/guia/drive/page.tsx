import { requireRole } from "@/lib/auth";
import { DRIVE_CREDIT, DRIVE_PATTERNS, driveStats } from "@/lib/prescription-drive";
import { CURRENT_REVISION, revisionLabel } from "@/lib/guide-revisions";
import { driveTabRevisions } from "@/lib/guide-tab-revisions";
import { DriveIndex } from "@/components/guide/drive-index";
import { AskBox } from "@/components/guide/ask-box";
import { guideAiEnabled } from "@/lib/guide-ask";
import { Md } from "@/components/guide/drive-entry";
import { GuideHeader } from "@/components/guide/guide-header";
import { SeeMore } from "@/components/guide/see-more";
import { SEE_MORE_TAB } from "@/components/guide/review-history";
import { TabRevisions } from "@/components/guide/concise";

export const metadata = { title: "Drive de prescrições" };

/** O Drive de prescrições revisado: cada condição com a receita atual. */
export default async function DrivePage() {
  await requireRole("admin", "profissional");
  const stats = driveStats();
  return (
    <div className="mx-auto max-w-5xl">
      <GuideHeader
        title="Drive de prescrições"
        action={
          <SeeMore
            label="Revisões · ver mais"
            title="Revisões do Drive de prescrições"
            subtitle={`Última: ${revisionLabel(CURRENT_REVISION)}`}
            className={SEE_MORE_TAB}
          >
            <TabRevisions revisions={driveTabRevisions()} current={CURRENT_REVISION} detailsHref="/guia/revisoes?aba=drive">
              <details className="group rounded-xl bg-pine-50/50 px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[12.5px] font-bold text-pine-900/75 [&::-webkit-details-marker]:hidden">
                  O que mais se repetia no Drive original <span className="text-[11.5px] text-pine-600 group-open:hidden">ver ›</span>
                </summary>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5">
                  {DRIVE_PATTERNS.map((p) => (
                    <li key={p}>
                      <Md text={p} />
                    </li>
                  ))}
                </ol>
              </details>
            </TabRevisions>
          </SeeMore>
        }
      >
        {stats.entries} condições de consultório e pronto-atendimento, revistas pelas diretrizes atuais: a receita pronta para
        copiar, a dose de criança, os cuidados e a fonte.
      </GuideHeader>
      {guideAiEnabled() ? <AskBox scope="consultorio" /> : null}
      <DriveIndex />
      <p className="mt-8 rounded-2xl border border-pine-900/10 bg-white/70 p-4 text-[13px] text-pine-900/65">
        Lista de condições do <b className="text-pine-950">{DRIVE_CREDIT.basedOn}</b>. As receitas, doses e orientações
        foram reescritas pela revisão Renova em {DRIVE_CREDIT.reviewedAt}, com apoio de IA, a partir de diretrizes públicas
        (fonte em cada entrada). Precisam de conferência médica: ajuste a alergias, gestação, função renal e hepática, peso e
        idade.
      </p>
    </div>
  );
}
