import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { sql } from "@/lib/db";
import { parseInsurances, summarizeHours, type HoursRow, type HoursRun } from "@/lib/clinic-public";
import { countDigitalDocuments } from "@/lib/documents-db";

/**
 * Tudo o que a página pública lê do banco. Cada leitura falha sozinha
 * (→ null, [] ou o fallback) para a landing nunca cair junto com uma tabela
 * ausente — em instalação nova `memed_prescriptions` ou `hub_submissions`
 * podem nem existir ainda. Os helpers puros ficam em `clinic-public.ts`.
 */
export interface PublicStats {
  consultas: number | null;
  confirmadas: number | null;
  receitas: number | null;
  /** Papelômetro: documentos + receitas digitais = folhas que não foram impressas. */
  folhas: number | null;
}

type CountRow = { n: number };

async function count(query: () => Promise<CountRow[]>): Promise<number | null> {
  try {
    const [row] = await query();
    return typeof row?.n === "number" && Number.isFinite(row.n) ? row.n : null;
  } catch {
    return null;
  }
}

export async function getPublicStats(): Promise<PublicStats> {
  const [consultas, confirmadas, receitas, folhas] = await Promise.all([
    count(
      () => sql<CountRow>`
        SELECT COUNT(*)::int AS n FROM appointments
        WHERE status NOT IN ('cancelado', 'faltou')`
    ),
    count(
      () => sql<CountRow>`
        SELECT COUNT(*)::int AS n FROM appointments
        WHERE status IN ('confirmado', 'concluido')`
    ),
    count(
      () => sql<CountRow>`
        SELECT COUNT(*)::int AS n FROM memed_prescriptions
        WHERE status = 'emitida'`
    ),
    countDigitalDocuments(),
  ]);

  return { consultas, confirmadas, receitas, folhas };
}

/* ---------- Dados da clínica (settings) ---------- */

export interface PublicClinic {
  name: string;
  phone: string | null;
  address: string | null;
  /** CNPJ da clínica (`settings.clinic_document`), como foi digitado. */
  document: string | null;
  /** `settings.clinic_insurances`, já separada. Vazia = só particular ou não informado. */
  insurances: string[];
}

export const FALLBACK_CLINIC_NAME = "Clínica Renova";

const FALLBACK_CLINIC: PublicClinic = {
  name: FALLBACK_CLINIC_NAME,
  phone: null,
  address: null,
  document: null,
  insurances: [],
};

/**
 * Sem banco a página ainda abre — com o nome genérico e sem endereço.
 * `cache` deduplica a leitura entre metadata e página na mesma requisição.
 */
export const getPublicClinic = cache(async (): Promise<PublicClinic> => {
  try {
    const rows = await sql<{ key: string; value: string }>`
      SELECT key, value FROM settings
      WHERE key IN ('clinic_name', 'clinic_phone', 'clinic_address', 'clinic_document', 'clinic_insurances')`;
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value?.trim() ?? ""]));
    return {
      name: settings.clinic_name || FALLBACK_CLINIC_NAME,
      phone: settings.clinic_phone || null,
      address: settings.clinic_address || null,
      document: settings.clinic_document || null,
      insurances: parseInsurances(settings.clinic_insurances),
    };
  } catch {
    return FALLBACK_CLINIC;
  }
});

/* ---------- Equipe ---------- */

export interface PublicProfessional {
  id: number;
  name: string;
  specialty: string;
  council: string;
}

export async function getPublicTeam(): Promise<PublicProfessional[]> {
  try {
    const rows = await sql<PublicProfessional>`
      SELECT id, name, specialty, council FROM professionals
      WHERE active = 1 ORDER BY name`;
    return rows.filter((row) => row.name?.trim());
  } catch {
    return [];
  }
}

/* ---------- Horários ---------- */

/** Janelas de todos os profissionais ativos, resumidas em corridas ("Seg a Sex · 8h às 18h"). */
export async function getPublicHours(): Promise<HoursRun[]> {
  try {
    const rows = await sql<HoursRow>`
      SELECT s.weekday, s.start_time, s.end_time
      FROM schedules s
      JOIN professionals p ON p.id = s.professional_id
      WHERE p.active = 1`;
    return summarizeHours(rows);
  } catch {
    return [];
  }
}

/* ---------- Depoimentos (portal do paciente) ---------- */

export interface PublicTestimonial {
  rating: number;
  message: string;
  created_at: string;
  patient_name: string;
}

/**
 * Só o que o paciente autorizou publicar (`publish = 1`), com 4 ou 5 estrelas
 * e um comentário. A tabela pode não existir ainda (migração pendente) → [].
 */
export async function getPublicTestimonials(): Promise<PublicTestimonial[]> {
  try {
    const rows = await sql<PublicTestimonial>`
      SELECT h.rating, h.message, h.created_at, p.name AS patient_name
      FROM hub_submissions h
      JOIN patients p ON p.id = h.patient_id
      WHERE h.kind = 'avaliacao' AND h.publish = 1 AND h.rating >= 4
        AND COALESCE(TRIM(h.message), '') <> ''
      ORDER BY h.created_at DESC, h.id DESC
      LIMIT 6`;
    return rows.filter((row) => row.message?.trim() && row.patient_name?.trim());
  } catch {
    return [];
  }
}

/* ---------- Origem pública ---------- */

/**
 * Origem absoluta da requisição atual, respeitando o proxy (Vercel):
 * `x-forwarded-proto` + `x-forwarded-host`, senão `host`. Serve de
 * `metadataBase` — o preview mostra o próprio host, a produção o dela.
 */
export async function publicBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host") || "localhost:3000";
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Um host estranho no cabeçalho não pode derrubar a página: sem base, os links ficam relativos. */
function toUrl(base: string): URL | undefined {
  try {
    return new URL(base);
  } catch {
    return undefined;
  }
}

/**
 * A prévia de link da raiz (`app/opengraph-image.tsx`). Uma página que
 * declara o próprio `openGraph` perde a imagem herdada — então ela vai
 * explícita aqui.
 */
const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Agende sua consulta online" };

/**
 * Metadados de uma página pública: "Título · Clínica", descrição, canônica e
 * a prévia do link (OpenGraph/Twitter) apontando para o host que serviu a
 * página. `index: false` para o que não deve ir aos buscadores (links com
 * token, páginas de resultado). Sem `title`, o nome da clínica é o título.
 */
export async function publicMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title?: string;
  description: string;
  path: string;
  index?: boolean;
}): Promise<Metadata> {
  const [clinic, base] = await Promise.all([getPublicClinic(), publicBaseUrl()]);
  // `absolute`: o modelo "%s · Renova" do layout não se aplica — a marca aqui é a clínica.
  const fullTitle = title ? `${title} · ${clinic.name}` : clinic.name;
  return {
    metadataBase: toUrl(base),
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    robots: index ? undefined : { index: false, follow: false },
    openGraph: {
      title: fullTitle,
      description,
      locale: "pt_BR",
      type: "website",
      siteName: clinic.name,
      url: path,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [SHARE_IMAGE.url] },
  };
}
