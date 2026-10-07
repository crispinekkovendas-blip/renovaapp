import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "@/lib/db";
import type { Professional } from "@/lib/db";
import { fmtDateLong } from "@/lib/format";
import { parseBookingParams } from "@/lib/booking-slots";
import { getPublicClinic, publicMetadata } from "@/lib/marketing-stats";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata({
    title: "Consulta solicitada",
    description: "Seu pedido de agendamento foi recebido.",
    path: "/agendar/confirmado",
    index: false,
  });
}

/**
 * Depois do agendamento: o resumo do que foi pedido e o que acontece agora.
 * Os parâmetros vêm do redirect da ação; sem eles (o honeypot também cai
 * aqui), só a mensagem geral aparece.
 */
export default async function BookingConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ prof?: string; date?: string; time?: string }>;
}) {
  const { profId, date, time } = parseBookingParams(await searchParams);

  const [[professional], clinic] = await Promise.all([
    profId
      ? sql<Pick<Professional, "name" | "specialty">>`SELECT name, specialty FROM professionals WHERE id = ${profId}`
      : Promise.resolve([] as Pick<Professional, "name" | "specialty">[]),
    getPublicClinic(),
  ]);

  return (
    <>
      <SiteHeader clinicName={clinic.name} width="max-w-3xl" />

      <main className="min-h-[70vh] bg-paper">
        <div className="mx-auto max-w-md px-4 py-8 sm:px-6 sm:py-12">
          <div className="card p-6 text-center sm:p-8" role="status">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-emerald-700"
                aria-hidden
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-pine-950">Consulta solicitada!</h1>
            {professional && date && time ? (
              <div className="mt-4 rounded-2xl bg-pine-50 p-4 text-sm">
                <p className="font-bold text-pine-950">{professional.name}</p>
                {professional.specialty?.trim() ? <p className="text-pine-900/70">{professional.specialty}</p> : null}
                <p className="mt-2 text-pine-900/70">
                  {fmtDateLong(date)} às <strong className="text-pine-950">{time}</strong>
                </p>
              </div>
            ) : null}
          </div>

          <section aria-labelledby="proximos-passos" className="mt-8">
            <h2 id="proximos-passos" className="label">
              E agora?
            </h2>
            <ol className="mt-3 space-y-3">
              <NextStep n={1}>
                A <strong className="text-pine-950">{clinic.name}</strong> confirma seu horário pelo WhatsApp que você
                informou.
              </NextStep>
              <NextStep n={2}>
                Antes da consulta, chega um lembrete com o link para confirmar presença ou avisar que não poderá ir.
              </NextStep>
              <NextStep n={3}>Precisa remarcar? É só responder a mensagem da clínica.</NextStep>
            </ol>
          </section>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Link href="/" className="btn btn-primary min-h-11 flex-1">
              Voltar ao início
            </Link>
            <Link href="/agendar" className="btn btn-outline min-h-11 flex-1">
              Fazer outro agendamento
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter clinicName={clinic.name} compact />
    </>
  );
}

function NextStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed text-pine-900/75">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-950 text-xs font-bold text-white"
      >
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
