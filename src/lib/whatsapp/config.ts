/**
 * Ajustes do atendimento pelo WhatsApp, guardados em `settings`
 * (chave `whatsapp_config`, JSON). As chaves de API NÃO ficam aqui — só nas
 * variáveis de ambiente da Vercel.
 */

export const WA_CONFIG_KEY = "whatsapp_config";

export interface WhatsappConfig {
  /** O robô responde sozinho (triagem). Desligado, as mensagens só chegam à caixa. */
  ativo: boolean;
  /** O admin confirmou que a chave do Gemini é do plano pago (o gratuito usa os dados para treino). */
  geminiPago: boolean;
  precoCentavos: number;
  /** Quem atende as teleconsultas pagas (null = qualquer profissional). */
  profissionalId: number | null;
  /** Dias para pagar a cobrança. */
  vencimentoDias: number;
  boasVindas: string;
  consentimento: string;
  /** O que o médico quer que a triagem pergunte ou evite. */
  instrucoes: string;
  /** Mensagem quando o pagamento entra. */
  pagamentoConfirmado: string;
}

export const DEFAULT_WA_CONFIG: WhatsappConfig = {
  ativo: false,
  geminiPago: false,
  precoCentavos: 0,
  profissionalId: null,
  vencimentoDias: 1,
  boasVindas:
    "Olá! 👋 Você está falando com a {clinica}. Vou fazer algumas perguntas rápidas para preparar a sua teleconsulta — o médico lê tudo antes de falar com você.",
  consentimento:
    "Para continuar, precisamos do seu consentimento: os dados de saúde que você enviar aqui serão usados só para o seu atendimento na {clinica}, guardados com sigilo médico conforme a LGPD, e organizados com apoio de inteligência artificial — sempre revisados pelo médico. Você pode pedir para falar com um atendente a qualquer momento.\n\nVocê concorda?",
  instrucoes: "",
  pagamentoConfirmado:
    "✅ Pagamento confirmado! O médico já recebeu a sua triagem e vai chamar você aqui mesmo, por esta conversa. Fique de olho nas mensagens.",
};

const MAX_LONG = 2000;

function text(v: unknown, fallback: string, max = MAX_LONG): string {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;
}

export function normalizeWaConfig(raw: unknown): WhatsappConfig {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const price = Math.round(Number(src.precoCentavos));
  const days = Math.round(Number(src.vencimentoDias));
  const prof = Number(src.profissionalId);
  return {
    ativo: src.ativo === true,
    geminiPago: src.geminiPago === true,
    precoCentavos: Number.isFinite(price) && price >= 0 && price <= 10_000_00 ? price : 0,
    profissionalId: Number.isInteger(prof) && prof > 0 ? prof : null,
    vencimentoDias: Number.isFinite(days) && days >= 1 && days <= 30 ? days : 1,
    boasVindas: text(src.boasVindas, DEFAULT_WA_CONFIG.boasVindas),
    consentimento: text(src.consentimento, DEFAULT_WA_CONFIG.consentimento),
    instrucoes: typeof src.instrucoes === "string" ? src.instrucoes.trim().slice(0, MAX_LONG) : "",
    pagamentoConfirmado: text(src.pagamentoConfirmado, DEFAULT_WA_CONFIG.pagamentoConfirmado),
  };
}

export function parseWaConfig(json: string | null | undefined): WhatsappConfig {
  try {
    return normalizeWaConfig(JSON.parse(json || "{}"));
  } catch {
    return { ...DEFAULT_WA_CONFIG };
  }
}

/** "{clinica}" vira o nome da clínica. */
export function fillClinic(template: string, clinic: string): string {
  return template.replaceAll("{clinica}", clinic);
}

/** O robô só conversa com o Gemini pago confirmado — dado de saúde não vai para o plano gratuito. */
export function botCanTriage(config: WhatsappConfig, geminiKey: boolean): boolean {
  return config.ativo && config.geminiPago && geminiKey;
}
