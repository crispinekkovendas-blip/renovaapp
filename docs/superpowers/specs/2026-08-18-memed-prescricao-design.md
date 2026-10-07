# Renova — Prescrição digital via Memed (Sinapse Prescrição)

**Data:** 2026-08-18 · **Status:** desenho, não implementado

## Objetivo

Substituir o receituário impresso local pela prescrição digital assinada da Memed, para a receita sair com validade legal (assinatura ICP-Brasil pela Memed), chegar ao paciente por link/WhatsApp e ser aceita em farmácia. Hoje o receituário é só um A4 renderizado por nós a partir de `encounters.prescription` — texto livre, sem assinatura, sem validade digital.

Posicionamento: a Amplimed vende integração com Memed como diferencial. Esta é a lacuna de paridade mais visível que sobrou no [[Roadmap]].

## O que foi verificado na API (2026-08-18)

Tudo abaixo saiu da documentação oficial, não de memória:

- **Credenciais:** par `api-key` + `secret-key`, enviados como **query params** (não header). Nunca no front-end.
- **Ambientes:** staging API `https://integrations.api.memed.com.br/v1`; script staging `https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js`. Produção troca os dois.
- **Prescritor:** `POST|GET|PATCH|DELETE /v1/sinapse-prescricao/usuarios`. Corpo em JSON:API (`data.type = "usuarios"`), headers `Accept: application/vnd.api+json`. Campos obrigatórios: `external_id`, `nome`, `sobrenome`, `cpf`, `board_code` (CRM/CRO/COREN/…), `board_number`, `board_state`, `data_nascimento` (dd/mm/YYYY). Opcionais: `email`, `telefone`, `sexo`, `cidade`, `especialidade`. **A resposta traz o token de acesso do prescritor.**
- **O token não é estático.** A doc é explícita: buscar o token válido mais recente a cada requisição. Não dá para guardar e reusar indefinidamente.
- **Front-end:** script com `data-token`, esperar o evento de carregamento, então `MdHub.command.send("plataforma.prescricao", "setPaciente", {idExterno, nome, sexo, cpf, data_nascimento})` e `MdHub.module.show("plataforma.prescricao")`. Dois modos: **fullscreen** ou **embedded**.
- **Eventos MdHub:** `moduloCarregado`, `prescricaoImpressa`, `prescricaoExcluida`, `medicamentoAdicionado`, `medicamentoRemovido`, `moduloFechado`.
- **Prescrições:** `GET /v1/prescricoes?token=`, `GET /v1/prescricoes/{id}/url-document/full?token=` (PDF), `GET /v1/prescricoes/{id}/get-digital-prescription-link?token=` (link para o paciente), `DELETE /v1/prescricoes/{id}?token=`.
- **Não há webhook documentado.** Isso é o fato que mais molda o desenho (ver Confiabilidade).
- **Staging cai das 0h às 6h em dias de semana e nos fins de semana** — limita a janela de teste.

## Decisões

- **Somar, não substituir.** O A4 local continua, como plano B: staging fora do ar, profissional sem dados Memed preenchidos, ou queda da API não podem impedir a consulta de terminar. Memed vira o caminho primário quando disponível.
- **Atestado continua local.** O módulo Memed é de prescrição. Atestado não é receita e não passa por ele — hoje os dois compartilham a mesma rota de impressão e vão se separar.
- **Fullscreen, não embedded.** O prontuário já é denso e o shell tem rail fixo + top bar; sobrepor tela inteira evita conflito de CSS e scroll. Embedded fica como possibilidade depois.
- **Só o próprio prescritor prescreve.** A receita é assinada por uma pessoa física com registro no conselho. Admin não pode prescrever "em nome de" — é o primeiro lugar do app onde `role = admin` **não** dá acesso a tudo, e isso é intencional.
- **Token buscado no servidor, por sessão.** Uma Server Action devolve o token do prescritor logado; `secret-key` nunca sai do servidor. Como o token não é estático, buscamos na hora e não persistimos.
- **`external_id` = id do `professional`** prefixado (`renova-prof-<id>`), estável e único, para reencontrar o prescritor sem depender de CPF.

## Pré-requisito que ninguém vai gostar: falta dado do prescritor

`professionals` hoje é `name, specialty, council (texto livre), color, active`. A Memed exige CPF, `board_code`/`board_number`/`board_state` separados e data de nascimento. Ou seja: **antes de escrever uma linha de integração, é preciso migração + tela para capturar isso**.

| Memed | Renova hoje | Ação |
|---|---|---|
| `nome` / `sobrenome` | `name` (inteiro) | dividir no primeiro espaço, com campos editáveis |
| `cpf` | — | **novo campo** |
| `board_code` + `board_number` + `board_state` | `council` (ex.: "CRM-SP 123456") | **três campos novos**; `council` continua para o A4 |
| `data_nascimento` | — | **novo campo** |
| `especialidade` (id) | `specialty` (texto) | opcional; mapear depois via API de especialidades |

Do lado do paciente está tudo lá: `patients.name`, `cpf`, `birth_date` (ISO → `fmtDate` já dá dd/mm/yyyy), `sex` (texto livre — precisa normalizar para o que a Memed espera).

⚠ **O papel do app não tem DDL em produção** (ver [[Quirks and gotchas]]). Toda coluna e tabela nova aqui exige migração rodada via Supabase, fora do app. Isso vale para as colunas de `professionals` e para a tabela de prescrições.

## Modelo de dados

Colunas novas em `professionals`: `cpf text`, `board_code text`, `board_number text`, `board_state text`, `birth_date text`, `memed_external_id text`.

Tabela nova:

```sql
CREATE TABLE memed_prescriptions (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  encounter_id bigint REFERENCES encounters(id),
  patient_id bigint NOT NULL REFERENCES patients(id),
  professional_id bigint NOT NULL REFERENCES professionals(id),
  memed_prescription_id text NOT NULL UNIQUE,
  patient_link text,
  pdf_url text,
  status text NOT NULL DEFAULT 'emitida' CHECK (status IN ('emitida','excluida')),
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);
```

`encounter_id` é anulável de propósito: dá para prescrever a partir da ficha do paciente sem um atendimento aberto.

## Fluxo

1. Profissional abre o prontuário e clica **Prescrever**. O botão só aparece se o `professional` vinculado ao usuário tiver os dados Memed completos; se faltar, mostra o motivo e link para Configurações.
2. Server Action `getMemedPrescriberToken()`: `GET /usuarios/{external_id}` e, se 404, `POST /usuarios` para registrar. Devolve **apenas** o token ao cliente.
3. Componente cliente injeta o script com `data-token`, espera `moduloCarregado`, manda `setPaciente` com os dados do paciente e chama `MdHub.module.show`.
4. Médico prescreve dentro da Memed (busca de medicamento, posologia, assinatura — tudo deles).
5. No `prescricaoImpressa`, o cliente chama nossa Server Action com o id da prescrição; o servidor busca link do paciente e PDF e grava em `memed_prescriptions`.
6. Timeline do prontuário passa a mostrar a receita Memed com "Abrir PDF" e "Enviar ao paciente" (reusando `waLink()` do `format.ts`).
7. `prescricaoExcluida` marca `status = 'excluida'` em vez de apagar a linha.

## Confiabilidade — o ponto fraco, sem disfarce

Não há webhook. A única notificação de que uma receita existe é um **evento no navegador do médico**. Se ele fechar a aba entre assinar e nosso POST chegar, a receita existe na Memed e não existe no Renova. Isso não é hipotético: é o caminho normal de quem assina e fecha o notebook.

Mitigação em duas camadas:

- **Fase 1:** gravar no evento + botão **"Sincronizar receitas"** no prontuário, que chama `GET /v1/prescricoes?token=` e reconcilia por paciente e data. Manual, mas cobre o caso.
- **Fase 2:** Vercel Cron diário varrendo prescritores ativos e reconciliando o que faltou. Só depois da fase 1 estar de pé.

Nunca inferir "não há receita" da ausência de linha nossa — a Memed é a fonte da verdade.

## Fases

- **Fase 0 — dado do prescritor.** Migração das colunas + seção em Configurações → Profissionais para CPF, conselho separado e nascimento. Sem isso nada mais roda. Entrega valor sozinha (o A4 melhora com conselho estruturado).
- **Fase 1 — prescrever e guardar.** Registro/token do prescritor, módulo fullscreen, `setPaciente`, captura de `prescricaoImpressa`, tabela, link na timeline, botão de sincronizar.
- **Fase 2 — reconciliação e histórico.** Cron, tela de histórico de receitas do paciente, tratamento de exclusão.

## Variáveis de ambiente

`MEMED_API_KEY`, `MEMED_SECRET_KEY`, `MEMED_API_URL`, `MEMED_SCRIPT_URL`. Todas via `vercel env add --value "…"` — **nunca por pipe do PowerShell**, que injeta BOM (ver [[Quirks and gotchas]] §3). O botão "Prescrever" fica escondido quando as variáveis não estão configuradas, igual ao Resumo IA.

## LGPD

O fluxo manda nome, CPF, sexo e data de nascimento do paciente para um terceiro. A Memed é operadora de dados de saúde estabelecida no Brasil e este é o padrão do mercado, mas continua sendo compartilhamento de **dado sensível**: entra no escopo do item de LGPD que já está em [[Pendings]] §3, e o contrato/DPA com a Memed precisa existir antes de clínica real. Não é bloqueio técnico; é bloqueio de conformidade.

## Riscos e questões abertas

1. **Credenciais de produção** exigem contrato comercial com a Memed. Staging serve para construir tudo, mas a data de disponibilidade real depende disso — está fora do nosso controle.
2. **Especialidade e cidade** são ids das APIs da Memed, não texto. Fase 1 omite os dois (são opcionais) e resolve depois.
3. **`patients.sex` é texto livre** sem constraint. Precisa normalizar para o vocabulário da Memed e decidir o que fazer com paciente sem sexo preenchido.
4. **Um prescritor por profissional, ou por usuário?** O desenho assume por `professional`. Se um mesmo médico atender em duas clínicas no futuro (multi-tenant, [[Roadmap]]), isso muda.
5. **Janela de teste do staging** (fora do ar 0h–6h e fins de semana) atrasa verificação — planejar as sessões dentro do horário útil.

## Fontes

- [Primeiros passos](http://doc.memed.com.br/docs/primeiros-passos/)
- [Usuário prescritor](http://doc.memed.com.br/docs/backend/usuario-prescritor/)
- [Prescrição (REST)](http://doc.memed.com.br/docs/backend/prescricao/)
- [Eventos MdHub](http://doc.memed.com.br/docs/frontend/eventos-mdhub/)
