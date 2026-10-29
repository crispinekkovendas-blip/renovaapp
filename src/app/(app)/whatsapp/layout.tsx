import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

/** Atendimento pelo WhatsApp: dado de saúde — médico e admin. Cobre todas as abas. */
export default async function WhatsappLayout({ children }: { children: ReactNode }) {
  await requireRole("admin", "profissional");
  return <>{children}</>;
}
