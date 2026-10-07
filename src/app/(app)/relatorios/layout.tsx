import { requireRole } from "@/lib/auth";

/** Relatórios são gestão — só admin. */
export default async function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return <>{children}</>;
}
