import { sql } from "@/lib/db";
import { getSessionSecret } from "@/lib/auth";
import { verifyPatientToken } from "@/lib/patient-token";
import { todayISO } from "@/lib/format";
import { hubClinic, nextAppointmentFor } from "@/lib/hub";
import { buildIcs } from "@/lib/ics";

/**
 * "Adicionar à minha agenda": a próxima consulta do paciente como arquivo
 * .ics, para o calendário do celular. A autorização é o mesmo token do
 * portal; sem consulta de pé, 404 — o link só aparece quando há uma.
 */
export const dynamic = "force-dynamic";

/** Origem absoluta da requisição, respeitando o proxy (Vercel) — mesmo padrão de actions-confirm. */
function requestOrigin(request: Request): { origin: string; host: string } {
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
  return { origin: `${proto}://${host}`, host };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const today = todayISO();
  const verified = verifyPatientToken(token, getSessionSecret(), today);
  if (!verified) return new Response("Link vencido ou inválido.", { status: 404 });

  const [patient] = await sql<{ id: number; name: string }>`
    SELECT id, name FROM patients WHERE id = ${verified.patientId}`;
  if (!patient) return new Response("Link vencido ou inválido.", { status: 404 });

  const [next, clinic] = await Promise.all([nextAppointmentFor(patient.id, today), hubClinic()]);
  if (!next) return new Response("Nenhuma consulta marcada.", { status: 404 });

  const { origin, host } = requestOrigin(request);
  const portalUrl = `${origin}/p/${token}`;
  const telemedUrl = next.telemed_room ? `https://meet.jit.si/${next.telemed_room}` : null;

  const description = [
    [next.professional_specialty, next.procedure].filter(Boolean).join(" · "),
    telemedUrl ? `Teleconsulta — entre pela sala: ${telemedUrl}` : null,
    `Confirmar, remarcar ou ver os detalhes: ${portalUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ics = buildIcs({
    uid: `renova-consulta-${next.id}@${host}`,
    start: `${next.date} ${next.start_time}`,
    end: `${next.date} ${next.end_time}`,
    summary: `Consulta com ${next.professional_name} · ${clinic.name}`,
    description,
    location: telemedUrl ?? (clinic.address ? `${clinic.name} · ${clinic.address}` : clinic.name),
    url: portalUrl,
  });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="consulta.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
