import Anthropic from "@anthropic-ai/sdk";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface PatientHistoryInput {
  patient: Record<string, unknown>;
  encounters: Record<string, unknown>[];
  appointments: Record<string, unknown>[];
}

const SYSTEM_PROMPT = `Você é um assistente clínico que prepara resumos de prontuário para o profissional de saúde revisar ANTES de uma consulta.

Regras:
- Responda em português do Brasil, em tópicos curtos e objetivos.
- Estruture em seções (use títulos simples em uma linha): Perfil do paciente; Condições e diagnósticos; Medicações receitadas; Evolução dos atendimentos; Pontos de atenção.
- Baseie-se EXCLUSIVAMENTE nos dados fornecidos. Nunca invente diagnósticos, medicações, datas ou valores. Se uma informação não constar, não a mencione.
- Datas no formato dd/mm/aaaa. Seja conciso: o resumo inteiro deve caber em uma leitura de ~1 minuto.
- Não inclua recomendações de conduta próprias — apenas organize o que está registrado.`;

export async function summarizePatientHistory(input: PatientHistoryInput): Promise<string> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Dados do prontuário em JSON:\n${JSON.stringify(input)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("A IA não pôde gerar o resumo para este conteúdo.");
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("A IA retornou uma resposta vazia.");
  return text;
}
