import Link from "next/link";
import { sql } from "@/lib/db";
import { simulateStartAction } from "@/lib/actions-whatsapp";
import { botMode, loadContext, readiness } from "@/lib/whatsapp/engine";
import { PageHeader } from "@/components/ui";
import { Feedback } from "@/components/feedback";
import { StageChip, fmtWhen } from "@/components/whatsapp/stage-chip";
import type { Stage } from "@/lib/whatsapp/flow";

/**
 * Simulador: o médico faz o papel do paciente e vê o fluxo inteiro —
 * consentimento, triagem, resumo, cobrança, pagamento, consulta e prontuário —
 * sem a Meta configurada. Nada sai para o WhatsApp; a cobrança só é gerada se
 * a ASAAS estiver em sandbox (em produção, "Simular pagamento" substitui).
 */

const MODE_TEXT = {
  gemini: "Triagem conversada pelo Gemini (plano pago confirmado).",
  questionario: "Questionário fixo, pergunta por pergunta — o Gemini ainda não está liberado (ligue e confirme o plano pago em Configurar).",
  off: "Robô desligado: as mensagens só chegam à caixa. Ligue em Configurar para testar a triagem.",
} as const;

export default async function SimuladorPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const [ctx, recent] = await Promise.all([
    loadContext(),
    sql<{ id: number; stage: Stage; updated_at: string }>`
      SELECT c.id, c.stage, c.updated_at FROM wa_cases c JOIN wa_threads t ON t.id = c.thread_id
      WHERE t.simulated = 1 ORDER BY c.id DESC LIMIT 10`.catch(() => null),
  ]);
  const mode = botMode(ctx.config);
  const ready = readiness();

  return (
    <>
      <PageHeader title="Simulador" subtitle="Teste o atendimento inteiro fazendo o papel do paciente" />
      {erro === "migracao" || recent === null ? (
        <Feedback tone="erro" className="mb-4">
          Falta rodar a migração <code>2026-10-29-whatsapp.sql</code> no Supabase.
        </Feedback>
      ) : null}
      {erro === "envio" ? (
        <Feedback tone="erro" className="mb-4">
          A mensagem simulada não foi registrada. Tente de novo.
        </Feedback>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-bold text-pine-950">Nova conversa simulada</h2>
          <p className="mb-3 text-sm text-pine-900/65">{MODE_TEXT[mode]}</p>
          <form action={simulateStartAction} className="space-y-2">
            <textarea
              name="text"
              rows={3}
              className="input"
              defaultValue="Oi, boa tarde! Estou com dor de garganta e febre desde ontem, queria uma consulta."
            />
            <button type="submit" className="btn btn-primary w-full" disabled={recent === null}>
              Enviar como paciente
            </button>
          </form>
          <ul className="mt-4 space-y-1 text-xs text-pine-900/60">
            <li>WhatsApp (Meta): {ready.cloud ? "configurado" : "ainda não — o simulador funciona sem ele"}</li>
            <li>
              ASAAS: {ready.asaas ? `configurada (${process.env.ASAAS_ENV === "producao" ? "produção — o simulador não gera cobrança real" : "sandbox"})` : "ainda não — use “Simular pagamento”"}
            </li>
            <li>Gemini: {ready.gemini ? "chave presente" : "sem chave"}</li>
          </ul>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold text-pine-950">Simulações recentes</h2>
          {recent?.length ? (
            <ul className="divide-y divide-pine-900/5">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/whatsapp/${r.id}`} className="text-sm font-semibold underline">
                    Atendimento #{r.id}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-pine-900/50">
                    {fmtWhen(r.updated_at)} <StageChip stage={r.stage} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-pine-900/55">Nenhuma ainda.</p>
          )}
          <p className="mt-3 text-xs text-pine-900/55">
            Dica: teste também &quot;estou com dor forte no peito&quot; (urgência), &quot;quero falar com um atendente&quot; e uma correção
            no resumo.
          </p>
        </section>
      </div>
    </>
  );
}
