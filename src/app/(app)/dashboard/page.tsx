import Link from "next/link";
import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtDate, fmtDateLong, moneyBR, monthISO, todayISO } from "@/lib/format";
import { EmptyState, SectionTitle } from "@/components/ui";
import { IconCalendar, IconClock, IconFileText, IconSearch, IconStethoscope, IconUsers } from "@/components/icons";
import { FeatureCard, StatRow, Tile } from "@/components/dashboard/home-cards";
import { IconIdCard, IconPhone, IconPlusCircle } from "@/components/dashboard/icons";
import { PortalInbox } from "@/components/dashboard/portal-inbox";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import type { TodayAppointment } from "@/components/dashboard/today-appointments";
import { isMuted } from "@/components/agenda/status";
import { portalInbox } from "@/lib/hub";
import { countDigitalDocuments } from "@/lib/documents-db";

// Largura de cada slide do carrossel no celular: mostra a pontinha do próximo, convidando a deslizar.
const FEATURE_SLIDE = "w-[82%] shrink-0 snap-start md:w-auto";

/**
 * Início à moda Mevo: "Seja bem-vindo(a)", o cartão rosa "Começar a atender!"
 * com a busca do paciente e "Cadastrar paciente", três cards de benefício,
 * os atalhos quadrados e, abaixo, o que a clínica precisa todo dia: a caixa
 * de entrada do portal e a agenda de hoje. Dinheiro só para admin/recepção.
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
      SELECT a.id, a.start_time, a.status, a.procedure, a.patient_id,
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
  const { name: userName, role } = session!;
  const isAdmin = role === "admin";
  const showsMoney = role !== "profissional";
  const folhas = digitalDocuments ?? 0;

  const active = todayAppointments.filter((a) => !isMuted(a.status));
  const clinicName = clinicRow?.value?.trim() || "Clínica Renova";
  const pending = inbox.length;

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

      {/* ── Começar a atender! ───────────────────────────────── */}
      <section className="rounded-[24px] bg-peach-100 p-5 sm:p-7">
        <h2 className="text-[22px] font-extrabold sm:text-[26px] leading-tight tracking-tight text-pine-950">Começar a atender!</h2>
        <p className="mt-2 max-w-xl text-sm text-pine-950/75">
          Busque um paciente pelo nome, CPF ou telefone — ou cadastre o primeiro e comece o atendimento.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <form action="/pacientes" method="get" role="search" className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-sm">
            <IconSearch className="h-4 w-4 shrink-0 text-pine-900/50" />
            {/* 16px no celular: abaixo disso o iOS dá zoom ao focar. */}
            <input
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-pine-900/45 sm:text-sm"
              type="search"
              name="q"
              placeholder="Buscar paciente…"
              aria-label="Buscar paciente"
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" className="btn btn-primary px-4 py-1.5 text-xs">
              Buscar
            </button>
          </form>
          <Link href="/pacientes/novo" className="btn btn-primary justify-center px-5 py-3">
            <IconPlusCircle className="h-4 w-4" />
            Cadastrar paciente
          </Link>
        </div>
      </section>

      {/* ── Três benefícios (como a home da Mevo) ─────────────── */}
      {/* No celular, um carrossel que desliza de lado em vez de três cartões empilhados. */}
      <div className="scroll-x -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        <FeatureCard
          className={FEATURE_SLIDE}
          icon={<IconFileText className="h-5 w-5" />}
          title="Menos cliques, mais agilidade"
        >
          Crie e salve <b className="text-pine-950">modelos e protocolos</b> para emitir atestado, encaminhamento e orientações num passo só.
        </FeatureCard>
        <FeatureCard className={FEATURE_SLIDE} icon={<IconStethoscope className="h-5 w-5" />} title="Tudo num lugar só">
          Receita digital pela <b className="text-pine-950">Memed</b>, atestados e laudos com <b className="text-pine-950">código de autenticidade</b>, prontuário e agenda.
        </FeatureCard>
        <FeatureCard
          className={FEATURE_SLIDE}
          icon={<IconPhone className="h-5 w-5" />}
          title="Comodidade para o seu paciente"
        >
          O paciente recebe <b className="text-pine-950">tudo no celular</b>: o portal, o WhatsApp, os lembretes e a confirmação da consulta.
        </FeatureCard>
      </div>

      {/* ── Atalhos ──────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile href="/pacientes" icon={<IconUsers className="h-5 w-5" />} title="Meus pacientes" hint={`${patientCount} cadastrados`} />
        <Tile href="/agenda" icon={<IconCalendar className="h-5 w-5" />} title="Agenda de hoje" hint={`${active.length} ${active.length === 1 ? "consulta" : "consultas"}`} />
        <Tile href="/conta" icon={<IconIdCard className="h-5 w-5" />} title="Meus dados" hint="Conta e senha" />
        {isAdmin ? (
          <Tile href="/configuracoes/modelos" icon={<IconFileText className="h-5 w-5" />} title="Modelos e protocolos" hint="Textos prontos da clínica" />
        ) : (
          <Tile href="/agenda/retornos" icon={<IconClock className="h-5 w-5" />} title="Retornos a marcar" hint="Quem precisa voltar" />
        )}
      </div>

      <PortalInbox rows={inbox} clinicName={clinicName} />

      <TodayAppointments appointments={todayAppointments} />

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
