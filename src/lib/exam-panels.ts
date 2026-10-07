/**
 * Painéis de exames: listas nomeadas que viram uma solicitação com um clique.
 *
 * Diferente dos protocolos de medicamento, aqui **dá** para trazer conteúdo
 * pronto: pedir um hemograma não é prescrever uma dose. Ainda assim, cada
 * painel é um ponto de partida que o médico edita — nenhum deles é obrigatório
 * nem completo, e a indicação continua sendo de quem assina.
 *
 * Os nomes dos exames são os que os laboratórios brasileiros usam no pedido.
 */

export interface ExamPanel {
  name: string;
  /** Quando faz sentido pedir — aparece como legenda na escolha. */
  hint: string;
  exams: readonly string[];
}

export const EXAM_PANELS: readonly ExamPanel[] = [
  {
    name: "Check-up básico do adulto",
    hint: "Avaliação de rotina, adulto assintomático",
    exams: [
      "Hemograma completo",
      "Glicemia de jejum",
      "Hemoglobina glicada (HbA1c)",
      "Colesterol total e frações",
      "Triglicerídeos",
      "Creatinina com taxa de filtração glomerular estimada",
      "Ureia",
      "TGO (AST) e TGP (ALT)",
      "TSH",
      "Ácido úrico",
      "Urina tipo I (EAS)",
    ],
  },
  {
    name: "Risco cardiovascular",
    hint: "Hipertensão, dislipidemia, seguimento",
    exams: [
      "Colesterol total e frações",
      "Triglicerídeos",
      "Glicemia de jejum",
      "Hemoglobina glicada (HbA1c)",
      "Creatinina com taxa de filtração glomerular estimada",
      "Potássio e sódio",
      "Ácido úrico",
      "Urina tipo I (EAS)",
      "Microalbuminúria em amostra isolada",
      "Eletrocardiograma de repouso",
    ],
  },
  {
    name: "Seguimento de diabetes",
    hint: "Controle e rastreio de complicações",
    exams: [
      "Glicemia de jejum",
      "Hemoglobina glicada (HbA1c)",
      "Colesterol total e frações",
      "Triglicerídeos",
      "Creatinina com taxa de filtração glomerular estimada",
      "Microalbuminúria em amostra isolada",
      "Urina tipo I (EAS)",
      "TSH",
      "Fundo de olho (avaliação oftalmológica)",
    ],
  },
  {
    name: "Pré-natal — 1º trimestre",
    hint: "Primeira consulta de pré-natal",
    exams: [
      "Hemograma completo",
      "Tipagem sanguínea e fator Rh",
      "Coombs indireto",
      "Glicemia de jejum",
      "Sorologia para sífilis (VDRL)",
      "Sorologia para HIV",
      "Sorologia para hepatite B (HBsAg)",
      "Sorologia para hepatite C (anti-HCV)",
      "Sorologia para toxoplasmose (IgG e IgM)",
      "Sorologia para rubéola (IgG e IgM)",
      "Urina tipo I (EAS)",
      "Urocultura com antibiograma",
      "TSH",
      "Ultrassonografia obstétrica",
    ],
  },
  {
    name: "Pré-operatório",
    hint: "Avaliação antes de procedimento cirúrgico",
    exams: [
      "Hemograma completo",
      "Coagulograma (TP, TTPA, INR)",
      "Glicemia de jejum",
      "Creatinina e ureia",
      "Potássio e sódio",
      "Tipagem sanguínea e fator Rh",
      "Eletrocardiograma de repouso",
      "Radiografia de tórax",
    ],
  },
  {
    name: "Anemia — investigação",
    hint: "Hemograma alterado ou suspeita clínica",
    exams: [
      "Hemograma completo",
      "Ferritina",
      "Ferro sérico",
      "Capacidade total de ligação do ferro (TIBC)",
      "Saturação de transferrina",
      "Vitamina B12",
      "Ácido fólico",
      "Reticulócitos",
      "Proteína C reativa",
    ],
  },
  {
    name: "Tireoide",
    hint: "Suspeita de disfunção tireoidiana",
    exams: [
      "TSH",
      "T4 livre",
      "T3 total",
      "Anticorpo antitireoperoxidase (anti-TPO)",
      "Ultrassonografia de tireoide",
    ],
  },
  {
    name: "Função hepática",
    hint: "Enzimas alteradas, uso de medicação hepatotóxica",
    exams: [
      "TGO (AST) e TGP (ALT)",
      "Gama-GT",
      "Fosfatase alcalina",
      "Bilirrubinas total e frações",
      "Albumina",
      "Coagulograma (TP, INR)",
      "Sorologia para hepatite B (HBsAg, anti-HBs)",
      "Sorologia para hepatite C (anti-HCV)",
      "Ultrassonografia de abdome total",
    ],
  },
  {
    name: "Infecção urinária",
    hint: "Sintomas urinários ou ITU de repetição",
    exams: ["Urina tipo I (EAS)", "Urocultura com antibiograma", "Hemograma completo", "Creatinina"],
  },
  {
    name: "Saúde do homem — rotina",
    hint: "Rastreio de rotina a partir dos 50 anos",
    exams: [
      "Hemograma completo",
      "Glicemia de jejum",
      "Colesterol total e frações",
      "Creatinina com taxa de filtração glomerular estimada",
      "PSA total e livre",
      "TSH",
      "Urina tipo I (EAS)",
    ],
  },
  {
    name: "Saúde da mulher — rotina",
    hint: "Rastreio de rotina",
    exams: [
      "Hemograma completo",
      "Glicemia de jejum",
      "Colesterol total e frações",
      "TSH",
      "Creatinina",
      "Urina tipo I (EAS)",
      "Citologia oncótica cervical (Papanicolau)",
      "Mamografia bilateral",
    ],
  },
  {
    name: "Quadro infeccioso agudo",
    hint: "Febre ou infecção a esclarecer",
    exams: [
      "Hemograma completo",
      "Proteína C reativa",
      "Urina tipo I (EAS)",
      "Urocultura com antibiograma",
      "Radiografia de tórax",
    ],
  },
];

/** Como a lista entra no corpo da solicitação: uma por linha, numerada. */
export function renderPanel(panel: ExamPanel): string {
  return panel.exams.map((exam, i) => `${i + 1}. ${exam}`).join("\n");
}

/** Junta vários painéis sem repetir exame que aparece em mais de um. */
export function mergePanels(panels: readonly ExamPanel[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const panel of panels) {
    for (const exam of panel.exams) {
      const key = exam.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(exam);
    }
  }
  return out;
}
