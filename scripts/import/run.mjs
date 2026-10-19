// Importação em lote de pacientes (e atendimentos antigos) de outro sistema.
// Os arquivos com dados de pacientes ficam FORA do repositório (que é público):
// por padrão em C:\Users\admin\renova-import\.
//
//   node scripts/import/run.mjs check <normalizado.json>          só lê: confere, acha duplicados, grava <arquivo>.relatorio.json
//   node scripts/import/run.mjs apply <normalizado.json> --yes    grava tudo numa transação só (lote marcado em import_batch)
//   node scripts/import/run.mjs undo <lote> [<arquivo>.aplicado.json] --yes
//                                                                  apaga o que o lote criou; com o log, limpa também
//                                                                  os campos que ele preencheu em pacientes que já existiam
//
// Banco: DATABASE_URL, senão o do .env.local. Precisa da migração 2026-10-19-importacao.sql.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { ENCOUNTER_FIELDS, PATIENT_FIELDS, cleanPatient, findDuplicates } from "./normalize.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [mode, target] = process.argv.slice(2);
const confirmed = process.argv.includes("--yes");

function usage(message) {
  if (message) console.error(message);
  console.error("uso: node scripts/import/run.mjs check|apply <normalizado.json> [--yes]  |  undo <lote> [<aplicado.json>] --yes");
  process.exit(1);
}
if (!["check", "apply", "undo"].includes(mode) || !target) usage();

function databaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const file = join(ROOT, ".env.local");
  const m = existsSync(file) && /^DATABASE_URL=(.*)$/m.exec(readFileSync(file, "utf8"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const url = databaseUrl();
if (!url) usage("Defina DATABASE_URL (ou .env.local).");
const sql = postgres(url, { ssl: "require", prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} });
const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

async function requireMigration() {
  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_name IN ('patients', 'encounters') AND column_name = 'import_batch'`;
  if (n < 2) throw new Error("Falta rodar migrations/2026-10-19-importacao.sql no Supabase.");
}

/** Lê o arquivo normalizado, limpa cada paciente e cruza com quem já está no banco. */
async function analyse(path) {
  const file = JSON.parse(readFileSync(path, "utf8"));
  if (!file.batch || !/^[a-z0-9-]{3,60}$/.test(file.batch)) throw new Error('"batch" precisa ser um rótulo simples (ex.: dr-fulano-2026-10).');
  if (!Number.isInteger(file.professional_id)) throw new Error('"professional_id" (quem atendeu os atendimentos antigos) é obrigatório.');
  const [professional] = await sql`SELECT id, name FROM professionals WHERE id = ${file.professional_id}`;
  if (!professional) throw new Error(`Profissional ${file.professional_id} não existe.`);

  const rows = (file.patients ?? []).map((raw) => ({ ...cleanPatient(raw, today), skip: raw.skip === true, novo: raw.novo === true }));
  const existing = await sql`SELECT id, name, cpf, phone, birth_date FROM patients`;
  const duplicates = findDuplicates(rows, existing);
  const blocking = [];
  rows.forEach((row, i) => {
    row.duplicates = duplicates[i];
    if (row.skip) return;
    if (!row.patient.name && !row.existing_id) blocking.push(`#${i + 1}: sem nome`);
    if (row.duplicates.sameFile.length) blocking.push(`#${i + 1} (${row.ref ?? "sem ref"}): repetido no arquivo com #${row.duplicates.sameFile.map((j) => j + 1).join(", #")} — junte ou marque skip`);
    if (row.duplicates.renova.length && !row.existing_id && !row.novo) {
      blocking.push(`#${i + 1} (${row.ref ?? "sem ref"}): parece o paciente ${row.duplicates.renova.join(", ")} do Renova — use existing_id, ou novo: true`);
    }
  });
  return { file, professional, rows, blocking };
}

async function check(path) {
  const { file, professional, rows, blocking } = await analyse(path);
  const active = rows.filter((r) => !r.skip);
  const report = {
    lote: file.batch,
    profissional: professional.name,
    pacientes: active.length,
    novos: active.filter((r) => !r.existing_id).length,
    juntar_com_existentes: active.filter((r) => r.existing_id).length,
    ignorados: rows.length - active.length,
    atendimentos: active.reduce((n, r) => n + r.encounters.length, 0),
    impedem_importar: blocking,
    avisos: rows.flatMap((r, i) => r.problems.map((p) => `#${i + 1} (${r.ref ?? "sem ref"}): ${p}`)),
  };
  const out = `${path.replace(/\.json$/, "")}.relatorio.json`;
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`Lote ${report.lote} · ${report.pacientes} pacientes (${report.novos} novos, ${report.juntar_com_existentes} já existentes) · ${report.atendimentos} atendimentos`);
  console.log(`${blocking.length} pendência(s) que impedem importar · ${report.avisos.length} aviso(s)`);
  console.log(`Relatório: ${out}`);
  return { file, rows, blocking };
}

async function apply(path) {
  await requireMigration();
  const { file, rows, blocking } = await check(path);
  if (blocking.length) throw new Error("Há pendências no relatório; nada foi gravado.");
  const [{ n: already }] = await sql`SELECT count(*)::int AS n FROM patients WHERE import_batch = ${file.batch}`;
  const [{ n: alreadyEnc }] = await sql`SELECT count(*)::int AS n FROM encounters WHERE import_batch = ${file.batch}`;
  if (already || alreadyEnc) throw new Error(`O lote ${file.batch} já foi importado (${already} pacientes). Desfaça com undo antes de repetir.`);
  if (!confirmed) {
    console.log("Conferido. Para gravar no banco, repita com --yes.");
    return;
  }

  const log = { lote: file.batch, criados: [], preenchidos: [], atendimentos: 0 };
  await sql.begin(async (tx) => {
    for (const row of rows.filter((r) => !r.skip)) {
      let patientId = row.existing_id;
      if (patientId) {
        const [current] = await tx`SELECT * FROM patients WHERE id = ${patientId}`;
        if (!current) throw new Error(`existing_id ${patientId} não existe.`);
        // Já existe: só preenche o que está vazio; nunca sobrescreve o que a clínica já escreveu.
        const fill = Object.fromEntries(
          PATIENT_FIELDS.filter((f) => row.patient[f] && !current[f]?.trim?.()).map((f) => [f, row.patient[f]]),
        );
        if (Object.keys(fill).length) {
          await tx`UPDATE patients SET ${tx(fill)} WHERE id = ${patientId}`;
          log.preenchidos.push({ id: patientId, campos: fill });
        }
      } else {
        const values = { ...row.patient, import_batch: file.batch, import_ref: row.ref };
        const [created] = await tx`INSERT INTO patients ${tx(values)} RETURNING id`;
        patientId = created.id;
        log.criados.push(patientId);
      }
      for (const e of row.encounters) {
        const values = {
          patient_id: patientId,
          professional_id: file.professional_id,
          date: e.date,
          import_batch: file.batch,
          ...Object.fromEntries(ENCOUNTER_FIELDS.map((f) => [f, e[f] ?? null])),
        };
        await tx`INSERT INTO encounters ${tx(values)}`;
        log.atendimentos++;
      }
    }
  });
  const out = `${path.replace(/\.json$/, "")}.aplicado.json`;
  writeFileSync(out, JSON.stringify(log, null, 2));
  console.log(`Gravado: ${log.criados.length} pacientes novos, ${log.preenchidos.length} completados, ${log.atendimentos} atendimentos. Log: ${out}`);
}

async function undo(batch, logPath) {
  await requireMigration();
  const [{ p }] = await sql`SELECT count(*)::int AS p FROM patients WHERE import_batch = ${batch}`;
  const [{ e }] = await sql`SELECT count(*)::int AS e FROM encounters WHERE import_batch = ${batch}`;
  const log = logPath && existsSync(logPath) ? JSON.parse(readFileSync(logPath, "utf8")) : null;
  console.log(`Lote ${batch}: ${p} pacientes criados, ${e} atendimentos${log ? `, ${log.preenchidos.length} cadastros completados` : ""}.`);
  if (!confirmed) {
    console.log("Para desfazer, repita com --yes.");
    return;
  }
  let kept = 0;
  await sql.begin(async (tx) => {
    await tx`DELETE FROM encounters WHERE import_batch = ${batch}`;
    const created = await tx`SELECT id FROM patients WHERE import_batch = ${batch}`;
    for (const { id } of created) {
      // Paciente que já ganhou consulta, pagamento, documento… depois da importação fica.
      try {
        await tx.savepoint((sp) => sp`DELETE FROM patients WHERE id = ${id}`);
      } catch {
        kept++;
      }
    }
    for (const { id, campos } of log?.preenchidos ?? []) {
      const [current] = await tx`SELECT * FROM patients WHERE id = ${id}`;
      if (!current) continue;
      const reset = Object.fromEntries(Object.entries(campos).filter(([f, v]) => current[f] === v).map(([f]) => [f, null]));
      if (Object.keys(reset).length) await tx`UPDATE patients SET ${tx(reset)} WHERE id = ${id}`;
    }
  });
  console.log(`Desfeito.${kept ? ` ${kept} paciente(s) mantidos: já têm consulta, pagamento ou documento feitos depois da importação.` : ""}`);
}

try {
  if (mode === "check") await check(resolve(target));
  else if (mode === "apply") await apply(resolve(target));
  else await undo(target, process.argv[4] && !process.argv[4].startsWith("--") ? resolve(process.argv[4]) : null);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
