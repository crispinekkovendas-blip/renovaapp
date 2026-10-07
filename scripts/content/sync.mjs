// O conteúdo privado do Renova (guias licenciados e o trabalho clínico da
// clínica) mora no Supabase, tabela private_files — nunca no GitHub, que é
// público. A lista está em files.json (os mesmos caminhos estão no .gitignore).
//
//   node scripts/content/sync.mjs pull     grava no disco o que mudou (roda antes de todo build)
//   node scripts/content/sync.mjs push     envia ao banco o que mudou no disco
//   node scripts/content/sync.mjs status   compara disco e banco, sem mexer
//
// Banco: CONTENT_DATABASE_URL, senão DATABASE_URL, senão o do .env.local. Sem
// banco, o pull aceita os arquivos que já estão no disco (máquina de quem edita).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = JSON.parse(readFileSync(join(ROOT, "scripts/content/files.json"), "utf8"));
const mode = process.argv[2] ?? "status";
if (!["pull", "push", "status"].includes(mode)) {
  console.error("uso: node scripts/content/sync.mjs pull|push|status");
  process.exit(1);
}

function databaseUrl() {
  const fromEnv = process.env.CONTENT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return null;
  const m = /^(?:CONTENT_DATABASE_URL|DATABASE_URL)=(.*)$/m.exec(readFileSync(file, "utf8"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const local = (path) => (existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), "utf8") : null);

const url = databaseUrl();
if (!url) {
  const missing = FILES.filter((p) => local(p) === null);
  if (mode === "pull" && !missing.length) {
    console.log("conteúdo privado: sem banco configurado; usando os arquivos do disco.");
    process.exit(0);
  }
  console.error(`conteúdo privado: defina CONTENT_DATABASE_URL (ou DATABASE_URL).${missing.length ? ` Faltam: ${missing.join(", ")}` : ""}`);
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", prepare: false, max: 1, connect_timeout: 15 });
try {
  const rows = await sql`SELECT path, content, sha256 FROM private_files WHERE path = ANY(${FILES})`;
  const remote = new Map(rows.map((r) => [r.path, r]));
  const changed = [];
  for (const path of FILES) {
    const disk = local(path);
    const db = remote.get(path);
    if (mode === "pull") {
      if (!db) {
        if (disk === null) throw new Error(`${path} não está no banco nem no disco`);
        console.warn(`aviso: ${path} ainda não está no banco (rode content:push)`);
        continue;
      }
      if (disk !== null && sha(disk) === db.sha256) continue;
      mkdirSync(dirname(join(ROOT, path)), { recursive: true });
      writeFileSync(join(ROOT, path), db.content);
      changed.push(path);
    } else if (mode === "push") {
      if (disk === null) throw new Error(`${path} não existe no disco`);
      const hash = sha(disk);
      if (db?.sha256 === hash) continue;
      await sql`INSERT INTO private_files (path, content, sha256, updated_at) VALUES (${path}, ${disk}, ${hash}, now())
        ON CONFLICT (path) DO UPDATE SET content = EXCLUDED.content, sha256 = EXCLUDED.sha256, updated_at = now()`;
      changed.push(path);
    } else {
      const state = !db ? "só no disco" : disk === null ? "só no banco" : sha(disk) === db.sha256 ? "igual" : "DIFERENTE";
      console.log(`${state.padEnd(12)} ${path}`);
    }
  }
  if (mode !== "status") console.log(`conteúdo privado (${mode}): ${changed.length ? changed.join(", ") : "nada mudou"}`);
} finally {
  await sql.end({ timeout: 5 });
}
