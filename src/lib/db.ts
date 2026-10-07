import postgres from "postgres";
import type { TransactionSql } from "postgres";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

/** Perfis de usuário; o CHECK de `users.role` é esta mesma lista. */
export const ROLES = ["admin", "recepcao", "profissional"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as ReadonlyArray<string>).includes(value);
}

/** Status de consulta; o CHECK de `appointments.status` é esta mesma lista. */
export const APPOINTMENT_STATUSES = [
  "agendado",
  "confirmado",
  "em_atendimento",
  "concluido",
  "faltou",
  "cancelado",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && (APPOINTMENT_STATUSES as ReadonlyArray<string>).includes(value);
}

export type PaymentStatus = "pendente" | "pago";

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  professional_id: number | null;
  active: number;
  created_at: string;
}

export interface Professional {
  id: number;
  name: string;
  specialty: string;
  council: string;
  color: string;
  active: number;
  cpf: string | null;
  board_code: string | null;
  board_number: string | null;
  board_state: string | null;
  birth_date: string | null;
  memed_external_id: string | null;
  /** Id de especialidade da Memed — exigido para credenciais de produção. */
  memed_specialty_id: string | null;
  /** Registro de Qualificação de Especialista — impresso ao lado do CRM (migração 2026-09-16). */
  rqe?: string | null;
  /** Assinatura digitalizada como data URL (PNG/JPEG), impressa na folha dos documentos. */
  signature_image?: string | null;
}

export interface MemedPrescription {
  id: number;
  encounter_id: number | null;
  patient_id: number;
  professional_id: number;
  memed_prescription_id: string;
  patient_link: string | null;
  pdf_url: string | null;
  /** Os 4 dígitos que o paciente digita para abrir a receita (migração 2026-09-17). */
  access_code: string | null;
  /** 1 quando a Memed confirma a assinatura digital daquele documento. */
  signed: number;
  /** Data que a Memed carimbou na receita; pode ser anterior à linha daqui. */
  issued_at: string | null;
  status: "emitida" | "excluida";
  created_at: string;
}

export interface Patient {
  id: number;
  name: string;
  cpf: string | null;
  birth_date: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  insurance: string | null;
  insurance_number: string | null;
  city: string | null;
  notes: string | null;
  allergies?: string | null;
  medications?: string | null;
  /** Nome social (migração 2026-09-16): aparece primeiro no prontuário e nos documentos. */
  social_name?: string | null;
  created_at: string;
  last_visit?: string | null;
}

export interface Appointment {
  id: number;
  patient_id: number;
  professional_id: number;
  date: string;
  start_time: string;
  end_time: string;
  procedure: string;
  status: AppointmentStatus;
  notes: string | null;
  price_cents: number;
  telemed_room: string | null;
  source: string;
  reminder_sent_at?: string | null;
  created_at: string;
  patient_name?: string;
  professional_name?: string;
  professional_color?: string;
  patient_phone?: string | null;
}

export interface Schedule {
  id: number;
  professional_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  professional_name?: string;
}

export interface WaitlistEntry {
  id: number;
  patient_id: number | null;
  name: string | null;
  phone: string | null;
  professional_id: number | null;
  notes: string | null;
  status: "aguardando" | "agendado" | "removido";
  created_at: string;
  patient_name?: string | null;
  professional_name?: string | null;
}

export interface ApiKey {
  id: number;
  label: string;
  key_hash: string;
  key_prefix: string;
  active: number;
  created_at: string;
}

export interface Encounter {
  id: number;
  patient_id: number;
  professional_id: number;
  appointment_id: number | null;
  date: string;
  complaint: string | null;
  anamnesis: string | null;
  exam: string | null;
  diagnosis: string | null;
  plan: string | null;
  prescription: string | null;
  return_days?: number | null;
  return_due?: string | null;
  return_reminded_at?: string | null;
  created_at: string;
  professional_name?: string;
  patient_name?: string;
}

export interface Payment {
  id: number;
  patient_id: number | null;
  appointment_id: number | null;
  description: string;
  amount_cents: number;
  method: string | null;
  status: PaymentStatus;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  patient_name?: string | null;
}

export interface Attachment {
  id: number;
  patient_id: number;
  encounter_id: number | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS professionals (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  specialty text NOT NULL DEFAULT '',
  council text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#2f6553',
  active integer NOT NULL DEFAULT 1,
  cpf text,
  board_code text,
  board_number text,
  board_state text,
  birth_date text,
  memed_external_id text,
  memed_specialty_id text,
  rqe text,
  signature_image text
);

CREATE TABLE IF NOT EXISTS users (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'recepcao' CHECK (role IN ('admin','recepcao','profissional')),
  professional_id bigint REFERENCES professionals(id),
  active integer NOT NULL DEFAULT 1,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS patients (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  cpf text,
  birth_date text,
  sex text,
  phone text,
  email text,
  insurance text,
  insurance_number text,
  city text,
  notes text,
  allergies text,
  medications text,
  social_name text,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS appointments (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  patient_id bigint NOT NULL REFERENCES patients(id),
  professional_id bigint NOT NULL REFERENCES professionals(id),
  date text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  procedure text NOT NULL DEFAULT 'Consulta',
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','confirmado','em_atendimento','concluido','faltou','cancelado')),
  notes text,
  price_cents integer NOT NULL DEFAULT 0,
  telemed_room text,
  source text NOT NULL DEFAULT 'interno',
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);

CREATE TABLE IF NOT EXISTS encounters (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  patient_id bigint NOT NULL REFERENCES patients(id),
  professional_id bigint NOT NULL REFERENCES professionals(id),
  appointment_id bigint REFERENCES appointments(id),
  date text NOT NULL,
  complaint text,
  anamnesis text,
  exam text,
  diagnosis text,
  plan text,
  prescription text,
  return_days integer,
  return_due text,
  return_reminded_at text,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);

CREATE TABLE IF NOT EXISTS payments (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  patient_id bigint REFERENCES patients(id),
  appointment_id bigint REFERENCES appointments(id),
  description text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  method text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago')),
  due_date text NOT NULL,
  paid_at text,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_payments_due ON payments(due_date);

CREATE TABLE IF NOT EXISTS schedules (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  professional_id bigint NOT NULL REFERENCES professionals(id),
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  slot_minutes integer NOT NULL DEFAULT 30
);
CREATE INDEX IF NOT EXISTS idx_schedules_prof ON schedules(professional_id);

CREATE TABLE IF NOT EXISTS waitlist (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  patient_id bigint REFERENCES patients(id),
  name text,
  phone text,
  professional_id bigint REFERENCES professionals(id),
  notes text,
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','agendado','removido')),
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS api_keys (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  label text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL DEFAULT '',
  active integer NOT NULL DEFAULT 1,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS memed_prescriptions (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  encounter_id bigint REFERENCES encounters(id),
  patient_id bigint NOT NULL REFERENCES patients(id),
  professional_id bigint NOT NULL REFERENCES professionals(id),
  memed_prescription_id text NOT NULL UNIQUE,
  patient_link text,
  pdf_url text,
  access_code text,
  signed smallint NOT NULL DEFAULT 0,
  issued_at text,
  status text NOT NULL DEFAULT 'emitida' CHECK (status IN ('emitida','excluida')),
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_memed_presc_patient ON memed_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_memed_presc_encounter ON memed_prescriptions(encounter_id);

CREATE TABLE IF NOT EXISTS booking_attempts (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  ip text NOT NULL,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_ip_time ON booking_attempts (ip, created_at);

CREATE TABLE IF NOT EXISTS attachments (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  patient_id bigint NOT NULL REFERENCES patients(id),
  encounter_id bigint REFERENCES encounters(id),
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  data bytea NOT NULL,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_attachments_patient ON attachments (patient_id);

CREATE TABLE IF NOT EXISTS hub_submissions (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  patient_id bigint NOT NULL REFERENCES patients(id),
  appointment_id bigint REFERENCES appointments(id),
  kind text NOT NULL CHECK (kind IN ('remarcacao','avaliacao','pre_consulta','renovacao')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  message text,
  answers text,
  publish integer NOT NULL DEFAULT 0,
  handled_at text,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_hub_submissions_patient ON hub_submissions (patient_id);
CREATE INDEX IF NOT EXISTS idx_hub_submissions_kind ON hub_submissions (kind, created_at);
CREATE INDEX IF NOT EXISTS idx_hub_submissions_appt ON hub_submissions (appointment_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  patient_id bigint NOT NULL REFERENCES patients(id),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  disabled integer NOT NULL DEFAULT 0,
  last_success_at text,
  last_error text,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_patient ON push_subscriptions (patient_id);

CREATE TABLE IF NOT EXISTS documents (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  patient_id bigint NOT NULL REFERENCES patients(id),
  professional_id bigint NOT NULL REFERENCES professionals(id),
  encounter_id bigint REFERENCES encounters(id),
  kind text NOT NULL CHECK (kind IN ('atestado','encaminhamento','laudo','orientacoes')),
  subkind text,
  title text NOT NULL,
  body text NOT NULL,
  fields text,
  code text NOT NULL UNIQUE,
  issued_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD'),
  shared_with_patient integer NOT NULL DEFAULT 1,
  revoked_at text,
  revoke_reason text,
  batch_id text,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON documents (patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_encounter ON documents (encounter_id);

CREATE TABLE IF NOT EXISTS document_templates (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  professional_id bigint REFERENCES professionals(id),
  kind text NOT NULL CHECK (kind IN ('atestado','encaminhamento','laudo','orientacoes','protocolo')),
  subkind text,
  name text NOT NULL,
  title text,
  body text NOT NULL,
  fields text,
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
CREATE INDEX IF NOT EXISTS idx_document_templates_prof ON document_templates (professional_id, kind);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at text;
`;

function localISO(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { __renovaSql?: Sql; __renovaReady?: Promise<void> };

function getClient(): Sql {
  if (!globalForDb.__renovaSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada.");
    // max alto o bastante para nunca enfileirar: a fila interna do postgres.js
    // trava contra o pooler do Supabase (transaction mode) — queries enfileiradas
    // nunca são despachadas. Páginas fazem ≤6 queries em paralelo.
    globalForDb.__renovaSql = postgres(url, {
      ssl: "require",
      prepare: false,
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
      // int8 (bigint) vem como string por padrão — os ids do app são numbers.
      types: {
        bigint: {
          to: 20,
          from: [20],
          serialize: (value: unknown) => String(value),
          parse: (value: string) => Number(value),
        },
      },
    });
  }
  return globalForDb.__renovaSql;
}

async function seed(client: Sql): Promise<void> {
  const [{ n }] = await client`SELECT COUNT(*)::int AS n FROM users`;
  if (n > 0) return;

  // Senha inicial aleatória, impressa uma vez no log do servidor: instalação
  // nova não nasce com credencial pública. Troque em /conta no primeiro login.
  const initialPassword = crypto.randomBytes(9).toString("base64url");
  console.log(`[renova] senha inicial de admin@renova.app: ${initialPassword}`);
  const hash = bcrypt.hashSync(initialPassword, 10);

  const [marina] = await client`
    INSERT INTO professionals (name, specialty, council, color)
    VALUES ('Dra. Marina Costa', 'Clínica Geral', 'CRM 123456-SP', '#2f6553') RETURNING id`;
  const [rafael] = await client`
    INSERT INTO professionals (name, specialty, council, color)
    VALUES ('Dr. Rafael Lima', 'Cardiologia', 'CRM 654321-SP', '#ad5622') RETURNING id`;

  await client`INSERT INTO users (name, email, password_hash, role, professional_id) VALUES
    ('Administrador', 'admin@renova.app', ${hash}, 'admin', NULL),
    ('Dra. Marina Costa', 'marina@renova.app', ${hash}, 'profissional', ${marina.id}),
    ('Recepção', 'recepcao@renova.app', ${hash}, 'recepcao', NULL)`;

  const patients = await client`INSERT INTO patients (name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city, notes) VALUES
    ('Ana Beatriz Souza', '412.658.790-01', '1988-03-14', 'F', '(11) 98811-2233', 'ana.souza@gmail.com', 'Unimed', '0 021 445566778899', 'São Paulo', NULL),
    ('Carlos Eduardo Ferreira', '308.114.652-40', '1975-11-02', 'M', '(11) 97744-5511', 'cadu.ferreira@hotmail.com', 'Particular', NULL, 'São Paulo', 'Hipertenso, em acompanhamento.'),
    ('Juliana Prado Martins', '275.902.318-77', '1992-07-25', 'F', '(11) 96655-8090', 'ju.prado@gmail.com', 'Bradesco Saúde', '778 001 2345', 'Guarulhos', NULL),
    ('Marcos Vinícius Rocha', '190.443.287-12', '1961-01-30', 'M', '(11) 95522-7788', NULL, 'Particular', NULL, 'Osasco', 'Diabetes tipo 2.'),
    ('Tereza Almeida Nunes', '088.612.905-53', '1954-09-08', 'F', '(11) 94411-3322', NULL, 'SulAmérica', '55 8899 0011', 'São Paulo', NULL),
    ('Felipe Ogawa Tanaka', '352.740.169-28', '2001-05-17', 'M', '(11) 93300-4455', 'felipe.tanaka@outlook.com', 'Particular', NULL, 'São Paulo', NULL)
    RETURNING id`;
  const [p1, p2, p3, p4, p5, p6] = patients.map((row) => row.id as number);

  const today = localISO(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yest = localISO(yesterdayDate);

  await client`INSERT INTO appointments (patient_id, professional_id, date, start_time, end_time, procedure, status, price_cents, notes) VALUES
    (${p1}, ${marina.id}, ${today}, '08:00', '08:30', 'Consulta', 'confirmado', 25000, NULL),
    (${p2}, ${rafael.id}, ${today}, '09:00', '09:30', 'Retorno', 'agendado', 0, 'Trazer exames de sangue.'),
    (${p3}, ${marina.id}, ${today}, '10:00', '10:45', 'Primeira consulta', 'agendado', 30000, NULL),
    (${p4}, ${rafael.id}, ${today}, '14:00', '14:30', 'Consulta', 'confirmado', 28000, NULL),
    (${p5}, ${marina.id}, ${today}, '15:30', '16:00', 'Retorno', 'agendado', 0, NULL)`;

  const [done] = await client`INSERT INTO appointments (patient_id, professional_id, date, start_time, end_time, procedure, status, price_cents)
    VALUES (${p6}, ${marina.id}, ${yest}, '11:00', '11:30', 'Consulta', 'concluido', 25000) RETURNING id`;

  await client`INSERT INTO encounters (patient_id, professional_id, appointment_id, date, complaint, anamnesis, exam, diagnosis, plan, prescription)
    VALUES (${p6}, ${marina.id}, ${done.id}, ${yest},
      'Dor de garganta há 3 dias',
      'Paciente refere odinofagia, febre baixa (37,8 °C) e mal-estar. Nega tosse ou dispneia.',
      'Oroscopia: hiperemia de orofaringe com exsudato amigdaliano bilateral. Ausculta pulmonar limpa.',
      'Amigdalite bacteriana (J03.9)',
      'Antibioticoterapia por 7 dias, repouso e hidratação. Retorno se não houver melhora em 72h.',
      ${"Amoxicilina 500 mg — 1 cápsula de 8/8h por 7 dias\nDipirona 500 mg — 1 comprimido de 6/6h se dor ou febre"})`;

  await client`INSERT INTO payments (patient_id, appointment_id, description, amount_cents, method, status, due_date, paid_at)
    VALUES (${p6}, ${done.id}, 'Consulta — Felipe Ogawa Tanaka', 25000, 'pix', 'pago', ${yest}, ${yest})`;

  await client`INSERT INTO payments (patient_id, description, amount_cents, status, due_date)
    VALUES (${p2}, 'Eletrocardiograma — Carlos Eduardo Ferreira', 12000, 'pendente', ${today})`;
}

async function init(): Promise<void> {
  const client = getClient();
  // Em produção o schema já foi criado via migração e o papel do app não tem
  // privilégio de DDL — só roda o SCHEMA quando as tabelas ainda não existem.
  const [{ missing }] = await client`SELECT to_regclass('public.users') IS NULL AS missing`;
  if (missing) await client.unsafe(SCHEMA);
  await seed(client);
}

function ensureReady(): Promise<void> {
  if (!globalForDb.__renovaReady) {
    globalForDb.__renovaReady = init().catch((error) => {
      globalForDb.__renovaReady = undefined;
      throw error;
    });
  }
  return globalForDb.__renovaReady;
}

/** Tagged template para consultas: `await sql<T>\`SELECT …\`` — garante schema/seed antes da primeira query. */
export async function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  await ensureReady();
  const client = getClient();
  return client(strings, ...(values as never[])) as unknown as Promise<T[]>;
}

/** O `sql` de dentro de uma transação (`transaction`): mesma tagged template, mas na conexão reservada. */
export type Tx = TransactionSql<Record<string, unknown>>;

/**
 * Transação: `await transaction(async (tx) => { await tx\`INSERT …\`; })`.
 * Tudo dentro do callback roda numa conexão só, entre BEGIN e COMMIT; um
 * erro desfaz tudo e é relançado. Use `tx` (não `sql`) lá dentro.
 */
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  await ensureReady();
  return (await getClient().begin(fn)) as T;
}
