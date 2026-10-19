"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { DocumentPreview, A4_W } from "../document-preview";
import type { DocumentPreviewProps } from "../document-preview";
import type { PrescriptionItem } from "@/lib/prescription";
import {
  ACCENT_SWATCHES,
  DEFAULT_SHEET_STYLE,
  MAX_LOGO_BYTES,
  SHEET_PRESETS,
  checkLogo,
} from "@/lib/sheet-style";
import type { SheetStyle, SheetTemplate } from "@/lib/sheet-style";
import { deleteSheetTemplateAction, saveSheetTemplateAction, uploadSheetLogoAction } from "@/lib/actions-sheet";

/**
 * "Modelo da folha", na revisão da emissão: escolher entre os modelos prontos
 * e os salvos, ou abrir o editor ("Personalizar") — cor, logotipo,
 * alinhamento, letra, medicamentos em blocos ou lista, linhas extras — com a
 * folha ao lado mudando a cada clique. O que se monta pode ser salvo como
 * modelo (meu ou, para o administrador, da clínica).
 *
 * Nenhum controle aqui tem `name`: o estilo vai para a emissão por um campo
 * só (`sheet_style`), escrito pelo compositor.
 */

export type SheetChoice = `preset:${string}` | `tpl:${string}` | "custom";

type SheetProps = Omit<DocumentPreviewProps, "title" | "body" | "medications" | "viaLabel" | "canvas" | "sheetStyle" | "logoSrc">;

export interface SheetStylePanelProps {
  style: SheetStyle;
  choice: SheetChoice;
  onChange(style: SheetStyle, choice: SheetChoice): void;
  templates: SheetTemplate[];
  onTemplatesChange(templates: SheetTemplate[]): void;
  logos: Record<string, string>;
  onLogo(hash: string, dataUrl: string): void;
  /** Recepção não personaliza; administrador salva para a clínica. */
  canEdit: boolean;
  canSaveForClinic: boolean;
  professionalId: number;
  /** A folha de exemplo usa o que está sendo emitido. */
  sheet: SheetProps;
  sampleItems: readonly PrescriptionItem[];
}

const SAMPLE: PrescriptionItem[] = [
  { name: "AMOXICILINA 500 MG", concentration: "500 MG", tarja: "vermelha", quantity: "21 cápsulas", posology: "Tomar 1 cápsula de 8 em 8 horas por 7 dias", route: "Via oral", continuous: false },
  { name: "DIPIRONA 500 MG", concentration: "500 MG", tarja: "livre", quantity: "1 caixa", posology: "Tomar 1 comprimido de 6 em 6 horas se dor ou febre", route: "Via oral", continuous: false },
];

export function SheetStylePanel(props: SheetStylePanelProps) {
  const { style, choice, onChange, templates, canEdit } = props;
  const [editing, setEditing] = useState(false);
  const options: { id: SheetChoice; name: string; style: SheetStyle; badge?: string }[] = [
    ...SHEET_PRESETS.map((p) => ({ id: `preset:${p.id}` as SheetChoice, name: p.name, style: p.style })),
    ...templates.map((t) => ({
      id: `tpl:${t.id}` as SheetChoice,
      name: t.name,
      style: t.style,
      badge: t.professional_id === null ? "Clínica" : "Meu",
    })),
  ];

  return (
    <section className="card p-4 sm:p-5" aria-label="Modelo da folha">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold text-pine-900/55">Modelo da folha</p>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="-my-2 min-h-11 rounded-full px-3 text-xs font-bold text-pine-600 hover:bg-pine-50 sm:my-0 sm:min-h-0 sm:py-1"
          >
            Personalizar
          </button>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Modelos">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={choice === o.id}
            onClick={() => onChange(o.style, o.id)}
            className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[12px] font-semibold ${
              choice === o.id ? "border-pine-600 bg-pine-50 text-pine-950" : "border-pine-900/10 text-pine-900/80 hover:bg-pine-50/60"
            }`}
          >
            <span aria-hidden className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: o.style.accent }} />
            <span className="min-w-0 flex-1 truncate">{o.name}</span>
            {o.badge ? <span className="chip shrink-0 bg-white text-[10px] text-pine-700 ring-1 ring-pine-900/10">{o.badge}</span> : null}
          </button>
        ))}
        {choice === "custom" ? (
          <span className="flex min-h-11 items-center gap-2 rounded-xl border border-pine-600 bg-pine-50 px-2.5 py-2 text-[12px] font-semibold text-pine-950">
            <span aria-hidden className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: style.accent }} />
            Personalizado (só nesta emissão)
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-pine-900/50">
        Muda só a aparência. Título, paciente, data, código de autenticidade, carimbo e vias saem em qualquer modelo.
      </p>
      {/* Portal: dentro do pop-up do compositor, um "fixed" ficaria preso à caixa dele. */}
      {editing ? createPortal(<SheetStyleEditor {...props} onClose={() => setEditing(false)} />, document.body) : null}
    </section>
  );
}

/* ---------- Editor ---------- */

function SheetStyleEditor({
  style: initial,
  choice,
  onChange,
  templates,
  onTemplatesChange,
  logos,
  onLogo,
  canSaveForClinic,
  professionalId,
  sheet,
  sampleItems,
  onClose,
}: SheetStylePanelProps & { onClose(): void }) {
  const [style, setStyle] = useState<SheetStyle>(initial);
  const editingTemplate = choice.startsWith("tpl:") ? templates.find((t) => `tpl:${t.id}` === choice) ?? null : null;
  const [name, setName] = useState(editingTemplate?.name ?? "");
  const [scope, setScope] = useState<"meu" | "clinica">(editingTemplate?.professional_id === null && canSaveForClinic ? "clinica" : "meu");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "erro"; text: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof SheetStyle>(key: K, value: SheetStyle[K]) => setStyle((s) => ({ ...s, [key]: value }));

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    const dataUrl = await shrinkImage(file);
    if (!dataUrl) return setMessage({ tone: "erro", text: "Não consegui ler a imagem. Use PNG ou JPEG." });
    const check = checkLogo(dataUrl);
    if (!check.ok) return setMessage({ tone: "erro", text: check.reason });
    setBusy(true);
    try {
      const result = await uploadSheetLogoAction(dataUrl);
      if (!result.ok) return setMessage({ tone: "erro", text: result.error });
      onLogo(result.hash, dataUrl);
      set("logo", result.hash);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await saveSheetTemplateAction({
        id: editingTemplate && name.trim() === editingTemplate.name ? editingTemplate.id : null,
        name,
        scope,
        professionalId,
        style,
      });
      if (!result.ok) return setMessage({ tone: "erro", text: result.error });
      onTemplatesChange(result.templates);
      onChange(style, `tpl:${result.id}`);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editingTemplate) return;
    setBusy(true);
    try {
      const result = await deleteSheetTemplateAction(editingTemplate.id);
      if (!result.ok) return setMessage({ tone: "erro", text: result.error });
      onTemplatesChange(result.templates);
      onChange(DEFAULT_SHEET_STYLE, "preset:renova");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const items = sampleItems.filter((i) => i.name.trim() && i.posology.trim());

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-pine-950/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Personalizar a folha"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-dvh w-full max-w-6xl flex-col overflow-hidden bg-white outline-none sm:max-h-[92dvh] sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-pine-900/10 px-4 py-3 sm:px-5">
          <p className="font-display text-lg font-extrabold text-pine-950">Personalizar a folha</p>
          <button type="button" onClick={onClose} className="btn btn-ghost min-h-11 px-3 text-xs sm:min-h-0">
            Fechar
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:overflow-hidden">
          {/* Controles */}
          <div className="space-y-5 p-4 sm:p-5 lg:overflow-y-auto">
            <Field label="Cor">
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    aria-pressed={style.accent === c}
                    onClick={() => set("accent", c)}
                    className={`h-11 w-11 rounded-full ring-offset-2 sm:h-8 sm:w-8 ${style.accent === c ? "ring-2 ring-pine-700" : "ring-1 ring-black/10"}`}
                    style={{ background: c }}
                  />
                ))}
                <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-pine-900/70 sm:min-h-0">
                  <input type="color" value={style.accent} onChange={(e) => set("accent", e.target.value)} className="h-8 w-10 cursor-pointer rounded" />
                  Outra
                </label>
              </div>
            </Field>

            <Field label="Logotipo">
              <div className="flex flex-wrap items-center gap-2">
                {style.logo && logos[style.logo] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- prévia do logotipo enviado
                  <img src={logos[style.logo]} alt="Logotipo atual" className="h-10 max-w-[120px] rounded border border-pine-900/10 object-contain p-1" />
                ) : null}
                <label className="btn btn-outline min-h-11 cursor-pointer px-3 text-xs sm:min-h-0">
                  {style.logo ? "Trocar imagem" : "Enviar imagem"}
                  <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => void pickLogo(e.target.files?.[0])} disabled={busy} />
                </label>
                {style.logo ? (
                  <button type="button" onClick={() => set("logo", null)} className="btn btn-ghost min-h-11 px-3 text-xs text-rose-700 sm:min-h-0">
                    Tirar
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-pine-900/50">PNG ou JPEG; imagens grandes são reduzidas.</p>
            </Field>

            <Segmented label="Cabeçalho" value={style.align} onChange={(v) => set("align", v)} options={[["left", "À esquerda"], ["center", "Centralizado"]]} />
            <Segmented label="Régua" value={style.rule} onChange={(v) => set("rule", v)} options={[["grossa", "Grossa"], ["fina", "Fina"], ["nenhuma", "Sem"]]} />
            <Segmented label="Letra" value={style.scale} onChange={(v) => set("scale", v)} options={[["compacta", "Compacta"], ["normal", "Normal"], ["grande", "Grande"]]} />
            <Segmented label="Medicamentos" value={style.meds} onChange={(v) => set("meds", v)} options={[["blocos", "Em blocos"], ["lista", "Em lista"]]} />
            <Segmented label="Dados do paciente" value={style.patientPanel} onChange={(v) => set("patientPanel", v)} options={[["faixa", "Em faixa"], ["linhas", "Entre linhas"]]} />

            <Field label="No cabeçalho">
              <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
                <input type="checkbox" checked={style.showClinicLine} onChange={(e) => set("showClinicLine", e.target.checked)} className="h-4 w-4 accent-pine-700" />
                Endereço, telefone e CNPJ
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
                <input type="checkbox" checked={style.showCnes} onChange={(e) => set("showCnes", e.target.checked)} className="h-4 w-4 accent-pine-700" />
                CNES
              </label>
              <input
                className="input mt-2"
                aria-label="Linha a mais no cabeçalho"
                placeholder="Linha a mais (ex.: Clínica geral · Saúde da família)"
                maxLength={140}
                value={style.headerNote}
                onChange={(e) => set("headerNote", e.target.value)}
              />
            </Field>

            <Field label="Acima do rodapé">
              <input
                className="input"
                aria-label="Nota acima do rodapé"
                placeholder="Ex.: Validade da receita: 30 dias"
                maxLength={140}
                value={style.footerNote}
                onChange={(e) => set("footerNote", e.target.value)}
              />
            </Field>

            <div className="space-y-2 rounded-2xl border border-pine-900/10 bg-pine-50/40 p-3">
              <p className="text-xs font-bold text-pine-900/60">Salvar como modelo</p>
              <input className="input" aria-label="Nome do modelo" placeholder="Nome (ex.: Receita do consultório)" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
              {canSaveForClinic ? (
                <div className="flex flex-wrap gap-3 text-sm">
                  <label className="flex min-h-11 items-center gap-2 sm:min-h-0">
                    <input type="radio" checked={scope === "meu"} onChange={() => setScope("meu")} className="accent-pine-700" />
                    Só meu
                  </label>
                  <label className="flex min-h-11 items-center gap-2 sm:min-h-0">
                    <input type="radio" checked={scope === "clinica"} onChange={() => setScope("clinica")} className="accent-pine-700" />
                    Para a clínica toda
                  </label>
                </div>
              ) : null}
              {editingTemplate ? (
                <p className="text-[11px] text-pine-900/55">
                  Com o mesmo nome, atualiza “{editingTemplate.name}”; com outro nome, cria um modelo novo.
                </p>
              ) : null}
            </div>

            {message ? (
              <p role="status" className={`text-sm font-semibold ${message.tone === "erro" ? "text-rose-700" : "text-emerald-700"}`}>
                {message.text}
              </p>
            ) : null}
          </div>

          {/* Folha ao vivo */}
          <div className="min-w-0 border-t border-pine-900/10 bg-pine-50/50 p-3 sm:p-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <ScaledSheet>
              <DocumentPreview
                {...sheet}
                title="Receituário simples"
                body=""
                medications={items.length ? items : SAMPLE}
                sheetStyle={style}
                logoSrc={style.logo ? logos[style.logo] ?? null : null}
              />
            </ScaledSheet>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-pine-900/10 px-4 py-3 sm:px-5">
          {editingTemplate ? (
            <button type="button" onClick={() => void remove()} disabled={busy} className="btn btn-ghost mr-auto min-h-11 px-3 text-xs text-rose-700 sm:min-h-0">
              Apagar “{editingTemplate.name}”
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onChange(style, "custom");
              onClose();
            }}
            className="btn btn-outline min-h-11 sm:min-h-0"
          >
            Usar só nesta emissão
          </button>
          <button type="button" onClick={() => void save()} disabled={busy || !name.trim()} className="btn btn-primary min-h-11 sm:min-h-0">
            {busy ? "Salvando…" : "Salvar modelo e usar"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange(value: T): void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <Field label={label}>
      <div className="flex rounded-xl border border-pine-900/10 p-0.5" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`min-h-11 flex-1 rounded-[10px] px-2 text-[12px] font-bold sm:min-h-8 ${
              value === v ? "bg-pine-700 text-white" : "text-pine-900/70 hover:bg-pine-50"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** A folha A4 (em pontos) encolhida para caber na largura disponível. */
function ScaledSheet({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const box = boxRef.current;
    const sheetEl = sheetRef.current;
    if (!box || !sheetEl) return;
    const measure = () => {
      const s = Math.min(1, box.clientWidth / A4_W);
      setScale(s);
      setHeight(sheetEl.offsetHeight * s);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(sheetEl);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={boxRef} className="mx-auto w-full max-w-[595px]" style={{ height: height || undefined }}>
      <div ref={sheetRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: A4_W }}>
        {children}
      </div>
    </div>
  );
}

/** Imagem → data URL que cabe no limite: reduz para no máximo 600 × 200 se precisar. */
async function shrinkImage(file: File): Promise<string | null> {
  const original = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
  if (!original) return null;
  if (file.size <= MAX_LOGO_BYTES && /^data:image\/(png|jpeg);/.test(original)) return original;
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = original;
  });
  if (!img) return null;
  const scale = Math.min(600 / img.width, 200 / img.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  const png = canvas.toDataURL("image/png");
  return png.length * 0.75 <= MAX_LOGO_BYTES ? png : canvas.toDataURL("image/jpeg", 0.85);
}
