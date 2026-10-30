import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDate, todayISO, waLink } from "@/lib/format";
import { getClinicHeader } from "@/lib/documents-db";
import { RENEWAL_DAYS, continuousRenewals } from "@/lib/receituario";
import type { RenewalStatus } from "@/lib/receituario";
import { listIssuedPrescriptions, rxScope } from "@/lib/receituario-db";
import { EmptyState, PageHeader } from "@/components/ui";
import { ReceiptChip, RenewalChip, SmallLink, daysLeftLabel, rxLinks } from "@/components/receituario/rx-ui";

/**
 * Receituário › Renovações: quem toma remédio de uso contínuo e quando a
 * última receita deixa de servir. "Renovar" abre o compositor com os mesmos
 * medicamentos; "Avisar" abre o WhatsApp do paciente com a mensagem pronta
 * (manda quem clica, do próprio WhatsApp — nada sai sozinho).
 */

const FILTERS: ReadonlyArray<{ key: string; label: string; statuses: RenewalStatus[] }> = [
  { key: "atencao", label: "Precisam de atenção", statuses: ["vencida", "em_breve"] },
  { key: "vencida", label: "Vencidas", statuses: ["vencida"] },
  { key: "em_breve", label: "Vencem em breve", statuses: ["em_breve"] },
  { key: "todas", label: "Todas", statuses: ["vencida", "em_breve", "em_dia"] },
];

export default async function RenovacoesPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const session = await requireRole("admin", "profissional");
  const { filtro } = await searchParams;
  const active = FILTERS.find((f) => f.key === filtro) ?? FILTERS[0];
  const [rxs, clinic] = await Promise.all([
    listIssuedPrescriptions({ professionalId: rxScope(session), limit: 3000 }),
    getClinicHeader(),
  ]);
  const all = continuousRenewals(rxs, todayISO());
  const rows = all.filter((r) => active.statuses.includes(r.status));
  const phones = new Map(rxs.map((rx) => [rx.patientId, rx.patientPhone]));
  const count = (statuses: RenewalStatus[]) => all.filter((r) => statuses.includes(r.status)).length;

  return (
    <>
      <PageHeader
        title="Renovações"
        subtitle="Receitas de uso contínuo e quando deixam de valer"
        action={
          <Link href="/receituario" className="btn btn-primary">
            Nova receita
          </Link>
        }
      />

      <nav aria-label="Filtrar renovações" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const on = f.key === active.key;
          return (
            <Link
              key={f.key}
              href={f.key === "atencao" ? "/receituario/renovacoes" : `/receituario/renovacoes?filtro=${f.key}`}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                on ? "bg-pine-900 text-white" : "bg-pine-50 text-pine-900/70 hover:bg-pine-100"
              }`}
            >
              {f.label} <span className={on ? "text-white/70" : "text-pine-900/45"}>{count(f.statuses)}</span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="card p-3 sm:p-5">
          <EmptyState
            title={all.length === 0 ? "Nenhuma receita de uso contínuo" : "Nada aqui por enquanto"}
            hint={
              all.length === 0
                ? "Marque “uso contínuo” no medicamento ao montar a receita — ele passa a ser acompanhado aqui."
                : "Nenhuma receita neste filtro. Veja “Todas” para a lista completa."
            }
          />
        </div>
      ) : (
        <ul className="card divide-y divide-pine-900/5 overflow-hidden">
          {rows.map((r) => {
            const wa = waLink(
              phones.get(r.patientId),
              `Olá, ${r.patientName.split(" ")[0]}! Aqui é da ${clinic.name}. Sua receita de ${r.medications.join(", ")} ` +
                `${r.daysLeft < 0 ? "já venceu" : "está perto de vencer"}. Quer que a gente prepare a renovação?`
            );
            return (
              <li key={`${r.docId}-${r.receipt}`} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={rxLinks.ficha(r.patientId)} className="font-bold text-pine-950 hover:text-pine-600">
                      {r.patientName}
                    </Link>
                    <RenewalChip status={r.status} />
                    {r.receipt === "controle_especial" ? <ReceiptChip kind="controle_especial" /> : null}
                  </p>
                  <p className="mt-0.5 text-sm text-pine-900/75">{r.medications.join(" · ")}</p>
                  <p className="text-xs text-pine-900/55">
                    Última receita {fmtDate(r.issuedAt)} · {daysLeftLabel(r.daysLeft)} ({fmtDate(r.dueAt)})
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost flex-1 px-3 py-1.5 text-xs sm:flex-none">
                      Avisar no WhatsApp
                    </a>
                  ) : null}
                  <SmallLink href={rxLinks.ver(r.patientId, r.docId)}>Ver</SmallLink>
                  <Link href={rxLinks.renovar(r.patientId, r.docId)} className="btn btn-primary flex-1 px-3 py-1.5 text-xs sm:flex-none">
                    Renovar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-pine-900/55">
        Prazos usados: Receituário de Controle Especial vale {RENEWAL_DAYS.controle_especial} dias da emissão (Portaria
        SVS/MS 344/98). Receita simples de uso contínuo: {RENEWAL_DAYS.simples} dias, a praxe das farmácias — não é prazo
        legal único, é só um lembrete. Tarja preta (Notificação de Receita) não entra, porque não é emitida por aqui.
      </p>
    </>
  );
}
