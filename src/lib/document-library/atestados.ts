import type { LibraryTemplate } from "./types.ts";

/** Atestados e declarações. */
export const ATESTADOS: readonly LibraryTemplate[] = [
  {
    kind: "atestado",
    subkind: "medico",
    name: "Atestado médico — afastamento",
    title: "Atestado médico",
    group: "Atestados",
    body:
      "Atesto, para os devidos fins, que {{paciente}} esteve sob meus cuidados nesta data.\n" +
      "{{motivo}}.\n\n" +
      "Necessita de {{dias}} dia(s) de afastamento de suas atividades a partir de {{data}}.\n\n" +
      "CID: {{cid}}",
  },
  {
    kind: "atestado",
    subkind: "medico",
    name: "Atestado — repouso na gestação",
    title: "Atestado médico",
    group: "Atestados",
    body:
      "Atesto, para os devidos fins, que {{paciente}} encontra-se em acompanhamento pré-natal " +
      "sob meus cuidados e, nesta data, necessita de repouso por {{dias}} dia(s) a partir de {{data}}, " +
      "por indicação clínica.\n" +
      "{{motivo}}.\n\n" +
      "Orienta-se afastamento de esforço físico, permanência prolongada em pé e jornada extensa " +
      "durante o período.\n\n" +
      "CID: {{cid}}",
  },
  {
    kind: "atestado",
    subkind: "medico",
    name: "Atestado — afastamento por doença transmissível",
    title: "Atestado médico",
    group: "Atestados",
    body:
      "Atesto, para os devidos fins, que {{paciente}} esteve sob meus cuidados nesta data e " +
      "apresenta quadro compatível com doença transmissível, sendo recomendado afastamento das " +
      "atividades e das aglomerações por {{dias}} dia(s) a partir de {{data}}.\n" +
      "{{motivo}}.\n\n" +
      "O retorno deve ocorrer após a melhora dos sintomas e ausência de febre por pelo menos 24 horas " +
      "sem uso de antitérmico.\n\n" +
      "CID: {{cid}}",
  },
  {
    kind: "atestado",
    subkind: "medico",
    name: "Atestado — aptidão para atividade física",
    title: "Atestado de aptidão física",
    group: "Atestados",
    body:
      "Atesto, para os devidos fins, que {{paciente}} foi avaliado(a) clinicamente nesta data " +
      "e encontra-se **apto(a)** à prática de atividade física regular, sem restrições identificadas " +
      "na avaliação realizada.\n\n" +
      "Recomenda-se progressão gradual de carga e acompanhamento por profissional de educação física.\n\n" +
      "Este atestado é válido por 12 meses a partir de {{data}}, salvo intercorrência clínica.",
  },
  {
    kind: "atestado",
    subkind: "medico",
    name: "Atestado — dispensa de educação física escolar",
    title: "Atestado médico",
    group: "Atestados",
    body:
      "Atesto, para os devidos fins escolares, que {{paciente}} esteve sob meus cuidados nesta data " +
      "e necessita de dispensa das aulas de educação física por {{dias}} dia(s) a partir de {{data}}, " +
      "por motivo de saúde.\n" +
      "{{motivo}}.\n\n" +
      "As demais atividades escolares podem ser mantidas normalmente.\n\n" +
      "CID: {{cid}}",
  },
  {
    kind: "atestado",
    subkind: "medico",
    name: "Atestado — retorno ao trabalho (apto)",
    title: "Atestado de aptidão",
    group: "Atestados",
    body:
      "Atesto, para os devidos fins, que {{paciente}} foi reavaliado(a) nesta data e encontra-se " +
      "**apto(a)** a retornar às suas atividades laborais a partir de {{data}}.\n" +
      "{{motivo}}.\n\n" +
      "CID: {{cid}}",
  },
  {
    kind: "atestado",
    subkind: "comparecimento",
    name: "Declaração de comparecimento — com horário",
    title: "Declaração de comparecimento",
    group: "Atestados",
    body:
      "Declaro, para os devidos fins, que {{paciente}} compareceu a este serviço em {{data}}, " +
      "das {{entrada}} às {{saida}}, para atendimento de saúde.",
  },
  {
    kind: "atestado",
    subkind: "comparecimento",
    name: "Declaração de comparecimento — sem horário",
    title: "Declaração de comparecimento",
    group: "Atestados",
    body:
      "Declaro, para os devidos fins, que {{paciente}} compareceu a este serviço em {{data_extenso}} " +
      "para atendimento de saúde.",
  },
  {
    kind: "atestado",
    subkind: "acompanhante",
    name: "Declaração de acompanhante",
    title: "Declaração de acompanhante",
    group: "Atestados",
    body:
      "Declaro, para os devidos fins, que {{acompanhante}} esteve neste serviço em {{data}}, " +
      "das {{entrada}} às {{saida}}, acompanhando o(a) paciente {{paciente}} em atendimento de saúde.",
  },
];
