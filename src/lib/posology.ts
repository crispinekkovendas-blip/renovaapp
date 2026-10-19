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
 *
 * As frases de comprimido servem a toda forma sólida: `adaptPhrase`
 * (dosage-form.ts) troca "comprimido" por "cápsula", "drágea" ou "sachê"
 * conforme o item. `forms` diz a que formas o grupo serve (para vir primeiro).
 */
import { adaptPhrase, type DosageForm } from "./dosage-form.ts";

export interface PosologyGroup {
  label: string;
  phrases: readonly string[];
  /** As formas a que o grupo serve; sem `forms`, serve a todas (observações). */
  forms?: readonly DosageForm[];
}

const SOLIDS: readonly DosageForm[] = ["comprimido", "capsula", "dragea", "sache"];

export const POSOLOGY_GROUPS: readonly PosologyGroup[] = [
  {
    label: "Comprimidos e cápsulas",
    forms: SOLIDS,
    phrases: [
      "Tomar 1 comprimido de 12 em 12 horas por 7 dias",
      "Tomar 1 comprimido de 8 em 8 horas por 7 dias",
      "Tomar 1 comprimido de 6 em 6 horas se dor, por até 3 dias",
      "Tomar 1 comprimido ao dia, pela manhã, uso contínuo",
      "Tomar 1 comprimido ao dia, à noite, uso contínuo",
      "Tomar 1 cápsula ao dia, em jejum, 30 minutos antes do café da manhã",
      "Tomar 1 comprimido ao dia por 30 dias",
      "Tomar 1 comprimido de 24 em 24 horas por 5 dias",
      "Tomar 1 comprimido 2 vezes ao dia por 14 dias",
      "Tomar 2 comprimidos em dose única",
      "Tomar 1 comprimido ao dia, em jejum",
      "Tomar meio comprimido ao dia, pela manhã, uso contínuo",
      "Tomar 1 comprimido 1 vez por semana, sempre no mesmo dia",
      "Mastigar 1 comprimido ao dia",
      "Dissolver 1 sachê em meio copo de água e tomar 1 vez ao dia",
    ],
  },
  {
    label: "Se necessário",
    forms: SOLIDS,
    phrases: [
      "Tomar 1 comprimido se dor, respeitando intervalo mínimo de 6 horas",
      "Tomar 1 comprimido se febre acima de 37,8 °C, até 4 vezes ao dia",
      "Tomar 1 comprimido se náusea, até 3 vezes ao dia",
      "Tomar 1 comprimido se cólica, até 3 vezes ao dia",
      "Tomar 1 comprimido se coceira, até 2 vezes ao dia",
    ],
  },
  {
    label: "Gotas",
    forms: ["gotas"],
    phrases: [
      "Tomar {n} gotas de 6 em 6 horas se dor ou febre",
      "Tomar {n} gotas de 8 em 8 horas por 5 dias",
      "Tomar {n} gotas ao dia, uso contínuo",
      "Diluir {n} gotas em um pouco de água e tomar de 8 em 8 horas",
    ],
  },
  {
    label: "Líquidos e suspensões",
    forms: ["liquido"],
    phrases: [
      "Tomar {n} mL de 8 em 8 horas por 7 dias",
      "Tomar {n} mL de 12 em 12 horas por 10 dias",
      "Tomar {n} gotas de 8 em 8 horas se dor",
      "Agitar antes de usar. Tomar {n} mL ao dia, pela manhã",
      "Tomar {n} mL de 6 em 6 horas se dor ou febre",
      "Tomar {n} mL de 12 em 12 horas por 7 dias. Manter na geladeira após aberto",
    ],
  },
  {
    label: "Uso externo",
    forms: ["topico", "colirio", "adesivo"],
    phrases: [
      "Aplicar fina camada na região afetada, 2 vezes ao dia, por 7 dias",
      "Aplicar na região afetada após higiene, 1 vez ao dia, à noite",
      "Instilar 1 gota em cada olho, de 8 em 8 horas, por 5 dias",
      "Instilar {n} gotas no ouvido afetado, de 12 em 12 horas",
      "Aplicar no couro cabeludo e deixar agir por 5 minutos antes de enxaguar",
      "Aplicar na região afetada 3 vezes ao dia até a cicatrização",
      "Instilar 1 gota no olho afetado, de 6 em 6 horas, por 7 dias",
      "Aplicar 1 adesivo na pele limpa e seca, trocando a cada 24 horas e alternando o local",
    ],
  },
  {
    label: "Inalatórios e nasais",
    forms: ["nasal", "inalatorio"],
    phrases: [
      "Inalar 1 jato em cada narina, 1 vez ao dia, pela manhã",
      "Inalar {n} jatos, de 12 em 12 horas, uso contínuo",
      "Inalar {n} jatos se falta de ar, até 4 vezes ao dia",
      "Lavar as narinas com soro fisiológico antes de aplicar",
      "Usar se falta de ar, respeitando intervalo mínimo de 4 horas",
      "Inalar 1 jato com espaçador, de 12 em 12 horas, e enxaguar a boca depois",
      "Aplicar 2 jatos em cada narina, 1 vez ao dia",
    ],
  },
  {
    label: "Injetáveis",
    forms: ["injetavel"],
    phrases: [
      "Aplicar 1 ampola por via intramuscular, dose única",
      "Aplicar 1 ampola por via intramuscular, 1 vez por semana",
      "Aplicar {n} por via subcutânea, 1 vez por semana, sempre no mesmo dia",
      "Aplicar {n} por via subcutânea, 1 vez ao dia",
      "Aplicar no abdome, coxa ou braço, alternando o local a cada aplicação",
      "Manter na geladeira (2 a 8 °C), sem congelar",
    ],
  },
  {
    label: "Supositórios e óvulos",
    forms: ["supositorio", "ovulo"],
    phrases: [
      "Introduzir 1 óvulo via vaginal à noite, ao deitar, por 7 dias",
      "Aplicar 1 aplicador cheio via vaginal à noite, por 7 dias",
      "Introduzir 1 supositório via retal se febre, até de 6 em 6 horas",
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
      "Tomar em jejum, 30 minutos antes do café da manhã",
      "Tomar junto com a refeição",
      "Pode causar sonolência: evitar dirigir",
      "Suspender e procurar atendimento se manchas na pele, inchaço ou falta de ar",
      "Proteger da luz e do calor",
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

/**
 * Os grupos na ordem que serve ao item: primeiro os da forma dele, depois os
 * outros e, por último, as observações (que servem a todos). Cada frase já
 * vem na forma do item ("1 cápsula", não "1 comprimido").
 */
export function phraseGroupsFor(form: DosageForm | null): PosologyGroup[] {
  const fits = (g: PosologyGroup) => Boolean(form && g.forms?.includes(form));
  const general = POSOLOGY_GROUPS.filter((g) => !g.forms);
  const ordered = [...POSOLOGY_GROUPS.filter(fits), ...POSOLOGY_GROUPS.filter((g) => g.forms && !fits(g)), ...general];
  return ordered.map((g) => ({ ...g, phrases: g.phrases.map((p) => adaptPhrase(p, form)) }));
}

const trimEnd = (text: string) => text.replace(/[.\s]+$/, "");

/** A frase já está escrita na posologia (inteira, sem diferenciar maiúsculas)? */
export function hasPhrase(posology: string, phrase: string): boolean {
  const text = trimEnd(applyPhrase(phrase)).toLowerCase();
  return text !== "" && posology.toLowerCase().includes(text);
}

/**
 * Frases prontas acumulam: a primeira escreve a posologia, as seguintes
 * entram depois dela ("…por 7 dias. Tomar após as refeições"). Tocar de novo
 * numa frase já escrita tira só ela.
 */
export function togglePhrase(posology: string, phrase: string): string {
  const text = trimEnd(applyPhrase(phrase));
  const current = posology.trim();
  if (!hasPhrase(current, phrase)) return appendNote(current, text);
  const at = current.toLowerCase().indexOf(text.toLowerCase());
  return trimEnd(`${current.slice(0, at)}${current.slice(at + text.length)}`)
    .replace(/^[.\s]+/, "")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}
