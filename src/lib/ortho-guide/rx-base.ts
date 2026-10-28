/**
 * As receitas de base do Guia de ortopedia — compartilhadas pelos tópicos de
 * data.ts e dos capítulos do plantão (data-*.ts). Mudança aqui vale em todos
 * os tópicos que as usam: registre em revisions.ts com `alsoIn`.
 */

export const AINE_CUIDADO =
  "AINE por até 5–7 dias, com alimento. Evitar ou reduzir em: > 65 anos, doença renal, úlcera ou sangramento digestivo, insuficiência cardíaca, anticoagulante, AAS, corticoide, gestação (evitar a partir de 20 semanas; contraindicado no 3º trimestre — oligoâmnio e fechamento do canal arterial). Se for usar nesses casos, associar omeprazol 20 mg/dia.";

export const AINE_RX = [
  { name: "Naproxeno 500 mg", posology: "1 comprimido de 12/12 h, por 5 a 7 dias, após as refeições.", note: AINE_CUIDADO },
  { name: "Ibuprofeno 600 mg", posology: "1 comprimido de 8/8 h, por 5 a 7 dias, após as refeições.", note: "Alternativa ao naproxeno — não usar os dois." },
] as const;

export const ANALGESIA_BASE = [
  { name: "Dipirona 1 g", posology: "1 comprimido de 6/6 h se dor (máximo 4 g/dia)." },
  { name: "Paracetamol 750 mg", posology: "1 comprimido de 6/6 h se dor (máximo 3 g/dia; 2 g/dia em hepatopata ou etilista).", note: "Alternativa à dipirona, ou somar quando a dor não cede." },
] as const;

export const OMEPRAZOL = { name: "Omeprazol 20 mg", posology: "1 cápsula em jejum, pela manhã, enquanto usar o anti-inflamatório.", note: "Só quando há fator de risco gástrico (ver cuidado do AINE)." } as const;

export const CICLO = {
  name: "Ciclobenzaprina 5 mg",
  posology: "1 comprimido à noite por 5 a 7 dias; pode subir a 10 mg se tolerar.",
  note: "Dá sono e boca seca; evitar em idoso, glaucoma, arritmia e com outros sedativos. Não dirigir após a dose.",
} as const;

export const TRAMADOL = {
  name: "Tramadol 50 mg",
  posology: "1 comprimido de 8/8 h, por 3 a 5 dias, só se a dor não ceder com o resto.",
  note: "Lista A2 da Portaria 344 (tarja preta): até 100 mg por unidade sai em receita de controle especial em duas vias, não na notificação A. Náusea e tontura são comuns; cuidado em idoso, epilepsia e com antidepressivo (serotonina).",
} as const;

export const INSS = "Mais de 15 dias de afastamento de empregado com carteira: o INSS assume a partir do 16º — oriente a agendar a perícia pelo Meu INSS.";
