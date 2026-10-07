import type { Role } from "@/lib/db";

/** Rótulo de cada perfil, na ordem do select de novo usuário. */
export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  admin: "Administrador",
  recepcao: "Recepção",
  profissional: "Profissional",
};
