"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { OrthoTopic } from "@/lib/ortho-guide";
import { EMPTY_ANSWERS, ORTHO_REGIONS, UNIVERSAL_ALARM, alarmTexts, buildSoapNote, orderTopics, stepOf } from "@/lib/ortho-guide/consult";
import type { ConsultAnswers, ConsultStep, ExamResult, OrthoRegion } from "@/lib/ortho-guide/consult";

const STORAGE = "renova:ortho-consulta";

const STEPS: { key: ConsultStep; label: string }[] = [
  { key: "regiao", label: "Onde dói" },
  { key: "alarme", label: "Alarme" },
  { key: "condicao", label: "Condição" },
  { key: "roteiro", label: "Roteiro" },
  { key: "nota", label: "Nota" },
];

/**
 * A consulta guiada: cinco passos na ordem em que o médico atende. O que
 * foi marcado fica no sessionStorage, para não perder ao recarregar; "Nova
 * consulta" limpa. `initialTopic` (?t=slug) pula direto ao roteiro.
 */
export function OrthoConsult({ topics, initialTopic }: { topics: readonly OrthoTopic[]; initialTopic: string | null }) {
  const bySlug = useMemo(() => new Map(topics.map((t) => [t.slug, t])), [topics]);
  const [answers, setAnswers] = useState<ConsultAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState<ConsultStep>("regiao");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let next = EMPTY_ANSWERS;
    try {
      const raw = sessionStorage.getItem(STORAGE);
      if (raw) next = { ...EMPTY_ANSWERS, ...(JSON.parse(raw) as Partial<ConsultAnswers>) };
    } catch {
      // Sem armazenamento: começa do zero.
    }
    if (initialTopic && bySlug.has(initialTopic) && next.topic !== initialTopic) {
      const region = ORTHO_REGIONS.find((r) => r.topics.includes(initialTopic));
      next = { ...EMPTY_ANSWERS, region: region?.key ?? null, trauma: false, topic: initialTopic };
    }
    setAnswers(next);
    setStep(stepOf(next));
    setLoaded(true);
  }, [initialTopic, bySlug]);

  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(answers));
    } catch {
      // Sem armazenamento: segue sem guardar.
    }
  }, [answers, loaded]);

  const region = ORTHO_REGIONS.find((r) => r.key === answers.region) ?? null;
  const topic = answers.topic ? (bySlug.get(answers.topic) ?? null) : null;
  const alarms = alarmTexts(region, answers, topic);
  const reset = () => {
    setAnswers(EMPTY_ANSWERS);
    setStep("regiao");
  };
  const reached = (s: ConsultStep) => {
    const order = STEPS.map((x) => x.key);
    const max = order.indexOf(stepOf(answers)) + (answers.topic ? 1 : 0);
    return order.indexOf(s) <= max;
  };

  if (!loaded) return <p className="text-sm text-pine-900/50">Carregando…</p>;

  return (
    <div>
      <ol className="scroll-x -mx-1 mb-4 flex gap-1.5 px-1 pb-0.5" aria-label="Passos">
        {STEPS.map((s, i) => {
          const on = s.key === step;
          const ok = reached(s.key);
          return (
            <li key={s.key} className="shrink-0">
              <button
                type="button"
                disabled={!ok}
                aria-current={on ? "step" : undefined}
                onClick={() => setStep(s.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors pointer-coarse:min-h-10 ${
                  on ? "border-pine-950 bg-pine-950 text-white" : ok ? "border-pine-900/12 bg-white text-pine-900/70 hover:border-pine-400" : "border-pine-900/8 bg-white text-pine-900/30"
                }`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${on ? "bg-white/20" : "bg-pine-100 text-pine-800"}`}>{i + 1}</span>
                {s.label}
              </button>
            </li>
          );
        })}
        <li className="ml-auto shrink-0">
          <button type="button" onClick={reset} className="rounded-full px-3 py-1.5 text-[12.5px] font-bold text-pine-600 hover:underline pointer-coarse:min-h-10">
            Nova consulta
          </button>
        </li>
      </ol>

      {alarms.length > 0 && step !== "nota" ? (
        <div role="alert" className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-rose-950">
          <p className="text-[13px] font-extrabold tracking-wide uppercase">⚠ Sinal de alarme marcado — conduta de urgência hoje</p>
          <ul className="mt-1 list-disc pl-5 text-[13.5px]">
            {alarms.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12.5px]">
            Veja{" "}
            <Link href="/guia/ortopedia/quando-encaminhar-no-mesmo-dia" className="font-bold underline">
              o que fazer antes de o paciente sair
            </Link>
            . Pode seguir o roteiro para registrar o exame, mas a conduta é o encaminhamento.
          </p>
        </div>
      ) : null}

      {step === "regiao" ? (
        <RegionStep
          value={answers.region}
          onPick={(key) => {
            setAnswers({ ...EMPTY_ANSWERS, region: key });
            setStep("alarme");
          }}
        />
      ) : null}

      {step === "alarme" && region ? (
        <AlarmStep
          region={region}
          answers={answers}
          onChange={setAnswers}
          onNext={() => setStep("condicao")}
        />
      ) : null}

      {step === "condicao" && region ? (
        <ConditionStep
          region={region}
          trauma={answers.trauma}
          bySlug={bySlug}
          value={answers.topic}
          onPick={(slug) => {
            setAnswers({ ...answers, topic: slug, ask: [], askNote: "", exam: {}, topicAlarm: [], rx: [], leave: "" });
            setStep("roteiro");
          }}
        />
      ) : null}

      {step === "roteiro" && region && topic ? (
        <ScriptStep topic={topic} answers={answers} onChange={setAnswers} onNext={() => setStep("nota")} />
      ) : null}

      {step === "nota" && region && topic ? <NoteStep note={buildSoapNote(region, topic, answers)} topic={topic} onReset={reset} /> : null}
    </div>
  );
}

function StepTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <h2 className="mb-3 text-lg font-extrabold tracking-tight text-pine-950">
      {children}
      {hint ? <span className="ml-2 text-[13px] font-semibold text-pine-900/50">{hint}</span> : null}
    </h2>
  );
}

function NextButton({ onClick, children }: { onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 inline-flex items-center gap-2 rounded-full bg-pine-950 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-pine-900 pointer-coarse:min-h-11"
    >
      {children} →
    </button>
  );
}

function RegionStep({ value, onPick }: { value: string | null; onPick(key: string): void }) {
  return (
    <section>
      <StepTitle hint="pergunte e peça para apontar com um dedo">Onde dói?</StepTitle>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ORTHO_REGIONS.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              aria-pressed={r.key === value}
              onClick={() => onPick(r.key)}
              className={`flex min-h-16 w-full flex-col justify-center rounded-2xl border px-4 py-3 text-left transition-colors ${
                r.key === value ? "border-pine-950 bg-pine-50" : "border-pine-900/10 bg-white hover:border-pine-400 hover:bg-pine-50/40"
              }`}
            >
              <span className="text-[15px] font-extrabold text-pine-950">{r.label}</span>
              <span className="mt-0.5 text-[11.5px] text-pine-900/55">
                {r.topics.length} {r.topics.length === 1 ? "condição" : "condições"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] text-pine-900/55">
        Dor na nádega que desce pela perna é coluna lombar; dor na virilha é quadril; dor na lateral do quadril é quadril também (bursa).
      </p>
    </section>
  );
}

function AlarmStep({ region, answers, onChange, onNext }: { region: OrthoRegion; answers: ConsultAnswers; onChange(a: ConsultAnswers): void; onNext(): void }) {
  const toggle = (key: string) =>
    onChange({ ...answers, alarm: answers.alarm.includes(key) ? answers.alarm.filter((k) => k !== key) : [...answers.alarm, key] });
  const canNext = answers.trauma !== null;
  return (
    <section>
      <StepTitle hint="30 segundos que separam o que você resolve hoje do que vai para a cirurgia">Antes de tudo: {region.label.toLowerCase()}</StepTitle>

      <fieldset className="rounded-2xl border border-pine-900/10 bg-white p-3.5">
        <legend className="px-1 text-[13px] font-extrabold text-pine-950">Houve trauma (queda, torção, pancada)?</legend>
        <div className="mt-1 flex gap-2">
          {[
            [true, "Sim, houve trauma"],
            [false, "Não, começou sozinho"],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={answers.trauma === v}
              onClick={() => onChange({ ...answers, trauma: v as boolean })}
              className={`rounded-full border px-3.5 py-2 text-[13px] font-bold pointer-coarse:min-h-11 ${
                answers.trauma === v ? "border-pine-950 bg-pine-950 text-white" : "border-pine-900/12 bg-white text-pine-900/70 hover:border-pine-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="mt-4 mb-1.5 text-[13px] font-extrabold text-pine-950">Marque o que estiver presente</p>
      <ul className="space-y-1.5">
        {region.alarm.map((a, i) => (
          <AlarmCheck key={`r:${i}`} id={`r:${i}`} text={a} on={answers.alarm.includes(`r:${i}`)} onToggle={toggle} />
        ))}
        {UNIVERSAL_ALARM.map((a, i) => (
          <AlarmCheck key={`u:${i}`} id={`u:${i}`} text={a} on={answers.alarm.includes(`u:${i}`)} onToggle={toggle} muted />
        ))}
      </ul>
      {!canNext ? <p className="mt-3 text-[12.5px] text-pine-900/55">Responda se houve trauma para seguir.</p> : null}
      {canNext ? <NextButton onClick={onNext}>{answers.alarm.length ? "Seguir mesmo assim" : "Nenhum alarme — escolher a condição"}</NextButton> : null}
    </section>
  );
}

function AlarmCheck({ id, text, on, onToggle, muted = false }: { id: string; text: string; on: boolean; onToggle(id: string): void; muted?: boolean }) {
  return (
    <li>
      <label
        className={`flex cursor-pointer gap-2.5 rounded-xl border px-3 py-2 text-[13.5px] ${
          on ? "border-rose-300 bg-rose-50 text-rose-950" : muted ? "border-pine-900/8 bg-white/60 text-pine-900/70" : "border-pine-900/10 bg-white text-pine-900/85"
        }`}
      >
        <input type="checkbox" checked={on} onChange={() => onToggle(id)} className="mt-1 h-4 w-4 shrink-0 accent-rose-700" />
        <span className="min-w-0">{text}</span>
      </label>
    </li>
  );
}

function ConditionStep({
  region,
  trauma,
  bySlug,
  value,
  onPick,
}: {
  region: OrthoRegion;
  trauma: boolean | null;
  bySlug: Map<string, OrthoTopic>;
  value: string | null;
  onPick(slug: string): void;
}) {
  const ordered = orderTopics(region, trauma).map((s) => bySlug.get(s)).filter((t): t is OrthoTopic => !!t);
  return (
    <section>
      <StepTitle hint="leia o resumo e como o paciente fala; escolha a que mais parece">Qual condição combina?</StepTitle>
      <ul className="space-y-2">
        {ordered.map((t) => (
          <li key={t.slug}>
            <button
              type="button"
              aria-pressed={t.slug === value}
              onClick={() => onPick(t.slug)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                t.slug === value ? "border-pine-950 bg-pine-50" : "border-pine-900/10 bg-white hover:border-pine-400 hover:bg-pine-50/40"
              }`}
            >
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[15px] font-extrabold text-pine-950">{t.title}</span>
                {t.cid !== "—" ? <span className="chip bg-pine-50 text-pine-800 tabular-nums">{t.cid}</span> : null}
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-pine-900/75">{t.summary}</span>
              <span className="mt-1 block text-[12px] text-pine-900/50">Como fala: {t.aliases.slice(0, 4).join(" · ")}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] text-pine-900/55">
        Nenhuma combina? Abra o{" "}
        <Link href="/guia/ortopedia" className="font-bold text-pine-600 hover:underline">
          índice do guia
        </Link>{" "}
        e busque por como o paciente descreve.
      </p>
    </section>
  );
}

function ScriptStep({ topic, answers, onChange, onNext }: { topic: OrthoTopic; answers: ConsultAnswers; onChange(a: ConsultAnswers): void; onNext(): void }) {
  const toggleAsk = (i: number) => onChange({ ...answers, ask: answers.ask.includes(i) ? answers.ask.filter((x) => x !== i) : [...answers.ask, i] });
  const setExam = (i: number, r: ExamResult) => onChange({ ...answers, exam: { ...answers.exam, [i]: r } });
  const toggleAlarm = (i: number) =>
    onChange({ ...answers, topicAlarm: answers.topicAlarm.includes(i) ? answers.topicAlarm.filter((x) => x !== i) : [...answers.topicAlarm, i] });
  const toggleRx = (i: number) => onChange({ ...answers, rx: answers.rx.includes(i) ? answers.rx.filter((x) => x !== i) : [...answers.rx, i] });
  const examDone = Object.values(answers.exam).filter((r) => r !== "nd").length;

  return (
    <section className="space-y-6">
      <div>
        <StepTitle hint={`CID ${topic.cid}`}>{topic.title}</StepTitle>
        <p className="rounded-xl bg-pine-50 px-3.5 py-2.5 text-[14px] font-semibold text-pine-950">{topic.summary}</p>
        <p className="mt-1.5 text-[12.5px] text-pine-900/55">
          Página completa:{" "}
          <Link href={`/guia/ortopedia/${topic.slug}`} className="font-bold text-pine-600 hover:underline">
            {topic.title}
          </Link>
        </p>
      </div>

      <Block n={1} title="Pergunte" hint="marque o que o paciente confirmar">
        <ul className="space-y-1.5">
          {topic.ask.map((a, i) => (
            <li key={i}>
              <label className={`flex cursor-pointer gap-2.5 rounded-xl border px-3 py-2 text-[13.5px] ${answers.ask.includes(i) ? "border-pine-400 bg-pine-50" : "border-pine-900/10 bg-white"}`}>
                <input type="checkbox" checked={answers.ask.includes(i)} onChange={() => toggleAsk(i)} className="mt-1 h-4 w-4 shrink-0 accent-pine-700" />
                <span className="min-w-0">{a}</span>
              </label>
            </li>
          ))}
        </ul>
        <textarea
          value={answers.askNote}
          onChange={(e) => onChange({ ...answers, askNote: e.target.value })}
          rows={2}
          placeholder="Observações da anamnese (vão para a nota)"
          className="mt-2 w-full rounded-xl border border-pine-900/12 bg-white px-3 py-2 text-[13.5px] text-pine-950 placeholder:text-pine-900/40"
        />
      </Block>

      <Block n={2} title="Examine" hint={`${examDone} de ${topic.exam.length} manobras registradas`}>
        <ol className="space-y-2">
          {topic.exam.map((e, i) => {
            const r = answers.exam[i];
            return (
              <li key={i} className={`rounded-xl border px-3.5 py-2.5 ${r === "pos" ? "border-amber-300 bg-amber-50/60" : "border-pine-900/10 bg-white"}`}>
                <p className="text-[14px] font-extrabold text-pine-950">{e.name}</p>
                <p className="mt-0.5 text-[13.5px] text-pine-900/85">{e.how}</p>
                <p className="mt-1 text-[12.5px] text-pine-900/60">
                  <span className="mr-1 rounded bg-pine-100 px-1 text-[10px] font-extrabold tracking-wide text-pine-800 uppercase">Positivo</span>
                  {e.positive}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Resultado: ${e.name}`}>
                  {(
                    [
                      ["pos", "Positivo"],
                      ["neg", "Negativo"],
                      ["nd", "Não fiz"],
                    ] as [ExamResult, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={r === v}
                      onClick={() => setExam(i, v)}
                      className={`rounded-full border px-3 py-1.5 text-[12.5px] font-bold pointer-coarse:min-h-10 ${
                        r === v
                          ? v === "pos"
                            ? "border-amber-700 bg-amber-700 text-white"
                            : "border-pine-950 bg-pine-950 text-white"
                          : "border-pine-900/12 bg-white text-pine-900/70 hover:border-pine-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </Block>

      <Block n={3} title="Alarme desta condição" hint="marque se presente">
        <ul className="space-y-1.5">
          {topic.alarm.map((a, i) => (
            <AlarmCheck key={i} id={String(i)} text={a} on={answers.topicAlarm.includes(i)} onToggle={() => toggleAlarm(i)} />
          ))}
        </ul>
      </Block>

      {topic.imaging.length ? (
        <Block n={4} title="Imagem" hint="o que pedir e como escrever">
          <Bullets items={topic.imaging} />
        </Block>
      ) : null}

      <Block n={topic.imaging.length ? 5 : 4} title="Conduta" hint="na urgência, o que fazer e explicar ao paciente">
        <div className="mb-2 rounded-xl border border-pine-200 bg-pine-50 px-3 py-2 text-[13.5px] text-pine-950">
          <b>Na urgência:</b> {topic.urgent[0]}
        </div>
        <Bullets items={topic.plan} />
        {topic.immobilize?.length ? (
          <div className="mt-2 rounded-xl border border-pine-900/10 bg-white px-3 py-2 text-[13.5px]">
            <b className="text-pine-950">Imobilizar:</b> {topic.immobilize.join(" ")}
          </div>
        ) : null}
      </Block>

      {topic.rx.length ? (
        <Block n={topic.imaging.length ? 6 : 5} title="Receita" hint="marque o que vai prescrever — adulto sem comorbidade">
          <ul className="space-y-1.5">
            {topic.rx.map((r, i) => (
              <li key={i}>
                <label className={`flex cursor-pointer gap-2.5 rounded-xl border px-3 py-2 ${answers.rx.includes(i) ? "border-pine-400 bg-pine-50" : "border-pine-900/10 bg-white"}`}>
                  <input type="checkbox" checked={answers.rx.includes(i)} onChange={() => toggleRx(i)} className="mt-1 h-4 w-4 shrink-0 accent-pine-700" />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-extrabold text-pine-950">{r.name}</span>
                    <span className="block text-[13.5px] text-pine-900/85">{r.posology}</span>
                    {r.note ? <span className="mt-0.5 block text-[12.5px] text-pine-900/55">{r.note}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block n={topic.imaging.length ? 7 : 6} title="Cirurgia e regulação, atestado e retorno">
        <Bullets items={topic.refer} />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block text-[12.5px] font-bold text-pine-900/60">
            Atestado (sugestão do guia: {topic.leave})
            <input
              value={answers.leave}
              onChange={(e) => onChange({ ...answers, leave: e.target.value })}
              placeholder={topic.leave}
              className="mt-1 w-full rounded-xl border border-pine-900/12 bg-white px-3 py-2 text-[13.5px] font-normal text-pine-950 placeholder:text-pine-900/40"
            />
          </label>
          <p className="text-[12.5px] font-bold text-pine-900/60">
            Retorno
            <span className="mt-1 block rounded-xl border border-pine-900/8 bg-white/60 px-3 py-2 text-[13.5px] font-normal text-pine-950">{topic.followup}</span>
          </p>
        </div>
      </Block>

      <NextButton onClick={onNext}>Gerar a nota para o prontuário</NextButton>
    </section>
  );
}

function NoteStep({ note, topic, onReset }: { note: string; topic: OrthoTopic; onReset(): void }) {
  const [copied, setCopied] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
    } catch {
      area.current?.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <section>
      <StepTitle hint="copie e cole no atendimento do paciente">Nota SOAP</StepTitle>
      <textarea
        ref={area}
        readOnly
        value={note}
        rows={Math.min(30, note.split("\n").length + 1)}
        className="w-full rounded-2xl border border-pine-900/12 bg-white px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-pine-950"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-full bg-pine-950 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-pine-900 pointer-coarse:min-h-11"
        >
          {copied ? "Copiado ✓" : "Copiar a nota"}
        </button>
        <Link href="/pacientes" className="rounded-full border border-pine-900/12 bg-white px-4 py-2.5 text-[13.5px] font-bold text-pine-900/80 hover:border-pine-400 pointer-coarse:min-h-11">
          Abrir a ficha do paciente
        </Link>
        <Link href={`/guia/ortopedia/${topic.slug}`} className="rounded-full px-3 py-2.5 text-[13.5px] font-bold text-pine-600 hover:underline">
          Reler o tópico
        </Link>
        <button type="button" onClick={onReset} className="ml-auto rounded-full px-3 py-2.5 text-[13.5px] font-bold text-pine-600 hover:underline">
          Nova consulta
        </button>
      </div>
      <p className="mt-3 text-[12.5px] text-pine-900/55">
        Na ficha: Novo atendimento › cole na evolução. Receita, atestado e encaminhamento saem por Emitir documento, com o texto daqui como guia.
      </p>
    </section>
  );
}

function Block({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold tracking-wide text-pine-700 uppercase">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-pine-950 text-[12px] text-white">{n}</span>
        {title}
        {hint ? <span className="text-[11px] font-semibold tracking-normal text-pine-900/45 normal-case">{hint}</span> : null}
      </h3>
      {children}
    </div>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-1.5 text-[13.5px] text-pine-900/85">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-pine-400" />
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  );
}
