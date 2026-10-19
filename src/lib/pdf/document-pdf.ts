import { PDFDocument, rgb, setCharacterSpacing, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { wrapText, linesThatFit } from "./layout.ts";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { SUBFILTER_ETSI_CADES_DETACHED } from "@signpdf/utils";
import { SIGNATURE_LENGTH } from "./sign.ts";
import { REGULAR_TTF_BASE64 } from "./fonts/regular.ts";
import { BOLD_TTF_BASE64 } from "./fonts/bold.ts";
import { DEFAULT_SHEET_STYLE, RULE_HEIGHT, SCALE_FACTOR, hexToRgb01, tint, type SheetStyle } from "../sheet-style.ts";

/**
 * A folha dos documentos em PDF.
 *
 * Existe por dois motivos, nessa ordem:
 *
 * 1. **Assinatura ICP-Brasil.** PAdES assina bytes de um PDF; não há como
 *    assinar uma página que só existe quando o Chrome a imprime.
 * 2. É o que o paciente guarda e a farmácia abre — e, no receituário, o que um
 *    farmacêutico lê com pressa. Por isso o desenho não é enfeite: cada
 *    medicamento em bloco próprio existe para dois remédios não se
 *    confundirem numa lista corrida.
 *
 * A aparência segue o modelo da folha (`SheetStyle`, sheet-style.ts): cor,
 * logotipo, alinhamento, letra, blocos ou lista. O conteúdo exigido não muda
 * com o modelo.
 *
 * A fonte é a **Plus Jakarta Sans**, a mesma da tela, embutida (ver `fonts/`).
 * Com fonte própria o PDF deixa de depender do WinAnsi do Helvetica, e acento,
 * travessão e "·" saem como foram escritos.
 */

const A4 = { width: 595.28, height: 841.89 };
const M = 48;
const W = A4.width - M * 2;

const TINTA = rgb(0.17, 0.15, 0.2);
const CINZA = rgb(0.45, 0.42, 0.5);
const LINHA = rgb(0.88, 0.86, 0.92);
const BRANCO = rgb(1, 1, 1);

type Color = ReturnType<typeof rgb>;

/** As cores e medidas que dependem do modelo da folha. */
interface Look {
  style: SheetStyle;
  /** Nome da clínica, régua, texto do selo. */
  accent: Color;
  /** Número e barra dos medicamentos. */
  accentSoft: Color;
  /** Fundo do painel do paciente. */
  panel: Color;
  /** Fundo do selo da via. */
  seal: Color;
  /** Multiplicador da letra do corpo e dos medicamentos. */
  k: number;
  logo: PDFImage | null;
}

function lookFor(style: SheetStyle, logo: PDFImage | null): Look {
  const c = (hex: string) => rgb(...hexToRgb01(hex));
  // O roxo da Renova tem os tons de sempre (lilás, lavanda, selo rosa); outra
  // cor ganha tons derivados dela.
  const renova = style.accent === DEFAULT_SHEET_STYLE.accent;
  return {
    style,
    accent: c(style.accent),
    accentSoft: renova ? rgb(0.42, 0.24, 0.71) : c(tint(style.accent, 0.22)),
    panel: renova ? rgb(0.972, 0.957, 0.985) : c(tint(style.accent, 0.955)),
    seal: renova ? rgb(1, 0.84, 0.86) : c(tint(style.accent, 0.84)),
    k: SCALE_FACTOR[style.scale],
    logo,
  };
}

export interface PdfClinic {
  name: string;
  /** "Endereço · Telefone · CNPJ", já montada (espelha `ClinicHeader`). */
  line?: string | null;
  cnes?: string | null;
}

export interface PdfPatient {
  name: string;
  cpf?: string | null;
}

export interface PdfProfessional {
  name: string;
  council: string;
  specialty?: string | null;
  rqe?: string | null;
  /** Assinatura digitalizada (data URL PNG/JPEG), impressa acima da linha. */
  signatureImage?: string | null;
}

/** Um medicamento do receituário, para sair em bloco em vez de linha corrida. */
export interface PdfMedication {
  name: string;
  quantity?: string | null;
  posology: string;
  route?: string | null;
  continuous?: boolean;
}

export interface PdfDocumentInput {
  title: string;
  /** Texto pronto. Ignorado quando `medications` vem preenchido. */
  body: string;
  /** dd/mm/aaaa. */
  date: string;
  code: string;
  validateUrl: string;
  clinic: PdfClinic;
  patient: PdfPatient;
  professional: PdfProfessional;
  /** Receituário: a lista estruturada, que rende blocos em vez de texto. */
  medications?: readonly PdfMedication[];
  /**
   * Quantas vias imprimir. O Receituário de Controle Especial exige duas
   * (Portaria SVS/MS 344/98): a farmácia retém uma.
   */
  vias?: number;
  viaLabels?: readonly string[];
  /** Modelo da folha (aparência); sem ele, o padrão Renova. */
  style?: SheetStyle | null;
  /** Logotipo do modelo (data URL PNG/JPEG), já lido de `settings`. */
  logoImage?: string | null;
  /**
   * Reserva o espaço da assinatura ICP-Brasil (PAdES). Só no documento que vai
   * ser assinado: num PDF de imprimir, o campo vazio aparece como "assinatura
   * inválida" em alguns leitores.
   */
  signaturePlaceholder?: { reason: string; name: string; location?: string; contactInfo?: string };
}

interface Fonts {
  reg: PDFFont;
  bold: PDFFont;
}

/**
 * A fonte embutida cobre latim estendido, mas não tudo. Um glifo ausente faz o
 * pdf-lib lançar no meio da geração, então o que não existe vira equivalente
 * antes de chegar lá — melhor um hífen do que um documento que não sai.
 */
function safe(text: string): string {
  return (text ?? "")
    .replace(/‑/g, "-")
    .replace(/[−‒―]/g, "-")
    .replace(/ /g, " ")
    .replace(/[​-‏﻿]/g, "");
}

/** Retângulo de cantos arredondados — pdf-lib não tem, então vai por path SVG. */
function roundedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: Color
) {
  const top = A4.height - (y + h);
  const path =
    `M ${x + r} ${top} H ${x + w - r} Q ${x + w} ${top} ${x + w} ${top + r} ` +
    `V ${top + h - r} Q ${x + w} ${top + h} ${x + w - r} ${top + h} ` +
    `H ${x + r} Q ${x} ${top + h} ${x} ${top + h - r} ` +
    `V ${top + r} Q ${x} ${top} ${x + r} ${top} Z`;
  page.drawSvgPath(path, { x: 0, y: A4.height, color, borderWidth: 0 });
}

async function drawQr(page: PDFPage, text: string, x: number, y: number, size: number): Promise<void> {
  let matrix: { size: number; get(r: number, c: number): boolean };
  try {
    matrix = QRCode.create(text, { errorCorrectionLevel: "M" }).modules as unknown as {
      size: number;
      get(r: number, c: number): boolean;
    };
  } catch {
    return; // Sem QR o documento continua válido: o código escrito basta.
  }
  const cell = size / matrix.size;
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (!matrix.get(row, col)) continue;
      page.drawRectangle({
        x: x + col * cell,
        // O PDF cresce de baixo para cima; o QR se lê de cima para baixo.
        y: y + size - (row + 1) * cell,
        width: cell,
        height: cell,
        color: TINTA,
      });
    }
  }
}

/**
 * Rótulo pequeno em caixa alta com espacejamento — os "PACIENTE", "CPF" do
 * painel.
 *
 * O espacejamento vai pelo operador Tc do próprio PDF, e não desenhando letra
 * por letra: cada `drawText` do pdf-lib registra um recurso de fonte na
 * página, e um rótulo de 23 caracteres virava 23 entradas repetidas.
 */
function label(page: PDFPage, fonts: Fonts, text: string, x: number, y: number) {
  page.pushOperators(setCharacterSpacing(0.7));
  page.drawText(safe(text).toUpperCase(), { x, y, size: 6.5, font: fonts.bold, color: CINZA });
  page.pushOperators(setCharacterSpacing(0));
}

function header(page: PDFPage, fonts: Fonts, input: PdfDocumentInput, viaLabel: string | null, look: Look): number {
  const { style } = look;
  const centered = style.align === "center";
  /** x de um texto alinhado conforme o modelo. */
  const at = (text: string, size: number, font: PDFFont) =>
    centered ? (A4.width - font.widthOfTextAtSize(text, size)) / 2 : M;
  let y = A4.height - M;

  // Logotipo: até 120 × 40, ao lado do nome (à esquerda) ou acima dele (centralizado).
  let nameX: number | null = null;
  if (look.logo) {
    const scale = Math.min(120 / look.logo.width, 40 / look.logo.height, 1);
    const w = look.logo.width * scale;
    const h = look.logo.height * scale;
    if (centered) {
      page.drawImage(look.logo, { x: (A4.width - w) / 2, y: y - h, width: w, height: h });
      y -= h + 8;
    } else {
      page.drawImage(look.logo, { x: M, y: y - h, width: w, height: h });
      nameX = M + w + 12;
      y -= Math.max(0, (h - 17) / 2);
    }
  }

  const name = safe(input.clinic.name);
  page.drawText(name, { x: nameX ?? at(name, 17, fonts.bold), y: y - 17, size: 17, font: fonts.bold, color: look.accent });
  y -= 17;

  const small = (text: string) => {
    const t = safe(text);
    page.drawText(t, { x: nameX ?? at(t, 8, fonts.reg), y, size: 8, font: fonts.reg, color: CINZA });
  };
  if (style.headerNote) {
    y -= 13;
    small(style.headerNote);
  }
  if (style.showClinicLine && input.clinic.line) {
    y -= style.headerNote ? 11 : 13;
    small(input.clinic.line);
  }
  if (style.showCnes && input.clinic.cnes) {
    y -= 11;
    small(`CNES ${input.clinic.cnes}`);
  }
  if (look.logo && !centered) {
    // O texto ao lado do logotipo não pode subir para dentro da régua.
    const logoBottom = A4.height - M - Math.min(40, look.logo.height * Math.min(120 / look.logo.width, 40 / look.logo.height, 1));
    y = Math.min(y, logoBottom);
  }

  // Régua: dá peso ao cabeçalho sem o traço preto de formulário.
  y -= 13;
  const rule = RULE_HEIGHT[style.rule];
  if (rule > 0) page.drawRectangle({ x: M, y, width: W, height: rule, color: look.accent });

  // Título à esquerda e a via como selo, onde o balconista procura.
  y -= 31;
  page.drawText(safe(input.title), { x: M, y, size: 16, font: fonts.bold, color: TINTA });
  if (viaLabel) {
    const text = safe(viaLabel);
    const w = fonts.bold.widthOfTextAtSize(text, 8) + 18;
    roundedRect(page, A4.width - M - w, y - 4, w, 18, 9, look.seal);
    page.drawText(text, { x: A4.width - M - w + 9, y: y + 1, size: 8, font: fonts.bold, color: look.accent });
  }

  // Painel do paciente: rótulo pequeno em cima, valor com peso embaixo.
  y -= 22;
  const h = 50;
  if (style.patientPanel === "faixa") {
    roundedRect(page, M, y - h, W, h, 8, look.panel);
  } else {
    page.drawRectangle({ x: M, y, width: W, height: 0.8, color: LINHA });
    page.drawRectangle({ x: M, y: y - h, width: W, height: 0.8, color: LINHA });
  }
  const pad = style.patientPanel === "faixa" ? 16 : 0;
  const cols = [M + pad, M + 232, M + 352, M + 446];
  const campos: [string, string][] = [
    ["Paciente", input.patient.name],
    ["CPF", input.patient.cpf || "—"],
    ["Data", input.date],
    ["Documento", input.code],
  ];
  campos.forEach(([rot, val], i) => {
    label(page, fonts, rot, cols[i], y - 19);
    const max = (cols[i + 1] ?? A4.width - M - 8) - cols[i] - 10;
    let text = safe(val);
    while (text.length > 4 && fonts.bold.widthOfTextAtSize(text, 10) > max) text = `${text.slice(0, -2)}…`;
    page.drawText(text, { x: cols[i], y: y - 34, size: 10, font: fonts.bold, color: TINTA });
  });

  return y - h - 28;
}

async function footer(
  page: PDFPage,
  fonts: Fonts,
  input: PdfDocumentInput,
  signature: PDFImage | null,
  pagina: number,
  total: number,
  look: Look
): Promise<void> {
  if (look.style.footerNote) {
    const t = safe(look.style.footerNote);
    const x = look.style.align === "center" ? (A4.width - fonts.reg.widthOfTextAtSize(t, 8)) / 2 : M;
    page.drawText(t, { x, y: M + 106, size: 8, font: fonts.reg, color: CINZA });
  }
  page.drawRectangle({ x: M, y: M + 100, width: W, height: 0.8, color: LINHA });

  // ── Autenticidade, à esquerda
  const qr = 54;
  await drawQr(page, input.validateUrl, M, M + 24, qr);
  const x = M + qr + 13;
  label(page, fonts, "Confira a autenticidade", x, M + 24 + qr - 9);
  page.drawText(safe(input.code), { x, y: M + 24 + qr - 30, size: 14, font: fonts.bold, color: look.accent });
  page.drawText(safe(input.validateUrl.replace(/^https?:\/\//, "")), {
    x,
    y: M + 24 + qr - 42,
    size: 7.5,
    font: fonts.reg,
    color: CINZA,
  });

  // ── Assinatura, à direita, com espaço livre acima da linha para assinar à mão
  const sw = 232;
  const sx = A4.width - M - sw;
  const lineY = M + 52;

  if (signature) {
    const maxH = 40;
    const scale = Math.min(sw / signature.width, maxH / signature.height, 1);
    const w = signature.width * scale;
    const h = signature.height * scale;
    page.drawImage(signature, { x: sx + (sw - w) / 2, y: lineY + 4, width: w, height: h });
  }

  page.drawRectangle({ x: sx, y: lineY, width: sw, height: 0.8, color: TINTA });

  const stamp = [
    input.professional.name,
    input.professional.specialty || null,
    [input.professional.council, input.professional.rqe ? `RQE ${input.professional.rqe}` : null]
      .filter(Boolean)
      .join(" · "),
  ].filter(Boolean) as string[];

  let y = lineY - 12;
  for (const line of stamp) {
    const text = safe(line);
    const w = fonts.reg.widthOfTextAtSize(text, 8);
    page.drawText(text, { x: sx + (sw - w) / 2, y, size: 8, font: fonts.reg, color: CINZA });
    y -= 10;
  }

  // "Página 1 de 2": o Controle Especial sai em duas vias, e sem isto não há
  // como saber que falta folha.
  const pag = `Página ${pagina} de ${total}`;
  page.drawText(pag, {
    x: A4.width - M - fonts.reg.widthOfTextAtSize(pag, 7.5),
    y: M,
    size: 7.5,
    font: fonts.reg,
    color: CINZA,
  });
}

/** Altura do bloco de um medicamento — precisa ser sabida antes de desenhar. */
function medicationHeight(fonts: Fonts, item: PdfMedication, look: Look): { height: number; lines: string[] } {
  const detail = [item.posology.trim(), item.route || "", item.continuous ? "Uso contínuo" : ""]
    .filter(Boolean)
    .join(". ");
  const size = 9.5 * look.k;
  const lines = wrapText(detail.endsWith(".") ? detail : `${detail}.`, W - 62, (t) =>
    fonts.reg.widthOfTextAtSize(safe(t), size)
  );
  const lead = 13 * look.k;
  // Em lista não há caixa: menos respiro em volta.
  return { height: (look.style.meds === "lista" ? 20 : 32) * look.k + lines.length * lead, lines };
}

/**
 * Um medicamento por bloco: número, nome com peso, quantidade à direita e
 * posologia abaixo, com uma barra na lateral. Numa lista corrida dois
 * medicamentos se confundem — e quem lê com pressa é uma farmácia. No modelo
 * "lista", o mesmo desenho sem a caixa, com um fio separando os itens.
 */
function drawMedication(
  page: PDFPage,
  fonts: Fonts,
  item: PdfMedication,
  index: number,
  y: number,
  h: number,
  lines: string[],
  look: Look
) {
  const k = look.k;
  const list = look.style.meds === "lista";
  if (!list) {
    roundedRect(page, M, y - h, W, h, 6, BRANCO);
    page.drawRectangle({ x: M, y: y - h, width: W, height: h, borderColor: LINHA, borderWidth: 0.8 });
    page.drawRectangle({ x: M + 0.4, y: y - h + 0.4, width: 3, height: h - 0.8, color: look.accentSoft });
  } else if (index > 0) {
    page.drawRectangle({ x: M, y: y + 4, width: W, height: 0.6, color: LINHA });
  }

  const left = list ? M : M + 15;
  const top = list ? y - 12 * k : y - 21 * k;
  page.drawText(list ? `${index + 1})` : String(index + 1), {
    x: left,
    y: top,
    size: 12 * k,
    font: fonts.bold,
    color: look.accentSoft,
  });
  page.drawText(safe(item.name), { x: left + 19 * k, y: top, size: 11 * k, font: fonts.bold, color: TINTA });

  if (item.quantity) {
    const q = safe(item.quantity);
    page.drawText(q, {
      x: A4.width - M - (list ? 0 : 15) - fonts.reg.widthOfTextAtSize(q, 9 * k),
      y: top,
      size: 9 * k,
      font: fonts.reg,
      color: CINZA,
    });
  }

  let ly = top - 16 * k;
  for (const line of lines) {
    page.drawText(safe(line), { x: left + 19 * k, y: ly, size: 9.5 * k, font: fonts.reg, color: TINTA });
    ly -= 13 * k;
  }
}

async function embedSignature(pdf: PDFDocument, dataUrl: string | null | undefined): Promise<PDFImage | null> {
  if (!dataUrl?.startsWith("data:image/")) return null;
  try {
    const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    return dataUrl.includes("image/png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    // Assinatura ilegível não pode impedir a emissão do documento.
    return null;
  }
}

export async function buildDocumentPdf(input: PdfDocumentInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${input.title} — ${input.patient.name}`);
  pdf.setProducer("Renova");
  pdf.setCreator("Renova");

  const fonts: Fonts = {
    reg: await pdf.embedFont(Buffer.from(REGULAR_TTF_BASE64, "base64"), { subset: true }),
    bold: await pdf.embedFont(Buffer.from(BOLD_TTF_BASE64, "base64"), { subset: true }),
  };

  const signature = await embedSignature(pdf, input.professional.signatureImage);
  const look = lookFor(input.style ?? DEFAULT_SHEET_STYLE, await embedSignature(pdf, input.logoImage));
  const bodySize = 10.5 * look.k;
  const bodyLead = 17 * look.k;
  const vias = Math.max(1, input.vias ?? 1);
  const labels = input.viaLabels ?? (vias === 2 ? ["1ª via — Farmácia (retenção)", "2ª via — Paciente"] : []);
  const bodyBottom = M + 118;

  const meds = input.medications?.length
    ? input.medications.map((m) => ({ item: m, ...medicationHeight(fonts, m, look) }))
    : null;
  const textLines = meds ? [] : wrapText(input.body, W, (t) => fonts.reg.widthOfTextAtSize(safe(t), bodySize));

  for (let via = 0; via < vias; via += 1) {
    const viaLabel = labels[via] ?? null;
    // As páginas desta via são guardadas para o rodapé saber o total.
    const pages: PDFPage[] = [];

    let page = pdf.addPage([A4.width, A4.height]);
    pages.push(page);
    let y = header(page, fonts, input, viaLabel, look);

    if (meds) {
      for (let i = 0; i < meds.length; i += 1) {
        const { item, height, lines } = meds[i];
        if (y - height < bodyBottom) {
          page = pdf.addPage([A4.width, A4.height]);
          pages.push(page);
          y = header(page, fonts, input, viaLabel, look);
        }
        drawMedication(page, fonts, item, i, y, height, lines, look);
        y -= height + (look.style.meds === "lista" ? 8 : 10);
      }
    } else {
      let remaining = linesThatFit(y - bodyBottom, bodyLead);
      for (const line of textLines) {
        if (remaining <= 0) {
          page = pdf.addPage([A4.width, A4.height]);
          pages.push(page);
          y = header(page, fonts, input, viaLabel, look);
          remaining = linesThatFit(y - bodyBottom, bodyLead);
        }
        if (line !== "") page.drawText(safe(line), { x: M, y, size: bodySize, font: fonts.reg, color: TINTA });
        y -= bodyLead;
        remaining -= 1;
      }
    }

    for (let i = 0; i < pages.length; i += 1) {
      await footer(pages[i], fonts, input, signature, i + 1, pages.length, look);
    }
  }

  if (input.signaturePlaceholder) {
    // ETSI.CAdES.detached é o subfilter do PAdES — o que a ICP-Brasil espera.
    pdflibAddPlaceholder({
      pdfDoc: pdf,
      reason: input.signaturePlaceholder.reason,
      name: input.signaturePlaceholder.name,
      location: input.signaturePlaceholder.location ?? "",
      contactInfo: input.signaturePlaceholder.contactInfo ?? "",
      signatureLength: SIGNATURE_LENGTH,
      subFilter: SUBFILTER_ETSI_CADES_DETACHED,
    });
    // `useObjectStreams` desligado: o ByteRange precisa dos offsets estáveis
    // que o fluxo comprimido embaralha.
    return pdf.save({ useObjectStreams: false });
  }

  return pdf.save();
}
