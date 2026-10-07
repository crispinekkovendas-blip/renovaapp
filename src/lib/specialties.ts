/**
 * Especialidades para o campo "Especialidade ou serviço" do encaminhamento
 * (sugestões de um datalist; o texto continua livre). As 55 especialidades
 * médicas reconhecidas pelo CFM mais os serviços de saúde para os quais uma
 * clínica costuma encaminhar. Sem banco, sem estado — só a lista.
 */

export const CFM_MEDICAL_SPECIALTIES: ReadonlyArray<string> = [
  "Acupuntura",
  "Alergia e Imunologia",
  "Anestesiologia",
  "Angiologia",
  "Cardiologia",
  "Cirurgia Cardiovascular",
  "Cirurgia da Mão",
  "Cirurgia de Cabeça e Pescoço",
  "Cirurgia do Aparelho Digestivo",
  "Cirurgia Geral",
  "Cirurgia Oncológica",
  "Cirurgia Pediátrica",
  "Cirurgia Plástica",
  "Cirurgia Torácica",
  "Cirurgia Vascular",
  "Clínica Médica",
  "Coloproctologia",
  "Dermatologia",
  "Endocrinologia e Metabologia",
  "Endoscopia",
  "Gastroenterologia",
  "Genética Médica",
  "Geriatria",
  "Ginecologia e Obstetrícia",
  "Hematologia e Hemoterapia",
  "Homeopatia",
  "Infectologia",
  "Mastologia",
  "Medicina de Emergência",
  "Medicina de Família e Comunidade",
  "Medicina do Trabalho",
  "Medicina de Tráfego",
  "Medicina Esportiva",
  "Medicina Física e Reabilitação",
  "Medicina Intensiva",
  "Medicina Legal e Perícia Médica",
  "Medicina Nuclear",
  "Medicina Preventiva e Social",
  "Nefrologia",
  "Neurocirurgia",
  "Neurologia",
  "Nutrologia",
  "Oftalmologia",
  "Oncologia Clínica",
  "Ortopedia e Traumatologia",
  "Otorrinolaringologia",
  "Patologia",
  "Patologia Clínica/Medicina Laboratorial",
  "Pediatria",
  "Pneumologia",
  "Psiquiatria",
  "Radiologia e Diagnóstico por Imagem",
  "Radioterapia",
  "Reumatologia",
  "Urologia",
];

/** Serviços não médicos que aparecem em encaminhamentos do dia a dia. */
export const OTHER_HEALTH_SERVICES: ReadonlyArray<string> = [
  "Fisioterapia",
  "Fonoaudiologia",
  "Nutrição",
  "Odontologia",
  "Psicologia",
  "Terapia Ocupacional",
];

/** Tudo junto, em ordem alfabética (pt-BR), sem repetição. */
export const CFM_SPECIALTIES: ReadonlyArray<string> = Array.from(
  new Set([...CFM_MEDICAL_SPECIALTIES, ...OTHER_HEALTH_SERVICES])
).sort((a, b) => a.localeCompare(b, "pt-BR"));
