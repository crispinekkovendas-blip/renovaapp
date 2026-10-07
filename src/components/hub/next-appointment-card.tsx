import Link from "next/link";
import type { NextAppointment } from "@/lib/hub";
import { cancelByTokenAction, confirmByTokenAction } from "@/lib/actions-confirm";
import { fmtDateLong } from "@/lib/format";
import { IconCalendar } from "@/components/icons";
import { PreConsultForm } from "./pre-consult-form";
import { RescheduleRequest } from "./reschedule-form";

/**
 * O cartão principal do portal: a próxima consulta (data, hora, com quem,
 * onde) e tudo o que dá para fazer com ela — confirmar, avisar que não vai,
 * entrar na teleconsulta, pré-consulta, pedir remarcação. Sem consulta
 * marcada, vira o convite para agendar.
 */
export function NextAppointmentCard({
  next,
  token,
  confirmToken,
  clinic,
  clinicWa,
  canSubmit,
  pendingReschedule,
  preConsultSent,
  openForms,
}: {
  next: NextAppointment | null;
  /** Token do portal (para os formulários e o .ics). */
  token: string;
  /** Token de confirmação da próxima consulta, assinado pela página. */
  confirmToken: string | null;
  clinic: { name: string; address: string | null };
  clinicWa: string | null;
  /** A tabela de envios do portal existe (migração aplicada). */
  canSubmit: boolean;
  pendingReschedule: { message: string | null } | null;
  preConsultSent: boolean;
  /** Reabre os formulários depois de um envio vazio. */
  openForms: boolean;
}) {
  const portalPath = `/p/${token}`;
  const telemedUrl = next?.telemed_room ? `https://meet.jit.si/${next.telemed_room}` : null;

  return (
    <section aria-labelledby="proxima-consulta" className="card overflow-hidden">
      <div className="p-5 sm:p-6">
        <h2 id="proxima-consulta" className="label">
          Próxima consulta
        </h2>
        {next ? (
          <>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold leading-tight tracking-tight text-pine-950">
                  {fmtDateLong(next.date)}
                </p>
                <p className="mt-1.5 break-words text-sm font-bold text-pine-950">{next.professional_name}</p>
                <p className="text-sm text-pine-900/60">
                  {[next.professional_specialty, next.procedure].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="shrink-0 font-display text-3xl font-semibold leading-none tracking-tight text-pine-950">
                {next.start_time}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {next.status === "confirmado" ? (
                <>
                  <span className="chip bg-sky-100 text-sky-800">Confirmada</span>
                  <span className="text-sm font-semibold text-sky-800">Presença confirmada ✓</span>
                </>
              ) : (
                <span className="chip bg-pine-100 text-pine-800">Aguardando confirmação</span>
              )}
              {telemedUrl ? <span className="chip bg-peach-100 text-pine-900">Teleconsulta</span> : null}
            </div>

            <a
              href={`${portalPath}/consulta.ics`}
              download="consulta.ics"
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pine-700 underline decoration-pine-700/30 underline-offset-4 hover:decoration-pine-700 sm:mt-4 sm:min-h-0"
            >
              <IconCalendar className="h-4 w-4" />
              Adicionar à minha agenda
            </a>

            {telemedUrl ? (
              <p className="mt-4 rounded-xl bg-pine-50 px-4 py-3 text-sm text-pine-900/70">
                <span className="font-bold text-pine-950">Consulta por vídeo</span>
                <br />
                No horário marcado, é só entrar pelo botão abaixo. Abre no navegador, sem instalar nada.
              </p>
            ) : clinic.address ? (
              <p className="mt-4 break-words rounded-xl bg-pine-50 px-4 py-3 text-sm text-pine-900/70">
                <span className="font-bold text-pine-950">{clinic.name}</span>
                <br />
                {clinic.address}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-2 font-display text-xl font-semibold tracking-tight text-pine-950">
              Nenhuma consulta marcada.
            </p>
            <p className="mt-1 text-sm text-pine-900/60">
              Quando quiser, escolha o melhor horário — leva menos de um minuto.
            </p>
          </>
        )}
      </div>

      <div className="grid gap-3 border-t border-pine-900/10 bg-pine-50/60 p-4 sm:p-5">
        {next && confirmToken ? (
          <>
            {telemedUrl ? (
              <div>
                <a href={telemedUrl} target="_blank" rel="noopener noreferrer" className="btn-hero w-full">
                  Entrar na teleconsulta
                  <span className="chev" aria-hidden="true" />
                </a>
                <p className="mt-1.5 text-center text-xs text-pine-900/50">abre no navegador, sem instalar nada</p>
              </div>
            ) : null}
            {next.status === "agendado" ? (
              <form action={confirmByTokenAction}>
                <input type="hidden" name="token" value={confirmToken} />
                <input type="hidden" name="redirect_to" value={portalPath} />
                <button type="submit" className="btn-hero w-full">
                  Confirmar presença
                  <span className="chev" aria-hidden="true" />
                </button>
              </form>
            ) : null}
            <form action={cancelByTokenAction}>
              <input type="hidden" name="token" value={confirmToken} />
              <input type="hidden" name="redirect_to" value={portalPath} />
              <button type="submit" className="btn-hero-secondary w-full">
                Não poderei ir
              </button>
            </form>

            {canSubmit ? (
              <>
                <PreConsultForm token={token} appointmentId={next.id} sent={preConsultSent} open={openForms} />
                <RescheduleRequest
                  token={token}
                  appointmentId={next.id}
                  pending={pendingReschedule}
                  open={openForms}
                />
              </>
            ) : null}
          </>
        ) : (
          <Link href="/agendar" className="btn-hero w-full">
            Agendar consulta
            <span className="chev" aria-hidden="true" />
          </Link>
        )}
        {clinicWa ? (
          <a href={clinicWa} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full">
            Falar com a clínica no WhatsApp
          </a>
        ) : null}
      </div>
    </section>
  );
}
