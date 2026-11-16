import { moneyBR } from "./format.ts";

/**
 * O aviso do app depois de uma ação ("Atendimento salvo.", "Pagamento recebido."):
 * um lugar só na tela, um jeito só, em todas as seções. As ações redirecionam
 * com `?ok=<código>` ou `?erro=<código>` e o `FlashHost` do layout mostra.
 *
 * Aqui ficam os códigos que valem em qualquer tela. As telas que já tinham a
 * sua própria lista (ficha, configurações, modelos, WhatsApp…) continuam com
 * ela — só passaram a mostrar pelo mesmo aviso flutuante — e por isso um
 * código nunca pode estar nos dois lugares (apareceria duas vezes).
 *
 * Puro, sem React: o teste em Node lê daqui.
 */

export type FlashTone = "ok" | "erro" | "aviso";

/** O que dá para desfazer com um clique, sem perder nada. */
export const UNDO_KINDS = ["consulta", "pagamento", "espera", "retorno"] as const;
export type UndoKind = (typeof UNDO_KINDS)[number];

export interface FlashUndo {
  kind: UndoKind;
  id: number;
}

export interface FlashMessage {
  tone: FlashTone;
  text: string;
  undo: FlashUndo | null;
}

/** Parâmetros que as ações põem na URL e que o aviso limpa ao fechar. */
export const FLASH_PARAMS = ["ok", "erro", "n", "desfazer", "valor"] as const;

/** O elemento do layout onde os avisos flutuam (os das telas entram por portal). */
export const FLASH_HOST_ID = "avisos";

/** Quanto o aviso de sucesso fica na tela; com "Desfazer", um pouco mais. */
export const FLASH_HIDE_MS = 6000;
export const FLASH_UNDO_MS = 9000;

interface Extras {
  /** Valor em centavos que a ação quis mostrar (a cobrança lançada ao concluir). */
  valor: number | null;
}

type Text = string | ((extras: Extras) => string);

const OK: Readonly<Record<string, Text>> = {
  paciente_novo: "Paciente cadastrado.",
  paciente_salvo: "Dados do paciente salvos.",
  agendado: "Agendamento criado.",
  atendimento: "Atendimento salvo.",
  concluido: ({ valor }) =>
    valor ? `Atendimento concluído. Cobrança de ${moneyBR(valor)} lançada no Financeiro.` : "Atendimento concluído.",
  lancamento: "Lançamento criado.",
  pago: "Pagamento recebido.",
  espera: "Paciente na lista de espera.",
  espera_removido: "Removido da lista de espera.",
  tratado: "Retorno marcado como tratado.",
  horario: "Horário adicionado.",
  horario_removido: "Horário removido.",
};

// Nomes compridos de propósito: "permissao" e "consulta" já são códigos de outras telas.
const ERRO: Readonly<Record<string, Text>> = {
  consulta_fechada: "Essa consulta não existe mais ou já foi encerrada.",
  sem_permissao: "Seu perfil não pode iniciar nem concluir atendimentos.",
};

export function isUndoKind(value: string): value is UndoKind {
  return (UNDO_KINDS as readonly string[]).includes(value);
}

/** "consulta.12" → o que desfazer; qualquer outra coisa → nada. */
export function parseUndo(value: string | null | undefined): FlashUndo | null {
  const match = /^([a-z]+)\.(\d{1,12})$/.exec(value ?? "");
  if (!match || !isUndoKind(match[1])) return null;
  const id = Number(match[2]);
  return id > 0 ? { kind: match[1], id } : null;
}

/** O valor de `desfazer=` que a ação põe na URL. */
export function undoParam(kind: UndoKind, id: number): string {
  return `${kind}.${id}`;
}

/** Acrescenta `?ok=código` (e o desfazer, e o valor) a um caminho que pode já ter query. */
export function withFlash(
  url: string,
  code: string,
  extras: { undo?: FlashUndo | null; valor?: number | null } = {},
): string {
  const [path, hash = ""] = url.split("#");
  const params = [`ok=${code}`];
  if (extras.undo) params.push(`desfazer=${undoParam(extras.undo.kind, extras.undo.id)}`);
  if (extras.valor) params.push(`valor=${extras.valor}`);
  return `${path}${path.includes("?") ? "&" : "?"}${params.join("&")}${hash ? `#${hash}` : ""}`;
}

function resolve(text: Text, extras: Extras): string {
  return typeof text === "function" ? text(extras) : text;
}

/**
 * Os avisos que a URL pede, sucesso primeiro. Código que não é daqui → nada
 * (ou é de uma tela, que mostra o seu, ou é lixo na URL). O "Desfazer" só
 * acompanha um sucesso.
 */
export function flashFromParams(params: {
  ok?: string | null;
  erro?: string | null;
  desfazer?: string | null;
  valor?: string | null;
}): FlashMessage[] {
  const cents = Number(params.valor);
  const extras: Extras = { valor: Number.isInteger(cents) && cents > 0 ? cents : null };
  const out: FlashMessage[] = [];
  if (params.ok && Object.hasOwn(OK, params.ok)) {
    out.push({ tone: "ok", text: resolve(OK[params.ok], extras), undo: parseUndo(params.desfazer) });
  }
  if (params.erro && Object.hasOwn(ERRO, params.erro)) {
    out.push({ tone: "erro", text: resolve(ERRO[params.erro], extras), undo: null });
  }
  return out;
}

/** A URL sem os parâmetros do aviso — para fechar sem que ele volte ao recarregar. */
export function withoutFlash(pathname: string, search: string, hash = ""): string | null {
  const params = new URLSearchParams(search);
  if (!FLASH_PARAMS.some((key) => params.has(key))) return null;
  for (const key of FLASH_PARAMS) params.delete(key);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

/** Os códigos gerais, para o teste conferir que nenhuma tela repete um deles. */
export const GLOBAL_OK_CODES: readonly string[] = Object.keys(OK);
export const GLOBAL_ERRO_CODES: readonly string[] = Object.keys(ERRO);
