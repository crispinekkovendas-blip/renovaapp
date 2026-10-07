/**
 * Regras puras dos anexos do prontuário (sem I/O), compartilhadas entre o
 * Route Handler de upload e o painel no cliente — a validação roda nos dois
 * lados, e a mensagem de erro é a mesma.
 */

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_MIME: ReadonlySet<string> = new Set<string>(ALLOWED_MIME_TYPES);

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const MAX_FILE_NAME = 120;
/** Extensões maiores que isto ("arquivo.qualquercoisa") não são extensão de verdade. */
const MAX_EXT = 10;

export interface AttachmentCandidate {
  name: string;
  type: string;
  size: number;
}

/** Mensagem de erro em pt-BR, ou null quando o arquivo pode ser enviado. */
export function validateAttachment({ name, type, size }: AttachmentCandidate): string | null {
  if (!name || !name.trim()) return "Selecione um arquivo.";
  if (!ALLOWED_MIME.has(type)) {
    return "Tipo de arquivo não permitido. Envie PDF, JPEG, PNG ou WebP.";
  }
  if (!Number.isFinite(size) || size <= 0) return "O arquivo está vazio.";
  if (size > MAX_ATTACHMENT_BYTES) {
    return `Arquivo muito grande (${fmtBytes(size)}). O limite é ${fmtBytes(MAX_ATTACHMENT_BYTES)}.`;
  }
  return null;
}

/** Remove caracteres de controle ASCII (0x00–0x1F) e DEL (0x7F). */
function stripControlChars(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127) continue;
    out += ch;
  }
  return out;
}

/**
 * Nome seguro para guardar e devolver no Content-Disposition: só o último
 * segmento do caminho, sem caracteres de controle, no máximo 120 caracteres
 * — preservando a extensão quando precisa cortar.
 */
export function safeFileName(name: string): string {
  const last = (name ?? "").split(/[\\/]/).pop() ?? "";
  let clean = stripControlChars(last).replace(/\s+/g, " ").trim();
  if (!clean || clean === "." || clean === "..") clean = "arquivo";
  if (clean.length <= MAX_FILE_NAME) return clean;

  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 && clean.length - dot <= MAX_EXT ? clean.slice(dot) : "";
  const stem = ext ? clean.slice(0, dot) : clean;
  return `${stem.slice(0, MAX_FILE_NAME - ext.length).trimEnd()}${ext}`;
}

const UNITS = ["KB", "MB", "GB"] as const;

/** "512 B", "1,5 KB", "1,2 MB" — vírgula decimal, uma casa, sem zero à toa. */
export function fmtBytes(n: number): string {
  const bytes = Number.isFinite(n) && n > 0 ? n : 0;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")} ${UNITS[unit]}`;
}

/** Id vindo de URL ou formulário: inteiro positivo, senão null. */
export function parsePositiveId(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  if (typeof raw === "string" && raw.trim() === "") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * RFC 6266: `filename` só aceita ASCII (aspas e barras trocadas por "_");
 * `filename*` leva o nome real em UTF-8 percent-encoded, que os navegadores
 * preferem quando presente.
 */
export function contentDisposition(fileName: string): string {
  // Só ASCII imprimível (0x20–0x7E), sem aspas nem barra invertida.
  const ascii = Array.from(fileName, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code > 126 || ch === '"' || ch === "\\" ? "_" : ch;
  }).join("");
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
