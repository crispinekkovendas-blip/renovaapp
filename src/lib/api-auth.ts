import crypto from "node:crypto";
import { sql } from "./db";

/** Valida o header `Authorization: Bearer rnv_...` contra a tabela api_keys. */
export async function requireApiKey(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(rnv_[A-Za-z0-9]+)$/i);
  if (!match) return false;
  const hash = crypto.createHash("sha256").update(match[1]).digest("hex");
  const [key] = await sql<{ id: number }>`
    SELECT id FROM api_keys WHERE key_hash = ${hash} AND active = 1`;
  return Boolean(key);
}

export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
