import type { ReactNode } from "react";
import type { OrthoTopic } from "@/lib/ortho-guide";

/**
 * Um tópico do Guia de ortopedia na ordem da consulta: perguntar, examinar,
 * alarme, imagem, conduta, receita, imobilizar, encaminhar, atestado e
 * retorno. Cada seção tem um id para o sumário lateral.
 */
export const ORTHO_SECTIONS = [
  ["perguntar", "Perguntar"],
  ["examinar", "Examinar"],
  ["alarme", "Alarme"],
  ["imagem", "Imagem"],
  ["conduta", "Conduta"],
  ["receita", "Receita"],
  ["imobilizar", "Imobilizar"],
  ["encaminhar", "Encaminhar"],
  ["atestado", "Atestado e retorno"],
] as const;

export function OrthoTopicBody({ topic }: { topic: OrthoTopic }) {
  return (
    <div className="min-w-0 text-[14.5px] leading-relaxed [overflow-wrap:anywhere] text-pine-900/85">
      <p className="rounded-xl bg-pine-50 px-3.5 py-2.5 text-[14px] font-semibold text-pine-950">{topic.summary}</p>

      <Section id="perguntar" title="Perguntar" hint="anamnese dirigida">
        <Bullets items={topic.ask} />
      </Section>

      {topic.exam.length > 0 ? (
        <Section id="examinar" title="Examinar" hint={`${topic.exam.length} ${topic.exam.length === 1 ? "manobra" : "manobras"}`}>
          <ol className="space-y-2.5">
            {topic.exam.map((e) => (
              <li key={e.name} className="rounded-xl border border-pine-900/10 bg-white px-3.5 py-2.5">
                <p className="text-[14px] font-extrabold text-pine-950">{e.name}</p>
                <p className="mt-0.5">{e.how}</p>
                <p className="mt-1 text-[13.5px]">
                  <span className="mr-1 rounded bg-pine-100 px-1 text-[10px] font-extrabold tracking-wide text-pine-800 uppercase">Positivo</span>
                  {e.positive}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <Section id="alarme" title="Alarme" hint="o que muda tudo">
        <ul className="space-y-1.5">
          {topic.alarm.map((a, i) => (
            <li key={i} className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13.5px] text-rose-950">
              <span aria-hidden className="shrink-0 font-extrabold">⚠</span>
              <span className="min-w-0">{a}</span>
            </li>
          ))}
        </ul>
      </Section>

      {topic.imaging.length > 0 ? (
        <Section id="imagem" title="Imagem" hint="quando pedir e como escrever">
          <Bullets items={topic.imaging} />
        </Section>
      ) : null}

      <Section id="conduta" title="Conduta" hint="o que fazer e orientar">
        <Bullets items={topic.plan} />
      </Section>

      {topic.rx.length > 0 ? (
        <Section id="receita" title="Receita" hint="adulto sem comorbidade">
          <ul className="space-y-2">
            {topic.rx.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-sun-400" />
                <div className="min-w-0">
                  <p className="text-[15px] leading-snug font-extrabold text-pine-950">{r.name}</p>
                  <p>{r.posology}</p>
                  {r.note ? <p className="mt-0.5 text-[13px] text-pine-900/60">{r.note}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {topic.immobilize && topic.immobilize.length > 0 ? (
        <Section id="imobilizar" title="Imobilizar" hint="órtese ou tala">
          <Bullets items={topic.immobilize} />
        </Section>
      ) : null}

      <Section id="encaminhar" title="Encaminhar" hint="quando o ortopedista entra">
        <Bullets items={topic.refer} />
      </Section>

      <Section id="atestado" title="Atestado e retorno" hint="sugestão — ajuste ao trabalho">
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
          <dt className="text-xs font-extrabold tracking-wide text-pine-900/50 uppercase">Atestado</dt>
          <dd>{topic.leave}</dd>
          <dt className="text-xs font-extrabold tracking-wide text-pine-900/50 uppercase">Retorno</dt>
          <dd>{topic.followup}</dd>
        </dl>
      </Section>

      {topic.pearls && topic.pearls.length > 0 ? (
        <div className="mt-6 space-y-2">
          {topic.pearls.map((p, i) => (
            <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13.5px] text-amber-950">
              <span className="mr-1 font-extrabold">💡</span>
              {p}
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-6 text-xs text-pine-900/50">
        <b className="text-pine-900/70">Baseado em:</b> {topic.sources.join(" · ")}.
      </p>
    </div>
  );
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-6 scroll-mt-20">
      <h3 className="mb-2 border-b border-pine-900/10 pb-1 text-[13px] font-extrabold tracking-wide text-pine-700 uppercase">
        {title}
        {hint ? <span className="ml-2 text-[11px] font-semibold tracking-normal text-pine-900/45 normal-case">{hint}</span> : null}
      </h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-pine-400" />
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  );
}
