# Drive de prescrições (revisado)

Gera `src/lib/prescription-drive/data.ts` a partir de `drive-revisado.md`, a revisão Renova do *Drive de Prescrições*: o texto é nosso; do original ficam a lista de condições, “O que mudou” e os cards originais do e-book, que abrem o histórico de cada entrada.

    node scripts/prescription-drive/build_drive.mjs

Formato de cada entrada no .md: `### Título (CID) — ✅|✏️|⛔ status`, receitas em blocos de código (via em maiúsculas, `1. Remédio ..... quantidade`, posologia recuada), parágrafos `**Criança:**`, `⚠️` para cuidados, `**O que mudou:**` e `**Fonte:**`. O script recusa entrada sem “O que mudou”. Não edite o `data.ts` à mão.

Mudanças depois que o Drive entrou no app (2ª revisão) vão na própria entrada, numa linha `**Revisão N:** motivo. Antes: «…» → Agora: «…»` (itens separados por `;`). O app mostra isso com marca-texto na própria entrada, no carrossel do histórico embaixo dela e em Guia clínico › Revisões.

## Cards originais (e-book)

O carrossel de cada entrada começa no card original do e-book *Drive de Prescrições* (Dra. Camilla Rocha), reproduzido com autorização da autora (confirmado pelo responsável em 02/10/2026).

    python scripts/prescription-drive/extract_originals.py "E:/admin-moved/Downloads/ebook_camilladrive.pdf"

O script (PyMuPDF) gera `src/lib/prescription-drive/originals.json` — título, página e linhas de cada card, sem a marca d'água da licença nem o número da página. Qual card originou qual entrada fica em `src/lib/prescription-drive/originals-map.json` (slug → títulos), feito à mão; o teste `revision-slides.test.mjs` confere que toda entrada tem card e que nenhum card tem a marca d'água.
