/**
 * Um tópico do Guia de ortopedia: a condição como chega ao plantão ou ao
 * ambulatório, na ordem em que o médico — que aqui É o ortopedista de
 * plantão e de ambulatório no SUS — atende: o que perguntar, o que examinar,
 * o que é alarme, o que pedir de imagem, o que fazer na urgência, o
 * procedimento (redução, tala, gesso, punção, infiltração), a conduta, a
 * receita, a imobilização, o seguimento no retorno, o que vai para a
 * cirurgia ou o centro terciário pela regulação, e quantos dias de atestado.
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

/** Um procedimento que o ortopedista de plantão faz no serviço: redução, tala, gesso, bloqueio, punção, infiltração. */
export interface OrthoProcedure {
  /** Nome e técnica ("Redução da luxação anterior do ombro — rotação externa"). */
  name: string;
  /** Quando fazer e quando não. */
  when: string;
  /** Material e anestesia. */
  needs: string;
  /** Passo a passo. */
  steps: string[];
  /** Depois: imobilização, raio-X de controle, o que anotar. */
  after: string;
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
  /** Na urgência: o que você, ortopedista de plantão, faz hoje com este paciente — e com que ele vai para casa, fica ou é transferido. */
  urgent: string[];
  /** Os procedimentos que você faz no serviço, passo a passo. */
  procedures?: OrthoProcedure[];
  /** Conduta não medicamentosa e orientação. */
  plan: string[];
  /** Receita de adulto sem comorbidade. */
  rx: OrthoRx[];
  /** Imobilização ou órtese, quando cabe. */
  immobilize?: string[];
  /** No retorno (ambulatório): o seguimento como ortopedista — controle, troca de gesso, quando indicar cirurgia. */
  clinic: string[];
  /** Cirurgia e regulação: o que sai da sua mão — cirurgião, centro terciário, outra especialidade — e com que urgência. */
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
