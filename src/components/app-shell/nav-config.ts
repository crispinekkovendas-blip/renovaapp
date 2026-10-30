import type { ComponentType, SVGProps } from "react";
import type { Role } from "@/lib/db";
import {
  IconBook,
  IconCalendar,
  IconChat,
  IconFileText,
  IconHome,
  IconRx,
  IconSettings,
  IconTemplate,
  IconUsers,
  IconWallet,
} from "@/components/icons";

import { activeTab } from "@/lib/active-tab";
import type { NavTab } from "@/lib/active-tab";

export { activeTab };
export type { NavTab };

export interface NavItem {
  href: string;
  label: string;
  /** Rótulo curto da barra de abas do celular (cabe em ~70px). */
  short?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Perfis que podem ver e acessar a seção. Sempre explícito — nada é liberado por omissão. */
  roles: Role[];
  tabs?: NavTab[];
}

const TODOS: Role[] = ["admin", "recepcao", "profissional"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: IconHome, roles: TODOS },
  {
    href: "/agenda",
    label: "Agenda",
    icon: IconCalendar,
    roles: TODOS,
    tabs: [
      { href: "/agenda", label: "Dia" },
      { href: "/agenda/semana", label: "Semana" },
      { href: "/agenda/lembretes", label: "Lembretes" },
      { href: "/agenda/retornos", label: "Retornos" },
    ],
  },
  {
    href: "/pacientes",
    label: "Meus pacientes",
    short: "Pacientes",
    icon: IconUsers,
    roles: TODOS,
  },
  // Receitas fora da ficha: escolher o paciente, histórico, renovações de uso contínuo
  // e o que mais se receita. Quem emite documento médico: profissional e admin.
  {
    href: "/receituario",
    label: "Receituário",
    short: "Receitas",
    icon: IconRx,
    roles: ["admin", "profissional"],
    tabs: [
      { href: "/receituario", label: "Nova receita" },
      { href: "/receituario/historico", label: "Histórico" },
      { href: "/receituario/renovacoes", label: "Renovações" },
      { href: "/receituario/mais-receitados", label: "Mais receitados" },
    ],
  },
  // Triagem e teleconsulta pelo WhatsApp: dado de saúde, então médico e admin.
  {
    href: "/whatsapp",
    label: "WhatsApp",
    icon: IconChat,
    roles: ["admin", "profissional"],
    tabs: [
      { href: "/whatsapp", label: "Conversas" },
      { href: "/whatsapp/simulador", label: "Simulador" },
      { href: "/whatsapp/configurar", label: "Configurar" },
    ],
  },
  {
    // Recepção cobra e recebe no balcão, então mantém Financeiro.
    href: "/financeiro",
    label: "Financeiro",
    icon: IconWallet,
    roles: ["admin", "recepcao"],
    tabs: [
      { href: "/financeiro", label: "Pagamentos" },
      { href: "/financeiro/convenios", label: "Convênios" },
    ],
  },
  // Atalho direto para Modelos (fica dentro de Configurações), aberto ao profissional.
  {
    href: "/configuracoes/modelos",
    label: "Personalize seus modelos",
    short: "Modelos",
    icon: IconTemplate,
    roles: ["admin", "profissional"],
  },
  // Consulta clínica, de quem prescreve: duas áreas — o Plantão (receitas prontas,
  // emergência e Drive, com a busca única) e a Ortopedia — e o app Android.
  {
    href: "/guia",
    label: "Guia clínico",
    short: "Guia",
    icon: IconBook,
    roles: ["admin", "profissional"],
    tabs: [
      { href: "/guia", label: "Plantão" },
      { href: "/guia/ortopedia", label: "Ortopedia" },
      { href: "/guia/app", label: "App Android" },
    ],
  },
  // Relatórios e Configurações são gestão — só admin.
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: IconFileText,
    roles: ["admin"],
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    short: "Ajustes",
    icon: IconSettings,
    roles: ["admin"],
  },
];

/**
 * A seção ativa é a de caminho mais longo que casa com a URL: em
 * `/configuracoes/modelos` acende "Personalize seus modelos", não Configurações.
 */
export function activeNavItem(pathname: string, items: NavItem[] = NAV_ITEMS): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of items) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
