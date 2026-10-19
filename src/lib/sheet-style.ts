/**
 * Modelo da folha: a aparência do receituário (e dos outros documentos) que o
 * médico escolhe ou personaliza na revisão da emissão — cor, logotipo,
 * alinhamento do cabeçalho, tamanho da letra, medicamentos em blocos ou em
 * lista, linhas extras no cabeçalho e no rodapé.
 *
 * Só aparência: o que a lei pede na folha (título do receituário, paciente,
 * data, código de autenticidade, carimbo e assinatura, vias) sai sempre, em
 * qualquer modelo. A prévia em HTML (document-preview.tsx) e o PDF
 * (pdf/document-pdf.ts) leem o mesmo `SheetStyle`.
 *
 * O documento emitido guarda uma cópia do estilo (`fields.folha`): mudar o
 * modelo depois não muda o que já foi emitido. O logotipo não vai na cópia —
 * fica uma vez só em `settings` (`sheet_logo:<hash>`), e o documento guarda o
 * hash; como o hash é do conteúdo, a imagem de um documento nunca muda.
 */

export interface SheetStyle {
  /** Cor de destaque (#rrggbb): nome da clínica, régua, números dos medicamentos. */
  accent: string;
  align: "left" | "center";
  /** Hash do logotipo em `settings` (sheet_logo:<hash>); null = sem logotipo. */
  logo: string | null;
  showClinicLine: boolean;
  showCnes: boolean;
  rule: "grossa" | "fina" | "nenhuma";
  /** Tamanho da letra do corpo e dos medicamentos. */
  scale: "compacta" | "normal" | "grande";
  /** Medicamentos em blocos com barra lateral, ou em lista numerada simples. */
  meds: "blocos" | "lista";
  /** Painel do paciente em faixa colorida ou em linhas. */
  patientPanel: "faixa" | "linhas";
  /** Linha a mais sob o nome da clínica (ex.: "Clínica geral · Saúde da família"). */
  headerNote: string;
  /** Linha acima do rodapé (ex.: "Validade da receita: 30 dias"). */
  footerNote: string;
}

export const DEFAULT_SHEET_STYLE: SheetStyle = {
  accent: "#3d0e6b",
  align: "left",
  logo: null,
  showClinicLine: true,
  showCnes: true,
  rule: "grossa",
  scale: "normal",
  meds: "blocos",
  patientPanel: "faixa",
  headerNote: "",
  footerNote: "",
};

export interface SheetPreset {
  id: string;
  name: string;
  style: SheetStyle;
}

/** Modelos prontos, para escolher sem personalizar nada. */
export const SHEET_PRESETS: readonly SheetPreset[] = [
  { id: "renova", name: "Renova (padrão)", style: DEFAULT_SHEET_STYLE },
  {
    id: "sobrio",
    name: "Sóbrio, preto e branco",
    style: { ...DEFAULT_SHEET_STYLE, accent: "#222222", rule: "fina", meds: "lista", patientPanel: "linhas" },
  },
  { id: "verde", name: "Verde clínica", style: { ...DEFAULT_SHEET_STYLE, accent: "#2f6553" } },
  { id: "azul", name: "Azul hospitalar", style: { ...DEFAULT_SHEET_STYLE, accent: "#1d4e89", align: "center" } },
  {
    id: "compacto",
    name: "Compacto (cabe mais)",
    style: { ...DEFAULT_SHEET_STYLE, scale: "compacta", meds: "lista", rule: "fina" },
  },
  { id: "grande", name: "Letra grande", style: { ...DEFAULT_SHEET_STYLE, scale: "grande" } },
];

/** Cores sugeridas no editor (qualquer #rrggbb vale). */
export const ACCENT_SWATCHES = ["#3d0e6b", "#2f6553", "#1d4e89", "#8a1538", "#b45309", "#0f766e", "#222222"] as const;

export const SCALE_FACTOR: Record<SheetStyle["scale"], number> = { compacta: 0.9, normal: 1, grande: 1.15 };
export const RULE_HEIGHT: Record<SheetStyle["rule"], number> = { grossa: 2.5, fina: 0.8, nenhuma: 0 };

const HEX = /^#[0-9a-f]{6}$/i;
const LOGO_KEY = /^[0-9a-f]{16,64}$/;
const MAX_NOTE = 140;

const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;

const note = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE) : "");

/** Qualquer coisa (JSON do formulário, do banco, de um modelo antigo) → estilo válido. */
export function normalizeSheetStyle(raw: unknown): SheetStyle {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_SHEET_STYLE;
  return {
    accent: typeof r.accent === "string" && HEX.test(r.accent) ? r.accent.toLowerCase() : d.accent,
    align: pick(r.align, ["left", "center"] as const, d.align),
    logo: typeof r.logo === "string" && LOGO_KEY.test(r.logo) ? r.logo : null,
    showClinicLine: typeof r.showClinicLine === "boolean" ? r.showClinicLine : d.showClinicLine,
    showCnes: typeof r.showCnes === "boolean" ? r.showCnes : d.showCnes,
    rule: pick(r.rule, ["grossa", "fina", "nenhuma"] as const, d.rule),
    scale: pick(r.scale, ["compacta", "normal", "grande"] as const, d.scale),
    meds: pick(r.meds, ["blocos", "lista"] as const, d.meds),
    patientPanel: pick(r.patientPanel, ["faixa", "linhas"] as const, d.patientPanel),
    headerNote: note(r.headerNote),
    footerNote: note(r.footerNote),
  };
}

export function parseSheetStyle(json: string | null | undefined): SheetStyle {
  if (!json) return DEFAULT_SHEET_STYLE;
  try {
    return normalizeSheetStyle(JSON.parse(json));
  } catch {
    return DEFAULT_SHEET_STYLE;
  }
}

export function isDefaultStyle(style: SheetStyle): boolean {
  return JSON.stringify(style) === JSON.stringify(DEFAULT_SHEET_STYLE);
}

/** "#3d0e6b" → [0.24, 0.05, 0.42], para o pdf-lib. */
export function hexToRgb01(hex: string): [number, number, number] {
  const n = Number.parseInt((HEX.test(hex) ? hex : DEFAULT_SHEET_STYLE.accent).slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** A cor de destaque misturada com branco (`amount` 0–1): fundos claros que combinam. */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb01(hex);
  const mix = (c: number) => Math.round((c + (1 - c) * amount) * 255).toString(16).padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

/* ---------- Modelos salvos ---------- */

export interface SheetTemplate {
  id: string;
  name: string;
  /** null = da clínica (todos veem); número = só daquele profissional. */
  professional_id: number | null;
  style: SheetStyle;
}

export const MAX_TEMPLATES = 40;
/** Logotipo: PNG ou JPEG, até ~300 KB (a imagem vai em cada PDF). */
export const MAX_LOGO_BYTES = 300_000;

export function parseTemplates(json: string | null | undefined): SheetTemplate[] {
  if (!json) return [];
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.flatMap((t): SheetTemplate[] => {
      if (!t || typeof t !== "object" || typeof t.id !== "string" || typeof t.name !== "string") return [];
      const pid = t.professional_id;
      return [
        {
          id: t.id.slice(0, 40),
          name: t.name.trim().slice(0, 60) || "Modelo",
          professional_id: Number.isInteger(pid) && pid > 0 ? pid : null,
          style: normalizeSheetStyle(t.style),
        },
      ];
    });
  } catch {
    return [];
  }
}

/** Os modelos que um profissional enxerga: os da clínica e os dele. */
export function templatesFor(all: readonly SheetTemplate[], professionalId: number | null): SheetTemplate[] {
  return all.filter((t) => t.professional_id === null || t.professional_id === professionalId);
}

/** Logotipo enviado (data URL) → ok, ou o motivo da recusa. */
export function checkLogo(dataUrl: string): { ok: true; mime: "image/png" | "image/jpeg" } | { ok: false; reason: string } {
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return { ok: false, reason: "O logotipo precisa ser PNG ou JPEG." };
  const bytes = Math.floor((m[2].length * 3) / 4);
  if (bytes > MAX_LOGO_BYTES) return { ok: false, reason: "Logotipo grande demais (até 300 KB). Diminua a imagem e tente de novo." };
  return { ok: true, mime: m[1] as "image/png" | "image/jpeg" };
}

/** O estilo guardado no documento emitido (`fields.folha`); sem ele, null (= padrão). */
export function styleFromDocumentFields(json: string | null | undefined): SheetStyle | null {
  if (!json) return null;
  try {
    const folha = (JSON.parse(json) as { folha?: unknown })?.folha;
    return folha && typeof folha === "object" ? normalizeSheetStyle(folha) : null;
  } catch {
    return null;
  }
}
