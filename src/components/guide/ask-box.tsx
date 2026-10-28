"use client";

import { useState } from "react";
import type { AskScope } from "@/lib/guide-ask";
import { GuideAsk, ScopePills } from "./guide-ask";

/**
 * Perguntas de exemplo, para quem abre a Super Inteligência sem saber o que
 * digitar. Ficam aqui dentro: página do servidor não pode ler valor de módulo
 * "use client" (dá erro ao abrir a página), então ela passa só a chave.
 */
const EXAMPLES = {
  plantao: [
    "Dose de adrenalina na anafilaxia em criança de 20 kg?",
    "Como preparo noradrenalina para 70 kg?",
    "Convulsão que não cede com diazepam, próximo passo?",
  ],
  consultorio: [
    "Receita para cistite em mulher adulta?",
    "Amoxicilina na otite média em criança de 15 kg?",
    "O que orientar no início do antidepressivo?",
  ],
  ortopedia: [
    "Torceu o tornozelo ontem: preciso de raio-X?",
    "Lombalgia aguda sem alarme: receita e quantos dias de atestado?",
    "Como faço o teste de Lachman e o que significa?",
  ],
} as const;

/**
 * A Super Inteligência: a caixa da pergunta e, depois, a resposta com a
 * fonte de cada trecho — do Plantão (emergência, receitas prontas e Drive) e
 * da Ortopedia. O escopo (tudo, Plantão ou Ortopedia) começa na área da
 * página e pode ser trocado. Pode ser controlada (na emergência a barra de
 * busca também pergunta) ou cuidar sozinha da pergunta.
 */
export function AskBox({
  examples: exampleKey,
  defaultScope = null,
  asking: controlled,
  onAsk,
  onClose,
}: {
  examples: keyof typeof EXAMPLES;
  /** O escopo inicial: a área da página (Plantão ou Ortopedia); null é o guia inteiro. */
  defaultScope?: AskScope | null;
  asking?: string | null;
  onAsk?(question: string): void;
  onClose?(): void;
}) {
  const examples = EXAMPLES[exampleKey];
  const [own, setOwn] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [scope, setScope] = useState<AskScope | null>(defaultScope);
  const asking = controlled !== undefined ? controlled : own;
  const ask = (q: string) => (onAsk ? onAsk(q) : setOwn(q));
  const close = () => {
    setText("");
    if (onClose) onClose();
    else setOwn(null);
  };

  if (asking) return <GuideAsk key={asking} question={asking} scope={scope} onClose={close} />;
  return (
    <form
      className="card mb-4 border-pine-200 bg-gradient-to-br from-pine-950 to-pine-800 p-4 text-white sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const q = text.trim();
        if (q.length >= 3) ask(q);
      }}
    >
      <p className="flex items-center gap-2 text-[15px] font-extrabold">
        <span aria-hidden>✨</span> Super Inteligência — pergunte ao guia
      </p>
      <p className="mt-0.5 text-[12.5px] text-white/70">
        Escreva a dúvida como falaria com um colega. A resposta vem só do guia — Plantão (receitas prontas, emergência e Drive) e
        Ortopedia —, com a fonte de cada trecho.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className="input min-w-0 flex-1 border-white/20 bg-white text-pine-950"
          placeholder={`Ex.: ${examples[0]?.toLowerCase() ?? ""}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={600}
          aria-label="Pergunta para a Super Inteligência"
        />
        <button type="submit" disabled={text.trim().length < 3} className="btn shrink-0 bg-sun-400 text-pine-950 hover:bg-sun-300 disabled:opacity-50">
          Perguntar
        </button>
      </div>
      <div className="mt-2.5">
        <ScopePills value={scope} onChange={setScope} light />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {examples.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            className="max-w-full truncate rounded-full bg-white/10 px-3 py-1.5 text-left text-[12px] font-semibold text-white/90 hover:bg-white/20 pointer-coarse:min-h-10"
          >
            {q}
          </button>
        ))}
      </div>
    </form>
  );
}
