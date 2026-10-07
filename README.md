# Renova — Gestão de clínicas

Alternativa leve ao Amplimed: agenda, pacientes, prontuário eletrônico e financeiro.

**Produção:** https://renovaapp.vercel.app (Vercel `renovaapp` + Supabase Postgres `renova`, região São Paulo)

## Rodando

Pré-requisito: Node.js 20+.

```bash
npm install
npm run dev
```

Abra http://localhost:3000 e entre com:

- **E-mail:** `admin@renova.app`
- **Senha:** a senha inicial é aleatória e aparece uma vez no log do servidor, na primeira vez que o banco é criado.

> Troque a senha criando seu próprio usuário admin em **Configurações** e desativando o usuário inicial.

## Conteúdo privado

O código é público; o conteúdo clínico não. Os guias licenciados (Plantão e emergência, Drive de Prescrições — reproduzidos com autorização dos autores somente dentro do app) e o trabalho da clínica (receitas prontas, posologias, histórico das revisões, vocabulário de queixas) ficam no Supabase, tabela `private_files` (`migrations/2026-10-07-conteudo-privado.sql`). A lista dos arquivos está em `scripts/content/files.json`, e os mesmos caminhos estão no `.gitignore`.

```bash
npm run content:pull     # baixa do banco (roda sozinho antes de todo build)
npm run content:push     # envia o que mudou (depois de editar o guia; guia:embed já envia)
npm run content:status   # compara disco e banco
```

O banco vem de `CONTENT_DATABASE_URL` ou `DATABASE_URL`. Sem acesso a ele, o projeto não compila.

## Módulos

| Módulo | O que faz |
| --- | --- |
| **Agenda** | Grade diária por profissional, checagem de conflito, fluxo de status, confirmação por WhatsApp (wa.me), teleconsulta (sala Jitsi por consulta) e lista de espera. |
| **Agendamento online** | Portal público em `/agendar` (profissional → dia → horário → dados), baseado nos horários configurados; cria paciente automaticamente por telefone. |
| **Pacientes** | Cadastro com CPF, convênio, contato; busca por nome/CPF/telefone. |
| **Prontuário** | Atendimentos SOAP + receita; impressão de receituário e atestado (A4, cabeçalho da clínica); resumo do histórico por IA (opcional, requer `ANTHROPIC_API_KEY`). |
| **Financeiro** | Lançamentos por mês, baixa de pagamento, cobrança automática ao concluir consulta; faturamento por convênio com exportação CSV. |
| **Relatórios** | Produção por profissional, taxa de falta, receita por convênio, origem dos agendamentos. |
| **Configurações** | Dados da clínica, profissionais, usuários, horários de atendimento e chaves da API. Somente admin. |
| **API pública** | REST em `/api/v1/*` (patients, appointments, professionals) com chave `Bearer rnv_…` gerada em Configurações → API. |

## Stack

- Next.js 15 (App Router, Server Components + Server Actions — nenhum JS de cliente além da navegação)
- Tailwind CSS v4
- Postgres (Supabase, projeto `renova` / ref `nqpkhfhlgydqidmuoakp`) via postgres.js — conexão pelo pooler como papel `renova_app`; RLS bloqueia a API REST pública
- Sessão via cookie HMAC assinado — `SESSION_SECRET` (env) em produção, `data/secret.key` no dev local

## Ambiente

- `DATABASE_URL` — string de conexão do pooler (em `.env.local` para dev e nas envs do projeto Vercel)
- `SESSION_SECRET` — só produção
- ⚠️ Ao adicionar envs pelo PowerShell, use `vercel env add NOME production --value "..."` — piping (`"..." | vercel env add`) injeta um BOM UTF-8 que corrompe o valor.

## Deploy

```bash
npm run build          # verificação local
vercel deploy --prod --yes
```
