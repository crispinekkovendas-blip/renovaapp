import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import type { Professional } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { listSpecialties, memedConfig } from "@/lib/memed/client";
import { PageHeader } from "@/components/ui";
import { Flash } from "@/components/financeiro/flash";
import { erroMessage, okMessage } from "./settings-messages";
import { groupSpecialties } from "./specialty-groups";
import type { MemedSpecialty } from "./specialty-groups";
import { ClinicSettingsSection } from "./_sections/clinic-settings";
import { PortalSettingsSection } from "./_sections/portal-settings";
import { ProfessionalsSection, UsersSection } from "./_sections/team";
import type { UserListItem } from "./_sections/team";
import { DangerZoneSection } from "./_sections/danger-zone";

/**
 * Especialidades da Memed para o select. Sem chave ou com a API fora do ar,
 * a lista fica vazia e o campo vira texto livre para o id.
 */
async function loadMemedSpecialties(): Promise<MemedSpecialty[]> {
  if (!memedConfig()) return [];
  try {
    return await listSpecialties();
  } catch {
    return [];
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");
  const { erro, ok } = await searchParams;

  // Independentes entre si (e a Memed é uma chamada externa): tudo de uma vez.
  const [professionals, users, settingsRows, specialties] = await Promise.all([
    sql<Professional>`SELECT * FROM professionals ORDER BY name`,
    sql<UserListItem>`SELECT id, name, email, role, active FROM users ORDER BY name`,
    sql<{ key: string; value: string }>`SELECT key, value FROM settings`,
    loadMemedSpecialties(),
  ]);
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  const okText = okMessage(ok);
  const erroText = erroMessage(erro);

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Clínica, profissionais e usuários"
        action={
          // No celular as subpáginas viram uma fileira que rola de lado, sem quebrar o texto dos botões.
          <div className="scroll-x -mx-4 flex gap-2 px-4 *:shrink-0 *:whitespace-nowrap sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href="/configuracoes/horarios" className="btn btn-outline">
              Horários de atendimento
            </Link>
            <Link href="/configuracoes/modelos" className="btn btn-outline">
              Modelos de documentos
            </Link>
            <Link href="/configuracoes/api" className="btn btn-outline">
              API
            </Link>
          </div>
        }
      />

      <ClinicSettingsSection settings={settings} />
      <PortalSettingsSection pinRequired={settings.portal_pin === "1"} />

      {okText ? <Flash tone="ok">{okText}</Flash> : null}
      {erroText ? <Flash tone="erro">{erroText}</Flash> : null}

      {/* grid-cols-1 + min-w-0: sem isso a coluna cresce até o formulário mais largo e a página vaza para o lado. */}
      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
        <ProfessionalsSection professionals={professionals} specialtyGroups={groupSpecialties(specialties)} />
        <UsersSection
          users={users}
          currentUserId={session.userId}
          linkableProfessionals={professionals.filter((prof) => prof.active)}
        />
      </div>

      <DangerZoneSection />
    </>
  );
}
