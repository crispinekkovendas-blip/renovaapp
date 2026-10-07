import { searchKey } from "./normalize.ts";

/**
 * CID-10 — a Classificação Internacional de Doenças, como o DATASUS publica.
 *
 * Fonte: `www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip`, que traz
 * 2.044 **categorias** (3 caracteres: `A00`) e 12.450 **subcategorias**
 * (4 caracteres: `A000`, que se escreve `A00.0`).
 *
 * Existe porque hoje o CID é digitado de cabeça em todo atestado,
 * encaminhamento e laudo — e um CID errado num atestado assinado vai para o
 * empregador ou para a perícia do INSS. Aqui é só codificação: nenhuma
 * decisão clínica, nenhuma sugestão de diagnóstico.
 */

export interface CidCode {
  /** Já formatado como se escreve: "A00" ou "A00.0". */
  code: string;
  description: string;
  /** "Capítulo I - Algumas doenças infecciosas e parasitárias". */
  chapter: string | null;
  /** "M" ou "F" quando o código só se aplica a um sexo; null quando a ambos. */
  sexRestriction: "M" | "F" | null;
  /** true para categoria (3 caracteres), false para subcategoria (4). */
  isCategory: boolean;
}

/**
 * O DATASUS grava a subcategoria sem o ponto (`A000`); a notação usada em
 * qualquer documento tem o ponto (`A00.0`). Categoria de 3 caracteres fica
 * como está.
 */
export function formatCidCode(raw: string): string {
  const clean = (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}.${clean.slice(3)}`;
}

/** O caminho de volta: "A00.0" → "A000", para casar com o dado cru. */
export function bareCidCode(code: string): string {
  return (code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Um CID válido é letra + 2 dígitos, com um 4º caractere opcional. */
export function isCidCode(value: string): boolean {
  return /^[A-Z]\d{2}(\.?[0-9A-Z])?$/.test((value ?? "").trim().toUpperCase());
}

/**
 * `"M"`/`"F"` do campo RESTRSEXO. O DATASUS usa 1 para masculino e 2 para
 * feminino em algumas versões e as próprias letras em outras; os dois são
 * aceitos, e qualquer outra coisa vira "sem restrição" — inventar restrição
 * esconderia um código legítimo da busca.
 */
export function parseSexRestriction(raw: string | null | undefined): "M" | "F" | null {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "M" || value === "1") return "M";
  if (value === "F" || value === "2") return "F";
  return null;
}

/** Como o código aparece numa lista ou no documento: "A00.0 — Cólera devida a…". */
export function cidLabel(cid: Pick<CidCode, "code" | "description">): string {
  return `${cid.code} — ${cid.description}`;
}

/**
 * O que vai gravado para busca: o código **sem ponto**, o código **com ponto**
 * e a descrição. Assim "A090", "A09.0" e "gastroenterite" encontram a mesma
 * linha.
 */
export function cidSearchKey(code: string, description: string): string {
  const bare = bareCidCode(code);
  return searchKey(`${bare} ${formatCidCode(bare)} ${description}`);
}

/**
 * Avisa quando o CID escolhido não combina com o sexo do paciente — por
 * exemplo um código de gestação numa ficha marcada como masculina.
 *
 * É aviso, nunca bloqueio: o cadastro pode estar desatualizado, e o nome
 * social e a identidade de gênero do paciente não são o que a CID-10
 * classifica. Quem decide é quem assina.
 */
export function sexMismatchWarning(
  cid: Pick<CidCode, "code" | "description" | "sexRestriction">,
  patientSex: string | null | undefined
): string | null {
  if (!cid.sexRestriction) return null;
  const sex = (patientSex ?? "").trim().toUpperCase().charAt(0);
  if (sex !== "M" && sex !== "F") return null;
  if (sex === cid.sexRestriction) return null;

  const esperado = cid.sexRestriction === "F" ? "feminino" : "masculino";
  return `${cid.code} é classificado para o sexo ${esperado}; confira se é mesmo o código pretendido.`;
}
