"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createDocumentAction } from "@/lib/actions-documents";
import { buildTemplateVars, defaultFieldValues, renderTemplate } from "@/lib/documents";
import type { DocumentFieldValues, DocumentKind, FieldDef } from "@/lib/documents";
import { DocumentFields } from "./document-fields";
import { Feedback } from "@/components/feedback";

/**
 * Formulário de "Novo documento". O tipo e o subtipo vêm da URL (as pílulas
 * acima são links, então trocar de tipo funciona sem JS). Aqui o JS só faz
 * conforto: o texto é refeito a cada mudança de modelo, profissional, data
 * ou campo. Sem JS, o servidor refaz o texto na hora de emitir (`body_auto`).
 * Os campos estruturados são o DocumentFields, compartilhado com o compositor.
 */

/** Erros que createDocumentAction devolve em ?erro=; qualquer outro é o do profissional. */
const ERROR_MESSAGE: Partial<Record<string, string>> = {
  migracao: "Os documentos ainda não estão ativos neste banco: rode a migração 2026-09-09.",
  texto: "O texto do documento ficou vazio — escreva alguma coisa antes de emitir.",
  codigo: "Não deu para gerar um código único agora. Tente de novo.",
  permissao: "Documento médico é emitido pelo profissional (ou pelo administrador).",
};
const ERROR_FALLBACK = "Faltou escolher o profissional.";

export interface FormTemplate {
  /** null = modelo padrão do Renova. */
  id: number | null;
  name: string;
  title: string;
  body: string;
}

export interface FormProfessional {
  id: number;
  name: string;
  council: string;
}

export function DocumentForm({
  patientId,
  patient,
  kind,
  subkind,
  professionals,
  defaultProfessionalId,
  encounterId,
  templates,
  fieldDefs,
  clinicName,
  today,
  canManageTemplates,
  error,
}: {
  patientId: number;
  patient: { name: string; cpf: string | null; social_name?: string | null };
  kind: DocumentKind;
  subkind: string | null;
  professionals: FormProfessional[];
  defaultProfessionalId: number | null;
  encounterId: number | null;
  templates: FormTemplate[];
  fieldDefs: FieldDef[];
  clinicName: string;
  today: string;
  canManageTemplates: boolean;
  error?: string;
}) {
  const [templateIndex, setTemplateIndex] = useState(0);
  const [professionalId, setProfessionalId] = useState<number>(defaultProfessionalId ?? professionals[0]?.id ?? 0);
  const [date, setDate] = useState(today);
  const [fields, setFields] = useState<DocumentFieldValues>(() => defaultFieldValues(fieldDefs));
  // null = segue o modelo; texto = a pessoa editou à mão.
  const [manualBody, setManualBody] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState<string | null>(null);

  const template = templates[templateIndex] ?? templates[0];
  const professional = professionals.find((p) => p.id === professionalId) ?? null;

  const autoBody = useMemo(
    () =>
      renderTemplate(
        template?.body ?? "",
        buildTemplateVars({ patient, professional, clinicName, date, fields, kind })
      ),
    [template, patient, professional, clinicName, date, fields, kind]
  );
  const body = manualBody ?? autoBody;
  const title = manualTitle ?? template?.title ?? "";

  return (
    <form action={createDocumentAction} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="kind" value={kind} />
      {subkind ? <input type="hidden" name="subkind" value={subkind} /> : null}
      {encounterId ? <input type="hidden" name="encounter_id" value={encounterId} /> : null}
      <input type="hidden" name="body_auto" value={manualBody === null ? "1" : "0"} />

      <div className="card space-y-4 p-4 sm:p-5">
        {error ? (
          <Feedback tone="erro">{(Object.hasOwn(ERROR_MESSAGE, error) && ERROR_MESSAGE[error]) || ERROR_FALLBACK}</Feedback>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="doc-prof">
              Profissional
            </label>
            <select
              className="input"
              id="doc-prof"
              name="professional_id"
              required
              value={professionalId || ""}
              onChange={(e) => setProfessionalId(Number(e.target.value))}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="doc-date">
              Data
            </label>
            <input
              className="input"
              type="date"
              id="doc-date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value || today)}
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className="label" htmlFor="doc-template">
              Modelo
            </label>
            {canManageTemplates ? (
              <Link
                href="/configuracoes/modelos"
                className="inline-flex min-h-11 items-center text-[11px] font-bold text-pine-600 hover:underline sm:min-h-0"
              >
                Gerenciar modelos
              </Link>
            ) : null}
          </div>
          <select
            className="input"
            id="doc-template"
            name="template_id"
            value={template?.id ?? ""}
            onChange={(e) => {
              const index = templates.findIndex((t) => String(t.id ?? "") === e.target.value);
              setTemplateIndex(index >= 0 ? index : 0);
              setManualBody(null);
              setManualTitle(null);
            }}
          >
            {templates.map((t, i) => (
              <option key={t.id ?? `padrao-${i}`} value={t.id ?? ""}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <DocumentFields
          fieldDefs={fieldDefs}
          values={fields}
          onChange={(key, value) => setFields((current) => ({ ...current, [key]: value }))}
          idPrefix="doc"
        />

        <div>
          <label className="label" htmlFor="doc-title">
            Título na folha
          </label>
          <input
            className="input"
            id="doc-title"
            name="title"
            maxLength={120}
            value={title}
            onChange={(e) => setManualTitle(e.target.value)}
          />
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
          <input type="checkbox" name="shared" value="1" defaultChecked className="h-4 w-4 accent-pine-700" />
          Mostrar no portal do paciente
        </label>

        {/* Abaixo de lg o texto vem depois deste cartão: as ações descem para o fim
            (barra fixa no celular), para revisar o texto antes de emitir. */}
        <div className="hidden flex-wrap gap-2 pt-1 lg:flex">
          <button type="submit" className="btn btn-primary">
            Emitir documento
          </button>
          <Link href={`/pacientes/${patientId}`} className="btn btn-outline">
            Cancelar
          </Link>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label className="label" htmlFor="doc-body">
            Texto do documento
          </label>
          {manualBody !== null ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center text-[11px] font-bold text-pine-600 hover:underline sm:min-h-0"
              onClick={() => setManualBody(null)}
            >
              Voltar ao texto do modelo
            </button>
          ) : (
            <span className="text-[11px] text-pine-900/45">
              segue o modelo e os campos <span className="lg:hidden">acima</span>
              <span className="hidden lg:inline">ao lado</span>
            </span>
          )}
        </div>
        <textarea
          className="input min-h-[22rem] font-display text-base leading-relaxed"
          id="doc-body"
          name="body"
          rows={16}
          value={body}
          onChange={(e) => setManualBody(e.target.value)}
        />
        <p className="mt-2 text-xs text-pine-900/50">
          Revise antes de emitir: o texto sai na folha exatamente assim, com o código de autenticidade no rodapé.
        </p>
      </div>

      <div className="mobile-action-bar flex gap-2 lg:hidden">
        <button type="submit" className="btn btn-primary flex-1 sm:flex-none">
          Emitir documento
        </button>
        <Link href={`/pacientes/${patientId}`} className="btn btn-outline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
