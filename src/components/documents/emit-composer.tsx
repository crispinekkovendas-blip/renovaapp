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
import { ComposerSheet } from "./composer/sheet";
import { useDraft } from "./composer/use-draft";
import type { DraftState } from "@/lib/drafts";
import { readLocalDraft, removeLocalDraft } from "@/lib/local-drafts";
import { ComposerHeader, StepIndicator } from "./composer/composer-header";
import { ComposerStack } from "./composer/composer-stack";
import { usePreviewPreference, useProtocolDrafts, useRealPdf, useStoredStack } from "./composer/hooks";
import { DesktopPreview, MobilePreview, MobileViewSwitch, ShowPreviewButton } from "./composer/preview-panels";
import type { FrequentItem } from "@/lib/rx-suggestions";
import { PrescriptionCard } from "./composer/prescription-card";
import { ReceitaCard } from "./composer/receita-card";
import { ReviewStep } from "./composer/review-step";
import { TextEditorCard } from "./composer/text-editor";
import { TypePicker } from "./composer/type-picker";
import { TypeRail } from "./composer/type-rail";
import type { TabOption } from "./composer/type-picker";
import { Banner } from "./composer/ui";
import type { ComposerActions, ComposerPatient, ComposerProfessional } from "./composer/types";

// Os tipos moram em composer/types.ts; seguem exportados daqui para quem já os importava.
export type { ComposerActions, ComposerPatient, ComposerProfessional, SeedableDocument } from "./composer/types";

/**
 * "Emitir documentos": um compositor só para atestado, encaminhamento, laudo,
 * orientações e receituário. Dois passos — montar a pilha (tipo → modelo →
 * campos → Incluir) e revisar (paciente, data, profissional, portal, WhatsApp)
 * — e um único <form action={emitDocumentsAction}> em volta de tudo: a pilha
 * vai no campo escondido `items` (JSON de ComposerItem, ver src/lib/composer.ts)
 * e os controles da revisão são inputs de verdade. O código de autenticidade
 * de cada item nasce aqui, no navegador, e aparece desde o primeiro clique;
 * o servidor só o troca se já existir.
 *
 * A tela segue a da Mevo: cabeçalho com o avatar e o nome do paciente e o
 * código do documento à direita, a linha das etapas, as pílulas de tipo, os
 * modelos em chips, o editor, a pilha "Nesta emissão" e um rodapé grudado
 * embaixo com "Continuar" / "Emitir e enviar". A pílula "Receita digital"
 * abre a Memed (assinatura digital). O rail de 64px à direita (Perfil,
 * Histórico, Modelos, Ajuda — composer-rail.tsx) abre as gavetas flutuando
 * ao lado; `ComposerActions` é o que ele usa para mexer na pilha.
 *
 * Abaixo do lg (celular e tablet) o editor ocupa a largura toda: os tipos e
 * os modelos viram fileiras que rolam de lado, o rail vira uma barra de
 * quatro botões cujas gavetas sobem como folhas, a prévia vira a aba "Prévia"
 * de um controle segmentado (a folha A4 encolhida até caber) e o rodapé gruda
 * logo acima da barra de abas do app. Arrastar não existe no toque: tocar num
 * modelo aplica, e a pilha tem botões de subir/descer.
 *
 * Organização: este arquivo junta o estado e liga as peças de ./composer/.
 * O editor é um reducer puro (src/lib/composer-editor.ts, testado); a pilha
 * guardada, a preferência da prévia, o PDF real e os protocolos são hooks
 * (composer/hooks.ts). A prévia acompanha cada tecla; as peças que não
 * dependem do texto (tipos e modelos, linhas da pilha, rail, folha) são
 * memo e recebem callbacks estáveis, então digitar não as refaz.
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
  /** "modal": pop-up por cima da ficha (rota interceptada); "page": a página inteira (F5, link direto). */
  presentation: "modal" | "page";
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
}

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
  presentation,
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
}: EmitComposerProps) {
  const [step, setStep] = useState<ComposerStep>("compose");
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
    router.replace(`/pacientes/${patientId}?aba=documentos`);
  }, [closing, draft, stackKey, router, patientId]);

  // Revisão.
  const [professionalId, setProfessionalId] = useState<number>(defaultProfessionalId ?? professionals[0]?.id ?? 0);
  const [date, setDate] = useState(today);
  const [send, setSend] = useState(() => initialSendOptions(patient.phone));

  const professional = professionals.find((p) => p.id === professionalId) ?? null;
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
        return;
      }
      dispatch({ type: "apply-template", template: t, code: generateDocumentCode() });
    },
    [templates, ctx, setItems, clearProtocolMessage]
  );

  const editItem = useCallback(
    (item: ComposerItem) => {
      dispatch({ type: "edit-item", editor: editorFromItem(item, templates) });
      document.getElementById("emit-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [templates]
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
      appendItems: (more) => setItems((current) => appendItems(current, more)),
      appendFromDocument: (doc) => setItems((current) => appendItems(current, [seedFromDocument(doc, templates, ctx)])),
      applyTemplate,
      openProtocolForm,
    }),
    [items, setItems, templates, ctx, applyTemplate, openProtocolForm]
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
      });
      return;
    }
    void pdf.open({ title, body, code: editor.code, kind: editor.kind, professionalId });
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

  // Uma grade só para os dois tamanhos: no celular é uma coluna — tipos, editor, pilha — e no
  // desktop a prévia ocupa a coluna da direita. Perfil, Histórico, Modelos e Ajuda ficaram numa
  // barra discreta no alto (ao lado das etapas), para a folha ter espaço e ser legível.
  const composeStep = (
    // No computador os tipos são uma barra estreita à esquerda, como a do YouTube recolhida.
    <div className="lg:flex lg:items-start lg:gap-4">
      {/* No pop-up a barra encosta na borda (~12px), como a do YouTube: o respiro de 32px da folha fica para o resto. */}
      <TypeRail
        tabs={tabs}
        tab={tab}
        onSelect={selectTab}
        vertical
        className={`hidden lg:sticky lg:top-4 lg:flex ${presentation === "modal" ? "lg:-ml-5" : ""}`}
      />
      <div
        // grid-rows: a prévia (3 fileiras) é mais alta que o editor; a sobra fica embaixo da pilha, não entre os blocos.
        className={`grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-rows-[auto_auto_1fr] lg:gap-x-6 ${
          previewOn ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,31.5rem)]" : ""
        }`}
      >
        <div className="space-y-3">
          {!previewOn ? <ShowPreviewButton onShow={() => setPreviewOn(true)} /> : null}
          <TypePicker
            tabs={tabs}
            tab={tab}
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

        {previewOn ? (
          <DesktopPreview {...preview} onHide={() => setPreviewOn(false)} />
        ) : null}

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
      </div>
    </div>
  );

  const form = (
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
      {draft.draftId && !draft.draftId.startsWith("local-") ? (
        <input type="hidden" name="draft_id" value={draft.draftId} />
      ) : null}

      {error ? <Banner tone="erro">{emitErrorMessage(error)}</Banner> : null}
      {ok === "perfil" ? <Banner tone="ok">Cadastro do paciente atualizado. A pilha continua como estava.</Banner> : null}

      <ComposerHeader
        patientId={patientId}
        displayName={displayName}
        encounterDate={encounterDate}
        step={step}
        countLabel={countLabel}
        code={tab !== "receita" && editor.code ? { kind: editor.kind, value: editor.code } : null}
        onClose={close}
        closing={closing}
        draftStatus={draft.status}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StepIndicator step={step} />
        {step === "compose" ? (
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
        ) : null}
      </div>

      {step === "compose" ? (
        composeStep
      ) : (
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
        />
      )}

      <ComposerActionBar
        step={step}
        patientId={patientId}
        countLabel={countLabel}
        canContinue={items.length > 0}
        onStepChange={setStep}
        onClose={close}
        closing={closing}
        inSheet={presentation === "modal"}
      />
    </form>
  );

  return presentation === "modal" ? (
    <ComposerSheet onClose={close} label={`Emitir documentos — ${displayName}`}>
      {form}
    </ComposerSheet>
  ) : (
    form
  );
}
