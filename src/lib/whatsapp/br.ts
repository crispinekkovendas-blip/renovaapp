/**
 * Dados brasileiros que a triagem pelo WhatsApp recebe em texto livre: CPF,
 * data de nascimento e celular. Mesmas regras de scripts/import/normalize.mjs.
 */

export const digits = (value: unknown): string => String(value ?? "").replace(/\D/g, "");

/** CPF com os dois dígitos verificadores corretos. */
export function validCpf(value: unknown): boolean {
  const d = digits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

export function formatCpf(value: unknown): string {
  const d = digits(value);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** "31/12/1980", "1980-12-31" ou "31-12-1980" → "1980-12-31"; data impossível ou futura → null. */
export function isoDate(value: unknown): string | null {
  const text = String(value ?? "").trim();
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let y: string, mo: string, d: string;
  if (m) [, y, mo, d] = m;
  else if ((m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/))) [, d, mo, y] = m;
  else return null;
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  if (date.getTime() > Date.now() || Number(y) < 1900) return null;
  return iso;
}

/** Celular como o Renova mostra: "(11) 98765-4321"; tira o 55 do país. */
export function formatPhone(value: unknown): string | null {
  let d = digits(value);
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return null;
}

/**
 * As formas do mesmo celular no banco: com e sem o 55, com e sem o nono
 * dígito (o WhatsApp entrega números antigos sem ele). Para achar o paciente.
 */
export function phoneVariants(value: unknown): string[] {
  let d = digits(value);
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  const out = new Set<string>();
  if (d.length === 10) out.add(d).add(`${d.slice(0, 2)}9${d.slice(2)}`);
  else if (d.length === 11) {
    out.add(d);
    if (d[2] === "9") out.add(`${d.slice(0, 2)}${d.slice(3)}`);
  }
  return [...out];
}
