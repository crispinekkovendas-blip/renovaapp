import Link from "next/link";
import type { Patient } from "@/lib/db";
import { updatePatientAction } from "@/lib/actions";
import { SectionTitle } from "@/components/ui";
import { SEX_OPTIONS, patientFacts } from "./chart-model";

/** Cartão "Dados do paciente": leitura por padrão, formulário com ?editar=1. */
export function PatientDataCard({ patient, editing }: { patient: Patient; editing: boolean }) {
  return (
    <section id="dados" className="card scroll-mt-20 p-4 sm:p-5">
      <SectionTitle>{editing ? "Editar cadastro" : "Dados do paciente"}</SectionTitle>
      {editing ? <PatientEditForm patient={patient} /> : <PatientFacts patient={patient} />}
    </section>
  );
}

function PatientFacts({ patient }: { patient: Patient }) {
  return (
    <dl className="space-y-2.5 text-sm">
      {patientFacts(patient).map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="shrink-0 text-pine-900/50">{label}</dt>
          <dd className="min-w-0 text-right font-semibold [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
      {patient.notes ? (
        <div className="whitespace-pre-line break-words rounded-xl bg-clay-50 p-3 text-xs text-clay-900">
          {patient.notes}
        </div>
      ) : null}
    </dl>
  );
}

// Dados do paciente, não de quem digita: autoComplete off nos campos pessoais
// para o navegador não sugerir o CPF/telefone da recepcionista.
function PatientEditForm({ patient }: { patient: Patient }) {
  return (
    <form action={updatePatientAction} className="space-y-3">
      <input type="hidden" name="id" value={patient.id} />
      <div>
        <label className="label" htmlFor="edit-name">
          Nome completo *
        </label>
        <input className="input" id="edit-name" name="name" defaultValue={patient.name} required autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="edit-social-name">
          Nome social (opcional)
        </label>
        <input
          className="input"
          id="edit-social-name"
          name="social_name"
          maxLength={120}
          aria-describedby="edit-social-name-hint"
          defaultValue={patient.social_name ?? ""}
        />
        <p id="edit-social-name-hint" className="mt-1 text-[11px] text-pine-900/50">
          Como a pessoa quer ser chamada. Aparece primeiro no prontuário e nos documentos; o nome civil continua
          registrado.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="edit-cpf">
            CPF
          </label>
          <input
            className="input"
            id="edit-cpf"
            name="cpf"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={patient.cpf ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="edit-birth-date">
            Nascimento
          </label>
          <input
            className="input"
            type="date"
            id="edit-birth-date"
            name="birth_date"
            defaultValue={patient.birth_date ?? ""}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="edit-sex">
            Sexo
          </label>
          <select className="input" id="edit-sex" name="sex" defaultValue={patient.sex ?? ""}>
            <option value="">—</option>
            {SEX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="edit-phone">
            Telefone
          </label>
          <input
            className="input"
            type="tel"
            id="edit-phone"
            name="phone"
            autoComplete="off"
            defaultValue={patient.phone ?? ""}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="edit-email">
          E-mail
        </label>
        <input
          className="input"
          type="email"
          id="edit-email"
          name="email"
          autoComplete="off"
          autoCapitalize="none"
          defaultValue={patient.email ?? ""}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="edit-insurance">
            Convênio
          </label>
          <input className="input" id="edit-insurance" name="insurance" defaultValue={patient.insurance ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="edit-insurance-number">
            Nº carteirinha
          </label>
          <input
            className="input"
            id="edit-insurance-number"
            name="insurance_number"
            autoComplete="off"
            defaultValue={patient.insurance_number ?? ""}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="edit-city">
          Cidade
        </label>
        <input className="input" id="edit-city" name="city" defaultValue={patient.city ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="edit-allergies">
          Alergias
        </label>
        <textarea
          className="input"
          id="edit-allergies"
          name="allergies"
          rows={2}
          placeholder="Uma por linha"
          defaultValue={patient.allergies ?? ""}
        />
      </div>
      <div>
        <label className="label" htmlFor="edit-medications">
          Medicamentos em uso
        </label>
        <textarea
          className="input"
          id="edit-medications"
          name="medications"
          rows={2}
          placeholder="Um por linha"
          defaultValue={patient.medications ?? ""}
        />
      </div>
      <div>
        <label className="label" htmlFor="edit-notes">
          Observações
        </label>
        <textarea className="input" id="edit-notes" name="notes" rows={2} defaultValue={patient.notes ?? ""} />
      </div>
      <div className="mobile-action-bar flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          Salvar
        </button>
        <Link href={`/pacientes/${patient.id}`} className="btn btn-outline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
