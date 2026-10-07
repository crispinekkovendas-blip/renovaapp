"use client";

import type { DocumentFieldValues, FieldDef, FieldKey } from "@/lib/documents";
import { CidPicker } from "./cid-picker";

/**
 * Os campos estruturados de um documento (dias, motivo, CID, consentimento,
 * horários, especialidade, história, conduta…), desenhados a partir das
 * `FieldDef` de `fieldsFor`. Controlado: quem usa guarda `values` e recebe
 * `onChange(key, valor)`. Cada controle tem um `name={key}`, então o mesmo
 * componente serve ao formulário clássico (POST sem JS) e ao compositor.
 *
 * Tipos: number/text/time (com `suggestions` vira input + datalist), select
 * (a última opção, "Outro", abre um texto livre — um input escondido leva o
 * valor efetivo), checkbox (valor "1" quando marcado) e textarea.
 */

export interface DocumentFieldsProps {
  fieldDefs: ReadonlyArray<FieldDef>;
  values: DocumentFieldValues;
  onChange: (key: FieldKey, value: string) => void;
  /** Prefixo dos ids ("doc" → id="doc-dias"): o mesmo campo pode existir em mais de um formulário na página. */
  idPrefix: string;
  /** Sexo da ficha, só para o aviso do CID classificado para outro sexo. */
  patientSex?: string | null;
}

export function DocumentFields({ fieldDefs, values, onChange, idPrefix, patientSex }: DocumentFieldsProps) {
  if (fieldDefs.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fieldDefs.map((def) => (
        <div key={def.key} className={def.wide ? "sm:col-span-2" : ""}>
          {def.key === "cid" ? (
            // O CID tem busca no catálogo do DATASUS, mas continua sendo texto
            // livre: sem a migração, ou com código fora da versão 2008, o campo
            // funciona como sempre funcionou.
            <CidPicker
              id={`${idPrefix}-cid`}
              label={def.label}
              value={values.cid ?? ""}
              onChange={(value) => onChange("cid", value)}
              patientSex={patientSex}
            />
          ) : (
          <FieldControl
            def={def}
            id={`${idPrefix}-${def.key}`}
            value={values[def.key] ?? ""}
            onChange={(value) => onChange(def.key, value)}
          />
          )}
        </div>
      ))}
    </div>
  );
}

interface ControlProps {
  def: FieldDef;
  id: string;
  value: string;
  onChange: (value: string) => void;
}

function Hint({ text, className }: { text?: string; className?: string }) {
  if (!text) return null;
  return <p className={`mt-1 text-[11px] text-pine-900/50 ${className ?? ""}`}>{text}</p>;
}

function FieldControl({ def, id, value, onChange }: ControlProps) {
  if (def.type === "checkbox") {
    return (
      <>
        <label className="flex items-start gap-2 py-1 text-sm" htmlFor={id}>
          <input
            type="checkbox"
            id={id}
            name={def.key}
            value="1"
            checked={value === "1"}
            onChange={(e) => onChange(e.target.checked ? "1" : "")}
            className="mt-0.5 h-4 w-4 shrink-0 accent-pine-700 pointer-coarse:h-5 pointer-coarse:w-5"
          />
          <span>{def.label}</span>
        </label>
        <Hint text={def.hint} className="ml-6 pointer-coarse:ml-7" />
      </>
    );
  }

  if (def.type === "select" && def.options && def.options.length > 0) {
    return <SelectControl def={def} id={id} value={value} onChange={onChange} />;
  }

  if (def.type === "textarea") {
    return (
      <>
        <label className="label" htmlFor={id}>
          {def.label}
        </label>
        <textarea
          className="input"
          id={id}
          name={def.key}
          rows={def.rows ?? 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Hint text={def.hint} />
      </>
    );
  }

  const listId = def.suggestions && def.suggestions.length > 0 ? `${id}-list` : undefined;
  const inputType = def.type === "number" || def.type === "time" ? def.type : "text";
  return (
    <>
      <label className="label" htmlFor={id}>
        {def.label}
      </label>
      <input
        className="input"
        id={id}
        name={def.key}
        type={inputType}
        list={listId}
        autoComplete={listId ? "off" : undefined}
        min={inputType === "number" ? 0 : undefined}
        step={inputType === "number" ? 1 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {listId ? (
        <datalist id={listId}>
          {def.suggestions!.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
      <Hint text={def.hint} />
    </>
  );
}

/**
 * Select com "Outro": o valor efetivo vai num input escondido com o `name`;
 * quando ele não é uma das opções prontas (inclusive vazio, logo depois de
 * escolher "Outro"), o select mostra "Outro" e um texto livre aparece.
 * Sem estado local: o que está em `value` decide tudo, então o formulário
 * pode trocar os valores por fora (modelo, item editado) sem descompasso.
 */
function SelectControl({ def, id, value, onChange }: ControlProps) {
  const options = def.options ?? [];
  const other = options[options.length - 1];
  const presets = options.slice(0, -1);
  const custom = !presets.includes(value);
  return (
    <>
      <label className="label" htmlFor={id}>
        {def.label}
      </label>
      <input type="hidden" name={def.key} value={value} />
      <select
        className="input"
        id={id}
        value={custom ? other : value}
        onChange={(e) => onChange(e.target.value === other ? "" : e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {custom ? (
        <input
          className="input mt-2"
          id={`${id}-outro`}
          type="text"
          aria-label={`${def.label} — outro`}
          placeholder="Escreva aqui"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
      <Hint text={def.hint} />
    </>
  );
}
