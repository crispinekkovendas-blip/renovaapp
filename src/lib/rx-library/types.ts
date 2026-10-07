import type { Tarja } from "../medications.ts";
import type { Route } from "../prescription.ts";

/** Uma forma pronta de receitar uma apresentação: o que o clique preenche. */
export interface DoseOption {
  /** Rótulo curto do botão quando há mais de uma ("Dor ou febre", "Dose única"). */
  label?: string;
  posology: string;
  quantity: string;
  route: Route;
  continuous?: boolean;
}

/**
 * Uma apresentação do catálogo (substância + concentração) com as posologias
 * da bula para adulto.
 *
 * `substance` são as palavras que identificam cada componente, sem sal nem
 * hidratação: "amoxicilina" casa com "AMOXICILINA TRI-HIDRATADA", e
 * ["amoxicilina", "clavulanato"] só com a associação dos dois.
 */
export interface DoseEntry {
  /** Como sai na receita quando vem de uma receita pronta. */
  name: string;
  substance: readonly string[];
  /**
   * Concentração como a CMED escreve; é normalizada por `concKey`. Uma lista
   * quando o catálogo grafa a mesma apresentação de mais de um jeito (a
   * importação perde o milhar de "100.000 UI/ML", que chega como "100 UI/ML").
   */
  conc: string | readonly string[];
  /**
   * Tarja conferida no catálogo (a mais restritiva entre as apresentações que
   * casam). Só é usada nas receitas prontas; quem busca no catálogo recebe a
   * tarja do próprio catálogo.
   */
  tarja: Tarja;
  options: readonly DoseOption[];
}

/** Receita pronta por condição: uma lista de apresentações com a opção escolhida. */
export interface RxProtocol {
  name: string;
  /** CID-10 de referência, só para achar pela busca. */
  cid: string;
  group: RxProtocolGroup;
  items: readonly { dose: string; option?: number }[];
}

export const RX_PROTOCOL_GROUPS = [
  "Respiratório e ouvido",
  "Urinário e ginecológico",
  "Digestivo",
  "Dor e inflamação",
  "Pele",
  "Parasitoses",
  "Crônicas",
  "Outras",
] as const;
export type RxProtocolGroup = (typeof RX_PROTOCOL_GROUPS)[number];
