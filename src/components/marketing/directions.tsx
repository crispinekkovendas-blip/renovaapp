import { mapsEmbedUrl, mapsSearchUrl } from "@/lib/clinic-public";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * "Como chegar", a partir do endereço livre em `settings.clinic_address`:
 * o botão abre a busca no Google Maps (rota pronta no app da pessoa) e o
 * mapa embutido carrega preguiçoso, sem chave de API. Sem endereço, some.
 */
export function Directions({ address }: { address: string | null }) {
  if (!address?.trim()) return null;

  return (
    <section id="como-chegar" aria-labelledby="como-chegar-titulo" className="scroll-mt-20 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-24">
        <Reveal>
          <SectionHeading id="como-chegar-titulo" eyebrow="Como chegar" title="Onde fica a clínica" />
          <p className="mt-5 text-lg text-pine-950">{address}</p>
          <p className="mt-2 text-base text-pine-900/60">
            Um toque e a rota abre no mapa do seu celular.
          </p>
          <div className="mt-8">
            <a href={mapsSearchUrl(address)} target="_blank" rel="noopener noreferrer" className="btn-hero">
              Abrir no mapa
              <span className="chev" aria-hidden="true" />
            </a>
          </div>
        </Reveal>

        <Reveal
          delay={100}
          className="overflow-hidden rounded-[2.5rem] border border-pine-900/10 bg-peach-50 shadow-[0_12px_32px_-16px_rgba(12,34,28,0.18)]"
        >
          <iframe
            src={mapsEmbedUrl(address)}
            loading="lazy"
            title={`Mapa: ${address}`}
            referrerPolicy="no-referrer-when-downgrade"
            className="block aspect-[5/4] w-full border-0"
          />
        </Reveal>
      </div>
    </section>
  );
}
