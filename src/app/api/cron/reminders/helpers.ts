/** Peças puras da rota de lembretes (sem banco, sem push) — testáveis com `node --test`. */

/** Tabela ainda não migrada (42P01) ou coluna ausente (42703). */
export function migrationPending(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "42703";
}

/** Host de produção primeiro; a requisição só serve de fallback fora da Vercel. */
export function baseUrl(headers: Headers, productionUrl: string | undefined): string {
  const production = productionUrl?.trim();
  if (production) return `https://${production.replace(/^https?:\/\//, "")}`;
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Assinaturas de push por paciente, na ordem em que vieram. */
export function groupByPatient<T extends { patient_id: number }>(subscriptions: readonly T[]): Map<number, T[]> {
  const byPatient = new Map<number, T[]>();
  for (const sub of subscriptions) {
    const list = byPatient.get(sub.patient_id);
    if (list) list.push(sub);
    else byPatient.set(sub.patient_id, [sub]);
  }
  return byPatient;
}

/** Primeiro nome para a saudação do push. */
export function firstName(fullName: string): string {
  return fullName.split(/\s+/)[0];
}
