import type { LibraryTemplate } from "./types.ts";

const ASSINATURA_ENCAMINHAMENTO = "Coloco-me à disposição para o que for necessário.";

/** Encaminhamentos e solicitações. */
export const ENCAMINHAMENTOS: readonly LibraryTemplate[] = [
  {
    kind: "encaminhamento",
    name: "Encaminhamento — especialista",
    title: "Encaminhamento",
    group: "Encaminhamentos",
    body:
      "Encaminho {{paciente}} para avaliação em {{destino}}.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — urgência / pronto-socorro",
    title: "Encaminhamento para urgência",
    group: "Encaminhamentos",
    body:
      "Encaminho com **urgência** {{paciente}} para {{destino}}, para avaliação e conduta imediatas.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo do encaminhamento: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      "Paciente ciente da necessidade de atendimento imediato e orientado(a) a procurar o serviço " +
      "nesta data.\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — exame de imagem",
    title: "Solicitação de exame",
    group: "Encaminhamentos",
    body:
      "Solicito, para {{paciente}}, a realização de: {{destino}}.\n\n" +
      "CID: {{cid}}\n" +
      "Indicação clínica: {{motivo}}\n" +
      "História clínica: {{historia}}\n\n" +
      "Solicito o envio do laudo para acompanhamento.",
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — fisioterapia",
    title: "Encaminhamento para fisioterapia",
    group: "Encaminhamentos",
    body:
      "Encaminho {{paciente}} para avaliação e tratamento fisioterapêutico.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      "Sugere-se reavaliação clínica ao término das sessões, com relatório de evolução.\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — psicologia / psiquiatria",
    title: "Encaminhamento",
    group: "Encaminhamentos",
    body:
      "Encaminho {{paciente}} para avaliação em {{destino}}.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      "Paciente ciente e de acordo com o encaminhamento.\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — nutrição",
    title: "Encaminhamento para nutrição",
    group: "Encaminhamentos",
    body:
      "Encaminho {{paciente}} para avaliação e acompanhamento nutricional.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — avaliação cirúrgica",
    title: "Encaminhamento para avaliação cirúrgica",
    group: "Encaminhamentos",
    body:
      "Encaminho {{paciente}} para avaliação em {{destino}}, para consideração de conduta cirúrgica.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      "Exames e relatórios pertinentes seguem com o paciente.\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
  {
    kind: "encaminhamento",
    name: "Contrarreferência — retorno ao encaminhador",
    title: "Contrarreferência",
    group: "Encaminhamentos",
    body:
      "Refiro o retorno de {{paciente}}, encaminhado(a) a este serviço para avaliação.\n\n" +
      "CID: {{cid}}\n" +
      "Avaliação realizada: {{historia}}\n" +
      "Conduta adotada: {{conduta}}\n\n" +
      "O paciente segue em acompanhamento com o serviço de origem. Permaneço à disposição.",
  },
  {
    kind: "encaminhamento",
    name: "Solicitação de exames laboratoriais",
    title: "Solicitação de exames",
    group: "Encaminhamentos",
    body:
      "Solicito, para {{paciente}}, a realização dos exames abaixo.\n\n" +
      "CID: {{cid}}\n" +
      "Indicação clínica: {{motivo}}\n\n" +
      "Exames:\n" +
      "1. \n" +
      "2. \n" +
      "3. \n\n" +
      "Solicito o envio dos resultados para acompanhamento.",
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — fonoaudiologia",
    title: "Encaminhamento para fonoaudiologia",
    group: "Encaminhamentos",
    body:
      "Encaminho {{paciente}} para avaliação e acompanhamento fonoaudiológico.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — terapia ocupacional",
    title: "Encaminhamento para terapia ocupacional",
    group: "Encaminhamentos",
    body:
      "Encaminho {{paciente}} para avaliação e acompanhamento em terapia ocupacional.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
  {
    kind: "encaminhamento",
    name: "Encaminhamento — serviço social",
    title: "Encaminhamento para serviço social",
    group: "Encaminhamentos",
    body:
      "Encaminho {{paciente}} para avaliação do serviço social.\n\n" +
      "Motivo: {{motivo}}\n" +
      "Situação observada: {{historia}}\n\n" +
      "Paciente ciente e de acordo com o encaminhamento.\n\n" +
      ASSINATURA_ENCAMINHAMENTO,
  },
];
