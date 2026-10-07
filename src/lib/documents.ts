import { fmtDate } from "./format.ts";
import { CFM_SPECIALTIES } from "./specialties.ts";

/**
 * Documentos da clínica que não são receita: atestado, encaminhamento, laudo
 * e orientações. Aqui ficam só tipos, rótulos, modelos padrão, o motor de
 * {{placeholders}} e o código de autenticidade — funções puras, sem banco,
 * testadas em documents.test.mjs e importáveis pelo formulário no navegador.
 * As consultas ao banco ficam em documents-db.ts; as ações em actions-documents.ts.
 */

export type DocumentKind = "atestado" | "encaminhamento" | "laudo" | "orientacoes" | "receituario";
export type AtestadoSubkind = "medico" | "comparecimento" | "acompanhante";

/** Rótulo de todo tipo de documento, inclusive os que não têm modelo de texto. */
export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  atestado: "Atestado",
  encaminhamento: "Encaminhamento",
  laudo: "Laudo / relatório",
  orientacoes: "Orientações",
  receituario: "Receituário",
};

/**
 * Os tipos que o **editor de texto** do compositor emite, e para os quais
 * existem modelos. O receituário fica fora de propósito: ele não é um texto
 * com campos, é uma lista de medicamentos com editor próprio
 * (ver `prescription.ts`), e um modelo dele seria um protocolo de
 * medicamentos, não um texto com {{placeholders}}. Rótulos de
 * DOCUMENT_KIND_LABEL, para não haver duas grafias do mesmo nome.
 */
export const DOCUMENT_KINDS: ReadonlyArray<{ kind: DocumentKind; label: string }> = (
  ["atestado", "encaminhamento", "laudo", "orientacoes"] as const
).map((kind) => ({ kind, label: DOCUMENT_KIND_LABEL[kind] }));

export const ATESTADO_SUBKIND_LABEL: Record<AtestadoSubkind, string> = {
  medico: "Atestado médico",
  comparecimento: "Declaração de comparecimento",
  acompanhante: "Declaração de acompanhante",
};

/** Os subtipos na ordem do seletor, com os rótulos de ATESTADO_SUBKIND_LABEL. */
export const ATESTADO_SUBKINDS: ReadonlyArray<{ subkind: AtestadoSubkind; label: string }> = (
  ["medico", "comparecimento", "acompanhante"] as const
).map((subkind) => ({ subkind, label: ATESTADO_SUBKIND_LABEL[subkind] }));

export function isDocumentKind(value: unknown): value is DocumentKind {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DOCUMENT_KIND_LABEL, value);
}

export function isAtestadoSubkind(value: unknown): value is AtestadoSubkind {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ATESTADO_SUBKIND_LABEL, value);
}

/** Só o atestado tem subtipo; qualquer outra coisa vira null. Atestado sem subtipo válido é "medico". */
export function normalizeSubkind(kind: DocumentKind, value: unknown): AtestadoSubkind | null {
  if (kind !== "atestado") return null;
  return isAtestadoSubkind(value) ? value : "medico";
}

/** Título impresso no alto da folha (e título padrão do documento). */
export function documentTitle(kind: DocumentKind, subkind: string | null | undefined): string {
  if (kind === "atestado") return ATESTADO_SUBKIND_LABEL[normalizeSubkind(kind, subkind) ?? "medico"];
  if (kind === "encaminhamento") return "Encaminhamento";
  if (kind === "laudo") return "Relatório médico";
  return "Orientações";
}

/* ---------- Linhas das tabelas (migração 2026-09-09-documentos) ---------- */

export interface Document {
  id: number;
  patient_id: number;
  professional_id: number;
  encounter_id: number | null;
  kind: DocumentKind;
  subkind: string | null;
  title: string;
  body: string;
  /** JSON (`serializeDocumentFields`): modelo e campos usados, para duplicar re-renderizando. */
  fields: string | null;
  /** RNV-XXXX-XXXX — impresso na folha e digitado em /validar. */
  code: string;
  /** YYYY-MM-DD */
  issued_at: string;
  shared_with_patient: number;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

/**
 * `document_templates.kind`: um tipo de documento, ou "protocolo" — um pacote
 * de vários documentos (migração 2026-09-16). Um protocolo guarda os itens em
 * JSON no `fields` (`serializeProtocol`), com `body = ''` e `subkind = null`.
 */
export type TemplateKind = DocumentKind | "protocolo";

export const PROTOCOL_KIND = "protocolo";

export interface DocumentTemplate {
  id: number;
  /** null = modelo da clínica (todo mundo vê); senão, "meus modelos" daquele profissional. */
  professional_id: number | null;
  kind: TemplateKind;
  subkind: string | null;
  name: string;
  title: string | null;
  body: string;
  fields: string | null;
  created_at: string;
  professional_name?: string | null;
}

/* ---------- Paciente: nome social ---------- */

/** O nome pelo qual a pessoa é chamada: o social quando há, senão o civil. */
export function patientDisplayName(patient: { name: string; social_name?: string | null }): string {
  return patient.social_name?.trim() || patient.name.trim();
}

/** Primeiro nome para saudações ("Olá, Ana!"), a partir do nome social quando há. */
export function patientFirstName(patient: { name: string; social_name?: string | null }): string {
  const display = patientDisplayName(patient);
  return display.split(/\s+/)[0] || display;
}

/* ---------- Código de autenticidade ---------- */

/** Sem 0/O nem 1/I: o código é digitado à mão em /validar por quem recebeu o papel. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DOCUMENT_CODE_RE = /^RNV-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

export interface RandomSource {
  getRandomValues(array: Uint8Array): Uint8Array;
}

/**
 * `RNV-XXXX-XXXX`, 8 símbolos de um alfabeto de 32 (≈ 1,1 trilhão de
 * combinações). Cada byte aleatório vira um símbolo (256 é múltiplo de 32,
 * então a distribuição é uniforme). A fonte de aleatoriedade é a Web Crypto,
 * disponível no Node e no navegador; os testes passam uma fonte previsível.
 */
export function generateDocumentCode(random: RandomSource = globalThis.crypto): string {
  const bytes = random.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]);
  return `RNV-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/**
 * O que a pessoa digitou vira o formato canônico: aceita minúsculas, espaços,
 * sem hífens e sem o prefixo "RNV". Fora do alfabeto ou do tamanho → null.
 */
export function normalizeDocumentCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.startsWith("RNV")) raw = raw.slice(3);
  if (raw.length !== 8) return null;
  const code = `RNV-${raw.slice(0, 4)}-${raw.slice(4)}`;
  return DOCUMENT_CODE_RE.test(code) ? code : null;
}

/* ---------- Placeholders e modelos ---------- */

export const PLACEHOLDERS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "paciente", label: "Nome do paciente (o social, quando há)" },
  { key: "nome_civil", label: "Nome civil do paciente" },
  { key: "cpf", label: "CPF do paciente (vazio se não cadastrado)" },
  { key: "data", label: "Data do documento, dd/mm/aaaa" },
  { key: "data_extenso", label: "Data por extenso (9 de setembro de 2026)" },
  { key: "dias", label: "Dias de afastamento (atestado médico)" },
  { key: "motivo", label: "Motivo (atestado ou encaminhamento)" },
  { key: "cid", label: "CID — no atestado só sai com o consentimento marcado" },
  { key: "entrada", label: "Horário de entrada (comparecimento)" },
  { key: "saida", label: "Horário de saída (comparecimento)" },
  { key: "acompanhante", label: "Nome do acompanhante (declaração de acompanhante)" },
  { key: "destino", label: "Especialidade ou serviço de destino (encaminhamento)" },
  { key: "historia", label: "História clínica (encaminhamento)" },
  { key: "conduta", label: "Conduta até o momento (encaminhamento)" },
  { key: "profissional", label: "Nome do profissional que assina" },
  { key: "conselho", label: "Conselho e número (CRM 123456-SP)" },
  { key: "clinica", label: "Nome da clínica" },
];

export type TemplateVars = Record<string, string | null | undefined>;

const PLACEHOLDER = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/**
 * Troca cada {{chave}} pelo valor. Duas regras que o médico precisa saber:
 * 1. Chave desconhecida fica visível ({{qualquer}}) — melhor notar do que
 *    sair um buraco no papel.
 * 2. Uma linha cujos campos conhecidos estão todos vazios some inteira —
 *    é assim que "CID: {{cid}}" só aparece quando o CID foi preenchido.
 * Linhas em branco em sequência são reduzidas a uma.
 */
export function renderTemplate(body: string, vars: TemplateVars): string {
  const known = (key: string) => Object.prototype.hasOwnProperty.call(vars, key);
  const out: string[] = [];
  for (const line of body.replace(/\r\n?/g, "\n").split("\n")) {
    let knownCount = 0;
    let filled = 0;
    let unknown = 0;
    const rendered = line.replace(PLACEHOLDER, (match, key: string) => {
      if (!known(key)) {
        unknown += 1;
        return match;
      }
      knownCount += 1;
      const value = String(vars[key] ?? "").trim();
      if (value) filled += 1;
      return value;
    });
    if (knownCount > 0 && filled === 0 && unknown === 0) continue;
    out.push(rendered);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-09-09" → "9 de setembro de 2026". Data inválida volta como veio. */
export function dateExtenso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!match) return iso ?? "";
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  if (!name) return iso;
  return `${Number(day)} de ${name} de ${year}`;
}

export interface TemplateText {
  title: string;
  body: string;
}

/**
 * Usados quando o profissional não tem modelo salvo. Chave: `kind` ou
 * `kind.subkind`. O {{motivo}} do atestado fica numa linha só dele: sem
 * motivo, a linha some inteira (regra 2 do renderTemplate) e não sobra um
 * ponto perdido.
 */
export const DEFAULT_TEMPLATES: Record<string, TemplateText> = {
  "atestado.medico": {
    title: "Atestado médico",
    body:
      "Atesto, para os devidos fins, que {{paciente}} esteve sob meus cuidados nesta data.\n" +
      "{{motivo}}.\n\n" +
      "Necessita de {{dias}} dia(s) de afastamento de suas atividades a partir de {{data}}.\n\n" +
      "CID: {{cid}}",
  },
  "atestado.comparecimento": {
    title: "Declaração de comparecimento",
    body:
      "Declaro, para os devidos fins, que {{paciente}} compareceu a este serviço em {{data}}, " +
      "das {{entrada}} às {{saida}}, para atendimento de saúde.",
  },
  "atestado.acompanhante": {
    title: "Declaração de acompanhante",
    body:
      "Declaro, para os devidos fins, que {{acompanhante}} esteve neste serviço em {{data}}, " +
      "das {{entrada}} às {{saida}}, acompanhando o(a) paciente {{paciente}} em atendimento de saúde.",
  },
  encaminhamento: {
    title: "Encaminhamento",
    body:
      "Encaminho {{paciente}} para avaliação em {{destino}}.\n\n" +
      "CID: {{cid}}\n" +
      "Motivo: {{motivo}}\n" +
      "História clínica: {{historia}}\n" +
      "Conduta até o momento: {{conduta}}\n\n" +
      "Coloco-me à disposição para qualquer esclarecimento.",
  },
  laudo: {
    title: "Relatório médico",
    body:
      "Relatório sobre {{paciente}}, atendido(a) em {{data}}.\n\n" +
      "Histórico:\n\n\n" +
      "Exame e resultados:\n\n\n" +
      "Conclusão:\n",
  },
  orientacoes: {
    title: "Orientações",
    body:
      "Orientações para {{paciente}}\n\n" +
      "Siga estas recomendações até a próxima consulta:\n\n" +
      "1. \n" +
      "2. \n" +
      "3. \n\n" +
      "Em caso de dúvida, fale com a clínica.",
  },
};

export function templateKey(kind: DocumentKind, subkind: string | null | undefined): string {
  const sub = normalizeSubkind(kind, subkind);
  return sub ? `${kind}.${sub}` : kind;
}

export function defaultTemplate(kind: DocumentKind, subkind: string | null | undefined): TemplateText {
  return DEFAULT_TEMPLATES[templateKey(kind, subkind)] ?? DEFAULT_TEMPLATES[kind] ?? { title: documentTitle(kind, subkind), body: "" };
}

/**
 * O texto que vale na emissão: o modelo salvo, se existe e é do mesmo tipo;
 * senão o padrão do tipo (e `templateId` null, para o documento não apontar
 * para um modelo que não usou). Título vazio no modelo salvo herda o padrão.
 */
export function pickTemplate(
  saved: Pick<DocumentTemplate, "id" | "kind" | "title" | "body"> | null | undefined,
  kind: DocumentKind,
  subkind: string | null | undefined
): { template: TemplateText; templateId: number | null } {
  const fallback = defaultTemplate(kind, subkind);
  if (!saved || saved.kind !== kind) return { template: fallback, templateId: null };
  return { template: { title: saved.title?.trim() || fallback.title, body: saved.body }, templateId: saved.id };
}

/* ---------- Campos estruturados por tipo ---------- */

/**
 * Chaves aceitas em tempo de execução, e o tipo sai daqui. Antes eram duas
 * listas escritas à mão: um subconjunto continua sendo um array válido para o
 * tsc, e foi assim que `medicamentos` chegou ao banco vazio na primeira
 * tentativa. O teste "FIELD_KEYS cobre todo FieldKey" ficou de guarda.
 */
const FIELD_KEYS = [
  "dias",
  "motivo",
  "cid",
  "cid_consent",
  "entrada",
  "saida",
  "acompanhante",
  "destino",
  "historia",
  "conduta",
  // Lista de medicamentos do receituário, serializada (ver `prescription.ts`).
  "medicamentos",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export type FieldType = "number" | "text" | "time" | "select" | "checkbox" | "textarea";

export interface FieldDef {
  key: FieldKey;
  label: string;
  type: FieldType;
  hint?: string;
  /** Ocupa a linha inteira no formulário. */
  wide?: boolean;
  defaultValue?: string;
  /** select: opções prontas; a última, "Outro", troca o controle por um texto livre. */
  options?: ReadonlyArray<string>;
  /** text com sugestões (datalist). */
  suggestions?: ReadonlyArray<string>;
  rows?: number;
}

/** Motivos prontos do atestado médico (como na Mevo). O último, "Outro", vira texto livre. */
export const ATESTADO_MOTIVOS = [
  "Foi orientado(a) a permanecer em repouso",
  "Deve afastar-se de suas atividades",
  "Compareceu a consulta médica nesta data",
  "Está apto(a) a exercer práticas esportivas",
  "Não está apto(a) a exercer práticas esportivas",
  "Está em condições físicas e mentais para exercer suas atividades",
  "Outro",
] as const;

const CID_LABEL = "CID (opcional)";
const ENTRADA: FieldDef = { key: "entrada", label: "Entrada", type: "time" };
const SAIDA: FieldDef = { key: "saida", label: "Saída", type: "time" };

const ATESTADO_MEDICO_FIELDS: ReadonlyArray<FieldDef> = [
  { key: "dias", label: "Dias de afastamento", type: "number", defaultValue: "1" },
  {
    key: "motivo",
    label: "Motivo",
    type: "select",
    wide: true,
    options: ATESTADO_MOTIVOS,
    defaultValue: ATESTADO_MOTIVOS[0],
  },
  { key: "cid", label: CID_LABEL, type: "text" },
  {
    key: "cid_consent",
    label: "O paciente pediu que o CID apareça no atestado (Art. 5º da Resolução CFM 1.658/02)",
    type: "checkbox",
    wide: true,
    hint: "Sem esta marcação o CID fica só no prontuário.",
  },
];

const COMPARECIMENTO_FIELDS: ReadonlyArray<FieldDef> = [ENTRADA, SAIDA];

const ACOMPANHANTE_FIELDS: ReadonlyArray<FieldDef> = [
  { key: "acompanhante", label: "Nome do acompanhante", type: "text", wide: true },
  ENTRADA,
  SAIDA,
];

const ENCAMINHAMENTO_FIELDS: ReadonlyArray<FieldDef> = [
  { key: "destino", label: "Especialidade ou serviço", type: "text", wide: true, suggestions: CFM_SPECIALTIES },
  { key: "cid", label: CID_LABEL, type: "text" },
  { key: "motivo", label: "Motivo do encaminhamento", type: "text", wide: true },
  { key: "historia", label: "História clínica", type: "textarea", wide: true, rows: 3 },
  { key: "conduta", label: "Conduta até agora", type: "textarea", wide: true, rows: 2 },
];

/** Quais campos o formulário mostra para cada tipo. Laudo e orientações são texto livre. */
export function fieldsFor(kind: DocumentKind, subkind: string | null | undefined): FieldDef[] {
  if (kind === "atestado") {
    const sub = normalizeSubkind(kind, subkind);
    if (sub === "comparecimento") return [...COMPARECIMENTO_FIELDS];
    if (sub === "acompanhante") return [...ACOMPANHANTE_FIELDS];
    return [...ATESTADO_MEDICO_FIELDS];
  }
  if (kind === "encaminhamento") return [...ENCAMINHAMENTO_FIELDS];
  return [];
}

export type DocumentFieldValues = Partial<Record<FieldKey, string>>;

/** Estado inicial do formulário: o `defaultValue` de cada campo (ou ""). */
export function defaultFieldValues(defs: ReadonlyArray<FieldDef>): DocumentFieldValues {
  const out: DocumentFieldValues = {};
  for (const def of defs) out[def.key] = def.defaultValue ?? "";
  return out;
}

export interface DocumentFieldsJson {
  /** Modelo salvo usado na emissão; null = modelo padrão. */
  template_id: number | null;
  fields: DocumentFieldValues;
}

/** Exportado só para o teste garantir que nenhuma chave nova fique de fora. */
export const ALL_FIELD_KEYS: ReadonlyArray<FieldKey> = FIELD_KEYS;

const CHECKBOX_KEYS: ReadonlySet<FieldKey> = new Set<FieldKey>(["cid_consent"]);

export function isCheckboxField(key: FieldKey): boolean {
  return CHECKBOX_KEYS.has(key);
}

/** O que um checkbox manda quando marcado: "1", "on" (HTML sem value), "true" ou o booleano. */
function checkboxOn(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const lowered = value.trim().toLowerCase();
  return lowered === "1" || lowered === "on" || lowered === "true";
}

/**
 * Só chaves conhecidas, só strings aparadas, só as que têm valor. Checkbox
 * marcado vira "1"; desmarcado (ou lixo) simplesmente não entra.
 */
export function normalizeFieldValues(raw: Record<string, unknown> | null | undefined): DocumentFieldValues {
  const out: DocumentFieldValues = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of FIELD_KEYS) {
    const value = raw[key];
    if (CHECKBOX_KEYS.has(key)) {
      if (checkboxOn(value)) out[key] = "1";
      continue;
    }
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

export function serializeDocumentFields(data: DocumentFieldsJson): string {
  return JSON.stringify({ template_id: data.template_id ?? null, fields: normalizeFieldValues(data.fields) });
}

/** Lê o JSON gravado em `documents.fields`; tolerante a lixo e a chaves faltando. */
export function parseDocumentFields(json: string | null | undefined): DocumentFieldsJson | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;
    const id = obj.template_id;
    return {
      template_id: typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null,
      fields: normalizeFieldValues(obj.fields as Record<string, unknown> | undefined),
    };
  } catch {
    return null;
  }
}

/**
 * O CID que pode ir para o papel. No atestado, só com o consentimento do
 * paciente marcado (Art. 5º da Resolução CFM 1.658/02) — sem ele o CID fica
 * no prontuário. Nos outros tipos, sai sempre que foi preenchido.
 */
export function printableCid(kind: DocumentKind | undefined, fields: DocumentFieldValues | null | undefined): string {
  const f = fields ?? {};
  if (kind === "atestado" && f.cid_consent !== "1") return "";
  return f.cid ?? "";
}

/** As variáveis que `renderTemplate` conhece, a partir de paciente, profissional, clínica, data e campos. */
export function buildTemplateVars(input: {
  patient: { name: string; cpf?: string | null; social_name?: string | null };
  professional?: { name: string; council?: string | null } | null;
  clinicName: string;
  /** YYYY-MM-DD */
  date: string;
  fields?: DocumentFieldValues | null;
  /** Com "atestado", o CID só entra quando `fields.cid_consent === "1"`. */
  kind?: DocumentKind;
}): Record<string, string> {
  const f = input.fields ?? {};
  const civilName = input.patient.name.trim();
  return {
    paciente: patientDisplayName(input.patient),
    nome_civil: civilName,
    cpf: input.patient.cpf?.trim() ?? "",
    data: fmtDate(input.date),
    data_extenso: dateExtenso(input.date),
    dias: f.dias ?? "",
    motivo: f.motivo ?? "",
    cid: printableCid(input.kind, f),
    entrada: f.entrada ?? "",
    saida: f.saida ?? "",
    acompanhante: f.acompanhante ?? "",
    destino: f.destino ?? "",
    historia: f.historia ?? "",
    conduta: f.conduta ?? "",
    profissional: input.professional?.name?.trim() ?? "",
    conselho: input.professional?.council?.trim() ?? "",
    clinica: input.clinicName.trim(),
  };
}

/* ---------- Validação pública e portal ---------- */

const PARTICLES = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "del", "della", "van", "von"]);

/** "Ana Beatriz Souza" → "A. B. S." — o que a validação pública mostra do paciente. */
export function patientInitials(name: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const kept = words.filter((word) => !PARTICLES.has(word.toLowerCase()));
  const use = kept.length > 0 ? kept : words;
  return use.map((word) => `${Array.from(word)[0].toUpperCase()}.`).join(" ");
}

/** O paciente vê o documento no portal se for dele, estiver compartilhado e não revogado. */
export function canPatientSeeDocument(
  doc: Pick<Document, "patient_id" | "shared_with_patient" | "revoked_at">,
  patientId: number
): boolean {
  return doc.patient_id === patientId && Number(doc.shared_with_patient) === 1 && !doc.revoked_at;
}

export function validationUrlFor(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/validar/${code}`;
}

/** "https://clinica.com.br/validar/RNV-…" → "clinica.com.br/validar", para imprimir na folha. */
export function validationHost(validationUrl: string): string {
  const withoutProto = validationUrl.replace(/^[a-z]+:\/\//i, "");
  const cut = withoutProto.indexOf("/validar");
  const host = cut >= 0 ? withoutProto.slice(0, cut) : withoutProto.replace(/\/.*$/, "");
  return `${host}/validar`;
}

/** Mensagem pronta do WhatsApp com o link do portal e o código de autenticidade. */
export function documentWhatsAppMessage(input: {
  firstName: string;
  clinicName: string;
  title: string;
  portalUrl: string;
  code: string;
}): string {
  return (
    `Olá ${input.firstName}! Aqui é da ${input.clinicName}. ` +
    `Seu documento "${input.title}" já está no seu portal: ${input.portalUrl}\n` +
    `Código de autenticidade: ${input.code}`
  );
}

/**
 * Uma mensagem só para os documentos emitidos juntos ("Emitir documentos"):
 * o link do portal, um item por documento com o código, e onde conferir.
 * `validationHost` é o texto impresso na folha ("clinica.com.br/validar").
 */
export function documentsBatchWhatsAppMessage(input: {
  firstName: string;
  clinicName: string;
  portalUrl: string;
  documents: ReadonlyArray<{ title: string; code: string }>;
  validationHost: string;
}): string {
  const many = input.documents.length !== 1;
  const intro = many
    ? `Seus documentos de hoje já estão no seu portal: ${input.portalUrl}`
    : `Seu documento de hoje já está no seu portal: ${input.portalUrl}`;
  const lines = input.documents.map((doc) => `• ${doc.title} — código ${doc.code}`);
  const check = many
    ? `Quem precisar conferir pode validar os códigos em ${input.validationHost}.`
    : `Quem precisar conferir pode validar o código em ${input.validationHost}.`;
  return [`Olá ${input.firstName}! Aqui é da ${input.clinicName}. ${intro}`, ...lines, check].join("\n");
}

/* ---------- Protocolos: vários documentos num modelo só ---------- */

/** Um documento dentro de um protocolo: o que basta para recriá-lo na hora de emitir. */
export interface ProtocolItem {
  kind: DocumentKind;
  subkind: AtestadoSubkind | null;
  /** Modelo salvo do item; null = padrão do tipo. Se o modelo sumir, vale o padrão. */
  template_id: number | null;
  /** Título fixado no protocolo; null = o do modelo. */
  title: string | null;
  fields: DocumentFieldValues;
}

/** Limite de documentos numa emissão (e num protocolo). */
export const MAX_PROTOCOL_ITEMS = 10;

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

/** Lê um item de protocolo (ou de pilha) vindo de JSON; null quando o tipo não existe. */
export function parseProtocolItem(raw: unknown): ProtocolItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!isDocumentKind(obj.kind)) return null;
  const kind = obj.kind;
  const title = typeof obj.title === "string" ? obj.title.trim().slice(0, 120) : "";
  return {
    kind,
    subkind: normalizeSubkind(kind, obj.subkind),
    template_id: positiveInt(obj.template_id),
    title: title || null,
    fields: normalizeFieldValues(obj.fields as Record<string, unknown> | undefined),
  };
}

/** O JSON gravado em `document_templates.fields` de um protocolo. */
export function serializeProtocol(items: ReadonlyArray<ProtocolItem>): string {
  const clean = items
    .map((item) => parseProtocolItem(item))
    .filter((item): item is ProtocolItem => item !== null)
    .slice(0, MAX_PROTOCOL_ITEMS);
  return JSON.stringify({ items: clean });
}

/** Lê o JSON de um protocolo; tolerante a lixo (→ []), a itens inválidos (pulados) e a excesso (cortado). */
export function parseProtocol(json: string | null | undefined): ProtocolItem[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
        ? ((parsed as { items: unknown[] }).items)
        : [];
    return list
      .map((item) => parseProtocolItem(item))
      .filter((item): item is ProtocolItem => item !== null)
      .slice(0, MAX_PROTOCOL_ITEMS);
  } catch {
    return [];
  }
}

/** "Atestado médico + Encaminhamento + Orientações" — como o protocolo aparece nas listas. */
export function protocolSummary(items: ReadonlyArray<Pick<ProtocolItem, "kind" | "subkind" | "title">>): string {
  if (items.length === 0) return "Protocolo vazio";
  return items.map((item) => item.title?.trim() || documentTitle(item.kind, item.subkind)).join(" + ");
}
