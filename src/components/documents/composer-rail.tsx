"use client";

import { Feedback } from "@/components/feedback";
import { CloseButton } from "@/components/close-button";
import { memo, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import Link from "next/link";
import { updatePatientEssentialsAction } from "@/lib/actions";
import { MAX_COMPOSER_ITEMS } from "@/lib/composer";
import type { ComposerTemplate } from "@/lib/composer";
import {
  RAIL_DRAWERS,
  RAIL_STORAGE_KEY,
  TEMPLATE_FILTERS,
  filterTemplates,
  groupByYear,
  isRailDrawer,
  shortDayMonth,
} from "@/lib/composer-rail";
import type { RailDrawer, TemplateFilter } from "@/lib/composer-rail";
import {
  DOCUMENT_KIND_LABEL,
  PROTOCOL_KIND,
  documentTitle,
  documentWhatsAppMessage,
  patientDisplayName,
  patientFirstName,
  protocolSummary,
} from "@/lib/documents";
import type { DocumentKind } from "@/lib/documents";
import { ageFrom, waLink } from "@/lib/format";
import { splitLines } from "@/lib/hub-forms";
import { IconClock, IconDocDuo, IconFaceDuo } from "@/components/icons";
import type { ComposerActions } from "./composer/types";

/**
 * Os atalhos do compositor — Perfil e Histórico do paciente; Modelos e Ajuda
 * de quem prescreve — numa linha discreta no alto, ao lado das etapas (antes
 * era uma coluna de 64px à direita, que roubava largura da prévia). Uma gaveta
 * por vez, que abre como um cartão logo abaixo da linha, por cima do editor. Abaixo do lg o rail vira uma barra de quatro botões
 * acima do editor e a gaveta é uma folha que sobe de baixo (como o Modal),
 * com fundo escurecido; tocar num modelo aplica e fecha a folha — no toque
 * não existe arrastar. Esc fecha; no desktop a gaveta aberta fica lembrada
 * no sessionStorage (a Ajuda não: é só um lembrete; no celular também não:
 * uma folha que se abre sozinha no F5 atrapalha). Tudo o que mexe na pilha
 * passa por `ComposerActions` (emit-composer.tsx).
 *
 * As gavetas ficam DENTRO do <form> da emissão, então nenhum controle aqui
 * tem `name`: o Perfil monta o FormData na mão e chama a Server Action. Como
 * ela redireciona, o Next remonta o compositor — a pilha volta do
 * sessionStorage e a gaveta aberta também.
 */

/** O `redirect()` de uma Server Action chega ao navegador como erro NEXT_REDIRECT; é o RedirectBoundary que navega. */
function isNextRedirect(error: unknown): boolean {
  const digest = typeof error === "object" && error !== null ? (error as { digest?: unknown }).digest : undefined;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export interface RailPatient {
  id: number;
  name: string;
  social_name: string | null;
  cpf: string | null;
  phone: string | null;
  birth_date: string | null;
  allergies: string | null;
  medications: string | null;
}

/** Uma linha de `documents` com o nome de quem assinou (DocumentListRow serve). */
export interface RailDocument {
  id: number;
  kind: DocumentKind;
  subkind: string | null;
  title: string;
  body: string;
  fields: string | null;
  code: string;
  /** YYYY-MM-DD */
  issued_at: string;
  shared_with_patient: number;
  revoked_at: string | null;
  professional_name: string;
}

export interface ComposerRailProps {
  patient: RailPatient;
  documents: RailDocument[];
  templates: ComposerTemplate[];
  actions: ComposerActions;
  clinicName: string;
  portalUrl: string;
  canManageTemplates: boolean;
  /** Para onde a ação do Perfil volta: o compositor, com o tipo e o atendimento atuais. */
  backUrl: string;
  className?: string;
}

const DRAWER_LABEL: Record<RailDrawer, string> = {
  perfil: "Perfil",
  historico: "Histórico",
  modelos: "Modelos",
};

/** Sob qual legenda cada botão fica. */
const DRAWER_GROUP: Record<RailDrawer, "paciente" | "voce"> = {
  perfil: "paciente",
  historico: "paciente",
  modelos: "voce",
};

// No celular: quatro botões quadrados. No desktop: pílulas discretas numa linha, ao lado das etapas.
const RAIL_BTN =
  "flex h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-bold transition-colors lg:h-9 lg:w-auto lg:flex-row lg:gap-1.5 lg:rounded-full lg:px-3.5 lg:text-[12.5px]";
const RAIL_BTN_IDLE =
  "border-[#e2dcec] bg-white text-ink hover:border-pine-400 lg:border-transparent lg:bg-transparent lg:text-pine-900/70 lg:hover:border-transparent lg:hover:bg-pine-50 lg:hover:text-pine-950";
const RAIL_BTN_ACTIVE = "border-transparent bg-peach-100 text-pine-950";
const RAIL_ICON = "h-5 w-5 lg:h-4 lg:w-4";

/**
 * O cartão da gaveta: folha presa embaixo abaixo do lg (acima da barra de
 * abas, que é z-40), flutuando à esquerda do rail no desktop.
 */
const DRAWER_CARD =
  "card sheet-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-b-none pb-[env(safe-area-inset-bottom)] outline-none focus-visible:ring-2 focus-visible:ring-pine-500/30 lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-0 lg:top-full lg:z-30 lg:mt-2 lg:block lg:max-h-none lg:w-96 lg:rounded-b-[18px] lg:pb-0 lg:[animation:none]";

/** Abaixo do lg as gavetas são folhas por cima de tudo. */
const SHEET_QUERY = "(max-width: 1023.98px)";

function isSheetViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(SHEET_QUERY).matches;
}

/** O puxador da folha e o fundo escurecido: só existem abaixo do lg. */
function SheetGrip() {
  return <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-[#e2dcec] lg:hidden" aria-hidden />;
}


function DrawerIcon({ drawer, className }: { drawer: RailDrawer; className?: string }) {
  if (drawer === "perfil") return <IconFaceDuo className={className} />;
  if (drawer === "historico") return <IconClock className={className} />;
  return <IconDocDuo className={className} />;
}

function IconHelp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
    </svg>
  );
}

function persistDrawer(next: RailDrawer | null) {
  try {
    if (next) window.sessionStorage.setItem(RAIL_STORAGE_KEY, next);
    else window.sessionStorage.removeItem(RAIL_STORAGE_KEY);
  } catch {
    // Sem sessionStorage: a gaveta simplesmente não fica lembrada.
  }
}

const SMALL_BTN = "btn px-3 py-1 text-xs";

/**
 * Memo: o compositor passa `actions` e `patient` estáveis, então o rail (e as
 * gavetas) só refaz quando a pilha muda — não a cada tecla no editor.
 */
export const ComposerRail = memo(function ComposerRail({
  patient,
  documents,
  templates,
  actions,
  clinicName,
  portalUrl,
  canManageTemplates,
  backUrl,
  className,
}: ComposerRailProps) {
  const [open, setOpen] = useState<RailDrawer | null>(null);
  const [help, setHelp] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);

  // A gaveta lembrada só entra depois da hidratação (o servidor não conhece o sessionStorage),
  // e só no desktop: no celular ela é uma folha por cima de tudo.
  useEffect(() => {
    if (isSheetViewport()) return;
    try {
      const saved = window.sessionStorage.getItem(RAIL_STORAGE_KEY);
      if (isRailDrawer(saved)) setOpen(saved);
    } catch {
      // Sem sessionStorage: começa fechado.
    }
  }, []);

  // Folha aberta no celular: a página de trás não rola junto.
  const sheetOpen = open !== null || help;
  useEffect(() => {
    if (!sheetOpen || !isSheetViewport()) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!open && !help) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(null);
      setHelp(false);
      persistDrawer(null);
    }
    // Clique fora do trilho (e da gaveta, que fica dentro dele) fecha — no
    // desktop a gaveta flutua sem fundo escuro, então é o único "fora" que há.
    function onPointerDown(event: PointerEvent) {
      if (railRef.current && !railRef.current.contains(event.target as Node)) {
        setOpen(null);
        setHelp(false);
        persistDrawer(null);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, help]);

  function toggle(drawer: RailDrawer) {
    const next = open === drawer ? null : drawer;
    setOpen(next);
    setHelp(false);
    persistDrawer(next);
    if (next) window.requestAnimationFrame(() => panelRef.current?.focus());
  }

  function toggleHelp() {
    const next = !help;
    setHelp(next);
    if (next && open) {
      setOpen(null);
      persistDrawer(null);
    }
  }

  function close() {
    setOpen(null);
    setHelp(false);
    persistDrawer(null);
  }

  /** Depois de aplicar um modelo: no celular a folha sai da frente para mostrar o editor. */
  function closeIfSheet() {
    if (isSheetViewport()) close();
  }

  function railButton(drawer: RailDrawer) {
    const active = open === drawer;
    return (
      <button
        key={drawer}
        type="button"
        onClick={() => toggle(drawer)}
        aria-expanded={active}
        aria-controls={`rail-${drawer}`}
        className={`${RAIL_BTN} ${active ? RAIL_BTN_ACTIVE : RAIL_BTN_IDLE}`}
      >
        <DrawerIcon drawer={drawer} className={`${RAIL_ICON} ${active ? "text-pine-950" : "text-pine-600"}`} />
        {DRAWER_LABEL[drawer]}
      </button>
    );
  }

  const paciente = RAIL_DRAWERS.filter((d) => DRAWER_GROUP[d.id] === "paciente");
  const voce = RAIL_DRAWERS.filter((d) => DRAWER_GROUP[d.id] === "voce");

  return (
    <aside ref={railRef} data-composer-rail className={`relative space-y-3 ${className ?? ""}`} aria-label="Perfil, histórico e modelos">
      <nav aria-label="Atalhos do compositor" className="grid grid-cols-4 gap-2 lg:flex lg:items-center lg:gap-0.5">
        {paciente.map((d) => railButton(d.id))}
        {/* Paciente | você: um fio separa os dois grupos, sem legenda. */}
        <span className="mx-1.5 hidden h-5 w-px bg-[#e2dcec] lg:block" aria-hidden />
        {voce.map((d) => railButton(d.id))}
        <button
          type="button"
          onClick={toggleHelp}
          aria-expanded={help}
          aria-controls="rail-ajuda"
          className={`${RAIL_BTN} ${help ? RAIL_BTN_ACTIVE : RAIL_BTN_IDLE}`}
        >
          <IconHelp className={`${RAIL_ICON} ${help ? "text-pine-950" : "text-pine-600"}`} />
          Ajuda
        </button>
      </nav>

      {sheetOpen ? (
        <div className="sheet-backdrop fixed inset-0 z-50 bg-pine-950/40 backdrop-blur-sm lg:hidden" aria-hidden onClick={close} />
      ) : null}

      {open ? (
        <section
          id={`rail-${open}`}
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label={DRAWER_LABEL[open]}
          className={DRAWER_CARD}
        >
          <SheetGrip />
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-pine-900/5 px-4 py-1 lg:py-2.5">
            <p className="text-sm font-bold text-pine-950 lg:text-xs">{DRAWER_LABEL[open]}</p>
            <CloseButton size="sm" onClick={close} label={`Fechar ${DRAWER_LABEL[open]}`} />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 lg:max-h-[70vh]">
            {open === "perfil" ? <PerfilDrawer patient={patient} backUrl={backUrl} /> : null}
            {open === "historico" ? (
              <HistoricoDrawer
                patient={patient}
                documents={documents}
                actions={actions}
                clinicName={clinicName}
                portalUrl={portalUrl}
              />
            ) : null}
            {open === "modelos" ? (
              <ModelosDrawer
                templates={templates}
                actions={actions}
                canManageTemplates={canManageTemplates}
                onApplied={closeIfSheet}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {help ? (
        <section id="rail-ajuda" role="dialog" aria-label="Ajuda" className={DRAWER_CARD}>
          <SheetGrip />
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-pine-900/5 px-4 py-1 lg:py-2.5">
            <p className="text-sm font-bold text-pine-950 lg:text-xs">Ajuda</p>
            <CloseButton size="sm" onClick={close} label="Fechar Ajuda" />
          </header>
          <ul className="min-h-0 space-y-2 overflow-y-auto px-4 py-3 text-sm text-pine-900/70 lg:text-xs">
            <li>
              <span className="font-bold text-pine-950">Monte a pilha:</span> escolha o tipo, preencha os campos e clique em
              “Incluir na emissão”. Dá para incluir até {MAX_COMPOSER_ITEMS} documentos de uma vez.
            </li>
            <li>
              <span className="font-bold text-pine-950">Modelos:</span> um clique (ou toque) num modelo carrega o texto no
              editor; um protocolo acrescenta vários documentos de uma vez. No computador dá também para arrastar.
            </li>
            <li>
              <span className="font-bold text-pine-950">Histórico:</span> “Renovar” copia um documento já emitido para a
              pilha, com a data de hoje.
            </li>
            <li>
              <span className="font-bold text-pine-950">Emitir:</span> em “Continuar” você confere data, profissional e
              envio; tudo sai com um link só para o paciente.
            </li>
          </ul>
        </section>
      ) : null}
    </aside>
  );
});

/* ---------- Perfil ---------- */

interface EssentialsForm {
  social_name: string;
  cpf: string;
  phone: string;
  allergies: string;
  medications: string;
}

function formFromPatient(patient: RailPatient): EssentialsForm {
  return {
    social_name: patient.social_name ?? "",
    cpf: patient.cpf ?? "",
    phone: patient.phone ?? "",
    allergies: patient.allergies ?? "",
    medications: patient.medications ?? "",
  };
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PerfilDrawer({ patient, backUrl }: { patient: RailPatient; backUrl: string }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EssentialsForm>(() => formFromPatient(patient));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const displayName = patientDisplayName(patient);
  const allergies = splitLines(patient.allergies);
  const medications = splitLines(patient.medications);

  function startEdit() {
    setForm(formFromPatient(patient));
    setError(null);
    setEditing(true);
  }

  function save() {
    const formData = new FormData();
    formData.set("id", String(patient.id));
    formData.set("back", backUrl);
    formData.set("social_name", form.social_name);
    formData.set("cpf", form.cpf);
    formData.set("phone", form.phone);
    formData.set("allergies", form.allergies);
    formData.set("medications", form.medications);
    setError(null);
    startSaving(async () => {
      try {
        // A ação grava e redireciona para `backUrl` (?ok=perfil): o compositor remonta com o
        // cadastro novo e a pilha guardada. Sem redirecionar, algo deu errado de verdade.
        await updatePatientEssentialsAction(formData);
      } catch (error) {
        if (isNextRedirect(error)) throw error;
        setError("Não deu para salvar agora. Tente de novo.");
      }
    });
  }

  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
  }

  const set = (key: keyof EssentialsForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  if (editing) {
    return (
      <div className="space-y-3" aria-label="Editar cadastro">
        <Field label="Nome social (opcional)" htmlFor="rail-social-name">
          <input
            className="input"
            id="rail-social-name"
            maxLength={120}
            value={form.social_name}
            onChange={(e) => set("social_name")(e.target.value)}
            onKeyDown={onEnter}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
          <Field label="CPF" htmlFor="rail-cpf">
            <input
              className="input"
              id="rail-cpf"
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => set("cpf")(e.target.value)}
              onKeyDown={onEnter}
            />
          </Field>
          <Field label="Celular" htmlFor="rail-phone">
            <input
              className="input"
              id="rail-phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={30}
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              onKeyDown={onEnter}
            />
          </Field>
        </div>
        <Field label="Alergias" htmlFor="rail-allergies">
          <textarea
            className="input"
            id="rail-allergies"
            rows={2}
            placeholder="Uma por linha"
            value={form.allergies}
            onChange={(e) => set("allergies")(e.target.value)}
          />
        </Field>
        <Field label="Medicamentos em uso" htmlFor="rail-medications">
          <textarea
            className="input"
            id="rail-medications"
            rows={2}
            placeholder="Um por linha"
            value={form.medications}
            onChange={(e) => set("medications")(e.target.value)}
          />
        </Field>
        {error ? (
          <Feedback key={error} tone="erro" onClose={() => setError(null)}>
            {error}
          </Feedback>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={saving} className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={saving} className="btn btn-outline px-3 py-1.5 text-xs">
            Cancelar
          </button>
        </div>
        <p className="text-[11px] text-pine-900/45">Os documentos desta emissão continuam na pilha depois de salvar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="break-words font-display text-lg font-extrabold text-pine-950">{displayName}</p>
        {patient.social_name?.trim() ? <p className="text-xs text-pine-900/50">nome civil: {patient.name}</p> : null}
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <dt className="text-pine-900/50">Idade</dt>
          <dd className="text-pine-950">{ageFrom(patient.birth_date)}</dd>
          <dt className="text-pine-900/50">CPF</dt>
          <dd className={patient.cpf?.trim() ? "text-pine-950" : "text-clay-800"}>{patient.cpf?.trim() || "não cadastrado"}</dd>
          <dt className="text-pine-900/50">Celular</dt>
          <dd className={patient.phone?.trim() ? "text-pine-950" : "text-clay-800"}>{patient.phone?.trim() || "não cadastrado"}</dd>
        </dl>
      </div>

      <div>
        <p className="text-xs font-bold text-rose-700">Alergias</p>
        {allergies.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {allergies.map((item) => (
              <span key={item} className="chip bg-rose-600 text-white">
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-pine-900/55">Nenhuma alergia registrada.</p>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-pine-900/60">Medicamentos em uso</p>
        {medications.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {medications.map((item) => (
              <span key={item} className="chip bg-white text-pine-900 ring-1 ring-[#e2dcec]">
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-pine-900/55">Nenhum medicamento registrado.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" onClick={startEdit} className="btn btn-outline px-3 py-1.5 text-xs">
          Editar
        </button>
        <Link
          href={`/pacientes/${patient.id}`}
          className="inline-flex min-h-11 items-center px-1 text-xs font-bold text-pine-700 hover:underline lg:min-h-0"
        >
          Abrir a ficha
        </Link>
      </div>
    </div>
  );
}

/* ---------- Histórico ---------- */

function documentStatus(doc: Pick<RailDocument, "revoked_at" | "shared_with_patient">): { label: string; className: string } {
  if (doc.revoked_at) return { label: "Revogado", className: "bg-rose-100 text-rose-700" };
  if (Number(doc.shared_with_patient) === 1) return { label: "No portal", className: "bg-emerald-100 text-emerald-800" };
  return { label: "Fora do portal", className: "bg-stone-200 text-stone-600" };
}

function HistoricoDrawer({
  patient,
  documents,
  actions,
  clinicName,
  portalUrl,
}: {
  patient: RailPatient;
  documents: RailDocument[];
  actions: ComposerActions;
  clinicName: string;
  portalUrl: string;
}) {
  const groups = useMemo(() => groupByYear(documents, (doc) => doc.issued_at), [documents]);
  const [added, setAdded] = useState<number | null>(null);
  const firstName = patientFirstName(patient);
  const full = actions.items.length >= MAX_COMPOSER_ITEMS;

  if (documents.length === 0) {
    return <p className="text-sm text-pine-900/55">Nenhum documento emitido ainda para {patientDisplayName(patient)}.</p>;
  }

  function renew(doc: RailDocument) {
    actions.appendFromDocument(doc);
    setAdded(doc.id);
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.year}>
          <p className="mb-1 text-xs font-bold text-pine-900/45">{group.year}</p>
          <ul className="divide-y divide-pine-900/5">
            {group.items.map((doc) => {
              const status = documentStatus(doc);
              const resend = doc.revoked_at
                ? null
                : waLink(
                    patient.phone,
                    documentWhatsAppMessage({ firstName, clinicName, title: doc.title, portalUrl, code: doc.code })
                  );
              return (
                <li key={doc.id}>
                  <details className="group py-1.5">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs lg:min-h-0 lg:items-baseline [&::-webkit-details-marker]:hidden">
                      <span className="shrink-0 font-mono text-pine-900/60">{shortDayMonth(doc.issued_at)}</span>
                      <span className="text-pine-900/30">·</span>
                      <span className="min-w-0 flex-1 truncate font-bold text-pine-950">{doc.title}</span>
                      <span className="shrink-0 font-mono text-[10px] text-pine-700">{doc.code}</span>
                    </summary>
                    <div className="mt-1.5 space-y-2 rounded-xl bg-pine-50/60 p-2.5 text-xs">
                      <p className="flex flex-wrap items-center gap-1.5 text-pine-900/70">
                        <span className="font-bold text-pine-950">{documentTitle(doc.kind, doc.subkind)}</span>
                        <span className="text-pine-900/30">·</span>
                        <span>{doc.professional_name}</span>
                        <span className={`chip px-2 py-0.5 text-[10px] ${status.className}`}>{status.label}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/pacientes/${patient.id}/documentos/${doc.id}`}
                          className="inline-flex min-h-11 items-center px-1 font-bold text-pine-700 hover:underline lg:min-h-0"
                        >
                          Abrir
                        </Link>
                        {resend ? (
                          <a href={resend} target="_blank" rel="noopener noreferrer" className={`${SMALL_BTN} btn-outline`}>
                            Reenviar
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => renew(doc)}
                          disabled={full}
                          title={full ? `Limite de ${MAX_COMPOSER_ITEMS} documentos por emissão` : "Uma cópia com a data de hoje entra na pilha"}
                          className={`${SMALL_BTN} btn-primary disabled:opacity-40`}
                        >
                          Renovar
                        </button>
                      </div>
                      {!resend && !doc.revoked_at ? (
                        <p className="text-[11px] text-pine-900/50">Sem celular no cadastro — não dá para reenviar pelo WhatsApp.</p>
                      ) : null}
                      {added === doc.id ? (
                        <Feedback tone="ok" onClose={() => setAdded(null)}>
                          Cópia de hoje incluída na pilha.
                        </Feedback>
                      ) : null}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ---------- Modelos ---------- */

const SCOPE_TAG: Record<ComposerTemplate["scope"], { label: string; className: string }> = {
  clinica: { label: "clínica", className: "bg-pine-100 text-pine-800" },
  meu: { label: "meu", className: "bg-pine-50 text-pine-700" },
  outro: { label: "de outro profissional", className: "bg-stone-200 text-stone-600" },
};

function ModelosDrawer({
  templates,
  actions,
  canManageTemplates,
  onApplied,
}: {
  templates: ComposerTemplate[];
  actions: ComposerActions;
  canManageTemplates: boolean;
  /** Chamado depois de aplicar (ou de abrir o "Salvar como protocolo"): o rail fecha a folha no celular. */
  onApplied?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TemplateFilter>("todos");
  const [feedback, setFeedback] = useState<string | null>(null);
  const list = useMemo(() => filterTemplates(templates, query, filter), [templates, query, filter]);
  const full = actions.items.length >= MAX_COMPOSER_ITEMS;

  function apply(template: ComposerTemplate) {
    actions.applyTemplate(template);
    if (template.kind === PROTOCOL_KIND) {
      const n = Math.min(template.items?.length ?? 0, Math.max(0, MAX_COMPOSER_ITEMS - actions.items.length));
      setFeedback(`“${template.name}”: ${n} documento${n === 1 ? "" : "s"} na pilha.`);
    } else {
      setFeedback(`“${template.name}” carregado no editor.`);
    }
    onApplied?.();
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        className="input"
        placeholder="Buscar modelo pelo nome"
        aria-label="Buscar modelo"
        enterKeyHint="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar modelos">
        {TEMPLATE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`doc-subtab${filter === f.id ? " active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-pine-900/55">
          Nenhum modelo salvo ainda. Os textos padrão de cada tipo continuam no editor.
        </p>
      ) : list.length === 0 ? (
        <p className="text-sm text-pine-900/55">Nenhum modelo com esse nome.</p>
      ) : (
        <ul className="divide-y divide-pine-900/5">
          {list.map((template) => {
            const isProtocol = template.kind === PROTOCOL_KIND;
            const scope = SCOPE_TAG[template.scope];
            return (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => apply(template)}
                  disabled={isProtocol && full}
                  className="w-full rounded-xl px-2 py-3 text-left hover:bg-pine-50 active:bg-pine-50 disabled:opacity-40 lg:py-2"
                >
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-pine-950">
                    <span className="min-w-0 truncate">{template.name}</span>
                    <span className={`rounded-full px-1.5 text-[10px] ${scope.className}`}>{scope.label}</span>
                    {isProtocol ? <span className="rounded-full bg-peach-100 px-1.5 text-[10px] text-pine-950">protocolo</span> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-pine-900/55">
                    {template.kind === PROTOCOL_KIND
                      ? protocolSummary(template.items ?? [])
                      : `${DOCUMENT_KIND_LABEL[template.kind]}${
                          template.kind === "atestado" ? ` · ${documentTitle(template.kind, template.subkind)}` : ""
                        }`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {feedback ? (
        <Feedback key={feedback} tone="ok" onClose={() => setFeedback(null)}>
          {feedback}
        </Feedback>
      ) : null}

      <div className="space-y-2 border-t border-pine-900/5 pt-3">
        <button
          type="button"
          onClick={() => {
            actions.openProtocolForm();
            onApplied?.();
          }}
          disabled={actions.items.length === 0}
          className="block min-h-11 text-left text-xs font-bold text-pine-700 hover:underline disabled:opacity-40 disabled:no-underline lg:min-h-0"
        >
          Salvar os documentos atuais como protocolo
        </button>
        {canManageTemplates ? (
          <Link
            href="/configuracoes/modelos"
            className="flex min-h-11 items-center text-xs font-bold text-pine-700 hover:underline lg:block lg:min-h-0"
          >
            Gerenciar modelos
          </Link>
        ) : null}
      </div>
    </div>
  );
}
