import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { guideEntries } from "@/lib/clinical-guide";
import { plantaoDocs } from "@/lib/emergency-guide";
import { driveDocs } from "@/lib/prescription-drive";
import { guideAiEnabled } from "@/lib/guide-ask";
import { GuideDataProvider } from "@/components/guide/guide-data";
import { GuideSearch } from "@/components/guide/guide-search";

/**
 * A seção Guia clínico: as três abas (Receitas prontas, Plantão e
 * emergência, Drive de prescrições) com uma busca só no alto, que procura
 * nas três ao mesmo tempo.
 *
 * O guia inteiro chega daqui, uma vez: o layout não é refeito na troca de
 * aba, então trocar de aba não baixa tudo de novo — as abas leem do mesmo
 * lugar (guide-data.tsx).
 */
export default async function GuiaLayout({ children }: { children: ReactNode }) {
  const session = await requireRole("admin", "profissional");
  const aiOn = guideAiEnabled();
  return (
    <GuideDataProvider
      // A lista de mudanças de cada receita fica aqui: só a página Revisões a usa.
      data={{ receitas: guideEntries().map(({ changes, ...recipe }) => recipe), plantao: plantaoDocs(), drive: driveDocs() }}
    >
      <GuideSearch
        aiEnabled={aiOn}
        aiOffReason={!aiOn && session.role === "admin" ? "a variável GEMINI_API_KEY não chegou a este servidor." : null}
      >
        {children}
      </GuideSearch>
    </GuideDataProvider>
  );
}
