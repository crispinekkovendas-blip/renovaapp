import Link from "next/link";
import type { Patient, Professional, WaitlistEntry } from "@/lib/db";
import { addToWaitlistAction, setWaitlistStatusAction } from "@/lib/actions-agenda";
import { fmtDate } from "@/lib/format";
import { IconClock, IconPlus } from "@/components/icons";

// Botões miúdos da lista de espera: no toque, pílulas de 44px.
const WAITLIST_BTN =
  "inline-flex w-full cursor-pointer items-center justify-center rounded-md px-2 py-1 text-[11px] font-bold transition-colors pointer-coarse:min-h-11 pointer-coarse:rounded-full pointer-coarse:text-xs";

/** "Agendar" a partir da espera: a nova consulta já nasce com paciente e profissional. */
function scheduleHref(entry: WaitlistEntry, date: string): string {
  const query = new URLSearchParams({
    date,
    waitlist: String(entry.id),
    ...(entry.patient_id ? { patient: String(entry.patient_id) } : {}),
    ...(entry.professional_id ? { prof: String(entry.professional_id) } : {}),
  });
  return `/agenda/novo?${query.toString()}`;
}

/** Formulário de um clique que muda o status da entrada (agendado/removido). */
function StatusForm({
  entryId,
  status,
  backUrl,
  title,
  className,
  children,
}: {
  entryId: number;
  status: Exclude<WaitlistEntry["status"], "aguardando">;
  backUrl: string;
  title?: string;
  className: string;
  children: string;
}) {
  return (
    <form action={setWaitlistStatusAction} className="flex">
      <input type="hidden" name="id" value={entryId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="back" value={backUrl} />
      <button type="submit" title={title} className={`${WAITLIST_BTN} ${className}`}>
        {children}
      </button>
    </form>
  );
}

/** Lista de espera da agenda: quem aguarda um horário vagar, e o formulário para incluir. */
export function WaitlistSection({
  date,
  backUrl,
  waitlist,
  patients,
  professionals,
}: {
  date: string;
  backUrl: string;
  waitlist: WaitlistEntry[];
  patients: Pick<Patient, "id" | "name">[];
  professionals: Pick<Professional, "id" | "name">[];
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-pine-950">
          <IconClock className="h-5 w-5 text-pine-600" />
          Lista de espera
        </h2>
        <span className="chip bg-clay-100 text-clay-800">{waitlist.length}</span>
      </div>

      <div className="card">
        {waitlist.length === 0 ? (
          <p className="px-4 py-6 text-sm text-pine-900/55 sm:px-5">
            Ninguém na lista de espera. Quando um horário vagar, use esta lista para encaixar pacientes.
          </p>
        ) : (
          <div className="divide-y divide-pine-900/5">
            {waitlist.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold break-words text-pine-950">
                    {entry.patient_id ? (
                      <Link href={`/pacientes/${entry.patient_id}`} className="hover:text-pine-600">
                        {entry.patient_name}
                      </Link>
                    ) : (
                      entry.name
                    )}
                  </p>
                  <p className="text-xs break-words text-pine-900/55">
                    {[
                      entry.phone ?? undefined,
                      entry.professional_name ? `Prefere ${entry.professional_name}` : "Qualquer profissional",
                      `desde ${fmtDate(entry.created_at.slice(0, 10))}`,
                      entry.notes ?? undefined,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {/* No celular os três botões dividem a linha, com altura de dedo. */}
                <div className="flex shrink-0 items-center gap-1.5 *:flex-1 sm:*:flex-none">
                  <Link
                    href={scheduleHref(entry, date)}
                    className={`${WAITLIST_BTN} bg-pine-700 text-white hover:bg-pine-800`}
                  >
                    Agendar
                  </Link>
                  <StatusForm
                    entryId={entry.id}
                    status="agendado"
                    backUrl={backUrl}
                    title="Marcar como já agendado sem criar o agendamento aqui (ex.: combinado por telefone)"
                    className="bg-pine-100 text-pine-800 hover:bg-pine-200"
                  >
                    Já agendado
                  </StatusForm>
                  <StatusForm
                    entryId={entry.id}
                    status="removido"
                    backUrl={backUrl}
                    className="bg-stone-100 text-stone-500 hover:bg-rose-100 hover:text-rose-700"
                  >
                    Remover
                  </StatusForm>
                </div>
              </div>
            ))}
          </div>
        )}

        <details className="border-t border-pine-900/10">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-3.5 text-sm font-bold text-pine-700 transition-colors hover:bg-pine-50 sm:px-5">
            <IconPlus className="h-4 w-4" />
            Adicionar à lista de espera
          </summary>
          <form
            action={addToWaitlistAction}
            className="grid gap-3 border-t border-pine-900/10 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3"
          >
            <input type="hidden" name="back" value={backUrl} />
            <div>
              <label className="label" htmlFor="wl-patient">
                Paciente cadastrado
              </label>
              <select className="input" id="wl-patient" name="patient_id" defaultValue="">
                <option value="">—</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wl-name">
                Ou nome (não cadastrado)
              </label>
              <input
                className="input"
                id="wl-name"
                name="name"
                placeholder="Nome de quem aguarda"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
              />
            </div>
            <div>
              <label className="label" htmlFor="wl-phone">
                Telefone
              </label>
              <input
                className="input"
                id="wl-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                enterKeyHint="next"
                placeholder="(11) 90000-0000"
              />
            </div>
            <div>
              <label className="label" htmlFor="wl-prof">
                Profissional preferido
              </label>
              <select className="input" id="wl-prof" name="professional_id" defaultValue="">
                <option value="">Qualquer</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wl-notes">
                Observações
              </label>
              <input
                className="input"
                id="wl-notes"
                name="notes"
                placeholder="Período preferido, urgência…"
                enterKeyHint="done"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn btn-primary w-full">
                Adicionar
              </button>
            </div>
          </form>
        </details>
      </div>
    </section>
  );
}
