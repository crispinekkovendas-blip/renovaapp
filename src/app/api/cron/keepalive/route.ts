import { sql } from "@/lib/db";

/**
 * Ping diário do Vercel Cron. O free tier do Supabase pausa o projeto depois
 * de ~1 semana sem query — e em 2026-09-06 isso derrubou a produção em silêncio
 * (host some do DNS, toda página com banco vira 500). Uma consulta trivial por
 * dia mantém o projeto acordado. Só o cron da Vercel chama: exige o
 * `CRON_SECRET` que a própria Vercel envia no header.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const [row] = await sql<{ now: string }>`
      SELECT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS') AS now`;
    return Response.json({ ok: true, db: row.now });
  } catch (error) {
    // 503, não 500: o cron registra a falha e o dashboard da Vercel mostra o
    // banco fora do ar sem confundir com erro de código.
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "db unreachable" },
      { status: 503 }
    );
  }
}

export const dynamic = "force-dynamic";
