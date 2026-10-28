import Link from "next/link";
import { ORTHO_CREDIT } from "@/lib/ortho-guide";

/** De onde vem o Guia de ortopedia e o que ainda falta nele — no índice e no pé de cada tópico. */
export function OrthoCredit({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-pine-900/10 bg-white/70 text-pine-900/65 ${compact ? "p-3.5 text-xs" : "p-4 text-[13px]"}`}>
      <p>
        <b className="text-pine-950">
          {ORTHO_CREDIT.title}, publicado em {ORTHO_CREDIT.writtenAt}; revisão {ORTHO_CREDIT.revision} em {ORTHO_CREDIT.revisedAt}.
        </b>{" "}
        Texto próprio da Renova, escrito a partir das diretrizes citadas no pé de cada tópico — não é reprodução de livro. O que
        cada revisão mudou (antes, agora e motivo) está em{" "}
        <Link href="/guia/ortopedia/revisoes" className="font-bold text-pine-600 hover:underline">
          Revisões
        </Link>
        .
      </p>
      <p className="mt-1.5">
        {ORTHO_CREDIT.reviewedBy
          ? `Revisado por ${ORTHO_CREDIT.reviewedBy}.`
          : "Escrito para o médico que é o ortopedista de plantão e de ambulatório no SUS; ainda sem revisão por ortopedista — confira doses, técnicas e condutas com o protocolo do serviço."}{" "}
        Doses de adulto sem comorbidade, salvo indicação. Os dias de atestado são sugestão — ajuste à função do paciente.
      </p>
    </div>
  );
}
