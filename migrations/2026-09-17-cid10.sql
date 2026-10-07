-- Catálogo CID-10 (DATASUS).
--
-- Hoje o CID é digitado de cabeça em todo atestado, encaminhamento e laudo, e
-- um CID errado num atestado assinado vai para o empregador ou para a perícia
-- do INSS. Esta tabela é só codificação: nenhuma decisão clínica.
--
-- Fonte: www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip
-- (2.044 categorias de 3 caracteres + 12.450 subcategorias de 4).
-- Importação: `node data/import-cid.mjs`.
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS cid_codes (
  -- Já no formato que vai no documento: "A00" ou "A00.0".
  code text PRIMARY KEY,
  description text NOT NULL,
  chapter text,
  -- 'M' | 'F' | NULL — usado só para avisar, nunca para esconder o código.
  sex_restriction text,
  -- 1 = categoria (3 caracteres), 0 = subcategoria (4).
  is_category integer NOT NULL DEFAULT 0,
  -- Código com ponto, sem ponto e descrição, normalizados para o autocompletar.
  search text NOT NULL DEFAULT ''
);

-- Busca por prefixo: `text_pattern_ops` faz o LIKE 'x%' usar o índice.
CREATE INDEX IF NOT EXISTS idx_cid_search ON cid_codes (search text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_cid_category ON cid_codes (is_category);

ALTER TABLE cid_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS renova_app_all ON cid_codes;
CREATE POLICY renova_app_all ON cid_codes FOR ALL TO renova_app USING (true) WITH CHECK (true);
REVOKE ALL ON cid_codes FROM anon, authenticated;
