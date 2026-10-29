import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { moneyBR } from "@/lib/format";
import { RETURN_OPTIONS } from "@/lib/recall";
import { digits, phoneVariants } from "@/lib/whatsapp/br";
import { windowOpen } from "@/lib/whatsapp/flow";
import { draftLines, parseDraft } from "@/lib/whatsapp/triage";
import { parseConsultSummary } from "@/lib/whatsapp/summary";
import { getCase, getThread, caseMessages } from "@/lib/whatsapp/store";
import {
  closeCaseAction,
  createPatientFromTriageAction,
  generateSummaryAction,
  linkPatientAction,
  markPaidManualAction,
  resumeTriageAction,
  retryChargeAction,
  saveWhatsappEncounterAction,
  setBotPausedAction,
  simulatePaymentAction,
  simulateSendAction,
  staffSendAction,
  startConsultAction,
} from "@/lib/actions-whatsapp";
import { Feedback } from "@/components/feedback";
import { AutoRefresh } from "@/components/whatsapp/auto-refresh";
import { StageChip, fmtWhen } from "@/components/whatsapp/stage-chip";

/**
 * Um atendimento: a conversa à esquerda; à direita a ficha da triagem, o
 * pagamento, o paciente e o resumo para o prontuário. A ficha é rascunho —
 * só vira prontuário quando o médico salva o atendimento lá embaixo.
 */

const FLASH: Record<string, { tone: "ok" | "erro" | "aviso"; text: string }> = {
  "ok=pago": { tone: "ok", text: "Pagamento registrado e lançado no Financeiro. O paciente foi avisado." },
  "ok=cobranca": { tone: "ok", text: "Link de pagamento enviado ao paciente." },
  "ok=vinculado": { tone: "ok", text: "Conversa vinculada ao paciente." },
  "ok=cadastrado": { tone: "ok", text: "Paciente cadastrado com os dados da triagem." },
  "ok=resumo": { tone: "ok", text: "Resumo sugerido pelo Gemini. Confira e edite antes de salvar." },
  "ok=resumo_triagem": { tone: "aviso", text: "Resumo montado só com a triagem (Gemini desligado ou não confirmado como pago)." },
  "erro=resumo": { tone: "erro", text: "O Gemini não conseguiu resumir agora; o formulário veio com a triagem. Tente de novo em instantes." },
  "erro=janela": {
    tone: "erro",
    text: "Passaram 24 h desde a última mensagem do paciente: a Meta só deixa responder depois que ele escrever de novo (ou com um modelo aprovado).",
  },
  "erro=envio": { tone: "erro", text: "A mensagem não saiu. O motivo aparece embaixo dela, na conversa." },
  "erro=cobranca": { tone: "erro", text: "Não consegui gerar a cobrança. O motivo aparece no quadro Pagamento." },
  "erro=paciente": { tone: "erro", text: "Vincule ou cadastre o paciente antes de salvar no prontuário." },
  "erro=profissional": { tone: "erro", text: "Escolha o profissional do atendimento." },
  "erro=nome": { tone: "erro", text: "A triagem não tem o nome do paciente." },
};

export default async function WhatsappCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireRole("admin", "profissional");
  const { id } = await params;
  const query = await searchParams;
  const current = await getCase(Number(id) || 0).catch(() => null);
  if (!current) notFound();
  const thread = await getThread(current.thread_id);
  if (!thread) notFound();

  const draft = parseDraft(current.triage);
  const cpfDigits = digits(draft.cpf);
  // Lista nunca vazia: o ANY de um array vazio sem tipo confunde o Postgres.
  const variants = (thread.simulated ? [] : phoneVariants(thread.phone)).concat("-");
  const [messages, patient, candidates, professionals] = await Promise.all([
    caseMessages(current.id),
    thread.patient_id
      ? sql<{ id: number; name: string; allergies: string | null }>`
          SELECT id, name, allergies FROM patients WHERE id = ${thread.patient_id}`.then((r) => r[0] ?? null)
      : Promise.resolve(null),
    thread.patient_id
      ? Promise.resolve([])
      : sql<{ id: number; name: string; cpf: string | null; phone: string | null; birth_date: string | null }>`
          SELECT id, name, cpf, phone, birth_date FROM patients
          WHERE (${cpfDigits.length === 11} AND regexp_replace(coalesce(cpf, ''), '\\D', '', 'g') = ${cpfDigits})
             OR regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = ANY(${variants})
             OR (${Boolean(draft.nome)} AND lower(name) = lower(${draft.nome ?? ""}))
          ORDER BY id DESC LIMIT 5`,
    sql<{ id: number; name: string }>`SELECT id, name FROM professionals WHERE active = 1 ORDER BY name`,
  ]);
  if (thread.unread) await sql`UPDATE wa_threads SET unread = 0 WHERE id = ${thread.id}`;

  const summary = current.summary ? parseConsultSummary(current.summary) : null;
  const flashKey = Object.entries(query).map(([k, v]) => `${k}=${v}`).find((k) => FLASH[k]);
  const flash = flashKey ? FLASH[flashKey] : null;
  const name = patient?.name || draft.nome || thread.contact_name || thread.phone;
  const open = thread.simulated === 1 || windowOpen(thread.last_inbound_at);
  const lastBot = [...messages].reverse().find((m) => m.direction === "out" && m.author === "robo");
  const quickButtons = lastBot ? [...lastBot.body.matchAll(/\[([^\]\n]{1,20})\]/g)].map((m) => m[1]) : [];
  const caseField = <input type="hidden" name="case_id" value={current.id} />;
  const defaultProfessional = current.professional_id ?? session.professionalId ?? undefined;

  return (
    <>
      <AutoRefresh seconds={5} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/whatsapp" className="btn btn-ghost">
          ← Conversas
        </Link>
        <h1 className="font-display text-xl font-semibold text-pine-950 sm:text-2xl">{name}</h1>
        <StageChip stage={current.stage} />
        {thread.simulated ? <span className="chip bg-slate-100 text-slate-600">simulação — nada sai para o WhatsApp</span> : null}
        {current.bot_paused ? <span className="chip bg-clay-100 text-clay-800">robô pausado</span> : null}
      </div>

      {flash ? (
        <Feedback tone={flash.tone} className="mb-4">
          {flash.text}
        </Feedback>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* ---------- Conversa ---------- */}
        <section className="card flex min-h-[60vh] flex-col overflow-hidden">
          <header className="border-b border-pine-900/10 px-4 py-2.5 text-xs text-pine-900/60">
            {thread.simulated ? "Conversa simulada" : `WhatsApp ${thread.phone}`}
            {thread.contact_name ? ` · perfil: ${thread.contact_name}` : ""}
          </header>
          <ol className="flex-1 space-y-2 overflow-y-auto bg-pine-50/40 px-3 py-4 sm:px-4">
            {messages.map((m) => {
              const mine = m.direction === "out";
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? m.author === "equipe"
                          ? "bg-pine-700 text-white"
                          : "bg-white text-pine-950 ring-1 ring-pine-900/10"
                        : "bg-emerald-50 text-pine-950 ring-1 ring-emerald-900/10"
                    }`}
                  >
                    <p className={`mb-0.5 text-[11px] font-semibold ${mine && m.author === "equipe" ? "text-white/70" : "text-pine-900/50"}`}>
                      {m.author === "paciente" ? "Paciente" : m.author === "robo" ? "Robô" : m.author === "equipe" ? "Equipe" : "Sistema"} ·{" "}
                      {fmtWhen(m.created_at)}
                      {mine && m.status ? ` · ${m.status}` : ""}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    {m.media_id ? (
                      m.kind === "audio" ? (
                        <audio controls preload="none" src={`/api/whatsapp/media/${m.id}`} className="mt-1 w-56 max-w-full" />
                      ) : (
                        <a href={`/api/whatsapp/media/${m.id}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold underline">
                          Abrir {m.kind === "image" ? "imagem" : "arquivo"}
                        </a>
                      )
                    ) : null}
                    {m.error ? <p className="mt-1 text-xs font-semibold text-rose-600">Não enviada: {m.error}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>

          {thread.simulated ? (
            <div className="border-t border-pine-900/10 bg-slate-50 px-3 py-3 sm:px-4">
              <p className="mb-2 text-xs font-semibold text-slate-600">Responder como o PACIENTE (simulação)</p>
              {quickButtons.length ? (
                <form action={simulateSendAction} className="mb-2 flex flex-wrap gap-2">
                  {caseField}
                  {quickButtons.map((b) => (
                    <button key={b} type="submit" name="button" value={b} className="btn btn-outline">
                      {b}
                    </button>
                  ))}
                </form>
              ) : null}
              <form action={simulateSendAction} className="flex gap-2">
                {caseField}
                <textarea name="text" rows={2} required className="input min-h-0 flex-1" placeholder="Mensagem do paciente…" />
                <button type="submit" className="btn btn-outline self-end">
                  Enviar
                </button>
              </form>
            </div>
          ) : null}

          <form action={staffSendAction} className="border-t border-pine-900/10 px-3 py-3 sm:px-4">
            {caseField}
            <p className="mb-2 text-xs font-semibold text-pine-900/60">
              Mensagem da equipe / do médico
              {!open ? <span className="ml-1 text-rose-700">— janela de 24 h fechada: espere o paciente escrever</span> : null}
            </p>
            <div className="flex gap-2">
              <textarea name="text" rows={2} required disabled={!open} className="input min-h-0 flex-1" placeholder="Escreva para o paciente…" />
              <button type="submit" disabled={!open} className="btn btn-primary self-end">
                Enviar
              </button>
            </div>
          </form>
        </section>

        {/* ---------- Lateral ---------- */}
        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-2 text-sm font-bold text-pine-950">Próximo passo</h2>
            <div className="flex flex-wrap gap-2">
              {current.stage === "pago" ? (
                <form action={startConsultAction}>
                  {caseField}
                  <button type="submit" className="btn btn-primary">
                    Iniciar consulta
                  </button>
                </form>
              ) : null}
              {current.stage === "urgente" ? (
                <form action={resumeTriageAction}>
                  {caseField}
                  <button type="submit" className="btn btn-outline" title="Depois de avaliar: o robô continua a triagem">
                    Não é urgência — retomar triagem
                  </button>
                </form>
              ) : null}
              {["consentimento", "triagem", "revisao", "pagamento", "pago"].includes(current.stage) ? (
                <form action={setBotPausedAction}>
                  {caseField}
                  <input type="hidden" name="paused" value={current.bot_paused ? "0" : "1"} />
                  <button type="submit" className="btn btn-ghost">
                    {current.bot_paused ? "Religar o robô" : "Pausar o robô (assumir)"}
                  </button>
                </form>
              ) : null}
              {current.stage !== "encerrado" ? (
                <form action={closeCaseAction}>
                  {caseField}
                  <button type="submit" className="btn btn-ghost">
                    Encerrar sem salvar
                  </button>
                </form>
              ) : null}
            </div>
            {current.last_error ? <p className="mt-2 text-xs text-clay-800">Último aviso: {current.last_error}</p> : null}
          </section>

          {current.stage === "pagamento" || current.stage === "revisao" || current.paid_at ? (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-bold text-pine-950">Pagamento</h2>
              <p className="text-sm text-pine-900/70">
                {current.price_cents ? moneyBR(current.price_cents) : "Sem valor definido"}
                {current.paid_at ? ` · pago em ${fmtWhen(current.paid_at)}` : " · aguardando"}
              </p>
              {current.payment_url ? (
                <p className="mt-1 break-all text-xs">
                  <a href={current.payment_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                    Link da cobrança (ASAAS)
                  </a>
                </p>
              ) : null}
              {current.payment_id ? (
                <p className="mt-1 text-xs text-pine-900/60">
                  Lançado no <Link href="/financeiro" className="underline">Financeiro</Link>.
                </p>
              ) : null}
              {!current.paid_at ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {current.stage === "pagamento" ? (
                    <form action={retryChargeAction}>
                      {caseField}
                      <button type="submit" className="btn btn-outline">
                        {current.payment_url ? "Reenviar cobrança nova" : "Gerar cobrança"}
                      </button>
                    </form>
                  ) : null}
                  <form action={markPaidManualAction} className="flex gap-2">
                    {caseField}
                    <select name="method" className="input w-auto" defaultValue="pix">
                      <option value="pix">Pix</option>
                      <option value="cartão de crédito">Cartão</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cortesia">Cortesia</option>
                    </select>
                    <button type="submit" className="btn btn-ghost">
                      Marcar como pago
                    </button>
                  </form>
                  {thread.simulated ? (
                    <form action={simulatePaymentAction}>
                      {caseField}
                      <button type="submit" className="btn btn-ghost">
                        Simular pagamento confirmado
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="card p-4">
            <h2 className="mb-2 text-sm font-bold text-pine-950">Ficha da triagem <span className="font-normal text-pine-900/50">(rascunho)</span></h2>
            {draft.alertas?.length ? (
              <ul className="mb-2 space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {draft.alertas.map((a) => (
                  <li key={a}>⚠ {a}</li>
                ))}
              </ul>
            ) : null}
            {draftLines(draft).length ? (
              <ul className="space-y-1 text-sm text-pine-950">
                {draftLines(draft).map((line) => {
                  const [label, ...rest] = line.replace(/^\*/, "").split(":* ");
                  return (
                    <li key={line}>
                      <span className="font-semibold">{label}:</span> {rest.join(":* ")}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-pine-900/55">Ainda vazia — o robô preenche conforme o paciente responde.</p>
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-2 text-sm font-bold text-pine-950">Paciente</h2>
            {patient ? (
              <p className="text-sm">
                <Link href={`/pacientes/${patient.id}`} className="font-semibold underline">
                  {patient.name}
                </Link>
                {patient.allergies ? <span className="block text-xs text-rose-700">Alergias no cadastro: {patient.allergies}</span> : null}
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {candidates.length ? (
                  <>
                    <p className="text-xs text-pine-900/60">Já existe no Renova? (mesmo CPF, telefone ou nome)</p>
                    {candidates.map((c) => (
                      <form key={c.id} action={linkPatientAction} className="flex items-center justify-between gap-2">
                        {caseField}
                        <input type="hidden" name="patient_id" value={c.id} />
                        <span className="min-w-0 text-xs">
                          <b>{c.name}</b>
                          {c.cpf ? ` · ${c.cpf}` : ""}
                          {c.phone ? ` · ${c.phone}` : ""}
                        </span>
                        <button type="submit" className="btn btn-outline shrink-0">
                          É este
                        </button>
                      </form>
                    ))}
                  </>
                ) : null}
                <form action={createPatientFromTriageAction} className="flex flex-wrap items-center gap-2">
                  {caseField}
                  <input name="name" defaultValue={draft.nome ?? ""} className="input min-w-0 flex-1" placeholder="Nome completo" />
                  <button type="submit" className="btn btn-outline">
                    Cadastrar com a ficha
                  </button>
                </form>
              </div>
            )}
          </section>

          <section id="resumo" className="card p-4">
            <h2 className="mb-1 text-sm font-bold text-pine-950">Resumo para o prontuário</h2>
            <p className="mb-2 text-xs text-pine-900/55">
              O Gemini lê a triagem e a conversa a partir de &quot;Iniciar consulta&quot; e sugere o atendimento. Nada é salvo até você
              clicar em Salvar.
            </p>
            <form action={generateSummaryAction}>
              {caseField}
              <button type="submit" className="btn btn-outline w-full">
                {summary ? "Gerar o resumo de novo" : "Gerar resumo da consulta"}
              </button>
            </form>

            {summary ? (
              <form action={saveWhatsappEncounterAction} className="mt-3 space-y-2 text-sm">
                {caseField}
                <label className="block">
                  <span className="text-xs font-semibold">Profissional</span>
                  <select name="professional_id" className="input" defaultValue={defaultProfessional} required>
                    <option value="">Escolha…</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    ["complaint", "Queixa", summary.queixa, 2],
                    ["anamnesis", "Anamnese", summary.anamnese, 6],
                    ["exam", "Exame / dados informados", summary.exame, 3],
                    ["diagnosis", "Hipótese diagnóstica", summary.diagnostico, 2],
                    ["plan", "Conduta", summary.conduta, 4],
                    ["prescription", "Prescrição (o que o médico prescreveu)", summary.prescricao, 4],
                    ["allergies", "Alergias (somam ao cadastro; uma por linha)", summary.alergias.join("\n"), 2],
                    ["medications", "Medicamentos em uso (somam ao cadastro)", summary.medicamentos.join("\n"), 2],
                  ] as const
                ).map(([field, label, value, rows]) => (
                  <label key={field} className="block">
                    <span className="text-xs font-semibold">{label}</span>
                    <textarea name={field} rows={rows} defaultValue={value} className="input" />
                  </label>
                ))}
                <div className="flex gap-2">
                  <label className="block flex-1">
                    <span className="text-xs font-semibold">CID-10</span>
                    <input name="cid" defaultValue={summary.cid} className="input" />
                  </label>
                  <label className="block flex-1">
                    <span className="text-xs font-semibold">Retorno</span>
                    <select name="return_days" className="input" defaultValue={summary.retornoDias ?? 0}>
                      {RETURN_OPTIONS.map((o) => (
                        <option key={o.days} value={o.days}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {summary.alertas.length ? (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    Alertas: {summary.alertas.join(" · ")}
                  </p>
                ) : null}
                {!patient ? (
                  <p className="text-xs font-semibold text-rose-700">Vincule ou cadastre o paciente (quadro acima) antes de salvar.</p>
                ) : null}
                <button type="submit" disabled={!patient} className="btn btn-primary w-full">
                  Salvar no prontuário e encerrar
                </button>
                {patient ? (
                  <p className="text-xs text-pine-900/55">
                    Para emitir a receita assinada, use{" "}
                    <Link href={`/pacientes/${patient.id}/emitir`} className="underline">
                      Emitir documentos
                    </Link>{" "}
                    do paciente.
                  </p>
                ) : null}
              </form>
            ) : null}
          </section>
        </aside>
      </div>
    </>
  );
}
