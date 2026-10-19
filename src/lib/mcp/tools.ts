import { sql, transaction } from "../db.ts";
import type { Encounter, Patient } from "../db.ts";
import { ToolError, type Tool } from "./protocol.ts";

/**
 * As ferramentas que o Claude enxerga no Renova. Leitura livre (com chave de
 * API); escrita só por campo pedido, sempre devolvendo o antes e o depois,
 * para que quem conversa com o Claude veja exatamente o que mudou.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Campos do cadastro que o Claude pode preencher. */
export const PATIENT_FIELDS = [
  "name",
  "social_name",
  "cpf",
  "birth_date",
  "sex",
  "phone",
  "email",
  "insurance",
  "insurance_number",
  "city",
  "notes",
  "allergies",
  "medications",
] as const;
type PatientField = (typeof PATIENT_FIELDS)[number];

const ENCOUNTER_FIELDS = ["complaint", "anamnesis", "exam", "diagnosis", "plan", "prescription"] as const;

const PATIENT_FIELD_DOCS: Record<PatientField, string> = {
  name: "Nome completo",
  social_name: "Nome social",
  cpf: "CPF (com ou sem pontuação)",
  birth_date: "Nascimento, AAAA-MM-DD",
  sex: "Sexo",
  phone: "Celular com DDD",
  email: "E-mail",
  insurance: "Convênio",
  insurance_number: "Carteirinha do convênio",
  city: "Cidade",
  notes: "Observações",
  allergies: "Alergias",
  medications: "Medicamentos em uso",
};

function text(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ToolError(`"${key}" precisa ser texto.`);
  return value.trim();
}

function int(args: Record<string, unknown>, key: string, required = true): number | null {
  const value = args[key];
  if (value === undefined || value === null) {
    if (required) throw new ToolError(`Falta "${key}".`);
    return null;
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) throw new ToolError(`"${key}" precisa ser um número inteiro.`);
  return n;
}

function date(args: Record<string, unknown>, key: string): string | null {
  const value = text(args, key);
  if (!value) return null;
  if (!DATE_RE.test(value)) throw new ToolError(`"${key}" precisa estar no formato AAAA-MM-DD.`);
  return value;
}

export const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

/** Valida e limpa um campo do cadastro; "" vira null (apaga o campo). */
export function cleanPatientField(field: PatientField, raw: string): string | null {
  const value = raw.trim();
  if (value === "") {
    if (field === "name") throw new ToolError("O nome não pode ficar vazio.");
    return null;
  }
  if (field === "birth_date" && !DATE_RE.test(value)) throw new ToolError("birth_date precisa estar no formato AAAA-MM-DD.");
  if (field === "cpf" && digits(value).length !== 11) throw new ToolError(`CPF com ${digits(value).length} dígitos (precisa de 11): ${value}`);
  return value;
}

async function findPatient(id: number): Promise<Patient> {
  const [patient] = await sql<Patient>`SELECT * FROM patients WHERE id = ${id}`;
  if (!patient) throw new ToolError(`Paciente ${id} não existe.`);
  return patient;
}

/** Pacientes que já têm o mesmo CPF ou o mesmo celular (para não duplicar). */
async function possibleDuplicates(cpf: string | null, phone: string | null) {
  const cpfDigits = digits(cpf);
  const phoneDigits = digits(phone).slice(-9);
  if (!cpfDigits && phoneDigits.length < 8) return [];
  return sql<Pick<Patient, "id" | "name" | "cpf" | "phone" | "birth_date">>`
    SELECT id, name, cpf, phone, birth_date FROM patients
    WHERE (${cpfDigits} <> '' AND regexp_replace(COALESCE(cpf, ''), '\\D', '', 'g') = ${cpfDigits})
       OR (${phoneDigits.length >= 8} AND right(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 9) = ${phoneDigits})
    LIMIT 10`;
}

const patientProps = Object.fromEntries(
  PATIENT_FIELDS.map((f) => [f, { type: "string", description: PATIENT_FIELD_DOCS[f] }]),
);

export const TOOLS: Tool[] = [
  {
    name: "buscar_pacientes",
    title: "Buscar pacientes",
    description: "Procura pacientes por nome, nome social, CPF ou celular (pontuação é ignorada). Sem termo, lista os mais recentes.",
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Nome, CPF ou celular" },
        limite: { type: "integer", description: "Máximo de resultados (padrão 20, até 100)" },
      },
    },
    async run(args) {
      const q = text(args, "q") ?? "";
      const limit = Math.min(int(args, "limite", false) ?? 20, 100);
      const like = `%${q}%`;
      const qDigits = digits(q);
      return sql`
        SELECT p.id, p.name, p.social_name, p.cpf, p.birth_date, p.phone, p.city, p.created_at,
          (SELECT max(e.date) FROM encounters e WHERE e.patient_id = p.id) AS ultimo_atendimento
        FROM patients p
        WHERE ${q} = ''
           OR p.name ILIKE ${like} OR COALESCE(p.social_name, '') ILIKE ${like}
           OR (${qDigits.length >= 4} AND (
                regexp_replace(COALESCE(p.cpf, ''), '\\D', '', 'g') LIKE ${`%${qDigits}%`}
             OR regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g') LIKE ${`%${qDigits}%`}))
        ORDER BY CASE WHEN ${q} = '' THEN p.created_at END DESC, p.name
        LIMIT ${limit}`;
    },
  },
  {
    name: "ver_paciente",
    title: "Ver prontuário",
    description:
      "Prontuário de um paciente: cadastro, alergias, medicamentos, atendimentos (com o texto completo), consultas, receitas Memed, documentos emitidos e pagamentos.",
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: { id: { type: "integer", description: "id do paciente" } },
      required: ["id"],
    },
    async run(args) {
      const id = int(args, "id")!;
      const patient = await findPatient(id);
      const [atendimentos, consultas, receitas, documentos, pagamentos] = await Promise.all([
        sql`SELECT e.*, pr.name AS professional_name FROM encounters e
            JOIN professionals pr ON pr.id = e.professional_id
            WHERE e.patient_id = ${id} ORDER BY e.date DESC, e.id DESC LIMIT 30`,
        sql`SELECT a.id, a.date, a.start_time, a.procedure, a.status, a.price_cents, a.notes, pr.name AS professional_name
            FROM appointments a JOIN professionals pr ON pr.id = a.professional_id
            WHERE a.patient_id = ${id} ORDER BY a.date DESC, a.start_time DESC LIMIT 30`,
        sql`SELECT id, encounter_id, issued_at, status, signed, created_at FROM memed_prescriptions
            WHERE patient_id = ${id} ORDER BY created_at DESC LIMIT 30`,
        sql`SELECT id, kind, title, issued_at, revoked_at FROM documents
            WHERE patient_id = ${id} ORDER BY created_at DESC LIMIT 30`,
        sql`SELECT id, description, amount_cents, method, status, due_date, paid_at FROM payments
            WHERE patient_id = ${id} ORDER BY due_date DESC LIMIT 30`,
      ]);
      return { paciente: patient, atendimentos, consultas, receitas, documentos, pagamentos };
    },
  },
  {
    name: "agenda",
    title: "Agenda",
    description: "Consultas marcadas entre duas datas (AAAA-MM-DD), com paciente e profissional.",
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        de: { type: "string", description: "Data inicial, AAAA-MM-DD" },
        ate: { type: "string", description: "Data final, AAAA-MM-DD (padrão: a inicial)" },
      },
      required: ["de"],
    },
    async run(args) {
      const from = date(args, "de");
      if (!from) throw new ToolError('Falta "de".');
      const to = date(args, "ate") ?? from;
      return sql`
        SELECT a.id, a.date, a.start_time, a.end_time, a.procedure, a.status, a.telemed_room,
          p.id AS patient_id, p.name AS patient_name, pr.name AS professional_name
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        JOIN professionals pr ON pr.id = a.professional_id
        WHERE a.date >= ${from} AND a.date <= ${to}
        ORDER BY a.date, a.start_time
        LIMIT 500`;
    },
  },
  {
    name: "listar_profissionais",
    title: "Profissionais",
    description: "Profissionais da clínica (o id é usado para registrar atendimentos).",
    readOnly: true,
    inputSchema: { type: "object", properties: {} },
    async run() {
      return sql`SELECT id, name, specialty FROM professionals ORDER BY name`;
    },
  },
  {
    name: "criar_paciente",
    title: "Criar paciente",
    description:
      "Cadastra um paciente. Recusa se já existir alguém com o mesmo CPF ou celular (devolve quem é); use mesmo_assim=true só se for outra pessoa.",
    inputSchema: {
      type: "object",
      properties: { ...patientProps, mesmo_assim: { type: "boolean", description: "Criar mesmo havendo CPF/celular igual" } },
      required: ["name"],
    },
    async run(args) {
      const values: Partial<Record<PatientField, string | null>> = {};
      for (const field of PATIENT_FIELDS) {
        const raw = text(args, field);
        if (raw !== null) values[field] = cleanPatientField(field, raw);
      }
      if (!values.name) throw new ToolError('Falta "name".');
      if (args.mesmo_assim !== true) {
        const duplicates = await possibleDuplicates(values.cpf ?? null, values.phone ?? null);
        if (duplicates.length) {
          throw new ToolError(`Já existe paciente com o mesmo CPF ou celular: ${JSON.stringify(duplicates)}. Atualize esse cadastro, ou repita com mesmo_assim=true se for outra pessoa.`);
        }
      }
      const v = (f: PatientField) => values[f] ?? null;
      const [created] = await sql<Patient>`
        INSERT INTO patients (name, social_name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city, notes, allergies, medications)
        VALUES (${v("name")}, ${v("social_name")}, ${v("cpf")}, ${v("birth_date")}, ${v("sex")}, ${v("phone")}, ${v("email")},
          ${v("insurance")}, ${v("insurance_number")}, ${v("city")}, ${v("notes")}, ${v("allergies")}, ${v("medications")})
        RETURNING *`;
      return { criado: created };
    },
  },
  {
    name: "atualizar_paciente",
    title: "Atualizar cadastro",
    description:
      'Muda só os campos enviados do cadastro de um paciente (texto vazio "" apaga o campo). Devolve o antes e o depois de cada campo alterado.',
    inputSchema: {
      type: "object",
      properties: { id: { type: "integer", description: "id do paciente" }, ...patientProps },
      required: ["id"],
    },
    async run(args) {
      const id = int(args, "id")!;
      const before = await findPatient(id);
      const changes: Partial<Record<PatientField, string | null>> = {};
      for (const field of PATIENT_FIELDS) {
        const raw = text(args, field);
        if (raw === null) continue;
        const value = cleanPatientField(field, raw);
        if ((before[field] ?? null) !== value) changes[field] = value;
      }
      if (!Object.keys(changes).length) return { id, alterado: {} };
      const after = await transaction(async (tx) => {
        const [row] = await tx`UPDATE patients SET ${tx(changes)} WHERE id = ${id} RETURNING *`;
        return row as unknown as Patient;
      });
      const alterado = Object.fromEntries(
        Object.keys(changes).map((f) => [f, { antes: before[f as PatientField] ?? null, agora: after[f as PatientField] ?? null }]),
      );
      return { id, alterado };
    },
  },
  {
    name: "registrar_atendimento",
    title: "Registrar atendimento",
    description:
      "Grava um atendimento (evolução) no prontuário: queixa, anamnese, exame, hipótese diagnóstica, conduta e prescrição em texto. Não emite receita assinada — isso continua sendo feito pelo médico no Renova.",
    inputSchema: {
      type: "object",
      properties: {
        patient_id: { type: "integer" },
        professional_id: { type: "integer", description: "Ver listar_profissionais" },
        date: { type: "string", description: "Data do atendimento, AAAA-MM-DD" },
        complaint: { type: "string", description: "Queixa principal" },
        anamnesis: { type: "string", description: "Anamnese / história" },
        exam: { type: "string", description: "Exame físico" },
        diagnosis: { type: "string", description: "Hipótese diagnóstica" },
        plan: { type: "string", description: "Conduta" },
        prescription: { type: "string", description: "Prescrição (texto)" },
      },
      required: ["patient_id", "professional_id", "date"],
    },
    async run(args) {
      const patientId = int(args, "patient_id")!;
      const professionalId = int(args, "professional_id")!;
      const when = date(args, "date");
      if (!when) throw new ToolError('Falta "date".');
      await findPatient(patientId);
      const [professional] = await sql`SELECT id FROM professionals WHERE id = ${professionalId}`;
      if (!professional) throw new ToolError(`Profissional ${professionalId} não existe.`);
      const fields = Object.fromEntries(ENCOUNTER_FIELDS.map((f) => [f, text(args, f) || null]));
      if (!Object.values(fields).some(Boolean)) throw new ToolError("O atendimento está vazio: mande ao menos a queixa ou a anamnese.");
      const [encounter] = await sql<Encounter>`
        INSERT INTO encounters (patient_id, professional_id, date, complaint, anamnesis, exam, diagnosis, plan, prescription)
        VALUES (${patientId}, ${professionalId}, ${when}, ${fields.complaint}, ${fields.anamnesis}, ${fields.exam},
          ${fields.diagnosis}, ${fields.plan}, ${fields.prescription})
        RETURNING *`;
      return { criado: encounter };
    },
  },
];
