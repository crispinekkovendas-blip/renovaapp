# Memed — inventário de capacidades e requisitos de produção

**Data:** 2026-08-18 · **Fonte:** documentação oficial (doc.memed.com.br), lida página por página
**Status da sonda:** `integrations.api.memed.com.br` devolveu **503 em todos os caminhos** às 23:2x de
terça 18/08 — a homologação estava fora do ar, e não é a nossa requisição que está errada. A sonda
`data/probe-memed.mjs` está pronta e sai com código 2 quando detecta o 503; rodar de novo entre 06h e 00h
em dia útil confirma tudo abaixo contra a API real.

Complementa [[2026-08-18-memed-prescricao-design]], que continua valendo no desenho — o que muda são
requisitos que a Memed exige **para liberar credenciais de produção** e capacidades que valem a pena.

## Correções de ambiente

O desenho original tinha uma URL de produção errada. Os quatro endereços corretos:

| | Homologação | Produção |
|---|---|---|
| API | `https://integrations.api.memed.com.br/v1` | `https://api.memed.com.br/v1` |
| Script | `https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js` | `https://partners.memed.com.br/integration.js` |

Verificado por HTTP: o script de homologação redireciona (302) para `branch/master/…` e serve 17 KB de
JavaScript — ou seja, **o front-end da Memed continua disponível mesmo com a API fora do ar**. O host de
produção da API responde 403 (vivo, sem credencial). As chaves de homologação são fixas e publicadas na
própria documentação; só as de produção dependem de contrato.

## Backend — o que a API oferece

| Rota | O que faz | Serve ao Renova? |
|---|---|---|
| `POST/GET/PATCH/DELETE /sinapse-prescricao/usuarios` | cadastra o prescritor e devolve o token | **essencial** |
| `GET /prescricoes` | histórico de receitas do prescritor, paginado | **essencial** (reconciliação) |
| `DELETE /prescricoes/{id}` | apaga uma receita | não — quem apaga é o médico, na Memed |
| `GET /prescricoes/{id}/url-document/full` | URL do PDF | **essencial** |
| `GET /prescricoes/{id}/get-digital-prescription-link` | link do paciente **+ código de desbloqueio** | **essencial** |
| `GET /drugs/ingredients` | busca de princípios ativos | não na fase 1 |
| `POST/GET/DELETE /protocolos` | modelos de receita do prescritor | fase 2 |
| `POST/GET/DELETE /protocolos/parceiros` | **modelos institucionais, distribuídos a todos os prescritores da clínica** | **alto valor, fase 2** |
| `GET /especialidades` | lista de especialidades com id | **necessário para produção** (ver abaixo) |
| `GET /cidades` | lista de cidades com id | opcional |
| `GET /chaves` | consulta o par de chaves | diagnóstico |
| `/impressao` | configuração de impressão | a avaliar |

O **código de desbloqueio** é um achado que muda a UX: o link do paciente não é auto-suficiente. Mandar
só a URL pelo WhatsApp entrega uma página que o paciente não consegue abrir — a mensagem precisa levar
link **e** código.

**Protocolos institucionais** são a capacidade mais subestimada aqui. `POST /protocolos/parceiros` cria um
modelo de tratamento (medicamentos + posologia + CID-10) que aparece para **todos** os prescritores da
clínica. É padronização clínica de verdade, não conveniência: a clínica define como se trata determinada
condição e ninguém digita posologia errada.

## Frontend — 13 comandos MdHub

Além de `setPaciente`, que era o único no desenho original:

| Comando | O que faz | Serve ao Renova? |
|---|---|---|
| `setPaciente` | dados do paciente antes de prescrever | **essencial** |
| `setAllergy` | alergias do paciente na plataforma | **sim** — o Renova já guarda observações clínicas |
| `setAdditionalData` | dados extra em cabeçalho e rodapé | **sim** — dados da clínica, tabela `settings` |
| `setWorkplace` | local de atendimento do prescritor | **sim** — endereço da clínica |
| `viewPrescription` | **reimprimir e editar uma receita existente** | **sim** — é o que a timeline do prontuário precisa |
| `logout` | limpa o localStorage do navegador | **sim, e importante** — recepção compartilha máquina |
| `newPrescription` | inicia nova receita | conveniência |
| `hide` | fecha o módulo | conveniência |
| `setFeatureToggle` | liga/desliga recursos | **cuidado** — desligar indevidamente revoga credencial |
| `setDictionary` | customiza textos | não |
| `addItem` | insere itens na receita por código | não na fase 1 |
| `categoriesConditions` | alertas para tipos de paciente | não |
| `find` | configurações de receituário temático | não |

`logout` merece destaque: numa clínica, um mesmo computador atende vários profissionais. Sem chamar
`logout` ao trocar de usuário, o localStorage da Memed mantém o prescritor anterior — receita assinada
pela pessoa errada é o pior defeito possível neste módulo.

`viewPrescription` elimina uma limitação que o desenho tinha aceitado: dá para reabrir uma receita já
emitida em vez de só linkar o PDF.

Eventos (6): `moduloCarregado`, `prescricaoImpressa`, `prescricaoExcluida`, `medicamentoAdicionado`,
`medicamentoRemovido`, `moduloFechado`. Dois modos de exibição (fullscreen / embedded), dois modos de
carregamento do script, e estilização da cor primária.

## ⚠ Requisitos obrigatórios para credenciais de produção

Isto não é lista de desejos — a Memed exige antes de liberar produção, e **revoga** depois se não estiver
cumprido. O plano atual falha em três pontos.

1. **Prescritor completo:** nome, registro + UF, **e-mail**, **especialidade**, nascimento e CPF.
   O plano coleta tudo menos **e-mail e especialidade**, e tinha declarado especialidade "opcional".
2. **`setPaciente` completo:** nome, **e-mail**, **celular**, nascimento e CPF.
   `toMemedPatient()` hoje manda nome, CPF, nascimento e sexo — **falta e-mail e telefone**, que já
   existem em `patients`.
3. **Os dois eventos:** `prescricaoImpressa` **e** `prescricaoExcluida`, se o sistema guarda receitas.
   O plano jogou `prescricaoExcluida` para a fase 2 — precisa voltar para a fase 1.

Mais: credencial pode ser revogada por chave exposta, por desabilitar recursos indevidamente via
`setFeatureToggle`, ou por falha no fluxo de captura da prescrição. A Memed avalia a integração por até
**180 dias após a aprovação**.

## Consequências para o plano

- **Task 4** (`toMemedPatient`) ganha `email` e `celular`. Barato — as colunas existem.
- **Task 8** ganha `prescricaoExcluida`, `setAllergy`, `setAdditionalData`, `setWorkplace` e `logout`.
- **Task 9** pode usar `viewPrescription` em vez de só abrir PDF.
- **E-mail do prescritor:** `professionals` não tem coluna de e-mail. Em vez de nova migração, usar o
  e-mail do `users` vinculado (`users.professional_id`) — o profissional que prescreve tem conta no app.
  Só cai em migração se existir prescritor sem usuário.
- **Especialidade:** a Memed quer **id**, não texto, e `professionals.specialty` é texto livre. Precisa de
  `GET /especialidades` (API fora do ar agora) + um select em Configurações + uma coluna nova
  (`memed_specialty_id`) — ou seja, **uma segunda migração**, que vale juntar com qualquer outra pendente.

## Próximo passo

Rodar `node data/probe-memed.mjs` em horário útil. Ele confirma o formato do token, os atributos que o
cadastro devolve, e — o que mais importa — os ids reais de `GET /especialidades`, que destravam o
requisito de produção nº 1.
