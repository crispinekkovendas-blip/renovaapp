import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { requireApiKey, unauthorized } from "@/lib/api-auth";

export async function GET(request: Request) {
  if (!(await requireApiKey(request))) return unauthorized();
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const like = `%${q}%`;
    const patients = q
      ? await sql<Patient>`
          SELECT id, name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city, created_at
          FROM patients
          WHERE name ILIKE ${like} OR COALESCE(cpf,'') ILIKE ${like} OR COALESCE(phone,'') ILIKE ${like}
          ORDER BY name LIMIT 100`
      : await sql<Patient>`
          SELECT id, name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city, created_at
          FROM patients ORDER BY name LIMIT 100`;
    return Response.json({ data: patients });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireApiKey(request))) return unauthorized();
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return Response.json({ error: "campo obrigatório: name" }, { status: 400 });
    }
    const str = (key: string): string | null => {
      const value = body?.[key];
      return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
    };
    const [patient] = await sql<Patient>`
      INSERT INTO patients (name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city)
      VALUES (${name}, ${str("cpf")}, ${str("birth_date")}, ${str("sex")}, ${str("phone")},
        ${str("email")}, ${str("insurance")}, ${str("insurance_number")}, ${str("city")})
      RETURNING id, name, cpf, birth_date, sex, phone, email, insurance, insurance_number, city, created_at`;
    return Response.json({ data: patient }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
