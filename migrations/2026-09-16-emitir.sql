-- Renova — 2026-09-16 — rodada 6 "Mevo por dentro"
-- Run via Supabase SQL editor. The app role has no DDL privilege.
-- Every statement is idempotent; running it twice is harmless.
--
-- documents.batch_id: documents issued together from the "Emitir documentos"
-- composer share one batch id (one WhatsApp message, "imprimir todos").
-- document_templates.kind gains 'protocolo': a template that bundles several
-- documents (items stored as JSON in `fields`, body stays '').
-- professionals.rqe / signature_image: RQE printed next to the CRM, and the
-- scanned signature (data URL, PNG/JPEG ≤ 300 KB) printed on the sheet
-- ("assinar e carimbar" when there is no ICP-Brasil certificate).
-- patients.social_name: nome social, shown first on the prontuário and on
-- documents (civil name kept next to it).

ALTER TABLE documents ADD COLUMN IF NOT EXISTS batch_id text;
CREATE INDEX IF NOT EXISTS idx_documents_batch ON documents (batch_id);

ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS document_templates_kind_check;
ALTER TABLE document_templates ADD CONSTRAINT document_templates_kind_check
  CHECK (kind IN ('atestado','encaminhamento','laudo','orientacoes','protocolo'));

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS rqe text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS signature_image text;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS social_name text;
