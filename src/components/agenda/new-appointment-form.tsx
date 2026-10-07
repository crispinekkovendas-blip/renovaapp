import Link from "next/link";
import { createAppointmentAction } from "@/lib/actions";
import type { Patient, Professional } from "@/lib/db";
import { APPOINTMENT_ERRORS, ErrorBanner } from "@/components/agenda/agenda-errors";

export function NewAppointmentForm({
  date,
  time,
  professionalId,
  patientId,
  waitlistId,
  patients,
  professionals,
  error,
  closeHref,
  Heading = "h2",
}: {
  date: string;
  time?: string;
  professionalId?: string;
  patientId?: string;
  /** Quando veio da lista de espera: a entrada vira "agendado" ao criar. */
  waitlistId?: string;
  patients: Pick<Patient, "id" | "name">[];
  professionals: Pick<Professional, "id" | "name">[];
  error?: string;
  closeHref: string;
  /** Na página cheia o título é o h1; no modal, h2 sobre a agenda. */
  Heading?: "h1" | "h2";
}) {
  return (
    <>
      <Heading className="font-display text-xl font-semibold text-pine-950">Novo agendamento</Heading>
      <ErrorBanner code={error} messages={APPOINTMENT_ERRORS} className="mt-3" />
      {waitlistId ? (
        <p className="mt-3 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm font-semibold text-clay-800">
          Encaixando da lista de espera — ao agendar, a pessoa sai da lista automaticamente.
        </p>
      ) : null}
      <form action={createAppointmentAction} className="mt-4 space-y-3">
        <input type="hidden" name="date" value={date} />
        {waitlistId ? <input type="hidden" name="waitlist_id" value={waitlistId} /> : null}
        <div>
          <label className="label" htmlFor="patient_id">
            Paciente
          </label>
          <select className="input" id="patient_id" name="patient_id" required defaultValue={patientId ?? ""}>
            <option value="" disabled>
              Selecione…
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-pine-900/50">
            Paciente novo?{" "}
            <Link
              href="/pacientes/novo"
              className="font-bold text-pine-600 hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center pointer-coarse:px-1"
            >
              Cadastrar
            </Link>
          </p>
        </div>
        <div>
          <label className="label" htmlFor="professional_id">
            Profissional
          </label>
          <select
            className="input"
            id="professional_id"
            name="professional_id"
            required
            defaultValue={professionalId ?? ""}
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
        {/* Um campo por linha no celular; lado a lado do sm em diante. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="start_time">
              Horário
            </label>
            <input
              className="input"
              type="time"
              id="start_time"
              name="start_time"
              required
              defaultValue={time ?? "09:00"}
              step={300}
            />
          </div>
          <div>
            <label className="label" htmlFor="duration">
              Duração
            </label>
            <select className="input" id="duration" name="duration" defaultValue="30">
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hora</option>
              <option value="90">1h30</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="procedure">
            Procedimento
          </label>
          <input
            className="input"
            id="procedure"
            name="procedure"
            placeholder="Consulta"
            defaultValue="Consulta"
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="next"
          />
        </div>
        <div>
          <label className="label" htmlFor="price">
            Valor (R$)
          </label>
          <input
            className="input"
            id="price"
            name="price"
            placeholder="250,00"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
          />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Observações
          </label>
          <textarea className="input" id="notes" name="notes" rows={2} autoCapitalize="sentences" />
        </div>
        {/* No celular: "Agendar" ocupa a linha toda e "Fechar" fica logo abaixo. */}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <button type="submit" className="btn btn-primary flex-1">
            Agendar
          </button>
          <Link href={closeHref} className="btn btn-outline justify-center">
            Fechar
          </Link>
        </div>
      </form>
    </>
  );
}
