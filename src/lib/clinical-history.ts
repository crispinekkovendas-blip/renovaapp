/**
 * Prontuário mais completo: a história clínica do paciente (antecedentes
 * pessoais, cirúrgicos, familiares, hábitos, gineco-obstétricos e vacinas) e
 * os sinais vitais de cada atendimento.
 *
 * A história fica num JSON só (`patients.clinical_history`, migração
 * 2026-10-19-prontuario-completo): cada seção é texto, um item por linha —
 * os atalhos ("HAS", "DM2"…) só acrescentam ou tiram linhas, e o médico
 * escreve o resto à vontade. Os sinais vitais ficam em `encounters.vitals`.
 */

export const HISTORY_SECTIONS = [
  {
    key: "pessoais",
    label: "Antecedentes patológicos pessoais",
    hint: "Doenças crônicas e prévias, com o ano ou há quanto tempo",
    shortcuts: [
      "Hipertensão arterial (HAS)",
      "Diabetes tipo 2 (DM2)",
      "Diabetes tipo 1 (DM1)",
      "Dislipidemia",
      "Obesidade",
      "Asma",
      "DPOC",
      "Hipotireoidismo",
      "Hipertireoidismo",
      "Depressão",
      "Ansiedade",
      "Insuficiência cardíaca",
      "Doença coronariana / infarto prévio",
      "Arritmia",
      "AVC prévio",
      "Doença renal crônica",
      "Epilepsia",
      "Enxaqueca",
      "Gastrite / DRGE",
      "Câncer",
      "HIV",
      "Hepatite",
    ],
  },
  {
    key: "cirurgicos",
    label: "Cirurgias e internações",
    hint: "Qual, quando e onde",
    shortcuts: ["Apendicectomia", "Colecistectomia", "Cesárea", "Histerectomia", "Hérnia", "Cirurgia cardíaca", "Cirurgia bariátrica", "Internação por COVID-19"],
  },
  {
    key: "familiares",
    label: "Antecedentes familiares",
    hint: "Doença e parentesco (ex.: mãe com DM2)",
    shortcuts: ["HAS na família", "DM na família", "Doença cardíaca precoce na família", "AVC na família", "Câncer na família", "Doença psiquiátrica na família", "Demência na família"],
  },
  {
    key: "habitos",
    label: "Hábitos de vida",
    hint: "Fumo (maços-ano), álcool, atividade física, sono, alimentação",
    shortcuts: ["Tabagista", "Ex-tabagista", "Nunca fumou", "Etilismo social", "Etilismo", "Nega etilismo", "Sedentário", "Atividade física regular", "Uso de drogas ilícitas"],
  },
  {
    key: "gineco",
    label: "Gineco-obstétricos",
    hint: "Gestações e partos (G P A), DUM, menopausa, contracepção",
    shortcuts: ["Nuligesta", "Menopausa", "Anticoncepcional oral", "DIU", "Gestante", "Amamentando"],
  },
  {
    key: "vacinas",
    label: "Vacinação",
    hint: "Doses e datas que o paciente souber",
    shortcuts: ["Calendário vacinal em dia", "Influenza neste ano", "COVID-19", "Hepatite B", "Tétano (dT) nos últimos 10 anos", "HPV", "Febre amarela"],
  },
] as const;

export type HistoryKey = (typeof HISTORY_SECTIONS)[number]["key"];
export type ClinicalHistory = Partial<Record<HistoryKey, string>>;

const HISTORY_KEYS = new Set<string>(HISTORY_SECTIONS.map((s) => s.key));
const MAX_SECTION = 4000;

export function parseHistory(raw: string | null | undefined): ClinicalHistory {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data).filter(([k, v]) => HISTORY_KEYS.has(k) && typeof v === "string" && v.trim()),
    ) as ClinicalHistory;
  } catch {
    return {};
  }
}

/** Seções vazias somem; sem nada, null (a coluna fica vazia). */
export function serializeHistory(history: ClinicalHistory): string | null {
  const clean = Object.fromEntries(
    HISTORY_SECTIONS.map((s) => [s.key, cleanLines(history[s.key] ?? "").slice(0, MAX_SECTION)]).filter(([, v]) => v),
  );
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
}

/** Uma linha por item, sem linhas vazias nem repetidas. */
export function cleanLines(text: string): string {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()))
    .join("\n");
}

/** O atalho já está numa linha da seção? */
export function hasLine(text: string, line: string): boolean {
  return text.split(/\r?\n/).some((l) => l.trim().toLowerCase() === line.toLowerCase());
}

/** Atalho: acrescenta a linha; se já estava, tira. */
export function toggleLine(text: string, line: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const kept = lines.filter((l) => l.trim().toLowerCase() !== line.toLowerCase());
  return (kept.length === lines.length ? [...lines, line] : kept).join("\n");
}

/** As doenças crônicas do paciente, para a faixa do alto do prontuário. */
export function conditionsOf(history: ClinicalHistory): string[] {
  return cleanLines(history.pessoais ?? "").split("\n").filter(Boolean);
}

/* ---------- Sinais vitais ---------- */

export const VITALS = [
  { key: "pa", label: "PA", unit: "mmHg", placeholder: "120/80", inputMode: "text" },
  { key: "fc", label: "FC", unit: "bpm", placeholder: "72", inputMode: "numeric" },
  { key: "fr", label: "FR", unit: "irpm", placeholder: "16", inputMode: "numeric" },
  { key: "temp", label: "Temp.", unit: "°C", placeholder: "36,5", inputMode: "decimal" },
  { key: "spo2", label: "SpO₂", unit: "%", placeholder: "98", inputMode: "numeric" },
  { key: "peso", label: "Peso", unit: "kg", placeholder: "70", inputMode: "decimal" },
  { key: "altura", label: "Altura", unit: "cm", placeholder: "170", inputMode: "decimal" },
  { key: "glicemia", label: "Glicemia", unit: "mg/dL", placeholder: "95", inputMode: "numeric" },
] as const;

export type VitalKey = (typeof VITALS)[number]["key"];
export type Vitals = Partial<Record<Exclude<VitalKey, "pa">, number>> & { pa?: string };

/** Faixas possíveis (fora disso é erro de digitação, não paciente). */
const RANGES: Record<Exclude<VitalKey, "pa">, [number, number]> = {
  fc: [20, 250],
  fr: [4, 80],
  temp: [30, 44],
  spo2: [40, 100],
  peso: [0.3, 400],
  altura: [30, 250],
  glicemia: [10, 1500],
};

const toNumber = (raw: string) => Number(raw.trim().replace(",", "."));

/**
 * Os campos do formulário → sinais vitais válidos. Fora da faixa possível o
 * campo é descartado e anotado em `rejected`, para avisar quem digitou.
 * Altura em metros (1,70) vira centímetros.
 */
export function readVitals(input: Partial<Record<VitalKey, string>>): { vitals: Vitals; rejected: VitalKey[] } {
  const vitals: Vitals = {};
  const rejected: VitalKey[] = [];
  const pa = (input.pa ?? "").replace(/\s/g, "");
  if (pa) {
    const m = pa.match(/^(\d{2,3})[/x×](\d{2,3})$/i);
    if (m && +m[1] >= 50 && +m[1] <= 300 && +m[2] >= 20 && +m[2] <= 200 && +m[1] > +m[2]) vitals.pa = `${+m[1]}/${+m[2]}`;
    else rejected.push("pa");
  }
  for (const key of Object.keys(RANGES) as Exclude<VitalKey, "pa">[]) {
    const raw = (input[key] ?? "").trim();
    if (!raw) continue;
    let n = toNumber(raw);
    if (key === "altura" && n > 0 && n < 3) n = Math.round(n * 100);
    const [min, max] = RANGES[key];
    if (Number.isFinite(n) && n >= min && n <= max) vitals[key] = n;
    else rejected.push(key);
  }
  return { vitals, rejected };
}

export function parseVitals(raw: string | null | undefined): Vitals {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: Vitals = {};
    if (typeof data.pa === "string") out.pa = data.pa;
    for (const key of Object.keys(RANGES) as Exclude<VitalKey, "pa">[]) {
      if (typeof data[key] === "number") out[key] = data[key] as number;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeVitals(vitals: Vitals): string | null {
  return Object.keys(vitals).length ? JSON.stringify(vitals) : null;
}

/** IMC com uma casa, quando há peso e altura. */
export function bmi(vitals: Vitals): number | null {
  if (!vitals.peso || !vitals.altura) return null;
  const m = vitals.altura / 100;
  return Math.round((vitals.peso / (m * m)) * 10) / 10;
}

const br = (n: number) => String(n).replace(".", ",");

/** "PA 120/80 mmHg · FC 72 bpm · … · IMC 24,2", na ordem da ficha. */
export function formatVitals(vitals: Vitals): string {
  const parts: string[] = VITALS.flatMap((v) => {
    const value = vitals[v.key];
    return value === undefined ? [] : [`${v.label} ${typeof value === "number" ? br(value) : value} ${v.unit}`];
  });
  const imc = bmi(vitals);
  if (imc) parts.push(`IMC ${br(imc)}`);
  return parts.join(" · ");
}

/**
 * O que merece atenção nos sinais vitais — alerta para o médico olhar, não
 * diagnóstico (limiares de triagem de adulto).
 */
export function vitalAlerts(vitals: Vitals): string[] {
  const out: string[] = [];
  if (vitals.pa) {
    const [s, d] = vitals.pa.split("/").map(Number);
    if (s >= 180 || d >= 120) out.push("PA muito elevada");
    else if (s >= 140 || d >= 90) out.push("PA elevada");
    else if (s < 90) out.push("PA baixa");
  }
  if (vitals.fc !== undefined) {
    if (vitals.fc > 100) out.push("Taquicardia");
    else if (vitals.fc < 50) out.push("Bradicardia");
  }
  if (vitals.fr !== undefined && vitals.fr > 24) out.push("Taquipneia");
  if (vitals.temp !== undefined) {
    if (vitals.temp >= 37.8) out.push("Febre");
    else if (vitals.temp < 35) out.push("Hipotermia");
  }
  if (vitals.spo2 !== undefined && vitals.spo2 < 94) out.push("Saturação baixa");
  if (vitals.glicemia !== undefined) {
    if (vitals.glicemia < 70) out.push("Hipoglicemia");
    else if (vitals.glicemia >= 200) out.push("Glicemia elevada");
  }
  const imc = bmi(vitals);
  if (imc !== null) {
    if (imc >= 30) out.push("Obesidade (IMC ≥ 30)");
    else if (imc < 18.5) out.push("Baixo peso (IMC < 18,5)");
  }
  return out;
}
