/**
 * Roteiros de atendimento: a estrutura do prontuário, não o seu conteúdo.
 *
 * O atendimento hoje é texto livre em queixa/anamnese/exame/hipótese/conduta.
 * Estes roteiros preenchem cada campo com **as perguntas a fazer**, nunca com
 * respostas — "Há quanto tempo?" em vez de "há 3 dias", "Ausculta:" em vez de
 * "murmúrio vesicular presente". O que o médico encontrou é ele quem escreve.
 *
 * É a mesma linha dos 49 modelos de documento: estrutura administrativa e
 * lembretes de coleta, sem conduta embutida.
 */

export interface EncounterTemplate {
  name: string;
  hint: string;
  complaint?: string;
  anamnesis?: string;
  exam?: string;
  diagnosis?: string;
  plan?: string;
}

const SINAIS = "PA:        FC:        FR:        Tax:        SatO2:        Peso:        Altura:";

export const ENCOUNTER_TEMPLATES: readonly EncounterTemplate[] = [
  {
    name: "Consulta geral (adulto)",
    hint: "Roteiro padrão de primeira consulta",
    complaint: "",
    anamnesis:
      "História da doença atual:\n" +
      "- Início e evolução:\n" +
      "- Fatores de melhora e piora:\n" +
      "- Sintomas associados:\n\n" +
      "Antecedentes pessoais:\n" +
      "Medicamentos em uso:\n" +
      "Alergias:\n" +
      "Cirurgias prévias:\n" +
      "Antecedentes familiares:\n" +
      "Hábitos (tabagismo, álcool, atividade física, sono):",
    exam: `Estado geral:\n${SINAIS}\n\nExame físico dirigido:`,
    diagnosis: "Hipótese diagnóstica:\nCID:",
    plan: "Conduta:\nExames solicitados:\nRetorno:",
  },
  {
    name: "Retorno / seguimento",
    hint: "Paciente já em acompanhamento",
    complaint: "Retorno de acompanhamento.",
    anamnesis:
      "Evolução desde a última consulta:\n" +
      "Adesão ao tratamento:\n" +
      "Efeitos adversos referidos:\n" +
      "Exames trazidos:",
    exam: `${SINAIS}\n\nExame dirigido:`,
    diagnosis: "Diagnóstico em acompanhamento:\nCID:",
    plan: "Ajuste de conduta:\nRetorno:",
  },
  {
    name: "Queixa respiratória",
    hint: "Tosse, febre, falta de ar",
    anamnesis:
      "Tempo de sintomas:\n" +
      "Febre (temperatura aferida?):\n" +
      "Tosse (seca ou produtiva, aspecto):\n" +
      "Falta de ar (aos esforços, em repouso):\n" +
      "Dor torácica:\n" +
      "Contato com pessoa doente:\n" +
      "Vacinação em dia:\n" +
      "Comorbidades e tabagismo:",
    exam:
      `${SINAIS}\n\n` +
      "Orofaringe:\n" +
      "Ausculta pulmonar:\n" +
      "Ausculta cardíaca:\n" +
      "Esforço respiratório / uso de musculatura acessória:",
    diagnosis: "Hipótese diagnóstica:\nCID:",
    plan: "Conduta:\nSinais de alerta orientados ao paciente:\nRetorno:",
  },
  {
    name: "Dor abdominal",
    hint: "Queixa gastrointestinal aguda",
    anamnesis:
      "Localização e irradiação:\n" +
      "Tempo de evolução e caráter da dor:\n" +
      "Relação com alimentação:\n" +
      "Náusea, vômito, diarreia, constipação:\n" +
      "Febre:\n" +
      "Hábito intestinal e urinário:\n" +
      "Última menstruação (se aplicável):\n" +
      "Cirurgias abdominais prévias:",
    exam:
      `${SINAIS}\n\n` +
      "Inspeção:\n" +
      "Ausculta de ruídos hidroaéreos:\n" +
      "Palpação (dor, massas, defesa, descompressão):\n" +
      "Sinais específicos pesquisados:",
    diagnosis: "Hipótese diagnóstica:\nCID:",
    plan: "Conduta:\nExames solicitados:\nSinais de alerta orientados:\nRetorno:",
  },
  {
    name: "Hipertensão / cardiovascular",
    hint: "Seguimento de risco cardiovascular",
    anamnesis:
      "Tempo de diagnóstico:\n" +
      "Medicamentos em uso e adesão:\n" +
      "Medidas de pressão em casa:\n" +
      "Sintomas (dor torácica, dispneia, palpitação, edema):\n" +
      "Hábitos (sal, álcool, tabagismo, atividade física):\n" +
      "Comorbidades e antecedentes familiares:",
    exam: `${SINAIS}\n\nAusculta cardíaca:\nAusculta pulmonar:\nPulsos periféricos:\nEdema:`,
    diagnosis: "Diagnóstico:\nCID:\nEstratificação de risco:",
    plan: "Conduta:\nExames solicitados:\nMetas combinadas com o paciente:\nRetorno:",
  },
  {
    name: "Saúde mental",
    hint: "Ansiedade, humor, sono",
    anamnesis:
      "Queixa principal e tempo de evolução:\n" +
      "Sono:\n" +
      "Apetite e peso:\n" +
      "Humor e interesse nas atividades:\n" +
      "Impacto no trabalho, estudo e relações:\n" +
      "Uso de álcool e outras substâncias:\n" +
      "Tratamentos anteriores:\n" +
      "Rede de apoio:\n" +
      "Ideação de autoagressão (pesquisada ativamente):",
    exam: "Apresentação e contato:\nDiscurso e pensamento:\nHumor e afeto:\nJuízo crítico:",
    diagnosis: "Hipótese diagnóstica:\nCID:",
    plan: "Conduta:\nEncaminhamentos:\nOrientação de crise (CVV 188) entregue:\nRetorno:",
  },
  {
    name: "Consulta pediátrica",
    hint: "Puericultura e queixa aguda",
    anamnesis:
      "Acompanhante e grau de parentesco:\n" +
      "Queixa e tempo de evolução:\n" +
      "Aceitação alimentar e hidratação:\n" +
      "Diurese e evacuações:\n" +
      "Febre (aferida?):\n" +
      "Vacinação em dia:\n" +
      "Marcos do desenvolvimento:\n" +
      "Frequenta creche/escola:",
    exam:
      "Peso:        Estatura:        Perímetro cefálico:\n" +
      `${SINAIS}\n\n` +
      "Estado geral, hidratação e atividade:\n" +
      "Orofaringe e otoscopia:\n" +
      "Ausculta pulmonar e cardíaca:\n" +
      "Abdome:\n" +
      "Pele:",
    diagnosis: "Hipótese diagnóstica:\nCID:",
    plan: "Conduta:\nSinais de alerta orientados aos responsáveis:\nRetorno:",
  },
  {
    name: "Pré-natal",
    hint: "Consulta de acompanhamento gestacional",
    anamnesis:
      "Idade gestacional (DUM e/ou ultrassom):\n" +
      "Gesta / Para / Aborto:\n" +
      "Queixas do período:\n" +
      "Movimentação fetal:\n" +
      "Perdas (sangue, líquido):\n" +
      "Medicamentos e suplementos em uso:\n" +
      "Exames do pré-natal trazidos:\n" +
      "Vacinação:",
    exam:
      `${SINAIS}\n\n` +
      "Altura uterina:\n" +
      "Batimentos cardiofetais:\n" +
      "Apresentação fetal:\n" +
      "Edema:",
    diagnosis: "Idade gestacional e classificação de risco:\nCID:",
    plan: "Conduta:\nExames solicitados:\nSinais de alerta orientados:\nPróxima consulta:",
  },
];

/** O roteiro entra em campo vazio; campo já escrito não é sobrescrito. */
export function applyEncounterTemplate(
  template: EncounterTemplate,
  current: { complaint?: string | null; anamnesis?: string | null; exam?: string | null; diagnosis?: string | null; plan?: string | null }
): { complaint: string; anamnesis: string; exam: string; diagnosis: string; plan: string } {
  const keep = (value: string | null | undefined, fallback: string | undefined) =>
    (value ?? "").trim() !== "" ? (value as string) : (fallback ?? "");

  return {
    complaint: keep(current.complaint, template.complaint),
    anamnesis: keep(current.anamnesis, template.anamnesis),
    exam: keep(current.exam, template.exam),
    diagnosis: keep(current.diagnosis, template.diagnosis),
    plan: keep(current.plan, template.plan),
  };
}
