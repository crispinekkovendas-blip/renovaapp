# Guia de plantão (Plantão e emergência)

Gera `src/lib/emergency-guide/data.ts` a partir do PDF do *Guia de Prescrições da Emergência* (2ª ed., PS Zerado), reproduzido com autorização dos autores.

1. `python parse_guide.py <caminho do PDF>`: lê o PDF pela fonte/cor de cada linha e grava `guide.raw.json` (não versionado).
2. `python build_guide.py`: aplica `errata.py` e grava o `data.ts`.

`errata.py` é o registro da revisão: cada correção guarda o texto original e o motivo, e aparece no app como “Corrigido”; os avisos aparecem como “Conferir”. Para mudar o conteúdo, edite a errata e gere de novo. Não edite o `data.ts` à mão.

`errata_revisao2.py` é a 2ª revisão (01/10/2026): aplicada depois da 1ª, já sobre os títulos finais dos tópicos, e cada correção ou aviso leva a data (`fix.at`, `noteAt`). O app mostra “✓ Corrigido na publicação (30/09)” e “✎ Corrigido agora (01/10)” separados. Depois de gerar, rode `npm run guia:embed` para atualizar os vetores dos trechos que mudaram.

Revisões seguintes ficam em `errata_revisaoN.py` (hoje 2 e 3), com o número da revisão em cada correção (`fix.rev`) e aviso (`noteRev`). Corrigir de novo um trecho guarda a correção anterior em `earlier`; `WITHDRAW_NOTES` retira um aviso errado, que continua no histórico com o motivo. Registre a revisão em `src/lib/guide-revisions.ts`; a aba Guia clínico › Revisões mostra tudo.
