"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { PrescriptionItem } from "@/lib/prescription";
import { DEFAULT_SHEET_STYLE, RULE_HEIGHT, SCALE_FACTOR, tint } from "@/lib/sheet-style";
import type { SheetStyle } from "@/lib/sheet-style";

/**
 * A prévia da folha, ao lado do editor.
 *
 * É uma **cópia fiel em HTML** do que `pdf/document-pdf.ts` desenha — mesmo
 * cabeçalho com régua roxa, painel do paciente, selo da via, blocos de
 * medicamento, rodapé com código e carimbo. Não é o arquivo: acompanha cada
 * tecla sem ir ao servidor, e o botão "Ver o PDF real" abre o PDF de verdade
 * quando o médico quiser conferir milímetro.
 *
 * ⚠ Se a folha do PDF mudar, esta prévia tem de mudar junto — são dois
 * desenhos da mesma coisa, e uma prévia que mente é pior que nenhuma. Os
 * números abaixo espelham os de `document-pdf.ts`: A4 595,28 × 841,89 pt,
 * margem 48, régua 2,5, painel 50 de altura.
 */

export const A4_W = 595.28;
export const A4_H = 841.89;
const M = 48;

export interface PreviewProfessional {
  name: string;
  council: string;
  specialty?: string | null;
  rqe?: string | null;
}

export interface DocumentPreviewProps {
  title: string;
  body: string;
  /** Receituário: sai em blocos, como no PDF. */
  medications?: readonly PrescriptionItem[];
  /** dd/mm/aaaa. */
  date: string;
  code: string;
  clinicName: string;
  clinicLine?: string | null;
  clinicCnes?: string | null;
  patientName: string;
  patientCpf?: string | null;
  professional: PreviewProfessional | null;
  /** "1ª via — Farmácia (retenção)" etc. */
  viaLabel?: string | null;
  /** Receituário na página grande da prévia: os medicamentos da folha respondem ao mouse. */
  canvas?: SheetCanvas;
  /** Modelo da folha (mesmo do PDF); sem ele, o padrão Renova. */
  sheetStyle?: SheetStyle;
  /** O logotipo do modelo, como data URL. */
  logoSrc?: string | null;
}

/** As cores do modelo — as mesmas contas de `lookFor` no PDF. */
function sheetColors(style: SheetStyle) {
  const renova = style.accent === DEFAULT_SHEET_STYLE.accent;
  return {
    accent: style.accent,
    soft: renova ? "#6c3db5" : tint(style.accent, 0.22),
    panel: renova ? "#f8f4fb" : tint(style.accent, 0.955),
    seal: renova ? "#ffd6dc" : tint(style.accent, 0.84),
  };
}

/**
 * A folha como parte da montagem: cada medicamento pode ser achado no editor
 * (clique), subir, descer, sair, ou ser arrastado para outra posição.
 * `indexes[i]` é a posição do i-ésimo medicamento da folha na lista do editor.
 */
export interface SheetCanvas {
  indexes: readonly number[];
  /** Posição (na lista do editor) que acabou de entrar ou foi escolhida: pisca na folha. */
  highlight: number | null;
  onSelect(index: number): void;
  onMove(from: number, to: number): void;
  onRemove(index: number): void;
}

/** Arrastar dentro da folha: tipo próprio, para não confundir com o que vem do editor. */
const SHEET_MOVE_TYPE = "application/x-renova-rx-move";

/** Uma escala só para a folha inteira: o desenho é em pontos, como no PDF. */
export function DocumentPreview(props: DocumentPreviewProps) {
  const {
    title, body, medications, date, code,
    clinicName, clinicLine, clinicCnes,
    patientName, patientCpf, professional, viaLabel, canvas,
    sheetStyle = DEFAULT_SHEET_STYLE, logoSrc,
  } = props;
  const look = sheetColors(sheetStyle);
  const k = SCALE_FACTOR[sheetStyle.scale];
  const list = sheetStyle.meds === "lista";
  const centered = sheetStyle.align === "center";
  const logo = sheetStyle.logo && logoSrc ? logoSrc : null;

  const items = useMemo(
    () => (medications ?? []).filter((m) => m.name.trim() && m.posology.trim()),
    [medications]
  );

  const campos: [string, string][] = [
    ["Paciente", patientName || "—"],
    ["CPF", patientCpf?.trim() || "—"],
    ["Data", date],
    ["Documento", code || "—"],
  ];

  return (
    <div
      className="origin-top-left bg-white shadow-[0_2px_16px_rgba(22,51,43,0.12)]"
      style={{
        width: A4_W,
        // Mínimo de uma folha: o que não cabe continua embaixo (o PDF abre outra página)
        // em vez de sumir cortado, como acontecia com a altura fixa.
        minHeight: A4_H,
        display: "flex",
        flexDirection: "column",
        // O contêiner pai controla o zoom; aqui a folha tem tamanho de folha.
        padding: `${M}px`,
        fontFamily: '"Plus Jakarta Sans Variable", ui-sans-serif, system-ui, sans-serif',
        color: "#2b2633",
      }}
      aria-label="Prévia da folha"
    >
      {/* ── Cabeçalho ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: centered ? "column" : "row",
          alignItems: centered ? "center" : "flex-start",
          gap: centered ? 8 : 12,
          textAlign: centered ? "center" : "left",
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL do modelo, igual ao do PDF
          <img src={logo} alt="" style={{ maxWidth: 120, maxHeight: 40, objectFit: "contain", flex: "none" }} />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: look.accent, lineHeight: 1.2 }}>{clinicName}</p>
          {sheetStyle.headerNote ? <p style={{ fontSize: 8, color: "#736d7d", marginTop: 5 }}>{sheetStyle.headerNote}</p> : null}
          {sheetStyle.showClinicLine && clinicLine ? (
            <p style={{ fontSize: 8, color: "#736d7d", marginTop: sheetStyle.headerNote ? 3 : 5 }}>{clinicLine}</p>
          ) : null}
          {sheetStyle.showCnes && clinicCnes ? <p style={{ fontSize: 8, color: "#736d7d", marginTop: 3 }}>CNES {clinicCnes}</p> : null}
        </div>
      </div>
      <div style={{ height: RULE_HEIGHT[sheetStyle.rule], background: look.accent, marginTop: 13 }} />

      {/* ── Título + selo da via ──────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 24 }}>
        <p style={{ fontSize: 16, fontWeight: 800 }}>{title || "Documento"}</p>
        {viaLabel ? (
          <span
            style={{
              fontSize: 8, fontWeight: 800, color: look.accent, background: look.seal,
              borderRadius: 9, padding: "4px 9px", whiteSpace: "nowrap",
            }}
          >
            {viaLabel}
          </span>
        ) : null}
      </div>

      {/* ── Painel do paciente ────────────────────── */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1.9fr 1.1fr 0.9fr 1.1fr", gap: 8,
          marginTop: 18, height: 50, alignContent: "center",
          ...(sheetStyle.patientPanel === "faixa"
            ? { background: look.panel, borderRadius: 8, padding: "12px 16px" }
            : { borderTop: "0.8px solid #e0dbe8", borderBottom: "0.8px solid #e0dbe8", padding: "12px 0" }),
        }}
      >
        {campos.map(([rot, val]) => (
          <div key={rot} style={{ minWidth: 0 }}>
            <p style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: ".07em", color: "#736d7d", textTransform: "uppercase" }}>
              {rot}
            </p>
            <p
              style={{ fontSize: 10, fontWeight: 800, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={val}
            >
              {val}
            </p>
          </div>
        ))}
      </div>

      {/* ── Corpo ─────────────────────────────────── */}
      <div style={{ marginTop: 26, flex: 1 }}>
        {items.length > 0 ? (
          <div style={{ display: "grid", gap: list ? 8 : 10 }}>
            {items.map((item, i) => {
              const block = (
                <>
                  {list ? null : (
                    <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: look.soft, borderRadius: "6px 0 0 6px" }} />
                  )}
                  <span style={{ position: "absolute", left: list ? 0 : 15, top: list ? 0 : 10, fontSize: 12 * k, fontWeight: 800, color: look.soft }}>
                    {list ? `${i + 1})` : i + 1}
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 11 * k, fontWeight: 800 }}>{item.name}</span>
                    {item.quantity ? <span style={{ fontSize: 9 * k, color: "#736d7d", whiteSpace: "nowrap" }}>{item.quantity}</span> : null}
                  </div>
                  <p style={{ fontSize: 9.5 * k, marginTop: 5 * k, lineHeight: 1.45 }}>
                    {[item.posology.trim(), item.route, item.continuous ? "Uso contínuo" : ""].filter(Boolean).join(". ")}.
                  </p>
                </>
              );
              const frame = list
                ? { position: "relative" as const, padding: `0 0 2px ${19 * k}px`, borderTop: i > 0 ? "0.6px solid #e0dbe8" : undefined, paddingTop: i > 0 ? 8 : 0 }
                : { border: "0.8px solid #e0dbe8", borderRadius: 6, position: "relative" as const, padding: `${11 * k}px 15px ${11 * k}px ${15 + 19 * k}px` };
              const index = canvas?.indexes[i];
              if (!canvas || index === undefined || index < 0) {
                return (
                  <div key={i} style={frame}>
                    {block}
                  </div>
                );
              }
              return (
                <CanvasBlock
                  key={i}
                  canvas={canvas}
                  index={index}
                  name={item.name}
                  previous={canvas.indexes[i - 1]}
                  next={canvas.indexes[i + 1]}
                  frame={frame}
                >
                  {block}
                </CanvasBlock>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 10.5 * k, lineHeight: `${17 * k}px`, whiteSpace: "pre-wrap" }}>
            {body.trim() || "O texto do documento aparece aqui."}
          </p>
        )}
      </div>

      {/* ── Rodapé: colado embaixo, como no PDF ───── */}
      <div style={{ marginTop: 20, flex: "none" }}>
        {sheetStyle.footerNote ? (
          <p style={{ fontSize: 8, color: "#736d7d", marginBottom: 6, textAlign: centered ? "center" : "left" }}>{sheetStyle.footerNote}</p>
        ) : null}
        <div style={{ height: 0.8, background: "#e0dbe8" }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginTop: 20 }}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            {/* O QR real entra no PDF; aqui basta o lugar dele. */}
            <div
              style={{ width: 54, height: 54, border: "0.8px solid #e0dbe8", borderRadius: 4, display: "grid", placeItems: "center", flex: "none" }}
              aria-hidden
            >
              <span style={{ fontSize: 6.5, color: "#a49dae", textAlign: "center", lineHeight: 1.3 }}>QR de<br />validação</span>
            </div>
            <div>
              <p style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: ".07em", color: "#736d7d", textTransform: "uppercase" }}>
                Confira a autenticidade
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: look.accent, marginTop: 6 }}>{code || "RNV-————-————"}</p>
              <p style={{ fontSize: 7.5, color: "#736d7d", marginTop: 3 }}>renovaapp.vercel.app/validar/{code}</p>
            </div>
          </div>

          <div style={{ width: 232, flex: "none", textAlign: "center" }}>
            <div style={{ height: 40 }} />
            <div style={{ height: 0.8, background: "#2b2633" }} />
            <p style={{ fontSize: 8, color: "#736d7d", marginTop: 6 }}>{professional?.name || "Profissional"}</p>
            {professional?.specialty ? <p style={{ fontSize: 8, color: "#736d7d", marginTop: 2 }}>{professional.specialty}</p> : null}
            <p style={{ fontSize: 8, color: "#736d7d", marginTop: 2 }}>
              {[professional?.council, professional?.rqe ? `RQE ${professional.rqe}` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Botões pequenos no canto do medicamento: na escala da folha (pontos), como o resto. */
const SHEET_TOOL =
  "flex h-[24px] min-w-[24px] items-center justify-center rounded-[6px] px-1.5 text-[11.5px] font-extrabold text-[#3d0e6b] hover:bg-[#efe6fa] disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * Um medicamento da folha que responde: passar o mouse contorna e mostra
 * ↑ ↓ ✕; clicar acha o item no editor; arrastar muda a ordem no papel.
 */
function CanvasBlock({
  canvas,
  index,
  name,
  previous,
  next,
  frame,
  children,
}: {
  canvas: SheetCanvas;
  index: number;
  name: string;
  /** Moldura do item conforme o modelo (bloco ou lista). */
  frame: CSSProperties;
  /** Vizinhos neste papel (posições na lista do editor). */
  previous: number | undefined;
  next: number | undefined;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const lit = canvas.highlight === index;
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      aria-label={`${name}: editar no receituário`}
      title="Clique para editar · arraste para mudar a ordem"
      onClick={() => canvas.onSelect(index)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          canvas.onSelect(index);
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData(SHEET_MOVE_TYPE, String(index));
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(SHEET_MOVE_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        const from = Number(event.dataTransfer.getData(SHEET_MOVE_TYPE));
        if (!event.dataTransfer.types.includes(SHEET_MOVE_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        canvas.onMove(from, index);
      }}
      className="group/med cursor-pointer outline-none transition-[box-shadow,background-color] duration-500 hover:shadow-[0_0_0_1.5px_#9b6ad6] focus-visible:shadow-[0_0_0_1.5px_#6c3db5]"
      style={{
        ...frame,
        background: lit ? "#f6effd" : over ? "#faf7fd" : undefined,
        boxShadow: lit ? "0 0 0 2px #6c3db5" : over ? "0 -2px 0 0 #6c3db5" : undefined,
      }}
    >
      {children}
      <div
        className="absolute -top-[15px] right-2 hidden items-center gap-0.5 rounded-[8px] border border-[#e2d6f1] bg-white p-px shadow-sm group-hover/med:flex group-focus-within/med:flex"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={SHEET_TOOL}
          disabled={previous === undefined}
          onClick={() => previous !== undefined && canvas.onMove(index, previous)}
          aria-label={`Subir ${name}`}
          title="Subir"
        >
          ↑
        </button>
        <button
          type="button"
          className={SHEET_TOOL}
          disabled={next === undefined}
          onClick={() => next !== undefined && canvas.onMove(index, next)}
          aria-label={`Descer ${name}`}
          title="Descer"
        >
          ↓
        </button>
        <button
          type="button"
          className={SHEET_TOOL}
          onClick={() => canvas.onSelect(index)}
          aria-label={`Editar ${name}`}
          title="Editar no receituário"
        >
          Editar
        </button>
        <button
          type="button"
          className={`${SHEET_TOOL} text-rose-600 hover:bg-rose-50`}
          onClick={() => canvas.onRemove(index)}
          aria-label={`Tirar ${name} da receita`}
          title="Tirar da receita"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
