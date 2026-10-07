/**
 * Leitura das respostas da Memed — as **de verdade**, capturadas da homologação
 * em 2026-09-17 (`data/memed-probe/`). Até então o código lia um formato
 * imaginado, e o resultado era silencioso: link do paciente e PDF sempre nulos.
 *
 * As três formas que importam:
 *
 * `GET /prescricoes/{id}/url-document/full`
 * ```json
 * { "data": [ { "type": "prescricoes", "attributes": {
 *     "link": "https://integrations.api.memed.com.br/v1/prescricoes/bR3mYj/pdf?document=…",
 *     "signed": 0 } } ] }
 * ```
 *
 * `GET /prescricoes/{id}/get-digital-prescription-link`
 * ```json
 * { "data": [ { "type": "prescricoes", "attributes": {
 *     "link": "https://assistant.memed.com.br/p/bR3mYj", "digits": "3047" } } ] }
 * ```
 *
 * `GET /prescricoes` — lista, com o **paciente junto** (é o que permite ligar
 * cada receita ao paciente certo na reconciliação).
 */

/** `data` vem como array nestes endpoints, e como objeto no cadastro do prescritor. */
function firstAttributes(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as Record<string, unknown>).data;
  const node = Array.isArray(data) ? data[0] : data;
  if (!node || typeof node !== "object") return null;
  const attributes = (node as Record<string, unknown>).attributes;
  return attributes && typeof attributes === "object" ? (attributes as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

export interface MemedLink {
  /** A URL em si. `link` é o nome real do campo; `url` fica como rede de segurança. */
  link: string | null;
  /** Os 4 dígitos que o paciente digita para abrir a receita. Só vem no link do paciente. */
  digits: string | null;
  /** 1 quando a receita foi assinada digitalmente. Sem isto não dá para afirmar "assinada". */
  signed: boolean;
}

export function parseLinkResponse(body: unknown): MemedLink {
  const attributes = firstAttributes(body);
  if (!attributes) return { link: null, digits: null, signed: false };

  const digits = text(attributes.digits);
  return {
    link: text(attributes.link) ?? text(attributes.url),
    // Só aceita os 4 dígitos no formato que o paciente vai digitar.
    digits: digits && /^\d{4}$/.test(digits) ? digits : null,
    signed: attributes.signed === 1 || attributes.signed === "1" || attributes.signed === true,
  };
}

/**
 * O CPF já cadastrado é o caso normal, não a exceção: a Memed é líder de
 * mercado, então o médico real quase sempre já tem conta lá. O erro devolve o
 * id externo dele entre parênteses, e é por ele que se recupera o token.
 *
 * ```json
 * { "errors": [ { "code": "Cpf", "title": "Erro", "detail":
 *   "Medico ja cadastrado para o parceiro com esse cpf. Id externo (e7b8a2d1-…)" } ] }
 * ```
 */
export function alreadyRegisteredExternalId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const errors = (body as Record<string, unknown>).errors;
  if (!Array.isArray(errors)) return null;

  for (const error of errors) {
    const detail = text((error as Record<string, unknown>)?.detail);
    if (!detail) continue;
    const match = detail.match(/Id externo\s*\(([^)]+)\)/i);
    const id = match?.[1]?.trim();
    if (id) return id;
  }
  return null;
}

/** `"31/08/2026 21:03:46"` → `"2026-08-31 21:03:46"`. A Memed data em dd/mm/YYYY. */
export function brDateTimeToISO(value: string | null | undefined): string | null {
  const match = (value ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?$/);
  if (!match) return null;
  const [, day, month, year, time] = match;
  return time ? `${year}-${month}-${day} ${time}` : `${year}-${month}-${day}`;
}

export function memedPatientExternalId(patientId: number): string {
  return `renova-pac-${patientId}`;
}

/** O caminho de volta: `"renova-pac-12"` → `12`. Ignora ids que não são nossos. */
export function patientIdFromExternalId(externalId: unknown): number | null {
  const match = text(externalId)?.match(/^renova-pac-(\d+)$/);
  const id = match ? Number(match[1]) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export interface RemotePrescription {
  id: string;
  /** Já convertida para o formato do banco; null quando a Memed não mandou data. */
  createdAt: string | null;
  signed: boolean;
  patient: { externalId: string | null; cpf: string | null; name: string | null };
}

const digitsOnly = (value: unknown): string | null => {
  const raw = text(value)?.replace(/\D/g, "");
  return raw ? raw : null;
};

/**
 * A lista traz o paciente dentro de cada receita — por isso a reconciliação não
 * precisa adivinhar de quem é a receita.
 */
export function parsePrescriptionList(body: unknown): RemotePrescription[] {
  const data = (body as Record<string, unknown> | null)?.data;
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => {
      const record = (row ?? {}) as Record<string, unknown>;
      const attributes = (record.attributes ?? {}) as Record<string, unknown>;
      const patient = (attributes.paciente ?? {}) as Record<string, unknown>;
      return {
        id: text(record.id) ?? "",
        createdAt: brDateTimeToISO(text(attributes.created_at)),
        signed: attributes.signed === 1 || attributes.signed === "1",
        patient: {
          externalId: text(patient.external_id),
          cpf: digitsOnly(patient.cpf),
          name: text(patient.nome) ?? text(patient.nome_completo),
        },
      };
    })
    .filter((row) => row.id !== "");
}

/**
 * De quem é esta receita. Primeiro pelo id externo que nós mesmos mandamos no
 * `setPaciente`; depois pelo CPF, que cobre a receita emitida direto na Memed,
 * fora do Renova. Sem nenhum dos dois, devolve null — e quem chama decide, em
 * vez de pendurar a receita no paciente errado.
 */
export function matchPatientId(
  remote: RemotePrescription,
  byCpf: Map<string, number>
): number | null {
  const byExternal = patientIdFromExternalId(remote.patient.externalId);
  if (byExternal) return byExternal;
  const cpf = remote.patient.cpf;
  return (cpf ? byCpf.get(cpf) : null) ?? null;
}
