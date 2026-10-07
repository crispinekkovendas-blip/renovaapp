/**
 * Mensagens de `?ok=` e `?erro=` da página de configurações — as ações
 * redirecionam com esses códigos. Código desconhecido cai na mensagem genérica.
 */

export const SETTINGS_OK: Readonly<Record<string, string>> = {
  senha: "Senha redefinida. Avise a pessoa — ela entra com a nova senha no próximo login.",
  prescritor: "Dados de prescrição salvos.",
  portal: "Configuração do portal salva.",
  assinatura: "Assinatura e RQE salvos. Já saem na folha dos próximos documentos.",
  limpeza: "Dados clínicos apagados. Pacientes, agendamentos, prontuários, cobranças e lista de espera foram removidos.",
};

export const SETTINGS_ERRO: Readonly<Record<string, string>> = {
  email: "Já existe um usuário com esse e-mail.",
  usuario: "Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.",
  senha_curta: "A nova senha precisa ter pelo menos 6 caracteres.",
  cpf_prof: "CPF do profissional deve ter 11 dígitos.",
  confirmacao_limpeza: "Digite APAGAR exatamente para confirmar a limpeza.",
  assinatura_tipo: "A assinatura precisa ser uma imagem PNG ou JPG.",
  assinatura_tamanho: "A imagem da assinatura passou de 300 KB. Reduza o tamanho e tente de novo.",
  migracao: "RQE e assinatura dependem da migração 2026-09-16. Rode a migração no Supabase e tente de novo.",
};

const OK_FALLBACK = "Feito.";
const ERRO_FALLBACK = "Verifique os campos e tente novamente.";

/** Texto para `?ok=`; nada quando o parâmetro não veio. */
export function okMessage(code: string | undefined): string | null {
  if (!code) return null;
  return Object.hasOwn(SETTINGS_OK, code) ? SETTINGS_OK[code] : OK_FALLBACK;
}

/** Texto para `?erro=`; nada quando o parâmetro não veio. */
export function erroMessage(code: string | undefined): string | null {
  if (!code) return null;
  return Object.hasOwn(SETTINGS_ERRO, code) ? SETTINGS_ERRO[code] : ERRO_FALLBACK;
}
