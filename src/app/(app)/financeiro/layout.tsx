import { requireRole } from "@/lib/auth";

/** Cobrança de balcão: admin e recepção. Cobre /financeiro e /financeiro/convenios. */
export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin", "recepcao");
  return <>{children}</>;
}
