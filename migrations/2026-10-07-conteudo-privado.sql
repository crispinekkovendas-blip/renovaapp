-- Renova — 2026-10-07 — conteúdo privado fora do GitHub
-- Run via Supabase SQL editor. The app role has no DDL privilege.
-- Every statement is idempotent; running it twice is harmless.
--
-- O código do Renova vai para um repositório público; o conteúdo não:
-- os guias licenciados (Plantão e emergência, Drive de Prescrições — reproduzidos
-- com autorização dos autores só no app) e o trabalho da clínica (receitas
-- prontas, posologias, histórico das revisões, vocabulário de queixas).
-- Cada arquivo fica aqui inteiro, por caminho; `npm run content:pull` grava no
-- disco antes de cada build (Vercel, GitHub Actions) e `npm run content:push`
-- envia o que mudou. Lista dos arquivos: scripts/content/files.json.

CREATE TABLE IF NOT EXISTS private_files (
  path text PRIMARY KEY,
  content text NOT NULL,
  sha256 text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON private_files TO renova_app;
ALTER TABLE private_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS renova_app_all ON private_files;
CREATE POLICY renova_app_all ON private_files FOR ALL TO renova_app USING (true) WITH CHECK (true);
