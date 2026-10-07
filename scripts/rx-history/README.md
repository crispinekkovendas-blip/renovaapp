# Histórico das receitas prontas

`snapshot.mjs` grava em `src/lib/rx-library/history.json` como cada receita pronta estava ao fim de cada revisão (lendo `doses.ts` e `protocols.ts` do commit daquela revisão). O Guia clínico usa isso para mostrar “Como era / Como ficou” ao lado de cada mudança registrada em `src/lib/rx-library/review.ts`.

Ao abrir uma revisão nova (N+1): acrescente em `REVISIONS` o commit em que a revisão N terminou, rode `node scripts/rx-history/snapshot.mjs` e registre a revisão em `src/lib/guide-revisions.ts`.
