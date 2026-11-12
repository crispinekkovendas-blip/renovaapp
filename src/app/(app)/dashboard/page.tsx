import Link from "next/link";
import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtDate, fmtDateLong, moneyBR, monthISO, nowHHMM, todayISO } from "@/lib/format";
import { EmptyState, SectionTitle } from "@/components/ui";
import { IconCalendar, IconClock, IconFileText, IconUsers } from "@/components/icons";
import { StatRow, Tile } from "@/components/dashboard/home-cards";
import { IconIdCard, IconPlusCircle } from "@/components/dashboard/icons";
import { NextPatient } from "@/components/dashboard/next-patient";
import { MarsArtwork } from "@/components/mars-art";
import { PortalInbox } from "@/components/dashboard/portal-inbox";
import { PatientQuickSearch } from "@/components/dashboard/patient-quick-search";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import type { TodayAppointment } from "@/components/dashboard/today-appointments";
import { isMuted } from "@/components/agenda/status";
import { nextAppointment } from "@/lib/next-appointment";
import { portalInbox } from "@/lib/hub";
import { countDigitalDocuments } from "@/lib/documents-db";

/**
 * O início é a tela de trabalho: no alto o paciente da vez e a busca, logo
 * abaixo a agenda de hoje e os pedidos do portal; atalhos e números ficam no
 * fim. Dinheiro só para admin/recepção.
 */
export default async function DashboardPage() {
  const today = todayISO();
  const month = monthISO();

  // Tudo independente: uma ida só ao banco, em paralelo.
  const [
    session,
    todayAppointments,
    [{ n: patientCount }],
    [{ total: monthRevenue }],
    [{ total: pendingTotal }],
    recentPatients,
    inbox,
    [clinicRow],
    digitalDocuments,
  ] = await Promise.all([
    getSession(),
    sql<TodayAppointment>`
      SELECT a.id, a.start_time, a.status, a.procedure, a.patient_id, a.professional_id,
        p.name AS patient_name, pr.name AS professional_name, pr.color AS professional_color
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN professionals pr ON pr.id = a.professional_id
      WHERE a.date = ${today}
      ORDER BY a.start_time`,
    sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM patients`,
    sql<{ total: number }>`
      SELECT COALESCE(SUM(amount_cents),0)::int AS total FROM payments
      WHERE status = 'pago' AND substr(paid_at,1,7) = ${month}`,
    sql<{ total: number }>`
      SELECT COALESCE(SUM(amount_cents),0)::int AS total FROM payments WHERE status = 'pendente'`,
    sql<Pick<Patient, "id" | "name" | "social_name" | "insurance" | "created_at">>`
      SELECT id, name, social_name, insurance, created_at FROM patients ORDER BY id DESC LIMIT 5`,
    // Pedidos vindos do portal; [] enquanto a migração 2026-09-07 não rodar.
    portalInbox(),
    sql<{ value: string }>`SELECT value FROM settings WHERE key = 'clinic_name'`.catch(() => [] as { value: string }[]),
    // Papelômetro: documentos e receitas digitais emitidos. Calculado, nunca guardado.
    countDigitalDocuments(),
  ]);
  // O layout (app) já barra quem não tem sessão.
  const { name: userName, role, professionalId } = session!;
  const isAdmin = role === "admin";
  const showsMoney = role !== "profissional";
  const folhas = digitalDocuments ?? 0;

  const active = todayAppointments.filter((a) => !isMuted(a.status));
  const clinicName = clinicRow?.value?.trim() || "Plataforma Shinmed";
  const pending = inbox.length;
  const next = nextAppointment(todayAppointments, nowHHMM(), professionalId);

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Seja bem-vindo(a) ─────────────────────────────────── */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-pine-900/60">Seja bem-vindo(a),</p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight break-words text-pine-950 sm:text-[28px]">
            {userName}
          </h1>
          <p className="mt-1 text-sm text-pine-900/60">
            {fmtDateLong(today)} · {active.length === 1 ? "1 consulta hoje" : `${active.length} consultas hoje`}
            {pending > 0 ? ` · ${pending} ${pending === 1 ? "pedido" : "pedidos"} no portal` : ""}
          </p>
        </div>
        <Link href="/agenda/novo" className="btn btn-outline w-full sm:w-auto">
          + Novo agendamento
        </Link>
      </header>

      {/* ── O paciente da vez e a busca ───────────────────────── */}
      {/* No tema Marte o bloco vira a abertura da página: o desenho do dia atrás
          e o paciente da vez embaixo, em letras grandes. Sem overflow-hidden: a
          lista da busca precisa sair do bloco. */}
      <section className="relative rounded-[24px] bg-peach-100 p-5 sm:p-7 mars:flex mars:min-h-[30rem] mars:flex-col mars:sm:min-h-[25rem] mars:justify-end mars:rounded-[4px] mars:bg-black">
        <MarsArtwork className="rounded-[4px]" />
        <div className="relative">
          <NextPatient next={next} canAttend={role !== "recepcao"} />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PatientQuickSearch />
            <Link href="/pacientes/novo" className="btn btn-outline justify-center bg-white px-5 py-3">
              <IconPlusCircle className="h-4 w-4" />
              Cadastrar paciente
            </Link>
          </div>
        </div>
      </section>

      <TodayAppointments appointments={todayAppointments} />

      <PortalInbox rows={inbox} clinicName={clinicName} />

      {/* ── Atalhos ──────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile href="/pacientes" icon={<IconUsers className="h-5 w-5" />} title="Meus pacientes" hint={`${patientCount} cadastrados`} />
        <Tile href="/agenda" icon={<IconCalendar className="h-5 w-5" />} title="Agenda de hoje" hint={`${active.length} ${active.length === 1 ? "consulta" : "consultas"}`} />
        <Tile href="/conta" icon={<IconIdCard className="h-5 w-5" />} title="Meus dados" hint="Conta e senha" />
        {isAdmin ? (
          <Tile href="/configuracoes/modelos" icon={<IconFileText className="h-5 w-5" />} title="Modelos e protocolos" hint="Textos prontos da clínica" />
        ) : (
          <Tile href="/agenda/retornos" icon={<IconClock className="h-5 w-5" />} title="Retornos a marcar" hint="Quem precisa voltar" />
        )}
      </div>

      {/* ── Números pequenos + pacientes recentes ─────────────── */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section>
          <SectionTitle>Em números</SectionTitle>
          <div className="card divide-y divide-pine-900/5 text-sm">
            <StatRow label="Papel poupado">
              {folhas} {folhas === 1 ? "folha" : "folhas"}
            </StatRow>
            <StatRow label="Pacientes cadastrados">{patientCount}</StatRow>
            {showsMoney ? (
              <>
                <StatRow label="Recebido no mês">{moneyBR(monthRevenue)}</StatRow>
                <StatRow label="A receber">{moneyBR(pendingTotal)}</StatRow>
              </>
            ) : null}
          </div>
        </section>
        <section>
          <SectionTitle>Pacientes recentes</SectionTitle>
          {recentPatients.length === 0 ? (
            <EmptyState title="Nenhum paciente ainda" />
          ) : (
            <div className="card divide-y divide-pine-900/5">
              {recentPatients.map((p) => (
                <Link key={p.id} href={`/pacientes/${p.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-pine-50/60 active:bg-pine-50/60 sm:px-5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{p.social_name?.trim() || p.name}</span>
                    <span className="block text-xs text-pine-900/55">
                      {p.insurance ?? "Particular"} · desde {fmtDate(p.created_at.slice(0, 10))}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-pine-600">ver ficha →</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
