import type { Professional, Role, User } from "@/lib/db";
import { createProfessionalAction, createUserAction, toggleUserAction } from "@/lib/actions";
import { adminSetPasswordAction } from "@/lib/actions-account";
import { SectionTitle } from "@/components/ui";
import { AddPanel } from "@/components/financeiro/add-panel";
import { ROLE_LABEL } from "../roles";
import type { MemedSpecialty, SpecialtyGroup } from "../specialty-groups";
import { ProfessionalRow } from "./professional-row";
import { Popover, PopoverClose } from "@/components/popover";

/** Só o que a lista de usuários mostra — o hash da senha não sai do banco. */
export type UserListItem = Pick<User, "id" | "name" | "email" | "role" | "active">;

/** Profissionais: lista com os cadastros de prescrição e assinatura, e o "Novo profissional". */
export function ProfessionalsSection({
  professionals,
  specialtyGroups,
}: {
  professionals: Professional[];
  specialtyGroups: SpecialtyGroup<MemedSpecialty>[];
}) {
  return (
    <section className="min-w-0">
      <SectionTitle>Profissionais</SectionTitle>
      <div className="card divide-y divide-pine-900/5">
        {professionals.map((prof) => (
          <ProfessionalRow key={prof.id} prof={prof} specialtyGroups={specialtyGroups} />
        ))}
      </div>

      <AddPanel label="Novo profissional">
        <form action={createProfessionalAction} className="grid gap-3 border-t border-pine-900/10 p-4 sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="prof-name">
              Nome *
            </label>
            <input className="input" id="prof-name" name="name" required autoComplete="off" placeholder="Dra. Fulana de Tal" />
          </div>
          <div>
            <label className="label" htmlFor="prof-specialty">
              Especialidade
            </label>
            <input className="input" id="prof-specialty" name="specialty" placeholder="Dermatologia" />
          </div>
          <div>
            <label className="label" htmlFor="prof-council">
              Registro (CRM/CRO…)
            </label>
            <input className="input" id="prof-council" name="council" placeholder="CRM 000000-UF" />
          </div>
          <div>
            <label className="label" htmlFor="prof-color">
              Cor na agenda
            </label>
            <input className="input h-10 p-1" type="color" id="prof-color" name="color" defaultValue="#2f6553" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">
              Adicionar
            </button>
          </div>
        </form>
      </AddPanel>
    </section>
  );
}

/** Usuários: lista com nova senha e ativar/desativar, e o "Novo usuário". */
export function UsersSection({
  users,
  currentUserId,
  linkableProfessionals,
}: {
  users: UserListItem[];
  currentUserId: number;
  /** Profissionais ativos, para vincular ao novo usuário. */
  linkableProfessionals: Pick<Professional, "id" | "name">[];
}) {
  return (
    <section className="min-w-0">
      <SectionTitle>Usuários</SectionTitle>
      <div className="card divide-y divide-pine-900/5">
        {users.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
        ))}
      </div>

      <AddPanel label="Novo usuário">
        <form action={createUserAction} className="grid gap-3 border-t border-pine-900/10 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <label className="label" htmlFor="user-name">
              Nome *
            </label>
            <input className="input" id="user-name" name="name" required autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="user-email">
              E-mail *
            </label>
            <input
              className="input"
              type="email"
              id="user-email"
              name="email"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="label" htmlFor="user-password">
              Senha * (mín. 6)
            </label>
            <input
              className="input"
              type="password"
              id="user-password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="user-role">
              Perfil
            </label>
            <select className="input" id="user-role" name="role" defaultValue={"recepcao" satisfies Role}>
              {(Object.entries(ROLE_LABEL) as [Role, string][]).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="user-prof">
              Vincular a profissional
            </label>
            <select className="input" id="user-prof" name="professional_id" defaultValue="">
              <option value="">—</option>
              {linkableProfessionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">
              Criar usuário
            </button>
          </div>
        </form>
      </AddPanel>
    </section>
  );
}

function UserRow({ user, isSelf }: { user: UserListItem; isSelf: boolean }) {
  return (
    // No celular as ações descem para baixo do nome (o e-mail não cabe ao lado de dois botões).
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
      <div className="min-w-0">
        <p className={`truncate text-sm font-bold ${user.active ? "" : "text-pine-900/40 line-through"}`}>
          {user.name}
          {isSelf ? <span className="ml-2 chip bg-pine-100 text-pine-800">você</span> : null}
        </p>
        <p className="truncate text-xs text-pine-900/55">
          {user.email} · {ROLE_LABEL[user.role]}
        </p>
      </div>
      <div className="-ml-2.5 flex shrink-0 items-center gap-1 sm:ml-0">
        <Popover className="relative" summary="Nova senha" summaryClassName="btn btn-ghost cursor-pointer px-2.5 py-1 text-xs">
          {/* No celular abre para a direita (o botão está na esquerda); no desktop, para a esquerda. */}
          <form
            action={adminSetPasswordAction}
            className="absolute left-0 z-10 mt-1 w-[min(15rem,calc(100vw-2rem))] rounded-xl border border-pine-900/10 bg-white p-3 shadow-lg sm:right-0 sm:left-auto"
          >
            <PopoverClose className="absolute top-1 right-1" />
            <input type="hidden" name="id" value={user.id} />
            <label className="label pr-9" htmlFor={`pw-${user.id}`}>
              Nova senha para {user.name.split(" ")[0]}
            </label>
            <input
              className="input"
              type="password"
              id={`pw-${user.id}`}
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              aria-describedby={`pw-${user.id}-hint`}
            />
            <p id={`pw-${user.id}-hint`} className="mt-1 text-[11px] text-pine-900/50">
              Mínimo 6 caracteres. A senha atual não é necessária.
            </p>
            <button type="submit" className="btn btn-primary mt-2 w-full py-1 text-xs">
              Definir senha
            </button>
          </form>
        </Popover>
        {isSelf ? null : (
          <form action={toggleUserAction}>
            <input type="hidden" name="id" value={user.id} />
            <button type="submit" className="btn btn-ghost px-2.5 py-1 text-xs">
              {user.active ? "Desativar" : "Reativar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
