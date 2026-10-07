"use client";

import { useState } from "react";
import { GuideAsk } from "./guide-ask";

/**
 * Perguntas de exemplo, para quem abre a Super Inteligência sem saber o que
 * digitar. Ficam aqui dentro: página do servidor não pode ler valor de módulo
 * "use client" (dá erro ao abrir a página), então ela passa só o `scope`.
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
} as const;

/**
 * A Super Inteligência: a caixa da pergunta e, depois, a resposta com a
 * fonte de cada trecho — do guia de plantão, das receitas prontas e do
 * Drive. Pode ser controlada (no plantão a barra de busca também pergunta)
 * ou cuidar sozinha da pergunta.
 */
export function AskBox({
  scope,
  asking: controlled,
  onAsk,
  onClose,
}: {
  scope: keyof typeof EXAMPLES;
  asking?: string | null;
  onAsk?(question: string): void;
  onClose?(): void;
}) {
  const examples = EXAMPLES[scope];
  const [own, setOwn] = useState<string | null>(null);
  const [text, setText] = useState("");
  const asking = controlled !== undefined ? controlled : own;
  const ask = (q: string) => (onAsk ? onAsk(q) : setOwn(q));
  const close = () => {
    setText("");
    if (onClose) onClose();
    else setOwn(null);
  };

  if (asking) return <GuideAsk key={asking} question={asking} onClose={close} />;
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
        Escreva a dúvida como falaria com um colega. A resposta vem só do guia — plantão, receitas prontas e Drive —, com a
        fonte de cada trecho.
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
