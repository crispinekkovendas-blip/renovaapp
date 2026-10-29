import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { moneyBR } from "@/lib/format";
import { publicBaseUrl } from "@/lib/marketing-stats";
import { saveWhatsappConfigAction } from "@/lib/actions-whatsapp";
import { missingAsaasEnv } from "@/lib/whatsapp/asaas";
import { missingCloudEnv } from "@/lib/whatsapp/cloud";
import { botMode, loadContext } from "@/lib/whatsapp/engine";
import { PageHeader } from "@/components/ui";
import { Feedback } from "@/components/feedback";

/**
 * Configurar o atendimento pelo WhatsApp: o que falta na Vercel (só os nomes
 * das variáveis — os valores nunca aparecem), os endereços dos webhooks para
 * colar na Meta e na ASAAS, e os ajustes do robô (preço, textos, instruções).
 */

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className={ok ? "text-emerald-700" : "text-rose-700"}>{ok ? "✓" : "✗"}</span>
      <span>{children}</span>
    </li>
  );
}

export default async function ConfigurarPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const session = await requireRole("admin", "profissional");
  const { ok } = await searchParams;
  const [ctx, professionals, base] = await Promise.all([
    loadContext(),
    sql<{ id: number; name: string }>`SELECT id, name FROM professionals WHERE active = 1 ORDER BY name`,
    publicBaseUrl(),
  ]);
  const { config } = ctx;
  const cloudMissing = missingCloudEnv();
  const asaasMissing = missingAsaasEnv();
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const mode = botMode(config);
  const admin = session.role === "admin";
  const origin = base.replace(/\/$/, "");

  return (
    <>
      <PageHeader title="Configurar o WhatsApp" subtitle="Chaves, webhooks e o jeito do robô conversar" />
      {ok === "salvo" ? (
        <Feedback tone="ok" className="mb-4">
          Ajustes salvos.
        </Feedback>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold text-pine-950">1. Chaves na Vercel</h2>
          <p className="mb-2 text-xs text-pine-900/60">
            Vercel › renovaapp › Settings › Environment Variables (Production e Preview). Depois de adicionar, faça um novo deploy.
          </p>
          <ul className="space-y-1 text-sm">
            {["WHATSAPP_TOKEN", "WHATSAPP_APP_SECRET", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"].map((name) => (
              <Check key={name} ok={!cloudMissing.includes(name)}>
                <code>{name}</code>
              </Check>
            ))}
            <Check ok={!asaasMissing.includes("ASAAS_API_KEY")}>
              <code>ASAAS_API_KEY</code>
            </Check>
            <Check ok={!asaasMissing.includes("ASAAS_WEBHOOK_TOKEN")}>
              <code>ASAAS_WEBHOOK_TOKEN</code>
            </Check>
            <Check ok={Boolean(process.env.ASAAS_ENV)}>
              <code>ASAAS_ENV</code> = {process.env.ASAAS_ENV === "producao" ? "producao" : "sandbox (padrão)"}
            </Check>
            <Check ok={gemini}>
              <code>GEMINI_API_KEY</code>
            </Check>
          </ul>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold text-pine-950">2. Webhooks</h2>
          <p className="text-xs font-semibold text-pine-900/70">Meta (WhatsApp › Configuração › Webhook)</p>
          <p className="mb-1 break-all rounded bg-pine-50 px-2 py-1 font-mono text-xs">{origin}/api/whatsapp/webhook</p>
          <p className="mb-3 text-xs text-pine-900/60">
            Token de verificação = o valor de <code>WHATSAPP_VERIFY_TOKEN</code>. Assine o campo <b>messages</b>.
          </p>
          <p className="text-xs font-semibold text-pine-900/70">ASAAS (Integrações › Webhooks › Cobranças)</p>
          <p className="mb-1 break-all rounded bg-pine-50 px-2 py-1 font-mono text-xs">{origin}/api/asaas/webhook</p>
          <p className="text-xs text-pine-900/60">
            Token de autenticação = o valor de <code>ASAAS_WEBHOOK_TOKEN</code>. Eventos: pagamento recebido, confirmado, estornado.
          </p>
        </section>
      </div>

      <section className="card mt-4 p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-bold text-pine-950">3. O robô</h2>
        <p className="mb-3 text-sm text-pine-900/65">
          Agora:{" "}
          <b>
            {mode === "gemini"
              ? "triagem conversada pelo Gemini"
              : mode === "questionario"
                ? "questionário fixo (sem Gemini)"
                : "desligado — as mensagens só chegam à caixa"}
          </b>
          {config.precoCentavos ? ` · consulta ${moneyBR(config.precoCentavos)}` : " · sem cobrança"}
        </p>
        {!admin ? (
          <p className="text-sm text-pine-900/60">Só o administrador altera estes ajustes.</p>
        ) : (
          <form action={saveWhatsappConfigAction} className="space-y-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="ativo" defaultChecked={config.ativo} className="mt-1" />
              <span>
                <b>Robô ligado</b> — responde sozinho quem escreve para o número da clínica.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="gemini_pago" defaultChecked={config.geminiPago} className="mt-1" />
              <span>
                <b>Confirmo que a chave do Gemini é do plano PAGO.</b> No plano gratuito o Google pode usar as conversas para
                treinar modelos — dado de saúde não pode ir para lá (LGPD). Sem esta confirmação o robô usa o questionário fixo.
              </span>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-semibold">Valor da teleconsulta (R$)</span>
                <input name="preco" className="input" defaultValue={(config.precoCentavos / 100).toFixed(2).replace(".", ",")} />
                <span className="text-xs text-pine-900/50">0 = sem cobrança</span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold">Prazo para pagar (dias)</span>
                <input name="vencimento_dias" type="number" min={1} max={30} className="input" defaultValue={config.vencimentoDias} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold">Quem atende</span>
                <select name="profissional_id" className="input" defaultValue={config.profissionalId ?? ""}>
                  <option value="">Qualquer profissional</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {(
              [
                ["boas_vindas", "Boas-vindas", config.boasVindas, 3],
                ["consentimento", "Pedido de consentimento (LGPD) — o paciente responde Concordo / Não concordo", config.consentimento, 5],
                ["pagamento_confirmado", "Mensagem quando o pagamento entra", config.pagamentoConfirmado, 3],
                ["instrucoes", "Instruções do médico para a triagem (o que perguntar, o que evitar)", config.instrucoes, 4],
              ] as const
            ).map(([name, label, value, rows]) => (
              <label key={name} className="block">
                <span className="text-xs font-semibold">{label}</span>
                <textarea name={name} rows={rows} defaultValue={value} className="input" />
              </label>
            ))}
            <p className="text-xs text-pine-900/50">
              <code>{"{clinica}"}</code> vira o nome da clínica (Configurações › Clínica: {ctx.clinic}).
            </p>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </form>
        )}
      </section>
    </>
  );
}
