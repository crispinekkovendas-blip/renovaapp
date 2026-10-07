import type { SearchDoc } from "../smart-search.ts";

/**
 * O que a tela de busca do plantão recebe de cada tópico. Fica aqui, longe
 * de `data.ts`: a tela roda no navegador e recebe só isto, já enxuto.
 */

export interface GuideTopicRef {
  slug: string;
  title: string;
  chapter: string;
  fixes: number;
  /** Trechos corrigidos ou marcados para conferir na 2ª revisão (01/10). */
  revised: number;
}

export interface PlantaoDoc extends GuideTopicRef {
  drugs: string[];
  subs: string[];
  /** Outros nomes da condição (sinônimo, nome popular, sigla) — clinical-terms.ts. */
  names: string[];
  /** Sintomas e queixas, para a busca vaga ("dor de cabeça latejante com enjoo"). */
  symptoms: string[];
  /** As linhas de texto do tópico, para buscar no corpo e mostrar o trecho. */
  lines: string[];
}

export function plantaoSearchDoc(doc: PlantaoDoc): SearchDoc {
  return {
    id: doc.slug,
    fields: [
      { text: doc.title, weight: 10 },
      { text: doc.names.join(" "), weight: 8 },
      { text: doc.symptoms.join(" "), weight: 4 },
      { text: doc.chapter, weight: 3 },
      { text: doc.drugs.join(" "), weight: 5 },
      { text: doc.subs.join(" "), weight: 3 },
      { text: doc.lines.join(" "), weight: 1 },
    ],
  };
}
