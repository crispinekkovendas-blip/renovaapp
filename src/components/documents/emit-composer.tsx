"use client";

import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emitDocumentsAction } from "@/lib/actions-documents";
import {
  DOCUMENT_KINDS,
  PROTOCOL_KIND,
  fieldsFor,
  generateDocumentCode,
  normalizeFieldValues,
} from "@/lib/documents";
import type { AtestadoSubkind, DocumentKind } from "@/lib/documents";
import {
  MAX_COMPOSER_ITEMS,
  appendItems,
  buildItem,
  removeItem,
  renderItemBody,
  replaceItem,
  resolveTemplateText,
  seedFromDocument,
  seedFromTemplate,
  serializeItems,
  templatesForKind,
} from "@/lib/composer";
import type { ComposerItem, ComposerTemplate, RenderContext } from "@/lib/composer";
import {
  composerReducer,
  composerUrl,
  documentCountLabel,
  editorFromItem,
  emitErrorMessage,
  initialComposerState,
  initialSendOptions,
  prescriptionSummary,
  prescriptionToItems,
} from "@/lib/composer-editor";
import type { ComposerStep, ComposerTab, MobileView } from "@/lib/composer-editor";
import { SCREEN_TITLE, initialScreen } from "@/lib/composer-screens";
import { stackStorageKey } from "@/lib/composer-rail";
import { fmtDate } from "@/lib/format";
import { blockedItems, serializeItems as serializePrescription } from "@/lib/prescription";
import type { PrescriptionItem } from "@/lib/prescription";
import { ComposerRail } from "./composer-rail";
import type { RailDocument, RailPatient } from "./composer-rail";
import { DocumentPreview } from "./document-preview";
import { BlockedNotice, prescriptionPages } from "./composer/preview-pages";
import type { PreviewPage } from "./composer/preview-viewer";
import { RX_DRAG_TYPE, decodeDragItems, documentIndexes, firstAdded, pageOfItem } from "@/lib/rx-canvas";
import { moveItem } from "@/lib/reorder";
import { ComposerActionBar } from "./composer/action-bar";
import { useDraft } from "./composer/use-draft";
import type { DraftState } from "@/lib/drafts";
import { readLocalDraft, removeLocalDraft } from "@/lib/local-drafts";
import { ScreenBar, TypeScreen, useScreens } from "./composer/screens";
import { ComposerStack } from "./composer/composer-stack";
import { usePreviewPreference, useProtocolDrafts, useRealPdf, useStoredStack } from "./composer/hooks";
import { DesktopPreview, MobilePreview, MobileViewSwitch, ShowPreviewButton } from "./composer/preview-panels";
import type { FrequentItem } from "@/lib/rx-suggestions";
import { PrescriptionCard } from "./composer/prescription-card";
import { ReceitaCard } from "./composer/receita-card";
import { ReviewStep } from "./composer/review-step";
import { SheetStylePanel } from "./composer/sheet-style-panel";
import type { SheetChoice } from "./composer/sheet-style-panel";
import { DEFAULT_SHEET_STYLE, SHEET_PRESETS, isDefaultStyle } from "@/lib/sheet-style";
import type { SheetStyle, SheetTemplate } from "@/lib/sheet-style";
import { TextEditorCard } from "./composer/text-editor";
import { TypePicker } from "./composer/type-picker";
import type { TabOption } from "./composer/type-picker";
import { Banner } from "./composer/ui";
import type { ComposerActions, ComposerPatient, ComposerProfessional } from "./composer/types";

// Os tipos moram em composer/types.ts; seguem exportados daqui para quem já os importava.
export type { ComposerActions, ComposerPatient, ComposerProfessional, SeedableDocument } from "./composer/types";

/**
 * "Emitir documentos": um compositor só para atestado, encaminhamento, laudo,
 * orientações e receituário, em **telas inteiras do app**, uma por vez, cada
 * uma com "←" (o voltar do celular também anda entre elas — a tela vive em
 * `?tela=`, ver src/lib/composer-screens.ts):
 *
 *   1. Tipo — o que vai emitir (cartões grandes) + Perfil/Histórico/Modelos;
 *   2. Montar — modelos, o editor do tipo e a folha (ao lado no computador,
 *      aba "Prévia" no celular); "Incluir" leva à tela 3;
 *   3. Nesta emissão — a pilha: reordenar, editar (volta à 2), remover,
 *      "+ Outro documento" (volta à 1), "Continuar";
 *   4. Revisar — paciente, data, profissional, envio, folha; "Emitir e enviar".
 *
 * Um único <form action={emitDocumentsAction}> em volta de tudo: a pilha vai
 * no campo escondido `items` (JSON de ComposerItem, ver src/lib/composer.ts) e
 * os controles da revisão são inputs de verdade. O código de autenticidade de
 * cada item nasce aqui, no navegador; o servidor só o troca se já existir.
 *
 * Organização: este arquivo junta o estado e liga as peças de ./composer/.
 * O editor é um reducer puro (src/lib/composer-editor.ts, testado); a pilha
 * guardada, a preferência da prévia, o PDF real e os protocolos são hooks
 * (composer/hooks.ts); as telas, composer/screens.tsx.
 */

export interface EmitComposerProps {
  patientId: number;
  patient: ComposerPatient;
  professionals: ComposerProfessional[];
  defaultProfessionalId: number | null;
  encounterId: number | null;
  /** Data do atendimento vinculado, já formatada (dd/mm/aaaa), para o cabeçalho. */
  encounterDate: string | null;
  /** Todos os modelos que a sessão pode usar, inclusive protocolos (com `items` já lidos). */
  templates: ComposerTemplate[];
  clinicName: string;
  /** "Endereço · Telefone · CNPJ" e CNES — a prévia desenha o mesmo cabeçalho do PDF. */
  clinicLine?: string | null;
  clinicCnes?: string | null;
  /** YYYY-MM-DD */
  today: string;
  memedEnabled: boolean;
  /** O que este médico mais receita (medicamento + posologia), para o receituário. */
  frequentRx: FrequentItem[];
  /** Quantas vezes cada modelo já saiu num documento (a aba "Mais usados" dos modelos). */
  templateUsage?: Readonly<Record<number, number>>;
  /** O tipo veio no link (`?kind=`): o compositor abre direto na tela de montar. */
  kindChosen?: boolean;
  /** Para onde "×" e "Salvar rascunho" voltam (`?volta=`); sem ele, a ficha na aba Documentos. */
  returnTo?: string | null;
  /** Rascunho sendo continuado: número do banco ou "local-…" do navegador. */
  draftId: string | null;
  /** O rascunho do banco já lido pela página (o do navegador é lido aqui, depois da hidratação). */
  draftState: DraftState | null;
  /** Itens já montados pela página (`?from=` renova um documento; `?modelo=` aplica um modelo ou protocolo). */
  seedItems: ComposerItem[];
  canManageTemplates: boolean;
  initialKind: DocumentKind;
  initialSubkind: AtestadoSubkind | null;
  /** Documentos já emitidos para este paciente (gaveta Histórico). */
  documents: RailDocument[];
  /** Link assinado do portal, para o "Reenviar" do Histórico. */
  portalUrl: string;
  error?: string;
  /** `?ok=perfil`: o Perfil acabou de salvar o cadastro. */
  ok?: string;
  /** Modelos da folha que esta sessão enxerga, e os logotipos deles (hash → data URL). */
  sheetTemplates?: SheetTemplate[];
  sheetLogos?: Record<string, string>;
  /** Recepção não personaliza a folha; o administrador salva modelos da clínica. */
  canEditSheet?: boolean;
  canSaveSheetForClinic?: boolean;
}

/** Último modelo da folha usado por profissional, neste navegador (comodidade; pode faltar). */
const SHEET_CHOICE_KEY = (professionalId: number) => `renova:folha:${professionalId}`;

/** A folha só muda quando muda o que ela desenha — não com a pilha, a revisão ou o rail. */
const PreviewSheet = memo(DocumentPreview);

/** Receita digital primeiro (quando a Memed está ligada), depois os tipos que este compositor emite. */
/** Sem histórico: "Mais usados" dos modelos segue os meus, os da clínica e a ordem de sempre. */
const NO_USAGE: Readonly<Record<number, number>> = {};

function composerTabs(memedEnabled: boolean): TabOption[] {
  return [
    ...(memedEnabled ? [{ tab: "receita" as const, label: "Receita digital" }] : []),
    ...DOCUMENT_KINDS.map((k) => ({ tab: k.kind, label: k.label })),
    // O receituário fica fora de DOCUMENT_KINDS (não usa o editor de texto), mas é uma aba como as outras.
    { tab: "receituario", label: "Receituário" },
  ];
}

export function EmitComposer({
  patientId,
  patient,
  professionals,
  defaultProfessionalId,
  encounterId,
  encounterDate,
  templates,
  clinicName,
  clinicLine,
  clinicCnes,
  today,
  memedEnabled,
  frequentRx,
  templateUsage = NO_USAGE,
  kindChosen = false,
  returnTo = null,
  draftId: initialDraftId,
  draftState,
  seedItems,
  canManageTemplates,
  initialKind,
  initialSubkind,
  documents,
  portalUrl,
  error,
  ok,
  sheetTemplates: initialSheetTemplates = [],
  sheetLogos: initialSheetLogos = {},
  canEditSheet = false,
  canSaveSheetForClinic = false,
}: EmitComposerProps) {
  const [{ tab, editor }, dispatch] = useReducer(composerReducer, undefined, () =>
    draftState
      ? {
          tab: draftState.tab,
          editor: { ...draftState.editor, fields: normalizeFieldValues(draftState.editor.fields), code: "", editing: null },
        }
      : initialComposerState(initialKind, initialSubkind)
  );
  // O código nasce depois da hidratação: gerado no servidor e no navegador, os dois seriam diferentes.
  useEffect(() => dispatch({ type: "hydrate-code", code: generateDocumentCode() }), []);

  // Um rascunho tem pilha própria no sessionStorage: não mistura com a de uma emissão nova.
  const stackKey = `${stackStorageKey(patientId, encounterId)}${initialDraftId ? `_r${initialDraftId}` : ""}`;
  const [items, setItems] = useStoredStack(stackKey, draftState ? appendItems(draftState.items, seedItems) : seedItems);
  // O receituário é uma lista, não um texto: mora fora do editor.
  const [rx, setRx] = useState<PrescriptionItem[]>(draftState?.rx ?? []);
  /**
   * A folha como parte da montagem. `sheetFocus`: item que acabou de entrar ou
   * que o médico pediu para ver — a prévia vai à página dele e ele pisca.
   * `editing`: o medicamento aberto no cartão da esquerda (um por vez).
   */
  const [sheetFocus, setSheetFocus] = useState<{ index: number; nonce: number } | null>(null);
  const [editing, setEditing] = useState<{ index: number; nonce: number } | null>(null);
  const [sheetLit, setSheetLit] = useState<number | null>(null);
  useEffect(() => {
    if (!sheetFocus) return;
    setSheetLit(sheetFocus.index);
    const timer = setTimeout(() => setSheetLit(null), 1800);
    return () => clearTimeout(timer);
  }, [sheetFocus]);
  const [previewOn, setPreviewOn] = usePreviewPreference();
  // No celular a prévia não cabe ao lado: é uma aba do controle segmentado.
  const [mobileView, setMobileView] = useState<MobileView>("editar");
  const pdf = useRealPdf(patientId);
  const protocol = useProtocolDrafts(items, rx);
  const router = useRouter();

  /* ---------- rascunho: guarda sozinho e ao fechar ---------- */

  const draftSnapshot: DraftState = useMemo(
    () => ({
      tab,
      editor: {
        kind: editor.kind,
        subkind: editor.subkind,
        templateId: editor.templateId,
        fields: editor.fields as Record<string, string>,
        manualBody: editor.manualBody,
        manualTitle: editor.manualTitle,
      },
      items,
      rx,
    }),
    [tab, editor.kind, editor.subkind, editor.templateId, editor.fields, editor.manualBody, editor.manualTitle, items, rx]
  );
  const draft = useDraft({ patientId, initialId: initialDraftId, state: draftSnapshot });

  // Rascunho que ficou no navegador (sem a migração): só dá para ler depois da hidratação.
  const restoredLocal = useRef(false);
  useEffect(() => {
    if (restoredLocal.current || draftState || !initialDraftId?.startsWith("local-")) return;
    restoredLocal.current = true;
    const local = readLocalDraft(patientId, initialDraftId);
    if (!local) return;
    dispatch({
      type: "restore",
      state: {
        tab: local.tab,
        editor: { ...local.editor, fields: normalizeFieldValues(local.editor.fields), code: "", editing: null },
      },
    });
    setItems((current) => appendItems(local.items, current));
    setRx(local.rx);
  }, [draftState, initialDraftId, patientId, setItems]);

  const [closing, setClosing] = useState(false);
  /** Fechar = guardar o rascunho e voltar à ficha (na aba Documentos, onde ele aparece). */
  const close = useCallback(async () => {
    if (closing) return;
    setClosing(true);
    await draft.flush();
    try {
      window.sessionStorage.removeItem(stackKey);
    } catch {
      // Sem sessionStorage: nada guardado.
    }
    router.replace(returnTo ?? `/pacientes/${patientId}?aba=documentos`);
  }, [closing, draft, stackKey, router, patientId, returnTo]);

  /* ---------- as telas: tipo → montar → nesta emissão → revisar ---------- */

  const [startScreen] = useState(() => initialScreen({ itemCount: items.length, kindChosen }));
  const { screen, go, back } = useScreens(startScreen, items.length, close);
  // A revisão é o único passo que emite; o resto é montagem.
  const step: ComposerStep = screen === "revisar" ? "review" : "compose";

  // Revisão.
  const [professionalId, setProfessionalId] = useState<number>(defaultProfessionalId ?? professionals[0]?.id ?? 0);
  const [date, setDate] = useState(today);
  const [send, setSend] = useState(() => initialSendOptions(patient.phone));

  const professional = professionals.find((p) => p.id === professionalId) ?? null;

  // Modelo da folha: o último que este profissional usou neste navegador, senão o padrão.
  const [sheetTemplates, setSheetTemplates] = useState(initialSheetTemplates);
  const [sheetLogos, setSheetLogos] = useState(initialSheetLogos);
  const [sheet, setSheet] = useState<{ style: SheetStyle; choice: SheetChoice }>({
    style: DEFAULT_SHEET_STYLE,
    choice: "preset:renova",
  });
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(SHEET_CHOICE_KEY(professionalId));
    } catch {
      saved = null;
    }
    const preset = saved?.startsWith("preset:") ? SHEET_PRESETS.find((p) => `preset:${p.id}` === saved) : undefined;
    const template = saved?.startsWith("tpl:") ? initialSheetTemplates.find((t) => `tpl:${t.id}` === saved) : undefined;
    const found = preset?.style ?? template?.style;
    setSheet(found ? { style: found, choice: saved as SheetChoice } : { style: DEFAULT_SHEET_STYLE, choice: "preset:renova" });
  }, [professionalId, initialSheetTemplates]);
  const chooseSheet = useCallback(
    (style: SheetStyle, choice: SheetChoice) => {
      setSheet({ style, choice });
      if (choice === "custom") return;
      try {
        localStorage.setItem(SHEET_CHOICE_KEY(professionalId), choice);
      } catch {
        // Sem armazenamento: só não lembra da próxima vez.
      }
    },
    [professionalId]
  );
  const sheetStyleJson = isDefaultStyle(sheet.style) ? "" : JSON.stringify(sheet.style);
  // Receituário bilíngue (português/espanhol), para o paciente comprar fora do país.
  const [bilingual, setBilingual] = useState(false);
  const logoSrc = sheet.style.logo ? sheetLogos[sheet.style.logo] ?? null : null;
  const ctx: RenderContext = useMemo(
    () => ({
      patient: { name: patient.name, cpf: patient.cpf, social_name: patient.social_name },
      professional: professional ? { name: professional.name, council: professional.council } : null,
      clinicName,
      date,
    }),
    [patient.name, patient.cpf, patient.social_name, professional, clinicName, date]
  );

  /* ---------- o que está no editor ---------- */

  const tabs = useMemo(() => composerTabs(memedEnabled), [memedEnabled]);
  const fieldDefs = useMemo(() => fieldsFor(editor.kind, editor.subkind), [editor.kind, editor.subkind]);
  const kindTemplates = useMemo(
    () => templatesForKind(templates, editor.kind, editor.subkind),
    [templates, editor.kind, editor.subkind]
  );
  const protocols = useMemo(() => templates.filter((t) => t.kind === PROTOCOL_KIND), [templates]);
  const rxProtocols = useMemo(() => templates.filter((t) => t.kind === "receituario"), [templates]);
  const { template, templateId: resolvedTemplateId } = resolveTemplateText(
    templates,
    editor.templateId,
    editor.kind,
    editor.subkind
  );
  const modelName = templates.find((t) => t.id === resolvedTemplateId)?.name ?? "Padrão";
  const body = editor.manualBody ?? renderItemBody(editor.kind, template.body, normalizeFieldValues(editor.fields), ctx);
  const title = editor.manualTitle ?? template.title;
  const rxSummary = prescriptionSummary(rx);
  const full = items.length >= MAX_COMPOSER_ITEMS;
  const displayName = patient.social_name?.trim() || patient.name;
  const countLabel = documentCountLabel(items.length);
  const itemsJson = useMemo(() => serializeItems(items), [items]);

  /* ---------- ações (estáveis: vão para peças memo) ---------- */

  const { clearMessage: clearProtocolMessage, openForm: openProtocolForm } = protocol;

  const selectTab = useCallback(
    (next: ComposerTab) => dispatch({ type: "select-tab", tab: next, code: generateDocumentCode() }),
    []
  );
  const selectSubkind = useCallback(
    (subkind: AtestadoSubkind) => dispatch({ type: "select-subkind", subkind, code: generateDocumentCode() }),
    []
  );

  const applyTemplate = useCallback(
    (t: ComposerTemplate) => {
      if (t.kind === PROTOCOL_KIND) {
        setItems((current) => appendItems(current, seedFromTemplate(t, templates, ctx)));
        clearProtocolMessage();
        go("emissao");
        return;
      }
      dispatch({ type: "apply-template", template: t, code: generateDocumentCode() });
      go("montar");
    },
    [templates, ctx, setItems, clearProtocolMessage, go]
  );

  const editItem = useCallback(
    (item: ComposerItem) => {
      dispatch({ type: "edit-item", editor: editorFromItem(item, templates) });
      go("montar");
    },
    [templates, go]
  );

  const remove = useCallback(
    (code: string) => {
      setItems((current) => removeItem(current, code));
      dispatch({ type: "item-removed", itemCode: code, code: generateDocumentCode() });
    },
    [setItems]
  );

  const actions: ComposerActions = useMemo(
    () => ({
      items,
      appendItems: (more) => {
        setItems((current) => appendItems(current, more));
        go("emissao");
      },
      appendFromDocument: (doc) => {
        setItems((current) => appendItems(current, [seedFromDocument(doc, templates, ctx)]));
        go("emissao");
      },
      applyTemplate,
      openProtocolForm,
    }),
    [items, setItems, templates, ctx, applyTemplate, openProtocolForm, go]
  );

  const railPatient: RailPatient = useMemo(
    () => ({
      id: patientId,
      name: patient.name,
      social_name: patient.social_name,
      cpf: patient.cpf,
      phone: patient.phone,
      birth_date: patient.birth_date,
      allergies: patient.allergies,
      medications: patient.medications,
    }),
    [patientId, patient]
  );

  /* ---------- incluir na pilha ---------- */

  function includeItem() {
    if (!body.trim()) return;
    const built = buildItem({
      kind: editor.kind,
      subkind: editor.subkind,
      templateId: editor.templateId,
      templates,
      fields: editor.fields,
      title,
      body: editor.manualBody,
      ctx,
    });
    const item: ComposerItem = { ...built, code: editor.code || built.code };
    if (editor.editing) {
      const editing = editor.editing;
      setItems((current) => replaceItem(current, editing, item));
    } else {
      if (full) return;
      setItems((current) => appendItems(current, [item]));
    }
    dispatch({ type: "reset", code: generateDocumentCode() });
    go("emissao");
  }

  /** Toda mudança da lista passa aqui: o que entrou aparece na folha, na página certa. */
  const changeRx = useCallback(
    (next: PrescriptionItem[]) => {
      const added = firstAdded(rx.length, next.length);
      setRx(next);
      if (added !== null) setSheetFocus({ index: added, nonce: Date.now() });
    },
    [rx.length]
  );

  /** Abre um medicamento no cartão; fechar ("Enviar") faz ele piscar na folha. */
  const editRx = useCallback(
    (index: number | null, options?: { silent?: boolean }) => {
      if (index === null) {
        if (editing && !options?.silent) setSheetFocus({ index: editing.index, nonce: Date.now() });
        setEditing(null);
        return;
      }
      setEditing({ index, nonce: Date.now() });
    },
    [editing]
  );

  function includePrescription() {
    if (rxSummary.docs.length === 0) return;
    const built = prescriptionToItems(rxSummary.docs, () => generateDocumentCode());
    setItems((current) => appendItems(current, built));
    setRx([]);
    setEditing(null);
    go("emissao");
  }

  function dropTemplate(templateId: number) {
    const dropped = templates.find((t) => t.id === templateId);
    if (dropped) applyTemplate(dropped);
  }

  /**
   * Abre o PDF de verdade do rascunho, sem gravar nada. No receituário, um
   * papel por vez (`docIndex`): simples e Controle Especial são PDFs diferentes.
   */
  function openRealPdf(docIndex = 0) {
    if (tab === "receituario") {
      const doc = rxSummary.docs[docIndex];
      if (!doc) return;
      void pdf.open({
        title: doc.label,
        body: doc.body,
        code: editor.code,
        kind: "receituario",
        professionalId,
        medicamentos: serializePrescription(doc.items),
        style: sheet.style,
        bilingual,
      });
      return;
    }
    void pdf.open({ title, body, code: editor.code, kind: editor.kind, professionalId, style: sheet.style });
  }

  /* ---------- montagem ---------- */

  // As páginas da prévia são o que sai de verdade: no receituário, um papel por tipo de
  // receita e uma página por via; nos outros tipos, a folha do editor.
  const sheetProps = {
    date: fmtDate(today),
    code: editor.code,
    clinicName,
    clinicLine,
    clinicCnes,
    patientName: displayName,
    patientCpf: patient.cpf,
    professional,
    sheetStyle: sheet.style,
    logoSrc,
    bilingual: tab === "receituario" && bilingual,
  };
  const pages: PreviewPage[] =
    tab === "receituario"
      ? prescriptionPages(rxSummary.docs, sheetProps, PreviewSheet, {
          indexesFor: (doc) => documentIndexes(rx, doc),
          // Pisca o que acabou de entrar; senão, fica marcado o que está aberto no cartão.
          highlight: sheetLit ?? editing?.index ?? null,
          onSelect: (index) => {
            setMobileView("editar");
            setEditing({ index, nonce: Date.now() });
          },
          onMove: (from, to) => {
            setRx((current) => moveItem(current, from, to));
            // O cartão aberto acompanha o item, não a posição.
            if (editing) {
              const at = moveItem(rx.map((_, i) => i), from, to).indexOf(editing.index);
              setEditing({ index: at, nonce: editing.nonce });
            }
          },
          onRemove: (index) => {
            setRx((current) => current.filter((_, i) => i !== index));
            if (editing?.index === index) setEditing(null);
            else if (editing && editing.index > index) setEditing({ index: editing.index - 1, nonce: editing.nonce });
          },
        })
      : [{ key: "folha", label: title || "Documento", pdfIndex: 0, node: <PreviewSheet {...sheetProps} title={title} body={body} /> }];
  const blocked = tab === "receituario" ? blockedItems(rx) : [];
  const notice = blocked.length > 0 ? <BlockedNotice blocked={blocked} /> : null;
  const goToPage = sheetFocus ? pageOfItem(pages, sheetFocus.index) : -1;
  const preview = {
    pages,
    notice,
    pdfBusy: pdf.busy,
    onOpenPdf: openRealPdf,
    goTo: sheetFocus && goToPage >= 0 ? { index: goToPage, nonce: sheetFocus.nonce } : null,
    drop:
      tab === "receituario"
        ? {
            type: RX_DRAG_TYPE,
            label: "Solte para incluir na receita",
            onDrop: (data: string) => {
              const dropped = decodeDragItems(data);
              if (dropped.length > 0) changeRx([...rx, ...dropped]);
            },
          }
        : undefined,
  };

  const showMobilePreview = tab !== "receita" && mobileView === "previa";
  const tabLabel = tabs.find((t) => t.tab === tab)?.label ?? "Documento";

  const rail = (
    <ComposerRail
      patient={railPatient}
      documents={documents}
      templates={templates}
      actions={actions}
      clinicName={clinicName}
      portalUrl={portalUrl}
      canManageTemplates={canManageTemplates}
      backUrl={composerUrl(patientId, editor.kind, editor.subkind, encounterId)}
      className="w-full lg:w-auto"
    />
  );

  // Tela 2 — montar um documento do tipo escolhido: modelos, editor e, no computador, a folha ao lado.
  // No celular a folha é a aba "Prévia" do controle segmentado.
  const buildScreen = (
    <div
      className={`grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-rows-[auto_1fr] lg:gap-x-6 ${
        previewOn ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,31.5rem)]" : ""
      }`}
    >
      <div className="space-y-3">
        {!previewOn ? <ShowPreviewButton onShow={() => setPreviewOn(true)} /> : null}
        <TypePicker
          tabs={tabs}
          tab={tab}
          showTypes={false}
          templateUsage={templateUsage}
          subkind={editor.subkind}
          kindTemplates={kindTemplates}
          protocols={protocols}
          templateId={editor.templateId}
          full={full}
          onSelectTab={selectTab}
          onSelectSubkind={selectSubkind}
          onApplyTemplate={applyTemplate}
        />
      </div>

      {previewOn ? <DesktopPreview {...preview} onHide={() => setPreviewOn(false)} /> : null}

      <div className="space-y-3">
        {tab !== "receita" ? <MobileViewSwitch view={mobileView} onChange={setMobileView} /> : null}
        {showMobilePreview ? <MobilePreview {...preview} /> : null}

        <div className={showMobilePreview ? "hidden lg:block" : undefined}>
          {tab === "receita" ? (
            <ReceitaCard patientId={patientId} encounterId={encounterId} />
          ) : tab === "receituario" ? (
            <PrescriptionCard
              rx={rx}
              onRxChange={changeRx}
              allergies={patient.allergies}
              rxProtocols={rxProtocols}
              frequentRx={frequentRx}
              docCount={rxSummary.docs.length}
              medicationCount={rxSummary.medicationCount}
              full={full}
              protocolName={protocol.rxName}
              onProtocolNameChange={protocol.setRxName}
              protocolMessage={protocol.rxMessage}
              onDismissProtocolMessage={protocol.clearRxMessage}
              savingProtocol={protocol.saving}
              onSaveProtocol={protocol.saveRx}
              onInclude={includePrescription}
              editing={editing}
              onEdit={editRx}
              onShowOnSheet={(index) => {
                setMobileView("previa");
                setSheetFocus({ index, nonce: Date.now() });
              }}
            />
          ) : (
            <TextEditorCard
              editor={editor}
              dispatch={dispatch}
              templateTitle={template.title}
              modelName={modelName}
              kindTemplates={kindTemplates}
              fieldDefs={fieldDefs}
              title={title}
              body={body}
              full={full}
              canManageTemplates={canManageTemplates}
              patientSex={patient.sex}
              onInclude={includeItem}
              onReset={() => dispatch({ type: "reset", code: generateDocumentCode() })}
              onDropTemplate={dropTemplate}
            />
          )}
        </div>
      </div>
    </div>
  );

  // Tela 3 — a pilha: o que sai nesta emissão, com reordenar, editar (volta a Montar) e remover.
  const stackScreen = (
    <div className="mx-auto max-w-3xl space-y-4">
      <ComposerStack
        items={items}
        onItemsChange={setItems}
        editingCode={editor.editing}
        onEdit={editItem}
        onRemove={remove}
        protocol={protocol.draft}
        canManageTemplates={canManageTemplates}
        onProtocolOpen={openProtocolForm}
        onProtocolClose={protocol.closeForm}
        onProtocolName={protocol.setName}
        onProtocolClinic={protocol.setClinic}
        onProtocolSave={protocol.save}
      />
      <button
        type="button"
        onClick={() => go("tipo")}
        disabled={full}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pine-900/15 px-4 py-4 text-sm font-bold text-pine-700 transition-colors hover:border-pine-400 hover:bg-pine-50 disabled:opacity-50"
      >
        + Adicionar outro documento
      </button>
    </div>
  );

  // Tela 4 — revisar: paciente, data, profissional, envio, folha e (no receituário) a versão bilíngue.
  const reviewScreen = (
    <ReviewStep
      patient={patient}
      displayName={displayName}
      professionals={professionals}
      professionalId={professionalId}
      onProfessionalChange={setProfessionalId}
      professional={professional}
      date={date}
      today={today}
      onDateChange={setDate}
      send={send}
      onSendChange={setSend}
      items={items}
      countLabel={countLabel}
      sheetPanel={
        <>
          {items.some((item) => item.kind === "receituario") ? (
            <section className="card p-4 sm:p-5" aria-label="Receita para comprar fora do país">
              <label className="flex min-h-11 items-start gap-2 text-sm sm:min-h-0">
                <input
                  type="checkbox"
                  checked={bilingual}
                  onChange={(e) => setBilingual(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-pine-700"
                />
                <span>
                  <span className="font-bold text-pine-950">Receita bilíngue (português e espanhol)</span>
                  <span className="mt-0.5 block text-xs text-pine-900/60">
                    Para o paciente comprar fora do país (ex.: Paraguai) e trazer o medicamento: rótulos e posologia também em
                    espanhol e a declaração de uso pessoal na quantidade do tratamento.
                  </span>
                </span>
              </label>
            </section>
          ) : null}
          <SheetStylePanel
            style={sheet.style}
            choice={sheet.choice}
            onChange={chooseSheet}
            templates={sheetTemplates}
            onTemplatesChange={setSheetTemplates}
            logos={sheetLogos}
            onLogo={(hash, dataUrl) => setSheetLogos((all) => ({ ...all, [hash]: dataUrl }))}
            canEdit={canEditSheet}
            canSaveForClinic={canSaveSheetForClinic}
            professionalId={professionalId}
            sheet={{
              date: fmtDate(date),
              code: editor.code,
              clinicName,
              clinicLine,
              clinicCnes,
              patientName: displayName,
              patientCpf: patient.cpf,
              professional,
            }}
            sampleItems={rx}
          />
        </>
      }
    />
  );

  return (
    <form
      action={emitDocumentsAction}
      onSubmit={(e) => {
        // Só a revisão emite: um Enter no editor não pode disparar a emissão.
        if (step !== "review" || items.length === 0) {
          e.preventDefault();
          return;
        }
        // O rascunho do navegador vira documento agora (o do banco o servidor apaga).
        if (draft.draftId?.startsWith("local-")) removeLocalDraft(patientId, draft.draftId);
      }}
      onKeyDown={(e) => {
        if (step !== "review" && e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
      className="space-y-4"
    >
      <input type="hidden" name="patient_id" value={patientId} />
      {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}
      <input type="hidden" name="items" value={itemsJson} />
      {sheetStyleJson ? <input type="hidden" name="sheet_style" value={sheetStyleJson} /> : null}
      {bilingual ? <input type="hidden" name="bilingual" value="1" /> : null}
      {draft.draftId && !draft.draftId.startsWith("local-") ? (
        <input type="hidden" name="draft_id" value={draft.draftId} />
      ) : null}

      <ScreenBar
        screen={screen}
        title={screen === "montar" ? tabLabel : SCREEN_TITLE[screen]}
        displayName={displayName}
        encounterDate={encounterDate}
        draftStatus={draft.status}
        code={screen === "montar" && tab !== "receita" && editor.code ? { kind: editor.kind, value: editor.code } : null}
        onBack={back}
        onClose={close}
        closing={closing}
      />

      {error ? <Banner tone="erro">{emitErrorMessage(error)}</Banner> : null}
      {ok === "perfil" ? <Banner tone="ok">Cadastro do paciente atualizado. A pilha continua como estava.</Banner> : null}

      {screen === "tipo" ? (
        <TypeScreen
          tabs={tabs}
          tab={tab}
          onChoose={(next) => {
            selectTab(next);
            go("montar");
          }}
          itemCount={items.length}
          countLabel={countLabel}
          onOpenStack={() => go("emissao")}
          rail={rail}
        />
      ) : screen === "montar" ? (
        buildScreen
      ) : screen === "emissao" ? (
        stackScreen
      ) : (
        reviewScreen
      )}

      <ComposerActionBar
        screen={screen}
        countLabel={countLabel}
        itemCount={items.length}
        onGo={go}
        onBack={back}
        onClose={close}
        closing={closing}
      />
    </form>
  );
}
