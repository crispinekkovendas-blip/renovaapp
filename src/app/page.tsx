import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getPublicClinic,
  getPublicHours,
  getPublicStats,
  getPublicTeam,
  getPublicTestimonials,
  publicBaseUrl,
  publicMetadata,
} from "@/lib/marketing-stats";
import { buildClinicJsonLd, buildFaqJsonLd, jsonLdScript, mapsSearchUrl } from "@/lib/clinic-public";
import { REFRAIN } from "@/components/marketing/refrain";
import { SiteHeader, type SiteNavLink } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { HowToBook } from "@/components/marketing/how-to-book";
import { AfterBooking } from "@/components/marketing/after-booking";
import { Stats } from "@/components/marketing/stats";
import { Testimonials } from "@/components/marketing/testimonials";
import { Team } from "@/components/marketing/team";
import { HoursInsurances } from "@/components/marketing/hours-insurances";
import { Directions } from "@/components/marketing/directions";
import { Faq, landingFaq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * A página da clínica para o paciente. Sem banco ela ainda abre — com o nome
 * genérico e sem números. `metadataBase` vem do host da requisição, então a
 * prévia do link (WhatsApp) aponta para o próprio deploy que a serviu.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getPublicClinic();
  const metadata = await publicMetadata({
    description: `Agende sua consulta na ${name} pelo celular: escolha o profissional, o dia e um horário livre, sem cadastro. ${REFRAIN}`,
    path: "/",
  });
  // Na página inicial o título diz o que se faz aqui, não só o nome.
  const title = `${name} · Agende sua consulta online`;
  return {
    ...metadata,
    title: { absolute: title },
    openGraph: { ...metadata.openGraph, title },
    twitter: { ...metadata.twitter, title },
  };
}

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  // Duas levas para não abrir nove conexões de uma vez no pooler.
  const [clinic, team, hours, testimonials, base] = await Promise.all([
    getPublicClinic(),
    getPublicTeam(),
    getPublicHours(),
    getPublicTestimonials(),
    publicBaseUrl(),
  ]);
  const stats = await getPublicStats();

  const mapsUrl = clinic.address ? mapsSearchUrl(clinic.address) : null;
  const faq = landingFaq({ clinicName: clinic.name, clinicPhone: clinic.phone });
  const clinicJsonLd = buildClinicJsonLd({
    name: clinic.name,
    url: `${base}/`,
    phone: clinic.phone,
    address: clinic.address,
    hours,
    taxId: clinic.document,
    bookingUrl: `${base}/agendar`,
  });
  const faqJsonLd = buildFaqJsonLd(faq);

  // As âncoras do topo só apontam para seções que existem nesta clínica.
  const nav: SiteNavLink[] = [
    { href: "#como-agendar", label: "Como agendar" },
    ...(team.length > 0 ? [{ href: "#equipe", label: "Equipe" }] : []),
    ...(hours.length > 0 || clinic.insurances.length > 0 ? [{ href: "#horarios", label: "Horários" }] : []),
    { href: "#duvidas", label: "Dúvidas" },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(clinicJsonLd) }} />
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }} />
      ) : null}

      {/* A barra gruda no topo: o "Agendar" fica à mão em qualquer ponto da página, sem JS. */}
      <SiteHeader clinicName={clinic.name} nav={nav} cta sticky />

      <main className="bg-white">
        <Hero clinicName={clinic.name} />
        <HowToBook />
        <AfterBooking clinicPhone={clinic.phone} />
        <Stats stats={stats} />
        <Testimonials items={testimonials} />
        <Team team={team} />
        <HoursInsurances hours={hours} insurances={clinic.insurances} />
        <Directions address={clinic.address} />
        <Faq items={faq} />
        <FinalCta />
      </main>

      <SiteFooter
        clinicName={clinic.name}
        clinicPhone={clinic.phone}
        clinicAddress={clinic.address}
        clinicDocument={clinic.document}
        hours={hours}
        mapsUrl={mapsUrl}
      />
    </>
  );
}
