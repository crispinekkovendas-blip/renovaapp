/**
 * Valor monetário em reais por extenso (pt-BR), no formato usado em recibos:
 *   150000 → "mil e quinhentos reais"
 *   12050  → "cento e vinte reais e cinquenta centavos"
 * Suporta de 0 até 999.999.999,99.
 */

const UNIDADES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

export const MAX_CENTS = 99_999_999_999; // 999.999.999,99

/** 1–999 por extenso ("cem", "cento e um", "novecentos e noventa e nove"). */
function grupo(n: number): string {
  if (n === 100) return "cem";
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (centena) partes.push(CENTENAS[centena]);
  if (resto) {
    if (resto < 20) partes.push(UNIDADES[resto]);
    else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      partes.push(unidade ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena]);
    }
  }
  return partes.join(" e ");
}

/**
 * Inteiro 1–999.999.999 por extenso. O "e" só entra antes do último grupo
 * quando ele é menor que cem ou uma centena redonda ("mil e quinhentos",
 * "mil e um"); nos demais casos usa-se vírgula ("mil, duzentos e cinquenta").
 */
function inteiro(n: number): string {
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const grupos: { valor: number; texto: string }[] = [];
  if (milhoes) grupos.push({ valor: milhoes, texto: milhoes === 1 ? "um milhão" : `${grupo(milhoes)} milhões` });
  if (milhares) grupos.push({ valor: milhares, texto: milhares === 1 ? "mil" : `${grupo(milhares)} mil` });
  if (resto) grupos.push({ valor: resto, texto: grupo(resto) });

  return grupos.reduce((acc, g, i) => {
    if (i === 0) return g.texto;
    const ultimo = i === grupos.length - 1;
    const usaE = ultimo && (g.valor < 100 || g.valor % 100 === 0);
    return `${acc}${usaE ? " e " : ", "}${g.texto}`;
  }, "");
}

export function valorPorExtenso(cents: number): string {
  if (!Number.isFinite(cents)) throw new RangeError("Valor inválido para extenso.");
  const total = Math.round(cents);
  if (total < 0 || total > MAX_CENTS) throw new RangeError("Valor fora do intervalo suportado (0 a 999.999.999,99).");

  const reais = Math.floor(total / 100);
  const centavos = total % 100;

  if (reais === 0 && centavos === 0) return "zero reais";

  const partes: string[] = [];
  if (reais > 0) {
    const texto = inteiro(reais);
    if (reais === 1) partes.push("um real");
    else if (reais % 1_000_000 === 0) partes.push(`${texto} de reais`);
    else partes.push(`${texto} reais`);
  }
  if (centavos > 0) {
    partes.push(centavos === 1 ? "um centavo" : `${grupo(centavos)} centavos`);
  }
  return partes.join(" e ");
}
