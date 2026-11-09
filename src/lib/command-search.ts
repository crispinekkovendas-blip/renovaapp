import type { Role } from "./db";

export interface SearchCommand {
  href: string;
  label: string;
  /** Sinônimos que também acham o comando; não aparecem na tela. */
  keywords?: string;
}

interface NavSource {
  href: string;
  label: string;
  tabs?: readonly { href: string; label: string }[];
}

const ACTIONS: readonly (SearchCommand & { roles: readonly Role[] })[] = [
  {
    href: "/agenda/novo",
    label: "Novo agendamento",
    keywords: "marcar consulta horario",
    roles: ["admin", "recepcao", "profissional"],
  },
  {
    href: "/pacientes/novo",
    label: "Cadastrar paciente",
    keywords: "novo paciente ficha",
    roles: ["admin", "recepcao", "profissional"],
  },
  {
    href: "/receituario",
    label: "Nova receita",
    keywords: "prescrever prescricao medicamento receituario",
    roles: ["admin", "profissional"],
  },
];

const ALWAYS: readonly SearchCommand[] = [
  { href: "/conta", label: "Minha conta", keywords: "senha meus dados perfil" },
  { href: "/ajuda", label: "Ajuda", keywords: "novidades tutorial suporte" },
];

/** O que o perfil pode abrir: as ações rápidas, as seções do menu e as abas delas. */
export function commandsFor(role: Role, navItems: readonly NavSource[]): SearchCommand[] {
  const out: SearchCommand[] = ACTIONS.filter((a) => a.roles.includes(role)).map(
    ({ href, label, keywords }) => ({ href, label, keywords }),
  );
  for (const item of navItems) {
    out.push({ href: item.href, label: item.label });
    for (const tab of item.tabs ?? []) {
      if (tab.href !== item.href) out.push({ href: tab.href, label: `${item.label} › ${tab.label}` });
    }
  }
  return [...out, ...ALWAYS];
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Todas as palavras precisam bater; quem começa com o termo vem primeiro. */
export function matchCommands(
  query: string,
  commands: readonly SearchCommand[],
  limit = 8,
): SearchCommand[] {
  const term = fold(query.trim());
  if (!term) return commands.slice(0, limit);
  const words = term.split(/\s+/);
  const found = commands.filter((c) => {
    const text = fold(`${c.label} ${c.keywords ?? ""}`);
    return words.every((w) => text.includes(w));
  });
  const starts = (c: SearchCommand) => (fold(c.label).startsWith(term) ? 0 : 1);
  return found.sort((a, b) => starts(a) - starts(b)).slice(0, limit);
}
