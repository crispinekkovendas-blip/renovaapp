/**
 * Helpers puros da página pública da clínica (landing): resumo de horários,
 * convênios, mapa, nomes e o JSON-LD. Sem imports de propósito — este módulo
 * roda em `node --test` (ver clinic-public.test.mjs). As leituras do banco
 * ficam em `marketing-stats.ts`.
 */

/** Dia da semana 0 = domingo, como em `schedules.weekday`. */
export const WEEKDAY_SHORT_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const WEEKDAY_SCHEMA = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Ordem de leitura: segunda primeiro, domingo por último. */
const READING_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export interface HoursRow {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface HoursRun {
  /** Dias cobertos, na ordem de leitura (segunda primeiro). */
  weekdays: number[];
  /** "Seg a Sex", "Seg e Ter", "Sáb". */
  days: string;
  /** "08:00" (menor início entre os profissionais). */
  start: string;
  /** "18:00" (maior fim entre os profissionais). */
  end: string;
  /** "8h às 18h". */
  hours: string;
  /** "Seg a Sex · 8h às 18h". */
  text: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "08:00" → "8h"; "08:30" → "8h30"; "13:00" → "13h". */
export function formatHour(time: string): string {
  const match = TIME_RE.exec(time);
  if (!match) return time;
  const hour = Number(match[1]);
  return match[2] === "00" ? `${hour}h` : `${hour}h${match[2]}`;
}

function daysLabel(weekdays: number[]): string {
  const names = weekdays.map((d) => WEEKDAY_SHORT_PT[d]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names[0]} a ${names[names.length - 1]}`;
}

/**
 * Resume as janelas de atendimento de todos os profissionais em faixas por
 * dia (menor início, maior fim) e comprime dias consecutivos com o mesmo
 * horário em corridas: "Seg a Sex · 8h às 18h", "Sáb · 8h às 12h".
 */
export function summarizeHours(rows: HoursRow[]): HoursRun[] {
  const perDay = new Map<number, { start: string; end: string }>();
  for (const row of rows) {
    const weekday = Number(row.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (!TIME_RE.test(row.start_time) || !TIME_RE.test(row.end_time)) continue;
    if (row.start_time >= row.end_time) continue;
    const current = perDay.get(weekday);
    if (!current) {
      perDay.set(weekday, { start: row.start_time, end: row.end_time });
    } else {
      if (row.start_time < current.start) current.start = row.start_time;
      if (row.end_time > current.end) current.end = row.end_time;
    }
  }

  const runs: HoursRun[] = [];
  let open: { weekdays: number[]; start: string; end: string; lastIndex: number } | null = null;

  READING_ORDER.forEach((weekday, index) => {
    const day = perDay.get(weekday);
    if (!day) return;
    const continues =
      open !== null && open.lastIndex === index - 1 && open.start === day.start && open.end === day.end;
    if (continues && open) {
      open.weekdays.push(weekday);
      open.lastIndex = index;
      return;
    }
    if (open) runs.push(finishRun(open));
    open = { weekdays: [weekday], start: day.start, end: day.end, lastIndex: index };
  });
  if (open) runs.push(finishRun(open));

  return runs;
}

function finishRun(run: { weekdays: number[]; start: string; end: string }): HoursRun {
  const days = daysLabel(run.weekdays);
  const hours = `${formatHour(run.start)} às ${formatHour(run.end)}`;
  return { weekdays: [...run.weekdays], days, start: run.start, end: run.end, hours, text: `${days} · ${hours}` };
}

/**
 * "Unimed, Bradesco Saúde; Amil" → ["Unimed", "Bradesco Saúde", "Amil"].
 * Vírgula, ponto e vírgula ou quebra de linha separam; repetidos somem.
 */
export function parseInsurances(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/[,;\n]/)) {
    const item = raw.trim().replace(/\s+/g, " ");
    if (!item) continue;
    const key = item.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** O que vai para `settings.clinic_insurances`: a lista limpa, separada por vírgula. */
export function normalizeInsurances(value: string | null | undefined): string {
  return parseInsurances(value).join(", ");
}

/** "(11) 3333-4444" → "tel:+551133334444"; com DDI 55 já digitado, não duplica. Sem dígitos, null. */
export function telHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `tel:${digits.startsWith("55") ? `+${digits}` : `+55${digits}`}`;
}

export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

export function mapsEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address.trim())}&output=embed`;
}

const HONORIFIC_RE = /^(dr|dra|prof|profa|enf|enfa|sr|sra)\.?$/i;

function nameParts(name: string): { honorific: string | null; words: string[] } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1 && HONORIFIC_RE.test(words[0])) {
    const honorific = words[0].replace(/\.$/, "");
    return { honorific: `${honorific.charAt(0).toUpperCase()}${honorific.slice(1).toLowerCase()}.`, words: words.slice(1) };
  }
  return { honorific: null, words };
}

/** "Dra. Ana Paula Souza" → "Dra. Ana"; "Maria Clara" → "Maria". */
export function firstNameOf(name: string): string {
  const { honorific, words } = nameParts(name);
  const first = words[0] ?? "";
  return honorific ? `${honorific} ${first}`.trim() : first;
}

/** "Dra. Ana Paula Souza" → "AS"; "Maria" → "M". */
export function initialsOf(name: string): string {
  const { words } = nameParts(name);
  if (words.length === 0) return "";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return `${first}${last}`.toLocaleUpperCase("pt-BR");
}

/** "2026-09-07 10:00:00" → "setembro de 2026". */
export function monthYearPT(createdAt: string): string {
  const iso = createdAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export interface ClinicJsonLdInput {
  name: string;
  url: string;
  phone?: string | null;
  address?: string | null;
  hours?: HoursRun[];
  /** CNPJ da clínica, quando cadastrado. */
  taxId?: string | null;
  /** URL absoluta do agendamento online: vira a ação "reservar" do buscador. */
  bookingUrl?: string | null;
}

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

export interface ClinicJsonLd {
  "@context": "https://schema.org";
  "@type": "MedicalClinic";
  name: string;
  url: string;
  telephone?: string;
  address?: { "@type": "PostalAddress"; streetAddress: string; addressCountry: "BR" };
  openingHoursSpecification?: OpeningHoursSpecification[];
  taxID?: string;
  potentialAction?: {
    "@type": "ReserveAction";
    name: string;
    target: { "@type": "EntryPoint"; urlTemplate: string };
  };
}

/** Só entra o que existe: sem telefone não há `telephone`, sem horário não há `openingHoursSpecification`. */
export function buildClinicJsonLd(input: ClinicJsonLdInput): ClinicJsonLd {
  const out: ClinicJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: input.name,
    url: input.url,
  };
  const phone = input.phone?.trim();
  if (phone) out.telephone = phone;
  const address = input.address?.trim();
  if (address) out.address = { "@type": "PostalAddress", streetAddress: address, addressCountry: "BR" };
  if (input.hours && input.hours.length > 0) {
    out.openingHoursSpecification = input.hours.map((run) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: run.weekdays.map((d) => WEEKDAY_SCHEMA[d]),
      opens: run.start,
      closes: run.end,
    }));
  }
  const taxId = input.taxId?.trim();
  if (taxId) out.taxID = taxId;
  const bookingUrl = input.bookingUrl?.trim();
  if (bookingUrl) {
    out.potentialAction = {
      "@type": "ReserveAction",
      name: "Agendar consulta",
      target: { "@type": "EntryPoint", urlTemplate: bookingUrl },
    };
  }
  return out;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqJsonLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }[];
}

/** As dúvidas frequentes da página, no formato dos buscadores. Sem pergunta, null. */
export function buildFaqJsonLd(items: FaqItem[]): FaqJsonLd | null {
  const valid = items.filter((item) => item.question.trim() && item.answer.trim());
  if (valid.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((item) => ({
      "@type": "Question",
      name: item.question.trim(),
      acceptedAnswer: { "@type": "Answer", text: item.answer.trim() },
    })),
  };
}

/** JSON para dentro de um `<script>`: `<` escapado para ninguém fechar a tag pelo nome da clínica. */
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
