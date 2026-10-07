import Link from "next/link";
import { createPatientAction } from "@/lib/actions";
import { SEX_OPTIONS } from "./chart/chart-model";
import { Feedback } from "@/components/feedback";

// Os dados são do paciente, não de quem digita: autoComplete="off" evita que o
// navegador sugira o nome, CPF ou telefone da própria recepcionista.
export function NewPatientForm({ error, closeHref }: { error?: string; closeHref: string }) {
  return (
    <>
      <h2 className="font-display text-xl font-semibold text-pine-950">Novo paciente</h2>
      {error === "nome" ? (
        <Feedback tone="erro" className="mt-2">
          Informe ao menos o nome.
        </Feedback>
      ) : null}
      <form action={createPatientAction} className="mt-4 space-y-3" autoComplete="off">
        <div>
          <label className="label" htmlFor="name">
            Nome completo *
          </label>
          <input
            className="input"
            id="name"
            name="name"
            required
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
          />
        </div>
        <div>
          <label className="label" htmlFor="social_name">
            Nome social (opcional)
          </label>
          <input
            className="input"
            id="social_name"
            name="social_name"
            maxLength={120}
            aria-describedby="social_name-hint"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
          />
          <p id="social_name-hint" className="mt-1 text-[11px] text-pine-900/50">
            Como a pessoa quer ser chamada. Aparece primeiro no prontuário e nos documentos; o nome civil continua
            registrado.
          </p>
        </div>
        {/* Um campo por linha no celular; lado a lado do sm para cima. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cpf">
              CPF
            </label>
            <input
              className="input"
              id="cpf"
              name="cpf"
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="next"
            />
          </div>
          <div>
            <label className="label" htmlFor="birth_date">
              Nascimento
            </label>
            <input className="input" type="date" id="birth_date" name="birth_date" autoComplete="off" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sex">
              Sexo
            </label>
            <select className="input" id="sex" name="sex" defaultValue="">
              <option value="">—</option>
              {SEX_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Telefone
            </label>
            <input
              className="input"
              type="tel"
              id="phone"
              name="phone"
              placeholder="(11) 90000-0000"
              autoComplete="off"
              enterKeyHint="next"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            className="input"
            type="email"
            id="email"
            name="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="insurance">
              Convênio
            </label>
            <input
              className="input"
              id="insurance"
              name="insurance"
              placeholder="Particular"
              autoComplete="off"
              enterKeyHint="next"
            />
          </div>
          <div>
            <label className="label" htmlFor="insurance_number">
              Nº carteirinha
            </label>
            <input
              className="input"
              id="insurance_number"
              name="insurance_number"
              autoComplete="off"
              enterKeyHint="next"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="city">
            Cidade
          </label>
          <input
            className="input"
            id="city"
            name="city"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="allergies">
              Alergias
            </label>
            <textarea className="input" id="allergies" name="allergies" rows={2} placeholder="Uma por linha" />
          </div>
          <div>
            <label className="label" htmlFor="medications">
              Medicamentos em uso
            </label>
            <textarea className="input" id="medications" name="medications" rows={2} placeholder="Um por linha" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Observações
          </label>
          <textarea className="input" id="notes" name="notes" rows={2} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn btn-primary flex-1">
            Cadastrar
          </button>
          <Link href={closeHref} className="btn btn-outline">
            Fechar
          </Link>
        </div>
      </form>
    </>
  );
}
