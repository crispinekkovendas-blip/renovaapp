"use server";

import { revalidatePath } from "next/cache";
import { sql } from "./db";
import type { Patient, Professional } from "./db";
import { requireSession } from "./auth";
import { memedConfig, getOrCreatePrescriberToken, getPrescriptionLinks, listPrescriptions } from "./memed/client";
import type { PrescriptionLinks } from "./memed/client";
import { missingMemedFields } from "./memed/prescriber";
import { toMemedPatient, missingMemedPatientFields, type MemedPatient } from "./memed/patient";
import { matchPatientId } from "./memed/prescription";
import { patientFirstName } from "./documents";
import { str } from "./form-fields.ts";
import { isMissingColumn } from "./pg-errors.ts";

/** Quantas receitas a reconciliação resolve por clique (2 chamadas à Memed cada). */
const MAX_SYNC_PER_RUN = 25;

/** Dados do local de atendimento — `cnes` e `local_name` são obrigatórios para parceiros novos. */
export interface MemedWorkplace {
  local_name: string;
  cnes: string;
  address?: string;
  city?: string;
  phone?: string;
}

export type StartPrescriptionResult =
  | {
      token: string;
      scriptUrl: string;
      professionalId: number;
      patient: MemedPatient;
      workplace: MemedWorkplace | null;
      additionalData: { header: Record<string, string>[]; footer?: string };
      featureToggle: Record<string, boolean>;
    }
  | { error: string };

/** Só as chaves da clínica que a Memed recebe (local de atendimento e rodapé). */
async function clinicSettings(): Promise<Record<string, string>> {
  const rows = await sql<{ key: string; value: string }>`
    SELECT key, value FROM settings
    WHERE key IN ('clinic_name', 'clinic_cnes', 'clinic_address', 'clinic_phone')`;
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/** O prescritor da sessão, inteiro: a Memed precisa de CPF, conselho, UF, nascimento e especialidade. */
async function sessionProfessional(professionalId: number): Promise<Professional | undefined> {
  const [professional] = await sql<Professional>`SELECT * FROM professionals WHERE id = ${professionalId}`;
  return professional;
}

/**
 * Só o próprio prescritor prescreve. A receita é assinada por uma pessoa com
 * registro no conselho, então admin NÃO pode prescrever em nome de ninguém —
 * é o único lugar do app onde admin não passa.
 *
 * Tudo que o cliente precisa sai daqui pronto: token, paciente, local de
 * atendimento, cabeçalho e feature toggles. O `secret-key` nunca sai do
 * servidor.
 */
export async function startPrescriptionAction(formData: FormData): Promise<StartPrescriptionResult> {
  const session = await requireSession();
  const config = memedConfig();
  if (!config) return { error: "Prescrição digital não está configurada nesta instalação." };
  if (!session.professionalId) {
    return { error: "Apenas o profissional com registro no conselho pode prescrever." };
  }

  const patientId = Number(str(formData, "patient_id"));
  if (!patientId) return { error: "Paciente inválido." };

  // As quatro leituras são independentes; as checagens vêm depois, na mesma ordem de sempre.
  const [professional, patients, accounts, settings] = await Promise.all([
    sessionProfessional(session.professionalId),
    // SELECT *: `toMemedPatient` usa quase todo o cadastro, e `social_name` pode ainda não existir.
    sql<Patient>`SELECT * FROM patients WHERE id = ${patientId}`,
    // O e-mail do prescritor vem da conta vinculada — `professionals` não tem
    // coluna de e-mail, e todo profissional que prescreve tem usuário no app.
    sql<{ email: string }>`
      SELECT email FROM users WHERE professional_id = ${session.professionalId} AND active = 1 ORDER BY id LIMIT 1`,
    clinicSettings(),
  ]);
  if (!professional) return { error: "Profissional não encontrado." };

  const missing = missingMemedFields(professional);
  if (missing.length > 0) {
    return { error: `Complete em Configurações → Profissionais: ${missing.join(", ")}.` };
  }

  const [patient] = patients;
  if (!patient) return { error: "Paciente não encontrado." };

  // A Memed exige sexo e recusa o lote sem ele; melhor dizer qual campo falta
  // do que deixar o módulo abrir e falhar por dentro.
  const missingPatient = missingMemedPatientFields(patient);
  if (missingPatient.includes("sexo")) {
    return { error: `Complete a ficha de ${patientFirstName(patient)}: sexo é obrigatório na Memed.` };
  }

  const [account] = accounts;
  const workplace: MemedWorkplace | null = settings.clinic_cnes
    ? {
        local_name: settings.clinic_name || "Clínica",
        cnes: settings.clinic_cnes,
        address: settings.clinic_address || undefined,
        phone: settings.clinic_phone || undefined,
      }
    : null;

  const header: Record<string, string>[] = [];
  if (patient.insurance) header.push({ Convênio: patient.insurance });
  if (patient.insurance_number) header.push({ Carteirinha: patient.insurance_number });

  try {
    const token = await getOrCreatePrescriberToken(
      professional,
      {},
      { email: account?.email ?? null, especialidade: Number(professional.memed_specialty_id) || null }
    );
    return {
      token,
      scriptUrl: config.scriptUrl,
      professionalId: professional.id,
      patient: toMemedPatient(patient),
      workplace,
      additionalData: {
        header,
        footer: settings.clinic_name
          ? `${settings.clinic_name}${settings.clinic_phone ? ` · ${settings.clinic_phone}` : ""}`
          : undefined,
      },
      // A doc recomenda desligar o histórico da Memed em sistema integrado: o
      // histórico do paciente é o prontuário do Renova.
      featureToggle: { historyPrescription: false },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao falar com a Memed." };
  }
}

/**
 * Grava uma receita. As colunas `access_code`, `signed` e `issued_at` chegaram
 * na migração 2026-09-17 — sem ela, o INSERT completo falha com 42703 e a
 * receita entra do jeito antigo. Perder o código de acesso é ruim; perder a
 * receita inteira seria pior.
 */
async function insertPrescription(row: {
  encounterId: number | null;
  patientId: number;
  professionalId: number;
  prescriptionId: string;
  links: PrescriptionLinks;
  issuedAt: string | null;
}): Promise<void> {
  const { encounterId, patientId, professionalId, prescriptionId, links, issuedAt } = row;
  try {
    await sql`
      INSERT INTO memed_prescriptions
        (encounter_id, patient_id, professional_id, memed_prescription_id,
         patient_link, pdf_url, access_code, signed, issued_at)
      VALUES (${encounterId}, ${patientId}, ${professionalId}, ${prescriptionId},
              ${links.patientLink}, ${links.pdfUrl}, ${links.accessCode},
              ${links.signed ? 1 : 0}, ${issuedAt})
      ON CONFLICT (memed_prescription_id) DO NOTHING`;
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    await sql`
      INSERT INTO memed_prescriptions
        (encounter_id, patient_id, professional_id, memed_prescription_id, patient_link, pdf_url)
      VALUES (${encounterId}, ${patientId}, ${professionalId}, ${prescriptionId},
              ${links.patientLink}, ${links.pdfUrl})
      ON CONFLICT (memed_prescription_id) DO NOTHING`;
  }
}

/** Preenche links que ficaram para trás — inclusive os de antes de 2026-09-17. */
async function updatePrescriptionLinks(prescriptionId: string, links: PrescriptionLinks): Promise<void> {
  try {
    await sql`
      UPDATE memed_prescriptions
      SET patient_link = ${links.patientLink}, pdf_url = ${links.pdfUrl},
          access_code = ${links.accessCode}, signed = ${links.signed ? 1 : 0}
      WHERE memed_prescription_id = ${prescriptionId}`;
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    await sql`
      UPDATE memed_prescriptions
      SET patient_link = ${links.patientLink}, pdf_url = ${links.pdfUrl}
      WHERE memed_prescription_id = ${prescriptionId}`;
  }
}

/**
 * Chamada no evento `prescricaoImpressa`. Idempotente por
 * `memed_prescription_id`, porque o evento pode disparar mais de uma vez.
 */
export async function recordPrescriptionAction(formData: FormData): Promise<string | null> {
  const session = await requireSession();
  if (!session.professionalId) return "Sessão sem profissional vinculado.";

  const prescriptionId = str(formData, "memed_prescription_id");
  const patientId = Number(str(formData, "patient_id"));
  const encounterId = Number(str(formData, "encounter_id")) || null;
  if (!prescriptionId || !patientId) return "Dados incompletos da receita.";

  const [existing, professional] = await Promise.all([
    sql`SELECT id FROM memed_prescriptions WHERE memed_prescription_id = ${prescriptionId}`.then(([row]) => row),
    sessionProfessional(session.professionalId),
  ]);
  if (existing) return null;
  if (!professional) return "Profissional não encontrado.";

  // Os links são bônus: se a Memed não responder, gravamos a receita mesmo
  // assim. Perder o vínculo é pior que ficar sem o PDF por enquanto.
  let links: PrescriptionLinks = { pdfUrl: null, patientLink: null, accessCode: null, signed: false };
  try {
    const token = await getOrCreatePrescriberToken(professional);
    links = await getPrescriptionLinks(prescriptionId, token);
  } catch {
    // Segue com os links nulos; a sincronização manual preenche depois.
  }

  await insertPrescription({
    encounterId,
    patientId,
    professionalId: professional.id,
    prescriptionId,
    links,
    issuedAt: null,
  });

  revalidatePath("/", "layout");
  return null;
}

/**
 * Chamada no evento `prescricaoExcluida`, que entrega só o id. Marca em vez de
 * apagar: a linha é o registro de que a receita existiu. A Memed exige tratar
 * este evento para liberar credenciais de produção, justamente para o sistema
 * não continuar oferecendo o link de uma receita que ela já invalidou.
 */
export async function markPrescriptionDeletedAction(formData: FormData): Promise<string | null> {
  const session = await requireSession();
  // O evento só dispara no módulo do próprio prescritor; ninguém mais marca
  // a receita de outro — nem o admin, que também não prescreve.
  if (!session.professionalId) return "Sessão sem profissional vinculado.";
  const prescriptionId = str(formData, "memed_prescription_id");
  if (!prescriptionId) return "Receita inválida.";

  await sql`
    UPDATE memed_prescriptions
    SET status = 'excluida', patient_link = NULL, pdf_url = NULL
    WHERE memed_prescription_id = ${prescriptionId} AND professional_id = ${session.professionalId}`;
  revalidatePath("/", "layout");
  return null;
}

/**
 * Reconciliação manual. Sem webhook, uma receita assinada com a aba fechada em
 * seguida existe na Memed e não existe aqui — este botão busca o histórico do
 * prescritor e grava o que faltou. A Memed é a fonte da verdade.
 *
 * Faz duas coisas, porque as duas dependem da mesma ida à Memed: traz o que
 * falta **e** completa o que veio sem link (toda receita gravada antes de
 * 2026-09-17 ficou assim — ver `getPrescriptionLinks`).
 */
export async function syncPrescriptionsAction(formData: FormData): Promise<string> {
  const session = await requireSession();
  if (!session.professionalId) return "Sessão sem profissional vinculado.";
  if (!memedConfig()) return "Prescrição digital não está configurada.";

  const patientId = Number(str(formData, "patient_id"));
  if (!patientId) return "Paciente inválido.";

  const professional = await sessionProfessional(session.professionalId);
  if (!professional) return "Profissional não encontrado.";
  if (missingMemedFields(professional).length > 0) return "Cadastro do prescritor incompleto.";

  try {
    const token = await getOrCreatePrescriberToken(professional);
    const remote = await listPrescriptions(token);
    if (remote.length === 0) return "Nenhuma receita encontrada na Memed.";

    const [known, withCpf] = await Promise.all([
      // Só as receitas que a Memed devolveu, não a tabela inteira.
      sql<{ memed_prescription_id: string; patient_link: string | null }>`
        SELECT memed_prescription_id, patient_link FROM memed_prescriptions
        WHERE memed_prescription_id = ANY(${remote.map((row) => row.id)}::text[])`,
      // A Memed manda o paciente dentro de cada receita: pelo id externo que nós
      // enviamos no `setPaciente`, ou pelo CPF quando a receita foi emitida fora
      // do Renova. Só cai no paciente aberto quem não dá para identificar.
      sql<{ id: number; cpf: string }>`SELECT id, cpf FROM patients WHERE cpf IS NOT NULL AND cpf <> ''`,
    ]);
    const seen = new Map(known.map((row) => [row.memed_prescription_id, row]));
    const byCpf = new Map(withCpf.map((row) => [row.cpf.replace(/\D/g, ""), row.id]));

    let added = 0;
    let filled = 0;
    let left = MAX_SYNC_PER_RUN;
    for (const row of remote) {
      const existing = seen.get(row.id);
      // Já registrada e já com link: nada a fazer, e nada de gastar uma ida à Memed.
      if (existing?.patient_link) continue;
      // Cada receita custa duas chamadas à Memed. Um prescritor com histórico
      // longo estouraria o tempo da função — então o botão trabalha por lotes,
      // e quem clicar de novo continua de onde parou.
      if (left === 0) break;
      left -= 1;

      const links = await getPrescriptionLinks(row.id, token);
      if (existing) {
        await updatePrescriptionLinks(row.id, links);
        filled += 1;
        continue;
      }

      await insertPrescription({
        encounterId: null,
        patientId: matchPatientId(row, byCpf) ?? patientId,
        professionalId: professional.id,
        prescriptionId: row.id,
        links,
        issuedAt: row.createdAt,
      });
      added += 1;
    }

    if (added === 0 && filled === 0) return "Tudo já estava registrado.";
    revalidatePath("/", "layout");

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} receita(s) trazida(s) da Memed`);
    if (filled > 0) parts.push(`${filled} com o link recuperado`);
    const more = left === 0 ? " Ainda há mais — clique de novo para continuar." : "";
    return `${parts.join(" e ")}.${more}`;
  } catch (error) {
    return error instanceof Error ? error.message : "Falha ao sincronizar com a Memed.";
  }
}
