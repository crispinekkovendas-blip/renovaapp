"use client";

import { useState } from "react";
import { CidPicker } from "@/components/documents/cid-picker";
import { VITALS, bmi, readVitals, vitalAlerts } from "@/lib/clinical-history";
import type { VitalKey } from "@/lib/clinical-history";

/**
 * Sinais vitais do atendimento, numa grade compacta, com o IMC e os alertas
 * (PA elevada, febre, saturação baixa…) calculados enquanto se digita.
 */
export function VitalsFields() {
  const [values, setValues] = useState<Partial<Record<VitalKey, string>>>({});
  const { vitals, rejected } = readVitals(values);
  const imc = bmi(vitals);
  const alerts = vitalAlerts(vitals);

  return (
    <fieldset>
      <legend className="label">Sinais vitais</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {VITALS.map((v) => (
          <div key={v.key}>
            <label className="mb-0.5 block text-[11px] font-bold text-pine-900/60" htmlFor={`vital-${v.key}`}>
              {v.label} <span className="font-normal text-pine-900/45">({v.unit})</span>
            </label>
            <input
              className={`input ${rejected.includes(v.key) ? "border-rose-400" : ""}`}
              id={`vital-${v.key}`}
              name={`vital_${v.key}`}
              inputMode={v.inputMode}
              autoComplete="off"
              placeholder={v.placeholder}
              aria-invalid={rejected.includes(v.key) || undefined}
              value={values[v.key] ?? ""}
              onChange={(e) => setValues((all) => ({ ...all, [v.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {imc !== null || alerts.length || rejected.length ? (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" aria-live="polite">
          {imc !== null ? <span className="chip bg-pine-100 text-pine-800">IMC {String(imc).replace(".", ",")}</span> : null}
          {alerts.map((a) => (
            <span key={a} className="chip bg-amber-100 text-amber-900">
              {a}
            </span>
          ))}
          {rejected.length ? (
            <span className="text-rose-700">Valor fora do possível em {rejected.map((k) => VITALS.find((v) => v.key === k)!.label).join(", ")}.</span>
          ) : null}
        </p>
      ) : null}
    </fieldset>
  );
}

/** CID-10 da hipótese, com a busca do catálogo do DATASUS (o campo vai como `cid`). */
export function EncounterCid({ patientSex }: { patientSex: string | null }) {
  const [value, setValue] = useState("");
  return <CidPicker id="enc-cid" label="CID-10" value={value} onChange={setValue} patientSex={patientSex} />;
}
