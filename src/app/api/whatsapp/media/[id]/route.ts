import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { downloadMedia } from "@/lib/whatsapp/cloud";

/**
 * Mídia que o paciente mandou (foto, áudio, documento), servida só para quem
 * está logado como admin ou profissional e só se a mensagem existe no Renova.
 * O arquivo não é guardado: vem da Meta na hora (o id vale ~30 dias).
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "profissional")) {
    return new Response("unauthorized", { status: 401 });
  }
  const { id } = await params;
  const [row] = await sql<{ media_id: string | null }>`
    SELECT media_id FROM wa_messages WHERE id = ${Number(id) || 0} AND media_id IS NOT NULL`.catch(() => []);
  if (!row?.media_id) return new Response("not found", { status: 404 });
  const media = await downloadMedia(row.media_id, 25 * 1024 * 1024);
  if (!media) return new Response("a mídia não está mais disponível na Meta", { status: 410 });
  // Só imagem, áudio, vídeo e PDF abrem no navegador; o resto baixa (nada de HTML no nosso domínio).
  const safe = /^(image\/(jpeg|png|webp|gif)|audio\/|video\/|application\/pdf)/.test(media.mime);
  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "content-type": safe ? media.mime : "application/octet-stream",
      "cache-control": "private, no-store",
      "content-disposition": safe ? "inline" : "attachment",
      "x-content-type-options": "nosniff",
    },
  });
}
