/**
 * Estado do portal do paciente em funções puras: os avisos que respondem a
 * `?ok=` / `?erro=` depois de uma ação, e o que já foi enviado sobre a
 * próxima consulta, a última realizada e cada receita. Roda em `node --test`
 * (ver hub-feedback.test.mjs).
 */
import { parseRenewalAnswers } from "./hub-forms.ts";
import type { HubKind } from "./hub-forms.ts";

export type FeedbackTone = "success" | "neutral" | "warning";

export interface PortalFeedback {
  tone: FeedbackTone;
  title: string;
  body?: string;
}

export interface PortalQuery {
  ok?: string;
  erro?: string;
  de?: string;
}

/**
 * Os avisos do topo do portal: no máximo um de sucesso (`ok`) e um de erro
 * (`erro`), nessa ordem. Código desconhecido não mostra nada.
 */
export function portalFeedback(
  query: PortalQuery,
  { firstName, clinic }: { firstName: string; clinic: string }
): PortalFeedback[] {
  const out: PortalFeedback[] = [];

  switch (query.ok) {
    case "confirmado":
      out.push({
        tone: "success",
        title: "Presença confirmada — até lá!",
        body: `Obrigado, ${firstName}. Qualquer imprevisto, é só voltar a esta página ou falar com a ${clinic}.`,
      });
      break;
    case "cancelado":
      out.push({
        tone: "neutral",
        title: "Consulta cancelada.",
        body: `A ${clinic} foi avisada. Quando quiser remarcar, é só entrar em contato.`,
      });
      break;
    case "remarcacao":
      out.push({
        tone: "success",
        title: "Pedido enviado — a clínica te chama no WhatsApp.",
        body: "Vocês combinam o novo horário por lá. Até lá, sua consulta continua marcada.",
      });
      break;
    case "avaliacao":
      out.push({
        tone: "success",
        title: `Obrigado pela avaliação, ${firstName}!`,
        body: `Sua opinião chega direto para a equipe da ${clinic}.`,
      });
      break;
    case "pre_consulta":
      out.push({
        tone: "success",
        title: "Pré-consulta enviada.",
        body: "Quem vai te atender já vê suas respostas. Você ganha tempo na consulta.",
      });
      break;
    case "renovacao":
      out.push({
        tone: "success",
        title: "Pedido enviado — o consultório vai avaliar.",
        body: "Se a renovação for aprovada, a nova receita aparece aqui no portal. Se precisarem de uma consulta, a clínica te avisa.",
      });
      break;
  }

  switch (query.erro) {
    case "estado":
      out.push({ tone: "warning", title: "Esta consulta já não pode ser alterada por aqui — fale com a clínica." });
      break;
    case "receita":
      out.push({
        tone: "warning",
        title: "Esta receita não está mais disponível para renovação.",
        body: "Se precisar, fale com a clínica no WhatsApp.",
      });
      break;
    case "ja_pedido":
      out.push(
        query.de === "renovacao"
          ? {
              tone: "neutral",
              title: "Você já pediu a renovação desta receita.",
              body: "O consultório vai avaliar e te avisa. Não precisa pedir de novo.",
            }
          : {
              tone: "neutral",
              title: "Você já pediu remarcação desta consulta.",
              body: "A clínica vai te chamar no WhatsApp para combinar o horário.",
            }
      );
      break;
    case "ja_avaliado":
      out.push({ tone: "neutral", title: "Esta consulta já foi avaliada. Obrigado!" });
      break;
    case "ja_enviado":
      out.push({ tone: "neutral", title: "A pré-consulta desta consulta já foi enviada." });
      break;
    case "vazio":
      out.push({ tone: "warning", title: "Faltou escrever alguma coisa — tente de novo." });
      break;
    case "nota":
      out.push({ tone: "warning", title: "Escolha uma nota de 1 a 5 para enviar a avaliação." });
      break;
    case "indisponivel":
      out.push({
        tone: "warning",
        title: "Não deu para enviar agora.",
        body: "Tente de novo daqui a pouco ou fale com a clínica no WhatsApp.",
      });
      break;
  }

  return out;
}

/** O mínimo de `HubSubmission` que as regras abaixo leem. */
export interface SubmissionLike {
  kind: HubKind;
  appointment_id: number | null;
  handled_at: string | null;
  answers: string | null;
  message: string | null;
}

/**
 * O que o paciente já mandou, visto do portal: pedido de remarcação ainda
 * aberto da próxima consulta, pré-consulta já enviada, avaliação já feita
 * da última consulta realizada (sem consulta a avaliar, conta como feita).
 */
export function submissionState<S extends SubmissionLike>(
  submissions: S[],
  { nextId, lastConcludedId }: { nextId: number | null; lastConcludedId: number | null }
): { pendingReschedule: S | null; preConsultSent: boolean; alreadyRated: boolean } {
  return {
    pendingReschedule:
      nextId === null
        ? null
        : (submissions.find((s) => s.kind === "remarcacao" && s.appointment_id === nextId && !s.handled_at) ?? null),
    preConsultSent:
      nextId !== null && submissions.some((s) => s.kind === "pre_consulta" && s.appointment_id === nextId),
    alreadyRated:
      lastConcludedId === null ||
      submissions.some((s) => s.kind === "avaliacao" && s.appointment_id === lastConcludedId),
  };
}

/** Pedido de renovação ainda aberto para uma receita da Memed (o id fica no JSON `answers`). */
export function pendingRenewalFor<S extends SubmissionLike>(submissions: S[], prescriptionId: string | null): S | null {
  if (!prescriptionId) return null;
  return (
    submissions.find(
      (s) =>
        s.kind === "renovacao" &&
        !s.handled_at &&
        parseRenewalAnswers(s.answers)?.memed_prescription_id === prescriptionId
    ) ?? null
  );
}
