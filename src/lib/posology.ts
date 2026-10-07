/**
 * Frases de posologia prontas, para o médico não redigitar o que escreve
 * dezenas de vezes por dia.
 *
 * São **frases**, não condutas: nenhuma menciona medicamento, dose ou
 * indicação. "De 8 em 8 horas por 7 dias" não sugere o que dar nem para quê —
 * quem escolhe o medicamento e a dose é quem assina. É por isso que aqui cabe
 * conteúdo pronto e nos protocolos de medicamento não.
 *
 * `{n}` é substituído pela quantidade ao aplicar.
 */

export interface PosologyGroup {
  label: string;
  phrases: readonly string[];
}

export const POSOLOGY_GROUPS: readonly PosologyGroup[] = [
  {
    label: "Comprimidos e cápsulas",
    phrases: [
      "Tomar 1 comprimido de 12 em 12 horas por 7 dias",
      "Tomar 1 comprimido de 8 em 8 horas por 7 dias",
      "Tomar 1 comprimido de 6 em 6 horas se dor, por até 3 dias",
      "Tomar 1 comprimido ao dia, pela manhã, uso contínuo",
      "Tomar 1 comprimido ao dia, à noite, uso contínuo",
      "Tomar 1 cápsula ao dia, em jejum, 30 minutos antes do café da manhã",
      "Tomar 1 comprimido ao dia por 30 dias",
    ],
  },
  {
    label: "Se necessário",
    phrases: [
      "Tomar 1 comprimido se dor, respeitando intervalo mínimo de 6 horas",
      "Tomar 1 comprimido se febre acima de 37,8 °C, até 4 vezes ao dia",
      "Tomar 1 comprimido se náusea, até 3 vezes ao dia",
      "Usar se falta de ar, respeitando intervalo mínimo de 4 horas",
    ],
  },
  {
    label: "Líquidos e suspensões",
    phrases: [
      "Tomar {n} mL de 8 em 8 horas por 7 dias",
      "Tomar {n} mL de 12 em 12 horas por 10 dias",
      "Tomar {n} gotas de 8 em 8 horas se dor",
      "Agitar antes de usar. Tomar {n} mL ao dia, pela manhã",
    ],
  },
  {
    label: "Uso externo",
    phrases: [
      "Aplicar fina camada na região afetada, 2 vezes ao dia, por 7 dias",
      "Aplicar na região afetada após higiene, 1 vez ao dia, à noite",
      "Instilar 1 gota em cada olho, de 8 em 8 horas, por 5 dias",
      "Instilar {n} gotas no ouvido afetado, de 12 em 12 horas",
      "Aplicar no couro cabeludo e deixar agir por 5 minutos antes de enxaguar",
    ],
  },
  {
    label: "Inalatórios e nasais",
    phrases: [
      "Inalar 1 jato em cada narina, 1 vez ao dia, pela manhã",
      "Inalar {n} jatos, de 12 em 12 horas, uso contínuo",
      "Inalar {n} jatos se falta de ar, até 4 vezes ao dia",
      "Lavar as narinas com soro fisiológico antes de aplicar",
    ],
  },
  {
    label: "Observações que se acrescentam",
    phrases: [
      "Tomar após as refeições",
      "Tomar com bastante água",
      "Não interromper antes do fim do tratamento, mesmo com melhora",
      "Evitar bebida alcoólica durante o tratamento",
      "Retornar para reavaliação ao término do tratamento",
    ],
  },
];

/** Todas as frases, sem os grupos. */
export function allPhrases(): string[] {
  return POSOLOGY_GROUPS.flatMap((group) => [...group.phrases]);
}

/**
 * Troca `{n}` pela quantidade. Sem quantidade, o marcador vira "___" para o
 * médico completar — deixar "{n}" impresso numa receita seria pior.
 */
export function applyPhrase(phrase: string, amount?: string | number | null): string {
  const value = amount === null || amount === undefined || `${amount}`.trim() === "" ? "___" : `${amount}`.trim();
  return phrase.replace(/\{n\}/g, value);
}

/** Acrescenta uma observação a uma posologia já escrita, sem duplicar ponto. */
export function appendNote(posology: string, note: string): string {
  const base = posology.trim().replace(/[.\s]+$/, "");
  if (!base) return note;
  if (base.toLowerCase().includes(note.toLowerCase())) return base;
  return `${base}. ${note}`;
}
