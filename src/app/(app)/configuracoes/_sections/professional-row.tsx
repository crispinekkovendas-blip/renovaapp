import type { Professional } from "@/lib/db";
import {
  toggleProfessionalAction,
  updateProfessionalMemedAction,
  updateProfessionalSignatureAction,
} from "@/lib/actions";
import { parseCouncil } from "@/lib/memed/board";
import { missingMemedFields } from "@/lib/memed/prescriber";
import type { MemedSpecialty, SpecialtyGroup } from "../specialty-groups";

/** py no celular: o resumo vira um alvo de toque de verdade, não uma linha de 11px. */
const SUMMARY_CLASS = "cursor-pointer py-2.5 text-xs font-bold text-pine-700 sm:py-0 sm:text-[11px]";

/** Um profissional: nome, ativar/desativar e os dois painéis de cadastro (prescrição e assinatura). */
export function ProfessionalRow({
  prof,
  specialtyGroups,
}: {
  prof: Professional;
  /** Vazio quando a Memed não está configurada ou fora do ar: o campo vira texto livre. */
  specialtyGroups: SpecialtyGroup<MemedSpecialty>[];
}) {
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: prof.color }} />
          <div className="min-w-0">
            <p className={`truncate text-sm font-bold ${prof.active ? "" : "text-pine-900/40 line-through"}`}>
              {prof.name}
            </p>
            <p className="truncate text-xs text-pine-900/55">
              {prof.specialty}
              {prof.council ? ` · ${prof.council}` : ""}
            </p>
          </div>
        </div>
        <form action={toggleProfessionalAction}>
          <input type="hidden" name="id" value={prof.id} />
          <button type="submit" className="btn btn-ghost px-2.5 py-1 text-xs">
            {prof.active ? "Desativar" : "Reativar"}
          </button>
        </form>
      </div>

      <PrescriberDetails prof={prof} specialtyGroups={specialtyGroups} />
      <SignatureDetails prof={prof} />
    </div>
  );
}

function PrescriberDetails({ prof, specialtyGroups }: { prof: Professional; specialtyGroups: SpecialtyGroup<MemedSpecialty>[] }) {
  // Sugestão a partir do texto livre de `council` — o admin confirma antes de salvar.
  const board = parseCouncil(prof.council);
  const missing = missingMemedFields(prof);

  return (
    <details className="mt-2">
      <summary className={SUMMARY_CLASS}>
        Dados para prescrição digital
        {missing.length > 0 ? (
          <span className="ml-1 chip bg-clay-100 text-clay-800">incompleto</span>
        ) : (
          <span className="ml-1 chip bg-pine-100 text-pine-800">pronto</span>
        )}
      </summary>
      <form action={updateProfessionalMemedAction} className="mt-2 grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="id" value={prof.id} />
        <div>
          <label className="label" htmlFor={`cpf-${prof.id}`}>
            CPF
          </label>
          <input
            className="input"
            id={`cpf-${prof.id}`}
            name="cpf"
            defaultValue={prof.cpf ?? ""}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <label className="label" htmlFor={`nasc-${prof.id}`}>
            Nascimento
          </label>
          <input className="input" type="date" id={`nasc-${prof.id}`} name="birth_date" defaultValue={prof.birth_date ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor={`bc-${prof.id}`}>
            Conselho
          </label>
          <input
            className="input"
            id={`bc-${prof.id}`}
            name="board_code"
            defaultValue={prof.board_code ?? board?.code ?? ""}
            placeholder="CRM"
          />
        </div>
        <div>
          <label className="label" htmlFor={`bs-${prof.id}`}>
            UF
          </label>
          <input
            className="input"
            id={`bs-${prof.id}`}
            name="board_state"
            maxLength={2}
            autoCapitalize="characters"
            defaultValue={prof.board_state ?? board?.state ?? ""}
            placeholder="SP"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`bn-${prof.id}`}>
            Número do conselho
          </label>
          <input
            className="input"
            id={`bn-${prof.id}`}
            name="board_number"
            defaultValue={prof.board_number ?? board?.number ?? ""}
            inputMode="numeric"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`esp-${prof.id}`}>
            Especialidade (Memed)
          </label>
          {specialtyGroups.length > 0 ? (
            <select
              className="input"
              id={`esp-${prof.id}`}
              name="memed_specialty_id"
              defaultValue={prof.memed_specialty_id ?? ""}
              aria-describedby={`esp-${prof.id}-hint`}
            >
              <option value="">—</option>
              {specialtyGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map((specialty) => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <input
              className="input"
              id={`esp-${prof.id}`}
              name="memed_specialty_id"
              defaultValue={prof.memed_specialty_id ?? ""}
              inputMode="numeric"
              placeholder="id da Memed — lista indisponível agora"
              aria-describedby={`esp-${prof.id}-hint`}
            />
          )}
          <p id={`esp-${prof.id}-hint`} className="mt-1 text-[11px] text-pine-900/50">
            Exigida pela Memed para credenciais de produção.
            {prof.specialty ? ` Cadastro atual: ${prof.specialty}.` : ""}
          </p>
        </div>
        <p className="text-[11px] text-pine-900/50 sm:col-span-2">
          {missing.length > 0
            ? `Falta: ${missing.join(", ")}. A receita digital assinada exige esses dados no cadastro do conselho.`
            : "Cadastro completo — este profissional pode emitir receita digital."}
        </p>
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary w-full py-1 text-xs">
            Salvar dados de prescrição
          </button>
        </div>
      </form>
    </details>
  );
}

function SignatureDetails({ prof }: { prof: Professional }) {
  return (
    <details className="mt-2">
      <summary className={SUMMARY_CLASS}>
        Assinatura e carimbo
        {prof.signature_image ? (
          <span className="ml-1 chip bg-pine-100 text-pine-800">digitalizada</span>
        ) : (
          <span className="ml-1 chip bg-stone-200 text-stone-600">à mão</span>
        )}
      </summary>
      {/* Ação com arquivo: o React manda o multipart sozinho (encType/method vêm da action). */}
      <form action={updateProfessionalSignatureAction} className="mt-2 grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="id" value={prof.id} />
        <p className="text-[11px] text-pine-900/50 sm:col-span-2">
          Vai impressa nos atestados, encaminhamentos e laudos, com o carimbo (nome, conselho e RQE).
          Não substitui a assinatura digital ICP-Brasil da receita.
        </p>
        <div className="sm:col-span-2">
          {prof.signature_image ? (
            // Data URL vinda do banco: <img> mesmo.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prof.signature_image}
              alt={`Assinatura de ${prof.name}`}
              className="h-12 w-auto max-w-full rounded-lg border border-pine-900/10 bg-white object-contain px-2"
            />
          ) : (
            <p className="text-xs text-pine-900/55">Sem assinatura digitalizada — a folha sai com linha para assinar à mão.</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor={`rqe-${prof.id}`}>
            RQE
          </label>
          <input
            className="input"
            id={`rqe-${prof.id}`}
            name="rqe"
            maxLength={20}
            defaultValue={prof.rqe ?? ""}
            placeholder="12345"
          />
        </div>
        <div>
          <label className="label" htmlFor={`sig-${prof.id}`}>
            Assinatura (PNG ou JPG, fundo branco, até 300 KB)
          </label>
          <input
            className="input py-1.5 sm:text-xs"
            type="file"
            id={`sig-${prof.id}`}
            name="signature"
            accept="image/png,image/jpeg"
          />
        </div>
        {prof.signature_image ? (
          <label className="flex min-h-11 items-center gap-2 text-xs sm:col-span-2 sm:min-h-0">
            <input type="checkbox" name="remove_signature" value="1" className="h-4 w-4 accent-pine-700" />
            Remover assinatura
          </label>
        ) : null}
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary w-full py-1 text-xs">
            Salvar
          </button>
        </div>
      </form>
    </details>
  );
}
