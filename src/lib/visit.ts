/**
 * O atendimento guiado: da agenda à conclusão num caminho só.
 *
 *   Atender (Início/agenda)  →  consulta "em atendimento", ficha aberta
 *   1. Registrar             →  o atendimento (queixa, exame, conduta…)
 *   2. Receita e documentos  →  opcional
 *   3. Concluir              →  consulta concluída, cobrança lançada, de volta ao Início
 *
 * Não há estado guardado: o passo sai do que já existe no banco — a consulta
 * de hoje "em atendimento", o atendimento registrado hoje, os documentos
 * emitidos hoje. Por isso funciona igual se a pessoa sair e voltar.
 *
 * Puro, sem banco nem React: o teste em Node lê daqui.
 */

export type VisitStepId = "registrar" | "documentos" | "concluir";
/** feito · agora (o que fazer neste momento) · opcional (dá para pular) · depois */
export type VisitStepState = "feito" | "agora" | "opcional" | "depois";

export interface VisitStep {
  id: VisitStepId;
  label: string;
  state: VisitStepState;
}

/** De onde "Atender" começa (ou continua) um atendimento. Concluída, falta e cancelada: só a ficha. */
export function canStartVisit(status: string): boolean {
  return status === "agendado" || status === "confirmado" || status === "em_atendimento";
}

/** Os três passos, com o estado de cada um. */
export function visitSteps({ recorded, documents }: { recorded: boolean; documents: number }): VisitStep[] {
  return [
    { id: "registrar", label: "Registrar", state: recorded ? "feito" : "agora" },
    {
      id: "documentos",
      label: "Receita e documentos",
      state: !recorded ? "depois" : documents > 0 ? "feito" : "opcional",
    },
    { id: "concluir", label: "Concluir", state: recorded ? "agora" : "depois" },
  ];
}

/** A ficha na aba do atendimento: com o formulário aberto, ou no painel do atendimento. */
export function visitHref(patientId: number, options: { form?: boolean } = {}): string {
  const base = `/pacientes/${patientId}?aba=atendimentos`;
  return options.form ? `${base}&atender=1#novo-atendimento` : `${base}#atendimento`;
}

/** O compositor de documentos amarrado ao atendimento de hoje, voltando para o painel. */
export function emitVisitHref(patientId: number, encounterId: number): string {
  return `/pacientes/${patientId}/emitir?encounter=${encounterId}&volta=${encodeURIComponent(visitHref(patientId))}`;
}

/**
 * "Agendar retorno": o novo agendamento já com o paciente, quem atende e — se
 * o atendimento pediu retorno — a data prevista (a que já passou não serve).
 * Com `volta`, a data vira um campo do formulário e, ao agendar, volta-se à ficha.
 */
export function returnHref({
  patientId,
  professionalId,
  returnDue,
  today,
}: {
  patientId: number;
  professionalId: number | null;
  returnDue: string | null | undefined;
  today: string;
}): string {
  const query = new URLSearchParams({ patient: String(patientId) });
  if (professionalId) query.set("prof", String(professionalId));
  if (returnDue && /^\d{4}-\d{2}-\d{2}$/.test(returnDue) && returnDue >= today) query.set("date", returnDue);
  // Depois de agendar, volta para o painel do atendimento (falta concluir).
  query.set("volta", visitHref(patientId));
  return `/agenda/novo?${query.toString()}`;
}
