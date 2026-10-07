import Link from "next/link";
import { BOOKING_WINDOW_DAYS } from "@/lib/booking-slots";
import { telHref } from "@/lib/clinic-public";
import { waLink } from "@/lib/format";

/**
 * Quando a agenda online não tem vaga (de um profissional, ou de ninguém):
 * diz o que houve, sem culpar o paciente, e oferece o próximo passo — outro
 * profissional, ou falar com a clínica pelos contatos cadastrados.
 */
export function NoAvailability({
  who,
  clinicName,
  clinicPhone,
  otherProfessionalsHref,
}: {
  /** Nome do profissional; null = ninguém tem horário livre. */
  who: string | null;
  clinicName: string;
  clinicPhone: string | null;
  otherProfessionalsHref?: string;
}) {
  const wa = waLink(clinicPhone, "Olá! Quero marcar uma consulta.");
  const tel = telHref(clinicPhone);

  return (
    <div className="rounded-3xl border border-dashed border-pine-900/20 bg-peach-50 p-6 text-center sm:p-8">
      <p className="font-display text-xl font-semibold tracking-tight text-pine-950">
        {who ? `${who} não tem horário livre na agenda online agora.` : "A agenda online está sem horários livres agora."}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-pine-900/65">
        A agenda online mostra os próximos {BOOKING_WINDOW_DAYS} dias.{" "}
        {wa || tel
          ? `Para marcar em outra data, fale com a ${clinicName}.`
          : "Novos horários são abertos pela clínica; tente de novo em alguns dias."}
      </p>
      {otherProfessionalsHref || wa || tel ? (
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          {otherProfessionalsHref ? (
            <Link href={otherProfessionalsHref} className="btn btn-primary min-h-11">
              Ver outros profissionais
            </Link>
          ) : null}
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-11">
              Falar no WhatsApp
            </a>
          ) : null}
          {tel ? (
            <a href={tel} className="btn btn-outline min-h-11">
              Ligar para a clínica
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
