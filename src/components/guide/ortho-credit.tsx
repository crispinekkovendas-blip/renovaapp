import { ORTHO_CREDIT } from "@/lib/ortho-guide";

/** De onde vem o Guia de ortopedia e o que ainda falta nele — no índice e no pé de cada tópico. */
export function OrthoCredit({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-pine-900/10 bg-white/70 text-pine-900/65 ${compact ? "p-3.5 text-xs" : "p-4 text-[13px]"}`}>
      <p>
        <b className="text-pine-950">
          {ORTHO_CREDIT.title}, revisão {ORTHO_CREDIT.revision} ({ORTHO_CREDIT.writtenAt}).
        </b>{" "}
        Texto próprio da Renova, escrito a partir das diretrizes citadas no pé de cada tópico — não é reprodução de livro.
      </p>
      <p className="mt-1.5">
        {ORTHO_CREDIT.reviewedBy
          ? `Revisado por ${ORTHO_CREDIT.reviewedBy}.`
          : "Ainda sem revisão por ortopedista: use como roteiro de primeira consulta e confira doses e condutas com o protocolo do serviço."}{" "}
        Doses de adulto sem comorbidade, salvo indicação. Os dias de atestado são sugestão — ajuste à função do paciente.
      </p>
    </div>
  );
}
