import { sql } from "@/lib/db";
import type { Professional } from "@/lib/db";
import { requireApiKey, unauthorized } from "@/lib/api-auth";

export async function GET(request: Request) {
  if (!(await requireApiKey(request))) return unauthorized();
  try {
    const professionals = await sql<Professional>`
      SELECT id, name, specialty, council, color FROM professionals WHERE active = 1 ORDER BY name`;
    return Response.json({ data: professionals });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
