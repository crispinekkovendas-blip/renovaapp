import type { Document } from "@/lib/documents";
import { validationHost } from "@/lib/documents";
import { fmtDate, fmtDateLong } from "@/lib/format";
import { FitWidth } from "@/components/fit-width";

/** 210mm em px CSS (96 dpi): a largura natural da folha, que o FitWidth encolhe no celular. */
const SHEET_PX = (210 / 25.4) * 96;

/**
 * A folha A4 de um documento (atestado, encaminhamento, laudo, orientações):
 * cabeçalho da clínica, título, paciente, texto, assinatura e, no rodapé, o
 * bloco de validação (QR para /validar/<code> + o código). Server Component
 * sem busca de dados — o prontuário e o portal do paciente passam tudo por
 * props. Na impressão só a folha (.print-area) aparece.
 *
 * Nome social: quando há, é o que aparece em "Paciente"; o nome civil vem
 * logo abaixo, menor. Assinatura digitalizada: impressa acima da linha, com
 * o carimbo (nome, especialidade, conselho e RQE) — sem ela, a linha fica em
 * branco para assinar à mão.
 */

export type SheetDocument = Pick<Document, "title" | "body" | "issued_at" | "code" | "revoked_at" | "revoke_reason">;

export interface SheetPatient {
  name: string;
  cpf: string | null;
  social_name?: string | null;
}

export interface SheetProfessional {
  name: string;
  council: string;
  specialty: string;
  rqe?: string | null;
  /** data URL (PNG/JPEG) de `professionals.signature_image`. */
  signature_image?: string | null;
}

export interface DocumentSheetProps {
  document: SheetDocument;
  patient: SheetPatient;
  professional: SheetProfessional;
  clinic: { name: string; line: string };
  /** `https://<host>/validar/<code>` — vai no QR e, como host, no texto. */
  validationUrl: string;
  /** SVG inline de `qrSvg(validationUrl)`; null mostra só o código. */
  qrSvg: string | null;
  /**
   * "single" (padrão): a folha injeta PRINT_STYLE e é a única coisa impressa.
   * "multi": várias folhas na mesma página ("Imprimir todos") — cada uma vira
   * `.print-sheet`, sem estilo próprio; a página injeta PRINT_STYLE_MULTI uma vez.
   */
  printMode?: "single" | "multi";
}

/**
 * Várias folhas em sequência, uma por página, sem posicionamento absoluto:
 * o que não é `.print-sheet` some, e cada folha quebra a página depois de si.
 * O shell do app (rail e barra) já some com `print:hidden`.
 */
export const PRINT_STYLE_MULTI = `
  @page { size: A4; margin: 8mm; }
  @media print {
    body { background: #fff !important; }
    body * { visibility: hidden; }
    .print-sheet, .print-sheet * { visibility: visible; }
    .print-sheet {
      break-after: page;
      page-break-after: always;
      break-inside: avoid;
      min-height: 0 !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
    }
    .print-sheet:last-of-type { break-after: auto; page-break-after: auto; }
    .no-print { display: none !important; }
  }
`;

export const PRINT_STYLE = `
  @media print {
    body { background: #fff !important; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area {
      position: absolute;
      inset: 0;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
    }
  }
`;

/** Linha do carimbo: "Especialidade · CRM 123456-SP · RQE 12345" (só o que existe). */
export function stampLine(professional: Pick<SheetProfessional, "specialty" | "council" | "rqe">): string {
  const rqe = professional.rqe?.trim();
  return [professional.specialty, professional.council, rqe ? `RQE ${rqe}` : null].filter(Boolean).join(" · ");
}

export function DocumentSheet({
  document,
  patient,
  professional,
  clinic,
  validationUrl,
  qrSvg,
  printMode = "single",
}: DocumentSheetProps) {
  const host = validationHost(validationUrl);
  const socialName = patient.social_name?.trim() || null;
  const signature = professional.signature_image?.trim() || null;
  const multi = printMode === "multi";

  const sheet = (
    <article
      className={`theme-paper ${multi ? "print-sheet" : "print-area"} mx-auto flex min-h-[280mm] w-full max-w-[210mm] flex-col bg-white p-[18mm] text-ink shadow-[0_2px_16px_rgba(22,51,43,0.12)]`}
    >
      {document.revoked_at ? (
        <div
          role="status"
          className="mb-6 rounded-lg border-2 border-rose-600 bg-rose-50 px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.15em] text-rose-700"
        >
          Revogado em {fmtDate(document.revoked_at)}
          {document.revoke_reason ? <span className="normal-case tracking-normal"> — {document.revoke_reason}</span> : null}
        </div>
      ) : null}

      <header className="border-b-2 border-pine-900 pb-4">
        <p className="font-display text-2xl font-semibold text-pine-950">{clinic.name}</p>
        {clinic.line ? <p className="mt-1 text-xs text-pine-900/60">{clinic.line}</p> : null}
      </header>

      <h1 className="mt-10 text-center font-display text-xl font-semibold uppercase tracking-[0.2em] text-pine-950">
        {document.title}
      </h1>

      <div className="mt-8 space-y-1 text-sm">
        <p>
          <span className="font-bold">Paciente:</span> {socialName ?? patient.name}
        </p>
        {socialName ? (
          <p className="text-xs text-pine-900/70">
            <span className="font-bold">Nome civil:</span> {patient.name}
          </p>
        ) : null}
        {patient.cpf ? (
          <p>
            <span className="font-bold">CPF:</span> {patient.cpf}
          </p>
        ) : null}
        <p>
          <span className="font-bold">Data:</span> {fmtDateLong(document.issued_at)}
        </p>
      </div>

      <div className="mt-10 flex-1">
        <p className="whitespace-pre-line text-justify text-base leading-8">{document.body}</p>
      </div>

      <footer className="mt-16 flex flex-col items-center gap-1 pb-2 text-center text-sm">
        {signature ? (
          // Data URL vinda do banco: <img> mesmo — o next/image não faz sentido aqui.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signature} alt="" className="mx-auto mb-1 h-[16mm] w-auto max-w-[60mm] object-contain" />
        ) : null}
        <div className="w-72 border-t border-ink pt-2">
          <p className="font-bold">{professional.name}</p>
          <p className="text-xs text-pine-900/70">{stampLine(professional)}</p>
        </div>
      </footer>

      <div className="mt-10 flex items-center gap-4 border-t border-pine-900/15 pt-4">
        {qrSvg ? (
          <div
            role="img"
            aria-label={`QR code para validar o documento em ${host}`}
            className="h-[24mm] w-[24mm] shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : null}
        <div className="min-w-0 text-xs text-pine-900/70">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-pine-900/50">Código de autenticidade</p>
          <p className="mt-0.5 font-mono text-base font-bold tracking-wider text-pine-950">{document.code}</p>
          <p className="mt-1">
            Confira a autenticidade em <span className="font-semibold text-pine-950">{host}</span>
          </p>
        </div>
      </div>
    </article>
  );

  // "multi": quem monta a pilha de folhas já encolhe cada uma (e cuida das quebras
  // de página). "single": no celular a folha é encolhida aqui para caber na largura
  // — A4 não refaz linhas; o FitWidth desfaz tudo com `print:`, e a impressão sai igual.
  if (multi) return sheet;
  return (
    <>
      <style>{PRINT_STYLE}</style>
      <FitWidth width={SHEET_PX}>{sheet}</FitWidth>
    </>
  );
}
