/**
 * Um tópico do Guia de ortopedia: a condição como chega ao ambulatório, na
 * ordem em que o médico atende — o que perguntar, o que examinar, o que é
 * alarme, o que pedir de imagem, a conduta, a receita, a imobilização,
 * quando encaminhar e quantos dias de atestado.
 */
export interface OrthoExam {
  /** Nome da manobra ("Lachman"). */
  name: string;
  /** Como fazer, em uma ou duas frases. */
  how: string;
  /** O que significa quando é positiva. */
  positive: string;
}

export interface OrthoRx {
  /** Medicamento e apresentação ("Naproxeno 500 mg"). */
  name: string;
  posology: string;
  /** Cuidado ou condição de uso. */
  note?: string;
}

export interface OrthoTopic {
  slug: string;
  title: string;
  /** Como o paciente fala e outros nomes ("joelho travando", "tendinite do ombro"). */
  aliases: string[];
  cid: string;
  /** Uma linha: o que é e o que decide a conduta. */
  summary: string;
  /** Anamnese dirigida: o que perguntar. */
  ask: string[];
  /** Exame físico: manobras, em ordem. */
  exam: OrthoExam[];
  /** Sinais de alarme e o que fazer com cada um. */
  alarm: string[];
  /** Imagem: quando pedir e como escrever o pedido. */
  imaging: string[];
  /** Conduta não medicamentosa e orientação. */
  plan: string[];
  /** Receita de adulto sem comorbidade. */
  rx: OrthoRx[];
  /** Imobilização ou órtese, quando cabe. */
  immobilize?: string[];
  /** Quando encaminhar ao ortopedista ou à cirurgia. */
  refer: string[];
  /** Atestado: dias sugeridos. */
  leave: string;
  /** Retorno. */
  followup: string;
  /** Bizus. */
  pearls?: string[];
  /** Diretrizes e referências em que o texto se baseia. */
  sources: string[];
}

export interface OrthoChapter {
  title: string;
  /** Uma linha sobre o capítulo, para o índice. */
  intro: string;
  topics: OrthoTopic[];
}
