import type { Professional } from "../db";

export function memedExternalId(professionalId: number): string {
  return `renova-prof-${professionalId}`;
}

const REQUIRED: { key: keyof Professional; label: string }[] = [
  { key: "cpf", label: "CPF" },
  { key: "board_code", label: "conselho" },
  { key: "board_number", label: "número do conselho" },
  { key: "board_state", label: "UF do conselho" },
  { key: "birth_date", label: "data de nascimento" },
];

/**
 * Dados do prescritor que a Memed usa e que não moram em `professionals`:
 * o e-mail vem da conta de usuário vinculada, e a especialidade é um id da
 * própria Memed (`GET /especialidades`), não o texto livre que guardamos.
 */
export interface PrescriberExtras {
  email?: string | null;
  especialidade?: number | null;
}

/**
 * Campos que a Memed exige e que ainda faltam. Vazio = pronto para prescrever.
 *
 * E-mail e especialidade só entram na conta quando `extras` é passado: são
 * exigências para liberar credenciais de **produção**, e cobrá-los da tela de
 * cadastro do profissional daria um "incompleto" que o admin não consegue
 * resolver ali (ver 2026-08-18-memed-capacidades).
 */
export function missingMemedFields(professional: Professional, extras?: PrescriberExtras): string[] {
  const missing = REQUIRED.filter(({ key }) => {
    const value = professional[key];
    return value === null || value === undefined || String(value).trim() === "";
  }).map(({ label }) => label);

  if (extras) {
    if (!(extras.email ?? "").trim()) missing.push("e-mail");
    if (!extras.especialidade) missing.push("especialidade");
  }
  return missing;
}

const digits = (value: string) => value.replace(/\D/g, "");

/**
 * Todo profissional cadastrado carrega título ("Dra. Marina Costa"), e a Memed
 * registra `nome` como primeiro nome — sem tirar o título, a receita assinada
 * sai no nome de "Dra.". Só o começo do nome é limpo: título no meio ou no fim
 * é parte do nome da pessoa.
 */
const HONORIFICS = new Set([
  "dr", "dr.", "dra", "dra.", "prof", "prof.", "profa", "profa.", "sr", "sr.", "sra", "sra.",
]);

function nameParts(fullName: string): { nome: string; sobrenome: string } {
  const all = fullName.trim().split(/\s+/).filter(Boolean);
  let start = 0;
  while (start < all.length && HONORIFICS.has(all[start].toLowerCase())) start += 1;
  // Nome que é só título não sobra nada: melhor mandar o texto original.
  const parts = start < all.length ? all.slice(start) : all;

  // A Memed exige sobrenome; nome de uma palavra repete o próprio nome.
  return { nome: parts[0], sobrenome: parts.length > 1 ? parts.slice(1).join(" ") : parts[0] };
}

/** ISO (YYYY-MM-DD) → dd/mm/YYYY, o formato que a Memed espera. */
function toBrDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function toMemedPrescriberPayload(professional: Professional, extras: PrescriberExtras = {}) {
  const missing = missingMemedFields(professional);
  if (missing.length > 0) {
    // Falhar aqui, não na Memed: erro deles volta genérico e sem dizer o campo.
    throw new Error(`Profissional sem dados obrigatórios da Memed: ${missing.join(", ")}`);
  }

  const { nome, sobrenome } = nameParts(professional.name);

  const email = (extras.email ?? "").trim();

  return {
    data: {
      type: "usuarios",
      attributes: {
        external_id: memedExternalId(professional.id),
        ...(email ? { email } : {}),
        ...(extras.especialidade ? { especialidade: extras.especialidade } : {}),
        nome,
        sobrenome,
        cpf: digits(professional.cpf as string),
        board_code: (professional.board_code as string).toUpperCase(),
        board_number: digits(professional.board_number as string),
        board_state: (professional.board_state as string).toUpperCase(),
        data_nascimento: toBrDate(professional.birth_date as string),
      },
    },
  };
}
