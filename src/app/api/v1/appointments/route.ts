import { sql } from "@/lib/db";
import type { Appointment } from "@/lib/db";
import { requireApiKey, unauthorized } from "@/lib/api-auth";
import { todayISO } from "@/lib/format";
import { DATE_RE, TIME_RE, endTimeFor } from "./times";

export async function GET(request: Request) {
  if (!(await requireApiKey(request))) return unauthorized();
  try {
    const params = new URL(request.url).searchParams;
    const date = params.get("date");
    let from = params.get("from");
    let to = params.get("to");
    if (date && DATE_RE.test(date)) {
      from = date;
      to = date;
    }
    if (!from || !DATE_RE.test(from)) from = todayISO();
    if (!to || !DATE_RE.test(to)) to = from;

    const appointments = await sql<Appointment>`
      SELECT a.*, p.name AS patient_name, pr.name AS professional_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN professionals pr ON pr.id = a.professional_id
      WHERE a.date >= ${from} AND a.date <= ${to}
      ORDER BY a.date, a.start_time`;
    return Response.json({ data: appointments });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireApiKey(request))) return unauthorized();
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const patientId = Number(body?.patient_id);
    const professionalId = Number(body?.professional_id);
    const date = typeof body?.date === "string" ? body.date : "";
    const startTime = typeof body?.start_time === "string" ? body.start_time : "";
    const duration = Number(body?.duration) || 30;
    const procedure =
      typeof body?.procedure === "string" && body.procedure.trim() !== "" ? body.procedure.trim() : "Consulta";

    if (!patientId || !professionalId || !DATE_RE.test(date) || !TIME_RE.test(startTime)) {
      return Response.json(
        { error: "campos obrigatórios: patient_id, professional_id, date (AAAA-MM-DD), start_time (HH:MM)" },
        { status: 400 }
      );
    }

    const endTime = endTimeFor(startTime, duration);

    const [conflict] = await sql`
      SELECT id FROM appointments
      WHERE professional_id = ${professionalId} AND date = ${date} AND status NOT IN ('cancelado','faltou')
      AND start_time < ${endTime} AND end_time > ${startTime}`;
    if (conflict) {
      return Response.json({ error: "conflito de horário para este profissional" }, { status: 409 });
    }

    const [appointment] = await sql<Appointment>`
      INSERT INTO appointments (patient_id, professional_id, date, start_time, end_time, procedure, source)
      VALUES (${patientId}, ${professionalId}, ${date}, ${startTime}, ${endTime}, ${procedure}, 'api')
      RETURNING *`;
    return Response.json({ data: appointment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
