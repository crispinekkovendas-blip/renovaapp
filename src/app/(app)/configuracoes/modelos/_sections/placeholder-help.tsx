import { PLACEHOLDERS } from "@/lib/documents";
import { SectionTitle } from "@/components/ui";

/** Guia dos {{campos}} que o Renova preenche ao emitir. */
export function PlaceholderHelp() {
  return (
    <div className="card mt-6 p-4 sm:p-5">
      <SectionTitle>Campos que se preenchem sozinhos</SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-pine-900/60">
        Escreva o campo entre chaves duplas e o Renova troca pelo dado do paciente na hora de emitir.
      </p>
      <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        {PLACEHOLDERS.map((p) => (
          // flex-wrap: no celular o nome do campo e a explicação não cabem sempre lado a lado.
          <div key={p.key} className="flex flex-wrap gap-x-2">
            <dt className="min-w-0 font-mono font-bold break-all text-pine-950">{`{{${p.key}}}`}</dt>
            <dd className="text-pine-900/65">{p.label}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-3 space-y-1 text-xs text-pine-900/60">
        <li>Um campo que o Renova não conhece fica visível no documento, do jeito que foi escrito — assim você percebe.</li>
        <li>
          Uma linha cujos campos ficaram todos vazios some do documento. É assim que{" "}
          <span className="font-mono">CID: {"{{cid}}"}</span> só aparece quando o CID foi preenchido.
        </li>
      </ul>
    </div>
  );
}
