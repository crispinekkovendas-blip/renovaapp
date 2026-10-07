-- Receita digital: o que a homologação da Memed revelou em 2026-09-17.
--
-- `get-digital-prescription-link` devolve, junto com o link do paciente, os
-- quatro dígitos que ele digita para abrir a receita (na farmácia ou em casa) —
-- e `url-document/full` diz se aquele documento foi mesmo assinado
-- digitalmente. Sem estas duas colunas, o portal mostrava um link que o
-- paciente não consegue destravar e afirmava "assinada digitalmente" sobre
-- qualquer receita.
--
-- Idempotente: pode rodar duas vezes sem erro.

ALTER TABLE memed_prescriptions ADD COLUMN IF NOT EXISTS access_code text;
ALTER TABLE memed_prescriptions ADD COLUMN IF NOT EXISTS signed smallint NOT NULL DEFAULT 0;

-- A data que a Memed carimbou na receita (dd/mm/YYYY convertida), que pode ser
-- diferente de quando a linha entrou aqui — a reconciliação traz receitas
-- antigas, e no portal o paciente precisa ver a data da receita, não a do
-- nosso INSERT.
ALTER TABLE memed_prescriptions ADD COLUMN IF NOT EXISTS issued_at text;
