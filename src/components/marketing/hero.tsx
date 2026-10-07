import Link from "next/link";
import { REFRAIN } from "./refrain";
import { Tick } from "./icons";
import { FOCUS_RING } from "./site-header";

/** Só o que o agendamento online de fato garante hoje. */
const PROMISES = [
  "Sem cadastro e sem senha",
  "Você vê só os horários livres",
  "Confirmação pelo WhatsApp",
] as const;

/**
 * A abertura da página: o que dá para fazer aqui (marcar consulta pelo
 * celular), o botão, e as garantias logo abaixo dele. Server Component —
 * nada aqui precisa de JS. A ilustração da direita é decorativa e só
 * aparece no computador: no celular, o botão fica dentro da primeira tela.
 */
export function Hero({ clinicName }: { clinicName: string }) {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="relative overflow-hidden bg-peach-100"
      style={{
        backgroundImage:
          "radial-gradient(60rem 30rem at 85% -10%, rgba(255,255,255,0.7), transparent 60%), radial-gradient(40rem 24rem at -10% 110%, rgba(255,205,181,0.8), transparent 60%)",
      }}
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-pine-800 shadow-sm">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-pine-500" />
            <span className="truncate">Agendamento online · {clinicName}</span>
          </p>

          <h1
            id="hero-titulo"
            className="mt-5 font-display text-[2.5rem] font-semibold leading-[1.04] tracking-tight text-pine-950 sm:text-6xl lg:text-[4.25rem]"
          >
            Marque sua consulta pelo celular, sem ligar e sem esperar.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-pine-900/75">
            Escolha o profissional, o dia e um horário livre. Depois, a clínica confirma tudo pelo seu WhatsApp.
          </p>
          <p className="mt-4 font-display text-2xl italic text-pine-800">{REFRAIN}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/agendar" className="btn-hero">
              Agendar consulta
              <span className="chev" aria-hidden="true" />
            </Link>
            <a href="#ja-sou-paciente" className="btn-hero-secondary">
              Já tenho consulta
              <span className="chev" aria-hidden="true" />
            </a>
          </div>

          <ul className="mt-6 flex flex-col gap-2 text-sm font-bold text-pine-900/75 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine-950 text-white">
                  <Tick className="h-3 w-3" />
                </span>
                {promise}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-pine-900/55">
            Seus dados são usados só para agendar e confirmar a consulta.{" "}
            <Link href="/privacidade" className={`font-bold underline underline-offset-2 ${FOCUS_RING}`}>
              Política de privacidade
            </Link>
          </p>
        </div>

        <BookingIllustration />
      </div>
    </section>
  );
}

const DEMO_DAYS = [
  { weekday: "Seg", day: "12" },
  { weekday: "Ter", day: "13", selected: true },
  { weekday: "Qua", day: "14" },
  { weekday: "Qui", day: "15" },
];
const DEMO_TIMES = ["08:30", "09:00", "10:30", "14:00", "15:30", "16:00"];

/**
 * Um esboço da tela de agendamento (dia → horário → pronto), desenhado em
 * HTML: sem imagem para baixar e sem nenhum nome ou dado de verdade.
 */
function BookingIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-md select-none lg:block">
      <div className="rounded-[2.5rem] border border-pine-900/10 bg-white p-6 shadow-[0_40px_80px_-32px_rgba(12,34,28,0.35)]">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-semibold text-pine-950">Escolha o horário</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pine-900/45">Passo 2 de 3</p>
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="h-1.5 flex-1 rounded-full bg-pine-700" />
          <span className="h-1.5 flex-1 rounded-full bg-pine-700" />
          <span className="h-1.5 flex-1 rounded-full bg-pine-900/10" />
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {DEMO_DAYS.map((d) => (
            <div
              key={d.day}
              className={`rounded-2xl px-2 py-3 text-center ${
                d.selected ? "bg-pine-950 text-white" : "border border-pine-900/10 text-pine-950"
              }`}
            >
              <p className={`text-[10px] font-bold uppercase ${d.selected ? "text-white/70" : "text-pine-900/50"}`}>
                {d.weekday}
              </p>
              <p className="font-display text-lg font-semibold">{d.day}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-pine-900/45">Horários livres</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DEMO_TIMES.map((t) => (
            <div
              key={t}
              className={`rounded-xl py-2.5 text-center text-sm font-bold ${
                t === "10:30" ? "bg-sun-400 text-pine-950" : "bg-pine-50 text-pine-900"
              }`}
            >
              {t}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-full bg-pine-950 py-3 text-center text-sm font-bold text-white">Continuar</div>
      </div>

      <div className="absolute -bottom-[4.5rem] -left-8 flex max-w-[16rem] items-start gap-3 rounded-3xl rounded-bl-md bg-white p-4 shadow-[0_20px_48px_-16px_rgba(12,34,28,0.4)]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Tick />
        </span>
        <p className="text-sm leading-snug text-pine-950">
          <span className="font-bold">Consulta solicitada.</span> A clínica confirma pelo WhatsApp.
        </p>
      </div>
    </div>
  );
}
