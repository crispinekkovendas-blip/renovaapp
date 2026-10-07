import { GUIDE_CREDIT } from "@/lib/emergency-guide";

/** Crédito dos autores e o que a revisão fez — no índice e no pé de cada tópico. */
export function GuideCredit({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-pine-900/10 bg-white/70 text-pine-900/65 ${compact ? "p-3.5 text-xs" : "p-4 text-[13px]"}`}>
      <p>
        <b className="text-pine-950">
          {GUIDE_CREDIT.title}, {GUIDE_CREDIT.edition} ({GUIDE_CREDIT.publisher}).
        </b>{" "}
        Reproduzido com autorização dos autores: {GUIDE_CREDIT.authors.join(", ")}.
      </p>
      <p className="mt-1.5">
        Revisão Renova desde {GUIDE_CREDIT.reviewedAt}: erros de dose, diluição e digitação foram corrigidos no próprio texto.
        Cada trecho que mudou vai com marca-texto e, logo embaixo, o histórico — o texto do PDF primeiro, depois cada mudança
        com o motivo; aviso pendente aparece como “⚠ conferir”. Doses de adulto de 70 kg, salvo indicação. Sempre confira com
        o protocolo da instituição.
      </p>
    </div>
  );
}
