import type { LibraryTemplate } from "./types.ts";

/** Laudos e relatórios. */
export const RELATORIOS: readonly LibraryTemplate[] = [
  {
    kind: "laudo",
    name: "Relatório médico — geral",
    title: "Relatório médico",
    group: "Relatórios",
    body:
      "Relatório sobre {{paciente}}, atendido(a) em {{data}}.\n\n" +
      "CID: {{cid}}\n\n" +
      "Histórico:\n\n\n" +
      "Exame e resultados:\n\n\n" +
      "Conclusão:\n",
  },
  {
    kind: "laudo",
    name: "Relatório para perícia / INSS",
    title: "Relatório médico para perícia",
    group: "Relatórios",
    body:
      "Relatório médico referente a {{paciente}}, CPF {{cpf}}, para fins de avaliação pericial.\n\n" +
      "CID: {{cid}}\n\n" +
      "1. Início dos sintomas e evolução:\n\n\n" +
      "2. Exame físico e achados relevantes:\n\n\n" +
      "3. Exames complementares realizados:\n\n\n" +
      "4. Tratamentos instituídos e resposta:\n\n\n" +
      "5. Limitações funcionais observadas:\n\n\n" +
      "6. Prognóstico e tempo estimado de afastamento:\n\n\n" +
      "Documento emitido a pedido do(a) paciente, em {{data_extenso}}.",
  },
  {
    kind: "laudo",
    name: "Laudo — justificativa para plano de saúde",
    title: "Laudo médico",
    group: "Relatórios",
    body:
      "Laudo referente a {{paciente}}, CPF {{cpf}}.\n\n" +
      "CID: {{cid}}\n\n" +
      "Quadro clínico:\n\n\n" +
      "Exames que sustentam a indicação:\n\n\n" +
      "Procedimento / terapia solicitada:\n\n\n" +
      "Justificativa técnica da indicação:\n\n\n" +
      "Alternativas consideradas e por que não se aplicam:\n\n\n" +
      "Risco do não tratamento ou do adiamento:\n\n\n" +
      "Solicito a autorização do procedimento indicado.",
  },
  {
    kind: "laudo",
    name: "Relatório de alta",
    title: "Relatório de alta",
    group: "Relatórios",
    body:
      "Relatório de alta de {{paciente}}, em {{data_extenso}}.\n\n" +
      "CID: {{cid}}\n\n" +
      "Motivo do atendimento:\n\n\n" +
      "Evolução durante o acompanhamento:\n\n\n" +
      "Condição na alta:\n\n\n" +
      "Orientações e cuidados após a alta:\n\n\n" +
      "Retorno / seguimento recomendado:\n",
  },
  {
    kind: "laudo",
    name: "Relatório para a escola",
    title: "Relatório médico",
    group: "Relatórios",
    body:
      "Relatório sobre {{paciente}}, a pedido do(a) responsável, para fins escolares.\n\n" +
      "Condição de saúde relevante para o ambiente escolar:\n\n\n" +
      "Cuidados que a escola precisa conhecer:\n\n\n" +
      "Sinais que devem motivar contato com a família:\n\n\n" +
      "Adaptações recomendadas:\n\n\n" +
      "Permaneço à disposição da equipe escolar para esclarecimentos.\n\n" +
      "Emitido em {{data_extenso}}.",
  },
  {
    kind: "laudo",
    name: "Relatório — readequação de função no trabalho",
    title: "Relatório médico",
    group: "Relatórios",
    body:
      "Relatório sobre {{paciente}}, CPF {{cpf}}, para fins de readequação funcional.\n\n" +
      "CID: {{cid}}\n\n" +
      "Condição clínica:\n\n\n" +
      "Limitações funcionais objetivas:\n\n\n" +
      "Atividades que devem ser evitadas:\n\n\n" +
      "Atividades que podem ser mantidas:\n\n\n" +
      "Prazo sugerido para reavaliação:\n\n\n" +
      "Emitido a pedido do(a) paciente em {{data_extenso}}.",
  },
  {
    kind: "laudo",
    name: "Laudo — isenção de imposto por doença grave",
    title: "Laudo médico",
    group: "Relatórios",
    body:
      "Laudo referente a {{paciente}}, CPF {{cpf}}, para os fins previstos na Lei nº 7.713/1988 e " +
      "alterações posteriores.\n\n" +
      "CID: {{cid}}\n\n" +
      "Diagnóstico e enquadramento legal:\n\n\n" +
      "Data de início da doença (ou da constatação):\n\n\n" +
      "Exames e documentos que sustentam o diagnóstico:\n\n\n" +
      "Prazo de validade do laudo e necessidade de reavaliação:\n\n\n" +
      "Emitido a pedido do(a) paciente em {{data_extenso}}.",
  },
  {
    kind: "laudo",
    name: "Termo de consentimento informado",
    title: "Termo de consentimento livre e esclarecido",
    group: "Relatórios",
    body:
      "Eu, {{paciente}}, CPF {{cpf}}, declaro que fui informado(a) de forma clara sobre o " +
      "procedimento abaixo e que tive a oportunidade de fazer perguntas.\n\n" +
      "Procedimento proposto:\n\n\n" +
      "Por que está sendo indicado:\n\n\n" +
      "Como é realizado:\n\n\n" +
      "Benefícios esperados:\n\n\n" +
      "Riscos e efeitos possíveis:\n\n\n" +
      "Alternativas disponíveis, inclusive a de não realizar:\n\n\n" +
      "Estou ciente de que posso retirar este consentimento a qualquer momento, antes ou durante " +
      "o procedimento, sem prejuízo ao meu atendimento.\n\n" +
      "{{clinica}}, {{data_extenso}}.\n\n\n" +
      "_______________________________________\n" +
      "Assinatura do(a) paciente ou responsável",
  },
];
