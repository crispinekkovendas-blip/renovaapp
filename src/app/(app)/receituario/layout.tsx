import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canIssueDocuments } from "@/lib/document-permissions";

/** Receituário: ato do profissional (ou do admin). Profissional sem cadastro vinculado volta ao início. */
export default async function ReceituarioLayout({ children }: { children: ReactNode }) {
  const session = await requireRole("admin", "profissional");
  if (!canIssueDocuments(session)) redirect("/dashboard");
  return <>{children}</>;
}
