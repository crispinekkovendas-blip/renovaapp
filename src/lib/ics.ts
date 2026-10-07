/**
 * "Adicionar à minha agenda": um arquivo .ics com a próxima consulta, gerado
 * sem dependência. Funções puras — a rota `/p/[token]/consulta.ics` só
 * verifica o token, carrega a consulta e devolve o texto.
 *
 * RFC 5545 em resumo: linhas terminam em CRLF; valores de texto escapam `\`,
 * `;`, `,` e quebra de linha; nenhuma linha passa de 75 octetos (a continuação
 * começa com um espaço); DTSTAMP é em UTC. O Brasil não tem horário de verão
 * desde 2019, então o VTIMEZONE é mínimo: -03:00 fixo, sem transições.
 */

export const ICS_TZID = "America/Sao_Paulo";
const CRLF = "\r\n";
const MAX_OCTETS = 75;

export interface IcsEvent {
  uid: string;
  /** Data e hora locais (São Paulo) no formato "YYYY-MM-DD HH:MM". */
  start: string;
  end: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  /** Instante do DTSTAMP; padrão: agora. Parâmetro para os testes serem determinísticos. */
  stamp?: Date;
}

/** Escapa um valor de tipo TEXT: `\` → `\\`, `;` → `\;`, `,` → `\,`, quebra de linha → `\n`. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** "2026-09-10 14:30" → "20260910T143000" (hora local; o TZID vai no parâmetro da propriedade). */
export function icsLocalDateTime(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error(`Data/hora inválida para o .ics: ${value}`);
  const [, y, mo, d, h, mi, s = "00"] = match;
  return `${y}${mo}${d}T${h}${mi}${s}`;
}

/** DTSTAMP em UTC: "20260907T123456Z". */
export function icsUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * Dobra uma linha em pedaços de no máximo 75 octetos (UTF-8), nunca no meio de
 * um caractere; cada continuação começa com um espaço, que conta no limite.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > MAX_OCTETS) {
      parts.push(current);
      current = " ";
      octets = 1;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join(CRLF);
}

/** Desfaz a dobra (para quem precisa ler o que gerou; usado nos testes). */
export function unfoldIcs(text: string): string {
  return text.replace(/\r\n[ \t]/g, "");
}

export function buildIcs(event: IcsEvent): string {
  const stamp = icsUtcStamp(event.stamp ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Renova//Portal do paciente//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${ICS_TZID}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${ICS_TZID}:${icsLocalDateTime(event.start)}`,
    `DTEND;TZID=${ICS_TZID}:${icsLocalDateTime(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  // URL é do tipo URI, não TEXT: sem escape.
  if (event.url) lines.push(`URL:${event.url}`);
  // Aviso na véspera, o mesmo momento do lembrete da clínica.
  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(event.summary)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  );
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
