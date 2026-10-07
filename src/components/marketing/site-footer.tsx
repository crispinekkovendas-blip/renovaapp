import Link from "next/link";
import type { HoursRun } from "@/lib/clinic-public";
import { telHref } from "@/lib/clinic-public";
import { REFRAIN } from "./refrain";

const LINK = "inline-flex min-h-11 items-center hover:underline sm:min-h-0";

/**
 * O rodapé das páginas públicas: nome e refrão, os contatos que existirem
 * (telefone, endereço, CNPJ, horário — cada linha some sem dado) e os
 * links. `compact` para as páginas de uma tarefa só (agendar, confirmar,
 * validar): só o refrão e os links.
 */
export function SiteFooter({
  clinicName,
  clinicPhone = null,
  clinicAddress = null,
  clinicDocument = null,
  hours = [],
  mapsUrl = null,
  compact = false,
}: {
  clinicName: string;
  clinicPhone?: string | null;
  clinicAddress?: string | null;
  /** CNPJ; vazio esconde a linha. */
  clinicDocument?: string | null;
  /** Corridas de horário ("Seg a Sex · 8h às 18h"); vazio esconde a linha. */
  hours?: HoursRun[];
  /** Link "Ver no mapa" ao lado do endereço; null esconde. */
  mapsUrl?: string | null;
  compact?: boolean;
}) {
  const tel = telHref(clinicPhone);
  const hasContact = Boolean(tel || clinicAddress || clinicDocument || hours.length > 0);

  // Último bloco da página: o fundo escuro vai até a borda, o texto fica acima da barra do iPhone.
  return (
    <footer
      className={`section-ink ${
        compact ? "py-10 sm:py-12" : ""
      } pb-[calc(3rem+env(safe-area-inset-bottom))] sm:pb-[calc(4rem+env(safe-area-inset-bottom))]`}
    >
      <div className={`mx-auto grid max-w-6xl px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr] ${compact ? "gap-5 lg:items-end" : "gap-10"}`}>
        <div>
          <p className={`font-display font-semibold italic ${compact ? "text-2xl" : "text-3xl"}`}>{clinicName}</p>
          <p className="mt-2 font-display text-lg italic opacity-80 sm:text-xl">{REFRAIN}</p>
          {!compact && hasContact ? (
            <address className="mt-6 space-y-1 text-sm not-italic opacity-80">
              {tel && clinicPhone ? (
                <p>
                  <a href={tel} className={`${LINK} font-bold`}>
                    {clinicPhone}
                  </a>
                </p>
              ) : null}
              {clinicAddress ? (
                <p>
                  {clinicAddress}
                  {mapsUrl ? (
                    <>
                      {" · "}
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} font-bold`}>
                        Ver no mapa
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
              {hours.length > 0 ? (
                <p>
                  {hours.map((run, i) => (
                    <span key={run.days}>
                      {i > 0 ? " · " : ""}
                      <span className="font-bold">{run.days}</span> {run.hours}
                    </span>
                  ))}
                </p>
              ) : null}
              {clinicDocument ? <p>CNPJ {clinicDocument}</p> : null}
            </address>
          ) : null}
        </div>

        <nav aria-label="Links do rodapé" className="text-sm">
          <ul className={compact ? "flex flex-wrap gap-x-5 gap-y-1 lg:justify-end" : "space-y-1 sm:space-y-3"}>
            <li>
              <Link href="/agendar" className={`${LINK} font-bold`}>
                Agendar consulta →
              </Link>
            </li>
            <li>
              <Link href="/validar" className={LINK}>
                Validar um documento
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className={LINK}>
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link href="/login" className={LINK}>
                Área da clínica
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className={`mx-auto max-w-6xl px-4 sm:px-6 ${compact ? "mt-6" : "mt-10"}`}>
        <p className="border-t border-current/15 pt-6 text-xs opacity-60">
          Feito com <span className="font-display font-semibold italic">Renova</span>
        </p>
      </div>
    </footer>
  );
}
