/**
 * Regras da importação em lote, sem banco: conferir e limpar cada paciente do
 * arquivo normalizado e achar duplicados (dentro do arquivo e contra quem já
 * está no Renova). O run.mjs usa isto antes de escrever qualquer coisa.
 *
 * Arquivo normalizado (montado a partir do export do outro sistema):
 *   { "batch": "dr-fulano-2026-10", "professional_id": 2,
 *     "patients": [ { "ref": "id no sistema de origem", "name": "...", "cpf": "...",
 *       "birth_date": "AAAA-MM-DD", "sex", "phone", "email", "insurance",
 *       "insurance_number", "city", "notes", "allergies", "medications",
 *       "existing_id": 12,            // opcional: juntar a um paciente que já existe
 *       "encounters": [ { "date": "AAAA-MM-DD", "complaint", "anamnesis", "exam",
 *         "diagnosis", "plan", "prescription" } ] } ] }
 */

export const PATIENT_FIELDS = [
  "name", "social_name", "cpf", "birth_date", "sex", "phone", "email",
  "insurance", "insurance_number", "city", "notes", "allergies", "medications",
];
export const ENCOUNTER_FIELDS = ["complaint", "anamnesis", "exam", "diagnosis", "plan", "prescription"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const digits = (value) => String(value ?? "").replace(/\D/g, "");

/** CPF com os dois dígitos verificadores corretos. */
export function validCpf(value) {
  const d = digits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

export function formatCpf(value) {
  const d = digits(value);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** "31/12/1980", "1980-12-31" ou "31-12-1980" → "1980-12-31"; data impossível → null. */
export function isoDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  let y, m, d;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) [, y, m, d] = match;
  else if ((match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/))) [, d, m, y] = match;
  else return null;
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

/** Celular brasileiro como o Renova mostra: "(11) 98765-4321"; tira o 55 do país. */
export function formatPhone(value) {
  let d = digits(value);
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return null;
}

/** Nome sem espaços sobrando e sem acento/caixa, para comparar. */
export function nameKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const blank = (value) => value === undefined || value === null || String(value).trim() === "";

/**
 * Um paciente do arquivo → { patient, encounters, problems }. Campo duvidoso
 * não é inventado: vai vazio e o problema é anotado para a revisão.
 */
export function cleanPatient(raw, today) {
  const problems = [];
  const patient = {};
  for (const field of PATIENT_FIELDS) {
    if (!blank(raw[field])) patient[field] = String(raw[field]).replace(/\s+/g, " ").trim();
  }
  for (const field of ["notes", "allergies", "medications"]) {
    if (!blank(raw[field])) patient[field] = String(raw[field]).trim();
  }
  if (!patient.name) problems.push("sem nome");
  if (patient.cpf) {
    if (validCpf(patient.cpf)) patient.cpf = formatCpf(patient.cpf);
    else {
      problems.push(`CPF inválido (${patient.cpf}) — deixado vazio`);
      delete patient.cpf;
    }
  }
  if (patient.birth_date) {
    const iso = isoDate(patient.birth_date);
    if (iso && iso <= today && iso >= "1900-01-01") patient.birth_date = iso;
    else {
      problems.push(`nascimento inválido (${patient.birth_date}) — deixado vazio`);
      delete patient.birth_date;
    }
  }
  if (patient.phone) {
    const phone = formatPhone(patient.phone);
    if (phone) patient.phone = phone;
    else problems.push(`celular fora do padrão (${patient.phone}) — mantido como veio`);
  }
  if (patient.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patient.email)) {
    problems.push(`e-mail inválido (${patient.email}) — deixado vazio`);
    delete patient.email;
  }

  const encounters = [];
  for (const [i, e] of (raw.encounters ?? []).entries()) {
    const date = isoDate(e.date);
    const fields = Object.fromEntries(ENCOUNTER_FIELDS.filter((f) => !blank(e[f])).map((f) => [f, String(e[f]).trim()]));
    if (!Object.keys(fields).length) continue;
    if (!date || date > today) {
      problems.push(`atendimento ${i + 1}: data inválida (${e.date ?? "vazia"}) — não importado`);
      continue;
    }
    encounters.push({ date, ...fields });
  }
  return { ref: blank(raw.ref) ? null : String(raw.ref), existing_id: raw.existing_id ?? null, patient, encounters, problems };
}

/**
 * Agrupa quem parece ser a mesma pessoa: mesmo CPF, mesmo celular (9 últimos
 * dígitos) ou mesmo nome + nascimento. `others` são pacientes do Renova.
 */
export function findDuplicates(rows, others = []) {
  const keysOf = (p) => {
    const keys = [];
    if (p.cpf) keys.push(`cpf:${digits(p.cpf)}`);
    const phone = digits(p.phone).slice(-9);
    if (phone.length >= 8) keys.push(`tel:${phone}`);
    if (p.name && p.birth_date) keys.push(`nome:${nameKey(p.name)}|${p.birth_date}`);
    return keys;
  };
  const index = new Map();
  for (const other of others) for (const key of keysOf(other)) index.set(key, [...(index.get(key) ?? []), { renova: other.id }]);
  const inFile = new Map();
  rows.forEach((row, i) => {
    for (const key of keysOf(row.patient)) inFile.set(key, [...(inFile.get(key) ?? []), i]);
  });
  return rows.map((row, i) => {
    const keys = keysOf(row.patient);
    const renova = [...new Set(keys.flatMap((k) => (index.get(k) ?? []).map((m) => m.renova)))];
    const sameFile = [...new Set(keys.flatMap((k) => inFile.get(k) ?? []))].filter((j) => j !== i);
    return { renova, sameFile };
  });
}
