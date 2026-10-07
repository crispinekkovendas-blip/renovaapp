import { prescriptionQrSvg } from "@/lib/hub";

/**
 * QR da receita digital para a farmácia ler direto da tela do paciente, com o
 * código da receita ao lado e onde a assinatura é validada. Server Component
 * assíncrono: o SVG é gerado no servidor, sem JS no celular. Fechado por
 * padrão (<details>) — quem precisa é o balcão, não a leitura do dia a dia.
 */
export async function PrescriptionQr({ link, memedId }: { link: string; memedId: string | null }) {
  const svg = await prescriptionQrSvg(link);

  // O padding vertical fica no <summary>: a linha inteira vira alvo de toque.
  return (
    <details className="group mt-3 rounded-2xl bg-pine-50 px-4">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-bold text-pine-800 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Mostrar QR para a farmácia</span>
        <span className="hidden group-open:inline">Esconder QR</span>
        <span className="text-xs font-semibold text-pine-600" aria-hidden="true">
          <span className="group-open:hidden">▾</span>
          <span className="hidden group-open:inline">▴</span>
        </span>
      </summary>

      <div className="flex flex-wrap items-start gap-4 pb-4">
        {svg ? (
          <div
            role="img"
            aria-label="QR code da receita, para a farmácia ler"
            className="w-full max-w-[180px] rounded-xl bg-white p-2 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <p className="text-xs text-pine-900/55">
            Não deu para gerar o QR desta receita. Mostre o link “Abrir receita” na farmácia.
          </p>
        )}

        <div className="min-w-0 flex-1 text-xs text-pine-900/60">
          {memedId ? (
            <p>
              <span className="label mb-0.5">Código da receita</span>
              <span className="block break-all font-mono text-sm font-bold text-pine-950">{memedId}</span>
            </p>
          ) : null}
          <p className={memedId ? "mt-3" : ""}>
            A farmácia valida a assinatura em{" "}
            <a
              href="https://validar.iti.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-bold text-pine-700 underline underline-offset-2 sm:min-h-0"
            >
              validar.iti.gov.br
            </a>
            .
          </p>
        </div>
      </div>
    </details>
  );
}
