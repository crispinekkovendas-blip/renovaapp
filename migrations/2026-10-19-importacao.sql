-- Renova — 2026-10-19 — importação em lote de pacientes de outro sistema
-- Run via Supabase SQL editor. The app role has no DDL privilege.
-- Every statement is idempotent; running it twice is harmless.
--
-- Os ~1200 pacientes de um médico vêm de outro sistema (export + Memed). Cada
-- linha criada pela importação leva o rótulo do lote (`import_batch`), para
-- conferir no prontuário de onde veio e para desfazer um lote inteiro
-- (scripts/import/run.mjs undo <lote>) se algo sair errado.
-- `import_ref` é o id do paciente no sistema de origem: rodar o mesmo lote de
-- novo não duplica ninguém.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS import_batch text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS import_ref text;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS import_batch text;

CREATE INDEX IF NOT EXISTS idx_patients_import ON patients (import_batch) WHERE import_batch IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_import_ref ON patients (import_batch, import_ref) WHERE import_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_import ON encounters (import_batch) WHERE import_batch IS NOT NULL;
