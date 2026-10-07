"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { WEEKDAY_SHORT_PT } from "@/lib/week";
import { StatusBadge } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import type { WeekAppointment } from "@/components/agenda/week-grid";
import { byStartTime } from "@/components/agenda/slots";
import { isMuted } from "@/components/agenda/status";

/**
 * Semana no celular: uma faixa com os sete dias (toque para escolher) e,
 * embaixo, a lista do dia escolhido. Sete colunas de 140px não cabem na tela,
 * e rolar a grade em duas direções com o dedo é ruim — assim cada toque vale
 * um dia inteiro, e a troca de dia é instantânea (sem ida ao servidor).
 */
export function WeekDayList({
  days,
  appointments,
  today,
  profId,
}: {
  /** Sete datas ISO, de segunda a domingo. */
  days: string[];
  appointments: WeekAppointment[];
  today: string;
  profId?: number;
}) {
  const byDay = new Map<string, WeekAppointment[]>();
  for (const day of days) byDay.set(day, []);
  for (const a of byStartTime(appointments)) byDay.get(a.date.slice(0, 10))?.push(a);

  // Abre em hoje (se estiver na semana); senão, no primeiro dia com agendamento.
  const initial = days.includes(today) ? today : (days.find((d) => (byDay.get(d)?.length ?? 0) > 0) ?? days[0]);
  const [selected, setSelected] = useState(initial);
  const list = byDay.get(selected) ?? [];
  const profQuery = profId ? `&prof=${profId}` : "";

  return (
    <div>
      <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Dia da semana">
        {days.map((day, i) => {
          const active = day === selected;
          const isToday = day === today;
          const count = (byDay.get(day) ?? []).filter((a) => !isMuted(a.status)).length;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="semana-dia"
              aria-label={`${WEEKDAY_SHORT_PT[i]} ${fmtDate(day)}: ${count} ${count === 1 ? "agendamento" : "agendamentos"}`}
              onClick={() => setSelected(day)}
              className={`flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl text-center transition-colors ${
                active
                  ? "bg-pine-950 text-white"
                  : isToday
                    ? "bg-clay-50 text-clay-800 ring-1 ring-clay-200"
                    : "bg-white text-pine-950 ring-1 ring-pine-900/10"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase ${active ? "text-white/70" : "text-pine-900/50"}`}>
                {WEEKDAY_SHORT_PT[i]}
              </span>
              <span className="text-base font-extrabold tabular-nums leading-none">{day.slice(8, 10)}</span>
              {/* Ponto por dia com consulta (máx. 3) — dá para ver a semana de relance. */}
              <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                {Array.from({ length: Math.min(count, 3) }).map((_, k) => (
                  <span key={k} className={`h-1 w-1 rounded-full ${active ? "bg-white" : "bg-pine-600"}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div id="semana-dia" role="tabpanel" className="mt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="min-w-0 text-sm font-bold text-pine-950">
            {WEEKDAY_SHORT_PT[days.indexOf(selected)]}, {fmtDate(selected)}
            <span className="font-semibold text-pine-900/55">
              {" · "}
              {list.length === 0 ? "livre" : `${list.length} ${list.length === 1 ? "agendamento" : "agendamentos"}`}
            </span>
          </p>
          <Link
            href={`/agenda?date=${selected}${profQuery}`}
            className="inline-flex min-h-11 shrink-0 items-center px-2 text-xs font-bold text-pine-600 hover:underline"
          >
            Abrir o dia →
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-pine-900/55">Nenhum agendamento neste dia.</div>
        ) : (
          <div className="card divide-y divide-pine-900/5 overflow-hidden">
            {list.map((a) => {
              const muted = isMuted(a.status);
              return (
                <Link
                  key={a.id}
                  href={`/pacientes/${a.patient_id}`}
                  className={`flex min-h-16 min-w-0 items-center gap-3 px-4 py-3 transition-colors active:bg-pine-50 ${
                    muted ? "opacity-50" : ""
                  }`}
                >
                  <span className="w-12 shrink-0 text-sm font-extrabold tabular-nums text-pine-950">
                    {a.start_time.slice(0, 5)}
                  </span>
                  <span
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: a.professional_color ?? "#3f6b58" }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-bold text-pine-950 ${
                        muted ? "line-through decoration-pine-900/30" : ""
                      }`}
                    >
                      {a.patient_name ?? "Paciente"}
                    </span>
                    <span className="block truncate text-xs text-pine-900/55">
                      {[
                        `até ${a.end_time.slice(0, 5)}`,
                        profId ? null : a.professional_name,
                        a.procedure,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <StatusBadge status={a.status} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <Link
          href={`/agenda/novo?date=${selected}${profQuery}`}
          className="btn btn-outline mt-3 w-full justify-center"
        >
          <IconPlus className="h-4 w-4" />
          Agendar neste dia
        </Link>
      </div>
    </div>
  );
}
