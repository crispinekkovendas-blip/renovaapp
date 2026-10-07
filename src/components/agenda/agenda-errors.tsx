import { Feedback } from "@/components/feedback";

/** Erros que voltam do `createAppointmentAction` pela URL (`?erro=`). */
export const APPOINTMENT_ERRORS: Readonly<Record<string, string>> = {
  conflito: "Conflito de horário: o profissional já tem um agendamento nesse intervalo.",
  campos: "Preencha paciente, profissional e horário para agendar.",
};

/** Os da agenda do dia: os de agendar mais o da lista de espera. */
export const AGENDA_ERRORS: Readonly<Record<string, string>> = {
  ...APPOINTMENT_ERRORS,
  espera: "Para entrar na lista de espera, selecione um paciente ou informe um nome.",
};

/** Faixa vermelha do erro, com "×"; some quando o código não é conhecido. */
export function ErrorBanner({
  code,
  messages,
  className,
}: {
  code: string | undefined;
  messages: Readonly<Record<string, string>>;
  className: string;
}) {
  const message = code && Object.hasOwn(messages, code) ? messages[code] : null;
  if (!message) return null;
  return (
    <Feedback key={code} tone="erro" className={className}>
      {message}
    </Feedback>
  );
}
