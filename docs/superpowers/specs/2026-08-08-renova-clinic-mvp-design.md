# Renova — MVP de gestão de clínicas (alternativa ao Amplimed)

**Data:** 2026-08-08 · **Status:** implementado

## Objetivo

App local de gestão de clínica cobrindo o núcleo do Amplimed: agenda, cadastro de pacientes, prontuário eletrônico e financeiro simples. Uma clínica, vários usuários, UI em pt-BR.

## Decisões

- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind v4. SQLite local (better-sqlite3), sem contas em nuvem. Migração futura para Supabase/Postgres possível trocando a camada `src/lib/db.ts`.
- **Zero client-JS:** todas as telas são Server Components; mutações via Server Actions em formulários HTML; painéis colapsáveis com `<details>`; único componente cliente é o link ativo da navegação.
- **Auth:** sessão em cookie HMAC-SHA256 (`data/secret.key`), senha com bcrypt. Perfis: admin, recepção, profissional (Configurações restrita a admin).
- **Dados:** `data/renova.db` com seed (usuários, 2 profissionais, 6 pacientes, agenda do dia, 1 atendimento e lançamentos) para o app nascer utilizável.

## Modelo de dados

`users`, `professionals`, `patients`, `appointments` (status: agendado/confirmado/em_atendimento/concluido/faltou/cancelado, preço em centavos), `encounters` (queixa, anamnese, exame, diagnóstico CID, conduta, receita), `payments` (pendente/pago, vencimento, forma).

## Regras de negócio

- Agendamento checa conflito de horário por profissional (exceto cancelado/faltou).
- Concluir consulta com valor > 0 gera lançamento pendente no financeiro (idempotente por consulta).
- Datas em ISO local (`YYYY-MM-DD`), horários `HH:MM`, valores em centavos formatados como BRL.

## Fora do escopo (roadmap)

Telemedicina, receitas assinadas digitalmente (Memed), TISS/convênios, WhatsApp de confirmação, multi-clínica/SaaS, relatórios avançados, anexos de arquivos no prontuário.
