import type { Professional } from "../db";
import { memedExternalId, toMemedPrescriberPayload, type PrescriberExtras } from "./prescriber.ts";
import {
  parseLinkResponse,
  alreadyRegisteredExternalId,
  parsePrescriptionList,
  type RemotePrescription,
} from "./prescription.ts";

export interface MemedConfig {
  apiUrl: string;
  scriptUrl: string;
  apiKey: string;
  secretKey: string;
}

interface Deps {
  fetch?: typeof fetch;
  config?: MemedConfig;
}

/** null quando o ambiente não está configurado — é assim que a UI se esconde. */
export function memedConfig(): MemedConfig | null {
  const apiUrl = process.env.MEMED_API_URL;
  const scriptUrl = process.env.MEMED_SCRIPT_URL;
  const apiKey = process.env.MEMED_API_KEY;
  const secretKey = process.env.MEMED_SECRET_KEY;
  if (!apiUrl || !scriptUrl || !apiKey || !secretKey) return null;
  return { apiUrl, scriptUrl, apiKey, secretKey };
}

function resolve(deps: Deps): { doFetch: typeof fetch; config: MemedConfig } {
  const config = deps.config ?? memedConfig();
  if (!config) throw new Error("Memed não configurada (MEMED_* ausentes).");
  return { doFetch: deps.fetch ?? fetch, config };
}

/** Credenciais vão como query param — é o que a Memed especifica. */
function withCredentials(base: string, config: MemedConfig): string {
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}api-key=${encodeURIComponent(config.apiKey)}&secret-key=${encodeURIComponent(config.secretKey)}`;
}

const JSON_API_HEADERS = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/json",
};

/** A Memed explica o erro em `errors[].detail`; sem isso a UI só teria "HTTP 400". */
function memedDetail(body: unknown): string | null {
  const errors = (body as { errors?: unknown })?.errors;
  if (!Array.isArray(errors)) return null;
  const detail = errors.map((e) => (e as { detail?: unknown })?.detail).find((d) => typeof d === "string" && d.trim());
  return typeof detail === "string" ? detail.trim() : null;
}

async function json(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function tokenOf(body: unknown): string | null {
  const token = (body as { data?: { attributes?: { token?: unknown } } })?.data?.attributes?.token;
  return typeof token === "string" && token !== "" ? token : null;
}

/** Busca o prescritor por qualquer chave que a Memed aceite: id externo, CPF ou id dela. */
async function fetchPrescriberToken(
  key: string,
  doFetch: typeof fetch,
  config: MemedConfig
): Promise<string | null> {
  const url = withCredentials(
    `${config.apiUrl}/sinapse-prescricao/usuarios/${encodeURIComponent(key)}`,
    config
  );
  const response = await doFetch(url, { headers: JSON_API_HEADERS });
  if (!response.ok) return null;
  return tokenOf(await json(response));
}

/**
 * O token do prescritor NÃO é estático — a doc manda buscar o mais recente a
 * cada uso. Então: sempre GET primeiro; só registra se não existir.
 *
 * O caminho que faltava (verificado na homologação em 2026-09-17): quando o CPF
 * **já tem conta na Memed**, o POST devolve 400 com o id externo dele entre
 * parênteses, e o GET por esse id — ou pelo CPF — devolve o token normalmente.
 * Sem isso, todo médico que já usa a Memed ficava sem prescrever para sempre,
 * que é a situação mais provável de um médico real.
 */
export async function getOrCreatePrescriberToken(
  professional: Professional,
  deps: Deps = {},
  extras: PrescriberExtras = {}
): Promise<string> {
  const { doFetch, config } = resolve(deps);
  const externalId = memedExternalId(professional.id);

  const getUrl = withCredentials(
    `${config.apiUrl}/sinapse-prescricao/usuarios/${encodeURIComponent(externalId)}`,
    config
  );
  const existing = await doFetch(getUrl, { headers: JSON_API_HEADERS });

  if (existing.ok) {
    const token = tokenOf(await json(existing));
    if (token) return token;
    throw new Error("Memed devolveu prescritor sem token.");
  }

  if (existing.status !== 404) {
    throw new Error(`Memed falhou ao buscar prescritor (HTTP ${existing.status}).`);
  }

  const created = await doFetch(withCredentials(`${config.apiUrl}/sinapse-prescricao/usuarios`, config), {
    method: "POST",
    headers: JSON_API_HEADERS,
    body: JSON.stringify(toMemedPrescriberPayload(professional, extras)),
  });
  const createdBody = await json(created);

  if (created.ok) {
    const token = tokenOf(createdBody);
    if (token) return token;
    throw new Error("Memed registrou o prescritor mas não devolveu token.");
  }

  // Já existe lá com outro id externo: recupera em vez de desistir.
  const knownId = alreadyRegisteredExternalId(createdBody);
  const cpf = String(professional.cpf ?? "").replace(/\D/g, "");
  for (const key of [knownId, cpf].filter((value): value is string => Boolean(value))) {
    const token = await fetchPrescriberToken(key, doFetch, config);
    if (token) return token;
  }

  const detail = memedDetail(createdBody);
  throw new Error(
    detail
      ? `Memed recusou o cadastro do prescritor: ${detail}`
      : `Memed falhou ao registrar prescritor (HTTP ${created.status}).`
  );
}

async function tryJson(doFetch: typeof fetch, url: string): Promise<unknown> {
  try {
    const response = await doFetch(url, { headers: JSON_API_HEADERS });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export interface PrescriptionLinks {
  pdfUrl: string | null;
  patientLink: string | null;
  /** Os 4 dígitos que destravam a receita para o paciente e para a farmácia. */
  accessCode: string | null;
  /** Assinada digitalmente. Só dá para dizer "assinada" quando a Memed confirma. */
  signed: boolean;
}

/**
 * PDF e link do paciente são buscas independentes: uma pode falhar sem
 * derrubar a outra. Melhor gravar a receita com um link só do que perder a
 * referência inteira.
 */
export async function getPrescriptionLinks(
  prescriptionId: string,
  token: string,
  deps: Deps = {}
): Promise<PrescriptionLinks> {
  const { doFetch, config } = resolve(deps);
  const query = `token=${encodeURIComponent(token)}`;

  // As duas em paralelo: a reconciliação faz isto por receita, e cada ida à Memed pesa.
  const [pdfBody, patientBody] = await Promise.all([
    tryJson(doFetch, `${config.apiUrl}/prescricoes/${prescriptionId}/url-document/full?${query}`),
    tryJson(doFetch, `${config.apiUrl}/prescricoes/${prescriptionId}/get-digital-prescription-link?${query}`),
  ]);
  const pdf = parseLinkResponse(pdfBody);
  const patient = parseLinkResponse(patientBody);

  return {
    pdfUrl: pdf.link,
    patientLink: patient.link,
    accessCode: patient.digits,
    // A assinatura é do documento: quem responde por ela é o endpoint do PDF.
    signed: pdf.signed,
  };
}

/** Usado pela reconciliação manual — a lista já traz o paciente de cada receita. */
export async function listPrescriptions(
  token: string,
  deps: Deps = {}
): Promise<RemotePrescription[]> {
  const { doFetch, config } = resolve(deps);
  const response = await doFetch(`${config.apiUrl}/prescricoes?token=${encodeURIComponent(token)}`, {
    headers: JSON_API_HEADERS,
  });
  if (!response.ok) throw new Error(`Memed falhou ao listar receitas (HTTP ${response.status}).`);
  return parsePrescriptionList(await json(response));
}

/**
 * A Memed espera a especialidade como **id** dela, não como o texto livre que
 * guardamos em `professionals.specialty` — e especialidade é exigência para
 * credenciais de produção. Esta lista alimenta o select em Configurações.
 *
 * A resposta traz `grupo` junto ("Cardiologia" → "Clínica geral"), que é como a
 * própria Memed agrupa o select.
 */
export async function listSpecialties(deps: Deps = {}): Promise<{ id: string; nome: string; grupo: string }[]> {
  const { doFetch, config } = resolve(deps);
  const response = await doFetch(withCredentials(`${config.apiUrl}/especialidades`, config), {
    headers: JSON_API_HEADERS,
  });
  if (!response.ok) throw new Error(`Memed falhou ao listar especialidades (HTTP ${response.status}).`);
  const body = (await json(response)) as { data?: unknown };
  const rows = Array.isArray(body?.data) ? body.data : [];
  return rows.map((row: { id?: string | number; attributes?: { nome?: string; name?: string; grupo?: string } }) => ({
    id: String(row.id ?? ""),
    nome: row.attributes?.nome ?? row.attributes?.name ?? "",
    grupo: row.attributes?.grupo ?? "",
  }));
}
