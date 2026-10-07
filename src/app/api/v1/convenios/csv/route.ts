import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { monthISO } from "@/lib/format";
import { insuranceCsv, insuranceCsvFilename } from "./csv";
import type { CsvRow } from "./csv";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const mesParam = url.searchParams.get("mes") ?? "";
    const month = /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : monthISO();
    const convenio = url.searchParams.get("convenio") ?? "";
    if (!convenio) {
      return Response.json({ error: "parâmetro convenio obrigatório" }, { status: 400 });
    }

    const rows = await sql<CsvRow>`
      SELECT a.date, a.start_time, a.procedure, a.price_cents,
        p.name AS patient_name, p.cpf, p.insurance_number
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      WHERE substr(a.date,1,7) = ${month} AND a.status = 'concluido'
        AND p.insurance = ${convenio}
      ORDER BY a.date, a.start_time`;

    return new Response(insuranceCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${insuranceCsvFilename(convenio, month)}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
