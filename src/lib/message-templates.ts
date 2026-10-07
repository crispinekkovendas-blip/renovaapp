/**
 * Mensagens prontas para o WhatsApp da recepção.
 *
 * O app já monta links `wa.me` em vários lugares; o que faltava era o texto.
 * Cada mensagem é curta, diz quem está falando e o que a pessoa deve fazer —
 * mensagem de clínica que o paciente não entende vira ligação para a recepção.
 *
 * Os `{{placeholders}}` são os mesmos dos documentos, para o médico e a
 * recepção não terem de aprender dois vocabulários.
 */

export interface MessageTemplate {
  name: string;
  hint: string;
  body: string;
}

export const MESSAGE_GROUPS: readonly { label: string; messages: readonly MessageTemplate[] }[] = [
  {
    label: "Agenda",
    messages: [
      {
        name: "Confirmar consulta",
        hint: "Véspera da consulta",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. Sua consulta está marcada para {{data}}, às {{entrada}}, " +
          "com {{profissional}}.\n\nPode confirmar se vem? É só responder esta mensagem.",
      },
      {
        name: "Lembrete de véspera",
        hint: "Reduz falta sem pedir resposta",
        body:
          "Olá, {{paciente}}! Lembrando da sua consulta amanhã, {{data}}, às {{entrada}}, na {{clinica}}.\n\n" +
          "Se precisar remarcar, avise por aqui.",
      },
      {
        name: "Remarcação a pedido da clínica",
        hint: "Quando a clínica precisa mudar",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. Precisamos remarcar sua consulta de {{data}}. " +
          "Desculpe o transtorno.\n\nTem preferência de dia e horário? Vejo a primeira vaga disponível.",
      },
      {
        name: "Faltou à consulta",
        hint: "Sem cobrança, com porta aberta",
        body:
          "Olá, {{paciente}}! Sentimos sua falta na consulta de {{data}}, na {{clinica}}.\n\n" +
          "Quer que eu veja um novo horário para você?",
      },
      {
        name: "Chegou mais cedo / atraso da clínica",
        hint: "Avisar antes de a pessoa sair de casa",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. Estamos com um atraso de aproximadamente ___ minutos " +
          "hoje.\n\nSe preferir, posso reagendar para outro horário.",
      },
    ],
  },
  {
    label: "Depois da consulta",
    messages: [
      {
        name: "Documentos no portal",
        hint: "Envio de atestado, receita ou orientações",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. Seus documentos da consulta de hoje já estão no seu " +
          "portal.\n\nÉ só abrir este link: ___",
      },
      {
        name: "Resultado de exame disponível",
        hint: "Sem informar o resultado por mensagem",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. O resultado do seu exame chegou.\n\n" +
          "Para que {{profissional}} possa explicar com calma, vamos ver na consulta de retorno. " +
          "Quer que eu agende?",
      },
      {
        name: "Retorno recomendado",
        hint: "Recall de acompanhamento",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. {{profissional}} recomendou um retorno para " +
          "acompanhar seu tratamento.\n\nQuer que eu veja um horário?",
      },
      {
        name: "Renovação de receita",
        hint: "Uso contínuo prestes a acabar",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. Vi que sua receita de uso contínuo está perto de " +
          "acabar.\n\nQuer que eu peça a renovação para {{profissional}}?",
      },
    ],
  },
  {
    label: "Administrativo",
    messages: [
      {
        name: "Preparo para exame",
        hint: "Jejum e documentos",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. Sobre o exame de {{data}}:\n\n" +
          "- Jejum de ___ horas (água pode)\n" +
          "- Leve o pedido, documento com foto e carteirinha\n\n" +
          "Qualquer dúvida, é só chamar.",
      },
      {
        name: "Cobrança em aberto",
        hint: "Cordial, sem constranger",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. Consta um valor em aberto referente ao atendimento " +
          "de {{data}}.\n\nSe já tiver pago, me avise para eu corrigir aqui. Posso enviar o Pix?",
      },
      {
        name: "Recibo enviado",
        hint: "Depois do pagamento",
        body: "Olá, {{paciente}}! Aqui é da {{clinica}}. Seu recibo está no portal: ___\n\nObrigado!",
      },
      {
        name: "Pedir avaliação",
        hint: "Depois de uma consulta concluída",
        body:
          "Olá, {{paciente}}! Aqui é da {{clinica}}. Como foi seu atendimento com {{profissional}}?\n\n" +
          "Sua opinião ajuda a melhorar — leva menos de um minuto: ___",
      },
    ],
  },
];

export function allMessages(): MessageTemplate[] {
  return MESSAGE_GROUPS.flatMap((group) => [...group.messages]);
}
