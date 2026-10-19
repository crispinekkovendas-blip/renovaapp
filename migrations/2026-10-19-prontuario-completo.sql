-- Renova — 2026-10-19 — prontuário mais completo
-- Run via Supabase SQL editor. The app role has no DDL privilege.
-- Every statement is idempotent; running it twice is harmless.
--
-- Pedido de um médico que revisou o app: antecedentes patológicos e um
-- prontuário mais completo.
--
-- patients.clinical_history: JSON com a história clínica, uma seção por chave
--   (pessoais, cirurgicos, familiares, habitos, gineco, vacinas), cada uma em
--   texto, um item por linha (src/lib/clinical-history.ts).
-- encounters.vitals: JSON com os sinais vitais do atendimento
--   ({"pa":"120/80","fc":72,"temp":36.5,"spo2":98,"peso":70,"altura":170,...}).
-- encounters.cid: o CID-10 da hipótese diagnóstica (ex.: J06.9).
--
-- Antes desta migração o app segue funcionando: a seção de antecedentes
-- avisa que falta a migração e o atendimento é salvo sem sinais vitais.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinical_history text;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS vitals text;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS cid text;
