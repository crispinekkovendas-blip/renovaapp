"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { GuideData } from "@/lib/guide-search";

/**
 * O Guia clínico inteiro no navegador — receitas prontas, plantão e Drive —,
 * vindo do layout da seção: chega uma vez e fica na troca de aba (o layout
 * não é refeito). A busca única e as três abas leem daqui.
 */
const GuideDataContext = createContext<GuideData | null>(null);

export function GuideDataProvider({ data, children }: { data: GuideData; children: ReactNode }) {
  return <GuideDataContext.Provider value={data}>{children}</GuideDataContext.Provider>;
}

export function useGuideData(): GuideData {
  const data = useContext(GuideDataContext);
  if (!data) throw new Error("useGuideData fora do layout do Guia clínico");
  return data;
}
