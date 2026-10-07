import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { contentDisposition, parsePositiveId } from "@/lib/attachments";

type Context = { params: Promise<{ id: string }> };

function unauthorized(): Response {
  return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
}

function notFound(): Response {
  return Response.json({ error: "Anexo não encontrado." }, { status: 404 });
}

export async function GET(_request: Request, { params }: Context) {
  if (!(await getSession())) return unauthorized();
  const id = parsePositiveId((await params).id);
  if (id === null) return notFound();

  const [row] = await sql<{ file_name: string; mime_type: string; data: Buffer }>`
    SELECT file_name, mime_type, data FROM attachments WHERE id = ${id}`;
  if (!row) return notFound();

  // Cópia para um Uint8Array<ArrayBuffer> puro: o Buffer do postgres.js pode
  // ser uma fatia de um pool, e BodyInit quer o ArrayBuffer exato.
  const body = new Uint8Array(row.data);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": row.mime_type,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": contentDisposition(row.file_name),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getSession())) return unauthorized();
  const id = parsePositiveId((await params).id);
  if (id === null) return notFound();

  const deleted = await sql<{ id: number }>`DELETE FROM attachments WHERE id = ${id} RETURNING id`;
  if (deleted.length === 0) return notFound();
  return new Response(null, { status: 204 });
}
